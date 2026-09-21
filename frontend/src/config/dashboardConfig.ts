/**
 * Role-based dashboard widget configuration.
 *
 * Each role maps to an ordered list of widget IDs. The Dashboard component
 * conditionally renders sections based on the logged-in user's primary role.
 *
 * Widget IDs correspond to sections rendered inside Dashboard.tsx.
 */

export type WidgetId =
  | 'stats'                 // Top stat cards: patients, appointments, IPD, revenue
  | 'quickStats'            // Today's Summary strip
  | 'trendGraph'            // Admissions Trend (OPD vs IPD) line graph
  | 'bedOccupancy'          // Ward bed occupancy bars
  | 'recentActivity'        // Recent activity feed
  | 'revenue'               // Revenue overview widget
  | 'myAppointments'        // Doctor: upcoming appointments for current user
  | 'myPatients'            // Doctor: assigned patients / active encounters
  | 'pendingLabs'           // Doctor / Lab: lab results awaiting review
  | 'criticalVitals'        // Doctor / Nurse: abnormal vitals alerts
  | 'wardVitals'            // Nurse: pending vitals recording for assigned wards
  | 'medicationAdmin'       // Nurse: medication administration schedule
  | 'pendingPrescriptions'   // Pharmacist: prescriptions awaiting dispensing
  | 'lowStock'              // Pharmacist: inventory items below reorder level
  | 'todayAppointments'     // Receptionist: appointment queue for today
  | 'newRegistrations'      // Receptionist: recently registered patients
  | 'queueStatus'           // Receptionist: OPD queue status
  | 'staffOnDuty';          // Admin: staff attendance / on-duty overview

export interface DashboardRoleConfig {
  label: string;
  widgets: WidgetId[];
  quickActions: {
    label: string;
    icon?: string;
    route?: string;
    action?: string;
  }[];
}

/**
 * Default widget sets per role.
 */
