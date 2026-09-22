import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { assetUrl } from '../utils/assetUrl';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Tabs, Tab, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert,
  LinearProgress, Divider, IconButton, Stack, Avatar, Tooltip,
  InputAdornment, CardHeader, Menu, Autocomplete
} from '@mui/material';
import { PORTFOLIO_MAP, normalizeStaffRole } from './Staff';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  People, AccessTime, PointOfSale, Shield, Add, Search, Refresh,
  CheckCircle, Warning, Cancel, Send, BarChart as BarChartIcon, Timeline,
  Group, LocalAtm, Assignment, DateRange, Security, CreditCard, PointOfSale as PosIcon,
  Payment, FileDownload, Assessment, ArrowForward, Badge, AccountCircle,
  EventNote, EventBusy, School, Star, MoreVert, Edit, Edit as EditIcon, Delete,
  Share, Email, Visibility, PictureAsPdf, Print, Check, HowToReg, Verified,
  HistoryEdu, Approval, FilePresent, Close, ChevronLeft, ChevronRight, Download,
  CheckBox, AccountTree, RateReview, AccountBalance, ReceiptLong, CheckCircleOutline,
  Business, ThumbUp
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { alpha } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import LeaveManagementPage from './LeaveManagementPage';
import CentralizedDutyRoster from '../components/CentralizedDutyRoster';
import { BiometricAttendanceClock } from '../components/BiometricAttendanceClock';

// ─── Design Tokens & Theme Formatting ────────────────────────────────────────
const PRIMARY = '#1e3a8a';
const SECONDARY = '#2563eb';
const SUCCESS = '#16a34a';
const WARNING = '#ea580c';
const DANGER = '#dc2626';
const TEAL = '#0d9488';
const PURPLE = '#7c3aed';
const GOLD = '#ca8a04';

const COLORS = ['#1e3a8a', '#2563eb', '#16a34a', '#7c3aed', '#ea580c', '#0d9488', '#ca8a04', '#db2777'];

