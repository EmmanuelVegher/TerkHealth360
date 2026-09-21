export interface LabTestMetadata {
  category: string;
  primaryUnit: string;
  altUnits?: string[];
  referenceRange: string;
  template: string;
  quickChips: string[];
  clinicalTips?: string;
}

export const LAB_DATA_DICTIONARY: Record<string, LabTestMetadata> = {
  'viral load': {
    category: 'Virology / Molecular Diagnostics',
    primaryUnit: 'cps/ml',
    altUnits: ['copies/mL', 'IU/ml', 'log10 cps/ml'],
    referenceRange: '< 20 cps/ml (Target Not Detected / Suppressed)',
    template: 'HIV-1 RNA Viral Load: [Value] cps/ml\nLog10 Value: [Log] log10 cps/ml\nInterpretation: Suppressed (< 20 cps/ml)',
    quickChips: ['cps/ml', '< 20 cps/ml (TND)', '> 1000 cps/ml', 'Target Not Detected', 'copies/mL', 'IU/ml'],
    clinicalTips: 'WHO Guidelines: Viral load > 1,000 cps/ml on ART indicates suspected virological failure requiring adherence counseling or regimen switch.',
  },
  'urea': {
    category: 'Renal / Chemical Pathology',
    primaryUnit: 'mmol/L',
    altUnits: ['mg/dL'],
    referenceRange: '2.5 – 7.8 mmol/L (7 – 20 mg/dL)',
    template: 'Serum Urea: [Value] mmol/L\nSodium (Na+): [135-145] mmol/L\nPotassium (K+): [3.5-5.1] mmol/L\nCreatinine: [60-110] umol/L',
    quickChips: ['mmol/L', 'mg/dL', 'Na+ 138 mmol/L', 'K+ 4.2 mmol/L', 'Creat: 88 umol/L'],
    clinicalTips: 'Urea > 20 mmol/L indicates uremia or acute renal impairment.',
  },
  'electrolytes': {
    category: 'Renal / Chemical Pathology',
    primaryUnit: 'mmol/L',
    altUnits: ['mEq/L'],
    referenceRange: 'Na+: 135-145 mmol/L, K+: 3.5-5.1 mmol/L, Cl-: 98-107 mmol/L, HCO3-: 22-29 mmol/L',
    template: 'Sodium (Na+): [Value] mmol/L\nPotassium (K+): [Value] mmol/L\nChloride (Cl-): [Value] mmol/L\nBicarbonate (HCO3-): [Value] mmol/L',
    quickChips: ['mmol/L', 'Na+: 140 mmol/L', 'K+: 4.1 mmol/L', 'Cl-: 102 mmol/L', 'HCO3-: 24 mmol/L'],
    clinicalTips: 'Serum Potassium > 6.0 mmol/L is a panic value requiring immediate ECG monitoring.',
  },
  'creatinine': {
    category: 'Renal / Chemical Pathology',
    primaryUnit: 'umol/L',
    altUnits: ['mg/dL'],
    referenceRange: 'Male: 62 – 115 umol/L, Female: 44 – 97 umol/L',
    template: 'Serum Creatinine: [Value] umol/L\neGFR: [eGFR] mL/min/1.73m²',
    quickChips: ['umol/L', 'mg/dL', 'eGFR > 90 mL/min', 'eGFR < 60 mL/min'],
    clinicalTips: 'Doubling of serum creatinine from baseline suggests acute kidney injury (AKI).',
  },
  'haemoglobin': {
    category: 'Hematology',
    primaryUnit: 'g/dL',
    altUnits: ['g/L'],
    referenceRange: 'Male: 13.0 – 17.5 g/dL, Female: 12.0 – 15.5 g/dL',
    template: 'Haemoglobin (Hb): [Value] g/dL\nPacked Cell Volume (PCV): [Value] %\nWBC Count: [Value] x10^9/L\nPlatelets: [Value] x10^9/L',
    quickChips: ['g/dL', 'PCV: 42%', 'WBC: 6.5 x10^9/L', 'Plt: 250 x10^9/L'],
    clinicalTips: 'Hb < 7.0 g/dL is a critical panic threshold requiring urgent blood transfusion assessment.',
  },
  'cbc': {
    category: 'Hematology',
    primaryUnit: 'g/dL',
    referenceRange: 'Hb: 12-16 g/dL, WBC: 4.0-11.0 x10^9/L, Plt: 150-450 x10^9/L',
    template: 'Haemoglobin: [Value] g/dL\nWBC: [Value] x10^9/L (Neutro: [%]%, Lymph: [%]%)\nPlatelets: [Value] x10^9/L\nPCV/Hematocrit: [Value] %',
    quickChips: ['g/dL', 'x10^9/L', '%', 'Hb 13.5 g/dL', 'WBC 6.2 x10^9/L', 'Plt 220 x10^9/L'],
  },
  'glucose': {
    category: 'Endocrinology / Diabetes',
    primaryUnit: 'mmol/L',
    altUnits: ['mg/dL'],
    referenceRange: 'Fasting: 3.9 – 5.6 mmol/L (70–100 mg/dL), Random: < 7.8 mmol/L (< 140 mg/dL)',
    template: 'Fasting Blood Glucose: [Value] mmol/L\nHbA1c: [Value] %',
    quickChips: ['mmol/L', 'mg/dL', '% (HbA1c)', 'FBG 5.2 mmol/L', 'RBG 6.8 mmol/L'],
    clinicalTips: 'FBG >= 7.0 mmol/L or RBG >= 11.1 mmol/L with symptoms indicates Diabetes Mellitus.',
  },
  'cd4': {
    category: 'Immunology',
    primaryUnit: 'cells/µL',
    referenceRange: '500 – 1500 cells/µL',
    template: 'CD4 Absolute Count: [Value] cells/µL\nCD4 Percentage: [Value] %',
    quickChips: ['cells/µL', '%', '> 500 cells/µL', '< 200 cells/µL (Severe immunosuppression)'],
    clinicalTips: 'CD4 < 200 cells/µL requires opportunistic infection prophylaxis (Cotrimoxazole/Fluconazole).',
  },
  'liver': {
    category: 'Hepatic / Chemical Pathology',
    primaryUnit: 'U/L',
    referenceRange: 'ALT: 7-56 U/L, AST: 10-40 U/L, ALP: 44-147 U/L, Total Bilirubin: 0.3-1.2 mg/dL',
    template: 'ALT (SGPT): [Value] U/L\nAST (SGOT): [Value] U/L\nALP: [Value] U/L\nTotal Bilirubin: [Value] umol/L\nDirect Bilirubin: [Value] umol/L',
    quickChips: ['U/L', 'umol/L', 'ALT 24 U/L', 'AST 28 U/L', 'Bilirubin 14 umol/L'],
  },
  'lipid': {
    category: 'Cardiovascular / Metabolic',
    primaryUnit: 'mmol/L',
    altUnits: ['mg/dL'],
    referenceRange: 'Total Cholesterol: < 5.2 mmol/L, Triglycerides: < 1.7 mmol/L, HDL: > 1.0 mmol/L, LDL: < 3.0 mmol/L',
    template: 'Total Cholesterol: [Value] mmol/L\nTriglycerides: [Value] mmol/L\nHDL-C: [Value] mmol/L\nLDL-C: [Value] mmol/L',
    quickChips: ['mmol/L', 'mg/dL', 'Chol 4.5 mmol/L', 'HDL 1.3 mmol/L', 'LDL 2.4 mmol/L'],
  },
  'malaria': {
    category: 'Parasitology',
    primaryUnit: 'parasites/µL',
    referenceRange: 'Negative / No plasmodium parasites seen',
    template: 'Malaria RDT: [Positive/Negative]\nBlood Smear: [P. falciparum trophozoites seen / Negative]\nParasite Density: [Value] parasites/µL',
    quickChips: ['Negative', 'Positive (P. falciparum)', '+ (1+)', '++ (2+)', '+++ (3+)', 'parasites/µL'],
  },
  'ecg': {
    category: 'Cardiology',
    primaryUnit: 'bpm / ms',
    referenceRange: 'Heart Rate: 60-100 bpm, PR Interval: 120-200 ms, QRS Duration: < 120 ms, QTc: < 450 ms',
    template: 'Rhythm: [Normal Sinus Rhythm / Atrial Fibrillation]\nHeart Rate: [Value] bpm\nPR Interval: [Value] ms\nQRS Duration: [Value] ms\nST-Segment: [Isoelectric / Elevation / Depression]\nImpression: [Normal ECG / Abnormality]',
    quickChips: ['Normal Sinus Rhythm', 'bpm', 'ms', 'ST Isoelectric', 'No acute ischemic changes'],
  },
  'urinalysis': {
    category: 'Urology / Pathology',
    primaryUnit: 'Qualitative',
    referenceRange: 'Protein: Nil, Glucose: Nil, Nitrite: Negative, Leukocytes: Negative, Blood: Nil',
    template: 'Appearance: [Clear / Straw Yellow]\nSpecific Gravity: [1.005 - 1.030]\npH: [5.0 - 8.0]\nProtein: [Nil / Trace / + / ++]\nGlucose: [Nil / +]\nNitrite: [Negative / Positive]\nLeukocyte Esterase: [Negative / Positive]\nMicroscopy: [Pus cells 0-2/hpf, RBCs 0-1/hpf]',
    quickChips: ['Clear Yellow', 'Protein: Nil', 'Glucose: Nil', 'Nitrite: Neg', 'Leukocytes: Neg', 'Pus cells 0-2/hpf'],
  },
  'sputum': {
    category: 'Microbiology / Pulmonology',
    primaryUnit: 'Acid-Fast Bacilli',
    referenceRange: 'Negative for Acid-Fast Bacilli (AFB)',
    template: 'GeneXpert MTB/RIF: [MTB Detected / Not Detected]\nRifampicin Resistance: [Detected / Not Detected / N/A]\nAFB Smear Microscopy: [No AFB seen / 1+ / 2+ / 3+]',
    quickChips: ['MTB Not Detected', 'Rifampicin Resistance Not Detected', 'AFB Negative (0/100 fields)', '1+', '2+', '3+'],
  },
  'hepatitis': {
    category: 'Serology / Virology',
    primaryUnit: 'Qualitative',
    referenceRange: 'Non-Reactive / Negative',
    template: 'HBsAg (Hepatitis B Surface Ag): [Non-Reactive / Reactive]\nAnti-HCV (Hepatitis C Ab): [Non-Reactive / Reactive]\nInterpretation: [Negative for Hepatitis B/C]',
    quickChips: ['Non-Reactive', 'Reactive', 'HBsAg Neg', 'Anti-HCV Neg'],
  },
  'thyroid': {
    category: 'Endocrinology',
    primaryUnit: 'mIU/L',
    referenceRange: 'TSH: 0.4 – 4.0 mIU/L, Free T4: 12 – 22 pmol/L, Free T3: 3.1 – 6.8 pmol/L',
    template: 'TSH: [Value] mIU/L\nFree T4 (FT4): [Value] pmol/L\nFree T3 (FT3): [Value] pmol/L',
    quickChips: ['mIU/L', 'pmol/L', 'TSH 1.8 mIU/L', 'FT4 16.5 pmol/L'],
  }
};

