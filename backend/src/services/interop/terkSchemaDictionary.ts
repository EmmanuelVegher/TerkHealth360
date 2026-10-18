import { prisma } from '../../prisma.js';

export interface TerkColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey?: boolean;
  foreignTable?: string;
  foreignColumn?: string;
  defaultValue?: string | null;
  description: string;
}

export interface TerkTableSummary {
  tableName: string;
  category: string;
  description: string;
  columnCount: number;
}

export interface TerkTableDefinition {
  tableName: string;
  category: string;
  description: string;
  columnCount: number;
  columns: TerkColumnInfo[];
  primaryKeys: string[];
  foreignKeys: Array<{
    column: string;
    foreignTable: string;
    foreignColumn: string;
  }>;
}

export interface TerkHealthSchema {
  schemaName: string;
  database: string;
  version: string;
  generatedAt: string;
  totalTables: number;
  totalColumns: number;
  tables: Record<string, TerkTableDefinition>;
}

const CLINICAL_DESCRIPTIONS: Record<string, string> = {
  // Common Keys & Metadata
  id: 'Unique System Universal Identifier (UUID primary key)',
  created_at: 'Timestamp when this record was originally created',
  updated_at: 'Timestamp when this record was last modified',
  createdAt: 'Timestamp when this record was originally created',
  updatedAt: 'Timestamp when this record was last modified',
  createdById: 'User ID of the staff/clinician who created this record',
  status: 'Lifecycle status flag (e.g. ACTIVE, PENDING, COMPLETED, CANCELLED)',
  isActive: 'Boolean flag indicating whether this record is active (true/false)',

  // Patient Master
  patientNumber: 'Institutional patient card/MRN folder number (e.g. FF-0001, TH-0042)',
  hospitalNumber: 'Institutional patient card/MRN folder number (e.g. FF-0001, TH-0042)',
  folder_number: 'Patient folder/card number corresponding to hospital file index',
  firstName: 'Patient legal given / first name',
  lastName: 'Patient legal family surname',
  middleName: 'Patient middle name or additional given name',
  maidenName: 'Patient previous surname prior to marriage',
  patient_name: 'Full name of the patient or payer',
  birthDate: 'Patient date of birth (ISO timestamp or YYYY-MM-DD)',
  dateOfBirth: 'Patient date of birth (ISO timestamp or YYYY-MM-DD)',
  gender: 'Biological sex: MALE, FEMALE, or OTHER',
  maritalStatus: 'Civil status: SINGLE, MARRIED, DIVORCED, WIDOWED',
  bloodGroup: 'ABO and Rh Blood Group (e.g. A_POSITIVE, O_POSITIVE, B_NEGATIVE)',
  genotype: 'Hemoglobin genotype classification (AA, AS, SS, AC, SC)',
  phoneNumber: 'Primary contact phone / GSM mobile number',
  address: 'Residential home street address',
  email: 'Contact email address',
  nationality: 'Country of nationality / citizenship',
  stateOfOrigin: 'State of origin within Nigeria (e.g. Benue, Plateau, Lagos)',
  lga: 'Local Government Area of origin or residence',
  occupation: 'Patient profession or employment sector',
  religion: 'Religious affiliation (e.g. CHRISTIANITY, ISLAM, TRADITIONAL)',
  nin: '11-digit Nigerian National Identity Number (NIN)',
  walletBalance: 'Current prepaid patient wallet credit balance in Naira (₦)',
  amountOwed: 'Outstanding medical, surgical, or drug debt owed to hospital (₦)',
  emergencyName: 'Emergency contact full name',
  emergencyPhone: 'Emergency contact telephone number',
  emergencyRelationship: 'Relationship to patient (e.g. SPOUSE, PARENT, SIBLING)',

  // Cashier & Billing
  receipt_number: 'Official cashier receipt serial number (e.g. RCPT-2024-001)',
  amount_paid: 'Total monetary payment tendered and verified in Naira (₦)',
  payment_method: 'Payment channel: CASH, POS_TERMINAL, BANK_TRANSFER, NHIA_INSURANCE',
  service_rendered: 'Description of clinical service, lab test, or procedure paid for',
  cashier_name: 'Name or username of the cashier officer who collected the fee',
  scheme_code: 'Billing scheme or payer category code (e.g. PRIVATE, NHIA, RETAIL)',
  scheme_name: 'Name of insurance or corporate payer program',

  // Clinical Visits & Encounters
  visitNumber: 'Unique clinical encounter / OPD visit tracking number',
  visitType: 'Type of clinical encounter: OPD, INPATIENT, EMERGENCY, ANTENATAL, IMMUNIZATION',
  chiefComplaint: 'Primary medical symptom or reason stated by patient for seeking care',
  diagnosis: 'Clinical diagnostic impression or ICD code',
  consultationServiceId: 'Foreign key to consultation service catalog item',

  // Staff & Workforce (National Registries)
  employeeId: 'Unique hospital workforce registration ID (e.g. DOC-001, NRS-004)',
  department: 'Hospital clinical or administrative department assignment',
  designation: 'Cadre or job title (e.g. Consultant Physician, Senior Nursing Officer)',
  specialization: 'Medical specialty (e.g. Obstetrics, Cardiology, Pediatrics)',
  licenseNumber: 'State or institutional practicing license number',
  mdcnFolioNumber: 'Medical and Dental Council of Nigeria (MDCN) doctor folio registration number',
  nmcnNumber: 'Nursing and Midwifery Council of Nigeria (NMCN) registered nurse/midwife number',
  pcnNumber: 'Pharmacists Council of Nigeria (PCN) pharmacist registration number',
  mlscnNumber: 'Medical Laboratory Science Council of Nigeria (MLSCN) license number',
  nationalProviderId: 'National Health Workforce Registry (NHWR) universal provider identifier',
  regulatoryCouncil: 'Accrediting health professional council (MDCN, NMCN, PCN, MLSCN, RRBN)',

  // Facility & NHTDAO Interop Identifiers
  facilityDhprsCode: 'Department of Health Planning, Research & Statistics (DHPRS) National Facility Code',
  facilityNhfrCode: 'National Health Facility Registry (NHFR) Master Facility Index Code',
  facilityDATIMCode: 'PEPFAR / DATIM health facility reporting code (e.g. DATIM-NIG-7821)',
  nhtdaoRegistered: 'Flag indicating verified enrollment in National Health Technology & Data Analytics Office ecosystem',

  // Inpatient & Ward
  admittedAt: 'Timestamp when patient was formally admitted to hospital ward',
  dischargedAt: 'Timestamp when patient was formally discharged from ward',
  dischargeReason: 'Reason for discharge: RECOVERED, REFERRED, AMA, DECEASED',
  bedId: 'Foreign key to specific physical hospital bed assigned to patient',
  clinicalCondition: 'General clinical status upon admission/discharge: STABLE, CRITICAL, GUARDED',

  // Pharmacy & Drugs (WHO ATC Classification)
  prescriptionNumber: 'Unique pharmacy prescription order reference (e.g. RX-2024-001)',
  drugName: 'Generic or brand name of medication',
  quantity: 'Total number of units, tablets, vials, or bottles dispensed',
  unitPrice: 'Unit sale price in Naira (₦) per unit',
  totalAmount: 'Total line item charge in Naira (₦)',
  dosageInstructions: 'Sig directions: e.g. 1 tab PO TID x 5/7',
  dispensedBy: 'Name or user ID of pharmacist or technician dispensing the drug',
  atcCode: 'WHO Anatomical Therapeutic Chemical (ATC) Classification Code (e.g. P01BF01, A10BA02)',
  atcName: 'Official WHO ATC chemical substance or therapeutic subgroup name',
  therapeuticClass: 'Pharmacological drug therapeutic category classification',

  // Laboratory & Diagnostics
  orderNumber: 'Laboratory sample or accession tracking number',
  testName: 'Name of laboratory test or diagnostic parameter (e.g. PCV, Fasting Blood Glucose)',
  resultValue: 'Quantitative or qualitative test outcome finding',
  unit: 'Standard unit of measurement (e.g. mg/dL, %, cells/mcL, mmol/L)',
  referenceRange: 'Normal diagnostic physiological reference range (e.g. 70 - 110 mg/dL)',
  clinicalRemarks: 'Pathologist or scientist interpretive remarks or critical value alert',
};

