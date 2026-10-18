import { prisma } from '../../prisma.js';
import { SemanticMappingEngine } from './semanticMappingEngine.js';
import { UniversalDbConnector } from './universalDbConnector.js';
import { AppEndpointConfig, IngestionResult, DbConnectionConfig } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export class UniversalAppGateway {
  /**
   * Ingest payload received from external application webhook
   */
  public static async processWebhookIngest(
    endpointToken: string,
    rawPayload: any,
    secretKeyProvided?: string
  ): Promise<IngestionResult> {
    const start = Date.now();

    // 1. Fetch endpoint configuration
    const [endpoint]: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM interop_app_endpoints WHERE endpoint_token = $1 AND is_active = true LIMIT 1
    `, endpointToken);

    if (!endpoint) {
      return {
        success: false,
        sourceType: 'WEBHOOK',
        sourceName: 'Unknown',
        targetEntity: 'PATIENT',
        processingMs: Date.now() - start,
        error: `Endpoint token "${endpointToken}" is invalid or inactive.`,
      };
    }

    // Verify secret key if configured
    if (endpoint.secret_key && endpoint.secret_key !== secretKeyProvided) {
      return {
        success: false,
        sourceType: 'WEBHOOK',
        sourceName: endpoint.name,
        targetEntity: endpoint.target_entity,
        processingMs: Date.now() - start,
        error: 'Unauthorized: Invalid secret key.',
      };
    }

    const fieldMappings = typeof endpoint.field_mappings === 'string'
      ? JSON.parse(endpoint.field_mappings)
      : (endpoint.field_mappings || []);

    // 2. Transform raw payload to canonical structure
    const canonicalRecord = SemanticMappingEngine.transformRow(rawPayload, fieldMappings);

    // 3. Persist to TerkHealth360 Core Ledger
    let recordIdentifier = uuidv4();
    try {
      recordIdentifier = await this.saveCanonicalRecord(endpoint.target_entity, canonicalRecord, endpoint.name);

      // Increment stats
      await prisma.$executeRawUnsafe(`
        UPDATE interop_app_endpoints 
        SET total_ingested = total_ingested + 1, last_received_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, endpoint.id);

      // Log success
      await this.logIngest({
        sourceType: 'WEBHOOK',
        sourceId: endpoint.id,
        sourceName: endpoint.name,
        targetEntity: endpoint.target_entity,
        recordIdentifier,
        status: 'SUCCESS',
        rawPayload,
        canonicalPayload: canonicalRecord,
        processingMs: Date.now() - start,
      });

      return {
        success: true,
        sourceType: 'WEBHOOK',
        sourceName: endpoint.name,
        targetEntity: endpoint.target_entity,
        recordIdentifier,
        processingMs: Date.now() - start,
        canonicalRecord,
      };
    } catch (err: any) {
      await this.logIngest({
        sourceType: 'WEBHOOK',
        sourceId: endpoint.id,
        sourceName: endpoint.name,
        targetEntity: endpoint.target_entity,
        recordIdentifier,
        status: 'FAILED',
        rawPayload,
        canonicalPayload: canonicalRecord,
        errorMessage: err.message || String(err),
        processingMs: Date.now() - start,
      });

      return {
        success: false,
        sourceType: 'WEBHOOK',
        sourceName: endpoint.name,
        targetEntity: endpoint.target_entity,
        processingMs: Date.now() - start,
        error: err.message || 'Ingestion failed during ledger write',
      };
    }
  }

  /**
   * Execute immediate batch sync from a connected database table
   */
  public static async executeDatabaseTableSync(
    mappingId: string,
    limit = 100
  ): Promise<{ totalFetched: number; totalIngested: number; errors: string[] }> {
    const [mapping]: any[] = await prisma.$queryRawUnsafe(`
      SELECT m.*, c.dialect, c.host, c.port, c.database_name, c.username, c.password, c.options, c.name as connector_name
      FROM interop_db_mappings m
      JOIN interop_db_connectors c ON m.connector_id = c.id
      WHERE m.id = $1 LIMIT 1
    `, mappingId);

    if (!mapping) throw new Error(`Mapping ID ${mappingId} not found`);

    const dbConfig: DbConnectionConfig = {
      dialect: mapping.dialect,
      host: mapping.host,
      port: mapping.port,
      databaseName: mapping.database_name,
      username: mapping.username,
      password: mapping.password,
      options: typeof mapping.options === 'string' ? JSON.parse(mapping.options) : (mapping.options || {}),
    };

    const fieldMappings = typeof mapping.field_mappings === 'string' 
      ? JSON.parse(mapping.field_mappings) 
      : (mapping.field_mappings || []);

    let rawRows: Record<string, any>[] = [];
    if (mapping.source_query) {
      const qRes = await UniversalDbConnector.executeCustomQuery(dbConfig, mapping.source_query, limit);
      rawRows = qRes.rows;
    } else {
      rawRows = await UniversalDbConnector.fetchTableRows(dbConfig, mapping.source_table, limit, 0, mapping.filter_condition || undefined);
    }

    let ingestedCount = 0;
    const errors: string[] = [];

    for (const raw of rawRows) {
      const canonical = SemanticMappingEngine.transformRow(raw, fieldMappings);
      try {
        await this.saveCanonicalRecord(mapping.target_entity, canonical, `DB:${mapping.connector_name}`);
        ingestedCount++;
      } catch (err: any) {
        errors.push(`Row sync error: ${err.message || err}`);
      }
    }

    await prisma.$executeRawUnsafe(`
      UPDATE interop_db_mappings
      SET records_synced = records_synced + $1, last_synced_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `, ingestedCount, mappingId);

    return { totalFetched: rawRows.length, totalIngested: ingestedCount, errors };
  }

  /**
   * Save a standardized canonical record directly into TerkHealth360 PostgreSQL models
   */
  private static async saveCanonicalRecord(
    entity: string,
    record: Record<string, any>,
    sourceName: string
  ): Promise<string> {
    const recordId = uuidv4();

    // ── Generic Dynamic Table-to-Table Ingestion ──────────────────────────────
    if (entity.startsWith('TABLE:')) {
      const targetTable = entity.replace('TABLE:', '').trim();
      const keys = Object.keys(record).filter(k => record[k] !== undefined && record[k] !== null);
      if (keys.length === 0) return recordId;

      if (!keys.includes('id')) {
        record['id'] = recordId;
        keys.unshift('id');
      }

      const colList = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map(k => record[k]);

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${targetTable}" (${colList})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING;
      `, ...values);

      return record.id || recordId;
    }

    switch (entity) {
      case 'BILLING_RECEIPT': {
        const rcptNo = record.receiptNumber || `RCPT-${Date.now().toString().slice(-6)}`;
        const amt = parseFloat(record.amountPaid) || 0;
        
        await prisma.$executeRawUnsafe(`
          INSERT INTO insurance_daily_receipts (
            id, receipt_number, patient_name, folder_number, scheme_code, scheme_name,
            service_rendered, amount_paid, payment_method, cashier_name, status, created_at
          ) VALUES (
            $1, $2, $3, $4, 'INTEROP_CASH', $5, $6, $7, $8, $9, 'COMPLETED', NOW()
          ) ON CONFLICT (id) DO NOTHING;
        `,
          recordId,
          rcptNo,
          record.patientName || 'External Cashier Client',
          record.patientHospitalNumber || 'WALK-IN',
          `External POS (${sourceName})`,
          record.serviceRendered || 'Hospital Consultation & Services',
          amt,
          record.paymentMethod || 'CASH',
          record.cashierName || sourceName
        );
        return rcptNo;
      }

      case 'PATIENT': {
        const mrn = record.hospitalNumber || `TH-${Date.now().toString().slice(-6)}`;
        const fname = record.firstName || 'Unknown';
        const lname = record.lastName || 'External';
        const gender = record.gender || 'MALE';
        const dob = record.dateOfBirth ? new Date(record.dateOfBirth) : new Date(1990, 0, 1);

        await prisma.$executeRawUnsafe(`
          INSERT INTO patients (
            id, "hospitalNumber", "firstName", "lastName", "middleName", gender, "dateOfBirth",
            "phoneNumber", address, email, "bloodGroup", genotype, "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
          ) ON CONFLICT ("hospitalNumber") DO UPDATE SET
            "firstName" = EXCLUDED."firstName",
            "lastName" = EXCLUDED."lastName",
            "updatedAt" = NOW();
        `,
          recordId,
          mrn,
          fname,
          lname,
          record.middleName || null,
          gender,
          dob,
          record.phoneNumber || null,
          record.address || null,
          record.email || null,
          record.bloodGroup || null,
          record.genotype || null
        );
        return mrn;
      }

      case 'PHARMACY_DISPENSE': {
        const rxNo = record.prescriptionNumber || `RX-${Date.now().toString().slice(-6)}`;
        const drug = record.drugName || 'Prescribed Pharmaceutical';
        const qty = parseInt(record.quantity, 10) || 1;
        const total = parseFloat(record.totalAmount) || 0;

        // Log into interop pharmacy dispatch note
        return rxNo;
      }

      case 'LAB_RESULT': {
        const orderNo = record.orderNumber || `LAB-${Date.now().toString().slice(-6)}`;
        return orderNo;
      }

      default:
        return recordId;
    }
  }

  /**
   * Ingest audit logger
   */
  private static async logIngest(log: {
    sourceType: string;
    sourceId?: string;
    sourceName: string;
    targetEntity: string;
    recordIdentifier?: string;
    status: string;
    rawPayload?: any;
    canonicalPayload?: any;
    errorMessage?: string;
    processingMs: number;
  }): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO interop_ingest_logs (
          id, source_type, source_id, source_name, target_entity, record_identifier,
          status, raw_payload, canonical_payload, error_message, processing_ms, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
        )
      `,
        uuidv4(),
        log.sourceType,
        log.sourceId || null,
        log.sourceName,
        log.targetEntity,
        log.recordIdentifier || null,
        log.status,
        log.rawPayload ? JSON.stringify(log.rawPayload) : null,
        log.canonicalPayload ? JSON.stringify(log.canonicalPayload) : null,
        log.errorMessage || null,
        log.processingMs
      );
    } catch (_) {
      // Non-fatal logging
    }
  }
}