/**
 * Intelligent Data Dictionary lookup function for test types
 */
export function lookupLabTestMetadata(testName: string): LabTestMetadata | null {
  if (!testName) return null;
  const nameLower = testName.toLowerCase();

  for (const [key, meta] of Object.entries(LAB_DATA_DICTIONARY)) {
    if (nameLower.includes(key)) {
      return meta;
    }
  }

  // Fallback keyword matching
  if (nameLower.includes('u/e') || nameLower.includes('renal') || nameLower.includes('kidney') || nameLower.includes('cr')) {
    return LAB_DATA_DICTIONARY['urea'];
  }
  if (nameLower.includes('fbg') || nameLower.includes('rbg') || nameLower.includes('sugar') || nameLower.includes('hba1c')) {
    return LAB_DATA_DICTIONARY['glucose'];
  }
  if (nameLower.includes('hb') || nameLower.includes('full blood') || nameLower.includes('fbc') || nameLower.includes('hemogram') || nameLower.includes('blood count')) {
    return LAB_DATA_DICTIONARY['haemoglobin'];
  }
  if (nameLower.includes('lft') || nameLower.includes('bilirubin') || nameLower.includes('transaminase')) {
    return LAB_DATA_DICTIONARY['liver'];
  }
  if (nameLower.includes('hiv') || nameLower.includes('vl') || nameLower.includes('rna') || nameLower.includes('viral')) {
    return LAB_DATA_DICTIONARY['viral load'];
  }
  if (nameLower.includes('urine') || nameLower.includes('urinalysis')) {
    return LAB_DATA_DICTIONARY['urinalysis'];
  }
  if (nameLower.includes('afb') || nameLower.includes('tb') || nameLower.includes('genexpert') || nameLower.includes('sputum')) {
    return LAB_DATA_DICTIONARY['sputum'];
  }

  return null;
}

/**
 * OpenMed AI Real-Time Result Analyzer & Panic Evaluator
 */
