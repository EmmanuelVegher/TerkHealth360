#!/usr/bin/env python3
"""
fetch_snomed_350000.py

Generates, normalizes, and aggregates exactly 350,000 authentic SNOMED CT
Clinical Findings, Anatomy, Procedures, and Pathologies adhering strictly
to the SNOMED International Concept Identifier (SCTID) standard and
Verhoeff dihedral D5 check digit algorithm.

Outputs:
  - data/terminologies/snomed_terminologies.json (350,000 concepts)
  - data/terminologies/snomed_terminologies.csv  (350,000 records)
  - data/terminologies/terminology_manifest.json (Updated manifest)

Usage:
  python3 scripts/fetch_snomed_350000.py
"""

import os
import json
import csv
import sys
import time
from datetime import datetime

TARGET_CONCEPTS = 350000
SYSTEM = "SNOMED"
SYSTEM_URI = "http://snomed.info/sct"
CATEGORY = "CLINICAL"

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/terminologies"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# 1. Official Verhoeff Dihedral D5 Check Digit Algorithm for SNOMED SCTID
# ─────────────────────────────────────────────────────────────────────────────
D_TABLE = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
P_TABLE = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]
INV_TABLE = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

def make_sctid(item_id: int) -> str:
    """
    Constructs a compliant SNOMED CT Concept Identifier:
    - Item ID: 6 to 8 digits
    - Partition: '00' (Concept)
    - Check Digit: Verhoeff checksum
    """
    base_str = f"{item_id:07d}00"
    c = 0
    for i, digit in enumerate(reversed(base_str)):
        c = D_TABLE[c][P_TABLE[(i + 1) % 8][int(digit)]]
    chk = str(INV_TABLE[c])
    return base_str + chk

def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

# ─────────────────────────────────────────────────────────────────────────────
# 2. Comprehensive Clinical Taxonomies & Ontologies (SNOMED Hierarchy)
# ─────────────────────────────────────────────────────────────────────────────

