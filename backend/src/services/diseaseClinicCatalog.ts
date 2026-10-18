import { prisma } from '../prisma.js';

export interface ProgramDef {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  standards: string;
  categories: string[];
  formCodes?: string[];
}

export const JUNK_FORM_CODES = [
  'TEST', 'SAMPLE_NIGERIAL_HTML_FORM', 'ENCOUNTER_FORM',
  'TRANSFER_WITHIN_HOSPITAL_SIMPLE', 'DISCHARGE_SIMPLE',
];

export const PROGRAMS: ProgramDef[] = [
  { id: 'hiv-art', title: 'HIV / ART Clinic', subtitle: 'NMRS care, treatment, PMTCT-linked services', color: '#e11d48',
    standards: 'NMRS · NACA · PEPFAR MER',
    categories: ['HIV_PROGRAM', 'HTS_TESTING', 'CARE_SUPPORT', 'PREP_PEP', 'PHARMACY', 'LAB'] },
  { id: 'tb-dots', title: 'TB / DOTS Clinic', subtitle: 'NTBLCP registers, treatment cards & TPT', color: '#d97706',
    standards: 'NTBLCP · e-TB Manager · WHO DOTS', categories: ['TB_PROGRAM'] },
  { id: 'malaria', title: 'Malaria Clinic', subtitle: 'NMEP case management & malaria in pregnancy', color: '#059669',
    standards: 'NMEP · NHMIS', categories: ['MALARIA_PROGRAM'] },
  { id: 'immunization', title: 'Immunization (EPI)', subtitle: 'NPHCDA routine immunization & AEFI', color: '#2563eb',
    standards: 'NPHCDA · Routine Immunization Card', categories: ['IMMUNIZATION_EPI'] },
  { id: 'polio-afp', title: 'Polio / AFP Surveillance', subtitle: 'AFP case investigation & stool specimens', color: '#7c3aed',
    standards: 'NPHCDA · GPEI · IDSR', categories: ['POLIO_AFP'] },
  { id: 'mch', title: 'Maternal & Child Health', subtitle: 'ANC, delivery, postnatal, PMTCT & IMCI', color: '#db2777',
    standards: 'NHMIS · FMoH MNCH · NMRS PMTCT', categories: ['PMTCT_ANC', 'MCH_CHILD_HEALTH'] },
];

export const NEW_CATEGORIES = ['MALARIA_PROGRAM', 'IMMUNIZATION_EPI', 'POLIO_AFP', 'MCH_CHILD_HEALTH'];

export function programById(id: string) {
  return PROGRAMS.find((p) => p.id === id);
}

/** Display group for a form card */
export function groupForm(category: string, code: string, name: string): string {
  const n = `${code} ${name}`.toUpperCase();
  switch (category) {
    case 'HIV_PROGRAM':
      if (/EAC|TRACK|TERMIN|OTZ|ADHERENCE/.test(n)) return 'Adherence & Tracking';
      if (/INTAKE|ENROLL|REGISTER/.test(n)) return 'Registration & Registers';
      return 'Care & Treatment';
    case 'HTS_TESTING': return 'HIV Testing Services';
    case 'CARE_SUPPORT': return 'Adherence & Tracking';
    case 'PREP_PEP': return 'PrEP / PEP';
    case 'PHARMACY': return 'Pharmacy';
    case 'LAB': return 'Laboratory';
    case 'TB_PROGRAM':
      if (/SCREEN|PRESUMPTIVE/.test(n)) return 'TB Screening';
      if (/CONTACT|IPT|PREVENTIVE|TPT/.test(n)) return 'Contacts & TPT';
      if (/REFERRAL|TRANSFER|CENTRAL/.test(n)) return 'Referral & Registers';
      if (/LAB/.test(n)) return 'Laboratory';
      return 'TB Treatment';
    case 'PMTCT_ANC': return 'PMTCT & Antenatal';
    case 'MALARIA_PROGRAM': return 'Malaria Case Management';
    case 'IMMUNIZATION_EPI': return 'Routine Immunization';
    case 'POLIO_AFP': return 'AFP Surveillance';
    case 'MCH_CHILD_HEALTH': return 'Maternal & Child Health';
    default: return 'Other';
  }
}