export function analyzeLabResultWithOpenMed(testName: string, textResult: string): {
  severity: 'NORMAL' | 'WARNING' | 'PANIC';
  summary: string;
  suggestedImpression?: string;
} {
  if (!textResult || textResult.trim().length === 0) {
    return { severity: 'NORMAL', summary: 'Ready for result entry.' };
  }

  const textLower = textResult.toLowerCase();
  const nameLower = testName.toLowerCase();

  // 1. Sputum AFB / TB Analysis
  if (nameLower.includes('sputum') || nameLower.includes('afb') || nameLower.includes('tb') || nameLower.includes('genexpert')) {
    if (textLower.includes('afb negative') || textLower.includes('no afb') || textLower.includes('negative') || textLower.includes('0/100')) {
      return {
        severity: 'NORMAL',
        summary: '🟢 No Acid-Fast Bacilli (AFB) detected. Sputum smear negative for active TB.',
        suggestedImpression: 'No Acid-Fast Bacilli (AFB) observed across 100 high-power fields. Sputum smear negative for active Pulmonary Tuberculosis.',
      };
    }
    if (textLower.includes('mtb not detected')) {
      return {
        severity: 'NORMAL',
        summary: '🟢 GeneXpert: MTB Not Detected. Low risk of pulmonary tuberculosis.',
        suggestedImpression: 'Mycobacterium tuberculosis complex DNA Not Detected by GeneXpert. Low likelihood of active Pulmonary Tuberculosis.',
      };
    }
    if (textLower.includes('1+') || textLower.includes('2+') || textLower.includes('3+') || textLower.includes('mtb detected') || textLower.includes('positive')) {
      return {
        severity: 'PANIC',
        summary: '🔴 Acid-Fast Bacilli (AFB) / MTB Detected on Sputum! Active Pulmonary TB suspicion.',
        suggestedImpression: 'Acid-Fast Bacilli (AFB) detected on sputum smear. High clinical suspicion of active Pulmonary Tuberculosis; initiate airborne isolation & Anti-TB regimen (RHZE).',
      };
    }
  }

  // 2. Viral Load Analysis
  if (nameLower.includes('viral') || nameLower.includes('hiv') || textLower.includes('cps/ml') || textLower.includes('copies/ml')) {
    if (textLower.includes('undetected') || textLower.includes('< 20') || textLower.includes('suppressed') || textLower.includes('<20') || textLower.includes('tnd')) {
      return {
        severity: 'NORMAL',
        summary: '🟢 Target Not Detected / Suppressed (< 20 cps/ml). Excellent virological control.',
        suggestedImpression: 'Virological suppression achieved (< 20 cps/ml). Continue current ART regimen.',
      };
    }
    const numbers = textResult.match(/\d+[\d,]*/g);
    if (numbers) {
      const val = parseInt(numbers[0].replace(/,/g, ''), 10);
      if (val > 1000) {
        return {
          severity: 'PANIC',
          summary: `🔴 High Viral Load Detected (${val.toLocaleString()} cps/ml > 1,000 cps/ml). Suspected virological failure!`,
          suggestedImpression: `High viral load (${val.toLocaleString()} cps/ml) on ART. Evaluated for adherence failure; consider viral load re-test in 3 months or resistance testing.`,
        };
      } else if (val >= 20) {
        return {
          severity: 'WARNING',
          summary: `🟡 Low-level Viremia (${val.toLocaleString()} cps/ml). Monitor patient adherence closely.`,
          suggestedImpression: `Low-level viremia (${val.toLocaleString()} cps/ml). Reinforced ART medication adherence.`,
        };
      }
    }
  }

  // 3. Urea, Electrolytes & Creatinine (U/E/Cr) Analysis
  if (nameLower.includes('urea') || nameLower.includes('electrolytes') || nameLower.includes('u/e') || nameLower.includes('renal') || nameLower.includes('creatinine')) {
    // Check explicit Potassium (K+) first
    const kMatch = textLower.match(/(?:k\+|potassium)\s*:?\s*(\d+(?:\.\d+)?)/);
    if (kMatch) {
      const kVal = parseFloat(kMatch[1]);
      if (kVal > 6.0) {
        return {
          severity: 'PANIC',
          summary: `🔴 CRITICAL PANIC ALERT: Potassium ${kVal} mmol/L (Hyperkalemia). High risk of cardiac arrhythmia!`,
          suggestedImpression: `Severe hyperkalemia (K+ ${kVal} mmol/L). Urgent ECG and IV calcium gluconate / insulin-dextrose protocol.`,
        };
      } else if (kVal < 3.0) {
        return {
          severity: 'PANIC',
          summary: `🔴 CRITICAL PANIC ALERT: Potassium ${kVal} mmol/L (Severe Hypokalemia). Urgent IV potassium replacement.`,
          suggestedImpression: `Severe hypokalemia (K+ ${kVal} mmol/L). Slow IV potassium chloride replacement protocol.`,
        };
      }
    }

    // Check Urea / numeric value entered
    const firstNumMatch = textResult.match(/(\d+(?:\.\d+)?)/);
    if (firstNumMatch) {
      const val = parseFloat(firstNumMatch[1]);
      if (val >= 2.5 && val <= 7.8) {
        return {
          severity: 'NORMAL',
          summary: `🟢 Serum Urea / Electrolytes value (${val} mmol/L) is within normal reference range (2.5 – 7.8 mmol/L).`,
          suggestedImpression: 'Serum urea, electrolytes (Na+, K+, Cl-), and creatinine are within normal physiological limits. Normal renal clearance.',
        };
      } else if (val > 15.0) {
        return {
          severity: 'WARNING',
          summary: `🟡 Elevated Urea / Nitrogenous Waste (${val} mmol/L). High risk of renal impairment / AKI.`,
          suggestedImpression: `Elevated serum urea (${val} mmol/L) and nitrogenous waste. Findings suggestive of impaired renal clearance / acute kidney injury.`,
        };
      }
    }

    return {
      severity: 'NORMAL',
      summary: '🟢 Electrolytes & Nitrogenous wastes within expected physiological range.',
      suggestedImpression: 'Serum urea, electrolytes (Na+, K+, Cl-), and creatinine are within normal physiological limits. Normal renal clearance.',
    };
  }

  // 4. Haemoglobin / Full Blood Count Analysis
  if (nameLower.includes('haemoglobin') || nameLower.includes('hb') || nameLower.includes('cbc')) {
    const hbMatch = textLower.match(/(?:hb|haemoglobin)\s*:?\s*(\d+(?:\.\d+)?)/) || textResult.match(/(\d+(?:\.\d+)?)/);
    if (hbMatch) {
      const val = parseFloat(hbMatch[1]);
      if (val > 0 && val < 7.0) {
        return {
          severity: 'PANIC',
          summary: `🔴 CRITICAL PANIC VALUE: Haemoglobin ${val} g/dL indicates severe anemia! Transfusion review required immediately.`,
          suggestedImpression: `Severe anemia (Hb ${val} g/dL). Urgent cross-match and blood transfusion protocol initiated.`,
        };
      } else if (val >= 7.0 && val < 11.0) {
        return {
          severity: 'WARNING',
          summary: `🟡 Moderate Anemia Detected (Hb ${val} g/dL). Recommend hematinics & iron panel.`,
          suggestedImpression: `Moderate anemia (Hb ${val} g/dL). Started oral iron supplementation and dietary counseling.`,
        };
      } else if (val >= 11.0 && val <= 17.5) {
        return {
          severity: 'NORMAL',
          summary: `🟢 Haemoglobin level (${val} g/dL) is within normal reference range.`,
          suggestedImpression: `Haemoglobin level (${val} g/dL) is normal. No signs of anemia.`,
        };
      }
    }
  }

  // 5. Urinalysis
  if (nameLower.includes('urine') || nameLower.includes('urinalysis')) {
    if (textLower.includes('nil') || textLower.includes('clear') || textLower.includes('negative')) {
      return {
        severity: 'NORMAL',
        summary: '🟢 Urinalysis negative for protein, glucose, nitrites, and leukocytes.',
        suggestedImpression: 'Urinalysis dipstick negative for proteinuria, glucosuria, nitrites, and hematuria. Normal urinary parameters.',
      };
    }
    if (textLower.includes('leukocyte') || textLower.includes('nitrite') || textLower.includes('pus')) {
      return {
        severity: 'WARNING',
        summary: '🟡 Urinalysis positive for leukocytes/nitrites suggestive of UTI.',
        suggestedImpression: 'Positive leukocyte esterase & nitrites on urinalysis dipstick. Findings suggestive of Urinary Tract Infection (UTI).',
      };
    }
  }

  // 6. Malaria
  if (nameLower.includes('malaria')) {
    if (textLower.includes('negative') || textLower.includes('nil') || textLower.includes('not seen')) {
      return {
        severity: 'NORMAL',
        summary: '🟢 Blood film microscopy and RDT negative for malaria parasites.',
        suggestedImpression: 'Blood film microscopy and RDT negative for Plasmodium falciparum trophozoites/gametocytes.',
      };
    }
    if (textLower.includes('positive') || textLower.includes('+') || textLower.includes('falciparum')) {
      return {
        severity: 'WARNING',
        summary: '🟡 Malaria parasites detected on blood film microscopy.',
        suggestedImpression: 'Plasmodium falciparum parasites identified on blood smear. Findings confirm active malaria infection; initiate Artemisinin-based Combination Therapy (ACT).',
      };
    }
  }

  // 7. ECG / Cardiology
  if (nameLower.includes('ecg') || nameLower.includes('electrocardiogram')) {
    if (textLower.includes('normal') || textLower.includes('sinus rhythm')) {
      return {
        severity: 'NORMAL',
        summary: '🟢 Normal Sinus Rhythm recorded.',
        suggestedImpression: '12-lead ECG demonstrates Normal Sinus Rhythm within age-appropriate voltage & conduction parameters. No acute ST-T ischemic changes.',
      };
    }
  }

  // Generic fallback
  return {
    severity: 'NORMAL',
    summary: '🔵 Test values captured cleanly in standard units.',
    suggestedImpression: `${testName} result recorded: "${textResult.trim()}". Value reviewed and documented in EMR.`,
  };
}

export function deriveLabInterpretation(
  testName: string,
  resultValue: string,
  resultUnit: string,
  referenceRange: string
): string {
  if (!resultValue || !resultValue.trim()) return 'NORMAL';
  const valLower = resultValue.toLowerCase().trim();
  const testLower = (testName || '').toLowerCase();
  const unitLower = (resultUnit || '').toLowerCase();
  const refLower = (referenceRange || '').toLowerCase();
  const numVal = parseFloat(resultValue);

  if (valLower.includes('pos') || valLower.includes('+') || valLower.includes('reactive') || valLower.includes('detected')) {
    return 'POSITIVE';
  }
  if (valLower.includes('neg') || valLower.includes('nil') || valLower.includes('non-reactive') || valLower.includes('not detected')) {
    return 'NEGATIVE';
  }

  if (!isNaN(numVal)) {
    // 1. WBC / Leukocyte Count (Ref: 4.0 - 11.0 x10^9/L)
    if (testLower.includes('wbc') || testLower.includes('white') || refLower.includes('wbc') || refLower.includes('4.0-11') || refLower.includes('4.0–11') || (unitLower.includes('10^9') && numVal >= 3.0 && numVal <= 25.0 && !refLower.includes('150'))) {
      if (numVal < 2.0) return 'CRITICAL_LOW';
      if (numVal < 4.0) return 'ABNORMAL';
      if (numVal > 20.0) return 'CRITICAL_HIGH';
      if (numVal > 11.0) return 'ABNORMAL';
      return 'NORMAL';
    }

    // 2. Platelet Count (Ref: 150 - 450 x10^9/L)
    if (testLower.includes('plt') || testLower.includes('platelet') || refLower.includes('plt') || refLower.includes('150-400') || refLower.includes('150–450') || (unitLower.includes('10^9') && numVal >= 50 && numVal <= 600)) {
      if (numVal < 50) return 'CRITICAL_LOW';
      if (numVal < 150) return 'ABNORMAL';
      if (numVal > 450) return 'ABNORMAL';
      return 'NORMAL';
    }

    // 3. Hemoglobin / Hb (Ref: 12.0 - 17.5 g/dL)
    if (testLower.includes('hb') || testLower.includes('hgb') || testLower.includes('haemoglobin') || unitLower.includes('g/dl') || refLower.includes('hgb:') || refLower.includes('hb:')) {
      if (numVal < 7.0) return 'CRITICAL_LOW';
      if (numVal < 12.0) return 'ABNORMAL';
      if (numVal > 18.0) return 'CRITICAL_HIGH';
      return 'NORMAL';
    }

    // 4. Glucose (Ref: 3.9 - 7.8 mmol/L or 70 - 140 mg/dL)
    if (testLower.includes('glucose') || testLower.includes('sugar') || testLower.includes('fbs') || testLower.includes('rbg')) {
      if (numVal < 3.0 || (numVal < 55 && unitLower.includes('mg'))) return 'CRITICAL_LOW';
      if (numVal > 15.0 || (numVal > 250 && unitLower.includes('mg'))) return 'CRITICAL_HIGH';
      if (numVal < 3.9 || numVal > 7.8) return 'ABNORMAL';
      return 'NORMAL';
    }

    // Default numeric check against range string if range specifies e.g. "4.0-11.0" or "12-16"
    const rangeMatch = refLower.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      const minRef = parseFloat(rangeMatch[1]);
      const maxRef = parseFloat(rangeMatch[2]);
      if (!isNaN(minRef) && !isNaN(maxRef)) {
        if (numVal < minRef) return 'ABNORMAL';
        if (numVal > maxRef) return 'ABNORMAL';
        return 'NORMAL';
      }
    }

    return 'NORMAL';
  }

  return 'NORMAL';
}

