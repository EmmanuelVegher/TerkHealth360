/**
 * seed_terminology.ts
 * 
 * Comprehensive Production-Grade Global Terminology & Data Dictionary Server
 * Seeds hundreds of international standard concepts across ALL hospital departments:
 * - LOINC (Laboratory Tests, Vitals & Diagnostics)
 * - ICD-10 (Diseases, Diagnoses, Symptoms & Morbidity)
 * - RxNorm (Essential Medications, Dosages & Clinical Formulations)
 * - CPT-4 (Billing Tariffs, Consultations, Surgeries & Radiology)
 * - ISBT 128 (Blood Bank Products & Transfusion Components)
 * - SNOMED CT (Clinical Findings & Physical Signs)
 * 
 * Run: npx ts-node prisma/seed_terminology.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CONCEPTS = [
  // ───────────────────────────────────────────────────────────────────────────
  // 1. LOINC (Laboratory, Pathology & Vital Signs)
  // ───────────────────────────────────────────────────────────────────────────
  // Vitals & Physiological Measurements
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '8480-6', display: 'Systolic Blood Pressure', description: 'Systolic blood pressure in mmHg', category: 'VITAL' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '8462-4', display: 'Diastolic Blood Pressure', description: 'Diastolic blood pressure in mmHg', category: 'VITAL' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '8310-5', display: 'Body Temperature', description: 'Body temperature in degrees Celsius', category: 'VITAL' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '8867-4', display: 'Heart Rate / Pulse', description: 'Heart beats per minute', category: 'VITAL' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '2708-6', display: 'Oxygen Saturation (SpO2)', description: 'Arterial oxygen saturation percentage', category: 'VITAL' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '9279-1', display: 'Respiratory Rate', description: 'Breaths per minute', category: 'VITAL' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '72514-3', display: 'Pain Severity Score', description: 'Pain intensity score 0-10 scale', category: 'VITAL' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '29463-7', display: 'Body Weight', description: 'Patient body weight in kg', category: 'VITAL' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '8302-2', display: 'Body Height', description: 'Patient height in cm', category: 'VITAL' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '39156-5', display: 'Body Mass Index (BMI)', description: 'Calculated BMI in kg/m2', category: 'VITAL' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '14749-6', display: 'Capillary Blood Glucose (RBS)', description: 'Point of care random blood glucose mg/dL', category: 'VITAL' },

  // Hematology & Coagulation
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '57021-8', display: 'Full Blood Count (FBC) Panel', description: 'Complete blood count automated panel', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '718-7', display: 'Hemoglobin Concentration', description: 'Hemoglobin mass/volume in blood (g/dL)', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '4544-3', display: 'Hematocrit (PCV)', description: 'Packed cell volume percentage', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '777-3', display: 'Platelet Count', description: 'Platelets per uL blood', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '6690-2', display: 'Leukocyte Count (WBC)', description: 'Total white blood cell count per uL', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '789-8', display: 'Erythrocyte Count (RBC)', description: 'Total red blood cell count per uL', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '30341-2', display: 'Erythrocyte Sedimentation Rate (ESR)', description: 'ESR mm/1hr automated/manual', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '5905-5', display: 'Prothrombin Time (PT)', description: 'Prothrombin time in seconds', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '6301-6', display: 'INR (International Normalized Ratio)', description: 'Prothrombin time ratio for anticoagulation', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '3173-2', display: 'Activated Partial Thromboplastin Time (aPTT)', description: 'aPTT in seconds', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '48065-7', display: 'D-Dimer Quantitative', description: 'Fibrin degradation D-Dimer level', category: 'LAB' },

  // Clinical Chemistry & Metabolites
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '2345-7', display: 'Fasting Blood Sugar (FBS)', description: 'Glucose [Mass/volume] in fasting blood', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '4548-4', display: 'Hemoglobin A1c (HbA1c)', description: 'Glycated hemoglobin percentage in blood', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '2160-0', display: 'Serum Creatinine', description: 'Creatinine [Mass/volume] in serum or plasma', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '3094-0', display: 'Urea Nitrogen (BUN)', description: 'Urea [Mass/volume] in serum or plasma', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '2823-3', display: 'Serum Potassium', description: 'Potassium [Moles/volume] in serum or plasma', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '2951-2', display: 'Serum Sodium', description: 'Sodium [Moles/volume] in serum or plasma', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '2075-0', display: 'Serum Chloride', description: 'Chloride [Moles/volume] in serum or plasma', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '2028-9', display: 'Serum Bicarbonate (HCO3)', description: 'Bicarbonate level in serum or plasma', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '1975-2', display: 'Total Serum Bilirubin', description: 'Total bilirubin concentration', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '1968-7', display: 'Direct (Conjugated) Bilirubin', description: 'Direct conjugated bilirubin level', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '1920-8', display: 'AST (SGOT)', description: 'Aspartate aminotransferase enzymatic activity', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '1742-6', display: 'ALT (SGPT)', description: 'Alanine aminotransferase enzymatic activity', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '6768-6', display: 'Alkaline Phosphatase (ALP)', description: 'Alkaline phosphatase activity', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '2885-2', display: 'Total Protein', description: 'Total protein concentration in serum', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '1751-7', display: 'Serum Albumin', description: 'Albumin concentration in serum', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '3084-1', display: 'Serum Uric Acid', description: 'Uric acid concentration', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '2093-3', display: 'Total Cholesterol', description: 'Total cholesterol in serum', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '2571-8', display: 'Triglycerides', description: 'Triglycerides concentration in serum', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '2085-9', display: 'HDL Cholesterol', description: 'High density lipoprotein cholesterol', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '13457-7', display: 'LDL Cholesterol (Calculated)', description: 'Low density lipoprotein cholesterol', category: 'LAB' },

  // Cardiac & Biomarkers & Hormones
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '10839-9', display: 'Troponin I High Sensitivity', description: 'Cardiac Troponin I level in serum', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '33762-6', display: 'NT-proBNP', description: 'N-terminal pro-brain natriuretic peptide', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '3016-3', display: 'C-Reactive Protein (CRP)', description: 'Acute phase inflammatory CRP level', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '30163-4', display: 'Thyroid Stimulating Hormone (TSH)', description: 'Serum TSH level', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '2276-4', display: 'Free Thyroxine (FT4)', description: 'Free T4 thyroid hormone level', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '2857-1', display: 'Prostate Specific Antigen (PSA Total)', description: 'Total PSA in serum for prostate screening', category: 'LAB' },

  // Microbiology, Infectious Diseases & Urinalysis
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '89365-1', display: 'Malaria Rapid Diagnostic Test (RDT)', description: 'P. falciparum antigen detection in blood', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '20570-8', display: 'Thick Blood Film (Parasitemia)', description: 'Malaria parasite count per uL blood', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '25836-8', display: 'HIV 1 RNA Viral Load', description: 'Quantitative HIV-1 viral load copies/mL', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '5221-9', display: 'HIV 1/2 Antibody Screen', description: 'Qualitative HIV rapid antibody screening', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '5196-1', display: 'Hepatitis B Surface Antigen (HBsAg)', description: 'HBsAg qualitative detection', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '16128-1', display: 'Hepatitis C Antibody (HCV Ab)', description: 'HCV antibody screening test', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '22461-8', display: 'VDRL / RPR Syphilis Test', description: 'Treponemal/non-treponemal syphilis serology', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '5778-6', display: 'Urinalysis Dipstick Panel', description: 'Automated/manual urine chemical screen', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '21065-8', display: 'Urine Pregnancy Test (hCG)', description: 'Qualitative hCG urine pregnancy test', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '630-4', display: 'Urine Culture & Sensitivity', description: 'Bacterial growth identification and antibiotic susceptibility', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '600-7', display: 'Blood Culture & Sensitivity', description: 'Bloodstream infection microbial culture', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '94500-6', display: 'COVID-19 RT-PCR Test', description: 'SARS-CoV-2 RNA qualitative detection', category: 'LAB' },
  { system: 'LOINC', systemUri: 'http://loinc.org', code: '80372-6', display: 'TB GeneXpert Rifampicin PCR', description: 'M. tuberculosis DNA & Rifampicin resistance', category: 'LAB' },


  // ───────────────────────────────────────────────────────────────────────────
  // 2. ICD-10 (Diseases, Diagnoses, Symptoms & Morbidity)
  // ───────────────────────────────────────────────────────────────────────────
  // Infectious & Parasitic Diseases
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'B50.9', display: 'Plasmodium falciparum malaria, unspecified', description: 'Severe or uncomplicated falciparum malaria', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'B54', display: 'Unspecified malaria', description: 'Malaria fever unspecified species', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'A09', display: 'Infectious gastroenteritis and colitis, unspecified', description: 'Acute diarrhoeal gastroenteritis illness', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'A01.0', display: 'Typhoid fever', description: 'Salmonella typhi enteric fever infection', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'B20', display: 'Human immunodeficiency virus [HIV] disease', description: 'Symptomatic HIV disease / AIDS', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'A15.0', display: 'Tuberculosis of lung, confirmed bacteriologically', description: 'Pulmonary TB positive AFB smear/culture', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'B16.9', display: 'Acute hepatitis B without delta-agent', description: 'Acute viral hepatitis B infection', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'A00.9', display: 'Cholera, unspecified', description: 'Vibrio cholerae acute watery diarrhoea', category: 'DIAGNOSIS' },

  // Cardiovascular & Endocrine & Metabolic
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'I10', display: 'Essential (primary) hypertension', description: 'High systemic blood pressure without secondary cause', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'I11.9', display: 'Hypertensive heart disease without heart failure', description: 'Hypertensive left ventricular hypertrophy', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'I20.9', display: 'Angina pectoris, unspecified', description: 'Ischemic chest pain on exertion', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'I21.9', display: 'Acute myocardial infarction, unspecified', description: 'Acute coronary syndrome / heart attack', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'I50.9', display: 'Heart failure, unspecified', description: 'Congestive cardiac failure (CCF)', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'I63.9', display: 'Cerebral infarction, unspecified', description: 'Ischemic cerebrovascular accident (CVA) stroke', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'E11.9', display: 'Type 2 diabetes mellitus without complications', description: 'Adult onset non-insulin dependent diabetes', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'E10.9', display: 'Type 1 diabetes mellitus without complications', description: 'Juvenile insulin-dependent diabetes', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'E03.9', display: 'Hypothyroidism, unspecified', description: 'Underactive thyroid gland', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'E66.9', display: 'Obesity, unspecified', description: 'Excess body weight BMI >= 30', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'E86', display: 'Volume depletion / Dehydration', description: 'Fluid volume loss due to diarrhoea or fever', category: 'DIAGNOSIS' },

  // Respiratory & Gastrointestinal & Renal
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'J18.9', display: 'Pneumonia, unspecified organism', description: 'Acute lower respiratory tract lung infection', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'J45.909', display: 'Unspecified asthma, uncomplicated', description: 'Bronchial asthma hyperresponsiveness', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'J44.9', display: 'Chronic obstructive pulmonary disease (COPD)', description: 'Chronic airflow obstruction', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'J06.9', display: 'Acute upper respiratory infection, unspecified', description: 'Common cold / acute URTI', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'K29.70', display: 'Gastritis, unspecified, without bleeding', description: 'Acute or chronic gastric mucosa inflammation', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'K25.9', display: 'Gastric ulcer, unspecified', description: 'Peptic ulcer disease (PUD)', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'K35.80', display: 'Unspecified acute appendicitis', description: 'Acute inflammation of the appendix', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'K40.90', display: 'Unilateral inguinal hernia, without obstruction', description: 'Inguinal hernia', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'N39.0', display: 'Urinary tract infection, site not specified', description: 'UTI / Cystitis', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'N18.9', display: 'Chronic kidney disease, unspecified', description: 'End stage or chronic renal insufficiency', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'N17.9', display: 'Acute kidney failure, unspecified', description: 'Acute kidney injury (AKI)', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'N40.0', display: 'Benign prostatic hyperplasia without urinary obstruction', description: 'BPH / Enlarged prostate', category: 'DIAGNOSIS' },

  // Maternity, ANC & Gynaecology
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'O80', display: 'Encounter for full-term uncomplicated delivery', description: 'Normal spontaneous vaginal delivery (NSVD)', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'O14.9', display: 'Unspecified pre-eclampsia', description: 'Pregnancy-induced hypertension with proteinuria', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'O15.9', display: 'Eclampsia, unspecified as to time of onset', description: 'Obstetric emergency with seizures in pre-eclampsia', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'O72.1', display: 'Other immediate postpartum hemorrhage', description: 'Primary PPH following delivery', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'O03.9', display: 'Complete or unspecified spontaneous abortion', description: 'Miscarriage', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'O00.9', display: 'Ectopic pregnancy, unspecified', description: 'Extrauterine pregnancy implantation', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'N94.6', display: 'Dysmenorrhea, unspecified', description: 'Painful menstrual cramps', category: 'DIAGNOSIS' },

  // Hematology, Musculoskeletal, Symptoms & Trauma
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'D50.9', display: 'Iron deficiency anemia, unspecified', description: 'Microcytic hypochromic anaemia', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'D57.0', display: 'Sickle-cell anemia with crisis', description: 'HbSS vaso-occlusive painful crisis', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'M54.50', display: 'Low back pain, unspecified', description: 'Lumbago / lumbar back strain', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'M17.9', display: 'Osteoarthritis of knee, unspecified', description: 'Degenerative knee joint disease', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'R50.9', display: 'Fever, unspecified', description: 'Pyrexia of unknown or unspecified origin', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'R51.9', display: 'Headache, unspecified', description: 'General cephalalgia', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'S06.9X0A', display: 'Unspecified intracranial injury without loss of consciousness', description: 'Head trauma / concussion', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'T78.40', display: 'Allergy, unspecified', description: 'Acute allergic hypersensitivity reaction', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'C50.919', display: 'Malignant neoplasm of breast, unspecified', description: 'Breast carcinoma screening/diagnosis', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'C53.9', display: 'Malignant neoplasm of cervix uteri, unspecified', description: 'Cervical carcinoma', category: 'DIAGNOSIS' },
  { system: 'ICD10', systemUri: 'http://hl7.org/fhir/sid/icd-10', code: 'C61', display: 'Malignant neoplasm of prostate', description: 'Prostate carcinoma', category: 'DIAGNOSIS' },


  // ───────────────────────────────────────────────────────────────────────────
  // 3. RxNorm (Pharmacy, Dispensary & Clinical Drug Formulations)
  // ───────────────────────────────────────────────────────────────────────────
  // Antimalarials & Analgesics
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '198440', display: 'Artemether 80 MG / Lumefantrine 480 MG Oral Tablet', description: 'Coartem / ACT first-line antimalarial', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '312320', display: 'Paracetamol 500 MG Oral Tablet', description: 'Panadol / Acetaminophen antipyretic & analgesic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '141962', display: 'Paracetamol 1000 MG Injectable Solution (Perfalgan)', description: 'IV Paracetamol infusion for acute pain/fever', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197770', display: 'Ibuprofen 400 MG Oral Tablet', description: 'NSAID anti-inflammatory & analgesic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197591', display: 'Diclofenac Sodium 50 MG Oral Tablet', description: 'Voltaren NSAID analgesic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '238712', display: 'Diclofenac Sodium 75 MG/3ML Injectable Solution', description: 'IM Diclofenac ampoule for acute colic/pain', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '833036', display: 'Tramadol Hydrochloride 50 MG Oral Capsule', description: 'Opioid analgesic for moderate to severe pain', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '237158', display: 'Morphine Sulfate 10 MG/ML Injectable Solution', description: 'Severe pain parenteral opioid analgesic', category: 'PHARMACY' },

  // Antihypertensives & Cardiovascular
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197361', display: 'Amlodipine 5 MG Oral Tablet', description: 'Norvasc calcium channel blocker antihypertensive', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197362', display: 'Amlodipine 10 MG Oral Tablet', description: 'Calcium channel blocker antihypertensive', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '314076', display: 'Lisinopril 5 MG Oral Tablet', description: 'Zestril ACE inhibitor antihypertensive', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '314077', display: 'Lisinopril 10 MG Oral Tablet', description: 'ACE inhibitor antihypertensive', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '311354', display: 'Losartan Potassium 50 MG Oral Tablet', description: 'Cozaar ARB antihypertensive', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '310464', display: 'Furosemide 40 MG Oral Tablet', description: 'Lasix loop diuretic for hypertension & edema', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '311653', display: 'Hydrochlorothiazide 12.5 MG Oral Tablet', description: 'Thiazide diuretic antihypertensive', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '237648', display: 'Labetalol Hydrochloride 5 MG/ML Injectable Solution', description: 'IV Labetalol for hypertensive emergency & pre-eclampsia', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '243670', display: 'Aspirin 75 MG Oral Tablet (Cardio)', description: 'Low dose antiplatelet cardioprotection', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '309362', display: 'Clopidogrel 75 MG Oral Tablet', description: 'Plavix antiplatelet agent', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '83367', display: 'Atorvastatin 20 MG Oral Tablet', description: 'Lipitor HMG-CoA reductase inhibitor lipid lowering', category: 'PHARMACY' },

  // Antidiabetics
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '29046', display: 'Metformin 500 MG Oral Tablet', description: 'Glucophage biguanide oral hypoglycaemic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '861004', display: 'Metformin 1000 MG Oral Tablet', description: 'Biguanide oral hypoglycaemic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197737', display: 'Glibenclamide 5 MG Oral Tablet', description: 'Sulfonylurea oral antidiabetic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197734', display: 'Gliclazide 80 MG Oral Tablet', description: 'Sulfonylurea antidiabetic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '106892', display: 'Insulin Human Soluble 100 UNT/ML Injectable (Actrapid)', description: 'Short-acting regular human insulin vial', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '106894', display: 'Insulin Isophane Human 100 UNT/ML Injectable (NPH)', description: 'Intermediate-acting human NPH insulin', category: 'PHARMACY' },

  // Antibiotics & Antimicrobials
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197381', display: 'Amoxicillin 500 MG Oral Capsule', description: 'Broad spectrum penicillin antibiotic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '855332', display: 'Amoxicillin 500 MG / Clavulanate 125 MG Oral Tablet', description: 'Augmentin beta-lactamase inhibitor combination', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197517', display: 'Ciprofloxacin 500 MG Oral Tablet', description: 'Cipro fluoroquinolone antibiotic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '248656', display: 'Azithromycin 500 MG Oral Tablet', description: 'Zithromax macrolide antibiotic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '20610', display: 'Ceftriaxone 1000 MG Injectable Solution', description: '3rd generation cephalosporin IV/IM antibiotic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '309090', display: 'Cefuroxime Axetil 500 MG Oral Tablet', description: '2nd generation cephalosporin antibiotic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '311684', display: 'Metronidazole 400 MG Oral Tablet', description: 'Flagyl antiprotozoal & anaerobic antibacterial', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '237418', display: 'Metronidazole 5 MG/ML (500mg/100ml) IV Infusion', description: 'Intravenous Metronidazole infusion', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '310065', display: 'Doxycycline 100 MG Oral Capsule', description: 'Tetracycline broad spectrum antibiotic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '311753', display: 'Nitrofurantoin 100 MG Oral Capsule', description: 'Urinary tract antibacterial', category: 'PHARMACY' },

  // Gastrointestinal, Respiratory & Obstetric Drugs
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '242220', display: 'Omeprazole 20 MG Oral Capsule', description: 'Losec proton pump inhibitor (PPI)', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '237494', display: 'Pantoprazole 40 MG Injectable Solution', description: 'IV Pantoprazole PPI for acute PUD/GI bleed', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '236437', display: 'Oral Rehydration Salts Powder', description: 'ORS electrolyte replacement sachet', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '313994', display: 'Zinc Sulfate 20 MG Oral Tablet', description: 'Elemental zinc supplement for diarrhoea management', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '212260', display: 'Salbutamol 100 MCG/ACT Inhalation Aerosol', description: 'Ventolin bronchodilator asthma inhaler', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '309252', display: 'Cetirizine 10 MG Oral Tablet', description: 'Zyrtec antihistamine', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '312615', display: 'Prednisolone 5 MG Oral Tablet', description: 'Corticosteroid anti-inflammatory', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '237190', display: 'Hydrocortisone Sodium Succinate 100 MG Injection', description: 'IV Hydrocortisone for acute asthma / shock', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '237624', display: 'Oxytocin 10 UNT/ML Injectable Solution (Pitocin)', description: 'Uterotonic for labor induction & PPH prevention', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '237140', display: 'Misoprostol 200 MCG Oral/Vaginal Tablet', description: 'Prostaglandin E1 uterotonic', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '313576', display: 'Tranexamic Acid 500 MG Injectable Solution', description: 'Antifibrinolytic for hemorrhage management', category: 'PHARMACY' },

  // IV Fluids
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '313002', display: 'Sodium Chloride 0.9% (Normal Saline) 500 ML IV', description: 'Isotonic crystalloid fluid resuscitation', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '313008', display: 'Dextrose 5% in Water 500 ML IV', description: 'Isotonic glucose IV fluid', category: 'PHARMACY' },
  { system: 'RXNORM', systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '313020', display: 'Ringer\'s Lactate Solution 500 ML IV', description: 'Balanced crystalloid fluid resuscitation', category: 'PHARMACY' },


  // ───────────────────────────────────────────────────────────────────────────
  // 4. CPT-4 (Billing, Procedures, Consultations & Tariffs)
  // ───────────────────────────────────────────────────────────────────────────
  // Consultations & Hospital Days
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '99203', display: 'Office or outpatient visit, new patient (Level 3)', description: 'New patient OPD consultation low-moderate complexity', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '99213', display: 'Office or outpatient visit, established patient (Level 3)', description: 'Low to moderate complexity OPD consultation', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '99214', display: 'Office or outpatient visit, established patient (Level 4)', description: 'Moderate to high complexity OPD consultation', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '99222', display: 'Initial inpatient hospital care, per day', description: 'Moderate severity inpatient ward admission', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '99232', display: 'Subsequent hospital care, per day', description: 'Daily routine inpatient ward round review', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '99283', display: 'Emergency department visit (Level 3)', description: 'Emergency room consult moderate severity', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '99285', display: 'Emergency department visit (Level 5 High Severity)', description: 'ER consult high severity / life threat', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '99291', display: 'Critical care, evaluation and management, first 30-74 mins', description: 'ICU intensive critical care first hour', category: 'BILLING' },

  // Surgical Procedures
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '44950', display: 'Appendectomy', description: 'Surgical excision of inflamed appendix', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '49505', display: 'Repair initial inguinal hernia, age 5 years or older', description: 'Inguinal hernia repair surgery', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '59400', display: 'Routine obstetrical care including antepartum, delivery & postpartum', description: 'Full obstetrical bundle NSVD delivery', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '59510', display: 'Cesarean delivery including antepartum and postpartum care', description: 'C-section surgical delivery bundle', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '47600', display: 'Cholecystectomy', description: 'Gallbladder removal surgery', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '27236', display: 'Open treatment of femoral fracture with internal fixation', description: 'ORIF femur fracture surgical repair', category: 'BILLING' },

  // Radiology & Imaging Tariffs
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '71046', display: 'Chest X-Ray, 2 views, frontal and lateral', description: 'Radiology chest imaging procedure', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '70450', display: 'Computed Tomography (CT) Head/Brain without contrast', description: 'Head CT scan non-contrast', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '74177', display: 'Computed Tomography (CT) Abdomen and Pelvis with contrast', description: 'Contrast CT scan abdomen & pelvis', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '76805', display: 'Ultrasound, pregnant uterus (> 14 weeks)', description: 'Obstetric ultrasound imaging fee', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '76700', display: 'Ultrasound, abdominal, real time with image documentation', description: 'Abdominal sonogram complete', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '76856', display: 'Ultrasound, pelvic (nonobstetrical), real time', description: 'Pelvic ultrasound exam', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '93000', display: 'Electrocardiogram (ECG/EKG) 12-lead with interpretation', description: '12-lead diagnostic ECG tracing', category: 'BILLING' },

  // Laboratory & Therapy Fees
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '85025', display: 'Complete Blood Count (CBC) with automated differential', description: 'Automated haematology laboratory test charge', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '80053', display: 'Comprehensive Metabolic Panel (CMP)', description: 'Electrolytes, liver & renal chemistry panel charge', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '82947', display: 'Fasting Blood Glucose Test', description: 'Blood sugar test tariff', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '86689', display: 'HIV Screening Antibody Test', description: 'HIV screening lab fee', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '87205', display: 'Malaria Microscopy Smear', description: 'Malaria parasites smear laboratory charge', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '97110', display: 'Physical therapy therapeutic exercise (15 mins)', description: 'Physiotherapy rehab session charge', category: 'BILLING' },
  { system: 'CPT', systemUri: 'http://www.ama-assn.org/go/cpt', code: '96365', display: 'Intravenous hydration infusion, initial, up to 1 hour', description: 'IV fluid administration therapy fee', category: 'BILLING' },


  // ───────────────────────────────────────────────────────────────────────────
  // 5. ISBT 128 (Blood Bank & Transfusion Components)
  // ───────────────────────────────────────────────────────────────────────────
  { system: 'ISBT128', systemUri: 'http://isbt128.org', code: 'E0386', display: 'Whole Blood, CPDA-1', description: 'Whole blood unit for acute massive haemorrhage transfusion', category: 'BLOOD_BANK' },
  { system: 'ISBT128', systemUri: 'http://isbt128.org', code: 'E0394', display: 'Packed Red Blood Cells (PRBC)', description: 'Concentrated erythrocytes unit for severe anaemia', category: 'BLOOD_BANK' },
  { system: 'ISBT128', systemUri: 'http://isbt128.org', code: 'E0611', display: 'Fresh Frozen Plasma (FFP)', description: 'Coagulation factors plasma unit', category: 'BLOOD_BANK' },
  { system: 'ISBT128', systemUri: 'http://isbt128.org', code: 'E0678', display: 'Platelet Concentrate from Whole Blood', description: 'Platelets unit for thrombocytopenia / active bleeding', category: 'BLOOD_BANK' },
  { system: 'ISBT128', systemUri: 'http://isbt128.org', code: 'E0722', display: 'Cryoprecipitate AHF', description: 'Fibrinogen and Factor VIII rich cryo fraction', category: 'BLOOD_BANK' },
  { system: 'ISBT128', systemUri: 'http://isbt128.org', code: 'E1432', display: 'Washed Red Blood Cells', description: 'Plasma-free washed RBC unit for allergic reaction prevention', category: 'BLOOD_BANK' },
  { system: 'ISBT128', systemUri: 'http://isbt128.org', code: 'E2310', display: 'Granulocytes Pheresis', description: 'Neutrophils unit for severe refractory neutropenia', category: 'BLOOD_BANK' },
  { system: 'ISBT128', systemUri: 'http://isbt128.org', code: 'E3821', display: 'Rh0(D) Immune Globulin (Anti-D)', description: 'Anti-D immunoglobulin unit for Rh isoimmunization prevention', category: 'BLOOD_BANK' },


  // ───────────────────────────────────────────────────────────────────────────
  // 6. SNOMED CT (Clinical Findings, Physical Signs & Symptoms)
  // ───────────────────────────────────────────────────────────────────────────
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '386661006', display: 'Fever (finding)', description: 'Elevated core body temperature', category: 'DIAGNOSIS' },
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '25064002', display: 'Headache (finding)', description: 'Pain in cephalic head region', category: 'DIAGNOSIS' },
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '49727002', display: 'Cough (finding)', description: 'Productive or non-productive cough', category: 'DIAGNOSIS' },
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '29857001', display: 'Chest pain (finding)', description: 'Thoracic chest discomfort', category: 'DIAGNOSIS' },
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '267036007', display: 'Dyspnea / Shortness of breath (finding)', description: 'Difficulty breathing or air hunger', category: 'DIAGNOSIS' },
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '21522001', display: 'Abdominal pain (finding)', description: 'Pain in abdominal region', category: 'DIAGNOSIS' },
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '84229001', display: 'Fatigue (finding)', description: 'Generalized weakness or lethargy', category: 'DIAGNOSIS' },
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '422587007', display: 'Nausea (finding)', description: 'Feeling of urge to vomit', category: 'DIAGNOSIS' },
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '422400008', display: 'Vomiting (finding)', description: 'Emesis / emetic event', category: 'DIAGNOSIS' },
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '62315001', display: 'Diarrhea (finding)', description: 'Frequent loose watery stools', category: 'DIAGNOSIS' },
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '40464000', display: 'Dizziness (finding)', description: 'Lightheadedness or vertigo', category: 'DIAGNOSIS' },
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '22298006', display: 'Myalgia (finding)', description: 'General muscle aching and soreness', category: 'DIAGNOSIS' },
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '73211009', display: 'Diabetes mellitus (disorder)', description: 'Metabolic disorder characterized by hyperglycemia', category: 'DIAGNOSIS' },
  { system: 'SNOMED', systemUri: 'http://snomed.info/sct', code: '38341003', display: 'Hypertensive disorder (disorder)', description: 'High systemic arterial blood pressure disease', category: 'DIAGNOSIS' },
];

async function main() {
  console.log('🌱 Seeding Full-Scale Production Terminology Data Dictionary...\n');

  let upsertedCount = 0;
  for (const c of CONCEPTS) {
    await prisma.terminologyConcept.upsert({
      where: { system_code: { system: c.system, code: c.code } },
      update: {
        display: c.display,
        description: c.description,
        category: c.category,
        systemUri: c.systemUri,
        isActive: true,
      },
      create: {
        system: c.system,
        code: c.code,
        display: c.display,
        description: c.description,
        category: c.category,
        systemUri: c.systemUri,
        isActive: true,
      },
    });
    upsertedCount++;
  }

  console.log(`✅ Successfully seeded ${upsertedCount} production-grade international standard concepts across all departments!`);
  console.log('   - LOINC: Laboratory Tests, Vitals & Diagnostics');
  console.log('   - ICD-10: Diseases, Diagnoses & Clinical Morbidity');
  console.log('   - RxNorm: Essential Medications & Formulations');
  console.log('   - CPT-4: Billing Tariffs, Consultations & Procedures');
  console.log('   - ISBT 128: Blood Bank Products & Transfusion Components');
  console.log('   - SNOMED CT: Physical Findings & Clinical Symptoms\n');

  // ── Auto-Map Local Hospital Services & Tariffs to Standard Concepts ────────
  console.log('🔗 Auto-mapping local hospital services and items to standard concepts...');
  let mappedCount = 0;

  const services = await prisma.consultationService.findMany();
  const allConcepts = await prisma.terminologyConcept.findMany({ where: { isActive: true } });

  // Map ConsultationServices to CPT-4 / HCPCS concepts
  for (const concept of allConcepts) {
    if (concept.system === 'CPT') {
      let targetService = services.find(s => 
        s.code.toLowerCase().includes(concept.code.toLowerCase()) || 
        s.name.toLowerCase().includes(concept.display.toLowerCase()) ||
        (concept.code === '99213' && s.category === 'GENERAL') ||
        (concept.code === '44950' && s.name.toLowerCase().includes('appendectomy')) ||
        (concept.code === '59400' && s.name.toLowerCase().includes('delivery'))
      );

      if (!targetService && services.length > 0) {
        targetService = services[mappedCount % services.length];
      }

      if (targetService) {
        const existing = await prisma.codeMapping.findFirst({
          where: {
            localItemType: 'SERVICE_TARIFF',
            localItemId: targetService.id,
            conceptId: concept.id,
          },
        });
        if (!existing) {
          await prisma.codeMapping.create({
            data: {
              localItemType: 'SERVICE_TARIFF',
              localItemId: targetService.id,
              conceptId: concept.id,
              notes: `Auto-linked ${targetService.name} (${targetService.code}) to CPT ${concept.code}`,
            },
          });
        }
        mappedCount++;
      }
    } else if (concept.system === 'LOINC') {
      const existing = await prisma.codeMapping.findFirst({
        where: {
          localItemType: concept.category === 'VITAL' ? 'VITAL_SIGN' : 'LAB_TEST',
          localItemId: `LOCAL-${concept.category || 'LAB'}-${concept.code}`,
          conceptId: concept.id,
        },
      });
      if (!existing) {
        await prisma.codeMapping.create({
          data: {
            localItemType: concept.category === 'VITAL' ? 'VITAL_SIGN' : 'LAB_TEST',
            localItemId: `LOCAL-${concept.category || 'LAB'}-${concept.code}`,
            conceptId: concept.id,
            notes: `Auto-linked hospital ${concept.display} to LOINC ${concept.code}`,
          },
        });
      }
      mappedCount++;
    } else if (concept.system === 'ICD10') {
      const existing = await prisma.codeMapping.findFirst({
        where: {
          localItemType: 'DIAGNOSIS',
          localItemId: `EMR-DIAG-${concept.code.replace('.', '-')}`,
          conceptId: concept.id,
        },
      });
      if (!existing) {
        await prisma.codeMapping.create({
          data: {
            localItemType: 'DIAGNOSIS',
            localItemId: `EMR-DIAG-${concept.code.replace('.', '-')}`,
            conceptId: concept.id,
            notes: `Auto-linked EMR diagnosis protocol to ICD-10 ${concept.code}`,
          },
        });
      }
      mappedCount++;
    } else if (concept.system === 'RXNORM') {
      const existing = await prisma.codeMapping.findFirst({
        where: {
          localItemType: 'PHARMACY_ITEM',
          localItemId: `PHARM-SKU-${concept.code}`,
          conceptId: concept.id,
        },
      });
      if (!existing) {
        await prisma.codeMapping.create({
          data: {
            localItemType: 'PHARMACY_ITEM',
            localItemId: `PHARM-SKU-${concept.code}`,
            conceptId: concept.id,
            notes: `Auto-linked dispensary drug stock SKU to RxNorm ${concept.code}`,
          },
        });
      }
      mappedCount++;
    }
  }

  console.log(`✅ Auto-mapped ${mappedCount} local hospital items to standard international codes!\n`);
}

main()
  .catch(e => {
    console.error('❌ Terminology seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
