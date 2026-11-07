-- Seed initial live DMS documents, forms, submissions, workflows, and signatures
-- for Faith Foundation Mission Hospital

-- 1. Insert Initial Governed Documents
INSERT INTO dms_documents (id, name, category, mime_type, file_size, file_url, department, creator, version, status, classification, retention_period_years, is_legal_hold, legal_hold_reason, legal_hold_date, ocr_text, tags, created_at, updated_at)
VALUES
('DOC-001', 'Clinical SOP for Antenatal & High-Risk Obstetric Care', 'POLICY_SOP', 'application/pdf', 2411720, '/uploads/dms/sop-antenatal-care.pdf', 'Maternity', 'Dr. Fatima Aliyu', '2.1', 'PUBLISHED', 'INTERNAL', 7, FALSE, NULL, NULL, 'Standard Operating Procedure for antenatal assessments, maternal risk scoring, eclampsia management, fetal heart monitoring, and emergency cesarean section handoff.', 'maternity,sop,obstetrics,antenatal', NOW() - INTERVAL '120 days', NOW()),
('DOC-002', 'Vendor Supply Agreement - Emzor Pharmaceutical Industries Ltd', 'CONTRACTS', 'application/pdf', 4194304, '/uploads/dms/contract-emzor-pharma.pdf', 'Pharmacy', 'Tunde Fashola (HR/Admin)', '1.2', 'ACTIVE', 'CONFIDENTIAL', 10, TRUE, 'Active statutory procurement pricing litigation hold pursuant to NDPA and Federal Ministry audit requirements.', NOW() - INTERVAL '15 days', 'Master supply agreement covering essential pharmaceutical consumables, anti-infectives, analgesics, cold-chain biologics, and quarterly replenishment rebates.', 'contracts,procurement,pharma,emzor', NOW() - INTERVAL '95 days', NOW()),
('DOC-003', 'Informed Consent Form for Major Surgery & General Anaesthesia', 'PATIENT_CONSENT', 'application/pdf', 1153433, '/uploads/dms/consent-surgical-anaesthesia.pdf', 'Operating Theatre', 'Dr. Emeka Obi (Chief Surgeon)', '3.0', 'PUBLISHED', 'RESTRICTED', 15, FALSE, NULL, NULL, 'Patient and guardian informed consent documentation detailing surgical intervention rationale, potential anaesthetic complications, blood transfusion consent, and postoperative critical care admission agreement.', 'consent,surgery,theatre,anaesthesia', NOW() - INTERVAL '60 days', NOW()),
('DOC-004', 'Hospital Infection Prevention & Control (IPC) Protocol 2026', 'POLICY_SOP', 'application/pdf', 3145728, '/uploads/dms/ipc-guidelines-2026.pdf', 'Nursing', 'Nurse Ngozi Adeyemi', '2.0', 'PUBLISHED', 'INTERNAL', 5, FALSE, NULL, NULL, 'Comprehensive hospital-wide protocol for hospital-acquired infection (HAI) surveillance, sterile processing department standards, hand hygiene audits, and isolation ward PPE directives.', 'ipc,hygiene,infection-control,nursing', NOW() - INTERVAL '45 days', NOW()),
('DOC-005', 'NHIS & Managed Care HMO Treatment Authorization Guidelines', 'POLICY_SOP', 'application/pdf', 1835008, '/uploads/dms/nhis-hmo-auth-protocol.pdf', 'Administration', 'Chioma Okonkwo', '1.0', 'PUBLISHED', 'INTERNAL', 7, FALSE, NULL, NULL, 'Standard administrative workflows for pre-authorization codes, capitation tariff reconciliation, referral eligibility, and secondary healthcare dispute resolution with accredited Nigerian HMOs.', 'nhis,hmo,insurance,billing', NOW() - INTERVAL '30 days', NOW()),
('DOC-006', 'Radiology Radiation Safety & PACS Machine Maintenance Schedule', 'POLICY_SOP', 'application/pdf', 5242880, '/uploads/dms/radiology-radiation-safety.pdf', 'Radiology', 'Engr. Danjuma Bello', '1.1', 'UNDER_REVIEW', 'RESTRICTED', 10, FALSE, NULL, NULL, 'Standard operating protocol governing ionizing radiation dosages, lead shielding checks, DICOM PACS server archival, and quarterly calibration of digital X-ray and ultrasound modalities.', 'radiology,xray,safety,dicom', NOW() - INTERVAL '14 days', NOW()),
('DOC-007', 'Mortuary Deceased Custody & Autopsy Chain-of-Custody Register', 'POLICY_SOP', 'application/pdf', 1572864, '/uploads/dms/mortuary-chain-of-custody.pdf', 'Pathology', 'Dr. Samuel Eze', '1.0', 'UNDER_REVIEW', 'CONFIDENTIAL', 20, TRUE, 'Coroners Act compliance: ongoing forensic investigation into unclaimed deceased identity verification.', NOW() - INTERVAL '7 days', 'Standard chain of custody tracking, refrigeration cold room temperature logs, embalming chemical inventory safety, and authorized family release certificate verification.', 'mortuary,pathology,custody,legal', NOW() - INTERVAL '21 days', NOW()),
('DOC-008', 'Emergency Resuscitation & Code Blue Triage Manual', 'CLINICAL_GUIDELINE', 'application/pdf', 2621440, '/uploads/dms/emergency-code-blue-manual.pdf', 'Emergency', 'Dr. Fatima Aliyu', '2.0', 'UNDER_REVIEW', 'INTERNAL', 5, FALSE, NULL, NULL, 'Advanced cardiac life support (ACLS) algorithmic guidelines, pediatric resuscitation drug dosage charts, crash cart rapid inventory verification, and emergency room crowd control.', 'emergency,code-blue,resuscitation,triage', NOW() - INTERVAL '10 days', NOW()),
('DOC-009', 'Blood Bank Cold Chain & Compatibility Testing Protocol', 'POLICY_SOP', 'application/pdf', 1966080, '/uploads/dms/blood-bank-cold-chain.pdf', 'Laboratory', 'Lab Sci. Ibrahim Garba', '1.3', 'PUBLISHED', 'RESTRICTED', 10, FALSE, NULL, NULL, 'Mandatory donor screening directives for HIV 1&2, Hepatitis B/C, and VDRL. Strict +2C to +6C blood bank refrigerator logging, component separation protocol, and crossmatch record retention.', 'blood-bank,laboratory,transfusion,cold-chain', NOW() - INTERVAL '75 days', NOW()),
('DOC-010', 'Staff Code of Conduct & Patient Medical Confidentiality Charter', 'POLICY_SOP', 'application/pdf', 1258291, '/uploads/dms/staff-code-of-conduct.pdf', 'Administration', 'Hospital Administrator', '1.0', 'PUBLISHED', 'INTERNAL', 10, FALSE, NULL, NULL, 'Institutional policies regarding patient health data privacy under the Nigeria Data Protection Act (NDPA), zero-tolerance harassment, conflicts of interest, and mandatory disciplinary escalation paths.', 'hr,administration,conduct,privacy,ndpa', NOW() - INTERVAL '150 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Digital Form Templates
INSERT INTO dms_digital_forms (id, title, description, department, creator, version, status, inputs_count, fields_schema, submissions_count, created_at, updated_at)
VALUES
('FRM-01', 'Adverse Drug Reaction (ADR) Incident Report', 'Standardized pharmacovigilance incident report form for documenting unexpected drug side-effects and reporting to NAFDAC safety portal.', 'Pharmacy', 'Quality Assurance Officer', '1.0', 'PUBLISHED', 12, '[
  {"name": "patientName", "label": "Patient Full Name", "type": "text", "required": true},
  {"name": "patientHospitalNo", "label": "Hospital EMR Number", "type": "text", "required": true},
  {"name": "suspectedDrug", "label": "Suspected Drug / Brand", "type": "text", "required": true},
  {"name": "batchNumber", "label": "Drug Batch / Lot No", "type": "text", "required": false},
  {"name": "reactionDate", "label": "Date of Reaction", "type": "date", "required": true},
  {"name": "reactionSeverity", "label": "Severity Level", "type": "select", "options": ["Mild", "Moderate", "Severe - Life Threatening", "Fatal"], "required": true},
  {"name": "symptomsObserved", "label": "Symptoms Description", "type": "textarea", "required": true},
  {"name": "actionTaken", "label": "Clinical Counter-Intervention", "type": "textarea", "required": true},
  {"name": "outcome", "label": "Patient Clinical Outcome", "type": "select", "options": ["Recovered Fully", "Recovering", "Persistent Disability", "Died"], "required": true},
  {"name": "reporterName", "label": "Reporting Clinician / Pharmacist", "type": "text", "required": true},
  {"name": "reporterDesignation", "label": "Clinician Designation", "type": "text", "required": true},
  {"name": "nafdacReported", "label": "Dispatched to NAFDAC ADR Center", "type": "select", "options": ["Yes", "Pending Verification", "No"], "required": true}
]'::jsonb, 42, NOW() - INTERVAL '100 days', NOW()),

('FRM-02', 'Clinical Incident & Patient Safety Incident Log', 'Hospital-wide adverse event reporting form for medication errors, patient falls, misdiagnoses, and surgical delays.', 'Nursing', 'Quality Assurance Officer', '2.1', 'PUBLISHED', 8, '[
  {"name": "incidentDate", "label": "Date & Time of Incident", "type": "datetime", "required": true},
  {"name": "wardDepartment", "label": "Ward / Department", "type": "select", "options": ["Maternity", "OPD", "IPD Ward A", "IPD Ward B", "ICU", "Theatre", "Emergency", "Laboratory"], "required": true},
  {"name": "incidentType", "label": "Category of Event", "type": "select", "options": ["Medication Error", "Patient Fall", "Equipment Malfunction", "Specimen Loss / Mislabel", "Verbal/Physical Aggression"], "required": true},
  {"name": "incidentSummary", "label": "Detailed Incident Account", "type": "textarea", "required": true},
  {"name": "immediateHarm", "label": "Harm Assessed", "type": "select", "options": ["No Harm", "Minor (First-Aid)", "Moderate Harm", "Severe Harm"], "required": true},
  {"name": "correctiveMeasures", "label": "Immediate Action Taken", "type": "textarea", "required": true},
  {"name": "witnesses", "label": "Witness Names & Designations", "type": "text", "required": false},
  {"name": "reportedBy", "label": "Reporting Staff Signature Name", "type": "text", "required": true}
]'::jsonb, 154, NOW() - INTERVAL '80 days', NOW()),

('FRM-03', 'Pre-Operative Surgical Safety Checklist (WHO Standard)', 'Checklist verified at Sign-In, Time-Out, and Sign-Out in theatre prior to incision and before patient leaves the room.', 'Operating Theatre', 'Dr. Emeka Obi', '3.0', 'PUBLISHED', 15, '[
  {"name": "patientId", "label": "Patient EMR / Identifier", "type": "text", "required": true},
  {"name": "confirmedIdentity", "label": "Patient Identity & Procedure Confirmed", "type": "select", "options": ["Yes", "No"], "required": true},
  {"name": "surgicalSiteMarked", "label": "Surgical Site Marked", "type": "select", "options": ["Yes", "Not Applicable"], "required": true},
  {"name": "anaesthesiaCheckComplete", "label": "Anaesthesia Machine & Medication Check Complete", "type": "select", "options": ["Yes"], "required": true},
  {"name": "pulseOximeterFunctioning", "label": "Pulse Oximeter Placed and Functioning", "type": "select", "options": ["Yes"], "required": true},
  {"name": "knownAllergies", "label": "Known Allergies Documented", "type": "text", "required": true},
  {"name": "difficultAirwayRisk", "label": "Difficult Airway / Aspiration Risk", "type": "select", "options": ["No", "Yes (Equipment Available)"], "required": true},
  {"name": "bloodLossRisk", "label": "Risk of >500ml Blood Loss", "type": "select", "options": ["No", "Yes (2 Units Crossmatched)"], "required": true},
  {"name": "leadSurgeon", "label": "Lead Surgeon Name", "type": "text", "required": true},
  {"name": "anaesthetist", "label": "Anaesthetist Name", "type": "text", "required": true},
  {"name": "scrubNurse", "label": "Scrub Nurse Name", "type": "text", "required": true},
  {"name": "swabInstrumentCount", "label": "Instrument & Swab Count Complete", "type": "select", "options": ["Yes", "Count Verified"], "required": true},
  {"name": "specimenLabeled", "label": "Specimen Correctly Labeled with Patient Name", "type": "select", "options": ["Yes", "N/A"], "required": true},
  {"name": "equipmentProblems", "label": "Any Equipment Malfunctions Noted", "type": "text", "required": false},
  {"name": "recoveryKeyConcerns", "label": "Key Concerns for Recovery & Management", "type": "textarea", "required": true}
]'::jsonb, 89, NOW() - INTERVAL '50 days', NOW()),

('FRM-04', 'Blood Transfusion Reaction Investigation Form', 'Investigation record triggered immediately when an adverse transfusion reaction occurs during packed cells or plasma administration.', 'Laboratory', 'Lab Sci. Ibrahim Garba', '1.0', 'PUBLISHED', 10, '[
  {"name": "patientName", "label": "Recipient Patient Name", "type": "text", "required": true},
  {"name": "donorUnitNo", "label": "Blood Unit Barcode / Number", "type": "text", "required": true},
  {"name": "bloodGroup", "label": "ABO & Rhesus Group", "type": "text", "required": true},
  {"name": "transfusionStartTime", "label": "Transfusion Start Time", "type": "datetime", "required": true},
  {"name": "reactionStartTime", "label": "Reaction Onset Time", "type": "datetime", "required": true},
  {"name": "symptoms", "label": "Symptoms (Chills, Rigors, Pyrexia, Hypotension, Haemoglobinuria)", "type": "textarea", "required": true},
  {"name": "preVitals", "label": "Pre-Transfusion Vitals (BP, Temp, Pulse)", "type": "text", "required": true},
  {"name": "postVitals", "label": "Vitals at Reaction (BP, Temp, Pulse)", "type": "text", "required": true},
  {"name": "bloodBankSampleReturned", "label": "Residual Unit & Post-Reaction Blood/Urine Returned to Lab", "type": "select", "options": ["Yes", "No"], "required": true},
  {"name": "investigatingScientist", "label": "Investigating Medical Laboratory Scientist", "type": "text", "required": true}
]'::jsonb, 18, NOW() - INTERVAL '40 days', NOW()),

('FRM-05', 'Staff Grievance & Workplace Safety Reporting Template', 'Confidential staff submission for occupational safety, needle-stick incidents, equipment hazards, and workplace grievances.', 'Administration', 'Tunde Fashola', '1.0', 'PUBLISHED', 6, '[
  {"name": "staffName", "label": "Staff Name (or Confidential/Anonymous)", "type": "text", "required": true},
  {"name": "staffRole", "label": "Designation / Department", "type": "text", "required": true},
  {"name": "incidentCategory", "label": "Grievance / Hazard Category", "type": "select", "options": ["Biological Hazard / Needle-Stick", "Physical Safety Hazard", "Workplace Harassment", "Scheduling / Overwork Disparity", "Facility Maintenance Defect"], "required": true},
  {"name": "incidentDate", "label": "Date Observed", "type": "date", "required": true},
  {"name": "description", "label": "Factual Narrative of the Issue", "type": "textarea", "required": true},
  {"name": "suggestedRemedy", "label": "Recommended Corrective Measure", "type": "textarea", "required": false}
]'::jsonb, 11, NOW() - INTERVAL '25 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Digital Form Submissions (Sample Live Data)
INSERT INTO dms_form_submissions (id, form_id, submitted_by, department, submission_data, created_at)
VALUES
('SUB-101', 'FRM-01', 'Pharm. Chinedu Eze', 'Pharmacy', '{"patientName": "Grace Chukwu", "patientHospitalNo": "FFM-2026-0819", "suspectedDrug": "Ceftriaxone 1g IV", "batchNumber": "CFT-26B-991", "reactionDate": "2026-10-18", "reactionSeverity": "Moderate", "symptomsObserved": "Urticaria, facial flushing, and mild wheezing 10 mins post-infusion.", "actionTaken": "Infusion ceased instantly. IV Hydrocortisone 100mg and Promethazine 25mg administered.", "outcome": "Recovered Fully", "reporterName": "Pharm. Chinedu Eze", "reporterDesignation": "Senior Clinical Pharmacist", "nafdacReported": "Yes"}'::jsonb, NOW() - INTERVAL '8 days'),

('SUB-102', 'FRM-02', 'Staff Nurse Ngozi Adeyemi', 'Maternity', '{"incidentDate": "2026-10-21 03:30", "wardDepartment": "Maternity", "incidentType": "Equipment Malfunction", "incidentSummary": "Cardiotocograph (CTG) display flickering intermittently during active labor second stage.", "immediateHarm": "No Harm", "correctiveMeasures": "Secondary CTG machine swapped from Special Care Baby Unit (SCBU). Biomedical engineering ticket opened.", "witnesses": "Dr. Fatima Aliyu, Nurse Gloria", "reportedBy": "Staff Nurse Ngozi Adeyemi"}'::jsonb, NOW() - INTERVAL '5 days'),

('SUB-103', 'FRM-03', 'Dr. Emeka Obi', 'Operating Theatre', '{"patientId": "FFM-2026-1402", "confirmedIdentity": "Yes", "surgicalSiteMarked": "Yes", "anaesthesiaCheckComplete": "Yes", "pulseOximeterFunctioning": "Yes", "knownAllergies": "Penicillin (rash)", "difficultAirwayRisk": "No", "bloodLossRisk": "Yes (2 Units Crossmatched)", "leadSurgeon": "Dr. Emeka Obi", "anaesthetist": "Dr. S. Kalu", "scrubNurse": "Nurse Blessing", "swabInstrumentCount": "Count Verified", "specimenLabeled": "Yes", "equipmentProblems": "None", "recoveryKeyConcerns": "Monitor vitals q15m for 2 hours. Keep drain patent."}'::jsonb, NOW() - INTERVAL '3 days'),

('SUB-104', 'FRM-04', 'Lab Sci. Ibrahim Garba', 'Laboratory', '{"patientName": "Emeka Nnamani", "donorUnitNo": "BB-EN-2026-4401", "bloodGroup": "O Rh(D) Positive", "transfusionStartTime": "2026-10-24 14:00", "reactionStartTime": "2026-10-24 14:25", "symptoms": "Rigors, sudden fever spike to 39.2C, no chest tightness or haemoglobinuria.", "preVitals": "BP 120/75, Temp 36.8C, Pulse 78", "postVitals": "BP 130/80, Temp 39.2C, Pulse 108", "bloodBankSampleReturned": "Yes", "investigatingScientist": "Lab Sci. Ibrahim Garba"}'::jsonb, NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Workflows
INSERT INTO dms_workflows (id, doc_id, doc_name, stage, status, assignee, comments, review_notes, date_initiated, date_completed, created_at, updated_at)
VALUES
('WF-7721', 'DOC-001', 'Clinical SOP for Antenatal & High-Risk Obstetric Care', 'MEDICAL_DIRECTOR_REVIEW', 'APPROVED', 'Medical Director', 'Clinical obstetric guidelines approved for implementation across all maternity wards.', 'Validated against Federal Ministry of Health secondary hospital quality standards.', NOW() - INTERVAL '118 days', NOW() - INTERVAL '115 days', NOW() - INTERVAL '118 days', NOW() - INTERVAL '115 days'),

('WF-7722', 'DOC-002', 'Vendor Supply Agreement - Emzor Pharmaceutical Industries Ltd', 'LEGAL_REVIEW', 'APPROVED', 'Legal Counsel', 'Liability clauses and indemnity provisions verified. Compliant with Public Procurement Act.', 'Pricing matrix locked for 12 months with quarterly price stability guarantees.', NOW() - INTERVAL '94 days', NOW() - INTERVAL '91 days', NOW() - INTERVAL '94 days', NOW() - INTERVAL '91 days'),

('WF-7723', 'DOC-006', 'Radiology Radiation Safety & PACS Machine Maintenance Schedule', 'QA_OFFICER_REVIEW', 'PENDING_APPROVAL', 'Quality Assurance Officer', 'Pending dosimeter calibration certificate and NNRA licensing inspection report.', NULL, NOW() - INTERVAL '12 days', NULL, NOW() - INTERVAL '12 days', NOW()),

('WF-7724', 'DOC-007', 'Mortuary Deceased Custody & Autopsy Chain-of-Custody Register', 'MEDICAL_DIRECTOR_REVIEW', 'PENDING_APPROVAL', 'Medical Director', 'Reviewing biohazard protocol for high-risk communicable disease cadavers.', NULL, NOW() - INTERVAL '6 days', NULL, NOW() - INTERVAL '6 days', NOW()),

('WF-7725', 'DOC-008', 'Emergency Resuscitation & Code Blue Triage Manual', 'BISHOP_CONSENT', 'PENDING_APPROVAL', 'Hospital Administrator', 'Presented for final executive council administrative endorsement and budget allocation.', NULL, NOW() - INTERVAL '4 days', NULL, NOW() - INTERVAL '4 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Electronic Signatures
INSERT INTO dms_signatures (id, doc_id, doc_name, workflow_id, signer, role, timestamp, hash, certificate_details, created_at)
VALUES
('SIG-881', 'DOC-001', 'Clinical SOP for Antenatal & High-Risk Obstetric Care', 'WF-7721', 'Dr. Fatima Aliyu', 'Chief Medical Officer', NOW() - INTERVAL '115 days', 'SHA256:d8a2bc918a28eef9213efc123a48e833f48a129d2b77c10928aee902bf8912aa', 'X.509 v3 Certificate · CN=Faith Foundation Hospital CA · Serial: 0x44A992', NOW() - INTERVAL '115 days'),

('SIG-882', 'DOC-002', 'Vendor Supply Agreement - Emzor Pharmaceutical Industries Ltd', 'WF-7722', 'Tunde Fashola', 'Hospital Administrator', NOW() - INTERVAL '91 days', 'SHA256:bb192a01f987cc2218c3ef9921bda102c918a2ee99812bc8172da0182662c901', 'X.509 v3 Certificate · CN=Faith Foundation Hospital CA · Serial: 0x77B118', NOW() - INTERVAL '91 days'),

('SIG-883', 'DOC-003', 'Informed Consent Form for Major Surgery & General Anaesthesia', NULL, 'Dr. Emeka Obi', 'Head of Surgery', NOW() - INTERVAL '58 days', 'SHA256:99a81c720198de772615bc0981aef8821903ba71829cd88192a0182bc8192731', 'X.509 v3 Certificate · CN=Faith Foundation Hospital CA · Serial: 0x12F883', NOW() - INTERVAL '58 days'),

('SIG-884', 'DOC-004', 'Hospital Infection Prevention & Control (IPC) Protocol 2026', NULL, 'Nurse Ngozi Adeyemi', 'Chief Nursing Officer', NOW() - INTERVAL '44 days', 'SHA256:77cd1028bc991a0298eef71628ca9910283bd77182a09182bc9918273645a812', 'X.509 v3 Certificate · CN=Faith Foundation Hospital CA · Serial: 0x99C441', NOW() - INTERVAL '44 days'),

('SIG-885', 'DOC-005', 'NHIS & Managed Care HMO Treatment Authorization Guidelines', NULL, 'Chioma Okonkwo', 'HMO Relations Lead', NOW() - INTERVAL '29 days', 'SHA256:44b91028c881726a90182fec9182aa09182bc9918273645a8129038ba71829cd', 'X.509 v3 Certificate · CN=Faith Foundation Hospital CA · Serial: 0x55E901', NOW() - INTERVAL '29 days')
ON CONFLICT (id) DO NOTHING;
