#!/usr/bin/env python3
"""
fetch_cpt_10000.py — TerkHealth360 CPT-4 & HCPCS Level II Scraper & Tariffs Generator
======================================================================================
Scrapes, extracts, and normalizes over 16,000+ authentic CPT-4 and HCPCS Level II
medical procedures, surgeries, diagnostics, radiology, pathology, consultations,
and billing tariffs directly from official CMS (Centers for Medicare & Medicaid
Services) Physician Fee Schedule (PFS) releases and NLM Clinical Tables.

Outputs:
  - data/terminologies/cpt_terminologies.json (16,000+ concepts)
  - data/terminologies/cpt_terminologies.csv  (16,000+ records)
  - data/terminologies/terminology_manifest.json (Updated manifest)
"""

import os
import io
import sys
import csv
import json
import time
import zipfile
import urllib.request
from datetime import datetime
from typing import Dict, List, Any, Set

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/terminologies"))
CACHE_DIR = os.path.join(OUTPUT_DIR, ".cache")
os.makedirs(CACHE_DIR, exist_ok=True)

CMS_RVU_URL = "https://www.cms.gov/files/zip/rvu24a.zip"
NLM_HCPCS_API = "https://clinicaltables.nlm.nih.gov/api/hcpcs/v3/search"
USER_AGENT = "TerkHealth360-TerminologyEngine/1.0 (+https://terkhealth360.ng; medical-tariffs@terkhealth.ng)"

def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

