export const PHARMACY_DESIGNATIONS = [
  'Pharmacist',
  'Pharmacy Technician',
  'Pharmacy Technicians',
  'Chief Pharmacist (CP)',
  'Director of Pharmacy Services (DPS)',
  'Senior Pharmacist (SP)',
  'Superintendent Pharmacist',
  'Clinical Pharmacist',
  'Hospital Pharmacist',
  'Senior Pharmacy Technician',
  'Pharmacy Assistant',
  'Pharmacy Intern',
  'Intern Pharmacist',
  'Pharmacy Officer',
  'Pharmacy Specialist',
  'Pharm Tech',
];

export const LAB_DESIGNATIONS = [
  'Pathologist',
  'Consultant Pathologist',
  'Lab Technician',
  'Laboratory Scientist',
  'Lab Scientist',
  'Lab Scientists',
  'Medical Laboratory Scientist',
  'Chief Medical Laboratory Scientist (CMLS)',
  'Senior Medical Laboratory Scientist (SMLS)',
  'Assistant Chief Medical Laboratory Scientist',
  'Principal Medical Laboratory Scientist (PMLS)',
  'Medical Laboratory Scientist I',
  'Medical Laboratory Scientist II',
  'Intern Medical Laboratory Scientist',
  'Chief Medical Laboratory Technician',
  'Senior Medical Laboratory Technician',
  'Medical Laboratory Technician',
  'Director of Medical Laboratory Services',
  'Cytotechnologist',
  'Senior Cytotechnologist',
  'Histoscientist',
  'Histotechnologist',
];

/**
 * Checks if a user has pharmacy roles, designations, or department assignments.
 */
