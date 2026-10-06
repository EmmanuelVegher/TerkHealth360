// Comprehensive National JSON Form Schemas matching Nigeria NMRS / OpenMRS clob_datatype_storage specifications

export interface FormQuestionSchema {
  id: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'radio' | 'date' | 'textarea' | 'checkbox' | 'obs' | 'control' | 'patientIdentifier' | 'obsGroup';
  conceptId?: number;
  required?: boolean;
  readonly?: boolean;
  options?: Array<{ label: string; value: string | number; conceptId?: number }>;
  helperText?: string;
  defaultValue?: any;
  dependsOn?: {
    fieldId: string;
    equals: any;
  };
  questionOptions?: {
    rendering?: 'text' | 'number' | 'select' | 'radio' | 'date' | 'textarea' | 'checkbox' | 'drug' | 'problem';
    concept?: string | number;
    answers?: Array<{ label: string; concept: string | number }>;
    calculate?: { calculateExpression?: string };
    identifierType?: string;
  };
  validators?: Array<{ type?: string; allowFutureDates?: string; min?: number; max?: number }>;
  questions?: FormQuestionSchema[]; // for obsGroup
}

export interface FormSectionSchema {
  id: string;
  title: string;
  label?: string;
  description?: string;
  isExpanded?: boolean;
  hide?: { hideWhenExpression?: string };
  questions: FormQuestionSchema[];
}

export interface FormPageSchema {
  label: string;
  sections: FormSectionSchema[];
}

export interface FormSchemaDefinition {
  formCode: string;
  formName: string;
  description: string;
  category: 'HIV_PROGRAM' | 'TB_PROGRAM' | 'LAB' | 'PHARMACY' | 'PMTCT_ANC' | 'HTS_TESTING' | 'PREP_PEP' | 'CARE_SUPPORT';
  version: string;
  openmrsFormUuid?: string;
  pages: FormPageSchema[];
  sections: FormSectionSchema[];
}

