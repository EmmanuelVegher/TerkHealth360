// CIEL & OpenMRS Concept Resolver for Nigeria Medical Records System (NMRS)
// Maps OpenMRS concept IDs (integer or UUID) to human-readable concept names and translates coded values.
// Handles mapping from the OpenMRS concept and concept_name database tables.

export const CIEL_CONCEPT_ID_MAP: Record<number, string> = {
  // ── Vitals & Physical Measurements ──
  5089: 'Weight (KG)',
  5090: 'Height (CM)',
  5088: 'Temperature (°C)',
  5085: 'Systolic Blood Pressure (mmHg)',
  5086: 'Diastolic Blood Pressure (mmHg)',
  5087: 'Pulse Rate (bpm)',
  5092: 'Respiratory Rate (breaths/min)',
  5242: 'Respiratory Rate (breaths/min)',
  1342: 'Body Mass Index (BMI)',
  165039: 'Mid-Upper Arm Circumference (MUAC)',

  // ── HIV Diagnostic, Viral Load & Labs ──
  856: 'HIV Viral Load (Quantitative)',
  1305: 'HIV Viral Load (Qualitative)',
  5497: 'CD4 Absolute Count (cells/µL)',
  730: 'CD4 Percentage (%)',
  165050: 'WHO HIV Clinical Stage',
  5356: 'WHO HIV Clinical Stage',
  165708: 'Current Antiretroviral Regimen',
  164506: 'First Line ARV Regimen',
  164507: 'Second Line ARV Regimen',
  164513: 'Third Line / Salvage ARV Regimen',
  165681: 'Regimen: 1a (TDF + 3TC + DTG)',
  164505: 'Regimen: 1b (TDF + 3TC + EFV)',
  165682: 'Regimen: 1c (TDF + FTC + DTG)',
  165686: 'Regimen: 2a (AZT + 3TC + ATV/r)',
  165687: 'Regimen: 2b (AZT + 3TC + LPV/r)',
  165691: 'Regimen: P1 (ABC + 3TC + DTG)',
  165031: 'ART Start Date',
  165435: 'HIV Program Visit Type',
  160534: 'PEPFAR Unique ART Identifier',
  163281: 'Viral Load Sample Collection Date',
  159376: 'CD4 Sample Collection Date',

  // ── WHO Clinical Stages (Values) ──
  1204: 'WHO Stage 1 (Asymptomatic)',
  1205: 'WHO Stage 2 (Mild Symptoms)',
  1206: 'WHO Stage 3 (Advanced Symptoms)',
  1207: 'WHO Stage 4 (Severe / AIDS Defining)',

  // ── TB Program & Screening ──
  1659: 'TB Screening Status',
  1660: 'No Signs or Symptoms of TB',
  142177: 'Presumptive TB (Investigate)',
  1661: 'Confirmed TB (On Treatment)',
  1662: 'Confirmed TB (Not on Treatment)',
  1663: 'TB Treatment Completed / Cured',
  165275: 'TB Preventive Therapy (TPT Status)',
  165276: 'TPT Initiated Today',
  165277: 'Currently on TPT (Isoniazid)',
  165278: 'Completed TPT Course',
  165279: 'TPT Contraindicated / Ineligible',

  // ── Clinical Adherence & Functional Status ──
  165290: 'ARV Medication Adherence Rate',
  159405: 'Good Adherence (>=95%)',
  159406: 'Fair Adherence (85-94%)',
  159407: 'Poor Adherence (<85%)',
  1658: 'Patient Functional Status',
  159468: 'Working (Active normal activities)',
  159467: 'Ambulatory (Unable to work, mobile)',
  160432: 'Bedridden (Confined to bed)',

  // ── Opportunistic Infections & Prophylaxis ──
  165257: 'Cotrimoxazole (CTX) Prophylaxis',
  165700: 'Prescription Duration (Months)',
  159368: 'Medication Refill Duration',
  1622: 'Next Prescription Refill Date',
  5096: 'Next Appointment Date',

  // ── General Boolean & Responses ──
  1065: 'Yes',
  1066: 'No',
  1067: 'Unknown',
  165153: 'Target Not Detected / Suppressed (<50 copies/mL)',
  165154: 'Low-Level Viremia (50-999 copies/mL)',
  165155: 'Unsuppressed (>=1,000 copies/mL)',

  // ── PMTCT, Maternal & Reproductive Health ──
  5272: 'Pregnancy Status',
  5596: 'Estimated Date of Delivery (EDD)',
  165567: 'Antenatal Care (ANC) Registration Number',
  165384: 'Family Planning Method',
  190: 'Condoms',
  780: 'Oral Contraceptive Pills',
  5279: 'Injectable Contraceptive (Depo-Provera)',
  5622: 'Other Contraceptive',

  // ── Laboratory Investigations ──
  21: 'Hemoglobin (g/dL)',
  654: 'Serum Alanine Aminotransferase (ALT/SGPT)',
  790: 'Serum Creatinine (mg/dL)',
  302: 'Urinalysis Protein',
  164436: 'GeneXpert MTB/RIF Result',
  32: 'Malaria Rapid Diagnostic Test (RDT)',

  // ── Clinical Notes & Plans ──
  160716: 'Clinical Assessment & Action Plan',
  160531: 'Reason for Encounter / Clinical Impression',
  165414: 'Missed Drug Doses in Last 30 Days',
  165415: 'Medication Adverse Drug Reaction (ADR)'
};