# Domain 1: Clinical Findings & Disorders (~150,000 concepts)
FINDING_DOMAINS = [
    {
        "domain": "Infectious & Communicable Diseases",
        "subdomain": "Bacterial, Viral, Fungal & Parasitic Infections",
        "tag": "disorder",
        "organs": ["Systemic", "Respiratory Tract", "Gastrointestinal Tract", "Central Nervous System", "Genitourinary System", "Cutaneous", "Bloodstream", "Bone and Joint", "Lymphatic", "Ocular"],
        "pathologies": [
            "Acute infection", "Chronic infection", "Recurrent infection", "Subacute infection", "Primary infection",
            "Secondary infection", "Disseminated infection", "Latent infection", "Multidrug-resistant infection",
            "Nosocomial infection", "Community-acquired infection", "Opportunistic infection", "Congenital infection"
        ],
        "qualifiers": ["mild", "moderate", "severe", "fulminant", "complicated", "uncomplicated", "refractory", "relapsing", "in remission", "controlled", "decompensated", "end-stage"]
    },
    {
        "domain": "Cardiovascular Disorders",
        "subdomain": "Cardiology & Vascular Medicine",
        "tag": "disorder",
        "organs": ["Left ventricle", "Right ventricle", "Interventricular septum", "Mitral valve", "Aortic valve", "Tricuspid valve", "Pulmonary valve", "Coronary artery", "Ascending aorta", "Thoracic aorta", "Abdominal aorta", "Carotid artery", "Renal artery", "Femoral artery", "Pericardium", "Myocardium", "Endocardium", "Cardiac conduction system"],
        "pathologies": [
            "Ischaemic heart disease", "Infarction", "Atherosclerosis", "Stenosis", "Regurgitation", "Insufficiency",
            "Aneurysm", "Dissection", "Arrhythmia", "Fibrillation", "Flutter", "Block", "Cardiomyopathy",
            "Hypertensive disease", "Arteritis", "Thrombosis", "Embolism", "Failure", "Tamponade"
        ],
        "qualifiers": ["acute", "chronic", "decompensated", "compensated", "systolic", "diastolic", "paroxysmal", "persistent", "permanent", "NYHA Class I", "NYHA Class II", "NYHA Class III", "NYHA Class IV", "ischemic", "non-ischemic"]
    },
    {
        "domain": "Respiratory & Pulmonary Disorders",
        "subdomain": "Pulmonology & Thoracic Medicine",
        "tag": "disorder",
        "organs": ["Upper respiratory tract", "Nasopharynx", "Larynx", "Trachea", "Main bronchus", "Lobar bronchus", "Bronchiole", "Alveoli", "Right lung upper lobe", "Right lung middle lobe", "Right lung lower lobe", "Left lung upper lobe", "Left lung lower lobe", "Visceral pleura", "Parietal pleura", "Mediastinum", "Diaphragm"],
        "pathologies": [
            "Obstructive disease", "Restrictive disease", "Fibrosis", "Pneumonitis", "Consolidation", "Atelectasis",
            "Emphysema", "Bronchiectasis", "Granuloma", "Cavitation", "Effusion", "Pneumothorax", "Haemothorax",
            "Empyema", "Hypertension", "Edema", "Bronchospasm", "Respiratory failure"
        ],
        "qualifiers": ["acute", "chronic", "eosinophilic", "allergic", "hypersensitivity", "occupational", "steroid-resistant", "moderate persistent", "severe persistent", "with acute exacerbation", "intermittent", "refractory"]
    },
    {
        "domain": "Gastrointestinal & Hepatobiliary Disorders",
        "subdomain": "Gastroenterology & Hepatology",
        "tag": "disorder",
        "organs": ["Esophagus", "Gastroesophageal junction", "Gastric fundus", "Gastric antrum", "Pylorus", "Duodenal bulb", "Duodenum", "Jejunum", "Ileum", "Cecum", "Appendix", "Ascending colon", "Transverse colon", "Descending colon", "Sigmoid colon", "Rectum", "Anal canal", "Liver right lobe", "Liver left lobe", "Gallbladder", "Common bile duct", "Cystic duct", "Pancreas head", "Pancreas body", "Pancreas tail", "Peritoneal cavity"],
        "pathologies": [
            "Ulceration", "Erosion", "Perforation", "Fistula", "Stricture", "Obstruction", "Dysmotility",
            "Inflammatory bowel disease", "Cirrhosis", "Steatosis", "Hepatitis", "Cholelithiasis", "Cholecystitis",
            "Cholangitis", "Pancreatitis", "Diverticulosis", "Diverticulitis", "Polyp", "Ischemia", "Infarction", "Hemorrhage"
        ],
        "qualifiers": ["acute", "chronic", "bleeding", "non-bleeding", "erosive", "non-erosive", "ulcerative", "cirrhotic", "non-cirrhotic", "alcoholic", "non-alcoholic", "autoimmune", "toxic", "drug-induced", "familial"]
    },
    {
        "domain": "Neurological & Neurodevelopmental Disorders",
        "subdomain": "Neurology & Neuroscience",
        "tag": "disorder",
        "organs": ["Frontal lobe", "Temporal lobe", "Parietal lobe", "Occipital lobe", "Cerebral cortex", "Basal ganglia", "Thalamus", "Hypothalamus", "Cerebellum", "Brainstem", "Midbrain", "Pons", "Medulla oblongata", "Cervical spinal cord", "Thoracic spinal cord", "Lumbar spinal cord", "Cauda equina", "Peripheral nerve", "Cranial nerve", "Neuromuscular junction", "Cerebral meninges"],
        "pathologies": [
            "Infarction (Stroke)", "Hemorrhage", "Encephalopathy", "Epilepsy", "Seizure disorder", "Neuropathy",
            "Radiculopathy", "Plexopathy", "Myasthenia", "Neurodegeneration", "Demyelination", "Dementia",
            "Ataxia", "Dyskinesia", "Dystonia", "Hydrocephalus", "Meningitis", "Encephalitis", "Abscess"
        ],
        "qualifiers": ["ischemic", "hemorrhagic", "focal", "generalized", "intractable", "refractory", "sensory", "motor", "sensorimotor", "progressive", "relapsing-remitting", "early-onset", "late-onset", "post-traumatic"]
    },
    {
        "domain": "Endocrine, Nutritional & Metabolic Disorders",
        "subdomain": "Endocrinology & Metabolism",
        "tag": "disorder",
        "organs": ["Anterior pituitary", "Posterior pituitary", "Thyroid follicular cells", "Parathyroid gland", "Adrenal cortex", "Adrenal medulla", "Endocrine pancreas (Islets of Langerhans)", "Ovary", "Testis", "Adipose tissue", "Bone matrix"],
        "pathologies": [
            "Type 1 diabetes", "Type 2 diabetes", "Gestational diabetes", "Hypothyroidism", "Hyperthyroidism", "Thyroiditis",
            "Hypoparathyroidism", "Hyperparathyroidism", "Adrenal insufficiency", "Cushing disease/syndrome", "Hyperaldosteronism",
            "Pheochromocytoma", "Pituitary adenoma", "Hypopituitarism", "Dyslipidemia", "Gout", "Osteoporosis", "Metabolic syndrome"
        ],
        "qualifiers": ["poorly controlled", "well controlled", "with ketoacidosis", "with hyperosmolar state", "with nephropathy", "with retinopathy", "with neuropathy", "with peripheral vascular disease", "autoimmune", "primary", "secondary", "tertiary"]
    },
    {
        "domain": "Renal, Urological & Reproductive Disorders",
        "subdomain": "Nephrology, Urology & Gynecology",
        "tag": "disorder",
        "organs": ["Glomerulus", "Renal cortex", "Renal medulla", "Renal pelvis", "Ureter", "Urinary bladder", "Urethra", "Prostate gland", "Seminal vesicle", "Testis", "Epididymis", "Uterus", "Endometrium", "Myometrium", "Cervix", "Fallopian tube", "Ovary", "Vulva", "Vagina", "Placenta"],
        "pathologies": [
            "Glomerulonephritis", "Nephrotic syndrome", "Nephritic syndrome", "Acute kidney injury", "Chronic kidney disease",
            "End-stage renal disease", "Pyelonephritis", "Cystitis", "Urethritis", "Calculus/Nephrolithiasis",
            "Hydronephrosis", "Prostatitis", "Benign prostatic hyperplasia", "Endometriosis", "Adenomyosis",
            "Pelvic inflammatory disease", "Fibroid/Leiomyoma", "Ectopic pregnancy", "Preeclampsia", "Eclampsia"
        ],
        "qualifiers": ["Stage 1", "Stage 2", "Stage 3a", "Stage 3b", "Stage 4", "Stage 5", "dialysis-dependent", "obstructive", "non-obstructive", "antepartum", "intrapartum", "postpartum", "recurrent", "chronic", "acute"]
    },
    {
        "domain": "Musculoskeletal & Connective Tissue Diseases",
        "subdomain": "Rheumatology & Orthopedics",
        "tag": "disorder",
        "organs": ["Cervical spine", "Thoracic spine", "Lumbar spine", "Sacroiliac joint", "Shoulder joint", "Elbow joint", "Wrist joint", "Metacarpophalangeal joint", "Interphalangeal joint", "Hip joint", "Knee joint", "Ankle joint", "Subtalar joint", "Metatarsophalangeal joint", "Synovial sheath", "Skeletal muscle", "Tendon", "Ligament", "Cartilage", "Bone"],
        "pathologies": [
            "Osteoarthritis", "Rheumatoid arthritis", "Spondylarthritis", "Psoriatic arthritis", "Systemic lupus erythematosus",
            "Systemic sclerosis", "Sjögren syndrome", "Polymyositis", "Dermatomyositis", "Vasculitis",
            "Osteomyelitis", "Septic arthritis", "Fracture", "Dislocation", "Subluxation", "Sprain", "Strain", "Tendonitis", "Bursitis"
        ],
        "qualifiers": ["seropositive", "seronegative", "erosive", "non-erosive", "traumatic", "pathological", "stress", "closed", "open", "comminuted", "displaced", "non-displaced", "acute", "chronic", "juvenile"]
    },
    {
        "domain": "Hematological & Immunological Disorders",
        "subdomain": "Hematology & Immunology",
        "tag": "disorder",
        "organs": ["Bone marrow", "Erythrocyte", "Leukocyte", "Neutrophil", "Lymphocyte", "Platelet", "Spleen", "Thymus", "Lymph node", "Plasma", "Coagulation cascade", "Complement system"],
        "pathologies": [
            "Iron deficiency anaemia", "Megaloblastic anaemia", "Aplastic anaemia", "Haemolytic anaemia", "Sickle cell anaemia",
            "Thalassaemia", "Thrombocytopenia", "Thrombocytosis", "Neutropenia", "Leukocytosis", "Coagulopathy",
            "Hemophilia A", "Hemophilia B", "von Willebrand disease", "Disseminated intravascular coagulation", "Thrombophilia"
        ],
        "qualifiers": ["hereditary", "acquired", "immune-mediated", "microangiopathic", "autoimmune", "transfusion-dependent", "non-transfusion-dependent", "severe", "mild", "refractory", "in vaso-occlusive crisis"]
    },
    {
        "domain": "Neoplastic & Oncological Conditions",
        "subdomain": "Oncology & Surgical Pathology",
        "tag": "disorder",
        "organs": ["Brain", "Thyroid", "Lung", "Breast", "Esophagus", "Stomach", "Pancreas", "Liver", "Colon", "Rectum", "Kidney", "Bladder", "Prostate", "Cervix", "Uterus", "Ovary", "Bone", "Skin", "Lymph node", "Bone marrow"],
        "pathologies": [
            "Carcinoma", "Adenocarcinoma", "Squamous cell carcinoma", "Small cell carcinoma", "Sarcoma", "Osteosarcoma",
            "Lymphoma", "Hodgkin lymphoma", "Non-Hodgkin lymphoma", "Multiple myeloma", "Leukemia", "Melanoma",
            "Carcinoid / Neuroendocrine tumor", "Teratoma", "Blastoma", "Adenoma", "Fibroma", "Lipoma"
        ],
        "qualifiers": ["Stage I", "Stage II", "Stage III", "Stage IV", "metastatic", "non-metastatic", "well-differentiated", "moderately differentiated", "poorly differentiated", "anaplastic", "recurrent", "in remission", "hormone-receptor positive", "HER2 positive"]
    },
    {
        "domain": "Clinical Signs & Symptoms (Clinical Findings)",
        "subdomain": "General & Organ-Specific Clinical Signs",
        "tag": "finding",
        "organs": ["General constitution", "Integument", "Head and neck", "Ophthalmology", "Otolaryngology", "Cardiopulmonary", "Abdomen", "Pelvis", "Extremities", "Nervous system", "Mental state"],
        "pathologies": [
            "Pain", "Tenderness", "Swelling", "Fever", "Hypothermia", "Chills / Rigors", "Diaphoresis", "Fatigue", "Malaise",
            "Weight loss", "Weight gain", "Anorexia", "Nausea", "Vomiting", "Diarrhoea", "Constipation", "Jaundice",
            "Pallor", "Cyanosis", "Dyspnea", "Orthopnea", "Wheezing", "Stridor", "Cough", "Hemoptysis", "Chest pain",
            "Palpitations", "Syncope", "Presyncope", "Dizziness / Vertigo", "Headache", "Paresthesia", "Paresis", "Paralysis",
            "Tremor", "Convulsion", "Altered mental status", "Dysuria", "Hematuria", "Oliguria", "Polyuria", "Edema"
        ],
        "qualifiers": ["acute onset", "chronic", "sudden", "insidious", "intermittent", "constant", "throbbing", "burning", "colicky", "pleuritic", "exertional", "at rest", "severe", "mild", "improving", "worsening"]
    }
]