// ── 1. Care Card Master (HIV Care Initiation & Discontinuation) ───────────────
const CARE_CARD_MASTER: FormSchemaDefinition = {
  formCode: 'CARE_CARD',
  formName: 'Care Card (Master HIV Care & Treatment Form)',
  description: 'Official National HIV Care Initiation, Follow-up & Discontinuation Form (AmpathJsonSchema CLOB).',
  category: 'HIV_PROGRAM',
  version: '2.4.0',
  openmrsFormUuid: '5d522e63-463e-4a9f-a2c1-7ebbe4069a49',
  pages: [
    {
      label: 'CARE CARD PAGE 1: Initial Visit & Baseline Status',
      sections: [
        {
          id: 'initial_visit_header',
          title: 'Initial Visit & Patient Identifiers',
          label: 'Initial Visit & Patient Identifiers',
          description: 'Client National Unique Identifiers and Enrollment Information',
          questions: [
            {
              id: 'art_number',
              label: 'PEPFAR Unique ID / ART Number (Identifier Type 4)',
              type: 'patientIdentifier',
              required: true,
              helperText: 'National ART Identification Number',
              questionOptions: {
                rendering: 'text',
                identifierType: 'c82916e4-168c-495f-8ed0-b1b286c30a05'
              }
            },
            {
              id: 'hospital_number',
              label: 'Hospital Unit Number',
              type: 'control',
              helperText: 'Internal Hospital Record Number',
              questionOptions: { rendering: 'text' }
            },
            {
              id: 'dateEnrolledInCare',
              label: 'Date Enrolled in HIV Care',
              type: 'control',
              required: true,
              questionOptions: { rendering: 'date' }
            },
            {
              id: 'facilityName',
              label: 'Enrolling Facility',
              type: 'control',
              defaultValue: 'Faith Foundation Specialist Hospital',
              questionOptions: { rendering: 'text' }
            },
            {
              id: 'sex',
              label: 'Sex',
              type: 'control',
              readonly: true,
              questionOptions: {
                rendering: 'select',
                answers: [
                  { label: 'Male', concept: '1530' },
                  { label: 'Female', concept: '1531' }
                ]
              }
            },
            {
              id: 'patient_age',
              label: 'Age at Enrollment (Years)',
              type: 'control',
              readonly: true,
              questionOptions: { rendering: 'number' }
            }
          ]
        },
        {
          id: 'entry_point_section',
          title: 'Entry Point & Mode of Exposure',
          label: 'Entry Point & Mode of Exposure',
          questions: [
            {
              id: 'entryPoint',
              label: 'HIV Care Entry Point',
              type: 'obs',
              required: true,
              conceptId: 160540,
              questionOptions: {
                rendering: 'select',
                concept: '160540',
                answers: [
                  { label: 'OPD (Outpatient Department)', concept: '160542' },
                  { label: 'In-patient Ward', concept: '160538' },
                  { label: 'HTS / Standalone VCT', concept: '160539' },
                  { label: 'PMTCT / Antenatal Care', concept: '160536' },
                  { label: 'TB DOTS Clinic', concept: '160541' },
                  { label: 'Transfer in with Records', concept: '160563' },
                  { label: 'Community Outreaches / Index Case Testing', concept: '160543' }
                ]
              }
            },
            {
              id: 'modeOfExposure',
              label: 'Probable Mode of HIV Exposure',
              type: 'obs',
              conceptId: 160581,
              questionOptions: {
                rendering: 'radio',
                concept: '160581',
                answers: [
                  { label: 'Heterosexual Transmission', concept: '160578' },
                  { label: 'Mother-to-Child (MTCT / Vertical)', concept: '160579' },
                  { label: 'Blood Transfusion', concept: '160580' },
                  { label: 'Occupational Needle-stick', concept: '160582' },
                  { label: 'Other / Unknown', concept: '5622' }
                ]
              }
            }
          ]
        },
        {
          id: 'baseline_clinical_status',
          title: 'Baseline Clinical Evaluation',
          label: 'Baseline Clinical Evaluation',
          description: 'Baseline physical assessment, WHO stage, and functional performance',
          questions: [
            {
              id: 'weight',
              label: 'Weight (kg)',
              type: 'obs',
              required: true,
              conceptId: 5089,
              questionOptions: { rendering: 'number', concept: '5089' }
            },
            {
              id: 'height',
              label: 'Height (cm)',
              type: 'obs',
              conceptId: 5090,
              questionOptions: { rendering: 'number', concept: '5090' }
            },
            {
              id: 'bp_systolic',
              label: 'Systolic Blood Pressure (mmHg)',
              type: 'obs',
              conceptId: 5085,
              questionOptions: { rendering: 'number', concept: '5085' }
            },
            {
              id: 'bp_diastolic',
              label: 'Diastolic Blood Pressure (mmHg)',
              type: 'obs',
              conceptId: 5086,
              questionOptions: { rendering: 'number', concept: '5086' }
            },
            {
              id: 'whoClinicalStage',
              label: 'Baseline WHO Clinical Stage',
              type: 'obs',
              required: true,
              conceptId: 5356,
              questionOptions: {
                rendering: 'select',
                concept: '5356',
                answers: [
                  { label: 'Stage 1 (Asymptomatic)', concept: '1204' },
                  { label: 'Stage 2 (Mild Symptoms, Minor Mucocutaneous)', concept: '1205' },
                  { label: 'Stage 3 (Advanced Symptoms, Weight Loss, Candidiasis)', concept: '1206' },
                  { label: 'Stage 4 (Severe Symptoms, AIDS-defining illness)', concept: '1207' }
                ]
              }
            },
            {
              id: 'functionalStatus',
              label: 'Functional Performance Status',
              type: 'obs',
              required: true,
              conceptId: 1658,
              questionOptions: {
                rendering: 'radio',
                concept: '1658',
                answers: [
                  { label: 'Working (Performs daily activities without impairment)', concept: '159468' },
                  { label: 'Ambulatory (Able to perform personal ADLs, unable to work)', concept: '159467' },
                  { label: 'Bedridden (Confined to bed >50% of the time)', concept: '160432' }
                ]
              }
            }
          ]
        }
      ]
    },
    {
      label: 'CARE CARD PAGE 2: ART Initiation & Treatment Plan',
      sections: [
        {
          id: 'art_initiation_section',
          title: 'ART Commencement & Regimen Selection',
          label: 'ART Commencement & Regimen Selection',
          questions: [
            {
              id: 'artStartDate',
              label: 'ART Start / Commencement Date',
              type: 'obs',
              required: true,
              conceptId: 159599,
              questionOptions: { rendering: 'date', concept: '159599' }
            },
            {
              id: 'firstLineRegimen',
              label: 'Prescribed First-Line ARV Regimen',
              type: 'obs',
              required: true,
              conceptId: 164506,
              questionOptions: {
                rendering: 'select',
                concept: '164506',
                answers: [
                  { label: '1a: TDF + 3TC + DTG (Tenofovir + Lamivudine + Dolutegravir)', concept: '165681' },
                  { label: '1b: TDF + 3TC + EFV400 (Tenofovir + Lamivudine + Efavirenz)', concept: '165682' },
                  { label: '1c: AZT + 3TC + DTG (Zidovudine + Lamivudine + Dolutegravir)', concept: '165686' },
                  { label: '1d: ABC + 3TC + DTG (Abacavir + Lamivudine + Dolutegravir)', concept: '165687' },
                  { label: '2a: AZT + 3TC + ATV/r (Zidovudine + Lamivudine + Atazanavir/r)', concept: '165688' },
                  { label: '2b: TDF + 3TC + LPV/r (Tenofovir + Lamivudine + Lopinavir/r)', concept: '165690' },
                  { label: '3a: DRV/r + DTG + 2 NRTIs (Third-Line Salvage)', concept: '165691' }
                ]
              }
            },
            {
              id: 'baselineCd4',
              label: 'Baseline CD4 Count (cells/µL)',
              type: 'obs',
              conceptId: 5497,
              questionOptions: { rendering: 'number', concept: '5497' }
            },
            {
              id: 'baselineViralLoad',
              label: 'Baseline Viral Load (copies/mL)',
              type: 'obs',
              conceptId: 856,
              helperText: '0 for Undetectable (<20 cp/mL)',
              questionOptions: { rendering: 'number', concept: '856' }
            }
          ]
        },
        {
          id: 'tb_screening_prophylaxis',
          title: 'TB Screening & Preventive Therapy (TPT)',
          label: 'TB Screening & Preventive Therapy (TPT)',
          questions: [
            {
              id: 'tbStatus',
              label: 'TB Screening Result',
              type: 'obs',
              required: true,
              conceptId: 1659,
              questionOptions: {
                rendering: 'select',
                concept: '1659',
                answers: [
                  { label: 'No Signs or Symptoms of TB', concept: '1660' },
                  { label: 'Presumptive TB (Cough, Night Sweats, Weight Loss)', concept: '142177' },
                  { label: 'Confirmed TB — On Anti-TB Treatment', concept: '1661' },
                  { label: 'TB Treatment Completed / Cured', concept: '1663' }
                ]
              }
            },
            {
              id: 'iptStatus',
              label: 'Isoniazid Preventive Therapy (IPT / TPT) Status',
              type: 'obs',
              conceptId: 165275,
              questionOptions: {
                rendering: 'radio',
                concept: '165275',
                answers: [
                  { label: 'Not Initiated', concept: '165276' },
                  { label: 'Currently on 3HP / 6H TPT', concept: '165277' },
                  { label: 'Completed TPT Course', concept: '165278' },
                  { label: 'Contraindicated / Discontinued', concept: '165279' }
                ]
              }
            },
            {
              id: 'cotrimoxazole',
              label: 'Cotrimoxazole (CTX) Prophylaxis',
              type: 'obs',
              conceptId: 160533,
              questionOptions: {
                rendering: 'radio',
                concept: '160533',
                answers: [
                  { label: 'Prescribed (960mg OD)', concept: '1065' },
                  { label: 'Not Prescribed / Discontinued', concept: '1066' }
                ]
              }
            },
            {
              id: 'nextAppointmentDate',
              label: 'Next Clinical Appointment / Refill Date',
              type: 'obs',
              required: true,
              conceptId: 5096,
              questionOptions: { rendering: 'date', concept: '5096' }
            }
          ]
        }
      ]
    }
  ],
  sections: []
};
CARE_CARD_MASTER.sections = CARE_CARD_MASTER.pages.flatMap(p => p.sections);