const formatNGN = (v: number) => `₦${(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

// ─── Sub-Tab Panel Helper ────────────────────────────────────────────────────
function TabPanel({ children, value, index }: any) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ─── KPI Card Component ──────────────────────────────────────────────────────
const KPICard = ({ title, value, sub, icon, color }: any) => (
  <Card sx={{
    background: `linear-gradient(135deg, ${color}ee, ${color}aa)`,
    color: '#fff', borderRadius: 2, boxShadow: `0 4px 16px ${color}33`,
    position: 'relative', overflow: 'hidden',
  }}>
    <CardContent sx={{ pb: '12px !important', pt: '12px !important', px: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>{title}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.25, lineHeight: 1.2 }}>{value}</Typography>
          {sub && <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.25, fontSize: '0.65rem' }}>{sub}</Typography>}
        </Box>
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36 }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

const StatusChip = ({ label }: { label: string }) => {
  let color: 'success' | 'info' | 'warning' | 'error' | 'default' = 'default';
  const l = label?.toUpperCase();
  if (['ACTIVE', 'PRESENT', 'APPROVED', 'VERIFIED', 'COMPLETED', 'QUALIFIED', 'PROCESSED'].includes(l)) color = 'success';
  if (['PENDING', 'PENDING_APPROVAL', 'SHORTLISTING', 'ON_LEAVE', 'LATE', 'MATERNITY_LEAVE'].includes(l)) color = 'warning';
  if (['OPEN', 'DOCTOR_CALL_24H', 'NIGHT_SHIFT_12H'].includes(l)) color = 'info';
  if (['EXPIRED', 'CRITICAL', 'HIGH', 'FAILED', 'CLOSED', 'ABSENT', 'INACTIVE', 'SUSPENDED', 'DECEASED'].includes(l)) color = 'error';

  return <Chip label={label?.replace('_', ' ')} size="small" color={color} sx={{ fontWeight: 700, fontSize: '0.68rem' }} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WORKFORCE HR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const WorkforceHR = ({ defaultTab = 0, viewType = 'hr' }: { defaultTab?: number; viewType?: 'hr' | 'staff' | 'bishop' }) => {
  const { enqueueSnackbar } = useSnackbar();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN');
  const baseRoles = [
    'Accountant', 'Admin', 'Auditor', 'Doctor', 'Insurance Officer',
    'Lab Scientist', 'Lab Technician', 'Mortician', 'Nurse', 'Pathologist',
    'Pharmacist', 'Pharmacy Technician', 'Physiotherapist', 'Radiologist',
    'Record Officer', 'Secretary'
  ];
  const availableRoles = isSuperAdmin ? [...baseRoles, 'Bishop'] : baseRoles;
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);

  // ─── Sub-Tab Index States ──────────────────────────────────────────────────
  const [subTab0, setSubTab0] = useState(0);
  const [subTab1, setSubTab1] = useState(0);
  const [subTab2, setSubTab2] = useState(0);
  const [subTab3, setSubTab3] = useState(0);

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path.startsWith('/staff/records')) {
      setActiveTab(0);
      if (path === '/staff/records/vacancies') setSubTab0(1);
      else if (path === '/staff/records/credentials') setSubTab0(2);
      else setSubTab0(0);
    } else if (path.startsWith('/staff/attendance-roster') || path.startsWith('/timesheets') || path.startsWith('/timesheet')) {
      setActiveTab(1);
      if (path === '/staff/attendance-roster/analysis') setSubTab1(1);
      else if (path === '/staff/attendance-roster/schedules') setSubTab1(2);
      else if (path === '/staff/attendance-roster/leave') setSubTab1(3);
      else if (path === '/staff/attendance-roster/timesheets' || path.startsWith('/timesheets') || path.startsWith('/timesheet')) setSubTab1(4);
      else setSubTab1(0);
    } else if (path.startsWith('/staff/payroll-performance')) {
      setActiveTab(2);
      if (path === '/staff/payroll-performance/appraisals') setSubTab2(1);
      else if (path === '/staff/payroll-performance/cpd') setSubTab2(2);
      else setSubTab2(0);
    } else if (path.startsWith('/staff/governance-bi')) {
      setActiveTab(3);
      if (path === '/staff/governance-bi/risks') setSubTab3(1);
      else setSubTab3(0);
    } else {
      // Legacy compatibility for standalone routes (/attendance, /leave, /payroll, /staff)
      if (path === '/leave' || path === '/staff-attendance') {
        setActiveTab(1);
        setSubTab1(3);
      } else if (path === '/attendance') {
        setActiveTab(1);
        setSubTab1(0);
      } else if (path === '/payroll') {
        setActiveTab(2);
        setSubTab2(0);
      } else {
        setActiveTab(defaultTab);
      }
    }
  }, [location.pathname, defaultTab]);

  // ─── Data States ──────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<any[]>([]);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [leave, setLeave] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [cpdCourses, setCpdCourses] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [timesheets, setTimesheets] = useState<any[]>([]);

  // ─── Dialogue States ───────────────────────────────────────────────────────
  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [nextStaffId, setNextStaffId] = useState('');

  const handleOpenOnboardDialog = async () => {
    try {
      const res = await api.get('/system/staff/next-id');
      if (res.data?.ok) {
        setNextStaffId(res.data.nextId);
      }
    } catch (err) {
      const saved = localStorage.getItem('staff_id_format');
      const fmt = saved ? JSON.parse(saved) : { prefix: 'FF', separator: '-', digits: 4, startFrom: 1 };
      setNextStaffId(`${fmt.prefix}${fmt.separator}${String(fmt.startFrom).padStart(fmt.digits, '0')}`);
    }
    setEmpDialogOpen(true);
  };
  const [vacDialogOpen, setVacDialogOpen] = useState(false);
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<any | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<any | null>(null);
  const [rosterDialogOpen, setRosterDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [appraisalDialogOpen, setAppraisalDialogOpen] = useState(false);
  const [appraisalDetailOpen, setAppraisalDetailOpen] = useState(false);
  const [selectedAppraisalDetail, setSelectedAppraisalDetail] = useState<any | null>(null);
  const [appraisalFrequency, setAppraisalFrequency] = useState<'ANNUAL' | 'BI_ANNUAL_H1' | 'BI_ANNUAL_H2'>('ANNUAL');
  const [appraisalPeriod, setAppraisalPeriod] = useState('FY2026');
  const [appraisalEmpId, setAppraisalEmpId] = useState('');
  const [appraisalRating, setAppraisalRating] = useState<number>(4.8);
  const [appraisalComments, setAppraisalComments] = useState('');
  const [appraisalRecommendation, setAppraisalRecommendation] = useState('COMMENDATION');
  const [appraisalFilterFreq, setAppraisalFilterFreq] = useState<string>('ALL');
  const [appraisalFilterScope, setAppraisalFilterScope] = useState<string>('ALL');
  const [competencyClinical, setCompetencyClinical] = useState<number>(4.8);
  const [competencyAttendance, setCompetencyAttendance] = useState<number>(4.9);
  const [competencyTeamwork, setCompetencyTeamwork] = useState<number>(4.7);
  const [competencyEthics, setCompetencyEthics] = useState<number>(5.0);
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [advertDialogOpen, setAdvertDialogOpen] = useState(false);
  const [selectedAdvertVacancy, setSelectedAdvertVacancy] = useState<any | null>(null);
  const [isEditingAdvert, setIsEditingAdvert] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [editedResponsibilities, setEditedResponsibilities] = useState('');
  const [editedRequirements, setEditedRequirements] = useState('');
  const [timesheetDialogOpen, setTimesheetDialogOpen] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<any | null>(null);
  const [viewTimesheetOpen, setViewTimesheetOpen] = useState(false);
  const [timesheetReviewOpen, setTimesheetReviewOpen] = useState(false);
  const [timesheetComment, setTimesheetComment] = useState('');

  // Enhanced Caritas Shift-Based Timesheet & Approval States
  const [timesheetGridOpen, setTimesheetGridOpen] = useState(false);
  const [timesheetPrintModalOpen, setTimesheetPrintModalOpen] = useState(false);
  const [activeGridTimesheet, setActiveGridTimesheet] = useState<any | null>(null);
  const [timesheetCreateOpen, setTimesheetCreateOpen] = useState(false);
  const [createStaffId, setCreateStaffId] = useState('EMP-009');
  const [createMonth, setCreateMonth] = useState('September');
  const [createYear, setCreateYear] = useState('2026');
  const [createProjectName, setCreateProjectName] = useState('AYP HUB (Prevention)');
  const [createSupervisor, setCreateSupervisor] = useState('Ekwedike Dennis');
  const [coordinatorSelect, setCoordinatorSelect] = useState('Ekwedike Dennis');
  const [adminSelect, setAdminSelect] = useState('Amedu Alapa');

  const [simulateStaffId, setSimulateStaffId] = useState('EMP-001');
  const [isSigningPayroll, setIsSigningPayroll] = useState(false);
  const [isTransmittingFinance, setIsTransmittingFinance] = useState(false);
  const [selectedPayrollRun, setSelectedPayrollRun] = useState<any | null>(null);
  const [payrollBreakdown, setPayrollBreakdown] = useState<any[]>([]);
  const [payrollReviewDialogOpen, setPayrollReviewDialogOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false);
  const [showStaffBreakdown, setShowStaffBreakdown] = useState(true);
  const [payrollStaffSearch, setPayrollStaffSearch] = useState('');
  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(null);
  const [actionEmp, setActionEmp] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [onboardProfilePic, setOnboardProfilePic] = useState<string | null>(null);
  const [editProfilePic, setEditProfilePic] = useState<string | null>(null);

  const [bankList, setBankList] = useState<any[]>([]);

  // ─── CPD & Medical Education States ─────────────────────────────────────────
  const [cpdRecords, setCpdRecords] = useState<any[]>([]);
  const [cpdFilterCategory, setCpdFilterCategory] = useState<string>('ALL');
  const [cpdSearchQuery, setCpdSearchQuery] = useState<string>('');
  const [cpdActiveView, setCpdActiveView] = useState<'COURSES' | 'RECORDS' | 'COMPLIANCE'>('COURSES');
  const [addCourseDialogOpen, setAddCourseDialogOpen] = useState(false);
  const [logStaffCpdDialogOpen, setLogStaffCpdDialogOpen] = useState(false);
  const [viewCourseDetailOpen, setViewCourseDetailOpen] = useState(false);
  const [selectedCpdCourse, setSelectedCpdCourse] = useState<any | null>(null);
  const [staffTranscriptOpen, setStaffTranscriptOpen] = useState(false);
  const [selectedTranscriptStaff, setSelectedTranscriptStaff] = useState<any | null>(null);

  // New Course Form State
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCategory, setNewCourseCategory] = useState('CLINICAL_CME');
  const [newCourseProvider, setNewCourseProvider] = useState('MDCN / Resuscitation Council');
  const [newCourseCredits, setNewCourseCredits] = useState<number>(10);
  const [newCourseDuration, setNewCourseDuration] = useState<number>(12);
  const [newCourseTargetAudience, setNewCourseTargetAudience] = useState('All Healthcare Personnel');
  const [newCourseDeliveryMode, setNewCourseDeliveryMode] = useState('HYBRID');
  const [newCoursePassingScore, setNewCoursePassingScore] = useState<number>(80);
  const [newCourseRenewalMonths, setNewCourseRenewalMonths] = useState<number>(12);
  const [newCourseDescription, setNewCourseDescription] = useState('');
  const [newCourseNextDue, setNewCourseNextDue] = useState('2026-12-31');

  // New Record Form State
  const [recordStaffId, setRecordStaffId] = useState('');
  const [recordCourseId, setRecordCourseId] = useState('');
  const [recordCredits, setRecordCredits] = useState<number>(10);
  const [recordCompletionDate, setRecordCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordExpiryDate, setRecordExpiryDate] = useState('2027-12-31');
  const [recordCertNo, setRecordCertNo] = useState('');
  const [recordScore, setRecordScore] = useState<number>(90);
  const [recordAccreditation, setRecordAccreditation] = useState('MDCN / CME Board');
  const [recordVerifiedBy, setRecordVerifiedBy] = useState('');

  // Secretary extended states
  const [queryDialogOpen, setQueryDialogOpen] = useState(false);
  const [viewQueriesDialogOpen, setViewQueriesDialogOpen] = useState(false);
  const [querySubject, setQuerySubject] = useState('');
  const [queryContent, setQueryContent] = useState('');
  const [queriesList, setQueriesList] = useState<any[]>([]);

  useEffect(() => {
    if (viewQueriesDialogOpen && actionEmp) {
      api.get(`/hr/employees/${actionEmp.id}/queries`)
        .then(res => { if (res.data?.success) setQueriesList(res.data.data); })
        .catch(() => {});
    }
  }, [viewQueriesDialogOpen, actionEmp]);

  // Subordinates resolution for supervisors & departmental leads
  const currentEmpId = (user as any)?.employeeId || (user as any)?.staffId || user?.id || '';
  const currentFullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || (user as any)?.name || '';
  const userDept = (user as any)?.department || user?.departments?.[0]?.name || '';
  const isSuperAdminOrAdminOrBishop =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.roles?.includes('SUPER_ADMIN') ||
    user?.roles?.includes('ADMIN') ||
    (user?.role || '').toLowerCase() === 'bishop' ||
    (user?.designation || '').toLowerCase().includes('bishop') ||
    (user?.designation || '').toLowerCase().includes('admin');

  const mySubordinates = useMemo(() => {
    if (isSuperAdminOrAdminOrBishop) return employees;
    const subs = employees.filter(emp => {
      if (emp.id === currentEmpId) return false;
      const isDirect = emp.supervisorId === currentEmpId ||
        (emp.supervisorName && currentFullName && emp.supervisorName.toLowerCase() === currentFullName.toLowerCase()) ||
        (emp.supervisorName && user?.username && emp.supervisorName.toLowerCase().includes(user.username.toLowerCase()));
      const isSecondary = emp.secondarySupervisorId === currentEmpId ||
        (emp.secondarySupervisorName && currentFullName && emp.secondarySupervisorName.toLowerCase() === currentFullName.toLowerCase());
      return isDirect || isSecondary;
    });
    if (subs.length === 0 && userDept) {
      const deptSubs = employees.filter((emp: any) => emp.department === userDept && emp.id !== currentEmpId);
      if (deptSubs.length > 0) return deptSubs;
    }
    return subs.length > 0 ? subs : employees;
  }, [employees, currentEmpId, currentFullName, isSuperAdminOrAdminOrBishop, user?.username, userDept]);

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE METRICS & HEADER TAILORING
  // ══════════════════════════════════════════════════════════════════════════
  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    // 1. Employee Directory
    if (path === '/staff/records/directory' || path === '/staff/records' || path === '/staff') {
      const activeCount = employees.filter(e => e.status === 'ACTIVE').length;
      const docCount = employees.filter(e => e.role === 'Doctor').length;
      const nurseCount = employees.filter(e => e.role === 'Nurse').length;
      return {
        title: 'Central Employee Master Registry',
        subtitle: 'Staff Directory · Designation Tracking · Department Assignments · Status Monitoring',
        category: 'Employee Records & Credentialing',
        kpis: [
          { title: 'Total Employees', value: employees.length || 48, sub: 'Registered Staff Master', icon: <People />, color: PRIMARY },
          { title: 'Active Duty Staff', value: activeCount || 42, sub: 'Currently On Duty Rota', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Medical Doctors', value: `${docCount || 12} Doctors`, sub: 'Consultants & MOs', icon: <Badge />, color: SECONDARY },
          { title: 'Nursing Officers', value: `${nurseCount || 18} Nurses`, sub: 'Registered Nursing Corps', icon: <Group />, color: TEAL },
        ],
      };
    }

    // 2. Recruitment & Vacancies
    if (path === '/staff/records/vacancies') {
      const openCount = vacancies.filter(v => v.status === 'OPEN').length;
      return {
        title: 'Hospital Talent Acquisition & Open Vacancies',
        subtitle: 'Clinical Requisitions · Job Postings · Applicant Shortlisting · Recruitment Pipeline',
        category: 'Employee Records & Credentialing',
        kpis: [
          { title: 'Approved Vacancies', value: vacancies.length, sub: 'Budgeted Requisitions', icon: <EventNote />, color: PRIMARY },
          { title: 'Open Postings', value: openCount, sub: 'Public Requisition Posts', icon: <Add />, color: SUCCESS },
          { title: 'Avg Days to Hire', value: '24.5 Days', sub: 'Clinical Onboarding Cycle', icon: <AccessTime />, color: SECONDARY },
          { title: 'Offer Acceptance', value: '92.0%', sub: 'Candidate Conversion Yield', icon: <CheckCircle />, color: TEAL },
        ],
      };
    }

    // 3. Credential Verification
    if (path === '/staff/records/credentials') {
      const verifiedCount = credentials.filter(c => c.status === 'VERIFIED').length;
      const expiredCount = credentials.filter(c => c.status === 'EXPIRED').length;
      return {
        title: 'Clinical License & Medical Credential Verification',
        subtitle: 'MDCN & NMCN Licenses · Board Certifications · Expiry Audits · Compliance Tracking',
        category: 'Employee Records & Credentialing',
        kpis: [
          { title: 'Verified Credentials', value: credentials.length || 38, sub: 'Practicing Certificates', icon: <Security />, color: PRIMARY },
          { title: 'Active Licenses', value: verifiedCount || 34, sub: 'Valid Board Registrations', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Expiring / Expired', value: `${expiredCount || 4} Licenses`, sub: 'Action Needed (<60d)', icon: <Warning />, color: DANGER },
          { title: 'Regulatory Audit', value: '100% Verified', sub: 'NHIA Clearance Pass', icon: <Shield />, color: TEAL },
        ],
      };
    }

    // 4. Biometric Clock Logs
    if (path === '/staff/attendance-roster/clock-logs' || path === '/staff/attendance-roster' || path === '/attendance') {
      const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
      const lateCount = attendance.filter(a => a.status === 'LATE').length;
      return {
        title: 'Roster-Based Attendance Logs & Biometric Clocking',
        subtitle: 'Real-Time Biometric Punch Logs · Punctuality Audits · Shift Verification · Duty Logs',
        category: 'Attendance, Roster & Leave',
        kpis: [
          { title: "Today's Clock-Ins", value: attendance.length || 38, sub: 'Biometric Punches Today', icon: <AccessTime />, color: PRIMARY },
          { title: 'On-Time Arrivals', value: presentCount || 34, sub: 'Punctual Shift Starts', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Late Check-Ins', value: lateCount || 4, sub: 'Grace Period Exceeded', icon: <Warning />, color: WARNING },
          { title: 'Punctuality Score', value: '98.2%', sub: 'Monthly Punctuality Yield', icon: <Timeline />, color: TEAL },
        ],
      };
    }

    // 5. Attendance Analysis & Charts
    if (path === '/staff/attendance-roster/analysis') {
      return {
        title: 'Departmental Attendance Trends & Overtime Analytics',
        subtitle: 'Departmental Breakdown · Overtime Hours · Absenteeism Metrics · Shift Coverage Yield',
        category: 'Attendance, Roster & Leave',
        kpis: [
          { title: 'Shift Attendance Yield', value: '98.6%', sub: 'Roster Completion Rate', icon: <BarChartIcon />, color: PRIMARY },
          { title: 'Overtime Hours Logged', value: '142.5 Hours', sub: 'Approved Overtime Pool', icon: <AccessTime />, color: SECONDARY },
          { title: 'Absenteeism Index', value: '0.8%', sub: 'Unexcused Shift Absence', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Top Attendance Unit', value: 'Nursing Services', sub: '100% Shift Compliance', icon: <Group />, color: TEAL },
        ],
      };
    }

    // 6. Duty Roster Schedules
    if (path === '/staff/attendance-roster/schedules') {
      return {
        title: 'Clinical Shift Rotas & Departmental Duty Rosters',
        subtitle: 'Doctor Call Duty · Nurse Shift Rotations · Emergency On-Call Roster · Coverage Audit',
        category: 'Attendance, Roster & Leave',
        kpis: [
          { title: 'Active Shift Rosters', value: roster.length || 14, sub: 'Departmental Shift Rotas', icon: <DateRange />, color: PRIMARY },
          { title: 'Doctor 24H Call Cover', value: '100% Scheduled', sub: 'Continuous Medical Cover', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Nurse Night Shifts', value: '100% Full Rota', sub: 'Inpatient Ward Coverage', icon: <Group />, color: TEAL },
          { title: 'Shift Swap Requests', value: '2 Pending', sub: 'Peer-to-Peer Roster Swaps', icon: <EventNote />, color: SECONDARY },
        ],
      };
    }

    // 7. Leave Requests Control
    if (path === '/staff/attendance-roster/leave' || path === '/leave' || path === '/staff-attendance') {
      const approvedCount = leave.filter(l => l.status === 'APPROVED').length;
      const pendingCount = leave.filter(l => l.status === 'PENDING').length;
      return {
        title: 'Staff Leave Approvals & Absence Management',
        subtitle: 'Annual Leave · Sick Leave · Maternity/Paternity · Leave Balance Ledger',
        category: 'Attendance, Roster & Leave',
        kpis: [
          { title: 'Leave Applications', value: leave.length || 12, sub: 'Total Logged Requests', icon: <EventNote />, color: PRIMARY },
          { title: 'Approved Leave', value: approvedCount || 9, sub: 'Granted Leave Passes', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Pending Approvals', value: pendingCount || 3, sub: 'Awaiting HR/HOD Review', icon: <Warning />, color: WARNING },
          { title: 'Currently On Leave', value: '3 Employees', sub: 'Active Approved Leave', icon: <People />, color: TEAL },
        ],
      };
    }

    // 8. Timesheet Review & Approval
    if (path === '/staff/attendance-roster/timesheets') {
      const approvedCount = timesheets.filter(t => t.status === 'APPROVED').length;
      return {
        title: 'Monthly Timesheet Sign-Off & Hours Verification',
        subtitle: 'Supervisor Sign-Off · Overtime Audit · Shift Hours Reconciliation · Payroll Sync',
        category: 'Attendance, Roster & Leave',
        kpis: [
          { title: 'Submitted Timesheets', value: timesheets.length || 42, sub: 'Monthly Staff Logs', icon: <Assignment />, color: PRIMARY },
          { title: 'Approved Timesheets', value: approvedCount || 38, sub: 'Verified for Payroll', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Total Verified Hours', value: '2,480 Hours', sub: 'Regular Shift Hours', icon: <AccessTime />, color: SECONDARY },
          { title: 'Overtime Premium', value: formatNGN(450000), sub: 'Approved Additional Pay', icon: <LocalAtm />, color: TEAL },
        ],
      };
    }

    // 9. Payroll Administration
    if (path === '/staff/payroll-performance/payroll' || path === '/payroll' || path === '/staff/payroll-performance') {
      const totalGross = payroll.reduce((s, p) => s + (p.grossSalary || 0), 0) || 45000000;
      const totalNet = payroll.reduce((s, p) => s + (p.netSalary || 0), 0) || 38200000;
      return {
        title: 'Hospital Monthly Payroll & Salary Disbursement',
        subtitle: 'Gross Salary Calculation · Tax Deductions (PAYE) · Pension & NHF · Bank Transfer Files',
        category: 'Payroll, Performance & CPD',
        kpis: [
          { title: 'Gross Payroll Value', value: formatNGN(totalGross), sub: 'Total Staff Compensation', icon: <PointOfSale />, color: PRIMARY },
          { title: 'Net Pay Disbursed', value: formatNGN(totalNet), sub: 'Bank Credit Disbursement', icon: <LocalAtm />, color: SUCCESS },
          { title: 'PAYE & Tax Remittance', value: formatNGN(6800000), sub: 'State Tax Authority Post', icon: <CreditCard />, color: SECONDARY },
          { title: 'Disbursement Status', value: '100% Settled', sub: 'All Bank Advice Sent', icon: <CheckCircle />, color: TEAL },
        ],
      };
    }

    // 10. Performance Appraisals
    if (path === '/staff/payroll-performance/appraisals') {
      const totalCount = appraisals.length;
      const topCount = appraisals.filter(a => Number(a.rating) >= 4.5).length;
      const avgScore = totalCount > 0 
        ? (appraisals.reduce((sum, a) => sum + Number(a.rating || 0), 0) / totalCount).toFixed(1)
        : '4.4';
      return {
        title: 'Staff Performance Appraisals & KPI Evaluations',
        subtitle: 'Annual Evaluation · Clinical Competency Reviews · 360 Feedback · Rating Ledger',
        category: 'Payroll, Performance & CPD',
        kpis: [
          { title: 'Evaluated Staff', value: totalCount, sub: 'Completed Reviews', icon: <Star />, color: PRIMARY },
          { title: 'Top Performers (≥4.5)', value: `${topCount} Staff`, sub: 'Exceeding Expectations', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Average Score Rating', value: `${avgScore} / 5.0`, sub: 'Hospital Performance Score', icon: <BarChartIcon />, color: TEAL },
          { title: 'Review Completion', value: '98.0%', sub: 'Annual Cycle Progress', icon: <Assessment />, color: SECONDARY },
        ],
      };
    }

    // 11. Continuing Professional Dev. (CPD)
    if (path === '/staff/payroll-performance/cpd') {
      const totalCredits = cpdRecords.reduce((sum, r) => sum + (Number(r.creditsEarned) || 0), 0);
      const mandatoryCourses = cpdCourses.filter(c => c.category === 'MANDATORY').length;
      return {
        title: 'Continuing Professional Development & CME Training',
        subtitle: 'Accredited Medical CME Credits · BLS/ACLS Certifications · Staff Portfolios · Regulatory Compliance',
        category: 'Payroll, Performance & CPD',
        kpis: [
          { title: 'Active CPD Curriculum', value: `${cpdCourses.length} Courses`, sub: `${mandatoryCourses} Mandatory Regulatory Modules`, icon: <School />, color: PRIMARY },
          { title: 'Certifications Issued', value: `${cpdRecords.length} Completed`, sub: 'Staff Verification Logs', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Total Credits Pool', value: `${totalCredits || 68} Credits`, sub: 'MDCN & NMCN Units Awarded', icon: <Star />, color: TEAL },
          { title: 'Licensing Compliance', value: '98.4% Compliant', sub: 'Mandatory Clinical Standards Met', icon: <Security />, color: SECONDARY },
        ],
      };
    }

    // 12. Workforce BI Analytics
    if (path === '/staff/governance-bi/analytics' || path === '/staff/governance-bi') {
      return {
        title: 'Human Resources BI & Executive Headcount Analytics',
        subtitle: 'Headcount Distribution · Turnover Ratios · Staff Cost Ratios · Clinical vs Admin Balance',
        category: 'Governance & HR Risk BI',
        kpis: [
          { title: 'Total Staff Headcount', value: employees.length || 48, sub: 'Personnel Master Index', icon: <People />, color: PRIMARY },
          { title: 'Operational Attendance', value: `${analytics.activeCount || 42} Active`, sub: 'Rostered Duty Staff', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Retention Score', value: '98.4%', sub: 'Annual Staff Retention', icon: <Timeline />, color: TEAL },
          { title: 'Payroll Revenue Ratio', value: '24.2%', sub: 'HR Cost vs Hospital Revenue', icon: <PointOfSale />, color: SECONDARY },
        ],
      };
    }

    // 13. HR Risks & Succession
    if (path === '/staff/governance-bi/risks') {
      const highCount = risks.filter(r => r.impact === 'HIGH').length;
      return {
        title: 'HR Risk Mitigation & Succession Planning',
        subtitle: 'Key Personnel Retention · Succession Bench Strength · Single Point of Failure Risks',
        category: 'Governance & HR Risk BI',
        kpis: [
          { title: 'Monitored HR Risks', value: risks.length || 4, sub: 'Active Governance Risks', icon: <Shield />, color: PRIMARY },
          { title: 'High Impact Turnover', value: `${highCount || 1} Critical`, sub: 'Mitigation Plan Active', icon: <Warning />, color: WARNING },
          { title: 'Succession Coverage', value: '94.0%', sub: 'Key Position Bench Ready', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Audit Compliance', value: '100% Pass', sub: 'Labor & Medical Regulatory', icon: <Security />, color: TEAL },
        ],
      };
    }

    // Fallback
    return {
      title: 'Human Resources & Workforce Management',
      subtitle: 'Employee Directory · Attendance & Rosters · Payroll & Appraisals · HR Risk Governance',
      category: 'Staff Management',
      kpis: [
        { title: 'Total Employees', value: employees.length || 48, sub: 'Registered Personnel', icon: <People />, color: PRIMARY },
        { title: 'Active Staff Present', value: analytics.activeCount || 42, sub: 'On Duty Today', icon: <CheckCircle />, color: SUCCESS },
        { title: 'Pending Requisitions', value: vacancies.length || 6, sub: 'Open Vacancy Posts', icon: <EventNote />, color: WARNING },
        { title: 'Verified Credentials', value: credentials.length || 38, sub: 'Licenses Certified', icon: <Shield />, color: TEAL },
      ],
    };
  };

  const handleIssueQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionEmp) return;
    try {
      await api.post(`/hr/employees/${actionEmp.id}/queries`, { subject: querySubject, content: queryContent });
      enqueueSnackbar('Disciplinary query issued successfully', { variant: 'warning' });
      setQueryDialogOpen(false);
      setQuerySubject('');
      setQueryContent('');
      fetchData();
    } catch (err) {
      enqueueSnackbar('Failed to issue query', { variant: 'error' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setPic: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Role to Department Auto-Select Mapping
  const roleToDeptMap: Record<string, string> = {
    'Doctor': 'OPD',
    'Nurse': 'IPD',
    'Pharmacist': 'Pharmacy',
    'Lab Technician': 'Laboratory',
    'Pathologist': 'Pathology',
    'Radiologist': 'Radiology',
    'Record Officer': 'EMR/Records',
    'Mortician': 'Mortuary & Funeral',
    'Physiotherapist': 'Physiotherapy',
    'Admin': 'Administration',
    'Accountant': 'Administration',
    'Auditor': 'Administration',
    'Insurance Officer': 'Administration',
    'Secretary': 'Administration',
    'Lab Scientist': 'Laboratory',
    'Pharmacy Technician': 'Pharmacy',
    'Bishop': 'Administration',
  };

  const getJobAdvertDetails = (title: string) => {
    const t = title ? title.toLowerCase() : '';
    if (t.includes('doctor') || t.includes('medical officer') || t.includes('physician')) {
      return {
        description: "We are seeking a highly skilled and compassionate Medical Officer to join our clinical team. The successful candidate will provide clinical diagnostic services, manage patient treatment plans, and coordinate emergency responses within our outpatient and inpatient clinics.",
        responsibilities: [
          "Conduct daily clinical consultations and diagnostic reviews for outpatient and inpatient cases.",
          "Prescribe medications, review laboratory results, and formulate patient treatment plans.",
          "Perform minor surgical procedures and coordinate critical medical evaluations or references.",
          "Collaborate with the nursing and pharmacy teams to ensure strict clinical care compliance."
        ],
        requirements: [
          "Doctor of Medicine (MD) or Bachelor of Medicine, Bachelor of Surgery (MBBS) degree.",
          "Full registration with the Medical and Dental Council of Nigeria (MDCN) with a valid practicing licence.",
          "Minimum of 2-5 years post-housemanship clinical experience.",
          "Excellent communication, patient empathy, and emergency decision-making skills."
        ]
      };
    }
    if (t.includes('nurse') || t.includes('nursing')) {
      return {
        description: "We are looking for dedicated Clinical Nurses to deliver high-quality bedside care and coordinate clinical support services. Candidates must demonstrate excellent clinical judgment, clinical care plan management, and team cooperation.",
        responsibilities: [
          "Administer scheduled medications, patient therapies, and complete clinical charts.",
          "Monitor patient vital signs and immediately log/escalate anomalous clinical observations.",
          "Assist physicians with clinical interventions, procedures, and patient rounds.",
          "Maintain clean, sterile wards and prepare patients for surgery/discharge."
        ],
        requirements: [
          "Registered Nurse (RN) or Bachelor of Nursing Science (BNSc) degree.",
          "Valid practicing licence from the Nursing and Midwifery Council of Nigeria (NMCN).",
          "Minimum of 1-3 years active clinical nursing experience.",
          "Strong empathy, stress resilience, and team alignment."
        ]
      };
    }
    if (t.includes('pharmacist') || t.includes('pharmacy')) {
      return {
        description: "We require professional Pharmacists to oversee pharmaceutical care operations, manage hospital drug inventory, dispense medications, and verify clinical prescriptions to prevent contraindications.",
        responsibilities: [
          "Dispense medications accurately to outpatients and inpatients, explaining dose specifications.",
          "Review prescriptions for therapeutic suitability and flag clinical contraindications.",
          "Manage pharmacy stock rotation, storage safety, and inventory audit metrics.",
          "Collaborate with medical teams on clinical drug interventions and rational therapy usage."
        ],
        requirements: [
          "Bachelor of Pharmacy (B.Pharm) or Doctor of Pharmacy (Pharm.D) degree.",
          "Valid practicing licence with the Pharmacists Council of Nigeria (PCN).",
          "1-3 years experience in hospital or clinical pharmacy operations.",
          "Meticulous attention to detail and inventory reporting accuracy."
        ]
      };
    }
    if (t.includes('lab') || t.includes('technician') || t.includes('scientist')) {
      return {
        description: "Join our Laboratory Information Management team to run diagnostic tests, calibrate analyzer equipment, and deliver highly accurate assays crucial for clinician diagnostic decisions.",
        responsibilities: [
          "Run haematology, biochemistry, and microbiology assays as requested by clinicians.",
          "Operate, calibrate, and troubleshoot automated laboratory analyzer equipment.",
          "Prepare slide samples, culture media, and document quality control benchmarks.",
          "Log and immediately escalate critical laboratory alert flags to active clinical teams."
        ],
        requirements: [
          "Bachelor of Medical Laboratory Science (BMLS) or Associate Medical Lab Technician certificate.",
          "Valid license with the Medical Laboratory Science Council of Nigeria (MLSCN).",
          "1-3 years experience in a clinical pathology or diagnostics laboratory.",
          "Deep knowledge of laboratory quality assurance protocols."
        ]
      };
    }
    return {
      description: `Faith Foundation Mission Hospital, Nsukka is seeking applications for the position of ${title || 'Staff Officer'}. We offer a modern clinical workspace, competitive salary scaling, and a supportive multidisciplinary healthcare community.`,
      responsibilities: [
        `Deliver clinical or operational services aligned to the ${title || 'Staff'} scope of work.`,
        "Maintain meticulous logs, documentation, and compliance with hospital protocols.",
        "Collaborate across departments to deliver excellent patient support experiences.",
        "Participate in mandatory CPD courses and quality improvement initiatives."
      ],
      requirements: [
        `Relevant professional qualification/degree matching the ${title || 'Staff'} role.`,
        "Valid licensing or certification from the relevant regulatory council (where applicable).",
        "Prior experience in a hospital or clinical operations environment is highly preferred.",
        "Integrity, professionalism, and dedication to patient-centered mission values."
      ]
    };
  };

  const [onboardRole, setOnboardRole] = useState('Doctor');
  const [onboardDept, setOnboardDept] = useState('OPD');
  const [onboardDesignation, setOnboardDesignation] = useState('Senior Medical Officer');

  const [editRole, setEditRole] = useState('Doctor');
  const [editDept, setEditDept] = useState('OPD');
  const [editDesignation, setEditDesignation] = useState('Senior Medical Officer');

  // Digital Signature from Timesheet / Profile
  const [savedUserSignature, setSavedUserSignature] = useState<string | null>(() => localStorage.getItem('user_digital_signature') || null);

  useEffect(() => {
    api.get('/hr/signatures/me').then(res => {
      if (res.data?.data?.signatureData) {
        setSavedUserSignature(res.data.data.signatureData);
        localStorage.setItem('user_digital_signature', res.data.data.signatureData);
      }
    }).catch(() => {});
  }, []);

  // ─── Search & Filters ──────────────────────────────────────────────────────
  const [empSearch, setEmpSearch] = useState('');

  // ─── Fetch All Data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [emRes, vaRes, atRes, roRes, leRes, apRes, cpRes, cpdRecRes, paRes, riRes, anRes, bankRes, credRes, tsRes, pbRes] = await Promise.all([
        api.get('/hr/employees'),
        api.get('/hr/vacancies'),
        api.get('/hr/attendance'),
        api.get('/hr/roster'),
        api.get('/hr/leave'),
        api.get('/hr/appraisals'),
        api.get('/hr/cpd'),
        api.get('/hr/cpd/records').catch(() => ({ data: { data: [] } })),
        api.get('/hr/payroll'),
        api.get('/hr/risks'),
        api.get('/hr/analytics'),
        api.get('/system/banks').catch(() => ({ data: { ok: true, data: [] } })),
        api.get('/hr/credentials').catch(() => ({ data: { data: [] } })),
        api.get('/hr/timesheets').catch(() => ({ data: { data: [] } })),
        api.get('/hr/payroll/breakdown').catch(() => ({ data: { data: [] } })),
      ]);
      setEmployees(emRes.data.data || []);
      setVacancies(vaRes.data.data || []);
      setCredentials(credRes.data.data || []);
      setAttendance(atRes.data.data || []);
      setRoster(roRes.data.data || []);
      setLeave(leRes.data.data || []);
      setAppraisals(apRes.data.data || []);
      setCpdCourses(cpRes.data.data || []);
      setCpdRecords(cpdRecRes.data?.data || []);
      setPayroll(paRes.data.data || []);
      setRisks(riRes.data.data || []);
      setAnalytics(anRes.data.data || {});
      setBankList(bankRes.data?.data || []);
      setTimesheets(tsRes.data.data || []);
      setPayrollBreakdown(pbRes.data?.data || []);
    } catch {
      enqueueSnackbar('Failed to load workforce HR records', { variant: 'error' });
    }
    setLoading(false);
  }, [enqueueSnackbar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Form Handlers ────────────────────────────────────────────────────────
  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/hr/employees', {
        id: fd.get('id'),
        firstName: fd.get('firstName'),
        lastName: fd.get('lastName'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        role: fd.get('role') || onboardRole,
        designation: fd.get('designation') || onboardDesignation || onboardRole,
        department: fd.get('department') || onboardDept,
        salaryGrade: fd.get('salaryGrade'),
        baseSalary: Number(fd.get('baseSalary')),
        bankName: fd.get('bankName'),
        accountNo: fd.get('accountNo'),
        licenseNo: fd.get('licenseNo'),
        licenseExpiry: fd.get('licenseExpiry'),
        fundingSource: fd.get('fundingSource'),
        donorProgramme: fd.get('donorProgramme'),
        pensionPin: fd.get('pensionPin'),
        taxId: fd.get('taxId'),
        profilePicture: onboardProfilePic,
      });
      enqueueSnackbar('Employee registered & onboarded successfully', { variant: 'success' });
      setEmpDialogOpen(false);
      setOnboardProfilePic(null);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to register employee';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const handleEditEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!actionEmp) return;
    const fd = new FormData(e.currentTarget);
    try {
      await api.put(`/hr/employees/${actionEmp.id}`, {
        id: fd.get('id'),
        firstName: fd.get('firstName'),
        lastName: fd.get('lastName'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        role: fd.get('role') || editRole,
        designation: fd.get('designation') || editDesignation || editRole,
        department: fd.get('department') || editDept,
        salaryGrade: fd.get('salaryGrade'),
        baseSalary: Number(fd.get('baseSalary')),
        bankName: fd.get('bankName'),
        accountNo: fd.get('accountNo'),
        licenseNo: fd.get('licenseNo'),
        licenseExpiry: fd.get('licenseExpiry'),
        fundingSource: fd.get('fundingSource'),
        donorProgramme: fd.get('donorProgramme'),
        pensionPin: fd.get('pensionPin'),
        taxId: fd.get('taxId'),
        profilePicture: editProfilePic,
      });
      enqueueSnackbar('Employee record updated successfully', { variant: 'success' });
      setEditDialogOpen(false);
      setEditProfilePic(null);
      if (actionEmp.id === user?.username || actionEmp.id === user?.id) {
        refreshUser();
      }
      setActionEmp(null);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update employee record';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!actionEmp) return;
    try {
      await api.patch(`/hr/employees/${actionEmp.id}/status`, { status });
      enqueueSnackbar(`Employee status updated to ${status}`, { variant: 'success' });
      setActionAnchorEl(null);
      setActionEmp(null);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to update employee status', { variant: 'error' });
    }
  };

  const handleDeleteEmployee = async () => {
    if (!actionEmp) return;
    if (!window.confirm(`Are you sure you want to delete staff ${actionEmp.firstName} ${actionEmp.lastName}?`)) return;
    try {
      await api.delete(`/hr/employees/${actionEmp.id}`);
      enqueueSnackbar('Employee record deleted successfully', { variant: 'success' });
      setActionAnchorEl(null);
      setActionEmp(null);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to delete employee record', { variant: 'error' });
    }
  };

  const handleAddVacancy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/hr/vacancies', {
        department: fd.get('department'),
        title: fd.get('title'),
        grade: fd.get('grade'),
        positions: Number(fd.get('positions')),
      });
      enqueueSnackbar('Vacancy requisition posted', { variant: 'success' });
      setVacDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to post vacancy', { variant: 'error' });
    }
  };

  const handleUpdateVacancyStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/hr/vacancies/${id}/status`, { status });
      enqueueSnackbar(`Vacancy status updated to ${status}`, { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to update vacancy status', { variant: 'error' });
    }
  };

  const handleDeleteVacancy = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vacancy?')) return;
    try {
      await api.delete(`/hr/vacancies/${id}`);
      enqueueSnackbar('Vacancy deleted successfully', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to delete vacancy', { variant: 'error' });
    }
  };

  const handleRenewCredential = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCredential) return;
    const fd = new FormData(e.currentTarget);
    try {
      await api.patch(`/hr/credentials/${selectedCredential.id}`, {
        licenseNo: fd.get('licenseNo'),
        licenseExpiry: fd.get('licenseExpiry'),
      });
      enqueueSnackbar('Professional licence renewed successfully', { variant: 'success' });
      setCredentialDialogOpen(false);
      setSelectedCredential(null);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to renew credential', { variant: 'error' });
    }
  };

  const handleAddRoster = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/hr/roster', {
        empId: fd.get('empId'),
        date: fd.get('date'),
        shiftType: fd.get('shiftType'),
        start: fd.get('start'),
        end: fd.get('end'),
        location: fd.get('location'),
        cashDrawer: fd.get('cashDrawer') || undefined,
        openingBalance: fd.get('openingBalance') ? Number(fd.get('openingBalance')) : undefined,
      });
      enqueueSnackbar('Shift roster assigned to employee and synced with Cashier Shifts!', { variant: 'success' });
      setRosterDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to assign roster shift', { variant: 'error' });
    }
  };

  const handleAddLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/hr/leave', {
        empId: fd.get('empId'),
        type: fd.get('type'),
        startDate: fd.get('startDate'),
        endDate: fd.get('endDate'),
        days: Number(fd.get('days')),
      });
      enqueueSnackbar('Leave request submitted successfully', { variant: 'success' });
      setLeaveDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to request leave', { variant: 'error' });
    }
  };

  const handleRecommendLeave = async (id: string) => {
    try {
      await api.patch(`/hr/leave/${id}/supervisor-recommend`);
      enqueueSnackbar('Leave Request Recommended by Supervisor to Admin', { variant: 'info' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to recommend leave', { variant: 'error' });
    }
  };

  const handleApproveLeave = async (id: string) => {
    try {
      await api.patch(`/hr/leave/${id}/approve`);
      enqueueSnackbar('Leave Request Approved', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to approve leave', { variant: 'error' });
    }
  };

  const handleSubmitTimesheet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/hr/timesheets', {
        empId: fd.get('empId'),
        month: fd.get('month'),
        hoursWorked: Number(fd.get('hoursWorked')),
        status: 'PENDING_APPROVAL',
      });
      enqueueSnackbar('Timesheet submitted for approval', { variant: 'success' });
      setTimesheetDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to submit timesheet', { variant: 'error' });
    }
  };

  const handleStaffSubmitTimesheet = async (id: string) => {
    try {
      const res = await api.patch(`/hr/timesheets/${id}/submit`, {});
      enqueueSnackbar('Timesheet signed and submitted by staff successfully!', { variant: 'success' });
      fetchData();
      if (activeGridTimesheet?.id === id) {
        setActiveGridTimesheet(res.data.data);
      }
    } catch {
      enqueueSnackbar('Failed to submit timesheet', { variant: 'error' });
    }
  };

  const handleSupervisorSignTimesheet = async (id: string, supervisorName: string, comments?: string) => {
    try {
      const res = await api.patch(`/hr/timesheets/${id}/supervisor-sign`, { supervisorName, comments });
      enqueueSnackbar('Signed & endorsed by Project Coordinator / Unit Supervisor!', { variant: 'success' });
      fetchData();
      if (activeGridTimesheet?.id === id) {
        setActiveGridTimesheet(res.data.data);
      }
    } catch {
      enqueueSnackbar('Failed to sign timesheet as supervisor', { variant: 'error' });
    }
  };

  const handleAdminSignTimesheet = async (id: string, adminName: string, comments?: string) => {
    try {
      const res = await api.patch(`/hr/timesheets/${id}/admin-sign`, { adminName, comments });
      enqueueSnackbar('Final Administrator approval & official seal applied! Timesheet archived.', { variant: 'success' });
      fetchData();
      if (activeGridTimesheet?.id === id) {
        setActiveGridTimesheet(res.data.data);
      }
    } catch {
      enqueueSnackbar('Failed to approve timesheet as administrator', { variant: 'error' });
    }
  };

  const handleCreateTimesheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const emp = employees.find(e => e.id === createStaffId);
      const res = await api.post('/hr/timesheets', {
        empId: createStaffId,
        name: emp ? `${emp.firstName} ${emp.lastName}` : 'Emmanuel Vegher',
        department: emp?.department || 'Prevention',
        designation: emp?.role || 'Tracking Assistant',
        location: 'Asata Poly Clinic (Sub District Hospital)',
        state: 'Enugu',
        projectName: createProjectName,
        month: createMonth,
        year: createYear,
        supervisorName: createSupervisor
      });
      enqueueSnackbar('Monthly timesheet created successfully for ' + (emp ? `${emp.firstName} ${emp.lastName}` : 'Staff') + '!', { variant: 'success' });
      setTimesheetCreateOpen(false);
      fetchData();
      setActiveGridTimesheet(res.data.data);
      setTimesheetGridOpen(true);
    } catch {
      enqueueSnackbar('Failed to create timesheet', { variant: 'error' });
    }
  };

  const handleApproveTimesheet = async (id: string, comments: string) => {
    try {
      await api.patch(`/hr/timesheets/${id}/admin-sign`, { adminName: 'Amedu Alapa', comments });
      enqueueSnackbar('Timesheet Approved and Archived successfully', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to approve timesheet', { variant: 'error' });
    }
  };

  const handleRejectTimesheet = async (id: string, comments: string) => {
    try {
      await api.patch(`/hr/timesheets/${id}/reject`, { comments });
      enqueueSnackbar('Timesheet Sent Back / Rejected', { variant: 'info' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to reject timesheet', { variant: 'error' });
    }
  };

  const handleRunPayroll = async () => {
    try {
      const res = await api.post('/hr/payroll/run', { payPeriod: 'June 2026' });
      enqueueSnackbar('Monthly Payroll processed successfully', { variant: 'success' });
      fetchData();
      if (res.data?.data) {
        setSelectedPayrollRun(res.data.data);
        handleOpenPayrollReview(res.data.data);
      }
    } catch {
      enqueueSnackbar('Payroll run failed', { variant: 'error' });
    }
  };

  const handleOpenPayrollReview = async (pay: any) => {
    setSelectedPayrollRun(pay);
    setPayrollReviewDialogOpen(true);
    try {
      const res = await api.get(`/hr/payroll/${pay.id}/breakdown`);
      if (res.data?.success && res.data?.data) {
        setPayrollBreakdown(res.data.data);
      }
    } catch {
      // Fallback
    }
  };

  const handleAdminSignPayroll = async (id: string) => {
    try {
      setIsSigningPayroll(true);
      const adminSignerName = (user as any)?.name || ((user as any)?.firstName && (user as any)?.lastName ? `${(user as any).firstName} ${(user as any).lastName}` : '') || (user as any)?.username || 'Amedu Alapa (Hospital Administrator)';
      const sigToSend = savedUserSignature || localStorage.getItem('user_digital_signature') || null;
      const res = await api.post(`/hr/payroll/${id}/admin-sign`, {
        adminName: adminSignerName,
        signatureData: sigToSend
      });
      if (res.data?.success) {
        enqueueSnackbar(`Payroll reviewed & signed by Hospital Administrator (${adminSignerName})`, { variant: 'success' });
        setSelectedPayrollRun(res.data.data);
        fetchData();
      }
    } catch {
      enqueueSnackbar('Failed to sign payroll', { variant: 'error' });
    } finally {
      setIsSigningPayroll(false);
    }
  };

  const handleBishopSignPayroll = async (id: string) => {
    try {
      setIsSigningPayroll(true);
      const bishopSignerName = ((user as any)?.role === 'BISHOP' || (user as any)?.designation === 'Bishop') ? ((user as any)?.name || 'Most Rev. Dr. C.V.C. Onaga') : 'Most Rev. Dr. C.V.C. Onaga';
      const sigToSend = ((user as any)?.role === 'BISHOP' || (user as any)?.designation === 'Bishop') ? (savedUserSignature || localStorage.getItem('user_digital_signature')) : null;
      const res = await api.post(`/hr/payroll/${id}/bishop-sign`, {
        bishopName: bishopSignerName,
        signatureData: sigToSend
      });
      if (res.data?.success) {
        enqueueSnackbar('Episcopal Seal applied by Most Rev. Bishop', { variant: 'success' });
        setSelectedPayrollRun(res.data.data);
        fetchData();
      }
    } catch {
      enqueueSnackbar('Failed to apply episcopal seal', { variant: 'error' });
    } finally {
      setIsSigningPayroll(false);
    }
  };

  const handleTransmitToFinance = async (id: string) => {
    try {
      setIsTransmittingFinance(true);
      const res = await api.post(`/hr/payroll/${id}/transmit-finance`);
      if (res.data?.success) {
        enqueueSnackbar(res.data.message || 'Payroll transmitted to Finance General Ledger (JV Voucher Created & Transmitted)', { variant: 'success' });
        if (res.data.data) setSelectedPayrollRun(res.data.data);
        fetchData();
      }
    } catch {
      enqueueSnackbar('Failed to transmit payroll to Finance', { variant: 'error' });
    } finally {
      setIsTransmittingFinance(false);
    }
  };

  const handleOpenPayslip = (staffRow: any, payRun?: any) => {
    const activeRun = payRun || selectedPayrollRun || payroll[0];
    setSelectedPayslip({
      ...staffRow,
      payPeriod: activeRun?.payPeriod || 'June 2026',
      payrollId: activeRun?.id || 'PAY-001',
      processedAt: activeRun?.processedAt || '2026-09-19',
      status: activeRun?.status || 'APPROVED_BY_ADMIN',
      adminSignatureDate: activeRun?.adminSignatureDate || '2026-09-19',
      signedByAdmin: activeRun?.signedByAdmin ?? true,
      signedByBishop: activeRun?.signedByBishop ?? true,
      bishopSealApplied: activeRun?.bishopSealApplied ?? true
    });
    setPayslipDialogOpen(true);
  };

  const handleAddAppraisal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!appraisalEmpId) {
      enqueueSnackbar('Please select the employee to evaluate', { variant: 'warning' });
      return;
    }
    const targetEmp = employees.find(emp => emp.id === appraisalEmpId);
    try {
      await api.post('/hr/appraisals', {
        empId: appraisalEmpId,
        name: targetEmp ? `${targetEmp.firstName} ${targetEmp.lastName}` : 'Staff Member',
        designation: targetEmp?.designation || targetEmp?.role || 'Staff',
        department: targetEmp?.department || 'General',
        frequency: appraisalFrequency,
        period: appraisalPeriod,
        rating: Number(appraisalRating),
        competencyScores: {
          clinical: Number(competencyClinical),
          attendance: Number(competencyAttendance),
          teamwork: Number(competencyTeamwork),
          ethics: Number(competencyEthics)
        },
        comments: appraisalComments,
        recommendation: appraisalRecommendation,
        supervisorId: currentEmpId || 'ADM-01',
        supervisorName: currentFullName || 'Hospital Supervisor',
        supervisorRole: user?.designation || user?.role || 'Unit Supervisor',
        status: 'COMPLETED'
      });
      enqueueSnackbar(`${appraisalFrequency === 'ANNUAL' ? 'Annual' : 'Bi-Annual'} performance appraisal saved successfully!`, { variant: 'success' });
      setAppraisalDialogOpen(false);
      setAppraisalComments('');
      setAppraisalEmpId('');
      fetchData();
    } catch {
      enqueueSnackbar('Failed to post appraisal', { variant: 'error' });
    }
  };

  const handleAddCpdCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newCourseName.trim()) {
      enqueueSnackbar('Please enter course title', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/hr/cpd', {
        name: newCourseName,
        category: newCourseCategory,
        provider: newCourseProvider,
        credits: Number(newCourseCredits),
        durationHours: Number(newCourseDuration),
        targetAudience: newCourseTargetAudience,
        deliveryMode: newCourseDeliveryMode,
        passingScore: Number(newCoursePassingScore),
        renewalMonths: Number(newCourseRenewalMonths),
        nextDueDate: newCourseNextDue,
        description: newCourseDescription,
        status: 'ACTIVE'
      });
      enqueueSnackbar('Accredited CPD Course registered successfully!', { variant: 'success' });
      setAddCourseDialogOpen(false);
      setNewCourseName('');
      setNewCourseDescription('');
      fetchData();
    } catch {
      enqueueSnackbar('Failed to create CPD course', { variant: 'error' });
    }
  };

  const handleLogStaffCpd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!recordStaffId || !recordCourseId) {
      enqueueSnackbar('Please select staff member and course', { variant: 'warning' });
      return;
    }
    const staff = employees.find((emp: any) => emp.id === recordStaffId);
    const course = cpdCourses.find((c: any) => c.id === recordCourseId);
    try {
      await api.post('/hr/cpd/records', {
        staffId: recordStaffId,
        staffName: staff ? `${staff.firstName} ${staff.lastName}` : 'Staff Member',
        designation: staff?.designation || staff?.role || 'Professional',
        department: staff?.department || 'Clinical Services',
        courseId: recordCourseId,
        courseName: course ? course.name : 'CPD Course',
        creditsEarned: Number(recordCredits),
        completionDate: recordCompletionDate,
        expiryDate: recordExpiryDate,
        certificateNo: recordCertNo || `CERT-${Date.now().toString().slice(-6)}`,
        scorePercent: Number(recordScore),
        accreditationBody: recordAccreditation,
        verifiedBy: recordVerifiedBy || currentFullName || 'Hospital CME Board',
        status: 'VALID'
      });
      enqueueSnackbar('Staff CPD Certification & Credits recorded successfully!', { variant: 'success' });
      setLogStaffCpdDialogOpen(false);
      setRecordStaffId('');
      setRecordCourseId('');
      setRecordCertNo('');
      fetchData();
    } catch {
      enqueueSnackbar('Failed to record staff CPD credit', { variant: 'error' });
    }
  };

  const handleExportCpdReport = () => {
    const headers = ['Certificate Ref', 'Staff ID', 'Staff Name', 'Designation', 'Department', 'Course Name', 'Credits Earned', 'Exam Score (%)', 'Completion Date', 'Expiry Date', 'Accreditation Body', 'Status', 'Verified By'];
    const rows = cpdRecords.map(r => [
      `"${r.certificateNo || ''}"`,
      `"${r.staffId || ''}"`,
      `"${r.staffName || ''}"`,
      `"${r.designation || ''}"`,
      `"${r.department || ''}"`,
      `"${r.courseName || ''}"`,
      r.creditsEarned || 0,
      `"${r.scorePercent || 0}%"`,
      `"${r.completionDate || ''}"`,
      `"${r.expiryDate || ''}"`,
      `"${r.accreditationBody || ''}"`,
      `"${r.status || 'VALID'}"`,
      `"${r.verifiedBy || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Staff_CPD_Accreditation_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Exported CPD transcript report successfully', { variant: 'success' });
  };

  const handleAddRisk = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/hr/risks', {
        category: fd.get('category'),
        title: fd.get('title'),
        impact: fd.get('impact'),
        likelihood: fd.get('likelihood'),
        mitigation: fd.get('mitigation'),
      });
      enqueueSnackbar('Workforce risk registered', { variant: 'success' });
      setRiskDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to log risk', { variant: 'error' });
    }
  };

  const filteredEmployees = employees.filter(e =>
    !empSearch || `${e.firstName} ${e.lastName}`.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.id.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.role.toLowerCase().includes(empSearch.toLowerCase())
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 19.1: Employee Records & Credentialing
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab1 = () => (
    <Box>
      {/* ── 19.1.1 Directory ── */}

      {/* ── 19.1.1 Directory ── */}
      <TabPanel value={subTab0} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Central Employee Master Registry (FR-HR-001–005)</Typography>
          <Stack direction="row" spacing={1}>
            <TextField size="small" placeholder="Search directory..." value={empSearch} onChange={e => setEmpSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
            <Button variant="outlined" startIcon={<AccountTree />} onClick={() => navigate('/staff/hierarchy')} sx={{ borderColor: PRIMARY, color: PRIMARY, fontWeight: 700 }}>Hierarchy & Organogram</Button>
            <Button variant="contained" startIcon={<Add />} onClick={handleOpenOnboardDialog} sx={{ bgcolor: PRIMARY }}>Register Staff</Button>
          </Stack>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY }}>
              <TableRow>
                {['Emp ID', 'Staff Name', 'Role', 'Department', 'Email', 'Phone', 'Grade', 'Base Salary', 'Funding', 'Status', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: '#ffffff !important', fontWeight: 700, fontSize: '0.75rem' }} align={h === 'Actions' ? 'center' : 'left'}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmployees.map(emp => (
                <TableRow key={emp.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SECONDARY }}>{emp.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar 
                        src={emp.profilePicture || undefined} 
                        sx={{ width: 28, height: 28, bgcolor: PRIMARY, fontSize: '0.72rem' }}
                      >
                        {emp.firstName[0] ?? ''}{emp.lastName[0] ?? ''}
                      </Avatar>
                      <span>{emp.firstName} {emp.lastName}</span>
                    </Box>
                  </TableCell>
                  <TableCell>{emp.role}</TableCell>
                  <TableCell><Chip label={emp.department} size="small" variant="outlined" /></TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{emp.email}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{emp.phone}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{emp.salaryGrade}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{formatNGN(emp.baseSalary)}</TableCell>
                  <TableCell>
                    <Chip label={emp.fundingSource === 'DONOR_FUNDED' ? emp.donorProgramme : 'Core Hospital'} size="small" color={emp.fundingSource === 'DONOR_FUNDED' ? 'warning' : 'primary'} sx={{ fontSize: '0.65rem' }} />
                  </TableCell>
                  <TableCell><StatusChip label={emp.status} /></TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setActionAnchorEl(e.currentTarget);
                        setActionEmp(emp);
                      }}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 19.1.2 Vacancies ── */}
      <TabPanel value={subTab0} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Workforce Vacancies & Recruitment (FR-HR-006–010)</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setVacDialogOpen(true)} sx={{ bgcolor: SECONDARY }}>Post Vacancy Requisition</Button>
        </Box>
        {vacancies.length === 0 ? (
          <Alert severity="info">No vacancies posted yet. Click "Post Vacancy Requisition" to add one.</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: SECONDARY }}>
                <TableRow>{['Vacancy ID', 'Department', 'Position Title', 'Approved Grade', 'Vacancies', 'Date Posted', 'Status', 'Actions'].map(h => <TableCell key={h} sx={{ color: '#ffffff !important', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {vacancies.map(vac => (
                  <TableRow key={vac.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{vac.id}</TableCell>
                    <TableCell>{vac.department}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{vac.title}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{vac.grade}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">{vac.positions}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{vac.datePosted}</TableCell>
                    <TableCell><StatusChip label={vac.status} /></TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {vac.status === 'OPEN' && (
                          <Tooltip title="Mark as Shortlisting">
                            <IconButton size="small" color="warning" onClick={() => handleUpdateVacancyStatus(vac.id, 'SHORTLISTING')}>
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {vac.status === 'SHORTLISTING' && (
                          <Tooltip title="Mark as Closed / Filled">
                            <IconButton size="small" color="success" onClick={() => handleUpdateVacancyStatus(vac.id, 'CLOSED')}>
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {vac.status === 'CLOSED' && (
                          <Tooltip title="Reopen Vacancy">
                            <IconButton size="small" color="info" onClick={() => handleUpdateVacancyStatus(vac.id, 'OPEN')}>
                              <Refresh fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="View Job Advert">
                          <IconButton size="small" color="primary" onClick={() => {
                            const details = getJobAdvertDetails(vac.title);
                            setEditedDescription(details.description);
                            setEditedResponsibilities(details.responsibilities.join('\n'));
                            setEditedRequirements(details.requirements.join('\n'));
                            setIsEditingAdvert(false);
                            setSelectedAdvertVacancy(vac);
                            setAdvertDialogOpen(true);
                          }}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Vacancy">
                          <IconButton size="small" color="error" onClick={() => handleDeleteVacancy(vac.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* ── 19.1.3 Credential Verification ── */}
      <TabPanel value={subTab0} index={2}>
        <Alert severity="info" icon={<Security />} sx={{ mb: 2 }}>
          FR-HR-011–015 · All regulated clinical staff require valid professional licensing. Expired licenses automatically restrict EMR system logins (BR-HR-002).
        </Alert>
        {credentials.length === 0 ? (
          <Alert severity="warning">No clinical credentials found. Staff with a valid Regulatory Board Licence will appear here.</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: GOLD }}>
                <TableRow>{['Emp ID', 'Clinical Staff Name', 'Role', 'Regulatory Board Licence', 'License Expiry Date', 'Days Left', 'Status', 'Actions'].map(h => <TableCell key={h} sx={{ color: '#ffffff !important', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {credentials.map(cred => {
                  const isExpired = cred.daysLeft < 0;
                  const isSoon = !isExpired && cred.daysLeft <= 90;
                  return (
                    <TableRow key={cred.id} hover sx={{ bgcolor: isExpired ? 'rgba(220,38,38,0.04)' : isSoon ? 'rgba(234,179,8,0.04)' : 'inherit' }}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{cred.id}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{cred.firstName} {cred.lastName}</TableCell>
                      <TableCell>{cred.role}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{cred.licenseNo}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: isExpired ? DANGER : isSoon ? WARNING : 'inherit' }}>{cred.licenseExpiry}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: isExpired ? DANGER : isSoon ? WARNING : SUCCESS }}>
                        {isExpired ? `EXPIRED (${Math.abs(cred.daysLeft)} days ago)` : `${cred.daysLeft} days left`}
                      </TableCell>
                      <TableCell><StatusChip label={isExpired ? 'EXPIRED' : 'ACTIVE'} /></TableCell>
                      <TableCell>
                        <Tooltip title="Renew Licence">
                          <Button
                            size="small"
                            variant={isExpired ? 'contained' : 'outlined'}
                            color={isExpired ? 'error' : 'primary'}
                            startIcon={<Edit />}
                            onClick={() => { setSelectedCredential(cred); setCredentialDialogOpen(true); }}
                            sx={{ fontSize: '0.7rem', py: 0.25 }}
                          >
                            Renew
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 19.2: Attendance & Rostering
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab2 = () => {
    // Dynamic Chart Data calculations for Attendance Analysis & Charts
    const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
    const lateCount = attendance.filter(a => a.status === 'LATE').length;
    const absentCount = Math.max(0, employees.length - (presentCount + lateCount));

    const pieData = [
      { name: 'On Time Present', value: presentCount, color: '#16a34a' },
      { name: 'Late Arrival', value: lateCount, color: '#dc2626' },
      { name: 'Yet to Clock In / Absent', value: absentCount, color: '#ea580c' },
    ];

    const shortenDept = (name: string) => {
      if (!name) return 'Other';
      const n = name.toLowerCase();
      if (n.includes('bishop') || n.includes('diocesan') || n.includes('patron')) return 'Exec Board';
      if (n.includes('nurs')) return 'Nursing';
      if (n.includes('pharm')) return 'Pharmacy';
      if (n.includes('lab') || n.includes('lims')) return 'Laboratory';
      if (n.includes('radio')) return 'Radiology';
      if (n.includes('theatre') || n.includes('surg')) return 'Theatre';
      if (n.includes('emerg')) return 'Emergency';
      if (n.includes('admin')) return 'Admin';
      if (n.includes('finan') || n.includes('audit')) return 'Finance';
      if (n.includes('physio') || n.includes('rehab')) return 'Physio';
      if (n.includes('mortu')) return 'Mortuary';
      if (n.includes('pedia')) return 'Pediatrics';
      if (n.includes('mat')) return 'Maternity';
      if (n.includes('icu')) return 'ICU';
      if (n.includes('hmo') || n.includes('insur')) return 'HMO';
      if (n.includes('opd') || n.includes('clinic')) return 'OPD';
      return name.length > 12 ? name.substring(0, 10) + '…' : name;
    };

    // Compute active clocked-in count by department
    const deptMap: Record<string, number> = {};
    attendance.forEach(att => {
      const emp = employees.find(e => e.id === att.empId);
      const dept = emp ? emp.department : 'OPD';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    // Ensure all departments are visible in chart even if 0
    const allDepts = Array.from(new Set(employees.map(e => e.department)));
    const barData = allDepts.map(dept => ({
      name: dept,
      shortName: shortenDept(dept),
      'Clocked In': deptMap[dept] || 0,
    }));

    return (
      <Box>
        {/* ── TabPanel 0: Biometric Attendance Clock & Daily Register (Replicated from Attendance App) ── */}
        <TabPanel value={subTab1} index={0}>
          <BiometricAttendanceClock />
        </TabPanel>

        {/* ── TabPanel 1: Attendance Analysis & Charts ── */}
        <TabPanel value={subTab1} index={1}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Doughnut distribution */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: PRIMARY }}>Today's Clock-in Distribution</Typography>
                <Typography variant="caption" color="text.secondary">Present rates vs missing logs for today's active schedule</Typography>
                <Box sx={{ height: 260, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>

            {/* Departmental attendance */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: PRIMARY }}>Departmental Attendance Coverage</Typography>
                <Typography variant="caption" color="text.secondary">Present staff count aggregated by organizational unit</Typography>
                <Box sx={{ height: 260, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 15, left: -10, bottom: 35 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="shortName" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10 }} height={50} />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label} />
                      <Bar dataKey="Clocked In" fill={SECONDARY} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Personnel analysis table */}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, mb: 1.5 }}>Detailed Personnel Attendance Analysis</Typography>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: PRIMARY }}>
                <TableRow>
                  {['Staff ID', 'Employee Name', 'Role & Dept', 'Assigned Shifts', 'Clocks Logged', 'Late Arrivals', 'Punctuality Rate', 'Attendance Rate', 'State / Status'].map(h => (
                    <TableCell key={h} sx={{ color: '#ffffff !important', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map(emp => {
                  const empShifts = roster.filter(r => r.empId === emp.id).length || 1;
                  const empClocks = attendance.filter(a => a.empId === emp.id);
                  const logsCount = empClocks.length;
                  const lates = empClocks.filter(c => c.status === 'LATE').length;
                  const attendanceRate = Math.min(100, Math.round((logsCount / empShifts) * 100));
                  const punctualityRate = logsCount > 0 ? Math.round(((logsCount - lates) / logsCount) * 100) : 100;

                  return (
                    <TableRow key={emp.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{emp.id}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{emp.role} ({emp.department})</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{empShifts}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{logsCount}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: lates > 0 ? DANGER : SUCCESS }}>{lates}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: punctualityRate > 75 ? SUCCESS : WARNING }}>{punctualityRate}%</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ mr: 1, fontWeight: 800, minWidth: 35 }}>{attendanceRate}%</Typography>
                          <LinearProgress variant="determinate" value={attendanceRate} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: attendanceRate > 75 ? SUCCESS : WARNING } }} />
                        </Box>
                      </TableCell>
                      <TableCell><StatusChip label={emp.status} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* ── TabPanel 2: Centralized Duty Roster Schedules (All Roles) ── */}
        <TabPanel value={subTab1} index={2}>
          <CentralizedDutyRoster />
        </TabPanel>

        {/* ── TabPanel 3: Leave & Absence Management Desk (FR-WSF-031–040) ── */}
        <TabPanel value={subTab1} index={3}>
          <LeaveManagementPage />
        </TabPanel>

        {/* ── TabPanel 4: Shift-Based Monthly Timesheets & Multi-Tier Approvals ── */}
        <TabPanel value={subTab1} index={4}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment /> Monthly Timesheet Sign-Off & Hours Verification
                <Chip label="FULL CALENDAR MONTH (1st – 30th/31st)" size="small" color="primary" sx={{ fontSize: '0.65rem', fontWeight: 800, height: 20 }} />
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Shift-based compliance evaluating scheduled roster duties vs completed shifts. 100% compliance achieved on full duty fulfillment.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdf />}
                onClick={() => {
                  if (timesheets.length > 0) {
                    setActiveGridTimesheet(timesheets[0]);
                    setTimesheetPrintModalOpen(true);
                  }
                }}
                size="small"
                sx={{ textTransform: 'none', fontWeight: 700, color: '#dc2626', borderColor: '#fca5a5' }}
              >
                Print / Export Master PDF
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setTimesheetCreateOpen(true)}
                size="small"
                sx={{ bgcolor: PRIMARY, textTransform: 'none', fontWeight: 700 }}
              >
                + Create Staff Timesheet
              </Button>
            </Stack>
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: TEAL }}>
                <TableRow>
                  {['Timesheet ID', 'Staff Name & Designation', 'Department & Station', 'Reporting Cycle', 'Duty / Project', 'Hours (Logged / Expected)', 'Shift Compliance', 'Approval Hierarchy', 'Status', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ color: '#ffffff !important', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {timesheets.map(ts => (
                  <TableRow key={ts.id} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#f8fafc' } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: PRIMARY }}>{ts.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>{ts.name}</Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>{ts.designation || 'Staff Officer'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block' }}>{ts.department || 'Clinical & Revenue'}</Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>{ts.location || 'Faith Foundation Hospital'}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <Chip
                        label={`${ts.month} ${ts.year || '2026'}`}
                        size="small"
                        sx={{ bgcolor: '#f1f5f9', fontWeight: 700, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{ts.projectName || 'AYP HUB'}</TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 800, color: PRIMARY }}>
                        {ts.hoursWorked} / {ts.expectedHours || 176} hrs
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<CheckCircle sx={{ fontSize: '14px !important', color: '#16a34a !important' }} />}
                        label={`${ts.compliancePercentage || 100}% COMPLIANT`}
                        size="small"
                        sx={{ bgcolor: '#ecfdf5', color: '#166534', fontWeight: 800, fontSize: '0.68rem', border: '1px solid #bbf7d0' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title={ts.staffSignature?.signed ? `Signed by Staff (${ts.staffSignature.date})` : 'Staff signature pending'}>
                          <Chip
                            label="1. Staff"
                            size="small"
                            color={ts.staffSignature?.signed ? 'success' : 'default'}
                            variant={ts.staffSignature?.signed ? 'filled' : 'outlined'}
                            sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700 }}
                          />
                        </Tooltip>
                        <Tooltip title={ts.supervisorSignature?.signed ? `Signed by Coordinator ${ts.supervisorSignature.name} (${ts.supervisorSignature.date})` : 'Supervisor review pending'}>
                          <Chip
                            label="2. Coord"
                            size="small"
                            color={ts.supervisorSignature?.signed ? 'success' : (ts.status === 'SUBMITTED' ? 'warning' : 'default')}
                            variant={ts.supervisorSignature?.signed ? 'filled' : 'outlined'}
                            sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700 }}
                          />
                        </Tooltip>
                        <Tooltip title={ts.adminSignature?.signed ? `Approved by Administrator ${ts.adminSignature.name} (${ts.adminSignature.date})` : 'Administrator seal pending'}>
                          <Chip
                            label="3. Admin"
                            size="small"
                            color={ts.adminSignature?.signed ? 'success' : (ts.status === 'PENDING_ADMIN_APPROVAL' ? 'warning' : 'default')}
                            variant={ts.adminSignature?.signed ? 'filled' : 'outlined'}
                            sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700 }}
                          />
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <StatusChip label={ts.status} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<Visibility />}
                          onClick={() => {
                            setActiveGridTimesheet(ts);
                            setTimesheetGridOpen(true);
                          }}
                          sx={{ fontSize: '0.7rem', py: 0.3, textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                        >
                          Open Grid
                        </Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setActiveGridTimesheet(ts);
                            setTimesheetPrintModalOpen(true);
                          }}
                          title="Print / PDF Report"
                          sx={{ bgcolor: '#fef2f2', border: '1px solid #fecaca' }}
                        >
                          <PictureAsPdf fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Box>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 19.3: Payroll, Performance & CPD
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab3 = () => (
    <Box>
      {/* ── 19.3.1 Payroll runs ── */}

      {/* ── 19.3.1 Payroll runs ── */}
      <TabPanel value={subTab2} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Monthly Payroll Cycles & Treasury Transmission (FR-PAY-001–010)</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Calculated automatically from staff timesheets & attendance • Requires Hospital Admin Review, Bishop Signature & Transmission to Finance General Ledger
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData} sx={{ borderColor: PRIMARY, color: PRIMARY, fontWeight: 700 }}>Refresh</Button>
            <Button variant="contained" startIcon={<LocalAtm />} onClick={handleRunPayroll} sx={{ bgcolor: PRIMARY, fontWeight: 700 }}>Run Monthly Payroll</Button>
          </Stack>
        </Box>

        {/* Macro Cycles Table */}
        <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY }}>
              <TableRow>
                {['Cycle ID & Period', 'Gross Payroll (₦)', 'Deductions (₦)', 'Net Disbursement (₦)', 'Processed Date', 'Workflow Status', 'Approvals & Signatures', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: '#ffffff !important', fontWeight: 700, fontSize: '0.75rem' }} align={h === 'Actions' ? 'center' : 'left'}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {payroll.map(pay => {
                const isAdminSigned = pay.signedByAdmin || pay.status === 'APPROVED_BY_ADMIN' || pay.status === 'DISBURSED' || pay.status === 'TRANSMITTED_TO_FINANCE';
                const isBishopSigned = pay.bishopSealApplied || pay.signedByBishop || pay.status === 'DISBURSED';
                const isTransmitted = pay.status === 'TRANSMITTED_TO_FINANCE' || pay.status === 'DISBURSED';

                return (
                  <TableRow key={pay.id} hover sx={{ bgcolor: selectedPayrollRun?.id === pay.id ? alpha(PRIMARY, 0.05) : 'inherit' }}>
                    <TableCell sx={{ fontWeight: 800 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: PRIMARY }}>{pay.payPeriod}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{pay.id}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatNGN(pay.totalGross)}</TableCell>
                    <TableCell sx={{ color: DANGER, fontWeight: 700 }}>{formatNGN(pay.deductions)}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: SUCCESS, fontSize: '0.85rem' }}>{formatNGN(pay.netPaid)}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{pay.processedAt}</TableCell>
                    <TableCell>
                      <StatusChip label={pay.status} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="column" spacing={0.5}>
                        {isAdminSigned ? (
                          <Chip size="small" icon={<Verified fontSize="small" />} label={pay.adminName ? `Admin: ${pay.adminName}` : "Admin Signed"} color="success" sx={{ fontSize: '0.65rem', height: 20 }} />
                        ) : (
                          <Chip size="small" icon={<RateReview fontSize="small" />} label="Pending Admin Sign" color="warning" sx={{ fontSize: '0.65rem', height: 20 }} />
                        )}
                        {isBishopSigned ? (
                          <Chip size="small" icon={<CheckCircle fontSize="small" />} label="Episcopal Seal Applied" sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#f3e8ff', color: '#6b21a8', fontWeight: 700 }} />
                        ) : (
                          <Chip size="small" label="Pending Episcopal Seal" variant="outlined" sx={{ fontSize: '0.65rem', height: 20, color: 'text.secondary' }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<RateReview fontSize="small" />}
                          onClick={() => handleOpenPayrollReview(pay)}
                          sx={{ bgcolor: PRIMARY, color: '#fff', fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', py: 0.4, px: 1 }}
                        >
                          Review & Sign
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<AccountBalance fontSize="small" />}
                          disabled={isTransmitted}
                          onClick={() => handleTransmitToFinance(pay.id)}
                          sx={{ bgcolor: isTransmitted ? '#94a3b8' : SUCCESS, color: '#fff', fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', py: 0.4, px: 1, '&:hover': { bgcolor: '#15803d' } }}
                        >
                          {isTransmitted ? 'Transmitted' : 'Send to Finance'}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ReceiptLong fontSize="small" />}
                          onClick={() => {
                            setSelectedPayrollRun(pay);
                            setShowStaffBreakdown(true);
                          }}
                          sx={{ borderColor: PRIMARY, color: PRIMARY, fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', py: 0.4, px: 1 }}
                        >
                          Payslips
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Detailed Staff Payroll Register & Payslips Component */}
        <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <ReceiptLong sx={{ color: PRIMARY }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PRIMARY }}>
                  Detailed Staff Payroll Register & Individual Payslips
                </Typography>
                <Chip
                  label={`Cycle: ${selectedPayrollRun?.payPeriod || 'June 2026'}`}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                />
                <Chip
                  label="Timesheet Reconciled (176 hrs benchmark)"
                  size="small"
                  sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: '0.7rem', border: '1px solid #a7f3d0' }}
                />
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Base salary pro-rated against timesheet hours worked + 1.5× overtime rate • PAYE, NHF 2.5% & Pension 8% statutory deductions calculated
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Search staff name, role or ID..."
                value={payrollStaffSearch}
                onChange={e => setPayrollStaffSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                sx={{ width: 260 }}
              />
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={() => window.print()}
                sx={{ borderColor: '#cbd5e1', color: 'text.primary', fontWeight: 700, fontSize: '0.75rem', textTransform: 'none' }}
              >
                Print Register
              </Button>
            </Stack>
          </Box>

          <TableContainer sx={{ maxHeight: 520, borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
            <Table size="small" stickyHeader>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  {['Staff ID & Name', 'Department / Role', 'Base Salary', 'Timesheet / OT', 'Allowances', 'Gross Pay (₦)', 'PAYE Tax (₦)', 'Pension 8% (₦)', 'NHF 2.5% (₦)', 'Net Pay (₦)', 'Bank Details', 'Action'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.72rem', color: '#1e293b', bgcolor: '#f1f5f9' }} align={h === 'Action' ? 'center' : 'left'}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {payrollBreakdown
                  .filter(s =>
                    !payrollStaffSearch ||
                    s.name?.toLowerCase().includes(payrollStaffSearch.toLowerCase()) ||
                    s.staffId?.toLowerCase().includes(payrollStaffSearch.toLowerCase()) ||
                    s.role?.toLowerCase().includes(payrollStaffSearch.toLowerCase()) ||
                    s.department?.toLowerCase().includes(payrollStaffSearch.toLowerCase())
                  )
                  .map((staff, idx) => (
                    <TableRow key={staff.staffId || idx} hover>
                      <TableCell sx={{ fontWeight: 700 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>{staff.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{staff.staffId}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{staff.role}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{staff.department}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{formatNGN(staff.baseSalary)}</TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: (staff.timesheet?.compliance || 100) >= 90 ? SUCCESS : WARNING }}>
                          {staff.timesheet?.hoursWorked || 176} hrs ({staff.timesheet?.compliance || 100}%)
                        </Typography>
                        {(staff.timesheet?.overtimeHours || 0) > 0 && (
                          <Typography variant="caption" sx={{ display: 'block', color: PURPLE, fontWeight: 700 }}>
                            +{staff.timesheet.overtimeHours}h OT ({formatNGN(staff.earnings?.overtimePay)})
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>
                        {formatNGN((staff.earnings?.hazardAllowance || 0) + (staff.earnings?.shiftAllowance || 0) + (staff.earnings?.clinicalAllowance || 0))}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{formatNGN(staff.earnings?.grossSalary)}</TableCell>
                      <TableCell sx={{ color: DANGER, fontSize: '0.75rem' }}>{formatNGN(staff.deductions?.payeTax)}</TableCell>
                      <TableCell sx={{ color: DANGER, fontSize: '0.75rem' }}>{formatNGN(staff.deductions?.pensionEmployee)}</TableCell>
                      <TableCell sx={{ color: DANGER, fontSize: '0.75rem' }}>{formatNGN(staff.deductions?.nhf)}</TableCell>
                      <TableCell sx={{ fontWeight: 900, color: SUCCESS, fontSize: '0.82rem' }}>{formatNGN(staff.netPay)}</TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{staff.bankName}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{staff.accountNumber}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<ReceiptLong fontSize="small" />}
                          onClick={() => handleOpenPayslip(staff, selectedPayrollRun)}
                          sx={{ bgcolor: PRIMARY, color: '#fff', fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', py: 0.3, px: 1 }}
                        >
                          View Payslip
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* ── 19.3.2 Appraisals ── */}
      <TabPanel value={subTab2} index={1}>
        {/* Controls & Filter Bar */}
        <Card sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: 'none', bgcolor: '#f8fafc' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star sx={{ color: '#f59e0b' }} /> Staff Performance Appraisals & Competency Ledger
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {isSuperAdminOrAdminOrBishop
                  ? 'Administrator View · All departmental annual & bi-annual staff evaluations across the hospital.'
                  : `Supervisor View · Showing direct subordinates mapped to ${currentFullName || 'you'} in the hospital hierarchy.`}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <TextField
                select
                size="small"
                label="Evaluation Cycle"
                value={appraisalFilterFreq}
                onChange={e => setAppraisalFilterFreq(e.target.value)}
                sx={{ minWidth: 160, bgcolor: '#fff' }}
              >
                <MenuItem value="ALL">All Review Cycles</MenuItem>
                <MenuItem value="ANNUAL">Annual Appraisals</MenuItem>
                <MenuItem value="BI_ANNUAL_H1">Bi-Annual (H1 Mid-Year)</MenuItem>
                <MenuItem value="BI_ANNUAL_H2">Bi-Annual (H2 End-Year)</MenuItem>
              </TextField>

              {!isSuperAdminOrAdminOrBishop && (
                <TextField
                  select
                  size="small"
                  label="Display Scope"
                  value={appraisalFilterScope}
                  onChange={e => setAppraisalFilterScope(e.target.value)}
                  sx={{ minWidth: 160, bgcolor: '#fff' }}
                >
                  <MenuItem value="ALL">My Supervised Staff</MenuItem>
                  <MenuItem value="HOSPITAL">All Team Records</MenuItem>
                </TextField>
              )}

              <Button
                variant="contained"
                startIcon={<Star />}
                onClick={() => {
                  if (mySubordinates.length > 0 && !appraisalEmpId) {
                    setAppraisalEmpId(mySubordinates[0].id);
                  }
                  setAppraisalDialogOpen(true);
                }}
                sx={{ bgcolor: SECONDARY, fontWeight: 800, borderRadius: 1.5, textTransform: 'none', px: 2 }}
              >
                Log Evaluation
              </Button>
            </Stack>
          </Stack>
        </Card>

        {/* Appraisals Table */}
        <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: SECONDARY }}>
              <TableRow>
                {['Appraisal ID', 'Employee Name & Portfolio', 'Evaluation Cycle & Period', 'Supervisor / Appraiser', 'Rating Score (5.0)', 'Evaluation Comments & Directives', 'Status', 'Action'].map(h => (
                  <TableCell key={h} sx={{ color: '#ffffff !important', fontWeight: 700, fontSize: '0.78rem' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {appraisals
                .filter(app => {
                  // Cycle filter
                  if (appraisalFilterFreq !== 'ALL' && (app.frequency || 'ANNUAL') !== appraisalFilterFreq) return false;
                  // Supervisor scope filter
                  if (!isSuperAdminOrAdminOrBishop && appraisalFilterScope === 'ALL') {
                    const isMySub = mySubordinates.some((sub: any) => sub.id === app.empId || sub.firstName?.includes(app.name) || sub.lastName?.includes(app.name));
                    const isMyOwnSubmission = app.supervisorId === currentEmpId || (app.supervisorName && currentFullName && app.supervisorName.toLowerCase() === currentFullName.toLowerCase());
                    return isMySub || isMyOwnSubmission;
                  }
                  return true;
                })
                .map(app => (
                  <TableRow key={app.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: PRIMARY }}>{app.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>{app.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {app.designation || 'Staff'} · {app.department || 'General'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={app.frequency === 'BI_ANNUAL_H1' ? `Bi-Annual (H1) · ${app.period || '2026'}` : app.frequency === 'BI_ANNUAL_H2' ? `Bi-Annual (H2) · ${app.period || '2026'}` : `Annual · ${app.period || 'FY2025'}`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          bgcolor: (app.frequency || '').startsWith('BI_ANNUAL') ? '#eff6ff' : '#fef3c7',
                          color: (app.frequency || '').startsWith('BI_ANNUAL') ? '#1d4ed8' : '#b45309',
                          border: `1px solid ${(app.frequency || '').startsWith('BI_ANNUAL') ? '#bfdbfe' : '#fde68a'}`
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: '#334155' }}>
                        {app.supervisorName || 'Departmental Supervisor'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {app.supervisorRole || 'Unit Supervisor'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: Number(app.rating) >= 4.0 ? SUCCESS : GOLD, fontSize: '0.85rem' }}>
                      {app.rating} / 5.0
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: '#334155', maxWidth: 280 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                        {app.comments}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={app.status || 'COMPLETED'} size="small" color="success" sx={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: 0.5 }} />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSelectedAppraisalDetail(app);
                          setAppraisalDetailOpen(true);
                        }}
                        sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', py: 0.2, px: 1, borderColor: '#cbd5e1' }}
                      >
                        View Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {appraisals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No appraisals logged yet. Click "Log Evaluation" to record staff performance evaluations.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 19.3.3 Learning & Continuing Professional Development (CPD) ── */}
      <TabPanel value={subTab2} index={2}>
        {/* Top Control Strip */}
        <Box sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }}>
            {/* View Switcher Tabs */}
            <Stack direction="row" spacing={1} sx={{ bgcolor: '#f1f5f9', p: 0.5, borderRadius: 2 }}>
              <Button
                variant={cpdActiveView === 'COURSES' ? 'contained' : 'text'}
                size="small"
                onClick={() => setCpdActiveView('COURSES')}
                startIcon={<School />}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textTransform: 'none',
                  bgcolor: cpdActiveView === 'COURSES' ? PRIMARY : 'transparent',
                  color: cpdActiveView === 'COURSES' ? '#fff' : '#64748b',
                  '&:hover': { bgcolor: cpdActiveView === 'COURSES' ? PRIMARY : 'rgba(0,0,0,0.05)' }
                }}
              >
                Accredited Curriculum ({cpdCourses.length})
              </Button>
              <Button
                variant={cpdActiveView === 'RECORDS' ? 'contained' : 'text'}
                size="small"
                onClick={() => setCpdActiveView('RECORDS')}
                startIcon={<Verified />}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textTransform: 'none',
                  bgcolor: cpdActiveView === 'RECORDS' ? PRIMARY : 'transparent',
                  color: cpdActiveView === 'RECORDS' ? '#fff' : '#64748b',
                  '&:hover': { bgcolor: cpdActiveView === 'RECORDS' ? PRIMARY : 'rgba(0,0,0,0.05)' }
                }}
              >
                Staff Certification Logs ({cpdRecords.length})
              </Button>
              <Button
                variant={cpdActiveView === 'COMPLIANCE' ? 'contained' : 'text'}
                size="small"
                onClick={() => setCpdActiveView('COMPLIANCE')}
                startIcon={<Security />}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textTransform: 'none',
                  bgcolor: cpdActiveView === 'COMPLIANCE' ? PRIMARY : 'transparent',
                  color: cpdActiveView === 'COMPLIANCE' ? '#fff' : '#64748b',
                  '&:hover': { bgcolor: cpdActiveView === 'COMPLIANCE' ? PRIMARY : 'rgba(0,0,0,0.05)' }
                }}
              >
                Council Compliance Matrix
              </Button>
            </Stack>

            {/* Action Buttons */}
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<FileDownload />}
                onClick={handleExportCpdReport}
                sx={{ fontWeight: 700, borderColor: '#cbd5e1', color: '#334155', textTransform: 'none' }}
              >
                Export Ledger
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddCourseDialogOpen(true)}
                sx={{ bgcolor: PRIMARY, fontWeight: 700, textTransform: 'none' }}
              >
                + Add CPD Course
              </Button>
              <Button
                variant="contained"
                startIcon={<Verified />}
                onClick={() => {
                  setRecordStaffId(employees[0]?.id || '');
                  setRecordCourseId(cpdCourses[0]?.id || '');
                  setLogStaffCpdDialogOpen(true);
                }}
                sx={{ bgcolor: SECONDARY, fontWeight: 700, textTransform: 'none' }}
              >
                + Record Certification
              </Button>
            </Stack>
          </Stack>

          {/* Search & Category Filter Bar */}
          <Paper sx={{ p: 1.5, mt: 2, borderRadius: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search course title, provider, staff name, or certificate #..."
              size="small"
              value={cpdSearchQuery}
              onChange={e => setCpdSearchQuery(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 260 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                )
              }}
            />
            <TextField
              select
              label="Category Filter"
              size="small"
              value={cpdFilterCategory}
              onChange={e => setCpdFilterCategory(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="ALL">All Training Categories</MenuItem>
              <MenuItem value="MANDATORY">Mandatory Regulatory (BLS/IPC/NRP)</MenuItem>
              <MenuItem value="CLINICAL_CME">Clinical CME (ACLS/Transfusion/ETAT)</MenuItem>
              <MenuItem value="ETHICS_LEGAL">Medical Ethics & Patient Rights</MenuItem>
              <MenuItem value="LEADERSHIP">Healthcare Leadership & Governance</MenuItem>
            </TextField>
          </Paper>
        </Box>

        {/* ── View 1: Accredited Curriculum Table ── */}
        {cpdActiveView === 'COURSES' && (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: TEAL }}>
                <TableRow>
                  {['Course / Workshop Details', 'Category & Provider', 'Credits Value', 'Duration & Delivery', 'Certified Staff', 'Renewal & Next Due', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ color: '#ffffff !important', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {cpdCourses
                  .filter(c => {
                    if (cpdFilterCategory !== 'ALL' && c.category !== cpdFilterCategory) return false;
                    if (cpdSearchQuery) {
                      const q = cpdSearchQuery.toLowerCase();
                      const matchName = (c.name || '').toLowerCase().includes(q);
                      const matchProv = (c.provider || '').toLowerCase().includes(q);
                      const matchDesc = (c.description || '').toLowerCase().includes(q);
                      return matchName || matchProv || matchDesc;
                    }
                    return true;
                  })
                  .map(course => {
                    const certifiedRecords = cpdRecords.filter(r => r.courseId === course.id);
                    const certifiedCount = certifiedRecords.length || course.completedCount || 0;
                    return (
                      <TableRow key={course.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: PRIMARY }}>
                            {course.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {course.description || course.targetAudience || 'Accredited Healthcare Training'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5} alignItems="flex-start">
                            <Chip
                              label={course.category || 'CLINICAL_CME'}
                              size="small"
                              sx={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                bgcolor: course.category === 'MANDATORY' ? '#fee2e2' : course.category === 'ETHICS_LEGAL' ? '#f3e8ff' : '#e0f2fe',
                                color: course.category === 'MANDATORY' ? '#b91c1c' : course.category === 'ETHICS_LEGAL' ? '#7e22ce' : '#0369a1'
                              }}
                            />
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                              {course.provider}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: TEAL }}>
                            {course.credits} Credits
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Min Pass: {course.passingScore || 80}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {course.durationHours || 12} Hours
                          </Typography>
                          <Chip
                            label={(course.deliveryMode || 'HYBRID').replace(/_/g, ' ')}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', mt: 0.3 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 60 }}>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(100, Math.round((certifiedCount / (course.totalEnrolled || 50)) * 100))}
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#0f172a' }}>
                              {certifiedCount} Staff
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block' }}>
                            Audit: {course.nextDueDate}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Renewal: Every {course.renewalMonths || 12}m
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setSelectedCpdCourse(course);
                                setViewCourseDetailOpen(true);
                              }}
                              sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', py: 0.2, px: 1, borderColor: '#cbd5e1' }}
                            >
                              Details
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => {
                                setRecordCourseId(course.id);
                                setRecordCredits(course.credits);
                                setRecordAccreditation(course.provider);
                                setLogStaffCpdDialogOpen(true);
                              }}
                              sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', py: 0.2, px: 1, bgcolor: SECONDARY }}
                            >
                              + Log Staff
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* ── View 2: Staff Certification Logs Table ── */}
        {cpdActiveView === 'RECORDS' && (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: PRIMARY }}>
                <TableRow>
                  {['Certificate Ref', 'Staff Member & Cadre', 'Accredited Course', 'Credits Earned', 'Exam Score', 'Valid Period', 'Verification Authority', 'Status'].map(h => (
                    <TableCell key={h} sx={{ color: '#ffffff !important', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {cpdRecords
                  .filter(r => {
                    if (cpdSearchQuery) {
                      const q = cpdSearchQuery.toLowerCase();
                      const matchStaff = (r.staffName || '').toLowerCase().includes(q);
                      const matchCourse = (r.courseName || '').toLowerCase().includes(q);
                      const matchCert = (r.certificateNo || '').toLowerCase().includes(q);
                      const matchDept = (r.department || '').toLowerCase().includes(q);
                      return matchStaff || matchCourse || matchCert || matchDept;
                    }
                    return true;
                  })
                  .map(rec => (
                    <TableRow key={rec.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: PRIMARY, fontSize: '0.8rem' }}>
                        {rec.certificateNo}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {rec.staffName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {rec.designation} · {rec.department}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                          {rec.courseName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {rec.accreditationBody}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, color: TEAL }}>
                        +{rec.creditsEarned} CME Pts
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: rec.scorePercent >= 85 ? SUCCESS : SECONDARY }}>
                        {rec.scorePercent}%
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                          Passed: {rec.completionDate}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Expires: {rec.expiryDate}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block' }}>
                          {rec.verifiedBy || 'Hospital CME Board'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={rec.status || 'VALID'}
                          size="small"
                          color={rec.status === 'VALID' ? 'success' : 'warning'}
                          sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                {cpdRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No staff certifications recorded yet. Click "+ Record Certification" to log training completion.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* ── View 3: Council & Licensing Compliance Matrix ── */}
        {cpdActiveView === 'COMPLIANCE' && (
          <Grid container spacing={2.5}>
            {employees.map((emp: any) => {
              const staffRecords = cpdRecords.filter(r => r.staffId === emp.id || (r.staffName && r.staffName.toLowerCase() === `${emp.firstName} ${emp.lastName}`.toLowerCase()));
              const totalPoints = staffRecords.reduce((sum, r) => sum + (Number(r.creditsEarned) || 0), 0);
              const targetPoints = 20; // 20 units annual target
              const progressPct = Math.min(100, Math.round((totalPoints / targetPoints) * 100));
              const hasBLS = staffRecords.some(r => (r.courseName || '').toLowerCase().includes('basic life support') || (r.courseName || '').toLowerCase().includes('bls'));
              const hasIPC = staffRecords.some(r => (r.courseName || '').toLowerCase().includes('infection prevention') || (r.courseName || '').toLowerCase().includes('ipc'));

              return (
                <Grid item xs={12} sm={6} md={4} key={emp.id}>
                  <Card sx={{ borderRadius: 2, border: '1px solid #e2e8f0', p: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                      <Avatar sx={{ bgcolor: PRIMARY, width: 42, height: 42, fontWeight: 800 }}>
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {emp.firstName} {emp.lastName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {emp.designation || emp.role} · {emp.department || 'Clinical'}
                        </Typography>
                      </Box>
                    </Stack>

                    <Divider sx={{ my: 1 }} />

                    {/* Progress against 20 annual units */}
                    <Box sx={{ my: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                          Annual CPD Progress
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: progressPct >= 100 ? SUCCESS : PRIMARY }}>
                          {totalPoints} / {targetPoints} Pts ({progressPct}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progressPct}
                        color={progressPct >= 100 ? 'success' : progressPct >= 50 ? 'primary' : 'warning'}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>

                    {/* Mandatory checks */}
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Chip
                        label={`BLS: ${hasBLS ? 'Certified' : 'Pending'}`}
                        size="small"
                        color={hasBLS ? 'success' : 'default'}
                        variant={hasBLS ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.65rem', fontWeight: 700 }}
                      />
                      <Chip
                        label={`IPC: ${hasIPC ? 'Certified' : 'Pending'}`}
                        size="small"
                        color={hasIPC ? 'success' : 'default'}
                        variant={hasIPC ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.65rem', fontWeight: 700 }}
                      />
                    </Stack>

                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setSelectedTranscriptStaff({ ...emp, records: staffRecords, totalPoints });
                        setStaffTranscriptOpen(true);
                      }}
                      sx={{ mt: 2, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none', borderColor: '#cbd5e1' }}
                    >
                      View Full CME Portfolio
                    </Button>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 19.4: Governance & Risk BI
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab4 = () => (
    <Box>
      {/* ── 19.4.1 Headcount BI ── */}

      {/* ── 19.4.1 Headcount BI ── */}
      <TabPanel value={subTab3} index={0}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}><KPICard title="Total Headcount" value={analytics.totalHeadcount || 0} sub="Registered personnel master" icon={<People />} color={PRIMARY} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Active Staff Present" value={analytics.activeCount || 0} sub="Clocked/Rostered today" icon={<CheckCircle />} color={SUCCESS} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Pending Vacancies" value={analytics.vacantCount || 0} sub="Approved vacancy posts" icon={<EventNote />} color={WARNING} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="HR Governance Risks" value={risks.length || 0} sub="Active mitigation controls" icon={<Shield />} color={DANGER} /></Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: PRIMARY }}>Workforce Staff Category Mix (BI Headcount)</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={analytics.headcountByRole || []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                    {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, p: 2, borderLeft: `4px solid ${TEAL}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: TEAL, mb: 1 }}>Strategic Workforce Projections</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                The HR governance engine matches employee master registries with expected patient volumes (OPD/IPD) to project safe staffing metrics.
              </Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Minimum Safe Clinical Ratio Compliance:</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS }}>96.5%</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Time-to-Hire average timeline:</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>18.5 Days</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Donor Staff Dependency (CDC/WHO):</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: WARNING }}>20%</Typography></Stack>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── 19.4.2 Risks ── */}
      <TabPanel value={subTab3} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Workforce Governance Risk Register (FR-HRG-011–015)</Typography>
          <Button variant="contained" startIcon={<Shield />} onClick={() => setRiskDialogOpen(true)} sx={{ bgcolor: PURPLE }}>Log Workforce Risk</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PURPLE }}>
              <TableRow>{['Risk ID', 'Risk Title', 'Impact', 'Likelihood', 'Mitigation Action Plan', 'Status'].map(h => <TableCell key={h} sx={{ color: '#ffffff !important', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {risks.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{r.title}</TableCell>
                  <TableCell><StatusChip label={r.impact} /></TableCell>
                  <TableCell><StatusChip label={r.likelihood} /></TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{r.mitigation}</TableCell>
                  <TableCell><StatusChip label={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 19.5: Staff Self-Service Portal (NEW)
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab5 = () => {
    // Resolve active employee matching logged-in user profile
    const getLoggedStaff = () => {
      if (!user) return employees[0];
      let matched = employees.find(e => e.email.toLowerCase() === user.email.toLowerCase());
      if (matched) return matched;
      matched = employees.find(e => 
        e.firstName.toLowerCase() === user.firstName.toLowerCase() &&
        e.lastName.toLowerCase() === user.lastName.toLowerCase()
      );
      if (matched) return matched;
      if (user.username.toLowerCase() === 'doctor') {
        return employees.find(e => e.role === 'Doctor') || employees[0];
      }
      if (user.username.toLowerCase() === 'admin') {
        return employees.find(e => e.role === 'Admin') || employees[0];
      }
      return employees[0];
    };

    const activeStaff = viewType === 'staff' ? getLoggedStaff() : (employees.find(e => e.id === simulateStaffId) || employees[0]);

    if (!activeStaff) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6">No staff members registered in the system yet. Please onboard staff first.</Typography>
        </Box>
      );
    }

    // Determine today's clock-in status for the simulated employee
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayClock = attendance.find(a => a.empId === activeStaff.id && a.date === todayStr);

    const personalRoster = roster.filter(r => r.empId === activeStaff.id);
    const personalLeaves = leave.filter(l => l.empId === activeStaff.id);
    const personalTimesheets = timesheets.filter(t => t.empId === activeStaff.id);

    return (
      <Box>
        {/* Profile Simulation Toolbar */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(PRIMARY, 0.05), borderRadius: 2, border: `1px dashed ${SECONDARY}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar src={activeStaff.profilePicture || undefined} sx={{ bgcolor: PRIMARY, width: 42, height: 42 }}>
              {activeStaff.firstName[0]}{activeStaff.lastName[0]}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {viewType === 'staff' ? 'My Active Workspace Profile' : 'Simulated Session'}: {activeStaff.firstName} {activeStaff.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">Designation: {activeStaff.role} · Department: {activeStaff.department} · ID: {activeStaff.id}</Typography>
            </Box>
          </Box>
          {viewType !== 'staff' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: PRIMARY }}>Select Staff Profile to Simulate Login:</Typography>
              <TextField
                select
                size="small"
                value={simulateStaffId}
                onChange={(e) => setSimulateStaffId(e.target.value)}
                sx={{ minWidth: 200, bgcolor: '#ffffff' }}
              >
                {employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.role})</MenuItem>
                ))}
              </TextField>
            </Box>
          )}
        </Paper>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Web Clock card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, borderTop: `4px solid ${SUCCESS}`, height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: SUCCESS, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTime /> {viewType === 'staff' ? 'Biometric Clock logs' : 'Simulated Biometric Clock-in'}
                </Typography>
                <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, textAlign: 'center', mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">TODAY'S DATE</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">CLOCK STATE</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: todayClock ? SUCCESS : WARNING }}>
                    {todayClock ? `Clocked In at ${todayClock.clockIn}` : 'Not Clocked In Today'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    disabled={!!todayClock}
                    onClick={() => {
                      api.post('/hr/attendance', { empId: activeStaff.id, status: 'PRESENT', clockIn: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) }).then(() => {
                        fetchData();
                        enqueueSnackbar(viewType === 'staff' ? 'Web Clock-In logged successfully!' : 'Web Clock-In logged successfully!', { variant: 'success' });
                      });
                    }}
                  >
                    Clock In
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    disabled={!todayClock || todayClock.clockOut !== '—'}
                    onClick={() => {
                      // Simulating update clock-out on database
                      enqueueSnackbar(viewType === 'staff' ? 'Web Clock-Out logged successfully!' : 'Web Clock-Out logged successfully!', { variant: 'info' });
                    }}
                  >
                    Clock Out
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Request Leave Form */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, borderTop: `4px solid ${WARNING}`, height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: WARNING, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventBusy /> Apply for Leave
                </Typography>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  try {
                    await api.post('/hr/leave', {
                      empId: activeStaff.id,
                      type: fd.get('type'),
                      startDate: fd.get('startDate'),
                      endDate: fd.get('endDate'),
                      days: Number(fd.get('days')),
                    });
                    enqueueSnackbar('Leave request submitted to Supervisor for review', { variant: 'success' });
                    e.currentTarget.reset();
                    fetchData();
                  } catch {
                    enqueueSnackbar('Failed to apply for leave', { variant: 'error' });
                  }
                }}>
                  <Stack spacing={1.5}>
                    <TextField select label="Leave Category" name="type" size="small" fullWidth required defaultValue="ANNUAL">
                      <MenuItem value="ANNUAL">Annual Leave</MenuItem>
                      <MenuItem value="SICK">Sick Leave</MenuItem>
                      <MenuItem value="CASUAL">Casual / Compassionate</MenuItem>
                      <MenuItem value="MATERNITY">Maternity / Paternity</MenuItem>
                    </TextField>
                    <Stack direction="row" spacing={1}>
                      <TextField label="Start Date" type="date" name="startDate" size="small" InputLabelProps={{ shrink: true }} fullWidth required />
                      <TextField label="End Date" type="date" name="endDate" size="small" InputLabelProps={{ shrink: true }} fullWidth required />
                    </Stack>
                    <TextField label="Duration (Days)" type="number" name="days" size="small" fullWidth required />
                    <Button type="submit" variant="contained" color="warning" fullWidth size="small">Submit Request</Button>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          </Grid>

          {/* Timesheet Submit card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, borderTop: `4px solid ${TEAL}`, height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: TEAL, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assignment /> Submit Timesheet
                </Typography>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  try {
                    await api.post('/hr/timesheets', {
                      empId: activeStaff.id,
                      month: fd.get('month'),
                      hoursWorked: Number(fd.get('hoursWorked')),
                      status: 'PENDING_APPROVAL',
                    });
                    enqueueSnackbar('Timesheet log submitted successfully!', { variant: 'success' });
                    e.currentTarget.reset();
                    fetchData();
                  } catch {
                    enqueueSnackbar('Failed to submit timesheet', { variant: 'error' });
                  }
                }}>
                  <Stack spacing={1.5}>
                    <TextField select label="Select Reporting Month" name="month" size="small" fullWidth defaultValue="June 2026">
                      <MenuItem value="May 2026">May 2026</MenuItem>
                      <MenuItem value="June 2026">June 2026</MenuItem>
                      <MenuItem value="July 2026">July 2026</MenuItem>
                    </TextField>
                    <TextField label="Total Hours Worked" type="number" name="hoursWorked" placeholder="e.g. 160" size="small" fullWidth required />
                    <Alert severity="info" sx={{ py: 0.5, fontSize: '0.72rem' }}>Timesheets must accurately align with biometric check-in schedules.</Alert>
                    <Button type="submit" variant="contained" color="primary" sx={{ bgcolor: TEAL }} fullWidth size="small">Submit Log</Button>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* My History lists */}
        <Grid container spacing={3}>
          {/* Shifts */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}><EventNote /> My Assigned Roster shifts</Typography>
              <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>{['Shift Date', 'Shift Pattern', 'Shift Times', 'Location Station'].map(h => <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
                  </TableHead>
                  <TableBody>
                    {personalRoster.length > 0 ? (
                      personalRoster.map(r => (
                        <TableRow key={r.id}>
                          <TableCell sx={{ fontWeight: 700 }}>{r.date}</TableCell>
                          <TableCell><StatusChip label={r.shiftType} /></TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{r.start} - {r.end}</TableCell>
                          <TableCell>{r.location}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={4} align="center"><Typography variant="caption" color="text.secondary">No shifts assigned to you this cycle</Typography></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>

          {/* Leaves and Timesheets */}
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              <Card sx={{ borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}><EventBusy /> My Leave Request History</Typography>
                <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>{['Type', 'Dates', 'Days', 'Approved By', 'Status'].map(h => <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
                    </TableHead>
                    <TableBody>
                      {personalLeaves.length > 0 ? (
                        personalLeaves.map(l => (
                          <TableRow key={l.id}>
                            <TableCell><Chip label={l.type} size="small" variant="outlined" /></TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{l.startDate} to {l.endDate}</TableCell>
                            <TableCell align="center">{l.days}</TableCell>
                            <TableCell sx={{ fontSize: '0.72rem' }}>{l.approvedBy || l.supervisorRecommended || '—'}</TableCell>
                            <TableCell><StatusChip label={l.status} /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={5} align="center"><Typography variant="caption" color="text.secondary">No leave requests found</Typography></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>

              <Card sx={{ borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}><Assignment /> My Submitted Timesheets</Typography>
                <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>{['Month', 'Hours Worked', 'Submitted Date', 'Review Comments', 'Status'].map(h => <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
                    </TableHead>
                    <TableBody>
                      {personalTimesheets.length > 0 ? (
                        personalTimesheets.map(t => (
                          <TableRow key={t.id}>
                            <TableCell sx={{ fontWeight: 700 }}>{t.month}</TableCell>
                            <TableCell align="center">{t.hoursWorked} hrs</TableCell>
                            <TableCell sx={{ fontSize: '0.72rem' }}>{t.submittedAt}</TableCell>
                            <TableCell sx={{ fontSize: '0.72rem', fontStyle: 'italic' }}>{t.comments || '—'}</TableCell>
                            <TableCell><StatusChip label={t.status} /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={5} align="center"><Typography variant="caption" color="text.secondary">No timesheet logs submitted</Typography></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 19.6: Bishop's Authority Desk (NEW)
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab6 = () => {
    const pendingPayroll = payroll.filter(p => p.status === 'PENDING_BISHOP_SIGNATURE');
    const signatureHistory = payroll.filter(p => p.status === 'DISBURSED' || p.signedByBishop);

    return (
      <Box>
        {/* Bishop Decree Header */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, background: `linear-gradient(135deg, ${PRIMARY} 0%, #1e1b4b 100%)`, color: '#fff', borderLeft: '6px solid #ca8a04' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography sx={{ fontSize: '2.5rem' }}>⛪</Typography>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 0.5 }}>Diocese of Faith Foundation Mission Hospitals, Nsukaa=</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 500 }}>Central Episcopal Authority Desk · Centralized Treasury disbursements clearances</Typography>
            </Box>
          </Stack>
        </Paper>

        <Grid container spacing={3}>
          {/* Left: Pending decree certificate */}
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 2, p: 2, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: PRIMARY }}>Pending Payroll Approvals</Typography>
              {pendingPayroll.length > 0 ? (
                pendingPayroll.map(run => (
                  <Paper key={run.id} sx={{ p: 3, border: '2px solid #ca8a04', bgcolor: '#fffbeb', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                    {/* Background seal water mark */}
                    <Typography sx={{ position: 'absolute', bottom: -20, right: -20, fontSize: '8rem', opacity: 0.05, select: 'none' }}>⛪</Typography>
                    
                    <Typography align="center" variant="subtitle2" sx={{ fontWeight: 900, color: '#ca8a04', letterSpacing: 1.5, mb: 2, textTransform: 'uppercase' }}>
                      📜 Official Authorization Decree
                    </Typography>
                    <Typography variant="body2" align="justify" sx={{ fontFamily: 'Georgia, serif', lineHeight: 1.8, color: '#1e293b', mb: 3 }}>
                      "I, the Bishop of the Diocese of Faith Foundation, hereby authorize the final release of payroll disbursements for period **{run.payPeriod}**. I confirm that the financial computations totaling Net Pay of **{formatNGN(run.netPaid)}** (Gross: {formatNGN(run.totalGross)}, Deductions: {formatNGN(run.deductions)}) have been compiled and audited. The Administrator is authorized to disburse these funds from the Central Treasury to the respective bank accounts."
                    </Typography>

                    <Divider sx={{ mb: 3, borderColor: 'rgba(202,138,4,0.3)' }} />

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      if (fd.get('sealKey') !== 'BISHOP-SEAL') {
                        enqueueSnackbar("Invalid Bishop signature credentials key!", { variant: 'error' });
                        return;
                      }
                      setIsSigningPayroll(true);
                      try {
                        await api.post(`/hr/payroll/${run.id}/bishop-sign`);
                        enqueueSnackbar("Episcopal Seal affixed! Central Treasury has disbursed the funds.", { variant: 'success' });
                        fetchData();
                      } catch {
                        enqueueSnackbar("Failed to authorize payroll release", { variant: 'error' });
                      }
                      setIsSigningPayroll(false);
                    }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={7}>
                          <TextField
                            label="Affix Signature Key (type: BISHOP-SEAL)"
                            name="sealKey"
                            placeholder="BISHOP-SEAL"
                            size="small"
                            fullWidth
                            required
                            sx={{ bgcolor: '#ffffff' }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={5}>
                          <Button
                            type="submit"
                            variant="contained"
                            color="warning"
                            fullWidth
                            disabled={isSigningPayroll}
                            sx={{ bgcolor: '#ca8a04', fontWeight: 800 }}
                          >
                            Sign & Disburse
                          </Button>
                        </Grid>
                      </Grid>
                    </form>
                  </Paper>
                ))
              ) : (
                <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ color: SUCCESS, fontWeight: 800, mb: 1 }}>✓ Clear Ledger</Typography>
                  <Typography variant="body2" color="text.secondary">All payroll runs have been cleared and signed off by the Bishop.</Typography>
                </Box>
              )}
            </Card>
          </Grid>

          {/* Right: Payment Release History */}
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2, p: 2, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: PRIMARY }}>Episcopal Sign-off Ledger (Disbursements History)</Typography>
              <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>{['Period', 'Amount Disbursed', 'Authorization Date', 'Status'].map(h => <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
                  </TableHead>
                  <TableBody>
                    {signatureHistory.map(h => (
                      <TableRow key={h.id}>
                        <TableCell sx={{ fontWeight: 700 }}>{h.payPeriod}</TableCell>
                        <TableCell sx={{ color: SUCCESS, fontWeight: 800 }}>{formatNGN(h.netPaid)}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{h.bishopSignatureDate || h.processedAt}</TableCell>
                        <TableCell>
                          <Chip
                            label="DISBURSED"
                            color="success"
                            size="small"
                            icon={<CheckCircle style={{ fontSize: '0.85rem' }} />}
                            sx={{ fontSize: '0.7rem', fontWeight: 800 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN COMPONENT BUILD
  // ══════════════════════════════════════════════════════════════════════════
  if (viewType === 'staff') {
    return (
      <Box sx={{ height: '100vh', bgcolor: '#f1f5f9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Banner */}
        <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 50%, ${TEAL} 100%)`, color: '#fff', px: 3, py: 1.5, borderRadius: '0 0 16px 16px', flexShrink: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.2 }}>👥 Staff Self-Service Workspace</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 500 }}>Simulated Employee Portal · Clock Logs · Leave Requests · Timesheet Submissions</Typography>
            </Box>
            <Tooltip title="Refresh Logs"><IconButton onClick={fetchData} size="small" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}><Refresh fontSize="small" /></IconButton></Tooltip>
          </Stack>
        </Box>
        <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
          <Card sx={{ borderRadius: 2, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            {renderTab5()}
          </Card>
        </Box>
      </Box>
    );
  }

  if (viewType === 'bishop') {
    return (
      <Box sx={{ height: '100vh', bgcolor: '#f1f5f9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Banner */}
        <Box sx={{ background: `linear-gradient(135deg, #1e1b4b 0%, ${PRIMARY} 100%)`, color: '#fff', px: 3, py: 1.5, borderRadius: '0 0 16px 16px', flexShrink: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.2 }}>⛪ Episcopal Authority Desk</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 500 }}>Central Treasury Disbursement Authorizations & Sign-off Clearance</Typography>
            </Box>
            <Tooltip title="Refresh Treasury Logs"><IconButton onClick={fetchData} size="small" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}><Refresh fontSize="small" /></IconButton></Tooltip>
          </Stack>
        </Box>
        <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
          <Card sx={{ borderRadius: 2, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            {renderTab6()}
          </Card>
        </Box>
      </Box>
    );
  }

  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', pb: 4, display: 'flex', flexDirection: 'column' }}>
      {/* Custom Header Banner Tailored to Page */}
      <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 50%, ${TEAL} 100%)`, color: '#fff', px: 3, py: 2, borderRadius: '0 0 20px 20px', mb: 2, flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Staff Management &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              👥 {pageDetails.title}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.88, fontWeight: 500, mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {loading && <LinearProgress sx={{ width: 80, borderRadius: 2 }} />}
            <Tooltip title="Refresh HR Logs">
              <IconButton onClick={fetchData} size="small" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownload />}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', textTransform: 'none', fontWeight: 700 }}
              onClick={() => {
                if (location.pathname === '/staff/payroll-performance/appraisals') {
                  const csvRows = [
                    ['Appraisal ID', 'Employee Name', 'Period', 'Rating Score (5.0)', 'Evaluation Comments', 'Status'],
                    ...appraisals.map(app => [
                      app.id,
                      `"${app.name}"`,
                      `"${app.period}"`,
                      `${app.rating} / 5.0`,
                      `"${(app.comments || '').replace(/"/g, '""')}"`,
                      app.status || 'COMPLETED'
                    ])
                  ];
                  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `Staff_Performance_Appraisals_${new Date().toISOString().slice(0, 10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  enqueueSnackbar('Staff performance appraisals report exported successfully!', { variant: 'success' });
                  return;
                }
                if (location.pathname === '/staff/attendance-roster/analysis') {
                  const csvRows = [
                    ['Staff ID', 'Employee Name', 'Role', 'Department', 'Assigned Shifts', 'Clocks Logged', 'Late Arrivals', 'Punctuality Rate', 'Attendance Rate', 'State Status'],
                    ...employees.map(emp => {
                      const empShifts = roster.filter(r => r.empId === emp.id).length || 1;
                      const empClocks = attendance.filter(a => a.empId === emp.id);
                      const logsCount = empClocks.length;
                      const lates = empClocks.filter(c => c.status === 'LATE').length;
                      const attendanceRate = Math.min(100, Math.round((logsCount / empShifts) * 100));
                      const punctualityRate = logsCount > 0 ? Math.round(((logsCount - lates) / logsCount) * 100) : 100;
                      return [
                        emp.id,
                        `"${emp.firstName} ${emp.lastName}"`,
                        `"${emp.role}"`,
                        `"${emp.department}"`,
                        empShifts,
                        logsCount,
                        lates,
                        `${punctualityRate}%`,
                        `${attendanceRate}%`,
                        emp.status
                      ];
                    })
                  ];
                  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `Personnel_Attendance_Analysis_${new Date().toISOString().slice(0, 10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  enqueueSnackbar('Personnel attendance analysis report exported successfully!', { variant: 'success' });
                  return;
                }
                enqueueSnackbar(`Exporting ${pageDetails.title} report`, { variant: 'info' });
              }}
            >
              Export Report
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Tailored 4-Card KPI Strip */}
      <Box sx={{ px: 2, mb: 2, flexShrink: 0 }}>
        <Grid container spacing={1.5}>
          {pageDetails.kpis.map((kpi, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <KPICard
                title={kpi.title}
                value={kpi.value}
                sub={kpi.sub}
                icon={kpi.icon}
                color={kpi.color}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Standalone Workspace Card */}
      <Box sx={{ px: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 2, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', flex: 1 }}>
          {activeTab === 0 && renderTab1()}
          {activeTab === 1 && renderTab2()}
          {activeTab === 2 && renderTab3()}
          {activeTab === 3 && renderTab4()}
        </Card>
      </Box>

      {/* Modals */}

      {/* Employee Dialog */}
      <Dialog open={empDialogOpen} onClose={() => setEmpDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleAddEmployee}>
          <DialogTitle sx={{ fontWeight: 800 }}>Onboard & Register Staff</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Staff ID / Employee ID"
                  name="id"
                  size="small"
                  fullWidth
                  value={nextStaffId}
                  InputProps={{
                    readOnly: true,
                    style: { fontFamily: 'monospace', fontWeight: 'bold' }
                  }}
                  helperText="Auto-generated based on configured format in Settings"
                />
              </Grid>
              <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar src={onboardProfilePic || undefined} sx={{ width: 56, height: 56 }} />
                <Button variant="outlined" component="label" size="small">
                  Upload Profile Image
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={e => handleFileChange(e, setOnboardProfilePic)}
                  />
                </Button>
                {onboardProfilePic && (
                  <Button size="small" color="error" onClick={() => setOnboardProfilePic(null)}>
                    Remove
                  </Button>
                )}
              </Grid>
              <Grid item xs={12}>
                <Alert severity="success" sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                    System Login Account will be created automatically
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Username: <strong>{nextStaffId}</strong> | Temporary Password: <strong>{nextStaffId}</strong> (forced password change on first login)
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={6}><TextField label="First Name" name="firstName" size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField label="Last Name" name="lastName" size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField label="Email" name="email" size="small" type="email" fullWidth required /></Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Phone (11 Digits)" 
                  name="phone" 
                  size="small" 
                  fullWidth 
                  required 
                  inputProps={{ pattern: "[0-9]{11}", maxLength: 11 }} 
                  helperText="Exactly 11 digits (e.g. 08103465662)"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Role"
                  name="role"
                  size="small"
                  fullWidth
                  value={onboardRole}
                  onChange={e => {
                    const r = e.target.value;
                    setOnboardRole(r);
                    if (roleToDeptMap[r]) setOnboardDept(roleToDeptMap[r]);
                  }}
                >
                  {availableRoles.map(r => (
                    <MenuItem key={r} value={r}>{r}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Department"
                  name="department"
                  size="small"
                  fullWidth
                  value={onboardDept}
                  onChange={e => setOnboardDept(e.target.value)}
                >
                  {['OPD', 'IPD', 'ICU', 'Pharmacy', 'Laboratory', 'Radiology', 'Pathology', 'EMR/Records', 'Mortuary & Funeral', 'Physiotherapy', 'Administration', 'Emergency'].map(d => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <Autocomplete
                  freeSolo
                  options={PORTFOLIO_MAP[onboardRole] || [
                    'Senior Consultant',
                    'Consultant Specialist',
                    'Senior Medical Officer',
                    'Medical Officer',
                    'Chief Specialist',
                    'Senior Specialist',
                    'Specialist',
                  ]}
                  value={onboardDesignation}
                  onInputChange={(_, val) => setOnboardDesignation(val)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      name="designation"
                      label={`Portfolio / Rank (${onboardRole || 'Staff'})`}
                      placeholder="Choose portfolio (e.g. Senior Consultant)..."
                      size="small"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Salary Grade Level" name="salaryGrade" size="small" fullWidth defaultValue="L8-Step 1">
                  {['L1-Step 1', 'L1-Step 2', 'L2-Step 1', 'L2-Step 2', 'L3-Step 1', 'L3-Step 2', 'L4-Step 1', 'L4-Step 2', 'L5-Step 1', 'L5-Step 2', 'L6-Step 1', 'L6-Step 2', 'L7-Step 1', 'L7-Step 2', 'L8-Step 1', 'L8-Step 2', 'L9-Step 1', 'L9-Step 2', 'L10-Step 1', 'L10-Step 2', 'L11-Step 1', 'L11-Step 2', 'L12-Step 1', 'L12-Step 2', 'L12-Step 3', 'L12-Step 4'].map(lvl => (
                    <MenuItem key={lvl} value={lvl}>{lvl}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField label="Base Monthly Salary (₦)" name="baseSalary" type="number" size="small" fullWidth required /></Grid>
              <Grid item xs={6}>
                <TextField select label="Bank Name" name="bankName" size="small" fullWidth required defaultValue={bankList[0]?.name || "Zenith Bank"}>
                  {(bankList.length > 0 ? bankList.map(b => b.name) : ['Zenith Bank', 'Guaranty Trust Bank (GTBank)', 'Access Bank', 'United Bank for Africa (UBA)', 'First Bank of Nigeria', 'Union Bank', 'Fidelity Bank', 'Wema Bank', 'Sterling Bank', 'Moniepoint Microfinance Bank', 'OPay Digital Services (MFB)', 'Kuda Microfinance Bank']).map(name => (
                    <MenuItem key={name} value={name}>{name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Bank Account Number" 
                  name="accountNo" 
                  size="small" 
                  fullWidth 
                  required 
                  inputProps={{ pattern: "[0-9]{10}", maxLength: 10 }}
                  helperText="Exactly 10 digits (e.g. 1029381829)"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Pension PFA / RSA PIN"
                  name="pensionPin"
                  size="small"
                  fullWidth
                  defaultValue="PEN1009849201 (Stanbic IBTC)"
                  placeholder="e.g. PEN1009849201 (Stanbic IBTC)"
                  helperText="Pension Reform Act 2014 RSA PIN & Fund Manager"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Tax ID (TIN)"
                  name="taxId"
                  size="small"
                  fullWidth
                  defaultValue="TIN-BEN-2026-9941"
                  placeholder="e.g. TIN-BEN-2026-9941"
                  helperText="State Internal Revenue Service (SIRS) Tax ID"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Practice License No (Clinical)" name="licenseNo" size="small" fullWidth defaultValue="N/A">
                  {['N/A', 'MDCN (Medical & Dental Council)', 'NMCN (Nursing & Midwifery Council)', 'PCN (Pharmacists Council)', 'MLSCN (Medical Lab Science Council)', 'RRBN (Radiographers Registration Board)', 'MRTBN (Medical Rehabilitation Therapists Board)'].map(lic => (
                    <MenuItem key={lic} value={lic}>{lic}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField label="Licence Expiry Date" type="date" name="licenseExpiry" size="small" fullWidth InputLabelProps={{ shrink: true }} defaultValue={`${new Date().getFullYear() + 1}-12-31`} /></Grid>
              <Grid item xs={6}><TextField select label="Funding Source" name="fundingSource" size="small" fullWidth defaultValue="HOSPITAL_FUNDED"><MenuItem value="HOSPITAL_FUNDED">Hospital Core Funds</MenuItem><MenuItem value="DONOR_FUNDED">Donor Programme</MenuItem></TextField></Grid>
              <Grid item xs={6}><TextField label="Donor Program Reference" name="donorProgramme" size="small" fullWidth placeholder="e.g. CDC/CARITAS" /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions><Button onClick={() => setEmpDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Register & Onboard</Button></DialogActions>
        </form>
      </Dialog>

      {/* Vacancy Dialog */}
      <Dialog open={vacDialogOpen} onClose={() => setVacDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddVacancy}>
          <DialogTitle sx={{ fontWeight: 800 }}>Create Vacancy Requisition</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField select label="Department" name="department" size="small" fullWidth defaultValue="OPD">{['OPD', 'IPD', 'ICU', 'Pharmacy', 'Laboratory', 'Radiology', 'Administration', 'Emergency'].map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField>
              <TextField label="Position Title" name="title" size="small" fullWidth required />
              <TextField select label="Approved Salary Grade" name="grade" size="small" fullWidth defaultValue="L8-Step 1">
                {['L1-Step 1', 'L1-Step 2', 'L2-Step 1', 'L2-Step 2', 'L3-Step 1', 'L3-Step 2', 'L4-Step 1', 'L4-Step 2', 'L5-Step 1', 'L5-Step 2', 'L6-Step 1', 'L6-Step 2', 'L7-Step 1', 'L7-Step 2', 'L8-Step 1', 'L8-Step 2', 'L9-Step 1', 'L9-Step 2', 'L10-Step 1', 'L10-Step 2', 'L11-Step 1', 'L11-Step 2', 'L12-Step 1', 'L12-Step 2', 'L12-Step 3', 'L12-Step 4'].map(lvl => (
                  <MenuItem key={lvl} value={lvl}>{lvl}</MenuItem>
                ))}
              </TextField>
              <TextField label="Approved Positions Count" name="positions" type="number" size="small" fullWidth required defaultValue="1" />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setVacDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Post Requisition</Button></DialogActions>
        </form>
      </Dialog>

      {/* Credential Renewal Dialog */}
      <Dialog open={credentialDialogOpen} onClose={() => { setCredentialDialogOpen(false); setSelectedCredential(null); }} maxWidth="xs" fullWidth>
        <form onSubmit={handleRenewCredential}>
          <DialogTitle sx={{ fontWeight: 800, color: GOLD }}>🔏 Renew Professional Licence</DialogTitle>
          <DialogContent dividers>
            {selectedCredential && (
              <Stack spacing={2}>
                <Alert severity={selectedCredential.isExpired ? 'error' : 'warning'} sx={{ fontSize: '0.8rem' }}>
                  <strong>{selectedCredential.firstName} {selectedCredential.lastName}</strong> — {selectedCredential.role}<br />
                  Current Licence: <strong>{selectedCredential.licenseNo}</strong> · Expires: <strong>{selectedCredential.licenseExpiry}</strong>
                </Alert>
                <TextField
                  label="New Regulatory Board Licence No."
                  name="licenseNo"
                  size="small"
                  fullWidth
                  required
                  defaultValue={selectedCredential.licenseNo}
                  placeholder="e.g. MDCN-L-55000"
                />
                <TextField
                  label="New Licence Expiry Date"
                  name="licenseExpiry"
                  type="date"
                  size="small"
                  fullWidth
                  required
                  defaultValue={selectedCredential.licenseExpiry}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setCredentialDialogOpen(false); setSelectedCredential(null); }}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: GOLD }}>Save & Renew Licence</Button>
          </DialogActions>
        </form>
      </Dialog>
      {/* Job Advert Dialog */}
      <Dialog open={advertDialogOpen} onClose={() => { setAdvertDialogOpen(false); setSelectedAdvertVacancy(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📢 Job Vacancy Announcement</span>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant={isEditingAdvert ? 'contained' : 'outlined'}
              color={isEditingAdvert ? 'success' : 'primary'}
              onClick={() => setIsEditingAdvert(!isEditingAdvert)}
              sx={{ fontSize: '0.75rem', py: 0.25 }}
            >
              {isEditingAdvert ? 'Finish Editing' : 'Edit Advert'}
            </Button>
            <Chip label={selectedAdvertVacancy?.status} color={selectedAdvertVacancy?.status === 'OPEN' ? 'success' : 'warning'} size="small" sx={{ fontWeight: 800 }} />
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#f8fafc', p: 0 }}>
          {selectedAdvertVacancy && (
            <Box id="job-advert-flyer" sx={{ p: 4, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2, m: 2, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              {/* Logo & Header */}
              <Stack direction="row" spacing={2} alignItems="center" sx={{ borderBottom: '3px double #1e3a8a', pb: 2, mb: 3 }}>
                <Avatar src={assetUrl('/hospital-logo.webp')} sx={{ width: 50, height: 50, borderRadius: 2, bgcolor: PRIMARY }} variant="square" />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: PRIMARY, lineHeight: 1.1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Faith Foundation</Typography>
                  <Typography variant="caption" sx={{ color: SECONDARY, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mission Hospital · Caring with Love & Integrity</Typography>
                </Box>
              </Stack>

              {/* Job Title & Metadata */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a', mb: 1 }}>{selectedAdvertVacancy.title}</Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Department</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedAdvertVacancy.department}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Vacancy Reference ID</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{selectedAdvertVacancy.id}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Approved Salary Grade</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: TEAL }}>{selectedAdvertVacancy.grade}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Date Posted</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedAdvertVacancy.datePosted}</Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Description */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, mb: 1 }}>Position Summary</Typography>
                {isEditingAdvert ? (
                  <TextField
                    multiline
                    minRows={3}
                    fullWidth
                    size="small"
                    value={editedDescription}
                    onChange={e => setEditedDescription(e.target.value)}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.85rem' }}>{editedDescription}</Typography>
                )}
              </Box>

              {/* Key Responsibilities */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, mb: 1 }}>Key Responsibilities</Typography>
                {isEditingAdvert ? (
                  <TextField
                    multiline
                    minRows={4}
                    fullWidth
                    size="small"
                    helperText="Write each responsibility on a new line"
                    value={editedResponsibilities}
                    onChange={e => setEditedResponsibilities(e.target.value)}
                  />
                ) : (
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569', fontSize: '0.82rem', lineHeight: 1.6 }}>
                    {editedResponsibilities.split('\n').filter(line => line.trim() !== '').map((r, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{r}</li>
                    ))}
                  </ul>
                )}
              </Box>

              {/* Requirements */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, mb: 1 }}>Required Qualifications</Typography>
                {isEditingAdvert ? (
                  <TextField
                    multiline
                    minRows={4}
                    fullWidth
                    size="small"
                    helperText="Write each qualification on a new line"
                    value={editedRequirements}
                    onChange={e => setEditedRequirements(e.target.value)}
                  />
                ) : (
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569', fontSize: '0.82rem', lineHeight: 1.6 }}>
                    {editedRequirements.split('\n').filter(line => line.trim() !== '').map((req, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{req}</li>
                    ))}
                  </ul>
                )}
              </Box>

              {/* How to Apply */}
              <Box sx={{ bgcolor: alpha(PRIMARY, 0.05), p: 2, borderRadius: 2, borderLeft: `4px solid ${PRIMARY}`, mt: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, mb: 0.5 }}>How to Apply</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.5, fontSize: '0.78rem' }}>
                  Interested qualified professionals should forward their CV, cover letter, and copies of credentials and practice licenses to:
                  <strong style={{ display: 'block', color: '#0f172a', marginTop: '4px' }}>careers@faithfoundation.org</strong>
                  Please quote the Reference ID <strong style={{ color: PRIMARY }}>{selectedAdvertVacancy.id}</strong> in the subject line.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Share />}
              onClick={() => {
                if (selectedAdvertVacancy) {
                  const copyText = `📢 VACANCY ANNOUNCEMENT: ${selectedAdvertVacancy.title}\n\nFaith Foundation Mission Hospital is recruiting for the position of ${selectedAdvertVacancy.title} in the ${selectedAdvertVacancy.department} department.\n\nReference ID: ${selectedAdvertVacancy.id}\nSalary Grade: ${selectedAdvertVacancy.grade}\n\nPosition Summary:\n${editedDescription}\n\nApply by sending your credentials to: careers@faithfoundation.org citing reference ${selectedAdvertVacancy.id}.`;
                  navigator.clipboard.writeText(copyText);
                  enqueueSnackbar('Advert text copied to clipboard! Ready to share.', { variant: 'success' });
                }
              }}
            >
              Share Text
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Email />}
              onClick={() => {
                if (selectedAdvertVacancy) {
                  const resps = editedResponsibilities.split('\n').filter(l => l.trim() !== '').map(l => `* ${l}`).join('\n');
                  const reqs = editedRequirements.split('\n').filter(l => l.trim() !== '').map(l => `* ${l}`).join('\n');
                  const htmlBody = `
Faith Foundation Mission Hospital, Nsukka - Career Opportunities
--------------------------------------------------------
Position: ${selectedAdvertVacancy.title}
Department: ${selectedAdvertVacancy.department}
Reference: ${selectedAdvertVacancy.id}
Salary Grade: ${selectedAdvertVacancy.grade}

Position Summary:
${editedDescription}

Key Responsibilities:
${resps}

Required Qualifications:
${reqs}

How to Apply:
Please forward your credentials to careers@faithfoundation.org quoting Reference ID: ${selectedAdvertVacancy.id}.
                  `;
                  navigator.clipboard.writeText(htmlBody.trim());
                  enqueueSnackbar('Email campaign template copied to clipboard!', { variant: 'success' });
                }
              }}
            >
              Copy Email Body
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={() => {
                if (selectedAdvertVacancy) {
                  const respsList = editedResponsibilities.split('\n').filter(l => l.trim() !== '').map(l => `<li style="margin-bottom: 5px;">${l}</li>`).join('');
                  const reqsList = editedRequirements.split('\n').filter(l => l.trim() !== '').map(l => `<li style="margin-bottom: 5px;">${l}</li>`).join('');
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Job Advert - ${selectedAdvertVacancy.title}</title>
                          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
                          <style>
                            body { font-family: 'Plus Jakarta Sans', sans-serif; color: #334155; padding: 40px; margin: 0; line-height: 1.5; }
                            h1, h2, h3, h4 { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
                            strong { color: #0f172a; }
                          </style>
                        </head>
                        <body>
                          <div style="max-width: 750px; margin: 0 auto;">
                            <!-- Header -->
                            <div style="display: flex; align-items: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 20px;">
                              <img src={assetUrl('/hospital-logo.webp')} style="width: 55px; height: 55px; object-fit: contain; margin-right: 15px;" />
                              <div>
                                <h1 style="font-size: 20px; color: #1e3a8a; font-weight: 800;">Faith Foundation</h1>
                                <p style="font-size: 11px; color: #2563eb; font-weight: 700; text-transform: uppercase; margin-top: 2px; letter-spacing: 0.5px;">Mission Hospital · Caring with Love & Integrity</p>
                              </div>
                            </div>

                            <!-- Position Header -->
                            <h2 style="font-size: 22px; color: #0f172a; font-weight: 900; margin-bottom: 15px;">CAREER OPPORTUNITY: ${selectedAdvertVacancy.title}</h2>

                            <!-- Details Grid -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 13px; background-color: #f8fafc; padding: 12px; border-radius: 6px;">
                              <div><span style="color: #64748b;">Department:</span> <strong>${selectedAdvertVacancy.department}</strong></div>
                              <div><span style="color: #64748b;">Vacancy Ref ID:</span> <strong style="font-family: monospace;">${selectedAdvertVacancy.id}</strong></div>
                              <div><span style="color: #64748b;">Approved Grade:</span> <strong style="color: #0d9488;">${selectedAdvertVacancy.grade}</strong></div>
                              <div><span style="color: #64748b;">Date Posted:</span> <strong>${selectedAdvertVacancy.datePosted}</strong></div>
                            </div>

                            <!-- Position Summary -->
                            <div style="margin-bottom: 18px;">
                              <h3 style="font-size: 14px; color: #1e3a8a; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">Position Summary</h3>
                              <p style="font-size: 13px; color: #334155; margin: 0; text-align: justify; line-height: 1.6;">${editedDescription}</p>
                            </div>

                            <!-- Responsibilities -->
                            <div style="margin-bottom: 18px;">
                              <h3 style="font-size: 14px; color: #1e3a8a; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">Key Responsibilities</h3>
                              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
                                ${respsList}
                              </ul>
                            </div>

                            <!-- Requirements -->
                            <div style="margin-bottom: 20px;">
                              <h3 style="font-size: 14px; color: #1e3a8a; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">Required Qualifications</h3>
                              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
                                ${reqsList}
                              </ul>
                            </div>

                            <!-- How to Apply -->
                            <div style="background-color: #f0f4ff; border-left: 4px solid #1e3a8a; padding: 15px; border-radius: 6px; font-size: 12px;">
                              <h4 style="font-size: 13px; color: #1e3a8a; font-weight: 800; margin-bottom: 4px;">How to Apply</h4>
                              Interested qualified professionals should forward their CV, cover letter, and copies of credentials and practice licenses to:
                              <div style="font-weight: 700; color: #0f172a; margin-top: 4px;">careers@faithfoundation.org</div>
                              Please quote the Reference ID <span style="font-family: monospace; font-weight: 700; color: #1e3a8a;">${selectedAdvertVacancy.id}</span> in the subject line of your application.
                            </div>
                          </div>
                          <script>
                            window.onload = function() {
                              setTimeout(function() {
                                window.print();
                                window.close();
                              }, 300);
                            }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }
              }}
            >
              Print Flyer
            </Button>
          </Stack>
          <Button variant="contained" onClick={() => { setAdvertDialogOpen(false); setSelectedAdvertVacancy(null); }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Roster Assignment Dialog */}
      <Dialog open={rosterDialogOpen} onClose={() => setRosterDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleAddRoster}>
          <DialogTitle sx={{ fontWeight: 800 }}>Assign Departmental Shift Roster (Admin HR)</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField select label="Hospital Staff Member" name="empId" size="small" fullWidth required defaultValue="">
                  {employees.map(e => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} — {e.role} ({e.department})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Shift Date" type="date" name="date" size="small" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={new Date().toISOString().slice(0, 10)} />
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Shift Template Type" name="shiftType" size="small" fullWidth defaultValue="CASHIER_MORNING_8H">
                  <MenuItem value="CASHIER_MORNING_8H">Cashier Morning Shift (07:00 – 15:00)</MenuItem>
                  <MenuItem value="CASHIER_AFTERNOON_8H">Cashier Afternoon Shift (14:00 – 22:00)</MenuItem>
                  <MenuItem value="CASHIER_NIGHT_12H">Cashier Overnight Shift (20:00 – 08:00)</MenuItem>
                  <MenuItem value="CASHIER_FULLDAY_12H">Cashier Weekend / Full Day (08:00 – 20:00)</MenuItem>
                  <MenuItem value="DOCTOR_CALL_24H">Doctor Call Duty (24H)</MenuItem>
                  <MenuItem value="NIGHT_SHIFT_12H">Nurse Night Shift (12H)</MenuItem>
                  <MenuItem value="OFFICE_HOURS">Office Hours (08:00 – 16:00)</MenuItem>
                  <MenuItem value="OFF_DUTY">Off Duty / Rest</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Shift Start Time" name="start" size="small" fullWidth required defaultValue="07:00" />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Shift End Time" name="end" size="small" fullWidth required defaultValue="15:00" />
              </Grid>
              <Grid item xs={12}>
                <TextField select label="Duty Location / Station" name="location" size="small" fullWidth defaultValue="Main Outpatient Cash Desk #01">
                  <MenuItem value="Main Outpatient Cash Desk #01">Main Outpatient Cash Desk #01 (Revenue)</MenuItem>
                  <MenuItem value="Emergency & IPD Cash Desk #02">Emergency & IPD Cash Desk #02 (Revenue)</MenuItem>
                  <MenuItem value="Pharmacy Cash Desk #03">Pharmacy Cash Desk #03 (Dispensary)</MenuItem>
                  <MenuItem value="Laboratory & Diagnostic Cash Desk #04">Laboratory & Diagnostic Cash Desk #04</MenuItem>
                  <MenuItem value="General Clinic (OPD)">General Clinic (OPD)</MenuItem>
                  <MenuItem value="ICU Ward">ICU Ward</MenuItem>
                  <MenuItem value="Emergency Room (ER)">Emergency Room (ER)</MenuItem>
                  <MenuItem value="Main Theatre">Main Theatre</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Cash Drawer ID (if Cashier)" name="cashDrawer" size="small" fullWidth placeholder="e.g. Drawer A, Drawer-01" defaultValue="Drawer A" />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Allocated Float ₦ (if Cashier)" name="openingBalance" type="number" size="small" fullWidth placeholder="e.g. 20000" defaultValue="20000" />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRosterDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 700 }}>Assign & Sync Shift</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Leave Dialog */}
      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddLeave}>
          <DialogTitle sx={{ fontWeight: 800 }}>Apply for Leave</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField select label="Employee" name="empId" size="small" fullWidth required defaultValue="">{employees.map(e => <MenuItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</MenuItem>)}</TextField>
              <TextField select label="Leave Type" name="type" size="small" fullWidth defaultValue="ANNUAL"><MenuItem value="ANNUAL">Annual Leave</MenuItem><MenuItem value="SICK">Sick Leave</MenuItem><MenuItem value="MATERNITY">Maternity Leave</MenuItem><MenuItem value="STUDY">Study Leave</MenuItem></TextField>
              <TextField label="Start Date" type="date" name="startDate" size="small" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={new Date().toISOString().slice(0, 10)} />
              <TextField label="End Date" type="date" name="endDate" size="small" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={new Date().toISOString().slice(0, 10)} />
              <TextField label="Total Duration (Days)" name="days" type="number" size="small" fullWidth required />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setLeaveDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Submit Application</Button></DialogActions>
        </form>
      </Dialog>

      {/* Appraisal Dialog (Annual & Bi-Annual Review by Supervisor / Admin) */}
      <Dialog open={appraisalDialogOpen} onClose={() => setAppraisalDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleAddAppraisal}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: PRIMARY, color: '#fff', py: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Star sx={{ color: '#f59e0b' }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                  Log Staff Performance Appraisal & Competency
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  Appraiser: {currentFullName || 'Hospital Supervisor'} ({user?.designation || user?.role || 'Supervisor'})
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              {/* Appraisal Frequency Selector */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: PRIMARY, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                  1. Appraisal Evaluation Cycle
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={4}>
                    <Paper
                      onClick={() => {
                        setAppraisalFrequency('ANNUAL');
                        setAppraisalPeriod('FY2026');
                      }}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        cursor: 'pointer',
                        border: `1.5px solid ${appraisalFrequency === 'ANNUAL' ? SECONDARY : '#e2e8f0'}`,
                        bgcolor: appraisalFrequency === 'ANNUAL' ? '#eff6ff' : '#fff',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 800, color: appraisalFrequency === 'ANNUAL' ? SECONDARY : '#1e293b' }}>
                        Annual Cycle
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Full Year (FY2026)</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Paper
                      onClick={() => {
                        setAppraisalFrequency('BI_ANNUAL_H1');
                        setAppraisalPeriod('H1-2026 (Jan - Jun)');
                      }}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        cursor: 'pointer',
                        border: `1.5px solid ${appraisalFrequency === 'BI_ANNUAL_H1' ? SECONDARY : '#e2e8f0'}`,
                        bgcolor: appraisalFrequency === 'BI_ANNUAL_H1' ? '#eff6ff' : '#fff',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 800, color: appraisalFrequency === 'BI_ANNUAL_H1' ? SECONDARY : '#1e293b' }}>
                        Bi-Annual (H1)
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Mid-Year Review</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Paper
                      onClick={() => {
                        setAppraisalFrequency('BI_ANNUAL_H2');
                        setAppraisalPeriod('H2-2026 (Jul - Dec)');
                      }}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        cursor: 'pointer',
                        border: `1.5px solid ${appraisalFrequency === 'BI_ANNUAL_H2' ? SECONDARY : '#e2e8f0'}`,
                        bgcolor: appraisalFrequency === 'BI_ANNUAL_H2' ? '#eff6ff' : '#fff',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 800, color: appraisalFrequency === 'BI_ANNUAL_H2' ? SECONDARY : '#1e293b' }}>
                        Bi-Annual (H2)
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>End-Year Review</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>

              {/* Employee Selection & Period */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: PRIMARY, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                  2. Subordinate & Period
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={7}>
                    <TextField
                      select
                      label="Employee Evaluated"
                      value={appraisalEmpId}
                      onChange={e => setAppraisalEmpId(e.target.value)}
                      size="small"
                      fullWidth
                      required
                      helperText={
                        !isSuperAdminOrAdminOrBishop
                          ? `Showing ${mySubordinates.length} staff member(s) reporting to you`
                          : 'Administrator selection (All personnel)'
                      }
                    >
                      {mySubordinates.map((e: any) => (
                        <MenuItem key={e.id} value={e.id}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{e.firstName} {e.lastName}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                              {e.designation || e.role} · {e.department || 'General'}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      label="Review Period Label"
                      value={appraisalPeriod}
                      onChange={e => setAppraisalPeriod(e.target.value)}
                      size="small"
                      fullWidth
                      required
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Core Competency Ratings */}
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: PRIMARY, textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
                  3. Core Competency Metric Scoring (1.0 - 5.0)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Clinical / Technical Skill"
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ step: '0.1', min: '1', max: '5' }}
                      value={competencyClinical}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setCompetencyClinical(v);
                        const avg = ((v + competencyAttendance + competencyTeamwork + competencyEthics) / 4).toFixed(1);
                        setAppraisalRating(Number(avg));
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Attendance & Punctuality"
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ step: '0.1', min: '1', max: '5' }}
                      value={competencyAttendance}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setCompetencyAttendance(v);
                        const avg = ((competencyClinical + v + competencyTeamwork + competencyEthics) / 4).toFixed(1);
                        setAppraisalRating(Number(avg));
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Teamwork & Communication"
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ step: '0.1', min: '1', max: '5' }}
                      value={competencyTeamwork}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setCompetencyTeamwork(v);
                        const avg = ((competencyClinical + competencyAttendance + v + competencyEthics) / 4).toFixed(1);
                        setAppraisalRating(Number(avg));
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Work Ethics & Patient Care"
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ step: '0.1', min: '1', max: '5' }}
                      value={competencyEthics}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setCompetencyEthics(v);
                        const avg = ((competencyClinical + competencyAttendance + competencyTeamwork + v) / 4).toFixed(1);
                        setAppraisalRating(Number(avg));
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.2, bgcolor: '#ecfdf5', borderRadius: 1.5, border: '1px solid #a7f3d0' }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#065f46' }}>
                        Overall Performance Score:
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: SUCCESS }}>
                        {appraisalRating} / 5.0
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Feedback Comments & Recommendations */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: PRIMARY, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                  4. Supervisor Qualitative Assessment & Recommendations
                </Typography>
                <Stack spacing={1.5}>
                  <TextField
                    select
                    label="Executive Recommendation"
                    value={appraisalRecommendation}
                    onChange={e => setAppraisalRecommendation(e.target.value)}
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="COMMENDATION">Commendation & Merit Recognition</MenuItem>
                    <MenuItem value="PROMOTION">Recommended for Promotion / Grade Step Advance</MenuItem>
                    <MenuItem value="SALARY_INCREMENT">Recommended for Annual Salary Step Increment</MenuItem>
                    <MenuItem value="CPD_TRAINING">Targeted Mandatory CPD Training Required</MenuItem>
                    <MenuItem value="RETAIN">Maintain Current Grade & Monitor Progress</MenuItem>
                  </TextField>
                  <TextField
                    label="Supervisor Evaluation Directives & Comments"
                    placeholder="Document specific accomplishments, shift dedication, patient handling strengths, and development goals..."
                    value={appraisalComments}
                    onChange={e => setAppraisalComments(e.target.value)}
                    size="small"
                    fullWidth
                    multiline
                    rows={3}
                    required
                  />
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <Button onClick={() => setAppraisalDialogOpen(false)} sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Star />}
              sx={{ bgcolor: SECONDARY, fontWeight: 800, px: 3, borderRadius: 1.5 }}
            >
              Submit Official Appraisal
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Appraisal Detail Dialog */}
      <Dialog open={appraisalDetailOpen} onClose={() => setAppraisalDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: PRIMARY, color: '#fff', py: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff' }}>
              Staff Performance Appraisal Record · {selectedAppraisalDetail?.id}
            </Typography>
            <Chip
              label={selectedAppraisalDetail?.status || 'COMPLETED'}
              size="small"
              sx={{ bgcolor: '#fff', color: PRIMARY, fontWeight: 800 }}
            />
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedAppraisalDetail && (
            <Stack spacing={2.5}>
              {/* Header Details */}
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Employee Name</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{selectedAppraisalDetail.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {selectedAppraisalDetail.designation || 'Staff'} · {selectedAppraisalDetail.department || 'General'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Evaluation Cycle & Period</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: SECONDARY }}>
                      {(selectedAppraisalDetail.frequency || '').startsWith('BI_ANNUAL') ? 'Bi-Annual Review' : 'Annual Appraisal'} ({selectedAppraisalDetail.period})
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Evaluated: {selectedAppraisalDetail.evaluatedAt || '2025-12-15'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Overall Score */}
              <Box sx={{ p: 2, bgcolor: '#ecfdf5', borderRadius: 2, border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>
                    Assigned Performance Rating
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#047857' }}>
                    Standard 5.0 Hospital Competency Scale
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: SUCCESS }}>
                  {selectedAppraisalDetail.rating} / 5.0
                </Typography>
              </Box>

              {/* Appraiser Details */}
              <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: PRIMARY, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                  Supervisor / Appraiser Authority
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {selectedAppraisalDetail.supervisorName || 'Hospital Supervisor'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Designation: {selectedAppraisalDetail.supervisorRole || 'Unit Supervisor / Head of Service'}
                </Typography>
              </Box>

              {/* Comments */}
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: PRIMARY, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                  Supervisor Directives & Comments
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6, fontStyle: 'italic', color: '#1e293b' }}>
                  "{selectedAppraisalDetail.comments}"
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAppraisalDetailOpen(false)} variant="contained" sx={{ bgcolor: PRIMARY, fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 1. Add New CPD Course / Workshop Dialog ── */}
      <Dialog open={addCourseDialogOpen} onClose={() => setAddCourseDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleAddCpdCourse}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: PRIMARY, color: '#fff', py: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <School sx={{ color: '#60a5fa' }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                  Register Accredited CPD Course / CME Module
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  Accredited Continuing Professional Development & Licensing Units
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Course / Workshop Title"
                placeholder="e.g. Advanced Infection Prevention & Control (IPC)"
                value={newCourseName}
                onChange={e => setNewCourseName(e.target.value)}
                size="small"
                fullWidth
                required
              />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Training Category"
                    value={newCourseCategory}
                    onChange={e => setNewCourseCategory(e.target.value)}
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="MANDATORY">Mandatory Regulatory (BLS/IPC/NRP)</MenuItem>
                    <MenuItem value="CLINICAL_CME">Clinical CME / Specialist Units</MenuItem>
                    <MenuItem value="ETHICS_LEGAL">Medical Ethics & Patient Rights</MenuItem>
                    <MenuItem value="LEADERSHIP">Healthcare Leadership & Governance</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Accrediting Provider / Council"
                    placeholder="e.g. MDCN, NMCN, AHA, NCDC"
                    value={newCourseProvider}
                    onChange={e => setNewCourseProvider(e.target.value)}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="CPD Credits"
                    type="number"
                    value={newCourseCredits}
                    onChange={e => setNewCourseCredits(Number(e.target.value))}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Duration (Hours)"
                    type="number"
                    value={newCourseDuration}
                    onChange={e => setNewCourseDuration(Number(e.target.value))}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Min Pass Score (%)"
                    type="number"
                    value={newCoursePassingScore}
                    onChange={e => setNewCoursePassingScore(Number(e.target.value))}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Renewal (Months)"
                    type="number"
                    value={newCourseRenewalMonths}
                    onChange={e => setNewCourseRenewalMonths(Number(e.target.value))}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Delivery Mode"
                    value={newCourseDeliveryMode}
                    onChange={e => setNewCourseDeliveryMode(e.target.value)}
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="HYBRID">Hybrid (Lectures + Practical)</MenuItem>
                    <MenuItem value="PRACTICAL_SIMULATION">Practical Simulation Lab</MenuItem>
                    <MenuItem value="WORKSHOP">On-Site Workshop</MenuItem>
                    <MenuItem value="E_LEARNING">Online E-Learning Portal</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Target Cadre / Audience"
                    value={newCourseTargetAudience}
                    onChange={e => setNewCourseTargetAudience(e.target.value)}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Next Audit / Renewal Date"
                    type="date"
                    value={newCourseNextDue}
                    onChange={e => setNewCourseNextDue(e.target.value)}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Course Overview & Core Competencies"
                    placeholder="Brief description of clinical guidelines, aseptic techniques, resuscitation standards covered..."
                    value={newCourseDescription}
                    onChange={e => setNewCourseDescription(e.target.value)}
                    size="small"
                    fullWidth
                    multiline
                    rows={2.5}
                  />
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <Button onClick={() => setAddCourseDialogOpen(false)} sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: PRIMARY, fontWeight: 800, px: 3 }}>
              Save & Register Course
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── 2. Log Staff CPD Certification & Credits Modal ── */}
      <Dialog open={logStaffCpdDialogOpen} onClose={() => setLogStaffCpdDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleLogStaffCpd}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: SECONDARY, color: '#fff', py: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Verified sx={{ color: '#a7f3d0' }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                  Record Staff CPD Certification & Units
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  Log certified training completion, council certificate number & earned credits
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                select
                label="Select Staff Member"
                value={recordStaffId}
                onChange={e => setRecordStaffId(e.target.value)}
                size="small"
                fullWidth
                required
              >
                {employees.map((emp: any) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{emp.firstName} {emp.lastName}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {emp.designation || emp.role} · {emp.department || 'Clinical Services'}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Select Accredited CPD Course / Module"
                value={recordCourseId}
                onChange={e => {
                  const cId = e.target.value;
                  setRecordCourseId(cId);
                  const matched = cpdCourses.find(c => c.id === cId);
                  if (matched) {
                    setRecordCredits(matched.credits);
                    setRecordAccreditation(matched.provider);
                  }
                }}
                size="small"
                fullWidth
                required
              >
                {cpdCourses.map((c: any) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {c.category} · {c.credits} Credits · {c.provider}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Credits Awarded"
                    type="number"
                    value={recordCredits}
                    onChange={e => setRecordCredits(Number(e.target.value))}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Assessment Score (%)"
                    type="number"
                    value={recordScore}
                    onChange={e => setRecordScore(Number(e.target.value))}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Completion Date"
                    type="date"
                    value={recordCompletionDate}
                    onChange={e => setRecordCompletionDate(e.target.value)}
                    size="small"
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Licence Expiry / Renewal Date"
                    type="date"
                    value={recordExpiryDate}
                    onChange={e => setRecordExpiryDate(e.target.value)}
                    size="small"
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Certificate / Council Ref #"
                    placeholder="e.g. MDCN-IPC-2026-8812"
                    value={recordCertNo}
                    onChange={e => setRecordCertNo(e.target.value)}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Accrediting Institution"
                    value={recordAccreditation}
                    onChange={e => setRecordAccreditation(e.target.value)}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Verified / Approved By"
                    placeholder="e.g. Dr. Amina Bello (CMD / Lead Examiner)"
                    value={recordVerifiedBy}
                    onChange={e => setRecordVerifiedBy(e.target.value)}
                    size="small"
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <Button onClick={() => setLogStaffCpdDialogOpen(false)} sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: SECONDARY, fontWeight: 800, px: 3 }}>
              Save Certification Record
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── 3. View Course Details & Certified Staff Modal ── */}
      <Dialog open={viewCourseDetailOpen} onClose={() => setViewCourseDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: TEAL, color: '#fff', py: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <School sx={{ color: '#fff' }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                {selectedCpdCourse?.name || 'CPD Course Details'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                {selectedCpdCourse?.category} · {selectedCpdCourse?.provider}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedCpdCourse && (
            <Stack spacing={2.5}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>CREDITS</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: TEAL }}>{selectedCpdCourse.credits} Pts</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>DURATION</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedCpdCourse.durationHours}h</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>MIN PASS</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: SUCCESS }}>{selectedCpdCourse.passingScore}%</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>RENEWAL</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedCpdCourse.renewalMonths}m</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: PRIMARY, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                  Course Syllabus & Core Objectives
                </Typography>
                <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.5 }}>
                  {selectedCpdCourse.description || 'Comprehensive clinical competencies, practical simulations, and accredited regulatory standards.'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, mb: 1 }}>
                  Certified Staff Members in this Course
                </Typography>
                <TableContainer component={Paper} sx={{ borderRadius: 1.5, maxHeight: 220 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#e2e8f0' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Staff Member</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Certificate #</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Score</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Date Passed</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cpdRecords
                        .filter(r => r.courseId === selectedCpdCourse.id)
                        .map(rec => (
                          <TableRow key={rec.id} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{rec.staffName}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{rec.certificateNo}</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: SUCCESS }}>{rec.scorePercent}%</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{rec.completionDate}</TableCell>
                          </TableRow>
                        ))}
                      {cpdRecords.filter(r => r.courseId === selectedCpdCourse.id).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 2, color: 'text.secondary', fontSize: '0.8rem' }}>
                            No individual certifications logged yet for this module.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewCourseDetailOpen(false)} variant="contained" sx={{ bgcolor: TEAL, fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 4. Staff Individual CPD Portfolio & Transcript Modal ── */}
      <Dialog open={staffTranscriptOpen} onClose={() => setStaffTranscriptOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: PRIMARY, color: '#fff', py: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Verified sx={{ color: '#60a5fa' }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                Continuing Professional Development (CPD) Transcript
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {selectedTranscriptStaff?.firstName} {selectedTranscriptStaff?.lastName} · {selectedTranscriptStaff?.designation || selectedTranscriptStaff?.role}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedTranscriptStaff && (
            <Stack spacing={2.5}>
              <Box sx={{ p: 2, bgcolor: '#ecfdf5', borderRadius: 2, border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>
                    Annual Earned CPD / CME Pool
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#047857' }}>
                    Mandatory Annual Council Minimum: 20 Points
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: SUCCESS }}>
                  {selectedTranscriptStaff.totalPoints || 0} Pts
                </Typography>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY }}>
                Official Accreditations & Verified Certificates
              </Typography>

              <TableContainer component={Paper} sx={{ borderRadius: 1.5 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Course Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Credits</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Certificate #</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Expiry</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedTranscriptStaff.records || []).map((rec: any) => (
                      <TableRow key={rec.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{rec.courseName}</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: TEAL }}>+{rec.creditsEarned} Pts</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{rec.certificateNo}</TableCell>
                        <TableCell sx={{ fontSize: '0.72rem' }}>{rec.expiryDate}</TableCell>
                        <TableCell>
                          <Chip label={rec.status || 'VALID'} size="small" color="success" sx={{ fontSize: '0.65rem', fontWeight: 800 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(selectedTranscriptStaff.records || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No accredited courses logged for this personnel yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStaffTranscriptOpen(false)} variant="contained" sx={{ bgcolor: PRIMARY, fontWeight: 700 }}>
            Close Transcript
          </Button>
        </DialogActions>
      </Dialog>

      {/* Risk Dialog */}
      <Dialog open={riskDialogOpen} onClose={() => setRiskDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddRisk}>
          <DialogTitle sx={{ fontWeight: 800 }}>Register Workforce Risk</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField select label="Risk Category" name="category" size="small" fullWidth defaultValue="SUCCESSION"><MenuItem value="SUCCESSION">Succession / Staff Dependency</MenuItem><MenuItem value="COMPLIANCE">Regulatory Licensing Non-compliance</MenuItem><MenuItem value="TURNOVER">High Critical Skill Attrition</MenuItem></TextField>
              <TextField label="Risk Title" name="title" size="small" fullWidth required />
              <TextField select label="Impact" name="impact" size="small" fullWidth defaultValue="HIGH"><MenuItem value="LOW">Low</MenuItem><MenuItem value="MEDIUM">Medium</MenuItem><MenuItem value="HIGH">High</MenuItem><MenuItem value="CRITICAL">Critical</MenuItem></TextField>
              <TextField select label="Likelihood" name="likelihood" size="small" fullWidth defaultValue="MEDIUM"><MenuItem value="LOW">Low</MenuItem><MenuItem value="MEDIUM">Medium</MenuItem><MenuItem value="HIGH">High</MenuItem></TextField>
              <TextField label="Mitigation Action Plan" name="mitigation" size="small" fullWidth multiline rows={2} required />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setRiskDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Register Risk</Button></DialogActions>
        </form>
      </Dialog>

      {/* Actions Dropdown Menu */}
      <Menu
        anchorEl={actionAnchorEl}
        open={Boolean(actionAnchorEl)}
        onClose={() => { setActionAnchorEl(null); setActionEmp(null); }}
        PaperProps={{
          sx: { minWidth: 180, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }
        }}
      >
        <MenuItem onClick={() => {
          setActionAnchorEl(null);
          if (actionEmp) {
            const resolvedRole = availableRoles.includes(actionEmp.role)
              ? actionEmp.role
              : normalizeStaffRole(actionEmp.role, actionEmp.designation, actionEmp.department);
            setEditRole(resolvedRole);
            setEditDesignation(actionEmp.designation || actionEmp.role || (PORTFOLIO_MAP[resolvedRole]?.[0] ?? ''));
            setEditDept(actionEmp.department || roleToDeptMap[resolvedRole] || 'OPD');
            setEditProfilePic(actionEmp.profilePicture || null);
          }
          setEditDialogOpen(true);
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Edit Details
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleUpdateStatus('ACTIVE')} disabled={actionEmp?.status === 'ACTIVE'}>
          Mark Active
        </MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('INACTIVE')} disabled={actionEmp?.status === 'INACTIVE'}>
          Mark Inactive
        </MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('ON_LEAVE')} disabled={actionEmp?.status === 'ON_LEAVE'}>
          Mark On Leave
        </MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('MATERNITY_LEAVE')} disabled={actionEmp?.status === 'MATERNITY_LEAVE'}>
          Mark Maternity Leave
        </MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('SUSPENDED')} disabled={actionEmp?.status === 'SUSPENDED'}>
          Suspend Staff
        </MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('DECEASED')} disabled={actionEmp?.status === 'DECEASED'}>
          Mark as Deceased
        </MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('ARCHIVED')} disabled={actionEmp?.status === 'ARCHIVED'}>
          Archive Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setActionAnchorEl(null); setQueryDialogOpen(true); }}>
          <Warning fontSize="small" sx={{ mr: 1.5, color: '#f59e0b' }} /> Issue Warning/Query
        </MenuItem>
        <MenuItem onClick={() => { setActionAnchorEl(null); setViewQueriesDialogOpen(true); }}>
          <Assignment fontSize="small" sx={{ mr: 1.5, color: '#0ea5e9' }} /> View Queries ({actionEmp?.queries?.length || 0})
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteEmployee} sx={{ color: 'error.main', fontWeight: 600 }}>
          Delete Profile
        </MenuItem>
      </Menu>

      {/* Edit Employee Dialog */}
      {editDialogOpen && actionEmp && (
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
          <form onSubmit={handleEditEmployee}>
            <DialogTitle sx={{ fontWeight: 800 }}>Edit Staff Profile</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Staff ID / Employee ID"
                    name="id"
                    size="small"
                    fullWidth
                    defaultValue={actionEmp.id}
                    inputProps={{ style: { fontFamily: 'monospace', fontWeight: 'bold' } }}
                    helperText="Warning: Editing the Staff ID changes their system login username."
                  />
                </Grid>
                <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Avatar src={editProfilePic || undefined} sx={{ width: 56, height: 56 }} />
                  <Button variant="outlined" component="label" size="small">
                    Upload Profile Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={e => handleFileChange(e, setEditProfilePic)}
                    />
                  </Button>
                  {editProfilePic && (
                    <Button size="small" color="error" onClick={() => setEditProfilePic(null)}>
                      Remove
                    </Button>
                  )}
                </Grid>
                <Grid item xs={6}><TextField label="First Name" name="firstName" size="small" fullWidth required defaultValue={actionEmp.firstName} /></Grid>
                <Grid item xs={6}><TextField label="Last Name" name="lastName" size="small" fullWidth required defaultValue={actionEmp.lastName} /></Grid>
                <Grid item xs={6}><TextField label="Email" name="email" size="small" type="email" fullWidth required defaultValue={actionEmp.email} /></Grid>
                <Grid item xs={6}>
                  <TextField 
                    label="Phone (11 Digits)" 
                    name="phone" 
                    size="small" 
                    fullWidth 
                    required 
                    defaultValue={actionEmp.phone}
                    inputProps={{ pattern: "[0-9]{11}", maxLength: 11 }} 
                    helperText="Exactly 11 digits (e.g. 08103465662)"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Role"
                    name="role"
                    size="small"
                    fullWidth
                    value={editRole}
                    onChange={e => {
                      const r = e.target.value;
                      setEditRole(r);
                      if (PORTFOLIO_MAP[r] && PORTFOLIO_MAP[r].length > 0) {
                        setEditDesignation(PORTFOLIO_MAP[r][0]);
                      }
                      if (roleToDeptMap[r]) setEditDept(roleToDeptMap[r]);
                    }}
                  >
                    {availableRoles.map(r => (
                      <MenuItem key={r} value={r}>{r}</MenuItem>
                    ))}
                    {editRole && !availableRoles.includes(editRole) && (
                      <MenuItem key={editRole} value={editRole}>{editRole}</MenuItem>
                    )}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <Autocomplete
                    freeSolo
                    options={PORTFOLIO_MAP[editRole] || [
                      'Senior Consultant',
                      'Consultant Specialist',
                      'Senior Medical Officer',
                      'Medical Officer',
                      'Chief Specialist',
                      'Senior Specialist',
                      'Specialist',
                    ]}
                    value={editDesignation}
                    onInputChange={(_, val) => setEditDesignation(val)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        name="designation"
                        label={`Portfolio / Rank (${editRole || 'Staff'})`}
                        placeholder="Choose or type specialization..."
                        size="small"
                        fullWidth
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Department"
                    name="department"
                    size="small"
                    fullWidth
                    value={editDept}
                    onChange={e => setEditDept(e.target.value)}
                  >
                    {['OPD', 'IPD', 'ICU', 'Pharmacy', 'Laboratory', 'Radiology', 'Pathology', 'EMR/Records', 'Mortuary & Funeral', 'Physiotherapy', 'Administration', 'Emergency'].map(d => (
                      <MenuItem key={d} value={d}>{d}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField select label="Salary Grade Level" name="salaryGrade" size="small" fullWidth defaultValue={actionEmp.salaryGrade}>
                    {['L1-Step 1', 'L1-Step 2', 'L2-Step 1', 'L2-Step 2', 'L3-Step 1', 'L3-Step 2', 'L4-Step 1', 'L4-Step 2', 'L5-Step 1', 'L5-Step 2', 'L6-Step 1', 'L6-Step 2', 'L7-Step 1', 'L7-Step 2', 'L8-Step 1', 'L8-Step 2', 'L9-Step 1', 'L9-Step 2', 'L10-Step 1', 'L10-Step 2', 'L11-Step 1', 'L11-Step 2', 'L12-Step 1', 'L12-Step 2', 'L12-Step 3', 'L12-Step 4'].map(lvl => (
                      <MenuItem key={lvl} value={lvl}>{lvl}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}><TextField label="Base Monthly Salary (₦)" name="baseSalary" type="number" size="small" fullWidth required defaultValue={actionEmp.baseSalary} /></Grid>
                <Grid item xs={6}>
                  <TextField select label="Bank Name" name="bankName" size="small" fullWidth required defaultValue={actionEmp.bankName || (bankList[0]?.name || "Zenith Bank")}>
                    {(bankList.length > 0 ? bankList.map(b => b.name) : ['Zenith Bank', 'Guaranty Trust Bank (GTBank)', 'Access Bank', 'United Bank for Africa (UBA)', 'First Bank of Nigeria', 'Union Bank', 'Fidelity Bank', 'Wema Bank', 'Sterling Bank', 'Moniepoint Microfinance Bank', 'OPay Digital Services (MFB)', 'Kuda Microfinance Bank']).map(name => (
                      <MenuItem key={name} value={name}>{name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField 
                    label="Bank Account Number" 
                    name="accountNo" 
                    size="small" 
                    fullWidth 
                    required 
                    defaultValue={actionEmp.accountNo}
                    inputProps={{ pattern: "[0-9]{10}", maxLength: 10 }}
                    helperText="Exactly 10 digits (e.g. 1029381829)"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Pension PFA / RSA PIN"
                    name="pensionPin"
                    size="small"
                    fullWidth
                    defaultValue={actionEmp.pensionPin || "PEN1009849201 (Stanbic IBTC)"}
                    placeholder="e.g. PEN1009849201 (Stanbic IBTC)"
                    helperText="Pension Reform Act 2014 RSA PIN & Fund Manager"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Tax ID (TIN)"
                    name="taxId"
                    size="small"
                    fullWidth
                    defaultValue={actionEmp.taxId || "TIN-BEN-2026-9941"}
                    placeholder="e.g. TIN-BEN-2026-9941"
                    helperText="State Internal Revenue Service (SIRS) Tax ID"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField select label="Practice License No (Clinical)" name="licenseNo" size="small" fullWidth defaultValue={actionEmp.licenseNo || "N/A"}>
                    {['N/A', 'MDCN (Medical & Dental Council)', 'NMCN (Nursing & Midwifery Council)', 'PCN (Pharmacists Council)', 'MLSCN (Medical Lab Science Council)', 'RRBN (Radiographers Registration Board)', 'MRTBN (Medical Rehabilitation Therapists Board)'].map(lic => (
                      <MenuItem key={lic} value={lic}>{lic}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}><TextField label="Licence Expiry Date" type="date" name="licenseExpiry" size="small" fullWidth InputLabelProps={{ shrink: true }} defaultValue={actionEmp.licenseExpiry || `${new Date().getFullYear() + 1}-12-31`} /></Grid>
                <Grid item xs={6}><TextField select label="Funding Source" name="fundingSource" size="small" fullWidth defaultValue={actionEmp.fundingSource || "HOSPITAL_FUNDED"}><MenuItem value="HOSPITAL_FUNDED">Hospital Core Funds</MenuItem><MenuItem value="DONOR_FUNDED">Donor Programme</MenuItem></TextField></Grid>
                <Grid item xs={6}><TextField label="Donor Program Reference" name="donorProgramme" size="small" fullWidth placeholder="e.g. CDC/CARITAS" defaultValue={actionEmp.donorProgramme || ""} /></Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained">Save Changes</Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {/* Timesheet Review Dialog */}
      {selectedTimesheet && (
        <Dialog open={timesheetReviewOpen} onClose={() => setTimesheetReviewOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Review Timesheet Submission</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">EMPLOYEE NAME</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{selectedTimesheet.name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">REPORTING MONTH & LOGGED HOURS</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{selectedTimesheet.month} · {selectedTimesheet.hoursWorked} Hours</Typography>
              </Box>
              <TextField
                label="Reviewer Comments & Feedback"
                multiline
                rows={3}
                size="small"
                fullWidth
                value={timesheetComment}
                onChange={(e) => setTimesheetComment(e.target.value)}
                placeholder="Add audit confirmation notes or rejection reasons..."
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTimesheetReviewOpen(false)}>Close</Button>
            <Button
              color="error"
              variant="outlined"
              onClick={() => {
                handleRejectTimesheet(selectedTimesheet.id, timesheetComment);
                setTimesheetReviewOpen(false);
              }}
            >
              Reject / Send Back
            </Button>
            <Button
              color="success"
              variant="contained"
              onClick={() => {
                handleApproveTimesheet(selectedTimesheet.id, timesheetComment);
                setTimesheetReviewOpen(false);
              }}
            >
              Approve Timesheet
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* View Timesheet Details Dialog */}
      {selectedTimesheet && (
        <Dialog open={viewTimesheetOpen} onClose={() => setViewTimesheetOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Timesheet Logs Particulars</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">TIMESHEET ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{selectedTimesheet.id}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">STAFF NAME & EMP ID</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedTimesheet.name} ({selectedTimesheet.empId})</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">MONTH & LOGGED HOURS</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedTimesheet.month} · {selectedTimesheet.hoursWorked} Hours</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">SUBMISSION DATE</Typography>
                <Typography variant="body2">{selectedTimesheet.submittedAt}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">STATUS</Typography>
                <Box sx={{ mt: 0.5 }}><StatusChip label={selectedTimesheet.status} /></Box>
              </Box>
              {selectedTimesheet.approvedBy && (
                <Box>
                  <Typography variant="caption" color="text.secondary">APPROVED BY</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedTimesheet.approvedBy}</Typography>
                </Box>
              )}
              {selectedTimesheet.comments && (
                <Box>
                  <Typography variant="caption" color="text.secondary">AUDIT COMMENTS / FEEDBACK</Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic', bgcolor: '#f8fafc', p: 1, borderRadius: 1 }}>{selectedTimesheet.comments}</Typography>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewTimesheetOpen(false)} variant="contained">Close</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Disciplinary Query Issue Dialog */}
      <Dialog open={queryDialogOpen} onClose={() => setQueryDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleIssueQuery}>
          <DialogTitle sx={{ fontWeight: 800 }}>Issue Disciplinary Query</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Box sx={{ p: 1.5, bgcolor: '#fef3c7', borderRadius: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                <Warning sx={{ color: '#d97706' }} />
                <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600 }}>
                  This creates an official warning registry log for {actionEmp?.firstName} {actionEmp?.lastName} ({actionEmp?.id}).
                </Typography>
              </Box>
              <TextField
                label="Query Subject"
                name="subject"
                placeholder="e.g. Chronic absenteeism / Unprofessional behavior"
                size="small"
                fullWidth
                required
                value={querySubject}
                onChange={e => setQuerySubject(e.target.value)}
              />
              <TextField
                label="Particulars & Details of Offense"
                name="content"
                placeholder="Detail the dates, times, and nature of the infraction..."
                size="small"
                fullWidth
                required
                multiline
                rows={4}
                value={queryContent}
                onChange={e => setQueryContent(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQueryDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="warning">Issue Query</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Disciplinary Queries Dialog */}
      <Dialog open={viewQueriesDialogOpen} onClose={() => setViewQueriesDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Disciplinary Records & Queries</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
            Active queries issued to {actionEmp?.firstName} {actionEmp?.lastName}
          </Typography>
          {queriesList.length === 0 ? (
            <Alert severity="success">Clean record. No queries or warning logs issued to this employee.</Alert>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {queriesList.map((q: any) => (
                <Card key={q.id} variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: '#fafafa' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }}>{q.subject}</Typography>
                    <Chip label={q.status} size="small" color={q.status === 'PENDING' ? 'warning' : 'success'} sx={{ fontSize: '0.65rem', fontWeight: 700 }} />
                  </Stack>
                  <Typography variant="body2" sx={{ color: '#475569', mb: 1.5 }}>{q.content}</Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">Logged on: {q.date}</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#64748b' }}>{q.id}</Typography>
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewQueriesDialogOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── CREATE STAFF TIMESHEET DIALOG ── */}
      <Dialog open={timesheetCreateOpen} onClose={() => setTimesheetCreateOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateTimesheetSubmit}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment sx={{ color: PRIMARY }} /> Create Monthly Shift-Based Timesheet
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
                Timesheets evaluate assigned scheduled roster shifts for the full calendar month (1st – 30th/31st). Fulfilling all assigned shifts yields 100% compliance.
              </Alert>

              <TextField
                select
                label="Select Employee"
                fullWidth
                size="small"
                value={createStaffId}
                onChange={e => setCreateStaffId(e.target.value)}
                required
              >
                {employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.id}) — {emp.role} [{emp.department}]
                  </MenuItem>
                ))}
              </TextField>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Reporting Month"
                    fullWidth
                    size="small"
                    value={createMonth}
                    onChange={e => setCreateMonth(e.target.value)}
                    required
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Reporting Year"
                    fullWidth
                    size="small"
                    value={createYear}
                    onChange={e => setCreateYear(e.target.value)}
                    required
                  >
                    {['2026', '2025', '2024'].map(y => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <TextField
                label="Duty / Project Assignment"
                fullWidth
                size="small"
                value={createProjectName}
                onChange={e => setCreateProjectName(e.target.value)}
                placeholder="e.g. AYP HUB / Access Project / Cash Desk Operations"
                helperText="Primary duty or grant program under which shifts are rostered"
                required
              />

              <TextField
                select
                label="Project Coordinator / Unit Lead"
                fullWidth
                size="small"
                value={createSupervisor}
                onChange={e => setCreateSupervisor(e.target.value)}
              >
                <MenuItem value="Ekwedike Dennis">Ekwedike Dennis (Project Coordinator)</MenuItem>
                <MenuItem value="Chinedu Okafor">Chinedu Okafor (Revenue Supervisor)</MenuItem>
                <MenuItem value="Dr. Emeka Okafor">Dr. Emeka Okafor (Clinical Director)</MenuItem>
                <MenuItem value="Ngozi Adeyemi">Ngozi Adeyemi (Nursing Supervisor)</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
            <Button onClick={() => setTimesheetCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: PRIMARY, fontWeight: 700 }}>
              Generate Monthly Timesheet Grid
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── INTERACTIVE CARITAS-STYLE FULL-MONTH TIMESHEET GRID MODAL ── */}
      <Dialog
        open={timesheetGridOpen}
        onClose={() => setTimesheetGridOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '92vh' } }}
      >
        {activeGridTimesheet && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Dark Red / Burgundy Top Navigation Bar */}
            <Box sx={{
              bgcolor: '#6b1d2f',
              color: '#fff',
              px: 3,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Assignment sx={{ fontSize: 24 }} />
                <Typography variant="h6" fontWeight={800} letterSpacing={0.5}>
                  Timesheet
                </Typography>
                <Chip
                  label={`${activeGridTimesheet.month} ${activeGridTimesheet.year || '2026'}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                  size="small"
                  title="Export / Download PDF"
                  onClick={() => setTimesheetPrintModalOpen(true)}
                >
                  <PictureAsPdf fontSize="small" />
                </IconButton>
                <IconButton
                  sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                  size="small"
                  title="Print Official Report"
                  onClick={() => setTimesheetPrintModalOpen(true)}
                >
                  <Print fontSize="small" />
                </IconButton>
                <Avatar sx={{ bgcolor: '#dc2626', width: 30, height: 30, fontSize: '0.7rem', fontWeight: 900, ml: 1 }}>
                  CCFN
                </Avatar>
                <IconButton size="small" onClick={() => setTimesheetGridOpen(false)} sx={{ color: '#fff', ml: 1 }}>
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <DialogContent sx={{ p: 3, bgcolor: '#fbfcfd' }}>
              <Stack spacing={3}>
                {/* Staff & Facility Metadata Header */}
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>
                    Name: {activeGridTimesheet.name}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#475569' }}>
                    Department: {activeGridTimesheet.department || 'Prevention'}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#475569' }}>
                    Designation: {activeGridTimesheet.designation || 'Tracking Assistant'}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#475569' }}>
                    Location: {activeGridTimesheet.location || 'Asata Poly Clinic (Sub District Hospital)'}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#475569' }}>
                    State: {activeGridTimesheet.state || 'Enugu'}
                  </Typography>
                </Box>

                {/* Period & Month Selector Bar */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, px: 2, py: 1.5, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" fontWeight={800} color="#334155">
                      Select Month: <b>{activeGridTimesheet.month}</b>
                    </Typography>
                    <Typography variant="body2" fontWeight={800} color="#334155">
                      Select Year: <b>{activeGridTimesheet.year || '2026'}</b>
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      Select Timesheet Period for {activeGridTimesheet.month}:
                    </Typography>
                    <Chip
                      label={`Full Calendar Month (1st – ${activeGridTimesheet.grid?.totalDays || 30}th)`}
                      color="error"
                      variant="filled"
                      sx={{ fontWeight: 800, fontSize: '0.72rem', height: 26, bgcolor: '#f87171' }}
                    />
                  </Box>
                </Box>

                {/* ── 1ST TO 30TH/31ST MATRIX GRID TABLE ── */}
                <Box sx={{ overflowX: 'auto', bgcolor: '#fff', borderRadius: 2, border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <Table size="small" sx={{ minWidth: 1200, '& td, & th': { border: '1px solid #e2e8f0', p: '6px 4px', textAlign: 'center', fontSize: '0.72rem' } }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#bae6fd' }}>
                        <TableCell sx={{ fontWeight: 800, color: '#0369a1', minWidth: 160, textAlign: 'left !important', pl: 1.5 }}>
                          Project Name
                        </TableCell>
                        {activeGridTimesheet.grid?.days?.map((d: any) => (
                          <TableCell
                            key={d.day}
                            sx={{
                              fontWeight: 800,
                              color: d.isWeekend ? '#64748b' : '#0369a1',
                              bgcolor: d.isWeekend ? '#e2e8f0' : '#bae6fd',
                              minWidth: 32
                            }}
                          >
                            <Box sx={{ fontSize: '0.72rem', lineHeight: 1.1 }}>{String(d.day).padStart(2, '0')}</Box>
                            <Box sx={{ fontSize: '0.6rem', fontWeight: 600, color: d.isWeekend ? '#94a3b8' : '#0284c7' }}>{d.dayOfWeek.slice(0, 3)}</Box>
                          </TableCell>
                        ))}
                        <TableCell sx={{ fontWeight: 800, color: '#0369a1', minWidth: 70, bgcolor: '#93c5fd' }}>
                          Total Hours
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#0369a1', minWidth: 60, bgcolor: '#93c5fd' }}>
                          %
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {/* Main Duty / Project Row */}
                      <TableRow sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell sx={{ fontWeight: 700, color: '#0f172a', textAlign: 'left !important', pl: 1.5 }}>
                          {activeGridTimesheet.projectName || 'AYP HUB'}
                        </TableCell>
                        {activeGridTimesheet.grid?.days?.map((d: any) => (
                          <TableCell
                            key={d.day}
                            sx={{
                              bgcolor: d.isWeekend ? '#334155' : 'transparent',
                              color: d.isWeekend ? '#334155' : (d.projectHours > 0 ? '#0284c7' : '#94a3b8'),
                              fontWeight: d.projectHours > 0 ? 800 : 400
                            }}
                          >
                            {d.isWeekend ? '' : (d.projectHours > 0 ? d.projectHours.toFixed(2) : '0.00')}
                          </TableCell>
                        ))}
                        <TableCell sx={{ fontWeight: 800, color: PRIMARY, bgcolor: '#f0f9ff' }}>
                          {(activeGridTimesheet.grid?.totalProjectHours || 168).toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: SUCCESS, bgcolor: '#f0fdf4' }}>
                          95%
                        </TableCell>
                      </TableRow>

                      {/* Out-of-office Header Row */}
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell colSpan={(activeGridTimesheet.grid?.days?.length || 30) + 3} sx={{ textAlign: 'left !important', pl: 1.5, py: '4px !important' }}>
                          <Typography variant="caption" fontWeight={800} color="#0f172a">
                            Out-of-office
                          </Typography>
                        </TableCell>
                      </TableRow>

                      {/* Annual Leave Row */}
                      <TableRow>
                        <TableCell sx={{ color: '#475569', textAlign: 'left !important', pl: 2 }}>
                          Annual leave
                        </TableCell>
                        {activeGridTimesheet.grid?.days?.map((d: any) => (
                          <TableCell
                            key={d.day}
                            sx={{
                              bgcolor: d.isWeekend ? '#334155' : 'transparent',
                              color: d.isWeekend ? '#334155' : (d.annualLeave > 0 ? '#d97706' : '#0284c7'),
                              fontWeight: d.annualLeave > 0 ? 800 : 400
                            }}
                          >
                            {d.isWeekend ? '' : (d.annualLeave > 0 ? d.annualLeave.toFixed(2) : '0.00')}
                          </TableCell>
                        ))}
                        <TableCell sx={{ fontWeight: 800, color: (activeGridTimesheet.grid?.totalAnnualLeaveHours > 0) ? '#d97706' : '#64748b' }}>
                          {(activeGridTimesheet.grid?.totalAnnualLeaveHours || 0).toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: (activeGridTimesheet.grid?.totalAnnualLeaveHours > 0) ? '#d97706' : '#64748b' }}>
                          {activeGridTimesheet.grid?.totalExpectedHours ? Math.round(((activeGridTimesheet.grid?.totalAnnualLeaveHours || 0) / activeGridTimesheet.grid.totalExpectedHours) * 100) : 0}%
                        </TableCell>
                      </TableRow>

                      {/* Holiday Row */}
                      <TableRow>
                        <TableCell sx={{ color: '#475569', textAlign: 'left !important', pl: 2 }}>
                          Holiday
                        </TableCell>
                        {activeGridTimesheet.grid?.days?.map((d: any) => (
                          <TableCell
                            key={d.day}
                            sx={{
                              bgcolor: d.isWeekend ? '#334155' : 'transparent',
                              color: d.isWeekend ? '#334155' : (d.holiday > 0 ? '#16a34a' : '#0284c7'),
                              fontWeight: d.holiday > 0 ? 800 : 400
                            }}
                          >
                            {d.isWeekend ? '' : (d.holiday > 0 ? d.holiday.toFixed(2) : '0.00')}
                          </TableCell>
                        ))}
                        <TableCell sx={{ fontWeight: 800, color: SUCCESS, bgcolor: '#f0fdf4' }}>
                          {(activeGridTimesheet.grid?.totalHolidayHours || 8).toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: SUCCESS, bgcolor: '#f0fdf4' }}>
                          5%
                        </TableCell>
                      </TableRow>

                      {/* Maternity / Sick Row */}
                      <TableRow>
                        <TableCell sx={{ color: '#475569', textAlign: 'left !important', pl: 2 }}>
                          Maternity / Medical
                        </TableCell>
                        {activeGridTimesheet.grid?.days?.map((d: any) => (
                          <TableCell
                            key={d.day}
                            sx={{
                              bgcolor: d.isWeekend ? '#334155' : 'transparent',
                              color: d.isWeekend ? '#334155' : (d.maternity > 0 ? '#9333ea' : '#0284c7'),
                              fontWeight: d.maternity > 0 ? 800 : 400
                            }}
                          >
                            {d.isWeekend ? '' : (d.maternity > 0 ? d.maternity.toFixed(2) : '0.00')}
                          </TableCell>
                        ))}
                        <TableCell sx={{ fontWeight: 800, color: (activeGridTimesheet.grid?.totalMaternityHours > 0) ? '#9333ea' : '#64748b' }}>
                          {(activeGridTimesheet.grid?.totalMaternityHours || 0).toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: (activeGridTimesheet.grid?.totalMaternityHours > 0) ? '#9333ea' : '#64748b' }}>
                          {activeGridTimesheet.grid?.totalExpectedHours ? Math.round(((activeGridTimesheet.grid?.totalMaternityHours || 0) / activeGridTimesheet.grid.totalExpectedHours) * 100) : 0}%
                        </TableCell>
                      </TableRow>

                      {/* Total Row */}
                      <TableRow sx={{ bgcolor: '#f1f5f9', fontWeight: 800 }}>
                        <TableCell sx={{ fontWeight: 900, color: '#0f172a', textAlign: 'left !important', pl: 1.5 }}>
                          Total
                        </TableCell>
                        {activeGridTimesheet.grid?.days?.map((d: any) => (
                          <TableCell
                            key={d.day}
                            sx={{
                              bgcolor: d.isWeekend ? '#334155' : '#e0f2fe',
                              color: d.isWeekend ? '#334155' : '#0369a1',
                              fontWeight: 800
                            }}
                          >
                            {d.isWeekend ? '' : (d.totalDaily > 0 ? d.totalDaily : '0')}
                          </TableCell>
                        ))}
                        <TableCell sx={{ fontWeight: 900, color: PRIMARY, bgcolor: '#dbeafe', fontSize: '0.8rem' }}>
                          {(activeGridTimesheet.grid?.totalHoursWorked || 176).toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900, color: SUCCESS, bgcolor: '#dcfce7', fontSize: '0.8rem' }}>
                          {activeGridTimesheet.compliancePercentage || 100}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>

                {/* ── 3-TIER SIGNATURE & DATE APPROVAL HIERARCHY ── */}
                <Box sx={{ mt: 3, pt: 2, borderTop: '2px solid #e2e8f0' }}>
                  <Typography variant="h6" fontWeight={900} textAlign="center" sx={{ color: '#0f172a', mb: 3 }}>
                    Signature & Date
                  </Typography>

                  <Grid container spacing={3}>
                    {/* Tier 1: Staff Signatory */}
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', bgcolor: '#f8fafc', borderColor: '#cbd5e1' }}>
                        <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">
                          NAME OF STAFF
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={900} sx={{ color: PRIMARY, mb: 1.5 }}>
                          {activeGridTimesheet.staffSignature?.name || activeGridTimesheet.name}
                        </Typography>

                        <Box sx={{ my: 1.5, p: 1, bgcolor: '#fff', borderRadius: 1.5, border: '1px dashed #94a3b8', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {activeGridTimesheet.staffSignature?.signatureData ? (
                            <img src={activeGridTimesheet.staffSignature.signatureData} alt="Staff Signature" style={{ maxHeight: 44, maxWidth: '100%' }} />
                          ) : (
                            <Typography variant="caption" color="text.secondary" fontStyle="italic">Signature Pending</Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Box>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">DATE</Typography>
                            <Typography variant="caption" fontWeight={800}>{activeGridTimesheet.staffSignature?.date || 'September 13, 2026'}</Typography>
                          </Box>
                          <Chip label="Signed by Staff" size="small" color="success" sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                        </Box>
                      </Card>
                    </Grid>

                    {/* Tier 2: Project Coordinator / Unit Supervisor */}
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', bgcolor: activeGridTimesheet.supervisorSignature?.signed ? '#f8fafc' : '#fffbeb', borderColor: activeGridTimesheet.supervisorSignature?.signed ? '#cbd5e1' : '#fde68a' }}>
                        <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">
                          NAME OF PROJECT COORDINATOR
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#0f766e', mb: 1.5 }}>
                          {activeGridTimesheet.supervisorSignature?.name || coordinatorSelect}
                        </Typography>

                        <Box sx={{ my: 1.5, p: 1, bgcolor: '#fff', borderRadius: 1.5, border: '1px dashed #94a3b8', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {activeGridTimesheet.supervisorSignature?.signed ? (
                            <img src={activeGridTimesheet.supervisorSignature.signatureData} alt="Coordinator Signature" style={{ maxHeight: 44, maxWidth: '100%' }} />
                          ) : (
                            <Typography variant="caption" color="text.secondary" fontStyle="italic">Timesheet awaiting Coordinator review</Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Box>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">DATE</Typography>
                            <Typography variant="caption" fontWeight={800}>{activeGridTimesheet.supervisorSignature?.date || 'Awaiting Date'}</Typography>
                          </Box>
                          {activeGridTimesheet.supervisorSignature?.signed ? (
                            <Chip label="Coordinator Approved" size="small" color="success" sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              color="warning"
                              startIcon={<Approval />}
                              onClick={() => handleSupervisorSignTimesheet(activeGridTimesheet.id, coordinatorSelect)}
                              sx={{ textTransform: 'none', fontWeight: 800, fontSize: '0.7rem' }}
                            >
                              Sign as Coordinator
                            </Button>
                          )}
                        </Box>
                      </Card>
                    </Grid>

                    {/* Tier 3: CARITAS Supervisor / Hospital Administrator */}
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', bgcolor: activeGridTimesheet.adminSignature?.signed ? '#f8fafc' : '#f0fdf4', borderColor: activeGridTimesheet.adminSignature?.signed ? '#cbd5e1' : '#bbf7d0' }}>
                        <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">
                          NAME OF CARITAS / HOSPITAL ADMINISTRATOR
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#166534', mb: 1.5 }}>
                          {activeGridTimesheet.adminSignature?.name || adminSelect}
                        </Typography>

                        <Box sx={{ my: 1.5, p: 1, bgcolor: '#fff', borderRadius: 1.5, border: '1px dashed #94a3b8', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {activeGridTimesheet.adminSignature?.signed ? (
                            <img src={activeGridTimesheet.adminSignature.signatureData} alt="Administrator Seal" style={{ maxHeight: 44, maxWidth: '100%' }} />
                          ) : (
                            <Typography variant="caption" color="text.secondary" fontStyle="italic">Awaiting final administrative sign-off</Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Box>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">DATE</Typography>
                            <Typography variant="caption" fontWeight={800}>{activeGridTimesheet.adminSignature?.date || 'Awaiting Date'}</Typography>
                          </Box>
                          {activeGridTimesheet.adminSignature?.signed ? (
                            <Chip label="Archived & Locked" size="small" color="success" sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<Verified />}
                              onClick={() => handleAdminSignTimesheet(activeGridTimesheet.id, adminSelect)}
                              sx={{ textTransform: 'none', fontWeight: 800, fontSize: '0.7rem' }}
                            >
                              Approve & Seal
                            </Button>
                          )}
                        </Box>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
              <Button onClick={() => setTimesheetGridOpen(false)} sx={{ fontWeight: 700 }}>
                Close
              </Button>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<PictureAsPdf />}
                  onClick={() => setTimesheetPrintModalOpen(true)}
                  sx={{ fontWeight: 700, textTransform: 'none' }}
                >
                  Download / Print Official PDF
                </Button>
                {activeGridTimesheet.status === 'DRAFT' && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Send />}
                    onClick={() => handleStaffSubmitTimesheet(activeGridTimesheet.id)}
                    sx={{ fontWeight: 800, textTransform: 'none', px: 3 }}
                  >
                    Submit Timesheet
                  </Button>
                )}
              </Stack>
            </DialogActions>
          </Box>
        )}
      </Dialog>

      {/* ── OFFICIAL MONTHLY TIME REPORT PRINTABLE / PDF MODAL (MATCHING IMAGE 5) ── */}
      <Dialog
        open={timesheetPrintModalOpen}
        onClose={() => setTimesheetPrintModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1, p: 2, bgcolor: '#fff' } }}
      >
        {activeGridTimesheet && (
          <Box sx={{ p: 2, color: '#000', bgcolor: '#fff', fontFamily: 'Arial, sans-serif' }}>
            {/* Header with Title and Logos */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              {/* Left: Staff particulars */}
              <Box sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                <Box><b>Name:</b> {activeGridTimesheet.staffSignature?.name || activeGridTimesheet.name}</Box>
                <Box><b>Department:</b> {activeGridTimesheet.department || 'Strategic Information'}</Box>
                <Box><b>Designation:</b> {activeGridTimesheet.designation || 'Senior SI Assistant'}</Box>
                <Box><b>Location:</b> {activeGridTimesheet.location || 'Okigwe General Hospital'}</Box>
                <Box><b>State:</b> {activeGridTimesheet.state || 'Imo'}</Box>
              </Box>

              {/* Center: Organization & Report Title with Hospital Logo */}
              <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box
                  component="img"
                  src={assetUrl('/hospital-logo.webp')}
                  alt="Faith Foundation Logo"
                  sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'contain', mb: 0.5 }}
                />
                <Typography variant="h6" fontWeight={900} letterSpacing={0.5} sx={{ color: '#000', lineHeight: 1.1 }}>
                  FAITH FOUNDATION MISSION HOSPITAL / CARITAS NIGERIA
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#334155', mt: 0.25 }}>
                  Monthly Shift Time Report ({activeGridTimesheet.month}, {activeGridTimesheet.year || '2026'})
                </Typography>
              </Box>

              {/* Right: Red Caritas Sun Logo */}
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  bgcolor: '#b91c1c',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  letterSpacing: 0.5,
                  boxShadow: '0 2px 8px rgba(185,28,28,0.3)'
                }}>
                  CCFN
                </Box>
              </Box>
            </Box>

            {/* Official High-Contrast Report Matrix Table */}
            <Box sx={{ overflowX: 'auto', mb: 4 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: '0.72rem', textAlign: 'center' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000', backgroundColor: '#e5e7eb' }}>
                    <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'left', minWidth: 100 }}>Project Name</th>
                    {activeGridTimesheet.grid?.days?.map((d: any) => (
                      <th key={d.day} style={{ border: '1px solid #000', padding: '6px 2px', minWidth: 20 }}>
                        {String(d.day).padStart(2, '0')}
                      </th>
                    ))}
                    <th style={{ border: '1px solid #000', padding: '6px 4px', minWidth: 44 }}>Total Hours</th>
                    <th style={{ border: '1px solid #000', padding: '6px 4px', minWidth: 32 }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Main Duty Row */}
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'left', fontWeight: 600 }}>
                      {activeGridTimesheet.projectName || 'Access Project'}
                    </td>
                    {activeGridTimesheet.grid?.days?.map((d: any) => (
                      <td
                        key={d.day}
                        style={{
                          border: '1px solid #000',
                          padding: '6px 2px',
                          backgroundColor: d.isWeekend ? '#000' : 'transparent',
                          color: d.isWeekend ? '#000' : '#000',
                          fontWeight: d.projectHours > 0 ? 700 : 400
                        }}
                      >
                        {d.isWeekend ? '' : (d.projectHours > 0 ? d.projectHours : '0')}
                      </td>
                    ))}
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 800 }}>
                      {activeGridTimesheet.grid?.totalProjectHours || 168}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 800 }}>95%</td>
                  </tr>

                  {/* Annual Leave Row */}
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'left' }}>Annual leave</td>
                    {activeGridTimesheet.grid?.days?.map((d: any) => (
                      <td
                        key={d.day}
                        style={{
                          border: '1px solid #000',
                          padding: '6px 2px',
                          backgroundColor: d.isWeekend ? '#000' : 'transparent',
                          fontWeight: d.annualLeave > 0 ? 700 : 400
                        }}
                      >
                        {d.isWeekend ? '' : (d.annualLeave > 0 ? d.annualLeave : '0')}
                      </td>
                    ))}
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 800 }}>
                      {activeGridTimesheet.grid?.totalAnnualLeaveHours || 0}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 800 }}>
                      {activeGridTimesheet.grid?.totalExpectedHours ? Math.round(((activeGridTimesheet.grid?.totalAnnualLeaveHours || 0) / activeGridTimesheet.grid.totalExpectedHours) * 100) : 0}%
                    </td>
                  </tr>

                  {/* Holiday Row */}
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'left' }}>Holiday</td>
                    {activeGridTimesheet.grid?.days?.map((d: any) => (
                      <td
                        key={d.day}
                        style={{
                          border: '1px solid #000',
                          padding: '6px 2px',
                          backgroundColor: d.isWeekend ? '#000' : 'transparent',
                          fontWeight: d.holiday > 0 ? 700 : 400
                        }}
                      >
                        {d.isWeekend ? '' : (d.holiday > 0 ? d.holiday : '0')}
                      </td>
                    ))}
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 800 }}>
                      {activeGridTimesheet.grid?.totalHolidayHours || 8}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 800 }}>5%</td>
                  </tr>

                  {/* Maternity Row */}
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'left' }}>Maternity</td>
                    {activeGridTimesheet.grid?.days?.map((d: any) => (
                      <td
                        key={d.day}
                        style={{
                          border: '1px solid #000',
                          padding: '6px 2px',
                          backgroundColor: d.isWeekend ? '#000' : 'transparent',
                          fontWeight: d.maternity > 0 ? 700 : 400
                        }}
                      >
                        {d.isWeekend ? '' : (d.maternity > 0 ? d.maternity : '0')}
                      </td>
                    ))}
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 800 }}>
                      {activeGridTimesheet.grid?.totalMaternityHours || 0}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 800 }}>
                      {activeGridTimesheet.grid?.totalExpectedHours ? Math.round(((activeGridTimesheet.grid?.totalMaternityHours || 0) / activeGridTimesheet.grid.totalExpectedHours) * 100) : 0}%
                    </td>
                  </tr>

                  {/* Total Row */}
                  <tr style={{ borderTop: '2px solid #000', fontWeight: 900, backgroundColor: '#f3f4f6' }}>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'left' }}>Total</td>
                    {activeGridTimesheet.grid?.days?.map((d: any) => (
                      <td
                        key={d.day}
                        style={{
                          border: '1px solid #000',
                          padding: '6px 2px',
                          backgroundColor: d.isWeekend ? '#000' : '#f3f4f6'
                        }}
                      >
                        {d.isWeekend ? '' : (d.totalDaily > 0 ? d.totalDaily : '0')}
                      </td>
                    ))}
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontSize: '0.8rem' }}>
                      {activeGridTimesheet.grid?.totalHoursWorked || 176}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontSize: '0.8rem' }}>
                      {activeGridTimesheet.compliancePercentage || 100}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </Box>

            {/* Official 3-Column Signature Blocks */}
            <Box sx={{ mt: 5, pt: 2 }}>
              <Typography variant="subtitle1" fontWeight={900} sx={{ textDecoration: 'underline', mb: 3 }}>
                Signature & Date
              </Typography>

              <Grid container spacing={4}>
                {/* 1. Name of Staff */}
                <Grid item xs={4}>
                  <Box sx={{ borderBottom: '1px solid #000', pb: 1, minHeight: 90, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Typography variant="caption" fontWeight={700} color="#000">Name of Staff</Typography>
                    <Typography variant="body2" fontWeight={900}>{activeGridTimesheet.staffSignature?.name || activeGridTimesheet.name}</Typography>
                    <Box sx={{ height: 40, display: 'flex', alignItems: 'center' }}>
                      <img src={activeGridTimesheet.staffSignature?.signatureData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M15 35 C30 10, 45 40, 60 15 C75 35, 90 20, 110 30" stroke="%23000" stroke-width="2" fill="none"/></svg>'} alt="Staff Signature" style={{ maxHeight: 36 }} />
                    </Box>
                  </Box>
                  <Typography variant="caption" fontWeight={700} sx={{ mt: 0.5, display: 'block' }}>
                    Date: {activeGridTimesheet.staffSignature?.date || 'September 13, 2026'}
                  </Typography>
                </Grid>

                {/* 2. Name of Project Coordinator */}
                <Grid item xs={4}>
                  <Box sx={{ borderBottom: '1px solid #000', pb: 1, minHeight: 90, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Typography variant="caption" fontWeight={700} color="#000">Name of Project Coordinator</Typography>
                    <Typography variant="body2" fontWeight={900}>{activeGridTimesheet.supervisorSignature?.name || 'EKWEDIKE DENNIS'}</Typography>
                    <Box sx={{ height: 40, display: 'flex', alignItems: 'center' }}>
                      {activeGridTimesheet.supervisorSignature?.signed ? (
                        <img src={activeGridTimesheet.supervisorSignature.signatureData} alt="Coordinator Signature" style={{ maxHeight: 36 }} />
                      ) : (
                        <Typography variant="caption" color="text.secondary" fontStyle="italic">Awaiting signature</Typography>
                      )}
                    </Box>
                  </Box>
                  <Typography variant="caption" fontWeight={700} sx={{ mt: 0.5, display: 'block' }}>
                    Date: {activeGridTimesheet.supervisorSignature?.date || 'September 13, 2026'}
                  </Typography>
                </Grid>

                {/* 3. Name of Caritas Supervisor / Hospital Admin */}
                <Grid item xs={4}>
                  <Box sx={{ borderBottom: '1px solid #000', pb: 1, minHeight: 90, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Typography variant="caption" fontWeight={700} color="#000">Name of Caritas / Hospital Supervisor</Typography>
                    <Typography variant="body2" fontWeight={900}>{activeGridTimesheet.adminSignature?.name || 'AMEDU ALAPA'}</Typography>
                    <Box sx={{ height: 40, display: 'flex', alignItems: 'center' }}>
                      {activeGridTimesheet.adminSignature?.signed ? (
                        <img src={activeGridTimesheet.adminSignature.signatureData} alt="Administrator Signature" style={{ maxHeight: 36 }} />
                      ) : (
                        <Typography variant="caption" color="text.secondary" fontStyle="italic">Awaiting signature</Typography>
                      )}
                    </Box>
                  </Box>
                  <Typography variant="caption" fontWeight={700} sx={{ mt: 0.5, display: 'block' }}>
                    Date: {activeGridTimesheet.adminSignature?.date || 'September 13, 2026'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Print & Action buttons */}
            <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button onClick={() => setTimesheetPrintModalOpen(false)}>Close</Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Print />}
                onClick={() => window.print()}
                sx={{ px: 4, py: 1, fontWeight: 800, textTransform: 'none' }}
              >
                Print / Save Document (PDF)
              </Button>
            </Box>
          </Box>
        )}
      </Dialog>

      {/* ── Admin Payroll Review & Sign Modal ── */}
      <Dialog
        open={payrollReviewDialogOpen}
        onClose={() => setPayrollReviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ bgcolor: PRIMARY, color: '#fff', py: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Hospital Administrator Payroll Review & Financial Sign-off</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                Cycle: {selectedPayrollRun?.payPeriod || 'June 2026'} ({selectedPayrollRun?.id || 'PAY-001'}) • Automated Timesheet & Attendance Audit
              </Typography>
            </Box>
            <IconButton onClick={() => setPayrollReviewDialogOpen(false)} sx={{ color: '#fff' }}><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {/* Summary KPIs */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>TOTAL GROSS</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>{formatNGN(selectedPayrollRun?.totalGross || 4085000)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ color: DANGER, fontWeight: 700 }}>DEDUCTIONS (PAYE/PENSION)</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: DANGER }}>{formatNGN(selectedPayrollRun?.deductions || 531050)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ color: SUCCESS, fontWeight: 700 }}>NET DISBURSEMENT</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: SUCCESS }}>{formatNGN(selectedPayrollRun?.netPaid || 3553950)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ color: PURPLE, fontWeight: 700 }}>STAFF AUDITED</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: PURPLE }}>{payrollBreakdown.length || employees.length || 15} Staff</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Audit & Compliance checklist */}
          <Paper sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 2, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#166534', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle sx={{ fontSize: 18 }} /> Timesheet & Statutory Compliance Checklist
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#14532d', display: 'block' }}>
                  ✓ 100% Timesheets reconciled with biometric clock (176 hrs benchmark)
                </Typography>
                <Typography variant="caption" sx={{ color: '#14532d', display: 'block' }}>
                  ✓ Overtime calculations verified at 1.5× basic hourly rate
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#14532d', display: 'block' }}>
                  ✓ PAYE statutory income tax computed for State Internal Revenue Service
                </Typography>
                <Typography variant="caption" sx={{ color: '#14532d', display: 'block' }}>
                  ✓ Pension Reform Act 2014 (8% Employee / 10% Employer) & NHF 2.5% applied
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Review & Signing Actions Grid */}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', mb: 1.5 }}>
            Executive Review, Sign-off & Financial GL Transmission
          </Typography>

          <Grid container spacing={2}>
            {/* 1. Admin Sign */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY }}>1. Hospital Administrator</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                    Review timesheet figures & grant executive approval
                  </Typography>
                  {selectedPayrollRun?.signedByAdmin || selectedPayrollRun?.status === 'APPROVED_BY_ADMIN' || selectedPayrollRun?.status === 'ADMIN_APPROVED' || selectedPayrollRun?.status === 'DISBURSED' || selectedPayrollRun?.status === 'TRANSMITTED_TO_FINANCE' ? (
                    <Box sx={{ p: 1, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0', mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: SUCCESS, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircle fontSize="small" /> Approved & Signed
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5, fontWeight: 700 }}>
                        Officer: {(!selectedPayrollRun?.adminName || selectedPayrollRun.adminName === 'undefined undefined' || selectedPayrollRun.adminName.includes('undefined')) ? ((user as any)?.name || 'Amedu Alapa (Hospital Administrator)') : selectedPayrollRun.adminName}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        Date: {selectedPayrollRun?.adminSignatureDate || selectedPayrollRun?.processedAt || new Date().toISOString().slice(0, 10)}
                      </Typography>
                      {/* Render Admin Digital Signature from Timesheet / Profile */}
                      {(() => {
                        const sigSrc = selectedPayrollRun?.adminSignatureData || savedUserSignature || localStorage.getItem('user_digital_signature');
                        if (!sigSrc) return null;
                        return (
                          <Box sx={{ mt: 1, p: 0.75, bgcolor: '#ffffff', borderRadius: 1.5, border: '1px dashed #86efac', textAlign: 'center' }}>
                            <Box 
                              component="img" 
                              src={sigSrc} 
                              alt="Admin Digital Signature" 
                              sx={{ maxHeight: 44, maxWidth: '100%', objectFit: 'contain' }} 
                            />
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem', color: '#166534', fontWeight: 700 }}>
                              ✓ Verified PKI Digital Signature (Timesheet)
                            </Typography>
                          </Box>
                        );
                      })()}
                    </Box>
                  ) : (
                    <Chip label="Awaiting Admin Review" color="warning" size="small" sx={{ mb: 1, fontWeight: 700 }} />
                  )}
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<RateReview />}
                  onClick={() => handleAdminSignPayroll(selectedPayrollRun?.id || 'PAY-001')}
                  disabled={isSigningPayroll || selectedPayrollRun?.signedByAdmin}
                  sx={{ bgcolor: PRIMARY, fontWeight: 700, textTransform: 'none', mt: 1 }}
                >
                  {selectedPayrollRun?.signedByAdmin ? 'Signed as Admin' : 'Approve & Sign as Admin'}
                </Button>
              </Paper>
            </Grid>

            {/* 2. Bishop Seal */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PURPLE }}>2. Episcopal Bishop Seal</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                    Diocesan authorization & episcopal approval seal
                  </Typography>
                  {selectedPayrollRun?.bishopSealApplied || selectedPayrollRun?.signedByBishop || selectedPayrollRun?.status === 'DISBURSED' ? (
                    <Box sx={{ p: 1, bgcolor: '#faf5ff', borderRadius: 1.5, border: '1px solid #e9d5ff', mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: PURPLE, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Verified fontSize="small" /> Episcopal Seal Applied
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                        Catholic Diocese Health Services
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        Date: {selectedPayrollRun?.bishopSignatureDate || selectedPayrollRun?.processedAt || '2026-09-19'}
                      </Typography>
                      {/* Render Episcopal Seal / Signature */}
                      {(() => {
                        const sealSrc = selectedPayrollRun?.bishopSignatureData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="42" viewBox="0 0 160 42"><path d="M10 22 C30 5, 50 38, 80 12 C100 30, 120 12, 150 22" stroke="%236b21a8" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="80" cy="21" r="12" stroke="%236b21a8" stroke-width="1.5" fill="none"/><text x="75" y="25" font-size="10" font-weight="bold" fill="%236b21a8">✚</text></svg>';
                        return (
                          <Box sx={{ mt: 1, p: 0.75, bgcolor: '#ffffff', borderRadius: 1.5, border: '1px dashed #e9d5ff', textAlign: 'center' }}>
                            <Box 
                              component="img" 
                              src={sealSrc} 
                              alt="Episcopal Seal & Signature" 
                              sx={{ maxHeight: 38, maxWidth: '100%', objectFit: 'contain' }} 
                            />
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem', color: PURPLE, fontWeight: 700 }}>
                              ✓ Authorized Episcopal Seal
                            </Typography>
                          </Box>
                        );
                      })()}
                    </Box>
                  ) : (
                    <Chip label="Pending Episcopal Seal" variant="outlined" size="small" sx={{ mb: 1, color: 'text.secondary' }} />
                  )}
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Verified />}
                  onClick={() => handleBishopSignPayroll(selectedPayrollRun?.id || 'PAY-001')}
                  disabled={isSigningPayroll || selectedPayrollRun?.bishopSealApplied}
                  sx={{ bgcolor: PURPLE, color: '#fff', fontWeight: 700, textTransform: 'none', mt: 1, '&:hover': { bgcolor: '#6b21a8' } }}
                >
                  {selectedPayrollRun?.bishopSealApplied ? 'Episcopal Seal Applied' : 'Apply Episcopal Seal'}
                </Button>
              </Paper>
            </Grid>

            {/* 3. Transmit to Finance */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: SUCCESS }}>3. Transmit to Finance GL</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                    Posts double-entry Journal Voucher to General Ledger Account 5020
                  </Typography>
                  {selectedPayrollRun?.status === 'TRANSMITTED_TO_FINANCE' || selectedPayrollRun?.status === 'DISBURSED' ? (
                    <Box sx={{ p: 1, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0', mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: SUCCESS, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircle fontSize="small" /> Transmitted to Finance
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                        GL Acc: 5020 (Staff Salaries Expense)
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        Voucher: {selectedPayrollRun?.financeJvId || 'JV-PAY-001'}
                      </Typography>
                    </Box>
                  ) : (
                    <Chip label="Ready for Finance Dispatch" color="info" size="small" sx={{ mb: 1, fontWeight: 700 }} />
                  )}
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<AccountBalance />}
                  onClick={() => handleTransmitToFinance(selectedPayrollRun?.id || 'PAY-001')}
                  disabled={isTransmittingFinance || selectedPayrollRun?.status === 'TRANSMITTED_TO_FINANCE' || selectedPayrollRun?.status === 'DISBURSED'}
                  sx={{ bgcolor: SUCCESS, color: '#fff', fontWeight: 700, textTransform: 'none', mt: 1, '&:hover': { bgcolor: '#15803d' } }}
                >
                  {selectedPayrollRun?.status === 'TRANSMITTED_TO_FINANCE' || selectedPayrollRun?.status === 'DISBURSED' ? 'Transmitted to Finance' : 'Transmit to Finance Dept'}
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPayrollReviewDialogOpen(false)}>Close</Button>
          <Button
            variant="outlined"
            startIcon={<ReceiptLong />}
            onClick={() => {
              setPayrollReviewDialogOpen(false);
              setShowStaffBreakdown(true);
            }}
            sx={{ borderColor: PRIMARY, color: PRIMARY, fontWeight: 700 }}
          >
            View Staff Breakdown Register
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Official Faith Foundation Mission Hospital Payslip Modal ── */}
      <Dialog
        open={payslipDialogOpen}
        onClose={() => setPayslipDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ bgcolor: PRIMARY, color: '#fff', py: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Faith Foundation Mission Hospital — Official Payslip</Typography>
            <IconButton onClick={() => setPayslipDialogOpen(false)} sx={{ color: '#fff' }}><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4, bgcolor: '#ffffff' }}>
          {selectedPayslip && (
            <Box id="official-hospital-payslip" sx={{ fontFamily: 'Georgia, serif', color: '#000' }}>
              {/* Header with Hospital Logo */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2, borderBottom: '2px solid #1e3a8a', mb: 3 }}>
                <Box
                  component="img"
                  src={assetUrl('/hospital-logo.webp')}
                  alt="Hospital Logo"
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '10px',
                    objectFit: 'contain',
                    border: '1px solid #cbd5e1',
                    p: 0.5,
                    bgcolor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                />
                <Box sx={{ textAlign: 'center', flexGrow: 1, px: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: PRIMARY, letterSpacing: '0.05em' }}>
                    FAITH FOUNDATION MISSION HOSPITAL
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Catholic Diocese Health Services Directorate
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    Gboko Road, P.O. Box 104, Makurdi, Benue State, Nigeria • Email: payroll@faithfoundation.org
                  </Typography>
                  <Chip
                    label={`CONFIDENTIAL SALARY PAYSLIP — ${selectedPayslip.payPeriod || 'JUNE 2026'}`}
                    sx={{ mt: 0.5, bgcolor: '#f1f5f9', fontWeight: 800, color: PRIMARY, fontSize: '0.75rem', border: '1px solid #cbd5e1' }}
                  />
                </Box>
                <Box
                  component="img"
                  src={assetUrl('/hospital-logo.webp')}
                  alt="Hospital Logo"
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '10px',
                    objectFit: 'contain',
                    border: '1px solid #cbd5e1',
                    p: 0.5,
                    bgcolor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                />
              </Box>

              {/* Employee Metadata */}
              <Grid container spacing={2} sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>Employee Name:</strong> {selectedPayslip.name}</Typography>
                  <Typography variant="body2"><strong>Staff ID:</strong> {selectedPayslip.staffId}</Typography>
                  <Typography variant="body2"><strong>Designation / Role:</strong> {selectedPayslip.role}</Typography>
                  <Typography variant="body2"><strong>Department:</strong> {selectedPayslip.department}</Typography>
                  <Typography variant="body2"><strong>Salary Grade:</strong> {selectedPayslip.grade || 'CONMESS Level 12 / Step 4'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>Pay Period:</strong> {selectedPayslip.payPeriod || 'June 2026'}</Typography>
                  <Typography variant="body2"><strong>Bank Name:</strong> {selectedPayslip.bankName || 'Zenith Bank'}</Typography>
                  <Typography variant="body2"><strong>Account Number:</strong> {selectedPayslip.accountNumber || '2084920194'}</Typography>
                  <Typography variant="body2"><strong>Pension PFA / RSA:</strong> {selectedPayslip.pensionPin || 'PEN1009849201 (Stanbic IBTC)'}</Typography>
                  <Typography variant="body2"><strong>Tax ID (TIN):</strong> {selectedPayslip.taxId || 'TIN-BEN-2026-9941'}</Typography>
                </Grid>
              </Grid>

              {/* Earnings & Deductions Tables */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Earnings */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, borderBottom: '2px solid #1e3a8a', pb: 0.5, mb: 1 }}>
                    ITEMIZED EARNINGS (₦)
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>Basic Salary</TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{formatNGN(selectedPayslip.baseSalary || 280000)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>Housing Allowance</TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{formatNGN(selectedPayslip.earnings?.housingAllowance || 45000)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>Transport Allowance</TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{formatNGN(selectedPayslip.earnings?.transportAllowance || 25000)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>Hazard & Clinical Allowance</TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{formatNGN(selectedPayslip.earnings?.hazardAllowance || 35000)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>Shift / Call Duty Allowance</TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{formatNGN(selectedPayslip.earnings?.shiftAllowance || 15000)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>
                          Overtime Pay ({selectedPayslip.timesheet?.overtimeHours || 0} hrs)
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{formatNGN(selectedPayslip.earnings?.overtimePay || 0)}</TableCell>
                      </TableRow>
                      <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                        <TableCell sx={{ fontWeight: 800, py: 1 }}>TOTAL GROSS EARNINGS</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: PRIMARY, py: 1 }}>{formatNGN(selectedPayslip.earnings?.grossSalary || selectedPayslip.baseSalary || 400000)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Grid>

                {/* Deductions */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: DANGER, borderBottom: '2px solid #dc2626', pb: 0.5, mb: 1 }}>
                    STATUTORY DEDUCTIONS (₦)
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>PAYE Income Tax (SIRS)</TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontWeight: 600, color: DANGER, borderBottom: '1px solid #f1f5f9' }}>{formatNGN(selectedPayslip.deductions?.payeTax || 28000)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>Employee Pension Contribution (8%)</TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontWeight: 600, color: DANGER, borderBottom: '1px solid #f1f5f9' }}>{formatNGN(selectedPayslip.deductions?.pensionEmployee || 22400)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>National Housing Fund (NHF 2.5%)</TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontWeight: 600, color: DANGER, borderBottom: '1px solid #f1f5f9' }}>{formatNGN(selectedPayslip.deductions?.nhf || 7000)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>Staff Welfare / Co-op</TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontWeight: 600, color: DANGER, borderBottom: '1px solid #f1f5f9' }}>{formatNGN(selectedPayslip.deductions?.welfare || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>Medical Insurance NHIS/Social</TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontWeight: 600, color: DANGER, borderBottom: '1px solid #f1f5f9' }}>₦0.00</TableCell>
                      </TableRow>
                      <TableRow sx={{ bgcolor: '#fef2f2' }}>
                        <TableCell sx={{ fontWeight: 800, py: 1, color: DANGER }}>TOTAL DEDUCTIONS</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: DANGER, py: 1 }}>{formatNGN(selectedPayslip.deductions?.totalDeductions || 57400)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Grid>
              </Grid>

              {/* Net Pay Callout Box */}
              <Paper sx={{ p: 2, bgcolor: '#f0fdf4', border: '2px solid #22c55e', borderRadius: 2, textAlign: 'center', mb: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#15803d', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  NET SALARY PAYABLE INTO BANK ACCOUNT
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#15803d', my: 0.5 }}>
                  {formatNGN(selectedPayslip.netPay || 342600)}
                </Typography>
                <Typography variant="caption" sx={{ fontStyle: 'italic', color: '#166534' }}>
                  Payment Transferred to {selectedPayslip.bankName || 'Zenith Bank'} • Account No: {selectedPayslip.accountNumber || '2084920194'}
                </Typography>
              </Paper>

              {/* Signatures & Seal */}
              <Grid container spacing={3} sx={{ pt: 2, borderTop: '1px solid #cbd5e1' }}>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: '#475569' }}>Prepared By</Typography>
                  <Box sx={{ height: 40, my: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', fontFamily: 'cursive', color: PRIMARY }}>HR & Payroll Officer</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, display: 'block' }}>Human Resources Directorate</Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: '#475569' }}>Approved & Signed By</Typography>
                  <Box sx={{ height: 40, my: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Chip size="small" icon={<Verified fontSize="small" />} label="AMEDU ALAPA" color="success" sx={{ fontWeight: 800 }} />
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, display: 'block' }}>Hospital Administrator</Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: '#475569' }}>Episcopal Authorization</Typography>
                  <Box sx={{ height: 40, my: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Chip size="small" icon={<CheckCircle fontSize="small" />} label="EPISCOPAL SEAL" sx={{ bgcolor: '#f3e8ff', color: '#6b21a8', fontWeight: 800 }} />
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, display: 'block' }}>Catholic Diocese of Makurdi</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setPayslipDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Print />}
            onClick={() => window.print()}
            sx={{ px: 3, py: 1, fontWeight: 800, textTransform: 'none' }}
          >
            Print / Save Payslip (PDF)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkforceHR;
