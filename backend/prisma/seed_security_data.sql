-- Seed Initial Security Devices, Incidents, Access Certifications & Break Glass Logs

INSERT INTO security_devices (id, name, type, os, ip_address, mac_address, trust_status, last_patch_date, encryption_active, enrolled_by, department, created_at, updated_at)
VALUES
('DEV-8812', 'ICU Central Ward Workstation #1', 'DESKTOP', 'Windows 11 Enterprise (23H2)', '192.168.1.112', '00:1A:2B:3C:4D:5E', 'TRUSTED', NOW() - INTERVAL '6 days', TRUE, 'Engr. Danjuma Bello', 'ICU', NOW() - INTERVAL '90 days', NOW()),
('DEV-8813', 'Dr. Fatima Aliyu Hospital iPad Pro', 'TABLET', 'iPadOS 17.5.1', '192.168.1.185', 'A4:C3:F0:11:22:33', 'TRUSTED', NOW() - INTERVAL '3 days', TRUE, 'IT Security Lead', 'Maternity', NOW() - INTERVAL '75 days', NOW()),
('DEV-8814', 'Main Pharmacy Dispensary Terminal A', 'DESKTOP', 'Ubuntu 24.04 LTS (Locked Kiosk)', '192.168.1.140', '52:54:00:12:34:56', 'TRUSTED', NOW() - INTERVAL '10 days', TRUE, 'IT Security Lead', 'Pharmacy', NOW() - INTERVAL '120 days', NOW()),
('DEV-8815', 'Emergency Triage Admission Kiosk', 'KIOSK', 'Windows 11 IoT Enterprise', '192.168.1.105', '70:85:C2:55:66:77', 'TRUSTED', NOW() - INTERVAL '5 days', TRUE, 'System Security Admin', 'Emergency', NOW() - INTERVAL '60 days', NOW()),
('DEV-8816', 'Radiology PACS Modality Gateway Workstation', 'SERVER', 'Red Hat Enterprise Linux 9.3', '192.168.1.200', '08:00:27:AA:BB:CC', 'TRUSTED', NOW() - INTERVAL '15 days', TRUE, 'Engr. Danjuma Bello', 'Radiology', NOW() - INTERVAL '180 days', NOW()),
('DEV-8817', 'Unregistered Personal Laptop (Visitor LAN)', 'LAPTOP', 'macOS Sonoma 14.4', '192.168.2.88', 'F4:D4:88:99:AA:BB', 'REVOKED', NOW() - INTERVAL '20 days', FALSE, 'Automated NAC Gatekeeper', 'Guest Wi-Fi', NOW() - INTERVAL '2 days', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO security_incidents (id, source_ip, event_name, severity, target_user, status, mitigation, resolved_by, resolved_at, created_at, updated_at)
VALUES
('INC-9901', '197.210.64.12', 'BRUTE_FORCE_LOGIN_ATTEMPT', 'HIGH', 'admin', 'BLOCKED', 'IP address blacklisted by Firewall. Adaptive rate-limiting triggered after 5 failed authentication attempts.', 'Automated Gatekeeper IDS', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '3 hours', NOW()),
('INC-9902', '102.89.44.198', 'ANOMALOUS_OFF_SHIFT_ACCESS', 'MEDIUM', 'nurse.joy', 'RESOLVED', 'Adaptive step-up MFA challenge dispatched to registered TOTP authenticator. Confirmed by staff member on night call.', 'Chief Security Officer', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '6 hours', NOW()),
('INC-9903', '192.168.1.250', 'POTENTIAL_PII_EXPORT_SPIKE', 'HIGH', 'billing.officer', 'UNDER_INVESTIGATION', 'Bulk export of 250+ patient records flagged during non-business hours. Security Committee notified.', NULL, NULL, NOW() - INTERVAL '1 day', NOW()),
('INC-9904', '41.203.77.10', 'CREDENTIAL_STUFFING_SUSPECTED', 'CRITICAL', 'dr.okafor', 'BLOCKED', 'Account temporarily frozen pursuant to NDPA breach-prevention protocol. Mandatory credential reset enforced.', 'Automated IDS Engine', NOW() - INTERVAL '18 hours', NOW() - INTERVAL '2 days', NOW()),
('INC-9905', '192.168.1.189', 'UNAUTHORIZED_PORT_SCAN_DETECTED', 'LOW', 'Internal Host', 'RESOLVED', 'Biomedical engineering maintenance diagnostic scan authorized by Radiology Lead.', 'IT Network Administrator', NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 days', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO access_certifications (id, user_id, username, role, department, reviewer, status, date_reviewed, campaign_name, comments, created_at, updated_at)
VALUES
('CRT-01', NULL, 'dr.fatima.aliyu', 'DOCTOR', 'Maternity', 'Chief Medical Officer', 'CERTIFIED', NOW() - INTERVAL '5 days', 'Q4 2026 Statutory Privilege Audit', 'Privileges verified: Caesarean Section, ANC clinic, and inpatient prescribing entitlements active.', NOW() - INTERVAL '15 days', NOW()),
('CRT-02', NULL, 'nurse.ngozi', 'NURSE', 'Nursing', 'Director of Nursing Services', 'CERTIFIED', NOW() - INTERVAL '4 days', 'Q4 2026 Statutory Privilege Audit', 'Nurse dispensing and triage vitals entry permissions ratified.', NOW() - INTERVAL '15 days', NOW()),
('CRT-03', NULL, 'pharm.chinedu', 'PHARMACIST', 'Pharmacy', 'Head of Pharmacy Services', 'CERTIFIED', NOW() - INTERVAL '3 days', 'Q4 2026 Statutory Privilege Audit', 'Controlled dangerous drugs (CDD) dispensing and central warehouse inventory authority renewed.', NOW() - INTERVAL '15 days', NOW()),
('CRT-04', NULL, 'billing.officer', 'CASHIER', 'Billing', 'Head of Internal Audit', 'PENDING_REVIEW', NULL, 'Q4 2026 Statutory Privilege Audit', 'Awaiting quarterly audit confirmation of cashier refund authorization limits.', NOW() - INTERVAL '10 days', NOW()),
('CRT-05', NULL, 'mortuary.attendant', 'MORTICIAN', 'Pathology', 'Head of Pathology', 'PENDING_REVIEW', NULL, 'Q4 2026 Statutory Privilege Audit', 'Annual review of deceased body release certificate authorization.', NOW() - INTERVAL '8 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Seed Break Glass Clinical Override Log if table is empty
INSERT INTO break_glass_logs (id, "userId", patient_id, reason, "actionPerformed", action_performed, "accessedAt", accessed_at, ip_address, user_role, severity, reviewed_by_dpo, reviewed_at, dpo_action, dpo_notes)
SELECT
  'bg-001',
  u.id,
  NULL,
  'Unconscious trauma casualty arrived via ambulance in critical shock. Immediate access to emergency clinical allergy records, blood group, and past surgical history required without waiting for guardian consent.',
  'Unrestricted EMR clinical history and blood cross-match bypass',
  'Unrestricted EMR clinical history and blood cross-match bypass',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day',
  '192.168.1.105',
  'DOCTOR',
  'EMERGENCY',
  TRUE,
  NOW() - INTERVAL '18 hours',
  'APPROVED',
  'DPO Review completed: Justified emergency life-saving clinical elevation. Patient identity verified post-stabilization.'
FROM users u
WHERE u.role = 'DOCTOR' OR u.role = 'ADMIN' OR u.role = 'SUPER_ADMIN'
LIMIT 1
ON CONFLICT (id) DO NOTHING;