// ── 2. Care Card 1a - Initial Visit ──────────────────────────────────────────
const CARE_CARD_1A: FormSchemaDefinition = {
  formCode: 'CARE_CARD_1A',
  formName: 'Care Card 1a - Initial Visit',
  description: 'National initial clinical intake, demographics, and baseline evaluation.',
  category: 'HIV_PROGRAM',
  version: '1.2.0',
  openmrsFormUuid: 'e74bc9c8-b022-4876-bf32-20f728bd68c0',
  pages: [
    {
      label: 'Initial Visit Assessment',
      sections: [
        {
          id: 'intake_meta',
          title: 'Encounter Demographics & Identification',
          label: 'Encounter Demographics & Identification',
          questions: [
            {
              id: 'art_number',
              label: 'PEPFAR Unique ID / ART Number (Type 4)',
              type: 'patientIdentifier',
              required: true,
              questionOptions: { rendering: 'text', identifierType: 'c82916e4-168c-495f-8ed0-b1b286c30a05' }
            },
            {
              id: 'encounterDate',
              label: 'Encounter Date',
              type: 'control',
              required: true,
              questionOptions: { rendering: 'date' }
            },
            {
              id: 'entryPoint',
              label: 'HIV Entry Point',
              type: 'obs',
              conceptId: 160540,
              questionOptions: {
                rendering: 'select',
                concept: '160540',
                answers: [
                  { label: 'Outpatient Dept (OPD)', concept: '160542' },
                  { label: 'Inpatient (Ward)', concept: '160538' },
                  { label: 'HTS Clinic', concept: '160539' },
                  { label: 'ANC / PMTCT', concept: '160536' },
                  { label: 'TB DOTS', concept: '160541' },
                  { label: 'Transfer In', concept: '160563' }
                ]
              }
            }
          ]
        },
        {
          id: 'baseline_vitals',
          title: 'Physical Examination & Vitals',
          label: 'Physical Examination & Vitals',
          questions: [
            { id: 'weight', label: 'Weight (kg)', type: 'obs', conceptId: 5089, questionOptions: { rendering: 'number' } },
            { id: 'height', label: 'Height (cm)', type: 'obs', conceptId: 5090, questionOptions: { rendering: 'number' } },
            { id: 'bloodPressure', label: 'Blood Pressure (mmHg)', type: 'obs', conceptId: 5085, questionOptions: { rendering: 'text' } },
            { id: 'pulse', label: 'Pulse (bpm)', type: 'obs', conceptId: 5087, questionOptions: { rendering: 'number' } },
            { id: 'temperature', label: 'Temperature (°C)', type: 'obs', conceptId: 5088, questionOptions: { rendering: 'number' } }
          ]
        }
      ]
    }
  ],
  sections: []
};
CARE_CARD_1A.sections = CARE_CARD_1A.pages.flatMap(p => p.sections);

// ── 3. Care Card 1b - Enrollment and ART Commencement ────────────────────────
const CARE_CARD_1B: FormSchemaDefinition = {
  formCode: 'CARE_CARD_1B',
  formName: 'Care Card 1b - Enrollment and ART Commencement',
  description: 'National documentation of ART initiation, regimen prescription, and adherence counseling.',
  category: 'HIV_PROGRAM',
  version: '1.3.0',
  openmrsFormUuid: '7f3ccf29-c9ea-4e6b-9d68-63d78473b8e1',
  pages: [
    {
      label: 'ART Commencement',
      sections: [
        {
          id: 'commencement_details',
          title: 'Enrollment & Treatment Initiation',
          label: 'Enrollment & Treatment Initiation',
          questions: [
            {
              id: 'art_number',
              label: 'PEPFAR Unique ID / ART Number (Type 4)',
              type: 'patientIdentifier',
              required: true,
              questionOptions: { rendering: 'text', identifierType: 'c82916e4-168c-495f-8ed0-b1b286c30a05' }
            },
            {
              id: 'artStartDate',
              label: 'ART Start Date',
              type: 'obs',
              required: true,
              conceptId: 159599,
              questionOptions: { rendering: 'date', concept: '159599' }
            },
            {
              id: 'currentRegimen',
              label: 'Prescribed ARV Regimen',
              type: 'obs',
              required: true,
              conceptId: 164506,
              questionOptions: {
                rendering: 'select',
                concept: '164506',
                answers: [
                  { label: '1a: TDF + 3TC + DTG', concept: '165681' },
                  { label: '1b: TDF + 3TC + EFV400', concept: '165682' },
                  { label: '1c: AZT + 3TC + DTG', concept: '165686' },
                  { label: '2a: AZT + 3TC + ATV/r', concept: '165688' },
                  { label: '2b: TDF + 3TC + LPV/r', concept: '165690' }
                ]
              }
            },
            {
              id: 'cd4Count',
              label: 'CD4 Count at ART Start (cells/µL)',
              type: 'obs',
              conceptId: 5497,
              questionOptions: { rendering: 'number', concept: '5497' }
            }
          ]
        }
      ]
    }
  ],
  sections: []
};
CARE_CARD_1B.sections = CARE_CARD_1B.pages.flatMap(p => p.sections);