export const DASHBOARD_WIDGETS: Record<string, DashboardRoleConfig> = {
  SUPER_ADMIN: {
    label: 'Super Administrator',
    widgets: ['stats', 'quickStats', 'trendGraph', 'bedOccupancy', 'recentActivity', 'revenue', 'staffOnDuty'],
    quickActions: [
      { label: 'User Management', route: '/users' },
      { label: 'Role Management', route: '/roles' },
      { label: 'Audit Logs', route: '/audit-logs' },
      { label: 'System Settings', route: '/settings' },
    ],
  },
  ADMIN: {
    label: 'Hospital Administrator',
    widgets: ['stats', 'quickStats', 'trendGraph', 'bedOccupancy', 'recentActivity', 'revenue', 'staffOnDuty'],
    quickActions: [
      { label: 'Staff Management', route: '/staff' },
      { label: 'Workforce & Roster', route: '/timesheets' },
      { label: 'Attendance & Clock Logs', route: '/staff/attendance-roster/clock-logs' },
      { label: 'Reports & Analytics', route: '/reports' },
    ],
  },
  DOCTOR: {
    label: 'Doctor',
    widgets: ['myAppointments', 'myPatients', 'pendingLabs', 'criticalVitals'],
    quickActions: [
      { label: 'Start Consultation', route: '/emr-workspace' },
      { label: 'Request Lab Test', route: '/lims' },
      { label: 'Write Prescription', route: '/pharmacy' },
      { label: 'My Patients', route: '/patients' },
    ],
  },
  NURSE: {
    label: 'Nurse',
    widgets: ['wardVitals', 'medicationAdmin', 'bedOccupancy', 'recentActivity'],
    quickActions: [
      { label: 'Record Vitals', route: '/nursing' },
      { label: 'Medication Admin', route: '/nursing' },
      { label: 'View Patients', route: '/patients' },
    ],
  },
  PHARMACIST: {
    label: 'Pharmacist',
    widgets: ['pendingPrescriptions', 'lowStock', 'recentActivity'],
    quickActions: [
      { label: 'Dispense Prescriptions', route: '/pharmacy/queue' },
      { label: 'Medication Catalog', route: '/pharmacy/catalog' },
      { label: 'Pharmacy Inventory', route: '/inventory' },
    ],
  },
  PHARMACY_TECHNICIAN: {
    label: 'Pharmacy Technician',
    widgets: ['pendingPrescriptions', 'lowStock', 'recentActivity'],
    quickActions: [
      { label: 'Dispense Prescriptions', route: '/pharmacy/queue' },
      { label: 'Medication Catalog', route: '/pharmacy/catalog' },
      { label: 'Pharmacy Inventory', route: '/inventory' },
    ],
  },
  PHARMACY_TECHNICIANS: {
    label: 'Pharmacy Technician',
    widgets: ['pendingPrescriptions', 'lowStock', 'recentActivity'],
    quickActions: [
      { label: 'Dispense Prescriptions', route: '/pharmacy/queue' },
      { label: 'Medication Catalog', route: '/pharmacy/catalog' },
      { label: 'Pharmacy Inventory', route: '/inventory' },
    ],
  },
  RECEPTIONIST: {
    label: 'Receptionist',
    widgets: ['todayAppointments', 'newRegistrations', 'queueStatus', 'recentActivity'],
    quickActions: [
      { label: 'Register Patient', route: '/register-patient' },
      { label: 'Book Appointment', route: '/appointments' },
      { label: 'Queue Board', route: '/queues' },
    ],
  },
  LAB_TECHNICIAN: {
    label: 'Lab Technician',
    widgets: ['pendingLabs', 'recentActivity', 'stats'],
    quickActions: [
      { label: 'LIMS Lab Workstation', route: '/lims' },
      { label: 'Lab Orders Queue', route: '/lims/orders' },
      { label: 'Pathology Console', route: '/pathology' },
      { label: 'Histology Orders', route: '/pathology/histology' },
      { label: 'Cytology Workspace', route: '/pathology/cytology' },
      // { label: 'Diagnostic Hub', route: '/radiology/hub' },
    ],
  },
  LAB_SCIENTIST: {
    label: 'Medical Laboratory Scientist',
    widgets: ['pendingLabs', 'recentActivity', 'stats'],
    quickActions: [
      { label: 'LIMS Lab Workstation', route: '/lims' },
      { label: 'Lab Orders Queue', route: '/lims/orders' },
      { label: 'Pathology Console', route: '/pathology' },
      { label: 'Histology Orders', route: '/pathology/histology' },
      { label: 'Cytology Workspace', route: '/pathology/cytology' },
      // { label: 'Diagnostic Hub', route: '/radiology/hub' },
    ],
  },
  PATHOLOGIST: {
    label: 'Pathologist',
    widgets: ['pendingLabs', 'recentActivity', 'stats'],
    quickActions: [
      { label: 'Pathology Console', route: '/pathology' },
      { label: 'Histology Orders', route: '/pathology/histology' },
      { label: 'Cytology Workspace', route: '/pathology/cytology' },
      { label: 'Microscopic Reporting', route: '/pathology/reporting' },
      { label: 'LIMS Lab Workstation', route: '/lims' },
      // { label: 'Diagnostic Hub', route: '/radiology/hub' },
    ],
  },
  LABORATORY: {
    label: 'Laboratory',
    widgets: ['pendingLabs', 'recentActivity', 'stats'],
    quickActions: [
      { label: 'LIMS Lab Workstation', route: '/lims' },
      { label: 'Lab Orders Queue', route: '/lims/orders' },
      { label: 'Pathology Console', route: '/pathology' },
      // { label: 'Diagnostic Hub', route: '/radiology/hub' },
    ],
  },
  RADIOLOGIST: {
    label: 'Radiologist & Radiography',
    widgets: ['stats', 'recentActivity'],
    quickActions: [
      { label: 'RIS Order Queue', route: '/radiology/orders' },
      { label: 'PACS & DICOM Viewer', route: '/radiology/pacs' },
      { label: 'Ultrasound Scan Suite', route: '/radiology/ultrasound' },
      { label: 'Digital X-Ray Suite', route: '/radiology/xray' },
      // { label: 'Unified Diagnostic Hub', route: '/radiology/hub' },
      { label: 'Modality QA & Safety', route: '/radiology/qa' },
      { label: 'Radiation Dosimetry & BI', route: '/radiology/analytics' },
    ],
  },
  PATIENT: {
    label: 'Patient',
    widgets: ['myAppointments', 'recentActivity'],
    quickActions: [
      { label: 'Book Appointment', route: '/appointments' },
      { label: 'View Medical Records', route: '/patients' },
    ],
  },
  MORTICIAN: {
    label: 'Mortician',
    widgets: ['recentActivity'],
    quickActions: [
      { label: 'Ingestion Intake', route: '/mortuary/ingestion' },
      { label: 'Cold Vault Beds', route: '/mortuary/vaults' },
      { label: 'Autopsy & Pathology', route: '/mortuary/autopsy' },
      { label: 'Release & Billing', route: '/mortuary/release' },
    ],
  },
  PHYSIOTHERAPIST: {
    label: 'Physiotherapy & Rehab',
    widgets: ['recentActivity'],
    quickActions: [
      { label: 'Rehabilitation Analysis', route: '/rehabilitation/mirror' },
      { label: 'E-Referrals & Intake', route: '/rehabilitation/referrals' },
      { label: 'Therapy Schedule', route: '/rehabilitation/schedule' },
      { label: 'Session Logger', route: '/rehabilitation/sessions' },
      { label: 'Care Plans', route: '/rehabilitation/plans' },
      { label: 'Progress & ROM', route: '/rehabilitation/progress' },
      { label: 'Equipment Registry', route: '/rehabilitation/equipment' },
    ],
  },
  FINANCE_OFFICER: {
    label: 'Finance & Treasury',
    widgets: ['revenue', 'stats', 'quickStats', 'recentActivity'],
    quickActions: [
      { label: 'Issue Invoice', route: '/billing' },
      { label: 'Cashier Collections', route: '/billing' },
      { label: 'Patient Wallets', route: '/billing/wallets/ledger' },
      { label: 'HMO Receivables', route: '/billing' },
      { label: 'Financial BI', route: '/billing/billing/kpis' },
      { label: 'General Ledger', route: '/finance' },
    ],
  },
  ACCOUNTANT: {
    label: 'Accountant',
    widgets: ['revenue', 'stats', 'quickStats', 'recentActivity'],
    quickActions: [
      { label: 'Issue Invoice', route: '/billing' },
      { label: 'Cashier Collections', route: '/billing' },
      { label: 'Patient Wallets', route: '/billing/wallets/ledger' },
      { label: 'HMO Receivables', route: '/billing' },
      { label: 'Financial BI', route: '/billing/billing/kpis' },
      { label: 'General Ledger', route: '/finance' },
    ],
  },
  STAFF: {
    label: 'Staff',
    widgets: ['recentActivity'],
    quickActions: [
      { label: 'View Duty Roster', route: '/staff/roster' },
    ],
  },
};