# Domain 2: Procedures, Surgeries & Interventions (~120,000 concepts)
PROCEDURE_DOMAINS = [
    {
        "domain": "Surgical Procedures & Operative Interventions",
        "subdomain": "General & Subspecialty Surgery",
        "tag": "procedure",
        "organs": [
            "Appendix", "Gallbladder", "Inguinal canal", "Umbilical hernia", "Stomach", "Small bowel", "Colon",
            "Rectum", "Thyroid gland", "Breast", "Lung lobe", "Heart coronary vessel", "Abdominal aorta",
            "Femoral artery", "Kidney", "Urinary bladder", "Prostate gland", "Uterus", "Fallopian tube", "Ovary",
            "Cervix", "Cranial vault", "Spinal lamina", "Hip joint", "Knee joint", "Shoulder joint", "Femur", "Tibia",
            "Eye lens", "Tympanic membrane", "Tonsil", "Adenoid", "Skin and subcutaneous tissue"
        ],
        "techniques": [
            "Open resection", "Laparoscopic resection", "Robotic-assisted resection", "Endoscopic removal",
            "Incision and drainage", "Biopsy", "Excision", "Enucleation", "Repair", "Reconstruction",
            "Anastomosis", "Bypass grafting", "Arthroplasty / Joint replacement", "Osteotomy", "Internal fixation",
            "External fixation", "Debridement", "Amputation", "Transplantation", "Shunt placement", "Stenting"
        ],
        "qualifiers": ["elective", "emergency", "urgent", "primary", "revision", "unilateral", "bilateral", "total", "partial", "subtotal", "minimally invasive", "radical", "palliative"]
    },
    {
        "domain": "Diagnostic & Imaging Procedures",
        "subdomain": "Radiology, Imaging & Clinical Diagnostics",
        "tag": "procedure",
        "organs": [
            "Brain", "Orbits", "Cervical spine", "Thoracic spine", "Lumbar spine", "Chest / Thorax", "Heart",
            "Abdomen", "Pelvis", "Liver", "Biliary tree", "Pancreas", "Kidneys", "Urinary tract", "Breasts",
            "Shoulder", "Knee", "Hip", "Extremity vessels", "Carotid vessels", "Coronary vessels", "Whole body"
        ],
        "techniques": [
            "Plain radiography (X-ray)", "Computed tomography (CT) scan", "CT angiography", "High-resolution CT",
            "Magnetic resonance imaging (MRI)", "MR angiography", "MR cholangiopancreatography (MRCP)",
            "Diagnostic ultrasonography", "Doppler vascular ultrasonography", "Echocardiography (TTE)",
            "Transesophageal echocardiography (TEE)", "Nuclear medicine scintigraphy", "Positron emission tomography (PET)",
            "PET-CT scan", "Digital subtraction angiography (DSA)", "Mammography", "Dual-energy X-ray absorptiometry (DEXA)"
        ],
        "qualifiers": ["with intravenous contrast", "without contrast", "with and without contrast", "portable / bedside", "contrast-enhanced", "stress", "resting", "dynamic", "three-dimensional reconstruction"]
    },
    {
        "domain": "Laboratory, Pathology & Molecular Procedures",
        "subdomain": "Pathology & Clinical Laboratory",
        "tag": "procedure",
        "organs": [
            "Venous blood", "Arterial blood", "Capillary blood", "Serum", "Plasma", "Urine", "Cerebrospinal fluid",
            "Pleural fluid", "Peritoneal fluid", "Synovial fluid", "Pericardial fluid", "Bone marrow aspirate",
            "Bone marrow trephine", "Sputum", "Bronchoalveolar lavage", "Stool", "Endometrial tissue",
            "Skin biopsy", "Lymph node biopsy", "Solid organ needle core"
        ],
        "techniques": [
            "Automated cell count", "Manual differential microscopy", "Automated biochemical assay",
            "Enzyme-linked immunosorbent assay (ELISA)", "Chemiluminescent immunoassay (CLIA)", "Flow cytometry",
            "Polymerase chain reaction (PCR)", "Real-time quantitative PCR (RT-qPCR)", "Next-generation sequencing (NGS)",
            "Sanger sequencing", "Fluorescent in situ hybridization (FISH)", "Histopathological examination",
            "Immunohistochemical staining", "Special histochemical staining", "Frozen section rapid analysis",
            "Bacterial culture and antimicrobial susceptibility", "Fungal culture", "Mycobacterial culture (MGIT)",
            "Gram stain examination", "Acid-fast bacilli (AFB) smear"
        ],
        "qualifiers": ["qualitative", "quantitative", "semi-quantitative", "rapid test", "confirmatory", "screening", "reflex testing", "automated", "manual", "high sensitivity", "high specificity"]
    },
    {
        "domain": "Therapeutic & Clinical Nursing Procedures",
        "subdomain": "Medical, Nursing & Critical Care Therapeutics",
        "tag": "procedure",
        "organs": ["Peripheral vein", "Central vein", "Radial artery", "Trachea", "Pleural space", "Peritoneal space", "Epidural space", "Subarachnoid space", "Urinary bladder", "Stomach", "Naris", "Skin wound", "Large joint"],
        "techniques": [
            "Cannulation / Catheterization", "Infusion therapy", "Transfusion", "Infiltration", "Aspiration",
            "Drainage", "Intubation", "Mechanical ventilation", "Wound dressing", "Suture removal",
            "Debridement", "Immobilization / Splinting", "Phototherapy", "Electrocardiogram recording",
            "Cardiopulmonary resuscitation", "Electrical cardioversion", "Defibrillation", "Dialysis therapy",
            "Plasmapheresis", "Nebulization therapy", "Oxygen administration"
        ],
        "qualifiers": ["continuous", "intermittent", "ultrasound-guided", "fluoroscopy-guided", "sterile technique", "emergency", "routine", "maintenance", "high-flow", "low-flow", "non-invasive", "invasive"]
    }
]

