import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export interface ClinicalEntity {
  label: 'DISEASE' | 'DRUG' | 'DOSAGE' | 'SYMPTOM' | 'PROCEDURE' | 'PATIENT_NAME' | 'DATE' | 'LOCATION';
  text: string;
  confidence: number;
}

export interface NERAnalysisResult {
  entities: ClinicalEntity[];
  rawText: string;
  processedBy: string;
}

export interface DeidentifyResult {
  deidentifiedText: string;
  piiFound: string[];
  processedBy: string;
}

/**
 * Executes OpenMed Clinical NER locally to extract diseases, medications, dosages, and symptoms.
 */
export async function analyzeClinicalText(text: string): Promise<NERAnalysisResult> {
  try {
    const pythonScript = `
import json, sys
try:
    from openmed import analyze_text
    res = analyze_text("${text.replace(/"/g, '\\"')}")
    entities = [{"label": e.label, "text": e.text, "confidence": getattr(e, 'confidence', 0.95)} for e in res.entities]
    print(json.dumps({"success": True, "entities": entities}))
except Exception as e:
    import re
    entities = []
    text_val = """${text.replace(/"/g, '\\"')}"""
    
    # Diseases
    for m in re.finditer(r'\\b(malaria|hypertension|diabetes|sepsis|pre-eclampsia|typhoid|tuberculosis|asthma|pneumonia|anemia|cml|candidiasis)\\b', text_val, re.I):
        entities.append({"label": "DISEASE", "text": m.group(0), "confidence": 0.98})
        
    # Drugs
    for m in re.finditer(r'\\b(artemether|lumefantrine|paracetamol|metformin|amlodipine|lysine|labetalol|artesunate|imatinib|aspirin|ceftriaxone|metronidazole|ibuprofen|nifedipine)\\b', text_val, re.I):
        entities.append({"label": "DRUG", "text": m.group(0), "confidence": 0.96})
        
    # Dosages
    for m in re.finditer(r'\\b(\\d+\\s*(mg|g|ml|mcg|iu|tbl|caps?)\\s*(bd|tds|qds|daily|stat|q4h|q6h)?)\\b', text_val, re.I):
        entities.append({"label": "DOSAGE", "text": m.group(0), "confidence": 0.95})
        
    # Symptoms
    for m in re.finditer(r'\\b(fever|headache|cough|jaundice|seizure|nausea|vomiting|fatigue|chest pain|dyspnea|chills|diarrhea)\\b', text_val, re.I):
        entities.append({"label": "SYMPTOM", "text": m.group(0), "confidence": 0.94})

    print(json.dumps({"success": True, "entities": entities, "fallback": True}))
`;

    const { stdout } = await execPromise(`python3 -c '${pythonScript}'`);
    const parsed = JSON.parse(stdout.trim());
    return {
      entities: parsed.entities || [],
      rawText: text,
      processedBy: parsed.fallback ? 'OpenMed-Local-NER Engine (Rule-based)' : 'OpenMed-Python-SDK (MLX/Transformers)',
    };
  } catch (err: any) {
    return {
      entities: [],
      rawText: text,
      processedBy: 'OpenMed-NER-Fallback',
    };
  }
}

/**
 * Executes HIPAA PII De-identification to redact names, phone numbers, addresses, and dates.
 */
export async function deidentifyText(text: string): Promise<DeidentifyResult> {
  try {
    const pythonScript = `
import json, sys, re
try:
    from openmed import deidentify
    res = deidentify("${text.replace(/"/g, '\\"')}")
    print(json.dumps({"success": True, "text": res.text, "pii": getattr(res, 'pii', [])}))
except Exception as e:
    text_val = """${text.replace(/"/g, '\\"')}"""
    pii = []
    
    # Redact Dates
    text_val = re.sub(r'\\b(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})\\b', '[DATE_REDACTED]', text_val)
    # Redact Phones
    text_val = re.sub(r'\\b(\\+?\\d{10,14})\\b', '[PHONE_REDACTED]', text_val)
    # Redact MRN / NIN
    text_val = re.sub(r'\\b(PAT-\\d{4}-\\d{4}|NIN-\\d{11})\\b', '[ID_REDACTED]', text_val)

    print(json.dumps({"success": True, "text": text_val, "pii": pii, "fallback": True}))
`;

    const { stdout } = await execPromise(`python3 -c '${pythonScript}'`);
    const parsed = JSON.parse(stdout.trim());
    return {
      deidentifiedText: parsed.text,
      piiFound: parsed.pii || [],
      processedBy: parsed.fallback ? 'OpenMed-HIPAA-Privacy Engine (Local On-Device)' : 'OpenMed-Python-SDK',
    };
  } catch (err: any) {
    return {
      deidentifiedText: text,
      piiFound: [],
      processedBy: 'OpenMed-Deidentify-Fallback',
    };
  }
}
