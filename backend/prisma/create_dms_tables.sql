-- DMS (Document Management System) Database Tables for PostgreSQL
-- Supports Enterprise Document Archive, Digital Forms, Submissions, Workflows, Electronic Signatures, and Legal Holds

CREATE TABLE IF NOT EXISTS dms_documents (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'POLICY_SOP',
  mime_type VARCHAR(128) NOT NULL DEFAULT 'application/pdf',
  file_size BIGINT DEFAULT 1048576,
  file_url TEXT,
  file_path TEXT,
  department VARCHAR(100) NOT NULL DEFAULT 'Administration',
  creator VARCHAR(150) NOT NULL DEFAULT 'System Admin',
  creator_id VARCHAR(64),
  version VARCHAR(32) NOT NULL DEFAULT '1.0',
  status VARCHAR(64) NOT NULL DEFAULT 'PUBLISHED',
  classification VARCHAR(64) NOT NULL DEFAULT 'INTERNAL',
  retention_period_years INT NOT NULL DEFAULT 7,
  is_legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  legal_hold_reason TEXT,
  legal_hold_date TIMESTAMP WITH TIME ZONE,
  ocr_text TEXT,
  tags TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_documents_category ON dms_documents(category);
CREATE INDEX IF NOT EXISTS idx_dms_documents_department ON dms_documents(department);
CREATE INDEX IF NOT EXISTS idx_dms_documents_status ON dms_documents(status);
CREATE INDEX IF NOT EXISTS idx_dms_documents_is_legal_hold ON dms_documents(is_legal_hold);
CREATE INDEX IF NOT EXISTS idx_dms_documents_created_at ON dms_documents(created_at);

CREATE TABLE IF NOT EXISTS dms_digital_forms (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  department VARCHAR(100) NOT NULL DEFAULT 'Administration',
  creator VARCHAR(150) NOT NULL DEFAULT 'Quality Assurance Officer',
  creator_id VARCHAR(64),
  version VARCHAR(32) NOT NULL DEFAULT '1.0',
  status VARCHAR(64) NOT NULL DEFAULT 'PUBLISHED',
  inputs_count INT NOT NULL DEFAULT 10,
  fields_schema JSONB,
  submissions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_forms_department ON dms_digital_forms(department);
CREATE INDEX IF NOT EXISTS idx_dms_forms_status ON dms_digital_forms(status);

CREATE TABLE IF NOT EXISTS dms_form_submissions (
  id VARCHAR(64) PRIMARY KEY,
  form_id VARCHAR(64) NOT NULL REFERENCES dms_digital_forms(id) ON DELETE CASCADE,
  submitted_by VARCHAR(150) NOT NULL DEFAULT 'Anonymous Staff',
  submitter_id VARCHAR(64),
  department VARCHAR(100),
  submission_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_submissions_form_id ON dms_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_dms_submissions_created_at ON dms_form_submissions(created_at);

CREATE TABLE IF NOT EXISTS dms_workflows (
  id VARCHAR(64) PRIMARY KEY,
  doc_id VARCHAR(64) NOT NULL REFERENCES dms_documents(id) ON DELETE CASCADE,
  doc_name VARCHAR(255) NOT NULL,
  stage VARCHAR(100) NOT NULL DEFAULT 'MEDICAL_DIRECTOR_REVIEW',
  status VARCHAR(64) NOT NULL DEFAULT 'PENDING_APPROVAL',
  assignee VARCHAR(150) NOT NULL DEFAULT 'Medical Director',
  assignee_id VARCHAR(64),
  comments TEXT,
  review_notes TEXT,
  date_initiated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  date_completed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_workflows_doc_id ON dms_workflows(doc_id);
CREATE INDEX IF NOT EXISTS idx_dms_workflows_status ON dms_workflows(status);

CREATE TABLE IF NOT EXISTS dms_signatures (
  id VARCHAR(64) PRIMARY KEY,
  doc_id VARCHAR(64) NOT NULL REFERENCES dms_documents(id) ON DELETE CASCADE,
  doc_name VARCHAR(255),
  workflow_id VARCHAR(64),
  signer VARCHAR(150) NOT NULL,
  signer_id VARCHAR(64),
  role VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  hash VARCHAR(255) NOT NULL,
  certificate_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_signatures_doc_id ON dms_signatures(doc_id);
CREATE INDEX IF NOT EXISTS idx_dms_signatures_hash ON dms_signatures(hash);