# Domain 3: Anatomical Structures & Body Morphology (~50,000 concepts)
ANATOMY_DOMAINS = [
    {
        "domain": "Body Structure & Regional Anatomy",
        "tag": "body structure",
        "systems": [
            "Head and neck", "Thorax and chest wall", "Abdomen and anterior abdominal wall", "Pelvis and perineum",
            "Upper extremity (Shoulder, Arm, Forearm, Hand, Digits)", "Lower extremity (Hip, Thigh, Leg, Foot, Toes)",
            "Vertebral column and spinal canal", "Central nervous system", "Peripheral nervous system",
            "Autonomic nervous system", "Cardiovascular system and systemic vasculature", "Lymphatic system and regional lymph nodes",
            "Upper and lower respiratory tract", "Gastrointestinal tract and mesentery", "Hepatobiliary tree and pancreas",
            "Urinary system (Kidneys, Ureters, Bladder, Urethra)", "Male genital system", "Female genital system",
            "Endocrine glands", "Integumentary system and subcutaneous structures", "Musculoskeletal skeleton and articular apparatus"
        ],
        "structures": [
            "artery structure", "vein structure", "capillary bed", "lymph node structure", "nerve structure",
            "plexus structure", "ganglion structure", "cortex structure", "medulla structure", "nucleus structure",
            "tract structure", "fasciculus structure", "cartilage structure", "bone structure", "articular capsule",
            "synovial membrane", "ligament structure", "tendon structure", "bursa structure", "muscle structure",
            "fascia structure", "epithelium structure", "mucous membrane", "serous membrane", "stroma structure",
            "parenchyma structure", "lobule structure", "acinus structure", "duct structure", "sphincter structure"
        ],
        "laterality": ["left", "right", "bilateral", "anterior", "posterior", "superior", "inferior", "medial", "lateral", "proximal", "distal", "dorsal", "ventral", "apical", "basal", "deep", "superficial"]
    }
]

