export type SupportedDialect = 'POSTGRESQL' | 'MYSQL' | 'MSSQL' | 'ORACLE' | 'SQLITE';

export type CanonicalEntity = 
  | 'PATIENT' 
  | 'BILLING_RECEIPT' 
  | 'PHARMACY_DISPENSE' 
  | 'LAB_RESULT' 
  | 'ENCOUNTER_VISIT' 
  | 'STAFF';

export interface DbConnectionConfig {
  dialect: SupportedDialect;
  host?: string;
  port?: number;
  databaseName: string;
  username?: string;
  password?: string;
  options?: {
    ssl?: boolean;
    trustServerCertificate?: boolean;
    instanceName?: string;
    schema?: string;
    filePath?: string; // For SQLite
  };
}

export interface ColumnSchema {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  maxLength?: number;
  defaultValue?: string;
}

export interface TableSchema {
  name: string;
  schema?: string;
  columns: ColumnSchema[];
  primaryKeys: string[];
  estimatedRowCount: number;
  sampleRows: Record<string, any>[];
}

export interface DatabaseManifest {
  dialect: SupportedDialect;
  databaseName: string;
  tables: TableSchema[];
  introspectedAt: string;
}

export interface FieldMappingRule {
  targetField: string;
  sourceColumn?: string;
  transformFunction?: 'DIRECT' | 'LOWERCASE' | 'UPPERCASE' | 'PARSE_NUMBER' | 'PARSE_DATE' | 'GENDER_NORMALIZE' | 'TRIM' | 'CUSTOM_FORMULA';
  customFormula?: string;
  defaultValue?: any;
  confidence: number; // 0 - 100
  notes?: string;
}

export interface TableMappingProposal {
  sourceTable: string;
  targetEntity: CanonicalEntity;
  confidence: number; // 0 - 100
  fieldMappings: FieldMappingRule[];
  reasoning: string;
}

export interface AppEndpointConfig {
  id?: string;
  name: string;
  appType: 'CASHIER' | 'PHARMACY' | 'LIMS' | 'POS' | 'CUSTOM';
  endpointToken: string;
  secretKey?: string;
  targetEntity: CanonicalEntity;
  payloadFormat: 'JSON' | 'XML' | 'CSV';
  fieldMappings: FieldMappingRule[];
  isActive: boolean;
}

export interface IngestionResult {
  success: boolean;
  sourceType: 'DATABASE' | 'WEBHOOK' | 'FILE_DROP';
  sourceName: string;
  targetEntity: CanonicalEntity;
  recordIdentifier?: string;
  processingMs: number;
  canonicalRecord?: Record<string, any>;
  error?: string;
}
