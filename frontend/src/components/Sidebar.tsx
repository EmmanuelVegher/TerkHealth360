import { useState, useEffect } from 'react';
import { assetUrl } from '../utils/assetUrl';
import { api } from '../services/api';
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Avatar, Collapse, Drawer, IconButton,
  useTheme, useMediaQuery,
} from '@mui/material';
import {
  Dashboard, People, CalendarToday, LocalHospital, LocalPharmacy,
  Receipt, Settings, Science, Bloodtype, DirectionsCar, Work,
  Assessment, ExpandLess, ExpandMore, MedicalServices,
  Biotech, CameraAlt, HowToReg, BeachAccess, Event,
  Extension, AccountBalanceWallet, AccountBalance, Bed, Mail, Shield, Business, HistoryEdu, Portrait,
  VideoCall, ChildCare, Inventory, Handyman, ContactPhone, FolderZip, SevereCold, AccessibilityNew, Policy, Timeline, PregnantWoman, VolunteerActivism, Assignment, Queue, MenuBook,
  Warehouse, LocalShipping, RequestQuote, Payment, CreditCard, Analytics,
  SettingsInputComponent, LocalGasStation, BarChart, AccessTime, LocalAtm, PlusOne, AutoGraph, NotificationsActive, TrendingUp, BabyChangingStation, CalendarMonth, DateRange, Description, PersonalVideo, Speed,
  Healing, AutoAwesome, MonitorHeart, Person, CallMade, Close, RateReview, Hotel, Sensors, AccountTree,
} from '@mui/icons-material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import { useAttendanceStatus } from '../hooks/useAttendanceStatus';
import {
  isUserLabStaff, LAB_DESIGNATIONS,
  isUserPharmacyStaff, PHARMACY_DESIGNATIONS,
  isUserMorticianStaff, MORTICIAN_DESIGNATIONS,
  isUserRadiologyStaff, RADIOLOGY_DESIGNATIONS,
  isUserPhysioStaff, PHYSIOTHERAPY_DESIGNATIONS,
  isUserCashierStaff, CASHIER_DESIGNATIONS,
  isUserFinanceStaff, FINANCE_DESIGNATIONS,
  isUserInsuranceStaff, INSURANCE_DESIGNATIONS,
  isUserAuditorStaff, AUDITOR_DESIGNATIONS,
} from '../utils/roleUtils';

const PRIMARY = '#3b5bdb';

interface SubSubNavItem {
  text: string;
  path: string;
}

interface SubNavItem {
  text: string;
  icon: JSX.Element;
  path: string;
  moduleKey?: string;
  children?: SubSubNavItem[];
}

interface NavItem {
  text: string;
  icon: JSX.Element;
  path: string;
  permission?: string;
  badge?: number | string;
  allowedDesignations?: string[];
  moduleKey?: string; // Links NavItem to HospitalConfig
  children?: SubNavItem[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}
type NavGroup = NavSection;

export const SIDEBAR_W = 260;

export interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { pathname } = useLocation();
  const { user, checkPermission } = useAuth();
  const userDesignation = user?.designation || '';
  const userRole = user?.role || '';
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN') || userRole?.toUpperCase() === 'SUPER_ADMIN';
  const isHospitalAdmin = !isSuperAdmin && (userRole === 'ADMIN' || user?.roles?.includes('ADMIN') || (userDesignation || '').toLowerCase().includes('admin'));
  const isPharmacist = isSuperAdmin || isUserPharmacyStaff(user);
  const isPurePharmacyStaff = !isSuperAdmin && !isHospitalAdmin && isUserPharmacyStaff(user);
  const isLabStaff = isSuperAdmin || isUserLabStaff(user);
  const isMortician = isSuperAdmin || isUserMorticianStaff(user);
  const isPureMorticianStaff = !isSuperAdmin && !isHospitalAdmin && isUserMorticianStaff(user);
  const isRadiologist = isSuperAdmin || isUserRadiologyStaff(user);
  const isPureRadiologyStaff = !isSuperAdmin && !isHospitalAdmin && isUserRadiologyStaff(user);
  const isPhysio = isSuperAdmin || isUserPhysioStaff(user);
  const isPurePhysioStaff = !isSuperAdmin && !isHospitalAdmin && isUserPhysioStaff(user);
  const isCashier = isSuperAdmin || isUserCashierStaff(user);
  const isPureCashierStaff = !isSuperAdmin && !isHospitalAdmin && isUserCashierStaff(user);
  const isAuditorStaff = isSuperAdmin || isUserAuditorStaff(user);
  const isPureAuditorStaff = !isSuperAdmin && !isHospitalAdmin && isUserAuditorStaff(user);
  // Auditors are NOT included in isFinanceStaff so the operational finance block doesn't grant them broad access
  const isFinanceStaff = isSuperAdmin || (isUserFinanceStaff(user) && !isPureAuditorStaff);
  const isPureFinanceStaff = !isSuperAdmin && !isHospitalAdmin && isUserFinanceStaff(user) && !isPureAuditorStaff;
  const isInsuranceStaff = isSuperAdmin || isUserInsuranceStaff(user);
  const isPureInsuranceStaff = !isSuperAdmin && !isHospitalAdmin && isUserInsuranceStaff(user);
  const [config, setConfig] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({
    Main: true, Clinical: true, 'Finance & HR': true, Admin: true, Management: true,
  });
  const [openSubItems, setOpenSubItems] = useState<Record<string, boolean>>({
    'Pharmacy Inventory': true,
    'Inventory & Warehouse Master': true,
    'Sourcing & Procurement': false,
    'Logistics & Replenishment': false,
    'Governance, Risk & BI': false,
    'Internal Banking': true,
    'Billing': true,
    'Charge Master Catalogue': true,
    'Cashier Operations': false,
    'Insurance & Claims': false,
    'Revenue Analytics & BI': false,
    'Patient E-Wallet Accounts': false,
    'Assets & Biomedical': true,
    'Asset Register & Specs': true,
    'PM, Breakdowns & Calibrations': false,
    'Facilities, Power & Fleet': false,
    'Depreciation & BI Analytics': false,
    'Staff Management': true,
    'Employee Records & Credentialing': true,
    'Attendance, Roster & Leave': false,
    'Payroll, Performance & CPD': false,
    'Governance & HR Risk BI': false,
    'Pharmacy Dispensary': true,
    'Laboratory': true,
    'Nursing Workspace': true,
    'Radiology': true,
    'Blood Bank': true,
    'Operating Theatre': true,
    'Intensive Care (ICU)': true,
    'Accident & Emergency': true,
    'Maternity & Postnatal Ward': true,
    'Physiotherapy & Rehab': true,
    'Mortuary & Funeral': true,
    'Insurance HMO': true,
    'Finance Management': true,
    'Security IAM': true,
    'System Architecture': true,
    'Reports': true,
    'Enterprise Analytics': true,
    'Messages': true,
    'Workforce & Roster': true,
    'Timesheet': true,
  });

