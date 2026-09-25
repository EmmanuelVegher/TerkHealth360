import { Router, Request, Response } from 'express';
import { logAudit } from '../utils/auditHelper.js';
import { prisma } from '../prisma.js';
import bcrypt from 'bcryptjs';
import { loadEmployeeMetadata, saveEmployeeMetadata } from '../utils/metadataHelper.js';
import { cashierShifts, syncShiftBalances, ensureShiftsInitialized } from './billing.js';
import { addPayrollJournalVoucher } from './finance.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// STATE STORES (Mock Database)
// ─────────────────────────────────────────────────────────────────────────────

export const employees: any[] = [
  {
    id: 'ADM-02',
    firstName: 'Most Rev. Dr. C.V.C.',
    lastName: 'Onaga',
    email: 'bishop.onaga@hospital.com',
    phone: '080-1122-3344',
    role: 'Bishop',
    designation: 'Catholic Diocesan Bishop & Patron',
    department: 'Executive & Diocesan Board',
    unit: 'Episcopal Oversight & Governance',
    status: 'ACTIVE',
    salaryGrade: 'EXECUTIVE',
    baseSalary: 0,
    bankName: 'Zenith Bank',
    accountNo: '1000000001',
    pensionPin: 'PEN1009849201 (Stanbic IBTC)',
    taxId: 'TIN-BEN-2026-9941',
    licenseNo: 'N/A',
    licenseExpiry: '2099-12-31',
    fundingSource: 'DIOCESAN_PATRON',
    hierarchyLevel: 1,
    approvalTier: 'TIER_5_BOARD',
    supervisorId: null,
    supervisorName: 'Diocesan Synod & Board of Trustees',
    supervisorRole: 'Diocesan Board of Trustees',
    supervisorEmail: 'synod@diocese.org'
  },
  {
    id: 'ADM-03',
    firstName: 'Rev. Fr. Dr.',
    lastName: 'Emmanuel',
    email: 'fr.emmanuel@hospital.com',
    phone: '080-2233-4455',
    role: 'Doctor',
    designation: 'Diocesan Health Director / Bishop Representative',
    department: 'Executive & Diocesan Board',
    unit: 'Health Commission & Quality Governance',
    status: 'ACTIVE',
    salaryGrade: 'EXECUTIVE',
    baseSalary: 350000,
    bankName: 'Zenith Bank',
    accountNo: '1000000002',
    pensionPin: 'PEN1009849201 (Stanbic IBTC)',
    taxId: 'TIN-BEN-2026-9941',
    licenseNo: 'MDCN-L-10293',
    licenseExpiry: '2030-01-01',
    fundingSource: 'DIOCESAN_HEALTH',
    hierarchyLevel: 2,
    approvalTier: 'TIER_4_EXECUTIVE',
    supervisorId: 'ADM-02',
    supervisorName: 'Most Rev. Dr. C.V.C. Onaga',
    supervisorRole: 'Catholic Diocesan Bishop & Patron',
    supervisorEmail: 'bishop.onaga@hospital.com'
  },
  {
    id: 'ADM-04',
    firstName: 'Dr.',
    lastName: 'Nwachukwu',
    email: 'cmd.nwachukwu@hospital.com',
    phone: '080-3344-5566',
    role: 'Doctor',
    designation: 'Chief Medical Director / Board Chair',
    department: 'Executive & Medical Board',
    unit: 'Clinical Governance & Medical Directorate',
    status: 'ACTIVE',
    salaryGrade: 'L15-Step 5',
    baseSalary: 550000,
    bankName: 'First Bank',
    accountNo: '3019283746',
    pensionPin: 'PEN1009849201 (Stanbic IBTC)',
    taxId: 'TIN-BEN-2026-9941',
    licenseNo: 'MDCN-L-00192',
    licenseExpiry: '2029-12-31',
    fundingSource: 'HOSPITAL_FUNDED',
    hierarchyLevel: 2,
    approvalTier: 'TIER_4_EXECUTIVE',
    supervisorId: 'ADM-02',
    supervisorName: 'Most Rev. Dr. C.V.C. Onaga',
    supervisorRole: 'Catholic Diocesan Bishop & Patron',
    supervisorEmail: 'bishop.onaga@hospital.com',
    secondarySupervisorId: 'ADM-03',
    secondarySupervisorName: 'Rev. Fr. Dr. Emmanuel'
  },
  {
    id: 'ADM-01',
    firstName: 'Amedu',
    lastName: 'Alapa',
    email: 'amedu.admin@hospital.com',
    phone: '080-9988-7766',
    role: 'Admin',
    designation: 'Hospital Administrator & CEO',
    department: 'Hospital Administration',
    unit: 'Executive Management & Operations',
    status: 'ACTIVE',
    salaryGrade: 'L14-Step 2',
    baseSalary: 450000,
    bankName: 'Zenith Bank',
    accountNo: '1012938475',
    pensionPin: 'PEN1009849201 (Stanbic IBTC)',
    taxId: 'TIN-BEN-2026-9941',
    licenseNo: 'N/A',
    licenseExpiry: '2099-12-31',
    fundingSource: 'HOSPITAL_FUNDED',
    hierarchyLevel: 2,
    approvalTier: 'TIER_4_EXECUTIVE',
    supervisorId: 'ADM-03',
    supervisorName: 'Rev. Fr. Dr. Emmanuel',
    supervisorRole: 'Diocesan Health Director',
    supervisorEmail: 'fr.emmanuel@hospital.com',
    secondarySupervisorId: 'ADM-02',
    secondarySupervisorName: 'Most Rev. Dr. C.V.C. Onaga'
  },
  {
    id: 'EMP-004',
    firstName: 'Aisha',
    lastName: 'Bello',
    email: 'aisha@hospital.com',
    phone: '080-7777-4321',
    role: 'Doctor',
    designation: 'Clinical Services Director & Consultant',
    department: 'Clinical Services',
    unit: 'Medical Directorate & Clinical Practice',
    status: 'ACTIVE',
    salaryGrade: 'L12-Step 5',
    baseSalary: 380000,
    bankName: 'UBA Bank',
    accountNo: '2029983191',
    pensionPin: 'PEN1009849201 (Stanbic IBTC)',
    taxId: 'TIN-BEN-2026-9941',
    licenseNo: 'MDCN-L-1992',
    licenseExpiry: '2026-08-30',
    fundingSource: 'DONOR_FUNDED',
    donorProgramme: 'CDC/CARITAS',
    hierarchyLevel: 3,
    approvalTier: 'TIER_1_CLINICAL',
    supervisorId: 'ADM-04',
    supervisorName: 'Dr. Nwachukwu',
    supervisorRole: 'Chief Medical Director',
    supervisorEmail: 'cmd.nwachukwu@hospital.com'
  },
  {
    id: 'EMP-011',
    firstName: 'Ngozi',
    lastName: 'Eze',
    email: 'ngozi.eze@hospital.com',
    phone: '070-3322-1100',
    role: 'Nurse',
    designation: 'Chief Nursing Officer / Directorate Head',
    department: 'Nursing & Inpatient',
    unit: 'Nursing Services & Ward Oversight',
    status: 'ACTIVE',
    salaryGrade: 'L11-Step 4',
    baseSalary: 280000,
    bankName: 'First Bank',
    accountNo: '3088192039',
    pensionPin: 'PEN1009849201 (Stanbic IBTC)',
    taxId: 'TIN-BEN-2026-9941',
    licenseNo: 'NMCN-L-49201',
    licenseExpiry: '2028-05-20',
    fundingSource: 'HOSPITAL_FUNDED',
    hierarchyLevel: 3,
    approvalTier: 'TIER_1_CLINICAL',
    supervisorId: 'ADM-04',
    supervisorName: 'Dr. Nwachukwu',
    supervisorRole: 'Chief Medical Director',
    supervisorEmail: 'cmd.nwachukwu@hospital.com'
  },
  {
    id: 'EMP-009',
    firstName: 'Chinedu',
    lastName: 'Okafor',
    email: 'chinedu.okafor@hospital.com',
    phone: '080-5544-3322',
    role: 'Accountant',
    designation: 'Senior Financial Accountant',
    department: 'Finance & Revenue',
    unit: 'General Ledger, Financial Reporting & Payroll',
    status: 'ACTIVE',
    salaryGrade: 'L9-Step 3',
    baseSalary: 195000,
    bankName: 'Zenith Bank',
    accountNo: '1099238471',
    pensionPin: 'PEN1009849201 (Stanbic IBTC)',
    taxId: 'TIN-BEN-2026-9941',
    licenseNo: 'ICAN-78901',
    licenseExpiry: '2099-12-31',
    fundingSource: 'HOSPITAL_FUNDED',
    hierarchyLevel: 3,
    approvalTier: 'TIER_2_FINANCE',
    supervisorId: 'EMP-012',
    supervisorName: 'David Adeleke',
    supervisorRole: 'Head of Internal Audit & Compliance',
    supervisorEmail: 'david.adeleke@hospital.com',
    secondarySupervisorId: 'ADM-01',
    secondarySupervisorName: 'Amedu Alapa',
    secondarySupervisorRole: 'Hospital Administrator & CEO',
    secondarySupervisorEmail: 'amedu.admin@hospital.com'
  },
  {
    id: 'EMP-010',
    firstName: 'Ekwedike',
    lastName: 'Dennis',
    email: 'ekwedike.dennis@hospital.com',
    phone: '081-7788-9900',
    role: 'Admin',
    designation: 'Hospital Projects & Caritas Coordinator',
    department: 'Administration',
    unit: 'Donor Grants & Public Health Programmes',
    status: 'ACTIVE',
    salaryGrade: 'L10-Step 2',
    baseSalary: 230000,
    bankName: 'GTBank',
    accountNo: '0188293012',
    pensionPin: 'PEN1009849201 (Stanbic IBTC)',
    taxId: 'TIN-BEN-2026-9941',
    licenseNo: 'N/A',
    licenseExpiry: '2099-12-31',
    fundingSource: 'DONOR_FUNDED',
    donorProgramme: 'CARITAS_NIGERIA',
    hierarchyLevel: 3,
    approvalTier: 'TIER_3_ADMIN',
    supervisorId: 'ADM-01',
    supervisorName: 'Amedu Alapa',
    supervisorRole: 'Hospital Administrator & CEO',
    supervisorEmail: 'amedu.admin@hospital.com'
  },
  {
    id: 'EMP-005',
    firstName: 'Tunde',
    lastName: 'Fashola',
    email: 'tunde@hospital.com',
    phone: '090-2222-8765',
    role: 'Admin',
    designation: 'Operations & Facilities Manager',
    department: 'Administration',
    unit: 'Hospital Facilities, Logistics & Assets',
    status: 'ACTIVE',
    salaryGrade: 'L10-Step 5',
    baseSalary: 250000,
    bankName: 'Zenith Bank',
    accountNo: '1018892312',
    pensionPin: 'PEN1009849201 (Stanbic IBTC)',
    taxId: 'TIN-BEN-2026-9941',
    licenseNo: 'N/A',
    licenseExpiry: '2099-12-31',
    fundingSource: 'HOSPITAL_FUNDED',
    hierarchyLevel: 3,
    approvalTier: 'TIER_3_ADMIN',
    supervisorId: 'ADM-01',
    supervisorName: 'Amedu Alapa',
    supervisorRole: 'Hospital Administrator & CEO',
    supervisorEmail: 'amedu.admin@hospital.com'
  },
  {
    id: 'EMP-003',
    firstName: 'Chidi',
    lastName: 'Nwosu',
    email: 'chidi@hospital.com',
    phone: '070-5555-1234',
    role: 'Pharmacist',
    designation: 'Head of Pharmacy / Chief Pharmacist',
    department: 'Pharmacy',
    unit: 'Pharmacy & Dispensary Services',
    status: 'ACTIVE',
    salaryGrade: 'L9-Step 1',
    baseSalary: 180000,
    bankName: 'GTBank',
    accountNo: '0118833912',
    pensionPin: 'PEN1009849201 (Stanbic IBTC)',
    taxId: 'TIN-BEN-2026-9941',
    licenseNo: 'PCN-L-8821',
    licenseExpiry: '2025-12-31',
    fundingSource: 'HOSPITAL_FUNDED',
    hierarchyLevel: 4,
    approvalTier: 'TIER_1_CLINICAL',
    supervisorId: 'EMP-004',
    supervisorName: 'Dr. Aisha Bello',
    supervisorRole: 'Clinical Services Director',
    supervisorEmail: 'aisha@hospital.com'
  },
  {
    id: 'EMP-001',
    firstName: 'Emeka',
    lastName: 'Okafor',
    email: 'emeka@hospital.com',
    phone: '080-1234-5678',
    role: 'Doctor / Consultant Physician (OPD Lead)',
    department: 'OPD / Internal Medicine',
    unit: 'Outpatient Consultations & Special Clinic',
    status: 'ACTIVE',
    salaryGrade: 'L12-Step 4',
    baseSalary: 350000,
    bankName: 'Zenith Bank',
    accountNo: '1029381829',
    licenseNo: 'MDCN-L-44910',
    licenseExpiry: '2027-04-12',
    fundingSource: 'HOSPITAL_FUNDED',
    hierarchyLevel: 4,
    approvalTier: 'TIER_1_CLINICAL',
    supervisorId: 'EMP-004',
    supervisorName: 'Dr. Aisha Bello',
    supervisorRole: 'Clinical Services Director',
    supervisorEmail: 'aisha@hospital.com'
  },
  {
    id: 'EMP-002',
    firstName: 'Ngozi',
    lastName: 'Adeyemi',
    email: 'ngozi@hospital.com',
    phone: '081-9876-5432',
    role: 'Nurse / ICU & Critical Care Matron',
    department: 'ICU',
    unit: 'Intensive Care Unit & Critical Wards',
    status: 'ACTIVE',
    salaryGrade: 'L8-Step 2',
    baseSalary: 120000,
    bankName: 'Access Bank',
    accountNo: '0029312198',
    licenseNo: 'NMCN-L-38821',
    licenseExpiry: '2026-10-15',
    fundingSource: 'HOSPITAL_FUNDED',
    hierarchyLevel: 4,
    approvalTier: 'TIER_1_CLINICAL',
    supervisorId: 'EMP-011',
    supervisorName: 'Ngozi Eze',
    supervisorRole: 'Chief Nursing Officer',
    supervisorEmail: 'ngozi.eze@hospital.com'
  },
  {
    id: 'EMP-012',
    firstName: 'David',
    lastName: 'Adeleke',
    email: 'david.adeleke@hospital.com',
    phone: '080-7788-1122',
    role: 'Head of Internal Audit & Compliance',
    department: 'Internal Audit & Compliance',
    unit: 'General Ledger Audit, Risk Assurance & Forensic Control',
    status: 'ACTIVE',
    salaryGrade: 'L10-Step 2',
    baseSalary: 220000,
    bankName: 'Zenith Bank',
    accountNo: '1029384756',
    licenseNo: 'ICAN-91044',
    licenseExpiry: '2099-12-31',
    fundingSource: 'HOSPITAL_FUNDED',
    hierarchyLevel: 2,
    approvalTier: 'TIER_2_FINANCE',
    supervisorId: 'ADM-01',
    supervisorName: 'Amedu Alapa',
    supervisorRole: 'Hospital Administrator & CEO',
    supervisorEmail: 'amedu.admin@hospital.com'
  },
  {
    id: 'EMP-013',
    firstName: 'Emmanuel',
    lastName: 'Vegher',
    email: 'emmanuel.vegher@hospital.com',
    phone: '080-9922-3344',
    role: 'Tracking Assistant & Lab Scientist',
    department: 'Prevention & Diagnostics',
    unit: 'AYP Hub & Laboratory Diagnostics',
    status: 'ACTIVE',
    salaryGrade: 'L8-Step 1',
    baseSalary: 135000,
    bankName: 'First Bank',
    accountNo: '3029182736',
    licenseNo: 'MLSCN-2021-99',
    licenseExpiry: '2028-12-31',
    fundingSource: 'DONOR_FUNDED',
    donorProgramme: 'AYP_HUB',
    hierarchyLevel: 4,
    approvalTier: 'TIER_3_ADMIN',
    supervisorId: 'EMP-010',
    supervisorName: 'Ekwedike Dennis',
    supervisorRole: 'Hospital Projects & Caritas Coordinator',
    supervisorEmail: 'ekwedike.dennis@hospital.com',
    secondarySupervisorId: 'EMP-004',
    secondarySupervisorName: 'Dr. Aisha Bello'
  },
  {
    id: 'EMP-006',
    firstName: 'Mary',
    lastName: 'Okon',
    email: 'mary.okon@hospital.com',
    phone: '080-3333-1122',
    role: 'Senior Cashier & Revenue Officer',
    department: 'Finance & Revenue',
    unit: 'Main Outpatient Till #01',
    status: 'ACTIVE',
    salaryGrade: 'L7-Step 2',
    baseSalary: 145000,
    bankName: 'First Bank',
    accountNo: '3091182390',
    licenseNo: 'N/A',
    licenseExpiry: '2099-12-31',
    fundingSource: 'HOSPITAL_FUNDED',
    hierarchyLevel: 5,
    approvalTier: 'TIER_2_FINANCE',
    supervisorId: 'EMP-009',
    supervisorName: 'Chinedu Okafor',
    supervisorRole: 'Revenue Unit Lead & Senior Finance Supervisor',
    supervisorEmail: 'chinedu.okafor@hospital.com'
  },
  {
    id: 'EMP-007',
    firstName: 'Blessing',
    lastName: 'Ugwu',
    email: 'blessing.ugwu@hospital.com',
    phone: '081-4444-2233',
    role: 'Senior Cashier & Shift Lead',
    department: 'Finance & Revenue',
    unit: 'Emergency & IPD Till #02',
    status: 'ACTIVE',
    salaryGrade: 'L6-Step 3',
    baseSalary: 125000,
    bankName: 'UBA Bank',
    accountNo: '2081192341',
    licenseNo: 'N/A',
    licenseExpiry: '2099-12-31',
    fundingSource: 'HOSPITAL_FUNDED',
    hierarchyLevel: 5,
    approvalTier: 'TIER_2_FINANCE',
    supervisorId: 'EMP-009',
    supervisorName: 'Chinedu Okafor',
    supervisorRole: 'Revenue Unit Lead & Senior Finance Supervisor',
    supervisorEmail: 'chinedu.okafor@hospital.com'
  },
  {
    id: 'EMP-008',
    firstName: 'Ibrahim',
    lastName: 'Danladi',
    email: 'ibrahim.danladi@hospital.com',
    phone: '070-6666-3344',
    role: 'Weekend Cashier Till Supervisor',
    department: 'Finance & Revenue',
    unit: 'Pharmacy & Weekend Tills',
    status: 'ACTIVE',
    salaryGrade: 'L6-Step 2',
    baseSalary: 125000,
    bankName: 'Access Bank',
    accountNo: '0077881923',
    licenseNo: 'N/A',
    licenseExpiry: '2099-12-31',
    fundingSource: 'HOSPITAL_FUNDED',
    hierarchyLevel: 5,
    approvalTier: 'TIER_2_FINANCE',
    supervisorId: 'EMP-009',
    supervisorName: 'Chinedu Okafor',
    supervisorRole: 'Revenue Unit Lead & Senior Finance Supervisor',
    supervisorEmail: 'chinedu.okafor@hospital.com'
  }
];

export const getHREmployees = () => employees;

let vacancies: any[] = [
  { id: 'VAC-01', department: 'OPD', title: 'Senior Medical Officer', grade: 'L12', positions: 2, status: 'OPEN', datePosted: '2026-06-20' },
  { id: 'VAC-02', department: 'Laboratory', title: 'Medical Laboratory Scientist', grade: 'L8', positions: 1, status: 'SHORTLISTING', datePosted: '2026-06-22' },
];

let rosterShifts: any[] = [
  { id: 'SHF-001', empId: 'EMP-001', name: 'Dr. Emeka Okafor', date: '2026-06-29', shiftType: 'DOCTOR_CALL_24H', start: '08:00', end: '08:00', location: 'OPD Desk', configuredBy: 'Admin (Workforce HR)' },
  { id: 'SHF-002', empId: 'EMP-002', name: 'Ngozi Adeyemi', date: '2026-06-29', shiftType: 'NIGHT_SHIFT_12H', start: '20:00', end: '08:00', location: 'ICU Ward', configuredBy: 'Admin (Workforce HR)' },
  { id: 'SHF-003', empId: 'EMP-003', name: 'Chidi Nwosu', date: '2026-06-29', shiftType: 'OFF_DUTY', start: '—', end: '—', location: '—', configuredBy: 'Admin (Workforce HR)' },
  { id: 'SHF-004', empId: 'EMP-006', name: 'Mary Okon', date: new Date().toISOString().slice(0, 10), shiftType: 'CASHIER_MORNING_8H', start: '07:00', end: '15:00', location: 'Main Outpatient Cash Desk #01', cashDrawer: 'Drawer A', openingBalance: 20000, configuredBy: 'Admin (Workforce HR)' },
  { id: 'SHF-005', empId: 'EMP-007', name: 'Blessing Ugwu', date: new Date().toISOString().slice(0, 10), shiftType: 'CASHIER_AFTERNOON_8H', start: '14:00', end: '22:00', location: 'Emergency & IPD Cash Desk #02', cashDrawer: 'Drawer B', openingBalance: 15000, configuredBy: 'Admin (Workforce HR)' },
];

const todayIso = new Date().toISOString().slice(0, 10);
const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

let attendanceLogs: any[] = [
  { id: 'ATT-009', empId: 'EMP-009', userId: 'c1fd506d-d642-45bd-84c5-796c5ee31e1b', name: 'Chinedu Okafor', role: 'Chief Financial Officer (CFO)', department: 'Finance & Revenue', date: yesterdayIso, clockIn: '10:40', clockInIso: `${yesterdayIso}T10:40:00`, clockInTimestamp: new Date(`${yesterdayIso}T10:40:00`).getTime(), clockOut: '—', status: 'LATE', source: 'BIOMETRIC_PORTAL', shift: 'Standard Day Shift (07:00 – 15:00)', notes: 'Biometric shift clock-in at Main Outpatient Cash Desk / Finance Directorate' },
  { id: 'ATT-001', empId: 'EMP-006', name: 'Mary Okon', role: 'Senior Cashier & Revenue Officer', department: 'Finance & Revenue', date: todayIso, clockIn: '—', clockOut: '—', status: 'ON_LEAVE', source: 'LEAVE_MANAGEMENT', shift: '07:00 – 15:00 (ON APPROVED ANNUAL LEAVE - RELIEVED BY BLESSING UGWU)' },
  { id: 'ATT-002', empId: 'EMP-007', name: 'Blessing Ugwu', role: 'Cashier / Billing Desk', department: 'Finance & Revenue', date: todayIso, clockIn: '—', clockOut: '—', status: 'SCHEDULED', source: 'ROSTER_SCHEDULE', shift: '07:00 – 15:00 (CASHIER MORNING RELIEF FOR MARY OKON)' },
  { id: 'ATT-003', empId: 'EMP-001', name: 'Dr. Emeka Okafor', role: 'Consultant Physician', department: 'Internal Medicine', date: todayIso, clockIn: '07:55', clockOut: '16:10', status: 'PRESENT', source: 'BIOMETRIC', shift: '08:00 – 16:00 (CLINICAL DAY 8H)' },
  { id: 'ATT-004', empId: 'EMP-002', name: 'Ngozi Adeyemi', role: 'Chief Matron', department: 'Nursing & Inpatient', date: todayIso, clockIn: '07:50', clockOut: '16:00', status: 'PRESENT', source: 'QR_CODE', shift: '08:00 – 16:00 (NURSING MORNING 8H)' },
  { id: 'ATT-005', empId: 'EMP-004', name: 'Dr. David Adeleke', role: 'Medical Officer', department: 'Surgery & Trauma', date: todayIso, clockIn: '08:00', clockOut: '—', status: 'PRESENT', source: 'BIOMETRIC', shift: '08:00 – 16:00 (CLINICAL DAY 8H)' },
  { id: 'ATT-006', empId: 'EMP-008', name: 'Ibrahim Danladi', role: 'Pharmacy Cashier', department: 'Pharmacy & Billing', date: todayIso, clockIn: '08:05', clockOut: '—', status: 'PRESENT', source: 'BIOMETRIC', shift: '08:00 – 16:00 (FINANCE 8H)' },
  { id: 'ATT-007', empId: 'EMP-013', name: 'Emmanuel Vegher', role: 'Chief Consultant Physician', department: 'Clinical & Medical Services', date: todayIso, clockIn: '07:58', clockOut: '16:02', status: 'PRESENT', source: 'BIOMETRIC', shift: '08:00 – 16:00 (CLINICAL CONSULTATION & WARD ROUNDS 8H)' },
  { id: 'ATT-008', empId: 'EMP-005', name: 'Tunde Fashola', role: 'Hospital Administrator', department: 'Hospital Administration', date: todayIso, clockIn: '07:45', clockOut: '—', status: 'PRESENT', source: 'BIOMETRIC', shift: '08:00 – 17:00 (EXECUTIVE ADMIN 9H)' }
];

let leaveRequests: any[] = [
  {
    id: 'LEV-011',
    empId: 'EMP-006',
    name: 'Mary Okon',
    department: 'Finance & Revenue',
    designation: 'Senior Cashier & Revenue Officer',
    type: 'SICK',
    startDate: '2026-09-07',
    endDate: '2026-09-07',
    days: 1,
    reason: 'Medical recuperation and clinical doctor consultation with approved rest order',
    status: 'APPROVED',
    supervisorRecommended: 'Chinedu Okafor (Revenue Unit Lead)',
    approvedBy: 'Amedu Alapa (Hospital Administrator)',
    selectedSupervisor: 'Chinedu Okafor',
    selectedSupervisorEmail: 'chinedu.revenue@faithfoundation.org',
    reliefOfficer: 'Ngozi Adeyemi',
    emergencyPhone: '08034567890',
    createdAt: '2026-09-07T08:00:00Z'
  },
  {
    id: 'LEV-010',
    empId: 'EMP-006',
    name: 'Mary Okon',
    department: 'Finance & Revenue',
    designation: 'Senior Cashier & Revenue Officer',
    type: 'MATERNITY',
    startDate: '2026-09-15',
    endDate: '2026-09-16',
    days: 2,
    reason: 'Proceeding on statutory maternity leave for newborn childcare support. Full till custody, billing clearance keys, and handover briefing completed with relief officer.',
    status: 'PENDING_SUPERVISOR',
    supervisorRecommended: null,
    approvedBy: null,
    selectedSupervisor: 'Chinedu Okafor',
    selectedSupervisorEmail: 'chinedu.revenue@faithfoundation.org',
    reliefOfficer: 'Ngozi Adeyemi',
    emergencyPhone: '08034567890',
    createdAt: '2026-09-14T15:30:00Z'
  },
  {
    id: 'LEV-001',
    empId: 'EMP-006',
    name: 'Mary Okon',
    department: 'Finance & Revenue',
    designation: 'Senior Cashier & Revenue Officer',
    type: 'ANNUAL',
    startDate: '2026-09-14',
    endDate: '2026-09-18',
    days: 5,
    reason: 'Family engagement and annual scheduled personal recess',
    status: 'APPROVED',
    supervisorRecommended: 'Chinedu Okafor (Revenue Unit Lead)',
    approvedBy: 'Amedu Alapa (Hospital Administrator)',
    selectedSupervisor: 'Chinedu Okafor',
    selectedSupervisorEmail: 'chinedu.revenue@faithfoundation.org',
    reliefOfficer: 'Blessing Ugwu',
    emergencyPhone: '08034567890',
    createdAt: '2026-09-02T08:30:00Z'
  },
  {
    id: 'LEV-002',
    empId: 'EMP-002',
    name: 'Ngozi Adeyemi',
    department: 'Nursing Services',
    designation: 'Staff Nurse',
    type: 'SICK',
    startDate: '2026-09-25',
    endDate: '2026-09-26',
    days: 2,
    reason: 'Acute respiratory infection with attending doctor bed rest order',
    status: 'PENDING_ADMIN',
    supervisorRecommended: 'Sr. Beatrice Nwankwo',
    approvedBy: null,
    selectedSupervisor: 'Sr. Beatrice Nwankwo',
    selectedSupervisorEmail: 'beatrice.nursing@faithfoundation.org',
    reliefOfficer: 'Blessing Okafor',
    emergencyPhone: '08076543210',
    createdAt: '2026-09-10T14:15:00Z'
  },
  {
    id: 'LEV-003',
    empId: 'EMP-001',
    name: 'Dr. Emeka Okafor',
    department: 'Clinical Services',
    designation: 'Senior Medical Officer',
    type: 'ANNUAL',
    startDate: '2026-09-08',
    endDate: '2026-09-12',
    days: 5,
    reason: 'Annual scheduled professional leave & retreat',
    status: 'APPROVED',
    supervisorRecommended: 'Dr. Anthony Okonkwo',
    approvedBy: 'Most Rev. Dr. C.V.C. Onaga',
    selectedSupervisor: 'Dr. Anthony Okonkwo',
    selectedSupervisorEmail: 'anthony.clinical@faithfoundation.org',
    reliefOfficer: 'Dr. Chinwe Obi',
    emergencyPhone: '08011223344',
    createdAt: '2026-08-28T09:00:00Z'
  },
  {
    id: 'LEV-004',
    empId: 'EMP-003',
    name: 'Ibrahim Musa',
    department: 'Pharmacy & Therapeutics',
    designation: 'Pharmacist',
    type: 'CASUAL',
    startDate: '2026-09-28',
    endDate: '2026-09-29',
    days: 2,
    reason: 'Out-of-office professional certification workshop',
    status: 'PENDING_SUPERVISOR',
    supervisorRecommended: null,
    approvedBy: null,
    selectedSupervisor: 'Pharm. Kalu Uche',
    selectedSupervisorEmail: 'kalu.pharm@faithfoundation.org',
    reliefOfficer: 'Fatima Garba',
    emergencyPhone: '08099887766',
    createdAt: '2026-09-12T11:20:00Z'
  },
  {
    id: 'LEV-005',
    empId: 'EMP-008',
    name: 'Sr. Blessing Eze',
    department: 'Nursing Services',
    designation: 'Senior Matron / Ward Lead',
    type: 'MATERNITY',
    startDate: '2026-09-02',
    endDate: '2026-09-06',
    days: 5,
    reason: 'Statutory family welfare leave and medical checkup',
    status: 'APPROVED',
    supervisorRecommended: 'Sr. Beatrice Nwankwo',
    approvedBy: 'Most Rev. Dr. C.V.C. Onaga',
    selectedSupervisor: 'Sr. Beatrice Nwankwo',
    selectedSupervisorEmail: 'beatrice.nursing@faithfoundation.org',
    reliefOfficer: 'Ngozi Adeyemi',
    emergencyPhone: '080-4433-2211',
    createdAt: '2026-08-25T10:00:00Z'
  },
  {
    id: 'LEV-006',
    empId: 'EMP-009',
    name: 'Pharm. Kalu Uche',
    department: 'Pharmacy & Therapeutics',
    designation: 'Chief Pharmacist',
    type: 'ANNUAL',
    startDate: '2026-09-14',
    endDate: '2026-09-16',
    days: 3,
    reason: 'Scheduled annual leave & clinical procurement summit',
    status: 'APPROVED',
    supervisorRecommended: 'Dr. Anthony Okonkwo',
    approvedBy: 'Amedu Alapa (Hospital Administrator)',
    selectedSupervisor: 'Dr. Anthony Okonkwo',
    selectedSupervisorEmail: 'anthony.clinical@faithfoundation.org',
    reliefOfficer: 'Ibrahim Musa',
    emergencyPhone: '080-5566-7788',
    createdAt: '2026-09-01T09:00:00Z'
  },
  {
    id: 'LEV-007',
    empId: 'EMP-010',
    name: 'Dr. Chinwe Obi',
    department: 'Clinical Services',
    designation: 'Consultant Paediatrician',
    type: 'COMPASSIONATE',
    startDate: '2026-09-21',
    endDate: '2026-09-23',
    days: 3,
    reason: 'Family bereavement and funeral arrangements',
    status: 'APPROVED',
    supervisorRecommended: 'Dr. Anthony Okonkwo',
    approvedBy: 'Most Rev. Dr. C.V.C. Onaga',
    selectedSupervisor: 'Dr. Anthony Okonkwo',
    selectedSupervisorEmail: 'anthony.clinical@faithfoundation.org',
    reliefOfficer: 'Dr. Emeka Okafor',
    emergencyPhone: '080-9900-1122',
    createdAt: '2026-09-10T08:00:00Z'
  },
  {
    id: 'LEV-008',
    empId: 'EMP-011',
    name: 'Chinedu Okafor',
    department: 'Finance & Revenue',
    designation: 'Revenue Unit Lead & Accountant',
    type: 'STUDY',
    startDate: '2026-09-22',
    endDate: '2026-09-24',
    days: 3,
    reason: 'ICAN / Healthcare Financial Management Accreditation Conference',
    status: 'APPROVED',
    supervisorRecommended: 'Amedu Alapa',
    approvedBy: 'Amedu Alapa (Hospital Administrator)',
    selectedSupervisor: 'Amedu Alapa',
    selectedSupervisorEmail: 'amedu.admin@faithfoundation.org',
    reliefOfficer: 'Mary Okon',
    emergencyPhone: '080-6677-8899',
    createdAt: '2026-09-05T12:00:00Z'
  },
  {
    id: 'LEV-009',
    empId: 'EMP-013',
    name: 'Emmanuel Vegher',
    department: 'Clinical & Medical Services',
    designation: 'Chief Consultant Physician',
    type: 'SICK',
    startDate: '2026-09-10',
    endDate: '2026-09-12',
    days: 3,
    reason: 'Medical recuperation on doctor recommendation',
    status: 'APPROVED',
    supervisorRecommended: 'Dr. Anthony Okonkwo',
    approvedBy: 'Amedu Alapa (Hospital Administrator)',
    selectedSupervisor: 'Dr. Anthony Okonkwo',
    selectedSupervisorEmail: 'anthony.clinical@faithfoundation.org',
    reliefOfficer: 'Grace Danjuma',
    emergencyPhone: '080-1234-5678',
    createdAt: '2026-09-08T11:00:00Z'
  }
];

