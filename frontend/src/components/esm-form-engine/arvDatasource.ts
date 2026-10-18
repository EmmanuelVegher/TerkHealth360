/**
 * OpenMRS 3.x Form Engine ARV Drugs Datasource & Regimen Combinations
 * Replicates Nigeria National OpenMRS arvDrugs & arvStrengths datasources.
 * When an ARV regimen is selected, filters the 'Drugs' dropdown to only show
 * constituent drugs within that combination, and resolves exact strengths & frequencies.
 */

export interface ArvDrugOption {
  label: string;
  concept: string;
  value: string;
  strength: string;
  frequency?: string;
  isFdc?: boolean;
}

export const ALL_ARV_DRUGS: ArvDrugOption[] = [
  // ── Triple FDCs ──
  {
    label: 'Tenofovir / Lamivudine / Dolutegravir (TDF/3TC/DTG)',
    concept: '8a343013-0216-44e0-aefe-53909ffd5631',
    value: '8a343013-0216-44e0-aefe-53909ffd5631',
    strength: '300/300/50mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Once daily
    isFdc: true,
  },
  {
    label: 'Tenofovir / Lamivudine / Efavirenz (TDF/3TC/EFV)',
    concept: '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    value: '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    strength: '300/300/600mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },
  {
    label: 'Abacavir / Lamivudine / Dolutegravir (ABC/3TC/DTG)',
    concept: '14c41615-9c0e-4254-b4b1-770956d390e9',
    value: '14c41615-9c0e-4254-b4b1-770956d390e9',
    strength: '600/300/50mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },
  {
    label: 'Zidovudine / Lamivudine / Nevirapine (AZT/3TC/NVP)',
    concept: '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    value: '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    strength: '300/150/200mg',
    frequency: '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Twice daily
    isFdc: true,
  },
  {
    label: 'Zidovudine / Lamivudine / Efavirenz (AZT/3TC/EFV)',
    concept: '160124AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    value: '160124AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    strength: '300/150/600mg',
    frequency: '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },
  {
    label: 'Abacavir / Lamivudine / Efavirenz (ABC/3TC/EFV)',
    concept: '162563AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    value: '162563AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    strength: '600/300/600mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },
  {
    label: 'Abacavir / Lamivudine / Nevirapine (ABC/3TC/NVP)',
    concept: '162199AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    value: '162199AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    strength: '600/300/200mg',
    frequency: '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },
  {
    label: 'Tenofovir Alafenamide / Lamivudine / Dolutegravir (TAF/3TC/DTG)',
    concept: '2893350f-6710-40c6-b963-ff2d9789567d',
    value: '2893350f-6710-40c6-b963-ff2d9789567d',
    strength: '25/300/50mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },
  {
    label: 'Tenofovir Alafenamide / Lamivudine / Dolutegravir (TAF/3TC/DTG)',
    concept: '6c32f10b-e26d-4299-97af-41b797a8253e',
    value: '6c32f10b-e26d-4299-97af-41b797a8253e',
    strength: '25/300/50mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },

  // ── Dual FDCs ──
  {
    label: 'Tenofovir / Lamivudine (TDF/3TC)',
    concept: '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    value: '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    strength: '300/300mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },
  {
    label: 'Zidovudine / Lamivudine (AZT/3TC)',
    concept: '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    value: '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    strength: '300/150mg',
    frequency: '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },
  {
    label: 'Abacavir / Lamivudine (ABC/3TC)',
    concept: '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    value: '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    strength: '600/300mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },
  {
    label: 'Tenofovir / Emtricitabine (TDF/FTC)',
    concept: '9aed739b-a64a-4e0d-afa0-f2b50d4cb2c2',
    value: '9aed739b-a64a-4e0d-afa0-f2b50d4cb2c2',
    strength: '300/200mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },
  {
    label: 'Tenofovir Alafenamide / Emtricitabine (TAF/FTC)',
    concept: '087693e4-30ef-497e-8913-96d058d9c9db',
    value: '087693e4-30ef-497e-8913-96d058d9c9db',
    strength: '25/200mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },

  // ── Protease Inhibitors & Integrase Inhibitors ──
  {
    label: 'Atazanavir / Ritonavir (ATV/r 300/100mg)',
    concept: '161361AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    value: '161361AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    strength: '300/100mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },
  {
    label: 'Lopinavir / Ritonavir (LPV/r 200/50mg)',
    concept: '794AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    value: '794AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    strength: '200/50mg',
    frequency: '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },
  {
    label: 'Darunavir / Ritonavir (DRV/r 600/100mg)',
    concept: '165633AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    value: '165633AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    strength: '600/100mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    isFdc: true,
  },
  {
    label: 'Dolutegravir (DTG 50mg)',
    concept: '165631AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    value: '165631AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    strength: '50mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  {
    label: 'Raltegravir (RAL 400mg)',
    concept: '154378AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    value: '154378AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    strength: '400mg',
    frequency: '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },

  // ── Single Agents (for combinations & row-by-row dispensation) ──
  {
    label: 'Tenofovir (TDF 300mg)',
    concept: '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_TDF',
    value: '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_TDF',
    strength: '300mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  {
    label: 'Lamivudine (3TC 300mg)',
    concept: '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    value: '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    strength: '300mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  {
    label: 'Zidovudine (AZT 300mg)',
    concept: '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_AZT',
    value: '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_AZT',
    strength: '300mg',
    frequency: '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  {
    label: 'Abacavir (ABC 300mg)',
    concept: '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_ABC',
    value: '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_ABC',
    strength: '300mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  {
    label: 'Efavirenz (EFV 600mg)',
    concept: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_EFV',
    value: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_EFV',
    strength: '600mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  {
    label: 'Nevirapine (NVP 200mg)',
    concept: '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_NVP',
    value: '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_NVP',
    strength: '200mg',
    frequency: '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  {
    label: 'Emtricitabine (FTC 200mg)',
    concept: '9aed739b-a64a-4e0d-afa0-f2b50d4cb2c2_FTC',
    value: '9aed739b-a64a-4e0d-afa0-f2b50d4cb2c2_FTC',
    strength: '200mg',
    frequency: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
];

/**
 * Filter available ARV drugs by the active selected regimen.
 * When a regimen is selected in NMRS (e.g. 'TDF-3TC-DTG' or 'AZT-3TC-NVP'),
 * this returns ONLY the constituent drugs and FDC formulations of that combination.
 */
export function getArvDrugsForRegimen(regimen: string | undefined | null): ArvDrugOption[] {
  if (!regimen) return ALL_ARV_DRUGS;
  let s = String(regimen).trim();
  if (!s) return ALL_ARV_DRUGS;

  // If passed as active_regimen_info (e.g. "age_group|regimen_concept"), extract the regimen part
  if (s.includes('|')) {
    const parts = s.split('|').map((p) => p.trim()).filter(Boolean);
    s = parts[1] || parts[0];
  }
  const sLower = s.toLowerCase();

  // 1. TDF-3TC-DTG (8a343013-0216-44e0-aefe-53909ffd5631)
  if (sLower.includes('8a343013') || (sLower.includes('tdf') && sLower.includes('3tc') && sLower.includes('dtg'))) {
    const allowed = [
      '8a343013-0216-44e0-aefe-53909ffd5631',
      '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '165631AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_TDF',
      '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 2. TDF-3TC-EFV (164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA)
  if (sLower.includes('164505') || (sLower.includes('tdf') && sLower.includes('3tc') && sLower.includes('efv'))) {
    const allowed = [
      '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_EFV',
      '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_TDF',
      '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 3. AZT-3TC-NVP (1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA)
  if (sLower.includes('1652') || (sLower.includes('azt') && sLower.includes('3tc') && sLower.includes('nvp'))) {
    const allowed = [
      '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_NVP',
      '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_AZT',
      '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 4. AZT-3TC-EFV (160124AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA)
  if (sLower.includes('160124') || (sLower.includes('azt') && sLower.includes('3tc') && sLower.includes('efv'))) {
    const allowed = [
      '160124AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_EFV',
      '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_AZT',
      '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 5. AZT-3TC-DTG (0340aeb6-94fe-4f73-b4b8-c38b7ab7c649)
  if (sLower.includes('0340aeb6') || (sLower.includes('azt') && sLower.includes('3tc') && sLower.includes('dtg'))) {
    const allowed = [
      '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '165631AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_AZT',
      '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 6. ABC-3TC-DTG (14c41615-9c0e-4254-b4b1-770956d390e9)
  if (sLower.includes('14c41615') || (sLower.includes('abc') && sLower.includes('3tc') && sLower.includes('dtg'))) {
    const allowed = [
      '14c41615-9c0e-4254-b4b1-770956d390e9',
      '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '165631AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_ABC',
      '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 7. ABC-3TC-EFV (162563AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA)
  if (sLower.includes('162563') || (sLower.includes('abc') && sLower.includes('3tc') && sLower.includes('efv'))) {
    const allowed = [
      '162563AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_EFV',
      '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_ABC',
      '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 8. ABC-3TC-NVP (162199AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA)
  if (sLower.includes('162199') || (sLower.includes('abc') && sLower.includes('3tc') && sLower.includes('nvp'))) {
    const allowed = [
      '162199AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_NVP',
      '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_ABC',
      '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 9. TDF-FTC-DTG (d20de0fd-8c89-423b-be81-dd357e65c206) / TAF-FTC-DTG (087693e4)
  if (
    sLower.includes('d20de0fd') ||
    sLower.includes('087693e4') ||
    ((sLower.includes('tdf') || sLower.includes('taf')) && sLower.includes('ftc') && sLower.includes('dtg'))
  ) {
    const allowed = [
      '9aed739b-a64a-4e0d-afa0-f2b50d4cb2c2',
      '087693e4-30ef-497e-8913-96d058d9c9db',
      '165631AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_TDF',
      '9aed739b-a64a-4e0d-afa0-f2b50d4cb2c2_FTC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 10. TAF-3TC-DTG (6c32f10b-e26d-4299-97af-41b797a8253e)
  if (sLower.includes('6c32f10b') || (sLower.includes('taf') && sLower.includes('3tc') && sLower.includes('dtg'))) {
    const allowed = [
      '6c32f10b-e26d-4299-97af-41b797a8253e',
      '2893350f-6710-40c6-b963-ff2d9789567d',
      '165631AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 11. TDF-3TC-NVP (162565AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA)
  if (sLower.includes('162565') || (sLower.includes('tdf') && sLower.includes('3tc') && sLower.includes('nvp'))) {
    const allowed = [
      '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_NVP',
      '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_TDF',
      '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 12. TDF-FTC-EFV (104565) / TDF-FTC-NVP (164854)
  if (sLower.includes('104565') || sLower.includes('164854') || (sLower.includes('tdf') && sLower.includes('ftc'))) {
    const allowed = [
      '9aed739b-a64a-4e0d-afa0-f2b50d4cb2c2',
      '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_EFV',
      '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_NVP',
      '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_TDF',
      '9aed739b-a64a-4e0d-afa0-f2b50d4cb2c2_FTC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 13. Second-line ATV/r Regimens (164512, 9053af8f, 164511, d3e272fb, 161361)
  if (
    sLower.includes('164512') ||
    sLower.includes('9053af8f') ||
    sLower.includes('164511') ||
    sLower.includes('d3e272fb') ||
    sLower.includes('161361') ||
    sLower.includes('atv/r') ||
    sLower.includes('atazanavir')
  ) {
    const allowed = [
      '161361AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '9aed739b-a64a-4e0d-afa0-f2b50d4cb2c2',
      '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 14. Second-line LPV/r Regimens (162201, 162200, 162561, 7349930d, 794)
  if (
    sLower.includes('162201') ||
    sLower.includes('162200') ||
    sLower.includes('162561') ||
    sLower.includes('7349930d') ||
    sLower.includes('794') ||
    sLower.includes('lpv/r') ||
    sLower.includes('lopinavir')
  ) {
    const allowed = [
      '794AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '9aed739b-a64a-4e0d-afa0-f2b50d4cb2c2',
      '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_3TC',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // 15. Third-line DRV/r / RAL Regimens (544eb66b, f2b45d84, 154378, 165633, etc.)
  if (
    sLower.includes('544eb66b') ||
    sLower.includes('f2b45d84') ||
    sLower.includes('7dd0850c') ||
    sLower.includes('7f1322de') ||
    sLower.includes('84fffdb4') ||
    sLower.includes('1eb4b11a') ||
    sLower.includes('7f815ed1') ||
    sLower.includes('drv') ||
    sLower.includes('darunavir') ||
    sLower.includes('ral') ||
    sLower.includes('raltegravir')
  ) {
    const allowed = [
      '165633AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '154378AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '165631AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    ];
    return ALL_ARV_DRUGS.filter((d) => allowed.includes(d.concept));
  }

  // Fallback: Return all drugs
  return ALL_ARV_DRUGS;
}