  const toggle = (label: string) =>
    setOpen(prev => ({ ...prev, [label]: !prev[label] }));

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/config/modules');
        const data = res.data;
        if (data?.success && Array.isArray(data.data)) {
          const cfgObj: Record<string, boolean> = {};
          data.data.forEach((mod: any) => {
            cfgObj[mod.moduleKey] = mod.isActive;
          });
          setConfig(cfgObj);
        }
      } catch (err) {
        console.error('Failed to load config', err);
      }
    };
    fetchConfig();
  }, []);

  // Check if current logged-in user is a supervisor with subordinates in /staff/hierarchy
  const [hasSubordinates, setHasSubordinates] = useState<boolean>(false);
  useEffect(() => {
    const checkSupervisor = async () => {
      if (!user) return;
      try {
        const res = await api.get('/hr/supervisors/mapping');
        if (res.data?.success && res.data.data?.staff) {
          const staff = res.data.data.staff || [];
          const currentEmpId = (user as any).employeeId || (user as any).staffId || user.id;
          const currentFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
          const hasSubs = staff.some((s: any) =>
            (s.id === currentEmpId && ((s.totalSubordinatesCount || 0) > 0 || (s.directReportsCount || 0) > 0)) ||
            s.supervisorId === currentEmpId ||
            (s.supervisorName && currentFullName && s.supervisorName.toLowerCase() === currentFullName) ||
            (s.supervisorName && user.username && s.supervisorName.toLowerCase().includes(user.username.toLowerCase()))
          );
          if (hasSubs) {
            setHasSubordinates(true);
          }
        }
      } catch (e) {
        // quiet fallback
      }
    };
    checkSupervisor();
  }, [user]);

  const navGroups: NavGroup[] = [
    {
      label: 'Main',
      items: [
        { text: 'Dashboard',    icon: <Dashboard />,           path: '/' },
        { text: "Bishop Module", icon: <Shield />,    path: '/bishop-desk',  permission: 'finance:read', allowedDesignations: ['Bishop', 'Admin'] },
        // { text: 'Registration',  icon: <HowToReg />,           path: '/register-patient', permission: 'patient:write', allowedDesignations: ['Record Officer', 'Secretary', 'Admin'] },
        { text: 'Patients (MPI)', icon: <People />,            path: '/patients',     permission: 'patient:read', allowedDesignations: ['Doctor', 'Nurse', 'Record Officer', 'Secretary', 'Admin'] },
        // { text: 'Record Merges', icon: <HistoryEdu />,         path: '/merge-records', permission: 'patient:write', allowedDesignations: ['Record Officer', 'Admin'] },
        { text: 'Visits & Flow', icon: <DirectionsCar />,      path: '/visits',       permission: 'patient:read', allowedDesignations: ['Doctor', 'Nurse', 'Record Officer', 'Admin'] },
        { text: 'Patient EMR & History', icon: <Portrait />,           path: '/emr-workspace', allowedDesignations: ['Doctor', 'Nurse', 'Pathologist', 'Lab Technician', 'Lab Scientist', 'Lab Scientists', 'Record Officer', 'Admin'] },
        { text: 'Appointments',  icon: <CalendarToday />,      path: '/appointments', allowedDesignations: ['Doctor', 'Nurse', 'Record Officer', 'Secretary', 'Admin'] },
        { text: 'Queue Tracker', icon: <Queue />,              path: '/queues', allowedDesignations: ['Doctor', 'Nurse', 'Record Officer', 'Admin', 'Accountant', 'Pathologist', 'Lab Technician', 'Lab Scientist', 'Lab Scientists', 'Cashier'] },
        {
          text: 'Workforce & Roster',
          icon: <Assignment />,
          path: '/timesheets',
          children: [
            { text: 'Monthly Timesheet Grid', icon: <DateRange />, path: '/timesheets' },
            { text: 'Biometric Attendance Clock', icon: <AccessTime />, path: '/staff/attendance-roster/clock-logs' },
            { text: 'Duty Roster Schedules', icon: <CalendarMonth />, path: '/staff/attendance-roster/schedules' },
            { text: 'Leave & Absence Requests', icon: <BeachAccess />, path: '/staff/attendance-roster/leave' },
          ],
        },
        // { text: 'Patient Portal',icon: <Extension />,          path: '/patient-portal', allowedDesignations: ['Admin'] },
        // { text: 'Queue TV Board',icon: <Dashboard />,          path: '/queue-board', allowedDesignations: ['Doctor', 'Record Officer', 'Admin'] },
        // { text: 'Telemedicine Desk', icon: <VideoCall />,      path: '/telemedicine', allowedDesignations: ['Doctor', 'Admin'] },
        // { text: 'Patient Care Desk', icon: <ContactPhone />,       path: '/crm',          permission: 'patient:read', allowedDesignations: ['Record Officer', 'Admin'] },
      ],
    },
    {
      label: 'Clinical',
      items: [
        {
          text: 'Nursing Workspace',
          icon: <LocalHospital />,
          path: '/nursing',
          permission: 'clinical:read',
          allowedDesignations: ['Nurse', 'Admin'],
          children: [
            { text: 'Dashboard & Assignments', icon: <Assignment />, path: '/nursing/dashboard' },
            { text: 'Triage & Vitals Desk', icon: <TrendingUp />, path: '/nursing/triage' },
            { text: 'eMAR Med Tracker', icon: <LocalPharmacy />, path: '/nursing/emar' },
            { text: 'Ward Beds Map', icon: <Bed />, path: '/nursing/beds' },
            // { text: 'Maternity & Delivery', icon: <BabyChangingStation />, path: '/nursing/maternity' },
            // { text: 'Ward Nurse Roster', icon: <CalendarMonth />, path: '/nursing/roster' },
           // { text: 'Patient Scans & Imaging (X-Ray, Ultrasound)', icon: <PersonalVideo />, path: '/radiology/pacs' },
          ],
        },
        { text: 'Outpatient Care (OPD)', icon: <LocalHospital />, path: '/opd', permission: 'clinical:read', allowedDesignations: ['Doctor', 'Nurse', 'Admin'], moduleKey: 'OPD' },
        {
          text: 'Inpatient Care (IPD)',
          icon: <Bed />,
          path: '/ipd',
          permission: 'clinical:read',
          allowedDesignations: ['Doctor', 'Nurse', 'Admin'],
          moduleKey: 'IPD',
          children: [
            { text: 'All Wards Hub', icon: <Bed />, path: '/ipd' },
            {
              text: 'Emergency Ward (A&E)',
              icon: <TrendingUp />,
              path: '/ipd/emergency',
            },
            {
              text: 'Medical Ward',
              icon: <LocalHospital />,
              path: '/ipd/medical',
              children: [
                { text: 'Active Medical Beds', path: '/ipd/medical' },
                // { text: 'Vital Telemetry & Monitors', path: '/ipd/medical/monitors' },
                // { text: 'Internal Meds & Infusions', path: '/ipd/medical/meds' },
                { text: 'Medical Rounds & Notes', path: '/ipd/medical/notes' },
              ],
            },
            {
              text: 'Surgical Ward',
              icon: <Healing />,
              path: '/ipd/surgical',
              children: [
                { text: 'Active Surgical Beds', path: '/ipd/surgical' },
                // { text: 'Pre/Post-Op Monitors', path: '/ipd/surgical/monitors' },
                // { text: 'Surgical Meds & Drips', path: '/ipd/surgical/meds' },
                { text: 'Surgical Rounds & Notes', path: '/ipd/surgical/notes' },
              ],
            },
            {
              text: 'Private Ward (VIP)',
              icon: <AutoAwesome />,
              path: '/ipd/private',
              children: [
                { text: 'Active VIP Suites', path: '/ipd/private' },
                // { text: 'Suite Telemetry & Comfort', path: '/ipd/private/monitors' },
                // { text: 'VIP Meds & Pharmacy', path: '/ipd/private/meds' },
                { text: 'VIP Rounds & Concierge', path: '/ipd/private/notes' },
              ],
            },
            {
              text: 'ICU Ward',
              icon: <MonitorHeart />,
              path: '/ipd/icu',
              moduleKey: 'ICU',
              children: [
                { text: 'Active ICU Beds', path: '/ipd/icu/beds' },
                // { text: 'Ventilator & Monitors', path: '/ipd/icu/monitors' },
                // { text: 'Critical Care Meds', path: '/ipd/icu/meds' },
                { text: 'Critical Care Notes', path: '/ipd/icu/notes' },
              ],
            },
            {
              text: 'Paediatric Ward',
              icon: <Person />,
              path: '/ipd/paediatric',
              children: [
                { text: 'Active Paediatric Beds', path: '/ipd/paediatric' },
                // { text: 'Pediatric Telemetry & O2', path: '/ipd/paediatric/monitors' },
                // { text: 'Pediatric Dosing & Meds', path: '/ipd/paediatric/meds' },
                { text: 'Pediatric Rounds & Notes', path: '/ipd/paediatric/notes' },
              ],
            },
          ],
        },
        {
          text: 'Patient Scans & Imaging (X-Ray, Ultrasound)',
          icon: <PersonalVideo />,
          path: '/radiology/pacs',
          permission: 'clinical:read',
          allowedDesignations: ['Doctor', 'Nurse', 'Admin', 'Super Admin'],
        },
        {
          text: 'Pathology',
          icon: <Biotech />,
          path: '/pathology',
          permission: 'clinical:read',
          allowedDesignations: [...LAB_DESIGNATIONS, 'Admin', 'Super Admin'],
          moduleKey: 'PATHOLOGY',
          children: [
            { text: 'Histology Orders', icon: <Assignment />, path: '/pathology/histology' },
            { text: 'Cytology Workspace', icon: <Biotech />, path: '/pathology/cytology' },
            { text: 'Microscopic Reporting', icon: <RateReview />, path: '/pathology/reporting' },
            { text: 'Mortuary & Autopsy Manager', icon: <Hotel />, path: '/pathology/mortuary' },
            { text: 'Slide & Block Archive', icon: <Inventory />, path: '/pathology/archive' },
            { text: 'Immunohistochemistry (IHC)', icon: <Science />, path: '/pathology/ihc' },
          ],
        },
        {
          text: 'Radiology',
          icon: <CameraAlt />,
          path: '/radiology/orders',
          permission: 'clinical:read',
          allowedDesignations: [...RADIOLOGY_DESIGNATIONS, 'Admin', 'Super Admin'],
          moduleKey: 'RADIOLOGY',
          children: [
            { text: 'RIS Order Queue', icon: <Assignment />, path: '/radiology/orders' },
            { text: 'Ultrasound Scan Suite', icon: <Sensors />, path: '/radiology/ultrasound' },
            { text: 'Digital X-Ray Suite', icon: <CameraAlt />, path: '/radiology/xray' },
            { text: 'PACS & DICOM Viewer', icon: <PersonalVideo />, path: '/radiology/pacs' },
            // { text: 'Unified Diagnostic Hub', icon: <Biotech />, path: '/radiology/hub' },
            { text: 'Modality QA & Safety', icon: <Settings />, path: '/radiology/qa' },
            { text: 'Radiation Dosimetry & BI', icon: <BarChart />, path: '/radiology/analytics' },
          ],
        },
        // { text: 'Laboratory',   icon: <Science />,             path: '/lab',          permission: 'clinical:read', allowedDesignations: ['Pathologist', 'Lab Technician', 'Admin'] },
        {
          text: 'Laboratory',
          icon: <Biotech />,
          path: '/lims',
          permission: 'clinical:read',
          allowedDesignations: [...LAB_DESIGNATIONS, 'Admin', 'Super Admin'],
          moduleKey: 'PATHOLOGY',
          children: [
            { text: 'Lab Orders', icon: <Assignment />, path: '/lims/orders' },
            // { text: 'Unified Diagnostic Hub', icon: <Biotech />, path: '/radiology/hub' },
            { text: 'External Referrals', icon: <CallMade />, path: '/lims/referrals' },
            { text: 'Test Catalog', icon: <Biotech />, path: '/lims/catalog' },
            { text: 'Inventory', icon: <Inventory />, path: '/lims/inventory' },
            { text: 'Equipment', icon: <Handyman />, path: '/lims/equipment' },
            { text: 'QC Records', icon: <AutoGraph />, path: '/lims/qc' },
            { text: 'Analytics', icon: <Analytics />, path: '/lims/analytics' },
            { text: 'Critical Alerts', icon: <NotificationsActive />, path: '/lims/alerts' },
          ],
        },
        {
          text: 'Pharmacy Dispensary',
          icon: <LocalPharmacy />,
          path: '/pharmacy',
          permission: 'clinical:read',
          allowedDesignations: [...PHARMACY_DESIGNATIONS, 'Admin', 'Super Admin'],
          moduleKey: 'PHARMACY',
          children: [
            { text: 'Prescription Queue', icon: <LocalPharmacy />, path: '/pharmacy/queue' },
            { text: 'Medication Catalog', icon: <Inventory />, path: '/pharmacy/catalog' },
            { text: 'Safety & Narcotics Log', icon: <Shield />, path: '/pharmacy/safety' },
            { text: 'Operations & Finance', icon: <BarChart />, path: '/pharmacy/operations' },
            { text: 'External Integrations', icon: <PlusOne />, path: '/pharmacy/integrations' },
          ],
        },
        // {
        //   text: 'Blood Bank',
        //   icon: <Bloodtype />,
        //   path: '/blood-bank',
        //   permission: 'clinical:read',
        //   allowedDesignations: ['Pathologist', 'Lab Technician', 'Lab Scientist', 'Lab Scientists', 'Admin'],
        //   moduleKey: 'BLOOD_BANK',
        //   children: [
        //     { text: 'Donor Register', icon: <People />, path: '/blood-bank/donors' },
        //     { text: 'Blood Unit Stocks', icon: <Inventory />, path: '/blood-bank/stocks' },
        //     { text: 'Crossmatch & Transfusion', icon: <Science />, path: '/blood-bank/crossmatch' },
        //     { text: 'Transfusion Requests', icon: <Assignment />, path: '/blood-bank/requests' },
        //   ],
        // },
        {
          text: 'Operating Theatre',
          icon: <MedicalServices />,
          path: '/theatre',
          permission: 'clinical:read',
          allowedDesignations: ['Doctor', 'Nurse', 'Admin'],
          moduleKey: 'OPERATING_THEATRE',
          children: [
            { text: 'Surgical Schedules', icon: <CalendarToday />, path: '/theatre/schedules' },
            { text: 'Operating Rooms', icon: <LocalHospital />, path: '/theatre/rooms' },
            { text: 'Post-Op Recovery', icon: <Bed />, path: '/theatre/post-op' },
            { text: 'Anesthesia Safety Checklist', icon: <Shield />, path: '/theatre/anesthesia' },
          ],
        },


        { text: 'Family Planning',            icon: <VolunteerActivism />, path: '/family-planning', permission: 'clinical:read', allowedDesignations: ['Doctor', 'Nurse', 'Admin'], moduleKey: 'MATERNITY' },
        { text: 'Antenatal Care (ANC)',       icon: <PregnantWoman />,     path: '/anc',             permission: 'clinical:read', allowedDesignations: ['Doctor', 'Nurse', 'Admin'], moduleKey: 'MATERNITY' },
        { text: 'Labour & Delivery Ward',     icon: <Timeline />,          path: '/labour-ward',     permission: 'clinical:read', allowedDesignations: ['Doctor', 'Nurse', 'Admin'], moduleKey: 'MATERNITY' },
        {
          text: 'Maternity & Postnatal Ward',
          icon: <ChildCare />,
          path: '/ipd/maternity',
          permission: 'clinical:read',
          allowedDesignations: ['Doctor', 'Nurse', 'Admin'],
          moduleKey: 'MATERNITY',
        },
        {
          text: 'Physiotherapy & Rehab',
          icon: <AccessibilityNew />,
          path: '/rehabilitation',
          permission: 'clinical:read',
          allowedDesignations: [...PHYSIOTHERAPY_DESIGNATIONS, 'Admin', 'Super Admin'],
          moduleKey: 'PHYSIO',
          children: [
            { text: 'Rehabilitation Exercise Analysis System', icon: <AutoAwesome />, path: '/rehabilitation/mirror' },
            { text: 'E-Referrals & Intake Queue', icon: <LocalHospital />, path: '/rehabilitation/referrals' },
            { text: 'Therapy Appointments & Schedule', icon: <CalendarToday />, path: '/rehabilitation/schedule' },
            { text: 'Session Logger & Treatment', icon: <Event />, path: '/rehabilitation/sessions' },
            { text: 'Patient Care Plans', icon: <Assignment />, path: '/rehabilitation/plans' },
            { text: 'Progress & ROM Assessments', icon: <TrendingUp />, path: '/rehabilitation/progress' },
            { text: 'Equipment & Modalities Registry', icon: <Handyman />, path: '/rehabilitation/equipment' },
          ],
        },
        {
          text: 'Mortuary & Funeral',
          icon: <SevereCold />,
          path: '/mortuary',
          permission: 'clinical:read',
          allowedDesignations: [...MORTICIAN_DESIGNATIONS, 'Doctor', 'Admin', 'Super Admin'],
          moduleKey: 'MORTUARY',
          children: [
            { text: 'Deceased Ingestion Log', icon: <Assignment />, path: '/mortuary/ingestion' },
            { text: 'Cold Vault Beds', icon: <SevereCold />, path: '/mortuary/vaults' },
            { text: 'Autopsy & Pathology', icon: <Biotech />, path: '/mortuary/autopsy' },
            { text: 'Release & Billing', icon: <Receipt />, path: '/mortuary/release' },
          ],
        },
      ],
    },
    {
      label: 'Finance & HR',
      items: [
        {
          text: 'Billing & Cashier Desk',
          icon: <Receipt />,
          path: '/billing',
          permission: 'finance:read',
          allowedDesignations: [...CASHIER_DESIGNATIONS, 'Accountant', 'Record Officer', 'Admin', 'Super Admin'],
          children: [
            {
              text: 'Billing & Charge Capture',
              icon: <Receipt />,
              path: '/billing/billing',
              children: [
                { text: 'Pending Bills Queue', path: '/billing/billing' },
                { text: 'Invoice Manager', path: '/billing/billing/invoices' },
                { text: 'Refunds & Reversals', path: '/billing/billing/refunds' },
                // { text: 'Charge Capture', path: '/billing/billing/capture' },
                // { text: 'Estimates & Quotations', path: '/billing/billing/estimates' },
              ],
            },
            {
              text: 'Charge Master Catalogue',
              icon: <MenuBook />,
              path: '/billing/charge-master',
              children: [
                { text: 'All Billable Services', path: '/billing/charge-master' },
                // { text: 'Fee Schedules & Tariffs', path: '/billing/charge-master/tariffs' },
                // { text: 'NHIA / HMO Multipliers', path: '/billing/charge-master/multipliers' },
              ],
            },
            // {
            //   text: 'Cashier Operations',
            //   icon: <CreditCard />,
            //   path: '/billing/cashier',
            //   children: [
            //     { text: 'Cashier Workspace', path: '/billing/cashier/workspace' },
            //     // { text: 'Duty Roster & Till Shifts', path: '/staff/attendance-roster/schedules?role=Cashier' },
            //     { text: 'Payment Transactions', path: '/billing/cashier/payments' },
            //     // { text: 'Refunds & Reversals', path: '/billing/cashier/refunds' },
            //   ],
            // },
            // {
            //   text: 'Insurance & Claims',
            //   icon: <Shield />,
            //   path: '/billing/claims',
            //   children: [
            //     { text: 'Claims Register (NHIA/HMO)', path: '/billing/claims/register' },
            //     { text: 'Electronic Remittance (ERA)', path: '/billing/claims/era' },
            //     { text: 'Payer Directory', path: '/billing/claims/payers' },
            //   ],
            // },
            // {
            //   text: 'Revenue Analytics & BI',
            //   icon: <Analytics />,
            //   path: '/billing/analytics',
            //   children: [
            //     { text: 'Financial Overview', path: '/billing/analytics/overview' },
            //     // { text: 'AR Ageing Analysis', path: '/billing/analytics/ageing' },
            //     // { text: 'Payer Performance Matrix', path: '/billing/analytics/payers' },
            //     // { text: 'Financial Audit Log', path: '/billing/analytics/audit' },
            //   ],
            // },
            {
              text: 'Internal Hospital Wallets',
              icon: <AccountBalanceWallet />,
              path: '/billing/wallets/ledger',
              children: [
                { text: 'Wallets & Pre-Payment', path: '/billing/wallets/ledger' },
              ],
            },
            {
              text: 'Revenue KPIs',
              icon: <TrendingUp />,
              path: '/billing/billing/kpis',
            },
          ],
        },
        {
          text: 'Insurance HMO',
          icon: <Shield />,
          path: '/insurance-portal',
          permission: 'finance:read',
          allowedDesignations: [...INSURANCE_DESIGNATIONS, 'Accountant', 'Admin', 'Super Admin'],
          children: [
            { text: 'HMO Pre-Auth Claims', icon: <Receipt />, path: '/insurance-portal/claims' },
            { text: 'Benefit Caps Audit', icon: <Assessment />, path: '/insurance-portal/caps' },
            { text: 'Tariffs & Code Master', icon: <Description />, path: '/insurance-portal/tariffs' },
            { text: 'HMO Reconciliation', icon: <BarChart />, path: '/insurance-portal/reconciliation' },
          ],
        },
        // { text: 'Financial Audit', icon: <Assessment />,       path: '/financial-audit', allowedDesignations: ['Auditor', 'Admin'] },
        {
          text: 'Pharmacy Inventory',
          icon: <Inventory />,
          path: '/inventory',
          allowedDesignations: [...PHARMACY_DESIGNATIONS, 'Admin', 'Super Admin'],
          children: [
            {
              text: 'Inventory & Warehouse Master',
              icon: <Warehouse />,
              path: '/inventory/master',
              children: [
                { text: 'Central Catalogue', path: '/inventory/master/catalogue' },
                { text: 'Warehouse Locations', path: '/inventory/master/locations' },
                { text: 'Stock Balance & Adjustments', path: '/inventory/master/stock-balance' },
                { text: 'Expiry Tracker', path: '/inventory/master/expiry-tracker' },
              ],
            },
            {
              text: 'Sourcing & Procurement',
              icon: <RequestQuote />,
              path: '/inventory/procurement',
              children: [
                { text: 'Requisitions', path: '/inventory/procurement/requisitions' },
                { text: 'Supplier Directory', path: '/inventory/procurement/suppliers' },
                { text: 'Purchase Orders', path: '/inventory/procurement/purchase-orders' },
                { text: 'Goods Receipt (GRN)', path: '/inventory/procurement/goods-receipt' },
              ],
            },
            {
              text: 'Logistics & Replenishment',
              icon: <LocalShipping />,
              path: '/inventory/logistics',
              children: [
                { text: 'Stock Transfers', path: '/inventory/logistics/transfers' },
                { text: 'Cold Chain Monitoring', path: '/inventory/logistics/cold-chain' },
              ],
            },
            {
              text: 'Governance, Risk & BI',
              icon: <Shield />,
              path: '/inventory/governance',
              children: [
                { text: 'Supply Chain BI', path: '/inventory/governance/bi' },
                { text: 'Risk Register & Audits', path: '/inventory/governance/risk-register' },
                { text: 'Fraud Alert Monitor', path: '/inventory/governance/fraud-alerts' },
              ],
            },
          ],
        },
        {
          text: 'Finance Management',
          icon: <AccountBalance />,
          path: '/finance',
          permission: 'finance:read',
          allowedDesignations: [...FINANCE_DESIGNATIONS, 'Admin', 'Super Admin'],
          children: [
            {
              text: 'Financial Ledger',
              icon: <AccountBalanceWallet />,
              path: '/finance/ledger',
              children: [
                { text: 'Chart of Accounts', path: '/finance/ledger/coa' },
                { text: 'Hospital Bank Accounts', path: '/finance/ledger/bank-accounts' },
                { text: 'Journal Voucher Posts', path: '/finance/ledger/journals' },
                { text: 'Financial Periods', path: '/finance/ledger/periods' },
                { text: 'Statutory Financial Statements', path: '/finance/ledger/statements' },
              ],
            },
            {
              text: 'Budgets & Cost Centres',
              icon: <BarChart />,
              path: '/finance/budgets',
              children: [
                { text: 'Budget Control & Variances', path: '/finance/budgets/control' },
                { text: 'Bank Reconciliations', path: '/finance/budgets/reconciliations' },
                { text: 'Income & Expenditure Trends', path: '/finance/budgets/trends' },
                { text: 'Accounts Payable & Disbursements', path: '/finance/budgets/payables' },
              ],
            },
            {
              text: 'Assets, Grants & Taxes',
              icon: <Assignment />,
              path: '/finance/assets',
              children: [
                { text: 'Fixed Asset Register', path: '/finance/assets/register' },
                { text: 'Donor Grants & Projects', path: '/finance/assets/grants' },
                { text: 'Tax Compliance Filings', path: '/finance/assets/taxes' },
              ],
            },
            /* {
              text: 'Gateways & Governance',
              icon: <CreditCard />,
              path: '/finance/gateways',
              children: [
                { text: 'Payment Gateway Simulator', path: '/finance/gateways/simulator' },
                { text: 'Gateway Reports & Settlements', path: '/finance/gateways/settlements' },
                { text: 'Risk Register & Audits', path: '/finance/gateways/risks' },
                { text: 'Fraud Alert Logs', path: '/finance/gateways/fraud' },
              ],
            }, */
          ],
        },
        /*
        {
          text: 'Assets & Biomedical',
          icon: <Handyman />,
          path: '/assets',
          permission: 'finance:read',
          allowedDesignations: [...FINANCE_DESIGNATIONS, 'Biomedical Engineer', 'Maintenance Officer', 'Admin', 'Super Admin'],
          children: [
            {
              text: 'Asset Register & Specs',
              icon: <Handyman />,
              path: '/assets/register',
              children: [
                { text: 'Enterprise Asset Registry', path: '/assets/register/registry' },
                { text: 'Biomedical Specifications', path: '/assets/register/specs' },
              ],
            },
            {
              text: 'PM, Breakdowns & Calibrations',
              icon: <SettingsInputComponent />,
              path: '/assets/maintenance',
              children: [
                { text: 'Maintenance Work Orders', path: '/assets/maintenance/workorders' },
                { text: 'Calibration & Certificates', path: '/assets/maintenance/calibrations' },
              ],
            },
            {
              text: 'Facilities, Power & Fleet',
              icon: <LocalGasStation />,
              path: '/assets/facilities',
              children: [
                { text: 'Backup Generators (Power)', path: '/assets/facilities/generators' },
                { text: 'Oxygen & Medical Gases', path: '/assets/facilities/gases' },
                { text: 'Ambulance Fleets', path: '/assets/facilities/fleet' },
                { text: 'Fire & Safety Inspections', path: '/assets/facilities/safety' },
              ],
            },
            {
              text: 'Depreciation & BI Analytics',
              icon: <BarChart />,
              path: '/assets/analytics',
              children: [
                { text: 'Fixed Asset Valuation', path: '/assets/analytics/depreciation' },
                { text: 'Downtime BI Dashboard', path: '/assets/analytics/downtime' },
              ],
            },
          ],
        },
        */
        {
          text: 'Staff Management',
          icon: <Work />,
          path: '/staff',
          permission: 'user:read',
          allowedDesignations: ['Secretary', 'Admin', 'Supervisor', 'Director', 'Lead', 'Head', 'Matron', 'Bishop', 'Super Admin'],
          children: [
            {
              text: 'Employee Records & Credentialing',
              icon: <People />,
              path: '/staff/records',
              children: [
                { text: 'Employee Directory', path: '/staff/records/directory' },
                { text: 'Recruitment & Vacancies', path: '/staff/records/vacancies' },
                { text: 'Credential Verification', path: '/staff/records/credentials' },
              ],
            },
            {
              text: 'Attendance, Roster & Leave',
              icon: <AccessTime />,
              path: '/staff/attendance-roster',
              children: [
                { text: 'Biometric Clock Logs', path: '/staff/attendance-roster/clock-logs' },
                { text: 'Attendance Analysis', path: '/staff/attendance-roster/analysis' },
                { text: 'Duty Roster Schedules', path: '/staff/attendance-roster/schedules' },
                { text: 'Leave Requests Control', path: '/staff/attendance-roster/leave' },
                { text: 'Timesheet Review & Approval', path: '/staff/attendance-roster/timesheets' },
              ],
            },
            {
              text: 'Payroll, Performance & CPD',
              icon: <LocalAtm />,
              path: '/staff/payroll-performance',
              children: [
                { text: 'Payroll Administration', path: '/staff/payroll-performance/payroll' },
                { text: 'Performance Appraisals', path: '/staff/payroll-performance/appraisals' },
                { text: 'Continuing Professional Dev. (CPD)', path: '/staff/payroll-performance/cpd' },
              ],
            },
            {
              text: 'Supervisor Mapping & Organogram',
              icon: <AccountTree />,
              path: '/staff/hierarchy',
              children: [
                { text: 'Staff-Supervisor Mapping', path: '/staff/hierarchy/mapping' },
                { text: 'Hospital Organogram Tree', path: '/staff/hierarchy/organogram' },
                { text: 'Approval Tiers Matrix', path: '/staff/hierarchy/rules' },
              ],
            },
            {
              text: 'Governance & HR Risk BI',
              icon: <Shield />,
              path: '/staff/governance-bi',
              children: [
                { text: 'Workforce BI Analytics', path: '/staff/governance-bi/analytics' },
                { text: 'HR Risks & Succession', path: '/staff/governance-bi/risks' },
              ],
            },
          ],
        },
        { text: 'Internal Requests', icon: <Assessment />,     path: '/internal-requests', permission: 'user:read', allowedDesignations: ['Secretary', 'Admin'] },
        { text: 'Admin Collaboration', icon: <People />,       path: '/admin-interactive', permission: 'user:read', allowedDesignations: ['Secretary', 'Admin'] },
        // { text: 'Internal Memos', icon: <Event />,             path: '/internal-memos', allowedDesignations: ['Secretary', 'Admin'] },
        { text: 'Leave',        icon: <BeachAccess />,         path: '/leave',        permission: 'user:read', allowedDesignations: ['Admin'] },
      ],
    },
    {
      label: 'Management',
      items: [
        { text: 'User Accounts', icon: <People />,              path: '/users',        permission: 'user:read', allowedDesignations: ['Admin'] },
        { text: 'Roles & RBAC', icon: <Shield />,              path: '/roles',        permission: 'role:read', allowedDesignations: ['Admin'] },
        // { text: 'Departments',  icon: <Business />,            path: '/departments',  permission: 'department:read', allowedDesignations: ['Admin'] },
        { text: 'Audit Logs',   icon: <HistoryEdu />,          path: '/audit-logs',   permission: 'audit:read', allowedDesignations: ['Admin'] },
        { text: 'Document DMS',  icon: <FolderZip />,           path: '/dms',          permission: 'patient:read', allowedDesignations: ['Record Officer', 'Secretary', 'Admin'] },
        {
          text: 'Security IAM',
          icon: <Shield />,
          path: '/security-iam',
          permission: 'role:read',
          allowedDesignations: ['Admin'],
          children: [
            { text: 'User Credentials', icon: <People />, path: '/security-iam/credentials' },
            { text: 'Role Permissions', icon: <Shield />, path: '/security-iam/permissions' },
            { text: 'Security Audit Logs', icon: <HistoryEdu />, path: '/security-iam/logs' },
            { text: 'Active Sessions', icon: <AccessTime />, path: '/security-iam/sessions' },
          ],
        },
        {
          text: 'System Architecture',
          icon: <Policy />,
          path: '/architecture',
          permission: 'role:read',
          allowedDesignations: ['Admin'],
          children: [
            { text: 'System Modules & Layers', icon: <Policy />, path: '/architecture/layers' },
            { text: 'API Specifications', icon: <SettingsInputComponent />, path: '/architecture/api' },
            { text: 'Database Schemas', icon: <MenuBook />, path: '/architecture/db' },
            { text: 'Infrastructure & Security', icon: <Shield />, path: '/architecture/infra' },
          ],
        },
      ],
    },
    {
      label: 'Admin',
      items: [
        {
          text: 'Reports',
          icon: <Assessment />,
          path: '/reports',
          permission: 'reports:read',
          allowedDesignations: ['Admin', 'Bishop', 'Super Admin'],
          children: [
            { text: 'Clinical Reports', icon: <LocalHospital />, path: '/reports/clinical' },
            { text: 'Financial Balance Reports', icon: <Receipt />, path: '/reports/financial' },
            { text: 'Pharmacy & Stock Reports', icon: <LocalPharmacy />, path: '/reports/pharmacy' },
            { text: 'Executive Summaries', icon: <BarChart />, path: '/reports/executive' },
          ],
        },
        {
          text: 'Enterprise Analytics',
          icon: <Assessment />,
          path: '/analytics',
          permission: 'reports:read',
          allowedDesignations: ['Admin'],
          children: [
            { text: 'Executive Overview', icon: <BarChart />, path: '/analytics/overview' },
            { text: 'Departmental KPIs', icon: <Analytics />, path: '/analytics/kpis' },
            { text: 'Patient Demographics BI', icon: <People />, path: '/analytics/demographics' },
            { text: 'Predictive Intelligence', icon: <AutoGraph />, path: '/analytics/predictive' },
          ],
        },
        { text: 'Events',       icon: <Event />,               path: '/events',       permission: 'settings:read', allowedDesignations: ['Admin'] },
        {
          text: 'Messages',
          icon: <Mail />,
          path: '/messages',
          allowedDesignations: ['Doctor', 'Nurse', 'Pharmacist', 'Lab Technician', 'Pathologist', 'Record Officer', 'Secretary', 'Admin', 'Accountant'],
          children: [
            { text: 'Internal Chat & Channels', icon: <Mail />, path: '/messages/chat' },
            { text: 'Hospital Announcements', icon: <Event />, path: '/messages/announcements' },
            { text: 'Clinical Alert Pagers', icon: <NotificationsActive />, path: '/messages/alerts' },
            { text: 'Shift Handover Memos', icon: <Description />, path: '/messages/memos' },
          ],
        },
        { text: 'Workflow Config', icon: <Policy />,           path: '/workflow-config', permission: 'settings:read', allowedDesignations: ['Admin'] },
        { text: 'Data Dictionary',  icon: <MenuBook />,         path: '/data-dictionary', permission: 'settings:read', allowedDesignations: ['Doctor', 'Lab Technician', 'Pathologist', 'Admin'] },
        { text: 'Settings',     icon: <Settings />,            path: '/settings',     permission: 'settings:read', allowedDesignations: ['Admin'] },
      ],
    },
  ];

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';

  const attendance = useAttendanceStatus();
  const navigate = useNavigate();

  const sidebarContent = (
    <Box
      sx={{
        width: SIDEBAR_W,
        height: '100%',
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, #1e2a78 0%, #162068 60%, #0d1550 100%)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
        overflowY: 'auto', overflowX: 'hidden',
      }}
    >
      {/* Logo */}
      <Box sx={{ px: 2.5, py: 2.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            component="img"
            src={assetUrl('/hospital-logo.webp')}
            sx={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
          
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1.1, fontSize: '0.88rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Faith Foundation
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.66rem', fontWeight: 600 }}>
              Mission Hospital
            </Typography>
          </Box>
        </Box>
        {isMobile && (
          <IconButton onClick={onMobileClose} sx={{ color: 'rgba(255,255,255,0.85)' }}>
            <Close />
          </IconButton>
        )}
      </Box>

      {/* ── Real-time Persistent Sidebar Duty Timer ── */}
      <Box sx={{ px: 1.5, pb: 1.2 }}>
        <Box
          onClick={() => {
            navigate('/staff/attendance-roster/clock-logs');
            if (isMobile && onMobileClose) onMobileClose();
          }}
          sx={{
            p: 1.25,
            borderRadius: '12px',
            cursor: 'pointer',
            background: attendance.isClockedIn
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 95, 70, 0.42) 100%)'
              : attendance.isOnApprovedLeave
              ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.28) 0%, rgba(180, 83, 9, 0.45) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
            border: attendance.isClockedIn
              ? '1.2px solid rgba(52, 211, 153, 0.45)'
              : attendance.isOnApprovedLeave
              ? '1.2px solid rgba(245, 158, 11, 0.55)'
              : '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: attendance.isClockedIn
              ? '0 4px 16px rgba(16, 185, 129, 0.22)'
              : attendance.isOnApprovedLeave
              ? '0 4px 16px rgba(217, 119, 6, 0.25)'
              : 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-1.5px)',
              borderColor: attendance.isClockedIn ? '#34d399' : attendance.isOnApprovedLeave ? '#fbbf24' : 'rgba(255,255,255,0.22)',
              background: attendance.isClockedIn
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(6, 95, 70, 0.55) 100%)'
                : attendance.isOnApprovedLeave
                ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.35) 0%, rgba(180, 83, 9, 0.55) 100%)'
                : 'rgba(255, 255, 255, 0.09)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: attendance.isClockedIn ? '#10b981' : attendance.isOnApprovedLeave ? '#f59e0b' : 'rgba(255,255,255,0.3)',
                  boxShadow: attendance.isClockedIn ? '0 0 8px #10b981' : attendance.isOnApprovedLeave ? '0 0 8px #f59e0b' : 'none',
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: attendance.isClockedIn ? '#6ee7b7' : attendance.isOnApprovedLeave ? '#fde68a' : 'rgba(255,255,255,0.5)',
                }}
              >
                {attendance.isClockedIn ? 'On Duty · Active' : attendance.isOnApprovedLeave ? '🏖️ On Approved Leave' : 'Off Duty'}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.62rem', color: attendance.isOnApprovedLeave ? '#fde68a' : 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
              {attendance.isClockedIn ? (
                attendance.clockInTime ? (
                  attendance.isMultiDay && attendance.clockInDateFormatted ? (
                    `In: ${attendance.clockInDateFormatted.slice(0, 6)}, ${attendance.clockInTime}`
                  ) : (
                    `In: ${attendance.clockInTime}`
                  )
                ) : 'Active'
              ) : attendance.isOnApprovedLeave ? 'Duty Locked' : 'Punch In'}
            </Typography>
          </Box>

          {attendance.isClockedIn ? (
            <>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '0.04em',
                  lineHeight: 1.15,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                {attendance.elapsedStr}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {attendance.shiftName.split('(')[0].trim()}
                </Typography>
                <Typography sx={{ fontSize: '0.62rem', color: '#34d399', fontWeight: 800 }}>
                  {attendance.percent}%
                </Typography>
              </Box>
              <Box
                sx={{
                  mt: 0.5,
                  height: 3.5,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.12)',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${attendance.percent}%`,
                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                    borderRadius: 2,
                    transition: 'width 0.4s ease',
                  }}
                />
              </Box>
            </>
          ) : attendance.isOnApprovedLeave ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, pt: 0.2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '0.74rem', color: '#fef3c7', fontWeight: 800, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {attendance.approvedLeave?.type || 'Annual'} Leave
                </Typography>
                <Box
                  sx={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    bgcolor: '#d97706',
                    color: '#fff',
                    px: 1,
                    py: 0.35,
                    borderRadius: '6px',
                    boxShadow: '0 2px 6px rgba(217, 119, 6, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.4,
                  }}
                >
                  <span>🔒</span> Locked
                </Box>
              </Box>
              <Typography sx={{ fontSize: '0.62rem', color: '#fde68a', fontWeight: 600 }}>
                {attendance.approvedLeave?.startDate} – {attendance.approvedLeave?.endDate || attendance.approvedLeave?.startDate}
              </Typography>
              <Typography sx={{ fontSize: '0.58rem', color: 'rgba(254, 243, 199, 0.75)', lineHeight: 1.1 }}>
                Clock-in disabled (Relief: {attendance.approvedLeave?.reliefOfficer || 'Reliever'})
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.2 }}>
              <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                Not Clocked In
              </Typography>
              <Box
                sx={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  bgcolor: '#10b981',
                  color: '#fff',
                  px: 1,
                  py: 0.35,
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)',
                }}
              >
                Clock In →
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2, mb: 0.5 }} />
      
      {/* Nav groups */}
      <Box sx={{ flex: 1, px: 1.5, py: 0.5 }}>
        {navGroups.map(group => {
          // Filter items based on permission and allowedDesignations
  // Role → allowed designations mapping (catches users whose designation string
  // differs from what's listed, e.g. "Senior Consultant" maps to Doctor)
  const ROLE_DESIGNATION_MAP: Record<string, string[]> = {
    DOCTOR:        ['Doctor', 'Senior Consultant', 'Chief Consultant', 'Chief Consultant Physician', 'Consultant', 'Medical Officer', 'Physician', 'Chief Medical Officer', 'CMO', 'GP', 'General Practitioner', 'Specialist', 'Surgeon', 'Intern', 'Attending Physician', 'Resident', 'Clinician'],
    NURSE:         ['Nurse', 'Senior Nurse', 'Staff Nurse', 'Nursing Officer', 'Head Nurse', 'Midwife'],
    PHARMACIST:    PHARMACY_DESIGNATIONS,
    PHARMACY_TECHNICIAN: PHARMACY_DESIGNATIONS,
    PHARMACY_TECHNICIANS: PHARMACY_DESIGNATIONS,
    PHARMACY:      PHARMACY_DESIGNATIONS,
    MORTICIAN:     MORTICIAN_DESIGNATIONS,
    RADIOLOGIST:   RADIOLOGY_DESIGNATIONS,
    RADIOGRAPHER:  RADIOLOGY_DESIGNATIONS,
    RADIOLOGY:     RADIOLOGY_DESIGNATIONS,
    PHYSIOTHERAPIST: PHYSIOTHERAPY_DESIGNATIONS,
    PHYSIO:          PHYSIOTHERAPY_DESIGNATIONS,
    REHABILITATION:  PHYSIOTHERAPY_DESIGNATIONS,
    LAB_TECHNICIAN: LAB_DESIGNATIONS,
    LAB_SCIENTIST:  LAB_DESIGNATIONS,
    PATHOLOGIST:    LAB_DESIGNATIONS,
    LABORATORY:     LAB_DESIGNATIONS,
    LAB:            LAB_DESIGNATIONS,
    MEDICAL_LABORATORY_SCIENTIST: LAB_DESIGNATIONS,
    CASHIER:        CASHIER_DESIGNATIONS,
    BILLING_OFFICER: CASHIER_DESIGNATIONS,
    AUDITOR:        AUDITOR_DESIGNATIONS,
    INTERNAL_AUDITOR: AUDITOR_DESIGNATIONS,
    FINANCE_OFFICER: FINANCE_DESIGNATIONS,
    ACCOUNTANT:     FINANCE_DESIGNATIONS,
    FINANCE:        FINANCE_DESIGNATIONS,
    INSURANCE_OFFICER: INSURANCE_DESIGNATIONS,
    HMO_OFFICER:    INSURANCE_DESIGNATIONS,
    INSURANCE:      INSURANCE_DESIGNATIONS,
    HMO:            INSURANCE_DESIGNATIONS,
    RECEPTIONIST:  ['Record Officer', 'Receptionist', 'Front Desk Officer'],
  };

  const effectiveDesignation = (userRolesList: string[], designation: string): string[] => {
    const norm = (designation ?? '').trim().toLowerCase();
    const result: string[] = [designation];

    if (isRadiologist || norm.includes('radiolog') || norm.includes('radiograph') || norm.includes('sonograph')) {
      result.push(...RADIOLOGY_DESIGNATIONS);
    }
    if (isPhysio || norm.includes('physio') || norm.includes('physical therap') || norm.includes('rehab')) {
      result.push(...PHYSIOTHERAPY_DESIGNATIONS);
    }
    if (isPharmacist || norm.includes('pharmac') || norm.includes('pharm tech')) {
      result.push(...PHARMACY_DESIGNATIONS);
    }
    if (isMortician || norm.includes('mortician') || norm.includes('mortuary') || norm.includes('embalm')) {
      result.push(...MORTICIAN_DESIGNATIONS);
    }
    if (
      isLabStaff ||
      norm.includes('patholog') ||
      norm.includes('lab') ||
      norm.includes('scientist') ||
      norm.includes('cytotech') ||
      norm.includes('histotech') ||
      norm.includes('cmls') ||
      norm.includes('smls') ||
      norm.includes('pmls') ||
      norm.includes('mls')
    ) {
      result.push(...LAB_DESIGNATIONS);
    }
    if (isCashier || norm.includes('cashier') || norm.includes('billing') || norm.includes('cash desk')) {
      result.push(...CASHIER_DESIGNATIONS);
    }
    if (isFinanceStaff || norm.includes('accountant') || norm.includes('finance') || norm.includes('cfo') || norm.includes('auditor') || norm.includes('bursar')) {
      result.push(...FINANCE_DESIGNATIONS);
    }
    if (isInsuranceStaff || norm.includes('insurance') || norm.includes('hmo') || norm.includes('nhia') || norm.includes('claims')) {
      result.push(...INSURANCE_DESIGNATIONS);
    }

    userRolesList.forEach(r => {
      const mapped = ROLE_DESIGNATION_MAP[r.toUpperCase()] || ROLE_DESIGNATION_MAP[r] || [];
      result.push(...mapped);
    });

    const doctorKeywords = ['doctor', 'physician', 'consultant', 'surgeon', 'medical officer', 'clinician', 'gp', 'specialist', 'intern', 'resident', 'cmo'];
    if (doctorKeywords.some(kw => norm.includes(kw))) {
      result.push(...ROLE_DESIGNATION_MAP['DOCTOR']);
    }

    return Array.from(new Set(result.filter(Boolean)));
  };

  const visibleItems = group.items.filter((item: NavItem) => {
    // Check Module configuration first
    if (item.moduleKey && config[item.moduleKey] === false) {
      return false;
    }

    if (!user) return false;

    // 0. Bishop Role:
    // Strictly show Dashboard, Bishop Module, Staff Management, Finance Management, and Reports (and all subpages) on his sidebar
    const isBishopUser = userRole === 'BISHOP' || user?.roles?.includes('BISHOP') || (userDesignation || '').toLowerCase().includes('bishop') || (userRole || '').toLowerCase() === 'bishop';
    if (isBishopUser) {
      if (
        item.path === '/' ||
        item.path === '/bishop-desk' ||
        item.path?.startsWith('/bishop-desk') ||
        item.text === 'Bishop Module' ||
        item.path === '/staff' ||
        item.path?.startsWith('/staff') ||
        item.path === '/hr' ||
        item.path?.startsWith('/hr') ||
        item.text === 'Staff Management' ||
        item.path === '/finance' ||
        item.path?.startsWith('/finance') ||
        item.text === 'Finance Management' ||
        item.path === '/reports' ||
        item.path?.startsWith('/reports') ||
        item.text === 'Reports'
      ) {
        return true;
      }
      return false;
    }

    // 1. Super Admin has unrestricted full access to ALL system modules, pages, and subpages
    const isSuperAdminUser = user.role === 'SUPER_ADMIN' || user.roles?.includes('SUPER_ADMIN') || user.role?.toUpperCase() === 'SUPER_ADMIN';
    if (isSuperAdminUser) return true;

    // 2. Hospital Administrator (ADMIN) role:
    // Strictly show Dashboard, Staff Management, Finance Management, Reports & Analytics, and Messages (and all their subpages)
    const isHospitalAdminUser = user.role === 'ADMIN' || user.roles?.includes('ADMIN') || (userDesignation || '').toLowerCase().includes('admin');
    if (isHospitalAdminUser) {
      // Workforce & Roster is commented out / hidden for the admin role
      if (
        item.path === '/' ||
        /* item.path === '/timesheets' ||
        item.path?.startsWith('/timesheets') ||
        item.text === 'Workforce & Roster' || */
        item.path === '/staff' ||
        item.path?.startsWith('/staff') ||
        item.path === '/hr' ||
        item.path?.startsWith('/hr') ||
        item.text === 'Staff Management' ||
        item.path === '/finance' ||
        item.path?.startsWith('/finance') ||
        item.text === 'Finance Management' ||
        item.path === '/reports' ||
        item.path?.startsWith('/reports') ||
        item.text === 'Reports' ||
        item.path === '/analytics' ||
        item.path?.startsWith('/analytics') ||
        item.text === 'Enterprise Analytics' ||
        item.path === '/messages' ||
        item.path?.startsWith('/messages') ||
        item.text === 'Messages'
      ) {
        return true;
      }
      return false;
    }

    // Workforce & Roster (Timesheet / Attendance / Shifts / Leave) is accessible to all authenticated hospital staff across all departments & roles
    if (item.path === '/timesheets' || item.path?.startsWith('/timesheets') || item.text === 'Timesheet' || item.text === 'Workforce & Roster') {
      return true;
    }

    // 3. Supervisors with subordinates mapped in /staff/hierarchy can access Staff Management (Appraisals & Hierarchy)
    const isSupervisorRoleOrDesignation =
      (userRole || '').toLowerCase().includes('supervisor') ||
      (userDesignation || '').toLowerCase().includes('supervisor') ||
      (userDesignation || '').toLowerCase().includes('lead') ||
      (userDesignation || '').toLowerCase().includes('head') ||
      (userDesignation || '').toLowerCase().includes('director') ||
      (userDesignation || '').toLowerCase().includes('matron') ||
      (userDesignation || '').toLowerCase().includes('coordinator') ||
      (userDesignation || '').toLowerCase().includes('chief') ||
      (userDesignation || '').toLowerCase().includes('cno') ||
      (userDesignation || '').toLowerCase().includes('cmd') ||
      (userDesignation || '').toLowerCase().includes('consultant') ||
      (userDesignation || '').toLowerCase().includes('chair');

    const isSupervisorUser = hasSubordinates || isSupervisorRoleOrDesignation;
    if (isSupervisorUser && (
      item.path === '/staff' ||
      item.path?.startsWith('/staff') ||
      item.path === '/hr' ||
      item.path?.startsWith('/hr') ||
      item.text === 'Staff Management'
    )) {
      return true;
    }

    const allUserRoles = [user.role, ...(user.roles || [])].filter(Boolean) as string[];
    const effective = effectiveDesignation(allUserRoles, userDesignation);

    // Strict restriction for Cashier roles: only Dashboard, Billing / Cashier Desk, Queue Tracker, and Messages allowed
    if (isPureCashierStaff) {
      if (
        item.path === '/' ||
        item.path === '/billing' ||
        item.path?.startsWith('/billing') ||
        item.path === '/queues' ||
        item.path === '/messages' ||
        item.path?.startsWith('/messages')
      ) {
        return true;
      }
      return false;
    }

    // Accounts with laboratory roles can always access Laboratory and Pathology module pages
    if (isLabStaff && (item.path === '/pathology' || item.path === '/lims' || item.path === '/lab')) {
      return true;
    }

    // Accounts with pharmacy roles can always access Pharmacy Dispensary and Pharmacy Inventory module pages
    if (isPharmacist && (
      item.path === '/pharmacy' || item.path?.startsWith('/pharmacy') ||
      item.path === '/inventory' || item.path?.startsWith('/inventory')
    )) {
      return true;
    }

    // Accounts with mortician roles can always access Mortuary & Funeral module pages
    if (isMortician && (item.path === '/mortuary' || item.path?.startsWith('/mortuary'))) {
      return true;
    }

    // Standalone Patient Scans & Imaging is strictly for Doctors and Nurses;
    // Hide from Radiology staff who already have PACS & DICOM Viewer under the Radiology department menu
    if (item.path === '/radiology/pacs' && isUserRadiologyStaff(user)) {
      return false;
    }

    // Accounts with radiology roles can always access Radiology department module
    if (isRadiologist && (item.text === 'Radiology' || ((item.path === '/radiology' || item.path === '/radiology/orders') && item.children))) {
      return true;
    }

    // Accounts with physiotherapy roles can always access Physiotherapy & Rehab module pages
    if (isPhysio && (item.path === '/rehabilitation' || item.path?.startsWith('/rehabilitation') || item.path === '/physiotherapy' || item.path?.startsWith('/physiotherapy'))) {
      return true;
    }

    // Accounts with cashier roles can always access Billing & Cashier Desk module pages
    if (isCashier && (item.path === '/billing' || item.path?.startsWith('/billing'))) {
      return true;
    }

    // ── Internal Auditor: MUST be checked FIRST before generic finance/staff rules ─────────────────
    // Allowed: Dashboard, Finance Management (read), Audit Logs, Timesheets (read), Leave (read), Messages
    // NOT allowed: Staff Management, Internal Requests, Reports, Assets, Billing, Pharmacy, Inventory
    if (isPureAuditorStaff) {
      if (
        item.path === '/' ||
        item.path === '/financial-audit' ||
        item.path === '/audit-logs' ||
        item.path?.startsWith('/audit-logs') ||
        item.path === '/finance' ||
        item.path?.startsWith('/finance') ||
        item.path === '/timesheets' ||
        item.path?.startsWith('/timesheets') ||
        item.path === '/leave' ||
        item.path?.startsWith('/leave') ||
        item.path === '/messages' ||
        item.path?.startsWith('/messages')
      ) {
        return true;
      }
      return false;
    }

    // Accounts with finance/accountant roles can always access Finance Management
    if (isFinanceStaff && (
      item.path === '/finance' || item.path?.startsWith('/finance') ||
      item.path === '/budgets' || item.path === '/financial-audit'
    )) {
      return true;
    }

    // Accounts with insurance / HMO roles can always access Insurance HMO module pages
    if (isInsuranceStaff && (item.path === '/insurance-portal' || item.path?.startsWith('/insurance-portal'))) {
      return true;
    }

    // Strict restriction for Finance / Accountant roles: only Dashboard, Workforce & Roster, Finance Management, and Messages allowed
    // NOT allowed: Staff Management, Internal Requests, Reports, Assets, Billing
    if (isPureFinanceStaff) {
      if (
        item.path === '/' ||
        item.path === '/finance' ||
        item.path?.startsWith('/finance') ||
        item.path === '/budgets' ||
        item.path === '/financial-audit' ||
        item.path === '/timesheets' ||
        item.path?.startsWith('/timesheets') ||
        item.path === '/messages' ||
        item.path?.startsWith('/messages')
      ) {
        return true;
      }
      return false;
    }

    // Strict restriction for Insurance / HMO roles: only Dashboard, Insurance HMO, Messages allowed
    if (isPureInsuranceStaff) {
      if (
        item.path === '/' ||
        item.path === '/insurance-portal' ||
        item.path?.startsWith('/insurance-portal') ||
        item.path === '/messages' ||
        item.path?.startsWith('/messages')
      ) {
        return true;
      }
      return false;
    }

    // Strict restriction for Pharmacy roles: only Dashboard, Pharmacy Dispensary, and Pharmacy Inventory allowed
    if (isPurePharmacyStaff) {
      if (
        item.path === '/' ||
        item.path === '/pharmacy' ||
        item.path?.startsWith('/pharmacy') ||
        item.path === '/inventory' ||
        item.path?.startsWith('/inventory') ||
        item.path === '/timesheets' ||
        item.path?.startsWith('/timesheets') ||
        item.path === '/messages' ||
        item.path?.startsWith('/messages') ||
        item.path === '/reports' ||
        item.path?.startsWith('/reports')
      ) {
        return true;
      }
      return false;
    }

    // Strict restriction for Mortician roles: only Dashboard and Mortuary & Funeral allowed
    if (isPureMorticianStaff) {
      if (
        item.path === '/' ||
        item.path === '/mortuary' ||
        item.path?.startsWith('/mortuary')
      ) {
        return true;
      }
      return false;
    }

    // Strict restriction for Radiology / Radiographer roles: only Dashboard and Radiology allowed
    if (isPureRadiologyStaff) {
      if (item.path === '/radiology/pacs') {
        return false;
      }
      if (
        item.path === '/' ||
        item.text === 'Radiology' ||
        item.path === '/radiology' ||
        item.path === '/radiology/orders'
      ) {
        return true;
      }
      return false;
    }

    // Strict restriction for Physiotherapy role: only Dashboard and Physiotherapy & Rehab allowed
    if (isPurePhysioStaff) {
      if (
        item.path === '/' ||
        item.path === '/rehabilitation' ||
        item.path?.startsWith('/rehabilitation') ||
        item.path === '/physiotherapy' ||
        item.path?.startsWith('/physiotherapy')
      ) {
        return true;
      }
      return false;
    }

    // Check if user is a Clinician / Doctor
    const doctorTitles = ['Doctor', 'Senior Consultant', 'Chief Consultant', 'Chief Consultant Physician', 'Consultant', 'Medical Officer', 'Physician', 'Chief Medical Officer', 'CMO', 'GP', 'General Practitioner', 'Specialist', 'Surgeon', 'Intern', 'Attending Physician', 'Resident', 'Clinician'];
    const isDoctorUser = effective.some(d => doctorTitles.includes(d));

    // Hide Radiology and Mortuary modules from Laboratory roles (unless they also hold Doctor/Radiologist/Mortician roles)
    if (isLabStaff && !isSuperAdmin) {
      const isRadiologyStaff = userRole === 'RADIOLOGIST' || userRole === 'RADIOGRAPHER' || user?.roles?.includes('RADIOLOGIST') || user?.roles?.includes('RADIOGRAPHER') || (userDesignation || '').toLowerCase().includes('radiolog') || (userDesignation || '').toLowerCase().includes('radiograph');
      const isMorticianStaff = userRole === 'MORTICIAN' || user?.roles?.includes('MORTICIAN') || (userDesignation || '').toLowerCase().includes('mortician');

      if ((item.path === '/radiology' || item.path?.startsWith('/radiology')) && !isRadiologyStaff && !isDoctorUser) {
        return false;
      }
      if ((item.path === '/mortuary' || item.path?.startsWith('/mortuary')) && !isMorticianStaff && !isDoctorUser) {
        return false;
      }
    }

    // Special condition for OPD Page for Nurses:
    // Nurses are hidden from OPD by default except if an OPD consultation has been assigned to them (e.g. no doctor available)
    if (item.path === '/opd') {
      const isNurseUser = !isDoctorUser && !isSuperAdmin && (user.role?.toUpperCase() === 'NURSE' || user.roles?.includes('NURSE') || (userDesignation || '').toLowerCase().includes('nurse'));
      if (isNurseUser) {
        const hasAssignedOPD = (user as any)?.hasAssignedOPD || localStorage.getItem('nurse_opd_assigned') === 'true';
        if (!hasAssignedOPD) {
          return false;
        }
        return true;
      }
    }

    // Check allowedDesignations first if explicitly defined
    if (item.allowedDesignations) {
      const hasDoctorAllowed = item.allowedDesignations.some(d => doctorTitles.includes(d));

      // If user is a Doctor/Clinician and item specifies allowedDesignations without including Doctor/Clinician,
      // hide non-clinical modules (e.g. Nursing Workspace, Document DMS)
      if (isDoctorUser && !hasDoctorAllowed) {
        return false;
      }

      const isDesignationAllowed = item.allowedDesignations.some((d: string) => effective.includes(d));
      if (isDesignationAllowed) return true;

      return false;
    }

    // Check permissions if specified
    if (item.permission) {
      return checkPermission(item.permission);
    }

    return true;
  });

          if (visibleItems.length === 0) return null;

          return (
            <Box key={group.label} sx={{ mb: 0.25 }}>
              <ListItemButton onClick={() => toggle(group.label)} sx={{ borderRadius: 2, py: 0.4, px: 1.5, '&:hover': { background: 'transparent' } }}>
                <ListItemText
                  primary={group.label.toUpperCase()}
                  primaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.35)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em' } }}
                />
                {open[group.label]
                   ? <ExpandLess sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 15 }} />
                   : <ExpandMore sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 15 }} />}
              </ListItemButton>
              <Collapse in={open[group.label]}>
                <List disablePadding>
                  {visibleItems.map((item: NavItem) => {
                    const active = item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.path);
                    const isSubOpen = openSubItems[item.text] ?? active;

                    return (
                      <Box key={item.text}>
                        <ListItemButton
                          component={NavLink}
                          to={item.path}
                          onClick={(e) => {
                            if (item.children) {
                              setOpenSubItems(prev => ({ ...prev, [item.text]: !isSubOpen }));
                            } else if (isMobile && onMobileClose) {
                              onMobileClose();
                            }
                          }}
                          sx={{
                            borderRadius: '10px', mb: 0.2, py: 0.75, px: 1.5,
                            color: active ? '#fff' : 'rgba(255,255,255,0.75)',
                            background: active
                              ? `linear-gradient(90deg, ${alpha(PRIMARY, 0.9)} 0%, ${alpha('#4c6ef5', 0.8)} 100%)`
                              : 'transparent',
                            boxShadow: active ? '0 4px 12px rgba(59,91,219,0.35)' : 'none',
                            transition: 'all 0.18s ease',
                            '&:hover': {
                              background: active ? undefined : 'rgba(255,255,255,0.07)',
                              color: '#fff',
                            },
                          }}
                        >
                          <ListItemIcon sx={{ color: 'inherit', minWidth: 34, '& svg': { fontSize: 18 } }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.text}
                            primaryTypographyProps={{ sx: { fontSize: '0.83rem', fontWeight: active ? 700 : 500 } }}
                          />
                          {item.children ? (
                            isSubOpen ? (
                              <ExpandLess sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }} />
                            ) : (
                              <ExpandMore sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }} />
                            )
                          ) : active ? (
                            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#748ffc', ml: 0.5 }} />
                          ) : null}
                        </ListItemButton>

                        {/* Sub-category items (Level 2) */}
                        {item.children && (
                          <Collapse in={isSubOpen} timeout="auto" unmountOnExit>
                            <List disablePadding sx={{ ml: 2, pl: 1.2, borderLeft: '1.5px solid rgba(255, 255, 255, 0.15)' }}>
                              {(item.text === 'Pharmacy Dispensary' && !isPharmacist && !isSuperAdmin
                                ? item.children.filter((sub: SubNavItem) => sub.path === '/pharmacy/queue')
                                : item.text === 'Laboratory' && !isLabStaff && !isSuperAdmin
                                ? item.children.filter((sub: SubNavItem) => sub.path === '/lims/orders')
                                : item.text === 'Radiology' && !isRadiologist && !isSuperAdmin
                                ? item.children.filter((sub: SubNavItem) => sub.path === '/radiology/orders')
                                : item.children.filter((sub: SubNavItem) => !sub.moduleKey || config[sub.moduleKey] !== false)
                              ).map((sub: SubNavItem) => {
                                const isChildActive =
                                  location.pathname === sub.path ||
                                  location.pathname.startsWith(sub.path + '/') ||
                                  (sub.path === '/pharmacy/queue' && (location.pathname === '/pharmacy' || location.pathname === '/pharmacy/')) ||
                                  (sub.path === '/lims/orders' && (location.pathname === '/lims' || location.pathname === '/lims/')) ||
                                  (sub.path === '/pathology/histology' && (location.pathname === '/pathology' || location.pathname === '/pathology/')) ||
                                  (sub.path === '/nursing/dashboard' && (location.pathname === '/nursing' || location.pathname === '/nursing/')) ||
                                  (sub.path === '/radiology/orders' && (location.pathname === '/radiology' || location.pathname === '/radiology/')) ||
                                  (sub.path === '/blood-bank/donors' && (location.pathname === '/blood-bank' || location.pathname === '/blood-bank/')) ||
                                  (sub.path === '/theatre/schedules' && (location.pathname === '/theatre' || location.pathname === '/theatre/')) ||
                                  (sub.path === '/ipd/icu/beds' && (location.pathname === '/ipd/icu' || location.pathname === '/ipd/icu/' || location.pathname === '/icu')) ||
                                  (sub.path === '/ipd/emergency/triage' && (location.pathname === '/ipd/emergency' || location.pathname === '/ipd/emergency/' || location.pathname === '/emergency')) ||
                                  (sub.path === '/ipd/maternity' && (location.pathname === '/ipd/maternity' || location.pathname === '/maternity/beds')) ||
                                  (sub.path === '/maternity/anc' && (location.pathname === '/maternity' || location.pathname === '/maternity/')) ||
                                  (sub.path === '/rehabilitation/sessions' && (location.pathname === '/rehabilitation' || location.pathname === '/rehabilitation/')) ||
                                  (sub.path === '/mortuary/ingestion' && (location.pathname === '/mortuary' || location.pathname === '/mortuary/')) ||
                                  (sub.path === '/billing/billing' && (location.pathname === '/billing' || location.pathname === '/billing/')) ||
                                  (sub.path === '/insurance-portal/claims' && (location.pathname === '/insurance-portal' || location.pathname === '/insurance-portal/')) ||
                                  (sub.path === '/finance/ledger' && (location.pathname === '/finance' || location.pathname === '/finance/')) ||
                                  (sub.path === '/assets/register' && (location.pathname === '/assets' || location.pathname === '/assets/')) ||
                                  (sub.path === '/security-iam/credentials' && (location.pathname === '/security-iam' || location.pathname === '/security-iam/')) ||
                                  (sub.path === '/architecture/layers' && (location.pathname === '/architecture' || location.pathname === '/architecture/')) ||
                                  (sub.path === '/reports/clinical' && (location.pathname === '/reports' || location.pathname === '/reports/')) ||
                                  (sub.path === '/analytics/overview' && (location.pathname === '/analytics' || location.pathname === '/analytics/')) ||
                                  (sub.path === '/messages/chat' && (location.pathname === '/messages' || location.pathname === '/messages/')) ||
                                  (sub.path === '/timesheets' && (location.pathname === '/timesheets' || location.pathname === '/timesheet' || location.pathname === '/staff/attendance-roster/timesheets'));
                                const isSubSubOpen = openSubItems[sub.text] ?? isChildActive;

                                return (
                                  <Box key={sub.text}>
                                    <ListItemButton
                                      component={NavLink}
                                      to={sub.path}
                                      onClick={(e) => {
                                        if (sub.children) {
                                          setOpenSubItems(prev => ({ ...prev, [sub.text]: !isSubSubOpen }));
                                        } else if (isMobile && onMobileClose) {
                                          onMobileClose();
                                        }
                                      }}
                                      sx={{
                                        borderRadius: '8px',
                                        mb: 0.2,
                                        py: 0.5,
                                        px: 1.2,
                                        position: 'relative',
                                        color: isChildActive ? '#60a5fa' : 'rgba(255,255,255,0.7)',
                                        background: isChildActive ? 'rgba(96, 165, 250, 0.12)' : 'transparent',
                                        borderLeft: isChildActive ? '3px solid #60a5fa' : '3px solid transparent',
                                        transition: 'all 0.15s ease',
                                        '&:hover': {
                                          background: 'rgba(255,255,255,0.06)',
                                          color: '#fff',
                                        },
                                      }}
                                    >
                                      {/* Horizontal connecting line to level 1 parent guide */}
                                      <Box
                                        sx={{
                                          position: 'absolute',
                                          left: -10,
                                          top: '50%',
                                          width: 7,
                                          height: '1.5px',
                                          bgcolor: isChildActive ? '#60a5fa' : 'rgba(255, 255, 255, 0.2)',
                                        }}
                                      />
                                      <ListItemIcon sx={{ color: 'inherit', minWidth: 24, '& svg': { fontSize: 15 } }}>
                                        {sub.icon}
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={sub.text}
                                        primaryTypographyProps={{
                                          sx: {
                                            fontSize: '0.76rem',
                                            fontWeight: isChildActive ? 700 : 500,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                          },
                                        }}
                                      />
                                      {sub.children ? (
                                        isSubSubOpen ? (
                                          <ExpandLess sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }} />
                                        ) : (
                                          <ExpandMore sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }} />
                                        )
                                      ) : null}
                                    </ListItemButton>

                                    {/* Level 3 Sub-sub-category items */}
                                    {sub.children && (
                                      <Collapse in={isSubSubOpen} timeout="auto" unmountOnExit>
                                        <List disablePadding sx={{ ml: 1.5, pl: 1.2, borderLeft: '1.5px solid rgba(96, 165, 250, 0.35)' }}>
                                          {sub.children.map((leaf: SubSubNavItem) => {
                                            const isLeafActive =
                                              location.pathname === leaf.path ||
                                              (leaf.path === '/inventory/master/catalogue' &&
                                                (location.pathname === '/inventory' || location.pathname === '/inventory/master')) ||
                                              (leaf.path === '/billing/billing' &&
                                                (location.pathname === '/billing' || location.pathname === '/billing/')) ||
                                              (leaf.path === '/billing/billing/refunds' &&
                                                (location.pathname === '/billing/cashier/refunds')) ||
                                              (leaf.path === '/assets/register/registry' &&
                                                (location.pathname === '/assets' || location.pathname === '/assets/register')) ||
                                              (leaf.path === '/staff/records/directory' &&
                                                (location.pathname === '/staff' || location.pathname === '/staff/records'));

                                            return (
                                              <ListItemButton
                                                key={leaf.text}
                                                component={NavLink}
                                                to={leaf.path}
                                                onClick={() => {
                                                  if (isMobile && onMobileClose) {
                                                    onMobileClose();
                                                  }
                                                }}
                                                sx={{
                                                  borderRadius: '6px',
                                                  mb: 0.1,
                                                  py: 0.35,
                                                  px: 1.2,
                                                  position: 'relative',
                                                  color: isLeafActive ? '#93c5fd' : 'rgba(255,255,255,0.65)',
                                                  background: isLeafActive ? 'rgba(147, 197, 253, 0.15)' : 'transparent',
                                                  transition: 'all 0.15s ease',
                                                  '&:hover': {
                                                    background: 'rgba(255,255,255,0.05)',
                                                    color: '#fff',
                                                  },
                                                }}
                                              >
                                                {/* Horizontal branch connector to level 2 parent line */}
                                                <Box
                                                  sx={{
                                                    position: 'absolute',
                                                    left: -10,
                                                    top: '50%',
                                                    width: 7,
                                                    height: '1.5px',
                                                    bgcolor: isLeafActive ? '#60a5fa' : 'rgba(96, 165, 250, 0.35)',
                                                  }}
                                                />
                                                <Box
                                                  sx={{
                                                    width: 5,
                                                    height: 5,
                                                    borderRadius: '50%',
                                                    bgcolor: isLeafActive ? '#60a5fa' : 'rgba(255,255,255,0.4)',
                                                    mr: 1.2,
                                                    flexShrink: 0,
                                                  }}
                                                />
                                                <ListItemText
                                                  primary={leaf.text}
                                                  primaryTypographyProps={{
                                                    sx: {
                                                      fontSize: '0.71rem',
                                                      fontWeight: isLeafActive ? 700 : 400,
                                                      whiteSpace: 'nowrap',
                                                      overflow: 'hidden',
                                                      textOverflow: 'ellipsis',
                                                    },
                                                  }}
                                                />
                                              </ListItemButton>
                                            );
                                          })}
                                        </List>
                                      </Collapse>
                                    )}
                                  </Box>
                                );
                              })}
                            </List>
                          </Collapse>
                        )}
                      </Box>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </Box>
      
      {/* Bottom user */}
      <Box sx={{ px: 2.5, py: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar 
            src={user?.profilePicture || undefined} 
            sx={{ width: 32, height: 32, bgcolor: alpha(PRIMARY, 0.8), fontSize: '0.8rem' }}
          >
            {initials}
          </Avatar>
          <Box>
            <Typography sx={{ color: '#fff', fontSize: '0.78rem', fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user ? `${user.firstName} ${user.lastName}` : 'Guest User'}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user ? (userDesignation || user.roles?.[0] || user.role) : 'Visitor'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: SIDEBAR_W,
            border: 'none',
            background: 'none',
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        width: SIDEBAR_W,
        minHeight: '100vh',
        position: 'fixed',
        left: 0, top: 0, bottom: 0,
        flexDirection: 'column',
        zIndex: 1200,
      }}
    >
      {sidebarContent}
    </Box>
  );
};

export default Sidebar;