export class TerkSchemaDictionary {
  private static cachedSchema: TerkHealthSchema | null = null;
  private static lastCacheTime = 0;
  private static readonly CACHE_TTL_MS = 5000; // 5-second TTL ensures real-time updates when DDL changes

  /**
   * Helper to categorize any table name dynamically
   */
  public static categorizeTable(name: string): { category: string; description: string } {
    const lower = name.toLowerCase();
    let category = 'GENERAL';
    let description = `Hospital data table storing ${name.replace(/_/g, ' ')}`;

    if (/patient|family|allerg|immuniz|biometric|fingerprint|telecom|identifier/.test(lower)) {
      category = 'PATIENT & EMR';
      description = 'Patient demographics, medical history, clinical bio, and identifiers';
    } else if (/insur|bill|pay|bank|tax|grant|tariff|price|receipt|account|wallet|claim|pos/.test(lower)) {
      category = 'BILLING & FINANCE';
      description = 'Cashier receipts, invoices, insurance claims, tariffs, and payments';
    } else if (/pharm|medica|drug|prescrip|dispens|batch|stock|formulary/.test(lower)) {
      category = 'PHARMACY & DRUGS';
      description = 'Prescriptions, dispensary logs, inventory, and stock batches';
    } else if (/lab|blood|lims|observ|specimen|analyz|patholog|sample/.test(lower)) {
      category = 'LABORATORY & LIMS';
      description = 'Diagnostic orders, specimen tracking, and analyzer test findings';
    } else if (/visit|triage|encount|appoint|queue|vitals|consult/.test(lower)) {
      category = 'CLINICAL ENCOUNTERS';
      description = 'OPD visits, vital signs, triage consultations, and queues';
    } else if (/staff|user|attend|roster|hr|employee|doctor|nurse|shift|role|perm/.test(lower)) {
      category = 'WORKFORCE & HR';
      description = 'Hospital personnel profiles, duty shifts, and credentials';
    } else if (/admiss|ward|bed|nurs|theater|ot_|icu/.test(lower)) {
      category = 'INPATIENT (IPD)';
      description = 'Ward allocations, admissions, bed roster, and nursing care';
    } else if (/dental|radio|xray|mri|ultra|scan/.test(lower)) {
      category = 'DENTAL & RADIOLOGY';
      description = 'Specialty dental charting, maxillofacial imaging, and radiology PACS';
    } else if (/nmrs|openmrs|ndr|fhir|interop|sync/.test(lower)) {
      category = 'INTEROPERABILITY & NDR';
      description = 'National Data Repository (NDR), OpenMRS, and FHIR integration bridges';
    }

    return { category, description };
  }