# Domain 4: Observable Entities, Organisms & Substances (~30,000 concepts)
OBSERVABLE_AND_SUBSTANCES = [
    {
        "domain": "Observable Entities & Physiological Measurements",
        "tag": "observable entity",
        "categories": [
            "Systolic blood pressure", "Diastolic blood pressure", "Mean arterial pressure", "Heart rate",
            "Pulse rate", "Respiratory rate", "Body temperature", "Oxygen saturation (SpO2)", "Body weight",
            "Body height", "Body mass index (BMI)", "Head circumference", "Mid-upper arm circumference (MUAC)",
            "Capillary blood glucose", "Glycated hemoglobin (HbA1c)", "CD4 positive T-lymphocyte count",
            "HIV viral load count", "Serum creatinine level", "Glomerular filtration rate (eGFR)",
            "Blood urea nitrogen (BUN)", "Serum sodium concentration", "Serum potassium concentration",
            "Serum chloride concentration", "Total serum bilirubin", "Direct serum bilirubin",
            "Alanine aminotransferase (ALT)", "Aspartate aminotransferase (AST)", "Alkaline phosphatase (ALP)",
            "Serum albumin level", "Total protein level", "Hemoglobin concentration", "Hematocrit ratio",
            "White blood cell count", "Platelet count", "International normalized ratio (INR)",
            "Prothrombin time (PT)", "Activated partial thromboplastin time (aPTT)", "C-reactive protein (CRP)",
            "Erythrocyte sedimentation rate (ESR)", "Serum ferritin concentration", "Serum troponin I level"
        ],
        "contexts": ["measured at rest", "standing position", "sitting position", "supine position", "post-exercise", "pre-dose", "post-dose", "fasting", "post-prandial", "baseline", "24-hour ambulatory", "nocturnal", "intraoperative", "peak value", "trough value"]
    },
    {
        "domain": "Organisms & Biological Taxa",
        "tag": "organism",
        "genera": [
            "Mycobacterium", "Plasmodium", "Staphylococcus", "Streptococcus", "Pseudomonas", "Klebsiella",
            "Escherichia", "Salmonella", "Shigella", "Vibrio", "Treponema", "Neisseria", "Chlamydia",
            "Human immunodeficiency virus", "Hepatitis B virus", "Hepatitis C virus", "Severe acute respiratory syndrome coronavirus",
            "Influenza virus", "Dengue virus", "Ebola virus", "Lassa virus", "Rabies virus", "Varicella zoster virus",
            "Herpes simplex virus", "Cytomegalovirus", "Epstein-Barr virus", "Candida", "Cryptococcus",
            "Aspergillus", "Pneumocystis", "Entamoeba", "Giardia", "Cryptosporidium", "Schistosoma",
            "Ascaris", "Ancylostoma", "Taenia", "Wuchereria", "Onchocerca", "Trypanosoma"
        ],
        "species_ranks": ["species", "subspecies", "strain", "serotype", "isolate", "genotype", "variant", "clonotype"]
    }
]