let appraisals: any[] = [
  {
    id: 'APP-01',
    empId: 'EMP-001',
    name: 'Dr. Emeka Okafor',
    designation: 'Senior Medical Consultant',
    department: 'Clinical Services',
    frequency: 'ANNUAL',
    period: 'FY2025',
    supervisorId: 'ADM-04',
    supervisorName: 'Dr. Nwachukwu',
    supervisorRole: 'Chief Medical Director',
    rating: 4.8,
    comments: 'Excellent clinical judgment, patient management, and team coordination.',
    status: 'COMPLETED',
    evaluatedAt: '2025-12-15'
  },
  {
    id: 'APP-02',
    empId: 'EMP-002',
    name: 'Ngozi Adeyemi',
    designation: 'Senior Staff Nurse',
    department: 'Nursing & Inpatient',
    frequency: 'BI_ANNUAL_H1',
    period: 'H1-2025',
    supervisorId: 'EMP-011',
    supervisorName: 'Ngozi Eze',
    supervisorRole: 'Chief Nursing Officer',
    rating: 4.5,
    comments: 'Highly dedicated, manages shift logs and patient medication adherence very well.',
    status: 'COMPLETED',
    evaluatedAt: '2025-06-28'
  },
  {
    id: 'APP-03',
    empId: 'EMP-003',
    name: 'Kelechi Amadi',
    designation: 'Revenue Officer / Cashier',
    department: 'Finance & Revenue',
    frequency: 'BI_ANNUAL_H2',
    period: 'H2-2025',
    supervisorId: 'EMP-009',
    supervisorName: 'Chinedu Okafor',
    supervisorRole: 'Revenue Unit Lead / Senior Supervisor',
    rating: 4.6,
    comments: 'Zero cashier discrepancy, prompt collection reconciliation and polite customer handling.',
    status: 'COMPLETED',
    evaluatedAt: '2025-12-20'
  }
];

let cpdCourses: any[] = [
  {
    id: 'CPD-01',
    name: 'Advanced Infection Prevention & Control (IPC)',
    category: 'MANDATORY',
    provider: 'National Centre for Disease Control (NCDC)',
    credits: 10,
    durationHours: 16,
    targetAudience: 'All Clinical Staff & Ward Orderlies',
    deliveryMode: 'HYBRID',
    passingScore: 80,
    renewalMonths: 12,
    completedCount: 42,
    totalEnrolled: 48,
    nextDueDate: '2026-10-15',
    status: 'ACTIVE',
    description: 'Comprehensive aseptic techniques, barrier nursing, sterilization validation, antimicrobial surface decontamination, and outbreak containment.'
  },
  {
    id: 'CPD-02',
    name: 'Basic Life Support (BLS) & CPR Certification',
    category: 'MANDATORY',
    provider: 'American Heart Association (AHA) / Resuscitation Council',
    credits: 5,
    durationHours: 8,
    targetAudience: 'All Medical, Nursing, and Allied Staff',
    deliveryMode: 'PRACTICAL_SIMULATION',
    passingScore: 85,
    renewalMonths: 24,
    completedCount: 89,
    totalEnrolled: 92,
    nextDueDate: '2026-12-31',
    status: 'ACTIVE',
    description: 'High-quality CPR for adults, children, and infants, bag-valve-mask ventilation, automated external defibrillator (AED) usage, and foreign-body airway obstruction management.'
  },
  {
    id: 'CPD-03',
    name: 'Advanced Cardiovascular Life Support (ACLS)',
    category: 'CLINICAL_CME',
    provider: 'Nigerian Cardiac Society & AHA',
    credits: 15,
    durationHours: 24,
    targetAudience: 'Physicians, Anaesthetists, ICU & Emergency Nurses',
    deliveryMode: 'PRACTICAL_SIMULATION',
    passingScore: 85,
    renewalMonths: 24,
    completedCount: 28,
    totalEnrolled: 30,
    nextDueDate: '2026-11-20',
    status: 'ACTIVE',
    description: 'Advanced airway management, pharmacology, ECG rhythm interpretation, electrical cardioversion, pacing, and systemic post-cardiac arrest care.'
  },
  {
    id: 'CPD-04',
    name: 'Neonatal Resuscitation Program (NRP)',
    category: 'MANDATORY',
    provider: 'Pediatric Association of Nigeria (PAN)',
    credits: 10,
    durationHours: 12,
    targetAudience: 'Obstetricians, Pediatricians, Midwives & Labor Ward Nurses',
    deliveryMode: 'PRACTICAL_SIMULATION',
    passingScore: 80,
    renewalMonths: 24,
    completedCount: 34,
    totalEnrolled: 36,
    nextDueDate: '2026-11-05',
    status: 'ACTIVE',
    description: 'Evidence-based protocol for resuscitating newborns in the delivery room, positive pressure ventilation, chest compressions, and umbilical vein catheterization.'
  },
  {
    id: 'CPD-05',
    name: 'Safe Blood Transfusion & Hemovigilance Standards',
    category: 'CLINICAL_CME',
    provider: 'National Blood Transfusion Commission (NBTC)',
    credits: 8,
    durationHours: 10,
    targetAudience: 'Laboratory Scientists, Clinicians & Transfusion Nurses',
    deliveryMode: 'WORKSHOP',
    passingScore: 75,
    renewalMonths: 12,
    completedCount: 39,
    totalEnrolled: 44,
    nextDueDate: '2026-09-30',
    status: 'ACTIVE',
    description: 'Cross-matching protocols, acute hemolytic reaction management, cold chain integrity, donor screening algorithms, and hemovigilance incident reporting.'
  },
  {
    id: 'CPD-06',
    name: 'Medical Ethics, Confidentiality & Patient Rights (MDCN Module)',
    category: 'ETHICS_LEGAL',
    provider: 'Medical & Dental Council of Nigeria (MDCN)',
    credits: 10,
    durationHours: 12,
    targetAudience: 'All Medical Doctors, Pharmacists, Nurses & Admin Officers',
    deliveryMode: 'E_LEARNING',
    passingScore: 75,
    renewalMonths: 12,
    completedCount: 45,
    totalEnrolled: 48,
    nextDueDate: '2026-12-15',
    status: 'ACTIVE',
    description: 'Informed consent, NDPR / HIPAA patient data confidentiality, medical malpractice liability avoidance, bioethics in end-of-life care, and statutory disclosure.'
  },
  {
    id: 'CPD-07',
    name: 'Antimicrobial Stewardship & Rational Prescribing',
    category: 'CLINICAL_CME',
    provider: 'Clinical Pharmacy Association of Nigeria & WHO AFRO',
    credits: 8,
    durationHours: 10,
    targetAudience: 'Prescribing Physicians, Clinical Pharmacists, Lab Microbiologists',
    deliveryMode: 'HYBRID',
    passingScore: 80,
    renewalMonths: 12,
    completedCount: 31,
    totalEnrolled: 35,
    nextDueDate: '2026-10-30',
    status: 'ACTIVE',
    description: 'Combating multidrug-resistant hospital pathogens, WHO AWaRe antibiotic framework, hospital antibiogram surveillance, and surgical antibiotic prophylaxis timing.'
  },
  {
    id: 'CPD-08',
    name: 'Emergency Triage Assessment and Treatment (ETAT+)',
    category: 'CLINICAL_CME',
    provider: 'West African College of Physicians (WACP)',
    credits: 12,
    durationHours: 18,
    targetAudience: 'A&E Clinicians, Emergency Nurses & Paramedics',
    deliveryMode: 'WORKSHOP',
    passingScore: 80,
    renewalMonths: 24,
    completedCount: 26,
    totalEnrolled: 28,
    nextDueDate: '2026-12-05',
    status: 'ACTIVE',
    description: 'Rapid identification of emergency and priority signs in acutely ill patients, airway support, shock resuscitation, and rapid triage triage algorithms.'
  },
  {
    id: 'CPD-09',
    name: 'Healthcare Leadership, Supervisory Skills & Clinical Audit',
    category: 'LEADERSHIP',
    provider: 'Institute of Health Service Administrators (IHSAN)',
    credits: 10,
    durationHours: 14,
    targetAudience: 'Heads of Department, Unit Leads, Matrons & Supervisors',
    deliveryMode: 'WORKSHOP',
    passingScore: 75,
    renewalMonths: 24,
    completedCount: 22,
    totalEnrolled: 25,
    nextDueDate: '2026-11-30',
    status: 'ACTIVE',
    description: 'Clinical governance, root cause analysis, shift roster optimization, performance appraisal coaching, and conflict de-escalation.'
  }
];

let cpdRecords: any[] = [
  {
    id: 'REC-001',
    staffId: 'EMP-001',
    staffName: 'Dr. Amina Bello',
    designation: 'Chief Medical Director',
    department: 'Executive Administration',
    courseId: 'CPD-01',
    courseName: 'Advanced Infection Prevention & Control (IPC)',
    creditsEarned: 10,
    completionDate: '2026-04-12',
    expiryDate: '2027-04-12',
    certificateNo: 'NCDC-IPC-2026-9041',
    scorePercent: 96,
    status: 'VALID',
    accreditationBody: 'NCDC / MDCN',
    verifiedBy: 'Dr. Amina Bello (CMD)'
  },
  {
    id: 'REC-002',
    staffId: 'EMP-001',
    staffName: 'Dr. Amina Bello',
    designation: 'Chief Medical Director',
    department: 'Executive Administration',
    courseId: 'CPD-06',
    courseName: 'Medical Ethics, Confidentiality & Patient Rights',
    creditsEarned: 10,
    completionDate: '2026-05-10',
    expiryDate: '2027-05-10',
    certificateNo: 'MDCN-ETH-2026-4412',
    scorePercent: 98,
    status: 'VALID',
    accreditationBody: 'Medical & Dental Council of Nigeria (MDCN)',
    verifiedBy: 'Hospital Ethics Board'
  },
  {
    id: 'REC-003',
    staffId: 'EMP-002',
    staffName: 'Dr. Emeka Okafor',
    designation: 'Consultant Cardiologist',
    department: 'Cardiology & Internal Medicine',
    courseId: 'CPD-03',
    courseName: 'Advanced Cardiovascular Life Support (ACLS)',
    creditsEarned: 15,
    completionDate: '2026-03-20',
    expiryDate: '2028-03-20',
    certificateNo: 'AHA-ACLS-2026-0192',
    scorePercent: 95,
    status: 'VALID',
    accreditationBody: 'AHA / Nigerian Cardiac Society',
    verifiedBy: 'Dr. Amina Bello'
  },
  {
    id: 'REC-004',
    staffId: 'EMP-003',
    staffName: 'Nurse Chioma Adeleke',
    designation: 'Chief Nursing Officer',
    department: 'Nursing Services',
    courseId: 'CPD-02',
    courseName: 'Basic Life Support (BLS) & CPR Certification',
    creditsEarned: 5,
    completionDate: '2026-01-15',
    expiryDate: '2028-01-15',
    certificateNo: 'RC-BLS-2026-7781',
    scorePercent: 92,
    status: 'VALID',
    accreditationBody: 'Resuscitation Council / NMCN',
    verifiedBy: 'Matron Chioma Adeleke'
  },
  {
    id: 'REC-005',
    staffId: 'EMP-004',
    staffName: 'Pharm. Ibrahim Yusuf',
    designation: 'Head of Pharmacy',
    department: 'Pharmacy & Therapeutics',
    courseId: 'CPD-07',
    courseName: 'Antimicrobial Stewardship & Rational Prescribing',
    creditsEarned: 8,
    completionDate: '2026-02-28',
    expiryDate: '2027-02-28',
    certificateNo: 'PCN-AMS-2026-3390',
    scorePercent: 90,
    status: 'VALID',
    accreditationBody: 'Pharmacists Council of Nigeria (PCN)',
    verifiedBy: 'Dr. Amina Bello'
  },
  {
    id: 'REC-006',
    staffId: 'EMP-005',
    staffName: 'Mrs. Funke Akindele',
    designation: 'Revenue Lead',
    department: 'Finance & Accounts',
    courseId: 'CPD-09',
    courseName: 'Healthcare Leadership, Supervisory Skills & Clinical Audit',
    creditsEarned: 10,
    completionDate: '2026-05-02',
    expiryDate: '2028-05-02',
    certificateNo: 'IHSAN-LDR-2026-1120',
    scorePercent: 88,
    status: 'VALID',
    accreditationBody: 'IHSAN',
    verifiedBy: 'Tunde Fashola (Admin)'
  },
  {
    id: 'REC-007',
    staffId: 'EMP-006',
    staffName: 'Dr. Zainab Ahmed',
    designation: 'Consultant Obstetrician',
    department: 'Obstetrics & Gynaecology',
    courseId: 'CPD-04',
    courseName: 'Neonatal Resuscitation Program (NRP)',
    creditsEarned: 10,
    completionDate: '2026-06-11',
    expiryDate: '2028-06-11',
    certificateNo: 'PAN-NRP-2026-5521',
    scorePercent: 94,
    status: 'VALID',
    accreditationBody: 'Pediatric Association of Nigeria',
    verifiedBy: 'Dr. Amina Bello'
  }
];

let payrollHistory: any[] = [
  { id: 'PAY-001', payPeriod: 'June 2026', totalGross: 14200000, deductions: 1850000, netPaid: 12350000, status: 'DISBURSED', processedAt: '2026-06-28', signedByBishop: true, bishopSignatureDate: '2026-06-28', bishopSealApplied: true }
];

// ─── EPISCOPAL WORKFLOW DATA STORES ───────────────────────────────────────────

let adminTimesheets: any[] = [
  {
    id: 'TS-001',
    month: 'June 2026',
    submittedBy: 'Tunde Fashola',
    submittedByRole: 'Hospital Administrator',
    submittedAt: '2026-06-28T10:00:00Z',
    daysWorked: 22,
    overtimeHours: 5,
    leavesTaken: 2,
    totalHospitalDays: 26,
    remarks: 'All administration duties completed for June. Monthly reports filed and archived. Budget variance report submitted to Finance. Staff coordination meetings conducted.',
    status: 'PENDING_BISHOP_REVIEW',
    bishopComment: null,
    bishopDecisionDate: null
  },
  {
    id: 'TS-002',
    month: 'May 2026',
    submittedBy: 'Tunde Fashola',
    submittedByRole: 'Hospital Administrator',
    submittedAt: '2026-05-30T09:30:00Z',
    daysWorked: 21,
    overtimeHours: 3,
    leavesTaken: 0,
    totalHospitalDays: 22,
    remarks: 'Full attendance. Supervised hospital-wide audit exercise in collaboration with the Internal Auditor.',
    status: 'APPROVED',
    bishopComment: 'Excellent service delivery for May. Well done.',
    bishopDecisionDate: '2026-05-31'
  }
];

let bishopAuditLog: any[] = [
  {
    id: 'BAL-001',
    type: 'PAYROLL_SIGNED',
    referenceId: 'PAY-001',
    title: 'Payroll for June 2026 — Episcopal Seal Applied',
    decidedBy: 'Bishop',
    decisionDate: '2026-06-28',
    action: 'APPROVED',
    amount: 12350000,
    remarks: 'All staff salaries verified and authorized for disbursement.'
  },
  {
    id: 'BAL-002',
    type: 'TIMESHEET_APPROVED',
    referenceId: 'TS-002',
    title: 'Admin Timesheet — May 2026 Approved',
    decidedBy: 'Bishop',
    decisionDate: '2026-05-31',
    action: 'APPROVED',
    amount: null,
    remarks: 'Excellent service delivery for May. Well done.'
  },
  {
    id: 'BAL-003',
    type: 'PROJECT_APPROVED',
    referenceId: 'REQ-006',
    title: 'Advanced MRI Imaging Unit Procurement — Cleared',
    decidedBy: 'Bishop',
    decisionDate: '2026-07-14',
    action: 'APPROVED',
    amount: 85000000,
    remarks: 'Critical diagnostic equipment. Approved subject to procurement committee oversight.'
  }
];

let governanceRisks: any[] = [
  { id: 'HRK-01', category: 'COMPLIANCE', title: 'Expired professional practice license risk', impact: 'HIGH', likelihood: 'MEDIUM', mitigation: 'Automated 30-day dashboard notifications & auto-suspension triggers', status: 'ACTIVE' },
  { id: 'HRK-02', category: 'SUCCESSION', title: 'Single Consultant dependency in Pediatric ICU', impact: 'CRITICAL', likelihood: 'HIGH', mitigation: 'Approved locum consultants framework', status: 'ACTIVE' }
];

// ─────────────────────────────────────────────────────────────────────────────
// §19.1 - EMPLOYEE RECORDS, VACANCIES & CREDENTIALING - Updated
// ─────────────────────────────────────────────────────────────────────────────

export const getLiveEmployeesList = async (): Promise<any[]> => {
  try {
    const dbStaff = await prisma.staff.findMany({
      include: { user: true }
    });

    const meta = loadEmployeeMetadata();
    const list = [...employees];

    for (const s of dbStaff) {
      const index = list.findIndex(e => e.id === s.employeeId);
      const m = meta[s.employeeId];

      const mappedEmp = {
        id: s.employeeId,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.user?.email || '',
        phone: m?.phone || '080-0000-0000',
        role: s.designation || 'Staff',
        department: s.department || '',
        status: m?.status || (s.isActive ? 'ACTIVE' : 'INACTIVE'),
        salaryGrade: m?.salaryGrade || 'L8-Step 1',
        baseSalary: m?.baseSalary || 120000,
        bankName: m?.bankName || 'Access Bank',
        accountNo: m?.accountNo || '0000000000',
        licenseNo: s.licenseNumber || 'N/A',
        licenseExpiry: m?.licenseExpiry || '2099-12-31',
        fundingSource: m?.fundingSource || 'HOSPITAL_FUNDED',
        donorProgramme: m?.donorProgramme || undefined,
        pensionPin: m?.pensionPin || list[index]?.pensionPin || 'PEN1009849201 (Stanbic IBTC)',
        taxId: m?.taxId || list[index]?.taxId || 'TIN-BEN-2026-9941',
        designation: m?.designation || s.designation || list[index]?.designation || list[index]?.role || 'Staff',
        profilePicture: s.user?.profilePicture || undefined,
        queries: m?.queries || []
      };

      if (index !== -1) {
        list[index] = {
          ...list[index],
          ...mappedEmp,
          phone: m?.phone || list[index].phone || mappedEmp.phone,
          status: m?.status || list[index].status || mappedEmp.status,
          salaryGrade: m?.salaryGrade || list[index].salaryGrade || mappedEmp.salaryGrade,
          baseSalary: m?.baseSalary || list[index].baseSalary || mappedEmp.baseSalary,
          bankName: m?.bankName || list[index].bankName || mappedEmp.bankName,
          accountNo: m?.accountNo || list[index].accountNo || mappedEmp.accountNo,
          licenseExpiry: m?.licenseExpiry || list[index].licenseExpiry || mappedEmp.licenseExpiry,
          fundingSource: m?.fundingSource || list[index].fundingSource || mappedEmp.fundingSource,
          donorProgramme: m?.donorProgramme || list[index].donorProgramme || undefined,
          pensionPin: m?.pensionPin || list[index].pensionPin || mappedEmp.pensionPin,
          taxId: m?.taxId || list[index].taxId || mappedEmp.taxId,
          designation: m?.designation || list[index].designation || mappedEmp.designation,
          profilePicture: s.user?.profilePicture || list[index].profilePicture || undefined,
          queries: m?.queries || list[index].queries || []
        };
      } else {
        list.push(mappedEmp);
      }
    }
    return list;
  } catch (err) {
    return employees;
  }
};

router.get('/employees', async (req: Request, res: Response) => {
  try {
    const list = await getLiveEmployeesList();
    res.json({ success: true, data: list, total: list.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch employees' });
  }
});

const mapJobRoleToSystemRole = (jobRole: string): string => {
  const r = jobRole?.trim().toLowerCase() || '';
  if (r.includes('doctor') || r.includes('pathologist') || r.includes('radiologist') || r.includes('physiotherapist')) return 'DOCTOR';
  if (r.includes('nurse')) return 'NURSE';
  if (r.includes('pharmacist')) return 'PHARMACIST';
  if (r.includes('lab') || r.includes('technician')) return 'LAB_TECHNICIAN';
  if (r.includes('receptionist') || r.includes('record officer')) return 'RECEPTIONIST';
  if (r.includes('admin')) return 'ADMIN';
  if (r.includes('super')) return 'SUPER_ADMIN';
  return 'STAFF';
};

router.post('/employees', async (req: Request, res: Response) => {
  try {
    let empId = req.body.id;
    if (!empId) {
      empId = `EMP-${String(employees.length + 1).padStart(3, '0')}`;
    }

    const existingEmp = await prisma.staff.findUnique({ where: { employeeId: empId } });
    if (existingEmp) {
      return res.status(400).json({ success: false, message: 'Staff ID / Employee ID is already registered' });
    }

    const existingUser = await prisma.user.findUnique({ where: { username: empId } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username matching this Staff ID is already taken' });
    }

    if (req.body.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: req.body.email } });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email address is already registered' });
      }
    }

    const systemRole = mapJobRoleToSystemRole(req.body.role);
    const hashedPassword = bcrypt.hashSync(empId, 12);

    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: empId,
          email: req.body.email,
          passwordHash: hashedPassword,
          isTemporaryPassword: true,
          isActive: true,
          role: systemRole as any,
          profilePicture: req.body.profilePicture || null,
        },
      });

      await tx.staff.create({
        data: {
          userId: newUser.id,
          employeeId: empId,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          department: req.body.department,
          designation: req.body.role,
          specialization: req.body.specialization || null,
          licenseNumber: req.body.licenseNo || null,
          isActive: true,
        },
      });

      const roleObj = await tx.role.findFirst({
        where: { name: { equals: systemRole, mode: 'insensitive' } },
      });
      if (roleObj) {
        await tx.userRoleMapping.create({
          data: {
            userId: newUser.id,
            roleId: roleObj.id,
          },
        });
      }

      const deptObj = await tx.department.findFirst({
        where: {
          OR: [
            { name: { equals: req.body.department, mode: 'insensitive' } },
            { code: { equals: req.body.department, mode: 'insensitive' } },
          ],
        },
      });
      if (deptObj) {
        await tx.userDepartment.create({
          data: {
            userId: newUser.id,
            departmentId: deptObj.id,
          },
        });
      }
    });

    const meta = loadEmployeeMetadata();
    meta[empId] = {
      id: empId,
      phone: req.body.phone,
      salaryGrade: req.body.salaryGrade,
      baseSalary: req.body.baseSalary ? Number(req.body.baseSalary) : undefined,
      bankName: req.body.bankName,
      accountNo: req.body.accountNo,
      fundingSource: req.body.fundingSource,
      donorProgramme: req.body.donorProgramme,
      licenseExpiry: req.body.licenseExpiry,
      pensionPin: req.body.pensionPin,
      taxId: req.body.taxId,
      designation: req.body.designation || req.body.role,
    };
    saveEmployeeMetadata(meta);

    const emp = {
      id: empId,
      ...req.body,
      status: 'ACTIVE',
      pensionPin: req.body.pensionPin || 'PEN1009849201 (Stanbic IBTC)',
      taxId: req.body.taxId || 'TIN-BEN-2026-9941',
      designation: req.body.designation || req.body.role || 'Staff'
    };
    employees.unshift(emp);
    await logAudit({ userId: (req as any).user?.id, action: 'CREATE_EMPLOYEE_RECORD', resourceType: 'Employee', resourceId: emp.id, changes: emp });
    res.status(201).json({ success: true, data: emp });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create employee record' });
  }
});

router.put('/employees/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newId = req.body.id || id;

    const staffObj = await prisma.staff.findUnique({
      where: { employeeId: id },
      include: { user: true },
    });

    const index = employees.findIndex(e => e.id === id);
    if (!staffObj && index === -1) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (newId !== id) {
      const existingEmp = await prisma.staff.findUnique({ where: { employeeId: newId } });
      if (existingEmp) {
        return res.status(400).json({ success: false, message: 'Staff ID / Employee ID is already registered' });
      }
      const existingUser = await prisma.user.findUnique({ where: { username: newId } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Username matching this Staff ID is already taken' });
      }
    }

    if (req.body.email && staffObj && staffObj.user && req.body.email !== staffObj.user.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: req.body.email } });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email address is already registered' });
      }
    }

    if (staffObj) {
      const systemRole = req.body.role ? mapJobRoleToSystemRole(req.body.role) : undefined;
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: staffObj.userId },
          data: {
            username: newId !== id ? newId : undefined,
            email: req.body.email || undefined,
            role: systemRole ? (systemRole as any) : undefined,
            profilePicture: req.body.profilePicture || undefined,
          },
        });

        if (systemRole) {
          await tx.userRoleMapping.deleteMany({
            where: { userId: staffObj.userId },
          });

          const roleObj = await tx.role.findFirst({
            where: { name: { equals: systemRole, mode: 'insensitive' } },
          });
          if (roleObj) {
            await tx.userRoleMapping.create({
              data: {
                userId: staffObj.userId,
                roleId: roleObj.id,
              },
            });
          }
        }

        await tx.staff.update({
          where: { id: staffObj.id },
          data: {
            employeeId: newId !== id ? newId : undefined,
            firstName: req.body.firstName || undefined,
            lastName: req.body.lastName || undefined,
            department: req.body.department || undefined,
            designation: req.body.role || undefined,
            licenseNumber: req.body.licenseNo || undefined,
          },
        });
      });
    } else if (index !== -1) {
      const emp = employees[index];
      const updatedRole = req.body.role || emp.role;
      const systemRole = mapJobRoleToSystemRole(updatedRole);
      const hashedPassword = bcrypt.hashSync(newId, 12);

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: newId },
            { email: req.body.email || emp.email || `${(req.body.firstName || emp.firstName).toLowerCase()}@hospital.com` }
          ]
        }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            username: newId,
            email: req.body.email || emp.email || `${(req.body.firstName || emp.firstName).toLowerCase()}@hospital.com`,
            passwordHash: hashedPassword,
            isTemporaryPassword: true,
            isActive: true,
            role: systemRole as any,
          }
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: systemRole as any }
        });
      }

      await prisma.staff.create({
        data: {
          userId: user.id,
          employeeId: newId,
          firstName: req.body.firstName || emp.firstName,
          lastName: req.body.lastName || emp.lastName || '',
          department: req.body.department || emp.department,
          designation: updatedRole,
          isActive: true,
        }
      });
    }

    const meta = loadEmployeeMetadata();
    meta[newId] = {
      id: newId,
      phone: req.body.phone,
      salaryGrade: req.body.salaryGrade,
      baseSalary: req.body.baseSalary ? Number(req.body.baseSalary) : undefined,
      bankName: req.body.bankName,
      accountNo: req.body.accountNo,
      fundingSource: req.body.fundingSource,
      donorProgramme: req.body.donorProgramme,
      licenseExpiry: req.body.licenseExpiry,
      pensionPin: req.body.pensionPin,
      taxId: req.body.taxId,
      designation: req.body.designation || req.body.role,
    };
    if (newId !== id) {
      delete meta[id];
    }
    saveEmployeeMetadata(meta);

    const updatedEmp = {
      id: newId,
      firstName: req.body.firstName || staffObj?.firstName || '',
      lastName: req.body.lastName || staffObj?.lastName || '',
      email: req.body.email || staffObj?.user?.email || '',
      phone: req.body.phone || '080-0000-0000',
      role: req.body.role || staffObj?.designation || 'Staff',
      designation: req.body.designation || req.body.role || staffObj?.designation || 'Staff',
      department: req.body.department || staffObj?.department || '',
      status: staffObj?.isActive ? 'ACTIVE' : 'INACTIVE',
      salaryGrade: req.body.salaryGrade || 'L8-Step 1',
      baseSalary: req.body.baseSalary ? Number(req.body.baseSalary) : 120000,
      bankName: req.body.bankName || 'Access Bank',
      accountNo: req.body.accountNo || '0000000000',
      licenseNo: req.body.licenseNo || staffObj?.licenseNumber || 'N/A',
      licenseExpiry: req.body.licenseExpiry || '2099-12-31',
      fundingSource: req.body.fundingSource || 'HOSPITAL_FUNDED',
      donorProgramme: req.body.donorProgramme || undefined,
      pensionPin: req.body.pensionPin || 'PEN1009849201 (Stanbic IBTC)',
      taxId: req.body.taxId || 'TIN-BEN-2026-9941',
    };

    if (index !== -1) {
      employees[index] = { ...employees[index], ...updatedEmp };
    } else {
      employees.unshift(updatedEmp);
    }

    await logAudit({ userId: (req as any).user?.id, action: 'UPDATE_EMPLOYEE_RECORD', resourceType: 'Employee', resourceId: newId, changes: req.body });
    res.json({ success: true, data: updatedEmp });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update employee record' });
  }
});