export function getDashboardConfigForUser(user: { roles?: string[]; role?: string; designation?: string; departments?: { id: string; name: string; code: string }[] }): DashboardRoleConfig {
  const roles = user.roles ?? [];
  let primaryRole = roles[0] ?? user.role ?? 'RECEPTIONIST';

  const designationLower = (user.designation || '').toLowerCase();

  // Check if user has finance role or designation
  if (
    roles.some(r => ['FINANCE_OFFICER', 'ACCOUNTANT', 'FINANCE', 'CFO', 'CHIEF_FINANCIAL_OFFICER'].includes(r.toUpperCase())) ||
    ['FINANCE_OFFICER', 'ACCOUNTANT', 'FINANCE'].includes(user.role || '') ||
    designationLower.includes('cfo') ||
    designationLower.includes('finance') ||
    designationLower.includes('accountant') ||
    designationLower.includes('bursar')
  ) {
    primaryRole = 'FINANCE_OFFICER';
  }

  // Check if user has physiotherapy role or designation
  if (
    roles.includes('PHYSIOTHERAPIST') ||
    roles.includes('PHYSIO') ||
    user.role === 'PHYSIOTHERAPIST' ||
    user.role === 'PHYSIO' ||
    designationLower.includes('physio') ||
    designationLower.includes('physical therap') ||
    designationLower.includes('rehab')
  ) {
    primaryRole = 'PHYSIOTHERAPIST';
  }

  // Check if user has radiology or radiographer role or designation
  const hasRadRole = roles.some(r => ['RADIOLOGIST', 'RADIOGRAPHER', 'RADIOLOGY', 'RADIOLOGY_STAFF'].includes(r)) ||
    ['RADIOLOGIST', 'RADIOGRAPHER', 'RADIOLOGY'].includes(user.role || '');
  const hasRadDesignation = ['radiolog', 'radiograph', 'sonograph', 'mri tech', 'ct tech', 'x-ray'].some(kw => designationLower.includes(kw));

  if (hasRadRole || hasRadDesignation) {
    primaryRole = 'RADIOLOGIST';
  }

  // Check if user has mortician role or designation
  if (roles.includes('MORTICIAN') || user.role === 'MORTICIAN' || designationLower.includes('mortician') || designationLower.includes('mortuary')) {
    primaryRole = 'MORTICIAN';
  }

  // Check if user has laboratory role or designation
  const hasLabRole = roles.some(r => ['LAB_TECHNICIAN', 'LAB_SCIENTIST', 'PATHOLOGIST', 'LABORATORY'].includes(r)) ||
    ['LAB_TECHNICIAN', 'LAB_SCIENTIST', 'PATHOLOGIST', 'LABORATORY'].includes(user.role || '');
  const hasLabDesignation = ['lab', 'patholog', 'scientist', 'technician', 'cmls', 'smls'].some(kw => designationLower.includes(kw));

  if (hasLabRole || hasLabDesignation) {
    if (roles.includes('PATHOLOGIST') || (user.role === 'PATHOLOGIST') || designationLower.includes('patholog')) {
      primaryRole = 'PATHOLOGIST';
    } else if (roles.includes('LAB_SCIENTIST') || (user.role === 'LAB_SCIENTIST') || designationLower.includes('scientist')) {
      primaryRole = 'LAB_SCIENTIST';
    } else {
      primaryRole = 'LAB_TECHNICIAN';
    }
  }

  // Clone default config for primary role
  const defaultConfig = DASHBOARD_WIDGETS[primaryRole] ?? DASHBOARD_WIDGETS.RECEPTIONIST;
  const config = {
    label: defaultConfig.label,
    widgets: [...defaultConfig.widgets],
    quickActions: [...defaultConfig.quickActions],
  };

  const deptCodes = (user.departments ?? []).map(d => d.code.toUpperCase());

  // Adapt based on departments
  if (deptCodes.includes('FIN')) {
    // Finance department: add revenue and stats if not present
    if (!config.widgets.includes('revenue')) config.widgets.unshift('revenue');
    if (!config.widgets.includes('stats')) config.widgets.unshift('stats');
    
    config.quickActions.push(
      { label: 'View Ledger', route: '/finance/ledger' },
      { label: 'Create Invoice', route: '/finance/invoice' }
    );
  }

  if (deptCodes.includes('SURG')) {
    // Surgery department: prioritize bed occupancy or add surgery actions
    if (!config.widgets.includes('bedOccupancy')) {
      config.widgets.push('bedOccupancy');
    }
    // Prioritize myPatients at the top of the widgets list if DOCTOR
    const patientIndex = config.widgets.indexOf('myPatients');
    if (patientIndex > 0) {
      config.widgets.splice(patientIndex, 1);
      config.widgets.unshift('myPatients');
    }
    
    config.quickActions.push(
      { label: 'Schedule Surgery', route: '/surgery/schedule' },
      { label: 'Pre-op Checklist', route: '/surgery/pre-op' }
    );
  }

  if (deptCodes.includes('PEDS')) {
    // Pediatrics: add specific actions
    config.quickActions.push(
      { label: 'Immunization Tracker', route: '/pediatrics/immunization' },
      { label: 'Growth Chart', route: '/pediatrics/growth' }
    );
  }

  if (deptCodes.includes('HR')) {
    // Human Resources
    config.quickActions.push(
      { label: 'Duty Roster', route: '/staff/roster' },
      { label: 'Leave Requests', route: '/staff/leaves' }
    );
  }

  // Ensure unique elements in widgets and quickActions
  config.widgets = Array.from(new Set(config.widgets));
  const uniqueActionsMap = new Map();
  config.quickActions.forEach(action => {
    uniqueActionsMap.set(action.label, action);
  });
  config.quickActions = Array.from(uniqueActionsMap.values());

  return config;
}
