import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating NMRS tables in PostgreSQL...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS nmrs_configs (
      id VARCHAR(255) PRIMARY KEY,
      openmrs_base_url VARCHAR(255) NOT NULL DEFAULT 'http://localhost:8080/openmrs',
      openmrs_username VARCHAR(255) NOT NULL DEFAULT 'admin',
      openmrs_password VARCHAR(255) NOT NULL DEFAULT 'Admin123',
      facility_name VARCHAR(255) NOT NULL DEFAULT 'Faith Foundation Specialist Hospital',
      facility_datim_code VARCHAR(255) NOT NULL DEFAULT 'DATIM-NIG-7821',
      state_name VARCHAR(255) NOT NULL DEFAULT 'Benue',
      lga_name VARCHAR(255) NOT NULL DEFAULT 'Makurdi',
      auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
      ndr_version VARCHAR(255) NOT NULL DEFAULT '1.6',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS nmrs_patient_mappings (
      id VARCHAR(255) PRIMARY KEY,
      patient_id VARCHAR(255) UNIQUE NOT NULL,
      openmrs_uuid VARCHAR(255) UNIQUE,
      pepfar_id VARCHAR(255) UNIQUE,
      hospital_number VARCHAR(255),
      national_id VARCHAR(255),
      enrollment_date TIMESTAMP(3),
      art_start_date TIMESTAMP(3),
      current_regimen VARCHAR(255),
      last_viral_load DECIMAL(10,2),
      last_vl_date TIMESTAMP(3),
      last_cd4_count DECIMAL(10,2),
      sync_status VARCHAR(255) NOT NULL DEFAULT 'SYNCED',
      last_synced_at TIMESTAMP(3),
      error_message TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_nmrs_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS nmrs_form_schemas (
      id VARCHAR(255) PRIMARY KEY,
      form_code VARCHAR(255) UNIQUE NOT NULL,
      form_name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(255) NOT NULL DEFAULT 'HIV_PROGRAM',
      version VARCHAR(255) NOT NULL DEFAULT '1.0.0',
      openmrs_form_uuid VARCHAR(255),
      schema_json JSONB NOT NULL DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS nmrs_encounter_records (
      id VARCHAR(255) PRIMARY KEY,
      encounter_number VARCHAR(255) UNIQUE NOT NULL,
      patient_id VARCHAR(255) NOT NULL,
      form_schema_id VARCHAR(255) NOT NULL,
      encounter_type VARCHAR(255) NOT NULL,
      encounter_date TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      clinician_name VARCHAR(255),
      clinician_id VARCHAR(255),
      form_data JSONB NOT NULL DEFAULT '{}',
      openmrs_encounter_uuid VARCHAR(255),
      sync_status VARCHAR(255) NOT NULL DEFAULT 'SYNCED',
      synced_at TIMESTAMP(3),
      sync_error TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_nmrs_enc_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      CONSTRAINT fk_nmrs_enc_schema FOREIGN KEY (form_schema_id) REFERENCES nmrs_form_schemas(id) ON DELETE RESTRICT
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS nmrs_concept_maps (
      id VARCHAR(255) PRIMARY KEY,
      local_concept_key VARCHAR(255) UNIQUE NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      ciel_concept_id INT NOT NULL,
      openmrs_uuid VARCHAR(255),
      datatype VARCHAR(255) NOT NULL DEFAULT 'Numeric',
      category VARCHAR(255) NOT NULL DEFAULT 'GENERAL',
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS nmrs_sync_queues (
      id VARCHAR(255) PRIMARY KEY,
      job_type VARCHAR(255) NOT NULL,
      entity_type VARCHAR(255) NOT NULL,
      entity_id VARCHAR(255) NOT NULL,
      patient_id VARCHAR(255),
      status VARCHAR(255) NOT NULL DEFAULT 'PENDING',
      payload JSONB NOT NULL DEFAULT '{}',
      response_payload JSONB,
      retry_count INT NOT NULL DEFAULT 0,
      max_retries INT NOT NULL DEFAULT 3,
      error_message TEXT,
      processed_at TIMESTAMP(3),
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default config if not exists
  const existingConfig = await prisma.nmrsConfig.findFirst();
  if (!existingConfig) {
    await prisma.nmrsConfig.create({
      data: {
        openmrsBaseUrl: 'http://localhost:8080/openmrs',
        openmrsUsername: 'admin',
        openmrsPassword: 'Admin123',
        facilityName: 'Faith Foundation Specialist Hospital',
        facilityDATIMCode: 'DATIM-NIG-7821',
        stateName: 'Benue',
        lgaName: 'Makurdi',
        autoSyncEnabled: true,
        ndrVersion: '1.6',
        isActive: true
      }
    });
    console.log('✓ Default NMRS config created');
  }

  // Insert standard NMRS schemas if none exist
  const existingSchema = await prisma.nmrsFormSchema.findFirst();
  if (!existingSchema) {
    await prisma.nmrsFormSchema.createMany({
      data: [
        {
          formCode: 'CARE_CARD',
          formName: 'HIV Care and Treatment Follow-up (Care Card)',
          description: 'Routine follow-up clinical encounter capturing WHO stage, TB status, ARV adherence, BMI, and vital signs.',
          category: 'HIV_PROGRAM',
          version: '1.2.0',
          schemaJson: {
            title: 'HIV Care and Treatment Follow-up Form',
            sections: [
              {
                id: 'clinical_vitals',
                title: 'Clinical Evaluation & Vitals',
                questions: [
                  { id: 'encounterDate', label: 'Encounter Date', type: 'date', required: true },
                  { id: 'visitType', label: 'Visit Type', type: 'select', options: [{ label: 'Scheduled Follow-up', value: 'SCHEDULED' }, { label: 'Unscheduled / Acute', value: 'UNSCHEDULED' }, { label: 'Emergency', value: 'EMERGENCY' }], required: true },
                  { id: 'weight', label: 'Weight (kg)', type: 'number', required: true },
                  { id: 'height', label: 'Height (cm)', type: 'number', required: true },
                  { id: 'bloodPressure', label: 'Blood Pressure (mmHg)', type: 'text', helperText: 'e.g. 120/80' },
                  { id: 'functionalStatus', label: 'Functional Status', type: 'select', options: [{ label: 'Working', value: 'WORKING' }, { label: 'Ambulatory', value: 'AMBULATORY' }, { label: 'Bedridden', value: 'BEDRIDDEN' }] },
                  { id: 'whoClinicalStage', label: 'WHO Clinical Stage', type: 'select', options: [{ label: 'Stage 1 (Asymptomatic)', value: 'STAGE_1' }, { label: 'Stage 2 (Mild Symptoms)', value: 'STAGE_2' }, { label: 'Stage 3 (Advanced)', value: 'STAGE_3' }, { label: 'Stage 4 (Severe / AIDS)', value: 'STAGE_4' }], required: true },
                  { id: 'tbStatus', label: 'TB Screening Status', type: 'select', options: [{ label: 'No Signs / Symptoms', value: 'NO_SIGNS' }, { label: 'TB Suspected / Presumptive', value: 'PRESUMPTIVE' }, { label: 'Currently on TB Treatment', value: 'ON_TB_TX' }, { label: 'TB Completed', value: 'COMPLETED' }], required: true }
                ]
              },
              {
                id: 'treatment_monitoring',
                title: 'ARV Treatment & Regimen',
                questions: [
                  { id: 'currentArvRegimen', label: 'Current ARV Regimen', type: 'select', options: [{ label: '1a: TDF + 3TC + DTG', value: '1a' }, { label: '1b: TDF + 3TC + EFV', value: '1b' }, { label: '1c: AZT + 3TC + NVP', value: '1c' }, { label: '2a: AZT + 3TC + ATV/r', value: '2a' }, { label: '2b: TDF + 3TC + LPV/r', value: '2b' }, { label: '3a: DRV/r + DTG + 2 NRTIs', value: '3a' }], required: true },
                  { id: 'arvAdherenceRate', label: 'ARV Adherence Level', type: 'select', options: [{ label: 'Good (≥95% adherence)', value: 'GOOD' }, { label: 'Fair (85-94% adherence)', value: 'FAIR' }, { label: 'Poor (<85% adherence)', value: 'POOR' }], required: true },
                  { id: 'cotrimoxazolePrescribed', label: 'Cotrimoxazole (CTX) Prescribed', type: 'radio', options: [{ label: 'Yes', value: 'YES' }, { label: 'No', value: 'NO' }] },
                  { id: 'viralLoadValue', label: 'Latest Viral Load (copies/mL)', type: 'number', helperText: 'Enter 0 for Target Not Detected (<20 cp/mL)' },
                  { id: 'cd4Value', label: 'Latest CD4 Count (cells/µL)', type: 'number' },
                  { id: 'nextAppointmentDate', label: 'Next Clinic Appointment Date', type: 'date' }
                ]
              }
            ]
          }
        },
        {
          formCode: 'ADULT_INITIAL_EVALUATION',
          formName: 'Adult Initial Clinical Evaluation',
          description: 'Baseline clinical assessment at enrollment into HIV comprehensive care.',
          category: 'HIV_PROGRAM',
          version: '1.0.0',
          schemaJson: {
            title: 'Adult Initial Clinical Evaluation',
            sections: [
              {
                id: 'baseline_intake',
                title: 'Enrollment & Entry Point',
                questions: [
                  { id: 'entryPoint', label: 'Entry Point / Service Area', type: 'select', options: [{ label: 'OPD / General Outpatient', value: 'OPD' }, { label: 'Inpatient Ward', value: 'IPD' }, { label: 'TB DOTS Clinic', value: 'TB_DOTS' }, { label: 'PMTCT / ANC', value: 'PMTCT' }, { label: 'Voluntary Counseling & Testing (VCT)', value: 'VCT' }, { label: 'Community Outpatient Outreach', value: 'COMMUNITY' }], required: true },
                  { id: 'priorArvExposure', label: 'Prior ARV Exposure', type: 'radio', options: [{ label: 'ARV Naive (Never Exposed)', value: 'NAIVE' }, { label: 'Prior PMTCT Exposure', value: 'PMTCT_ONLY' }, { label: 'Transferred-In on ART', value: 'TRANSFER_IN' }] },
                  { id: 'baselineCd4', label: 'Baseline CD4 Count (cells/µL)', type: 'number' },
                  { id: 'baselineViralLoad', label: 'Baseline Viral Load (copies/mL)', type: 'number' },
                  { id: 'baselineWhoStage', label: 'Baseline WHO Stage', type: 'select', options: [{ label: 'Stage 1', value: 'STAGE_1' }, { label: 'Stage 2', value: 'STAGE_2' }, { label: 'Stage 3', value: 'STAGE_3' }, { label: 'Stage 4', value: 'STAGE_4' }], required: true }
                ]
              }
            ]
          }
        },
        {
          formCode: 'PHARMACY_ORDER_MMD',
          formName: 'ARV Pharmacy Order & Multi-Month Dispensing (MMD)',
          description: 'Pharmacy dispensing record with multi-month dispensing intervals (1M, 2M, 3M, 6M).',
          category: 'PHARMACY',
          version: '1.1.0',
          schemaJson: {
            title: 'ARV Pharmacy Dispensing Log',
            sections: [
              {
                id: 'dispensing_details',
                title: 'Multi-Month Dispensing & Drug Pick-up',
                questions: [
                  { id: 'dispenseDate', label: 'Dispense Date', type: 'date', required: true },
                  { id: 'dispenseInterval', label: 'Dispense Duration (MMD)', type: 'select', options: [{ label: '1 Month Dispensing (1MD)', value: '1MD' }, { label: '2 Months Dispensing (2MD)', value: '2MD' }, { label: '3 Months Dispensing (3MD)', value: '3MD' }, { label: '6 Months Multi-Month Dispensing (6MMD)', value: '6MMD' }], required: true },
                  { id: 'prescribedRegimen', label: 'Dispensed Regimen', type: 'select', options: [{ label: '1a: TDF + 3TC + DTG (30 tabs/bottle)', value: '1a' }, { label: '1b: TDF + 3TC + EFV', value: '1b' }, { label: '2a: AZT + 3TC + ATV/r', value: '2a' }], required: true },
                  { id: 'bottlesDispensed', label: 'Number of Bottles Dispensed', type: 'number', required: true },
                  { id: 'ctxPillsDispensed', label: 'Cotrimoxazole (CTX) Tablets Dispensed', type: 'number' },
                  { id: 'nextRefillDate', label: 'Next Refill Date', type: 'date', required: true }
                ]
              }
            ]
          }
        },
        {
          formCode: 'LAB_ORDER_VIRAL_LOAD',
          formName: 'HIV Laboratory Order & Viral Load Results',
          description: 'Laboratory requisition and result entry for Viral Load, CD4, Chemistry, and Hematology.',
          category: 'LABORATORY',
          version: '1.0.0',
          schemaJson: {
            title: 'HIV Laboratory Requisition',
            sections: [
              {
                id: 'lab_specimen',
                title: 'Specimen & Test Indication',
                questions: [
                  { id: 'sampleCollectionDate', label: 'Sample Collection Date', type: 'date', required: true },
                  { id: 'testIndication', label: 'Viral Load Test Indication', type: 'select', options: [{ label: 'Routine 6-Month VL', value: 'ROUTINE_6M' }, { label: 'Routine 12-Month VL', value: 'ROUTINE_12M' }, { label: 'Routine Annual Follow-up', value: 'ANNUAL' }, { label: 'Suspected Clinical / Immunological Failure', value: 'SUSPECTED_FAILURE' }, { label: 'Repeat Confirmatory VL (Post-EAC)', value: 'REPEAT_CONFIRMATORY' }], required: true },
                  { id: 'sampleType', label: 'Sample Specimen Type', type: 'select', options: [{ label: 'Plasma (EDTA Tube)', value: 'PLASMA' }, { label: 'DBS (Dried Blood Spot)', value: 'DBS' }] },
                  { id: 'viralLoadResult', label: 'Quantitative Viral Load (copies/mL)', type: 'number', required: true, helperText: 'Enter 0 if Target Not Detected (<20 cp/mL)' },
                  { id: 'labRemarks', label: 'Laboratory Scientist Remarks', type: 'textarea' }
                ]
              }
            ]
          }
        }
      ]
    });
    console.log('✓ Standard NMRS Form Schemas created');
  }

  console.log('✓ NMRS PostgreSQL tables & initial seeds ready!');
}

main()
  .catch(e => {
    console.error('Error creating NMRS tables:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