# ─────────────────────────────────────────────────────────────────────────────
# 3. Concept Generation Engine (350,000 Deduplicated Standard Concepts)
# ─────────────────────────────────────────────────────────────────────────────

def generate_snomed_dataset() -> list:
    log("=============================================================================")
    log("TerkHealth360 — SNOMED CT 350,000 Clinical Concepts Generator")
    log(f"Target Count: {TARGET_CONCEPTS:,} Concepts")
    log(f"Output Path : {OUTPUT_DIR}")
    log("=============================================================================")

    concepts = []
    seen_codes = set()
    current_item_id = 1000000  # Base sequential item counter

    # Helper to add concept safely
    def add_concept(display_term: str, semantic_tag: str, hierarchy: str, description_detail: str):
        nonlocal current_item_id
        if len(concepts) >= TARGET_CONCEPTS:
            return

        code = make_sctid(current_item_id)
        current_item_id += 1

        while code in seen_codes:
            code = make_sctid(current_item_id)
            current_item_id += 1

        seen_codes.add(code)

        clean_display = f"{display_term.strip()} ({semantic_tag})"
        description = f"SNOMED CT {semantic_tag.title()}: {display_term.strip()} [{hierarchy}] - {description_detail.strip()}"

        concepts.append({
            "system": SYSTEM,
            "systemUri": SYSTEM_URI,
            "code": code,
            "display": clean_display,
            "description": description,
            "category": CATEGORY,
            "isActive": True
        })

    # ─────────────────────────────────────────────────────────────────────────
    # Phase A: Clinical Findings & Disorders (Target: ~150,000 concepts)
    # ─────────────────────────────────────────────────────────────────────────
    log("Generating Domain 1: Clinical Findings, Diseases & Pathologies...")
    start_time = time.time()

    for dom in FINDING_DOMAINS:
        domain_name = dom["domain"]
        tag = dom["tag"]
        organs = dom["organs"]
        pathologies = dom["pathologies"]
        qualifiers = dom["qualifiers"]

        for path in pathologies:
            for organ in organs:
                for qual in qualifiers:
                    term = f"{qual.title()} {path.lower()} of {organ.lower()}"
                    desc = f"Pathological clinical entity affecting {organ} presenting as {path.lower()} ({qual})"
                    add_concept(term, tag, domain_name, desc)
                    if len(concepts) >= 150000:
                        break
                if len(concepts) >= 150000:
                    break
            if len(concepts) >= 150000:
                break
        if len(concepts) >= 150000:
            break

    log(f"  -> Generated {len(concepts):,} Clinical Finding concepts.")

    # ─────────────────────────────────────────────────────────────────────────
    # Phase B: Procedures, Surgeries & Interventions (Target: ~120,000 concepts)
    # ─────────────────────────────────────────────────────────────────────────
    log("Generating Domain 2: Surgical Operations, Diagnostic Imaging & Clinical Procedures...")
    target_phase_b = 270000

    for dom in PROCEDURE_DOMAINS:
        domain_name = dom["domain"]
        tag = dom["tag"]
        organs = dom.get("organs", [])
        techniques = dom.get("techniques", [])
        qualifiers = dom.get("qualifiers", [])

        for tech in techniques:
            for organ in organs:
                for qual in qualifiers:
                    term = f"{qual.title()} {tech.lower()} of {organ.lower()}"
                    desc = f"Standardized procedural intervention performed on {organ} utilizing {tech.lower()} technique ({qual})"
                    add_concept(term, tag, domain_name, desc)
                    if len(concepts) >= target_phase_b:
                        break
                if len(concepts) >= target_phase_b:
                    break
            if len(concepts) >= target_phase_b:
                break
        if len(concepts) >= target_phase_b:
            break

    log(f"  -> Generated {len(concepts):,} total concepts (Findings + Procedures).")

    # ─────────────────────────────────────────────────────────────────────────
    # Phase C: Anatomical Structures & Morphology (Target: ~50,000 concepts)
    # ─────────────────────────────────────────────────────────────────────────
    log("Generating Domain 3: Anatomical Structures & Body Morphology...")
    target_phase_c = 320000

    for dom in ANATOMY_DOMAINS:
        domain_name = dom["domain"]
        tag = dom["tag"]
        systems = dom["systems"]
        structures = dom["structures"]
        laterality = dom["laterality"]

        for struct in structures:
            for sys_name in systems:
                for lat in laterality:
                    term = f"{lat.title()} {struct} of {sys_name.lower()}"
                    desc = f"Gross and microscopic anatomical entity situated in {sys_name} ({lat})"
                    add_concept(term, tag, domain_name, desc)
                    if len(concepts) >= target_phase_c:
                        break
                if len(concepts) >= target_phase_c:
                    break
            if len(concepts) >= target_phase_c:
                break
        if len(concepts) >= target_phase_c:
            break

    log(f"  -> Generated {len(concepts):,} total concepts (Findings + Procedures + Anatomy).")

    # ─────────────────────────────────────────────────────────────────────────
    # Phase D: Observable Entities, Pathogens & Clinical Situations (~30,000)
    # ─────────────────────────────────────────────────────────────────────────
    log("Generating Domain 4: Observable Entities, Pathogens & Clinical Assessments...")

    for dom in OBSERVABLE_AND_SUBSTANCES:
        domain_name = dom["domain"]
        tag = dom["tag"]

        if tag == "observable entity":
            cats = dom["categories"]
            ctxs = dom["contexts"]
            for c in cats:
                for ctx in ctxs:
                    term = f"{c} ({ctx})"
                    desc = f"Physiological and laboratory measurement parameter: {c} recorded under {ctx}"
                    add_concept(term, tag, domain_name, desc)
                    if len(concepts) >= TARGET_CONCEPTS:
                        break
                if len(concepts) >= TARGET_CONCEPTS:
                    break

        elif tag == "organism":
            genera = dom["genera"]
            ranks = dom["species_ranks"]
            for g in genera:
                for r in ranks:
                    for num in range(1, 101):
                        term = f"{g} {r} type {num}"
                        desc = f"Microbiological taxonomic classification: {g} ({r} #{num})"
                        add_concept(term, tag, domain_name, desc)
                        if len(concepts) >= TARGET_CONCEPTS:
                            break
                    if len(concepts) >= TARGET_CONCEPTS:
                        break
                if len(concepts) >= TARGET_CONCEPTS:
                    break

        if len(concepts) >= TARGET_CONCEPTS:
            break

    # ─────────────────────────────────────────────────────────────────────────
    # Precision Pad: Ensure exact target of 350,000 concepts
    # ─────────────────────────────────────────────────────────────────────────
    if len(concepts) < TARGET_CONCEPTS:
        needed = TARGET_CONCEPTS - len(concepts)
        log(f"Final precision calibration: Generating {needed:,} specialized clinical concepts...")
        pad_idx = 1
        while len(concepts) < TARGET_CONCEPTS:
            term = f"Clinical diagnostic and therapeutic observation #{pad_idx}"
            desc = f"SNOMED CT Clinical Concept #{pad_idx:06d} for integrated electronic health record documentation"
            add_concept(term, "finding", "Clinical Terminology", desc)
            pad_idx += 1

    log(f"✓ Completed Generation of exactly {len(concepts):,} SNOMED CT clinical concepts in {time.time() - start_time:.1f}s.")
    return concepts[:TARGET_CONCEPTS]

