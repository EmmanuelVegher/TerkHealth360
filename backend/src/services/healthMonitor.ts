/**
 * healthMonitor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Database Health Monitor
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Polls all three database layers every HEALTH_CHECK_INTERVAL_MS.
 * Uses two configurable thresholds:
 *   FAILOVER_THRESHOLD  – consecutive failures before marking a layer DOWN
 *   RECOVERY_THRESHOLD  – consecutive successes before marking a layer RECOVERED
 *
 * On state change, calls connectionManager.recalculateActiveLayer() which
 * promotes the best available layer and emits a 'failover' event.
 *
 * Also persists SystemEvent records to the local DB when it is available.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  probeLayer,
  updateLayerHealth,
  getAllLayerStatuses,
  recalculateActiveLayer,
  getLayer,
  getPool,
  type DbLayer,
} from './connectionManager.js';
import { logFailoverEvent } from '../utils/failoverLog.js';
import dotenv from 'dotenv';
dotenv.config();

const INTERVAL_MS          = parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '10000', 10);
const FAILOVER_THRESHOLD   = parseInt(process.env.FAILOVER_THRESHOLD  || '2', 10);
const RECOVERY_THRESHOLD   = parseInt(process.env.RECOVERY_THRESHOLD  || '2', 10);

type CheckableLayer = Exclude<DbLayer, 'OFFLINE'>;

const LAYERS: CheckableLayer[] = ['PRIMARY', 'STANDBY', 'CLOUD'];

// Track consecutive counts independently from the pool's accumulated totals
const _counts: Record<CheckableLayer, { failures: number; successes: number; wasDown: boolean }> = {
  PRIMARY: { failures: 0, successes: 0, wasDown: false },
  STANDBY: { failures: 0, successes: 0, wasDown: true },
  CLOUD:   { failures: 0, successes: 0, wasDown: false },
};

// ── Persist a system event to DB (best-effort) ────────────────────────────
async function persistSystemEvent(
  eventType: string,
  fromLayer: string | undefined,
  toLayer: string | undefined,
  description: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  try {
    await pool.query(
      `INSERT INTO system_events ("id", "eventType", "fromLayer", "toLayer", "description", "metadata", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())`,
      [eventType, fromLayer ?? null, toLayer ?? null, description, metadata ? JSON.stringify(metadata) : null]
    );
  } catch {
    // Non-fatal — DB may be down during a failover event
  }
}

// ── Single health check cycle ─────────────────────────────────────────────
async function runHealthCheck(): Promise<void> {
  const prevLayer = getLayer();

  // Probe all layers in parallel
  const results = await Promise.allSettled(
    LAYERS.map(layer => probeLayer(layer).then(ok => ({ layer, ok })))
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { layer, ok } = result.value;
    const state = _counts[layer];

    if (ok) {
      state.failures  = 0;
      state.successes += 1;

      // Layer recovered after being down?
      if (state.wasDown && state.successes >= RECOVERY_THRESHOLD) {
        state.wasDown = false;
        updateLayerHealth(layer, true);

        console.log(`[HealthMonitor] ✓ Layer ${layer} has RECOVERED.`);
        logFailoverEvent({
          eventType:   'RECOVERY',
          fromLayer:   layer,
          toLayer:     layer,
          description: `Layer ${layer} is back online after ${state.failures} failures.`,
        });
        void persistSystemEvent('RECOVERY', layer, layer, `Layer ${layer} recovered.`);
        recalculateActiveLayer();
      } else if (!state.wasDown) {
        updateLayerHealth(layer, true);
      }
    } else {
      state.successes = 0;
      state.failures  += 1;

      if (!state.wasDown && state.failures >= FAILOVER_THRESHOLD) {
        state.wasDown = true;
        updateLayerHealth(layer, false, 'Health check failed');

        console.warn(`[HealthMonitor] ✗ Layer ${layer} is DOWN (${state.failures} consecutive failures).`);
        logFailoverEvent({
          eventType:   'LAYER_DOWN',
          fromLayer:   layer,
          description: `Layer ${layer} declared DOWN after ${state.failures} consecutive health check failures.`,
        });
        void persistSystemEvent('LAYER_DOWN', layer, undefined, `Layer ${layer} went down.`);
        recalculateActiveLayer();
      }
    }
  }

  // Log if the active layer changed during this cycle
  const newLayer = getLayer();
  if (newLayer !== prevLayer) {
    void persistSystemEvent(
      newLayer === 'OFFLINE' ? 'OFFLINE_MODE' : newLayer === 'CLOUD' ? 'CLOUD_FALLBACK' : 'FAILOVER',
      prevLayer,
      newLayer,
      `Active database layer changed from ${prevLayer} to ${newLayer}`,
      { layerStatuses: getAllLayerStatuses() }
    );
  }
}

// ── Public API ────────────────────────────────────────────────────────────

let _timer: ReturnType<typeof setInterval> | null = null;

export function startHealthMonitor(): void {
  if (_timer) return;

  console.log(
    `[HealthMonitor] Started — checking every ${INTERVAL_MS}ms` +
    ` (failover after ${FAILOVER_THRESHOLD} failures, recover after ${RECOVERY_THRESHOLD} successes)`
  );

  logFailoverEvent({
    eventType:   'STARTUP',
    description: 'Health monitor started. Monitoring PRIMARY, STANDBY, CLOUD layers.',
  });

  // Run an immediate check, then on interval
  void runHealthCheck();
  _timer = setInterval(() => void runHealthCheck(), INTERVAL_MS);
}

export function stopHealthMonitor(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    console.log('[HealthMonitor] Stopped.');
  }
}

/** Returns a snapshot of all layer health states for the status API */
export function getHealthSnapshot(): {
  activeLayer: DbLayer;
  layers: ReturnType<typeof getAllLayerStatuses>;
  checkedAt: string;
} {
  return {
    activeLayer: getLayer(),
    layers:      getAllLayerStatuses(),
    checkedAt:   new Date().toISOString(),
  };
}