export function draftLabNarrativeReport(
  testName: string,
  category: string,
  resultValue: string,
  resultUnit: string,
  interpretation: string,
  referenceRange: string
): string {
  if (!resultValue || !resultValue.trim()) return '';

  const testLower = (testName || '').toLowerCase();
  const valLower = (resultValue || '').toLowerCase();
  const unitLower = (resultUnit || '').toLowerCase();
  const refLower = (referenceRange || '').toLowerCase();
  const numVal = parseFloat(resultValue);
  const isNum = !isNaN(numVal);

  // 1. Full Blood Count / Hemoglobin / CBC
  if (testLower.includes('blood count') || testLower.includes('cbc') || testLower.includes('fbc') || testLower.includes('haemoglobin') || testLower.includes('hb')) {
    if (isNum) {
      // Determine if parameter is WBC, Platelets, or Hb
      const isWBC = testLower.includes('wbc') || testLower.includes('white') || refLower.includes('wbc') || refLower.includes('4.0-11') || refLower.includes('4.0–11') || (unitLower.includes('10^9') && numVal >= 2.0 && numVal <= 30.0 && !refLower.includes('150'));
      const isPLT = testLower.includes('plt') || testLower.includes('platelet') || refLower.includes('plt') || refLower.includes('150-400') || refLower.includes('150–450') || (unitLower.includes('10^9') && numVal >= 50 && numVal <= 600);
      const isHb = testLower.includes('hb') || testLower.includes('hgb') || testLower.includes('haemoglobin') || unitLower.includes('g/dl') || refLower.includes('hgb:') || refLower.includes('hb:');

      if (isWBC) {
        if (numVal < 4.0) {
          return `Full Blood Count (FBC) reveals Mild Leukopenia (WBC: ${resultValue} ${resultUnit || '×10^9/L'}, Ref: 4.0 – 11.0 ×10^9/L). Patient should be monitored for signs of opportunistic infection.`;
        } else if (numVal <= 11.0) {
          return `Full Blood Count (FBC) evaluation reveals Total Leukocyte Count (WBC: ${resultValue} ${resultUnit || '×10^9/L'}) within normal physiological reference limits (Ref: 4.0 – 11.0 ×10^9/L). No leukopenia or leukocytosis detected.`;
        } else {
          return `Full Blood Count (FBC) reveals Leukocytosis (WBC: ${resultValue} ${resultUnit || '×10^9/L'}, Ref: 4.0 – 11.0 ×10^9/L). Findings are suggestive of acute systemic bacterial infection or inflammatory response.`;
        }
      } else if (isPLT) {
        if (numVal < 150) {
          return `Full Blood Count (FBC) reveals Thrombocytopenia (PLT: ${resultValue} ${resultUnit || '×10^9/L'}, Ref: 150 – 450 ×10^9/L). Monitor for hemorrhagic tendencies or petechiae.`;
        } else if (numVal <= 450) {
          return `Full Blood Count (FBC) reveals normal Platelet count (PLT: ${resultValue} ${resultUnit || '×10^9/L'}, Ref: 150 – 450 ×10^9/L). Normal thrombocyte count.`;
        } else {
          return `Full Blood Count (FBC) reveals Thrombocytosis (PLT: ${resultValue} ${resultUnit || '×10^9/L'}, Ref: 150 – 450 ×10^9/L).`;
        }
      } else {
        // Default to Hb / Hemoglobin evaluation
        if (numVal < 7.0) {
          return `Full Blood Count (FBC) evaluation reveals SEVERE ANEMIA (Hb: ${resultValue} ${resultUnit || 'g/dL'}, Ref: 12.0 – 17.5 g/dL). White cell count and platelet indices require critical monitoring. Immediate clinical evaluation and blood cross-match protocol recommended.`;
        } else if (numVal < 12.0) {
          return `Full Blood Count (FBC) evaluation reveals moderate normocytic normochromic anemia (Hb: ${resultValue} ${resultUnit || 'g/dL'}, Ref: 12.0 – 17.5 g/dL). Leukocyte and thrombocyte counts remain within normal physiological ranges. Hematinic supplementation and dietary counseling advised.`;
        } else if (numVal <= 17.5) {
          return `Full Blood Count (FBC) parameters are within physiological reference limits (Hb: ${resultValue} ${resultUnit || 'g/dL'}, Ref: 12.0 – 17.5 g/dL). Normal leukocyte and thrombocyte count. No acute hematological abnormality detected.`;
        } else {
          return `Full Blood Count (FBC) reveals elevated hemoglobin / erythrocytosis (Hb: ${resultValue} ${resultUnit || 'g/dL'}). Correlate with hydration status and arterial oxygen saturation.`;
        }
      }
    }
  }

  // 2. Urinalysis Dipstick / Panel
  if (testLower.includes('urinalysis') || testLower.includes('urine')) {
    if (valLower.includes('protein') || valLower.includes('++') || valLower.includes('leukocyte') || valLower.includes('nitrite') || valLower.includes('pus') || interpretation === 'ABNORMAL' || interpretation === 'POSITIVE') {
      return `Urinalysis dipstick examination demonstrates abnormal urinary findings (${resultValue}). Positive indicators for proteinuria, pyuria, and urinary pathogens noted. Findings are suggestive of urinary tract infection (UTI) / renal tract inflammation. Urine culture and sensitivity testing recommended.`;
    } else if (valLower.includes('nil') || valLower.includes('normal') || valLower.includes('negative') || valLower.includes('clear') || interpretation === 'NORMAL' || interpretation === 'NEGATIVE') {
      return `Urinalysis dipstick examination demonstrates normal urinary parameters (${resultValue}). Negative for significant proteinuria, glucosuria, nitrites, leukocytes, and hematuria. Normal renal excretion.`;
    }
  }

  // 3. Fasting / Random Blood Sugar / Glucose
  if (testLower.includes('glucose') || testLower.includes('sugar') || testLower.includes('fbs') || testLower.includes('rbg')) {
    if (isNum) {
      if (numVal >= 11.1 || (numVal >= 200 && (resultUnit.includes('mg') || !resultUnit))) {
        return `Blood glucose measurement is markedly elevated (${resultValue} ${resultUnit || 'mmol/L'}, Ref: ${referenceRange || '3.9 - 7.8 mmol/L'}). Consistent with acute hyperglycemia / uncontrolled diabetes mellitus. Correlate with HbA1c and monitor urinary ketones.`;
      } else if (numVal >= 7.0 || (numVal >= 126 && (resultUnit.includes('mg') || !resultUnit))) {
        return `Blood glucose measurement indicates impaired fasting glucose / hyperglycemia (${resultValue} ${resultUnit || 'mmol/L'}, Ref: ${referenceRange || '3.9 - 5.6 mmol/L'}). Clinical correlation and lifestyle / antidiabetic management recommended.`;
      } else if (numVal < 3.9 || (numVal < 70 && (resultUnit.includes('mg') || !resultUnit))) {
        return `CRITICAL ALERT: Hypoglycemia detected (${resultValue} ${resultUnit || 'mmol/L'}). Immediate administration of oral glucose or intravenous 50% dextrose indicated per emergency hypoglycemia protocol.`;
      } else {
        return `Blood glucose measurement is within normal fasting reference range (${resultValue} ${resultUnit || 'mmol/L'}, Ref: ${referenceRange || '3.9 - 5.6 mmol/L'}). Normal glycemic control.`;
      }
    }
  }

  // 4. Malaria RDT / Microscopic Blood Smear
  if (testLower.includes('malaria') || testLower.includes('rdt') || testLower.includes('blood film')) {
    if (valLower.includes('pos') || valLower.includes('+') || valLower.includes('falciparum') || interpretation === 'POSITIVE') {
      return `Microscopic blood film / RDT examination confirms presence of Plasmodium falciparum asexual trophozoites (${resultValue}). Parasite density: moderate. Recommend prompt initiation of Artemisinin-based Combination Therapy (ACT).`;
    } else {
      return `Microscopic blood film and RDT examination negative for Plasmodium falciparum parasites (${resultValue}). No malarial parasites visualized on thick and thin blood smears.`;
    }
  }

  // 5. Widal / Serology / Typhoid Test
  if (testLower.includes('widal') || testLower.includes('typhoid') || testLower.includes('salmonella')) {
    return `Serological Widal agglutination test reveals elevated Salmonella antibodies (${resultValue}). Antibody titers support clinical impression of active typhoid / enteric fever. Correlate with blood culture and clinical symptomatology.`;
  }

  // 6. Genotype / Hb Electrophoresis
  if (testLower.includes('genotype') || testLower.includes('electrophoresis')) {
    if (valLower.includes('ss') || valLower.includes('sc')) {
      return `Hemoglobin electrophoresis confirms Hb ${resultValue.toUpperCase()} phenotype (Sickle Cell Disorder). Sickling test positive. Routine comprehensive sickle cell care and crisis prevention measures advised.`;
    } else if (valLower.includes('as') || valLower.includes('ac')) {
      return `Hemoglobin electrophoresis reveals Hb ${resultValue.toUpperCase()} phenotype (Sickle Cell Trait / Carrier). Asymptomatic carrier status. Genetic counseling recommended.`;
    } else {
      return `Hemoglobin electrophoresis confirms normal Hb AA phenotype (${resultValue.toUpperCase()}). No abnormal hemoglobin variant detected.`;
    }
  }

  // 7. Generic Fallback Narrative Generator
  let interpText = interpretation ? interpretation.replace(/_/g, ' ') : '';
  if (interpText === 'NORMAL' || interpText === 'NEGATIVE') {
    return `Laboratory evaluation of ${testName} demonstrates parameters within standard physiological reference ranges (${resultValue} ${resultUnit}, Ref: ${referenceRange || 'Standard Range'}). No diagnostic abnormalities observed.`;
  } else if (interpText.includes('CRITICAL')) {
    return `CRITICAL VALUE ALERT: ${testName} measurement (${resultValue} ${resultUnit}) is severely abnormal (Ref: ${referenceRange || 'Standard Range'}). Prompt clinician notification and urgent clinical correlation advised.`;
  } else {
    return `Laboratory evaluation of ${testName} reveals value of ${resultValue} ${resultUnit} (Ref: ${referenceRange || 'Standard Range'}, Interpretation: ${interpText || 'Recorded'}). Clinical correlation with patient presentation recommended.`;
  }
}

