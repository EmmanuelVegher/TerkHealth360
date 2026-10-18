/**
 * WHO ICD-11 & WHO ATC Standard Terminology Registries
 * Designed for NHTDAO (National Health Technology and Data Analytics Office)
 * and National Digital Health Architecture (NDHA) compliance.
 */

export interface WhoIcd11Item {
  system: 'ICD11';
  systemUri: 'http://id.who.int/icd/release/11/mms';
  code: string;
  display: string;
  category: 'DIAGNOSIS' | 'MATERNITY' | 'INFECTIOUS' | 'CHRONIC' | 'SURGICAL' | 'PEDIATRIC';
  chapter: string;
  description: string;
}

export interface WhoAtcItem {
  system: 'ATC';
  systemUri: 'http://www.whocc.no/atc';
  code: string;
  display: string;
  category: 'PHARMACY';
  atcGroup: string;
  therapeuticClass: string;
  definedDailyDose?: string;
  description: string;
}

export const WHO_ICD11_REGISTRY: WhoIcd11Item[] = [
  // ── Chapter 01: Certain infectious or parasitic diseases ──────────────────
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1F40',
    display: 'Malaria due to Plasmodium falciparum',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Falciparum malaria, the predominant life-threatening species in sub-Saharan Africa'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1F41',
    display: 'Malaria due to Plasmodium vivax',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Vivax benign tertian malaria with liver hypnozoite phase'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1F44',
    display: 'Severe malaria',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Complicated malaria presenting with cerebral signs, severe anaemia, pulmonary oedema or renal failure'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1F4Z',
    display: 'Malaria, unspecified species',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Clinical or rapid-test positive malaria without microscopic speciation'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1A07',
    display: 'Typhoid fever',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Systemic enteric infection caused by Salmonella enterica serotype Typhi'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1A08',
    display: 'Paratyphoid fever',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Enteric fever caused by Salmonella paratyphi A, B, or C'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1B10',
    display: 'Respiratory tuberculosis',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Pulmonary tuberculosis confirmed by bacteriological culture, smear or GeneXpert MTB/RIF'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1B11',
    display: 'Extrapulmonary tuberculosis',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Tuberculosis of meninges, lymph nodes, bones, joints or abdominal organs'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1C60',
    display: 'Human immunodeficiency virus disease clinical stage 1',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Asymptomatic HIV infection or persistent generalized lymphadenopathy (WHO Stage 1)'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1C62',
    display: 'Human immunodeficiency virus disease clinical stage 3',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Advanced HIV infection with pulmonary TB, severe weight loss, or persistent fever'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1A00',
    display: 'Cholera',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Acute profuse watery diarrhoea caused by Vibrio cholerae'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1A40',
    display: 'Infectious gastroenteritis or colitis without specified organism',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Acute diarrhoeal illness of infectious origin requiring rehydration therapy'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1D61.2',
    display: 'Lassa fever',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Acute viral hemorrhagic fever endemic in West Africa caused by Lassa mammarenavirus'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1D47',
    display: 'Yellow fever',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Acute flavivirus infection transmitted by Aedes mosquitoes'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1D01',
    display: 'Bacterial meningitis',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Acute inflammation of the meninges caused by Neisseria meningitidis or Streptococcus pneumoniae'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '1E50',
    display: 'Acute viral hepatitis B',
    category: 'INFECTIOUS',
    chapter: '01 Certain infectious or parasitic diseases',
    description: 'Hepatitis B virus infection presenting with acute jaundice and elevated transaminases'
  },

  // ── Chapter 11: Diseases of the circulatory system ────────────────────────
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'BA00',
    display: 'Essential hypertension',
    category: 'CHRONIC',
    chapter: '11 Diseases of the circulatory system',
    description: 'Primary high blood pressure (BP >= 140/90 mmHg) without identified secondary cause'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'BA01',
    display: 'Hypertensive heart disease',
    category: 'CHRONIC',
    chapter: '11 Diseases of the circulatory system',
    description: 'Left ventricular hypertrophy or cardiac impairment secondary to chronic hypertension'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'BA04',
    display: 'Hypertensive crisis',
    category: 'CHRONIC',
    chapter: '11 Diseases of the circulatory system',
    description: 'Severe acute BP elevation (>180/120 mmHg) with impending or acute target-organ damage'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'BD10',
    display: 'Heart failure',
    category: 'CHRONIC',
    chapter: '11 Diseases of the circulatory system',
    description: 'Congestive cardiac failure with impaired systolic or diastolic ventricular function'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '8B20',
    display: 'Stroke not known if ischaemic or haemorrhagic',
    category: 'CHRONIC',
    chapter: '08 Diseases of the nervous system',
    description: 'Acute cerebrovascular accident presenting with focal neurological deficits'
  },

  // ── Chapter 05: Endocrine, nutritional or metabolic diseases ──────────────
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '5A11',
    display: 'Type 2 diabetes mellitus',
    category: 'CHRONIC',
    chapter: '05 Endocrine, nutritional or metabolic diseases',
    description: 'Non-insulin dependent adult-onset diabetes mellitus characterized by insulin resistance'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '5A10',
    display: 'Type 1 diabetes mellitus',
    category: 'CHRONIC',
    chapter: '05 Endocrine, nutritional or metabolic diseases',
    description: 'Autoimmune pancreatic beta-cell destruction causing absolute insulin deficiency'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '5A22',
    display: 'Diabetic ketoacidosis',
    category: 'CHRONIC',
    chapter: '05 Endocrine, nutritional or metabolic diseases',
    description: 'Acute metabolic emergency in diabetes with ketonemia, metabolic acidosis, and hyperglycemia'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '5B50',
    display: 'Severe acute malnutrition (SAM)',
    category: 'PEDIATRIC',
    chapter: '05 Endocrine, nutritional or metabolic diseases',
    description: 'Severe pediatric wasting (WHZ < -3 or MUAC < 11.5 cm) or nutritional bilateral pitting oedema (Kwashiorkor)'
  },

  // ── Chapter 03: Diseases of the blood or blood-forming organs ─────────────
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '3A51',
    display: 'Sickle-cell disorders or other haemoglobinopathies',
    category: 'CHRONIC',
    chapter: '03 Diseases of the blood or blood-forming organs',
    description: 'Hemoglobin SS, SC or S/beta-thalassemia autosomal recessive red cell disorder'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '3A51.0',
    display: 'Sickle-cell anaemia with crisis',
    category: 'CHRONIC',
    chapter: '03 Diseases of the blood or blood-forming organs',
    description: 'Acute painful vaso-occlusive, aplastic, or splenic sequestration crisis in HbSS'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: '3A00',
    display: 'Iron deficiency anaemia',
    category: 'DIAGNOSIS',
    chapter: '03 Diseases of the blood or blood-forming organs',
    description: 'Microcytic hypochromic anaemia due to inadequate iron stores'
  },

  // ── Chapter 12: Diseases of the respiratory system ────────────────────────
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'CA40',
    display: 'Pneumonia',
    category: 'INFECTIOUS',
    chapter: '12 Diseases of the respiratory system',
    description: 'Acute infection of the lung parenchyma characterized by consolidation and fever'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'CA23',
    display: 'Bronchial asthma',
    category: 'CHRONIC',
    chapter: '12 Diseases of the respiratory system',
    description: 'Chronic inflammatory airway disease with variable airflow obstruction and wheezing'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'CA22',
    display: 'Chronic obstructive pulmonary disease',
    category: 'CHRONIC',
    chapter: '12 Diseases of the respiratory system',
    description: 'Progressive airflow limitation caused by airway and parenchymal abnormalities'
  },

  // ── Chapter 18: Pregnancy, childbirth or the puerperium ───────────────────
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'JA00',
    display: 'Single spontaneous delivery',
    category: 'MATERNITY',
    chapter: '18 Pregnancy, childbirth or the puerperium',
    description: 'Uncomplicated cephalic vaginal delivery of a live infant at term'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'JA01',
    display: 'Delivery by caesarean section',
    category: 'MATERNITY',
    chapter: '18 Pregnancy, childbirth or the puerperium',
    description: 'Operative delivery of fetus through abdominal and uterine incisions'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'JA24',
    display: 'Pre-eclampsia',
    category: 'MATERNITY',
    chapter: '18 Pregnancy, childbirth or the puerperium',
    description: 'Gestational hypertension developing after 20 weeks with significant proteinuria or end-organ signs'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'JA25',
    display: 'Eclampsia',
    category: 'MATERNITY',
    chapter: '18 Pregnancy, childbirth or the puerperium',
    description: 'Obstetric emergency with tonic-clonic convulsions in a patient with pre-eclampsia'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'JA43',
    display: 'Postpartum haemorrhage',
    category: 'MATERNITY',
    chapter: '18 Pregnancy, childbirth or the puerperium',
    description: 'Blood loss >= 500 mL following vaginal delivery or >= 1000 mL following caesarean section'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'JA05',
    display: 'Obstructed labour',
    category: 'MATERNITY',
    chapter: '18 Pregnancy, childbirth or the puerperium',
    description: 'Failure of labor progress despite strong uterine contractions due to cephalopelvic disproportion or malpresentation'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'JA02',
    display: 'Ectopic pregnancy',
    category: 'MATERNITY',
    chapter: '18 Pregnancy, childbirth or the puerperium',
    description: 'Implantation of the blastocyst outside the uterine endometrium (commonly tubal)'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'JA65',
    display: 'Spontaneous abortion',
    category: 'MATERNITY',
    chapter: '18 Pregnancy, childbirth or the puerperium',
    description: 'Natural loss of a pregnancy before 24 or 28 completed weeks of gestation (Miscarriage)'
  },

  // ── Chapter 19: Certain conditions originating in the perinatal period ────
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'KA60',
    display: 'Bacterial sepsis of newborn',
    category: 'PEDIATRIC',
    chapter: '19 Certain conditions originating in the perinatal period',
    description: 'Systemic bacterial infection occurring within the first 28 days of neonatal life'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'KA00',
    display: 'Disorders of newborn related to short gestation and low birth weight',
    category: 'PEDIATRIC',
    chapter: '19 Certain conditions originating in the perinatal period',
    description: 'Prematurity (gestation < 37 weeks) or birth weight < 2500 grams'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'KA40',
    display: 'Neonatal jaundice',
    category: 'PEDIATRIC',
    chapter: '19 Certain conditions originating in the perinatal period',
    description: 'Hyperbilirubinemia manifesting in the neonatal period (physiological or pathological)'
  },

  // ── Chapter 13 & 16: Digestive & Genitourinary Systems ────────────────────
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'GC08',
    display: 'Urinary tract infection, site not specified',
    category: 'DIAGNOSIS',
    chapter: '16 Diseases of the genitourinary system',
    description: 'Infection of the bladder or upper urinary tract confirmed by urinalysis / urine microscopy'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'GB61',
    display: 'Acute kidney failure',
    category: 'CHRONIC',
    chapter: '16 Diseases of the genitourinary system',
    description: 'Rapid reduction in glomerular filtration rate manifesting as oliguria and rising serum creatinine'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'GB60',
    display: 'Chronic kidney disease',
    category: 'CHRONIC',
    chapter: '16 Diseases of the genitourinary system',
    description: 'Persistent kidney damage or GFR < 60 mL/min/1.73m2 for > 3 months'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'GA10',
    display: 'Benign prostatic hyperplasia',
    category: 'SURGICAL',
    chapter: '16 Diseases of the genitourinary system',
    description: 'Non-malignant enlargement of the prostate gland causing lower urinary tract symptoms'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'DA63',
    display: 'Peptic ulcer disease',
    category: 'DIAGNOSIS',
    chapter: '13 Diseases of the digestive system',
    description: 'Ulceration of gastric or duodenal mucosa commonly related to H. pylori or NSAID usage'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'DB10',
    display: 'Acute appendicitis',
    category: 'SURGICAL',
    chapter: '13 Diseases of the digestive system',
    description: 'Acute inflammation of the vermiform appendix requiring prompt surgical evaluation'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'DB70',
    display: 'Inguinal hernia',
    category: 'SURGICAL',
    chapter: '13 Diseases of the digestive system',
    description: 'Protrusion of abdominal cavity contents through the inguinal canal'
  },

  // ── Chapter 21: Symptoms, signs or clinical findings ─────────────────────
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'MG26',
    display: 'Pyrexia of unknown or unspecified origin',
    category: 'DIAGNOSIS',
    chapter: '21 Symptoms, signs or clinical findings, not elsewhere classified',
    description: 'Fever without evident localizing signs requiring diagnostic workup'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'ME84.2',
    display: 'Low back pain',
    category: 'DIAGNOSIS',
    chapter: '21 Symptoms, signs or clinical findings, not elsewhere classified',
    description: 'Pain, muscle tension or stiffness localized below the costal margin and above the inferior gluteal folds'
  },
  {
    system: 'ICD11',
    systemUri: 'http://id.who.int/icd/release/11/mms',
    code: 'MB40',
    display: 'Headache',
    category: 'DIAGNOSIS',
    chapter: '21 Symptoms, signs or clinical findings, not elsewhere classified',
    description: 'Cephalalgia of tension, migraine, or secondary clinical etiology'
  }
];

