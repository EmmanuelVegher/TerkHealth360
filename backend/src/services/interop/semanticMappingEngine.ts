import { TableSchema, CanonicalEntity, TableMappingProposal, FieldMappingRule } from './types.js';

interface CanonicalFieldDef {
  field: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean';
  synonyms: string[];
  defaultTransform?: FieldMappingRule['transformFunction'];
}

export const CANONICAL_MODELS: Record<CanonicalEntity, { title: string; description: string; fields: CanonicalFieldDef[] }> = {
  PATIENT: {
    title: 'Patient Master Record',
    description: 'Demographics, hospital card number, and primary contacts.',
    fields: [
      { field: 'hospitalNumber', label: 'Hospital/Card Number', required: true, type: 'string', synonyms: ['cardno', 'mrn', 'fileno', 'patientno', 'patientid', 'hospitalno', 'crdno', 'pid', 'chartno', 'id'] },
      { field: 'firstName', label: 'First Name', required: true, type: 'string', synonyms: ['fname', 'firstname', 'givenname', 'first', 'first_nm', 'pt_name'] },
      { field: 'lastName', label: 'Last Name / Surname', required: true, type: 'string', synonyms: ['lname', 'lastname', 'surname', 'familyname', 'last_nm'] },
      { field: 'middleName', label: 'Middle Name', required: false, type: 'string', synonyms: ['mname', 'middlename', 'othernames', 'middle'] },
      { field: 'gender', label: 'Gender / Sex', required: true, type: 'string', synonyms: ['sex', 'gender', 'sex_cd', 'gender_id', 'pt_sex'], defaultTransform: 'GENDER_NORMALIZE' },
      { field: 'dateOfBirth', label: 'Date of Birth', required: false, type: 'date', synonyms: ['dob', 'dateofbirth', 'birthdate', 'birth_dt', 'bdate'], defaultTransform: 'PARSE_DATE' },
      { field: 'phoneNumber', label: 'Phone Number', required: false, type: 'string', synonyms: ['phone', 'mobile', 'tel', 'telephone', 'phoneno', 'contactno', 'gsm', 'cell'] },
      { field: 'address', label: 'Home Address', required: false, type: 'string', synonyms: ['address', 'residence', 'location', 'addr', 'street', 'city', 'lga'] },
      { field: 'email', label: 'Email Address', required: false, type: 'string', synonyms: ['email', 'emailaddress', 'mail', 'email_id'] },
      { field: 'bloodGroup', label: 'Blood Group', required: false, type: 'string', synonyms: ['bloodgroup', 'blood_type', 'bg', 'blood_grp', 'abo'] },
      { field: 'genotype', label: 'Genotype', required: false, type: 'string', synonyms: ['genotype', 'geno', 'hb_type'] },
    ]
  },
  BILLING_RECEIPT: {
    title: 'Cashier Receipt & POS Transaction',
    description: 'Inward hospital payments, cashier tenders, POS card, and bank collections.',
    fields: [
      { field: 'receiptNumber', label: 'Receipt / Invoice Number', required: true, type: 'string', synonyms: ['receiptno', 'rcptno', 'invoiceno', 'invid', 'transid', 'billno', 'ticketno', 'referenceno', 'refno', 'txid'] },
      { field: 'patientHospitalNumber', label: 'Patient Identifier', required: false, type: 'string', synonyms: ['patientid', 'cardno', 'mrn', 'fileno', 'custid', 'clientid', 'pt_crd'] },
      { field: 'patientName', label: 'Payer / Patient Name', required: false, type: 'string', synonyms: ['patientname', 'payername', 'customername', 'pt_name', 'name', 'client'] },
      { field: 'amountPaid', label: 'Amount Paid (₦)', required: true, type: 'number', synonyms: ['amount', 'amt', 'amountpaid', 'total', 'paid', 'tendered', 'cost', 'fee', 'price', 'totalamount', 'netamount'], defaultTransform: 'PARSE_NUMBER' },
      { field: 'paymentMethod', label: 'Payment Method', required: false, type: 'string', synonyms: ['paymentmethod', 'paymode', 'method', 'type', 'cash_pos', 'channel', 'mode'] },
      { field: 'serviceRendered', label: 'Service / Department', required: false, type: 'string', synonyms: ['service', 'description', 'particulars', 'item', 'servicename', 'narrative', 'dept'] },
      { field: 'cashierName', label: 'Cashier / Collector', required: false, type: 'string', synonyms: ['cashier', 'operator', 'collectedby', 'staff', 'user', 'cashiername', 'clerk', 'created_by'] },
      { field: 'transactionDate', label: 'Transaction Timestamp', required: false, type: 'date', synonyms: ['date', 'transdate', 'createdat', 'tx_time', 'time', 'timestamp', 'receiptdate'], defaultTransform: 'PARSE_DATE' },
    ]
  },
  PHARMACY_DISPENSE: {
    title: 'Pharmacy Dispensing Record',
    description: 'Dispensed pharmaceuticals, dosage, quantity, and cost.',
    fields: [
      { field: 'prescriptionNumber', label: 'Prescription / Order No', required: true, type: 'string', synonyms: ['rxno', 'prescriptionno', 'rx_id', 'orderno', 'dispenseno', 'refno'] },
      { field: 'patientHospitalNumber', label: 'Patient Identifier', required: false, type: 'string', synonyms: ['patientid', 'cardno', 'mrn', 'pt_crd', 'patientno'] },
      { field: 'drugName', label: 'Drug / Product Name', required: true, type: 'string', synonyms: ['drug', 'itemname', 'productname', 'drugname', 'item_desc', 'brandname', 'genericname', 'medicine'] },
      { field: 'quantity', label: 'Quantity Dispensed', required: true, type: 'number', synonyms: ['qty', 'quantity', 'units', 'bottles', 'packs', 'count'], defaultTransform: 'PARSE_NUMBER' },
      { field: 'unitPrice', label: 'Unit Price', required: false, type: 'number', synonyms: ['price', 'unitprice', 'rate', 'cost'], defaultTransform: 'PARSE_NUMBER' },
      { field: 'totalAmount', label: 'Total Cost', required: false, type: 'number', synonyms: ['total', 'amount', 'totalcost', 'totalamount'], defaultTransform: 'PARSE_NUMBER' },
      { field: 'dosageInstructions', label: 'Dosage / Sig', required: false, type: 'string', synonyms: ['dosage', 'sig', 'instructions', 'frequency', 'duration', 'direction'] },
      { field: 'dispensedBy', label: 'Pharmacist / Technician', required: false, type: 'string', synonyms: ['dispensedby', 'pharmacist', 'staff', 'issuedby', 'user'] },
      { field: 'dispensedAt', label: 'Dispense Date', required: false, type: 'date', synonyms: ['dispensedat', 'date', 'dispensedate', 'issueddate', 'createdat'], defaultTransform: 'PARSE_DATE' },
    ]
  },
  LAB_RESULT: {
    title: 'Laboratory Result & Observation',
    description: 'Test names, numeric/text results, reference ranges, and analyzers.',
    fields: [
      { field: 'orderNumber', label: 'Lab Sample / Order ID', required: true, type: 'string', synonyms: ['sampleid', 'orderno', 'accessionno', 'barcode', 'labno', 'specimenid', 'testid'] },
      { field: 'patientHospitalNumber', label: 'Patient Identifier', required: false, type: 'string', synonyms: ['patientid', 'cardno', 'mrn', 'pt_crd', 'patientno'] },
      { field: 'testName', label: 'Test / Parameter Name', required: true, type: 'string', synonyms: ['testname', 'parameter', 'analyte', 'investigation', 'test_desc', 'code'] },
      { field: 'resultValue', label: 'Result Finding', required: true, type: 'string', synonyms: ['result', 'value', 'finding', 'reading', 'testresult', 'obs_value'] },
      { field: 'unit', label: 'Measurement Unit', required: false, type: 'string', synonyms: ['unit', 'units', 'uom', 'metric'] },
      { field: 'referenceRange', label: 'Reference Range', required: false, type: 'string', synonyms: ['referencerange', 'normalrange', 'ref_interval', 'range', 'limits'] },
      { field: 'clinicalRemarks', label: 'Remarks / Interpretation', required: false, type: 'string', synonyms: ['remarks', 'notes', 'interpretation', 'flag', 'status', 'comment'] },
      { field: 'testedBy', label: 'Scientist / Device', required: false, type: 'string', synonyms: ['technician', 'scientist', 'device', 'analyzer', 'operator', 'user'] },
      { field: 'testedAt', label: 'Test Timestamp', required: false, type: 'date', synonyms: ['testedat', 'date', 'resultdate', 'analyzed_time', 'createdat'], defaultTransform: 'PARSE_DATE' },
    ]
  },
  ENCOUNTER_VISIT: {
    title: 'Clinical Encounter & Vitals',
    description: 'OPD, Ward, Emergency, triage consultation, and vital signs.',
    fields: [
      { field: 'visitNumber', label: 'Visit / Encounter ID', required: true, type: 'string', synonyms: ['visitno', 'encounterid', 'visitid', 'vis_no', 'enc_id'] },
      { field: 'patientHospitalNumber', label: 'Patient Identifier', required: true, type: 'string', synonyms: ['patientid', 'cardno', 'mrn', 'pt_crd', 'patientno'] },
      { field: 'department', label: 'Clinic / Department', required: false, type: 'string', synonyms: ['department', 'dept', 'clinic', 'unit', 'ward', 'service'] },
      { field: 'visitType', label: 'Visit Type', required: false, type: 'string', synonyms: ['type', 'visittype', 'encountertype', 'mode'] },
      { field: 'chiefComplaint', label: 'Chief Complaint', required: false, type: 'string', synonyms: ['complaint', 'symptoms', 'history', 'reason', 'notes'] },
      { field: 'diagnosis', label: 'Diagnosis', required: false, type: 'string', synonyms: ['diagnosis', 'icd', 'assessment', 'condition', 'impression'] },
      { field: 'systolicBP', label: 'Systolic BP (mmHg)', required: false, type: 'number', synonyms: ['systolic', 'sys', 'sbp', 'bp_sys'], defaultTransform: 'PARSE_NUMBER' },
      { field: 'diastolicBP', label: 'Diastolic BP (mmHg)', required: false, type: 'number', synonyms: ['diastolic', 'dia', 'dbp', 'bp_dia'], defaultTransform: 'PARSE_NUMBER' },
      { field: 'temperature', label: 'Temperature (°C)', required: false, type: 'number', synonyms: ['temperature', 'temp', 'bodytemp'], defaultTransform: 'PARSE_NUMBER' },
      { field: 'weight', label: 'Weight (kg)', required: false, type: 'number', synonyms: ['weight', 'wt', 'kg'], defaultTransform: 'PARSE_NUMBER' },
      { field: 'visitedAt', label: 'Visit Date', required: false, type: 'date', synonyms: ['visitdate', 'date', 'encounterdate', 'createdat'], defaultTransform: 'PARSE_DATE' },
    ]
  },
  STAFF: {
    title: 'Hospital Workforce & Staff',
    description: 'Doctors, nurses, cashiers, technicians, and system users.',
    fields: [
      { field: 'employeeId', label: 'Staff / Employee ID', required: true, type: 'string', synonyms: ['employeeid', 'staffid', 'staffno', 'emp_no', 'user_id', 'id'] },
      { field: 'firstName', label: 'First Name', required: true, type: 'string', synonyms: ['fname', 'firstname', 'givenname', 'name'] },
      { field: 'lastName', label: 'Last Name / Surname', required: true, type: 'string', synonyms: ['lname', 'lastname', 'surname'] },
      { field: 'email', label: 'Work Email', required: false, type: 'string', synonyms: ['email', 'mail', 'username'] },
      { field: 'phoneNumber', label: 'Phone Number', required: false, type: 'string', synonyms: ['phone', 'mobile', 'tel', 'telephone'] },
      { field: 'role', label: 'Designation / Role', required: false, type: 'string', synonyms: ['role', 'designation', 'job_title', 'position', 'cadre'] },
      { field: 'department', label: 'Assigned Department', required: false, type: 'string', synonyms: ['department', 'dept', 'unit', 'station'] },
    ]
  }
};