router.patch('/employees/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const index = employees.findIndex(e => e.id === id);
    
    const meta = loadEmployeeMetadata();
    if (!meta[id]) meta[id] = { id };
    meta[id].status = status;
    saveEmployeeMetadata(meta);

    if (index !== -1) {
      employees[index].status = status;
    }
    
    // Sync with database if staff exists
    const staffObj = await prisma.staff.findUnique({ where: { employeeId: id } });
    if (staffObj) {
      const active = status === 'ACTIVE' || status === 'ON_LEAVE' || status === 'MATERNITY_LEAVE';
      await prisma.staff.update({
        where: { id: staffObj.id },
        data: { isActive: active }
      });
      await prisma.user.update({
        where: { id: staffObj.userId },
        data: { isActive: active }
      });
    }

    await logAudit({ userId: (req as any).user?.id, action: 'UPDATE_EMPLOYEE_STATUS', resourceType: 'Employee', resourceId: id, changes: { to: status } });
    res.json({ success: true, message: 'Employee status updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update employee status' });
  }
});

router.delete('/employees/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = employees.findIndex(e => e.id === id);
    let emp = null;
    if (index !== -1) {
      emp = employees[index];
      employees.splice(index, 1);
    }

    const staffObj = await prisma.staff.findUnique({
      where: { employeeId: id },
    });

    if (staffObj) {
      try {
        // Cascade deletes associated Staff record
        await prisma.user.delete({
          where: { id: staffObj.userId },
        });
      } catch (dbErr) {
        // Soft delete if foreign key constraints exist
        await prisma.user.update({
          where: { id: staffObj.userId },
          data: { isActive: false },
        });
        await prisma.staff.update({
          where: { id: staffObj.id },
          data: { isActive: false },
        });
      }
    }

    const meta = loadEmployeeMetadata();
    delete meta[id];
    saveEmployeeMetadata(meta);

    await logAudit({ userId: (req as any).user?.id, action: 'DELETE_EMPLOYEE_RECORD', resourceType: 'Employee', resourceId: id, changes: emp });
    res.json({ success: true, message: 'Employee record deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete employee record' });
  }
});

router.get('/vacancies', (req: Request, res: Response) => {
  res.json({ success: true, data: vacancies });
});

router.post('/vacancies', async (req: Request, res: Response) => {
  try {
    const vac = { id: `VAC-${String(vacancies.length + 1).padStart(2, '0')}`, ...req.body, status: 'OPEN', datePosted: new Date().toISOString().slice(0, 10) };
    vacancies.unshift(vac);
    await logAudit({ userId: (req as any).user?.id, action: 'CREATE_VACANCY', resourceType: 'Vacancy', resourceId: vac.id, changes: vac });
    res.status(201).json({ success: true, data: vac });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to post vacancy' });
  }
});

router.put('/vacancies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = vacancies.findIndex(v => v.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Vacancy not found' });
    vacancies[index] = { ...vacancies[index], ...req.body };
    await logAudit({ userId: (req as any).user?.id, action: 'UPDATE_VACANCY', resourceType: 'Vacancy', resourceId: id, changes: req.body });
    res.json({ success: true, data: vacancies[index] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update vacancy' });
  }
});

router.patch('/vacancies/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const index = vacancies.findIndex(v => v.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Vacancy not found' });
    const old = vacancies[index].status;
    vacancies[index].status = status;
    await logAudit({ userId: (req as any).user?.id, action: 'UPDATE_VACANCY_STATUS', resourceType: 'Vacancy', resourceId: id, changes: { from: old, to: status } });
    res.json({ success: true, data: vacancies[index] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update vacancy status' });
  }
});

router.delete('/vacancies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = vacancies.findIndex(v => v.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Vacancy not found' });
    const vac = vacancies[index];
    vacancies.splice(index, 1);
    await logAudit({ userId: (req as any).user?.id, action: 'DELETE_VACANCY', resourceType: 'Vacancy', resourceId: id, changes: vac });
    res.json({ success: true, message: 'Vacancy deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete vacancy' });
  }
});

// §19.1.3 - CREDENTIALS — derived from employee records with license data
router.get('/credentials', (req: Request, res: Response) => {
  const clinical = employees.filter(e => e.licenseNo && e.licenseNo !== 'N/A');
  const now = new Date();
  const withDays = clinical.map(e => {
    const expiry = new Date(e.licenseExpiry);
    const daysLeft = Math.round((expiry.getTime() - now.getTime()) / 86400000);
    return { ...e, daysLeft, isExpired: daysLeft < 0, licenseStatus: daysLeft < 0 ? 'EXPIRED' : 'ACTIVE' };
  });
  res.json({ success: true, data: withDays, total: withDays.length });
});

router.patch('/credentials/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = employees.findIndex(e => e.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Employee not found' });
    const { licenseNo, licenseExpiry } = req.body;
    if (licenseNo !== undefined) employees[index].licenseNo = licenseNo;
    if (licenseExpiry !== undefined) employees[index].licenseExpiry = licenseExpiry;
    await logAudit({ userId: (req as any).user?.id, action: 'UPDATE_CREDENTIAL', resourceType: 'Employee', resourceId: id, changes: req.body });
    res.json({ success: true, data: employees[index] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update credential' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §19.2 - ATTENDANCE, ROSTERING & LEAVE
// ─────────────────────────────────────────────────────────────────────────────

export function recordShiftClockInAttendance(cashierName: string, cashierId: string, shiftWindow?: string) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const existing = attendanceLogs.find(a => a.name && a.name.toLowerCase().includes(cashierName.toLowerCase()) && a.date === todayStr);
  if (existing) {
    existing.status = 'PRESENT';
    existing.clockIn = nowTime;
    existing.source = 'CASHIER_TILL_CLOCKIN';
    return existing;
  }
  const emp = employees.find(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(cashierName.toLowerCase()) || e.id === cashierId);
  const newLog = {
    id: `ATT-${Date.now()}`,
    empId: emp?.id || `EMP-${cashierId || 'REV'}`,
    name: cashierName,
    date: todayStr,
    clockIn: nowTime,
    clockOut: '—',
    status: 'PRESENT',
    source: 'CASHIER_TILL_CLOCKIN',
    shift: shiftWindow || 'Morning Shift'
  };
  attendanceLogs.unshift(newLog);
  return newLog;
}

export function recordShiftClockOutAttendance(cashierName: string, cashierId: string) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const isMary = String(cashierId).toLowerCase().includes('mary') || cashierId === 'EMP-006' || cashierId === 'cashier' || (cashierName && cashierName.toLowerCase().includes('mary'));
  const existing = attendanceLogs.find(a => 
    (a.empId === cashierId || (a.name && cashierName && a.name.toLowerCase().includes(cashierName.toLowerCase())) || (isMary && (a.empId === 'EMP-006' || a.name?.toLowerCase().includes('mary')))) && 
    (!a.clockOut || a.clockOut === '—' || a.clockOut === '')
  ) || attendanceLogs.find(a => 
    (a.empId === cashierId || (a.name && cashierName && a.name.toLowerCase().includes(cashierName.toLowerCase())) || (isMary && (a.empId === 'EMP-006' || a.name?.toLowerCase().includes('mary')))) && 
    a.date === todayStr
  );
  if (existing) {
    existing.clockOut = nowTime;
    existing.clockOutIso = new Date().toISOString();
    return existing;
  }
}

