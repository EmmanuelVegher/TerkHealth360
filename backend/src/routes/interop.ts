import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { UniversalDbConnector } from '../services/interop/universalDbConnector.js';
import { SemanticMappingEngine, CANONICAL_MODELS } from '../services/interop/semanticMappingEngine.js';
import { UniversalAppGateway } from '../services/interop/universalAppGateway.js';
import { TerkSchemaDictionary } from '../services/interop/terkSchemaDictionary.js';
import { DbConnectionConfig, CanonicalEntity } from '../services/interop/types.js';
import { authMiddleware } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ── Canonical Models Definition ─────────────────────────────────────────────
router.get('/canonical-models', (_req: Request, res: Response) => {
  res.json({ success: true, models: CANONICAL_MODELS });
});

// ── TerkHealth360 Dynamic Schema Discovery (Auto-updates with any DB change) ──
router.get('/terk-schema', authMiddleware, async (req: Request, res: Response) => {
  try {
    const bypassCache = req.query.refresh === 'true';
    const schema = await TerkSchemaDictionary.getFullTerkHealthSchema(bypassCache);
    res.json({ success: true, schema });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/schema', authMiddleware, async (req: Request, res: Response) => {
  try {
    const bypassCache = req.query.refresh === 'true';
    const schema = await TerkSchemaDictionary.getFullTerkHealthSchema(bypassCache);
    res.json({ success: true, schema });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/schema/refresh', authMiddleware, async (_req: Request, res: Response) => {
  try {
    TerkSchemaDictionary.invalidateCache();
    const schema = await TerkSchemaDictionary.getFullTerkHealthSchema(true);
    res.json({
      success: true,
      message: 'TerkHealthSchema successfully refreshed live from database.',
      totalTables: schema.totalTables,
      totalColumns: schema.totalColumns,
      generatedAt: schema.generatedAt,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/terk-tables', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const tables = await TerkSchemaDictionary.getTerkTables();
    res.json({ success: true, tables });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/terk-tables/:tableName', authMiddleware, async (req: Request, res: Response) => {
  try {
    const details = await TerkSchemaDictionary.getTableColumns(req.params.tableName);
    res.json({ success: true, ...details });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Database Interop: Test Connection ───────────────────────────────────────
router.post('/db/test', authMiddleware, async (req: Request, res: Response) => {
  try {
    const config: DbConnectionConfig = req.body;
    if (!config.dialect || !config.databaseName) {
      return res.status(400).json({ success: false, message: 'Database dialect and databaseName are required.' });
    }
    const result = await UniversalDbConnector.testConnection(config);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Connection test failed.' });
  }
});

// ── Database Interop: Execute Custom SQL Query / Join on Connected DB ───────
router.post('/db/query', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { config, query, limit } = req.body;
    if (!config || !query) {
      return res.status(400).json({ success: false, message: 'Database config and query text are required.' });
    }
    const result = await UniversalDbConnector.executeCustomQuery(config, query, limit || 10);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Query execution failed.' });
  }
});

// ── Database Interop: Schema Auto-Introspection ──────────────────────────────
router.post('/db/introspect', authMiddleware, async (req: Request, res: Response) => {
  try {
    const config: DbConnectionConfig = req.body;
    if (!config.dialect || !config.databaseName) {
      return res.status(400).json({ success: false, message: 'Database dialect and databaseName are required.' });
    }
    const manifest = await UniversalDbConnector.introspect(config);
    res.json({ success: true, manifest });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Introspection failed.' });
  }
});

// ── Database Interop: Auto-Map Table to Canonical Model ─────────────────────
router.post('/db/auto-map', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { table, preferredEntity } = req.body;
    if (!table || !table.name || !Array.isArray(table.columns)) {
      return res.status(400).json({ success: false, message: 'Valid table schema is required.' });
    }
    const proposal = SemanticMappingEngine.autoMapTable(table, preferredEntity as CanonicalEntity);
    res.json({ success: true, proposal });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Auto-mapping failed.' });
  }
});

// ── Database Interop: Save Connector ────────────────────────────────────────
router.post('/db/connectors', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id, name, dialect, host, port, databaseName, username, password, options } = req.body;
    if (!name || !dialect || !databaseName) {
      return res.status(400).json({ success: false, message: 'Name, dialect, and databaseName are required.' });
    }

    const connectorId = id || uuidv4();
    await prisma.$executeRawUnsafe(`
      INSERT INTO interop_db_connectors (
        id, name, dialect, host, port, database_name, username, password, options, status, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CONNECTED', NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        dialect = EXCLUDED.dialect,
        host = EXCLUDED.host,
        port = EXCLUDED.port,
        database_name = EXCLUDED.database_name,
        username = EXCLUDED.username,
        password = EXCLUDED.password,
        options = EXCLUDED.options,
        updated_at = NOW();
    `, connectorId, name, dialect, host || null, port ? Number(port) : null, databaseName, username || null, password || null, JSON.stringify(options || {}));

    res.json({ success: true, id: connectorId, message: 'Database connector saved successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Database Interop: List Connectors ───────────────────────────────────────
router.get('/db/connectors', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const connectors: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, name, dialect, host, port, database_name, username, options, status, last_introspected_at, created_at, updated_at
      FROM interop_db_connectors
      ORDER BY created_at DESC;
    `);
    res.json({ success: true, connectors });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Database Interop: Save Table Mapping ────────────────────────────────────
router.post('/db/mappings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id, connectorId, sourceTable, sourceQuery, targetEntity, targetTable, fieldMappings, filterCondition, syncMode } = req.body;
    if (!connectorId || (!sourceTable && !sourceQuery) || (!targetEntity && !targetTable)) {
      return res.status(400).json({ success: false, message: 'connectorId, sourceTable/sourceQuery, and targetEntity/targetTable are required.' });
    }

    const mappingId = id || uuidv4();
    const effectiveTargetEntity = targetTable ? `TABLE:${targetTable}` : targetEntity;
    const effectiveSourceTable = sourceTable || 'CUSTOM_QUERY';

    await prisma.$executeRawUnsafe(`
      INSERT INTO interop_db_mappings (
        id, connector_id, source_table, source_query, target_table, target_entity, field_mappings, filter_condition, sync_mode, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (id) DO UPDATE SET
        source_table = EXCLUDED.source_table,
        source_query = EXCLUDED.source_query,
        target_table = EXCLUDED.target_table,
        target_entity = EXCLUDED.target_entity,
        field_mappings = EXCLUDED.field_mappings,
        filter_condition = EXCLUDED.filter_condition,
        sync_mode = EXCLUDED.sync_mode,
        updated_at = NOW();
    `, mappingId, connectorId, effectiveSourceTable, sourceQuery || null, targetTable || null, effectiveTargetEntity, JSON.stringify(fieldMappings || []), filterCondition || null, syncMode || 'MANUAL');

    res.json({ success: true, id: mappingId, message: 'Table mapping saved.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Database Interop: List Table Mappings for Connector ─────────────────────
router.get('/db/mappings/:connectorId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const mappings: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM interop_db_mappings WHERE connector_id = $1 ORDER BY created_at DESC;
    `, req.params.connectorId);
    res.json({ success: true, mappings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Database Interop: Execute Immediate Sync ────────────────────────────────
router.post('/db/sync/:mappingId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const result = await UniversalAppGateway.executeDatabaseTableSync(req.params.mappingId, limit);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Custom Application Endpoints: Create/Update ─────────────────────────────
router.post('/endpoints', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id, name, appType, targetEntity, payloadFormat, fieldMappings, secretKey } = req.body;
    if (!name || !appType || !targetEntity) {
      return res.status(400).json({ success: false, message: 'name, appType, and targetEntity are required.' });
    }

    const endpointId = id || uuidv4();
    const endpointToken = req.body.endpointToken || `ep_${appType.toLowerCase()}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    await prisma.$executeRawUnsafe(`
      INSERT INTO interop_app_endpoints (
        id, name, app_type, endpoint_token, secret_key, target_entity, payload_format, field_mappings, is_active, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        app_type = EXCLUDED.app_type,
        secret_key = EXCLUDED.secret_key,
        target_entity = EXCLUDED.target_entity,
        payload_format = EXCLUDED.payload_format,
        field_mappings = EXCLUDED.field_mappings,
        updated_at = NOW();
    `, endpointId, name, appType, endpointToken, secretKey || null, targetEntity, payloadFormat || 'JSON', JSON.stringify(fieldMappings || []));

    res.json({ success: true, id: endpointId, endpointToken, message: 'Application connector endpoint configured.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Custom Application Endpoints: List ──────────────────────────────────────
router.get('/endpoints', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const endpoints: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM interop_app_endpoints ORDER BY created_at DESC;
    `);
    res.json({ success: true, endpoints });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Ingestion Webhook Gateway (Called by external Cashier / Pharmacy apps) ───
// Public endpoint authenticated via endpointToken and optional secret header
router.post('/webhook/ingest/:endpointToken', async (req: Request, res: Response) => {
  try {
    const token = req.params.endpointToken;
    const secret = (req.headers['x-interop-secret'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '')) as string | undefined;

    const result = await UniversalAppGateway.processWebhookIngest(token, req.body, secret);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Webhook processing error.' });
  }
});

// ── Ingestion Audit Logs ────────────────────────────────────────────────────
router.get('/logs', authMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const logs: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM interop_ingest_logs ORDER BY created_at DESC LIMIT $1;
    `, limit);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
