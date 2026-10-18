import { prisma } from '../prisma.js';
import { programById } from './diseaseClinicCatalog.js';

/**
 * Standard Institutional Data Dictionary & CIEL Cross-Reference Mapping
 */
export interface TerminologyMapping {
  conceptKey: string;
  loincCode?: string;
  rxnormCode?: string;
  atcCode?: string;
  snomedCode?: string;
  cielId: number;
  cielUuid: string;
  display: string;
  category: 'VITAL_SIGNS' | 'MEDICATION' | 'LABORATORY' | 'DIAGNOSIS';
  defaultDosage?: string;
  unit?: string;
  referenceRange?: string;
}

export const DATA_DICTIONARY_REGISTRY: Record<string, TerminologyMapping> = {
  // ── 1. VITAL SIGNS ──────────────────────────────────────────────────────────
  SYSTOLIC_BP: {
    conceptKey: 'SYSTOLIC_BP',
    loincCode: '8480-6',
    snomedCode: '271649006',
    cielId: 5085,
    cielUuid: '5085AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Systolic Blood Pressure',
    category: 'VITAL_SIGNS',
    unit: 'mmHg',
  },
  DIASTOLIC_BP: {
    conceptKey: 'DIASTOLIC_BP',
    loincCode: '8462-4',
    snomedCode: '271650006',
    cielId: 5086,
    cielUuid: '5086AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Diastolic Blood Pressure',
    category: 'VITAL_SIGNS',
    unit: 'mmHg',
  },
  TEMPERATURE: {
    conceptKey: 'TEMPERATURE',
    loincCode: '8310-5',
    snomedCode: '386725007',
    cielId: 5088,
    cielUuid: '5088AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Body Temperature',
    category: 'VITAL_SIGNS',
    unit: '°C',
  },
  PULSE_RATE: {
    conceptKey: 'PULSE_RATE',
    loincCode: '8867-4',
    snomedCode: '364075005',
    cielId: 5087,
    cielUuid: '5087AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Pulse / Heart Rate',
    category: 'VITAL_SIGNS',
    unit: 'bpm',
  },
  RESPIRATORY_RATE: {
    conceptKey: 'RESPIRATORY_RATE',
    loincCode: '9279-1',
    snomedCode: '86290005',
    cielId: 5242,
    cielUuid: '5242AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Respiratory Rate',
    category: 'VITAL_SIGNS',
    unit: 'cpm',
  },
  SPO2: {
    conceptKey: 'SPO2',
    loincCode: '59408-5',
    snomedCode: '431314004',
    cielId: 5092,
    cielUuid: '5092AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Oxygen Saturation (SpO2)',
    category: 'VITAL_SIGNS',
    unit: '%',
  },
  WEIGHT: {
    conceptKey: 'WEIGHT',
    loincCode: '29463-7',
    snomedCode: '27113001',
    cielId: 5089,
    cielUuid: '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Body Weight',
    category: 'VITAL_SIGNS',
    unit: 'kg',
  },
  HEIGHT: {
    conceptKey: 'HEIGHT',
    loincCode: '8302-2',
    snomedCode: '50373000',
    cielId: 5090,
    cielUuid: '5090AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Body Height / Length',
    category: 'VITAL_SIGNS',
    unit: 'cm',
  },
  BMI: {
    conceptKey: 'BMI',
    loincCode: '39156-5',
    snomedCode: '60621009',
    cielId: 1343,
    cielUuid: '1343AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Body Mass Index (BMI)',
    category: 'VITAL_SIGNS',
    unit: 'kg/m²',
  },

  // ── 2. MEDICATIONS & REGIMENS ────────────────────────────────────────────────
  // Malaria Medications
  ACT_AL: {
    conceptKey: 'ACT_AL',
    rxnormCode: 'RXNORM-141870',
    atcCode: 'ATC-P01BF01',
    cielId: 164505,
    cielUuid: '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Artemether / Lumefantrine (AL) 80/480mg',
    category: 'MEDICATION',
    defaultDosage: '1 tab PO twice daily for 3 days',
  },
  ACT_ASAQ: {
    conceptKey: 'ACT_ASAQ',
    rxnormCode: 'RXNORM-141865',
    atcCode: 'ATC-P01BF03',
    cielId: 164506,
    cielUuid: '164506AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Artesunate / Amodiaquine (ASAQ) 100/270mg',
    category: 'MEDICATION',
    defaultDosage: '2 tabs PO once daily for 3 days',
  },
  ACT_DHAPPQ: {
    conceptKey: 'ACT_DHAPPQ',
    rxnormCode: 'RXNORM-141871',
    atcCode: 'ATC-P01BF05',
    cielId: 164507,
    cielUuid: '164507AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Dihydroartemisinin / Piperaquine (DHA-PPQ) 40/320mg',
    category: 'MEDICATION',
    defaultDosage: '3 tabs PO once daily for 3 days',
  },
  ARTESUNATE_INJ: {
    conceptKey: 'ARTESUNATE_INJ',
    rxnormCode: 'RXNORM-141865',
    atcCode: 'ATC-P01BE03',
    cielId: 164508,
    cielUuid: '164508AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Injectable Artesunate (IV/IM Pre-referral)',
    category: 'MEDICATION',
    defaultDosage: '2.4 mg/kg IV/IM stat',
  },

  // HIV / ART Regimens
  ARV_TLD: {
    conceptKey: 'ARV_TLD',
    rxnormCode: 'RXNORM-2053293',
    atcCode: 'ATC-J05AR',
    cielId: 165681,
    cielUuid: '8a343013-0216-44e0-aefe-53909ffd5631',
    display: 'Tenofovir / Lamivudine / Dolutegravir (TDF/3TC/DTG 300/300/50mg)',
    category: 'MEDICATION',
    defaultDosage: '1 tablet PO once daily at bedtime',
  },
  ARV_TLE: {
    conceptKey: 'ARV_TLE',
    rxnormCode: 'RXNORM-856755',
    atcCode: 'ATC-J05AR03',
    cielId: 164505,
    cielUuid: '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Tenofovir / Lamivudine / Efavirenz (TDF/3TC/EFV 300/300/600mg)',
    category: 'MEDICATION',
    defaultDosage: '1 tablet PO once daily at night',
  },
  ARV_AZT_3TC_ATVR: {
    conceptKey: 'ARV_AZT_3TC_ATVR',
    rxnormCode: 'RXNORM-856758',
    atcCode: 'ATC-J05AR',
    cielId: 165686,
    cielUuid: '165686AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Zidovudine / Lamivudine / Atazanavir/ritonavir (AZT/3TC/ATV/r)',
    category: 'MEDICATION',
    defaultDosage: '1 tab PO BID with food',
  },
  ARV_ABC_3TC_DTG: {
    conceptKey: 'ARV_ABC_3TC_DTG',
    rxnormCode: 'RXNORM-2053298',
    atcCode: 'ATC-J05AR',
    cielId: 165691,
    cielUuid: '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Abacavir / Lamivudine / Dolutegravir (ABC/3TC/DTG Pediatric)',
    category: 'MEDICATION',
    defaultDosage: 'Weight-based daily oral dose',
  },

  // TB & Prophylaxis Medications
  TB_TPT_INH: {
    conceptKey: 'TB_TPT_INH',
    rxnormCode: 'RXNORM-656',
    atcCode: 'ATC-J04AC01',
    cielId: 656,
    cielUuid: '656AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Isoniazid (INH 300mg) + Pyridoxine (B6 25mg)',
    category: 'MEDICATION',
    defaultDosage: '300mg PO once daily for 6 months (TPT)',
  },
  TB_REGIMEN_2RHZE: {
    conceptKey: 'TB_REGIMEN_2RHZE',
    rxnormCode: 'RXNORM-1675',
    atcCode: 'ATC-J04AM06',
    cielId: 1675,
    cielUuid: '1675AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Rifampicin + Isoniazid + Pyrazinamide + Ethambutol (2RHZE / 4RH)',
    category: 'MEDICATION',
    defaultDosage: 'Fixed-dose combination daily by weight band',
  },
  COTRIMOXAZOLE: {
    conceptKey: 'COTRIMOXAZOLE',
    rxnormCode: 'RXNORM-10180',
    atcCode: 'ATC-J01EE01',
    cielId: 165257,
    cielUuid: 'dbf8a287-3c82-440b-bfc3-a4b9432f9183',
    display: 'Cotrimoxazole (CTX 960mg Double Strength)',
    category: 'MEDICATION',
    defaultDosage: '1 tablet PO once daily (OI Prophylaxis)',
  },

  // Routine Immunization Antigens
  VACCINE_BCG: {
    conceptKey: 'VACCINE_BCG',
    atcCode: 'ATC-J07AN01',
    cielId: 165270,
    cielUuid: '165270AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Bacillus Calmette-Guérin (BCG) Vaccine',
    category: 'MEDICATION',
    defaultDosage: '0.05 mL Intradermal at birth',
  },
  VACCINE_OPV: {
    conceptKey: 'VACCINE_OPV',
    atcCode: 'ATC-J07BF02',
    cielId: 165271,
    cielUuid: '165271AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Bivalent Oral Poliovirus Vaccine (bOPV)',
    category: 'MEDICATION',
    defaultDosage: '2 drops PO',
  },
  VACCINE_IPV: {
    conceptKey: 'VACCINE_IPV',
    atcCode: 'ATC-J07BF03',
    cielId: 165272,
    cielUuid: '165272AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Inactivated Poliovirus Vaccine (IPV)',
    category: 'MEDICATION',
    defaultDosage: '0.5 mL Intramuscular anterolateral thigh',
  },
  VACCINE_PENTA: {
    conceptKey: 'VACCINE_PENTA',
    atcCode: 'ATC-J07CA02',
    cielId: 165273,
    cielUuid: '165273AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Pentavalent Vaccine (DTP-HepB-Hib)',
    category: 'MEDICATION',
    defaultDosage: '0.5 mL Intramuscular',
  },
  VACCINE_PCV: {
    conceptKey: 'VACCINE_PCV',
    atcCode: 'ATC-J07AL02',
    cielId: 165274,
    cielUuid: '165274AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Pneumococcal Conjugate Vaccine (PCV-13)',
    category: 'MEDICATION',
    defaultDosage: '0.5 mL Intramuscular',
  },
  VACCINE_ROTA: {
    conceptKey: 'VACCINE_ROTA',
    atcCode: 'ATC-J07BL01',
    cielId: 165275,
    cielUuid: '165275AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Rotavirus Oral Vaccine',
    category: 'MEDICATION',
    defaultDosage: '1.5 mL PO',
  },
  VACCINE_MEASLES: {
    conceptKey: 'VACCINE_MEASLES',
    atcCode: 'ATC-J07BD52',
    cielId: 165276,
    cielUuid: '165276AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Measles Vaccine (MCV1 / MCV2)',
    category: 'MEDICATION',
    defaultDosage: '0.5 mL Subcutaneous',
  },
  VACCINE_YELLOW_FEVER: {
    conceptKey: 'VACCINE_YELLOW_FEVER',
    atcCode: 'ATC-J07BL01',
    cielId: 165277,
    cielUuid: '165277AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Yellow Fever Vaccine',
    category: 'MEDICATION',
    defaultDosage: '0.5 mL Subcutaneous',
  },

  // Maternal & Child Health Medications
  MCH_IFA: {
    conceptKey: 'MCH_IFA',
    atcCode: 'ATC-B03AE02',
    cielId: 165279,
    cielUuid: '165279AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Iron (60mg) + Folic Acid (400mcg) [IFA]',
    category: 'MEDICATION',
    defaultDosage: '1 tablet PO once daily throughout pregnancy',
  },
  MCH_IPTP_SP: {
    conceptKey: 'MCH_IPTP_SP',
    rxnormCode: 'RXNORM-10178',
    atcCode: 'ATC-P01BD51',
    cielId: 165280,
    cielUuid: '165280AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Sulfadoxine-Pyrimethamine (SP 500/25mg - IPTp)',
    category: 'MEDICATION',
    defaultDosage: '3 tablets PO stat with water monthly from 16 weeks',
  },
  MCH_TT_DOSE: {
    conceptKey: 'MCH_TT_DOSE',
    atcCode: 'ATC-J07AM51',
    cielId: 165281,
    cielUuid: '165281AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Tetanus Diphtheria (Td) Toxoid Vaccine',
    category: 'MEDICATION',
    defaultDosage: '0.5 mL Intramuscular deltoid',
  },

  // ── 3. LABORATORY INVESTIGATIONS ────────────────────────────────────────────
  MALARIA_MRDT: {
    conceptKey: 'MALARIA_MRDT',
    loincCode: '89365-1',
    cielId: 1643,
    cielUuid: '1643AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Malaria Rapid Diagnostic Test (mRDT)',
    category: 'LABORATORY',
    referenceRange: 'Negative',
  },
  MALARIA_MICROSCOPY: {
    conceptKey: 'MALARIA_MICROSCOPY',
    loincCode: '74558-8',
    cielId: 32,
    cielUuid: '32AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Malaria Microscopy (Thick & Thin Smear)',
    category: 'LABORATORY',
    referenceRange: 'No Plasmodium parasites seen',
  },
  HIV_VIRAL_LOAD: {
    conceptKey: 'HIV_VIRAL_LOAD',
    loincCode: '25836-8',
    cielId: 856,
    cielUuid: '856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'HIV-1 RNA Viral Load Quantitative',
    category: 'LABORATORY',
    unit: 'copies/mL',
    referenceRange: '< 20 (Target Not Detected)',
  },
  HIV_CD4_COUNT: {
    conceptKey: 'HIV_CD4_COUNT',
    loincCode: '24467-3',
    cielId: 5497,
    cielUuid: '5497AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'CD4 T-Lymphocyte Absolute Count',
    category: 'LABORATORY',
    unit: 'cells/µL',
    referenceRange: '500 - 1500',
  },
  HIV_RAPID_TEST: {
    conceptKey: 'HIV_RAPID_TEST',
    loincCode: '75622-1',
    cielId: 1040,
    cielUuid: '1040AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'HIV 1 and 2 Ab Rapid Diagnostic Test',
    category: 'LABORATORY',
    referenceRange: 'Non-reactive',
  },
  TB_GENEXPERT: {
    conceptKey: 'TB_GENEXPERT',
    loincCode: '89371-9',
    cielId: 162202,
    cielUuid: '162202AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'GeneXpert MTB/RIF Diagnostic Assay',
    category: 'LABORATORY',
    referenceRange: 'MTB Not Detected',
  },
  TB_SPUTUM_AFB: {
    conceptKey: 'TB_SPUTUM_AFB',
    loincCode: '11477-7',
    cielId: 307,
    cielUuid: '307AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Sputum Acid-Fast Bacilli (AFB) Smear Microscopy',
    category: 'LABORATORY',
    referenceRange: 'No AFB Seen',
  },
  SYPHILIS_RST: {
    conceptKey: 'SYPHILIS_RST',
    loincCode: '22461-8',
    cielId: 299,
    cielUuid: '299AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Treponema pallidum Rapid Syphilis Screen',
    category: 'LABORATORY',
    referenceRange: 'Non-reactive',
  },
  POLIO_STOOL_VIRUS: {
    conceptKey: 'POLIO_STOOL_VIRUS',
    loincCode: '6584-7',
    cielId: 165282,
    cielUuid: '165282AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Enterovirus & Poliovirus Isolation (Stool)',
    category: 'LABORATORY',
    referenceRange: 'Negative / No virus isolated',
  },
};

