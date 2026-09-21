/**
 * syncService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Offline-First Background Synchronization Service
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Local → Cloud delta sync (via sync_queue outbox triggers).
 * Cloud → Local reverse sync (after recovery from cloud-fallback period).
 *
 * Integrates with connectionManager so sync always uses the active DB layer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pg from 'pg';
const { Pool } = pg;
import { getLayer, getPoolForLayer, connectionEvents, type DbLayer } from './connectionManager.js';
import { logFailoverEvent } from '../utils/failoverLog.js';
import dotenv from 'dotenv';
dotenv.config();

// ── Configuration ─────────────────────────────────────────────────────────
const SYNC_ONLINE      = process.env.SYNC_ONLINE !== 'false';
const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '5000', 10);
const MAX_ATTEMPTS     = 3;
const BATCH_SIZE       = 100;

// ── Connection pools ──────────────────────────────────────────────────────
// Use getPoolForLayer to access specific pools; sync reads from active layer
// and writes to CLOUD via connectionManager.
const cloudPool = getPoolForLayer('CLOUD');

// ── Tables with compound primary keys (no single "id" column) ────────────
// Values are the camelCase column names exactly as stored in PostgreSQL
const COMPOUND_PK_TABLES: Record<string, string[]> = {
  role_permissions:   ['roleId', 'permissionId'],
  user_role_mappings: ['userId', 'roleId'],
  user_departments:   ['userId', 'departmentId'],
};

// ── Tables with a non-id unique conflict target for upsert ───────────────
// When a table has a business-key unique constraint (not just id), the
// sync upsert must conflict on that column instead of the PK so that
// cloud rows with the same business key are updated rather than rejected.
const UNIQUE_CONFLICT_TABLES: Record<string, string[]> = {
  hospital_config:  ['moduleKey'],  // @@unique on moduleKey
};

// ── Build UPSERT SQL preserving camelCase column names ───────────────────
function buildUpsert(
  tableName: string,
  payload: Record<string, unknown>
): { sql: string; values: unknown[] } {
  const columns = Object.keys(payload);
  if (columns.length === 0) throw new Error('Empty payload');

  const colList         = columns.map(c => `"${c}"`).join(', ');
  const valPlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const values          = columns.map(c => {
    const val = payload[c];
    if (val !== null && typeof val === 'object') {
      return JSON.stringify(val);
    }
    return val;
  });

  // Conflict target — prefer business-key unique columns when defined,
  // then fall back to compound PK, then the default single 'id' column.
  const uniqueCols = UNIQUE_CONFLICT_TABLES[tableName];
  const pkCols     = COMPOUND_PK_TABLES[tableName] ?? ['id'];
  const conflictCols = uniqueCols ?? pkCols;
  const conflictTarget = `(${conflictCols.map(c => `"${c}"`).join(', ')})`;

  // SET clause — exclude ALL conflict columns to avoid overwriting keys
  const excludeSet = new Set([...conflictCols, ...(COMPOUND_PK_TABLES[tableName] ?? ['id'])]);
  const setClauses = columns
    .filter(c => !excludeSet.has(c))
    .map(c => `"${c}" = EXCLUDED."${c}"`)
    .join(', ');

  const doClause = setClauses ? `DO UPDATE SET ${setClauses}` : 'DO NOTHING';

  const sql = `
    INSERT INTO "${tableName}" (${colList})
    VALUES (${valPlaceholders})
    ON CONFLICT ${conflictTarget} ${doClause};
  `;

  return { sql, values };
}

// ── Build a safe DO NOTHING upsert (used for sibling sync to skip conflicts) ─
function buildSafeInsert(
  tableName: string,
  payload: Record<string, unknown>
): { sql: string; values: unknown[] } {
  const columns = Object.keys(payload);
  if (columns.length === 0) throw new Error('Empty payload');

  const colList         = columns.map(c => `"${c}"`).join(', ');
  const valPlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const values          = columns.map(c => {
    const val = payload[c];
    if (val !== null && typeof val === 'object') {
      return JSON.stringify(val);
    }
    return val;
  });

  // Use DO NOTHING so any unique constraint (not just PK) is silently skipped
  const sql = `
    INSERT INTO "${tableName}" (${colList})
    VALUES (${valPlaceholders})
    ON CONFLICT DO NOTHING;
  `;

  return { sql, values };
}

// ── Apply database write to a specific pool or client ────────────────────────
async function applyToLayer(
  client: pg.PoolClient | pg.Pool,
  row: {
    table_name: string;
    record_id: string;
    action: string;
    payload: Record<string, any>;
  }
): Promise<void> {
  const { table_name, action, payload } = row;

  if (action === 'DELETE') {
    const pkCols = COMPOUND_PK_TABLES[table_name];
    if (pkCols) {
      const whereClause = pkCols.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
      await client.query(
        `DELETE FROM "${table_name}" WHERE ${whereClause}`,
        pkCols.map(k => payload[k])
      );
    } else {
      await client.query(
        `DELETE FROM "${table_name}" WHERE "id" = $1`,
        [row.record_id]
      );
    }
  } else {
    const { sql, values } = buildUpsert(table_name, payload);
    await client.query(sql, values);
  }
}

let isSyncing = false;

// ── One sync cycle ────────────────────────────────────────────────────────
async function runSyncCycle(): Promise<void> {
  if (!SYNC_ONLINE) return;
  // If currently in cloud fallback mode, skip outbox sync (cloud IS the source)
  if (getLayer() === 'CLOUD' || getLayer() === 'OFFLINE') return;
  if (isSyncing) return;

  isSyncing = true;
  const activeLayer = getLayer();
  const localPool  = getPoolForLayer(activeLayer as Exclude<DbLayer, 'OFFLINE'>);
  let localClient;
  let cloudClient;

  try {
    localClient = await localPool.connect();
    localClient.on('error', (err) => console.warn('[SyncService] localClient sync cycle background error:', err.message || err));

    cloudClient = await cloudPool.connect();
    cloudClient.on('error', (err) => console.warn('[SyncService] cloudClient sync cycle background error:', err.message || err));

    const { rows } = await localClient.query<{
      id: string;
      table_name: string;
      record_id: string;
      action: string;
      payload: Record<string, unknown>;
      attempts: number;
    }>(`
      SELECT id, table_name, record_id, action, payload, attempts
      FROM   sync_queue
      WHERE  status IN ('PENDING', 'FAILED')
        AND  attempts < $1
      ORDER  BY created_at ASC
      LIMIT  $2
    `, [MAX_ATTEMPTS, BATCH_SIZE]);

    if (rows.length === 0) return;

    console.log(`[SyncService] Syncing ${rows.length} record(s)…`);

    for (const row of rows) {
      try {
        // 1. Apply to Cloud
        await applyToLayer(cloudClient, row);

        // 2. Best-effort sibling local replication (Primary <-> Standby)
        const otherLocalLayer: Exclude<DbLayer, 'CLOUD' | 'OFFLINE'> = activeLayer === 'PRIMARY' ? 'STANDBY' : 'PRIMARY';
        const otherPool = getPoolForLayer(otherLocalLayer);
        try {
          // Use safe insert (ON CONFLICT DO NOTHING) for sibling to avoid unique constraint noise
          if (row.action === 'DELETE') {
            await applyToLayer(otherPool, row);
          } else {
            const { sql, values } = buildSafeInsert(row.table_name, row.payload as Record<string, unknown>);
            await otherPool.query(sql, values);
          }
        } catch (siblingErr: any) {
          // Non-fatal — sibling may be offline
        }

        await localClient.query(`
          UPDATE sync_queue
          SET    status = 'SYNCED', synced_at = NOW(), error = NULL
          WHERE  id = $1
        `, [row.id]);
      } catch (err: any) {
        const newAttempts = row.attempts + 1;
        const newStatus   = newAttempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING';
        const errMsg      = err?.message?.substring(0, 500) ?? 'Unknown error';

        await localClient.query(`
          UPDATE sync_queue
          SET    attempts = $1, status = $2, error = $3
          WHERE  id = $4
        `, [newAttempts, newStatus, errMsg, row.id]);

        console.error(
          `[SyncService] ✗ ${row.table_name}#${row.record_id}:`, errMsg
        );
      }
    }

  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('exceeded the compute time quota') || msg.includes('ECONNREFUSED') || msg.includes('timeout')) {
      console.warn(`[SyncService] Sync cycle skipped (cloud quota or offline): ${msg.split('\n')[0]}`);
    } else {
      console.warn('[SyncService] Sync cycle failed. Error:', msg);
    }
  } finally {
    if (localClient) {
      localClient.removeAllListeners('error');
      localClient.release();
    }
    if (cloudClient) {
      cloudClient.removeAllListeners('error');
      cloudClient.release();
    }
    isSyncing = false;
  }
}

export async function initialCloudSync(): Promise<void> {
  const activeLayer = getLayer();
  if (activeLayer === 'OFFLINE' || activeLayer === 'CLOUD') return;
  const localPool   = getPoolForLayer(activeLayer as Exclude<DbLayer, 'OFFLINE'>);
  let localClient;
  let cloudClient;

  const EXCLUDED = new Set([
    'sync_queue', 'audit_logs', '_prisma_migrations', 'refresh_tokens',
    'password_reset_tokens',
  ]);

  try {
    localClient = await localPool.connect();
    localClient.on('error', (err) => console.warn('[SyncService] localClient baseline sync background error:', err.message || err));

    let alreadyRun = false;
    try {
      const { rows: configCheck } = await localClient.query(`
        SELECT 1 FROM "hospital_config" WHERE "moduleKey" = 'baseline_sync_completed'
      `);
      if (configCheck.length > 0) {
        alreadyRun = true;
      }
    } catch (_) {
      // If table doesn't exist yet, proceed with sync
    }

    if (alreadyRun) {
      console.log('[SyncService] Baseline sync has already run. Skipping.');
      return;
    }

    cloudClient = await cloudPool.connect();
    cloudClient.on('error', (err) => console.warn('[SyncService] cloudClient baseline sync background error:', err.message || err));
    console.log('[SyncService] Running initial cloud baseline sync…');

    const { rows: tables } = await localClient.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
    `);

    for (const { tablename } of tables) {
      if (EXCLUDED.has(tablename)) continue;

      // Only sync tables with a single "id" PK for the initial pass
      const pkCols = COMPOUND_PK_TABLES[tablename];
      if (pkCols) continue; // handled by triggers going forward

      const { rows: records } = await localClient.query(
        `SELECT * FROM "${tablename}"`
      );

      for (const record of records) {
        try {
          const { sql, values } = buildUpsert(tablename, record);
          await cloudClient.query(sql, values);
        } catch (_) {
          // Skip individual row errors (e.g. FK constraints) — triggers cover updates
        }
      }

      if (records.length > 0) {
        console.log(
          `[SyncService] Baseline synced ${records.length} row(s) → ${tablename}`
        );
      }
    }

    try {
      await localClient.query(`
        INSERT INTO "hospital_config" ("id", "moduleKey", "description", "isActive", "updatedAt")
        VALUES (gen_random_uuid(), 'baseline_sync_completed', 'Baseline sync completed', true, NOW())
        ON CONFLICT ("moduleKey") DO NOTHING
      `);
    } catch (e) {
      console.warn('[SyncService] Failed to record baseline sync status:', e);
    }

    console.log('[SyncService] ✓ Initial baseline sync complete.');
  } catch (err) {
    console.warn('[SyncService] Baseline sync failed (cloud or local may be unavailable):', err);
  } finally {
    if (localClient) {
      localClient.removeAllListeners('error');
      localClient.release();
    }
    if (cloudClient) {
      cloudClient.removeAllListeners('error');
      cloudClient.release();
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────

let _timer: ReturnType<typeof setInterval> | null = null;
let listenClient: pg.PoolClient | null = null;
let isListening = false;
let listenReconnectTimer: NodeJS.Timeout | null = null;

export async function setupListenNotify(): Promise<void> {
  if (!SYNC_ONLINE) return;

  if (listenReconnectTimer) {
    clearTimeout(listenReconnectTimer);
    listenReconnectTimer = null;
  }

  // Clean up any existing listener client
  if (listenClient) {
    try {
      listenClient.removeAllListeners('notification');
      listenClient.removeAllListeners('error');
      listenClient.release();
    } catch (_) {}
    listenClient = null;
  }
  isListening = false;

  const currentLayer = getLayer();
  if (currentLayer === 'OFFLINE' || currentLayer === 'CLOUD') {
    // Offline or Cloud mode (direct write to cloud) does not listen locally
    return;
  }

  const localPool = getPoolForLayer(currentLayer as Exclude<DbLayer, 'OFFLINE'>);

  try {
    listenClient = await localPool.connect();

    listenClient.on('notification', (msg) => {
      if (msg.channel === 'sync_queue_channel') {
        console.log('[SyncService] ⚡ Database change detected! Running sync cycle…');
        runSyncCycle();
      }
    });

    listenClient.on('error', (err) => {
      console.warn('[SyncService] Listener connection error. Reconnecting in 5s...', err);
      isListening = false;
      if (listenReconnectTimer) clearTimeout(listenReconnectTimer);
      listenReconnectTimer = setTimeout(() => {
        listenReconnectTimer = null;
        setupListenNotify();
      }, 5000);
    });

    await listenClient.query('LISTEN sync_queue_channel');
    isListening = true;
    console.log('[SyncService] ⚡ Connected and listening on "sync_queue_channel" for database writes.');

    // Run one sync cycle on start to fetch any outstanding rows
    runSyncCycle();
  } catch (err: any) {
    if (listenClient) {
      try {
        listenClient.removeAllListeners('notification');
        listenClient.removeAllListeners('error');
        listenClient.release();
      } catch (_) {}
      listenClient = null;
    }
    isListening = false;
    const isConnRefused =
      err?.code === 'ECONNREFUSED' ||
      (Array.isArray(err?.errors) && err.errors.some((e: any) => e?.code === 'ECONNREFUSED'));

    if (isConnRefused) {
      console.warn(`[SyncService] Could not establish LISTEN connection on layer ${currentLayer} (connection refused). Will re-bind when database layer recovers.`);
    } else {
      console.warn('[SyncService] Failed to establish LISTEN connection, retrying in 5s...', err);
      if (listenReconnectTimer) clearTimeout(listenReconnectTimer);
      listenReconnectTimer = setTimeout(() => {
        listenReconnectTimer = null;
        setupListenNotify();
      }, 5000);
    }
  }
}

export async function startSyncService(): Promise<void> {
  if (isListening || _timer) return;

  const mode = SYNC_ONLINE ? 'ONLINE (Real-time LISTEN/NOTIFY)' : 'OFFLINE (queuing only)';
  console.log(`[SyncService] Started — mode=${mode}`);

  // Sync existing local data to cloud first
  if (SYNC_ONLINE) await initialCloudSync();

  // Setup LISTEN/NOTIFY real-time triggering
  await setupListenNotify();

  // Re-bind listener client if the database layer fails over
  connectionEvents.on('failover', (payload: any) => {
    const from = payload?.from as DbLayer | undefined;
    const to = payload?.to as DbLayer | undefined;
    
    console.log(`[SyncService] Active layer changed from ${from ?? 'UNKNOWN'} to ${to ?? 'UNKNOWN'}. Re-binding database listener…`);
    setupListenNotify();
    
    if (from && to) {
      const priority: Record<DbLayer, number> = { PRIMARY: 3, STANDBY: 2, CLOUD: 1, OFFLINE: 0 };
      if (priority[to] > priority[from] && to !== 'OFFLINE' && to !== 'CLOUD') {
        console.log(`[SyncService] Recovery transition detected (${from} → ${to}). Triggering automatic cloud-to-local reverse sync…`);
        void reverseSyncFromCloud();
      }
    }
  });

  // Slow fallback interval (every 2 mins) just as a fail-safe
  _timer = setInterval(runSyncCycle, 120_000);
}

export function stopSyncService(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
  if (listenClient) {
    try {
      listenClient.removeAllListeners('notification');
      listenClient.removeAllListeners('error');
      listenClient.release();
    } catch (_) {}
    listenClient = null;
  }
  isListening = false;
  console.log('[SyncService] Stopped.');
}

export async function getSyncStatus(): Promise<{
  pending: number;
  synced: number;
  failed: number;
  lastSyncedAt: string | null;
  activeLayer: string;
}> {
  const activeLayer = getLayer();
  if (activeLayer === 'OFFLINE' || activeLayer === 'CLOUD') {
    return { pending: 0, synced: 0, failed: 0, lastSyncedAt: null, activeLayer };
  }
  const pool   = getPoolForLayer(activeLayer as Exclude<DbLayer, 'OFFLINE'>);
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      status: string;
      count: string;
      last_synced: string | null;
    }>(`
      SELECT status, COUNT(*) AS count, MAX(synced_at) AS last_synced
      FROM   sync_queue
      GROUP  BY status
    `);

    const result = { pending: 0, synced: 0, failed: 0, lastSyncedAt: null as string | null, activeLayer: getLayer() };
    for (const r of rows) {
      if (r.status === 'PENDING') result.pending  = parseInt(r.count);
      if (r.status === 'SYNCED')  { result.synced  = parseInt(r.count); result.lastSyncedAt = r.last_synced; }
      if (r.status === 'FAILED')  result.failed   = parseInt(r.count);
    }
    return result;
  } finally {
    client.release();
  }
}

const REPLICATION_TABLES = [
  'permissions',
  'roles',
  'role_permissions',
  'departments',
  'wards',
  'beds',
  'insurance_providers',
  'insurance_benefit_plans',
  'users',
  'user_role_mappings',
  'staff',
  'patients',
  'patient_addresses',
  'patient_telecoms',
  'family_accounts',
  'patient_card_reprints',
  'appointments',
  'encounters',
  'observations',
  'medication_requests',
  'admissions',
  'invoices',
  'attendance_records',
  'monnify_virtual_accounts',
  'monnify_wallet_transactions',
];

// ── Reverse Sync: Cloud → Local (called after recovering from cloud-fallback) ─
export async function reverseSyncFromCloud(): Promise<{
  imported: number;
  conflicts: number;
}> {
  const activeLayer = getLayer();
  if (activeLayer === 'OFFLINE' || activeLayer === 'CLOUD') {
    return { imported: 0, conflicts: 0 };
  }
  const localPool   = getPoolForLayer(activeLayer as Exclude<DbLayer, 'OFFLINE'>);
  let localClient;
  let cloudClient;

  // Best-effort replication sync to the sibling database too if it's online
  const otherLocalLayer = activeLayer === 'PRIMARY' ? 'STANDBY' : 'PRIMARY';
  const otherPool = getPoolForLayer(otherLocalLayer);
  let otherClient;

  let imported  = 0;
  let conflicts = 0;

  try {
    localClient = await localPool.connect();
    localClient.on('error', (err) => console.warn('[SyncService] localClient reverse sync background error:', err.message || err));

    cloudClient = await cloudPool.connect();
    cloudClient.on('error', (err) => console.warn('[SyncService] cloudClient reverse sync background error:', err.message || err));

    try {
      otherClient = await otherPool.connect();
      otherClient.on('error', (err) => console.warn('[SyncService] otherClient reverse sync background error:', err.message || err));
    } catch (_) {
      // Sibling is offline, ignore
    }

    // Temporarily bypass foreign key constraints/triggers during bulk recovery replication
    await localClient.query("SET session_replication_role = 'replica'").catch(() => null);
    if (otherClient) {
      await otherClient.query("SET session_replication_role = 'replica'").catch(() => null);
    }

    console.log(`[SyncService] Reverse sync: pulling cloud records to local active layer (${activeLayer})…`);

    for (const tablename of REPLICATION_TABLES) {
      try {
        // Inspect the columns of the table locally to determine timestamp strategy
        const { rows: colCheck } = await localClient.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
        `, [tablename]);

        const columns = colCheck.map(c => c.column_name);
        const hasUpdatedAt = columns.includes('updatedAt') || columns.includes('updated_at');
        const hasCreatedAt = columns.includes('createdAt') || columns.includes('created_at');

        let querySql = `SELECT * FROM "${tablename}"`;
        let queryParams: any[] = [];

        if (hasUpdatedAt || hasCreatedAt) {
          const timeCol = columns.includes('updatedAt') ? 'updatedAt' : (columns.includes('updated_at') ? 'updated_at' : (columns.includes('createdAt') ? 'createdAt' : 'created_at'));
          // Find max timestamp locally
          const { rows: localMax } = await localClient.query(`
            SELECT MAX("${timeCol}") as max_time FROM "${tablename}"
          `);
          const maxTime = localMax[0]?.max_time;
          if (maxTime) {
            querySql += ` WHERE "${timeCol}" > $1`;
            queryParams.push(maxTime);
          }
        }

        const hasId = columns.includes('id');
        if (hasCreatedAt) {
          const timeCol = columns.includes('createdAt') ? 'createdAt' : 'created_at';
          querySql += ` ORDER BY "${timeCol}" ASC`;
        } else if (hasId) {
          querySql += ' ORDER BY "id" ASC';
        }

        const { rows: cloudRecords } = await cloudClient.query(querySql, queryParams);
        if (cloudRecords.length > 0) {
          console.log(`[SyncService]   Table "${tablename}": syncing ${cloudRecords.length} records…`);
        }

        for (const record of cloudRecords) {
          // Clear fallback flags before inserting locally
          if (record.cloud_fallback !== undefined) record.cloud_fallback = false;
          if (record.cloudFallback !== undefined) record.cloudFallback = false;

          // Check if record exists locally
          const pkCols = COMPOUND_PK_TABLES[tablename] ?? ['id'];
          const whereClause = pkCols.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
          const pkValues = pkCols.map(k => record[k]);

          const { rows: existing } = await localClient.query(
            `SELECT * FROM "${tablename}" WHERE ${whereClause}`, pkValues
          );

          if (existing.length > 0) {
            const localRecord = existing[0];
            const localUpdate = localRecord.updated_at || localRecord.created_at;
            const cloudUpdate = record.updated_at || record.created_at;

            if (cloudUpdate && localUpdate && new Date(cloudUpdate) > new Date(localUpdate)) {
              const { sql, values } = buildUpsert(tablename, record);
              await localClient.query(sql, values);
              if (otherClient) {
                try {
                  const { sql: sSql, values: sVals } = buildSafeInsert(tablename, record);
                  await otherClient.query(sSql, sVals);
                } catch (_) {}
              }
              imported++;
            }
          } else {
            try {
              const { sql, values } = buildUpsert(tablename, record);
              await localClient.query(sql, values);
              if (otherClient) {
                try {
                  const { sql: sSql, values: sVals } = buildSafeInsert(tablename, record);
                  await otherClient.query(sSql, sVals);
                } catch (_) {}
              }
              imported++;
            } catch (e: any) {
              conflicts++;
            }
          }
        }
      } catch (err: any) {
        console.error(`[SyncService] Error syncing table "${tablename}":`, err.message || err);
      }
    }

    console.log(`[SyncService] Reverse sync complete: ${imported} imported, ${conflicts} conflicts.`);

    logFailoverEvent({
      eventType:   'REVERSE_SYNC',
      description: `Reverse sync complete. ${imported} cloud records imported, ${conflicts} conflicts flagged.`,
      metadata:    { imported, conflicts },
    });

    return { imported, conflicts };
  } catch (err) {
    console.error('[SyncService] Reverse sync error:', err);
    return { imported, conflicts };
  } finally {
    try {
      if (localClient) await localClient.query("SET session_replication_role = 'origin'").catch(() => null);
    } catch (_) {}
    try {
      if (otherClient) await otherClient.query("SET session_replication_role = 'origin'").catch(() => null);
    } catch (_) {}

    if (localClient) {
      localClient.removeAllListeners('error');
      localClient.release();
    }
    if (cloudClient) {
      cloudClient.removeAllListeners('error');
      cloudClient.release();
    }
    if (otherClient) {
      otherClient.removeAllListeners('error');
      otherClient.release();
    }
  }
}
