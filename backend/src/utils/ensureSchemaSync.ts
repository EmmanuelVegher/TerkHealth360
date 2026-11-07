import { prisma } from '../prisma.js';

/**
 * ensureSchemaSync.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Safeguard schema synchronizer that ensures critical columns and supplementary
 * tables exist in PostgreSQL without risking table drops or data loss.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function ensureSchemaSync(): Promise<void> {
  const statements = [
    // 1. Staff regulatory & licensing columns
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS mdcn_folio_number TEXT`,
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS nmcn_number TEXT`,
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS pcn_number TEXT`,
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS mlscn_number TEXT`,
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS national_provider_id TEXT`,
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS regulatory_council TEXT`,

    // 2. Pharmacy inventory classifications
    `ALTER TABLE pharmacy_inventory_items ADD COLUMN IF NOT EXISTS atc_code TEXT`,
    `ALTER TABLE pharmacy_inventory_items ADD COLUMN IF NOT EXISTS atc_name TEXT`,
    `ALTER TABLE pharmacy_inventory_items ADD COLUMN IF NOT EXISTS therapeutic_class TEXT`,

    // 3. NMRS / NHTDAO Facility identifiers
    `ALTER TABLE nmrs_configs ADD COLUMN IF NOT EXISTS facility_dhprs_code TEXT DEFAULT 'DHPRS-FCT-0482'`,
    `ALTER TABLE nmrs_configs ADD COLUMN IF NOT EXISTS facility_nhfr_code TEXT DEFAULT 'NHFR-2489-01'`,
    `ALTER TABLE nmrs_configs ADD COLUMN IF NOT EXISTS nhtdao_registered BOOLEAN DEFAULT TRUE`,

    // 4. Break glass access & DPO audit logs
    `ALTER TABLE break_glass_logs ADD COLUMN IF NOT EXISTS patient_id TEXT`,
    `ALTER TABLE break_glass_logs ADD COLUMN IF NOT EXISTS action_performed TEXT`,
    `ALTER TABLE break_glass_logs ADD COLUMN IF NOT EXISTS accessed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()`,
    `ALTER TABLE break_glass_logs ADD COLUMN IF NOT EXISTS ip_address TEXT`,
    `ALTER TABLE break_glass_logs ADD COLUMN IF NOT EXISTS user_role TEXT`,
    `ALTER TABLE break_glass_logs ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'EMERGENCY'`,
    `ALTER TABLE break_glass_logs ADD COLUMN IF NOT EXISTS reviewed_by_dpo BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE break_glass_logs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITHOUT TIME ZONE`,
    `ALTER TABLE break_glass_logs ADD COLUMN IF NOT EXISTS reviewed_by_id TEXT`,
    `ALTER TABLE break_glass_logs ADD COLUMN IF NOT EXISTS dpo_notes TEXT`,
    `ALTER TABLE break_glass_logs ADD COLUMN IF NOT EXISTS dpo_action TEXT`,

    // 5. Patient NDPC consents table
    `CREATE TABLE IF NOT EXISTS patient_consents (
      id TEXT PRIMARY KEY,
      "fhirId" TEXT UNIQUE,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      scope TEXT NOT NULL DEFAULT 'PATIENT_PRIVACY',
      category TEXT NOT NULL DEFAULT 'DATA_PROCESSING',
      provision_type TEXT NOT NULL DEFAULT 'PERMIT',
      purpose_of_use TEXT NOT NULL,
      data_classes_allowed TEXT,
      data_classes_restricted TEXT,
      consenting_party_name TEXT,
      consenting_party_rel TEXT NOT NULL DEFAULT 'SELF',
      signature_type TEXT NOT NULL DEFAULT 'DIGITAL',
      signature_ref TEXT,
      valid_from TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      valid_to TIMESTAMP WITHOUT TIME ZONE,
      revoked_at TIMESTAMP WITHOUT TIME ZONE,
      revoked_reason TEXT,
      witness_staff_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
      dpo_reviewed BOOLEAN NOT NULL DEFAULT TRUE,
      ndpc_lawful_basis TEXT NOT NULL DEFAULT 'EXPLICIT_CONSENT',
      notes TEXT,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS patient_consents_patient_id_status_idx ON patient_consents(patient_id, status)`,
    `CREATE INDEX IF NOT EXISTS patient_consents_scope_status_idx ON patient_consents(scope, status)`,
    `CREATE INDEX IF NOT EXISTS patient_consents_created_at_idx ON patient_consents(created_at)`,

    // 6. DHIS2 configs
    `CREATE TABLE IF NOT EXISTS dhis2_configs (
      id TEXT PRIMARY KEY,
      base_url TEXT NOT NULL DEFAULT 'https://dhis2nigeria.org.ng/dhis',
      auth_type TEXT NOT NULL DEFAULT 'BASIC',
      username TEXT,
      password TEXT,
      personal_access_token TEXT,
      org_unit_uid TEXT,
      data_set_uid TEXT,
      attribute_option_combo_uid TEXT,
      period_type TEXT NOT NULL DEFAULT 'Monthly',
      auto_submit_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      submission_day_of_month INT NOT NULL DEFAULT 5,
      openhexa_feed_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      openhexa_api_key TEXT,
      last_connection_status TEXT,
      last_connection_at TIMESTAMP WITHOUT TIME ZONE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    )`,

    // 7. DHIS2 Data Element Mappings
    `CREATE TABLE IF NOT EXISTS dhis2_data_element_mappings (
      id TEXT PRIMARY KEY,
      indicator_key TEXT UNIQUE NOT NULL,
      data_element_uid TEXT,
      category_option_combo_uid TEXT,
      is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    )`,

    // 8. DHIS2 Submissions
    `CREATE TABLE IF NOT EXISTS dhis2_submissions (
      id TEXT PRIMARY KEY,
      period TEXT NOT NULL,
      data_set_uid TEXT,
      org_unit_uid TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      dry_run BOOLEAN NOT NULL DEFAULT FALSE,
      trigger TEXT NOT NULL DEFAULT 'MANUAL',
      payload JSONB NOT NULL,
      import_summary JSONB,
      imported_count INT NOT NULL DEFAULT 0,
      updated_count INT NOT NULL DEFAULT 0,
      ignored_count INT NOT NULL DEFAULT 0,
      error_message TEXT,
      submitted_by_id TEXT,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS dhis2_submissions_period_idx ON dhis2_submissions(period)`,
    `CREATE INDEX IF NOT EXISTS dhis2_submissions_status_created_at_idx ON dhis2_submissions(status, created_at)`,

    // 9. Universal Interop Database Connectors
    `CREATE TABLE IF NOT EXISTS interop_db_connectors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      dialect TEXT NOT NULL,
      host TEXT,
      port INT,
      database_name TEXT NOT NULL,
      username TEXT,
      password TEXT,
      options JSONB DEFAULT '{}'::jsonb,
      status TEXT DEFAULT 'CONNECTED',
      last_introspected_at TIMESTAMP WITHOUT TIME ZONE,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    )`,

    // 10. Universal Interop Table Mappings
    `CREATE TABLE IF NOT EXISTS interop_db_mappings (
      id TEXT PRIMARY KEY,
      connector_id TEXT NOT NULL,
      source_table TEXT NOT NULL,
      source_query TEXT,
      target_table TEXT,
      target_entity TEXT NOT NULL,
      field_mappings JSONB DEFAULT '[]'::jsonb,
      filter_condition TEXT,
      sync_mode TEXT DEFAULT 'MANUAL',
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    )`,

    // 11. Universal Interop Application Endpoints
    `CREATE TABLE IF NOT EXISTS interop_app_endpoints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      app_type TEXT NOT NULL,
      endpoint_token TEXT UNIQUE NOT NULL,
      secret_key TEXT,
      target_entity TEXT NOT NULL,
      payload_format TEXT DEFAULT 'JSON',
      field_mappings JSONB DEFAULT '[]'::jsonb,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    )`,

    // 12. Universal Interop Ingest Audit Logs
    `CREATE TABLE IF NOT EXISTS interop_ingest_logs (
      id TEXT PRIMARY KEY,
      endpoint_token TEXT,
      source_type TEXT,
      source_name TEXT,
      target_entity TEXT,
      records_ingested INT DEFAULT 0,
      processing_ms INT DEFAULT 0,
      status TEXT DEFAULT 'SUCCESS',
      error_message TEXT,
      payload JSONB,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    )`
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      // Non-fatal if table or column already exists / schema varies
    }
  }
}