export const computeAttendanceHours = (a: any): string => {
  if (!a || a.status === 'ABSENT' || !a.clockIn || a.clockIn === '—' || !a.clockOut || a.clockOut === '—') {
    return a?.status === 'ABSENT' ? '0h 0m' : (a?.hours || '0h 0m');
  }

  // 1. Try ISO timestamps if available and on valid dates
  if (a.clockInIso && a.clockOutIso) {
    const tIn = new Date(a.clockInIso).getTime();
    const tOut = new Date(a.clockOutIso).getTime();
    if (!isNaN(tIn) && !isNaN(tOut) && tOut >= tIn) {
      const diffMin = Math.round((tOut - tIn) / 60000);
      const hrs = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      return `${hrs}h ${mins}m`;
    }
  }

  // 2. Parse time strings "HH:mm"
  const inMatch = String(a.clockIn).match(/(\d{1,2}):(\d{2})/);
  const outMatch = String(a.clockOut).match(/(\d{1,2}):(\d{2})/);
  if (inMatch && outMatch) {
    const inH = parseInt(inMatch[1], 10);
    const inM = parseInt(inMatch[2], 10);
    const outH = parseInt(outMatch[1], 10);
    const outM = parseInt(outMatch[2], 10);

    let diffMin = (outH * 60 + outM) - (inH * 60 + inM);
    if (diffMin < 0) {
      diffMin += 24 * 60; // Overnight shift
    }
    const hrs = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${hrs}h ${mins}m`;
  }

  return a.hours || '0h 0m';
};

export const isClockInLate = (clockInStr?: string, shiftStr?: string): boolean => {
  if (!clockInStr || clockInStr === '—' || !shiftStr) return false;
  const match = shiftStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return false;
  const shiftStartHour = parseInt(match[1], 10);
  const shiftStartMinute = parseInt(match[2], 10);
  const shiftStartMinutes = shiftStartHour * 60 + shiftStartMinute;

  const clockInMatch = clockInStr.match(/(\d{1,2}):(\d{2})/);
  if (!clockInMatch) return false;
  const clockInHour = parseInt(clockInMatch[1], 10);
  const clockInMinute = parseInt(clockInMatch[2], 10);
  const clockInMinutes = clockInHour * 60 + clockInMinute;

  return clockInMinutes > shiftStartMinutes + 5;
};

router.get('/attendance', (req: Request, res: Response) => {
  const { date, dept, search } = req.query;
  const targetDate = (date as string) || new Date().toISOString().slice(0, 10);
  let logsForDate = attendanceLogs.filter(a => a.date === targetDate);

  // Auto-flag late arrivals and calculate accurate hours for all completed punch logs
  logsForDate.forEach(a => {
    if (a.clockIn && a.clockIn !== '—' && isClockInLate(a.clockIn, a.shift)) {
      a.status = 'LATE';
    }
    if (a.clockIn && a.clockIn !== '—' && a.clockOut && a.clockOut !== '—') {
      a.hours = computeAttendanceHours(a);
    }
  });

  // Synthesize absent records for rostered staff without punch logs or active shifts on requested date
  const dayNum = parseInt(targetDate.split('-')[2], 10) || new Date().getDate();
  const absentLogs: any[] = [];
  const isToday = targetDate === new Date().toISOString().slice(0, 10);

  employees.forEach(emp => {
    // Check if employee already has a punch log
    const hasPunch = logsForDate.some(a => (a.empId === emp.id || a.userId === emp.id) && a.status !== 'ABSENT' && a.clockIn && a.clockIn !== '—');
    const hasActiveSession = attendanceLogs.some(a => 
      (a.empId === emp.id || a.userId === emp.id) &&
      a.status !== 'ABSENT' &&
      a.clockIn && a.clockIn !== '—' &&
      (!a.clockOut || a.clockOut === '—' || a.clockOut === '')
    );
    const hasActiveShift = cashierShifts.some(s =>
      (s.cashierId === emp.id || s.userId === emp.id) &&
      s.status === 'OPEN'
    );

    if (!hasPunch && !hasActiveSession && !hasActiveShift) {
      // Check if scheduled on roster
      const schedule = STAFF_ROSTER_SCHEDULES[emp.id];
      const isRostered = schedule && schedule.days.includes(dayNum);
      const isShiftScheduled = rosterShifts.some(s => s.empId === emp.id && s.date === targetDate && s.shiftType !== 'OFF_DUTY');

      if (isRostered || isShiftScheduled) {
        absentLogs.push({
          id: `ATT-ABSENT-${emp.id}-${targetDate}`,
          empId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          role: emp.role || 'Staff Officer',
          department: emp.department || 'Clinical / Revenue',
          date: targetDate,
          clockIn: '—',
          clockOut: '—',
          hours: '0h 0m',
          status: 'ABSENT',
          source: 'DUTY_ROSTER_SCHEDULE',
          shift: schedule?.shiftName || 'Standard Day Shift (08:00 – 16:00)',
          notes: 'Configured on duty roster for shift but did not clock in'
        });
      }
    }
  });

  // If viewing today, also bring in any ongoing active sessions that started on previous dates
  let ongoingSessions: any[] = [];
  if (isToday) {
    ongoingSessions = attendanceLogs.filter(a =>
      a.date !== targetDate &&
      a.status !== 'ABSENT' &&
      a.clockIn && a.clockIn !== '—' &&
      (!a.clockOut || a.clockOut === '—' || a.clockOut === '') &&
      !logsForDate.some(existing => existing.id === a.id)
    );
  }

  let filtered = [...logsForDate, ...ongoingSessions, ...absentLogs];

  if (dept && dept !== 'ALL' && dept !== 'All') {
    filtered = filtered.filter(a => (a.department || '').toLowerCase().includes((dept as string).toLowerCase()) || (a.role || '').toLowerCase().includes((dept as string).toLowerCase()));
  }
  if (search) {
    const q = (search as string).toLowerCase();
    filtered = filtered.filter(a => (a.name || '').toLowerCase().includes(q) || (a.empId || '').toLowerCase().includes(q) || (a.shift || '').toLowerCase().includes(q));
  }

  res.json({ success: true, data: filtered, total: filtered.length });
});

// GET /hr/attendance/status or /hr/attendance/status/:empId — Get current clock-in state
const handleAttendanceStatus = (req: Request, res: Response) => {
  const reqUser = (req as any).user || {};
  const queryName = String(req.query.staffName || req.query.name || '').toLowerCase();
  const queryUsername = String(req.query.username || '').toLowerCase();
  const queryEmail = String(req.query.email || '').toLowerCase();
  const queryStaffId = String(req.query.staffId || '').toLowerCase();

  const empId = req.params.empId || reqUser.id || reqUser.staffId || reqUser.empId || reqUser.username || queryStaffId || queryUsername || '';
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const currentFullName = (`${reqUser.firstName || ''} ${reqUser.lastName || ''}`.trim().toLowerCase()) || queryName;
  const currentUsername = String(reqUser.username || '').toLowerCase() || queryUsername;
  const currentEmail = String(reqUser.email || '').toLowerCase() || queryEmail;
  const currentStaffId = String(reqUser.staffId || reqUser.empId || '').toLowerCase() || queryStaffId;
  const currentId = String(reqUser.id || '').toLowerCase();
  const targetId = String(empId).toLowerCase();

  const emp = employees.find(e => 
    (e.id && e.id.toLowerCase() === targetId) || 
    (e.staffId && e.staffId.toLowerCase() === targetId) || 
    (e.email && e.email.toLowerCase() === targetId) ||
    (currentId && e.id?.toLowerCase() === currentId) ||
    (currentEmail && e.email?.toLowerCase() === currentEmail) ||
    (currentFullName && `${e.firstName} ${e.lastName}`.toLowerCase().includes(currentFullName)) ||
    (currentFullName && currentFullName.includes(`${e.firstName} ${e.lastName}`.toLowerCase())) ||
    (currentFullName && (currentFullName.includes('okon') || currentFullName.includes('mary')) && e.id === 'EMP-006') ||
    (targetId && (targetId.includes('d8496374') || targetId === 'cashier') && e.id === 'EMP-006') ||
    (currentId && currentId.includes('d8496374') && e.id === 'EMP-006')
  );
  const empName = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : '';
  const isMary = targetId.includes('mary') || targetId.includes('okon') || targetId === 'emp-006' || targetId === 'cashier' || targetId.includes('d8496374') || currentId.includes('d8496374') || currentFullName.includes('mary') || currentFullName.includes('okon') || (empName && (empName.includes('mary') || empName.includes('okon')));
  const isChinedu = targetId.includes('chinedu') || currentFullName.includes('chinedu') || currentUsername.includes('chinedu') || (empName && empName.includes('chinedu')) || targetId === 'emp-009' || currentStaffId === 'emp-009' || currentId === 'c1fd506d-d642-45bd-84c5-796c5ee31e1b';
  const isEmeka = targetId.includes('emeka') || currentFullName.includes('emeka') || currentUsername.includes('emeka') || (empName && empName.includes('emeka')) || targetId === 'emp-001' || currentStaffId === 'emp-001';

  const matchesLog = (a: any) => {
    if (!a) return false;
    const aEmp = String(a.empId || '').toLowerCase();
    const aUser = String(a.userId || '').toLowerCase();
    const aName = String(a.name || '').toLowerCase();

    if (targetId && (aEmp === targetId || aUser === targetId)) return true;
    if (currentId && (aEmp === currentId || aUser === currentId)) return true;
    if (currentStaffId && (aEmp === currentStaffId || aUser === currentStaffId)) return true;
    if (emp && aEmp === emp.id?.toLowerCase()) return true;
    if (isChinedu && (aName.includes('chinedu') || aEmp === 'emp-009' || aUser === 'c1fd506d-d642-45bd-84c5-796c5ee31e1b')) return true;
    if (isEmeka && (aName.includes('emeka') || aEmp === 'emp-001')) return true;
    if (isMary) {
      if (aEmp === 'emp-006' || aUser === 'cashier' || aUser === 'emp-006' || aUser.includes('d8496374') || aEmp.includes('d8496374')) return true;
      if (aName.includes('mary') || aName.includes('okon')) return true;
      return false;
    }
    const isGenericRole = ['cashier', 'admin', 'nurse', 'doctor', 'pharmacist', 'lab', 'user', 'staff', 'cfo', 'accountant'].includes(currentUsername);
    if (currentFullName && aName && (aName.includes(currentFullName) || currentFullName.includes(aName))) return true;
    if (currentUsername && (aEmp === currentUsername || aUser === currentUsername || (!isGenericRole && aName.includes(currentUsername)))) return true;
    return false;
  };

  const matchesShift = (s: any) => {
    if (!s) return false;
    const sCashier = String(s.cashierId || '').toLowerCase();
    const sUser = String(s.userId || '').toLowerCase();
    const sName = String(s.cashierName || '').toLowerCase();

    if (targetId && (sCashier === targetId || sUser === targetId)) return true;
    if (currentId && (sCashier === currentId || sUser === currentId)) return true;
    if (currentStaffId && (sCashier === currentStaffId || sUser === currentStaffId)) return true;
    if (emp && sCashier === emp.id?.toLowerCase()) return true;
    if (isChinedu && (sName.includes('chinedu') || sCashier === 'emp-009' || sUser === 'c1fd506d-d642-45bd-84c5-796c5ee31e1b')) return true;
    if (isEmeka && (sName.includes('emeka') || sCashier === 'emp-001')) return true;
    if (isMary) {
      if (sCashier === 'cashier' || sCashier === 'emp-006' || sUser === 'cashier' || sCashier.includes('d8496374') || sUser.includes('d8496374')) return true;
      if (sName.includes('mary') || sName.includes('okon')) return true;
      return false;
    }
    const isGenericRole = ['cashier', 'admin', 'nurse', 'doctor', 'pharmacist', 'lab', 'user', 'staff', 'cfo', 'accountant'].includes(currentUsername);
    if (currentFullName && sName && (sName.includes(currentFullName) || currentFullName.includes(sName))) return true;
    if (currentUsername && (sCashier === currentUsername || sUser === currentUsername || (!isGenericRole && sName.includes(currentUsername)))) return true;
    return false;
  };

  // Prioritize active (un-clocked-out) log first (even if started on previous days for 24h/48h shifts)
  let activeLog = attendanceLogs.find(a => matchesLog(a) && a.status !== 'ABSENT' && a.clockIn && a.clockIn !== '—' && (!a.clockOut || a.clockOut === '—' || a.clockOut === ''));

  // If not currently clocked in, find the latest log for today or recent
  let todayLog = activeLog || attendanceLogs.find(a => matchesLog(a) && a.date === todayStr);

  // Check active open shift
  const activeShift = cashierShifts.find(s => matchesShift(s) && s.status === 'OPEN');

  const scheduledShift = cashierShifts.find(s =>
    matchesShift(s) &&
    s.status === 'SCHEDULED' &&
    (s.scheduledDate === todayStr || (!s.scheduledDate && s.id?.includes('today')))
  );

  const hasCompletedClockOut = Boolean(todayLog?.clockOut && todayLog.clockOut !== '—' && !activeLog);

  // Dynamic Approved Leave Check for this specific staff member
  const approvedLeaveToday = leaveRequests.find(l => {
    const isApproved = l.status === 'APPROVED' || l.status === 'Approved' || l.status === 'Approved & Synced';
    if (!isApproved) return false;
    const isMatch =
      (emp && (l.empId === emp.id || l.staffId === emp.id)) ||
      (currentStaffId && (l.empId?.toLowerCase() === currentStaffId || l.staffId?.toLowerCase() === currentStaffId)) ||
      (targetId && (l.empId?.toLowerCase() === targetId || l.staffId?.toLowerCase() === targetId)) ||
      (isMary && (l.empId === 'EMP-006' || l.name?.toLowerCase().includes('mary okon') || l.name?.toLowerCase().includes('okon') || l.name?.toLowerCase().includes('mary'))) ||
      (isChinedu && (l.empId === 'EMP-009' || l.name?.toLowerCase().includes('chinedu'))) ||
      (currentFullName && l.name && (l.name.toLowerCase().includes(currentFullName.toLowerCase()) || currentFullName.toLowerCase().includes(l.name.toLowerCase())));
    if (!isMatch) return false;
    const s = l.startDate;
    const e = l.endDate || l.startDate;
    return todayStr >= s && todayStr <= e;
  });

  const isClockedIn = Boolean(
    !hasCompletedClockOut && (
      activeLog ||
      activeShift ||
      (todayLog && todayLog.status !== 'ABSENT' && todayLog.clockIn && todayLog.clockIn !== '—' && (!todayLog.clockOut || todayLog.clockOut === '—' || todayLog.clockOut === ''))
    )
  );

  const safeClockInIso = isClockedIn ? (
    (activeLog?.clockInIso && !isNaN(new Date(activeLog.clockInIso).getTime()) ? activeLog.clockInIso : null) ||
    (activeLog?.date && activeLog?.clockIn && activeLog.clockIn !== '—' && /^\d{1,2}:\d{2}/.test(activeLog.clockIn) ? `${activeLog.date}T${activeLog.clockIn}:00` : null) ||
    (todayLog?.clockInIso && !isNaN(new Date(todayLog.clockInIso).getTime()) ? todayLog.clockInIso : null) ||
    (activeShift?.openedAt && !isNaN(new Date(activeShift.openedAt).getTime()) ? activeShift.openedAt : null) ||
    null
  ) : null;

  const safeClockInTime = isClockedIn ? (
    (activeLog?.clockIn && activeLog.clockIn !== '—' && activeLog.clockIn !== 'Invalid Date' ? activeLog.clockIn : null) ||
    (todayLog?.clockIn && todayLog.clockIn !== '—' && todayLog.clockIn !== 'Invalid Date' && todayLog.status !== 'ABSENT' ? todayLog.clockIn : null) ||
    (activeShift?.openedAt && !isNaN(new Date(activeShift.openedAt).getTime()) ? new Date(activeShift.openedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null) ||
    null
  ) : null;

  res.json({
    success: true,
    data: {
      isClockedIn,
      isOnApprovedLeave: Boolean(approvedLeaveToday),
      approvedLeave: approvedLeaveToday || null,
      activeLog: activeLog || null,
      todayLog: todayLog || null,
      activeShift: activeShift || null,
      scheduledShift: scheduledShift || null,
      clockInIso: safeClockInIso,
      clockInTime: safeClockInTime,
      clockInDate: activeLog?.date || todayLog?.date || todayStr,
      serverTime: new Date().toISOString(),
    }
  });
};

router.get('/attendance/status', handleAttendanceStatus);
router.get('/attendance/status/:empId', handleAttendanceStatus);

// POST /hr/attendance/clock-in — Direct Biometric / Web Clock-In
router.post('/attendance/clock-in', async (req: Request, res: Response) => {
  try {
    const { empId, staffName, role, department, shift, notes, autoStartShift } = req.body;
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const emp = employees.find(e => e.id === empId || e.staffId === empId || e.email === empId);
    const resolvedName = staffName || (emp ? `${emp.firstName} ${emp.lastName}` : 'Hospital Staff Member');
    const resolvedRole = role || emp?.role || emp?.designation || 'Staff Officer';
    const resolvedDept = department || emp?.department || 'General Clinical';
    const isMary = String(empId).toLowerCase().includes('mary') || empId === 'EMP-006' || resolvedName.toLowerCase().includes('mary');

    // ── LEAVE LOCK CHECK: Prevent clock-in if employee has an active approved leave today ──
    const activeApprovedLeave = leaveRequests.find(l => {
      const isApproved = l.status === 'APPROVED' || l.status === 'Approved' || l.status === 'Approved & Synced';
      if (!isApproved) return false;
      const isMatch =
        (emp && (l.empId === emp.id || l.staffId === emp.id)) ||
        (l.empId === empId || l.staffId === empId) ||
        (isMary && (l.empId === 'EMP-006' || l.name?.toLowerCase().includes('mary okon'))) ||
        (l.name && (l.name.toLowerCase().includes(resolvedName.toLowerCase()) || resolvedName.toLowerCase().includes(l.name.toLowerCase())));
      if (!isMatch) return false;
      const s = l.startDate;
      const e = l.endDate || l.startDate;
      return todayStr >= s && todayStr <= e;
    });

    if (activeApprovedLeave) {
      return res.status(400).json({
        success: false,
        code: 'ON_APPROVED_LEAVE_LOCKED',
        message: `🚫 Clock-In Locked: You are currently on Approved ${activeApprovedLeave.type || 'Annual'} Leave (${activeApprovedLeave.startDate} to ${activeApprovedLeave.endDate}). Your shifts have been reassigned to relief officer ${activeApprovedLeave.reliefOfficer || 'Relief Officer'}. Biometric clock-in is locked during approved leave periods.`,
        data: {
          leave: activeApprovedLeave
        }
      });
    }

    // Check if already clocked in (even if started on previous days for 24h/48h shifts)
    let existingLog = attendanceLogs.find(a => 
      (a.empId === empId || (emp && a.empId === emp.id) || a.name?.toLowerCase() === resolvedName.toLowerCase() || (isMary && (a.empId === 'EMP-006' || a.name?.toLowerCase().includes('mary')))) && 
      (!a.clockOut || a.clockOut === '—' || a.clockOut === '')
    );

    if (existingLog) {
      return res.json({ 
        success: true, 
        message: `${resolvedName} is already clocked in from ${existingLog.date} at ${existingLog.clockIn}.`, 
        data: existingLog 
      });
    }

    const assignedShift = shift || 'Standard Day Shift (08:00 – 16:00)';
    const isLate = isClockInLate(nowTime, assignedShift);

    const newLog = {
      id: `ATT-${Date.now()}`,
      empId: empId || emp?.id || (isMary ? 'EMP-006' : 'EMP-001'),
      name: resolvedName,
      role: resolvedRole,
      department: resolvedDept,
      date: todayStr,
      clockIn: nowTime,
      clockInIso: nowIso,
      clockInTimestamp: Date.now(),
      clockOut: '—',
      status: isLate ? 'LATE' : 'PRESENT',
      source: 'BIOMETRIC_PORTAL',
      shift: assignedShift,
      notes: notes || (isLate ? 'Clocked in after shift scheduled start (Late Arrival)' : 'Clocked in via Biometric Attendance Portal')
    };

    attendanceLogs.unshift(newLog);

    // Auto-start matching scheduled shift for today if requested or exists
    let startedShift: any = null;
    const scheduledShift = cashierShifts.find(s => 
      (s.cashierId === empId || (emp && s.cashierId === emp.id) || s.cashierName?.toLowerCase().includes(resolvedName.toLowerCase()) || (isMary && (s.cashierId === 'cashier' || s.cashierName?.toLowerCase().includes('mary')))) &&
      s.status === 'SCHEDULED' &&
      (s.scheduledDate === todayStr || (!s.scheduledDate && s.id.includes('today')))
    );

    if (scheduledShift) {
      scheduledShift.status = 'OPEN';
      scheduledShift.openedAt = nowIso;
      startedShift = scheduledShift;
      syncShiftBalances();
    }

    res.status(201).json({ 
      success: true, 
      message: `Clock-In registered successfully for ${resolvedName} at ${nowTime}!`, 
      data: newLog,
      startedShift
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clock in' });
  }
});

// POST /hr/attendance/clock-out — Direct Biometric / Web Clock-Out
router.post('/attendance/clock-out', async (req: Request, res: Response) => {
  try {
    const { empId, staffName, notes, autoCloseShift } = req.body;
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const emp = employees.find(e => e.id === empId || e.staffId === empId || e.email === empId);
    const resolvedName = staffName || (emp ? `${emp.firstName} ${emp.lastName}` : '');
    const isMary = String(empId).toLowerCase().includes('mary') || empId === 'EMP-006' || (resolvedName && resolvedName.toLowerCase().includes('mary'));

    // Look for active unclocked log across any dates (supports 24h, 36h, 48h shifts)
    let todayLog = attendanceLogs.find(a => 
      (a.empId === empId || (emp && a.empId === emp.id) || (resolvedName && a.name?.toLowerCase().includes(resolvedName.toLowerCase())) || (isMary && (a.empId === 'EMP-006' || a.name?.toLowerCase().includes('mary')))) && 
      a.status !== 'ABSENT' && a.clockIn && a.clockIn !== '—' &&
      (!a.clockOut || a.clockOut === '—' || a.clockOut === '')
    );

    if (!todayLog) {
      todayLog = attendanceLogs.find(a => 
        (a.empId === empId || (emp && a.empId === emp.id) || (resolvedName && a.name?.toLowerCase().includes(resolvedName.toLowerCase())) || (isMary && (a.empId === 'EMP-006' || a.name?.toLowerCase().includes('mary')))) && 
        a.status !== 'ABSENT' && a.clockIn && a.clockIn !== '—' &&
        a.date === todayStr
      );
    }

    if (todayLog) {
      todayLog.clockOut = nowTime;
      todayLog.clockOutIso = nowIso;
      if (notes) todayLog.notes = (todayLog.notes ? `${todayLog.notes} · ` : '') + notes;
      todayLog.hours = computeAttendanceHours(todayLog);
    } else {
      // Create completed log
      todayLog = {
        id: `ATT-${Date.now()}`,
        empId: empId || emp?.id || (isMary ? 'EMP-006' : 'EMP-001'),
        name: resolvedName || 'Hospital Staff',
        role: emp?.role || 'Staff Officer',
        department: emp?.department || 'General Clinical',
        date: todayStr,
        clockIn: '08:00',
        clockInIso: todayStr + 'T08:00:00.000Z',
        clockOut: nowTime,
        clockOutIso: nowIso,
        status: 'PRESENT',
        source: 'BIOMETRIC_PORTAL',
        shift: 'Day Shift',
        hours: '0h 0m',
        notes: notes || 'Clock-out logged directly'
      };
      todayLog.hours = computeAttendanceHours(todayLog);
      attendanceLogs.unshift(todayLog);
    }

    // Auto-close open shift if exists
    let closedShift: any = null;
    const activeShift = cashierShifts.find(s => 
      (s.cashierId === empId || (emp && s.cashierId === emp.id) || (resolvedName && s.cashierName?.toLowerCase().includes(resolvedName.toLowerCase())) || (isMary && (s.cashierId === 'cashier' || s.cashierName?.toLowerCase().includes('mary')))) &&
      s.status === 'OPEN'
    );

    if (activeShift) {
      activeShift.status = 'CLOSED';
      activeShift.closedAt = nowIso;
      activeShift.actualClosingBalance = activeShift.expectedClosingBalance || 0;
      activeShift.isReconciled = true;
      closedShift = activeShift;
      syncShiftBalances();
    }

    res.json({ 
      success: true, 
      message: `Clock-Out recorded successfully at ${nowTime}. Total duty hours calculated.`, 
      data: todayLog,
      closedShift 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clock out' });
  }
});

router.post('/attendance', async (req: Request, res: Response) => {
  try {
    const { empId, status, clockIn, clockOut } = req.body;
    const emp = employees.find(e => e.id === empId);
    const log = {
      id: `ATT-${Date.now()}`,
      empId,
      name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Employee',
      date: new Date().toISOString().slice(0, 10),
      clockIn: clockIn || '08:00',
      clockOut: clockOut || '16:00',
      status: status || 'PRESENT',
      source: 'BIOMETRIC',
    };
    attendanceLogs.unshift(log);
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to log attendance' });
  }
});

// ─── CENTRALIZED DUTY ROSTER SHIFT DEFINITIONS & TEMPLATES ──────────────
export let configuredRosterShifts: any[] = [
  // General
  { code: 'MORNING_8H', name: 'Standard Morning Shift (7am–3pm)', role: 'ALL', startTime: '07:00', endTime: '15:00', description: 'General hospital morning duty coverage', color: '#2563eb' },
  { code: 'AFTERNOON_8H', name: 'Standard Afternoon Shift (2pm–10pm)', role: 'ALL', startTime: '14:00', endTime: '22:00', description: 'General hospital afternoon duty coverage', color: '#d97706' },
  { code: 'NIGHT_12H', name: 'Overnight Shift (8pm–8am)', role: 'ALL', startTime: '20:00', endTime: '08:00', description: 'General hospital 12-hour night duty coverage', color: '#7c3aed' },
  { code: 'DAY_12H', name: 'Full Day Extended Duty (8am–8pm)', role: 'ALL', startTime: '08:00', endTime: '20:00', description: 'Full day weekend and holiday duty', color: '#059669' },
  
  // Medical Officers & Doctors
  { code: 'DOCTOR_CALL_24H', name: 'Doctor 24-Hour Call Duty (8am–8am)', role: 'Doctor', startTime: '08:00', endTime: '08:00', description: 'Continuous 24-hour medical on-call & emergency coverage', color: '#dc2626' },
  { code: 'DOCTOR_CLINICAL_8H', name: 'Consultant Morning Clinic (8am–4pm)', role: 'Doctor', startTime: '08:00', endTime: '16:00', description: 'Outpatient consultations and ward clinical rounds', color: '#1e3a8a' },
  { code: 'DOCTOR_THEATRE_CALL', name: 'Surgical Theatre Call (8am–8pm)', role: 'Doctor', startTime: '08:00', endTime: '20:00', description: 'Elective surgeries and emergency trauma surgical cover', color: '#4338ca' },
  { code: 'DOCTOR_OPD_EVENING', name: 'Evening OPD Specialist Clinic (2pm–9pm)', role: 'Doctor', startTime: '14:00', endTime: '21:00', description: 'Afternoon & evening specialist consultations', color: '#b91c1c' },

  // Nursing Services
  { code: 'NURSE_MORNING_8H', name: 'Nurse Morning Ward Roster (7am–3pm)', role: 'Nurse', startTime: '07:00', endTime: '15:00', description: 'Inpatient ward rounds, medications & vital signs monitoring', color: '#0284c7' },
  { code: 'NURSE_AFTERNOON_8H', name: 'Nurse Afternoon Rota (2pm–10pm)', role: 'Nurse', startTime: '14:00', endTime: '22:00', description: 'Afternoon nursing handover, admissions & patient care', color: '#ea580c' },
  { code: 'NURSE_NIGHT_12H', name: 'Nurse Night Shift (8pm–8am)', role: 'Nurse', startTime: '20:00', endTime: '08:00', description: 'Overnight intensive patient care & emergency admissions', color: '#8b5cf6' },
  { code: 'NURSE_LABOUR_12H', name: 'Labour & Delivery Ward Shift (8am–8pm)', role: 'Nurse', startTime: '08:00', endTime: '20:00', description: 'Maternity, delivery room & neonatal monitoring', color: '#e11d48' },

  // Cashiers & Revenue
  { code: 'CASHIER_MORNING_8H', name: 'Cashier Morning Till (7am–3pm)', role: 'Cashier', startTime: '07:00', endTime: '15:00', description: 'Main OPD cashier till & payment collections', color: '#2563eb' },
  { code: 'CASHIER_AFTERNOON_8H', name: 'Cashier Afternoon Till (2pm–10pm)', role: 'Cashier', startTime: '14:00', endTime: '22:00', description: 'Afternoon clinic, pharmacy & discharge billing', color: '#d97706' },
  { code: 'CASHIER_NIGHT_12H', name: 'Cashier Night Till (8pm–8am)', role: 'Cashier', startTime: '20:00', endTime: '08:00', description: 'Emergency & IPD 24/7 revenue collection', color: '#7c3aed' },
  { code: 'CASHIER_FULLDAY_12H', name: 'Weekend Cashier Full Day (8am–8pm)', role: 'Cashier', startTime: '08:00', endTime: '20:00', description: 'Weekend full day billing & till reconciliation', color: '#0d9488' },

  // Pharmacy & Therapeutics
  { code: 'PHARM_DAY_8H', name: 'Pharmacy Dispensing Day (8am–4pm)', role: 'Pharmacist', startTime: '08:00', endTime: '16:00', description: 'Main pharmacy prescription verification & dispensing', color: '#16a34a' },
  { code: 'PHARM_EVENING_8H', name: 'Pharmacy Evening Coverage (2pm–10pm)', role: 'Pharmacist', startTime: '14:00', endTime: '22:00', description: 'Evening pharmacy dispensary & inpatient dose unit supply', color: '#ca8a04' },
  { code: 'PHARM_NIGHT_ONCALL', name: 'Pharmacy Overnight On-Call (8pm–8am)', role: 'Pharmacist', startTime: '20:00', endTime: '08:00', description: 'Emergency drug dispensing & critical care pharmacy support', color: '#c026d3' },

  // Laboratory & Diagnostics
  { code: 'LAB_MORNING_8H', name: 'Laboratory Morning Bench (8am–4pm)', role: 'Laboratory', startTime: '08:00', endTime: '16:00', description: 'Routine diagnostic testing, sample accessioning & analysis', color: '#0891b2' },
  { code: 'LAB_AFTERNOON_8H', name: 'Laboratory Afternoon Roster (2pm–10pm)', role: 'Laboratory', startTime: '14:00', endTime: '22:00', description: 'Emergency lab testing, cross-matching & chemistry', color: '#b45309' },
  { code: 'LAB_WEEKEND_24H', name: 'Blood Bank & Stat Lab 24H Call', role: 'Laboratory', startTime: '08:00', endTime: '08:00', description: 'Emergency blood transfusion services & stat laboratory tests', color: '#b91c1c' },

  // Front Desk & Reception
  { code: 'FRONTDESK_MORNING_8H', name: 'Reception Morning Desk (7am–3pm)', role: 'FrontDesk', startTime: '07:00', endTime: '15:00', description: 'Patient registration, appointment scheduling & triage intake', color: '#3b82f6' },
  { code: 'FRONTDESK_AFTERNOON_8H', name: 'Reception Evening Triage (2pm–10pm)', role: 'FrontDesk', startTime: '14:00', endTime: '22:00', description: 'Evening patient intake, visitor passes & bed tracking', color: '#f97316' },

  // Administration & Support
  { code: 'ADMIN_DAY_9H', name: 'Executive Administration (8am–5pm)', role: 'Admin', startTime: '08:00', endTime: '17:00', description: 'Hospital administrative oversight & operations management', color: '#475569' },
  { code: 'AMBULANCE_24H_CALL', name: 'Emergency Ambulance Standby (24H)', role: 'Admin', startTime: '08:00', endTime: '08:00', description: '24/7 paramedic & emergency ambulance transport standby', color: '#991b1b' },
];

// GET /hr/roster/shifts — Get all centralized duty roster shifts
router.get('/roster/shifts', (req: Request, res: Response) => {
  try {
    ensureShiftsInitialized();
    leaveRequests.filter(l => l.status === 'APPROVED' || l.status === 'Approved').forEach(l => {
      reallocateLeaveShiftsToReliever(l);
    });

    // Auto-correct any morning shifts where fallback 08:00–16:00 was assigned instead of 07:00–15:00
    cashierShifts.forEach(s => {
      if ((s.shiftType === 'CASHIER_MORNING_8H' || s.shiftType === 'MORNING_8H' || s.shiftType === 'NURSE_MORNING_8H' || s.shiftType === 'FRONTDESK_MORNING_8H') && s.startTime === '08:00' && s.endTime === '16:00') {
        s.startTime = '07:00';
        s.endTime = '15:00';
      }
    });
    rosterShifts.forEach(s => {
      if ((s.shiftType === 'CASHIER_MORNING_8H' || s.shiftType === 'MORNING_8H' || s.shiftType === 'NURSE_MORNING_8H' || s.shiftType === 'FRONTDESK_MORNING_8H') && s.start === '08:00' && s.end === '16:00') {
        s.start = '07:00';
        s.end = '15:00';
      }
    });

    syncShiftBalances();
    res.json({ success: true, data: cashierShifts, total: cashierShifts.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch duty roster shifts' });
  }
});

// GET /hr/roster/config — Get configured shift definitions
router.get('/roster/config', (_req: Request, res: Response) => {
  res.json({ success: true, data: configuredRosterShifts });
});

// POST /hr/roster/config — Add/update a shift definition
router.post('/roster/config', (req: Request, res: Response) => {
  const { code, name, role, startTime, endTime, description, color } = req.body;
  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Code and Name are required' });
  }

  const cleanCode = code.toUpperCase().replace(/\s+/g, '_');
  const newShift = {
    code: cleanCode,
    name,
    role: role || 'ALL',
    startTime: startTime || '07:00',
    endTime: endTime || '15:00',
    description: description || '',
    color: color || '#2563eb',
  };

  const existingIndex = configuredRosterShifts.findIndex(s => s.code === cleanCode);
  if (existingIndex >= 0) {
    configuredRosterShifts[existingIndex] = newShift;
  } else {
    configuredRosterShifts.push(newShift);
  }

  res.status(201).json({ success: true, data: configuredRosterShifts });
});

// DELETE /hr/roster/config/:code — Remove a shift definition
router.delete('/roster/config/:code', (req: Request, res: Response) => {
  configuredRosterShifts = configuredRosterShifts.filter(s => s.code !== req.params.code);
  res.json({ success: true, message: 'Shift definition removed', data: configuredRosterShifts });
});

// POST /hr/roster/schedule — Centralized Staff Duty Roster Assignment (All Roles)
router.post('/roster/schedule', async (req: Request, res: Response) => {
  try {
    const { 
      staffId, 
      staffName, 
      role, 
      shiftType, 
      shift,
      location, 
      startDate, 
      endDate, 
      cashDrawer, 
      openingBalance, 
      isPrimary,
      onCallLead,
      startTime,
      endTime,
      shiftName
    } = req.body;

    const emp = employees.find(e => e.id === staffId || e.email === staffId);
    const assignedStaffName = staffName || (emp ? `${emp.firstName} ${emp.lastName}` : 'Hospital Staff Member');
    const assignedStaffId = staffId || emp?.id || 'EMP-001';
    const assignedRole = role || emp?.role || 'Staff Member';
    const configuredBy = (req as any).user?.name || (req as any).user?.username || 'Admin (Workforce HR)';
    
    const resolvedShiftCode = shiftType || shift || 'MORNING_8H';

    // Find template to resolve times
    const tmpl = configuredRosterShifts.find(s => s.code === resolvedShiftCode) || {
      name: shiftName || resolvedShiftCode,
      startTime: startTime || (resolvedShiftCode.includes('NIGHT') ? '20:00' : resolvedShiftCode.includes('AFTERNOON') ? '14:00' : '07:00'),
      endTime: endTime || (resolvedShiftCode.includes('NIGHT') ? '08:00' : resolvedShiftCode.includes('AFTERNOON') ? '22:00' : '15:00'),
      color: '#2563eb'
    };

    const sDate = startDate || new Date().toISOString().slice(0, 10);
    const eDate = endDate || sDate;
    const startD = new Date(sDate);
    const endD = new Date(eDate);

    const resolvedStartTime = startTime || tmpl.startTime || '07:00';
    const resolvedEndTime = endTime || tmpl.endTime || '15:00';
    const resolvedShiftName = shiftName || tmpl.name || resolvedShiftCode;

    const createdShifts: any[] = [];
    const opBal = Number(openingBalance) || 0;
    const isCashierRole = assignedRole.toLowerCase().includes('cashier') || assignedRole.toLowerCase().includes('revenue') || (resolvedShiftCode || '').startsWith('CASHIER_');

    // Generate for each day in range
    for (let cur = new Date(startD); cur <= endD; cur.setDate(cur.getDate() + 1)) {
      const curDateStr = cur.toISOString().slice(0, 10);
      const shiftId = `shift_roster_${assignedStaffId}_${curDateStr}_${Date.now().toString().slice(-4)}`;

      const newShift = {
        id: shiftId,
        shiftNumber: `SHF-${new Date().getFullYear()}-${String(cashierShifts.length + 1).padStart(3, '0')}`,
        location: location || (isCashierRole ? 'Main Outpatient Cash Desk #01' : 'Clinical Ward / OPD'),
        cashDrawer: isCashierRole ? (cashDrawer || 'Drawer-01') : '—',
        cashierId: assignedStaffId,
        userId: assignedStaffId,
        cashierName: `${assignedStaffName} (${assignedRole})`,
        staffRole: assignedRole,
        shiftType: resolvedShiftCode,
        shiftName: resolvedShiftName,
        scheduledDate: curDateStr,
        startTime: resolvedStartTime,
        endTime: resolvedEndTime,
        openingBalance: opBal,
        expectedClosingBalance: opBal,
        actualClosingBalance: null,
        cashCollected: 0,
        posCollected: 0,
        transferCollected: 0,
        totalInflow: 0,
        variance: 0,
        status: 'SCHEDULED',
        openedAt: null,
        closedAt: null,
        isPrimary: Boolean(isPrimary),
        onCallLead: Boolean(onCallLead),
        roleStatus: isPrimary ? 'Duty Lead / In-Charge' : 'Duty Staff',
        transactions: [],
        configuredBy,
        isReconciled: false,
      };

      cashierShifts.unshift(newShift);
      createdShifts.push(newShift);

      // Also add to legacy rosterShifts
      rosterShifts.unshift({
        id: `SHF-${Date.now()}-${createdShifts.length}`,
        empId: assignedStaffId,
        name: assignedStaffName,
        role: assignedRole,
        date: curDateStr,
        shiftType: shiftType || 'MORNING_8H',
        start: tmpl.startTime || '08:00',
        end: tmpl.endTime || '16:00',
        location: newShift.location,
        cashDrawer: newShift.cashDrawer,
        openingBalance: opBal,
        configuredBy,
      });
    }

    syncShiftBalances();
    res.status(201).json({ 
      success: true, 
      message: `Duty roster schedule created for ${assignedStaffName} (${createdShifts.length} duty slot${createdShifts.length > 1 ? 's' : ''}).`, 
      data: createdShifts 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to schedule duty roster' });
  }
});

// POST /hr/roster/shift/:id/start — Start/Clock-In to duty shift
router.post('/roster/shift/:id/start', async (req: Request, res: Response) => {
  try {
    syncShiftBalances();
    const shift = cashierShifts.find(s => s.id === req.params.id || s.shiftNumber === req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Duty shift not found' });
    if (shift.status === 'OPEN') return res.status(400).json({ success: false, message: 'Duty shift is already active.' });
    
    const todayStr = new Date().toISOString().slice(0, 10);
    if (shift.scheduledDate && shift.scheduledDate > todayStr) {
      return res.status(400).json({ 
        success: false, 
        message: `Shift is locked. Clock-in is only permitted on the scheduled date (${shift.scheduledDate}).` 
      });
    }

    const { openingBalance, notes } = req.body;
    if (openingBalance !== undefined && openingBalance !== null && openingBalance !== '') {
      shift.openingBalance = Number(openingBalance) || 0;
      shift.expectedClosingBalance = shift.openingBalance;
    }
    if (notes) shift.notes = notes;

    shift.status = 'OPEN';
    shift.openedAt = new Date().toISOString();
    syncShiftBalances();

    // Log attendance
    try {
      const log = {
        id: `ATT-${Date.now()}`,
        empId: shift.cashierId || 'EMP-001',
        name: shift.cashierName?.replace(/\s*\([^)]*\)/, '') || 'Hospital Staff',
        role: shift.staffRole || 'Duty Officer',
        department: shift.location || 'Hospital Services',
        date: todayStr,
        clockIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        clockOut: '—',
        status: 'PRESENT',
        source: 'ROSTER_CLOCKIN',
        shift: `${shift.startTime} – ${shift.endTime} (${shift.shiftType})`
      };
      attendanceLogs.unshift(log);
    } catch {}

    res.json({ success: true, message: `Duty shift started successfully for ${shift.cashierName}.`, data: shift });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to start shift' });
  }
});

// POST /hr/roster/shift/:id/close — Close/Handover duty shift
router.post('/roster/shift/:id/close', async (req: Request, res: Response) => {
  try {
    syncShiftBalances();
    const shift = cashierShifts.find(s => s.id === req.params.id || s.shiftNumber === req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Duty shift not found' });
    
    const { actualClosingBalance, supervisorNotes } = req.body;
    const actBal = Number(actualClosingBalance ?? shift.expectedClosingBalance ?? 0);
    shift.actualClosingBalance = actBal;
    shift.variance = actBal - (shift.expectedClosingBalance || 0);
    shift.supervisorNotes = supervisorNotes || 'Handover completed successfully';
    shift.status = 'CLOSED';
    shift.closedAt = new Date().toISOString();
    shift.isReconciled = true;

    syncShiftBalances();
    res.json({ success: true, message: 'Duty shift closed and reconciled successfully.', data: shift });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to close shift' });
  }
});

// POST /hr/roster/shift/:id/reassign — Assign Cover
router.post('/hr/roster/shift/:id/reassign', async (req: Request, res: Response) => {
  try {
    syncShiftBalances();
    const shift = cashierShifts.find(s => s.id === req.params.id || s.shiftNumber === req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Duty shift not found' });
    
    const { newStaffId, newStaffName, handoverNotes } = req.body;
    if (!newStaffId && !newStaffName) {
      return res.status(400).json({ success: false, message: 'Please select a covering staff member.' });
    }

    const prevStaff = shift.cashierName;
    shift.previousCashierName = prevStaff;
    shift.cashierId = newStaffId || shift.cashierId;
    shift.cashierName = newStaffName || shift.cashierName;
    shift.reassignmentNotes = handoverNotes || `Shift cover assigned to ${shift.cashierName} by ${prevStaff}`;
    shift.lastReassignedAt = new Date().toISOString();

    syncShiftBalances();
    res.json({ success: true, message: `Duty cover successfully assigned to ${shift.cashierName}.`, data: shift });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reassign shift cover' });
  }
});

// DELETE /hr/roster/shift/:id — Cancel/Dismiss scheduled shift
router.delete('/roster/shift/:id', (req: Request, res: Response) => {
  try {
    syncShiftBalances();
    const idx = cashierShifts.findIndex(s => s.id === req.params.id || s.shiftNumber === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Shift not found' });
    const shift = cashierShifts[idx];
    if (shift.status === 'OPEN' && (shift.cashCollected > 0 || shift.posCollected > 0)) {
      return res.status(400).json({ success: false, message: 'Cannot delete an active shift with recorded collections.' });
    }
    cashierShifts.splice(idx, 1);
    res.json({ success: true, message: 'Shift schedule removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete shift' });
  }
});

router.get('/roster', (req: Request, res: Response) => {
  res.json({ success: true, data: rosterShifts });
});

router.post('/roster', async (req: Request, res: Response) => {
  try {
    const emp = employees.find(e => e.id === req.body.empId);
    const configuredBy = req.body.configuredBy || (req as any).user?.name || (req as any).user?.username || 'Admin (Workforce HR)';
    const shift = { 
      id: `SHF-${Date.now()}`, 
      name: emp ? `${emp.firstName} ${emp.lastName}` : (req.body.name || 'Staff Member'),
      configuredBy,
      ...req.body 
    };
    rosterShifts.unshift(shift);

    // If this shift is assigned to a Cashier or is a Cashier Desk/Shift Type, also register it in Cashier Shifts
    const empRole = (emp?.role || '').toLowerCase();
    const isCashierRole = empRole.includes('cashier') || empRole.includes('revenue') || empRole.includes('billing') || (shift.shiftType || '').startsWith('CASHIER_') || (shift.location || '').toLowerCase().includes('cash');

    if (isCashierRole) {
      const scheduledShiftId = `shift_sched_${Date.now()}`;
      const cashierId = emp?.id === 'EMP-006' ? 'cashier' : emp?.id === 'EMP-007' ? 'cashier01' : emp?.id === 'EMP-008' ? 'cashier02' : (emp?.id || 'cashier');
      const cashierName = emp ? `${emp.firstName} ${emp.lastName}` : (shift.name || 'Hospital Cashier');
      const opBal = Number(shift.openingBalance) || 20000;
      const drawer = shift.cashDrawer || (cashierName.includes('Mary') ? 'Drawer A (Mary Okon)' : cashierName.includes('Blessing') ? 'Drawer B (Blessing Ugwu)' : 'Drawer-01');
      
      const newCashierShift = {
        id: scheduledShiftId,
        shiftNumber: `SHF-${new Date().getFullYear()}-${String(cashierShifts.length + 1).padStart(3, '0')}`,
        location: shift.location || 'Main Outpatient Cash Desk #01',
        cashDrawer: drawer,
        cashierId,
        cashierName,
        shiftType: shift.shiftType || 'CASHIER_MORNING_8H',
        scheduledDate: shift.date || new Date().toISOString().slice(0, 10),
        startTime: shift.start || '07:00',
        endTime: shift.end || '15:00',
        openingBalance: opBal,
        expectedClosingBalance: opBal,
        actualClosingBalance: null,
        cashCollected: 0,
        posCollected: 0,
        transferCollected: 0,
        totalInflow: 0,
        variance: 0,
        status: 'SCHEDULED',
        openedAt: null,
        closedAt: null,
        transactions: [],
        configuredBy,
        isReconciled: false,
      };
      cashierShifts.unshift(newCashierShift);
      syncShiftBalances();
    }

    res.status(201).json({ success: true, data: shift });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign shift' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §19.7 - LEAVE & ABSENCE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// Helper to calculate leave balance per employee
export const getEmployeeLeaveBalances = (empId: string, userName?: string) => {
  let emp = employees.find(e => 
    e.id === empId || 
    (empId && (e.email?.toLowerCase().includes(empId.toLowerCase()) || e.role?.toLowerCase().includes(empId.toLowerCase())))
  );

  if (!emp && (empId === 'cashier' || empId === 'cashier01' || empId?.toLowerCase().includes('mary') || (userName && userName.toLowerCase().includes('mary')))) {
    emp = employees.find(e => e.id === 'EMP-006');
  }

  const effectiveEmpId = emp?.id || (empId?.startsWith('EMP-') ? empId : 'EMP-006');
  const isMary = effectiveEmpId === 'EMP-006' || emp?.firstName?.toLowerCase() === 'mary' || (userName && userName.toLowerCase().includes('mary'));
  const empGender = emp?.gender || (isMary ? 'Female' : 'Male');
  const isMarried = true;
  
  const totalAnnual = 20;
  const totalMaternity = empGender === 'Female' ? 90 : 0;
  const totalPaternity = (empGender === 'Male' && isMarried) ? 14 : 0;
  const totalHoliday = 5;
  const totalSick = 12;
  const totalCasual = 7;
  const totalCompassionate = 5;
  const totalStudy = 10;

  const empApprovedLeaves = leaveRequests.filter(l => {
    const isEmpMatch = 
      l.empId === empId || 
      l.empId === effectiveEmpId || 
      (emp && `${emp.firstName} ${emp.lastName}`.toLowerCase().trim() === l.name?.toLowerCase().trim()) ||
      (isMary && (l.empId === 'EMP-006' || l.name?.toLowerCase().includes('mary okon')));
    
    return isEmpMatch && (l.status === 'APPROVED' || l.status === 'Approved');
  });
  
  const usedAnnual = empApprovedLeaves.filter(l => l.type === 'ANNUAL').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
  const usedMaternity = empApprovedLeaves.filter(l => l.type === 'MATERNITY').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
  const usedPaternity = empApprovedLeaves.filter(l => l.type === 'PATERNITY').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
  const usedHoliday = empApprovedLeaves.filter(l => l.type === 'HOLIDAY').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
  const usedSick = empApprovedLeaves.filter(l => l.type === 'SICK').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
  const usedCasual = empApprovedLeaves.filter(l => l.type === 'CASUAL').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
  const usedCompassionate = empApprovedLeaves.filter(l => l.type === 'COMPASSIONATE').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
  const usedStudy = empApprovedLeaves.filter(l => l.type === 'STUDY').reduce((acc, l) => acc + (Number(l.days) || 0), 0);

  const pendingCount = leaveRequests.filter(l => {
    const isEmpMatch = 
      l.empId === empId || 
      l.empId === effectiveEmpId || 
      (emp && `${emp.firstName} ${emp.lastName}`.toLowerCase().trim() === l.name?.toLowerCase().trim()) ||
      (isMary && (l.empId === 'EMP-006' || l.name?.toLowerCase().includes('mary okon')));
    
    return isEmpMatch && (l.status === 'PENDING_SUPERVISOR' || l.status === 'PENDING_ADMIN' || l.status === 'PENDING_APPROVAL' || l.status === 'Pending');
  }).length;

  return {
    empId: effectiveEmpId,
    name: emp ? `${emp.firstName} ${emp.lastName}` : (isMary ? 'Mary Okon' : 'Hospital Staff'),
    gender: empGender,
    department: emp?.department || 'Finance & Revenue',
    annual: { total: totalAnnual, used: usedAnnual, remaining: Math.max(0, totalAnnual - usedAnnual) },
    maternity: { total: totalMaternity, used: usedMaternity, remaining: Math.max(0, totalMaternity - usedMaternity) },
    paternity: { total: totalPaternity, used: usedPaternity, remaining: Math.max(0, totalPaternity - usedPaternity) },
    holiday: { total: totalHoliday, used: usedHoliday, remaining: Math.max(0, totalHoliday - usedHoliday) },
    sick: { total: totalSick, used: usedSick, remaining: Math.max(0, totalSick - usedSick) },
    casual: { total: totalCasual, used: usedCasual, remaining: Math.max(0, totalCasual - usedCasual) },
    compassionate: { total: totalCompassionate, used: usedCompassionate, remaining: Math.max(0, totalCompassionate - usedCompassionate) },
    study: { total: totalStudy, used: usedStudy, remaining: Math.max(0, totalStudy - usedStudy) },
    pendingRequestsCount: pendingCount
  };
};

router.get(['/leave', '/leaves', '/leave/requests', '/leaves/requests'], (req: Request, res: Response) => {
  const { empId, status, type } = req.query;
  let list = [...leaveRequests];
  if (empId) {
    list = list.filter(l => l.empId === empId);
  }
  if (status) {
    list = list.filter(l => l.status === status);
  }
  if (type) {
    list = list.filter(l => l.type === type);
  }
  res.json({ success: true, data: list, total: list.length });
});

router.get(['/leave/balances', '/leaves/balances'], (req: Request, res: Response) => {
  const empId = (req.query.empId as string) || (req as any).user?.staffId || (req as any).user?.id || 'EMP-006';
  const userName = (req.query.userName as string) || (req as any).user?.username || `${(req as any).user?.firstName || ''} ${(req as any).user?.lastName || ''}`;
  const balance = getEmployeeLeaveBalances(empId, userName);
  res.json({ success: true, data: balance });
});

router.post(['/leave', '/leaves', '/leave/requests', '/leaves/requests'], async (req: Request, res: Response) => {
  try {
    const emp = employees.find(e => e.id === req.body.empId);
    const staffName = emp ? `${emp.firstName} ${emp.lastName}` : (req.body.name || 'Mary Okon');
    
    // Balance check
    const currentBalances = getEmployeeLeaveBalances(req.body.empId || 'EMP-006', staffName);
    const leaveCategoryKey = (req.body.type || 'ANNUAL').toLowerCase() as keyof typeof currentBalances;
    const catBal = (currentBalances as any)[leaveCategoryKey] || { total: 20, used: 0, remaining: 20 };
    const requestedDays = Number(req.body.days) || 1;
    if (requestedDays > catBal.remaining) {
      return res.status(400).json({
        success: false,
        message: `Requested duration (${requestedDays} working days) exceeds available balance for ${req.body.type} (${catBal.remaining} days remaining of ${catBal.total} allocated).`
      });
    }

    const request = {
      id: `LEV-${String(leaveRequests.length + 1).padStart(3, '0')}`,
      empId: req.body.empId || 'EMP-006',
      name: staffName,
      department: req.body.department || emp?.department || 'Finance & Revenue',
      designation: req.body.designation || emp?.role || 'Staff Officer',
      type: req.body.type || 'ANNUAL',
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      days: requestedDays,
      reason: req.body.reason || 'Personal / Medical recess',
      selectedSupervisor: req.body.selectedSupervisor || 'Chinedu Okafor',
      selectedSupervisorEmail: req.body.selectedSupervisorEmail || 'supervisor@faithfoundation.org',
      reliefOfficer: req.body.reliefOfficer || 'Ngozi Adeyemi',
      emergencyPhone: req.body.emergencyPhone || '080-0000-0000',
      documentUrl: req.body.documentUrl || null,
      status: req.body.status || 'PENDING_SUPERVISOR',
      approvedBy: req.body.status === 'APPROVED' ? ((req as any).user?.username || 'Hospital Admin') : null,
      supervisorRecommended: req.body.status === 'APPROVED' ? 'Unit Supervisor' : null,
      rejectionReason: null,
      createdAt: new Date().toISOString()
    };
    leaveRequests.unshift(request);
    await logAudit({ userId: (req as any).user?.id, action: 'CREATE_LEAVE', resourceType: 'LeaveRequest', resourceId: request.id });
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to request leave' });
  }
});

router.patch(['/leave/:id/supervisor-recommend', '/leaves/:id/supervisor-recommend', '/leave/requests/:id/supervisor-recommend'], async (req: Request, res: Response) => {
  try {
    const request = leaveRequests.find(l => l.id === req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Leave request not found' });
    request.status = 'PENDING_ADMIN';
    request.supervisorRecommended = req.body.supervisorName || (req as any).user?.username || 'Unit Supervisor';
    if (req.body.comments) request.supervisorComments = req.body.comments;
    await logAudit({ userId: (req as any).user?.id, action: 'RECOMMEND_LEAVE', resourceType: 'LeaveRequest', resourceId: request.id });
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to recommend leave' });
  }
});

// Helper to transfer duty shifts from employee on approved leave to their designated relief officer
export const reallocateLeaveShiftsToReliever = (request: any) => {
  if (!request || (request.status !== 'APPROVED' && request.status !== 'Approved')) return;

  const emp = employees.find(e => e.id === request.empId || `${e.firstName} ${e.lastName}`.toLowerCase().includes(String(request.name || '').toLowerCase()));
  const applicantName = request.name || (emp ? `${emp.firstName} ${emp.lastName}` : 'Staff Member');
  const applicantId = request.empId || emp?.id || 'EMP-006';

  // Find the relief officer in the employees list
  const reliefName = request.reliefOfficer || 'Blessing Ugwu';
  const reliefEmp = employees.find(e => 
    (e.id && e.id.toLowerCase() === reliefName.toLowerCase()) ||
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(reliefName.toLowerCase()) ||
    reliefName.toLowerCase().includes(e.firstName.toLowerCase()) ||
    reliefName.toLowerCase().includes(e.lastName.toLowerCase())
  ) || (applicantId === 'EMP-006' ? employees.find(e => e.id === 'EMP-007') : employees.find(e => e.id === 'EMP-002')) || employees[1];

  const reliefStaffName = reliefEmp ? `${reliefEmp.firstName} ${reliefEmp.lastName}` : reliefName;
  const reliefStaffId = reliefEmp ? reliefEmp.id : 'EMP-007';

  // Generate date list between startDate and endDate
  const dates: string[] = [];
  try {
    const [sy, sm, sd] = request.startDate.split('T')[0].split('-').map(Number);
    const [ey, em, ed] = (request.endDate || request.startDate).split('T')[0].split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
  } catch {
    if (request.startDate) dates.push(request.startDate.split('T')[0]);
  }

  const isApplicantCashier = (emp?.role || '').toLowerCase().includes('cashier') || (emp?.role || '').toLowerCase().includes('revenue') || applicantId === 'EMP-006' || applicantName.toLowerCase().includes('mary');

  dates.forEach(dateStr => {
    // 1. Update/Add in rosterShifts for applicant
    const existingApplicantShift = rosterShifts.find(s => 
      s.date === dateStr && (s.empId === applicantId || s.name?.toLowerCase().includes(applicantName.toLowerCase()))
    );

    const shiftStart = existingApplicantShift?.start || '07:00';
    const shiftEnd = existingApplicantShift?.end || '15:00';
    const shiftLoc = existingApplicantShift?.location || (isApplicantCashier ? 'Main Outpatient Cash Desk #01' : 'Clinical Care Ward');

    if (existingApplicantShift) {
      existingApplicantShift.status = 'ON_LEAVE';
      existingApplicantShift.shiftType = 'ON_LEAVE';
      existingApplicantShift.shiftLabel = `On Approved ${request.type} Leave`;
      existingApplicantShift.relievedBy = `${reliefStaffName} (${reliefStaffId})`;
      existingApplicantShift.notes = `Covered by relief officer ${reliefStaffName} (${request.id})`;
    } else {
      rosterShifts.unshift({
        id: `SHF-LEAVE-${request.id}-${dateStr}`,
        empId: applicantId,
        name: applicantName,
        date: dateStr,
        shiftType: 'ON_LEAVE',
        shiftLabel: `On Approved ${request.type} Leave`,
        start: '—',
        end: '—',
        location: shiftLoc,
        relievedBy: `${reliefStaffName} (${reliefStaffId})`,
        status: 'ON_LEAVE',
        leaveRequestId: request.id,
        configuredBy: `Auto-Assigned on Leave Approval (${request.id})`
      });
    }

    // 1b. Update applicant shift in cashierShifts to ON_LEAVE
    const existingApplicantCashier = cashierShifts.find(s =>
      (s.scheduledDate === dateStr || s.date === dateStr || s.openedAt?.startsWith(dateStr)) &&
      (s.cashierId === 'cashier' || s.cashierId === applicantId || s.cashierName?.toLowerCase().includes(applicantName.toLowerCase())) &&
      !s.isReliefShift
    );
    if (existingApplicantCashier) {
      existingApplicantCashier.status = 'ON_LEAVE';
      existingApplicantCashier.shiftType = 'ON_LEAVE';
      existingApplicantCashier.cashierName = `${applicantName} (On Approved ${request.type} Leave)`;
      existingApplicantCashier.relievedBy = `${reliefStaffName} (${reliefStaffId})`;
      existingApplicantCashier.isReliefCovered = true;
      existingApplicantCashier.notes = `Covered by relief officer ${reliefStaffName} (${request.id})`;
    }

    // 2. Add / Update Relief Shift for Reliever in rosterShifts
    const reliefRosterShiftId = `SHF-RELIEF-${request.id}-${dateStr}`;
    const existingReliefRoster = rosterShifts.find(s => 
      s.id === reliefRosterShiftId || 
      (s.date === dateStr && s.empId === reliefStaffId && s.isReliefShift && s.relievingFor === applicantName)
    );

    if (!existingReliefRoster) {
      rosterShifts.unshift({
        id: reliefRosterShiftId,
        empId: reliefStaffId,
        name: reliefStaffName,
        date: dateStr,
        shiftType: isApplicantCashier ? 'CASHIER_MORNING_8H' : 'STANDARD_DAY_8H',
        start: shiftStart,
        end: shiftEnd,
        location: shiftLoc,
        cashDrawer: reliefStaffName.includes('Blessing') ? 'Drawer B (Blessing Ugwu)' : 'Drawer A (Relief Till)',
        openingBalance: 20000,
        isReliefShift: true,
        relievingFor: applicantName,
        relievingEmpId: applicantId,
        leaveRequestId: request.id,
        notes: `Relief cover for ${applicantName} on Approved ${request.type} Leave`,
        configuredBy: `Leave System Relief Auto-Reassignment (${request.id})`
      });
    }

    // 3. If Cashier, add / update scheduled cashierShift for Reliever
    if (isApplicantCashier) {
      const reliefCashierId = reliefStaffId === 'EMP-007' ? 'cashier01' : reliefStaffId === 'EMP-006' ? 'cashier' : reliefStaffId === 'EMP-008' ? 'cashier02' : reliefStaffId;
      const reliefCashierShiftId = `shift_relief_${request.id}_${dateStr}`;
      
      const existingReliefCashier = cashierShifts.find(s => 
        s.id === reliefCashierShiftId ||
        ((s.scheduledDate === dateStr || s.date === dateStr) && s.cashierId === reliefCashierId && s.isReliefShift)
      );

      if (!existingReliefCashier) {
        const isToday = dateStr === new Date().toISOString().slice(0, 10);
        const isPast = dateStr < new Date().toISOString().slice(0, 10);
        cashierShifts.unshift({
          id: reliefCashierShiftId,
          shiftNumber: `SHF-${new Date().getFullYear()}-RELIEF-${dateStr.slice(-2)}`,
          location: shiftLoc,
          cashDrawer: reliefStaffName.includes('Blessing') ? 'Drawer A (Mary Okon - Relieved by Blessing Ugwu)' : 'Drawer A (Relief Till)',
          cashierId: reliefCashierId,
          userId: 'staff_blessing',
          cashierName: `${reliefStaffName} (Relief for ${applicantName})`,
          staffRole: 'Front Desk Cashier',
          shiftType: 'CASHIER_MORNING_8H',
          scheduledDate: dateStr,
          startTime: shiftStart,
          endTime: shiftEnd,
          openingBalance: 20000,
          expectedClosingBalance: 20000,
          actualClosingBalance: isPast ? 20000 : null,
          cashCollected: 0,
          posCollected: 0,
          transferCollected: 0,
          totalInflow: 0,
          variance: 0,
          status: isPast ? 'CLOSED' : 'SCHEDULED',
          openedAt: isPast ? `${dateStr}T${shiftStart}:00.000Z` : null,
          closedAt: isPast ? `${dateStr}T${shiftEnd}:00.000Z` : null,
          transactions: [],
          configuredBy: `Leave System Relief Auto-Reassignment (${request.id})`,
          isReconciled: isPast,
          isReliefShift: true,
          relievingFor: applicantName,
          relievingEmpId: applicantId,
          leaveRequestId: request.id,
        });
      }
    }
  });

  syncShiftBalances();
};

router.patch(['/leave/:id/approve', '/leaves/:id/approve', '/leave/requests/:id/approve'], async (req: Request, res: Response) => {
  try {
    const request = leaveRequests.find(l => l.id === req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Leave request not found' });
    request.status = 'APPROVED';
    request.approvedBy = req.body.adminName || (req as any).user?.username || 'Hospital Administrator / Bishop';
    if (req.body.comments) request.adminComments = req.body.comments;
    
    // Auto-update employee status to ON_LEAVE
    const emp = employees.find(e => e.id === request.empId);
    if (emp) emp.status = 'ON_LEAVE';

    // Auto-reallocate duty roster shifts to designated relief officer
    reallocateLeaveShiftsToReliever(request);

    // Synchronize matching timesheets with new leave grid
    timesheets.forEach(ts => {
      if (ts.empId === request.empId || (request.empId === 'EMP-006' && ts.empId === 'EMP-006')) {
        const isCashier = ts.designation?.toLowerCase().includes('cashier') || ts.projectName?.includes('Revenue');
        ts.grid = generateMonthlyTimesheetGrid(ts.month || 'September', Number(ts.year) || 2026, ts.projectName, [1], isCashier ? 'cashier' : 'clinical', ts.empId);
        ts.hoursWorked = ts.grid.totalHoursWorked;
        ts.expectedHours = ts.grid.totalExpectedHours;
        ts.compliancePercentage = ts.grid.compliancePercentage;
      }
    });

    await logAudit({ userId: (req as any).user?.id, action: 'APPROVE_LEAVE', resourceType: 'LeaveRequest', resourceId: request.id });
    res.json({ 
      success: true, 
      data: request,
      message: `Leave approved! Shifts between ${request.startDate} and ${request.endDate} have been automatically reassigned to relief officer (${request.reliefOfficer || 'Reliever'}).`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to approve leave' });
  }
});

router.patch(['/leave/:id', '/leaves/:id', '/leave/requests/:id'], async (req: Request, res: Response) => {
  try {
    const request = leaveRequests.find(l => l.id === req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Leave request not found' });

    if (req.body.type) request.type = req.body.type;
    if (req.body.startDate) request.startDate = req.body.startDate;
    if (req.body.endDate) request.endDate = req.body.endDate;
    if (req.body.days !== undefined) request.days = Number(req.body.days) || request.days;
    if (req.body.reason !== undefined) request.reason = req.body.reason;
    if (req.body.selectedSupervisor) request.selectedSupervisor = req.body.selectedSupervisor;
    if (req.body.selectedSupervisorEmail) request.selectedSupervisorEmail = req.body.selectedSupervisorEmail;
    if (req.body.reliefOfficer) request.reliefOfficer = req.body.reliefOfficer;
    if (req.body.emergencyPhone) request.emergencyPhone = req.body.emergencyPhone;
    if (req.body.documentUrl !== undefined) request.documentUrl = req.body.documentUrl;

    // Reset status to PENDING_SUPERVISOR and clear rejection details on re-apply
    request.status = req.body.status || 'PENDING_SUPERVISOR';
    request.rejectionReason = null;
    request.rejectedBy = null;
    request.rejectedAt = null;
    request.resubmittedAt = new Date().toISOString();

    await logAudit({ userId: (req as any).user?.id, action: 'UPDATE_LEAVE', resourceType: 'LeaveRequest', resourceId: request.id });
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update leave request' });
  }
});

router.patch(['/leave/:id/reject', '/leaves/:id/reject', '/leave/requests/:id/reject'], async (req: Request, res: Response) => {
  try {
    const request = leaveRequests.find(l => l.id === req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Leave request not found' });
    request.status = 'REJECTED';
    request.rejectionReason = req.body.reason || 'Leave request returned for operational scheduling adjustment';
    request.rejectedBy = req.body.rejectedBy || (req as any).user?.username || 'Reviewer';
    request.rejectedAt = new Date().toISOString();
    await logAudit({ userId: (req as any).user?.id, action: 'REJECT_LEAVE', resourceType: 'LeaveRequest', resourceId: request.id });
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reject leave' });
  }
});

router.delete(['/leave/:id', '/leaves/:id', '/leave/requests/:id'], async (req: Request, res: Response) => {
  try {
    const idx = leaveRequests.findIndex(l => l.id === req.params.id);
    if (idx < 0) return res.status(404).json({ success: false, message: 'Leave request not found' });
    const removed = leaveRequests.splice(idx, 1)[0];
    res.json({ success: true, data: removed });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete leave request' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §19.8 - GAZETTED & PUBLIC HOLIDAYS STORE & API
// ─────────────────────────────────────────────────────────────────────────────

export let publicHolidays: any[] = [
  {
    id: 'HOL-001',
    title: 'National Independence Day',
    date: '2026-10-01',
    scope: 'ALL_STAFF', // 'ALL_STAFF' | 'DEPARTMENT' | 'CUSTOM_STAFF'
    targetDepartment: null,
    targetStaffIds: [],
    notes: 'Official Federal Public Holiday (100% Timesheet Credit)',
    createdBy: 'Hospital Admin'
  },
  {
    id: 'HOL-002',
    title: 'Christmas Day',
    date: '2026-12-25',
    scope: 'ALL_STAFF',
    targetDepartment: null,
    targetStaffIds: [],
    notes: 'Christmas Celebration Gazetted Holiday',
    createdBy: 'Hospital Admin'
  },
  {
    id: 'HOL-003',
    title: 'Boxing Day',
    date: '2026-12-26',
    scope: 'ALL_STAFF',
    targetDepartment: null,
    targetStaffIds: [],
    notes: 'Boxing Day Gazetted Holiday',
    createdBy: 'Hospital Admin'
  },
  {
    id: 'HOL-004',
    title: 'New Year Day',
    date: '2027-01-01',
    scope: 'ALL_STAFF',
    targetDepartment: null,
    targetStaffIds: [],
    notes: 'New Year Federal Public Holiday',
    createdBy: 'Hospital Admin'
  },
  {
    id: 'HOL-005',
    title: 'Workers Day (May Day)',
    date: '2026-05-01',
    scope: 'ALL_STAFF',
    targetDepartment: null,
    targetStaffIds: [],
    notes: 'International Workers Day',
    createdBy: 'Hospital Admin'
  },
  {
    id: 'HOL-006',
    title: 'Democracy Day',
    date: '2026-06-12',
    scope: 'ALL_STAFF',
    targetDepartment: null,
    targetStaffIds: [],
    notes: 'National Democracy Day',
    createdBy: 'Hospital Admin'
  }
];

router.get('/holidays', (req: Request, res: Response) => {
  res.json({ success: true, data: publicHolidays, total: publicHolidays.length });
});

router.post('/holidays', async (req: Request, res: Response) => {
  try {
    const { title, date, scope, targetDepartment, targetStaffIds, notes } = req.body;
    if (!title || !date) {
      return res.status(400).json({ success: false, message: 'Title and date are required' });
    }
    const newHol = {
      id: `HOL-${String(publicHolidays.length + 1).padStart(3, '0')}`,
      title,
      date,
      scope: scope || 'ALL_STAFF',
      targetDepartment: targetDepartment || null,
      targetStaffIds: Array.isArray(targetStaffIds) ? targetStaffIds : [],
      notes: notes || 'Hospital Gazetted Holiday',
      createdBy: (req as any).user?.username || 'Admin'
    };
    publicHolidays.unshift(newHol);
    await logAudit({ userId: (req as any).user?.id, action: 'CREATE_HOLIDAY', resourceType: 'Holiday', resourceId: newHol.id });
    res.status(201).json({ success: true, data: newHol });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create holiday' });
  }
});

router.delete('/holidays/:id', async (req: Request, res: Response) => {
  try {
    const idx = publicHolidays.findIndex(h => h.id === req.params.id);
    if (idx < 0) return res.status(404).json({ success: false, message: 'Holiday not found' });
    const removed = publicHolidays.splice(idx, 1)[0];
    await logAudit({ userId: (req as any).user?.id, action: 'DELETE_HOLIDAY', resourceType: 'Holiday', resourceId: removed.id });
    res.json({ success: true, data: removed });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete holiday' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STAFF ROSTER SCHEDULES & FULL CALENDAR MONTH TIMESHEET GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export const STAFF_ROSTER_SCHEDULES: Record<string, { days: number[]; shiftHours: number; shiftStart: string; shiftEnd: string; shiftName: string }> = {
  'EMP-006': {
    days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30],
    shiftHours: 8,
    shiftStart: '07:00',
    shiftEnd: '15:00',
    shiftName: 'Morning Cashier Shift (07:00 – 15:00)'
  },
  'cashier': {
    days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30],
    shiftHours: 8,
    shiftStart: '07:00',
    shiftEnd: '15:00',
    shiftName: 'Morning Cashier Shift (07:00 – 15:00)'
  },
  'EMP-007': {
    days: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30],
    shiftHours: 8,
    shiftStart: '14:00',
    shiftEnd: '22:00',
    shiftName: 'Afternoon Cashier Shift (14:00 – 22:00)'
  },
  'cashier01': {
    days: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30],
    shiftHours: 8,
    shiftStart: '14:00',
    shiftEnd: '22:00',
    shiftName: 'Afternoon Cashier Shift (14:00 – 22:00)'
  },
  'EMP-008': {
    days: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29],
    shiftHours: 12,
    shiftStart: '20:00',
    shiftEnd: '08:00',
    shiftName: 'Emergency Night Shift (20:00 – 08:00)'
  },
  'cashier02': {
    days: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29],
    shiftHours: 12,
    shiftStart: '20:00',
    shiftEnd: '08:00',
    shiftName: 'Emergency Night Shift (20:00 – 08:00)'
  },
  'EMP-003': {
    days: [6, 7, 13, 14, 20, 21, 27, 28],
    shiftHours: 12,
    shiftStart: '08:00',
    shiftEnd: '20:00',
    shiftName: 'Pharmacy Weekend / Relief Duty (08:00 – 20:00)'
  },
  'EMP-001': {
    days: [2, 5, 9, 12, 16, 19, 23, 26, 30],
    shiftHours: 24,
    shiftStart: '08:00',
    shiftEnd: '08:00',
    shiftName: 'Doctor Call Duty (24H Call)'
  },
  'EMP-002': {
    days: [1, 3, 6, 8, 10, 13, 15, 17, 20, 22, 24, 27, 29],
    shiftHours: 12,
    shiftStart: '20:00',
    shiftEnd: '08:00',
    shiftName: 'Nurse Inpatient Night Shift (20:00 – 08:00)'
  },
  'EMP-004': {
    days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26],
    shiftHours: 8,
    shiftStart: '08:00',
    shiftEnd: '16:00',
    shiftName: 'Diagnostic & Lab Shift (08:00 – 16:00)'
  },
  'EMP-005': {
    days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30],
    shiftHours: 8,
    shiftStart: '08:00',
    shiftEnd: '17:00',
    shiftName: 'Executive Admin Shift (08:00 – 17:00)'
  },
  'EMP-009': {
    days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30],
    shiftHours: 8,
    shiftStart: '08:00',
    shiftEnd: '16:00',
    shiftName: 'Revenue Unit Lead & Accountant Shift (08:00 – 16:00)'
  },
  'EMP-010': {
    days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30],
    shiftHours: 8,
    shiftStart: '08:00',
    shiftEnd: '16:00',
    shiftName: 'SI Assistant Shift (08:00 – 16:00)'
  },
  'EMP-012': {
    days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30],
    shiftHours: 8,
    shiftStart: '08:00',
    shiftEnd: '16:00',
    shiftName: 'Financial Accounting & Audit Shift (08:00 – 16:00)'
  },
  'accountant': {
    days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30],
    shiftHours: 8,
    shiftStart: '08:00',
    shiftEnd: '16:00',
    shiftName: 'Financial Accounting & Audit Shift (08:00 – 16:00)'
  },
  'finance': {
    days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30],
    shiftHours: 8,
    shiftStart: '08:00',
    shiftEnd: '16:00',
    shiftName: 'Revenue & Financial Control Shift (08:00 – 16:00)'
  },
  'EMP-013': {
    days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30],
    shiftHours: 8,
    shiftStart: '08:00',
    shiftEnd: '16:00',
    shiftName: 'Tracking Assistant & Lab Duty (08:00 – 16:00)'
  },
  'lab': {
    days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30],
    shiftHours: 8,
    shiftStart: '08:00',
    shiftEnd: '16:00',
    shiftName: 'Medical Laboratory & Diagnostic Duty (08:00 – 16:00)'
  }
};

export function generateMonthlyTimesheetGrid(
  monthName = 'September',
  year = 2026,
  projectName = 'Revenue & Cash Desk Operations',
  holidayDays: number[] = [],
  empRole = 'cashier',
  empId = 'EMP-006'
) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthIdx = monthNames.indexOf(monthName) >= 0 ? monthNames.indexOf(monthName) : 8;
  const totalDays = new Date(year, monthIdx + 1, 0).getDate();
  
  // Current active date in hospital timeline is September 14, 2026
  const isCurrentMonth = monthName === 'September' && year === 2026;
  const currentDayOfMonth = isCurrentMonth ? 14 : (year < 2026 || (year === 2026 && monthIdx < 8) ? 31 : 0);

  const emp = employees.find(e => e.id === empId);
  const empDept = emp?.department || 'Revenue & Billing';

  const staffSchedule = STAFF_ROSTER_SCHEDULES[empId] || STAFF_ROSTER_SCHEDULES[empRole] || STAFF_ROSTER_SCHEDULES['EMP-006'];
  const configuredDays = staffSchedule?.days || [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30];
  const shiftHours = staffSchedule?.shiftHours || 8;
  const shiftStart = staffSchedule?.shiftStart || '07:00';
  const shiftEnd = staffSchedule?.shiftEnd || '15:00';
  const shiftName = staffSchedule?.shiftName || (empRole.includes('cashier') ? '07:00 – 15:00 Morning Cashier Shift' : '08:00 – 16:00 Duty Shift');

  const days = [];
  let totalScheduledShifts = 0;
  let scheduledShiftsToDate = 0;
  let completedShiftsToDate = 0;
  let totalExpectedHours = 0;
  let totalActualProjectHours = 0;
  let totalActualHolidayHours = 0;
  let totalActualAnnualLeaveHours = 0;
  let totalActualSickLeaveHours = 0;
  let totalActualMaternityHours = 0;
  let totalActualPaternityHours = 0;
  let totalActualCasualLeaveHours = 0;
  let totalActualCompassionateLeaveHours = 0;
  let totalActualStudyLeaveHours = 0;
  let totalActualTrainingHours = 0;
  let totalOffDutyDays = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, monthIdx, d);
    const dayOfWeekIdx = dateObj.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
    const isSunday = dayOfWeekIdx === 0;
    const isSaturday = dayOfWeekIdx === 6;
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    // Dynamic Public Holiday Check (respects scope: ALL_STAFF, DEPARTMENT, CUSTOM_STAFF)
    const matchingHoliday = publicHolidays.find(h => {
      if (h.date !== dateStr) return false;
      if (h.scope === 'ALL_STAFF' || !h.scope) return true;
      if (h.scope === 'DEPARTMENT' && h.targetDepartment === empDept) return true;
      if (h.scope === 'CUSTOM_STAFF' && Array.isArray(h.targetStaffIds) && h.targetStaffIds.includes(empId)) return true;
      return false;
    });
    const isHoliday = Boolean(matchingHoliday) || (holidayDays && holidayDays.includes(d));
    const holidayTitle = matchingHoliday ? matchingHoliday.title : 'Public Holiday';

    // Dynamic Approved Leave Check for this specific staff member
    const matchingLeave = leaveRequests.find(l => {
      const isApproved = l.status === 'APPROVED' || l.status === 'Approved' || l.status === 'Approved & Synced';
      if (!isApproved) return false;
      const isMatch =
        l.empId === empId ||
        l.staffId === empId ||
        (empId === 'EMP-006' && (l.name?.toLowerCase().includes('mary okon') || l.empId === 'EMP-006' || l.empId === 'cashier')) ||
        (empId === 'cashier' && (l.name?.toLowerCase().includes('mary okon') || l.empId === 'EMP-006' || l.empId === 'cashier'));
      if (!isMatch) return false;
      return dateStr >= l.startDate && dateStr <= l.endDate;
    });

    const isPastOrToday = d <= currentDayOfMonth;
    const isToday = isCurrentMonth && d === 14;
    const isFuture = d > currentDayOfMonth;

    const isConfiguredShiftDay = configuredDays.includes(d);

    let expectedH = 0;
    let actualProjH = 0;
    let holH = 0;
    let annH = 0;
    let sickH = 0;
    let matH = 0;
    let patH = 0;
    let casH = 0;
    let compH = 0;
    let studyH = 0;
    let trainH = 0;
    let isScheduled = false;
    let isCompleted = false;
    let isOffDuty = false;
    let shiftType = 'OFF_DUTY';
    let shiftLabel = isSunday ? 'Roster Assigned Sunday Rest Day' : 'Roster Assigned Rotational Off-Duty Day';
    let shiftTime = 'OFF';
    let clockIn = '—';
    let clockOut = '—';
    let handoverTo = '—';
    let handoverMemoId = '—';
    let shiftStatus = 'OFF_DUTY';

    if (matchingLeave) {
      // Staff is on approved leave (Annual, Sick, Maternity, Paternity, Casual, Compassionate, Study)
      isScheduled = true;
      expectedH = shiftHours;
      totalScheduledShifts++;
      totalExpectedHours += shiftHours;

      const lType = (matchingLeave.type || 'ANNUAL').toUpperCase();
      shiftType = lType;
      shiftLabel = `Approved ${matchingLeave.type || lType} Leave`;
      shiftTime = `${lType} LEAVE`;

      if (lType === 'ANNUAL') {
        annH = shiftHours;
        totalActualAnnualLeaveHours += shiftHours;
      } else if (lType === 'SICK') {
        sickH = shiftHours;
        totalActualSickLeaveHours += shiftHours;
      } else if (lType === 'MATERNITY') {
        matH = shiftHours;
        totalActualMaternityHours += shiftHours;
      } else if (lType === 'PATERNITY') {
        patH = shiftHours;
        totalActualPaternityHours += shiftHours;
      } else if (lType === 'HOLIDAY') {
        holH = shiftHours;
        totalActualHolidayHours += shiftHours;
      } else if (lType === 'CASUAL') {
        casH = shiftHours;
        totalActualCasualLeaveHours += shiftHours;
      } else if (lType === 'COMPASSIONATE') {
        compH = shiftHours;
        totalActualCompassionateLeaveHours += shiftHours;
      } else if (lType === 'STUDY') {
        studyH = shiftHours;
        totalActualStudyLeaveHours += shiftHours;
      } else {
        trainH = shiftHours;
        totalActualTrainingHours += shiftHours;
      }

      if (isPastOrToday) {
        scheduledShiftsToDate++;
        completedShiftsToDate++;
        isCompleted = true;
        shiftStatus = 'LEAVE_CREDIT';
        clockIn = 'LEAVE';
        clockOut = 'LEAVE';
      } else {
        shiftStatus = 'UPCOMING_LEAVE';
        clockIn = 'LEAVE';
        clockOut = 'LEAVE';
      }
    } else if (isHoliday) {
      // Gazetted Public Holiday (100% Inflow Credit)
      expectedH = shiftHours;
      totalScheduledShifts++;
      totalExpectedHours += shiftHours;
      shiftType = 'HOLIDAY';
      shiftLabel = `${holidayTitle} (8H Inflow Credit)`;
      shiftTime = `${shiftStart} – ${shiftEnd} (HOLIDAY)`;

      if (isPastOrToday) {
        holH = shiftHours;
        scheduledShiftsToDate++;
        completedShiftsToDate++;
        totalActualHolidayHours += shiftHours;
        isCompleted = true;
        shiftStatus = 'HOLIDAY_CREDIT';
        clockIn = `${shiftStart} AM`;
        clockOut = `${shiftEnd} PM`;
      } else {
        shiftStatus = 'UPCOMING_HOLIDAY';
      }
    } else if (!isConfiguredShiftDay) {
      // Not configured in approved roster calendar -> Off-Duty (e.g. Sundays 6, 13, 20, 27 and Off Mondays 7, 21, 28 for Mary Okon)
      isOffDuty = true;
      totalOffDutyDays++;
      shiftType = 'OFF_DUTY';
      shiftLabel = isSunday ? 'Roster Assigned Sunday Rest Day' : 'Roster Assigned Rotational Off-Duty Day';
      shiftTime = 'OFF';
      shiftStatus = 'OFF_DUTY';
    } else {
      // Regular Scheduled Approved Duty Shift
      isScheduled = true;
      expectedH = shiftHours;
      totalScheduledShifts++;
      totalExpectedHours += shiftHours;
      shiftType = empRole.includes('cashier') ? 'CASHIER_MORNING_8H' : 'DUTY_SHIFT_8H';
      shiftLabel = shiftName;
      shiftTime = `${shiftStart} – ${shiftEnd}`;

      if (isPastOrToday) {
        scheduledShiftsToDate++;
        completedShiftsToDate++;
        actualProjH = shiftHours;
        totalActualProjectHours += shiftHours;
        isCompleted = true;
        clockIn = `${shiftStart} AM`;
        clockOut = `${shiftEnd} PM`;
        handoverTo = isSaturday ? 'Ibrahim Danladi (Weekend Till #02)' : 'Blessing Ugwu (Afternoon Till #02)';
        handoverMemoId = `HM-2026-09-${String(d).padStart(2, '0')}`;
        shiftStatus = isToday ? 'HANDOVER_COMPLETED' : 'CLOSED_HANDOVER';
      } else {
        actualProjH = 0;
        isCompleted = false;
        shiftStatus = 'UPCOMING_SCHEDULED';
        clockIn = '—';
        clockOut = '—';
        handoverTo = 'Pending Next Shift Officer';
        handoverMemoId = 'Pending Shift Clock-in';
      }
    }

    const totalDailyActual = actualProjH + holH + annH + sickH + matH + patH + casH + compH + studyH + trainH;

    days.push({
      day: d,
      date: dateStr,
      dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeekIdx],
      isWeekend: isSunday,
      isSunday,
      isSaturday,
      isOffDuty,
      isHoliday,
      isLeave: Boolean(matchingLeave),
      isPastOrToday,
      isToday,
      isFuture,
      expectedHours: expectedH,
      actualProjectHours: actualProjH,
      projectHours: actualProjH,
      annualLeave: annH,
      sickLeave: sickH,
      maternity: matH,
      maternityLeave: matH,
      paternityLeave: patH,
      holiday: holH,
      casualLeave: casH,
      compassionateLeave: compH,
      studyLeave: studyH,
      training: trainH,
      shiftType,
      shiftLabel,
      shiftTime,
      clockIn,
      clockOut,
      handoverTo,
      handoverMemoId,
      shiftStatus,
      isScheduledShift: isScheduled,
      isCompletedShift: isCompleted,
      deductionStatus: 'Normal',
      deductionHours: 0,
      totalDaily: totalDailyActual
    });
  }

  const totalHoursWorkedToDate = totalActualProjectHours + totalActualHolidayHours + totalActualAnnualLeaveHours + totalActualSickLeaveHours + totalActualMaternityHours + totalActualPaternityHours + totalActualCasualLeaveHours + totalActualCompassionateLeaveHours + totalActualStudyLeaveHours + totalActualTrainingHours;
  const remainingShifts = totalScheduledShifts - completedShiftsToDate;
  const compliancePercentage = scheduledShiftsToDate > 0 && completedShiftsToDate >= scheduledShiftsToDate ? 100 : (scheduledShiftsToDate > 0 ? Math.round((completedShiftsToDate / scheduledShiftsToDate) * 100) : 100);

  return {
    totalDays,
    currentDayOfMonth,
    totalScheduledShifts,
    scheduledShiftsToDate,
    completedShiftsToDate,
    remainingShifts,
    expectedShiftHours: totalExpectedHours,
    totalExpectedHours,
    totalProjectHours: totalActualProjectHours,
    totalHolidayHours: totalActualHolidayHours,
    totalAnnualLeaveHours: totalActualAnnualLeaveHours,
    totalSickLeaveHours: totalActualSickLeaveHours,
    totalMaternityHours: totalActualMaternityHours,
    totalPaternityHours: totalActualPaternityHours,
    totalCasualLeaveHours: totalActualCasualLeaveHours,
    totalCompassionateLeaveHours: totalActualCompassionateLeaveHours,
    totalStudyLeaveHours: totalActualStudyLeaveHours,
    totalTrainingHours: totalActualTrainingHours,
    totalOffDutyDays,
    totalHoursWorked: totalHoursWorkedToDate,
    compliancePercentage,
    days
  };
}

let timesheets: any[] = [
  {
    id: 'TSH-001',
    empId: 'EMP-013',
    name: 'Emmanuel Vegher',
    department: 'Prevention & Diagnostics',
    designation: 'Tracking Assistant & Lab Scientist',
    location: 'Asata Poly Clinic (Sub District Hospital)',
    state: 'Enugu',
    projectName: 'AYP HUB (Prevention & Public Health)',
    month: 'September',
    year: '2026',
    monthStr: 'September 2026',
    periodType: 'FULL_MONTH_1_TO_30',
    grid: generateMonthlyTimesheetGrid('September', 2026, 'AYP HUB (Prevention & Public Health)', [1], 'clinical', 'EMP-013'),
    hoursWorked: 96,
    expectedHours: 176,
    compliancePercentage: 100,
    submittedAt: '2026-09-13',
    status: 'APPROVED',
    // 3-Tier Signatures
    staffSignature: {
      signed: true,
      name: 'Emmanuel Vegher',
      date: 'September 13, 2026',
      signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M15 35 C30 10, 45 40, 60 15 C75 35, 90 20, 110 30 C125 15, 140 35, 150 25" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 40 L140 38" stroke="%231e3a8a" stroke-width="1.2" fill="none"/></svg>'
    },
    supervisorSignature: {
      signed: true,
      name: 'Ekwedike Dennis',
      role: 'Project Coordinator',
      date: 'September 13, 2026',
      signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M10 25 C30 5, 50 45, 80 15 C100 35, 120 15, 150 25" stroke="%230f766e" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>'
    },
    adminSignature: {
      signed: true,
      name: 'Amedu Alapa',
      role: 'Hospital Administrator',
      date: 'September 13, 2026',
      signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M15 20 Q40 5 60 30 T110 20 T145 30" stroke="%23047857" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>'
    },
    comments: 'All assigned roster shifts successfully completed and verified for September 2026. 100% compliance achieved.'
  },
  {
    id: 'TSH-012',
    empId: 'EMP-012',
    name: 'David Adeleke',
    department: 'Billing & Finance',
    designation: 'Senior Accountant & Auditor',
    location: 'Faith Foundation Mission Hospital',
    state: 'Enugu',
    projectName: 'Financial Accounting, Auditing & Ledger Reconciliation',
    month: 'September',
    year: '2026',
    monthStr: 'September 2026',
    periodType: 'FULL_MONTH_1_TO_30',
    grid: generateMonthlyTimesheetGrid('September', 2026, 'Financial Accounting, Auditing & Ledger Reconciliation', [1], 'accountant', 'EMP-012'),
    hoursWorked: 112,
    expectedHours: 176,
    compliancePercentage: 64,
    submittedAt: '2026-09-14',
    status: 'SUBMITTED',
    staffSignature: {
      signed: true,
      name: 'David Adeleke',
      date: 'September 14, 2026',
      signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 30 C30 12, 50 35, 75 16 C95 32, 115 15, 140 28" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">David Adeleke</text></svg>'
    },
    supervisorSignature: {
      signed: false,
      name: 'Chinedu Okafor',
      role: 'Chief Financial Officer (CFO) / Revenue Unit Lead',
      date: null,
      signatureData: null
    },
    adminSignature: {
      signed: false,
      name: 'Amedu Alapa',
      role: 'Hospital Administrator',
      date: null,
      signatureData: null
    },
    comments: 'Hospital billing ledger audits, monthly reconciliation, and bank statements verified.'
  },
  {
    id: 'TSH-009',
    empId: 'EMP-009',
    name: 'Chinedu Okafor',
    department: 'Finance & Revenue',
    designation: 'Revenue Unit Lead & Accountant',
    location: 'Faith Foundation Mission Hospital',
    state: 'Enugu',
    projectName: 'Hospital Revenue Management & Financial Control',
    month: 'September',
    year: '2026',
    monthStr: 'September 2026',
    periodType: 'FULL_MONTH_1_TO_30',
    grid: generateMonthlyTimesheetGrid('September', 2026, 'Hospital Revenue Management & Financial Control', [1], 'accountant', 'EMP-009'),
    hoursWorked: 120,
    expectedHours: 176,
    compliancePercentage: 68,
    submittedAt: '2026-09-14',
    status: 'SUBMITTED',
    staffSignature: {
      signed: true,
      name: 'Chinedu Okafor',
      date: 'September 14, 2026',
      signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M10 25 C30 5, 50 45, 80 15 C100 35, 120 15, 150 25" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="15" y="45" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Chinedu Okafor</text></svg>'
    },
    supervisorSignature: {
      signed: false,
      name: 'Amedu Alapa',
      role: 'Hospital Administrator',
      date: null,
      signatureData: null
    },
    adminSignature: {
      signed: false,
      name: 'Amedu Alapa',
      role: 'Hospital Administrator',
      date: null,
      signatureData: null
    },
    comments: 'Financial unit operations, revenue reconciliations, and payroll draft reviews.'
  },
  {
    id: 'TSH-002',
    empId: 'EMP-006',
    name: 'Mary Okon',
    department: 'Finance & Revenue',
    designation: 'Senior Cashier & Revenue Officer',
    location: 'Faith Foundation Mission Hospital',
    state: 'Enugu',
    projectName: 'Revenue & Cash Desk Operations',
    month: 'September',
    year: '2026',
    monthStr: 'September 2026',
    periodType: 'FULL_MONTH_1_TO_30',
    grid: generateMonthlyTimesheetGrid('September', 2026, 'Revenue & Cash Desk Operations', [1], 'cashier', 'EMP-006'),
    hoursWorked: 112,
    expectedHours: 192,
    compliancePercentage: 58,
    submittedAt: '2026-09-15',
    status: 'SUBMITTED',
    staffSignature: {
      signed: true,
      name: 'Mary Okon',
      date: 'September 15, 2026',
      signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M12 32 C28 10, 48 38, 70 16 C88 32, 110 14, 130 26 C145 18, 160 30, 170 22" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Mary Okon</text></svg>'
    },
    supervisorSignature: {
      signed: false,
      name: 'Chinedu Okafor',
      role: 'Revenue Unit Lead',
      date: null,
      signatureData: null
    },
    adminSignature: {
      signed: false,
      name: 'Amedu Alapa',
      role: 'Hospital Administrator',
      date: null,
      signatureData: null
    },
    comments: 'All 23 scheduled cashier shifts and morning/afternoon till balances reconciled. Ready for Supervisor verification.'
  },
  {
    id: 'TSH-003',
    empId: 'EMP-010',
    name: 'Amarachi Duru',
    department: 'Strategic Information',
    designation: 'Senior SI Assistant',
    location: 'Okigwe General Hospital',
    state: 'Imo',
    projectName: 'Access Project',
    month: 'May',
    year: '2026',
    monthStr: 'May 2026',
    periodType: 'FULL_MONTH_1_TO_31',
    grid: generateMonthlyTimesheetGrid('May', 2026, 'Access Project', [1], 'clinical', 'EMP-010'),
    hoursWorked: 176,
    expectedHours: 176,
    compliancePercentage: 100,
    submittedAt: '2026-05-19',
    status: 'APPROVED',
    staffSignature: {
      signed: true,
      name: 'AMARACHI DURU',
      date: 'May 19, 2026',
      signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M20 35 C40 10, 60 40, 90 15 C115 35, 135 15, 145 30" stroke="%23111827" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>'
    },
    supervisorSignature: {
      signed: true,
      name: 'EKWEDIKE DENNIS',
      role: 'Project Coordinator',
      date: 'June 02, 2026',
      signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M10 25 C30 5, 50 45, 80 15 C100 35, 120 15, 150 25" stroke="%23111827" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>'
    },
    adminSignature: {
      signed: true,
      name: 'AMEDU ALAPA',
      role: 'CARITAS Supervisor',
      date: 'June 03, 2026',
      signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M15 20 Q40 5 60 30 T110 20 T145 30" stroke="%23111827" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>'
    },
    comments: 'Monthly Time Report May 2026. 100% compliance achieved.'
  },
  {
    id: 'TSH-004',
    empId: 'EMP-007',
    name: 'Blessing Ugwu',
    department: 'Finance & Revenue',
    designation: 'Cashier / Billing Desk',
    location: 'Faith Foundation Mission Hospital',
    state: 'Enugu',
    projectName: 'Revenue & Emergency IPD Till Operations',
    month: 'September',
    year: '2026',
    monthStr: 'September 2026',
    periodType: 'FULL_MONTH_1_TO_30',
    grid: generateMonthlyTimesheetGrid('September', 2026, 'Revenue & Emergency IPD Till Operations', [1], 'cashier', 'EMP-007'),
    hoursWorked: 112,
    expectedHours: 192,
    compliancePercentage: 58,
    submittedAt: '2026-09-13',
    status: 'SUBMITTED',
    staffSignature: {
      signed: true,
      name: 'Blessing Ugwu',
      date: 'September 13, 2026',
      signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M15 32 C35 15, 55 42, 85 18 C110 32, 130 18, 145 28" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>'
    },
    supervisorSignature: {
      signed: false,
      name: 'Ekwedike Dennis',
      role: 'Project Coordinator / Unit Lead',
      date: null,
      signatureData: null
    },
    adminSignature: {
      signed: false,
      name: 'Tunde Fashola',
      role: 'Hospital Administrator',
      date: null,
      signatureData: null
    },
    comments: 'Submitted for Project Coordinator review.'
  },
  {
    id: 'TSH-005',
    empId: 'EMP-008',
    name: 'Ibrahim Danladi',
    department: 'Finance & Revenue',
    designation: 'Cashier / Emergency Desk',
    location: 'Faith Foundation Mission Hospital',
    state: 'Enugu',
    projectName: 'Revenue & Cash Desk Operations',
    month: 'September',
    year: '2026',
    monthStr: 'September 2026',
    periodType: 'FULL_MONTH_1_TO_30',
    grid: generateMonthlyTimesheetGrid('September', 2026, 'Revenue & Cash Desk Operations', [1], 'cashier', 'EMP-008'),
    hoursWorked: 112,
    expectedHours: 192,
    compliancePercentage: 58,
    submittedAt: '2026-09-14',
    status: 'SUBMITTED',
    staffSignature: {
      signed: true,
      name: 'Ibrahim Danladi',
      date: 'September 14, 2026',
      signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M12 28 C30 12, 50 38, 75 14 C95 32, 120 16, 140 26" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>'
    },
    supervisorSignature: {
      signed: false,
      name: 'Mary Okon',
      role: 'Senior Cashier & Shift Supervisor',
      date: null,
      signatureData: null
    },
    adminSignature: {
      signed: false,
      name: 'Amedu Alapa',
      role: 'Hospital Administrator',
      date: null,
      signatureData: null
    },
    comments: 'All emergency till shift collections balanced. Submitted to Senior Supervisor Mary Okon for verification.'
  },
  {
    id: 'TSH-ADM-001',
    empId: 'EMP-ADM-001',
    name: 'System Administrator',
    department: 'Administration & Medical Direction',
    designation: 'Hospital Administrator & Medical Director',
    location: 'Faith Foundation Mission Hospital',
    state: 'Enugu',
    projectName: 'Hospital Administration, Governance & Clinical Oversight',
    month: 'September',
    year: '2026',
    monthStr: 'September 2026',
    periodType: 'FULL_MONTH_1_TO_30',
    grid: generateMonthlyTimesheetGrid('September', 2026, 'Hospital Administration, Governance & Clinical Oversight', [1], 'admin', 'EMP-ADM-001'),
    hoursWorked: 168,
    expectedHours: 168,
    compliancePercentage: 100,
    status: 'DRAFT',
    staffSignature: {
      signed: false,
      name: 'System Administrator',
      role: 'Hospital Administrator & Medical Director',
      date: null,
      signatureData: null
    },
    supervisorSignature: {
      signed: false,
      name: 'Most Rev. Dr. C.V.C. Onaga',
      role: 'Catholic Diocesan Bishop & Patron',
      date: null,
      signatureData: null
    },
    adminSignature: {
      signed: false,
      name: 'Most Rev. Dr. C.V.C. Onaga',
      role: 'Catholic Diocesan Bishop & Patron',
      date: null,
      signatureData: null
    },
    comments: 'Executive Administration & Medical Directorate Monthly Time & Activity Report.'
  }
];

router.get('/timesheets', (req: Request, res: Response) => {
  timesheets.forEach(ts => {
    const isCashier = ts.designation?.toLowerCase().includes('cashier') || ts.projectName?.includes('Revenue');
    ts.grid = generateMonthlyTimesheetGrid(ts.month || 'September', Number(ts.year) || 2026, ts.projectName, [1], isCashier ? 'cashier' : 'clinical', ts.empId);
    ts.hoursWorked = ts.grid.totalHoursWorked;
    ts.expectedHours = ts.grid.expectedShiftHours || ts.grid.totalExpectedHours;
    ts.compliancePercentage = ts.grid.compliancePercentage;
  });
  res.json({ success: true, data: timesheets, total: timesheets.length });
});

router.get('/timesheets/:id', (req: Request, res: Response) => {
  const ts = timesheets.find(t => t.id === req.params.id);
  if (!ts) return res.status(404).json({ success: false, message: 'Timesheet not found' });
  res.json({ success: true, data: ts });
});

router.post('/timesheets', async (req: Request, res: Response) => {
  try {
    const { empId, month, year, projectName, department, designation, location, state, supervisorName } = req.body;
    const emp = employees.find(e => e.id === empId);
    const mName = month || 'September';
    const yNum = Number(year) || 2026;
    const pName = projectName || 'AYP HUB (Prevention)';
    const staffName = emp ? `${emp.firstName} ${emp.lastName}` : (req.body.name || 'Hospital Staff');
    const isCashier = designation?.toLowerCase().includes('cashier') || emp?.role?.toLowerCase().includes('cashier');
    const grid = generateMonthlyTimesheetGrid(mName, yNum, pName, [1], isCashier ? 'cashier' : 'clinical', empId || emp?.id);

    const timesheet = {
      id: `TSH-${String(timesheets.length + 1).padStart(3, '0')}`,
      empId: empId || emp?.id || `EMP-${Date.now()}`,
      name: staffName,
      department: department || emp?.department || 'Clinical & Revenue',
      designation: designation || emp?.role || 'Staff Officer',
      location: location || 'Faith Foundation Mission Hospital',
      state: state || 'Enugu',
      projectName: pName,
      month: mName,
      year: String(yNum),
      monthStr: `${mName} ${yNum}`,
      periodType: grid.totalDays === 31 ? 'FULL_MONTH_1_TO_31' : 'FULL_MONTH_1_TO_30',
      grid,
      hoursWorked: grid.totalHoursWorked,
      expectedHours: grid.expectedShiftHours,
      compliancePercentage: grid.compliancePercentage,
      submittedAt: new Date().toISOString().slice(0, 10),
      status: 'SUBMITTED',
      staffSignature: {
        signed: true,
        name: staffName,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M15 35 C30 10, 45 40, 60 15 C75 35, 90 20, 110 30 C125 15, 140 35, 150 25" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 40 L140 38" stroke="%231e3a8a" stroke-width="1.2" fill="none"/></svg>'
      },
      supervisorSignature: {
        signed: false,
        name: supervisorName || 'Ekwedike Dennis',
        role: 'Project Coordinator',
        date: null,
        signatureData: null
      },
      adminSignature: {
        signed: false,
        name: 'Amedu Alapa',
        role: 'Hospital Administrator',
        date: null,
        signatureData: null
      },
      comments: 'Submitted timesheet for full calendar month duty cycle.'
    };
    timesheets.unshift(timesheet);
    res.status(201).json({ success: true, data: timesheet });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create timesheet' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// User Digital Signatures Store & Endpoints (Strictly Per-Account Mapping)
// ─────────────────────────────────────────────────────────────────────────────
const userSignatures: Record<string, { signatureData: string; signatureType: string; signatureName: string; updatedAt: string }> = {
  // Mary Okon (Senior Cashier & Revenue Officer)
  'EMP-006': {
    signatureName: 'Mary Okon',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M12 32 C28 10, 48 38, 70 16 C88 32, 110 14, 130 26 C145 18, 160 30, 170 22" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Mary Okon</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'mary.okon': {
    signatureName: 'Mary Okon',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M12 32 C28 10, 48 38, 70 16 C88 32, 110 14, 130 26 C145 18, 160 30, 170 22" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Mary Okon</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'mary.okon@hospital.com': {
    signatureName: 'Mary Okon',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M12 32 C28 10, 48 38, 70 16 C88 32, 110 14, 130 26 C145 18, 160 30, 170 22" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Mary Okon</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'cashier': {
    signatureName: 'Mary Okon',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M12 32 C28 10, 48 38, 70 16 C88 32, 110 14, 130 26 C145 18, 160 30, 170 22" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Mary Okon</text></svg>',
    updatedAt: new Date().toISOString()
  },

  // Chinedu Okafor (Revenue Unit Lead / Senior Supervisor)
  'EMP-009': {
    signatureName: 'Chinedu Okafor',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M10 25 C25 8, 42 42, 68 14 C90 36, 115 12, 140 28 C155 18, 168 32, 175 20" stroke="%230f766e" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="16" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="19" font-style="italic" fill="%230f766e">Chinedu Okafor</text><line x1="12" y1="46" x2="168" y2="46" stroke="%230f766e" stroke-width="1.2"/></svg>',
    updatedAt: new Date().toISOString()
  },
  'chinedu.okafor': {
    signatureName: 'Chinedu Okafor',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M10 25 C25 8, 42 42, 68 14 C90 36, 115 12, 140 28 C155 18, 168 32, 175 20" stroke="%230f766e" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="16" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="19" font-style="italic" fill="%230f766e">Chinedu Okafor</text><line x1="12" y1="46" x2="168" y2="46" stroke="%230f766e" stroke-width="1.2"/></svg>',
    updatedAt: new Date().toISOString()
  },
  'chinedu.okafor@hospital.com': {
    signatureName: 'Chinedu Okafor',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M10 25 C25 8, 42 42, 68 14 C90 36, 115 12, 140 28 C155 18, 168 32, 175 20" stroke="%230f766e" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="16" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="19" font-style="italic" fill="%230f766e">Chinedu Okafor</text><line x1="12" y1="46" x2="168" y2="46" stroke="%230f766e" stroke-width="1.2"/></svg>',
    updatedAt: new Date().toISOString()
  },
  'Chinedu Okafor': {
    signatureName: 'Chinedu Okafor',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M10 25 C25 8, 42 42, 68 14 C90 36, 115 12, 140 28 C155 18, 168 32, 175 20" stroke="%230f766e" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="16" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="19" font-style="italic" fill="%230f766e">Chinedu Okafor</text><line x1="12" y1="46" x2="168" y2="46" stroke="%230f766e" stroke-width="1.2"/></svg>',
    updatedAt: new Date().toISOString()
  },
  'SUP-01': {
    signatureName: 'Chinedu Okafor',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M10 25 C25 8, 42 42, 68 14 C90 36, 115 12, 140 28 C155 18, 168 32, 175 20" stroke="%230f766e" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="16" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="19" font-style="italic" fill="%230f766e">Chinedu Okafor</text><line x1="12" y1="46" x2="168" y2="46" stroke="%230f766e" stroke-width="1.2"/></svg>',
    updatedAt: new Date().toISOString()
  },

  // Blessing Ugwu (Senior Cashier & Shift Lead)
  'EMP-007': {
    signatureName: 'Blessing Ugwu',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M12 28 C30 12, 50 38, 78 15 C100 32, 125 15, 145 28 C158 20, 168 28, 172 22" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Blessing Ugwu</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'blessing.ugwu': {
    signatureName: 'Blessing Ugwu',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M12 28 C30 12, 50 38, 78 15 C100 32, 125 15, 145 28 C158 20, 168 28, 172 22" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Blessing Ugwu</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'blessing.ugwu@hospital.com': {
    signatureName: 'Blessing Ugwu',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M12 28 C30 12, 50 38, 78 15 C100 32, 125 15, 145 28 C158 20, 168 28, 172 22" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Blessing Ugwu</text></svg>',
    updatedAt: new Date().toISOString()
  },

  // Ibrahim Danladi (Weekend Cashier Till Supervisor)
  'EMP-008': {
    signatureName: 'Ibrahim Danladi',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M12 28 C30 12, 50 38, 75 14 C95 32, 120 16, 140 26 C155 18, 165 28, 172 20" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Ibrahim Danladi</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'ibrahim.danladi': {
    signatureName: 'Ibrahim Danladi',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M12 28 C30 12, 50 38, 75 14 C95 32, 120 16, 140 26 C155 18, 165 28, 172 20" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Ibrahim Danladi</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'ibrahim.danladi@hospital.com': {
    signatureName: 'Ibrahim Danladi',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M12 28 C30 12, 50 38, 75 14 C95 32, 120 16, 140 26 C155 18, 165 28, 172 20" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Ibrahim Danladi</text></svg>',
    updatedAt: new Date().toISOString()
  },

  // Ekwedike Dennis (Hospital Projects & Caritas Coordinator)
  'EMP-010': {
    signatureName: 'Ekwedike Dennis',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M10 25 C30 5, 50 45, 80 15 C100 35, 120 15, 150 25 C160 18, 170 26, 175 20" stroke="%230f766e" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="16" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%230f766e">Ekwedike Dennis</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'ekwedike.dennis': {
    signatureName: 'Ekwedike Dennis',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M10 25 C30 5, 50 45, 80 15 C100 35, 120 15, 150 25 C160 18, 170 26, 175 20" stroke="%230f766e" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="16" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%230f766e">Ekwedike Dennis</text></svg>',
    updatedAt: new Date().toISOString()
  },

  // Ngozi Eze (Chief Nursing Officer / Ward Supervisor)
  'EMP-011': {
    signatureName: 'Ngozi Eze',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M14 26 C32 10, 52 38, 80 16 C102 34, 128 14, 148 26" stroke="%237c3aed" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%237c3aed">Ngozi Eze</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'ngozi.eze': {
    signatureName: 'Ngozi Eze',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M14 26 C32 10, 52 38, 80 16 C102 34, 128 14, 148 26" stroke="%237c3aed" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%237c3aed">Ngozi Eze</text></svg>',
    updatedAt: new Date().toISOString()
  },

  // Amedu Alapa (Hospital Administrator)
  'ADM-01': {
    signatureName: 'Amedu Alapa',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 22 Q40 6 65 32 T115 18 T155 28" stroke="%23047857" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="19" font-style="italic" fill="%23047857">Amedu Alapa</text><line x1="15" y1="47" x2="165" y2="47" stroke="%23047857" stroke-width="1.2"/></svg>',
    updatedAt: new Date().toISOString()
  },
  'EMP-ADM-001': {
    signatureName: 'Amedu Alapa',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 22 Q40 6 65 32 T115 18 T155 28" stroke="%23047857" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="19" font-style="italic" fill="%23047857">Amedu Alapa</text><line x1="15" y1="47" x2="165" y2="47" stroke="%23047857" stroke-width="1.2"/></svg>',
    updatedAt: new Date().toISOString()
  },
  'amedu.admin': {
    signatureName: 'Amedu Alapa',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 22 Q40 6 65 32 T115 18 T155 28" stroke="%23047857" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="19" font-style="italic" fill="%23047857">Amedu Alapa</text><line x1="15" y1="47" x2="165" y2="47" stroke="%23047857" stroke-width="1.2"/></svg>',
    updatedAt: new Date().toISOString()
  },
  'amedu.admin@hospital.com': {
    signatureName: 'Amedu Alapa',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 22 Q40 6 65 32 T115 18 T155 28" stroke="%23047857" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="19" font-style="italic" fill="%23047857">Amedu Alapa</text><line x1="15" y1="47" x2="165" y2="47" stroke="%23047857" stroke-width="1.2"/></svg>',
    updatedAt: new Date().toISOString()
  },
  'Amedu Alapa': {
    signatureName: 'Amedu Alapa',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 22 Q40 6 65 32 T115 18 T155 28" stroke="%23047857" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="19" font-style="italic" fill="%23047857">Amedu Alapa</text><line x1="15" y1="47" x2="165" y2="47" stroke="%23047857" stroke-width="1.2"/></svg>',
    updatedAt: new Date().toISOString()
  },

  // Most Rev. Dr. C.V.C. Onaga (Catholic Diocesan Bishop & Patron)
  'ADM-02': {
    signatureName: 'Most Rev. Dr. C.V.C. Onaga',
    signatureType: 'type',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="260" height="60" viewBox="0 0 260 60"><text x="10" y="40" font-family="Brush Script MT, cursive, sans-serif" font-size="26" font-style="italic" fill="%235c1a2e">+ Most Rev. C.V.C. Onaga</text><line x1="10" y1="46" x2="250" y2="46" stroke="%235c1a2e" stroke-width="1.5"/></svg>',
    updatedAt: new Date().toISOString()
  },
  'bishop.onaga': {
    signatureName: 'Most Rev. Dr. C.V.C. Onaga',
    signatureType: 'type',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="260" height="60" viewBox="0 0 260 60"><text x="10" y="40" font-family="Brush Script MT, cursive, sans-serif" font-size="26" font-style="italic" fill="%235c1a2e">+ Most Rev. C.V.C. Onaga</text><line x1="10" y1="46" x2="250" y2="46" stroke="%235c1a2e" stroke-width="1.5"/></svg>',
    updatedAt: new Date().toISOString()
  },
  'bishop': {
    signatureName: 'Most Rev. Dr. C.V.C. Onaga',
    signatureType: 'type',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="260" height="60" viewBox="0 0 260 60"><text x="10" y="40" font-family="Brush Script MT, cursive, sans-serif" font-size="26" font-style="italic" fill="%235c1a2e">+ Most Rev. C.V.C. Onaga</text><line x1="10" y1="46" x2="250" y2="46" stroke="%235c1a2e" stroke-width="1.5"/></svg>',
    updatedAt: new Date().toISOString()
  },

  // David Adeleke (Senior Accountant & Auditor)
  'EMP-012': {
    signatureName: 'David Adeleke',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 30 C30 12, 50 35, 75 16 C95 32, 115 15, 140 28" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">David Adeleke</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'accountant': {
    signatureName: 'David Adeleke',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 30 C30 12, 50 35, 75 16 C95 32, 115 15, 140 28" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">David Adeleke</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'accountant@hospital.com': {
    signatureName: 'David Adeleke',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 30 C30 12, 50 35, 75 16 C95 32, 115 15, 140 28" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">David Adeleke</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'David Adeleke': {
    signatureName: 'David Adeleke',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 30 C30 12, 50 35, 75 16 C95 32, 115 15, 140 28" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">David Adeleke</text></svg>',
    updatedAt: new Date().toISOString()
  },

  // Emmanuel Vegher (Tracking Assistant & Lab Scientist)
  'EMP-013': {
    signatureName: 'Emmanuel Vegher',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 35 C30 10, 45 40, 60 15 C75 35, 90 20, 110 30 C125 15, 140 35, 150 25" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Emmanuel Vegher</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'emmanuel.vegher': {
    signatureName: 'Emmanuel Vegher',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 35 C30 10, 45 40, 60 15 C75 35, 90 20, 110 30 C125 15, 140 35, 150 25" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Emmanuel Vegher</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'emmanuel.vegher@hospital.com': {
    signatureName: 'Emmanuel Vegher',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 35 C30 10, 45 40, 60 15 C75 35, 90 20, 110 30 C125 15, 140 35, 150 25" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Emmanuel Vegher</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'Emmanuel Vegher': {
    signatureName: 'Emmanuel Vegher',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M15 35 C30 10, 45 40, 60 15 C75 35, 90 20, 110 30 C125 15, 140 35, 150 25" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="18" y="44" font-family="Brush Script MT, cursive, sans-serif" font-size="18" font-style="italic" fill="%231e3a8a">Emmanuel Vegher</text></svg>',
    updatedAt: new Date().toISOString()
  },
  'Most Rev. Dr. C.V.C. Onaga': {
    signatureName: 'Most Rev. Dr. C.V.C. Onaga',
    signatureType: 'type',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="260" height="60" viewBox="0 0 260 60"><text x="10" y="40" font-family="Brush Script MT, cursive, sans-serif" font-size="26" font-style="italic" fill="%235c1a2e">+ Most Rev. C.V.C. Onaga</text><line x1="10" y1="46" x2="250" y2="46" stroke="%235c1a2e" stroke-width="1.5"/></svg>',
    updatedAt: new Date().toISOString()
  },

  // Tunde Fashola
  'admin': {
    signatureName: 'Tunde Fashola',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60"><path d="M15 25 C30 10, 45 40, 75 15 C95 35, 115 15, 140 25 C155 35, 175 15, 195 25" stroke="%23047857" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="15" y="52" font-family="Brush Script MT, cursive, sans-serif" font-size="22" font-style="italic" fill="%23047857">Tunde Fashola</text><line x1="10" y1="56" x2="200" y2="56" stroke="%23047857" stroke-width="1.2"/></svg>',
    updatedAt: new Date().toISOString()
  },
  'tunde.fashola': {
    signatureName: 'Tunde Fashola',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60"><path d="M15 25 C30 10, 45 40, 75 15 C95 35, 115 15, 140 25 C155 35, 175 15, 195 25" stroke="%23047857" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="15" y="52" font-family="Brush Script MT, cursive, sans-serif" font-size="22" font-style="italic" fill="%23047857">Tunde Fashola</text><line x1="10" y1="56" x2="200" y2="56" stroke="%23047857" stroke-width="1.2"/></svg>',
    updatedAt: new Date().toISOString()
  },
  'EMP-005': {
    signatureName: 'Tunde Fashola',
    signatureType: 'draw',
    signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60"><path d="M15 25 C30 10, 45 40, 75 15 C95 35, 115 15, 140 25 C155 35, 175 15, 195 25" stroke="%23047857" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="15" y="52" font-family="Brush Script MT, cursive, sans-serif" font-size="22" font-style="italic" fill="%23047857">Tunde Fashola</text><line x1="10" y1="56" x2="200" y2="56" stroke="%23047857" stroke-width="1.2"/></svg>',
    updatedAt: new Date().toISOString()
  }
};

// ─── Digital Signatures Store & PostgreSQL Table ─────────────────────────────
async function initSignatureTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_digital_signatures (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        username VARCHAR(255),
        email VARCHAR(255),
        employee_id VARCHAR(255),
        signature_name VARCHAR(255),
        signature_type VARCHAR(100) DEFAULT 'draw',
        signature_data TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_user_digital_signatures_user_id ON user_digital_signatures(user_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_user_digital_signatures_username ON user_digital_signatures(username)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_user_digital_signatures_email ON user_digital_signatures(email)`);
  } catch (err) {
    console.error('[DB] Note on user_digital_signatures table init:', err);
  }
}
initSignatureTable().catch(() => {});

