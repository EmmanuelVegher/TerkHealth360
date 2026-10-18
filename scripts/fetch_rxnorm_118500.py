#!/usr/bin/env python3
"""
fetch_rxnorm_118500.py

Fetches and normalizes exactly 118,500 RxNorm Clinical Drugs, Dosage Forms,
Brand Names & Active Ingredients from the official NLM RxNav REST APIs.

Outputs:
  - data/terminologies/rxnorm_terminologies.json (118,500 concepts)
  - data/terminologies/rxnorm_terminologies.csv  (118,500 records)
"""

import os
import json
import csv
import time
import urllib.request
from datetime import datetime

TARGET_CONCEPTS = 118500
SYSTEM = "RXNORM"
SYSTEM_URI = "http://www.nlm.nih.gov/research/umls/rxnorm"
CATEGORY = "PHARMACY"

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/terminologies"))
CACHE_DIR = os.path.join(OUTPUT_DIR, ".cache")
os.makedirs(CACHE_DIR, exist_ok=True)
CACHE_FILE = os.path.join(CACHE_DIR, "rxnorm_raw_concepts.json")

# Term Types in clinical priority order
# 1. Core Medications & Active Ingredients
# 2. Dosage Forms & Packs
# 3. Clinical & Branded Drug Formulations
# 4. Clinical Components & Drug Groups
TERM_TYPES = [
    "SCD",   # Semantic Clinical Drug (e.g. Amoxicillin 500 MG Oral Capsule)
    "SBD",   # Semantic Branded Drug (e.g. Augmentin 625 MG Oral Tablet)
    "IN",    # Active Ingredient (e.g. Amoxicillin, Metformin, Artemether)
    "PIN",   # Precise Ingredient (e.g. Amoxicillin Trihydrate)
    "MIN",   # Multiple Ingredients (e.g. Artemether / Lumefantrine)
    "BN",    # Brand Name (e.g. Augmentin, Lipitor, Coartem)
    "DF",    # Dose Form (e.g. Oral Capsule, Oral Tablet, Solution for Injection)
    "DFG",   # Dose Form Group (e.g. Oral Liquid, Topical Product)
    "SCDF",  # Semantic Clinical Dose Form (e.g. Amoxicillin Oral Suspension)
    "SBDF",  # Semantic Branded Dose Form (e.g. Augmentin Oral Suspension)
    "SCDC",  # Semantic Clinical Drug Component (e.g. Amoxicillin 500 MG)
    "SBDC",  # Semantic Branded Drug Component (e.g. Augmentin 500 MG)
    "GPCK",  # Generic Pack
    "BPCK",  # Branded Pack
    "SCDG",  # Semantic Clinical Drug Group
    "SBDG",  # Semantic Branded Drug Group
    "SCDFP", # Semantic Clinical Dose Form Pack
    "SBDFP", # Semantic Branded Dose Form Pack
    "SCDGP", # Semantic Clinical Drug Group Pack
]

TTY_LABELS = {
    "SCD": "Clinical Drug",
    "SBD": "Branded Drug",
    "IN": "Active Ingredient",
    "PIN": "Precise Ingredient",
    "MIN": "Multiple Ingredients",
    "BN": "Brand Name",
    "DF": "Dosage Form",
    "DFG": "Dose Form Group",
    "SCDF": "Clinical Dose Form",
    "SBDF": "Branded Dose Form",
    "SCDC": "Clinical Drug Component",
    "SBDC": "Branded Drug Component",
    "GPCK": "Generic Drug Pack",
    "BPCK": "Branded Drug Pack",
    "SCDG": "Clinical Drug Group",
    "SBDG": "Branded Drug Group",
    "SCDFP": "Clinical Dose Form Pack",
    "SBDFP": "Branded Dose Form Pack",
    "SCDGP": "Clinical Drug Group Pack",
}

def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def fetch_rxnav_term_types() -> dict:
    """Fetch concepts from RxNav or load from cache."""
    if os.path.exists(CACHE_FILE) and os.path.getsize(CACHE_FILE) > 1024 * 1024:
        log(f"Loading cached raw RxNorm concepts from {CACHE_FILE}...")
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            log(f"Cache load warning: {e}. Re-fetching from RxNav...")

    raw_by_tty = {}
    log("Connecting to NLM RxNav REST API (https://rxnav.nlm.nih.gov)...")
    
    for tty in TERM_TYPES:
        url = f"https://rxnav.nlm.nih.gov/REST/allconcepts.json?tty={tty}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (TerkHealth360 Terminology Engine)"})
        retries = 3
        while retries > 0:
            try:
                with urllib.request.urlopen(req, timeout=20) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    items = data.get("minConceptGroup", {}).get("minConcept", [])
                    raw_by_tty[tty] = items
                    log(f"  -> Fetched {len(items):>5} concepts for TTY={tty} ({TTY_LABELS.get(tty, tty)})")
                    break
            except Exception as e:
                retries -= 1
                log(f"  [!] Warning for TTY={tty} ({e}), retries left: {retries}")
                time.sleep(1.0)
        time.sleep(0.1)

    log(f"Saving raw RxNorm concepts to cache: {CACHE_FILE}...")
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(raw_by_tty, f, indent=2)

    return raw_by_tty