export const WHO_ATC_REGISTRY: WhoAtcItem[] = [
  // ── P: Antiparasitic products (Antimalarials) ──────────────────────────────
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'P01BF01',
    display: 'Artemether and lumefantrine',
    category: 'PHARMACY',
    atcGroup: 'P: Antiparasitic products, insecticides and repellents',
    therapeuticClass: 'Antimalarials / Artemisinin-based combination therapy (ACT)',
    definedDailyDose: '4 tablets (80/480mg)',
    description: 'First-line national antimalarial for uncomplicated Plasmodium falciparum malaria'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'P01BE02',
    display: 'Artesunate',
    category: 'PHARMACY',
    atcGroup: 'P: Antiparasitic products, insecticides and repellents',
    therapeuticClass: 'Antimalarials / Artemisinin derivative',
    definedDailyDose: '2.4 mg/kg IV',
    description: 'Intravenous or intramuscular artesunate for treatment of severe complicated malaria'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'P01BD51',
    display: 'Sulfadoxine and pyrimethamine',
    category: 'PHARMACY',
    atcGroup: 'P: Antiparasitic products, insecticides and repellents',
    therapeuticClass: 'Antimalarials / Intermittent Preventive Treatment in Pregnancy (IPTp)',
    definedDailyDose: '3 tablets single dose',
    description: 'National protocol for routine malaria chemoprophylaxis during antenatal care'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'P01AB01',
    display: 'Metronidazole',
    category: 'PHARMACY',
    atcGroup: 'P: Antiparasitic products, insecticides and repellents',
    therapeuticClass: 'Antiprotozoals & Anaerobic Antibacterials',
    definedDailyDose: '1.5 g oral / IV',
    description: 'Amoebiasis, giardiasis, trichomoniasis and anaerobic surgical prophylaxis'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'P02CA03',
    display: 'Albendazole',
    category: 'PHARMACY',
    atcGroup: 'P: Antiparasitic products, insecticides and repellents',
    therapeuticClass: 'Anthelmintics / Benzimidazole derivatives',
    definedDailyDose: '400 mg single dose',
    description: 'Broad-spectrum deworming agent for soil-transmitted helminthiasis'
  },

  // ── N: Nervous system (Analgesics & Antipyretics) ───────────────────────────
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'N02BE01',
    display: 'Paracetamol',
    category: 'PHARMACY',
    atcGroup: 'N: Nervous system',
    therapeuticClass: 'Other analgesics and antipyretics / Anilides',
    definedDailyDose: '3 g',
    description: 'First-line mild to moderate analgesic and antipyretic for adults and pediatrics'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'N02AJ13',
    display: 'Tramadol and paracetamol',
    category: 'PHARMACY',
    atcGroup: 'N: Nervous system',
    therapeuticClass: 'Opioids in combination with non-opioid analgesics',
    definedDailyDose: '4 tablets (37.5/325mg)',
    description: 'Synergistic multimodal analgesia for moderate to severe postoperative or trauma pain'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'N02AA01',
    display: 'Morphine',
    category: 'PHARMACY',
    atcGroup: 'N: Nervous system',
    therapeuticClass: 'Natural opium alkaloids / Controlled opioid analgesic',
    definedDailyDose: '30 mg parenteral',
    description: 'Potent central opioid for severe trauma, obstetric or postoperative pain management'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'N05BA01',
    display: 'Diazepam',
    category: 'PHARMACY',
    atcGroup: 'N: Nervous system',
    therapeuticClass: 'Anxiolytics / Benzodiazepine derivatives',
    definedDailyDose: '10 mg oral/parenteral',
    description: 'Sedative, muscle relaxant, and acute status epilepticus anticonvulsant'
  },

  // ── M: Musculo-skeletal system (Anti-inflammatory) ────────────────────────
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'M01AE01',
    display: 'Ibuprofen',
    category: 'PHARMACY',
    atcGroup: 'M: Musculo-skeletal system',
    therapeuticClass: 'Anti-inflammatory and antirheumatic products / Propionic acid derivatives',
    definedDailyDose: '1.2 g',
    description: 'Non-steroidal anti-inflammatory drug (NSAID) for inflammatory pain and fever'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'M01AB05',
    display: 'Diclofenac',
    category: 'PHARMACY',
    atcGroup: 'M: Musculo-skeletal system',
    therapeuticClass: 'Acetic acid derivatives and related substances',
    definedDailyDose: '100 mg oral / 75 mg IM',
    description: 'Rapid-acting NSAID for renal colic, musculoskeletal injuries, and post-op pain'
  },

  // ── C: Cardiovascular system (Antihypertensives) ───────────────────────────
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'C08CA01',
    display: 'Amlodipine',
    category: 'PHARMACY',
    atcGroup: 'C: Cardiovascular system',
    therapeuticClass: 'Selective calcium channel blockers with mainly vascular effects / Dihydropyridines',
    definedDailyDose: '5 mg',
    description: 'First-line once-daily dihydropyridine calcium channel blocker for essential hypertension'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'C08CA05',
    display: 'Nifedipine',
    category: 'PHARMACY',
    atcGroup: 'C: Cardiovascular system',
    therapeuticClass: 'Calcium channel blockers / Dihydropyridines',
    definedDailyDose: '30 mg retard',
    description: 'Sustained-release calcium channel blocker used in chronic hypertension and pregnancy'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'C09AA03',
    display: 'Lisinopril',
    category: 'PHARMACY',
    atcGroup: 'C: Cardiovascular system',
    therapeuticClass: 'ACE inhibitors, plain',
    definedDailyDose: '10 mg',
    description: 'Angiotensin converting enzyme inhibitor for hypertension, diabetic nephropathy and heart failure'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'C09CA01',
    display: 'Losartan',
    category: 'PHARMACY',
    atcGroup: 'C: Cardiovascular system',
    therapeuticClass: 'Angiotensin II receptor blockers (ARBs), plain',
    definedDailyDose: '50 mg',
    description: 'Angiotensin receptor blocker alternative for patients with ACE-inhibitor induced cough'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'C03CA01',
    display: 'Furosemide',
    category: 'PHARMACY',
    atcGroup: 'C: Cardiovascular system',
    therapeuticClass: 'High-ceiling loop diuretics / Sulfonamides',
    definedDailyDose: '40 mg',
    description: 'Loop diuretic for acute pulmonary oedema, congestive heart failure and severe fluid overload'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'C03AA03',
    display: 'Hydrochlorothiazide',
    category: 'PHARMACY',
    atcGroup: 'C: Cardiovascular system',
    therapeuticClass: 'Thiazides, plain',
    definedDailyDose: '25 mg',
    description: 'Thiazide diuretic commonly combined with ACE inhibitors/ARBs in African hypertension guidelines'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'C07AG02',
    display: 'Labetalol',
    category: 'PHARMACY',
    atcGroup: 'C: Cardiovascular system',
    therapeuticClass: 'Alpha and beta blocking agents',
    definedDailyDose: '200 mg parenteral / oral',
    description: 'First-line parenteral and oral agent for severe pre-eclampsia and hypertensive emergencies'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'C10AA05',
    display: 'Atorvastatin',
    category: 'PHARMACY',
    atcGroup: 'C: Cardiovascular system',
    therapeuticClass: 'Lipid modifying agents / HMG CoA reductase inhibitors',
    definedDailyDose: '20 mg',
    description: 'Statin for secondary prevention of stroke, myocardial infarction and hypercholesterolemia'
  },

  // ── A: Alimentary tract and metabolism (Antidiabetics & Gastro) ─────────────
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'A10BA02',
    display: 'Metformin',
    category: 'PHARMACY',
    atcGroup: 'A: Alimentary tract and metabolism',
    therapeuticClass: 'Blood glucose lowering drugs, excl. insulins / Biguanides',
    definedDailyDose: '2 g',
    description: 'First-line foundational oral hypoglycemic for Type 2 diabetes mellitus'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'A10BB01',
    display: 'Glibenclamide',
    category: 'PHARMACY',
    atcGroup: 'A: Alimentary tract and metabolism',
    therapeuticClass: 'Blood glucose lowering drugs / Sulfonylureas',
    definedDailyDose: '10 mg',
    description: 'Second-generation sulfonylurea stimulating pancreatic insulin release'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'A10AB01',
    display: 'Insulin (human fast-acting)',
    category: 'PHARMACY',
    atcGroup: 'A: Alimentary tract and metabolism',
    therapeuticClass: 'Insulins and analogues for injection, fast-acting',
    definedDailyDose: '40 IU',
    description: 'Regular soluble human insulin for sliding-scale glycemic management and DKA resuscitation'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'A02BC01',
    display: 'Omeprazole',
    category: 'PHARMACY',
    atcGroup: 'A: Alimentary tract and metabolism',
    therapeuticClass: 'Drugs for acid related disorders / Proton pump inhibitors',
    definedDailyDose: '20 mg',
    description: 'Gastric acid suppression for peptic ulcer disease, GERD, and NSAID gastroprotection'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'A07CA',
    display: 'Oral rehydration salt formulations',
    category: 'PHARMACY',
    atcGroup: 'A: Alimentary tract and metabolism',
    therapeuticClass: 'Antidiarrheals, intestinal antiinflammatory/antiinfective / Electrolytes with carbohydrates',
    definedDailyDose: '1 sachet in 1L water',
    description: 'Low-osmolarity ORS for prevention and correction of dehydration in acute gastroenteritis'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'A12CB01',
    display: 'Zinc sulfate',
    category: 'PHARMACY',
    atcGroup: 'A: Alimentary tract and metabolism',
    therapeuticClass: 'Mineral supplements / Zinc',
    definedDailyDose: '20 mg elemental zinc',
    description: 'Co-administered with ORS in pediatric diarrhoea according to WHO and Nigerian IMCI protocol'
  },

  // ── J: Antiinfectives for systemic use (Antibiotics) ───────────────────────
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'J01CA04',
    display: 'Amoxicillin',
    category: 'PHARMACY',
    atcGroup: 'J: Antiinfectives for systemic use',
    therapeuticClass: 'Beta-lactam antibacterials, penicillins / Penicillins with extended spectrum',
    definedDailyDose: '1.5 g',
    description: 'Broad-spectrum oral aminopenicillin for respiratory and ear/nose/throat infections'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'J01CR02',
    display: 'Amoxicillin and beta-lactamase inhibitor (Augmentin)',
    category: 'PHARMACY',
    atcGroup: 'J: Antiinfectives for systemic use',
    therapeuticClass: 'Combinations of penicillins, incl. beta-lactamase inhibitors',
    definedDailyDose: '1.5 g (as amoxicillin)',
    description: 'Co-amoxiclav for beta-lactamase producing organisms in severe skin, dental or pulmonary sepsis'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'J01DD04',
    display: 'Ceftriaxone',
    category: 'PHARMACY',
    atcGroup: 'J: Antiinfectives for systemic use',
    therapeuticClass: 'Other beta-lactam antibacterials / Third-generation cephalosporins',
    definedDailyDose: '2 g IV/IM',
    description: 'Parenteral broad-spectrum third-generation cephalosporin for meningitis, sepsis, and typhoid fever'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'J01MA02',
    display: 'Ciprofloxacin',
    category: 'PHARMACY',
    atcGroup: 'J: Antiinfectives for systemic use',
    therapeuticClass: 'Quinolone antibacterials / Fluoroquinolones',
    definedDailyDose: '1 g oral / 0.8 g IV',
    description: 'Fluoroquinolone for complicated urinary tract infections, severe enteric fever, and infectious diarrhoea'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'J01FA10',
    display: 'Azithromycin',
    category: 'PHARMACY',
    atcGroup: 'J: Antiinfectives for systemic use',
    therapeuticClass: 'Macrolides, lincosamides and streptogramins / Macrolides',
    definedDailyDose: '500 mg',
    description: 'Aza-macrolide with long tissue half-life for community-acquired pneumonia and STIs'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'J01AA02',
    display: 'Doxycycline',
    category: 'PHARMACY',
    atcGroup: 'J: Antiinfectives for systemic use',
    therapeuticClass: 'Tetracyclines',
    definedDailyDose: '100 mg',
    description: 'Broad-spectrum tetracycline for pelvic inflammatory disease, atypical respiratory infections, and cholera'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'J01XE01',
    display: 'Nitrofurantoin',
    category: 'PHARMACY',
    atcGroup: 'J: Antiinfectives for systemic use',
    therapeuticClass: 'Other antibacterials / Nitrofuran derivatives',
    definedDailyDose: '200 mg',
    description: 'First-line oral antibacterial for uncomplicated cystitis and catheter-associated bacteriuria'
  },

  // ── H & G: Systemic hormones & Genito-urinary (Maternity) ──────────────────
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'H01BB02',
    display: 'Oxytocin',
    category: 'PHARMACY',
    atcGroup: 'H: Systemic hormonal preparations, excl. sex hormones and insulins',
    therapeuticClass: 'Pituitary and hypothalamic hormones / Oxytocin and analogues',
    definedDailyDose: '10 IU IM/IV',
    description: 'Standard active management of third stage of labour (AMTSL) to prevent postpartum hemorrhage'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'G02AD06',
    display: 'Misoprostol',
    category: 'PHARMACY',
    atcGroup: 'G: Genito-urinary system and sex hormones',
    therapeuticClass: 'Other gynecologicals / Prostaglandins',
    definedDailyDose: '800 mcg sublingual/rectal',
    description: 'Prostaglandin E1 analogue for prevention and treatment of postpartum hemorrhage and cervical ripening'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'B02AA02',
    display: 'Tranexamic acid',
    category: 'PHARMACY',
    atcGroup: 'B: Blood and blood forming organs',
    therapeuticClass: 'Antihemorrhagics / Antifibrinolytics',
    definedDailyDose: '1 g slow IV',
    description: 'Antifibrinolytic for trauma-induced hemorrhage and primary postpartum hemorrhage (WOMAN trial protocol)'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'B03AA07',
    display: 'Ferrous sulfate and folic acid',
    category: 'PHARMACY',
    atcGroup: 'B: Blood and blood forming organs',
    therapeuticClass: 'Antianemic preparations / Iron preparations with folic acid',
    definedDailyDose: '200 mg (65 mg elemental iron)',
    description: 'Routine national antenatal prophylactic hematinic for prevention of maternal anaemia'
  },

  // ── R: Respiratory system (Asthma & Antihistamines) ────────────────────────
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'R03AC02',
    display: 'Salbutamol',
    category: 'PHARMACY',
    atcGroup: 'R: Respiratory system',
    therapeuticClass: 'Drugs for obstructive airway diseases / Selective beta-2-adrenoreceptor agonists',
    definedDailyDose: '0.8 mg inhalation',
    description: 'Rapid-acting short-acting beta-2 agonist (SABA) bronchodilator for acute asthma exacerbations'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'R06AE07',
    display: 'Cetirizine',
    category: 'PHARMACY',
    atcGroup: 'R: Respiratory system',
    therapeuticClass: 'Antihistamines for systemic use / Piperazine derivatives',
    definedDailyDose: '10 mg',
    description: 'Second-generation non-sedating H1 antihistamine for allergic rhinitis and urticaria'
  },

  // ── B: Blood and blood forming organs (IV Fluids) ─────────────────────────
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'B05XA03',
    display: 'Sodium chloride 0.9% (Normal Saline)',
    category: 'PHARMACY',
    atcGroup: 'B: Blood and blood forming organs',
    therapeuticClass: 'Blood substitutes and perfusion solutions / Electrolyte solutions',
    definedDailyDose: '1000 mL IV',
    description: 'Isotonic crystalloid solution for intravascular volume resuscitation and drug reconstitution'
  },
  {
    system: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    code: 'B05BB01',
    display: 'Electrolytes (Ringer\'s lactate)',
    category: 'PHARMACY',
    atcGroup: 'B: Blood and blood forming organs',
    therapeuticClass: 'Solutions affecting the electrolyte balance / Balanced crystalloid',
    definedDailyDose: '1000 mL IV',
    description: 'Hartmann\'s balanced crystalloid solution for surgical fluid replacement and dehydration'
  }
];

export function searchWhoIcd11(query: string, maxResults = 50): WhoIcd11Item[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(Boolean);

  return WHO_ICD11_REGISTRY.filter((item) => {
    const text = `${item.code} ${item.display} ${item.chapter} ${item.description}`.toLowerCase();
    return tokens.every((token) => text.includes(token));
  }).slice(0, maxResults);
}

export function searchWhoAtc(query: string, maxResults = 50): WhoAtcItem[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(Boolean);

  return WHO_ATC_REGISTRY.filter((item) => {
    const text = `${item.code} ${item.display} ${item.atcGroup} ${item.therapeuticClass} ${item.description}`.toLowerCase();
    return tokens.every((token) => text.includes(token));
  }).slice(0, maxResults);
}