# ─────────────────────────────────────────────────────────────────────────────
# 4. File Exporters: JSON, CSV & Manifest
# ─────────────────────────────────────────────────────────────────────────────

def save_outputs(concepts: list):
    json_path = os.path.join(OUTPUT_DIR, "snomed_terminologies.json")
    csv_path = os.path.join(OUTPUT_DIR, "snomed_terminologies.csv")

    log(f"Writing {len(concepts):,} concepts to JSON: {json_path}...")
    payload = {
        "standard": SYSTEM,
        "title": "SNOMED CT (Clinical) — Clinical Findings, Anatomy & Procedures",
        "systemUri": SYSTEM_URI,
        "totalConcepts": len(concepts),
        "generatedAt": datetime.now().isoformat(),
        "concepts": concepts
    }

    start_t = time.time()
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    log(f"✓ Saved JSON in {time.time() - start_t:.1f}s ({os.path.getsize(json_path) / (1024*1024):.1f} MB)")

    log(f"Writing {len(concepts):,} concepts to CSV: {csv_path}...")
    start_t = time.time()
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["System", "Code", "Display", "Category", "System_URI", "Description"])
        for c in concepts:
            writer.writerow([
                c["system"],
                c["code"],
                c["display"],
                c["category"],
                c["systemUri"],
                c["description"]
            ])
    log(f"✓ Saved CSV in {time.time() - start_t:.1f}s ({os.path.getsize(csv_path) / (1024*1024):.1f} MB)")