# ─────────────────────────────────────────────────────────────────────────────
# 1. Surgical & Clinical Procedure Categorization Engine
# ─────────────────────────────────────────────────────────────────────────────
def categorize_cpt_hcpcs(code: str, desc: str) -> tuple[str, str, str]:
    """
    Returns (category, tariffGroup, procedureType) based on official AMA CPT & CMS HCPCS coding structure.
    """
    code_upper = code.upper().strip()
    
    if code_upper.isdigit():
        num = int(code_upper)
        # Anesthesia
        if 100 <= num <= 1999:
            return "ANESTHESIA", "ANESTHESIA", "Anesthesia Procedure"
        # Surgery
        elif 10004 <= num <= 19499:
            return "PROCEDURE", "SURGERY_INTEGUMENTARY", "Integumentary Surgery (Skin, Breast, Soft Tissue)"
        elif 20100 <= num <= 29999:
            return "PROCEDURE", "SURGERY_MUSCULOSKELETAL", "Musculoskeletal Surgery (Bones, Joints, Spine, Fractures)"
        elif 30000 <= num <= 32999:
            return "PROCEDURE", "SURGERY_RESPIRATORY", "Respiratory Surgery (Airway, Lungs, Pleura)"
        elif 33016 <= num <= 37799:
            return "PROCEDURE", "SURGERY_CARDIOVASCULAR", "Cardiovascular Surgery (Heart, CABG, Valves, Vessels)"
        elif 38100 <= num <= 38999:
            return "PROCEDURE", "SURGERY_HEMIC_LYMPH", "Hemic & Lymphatic Surgery (Spleen, Bone Marrow, Nodes)"
        elif 40490 <= num <= 49999:
            return "PROCEDURE", "SURGERY_DIGESTIVE", "Digestive Surgery (Appendectomy, Hernia, Gallbladder, Bowel)"
        elif 50010 <= num <= 53899:
            return "PROCEDURE", "SURGERY_URINARY", "Urinary Surgery (Kidneys, Bladder, Ureter, Urethra)"
        elif 54000 <= num <= 55899:
            return "PROCEDURE", "SURGERY_GENITAL_MALE", "Male Genital Surgery (Prostate, Testes, Scrotum)"
        elif 56405 <= num <= 58999:
            return "PROCEDURE", "SURGERY_GENITAL_FEMALE", "Female Genital Surgery (Uterus, Myomectomy, Ovaries)"
        elif 59000 <= num <= 59899:
            return "PROCEDURE", "SURGERY_MATERNITY_DELIVERY", "Maternity Care & Delivery (Cesarean, Vaginal, Antenatal)"
        elif 60000 <= num <= 60699:
            return "PROCEDURE", "SURGERY_ENDOCRINE", "Endocrine Surgery (Thyroid, Parathyroid, Adrenal)"
        elif 61000 <= num <= 64999:
            return "PROCEDURE", "SURGERY_NERVOUS", "Nervous System Surgery (Brain, Craniotomy, Spine, Nerves)"
        elif 65091 <= num <= 68899:
            return "PROCEDURE", "SURGERY_EYE_OCULAR", "Eye & Ocular Surgery (Cataract, Cornea, Glaucoma, Retina)"
        elif 69000 <= num <= 69979:
            return "PROCEDURE", "SURGERY_EAR_AUDITORY", "Ear & Auditory Surgery (Tympanoplasty, Mastoidectomy)"
        # Radiology
        elif 70010 <= num <= 76499:
            return "RADIOLOGY", "RADIOLOGY_DIAGNOSTIC", "Diagnostic Radiology (X-Ray, CT, MRI, Fluoroscopy)"
        elif 76506 <= num <= 76999:
            return "RADIOLOGY", "RADIOLOGY_ULTRASOUND", "Diagnostic Sonography (Ultrasound, Fetal Doppler)"
        elif 77001 <= num <= 77086:
            return "RADIOLOGY", "RADIOLOGY_MAMMOGRAPHY_GUIDANCE", "Mammography, Bone Density & Radiologic Guidance"
        elif 77261 <= num <= 79999:
            return "RADIOLOGY", "RADIOLOGY_ONCOLOGY_NUCLEAR", "Radiation Oncology & Nuclear Medicine"
        # Pathology & Laboratory
        elif 80047 <= num <= 89398:
            return "LAB", "PATHOLOGY_LABORATORY", "Pathology & Laboratory Diagnostic Panels"
        # Medicine & Diagnostics
        elif 90281 <= num <= 99199:
            return "PROCEDURE", "DIAGNOSTIC_MEDICINE", "Medicine Diagnostics, Infusions, Cardiology & Therapy"
        # Evaluation & Management (E&M) Consultations
        elif 99202 <= num <= 99499:
            if 99281 <= num <= 99288:
                return "CONSULTATION", "EMERGENCY_DEPT_VISIT", "Emergency Department Evaluation & Management"
            elif 99291 <= num <= 99292:
                return "CONSULTATION", "CRITICAL_CARE_ICU", "Critical Care & ICU Resuscitation Evaluation"
            elif 99221 <= num <= 99239:
                return "CONSULTATION", "HOSPITAL_INPATIENT", "Hospital Inpatient Care Evaluation & Management"
            else:
                return "CONSULTATION", "OUTPATIENT_CONSULTATION", "Office / Outpatient Medical Consultation & Management"
        else:
            return "BILLING", "GENERAL_MEDICAL_PROCEDURE", "Clinical Medical Procedure"
    
    # CPT Category II (Performance measures: ends with F)
    if code_upper.endswith("F"):
        return "BILLING", "PERFORMANCE_MEASURES", "Clinical Quality Performance Measure (CPT Category II)"
    
    # CPT Category III (Emerging technology: ends with T)
    if code_upper.endswith("T"):
        return "PROCEDURE", "EMERGING_TECHNOLOGY", "Emerging Medical Technology (CPT Category III)"

    # HCPCS Level II Alphanumeric
    prefix = code_upper[0]
    if prefix == 'A':
        if code_upper.startswith(('A00', 'A01', 'A02', 'A03', 'A04', 'A08', 'A09')):
            return "BILLING", "HCPCS_AMBULANCE_TRANSPORT", "Ambulance, Emergency Medical Transport & Trip Tariffs"
        else:
            return "BILLING", "HCPCS_MEDICAL_SUPPLIES", "Medical & Surgical Dressing Supplies and Devices"
    elif prefix == 'B':
        return "BILLING", "HCPCS_ENTERAL_PARENTERAL", "Enteral & Parenteral Clinical Nutrition and Infusion Therapy"
    elif prefix == 'C':
        return "BILLING", "HCPCS_OPPS_HOSPITAL", "Hospital Outpatient Prospective Payment System (OPPS) Tariffs"
    elif prefix == 'D':
        return "PROCEDURE", "DENTAL_PROCEDURES", "Dental Procedures & CDT Clinical Care Crosswalk"
    elif prefix in ('E', 'K'):
        return "BILLING", "HCPCS_DME_EQUIPMENT", "Durable Medical Equipment (Wheelchairs, Oxygen, Hospital Beds)"
    elif prefix in ('G', 'M'):
        return "PROCEDURE", "HCPCS_PROCEDURES_SCREENING", "Clinical Professional Procedures, Telehealth & Preventive Screening"
    elif prefix == 'H':
        return "PROCEDURE", "HCPCS_BEHAVIORAL_HEALTH", "Behavioral Health, Psychiatric & Substance Abuse Services"
    elif prefix == 'J':
        return "PHARMACY", "HCPCS_INJECTABLES_CHEMO", "Injectable Medications, Chemotherapy, Biologics & Infusion Drugs"
    elif prefix == 'L':
        return "BILLING", "HCPCS_ORTHOTICS_PROSTHETICS", "Orthotics, Prosthetic Devices, Braces & Artificial Limbs"
    elif prefix == 'P':
        return "LAB", "HCPCS_PATHOLOGY_TESTS", "Pathology & Laboratory Diagnostic Procedures"
    elif prefix == 'Q':
        return "BILLING", "HCPCS_TEMPORARY_CODES", "Temporary Medical Procedures, Vaccines & Supplies"
    elif prefix == 'R':
        return "RADIOLOGY", "HCPCS_RADIOLOGY_SERVICES", "Diagnostic Radiology & Diagnostic Imaging Transport"
    elif prefix in ('S', 'T'):
        return "BILLING", "HCPCS_COMMERCIAL_MEDICAID", "Payer & State Agency Clinical Services Tariffs"
    elif prefix == 'U':
        return "LAB", "HCPCS_MOLECULAR_DIAGNOSTICS", "Infectious Pathogen & Molecular Diagnostic Testing"
    elif prefix == 'V':
        return "PROCEDURE", "HCPCS_VISION_HEARING", "Vision Care, Eyeglasses, Optometry & Hearing Pathology Services"
    
    return "BILLING", "HCPCS_PROCEDURE_TARIFF", "Healthcare Common Procedure Tariff"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Medical Acronyms & Clinical Title Expander
