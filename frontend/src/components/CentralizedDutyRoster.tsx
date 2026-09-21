import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Alert,
  Avatar,
  Stack,
  Card,
  Tabs,
  Tab,
  alpha,
  InputAdornment,
} from '@mui/material';
import {
  CalendarMonth,
  Add,
  LocalAtm,
  Person,
  PlayArrow,
  SwapHoriz,
  PersonAdd,
  TableRows,
  Group,
  Lock,
  ChevronLeft,
  ChevronRight,
  Today,
  Close,
  Delete,
  AccessTime,
  Psychology,
  CheckCircle,
  Search,
  MedicalServices,
  LocalHospital,
  LocalPharmacy,
  Biotech,
  MeetingRoom,
  AdminPanelSettings,
  FilterList,
  Settings,
  BeachAccess,
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const PRIMARY = '#1e3a8a';
const SECONDARY = '#0284c7';
const SUCCESS = '#16a34a';
const WARNING = '#d97706';
const DANGER = '#dc2626';
const TEAL = '#0d9488';
const PURPLE = '#7c3aed';

const formatNGN = (amount?: number | null) =>
  `₦${Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const StatusChip: React.FC<{ label: string }> = ({ label }) => {
  const norm = (label || '').toUpperCase();
  let color: 'success' | 'warning' | 'error' | 'info' | 'default' = 'default';
  let display = label;

  if (norm === 'OPEN' || norm === 'ACTIVE' || norm === 'ON_DUTY') {
    color = 'success';
    display = 'ON DUTY (ACTIVE)';
  } else if (norm === 'SCHEDULED') {
    color = 'info';
    display = 'SCHEDULED';
  } else if (norm === 'ON_LEAVE' || norm.includes('LEAVE')) {
    color = 'warning';
    display = 'ON LEAVE (RELIEVED)';
  } else if (norm === 'CLOSED' || norm === 'COMPLETED') {
    color = 'default';
    display = 'COMPLETED';
  } else if (norm === 'MISSED' || norm === 'ABSENT') {
    color = 'error';
    display = 'MISSED';
  }

  return (
    <Chip
      size="small"
      label={display}
      color={color}
      sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }}
    />
  );
};

const KPICard: React.FC<{ title: string; value: string | number; sub: string; icon: React.ReactNode; color: string }> = ({
  title,
  value,
  sub,
  icon,
  color,
}) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.2,
      borderRadius: 2.5,
      border: `1px solid ${alpha(color, 0.2)}`,
      background: `linear-gradient(135deg, #ffffff 0%, ${alpha(color, 0.04)} 100%)`,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
    }}
  >
    <Avatar sx={{ bgcolor: alpha(color, 0.12), color, width: 48, height: 48 }}>
      {icon}
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {title}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 900, color: PRIMARY, my: 0.2 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {sub}
      </Typography>
    </Box>
  </Paper>
);

interface CentralizedDutyRosterProps {
  initialRoleFilter?: string;
}

