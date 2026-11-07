import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Multer configuration for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/logos';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const position = (req as any).params?.position || 'logo';
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    // Use a fixed name per position so it always overwrites the same file
    cb(null, `hospital-${position}${ext}`);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|webp|svg/.test(file.mimetype) || /\.(jpg|jpeg|png|webp|svg)$/i.test(file.originalname);
    if (ok) cb(null, true);
    else cb(new Error('Only images are allowed'));
  },
});

// Multer configuration for slideshow images
const slideshowStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/slideshow';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.webp';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `slide-${unique}${ext}`);
  },
});

const uploadSlideshow = multer({
  storage: slideshowStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|webp|svg/.test(file.mimetype) || /\.(jpg|jpeg|png|webp|svg)$/i.test(file.originalname);
    if (ok) cb(null, true);
    else cb(new Error('Only images (jpg, png, webp, svg) are allowed'));
  },
});

export interface SystemModuleConfig {
  moduleKey: string;
  name: string;
  description: string;
  category: string;
  defaultActive: boolean;
  icon: string;
}

export const SYSTEM_MODULES: SystemModuleConfig[] = [
  // ── 1. Dashboard & Front Desk ──
  {
    moduleKey: 'DASHBOARD',
    name: 'Clinical & Operational Dashboard',
    description: 'Executive overview, real-time hospital occupancy, and clinical activity statistics',
    category: 'Dashboard & Front Desk',
    defaultActive: true,
    icon: 'Dashboard'
  },
  {
    moduleKey: 'VISITS',
    name: 'Patient Visits & Flow Tracking',
    description: 'Front-desk patient check-in, journey encounters, queue routing, and department triage',
    category: 'Dashboard & Front Desk',
    defaultActive: true,
    icon: 'DirectionsWalk'
  },
  {
    moduleKey: 'APPOINTMENTS',
    name: 'Appointments & Scheduling Desk',
    description: 'Specialist consultation bookings, physician slot calendars, and patient reminders',
    category: 'Dashboard & Front Desk',
    defaultActive: true,
    icon: 'CalendarToday'
  },
  {
    moduleKey: 'QUEUE',
    name: 'Queue Tracker & Token Board',
    description: 'Patient queue progression, waiting room calling displays, and token counters',
    category: 'Dashboard & Front Desk',
    defaultActive: true,
    icon: 'Queue'
  },

  // ── 2. Clinical Care & Emergency ──
  {
    moduleKey: 'OPD',
    name: 'Outpatient Department (OPD)',
    description: 'General consultations, clinical encounter history, diagnoses, and outpatient e-prescriptions',
    category: 'Clinical Care & Emergency',
    defaultActive: true,
    icon: 'LocalHospital'
  },
  {
    moduleKey: 'IPD',
    name: 'Inpatient Care (IPD & Wards)',
    description: 'Ward bed allocation, patient admissions, daily rounds, and inpatient clinical records',
    category: 'Clinical Care & Emergency',
    defaultActive: true,
    icon: 'Bed'
  },
  {
    moduleKey: 'EMERGENCY',
    name: 'Accident & Emergency (A&E)',
    description: 'Acute emergency trauma triage, red-flag resuscitations, and rapid observation care',
    category: 'Clinical Care & Emergency',
    defaultActive: true,
    icon: 'TrendingUp'
  },
  {
    moduleKey: 'ICU',
    name: 'Intensive Care Unit (ICU)',
    description: 'Critical care telemetry, ventilator settings, central lines, and continuous vitals monitoring',
    category: 'Clinical Care & Emergency',
    defaultActive: false, // Inactive by default per hospital operational profile
    icon: 'MonitorHeart'
  },
  {
    moduleKey: 'NURSING',
    name: 'Nursing Workspace & Station',
    description: 'Triage vitals, eMAR medication passes, fluid balance charts, and shift turnover logs',
    category: 'Clinical Care & Emergency',
    defaultActive: true,
    icon: 'Medication'
  },
  {
    moduleKey: 'CLINICS',
    name: 'Specialty Disease Clinics',
    description: 'Specialized clinic care for HIV/ART, TB DOTS, Viral Hepatitis, Oncology, and Chronic NCDs',
    category: 'Clinical Care & Emergency',
    defaultActive: true,
    icon: 'HealthAndSafety'
  },

  // ── 3. Diagnostics & Laboratory ──
  {
    moduleKey: 'PATHOLOGY',
    name: 'Pathology & Histology',
    description: 'Tissue biopsy grossing, histopathology orders, cytology workspace, and microscopic reports',
    category: 'Diagnostics & Laboratory',
    defaultActive: true,
    icon: 'Biotech'
  },
  {
    moduleKey: 'LABORATORY',
    name: 'Clinical Laboratory (LIMS)',
    description: 'Haematology, clinical chemistry, microbiology, urinalysis, and laboratory test catalogs',
    category: 'Diagnostics & Laboratory',
    defaultActive: true,
    icon: 'Science'
  },
  {
    moduleKey: 'RADIOLOGY',
    name: 'Radiology & Imaging (PACS)',
    description: 'Digital X-Ray requisition, ultrasound scans, RIS order workflow, and PACS/DICOM viewer',
    category: 'Diagnostics & Laboratory',
    defaultActive: true,
    icon: 'CameraAlt'
  },
  {
    moduleKey: 'BLOOD_BANK',
    name: 'Blood Bank & Transfusion',
    description: 'Voluntary blood donor register, ABO/Rh typing, crossmatching, and blood unit cold chain reserve',
    category: 'Diagnostics & Laboratory',
    defaultActive: true,
    icon: 'Bloodtype'
  },

  // ── 4. Maternity, Surgical & Allied Clinical ──
  {
    moduleKey: 'MATERNITY',
    name: 'Maternity Ward & Postnatal',
    description: 'Postpartum care, neonatal assessments, newborn vaccination, and maternal ward hospitalization',
    category: 'Maternity, Surgical & Allied Clinical',
    defaultActive: true,
    icon: 'ChildCare'
  },
  {
    moduleKey: 'ANC',
    name: 'Antenatal Care (ANC)',
    description: 'Antenatal clinic booking, gestational age tracking, ultrasound scheduling, and high-risk flags',
    category: 'Maternity, Surgical & Allied Clinical',
    defaultActive: true,
    icon: 'PregnantWoman'
  },
  {
    moduleKey: 'LABOUR_WARD',
    name: 'Labour & Delivery Ward',
    description: 'Intrapartum tracking, active WHO partograph charting, delivery summaries, and APGAR scores',
    category: 'Maternity, Surgical & Allied Clinical',
    defaultActive: true,
    icon: 'Timeline'
  },
  {
    moduleKey: 'FAMILY_PLANNING',
    name: 'Family Planning Clinic',
    description: 'Contraceptive counselling, intrauterine devices, subdermal implants, and reproductive health',
    category: 'Maternity, Surgical & Allied Clinical',
    defaultActive: true,
    icon: 'VolunteerActivism'
  },
  {
    moduleKey: 'OPERATING_THEATRE',
    name: 'Operating Theatre (Surgery)',
    description: 'Surgical scheduling, operating theatre suites, post-op recovery (PACU), and safety checklists',
    category: 'Maternity, Surgical & Allied Clinical',
    defaultActive: true,
    icon: 'MedicalServices'
  },
  {
    moduleKey: 'DENTAL',
    name: 'Dental Clinic & Surgery',
    description: 'Adult and pediatric odontogram charting, periodontal CAL examinations, and dental radiology',
    category: 'Maternity, Surgical & Allied Clinical',
    defaultActive: true,
    icon: 'MedicalInformation'
  },
  {
    moduleKey: 'EYE_CLINIC',
    name: 'Eye Clinic (Ophthalmology)',
    description: 'Visual acuity testing, slit-lamp exams, tonometry IOP, refraction, and optical dispensary',
    category: 'Maternity, Surgical & Allied Clinical',
    defaultActive: true,
    icon: 'RemoveRedEye'
  },
  {
    moduleKey: 'PHYSIO',
    name: 'Physiotherapy & Rehabilitation',
    description: 'Physical therapy regimes, ROM assessments, rehabilitation exercise analysis, and referral intake',
    category: 'Maternity, Surgical & Allied Clinical',
    defaultActive: true,
    icon: 'AccessibilityNew'
  },
  {
    moduleKey: 'MORTUARY',
    name: 'Mortuary & Funeral Services',
    description: 'Deceased cold vault ledger, autopsy recording, embalming logs, and body release clearances',
    category: 'Maternity, Surgical & Allied Clinical',
    defaultActive: true,
    icon: 'SevereCold'
  },

  // ── 5. Pharmacy & Supply Chain ──
  {
    moduleKey: 'PHARMACY',
    name: 'Pharmacy Dispensary & POS',
    description: 'Prescription dispensing, clinical dosage validation, pharmaceutical batch tracking, and retail cashier',
    category: 'Pharmacy & Supply Chain',
    defaultActive: true,
    icon: 'LocalPharmacy'
  },
  {
    moduleKey: 'INVENTORY',
    name: 'Drug Inventory & Warehousing',
    description: 'Central pharmaceutical storage, bin locations, batch expiry tracking, and physical stock counts',
    category: 'Pharmacy & Supply Chain',
    defaultActive: true,
    icon: 'Warehouse'
  },
  {
    moduleKey: 'PROCUREMENT',
    name: 'Sourcing & Replenishment',
    description: 'Vendor purchase orders, goods receipt notes (GRN), and supplier performance reviews',
    category: 'Pharmacy & Supply Chain',
    defaultActive: true,
    icon: 'LocalShipping'
  },

  // ── 6. Administration, Finance & Governance ──
  {
    moduleKey: 'BISHOP',
    name: 'Bishop Executive Module',
    description: 'Diocesan executive governance, spiritual mission audits, capital projects, and board reports',
    category: 'Administration, Finance & Governance',
    defaultActive: true,
    icon: 'AccountBalance'
  },
  {
    moduleKey: 'WORKFORCE',
    name: 'Workforce & Duty Rostering',
    description: 'Clinical staff duty schedules, biometric attendance clock-ins, leave requests, and timesheet records',
    category: 'Administration, Finance & Governance',
    defaultActive: true,
    icon: 'AssignmentInd'
  },
  {
    moduleKey: 'FINANCE',
    name: 'Finance & Revenue Billing',
    description: 'Billing cashier tills, payment receipts, fee schedules, bank deposits, and revenue reports',
    category: 'Administration, Finance & Governance',
    defaultActive: true,
    icon: 'Payments'
  },
  {
    moduleKey: 'HMO',
    name: 'Insurance HMO & NHIS Auditing',
    description: 'Managed healthcare pre-authorizations, claims batching, tariff fee audits, and capitation logs',
    category: 'Administration, Finance & Governance',
    defaultActive: true,
    icon: 'ReceiptLong'
  },
  {
    moduleKey: 'DMS',
    name: 'Document DMS & Digital Archive',
    description: 'Digitized paper medical charts, patient consent archives, and NDPA regulatory compliance',
    category: 'Administration, Finance & Governance',
    defaultActive: true,
    icon: 'FolderShared'
  },
  {
    moduleKey: 'MIGRATION',
    name: 'Data & Record Migration Studio',
    description: 'Legacy patient record ETL, OpenMRS data migration, and SMART on FHIR interoperability mapper',
    category: 'Administration, Finance & Governance',
    defaultActive: true,
    icon: 'SyncAlt'
  },

  // ── 7. Security & System Architecture ──
  {
    moduleKey: 'SECURITY_IAM',
    name: 'Identity & Access Management (IAM)',
    description: 'Hardware zero-trust enrolled devices, active user sessions, break-glass overrides, and SIEM alerts',
    category: 'Security & System Architecture',
    defaultActive: true,
    icon: 'Security'
  },
  {
    moduleKey: 'ARCHITECTURE',
    name: 'System Architecture & Disaster Recovery',
    description: 'Microservice topology, PostgreSQL database schema inspector, live HL7/FHIR simulator, and DR backups',
    category: 'Security & System Architecture',
    defaultActive: true,
    icon: 'Hub'
  }
];