// ── 4. Care Card 2/3 - Follow-up Clinical Visits ──────────────────────────────
const CARE_CARD_2_3: FormSchemaDefinition = {
  formCode: 'CARE_CARD_2_3',
  formName: 'Care Card 2/3 - Follow-up Clinical Visits',
  description: 'Routine follow-up clinical encounter, clinical staging, TB screening, and drug pickup.',
  category: 'HIV_PROGRAM',
  version: '2.0.0',
  openmrsFormUuid: '5069f84c-ae43-4b40-9321-68f84264f7e1',
  pages: [
    {
      label: 'Follow-up Consultation',
      sections: [
        {
          id: 'followup_vitals',
          title: 'Triage & Clinical Monitoring',
          label: 'Triage & Clinical Monitoring',
          questions: [
            {
              id: 'encounterDate',
              label: 'Visit Date',
              type: 'control',
              required: true,
              questionOptions: { rendering: 'date' }
            },
            {
              id: 'weight',
              label: 'Current Weight (kg)',
              type: 'obs',
              required: true,
              conceptId: 5089,
              questionOptions: { rendering: 'number', concept: '5089' }
            },
            {
              id: 'whoClinicalStage',
              label: 'WHO Clinical Stage',
              type: 'obs',
              required: true,
              conceptId: 5356,
              questionOptions: {
                rendering: 'select',
                concept: '5356',
                answers: [
                  { label: 'Stage 1', concept: '1204' },
                  { label: 'Stage 2', concept: '1205' },
                  { label: 'Stage 3', concept: '1206' },
                  { label: 'Stage 4', concept: '1207' }
                ]
              }
            },
            {
              id: 'tbStatus',
              label: 'TB Screening Status',
              type: 'obs',
              required: true,
              conceptId: 1659,
              questionOptions: {
                rendering: 'select',
                concept: '1659',
                answers: [
                  { label: 'No Signs or Symptoms', concept: '1660' },
                  { label: 'Presumptive TB', concept: '142177' },
                  { label: 'On TB Treatment', concept: '1661' }
                ]
              }
            },
            {
              id: 'adherenceAssessment',
              label: 'ARV Medication Adherence',
              type: 'obs',
              required: true,
              conceptId: 165290,
              questionOptions: {
                rendering: 'radio',
                concept: '165290',
                answers: [
                  { label: 'Good (≥95% doses taken)', concept: '165291' },
                  { label: 'Fair (85 - 94% doses taken)', concept: '165292' },
                  { label: 'Poor (<85% doses taken)', concept: '165293' }
                ]
              }
            },
            {
              id: 'drugRefillMonths',
              label: 'Multi-Month Dispensing (MMD Refill Duration)',
              type: 'obs',
              conceptId: 165288,
              questionOptions: {
                rendering: 'select',
                concept: '165288',
                answers: [
                  { label: '1 Month Supply (30 Days)', concept: '1' },
                  { label: '2 Months Supply (60 Days)', concept: '2' },
                  { label: '3 Months Supply (90 Days - 3MMD)', concept: '3' },
                  { label: '6 Months Supply (180 Days - 6MMD)', concept: '6' }
                ]
              }
            },
            {
              id: 'nextRefillDate',
              label: 'Next Pharmacy Refill Date',
              type: 'obs',
              required: true,
              conceptId: 5096,
              questionOptions: { rendering: 'date', concept: '5096' }
            }
          ]
        }
      ]
    }
  ],
  sections: []
};
CARE_CARD_2_3.sections = CARE_CARD_2_3.pages.flatMap(p => p.sections);

// ── 5. Care Card 4b – Initial Clinical Evaluation ─────────────────────────────
const CARE_CARD_4B: FormSchemaDefinition = {
  formCode: 'CARE_CARD_4B',
  formName: 'Care Card 4b – Initial Clinical Evaluation',
  description: 'Detailed initial medical history, systems review, and past opportunistic infections.',
  category: 'HIV_PROGRAM',
  version: '2.1.0',
  openmrsFormUuid: 'b7ed264c-a702-4525-bf16-4a15139be4b8',
  pages: [
    {
      label: 'Initial Clinical Examination',
      sections: [
        {
          id: 'medical_history',
          title: 'Past Medical History & Review of Systems',
          label: 'Past Medical History & Review of Systems',
          questions: [
            {
              id: 'pastMedicalHistory',
              label: 'History of Prior Medical Illnesses',
              type: 'obs',
              conceptId: 160221,
              questionOptions: { rendering: 'textarea', concept: '160221' }
            },
            {
              id: 'priorArvExposure',
              label: 'Prior ARV Exposure',
              type: 'obs',
              conceptId: 160119,
              questionOptions: {
                rendering: 'radio',
                concept: '160119',
                answers: [
                  { label: 'ARV Naive (Never taken ARVs)', concept: '1066' },
                  { label: 'Prior PMTCT Exposure', concept: '165270' },
                  { label: 'Prior PEP / PrEP Exposure', concept: '165271' },
                  { label: 'Restarting ART after Interruption', concept: '165272' }
                ]
              }
            },
            {
              id: 'clinicalAssessmentNotes',
              label: 'Physician Clinical Findings & Assessment Summary',
              type: 'obs',
              conceptId: 160716,
              questionOptions: { rendering: 'textarea', concept: '160716' }
            }
          ]
        }
      ]
    }
  ],
  sections: []
};
CARE_CARD_4B.sections = CARE_CARD_4B.pages.flatMap(p => p.sections);

// ── 6. HIV Testing Services (HTS) Client Intake & Register ────────────────────
const HTS_REGISTER: FormSchemaDefinition = {
  formCode: 'HTS_REGISTER',
  formName: 'HIV Testing Services (HTS) Register',
  description: 'National HIV Testing Services intake, risk stratification, and confirmatory testing.',
  category: 'HTS_TESTING',
  version: '2.2.0',
  openmrsFormUuid: '58e1a7bf-0f01-4587-bdba-83b3ad3987fa',
  pages: [
    {
      label: 'HTS Client Intake',
      sections: [
        {
          id: 'hts_intake',
          title: 'Client Intake & Pre-Test Information',
          label: 'Client Intake & Pre-Test Information',
          questions: [
            { id: 'htsClientCode', label: 'HTS Client Code', type: 'control', required: true, questionOptions: { rendering: 'text' } },
            { id: 'testingDate', label: 'Date of HIV Test', type: 'control', required: true, questionOptions: { rendering: 'date' } },
            {
              id: 'testingSetting',
              label: 'Testing Setting / Modality',
              type: 'obs',
              conceptId: 165242,
              questionOptions: {
                rendering: 'select',
                concept: '165242',
                answers: [
                  { label: 'Facility: Inpatient Ward', concept: '165243' },
                  { label: 'Facility: Emergency Room', concept: '165244' },
                  { label: 'Facility: OPD Triage', concept: '165245' },
                  { label: 'Facility: ANC Clinic', concept: '165246' },
                  { label: 'Community: Index Case Testing', concept: '165247' },
                  { label: 'Community: Mobile Outreach', concept: '165248' }
                ]
              }
            },
            {
              id: 'screeningTestResult',
              label: 'Screening Rapid Test Result (Determine HIV-1/2)',
              type: 'obs',
              required: true,
              conceptId: 165249,
              questionOptions: {
                rendering: 'radio',
                concept: '165249',
                answers: [
                  { label: 'Reactive', concept: '703' },
                  { label: 'Non-Reactive', concept: '664' },
                  { label: 'Invalid', concept: '1326' }
                ]
              }
            },
            {
              id: 'confirmatoryTestResult',
              label: 'Confirmatory Test Result (Uni-Gold)',
              type: 'obs',
              conceptId: 165250,
              questionOptions: {
                rendering: 'radio',
                concept: '165250',
                answers: [
                  { label: 'Reactive', concept: '703' },
                  { label: 'Non-Reactive', concept: '664' }
                ]
              }
            },
            {
              id: 'finalHtsResult',
              label: 'Final HIV Status',
              type: 'obs',
              required: true,
              conceptId: 159427,
              questionOptions: {
                rendering: 'select',
                concept: '159427',
                answers: [
                  { label: 'HIV Positive', concept: '703' },
                  { label: 'HIV Negative', concept: '664' },
                  { label: 'HIV Inconclusive', concept: '1138' }
                ]
              }
            }
          ]
        }
      ]
    }
  ],
  sections: []
};
HTS_REGISTER.sections = HTS_REGISTER.pages.flatMap(p => p.sections);