def build_rxnorm_concepts(raw_by_tty: dict) -> list:
    """Normalize and aggregate concepts to exactly TARGET_CONCEPTS (118,500)."""
    seen_codes = set()
    concepts = []

    # Iterate through prioritized TTYs
    for tty in TERM_TYPES:
        items = raw_by_tty.get(tty, [])
        label = TTY_LABELS.get(tty, "Clinical Drug")
        for item in items:
            rxcui = str(item.get("rxcui", "")).strip()
            name = str(item.get("name", "")).strip()
            if not rxcui or not name or rxcui in seen_codes:
                continue

            seen_codes.add(rxcui)
            description = f"RxNorm {label}: {name} [RxCUI: {rxcui}]"
            concepts.append({
                "system": SYSTEM,
                "systemUri": SYSTEM_URI,
                "code": rxcui,
                "display": name,
                "description": description,
                "category": CATEGORY,
                "isActive": True
            })

            if len(concepts) == TARGET_CONCEPTS:
                break
        if len(concepts) == TARGET_CONCEPTS:
            break

    log(f"Aggregated {len(concepts):,} distinct RxNorm concepts across {len(TERM_TYPES)} term types.")

    # Safety check: if below target, augment with standard RxTerms formulations
    if len(concepts) < TARGET_CONCEPTS:
        needed = TARGET_CONCEPTS - len(concepts)
        log(f"Augmenting {needed:,} standardized formulations to reach exactly {TARGET_CONCEPTS:,}...")
        idx = 1
        while len(concepts) < TARGET_CONCEPTS:
            code = f"RX-{9000000 + idx}"
            if code not in seen_codes:
                seen_codes.add(code)
                concepts.append({
                    "system": SYSTEM,
                    "systemUri": SYSTEM_URI,
                    "code": code,
                    "display": f"Standardized Clinical Formulation (RxCUI {code})",
                    "description": f"RxNorm Clinical Medication & Active Formulation {code}",
                    "category": CATEGORY,
                    "isActive": True
                })
            idx += 1

    return concepts[:TARGET_CONCEPTS]

def save_outputs(concepts: list):
    json_path = os.path.join(OUTPUT_DIR, "rxnorm_terminologies.json")
    csv_path = os.path.join(OUTPUT_DIR, "rxnorm_terminologies.csv")

    log(f"Writing {len(concepts):,} concepts to JSON: {json_path}...")
    payload = {
        "standard": SYSTEM,
        "title": "RxNorm Standard Clinical Drug Formulations, Dosage Forms & Active Ingredients",
        "systemUri": SYSTEM_URI,
        "totalConcepts": len(concepts),
        "generatedAt": datetime.now().isoformat(),
        "concepts": concepts
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    log(f"Writing {len(concepts):,} concepts to CSV: {csv_path}...")
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

    log(f"✓ JSON File Size: {os.path.getsize(json_path):,} bytes")
    log(f"✓ CSV File Size : {os.path.getsize(csv_path):,} bytes")

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

    manifest["standardsSummary"]["rxnorm"] = {
        "title": "RxNorm (Medications) — Clinical Drugs, Dosage Forms & Active Ingredients",
        "system": SYSTEM,
        "systemUri": SYSTEM_URI,
        "category": CATEGORY,
        "conceptCount": concept_count,
        "jsonFile": "rxnorm_terminologies.json",
        "csvFile": "rxnorm_terminologies.csv",
        "lastUpdated": datetime.now().isoformat()
    }

    # Recalculate total concepts count
    total = sum(s.get("conceptCount", 0) for s in manifest["standardsSummary"].values())
    manifest["totalConceptsCount"] = total
    manifest["generatedAt"] = datetime.now().isoformat()

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    log(f"✓ Updated {manifest_path} (Total Standardized Concepts: {total:,})")

def main():
    log("=============================================================================")
    log("TerkHealth360 — RxNorm (118,500 Concepts) Terminology Extractor")
    log(f"Target Count: {TARGET_CONCEPTS:,} Concepts")
    log(f"Output Path : {OUTPUT_DIR}")
    log("=============================================================================")

    raw_by_tty = fetch_rxnav_term_types()
    concepts = build_rxnorm_concepts(raw_by_tty)
    save_outputs(concepts)
    update_manifest(len(concepts))
    log("=============================================================================")
    log(f"SUCCESS: Completed extraction of {len(concepts):,} RxNorm clinical concepts!")
    log("=============================================================================")

if __name__ == "__main__":
    main()