  /**
   * Infer an accurate clinical description for any column name
   */
  public static describeColumn(colName: string): string {
    if (CLINICAL_DESCRIPTIONS[colName]) {
      return CLINICAL_DESCRIPTIONS[colName];
    }

    // Fallback intelligent descriptor based on naming pattern
    if (colName.endsWith('_id') || colName.endsWith('Id')) {
      const refName = colName.replace(/(_id|Id)$/, '');
      return `Foreign key reference pointing to associated ${refName} record`;
    }
    if (colName.endsWith('_at') || colName.endsWith('At') || /date/i.test(colName)) {
      return `Timestamp / chronological date recording ${colName}`;
    }
    if (colName.startsWith('is_') || colName.startsWith('is') || colName.startsWith('has_')) {
      return `Boolean status indicator (true/false) for ${colName}`;
    }
    if (/amount|price|cost|fee|balance|total/i.test(colName)) {
      return `Monetary value in Nigerian Naira (₦)`;
    }
    if (/name/i.test(colName)) {
      return `Name or textual label identifying this entity`;
    }
    if (/code|number|num|ref|token/i.test(colName)) {
      return `Reference code or serial identifier for ${colName}`;
    }

    // Format camelCase or snake_case nicely
    const humanized = colName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase();
    return `Hospital clinical / operational data field: ${humanized}`;
  }