// ── 6b. Official Client Intake Form (HTS / Demographics / Clinical Intake) ─────
const CLIENT_INTAKE_FORM: FormSchemaDefinition = {
  formCode: 'CLIENT_INTAKE_FORM',
  formName: 'Client intake form',
  description: 'National Client Intake, HIV Testing Services, Risk Assessment, and ART Linkage Form.',
  category: 'HTS_TESTING',
  version: '2.4.0',
  openmrsFormUuid: 'd8e48b11-9252-475a-939e-87a3cb245037',
  pages: [
    {
      label: 'Pre-Test Information & Demographics',
      sections: [
        {
          id: 'intake_meta',
          title: 'Facility & Encounter Details',
          label: 'Facility & Encounter Details',
          isExpanded: true,
          questions: [
            {
              id: 'encounterDate',
              label: 'Date of Intake / Encounter',
              type: 'date',
              required: true,
              defaultValue: new Date().toISOString().slice(0, 10),
              questionOptions: {
                rendering: 'date'
              }
            },
            {
              id: 'facilityName',
              label: 'Health Facility Name',
              type: 'control',
              defaultValue: 'Faith Foundation Specialist Hospital',
              questionOptions: {
                rendering: 'text'
              }
            },
            {
              id: 'testingPoint',
              label: 'Service Delivery / Testing Point',
              type: 'obs',
              conceptId: 165242,
              questionOptions: {
                rendering: 'select',
                concept: '165242',
                answers: [
                  { label: 'Outpatient Department (OPD)', concept: '165245' },
                  { label: 'Inpatient Ward / Admission', concept: '165243' },
                  { label: 'Emergency Room (ER)', concept: '165244' },
                  { label: 'Antenatal Care (ANC) / PMTCT', concept: '165246' },
                  { label: 'Tuberculosis DOTS Clinic', concept: '165251' },
                  { label: 'Community / Outreach Modality', concept: '165248' }
                ]
              }
            }
          ]
        },
        {
          id: 'client_demographics',
          title: 'Client Profile & Target Population',
          label: 'Client Profile & Target Population',
          isExpanded: true,
          questions: [
            {
              id: 'clientCode',
              label: 'Client Intake / HTS Identification Number',
              type: 'control',
              required: true,
              questionOptions: {
                rendering: 'text'
              }
            },
            {
              id: 'targetGroup',
              label: 'Target Population Group',
              type: 'obs',
              conceptId: 160581,
              questionOptions: {
                rendering: 'select',
                concept: '160581',
                answers: [
                  { label: 'General Population', concept: '160578' },
                  { label: 'Pregnant or Breastfeeding Woman', concept: '160580' },
                  { label: 'Adolescent and Young Person (10-24 yrs)', concept: '160582' },
                  { label: 'Key Population: Female Sex Worker (FSW)', concept: '160583' },
                  { label: 'Key Population: Men who have Sex with Men (MSM)', concept: '160584' },
                  { label: 'Key Population: People Who Inject Drugs (PWID)', concept: '160585' }
                ]
              }
            },
            {
              id: 'maritalStatus',
              label: 'Marital Status',
              type: 'obs',
              conceptId: 1054,
              questionOptions: {
                rendering: 'select',
                concept: '1054',
                answers: [
                  { label: 'Single / Never Married', concept: '1057' },
                  { label: 'Married / Cohabiting', concept: '5555' },
                  { label: 'Divorced / Separated', concept: '1058' },
                  { label: 'Widowed', concept: '1059' }
                ]
              }
            },
            {
              id: 'previousHivTest',
              label: 'Previous HIV Testing History',
              type: 'obs',
              conceptId: 165252,
              questionOptions: {
                rendering: 'radio',
                concept: '165252',
                answers: [
                  { label: 'Never Tested Before', concept: '165253' },
                  { label: 'Tested Negative (More than 3 months ago)', concept: '165254' },
                  { label: 'Tested Negative (Within last 3 months)', concept: '165255' },
                  { label: 'Previously Tested Positive (Known Positive)', concept: '703' }
                ]
              }
            }
          ]
        }
      ]
    },
    {
      label: 'HIV Rapid Testing & Laboratory Results',
      sections: [
        {
          id: 'screening_test_sec',
          title: 'Test 1: Screening Rapid Test (Determine HIV-1/2)',
          label: 'Test 1: Screening Rapid Test (Determine HIV-1/2)',
          isExpanded: true,
          questions: [
            {
              id: 'screeningResult',
              label: 'Screening Test Result',
              type: 'obs',
              required: true,
              conceptId: 165249,
              questionOptions: {
                rendering: 'radio',
                concept: '165249',
                answers: [
                  { label: 'Reactive (Positive)', concept: '703' },
                  { label: 'Non-Reactive (Negative)', concept: '664' },
                  { label: 'Invalid Result', concept: '1326' }
                ]
              }
            },
            {
              id: 'screeningLotNumber',
              label: 'Determine Kit Lot Number',
              type: 'obs',
              questionOptions: {
                rendering: 'text'
              }
            }
          ]
        },
        {
          id: 'confirmatory_test_sec',
          title: 'Test 2: Confirmatory Rapid Test (Uni-Gold Recombigen)',
          label: 'Test 2: Confirmatory Rapid Test (Uni-Gold Recombigen)',
          isExpanded: true,
          hide: {
            hideWhenExpression: 'screeningResult !== "703"'
          },
          questions: [
            {
              id: 'confirmatoryResult',
              label: 'Confirmatory Test Result',
              type: 'obs',
              conceptId: 165250,
              questionOptions: {
                rendering: 'radio',
                concept: '165250',
                answers: [
                  { label: 'Reactive (Confirmed Positive)', concept: '703' },
                  { label: 'Non-Reactive (Discordant)', concept: '664' }
                ]
              }
            },
            {
              id: 'confirmatoryLotNumber',
              label: 'Uni-Gold Kit Lot Number',
              type: 'obs',
              questionOptions: {
                rendering: 'text'
              }
            }
          ]
        },
        {
          id: 'final_diagnosis_sec',
          title: 'Final HIV Status & Diagnosis',
          label: 'Final HIV Status & Diagnosis',
          isExpanded: true,
          questions: [
            {
              id: 'finalHtsStatus',
              label: 'Final HIV Diagnostic Outcome',
              type: 'obs',
              required: true,
              conceptId: 159427,
              questionOptions: {
                rendering: 'select',
                concept: '159427',
                answers: [
                  { label: 'HIV Positive (Reactive on Serial Protocol)', concept: '703' },
                  { label: 'HIV Negative', concept: '664' },
                  { label: 'Inconclusive / Discordant (Retest in 14 days)', concept: '1138' }
                ]
              }
            },
            {
              id: 'clientReceivedResults',
              label: 'Client Received Final Test Results & Post-Test Counseling?',
              type: 'obs',
              required: true,
              conceptId: 165256,
              questionOptions: {
                rendering: 'radio',
                concept: '165256',
                answers: [
                  { label: 'Yes', concept: '1065' },
                  { label: 'No', concept: '1066' }
                ]
              }
            }
          ]
        }
      ]
    },
    {
      label: 'Post-Test Care & Linkage to ART Treatment',
      sections: [
        {
          id: 'art_linkage_sec',
          title: 'Linkage to HIV Treatment (ART)',
          label: 'Linkage to HIV Treatment (ART)',
          isExpanded: true,
          hide: {
            hideWhenExpression: 'finalHtsStatus !== "703"'
          },
          questions: [
            {
              id: 'linkedToCare',
              label: 'Client Successfully Linked to ART Services?',
              type: 'obs',
              conceptId: 165257,
              questionOptions: {
                rendering: 'radio',
                concept: '165257',
                answers: [
                  { label: 'Yes - Enrolled into Care Same Day', concept: '1065' },
                  { label: 'Referred to Another Facility', concept: '165258' },
                  { label: 'Pending / Refused Linkage', concept: '1066' }
                ]
              }
            },
            {
              id: 'artNumber',
              label: 'Unique ART / PEPFAR Registration Number',
              type: 'patientIdentifier',
              questionOptions: {
                rendering: 'text'
              }
            },
            {
              id: 'linkageDate',
              label: 'Date Linked to ART Care',
              type: 'obs',
              questionOptions: {
                rendering: 'date'
              }
            },
            {
              id: 'linkageOfficer',
              label: 'Linkage Facilitator / Case Manager Name',
              type: 'control',
              questionOptions: {
                rendering: 'text'
              }
            }
          ]
        }
      ]
    }
  ],
  sections: []
};
CLIENT_INTAKE_FORM.sections = CLIENT_INTAKE_FORM.pages.flatMap(p => p.sections);