/**
 * Ensures required specialty test items exist in LabTestCatalog
 */
let catalogEnsured = false;
export async function ensureSpecialtyLabCatalog(): Promise<void> {
  if (catalogEnsured) return;
  const items = [
    {
      testCode: 'LAB-893651',
      testName: 'Malaria Rapid Diagnostic Test (RDT)',
      category: 'Parasitology',
      specimenType: 'Whole Blood (Capillary/EDTA)',
      loincCode: '89365-1',
      referenceRange: 'Negative',
    },
    {
      testCode: 'LAB-MAL-002',
      testName: 'Malaria Microscopy (Thick & Thin Blood Film)',
      category: 'Parasitology',
      specimenType: 'Whole Blood (EDTA)',
      loincCode: '74558-8',
      referenceRange: 'No Plasmodium trophozoites or gametocytes seen',
    },
    {
      testCode: 'LAB-VL-001',
      testName: 'HIV-1 RNA Viral Load Quantitative (PCR)',
      category: 'Molecular Diagnostics',
      specimenType: 'Plasma (EDTA)',
      loincCode: '25836-8',
      unit: 'copies/mL',
      referenceRange: '< 20 (Target Not Detected)',
    },
    {
      testCode: 'LAB-CD4-001',
      testName: 'CD4 T-Lymphocyte Absolute Count (Flow Cytometry)',
      category: 'Immunology',
      specimenType: 'Whole Blood (EDTA)',
      loincCode: '24467-3',
      unit: 'cells/µL',
      referenceRange: '500 - 1500 cells/µL',
    },
    {
      testCode: 'LAB-HIV-001',
      testName: 'HIV 1 and 2 Ab Rapid Test',
      category: 'Serology',
      specimenType: 'Serum / Plasma',
      loincCode: '75622-1',
      referenceRange: 'Non-reactive',
    },
    {
      testCode: 'LAB-TB-001',
      testName: 'GeneXpert MTB/RIF Assay (Direct Sputum)',
      category: 'Molecular Diagnostics',
      specimenType: 'Sputum',
      loincCode: '89371-9',
      referenceRange: 'MTB Not Detected',
    },
    {
      testCode: 'LAB-TB-002',
      testName: 'Sputum Acid-Fast Bacilli (AFB) Smear Microscopy',
      category: 'Microbiology',
      specimenType: 'Sputum',
      loincCode: '11477-7',
      referenceRange: 'No AFB seen in 100 oil immersion fields',
    },
    {
      testCode: 'LAB-SYPH-001',
      testName: 'Treponema pallidum Rapid Syphilis Antibody Screen',
      category: 'Serology',
      specimenType: 'Serum / Whole Blood',
      loincCode: '22461-8',
      referenceRange: 'Non-reactive',
    },
    {
      testCode: 'LAB-POLIO-001',
      testName: 'Enterovirus / Poliovirus Isolation (Stool Specimen)',
      category: 'Virology',
      specimenType: 'Stool Specimen',
      loincCode: '6584-7',
      referenceRange: 'Negative / No wild or vaccine poliovirus isolated',
    },
  ];

  for (const item of items) {
    await prisma.labTestCatalog.upsert({
      where: { testCode: item.testCode },
      create: {
        testCode: item.testCode,
        testName: item.testName,
        category: item.category,
        specimenType: item.specimenType,
        loincCode: item.loincCode,
        unit: item.unit || null,
        referenceRange: item.referenceRange || null,
        turnaroundHours: 4,
        price: 0,
        isActive: true,
      },
      update: {
        testName: item.testName,
        category: item.category,
        specimenType: item.specimenType,
        loincCode: item.loincCode,
      },
    }).catch(() => {});
  }
  catalogEnsured = true;
}