  /**
   * Get all database tables in TerkHealth360 with accurate live column counts
   */
  public static async getTerkTables(): Promise<TerkTableSummary[]> {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        t.table_name as "tableName",
        COUNT(c.column_name)::int as "columnCount"
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c 
        ON t.table_name = c.table_name 
        AND t.table_schema = c.table_schema
      WHERE t.table_schema = 'public' 
        AND t.table_name NOT LIKE '_prisma%'
        AND t.table_name NOT LIKE 'interop%'
      GROUP BY t.table_name
      ORDER BY t.table_name;
    `);

    return rows.map(r => {
      const { category, description } = this.categorizeTable(r.tableName);
      return {
        tableName: r.tableName,
        category,
        description,
        columnCount: Number(r.columnCount) || 0,
      };
    });
  }

  /**
   * Get column specifications, foreign keys, and human-readable descriptions for a table
   */
  public static async getTableColumns(tableName: string): Promise<{ tableName: string; columns: TerkColumnInfo[] }> {
    // 1. Fetch column metadata and primary keys
    const colRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        c.column_name as "columnName",
        c.data_type as "dataType",
        c.is_nullable as "isNullable",
        c.column_default as "defaultValue",
        CASE WHEN kcu.column_name IS NOT NULL THEN true ELSE false END as "isPrimaryKey"
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT kcu.column_name, kcu.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
      ) kcu ON c.column_name = kcu.column_name AND c.table_name = kcu.table_name
      WHERE c.table_schema = 'public' AND c.table_name = $1
      ORDER BY c.ordinal_position;
    `, tableName);