export class SemanticMappingEngine {
  /**
   * Normalize an identifier by removing table prefixes, underscores, and special characters
   */
  private static cleanName(str: string): string {
    return str
      .toLowerCase()
      .replace(/^(tbl|table|vw|view|t|v)_/i, '')
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Determine best CanonicalEntity for a table schema
   */
  public static proposeEntityForTable(table: TableSchema): { entity: CanonicalEntity; confidence: number; reasoning: string } {
    const cleanTable = this.cleanName(table.name);
    const colNames = table.columns.map(c => this.cleanName(c.name));

    const scores: Record<CanonicalEntity, { score: number; reasons: string[] }> = {
      PATIENT: { score: 0, reasons: [] },
      BILLING_RECEIPT: { score: 0, reasons: [] },
      PHARMACY_DISPENSE: { score: 0, reasons: [] },
      LAB_RESULT: { score: 0, reasons: [] },
      ENCOUNTER_VISIT: { score: 0, reasons: [] },
      STAFF: { score: 0, reasons: [] },
    };

    // 1. Table name heuristics
    if (/patient|ptmaster|client|customer|demographic|bio/.test(cleanTable)) {
      scores.PATIENT.score += 40;
      scores.PATIENT.reasons.push(`Table name "${table.name}" suggests patient demographics`);
    }
    if (/receipt|billing|payment|invoice|cashier|pos|tender|collection|sale/.test(cleanTable)) {
      scores.BILLING_RECEIPT.score += 45;
      scores.BILLING_RECEIPT.reasons.push(`Table name "${table.name}" matches cashier/billing patterns`);
    }
    if (/pharm|drug|dispens|rx|medication|orderpharm|prescription/.test(cleanTable)) {
      scores.PHARMACY_DISPENSE.score += 45;
      scores.PHARMACY_DISPENSE.reasons.push(`Table name "${table.name}" matches pharmacy dispensing patterns`);
    }
    if (/lab|test|analyz|result|specimen|investigation|pathology/.test(cleanTable)) {
      scores.LAB_RESULT.score += 45;
      scores.LAB_RESULT.reasons.push(`Table name "${table.name}" matches laboratory test results`);
    }
    if (/visit|encounter|opd|triage|consultation|vitals|appointment/.test(cleanTable)) {
      scores.ENCOUNTER_VISIT.score += 40;
      scores.ENCOUNTER_VISIT.reasons.push(`Table name "${table.name}" matches clinical visits & triage`);
    }
    if (/staff|employee|worker|doctor|nurse|user|clinician/.test(cleanTable)) {
      scores.STAFF.score += 40;
      scores.STAFF.reasons.push(`Table name "${table.name}" matches staff & workforce`);
    }

    // 2. Column field overlap heuristics
    for (const [entity, def] of Object.entries(CANONICAL_MODELS) as [CanonicalEntity, any][]) {
      let matchedCount = 0;
      for (const f of def.fields) {
        const found = colNames.some(c => f.synonyms.some((s: string) => c.includes(s) || s.includes(c)));
        if (found) {
          matchedCount++;
          scores[entity].score += f.required ? 15 : 6;
        }
      }
      if (matchedCount >= 3) {
        scores[entity].reasons.push(`Found ${matchedCount} matching clinical fields in table`);
      }
    }

    // Determine top scorer
    let bestEntity: CanonicalEntity = 'PATIENT';
    let maxScore = -1;
    for (const [entity, s] of Object.entries(scores) as [CanonicalEntity, any][]) {
      if (s.score > maxScore) {
        maxScore = s.score;
        bestEntity = entity;
      }
    }

    const confidence = Math.min(Math.round((maxScore / 100) * 100), 98);
    const reasoning = scores[bestEntity].reasons.join('; ') || 'Heuristic attribute match';

    return { entity: bestEntity, confidence: Math.max(confidence, 35), reasoning };
  }

  /**
   * Automatically generate field-to-field mapping rules for a chosen CanonicalEntity
   */
  public static generateFieldMappings(table: TableSchema, targetEntity: CanonicalEntity): FieldMappingRule[] {
    const entityDef = CANONICAL_MODELS[targetEntity];
    const mappings: FieldMappingRule[] = [];

    const availableCols = table.columns.map(c => ({
      raw: c.name,
      clean: this.cleanName(c.name),
      type: c.dataType.toLowerCase(),
    }));

    for (const f of entityDef.fields) {
      let bestCol: string | undefined = undefined;
      let highestMatch = 0;

      for (const col of availableCols) {
        // Exact synonym match
        for (const s of f.synonyms) {
          if (col.clean === s) {
            highestMatch = 100;
            bestCol = col.raw;
            break;
          } else if (col.clean.endsWith(s) || col.clean.startsWith(s)) {
            if (highestMatch < 80) {
              highestMatch = 80;
              bestCol = col.raw;
            }
          } else if (col.clean.includes(s) && highestMatch < 60) {
            highestMatch = 60;
            bestCol = col.raw;
          }
        }
        if (highestMatch === 100) break;
      }

      mappings.push({
        targetField: f.field,
        sourceColumn: bestCol,
        confidence: bestCol ? highestMatch : 0,
        transformFunction: f.defaultTransform || 'DIRECT',
        notes: bestCol ? `Auto-matched to "${bestCol}" (${highestMatch}% confidence)` : 'Unmapped — manual selection available',
      });
    }

    return mappings;
  }

  /**
   * Generate a comprehensive proposal for a given table
   */
  public static autoMapTable(table: TableSchema, preferredEntity?: CanonicalEntity): TableMappingProposal {
    const proposed = preferredEntity 
      ? { entity: preferredEntity, confidence: 95, reasoning: `Admin specified ${preferredEntity}` }
      : this.proposeEntityForTable(table);

    const fieldMappings = this.generateFieldMappings(table, proposed.entity);

    return {
      sourceTable: table.name,
      targetEntity: proposed.entity,
      confidence: proposed.confidence,
      fieldMappings,
      reasoning: proposed.reasoning,
    };
  }

  /**
   * Transform an incoming row based on configured field mapping rules
   */
  public static transformRow(rawRow: Record<string, any>, rules: FieldMappingRule[]): Record<string, any> {
    const out: Record<string, any> = {};

    for (const r of rules) {
      if (!r.sourceColumn) {
        if (r.defaultValue !== undefined) out[r.targetField] = r.defaultValue;
        continue;
      }

      let val = rawRow[r.sourceColumn];
      if (val === undefined || val === null) {
        out[r.targetField] = r.defaultValue ?? null;
        continue;
      }

      switch (r.transformFunction) {
        case 'LOWERCASE':
          val = String(val).toLowerCase().trim();
          break;
        case 'UPPERCASE':
          val = String(val).toUpperCase().trim();
          break;
        case 'TRIM':
          val = String(val).trim();
          break;
        case 'PARSE_NUMBER':
          const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
          val = isNaN(num) ? 0 : num;
          break;
        case 'PARSE_DATE':
          try {
            val = new Date(val).toISOString();
          } catch (_) {
            val = new Date().toISOString();
          }
          break;
        case 'GENDER_NORMALIZE':
          const g = String(val).toUpperCase().trim();
          if (g.startsWith('M')) val = 'MALE';
          else if (g.startsWith('F')) val = 'FEMALE';
          else val = 'OTHER';
          break;
        case 'DIRECT':
        default:
          break;
      }

      out[r.targetField] = val;
    }

    return out;
  }
}