router.get('/signatures/me', async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const userId = authUser?.id || authUser?.userId || req.query.userId;
  let username = authUser?.username || '';
  let email = authUser?.email || '';
  let employeeId = authUser?.employeeId || '';
  let fullName = `${authUser?.firstName || ''} ${authUser?.lastName || ''}`.trim() || authUser?.name || '';

  // Look up full user details from PostgreSQL DB if only userId was in token
  if (userId) {
    try {
      const dbUser: any = await prisma.user.findUnique({
        where: { id: String(userId) },
        include: { staff: true }
      });
      if (dbUser) {
        if (!username) username = dbUser.username || '';
        if (!email) email = dbUser.email || '';
        if (!fullName) fullName = `${dbUser.staff?.firstName || dbUser.firstName || ''} ${dbUser.staff?.lastName || dbUser.lastName || ''}`.trim();
        if (!employeeId && dbUser.staff?.employeeId) employeeId = dbUser.staff.employeeId;
      }
    } catch (e) {}
  }

  let sig: any = null;

  // 1. Query PostgreSQL database directly for persistent signature
  try {
    const uId = userId ? String(userId) : '';
    const uName = (username || '').toLowerCase();
    const uEmail = (email || '').toLowerCase();
    const uEmp = (employeeId || '').toLowerCase();
    const uFull = (fullName || '').toLowerCase();

    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, user_id, username, email, employee_id, signature_name, signature_type, signature_data, updated_at
      FROM user_digital_signatures
      WHERE ($1 != '' AND (user_id = $1 OR id = $1))
         OR ($2 != '' AND LOWER(username) = $2)
         OR ($3 != '' AND LOWER(email) = $3)
         OR ($4 != '' AND LOWER(employee_id) = $4)
         OR ($5 != '' AND LOWER(signature_name) = $5)
      ORDER BY updated_at DESC
      LIMIT 1;
    `, uId, uName, uEmail, uEmp, uFull);

    if (rows && rows.length > 0) {
      const row = rows[0];
      sig = {
        signatureName: row.signature_name,
        signatureType: row.signature_type,
        signatureData: row.signature_data,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
      };
      if (userId) userSignatures[String(userId)] = sig;
      if (username) userSignatures[username.toLowerCase()] = sig;
    }
  } catch (err) {
    console.warn('[DB] Could not query user_digital_signatures table from PostgreSQL:', err);
  }

  // 2. Look up signature for this specific user in memory cache if DB query didn't find specific match
  if (!sig) {
    sig = (userId && userSignatures[String(userId)]) ||
          (username && userSignatures[username.toLowerCase()]) ||
          (email && userSignatures[email.toLowerCase()]) ||
          (employeeId && userSignatures[employeeId]) ||
          (fullName && userSignatures[fullName]) ||
          null;
  }

  // 3. If still not found for this specific user, check for ANY uploaded image signature in PostgreSQL
  if (!sig) {
    try {
      const anyRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT signature_name, signature_type, signature_data, updated_at
        FROM user_digital_signatures
        WHERE signature_data NOT LIKE 'data:image/svg+xml%'
        ORDER BY updated_at DESC
        LIMIT 1;
      `);
      if (anyRows && anyRows.length > 0) {
        sig = {
          signatureName: anyRows[0].signature_name,
          signatureType: anyRows[0].signature_type,
          signatureData: anyRows[0].signature_data,
          updatedAt: anyRows[0].updated_at ? new Date(anyRows[0].updated_at).toISOString() : new Date().toISOString()
        };
      }
    } catch (e) {}
  }

  if (!sig && userSignatures['latest']) {
    sig = userSignatures['latest'];
  }

  res.json({ success: true, data: sig });
});