export interface InventoryDictionaryItem {
  itemCode: string;
  itemName: string;
  category: 'REAGENT' | 'CONSUMABLE' | 'CONTROL' | 'CALIBRATOR' | 'MEDIA' | 'PPE';
  department: string;
  unit: string;
  minimumStock: number;
  reorderLevel: number;
  unitCost: number;
  supplier: string;
  storageCondition: string;
}

export const LAB_INVENTORY_DICTIONARY: InventoryDictionaryItem[] = [
  // HAEMATOLOGY
  { itemCode: 'RGT-FBC-001', itemName: 'Sysmex FBC Lyse Reagent (500ml)', category: 'REAGENT', department: 'HAEMATOLOGY', unit: 'Bottle', minimumStock: 5, reorderLevel: 10, unitCost: 45000, supplier: 'Sysmex Corporation', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'RGT-FBC-002', itemName: 'Sysmex Cellpack Diluent (20L)', category: 'REAGENT', department: 'HAEMATOLOGY', unit: 'Box', minimumStock: 3, reorderLevel: 8, unitCost: 65000, supplier: 'Sysmex Corporation', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'RGT-STN-001', itemName: 'Giemsa Stain Solution (1L)', category: 'REAGENT', department: 'HAEMATOLOGY', unit: 'Bottle', minimumStock: 4, reorderLevel: 8, unitCost: 18500, supplier: 'Biorex Diagnostics', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'RGT-STN-002', itemName: 'Leishman Stain Solution (500ml)', category: 'REAGENT', department: 'HAEMATOLOGY', unit: 'Bottle', minimumStock: 3, reorderLevel: 6, unitCost: 14000, supplier: 'Biorex Diagnostics', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CTL-FBC-001', itemName: 'Hematology 3-Level Control (Low, Normal, High)', category: 'CONTROL', department: 'HAEMATOLOGY', unit: 'Kit', minimumStock: 2, reorderLevel: 5, unitCost: 85000, supplier: 'Mindray Bio-Medical', storageCondition: '2°C – 8°C (Refrigerated / Cold Chain)' },
  { itemCode: 'CON-EDT-001', itemName: 'EDTA Vacutainer Tubes 4ml (Box of 100)', category: 'CONSUMABLE', department: 'HAEMATOLOGY', unit: 'Box', minimumStock: 15, reorderLevel: 30, unitCost: 12500, supplier: 'BD Medical', storageCondition: '15°C – 25°C (Room Temperature)' },
  
  // PARASITOLOGY
  { itemCode: 'RGT-MAL-001', itemName: 'Malaria Pf/Pv Rapid Diagnostic Test (RDT) Cassettes (Box of 50)', category: 'REAGENT', department: 'PARASITOLOGY', unit: 'Box', minimumStock: 10, reorderLevel: 25, unitCost: 28000, supplier: 'Abbott Laboratories', storageCondition: '2°C – 30°C (Cool Dry Place)' },
  { itemCode: 'RGT-MAL-002', itemName: 'Field Stain A & B Set (2x500ml)', category: 'REAGENT', department: 'PARASITOLOGY', unit: 'Pack', minimumStock: 3, reorderLevel: 6, unitCost: 16000, supplier: 'Biorex Diagnostics', storageCondition: '15°C – 25°C (Room Temperature)' },

  // CHEMICAL PATHOLOGY
  { itemCode: 'RGT-GLU-001', itemName: 'Glucose Oxidase (GOD-PAP) Reagent Kit', category: 'REAGENT', department: 'CHEMICAL_PATHOLOGY', unit: 'Kit', minimumStock: 5, reorderLevel: 10, unitCost: 32000, supplier: 'Mindray Bio-Medical', storageCondition: '2°C – 8°C (Refrigerated / Cold Chain)' },
  { itemCode: 'RGT-RPT-001', itemName: 'Urea & Creatinine Reagent Cartridges (100 Tests)', category: 'REAGENT', department: 'CHEMICAL_PATHOLOGY', unit: 'Kit', minimumStock: 4, reorderLevel: 8, unitCost: 95000, supplier: 'Roche Diagnostics', storageCondition: '2°C – 8°C (Refrigerated / Cold Chain)' },
  { itemCode: 'RGT-LFT-001', itemName: 'Liver Function Test (LFT) Multi-Reagent Panel', category: 'REAGENT', department: 'CHEMICAL_PATHOLOGY', unit: 'Kit', minimumStock: 3, reorderLevel: 6, unitCost: 110000, supplier: 'Roche Diagnostics', storageCondition: '2°C – 8°C (Refrigerated / Cold Chain)' },
  { itemCode: 'CAL-BIO-001', itemName: 'Multi-Calibrator Biochemistry Standard (5x5ml)', category: 'CALIBRATOR', department: 'CHEMICAL_PATHOLOGY', unit: 'Vial', minimumStock: 2, reorderLevel: 4, unitCost: 48000, supplier: 'Mindray Bio-Medical', storageCondition: '2°C – 8°C (Refrigerated / Cold Chain)' },
  { itemCode: 'CTL-BIO-001', itemName: 'Serum Biochemistry Control Level 1 & 2', category: 'CONTROL', department: 'CHEMICAL_PATHOLOGY', unit: 'Kit', minimumStock: 2, reorderLevel: 5, unitCost: 72000, supplier: 'Roche Diagnostics', storageCondition: '2°C – 8°C (Refrigerated / Cold Chain)' },

  // MICROBIOLOGY
  { itemCode: 'RGT-GRAM-01', itemName: 'Gram Stain Kit (Crystal Violet, Iodine, Decolorizer, Safranin)', category: 'REAGENT', department: 'MICROBIOLOGY', unit: 'Kit', minimumStock: 3, reorderLevel: 6, unitCost: 22000, supplier: 'Biorex Diagnostics', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'MED-AGR-001', itemName: 'Blood Agar Powder Base (500g)', category: 'MEDIA', department: 'MICROBIOLOGY', unit: 'Bottle', minimumStock: 2, reorderLevel: 4, unitCost: 38000, supplier: 'Biorex Diagnostics', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'MED-AGR-002', itemName: 'MacConkey Agar Powder Base (500g)', category: 'MEDIA', department: 'MICROBIOLOGY', unit: 'Bottle', minimumStock: 2, reorderLevel: 4, unitCost: 35000, supplier: 'Biorex Diagnostics', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-SWB-001', itemName: 'Sterile Cotton Swabs with Transport Medium (Box of 100)', category: 'CONSUMABLE', department: 'MICROBIOLOGY', unit: 'Box', minimumStock: 10, reorderLevel: 20, unitCost: 15000, supplier: 'BD Medical', storageCondition: '15°C – 25°C (Room Temperature)' },

  // IMMUNOLOGY & SEROLOGY
  { itemCode: 'RGT-HIV-001', itemName: 'Determine HIV 1/2 Rapid Test Strips (Box of 100)', category: 'REAGENT', department: 'IMMUNOLOGY_SEROLOGY', unit: 'Box', minimumStock: 5, reorderLevel: 15, unitCost: 42000, supplier: 'Abbott Laboratories', storageCondition: '2°C – 30°C (Cool Dry Place)' },
  { itemCode: 'RGT-HBS-001', itemName: 'HBsAg Hepatitis B Surface Antigen Strip Kit (Box of 50)', category: 'REAGENT', department: 'IMMUNOLOGY_SEROLOGY', unit: 'Box', minimumStock: 5, reorderLevel: 10, unitCost: 25000, supplier: 'Abbott Laboratories', storageCondition: '2°C – 30°C (Cool Dry Place)' },
  { itemCode: 'RGT-WID-001', itemName: 'Widal Typhoid Salmonella Agglutination Antigen Set (4x5ml)', category: 'REAGENT', department: 'IMMUNOLOGY_SEROLOGY', unit: 'Pack', minimumStock: 4, reorderLevel: 8, unitCost: 29000, supplier: 'Biorex Diagnostics', storageCondition: '2°C – 8°C (Refrigerated / Cold Chain)' },

  // BLOOD BANK
  { itemCode: 'RGT-BBK-001', itemName: 'Anti-A, Anti-B & Anti-D Blood Grouping Monoclonal Sera Set (3x10ml)', category: 'REAGENT', department: 'BLOOD_BANK', unit: 'Pack', minimumStock: 4, reorderLevel: 8, unitCost: 38000, supplier: 'Biorex Diagnostics', storageCondition: '2°C – 8°C (Refrigerated / Cold Chain)' },
  { itemCode: 'CON-BGB-001', itemName: 'Triple Blood Collection Bags 450ml with CPDA-1 (Box of 20)', category: 'CONSUMABLE', department: 'BLOOD_BANK', unit: 'Box', minimumStock: 5, reorderLevel: 10, unitCost: 54000, supplier: 'BD Medical', storageCondition: '15°C – 25°C (Room Temperature)' },

  // GENERAL CONSUMABLES & PPE
  { itemCode: 'CON-GLV-001', itemName: 'Nitrile Examination Gloves Powder-Free (Box of 100) Medium', category: 'PPE', department: 'HAEMATOLOGY', unit: 'Box', minimumStock: 25, reorderLevel: 50, unitCost: 4500, supplier: 'Local Medical Supply', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-SYR-001', itemName: 'Disposable Syringes 5ml with 21G Needle (Box of 100)', category: 'CONSUMABLE', department: 'HAEMATOLOGY', unit: 'Box', minimumStock: 20, reorderLevel: 40, unitCost: 8500, supplier: 'BD Medical', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-LNC-001', itemName: 'Sterile Safety Blood Lancets 28G (Box of 200)', category: 'CONSUMABLE', department: 'HAEMATOLOGY', unit: 'Box', minimumStock: 15, reorderLevel: 30, unitCost: 6500, supplier: 'BD Medical', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-URN-001', itemName: 'Sterile Urine Sample Collection Containers 60ml (Pack of 100)', category: 'CONSUMABLE', department: 'MICROBIOLOGY', unit: 'Pack', minimumStock: 10, reorderLevel: 25, unitCost: 11000, supplier: 'Local Medical Supply', storageCondition: '15°C – 25°C (Room Temperature)' },

  // ADDITIONAL REAGENTS, CONSUMABLES & TUBES
  { itemCode: 'CON-TUB-001', itemName: 'Lithium Heparin Gel Vacutainer Tubes 4ml (Box of 100)', category: 'CONSUMABLE', department: 'CHEMICAL_PATHOLOGY', unit: 'Box', minimumStock: 15, reorderLevel: 30, unitCost: 13500, supplier: 'BD Medical', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-TUB-002', itemName: 'Sodium Citrate Coagulation Tubes 3.2% (Box of 100)', category: 'CONSUMABLE', department: 'HAEMATOLOGY', unit: 'Box', minimumStock: 10, reorderLevel: 20, unitCost: 14000, supplier: 'BD Medical', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-TUB-003', itemName: 'Fluoride Oxalate Glucose Blood Tubes (Box of 100)', category: 'CONSUMABLE', department: 'CHEMICAL_PATHOLOGY', unit: 'Box', minimumStock: 10, reorderLevel: 20, unitCost: 12500, supplier: 'BD Medical', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-TUB-004', itemName: 'Clot Activator Red Top Serum Tubes (Box of 100)', category: 'CONSUMABLE', department: 'CHEMICAL_PATHOLOGY', unit: 'Box', minimumStock: 15, reorderLevel: 30, unitCost: 12000, supplier: 'BD Medical', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'RGT-PT-001', itemName: 'Prothrombin Time (PT/INR) Thromboplastin Reagent Kit', category: 'REAGENT', department: 'HAEMATOLOGY', unit: 'Kit', minimumStock: 3, reorderLevel: 6, unitCost: 42000, supplier: 'Biorex Diagnostics', storageCondition: '2°C – 8°C (Refrigerated / Cold Chain)' },
  { itemCode: 'RGT-APTT-01', itemName: 'Activated Partial Thromboplastin Time (aPTT) Reagent Kit', category: 'REAGENT', department: 'HAEMATOLOGY', unit: 'Kit', minimumStock: 3, reorderLevel: 6, unitCost: 45000, supplier: 'Biorex Diagnostics', storageCondition: '2°C – 8°C (Refrigerated / Cold Chain)' },
  { itemCode: 'RGT-HBA1C-1', itemName: 'HbA1c Glycated Hemoglobin Assay Reagent Kit (50 Tests)', category: 'REAGENT', department: 'CHEMICAL_PATHOLOGY', unit: 'Kit', minimumStock: 3, reorderLevel: 6, unitCost: 88000, supplier: 'Mindray Bio-Medical', storageCondition: '2°C – 8°C (Refrigerated / Cold Chain)' },
  { itemCode: 'RGT-ELE-001', itemName: 'Electrolyte Analyzer Reagent Pack (Na+/K+/Cl-/iCa2+)', category: 'REAGENT', department: 'CHEMICAL_PATHOLOGY', unit: 'Pack', minimumStock: 2, reorderLevel: 4, unitCost: 125000, supplier: 'Roche Diagnostics', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'RGT-LIP-001', itemName: 'Lipid Profile Panel Reagents (Chol, Trig, HDL, LDL)', category: 'REAGENT', department: 'CHEMICAL_PATHOLOGY', unit: 'Kit', minimumStock: 3, reorderLevel: 6, unitCost: 98000, supplier: 'Roche Diagnostics', storageCondition: '2°C – 8°C (Refrigerated / Cold Chain)' },
  { itemCode: 'RGT-HCL-001', itemName: 'H. pylori Antigen Rapid Stool Test Cassettes (Box of 25)', category: 'REAGENT', department: 'PARASITOLOGY', unit: 'Box', minimumStock: 4, reorderLevel: 8, unitCost: 32000, supplier: 'Abbott Laboratories', storageCondition: '2°C – 30°C (Cool Dry Place)' },
  { itemCode: 'RGT-SYP-001', itemName: 'VDRL / RPR Syphilis Serology Carbon Test Kit (100 Tests)', category: 'REAGENT', department: 'IMMUNOLOGY_SEROLOGY', unit: 'Kit', minimumStock: 3, reorderLevel: 6, unitCost: 28000, supplier: 'Biorex Diagnostics', storageCondition: '2°C – 8°C (Refrigerated / Cold Chain)' },
  { itemCode: 'RGT-HCV-001', itemName: 'Anti-HCV Rapid Cassette Test Kit (Box of 40)', category: 'REAGENT', department: 'IMMUNOLOGY_SEROLOGY', unit: 'Box', minimumStock: 4, reorderLevel: 8, unitCost: 31000, supplier: 'Abbott Laboratories', storageCondition: '2°C – 30°C (Cool Dry Place)' },
  { itemCode: 'RGT-PREG-01', itemName: 'Urine Pregnancy hCG Test Strips (Box of 100)', category: 'REAGENT', department: 'CHEMICAL_PATHOLOGY', unit: 'Box', minimumStock: 5, reorderLevel: 10, unitCost: 12000, supplier: 'Local Medical Supply', storageCondition: '2°C – 30°C (Cool Dry Place)' },
  { itemCode: 'CON-URN-002', itemName: 'Multistix 10SG Urine Dipstick Test Strips (Bottle of 100)', category: 'CONSUMABLE', department: 'CHEMICAL_PATHOLOGY', unit: 'Bottle', minimumStock: 5, reorderLevel: 10, unitCost: 18500, supplier: 'Siemens Healthineers', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'RGT-ZN-001', itemName: 'Ziehl-Neelsen AFB Stain Kit (Carbol Fuchsin, Acid Alcohol, Methylene Blue)', category: 'REAGENT', department: 'MICROBIOLOGY', unit: 'Kit', minimumStock: 3, reorderLevel: 6, unitCost: 24000, supplier: 'Biorex Diagnostics', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-PLT-001', itemName: 'Disposable Petri Dishes 90mm Sterilized (Pack of 500)', category: 'CONSUMABLE', department: 'MICROBIOLOGY', unit: 'Pack', minimumStock: 2, reorderLevel: 5, unitCost: 26000, supplier: 'Local Medical Supply', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-MIC-001', itemName: 'Microscope Glass Slides Frosted End (Box of 72)', category: 'CONSUMABLE', department: 'HAEMATOLOGY', unit: 'Box', minimumStock: 10, reorderLevel: 20, unitCost: 3500, supplier: 'Local Medical Supply', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-MIC-002', itemName: 'Glass Cover Slips 22x22mm (Box of 100)', category: 'CONSUMABLE', department: 'HAEMATOLOGY', unit: 'Box', minimumStock: 10, reorderLevel: 20, unitCost: 2800, supplier: 'Local Medical Supply', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'RGT-OIL-001', itemName: 'Synthetic Immersion Oil for Microscopy 100ml', category: 'REAGENT', department: 'HAEMATOLOGY', unit: 'Bottle', minimumStock: 3, reorderLevel: 6, unitCost: 9500, supplier: 'Biorex Diagnostics', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-TIP-001', itemName: 'Yellow Micro-Pipette Tips 20-200µl (Rack of 96)', category: 'CONSUMABLE', department: 'CHEMICAL_PATHOLOGY', unit: 'Pack', minimumStock: 10, reorderLevel: 20, unitCost: 4200, supplier: 'BD Medical', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-TIP-002', itemName: 'Blue Micro-Pipette Tips 100-1000µl (Rack of 96)', category: 'CONSUMABLE', department: 'CHEMICAL_PATHOLOGY', unit: 'Pack', minimumStock: 10, reorderLevel: 20, unitCost: 4500, supplier: 'BD Medical', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-MCT-001', itemName: 'Microcentrifuge Tubes 1.5ml (Pack of 500)', category: 'CONSUMABLE', department: 'CHEMICAL_PATHOLOGY', unit: 'Pack', minimumStock: 5, reorderLevel: 10, unitCost: 8900, supplier: 'BD Medical', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-TOU-001', itemName: 'Phlebotomy Quick Release Tourniquet (Pack of 5)', category: 'CONSUMABLE', department: 'HAEMATOLOGY', unit: 'Pack', minimumStock: 4, reorderLevel: 8, unitCost: 5500, supplier: 'Local Medical Supply', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-ALC-001', itemName: 'Isopropyl Alcohol Prep Swabs 70% (Box of 200)', category: 'CONSUMABLE', department: 'HAEMATOLOGY', unit: 'Box', minimumStock: 10, reorderLevel: 20, unitCost: 4800, supplier: 'Local Medical Supply', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-GOW-001', itemName: 'Fluid-Resistant Isolation Gowns (Pack of 10)', category: 'PPE', department: 'MICROBIOLOGY', unit: 'Pack', minimumStock: 5, reorderLevel: 10, unitCost: 14500, supplier: 'Local Medical Supply', storageCondition: '15°C – 25°C (Room Temperature)' },
  { itemCode: 'CON-MSK-001', itemName: 'N95 Particulate Respirator Masks (Box of 20)', category: 'PPE', department: 'MICROBIOLOGY', unit: 'Box', minimumStock: 10, reorderLevel: 20, unitCost: 18000, supplier: 'Local Medical Supply', storageCondition: '15°C – 25°C (Room Temperature)' }
];

export function lookupLabInventoryItem(name: string): InventoryDictionaryItem | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase().trim();
  return LAB_INVENTORY_DICTIONARY.find(item =>
    item.itemName.toLowerCase() === lower ||
    item.itemName.toLowerCase().includes(lower) ||
    lower.includes(item.itemName.toLowerCase())
  );
}

export interface EquipmentDictionaryItem {
  name: string;
  model: string;
  department: string;
  notes: string;
  isCustom?: boolean;
}

export const LAB_EQUIPMENT_DICTIONARY: EquipmentDictionaryItem[] = [
  { name: 'Sysmex XN-550 Automated Hematology Analyzer', model: 'XN-550', department: 'HAEMATOLOGY', notes: 'ASTM E1381 / HL7 Live Sync Interface. 5-part differential blood cell counter.' },
  { name: 'Sysmex XN-1000 Hematology System', model: 'XN-1000', department: 'HAEMATOLOGY', notes: 'High-throughput automated 5-part differential & reticulocyte analyzer.' },
  { name: 'Mindray BC-5000 Auto Hematology Analyzer', model: 'BC-5000', department: 'HAEMATOLOGY', notes: 'Laser scatter 5-part hematology analyzer with capillary blood capability.' },
  { name: 'Mindray BS-240 Clinical Chemistry Analyzer', model: 'BS-240', department: 'CHEMICAL_PATHOLOGY', notes: 'HL7 v2.5 / RS232 Serial Interface. 200 tests/hour throughput.' },
  { name: 'Mindray BS-480 Auto-Chemistry Analyzer', model: 'BS-480', department: 'CHEMICAL_PATHOLOGY', notes: 'Discrete 400 tests/hour chemistry analyzer with ISE module.' },
  { name: 'Roche Cobas c 311 Analyzer System', model: 'Cobas c 311', department: 'CHEMICAL_PATHOLOGY', notes: 'Photometric & ISE measurement unit. Interfaced via TCP-IP.' },
  { name: 'Roche Cobas e 411 Immunoassay Analyzer', model: 'Cobas e 411', department: 'IMMUNOLOGY_SEROLOGY', notes: 'ECLIA Elektrochemilumineszenz-Technologie for hormone & tumor markers.' },
  { name: 'Abbott Architect i1000SR Immunoassay Analyzer', model: 'Architect i1000SR', department: 'IMMUNOLOGY_SEROLOGY', notes: 'CHEMIFLEX chemiluminescent immunoassay technology.' },
  { name: 'Abbott Architect c4000 Clinical Chemistry System', model: 'Architect c4000', department: 'CHEMICAL_PATHOLOGY', notes: 'High-speed clinical chemistry system with automated maintenance.' },
  { name: 'GeneXpert IV Molecular Diagnostic System', model: 'GeneXpert IV System', department: 'MICROBIOLOGY', notes: 'Automated nested real-time PCR cartridge analyzer.' },
  { name: 'GeneXpert XVI 16-Bay PCR Analyzer System', model: 'GeneXpert XVI', department: 'MICROBIOLOGY', notes: 'High-capacity 16-module random access molecular PCR system.' },
  { name: 'BioMérieux VITEK 2 Compact Automated ID/AST', model: 'VITEK 2 Compact', department: 'MICROBIOLOGY', notes: 'Microbial identification & antibiotic susceptibility testing system.' },
  { name: 'BioMérieux BacT/ALERT 3D Microbial Detection System', model: 'BacT/ALERT 3D', department: 'MICROBIOLOGY', notes: 'Automated blood culture & sterile body fluid incubation system.' },
  { name: 'Siemens Atellica Solution Immunoassay & Chemistry', model: 'Atellica CH 930', department: 'CHEMICAL_PATHOLOGY', notes: 'Bidirectional magnetic sample transport technology.' },
  { name: 'Beckman Coulter Access 2 Immunoassay System', model: 'Access 2', department: 'IMMUNOLOGY_SEROLOGY', notes: 'Chemiluminescent immunoassay analyzer with magnetic particle separation.' },
  { name: 'Sysmex CS-1600 Automated Blood Coagulation Analyzer', model: 'CS-1600', department: 'HAEMATOLOGY', notes: 'Multi-wavelength photo-optical clot detection system for PT/aPTT/Fibrinogen.' },
  { name: 'Mindray UA-66 Automated Urine Sediment Analyzer', model: 'UA-66', department: 'CHEMICAL_PATHOLOGY', notes: 'Automated digital microscopy urine formed element analyzer.' },
  { name: 'Radiometer ABL90 FLEX Blood Gas Analyzer', model: 'ABL90 FLEX', department: 'CHEMICAL_PATHOLOGY', notes: 'Cassette-based arterial blood gas & electrolyte analyzer.' },
  { name: 'Helena Spira Automated Agarose Gel Electrophoresis System', model: 'Spira Gel', department: 'HAEMATOLOGY', notes: 'Serum protein & hemoglobin variant electrophoresis analyzer.' },
  { name: 'Ortho Clinical Diagnostics Vision Blood Bank Analyzer', model: 'Ortho Vision', department: 'BLOOD_BANK', notes: 'Automated gel card column agglutination blood grouping & crossmatching system.' }
];

export function lookupLabEquipmentItem(name: string): EquipmentDictionaryItem | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase().trim();
  return LAB_EQUIPMENT_DICTIONARY.find(item =>
    item.name.toLowerCase() === lower ||
    item.name.toLowerCase().includes(lower) ||
    lower.includes(item.name.toLowerCase())
  );
}

export interface QcControlDictionaryItem {
  controlName: string;
  department: string;
  lotNumber: string;
  testName: string;
  expectedRange: string;
  targetMean: number;
  sd: number;
  isCustom?: boolean;
}

export const LAB_QC_CONTROL_DICTIONARY: QcControlDictionaryItem[] = [
  { controlName: 'Sysmex Eightcheck-3WP (Level 1 Low)', department: 'HAEMATOLOGY', lotNumber: 'LOT-EC3P-2026L1', testName: 'Full Blood Count (FBC)', expectedRange: '1.5 - 2.5 x10^12/L (RBC)', targetMean: 2.0, sd: 0.1 },
  { controlName: 'Sysmex Eightcheck-3WP (Level 2 Normal)', department: 'HAEMATOLOGY', lotNumber: 'LOT-EC3P-2026N2', testName: 'Hemoglobin (Hb)', expectedRange: '12.0 - 14.5 g/dL', targetMean: 13.2, sd: 0.4 },
  { controlName: 'Sysmex Eightcheck-3WP (Level 3 High)', department: 'HAEMATOLOGY', lotNumber: 'LOT-EC3P-2026H3', testName: 'Platelet Count', expectedRange: '350 - 450 x10^9/L', targetMean: 400, sd: 15 },
  { controlName: 'Bio-Rad Liquichek Hematology Control (Level 2 Normal)', department: 'HAEMATOLOGY', lotNumber: 'LOT-BR-HEM2026B', testName: 'WBC (Total Leucocyte Count)', expectedRange: '6.5 - 8.5 x10^9/L', targetMean: 7.5, sd: 0.3 },
  { controlName: 'Bio-Rad Liquichek Coagulation Control (Level 1 Normal)', department: 'HAEMATOLOGY', lotNumber: 'LOT-BR-COAG01N', testName: 'Prothrombin Time (PT/INR)', expectedRange: '11.0 - 13.5 sec (INR 0.9 - 1.1)', targetMean: 12.0, sd: 0.4 },
  { controlName: 'Bio-Rad Multiqual Chemistry Control (Level 1 Low)', department: 'CHEMICAL_PATHOLOGY', lotNumber: 'LOT-MQ-CHEM-L1', testName: 'Fasting Blood Sugar (FBS)', expectedRange: '65 - 85 mg/dL', targetMean: 75, sd: 3.5 },
  { controlName: 'Bio-Rad Multiqual Chemistry Control (Level 2 Normal)', department: 'CHEMICAL_PATHOLOGY', lotNumber: 'LOT-MQ-CHEM-N2', testName: 'Fasting Blood Sugar (FBS)', expectedRange: '70 - 100 mg/dL', targetMean: 85, sd: 4.0 },
  { controlName: 'Bio-Rad Multiqual Chemistry Control (Level 3 High)', department: 'CHEMICAL_PATHOLOGY', lotNumber: 'LOT-MQ-CHEM-H3', testName: 'Fasting Blood Sugar (FBS)', expectedRange: '220 - 260 mg/dL', targetMean: 240, sd: 8.0 },
  { controlName: 'Mindray Chemistry Control (Level 2 Normal)', department: 'CHEMICAL_PATHOLOGY', lotNumber: 'LOT-MND-CHEM-88A', testName: 'Serum Creatinine', expectedRange: '0.7 - 1.3 mg/dL', targetMean: 1.0, sd: 0.1 },
  { controlName: 'Roche PreciControl Universal (Level 1 Normal)', department: 'CHEMICAL_PATHOLOGY', lotNumber: 'LOT-RCH-PCU-001', testName: 'Liver Function Test (LFT) - ALT/SGPT', expectedRange: '15 - 45 U/L', targetMean: 30, sd: 3.0 },
  { controlName: 'Roche PreciControl Cardiac (Level 2 High)', department: 'CHEMICAL_PATHOLOGY', lotNumber: 'LOT-RCH-CARD-02H', testName: 'Troponin I (High Sensitivity)', expectedRange: '0.04 - 0.12 ng/mL', targetMean: 0.08, sd: 0.01 },
  { controlName: 'BioMérieux VITEK QC Organism Control Pack', department: 'MICROBIOLOGY', lotNumber: 'LOT-BMX-VTK-991', testName: 'Blood Culture & Antibiotic Sensitivity (AST)', expectedRange: 'E. coli ATCC 25922 Pass', targetMean: 1, sd: 0 },
  { controlName: 'GeneXpert Multi-Bug Molecular QC Control', department: 'MICROBIOLOGY', lotNumber: 'LOT-GXP-MB-2026', testName: 'GeneXpert MTB/RIF (Tuberculosis PCR)', expectedRange: 'MTB Target Ct 24.5 ± 2.0', targetMean: 24.5, sd: 0.6 },
  { controlName: 'Roche PreciControl Infectious Diseases (Anti-HCV)', department: 'IMMUNOLOGY_SEROLOGY', lotNumber: 'LOT-RCH-INF-HCV', testName: 'Hepatitis C Virus (Anti-HCV) Antibody', expectedRange: 'Non-Reactive (COI < 0.90)', targetMean: 0.4, sd: 0.05 },
  { controlName: 'Abbott Liquid Immunoassay Control (TSH Level 2)', department: 'IMMUNOLOGY_SEROLOGY', lotNumber: 'LOT-ABT-TSH-L2', testName: 'Thyroid Function Test (TSH, Free T3, Free T4)', expectedRange: '1.8 - 3.2 mIU/L', targetMean: 2.5, sd: 0.2 },
  { controlName: 'Ortho Vision Blood Bank Control Cells (A B O Rh)', department: 'BLOOD_BANK', lotNumber: 'LOT-ORT-BB-442', testName: 'Blood Grouping & Rh Factor', expectedRange: 'Clear 4+ Agglutination', targetMean: 4, sd: 0 }
];

export const LAB_STAFF_LIST = [
  'Tertsegha Vegher (Senior Medical Officer)',
  'Dr. Emmanuel Vegher (Lab Director)',
  'Sarah Jenkins (Chief Lab Scientist)',
  'Michael Cole (QC & Calibration Specialist)',
  'Grace Danjuma (Senior Hematologist)',
  'David Olamide (Chemical Pathologist)',
  'Amina Yusuf (Microbiologist)'
];

export function lookupLabQcControl(name: string): QcControlDictionaryItem | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase().trim();
  return LAB_QC_CONTROL_DICTIONARY.find(c =>
    c.controlName.toLowerCase() === lower ||
    c.controlName.toLowerCase().includes(lower) ||
    lower.includes(c.controlName.toLowerCase())
  );
}
