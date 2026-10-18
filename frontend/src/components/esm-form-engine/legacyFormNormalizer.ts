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
  '25_300_50mg': '25/300/50mg',
  '25/300/50mg': '25/300/50mg',
  '25/300/50Mg': '25/300/50mg',
  'ffaaa42a-0c41-4e3f-a85a-7378f1c2efaf': '25/300/50mg',
  'd0623bd6-525d-4aac-bfb5-d97184e29067': '25/300/50mg',
  '167522': '25/300/50mg',
  '167303': '25/300/50mg',
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
  '6c32f10b-e26d-4299-97af-41b797a8253e': '6c32f10b-e26d-4299-97af-41b797a8253e', // TAF-3TC-DTG
  '167517': '6c32f10b-e26d-4299-97af-41b797a8253e',
  '2893350f-6710-40c6-b963-ff2d9789567d': '2893350f-6710-40c6-b963-ff2d9789567d', // Tenofovir-alafenamide/Lamivudine/Dolutegravir
  '167520': '2893350f-6710-40c6-b963-ff2d9789567d',
  'Tenofovir-alafenamide/Lamivudine/Dolutegravir': '2893350f-6710-40c6-b963-ff2d9789567d',
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
  '100mg': '27f5a185-9791-45b2-89e8-89df69fdac71',
  '100Mg': '27f5a185-9791-45b2-89e8-89df69fdac71',
  '150Mg/75mg': 'cd94a1ed-2812-4170-8bc7-90abded1beab',
  '150mg/75mg': 'cd94a1ed-2812-4170-8bc7-90abded1beab',
  '150Mg/75mg/40mg': '550b250c-fcc8-4176-b833-2b1355982597',
  '150mg/75mg/40mg': '550b250c-fcc8-4176-b833-2b1355982597',
  '300/150mg': '6717b4c6-4cf3-4ef1-9734-f2da5300003f',
  '300/150Mg': '6717b4c6-4cf3-4ef1-9734-f2da5300003f',
  '300/300mg': 'fcd74eb9-c917-42b1-969a-696b15a5627c',
  '300/300Mg': 'fcd74eb9-c917-42b1-969a-696b15a5627c',
  'RHZE': '1675AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'RHZ': '768AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'EH': '1108AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'RH': '1194',
  'Twice daily': '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'Four times daily': '160870AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  '3ce/week': 'a0c98b53-f014-4cb0-a41e-8503c608ef57',
  'Nocte': '733e7044-f9b0-41bc-b069-87c95ecd6882',
  'dbf8a287-3c82-440b-bfc3-a4b9432f9183': 'dbf8a287-3c82-440b-bfc3-a4b9432f9183', // Cotrimoxazole
  '99577a67-24b2-448f-aeab-6f1b67f265d6': 'dbf8a287-3c82-440b-bfc3-a4b9432f9183', // Cotrimoxazole (mapped from construct)
  '165726': 'dbf8a287-3c82-440b-bfc3-a4b9432f9183',
  '165726AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'dbf8a287-3c82-440b-bfc3-a4b9432f9183',
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
  'Isoniazid (INH)': '656AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'INH': '656AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

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

    // Preserve explicit Drugs_ART_1 if set on raw record
    const explicitDrug1 = raw.Drugs_ART_1 || raw['ARV Medication'] || raw.arv_medication;

    // Check if it's TDF/3TC/DTG (165681)
    if (
      regStr === '165681' ||
      regStr.includes('TDF') ||
      regStr.toLowerCase().includes('dtg') ||
      regStr.startsWith('1a')
    ) {
      norm.Adult_1st_Line_Regimens = '8a343013-0216-44e0-aefe-53909ffd5631';
      norm.Drugs_ART_1 = explicitDrug1 || '8a343013-0216-44e0-aefe-53909ffd5631';
      norm.name_of_drug_pharm = 'Tenofovir / Lamivudine / Dolutegravir (TDF/3TC/DTG)';
    } else if (regStr === '164505' || regStr.includes('EFV') || regStr.startsWith('1b')) {
      norm.Adult_1st_Line_Regimens = '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      norm.Drugs_ART_1 = explicitDrug1 || '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    } else if (regStr === '1652' || regStr.includes('AZT') || regStr.includes('NVP')) {
      norm.Adult_1st_Line_Regimens = '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      norm.Drugs_ART_1 = explicitDrug1 || '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    } else {
      norm.Adult_1st_Line_Regimens = regStr;
      norm.Drugs_ART_1 = explicitDrug1 || regStr;
    }

    // Auto-fulfill ESM prerequisite fields to unhide regimen lines:
    // Treatment_age_group: Adult ('a291af62-d00e-4ace-a672-f6f965b325fe')
    // regimen_line: Adult 1st Line ('164506AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    // Treatment_type: ART ('9b49eb5e-9ca9-4494-a2ff-f1d62b6feecc')
    norm.Treatment_age_group = norm.Treatment_age_group || 'a291af62-d00e-4ace-a672-f6f965b325fe';
    norm.regimen_line = norm.regimen_line || '164506AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    norm.Treatment_type = norm.Treatment_type || '9b49eb5e-9ca9-4494-a2ff-f1d62b6feecc';

    // Ensure Drug Strength for ARV Drug rows 1 to 5 (human-readable names instead of concept UUIDs)
    const STRENGTH_UUID_MAP: Record<string, string> = {
      'ffaaa42a-0c41-4e3f-a85a-7378f1c2efaf': '25/300/50mg',
      '167522': '25/300/50mg',
      'd0623bd6-525d-4aac-bfb5-d97184e29067': '25/300/50mg',
      '167303': '25/300/50mg',
      '0cd9c98e-7f52-48b9-a987-404ec90cc5fe': '300/300/50mg',
      '166044': '300/300/50mg',
      '4db3bbfd-2e59-48af-ba55-1b6deed9ec32': '300/300/600mg',
      '165618': '300/300/600mg',
      'd1359cec-4457-4699-b050-7b65a25c1ca3': '300/150/200mg',
      '165620': '300/150/200mg',
      'fcd74eb9-c917-42b1-969a-696b15a5627c': '300/300mg',
      '165621': '300/300mg',
      '6717b4c6-4cf3-4ef1-9734-f2da5300003f': '300/150mg',
      '165622': '300/150mg',
      'ddd236eb-b5af-465f-9c37-862741ca75a6': '300/100mg',
      '165624': '300/100mg',
      '9339100a-1fe3-4978-9af1-a6ee868840ac': '200/50mg',
      '165625': '200/50mg',
      'abbb66b8-61c9-4b58-bad6-edf1efa546e1': '300mg',
      '165074': '300mg',
      'c543792b-6225-4a70-8e1f-04ea5be06212': '50mg',
      '165617': '50mg',
    };

    for (let i = 1; i <= 5; i++) {
      const fieldKey = `Drug_Strength_ART_${i}`;
      const rawVal = norm[fieldKey] || raw[fieldKey] || (i === 1 ? (raw['ARV Drug Strength'] || raw.drug_strength) : undefined);
      if (rawVal) {
        const strVal = String(rawVal).trim();
        if (STRENGTH_UUID_MAP[strVal]) {
          norm[fieldKey] = STRENGTH_UUID_MAP[strVal];
        } else if (strVal.toLowerCase().includes('25/300/50')) {
          norm[fieldKey] = '25/300/50mg';
        } else if (strVal.toLowerCase().includes('300/300/50')) {
          norm[fieldKey] = '300/300/50mg';
        } else if (CIEL_CONCEPT_MAP[strVal]) {
          norm[fieldKey] = CIEL_CONCEPT_MAP[strVal];
        } else {
          norm[fieldKey] = strVal;
        }
      }
    }

    // Ensure orphan ARV drug rows (2 to 5) are purged if no drug was selected
    for (let i = 2; i <= 5; i++) {
      if (!norm[`Drugs_ART_${i}`]) {
        delete norm[`Drug_Strength_ART_${i}`];
        delete norm[`Drug_Frequency_ART_${i}`];
        delete norm[`duration_pharm_ART_${i}`];
        delete norm[`qty_prescribed_pharm_ART_${i}`];
        delete norm[`arvDispensedInDays_ART_${i}`];
        delete norm[`qty_dispensed_pharm_ART_${i}`];
      }
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
  }

  // ── 4. Quantity Dispensed & Prescribed ──────────────────────────────────
  if (raw.qty_dispensed_pharm_ART_1 !== undefined && raw.qty_dispensed_pharm_ART_1 !== null && raw.qty_dispensed_pharm_ART_1 !== '') {
    norm.qty_dispensed_pharm_ART_1 = Number(raw.qty_dispensed_pharm_ART_1);
  } else if (raw.quantityDispensed !== undefined && raw.quantityDispensed !== null && raw.quantityDispensed !== '') {
    norm.qty_dispensed_pharm_ART_1 = Number(raw.quantityDispensed);
  }

  if (raw.qty_prescribed_pharm_ART_1 !== undefined && raw.qty_prescribed_pharm_ART_1 !== null && raw.qty_prescribed_pharm_ART_1 !== '') {
    norm.qty_prescribed_pharm_ART_1 = Number(raw.qty_prescribed_pharm_ART_1);
  } else if (raw.quantityPrescribed !== undefined && raw.quantityPrescribed !== null && raw.quantityPrescribed !== '') {
    norm.qty_prescribed_pharm_ART_1 = Number(raw.quantityPrescribed);
  } else if (norm.qty_dispensed_pharm_ART_1 !== undefined && norm.qty_prescribed_pharm_ART_1 === undefined) {
    norm.qty_prescribed_pharm_ART_1 = norm.qty_dispensed_pharm_ART_1;
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
  if (Array.isArray(norm.oi_prophylaxis)) {
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const item of norm.oi_prophylaxis) {
      if (!item || typeof item !== 'object') continue;
      const drug = CIEL_CONCEPT_MAP[item.drugs_Cotrim] || item.drugs_Cotrim || item['OI Drugs'] || item['OI drugs'];
      if (!drug) continue;
      const sig = `${drug}|${item.oi_prophylaxis_drug_strength || ''}|${item.qty_prescribed_Cotrim || ''}`;
      if (seen.has(sig)) continue;
      seen.add(sig);

      unique.push({
        drugs_Cotrim: CIEL_CONCEPT_MAP[drug] || drug,
        oi_prophylaxis_drug_strength: CIEL_CONCEPT_MAP[item.oi_prophylaxis_drug_strength] || item.oi_prophylaxis_drug_strength || 'c03561ed-1402-4bfe-b95d-9547fe6b9bf7',
        oi_prophylaxis_drug_frequency: CIEL_CONCEPT_MAP[item.oi_prophylaxis_drug_frequency] || item.oi_prophylaxis_drug_frequency || '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        oi_prophylaxis_duration_Pres: item.oi_prophylaxis_duration_Pres === '180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' ? 180 : (item.oi_prophylaxis_duration_Pres ?? 90),
        qty_prescribed_Cotrim: item.qty_prescribed_Cotrim === '180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' ? 180 : (item.qty_prescribed_Cotrim ?? 90),
        oi_prophylaxisDispensedInDays: item.oi_prophylaxisDispensedInDays === '180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' ? 180 : (item.oi_prophylaxisDispensedInDays ?? 90),
        oi_prophylaxis_qty_dispensed: item.oi_prophylaxis_qty_dispensed === '180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' ? 180 : (item.oi_prophylaxis_qty_dispensed ?? 90),
      });
    }
    norm.oi_prophylaxis = unique;
  } else {
    const rawOiDrug = raw.drugs_Cotrim || raw['OI Drugs'] || raw['OI drugs'] || raw.oi_drug;
    if (rawOiDrug) {
      norm.oi_prophylaxis = [
        {
          drugs_Cotrim: CIEL_CONCEPT_MAP[rawOiDrug] || rawOiDrug,
          oi_prophylaxis_drug_strength: CIEL_CONCEPT_MAP[raw.oi_prophylaxis_drug_strength || raw['ARV Drug Strength']] || 'c03561ed-1402-4bfe-b95d-9547fe6b9bf7',
          oi_prophylaxis_drug_frequency: CIEL_CONCEPT_MAP[raw.oi_prophylaxis_drug_frequency || raw['Drug Frequency']] || '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          oi_prophylaxis_duration_Pres: raw.oi_prophylaxis_duration_Pres === '180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' ? 180 : (raw.oi_prophylaxis_duration_Pres || raw['Medication duration'] || 90),
          qty_prescribed_Cotrim: raw.qty_prescribed_Cotrim === '180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' ? 180 : (raw.qty_prescribed_Cotrim || raw['Quantity of medication prescribed per dose'] || 90),
          oi_prophylaxisDispensedInDays: raw.oi_prophylaxisDispensedInDays === '180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' ? 180 : (raw.oi_prophylaxisDispensedInDays || raw['Medication Duration Dispensed'] || 90),
          oi_prophylaxis_qty_dispensed: raw.oi_prophylaxis_qty_dispensed === '180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' ? 180 : (raw.oi_prophylaxis_qty_dispensed || raw['Medication dispensed'] || 90),
        }
      ];
    }
  }

  // B. TB Prevention
  if (Array.isArray(norm.tb_prev)) {
    const uniqueTb: any[] = [];
    const seenTb = new Set<string>();
    for (const item of norm.tb_prev) {
      if (!item || typeof item !== 'object') continue;
      const drug = CIEL_CONCEPT_MAP[item.tb_prev_drugs] || item.tb_prev_drugs || item['TB Drugs'] || item['TB drugs'];
      if (!drug) continue;
      const sig = `${drug}|${item.tb_prev_drugs_strength || ''}|${item.qty_prescribed_tb_prev || ''}`;
      if (seenTb.has(sig)) continue;
      seenTb.add(sig);

      uniqueTb.push({
        tb_prev_drugs: CIEL_CONCEPT_MAP[drug] || drug,
        tb_prev_drugs_strength: CIEL_CONCEPT_MAP[item.tb_prev_drugs_strength] || item.tb_prev_drugs_strength || 'abbb66b8-61c9-4b58-bad6-edf1efa546e1',
        tb_prev_drugs_frequency: CIEL_CONCEPT_MAP[item.tb_prev_drugs_frequency] || item.tb_prev_drugs_frequency || '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        tb_prev_drugs_duration_Pres: item.tb_prev_drugs_duration_Pres ?? 120,
        qty_prescribed_tb_prev: item.qty_prescribed_tb_prev ?? 120,
        tb_prevDispensedInDays: item.tb_prevDispensedInDays ?? 120,
        tb_prev_drugs_qty_dispensed: item.tb_prev_drugs_qty_dispensed ?? 120,
      });
    }
    norm.tb_prev = uniqueTb;
  } else {
    const rawTbDrug = raw.tb_prev_drugs || raw['TB Drugs'] || raw['TB drugs'];
    if (rawTbDrug) {
      norm.tb_prev = [
        {
          tb_prev_drugs: CIEL_CONCEPT_MAP[rawTbDrug] || rawTbDrug,
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
  if (Array.isArray(norm.prepdrug)) {
    const uniquePrep: any[] = [];
    const seenPrep = new Set<string>();
    for (const item of norm.prepdrug) {
      if (!item || typeof item !== 'object') continue;
      const drug = CIEL_CONCEPT_MAP[item.prev_drugs] || item.prev_drugs || item['PrEP Regimen'] || item['PrEP drugs'];
      if (!drug) continue;
      const sig = `${drug}|${item.prev_drugs_strength || ''}|${item.qty_prescribed_prev || ''}`;
      if (seenPrep.has(sig)) continue;
      seenPrep.add(sig);

      uniquePrep.push({
        prev_drugs: CIEL_CONCEPT_MAP[drug] || drug,
        prev_drugs_strength: CIEL_CONCEPT_MAP[item.prev_drugs_strength] || item.prev_drugs_strength || 'd6a11b94-efe5-415e-8071-29d75356bac0',
        prev_drugs_frequency: CIEL_CONCEPT_MAP[item.prev_drugs_frequency] || item.prev_drugs_frequency || '6f973a60-16a5-49bc-9278-300a9e998646',
        prepdura: item.prepdura ?? 30,
        qty_prescribed_prev: item.qty_prescribed_prev ?? 30,
        prepDispensedInDays: item.prepDispensedInDays ?? 30,
        prep_drugs_qty_dispensed: item.prep_drugs_qty_dispensed ?? 30,
      });
    }
    norm.prepdrug = uniquePrep;
  } else {
    const rawPrepDrug = raw.prev_drugs || raw['PrEP Regimen'] || raw['PrEP drugs'];
    if (rawPrepDrug) {
      norm.prepdrug = [
        {
          prev_drugs: CIEL_CONCEPT_MAP[rawPrepDrug] || rawPrepDrug,
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

  // D. Other Drugs
  if (Array.isArray(norm.others_prev)) {
    const uniqueOthers: any[] = [];
    const seenOthers = new Set<string>();
    for (const item of norm.others_prev) {
      if (!item || typeof item !== 'object') continue;
      const drug = CIEL_CONCEPT_MAP[item.other_prev_drugs] || item.other_prev_drugs || item['Other Drugs'];
      if (!drug) continue;
      const sig = `${drug}|${item.other_prev_drugs_strength || ''}|${item.qty_prescribed_other_prev || ''}`;
      if (seenOthers.has(sig)) continue;
      seenOthers.add(sig);

      uniqueOthers.push({
        other_prev_drugs: CIEL_CONCEPT_MAP[drug] || drug,
        other_prev_drugs_strength: CIEL_CONCEPT_MAP[item.other_prev_drugs_strength] || item.other_prev_drugs_strength || '',
        other_prev_drugs_frequency: CIEL_CONCEPT_MAP[item.other_prev_drugs_frequency] || item.other_prev_drugs_frequency || '',
        other_prev_drugs_duration_Pres: item.other_prev_drugs_duration_Pres ?? 30,
        qty_prescribed_other_prev: item.qty_prescribed_other_prev ?? 30,
        other_prevDispensedInDays: item.other_prevDispensedInDays ?? 30,
        other_prev_drugs_qty_dispensed: item.other_prev_drugs_qty_dispensed ?? 30,
      });
    }
    norm.others_prev = uniqueOthers;
  }

  // Sanitize any remaining concept 180 UUIDs in numeric fields
  for (const [k, v] of Object.entries(norm)) {
    if (v === '180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
      norm[k] = 180;
    }
  }

  return norm;
}

/**
 * Resolves the active value for a form field, checking direct question ID,
 * normalized keys, concept UUIDs, labels, and common clinical aliases.
 * Strictly isolates indexed obs groups (_ART_2..5, _2..5) so fields never cross-pollinate.
 */
export function resolveFieldValue(q: any, formValues: Record<string, any>): any {
  if (!q || !formValues) return undefined;

  const rawId = String(q.id || '').trim();

  // 1. Direct exact key match
  if (formValues[rawId] !== undefined && formValues[rawId] !== '') {
    return formValues[rawId];
  }

  // 2. Case-insensitive exact key match
  const normId = rawId.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [k, v] of Object.entries(formValues)) {
    if (v !== undefined && v !== '' && k.toLowerCase().replace(/[^a-z0-9]/g, '') === normId) {
      return v;
    }
  }

  // If this question belongs to an indexed group or has a numbered suffix (_ART_2..5, _2..5),
  // NEVER fall back to global aliases or _ART_1 fields! Separate obs groups must remain strictly isolated.
  const hasIndexSuffix = /_(?:art_)?([2-9]|\d{2,})$/i.test(rawId) || /arvdrug_[2-9]/i.test(rawId);
  if (hasIndexSuffix) {
    return undefined;
  }

  // 3. Label match (only for non-indexed fields)
  if (q.label && formValues[q.label] !== undefined && formValues[q.label] !== '') {
    return formValues[q.label];
  }

  // 4. Concept UUID / CIEL ID match (only for standalone fields, never for indexed ARV groups)
  const concept = q.questionOptions?.concept || q.concept;
  if (concept && !rawId.includes('_ART_')) {
    if (formValues[concept] !== undefined && formValues[concept] !== '') {
      return formValues[concept];
    }
    const cielPrefix = String(concept).slice(0, 6);
    if (formValues[cielPrefix] !== undefined && formValues[cielPrefix] !== '') {
      return formValues[cielPrefix];
    }
  }

  // 5. Common Domain Aliases (ONLY for specific top-level standalone fields)
  if (rawId === 'visitDate' || rawId === 'encounterDatetime' || rawId === 'encounterDate') {
    return (
      formValues.visitDate ??
      formValues.visit_date ??
      formValues.encounterDatetime ??
      formValues.encounterDate ??
      formValues['Ordered Date'] ??
      formValues.dateOrdered
    );
  }

  if (rawId === 'Drugs_ART_1' || rawId === 'currentRegimen' || rawId === 'dispensedRegimen') {
    return (
      formValues.Drugs_ART_1 ??
      formValues.Adult_1st_Line_Regimens ??
      formValues.dispensedRegimen ??
      formValues['Adult 1st Line ARV Regimen'] ??
      formValues.currentRegimen
    );
  }

  if (rawId === 'arvDispensedInDays_ART_1' || rawId === 'duration_pharm_ART_1') {
    return (
      formValues.arvDispensedInDays_ART_1 ??
      formValues.duration_pharm_ART_1 ??
      (formValues.refillMonths ? Number(formValues.refillMonths) * 30 : undefined)
    );
  }

  if (rawId === 'qty_dispensed_pharm_ART_1' || rawId === 'qty_prescribed_pharm_ART_1' || rawId === 'quantityDispensed') {
    return (
      formValues.qty_dispensed_pharm_ART_1 ??
      formValues.qty_prescribed_pharm_ART_1 ??
      formValues.quantityDispensed
    );
  }

  if (rawId === 'refill') {
    return formValues.refill ?? (formValues.refillMonths ? '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' : undefined);
  }

  if (normId === 'weight' || normId === 'latestweight') {
    return formValues.Weight ?? formValues.weight ?? formValues.latestWeight ?? formValues.latest_weight;
  }

  if (normId === 'height' || normId === 'latestheight') {
    return formValues['Height (cm)'] ?? formValues.Height ?? formValues.height ?? formValues.latestHeight ?? formValues.latest_height;
  }

  if (normId === 'bmi' || normId === 'bodymassindex' || normId === 'calculatedbmi') {
    return formValues['Body mass index'] ?? formValues.bodyMassIndex ?? formValues.bmi ?? formValues.calculatedBmi;
  }

  if (normId === 'dispensingmodality' || normId === 'dsdstatus') {
    return formValues.Dispensing_Modality ?? formValues['DSD Status'] ?? formValues.dsdStatus;
  }

  if (normId === 'functionalstatus') {
    return formValues.functional_status ?? formValues['Functional Status'] ?? formValues.functionalStatus;
  }

  return undefined;
}