router.post('/signatures/me', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const userId = authUser?.id || authUser?.userId || req.body.userId;
    let username = authUser?.username || req.body.username || '';
    let email = authUser?.email || req.body.email || '';
    let employeeId = authUser?.employeeId || req.body.employeeId || '';
    let fullName = `${authUser?.firstName || ''} ${authUser?.lastName || ''}`.trim() || authUser?.name || req.body.signatureName || '';

    if (userId) {
      try {
        const dbUser: any = await prisma.user.findUnique({
          where: { id: String(userId) },
          include: { staff: true }
        });
        if (dbUser) {
          if (!username) username = dbUser.username || '';
          if (!email) email = dbUser.email || '';
          if (!fullName) fullName = `${dbUser.staff?.firstName || dbUser.firstName || ''} ${dbUser.staff?.lastName || dbUser.lastName || ''}`.trim();
          if (!employeeId && dbUser.staff?.employeeId) employeeId = dbUser.staff.employeeId;
        }
      } catch (e) {}
    }

    const { signatureData, signatureType, signatureName } = req.body;

    if (!signatureData) {
      return res.status(400).json({ success: false, message: 'Signature data is required' });
    }

    const finalName = signatureName || fullName || username || 'Staff Member';
    const sigObj = {
      signatureData,
      signatureType: signatureType || 'upload',
      signatureName: finalName,
      updatedAt: new Date().toISOString()
    };

    // 1. SAVE DIRECTLY TO POSTGRES DATABASE TABLE (user_digital_signatures)
    const primaryKey = String(userId || username || employeeId || finalName);
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO user_digital_signatures (id, user_id, username, email, employee_id, signature_name, signature_type, signature_data, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          username = EXCLUDED.username,
          email = EXCLUDED.email,
          employee_id = EXCLUDED.employee_id,
          signature_name = EXCLUDED.signature_name,
          signature_type = EXCLUDED.signature_type,
          signature_data = EXCLUDED.signature_data,
          updated_at = NOW();
      `, primaryKey, userId ? String(userId) : null, username || null, email || null, employeeId || null, finalName, signatureType || 'upload', signatureData);
    } catch (dbErr) {
      console.error('[DB] Failed persisting signature to PostgreSQL:', dbErr);
    }

    // 2. Store signature mapped in cache
    if (userId) userSignatures[String(userId)] = sigObj;
    if (username) userSignatures[username.toLowerCase()] = sigObj;
    if (email) userSignatures[email.toLowerCase()] = sigObj;
    if (employeeId) userSignatures[employeeId] = sigObj;
    if (finalName) userSignatures[finalName] = sigObj;
    userSignatures['latest'] = sigObj;

    // 3. Synchronize signature across matching personal timesheets
    const matchIds = [String(userId), employeeId, username.toLowerCase(), finalName.toLowerCase()].filter(Boolean);
    timesheets.forEach(ts => {
      const isMyTimesheet = (ts.empId && matchIds.includes(ts.empId.toLowerCase())) ||
                            (ts.name && matchIds.includes(ts.name.toLowerCase()));
      if (isMyTimesheet) {
        if (!ts.staffSignature) {
          ts.staffSignature = {
            signed: true,
            name: finalName,
            date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            signatureData
          };
        } else {
          ts.staffSignature.signatureData = signatureData;
          if (finalName) ts.staffSignature.name = finalName;
        }
      }
    });

    try {
      await logAudit({ userId: userId ? String(userId) : undefined, action: 'SAVE_DIGITAL_SIGNATURE_POSTGRES', resourceType: 'Signature', resourceId: primaryKey });
    } catch (e) {}

    res.json({ success: true, data: sigObj, message: 'Digital signature saved successfully' });
  } catch (err: any) {
    console.error('Error saving digital signature:', err);
    res.status(500).json({ success: false, message: 'Failed to save digital signature to database' });
  }
});

// Tier 1: Staff Sign & Submit to Supervisor
router.patch('/timesheets/:id/submit', async (req: Request, res: Response) => {
  try {
    const { signatureData, staffName, supervisorName, adminName, comments, empId, month, year, projectName, department, designation } = req.body;
    let ts = timesheets.find(t => t.id === req.params.id || (empId && t.empId === empId && t.month === month && Number(t.year) === Number(year)));
    
    if (!ts) {
      const emp = employees.find(e => e.id === empId);
      const mName = month || 'September';
      const yNum = Number(year) || 2026;
      const pName = projectName || 'Revenue & Cash Desk Operations';
      const sName = staffName || (emp ? `${emp.firstName} ${emp.lastName}` : 'Mary Okon');
      const isCashier = designation?.toLowerCase().includes('cashier') || emp?.role?.toLowerCase().includes('cashier');
      const grid = generateMonthlyTimesheetGrid(mName, yNum, pName, [1], isCashier ? 'cashier' : 'clinical', empId || emp?.id);

      ts = {
        id: req.params.id && req.params.id.startsWith('TSH-') ? req.params.id : `TSH-${String(timesheets.length + 1).padStart(3, '0')}`,
        empId: empId || emp?.id || 'EMP-006',
        name: sName,
        department: department || emp?.department || 'Finance & Revenue',
        designation: designation || emp?.role || 'Senior Cashier & Revenue Officer',
        location: 'Faith Foundation Mission Hospital',
        state: 'Enugu',
        projectName: pName,
        month: mName,
        year: String(yNum),
        monthStr: `${mName} ${yNum}`,
        periodType: grid.totalDays === 31 ? 'FULL_MONTH_1_TO_31' : 'FULL_MONTH_1_TO_30',
        grid,
        hoursWorked: grid.totalHoursWorked,
        expectedHours: grid.expectedShiftHours,
        compliancePercentage: grid.compliancePercentage,
        submittedAt: new Date().toISOString().slice(0, 10),
        status: 'SUBMITTED',
        staffSignature: {
          signed: true,
          name: sName,
          date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          signatureData: signatureData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M15 35 C30 10, 45 40, 60 15 C75 35, 90 20, 110 30 C125 15, 140 35, 150 25" stroke="%231e3a8a" stroke-width="2.5" fill="none"/></svg>'
        },
        supervisorSignature: {
          signed: false,
          name: supervisorName || 'Chinedu Okafor',
          role: 'Revenue Unit Lead',
          date: null,
          signatureData: null
        },
        adminSignature: {
          signed: false,
          name: adminName || 'Amedu Alapa',
          role: 'Hospital Administrator',
          date: null,
          signatureData: null
        },
        comments: comments || 'Submitted timesheet for full calendar month duty cycle.',
        returnInfo: null
      };
      timesheets.unshift(ts);
    } else {
      ts.staffSignature = {
        signed: true,
        name: staffName || ts.name,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        signatureData: signatureData || ts.staffSignature?.signatureData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M15 35 C30 10, 45 40, 60 15 C75 35, 90 20, 110 30 C125 15, 140 35, 150 25" stroke="%231e3a8a" stroke-width="2.5" fill="none"/></svg>'
      };
      if (supervisorName) {
        ts.supervisorSignature = {
          ...ts.supervisorSignature,
          name: supervisorName,
          signed: false
        };
      }
      if (adminName) {
        ts.adminSignature = {
          ...ts.adminSignature,
          name: adminName,
          signed: false
        };
      }
      if (comments) ts.comments = comments;
      ts.status = 'SUBMITTED';
      ts.returnInfo = null;
      ts.submittedAt = new Date().toISOString().slice(0, 10);
    }
    await logAudit({ userId: (req as any).user?.id, action: 'SUBMIT_TIMESHEET', resourceType: 'Timesheet', resourceId: ts.id });
    res.json({ success: true, data: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit timesheet' });
  }
});

// Tier 2: Unit Supervisor / Lead Officer Sign-Off & Forward to Admin/Bishop
router.patch('/timesheets/:id/supervisor-sign', async (req: Request, res: Response) => {
  try {
    const ts = timesheets.find(t => t.id === req.params.id);
    if (!ts) return res.status(404).json({ success: false, message: 'Timesheet not found' });
    const { supervisorName, signatureData, comments, targetAdminName } = req.body;
    
    const userRole = ((req as any).user?.role || '').toLowerCase();
    const userId = (req as any).user?.id || (req as any).user?.staffId;
    const userEmpId = (req as any).user?.employeeId;
    const userName = (req as any).user?.username || `${(req as any).user?.firstName || ''} ${(req as any).user?.lastName || ''}`;

    // Prevent staff from approving their own timesheet as supervisor
    const isOwn = (userId && ts.empId === userId) || (userEmpId && ts.empId === userEmpId) ||
      (userName && ts.name && ts.name.toLowerCase().trim() === userName.toLowerCase().trim()) ||
      (userName.toLowerCase().includes('mary') && (ts.empId === 'EMP-006' || ts.name?.toLowerCase().includes('mary okon')));

    if (isOwn && userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'bishop') {
      return res.status(403).json({ success: false, message: 'You cannot approve your own timesheet as supervisor.' });
    }

    ts.supervisorSignature = {
      signed: true,
      name: supervisorName || ts.supervisorSignature?.name || 'Chinedu Okafor',
      role: 'Unit Supervisor / Shift Lead',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      signatureData: signatureData || ts.supervisorSignature?.signatureData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M10 25 C30 5, 50 45, 80 15 C100 35, 120 15, 150 25" stroke="%230f766e" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>'
    };
    if (targetAdminName) {
      ts.adminSignature = {
        ...ts.adminSignature,
        name: targetAdminName
      };
    }
    ts.status = 'PENDING_ADMIN_APPROVAL';
    if (comments) ts.comments = comments;
    await logAudit({ userId: (req as any).user?.id, action: 'SUPERVISOR_SIGN_TIMESHEET', resourceType: 'Timesheet', resourceId: ts.id });
    res.json({ success: true, data: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to sign timesheet as supervisor' });
  }
});

// Tier 3: Hospital Administrator / Bishop Final Seal & Archiving
router.patch('/timesheets/:id/admin-sign', async (req: Request, res: Response) => {
  try {
    const ts = timesheets.find(t => t.id === req.params.id);
    if (!ts) return res.status(404).json({ success: false, message: 'Timesheet not found' });
    const { adminName, signatureData, comments, isBishop } = req.body;
    
    if (!signatureData) {
      return res.status(400).json({ success: false, message: 'Administrator digital signature is required before approving and sealing timesheets.' });
    }

    const roleTitle = isBishop || (adminName && (adminName.toLowerCase().includes('bishop') || adminName.toLowerCase().includes('most rev') || adminName.toLowerCase().includes('fr.')))
      ? 'Catholic Diocesan Bishop & Patron'
      : 'Hospital Administrator';

    ts.adminSignature = {
      signed: true,
      name: adminName || (req as any).user?.name || 'Amedu Alapa',
      role: roleTitle,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      signatureData: signatureData
    };
    ts.status = 'APPROVED';
    if (comments) ts.comments = comments;
    await logAudit({ userId: (req as any).user?.id, action: 'ADMIN_SIGN_TIMESHEET', resourceType: 'Timesheet', resourceId: ts.id });
    res.json({ success: true, data: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to approve timesheet as administrator' });
  }
});

router.patch('/timesheets/:id/reject', async (req: Request, res: Response) => {
  try {
    const ts = timesheets.find(t => t.id === req.params.id);
    if (!ts) return res.status(404).json({ success: false, message: 'Timesheet not found' });
    const { reason, comments, returnedBy, returnedByRole } = req.body;
    const returnReason = reason || comments || 'Timesheet hours require revision or till audit reconciliation';
    ts.status = 'REJECTED';
    ts.comments = returnReason;
    ts.returnInfo = {
      returnedBy: returnedBy || 'Supervisor / Administrator',
      returnedByRole: returnedByRole || 'Reviewing Officer',
      reason: returnReason,
      returnedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
    if (ts.supervisorSignature) {
      ts.supervisorSignature.rejectionReason = returnReason;
      ts.supervisorSignature.status = 'Rejected';
      ts.supervisorSignature.signed = false;
    }
    if (ts.adminSignature) {
      ts.adminSignature.signed = false;
    }
    await logAudit({ userId: (req as any).user?.id, action: 'REJECT_TIMESHEET', resourceType: 'Timesheet', resourceId: ts.id });
    res.json({ success: true, data: ts, message: 'Timesheet returned for correction' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reject timesheet' });
  }
});

router.put('/timesheets/:id', async (req: Request, res: Response) => {
  try {
    const idx = timesheets.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Timesheet not found' });
    timesheets[idx] = { ...timesheets[idx], ...req.body };
    res.json({ success: true, data: timesheets[idx] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update timesheet' });
  }
});

router.delete('/timesheets/:id', async (req: Request, res: Response) => {
  try {
    const idx = timesheets.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Timesheet not found' });
    const deleted = timesheets.splice(idx, 1)[0];
    await logAudit({ userId: (req as any).user?.id, action: 'DELETE_TIMESHEET', resourceType: 'Timesheet', resourceId: deleted.id });
    res.json({ success: true, message: 'Timesheet deleted successfully', data: deleted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete timesheet' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §19.3 - PAYROLL, PERFORMANCE & CPD
// ─────────────────────────────────────────────────────────────────────────────

// Helper to generate granular employee breakdown for a payroll run
export function calculateStaffPayrollBreakdown(payPeriod: string = 'June 2026') {
  return employees.map((emp) => {
    const ts = timesheets.find(t => t.empId === emp.id || t.name === `${emp.firstName} ${emp.lastName}`);
    const expectedHours = ts?.expectedHours || 176;
    const hoursWorked = ts?.hoursWorked || 176;
    const complianceRate = ts?.compliancePercentage || (expectedHours > 0 ? Math.round((hoursWorked / expectedHours) * 100) : 100);
    const overtimeHours = ts?.overtimeHours || (ts?.grid?.days?.reduce((s: number, d: any) => s + (d.overtime || 0), 0) || 0);

    const baseSalary = emp.baseSalary > 0 ? emp.baseSalary : 250000;
    const housingAllowance = Math.round(baseSalary * 0.15);
    const transportAllowance = Math.round(baseSalary * 0.10);
    const isClinical = (emp.role || '').toLowerCase().includes('doctor') || (emp.role || '').toLowerCase().includes('nurse') || (emp.role || '').toLowerCase().includes('lab') || (emp.role || '').toLowerCase().includes('pharmacist') || (emp.role || '').toLowerCase().includes('radiolog');
    const hazardAllowance = isClinical ? Math.round(baseSalary * 0.12) : 0;
    const overtimePay = Math.round((baseSalary / 176) * 1.5 * overtimeHours);

    const proRatedBase = Math.round(baseSalary * (Math.min(100, complianceRate) / 100));
    const grossSalary = proRatedBase + housingAllowance + transportAllowance + hazardAllowance + overtimePay;

    const payeTax = Math.round(grossSalary * 0.08); // 8% PAYE tax
    const pensionDeduction = Math.round(baseSalary * 0.08); // 8% Pension
    const nhfDeduction = Math.round(baseSalary * 0.025); // 2.5% NHF
    const totalDeductions = payeTax + pensionDeduction + nhfDeduction;
    const netSalary = grossSalary - totalDeductions;

    return {
      empId: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      role: emp.role,
      department: emp.department,
      salaryGrade: emp.salaryGrade || 'L8-Step 1',
      bankName: emp.bankName || 'Zenith Bank',
      accountNo: emp.accountNo || '1019283746',
      payPeriod,
      timesheet: {
        timesheetId: ts?.id || 'TSH-AUTO',
        hoursWorked,
        expectedHours,
        complianceRate,
        overtimeHours,
        status: ts?.status || 'APPROVED'
      },
      earnings: {
        baseSalary,
        proRatedBase,
        housingAllowance,
        transportAllowance,
        hazardAllowance,
        overtimePay,
        grossSalary
      },
      deductions: {
        payeTax,
        pensionDeduction,
        nhfDeduction,
        totalDeductions
      },
      netSalary,
      status: 'CALCULATED'
    };
  });
}

router.get('/payroll', (req: Request, res: Response) => {
  res.json({ success: true, data: payrollHistory, total: payrollHistory.length });
});

router.get('/payroll/breakdown', (req: Request, res: Response) => {
  const payPeriod = (req.query.period as string) || 'June 2026';
  const breakdown = calculateStaffPayrollBreakdown(payPeriod);
  res.json({ success: true, data: breakdown, total: breakdown.length });
});

router.get('/payroll/:id/breakdown', (req: Request, res: Response) => {
  const run = payrollHistory.find(p => p.id === req.params.id);
  const payPeriod = run?.payPeriod || 'June 2026';
  const breakdown = calculateStaffPayrollBreakdown(payPeriod);
  res.json({ success: true, data: breakdown, run: run || null });
});

router.post('/payroll/run', async (req: Request, res: Response) => {
  try {
    const payPeriod = req.body.payPeriod || 'June 2026';
    const breakdown = calculateStaffPayrollBreakdown(payPeriod);
    const totalGross = breakdown.reduce((s, b) => s + b.earnings.grossSalary, 0);
    const totalDeductions = breakdown.reduce((s, b) => s + b.deductions.totalDeductions, 0);
    const netPaid = totalGross - totalDeductions;

    const run = {
      id: `PAY-${String(payrollHistory.length + 1).padStart(3, '0')}`,
      payPeriod,
      totalGross,
      deductions: totalDeductions,
      netPaid,
      status: 'PENDING_ADMIN_APPROVAL',
      processedAt: new Date().toISOString().slice(0, 10),
      signedByAdmin: false,
      adminSignatureDate: null,
      adminName: null,
      signedByBishop: false,
      bishopSignatureDate: null,
      bishopSealApplied: false,
      transmittedToFinance: false,
      financeJournalId: null,
      transmittedAt: null
    };
    payrollHistory.unshift(run);
    await logAudit({ userId: (req as any).user?.id, action: 'PROCESS_PAYROLL', resourceType: 'PayrollRun', resourceId: run.id, changes: run });
    res.status(201).json({ success: true, data: run });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Payroll run failed' });
  }
});

// Admin Review & Approval
router.post('/payroll/:id/admin-sign', async (req: Request, res: Response) => {
  try {
    const run = payrollHistory.find(p => p.id === req.params.id);
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });
    
    const reqUser = (req as any).user;
    let adminName = req.body.adminName;
    if (!adminName || typeof adminName !== 'string' || adminName.includes('undefined') || adminName.trim() === '') {
      adminName = reqUser?.name || (reqUser?.firstName && reqUser?.lastName ? `${reqUser.firstName} ${reqUser.lastName}` : '') || reqUser?.username || 'Amedu Alapa (Hospital Administrator)';
    }

    let signatureData = req.body.signatureData;
    if (!signatureData) {
      const uId = reqUser?.id ? String(reqUser.id) : '';
      const uName = (reqUser?.username || '').toLowerCase();
      const sig = (uId && userSignatures[uId]) ||
                  (uName && userSignatures[uName]) ||
                  userSignatures['latest'];
      if (sig?.signatureData) {
        signatureData = sig.signatureData;
      }
    }

    run.status = 'ADMIN_APPROVED';
    run.signedByAdmin = true;
    run.adminSignatureDate = new Date().toISOString().slice(0, 10);
    run.adminName = adminName;
    if (signatureData) {
      run.adminSignatureData = signatureData;
    }

    await logAudit({ userId: reqUser?.id, action: 'ADMIN_SIGN_PAYROLL', resourceType: 'PayrollRun', resourceId: run.id, changes: { adminName, date: run.adminSignatureDate } });
    res.json({ success: true, data: run, message: 'Payroll approved by Hospital Administrator.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to sign payroll' });
  }
});

// Bishop Episcopal Seal & Authorization
router.post('/payroll/:id/bishop-sign', async (req: Request, res: Response) => {
  try {
    const run = payrollHistory.find(p => p.id === req.params.id);
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });
    
    const reqUser = (req as any).user;
    const bishopName = req.body.bishopName || reqUser?.name || 'Most Rev. Dr. C.V.C. Onaga';
    const bishopSig = req.body.signatureData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M10 25 C30 5, 50 45, 80 15 C100 30, 120 15, 150 25" stroke="%236b21a8" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="80" cy="24" r="14" stroke="%236b21a8" stroke-width="1.5" fill="none"/><text x="74" y="29" font-size="14" font-weight="bold" fill="%236b21a8">✚</text></svg>';

    run.status = 'EPISCOPAL_APPROVED';
    run.signedByBishop = true;
    run.bishopSignatureDate = new Date().toISOString().slice(0, 10);
    run.bishopSealApplied = true;
    run.bishopName = bishopName;
    run.bishopSignatureData = bishopSig;

    // Record in Episcopal Audit Log
    bishopAuditLog.unshift({
      id: `BAL-${String(bishopAuditLog.length + 1).padStart(3, '0')}`,
      type: 'PAYROLL_SIGNED',
      referenceId: run.id,
      title: `Payroll for ${run.payPeriod} — Episcopal Seal Applied`,
      decidedBy: bishopName,
      decisionDate: new Date().toISOString().slice(0, 10),
      action: 'APPROVED',
      amount: run.netPaid,
      remarks: 'Episcopal Seal affixed. Central Treasury authorized for disbursement.'
    });
    await logAudit({ userId: reqUser?.id, action: 'BISHOP_SIGN_PAYROLL', resourceType: 'PayrollRun', resourceId: run.id });
    res.json({ success: true, data: run });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to authorize payroll' });
  }
});

// Transmit to Finance General Ledger
router.post('/payroll/:id/transmit-finance', async (req: Request, res: Response) => {
  try {
    const run = payrollHistory.find(p => p.id === req.params.id);
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });

    const jvId = `JV-PAY-${run.id}`;
    const journalVoucher = {
      id: jvId,
      description: `Monthly Staff Salaries & Payroll Remittance — ${run.payPeriod} (${run.id})`,
      date: new Date().toISOString().slice(0, 10),
      status: 'POSTED',
      createdBy: (req as any).user?.username || 'admin',
      approvedBy: run.adminName || 'Hospital Administrator',
      lines: [
        { accountCode: '5020', accountName: 'Staff Salaries Expense', debit: run.totalGross, credit: 0, costCentre: 'Human Resources' },
        { accountCode: '2020', accountName: 'Accrued Salaries & Wages (Net Pay)', debit: 0, credit: run.netPaid, costCentre: 'Central Administration' },
        { accountCode: '2030', accountName: 'Withholding & PAYE Tax Payable', debit: 0, credit: run.deductions, costCentre: 'Central Administration' }
      ]
    };

    addPayrollJournalVoucher(journalVoucher);

    run.status = 'TRANSMITTED_TO_FINANCE';
    run.transmittedToFinance = true;
    run.financeJournalId = jvId;
    run.transmittedAt = new Date().toISOString();

    await logAudit({
      userId: (req as any).user?.id,
      action: 'TRANSMIT_PAYROLL_TO_FINANCE',
      resourceType: 'PayrollRun',
      resourceId: run.id,
      changes: { journalVoucherId: jvId, gross: run.totalGross, net: run.netPaid }
    });

    res.json({
      success: true,
      data: run,
      journalVoucher,
      message: `Payroll successfully transmitted to Finance Department! Journal Voucher ${jvId} posted to General Ledger Account 5020.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to transmit payroll to Finance' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §EPISCOPAL WORKFLOW — ADMIN TIMESHEETS & AUDIT LOG
// ─────────────────────────────────────────────────────────────────────────────

// GET all admin timesheets (Bishop reviews these)
router.get('/admin-timesheets', (req: Request, res: Response) => {
  res.json({ success: true, data: adminTimesheets, total: adminTimesheets.length });
});

// POST — Admin submits a new monthly timesheet for Bishop review
router.post('/admin-timesheets', async (req: Request, res: Response) => {
  try {
    const sheet = {
      id: `TS-${String(adminTimesheets.length + 1).padStart(3, '0')}`,
      submittedBy: req.body.submittedBy || 'Hospital Administrator',
      submittedByRole: 'Hospital Administrator',
      submittedAt: new Date().toISOString(),
      status: 'PENDING_BISHOP_REVIEW',
      bishopComment: null,
      bishopDecisionDate: null,
      ...req.body
    };
    adminTimesheets.unshift(sheet);
    await logAudit({ userId: (req as any).user?.id, action: 'SUBMIT_ADMIN_TIMESHEET', resourceType: 'AdminTimesheet', resourceId: sheet.id, changes: sheet });
    res.status(201).json({ success: true, data: sheet });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit timesheet' });
  }
});

// PATCH — Bishop approves or returns a timesheet for correction
router.patch('/admin-timesheets/:id/decision', async (req: Request, res: Response) => {
  try {
    const sheet = adminTimesheets.find(t => t.id === req.params.id);
    if (!sheet) return res.status(404).json({ success: false, message: 'Timesheet not found' });

    const { action, bishopComment } = req.body; // action: 'APPROVED' | 'RETURNED_FOR_CORRECTION'
    sheet.status = action === 'APPROVED' ? 'APPROVED' : 'RETURNED_FOR_CORRECTION';
    sheet.bishopComment = bishopComment || null;
    sheet.bishopDecisionDate = new Date().toISOString().slice(0, 10);

    // Record in Episcopal Audit Log
    bishopAuditLog.unshift({
      id: `BAL-${String(bishopAuditLog.length + 1).padStart(3, '0')}`,
      type: action === 'APPROVED' ? 'TIMESHEET_APPROVED' : 'TIMESHEET_RETURNED',
      referenceId: sheet.id,
      title: `Admin Timesheet — ${sheet.month} ${action === 'APPROVED' ? 'Approved' : 'Returned for Correction'}`,
      decidedBy: (req as any).user?.name || 'Bishop',
      decisionDate: new Date().toISOString().slice(0, 10),
      action: action,
      amount: null,
      remarks: bishopComment || '—'
    });

    await logAudit({ userId: (req as any).user?.id, action: `BISHOP_${action}_TIMESHEET`, resourceType: 'AdminTimesheet', resourceId: sheet.id });
    res.json({ success: true, data: sheet });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to process timesheet decision' });
  }
});

// GET — Episcopal Decisions Audit Log
router.get('/bishop-audit-log', (req: Request, res: Response) => {
  res.json({ success: true, data: bishopAuditLog, total: bishopAuditLog.length });
});

router.get('/appraisals', (req: Request, res: Response) => {
  res.json({ success: true, data: appraisals });
});

router.post('/appraisals', (req: Request, res: Response) => {
  const emp = employees.find(e => e.id === req.body.empId);
  const nextNum = appraisals.length + 1;
  const appId = nextNum < 10 ? `APP-0${nextNum}` : `APP-${nextNum}`;
  const nowStr = new Date().toISOString().slice(0, 10);
  const appraisal = {
    id: appId,
    empId: req.body.empId || emp?.id,
    name: emp ? `${emp.firstName} ${emp.lastName}` : (req.body.name || 'Staff Member'),
    designation: emp?.designation || req.body.designation || 'Staff',
    department: emp?.department || req.body.department || 'General',
    frequency: req.body.frequency || 'ANNUAL',
    period: req.body.period || 'FY2026',
    supervisorId: req.body.supervisorId || emp?.supervisorId || 'ADM-01',
    supervisorName: req.body.supervisorName || emp?.supervisorName || 'Hospital Supervisor',
    supervisorRole: req.body.supervisorRole || emp?.supervisorRole || 'Unit Supervisor',
    rating: Number(req.body.rating) || 4.5,
    competencyScores: req.body.competencyScores || {
      clinical: Number(req.body.rating) || 4.5,
      attendance: 4.8,
      teamwork: 4.6,
      ethics: 5.0
    },
    comments: req.body.comments || 'Satisfactory performance across annual review metrics.',
    recommendation: req.body.recommendation || 'RETAIN_AND_COMMEND',
    status: req.body.status || 'COMPLETED',
    evaluatedAt: req.body.evaluatedAt || nowStr
  };
  appraisals.unshift(appraisal);
  res.status(201).json({ success: true, data: appraisal });
});

// ─── CPD COURSES & CURRICULUM DIRECTORY ───────────────────────────────────

router.get('/cpd', (req: Request, res: Response) => {
  res.json({ success: true, data: cpdCourses });
});

router.post('/cpd', (req: Request, res: Response) => {
  const newCourse = {
    id: `CPD-${String(cpdCourses.length + 1).padStart(2, '0')}`,
    name: req.body.name || 'Untitled CPD Course',
    category: req.body.category || 'CLINICAL_CME',
    provider: req.body.provider || 'Hospital Clinical Training Directorate',
    credits: Number(req.body.credits) || 5,
    durationHours: Number(req.body.durationHours) || 8,
    targetAudience: req.body.targetAudience || 'All Healthcare Personnel',
    deliveryMode: req.body.deliveryMode || 'HYBRID',
    passingScore: Number(req.body.passingScore) || 75,
    renewalMonths: Number(req.body.renewalMonths) || 12,
    completedCount: 0,
    totalEnrolled: Number(req.body.totalEnrolled) || 0,
    nextDueDate: req.body.nextDueDate || '2026-12-31',
    status: req.body.status || 'ACTIVE',
    description: req.body.description || ''
  };
  cpdCourses.unshift(newCourse);
  res.status(201).json({ success: true, data: newCourse });
});

router.put('/cpd/:id', (req: Request, res: Response) => {
  const index = cpdCourses.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'CPD course not found' });
  }
  cpdCourses[index] = { ...cpdCourses[index], ...req.body };
  res.json({ success: true, data: cpdCourses[index] });
});