export const CentralizedDutyRoster: React.FC<CentralizedDutyRosterProps> = ({ initialRoleFilter = 'ALL' }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();

  const queryRole = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('role') || initialRoleFilter;
  }, [location.search, initialRoleFilter]);

  // Data States
  const [shifts, setShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [configuredShifts, setConfiguredShifts] = useState<any[]>([
    { code: 'MORNING_8H', name: 'Standard Morning Shift (7am–3pm)', role: 'ALL', startTime: '07:00', endTime: '15:00', description: 'General hospital morning duty coverage', color: '#2563eb' },
    { code: 'AFTERNOON_8H', name: 'Standard Afternoon Shift (2pm–10pm)', role: 'ALL', startTime: '14:00', endTime: '22:00', description: 'General hospital afternoon duty coverage', color: '#d97706' },
    { code: 'NIGHT_12H', name: 'Overnight Shift (8pm–8am)', role: 'ALL', startTime: '20:00', endTime: '08:00', description: 'General hospital 12-hour night duty coverage', color: '#7c3aed' },
    { code: 'DAY_12H', name: 'Full Day Extended Duty (8am–8pm)', role: 'ALL', startTime: '08:00', endTime: '20:00', description: 'Full day weekend and holiday duty', color: '#059669' },
    { code: 'DOCTOR_CALL_24H', name: 'Doctor 24-Hour Call Duty (8am–8am)', role: 'Doctor', startTime: '08:00', endTime: '08:00', description: 'Continuous 24-hour medical on-call & emergency coverage', color: '#dc2626' },
    { code: 'DOCTOR_CLINICAL_8H', name: 'Consultant Morning Clinic (8am–4pm)', role: 'Doctor', startTime: '08:00', endTime: '16:00', description: 'Outpatient consultations and ward clinical rounds', color: '#1e3a8a' },
    { code: 'DOCTOR_THEATRE_CALL', name: 'Surgical Theatre Call (8am–8pm)', role: 'Doctor', startTime: '08:00', endTime: '20:00', description: 'Elective surgeries and emergency trauma surgical cover', color: '#4338ca' },
    { code: 'NURSE_MORNING_8H', name: 'Nurse Morning Ward Roster (7am–3pm)', role: 'Nurse', startTime: '07:00', endTime: '15:00', description: 'Inpatient ward rounds & vital signs monitoring', color: '#0284c7' },
    { code: 'NURSE_AFTERNOON_8H', name: 'Nurse Afternoon Rota (2pm–10pm)', role: 'Nurse', startTime: '14:00', endTime: '22:00', description: 'Afternoon nursing handover & patient care', color: '#ea580c' },
    { code: 'NURSE_NIGHT_12H', name: 'Nurse Night Shift (8pm–8am)', role: 'Nurse', startTime: '20:00', endTime: '08:00', description: 'Overnight intensive patient care', color: '#8b5cf6' },
    { code: 'NURSE_LABOUR_12H', name: 'Labour & Delivery Ward Shift (8am–8pm)', role: 'Nurse', startTime: '08:00', endTime: '20:00', description: 'Maternity, delivery room & neonatal monitoring', color: '#e11d48' },
    { code: 'CASHIER_MORNING_8H', name: 'Cashier Morning Till (7am–3pm)', role: 'Cashier', startTime: '07:00', endTime: '15:00', description: 'Main OPD cashier till & payment collections', color: '#2563eb' },
    { code: 'CASHIER_AFTERNOON_8H', name: 'Cashier Afternoon Till (2pm–10pm)', role: 'Cashier', startTime: '14:00', endTime: '22:00', description: 'Afternoon clinic, pharmacy & discharge billing', color: '#d97706' },
    { code: 'CASHIER_NIGHT_12H', name: 'Cashier Night Till (8pm–8am)', role: 'Cashier', startTime: '20:00', endTime: '08:00', description: 'Emergency & IPD 24/7 revenue collection', color: '#7c3aed' },
    { code: 'CASHIER_FULLDAY_12H', name: 'Weekend Cashier Full Day (8am–8pm)', role: 'Cashier', startTime: '08:00', endTime: '20:00', description: 'Weekend full day billing & till reconciliation', color: '#0d9488' },
    { code: 'PHARM_DAY_8H', name: 'Pharmacy Dispensing Day (8am–4pm)', role: 'Pharmacist', startTime: '08:00', endTime: '16:00', description: 'Main pharmacy prescription dispensing', color: '#16a34a' },
    { code: 'LAB_MORNING_8H', name: 'Laboratory Morning Bench (8am–4pm)', role: 'Laboratory', startTime: '08:00', endTime: '16:00', description: 'Routine diagnostic testing & accessioning', color: '#0891b2' },
    { code: 'FRONTDESK_MORNING_8H', name: 'Reception Morning Desk (7am–3pm)', role: 'FrontDesk', startTime: '07:00', endTime: '15:00', description: 'Patient registration & triage intake', color: '#3b82f6' },
  ]);

  // Logged in User Identification
  const loggedInName = useMemo(() => {
    if (!user) return 'Staff Officer';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || (user as any).name || user.username || 'Staff Officer';
  }, [user]);

  // Admin and Role Category Detection
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    const roles = (user.roles || []).map((x: string) => x.toUpperCase());
    const des = (user.designation || '').toLowerCase();
    const uname = (user.username || '').toLowerCase();
    return (
      r === 'ADMIN' ||
      r === 'SUPER_ADMIN' ||
      r === 'ADMINISTRATOR' ||
      roles.includes('ADMIN') ||
      roles.includes('SUPER_ADMIN') ||
      roles.includes('ADMINISTRATOR') ||
      des.includes('admin') ||
      des.includes('administrator') ||
      des.includes('director') ||
      des.includes('bishop') ||
      uname === 'admin'
    );
  }, [user]);

  // Filter Helper for Employee Roles
  const isEmployeeInRole = useCallback((emp: any, roleKey: string) => {
    if (!roleKey || roleKey === 'ALL') return true;
    const r = (emp.role || '').toLowerCase();
    const d = (emp.department || '').toLowerCase();
    const des = (emp.designation || '').toLowerCase();

    if (roleKey === 'Doctor') {
      return r.includes('doctor') || r.includes('consultant') || r.includes('physician') || r.includes('surgeon') || r.includes('paediatrician') || d.includes('clinical') || d.includes('surgery') || d.includes('opd');
    }
    if (roleKey === 'Nurse') {
      return r.includes('nurse') || r.includes('matron') || r.includes('midwife') || d.includes('nursing') || d.includes('icu') || d.includes('inpatient');
    }
    if (roleKey === 'Cashier') {
      return r.includes('cashier') || r.includes('revenue') || r.includes('billing') || d.includes('revenue') || d.includes('billing') || emp.id === 'cashier' || emp.id === 'cashier01' || emp.id === 'cashier02';
    }
    if (roleKey === 'Pharmacist') {
      return r.includes('pharm') || d.includes('pharmacy') || des.includes('pharm');
    }
    if (roleKey === 'Laboratory') {
      return r.includes('lab') || r.includes('scientist') || r.includes('patholog') || d.includes('lab') || d.includes('diagnostic');
    }
    if (roleKey === 'FrontDesk') {
      return r.includes('reception') || r.includes('front desk') || r.includes('records') || d.includes('records') || d.includes('triage');
    }
    if (roleKey === 'Admin') {
      return r.includes('admin') || r.includes('accountant') || r.includes('bishop') || r.includes('director') || r.includes('coordinator') || d.includes('admin') || d.includes('executive');
    }
    return true;
  }, []);

  // Matched employee profile for logged-in user
  const currentEmp = useMemo(() => {
    if (!user) return null;
    return employees.find(
      e => (user.id && (e.id === user.id || e.staffId === user.id)) ||
           (user.staffId && (e.staffId === user.staffId || e.id === user.staffId)) ||
           (user.email && e.email && e.email.toLowerCase() === user.email.toLowerCase()) ||
           (user.firstName && user.lastName && e.firstName?.toLowerCase() === user.firstName.toLowerCase() && e.lastName?.toLowerCase() === user.lastName.toLowerCase())
    );
  }, [employees, user]);

  // Dynamically resolve subordinates mapped in /staff/hierarchy for the logged-in user
  const mySubordinates = useMemo(() => {
    if (!user && !currentEmp) return [];
    const uId = user?.id || user?.staffId || currentEmp?.id;
    const lName = loggedInName.toLowerCase();

    return employees.filter(e => {
      // Cannot supervise self
      if (e.id === uId || e.id === currentEmp?.id) return false;

      // Direct Primary Supervisor match
      if (uId && (e.supervisorId === uId || (currentEmp?.id && e.supervisorId === currentEmp.id))) return true;
      if (e.supervisorName && lName && (e.supervisorName.toLowerCase().includes(lName) || lName.includes(e.supervisorName.toLowerCase()))) return true;

      // Secondary / Line Supervisor match
      if (uId && (e.secondarySupervisorId === uId || (currentEmp?.id && e.secondarySupervisorId === currentEmp.id))) return true;
      if (e.secondarySupervisorName && lName && (e.secondarySupervisorName.toLowerCase().includes(lName) || lName.includes(e.secondarySupervisorName.toLowerCase()))) return true;

      return false;
    });
  }, [employees, user, currentEmp, loggedInName]);

  const hasSubordinates = mySubordinates.length > 0;
  const canAssignDuties = isAdmin || hasSubordinates;

  // Determine non-admin logged-in user's role
  const userRoleCategory = useMemo(() => {
    if (!user) return 'ALL';
    if (isAdmin) return 'ALL';

    const matchedEmp = currentEmp;

    const testRole = (roleKey: string) => {
      if (matchedEmp && isEmployeeInRole(matchedEmp, roleKey)) return true;
      const dummy = {
        role: user.role,
        designation: user.designation,
        department: user.departments?.[0]?.name || (user as any).department,
        id: user.id || user.staffId,
      };
      return isEmployeeInRole(dummy, roleKey);
    };

    if (testRole('Doctor')) return 'Doctor';
    if (testRole('Nurse')) return 'Nurse';
    if (testRole('Cashier')) return 'Cashier';
    if (testRole('Pharmacist')) return 'Pharmacist';
    if (testRole('Laboratory')) return 'Laboratory';
    if (testRole('FrontDesk')) return 'FrontDesk';

    const des = (user.designation || '').toLowerCase();
    const uname = (user.username || '').toLowerCase();
    const r = (user.role || '').toLowerCase();

    if (des.includes('cashier') || des.includes('billing') || des.includes('revenue') || uname.includes('cashier') || user.firstName?.toLowerCase().includes('mary') || r.includes('cashier')) return 'Cashier';
    if (des.includes('doctor') || des.includes('consultant') || des.includes('physician') || des.includes('surgeon') || r.includes('doctor')) return 'Doctor';
    if (des.includes('nurse') || des.includes('matron') || des.includes('midwife') || r.includes('nurse')) return 'Nurse';
    if (des.includes('pharm') || r.includes('pharm')) return 'Pharmacist';
    if (des.includes('lab') || des.includes('scientist') || r.includes('lab')) return 'Laboratory';
    if (des.includes('reception') || des.includes('front desk') || des.includes('record') || r.includes('front')) return 'FrontDesk';

    return 'ALL';
  }, [user, isAdmin, currentEmp, isEmployeeInRole]);

  // Distinct roles present among subordinates for Supervisor assignment
  const subordinateRoles = useMemo(() => {
    if (isAdmin) return ['Doctor', 'Nurse', 'Cashier', 'Pharmacist', 'Laboratory', 'FrontDesk', 'Admin'];
    const rolesSet = new Set<string>();
    mySubordinates.forEach(s => {
      ['Doctor', 'Nurse', 'Cashier', 'Pharmacist', 'Laboratory', 'FrontDesk', 'Admin'].forEach(r => {
        if (isEmployeeInRole(s, r)) rolesSet.add(r);
      });
    });
    if (rolesSet.size === 0 && userRoleCategory !== 'ALL') rolesSet.add(userRoleCategory);
    return Array.from(rolesSet);
  }, [isAdmin, mySubordinates, isEmployeeInRole, userRoleCategory]);

  // View States
  const [shiftViewMode, setShiftViewMode] = useState<'sessions' | 'calendar' | 'matrix'>('sessions');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>(queryRole || initialRoleFilter);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('ALL');
  const [selectedShiftTypeFilter, setSelectedShiftTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [myShiftsOnly, setMyShiftsOnly] = useState(false);

  // If user cannot access matrix view, automatically fall back to sessions
  useEffect(() => {
    if (shiftViewMode === 'matrix' && !canAssignDuties) {
      setShiftViewMode('sessions');
    }
  }, [shiftViewMode, canAssignDuties]);

  // Effective Role Filter: Admins can view ALL or any role; non-admins are restricted to their own role or subordinate roles
  const effectiveRoleFilter = useMemo(() => {
    if (!isAdmin && userRoleCategory !== 'ALL' && !hasSubordinates) {
      return userRoleCategory;
    }
    return selectedRoleFilter;
  }, [isAdmin, userRoleCategory, hasSubordinates, selectedRoleFilter]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Check if logged-in user is currently on approved leave today
  const activeUserLeave = useMemo(() => {
    const lName = loggedInName.toLowerCase();
    const uId = user?.id || user?.staffId;
    return leaves.find((l: any) => {
      const isApproved = l.status === 'APPROVED' || l.status === 'Approved' || l.status === 'Approved & Synced';
      if (!isApproved) return false;
      const isMatch = (uId && (l.empId === uId || l.staffId === uId)) ||
        (l.name && lName && l.name.toLowerCase().includes(lName)) ||
        (lName.includes('mary') && (l.name?.toLowerCase().includes('mary') || l.empId === 'EMP-006' || l.empId === 'cashier'));
      if (!isMatch) return false;
      return l.startDate <= todayStr && l.endDate >= todayStr;
    });
  }, [leaves, user, loggedInName, todayStr]);

  const isUserOnLeave = Boolean(activeUserLeave);

  useEffect(() => {
    if (!isAdmin && userRoleCategory !== 'ALL' && !hasSubordinates) {
      setSelectedRoleFilter(userRoleCategory);
      setSelectedStaffFilter('ALL');
    } else if (queryRole && queryRole !== 'ALL') {
      setSelectedRoleFilter(queryRole);
    }
  }, [isAdmin, userRoleCategory, hasSubordinates, queryRole]);

  // Dialog States
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [shiftConfigOpen, setShiftConfigOpen] = useState(false);
  const [openAddShift, setOpenAddShift] = useState(false);
  const [startShiftModal, setStartShiftModal] = useState<any | null>(null);
  const [handoverShiftModal, setHandoverShiftModal] = useState<any | null>(null);
  const [reassignShiftModal, setReassignShiftModal] = useState<any | null>(null);
  const [selectedCalendarShift, setSelectedCalendarShift] = useState<any | null>(null);

  // Form States
  const [openingBalanceInput, setOpeningBalanceInput] = useState<string>('');
  const [startShiftNotes, setStartShiftNotes] = useState<string>('');
  const [closingActualBalance, setClosingActualBalance] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [reassignStaffId, setReassignStaffId] = useState<string>('');
  const [reassignNotes, setReassignNotes] = useState<string>('');

  const [shiftForm, setShiftForm] = useState({
    code: '',
    name: '',
    role: 'ALL',
    startTime: '07:00',
    endTime: '15:00',
    description: '',
    color: '#2563eb',
  });

  const [assignRosterForm, setAssignRosterForm] = useState({
    role: 'Doctor',
    staffId: '',
    staffName: '',
    shift: 'DOCTOR_CALL_24H',
    location: 'OPD Consulting Room #01',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    cashDrawer: 'Drawer A (Mary Okon)',
    openingBalance: 0,
    isPrimary: false,
    onCallLead: false,
  });

  // Staff list matching selected role in Assign Dialog (Admins see all staff; Supervisors only see their mapped subordinates)
  const modalFilteredStaff = useMemo(() => {
    const candidateList = isAdmin ? employees : mySubordinates;
    return candidateList.filter(e => isEmployeeInRole(e, assignRosterForm.role));
  }, [isAdmin, employees, mySubordinates, assignRosterForm.role, isEmployeeInRole]);

  // Shift templates matching selected role in Assign Dialog (from Configure Shifts definitions)
  const modalFilteredShifts = useMemo(() => {
    const roleShifts = configuredShifts.filter((sh: any) => sh.role === assignRosterForm.role);
    const generalShifts = configuredShifts.filter((sh: any) => sh.role === 'ALL' || !sh.role);
    const otherShifts = configuredShifts.filter((sh: any) => sh.role !== assignRosterForm.role && sh.role !== 'ALL' && sh.role);

    // Prioritize role-specific shifts, then general hospital shifts, then other roles
    return [...roleShifts, ...generalShifts, ...otherShifts];
  }, [configuredShifts, assignRosterForm.role]);

  // When role changes in Assign Dialog, auto-select first matching staff & appropriate default location & template
  const handleAssignRoleChange = (newRole: string) => {
    const candidateList = isAdmin ? employees : mySubordinates;
    const matching = candidateList.filter(e => isEmployeeInRole(e, newRole));
    const firstStaff = matching[0] || candidateList[0];

    // Find the first configured shift for this role from the shift definitions
    const firstRoleShift = configuredShifts.find((s: any) => s.role === newRole) ||
      configuredShifts.find((s: any) => s.role === 'ALL') ||
      configuredShifts[0];

    let defShift = firstRoleShift?.code || 'MORNING_8H';
    let defLoc = 'Clinical OPD';
    let defDrawer = 'Drawer A (Mary Okon)';
    let defFloat = 0;

    if (newRole === 'Doctor') {
      defLoc = 'OPD Consulting Room #01';
    } else if (newRole === 'Nurse') {
      defLoc = 'Male Surgical & Medical Ward';
    } else if (newRole === 'Cashier') {
      defLoc = 'Main Outpatient Cash Desk #01';
      defDrawer = 'Drawer A (Mary Okon)';
      defFloat = 20000;
    } else if (newRole === 'Pharmacist') {
      defLoc = 'Main Outpatient Pharmacy';
    } else if (newRole === 'Laboratory') {
      defLoc = 'Main Clinical Laboratory Bench';
    } else if (newRole === 'FrontDesk') {
      defLoc = 'Hospital Main Reception & Triage';
    } else if (newRole === 'Admin') {
      defLoc = 'Administration Complex';
    }

    setAssignRosterForm(f => ({
      ...f,
      role: newRole,
      staffId: firstStaff ? firstStaff.id : '',
      staffName: firstStaff ? `${firstStaff.firstName} ${firstStaff.lastName}` : '',
      shift: defShift,
      location: defLoc,
      cashDrawer: defDrawer,
      openingBalance: defFloat,
    }));
  };

  // Fetch Centralized Roster Data
  const fetchRosterData = useCallback(async () => {
    try {
      const [shiftsRes, empRes, cfgRes, leavesRes] = await Promise.all([
        api.get('/hr/roster/shifts').catch(() => api.get('/billing/cashier/shifts')),
        api.get('/hr/employees'),
        api.get('/hr/roster/config').catch(() => ({ data: { data: [] } })),
        api.get('/hr/leave').catch(() => ({ data: { data: [] } })),
      ]);

      if (shiftsRes.data?.data) {
        setShifts(shiftsRes.data.data);
      }
      if (empRes.data?.data) {
        setEmployees(empRes.data.data);
      }
      if (cfgRes.data?.data && cfgRes.data.data.length > 0) {
        setConfiguredShifts(cfgRes.data.data);
      }
      if (leavesRes.data?.data) {
        setLeaves(leavesRes.data.data);
      }
    } catch {
      enqueueSnackbar('Failed to load centralized duty roster records', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchRosterData();
  }, [fetchRosterData]);

  // Logged-in user's active, scheduled today, and closed today shifts
  const checkIsUserShift = useCallback((s: any) => {
    if (!s) return false;
    const lName = loggedInName.toLowerCase();
    const sName = (s.cashierName || s.name || '').toLowerCase();
    const sId = s.cashierId || s.userId || s.empId;

    if (s.userId === user?.id || sId === user?.id || sId === user?.staffId) return true;
    if (lName && sName.includes(lName)) return true;

    if (lName.includes('blessing')) {
      if (sName.includes('blessing') || sId === 'cashier01' || sId === 'EMP-007') return true;
      if (s.isReliefShift && (s.relievingFor?.toLowerCase().includes('mary') || sName.includes('blessing'))) return true;
    }
    if (lName.includes('mary')) {
      if (sName.includes('mary') || sId === 'cashier' || sId === 'EMP-006') return true;
      if (s.isReliefShift && (s.relievingFor?.toLowerCase().includes('mary') || s.relievingEmpId === 'EMP-006')) return true;
    }
    if (lName.includes('chinedu')) {
      if (sName.includes('chinedu') || sId === 'EMP-009') return true;
    }
    return false;
  }, [user, loggedInName]);

  const myActiveShift = useMemo(() => {
    return shifts.find((s: any) => s.status === 'OPEN' && checkIsUserShift(s));
  }, [shifts, checkIsUserShift]);

  const myScheduledShiftToday = useMemo(() => {
    return shifts.find((s: any) =>
      s.status === 'SCHEDULED' &&
      (s.scheduledDate === todayStr || (!s.scheduledDate && s.id.includes('today'))) &&
      checkIsUserShift(s)
    );
  }, [shifts, checkIsUserShift, todayStr]);

  const myClosedShiftToday = useMemo(() => {
    return shifts.find((s: any) =>
      s.status === 'CLOSED' &&
      (s.scheduledDate === todayStr || (s.closedAt && s.closedAt.startsWith(todayStr))) &&
      checkIsUserShift(s)
    );
  }, [shifts, checkIsUserShift, todayStr]);

  const myNextScheduledShift = useMemo(() => {
    return shifts
      .filter((s: any) => s.status === 'SCHEDULED' && s.scheduledDate > todayStr && checkIsUserShift(s))
      .sort((a: any, b: any) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''))[0];
  }, [shifts, checkIsUserShift, todayStr]);

  // Helper to check if a shift belongs to a given Hospital Role category
  const isShiftInRole = useCallback((s: any, role: string) => {
    if (role === 'ALL') return true;
    const matchingStaff = employees.filter(e => isEmployeeInRole(e, role));
    const matchingIds = matchingStaff.map(e => e.id);
    const matchingNames = matchingStaff.map(e => `${e.firstName} ${e.lastName}`.toLowerCase());

    const shiftStaffId = s.cashierId || s.userId || s.empId;
    const shiftStaffName = (s.cashierName || s.name || '').toLowerCase();

    return matchingIds.includes(shiftStaffId) ||
      matchingNames.some(n => shiftStaffName.includes(n)) ||
      (role === 'Cashier' && (shiftStaffId === 'cashier' || shiftStaffId === 'cashier01' || shiftStaffId === 'cashier02' || shiftStaffName.includes('cashier') || shiftStaffName.includes('mary') || shiftStaffName.includes('blessing') || shiftStaffName.includes('danladi') || (s.shiftType || '').includes('CASHIER') || (s.cashDrawer || '').toLowerCase().includes('drawer') || (s.location || '').toLowerCase().includes('cash'))) ||
      (role === 'Doctor' && (shiftStaffName.includes('dr.') || (s.shiftType || '').includes('DOCTOR') || (s.location || '').toLowerCase().includes('consult'))) ||
      (role === 'Nurse' && (shiftStaffName.includes('nurse') || shiftStaffName.includes('matron') || (s.shiftType || '').includes('NURSE') || (s.location || '').toLowerCase().includes('ward'))) ||
      (role === 'Pharmacist' && (shiftStaffName.includes('pharm') || (s.shiftType || '').includes('PHARM') || (s.location || '').toLowerCase().includes('pharm'))) ||
      (role === 'Laboratory' && (shiftStaffName.includes('lab') || (s.shiftType || '').includes('LAB') || (s.location || '').toLowerCase().includes('lab'))) ||
      (role === 'FrontDesk' && (shiftStaffName.includes('front') || shiftStaffName.includes('reception') || (s.shiftType || '').includes('FRONT') || (s.location || '').toLowerCase().includes('reception')));
  }, [employees, isEmployeeInRole]);

  // 1) Shifts for "Duty Sessions & Active Roster" Tab (Only logged-in user for non-admins)
  const sessionShifts = useMemo(() => {
    return shifts.filter((s: any) => {
      const isMe = checkIsUserShift(s);

      // Non-admins only see their own shifts in Duty Sessions & Active Roster view
      if (!isAdmin || myShiftsOnly) {
        if (!isMe) return false;
      }

      // Role Filter (For Admins viewing all or selecting specific role)
      if (isAdmin && selectedRoleFilter !== 'ALL') {
        if (!isShiftInRole(s, selectedRoleFilter)) return false;
      }

      // Staff Filter
      if (selectedStaffFilter !== 'ALL') {
        const sName = (s.cashierName || '').toLowerCase();
        const sId = s.cashierId || s.userId;
        if (!sName.includes(selectedStaffFilter.toLowerCase()) && sId !== selectedStaffFilter) return false;
      }

      // Shift Type Filter
      if (selectedShiftTypeFilter !== 'ALL' && s.shiftType !== selectedShiftTypeFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (s.cashierName || '').toLowerCase().includes(q) ||
          (s.location || '').toLowerCase().includes(q) ||
          (s.shiftNumber || s.id || '').toLowerCase().includes(q) ||
          (s.cashDrawer || '').toLowerCase().includes(q) ||
          (s.shiftType || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [shifts, isAdmin, myShiftsOnly, selectedRoleFilter, selectedStaffFilter, selectedShiftTypeFilter, searchQuery, isShiftInRole, user, loggedInName]);

  // 2) Shifts for "Monthly Roster Calendar Grid" Tab (Shows all staff in that role)
  const calendarShifts = useMemo(() => {
    const targetRole = effectiveRoleFilter;
    return shifts.filter((s: any) => {
      // Role Filter (shows all staff in role for non-admins and admins)
      if (targetRole !== 'ALL') {
        if (!isShiftInRole(s, targetRole)) return false;
      }

      // Staff Filter
      if (selectedStaffFilter !== 'ALL') {
        const sName = (s.cashierName || '').toLowerCase();
        const sId = s.cashierId || s.userId;
        if (!sName.includes(selectedStaffFilter.toLowerCase()) && sId !== selectedStaffFilter) return false;
      }

      // Shift Type Filter
      if (selectedShiftTypeFilter !== 'ALL' && s.shiftType !== selectedShiftTypeFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (s.cashierName || '').toLowerCase().includes(q) ||
          (s.location || '').toLowerCase().includes(q) ||
          (s.shiftNumber || s.id || '').toLowerCase().includes(q) ||
          (s.cashDrawer || '').toLowerCase().includes(q) ||
          (s.shiftType || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [shifts, effectiveRoleFilter, selectedStaffFilter, selectedShiftTypeFilter, searchQuery, isShiftInRole]);

  // Compatibility alias for general filtered shifts
  const filteredShifts = sessionShifts;

  // Staff list matching the role for dropdown filtering and Personnel Matrix
  const availableStaffForFilter = useMemo(() => {
    if (isAdmin) {
      return employees.filter(e => isEmployeeInRole(e, effectiveRoleFilter));
    }
    if (hasSubordinates) {
      return mySubordinates.filter(e => effectiveRoleFilter === 'ALL' ? true : isEmployeeInRole(e, effectiveRoleFilter));
    }
    return [];
  }, [isAdmin, hasSubordinates, employees, mySubordinates, effectiveRoleFilter, isEmployeeInRole]);

  // Shift definitions available for the "Filter Shift Template" dropdown based on effective role
  const availableShiftsForFilter = useMemo(() => {
    if (effectiveRoleFilter === 'ALL') {
      return configuredShifts;
    }
    const roleShifts = configuredShifts.filter((sh: any) => sh.role === effectiveRoleFilter);
    if (roleShifts.length > 0) {
      return roleShifts;
    }
    return configuredShifts.filter((sh: any) => sh.role === 'ALL' || !sh.role);
  }, [configuredShifts, effectiveRoleFilter]);

  // Shift Type Colors
  const getShiftTypeColor = (type?: string) => {
    if (!type) return { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' };
    const matched = configuredShifts.find(c => c.code === type);
    if (matched?.color) {
      return { bg: alpha(matched.color, 0.12), text: matched.color, border: alpha(matched.color, 0.35) };
    }
    if (type.includes('MORNING')) return { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' };
    if (type.includes('AFTERNOON')) return { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' };
    if (type.includes('NIGHT')) return { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' };
    if (type.includes('CALL') || type.includes('24H')) return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
    return { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
  };

  // Calendar calculations
  const calYear = calendarMonth.getFullYear();
  const calMonth = calendarMonth.getMonth();
  const monthName = calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const isCurrentMonth = new Date().getFullYear() === calYear && new Date().getMonth() === calMonth;
  const todayDayNum = new Date().getDate();

  // Handlers
  const handleStartShiftSubmit = async () => {
    if (!startShiftModal) return;
    try {
      await api.post(`/hr/roster/shift/${startShiftModal.id}/start`, {
        openingBalance: openingBalanceInput,
        notes: startShiftNotes,
      }).catch(() => api.post(`/billing/cashier/shift/${startShiftModal.id}/start`, {
        openingBalance: openingBalanceInput,
        notes: startShiftNotes,
      }));

      enqueueSnackbar(`Duty shift started successfully for ${startShiftModal.cashierName}!`, { variant: 'success' });
      setStartShiftModal(null);
      fetchRosterData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to start shift', { variant: 'error' });
    }
  };

  const handleCloseShiftSubmit = async () => {
    if (!handoverShiftModal) return;
    try {
      await api.post(`/hr/roster/shift/${handoverShiftModal.id}/close`, {
        actualClosingBalance: closingActualBalance,
        supervisorNotes: handoverNotes,
      }).catch(() => api.post(`/billing/cashier/shift/${handoverShiftModal.id}/close`, {
        actualClosingBalance: closingActualBalance,
        supervisorNotes: handoverNotes,
      }));

      enqueueSnackbar('Shift handover & reconciliation completed successfully!', { variant: 'success' });
      setHandoverShiftModal(null);
      fetchRosterData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to close shift', { variant: 'error' });
    }
  };

  const handleReassignSubmit = async () => {
    if (!reassignShiftModal || !reassignStaffId) {
      enqueueSnackbar('Please select a covering staff member', { variant: 'warning' });
      return;
    }
    const coveringEmp = employees.find(e => e.id === reassignStaffId);
    const newName = coveringEmp ? `${coveringEmp.firstName} ${coveringEmp.lastName}` : reassignStaffId;

    try {
      await api.post(`/hr/roster/shift/${reassignShiftModal.id}/reassign`, {
        newStaffId: reassignStaffId,
        newStaffName: newName,
        handoverNotes: reassignNotes,
      }).catch(() => api.post(`/billing/cashier/shift/${reassignShiftModal.id}/reassign`, {
        newCashierId: reassignStaffId,
        newCashierName: newName,
        handoverNotes: reassignNotes,
      }));

      enqueueSnackbar(`Duty cover successfully delegated to ${newName}`, { variant: 'success' });
      setReassignShiftModal(null);
      fetchRosterData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to assign cover', { variant: 'error' });
    }
  };

  const handleCancelShift = async (shiftId: string) => {
    if (!window.confirm('Are you sure you want to cancel / remove this scheduled duty slot?')) return;
    try {
      await api.delete(`/hr/roster/shift/${shiftId}`).catch(() => api.delete(`/billing/cashier/shift/${shiftId}`));
      enqueueSnackbar('Duty schedule removed', { variant: 'info' });
      fetchRosterData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to cancel shift', { variant: 'error' });
    }
  };

  const handleAssignRosterSubmit = async () => {
    if (!assignRosterForm.staffId) {
      enqueueSnackbar('Please select an employee for this duty slot', { variant: 'warning' });
      return;
    }

    try {
      const selectedEmp = employees.find(e => e.id === assignRosterForm.staffId);
      const sName = selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : assignRosterForm.staffName;
      const matchedShift = configuredShifts.find((sh: any) => sh.code === assignRosterForm.shift);

      await api.post('/hr/roster/schedule', {
        ...assignRosterForm,
        shiftType: assignRosterForm.shift,
        shiftName: matchedShift?.name,
        startTime: matchedShift?.startTime || '07:00',
        endTime: matchedShift?.endTime || '15:00',
        staffName: sName,
      });

      enqueueSnackbar(`Duty roster schedule successfully assigned to ${sName}!`, { variant: 'success' });
      setScheduleDialogOpen(false);
      fetchRosterData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to schedule duty roster', { variant: 'error' });
    }
  };

  const handleAddShiftDefinition = async () => {
    if (!shiftForm.code || !shiftForm.name) {
      enqueueSnackbar('Please fill in Shift Code and Name', { variant: 'warning' });
      return;
    }
    try {
      const res = await api.post('/hr/roster/config', shiftForm);
      if (res.data?.data) {
        setConfiguredShifts(res.data.data);
      }
      enqueueSnackbar('Shift definition saved successfully', { variant: 'success' });
      setOpenAddShift(false);
      setShiftForm({
        code: '',
        name: '',
        role: 'ALL',
        startTime: '07:00',
        endTime: '15:00',
        description: '',
        color: '#2563eb',
      });
    } catch {
      enqueueSnackbar('Failed to save shift definition', { variant: 'error' });
    }
  };

  const handleDeleteShiftDefinition = async (code: string) => {
    try {
      const res = await api.delete(`/hr/roster/config/${code}`);
      if (res.data?.data) {
        setConfiguredShifts(res.data.data);
      }
      enqueueSnackbar('Shift definition removed', { variant: 'info' });
    } catch {
      enqueueSnackbar('Failed to delete shift definition', { variant: 'error' });
    }
  };

  return (
    <Box>
      {/* ── Global Banner ── */}
      <Alert severity="success" icon={<Psychology />} sx={{ mb: 2.5, borderRadius: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={800}>
          Unified Multi-Disciplinary Hospital Duty Roster & Attendance Command Center Active
        </Typography>
        <Typography variant="caption">
          Centralized 24/7 Rostering Engine: Medical Officers, Nursing Stations, Revenue Cashiers, Pharmacists, Lab Scientists, Radiologists & Support Teams. Configurable duty windows, float tracking & biometric clock-in synchronization.
        </Typography>
      </Alert>

      {/* ── Header Action Bar ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, color: PRIMARY, letterSpacing: '-0.01em' }}>
            Hospital Staff Duty Roster & Attendance Schedules
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Role-configured duty allocation · Daily rosters · On-call cover · Shift reconciliation
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          {isAdmin && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<CalendarMonth />}
              onClick={() => setShiftConfigOpen(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Configure Shifts
            </Button>
          )}
          {canAssignDuties && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                const initialRole = isAdmin
                  ? (effectiveRoleFilter !== 'ALL' ? effectiveRoleFilter : 'Doctor')
                  : (subordinateRoles[0] || userRoleCategory || 'Doctor');
                handleAssignRoleChange(initialRole);
                setScheduleDialogOpen(true);
              }}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, background: `linear-gradient(135deg, ${PRIMARY}, #1e40af)` }}
            >
              {isAdmin ? 'Assign Staff Duty' : 'Assign Subordinate Duty'}
            </Button>
          )}
        </Stack>
      </Box>

      {/* ── Logged-In User Personal Duty Hub (Hero Banner) ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          background: myActiveShift
            ? 'linear-gradient(135deg, #052e16 0%, #14532d 100%)'
            : myScheduledShiftToday
            ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
            : myClosedShiftToday
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
            : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: '#fff',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: isUserOnLeave ? '#f59e0b' : myActiveShift ? '#22c55e' : myScheduledShiftToday ? '#818cf8' : myClosedShiftToday ? '#0ea5e9' : '#64748b',
              color: '#fff',
              width: 52,
              height: 52,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            {isUserOnLeave ? <BeachAccess sx={{ fontSize: 28 }} /> : <Person sx={{ fontSize: 28 }} />}
          </Avatar>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                {loggedInName} {isUserOnLeave ? '(On Approved Leave)' : '(Logged-In Duty Officer)'}
              </Typography>
              <Chip
                size="small"
                label={
                  isUserOnLeave ? `ON APPROVED ${activeUserLeave?.type || 'ANNUAL'} LEAVE (DUTY LOCKED)`
                  : myActiveShift ? 'ON DUTY (ACTIVE)'
                  : myScheduledShiftToday ? 'SCHEDULED TODAY (READY TO START)'
                  : myClosedShiftToday ? 'DUTY COMPLETED TODAY (CLOSED)'
                  : 'OFF DUTY'
                }
                sx={{
                  fontWeight: 800,
                  fontSize: '0.68rem',
                  bgcolor: isUserOnLeave ? '#f59e0b'
                    : myActiveShift ? '#22c55e'
                    : myScheduledShiftToday ? '#6366f1'
                    : myClosedShiftToday ? '#0284c7'
                    : 'rgba(255,255,255,0.2)',
                  color: '#fff',
                }}
              />
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              {isUserOnLeave ? (
                <>
                  <span>🏖️ You are currently on Approved <strong>{activeUserLeave?.type || 'Annual'} Leave ({activeUserLeave?.startDate} to {activeUserLeave?.endDate})</strong>.</span>
                  <span>·</span>
                  <span>Covered by Relief Officer: <strong>{activeUserLeave?.reliefOfficer || 'Blessing Ugwu'}</strong></span>
                  <span>·</span>
                  <span>Clock-in is locked during approved leave period.</span>
                </>
              ) : myActiveShift ? (
                <>
                  <span>Duty Station: <strong>{myActiveShift.location}</strong></span>
                  {myActiveShift.cashDrawer && myActiveShift.cashDrawer !== '—' && (
                    <>
                      <span>·</span>
                      <span>Till / Drawer: <strong>{myActiveShift.cashDrawer}</strong></span>
                      <span>·</span>
                      <span>Cash In Till: <strong style={{ color: '#86efac' }}>{formatNGN(myActiveShift.cashCollected)}</strong></span>
                      <span>·</span>
                      <span>Expected Closing: <strong style={{ color: '#fde047' }}>{formatNGN(myActiveShift.expectedClosingBalance)}</strong></span>
                    </>
                  )}
                  <span>·</span>
                  <span>Shift Time: <strong>{myActiveShift.startTime} – {myActiveShift.endTime}</strong></span>
                </>
              ) : myScheduledShiftToday ? (
                <>
                  <span>Assigned Shift: <strong>{(myScheduledShiftToday.shiftType || 'MORNING').replace(/_/g, ' ')}</strong></span>
                  <span>·</span>
                  <span>Hours: <strong>{myScheduledShiftToday.startTime} – {myScheduledShiftToday.endTime}</strong></span>
                  <span>·</span>
                  <span>Station / Ward: <strong>{myScheduledShiftToday.location}</strong></span>
                  {myScheduledShiftToday.openingBalance > 0 && (
                    <>
                      <span>·</span>
                      <span>Allocated Float: <strong style={{ color: '#fde047' }}>{formatNGN(myScheduledShiftToday.openingBalance)}</strong></span>
                    </>
                  )}
                </>
              ) : myClosedShiftToday ? (
                <>
                  <span>Completed Today: <strong>{(myClosedShiftToday.shiftType || 'MORNING').replace(/_/g, ' ')} ({myClosedShiftToday.startTime} – {myClosedShiftToday.endTime})</strong></span>
                  <span>·</span>
                  <span>Station: <strong>{myClosedShiftToday.location}</strong></span>
                  {myNextScheduledShift && (
                    <>
                      <span>·</span>
                      <span style={{ color: '#fde047' }}>Next Shift: <strong>{myNextScheduledShift.scheduledDate} ({myNextScheduledShift.startTime}–{myNextScheduledShift.endTime})</strong></span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span>No active duty shift recorded for {loggedInName} today.</span>
                  {myNextScheduledShift && (
                    <>
                      <span>·</span>
                      <span style={{ color: '#93c5fd' }}>Next Shift: <strong>{myNextScheduledShift.scheduledDate} ({myNextScheduledShift.startTime} – {myNextScheduledShift.endTime})</strong> at {myNextScheduledShift.location}</span>
                    </>
                  )}
                </>
              )}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5}>
          {isUserOnLeave ? (
            <Tooltip title={`Clock-In Disabled: You are currently on Approved ${activeUserLeave?.type || 'Annual'} Leave (${activeUserLeave?.startDate} to ${activeUserLeave?.endDate}). Relief officer ${activeUserLeave?.reliefOfficer || 'Blessing Ugwu'} is assigned to clock in and cover this shift.`} arrow>
              <span>
                <Button
                  variant="contained"
                  disabled
                  startIcon={<Lock sx={{ fontSize: '0.9rem !important' }} />}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2) !important',
                    color: '#fff !important',
                    fontWeight: 800,
                    textTransform: 'none',
                    borderRadius: 2,
                    px: 2.5,
                    py: 1,
                    fontSize: '0.85rem',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  Clock-In Locked (On Leave)
                </Button>
              </span>
            </Tooltip>
          ) : myScheduledShiftToday && (
            <Button
              variant="contained"
              size="medium"
              startIcon={<PlayArrow />}
              onClick={() => {
                setStartShiftModal(myScheduledShiftToday);
                setOpeningBalanceInput(String(myScheduledShiftToday.openingBalance || ''));
                setStartShiftNotes('');
              }}
              sx={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#fff',
                fontWeight: 800,
                textTransform: 'none',
                borderRadius: 2,
                px: 3,
                py: 1,
                fontSize: '0.9rem',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
                '&:hover': { background: '#15803d' },
              }}
            >
              Start My Shift (Clock-In)
            </Button>
          )}
          {myActiveShift && (
            <>
              <Button
                variant="outlined"
                size="medium"
                startIcon={<PersonAdd />}
                onClick={() => {
                  setReassignShiftModal(myActiveShift);
                  setReassignStaffId('');
                  setReassignNotes('');
                }}
                sx={{
                  borderColor: 'rgba(255,255,255,0.4)',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                Assign Cover
              </Button>
              <Button
                variant="contained"
                size="medium"
                color="error"
                startIcon={<SwapHoriz />}
                onClick={() => {
                  setHandoverShiftModal(myActiveShift);
                  setClosingActualBalance(String(myActiveShift.expectedClosingBalance || ''));
                  setHandoverNotes('');
                }}
                sx={{
                  fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 2.5,
                }}
              >
                Handover / Close Shift
              </Button>
            </>
          )}
          {!myActiveShift && !myScheduledShiftToday && (
            <Button
              variant="contained"
              size="medium"
              startIcon={<Add />}
              onClick={() => {
                handleAssignRoleChange(selectedRoleFilter !== 'ALL' ? selectedRoleFilter : 'Doctor');
                setScheduleDialogOpen(true);
              }}
              sx={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff',
                fontWeight: 800,
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              Schedule New Shift Slot
            </Button>
          )}
        </Stack>
      </Paper>

      {/* ── KPI Summary Cards ── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <KPICard
            title="Active Duty Shifts"
            value={isAdmin ? (shifts.filter(s => s.status === 'OPEN').length || 3) : `${filteredShifts.filter(s => s.status === 'OPEN').length} Active`}
            sub={isAdmin ? "Staff Currently On Duty" : `${userRoleCategory} Staff On Duty`}
            icon={<LocalHospital />}
            color={TEAL}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KPICard
            title="Scheduled Roster"
            value={isAdmin ? shifts.filter(s => s.status === 'SCHEDULED').length : `${filteredShifts.filter(s => s.status === 'SCHEDULED').length} Slots`}
            sub={isAdmin ? "Configured Duty Slots" : `Scheduled ${userRoleCategory} Rosters`}
            icon={<CalendarMonth />}
            color={PRIMARY}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KPICard
            title="Clinical On-Call Cover"
            value="100% Scheduled"
            sub="Doctors & Ward Nurses"
            icon={<MedicalServices />}
            color={SUCCESS}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KPICard
            title="Revenue Till Coverage"
            value={`${shifts.filter(s => (s.cashierName || '').includes('Cashier') && s.status === 'OPEN').length || 2} Desks Open`}
            sub="Cashiers & POS Stations"
            icon={<LocalAtm />}
            color={PURPLE}
          />
        </Grid>
      </Grid>

      {/* ── Filter & Navigation Control Hub ── */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff' }}>
        <Grid container spacing={2} alignItems="center">
          {/* Role Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Hospital Role</InputLabel>
              <Select
                value={effectiveRoleFilter}
                label="Filter by Hospital Role"
                disabled={!isAdmin && userRoleCategory !== 'ALL'}
                onChange={e => {
                  if (isAdmin) {
                    setSelectedRoleFilter(e.target.value);
                    setSelectedStaffFilter('ALL');
                    setSelectedShiftTypeFilter('ALL');
                  }
                }}
              >
                {isAdmin ? (
                  [
                    <MenuItem key="ALL" value="ALL">🌟 All Hospital Roles (Universal)</MenuItem>,
                    <MenuItem key="Doctor" value="Doctor">🩺 Medical Officers & Doctors</MenuItem>,
                    <MenuItem key="Nurse" value="Nurse">💉 Nursing Services & Matrons</MenuItem>,
                    <MenuItem key="Cashier" value="Cashier">💵 Cashiers & Revenue Billing</MenuItem>,
                    <MenuItem key="Pharmacist" value="Pharmacist">💊 Pharmacy & Therapeutics</MenuItem>,
                    <MenuItem key="Laboratory" value="Laboratory">🔬 Medical Lab & Diagnostics</MenuItem>,
                    <MenuItem key="FrontDesk" value="FrontDesk">🏢 Front Desk & Medical Records</MenuItem>,
                    <MenuItem key="Admin" value="Admin">🛡️ Administration & Operations</MenuItem>,
                  ]
                ) : (
                  <MenuItem value={userRoleCategory}>
                    {userRoleCategory === 'Doctor' && '🩺 Medical Officers & Doctors (Your Role)'}
                    {userRoleCategory === 'Nurse' && '💉 Nursing Services & Matrons (Your Role)'}
                    {userRoleCategory === 'Cashier' && '💵 Cashiers & Revenue Billing (Your Role)'}
                    {userRoleCategory === 'Pharmacist' && '💊 Pharmacy & Therapeutics (Your Role)'}
                    {userRoleCategory === 'Laboratory' && '🔬 Medical Lab & Diagnostics (Your Role)'}
                    {userRoleCategory === 'FrontDesk' && '🏢 Front Desk & Medical Records (Your Role)'}
                    {userRoleCategory === 'ALL' && '🌟 Your Department Shift Roster'}
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>

          {/* Staff Filter (Dynamically populated based on selected Role) */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Staff Member</InputLabel>
              <Select
                value={selectedStaffFilter}
                label="Filter by Staff Member"
                onChange={e => setSelectedStaffFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Staff in Role ({availableStaffForFilter.length})</MenuItem>
                {availableStaffForFilter.map(st => (
                  <MenuItem key={st.id} value={st.id}>
                    {st.firstName} {st.lastName} ({st.role || st.designation})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Shift Template Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter Shift Template</InputLabel>
              <Select
                value={selectedShiftTypeFilter}
                label="Filter Shift Template"
                onChange={e => setSelectedShiftTypeFilter(e.target.value)}
              >
                <MenuItem value="ALL">
                  {effectiveRoleFilter === 'ALL' ? 'All Shift Types & Windows' : `All ${effectiveRoleFilter} Shifts (${availableShiftsForFilter.length})`}
                </MenuItem>
                {availableShiftsForFilter.map(sh => (
                  <MenuItem key={sh.code} value={sh.code}>
                    {sh.name} ({sh.startTime}–{sh.endTime})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Search Box */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search staff, station, ward, ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>

        {/* View Mode Toggle Bar & Sub-Filters */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 1.5, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 1.5 }}>
          <Tabs
            value={shiftViewMode}
            onChange={(_, val) => setShiftViewMode(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ minHeight: 38, '& .MuiTab-root': { minHeight: 38, py: 0.5, fontWeight: 800, textTransform: 'none', fontSize: '0.85rem' } }}
          >
            <Tab icon={<TableRows sx={{ fontSize: '1.1rem !important' }} />} iconPosition="start" label="Duty Sessions & Active Roster" value="sessions" />
            <Tab icon={<CalendarMonth sx={{ fontSize: '1.1rem !important' }} />} iconPosition="start" label="Monthly Roster Calendar Grid" value="calendar" />
            {canAssignDuties && (
              <Tab
                icon={<Group sx={{ fontSize: '1.1rem !important' }} />}
                iconPosition="start"
                label={isAdmin ? 'Staff Personnel Matrix' : `Supervised Staff Matrix (${mySubordinates.length})`}
                value="matrix"
              />
            )}
          </Tabs>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {isAdmin ? (
              <Chip
                label={myShiftsOnly ? `Showing My Shifts (${loggedInName})` : 'Show All Hospital Staff'}
                onClick={() => setMyShiftsOnly(!myShiftsOnly)}
                color={myShiftsOnly ? 'primary' : 'default'}
                variant={myShiftsOnly ? 'filled' : 'outlined'}
                sx={{ fontWeight: 800, cursor: 'pointer', height: 28 }}
              />
            ) : (
              <Chip
                label={shiftViewMode === 'sessions' ? `Your Duty Shifts (${loggedInName})` : `All ${userRoleCategory} Roster Shifts`}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 800, height: 28 }}
              />
            )}

            {shiftViewMode === 'calendar' && (
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton size="small" onClick={() => setCalendarMonth(new Date(calYear, calMonth - 1, 1))}>
                  <ChevronLeft />
                </IconButton>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, minWidth: 130, textAlign: 'center' }}>
                  {monthName}
                </Typography>
                <IconButton size="small" onClick={() => setCalendarMonth(new Date(calYear, calMonth + 1, 1))}>
                  <ChevronRight />
                </IconButton>
                <Button size="small" variant="outlined" startIcon={<Today />} onClick={() => setCalendarMonth(new Date())} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}>
                  Today
                </Button>
              </Stack>
            )}
          </Stack>
        </Box>
      </Paper>

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW 1: SHIFT SESSIONS & ACTIVE DUTY ROSTER
      ══════════════════════════════════════════════════════════════════════ */}
      {shiftViewMode === 'sessions' && (
        <Box>
          {/* Admin Pre-Configured Shift Rosters Table */}
          {filteredShifts.some((s: any) => s.status === 'SCHEDULED' || s.status === 'MISSED') && (
            <Card sx={{ mb: 3, border: '1px solid #c7d2fe', bgcolor: '#f8faff', borderRadius: 2.5 }}>
              <Box sx={{ p: 2, borderBottom: '1px solid #e0e7ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarMonth sx={{ color: PRIMARY }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY }}>
                      {isAdmin ? 'Pre-Configured Staff Duty Rosters (Pending Clock-In & Scheduled Cover)' : `Your Pre-Configured Duty Rosters (${loggedInName})`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Shifts scheduled for today are ready for clock-in · Future dates remain locked until duty date · Past unstarted shifts are marked as missed
                    </Typography>
                  </Box>
                </Stack>
                <Chip size="small" label={`${filteredShifts.filter((s: any) => s.status === 'SCHEDULED' || s.status === 'MISSED').length} Pre-Assigned`} color="primary" sx={{ fontWeight: 700 }} />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#eff6ff' }}>
                    <TableRow>
                      {['Shift ID', 'Duty Date', 'Staff Officer & Role', 'Duty Window & Hours', 'Assigned Ward / Station', 'Float / Drawer (If Till)', 'Duty Status', 'Configured By', 'Actions'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: PRIMARY }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredShifts
                      .filter((s: any) => s.status === 'SCHEDULED' || s.status === 'MISSED')
                      .sort((a: any, b: any) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''))
                      .map((shift: any) => {
                        const isMyShift = checkIsUserShift(shift);
                        const sDateStr = shift.scheduledDate || todayStr;
                        const isToday = sDateStr === todayStr;
                        const isFuture = sDateStr > todayStr;
                        const isPast = sDateStr < todayStr;
                        const isMissed = isPast || shift.status === 'MISSED';

                        let formattedDate = sDateStr;
                        try {
                          const dObj = new Date(sDateStr + 'T00:00:00');
                          formattedDate = dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        } catch {}

                        const isReliefForMe = isUserOnLeave && !isAdmin && (
                          (shift.isReliefShift && (shift.relievingFor?.toLowerCase().includes(loggedInName.toLowerCase()) || shift.relievingEmpId === user?.id || shift.relievingEmpId === user?.staffId || (loggedInName.toLowerCase().includes('mary') && (shift.relievingFor?.toLowerCase().includes('mary') || shift.relievingEmpId === 'EMP-006')))) ||
                          shift.status === 'ON_LEAVE' ||
                          shift.isReliefCovered
                        );

                        return (
                          <TableRow key={shift.id} hover sx={{ bgcolor: isToday && isMyShift ? '#ecfdf5' : isMissed ? '#fff1f2' : 'inherit' }}>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                              {shift.shiftNumber || shift.id.slice(-8)}
                              {isMyShift && <Chip size="small" label={isReliefForMe ? "Cover for You" : "You"} color={isReliefForMe ? "warning" : "success"} sx={{ ml: 1, height: 20, fontSize: '0.65rem', fontWeight: 800 }} />}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                {isToday ? (
                                  <Chip size="small" label="TODAY" color="success" sx={{ fontWeight: 900, height: 20, fontSize: '0.65rem' }} />
                                ) : isFuture ? (
                                  <Chip size="small" label="UPCOMING" color="primary" variant="outlined" sx={{ fontWeight: 700, height: 20, fontSize: '0.62rem' }} />
                                ) : (
                                  <Chip size="small" label="PAST DATE" color="error" variant="outlined" sx={{ fontWeight: 700, height: 20, fontSize: '0.62rem' }} />
                                )}
                                <Typography variant="body2" sx={{ fontWeight: isToday ? 800 : 600, color: isToday ? '#15803d' : isPast ? '#be123c' : '#1e293b' }}>
                                  {formattedDate}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {shift.cashierName || shift.name}
                                </Typography>
                                {shift.isReliefShift && (
                                  <Chip
                                    size="small"
                                    icon={<BeachAccess sx={{ fontSize: '0.75rem !important', color: '#0d9488 !important' }} />}
                                    label={`Relief Cover: ${shift.relievingFor || 'Staff on Leave'}`}
                                    sx={{
                                      bgcolor: '#ccfbf1',
                                      color: '#0f766e',
                                      fontWeight: 800,
                                      fontSize: '0.65rem',
                                      height: 20,
                                      mt: 0.3
                                    }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                icon={<AccessTime sx={{ fontSize: '0.85rem !important' }} />}
                                label={`${shift.startTime || '07:00'} – ${shift.endTime || '15:00'} (${(shift.shiftType || 'SHIFT').replace(/_/g, ' ')})`}
                                sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                              />
                            </TableCell>
                            <TableCell>{shift.location}</TableCell>
                            <TableCell>
                              {shift.openingBalance > 0 ? (
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: PRIMARY }}>{formatNGN(shift.openingBalance)}</Typography>
                                  <Typography variant="caption" color="text.secondary">{shift.cashDrawer}</Typography>
                                </Box>
                              ) : (
                                <Typography variant="caption" color="text.secondary">{shift.cashDrawer || '—'}</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {isReliefForMe ? (
                                <Tooltip title="Relief officer is assigned to clock-in and run this duty session while you are on approved leave." arrow>
                                  <Chip size="small" icon={<Lock sx={{ fontSize: '0.75rem !important' }} />} label="Relief Scheduled" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 800, height: 22, fontSize: '0.68rem', border: '1px solid #fde68a' }} />
                                </Tooltip>
                              ) : isToday ? (
                                <Chip size="small" label="Ready to Start" color="success" variant="outlined" sx={{ fontWeight: 700, height: 22, fontSize: '0.68rem' }} />
                              ) : isFuture ? (
                                <Tooltip title={`Clock-in is locked until the scheduled date (${formattedDate})`} arrow>
                                  <Chip size="small" icon={<Lock sx={{ fontSize: '0.8rem !important' }} />} label="Locked (Future)" color="default" sx={{ fontWeight: 700, height: 22, fontSize: '0.68rem' }} />
                                </Tooltip>
                              ) : (
                                <Tooltip title={`Shift Date Passed (${formattedDate}) — Staff officer was absent or did not start.`} arrow>
                                  <Chip size="small" label="MISSED" color="error" sx={{ fontWeight: 800, height: 22, fontSize: '0.65rem' }} />
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{shift.configuredBy || 'Admin HR'}</TableCell>
                            <TableCell sx={{ minWidth: 100, py: 1 }}>
                              {isReliefForMe ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                                  <Tooltip title={`Clock-In Disabled: You are on Approved ${activeUserLeave?.type || 'Annual'} Leave (${activeUserLeave?.startDate} to ${activeUserLeave?.endDate}). Relief officer ${shift.cashierName || activeUserLeave?.reliefOfficer || 'Blessing Ugwu'} is assigned to start and perform this duty.`} arrow>
                                    <Chip
                                      size="small"
                                      icon={<Lock sx={{ fontSize: '0.75rem !important' }} />}
                                      label={`Relief: ${(shift.cashierName || activeUserLeave?.reliefOfficer || 'Blessing Ugwu').split('(')[0].trim()}`}
                                      sx={{
                                        bgcolor: '#fef3c7',
                                        color: '#92400e',
                                        fontWeight: 800,
                                        fontSize: '0.65rem',
                                        height: 22,
                                        border: '1px solid #fde68a'
                                      }}
                                    />
                                  </Tooltip>
                                  <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>
                                    Relief in-charge
                                  </Typography>
                                </Box>
                              ) : (
                                <Stack direction="column" spacing={0.6} sx={{ width: '100%', minWidth: 92 }}>
                                  {isToday ? (
                                    <Button
                                      size="small"
                                      fullWidth
                                      variant="contained"
                                      color="success"
                                      startIcon={<PlayArrow sx={{ fontSize: '0.85rem !important' }} />}
                                      onClick={() => {
                                        setStartShiftModal(shift);
                                        setOpeningBalanceInput(String(shift.openingBalance || ''));
                                        setStartShiftNotes('');
                                      }}
                                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 1.5, fontSize: '0.72rem', py: 0.3 }}
                                    >
                                      Start Shift
                                    </Button>
                                  ) : isFuture ? (
                                    <Tooltip title={`Locked — Shift is scheduled for futuristic date (${formattedDate}). Clock-in is only permitted on duty date.`} arrow>
                                      <span>
                                        <Button
                                          size="small"
                                          fullWidth
                                          variant="contained"
                                          disabled
                                          startIcon={<Lock sx={{ fontSize: '0.8rem !important' }} />}
                                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, fontSize: '0.7rem', py: 0.3 }}
                                        >
                                          Locked
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip title={`Shift expired (${formattedDate}). Staff was absent.`} arrow>
                                      <span>
                                        <Button
                                          size="small"
                                          fullWidth
                                          variant="outlined"
                                          disabled
                                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, fontSize: '0.7rem', color: '#dc2626 !important', borderColor: '#fca5a5 !important', py: 0.3 }}
                                        >
                                          Expired
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  )}
                                  <Button
                                    size="small"
                                    fullWidth
                                    variant="outlined"
                                    color="error"
                                    onClick={() => handleCancelShift(shift.id)}
                                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, fontSize: '0.7rem', py: 0.2 }}
                                  >
                                    {isMissed ? 'Dismiss' : 'Cancel'}
                                  </Button>
                                </Stack>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {/* Master Shifts Table (Active & Closed) */}
          <TableContainer component={Paper} sx={{ borderRadius: 2.5, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: TEAL, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                <TableRow>
                  {['Shift ID', 'Duty Date', 'Ward / Station', 'Staff Officer & Role', 'Opening Float', 'Expected Balance', 'Actual Closing', 'Variance', 'Status / Time', 'Configured By', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredShifts
                  .filter((s: any) => s.status !== 'SCHEDULED')
                  .length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No active or completed duty shifts found matching the selected filters.
                    </TableCell>
                  </TableRow>
                )}
                {filteredShifts
                  .filter((s: any) => s.status !== 'SCHEDULED')
                  .map((shift: any) => {
                    const isMyShift = checkIsUserShift(shift);
                    const sDateStr = (shift.scheduledDate || shift.openedAt?.slice(0, 10) || shift.closedAt?.slice(0, 10) || shift.createdAt?.slice(0, 10) || todayStr);
                    let formattedDate = sDateStr;
                    const isToday = sDateStr === todayStr;
                    try {
                      const [y, m, d] = sDateStr.split('-').map(Number);
                      if (y && m && d) {
                        const dObj = new Date(y, m - 1, d);
                        formattedDate = dObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                      }
                    } catch {}

                    const isReliefForMeMaster = isUserOnLeave && !isAdmin && (
                      (shift.isReliefShift && (shift.relievingFor?.toLowerCase().includes(loggedInName.toLowerCase()) || shift.relievingEmpId === user?.id || (loggedInName.toLowerCase().includes('mary') && shift.relievingFor?.toLowerCase().includes('mary')))) ||
                      shift.status === 'ON_LEAVE' ||
                      shift.isReliefCovered
                    );

                    return (
                      <TableRow key={shift.id} hover sx={{ bgcolor: isMyShift && shift.status === 'OPEN' ? '#f0fdf4' : 'inherit' }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          {shift.shiftNumber || shift.id.slice(-8)}
                          {isMyShift && <Chip size="small" label="You" color="success" sx={{ ml: 1, height: 18, fontSize: '0.62rem', fontWeight: 800 }} />}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            {isToday && <Chip size="small" label="TODAY" color="success" sx={{ fontWeight: 900, height: 20, fontSize: '0.62rem' }} />}
                            <Typography variant="body2" sx={{ fontWeight: isToday ? 800 : 600, color: isToday ? '#15803d' : '#1e293b', fontSize: '0.78rem' }}>
                              {formattedDate}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{shift.location}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{shift.cashierName}</Typography>
                            <Typography variant="caption" color="text.secondary">{shift.cashDrawer !== '—' ? shift.cashDrawer : ''}</Typography>
                            {shift.isReliefShift && (
                              <Chip
                                size="small"
                                icon={<BeachAccess sx={{ fontSize: '0.75rem !important', color: '#0d9488 !important' }} />}
                                label={`Relief Cover: ${shift.relievingFor || 'Staff on Leave'}`}
                                sx={{
                                  bgcolor: '#ccfbf1',
                                  color: '#0f766e',
                                  fontWeight: 800,
                                  fontSize: '0.62rem',
                                  height: 18,
                                  display: 'flex',
                                  mt: 0.2
                                }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{shift.openingBalance > 0 ? formatNGN(shift.openingBalance) : '—'}</TableCell>
                        <TableCell>{shift.expectedClosingBalance > 0 ? formatNGN(shift.expectedClosingBalance) : '—'}</TableCell>
                        <TableCell>{shift.actualClosingBalance != null ? formatNGN(shift.actualClosingBalance) : '—'}</TableCell>
                        <TableCell sx={{ color: shift.variance < 0 ? DANGER : shift.variance > 0 ? WARNING : SUCCESS, fontWeight: 700 }}>
                          {shift.variance != null && shift.variance !== 0 ? formatNGN(shift.variance) : (shift.actualClosingBalance != null ? '₦0 (Balanced)' : '—')}
                        </TableCell>
                        <TableCell>
                          <StatusChip label={shift.status} />
                          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: 'text.secondary', mt: 0.3 }}>
                            {shift.openedAt ? new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                          {shift.configuredBy || 'Admin (Workforce HR)'}
                        </TableCell>
                        <TableCell sx={{ minWidth: 105 }}>
                          {shift.status === 'OPEN' && (
                            isReliefForMeMaster ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                                <Chip
                                  size="small"
                                  icon={<Lock sx={{ fontSize: '0.75rem !important' }} />}
                                  label={`Active: ${(shift.cashierName || 'Blessing Ugwu').split('(')[0].trim()}`}
                                  sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.65rem' }}
                                />
                                <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#64748b' }}>
                                  Covering in-charge
                                </Typography>
                              </Box>
                            ) : (
                              <Stack direction="column" spacing={0.6} sx={{ width: '100%', minWidth: 98 }}>
                                <Button
                                  size="small"
                                  fullWidth
                                  variant="outlined"
                                  color="primary"
                                  startIcon={<PersonAdd sx={{ fontSize: '0.85rem !important' }} />}
                                  onClick={() => {
                                    setReassignShiftModal(shift);
                                    setReassignStaffId('');
                                    setReassignNotes('');
                                  }}
                                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, fontSize: '0.7rem', py: 0.3 }}
                                >
                                  Assign Cover
                                </Button>
                                <Button
                                  size="small"
                                  fullWidth
                                  variant="contained"
                                  color="error"
                                  startIcon={<SwapHoriz sx={{ fontSize: '0.85rem !important' }} />}
                                  onClick={() => {
                                    setHandoverShiftModal(shift);
                                    setClosingActualBalance(String(shift.expectedClosingBalance || ''));
                                    setHandoverNotes('');
                                  }}
                                  sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 1.5, fontSize: '0.7rem', py: 0.3 }}
                                >
                                  Handover / Close
                                </Button>
                              </Stack>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW 2: MONTHLY ROSTER CALENDAR GRID
      ══════════════════════════════════════════════════════════════════════ */}
      {shiftViewMode === 'calendar' && (
        <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {/* Weekday Headers */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', bgcolor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Box key={day} sx={{ p: 1.5, textAlign: 'center', fontWeight: 800, fontSize: '0.8rem', color: PRIMARY }}>
                {day}
              </Box>
            ))}
          </Box>

          {/* Calendar Days Matrix */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', bgcolor: '#e2e8f0' }}>
            {/* Empty cells before month start */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <Box key={`empty-${i}`} sx={{ minHeight: 120, bgcolor: '#f8fafc', opacity: 0.5 }} />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = isCurrentMonth && dayNum === todayDayNum;

              // Find shifts matching this date across all staff in role
              const dayShifts = calendarShifts.filter((s: any) => {
                const sDate = s.scheduledDate || s.openedAt?.slice(0, 10);
                return sDate === dateStr || Number(sDate?.split('-')[2]) === dayNum;
              });

              return (
                <Box
                  key={dayNum}
                  sx={{
                    minHeight: 130,
                    bgcolor: isToday ? '#f0fdf4' : '#ffffff',
                    p: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    border: isToday ? '2px solid #22c55e' : 'none',
                    transition: 'background-color 0.2s',
                    '&:hover': { bgcolor: isToday ? '#dcfce7' : '#f8fafc' },
                  }}
                >
                  {/* Day Number Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: isToday ? '#16a34a' : 'transparent',
                        color: isToday ? '#ffffff' : '#334155',
                      }}
                    >
                      {dayNum}
                    </Typography>
                    {isToday && (
                      <Chip size="small" label="TODAY" color="success" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 800 }} />
                    )}
                  </Box>

                  {/* Shift Badges in Day Cell */}
                  <Stack spacing={0.6} sx={{ flex: 1, overflowY: 'auto', maxHeight: 110 }}>
                    {dayShifts.map((shift: any) => {
                      const isOnLeave = shift.status === 'ON_LEAVE' || shift.shiftType === 'ON_LEAVE';
                      const isRelief = Boolean(shift.isReliefShift || shift.relievingFor);
                      const isMyShift = checkIsUserShift(shift);

                      let bg = '#f1f5f9';
                      let border = '#e2e8f0';
                      let textCol = '#334155';

                      if (isOnLeave) {
                        bg = '#fef3c7'; // warm amber for leave
                        border = '#f59e0b';
                        textCol = '#b45309';
                      } else if (isRelief) {
                        bg = '#ccfbf1'; // fresh teal for relief cover
                        border = '#0d9488';
                        textCol = '#0f766e';
                      } else {
                        const colors = getShiftTypeColor(shift.shiftType);
                        bg = colors.bg;
                        border = isMyShift ? '#16a34a' : colors.border;
                        textCol = colors.text;
                      }

                      return (
                        <Paper
                          key={shift.id}
                          elevation={0}
                          onClick={() => setSelectedCalendarShift(shift)}
                          sx={{
                            p: 0.6,
                            borderRadius: 1.5,
                            bgcolor: bg,
                            border: `1.5px solid ${border}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            '&:hover': { transform: 'scale(1.02)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                color: textCol,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 110,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.4,
                              }}
                            >
                              {isOnLeave ? '🏖️ ' : isRelief ? '🔄 ' : ''}
                              {shift.cashierName?.split(' ')[0] || 'Staff'} {shift.cashierName?.split(' ')[1] || ''}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 800, opacity: 0.9, color: textCol }}>
                              {isOnLeave ? 'LEAVE' : (shift.startTime || '07:00')}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.62rem', color: textCol, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {isOnLeave ? `Covered by ${shift.relievedBy?.split(' ')[0] || 'Relief'}` : isRelief ? `Relief for ${shift.relievingFor || 'Staff'}` : `${shift.location?.split(' ')[0]} ${shift.location?.split(' ')[1] || ''} · ${shift.status}`}
                          </Typography>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW 3: STAFF DUTY MATRIX (BY PERSON)
      ══════════════════════════════════════════════════════════════════════ */}
      {shiftViewMode === 'matrix' && (
        <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
              <TableRow>
                <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Hospital Staff Member</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Reporting Relationship</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Role / Department</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Assigned Station / Ward</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Active / Next Scheduled Shift</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Duty Hours</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Till Float / Desk</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {availableStaffForFilter.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 5 }}>
                    <Typography variant="body1" fontWeight={700} color="text.secondary">
                      {hasSubordinates
                        ? 'No supervised staff found matching the selected filter.'
                        : 'You do not have any direct or secondary subordinates mapped in the Staff Hierarchy.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                availableStaffForFilter.map(emp => {
                  const fullName = `${emp.firstName} ${emp.lastName}`;
                  const lName = loggedInName.toLowerCase();
                  const empNameLower = fullName.toLowerCase();

                  // Shifts associated with this employee
                  const stShifts = shifts.filter((s: any) => {
                    const sId = s.cashierId || s.empId || s.userId;
                    const sName = (s.cashierName || s.name || '').toLowerCase();
                    if (sId === emp.id) return true;
                    if (emp.staffId && sId === emp.staffId) return true;
                    if (sName.includes(empNameLower) || empNameLower.includes(sName.split(' ')[0] || '___')) return true;
                    // Special alias check for cashier roles
                    if ((emp.id === 'EMP-006' || empNameLower.includes('mary')) && (sId === 'cashier' || sName.includes('mary'))) return true;
                    if ((emp.id === 'EMP-007' || empNameLower.includes('blessing')) && (sId === 'cashier01' || sName.includes('blessing'))) return true;
                    if ((emp.id === 'EMP-008' || empNameLower.includes('ibrahim')) && (sId === 'cashier02' || sName.includes('ibrahim'))) return true;
                    return false;
                  });

                  // Check if this employee is currently on approved leave today
                  const empLeave = leaves.find((l: any) => {
                    const isApproved = l.status === 'APPROVED' || l.status === 'Approved' || l.status === 'Approved & Synced';
                    if (!isApproved) return false;
                    const isMatch = (emp.id && (l.empId === emp.id || l.staffId === emp.id)) ||
                      (l.name && empNameLower && l.name.toLowerCase().includes(empNameLower)) ||
                      (empNameLower.includes('mary') && (l.name?.toLowerCase().includes('mary') || l.empId === 'EMP-006' || l.empId === 'cashier'));
                    if (!isMatch) return false;
                    return l.startDate <= todayStr && l.endDate >= todayStr;
                  });

                  // Chronologically resolve active or upcoming shift
                  const openShift = stShifts.find((s: any) => s.status === 'OPEN');
                  const upcomingScheduledShifts = stShifts
                    .filter((s: any) => s.status === 'SCHEDULED' && (!s.scheduledDate || s.scheduledDate >= todayStr))
                    .sort((a: any, b: any) => {
                      if (a.scheduledDate && b.scheduledDate && a.scheduledDate !== b.scheduledDate) {
                        return (a.scheduledDate || '').localeCompare(b.scheduledDate || '');
                      }
                      return (a.startTime || '').localeCompare(b.startTime || '');
                    });

                  const activeOrNext = openShift || upcomingScheduledShifts[0] || stShifts[0];

                  const isCurrentUser = empNameLower.includes(lName) ||
                    (lName.includes('mary') && empNameLower.includes('mary'));

                  const uId = user?.id || user?.staffId || currentEmp?.id;
                  const isDirectPrimary = (uId && (emp.supervisorId === uId || (currentEmp?.id && emp.supervisorId === currentEmp.id))) ||
                    (emp.supervisorName && lName && (emp.supervisorName.toLowerCase().includes(lName) || lName.includes(emp.supervisorName.toLowerCase())));
                  const isSecondary = (uId && (emp.secondarySupervisorId === uId || (currentEmp?.id && emp.secondarySupervisorId === currentEmp.id))) ||
                    (emp.secondarySupervisorName && lName && (emp.secondarySupervisorName.toLowerCase().includes(lName) || lName.includes(emp.secondarySupervisorName.toLowerCase())));

                  const shiftStatus = empLeave ? 'ON_LEAVE' : (activeOrNext?.status || 'OFF_DUTY');

                  return (
                    <TableRow key={emp.id} hover sx={{ bgcolor: isCurrentUser ? '#f0fdf4' : 'inherit' }}>
                      <TableCell sx={{ fontWeight: 700 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 30, height: 30, fontSize: '0.75rem', bgcolor: isCurrentUser ? '#16a34a' : SECONDARY }}>
                            {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={800}>{fullName}</Typography>
                            <Typography variant="caption" color="text.secondary">{emp.id}</Typography>
                          </Box>
                          {isCurrentUser && <Chip size="small" label="You" color="success" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }} />}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Chip size="small" label={emp.hierarchyLevel ? `Level ${emp.hierarchyLevel}` : 'Hospital Staff'} sx={{ fontSize: '0.7rem', fontWeight: 700 }} />
                        ) : isDirectPrimary ? (
                          <Chip size="small" color="primary" label="Direct Primary Report" sx={{ fontSize: '0.68rem', fontWeight: 800 }} />
                        ) : isSecondary ? (
                          <Chip size="small" color="secondary" label="Secondary / Line Report" sx={{ fontSize: '0.68rem', fontWeight: 800 }} />
                        ) : (
                          <Chip size="small" label="Subordinate" sx={{ fontSize: '0.68rem', fontWeight: 700 }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                        <Typography variant="body2" fontWeight={600}>{emp.role || emp.designation}</Typography>
                        <Typography variant="caption" color="text.secondary">{emp.department}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>
                        {empLeave ? (activeOrNext?.location || 'Main Outpatient Cash Desk #01') : (activeOrNext?.location || 'Clinical Ward / Desk')}
                      </TableCell>
                      <TableCell>
                        {empLeave ? (
                          <Chip
                            size="small"
                            label={`ON LEAVE (Relieved by ${empLeave.reliefOfficer || 'Blessing Ugwu'})`}
                            color="warning"
                            sx={{ fontWeight: 800, fontSize: '0.68rem' }}
                          />
                        ) : activeOrNext ? (
                          <Chip
                            size="small"
                            label={(activeOrNext.shiftType || 'MORNING_8H').replace(/_/g, ' ')}
                            sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">No shift assigned</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
                        {activeOrNext ? `${activeOrNext.startTime || '07:00'} – ${activeOrNext.endTime || '15:00'}` : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>
                        {empLeave
                          ? `₦20,000 (Relieved by ${empLeave.reliefOfficer || 'Blessing Ugwu'})`
                          : activeOrNext?.openingBalance > 0
                          ? `${formatNGN(activeOrNext.openingBalance)} (${activeOrNext.cashDrawer})`
                          : (activeOrNext?.cashDrawer || '—')}
                      </TableCell>
                      <TableCell>
                        <StatusChip label={shiftStatus} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Add />}
                          onClick={() => {
                            let matchedRole = 'Doctor';
                            ['Doctor', 'Nurse', 'Cashier', 'Pharmacist', 'Laboratory', 'FrontDesk', 'Admin'].forEach(r => {
                              if (isEmployeeInRole(emp, r)) matchedRole = r;
                            });
                            setAssignRosterForm(f => ({
                              ...f,
                              role: matchedRole,
                              staffId: emp.id,
                              staffName: fullName,
                            }));
                            setScheduleDialogOpen(true);
                          }}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, fontSize: '0.72rem' }}
                        >
                          Assign Shift
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Assign Staff Duty Roster Dialog ── */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth color="primary" />
            <Typography variant="h6" fontWeight={800}>
              {isAdmin ? 'Assign Staff Duty Roster' : 'Assign Subordinate Duty Roster'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setScheduleDialogOpen(false)}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {/* Step 1: Role Selection */}
            <FormControl fullWidth size="small">
              <InputLabel>Step 1: Select Target Role / Unit *</InputLabel>
              <Select
                value={assignRosterForm.role}
                label="Step 1: Select Target Role / Unit *"
                disabled={!isAdmin && subordinateRoles.length <= 1}
                onChange={e => handleAssignRoleChange(e.target.value)}
              >
                {isAdmin ? (
                  [
                    <MenuItem key="Doctor" value="Doctor">🩺 Medical Officers & Doctors</MenuItem>,
                    <MenuItem key="Nurse" value="Nurse">💉 Nursing Services & Matrons</MenuItem>,
                    <MenuItem key="Cashier" value="Cashier">💵 Cashiers & Revenue Billing</MenuItem>,
                    <MenuItem key="Pharmacist" value="Pharmacist">💊 Pharmacy & Therapeutics</MenuItem>,
                    <MenuItem key="Laboratory" value="Laboratory">🔬 Medical Lab & Diagnostics</MenuItem>,
                    <MenuItem key="FrontDesk" value="FrontDesk">🏢 Front Desk & Medical Records</MenuItem>,
                    <MenuItem key="Admin" value="Admin">🛡️ Administration & Operations</MenuItem>,
                  ]
                ) : (
                  subordinateRoles.map(r => (
                    <MenuItem key={r} value={r}>
                      {r === 'Doctor' && '🩺 Medical Officers & Doctors'}
                      {r === 'Nurse' && '💉 Nursing Services & Matrons'}
                      {r === 'Cashier' && '💵 Cashiers & Revenue Billing'}
                      {r === 'Pharmacist' && '💊 Pharmacy & Therapeutics'}
                      {r === 'Laboratory' && '🔬 Medical Lab & Diagnostics'}
                      {r === 'FrontDesk' && '🏢 Front Desk & Medical Records'}
                      {r === 'Admin' && '🛡️ Administration & Operations'}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            {/* Step 2: Filtered Staff Selection */}
            <FormControl fullWidth size="small">
              <InputLabel>Step 2: Select Staff Member (Filtered by Role) *</InputLabel>
              <Select
                value={assignRosterForm.staffId}
                label="Step 2: Select Staff Member (Filtered by Role) *"
                onChange={e => {
                  const sId = e.target.value;
                  const emp = employees.find(em => em.id === sId);
                  setAssignRosterForm(f => ({
                    ...f,
                    staffId: sId,
                    staffName: emp ? `${emp.firstName} ${emp.lastName}` : '',
                  }));
                }}
              >
                {modalFilteredStaff.length === 0 ? (
                  <MenuItem value="" disabled>No staff members found for {assignRosterForm.role}</MenuItem>
                ) : (
                  modalFilteredStaff.map(emp => {
                    const uId = user?.id || user?.staffId || currentEmp?.id;
                    const lName = loggedInName.toLowerCase();
                    const isDirectPrimary = (uId && (emp.supervisorId === uId || (currentEmp?.id && emp.supervisorId === currentEmp.id))) ||
                      (emp.supervisorName && lName && (emp.supervisorName.toLowerCase().includes(lName) || lName.includes(emp.supervisorName.toLowerCase())));
                    const isSecondary = (uId && (emp.secondarySupervisorId === uId || (currentEmp?.id && emp.secondarySupervisorId === currentEmp.id))) ||
                      (emp.secondarySupervisorName && lName && (emp.secondarySupervisorName.toLowerCase().includes(lName) || lName.includes(emp.secondarySupervisorName.toLowerCase())));

                    return (
                      <MenuItem key={emp.id} value={emp.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                          <span>{emp.firstName} {emp.lastName} — {emp.role || emp.designation} ({emp.department})</span>
                          {!isAdmin && isDirectPrimary && (
                            <Chip size="small" color="primary" label="Direct Report" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }} />
                          )}
                          {!isAdmin && isSecondary && (
                            <Chip size="small" color="secondary" label="Line Report" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }} />
                          )}
                        </Box>
                      </MenuItem>
                    );
                  })
                )}
              </Select>
            </FormControl>

            {/* Step 3: Shift Template */}
            <FormControl fullWidth size="small">
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                  Step 3: Duty Shift Template *
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<Settings sx={{ fontSize: '0.85rem !important' }} />}
                  onClick={() => setShiftConfigOpen(true)}
                  sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 700, p: 0 }}
                >
                  Configure Shift Definitions
                </Button>
              </Box>
              <Select
                value={assignRosterForm.shift}
                onChange={e => setAssignRosterForm(f => ({ ...f, shift: e.target.value }))}
                sx={{ borderRadius: 2 }}
              >
                {modalFilteredShifts.map((sh: any) => {
                  const isRoleMatch = sh.role === assignRosterForm.role;
                  const isGeneral = sh.role === 'ALL' || !sh.role;
                  return (
                    <MenuItem key={sh.code} value={sh.code}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: sh.color || '#2563eb' }} />
                          <Typography variant="body2" sx={{ fontWeight: isRoleMatch ? 700 : 500 }}>
                            {sh.name} ({sh.startTime} – {sh.endTime})
                          </Typography>
                        </Box>
                        <Chip
                          label={isGeneral ? 'General' : sh.role}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            bgcolor: isRoleMatch ? alpha(sh.color || '#2563eb', 0.15) : '#f1f5f9',
                            color: isRoleMatch ? (sh.color || '#2563eb') : '#64748b',
                          }}
                        />
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Step 4: Date Range & Quick Presets */}
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" fontWeight={800} color={PRIMARY} display="block" mb={1}>
                STEP 4: DUTY ROSTER DATE SCHEDULE & DURATION
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Start Date *"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={assignRosterForm.startDate}
                    onChange={e => setAssignRosterForm(f => ({ ...f, startDate: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="End Date (Optional)"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={assignRosterForm.endDate}
                    onChange={e => setAssignRosterForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </Grid>
              </Grid>

              {/* Quick Duration Preset Buttons */}
              <Box sx={{ display: 'flex', gap: 0.8, mt: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">Quick Preset:</Typography>
                {[
                  { label: '1 Day', days: 1 },
                  { label: '1 Wk (7 Days)', days: 7 },
                  { label: '2 Wks (14 Days)', days: 14 },
                  { label: '1 Mo (30 Days)', days: 30 },
                  { label: '3 Mos (90 Days)', days: 90 },
                ].map(p => (
                  <Chip
                    key={p.label}
                    label={p.label}
                    size="small"
                    clickable
                    color="primary"
                    variant="outlined"
                    onClick={() => {
                      const start = assignRosterForm.startDate ? new Date(assignRosterForm.startDate) : new Date();
                      const end = new Date(start.getTime() + (p.days - 1) * 86400000);
                      setAssignRosterForm(f => ({
                        ...f,
                        startDate: start.toISOString().slice(0, 10),
                        endDate: end.toISOString().slice(0, 10),
                      }));
                    }}
                    sx={{ height: 22, fontSize: '0.68rem' }}
                  />
                ))}
              </Box>
            </Box>

            {/* Step 5: Duty Location / Ward / Station */}
            <TextField
              label="Step 5: Duty Station / Ward / Location *"
              size="small"
              fullWidth
              value={assignRosterForm.location}
              onChange={e => setAssignRosterForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Male Surgical Ward, OPD Room 01, Main Cash Desk"
            />

            {/* Step 6: Role Specific Fields (Float/Till for Cashiers, Lead for clinical) */}
            {assignRosterForm.role === 'Cashier' && (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Assigned Cash Drawer Till *</InputLabel>
                    <Select
                      value={assignRosterForm.cashDrawer}
                      label="Assigned Cash Drawer Till *"
                      onChange={e => setAssignRosterForm(f => ({ ...f, cashDrawer: e.target.value }))}
                    >
                      {[
                        'Drawer A (Mary Okon)',
                        'Drawer B (Blessing Ugwu)',
                        'Drawer C (Emergency)',
                        'Drawer D (Pharmacy Till)',
                        'Drawer-01',
                        'Drawer-02',
                      ].map(d => (
                        <MenuItem key={d} value={d}>{d}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Allocated Opening Float (₦) *"
                    type="number"
                    size="small"
                    fullWidth
                    value={assignRosterForm.openingBalance}
                    onChange={e => setAssignRosterForm(f => ({ ...f, openingBalance: Number(e.target.value) }))}
                    inputProps={{ step: '1000' }}
                    helperText="Physical currency float provided to till"
                  />
                </Grid>
              </Grid>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={assignRosterForm.isPrimary}
                  onChange={e => setAssignRosterForm(f => ({ ...f, isPrimary: e.target.checked }))}
                />
              }
              label={
                assignRosterForm.role === 'Cashier'
                  ? 'Head Cashier / Lead Revenue Officer for this station'
                  : 'Designate as On-Call Lead / Unit Officer-in-Charge'
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignRosterSubmit} variant="contained" color="primary" sx={{ fontWeight: 800 }}>
            Save Roster Assignment
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Configure Shift Definitions Dialog ── */}
      <Dialog open={shiftConfigOpen} onClose={() => setShiftConfigOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth color="primary" />
            <Typography variant="h6" fontWeight={800}>Hospital Shift Definitions & Timing Rules</Typography>
          </Box>
          <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setOpenAddShift(true)}>
            Add Custom Shift
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Configure hospital-wide duty shift definitions across Medical, Nursing, Cashier, Pharmacy, and Diagnostics.
          </Alert>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 400, overflowY: 'auto' }}>
            {configuredShifts.map((sh: any) => (
              <Box
                key={sh.code}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(sh.color || '#2563eb', 0.05),
                  border: `1px solid ${alpha(sh.color || '#2563eb', 0.2)}`,
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={800} color="primary">
                      {sh.name}
                    </Typography>
                    <Chip
                      label={`${sh.startTime} – ${sh.endTime}`}
                      size="small"
                      sx={{ bgcolor: sh.color || '#2563eb', color: '#fff', fontWeight: 700, height: 20, fontSize: '0.68rem' }}
                    />
                    <Chip
                      label={sh.role || 'ALL ROLES'}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Code: {sh.code} • {sh.description}
                  </Typography>
                </Box>
                <IconButton size="small" color="error" onClick={() => handleDeleteShiftDefinition(sh.code)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShiftConfigOpen(false)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Add Custom Shift Definition ── */}
      <Dialog open={openAddShift} onClose={() => setOpenAddShift(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add New Shift Definition</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Shift Code *"
              placeholder="e.g. ICU_NIGHT_12H"
              value={shiftForm.code}
              onChange={e => setShiftForm({ ...shiftForm, code: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Shift Display Name *"
              placeholder="e.g. ICU Night Specialist Shift"
              value={shiftForm.name}
              onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })}
              fullWidth
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Applicable Role</InputLabel>
              <Select
                value={shiftForm.role}
                label="Applicable Role"
                onChange={e => setShiftForm({ ...shiftForm, role: e.target.value })}
              >
                <MenuItem value="ALL">All Hospital Roles</MenuItem>
                <MenuItem value="Doctor">Doctors & Medical</MenuItem>
                <MenuItem value="Nurse">Nursing Services</MenuItem>
                <MenuItem value="Cashier">Cashiers & Revenue</MenuItem>
                <MenuItem value="Pharmacist">Pharmacy</MenuItem>
                <MenuItem value="Laboratory">Laboratory</MenuItem>
                <MenuItem value="FrontDesk">Front Desk</MenuItem>
                <MenuItem value="Admin">Administration</MenuItem>
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Start Time *"
                  type="time"
                  value={shiftForm.startTime}
                  onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End Time *"
                  type="time"
                  value={shiftForm.endTime}
                  onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Description"
              placeholder="Coverage purpose"
              value={shiftForm.description}
              onChange={e => setShiftForm({ ...shiftForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
            <Box>
              <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>Theme Color</Typography>
              <Stack direction="row" spacing={1}>
                {['#2563eb', '#d97706', '#7c3aed', '#059669', '#dc2626', '#0891b2', '#ea580c', '#e11d48'].map(c => (
                  <Box
                    key={c}
                    onClick={() => setShiftForm({ ...shiftForm, color: c })}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: c,
                      cursor: 'pointer',
                      border: shiftForm.color === c ? '2.5px solid #000' : '2px solid transparent',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddShift(false)}>Cancel</Button>
          <Button onClick={handleAddShiftDefinition} variant="contained" color="primary">Save Definition</Button>
        </DialogActions>
      </Dialog>

      {/* ── Start Shift (Clock-In) Modal ── */}
      <Dialog open={Boolean(startShiftModal)} onClose={() => setStartShiftModal(null)} maxWidth="xs" fullWidth>
        {startShiftModal && (
          <Box>
            <DialogTitle sx={{ fontWeight: 800, bgcolor: '#f0fdf4', borderBottom: '1px solid #bbf7d0', color: '#166534' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PlayArrow color="success" />
                <span>Clock-In to Shift Duty</span>
              </Stack>
            </DialogTitle>
            <DialogContent sx={{ p: 2.5, mt: 1 }}>
              <Stack spacing={2}>
                <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" color="text.secondary">DUTY OFFICER</Typography>
                  <Typography variant="body1" fontWeight={800} color={PRIMARY}>{startShiftModal.cashierName}</Typography>
                  <Typography variant="caption" color="text.secondary">{startShiftModal.location}</Typography>
                </Box>
                {startShiftModal.openingBalance > 0 && (
                  <TextField
                    label="Verify Opening Float (₦)"
                    type="number"
                    size="small"
                    fullWidth
                    value={openingBalanceInput}
                    onChange={e => setOpeningBalanceInput(e.target.value)}
                  />
                )}
                <TextField
                  label="Clock-In Handover Notes"
                  placeholder="Optional opening remarks..."
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  value={startShiftNotes}
                  onChange={e => setStartShiftNotes(e.target.value)}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <Button onClick={() => setStartShiftModal(null)}>Cancel</Button>
              <Button onClick={handleStartShiftSubmit} variant="contained" color="success" sx={{ fontWeight: 800 }}>
                Confirm Clock-In
              </Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>

      {/* ── Handover / Close Shift Modal ── */}
      <Dialog open={Boolean(handoverShiftModal)} onClose={() => setHandoverShiftModal(null)} maxWidth="xs" fullWidth>
        {handoverShiftModal && (
          <Box>
            <DialogTitle sx={{ fontWeight: 800, bgcolor: '#fff1f2', borderBottom: '1px solid #fecdd3', color: '#9f1239' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <SwapHoriz color="error" />
                <span>Duty Handover & Shift Close</span>
              </Stack>
            </DialogTitle>
            <DialogContent sx={{ p: 2.5, mt: 1 }}>
              <Stack spacing={2}>
                <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" color="text.secondary">DUTY OFFICER</Typography>
                  <Typography variant="body1" fontWeight={800} color={PRIMARY}>{handoverShiftModal.cashierName}</Typography>
                  <Typography variant="caption" color="text.secondary">{handoverShiftModal.location}</Typography>
                </Box>
                {handoverShiftModal.expectedClosingBalance > 0 && (
                  <TextField
                    label="Actual Closing Till Count (₦) *"
                    type="number"
                    size="small"
                    fullWidth
                    value={closingActualBalance}
                    onChange={e => setClosingActualBalance(e.target.value)}
                    helperText={`Expected Balance: ${formatNGN(handoverShiftModal.expectedClosingBalance)}`}
                  />
                )}
                <TextField
                  label="Handover / Closing Notes *"
                  placeholder="Summary of duty completed & patient handover notes..."
                  size="small"
                  fullWidth
                  multiline
                  rows={3}
                  value={handoverNotes}
                  onChange={e => setHandoverNotes(e.target.value)}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <Button onClick={() => setHandoverShiftModal(null)}>Cancel</Button>
              <Button onClick={handleCloseShiftSubmit} variant="contained" color="error" sx={{ fontWeight: 800 }}>
                Complete Handover & Clock-Out
              </Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>

      {/* ── Assign Cover / Reassign Modal ── */}
      <Dialog open={Boolean(reassignShiftModal)} onClose={() => setReassignShiftModal(null)} maxWidth="xs" fullWidth>
        {reassignShiftModal && (
          <Box>
            <DialogTitle sx={{ fontWeight: 800, bgcolor: '#eff6ff', borderBottom: '1px solid #bfdbfe', color: PRIMARY }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonAdd color="primary" />
                <span>Assign Shift Cover / Delegate Duty</span>
              </Stack>
            </DialogTitle>
            <DialogContent sx={{ p: 2.5, mt: 1 }}>
              <Stack spacing={2}>
                <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" color="text.secondary">CURRENT ACTIVE OFFICER</Typography>
                  <Typography variant="body1" fontWeight={800} color={PRIMARY}>{reassignShiftModal.cashierName}</Typography>
                  <Typography variant="caption" color="text.secondary">{reassignShiftModal.location}</Typography>
                </Box>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Covering Staff Officer *</InputLabel>
                  <Select
                    value={reassignStaffId}
                    label="Select Covering Staff Officer *"
                    onChange={e => setReassignStaffId(e.target.value)}
                  >
                    {employees.map(emp => (
                      <MenuItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.role || emp.designation})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Cover Assignment Reason / Notes"
                  placeholder="e.g. Emergency relief cover approved by supervisor..."
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  value={reassignNotes}
                  onChange={e => setReassignNotes(e.target.value)}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <Button onClick={() => setReassignShiftModal(null)}>Cancel</Button>
              <Button onClick={handleReassignSubmit} variant="contained" color="primary" sx={{ fontWeight: 800 }}>
                Confirm Cover Delegation
              </Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>

      {/* ── Selected Calendar Shift Detail Modal ── */}
      <Dialog open={Boolean(selectedCalendarShift)} onClose={() => setSelectedCalendarShift(null)} maxWidth="xs" fullWidth>
        {selectedCalendarShift && (
          <Box>
            <DialogTitle sx={{ fontWeight: 800, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CalendarMonth sx={{ color: PRIMARY }} />
                <span>Duty Roster Details</span>
              </Stack>
              <IconButton size="small" onClick={() => setSelectedCalendarShift(null)}>
                <Close fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 2.5 }}>
              <Stack spacing={2}>
                {selectedCalendarShift.isReliefShift && (
                  <Alert severity="info" icon={<BeachAccess />} sx={{ borderRadius: 2, fontWeight: 700, bgcolor: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4' }}>
                    Relief Cover for <strong>{selectedCalendarShift.relievingFor || 'Staff on Leave'}</strong> (Approved Leave: {selectedCalendarShift.leaveRequestId || 'LEV-001'})
                  </Alert>
                )}
                {(selectedCalendarShift.status === 'ON_LEAVE' || selectedCalendarShift.shiftType === 'ON_LEAVE') && (
                  <Alert severity="warning" icon={<BeachAccess />} sx={{ borderRadius: 2, fontWeight: 700, bgcolor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                    Staff officer is on Approved Annual Leave. Shift duty is relieved by <strong>{selectedCalendarShift.relievedBy || 'Blessing Ugwu'}</strong>.
                  </Alert>
                )}
                <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>ASSIGNED STAFF OFFICER</Typography>
                  <Typography variant="body1" fontWeight={800} color={PRIMARY}>{selectedCalendarShift.cashierName}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedCalendarShift.location}</Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>DUTY TIMING</Typography>
                    <Typography variant="body2" fontWeight={800}>{selectedCalendarShift.startTime} – {selectedCalendarShift.endTime}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>STATUS</Typography>
                    <Box sx={{ mt: 0.3 }}><StatusChip label={selectedCalendarShift.status} /></Box>
                  </Grid>
                  {selectedCalendarShift.openingBalance > 0 && (
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>ASSIGNED FLOAT</Typography>
                      <Typography variant="body2" fontWeight={800} color={SUCCESS}>{formatNGN(selectedCalendarShift.openingBalance)}</Typography>
                    </Grid>
                  )}
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>CONFIGURED BY</Typography>
                    <Typography variant="body2" fontWeight={600}>{selectedCalendarShift.configuredBy || 'Admin HR'}</Typography>
                  </Grid>
                </Grid>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <Button onClick={() => setSelectedCalendarShift(null)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Close
              </Button>
              {selectedCalendarShift.status === 'SCHEDULED' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PlayArrow />}
                  onClick={() => {
                    const shift = selectedCalendarShift;
                    setSelectedCalendarShift(null);
                    setStartShiftModal(shift);
                    setOpeningBalanceInput(String(shift.openingBalance || ''));
                    setStartShiftNotes('');
                  }}
                  sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
                >
                  Start Shift (Clock-In)
                </Button>
              )}
            </DialogActions>
          </Box>
        )}
      </Dialog>
    </Box>
  );
};

export default CentralizedDutyRoster;