/**
 * Resolves an active staff ID for foreign key references
 */
let cachedStaffId: string | null = null;
async function resolveStaffId(clinicianId?: string): Promise<string> {
  if (clinicianId && clinicianId !== 'STAFF-SYSTEM') {
    const s = await prisma.staff.findFirst({
      where: { OR: [{ id: clinicianId }, { userId: clinicianId }] },
      select: { id: true },
    });
    if (s) return s.id;
  }
  if (cachedStaffId) return cachedStaffId;
  const staff = await prisma.staff.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (staff) {
    cachedStaffId = staff.id;
    return staff.id;
  }
  return '79da6078-065e-4fe2-bf6d-d3c39f3621a3';
}

/**
 * Determine program title from form category or code
 */
function resolveProgramTitle(category: string, formCode?: string): string {
  const p = programById(category.toLowerCase().replace(/_/g, '-')) ||
    (category.includes('MALARIA') ? programById('malaria') :
     category.includes('TB') ? programById('tb-dots') :
     category.includes('IMMUNIZATION') ? programById('immunization') :
     category.includes('POLIO') ? programById('polio-afp') :
     category.includes('MCH') || category.includes('PMTCT') ? programById('mch') :
     programById('hiv-art'));
  return p?.title || 'Specialty Clinic';
}