router.delete('/cpd/:id', (req: Request, res: Response) => {
  cpdCourses = cpdCourses.filter(c => c.id !== req.params.id);
  res.json({ success: true, message: 'CPD course deleted successfully' });
});

// ─── STAFF CPD COMPLETION RECORDS & CERTIFICATES ─────────────────────────────

router.get('/cpd/records', (req: Request, res: Response) => {
  const { staffId, courseId } = req.query;
  let filtered = [...cpdRecords];
  if (staffId) {
    filtered = filtered.filter(r => r.staffId === staffId);
  }
  if (courseId) {
    filtered = filtered.filter(r => r.courseId === courseId);
  }
  res.json({ success: true, data: filtered });
});

router.post('/cpd/records', (req: Request, res: Response) => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const newRecord = {
    id: `REC-${String(cpdRecords.length + 1).padStart(3, '0')}`,
    staffId: req.body.staffId || 'EMP-001',
    staffName: req.body.staffName || 'Staff Member',
    designation: req.body.designation || 'Healthcare Professional',
    department: req.body.department || 'Clinical Services',
    courseId: req.body.courseId || 'CPD-01',
    courseName: req.body.courseName || 'CPD Course',
    creditsEarned: Number(req.body.creditsEarned) || 5,
    completionDate: req.body.completionDate || dateStr,
    expiryDate: req.body.expiryDate || '2027-12-31',
    certificateNo: req.body.certificateNo || `CERT-${Date.now().toString().slice(-6)}`,
    scorePercent: Number(req.body.scorePercent) || 85,
    status: req.body.status || 'VALID',
    accreditationBody: req.body.accreditationBody || 'Hospital CME Board',
    verifiedBy: req.body.verifiedBy || 'Dr. Amina Bello (CMD)'
  };
  cpdRecords.unshift(newRecord);

  // Increment completed count on matching course
  const course = cpdCourses.find(c => c.id === newRecord.courseId);
  if (course) {
    course.completedCount = (course.completedCount || 0) + 1;
  }

  res.status(201).json({ success: true, data: newRecord });
});

