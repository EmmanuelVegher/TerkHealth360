/**
 * OpenMRS ESM Form Engine - Legacy 2.x to ESM 3.x Data Normalizer
 * Bridges historical records entered via HTML Form Entry / JSP 2.x forms and
 * OpenMRS observations to the ESM JSON schema questions and concept UUIDs.
 */

export const CIEL_CONCEPT_MAP: Record<string, string> = {
  // Adult 1st Line ARV Regimens
  '165681': '8a343013-0216-44e0-aefe-53909ffd5631', // TDF-3TC-DTG
  '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '8a343013-0216-44e0-aefe-53909ffd5631',
  '164505': '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // TDF-3TC-EFV
  '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  '1652': '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',   // AZT-3TC-NVP
  '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  '165686': '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // AZT-3TC-NVP (CIEL)
  '165686AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  '165692': '14c41615-9c0e-4254-b4b1-770956d390e9', // ABC-3TC-DTG (CIEL)
  '165692AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '14c41615-9c0e-4254-b4b1-770956d390e9',
  '165682': 'd20de0fd-8c89-423b-be81-dd357e65c206', // TDF-FTC-DTG
  '162565': '162565AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // TDF-3TC-NVP

  // Drug Strengths & OpenMRS Concepts
  '300_300_50mg': '300/300/50mg',
  '300_300_600mg': '300/300/600mg',
  '300_150_200mg': '300/150/200mg',
  '600_300_50mg': '600/300/50mg',
  '600_300_600mg': '600/300/600mg',
  '300_300mg': '300/300mg',
  '300_150mg': '300/150mg',
  '300_100mg': '300/100mg',
  '200_50mg': '200/50mg',
  '0cd9c98e-7f52-48b9-a987-404ec90cc5fe': '300/300/50mg',
  '166044': '300/300/50mg',
  '300/300/50Mg': '300/300/50mg',
  '300/300/50mg': '300/300/50mg',
  '5ec4bfef-2e06-43ea-83f0-51de36117824': '8a343013-0216-44e0-aefe-53909ffd5631',
  '166043': '8a343013-0216-44e0-aefe-53909ffd5631',
  'Tenofovir/Lamivudine/Dolutegravir': '8a343013-0216-44e0-aefe-53909ffd5631',
  'c03561ed-1402-4bfe-b95d-9547fe6b9bf7': 'c03561ed-1402-4bfe-b95d-9547fe6b9bf7', // 960mg
  '165062': 'c03561ed-1402-4bfe-b95d-9547fe6b9bf7',
  '960mg': 'c03561ed-1402-4bfe-b95d-9547fe6b9bf7',
  '960Mg': 'c03561ed-1402-4bfe-b95d-9547fe6b9bf7',
  'd6a11b94-efe5-415e-8071-29d75356bac0': 'd6a11b94-efe5-415e-8071-29d75356bac0', // 600mg
  '165616': 'd6a11b94-efe5-415e-8071-29d75356bac0',
  '600mg': 'd6a11b94-efe5-415e-8071-29d75356bac0',
  '600Mg': 'd6a11b94-efe5-415e-8071-29d75356bac0',
  'abbb66b8-61c9-4b58-bad6-edf1efa546e1': 'abbb66b8-61c9-4b58-bad6-edf1efa546e1', // 300mg
  '1679': 'abbb66b8-61c9-4b58-bad6-edf1efa546e1',
  '300mg': 'abbb66b8-61c9-4b58-bad6-edf1efa546e1',
  '300Mg': 'abbb66b8-61c9-4b58-bad6-edf1efa546e1',
  'dbf8a287-3c82-440b-bfc3-a4b9432f9183': 'dbf8a287-3c82-440b-bfc3-a4b9432f9183', // Cotrimoxazole
  '165257': 'dbf8a287-3c82-440b-bfc3-a4b9432f9183',
  'Cotrimoxazole Prophylaxis': 'dbf8a287-3c82-440b-bfc3-a4b9432f9183',
  'Cotrimoxazole prophylaxis': 'dbf8a287-3c82-440b-bfc3-a4b9432f9183',
  'Cotrimoxazole': 'dbf8a287-3c82-440b-bfc3-a4b9432f9183',
  'c83188a1-f411-49f5-a1b6-19881a0354a2': 'c83188a1-f411-49f5-a1b6-19881a0354a2', // Lenacapavir
  '167516': 'c83188a1-f411-49f5-a1b6-19881a0354a2',
  'Lenacapavir': 'c83188a1-f411-49f5-a1b6-19881a0354a2',
  '6f973a60-16a5-49bc-9278-300a9e998646': '6f973a60-16a5-49bc-9278-300a9e998646', // 2 BD
  '165721': '6f973a60-16a5-49bc-9278-300a9e998646',
  '2 BD': '6f973a60-16a5-49bc-9278-300a9e998646',
  '160862': '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Once daily
  'Once daily': '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  '656AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '656AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Isoniazid
  'Isoniazid': '656AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

  // Purpose of Prescription / Treatment Type
  'ART': '9b49eb5e-9ca9-4494-a2ff-f1d62b6feecc',
  'Antiretroviral Therapy': '9b49eb5e-9ca9-4494-a2ff-f1d62b6feecc',
  'Non-ART': '0df2d48c-9713-4b89-853d-93507f0d7e21',
  'PrEP': '5f21852c-a440-40b9-b265-0e0ef417306e',

  // Visit Type
  'Initial Visit': '164180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'Follow-up Visit': '160530AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'Return Visit Type': '160530AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

  // Refill / Boolean
  'Yes': '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  '1065': '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'No': '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  '1066': '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

  // DSD Status / Dispensing Modality
  'Facility-Based': '60882cd1-1f42-485b-8afb-cd988282251e',
  'Facility Based Dispensing': '60882cd1-1f42-485b-8afb-cd988282251e',
  'Non-devolved': '166145AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'Community-Based': '01fe63b3-b308-4065-aa42-69d3fc57f3dc',
  'Community ART Group (CAG)': 'c291af62-d00e-4ace-a672-f6f965b325ff',
  'Fast Track Refill': 'd291af62-d00e-4ace-a672-f6f965b325ff',

  // Treatment Age Group
  'Adult': 'a291af62-d00e-4ace-a672-f6f965b325fe',
  'Child': '1528AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

  // Regimen Line
  'Adult 1st Line': '164506AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'Adult 1st Line ARV Regimen': '164506AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'Adult 2nd Line': '164513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'Adult 2nd Line ARV Regimen': '164513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'Adult 3rd Line': '73fbac92-4663-43c1-ad89-5fe0bc2e52c7',
  'Child 1st Line': '164507AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'Child 2nd Line': '164514AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

  // Functional Status
  'Physically able to work': '165889AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'Working': '165889AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'Ambulatory': '165888AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'Bedridden': '165887AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

  // TB Status
  'No signs or symptoms of disease': '1660AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'No Signs or Symptoms of TB': '1660AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

/**
 * Normalizes any date string (ISO with TZ, UTC, YYYY-MM-DD) safely into YYYY-MM-DD
 * avoiding timezone day shifts.
 */
export function normalizeDateToYMD(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    // If it starts with YYYY-MM-DD, extract directly to prevent timezone shift
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Resolves a matching answer concept UUID from a list of schema answers
 * given a legacy value (e.g. numeric CIEL ID, formatted label, or code).
 */
export function matchAnswerConcept(val: any, answers: Array<{ concept?: string; label?: string; value?: string }>): string | null {
  if (val === undefined || val === null || val === '') return null;
  const strVal = String(val).trim().toLowerCase();

  // 1. Check known concept map
  if (CIEL_CONCEPT_MAP[val]) {
    const targetUuid = CIEL_CONCEPT_MAP[val].toLowerCase();
    const found = answers.find(a => (a.concept && a.concept.toLowerCase() === targetUuid));
    if (found) return found.concept || found.value || null;
  }

  // 2. Direct match on concept, value, or label
  for (const a of answers) {
    const c = (a.concept || '').toLowerCase();
    const v = (a.value || '').toLowerCase();
    const l = (a.label || '').toLowerCase();
    if (c === strVal || v === strVal || l === strVal) {
      return a.concept || a.value || a.label || null;
    }
  }

  // 3. Normalized / stripped fuzzy match
  // E.g. "1a: TDF + 3TC + DTG" -> "tdf3tcdtg" matches "TDF-3TC-DTG" -> "tdf3tcdtg"
  const strippedStrVal = strVal.replace(/^([0-9]+[a-z]?:\s*)/i, '').replace(/[^a-z0-9]/g, '');
  if (strippedStrVal) {
    for (const a of answers) {
      const strippedLabel = (a.label || '').toLowerCase().replace(/^([0-9]+[a-z]?:\s*)/i, '').replace(/[^a-z0-9]/g, '');
      if (strippedLabel === strippedStrVal || strippedLabel.includes(strippedStrVal) || strippedStrVal.includes(strippedLabel)) {
        return a.concept || a.value || a.label || null;
      }
    }
  }

  return null;
}

/**
 * Normalizes a raw legacy form data dictionary into schema-ready values.
 * Fills in key aliases, concept UUIDs, and dependency fields (e.g. Treatment_age_group,
 * regimen_line, refill) so that ESM dynamic hide expressions don't hide sections.
 */
export function normalizeLegacyFormData(
  raw: Record<string, any> = {},
  patientContext: Record<string, any> = {}
): Record<string, any> {
  const norm: Record<string, any> = { ...raw };

  // ── 1. Date Normalization ──────────────────────────────────────────────────
  const rawVisitDate =
    raw.visitDate ||
    raw.visit_date ||
    raw.encounterDatetime ||
    raw.encounterDate ||
    raw['Ordered Date'] ||
    raw.dateOrdered ||
    raw.encounter_datetime;

  if (rawVisitDate) {
    const cleanYmd = normalizeDateToYMD(rawVisitDate);
    norm.visitDate = cleanYmd;
    norm.encounterDatetime = cleanYmd;
    norm.encounterDate = cleanYmd;
    norm.dateOrdered = cleanYmd;
    norm.orderedDate = cleanYmd;
  }

  const rawVlDate = raw.viralLoadDate || raw.viral_load_date || raw.lastVlDate || raw['Viral Load Date'];
  if (rawVlDate) {
    norm.viralLoadDate = normalizeDateToYMD(rawVlDate);
  }

  const rawReturnDate =
    raw['RETURN VISIT DATE'] ||
    raw.returnVisitDate ||
    raw.calculated_next_appointment_date ||
    raw.next_appointment_date ||
    raw.nextAppointmentDate;
  if (rawReturnDate) {
    const cleanReturnYmd = normalizeDateToYMD(rawReturnDate);
    norm.calculated_next_appointment_date = cleanReturnYmd;
    norm.next_appointment_date = cleanReturnYmd;
    norm.returnVisitDate = cleanReturnYmd;
    norm['RETURN VISIT DATE'] = cleanReturnYmd;
  }

  // ── 2. Regimen & Medication Normalization ─────────────────────────────────
  const rawRegimen =
    raw.dispensedRegimen ||
    raw['Adult 1st Line ARV Regimen'] ||
    raw.currentRegimen ||
    raw.Adult_1st_Line_Regimens ||
    raw.regimen ||
    raw.Adult_2nd_line_ARV_regimen ||
    raw.Child_1st_line_ARV_regimen;

  if (rawRegimen) {
    const regStr = String(rawRegimen).trim();
    norm.dispensedRegimen = regStr;

    // Check if it's TDF/3TC/DTG (165681)
    if (
      regStr === '165681' ||
      regStr.includes('TDF') ||
      regStr.toLowerCase().includes('dtg') ||
      regStr.startsWith('1a')
    ) {
      norm.Adult_1st_Line_Regimens = '8a343013-0216-44e0-aefe-53909ffd5631';
      norm.Drugs_ART_1 = '8a343013-0216-44e0-aefe-53909ffd5631';
      norm.name_of_drug_pharm = 'Tenofovir / Lamivudine / Dolutegravir (TDF/3TC/DTG)';
    } else if (regStr === '164505' || regStr.includes('EFV') || regStr.startsWith('1b')) {
      norm.Adult_1st_Line_Regimens = '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      norm.Drugs_ART_1 = '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    } else if (regStr === '1652' || regStr.includes('AZT') || regStr.includes('NVP')) {
      norm.Adult_1st_Line_Regimens = '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      norm.Drugs_ART_1 = '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    } else {
      norm.Adult_1st_Line_Regimens = regStr;
      norm.Drugs_ART_1 = regStr;
    }

    // Auto-fulfill ESM prerequisite fields to unhide regimen lines:
    // Treatment_age_group: Adult ('a291af62-d00e-4ace-a672-f6f965b325fe')
    // regimen_line: Adult 1st Line ('164506AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    // Treatment_type: ART ('9b49eb5e-9ca9-4494-a2ff-f1d62b6feecc')
    norm.Treatment_age_group = norm.Treatment_age_group || 'a291af62-d00e-4ace-a672-f6f965b325fe';
    norm.regimen_line = norm.regimen_line || '164506AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    norm.Treatment_type = norm.Treatment_type || '9b49eb5e-9ca9-4494-a2ff-f1d62b6feecc';

    // Ensure Drug Strength for ARV Drug 1
    const rawStrength = norm.Drug_Strength_ART_1 || raw.Drug_Strength_ART_1 || raw['ARV Drug Strength'] || raw.drug_strength;
    if (rawStrength) {
      const strStrength = String(rawStrength);
      if (
        strStrength === '166044' ||
        strStrength === '0cd9c98e-7f52-48b9-a987-404ec90cc5fe' ||
        strStrength.toLowerCase().includes('300/300/50') ||
        strStrength.toLowerCase() === '300/300/50mg'
      ) {
        norm.Drug_Strength_ART_1 = '300/300/50mg';
      } else {
        norm.Drug_Strength_ART_1 = CIEL_CONCEPT_MAP[rawStrength] || rawStrength;
      }
    } else if (norm.Drugs_ART_1) {
      norm.Drug_Strength_ART_1 = '300/300/50mg';
    }
  }

  // ── 3. Refill & Duration Normalization ────────────────────────────────────
  const rawRefillMonths = raw.refillMonths || raw.refill_months;
  const rawRefill = raw.refill || raw['Pick up Reason'];
  const hasRefill =
    Boolean(rawRefillMonths) ||
    (rawRefill && String(rawRefill).toLowerCase().includes('refill')) ||
    (rawRefill && String(rawRefill).includes('1065')) ||
    rawRefill === true ||
    rawRefill === 'Yes';

  if (hasRefill) {
    norm.refill = '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; // Yes
    const months = Number(rawRefillMonths) || 3;
    const days = months * 30;
    norm.refillMonths = String(months);
    norm.arvDispensedInDays_ART_1 = norm.arvDispensedInDays_ART_1 ?? days;
    norm.duration_pharm_ART_1 = norm.duration_pharm_ART_1 ?? days;
    norm.tb_prevDispensedInDays = norm.tb_prevDispensedInDays ?? days;
    norm.prepDispensedInDays = norm.prepDispensedInDays ?? days;
  }

  // ── 4. Quantity Dispensed ─────────────────────────────────────────────────
  const rawQty = raw.quantityDispensed || raw.quantity_dispensed || raw.qty_dispensed_pharm_ART_1;
  if (rawQty !== undefined && rawQty !== null && rawQty !== '') {
    const numQty = Number(rawQty) || 90;
    norm.quantityDispensed = numQty;
    norm.qty_dispensed_pharm_ART_1 = numQty;
    norm.qty_prescribed_pharm_ART_1 = numQty;
  }

  // ── 5. Pharmacist Feedback ────────────────────────────────────────────────
  const rawFeedback =
    raw.pharmacistFeedback ||
    raw.feedback_pharmacist ||
    raw.name_of_arv_error_pharm ||
    raw['Pharmacist Feedback'];
  if (rawFeedback) {
    norm.pharmacistFeedback = rawFeedback;
    norm.name_of_arv_error_pharm = rawFeedback;
  }

  // ── 6. DSD Status / Modality ──────────────────────────────────────────────
  const rawDsd = raw['DSD Status'] || raw.dsdStatus || raw.Dispensing_Modality || raw.dsd_status;
  if (rawDsd) {
    if (String(rawDsd).toLowerCase().includes('non-devolved') || String(rawDsd).toLowerCase().includes('facility')) {
      norm.Dispensing_Modality = '60882cd1-1f42-485b-8afb-cd988282251e'; // Facility-Based
      norm['DSD Status'] = 'Non-devolved';
    } else {
      norm.Dispensing_Modality = '01fe63b3-b308-4065-aa42-69d3fc57f3dc'; // Community-Based
    }
  }

  // ── 7. Vitals (Weight, Height, BMI) ───────────────────────────────────────
  const rawWeight = raw.Weight || raw.weight || raw.latestWeight || raw.latest_weight;
  if (rawWeight !== undefined && rawWeight !== null && rawWeight !== '') {
    const numW = Number(rawWeight);
    norm.Weight = numW;
    norm.weight = numW;
    norm.latestWeight = numW;
    norm.latest_weight = numW;
  }

  const rawHeight = raw['Height (cm)'] || raw.Height || raw.height || raw.latestHeight || raw.latest_height;
  if (rawHeight !== undefined && rawHeight !== null && rawHeight !== '') {
    const numH = Number(rawHeight);
    norm['Height (cm)'] = numH;
    norm.Height = numH;
    norm.height = numH;
    norm.latestHeight = numH;
    norm.latest_height = numH;
  }

  const rawBmi = raw['Body mass index'] || raw.bodyMassIndex || raw.bmi;
  if (rawBmi !== undefined && rawBmi !== null && rawBmi !== '') {
    norm['Body mass index'] = Number(rawBmi);
    norm.bodyMassIndex = Number(rawBmi);
    norm.bmi = Number(rawBmi);
  }

  // ── 8. Functional Status & WHO Stage ──────────────────────────────────────
  const rawFunctional = raw['Functional Status'] || raw.functionalStatus || raw.functional_status;
  if (rawFunctional) {
    const strF = String(rawFunctional).toLowerCase();
    if (strF.includes('work') || strF.includes('able')) {
      norm.functional_status = '165889AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      norm['Functional Status'] = 'Physically able to work';
    } else if (strF.includes('ambulat')) {
      norm.functional_status = '165888AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    } else if (strF.includes('bed')) {
      norm.functional_status = '165887AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    }
  }

  const rawWho = raw['CURRENT WHO HIV STAGE'] || raw.whoStage || raw.who_stage;
  if (rawWho) {
    norm.who_stage = String(rawWho);
    norm['CURRENT WHO HIV STAGE'] = String(rawWho);
  }

  // ── 9. Viral Load Value (unhide EAC page if present) ──────────────────────
  const rawVlValue = raw.viralLoadValue || raw.viral_load || raw.lastViralLoad || raw['HIV VIRAL LOAD'];
  if (rawVlValue !== undefined && rawVlValue !== null && rawVlValue !== '') {
    norm.viralLoadValue = Number(rawVlValue);
  }

  // ── 10. Patient Context Fallbacks ─────────────────────────────────────────
  if (patientContext.gender) {
    norm.sex = patientContext.gender;
  }
  if (patientContext.artNumber || patientContext.pepfarId) {
    norm.art_number = patientContext.artNumber || patientContext.pepfarId;
  }
  // ── 11. Repeating Groups Normalization (OI Prophylaxis, TB Prevention, PrEP Drugs) ──
  // A. OI Prophylaxis
  if (Array.isArray(norm.oi_prophylaxis) && norm.oi_prophylaxis.length > 0) {
    norm.oi_prophylaxis = norm.oi_prophylaxis.map((item: any) => ({
      ...item,
      drugs_Cotrim: CIEL_CONCEPT_MAP[item.drugs_Cotrim] || item.drugs_Cotrim || 'dbf8a287-3c82-440b-bfc3-a4b9432f9183',
      oi_prophylaxis_drug_strength: CIEL_CONCEPT_MAP[item.oi_prophylaxis_drug_strength] || item.oi_prophylaxis_drug_strength || 'c03561ed-1402-4bfe-b95d-9547fe6b9bf7',
      oi_prophylaxis_drug_frequency: CIEL_CONCEPT_MAP[item.oi_prophylaxis_drug_frequency] || item.oi_prophylaxis_drug_frequency || '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    }));
  } else {
    const rawOiDrug = raw.drugs_Cotrim || raw['OI Drugs'] || raw['OI drugs'] || raw.oi_drug;
    if (rawOiDrug) {
      norm.oi_prophylaxis = [
        {
          drugs_Cotrim: CIEL_CONCEPT_MAP[rawOiDrug] || 'dbf8a287-3c82-440b-bfc3-a4b9432f9183',
          oi_prophylaxis_drug_strength: CIEL_CONCEPT_MAP[raw.oi_prophylaxis_drug_strength || raw['ARV Drug Strength']] || 'c03561ed-1402-4bfe-b95d-9547fe6b9bf7',
          oi_prophylaxis_drug_frequency: CIEL_CONCEPT_MAP[raw.oi_prophylaxis_drug_frequency || raw['Drug Frequency']] || '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          oi_prophylaxis_duration_Pres: raw.oi_prophylaxis_duration_Pres || raw['Medication duration'] || 120,
          qty_prescribed_Cotrim: raw.qty_prescribed_Cotrim || raw['Quantity of medication prescribed per dose'] || 120,
          oi_prophylaxisDispensedInDays: raw.oi_prophylaxisDispensedInDays || raw['Medication Duration Dispensed'] || 120,
          oi_prophylaxis_qty_dispensed: raw.oi_prophylaxis_qty_dispensed || raw['Medication dispensed'] || 120,
        }
      ];
    }
  }

  // B. TB Prevention
  if (Array.isArray(norm.tb_prev) && norm.tb_prev.length > 0) {
    norm.tb_prev = norm.tb_prev.map((item: any) => ({
      ...item,
      tb_prev_drugs: CIEL_CONCEPT_MAP[item.tb_prev_drugs] || item.tb_prev_drugs || '656AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      tb_prev_drugs_strength: CIEL_CONCEPT_MAP[item.tb_prev_drugs_strength] || item.tb_prev_drugs_strength || 'abbb66b8-61c9-4b58-bad6-edf1efa546e1',
      tb_prev_drugs_frequency: CIEL_CONCEPT_MAP[item.tb_prev_drugs_frequency] || item.tb_prev_drugs_frequency || '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    }));
  } else {
    const rawTbDrug = raw.tb_prev_drugs || raw['TB Drugs'] || raw['TB drugs'];
    if (rawTbDrug) {
      norm.tb_prev = [
        {
          tb_prev_drugs: CIEL_CONCEPT_MAP[rawTbDrug] || '656AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          tb_prev_drugs_strength: CIEL_CONCEPT_MAP[raw.tb_prev_drugs_strength] || 'abbb66b8-61c9-4b58-bad6-edf1efa546e1',
          tb_prev_drugs_frequency: CIEL_CONCEPT_MAP[raw.tb_prev_drugs_frequency] || '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          tb_prev_drugs_duration_Pres: raw.tb_prev_drugs_duration_Pres || 120,
          qty_prescribed_tb_prev: raw.qty_prescribed_tb_prev || 120,
          tb_prevDispensedInDays: raw.tb_prevDispensedInDays || 120,
          tb_prev_drugs_qty_dispensed: raw.tb_prev_drugs_qty_dispensed || 120,
        }
      ];
    }
  }

  // C. PrEP Drugs
  if (Array.isArray(norm.prepdrug) && norm.prepdrug.length > 0) {
    norm.prepdrug = norm.prepdrug.map((item: any) => ({
      ...item,
      prev_drugs: CIEL_CONCEPT_MAP[item.prev_drugs] || item.prev_drugs || 'c83188a1-f411-49f5-a1b6-19881a0354a2',
      prev_drugs_strength: CIEL_CONCEPT_MAP[item.prev_drugs_strength] || item.prev_drugs_strength || 'd6a11b94-efe5-415e-8071-29d75356bac0',
      prev_drugs_frequency: CIEL_CONCEPT_MAP[item.prev_drugs_frequency] || item.prev_drugs_frequency || '6f973a60-16a5-49bc-9278-300a9e998646',
    }));
  } else {
    const rawPrepDrug = raw.prev_drugs || raw['PrEP Regimen'] || raw['PrEP drugs'];
    if (rawPrepDrug) {
      norm.prepdrug = [
        {
          prev_drugs: CIEL_CONCEPT_MAP[rawPrepDrug] || 'c83188a1-f411-49f5-a1b6-19881a0354a2',
          prev_drugs_strength: CIEL_CONCEPT_MAP[raw.prev_drugs_strength] || 'd6a11b94-efe5-415e-8071-29d75356bac0',
          prev_drugs_frequency: CIEL_CONCEPT_MAP[raw.prev_drugs_frequency] || '6f973a60-16a5-49bc-9278-300a9e998646',
          prepdura: raw.prepdura || 30,
          qty_prescribed_prev: raw.qty_prescribed_prev || 30,
          prepDispensedInDays: raw.prepDispensedInDays || 30,
          prep_drugs_qty_dispensed: raw.prep_drugs_qty_dispensed || 30,
        }
      ];
    }
  }

  return norm;
}

/**
 * Resolves the active value for a form field, checking direct question ID,
 * normalized keys, concept UUIDs, labels, and common clinical aliases.
 */
export function resolveFieldValue(q: any, formValues: Record<string, any>): any {
  if (!q || !formValues) return undefined;

  // 1. Direct key
  if (formValues[q.id] !== undefined && formValues[q.id] !== '') {
    return formValues[q.id];
  }

  // 2. Case-insensitive / whitespace-normalized key
  const normId = (q.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [k, v] of Object.entries(formValues)) {
    if (v !== undefined && v !== '' && k.toLowerCase().replace(/[^a-z0-9]/g, '') === normId) {
      return v;
    }
  }

  // 3. Label match
  if (q.label && formValues[q.label] !== undefined && formValues[q.label] !== '') {
    return formValues[q.label];
  }

  // 4. Concept UUID / CIEL ID match
  const concept = q.questionOptions?.concept || q.concept;
  if (concept) {
    if (formValues[concept] !== undefined && formValues[concept] !== '') {
      return formValues[concept];
    }
    const cielPrefix = String(concept).slice(0, 6);
    if (formValues[cielPrefix] !== undefined && formValues[cielPrefix] !== '') {
      return formValues[cielPrefix];
    }
  }

  // 5. Common Domain Aliases
  if (normId.includes('visitdate') || normId.includes('encounterdatetime') || normId.includes('encounterdate')) {
    return (
      formValues.visitDate ??
      formValues.visit_date ??
      formValues.encounterDatetime ??
      formValues.encounterDate ??
      formValues['Ordered Date'] ??
      formValues.dateOrdered
    );
  }

  if (normId.includes('regimen') || normId.includes('arvdrug')) {
    return (
      formValues.Adult_1st_Line_Regimens ??
      formValues.dispensedRegimen ??
      formValues['Adult 1st Line ARV Regimen'] ??
      formValues.currentRegimen ??
      formValues.Drugs_ART_1
    );
  }

  if (normId.includes('refill') || normId.includes('duration') || normId.includes('dispensedindays')) {
    if (normId === 'refill') {
      return formValues.refill ?? (formValues.refillMonths ? '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' : undefined);
    }
    return (
      formValues.arvDispensedInDays_ART_1 ??
      formValues.duration_pharm_ART_1 ??
      (formValues.refillMonths ? Number(formValues.refillMonths) * 30 : undefined)
    );
  }

  if (normId.includes('qty') || normId.includes('quantity')) {
    return (
      formValues.qty_dispensed_pharm_ART_1 ??
      formValues.quantityDispensed ??
      formValues.qty_prescribed_pharm_ART_1
    );
  }

  if (normId.includes('feedback') || normId.includes('error')) {
    return (
      formValues.name_of_arv_error_pharm ??
      formValues.pharmacistFeedback ??
      formValues.feedback_pharmacist
    );
  }

  if (normId.includes('weight')) {
    return formValues.Weight ?? formValues.weight ?? formValues.latestWeight ?? formValues.latest_weight;
  }

  if (normId.includes('height')) {
    return formValues['Height (cm)'] ?? formValues.Height ?? formValues.height ?? formValues.latestHeight ?? formValues.latest_height;
  }

  if (normId.includes('bmi')) {
    return formValues['Body mass index'] ?? formValues.bodyMassIndex ?? formValues.bmi;
  }

  if (normId.includes('dsd') || normId.includes('modality')) {
    return formValues.Dispensing_Modality ?? formValues['DSD Status'] ?? formValues.dsdStatus;
  }

  if (normId.includes('functional')) {
    return formValues.functional_status ?? formValues['Functional Status'] ?? formValues.functionalStatus;
  }

  return undefined;
}