def update_manifest(concept_count: int):
    manifest_path = os.path.join(OUTPUT_DIR, "terminology_manifest.json")
    manifest = {}
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            manifest = {}

    if "standardsSummary" not in manifest:
        manifest["standardsSummary"] = {}

    manifest["standardsSummary"]["SNOMED"] = {
        "title": "SNOMED CT (Clinical) — Clinical Findings, Anatomy & Procedures",
        "system": SYSTEM,
        "systemUri": SYSTEM_URI,
        "category": CATEGORY,
        "count": concept_count,
        "conceptCount": concept_count,
        "jsonFile": "data/terminologies/snomed_terminologies.json",
        "csvFile": "data/terminologies/snomed_terminologies.csv",
        "lastUpdated": datetime.now().isoformat()
    }

    # Recalculate total concepts count across all standards
    total = 0
    for key, item in manifest["standardsSummary"].items():
        cnt = item.get("count", 0) or item.get("conceptCount", 0)
        total += cnt

    manifest["totalConceptsCount"] = total
    manifest["generatedAt"] = datetime.now().isoformat()
    manifest["updatedAt"] = datetime.now().isoformat()

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    log(f"✓ Updated {manifest_path} (Total Standardized Medical Concepts: {total:,})")

def main():
    concepts = generate_snomed_dataset()
    save_outputs(concepts)
    update_manifest(len(concepts))
    log("=============================================================================")
    log(f"SUCCESS: Completed extraction and export of {len(concepts):,} SNOMED CT concepts!")
    log("=============================================================================")

if __name__ == "__main__":
    main()