// ── 7. PMTCT Registration Form ────────────────────────────────────────────────
const PMTCT_REGISTRATION: FormSchemaDefinition = {
  formCode: 'PMTCT_REGISTRATION',
  formName: 'PMTCT Registration & Mother-Infant Pair Card',
  description: 'National Prevention of Mother-to-Child Transmission (PMTCT) maternal cohort record.',
  category: 'PMTCT_ANC',
  version: '2.0.0',
  openmrsFormUuid: '69abe746-b538-428b-b82d-030b9e655700',
  pages: [
    {
      label: 'Maternal PMTCT Profile',
      sections: [
        {
          id: 'pmtct_maternal',
          title: 'Maternal Profile & Obstetric History',
          label: 'Maternal Profile & Obstetric History',
          questions: [
            {
              id: 'ancNumber',
              label: 'ANC Hospital Number',
              type: 'control',
              required: true,
              questionOptions: { rendering: 'text' }
            },
            {
              id: 'gravida',
              label: 'Gravida (Total Pregnancies)',
              type: 'obs',
              conceptId: 5624,
              questionOptions: { rendering: 'number', concept: '5624' }
            },
            {
              id: 'parity',
              label: 'Parity (Total Deliveries)',
              type: 'obs',
              conceptId: 1053,
              questionOptions: { rendering: 'number', concept: '1053' }
            },
            {
              id: 'gestationalAgeWeeks',
              label: 'Gestational Age at Booking (Weeks)',
              type: 'obs',
              conceptId: 1438,
              questionOptions: { rendering: 'number', concept: '1438' }
            },
            {
              id: 'maternalArtStatus',
              label: 'Maternal ART Status at Booking',
              type: 'obs',
              required: true,
              conceptId: 165280,
              questionOptions: {
                rendering: 'select',
                concept: '165280',
                answers: [
                  { label: 'Already on ART before pregnancy', concept: '165281' },
                  { label: 'Newly initiated on ART during this pregnancy', concept: '165282' },
                  { label: 'Not on ART', concept: '165283' }
                ]
              }
            }
          ]
        }
      ]
    }
  ],
  sections: []
};
PMTCT_REGISTRATION.sections = PMTCT_REGISTRATION.pages.flatMap(p => p.sections);