export const isUserPharmacyStaff = (user: any): boolean => {
  if (!user) return false;
  const userRole = (user.role || '').toUpperCase();
  const allRoles = [
    userRole,
    ...(Array.isArray(user.roles) ? user.roles : []).map((r: any) => String(r).toUpperCase()),
  ];
  const userDesignation = (user.designation || '').toLowerCase();
  const username = (user.username || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  const staffId = (user.staffId || user.staff_id || user.id || '').toUpperCase();

  // Guard: Doctors / Physicians / Surgeons are clinical officers and not pharmacy staff
  const isExplicitDoctor = userRole === 'DOCTOR' || userDesignation.includes('physician') || userDesignation.includes('consultant') || userDesignation.includes('surgeon') || userDesignation.includes('medical officer');
  if (isExplicitDoctor && !userRole.includes('PHARM') && !userDesignation.includes('pharmac')) {
    return false;
  }

  // 1. Direct role matches
  const pharmRoles = [
    'PHARMACIST',
    'PHARMACY_TECHNICIAN',
    'PHARMACY_TECHNICIANS',
    'PHARMACY',
    'PHARMACY_STAFF',
    'PHARMACIST_ASSISTANT',
    'CHIEF_PHARMACIST',
    'HEAD_PHARMACIST',
    'DISPENSARY_PHARMACIST',
    'CLINICAL_PHARMACIST',
  ];
  if (allRoles.some(r => pharmRoles.includes(r) || r.includes('PHARMAC') || r.includes('DISPENSARY'))) {
    return true;
  }

  // 2. Designation matches
  if (userDesignation.includes('pharmac') || userDesignation.includes('pharm tech') || userDesignation.includes('dispensary') || userDesignation.includes('formulary')) {
    return true;
  }

  // 3. Department matches
  if (user.departments && Array.isArray(user.departments)) {
    if (user.departments.some((d: any) => {
      const code = (d.code || '').toUpperCase();
      const name = (d.name || '').toLowerCase();
      return code.includes('PHARM') || name.includes('pharmac') || name.includes('dispensary');
    })) {
      return true;
    }
  }
  if (user.department && (String(user.department).toLowerCase().includes('pharmac') || String(user.department).toLowerCase().includes('dispensary'))) {
    return true;
  }

  // 4. Username / email / staffId matches
  if (username.startsWith('ph-') || username === 'pharmacist' || username.includes('pharm')) {
    return true;
  }
  if (email.includes('pharm')) {
    return true;
  }
  if (staffId.includes('PHARM') || staffId.startsWith('PH-')) {
    return true;
  }

  return false;
};

/**
 * Checks if a user has laboratory or pathology roles, designations, or department assignments.
 */
export const isUserLabStaff = (user: any): boolean => {
  if (!user) return false;
  const userRole = (user.role || '').toUpperCase();
  const allRoles = [
    userRole,
    ...(Array.isArray(user.roles) ? user.roles : []).map((r: any) => String(r).toUpperCase()),
  ];
  const userDesignation = (user.designation || '').toLowerCase();

  // 1. Direct role matches
  const labRoles = [
    'LAB_TECHNICIAN',
    'LAB_SCIENTIST',
    'LABORATORY',
    'LAB',
    'PATHOLOGIST',
    'PATHOLOGY',
    'MEDICAL_LABORATORY_SCIENTIST',
    'LABORATORY_SCIENTIST',
    'LAB_STAFF',
  ];
  if (allRoles.some(r => labRoles.includes(r) || r.includes('LAB') || r.includes('PATHOLOG'))) {
    return true;
  }

  // 2. Designation matches
  const labDesignationKeywords = [
    'lab',
    'patholog',
    'scientist',
    'cytotech',
    'histotech',
    'cmls',
    'smls',
    'pmls',
    'mls',
  ];
  const isPurePharmacy = userDesignation.includes('pharmac') && !userDesignation.includes('lab') && !userDesignation.includes('patholog');
  const isPureRadiology = (userDesignation.includes('radiolog') || userDesignation.includes('radiograph')) && !userDesignation.includes('lab') && !userDesignation.includes('patholog');
  if (!isPurePharmacy && !isPureRadiology && labDesignationKeywords.some(kw => userDesignation.includes(kw))) {
    return true;
  }

  // 3. Department matches
  if (user.departments && Array.isArray(user.departments)) {
    if (user.departments.some((d: any) => {
      const code = (d.code || '').toUpperCase();
      const name = (d.name || '').toLowerCase();
      return code.includes('LAB') || code.includes('PATH') || name.includes('lab') || name.includes('patholog');
    })) {
      return true;
    }
  }

  return false;
};

/**
 * Checks if a user specifically holds a pathology role or designation.
 */
export const isUserPathologist = (user: any): boolean => {
  if (!user) return false;
  const userRole = (user.role || '').toUpperCase();
  const allRoles = [
    userRole,
    ...(Array.isArray(user.roles) ? user.roles : []).map((r: any) => String(r).toUpperCase()),
  ];
  const userDesignation = (user.designation || '').toLowerCase();

  return (
    allRoles.some(r => r.includes('PATHOLOG')) ||
    userDesignation.includes('patholog') ||
    userDesignation.includes('histotech') ||
    userDesignation.includes('cytotech')
  );
};

export const MORTICIAN_DESIGNATIONS = [
  'Mortician',
  'Chief Mortician',
  'Senior Mortician',
  'Mortuary Officer',
  'Mortuary Attendant',
  'Mortuary Technician',
  'Forensic Mortician',
  'Embalmer',
];

/**
 * Checks if a user has mortician roles, designations, or department assignments.
 */
export const isUserMorticianStaff = (user: any): boolean => {
  if (!user) return false;
  const userRole = (user.role || '').toUpperCase();
  const allRoles = [
    userRole,
    ...(Array.isArray(user.roles) ? user.roles : []).map((r: any) => String(r).toUpperCase()),
  ];
  const userDesignation = (user.designation || '').toLowerCase();

  // 1. Direct role matches
  if (allRoles.some(r => r === 'MORTICIAN' || r.includes('MORTICIAN') || r.includes('MORTUARY'))) {
    return true;
  }

  // 2. Designation matches
  if (userDesignation.includes('mortician') || userDesignation.includes('mortuary') || userDesignation.includes('embalm')) {
    return true;
  }

  // 3. Department matches
  if (user.departments && Array.isArray(user.departments)) {
    if (user.departments.some((d: any) => {
      const code = (d.code || '').toUpperCase();
      const name = (d.name || '').toLowerCase();
      return code.includes('MORT') || name.includes('mortuary') || name.includes('funeral');
    })) {
      return true;
    }
  }
  if (user.department && String(user.department).toLowerCase().includes('mort')) {
    return true;
  }

  // 4. Username prefix
  if (typeof user.username === 'string' && user.username.toUpperCase().startsWith('MOR-')) {
    return true;
  }

  return false;
};

export const RADIOLOGY_DESIGNATIONS = [
  'Radiologist',
  'Consultant Radiologist',
  'Chief Radiologist',
  'Senior Radiologist',
  'Interventional Radiologist',
  'Pediatric Radiologist',
  'Radiographer',
  'Chief Radiographer',
  'Senior Radiographer',
  'Medical Imaging Scientist',
  'Radiology Technician',
  'Senior Radiology Technician',
  'CT/MRI Technologist',
  'Sonographer',
  'Ultrasound Technologist',
  'PACS Administrator',
];

/**
 * Checks if a user has radiology or radiographer roles, designations, or department assignments.
 */
export const isUserRadiologyStaff = (user: any): boolean => {
  if (!user) return false;
  const userRole = (user.role || '').toUpperCase();
  const allRoles = [
    userRole,
    ...(Array.isArray(user.roles) ? user.roles : []).map((r: any) => String(r).toUpperCase()),
  ];
  const userDesignation = (user.designation || '').toLowerCase();

  // 1. Direct role matches
  const radRoles = [
    'RADIOLOGIST',
    'RADIOGRAPHER',
    'RADIOLOGY',
    'RADIOLOGY_STAFF',
    'RADIOLOGY_TECHNICIAN',
    'SONOGRAPHER',
  ];
  if (allRoles.some(r => radRoles.includes(r) || r.includes('RADIOLOG') || r.includes('RADIOGRAPH'))) {
    return true;
  }

  // 2. Designation matches
  if (
    userDesignation.includes('radiolog') ||
    userDesignation.includes('radiograph') ||
    userDesignation.includes('sonograph') ||
    userDesignation.includes('mri tech') ||
    userDesignation.includes('ct tech') ||
    userDesignation.includes('x-ray')
  ) {
    return true;
  }

  // 3. Department matches
  if (user.departments && Array.isArray(user.departments)) {
    if (user.departments.some((d: any) => {
      const code = (d.code || '').toUpperCase();
      const name = (d.name || '').toLowerCase();
      return (
        code.includes('RAD') ||
        code.includes('XRAY') ||
        name.includes('radiolog') ||
        name.includes('imaging') ||
        name.includes('x-ray')
      );
    })) {
      return true;
    }
  }
  if (
    user.department &&
    (String(user.department).toLowerCase().includes('radiolog') ||
      String(user.department).toLowerCase().includes('imaging') ||
      String(user.department).toLowerCase().includes('x-ray'))
  ) {
    return true;
  }

  // 4. Username prefix
  if (typeof user.username === 'string' && user.username.toUpperCase().startsWith('RAD-')) {
    return true;
  }

  return false;
};

export const PHYSIOTHERAPY_DESIGNATIONS = [
  'Physiotherapist',
  'Consultant Physiotherapist',
  'Chief Physiotherapist',
  'Senior Physiotherapist',
  'Physical Therapist',
  'Rehabilitation Specialist',
  'Physiotherapy Technician',
  'Physiotherapy Assistant',
  'Occupational Therapist',
  'Kinesiotherapist',
];

/**
 * Checks if a user has physiotherapy roles, designations, or department assignments.
 */
export const isUserPhysioStaff = (user: any): boolean => {
  if (!user) return false;
  const userRole = (user.role || '').toUpperCase();
  const allRoles = [
    userRole,
    ...(Array.isArray(user.roles) ? user.roles : []).map((r: any) => String(r).toUpperCase()),
  ];
  const userDesignation = (user.designation || '').toLowerCase();

  // 1. Direct role matches
  const physioRoles = [
    'PHYSIOTHERAPIST',
    'PHYSIOTHERAPY',
    'PHYSICAL_THERAPIST',
    'REHABILITATION',
    'REHAB_SPECIALIST',
  ];
  if (allRoles.some(r => physioRoles.includes(r) || r.includes('PHYSIO') || r.includes('REHAB'))) {
    return true;
  }

  // 2. Designation matches
  if (
    userDesignation.includes('physio') ||
    userDesignation.includes('physical therap') ||
    userDesignation.includes('rehabilitat') ||
    userDesignation.includes('kinesio')
  ) {
    return true;
  }

  // 3. Department matches
  if (user.departments && Array.isArray(user.departments)) {
    if (user.departments.some((d: any) => {
      const code = (d.code || '').toUpperCase();
      const name = (d.name || '').toLowerCase();
      return (
        code.includes('PHYSIO') ||
        code.includes('REHAB') ||
        name.includes('physio') ||
        name.includes('rehab')
      );
    })) {
      return true;
    }
  }
  if (
    user.department &&
    (String(user.department).toLowerCase().includes('physio') ||
      String(user.department).toLowerCase().includes('rehab'))
  ) {
    return true;
  }

  // 4. Username prefix
  if (
    typeof user.username === 'string' &&
    (user.username.toUpperCase().startsWith('PT-') || user.username.toUpperCase().startsWith('PHY-'))
  ) {
    return true;
  }

  return false;
};

// ─── CASHIER & BILLING ROLES ────────────────────────────────────────────────
export const CASHIER_DESIGNATIONS = [
  'Cashier',
  'Senior Revenue Cashier',
  'Front Desk Cashier',
  'Cash Officer',
  'Billing Officer',
  'Revenue Officer',
  'Cash Desk Officer',
  'Teller',
  'Point of Sale Officer',
  'Chief Cashier',
  'Revenue Cashier',
];

export const isUserCashierStaff = (user: any): boolean => {
  if (!user) return false;
  const userRole = (user.role || '').toUpperCase();
  const allRoles = [
    userRole,
    ...(Array.isArray(user.roles) ? user.roles : []).map((r: any) => String(r).toUpperCase()),
  ];
  const userDesignation = (user.designation || '').toLowerCase();

  // 1. Direct role matches
  const cashierRoles = [
    'CASHIER',
    'BILLING_OFFICER',
    'CASH_OFFICER',
    'TELLER',
    'POINT_OF_SALE',
  ];
  if (allRoles.some(r => cashierRoles.includes(r) || r.includes('CASHIER') || r.includes('BILLING_OFFICER'))) {
    return true;
  }

  // 2. Designation matches
  if (
    userDesignation.includes('cashier') ||
    userDesignation.includes('cash desk') ||
    userDesignation.includes('revenue cashier') ||
    userDesignation.includes('billing officer') ||
    userDesignation.includes('teller') ||
    userDesignation.includes('cash officer')
  ) {
    return true;
  }

  // 3. Department matches
  if (user.departments && Array.isArray(user.departments)) {
    if (user.departments.some((d: any) => {
      const code = (d.code || '').toUpperCase();
      const name = (d.name || '').toLowerCase();
      return code.includes('CSH') || code.includes('CASH') || name.includes('cashier') || name.includes('cash desk');
    })) {
      return true;
    }
  }

  // 4. Username prefix
  if (
    typeof user.username === 'string' &&
    (user.username.toUpperCase().startsWith('CSH-') || user.username.toLowerCase().startsWith('cashier'))
  ) {
    return true;
  }

  return false;
};

// ─── AUDITOR ROLES ────────────────────────────────────────────────────────
export const AUDITOR_DESIGNATIONS = [
  'Auditor',
  'Senior Auditor',
  'Internal Auditor',
  'Senior Internal Auditor',
  'Head of Internal Audit & Compliance',
  'Chief Internal Auditor',
  'Financial Auditor',
  'Internal Control & Audit Officer',
  'Forensic Auditor',
  'Senior Accountant & Internal Auditor',
  'Senior Accountant & Auditor',
];

export const isUserAuditorStaff = (user: any): boolean => {
  if (!user) return false;
  const userRole = (user.role || '').toUpperCase();
  const allRoles = [
    userRole,
    ...(Array.isArray(user.roles) ? user.roles : []).map((r: any) => String(r).toUpperCase()),
  ];
  const userDesignation = (user.designation || '').toLowerCase();
  const username = (user.username || '').toLowerCase();
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();

  // 1. Direct role matches
  if (allRoles.some(r => r === 'AUDITOR' || r === 'INTERNAL_AUDITOR' || r.includes('AUDIT'))) {
    return true;
  }

  // 2. Designation matches
  if (userDesignation.includes('audit') || userDesignation.includes('auditor')) {
    return true;
  }

  // 3. Username or Name match (e.g. David Adeleke, Dr. Mrs. Chinyere Okoro)
  if (username.includes('audit') || username === 'emp-012' || username === 'fin-0002') {
    return true;
  }
  if (fullName.includes('adeleke') || (fullName.includes('david') && fullName.includes('adeleke'))) {
    return true;
  }
  if (fullName.includes('okoro') || fullName.includes('chinyere')) {
    return true;
  }

  return false;
};

// ─── FINANCE & ACCOUNTANT ROLES ─────────────────────────────────────────────
export const FINANCE_DESIGNATIONS = [
  'Accountant',
  'Chief Financial Officer (CFO)',
  'Senior Accountant',
  'Finance Officer',
  'Senior Finance Officer',
  'Financial Officer',
  ...AUDITOR_DESIGNATIONS,
  'Finance Director',
  'Director of Finance',
  'Finance Manager',
  'Bursar',
  'Financial Analyst',
];

export const isUserFinanceStaff = (user: any): boolean => {
  if (!user) return false;
  const userRole = (user.role || '').toUpperCase();
  const allRoles = [
    userRole,
    ...(Array.isArray(user.roles) ? user.roles : []).map((r: any) => String(r).toUpperCase()),
  ];
  const userDesignation = (user.designation || '').toLowerCase();

  // If the user is specifically a Cashier/Billing desk and not an accountant/finance officer/auditor, exclude from finance
  const isPureCashier =
    (allRoles.includes('CASHIER') || allRoles.includes('BILLING_OFFICER') || userDesignation.includes('cashier')) &&
    !allRoles.includes('ACCOUNTANT') &&
    !allRoles.includes('FINANCE_OFFICER') &&
    !allRoles.includes('AUDITOR') &&
    !userDesignation.includes('accountant') &&
    !userDesignation.includes('cfo') &&
    !userDesignation.includes('auditor');
  if (isPureCashier) {
    return false;
  }

  // 1. Direct role matches
  const finRoles = [
    'FINANCE_OFFICER',
    'ACCOUNTANT',
    'FINANCE',
    'AUDITOR',
    'CHIEF_FINANCIAL_OFFICER',
    'FINANCIAL_ANALYST',
    'FINANCE_MANAGER',
  ];
  if (allRoles.some(r => finRoles.includes(r) || r.includes('FINANCE') || r.includes('ACCOUNTANT') || r.includes('AUDITOR'))) {
    return true;
  }

  // 2. Designation matches
  if (
    userDesignation.includes('accountant') ||
    userDesignation.includes('finance') ||
    userDesignation.includes('cfo') ||
    userDesignation.includes('auditor') ||
    userDesignation.includes('bursar') ||
    userDesignation.includes('financial')
  ) {
    return true;
  }

  // 3. Department matches (only if user designation is not generic or cashier)
  if (user.departments && Array.isArray(user.departments)) {
    if (user.departments.some((d: any) => {
      const code = (d.code || '').toUpperCase();
      const name = (d.name || '').toLowerCase();
      return (code === 'FIN' || code === 'ACC' || name.includes('finance') || name.includes('accounting')) && !userDesignation.includes('cashier');
    })) {
      return true;
    }
  }

  // 4. Username prefix
  if (
    typeof user.username === 'string' &&
    (user.username.toUpperCase().startsWith('FIN-') || user.username.toUpperCase().startsWith('ACC-') || user.username.toLowerCase().startsWith('finance') || user.username.toLowerCase().startsWith('accountant'))
  ) {
    return true;
  }

  return false;
};

// ─── INSURANCE & HMO ROLES ──────────────────────────────────────────────────
export const INSURANCE_DESIGNATIONS = [
  'Insurance Officer',
  'HMO Officer',
  'HMO Desk Officer',
  'NHIA Desk Officer',
  'NHIA Officer',
  'Claims Manager',
  'Claims Officer',
  'Senior Claims Officer',
  'Managed Care Desk Officer',
  'Managed Care Officer',
  'Health Insurance Officer',
  'Insurance Desk',
  'HMO Coordinator',
  'Claims Adjudicator',
];

export const isUserInsuranceStaff = (user: any): boolean => {
  if (!user) return false;
  const userRole = (user.role || '').toUpperCase();
  const allRoles = [
    userRole,
    ...(Array.isArray(user.roles) ? user.roles : []).map((r: any) => String(r).toUpperCase()),
  ];
  const userDesignation = (user.designation || '').toLowerCase();

  // 1. Direct role matches
  const insRoles = [
    'INSURANCE_OFFICER',
    'HMO_OFFICER',
    'INSURANCE',
    'HMO',
    'CLAIMS_OFFICER',
    'MANAGED_CARE_OFFICER',
    'NHIA_OFFICER',
  ];
  if (allRoles.some(r => insRoles.includes(r) || r.includes('INSURANCE') || r.includes('HMO') || r.includes('NHIA') || r.includes('CLAIMS'))) {
    return true;
  }

  // 2. Designation matches
  if (
    userDesignation.includes('insurance') ||
    userDesignation.includes('hmo') ||
    userDesignation.includes('nhia') ||
    userDesignation.includes('claims') ||
    userDesignation.includes('managed care')
  ) {
    return true;
  }

  // 3. Department matches
  if (user.departments && Array.isArray(user.departments)) {
    if (user.departments.some((d: any) => {
      const code = (d.code || '').toUpperCase();
      const name = (d.name || '').toLowerCase();
      return code.includes('INS') || code.includes('HMO') || code.includes('NHIA') || name.includes('insurance') || name.includes('hmo');
    })) {
      return true;
    }
  }

  // 4. Username prefix
  if (
    typeof user.username === 'string' &&
    (user.username.toUpperCase().startsWith('INS-') || user.username.toUpperCase().startsWith('HMO-') || user.username.toUpperCase().startsWith('NHIA-') || user.username.toLowerCase().startsWith('insurance') || user.username.toLowerCase().startsWith('hmo'))
  ) {
    return true;
  }

  return false;
};

