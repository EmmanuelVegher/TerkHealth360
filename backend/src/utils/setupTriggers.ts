/**
 * setupTriggers.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Installs a PL/pgSQL trigger function + per-table AFTER INSERT|UPDATE|DELETE
 * triggers on the local ff_mission_hospital database.
 *
 * Each trigger writes one row into `sync_queue` containing:
 *   • table_name  – the table that changed
 *   • record_id   – the primary key value (assumed column name: "id")
 *   • action      – INSERT | UPDATE | DELETE
 *   • payload     – full NEW (or OLD on delete) row as JSONB
 *
 * Tables deliberately excluded from sync:
 *   • sync_queue itself      (avoid infinite loop)
 *   • audit_logs             (append-only; cloud gets them via direct insert)
 *   • _prisma_migrations     (infra, not clinical data)
 *   • refresh_tokens         (security tokens; not replicated)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const EXCLUDED_TABLES = new Set([
  'sync_queue',
  'audit_logs',
  '_prisma_migrations',
  'refresh_tokens',
  'password_reset_tokens',
]);

// Use the active-layer pool in priority order (PRIMARY → STANDBY → CLOUD)
// so trigger installation works even when the primary is offline.
async function getActivePool(): Promise<pg.PoolClient> {
  const urls = [
    process.env.DATABASE_URL,
    process.env.STANDBY_DATABASE_URL,
    process.env.NEON_DATABASE_URL,
  ].filter(Boolean) as string[];

  for (const url of urls) {
    try {
      const p = new Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
      const client = await p.connect();
      // Attach the pool on the client so we can end it in finally
      (client as any).__ownPool = p;
      return client;
    } catch {
      // try next
    }
  }
  throw new Error('No database available to install CDC triggers.');
}

// ── 1.  Create the shared trigger function (once) ─────────────────────────
const CREATE_TRIGGER_FUNCTION = `
CREATE OR REPLACE FUNCTION sync_queue_notify()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_payload   JSONB;
  v_record_id TEXT := '';
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_payload := to_jsonb(OLD);
  ELSE
    v_payload := to_jsonb(NEW);
  END IF;

  -- Safely extract id if it exists in the payload, otherwise build a fallback string
  IF v_payload ? 'id' THEN
    v_record_id := COALESCE((v_payload->>'id'), '');
  ELSIF v_payload ? 'userId' AND v_payload ? 'roleId' THEN
    v_record_id := (v_payload->>'userId') || ':' || (v_payload->>'roleId');
  ELSIF v_payload ? 'userId' AND v_payload ? 'departmentId' THEN
    v_record_id := (v_payload->>'userId') || ':' || (v_payload->>'departmentId');
  ELSIF v_payload ? 'roleId' AND v_payload ? 'permissionId' THEN
    v_record_id := (v_payload->>'roleId') || ':' || (v_payload->>'permissionId');
  ELSE
    v_record_id := '';
  END IF;

  INSERT INTO sync_queue (id, table_name, record_id, action, payload, status, attempts, created_at)
  VALUES (
    gen_random_uuid()::TEXT,
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    v_payload,
    'PENDING',
    0,
    NOW()
  );

  PERFORM pg_notify('sync_queue_channel', 'new_record');

  RETURN NULL;
END;
$$;
`;

// ── 2.  Fetch all user tables in the public schema ────────────────────────
const LIST_TABLES = `
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE '_prisma%';
`;

// ── 3.  Install trigger on a single table ─────────────────────────────────
function buildTriggerSQL(table: string): string {
  const triggerName = `trg_sync_${table}`;
  return `
    DROP TRIGGER IF EXISTS ${triggerName} ON "${table}";
    CREATE TRIGGER ${triggerName}
    AFTER INSERT OR UPDATE OR DELETE ON "${table}"
    FOR EACH ROW EXECUTE FUNCTION sync_queue_notify();
  `;
}

// ── Main export ───────────────────────────────────────────────────────────
export async function setupTriggers(): Promise<void> {
  let client: pg.PoolClient | undefined;
  try {
    client = await getActivePool();
    console.log('[SyncTrigger] Installing CDC trigger function…');
    await client.query(CREATE_TRIGGER_FUNCTION);

    const { rows } = await client.query<{ tablename: string }>(LIST_TABLES);

    let installed = 0;
    let skipped = 0;

    for (const { tablename } of rows) {
      if (EXCLUDED_TABLES.has(tablename)) {
        skipped++;
        continue;
      }
      await client.query(buildTriggerSQL(tablename));
      installed++;
    }

    console.log(
      `[SyncTrigger] ✓ Triggers installed on ${installed} tables` +
      ` (${skipped} excluded).`
    );
  } catch (err) {
    console.error('[SyncTrigger] ✗ Failed to install triggers:', err);
    // Non-fatal — server still starts, sync just won't work until fixed
  } finally {
    if (client) {
      client.release();
      // End the temporary pool we created for this installation
      const ownPool: pg.Pool | undefined = (client as any).__ownPool;
      if (ownPool) ownPool.end().catch(() => null);
    }
  }
}