// ── 8. Integrated Laboratory Order and Result Form ───────────────────────────
const INTEGRATED_LAB_ORDER: FormSchemaDefinition = {
  formCode: 'INTEGRATED_LAB_ORDER',
  formName: 'Integrated Laboratory Order and Result Form',
  description: 'National Laboratory assay requisition and quantitative viral load / CD4 assay logging.',
  category: 'LAB',
  version: '2.1.0',
  openmrsFormUuid: '7ef5ad3e-4487-405b-8f7d-c300f59699ec',
  pages: [
    {
      label: 'Laboratory Requisition & Results',
      sections: [
        {
          id: 'lab_order_specimen',
          title: 'Specimen Details & Indication',
          label: 'Specimen Details & Indication',
          questions: [
            { id: 'specimenDate', label: 'Specimen Collection Date', type: 'control', required: true, questionOptions: { rendering: 'date' } },
            {
              id: 'testIndication',
              label: 'Viral Load Test Indication',
              type: 'obs',
              required: true,
              conceptId: 164980,
              questionOptions: {
                rendering: 'select',
                concept: '164980',
                answers: [
                  { label: 'Routine Viral Load Monitoring', concept: '164981' },
                  { label: 'Suspected Treatment Failure (EAC)', concept: '164982' },
                  { label: 'Pregnant / Breastfeeding Baseline', concept: '164983' }
                ]
              }
            },
            {
              id: 'viralLoadResult',
              label: 'HIV-1 RNA Viral Load (copies/mL)',
              type: 'obs',
              required: true,
              conceptId: 856,
              helperText: 'Enter 0 if Target Not Detected (<20 cp/mL)',
              questionOptions: { rendering: 'number', concept: '856' }
            },
            {
              id: 'cd4Count',
              label: 'CD4 Absolute Count (cells/µL)',
              type: 'obs',
              conceptId: 5497,
              questionOptions: { rendering: 'number', concept: '5497' }
            }
          ]
        }
      ]
    }
  ],
  sections: []
};
INTEGRATED_LAB_ORDER.sections = INTEGRATED_LAB_ORDER.pages.flatMap(p => p.sections);

// ── 9. Pharmacy Order Form ───────────────────────────────────────────────────
const PHARMACY_ORDER: FormSchemaDefinition = {
  formCode: 'PHARMACY_ORDER',
  formName: 'Pharmacy Order Form',
  description: 'National Pharmacy ARV dispensing, multi-month refills, and opportunistic infection meds.',
  category: 'PHARMACY',
  version: '2.0.0',
  openmrsFormUuid: '4a238dc4-a76b-4c0f-a100-229d98fd5758',
  pages: [
    {
      label: 'Pharmacy Dispensing',
      sections: [
        {
          id: 'dispense_info',
          title: 'ARV Medication Dispensing & Inventory Tracking',
          label: 'ARV Medication Dispensing & Inventory Tracking',
          questions: [
            { id: 'dispenseDate', label: 'Dispensing Date', type: 'control', required: true, questionOptions: { rendering: 'date' } },
            {
              id: 'dispensedRegimen',
              label: 'Dispensed ARV Regimen',
              type: 'obs',
              required: true,
              conceptId: 164506,
              questionOptions: {
                rendering: 'select',
                concept: '164506',
                answers: [
                  { label: '1a: TDF + 3TC + DTG (30 tabs bottle)', concept: '165681' },
                  { label: '1a: TDF + 3TC + DTG (90 tabs 3MMD bottle)', concept: '165681-3MMD' },
                  { label: '1a: TDF + 3TC + DTG (180 tabs 6MMD bottle)', concept: '165681-6MMD' },
                  { label: '1b: TDF + 3TC + EFV400', concept: '165682' },
                  { label: '2a: AZT + 3TC + ATV/r', concept: '165688' }
                ]
              }
            },
            {
              id: 'quantityDispensed',
              label: 'Quantity Dispensed (Pills / Bottles)',
              type: 'obs',
              conceptId: 1443,
              questionOptions: { rendering: 'number', concept: '1443' }
            },
            {
              id: 'refillMonths',
              label: 'Duration of Refill (Months)',
              type: 'obs',
              required: true,
              conceptId: 165288,
              questionOptions: {
                rendering: 'select',
                concept: '165288',
                answers: [
                  { label: '1 Month', concept: '1' },
                  { label: '2 Months', concept: '2' },
                  { label: '3 Months (3MMD)', concept: '3' },
                  { label: '6 Months (6MMD)', concept: '6' }
                ]
              }
            }
          ]
        }
      ]
    }
  ],
  sections: []
};
PHARMACY_ORDER.sections = PHARMACY_ORDER.pages.flatMap(p => p.sections);

// ── 10. Enhanced Adherence Counselling (EAC) Form ─────────────────────────────
const EAC_REGISTER: FormSchemaDefinition = {
  formCode: 'EAC_REGISTER',
  formName: 'Enhanced Adherence Counselling (EAC) Form',
  description: 'Structured clinical counselling for clients with unsuppressed viral load (≥1,000 cp/mL).',
  category: 'CARE_SUPPORT',
  version: '1.5.0',
  openmrsFormUuid: 'd42c5cf6-8722-4f32-8767-ec8df0a40094',
  pages: [
    {
      label: 'EAC Session Details',
      sections: [
        {
          id: 'eac_session',
          title: 'Adherence Barrier Identification & Session Plan',
          label: 'Adherence Barrier Identification & Session Plan',
          questions: [
            { id: 'sessionDate', label: 'EAC Session Date', type: 'control', required: true, questionOptions: { rendering: 'date' } },
            {
              id: 'sessionNumber',
              label: 'Session Number',
              type: 'obs',
              required: true,
              conceptId: 165295,
              questionOptions: {
                rendering: 'select',
                concept: '165295',
                answers: [
                  { label: 'Session 1: Initial Assessment', concept: '1' },
                  { label: 'Session 2: Barrier Resolution', concept: '2' },
                  { label: 'Session 3: Readiness for Repeat Viral Load', concept: '3' },
                  { label: 'Session 4: Repeat Viral Load Post-EAC', concept: '4' }
                ]
              }
            },
            {
              id: 'identifiedBarriers',
              label: 'Identified Barriers to Adherence',
              type: 'obs',
              conceptId: 165296,
              questionOptions: {
                rendering: 'select',
                concept: '165296',
                answers: [
                  { label: 'Forgot dose / busy schedule', concept: '1' },
                  { label: 'Drug side effects / toxicity', concept: '2' },
                  { label: 'Stigma / fear of disclosure', concept: '3' },
                  { label: 'Substance abuse / alcohol', concept: '4' },
                  { label: 'Depression / mental health', concept: '5' },
                  { label: 'Ran out of pills / transport barrier', concept: '6' }
                ]
              }
            },
            { id: 'actionPlan', label: 'Agreed Adherence Action Plan', type: 'obs', conceptId: 165297, questionOptions: { rendering: 'textarea' } }
          ]
        }
      ]
    }
  ],
  sections: []
};
EAC_REGISTER.sections = EAC_REGISTER.pages.flatMap(p => p.sections);