/**
 * Clinical Integration Service
 * Extracts vitals, prescriptions, and lab investigations from specialty clinic forms,
 * saving them into native EMR tables with standard Data Dictionary terminology,
 * while mapping to CIEL concepts for OpenMRS REST synchronization.
 */
export class ClinicalIntegrationService {
  /**
   * Main integration pipeline executed upon form submission or update
   */
  public static async integrateEncounter(params: {
    patientId: string;
    formSchemaId: string;
    formCode: string;
    formName: string;
    category: string;
    formData: any;
    encounterDate: Date;
    clinicianName: string;
    clinicianId?: string;
    encounterRecordId?: string;
  }): Promise<{ vitalsCreated: boolean; rxCount: number; labCount: number }> {
    const {
      patientId, formSchemaId, formCode, formName, category,
      formData = {}, encounterDate, clinicianName, clinicianId, encounterRecordId,
    } = params;

    const programTitle = resolveProgramTitle(category, formCode);
    const staffId = await resolveStaffId(clinicianId);
    await ensureSpecialtyLabCatalog();

    let vitalsCreated = false;
    let rxCount = 0;
    let labCount = 0;

    // ── 1. VITALS EXTRACTION & INTEGRATION ────────────────────────────────────
    const vitals = this.extractVitals(formData);
    if (vitals && Object.keys(vitals).length > 0) {
      // Check if a triage record already exists for this patient at the exact encounter timestamp
      const existingTriage = await prisma.triageRecord.findFirst({
        where: {
          patientId,
          createdAt: {
            gte: new Date(encounterDate.getTime() - 60000),
            lte: new Date(encounterDate.getTime() + 60000),
          },
        },
      });

      const presentingComplaints = `[${programTitle}] ${formName}`;

      if (!existingTriage) {
        // Compute BMI if weight and height exist
        let bmi = vitals.bmi != null ? Number(vitals.bmi) : null;
        if (!bmi && vitals.weight && vitals.height) {
          const hM = Number(vitals.height) > 3 ? Number(vitals.height) / 100 : Number(vitals.height);
          bmi = Math.round((Number(vitals.weight) / Math.pow(hM, 2)) * 10) / 10;
        }

        await prisma.triageRecord.create({
          data: {
            patientId,
            triageType: 'SPECIALTY_CLINIC',
            systolic: vitals.systolic != null ? Number(vitals.systolic) : 120,
            diastolic: vitals.diastolic != null ? Number(vitals.diastolic) : 80,
            temperature: vitals.temperature != null ? Number(vitals.temperature) : 36.8,
            pulseRate: vitals.pulseRate != null ? Number(vitals.pulseRate) : 76,
            respiratoryRate: vitals.respiratoryRate != null ? Number(vitals.respiratoryRate) : 18,
            spo2: vitals.spo2 != null ? Number(vitals.spo2) : 98,
            weight: vitals.weight != null ? Number(vitals.weight) : null,
            height: vitals.height != null ? Number(vitals.height) : null,
            bmi,
            presentingComplaints,
            priority: 'STANDARD',
            triageStart: encounterDate,
            triageEnd: encounterDate,
            createdAt: encounterDate,
            createdById: staffId,
          },
        });
        vitalsCreated = true;
      }
    }

    // ── 2. PRESCRIPTIONS EXTRACTION & INTEGRATION ─────────────────────────────
    const prescriptions = this.extractPrescriptions(formData, formCode, programTitle);
    for (const rx of prescriptions) {
      // Check for duplicate active prescription for this patient with the same medication code on the encounter date
      const existingRx = await prisma.medicationRequest.findFirst({
        where: {
          patientId,
          medicationCode: rx.medicationCode,
          authoredOn: {
            gte: new Date(encounterDate.getTime() - 86400000),
            lte: new Date(encounterDate.getTime() + 86400000),
          },
        },
      });

      if (!existingRx) {
        await prisma.medicationRequest.create({
          data: {
            patientId,
            staffId,
            status: 'ACTIVE',
            intent: 'ORDER',
            medicationCode: rx.medicationCode,
            medicationDisplay: rx.medicationDisplay,
            dosageText: rx.dosageText,
            note: rx.note,
            authoredOn: encounterDate,
            createdAt: encounterDate,
          },
        });
        rxCount++;
      }
    }

    // ── 3. LABORATORY INVESTIGATIONS EXTRACTION & INTEGRATION ─────────────────
    const labTests = this.extractLabInvestigations(formData, formCode, programTitle);
    for (const lab of labTests) {
      // Look up catalog item
      const catalogItem = await prisma.labTestCatalog.findUnique({
        where: { testCode: lab.testCode },
      });
      if (!catalogItem) continue;

      // Check if lab order already exists for this encounter date & test
      const existingOrder = await prisma.labOrder.findFirst({
        where: {
          patientId,
          orderedAt: {
            gte: new Date(encounterDate.getTime() - 86400000),
            lte: new Date(encounterDate.getTime() + 86400000),
          },
          items: {
            some: { testId: catalogItem.id },
          },
        },
      });

      if (!existingOrder) {
        const orderNumber = `LAB-SC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const newOrder = await prisma.labOrder.create({
          data: {
            orderNumber,
            patientId,
            requestedById: staffId,
            department: 'SPECIALTY_CLINIC',
            priority: 'ROUTINE',
            status: 'COMPLETED',
            clinicalNotes: `Origin: [${programTitle}] ${formName}`,
            diagnosis: lab.notes || `${programTitle} Investigation`,
            orderedAt: encounterDate,
            completedAt: encounterDate,
            createdAt: encounterDate,
          },
        });

        const orderItem = await prisma.labOrderItem.create({
          data: {
            orderId: newOrder.id,
            testId: catalogItem.id,
            status: 'COMPLETED',
            price: 0,
            createdAt: encounterDate,
          },
        });

        await prisma.labResult.create({
          data: {
            orderItemId: orderItem.id,
            resultValue: lab.resultValue,
            resultUnit: lab.unit || catalogItem.unit || '',
            referenceRange: lab.referenceRange || catalogItem.referenceRange || 'Standard',
            interpretation: lab.interpretation || (lab.isAbnormal ? 'ABNORMAL' : 'NORMAL'),
            isCritical: Boolean(lab.isAbnormal),
            resultText: `Result recorded in ${programTitle} (${formName}): ${lab.resultValue}`,
            resultedAt: encounterDate,
            verifiedById: staffId,
            verifiedAt: encounterDate,
          },
        });
        labCount++;
      }
    }

    return { vitalsCreated, rxCount, labCount };
  }

  /**
   * Extract vital signs from form data with LOINC & CIEL concepts
   */
  public static extractVitals(formData: any): Record<string, any> | null {
    if (!formData || typeof formData !== 'object') return null;
    const v: Record<string, any> = {};

    // Systolic Blood Pressure
    if (formData['obs_CIEL:5085'] != null) v.systolic = Number(formData['obs_CIEL:5085']);
    else if (formData.systolic_bp != null) v.systolic = Number(formData.systolic_bp);
    else if (formData.systolic != null) v.systolic = Number(formData.systolic);
    else if (formData.bp_systolic != null) v.systolic = Number(formData.bp_systolic);
    else if (formData.bloodPressure || formData.bp) {
      const match = String(formData.bloodPressure || formData.bp).match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
      if (match) {
        v.systolic = Number(match[1]);
        v.diastolic = Number(match[2]);
      }
    }

    // Diastolic Blood Pressure
    if (v.diastolic == null) {
      if (formData['obs_CIEL:5086'] != null) v.diastolic = Number(formData['obs_CIEL:5086']);
      else if (formData.diastolic_bp != null) v.diastolic = Number(formData.diastolic_bp);
      else if (formData.diastolic != null) v.diastolic = Number(formData.diastolic);
      else if (formData.bp_diastolic != null) v.diastolic = Number(formData.bp_diastolic);
    }

    // Body Temperature
    if (formData['obs_CIEL:5088'] != null) v.temperature = Number(formData['obs_CIEL:5088']);
    else if (formData.temperature_c != null) v.temperature = Number(formData.temperature_c);
    else if (formData.temperature != null) v.temperature = Number(formData.temperature);
    else if (formData.temp != null) v.temperature = Number(formData.temp);

    // Pulse Rate
    if (formData['obs_CIEL:5087'] != null) v.pulseRate = Number(formData['obs_CIEL:5087']);
    else if (formData.pulseRate != null) v.pulseRate = Number(formData.pulseRate);
    else if (formData.pulse != null) v.pulseRate = Number(formData.pulse);
    else if (formData.heart_rate != null) v.pulseRate = Number(formData.heart_rate);

    // Respiratory Rate
    if (formData['obs_CIEL:5242'] != null) v.respiratoryRate = Number(formData['obs_CIEL:5242']);
    else if (formData.respiratoryRate != null) v.respiratoryRate = Number(formData.respiratoryRate);
    else if (formData.respiratory_rate != null) v.respiratoryRate = Number(formData.respiratory_rate);
    else if (formData.resp_rate != null) v.respiratoryRate = Number(formData.resp_rate);

    // Oxygen Saturation (SpO2)
    if (formData['obs_CIEL:5092'] != null) v.spo2 = Number(formData['obs_CIEL:5092']);
    else if (formData.spo2 != null) v.spo2 = Number(formData.spo2);
    else if (formData.oxygen_saturation != null) v.spo2 = Number(formData.oxygen_saturation);

    // Body Weight
    if (formData['obs_CIEL:5089'] != null) v.weight = Number(formData['obs_CIEL:5089']);
    else if (formData.weight != null) v.weight = Number(formData.weight);
    else if (formData.weight_kg != null) v.weight = Number(formData.weight_kg);
    else if (formData.weightMonth0_25 != null) v.weight = Number(formData.weightMonth0_25);
    else if (formData.weight_26 != null) v.weight = Number(formData.weight_26);

    // Body Height
    if (formData['obs_CIEL:5090'] != null) v.height = Number(formData['obs_CIEL:5090']);
    else if (formData.height != null) v.height = Number(formData.height);
    else if (formData.height_cm != null) v.height = Number(formData.height_cm);

    // BMI
    if (formData['obs_CIEL:1343'] != null) v.bmi = Number(formData['obs_CIEL:1343']);
    else if (formData.bmi != null) v.bmi = Number(formData.bmi);

    const keys = Object.keys(v);
    return keys.length > 0 ? v : null;
  }

  /**
   * Extract prescribed medications from form data
   */
  public static extractPrescriptions(formData: any, formCode: string, programTitle: string): Array<{
    medicationCode: string;
    medicationDisplay: string;
    dosageText: string;
    note: string;
  }> {
    const list: Array<{ medicationCode: string; medicationDisplay: string; dosageText: string; note: string }> = [];
    if (!formData || typeof formData !== 'object') return list;

    const note = `Specialty Clinic Prescription • Origin: [${programTitle}] ${formCode}`;

    // ── 1. Malaria Program Prescriptions ─────────────────────────────────────
    if (formData.act_given && String(formData.act_given).toUpperCase() !== 'NONE' && String(formData.act_given).toUpperCase() !== 'NO') {
      const actStr = String(formData.act_given).toUpperCase();
      let drugDef = DATA_DICTIONARY_REGISTRY.ACT_AL;
      if (actStr.includes('ASAQ') || actStr.includes('AMODIAQUINE')) drugDef = DATA_DICTIONARY_REGISTRY.ACT_ASAQ;
      else if (actStr.includes('DHA') || actStr.includes('PIPER')) drugDef = DATA_DICTIONARY_REGISTRY.ACT_DHAPPQ;

      list.push({
        medicationCode: drugDef.rxnormCode || drugDef.atcCode || 'RXNORM-141870',
        medicationDisplay: drugDef.display,
        dosageText: formData.dose_quantity ? `${formData.dose_quantity} (${drugDef.defaultDosage})` : (drugDef.defaultDosage || '1 tab PO BID x 3 days'),
        note,
      });
    }

    if (formData.pre_referral_artesunate_given && String(formData.pre_referral_artesunate_given).toUpperCase() !== 'NO') {
      const def = DATA_DICTIONARY_REGISTRY.ARTESUNATE_INJ;
      list.push({
        medicationCode: def.rxnormCode || def.atcCode || 'RXNORM-141865',
        medicationDisplay: def.display,
        dosageText: def.defaultDosage || '2.4 mg/kg IV/IM stat',
        note,
      });
    }

    if (formData.non_act_drugs_given && String(formData.non_act_drugs_given).trim().length > 1 && String(formData.non_act_drugs_given).toUpperCase() !== 'NONE') {
      list.push({
        medicationCode: 'ATC-P01B',
        medicationDisplay: `Supportive / Non-ACT Medication: ${formData.non_act_drugs_given}`,
        dosageText: 'As directed by physician',
        note,
      });
    }

    // ── 2. TB & TPT Prescriptions ─────────────────────────────────────────────
    if (formData.tb_prev_drugs || formData.tptOutcome === 'INITIATED' || formCode === 'IPT' || formCode === 'TB_PREVENTIVE_THERAPHY') {
      const def = DATA_DICTIONARY_REGISTRY.TB_TPT_INH;
      list.push({
        medicationCode: def.rxnormCode || def.atcCode || 'RXNORM-656',
        medicationDisplay: def.display,
        dosageText: def.defaultDosage || '300mg PO daily x 6 months',
        note,
      });
    }

    if (formCode.includes('TB_PATIENT_TREATMENT') || formCode.includes('TB_TREATMENT') || formData.siteOfDisease_7) {
      const def = DATA_DICTIONARY_REGISTRY.TB_REGIMEN_2RHZE;
      list.push({
        medicationCode: def.rxnormCode || def.atcCode || 'RXNORM-1675',
        medicationDisplay: def.display,
        dosageText: def.defaultDosage || 'Daily fixed-dose combination by weight band',
        note,
      });
    }

    if (formData.onCpt_48 === 'YES' || formData.cotrimoxazole_prophylaxis === 'YES' || formData.cotrimoxazolePreventiveTherapyDate_49) {
      const def = DATA_DICTIONARY_REGISTRY.COTRIMOXAZOLE;
      list.push({
        medicationCode: def.rxnormCode || def.atcCode || 'RXNORM-10180',
        medicationDisplay: def.display,
        dosageText: def.defaultDosage || '1 tab PO daily',
        note,
      });
    }

    // ── 3. HIV / ART Prescriptions ────────────────────────────────────────────
    const arvVal = formData.currentArvRegimen || formData.prescribedRegimen || formData.regimen || formData.currentRegimen;
    if (arvVal && String(arvVal).trim().length > 1) {
      const s = String(arvVal).toUpperCase();
      let def = DATA_DICTIONARY_REGISTRY.ARV_TLD;
      if (s.includes('TLE') || s.includes('EFV') || s.includes('EFAVIRENZ')) def = DATA_DICTIONARY_REGISTRY.ARV_TLE;
      else if (s.includes('ATV') || s.includes('LPV') || s.includes('2A') || s.includes('2B')) def = DATA_DICTIONARY_REGISTRY.ARV_AZT_3TC_ATVR;
      else if (s.includes('ABC') || s.includes('PEDIATRIC') || s.includes('P1')) def = DATA_DICTIONARY_REGISTRY.ARV_ABC_3TC_DTG;

      list.push({
        medicationCode: def.rxnormCode || def.atcCode || 'RXNORM-2053293',
        medicationDisplay: def.display,
        dosageText: def.defaultDosage || '1 tablet PO once daily',
        note,
      });
    }

    // ── 4. Immunization Program (EPI) ─────────────────────────────────────────
    if (formCode.includes('IMMUNIZATION') || formCode.includes('EPI')) {
      const antigens = formData.antigens_given || formData.vaccines_administered || [];
      const antigenList = Array.isArray(antigens) ? antigens : String(antigens).split(/[,;]/);

      for (const a of antigenList) {
        const item = String(a).trim().toUpperCase();
        if (!item || item === 'NONE') continue;
        let def = DATA_DICTIONARY_REGISTRY.VACCINE_PENTA;
        if (item.includes('BCG')) def = DATA_DICTIONARY_REGISTRY.VACCINE_BCG;
        else if (item.includes('OPV')) def = DATA_DICTIONARY_REGISTRY.VACCINE_OPV;
        else if (item.includes('IPV')) def = DATA_DICTIONARY_REGISTRY.VACCINE_IPV;
        else if (item.includes('PCV')) def = DATA_DICTIONARY_REGISTRY.VACCINE_PCV;
        else if (item.includes('ROTA')) def = DATA_DICTIONARY_REGISTRY.VACCINE_ROTA;
        else if (item.includes('MEASLES') || item.includes('MCV')) def = DATA_DICTIONARY_REGISTRY.VACCINE_MEASLES;
        else if (item.includes('YELLOW') || item.includes('YF')) def = DATA_DICTIONARY_REGISTRY.VACCINE_YELLOW_FEVER;

        list.push({
          medicationCode: def.atcCode || 'ATC-J07',
          medicationDisplay: def.display,
          dosageText: def.defaultDosage || 'Standard immunizing dose',
          note,
        });
      }
    }

    // ── 5. MCH / Antenatal Prescriptions ──────────────────────────────────────
    if (formData.ifa_given === 'YES' || formData.iron_folate === 'YES') {
      const def = DATA_DICTIONARY_REGISTRY.MCH_IFA;
      list.push({
        medicationCode: def.atcCode || 'ATC-B03AE02',
        medicationDisplay: def.display,
        dosageText: def.defaultDosage || '1 tab PO daily',
        note,
      });
    }

    if (formData.tt_dose && String(formData.tt_dose).toUpperCase() !== 'NONE' && String(formData.tt_dose).toUpperCase() !== 'NO') {
      const def = DATA_DICTIONARY_REGISTRY.MCH_TT_DOSE;
      list.push({
        medicationCode: def.atcCode || 'ATC-J07AM51',
        medicationDisplay: `${def.display} (${formData.tt_dose})`,
        dosageText: def.defaultDosage || '0.5 mL IM',
        note,
      });
    }

    if (formData.iptp_sp || formData.iptpSpDose) {
      const def = DATA_DICTIONARY_REGISTRY.MCH_IPTP_SP;
      list.push({
        medicationCode: def.rxnormCode || def.atcCode || 'RXNORM-10178',
        medicationDisplay: def.display,
        dosageText: def.defaultDosage || '3 tabs PO stat',
        note,
      });
    }

    return list;
  }

  /**
   * Extract laboratory investigations and diagnostic findings from form data
   */
  public static extractLabInvestigations(formData: any, formCode: string, programTitle: string): Array<{
    testCode: string;
    testName: string;
    loincCode?: string;
    resultValue: string;
    interpretation?: string;
    isAbnormal?: boolean;
    unit?: string;
    referenceRange?: string;
    notes?: string;
  }> {
    const list: Array<any> = [];
    if (!formData || typeof formData !== 'object') return list;

    // ── 1. Malaria Lab Tests ──────────────────────────────────────────────────
    if (formData.mrdt_result && String(formData.mrdt_result).toUpperCase() !== 'NOT_DONE') {
      const res = String(formData.mrdt_result).toUpperCase();
      const isPos = res.includes('POS');
      list.push({
        testCode: 'LAB-893651',
        testName: 'Malaria Rapid Diagnostic Test (mRDT)',
        loincCode: '89365-1',
        resultValue: isPos ? 'POSITIVE' : 'NEGATIVE',
        interpretation: isPos ? 'ABNORMAL' : 'NORMAL',
        isAbnormal: isPos,
        referenceRange: 'Negative',
        notes: `Rapid Pf/Pan antigen detection in ${programTitle}`,
      });
    }

    if (formData.microscopy_result && String(formData.microscopy_result).toUpperCase() !== 'NOT_DONE') {
      const res = String(formData.microscopy_result).toUpperCase();
      const isPos = res.includes('POS') || /\d+/.test(res);
      list.push({
        testCode: 'LAB-MAL-002',
        testName: 'Malaria Microscopy (Thick & Thin Blood Film)',
        loincCode: '74558-8',
        resultValue: formData.microscopy_result,
        interpretation: isPos ? 'ABNORMAL' : 'NORMAL',
        isAbnormal: isPos,
        referenceRange: 'No Plasmodium parasites seen',
        notes: `Microscopic smear examination in ${programTitle}`,
      });
    }

    // ── 2. TB Diagnostics ─────────────────────────────────────────────────────
    if (formData.result_31 || formData.genexpertResult || formData.xpertResultDate_30) {
      const res = String(formData.result_31 || formData.genexpertResult || 'MTB Detected').trim();
      const isPos = res.toUpperCase().includes('DETECTED') && !res.toUpperCase().includes('NOT DETECTED');
      list.push({
        testCode: 'LAB-TB-001',
        testName: 'GeneXpert MTB/RIF Assay (Direct Sputum)',
        loincCode: '89371-9',
        resultValue: res,
        interpretation: isPos ? 'ABNORMAL' : 'NORMAL',
        isAbnormal: isPos,
        referenceRange: 'MTB Not Detected',
        notes: `GeneXpert nucleic acid amplification test in ${programTitle}`,
      });
    }

    const afbRes = formData.smearResult_21 || formData.smearResult_36 || formData.afbResult || formData.smearResult;
    if (afbRes) {
      const res = String(afbRes).trim();
      const isPos = res.toUpperCase().includes('POS') || res.includes('+');
      list.push({
        testCode: 'LAB-TB-002',
        testName: 'Sputum Acid-Fast Bacilli (AFB) Smear Microscopy',
        loincCode: '11477-7',
        resultValue: res,
        interpretation: isPos ? 'ABNORMAL' : 'NORMAL',
        isAbnormal: isPos,
        referenceRange: 'No AFB seen',
        notes: `Ziehl-Neelsen / Auramine O staining in ${programTitle}`,
      });
    }

    // ── 3. HIV Labs ───────────────────────────────────────────────────────────
    if (formData.viralLoadValue != null) {
      const val = Number(formData.viralLoadValue);
      const isSuppressed = val < 50;
      list.push({
        testCode: 'LAB-VL-001',
        testName: 'HIV-1 RNA Viral Load Quantitative (PCR)',
        loincCode: '25836-8',
        resultValue: `${val.toLocaleString()} copies/mL`,
        interpretation: isSuppressed ? 'NORMAL' : 'ABNORMAL',
        isAbnormal: !isSuppressed,
        unit: 'copies/mL',
        referenceRange: '< 20 copies/mL (Target Not Detected)',
        notes: isSuppressed ? 'Virologically Suppressed' : 'Unsuppressed / Elevated Viremia',
      });
    }

    if (formData.cd4Value != null) {
      const val = Number(formData.cd4Value);
      const isLow = val < 350;
      list.push({
        testCode: 'LAB-CD4-001',
        testName: 'CD4 T-Lymphocyte Absolute Count (Flow Cytometry)',
        loincCode: '24467-3',
        resultValue: `${val} cells/µL`,
        interpretation: isLow ? 'ABNORMAL' : 'NORMAL',
        isAbnormal: isLow,
        unit: 'cells/µL',
        referenceRange: '500 - 1500 cells/µL',
        notes: isLow ? 'Severe / Advanced Immunodeficiency' : 'Adequate Immunological Status',
      });
    }

    if (formData.hiv_test && String(formData.hiv_test).toUpperCase() !== 'NOT_DONE') {
      const res = String(formData.hiv_test).toUpperCase();
      const isPos = res.includes('POS') || res.includes('REACTIVE');
      list.push({
        testCode: 'LAB-HIV-001',
        testName: 'HIV 1 and 2 Ab Rapid Test',
        loincCode: '75622-1',
        resultValue: isPos ? 'REACTIVE' : 'NON-REACTIVE',
        interpretation: isPos ? 'ABNORMAL' : 'NORMAL',
        isAbnormal: isPos,
        referenceRange: 'Non-reactive',
        notes: `Rapid HIV antibody screening in ${programTitle}`,
      });
    }

    // ── 4. Polio / AFP Surveillance ───────────────────────────────────────────
    if (formData.poliovirus_isolation || formData.npev_isolation) {
      const res = formData.poliovirus_isolation || 'Negative';
      const isPos = String(res).toUpperCase().includes('WPV') || String(res).toUpperCase().includes('CVDPV') || String(res).toUpperCase().includes('POSITIVE');
      list.push({
        testCode: 'LAB-POLIO-001',
        testName: 'Enterovirus / Poliovirus Isolation (Stool Specimen)',
        loincCode: '6584-7',
        resultValue: String(res),
        interpretation: isPos ? 'ABNORMAL' : 'NORMAL',
        isAbnormal: isPos,
        referenceRange: 'Negative / No virus isolated',
        notes: `WHO accredited polio reference laboratory results in ${programTitle}`,
      });
    }

    // ── 5. MCH Syphilis Screening ─────────────────────────────────────────────
    if (formData.syphilis_test && String(formData.syphilis_test).toUpperCase() !== 'NOT_DONE') {
      const res = String(formData.syphilis_test).toUpperCase();
      const isPos = res.includes('POS') || res.includes('REACTIVE');
      list.push({
        testCode: 'LAB-SYPH-001',
        testName: 'Treponema pallidum Rapid Syphilis Screen',
        loincCode: '22461-8',
        resultValue: isPos ? 'REACTIVE' : 'NON-REACTIVE',
        interpretation: isPos ? 'ABNORMAL' : 'NORMAL',
        isAbnormal: isPos,
        referenceRange: 'Non-reactive',
        notes: `Rapid syphilis point-of-care test in ${programTitle}`,
      });
    }

    return list;
  }

  /**
   * Retroactively backfill past encounter records for a patient
   */
  public static async backfillPatientEncounters(patientId: string): Promise<number> {
    try {
      const encounters = await prisma.nmrsEncounterRecord.findMany({
        where: { patientId },
        include: { formSchema: true },
        orderBy: { encounterDate: 'asc' },
      });

      let total = 0;
      for (const enc of encounters) {
        if (!enc.formData || typeof enc.formData !== 'object') continue;
        const schema = enc.formSchema || {
          id: enc.formSchemaId || 'schema-unknown',
          formCode: enc.encounterType || 'UNKNOWN_FORM',
          formName: enc.encounterType || 'Encounter Form',
          category: 'SPECIALTY_CLINIC',
        };

        const res = await this.integrateEncounter({
          patientId,
          formSchemaId: schema.id,
          formCode: schema.formCode,
          formName: schema.formName,
          category: (schema as any).category || 'SPECIALTY_CLINIC',
          formData: enc.formData,
          encounterDate: enc.encounterDate || new Date(),
          clinicianName: enc.clinicianName || 'Specialty Clinician',
          clinicianId: enc.clinicianId || undefined,
          encounterRecordId: enc.id,
        });

        if (res.vitalsCreated || res.rxCount > 0 || res.labCount > 0) {
          total++;
        }
      }
      return total;
    } catch (e: any) {
      console.warn(`[ClinicalIntegrationService] Backfill failed for patient ${patientId}:`, e.message);
      return 0;
    }
  }

  /**
   * Helper to map Data Dictionary terms and form keys to CIEL Concept UUIDs for OpenMRS REST sync
   */
  public static mapToCielConcept(key: string): TerminologyMapping | null {
    if (!key) return null;
    const cleanKey = key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    return DATA_DICTIONARY_REGISTRY[cleanKey] || null;
  }
}