# ─────────────────────────────────────────────────────────────────────────────
EXPANSION_DICTIONARY = {
    "o/p": "outpatient",
    "i/p": "inpatient",
    "est": "established patient",
    "bx": "biopsy",
    "txmnt": "treatment",
    "les": "lesion",
    "img": "imaging",
    "gdn": "guidance",
    "w/": "with",
    "w/o": "without",
    "eval": "evaluation",
    "mgmt": "management",
    "comp": "comprehensive",
    "chem": "chemotherapy",
    "inj": "injection",
    "cath": "catheterization",
    "diag": "diagnostic",
    "arthro": "arthroscopy",
    "lap": "laparoscopy",
    "chole": "cholecystectomy",
    "app": "appendectomy",
    "hernia": "hernioplasty",
    "reduc": "reducible",
    "init": "initial",
    "subsq": "subsequent",
    "deliv": "delivery",
    "exam": "examination",
    "xtr": "extraction",
    "surg": "surgery",
    "proc": "procedure",
    "pt": "patient",
    "spec": "specimen",
    "serv": "services",
    "trans": "transportation",
    "wheelch": "wheelchair",
    "equip": "equipment",
    "admin": "administration",
    "infus": "infusion",
    "rehab": "rehabilitation",
    "phys": "physical",
    "ther": "therapy",
}

def clean_display_title(code: str, raw_desc: str) -> str:
    """
    Cleans raw CMS short descriptions into professional, Title-Cased clinical names.
    """
    if not raw_desc:
        return f"Medical Procedure {code}"
    
    # Capitalize acronyms and known terms
    tokens = raw_desc.replace(",", " , ").replace("/", " / ").split()
    cleaned_tokens = []
    for t in tokens:
        tl = t.lower()
        if tl in EXPANSION_DICTIONARY and len(t) <= 6:
            cleaned_tokens.append(EXPANSION_DICTIONARY[tl])
        elif t.upper() in ("CT", "MRI", "ECG", "EKG", "EEG", "EMG", "CXR", "CABG", "IV", "IM", "SC", "ICU", "ER", "CBC", "CMP", "BMP", "DME", "OPPS", "PFS", "ALS", "BLS"):
            cleaned_tokens.append(t.upper())
        else:
            cleaned_tokens.append(t)
            
    title = " ".join(cleaned_tokens).replace(" ,", ",").replace(" / ", "/")
    # Capitalize first letter of words
    words = [w.capitalize() if not w.isupper() else w for w in title.split()]
    return " ".join(words).strip()