router.delete('/cpd/records/:id', (req: Request, res: Response) => {
  cpdRecords = cpdRecords.filter(r => r.id !== req.params.id);
  res.json({ success: true, message: 'CPD certification record deleted' });
});

router.get('/cpd/summary', (req: Request, res: Response) => {
  const totalCourses = cpdCourses.length;
  const totalRecords = cpdRecords.length;
  const totalCreditsGranted = cpdRecords.reduce((sum, r) => sum + (Number(r.creditsEarned) || 0), 0);
  const mandatoryCourses = cpdCourses.filter(c => c.category === 'MANDATORY').length;
  res.json({
    success: true,
    data: {
      totalCourses,
      totalRecords,
      totalCreditsGranted,
      mandatoryCourses,
      complianceRate: '98.4%'
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §19.4 - GOVERNANCE, RISKS & WORKFORCE INTELLIGENCE
// ─────────────────────────────────────────────────────────────────────────────

router.get('/risks', (req: Request, res: Response) => {
  res.json({ success: true, data: governanceRisks });
});

router.post('/risks', (req: Request, res: Response) => {
  const risk = { id: `HRK-${String(governanceRisks.length + 1).padStart(2, '0')}`, status: 'ACTIVE', ...req.body };
  governanceRisks.unshift(risk);
  res.status(201).json({ success: true, data: risk });
});

router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const liveStaff = await getLiveEmployeesList();
    const todayStr = new Date().toISOString().slice(0, 10);

    const totalHeadcount = liveStaff.length;
    const activeStaff = liveStaff.filter(e => (e.status || 'ACTIVE').toUpperCase() === 'ACTIVE');
    const activeCount = activeStaff.length;
    const leaveCount = liveStaff.filter(e => (e.status || '').toUpperCase() === 'ON_LEAVE').length;
    const vacantCount = vacancies.reduce((s, v) => s + (Number(v.positions) || 1), 0);

    // Active attendance today: Count staff with clock-in or active shift today
    const presentTodayCount = attendanceLogs.filter(a => a.date === todayStr && a.status !== 'ABSENT' && a.clockIn && a.clockIn !== '—').length;

    // Staff category distribution
    const doctorsCount = liveStaff.filter(e => {
      const d = (e.designation || e.role || '').toLowerCase();
      return d.includes('doctor') || d.includes('physician') || d.includes('consultant') || d.includes('surgeon') || d.includes('cmo') || d.includes('medical officer');
    }).length;

    const nursesCount = liveStaff.filter(e => {
      const d = (e.designation || e.role || '').toLowerCase();
      return d.includes('nurse') || d.includes('matron') || d.includes('midwife');
    }).length;

    const pharmacistsCount = liveStaff.filter(e => {
      const d = (e.designation || e.role || '').toLowerCase();
      return d.includes('pharmac');
    }).length;

    const labCount = liveStaff.filter(e => {
      const d = (e.designation || e.role || '').toLowerCase();
      return d.includes('lab') || d.includes('scientist') || d.includes('patholog') || d.includes('technician');
    }).length;

    const radiologyCount = liveStaff.filter(e => {
      const d = (e.designation || e.role || '').toLowerCase();
      return d.includes('radiolog') || d.includes('radiograph') || d.includes('sonograph');
    }).length;

    const financeCount = liveStaff.filter(e => {
      const d = (e.designation || e.role || '').toLowerCase();
      return d.includes('cashier') || d.includes('account') || d.includes('finance') || d.includes('bursar') || d.includes('cfo') || d.includes('revenue');
    }).length;

    const adminCount = Math.max(0, totalHeadcount - (doctorsCount + nursesCount + pharmacistsCount + labCount + radiologyCount + financeCount));

    const headcountByRole = [
      { name: 'Doctors', value: doctorsCount },
      { name: 'Nurses', value: nursesCount },
      { name: 'Pharmacists', value: pharmacistsCount },
      { name: 'Lab Techs', value: labCount },
      { name: 'Radiology', value: radiologyCount },
      { name: 'Finance / Cashiers', value: financeCount },
      { name: 'Admin & Secretariat', value: adminCount },
    ].filter(item => item.value > 0);

    // Departmental distribution
    const deptMap: Record<string, number> = {};
    liveStaff.forEach(e => {
      const dept = e.department || 'General Administration';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const headcountByDept = Object.entries(deptMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    // Clinical vs Admin Ratio
    const clinicalTotal = doctorsCount + nursesCount + pharmacistsCount + labCount + radiologyCount;
    const clinicalPercent = totalHeadcount > 0 ? Math.round((clinicalTotal / totalHeadcount) * 100) : 0;
    const adminPercent = 100 - clinicalPercent;

    // Staff Licensure Compliance
    const validLicenses = liveStaff.filter(e => e.licenseNo && e.licenseNo !== 'N/A' && (!e.licenseExpiry || new Date(e.licenseExpiry) > new Date())).length;
    const licenseRequiredStaff = liveStaff.filter(e => e.licenseNo && e.licenseNo !== 'N/A').length || totalHeadcount;
    const licenseComplianceRate = Math.min(100, Math.round((validLicenses / (licenseRequiredStaff || 1)) * 100));

    res.json({
      success: true,
      data: {
        totalHeadcount,
        activeCount,
        presentTodayCount: presentTodayCount || activeCount,
        leaveCount,
        vacantCount,
        risksCount: governanceRisks.length,
        headcountByRole,
        headcountByDept,
        clinicalPercent,
        adminPercent,
        clinicalTotal,
        licenseComplianceRate: `${licenseComplianceRate}%`,
        retentionRate: '98.4%',
        timeToHireDays: '18.5 Days',
        safeClinicalCompliance: '98.5%',
        payrollRevenueRatio: '24.2%',
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to generate HR analytics' });
  }
});

// ─── EXTENDED SECRETARY WORKFLOW MOCK DATABASE STORES ───

let internalRequests = [
  { id: 'REQ-001', type: 'DEPARTMENTAL_REQUEST', title: 'Physiotherapy Unit Equipment Maintenance', department: 'Physiotherapy', requester: 'Physiotherapist VEGHER', content: 'Urgent maintenance required for the rehabilitation treadmill in Room 3B.', status: 'PENDING', date: '2026-07-16' },
  { id: 'REQ-002', type: 'BILL_REQUISITION', title: 'Procurement of ICU Syringe Pumps', department: 'ICU', requester: 'Ngozi Adeyemi', content: 'Purchase requisition for 5 additional ICU syringe pumps for emergency backup.', status: 'APPROVED', date: '2026-07-15' },
  { id: 'REQ-003', type: 'STAFF_COMPLAINT', title: 'Roster Overlap Conflict', department: 'Nursing', requester: 'Ngozi Adeyemi', content: 'Double-booking conflict on the Sunday night shift schedule.', status: 'PENDING', date: '2026-07-17' },
  { id: 'REQ-004', type: 'CAPITAL_PROJECT', title: 'Diocesan Maternity Block Construction (Phase 2)', department: 'Maternity', requester: 'Hospital Secretary', content: 'Funding and design approvals required for the extension of the Diocesan Maternity Wing.', status: 'PENDING', date: '2026-07-16', estimatedBudget: 15000000 },
  { id: 'REQ-005', type: 'CAPITAL_PROJECT', title: 'Solar Power Grid & Inverter Backup Installation', department: 'Administration', requester: 'Admin', content: 'Procurement of 100kVA hybrid solar grid systems to ensure uninterrupted critical care backup.', status: 'PENDING', date: '2026-07-17', estimatedBudget: 24500000 },
  { id: 'REQ-006', type: 'CAPITAL_PROJECT', title: 'Advanced MRI Imaging Unit Procurement', department: 'Radiology', requester: 'Admin', content: 'Purchase clearance for 1.5T Superconducting MRI imaging scanner for the diagnostic wing.', status: 'APPROVED', date: '2026-07-14', estimatedBudget: 85000000 }
];

let adminMessages = [
  { id: 'MSG-001', sender: 'FF-0001', senderName: 'Emmanuel Vegher', content: 'Good morning Admin, I have uploaded the monthly attendance report for your signature.', timestamp: '2026-07-17T09:15:00.000Z' },
  { id: 'MSG-002', sender: 'admin', senderName: 'Hospital Administrator', content: 'Thanks Emmanuel. Please verify the leave requests from the Nursing department and forward them to my desk.', timestamp: '2026-07-17T09:20:00.000Z' }
];

let adminTasks = [
  { id: 'TSK-001', title: 'Verify Nurse Leave Requests', assignedTo: 'FF-0001', assignedToName: 'Emmanuel Vegher', status: 'PENDING', deadline: '2026-07-18' },
  { id: 'TSK-002', title: 'Publish Internal Memo on Hygiene Standards', assignedTo: 'FF-0001', assignedToName: 'Emmanuel Vegher', status: 'COMPLETED', deadline: '2026-07-17' }
];

let internalMemos = [
  { id: 'MEM-001', title: 'Revised Hospital OPD Hygiene Standards', targetType: 'ALL', content: 'Please note that the updated sanitation and patient intake checklist is now effective in all OPD clinics.', sender: 'Hospital Administrator', department: 'All Departments', date: '2026-07-15' },
  { id: 'MEM-002', title: 'Clinical Audit Team Inspection Schedule', targetType: 'DEPARTMENTAL', targetDepartment: 'Pharmacy', content: 'The external clinical auditors will inspect the pharmacy stock management system on Monday morning. Please ensure all inventory sheets are up to date.', sender: 'Hospital Secretary', department: 'Administration', date: '2026-07-17' }
];

// ─── EXTENDED SECRETARY ENDPOINTS ───

// Disciplinary Queries
router.get('/employees/:id/queries', (req: Request, res: Response) => {
  const { id } = req.params;
  const meta = loadEmployeeMetadata();
  const queries = meta[id]?.queries || [];
  res.json({ success: true, data: queries });
});

router.post('/employees/:id/queries', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subject, content } = req.body;
    const meta = loadEmployeeMetadata();
    if (!meta[id]) meta[id] = { id };
    if (!meta[id].queries) meta[id].queries = [];
    
    const newQuery = {
      id: `QRY-${String(meta[id].queries.length + 1).padStart(3, '0')}`,
      subject,
      content,
      date: new Date().toISOString().slice(0, 10),
      status: 'PENDING'
    };
    
    meta[id].queries.push(newQuery);
    saveEmployeeMetadata(meta);
    
    await logAudit({ userId: (req as any).user?.id, action: 'ISSUE_DISCIPLINARY_QUERY', resourceType: 'Employee', resourceId: id, changes: newQuery });
    res.json({ success: true, data: newQuery });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to issue query' });
  }
});

// Internal Requests
router.get('/internal-requests', (req: Request, res: Response) => {
  res.json({ success: true, data: internalRequests });
});

router.post('/internal-requests', async (req: Request, res: Response) => {
  try {
    const newReq = {
      id: `REQ-${String(internalRequests.length + 1).padStart(3, '0')}`,
      ...req.body,
      status: 'PENDING',
      date: new Date().toISOString().slice(0, 10)
    };
    internalRequests.unshift(newReq);
    await logAudit({ userId: (req as any).user?.id, action: 'CREATE_INTERNAL_REQUEST', resourceType: 'Request', resourceId: newReq.id, changes: newReq });
    res.status(201).json({ success: true, data: newReq });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to submit request' });
  }
});

router.patch('/internal-requests/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const index = internalRequests.findIndex(r => r.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Request not found' });
    
    internalRequests[index].status = status;
    await logAudit({ userId: (req as any).user?.id, action: 'UPDATE_REQUEST_STATUS', resourceType: 'Request', resourceId: id, changes: { status } });
    res.json({ success: true, data: internalRequests[index] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update request status' });
  }
});

// Admin Chat & Interaction
router.get('/admin-chat', (req: Request, res: Response) => {
  res.json({ success: true, data: adminMessages });
});

router.post('/admin-chat', async (req: Request, res: Response) => {
  try {
    const newMsg = {
      id: `MSG-${String(adminMessages.length + 1).padStart(3, '0')}`,
      sender: (req as any).user?.username || 'FF-0001',
      senderName: (req as any).user?.firstName ? `${(req as any).user.firstName} ${(req as any).user.lastName}` : 'Emmanuel Vegher',
      content: req.body.content,
      timestamp: new Date().toISOString()
    };
    adminMessages.push(newMsg);
    res.status(201).json({ success: true, data: newMsg });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to send message' });
  }
});

// Admin Tasks
router.get('/admin-tasks', (req: Request, res: Response) => {
  res.json({ success: true, data: adminTasks });
});

router.post('/admin-tasks', async (req: Request, res: Response) => {
  try {
    const newTask = {
      id: `TSK-${String(adminTasks.length + 1).padStart(3, '0')}`,
      ...req.body,
      status: 'PENDING'
    };
    adminTasks.unshift(newTask);
    res.status(201).json({ success: true, data: newTask });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create task' });
  }
});

router.patch('/admin-tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const index = adminTasks.findIndex(t => t.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Task not found' });
    
    adminTasks[index].status = status;
    res.json({ success: true, data: adminTasks[index] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update task' });
  }
});

// Memos
router.get('/memos', (req: Request, res: Response) => {
  res.json({ success: true, data: internalMemos });
});

router.post('/memos', async (req: Request, res: Response) => {
  try {
    const newMemo = {
      id: `MEM-${String(internalMemos.length + 1).padStart(3, '0')}`,
      ...req.body,
      sender: (req as any).user?.firstName ? `${(req as any).user.firstName} ${(req as any).user.lastName}` : 'Hospital Secretary',
      date: new Date().toISOString().slice(0, 10)
    };
    internalMemos.unshift(newMemo);
    await logAudit({ userId: (req as any).user?.id, action: 'PUBLISH_MEMO', resourceType: 'Memo', resourceId: newMemo.id, changes: newMemo });
    res.status(201).json({ success: true, data: newMemo });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to publish memo' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SUPERVISOR MAPPING & ORGANOGRAM ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// Helper function to build organogram hierarchy
function buildOrganogramTree(staffList: any[]) {
  const staffMap: Record<string, any> = {};
  
  // Calculate direct reports count for each employee
  staffList.forEach(emp => {
    staffMap[emp.id] = {
      ...emp,
      fullName: `${emp.firstName} ${emp.lastName}`.trim(),
      children: [],
      secondaryChildren: [],
      directReportsCount: 0,
      secondaryReportsCount: 0,
      subordinateIds: [],
      secondarySubordinateIds: []
    };
  });

  const rootNodes: any[] = [];

  staffList.forEach(emp => {
    const node = staffMap[emp.id];
    const supId = emp.supervisorId;
    const secSupId = emp.secondarySupervisorId;

    if (supId && staffMap[supId] && supId !== emp.id) {
      staffMap[supId].children.push(node);
      staffMap[supId].directReportsCount += 1;
      staffMap[supId].subordinateIds.push(emp.id);
    } else {
      rootNodes.push(node);
    }

    if (secSupId && staffMap[secSupId] && secSupId !== emp.id) {
      staffMap[secSupId].secondaryChildren.push(node);
      staffMap[secSupId].secondaryReportsCount += 1;
      staffMap[secSupId].secondarySubordinateIds.push(emp.id);
    }
  });

  return { rootNodes, allNodes: Object.values(staffMap) };
}

// 1. Get staff supervisor mapping list
router.get('/supervisors/mapping', async (req: Request, res: Response) => {
  try {
    const list = employees.map(emp => {
      const empFullName = `${emp.firstName} ${emp.lastName}`.trim();
      const directReports = employees.filter(e => 
        e.supervisorId === emp.id || 
        (e.supervisorName && e.supervisorName.toLowerCase() === empFullName.toLowerCase())
      );
      const secondaryReports = employees.filter(e => 
        e.secondarySupervisorId === emp.id || 
        (e.secondarySupervisorName && e.secondarySupervisorName.toLowerCase() === empFullName.toLowerCase())
      );

      return {
        ...emp,
        fullName: empFullName,
        directReportsCount: directReports.length,
        directReports: directReports.map(r => ({
          id: r.id,
          name: `${r.firstName} ${r.lastName}`.trim(),
          role: r.role,
          department: r.department,
          unit: r.unit,
          email: r.email,
          phone: r.phone,
          approvalTier: r.approvalTier,
          hierarchyLevel: r.hierarchyLevel,
          relationshipType: 'PRIMARY'
        })),
        secondaryReportsCount: secondaryReports.length,
        secondaryReports: secondaryReports.map(r => ({
          id: r.id,
          name: `${r.firstName} ${r.lastName}`.trim(),
          role: r.role,
          department: r.department,
          unit: r.unit,
          email: r.email,
          phone: r.phone,
          approvalTier: r.approvalTier,
          hierarchyLevel: r.hierarchyLevel,
          primarySupervisorName: r.supervisorName,
          relationshipType: 'SECONDARY'
        })),
        totalSubordinatesCount: directReports.length + secondaryReports.length
      };
    });

    const supervisorsList = employees.filter(e => {
      return (
        e.hierarchyLevel <= 4 ||
        e.role?.toLowerCase().includes('director') ||
        e.role?.toLowerCase().includes('lead') ||
        e.role?.toLowerCase().includes('supervisor') ||
        e.role?.toLowerCase().includes('head') ||
        e.role?.toLowerCase().includes('administrator') ||
        e.role?.toLowerCase().includes('matron') ||
        e.role?.toLowerCase().includes('officer') ||
        e.role?.toLowerCase().includes('patron') ||
        e.role?.toLowerCase().includes('bishop')
      );
    }).map(s => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      role: s.role,
      department: s.department,
      email: s.email,
      hierarchyLevel: s.hierarchyLevel
    }));

    res.json({
      success: true,
      data: {
        staff: list,
        supervisors: supervisorsList,
        totalStaff: list.length,
        mappedStaffCount: list.filter(s => s.supervisorId).length,
        unmappedStaffCount: list.filter(s => !s.supervisorId && s.hierarchyLevel > 1).length
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch supervisor mappings' });
  }
});

// 2. Update individual staff supervisor mapping
router.put('/supervisors/mapping/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      supervisorId,
      secondarySupervisorId,
      unit,
      approvalTier,
      hierarchyLevel
    } = req.body;

    const index = employees.findIndex(e => e.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: `Staff with ID ${id} not found` });
    }

    let supervisorName = employees[index].supervisorName;
    let supervisorRole = employees[index].supervisorRole;
    let supervisorEmail = employees[index].supervisorEmail;

    if (supervisorId) {
      const sup = employees.find(e => e.id === supervisorId);
      if (sup) {
        supervisorName = `${sup.firstName} ${sup.lastName}`.trim();
        supervisorRole = sup.role;
        supervisorEmail = sup.email;
      }
    } else if (supervisorId === null) {
      supervisorName = null;
      supervisorRole = null;
      supervisorEmail = null;
    }

    let secondarySupervisorName = employees[index].secondarySupervisorName;
    if (secondarySupervisorId) {
      const secSup = employees.find(e => e.id === secondarySupervisorId);
      if (secSup) {
        secondarySupervisorName = `${secSup.firstName} ${secSup.lastName}`.trim();
      }
    } else if (secondarySupervisorId === null) {
      secondarySupervisorName = null;
    }

    employees[index] = {
      ...employees[index],
      supervisorId: supervisorId !== undefined ? supervisorId : employees[index].supervisorId,
      supervisorName,
      supervisorRole,
      supervisorEmail,
      secondarySupervisorId: secondarySupervisorId !== undefined ? secondarySupervisorId : employees[index].secondarySupervisorId,
      secondarySupervisorName,
      unit: unit !== undefined ? unit : employees[index].unit,
      approvalTier: approvalTier !== undefined ? approvalTier : employees[index].approvalTier,
      hierarchyLevel: hierarchyLevel !== undefined ? Number(hierarchyLevel) : employees[index].hierarchyLevel,
      updatedAt: new Date().toISOString()
    };

    await logAudit({
      userId: (req as any).user?.id,
      action: 'UPDATE_STAFF_SUPERVISOR_MAPPING',
      resourceType: 'StaffHierarchy',
      resourceId: id,
      changes: {
        staffId: id,
        staffName: `${employees[index].firstName} ${employees[index].lastName}`,
        newSupervisorId: supervisorId,
        newSupervisorName: supervisorName
      }
    });

    res.json({
      success: true,
      message: `Supervisor mapping updated for ${employees[index].firstName} ${employees[index].lastName}`,
      data: employees[index]
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update supervisor mapping' });
  }
});

// 3. Bulk map staff or departments to a supervisor
router.post('/supervisors/bulk-map', async (req: Request, res: Response) => {
  try {
    const { employeeIds, department, supervisorId, approvalTier } = req.body;

    if (!supervisorId) {
      return res.status(400).json({ success: false, message: 'Supervisor ID is required for mapping' });
    }

    const sup = employees.find(e => e.id === supervisorId);
    if (!sup) {
      return res.status(404).json({ success: false, message: 'Selected supervisor not found' });
    }

    const supName = `${sup.firstName} ${sup.lastName}`.trim();
    let targetIds: string[] = [];

    if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      targetIds = employeeIds;
    } else if (department) {
      targetIds = employees.filter(e => e.department === department && e.id !== supervisorId).map(e => e.id);
    } else {
      return res.status(400).json({ success: false, message: 'Must provide either employeeIds array or department name' });
    }

    let updatedCount = 0;
    employees.forEach((emp, idx) => {
      if (targetIds.includes(emp.id) && emp.id !== supervisorId) {
        employees[idx] = {
          ...employees[idx],
          supervisorId: sup.id,
          supervisorName: supName,
          supervisorRole: sup.role,
          supervisorEmail: sup.email,
          approvalTier: approvalTier || employees[idx].approvalTier,
          updatedAt: new Date().toISOString()
        };
        updatedCount++;
      }
    });

    await logAudit({
      userId: (req as any).user?.id,
      action: 'BULK_MAP_SUPERVISOR',
      resourceType: 'StaffHierarchy',
      resourceId: supervisorId,
      changes: { targetIds, supervisorId, supervisorName: supName, updatedCount }
    });

    res.json({
      success: true,
      message: `Successfully mapped ${updatedCount} staff members to supervisor ${supName}`,
      updatedCount
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to execute bulk supervisor mapping' });
  }
});

// 4. Get full Organogram hierarchy tree
router.get('/organogram', async (req: Request, res: Response) => {
  try {
    const { rootNodes, allNodes } = buildOrganogramTree(employees);

    // Summary statistics
    const departments = Array.from(new Set(employees.map(e => e.department))).filter(Boolean);
    const totalStaff = employees.length;
    const directSupervisorsCount = allNodes.filter(n => n.directReportsCount > 0).length;

    res.json({
      success: true,
      data: {
        hospitalName: 'Faith Foundation Specialist Hospital',
        diocese: 'Catholic Diocese of Enugu',
        patron: 'Most Rev. Dr. C.V.C. Onaga',
        rootNodes,
        allNodes,
        departments,
        stats: {
          totalStaff,
          directSupervisorsCount,
          hierarchyTiers: 5,
          topLevelExecutiveCount: employees.filter(e => e.hierarchyLevel <= 2).length,
          directorateHeadCount: employees.filter(e => e.hierarchyLevel === 3).length,
          unitLeadCount: employees.filter(e => e.hierarchyLevel === 4).length,
          operationalStaffCount: employees.filter(e => e.hierarchyLevel === 5).length
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to generate organogram' });
  }
});

// Auto-synchronize all initial approved leave shifts to designated relief officers
try {
  leaveRequests.filter(l => l.status === 'APPROVED' || l.status === 'Approved').forEach(l => {
    reallocateLeaveShiftsToReliever(l);
  });
} catch (e) {
  console.error('Error synchronizing initial leave shifts to relievers:', e);
}

export default router;
