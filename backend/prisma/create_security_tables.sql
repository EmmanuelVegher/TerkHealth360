-- PostgreSQL DDL for Security IAM tables
-- Zero Trust Devices, Security Incidents (SIEM), and Managerial Access Certifications

CREATE TABLE IF NOT EXISTS security_devices (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(64) NOT NULL DEFAULT 'DESKTOP',
  os VARCHAR(128) NOT NULL DEFAULT 'Windows 11 Enterprise',
  ip_address VARCHAR(64),
  mac_address VARCHAR(64),
  trust_status VARCHAR(64) NOT NULL DEFAULT 'TRUSTED',
  last_patch_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  encryption_active BOOLEAN NOT NULL DEFAULT TRUE,
  enrolled_by VARCHAR(150) DEFAULT 'System Security Admin',
  department VARCHAR(100) DEFAULT 'Administration',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_devices_trust_status ON security_devices(trust_status);
CREATE INDEX IF NOT EXISTS idx_security_devices_type ON security_devices(type);

CREATE TABLE IF NOT EXISTS security_incidents (
  id VARCHAR(64) PRIMARY KEY,
  source_ip VARCHAR(64) NOT NULL,
  event_name VARCHAR(128) NOT NULL,
  severity VARCHAR(64) NOT NULL DEFAULT 'MEDIUM',
  target_user VARCHAR(150) NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'FLAGGED',
  mitigation TEXT,
  resolved_by VARCHAR(150),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created_at ON security_incidents(created_at);

CREATE TABLE IF NOT EXISTS access_certifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  username VARCHAR(150) NOT NULL,
  role VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  reviewer VARCHAR(150) NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'PENDING_REVIEW',
  date_reviewed TIMESTAMP WITH TIME ZONE,
  campaign_name VARCHAR(255) DEFAULT 'Q4 2026 Statutory Privilege Audit',
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_cert_status ON access_certifications(status);
CREATE INDEX IF NOT EXISTS idx_access_cert_department ON access_certifications(department);