export const CIEL_CONCEPT_UUID_MAP: Record<string, string> = {
  '856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'HIV Viral Load (Quantitative)',
  '1305AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'HIV Viral Load (Qualitative)',
  '5497AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'CD4 Absolute Count (cells/µL)',
  '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Weight (KG)',
  '5090AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Height (CM)',
  '5088AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Temperature (°C)',
  '5085AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Systolic Blood Pressure (mmHg)',
  '5086AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Diastolic Blood Pressure (mmHg)',
  '5087AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Pulse Rate (bpm)',
  '5356AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'WHO HIV Clinical Stage',
  '1659AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'TB Screening Status',
  '165290AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'ARV Medication Adherence Rate',
  '1658AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Patient Functional Status',
  '165257AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Cotrimoxazole (CTX) Prophylaxis',
  '165275AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'TB Preventive Therapy (TPT Status)',
  '5096AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Next Appointment Date'
};

// In-memory dynamic cache for concepts resolved from live OpenMRS concept_name table
const DYNAMIC_CONCEPT_CACHE = new Map<string, string>();

/**
 * Dynamically fetch concept name from OpenMRS concept table via REST if connected.
 */
export async function fetchConceptNameFromOpenmrs(
  conceptIdOrUuid: number | string,
  httpClient?: any
): Promise<string | null> {
  const key = String(conceptIdOrUuid);
  if (DYNAMIC_CONCEPT_CACHE.has(key)) {
    return DYNAMIC_CONCEPT_CACHE.get(key)!;
  }

  const num = Number(conceptIdOrUuid);
  if (!isNaN(num) && CIEL_CONCEPT_ID_MAP[num]) {
    return CIEL_CONCEPT_ID_MAP[num];
  }
  if (CIEL_CONCEPT_UUID_MAP[key]) {
    return CIEL_CONCEPT_UUID_MAP[key];
  }

  if (httpClient) {
    try {
      const res = await httpClient.get(`/concept/${conceptIdOrUuid}?v=custom:(id,uuid,name:(name),display)`, { timeout: 3000 });
      const name = res.data?.name?.name || res.data?.display;
      if (name) {
        DYNAMIC_CONCEPT_CACHE.set(key, name);
        if (res.data?.id) DYNAMIC_CONCEPT_CACHE.set(String(res.data.id), name);
        if (res.data?.uuid) DYNAMIC_CONCEPT_CACHE.set(res.data.uuid, name);
        return name;
      }
    } catch {}
  }

  return null;
}

/**
 * Resolve an OpenMRS observation concept to a clean human-readable name.
 */
export function resolveConceptName(concept: any, conceptId?: number | string): string {
  if (!concept && !conceptId) return 'Clinical Observation';

  // 1. Check in-memory dynamic cache first
  const searchKey = String(concept?.conceptId || conceptId || concept?.id || concept?.uuid || '');
  if (searchKey && DYNAMIC_CONCEPT_CACHE.has(searchKey)) {
    return DYNAMIC_CONCEPT_CACHE.get(searchKey)!;
  }

  // 2. Check if concept has an embedded name or display from OpenMRS REST
  if (concept?.name?.name) return concept.name.name;
  if (concept?.display) return concept.display;
  if (typeof concept?.name === 'string') return concept.name;

  // 3. Check conceptId in CIEL ID map
  const numId = Number(concept?.conceptId || conceptId || concept?.id);
  if (!isNaN(numId) && CIEL_CONCEPT_ID_MAP[numId]) {
    return CIEL_CONCEPT_ID_MAP[numId];
  }

  // 4. Check UUID map
  const uuid = concept?.uuid || (typeof conceptId === 'string' ? conceptId : '');
  if (uuid && CIEL_CONCEPT_UUID_MAP[uuid]) {
    return CIEL_CONCEPT_UUID_MAP[uuid];
  }

  // 5. Fallback
  if (!isNaN(numId) && numId > 0) {
    return `Concept #${numId}`;
  }

  return 'Clinical Observation';
}

/**
 * Resolve an observation's value (handling coded concept IDs, numeric, text, and dates)
 */
export function resolveObsValue(obs: any): any {
  if (!obs) return null;

  // 1. If valueCoded exists, resolve its concept name
  if (obs.valueCoded) {
    if (obs.valueCoded.name?.name) return obs.valueCoded.name.name;
    if (obs.valueCoded.display) return obs.valueCoded.display;
    const codedId = Number(obs.valueCoded.conceptId || obs.valueCoded.id);
    if (!isNaN(codedId) && CIEL_CONCEPT_ID_MAP[codedId]) {
      return CIEL_CONCEPT_ID_MAP[codedId];
    }
    const codedKey = String(codedId || obs.valueCoded.uuid);
    if (DYNAMIC_CONCEPT_CACHE.has(codedKey)) {
      return DYNAMIC_CONCEPT_CACHE.get(codedKey);
    }
  }

  // 2. If value is a concept object
  if (obs.value && typeof obs.value === 'object') {
    if (obs.value.name?.name) return obs.value.name.name;
    if (obs.value.display) return obs.value.display;
    if (obs.value.uuid && CIEL_CONCEPT_UUID_MAP[obs.value.uuid]) {
      return CIEL_CONCEPT_UUID_MAP[obs.value.uuid];
    }
  }

  // 3. If numeric
  if (obs.valueNumeric !== undefined && obs.valueNumeric !== null) {
    return Number(obs.valueNumeric);
  }

  // 4. If text
  if (obs.valueText !== undefined && obs.valueText !== null) {
    return String(obs.valueText);
  }

  // 5. If date
  if (obs.valueDatetime) {
    return obs.valueDatetime;
  }

  // 6. If direct numeric concept value
  const numVal = Number(obs.value);
  if (!isNaN(numVal) && CIEL_CONCEPT_ID_MAP[numVal]) {
    return CIEL_CONCEPT_ID_MAP[numVal];
  }

  return obs.value !== undefined ? obs.value : null;
}
