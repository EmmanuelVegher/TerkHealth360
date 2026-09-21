/**
 * connectionManager.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-Layer Database Connection Manager
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Maintains connection pools for all three database layers:
 *   Layer 1 – PRIMARY   : Local PostgreSQL on port 5432 (ff_mission_hospital)
 *   Layer 2 – STANDBY   : Secondary local PostgreSQL on port 5433 (warm standby)
 *   Layer 3 – CLOUD     : Neon PostgreSQL (ff_mission_hospital_cloud)
 *   Layer 4 – OFFLINE   : No DB available (write to device/manual queue only)
 *
 * All application code that needs a database connection calls:
 *   connectionManager.getPool()   → returns the active pg.Pool
 *   connectionManager.getLayer()  → returns the current layer name
 *
 * The healthMonitor calls:
 *   connectionManager.setLayer()  → promotes/demotes the active layer
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pg   from 'pg';
import { EventEmitter }   from 'events';
import { logFailoverEvent } from '../utils/failoverLog.js';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// ── Layer type ────────────────────────────────────────────────────────────
export type DbLayer = 'PRIMARY' | 'STANDBY' | 'CLOUD' | 'OFFLINE';

export interface LayerStatus {
  layer:      DbLayer;
  url:        string;
  healthy:    boolean;
  lastCheck:  Date | null;
  lastError:  string | null;
  failures:   number;
  successes:  number;
}

// ── Connection pool per layer ─────────────────────────────────────────────
const POOL_CONFIG: pg.PoolConfig = {
  max:              10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS || '3000', 10),
};

const pools: Record<Exclude<DbLayer, 'OFFLINE'>, pg.Pool> = {
  PRIMARY: new Pool({ ...POOL_CONFIG, connectionString: process.env.DATABASE_URL }),
  STANDBY: new Pool({ ...POOL_CONFIG, connectionString: process.env.STANDBY_DATABASE_URL }),
  CLOUD:   new Pool({ ...POOL_CONFIG, connectionString: process.env.NEON_DATABASE_URL }),
};

pools.PRIMARY.on('error', (err) => console.error('[ConnectionManager] Idle PRIMARY pool error:', err.message || err));
pools.STANDBY.on('error', (err) => console.error('[ConnectionManager] Idle STANDBY pool error:', err.message || err));
pools.CLOUD.on('error', (err) => console.error('[ConnectionManager] Idle CLOUD pool error:', err.message || err));

// ── Internal state ────────────────────────────────────────────────────────
let _activeLayer: DbLayer = 'PRIMARY';
const _layerStatus: Record<DbLayer, LayerStatus> = {
  PRIMARY: { layer: 'PRIMARY', url: process.env.DATABASE_URL!,         healthy: true,  lastCheck: null, lastError: null, failures: 0, successes: 0 },
  STANDBY: { layer: 'STANDBY', url: process.env.STANDBY_DATABASE_URL!, healthy: false, lastCheck: null, lastError: null, failures: 0, successes: 0 },
  CLOUD:   { layer: 'CLOUD',   url: process.env.NEON_DATABASE_URL!,     healthy: true,  lastCheck: null, lastError: null, failures: 0, successes: 0 },
  OFFLINE: { layer: 'OFFLINE', url: '',                                  healthy: false, lastCheck: null, lastError: null, failures: 0, successes: 0 },
};

// ── Event emitter (healthMonitor subscribes) ──────────────────────────────
export const connectionEvents = new EventEmitter();

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Get the currently active connection pool.
 * Returns null if the system is in OFFLINE mode.
 */
export function getPool(): pg.Pool | null {
  if (_activeLayer === 'OFFLINE') return null;
  return pools[_activeLayer];
}

/** Current active layer name */
export function getLayer(): DbLayer {
  return _activeLayer;
}

/** Snapshot of all layer statuses */
export function getAllLayerStatuses(): LayerStatus[] {
  return Object.values(_layerStatus);
}

/** Update health state for a layer (called by healthMonitor) */
export function updateLayerHealth(layer: DbLayer, healthy: boolean, error?: string): void {
  const status = _layerStatus[layer];
  const oldHealthy = status.healthy;
  status.lastCheck = new Date();

  if (healthy) {
    status.healthy   = true;
    status.lastError = null;
    status.failures  = 0;
    status.successes += 1;
  } else {
    status.healthy   = false;
    status.lastError = error ?? 'Unknown error';
    status.failures  += 1;
    status.successes = 0;
  }

  if (oldHealthy !== status.healthy) {
    console.log(`[ConnectionManager] Layer ${layer} health transitioned from ${oldHealthy} to ${status.healthy}. Recalculating active layer.`);
    recalculateActiveLayer();
  }
}

/**
 * Promote a new active layer.
 * Emits 'failover' event with { from, to } payload.
 * Called by healthMonitor when it decides a transition is warranted.
 */
export function setLayer(newLayer: DbLayer): void {
  if (newLayer === _activeLayer) return;

  const prev = _activeLayer;
  _activeLayer = newLayer;

  logFailoverEvent({
    eventType:   newLayer === 'OFFLINE' ? 'OFFLINE_MODE' : newLayer === 'CLOUD' ? 'CLOUD_FALLBACK' : 'FAILOVER',
    fromLayer:   prev,
    toLayer:     newLayer,
    description: `Active database layer changed from ${prev} to ${newLayer}`,
    metadata:    { allStatuses: getAllLayerStatuses() },
  });

  connectionEvents.emit('failover', { from: prev, to: newLayer });
}

/**
 * Attempt a lightweight health probe on a specific pool.
 * Resolves true if the DB responds within HEALTH_CHECK_TIMEOUT_MS.
 */
export async function probeLayer(layer: Exclude<DbLayer, 'OFFLINE'>): Promise<boolean> {
  const pool   = pools[layer];
  const client = await pool.connect().catch(() => null);
  if (!client) return false;

  try {
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    client.release();
  }
}

/**
 * Re-evaluate which layer should be active based on current health states.
 * Promotes the highest-priority healthy layer.
 */
export function recalculateActiveLayer(): void {
  const priority: Array<Exclude<DbLayer, 'OFFLINE'>> = ['PRIMARY', 'STANDBY', 'CLOUD'];

  for (const layer of priority) {
    if (_layerStatus[layer].healthy) {
      setLayer(layer);
      return;
    }
  }

  setLayer('OFFLINE');
}

/**
 * Run a one-off query against a specific pool (used by syncService for
 * cross-database operations like reverse sync).
 */
export function getPoolForLayer(layer: Exclude<DbLayer, 'OFFLINE'>): pg.Pool {
  return pools[layer];
}