    // 2. Fetch foreign key relations for this table
    const fkRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        kcu.column_name as "columnName", 
        ccu.table_name AS "foreignTable",
        ccu.column_name AS "foreignColumn"
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
        AND tc.table_name = $1;
    `, tableName);

    const fkMap = new Map<string, { foreignTable: string; foreignColumn: string }>();
    fkRows.forEach(fk => {
      fkMap.set(fk.columnName, {
        foreignTable: fk.foreignTable,
        foreignColumn: fk.foreignColumn,
      });
    });

    const columns: TerkColumnInfo[] = colRows.map(r => {
      const colName = r.columnName;
      const desc = this.describeColumn(colName);
      const fk = fkMap.get(colName);

      return {
        name: colName,
        dataType: r.dataType,
        isNullable: r.isNullable === 'YES',
        isPrimaryKey: Boolean(r.isPrimaryKey),
        isForeignKey: Boolean(fk),
        foreignTable: fk?.foreignTable,
        foreignColumn: fk?.foreignColumn,
        defaultValue: r.defaultValue ? String(r.defaultValue) : null,
        description: desc,
      };
    });

    return { tableName, columns };
  }

  /**
   * Generate the complete TerkHealthSchema live from PostgreSQL system catalog.
   * Any newly added column or table in TerkHealth360 is automatically captured.
   */
  public static async getFullTerkHealthSchema(bypassCache = false): Promise<TerkHealthSchema> {
    const now = Date.now();
    if (!bypassCache && this.cachedSchema && (now - this.lastCacheTime < this.CACHE_TTL_MS)) {
      return this.cachedSchema;
    }

    // 1. Fetch all public tables with column counts
    const tableSummaries = await this.getTerkTables();

    // 2. Fetch all foreign keys across the entire database
    const allFks: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        tc.table_name as "tableName", 
        kcu.column_name as "columnName", 
        ccu.table_name AS "foreignTable",
        ccu.column_name AS "foreignColumn"
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `);

    const fksByTable = new Map<string, Array<{ column: string; foreignTable: string; foreignColumn: string }>>();
    allFks.forEach(fk => {
      const list = fksByTable.get(fk.tableName) || [];
      list.push({
        column: fk.columnName,
        foreignTable: fk.foreignTable,
        foreignColumn: fk.foreignColumn,
      });
      fksByTable.set(fk.tableName, list);
    });

    // 3. Fetch all columns and PK constraints across all public tables
    const allCols: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        c.table_name as "tableName",
        c.column_name as "columnName",
        c.data_type as "dataType",
        c.is_nullable as "isNullable",
        c.column_default as "defaultValue",
        CASE WHEN kcu.column_name IS NOT NULL THEN true ELSE false END as "isPrimaryKey"
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT kcu.column_name, kcu.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
      ) kcu ON c.column_name = kcu.column_name AND c.table_name = kcu.table_name
      WHERE c.table_schema = 'public'
        AND c.table_name NOT LIKE '_prisma%'
        AND c.table_name NOT LIKE 'interop%'
      ORDER BY c.table_name, c.ordinal_position;
    `);

    const colsByTable = new Map<string, TerkColumnInfo[]>();
    const pksByTable = new Map<string, string[]>();

    allCols.forEach(c => {
      const list = colsByTable.get(c.tableName) || [];
      const tableFks = fksByTable.get(c.tableName) || [];
      const matchedFk = tableFks.find(f => f.column === c.columnName);

      const isPk = Boolean(c.isPrimaryKey);
      if (isPk) {
        const pkList = pksByTable.get(c.tableName) || [];
        pkList.push(c.columnName);
        pksByTable.set(c.tableName, pkList);
      }

      list.push({
        name: c.columnName,
        dataType: c.dataType,
        isNullable: c.isNullable === 'YES',
        isPrimaryKey: isPk,
        isForeignKey: Boolean(matchedFk),
        foreignTable: matchedFk?.foreignTable,
        foreignColumn: matchedFk?.foreignColumn,
        defaultValue: c.defaultValue ? String(c.defaultValue) : null,
        description: this.describeColumn(c.columnName),
      });
      colsByTable.set(c.tableName, list);
    });

    // 4. Assemble complete TerkHealthSchema
    const tablesMap: Record<string, TerkTableDefinition> = {};
    let totalColumns = 0;

    tableSummaries.forEach(ts => {
      const columns = colsByTable.get(ts.tableName) || [];
      const foreignKeys = fksByTable.get(ts.tableName) || [];
      const primaryKeys = pksByTable.get(ts.tableName) || [];
      totalColumns += columns.length;

      tablesMap[ts.tableName] = {
        tableName: ts.tableName,
        category: ts.category,
        description: ts.description,
        columnCount: columns.length,
        columns,
        primaryKeys,
        foreignKeys,
      };
    });

    const schema: TerkHealthSchema = {
      schemaName: 'TerkHealthSchema',
      database: 'PostgreSQL (TerkHealth360)',
      version: '2.5.0-dynamic',
      generatedAt: new Date().toISOString(),
      totalTables: tableSummaries.length,
      totalColumns,
      tables: tablesMap,
    };

    this.cachedSchema = schema;
    this.lastCacheTime = now;
    return schema;
  }

  /**
   * Invalidate schema cache on demand
   */
  public static invalidateCache(): void {
    this.cachedSchema = null;
    this.lastCacheTime = 0;
  }
}