// ── 11. PrEP and PEP Screening and Eligibility Form ───────────────────────────
const PREP_PEP_CARD: FormSchemaDefinition = {
  formCode: 'PREP_PEP_CARD',
  formName: 'PrEP and PEP Screening and Eligibility Form',
  description: 'National Pre-Exposure and Post-Exposure Prophylaxis screening, baseline HIV test, and initiation.',
  category: 'PREP_PEP',
  version: '1.4.0',
  openmrsFormUuid: '60e4620e-f751-45c3-b8e0-b3e5085f3e0e',
  pages: [
    {
      label: 'PrEP / PEP Assessment',
      sections: [
        {
          id: 'prep_eligibility',
          title: 'Eligibility & Clinical Screening',
          label: 'Eligibility & Clinical Screening',
          questions: [
            { id: 'assessmentDate', label: 'Assessment Date', type: 'control', required: true, questionOptions: { rendering: 'date' } },
            {
              id: 'programType',
              label: 'Prophylaxis Program',
              type: 'obs',
              required: true,
              conceptId: 165298,
              questionOptions: {
                rendering: 'radio',
                concept: '165298',
                answers: [
                  { label: 'PrEP (Pre-Exposure Prophylaxis - Ongoing Risk)', concept: '1' },
                  { label: 'PEP (Post-Exposure Prophylaxis - Single Exposure within 72 hrs)', concept: '2' }
                ]
              }
            },
            {
              id: 'hivRapidTest',
              label: 'Baseline HIV Rapid Test Result (Must be Negative to Start)',
              type: 'obs',
              required: true,
              conceptId: 159427,
              questionOptions: {
                rendering: 'radio',
                concept: '159427',
                answers: [
                  { label: 'Negative (Eligible)', concept: '664' },
                  { label: 'Positive (Refer to ART Care)', concept: '703' }
                ]
              }
            },
            {
              id: 'prepRegimen',
              label: 'Prescribed PrEP / PEP Regimen',
              type: 'obs',
              conceptId: 165299,
              questionOptions: {
                rendering: 'select',
                concept: '165299',
                answers: [
                  { label: 'TDF/FTC (Truvada) 1 tab daily', concept: '1' },
                  { label: 'TDF/3TC 1 tab daily', concept: '2' },
                  { label: 'TDF/3TC + DTG (PEP Triple Therapy)', concept: '3' }
                ]
              }
            }
          ]
        }
      ]
    }
  ],
  sections: []
};
PREP_PEP_CARD.sections = PREP_PEP_CARD.pages.flatMap(p => p.sections);

// ── 12. TB Screening and Preventive Therapy Form ──────────────────────────────
const TB_SCREENING_TPT: FormSchemaDefinition = {
  formCode: 'TB_SCREENING_TPT',
  formName: 'TB Screening and Preventive Therapy (TPT) Form',
  description: 'Four-symptom TB screening, GeneXpert requisition, and 3HP/6H Isoniazid completion tracking.',
  category: 'TB_PROGRAM',
  version: '1.8.0',
  openmrsFormUuid: 'ab0f6d1d-b559-48de-aa5f-0a913eb97245',
  pages: [
    {
      label: 'TB Screening & IPT',
      sections: [
        {
          id: 'tb_symptoms',
          title: 'Four-Symptom Screening (WHO Rule-Out)',
          label: 'Four-Symptom Screening (WHO Rule-Out)',
          questions: [
            { id: 'screenDate', label: 'Screening Date', type: 'control', required: true, questionOptions: { rendering: 'date' } },
            {
              id: 'currentCough',
              label: 'Current Cough of any duration?',
              type: 'obs',
              required: true,
              conceptId: 143264,
              questionOptions: { rendering: 'radio', concept: '143264', answers: [{ label: 'Yes', concept: '1065' }, { label: 'No', concept: '1066' }] }
            },
            {
              id: 'fever',
              label: 'Persistent Fever?',
              type: 'obs',
              required: true,
              conceptId: 140238,
              questionOptions: { rendering: 'radio', concept: '140238', answers: [{ label: 'Yes', concept: '1065' }, { label: 'No', concept: '1066' }] }
            },
            {
              id: 'weightLoss',
              label: 'Unexplained Weight Loss (>10%)?',
              type: 'obs',
              required: true,
              conceptId: 832,
              questionOptions: { rendering: 'radio', concept: '832', answers: [{ label: 'Yes', concept: '1065' }, { label: 'No', concept: '1066' }] }
            },
            {
              id: 'nightSweats',
              label: 'Excessive Night Sweats (>3 weeks)?',
              type: 'obs',
              required: true,
              conceptId: 133027,
              questionOptions: { rendering: 'radio', concept: '133027', answers: [{ label: 'Yes', concept: '1065' }, { label: 'No', concept: '1066' }] }
            },
            {
              id: 'tptOutcome',
              label: 'TPT / IPT Action Taken',
              type: 'obs',
              required: true,
              conceptId: 165300,
              questionOptions: {
                rendering: 'select',
                concept: '165300',
                answers: [
                  { label: 'All 4 Negative: Eligible for 3HP / 6H TPT', concept: '1' },
                  { label: 'Any Symptom Positive: Sputum GeneXpert Ordered', concept: '2' },
                  { label: 'Confirmed TB: Initiated on 2RHZE/4RH', concept: '3' }
                ]
              }
            }
          ]
        }
      ]
    }
  ],
  sections: []
};
TB_SCREENING_TPT.sections = TB_SCREENING_TPT.pages.flatMap(p => p.sections);

export const DEFAULT_NMRS_SCHEMAS: FormSchemaDefinition[] = [
  CARE_CARD_MASTER,
  CARE_CARD_1A,
  CARE_CARD_1B,
  CARE_CARD_2_3,
  CARE_CARD_4B,
  HTS_REGISTER,
  CLIENT_INTAKE_FORM,
  PMTCT_REGISTRATION,
  INTEGRATED_LAB_ORDER,
  PHARMACY_ORDER,
  EAC_REGISTER,
  PREP_PEP_CARD,
  TB_SCREENING_TPT
];