// ── GET /api/config/public-info (PUBLIC — no auth required) ──────────────────
router.get('/public-info', async (_req: Request, res: Response) => {
  try {
    const configs = await prisma.hospitalConfig.findMany();
    const configMap: Record<string, string> = {};
    for (const c of configs) {
      if (c.description) configMap[c.moduleKey] = c.description;
    }

    let slides: any[] = [];
    if (configMap.HOSPITAL_SLIDES) {
      try {
        slides = JSON.parse(configMap.HOSPITAL_SLIDES);
      } catch (e) {
        slides = [];
      }
    }

    res.json({
      success: true,
      hospitalName: configMap.HOSPITAL_NAME || 'Faith Foundation Mission Hospital',
      hospitalSubtitle: configMap.HOSPITAL_SUBTITLE || 'Mission Hospital',
      hospitalMission: configMap.HOSPITAL_MISSION || 'Empowering clinical excellence through integrated medical records and compassionate care.',
      hospitalAddress: configMap.HOSPITAL_ADDRESS || '',
      hospitalPhone: configMap.HOSPITAL_PHONE || '',
      hospitalEmail: configMap.HOSPITAL_EMAIL || '',
      hospitalWebsite: configMap.HOSPITAL_WEBSITE || '',
      hospitalState: configMap.HOSPITAL_STATE || '',
      hospitalLga: configMap.HOSPITAL_LGA || '',
      hospitalWard: configMap.HOSPITAL_WARD || '',
      hospitalUniqueId: configMap.HOSPITAL_UNIQUE_ID || '',
      hospitalLogo: configMap.HOSPITAL_LOGO_LEFT || configMap.HOSPITAL_LOGO || '/hospital-logo.webp',
      slides: Array.isArray(slides) ? slides : [],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/config/modules ──────────────────────────────────────────────────
router.get('/modules', async (_req: Request, res: Response) => {
  try {
    const configs = await prisma.hospitalConfig.findMany();
    const configMap = new Map<string, boolean>();
    for (const c of configs) {
      configMap.set(c.moduleKey, c.isActive);
    }

    // Seed missing system modules into DB
    const missing = SYSTEM_MODULES.filter(m => !configMap.has(m.moduleKey));
    if (missing.length > 0) {
      for (const m of missing) {
        await prisma.hospitalConfig.upsert({
          where: { moduleKey: m.moduleKey },
          update: {},
          create: {
            moduleKey: m.moduleKey,
            description: m.name,
            isActive: m.defaultActive
          }
        });
        configMap.set(m.moduleKey, m.defaultActive);
      }
    }

    const data = SYSTEM_MODULES.map(m => ({
      moduleKey: m.moduleKey,
      name: m.name,
      description: m.description,
      category: m.category,
      icon: m.icon,
      isActive: configMap.has(m.moduleKey) ? configMap.get(m.moduleKey)! : m.defaultActive
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── PUT /api/config/modules/:moduleKey ───────────────────────────────────────
router.put('/modules/:moduleKey', async (req: any, res: Response) => {
  try {
    const { moduleKey } = req.params;
    const { isActive, description } = req.body;
    
    const updateData: any = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof description !== 'undefined') updateData.description = description;

    const config = await prisma.hospitalConfig.upsert({
      where: { moduleKey },
      update: updateData,
      create: { 
        moduleKey, 
        isActive: typeof isActive === 'boolean' ? isActive : true, 
        description: description ?? moduleKey 
      }
    });

    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/config/modules/bulk ───────────────────────────────────────────
router.post('/modules/bulk', async (req: Request, res: Response) => {
  try {
    const { action, moduleKeys, category } = req.body;
    let targetKeys: string[] = [];

    if (category && category !== 'ALL') {
      targetKeys = SYSTEM_MODULES.filter(m => m.category === category).map(m => m.moduleKey);
    } else if (Array.isArray(moduleKeys) && moduleKeys.length > 0) {
      targetKeys = moduleKeys;
    } else {
      targetKeys = SYSTEM_MODULES.map(m => m.moduleKey);
    }

    const newActiveState = action === 'GRANT_ALL';

    for (const key of targetKeys) {
      await prisma.hospitalConfig.upsert({
        where: { moduleKey: key },
        update: { isActive: newActiveState },
        create: { moduleKey: key, isActive: newActiveState, description: key }
      });
    }

    res.json({
      success: true,
      message: `Successfully ${newActiveState ? 'granted' : 'revoked'} ${targetKeys.length} modules`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Departmental Assignments Configuration ──────────────────────────────────
const DEFAULT_DEPARTMENT_ASSIGNMENTS: Record<string, { modules: string[]; accessLevels?: Record<string, 'FULL' | 'READ_ONLY'> }> = {
  MED: {
    modules: ['DASHBOARD', 'VISITS', 'APPOINTMENTS', 'QUEUE', 'OPD', 'IPD', 'CLINICS', 'LABORATORY', 'RADIOLOGY', 'PHARMACY'],
  },
  NURSE: {
    modules: ['DASHBOARD', 'VISITS', 'QUEUE', 'NURSING', 'IPD', 'EMERGENCY', 'ICU', 'LABOUR_WARD'],
  },
  SURG: {
    modules: ['DASHBOARD', 'OPERATING_THEATRE', 'IPD', 'ICU', 'PATHOLOGY', 'LABORATORY', 'BLOOD_BANK'],
  },
  PEDS: {
    modules: ['DASHBOARD', 'VISITS', 'APPOINTMENTS', 'QUEUE', 'OPD', 'IPD', 'LABORATORY', 'PHARMACY'],
  },
  HR: {
    modules: ['DASHBOARD', 'WORKFORCE', 'SECURITY_IAM', 'DMS'],
  },
  FIN: {
    modules: ['DASHBOARD', 'FINANCE', 'HMO', 'REPORTS', 'DMS'],
  },
  ADMIN: {
    modules: SYSTEM_MODULES.map(m => m.moduleKey),
  },
  INS: {
    modules: ['DASHBOARD', 'HMO', 'FINANCE', 'REPORTS'],
  },
  EMERG: {
    modules: ['DASHBOARD', 'EMERGENCY', 'QUEUE', 'VISITS', 'ICU', 'BLOOD_BANK', 'OPERATING_THEATRE'],
  },
  ICU: {
    modules: ['DASHBOARD', 'ICU', 'EMERGENCY', 'NURSING', 'OPERATING_THEATRE', 'BLOOD_BANK'],
  },
  LAB: {
    modules: ['DASHBOARD', 'LABORATORY', 'PATHOLOGY', 'BLOOD_BANK'],
  },
  RAD: {
    modules: ['DASHBOARD', 'RADIOLOGY', 'CLINICS', 'OPD'],
  },
  PHARM: {
    modules: ['DASHBOARD', 'PHARMACY', 'INVENTORY', 'PROCUREMENT'],
  },
  MAT: {
    modules: ['DASHBOARD', 'MATERNITY', 'ANC', 'LABOUR_WARD', 'FAMILY_PLANNING'],
  },
  DENT: {
    modules: ['DASHBOARD', 'DENTAL', 'CLINICS', 'APPOINTMENTS'],
  },
  EYE: {
    modules: ['DASHBOARD', 'EYE_CLINIC', 'CLINICS', 'APPOINTMENTS'],
  },
};

const STANDARD_DEPARTMENTS = [
  { code: 'MED', name: 'General Medicine' },
  { code: 'NURSE', name: 'Nursing Department' },
  { code: 'SURG', name: 'Surgery Department' },
  { code: 'PEDS', name: 'Pediatrics Department' },
  { code: 'EMERG', name: 'Emergency & Trauma' },
  { code: 'ICU', name: 'Intensive Care Unit' },
  { code: 'LAB', name: 'Clinical Pathology & Laboratory' },
  { code: 'RAD', name: 'Radiology & Imaging' },
  { code: 'PHARM', name: 'Pharmacy & Dispensary' },
  { code: 'MAT', name: 'Maternity & Obstetrics' },
  { code: 'DENT', name: 'Dental Services' },
  { code: 'EYE', name: 'Ophthalmology & Eye Clinic' },
  { code: 'HR', name: 'Human Resources' },
  { code: 'FIN', name: 'Billing and Finance' },
  { code: 'ADMIN', name: 'Hospital Administration' },
  { code: 'INS', name: 'Health Insurance & HMO' },
];

// ── GET /api/config/departments — List departments with their assigned modules ──
router.get('/departments', async (req: Request, res: Response) => {
  try {
    // Seed standard departments if missing
    for (const d of STANDARD_DEPARTMENTS) {
      await prisma.department.upsert({
        where: { code: d.code },
        update: {},
        create: {
          code: d.code,
          name: d.name,
          isActive: true
        }
      });
    }

    const depts = await prisma.department.findMany({
      include: {
        members: { select: { userId: true } }
      },
      orderBy: { name: 'asc' }
    });

    const assignmentsConfig = await prisma.hospitalConfig.findUnique({
      where: { moduleKey: 'DEPT_MODULE_ASSIGNMENTS' }
    });

    let assignments: Record<string, { modules: string[]; accessLevels?: Record<string, 'FULL' | 'READ_ONLY'> }> = {};
    if (assignmentsConfig?.description) {
      try {
        assignments = JSON.parse(assignmentsConfig.description);
      } catch (_) {
        assignments = {};
      }
    }

    let needsSave = false;
    for (const d of depts) {
      if (!assignments[d.code]) {
        const defaultAssigned = DEFAULT_DEPARTMENT_ASSIGNMENTS[d.code] || {
          modules: ['DASHBOARD', 'VISITS']
        };
        assignments[d.code] = defaultAssigned;
        needsSave = true;
      }
    }

    if (needsSave || !assignmentsConfig) {
      await prisma.hospitalConfig.upsert({
        where: { moduleKey: 'DEPT_MODULE_ASSIGNMENTS' },
        update: { description: JSON.stringify(assignments), isActive: true },
        create: { moduleKey: 'DEPT_MODULE_ASSIGNMENTS', description: JSON.stringify(assignments), isActive: true }
      });
    }

    const data = depts.map(d => ({
      id: d.id,
      code: d.code,
      name: d.name,
      isActive: d.isActive,
      memberCount: d.members.length,
      assignedModules: assignments[d.code]?.modules || ['DASHBOARD'],
      accessLevels: assignments[d.code]?.accessLevels || {},
      moduleCount: (assignments[d.code]?.modules || []).length
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── PUT /api/config/departments/:code/modules — Update department module assignments ──
router.put('/departments/:code/modules', async (req: Request, res: Response) => {
  try {
    const code = req.params.code.toUpperCase();
    const { assignedModules, accessLevels } = req.body;

    if (!Array.isArray(assignedModules)) {
      return res.status(400).json({ success: false, error: 'assignedModules must be an array' });
    }

    const assignmentsConfig = await prisma.hospitalConfig.findUnique({
      where: { moduleKey: 'DEPT_MODULE_ASSIGNMENTS' }
    });

    let assignments: Record<string, any> = {};
    if (assignmentsConfig?.description) {
      try { assignments = JSON.parse(assignmentsConfig.description); } catch (_) {}
    }

    assignments[code] = {
      modules: assignedModules,
      accessLevels: accessLevels || assignments[code]?.accessLevels || {}
    };

    await prisma.hospitalConfig.upsert({
      where: { moduleKey: 'DEPT_MODULE_ASSIGNMENTS' },
      update: { description: JSON.stringify(assignments), isActive: true },
      create: { moduleKey: 'DEPT_MODULE_ASSIGNMENTS', description: JSON.stringify(assignments), isActive: true }
    });

    res.json({
      success: true,
      code,
      assignedModules: assignments[code].modules,
      accessLevels: assignments[code].accessLevels
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/config/departments/bulk-assign ──
router.post('/departments/bulk-assign', async (req: Request, res: Response) => {
  try {
    const { action, deptCode } = req.body;
    const code = (deptCode || '').toUpperCase();

    const assignmentsConfig = await prisma.hospitalConfig.findUnique({
      where: { moduleKey: 'DEPT_MODULE_ASSIGNMENTS' }
    });

    let assignments: Record<string, any> = {};
    if (assignmentsConfig?.description) {
      try { assignments = JSON.parse(assignmentsConfig.description); } catch (_) {}
    }

    let targetModules: string[] = [];
    if (action === 'ASSIGN_ALL') {
      targetModules = SYSTEM_MODULES.map(m => m.moduleKey);
    } else if (action === 'ASSIGN_CLINICAL') {
      targetModules = SYSTEM_MODULES.filter(m =>
        m.category.includes('Clinical') ||
        m.category.includes('Diagnostics') ||
        m.category.includes('Maternity') ||
        m.category.includes('Pharmacy') ||
        m.category.includes('Front Desk')
      ).map(m => m.moduleKey);
    } else if (action === 'CLEAR_ALL') {
      targetModules = [];
    } else if (action === 'RESET_DEFAULT') {
      targetModules = DEFAULT_DEPARTMENT_ASSIGNMENTS[code]?.modules || ['DASHBOARD'];
    }

    assignments[code] = {
      modules: targetModules,
      accessLevels: assignments[code]?.accessLevels || {}
    };

    await prisma.hospitalConfig.upsert({
      where: { moduleKey: 'DEPT_MODULE_ASSIGNMENTS' },
      update: { description: JSON.stringify(assignments), isActive: true },
      create: { moduleKey: 'DEPT_MODULE_ASSIGNMENTS', description: JSON.stringify(assignments), isActive: true }
    });

    res.json({ success: true, code, assignedModules: targetModules });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Dedicated Logo Upload Endpoint ──────────────────────────────────────────
// POST /api/config/logos/:position  (position = 'left' | 'right' | 'stamp')
router.post('/logos/:position', uploadLogo.single('logo'), async (req: any, res: Response) => {
  try {
    const { position } = req.params;
    if (!['left', 'right', 'stamp'].includes(position)) {
      return res.status(400).json({ success: false, error: 'position must be left, right, or stamp' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Store the public URL path
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    const moduleKey = position === 'left' ? 'HOSPITAL_LOGO_LEFT' : (position === 'right' ? 'HOSPITAL_LOGO_RIGHT' : 'HOSPITAL_STAMP');

    const config = await prisma.hospitalConfig.upsert({
      where: { moduleKey },
      update: { description: logoUrl, isActive: true },
      create: { moduleKey, description: logoUrl, isActive: true },
    });

    res.json({ success: true, data: config, url: logoUrl });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Slideshow Management Endpoints ───────────────────────────────────────────

// GET /api/config/slideshow — List slideshow images
router.get('/slideshow', async (_req: Request, res: Response) => {
  try {
    const config = await prisma.hospitalConfig.findUnique({
      where: { moduleKey: 'HOSPITAL_SLIDES' },
    });

    let slides: any[] = [];
    if (config?.description) {
      try {
        slides = JSON.parse(config.description);
      } catch (e) {
        slides = [];
      }
    }

    res.json({ success: true, data: slides });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/config/slideshow/upload — Upload a slideshow image
router.post('/slideshow/upload', uploadSlideshow.single('image'), async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    const imageUrl = `/uploads/slideshow/${req.file.filename}`;
    const dept = req.body?.dept || 'Hospital Facility';
    const desc = req.body?.desc || 'Modern healthcare facility & compassionate patient care.';

    // Load existing slides
    const config = await prisma.hospitalConfig.findUnique({
      where: { moduleKey: 'HOSPITAL_SLIDES' },
    });

    let slides: any[] = [];
    if (config?.description) {
      try {
        slides = JSON.parse(config.description);
      } catch (e) {
        slides = [];
      }
    }

    const newSlide = {
      id: 'slide_' + Date.now(),
      image: imageUrl,
      dept,
      desc,
    };

    slides.push(newSlide);

    await prisma.hospitalConfig.upsert({
      where: { moduleKey: 'HOSPITAL_SLIDES' },
      update: { description: JSON.stringify(slides), isActive: true },
      create: { moduleKey: 'HOSPITAL_SLIDES', description: JSON.stringify(slides), isActive: true },
    });

    res.json({ success: true, data: slides, newSlide });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/config/slideshow — Update all slides (reorder, update text, or reset)
router.put('/slideshow', async (req: Request, res: Response) => {
  try {
    const { slides } = req.body;
    if (!Array.isArray(slides)) {
      return res.status(400).json({ success: false, error: 'slides must be an array' });
    }

    await prisma.hospitalConfig.upsert({
      where: { moduleKey: 'HOSPITAL_SLIDES' },
      update: { description: JSON.stringify(slides), isActive: true },
      create: { moduleKey: 'HOSPITAL_SLIDES', description: JSON.stringify(slides), isActive: true },
    });

    res.json({ success: true, data: slides });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/config/slideshow/:id — Delete a slide
router.delete('/slideshow/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const config = await prisma.hospitalConfig.findUnique({
      where: { moduleKey: 'HOSPITAL_SLIDES' },
    });

    let slides: any[] = [];
    if (config?.description) {
      try {
        slides = JSON.parse(config.description);
      } catch (e) {
        slides = [];
      }
    }

    const slideToDelete = slides.find((s: any, idx: number) => s.id === id || String(idx) === id);
    if (slideToDelete?.image && slideToDelete.image.startsWith('/uploads/slideshow/')) {
      const filePath = '.' + slideToDelete.image;
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    slides = slides.filter((s: any, idx: number) => s.id !== id && String(idx) !== id);

    await prisma.hospitalConfig.upsert({
      where: { moduleKey: 'HOSPITAL_SLIDES' },
      update: { description: JSON.stringify(slides), isActive: true },
      create: { moduleKey: 'HOSPITAL_SLIDES', description: JSON.stringify(slides), isActive: true },
    });

    res.json({ success: true, data: slides });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