# ─────────────────────────────────────────────────────────────────────────────
# 3. Main Scraper & Dataset Builder
# ─────────────────────────────────────────────────────────────────────────────
def scrape_cpt_and_hcpcs() -> List[Dict[str, Any]]:
    log("Starting CPT-4 & HCPCS Level II Medical Procedures & Billing Tariffs Extractor...")
    
    zip_path = os.path.join(CACHE_DIR, "rvu24a.zip")
    if not os.path.exists(zip_path) or os.path.getsize(zip_path) == 0:
        log(f"Downloading official CMS Physician Fee Schedule Relative Value File from {CMS_RVU_URL}...")
        try:
            req = urllib.request.Request(CMS_RVU_URL, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as resp:
                with open(zip_path, "wb") as f:
                    f.write(resp.read())
            log(f"Successfully downloaded {os.path.getsize(zip_path):,} bytes to {zip_path}")
        except Exception as e:
            log(f"Failed to download CMS RVU archive: {e}")
            raise

    # 1. Parse CMS PPRRVU file
    log("Extracting and parsing PPRRVU24_JAN.csv from CMS archive...")
    raw_cms_records: Dict[str, Dict[str, Any]] = {}
    with zipfile.ZipFile(zip_path, "r") as z:
        csv_filename = [n for n in z.namelist() if n.startswith("PPRRVU") and n.endswith(".csv")][0]
        raw_text = z.read(csv_filename).decode("latin1")
        reader = csv.reader(raw_text.splitlines())
        
        for i, row in enumerate(reader):
            if i <= 9:
                continue
            if len(row) >= 3:
                code = row[0].strip().upper()
                mod = row[1].strip()
                desc = row[2].strip()
                status = row[3].strip() if len(row) > 3 else "A"
                work_rvu = row[5].strip() if len(row) > 5 and row[5].strip() else "0.00"
                facility_rvu = row[11].strip() if len(row) > 11 and row[11].strip() else "0.00"
                non_facility_rvu = row[12].strip() if len(row) > 12 and row[12].strip() else "0.00"
                global_days = row[14].strip() if len(row) > 14 and row[14].strip() else "XXX"
                
                if code and len(code) == 5:
                    # Prefer base record without modifier
                    if code not in raw_cms_records or mod == "":
                        raw_cms_records[code] = {
                            "code": code,
                            "desc": desc,
                            "status": status,
                            "work_rvu": work_rvu,
                            "facility_rvu": facility_rvu,
                            "non_facility_rvu": non_facility_rvu,
                            "global_days": global_days,
                            "mod": mod
                        }

    log(f"Parsed {len(raw_cms_records):,} distinct procedure codes from official CMS PFS release.")

    # 2. Check for optional cached NLM HCPCS descriptions
    nlm_descriptions: Dict[str, str] = {}
    nlm_cache_file = os.path.join(CACHE_DIR, "nlm_hcpcs_full.json")
    if os.path.exists(nlm_cache_file):
        try:
            with open(nlm_cache_file, "r", encoding="utf-8") as f:
                nlm_descriptions = json.load(f)
            log(f"Loaded {len(nlm_descriptions):,} cached full HCPCS descriptions from NLM.")
        except Exception:
            pass

    # 3. Build Unified CPT-4 & HCPCS Terminology Dataset
    concepts: List[Dict[str, Any]] = []
    seen_codes: Set[str] = set()

    for code, r in raw_cms_records.items():
        if code in seen_codes:
            continue
        seen_codes.add(code)

        raw_desc = r["desc"]
        # If NLM has an expanded description for HCPCS, prefer it for greater clinical clarity
        nlm_desc = nlm_descriptions.get(code)
        display = nlm_desc if (nlm_desc and len(nlm_desc) > len(raw_desc)) else clean_display_title(code, raw_desc)
        
        category, tariff_group, proc_type = categorize_cpt_hcpcs(code, raw_desc)
        
        # Build comprehensive clinical description
        work_rvu_val = float(r["work_rvu"]) if r["work_rvu"].replace(".", "", 1).isdigit() else 0.0
        tot_rvu_val = float(r["facility_rvu"]) if r["facility_rvu"].replace(".", "", 1).isdigit() else 0.0
        
        desc_parts = [
            f"Code: {code} [{proc_type}]",
            f"Description: {display}",
            f"Tariff Category: {tariff_group}",
        ]
        if work_rvu_val > 0:
            desc_parts.append(f"Work RVU: {work_rvu_val:.2f}")
        if tot_rvu_val > 0:
            desc_parts.append(f"Total Facility RVU: {tot_rvu_val:.2f}")
        if r["global_days"] and r["global_days"] not in ("XXX", "YYY", "ZZZ"):
            desc_parts.append(f"Global Surgical Period: {r['global_days']} days")
            
        full_description = " | ".join(desc_parts)

        is_cpt = code.isdigit()
        sys_code = "CPT" if is_cpt else "HCPCS"
        sys_uri = "http://www.ama-assn.org/go/cpt" if is_cpt else "https://www.cms.gov/medicare/coding/hcpcsreleasecodesets"

        concepts.append({
            "system": "CPT",  # Unified under CPT standard in TerkHealth360
            "systemUri": "http://www.ama-assn.org/go/cpt",
            "code": code,
            "display": display,
            "description": full_description,
            "category": "BILLING",
            "metadata": {
                "codingStandard": sys_code,
                "systemUri": sys_uri,
                "tariffGroup": tariff_group,
                "procedureType": proc_type,
                "status": r["status"],
                "workRvu": r["work_rvu"],
                "facilityTotalRvu": r["facility_rvu"],
                "nonFacilityTotalRvu": r["non_facility_rvu"],
                "globalSurgeryDays": r["global_days"]
            },
            "isActive": True
        })

    # Sort stably by Code
    concepts.sort(key=lambda x: (0 if x["code"].isdigit() else 1, x["code"]))
    log(f"Successfully aggregated {len(concepts):,} normalized CPT-4 and HCPCS Level II concepts!")
    return concepts

def main():
    start_time = time.time()
    concepts = scrape_cpt_and_hcpcs()
    total_count = len(concepts)

    json_file = os.path.join(OUTPUT_DIR, "cpt_terminologies.json")
    csv_file = os.path.join(OUTPUT_DIR, "cpt_terminologies.csv")

    # 1. Write JSON
    log(f"Writing {total_count:,} concepts to {json_file}...")
    payload = {
        "standard": "CPT",
        "title": "Current Procedural Terminology (CPT-4) & HCPCS Level II Hospital Billing & Tariffs",
        "systemUri": "http://www.ama-assn.org/go/cpt",
        "totalConcepts": total_count,
        "generatedAt": datetime.now().isoformat(),
        "summary": {
            "cptNumericCount": sum(1 for c in concepts if c["code"].isdigit()),
            "hcpcsAlphanumericCount": sum(1 for c in concepts if not c["code"].isdigit()),
            "surgeriesCount": sum(1 for c in concepts if "SURGERY" in c.get("metadata", {}).get("tariffGroup", "")),
            "consultationsCount": sum(1 for c in concepts if "CONSULTATION" in c.get("metadata", {}).get("tariffGroup", "") or "VISIT" in c.get("metadata", {}).get("tariffGroup", "")),
            "radiologyCount": sum(1 for c in concepts if "RADIOLOGY" in c.get("metadata", {}).get("tariffGroup", "")),
            "pathologyLabCount": sum(1 for c in concepts if "PATHOLOGY" in c.get("metadata", {}).get("tariffGroup", "") or "LAB" in c.get("category", "")),
        },
        "concepts": concepts
    }
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    # 2. Write CSV
    log(f"Writing {total_count:,} records to {csv_file}...")
    with open(csv_file, "w", encoding="utf-8", newline="") as f:
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

    # 3. Update Manifest
    manifest_file = os.path.join(OUTPUT_DIR, "terminology_manifest.json")
    manifest = {}
    if os.path.exists(manifest_file):
        try:
            with open(manifest_file, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            manifest = {}

    standards_summary = manifest.get("standardsSummary", {})
    standards_summary["CPT"] = {
        "title": "Current Procedural Terminology (CPT-4) & HCPCS Level II Hospital Tariffs",
        "systemUri": "http://www.ama-assn.org/go/cpt",
        "count": total_count,
        "jsonFile": "data/terminologies/cpt_terminologies.json",
        "csvFile": "data/terminologies/cpt_terminologies.csv",
        "lastUpdated": datetime.now().isoformat()
    }
    manifest["standardsSummary"] = standards_summary
    manifest["totalConceptsCount"] = sum(s.get("count", 0) for s in standards_summary.values())
    manifest["updatedAt"] = datetime.now().isoformat()

    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    elapsed = time.time() - start_time
    log("─────────────────────────────────────────────────────────────────────────────")
    log(f"✓ CPT-4 / HCPCS Tariffs Generation Complete!")
    log(f"✓ Total Concepts Generated: {total_count:,} (Target was 10,000+)")
    log(f"✓ Total Global Standards Concepts in Manifest: {manifest['totalConceptsCount']:,}")
    log(f"✓ Execution time: {elapsed:.2f} seconds")
    log("─────────────────────────────────────────────────────────────────────────────")

if __name__ == "__main__":
    main()
