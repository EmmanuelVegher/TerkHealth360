// CIEL / OpenMRS Concept Dictionary Mappings for Nigeria Medical Records System (NMRS)

export interface CielConceptDefinition {
  localKey: string;
  cielId: number;
  displayName: string;
  datatype: 'Numeric' | 'Coded' | 'Datetime' | 'Text' | 'Boolean';
  category: 'LAB' | 'DRUG' | 'DIAGNOSIS' | 'OBSERVATION' | 'CLINICAL_STAGE';
  options?: Array<{ label: string; cielValue: number | string }>;
}

export const CIEL_CONCEPT_DICTIONARY: CielConceptDefinition[] = [
  // ── 1. HIV Diagnostic & Viral Load Labs ────────────────────────────────────
  {
    localKey: 'HIV_VIRAL_LOAD',
    cielId: 856,
    displayName: 'HIV Viral Load (Quantitative)',
    datatype: 'Numeric',
    category: 'LAB'
  },
  {
    localKey: 'HIV_VIRAL_LOAD_QUALITATIVE',
    cielId: 1305,
    displayName: 'HIV Viral Load (Qualitative / Suppression)',
    datatype: 'Coded',
    category: 'LAB',
    options: [
      { label: 'Target Not Detected (<20 copies/mL)', cielValue: 1306 },
      { label: 'Suppressed (<50 copies/mL)', cielValue: 165153 },
      { label: 'Low-Level Viremia (50-999 copies/mL)', cielValue: 165154 },
      { label: 'Unsuppressed (>=1,000 copies/mL)', cielValue: 165155 }
    ]
  },
  {
    localKey: 'CD4_COUNT',
    cielId: 5497,
    displayName: 'CD4 Absolute Count (cells/µL)',
    datatype: 'Numeric',
    category: 'LAB'
  },
  {
    localKey: 'CD4_PERCENT',
    cielId: 730,
    displayName: 'CD4 Percentage (%)',
    datatype: 'Numeric',
    category: 'LAB'
  },

  // ── 2. Clinical Staging & Patient Status ────────────────────────────────────
  {
    localKey: 'WHO_CLINICAL_STAGE',
    cielId: 5356,
    displayName: 'WHO HIV Clinical Stage',
    datatype: 'Coded',
    category: 'CLINICAL_STAGE',
    options: [
      { label: 'Stage 1 (Asymptomatic)', cielValue: 1204 },
      { label: 'Stage 2 (Mild Symptoms)', cielValue: 1205 },
      { label: 'Stage 3 (Advanced Symptoms)', cielValue: 1206 },
      { label: 'Stage 4 (Severe / AIDS-defining)', cielValue: 1207 }
    ]
  },
  {
    localKey: 'FUNCTIONAL_STATUS',
    cielId: 1658,
    displayName: 'Patient Functional Status',
    datatype: 'Coded',
    category: 'OBSERVATION',
    options: [
      { label: 'Working (Able to perform normal work)', cielValue: 159468 },
      { label: 'Ambulatory (Able to perform ADLs, unable to work)', cielValue: 159467 },
      { label: 'Bedridden (Confined to bed >50% of waking hours)', cielValue: 160432 }
    ]
  },
  {
    localKey: 'TB_STATUS',
    cielId: 1659,
    displayName: 'TB Screening Status',
    datatype: 'Coded',
    category: 'OBSERVATION',
    options: [
      { label: 'No Signs or Symptoms of TB', cielValue: 1660 },
      { label: 'Presumptive TB (Cough, Fever, Weight Loss, Night Sweats)', cielValue: 142177 },
      { label: 'Confirmed TB (On Treatment)', cielValue: 1661 },
      { label: 'TB Confirmed (Not yet on treatment)', cielValue: 1662 },
      { label: 'TB Treatment Completed / Cured', cielValue: 1663 }
    ]
  },
  {
    localKey: 'ARV_ADHERENCE_RATE',
    cielId: 165290,
    displayName: 'ARV Medication Adherence',
    datatype: 'Coded',
    category: 'OBSERVATION',
    options: [
      { label: 'Good (>=95% adherence - missed <2 doses/month)', cielValue: 159405 },
      { label: 'Fair (85-94% adherence - missed 2-4 doses/month)', cielValue: 159406 },
      { label: 'Poor (<85% adherence - missed >4 doses/month)', cielValue: 159407 }
    ]
  },

  // ── 3. Antiretroviral Regimen Codes (Nigeria FMoH / NDR) ───────────────────
  {
    localKey: 'REGIMEN_1A',
    cielId: 165681,
    displayName: '1a: TDF + 3TC + DTG (Tenofovir/Lamivudine/Dolutegravir)',
    datatype: 'Coded',
    category: 'DRUG'
  },
  {
    localKey: 'REGIMEN_1B',
    cielId: 164505,
    displayName: '1b: TDF + 3TC + EFV (Tenofovir/Lamivudine/Efavirenz)',
    datatype: 'Coded',
    category: 'DRUG'
  },
  {
    localKey: 'REGIMEN_1C',
    cielId: 165682,
    displayName: '1c: TDF + FTC + DTG (Tenofovir/Emtricitabine/Dolutegravir)',
    datatype: 'Coded',
    category: 'DRUG'
  },
  {
    localKey: 'REGIMEN_2A',
    cielId: 165686,
    displayName: '2a: AZT + 3TC + ATV/r (Zidovudine/Lamivudine/Atazanavir/ritonavir)',
    datatype: 'Coded',
    category: 'DRUG'
  },
  {
    localKey: 'REGIMEN_2B',
    cielId: 165687,
    displayName: '2b: AZT + 3TC + LPV/r (Zidovudine/Lamivudine/Lopinavir/ritonavir)',
    datatype: 'Coded',
    category: 'DRUG'
  },
  {
    localKey: 'REGIMEN_P1',
    cielId: 165691,
    displayName: 'P1 (Pediatric): ABC + 3TC + DTG (Abacavir/Lamivudine/Dolutegravir)',
    datatype: 'Coded',
    category: 'DRUG'
  },

  // ── 4. Opportunistic Infections & Prophylaxis ──────────────────────────────
  {
    localKey: 'COTRIMOXAZOLE_PROPHYLAXIS',
    cielId: 165257,
    displayName: 'Cotrimoxazole (CTX) Prophylaxis',
    datatype: 'Boolean',
    category: 'OBSERVATION'
  },
  {
    localKey: 'TB_PREVENTIVE_THERAPY',
    cielId: 165275,
    displayName: 'TB Preventive Therapy (TPT / Isoniazid)',
    datatype: 'Coded',
    category: 'OBSERVATION',
    options: [
      { label: 'Initiated Today', cielValue: 165276 },
      { label: 'Currently On TPT', cielValue: 165277 },
      { label: 'Completed TPT Course (6 months)', cielValue: 165278 },
      { label: 'Not Eligible / Contraindicated', cielValue: 165279 }
    ]
  },
  {
    localKey: 'NEXT_APPOINTMENT_DATE',
    cielId: 5096,
    displayName: 'Return Visit / Next Clinic Appointment Date',
    datatype: 'Datetime',
    category: 'OBSERVATION'
  }
];