// ---------- compact schema builders ----------
export const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const base = (label: string, rendering: string, extra: any = {}, req = false) => ({
  id: slug(label),
  type: 'obs', label, required: req, isRequired: req,
  questionOptions: { rendering, concept: label.toUpperCase().replace(/[^A-Z0-9]+/g, '_'), ...extra },
});
const opts = (...a: string[]) => a.map((l) => ({ label: l, concept: l.toUpperCase().replace(/[^A-Z0-9]+/g, '_') }));
const yn = (l: string, req = false) => base(l, 'radio', { answers: opts('Yes', 'No') }, req);
const sel = (l: string, a: string[], req = false) => base(l, 'select', { answers: opts(...a) }, req);
const radio = (l: string, a: string[], req = false) => base(l, 'radio', { answers: opts(...a) }, req);
const multi = (l: string, a: string[]) => base(l, 'multiCheckbox', { answers: opts(...a) });
const date = (l: string, req = false) => base(l, 'date', {}, req);
const num = (l: string, min?: number, max?: number, req = false) => base(l, 'number', { min, max }, req);
const txt = (l: string, req = false) => base(l, 'text', {}, req);
const area = (l: string) => base(l, 'textarea');
const sec = (title: string, questions: any[]) => ({ id: `s_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, label: title, title, questions });

function schema(formCode: string, formName: string, category: string, description: string, sections: any[]) {
  return {
    formCode, formName, category, description, version: '1.0',
    schemaJson: { formCode, formName, category, version: '1.0', pages: [{ label: formName, sections }], sections },
  };
}

const SIDES = ['Left upper arm', 'Right upper arm', 'Left thigh', 'Right thigh', 'Oral', 'Intradermal left arm'];
const vacc = (ant: string) => [
  date(`${ant} - date given`), txt(`${ant} - batch/lot no.`),
  radio(`${ant} - VVM stage`, ['Stage 1 (usable)', 'Stage 2 (usable)', 'Stage 3 (discard)', 'Stage 4 (discard)']),
];

const ANTIGENS = ['BCG', 'OPV0', 'HepB0', 'Penta1', 'PCV1', 'OPV1', 'Rota1', 'IPV1', 'Penta2', 'PCV2', 'OPV2', 'Rota2', 'IPV2',
  'Penta3', 'PCV3', 'OPV3', 'Rota3', 'Vitamin A (6 mo)', 'Measles/MR1', 'Yellow Fever', 'MenA', 'Vitamin A (12 mo)', 'MR2'];

export const NEW_SCHEMAS = [
  schema('NG_MALARIA_OPD_CASE_REGISTER', 'Malaria OPD Case Register (NMEP)', 'MALARIA_PROGRAM',
    'NMEP outpatient malaria case management register aligned with NHMIS', [
      sec('Presentation', [date('Visit date', true), multi('Presenting complaints', ['Fever', 'Chills', 'Headache', 'Vomiting', 'Body pain', 'Convulsion']),
        num('Temperature (C)', 30, 45), radio('Pregnancy status', ['Not pregnant', 'Pregnant', 'Not applicable'])]),
      sec('Diagnosis', [radio('mRDT result', ['Positive', 'Negative', 'Invalid', 'Not done'], true),
        radio('Microscopy result', ['Positive', 'Negative', 'Not done']), radio('Classification', ['Uncomplicated malaria', 'Severe malaria', 'Not malaria'], true)]),
      sec('Treatment', [sel('ACT given', ['Artemether-Lumefantrine', 'Artesunate-Amodiaquine', 'DHA-Piperaquine', 'Artesunate-Pyronaridine', 'None']),
        txt('Dose / quantity'), txt('Non-ACT drugs given'), radio('Pre-referral Artesunate given', ['Yes', 'No']),
        radio('Outcome', ['Cured', 'Referred', 'Admitted', 'Died', 'Lost to follow-up']), area('Remarks')]),
    ]),
  schema('NG_SEVERE_MALARIA_ADMISSION', 'Severe Malaria Admission Form', 'MALARIA_PROGRAM',
    'Inpatient severe malaria management', [
      sec('Admission', [date('Admission date', true), multi('Danger signs', ['Severe anaemia', 'Prostration', 'Convulsions', 'Jaundice', 'Impaired consciousness', 'Respiratory distress']),
        num('Parasite density (/uL)', 0), num('Haemoglobin (g/dL)', 0, 25)]),
      sec('Management', [sel('Parenteral antimalarial', ['IV Artesunate', 'IM Artesunate', 'IV Quinine', 'IM Artemether']),
        yn('Blood transfusion given'), yn('Completed oral ACT after parenteral'), radio('Discharge outcome', ['Recovered', 'Referred', 'Died', 'Left against advice']), date('Discharge date')]),
    ]),
  schema('NG_MALARIA_IN_PREGNANCY_IPTP', 'Malaria in Pregnancy - IPTp-SP & ITN', 'MALARIA_PROGRAM',
    'IPTp-SP dosing and ITN distribution during ANC', [
      sec('IPTp', [date('Visit date', true), num('Gestational age (weeks)', 4, 45, true),
        radio('IPTp-SP dose number', ['Dose 1', 'Dose 2', 'Dose 3', 'Dose 4+'], true), yn('Given as directly observed therapy'),
        yn('ITN issued'), radio('Fever test result', ['Positive', 'Negative', 'Not done']), area('Treatment / notes')]),
    ]),
  schema('NG_EPI_VACCINATION_SESSION', 'Routine Immunization Card (NPHCDA)', 'IMMUNIZATION_EPI',
    'Per-visit child immunization record per NPHCDA RI card', [
      sec('Child details', [date('Date registered', true), txt('Immunization serial no.'), txt("Mother's / caregiver name", true), txt('Caregiver phone')]),
      sec('Vaccines given this visit', [multi('Antigens administered', ANTIGENS), ...ANTIGENS.slice(0, 0),
        sel('Injection / route site', SIDES), txt('Batch / lot no.'),
        radio('VVM stage', ['Stage 1 (usable)', 'Stage 2 (usable)', 'Stage 3 (discard)', 'Stage 4 (discard)']),
        date('Next appointment date'), radio('Child age group', ['Birth', '6 weeks', '10 weeks', '14 weeks', '6 months', '9 months', '12 months', '15 months', 'Catch-up'])]),
    ]),
  schema('NG_EPI_CHILD_GROWTH_CARD', 'Child Health & Growth Card', 'IMMUNIZATION_EPI', 'Weight, MUAC and supplementation', [
    sec('Growth', [date('Visit date', true), num('Weight (kg)', 0, 30), num('Length / height (cm)', 20, 130), num('MUAC (mm)', 50, 250),
      radio('Nutritional status', ['Normal', 'Moderate acute malnutrition', 'Severe acute malnutrition']),
      yn('Vitamin A given'), yn('Deworming given'), radio('Feeding', ['Exclusive breastfeeding', 'Mixed', 'Complementary', 'Other'])]),
  ]),
  schema('NG_EPI_AEFI_REPORT', 'AEFI Case Report Form', 'IMMUNIZATION_EPI', 'Adverse event following immunization', [
    sec('Event', [date('Date of vaccination', true), date('Date of onset', true), txt('Vaccine suspected', true), txt('Batch / lot no.'),
      multi('Reaction', ['Fever', 'Injection-site abscess', 'Severe local reaction', 'Convulsion', 'Anaphylaxis', 'Other']),
      radio('Seriousness', ['Non-serious', 'Serious - hospitalised', 'Serious - death'], true), radio('Outcome', ['Recovered', 'Recovering', 'Not recovered', 'Died']), area('Description')]),
  ]),
  schema('NG_EPI_DEFAULTER_TRACING', 'Immunization Defaulter Tracing', 'IMMUNIZATION_EPI', 'Defaulter follow-up log', [
    sec('Tracing', [date('Date traced', true), txt('Antigen(s) missed', true), radio('Method', ['Phone', 'Home visit', 'Community volunteer']),
      radio('Reason for default', ['Child sick', 'Caregiver away', 'Vaccine stock-out', 'Fear of side effects', 'Unaware of schedule', 'Other']),
      date('Rescheduled date'), radio('Outcome', ['Returned', 'Not found', 'Migrated', 'Refused'])]),
  ]),
  schema('NG_AFP_CASE_INVESTIGATION', 'AFP Case Investigation Form (CIF)', 'POLIO_AFP', 'Acute flaccid paralysis case investigation', [
    sec('Onset', [date('Date of onset of paralysis', true), yn('Fever at onset', true), num('Days from onset to maximum paralysis', 0, 60),
      yn('Asymmetric paralysis'), multi('Affected limbs', ['Left arm', 'Right arm', 'Left leg', 'Right leg'])]),
    sec('Vaccination history', [num('OPV doses - routine (RI)', 0, 20), num('OPV doses - campaigns (SIA)', 0, 40),
      radio('Source of vaccination history', ['Card', 'Recall', 'Unknown'])]),
    sec('Notification', [date('Date notified'), date('Date investigated'), txt('Reporting health facility'), area('Remarks')]),
  ]),
  schema('NG_AFP_STOOL_SPECIMEN_LAB', 'AFP Stool Specimen & Lab Result', 'POLIO_AFP', 'Stool collection and virology', [
    sec('Specimens', [date('Stool 1 collection date', true), date('Stool 2 collection date', true), radio('Specimen condition on arrival', ['Adequate', 'Inadequate', 'Leaked/Dry']),
      yn('Adequate stool (2 specimens, 24-48h apart, within 14 days)'), date('Date received at lab')]),
    sec('Lab result', [radio('Poliovirus isolation', ['Negative', 'Wild poliovirus', 'VDPV', 'Sabin-like']), radio('NPEV isolation', ['Positive', 'Negative']), date('Result date')]),
  ]),
  schema('NG_AFP_60_DAY_FOLLOWUP', 'AFP 60-Day Follow-up Exam', 'POLIO_AFP', 'Residual paralysis assessment', [
    sec('Follow-up', [date('Exam date', true), yn('Residual paralysis present', true),
      radio('Final classification', ['Confirmed polio', 'Compatible', 'Discarded - non-polio', 'Pending']), area('Clinical findings')]),
  ]),
  schema('NG_MCH_ANC_VISIT_REGISTER', 'ANC Booking & Visit Register (NHMIS)', 'MCH_CHILD_HEALTH', 'Antenatal booking and follow-up visits', [
    sec('Booking', [date('Visit date', true), txt('ANC registration no.'), num('Age (years)', 10, 55), num('Gestational age (weeks)', 4, 45, true),
      num('Gravida', 0, 20), num('Parity', 0, 20), radio('Visit type', ['First booking', 'Follow-up'], true)]),
    sec('Services', [num('Systolic BP', 50, 260), num('Diastolic BP', 30, 160), yn('IFA given'), radio('TT dose', ['TT1', 'TT2', 'TT3', 'TT4', 'TT5', 'Not given']),
      radio('HIV test', ['Positive', 'Negative', 'Previously known positive', 'Not done']), radio('Syphilis test', ['Positive', 'Negative', 'Not done']),
      yn('ITN issued'), area('Danger signs / notes')]),
  ]),
  schema('NG_MCH_LABOUR_DELIVERY_REGISTER', 'Labour & Delivery Register', 'MCH_CHILD_HEALTH', 'Delivery outcomes', [
    sec('Delivery', [date('Date of delivery', true), radio('Mode of delivery', ['SVD', 'Assisted', 'Caesarean section'], true), radio('Skilled attendant', ['Doctor', 'Nurse/Midwife', 'CHEW', 'TBA']),
      yn('Active management of third stage (AMTSL)'), radio('Outcome', ['Live birth', 'Fresh stillbirth', 'Macerated stillbirth']),
      num('Birth weight (g)', 300, 6500), radio('Newborn sex', ['Male', 'Female']), yn('Breastfed within 1 hour'), radio('Maternal outcome', ['Alive', 'Died']), area('Complications')]),
  ]),
  schema('NG_MCH_POSTNATAL_REGISTER', 'Postnatal Care Register', 'MCH_CHILD_HEALTH', 'Postnatal visits', [
    sec('Postnatal', [date('Visit date', true), radio('Visit timing', ['Within 24h', 'Day 3', 'Day 7-14', 'Week 6'], true),
      yn('Family planning counselling given'), sel('FP method accepted', ['None', 'Pills', 'Injectable', 'Implant', 'IUD', 'Condom', 'LAM']), yn('Newborn danger signs'), area('Notes')]),
  ]),
  schema('NG_MCH_IMCI_SICK_CHILD', 'IMCI Sick Child Assessment', 'MCH_CHILD_HEALTH', 'Integrated management of childhood illness', [
    sec('Assessment', [date('Visit date', true), num('Age (months)', 0, 60), multi('General danger signs', ['Unable to drink', 'Vomits everything', 'Convulsions', 'Lethargic']),
      multi('Main symptoms', ['Cough/difficult breathing', 'Diarrhoea', 'Fever', 'Ear problem']),
      radio('Classification', ['Pink - urgent referral', 'Yellow - treat', 'Green - home care'], true), txt('Treatment given'), radio('Disposition', ['Home care', 'Admitted', 'Referred'])]),
  ]),
];

let seeded = false;
export async function ensureDiseaseClinicSchemas() {
  if (seeded) return;
  for (const s of NEW_SCHEMAS) {
    const existing = await prisma.nmrsFormSchema.findUnique({ where: { formCode: s.formCode } });
    const data: any = { formName: s.formName, description: s.description, category: s.category, version: s.version, schemaJson: s.schemaJson as any, isActive: true };
    if (!existing) await prisma.nmrsFormSchema.create({ data: { formCode: s.formCode, ...data } });
    else if (existing.version !== s.version) await prisma.nmrsFormSchema.update({ where: { id: existing.id }, data });
  }
  seeded = true;
}
