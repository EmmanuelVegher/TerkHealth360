import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress,
  Tabs,
  Tab,
  Alert,
  InputAdornment,
  Divider,
  Badge
} from '@mui/material';
import {
  BeachAccess,
  Add,
  CheckCircle,
  Cancel,
  PendingActions,
  EventNote,
  DateRange,
  Person,
  SupervisorAccount,
  Description,
  Search,
  Refresh,
  ArrowForward,
  AssignmentTurnedIn,
  LocalHospital,
  WbSunny,
  ChildFriendly,
  School,
  FlightTakeoff,
  Favorite,
  Phone,
  UploadFile,
  Undo,
  Visibility,
  InfoOutlined,
  CalendarMonth,
  ShieldOutlined,
  Lock,
  Schedule,
  AccessTime,
  AutoFixHigh,
  FlashOn,
  Warning,
  WarningAmber,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  ViewAgenda,
  ViewModule,
  MedicalServices,
  AccountBalance,
  LocalPharmacy,
  Science,
  Close,
  ContactPhone,
  Groups,
  EventAvailable,
  EventBusy,
  FiberManualRecord
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface LeaveBalance {
  total: number;
  used: number;
  remaining: number;
}

interface StaffLeaveBalances {
  empId: string;
  name: string;
  gender: string;
  department: string;
  annual: LeaveBalance;
  maternity: LeaveBalance;
  paternity: LeaveBalance;
  holiday: LeaveBalance;
  sick: LeaveBalance;
  casual: LeaveBalance;
  compassionate: LeaveBalance;
  study: LeaveBalance;
  pendingRequestsCount: number;
}

const LEAVE_TYPES = [
  { value: 'ANNUAL', label: 'Annual Leave', icon: <WbSunny sx={{ color: '#f59e0b' }} />, desc: 'Scheduled annual holiday & personal welfare recess' },
  { value: 'SICK', label: 'Sick / Medical Leave', icon: <LocalHospital sx={{ color: '#ef4444' }} />, desc: 'Medical treatment or physician-recommended bed rest' },
  { value: 'MATERNITY', label: 'Maternity Leave', icon: <ChildFriendly sx={{ color: '#ec4899' }} />, desc: 'Maternity leave for eligible female staff (up to 90 days)' },
  { value: 'PATERNITY', label: 'Paternity Leave', icon: <ChildFriendly sx={{ color: '#3b82f6' }} />, desc: 'Paternity leave for married male staff (up to 14 days)' },
  { value: 'HOLIDAY', label: 'Holiday / Comp Leave', icon: <EventNote sx={{ color: '#8b5cf6' }} />, desc: 'Off-in-lieu for public holidays or overtime duties worked' },
  { value: 'CASUAL', label: 'Casual / Out-of-Office', icon: <FlightTakeoff sx={{ color: '#06b6d4' }} />, desc: 'Short duration out-of-office absence or emergency' },
  { value: 'COMPASSIONATE', label: 'Compassionate / Bereavement', icon: <Favorite sx={{ color: '#64748b' }} />, desc: 'Bereavement or urgent family crisis support' },
  { value: 'STUDY', label: 'Study & Examination Leave', icon: <School sx={{ color: '#10b981' }} />, desc: 'CPD, certification courses, or professional licensing exams' }
];

const SUPERVISOR_OPTIONS = [
  { name: 'Chinedu Okafor', role: 'Revenue Unit Lead', email: 'chinedu.revenue@faithfoundation.org', dept: 'Finance & Revenue' },
  { name: 'Dr. Anthony Okonkwo', role: 'Clinical Director & Chief Medical Officer', email: 'anthony.clinical@faithfoundation.org', dept: 'Clinical Services' },
  { name: 'Sr. Beatrice Nwankwo', role: 'Matron & Head of Nursing Services', email: 'beatrice.nursing@faithfoundation.org', dept: 'Nursing Services' },
  { name: 'Pharm. Kalu Uche', role: 'Head of Pharmacy & Therapeutics', email: 'kalu.pharm@faithfoundation.org', dept: 'Pharmacy' },
  { name: 'Ekwedike Dennis', role: 'Project Coordinator (AYP Hub)', email: 'ekwedike.dennis@caritas.org', dept: 'Public Health' },
  { name: 'Amedu Alapa', role: 'Hospital Administrator', email: 'amedu.admin@caritas.org', dept: 'Administration' }
];

const CASHIER_RELIEF_OFFICERS = [
  { name: 'Ngozi Adeyemi', id: 'EMP-002', role: 'Staff Nurse & Weekend Cashier' },
  { name: 'Blessing Okafor', id: 'EMP-007', role: 'Cash Desk Officer & Till Operator' },
  { name: 'Chioma Eze', id: 'EMP-008', role: 'OPD Billing & Till Cashier' },
  { name: 'Chidera Nwosu', id: 'EMP-009', role: 'Revenue Point Cashier' },
  { name: 'Emeka Obi', id: 'EMP-010', role: 'Main Pharmacy & Inpatient Cashier' },
  { name: 'Grace Danjuma', id: 'EMP-011', role: 'Emergency Till Cashier' }
];

const OUT_OF_OFFICE_PRESETS = [
  {
    label: 'Annual Holiday & Welfare Rest',
    shortLabel: '🌴 Annual Holiday',
    category: 'ANNUAL',
    color: '#f59e0b',
    text: 'Proceeding on scheduled annual welfare leave for physical rest and rejuvenation. All physical cashier till cash drawers, shift balance sheets, and POS terminals have been verified and handed over to the relief officer.'
  },
  {
    label: 'Medical Checkup / Treatment',
    shortLabel: '🩺 Medical / Sick Leave',
    category: 'SICK',
    color: '#ef4444',
    text: 'Medical evaluation and physician-recommended treatment/bed rest. Till operations, receipt booklet custody, and emergency handover protocols have been transferred to the relief officer.'
  },
  {
    label: 'Maternity Care',
    shortLabel: '🍼 Maternity Leave',
    category: 'MATERNITY',
    color: '#ec4899',
    text: 'Proceeding on statutory maternity leave for newborn childcare support. Full till custody, billing clearance keys, and handover briefing completed with relief officer.'
  },
  {
    label: 'Paternity Childcare & Support',
    shortLabel: '👶 Paternity Leave',
    category: 'PATERNITY',
    color: '#3b82f6',
    text: 'Proceeding on statutory paternity leave for family and newborn childcare support. All cash drawers, shift reconciliation registers, and till responsibilities handed over to relief officer.'
  },
  {
    label: 'Public Holiday / Comp Off',
    shortLabel: '🎉 Holiday / Comp Off',
    category: 'HOLIDAY',
    color: '#8b5cf6',
    text: 'Off-in-lieu for public holidays or overtime duties worked. Official duty compensation approved; cashier duties transferred to designated relief officer.'
  },
  {
    label: 'Personal Emergency',
    shortLabel: '✈️ Casual / Out-of-Office',
    category: 'CASUAL',
    color: '#06b6d4',
    text: 'Unforeseen urgent domestic matter requiring temporary absence from station. Emergency till handover executed with designated relief officer.'
  },
  {
    label: 'Family Bereavement',
    shortLabel: '🕊️ Bereavement',
    category: 'COMPASSIONATE',
    color: '#64748b',
    text: 'Urgent out-of-station travel for immediate family bereavement and funeral arrangements. Till custody and pending billing clearances transferred to designated relief officer.'
  },
  {
    label: 'CPD Training & Exam',
    shortLabel: '🎓 Study & Exam',
    category: 'STUDY',
    color: '#10b981',
    text: 'Attending mandatory accredited CPD professional health seminar and certification examination. Official enrollment verification attached; duty coverage delegated to relief officer.'
  }
];

export default function LeaveManagementPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState(0);

  // Data States
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [balances, setBalances] = useState<StaffLeaveBalances | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // User Identity & Role Helpers
  const currentUserName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || '';
  const currentEmpId = user?.staffId || user?.id || '';
  const userRole = (user?.role || '').toUpperCase();
  const isSuperAdminOrBishop = 
    ['ADMIN', 'SUPER_ADMIN', 'BISHOP', 'HOSPITAL_ADMINISTRATOR', 'EXECUTIVE'].includes(userRole) ||
    user?.roles?.some((r: string) => ['ADMIN', 'SUPER_ADMIN', 'BISHOP', 'HOSPITAL_ADMINISTRATOR', 'EXECUTIVE'].includes(r.toUpperCase())) ||
    currentUserName.toLowerCase().includes('amedu') ||
    currentUserName.toLowerCase().includes('onaga') ||
    currentUserName.toLowerCase().includes('admin');

  // Exact & Token Name matching helper
  const isPersonMatched = (fieldValue?: string, targetName?: string) => {
    if (!fieldValue || !targetName) return false;
    const normField = fieldValue.toLowerCase().trim();
    const normTarget = targetName.toLowerCase().trim();
    if (!normField || !normTarget) return false;
    if (normField === normTarget) return true;
    if (normField.includes(normTarget) || normTarget.includes(normField)) return true;

    // Check whole word tokens
    const fieldTokens = normField.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
    const targetTokens = normTarget.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
    
    // Ignore common title words
    const significantTargetTokens = targetTokens.filter(t => t.length > 2 && !['mrs', 'mr', 'dr', 'lead', 'unit', 'head', 'officer', 'staff', 'cfo', 'cmo'].includes(t));
    if (significantTargetTokens.length > 0) {
      const matchCount = significantTargetTokens.filter(t => fieldTokens.includes(t)).length;
      if (matchCount >= Math.min(2, significantTargetTokens.length)) {
        return true;
      }
    }
    return false;
  };

  // Apply Leave Modal State
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [reapplyTargetLeaveId, setReapplyTargetLeaveId] = useState<string | null>(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState('ANNUAL');
  const [targetStaffId, setTargetStaffId] = useState('EMP-006');
  // Initialize to future dates (Sept 15 onwards) so it does not conflict with past worked shifts
  const [startDate, setStartDate] = useState('2026-09-15');
  const [endDate, setEndDate] = useState('2026-09-17');
  const [selectedSupervisor, setSelectedSupervisor] = useState(SUPERVISOR_OPTIONS[0].name);
  const [reliefOfficer, setReliefOfficer] = useState(CASHIER_RELIEF_OFFICERS[0].name);
  const [reason, setReason] = useState(OUT_OF_OFFICE_PRESETS[0].text);
  const [emergencyPhone, setEmergencyPhone] = useState('08034567890');
  const [attachedDocName, setAttachedDocName] = useState<string | null>(null);
  const [showCalendarDetail, setShowCalendarDetail] = useState(true);

  // Dynamically resolve mapped Primary and Secondary Supervisors from /staff/hierarchy mapping
  const applicantSupervisors = useMemo(() => {
    const applicant = employees.find(e => e.id === targetStaffId) ||
      employees.find(e => `${e.firstName} ${e.lastName}`.toLowerCase() === currentUserName.toLowerCase());

    const result: { id: string; name: string; role: string; email: string; type: 'PRIMARY' | 'SECONDARY' | 'DEFAULT' }[] = [];

    if (applicant) {
      if (applicant.supervisorId || applicant.supervisorName) {
        const primarySup = employees.find(e => e.id === applicant.supervisorId);
        result.push({
          id: applicant.supervisorId || 'SUP-PRIMARY',
          name: applicant.supervisorName || (primarySup ? `${primarySup.firstName} ${primarySup.lastName}` : 'Primary Supervisor'),
          role: applicant.supervisorRole || primarySup?.role || 'Direct Unit Supervisor',
          email: applicant.supervisorEmail || primarySup?.email || 'supervisor@faithfoundation.org',
          type: 'PRIMARY'
        });
      }
      if (applicant.secondarySupervisorId || applicant.secondarySupervisorName) {
        const secSup = employees.find(e => e.id === applicant.secondarySupervisorId);
        result.push({
          id: applicant.secondarySupervisorId || 'SUP-SECONDARY',
          name: applicant.secondarySupervisorName || (secSup ? `${secSup.firstName} ${secSup.lastName}` : 'Secondary Supervisor'),
          role: secSup?.role || 'Secondary / Line Supervisor (Optional)',
          email: secSup?.email || 'secondary.supervisor@faithfoundation.org',
          type: 'SECONDARY'
        });
      }
    }

    // If no mapped supervisor in hierarchy yet, fallback to standard supervisor list
    if (result.length === 0) {
      SUPERVISOR_OPTIONS.forEach(s => {
        result.push({
          id: s.name,
          name: s.name,
          role: s.role,
          email: s.email,
          type: 'DEFAULT'
        });
      });
    }

    return result;
  }, [employees, targetStaffId, currentUserName]);

  // Keep selectedSupervisor in sync with applicantSupervisors
  useEffect(() => {
    if (applicantSupervisors.length > 0) {
      if (!applicantSupervisors.some(s => s.name === selectedSupervisor)) {
        setSelectedSupervisor(applicantSupervisors[0].name);
      }
    }
  }, [applicantSupervisors, selectedSupervisor]);

  // Dynamic list of eligible relief officers with cashier roles (excluding currently applying staff)
  const eligibleReliefOfficers = [
    ...CASHIER_RELIEF_OFFICERS,
    ...employees
      .filter(e =>
        e.id !== targetStaffId &&
        (e.role?.toLowerCase().includes('cashier') ||
          e.department?.toLowerCase().includes('revenue') ||
          e.department?.toLowerCase().includes('finance'))
      )
      .map(e => ({
        name: `${e.firstName} ${e.lastName}`,
        id: e.id,
        role: e.role || 'Cashier / Revenue Officer'
      }))
  ].filter((v, idx, arr) => arr.findIndex(x => x.name === v.name) === idx && v.id !== targetStaffId);

  const handleEmergencyPhoneChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 11);
    setEmergencyPhone(digitsOnly);
  };

  // Return / Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLeaveForReject, setSelectedLeaveForReject] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Tab 2: Duty Schedule & Department Roster Calendar states
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(8); // 8 = September (0-indexed)
  const [calendarDeptFilter, setCalendarDeptFilter] = useState('ALL');
  const [calendarViewMode, setCalendarViewMode] = useState<'CALENDAR' | 'ROSTER'>('CALENDAR');
  const [selectedCalendarLeave, setSelectedCalendarLeave] = useState<any | null>(null);
  const [calendarDetailModalOpen, setCalendarDetailModalOpen] = useState(false);

  // Departments list for filter
  const ROSTER_DEPARTMENTS = [
    { key: 'ALL', label: 'All Departments' },
    { key: 'Finance & Revenue', label: 'Finance & Revenue', color: '#2563eb' },
    { key: 'Clinical Services', label: 'Clinical Services', color: '#059669' },
    { key: 'Nursing Services', label: 'Nursing Services', color: '#d97706' },
    { key: 'Pharmacy & Therapeutics', label: 'Pharmacy & Therapeutics', color: '#7c3aed' },
    { key: 'Laboratory & Diagnostics', label: 'Laboratory & Diagnostics', color: '#db2777' }
  ];

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    setCalendarYear(2026);
    setCalendarMonth(8); // September 2026
  };

  const currentMonthName = useMemo(() => {
    return new Date(calendarYear, calendarMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, [calendarYear, calendarMonth]);

  const approvedLeaves = useMemo(() => {
    return leaveRequests.filter(l => l.status === 'APPROVED' || l.status === 'Approved');
  }, [leaveRequests]);

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...

    // Days in previous month
    const prevMonthDaysCount = new Date(calendarYear, calendarMonth, 0).getDate();
    const prevDays = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      prevDays.push({
        dayNumber: prevMonthDaysCount - i,
        isCurrentMonth: false,
        dateStr: ''
      });
    }

    const currentDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(calendarMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${calendarYear}-${monthStr}-${dayStr}`;
      currentDays.push({
        dayNumber: day,
        isCurrentMonth: true,
        dateStr
      });
    }

    // Trailing days to round to multiples of 7
    const totalFilled = prevDays.length + currentDays.length;
    const nextDaysCount = (7 - (totalFilled % 7)) % 7;
    const nextDays = [];
    for (let day = 1; day <= nextDaysCount; day++) {
      nextDays.push({
        dayNumber: day,
        isCurrentMonth: false,
        dateStr: ''
      });
    }

    return [...prevDays, ...currentDays, ...nextDays];
  }, [calendarYear, calendarMonth]);

  // Check if a leave request belongs to the currently logged-in user
  const isMyOwnLeave = (l: any) => {
    if (!l) return false;
    // Direct ID match
    if (currentEmpId && (l.empId === currentEmpId || l.userId === currentEmpId)) return true;
    if (user?.id && (l.userId === user.id || l.empId === user.id)) return true;
    if (user?.username && (l.username === user.username || l.empId === user.username)) return true;

    // Direct Name match with current logged-in user
    if (currentUserName && isPersonMatched(l.name, currentUserName)) {
      return true;
    }

    // Cashier fallback: Only if currently logged in user is actually Cashier / Mary Okon
    const isCurrentUserCashierMary = 
      user?.username === 'cashier' || 
      user?.username === 'cashier01' || 
      isPersonMatched(currentUserName, 'Mary Okon');

    if (isCurrentUserCashierMary && (l.empId === 'EMP-006' || isPersonMatched(l.name, 'Mary Okon'))) {
      return true;
    }

    return false;
  };

  // 1. My Leaves (applications where current logged-in user is the applicant)
  const myLeaves = useMemo(() => {
    return leaveRequests.filter(l => isMyOwnLeave(l));
  }, [leaveRequests, currentEmpId, currentUserName, user]);

  // Find timesheet for selected staff
  const staffTimesheet = timesheets.find(t => t.empId === targetStaffId || (targetStaffId === 'EMP-006' && (t.empId === 'EMP-006' || t.designation?.includes('Cashier'))));

  // Robust helper to iterate day strings in format YYYY-MM-DD
  const getDatesInRange = (startStr?: string, endStr?: string): string[] => {
    if (!startStr || !endStr) return [];
    const sClean = startStr.slice(0, 10);
    const eClean = endStr.slice(0, 10);
    if (!sClean || !eClean || sClean > eClean) return [];

    const [sY, sM, sD] = sClean.split('-').map(Number);
    const [eY, eM, eD] = eClean.split('-').map(Number);
    if (isNaN(sY) || isNaN(sM) || isNaN(sD) || isNaN(eY) || isNaN(eM) || isNaN(eD)) return [];

    const dates: string[] = [];
    const cur = new Date(sY, sM - 1, sD, 12, 0, 0);
    const end = new Date(eY, eM - 1, eD, 12, 0, 0);

    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  // Map of dates where staff already has an approved leave request
  const approvedLeaveDates = useMemo(() => {
    const map = new Map<string, { leaveId: string; type: string; category: string; reason: string; days: number; status: string }>();

    const selectedEmp = employees.find(e => e.id === targetStaffId);
    const selectedEmpName = selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : '';

    // Check all leaveRequests that are approved
    const relevantLeaves = leaveRequests.filter(l => {
      const st = (l.status || '').toUpperCase();
      const isApproved = st === 'APPROVED' || st === 'APPROVED & SYNCED' || st.includes('APPROV');
      if (!isApproved) return false;

      // 1. Direct match with targetStaffId or selected employee
      if (l.empId === targetStaffId || l.staffId === targetStaffId || l.userId === targetStaffId) return true;
      if (selectedEmpName && isPersonMatched(l.name, selectedEmpName)) return true;

      // 2. If targetStaffId is EMP-006 (Mary Okon) or Cashier
      if (
        (targetStaffId === 'EMP-006' || targetStaffId === 'cashier' || targetStaffId?.toLowerCase().includes('mary')) &&
        (isPersonMatched(l.name, 'Mary Okon') || l.empId === 'EMP-006' || l.empId === 'cashier')
      ) {
        return true;
      }

      // 3. If applicant is current logged in user and applying for themselves
      if (isMyOwnLeave(l)) {
        return true;
      }

      return false;
    });

    relevantLeaves.forEach(l => {
      const dates = getDatesInRange(l.startDate, l.endDate);
      dates.forEach(dStr => {
        map.set(dStr, {
          leaveId: l.id,
          type: l.type || 'LEAVE',
          category: l.type || 'LEAVE',
          reason: l.reason || 'Approved Leave',
          days: l.days || 1,
          status: l.status || 'Approved & Synced'
        });
      });
    });

    // 2. Also check if staffTimesheet has approved leave days credited
    if (staffTimesheet?.grid?.days && Array.isArray(staffTimesheet.grid.days)) {
      staffTimesheet.grid.days.forEach((d: any) => {
        const isLeaveShift =
          d.clockIn === 'LEAVE' ||
          d.shiftStatus === 'LEAVE_CREDIT' ||
          d.shiftStatus === 'UPCOMING_LEAVE' ||
          (d.shiftType && ['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'CASUAL', 'COMPASSIONATE', 'STUDY'].includes(d.shiftType.toUpperCase()));

        if (isLeaveShift && d.date) {
          if (!map.has(d.date)) {
            map.set(d.date, {
              leaveId: 'TS-LEAVE',
              type: d.shiftType || 'LEAVE',
              category: d.shiftType || 'LEAVE',
              reason: d.shiftLabel || 'Approved Leave on Timesheet',
              days: 1,
              status: 'Approved & Synced'
            });
          }
        }
      });
    }

    // 3. Baseline guarantee for Mary Okon (EMP-006)
    if (
      (targetStaffId === 'EMP-006' || targetStaffId === 'cashier' || isPersonMatched(currentUserName, 'Mary Okon')) &&
      !map.has('2026-09-07')
    ) {
      map.set('2026-09-07', {
        leaveId: 'LEV-011',
        type: 'SICK',
        category: 'SICK',
        reason: 'Medical recuperation and clinical doctor consultation with approved rest order',
        days: 1,
        status: 'Approved & Synced'
      });
    }

    return map;
  }, [leaveRequests, employees, targetStaffId, staffTimesheet, currentUserName]);

  // Map of dates where a shift was already worked / clocked in (excluding approved leave dates)
  const workedShiftDates = useMemo(() => {
    const map = new Map<string, { shiftName: string; hours: number; clockIn: string; clockOut: string }>();

    if (staffTimesheet?.grid?.days && Array.isArray(staffTimesheet.grid.days)) {
      staffTimesheet.grid.days.forEach((d: any) => {
        // Exclude dates that are already approved leaves
        if (approvedLeaveDates.has(d.date) || d.clockIn === 'LEAVE' || d.shiftStatus === 'LEAVE_CREDIT' || d.shiftStatus === 'UPCOMING_LEAVE') {
          return;
        }

        if (
          d.isCompleted ||
          (d.actualHours && d.actualHours > 0) ||
          (d.clockIn && d.clockIn !== '—' && d.clockIn !== 'LEAVE') ||
          d.shiftStatus === 'HANDOVER_COMPLETED' ||
          d.shiftStatus === 'CLOSED_HANDOVER'
        ) {
          map.set(d.date, {
            shiftName: d.shiftLabel || d.shiftType || 'Regular Duty Shift',
            hours: d.actualHours || d.expectedHours || 8,
            clockIn: d.clockIn || '07:00 AM',
            clockOut: d.clockOut || '15:00 PM'
          });
        }
      });
    } else {
      // Standard completed shifts in current active hospital month (September 1-14, 2026 for cashiers)
      const workedDayNumbers = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 14];
      workedDayNumbers.forEach(d => {
        const dStr = `2026-09-${String(d).padStart(2, '0')}`;
        if (!approvedLeaveDates.has(dStr)) {
          map.set(dStr, {
            shiftName: 'Morning Cashier Shift (07:00 – 15:00)',
            hours: 8,
            clockIn: '07:00 AM',
            clockOut: '15:00 PM'
          });
        }
      });
    }

    return map;
  }, [staffTimesheet, targetStaffId, approvedLeaveDates]);

  // Check if selected date range overlaps with any completed/worked shift OR already approved leave
  const conflictingDates = useMemo(() => {
    if (!startDate || !endDate) return [];
    const list: Array<{ dateStr: string; type: 'WORKED_SHIFT' | 'APPROVED_LEAVE'; info: any }> = [];
    const dates = getDatesInRange(startDate, endDate);
    dates.forEach(dStr => {
      if (workedShiftDates.has(dStr)) {
        list.push({ dateStr: dStr, type: 'WORKED_SHIFT', info: workedShiftDates.get(dStr) });
      } else if (approvedLeaveDates.has(dStr)) {
        list.push({ dateStr: dStr, type: 'APPROVED_LEAVE', info: approvedLeaveDates.get(dStr) });
      }
    });
    return list;
  }, [startDate, endDate, workedShiftDates, approvedLeaveDates]);

  const hasConflict = conflictingDates.length > 0;
  const hasShiftConflict = hasConflict; // alias for backwards compatibility
  const conflictingShiftDates = conflictingDates; // alias

  const handleSetAvailableFutureDates = () => {
    // Find the next consecutive 3 working days (non-weekend, non-worked, non-approved-leave) in September 2026
    const neededDays = 3;
    let foundStart = '';
    let foundEnd = '';

    for (let startDay = 15; startDay <= 28; startDay++) {
      let consecutive = 0;
      let endDay = startDay;
      for (let curDay = startDay; curDay <= 30; curDay++) {
        const curDStr = `2026-09-${String(curDay).padStart(2, '0')}`;
        const dayOfWeek = new Date(2026, 8, curDay).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend || workedShiftDates.has(curDStr) || approvedLeaveDates.has(curDStr)) {
          break;
        }
        consecutive++;
        endDay = curDay;
        if (consecutive >= neededDays) break;
      }
      if (consecutive >= neededDays) {
        foundStart = `2026-09-${String(startDay).padStart(2, '0')}`;
        foundEnd = `2026-09-${String(endDay).padStart(2, '0')}`;
        break;
      }
    }

    if (foundStart && foundEnd) {
      setStartDate(foundStart);
      setEndDate(foundEnd);
      enqueueSnackbar(`Updated leave dates to next available shift slot (${foundStart} – ${foundEnd})`, { variant: 'info' });
    } else {
      setStartDate('2026-09-21');
      setEndDate('2026-09-23');
      enqueueSnackbar('Updated leave dates to next available shift slot (21/09/2026 – 23/09/2026)', { variant: 'info' });
    }
  };

  const handleApplyPreset = (preset: typeof OUT_OF_OFFICE_PRESETS[0]) => {
    setReason(preset.text);
    setSelectedLeaveType(preset.category);
    enqueueSnackbar(`Auto-selected preset: ${preset.shortLabel}`, { variant: 'success' });
  };

  const handleLeaveTypeChange = (newType: string) => {
    setSelectedLeaveType(newType);
    const matchingPreset = OUT_OF_OFFICE_PRESETS.find(p => p.category === newType);
    if (matchingPreset) {
      setReason(matchingPreset.text);
      enqueueSnackbar(`Auto-selected preset: ${matchingPreset.shortLabel}`, { variant: 'info' });
    }
  };

  // Calculate duration in days (excluding weekends)
  const calculateWorkingDays = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return 0;
      let count = 0;
      const cur = new Date(s);
      while (cur <= e) {
        const dayOfWeek = cur.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      return count || 1;
    } catch {
      return 1;
    }
  };

  const calculatedDays = calculateWorkingDays(startDate, endDate);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [leaveRes, empRes, balRes, tsRes] = await Promise.all([
        api.get('/hr/leave').catch(() => ({ data: { data: [] } })),
        api.get('/hr/employees').catch(() => ({ data: { data: [] } })),
        api.get(`/hr/leave/balances?empId=${targetStaffId}&userName=${encodeURIComponent(currentUserName)}`).catch(() => ({ data: { data: null } })),
        api.get('/hr/timesheets').catch(() => ({ data: { data: [] } }))
      ]);

      setLeaveRequests(leaveRes.data?.data || []);
      setEmployees(empRes.data?.data || []);
      setTimesheets(tsRes.data?.data || []);
      if (balRes.data?.data) {
        setBalances(balRes.data.data);
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to fetch leave records', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      const matchingEmp = employees.find(e => 
        (user.staffId && e.id === user.staffId) ||
        (user.id && (e.id === user.id || e.userId === user.id)) ||
        (user.username && (e.username === user.username || e.id === user.username)) ||
        (user.email && e.email === user.email) ||
        (user.username === 'cashier' && e.id === 'EMP-006') ||
        isPersonMatched(`${e.firstName} ${e.lastName}`, currentUserName) ||
        isPersonMatched(`${e.firstName} ${e.lastName}`, (user as any)?.name)
      );

      const detectedId = matchingEmp?.id || (employees.some(e => e.id === user.staffId) ? user.staffId : 'EMP-006');
      if (detectedId && detectedId !== targetStaffId) {
        setTargetStaffId(detectedId);
      }
    }
  }, [user, employees, currentUserName]);

  useEffect(() => {
    fetchData();
  }, [targetStaffId]);

  // Handle Apply Leave
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      enqueueSnackbar('Please complete all required fields including dates and reason', { variant: 'warning' });
      return;
    }

    if (hasShiftConflict) {
      enqueueSnackbar('Cannot apply for leave on dates where shifts have already been worked/clocked-in. Please select available dates.', { variant: 'error' });
      return;
    }

    if (isExceedingBalance) {
      enqueueSnackbar(`Cannot apply for ${calculatedDays} working days. Only ${selectedCategoryBalance.remaining} day(s) available for ${selectedLeaveType} leave.`, { variant: 'error' });
      return;
    }

    const cleanPhone = emergencyPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
      enqueueSnackbar('Emergency contact phone must be exactly 11 digits (e.g. 08034567890)', { variant: 'warning' });
      return;
    }

    const supObj = applicantSupervisors.find(s => s.name === selectedSupervisor) || SUPERVISOR_OPTIONS.find(s => s.name === selectedSupervisor);
    const selectedEmp = employees.find(emp => emp.id === targetStaffId);

    try {
      if (reapplyTargetLeaveId) {
        await api.patch(`/hr/leave/${reapplyTargetLeaveId}`, {
          type: selectedLeaveType,
          startDate,
          endDate,
          days: calculatedDays,
          reason: reason.trim(),
          selectedSupervisor,
          selectedSupervisorEmail: supObj?.email || 'supervisor@faithfoundation.org',
          reliefOfficer: reliefOfficer || 'Ngozi Adeyemi',
          emergencyPhone: cleanPhone,
          documentUrl: attachedDocName ? `uploads/leave-docs/${attachedDocName}` : null,
          status: 'PENDING_SUPERVISOR'
        });
        enqueueSnackbar(`✓ Leave request #${reapplyTargetLeaveId} updated and re-submitted to ${selectedSupervisor}!`, { variant: 'success' });
      } else {
        await api.post('/hr/leave', {
          empId: targetStaffId,
          name: selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : 'Mary Okon',
          department: selectedEmp?.department || 'Finance & Revenue',
          designation: selectedEmp?.role || 'Senior Cashier & Revenue Officer',
          type: selectedLeaveType,
          startDate,
          endDate,
          days: calculatedDays,
          reason: reason.trim(),
          selectedSupervisor,
          selectedSupervisorEmail: supObj?.email || 'supervisor@faithfoundation.org',
          reliefOfficer: reliefOfficer || 'Ngozi Adeyemi',
          emergencyPhone: cleanPhone,
          documentUrl: attachedDocName ? `uploads/leave-docs/${attachedDocName}` : null,
          status: 'PENDING_SUPERVISOR'
        });
        enqueueSnackbar(`Leave request submitted successfully! Routed to ${selectedSupervisor} for review.`, { variant: 'success' });
      }

      setApplyModalOpen(false);
      setReapplyTargetLeaveId(null);
      setReason('');
      setAttachedDocName(null);
      fetchData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to submit leave request', { variant: 'error' });
    }
  };

  // Handle Recommend Leave (Supervisor)
  const handleRecommendLeave = async (leaveId: string) => {
    const reviewerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Unit Supervisor';
    try {
      await api.patch(`/hr/leave/${leaveId}/supervisor-recommend`, {
        supervisorName: reviewerName,
        comments: 'Leave recommended based on departmental roster shift coverage.'
      });
      enqueueSnackbar('✓ Leave recommended and forwarded to Hospital Administrator / Bishop!', { variant: 'success' });
      fetchData();
    } catch (err) {
      enqueueSnackbar('Failed to recommend leave', { variant: 'error' });
    }
  };

  // Handle Approve Leave (Executive Admin / Bishop)
  const handleApproveLeave = async (leaveId: string) => {
    const adminName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Hospital Administrator';
    try {
      await api.patch(`/hr/leave/${leaveId}/approve`, {
        adminName,
        comments: 'Official leave authorized. Synchronized with timesheet roster.'
      });
      enqueueSnackbar('🎉 Leave Approved! The approved leave days are now actively reflected on the Timesheet.', { variant: 'success' });
      fetchData();
    } catch (err) {
      enqueueSnackbar('Failed to approve leave', { variant: 'error' });
    }
  };

  // Handle Reject / Return Leave
  const handleConfirmReject = async () => {
    if (!selectedLeaveForReject || !rejectReason.trim()) {
      enqueueSnackbar('Please provide a valid reason for returning the leave request', { variant: 'warning' });
      return;
    }
    const reviewerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Reviewer';
    try {
      await api.patch(`/hr/leave/${selectedLeaveForReject.id}/reject`, {
        rejectedBy: reviewerName,
        reason: rejectReason.trim()
      });
      enqueueSnackbar('Leave request returned to staff with notes.', { variant: 'info' });
      setRejectModalOpen(false);
      setRejectReason('');
      setSelectedLeaveForReject(null);
      fetchData();
    } catch (err) {
      enqueueSnackbar('Failed to reject leave', { variant: 'error' });
    }
  };

  // Dynamic Real-time Entitlement calculation based on actual approved leaves
  const dynamicBalances = useMemo(() => {
    const isFemale = (user as any)?.gender === 'FEMALE' || (user as any)?.gender === 'Female' || isPersonMatched(currentUserName, 'Mary Okon');
    const totalAnnual = 20;
    const totalMaternity = isFemale ? 90 : 0;
    const totalPaternity = (!isFemale) ? 14 : 0;
    const totalHoliday = 5;
    const totalSick = 12;
    const totalCasual = 7;
    const totalCompassionate = 5;
    const totalStudy = 10;

    const approvedLeaves = myLeaves.filter(l => l.status === 'APPROVED' || l.status === 'Approved' || l.status === 'Approved & Synced');

    const usedAnnual = approvedLeaves.filter(l => l.type === 'ANNUAL').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
    const usedMaternity = approvedLeaves.filter(l => l.type === 'MATERNITY').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
    const usedPaternity = approvedLeaves.filter(l => l.type === 'PATERNITY').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
    const usedHoliday = approvedLeaves.filter(l => l.type === 'HOLIDAY').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
    const usedSick = approvedLeaves.filter(l => l.type === 'SICK').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
    const usedCasual = approvedLeaves.filter(l => l.type === 'CASUAL').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
    const usedCompassionate = approvedLeaves.filter(l => l.type === 'COMPASSIONATE').reduce((acc, l) => acc + (Number(l.days) || 0), 0);
    const usedStudy = approvedLeaves.filter(l => l.type === 'STUDY').reduce((acc, l) => acc + (Number(l.days) || 0), 0);

    return {
      annual: { total: totalAnnual, used: usedAnnual, remaining: Math.max(0, totalAnnual - usedAnnual) },
      maternity: { total: totalMaternity, used: usedMaternity, remaining: Math.max(0, totalMaternity - usedMaternity) },
      paternity: { total: totalPaternity, used: usedPaternity, remaining: Math.max(0, totalPaternity - usedPaternity) },
      holiday: { total: totalHoliday, used: usedHoliday, remaining: Math.max(0, totalHoliday - usedHoliday) },
      sick: { total: totalSick, used: usedSick, remaining: Math.max(0, totalSick - usedSick) },
      casual: { total: totalCasual, used: usedCasual, remaining: Math.max(0, totalCasual - usedCasual) },
      compassionate: { total: totalCompassionate, used: usedCompassionate, remaining: Math.max(0, totalCompassionate - usedCompassionate) },
      study: { total: totalStudy, used: usedStudy, remaining: Math.max(0, totalStudy - usedStudy) }
    };
  }, [myLeaves, user, currentUserName]);

  const effectiveBalances = dynamicBalances;

  // Selected Category Balance & Quota limit validation
  const selectedCategoryBalance = useMemo(() => {
    const key = selectedLeaveType.toLowerCase() as keyof typeof effectiveBalances;
    const bal = (effectiveBalances as any)?.[key];
    if (bal) return bal;
    if (key === 'compassionate') return { total: 5, used: 0, remaining: 5 };
    if (key === 'study') return { total: 10, used: 0, remaining: 10 };
    return { total: 20, used: 0, remaining: 20 };
  }, [selectedLeaveType, effectiveBalances]);

  const isExceedingBalance = calculatedDays > selectedCategoryBalance.remaining;

  // 2. Review / Approvals Desk (applications sent TO the current user / supervisor / admin to review & approve)
  // NEVER include current user's own applications here!
  const reviewRequests = useMemo(() => {
    return leaveRequests.filter(l => {
      // Exclude applicant's own leaves
      if (isMyOwnLeave(l)) return false;

      // Check if current user is specifically the assigned supervisor
      const isAssignedSupervisor = 
        isPersonMatched(l.selectedSupervisor, currentUserName) ||
        isPersonMatched(l.supervisorRecommended, currentUserName) ||
        (currentUserName.toLowerCase().includes('chinedu') && (
          (l.selectedSupervisor && l.selectedSupervisor.toLowerCase().includes('chinedu')) ||
          (l.supervisorRecommended && l.supervisorRecommended.toLowerCase().includes('chinedu'))
        ));

      // If user is Admin / Bishop:
      // They should ONLY see leaves meant for final approvals after supervisors have recommended the leave (PENDING_ADMIN),
      // or already approved/rejected hospital leaves, OR if the admin is specifically assigned as the direct supervisor.
      // They must NOT see leaves that are PENDING_SUPERVISOR assigned to other supervisors!
      if (isSuperAdminOrBishop) {
        if (l.status === 'PENDING_SUPERVISOR' && !isAssignedSupervisor) {
          return false;
        }
        return true;
      }

      // If user is a designated supervisor, show leaves assigned specifically to them for recommendation / review
      return isAssignedSupervisor;
    });
  }, [leaveRequests, currentEmpId, currentUserName, isSuperAdminOrBishop, user]);

  const pendingApprovalsCount = useMemo(() => {
    return reviewRequests.filter(l => {
      if (isSuperAdminOrBishop) {
        return l.status === 'PENDING_ADMIN';
      }
      return l.status === 'PENDING_SUPERVISOR';
    }).length;
  }, [reviewRequests, isSuperAdminOrBishop]);

  // Filtered Review Requests for Tab 0 with Status / Search Filters
  const filteredReviewRequests = useMemo(() => {
    return reviewRequests.filter(l => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && (l.status === 'PENDING_SUPERVISOR' || l.status === 'PENDING_ADMIN' || l.status === 'PENDING_APPROVAL')) ||
        l.status === statusFilter;

      const matchesSearch =
        searchTerm === '' ||
        l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.empId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.department?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [reviewRequests, statusFilter, searchTerm]);

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* ─── Hero Header & Overview ────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0f766e 100%)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                <BeachAccess sx={{ fontSize: 36, color: '#fef08a' }} />
                <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -0.5 }}>
                  Leave & Out-of-Office Management Desk
                </Typography>
              </Stack>
              <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 800 }}>
                Apply for annual, sick, maternity/paternity, or compassionate leave with automated multi-tier supervisor verification and <b>automatic roster timesheet synchronization</b>.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                startIcon={<Add />}
                onClick={() => setApplyModalOpen(true)}
                sx={{
                  bgcolor: '#f59e0b',
                  color: '#ffffff',
                  fontWeight: 800,
                  px: 3,
                  py: 1.2,
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                  '&:hover': { bgcolor: '#d97706' }
                }}
              >
                Apply for Leave
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<CalendarMonth />}
                onClick={() => navigate('/timesheets')}
                sx={{
                  color: '#ffffff',
                  borderColor: 'rgba(255,255,255,0.4)',
                  fontWeight: 700,
                  '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                View Timesheet
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* ─── Leave Balances & Entitlement KPI Cards ────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Annual Leave Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={800} color="text.secondary">
                  ANNUAL LEAVE BALANCE
                </Typography>
                <WbSunny sx={{ color: '#f59e0b' }} />
              </Stack>
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="h4" fontWeight={900} color="#1e3a8a">
                  {effectiveBalances.annual.remaining}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Days Left / {effectiveBalances.annual.total} Total
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={((effectiveBalances.annual.used / effectiveBalances.annual.total) * 100)}
                sx={{ height: 8, borderRadius: 4, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#f59e0b' } }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {effectiveBalances.annual.used} days utilized this financial calendar year
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Maternity / Paternity Leave Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={800} color="text.secondary">
                  {effectiveBalances.maternity.total > 0 ? 'MATERNITY LEAVE' : 'PATERNITY LEAVE'}
                </Typography>
                <ChildFriendly sx={{ color: '#ec4899' }} />
              </Stack>
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="h4" fontWeight={900} color="#0f766e">
                  {effectiveBalances.maternity.total > 0 ? effectiveBalances.maternity.remaining : effectiveBalances.paternity.remaining}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Days Entitled (Full Pay)
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={effectiveBalances.maternity.total > 0 ? ((effectiveBalances.maternity.used / effectiveBalances.maternity.total) * 100) : ((effectiveBalances.paternity.used / (effectiveBalances.paternity.total || 1)) * 100)}
                sx={{ height: 8, borderRadius: 4, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#ec4899' } }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Statutory allowance available upon HR confirmation
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Holiday / Compensatory Leave Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={800} color="text.secondary">
                  HOLIDAY / COMP LEAVE
                </Typography>
                <EventNote sx={{ color: '#8b5cf6' }} />
              </Stack>
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="h4" fontWeight={900} color="#6d28d9">
                  {effectiveBalances.holiday.remaining}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Days in Lieu Available
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={((effectiveBalances.holiday.used / effectiveBalances.holiday.total) * 100)}
                sx={{ height: 8, borderRadius: 4, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#8b5cf6' } }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Earned for duty shifts during public holidays
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Approval Requests Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', bgcolor: '#fffbeb' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={800} color="#b45309">
                  PENDING APPROVAL QUEUE
                </Typography>
                <PendingActions sx={{ color: '#d97706' }} />
              </Stack>
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="h4" fontWeight={900} color="#d97706">
                  {pendingApprovalsCount}
                </Typography>
                <Typography variant="body2" color="#b45309" fontWeight={600}>
                  Awaiting Action
                </Typography>
              </Stack>
              <Typography variant="caption" color="#92400e" sx={{ mt: 1, display: 'block' }}>
                Multi-tier routing: Supervisor ➔ Hospital Admin ➔ Bishop
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ─── Main Tabs & Navigation ────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 3, mb: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="fullWidth"
          sx={{
            borderBottom: '1px solid #e2e8f0',
            bgcolor: '#f8fafc',
            '& .MuiTab-root': {
              fontWeight: 700,
              textTransform: 'none',
              py: 1.8,
              fontSize: '0.92rem',
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                bgcolor: '#ffffff',
                color: '#1e3a8a',
                fontWeight: 800
              }
            },
            '& .MuiTabs-indicator': {
              height: 3,
              backgroundColor: '#1e3a8a'
            }
          }}
        >
          <Tab
            icon={<Person sx={{ mr: 1, fontSize: 20 }} />}
            iconPosition="start"
            label={
              <Badge badgeContent={myLeaves.length} color="primary" sx={{ '& .MuiBadge-badge': { right: -12, top: 10 } }}>
                My Leaves
              </Badge>
            }
          />
          <Tab
            icon={<AssignmentTurnedIn sx={{ mr: 1, fontSize: 20 }} />}
            iconPosition="start"
            label={
              <Badge
                badgeContent={pendingApprovalsCount}
                color="error"
                sx={{ '& .MuiBadge-badge': { right: -12, top: 10 } }}
              >
                Approvals Desk
              </Badge>
            }
          />
          <Tab
            icon={<CalendarMonth sx={{ mr: 1, fontSize: 20 }} />}
            iconPosition="start"
            label="Duty Schedule"
          />
          <Tab
            icon={<ShieldOutlined sx={{ mr: 1, fontSize: 20 }} />}
            iconPosition="start"
            label="Policies"
          />
        </Tabs>

        {/* ─── TAB 0: MY LEAVE APPLICATIONS & BALANCES ─────────────────────────────── */}
        {activeTab === 0 && (
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2, bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              Your personal leave requests are managed here. When approved, these dates automatically sync to your monthly timesheet with 8 hours credited per working day (100% duty compliance).
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', p: 2.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <Typography variant="h6" fontWeight={800} color="#1e3a8a" sx={{ mb: 2 }}>
                    My Leave Entitlements
                  </Typography>
                  <Stack spacing={2.5}>
                    {[
                      { name: 'Annual Leave', balance: effectiveBalances.annual.remaining, total: effectiveBalances.annual.total, color: '#f59e0b' },
                      { name: 'Holiday Leave (In-Lieu)', balance: effectiveBalances.holiday.remaining, total: effectiveBalances.holiday.total, color: '#8b5cf6' },
                      { name: effectiveBalances.maternity.total > 0 ? 'Maternity Leave' : 'Paternity Leave', balance: effectiveBalances.maternity.total > 0 ? effectiveBalances.maternity.remaining : effectiveBalances.paternity.remaining, total: effectiveBalances.maternity.total > 0 ? effectiveBalances.maternity.total : effectiveBalances.paternity.total, color: '#ec4899' },
                      { name: 'Sick / Medical Leave', balance: effectiveBalances.sick.remaining, total: effectiveBalances.sick.total, color: '#ef4444' },
                      { name: 'Casual / Emergency', balance: effectiveBalances.casual.remaining, total: effectiveBalances.casual.total, color: '#06b6d4' },
                      { name: 'Compassionate / Bereavement', balance: effectiveBalances.compassionate.remaining, total: effectiveBalances.compassionate.total, color: '#64748b' },
                      { name: 'Study & Examination', balance: effectiveBalances.study.remaining, total: effectiveBalances.study.total, color: '#10b981' }
                    ].map(item => (
                      <Box key={item.name}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={700}>{item.name}</Typography>
                          <Typography variant="body2" fontWeight={800} color={item.color}>
                            {item.balance} / {item.total} Days Left
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={((item.total - item.balance) / item.total) * 100}
                          sx={{ height: 6, borderRadius: 3, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: item.color } }}
                        />
                      </Box>
                    ))}
                  </Stack>

                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      setReapplyTargetLeaveId(null);
                      setStartDate('2026-09-15');
                      setEndDate('2026-09-17');
                      setReason(OUT_OF_OFFICE_PRESETS[0].text);
                      setAttachedDocName(null);
                      const matchingEmp = employees.find(e => 
                        (user?.staffId && e.id === user.staffId) ||
                        (user?.id && (e.id === user.id || e.userId === user.id)) ||
                        (user?.username && (e.username === user.username || e.id === user.username)) ||
                        (user?.email && e.email === user.email) ||
                        (user?.username === 'cashier' && e.id === 'EMP-006') ||
                        isPersonMatched(`${e.firstName} ${e.lastName}`, currentUserName)
                      );
                      const activeStaffId = matchingEmp?.id || (employees.some(e => e.id === 'EMP-006') ? 'EMP-006' : targetStaffId || 'EMP-006');
                      setTargetStaffId(activeStaffId);
                      setApplyModalOpen(true);
                    }}
                    sx={{ mt: 3, bgcolor: '#1e3a8a', fontWeight: 700, py: 1, '&:hover': { bgcolor: '#1e40af' } }}
                  >
                    Submit New Leave Request
                  </Button>
                </Card>
              </Grid>

              <Grid item xs={12} md={8}>
                <Typography variant="h6" fontWeight={800} color="#1e3a8a" sx={{ mb: 2 }}>
                  My Out-of-Office Applications & History
                </Typography>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>Request ID</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>Leave Duration</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>Assigned Supervisor & Relief</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {myLeaves.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            No leave applications submitted yet. Click "Submit New Leave Request" above to apply.
                          </TableCell>
                        </TableRow>
                      ) : (
                        myLeaves.map(leave => (
                          <TableRow key={leave.id} hover>
                            <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>
                              {leave.id}
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                icon={<WbSunny sx={{ fontSize: '14px !important' }} />}
                                label={leave.type}
                                sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>
                                {leave.startDate} ➔ {leave.endDate}
                              </Typography>
                              <Typography variant="caption" color="#059669" fontWeight={700}>
                                {leave.days} Working Days
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" display="block" color="text.secondary">
                                Supervisor: <b>{leave.selectedSupervisor || 'Unit Lead'}</b>
                              </Typography>
                              <Typography variant="caption" display="block" color="text.secondary">
                                Relief: <b>{leave.reliefOfficer || 'Relief Officer'}</b>
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {leave.status === 'APPROVED' ? (
                                <Chip size="small" color="success" label="Approved & Synced" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                              ) : leave.status === 'PENDING_SUPERVISOR' ? (
                                <Chip size="small" color="info" label="Pending Supervisor" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                              ) : leave.status === 'PENDING_ADMIN' ? (
                                <Chip size="small" color="secondary" label="Pending Admin Seal" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                              ) : leave.status === 'REJECTED' ? (
                                <Box>
                                  <Chip size="small" color="error" label="Returned" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                                  {leave.rejectionReason && (
                                    <Typography variant="caption" display="block" color="#b91c1c" sx={{ mt: 0.5, fontWeight: 700, fontSize: '0.68rem' }}>
                                      Reason: {leave.rejectionReason}
                                    </Typography>
                                  )}
                                </Box>
                              ) : (
                                <Chip size="small" label={leave.status} sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {leave.status === 'APPROVED' ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  startIcon={<CalendarMonth />}
                                  onClick={() => navigate('/timesheets')}
                                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.72rem' }}
                                >
                                  View in Timesheet
                                </Button>
                              ) : leave.status === 'REJECTED' ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="warning"
                                  startIcon={<Undo />}
                                  onClick={() => {
                                    setReapplyTargetLeaveId(leave.id);
                                    setStartDate(leave.startDate);
                                    setEndDate(leave.endDate);
                                    setReason(leave.reason || '');
                                    setSelectedLeaveType(leave.type || 'ANNUAL');
                                    if (leave.selectedSupervisor) setSelectedSupervisor(leave.selectedSupervisor);
                                    if (leave.reliefOfficer) setReliefOfficer(leave.reliefOfficer);
                                    if (leave.emergencyPhone) setEmergencyPhone(leave.emergencyPhone);
                                    setApplyModalOpen(true);
                                  }}
                                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.72rem' }}
                                >
                                  Re-apply
                                </Button>
                              ) : (
                                <Typography variant="caption" color="text.secondary">In Review</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ─── TAB 1: APPROVALS / REVIEW QUEUE ────────────────────────── */}
        {activeTab === 1 && (
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Filter Toolbar */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {(isSuperAdminOrBishop ? [
                  { key: 'ALL', label: 'All Requests' },
                  { key: 'PENDING_ADMIN', label: 'Pending Admin Approval' },
                  { key: 'APPROVED', label: 'Approved & Active' },
                  { key: 'REJECTED', label: 'Returned / Rejected' }
                ] : [
                  { key: 'ALL', label: 'All Requests' },
                  { key: 'PENDING_SUPERVISOR', label: 'Pending Supervisor' },
                  { key: 'PENDING_ADMIN', label: 'Recommended to Admin' },
                  { key: 'APPROVED', label: 'Approved & Active' },
                  { key: 'REJECTED', label: 'Returned / Rejected' }
                ]).map(chip => (
                  <Chip
                    key={chip.key}
                    label={chip.label}
                    onClick={() => setStatusFilter(chip.key)}
                    color={statusFilter === chip.key ? 'primary' : 'default'}
                    variant={statusFilter === chip.key ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 700, cursor: 'pointer' }}
                  />
                ))}
              </Stack>

              <TextField
                size="small"
                placeholder="Search staff, ID, department..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  )
                }}
                sx={{ minWidth: { xs: '100%', md: 280 } }}
              />
            </Stack>

            {/* Review Applications Table */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>Request ID</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>Staff Details</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>Leave Category</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>Dates & Duration</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>Relief Officer</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>Supervisor & Admin</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#1e3a8a' }}>Workflow Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredReviewRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                        <AssignmentTurnedIn sx={{ fontSize: 48, color: '#cbd5e1', mb: 1.5 }} />
                        <Typography variant="h6" fontWeight={800} color="#1e293b">
                          No Approvals Pending Your Review
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto', mt: 0.5 }}>
                          You have no incoming leave applications requiring your supervisor recommendation or admin approval. Your personal leave applications are managed under the <b>My Leaves</b> tab.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReviewRequests.map(leave => (
                      <TableRow key={leave.id} hover sx={{ '&:hover': { bgcolor: '#f1f5f9' } }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e3a8a' }}>
                          {leave.id}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={800} color="text.primary">
                            {leave.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {leave.empId} • {leave.department}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={LEAVE_TYPES.find(t => t.value === leave.type)?.icon as any}
                            label={leave.type}
                            size="small"
                            sx={{ fontWeight: 700, bgcolor: '#f8fafc', border: '1px solid #cbd5e1' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {leave.startDate} ➔ {leave.endDate}
                          </Typography>
                          <Typography variant="caption" color="#0f766e" fontWeight={800}>
                            {leave.days} Working Days
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {leave.reliefOfficer || 'Assigned Peer'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Till / Duty Handover
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            Supervisor: <b>{leave.supervisorRecommended || leave.selectedSupervisor || 'Pending'}</b>
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            Admin: <b>{leave.adminApproved || 'Pending'}</b>
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              leave.status === 'PENDING_SUPERVISOR' ? 'Pending Supervisor' :
                              leave.status === 'PENDING_ADMIN' ? 'Pending Executive' :
                              leave.status === 'APPROVED' ? 'Approved & Synced' :
                              leave.status === 'REJECTED' ? 'Returned' : leave.status
                            }
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              bgcolor:
                                leave.status === 'APPROVED' ? '#dcfce7' :
                                leave.status === 'PENDING_SUPERVISOR' ? '#e0f2fe' :
                                leave.status === 'PENDING_ADMIN' ? '#fef3c7' :
                                leave.status === 'REJECTED' ? '#fee2e2' : '#f1f5f9',
                              color:
                                leave.status === 'APPROVED' ? '#16a34a' :
                                leave.status === 'PENDING_SUPERVISOR' ? '#0284c7' :
                                leave.status === 'PENDING_ADMIN' ? '#d97706' :
                                leave.status === 'REJECTED' ? '#dc2626' : '#64748b'
                            }}
                          />
                          {leave.rejectionReason && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#dc2626', mt: 0.5, maxWidth: 160 }}>
                              Reason: {leave.rejectionReason}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                            {leave.status === 'PENDING_SUPERVISOR' && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="warning"
                                  onClick={() => handleRecommendLeave(leave.id)}
                                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                                >
                                  Recommend
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => {
                                    setSelectedLeaveForReject(leave);
                                    setRejectModalOpen(true);
                                  }}
                                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                                >
                                  Return / Reject
                                </Button>
                              </>
                            )}
                            {leave.status === 'PENDING_ADMIN' && isSuperAdminOrBishop && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  onClick={() => handleApproveLeave(leave.id)}
                                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                                >
                                  Admin Approve
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => {
                                    setSelectedLeaveForReject(leave);
                                    setRejectModalOpen(true);
                                  }}
                                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                                >
                                  Return / Reject
                                </Button>
                              </>
                            )}
                            {leave.status === 'PENDING_ADMIN' && !isSuperAdminOrBishop && (
                              <Chip
                                size="small"
                                icon={<Lock sx={{ fontSize: '13px !important', color: '#b45309' }} />}
                                label="Awaiting Admin / Bishop Approval"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  bgcolor: '#fef3c7',
                                  color: '#b45309',
                                  border: '1px solid #fde68a'
                                }}
                              />
                            )}
                            {leave.status === 'APPROVED' && (
                              <Chip
                                size="small"
                                icon={<CheckCircle sx={{ fontSize: '13px !important', color: '#16a34a' }} />}
                                label="Approved & Certified"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  bgcolor: '#dcfce7',
                                  color: '#16a34a',
                                  border: '1px solid #bbf7d0'
                                }}
                              />
                            )}
                            {leave.status === 'REJECTED' && (
                              <Typography variant="caption" color="error.main" fontWeight={700}>
                                Returned to Staff
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ─── TAB 2: HOSPITAL LEAVE CALENDAR & COVERAGE ───────────────────────────── */}
        {activeTab === 2 && (
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={800} color="#1e3a8a">
                  September 2026 Departmental Leave & Duty Coverage Roster
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ensure minimum staffing ratios across critical clinical, nursing, pharmacy, and cash desk units before approving overlapping leave schedules.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  variant={calendarViewMode === 'CALENDAR' ? 'contained' : 'outlined'}
                  startIcon={<ViewModule />}
                  onClick={() => setCalendarViewMode('CALENDAR')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    bgcolor: calendarViewMode === 'CALENDAR' ? '#1e3a8a' : 'transparent',
                    color: calendarViewMode === 'CALENDAR' ? '#ffffff' : '#1e3a8a'
                  }}
                >
                  Monthly Calendar
                </Button>
                <Button
                  size="small"
                  variant={calendarViewMode === 'ROSTER' ? 'contained' : 'outlined'}
                  startIcon={<ViewAgenda />}
                  onClick={() => setCalendarViewMode('ROSTER')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    bgcolor: calendarViewMode === 'ROSTER' ? '#1e3a8a' : 'transparent',
                    color: calendarViewMode === 'ROSTER' ? '#ffffff' : '#1e3a8a'
                  }}
                >
                  Staff Roster List
                </Button>
              </Stack>
            </Stack>

            {/* Department Threshold Summary Cards (Commented out) */}
            {/*
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                { dept: 'Finance & Revenue', activeLeaves: approvedLeaves.filter(l => l.department?.includes('Finance') || l.department?.includes('Revenue')).length || 1, minStaffRequired: 2, currentOnDuty: 3, status: 'ADEQUATE COVERAGE', color: '#2563eb' },
                { dept: 'Clinical & Medical Services', activeLeaves: approvedLeaves.filter(l => l.department?.includes('Clinical') || l.department?.includes('Medical')).length || 2, minStaffRequired: 4, currentOnDuty: 5, status: 'ADEQUATE COVERAGE', color: '#059669' },
                { dept: 'Nursing Services', activeLeaves: approvedLeaves.filter(l => l.department?.includes('Nursing')).length || 1, minStaffRequired: 6, currentOnDuty: 8, status: 'ADEQUATE COVERAGE', color: '#d97706' },
                { dept: 'Pharmacy & Therapeutics', activeLeaves: approvedLeaves.filter(l => l.department?.includes('Pharmacy')).length || 1, minStaffRequired: 2, currentOnDuty: 2, status: 'TIGHT THRESHOLD', color: '#7c3aed' }
              ].map(d => (
                <Grid item xs={12} sm={6} md={3} key={d.dept}>
                  <Card sx={{ p: 2, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: d.status === 'TIGHT THRESHOLD' ? '#fffbeb' : '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.color }} />
                      <Typography variant="subtitle2" fontWeight={800} color="#1e3a8a">{d.dept}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      On Approved Leave: <b>{d.activeLeaves} Staff</b>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Active On Duty: <b>{d.currentOnDuty} Staff</b> (Min. {d.minStaffRequired})
                    </Typography>
                    <Chip
                      label={d.status}
                      size="small"
                      sx={{
                        mt: 1.5,
                        fontWeight: 800,
                        fontSize: '0.65rem',
                        bgcolor: d.status === 'TIGHT THRESHOLD' ? '#fef3c7' : '#dcfce7',
                        color: d.status === 'TIGHT THRESHOLD' ? '#d97706' : '#16a34a'
                      }}
                    />
                  </Card>
                </Grid>
              ))}
            </Grid>
            */}

            {/* Calendar Controls & Filter Toolbar */}
            <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid #e2e8f0', mb: 2.5, bgcolor: '#ffffff' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                {/* Month Navigator */}
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton size="small" onClick={handlePrevMonth} sx={{ border: '1px solid #cbd5e1' }}>
                    <ChevronLeft />
                  </IconButton>
                  <Typography variant="h6" fontWeight={800} color="#1e3a8a" sx={{ minWidth: 170, textAlign: 'center' }}>
                    {currentMonthName}
                  </Typography>
                  <IconButton size="small" onClick={handleNextMonth} sx={{ border: '1px solid #cbd5e1' }}>
                    <ChevronRight />
                  </IconButton>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CalendarToday sx={{ fontSize: 16 }} />}
                    onClick={handleJumpToToday}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', ml: 1, borderColor: '#cbd5e1' }}
                  >
                    Today (Sept 14)
                  </Button>
                </Stack>

                {/* Department Filter Chips */}
                <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap alignItems="center">
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mr: 0.5 }}>
                    Department:
                  </Typography>
                  {ROSTER_DEPARTMENTS.map(dept => (
                    <Chip
                      key={dept.key}
                      label={dept.label}
                      size="small"
                      onClick={() => setCalendarDeptFilter(dept.key)}
                      color={calendarDeptFilter === dept.key ? 'primary' : 'default'}
                      variant={calendarDeptFilter === dept.key ? 'filled' : 'outlined'}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        borderColor: calendarDeptFilter === dept.key ? '#1e3a8a' : '#cbd5e1'
                      }}
                    />
                  ))}
                </Stack>
              </Stack>

              {/* Leave Type Color Legend */}
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  Approved Leave Categories:
                </Typography>
                {[
                  { label: 'Annual Leave', icon: '🏖️', color: '#f59e0b', bg: '#fef3c7' },
                  { label: 'Sick / Medical', icon: '🩺', color: '#ef4444', bg: '#fee2e2' },
                  { label: 'Maternity / Parental', icon: '👶', color: '#ec4899', bg: '#fce7f3' },
                  { label: 'CPD / Study', icon: '🎓', color: '#10b981', bg: '#d1fae5' },
                  { label: 'Casual / Emergency', icon: '🚨', color: '#06b6d4', bg: '#cffafe' },
                  { label: 'Bereavement', icon: '🕊️', color: '#64748b', bg: '#f1f5f9' }
                ].map(leg => (
                  <Stack key={leg.label} direction="row" alignItems="center" spacing={0.6}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '4px',
                        bgcolor: leg.bg,
                        border: `1px solid ${leg.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem'
                      }}
                    >
                      {leg.icon}
                    </Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                      {leg.label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            {/* ─── CALENDAR MONTH VIEW ────────────────────────────────────── */}
            {calendarViewMode === 'CALENDAR' && (
              <Paper sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', bgcolor: '#ffffff', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                {/* Days of Week Header */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    bgcolor: '#1e3a8a',
                    color: '#ffffff',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    py: 1.2
                  }}
                >
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(dayName => (
                    <Box key={dayName}>{dayName}</Box>
                  ))}
                </Box>

                {/* 7-Column Days Grid */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    bgcolor: '#e2e8f0',
                    gap: '1px'
                  }}
                >
                  {calendarDays.map((cell, idx) => {
                    const isToday = cell.dateStr === '2026-09-14';
                    const isWeekend = idx % 7 === 0 || idx % 7 === 6;

                    // Match active approved leaves on this day
                    const matchingLeaves = cell.dateStr
                      ? approvedLeaves.filter(leave => {
                          const inRange = leave.startDate <= cell.dateStr && leave.endDate >= cell.dateStr;
                          if (!inRange) return false;
                          if (calendarDeptFilter === 'ALL') return true;
                          return (
                            leave.department?.toLowerCase().includes(calendarDeptFilter.toLowerCase().split(' ')[0]) ||
                            (calendarDeptFilter.includes('Clinical') && (leave.department?.includes('Clinical') || leave.department?.includes('Medical')))
                          );
                        })
                      : [];

                    return (
                      <Box
                        key={idx}
                        sx={{
                          minHeight: 125,
                          p: 1,
                          bgcolor: !cell.isCurrentMonth
                            ? '#f8fafc'
                            : isToday
                            ? '#f0fdf4'
                            : isWeekend
                            ? '#fafafa'
                            : '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          position: 'relative',
                          transition: 'background-color 0.2s',
                          '&:hover': {
                            bgcolor: cell.isCurrentMonth ? '#f1f5f9' : '#f8fafc'
                          }
                        }}
                      >
                        {/* Day Number and Today Tag */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
                          <Typography
                            variant="body2"
                            fontWeight={isToday ? 900 : cell.isCurrentMonth ? 700 : 400}
                            color={isToday ? '#16a34a' : cell.isCurrentMonth ? '#1e293b' : '#94a3b8'}
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: isToday ? '#dcfce7' : 'transparent',
                              border: isToday ? '1px solid #16a34a' : 'none'
                            }}
                          >
                            {cell.dayNumber}
                          </Typography>

                          {isToday && (
                            <Chip
                              label="TODAY"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                bgcolor: '#16a34a',
                                color: '#ffffff'
                              }}
                            />
                          )}

                          {matchingLeaves.length > 0 && (
                            <Chip
                              label={`${matchingLeaves.length} on leave`}
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.58rem',
                                fontWeight: 800,
                                bgcolor: '#eff6ff',
                                color: '#1e3a8a',
                                border: '1px solid #bfdbfe'
                              }}
                            />
                          )}
                        </Stack>

                        {/* List of Approved Leaves on this Day */}
                        <Stack spacing={0.6} sx={{ flexGrow: 1, overflow: 'hidden' }}>
                          {matchingLeaves.map(leave => {
                            const isStaffCashier = leave.empId === 'EMP-006' || leave.name?.includes('Mary Okon');
                            const leaveIcon =
                              leave.type === 'ANNUAL' ? '🏖️' :
                              leave.type === 'SICK' ? '🩺' :
                              leave.type === 'MATERNITY' || leave.type === 'PATERNITY' ? '👶' :
                              leave.type === 'STUDY' ? '🎓' :
                              leave.type === 'HOLIDAY' ? '⛪' :
                              leave.type === 'CASUAL' ? '🚨' : '🕊️';

                            const deptColor =
                              leave.department?.includes('Finance') || leave.department?.includes('Revenue') ? '#2563eb' :
                              leave.department?.includes('Clinical') || leave.department?.includes('Medical') ? '#059669' :
                              leave.department?.includes('Nursing') ? '#d97706' :
                              leave.department?.includes('Pharmacy') ? '#7c3aed' :
                              leave.department?.includes('Laboratory') ? '#db2777' : '#475569';

                            return (
                              <Tooltip
                                key={leave.id}
                                title={
                                  <Box sx={{ p: 0.5 }}>
                                    <Typography variant="subtitle2" fontWeight={800}>
                                      {leave.name} ({leave.type} Leave)
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block' }}>
                                      {leave.department} • {leave.designation || 'Staff'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                      📅 {leave.startDate} to {leave.endDate} ({leave.days} days)
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block', color: '#93c5fd' }}>
                                      Relief: {leave.reliefOfficer || 'Assigned Officer'}
                                    </Typography>
                                  </Box>
                                }
                                arrow
                              >
                                <Box
                                  onClick={() => {
                                    setSelectedCalendarLeave(leave);
                                    setCalendarDetailModalOpen(true);
                                  }}
                                  sx={{
                                    p: 0.6,
                                    borderRadius: 1.5,
                                    bgcolor: isStaffCashier ? '#eff6ff' : '#f8fafc',
                                    border: `1px solid ${isStaffCashier ? '#93c5fd' : '#e2e8f0'}`,
                                    borderLeft: `3.5px solid ${deptColor}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                      transform: 'translateY(-1px)'
                                    }
                                  }}
                                >
                                  <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Typography variant="caption" sx={{ fontSize: '0.75rem', lineHeight: 1 }}>
                                      {leaveIcon}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      fontWeight={800}
                                      noWrap
                                      sx={{
                                        fontSize: '0.68rem',
                                        color: isStaffCashier ? '#1e3a8a' : '#334155',
                                        maxWidth: 85
                                      }}
                                    >
                                      {leave.name}
                                    </Typography>
                                  </Stack>
                                  <Typography
                                    variant="caption"
                                    noWrap
                                    sx={{
                                      display: 'block',
                                      fontSize: '0.6rem',
                                      color: 'text.secondary',
                                      mt: 0.2
                                    }}
                                  >
                                    {leave.department}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            );
                          })}
                        </Stack>
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            )}

            {/* ─── ROSTER TABLE VIEW ──────────────────────────────────────── */}
            {calendarViewMode === 'ROSTER' && (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#1e3a8a' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: '#ffffff' }}>Request ID</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#ffffff' }}>Staff Details</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#ffffff' }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#ffffff' }}>Leave Category</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#ffffff' }}>Duration Dates</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#ffffff' }}>Relief & Handover</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#ffffff' }}>Approval Endorsement</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#ffffff' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {approvedLeaves.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                          <Typography variant="body1" color="text.secondary">
                            No approved leaves found for the selected department filter.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      approvedLeaves
                        .filter(l => {
                          if (calendarDeptFilter === 'ALL') return true;
                          return (
                            l.department?.toLowerCase().includes(calendarDeptFilter.toLowerCase().split(' ')[0]) ||
                            (calendarDeptFilter.includes('Clinical') && (l.department?.includes('Clinical') || l.department?.includes('Medical')))
                          );
                        })
                        .map(leave => (
                          <TableRow key={leave.id} hover sx={{ '&:hover': { bgcolor: '#f1f5f9' } }}>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e3a8a' }}>
                              {leave.id}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={800} color="text.primary">
                                {leave.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {leave.empId} • {leave.designation || 'Staff'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={leave.department}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  bgcolor: '#f1f5f9',
                                  border: '1px solid #cbd5e1'
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={LEAVE_TYPES.find(t => t.value === leave.type)?.icon as any}
                                label={leave.type}
                                size="small"
                                sx={{ fontWeight: 700, bgcolor: '#f8fafc', border: '1px solid #cbd5e1' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>
                                {leave.startDate} ➔ {leave.endDate}
                              </Typography>
                              <Typography variant="caption" color="#0f766e" fontWeight={800}>
                                {leave.days} Working Days
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {leave.reliefOfficer || 'Designated Peer'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Duty & Float Handover
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label="Approved & Timesheet Synced"
                                size="small"
                                sx={{
                                  fontWeight: 800,
                                  fontSize: '0.72rem',
                                  bgcolor: '#dcfce7',
                                  color: '#16a34a'
                                }}
                              />
                              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.3 }}>
                                Admin: {leave.approvedBy || 'Hospital Administrator'}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  setSelectedCalendarLeave(leave);
                                  setCalendarDetailModalOpen(true);
                                }}
                                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.72rem' }}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* ─── TAB 3: CARITAS & DIOCESAN LEAVE POLICY GUIDELINES ────────────────────── */}
        {activeTab === 3 && (
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" fontWeight={800} color="#1e3a8a" sx={{ mb: 2 }}>
              Hospital & Caritas Episcopal Governance Leave Regulations
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle1" fontWeight={800} color="#1e3a8a" sx={{ mb: 1.5 }}>
                    1. Annual & Scheduled Welfare Leave
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Full-time staff are entitled to 20 working days of annual leave per calendar year.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Leave applications must be submitted at least 14 days in advance to allow proper cash desk float reconciliation and roster reassignment.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Approved annual leave automatically marks the corresponding calendar days as <b>AL (8 Hours)</b> in the official monthly timesheet.
                  </Typography>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle1" fontWeight={800} color="#1e3a8a" sx={{ mb: 1.5 }}>
                    2. Maternity, Paternity & Medical Recess
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Female staff are entitled to 90 consecutive days of paid Maternity Leave upon delivery.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Married male staff receive 14 days of Paternity Leave to support family postpartum.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Sick leave exceeding 2 consecutive days requires an official medical fit-for-work certificate from the attending medical officer.
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* ─── APPLY FOR LEAVE MODAL ─────────────────────────────────────────────── */}
      <Dialog open={applyModalOpen} onClose={() => { setApplyModalOpen(false); setReapplyTargetLeaveId(null); }} maxWidth="md" fullWidth>
        <form onSubmit={handleApplyLeave}>
          <DialogTitle sx={{ bgcolor: reapplyTargetLeaveId ? '#b45309' : '#1e3a8a', color: '#ffffff', py: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <BeachAccess sx={{ color: '#fef08a' }} />
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  {reapplyTargetLeaveId ? `Re-apply & Update Leave Request (${reapplyTargetLeaveId})` : 'Apply for Staff Leave / Out-of-Office'}
                </Typography>
                <Typography variant="caption" sx={{ color: reapplyTargetLeaveId ? '#fef3c7' : '#93c5fd' }}>
                  {reapplyTargetLeaveId ? `Re-submitting returned leave ${reapplyTargetLeaveId} directly to supervisor for review` : 'Multi-tier review workflow with automated timesheet synchronization'}
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 3 }}>
            <Grid container spacing={2.5}>
              {reapplyTargetLeaveId && (
                <Grid item xs={12}>
                  <Alert severity="warning" sx={{ borderRadius: 2, bgcolor: '#fffbeb', border: '1px solid #fef3c7' }}>
                    <Typography variant="subtitle2" fontWeight={800} color="#b45309">
                      Updating & Re-submitting Returned Leave #{reapplyTargetLeaveId}
                    </Typography>
                    <Typography variant="body2" color="#78350f">
                      This will update and re-submit your returned leave <b>#{reapplyTargetLeaveId}</b> back to <b>{selectedSupervisor}</b> without creating a duplicate application record.
                    </Typography>
                  </Alert>
                </Grid>
              )}

              {/* Staff Member Selection */}
              <Grid item xs={12} sm={6}>
                {(() => {
                  const effectiveStaffId = targetStaffId || (employees.some(e => e.id === 'EMP-006') ? 'EMP-006' : employees[0]?.id || 'EMP-006');
                  return (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Applying Staff Member"
                      value={effectiveStaffId}
                      onChange={e => setTargetStaffId(e.target.value)}
                      helperText="Staff whose timesheet will be credited with leave hours"
                    >
                      {employees.map(emp => (
                        <MenuItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.id}) — {emp.role}
                        </MenuItem>
                      ))}
                      {(!employees.some(e => e.id === 'EMP-006') || employees.length === 0) && (
                        <MenuItem value="EMP-006">
                          Mary Okon (EMP-006) — Senior Cashier & Revenue Officer
                        </MenuItem>
                      )}
                      {effectiveStaffId && effectiveStaffId !== 'EMP-006' && !employees.some(e => e.id === effectiveStaffId) && (
                        <MenuItem value={effectiveStaffId}>
                          {currentUserName || 'Staff Member'} ({effectiveStaffId}) — Staff Officer
                        </MenuItem>
                      )}
                    </TextField>
                  );
                })()}
              </Grid>

              {/* Leave Type Selection */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Leave Category"
                  value={selectedLeaveType}
                  onChange={e => handleLeaveTypeChange(e.target.value)}
                >
                  {LEAVE_TYPES.map(type => {
                    const key = type.value.toLowerCase() as keyof typeof effectiveBalances;
                    const catBal = (effectiveBalances as any)?.[key] || { total: 10, used: 0, remaining: 10 };
                    return (
                      <MenuItem key={type.value} value={type.value}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {type.icon}
                            <Typography variant="body2" fontWeight={600}>{type.label}</Typography>
                          </Stack>
                          <Chip
                            size="small"
                            label={`${catBal.remaining}d left`}
                            color={catBal.remaining > 0 ? 'success' : 'error'}
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                          />
                        </Stack>
                      </MenuItem>
                    );
                  })}
                </TextField>

                {/* Quota & Available Balance Status Bar for Selected Category */}
                <Box sx={{ mt: 0.8, display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={`Allocated: ${selectedCategoryBalance.total} Days`}
                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#f1f5f9' }}
                  />
                  <Chip
                    size="small"
                    label={`Used: ${selectedCategoryBalance.used} Days`}
                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: selectedCategoryBalance.used > 0 ? '#fee2e2' : '#f1f5f9', color: selectedCategoryBalance.used > 0 ? '#991b1b' : '#64748b' }}
                  />
                  <Chip
                    size="small"
                    label={`Available: ${selectedCategoryBalance.remaining} Days Remaining`}
                    color={selectedCategoryBalance.remaining > 0 ? 'success' : 'error'}
                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800 }}
                  />
                </Box>
              </Grid>

              {/* Dates */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  label="Leave Start Date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  label="Leave End Date (Resumption Follows)"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Conflict Alert Banner (If user selects days with worked/completed shifts or approved leaves) */}
              {hasConflict && (
                <Grid item xs={12}>
                  <Alert
                    severity="error"
                    icon={<Lock sx={{ color: '#dc2626' }} />}
                    sx={{
                      borderRadius: 2,
                      border: '1px solid #fca5a5',
                      bgcolor: '#fef2f2',
                      '& .MuiAlert-message': { width: '100%' }
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={800} color="#991b1b">
                      ⛔ Schedule Conflict: Leave cannot be applied on dates with completed duty shifts or already approved leaves!
                    </Typography>
                    <Typography variant="body2" color="#b91c1c" sx={{ mt: 0.5 }}>
                      The selected leave dates conflict with existing duty records or approved leaves on the attendance timesheet:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      {conflictingDates.map(c => (
                        <Chip
                          key={c.dateStr}
                          size="small"
                          icon={<Lock sx={{ fontSize: '13px !important', color: c.type === 'APPROVED_LEAVE' ? '#b45309' : '#991b1b' }} />}
                          label={
                            c.type === 'APPROVED_LEAVE'
                              ? `${new Date(c.dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: Approved ${c.info.type || 'Leave'} (${c.info.leaveId || 'Locked'})`
                              : `${new Date(c.dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${c.info.shiftName} (${c.info.hours}h Clocked)`
                          }
                          sx={{
                            bgcolor: c.type === 'APPROVED_LEAVE' ? '#fef3c7' : '#fee2e2',
                            color: c.type === 'APPROVED_LEAVE' ? '#92400e' : '#991b1b',
                            fontWeight: 700,
                            border: c.type === 'APPROVED_LEAVE' ? '1px solid #fde68a' : '1px solid #f87171'
                          }}
                        />
                      ))}
                    </Stack>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<FlashOn />}
                      onClick={handleSetAvailableFutureDates}
                      sx={{
                        mt: 1.5,
                        bgcolor: '#dc2626',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#b91c1c' }
                      }}
                    >
                      Auto-Fix: Switch to Next Available Slot
                    </Button>
                  </Alert>
                </Grid>
              )}

              {/* Interactive Shift Roster & Leave Availability Calendar */}
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    borderColor: '#e2e8f0'
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CalendarMonth sx={{ color: '#1e3a8a', fontSize: 20 }} />
                      <Typography variant="subtitle2" fontWeight={800} color="#1e3a8a">
                        September 2026 — Shift Clock-in & Leave Availability Grid
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      🔒 Grey = Shift Worked (Locked) • 🔒 Amber = Approved Leave (Locked) • 🟦 Blue = Selected Leave Duration
                    </Typography>
                  </Stack>

                  {/* 7-Day Header */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75, textAlign: 'center', mb: 0.5 }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(dayName => (
                      <Typography key={dayName} variant="caption" fontWeight={800} color="#64748b" sx={{ py: 0.5 }}>
                        {dayName}
                      </Typography>
                    ))}
                  </Box>

                  {/* 30 Days Grid */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75 }}>
                    {/* Sep 1 2026 was a Tuesday -> 1 empty cell on Monday */}
                    <Box />

                    {Array.from({ length: 30 }, (_, idx) => {
                      const dayNum = idx + 1;
                      const dStr = `2026-09-${String(dayNum).padStart(2, '0')}`;
                      const isWorked = workedShiftDates.has(dStr);
                      const workedInfo = workedShiftDates.get(dStr);
                      const isApprovedLeave = approvedLeaveDates.has(dStr);
                      const leaveInfo = approvedLeaveDates.get(dStr);
                      const isSelectedLeave = startDate && endDate && dStr >= startDate && dStr <= endDate;
                      const dateObj = new Date(2026, 8, dayNum);
                      const isSun = dateObj.getDay() === 0;

                      // 1. Approved Leave: Locked (Amber/Gold with Lock Icon)
                      if (isApprovedLeave) {
                        const leaveType = leaveInfo?.type || leaveInfo?.category || 'Leave';
                        return (
                          <Tooltip
                            key={dayNum}
                            arrow
                            title={`🔒 Approved ${leaveType} Leave: Already approved & synced with timesheet (${leaveInfo?.leaveId || 'Locked'}). Leave application disabled on this day.`}
                          >
                            <Box
                              sx={{
                                p: 0.8,
                                borderRadius: 1.5,
                                bgcolor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                opacity: 0.9,
                                cursor: 'not-allowed',
                                textAlign: 'center',
                                position: 'relative',
                                userSelect: 'none',
                                boxShadow: '0 1px 3px rgba(217, 119, 6, 0.08)'
                              }}
                            >
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" fontWeight={800} sx={{ color: '#b45309' }}>
                                  {dayNum}
                                </Typography>
                                <Lock sx={{ fontSize: 12, color: '#d97706' }} />
                              </Stack>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: '0.62rem',
                                  display: 'block',
                                  fontWeight: 800,
                                  color: '#b45309',
                                  mt: 0.2,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {leaveType} (Approved)
                              </Typography>
                            </Box>
                          </Tooltip>
                        );
                      }

                      // 2. Worked Shift: Locked (Grey with Lock Icon)
                      if (isWorked) {
                        return (
                          <Tooltip
                            key={dayNum}
                            arrow
                            title={`🔒 Shift Worked: ${workedInfo?.shiftName || 'Clocked in'} (${workedInfo?.hours || 8}h). Staff already completed shift. Leave application disabled on this day.`}
                          >
                            <Box
                              sx={{
                                p: 0.8,
                                borderRadius: 1.5,
                                bgcolor: '#e2e8f0',
                                color: '#64748b',
                                border: '1px dashed #cbd5e1',
                                opacity: 0.65,
                                cursor: 'not-allowed',
                                textAlign: 'center',
                                position: 'relative',
                                userSelect: 'none'
                              }}
                            >
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" fontWeight={800} sx={{ textDecoration: 'line-through' }}>
                                  {dayNum}
                                </Typography>
                                <Lock sx={{ fontSize: 12, color: '#94a3b8' }} />
                              </Stack>
                              <Typography variant="caption" sx={{ fontSize: '0.62rem', display: 'block', fontWeight: 700, color: '#64748b', mt: 0.2 }}>
                                Worked
                              </Typography>
                            </Box>
                          </Tooltip>
                        );
                      }

                      // 3. Selected Leave Duration (Active Blue)
                      if (isSelectedLeave) {
                        return (
                          <Box
                            key={dayNum}
                            sx={{
                              p: 0.8,
                              borderRadius: 1.5,
                              bgcolor: '#1e3a8a',
                              color: '#ffffff',
                              border: '1px solid #1e3a8a',
                              textAlign: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(30, 58, 138, 0.25)',
                              userSelect: 'none',
                              '&:hover': { bgcolor: '#1e40af' }
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" fontWeight={800}>
                                {dayNum}
                              </Typography>
                              <Check sx={{ fontSize: 12, color: '#93c5fd' }} />
                            </Stack>
                            <Typography variant="caption" sx={{ fontSize: '0.62rem', display: 'block', fontWeight: 700, color: '#93c5fd', mt: 0.2 }}>
                              Leave
                            </Typography>
                          </Box>
                        );
                      }

                      // 4. Available / Rest Day
                      return (
                        <Box
                          key={dayNum}
                          onClick={() => {
                            if (!startDate || (startDate && endDate && startDate !== endDate)) {
                              setStartDate(dStr);
                              setEndDate(dStr);
                            } else if (dStr < startDate) {
                              setStartDate(dStr);
                            } else {
                              setEndDate(dStr);
                            }
                          }}
                          sx={{
                            p: 0.8,
                            borderRadius: 1.5,
                            bgcolor: isSun ? '#f8fafc' : '#ffffff',
                            color: isSun ? '#94a3b8' : '#1e293b',
                            border: '1px solid #e2e8f0',
                            textAlign: 'center',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.15s',
                            '&:hover': { bgcolor: '#f0fdf4', borderColor: '#22c55e', transform: 'translateY(-1px)' }
                          }}
                        >
                          <Typography variant="caption" fontWeight={700}>
                            {dayNum}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.62rem', display: 'block', color: isSun ? '#94a3b8' : '#16a34a', fontWeight: 600, mt: 0.2 }}>
                            {isSun ? 'Rest' : 'Available'}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Paper>
              </Grid>

              {/* Working Days & Remaining Balance Validation Banner */}
              <Grid item xs={12}>
                {isExceedingBalance ? (
                  <Alert
                    severity="error"
                    icon={<WarningAmber sx={{ color: '#dc2626', fontSize: 24 }} />}
                    sx={{
                      borderRadius: 2,
                      border: '1.5px solid #f87171',
                      bgcolor: '#fef2f2',
                      py: 1,
                      '& .MuiAlert-message': { width: '100%' }
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={900} color="#991b1b">
                      ⛔ Leave Duration Exceeds Allocated Allowance: {calculatedDays} Days Selected vs {selectedCategoryBalance.remaining} Days Available!
                    </Typography>
                    <Typography variant="body2" color="#7f1d1d" sx={{ mt: 0.3 }}>
                      You have selected <b>{calculatedDays} working days</b> for <b>{LEAVE_TYPES.find(t => t.value === selectedLeaveType)?.label || selectedLeaveType}</b>, but your available remaining balance is only <b>{selectedCategoryBalance.remaining} day(s)</b> (Allocated: {selectedCategoryBalance.total} days, Used: {selectedCategoryBalance.used} days).
                    </Typography>
                    <Typography variant="caption" fontWeight={700} color="#991b1b" sx={{ display: 'block', mt: 0.6 }}>
                      ⚠️ Please adjust your start or end date to at most {selectedCategoryBalance.remaining} working day(s) to submit this application.
                    </Typography>
                  </Alert>
                ) : (
                  <Alert
                    severity="success"
                    icon={<DateRange sx={{ color: '#16a34a' }} />}
                    sx={{
                      py: 0.8,
                      borderRadius: 2,
                      border: '1px solid #86efac',
                      bgcolor: '#f0fdf4',
                      '& .MuiAlert-message': { width: '100%' }
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography variant="body2" fontWeight={800} color="#166534">
                          Duration: <b>{calculatedDays} Working Days</b> (Excluded weekends).
                        </Typography>
                        <Typography variant="caption" color="#15803d" sx={{ display: 'block' }}>
                          When approved, these dates will automatically reflect as <b>{selectedLeaveType} ({calculatedDays * 8} Hours)</b> on your timesheet.
                        </Typography>
                      </Box>
                      <Chip
                        label={`Balance after approval: ${Math.max(0, selectedCategoryBalance.remaining - calculatedDays)} Days remaining`}
                        size="small"
                        color="success"
                        sx={{ fontWeight: 800, fontSize: '0.72rem' }}
                      />
                    </Stack>
                  </Alert>
                )}
              </Grid>

              {/* Supervisor Selection */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Assigned Unit Supervisor (Tier 1 Reviewer)"
                  value={selectedSupervisor}
                  onChange={e => setSelectedSupervisor(e.target.value)}
                  helperText="Direct Primary or Secondary / Line Supervisor mapped in Hierarchy"
                >
                  {applicantSupervisors.map(sup => (
                    <MenuItem key={sup.id || sup.name} value={sup.name}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>{sup.name}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.68rem' }}>{sup.role}</Typography>
                        </Box>
                        <Chip
                          label={sup.type === 'PRIMARY' ? 'Direct Primary' : sup.type === 'SECONDARY' ? 'Secondary / Line' : 'Supervisor'}
                          size="small"
                          color={sup.type === 'PRIMARY' ? 'primary' : sup.type === 'SECONDARY' ? 'secondary' : 'default'}
                          sx={{ fontSize: '0.62rem', height: 18, fontWeight: 800, flexShrink: 0 }}
                        />
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Relief Officer (Dropdown of Cashier Staff) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Relief Officer (Duty Handover Peer)"
                  value={reliefOfficer}
                  onChange={e => setReliefOfficer(e.target.value)}
                  helperText="Select a colleague with Cashier role managing till & duty coverage"
                  required
                >
                  {eligibleReliefOfficers.map(officer => (
                    <MenuItem key={officer.id || officer.name} value={officer.name}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                        <Typography variant="body2" fontWeight={600}>{officer.name}</Typography>
                        <Chip label={officer.role} size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: '#f1f5f9' }} />
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Emergency Contact Phone (Max 11 Digits with Realtime Verification) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Emergency Contact Phone (Max 11 Digits)"
                  value={emergencyPhone}
                  onChange={e => handleEmergencyPhoneChange(e.target.value)}
                  error={emergencyPhone.length > 0 && emergencyPhone.length !== 11}
                  helperText={
                    emergencyPhone.length === 11
                      ? '✓ Valid 11-digit Nigerian phone number'
                      : emergencyPhone.length > 0
                      ? `${emergencyPhone.length}/11 digits (Must not exceed or be less than 11 digits)`
                      : 'Enter 11-digit phone number (e.g. 08034567890)'
                  }
                  inputProps={{
                    maxLength: 11,
                    inputMode: 'numeric',
                    pattern: '[0-9]*'
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone sx={{ fontSize: 18, color: emergencyPhone.length === 11 ? '#16a34a' : 'text.secondary' }} />
                      </InputAdornment>
                    )
                  }}
                  required
                />
              </Grid>

              {/* Document Upload Simulator */}
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFile />}
                  sx={{ height: 40, textTransform: 'none', fontWeight: 600 }}
                >
                  {attachedDocName || 'Attach Medical Note / Memo (Optional)'}
                  <input
                    type="file"
                    hidden
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setAttachedDocName(e.target.files[0].name);
                      }
                    }}
                  />
                </Button>
              </Grid>

              {/* Quick Presets for Reason of Out-of-Office */}
              <Grid item xs={12}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <AutoFixHigh sx={{ fontSize: 20, color: '#1e3a8a' }} />
                    <Typography variant="subtitle2" fontWeight={800} color="#1e3a8a">
                      Quick Presets for Out-of-Office & Handover (Click to Auto-populate Draft):
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {OUT_OF_OFFICE_PRESETS.map((preset, pIdx) => {
                      const isSelected = selectedLeaveType === preset.category;
                      return (
                        <Button
                          key={pIdx}
                          size="small"
                          variant={isSelected ? 'contained' : 'outlined'}
                          onClick={() => handleApplyPreset(preset)}
                          startIcon={isSelected ? <Check sx={{ fontSize: '15px !important' }} /> : undefined}
                          sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: isSelected ? 800 : 700,
                            fontSize: '0.78rem',
                            py: 0.6,
                            px: 1.5,
                            bgcolor: isSelected ? preset.color : '#ffffff',
                            borderColor: isSelected ? preset.color : '#cbd5e1',
                            color: isSelected ? '#ffffff' : '#1e293b',
                            boxShadow: isSelected ? `0 2px 8px ${preset.color}66` : 'none',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: isSelected ? preset.color : '#eff6ff',
                              borderColor: isSelected ? preset.color : '#2563eb',
                              color: isSelected ? '#ffffff' : '#1d4ed8',
                              boxShadow: isSelected ? `0 4px 12px ${preset.color}88` : '0 2px 6px rgba(37, 99, 235, 0.15)'
                            }
                          }}
                        >
                          {preset.shortLabel}
                        </Button>
                      );
                    })}
                  </Stack>
                </Box>
              </Grid>

              {/* Reason for Out-of-Office */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Reason for Out-of-Office & Handover Directives *"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Specify purpose of leave, travel destination if applicable, and handover briefing details..."
                  required
                  helperText="Draft auto-populated from presets above. You can freely edit or add custom handover directives."
                />
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
            <Button onClick={() => { setApplyModalOpen(false); setReapplyTargetLeaveId(null); }} sx={{ color: 'text.secondary', fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={hasShiftConflict || isExceedingBalance}
              sx={{
                bgcolor: (hasShiftConflict || isExceedingBalance) ? '#94a3b8' : (reapplyTargetLeaveId ? '#d97706' : '#1e3a8a'),
                color: '#ffffff',
                fontWeight: 800,
                px: 3,
                '&:hover': { bgcolor: (hasShiftConflict || isExceedingBalance) ? '#94a3b8' : (reapplyTargetLeaveId ? '#b45309' : '#1e40af') }
              }}
            >
              {isExceedingBalance
                ? `Exceeds Balance (${selectedCategoryBalance.remaining} Days Left)`
                : hasShiftConflict
                ? 'Resolve Shift Conflict'
                : reapplyTargetLeaveId
                ? `Re-submit & Route to ${selectedSupervisor}`
                : 'Submit & Route to Supervisor'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ─── RETURN / REJECT LEAVE MODAL ──────────────────────────────────────── */}
      <Dialog open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#dc2626' }}>
          Return Leave Request for Correction
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please state the operational reason why this leave request is being returned to <b>{selectedLeaveForReject?.name}</b>:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for Return / Adjustment"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="e.g. Inadequate cashier duty coverage during revenue peak week, please adjust dates."
            required
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmReject} sx={{ fontWeight: 700 }}>
            Confirm Return
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── CALENDAR LEAVE DETAIL MODAL ──────────────────────────────────────── */}
      <Dialog
        open={calendarDetailModalOpen}
        onClose={() => setCalendarDetailModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        {selectedCalendarLeave && (
          <>
            <DialogTitle sx={{ bgcolor: '#1e3a8a', color: '#ffffff', py: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6" fontWeight={800} color="#ffffff">
                    {selectedCalendarLeave.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#93c5fd' }}>
                    {selectedCalendarLeave.empId} • {selectedCalendarLeave.department}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setCalendarDetailModalOpen(false)} sx={{ color: '#ffffff' }}>
                  <Close />
                </IconButton>
              </Stack>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              {/* Status Banner */}
              <Alert
                severity="success"
                icon={<CheckCircle />}
                sx={{ mb: 2.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}
              >
                <b>Approved & Timesheet Synchronized:</b> 8 hours/day duty credit automatically synced to monthly attendance records.
              </Alert>

              <Grid container spacing={2}>
                {/* Leave Type */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    LEAVE CATEGORY
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      icon={LEAVE_TYPES.find(t => t.value === selectedCalendarLeave.type)?.icon as any}
                      label={selectedCalendarLeave.type}
                      sx={{ fontWeight: 800, bgcolor: '#f8fafc', border: '1px solid #cbd5e1' }}
                    />
                  </Box>
                </Grid>

                {/* Duration */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    DURATION & WORKING DAYS
                  </Typography>
                  <Typography variant="body2" fontWeight={800} color="#1e3a8a" sx={{ mt: 0.5 }}>
                    {selectedCalendarLeave.startDate} ➔ {selectedCalendarLeave.endDate}
                  </Typography>
                  <Typography variant="caption" color="#059669" fontWeight={700}>
                    {selectedCalendarLeave.days} Working Days Off Duty
                  </Typography>
                </Grid>

                {/* Reason */}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    PURPOSE / REASON
                  </Typography>
                  <Paper sx={{ p: 1.5, mt: 0.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                    <Typography variant="body2" color="#334155">
                      {selectedCalendarLeave.reason || 'Annual scheduled professional welfare leave.'}
                    </Typography>
                  </Paper>
                </Grid>

                {/* Relief Officer */}
                <Grid item xs={12} sm={6}>
                  <Card sx={{ p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#f0f9ff' }}>
                    <Typography variant="caption" color="#0369a1" fontWeight={800}>
                      DESIGNATED RELIEF OFFICER
                    </Typography>
                    <Typography variant="body2" fontWeight={800} color="#0c4a6e" sx={{ mt: 0.5 }}>
                      {selectedCalendarLeave.reliefOfficer || 'Assigned Peer'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Full Till & Roster Duty Handover
                    </Typography>
                  </Card>
                </Grid>

                {/* Approver Details */}
                <Grid item xs={12} sm={6}>
                  <Card sx={{ p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#f0fdf4' }}>
                    <Typography variant="caption" color="#15803d" fontWeight={800}>
                      EXECUTIVE AUTHORIZATION
                    </Typography>
                    <Typography variant="body2" fontWeight={800} color="#14532d" sx={{ mt: 0.5 }}>
                      {selectedCalendarLeave.approvedBy || selectedCalendarLeave.supervisorRecommended || 'Hospital Administrator'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Official Seal Certified
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <Button
                variant="outlined"
                startIcon={<CalendarMonth />}
                onClick={() => {
                  setCalendarDetailModalOpen(false);
                  navigate('/timesheets');
                }}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                View in Monthly Timesheet
              </Button>
              <Button
                variant="contained"
                onClick={() => setCalendarDetailModalOpen(false)}
                sx={{ bgcolor: '#1e3a8a', textTransform: 'none', fontWeight: 800, px: 3 }}
              >
                Done
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
