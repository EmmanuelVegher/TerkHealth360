import React, { useState, useEffect, useRef, useMemo } from 'react';
import { assetUrl } from '../utils/assetUrl';
import {
  Box, Typography, Button, IconButton, Chip, Card, CardContent,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, Tabs, Tab,
  Divider, Alert, Stack, CircularProgress, Badge, Grid, Checkbox,
  FormControlLabel, ButtonGroup, useTheme, alpha, Avatar
} from '@mui/material';
import {
  Assignment, SaveAlt, PictureAsPdf, Delete, CheckCircle, Cancel,
  AccessTime, DateRange, ArrowBackIos, ArrowForwardIos, Edit,
  Print, CloudUpload, Draw, Refresh, Person, Business,
  CalendarMonth, Visibility, Send, Check, Close, FilterList,
  Download, Search, WarningAmber, Shield, EventAvailable, FreeBreakfast,
  CheckCircleOutline, Verified, BeachAccess, Add, CalendarToday,
  Public, WorkOff, EventBusy, UploadFile, Undo, Reply, Forward,
  Lock, HistoryEdu, TouchApp, AssignmentTurnedIn, Apartment, LocalHospital
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Official Hospital Corporate Color Palette
const COLORS = {
  maroonPrimary: '#1e3a8a',
  maroonDark: '#172554',
  maroonLight: '#2563eb',
  maroonAccent: '#3b82f6',
  gold: '#D97706',
  weekendDark: '#0f172a',
  headerBlue: '#e0f2fe',
  approvedGreen: '#dcfce7',
  approvedPartialBlue: '#dbeafe',
  deductionYellow: '#fef9c3',
  deductionRed: '#fee2e2',
};

// Default projects & categories
const PROJECT_OPTIONS = [
  'Revenue & Cash Desk Operations',
  'Clinical Inpatient & Outpatient Care',
  'AYP HUB (Prevention)',
  'Laboratory & Diagnostic Services',
  'Pharmacy & Dispensary Care',
  'Maternal & Child Health (MCH)',
  'Emergency & Ambulance Services',
];

export interface LeaveCategoryDef {
  key: string;
  label: string;
  gridKey: string;
  color: string;
  badge: string;
  bg: string;
  icon: string;
  desc: string;
}

export const LEAVE_AND_OFF_CATEGORIES: LeaveCategoryDef[] = [
  { key: 'ANNUAL', label: 'Annual leave', gridKey: 'annualLeave', color: '#d97706', badge: '🏖️ Annual', bg: '#fef3c7', icon: '🌴', desc: 'Scheduled annual holiday & personal welfare recess' },
  { key: 'SICK', label: 'Sick / Medical leave', gridKey: 'sickLeave', color: '#dc2626', badge: '🏥 Sick', bg: '#fee2e2', icon: '🩺', desc: 'Medical treatment or physician-recommended bed rest' },
  { key: 'MATERNITY', label: 'Maternity leave', gridKey: 'maternityLeave', color: '#db2777', badge: '🍼 Maternity', bg: '#fce7f3', icon: '👶', desc: 'Maternity leave for eligible female staff (up to 90 days)' },
  { key: 'PATERNITY', label: 'Paternity leave', gridKey: 'paternityLeave', color: '#2563eb', badge: '👶 Paternity', bg: '#dbeafe', icon: '👨‍👧', desc: 'Paternity leave for married male staff (up to 14 days)' },
  { key: 'HOLIDAY', label: 'Holiday / Comp leave', gridKey: 'holiday', color: '#16a34a', badge: '🎉 Holiday', bg: '#dcfce7', icon: '📅', desc: 'Public holidays or compensation duty off-in-lieu' },
  { key: 'CASUAL', label: 'Casual / Out-of-Office', gridKey: 'casualLeave', color: '#0891b2', badge: '✈️ Casual', bg: '#cffafe', icon: '✈️', desc: 'Short duration out-of-office absence or emergency' },
  { key: 'COMPASSIONATE', label: 'Compassionate / Bereavement', gridKey: 'compassionateLeave', color: '#64748b', badge: '🕊️ Bereave', bg: '#f1f5f9', icon: '🕊️', desc: 'Bereavement or urgent family crisis support' },
  { key: 'STUDY', label: 'Study & Examination leave', gridKey: 'studyLeave', color: '#059669', badge: '📚 Study', bg: '#d1fae5', icon: '🎓', desc: 'CPD, certification courses, or professional licensing exams' },
  { key: 'TRAINING', label: 'Training / Off-duty', gridKey: 'training', color: '#7c3aed', badge: '🎓 Training', bg: '#ede9fe', icon: '📚', desc: 'Hospital scheduled trainings, workshops or rotational off-duty' }
];

export const OFF_DAY_CATEGORIES = LEAVE_AND_OFF_CATEGORIES.map(c => c.label);

// Configured approved roster schedules matching the Hospital Shift Roster Calendar
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
    shiftName: 'Revenue Unit Lead & Financial Control Shift (08:00 – 16:00)'
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
    shiftName: 'Revenue Unit Lead & Financial Control Shift (08:00 – 16:00)'
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
  },
  'EMP-ADM-001': {
    days: [1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30],
    shiftHours: 8,
    shiftStart: '08:00',
    shiftEnd: '17:00',
    shiftName: 'Executive Admin & Medical Directorate Oversight (08:00 – 17:00)'
  },
  'ADM-01': {
    days: [1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30],
    shiftHours: 8,
    shiftStart: '08:00',
    shiftEnd: '17:00',
    shiftName: 'Executive Admin & Medical Directorate Oversight (08:00 – 17:00)'
  },
  'admin': {
    days: [1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30],
    shiftHours: 8,
    shiftStart: '08:00',
    shiftEnd: '17:00',
    shiftName: 'Executive Admin & Medical Directorate Oversight (08:00 – 17:00)'
  }
};

export const BISHOP_OPTIONS = [
  { id: 'BISHOP-01', name: 'Most Rev. Dr. C.V.C. Onaga', title: 'Catholic Diocesan Bishop & Patron', isBishop: true },
  { id: 'BISHOP-02', name: 'Rev. Fr. Dr. Emmanuel', title: 'Diocesan Health Director / Bishop Representative', isBishop: true },
  { id: 'BISHOP-03', name: 'Very Rev. Msgr. Diocesan Chancellor', title: 'Catholic Diocesan Secretariat', isBishop: true }
];

const MONTHS_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TimesheetPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  // Top Level View Mode: 0 = My Timesheet Grid, 1 = Supervisor Approvals Desk
  const [activeTab, setActiveTab] = useState(0);

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [activeTimesheet, setActiveTimesheet] = useState<any | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);

  // HR Holiday & Leave Modals & Form States
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    title: '',
    date: '2026-10-01',
    scope: 'ALL_STAFF',
    targetDepartment: '',
    targetStaffIds: [] as string[],
    description: ''
  });
  const [leaveForm, setLeaveForm] = useState({
    staffId: 'EMP-006',
    leaveType: 'ANNUAL',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    days: 5,
    reason: '',
    status: 'APPROVED'
  });

  // Header & Selection Controls
  const [selectedStaffId, setSelectedStaffId] = useState<string>('EMP-006');
  const [selectedMonth, setSelectedMonth] = useState<string>('September');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedPeriodPart, setSelectedPeriodPart] = useState<number>(1); // 1 = Part 1 / Full, 2 = Part 2
  const [selectedProject, setSelectedProject] = useState<string>('Revenue & Cash Desk Operations');
  const [includeTaskSummary, setIncludeTaskSummary] = useState<boolean>(true);
  // User Configured Digital Signature State
  const [savedSignature, setSavedSignature] = useState<{
    signatureData: string;
    signatureType: string;
    signatureName: string;
    updatedAt: string;
  } | null>(null);

  // Tab 3 Signature Setup Desk States
  const tabCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tabIsDrawing, setTabIsDrawing] = useState(false);
  const [tabSignatureMode, setTabSignatureMode] = useState<'draw' | 'upload' | 'type'>('draw');
  const [tabPenColor, setTabPenColor] = useState('#1e3a8a');
  const [tabTypedSigName, setTabTypedSigName] = useState('');
  const [uploadedSigPreview, setUploadedSigPreview] = useState<string | null>(null);

  // Return Timesheet with Reason Dialog State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnTargetTs, setReturnTargetTs] = useState<any | null>(null);
  const [returnReasonInput, setReturnReasonInput] = useState('');
  const [returnReviewerRole, setReturnReviewerRole] = useState<'Supervisor' | 'Hospital Administrator' | 'Bishop'>('Supervisor');

  // Supervisor & Executive Administrator Selection
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>('Chinedu Okafor');
  const [selectedAdmin, setSelectedAdmin] = useState<string>('Amedu Alapa');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'SUBMITTED' | 'PENDING_ADMIN_APPROVAL' | 'APPROVED' | 'REJECTED'>('ALL');

  // Review Timesheet Grid Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReviewTs, setSelectedReviewTs] = useState<any | null>(null);
  const [reviewTargetAdmin, setReviewTargetAdmin] = useState<string>('Amedu Alapa');

  // Role permissions: Only Hospital Administrator or Bishop can authorize executive seal
  const isSuperAdminOrBishop = useMemo(() => {
    const r = (user?.role || '').toLowerCase();
    const u = (user?.username || '').toLowerCase();
    return r === 'admin' || r === 'super_admin' || r === 'bishop' || r === 'hospital_administrator' || u === 'admin' || u === 'bishop' || u.includes('alapa') || u.includes('onaga');
  }, [user]);

  // Current logged in user profile identifiers
  const currentUserName = useMemo(() => {
    return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || (isSuperAdminOrBishop ? 'System Administrator' : 'Staff Member');
  }, [user, isSuperAdminOrBishop]);

  const isCashierRole = useMemo(() => {
    return user?.role?.toLowerCase().includes('cashier') || user?.roles?.some((r: string) => r.toLowerCase().includes('cashier')) || false;
  }, [user]);

  const isMaryOkon = useMemo(() => {
    if (isSuperAdminOrBishop) return false;
    const nameLower = currentUserName.toLowerCase();
    const userLower = (user?.username || '').toLowerCase();
    if (nameLower.includes('chinedu') || userLower.includes('chinedu') ||
        nameLower.includes('blessing') || userLower.includes('blessing') ||
        nameLower.includes('ibrahim') || userLower.includes('ibrahim') ||
        nameLower.includes('ekwedike') || userLower.includes('ekwedike') ||
        nameLower.includes('david') || userLower.includes('accountant') || userLower.includes('finance') ||
        nameLower.includes('ngozi') || userLower.includes('ngozi') ||
        nameLower.includes('vegher') || userLower.includes('vegher')) {
      return false;
    }
    return nameLower.includes('mary') || user?.email?.toLowerCase().includes('mary') || isCashierRole || user?.username === 'cashier' || user?.username === 'mary.okon';
  }, [currentUserName, user, isCashierRole, isSuperAdminOrBishop]);

  // Resolve matching employee record for the currently logged in user across ANY role
  const currentUserEmp = useMemo(() => {
    if (!employees || employees.length === 0) return null;
    const nameLower = currentUserName.toLowerCase();
    const userLower = (user?.username || '').toLowerCase();
    const emailLower = (user?.email || '').toLowerCase();
    const staffId = (user as any)?.staffId || (user as any)?.employeeId || (user as any)?.empId;

    return employees.find((emp: any) => {
      const empId = (emp.id || emp.employeeId || '').toLowerCase();
      const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim().toLowerCase();
      const empEmail = (emp.email || '').toLowerCase();
      const empRole = (emp.role || emp.designation || '').toLowerCase();

      if (staffId && (empId === String(staffId).toLowerCase())) return true;
      if (emailLower && empEmail && (emailLower === empEmail || empEmail.includes(emailLower))) return true;
      if (nameLower && empName && (empName === nameLower || (nameLower.length > 3 && (empName.includes(nameLower) || nameLower.includes(empName))))) return true;
      if (userLower && (empEmail.includes(userLower) || empName.includes(userLower))) return true;
      
      // Role-specific accounts matching
      if (userLower === 'accountant' || userLower.includes('accountant') || user?.role?.toLowerCase().includes('accountant')) {
        return empId === 'emp-012' || empRole.includes('accountant') || empName.includes('adeleke');
      }
      if (userLower === 'finance' || userLower.includes('finance') || user?.role?.toLowerCase().includes('finance')) {
        return empId === 'emp-009' || empRole.includes('revenue unit') || empName.includes('chinedu');
      }
      if (isMaryOkon) {
        return empId === 'emp-006' || empName.includes('mary okon');
      }
      if (isSuperAdminOrBishop) {
        return empId === 'adm-01' || empId === 'emp-adm-001' || empName.includes('alapa') || empRole.includes('administrator');
      }
      return false;
    }) || null;
  }, [employees, user, currentUserName, isMaryOkon, isSuperAdminOrBishop]);

  const currentEmpId = useMemo(() => {
    if (currentUserEmp?.id || currentUserEmp?.employeeId) {
      return currentUserEmp.id || currentUserEmp.employeeId;
    }
    if (isSuperAdminOrBishop) {
      return (user as any)?.employeeId || (user as any)?.empId || 'ADM-01';
    }
    const nameLower = currentUserName.toLowerCase();
    const userLower = (user?.username || '').toLowerCase();
    if (userLower === 'accountant' || userLower.includes('accountant') || nameLower.includes('adeleke')) return 'EMP-012';
    if (userLower === 'finance' || nameLower.includes('chinedu') || userLower.includes('chinedu')) return 'EMP-009';
    if (nameLower.includes('blessing') || userLower.includes('blessing')) return 'EMP-007';
    if (nameLower.includes('ibrahim') || userLower.includes('ibrahim')) return 'EMP-008';
    if (nameLower.includes('ekwedike') || userLower.includes('ekwedike')) return 'EMP-010';
    if (nameLower.includes('ngozi') || userLower.includes('ngozi')) return 'EMP-011';
    if (nameLower.includes('vegher') || userLower.includes('vegher')) return 'EMP-013';
    if (isMaryOkon || nameLower.includes('mary') || userLower.includes('mary')) return 'EMP-006';
    return (user as any)?.employeeId || (user as any)?.empId || (user?.id ? String(user.id) : 'EMP-001');
  }, [user, currentUserEmp, isSuperAdminOrBishop, isMaryOkon, currentUserName]);

  const isPersonMatched = (a?: string | null, b?: string | null): boolean => {
    if (!a || !b) return false;
    const s1 = a.toLowerCase().trim();
    const s2 = b.toLowerCase().trim();
    if (s1 === s2) return true;
    const parts1 = s1.split(/\s+/).filter(p => p.length > 2);
    const parts2 = s2.split(/\s+/).filter(p => p.length > 2);
    return parts1.some(p => s2.includes(p)) || parts2.some(p => s1.includes(p));
  };

  // Helper to check if a timesheet belongs to the current logged-in user
  const isOwnTimesheetFor = (ts: any): boolean => {
    if (!ts) return false;
    const resolvedName = currentUserEmp ? `${currentUserEmp.firstName} ${currentUserEmp.lastName}`.trim() : currentUserName;
    const isOwnEmp = Boolean(ts.empId && (ts.empId === currentEmpId || (isMaryOkon && (ts.empId === 'EMP-006' || ts.name?.toLowerCase().includes('mary okon')))));
    const isOwnName = Boolean(resolvedName && ts.name && (ts.name.toLowerCase().includes(resolvedName.toLowerCase()) || resolvedName.toLowerCase().includes(ts.name.toLowerCase())));
    const isOwnAdmin = Boolean(isSuperAdminOrBishop && (ts.empId === 'EMP-ADM-001' || ts.empId === 'ADM-01' || ts.name?.toLowerCase().includes('system administrator') || ts.designation?.toLowerCase().includes('hospital administrator')));
    return isOwnEmp || isOwnName || isOwnAdmin;
  };

  const isOwnTimesheet = useMemo(() => {
    return isOwnTimesheetFor(activeTimesheet);
  }, [activeTimesheet, currentEmpId, isMaryOkon, currentUserName, isSuperAdminOrBishop]);

  // Check if the timesheet belongs to Hospital Administrator / Executive
  const isAdminTimesheet = useMemo(() => {
    if (!activeTimesheet) return isSuperAdminOrBishop;
    const desig = (activeTimesheet.designation || '').toLowerCase();
    const dept = (activeTimesheet.department || '').toLowerCase();
    const name = (activeTimesheet.name || '').toLowerCase();
    const emp = (activeTimesheet.empId || '').toLowerCase();
    return desig.includes('administrator') || desig.includes('director') ||
      dept.includes('administration') || dept.includes('executive') ||
      name.includes('administrator') || emp.includes('adm') ||
      (isSuperAdminOrBishop && isOwnTimesheet);
  }, [activeTimesheet, isSuperAdminOrBishop, isOwnTimesheet]);

  // Standard Executive Administrators & Bishop Dropdown Options pulling dynamically from live database (employees)
  const EXECUTIVE_ADMIN_OPTIONS = useMemo(() => {
    const defaultList = [
      { id: 'ADM-01', name: 'Amedu Alapa', title: 'Hospital Administrator', isBishop: false },
      { id: 'ADM-02', name: 'Most Rev. Dr. C.V.C. Onaga', title: 'Catholic Diocesan Bishop & Patron', isBishop: true },
      { id: 'ADM-03', name: 'Rev. Fr. Dr. Emmanuel', title: 'Diocesan Health Director / Bishop Representative', isBishop: true },
      { id: 'ADM-04', name: 'Dr. Nwachukwu', title: 'Chief Medical Director / Board Chair', isBishop: false }
    ];

    if (!employees || employees.length === 0) return defaultList;

    const dbAdmins = employees.filter((emp: any) => {
      const role = (emp.role || emp.designation || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      const name = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
      return (
        role.includes('admin') ||
        role.includes('bishop') ||
        role.includes('director') ||
        role.includes('medical director') ||
        role.includes('board') ||
        role.includes('patron') ||
        role.includes('representative') ||
        dept.includes('admin') ||
        dept.includes('executive') ||
        dept.includes('diocese') ||
        dept.includes('board') ||
        dept.includes('health commission') ||
        name.includes('amedu') ||
        name.includes('onaga') ||
        name.includes('emmanuel') ||
        name.includes('nwachukwu')
      );
    }).map((emp: any) => ({
      id: emp.id || emp.employeeId,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      title: emp.role || emp.designation || 'Hospital Administrator',
      isBishop: (emp.role || '').toLowerCase().includes('bishop') || (emp.department || '').toLowerCase().includes('diocese')
    }));

    if (dbAdmins.length === 0) return defaultList;

    const combined = [...dbAdmins];
    defaultList.forEach(def => {
      if (!combined.some(c => c.name.toLowerCase().includes(def.name.toLowerCase()) || def.name.toLowerCase().includes(c.name.toLowerCase()))) {
        combined.push(def);
      }
    });

    return combined;
  }, [employees]);

  // Eligible Supervisors dynamically pulled from /staff/hierarchy mapping for this staff member
  const ELIGIBLE_SUPERVISORS = useMemo(() => {
    const targetEmp = employees.find(e => e.id === selectedStaffId) ||
      employees.find(e => `${e.firstName} ${e.lastName}`.toLowerCase() === currentUserName.toLowerCase()) ||
      employees.find(e => e.id === activeTimesheet?.empId);

    const result: { id: string; name: string; role: string; department: string; type?: 'PRIMARY' | 'SECONDARY' | 'DEFAULT' }[] = [];

    if (targetEmp) {
      if (targetEmp.supervisorId || targetEmp.supervisorName) {
        const primarySup = employees.find(e => e.id === targetEmp.supervisorId);
        result.push({
          id: targetEmp.supervisorId || 'SUP-PRIMARY',
          name: targetEmp.supervisorName || (primarySup ? `${primarySup.firstName} ${primarySup.lastName}` : 'Primary Supervisor'),
          role: targetEmp.supervisorRole || primarySup?.role || 'Direct Primary Supervisor',
          department: primarySup?.department || targetEmp.department || 'Hospital Services',
          type: 'PRIMARY'
        });
      }
      if (targetEmp.secondarySupervisorId || targetEmp.secondarySupervisorName) {
        const secSup = employees.find(e => e.id === targetEmp.secondarySupervisorId);
        result.push({
          id: targetEmp.secondarySupervisorId || 'SUP-SECONDARY',
          name: targetEmp.secondarySupervisorName || (secSup ? `${secSup.firstName} ${secSup.lastName}` : 'Secondary Supervisor'),
          role: secSup?.role || 'Secondary / Line Supervisor (Optional)',
          department: secSup?.department || targetEmp.department || 'Hospital Services',
          type: 'SECONDARY'
        });
      }
    }

    if (result.length === 0) {
      const defaultSupervisors = [
        { id: 'SUP-01', name: 'Chinedu Okafor', role: 'Revenue Unit Lead / Senior Supervisor', department: 'Finance & Revenue', type: 'PRIMARY' as const },
        { id: 'SUP-02', name: 'Blessing Ugwu', role: 'Senior Cashier & Shift Lead', department: 'Finance & Revenue', type: 'SECONDARY' as const },
        { id: 'SUP-04', name: 'Ekwedike Dennis', role: 'Hospital Projects & Caritas Coordinator', department: 'Administration', type: 'DEFAULT' as const },
        { id: 'SUP-05', name: 'Dr. Aisha Bello', role: 'Clinical Services Director & Consultant', department: 'Clinical Services', type: 'DEFAULT' as const },
        { id: 'SUP-06', name: 'Ngozi Eze', role: 'Chief Nursing Officer / Ward Supervisor', department: 'Nursing & Inpatient', type: 'DEFAULT' as const },
      ];
      return defaultSupervisors;
    }

    return result;
  }, [employees, selectedStaffId, currentUserName, activeTimesheet?.empId]);

  // Keep selectedCoordinator aligned with the staff member's mapped primary supervisor
  useEffect(() => {
    if (!isAdminTimesheet && ELIGIBLE_SUPERVISORS.length > 0) {
      if (!ELIGIBLE_SUPERVISORS.some(s => s.name === selectedCoordinator) && (!activeTimesheet?.supervisorSignature?.name || !activeTimesheet?.supervisorSignature?.signed)) {
        setSelectedCoordinator(ELIGIBLE_SUPERVISORS[0].name);
      }
    }
  }, [ELIGIBLE_SUPERVISORS, isAdminTimesheet, selectedCoordinator, activeTimesheet?.supervisorSignature]);

  // Helper to check if the current user is authorized to act as supervisor on a timesheet
  const isSupervisorAuthorizedFor = (ts: any): boolean => {
    if (!ts) return false;
    // Staff can NEVER approve their own timesheet as supervisor
    if (isOwnTimesheetFor(ts)) return false;

    const designatedSupervisor = ts.supervisorSignature?.name || ts.supervisorName || selectedCoordinator || 'Chinedu Okafor';
    const isAssignedSupervisor = isPersonMatched(designatedSupervisor, currentUserName) ||
      (currentUserName.toLowerCase().includes('chinedu') && designatedSupervisor && designatedSupervisor.toLowerCase().includes('chinedu'));

    return Boolean(isAssignedSupervisor || isSuperAdminOrBishop);
  };

  const isSupervisorAuthorized = useMemo(() => {
    return isSupervisorAuthorizedFor(activeTimesheet);
  }, [activeTimesheet, currentUserName, selectedCoordinator, isSuperAdminOrBishop, currentEmpId, isMaryOkon]);

  // Timesheets eligible for review based on logged-in role
  const reviewableTimesheets = useMemo(() => {
    return timesheets.filter(ts => {
      // Exclude current logged-in user's own timesheet from the review desk
      const isOwn = isOwnTimesheetFor(ts);
      if (isOwn) return false;

      // If user is Admin or Bishop:
      // They see all timesheets at executive seal stage (PENDING_ADMIN_APPROVAL) or archived records
      if (isSuperAdminOrBishop) {
        const isAssignedSupervisor = isPersonMatched(ts.supervisorSignature?.name, currentUserName);
        if (ts.status === 'SUBMITTED' && !isAssignedSupervisor) {
          return false;
        }
        return true;
      }

      // If user is a unit supervisor (like Mary Okon):
      // Show ONLY timesheets where Mary Okon is designated as the supervisor!
      const isMySupervision = isPersonMatched(ts.supervisorSignature?.name, currentUserName) ||
        (currentUserName.toLowerCase().includes('mary') && (
          (ts.supervisorSignature?.name && ts.supervisorSignature.name.toLowerCase().includes('mary')) ||
          (ts.supervisorName && ts.supervisorName.toLowerCase().includes('mary'))
        ));

      return isMySupervision;
    });
  }, [timesheets, currentEmpId, currentUserName, isSuperAdminOrBishop, isMaryOkon]);

  const pendingReviewBadgeCount = useMemo(() => {
    return reviewableTimesheets.filter(t => {
      if (isSuperAdminOrBishop) {
        return t.status === 'PENDING_ADMIN_APPROVAL';
      }
      return t.status === 'SUBMITTED';
    }).length;
  }, [reviewableTimesheets, isSuperAdminOrBishop]);

  // Dialog States
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signingRole, setSigningRole] = useState<'staff' | 'coordinator' | 'admin'>('staff');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printPreviewTs, setPrintPreviewTs] = useState<any | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // New Timesheet Form
  const [newTsStaffId, setNewTsStaffId] = useState('EMP-006');
  const [newTsMonth, setNewTsMonth] = useState('September');
  const [newTsYear, setNewTsYear] = useState('2026');
  const [newTsProject, setNewTsProject] = useState('Revenue & Cash Desk Operations');
  const [newTsCoordinator, setNewTsCoordinator] = useState('Chinedu Okafor');

  // Grid Horizontal Scroll Ref
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Signature Canvas Ref (Modal)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureType, setSignatureType] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedSigName, setTypedSigName] = useState('');

  // Day Audit Dialog State
  const [selectedDayAudit, setSelectedDayAudit] = useState<any | null>(null);
  const [dayAuditModalOpen, setDayAuditModalOpen] = useState(false);

  // ─── Generate Dynamic Roster Grid for Any Month & Year ────────────────────
  function generateRosterGrid(
    monthName = 'September',
    year = 2026,
    projectName = 'Revenue & Cash Desk Operations',
    empRole = 'cashier',
    empId = 'EMP-006',
    holidaysList = holidays,
    leavesList = leaves,
    empDept = 'Finance & Revenue'
  ) {
    const monthIdx = MONTHS_LIST.indexOf(monthName) >= 0 ? MONTHS_LIST.indexOf(monthName) : 8;
    // Exactly compute number of days in the selected month & year (e.g., Feb 28/29, Apr 30, Oct 31)
    const totalDays = new Date(year, monthIdx + 1, 0).getDate();

    // In the system timeline, today is September 14, 2026
    const isCurrentMonth = monthName === 'September' && year === 2026;
    const currentDayOfMonth = isCurrentMonth ? 14 : (year < 2026 || (year === 2026 && monthIdx < 8) ? 31 : 0);

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
      const dayOfWeekIdx = dateObj.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
      const isSunday = dayOfWeekIdx === 0;
      const isSaturday = dayOfWeekIdx === 6;
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      // Check if there is an HR-configured Public Holiday applicable to this staff
      const matchingHoliday = holidaysList.find((h: any) => {
        if (h.date !== dateStr) return false;
        if (!h.scope || h.scope === 'ALL_STAFF') return true;
        if (h.scope === 'DEPARTMENT' && h.targetDepartment === empDept) return true;
        if (h.scope === 'CUSTOM_STAFF' && Array.isArray(h.targetStaffIds) && h.targetStaffIds.includes(empId)) return true;
        return false;
      });

      // Strict staff identification matching (do NOT match other employees in same department)
      const matchingLeave = leavesList.find((l: any) => {
        const isApproved = l.status === 'APPROVED' || l.status === 'Approved' || l.status === 'Approved & Synced' || String(l.status).toUpperCase().includes('APPROV');
        if (!isApproved) return false;

        const isMatch =
          (empId && (l.empId === empId || l.staffId === empId)) ||
          ((empId === 'EMP-006' || empId === 'cashier') && (l.name?.toLowerCase().includes('mary okon') || l.empId === 'EMP-006' || l.empId === 'cashier')) ||
          (!empId && l.name && (l.name.toLowerCase().includes('mary okon') || l.empId === 'EMP-006'));

        if (!isMatch) return false;
        return dateStr >= l.startDate && dateStr <= l.endDate;
      });

      const isHoliday = !!matchingHoliday;
      const isLeave = !!matchingLeave;

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

      if (isHoliday) {
        expectedH = shiftHours;
        totalScheduledShifts++;
        totalExpectedHours += shiftHours;
        shiftType = 'HOLIDAY';
        shiftLabel = matchingHoliday.title ? `${matchingHoliday.title} (Public Holiday)` : 'Public Holiday (8H Inflow Credit)';
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
      } else if (isLeave) {
        expectedH = shiftHours;
        totalScheduledShifts++;
        totalExpectedHours += shiftHours;
        const leaveType = (matchingLeave.type || matchingLeave.leaveType || 'ANNUAL').toUpperCase();
        shiftType = leaveType;
        shiftLabel = `Approved ${matchingLeave.type || leaveType} Leave`;
        shiftTime = `${shiftStart} – ${shiftEnd} (LEAVE)`;

        if (leaveType === 'ANNUAL') {
          annH = shiftHours;
          totalActualAnnualLeaveHours += shiftHours;
        } else if (leaveType === 'SICK') {
          sickH = shiftHours;
          totalActualSickLeaveHours += shiftHours;
        } else if (leaveType === 'MATERNITY') {
          matH = shiftHours;
          totalActualMaternityHours += shiftHours;
        } else if (leaveType === 'PATERNITY') {
          patH = shiftHours;
          totalActualPaternityHours += shiftHours;
        } else if (leaveType === 'HOLIDAY') {
          holH = shiftHours;
          totalActualHolidayHours += shiftHours;
        } else if (leaveType === 'CASUAL') {
          casH = shiftHours;
          totalActualCasualLeaveHours += shiftHours;
        } else if (leaveType === 'COMPASSIONATE') {
          compH = shiftHours;
          totalActualCompassionateLeaveHours += shiftHours;
        } else if (leaveType === 'STUDY') {
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
          shiftStatus = 'LEAVE_APPROVED';
          clockIn = 'LEAVE';
          clockOut = 'LEAVE';
        } else {
          shiftStatus = 'UPCOMING_LEAVE';
          clockIn = 'LEAVE';
          clockOut = 'LEAVE';
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
        // Scheduled Approved Duty Shift
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
        isWeekend: isSunday, // Only Sunday is dark-shaded as off-duty rest day
        isSaturday,
        isSunday,
        isOffDuty,
        isHoliday,
        isLeave,
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
      totalOffDutyDays,
      totalAnnualLeaveHours: totalActualAnnualLeaveHours,
      totalSickLeaveHours: totalActualSickLeaveHours,
      totalMaternityHours: totalActualMaternityHours,
      totalPaternityHours: totalActualPaternityHours,
      totalCasualLeaveHours: totalActualCasualLeaveHours,
      totalCompassionateLeaveHours: totalActualCompassionateLeaveHours,
      totalStudyLeaveHours: totalActualStudyLeaveHours,
      totalTrainingHours: totalActualTrainingHours,
      totalHoursWorked: totalHoursWorkedToDate,
      compliancePercentage,
      days
    };
  }

  // ─── Fetch Data ───────────────────────────────────────────────────────────
  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const [tsRes, empRes, holRes, leaveRes, sigRes] = await Promise.all([
        api.get('/hr/timesheets').catch(() => ({ data: { data: [] } })),
        api.get('/hr/employees').catch(() => ({ data: { data: [] } })),
        api.get('/hr/holidays').catch(() => ({ data: { data: [] } })),
        api.get('/hr/leave').catch(() => ({ data: { data: [] } })),
        api.get('/hr/signatures/me').catch(() => ({ data: { data: null } }))
      ]);

      const tsData = tsRes.data?.data || [];
      const empData = empRes.data?.data || [];
      const holData = holRes.data?.data || [];
      const leaveData = leaveRes.data?.data || [];
      const sigData = sigRes.data?.data || null;

      setTimesheets(tsData);
      setEmployees(empData);
      setHolidays(holData);
      setLeaves(leaveData);

      // Determine the logged-in user profile
      const userFullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || '';

      let activeUserSignature = sigData?.signatureData || null;
      if (sigData) {
        setSavedSignature(sigData);
      }

      // For every user (Staff, Nurse, Doctor, Supervisor, Accountant, Hospital Administrator, Bishop),
      // Tab 0 ("Monthly Timesheet Grid") ALWAYS loads their OWN personal timesheet record!
      const myStaffId = currentUserEmp?.id || currentUserEmp?.employeeId || (isMaryOkon ? 'EMP-006' : (isSuperAdminOrBishop ? 'EMP-ADM-001' : currentEmpId));
      const myStaffName = currentUserEmp ? `${currentUserEmp.firstName} ${currentUserEmp.lastName}`.trim() : (userFullName || currentUserName);

      // If activeUserSignature exists, sync with only current logged-in user's own timesheet in tsData
      if (activeUserSignature && myStaffName) {
        tsData.forEach((t: any) => {
          const isUserMatch = (t.empId && (t.empId === myStaffId || t.empId === user?.id || t.empId === (user as any)?.employeeId)) ||
                              (t.name && (t.name.toLowerCase() === myStaffName.toLowerCase() || (user?.username && t.name.toLowerCase().includes(user.username.toLowerCase()))));
          if (isUserMatch && t.staffSignature) {
            t.staffSignature.signatureData = activeUserSignature;
          }
        });
      }
      
      let matchedTs = tsData.find((t: any) => {
        const isMe = (t.empId && (t.empId === myStaffId || t.id === myStaffId)) ||
          (isMaryOkon && (t.empId === 'EMP-006' || t.name?.toLowerCase().includes('mary okon'))) ||
          (isSuperAdminOrBishop && (t.empId === 'EMP-ADM-001' || t.empId === 'ADM-01' || t.name?.toLowerCase().includes('system administrator') || t.designation?.toLowerCase().includes('hospital administrator'))) ||
          (myStaffName && t.name && (t.name.toLowerCase() === myStaffName.toLowerCase() || t.name.toLowerCase().includes(myStaffName.toLowerCase()) || myStaffName.toLowerCase().includes(t.name.toLowerCase())));
        return isMe && t.month === selectedMonth && Number(t.year) === selectedYear;
      });

      // If September 2026 for Mary Okon needs default initialization
      if (!matchedTs && isMaryOkon && selectedMonth === 'September' && selectedYear === 2026) {
        const maryGrid = generateRosterGrid('September', 2026, 'Revenue & Cash Desk Operations', 'cashier', 'EMP-006', holData, leaveData, 'Finance & Revenue');
        matchedTs = {
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
          grid: maryGrid,
          hoursWorked: maryGrid.totalHoursWorked,
          expectedHours: maryGrid.expectedShiftHours,
          compliancePercentage: 100,
          status: 'PENDING_ADMIN_APPROVAL',
          staffSignature: {
            signed: true,
            name: 'Mary Okon',
            date: 'September 13, 2026',
            signatureData: activeUserSignature || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M15 30 C35 10, 55 40, 85 15 C105 35, 130 15, 145 28" stroke="%231e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 38 L140 36" stroke="%231e3a8a" stroke-width="1.2" fill="none"/></svg>'
          },
          supervisorSignature: {
            signed: true,
            name: 'Chinedu Okafor',
            role: 'Revenue Unit Lead',
            date: 'September 13, 2026',
            signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M10 25 C30 5, 50 45, 80 15 C100 35, 120 15, 150 25" stroke="%230f766e" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>'
          },
          adminSignature: {
            signed: false,
            name: 'Amedu Alapa',
            role: 'Hospital Administrator',
            date: null,
            signatureData: null
          },
          comments: 'All 23 assigned cashier shifts configured and reconciled. 100% duty compliance achieved.'
        };
      } else if (!matchedTs) {
        // Any other month/year or role where no timesheet is saved in database -> initialize clean personal DRAFT!
        let empDept = currentUserEmp?.department || (user as any)?.department || 'Clinical Services';
        let empDesig = currentUserEmp?.role || currentUserEmp?.designation || (user as any)?.designation || 'Staff Officer';
        let projName = selectedProject || 'Hospital Inpatient & Outpatient Operations';
        let roleKey = 'clinical';

        const uLower = (user?.username || '').toLowerCase();
        const roleLower = (user?.role || '').toLowerCase();
        const desigLower = empDesig.toLowerCase();
        const deptLower = empDept.toLowerCase();

        if (isMaryOkon || desigLower.includes('cashier') || roleLower.includes('cashier')) {
          empDept = 'Finance & Revenue';
          empDesig = 'Senior Cashier & Revenue Officer';
          projName = 'Revenue & Cash Desk Operations';
          roleKey = 'cashier';
        } else if (uLower === 'accountant' || uLower.includes('accountant') || desigLower.includes('accountant') || roleLower.includes('accountant')) {
          empDept = 'Billing & Finance';
          empDesig = 'Senior Accountant & Auditor';
          projName = 'Financial Accounting, Auditing & Ledger Reconciliation';
          roleKey = 'accountant';
        } else if (uLower === 'finance' || uLower.includes('finance') || desigLower.includes('revenue lead') || desigLower.includes('cfo')) {
          empDept = 'Finance & Revenue';
          empDesig = 'Revenue Unit Lead & Accountant';
          projName = 'Hospital Revenue Management & Financial Control';
          roleKey = 'accountant';
        } else if (desigLower.includes('doctor') || desigLower.includes('physician') || roleLower.includes('doctor')) {
          empDept = empDept || 'OPD / Internal Medicine';
          empDesig = empDesig || 'Doctor / Consultant Physician';
          projName = 'Clinical Inpatient & Outpatient Medical Services';
          roleKey = 'doctor';
        } else if (desigLower.includes('nurse') || desigLower.includes('matron') || roleLower.includes('nurse')) {
          empDept = empDept || 'Nursing & Inpatient';
          empDesig = empDesig || 'Chief Matron / Staff Nurse';
          projName = 'Inpatient Nursing & Patient Care Operations';
          roleKey = 'nurse';
        } else if (desigLower.includes('pharmac') || roleLower.includes('pharmac')) {
          empDept = empDept || 'Pharmacy & Therapeutics';
          empDesig = empDesig || 'Pharmacist';
          projName = 'Pharmacy Dispensing & Drug Inventory Management';
          roleKey = 'pharmacist';
        } else if (desigLower.includes('lab') || desigLower.includes('scientist') || desigLower.includes('tracking')) {
          empDept = empDept || 'Prevention & Diagnostics';
          empDesig = empDesig || 'Tracking Assistant & Lab Scientist';
          projName = 'AYP HUB (Prevention & Diagnostics)';
          roleKey = 'lab';
        } else if (isSuperAdminOrBishop) {
          empDept = 'Administration & Medical Direction';
          empDesig = 'Hospital Administrator & Medical Director';
          projName = 'Hospital Administration, Governance & Clinical Oversight';
          roleKey = 'admin';
        }

        const draftGrid = generateRosterGrid(
          selectedMonth,
          selectedYear,
          projName,
          roleKey,
          myStaffId,
          holData,
          leaveData,
          empDept
        );

        matchedTs = {
          id: `TSH-${myStaffId}-${selectedMonth}-${selectedYear}`,
          empId: myStaffId,
          name: myStaffName,
          department: empDept,
          designation: empDesig,
          location: 'Faith Foundation Mission Hospital',
          state: 'Enugu',
          projectName: projName,
          month: selectedMonth,
          year: String(selectedYear),
          monthStr: `${selectedMonth} ${selectedYear}`,
          grid: draftGrid,
          hoursWorked: draftGrid.totalHoursWorked,
          expectedHours: draftGrid.expectedShiftHours,
          compliancePercentage: draftGrid.compliancePercentage,
          status: 'DRAFT',
          staffSignature: {
            signed: false,
            name: myStaffName,
            date: null,
            signatureData: activeUserSignature || savedSignature?.signatureData || null
          },
          supervisorSignature: {
            signed: false,
            name: isSuperAdminOrBishop ? 'Most Rev. Dr. C.V.C. Onaga' : (selectedCoordinator || 'Chinedu Okafor'),
            role: isSuperAdminOrBishop ? 'Catholic Diocesan Bishop & Patron' : (empDept.includes('Finance') ? 'Revenue Unit Lead' : 'Unit Lead / Supervisor'),
            date: null,
            signatureData: null
          },
          adminSignature: {
            signed: false,
            name: isSuperAdminOrBishop ? 'Most Rev. Dr. C.V.C. Onaga' : (selectedAdmin || 'Amedu Alapa'),
            role: isSuperAdminOrBishop ? 'Catholic Diocesan Bishop & Patron' : 'Hospital Administrator',
            date: null,
            signatureData: null
          },
          comments: isSuperAdminOrBishop ? 'Executive Administration & Medical Directorate Monthly Time & Activity Report.' : '',
          returnInfo: null
        };
      } else if (matchedTs && activeUserSignature && matchedTs.staffSignature && !matchedTs.staffSignature.signatureData) {
        matchedTs.staffSignature.signatureData = activeUserSignature;
      }

      if (matchedTs) {
        setActiveTimesheet(matchedTs);
        setSelectedStaffId(matchedTs.empId || matchedTs.id);
        if (matchedTs.supervisorSignature?.name) {
          setSelectedCoordinator(matchedTs.supervisorSignature.name);
        } else if (isSuperAdminOrBishop) {
          setSelectedCoordinator('Most Rev. Dr. C.V.C. Onaga');
        }
        if (matchedTs.adminSignature?.name) {
          setSelectedAdmin(matchedTs.adminSignature.name);
        } else if (isSuperAdminOrBishop) {
          setSelectedAdmin('Most Rev. Dr. C.V.C. Onaga');
        }
      }
    } catch (err) {
      console.error('Failed to load timesheet data', err);
      enqueueSnackbar('Could not load timesheet data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ─── HR Public Holidays Handlers ──────────────────────────────────────────
  const handleCreateHoliday = async () => {
    if (!holidayForm.title || !holidayForm.date) {
      enqueueSnackbar('Please provide a holiday name and date', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/hr/holidays', holidayForm);
      enqueueSnackbar(`Public Holiday "${holidayForm.title}" set successfully across timesheets`, { variant: 'success' });
      setHolidayModalOpen(false);
      setHolidayForm({
        title: '',
        date: '2026-10-01',
        scope: 'ALL_STAFF',
        targetDepartment: '',
        targetStaffIds: [],
        description: ''
      });
      await fetchTimesheets();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save holiday', { variant: 'error' });
    }
  };

  const handleDeleteHoliday = async (id: string, title: string) => {
    try {
      await api.delete(`/hr/holidays/${id}`);
      enqueueSnackbar(`Public Holiday "${title}" removed`, { variant: 'info' });
      await fetchTimesheets();
    } catch (err: any) {
      enqueueSnackbar('Failed to delete holiday', { variant: 'error' });
    }
  };

  // ─── HR Staff Leave Handlers ──────────────────────────────────────────────
  const handleCreateLeave = async () => {
    if (!leaveForm.staffId || !leaveForm.startDate || !leaveForm.endDate) {
      enqueueSnackbar('Please specify staff member, start date, and end date', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/hr/leave', leaveForm);
      enqueueSnackbar(`Leave application for staff registered and applied to timesheets`, { variant: 'success' });
      setLeaveModalOpen(false);
      setLeaveForm({
        staffId: 'EMP-006',
        leaveType: 'ANNUAL',
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        days: 5,
        reason: '',
        status: 'APPROVED'
      });
      await fetchTimesheets();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to record leave', { variant: 'error' });
    }
  };

  const handleApproveLeave = async (id: string) => {
    try {
      await api.patch(`/hr/leave/${id}/approve`, { status: 'APPROVED' });
      enqueueSnackbar('Leave request marked as Approved and updated on timesheet grid', { variant: 'success' });
      await fetchTimesheets();
    } catch (err: any) {
      enqueueSnackbar('Failed to approve leave', { variant: 'error' });
    }
  };

  const handleDeleteLeave = async (id: string) => {
    try {
      await api.delete(`/hr/leave/${id}`);
      enqueueSnackbar('Leave schedule removed', { variant: 'info' });
      await fetchTimesheets();
    } catch (err: any) {
      enqueueSnackbar('Failed to delete leave', { variant: 'error' });
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, [user]);

  // Synchronize when staff dropdown changes
  const handleStaffChange = (empId: string) => {
    if (!isSuperAdminOrBishop) return;
    setSelectedStaffId(empId);
    const found = timesheets.find(t => 
      (t.empId === empId || t.id === empId || (empId === 'EMP-006' && t.name === 'Mary Okon')) &&
      t.month === selectedMonth &&
      Number(t.year) === selectedYear
    );
    if (found) {
      setActiveTimesheet(found);
      setSelectedMonth(found.month || selectedMonth);
      setSelectedYear(Number(found.year) || selectedYear);
      setSelectedProject(found.projectName || selectedProject);
      if (found.supervisorSignature?.name) {
        setSelectedCoordinator(found.supervisorSignature.name);
      }
      if (found.adminSignature?.name) {
        setSelectedAdmin(found.adminSignature.name);
      }
    } else {
      const emp = employees.find(e => e.id === empId) || (empId === 'EMP-006' ? { id: 'EMP-006', firstName: 'Mary', lastName: 'Okon', role: 'Senior Cashier & Revenue Officer', department: 'Finance & Revenue' } : null);
      const isCashier = emp?.role?.toLowerCase().includes('cashier') || emp?.department?.toLowerCase().includes('revenue');
      const projName = isCashier ? 'Revenue & Cash Desk Operations' : 'Clinical Inpatient & Outpatient Care';
      const empDept = emp?.department || (isCashier ? 'Finance & Revenue' : 'Clinical Services');
      const generatedGrid = generateRosterGrid(selectedMonth, selectedYear, projName, isCashier ? 'cashier' : 'clinical', empId, holidays, leaves, empDept);
      
      const draftTs = {
        id: `TSH-${empId}-${selectedMonth}-${selectedYear}`,
        empId: empId,
        name: emp ? `${emp.firstName} ${emp.lastName}` : currentUserName,
        department: empDept,
        designation: emp?.role || 'Staff Officer',
        location: 'Faith Foundation Mission Hospital',
        state: 'Enugu',
        projectName: projName,
        month: selectedMonth,
        year: String(selectedYear),
        monthStr: `${selectedMonth} ${selectedYear}`,
        grid: generatedGrid,
        hoursWorked: generatedGrid.totalHoursWorked,
        expectedHours: generatedGrid.expectedShiftHours,
        compliancePercentage: generatedGrid.compliancePercentage,
        status: 'DRAFT',
        staffSignature: { signed: false, name: emp ? `${emp.firstName} ${emp.lastName}` : currentUserName, date: null, signatureData: savedSignature?.signatureData || null },
        supervisorSignature: { signed: false, name: selectedCoordinator || 'Chinedu Okafor', role: 'Revenue Unit Lead', date: null, signatureData: null },
        adminSignature: { signed: false, name: selectedAdmin || 'Amedu Alapa', role: 'Hospital Administrator', date: null, signatureData: null },
        comments: '',
        returnInfo: null
      };
      setActiveTimesheet(draftTs);
      setSelectedProject(projName);
    }
  };

  // Synchronize when Month changes
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    const found = timesheets.find(t =>
      (t.empId === selectedStaffId || t.id === selectedStaffId || (selectedStaffId === 'EMP-006' && t.name === 'Mary Okon')) &&
      t.month === newMonth &&
      Number(t.year) === selectedYear
    );
    if (found) {
      setActiveTimesheet(found);
      if (found.supervisorSignature?.name) setSelectedCoordinator(found.supervisorSignature.name);
      if (found.adminSignature?.name) setSelectedAdmin(found.adminSignature.name);
    } else {
      const emp = employees.find(e => e.id === selectedStaffId) || (selectedStaffId === 'EMP-006' ? { id: 'EMP-006', firstName: 'Mary', lastName: 'Okon', role: 'Senior Cashier & Revenue Officer', department: 'Finance & Revenue' } : null);
      const isCashier = activeTimesheet?.designation?.toLowerCase().includes('cashier') || selectedProject.includes('Revenue');
      const empDept = emp?.department || activeTimesheet?.department || 'Finance & Revenue';
      const projName = selectedProject || (isCashier ? 'Revenue & Cash Desk Operations' : 'Clinical Inpatient & Outpatient Care');
      const newGrid = generateRosterGrid(newMonth, selectedYear, projName, isCashier ? 'cashier' : 'clinical', selectedStaffId, holidays, leaves, empDept);

      const draftTs = {
        id: `TSH-${selectedStaffId}-${newMonth}-${selectedYear}`,
        empId: selectedStaffId,
        name: emp ? `${emp.firstName} ${emp.lastName}` : (activeTimesheet?.name || currentUserName),
        department: empDept,
        designation: emp?.role || activeTimesheet?.designation || 'Senior Cashier & Revenue Officer',
        location: 'Faith Foundation Mission Hospital',
        state: 'Enugu',
        projectName: projName,
        month: newMonth,
        year: String(selectedYear),
        monthStr: `${newMonth} ${selectedYear}`,
        grid: newGrid,
        hoursWorked: newGrid.totalHoursWorked,
        expectedHours: newGrid.expectedShiftHours,
        compliancePercentage: newGrid.compliancePercentage,
        status: 'DRAFT',
        staffSignature: {
          signed: false,
          name: emp ? `${emp.firstName} ${emp.lastName}` : (activeTimesheet?.name || currentUserName),
          date: null,
          signatureData: savedSignature?.signatureData || null
        },
        supervisorSignature: {
          signed: false,
          name: selectedCoordinator || 'Chinedu Okafor',
          role: 'Revenue Unit Lead',
          date: null,
          signatureData: null
        },
        adminSignature: {
          signed: false,
          name: selectedAdmin || 'Amedu Alapa',
          role: 'Hospital Administrator',
          date: null,
          signatureData: null
        },
        comments: '',
        returnInfo: null
      };
      setActiveTimesheet(draftTs);
    }
  };

  // Synchronize when Year changes
  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    const found = timesheets.find(t =>
      (t.empId === selectedStaffId || t.id === selectedStaffId || (selectedStaffId === 'EMP-006' && t.name === 'Mary Okon')) &&
      t.month === selectedMonth &&
      Number(t.year) === newYear
    );
    if (found) {
      setActiveTimesheet(found);
      if (found.supervisorSignature?.name) setSelectedCoordinator(found.supervisorSignature.name);
      if (found.adminSignature?.name) setSelectedAdmin(found.adminSignature.name);
    } else {
      const emp = employees.find(e => e.id === selectedStaffId) || (selectedStaffId === 'EMP-006' ? { id: 'EMP-006', firstName: 'Mary', lastName: 'Okon', role: 'Senior Cashier & Revenue Officer', department: 'Finance & Revenue' } : null);
      const isCashier = activeTimesheet?.designation?.toLowerCase().includes('cashier') || selectedProject.includes('Revenue');
      const empDept = emp?.department || activeTimesheet?.department || 'Finance & Revenue';
      const projName = selectedProject || (isCashier ? 'Revenue & Cash Desk Operations' : 'Clinical Inpatient & Outpatient Care');
      const newGrid = generateRosterGrid(selectedMonth, newYear, projName, isCashier ? 'cashier' : 'clinical', selectedStaffId, holidays, leaves, empDept);

      const draftTs = {
        id: `TSH-${selectedStaffId}-${selectedMonth}-${newYear}`,
        empId: selectedStaffId,
        name: emp ? `${emp.firstName} ${emp.lastName}` : (activeTimesheet?.name || currentUserName),
        department: empDept,
        designation: emp?.role || activeTimesheet?.designation || 'Senior Cashier & Revenue Officer',
        location: 'Faith Foundation Mission Hospital',
        state: 'Enugu',
        projectName: projName,
        month: selectedMonth,
        year: String(newYear),
        monthStr: `${selectedMonth} ${newYear}`,
        grid: newGrid,
        hoursWorked: newGrid.totalHoursWorked,
        expectedHours: newGrid.expectedShiftHours,
        compliancePercentage: newGrid.compliancePercentage,
        status: 'DRAFT',
        staffSignature: {
          signed: false,
          name: emp ? `${emp.firstName} ${emp.lastName}` : (activeTimesheet?.name || currentUserName),
          date: null,
          signatureData: savedSignature?.signatureData || null
        },
        supervisorSignature: {
          signed: false,
          name: selectedCoordinator || 'Chinedu Okafor',
          role: 'Revenue Unit Lead',
          date: null,
          signatureData: null
        },
        adminSignature: {
          signed: false,
          name: selectedAdmin || 'Amedu Alapa',
          role: 'Hospital Administrator',
          date: null,
          signatureData: null
        },
        comments: '',
        returnInfo: null
      };
      setActiveTimesheet(draftTs);
    }
  };

  // Active grid data (from activeTimesheet or dynamically computed)
  const currentGrid = useMemo(() => {
    const isCashier = activeTimesheet?.designation?.toLowerCase().includes('cashier') || selectedProject.includes('Revenue');
    const empDept = activeTimesheet?.department || 'Finance & Revenue';
    return generateRosterGrid(selectedMonth, selectedYear, selectedProject, isCashier ? 'cashier' : 'clinical', selectedStaffId, holidays, leaves, empDept);
  }, [activeTimesheet, selectedMonth, selectedYear, selectedProject, selectedStaffId, holidays, leaves]);

  // Scheduled shifts and compliance metrics
  const totalAssignedShifts = currentGrid.totalScheduledShifts ?? 26;
  const completedShiftsCount = currentGrid.completedShiftsToDate ?? 12;
  const totalAssignedOffDays = currentGrid.totalOffDutyDays ?? 4;
  const complianceScore = currentGrid.compliancePercentage ?? 100;
  const maxExpectedHours = currentGrid.totalExpectedHours ?? 208;

  // Deductions summary list
  const deductionsSummary = useMemo(() => {
    return currentGrid.days.filter((d: any) => d.deductionHours && d.deductionHours > 0);
  }, [currentGrid]);

  const totalDeductedHours = useMemo(() => {
    return deductionsSummary.reduce((acc: number, d: any) => acc + (d.deductionHours || 0), 0);
  }, [deductionsSummary]);

  // ─── Cell Background Color Helper ─────────────────────────────────────────
  const getCellBgColor = (day: any) => {
    if (day.isOffDuty || day.isWeekend) return '#f1f5f9';
    switch (day.deductionStatus) {
      case 'Partial':
        return COLORS.deductionYellow;
      case 'Full':
        return COLORS.deductionRed;
      case 'ApprovedPartial':
        return COLORS.approvedPartialBlue;
      case 'ApprovedFull':
        return COLORS.approvedGreen;
      default:
        return '#ffffff';
    }
  };

  // ─── Horizontal Scroll Controls ──────────────────────────────────────────
  const scrollGrid = (direction: 'left' | 'right') => {
    if (gridScrollRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      gridScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // ─── Tab 3: Dedicated Signature Desk Canvas Handlers ─────────────────────
  const startTabDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = tabCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setTabIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const tabDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!tabIsDrawing) return;
    const canvas = tabCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = tabPenColor;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopTabDrawing = () => {
    setTabIsDrawing(false);
  };

  const clearTabCanvas = () => {
    const canvas = tabCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleTabFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      enqueueSnackbar('Please upload a valid image file (PNG, JPG, SVG)', { variant: 'warning' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setUploadedSigPreview(result);
      enqueueSnackbar('Signature image loaded successfully! Click "Save & Set Active Signature" to apply.', { variant: 'info' });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveConfiguredSignature = async () => {
    let sigData = '';
    const userFullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || currentUserName || 'Staff Member';
    const signerName = tabTypedSigName || userFullName;

    if (tabSignatureMode === 'draw') {
      const canvas = tabCanvasRef.current;
      if (!canvas) {
        enqueueSnackbar('Canvas is not ready', { variant: 'error' });
        return;
      }
      sigData = canvas.toDataURL('image/png');
    } else if (tabSignatureMode === 'upload') {
      if (!uploadedSigPreview) {
        enqueueSnackbar('Please select an image file to upload first', { variant: 'warning' });
        return;
      }
      sigData = uploadedSigPreview;
    } else {
      sigData = generateTypedSignatureSvg(signerName, tabPenColor);
    }

    try {
      const res = await api.post('/hr/signatures/me', {
        signatureData: sigData,
        signatureType: tabSignatureMode,
        signatureName: signerName
      });
      setSavedSignature(res.data.data);
      try {
        localStorage.setItem('user_digital_signature', sigData);
      } catch (e) {}

      // Immediately synchronize active timesheet in state if it belongs to this user
      setActiveTimesheet((prev: any) => {
        if (!prev) return prev;
        const isUserMatch = (prev.empId && (prev.empId === currentEmpId || prev.empId === user?.id || prev.empId === (user as any)?.employeeId)) ||
                            (prev.name && (prev.name.toLowerCase() === userFullName.toLowerCase() || prev.name.toLowerCase() === signerName.toLowerCase()));
        if (!isUserMatch) return prev;
        return {
          ...prev,
          staffSignature: {
            ...prev.staffSignature,
            signed: true,
            signatureData: sigData,
            name: signerName,
            date: prev.staffSignature?.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          }
        };
      });

      // Synchronize in timesheets list state for only this user's records
      setTimesheets((prev) =>
        prev.map((ts) => {
          const isUserMatch = (ts.empId && (ts.empId === currentEmpId || ts.empId === user?.id || ts.empId === (user as any)?.employeeId)) ||
                              (ts.name && (ts.name.toLowerCase() === userFullName.toLowerCase() || ts.name.toLowerCase() === signerName.toLowerCase()));
          return isUserMatch
            ? {
                ...ts,
                staffSignature: {
                  ...ts.staffSignature,
                  signed: true,
                  signatureData: sigData,
                  name: signerName,
                  date: ts.staffSignature?.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                }
              }
            : ts;
        })
      );

      enqueueSnackbar('✓ Official Digital Signature saved & updated across your timesheets!', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar('Failed to save signature to server', { variant: 'error' });
    }
  };

  // ─── Modal Signature Canvas Handlers ─────────────────────────────────────
  const openSignModal = (role: 'staff' | 'coordinator' | 'admin') => {
    setSigningRole(role);
    setSignatureModalOpen(true);
    setTimeout(() => {
      clearCanvas();
    }, 150);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = signingRole === 'coordinator' ? '#0f766e' : signingRole === 'admin' ? '#047857' : '#1e3a8a';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const generateTypedSignatureSvg = (name: string, color = '#1e3a8a') => {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="60" viewBox="0 0 240 60"><text x="10" y="40" font-family="Brush Script MT, cursive, sans-serif" font-size="26" font-style="italic" fill="${encodeURIComponent(color)}">${encodeURIComponent(name)}</text><line x1="10" y1="46" x2="220" y2="46" stroke="${encodeURIComponent(color)}" stroke-width="1.5"/></svg>`;
  };

  const handleSaveSignature = async () => {
    let signatureDataUri = '';
    if (signatureType === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      signatureDataUri = canvas.toDataURL('image/png');
    } else {
      const name = typedSigName || activeTimesheet?.name || user?.firstName || 'Officer';
      const color = signingRole === 'coordinator' ? '#0f766e' : signingRole === 'admin' ? '#047857' : '#1e3a8a';
      signatureDataUri = generateTypedSignatureSvg(name, color);
    }

    if (!activeTimesheet?.id) return;

    try {
      if (signingRole === 'staff') {
        const res = await api.patch(`/hr/timesheets/${activeTimesheet.id}/submit`, {
          signatureData: signatureDataUri,
          staffName: activeTimesheet.name,
          supervisorName: selectedCoordinator,
          adminName: selectedAdmin
        });
        setActiveTimesheet(res.data.data);
        enqueueSnackbar(`Timesheet signed and routed to Supervisor: ${selectedCoordinator}`, { variant: 'success' });
      } else if (signingRole === 'coordinator') {
        const res = await api.patch(`/hr/timesheets/${activeTimesheet.id}/supervisor-sign`, {
          supervisorName: selectedCoordinator,
          signatureData: signatureDataUri,
          targetAdminName: selectedAdmin,
          comments: 'Approved and verified daily shift logs.'
        });
        setActiveTimesheet(res.data.data);
        enqueueSnackbar(`Approved & Signed by Supervisor! Forwarded to ${selectedAdmin}.`, { variant: 'success' });
      } else if (signingRole === 'admin') {
        const res = await api.patch(`/hr/timesheets/${activeTimesheet.id}/admin-sign`, {
          adminName: selectedAdmin,
          signatureData: signatureDataUri,
          comments: 'Hospital Administrator final sign-off authorized.'
        });
        setActiveTimesheet(res.data.data);
        enqueueSnackbar('Hospital Administrator / Bishop executive seal authorized!', { variant: 'success' });
      }
      setSignatureModalOpen(false);
      fetchTimesheets();
    } catch (err) {
      enqueueSnackbar('Failed to apply digital signature', { variant: 'error' });
    }
  };

  // ─── Staff / Admin: Submit & Route Timesheet ───────────────────────────────
  const handleSubmitTimesheetToSupervisor = async () => {
    if (!activeTimesheet) return;

    if (isAdminTimesheet) {
      // For Admin: Submits directly to the Catholic Diocesan Bishop!
      if (!savedSignature?.signatureData && !activeTimesheet.staffSignature?.signatureData) {
        enqueueSnackbar('⚠️ Digital Signature Required: Please configure your signature in "My Profile & Digital Signature" before submitting.', { variant: 'error' });
        setActiveTab(3);
        return;
      }
      const sigData = savedSignature?.signatureData || activeTimesheet.staffSignature?.signatureData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60"><path d="M15 25 C30 10, 45 40, 75 15 C95 35, 115 15, 140 25 C155 35, 175 15, 195 25" stroke="%23047857" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="15" y="52" font-family="Brush Script MT, cursive, sans-serif" font-size="22" font-style="italic" fill="%23047857">System Administrator</text></svg>';
      const targetBishop = selectedCoordinator && (selectedCoordinator.toLowerCase().includes('onaga') || selectedCoordinator.toLowerCase().includes('bishop') || selectedCoordinator.toLowerCase().includes('emmanuel'))
        ? selectedCoordinator
        : 'Most Rev. Dr. C.V.C. Onaga';

      try {
        const res = await api.patch(`/hr/timesheets/${activeTimesheet.id}/submit`, {
          signatureData: sigData,
          staffName: activeTimesheet.name || currentUserName,
          supervisorName: targetBishop,
          adminName: targetBishop,
          empId: activeTimesheet.empId || currentEmpId,
          month: selectedMonth,
          year: selectedYear,
          projectName: selectedProject || 'Hospital Administration, Governance & Clinical Oversight',
          department: activeTimesheet.department || 'Administration & Medical Direction',
          designation: activeTimesheet.designation || 'Hospital Administrator & Medical Director',
          comments: `Executive timesheet submitted for Diocesan Episcopal Review & Seal by ${targetBishop}.`
        });
        setActiveTimesheet(res.data.data);
        enqueueSnackbar(`✓ Timesheet submitted! Routed directly to the Catholic Diocesan Bishop (${targetBishop}) for episcopal seal.`, { variant: 'success' });
        await fetchTimesheets();
      } catch (err: any) {
        enqueueSnackbar('Failed to submit timesheet', { variant: 'error' });
      }
      return;
    }

    // Validation: Require Unit Supervisor / Lead selection
    if (!selectedCoordinator || selectedCoordinator.trim() === '') {
      enqueueSnackbar('⚠️ Unit Supervisor Required: Please select a "2. Unit Supervisor / Lead" before submitting your timesheet.', { variant: 'error' });
      return;
    }

    // Validation: Require Hospital Administrator / Bishop selection
    if (!selectedAdmin || selectedAdmin.trim() === '') {
      enqueueSnackbar('⚠️ Hospital Administrator / Bishop Required: Please select a "3. Hospital Administrator / Bishop" before submitting your timesheet.', { variant: 'error' });
      return;
    }

    if (!savedSignature?.signatureData && !activeTimesheet.staffSignature?.signatureData) {
      enqueueSnackbar('⚠️ Digital Signature Required: Please configure your signature in "My Profile & Digital Signature" before submitting.', { variant: 'error' });
      setActiveTab(3);
      return;
    }
    
    // Auto append user's configured signature
    const sigData = savedSignature?.signatureData || activeTimesheet.staffSignature?.signatureData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M15 30 C35 10, 55 40, 85 15 C105 35, 130 15, 145 28" stroke="%231e3a8a" stroke-width="2.5" fill="none"/></svg>';
    
    try {
      const res = await api.patch(`/hr/timesheets/${activeTimesheet.id}/submit`, {
        signatureData: sigData,
        staffName: activeTimesheet.name,
        supervisorName: selectedCoordinator,
        adminName: selectedAdmin,
        empId: activeTimesheet.empId || currentEmpId,
        month: selectedMonth,
        year: selectedYear,
        projectName: selectedProject,
        department: activeTimesheet.department,
        designation: activeTimesheet.designation,
        comments: `Submitted on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
      });
      setActiveTimesheet(res.data.data);
      enqueueSnackbar(`✓ Timesheet for ${selectedMonth} ${selectedYear} submitted! Sent to Supervisor: ${selectedCoordinator} for verification.`, { variant: 'success' });
      await fetchTimesheets();
    } catch (err: any) {
      enqueueSnackbar('Failed to submit timesheet', { variant: 'error' });
    }
  };

  // ─── Supervisor: Approve & Forward to Administrator / Bishop ──────────────
  const handleSupervisorApproveAndForward = async (tsId: string, supervisorName = selectedCoordinator, targetAdmin = selectedAdmin) => {
    const targetTs = timesheets.find(t => t.id === tsId) || activeTimesheet;
    if (isOwnTimesheetFor(targetTs) && !isSuperAdminOrBishop) {
      enqueueSnackbar('⚠️ Permission Denied: You cannot approve your own timesheet as supervisor.', { variant: 'error' });
      return;
    }
    if (!savedSignature?.signatureData) {
      enqueueSnackbar('⚠️ Signature Required: You must set up your digital signature in "My Profile & Digital Signature" before approving.', { variant: 'error' });
      setActiveTab(3);
      return;
    }
    try {
      const sigData = savedSignature.signatureData;
      const res = await api.patch(`/hr/timesheets/${tsId}/supervisor-sign`, {
        supervisorName,
        signatureData: sigData,
        targetAdminName: targetAdmin,
        comments: `Verified duty shifts and approved by ${supervisorName}. Forwarded for executive seal.`
      });
      if (activeTimesheet?.id === tsId) {
        setActiveTimesheet(res.data.data);
      }
      enqueueSnackbar(`✓ Approved by Supervisor (${supervisorName})! Forwarded to ${targetAdmin} for executive seal.`, { variant: 'success' });
      fetchTimesheets();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to approve timesheet as supervisor', { variant: 'error' });
    }
  };

  // ─── Hospital Administrator / Bishop: Authorize Executive Seal ────────────
  const handleAdminSealTimesheet = async (tsId: string, adminName = selectedAdmin) => {
    if (!savedSignature?.signatureData) {
      enqueueSnackbar('⚠️ Administrator Signature Required: Please upload/configure your digital signature in "My Profile & Digital Signature" tab before authorizing the executive seal.', { variant: 'error' });
      setActiveTab(3);
      return;
    }
    try {
      const effectiveAdmin = adminName || (isSuperAdminOrBishop ? currentUserName : 'Amedu Alapa');
      const isBishop = effectiveAdmin.toLowerCase().includes('bishop') || effectiveAdmin.toLowerCase().includes('most rev') || effectiveAdmin.toLowerCase().includes('fr.');
      const sigData = savedSignature.signatureData;
      
      const res = await api.patch(`/hr/timesheets/${tsId}/admin-sign`, {
        adminName: effectiveAdmin,
        signatureData: sigData,
        isBishop,
        comments: `Executive Seal Affixed and Authorized by ${effectiveAdmin}. Timesheet Archived.`
      });
      if (activeTimesheet?.id === tsId) {
        setActiveTimesheet(res.data.data);
      }
      if (selectedReviewTs?.id === tsId) {
        setSelectedReviewTs(res.data.data);
      }
      enqueueSnackbar(`✓ Official Executive Seal authorized by ${effectiveAdmin}! Timesheet is fully approved and archived.`, { variant: 'success' });
      fetchTimesheets();
    } catch (err) {
      enqueueSnackbar('Failed to authorize administrator seal', { variant: 'error' });
    }
  };

  // ─── Return Timesheet Dialog Handlers ─────────────────────────────────────
  const handleOpenReturnModal = (ts: any, role: 'Supervisor' | 'Hospital Administrator' | 'Bishop') => {
    setReturnTargetTs(ts);
    setReturnReviewerRole(role);
    setReturnReasonInput('');
    setReturnModalOpen(true);
  };

  const handleConfirmReturnTimesheet = async () => {
    if (!returnTargetTs?.id) return;
    if (!returnReasonInput.trim()) {
      enqueueSnackbar('Please provide a specific reason for returning the timesheet.', { variant: 'warning' });
      return;
    }

    const reviewerName = returnReviewerRole === 'Supervisor' ? selectedCoordinator : selectedAdmin;
    try {
      const res = await api.patch(`/hr/timesheets/${returnTargetTs.id}/reject`, {
        reason: returnReasonInput.trim(),
        returnedBy: reviewerName,
        returnedByRole: returnReviewerRole
      });
      if (activeTimesheet?.id === returnTargetTs.id) {
        setActiveTimesheet(res.data.data);
      }
      enqueueSnackbar(`Timesheet returned to ${returnTargetTs.name} with feedback notes.`, { variant: 'warning' });
      setReturnModalOpen(false);
      fetchTimesheets();
    } catch (err) {
      enqueueSnackbar('Failed to return timesheet', { variant: 'error' });
    }
  };

  // ─── Rejection Handler ───────────────────────────────────────────────────
  const handleRejectTimesheet = async () => {
    if (!activeTimesheet?.id) return;
    try {
      const res = await api.patch(`/hr/timesheets/${activeTimesheet.id}/reject`, {
        comments: rejectionReason || 'Hours require adjustment / correction'
      });
      setActiveTimesheet(res.data.data);
      enqueueSnackbar('Timesheet returned for correction.', { variant: 'warning' });
      setRejectDialogOpen(false);
      setRejectionReason('');
      fetchTimesheets();
    } catch (err) {
      enqueueSnackbar('Failed to reject timesheet', { variant: 'error' });
    }
  };

  // ─── Delete / Reset Handler ──────────────────────────────────────────────
  const handleDeleteTimesheet = async () => {
    if (!activeTimesheet?.id) return;
    try {
      await api.delete(`/hr/timesheets/${activeTimesheet.id}`);
      enqueueSnackbar('Timesheet deleted / draft reset successfully', { variant: 'info' });
      setDeleteConfirmOpen(false);
      fetchTimesheets();
    } catch (err) {
      enqueueSnackbar('Failed to delete timesheet', { variant: 'error' });
    }
  };

  // ─── Create New Timesheet ────────────────────────────────────────────────
  const handleCreateTimesheet = async () => {
    try {
      const res = await api.post('/hr/timesheets', {
        empId: newTsStaffId,
        month: newTsMonth,
        year: newTsYear,
        projectName: newTsProject,
        supervisorName: newTsCoordinator
      });
      enqueueSnackbar('New monthly timesheet generated successfully!', { variant: 'success' });
      setCreateDialogOpen(false);
      fetchTimesheets();
      if (res.data?.data) {
        setActiveTimesheet(res.data.data);
        setSelectedStaffId(res.data.data.empId);
      }
    } catch (err) {
      enqueueSnackbar('Failed to create timesheet', { variant: 'error' });
    }
  };

  // ─── Export to CSV / Excel ───────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!activeTimesheet) return;
    const days = currentGrid.days;
    let csv = `FAITH FOUNDATION MISSION HOSPITAL - MONTHLY TIME REPORT (${selectedMonth} ${selectedYear})\n`;
    csv += `Staff Name: ${activeTimesheet.name},Department: ${activeTimesheet.department},Designation: ${activeTimesheet.designation}\n`;
    csv += `Location: ${activeTimesheet.location},State: ${activeTimesheet.state},Project: ${selectedProject}\n\n`;
    
    // Header
    csv += `Category,` + days.map((d: any) => `${d.dayOfWeek} ${d.day}`).join(',') + `,Total Hours,Percentage\n`;
    
    // Primary Project Row
    csv += `"${selectedProject}",` + days.map((d: any) => d.isOffDuty || d.isWeekend ? 'OFF' : d.projectHours).join(',') + `,${currentGrid.totalProjectHours} hrs,${Math.round((currentGrid.totalProjectHours / maxExpectedHours) * 100)}%\n`;
    
    // Off days / Leave categories
    LEAVE_AND_OFF_CATEGORIES.forEach(catDef => {
      let hours = 0;
      if (catDef.key === 'ANNUAL') hours = currentGrid.totalAnnualLeaveHours || 0;
      else if (catDef.key === 'SICK') hours = currentGrid.totalSickLeaveHours || 0;
      else if (catDef.key === 'MATERNITY') hours = currentGrid.totalMaternityHours || 0;
      else if (catDef.key === 'PATERNITY') hours = currentGrid.totalPaternityHours || 0;
      else if (catDef.key === 'HOLIDAY') hours = currentGrid.totalHolidayHours || 0;
      else if (catDef.key === 'CASUAL') hours = currentGrid.totalCasualLeaveHours || 0;
      else if (catDef.key === 'COMPASSIONATE') hours = currentGrid.totalCompassionateLeaveHours || 0;
      else if (catDef.key === 'STUDY') hours = currentGrid.totalStudyLeaveHours || 0;
      else if (catDef.key === 'TRAINING') hours = currentGrid.totalTrainingHours || 0;

      csv += `"${catDef.label}",` + days.map((d: any) => {
        let cellHours = 0;
        if (catDef.key === 'ANNUAL') cellHours = d.annualLeave || 0;
        else if (catDef.key === 'SICK') cellHours = d.sickLeave || 0;
        else if (catDef.key === 'MATERNITY') cellHours = d.maternity || d.maternityLeave || 0;
        else if (catDef.key === 'PATERNITY') cellHours = d.paternityLeave || 0;
        else if (catDef.key === 'HOLIDAY') cellHours = d.holiday || 0;
        else if (catDef.key === 'CASUAL') cellHours = d.casualLeave || 0;
        else if (catDef.key === 'COMPASSIONATE') cellHours = d.compassionateLeave || 0;
        else if (catDef.key === 'STUDY') cellHours = d.studyLeave || 0;
        else if (catDef.key === 'TRAINING') cellHours = d.training || 0;
        return d.isOffDuty || d.isWeekend ? 'OFF' : (cellHours > 0 ? cellHours : '0');
      }).join(',') + `,${hours} hrs,${Math.round((hours / maxExpectedHours) * 100)}%\n`;
    });

    // Grand Total
    csv += `Total,` + days.map((d: any) => d.isOffDuty || d.isWeekend ? '' : d.totalDaily).join(',') + `,${currentGrid.totalHoursWorked} hrs,${complianceScore}%\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Timesheet_${activeTimesheet.name?.replace(/\s+/g, '_')}_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Timesheet exported to CSV successfully!', { variant: 'success' });
  };

  const handlePrint = () => {
    // ── Resolve the timesheet data to print ──────────────────────────────────
    const printDocTs = printPreviewTs || activeTimesheet;
    const isCashier = printDocTs?.designation?.toLowerCase().includes('cashier') || printDocTs?.projectName?.includes('Revenue');
    const printGrid = generateRosterGrid(
      printDocTs?.month || selectedMonth,
      Number(printDocTs?.year) || selectedYear,
      printDocTs?.projectName || selectedProject,
      isCashier ? 'cashier' : 'clinical',
      printDocTs?.empId || 'EMP-006',
      holidays,
      leaves,
      printDocTs?.department || 'Finance & Revenue'
    );
    const docMaxExp = printGrid.expectedShiftHours || 176;
    const days: any[] = printGrid.days || [];

    // ── Build the day-header row (day-of-week initial) ───────────────────────
    const dowHeaders = days.map((d: any) =>
      `<th style="background:${d.isWeekend ? '#000' : '#e2e8f0'};color:${d.isWeekend ? '#fff' : '#000'};padding:2px 1px;font-size:7pt;border:1px solid #000;">${d.dayOfWeek[0]}</th>`
    ).join('');

    // ── Build the day-number row ─────────────────────────────────────────────
    const dayNums = days.map((d: any) =>
      `<th style="background:${d.isWeekend ? '#000' : '#f8fafc'};color:${d.isWeekend ? '#fff' : '#000'};padding:2px 1px;font-size:7pt;border:1px solid #000;">${d.day}</th>`
    ).join('');

    // ── Build the primary project row ─────────────────────────────────────────
    const projectCells = days.map((d: any) => {
      const v = d.isOffDuty || d.isWeekend ? 'OFF' : (d.hoursWorked ?? d.projectHours ?? d.actualProjectHours ?? 0);
      return `<td style="background:${d.isWeekend ? '#000' : '#fff'};color:${d.isWeekend ? '#fff' : '#000'};padding:2px 1px;font-size:7pt;border:1px solid #000;text-align:center;">${d.isOffDuty || d.isWeekend ? 'OFF' : (Number(v) > 0 ? Number(v).toFixed(0) : '0')}</td>`;
    }).join('');

    // ── Build leave category rows ─────────────────────────────────────────────
    const leaveCategories = [
      { key: 'annual',        label: 'Annual leave',                    total: printGrid.totalAnnualLeaveHours || 0 },
      { key: 'sick',          label: 'Sick / Medical leave',            total: printGrid.totalSickLeaveHours || 0 },
      { key: 'maternity',     label: 'Maternity leave',                 total: printGrid.totalMaternityHours || 0 },
      { key: 'paternity',     label: 'Paternity leave',                 total: printGrid.totalPaternityHours || 0 },
      { key: 'holiday',       label: 'Holiday / Comp leave',            total: printGrid.totalHolidayHours || 0 },
      { key: 'casual',        label: 'Casual / Out-of-Office',          total: printGrid.totalCasualLeaveHours || 0 },
      { key: 'compassionate', label: 'Compassionate / Bereavement',     total: printGrid.totalCompassionateLeaveHours || 0 },
      { key: 'study',         label: 'Study & Examination leave',       total: printGrid.totalStudyLeaveHours || 0 },
      { key: 'training',      label: 'Training / Off-duty',             total: printGrid.totalTrainingHours || 0 },
    ];

    const leaveRows = leaveCategories.map(cat => {
      const cells = days.map((d: any) => {
        let h = (d.leaves && d.leaves[cat.key]) ?? d[cat.key + 'Leave'] ?? d[cat.key] ?? 0;
        if (!h && d.isLeave && d.shiftType?.toLowerCase().includes(cat.key)) h = d.expectedHours || 8;
        return `<td style="background:${d.isWeekend ? '#000' : '#fff'};color:${d.isWeekend ? '#fff' : '#000'};padding:2px 1px;font-size:7pt;border:1px solid #000;text-align:center;">${d.isWeekend ? '' : (h > 0 ? String(h) : '0')}</td>`;
      }).join('');
      const pct = docMaxExp > 0 ? Math.round((cat.total / docMaxExp) * 100) : 0;
      return `<tr>
        <td style="text-align:left;padding:2px 3px;font-size:7pt;border:1px solid #000;">${cat.label}</td>
        ${cells}
        <td style="font-weight:bold;padding:2px 1px;font-size:7pt;border:1px solid #000;text-align:center;">${cat.total}</td>
        <td style="font-weight:bold;padding:2px 1px;font-size:7pt;border:1px solid #000;text-align:center;">${pct}%</td>
      </tr>`;
    }).join('');

    // ── Build total row ───────────────────────────────────────────────────────
    const totalCells = days.map((d: any) => {
      const v = d.isOffDuty || d.isWeekend ? '' : (d.totalDaily ?? d.hoursWorked ?? d.projectHours ?? 0);
      return `<td style="background:${d.isWeekend ? '#000' : '#e2e8f0'};color:${d.isWeekend ? '#fff' : '#000'};font-weight:bold;padding:2px 1px;font-size:7pt;border:1px solid #000;text-align:center;">${v !== '' && v !== undefined ? (Number(v) > 0 ? Number(v).toFixed(0) : '0') : ''}</td>`;
    }).join('');

    // ── Signature placeholder text (actual images are injected via DOM after doc.close) ──
    // NOTE: Never embed base64 data URLs inside doc.write() HTML strings — special characters
    // (e.g. double-quotes in URL-encoded SVG) break HTML attribute parsing and show raw text.
    const staffSigPlaceholder  = printDocTs?.staffSignature?.signatureData  ? '' : 'Signed & Submitted';
    const supSigPlaceholder    = printDocTs?.supervisorSignature?.signatureData ? '' : (printDocTs?.supervisorSignature?.signed ? 'Supervisor Verified' : 'Pending Verification');
    const adminSigPlaceholder  = printDocTs?.adminSignature?.signatureData  ? '' : (printDocTs?.adminSignature?.signed ? 'Official Seal Authorized' : 'Pending Executive Seal');

    const totalHrs = Number(printGrid.totalHoursWorked || printGrid.totalProjectHours || 0).toFixed(0);
    const compPct = printDocTs?.compliancePercentage || Math.round(((printGrid.totalHoursWorked || 1) / (docMaxExp || 1)) * 100);

    // ── Remove old iframe ─────────────────────────────────────────────────────
    const existingIframe = document.getElementById('timesheet-print-frame');
    if (existingIframe) existingIframe.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'timesheet-print-frame';
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', visibility: 'hidden' });
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) { window.print(); return; }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Faith Foundation Hospital – Monthly Time Report</title>
  <style>
    @page { size: A4 landscape; margin: 6mm 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #000; }

    /* ── Wrapper: fixed to one page ── */
    .page {
      width: 100%;
      display: flex;
      flex-direction: column;
      page-break-after: avoid;
      page-break-inside: avoid;
    }

    /* ── Header ── */
    .hdr { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 4px; }
    .hdr-left  { flex: 1; font-size: 7.5pt; line-height: 1.4; }
    .hdr-mid   { flex: 1.4; text-align: center; }
    .hdr-mid .title { font-size: 9.5pt; font-weight: 900; letter-spacing: 0.04em; }
    .hdr-mid .sub   { font-size: 7.5pt; font-weight: 800; }
    .hdr-mid .cap   { font-size: 7pt; color: #475569; }
    .hdr-right { flex: 0.5; text-align: right; }
    .hdr-right img { width: 52px; height: 52px; object-fit: contain; border-radius: 6px; }

    /* ── Grid table ── */
    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 4px; }
    th, td { border: 1px solid #000; text-align: center; padding: 2px 1px; font-size: 7pt; line-height: 1.2; overflow: hidden; white-space: nowrap; }
    .col-label { text-align: left !important; padding: 2px 3px !important; font-size: 7pt; min-width: 90px; width: 90px; }
    .col-tot   { font-weight: bold; width: 28px; }
    .col-pct   { font-weight: bold; width: 24px; }
    .row-total td { background: #e2e8f0; font-weight: bold; }

    /* ── Signatures ── */
    .sigs { display: flex; gap: 6px; border-top: 1px solid #000; padding-top: 4px; margin-top: 2px; }
    .sig-col { flex: 1; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 4px; background: #fafafa; }
    .sig-col .lbl   { font-size: 7pt; color: #475569; font-weight: 700; display: block; }
    .sig-col .name  { font-size: 7.5pt; font-weight: 800; text-transform: uppercase; margin: 1px 0; }
    .sig-col .box   { height: 34px; border: 1px solid #999; background: #fff; display: flex; align-items: center; justify-content: center; margin: 2px 0; }
    .sig-col .date  { font-size: 6.5pt; color: #334155; }
    .sig-hdr { font-size: 7.5pt; font-weight: 800; margin-bottom: 3px; }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="hdr">
    <div class="hdr-left">
      <b>Name:</b> ${printDocTs?.name || ''}<br/>
      <b>Department:</b> ${printDocTs?.department || ''}<br/>
      <b>Designation:</b> ${printDocTs?.designation || ''}<br/>
      <b>Location:</b> ${printDocTs?.location || 'Faith Foundation Mission Hospital'}<br/>
      <b>State:</b> ${printDocTs?.state || 'Enugu'}
    </div>
    <div class="hdr-mid">
      <div class="title">FAITH FOUNDATION MISSION HOSPITAL</div>
      <div class="sub">Official Monthly Time Report (${printDocTs?.month || selectedMonth} ${printDocTs?.year || selectedYear})</div>
      <div class="cap">Staff Roster Attendance, Duty Shifts &amp; Project Activity Verification</div>
    </div>
    <div class="hdr-right">
      <img src={assetUrl('/hospital-logo.webp')} alt="Hospital Logo" />
    </div>
  </div>

  <!-- TIMESHEET GRID -->
  <table>
    <thead>
      <tr>
        <th class="col-label" style="background:#e2e8f0;">Project</th>
        ${dowHeaders}
        <th class="col-tot" style="background:#e2e8f0;">Total</th>
        <th class="col-pct" style="background:#e2e8f0;">%</th>
      </tr>
      <tr>
        <th class="col-label" style="background:#f8fafc;text-align:left;">${(printDocTs?.projectName || selectedProject).substring(0, 28)}</th>
        ${dayNums}
        <th class="col-tot" style="background:#f8fafc;">(hrs)</th>
        <th class="col-pct" style="background:#f8fafc;">(%)</th>
      </tr>
    </thead>
    <tbody>
      <!-- Primary project row -->
      <tr>
        <td class="col-label" style="font-weight:bold;">${(printDocTs?.projectName || selectedProject).substring(0, 28)}</td>
        ${projectCells}
        <td class="col-tot">${totalHrs}</td>
        <td class="col-pct">${compPct}%</td>
      </tr>
      <!-- Leave rows -->
      ${leaveRows}
      <!-- Total row -->
      <tr class="row-total">
        <td class="col-label">Total</td>
        ${totalCells}
        <td class="col-tot">${totalHrs}</td>
        <td class="col-pct">${compPct}%</td>
      </tr>
    </tbody>
  </table>

  <!-- SIGNATURES -->
  <div class="sig-hdr">Official Approval Signatures &amp; Authorization Seals</div>
  <div class="sigs">
    <div class="sig-col">
      <span class="lbl">Name of Staff</span>
      <div class="name">${printDocTs?.name || 'Staff Member'}</div>
      <div class="box" id="print-sig-staff"><span style="font-size:8pt;color:#64748b;">${staffSigPlaceholder}</span></div>
      <div class="date">Date: ${printDocTs?.staffSignature?.date || printDocTs?.submittedAt || '—'}</div>
    </div>
    <div class="sig-col">
      <span class="lbl">Name of Supervisor</span>
      <div class="name">${printDocTs?.supervisorSignature?.name || '—'}</div>
      <div class="box" id="print-sig-sup"><span style="font-size:8pt;color:#64748b;">${supSigPlaceholder}</span></div>
      <div class="date">Date: ${printDocTs?.supervisorSignature?.date || (printDocTs?.supervisorSignature?.signed ? '—' : 'Pending Verification')}</div>
    </div>
    <div class="sig-col">
      <span class="lbl">Name of Hospital Administrator / Bishop</span>
      <div class="name">${printDocTs?.adminSignature?.name || selectedAdmin || '—'}</div>
      <div class="box" id="print-sig-admin"><span style="font-size:8pt;color:#64748b;">${adminSigPlaceholder}</span></div>
      <div class="date">Date: ${printDocTs?.adminSignature?.date || (printDocTs?.adminSignature?.signed ? '—' : 'Pending Authorization')}</div>
    </div>
  </div>

</div>
</body>
</html>`);
    doc.close();

    // ── Inject signature images via DOM (safe: no HTML-string encoding needed) ─────────────
    const injectSig = (elId: string, dataUrl: string | undefined) => {
      if (!dataUrl) return;
      const box = doc.getElementById(elId);
      if (!box) return;
      box.innerHTML = ''; // clear placeholder text
      const img = doc.createElement('img');
      img.style.cssText = 'max-height:32px;max-width:140px;object-fit:contain;display:block;margin:0 auto;';
      img.src = dataUrl; // set via JS property — completely safe for any data URL
      box.appendChild(img);
    };

    injectSig('print-sig-staff', printDocTs?.staffSignature?.signatureData);
    injectSig('print-sig-sup',   printDocTs?.supervisorSignature?.signatureData);
    injectSig('print-sig-admin', printDocTs?.adminSignature?.signatureData);

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print iframe error', err);
      }
    }, 600);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <CircularProgress size={50} sx={{ color: COLORS.maroonPrimary }} />
        <Typography variant="h6" fontWeight={700} color={COLORS.maroonPrimary}>
          Loading Roster Shifts & Biometric Attendance Matrix...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* ─── Top Level Tab Navigation ────────────────────────────────────── */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            bgcolor: '#ffffff',
            borderRadius: 2,
            p: 0.5,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              borderRadius: 1.5,
              minHeight: 42,
              px: 2.5,
            },
            '& .Mui-selected': {
              bgcolor: alpha('#2563eb', 0.1),
              color: '#1e3a8a !important',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#2563eb',
              height: 3,
              borderRadius: 1.5
            }
          }}
        >
          <Tab icon={<DateRange sx={{ mr: 1, fontSize: 20 }} />} iconPosition="start" label="Monthly Timesheet Grid" />
          <Tab
            icon={
              <Badge badgeContent={pendingReviewBadgeCount} color="warning">
                <Shield sx={{ mr: 1, fontSize: 20 }} />
              </Badge>
            }
            iconPosition="start"
            label="Supervisor & Admin Review Desk"
          />
          <Tab
            icon={
              <Badge badgeContent={holidays.length + leaves.length} color="primary">
                <BeachAccess sx={{ mr: 1, fontSize: 20 }} />
              </Badge>
            }
            iconPosition="start"
            label="HR Holidays & Leave Management Desk"
          />
          <Tab
            icon={
              <Badge color={savedSignature ? 'success' : 'error'} variant="dot">
                <HistoryEdu sx={{ mr: 1, fontSize: 20 }} />
              </Badge>
            }
            iconPosition="start"
            label="My Profile & Digital Signature"
          />
        </Tabs>

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<Draw />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              bgcolor: '#2563eb',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: '#1d4ed8' }
            }}
          >
            New Timesheet Period
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchTimesheets}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 0: MONTHLY TIMESHEET GRID VIEW
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 0 && (
        <Box>
          {/* Top AppBar Banner (Exact replica of attendanceappmailtool-master header gradient) */}
          <Paper
            elevation={3}
            sx={{
              p: { xs: 2, md: 2.5 },
              mb: 2.5,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}
              >
                <Assignment sx={{ fontSize: 32, color: '#ffffff' }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
                  Timesheet
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                  Monthly Time & Activity Report • Faith Foundation Mission Hospital
                </Typography>
              </Box>
            </Box>

            {/* Top Action Icons */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Tooltip title="Download Official Landscape PDF">
                <IconButton
                  onClick={() => setPrintPreviewOpen(true)}
                  sx={{
                    color: '#ffffff',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                  }}
                >
                  <PictureAsPdf />
                </IconButton>
              </Tooltip>

              <Tooltip title="Export to Excel / CSV">
                <IconButton
                  onClick={handleExportCSV}
                  sx={{
                    color: '#ffffff',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                  }}
                >
                  <SaveAlt />
                </IconButton>
              </Tooltip>

              <Tooltip title="Print Slip View">
                <IconButton
                  onClick={handlePrint}
                  sx={{
                    color: '#ffffff',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                  }}
                >
                  <Print />
                </IconButton>
              </Tooltip>

              <Tooltip title="Delete / Reset Draft Timesheet">
                <IconButton
                  onClick={() => setDeleteConfirmOpen(true)}
                  sx={{
                    color: '#ffffff',
                    bgcolor: 'rgba(239, 68, 68, 0.3)',
                    '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.5)' }
                  }}
                >
                  <Delete />
                </IconButton>
              </Tooltip>

              <Chip
                label={
                  activeTimesheet?.status === 'APPROVED' ? 'APPROVED' :
                  activeTimesheet?.status === 'PENDING_ADMIN_APPROVAL' ? 'PENDING ADMIN SEAL' :
                  activeTimesheet?.status === 'SUBMITTED' ? 'SUBMITTED' :
                  activeTimesheet?.status === 'REJECTED' ? 'REJECTED (NEEDS REVISION)' : 'DRAFT'
                }
                sx={{
                  fontWeight: 800,
                  bgcolor:
                    activeTimesheet?.status === 'APPROVED' ? '#10b981' :
                    activeTimesheet?.status === 'PENDING_ADMIN_APPROVAL' ? '#f59e0b' :
                    activeTimesheet?.status === 'REJECTED' ? '#ef4444' : '#3b82f6',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  px: 1,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              />
            </Stack>
          </Paper>

          {/* ─── Returned for Correction Banner (if Rejected / Returned) ──── */}
          {(activeTimesheet?.status === 'REJECTED' || activeTimesheet?.returnInfo) && (
            <Alert
              severity="warning"
              icon={<WarningAmber sx={{ fontSize: 32, color: '#b45309' }} />}
              action={
                <Button
                  color="warning"
                  size="small"
                  variant="contained"
                  startIcon={<Send />}
                  onClick={handleSubmitTimesheetToSupervisor}
                  sx={{
                    bgcolor: '#b45309',
                    color: '#ffffff',
                    fontWeight: 800,
                    textTransform: 'none',
                    borderRadius: 1.5,
                    px: 2,
                    '&:hover': { bgcolor: '#92400e' }
                  }}
                >
                  Re-submit & Route to Supervisor
                </Button>
              }
              sx={{
                mb: 2.5,
                borderRadius: 2.5,
                border: '1.5px solid #f59e0b',
                bgcolor: '#fffbeb',
                p: 2,
                boxShadow: '0 2px 6px rgba(245,158,11,0.12)',
                '& .MuiAlert-message': { width: '100%' }
              }}
            >
              <Typography variant="subtitle1" fontWeight={800} color="#92400e">
                ⚠️ Timesheet Returned for Correction
              </Typography>
              <Typography variant="body2" color="#78350f" sx={{ mt: 0.5 }}>
                <b>Returned by:</b> {activeTimesheet.returnInfo?.returnedBy || activeTimesheet.supervisorSignature?.name || 'Reviewing Supervisor'} ({activeTimesheet.returnInfo?.returnedByRole || 'Reviewing Officer'}) on {activeTimesheet.returnInfo?.returnedAt || 'Recent review'}
              </Typography>
              <Box sx={{ mt: 1, p: 1.5, borderRadius: 1.5, bgcolor: '#ffffff', border: '1px dashed #f59e0b' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                  Reason for Return / Adjustment Instructions:
                </Typography>
                <Typography variant="body2" color="#92400e" fontWeight={700} sx={{ mt: 0.3 }}>
                  "{activeTimesheet.returnInfo?.reason || activeTimesheet.comments || 'Please verify and adjust shift hours, then re-submit.'}"
                </Typography>
              </Box>
            </Alert>
          )}

          {/* ─── Roster Shift & Compliance Summary Banner ──────────────────── */}
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: '#dbeafe', color: '#1e40af' }}>
                  <EventAvailable sx={{ fontSize: 26 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Assigned Roster Shifts
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#1e3a8a">
                    {totalAssignedShifts} Shifts <Typography component="span" variant="caption" color="text.secondary">({maxExpectedHours} hrs)</Typography>
                  </Typography>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: '#f1f5f9', color: '#475569' }}>
                  <FreeBreakfast sx={{ fontSize: 26 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Assigned Off-Duty Days
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#334155">
                    {totalAssignedOffDays} Rest Days <Typography component="span" variant="caption" color="text.secondary">(Scheduled)</Typography>
                  </Typography>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: '#dcfce7', color: '#15803d' }}>
                  <AccessTime sx={{ fontSize: 26 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Total Shift Hours Completed
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#16a34a">
                    {currentGrid.totalHoursWorked.toFixed(1)} hrs <Typography component="span" variant="caption" color="text.secondary">({completedShiftsCount} shifts)</Typography>
                  </Typography>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: '#22c55e', color: '#ffffff' }}>
                  <Verified sx={{ fontSize: 26 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="#166534" fontWeight={800}>
                    Shift Compliance Rate
                  </Typography>
                  <Typography variant="h6" fontWeight={900} color="#15803d">
                    {complianceScore}% COMPLIANT
                  </Typography>
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* ─── Staff Details & Meta Information Header ───────────────────── */}
          <Card
            elevation={2}
            sx={{
              p: 2.5,
              mb: 2.5,
              borderRadius: 2.5,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0'
            }}
          >
            {/* Task Summary Checkbox & Staff Switcher */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeTaskSummary}
                    onChange={(e) => setIncludeTaskSummary(e.target.checked)}
                    sx={{ color: COLORS.maroonPrimary, '&.Mui-checked': { color: COLORS.maroonPrimary } }}
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    Include Task Summary in Timesheet PDF
                  </Typography>
                }
              />

              {/* Logged-in Officer Profile Badge */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="body2" fontWeight={700} color="text.secondary">
                  Logged-in Officer:
                </Typography>
                <Chip
                  avatar={<Avatar sx={{ bgcolor: COLORS.maroonPrimary, color: '#fff', fontWeight: 800, width: 26, height: 26 }}>{(activeTimesheet?.name || currentUserName).charAt(0)}</Avatar>}
                  label={`${activeTimesheet?.name || currentUserName} (${activeTimesheet?.designation || (isSuperAdminOrBishop ? 'Hospital Administrator & Medical Director' : 'Senior Revenue Cashier')})`}
                  variant="outlined"
                  sx={{ fontWeight: 800, borderColor: '#cbd5e1', bgcolor: '#ffffff', py: 2.2, px: 0.5, borderRadius: 2 }}
                />
              </Stack>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Staff Bio Meta Rows */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Name:
                </Typography>
                <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                  {activeTimesheet?.name || 'Mary Okon'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6} md={2.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Department:
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  {activeTimesheet?.department || 'Finance & Revenue'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6} md={2.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Designation:
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  {activeTimesheet?.designation || 'Senior Cashier & Revenue Officer'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6} md={2.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Location:
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  {activeTimesheet?.location || 'Faith Foundation Mission Hospital'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6} md={1.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  State:
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  {activeTimesheet?.state || 'Enugu'}
                </Typography>
              </Grid>
            </Grid>

            {/* Month, Year & Period Selection Bar */}
            <Box
              sx={{
                mt: 2.5,
                p: 2,
                borderRadius: 2,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={700}>
                    Select Month:
                  </Typography>
                  <Select
                    size="small"
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    sx={{ minWidth: 130, fontWeight: 700, bgcolor: '#ffffff' }}
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </Select>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={700}>
                    Select Year:
                  </Typography>
                  <Select
                    size="small"
                    value={selectedYear}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    sx={{ minWidth: 100, fontWeight: 700, bgcolor: '#ffffff' }}
                  >
                    {[2026, 2025, 2024, 2023].map(y => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </Box>
              </Stack>

              {/* Roster Cycle Part Toggle */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight={700} color="text.secondary">
                  Timesheet Period:
                </Typography>
                <ButtonGroup size="small" variant="outlined">
                  <Button
                    variant={selectedPeriodPart === 1 ? 'contained' : 'outlined'}
                    onClick={() => setSelectedPeriodPart(1)}
                    sx={{
                      fontWeight: 700,
                      textTransform: 'none',
                      bgcolor: selectedPeriodPart === 1 ? '#2563eb' : 'transparent',
                      color: selectedPeriodPart === 1 ? '#ffffff' : '#2563eb',
                      borderColor: '#2563eb',
                      '&:hover': { bgcolor: selectedPeriodPart === 1 ? '#1d4ed8' : alpha('#2563eb', 0.1) }
                    }}
                  >
                    Full Calendar Month (1st – {currentGrid.totalDays}th)
                  </Button>
                  {/*
                  <Button
                    variant={selectedPeriodPart === 2 ? 'contained' : 'outlined'}
                    onClick={() => setSelectedPeriodPart(2)}
                    sx={{
                      fontWeight: 700,
                      textTransform: 'none',
                      bgcolor: selectedPeriodPart === 2 ? COLORS.maroonPrimary : 'transparent',
                      color: selectedPeriodPart === 2 ? '#ffffff' : COLORS.maroonPrimary,
                      borderColor: COLORS.maroonPrimary,
                      '&:hover': { bgcolor: selectedPeriodPart === 2 ? COLORS.maroonDark : alpha(COLORS.maroonPrimary, 0.1) }
                    }}
                  >
                    Roster Cycle (20th – 19th)
                  </Button>
                  */}
                </ButtonGroup>
              </Box>
            </Box>
          </Card>

          {/* ─── Horizontal Scroll Controllers ─────────────────────────────── */}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBackIos sx={{ fontSize: 13 }} />}
              onClick={() => scrollGrid('left')}
              sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
            >
              Scroll Left
            </Button>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Use arrow buttons or swipe horizontally to view all {currentGrid.totalDays} days in schedule
            </Typography>
            <Button
              variant="outlined"
              size="small"
              endIcon={<ArrowForwardIos sx={{ fontSize: 13 }} />}
              onClick={() => scrollGrid('right')}
              sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
            >
              Scroll Right
            </Button>
          </Box>

          {/* ═══════════════════════════════════════════════════════════════════
              THE FULL INTERACTIVE MATRIX GRID TABLE
              ═══════════════════════════════════════════════════════════════════ */}
          <Card
            elevation={3}
            sx={{
              borderRadius: 2.5,
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
              mb: 3
            }}
          >
            <Box
              ref={gridScrollRef}
              sx={{
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': { height: 10 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#94a3b8', borderRadius: 4 }
              }}
            >
              <Table
                size="small"
                sx={{
                  minWidth: (currentGrid.totalDays * 54) + 380,
                  borderCollapse: 'collapse',
                  '& th, & td': {
                    border: '1px solid #cbd5e1',
                    p: '4px 6px',
                    textAlign: 'center',
                    fontSize: '0.82rem'
                  }
                }}
              >
                {/* ─── Table Header Row 1: Days of Week (Sun, Mon, Tue...) ─── */}
                <TableHead>
                  <TableRow sx={{ bgcolor: COLORS.headerBlue }}>
                    {/* Fixed Project Name Column */}
                    <TableCell
                      sx={{
                        width: 220,
                        minWidth: 220,
                        fontWeight: 800,
                        textAlign: 'left !important',
                        pl: 2,
                        bgcolor: '#bae6fd !important',
                        color: '#0369a1',
                        position: 'sticky',
                        left: 0,
                        zIndex: 3,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.06)'
                      }}
                    >
                      Project Name
                    </TableCell>

                    {/* Day of Week Columns (Sun..Sat) */}
                    {currentGrid.days.map((d: any) => (
                      <TableCell
                        key={`dow-${d.day}`}
                        sx={{
                          width: 52,
                          minWidth: 52,
                          fontWeight: 800,
                          fontSize: '0.78rem !important',
                          bgcolor: d.isWeekend ? `${COLORS.weekendDark} !important` : '#e0f2fe',
                          color: d.isWeekend ? '#ffffff !important' : '#0f172a'
                        }}
                      >
                        {d.dayOfWeek}
                      </TableCell>
                    ))}

                    {/* Summary Columns */}
                    <TableCell sx={{ width: 90, minWidth: 90, fontWeight: 800, bgcolor: '#e0f2fe', color: '#0369a1' }}>
                      Total
                    </TableCell>
                    <TableCell sx={{ width: 80, minWidth: 80, fontWeight: 800, bgcolor: '#e0f2fe', color: '#0369a1' }}>
                      % Worked
                    </TableCell>
                  </TableRow>

                  {/* ─── Table Header Row 2: Day Numbers (1, 2, 3... 30) ─── */}
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        textAlign: 'left !important',
                        pl: 2,
                        bgcolor: '#f1f5f9 !important',
                        position: 'sticky',
                        left: 0,
                        zIndex: 3,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.06)'
                      }}
                    >
                      <Select
                        size="small"
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        variant="standard"
                        disableUnderline
                        sx={{ fontWeight: 800, fontSize: '0.85rem', color: COLORS.maroonPrimary, width: '100%' }}
                      >
                        {PROJECT_OPTIONS.map(p => (
                          <MenuItem key={p} value={p}>{p}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>

                    {currentGrid.days.map((d: any) => (
                      <TableCell
                        key={`daynum-${d.day}`}
                        sx={{
                          fontWeight: 800,
                          bgcolor: d.isWeekend ? `${COLORS.weekendDark} !important` : '#f8fafc',
                          color: d.isWeekend ? '#ffffff !important' : '#1e293b'
                        }}
                      >
                        {d.day}
                      </TableCell>
                    ))}

                    <TableCell sx={{ fontWeight: 800, bgcolor: '#f1f5f9', color: '#64748b' }}>
                      (hrs)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#f1f5f9', color: '#64748b' }}>
                      (%)
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {/* ─── Row 1: Expected Shift Hours (Roster Plan) ─────────── */}
                  <TableRow sx={{ bgcolor: '#f0f9ff', '&:hover': { bgcolor: '#e0f2fe' } }}>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        textAlign: 'left !important',
                        pl: 2,
                        color: '#0369a1',
                        bgcolor: '#e0f2fe !important',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.06)'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body2" fontWeight={800} color="#0369a1">
                            Expected Shift Hours
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Roster Shift Plan
                          </Typography>
                        </Box>
                        <Chip label="Plan" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#bae6fd', color: '#0369a1' }} />
                      </Box>
                    </TableCell>

                    {currentGrid.days.map((d: any) => {
                      const isOff = d.isOffDuty || d.isWeekend;
                      return (
                        <TableCell
                          key={`exp-day-${d.day}`}
                          sx={{
                            bgcolor: isOff ? '#f1f5f9' : '#f0f9ff',
                            color: isOff ? '#64748b' : '#0369a1'
                          }}
                        >
                          <Tooltip title={`Expected: ${d.shiftLabel} (${d.expectedHours || (isOff ? 0 : 8)}h)`}>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>
                              {isOff ? 'OFF' : `${(d.expectedHours || 8).toFixed(1)}`}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                      );
                    })}

                    {/* Expected Total & 100% Target */}
                    <TableCell sx={{ fontWeight: 800, color: '#0369a1', bgcolor: '#e0f2fe' }}>
                      {maxExpectedHours.toFixed(1)} hrs
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#0369a1', bgcolor: '#e0f2fe' }}>
                      100% Plan
                    </TableCell>
                  </TableRow>

                  {/* ─── Row 2: Actual Duty Hours Logged (Clock-In → Handover Closed) ─── */}
                  <TableRow sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        textAlign: 'left !important',
                        pl: 2,
                        color: COLORS.maroonPrimary,
                        bgcolor: '#ffffff !important',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.06)'
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={800} color={COLORS.maroonPrimary}>
                          {selectedProject}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700 }}>
                          Actual Worked & Closed to Date
                        </Typography>
                      </Box>
                    </TableCell>

                    {currentGrid.days.map((d: any) => {
                      const bgColor = getCellBgColor(d);
                      const isOff = d.isOffDuty || d.isWeekend;

                      return (
                        <TableCell
                          key={`proj-day-${d.day}`}
                          onClick={() => {
                            setSelectedDayAudit(d);
                            setDayAuditModalOpen(true);
                          }}
                          sx={{
                            bgcolor: bgColor,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            '&:hover': { outline: '2px solid #2563eb', bgcolor: alpha('#2563eb', 0.05) }
                          }}
                        >
                          <Tooltip title={
                            d.isFuture 
                              ? `Upcoming Roster Shift: Scheduled on ${d.date} (Awaiting Clock-in)`
                              : (d.shiftLabel || (isOff ? 'Roster Off-Duty Rest Day' : `Completed Shift: ${d.clockIn} – ${d.clockOut} (${d.projectHours}h)`))
                          }>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              {isOff ? (
                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, fontSize: '0.72rem' }}>
                                  OFF
                                </Typography>
                              ) : d.isFuture ? (
                                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.75rem' }}>
                                  —
                                </Typography>
                              ) : (
                                <>
                                  <Typography variant="body2" fontWeight={800} color="#2563eb">
                                    {d.projectHours.toFixed(1)}
                                  </Typography>
                                  {d.deductionHours > 0 && (
                                    <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 800, fontSize: '0.65rem', lineHeight: 1 }}>
                                      -{d.deductionHours.toFixed(1)}
                                    </Typography>
                                  )}
                                </>
                              )}
                            </Box>
                          </Tooltip>
                        </TableCell>
                      );
                    })}

                    {/* Total & Percentage */}
                    <TableCell sx={{ fontWeight: 800, color: '#16a34a', bgcolor: '#f0fdf4' }}>
                      {currentGrid.totalProjectHours.toFixed(1)} hrs
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#16a34a', bgcolor: '#f0fdf4' }}>
                      {maxExpectedHours > 0 ? Math.round((currentGrid.totalProjectHours / maxExpectedHours) * 100) : 0}%
                    </TableCell>
                  </TableRow>

                  {/* ─── Row 3: Shift Clock-In & Handover Record ───────────── */}
                  <TableRow sx={{ bgcolor: '#fafafa', '&:hover': { bgcolor: '#f1f5f9' } }}>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        textAlign: 'left !important',
                        pl: 2,
                        color: '#0f766e',
                        bgcolor: '#f0fdfa !important',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.06)'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body2" fontWeight={800} color="#0f766e">
                            Shift Clock-In & Handover
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Biometric / Till Session
                          </Typography>
                        </Box>
                        <Chip label="Audit" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#ccfbf1', color: '#0f766e' }} />
                      </Box>
                    </TableCell>

                    {currentGrid.days.map((d: any) => {
                      const isOff = d.isOffDuty || d.isWeekend;
                      return (
                        <TableCell
                          key={`shift-log-${d.day}`}
                          onClick={() => {
                            setSelectedDayAudit(d);
                            setDayAuditModalOpen(true);
                          }}
                          sx={{
                            p: '2px 4px !important',
                            bgcolor: isOff ? '#f1f5f9' : '#ffffff',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: '#ecfdf5' }
                          }}
                        >
                          <Tooltip title={
                            isOff
                              ? 'Roster Rest Day'
                              : d.isHoliday
                              ? 'Public Holiday'
                              : d.isFuture
                              ? `Upcoming Roster Shift (Awaiting Clock-in on ${d.date})`
                              : `Clocked in at ${d.clockIn}, Handed over at ${d.clockOut} (${d.handoverTo})`
                          }>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.2 }}>
                              {isOff ? (
                                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700 }}>
                                  OFF
                                </Typography>
                              ) : d.isHoliday ? (
                                <Chip label="Holiday" size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 800, bgcolor: '#dcfce7', color: '#15803d' }} />
                              ) : d.isLeave ? (
                                <Tooltip title={`Approved ${d.shiftLabel || 'Leave'} (${(d.annualLeave || d.sickLeave || d.maternity || d.paternityLeave || d.casualLeave || d.compassionateLeave || d.studyLeave || d.training || 8).toFixed(1)}h Credit Synced)`}>
                                  <Chip
                                    label={
                                      d.shiftType === 'ANNUAL' || d.shiftType === 'ANNUAL_LEAVE' ? '🏖️ Annual' :
                                      d.shiftType === 'SICK' ? '🏥 Sick' :
                                      d.shiftType === 'MATERNITY' ? '🍼 Maternity' :
                                      d.shiftType === 'PATERNITY' ? '👶 Paternity' :
                                      d.shiftType === 'HOLIDAY' ? '🎉 Holiday' :
                                      d.shiftType === 'CASUAL' ? '✈️ Casual' :
                                      d.shiftType === 'COMPASSIONATE' ? '🕊️ Bereave' :
                                      d.shiftType === 'STUDY' ? '📚 Study' : '🎓 Training'
                                    }
                                    size="small"
                                    sx={{
                                      height: 16,
                                      fontSize: '0.58rem',
                                      fontWeight: 800,
                                      bgcolor:
                                        d.shiftType === 'ANNUAL' || d.shiftType === 'ANNUAL_LEAVE' ? '#fef3c7' :
                                        d.shiftType === 'SICK' ? '#fee2e2' :
                                        d.shiftType === 'MATERNITY' ? '#fce7f3' :
                                        d.shiftType === 'PATERNITY' ? '#dbeafe' :
                                        d.shiftType === 'HOLIDAY' ? '#dcfce7' :
                                        d.shiftType === 'CASUAL' ? '#cffafe' :
                                        d.shiftType === 'COMPASSIONATE' ? '#f1f5f9' :
                                        d.shiftType === 'STUDY' ? '#d1fae5' : '#ede9fe',
                                      color:
                                        d.shiftType === 'ANNUAL' || d.shiftType === 'ANNUAL_LEAVE' ? '#b45309' :
                                        d.shiftType === 'SICK' ? '#991b1b' :
                                        d.shiftType === 'MATERNITY' ? '#9d174d' :
                                        d.shiftType === 'PATERNITY' ? '#1e40af' :
                                        d.shiftType === 'HOLIDAY' ? '#15803d' :
                                        d.shiftType === 'CASUAL' ? '#0e7490' :
                                        d.shiftType === 'COMPASSIONATE' ? '#475569' :
                                        d.shiftType === 'STUDY' ? '#065f46' : '#6b21a8'
                                    }}
                                  />
                                </Tooltip>
                              ) : d.isFuture ? (
                                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 600 }}>
                                  Pending In
                                </Typography>
                              ) : (
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="caption" sx={{ color: '#0f766e', fontSize: '0.68rem', fontWeight: 800, display: 'block', lineHeight: 1.1 }}>
                                    {d.clockIn.split(' ')[0]} - {d.clockOut.split(' ')[0]}
                                  </Typography>
                                  <Chip
                                    label="✓ Handover"
                                    size="small"
                                    sx={{ height: 14, fontSize: '0.55rem', fontWeight: 800, bgcolor: '#dcfce7', color: '#166534', mt: 0.2 }}
                                  />
                                </Box>
                              )}
                            </Box>
                          </Tooltip>
                        </TableCell>
                      );
                    })}

                    <TableCell sx={{ fontWeight: 800, color: '#0f766e', bgcolor: '#f0fdfa' }}>
                      {completedShiftsCount} Closed Shifts
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#0f766e', bgcolor: '#f0fdfa' }}>
                      100% Reconciled
                    </TableCell>
                  </TableRow>

                  {/* ─── Off-Day / Leave Categories Rows ────────────────────── */}
                  {LEAVE_AND_OFF_CATEGORIES.map(categoryDef => {
                    let categoryTotal = 0;
                    if (categoryDef.key === 'ANNUAL') categoryTotal = currentGrid.totalAnnualLeaveHours || 0;
                    else if (categoryDef.key === 'SICK') categoryTotal = currentGrid.totalSickLeaveHours || 0;
                    else if (categoryDef.key === 'MATERNITY') categoryTotal = currentGrid.totalMaternityHours || 0;
                    else if (categoryDef.key === 'PATERNITY') categoryTotal = currentGrid.totalPaternityHours || 0;
                    else if (categoryDef.key === 'HOLIDAY') categoryTotal = currentGrid.totalHolidayHours || 0;
                    else if (categoryDef.key === 'CASUAL') categoryTotal = currentGrid.totalCasualLeaveHours || 0;
                    else if (categoryDef.key === 'COMPASSIONATE') categoryTotal = currentGrid.totalCompassionateLeaveHours || 0;
                    else if (categoryDef.key === 'STUDY') categoryTotal = currentGrid.totalStudyLeaveHours || 0;
                    else if (categoryDef.key === 'TRAINING') categoryTotal = currentGrid.totalTrainingHours || 0;

                    const categoryPercent = maxExpectedHours > 0 ? Math.round((categoryTotal / maxExpectedHours) * 100) : 0;

                    return (
                      <TableRow key={categoryDef.key} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            textAlign: 'left !important',
                            pl: 2,
                            color: '#475569',
                            bgcolor: '#ffffff !important',
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                            boxShadow: '2px 0 4px rgba(0,0,0,0.06)'
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <span style={{ fontSize: '1rem' }}>{categoryDef.icon}</span>
                            <Typography variant="body2" fontWeight={categoryTotal > 0 ? 800 : 600} sx={{ color: categoryTotal > 0 ? categoryDef.color : '#475569' }}>
                              {categoryDef.label}
                            </Typography>
                          </Stack>
                        </TableCell>

                        {currentGrid.days.map((d: any) => {
                          let cellHours = 0;
                          if (categoryDef.key === 'ANNUAL') cellHours = d.annualLeave || (d.isLeave && (d.shiftType === 'ANNUAL' || d.shiftType === 'ANNUAL_LEAVE') ? 8 : 0);
                          else if (categoryDef.key === 'SICK') cellHours = d.sickLeave || (d.isLeave && d.shiftType === 'SICK' ? 8 : 0);
                          else if (categoryDef.key === 'MATERNITY') cellHours = d.maternity || d.maternityLeave || (d.isLeave && d.shiftType === 'MATERNITY' ? 8 : 0);
                          else if (categoryDef.key === 'PATERNITY') cellHours = d.paternityLeave || (d.isLeave && d.shiftType === 'PATERNITY' ? 8 : 0);
                          else if (categoryDef.key === 'HOLIDAY') cellHours = d.holiday || (d.isHoliday ? 8 : 0);
                          else if (categoryDef.key === 'CASUAL') cellHours = d.casualLeave || (d.isLeave && d.shiftType === 'CASUAL' ? 8 : 0);
                          else if (categoryDef.key === 'COMPASSIONATE') cellHours = d.compassionateLeave || (d.isLeave && d.shiftType === 'COMPASSIONATE' ? 8 : 0);
                          else if (categoryDef.key === 'STUDY') cellHours = d.studyLeave || (d.isLeave && d.shiftType === 'STUDY' ? 8 : 0);
                          else if (categoryDef.key === 'TRAINING') cellHours = d.training || (d.isLeave && d.shiftType === 'TRAINING' ? 8 : 0);

                          const hasHours = cellHours > 0;

                          return (
                            <TableCell
                              key={`${categoryDef.key}-${d.day}`}
                              sx={{
                                bgcolor: d.isOffDuty || d.isWeekend ? '#f1f5f9' : '#ffffff',
                                color: d.isOffDuty || d.isWeekend ? '#94a3b8' : '#2563eb'
                              }}
                            >
                              {d.isOffDuty || d.isWeekend ? (
                                ''
                              ) : hasHours ? (
                                <Tooltip title={`Approved ${categoryDef.label} (${cellHours.toFixed(1)}h Synced)`}>
                                  <Typography variant="body2" fontWeight={800} sx={{ color: categoryDef.color }}>
                                    {cellHours.toFixed(1)}
                                  </Typography>
                                </Tooltip>
                              ) : (
                                <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                                  0.0
                                </Typography>
                              )}
                            </TableCell>
                          );
                        })}

                        <TableCell sx={{ fontWeight: 800, color: categoryTotal > 0 ? categoryDef.color : '#64748b', bgcolor: categoryTotal > 0 ? categoryDef.bg : '#f8fafc' }}>
                          {categoryTotal.toFixed(1)} hrs
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: categoryTotal > 0 ? categoryDef.color : '#64748b', bgcolor: categoryTotal > 0 ? categoryDef.bg : '#f8fafc' }}>
                          {categoryPercent}%
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* ─── Grand Total Summary Row ───────────────────────────── */}
                  <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #94a3b8' }}>
                    <TableCell
                      sx={{
                        fontWeight: 900,
                        fontSize: '1rem !important',
                        textAlign: 'left !important',
                        pl: 2,
                        color: '#0f172a',
                        bgcolor: '#f1f5f9 !important',
                        position: 'sticky',
                        left: 0,
                        zIndex: 3,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.08)'
                      }}
                    >
                      Total Actual Logged
                    </TableCell>

                    {currentGrid.days.map((d: any) => (
                      <TableCell
                        key={`total-day-${d.day}`}
                        sx={{
                          fontWeight: 800,
                          bgcolor: d.isOffDuty || d.isWeekend ? '#f1f5f9' : (d.isFuture ? '#fafafa' : '#ffffff'),
                          color: '#0f172a'
                        }}
                      >
                        {d.isOffDuty || d.isWeekend ? '' : (d.isFuture ? '—' : d.totalDaily.toFixed(1))}
                      </TableCell>
                    ))}

                    <TableCell sx={{ fontWeight: 900, fontSize: '0.95rem', color: '#16a34a', bgcolor: '#dcfce7' }}>
                      {currentGrid.totalHoursWorked.toFixed(1)} hrs
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: '0.95rem', color: '#16a34a', bgcolor: '#dcfce7' }}>
                      {complianceScore}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Card>

          {/* ─── Deductions & Adjustments Summary Section ───────────────────── */}
          {deductionsSummary.length > 0 && (
            <Card elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 2.5, bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <WarningAmber sx={{ color: '#d97706', fontSize: 24 }} />
                <Typography variant="subtitle1" fontWeight={800} color="#92400e">
                  Deductions & Adjustments Summary
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" fontWeight={700} color="text.secondary">
                  Total Hours Recommended for Deduction:
                </Typography>
                <Chip
                  label={`-${totalDeductedHours.toFixed(1)} hrs`}
                  sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 800, fontSize: '0.85rem' }}
                />
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              <Stack spacing={1}>
                {deductionsSummary.map((d: any, idx: number) => (
                  <Box
                    key={`ded-${idx}`}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1.2,
                      bgcolor: '#ffffff',
                      borderRadius: 1.5,
                      border: '1px solid #fef3c7'
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {d.date} ({d.dayOfWeek}): {d.deductionNote || 'Attendance biometric variance'}
                    </Typography>
                    <Typography variant="body2" fontWeight={800} color="#dc2626">
                      -{d.deductionHours.toFixed(1)} hrs
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TRIPLE SIGNATURES & MULTI-LEVEL APPROVAL WORKFLOW
              ═══════════════════════════════════════════════════════════════════ */}
          <Card elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="h6" fontWeight={800} color={COLORS.maroonPrimary}>
                  Signatures & Multi-Tier Approval Workflow
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  3-Stage Verification: Staff Submission ➔ Unit Supervisor Review ➔ Hospital Administrator / Bishop Official Seal
                </Typography>
              </Box>

              <Button
                size="small"
                variant="outlined"
                startIcon={<HistoryEdu />}
                onClick={() => setActiveTab(3)}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, borderColor: COLORS.maroonPrimary, color: COLORS.maroonPrimary }}
              >
                Configure My Signature Tab
              </Button>
            </Box>

            <Grid container spacing={3}>
              {/* ─── Tier 1: Staff / Administrator Officer Signature ─────────────── */}
              <Grid item xs={12} md={4}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    height: '100%',
                    bgcolor: activeTimesheet?.staffSignature?.signed ? '#f8fafc' : '#ffffff',
                    borderColor: activeTimesheet?.staffSignature?.signed ? '#cbd5e1' : '#e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                        {isAdminTimesheet ? '1. Hospital Administrator (Officer)' : '1. Staff Officer'}
                      </Typography>
                      <Chip
                        size="small"
                        label={
                          activeTimesheet?.status === 'APPROVED' ? 'Approved' :
                          activeTimesheet?.status === 'PENDING_ADMIN_APPROVAL' ? (isAdminTimesheet ? 'At Bishop Desk' : 'At Admin Desk') :
                          activeTimesheet?.status === 'SUBMITTED' ? (isAdminTimesheet ? 'At Bishop Desk' : 'At Supervisor Desk') :
                          activeTimesheet?.status === 'REJECTED' ? 'Returned' : 'Draft'
                        }
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.7rem',
                          height: 22,
                          bgcolor:
                            activeTimesheet?.status === 'APPROVED' ? '#dcfce7' :
                            activeTimesheet?.status === 'PENDING_ADMIN_APPROVAL' ? '#fef3c7' :
                            activeTimesheet?.status === 'SUBMITTED' ? '#e0f2fe' :
                            activeTimesheet?.status === 'REJECTED' ? '#fee2e2' : '#f1f5f9',
                          color:
                            activeTimesheet?.status === 'APPROVED' ? '#16a34a' :
                            activeTimesheet?.status === 'PENDING_ADMIN_APPROVAL' ? '#d97706' :
                            activeTimesheet?.status === 'SUBMITTED' ? '#0284c7' :
                            activeTimesheet?.status === 'REJECTED' ? '#dc2626' : '#64748b'
                        }}
                      />
                    </Box>

                    <Typography variant="subtitle1" fontWeight={800} color="text.primary" sx={{ mb: 0.5 }}>
                      {activeTimesheet?.name?.toUpperCase() || (isAdminTimesheet ? 'SYSTEM ADMINISTRATOR' : 'MARY OKON')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                      {activeTimesheet?.designation || (isAdminTimesheet ? 'Hospital Administrator & Medical Director' : 'Staff Officer')}
                    </Typography>

                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      Configured Digital Signature
                    </Typography>
                    <Box
                      sx={{
                        my: 1,
                        minHeight: 68,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#ffffff',
                        border: '1px dashed #cbd5e1',
                        borderRadius: 1.5,
                        p: 1
                      }}
                    >
                      {savedSignature?.signatureData || activeTimesheet?.staffSignature?.signatureData ? (
                        <img
                          src={savedSignature?.signatureData || activeTimesheet?.staffSignature?.signatureData}
                          alt="Staff Signature"
                          style={{ maxHeight: 52, maxWidth: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary" fontStyle="italic">
                          No Digital Signature Configured
                        </Typography>
                      )}
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Date: <b>{activeTimesheet?.staffSignature?.signed ? (activeTimesheet?.staffSignature?.date || activeTimesheet?.submittedAt || `${selectedMonth} 13, ${selectedYear}`) : 'Draft (Not Submitted)'}</b>
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    {activeTimesheet?.status === 'DRAFT' || activeTimesheet?.status === 'REJECTED' || !activeTimesheet?.status ? (
                      <Stack spacing={1}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<Send />}
                          onClick={handleSubmitTimesheetToSupervisor}
                          sx={{
                            bgcolor: COLORS.maroonPrimary,
                            color: '#ffffff',
                            fontWeight: 800,
                            textTransform: 'none',
                            borderRadius: 1.5,
                            py: 1,
                            '&:hover': { bgcolor: COLORS.maroonDark }
                          }}
                        >
                          {isAdminTimesheet
                            ? (activeTimesheet?.status === 'REJECTED' ? 'Re-submit to Bishop for Seal' : 'Submit to Bishop for Approval & Seal')
                            : (activeTimesheet?.status === 'REJECTED' ? 'Re-submit & Route to Supervisor' : 'Submit & Route to Supervisor')}
                        </Button>
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          startIcon={<Draw />}
                          onClick={() => setActiveTab(3)}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                        >
                          Custom Draw & Sign
                        </Button>
                      </Stack>
                    ) : (
                      <Button
                        fullWidth
                        variant="outlined"
                        disabled
                        startIcon={<CheckCircle />}
                        sx={{ fontWeight: 700, borderRadius: 1.5, color: '#16a34a !important', borderColor: '#86efac !important', bgcolor: '#f0fdf4' }}
                      >
                        {isAdminTimesheet ? '✓ Timesheet Submitted to Bishop' : '✓ Timesheet Submitted & Signed'}
                      </Button>
                    )}
                  </Box>
                </Card>
              </Grid>

              {/* ─── Tier 2: Unit Supervisor OR Diocesan Bishop Signature ───── */}
              <Grid item xs={12} md={4}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    height: '100%',
                    bgcolor: activeTimesheet?.supervisorSignature?.signed ? '#f8fafc' : activeTimesheet?.status === 'SUBMITTED' ? '#fffbeb' : '#ffffff',
                    borderColor: activeTimesheet?.supervisorSignature?.signed ? '#cbd5e1' : activeTimesheet?.status === 'SUBMITTED' ? '#fde68a' : '#e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                        {isAdminTimesheet ? '2. Catholic Diocesan Bishop & Patron' : '2. Unit Supervisor / Lead'}
                      </Typography>
                      {activeTimesheet?.status === 'SUBMITTED' && (
                        <Chip
                          label={isAdminTimesheet ? 'Awaiting Bishop Seal' : (isSupervisorAuthorized ? 'Needs Your Review' : 'Awaiting Supervisor Review')}
                          size="small"
                          sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 800, fontSize: '0.7rem', height: 22 }}
                        />
                      )}
                    </Box>
                    
                    <Select
                      size="small"
                      fullWidth
                      value={selectedCoordinator}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCoordinator(val);
                        if (activeTimesheet) {
                          setActiveTimesheet((prev: any) => ({
                            ...prev,
                            supervisorSignature: {
                              ...(prev?.supervisorSignature || {}),
                              name: val
                            }
                          }));
                        }
                      }}
                      disabled={Boolean(
                        activeTimesheet?.staffSignature?.signed ||
                        activeTimesheet?.supervisorSignature?.signed ||
                        (activeTimesheet?.status && activeTimesheet?.status !== 'DRAFT' && activeTimesheet?.status !== 'REJECTED')
                      )}
                      sx={{
                        mb: 1.5,
                        fontWeight: 700,
                        bgcolor: (activeTimesheet?.staffSignature?.signed || (activeTimesheet?.status && activeTimesheet?.status !== 'DRAFT' && activeTimesheet?.status !== 'REJECTED')) ? '#f8fafc' : '#ffffff',
                        '&.Mui-disabled': {
                          bgcolor: '#f8fafc',
                          color: '#475569'
                        }
                      }}
                    >
                      {isAdminTimesheet ? (
                        BISHOP_OPTIONS.map((b) => (
                          <MenuItem key={b.id || b.name} value={b.name}>
                            {b.name} ({b.title})
                          </MenuItem>
                        ))
                      ) : (
                        ELIGIBLE_SUPERVISORS.map((s) => (
                          <MenuItem key={s.id || s.name} value={s.name}>
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={700} noWrap>{s.name}</Typography>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.68rem' }}>{s.role}</Typography>
                              </Box>
                              <Chip
                                label={s.type === 'PRIMARY' ? 'Direct Primary' : s.type === 'SECONDARY' ? 'Secondary / Line' : 'Supervisor'}
                                size="small"
                                color={s.type === 'PRIMARY' ? 'primary' : s.type === 'SECONDARY' ? 'secondary' : 'default'}
                                sx={{ fontSize: '0.62rem', height: 18, fontWeight: 800, flexShrink: 0 }}
                              />
                            </Stack>
                          </MenuItem>
                        ))
                      )}
                      {!isAdminTimesheet && !ELIGIBLE_SUPERVISORS.some(s => s.name === selectedCoordinator) && selectedCoordinator && (
                        <MenuItem value={selectedCoordinator}>
                          {selectedCoordinator}
                        </MenuItem>
                      )}
                    </Select>

                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      {isAdminTimesheet ? 'Episcopal Authorization & Seal Status' : 'Supervisor Signature / Status'}
                    </Typography>
                    <Box
                      sx={{
                        my: 1,
                        minHeight: 68,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#ffffff',
                        border: '1px dashed #cbd5e1',
                        borderRadius: 1.5,
                        p: 1
                      }}
                    >
                      {activeTimesheet?.supervisorSignature?.signed ? (
                        <Box sx={{ textAlign: 'center' }}>
                          <img
                            src={activeTimesheet.supervisorSignature.signatureData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60"><text x="10" y="40" font-family="Brush Script MT, cursive, sans-serif" font-size="24" font-style="italic" fill="%235c1a2e">+ Most Rev. C.V.C. Onaga</text></svg>'}
                            alt="Bishop Signature"
                            style={{ maxHeight: 44, maxWidth: '100%', objectFit: 'contain' }}
                          />
                          <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                            <CheckCircle sx={{ fontSize: 16, color: '#16a34a' }} />
                            <Typography variant="caption" fontWeight={800} color="#16a34a">
                              {isAdminTimesheet ? 'Episcopal Seal Authorized & Approved' : 'Supervisor Approved'}
                            </Typography>
                          </Stack>
                        </Box>
                      ) : activeTimesheet?.status === 'REJECTED' ? (
                        <Box sx={{ textAlign: 'center' }}>
                          <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                            <Cancel sx={{ fontSize: 16, color: '#dc2626' }} />
                            <Typography variant="caption" fontWeight={800} color="#dc2626">
                              Returned for Correction
                            </Typography>
                          </Stack>
                        </Box>
                      ) : activeTimesheet?.status === 'SUBMITTED' ? (
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" fontWeight={700} color="#d97706">
                            {isAdminTimesheet ? 'Awaiting Catholic Diocesan Bishop Approval & Seal' : 'Awaiting Supervisor Approval'}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary" fontStyle="italic">
                          {isAdminTimesheet ? 'Awaiting Administrator Submission First' : 'Awaiting Staff Submission First'}
                        </Typography>
                      )}
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Date: <b>{activeTimesheet?.supervisorSignature?.signed ? (activeTimesheet?.supervisorSignature?.date || 'Verified') : (isAdminTimesheet ? 'Pending Bishop Seal' : 'Pending Supervisor Approval')}</b>
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    {isAdminTimesheet ? (
                      /* Episcopal Action Restriction for Admin's own timesheet */
                      <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                        <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="center">
                          <Lock sx={{ color: '#64748b', fontSize: 18 }} />
                          <Typography variant="caption" fontWeight={800} color="text.secondary">
                            Episcopal Seal Restricted
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', display: 'block', mt: 0.3 }}>
                          Authorized only by Catholic Diocesan Bishop & Patron (+ Most Rev. Dr. C.V.C. Onaga)
                        </Typography>
                      </Box>
                    ) : !isSupervisorAuthorized ? (
                      /* Staff member cannot approve their own timesheet / Unauthorized users restricted */
                      <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                        <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="center">
                          <Lock sx={{ color: '#64748b', fontSize: 18 }} />
                          <Typography variant="caption" fontWeight={800} color="text.secondary">
                            Supervisor Action Restricted
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', display: 'block', mt: 0.3 }}>
                          {isOwnTimesheet
                            ? `Awaiting review & signature by Unit Supervisor (${selectedCoordinator || 'Chinedu Okafor'})`
                            : `Authorized only by Unit Supervisor (${selectedCoordinator || 'Chinedu Okafor'})`}
                        </Typography>
                      </Box>
                    ) : activeTimesheet?.status === 'SUBMITTED' ? (
                      <Stack direction="row" spacing={1}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="success"
                          startIcon={<Check />}
                          onClick={() => handleSupervisorApproveAndForward(activeTimesheet.id, selectedCoordinator, selectedAdmin)}
                          sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 1.5 }}
                        >
                          Approve & Forward
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<Reply />}
                          onClick={() => handleOpenReturnModal(activeTimesheet, 'Supervisor')}
                          sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 1.5, px: 2 }}
                        >
                          Return
                        </Button>
                      </Stack>
                    ) : activeTimesheet?.supervisorSignature?.signed ? (
                      <Button
                        fullWidth
                        variant="outlined"
                        disabled
                        startIcon={<CheckCircle />}
                        sx={{ fontWeight: 700, borderRadius: 1.5, color: '#16a34a !important', borderColor: '#86efac !important', bgcolor: '#f0fdf4' }}
                      >
                        Supervisor Verified & Forwarded
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        variant="outlined"
                        disabled
                        sx={{ fontWeight: 600, borderRadius: 1.5 }}
                      >
                        Awaiting Submission
                      </Button>
                    )}
                  </Box>
                </Card>
              </Grid>

              {/* ─── Tier 3: Caritas / Hospital Administrator & Bishop Signature ─ */}
              <Grid item xs={12} md={4}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    height: '100%',
                    bgcolor: activeTimesheet?.adminSignature?.signed ? '#f8fafc' : activeTimesheet?.status === 'PENDING_ADMIN_APPROVAL' ? '#f0fdf4' : '#ffffff',
                    borderColor: activeTimesheet?.adminSignature?.signed ? '#cbd5e1' : activeTimesheet?.status === 'PENDING_ADMIN_APPROVAL' ? '#86efac' : '#e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                        {isAdminTimesheet ? '3. Diocesan Chancellery & Archive' : '3. Hospital Administrator / Bishop'}
                      </Typography>
                      {activeTimesheet?.status === 'PENDING_ADMIN_APPROVAL' && (
                        <Chip label="Ready for Seal" size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.7rem', height: 22 }} />
                      )}
                    </Box>

                    {isAdminTimesheet ? (
                      <Box sx={{ mb: 1.5, p: 1, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" fontWeight={800} color="#047857">
                          Catholic Diocesan Health Commission Registry
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '11px' }}>
                          Permanent Archival & Canonical Compliance
                        </Typography>
                      </Box>
                    ) : (
                      <Select
                        size="small"
                        fullWidth
                        value={selectedAdmin}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedAdmin(val);
                          if (activeTimesheet) {
                            setActiveTimesheet((prev: any) => ({
                              ...prev,
                              adminSignature: {
                                ...(prev?.adminSignature || {}),
                                name: val
                              }
                            }));
                          }
                        }}
                        disabled={Boolean(
                          activeTimesheet?.staffSignature?.signed ||
                          activeTimesheet?.adminSignature?.signed ||
                          (activeTimesheet?.status && activeTimesheet?.status !== 'DRAFT' && activeTimesheet?.status !== 'REJECTED')
                        )}
                        sx={{
                          mb: 1.5,
                          fontWeight: 700,
                          bgcolor: (activeTimesheet?.staffSignature?.signed || (activeTimesheet?.status && activeTimesheet?.status !== 'DRAFT' && activeTimesheet?.status !== 'REJECTED')) ? '#f8fafc' : '#ffffff',
                          '&.Mui-disabled': {
                            bgcolor: '#f8fafc',
                            color: '#475569'
                          }
                        }}
                      >
                        {EXECUTIVE_ADMIN_OPTIONS.map((a) => (
                          <MenuItem key={a.id || a.name} value={a.name}>
                            {a.name} ({a.title})
                          </MenuItem>
                        ))}
                        {!EXECUTIVE_ADMIN_OPTIONS.some(a => a.name === selectedAdmin) && selectedAdmin && (
                          <MenuItem value={selectedAdmin}>
                            {selectedAdmin}
                          </MenuItem>
                        )}
                      </Select>
                    )}

                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      {isAdminTimesheet ? 'Archival Seal & Diocesan Registry' : 'Administrator Seal & Signature'}
                    </Typography>
                    <Box
                      sx={{
                        my: 1,
                        minHeight: 68,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#ffffff',
                        border: '1px dashed #cbd5e1',
                        borderRadius: 1.5,
                        p: 1
                      }}
                    >
                      {activeTimesheet?.adminSignature?.signed || (isAdminTimesheet && activeTimesheet?.supervisorSignature?.signed) ? (
                        <Box sx={{ textAlign: 'center' }}>
                          <img
                            src={activeTimesheet?.adminSignature?.signatureData || activeTimesheet?.supervisorSignature?.signatureData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><path d="M15 20 Q40 5 60 30 T110 20 T145 30" stroke="%23047857" stroke-width="2.5" fill="none"/></svg>'}
                            alt="Admin Signature Seal"
                            style={{ maxHeight: 44, maxWidth: '100%', objectFit: 'contain' }}
                          />
                          <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                            <CheckCircle sx={{ fontSize: 16, color: '#047857' }} />
                            <Typography variant="caption" fontWeight={800} color="#047857">
                              {isAdminTimesheet ? 'Official Diocesan Archive Record Sealed' : 'Official Seal Authorized'}
                            </Typography>
                          </Stack>
                        </Box>
                      ) : activeTimesheet?.status === 'PENDING_ADMIN_APPROVAL' ? (
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" fontWeight={700} color="#059669">
                            Ready for Executive Seal Authorization
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary" fontStyle="italic">
                          {isAdminTimesheet ? 'Archiving follows Episcopal Seal Authorization' : 'Awaiting Supervisor Approval First'}
                        </Typography>
                      )}
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Date: <b>{activeTimesheet?.adminSignature?.signed || (isAdminTimesheet && activeTimesheet?.supervisorSignature?.signed) ? (activeTimesheet?.adminSignature?.date || activeTimesheet?.supervisorSignature?.date || 'Authorized') : (isAdminTimesheet ? 'Automatic Registry Archival' : 'Pending Executive Seal')}</b>
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    {isAdminTimesheet ? (
                      <Button
                        fullWidth
                        variant="outlined"
                        disabled
                        startIcon={<Shield />}
                        sx={{ fontWeight: 700, borderRadius: 1.5, color: '#047857 !important', borderColor: '#86efac !important', bgcolor: '#f0fdf4' }}
                      >
                        ✓ Diocesan Registry Verified
                      </Button>
                    ) : !isSuperAdminOrBishop ? (
                      /* Non-admins/regular staff cannot authorize administrator seal */
                      <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                        <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="center">
                          <Lock sx={{ color: '#64748b', fontSize: 18 }} />
                          <Typography variant="caption" fontWeight={800} color="text.secondary">
                            Executive Seal Restricted
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', display: 'block', mt: 0.3 }}>
                          Authorized only by Hospital Administrator / Bishop
                        </Typography>
                      </Box>
                    ) : activeTimesheet?.status === 'PENDING_ADMIN_APPROVAL' ? (
                      <Stack direction="row" spacing={1}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<Shield />}
                          onClick={() => handleAdminSealTimesheet(activeTimesheet.id, selectedAdmin)}
                          sx={{
                            bgcolor: '#047857',
                            color: '#ffffff',
                            fontWeight: 800,
                            textTransform: 'none',
                            borderRadius: 1.5,
                            '&:hover': { bgcolor: '#065f46' }
                          }}
                        >
                          Authorize Seal
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<Reply />}
                          onClick={() => handleOpenReturnModal(activeTimesheet, selectedAdmin.toLowerCase().includes('bishop') ? 'Bishop' : 'Hospital Administrator')}
                          sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 1.5, px: 2 }}
                        >
                          Return
                        </Button>
                      </Stack>
                    ) : activeTimesheet?.adminSignature?.signed ? (
                      <Button
                        fullWidth
                        variant="outlined"
                        disabled
                        startIcon={<CheckCircle />}
                        sx={{ fontWeight: 700, borderRadius: 1.5, color: '#047857 !important', borderColor: '#86efac !important', bgcolor: '#f0fdf4' }}
                      >
                        Official Hospital Seal Authorized
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        variant="outlined"
                        disabled
                        sx={{ fontWeight: 600, borderRadius: 1.5 }}
                      >
                        Awaiting Prior Approvals
                      </Button>
                    )}
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Card>
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: SUPERVISOR & ADMIN REVIEW DESK (ALL STAFF TIMESHEETS)
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 1 && (
        <Card elevation={2} sx={{ p: 3, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} color={COLORS.maroonPrimary}>
                Staff Timesheet Submissions & Approvals Desk
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review, verify roster shift compliance, approve and forward to Executive Administrator / Bishop, or return for correction.
              </Typography>
            </Box>
            
            {/* Status Filter Chips */}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {[
                { key: 'ALL', label: 'All Submissions', count: reviewableTimesheets.length },
                { key: 'SUBMITTED', label: 'Pending Supervisor', count: reviewableTimesheets.filter(t => t.status === 'SUBMITTED').length, color: 'info' },
                { key: 'PENDING_ADMIN_APPROVAL', label: 'Pending Exec Seal', count: reviewableTimesheets.filter(t => t.status === 'PENDING_ADMIN_APPROVAL').length, color: 'warning' },
                { key: 'APPROVED', label: 'Approved & Certified', count: reviewableTimesheets.filter(t => t.status === 'APPROVED').length, color: 'success' },
                { key: 'REJECTED', label: 'Returned for Correction', count: reviewableTimesheets.filter(t => t.status === 'REJECTED').length, color: 'error' }
              ].map(f => (
                <Chip
                  key={f.key}
                  label={`${f.label} (${f.count})`}
                  onClick={() => setReviewFilter(f.key as any)}
                  variant={reviewFilter === f.key ? 'filled' : 'outlined'}
                  color={f.color as any || (reviewFilter === f.key ? 'primary' : 'default')}
                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                />
              ))}
            </Stack>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 800 }}>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Staff Name</TableCell>
                  <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Project</TableCell>
                  <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Period</TableCell>
                  <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Hours Worked</TableCell>
                  <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Compliance</TableCell>
                  <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Current Stage</TableCell>
                  <TableCell sx={{ fontWeight: 800, py: 1.5, textAlign: 'center', width: 200 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviewableTimesheets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      <Stack spacing={1} alignItems="center">
                        <CheckCircle sx={{ fontSize: 36, color: '#10b981' }} />
                        <Typography variant="subtitle1" fontWeight={700}>
                          No Pending Timesheet Submissions
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {isSuperAdminOrBishop
                            ? 'All hospital staff timesheets have been verified and sealed.'
                            : `No timesheets currently awaiting review by supervisor ${currentUserName}.`}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  reviewableTimesheets
                    .filter(ts => reviewFilter === 'ALL' || ts.status === reviewFilter)
                    .map((ts) => (
                    <TableRow key={ts.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={800}>
                          {ts.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ts.designation} • {ts.empId}
                        </Typography>
                      </TableCell>
                      <TableCell>{ts.department || 'Clinical'}</TableCell>
                      <TableCell>
                        <Chip label={ts.projectName || 'Revenue & Cash Desk Operations'} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {ts.month} {ts.year || '2026'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={800} color="#2563eb">
                          {ts.hoursWorked || ts.grid?.totalHoursWorked || 176} hrs
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${ts.compliancePercentage || 100}%`}
                          size="small"
                          color={Number(ts.compliancePercentage || 100) >= 95 ? 'success' : 'warning'}
                          sx={{ fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            ts.status === 'APPROVED' ? 'APPROVED & SEALED' :
                            ts.status === 'PENDING_ADMIN_APPROVAL' ? 'PENDING EXEC SEAL' :
                            ts.status === 'SUBMITTED' ? 'PENDING SUPERVISOR' :
                            ts.status === 'REJECTED' ? 'RETURNED' : 'DRAFT'
                          }
                          sx={{
                            fontWeight: 800,
                            bgcolor:
                              ts.status === 'APPROVED' ? '#dcfce7' :
                              ts.status === 'PENDING_ADMIN_APPROVAL' ? '#fef3c7' :
                              ts.status === 'SUBMITTED' ? '#e0f2fe' :
                              ts.status === 'REJECTED' ? '#fee2e2' : '#f1f5f9',
                            color:
                              ts.status === 'APPROVED' ? '#16a34a' :
                              ts.status === 'PENDING_ADMIN_APPROVAL' ? '#d97706' :
                              ts.status === 'SUBMITTED' ? '#0284c7' :
                              ts.status === 'REJECTED' ? '#dc2626' : '#64748b'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', width: 200 }}>
                        <Stack direction="column" spacing={0.6} alignItems="stretch" sx={{ minWidth: 175 }}>
                          {/* Row 1: Open Grid & Return side-by-side horizontally */}
                          <Stack direction="row" spacing={0.6} alignItems="center" sx={{ width: '100%' }}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Visibility sx={{ fontSize: '14px !important' }} />}
                              onClick={() => {
                                setSelectedReviewTs(ts);
                                setReviewTargetAdmin(selectedAdmin || 'Amedu Alapa');
                                setReviewModalOpen(true);
                              }}
                              sx={{
                                flex: 1,
                                bgcolor: COLORS.maroonPrimary,
                                color: '#ffffff',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 1.5,
                                fontSize: '0.72rem',
                                py: 0.35,
                                px: 0.8,
                                whiteSpace: 'nowrap',
                                '&:hover': { bgcolor: COLORS.maroonDark }
                              }}
                            >
                              Open Grid
                            </Button>

                            {ts.status === 'SUBMITTED' && isSupervisorAuthorizedFor(ts) && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Reply sx={{ fontSize: '14px !important' }} />}
                                onClick={() => handleOpenReturnModal(ts, 'Supervisor')}
                                sx={{
                                  flex: 1,
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  borderRadius: 1.5,
                                  fontSize: '0.72rem',
                                  py: 0.35,
                                  px: 0.8,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Return
                              </Button>
                            )}

                            {ts.status === 'PENDING_ADMIN_APPROVAL' && isSuperAdminOrBishop && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Reply sx={{ fontSize: '14px !important' }} />}
                                onClick={() => handleOpenReturnModal(ts, selectedAdmin.toLowerCase().includes('bishop') ? 'Bishop' : 'Hospital Administrator')}
                                sx={{
                                  flex: 1,
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  borderRadius: 1.5,
                                  fontSize: '0.72rem',
                                  py: 0.35,
                                  px: 0.8,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Return
                              </Button>
                            )}
                          </Stack>

                          {/* Row 2: Authorize Seal / Approve underneath */}
                          {ts.status === 'SUBMITTED' && isSupervisorAuthorizedFor(ts) && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<Check sx={{ fontSize: '14px !important' }} />}
                              onClick={() => handleSupervisorApproveAndForward(ts.id, selectedCoordinator, selectedAdmin)}
                              sx={{
                                width: '100%',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 1.5,
                                fontSize: '0.72rem',
                                py: 0.35,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Approve
                            </Button>
                          )}

                          {ts.status === 'PENDING_ADMIN_APPROVAL' && isSuperAdminOrBishop && (
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Shield sx={{ fontSize: '14px !important' }} />}
                              onClick={() => handleAdminSealTimesheet(ts.id, selectedAdmin)}
                              sx={{
                                width: '100%',
                                bgcolor: '#047857',
                                color: '#ffffff',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 1.5,
                                fontSize: '0.72rem',
                                py: 0.35,
                                whiteSpace: 'nowrap',
                                '&:hover': { bgcolor: '#065f46' }
                              }}
                            >
                              Authorize Seal
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: HR & ADMIN HOLIDAYS & LEAVE MANAGEMENT DESK
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Top Banner */}
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 2.5,
              background: `linear-gradient(135deg, ${COLORS.maroonPrimary} 0%, #1e293b 100%)`,
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <BeachAccess sx={{ fontSize: 32, color: '#f59e0b' }} />
                <Typography variant="h5" fontWeight={800}>
                  HR & Admin Holidays & Leave Management Desk
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9, maxWidth: 800 }}>
                Configure statutory gazetted public holidays and hospital-wide declared off-days. Configure and grant Annual Leave, Maternity Leave, and custom leave schedules for all staff, departments, or individual employees. All changes synchronize in real-time across monthly timesheets.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                startIcon={<Public />}
                onClick={() => setHolidayModalOpen(true)}
                sx={{
                  bgcolor: '#d97706',
                  color: '#ffffff',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 2.5,
                  '&:hover': { bgcolor: '#b45309' }
                }}
              >
                + Set Public Holiday
              </Button>
              <Button
                variant="contained"
                startIcon={<WorkOff />}
                onClick={() => setLeaveModalOpen(true)}
                sx={{
                  bgcolor: '#059669',
                  color: '#ffffff',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 2.5,
                  '&:hover': { bgcolor: '#047857' }
                }}
              >
                + Grant Staff Leave
              </Button>
            </Stack>
          </Paper>

          {/* Section 1: Public & Hospital Holidays */}
          <Card elevation={2} sx={{ p: 3, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="h6" fontWeight={800} color={COLORS.maroonPrimary}>
                  1. Gazetted & Hospital Public Holidays
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Declared public holidays grant standard 8.0h paid inflow credit on assigned roster duty days.
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setHolidayModalOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
              >
                Add Public Holiday
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Holiday Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Holiday Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Applicability Scope</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Timesheet Credit</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Notes / Description</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {holidays.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        No public holidays configured. Click "+ Set Public Holiday" above to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    holidays.map((h: any) => (
                      <TableRow key={h.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={800} color="#0f766e">
                            {h.date}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={800}>
                            {h.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {h.scope === 'ALL_STAFF' || !h.scope ? (
                            <Chip label="All Hospital Staff (Hospital-wide)" size="small" color="success" sx={{ fontWeight: 700 }} />
                          ) : h.scope === 'DEPARTMENT' ? (
                            <Chip label={`Dept: ${h.targetDepartment}`} size="small" color="primary" sx={{ fontWeight: 700 }} />
                          ) : (
                            <Chip label={`Custom: ${(h.targetStaffIds || []).length} Staff Members`} size="small" color="warning" sx={{ fontWeight: 700 }} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip label="8.0h Paid Credit" size="small" variant="outlined" sx={{ fontWeight: 800, color: '#16a34a', borderColor: '#86efac', bgcolor: '#f0fdf4' }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {h.description || 'Statutory Public Holiday'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Tooltip title="Remove Public Holiday">
                            <IconButton size="small" color="error" onClick={() => handleDeleteHoliday(h.id, h.title)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* Section 2: Staff Leave & Absence Management */}
          <Card elevation={2} sx={{ p: 3, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="h6" fontWeight={800} color={COLORS.maroonPrimary}>
                  2. Staff Leave & Absence Management Desk
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage Annual Leave, Maternity Leave, Paternity, Sick, and Training Absences across staff timesheets.
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setLeaveModalOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
              >
                Grant Staff Leave
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Staff Member</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Leave Category</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Date Range</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Total Days</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Reason / Notes</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Approval Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaves.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        No staff leave records found. Click "+ Grant Staff Leave" above to record annual, maternity, or other approved leave.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaves.map((l: any) => {
                      const emp = employees.find(e => e.id === l.staffId || e.empId === l.staffId);
                      const staffName = emp ? `${emp.firstName} ${emp.lastName}` : (l.staffName || l.staffId);
                      return (
                        <TableRow key={l.id} hover>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight={800}>
                              {staffName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {emp?.role || 'Staff Officer'} • {l.staffId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                l.leaveType === 'ANNUAL' ? 'Annual Leave' :
                                l.leaveType === 'MATERNITY' ? 'Maternity Leave' :
                                l.leaveType === 'PATERNITY' ? 'Paternity Leave' :
                                l.leaveType === 'SICK' ? 'Sick / Medical' :
                                l.leaveType === 'TRAINING' ? 'Training / Conference' : 'Compassionate'
                              }
                              size="small"
                              sx={{
                                fontWeight: 800,
                                bgcolor:
                                  l.leaveType === 'ANNUAL' ? '#e0e7ff' :
                                  l.leaveType === 'MATERNITY' ? '#fce7f3' :
                                  l.leaveType === 'SICK' ? '#fee2e2' : '#fef3c7',
                                color:
                                  l.leaveType === 'ANNUAL' ? '#3730a3' :
                                  l.leaveType === 'MATERNITY' ? '#9d174d' :
                                  l.leaveType === 'SICK' ? '#991b1b' : '#92400e'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700}>
                              {l.startDate} → {l.endDate}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={800} color="#0f766e">
                              {l.days || 1} Days
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {l.reason || 'Approved leave schedule'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={l.status || 'APPROVED'}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                bgcolor: l.status === 'APPROVED' ? '#dcfce7' : l.status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                                color: l.status === 'APPROVED' ? '#15803d' : l.status === 'REJECTED' ? '#b91c1c' : '#b45309'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              {l.status !== 'APPROVED' && (
                                <Tooltip title="Approve Leave Application">
                                  <IconButton size="small" color="success" onClick={() => handleApproveLeave(l.id)}>
                                    <Check fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Cancel / Remove Leave Record">
                                <IconButton size="small" color="error" onClick={() => handleDeleteLeave(l.id)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: MY PROFILE & DIGITAL SIGNATURE SETUP DESK
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 3 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Top Banner */}
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 2.5,
              background: `linear-gradient(135deg, ${COLORS.maroonPrimary} 0%, #1e1b4b 100%)`,
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <HistoryEdu sx={{ fontSize: 34, color: '#f59e0b' }} />
                <Typography variant="h5" fontWeight={800}>
                  My Profile & Digital Signature Configuration Desk
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9, maxWidth: 850 }}>
                Configure and calibrate your personal electronic signature. You can draw using touchpad/mouse with high-precision ink, upload an official signature image (PNG, JPG, SVG), or type your name with cursive calligraphy styling. Once set, this signature automatically certifies your timesheet submissions and supervisor reviews.
              </Typography>
            </Box>

            <Chip
              icon={<Verified sx={{ color: '#ffffff !important' }} />}
              label={savedSignature ? "Active Signature Configured" : "No Signature Set"}
              sx={{
                bgcolor: savedSignature ? 'rgba(22, 163, 74, 0.9)' : 'rgba(220, 38, 38, 0.8)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.85rem',
                py: 2,
                px: 1
              }}
            />
          </Paper>

          <Grid container spacing={3}>
            {/* ─── Left Column: Signature Workbench ──────────────────────────── */}
            <Grid item xs={12} md={7}>
              <Card elevation={2} sx={{ p: 3, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', height: '100%' }}>
                <Typography variant="h6" fontWeight={800} color={COLORS.maroonPrimary} sx={{ mb: 0.5 }}>
                  Signature Input Workbench
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Select your preferred signature creation mode below and preview before saving:
                </Typography>

                {/* Mode Selector */}
                <Box sx={{ mb: 3 }}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant={tabSignatureMode === 'draw' ? 'contained' : 'outlined'}
                      startIcon={<Draw />}
                      onClick={() => setTabSignatureMode('draw')}
                      sx={{
                        flex: 1,
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        bgcolor: tabSignatureMode === 'draw' ? COLORS.maroonPrimary : 'transparent',
                        borderColor: COLORS.maroonPrimary,
                        color: tabSignatureMode === 'draw' ? '#ffffff' : COLORS.maroonPrimary,
                        '&:hover': { bgcolor: tabSignatureMode === 'draw' ? COLORS.maroonDark : '#f8fafc' }
                      }}
                    >
                      Draw on Canvas
                    </Button>
                    <Button
                      variant={tabSignatureMode === 'upload' ? 'contained' : 'outlined'}
                      startIcon={<UploadFile />}
                      onClick={() => setTabSignatureMode('upload')}
                      sx={{
                        flex: 1,
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        bgcolor: tabSignatureMode === 'upload' ? COLORS.maroonPrimary : 'transparent',
                        borderColor: COLORS.maroonPrimary,
                        color: tabSignatureMode === 'upload' ? '#ffffff' : COLORS.maroonPrimary,
                        '&:hover': { bgcolor: tabSignatureMode === 'upload' ? COLORS.maroonDark : '#f8fafc' }
                      }}
                    >
                      Upload Image
                    </Button>
                    <Button
                      variant={tabSignatureMode === 'type' ? 'contained' : 'outlined'}
                      startIcon={<Edit />}
                      onClick={() => setTabSignatureMode('type')}
                      sx={{
                        flex: 1,
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        bgcolor: tabSignatureMode === 'type' ? COLORS.maroonPrimary : 'transparent',
                        borderColor: COLORS.maroonPrimary,
                        color: tabSignatureMode === 'type' ? '#ffffff' : COLORS.maroonPrimary,
                        '&:hover': { bgcolor: tabSignatureMode === 'type' ? COLORS.maroonDark : '#f8fafc' }
                      }}
                    >
                      Type Calligraphy
                    </Button>
                  </Stack>
                </Box>

                {/* Mode 1: Draw Signature on Canvas */}
                {tabSignatureMode === 'draw' && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        Pen Color Palette:
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {[
                          { color: '#1e3a8a', label: 'Navy' },
                          { color: '#5c1a2e', label: 'Maroon' },
                          { color: '#0f172a', label: 'Black' },
                          { color: '#047857', label: 'Green' }
                        ].map((c) => (
                          <Box
                            key={c.color}
                            onClick={() => setTabPenColor(c.color)}
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: c.color,
                              cursor: 'pointer',
                              border: tabPenColor === c.color ? '3px solid #f59e0b' : '2px solid #ffffff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              transition: 'transform 0.15s',
                              '&:hover': { transform: 'scale(1.15)' }
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>

                    <Box
                      sx={{
                        border: '2px dashed #94a3b8',
                        borderRadius: 2.5,
                        bgcolor: '#f8fafc',
                        p: 1.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 180
                      }}
                    >
                      <canvas
                        ref={tabCanvasRef}
                        width={520}
                        height={160}
                        onMouseDown={startTabDrawing}
                        onMouseMove={tabDraw}
                        onMouseUp={stopTabDrawing}
                        onMouseLeave={stopTabDrawing}
                        onTouchStart={startTabDrawing}
                        onTouchMove={tabDraw}
                        onTouchEnd={stopTabDrawing}
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
                          touchAction: 'none',
                          maxWidth: '100%',
                          cursor: 'crosshair'
                        }}
                      />
                    </Box>

                    <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Tip: Sign inside the white box with continuous fluid strokes
                      </Typography>
                      <Button size="small" startIcon={<Undo />} color="inherit" onClick={clearTabCanvas} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Clear Canvas
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Mode 2: Upload Image */}
                {tabSignatureMode === 'upload' && (
                  <Box>
                    <Box
                      sx={{
                        border: '2px dashed #94a3b8',
                        borderRadius: 2.5,
                        bgcolor: '#f8fafc',
                        p: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#f1f5f9' }
                      }}
                      component="label"
                    >
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml"
                        hidden
                        onChange={handleTabFileUpload}
                      />
                      <UploadFile sx={{ fontSize: 44, color: COLORS.maroonPrimary, mb: 1 }} />
                      <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                        Click to browse or drop signature image file
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Supported formats: PNG (recommended with transparent background), JPG, SVG • Max 5MB
                      </Typography>
                    </Box>

                    {uploadedSigPreview && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #cbd5e1', textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
                          Live Uploaded Signature Preview:
                        </Typography>
                        <img
                          src={uploadedSigPreview}
                          alt="Uploaded Signature Preview"
                          style={{ maxHeight: 70, maxWidth: '100%', objectFit: 'contain' }}
                        />
                      </Box>
                    )}
                  </Box>
                )}

                {/* Mode 3: Type Calligraphy Name */}
                {tabSignatureMode === 'type' && (
                  <Box>
                    <TextField
                      fullWidth
                      label="Type Your Full Name / Signature Initials"
                      value={tabTypedSigName}
                      onChange={(e) => setTabTypedSigName(e.target.value)}
                      placeholder="e.g. Mary Okon, Chinedu Okafor"
                      sx={{ mb: 2 }}
                    />

                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      Calligraphic Script Preview:
                    </Typography>
                    <Box
                      sx={{
                        p: 3,
                        mt: 1,
                        borderRadius: 2,
                        border: '1px solid #cbd5e1',
                        bgcolor: '#ffffff',
                        textAlign: 'center',
                        fontFamily: 'Brush Script MT, cursive, sans-serif',
                        fontSize: '2.5rem',
                        fontStyle: 'italic',
                        color: COLORS.maroonPrimary,
                        letterSpacing: '0.04em'
                      }}
                    >
                      {tabTypedSigName || activeTimesheet?.name || 'Mary Okon'}
                    </Box>
                  </Box>
                )}

                {/* Save Button */}
                <Box sx={{ mt: 3.5 }}>
                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    startIcon={<CheckCircle />}
                    onClick={handleSaveConfiguredSignature}
                    sx={{
                      bgcolor: COLORS.maroonPrimary,
                      color: '#ffffff',
                      fontWeight: 800,
                      textTransform: 'none',
                      borderRadius: 2,
                      py: 1.4,
                      fontSize: '1rem',
                      '&:hover': { bgcolor: COLORS.maroonDark }
                    }}
                  >
                    Save & Set as My Active Official Signature
                  </Button>
                </Box>
              </Card>
            </Grid>

            {/* ─── Right Column: Active Signature Certificate ───────────────── */}
            <Grid item xs={12} md={5}>
              <Card
                elevation={2}
                sx={{
                  p: 3,
                  borderRadius: 2.5,
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Shield sx={{ color: '#16a34a', fontSize: 28 }} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                        Official Digital Certificate
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Authenticated Electronic Signature Record
                      </Typography>
                    </Box>
                  </Box>

                  {/* Certificate Frame */}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: '#fafafa',
                      border: '2px solid #e2e8f0',
                      position: 'relative',
                      overflow: 'hidden',
                      mb: 2.5
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="caption" fontWeight={800} color={COLORS.maroonPrimary} textTransform="uppercase">
                        FAITH FOUNDATION HOSPITAL
                      </Typography>
                      <Chip
                        label="VERIFIED & ACTIVE"
                        size="small"
                        color="success"
                        sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                      />
                    </Box>

                    {/* Signature Image Display */}
                    <Box
                      sx={{
                        my: 2,
                        minHeight: 90,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 1.5,
                        p: 1.5
                      }}
                    >
                      {savedSignature?.signatureData ? (
                        <img
                          src={savedSignature.signatureData}
                          alt="Active Official Signature"
                          style={{ maxHeight: 75, maxWidth: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            No Active Signature Set
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Use the workbench on the left to draw or upload your signature
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Metadata */}
                    <Stack spacing={0.8}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Staff Signatory:</Typography>
                        <Typography variant="caption" fontWeight={800} color="#0f172a">
                          {savedSignature?.signatureName || activeTimesheet?.name || 'MARY OKON'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Designation:</Typography>
                        <Typography variant="caption" fontWeight={700}>
                          {activeTimesheet?.designation || 'Senior Cashier & Revenue Officer'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Department:</Typography>
                        <Typography variant="caption" fontWeight={700}>
                          {activeTimesheet?.department || 'Finance & Revenue'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Last Calibrated:</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {savedSignature?.updatedAt ? new Date(savedSignature.updatedAt).toLocaleString() : 'September 13, 2026'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>

                  <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <CheckCircle sx={{ color: '#16a34a', fontSize: 20, mt: 0.2 }} />
                      <Box>
                        <Typography variant="caption" fontWeight={800} color="#166534" display="block">
                          Automated Sign-Off Enabled
                        </Typography>
                        <Typography variant="caption" color="#15803d">
                          When you click "Submit & Route to Supervisor" on your monthly timesheet, this signature will be automatically appended.
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => setActiveTab(0)}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                  >
                    Return to Timesheet Grid
                  </Button>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ─── Return Timesheet for Correction Modal ─────────────────────────── */}
      <Dialog
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Reply sx={{ color: '#dc2626' }} />
          Return Timesheet for Correction
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Returning this timesheet will immediately route it back to <b>{returnTargetTs?.name || 'the staff officer'}</b> with status marked as <b>RETURNED</b>. Please provide a clear explanation or note the specific shifts/discrepancies needing correction.
          </Typography>

          <Box sx={{ p: 1.5, mb: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca' }}>
            <Typography variant="caption" color="#991b1b" fontWeight={700} display="block">
              Reviewer Identity & Action Scope:
            </Typography>
            <Typography variant="body2" fontWeight={800} color="#7f1d1d">
              Returning as {returnReviewerRole}: {returnReviewerRole === 'Supervisor' ? selectedCoordinator : selectedAdmin}
            </Typography>
          </Box>

          <TextField
            fullWidth
            required
            multiline
            rows={4}
            label="Reason for Returning Timesheet (Required)"
            value={returnReasonInput}
            onChange={(e) => setReturnReasonInput(e.target.value)}
            placeholder="e.g. Discrepancy observed on Friday Sep 11th night shift; please reconcile handover hours with biometric log and re-submit."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReturnModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmReturnTimesheet}
            variant="contained"
            color="error"
            startIcon={<Reply />}
            sx={{
              fontWeight: 800,
              textTransform: 'none',
              borderRadius: 1.5,
              px: 2.5
            }}
          >
            Confirm & Return Timesheet
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG: DIGITAL SIGNATURE CANVAS / UPLOAD
          ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: COLORS.maroonPrimary }}>
          Digital Signature Sign-Off • {signingRole === 'coordinator' ? 'Project Coordinator' : signingRole === 'admin' ? 'Hospital Administrator' : 'Staff Officer'}
        </DialogTitle>
        <DialogContent dividers>
          <Tabs
            value={signatureType}
            onChange={(_, val) => setSignatureType(val)}
            sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 700 } }}
          >
            <Tab value="draw" icon={<Draw />} iconPosition="start" label="Draw Signature" />
            <Tab value="type" icon={<Edit />} iconPosition="start" label="Type Name / Font" />
          </Tabs>

          {signatureType === 'draw' ? (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Draw your signature in the box below with your mouse or touchscreen:
              </Typography>
              <Box
                sx={{
                  border: '2px dashed #94a3b8',
                  borderRadius: 2,
                  bgcolor: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 1
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                    touchAction: 'none'
                  }}
                />
              </Box>
              <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" color="inherit" onClick={clearCanvas}>
                  Clear Signature
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ py: 2 }}>
              <TextField
                fullWidth
                label="Type Official Name for Signature"
                value={typedSigName}
                onChange={(e) => setTypedSigName(e.target.value)}
                placeholder={activeTimesheet?.name || 'Full Official Name'}
                sx={{ mb: 2 }}
              />
              <Typography variant="caption" color="text.secondary">
                Preview:
              </Typography>
              <Box
                sx={{
                  p: 2,
                  mt: 1,
                  borderRadius: 2,
                  border: '1px solid #cbd5e1',
                  bgcolor: '#ffffff',
                  textAlign: 'center',
                  fontFamily: 'Brush Script MT, cursive',
                  fontSize: '2rem',
                  fontStyle: 'italic',
                  color: signingRole === 'coordinator' ? '#0f766e' : signingRole === 'admin' ? '#047857' : '#1e3a8a'
                }}
              >
                {typedSigName || activeTimesheet?.name || 'Official Signature'}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSignatureModalOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSignature}
            sx={{
              bgcolor: COLORS.maroonPrimary,
              color: '#ffffff',
              fontWeight: 700,
              borderRadius: 2,
              '&:hover': { bgcolor: COLORS.maroonDark }
            }}
          >
            Apply Digital Signature & Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG: REJECTION REASON DIALOG
          ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#dc2626' }}>
          Return Timesheet for Correction
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please state the reasons or discrepancies that require correction by the staff officer:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason / Correction Notes"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Discrepancy on Friday hours, please adjust."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleRejectTimesheet} sx={{ fontWeight: 700 }}>
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG: DELETE CONFIRMATION
          ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#dc2626' }}>
          Delete / Reset Timesheet?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete this submitted timesheet record for <b>{activeTimesheet?.name}</b> ({selectedMonth} {selectedYear})? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteTimesheet} sx={{ fontWeight: 700 }}>
            Delete Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG: NEW TIMESHEET PERIOD GENERATION
          ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: COLORS.maroonPrimary }}>
          Generate New Monthly Timesheet
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Staff Officer</InputLabel>
              <Select
                value={newTsStaffId}
                label="Select Staff Officer"
                onChange={(e) => setNewTsStaffId(e.target.value)}
              >
                {employees && employees.length > 0 ? (
                  employees.map((emp: any) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.role || emp.designation || emp.department})
                    </MenuItem>
                  ))
                ) : (
                  [
                    <MenuItem key="EMP-006" value="EMP-006">Mary Okon (Senior Cashier & Revenue Officer)</MenuItem>,
                    <MenuItem key="EMP-012" value="EMP-012">David Adeleke (Senior Accountant & Auditor)</MenuItem>,
                    <MenuItem key="EMP-009" value="EMP-009">Chinedu Okafor (Revenue Unit Lead & Accountant)</MenuItem>,
                    <MenuItem key="EMP-007" value="EMP-007">Blessing Ugwu (Cashier / Front Desk)</MenuItem>,
                    <MenuItem key="EMP-008" value="EMP-008">Ibrahim Danladi (Cashier / Emergency Desk)</MenuItem>,
                    <MenuItem key="EMP-001" value="EMP-001">Dr. Emeka Okafor (Consultant Physician)</MenuItem>,
                    <MenuItem key="EMP-002" value="EMP-002">Ngozi Adeyemi (Chief Matron / Nursing)</MenuItem>,
                    <MenuItem key="EMP-013" value="EMP-013">Emmanuel Vegher (Tracking Assistant & Lab Scientist)</MenuItem>
                  ]
                )}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={newTsMonth}
                    label="Month"
                    onChange={(e) => setNewTsMonth(e.target.value)}
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={newTsYear}
                    label="Year"
                    onChange={(e) => setNewTsYear(e.target.value)}
                  >
                    {['2026', '2025', '2024'].map(y => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <FormControl fullWidth size="small">
              <InputLabel>Primary Project / Program</InputLabel>
              <Select
                value={newTsProject}
                label="Primary Project / Program"
                onChange={(e) => setNewTsProject(e.target.value)}
              >
                {PROJECT_OPTIONS.map(p => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Project Coordinator</InputLabel>
              <Select
                value={newTsCoordinator}
                label="Project Coordinator"
                onChange={(e) => setNewTsCoordinator(e.target.value)}
              >
                <MenuItem value="Chinedu Okafor">Chinedu Okafor (Revenue Unit Lead)</MenuItem>
                <MenuItem value="Ekwedike Dennis">Ekwedike Dennis (Project Coordinator)</MenuItem>
                <MenuItem value="Dr. Aisha Bello">Dr. Aisha Bello (Clinical Director)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateTimesheet}
            sx={{
              bgcolor: COLORS.maroonPrimary,
              color: '#ffffff',
              fontWeight: 700,
              '&:hover': { bgcolor: COLORS.maroonDark }
            }}
          >
            Create Timesheet Grid
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG: OFFICIAL PRINTABLE PDF MODAL PREVIEW (A4 LANDSCAPE)
          ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={800} color={COLORS.maroonPrimary}>
            Official Monthly Time Report Preview (A4 Landscape)
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" startIcon={<Print />} onClick={handlePrint} sx={{ bgcolor: COLORS.maroonPrimary, color: '#ffffff' }}>
              Print Document
            </Button>
            <IconButton onClick={() => setPrintPreviewOpen(false)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {(() => {
            const printDocTs = printPreviewTs || activeTimesheet;
            const isCashier = printDocTs?.designation?.toLowerCase().includes('cashier') || printDocTs?.projectName?.includes('Revenue');
            const printGrid = generateRosterGrid(
              printDocTs?.month || selectedMonth,
              Number(printDocTs?.year) || selectedYear,
              printDocTs?.projectName || selectedProject,
              isCashier ? 'cashier' : 'clinical',
              printDocTs?.empId || 'EMP-006',
              holidays,
              leaves,
              printDocTs?.department || 'Finance & Revenue'
            );
            const docMaxExp = printGrid.expectedShiftHours || 176;

            return (
              <Box
                id="printable-timesheet-area"
                sx={{
                  p: 3,
                  bgcolor: '#ffffff',
                  color: '#000000',
                  fontFamily: 'Arial, sans-serif'
                }}
              >
                {/* Header with Hospital Crest Logo (No CCFN) */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, borderBottom: '2px solid #000', pb: 1.5 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.35 }}>
                      <b>Name:</b> {printDocTs?.name}<br />
                      <b>Department:</b> {printDocTs?.department}<br />
                      <b>Designation:</b> {printDocTs?.designation}<br />
                      <b>Location:</b> {printDocTs?.location || 'Faith Foundation Mission Hospital'}<br />
                      <b>State:</b> {printDocTs?.state || 'Enugu'}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '0.05em', color: '#000000' }}>
                      FAITH FOUNDATION MISSION HOSPITAL
                    </Typography>
                    <Typography variant="body2" fontWeight={800} sx={{ color: '#000000' }}>
                      Official Monthly Time Report ({printDocTs?.month || selectedMonth} {printDocTs?.year || selectedYear})
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                      Staff Roster Attendance, Duty Shifts & Project Activity Verification
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      component="img"
                      src={assetUrl('/hospital-logo.webp')}
                      alt="Faith Foundation Mission Hospital Logo"
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '8px',
                        objectFit: 'contain'
                      }}
                    />
                  </Box>
                </Box>

            {/* Matrix Table with printGrid */}
            <Table
              size="small"
              sx={{
                border: '1px solid #000',
                borderCollapse: 'collapse',
                '& th, & td': {
                  border: '1px solid #000',
                  p: '2px 4px',
                  textAlign: 'center',
                  fontSize: '9px'
                }
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '160px', textAlign: 'left !important' }}>Project</TableCell>
                  {printGrid.days.map((d: any) => (
                    <TableCell
                      key={`pdf-dow-${d.day}`}
                      sx={{
                        fontWeight: 'bold',
                        bgcolor: d.isWeekend ? '#000 !important' : '#e2e8f0',
                        color: d.isWeekend ? '#fff !important' : '#000'
                      }}
                    >
                      {d.dayOfWeek[0]}
                    </TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'left !important' }}>{printDocTs?.projectName || selectedProject}</TableCell>
                  {printGrid.days.map((d: any) => (
                    <TableCell
                      key={`pdf-num-${d.day}`}
                      sx={{
                        fontWeight: 'bold',
                        bgcolor: d.isWeekend ? '#000 !important' : '#f8fafc',
                        color: d.isWeekend ? '#fff !important' : '#000'
                      }}
                    >
                      {d.day}
                    </TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 'bold' }}>(hrs)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>(%)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Primary Project Row */}
                <TableRow>
                  <TableCell sx={{ textAlign: 'left !important', fontWeight: 'bold' }}>{printDocTs?.projectName || selectedProject}</TableCell>
                  {printGrid.days.map((d: any) => {
                    const cellVal = d.isOffDuty || d.isWeekend ? 'OFF' : (d.hoursWorked ?? d.projectHours ?? d.actualProjectHours ?? 0);
                    return (
                      <TableCell key={`pdf-h-${d.day}`} sx={{ bgcolor: d.isWeekend ? '#000' : '#fff', color: d.isWeekend ? '#fff' : '#000' }}>
                        {d.isOffDuty || d.isWeekend ? 'OFF' : (cellVal > 0 ? Number(cellVal).toFixed(0) : '0')}
                      </TableCell>
                    );
                  })}
                  <TableCell sx={{ fontWeight: 'bold' }}>{Number(printGrid.totalHoursWorked || printGrid.totalProjectHours || 0).toFixed(0)}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{printDocTs?.compliancePercentage || Math.round(((printGrid.totalHoursWorked || 1) / (docMaxExp || 1)) * 100)}%</TableCell>
                </TableRow>

                {/* Off days / Leave categories */}
                {LEAVE_AND_OFF_CATEGORIES.map(catDef => {
                  let hours = 0;
                  if (catDef.key === 'ANNUAL') hours = printGrid.totalAnnualLeaveHours || 0;
                  else if (catDef.key === 'SICK') hours = printGrid.totalSickLeaveHours || 0;
                  else if (catDef.key === 'MATERNITY') hours = printGrid.totalMaternityHours || 0;
                  else if (catDef.key === 'PATERNITY') hours = printGrid.totalPaternityHours || 0;
                  else if (catDef.key === 'HOLIDAY') hours = printGrid.totalHolidayHours || 0;
                  else if (catDef.key === 'CASUAL') hours = printGrid.totalCasualLeaveHours || 0;
                  else if (catDef.key === 'COMPASSIONATE') hours = printGrid.totalCompassionateLeaveHours || 0;
                  else if (catDef.key === 'STUDY') hours = printGrid.totalStudyLeaveHours || 0;
                  else if (catDef.key === 'TRAINING') hours = printGrid.totalTrainingHours || 0;

                  return (
                    <TableRow key={`pdf-cat-${catDef.key}`}>
                      <TableCell sx={{ textAlign: 'left !important' }}>{catDef.label}</TableCell>
                      {printGrid.days.map((d: any) => {
                        let cellHours = (d.leaves && d.leaves[catDef.key.toLowerCase()]) ?? d[catDef.key.toLowerCase() + 'Leave'] ?? d[catDef.key.toLowerCase()] ?? 0;
                        if (!cellHours && d.isLeave && d.shiftType?.toLowerCase().includes(catDef.key.toLowerCase())) {
                          cellHours = d.expectedHours || 8;
                        }
                        return (
                          <TableCell key={`pdf-${catDef.key}-${d.day}`} sx={{ bgcolor: d.isWeekend ? '#000' : '#fff' }}>
                            {d.isOffDuty || d.isWeekend ? '' : (cellHours > 0 ? String(cellHours) : '0')}
                          </TableCell>
                        );
                      })}
                      <TableCell sx={{ fontWeight: 'bold' }}>{hours}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{docMaxExp > 0 ? Math.round((hours / docMaxExp) * 100) : 0}%</TableCell>
                    </TableRow>
                  );
                })}

                {/* Total Actual Row */}
                <TableRow sx={{ bgcolor: '#e2e8f0' }}>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'left !important' }}>Total</TableCell>
                  {printGrid.days.map((d: any) => {
                    const totVal = d.isOffDuty || d.isWeekend ? '' : (d.totalDaily ?? d.hoursWorked ?? d.projectHours ?? 0);
                    return (
                      <TableCell key={`pdf-tot-${d.day}`} sx={{ fontWeight: 'bold', bgcolor: d.isWeekend ? '#000' : '#e2e8f0', color: d.isWeekend ? '#fff' : '#000' }}>
                        {totVal !== '' && totVal !== undefined ? (Number(totVal) > 0 ? Number(totVal).toFixed(0) : '0') : ''}
                      </TableCell>
                    );
                  })}
                  <TableCell sx={{ fontWeight: 'bold' }}>{Number(printGrid.totalHoursWorked || 0).toFixed(0)}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{printDocTs?.compliancePercentage || 100}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Signatures & Certification Row */}
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #000' }}>
              <Typography variant="body2" fontWeight={800} sx={{ mb: 1.5, fontSize: '11px' }}>
                Official Approval Signatures & Authorization Seals
              </Typography>
              <Grid container spacing={2}>
                {/* 1. Name of Staff */}
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: '10px', color: '#475569' }}>Name of Staff</Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ fontSize: '10px', textTransform: 'uppercase', my: 0.2 }}>
                    {printDocTs?.name || 'Staff Member'}
                  </Typography>
                  <Box sx={{ height: 38, border: '1px solid #999', my: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fafafa' }}>
                    {printDocTs?.staffSignature?.signatureData ? (
                      <img src={printDocTs.staffSignature.signatureData} alt="Staff Sig" style={{ maxHeight: 32, maxWidth: '95%', objectFit: 'contain' }} />
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '9px' }}>Signed & Submitted</Typography>
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '9px', display: 'block' }}>
                    Date: {printDocTs?.staffSignature?.date || printDocTs?.submittedAt || 'September 14, 2026'}
                  </Typography>
                </Grid>

                {/* 2. Name of Supervisor */}
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: '10px', color: '#475569' }}>Name of Supervisor</Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ fontSize: '10px', textTransform: 'uppercase', my: 0.2 }}>
                    {printDocTs?.supervisorSignature?.name || 'Mary Okon'}
                  </Typography>
                  <Box sx={{ height: 38, border: '1px solid #999', my: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fafafa' }}>
                    {printDocTs?.supervisorSignature?.signatureData ? (
                      <img src={printDocTs.supervisorSignature.signatureData} alt="Supervisor Sig" style={{ maxHeight: 32, maxWidth: '95%', objectFit: 'contain' }} />
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '9px' }}>
                        {printDocTs?.supervisorSignature?.signed ? 'Supervisor Verified' : 'Pending Verification'}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '9px', display: 'block' }}>
                    Date: {printDocTs?.supervisorSignature?.date || (printDocTs?.supervisorSignature?.signed ? 'September 14, 2026' : 'Pending Verification')}
                  </Typography>
                </Grid>

                {/* 3. Name of Hospital Administrator / Bishop */}
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: '10px', color: '#475569' }}>Name of Hospital Administrator / Bishop</Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ fontSize: '10px', textTransform: 'uppercase', my: 0.2 }}>
                    {printDocTs?.adminSignature?.name || selectedAdmin || 'Amedu Alapa'}
                  </Typography>
                  <Box sx={{ height: 38, border: '1px solid #999', my: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fafafa' }}>
                    {printDocTs?.adminSignature?.signatureData ? (
                      <img src={printDocTs.adminSignature.signatureData} alt="Admin Seal" style={{ maxHeight: 32, maxWidth: '95%', objectFit: 'contain' }} />
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '9px' }}>
                        {printDocTs?.adminSignature?.signed ? 'Official Seal Authorized' : 'Pending Executive Seal'}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '9px', display: 'block' }}>
                    Date: {printDocTs?.adminSignature?.date || (printDocTs?.adminSignature?.signed ? 'September 14, 2026' : 'Pending Authorization')}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
              </Box>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── Shift & Handover Attendance Audit Dialog ──────────────────────── */}
      <Dialog
        open={dayAuditModalOpen}
        onClose={() => setDayAuditModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#e0f2fe', color: '#0369a1' }}>
              <AccessTime sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#0f172a">
                Shift Handover & Attendance Audit
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedDayAudit?.date} ({selectedDayAudit?.dayOfWeek})
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setDayAuditModalOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2.5 }}>
          {selectedDayAudit && (
            <Stack spacing={2.5}>
              {/* Shift Status Banner */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: selectedDayAudit.isOffDuty
                    ? '#f1f5f9'
                    : selectedDayAudit.isHoliday
                    ? '#dcfce7'
                    : selectedDayAudit.isFuture
                    ? '#f8fafc'
                    : '#ecfdf5',
                  border: '1px solid',
                  borderColor: selectedDayAudit.isOffDuty
                    ? '#cbd5e1'
                    : selectedDayAudit.isHoliday
                    ? '#86efac'
                    : selectedDayAudit.isFuture
                    ? '#e2e8f0'
                    : '#a7f3d0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                    {selectedDayAudit.isOffDuty
                      ? 'Roster Assigned Rest Day'
                      : selectedDayAudit.isHoliday
                      ? 'Public Holiday Credit'
                      : selectedDayAudit.isFuture
                      ? 'Upcoming Scheduled Roster Shift'
                      : 'Shift Completed & Handed Over'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedDayAudit.shiftLabel}
                  </Typography>
                </Box>
                <Chip
                  label={
                    selectedDayAudit.isOffDuty
                      ? 'OFF DUTY'
                      : selectedDayAudit.isHoliday
                      ? 'HOLIDAY (8H)'
                      : selectedDayAudit.isFuture
                      ? 'UPCOMING'
                      : '✓ CLOSED & APPENDED'
                  }
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    bgcolor: selectedDayAudit.isOffDuty
                      ? '#cbd5e1'
                      : selectedDayAudit.isHoliday
                      ? '#16a34a'
                      : selectedDayAudit.isFuture
                      ? '#94a3b8'
                      : '#10b981',
                    color: '#ffffff'
                  }}
                />
              </Box>

              {/* Staff & Shift Overview */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>Staff Member</Typography>
                  <Typography variant="body2" fontWeight={800} color="#1e3a8a">
                    {activeTimesheet?.name || 'Mary Okon'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>Designation & Dept</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {activeTimesheet?.designation} • {activeTimesheet?.department}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>Expected Shift Schedule</Typography>
                  <Typography variant="body2" fontWeight={800} color="#0369a1">
                    {selectedDayAudit.shiftTime} ({selectedDayAudit.expectedHours || 8} hrs Expected)
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>Logged Actual Hours</Typography>
                  <Typography variant="body2" fontWeight={800} color="#16a34a">
                    {selectedDayAudit.isFuture ? '0.0 hrs (Pending Shift Start)' : `${selectedDayAudit.totalDaily || selectedDayAudit.projectHours} hrs Logged`}
                  </Typography>
                </Grid>
              </Grid>

              <Divider />

              {/* Attendance Clock-In & Handover Breakdown */}
              <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                Clock-In & Shift Handover Logs
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800}>
                      1. SHIFT CLOCK-IN
                    </Typography>
                    <Typography variant="body2" fontWeight={800} color="#0f766e" sx={{ mt: 0.5 }}>
                      {selectedDayAudit.clockIn}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {selectedDayAudit.isFuture ? 'Awaiting shift clock-in' : 'Biometric Till Authentication #01'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800}>
                      2. SHIFT HANDOVER / CLOCK-OUT
                    </Typography>
                    <Typography variant="body2" fontWeight={800} color="#0f766e" sx={{ mt: 0.5 }}>
                      {selectedDayAudit.clockOut}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {selectedDayAudit.isFuture ? 'Pending shift completion' : selectedDayAudit.handoverTo}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Shift Memo & Reconciliation Box */}
              {!selectedDayAudit.isOffDuty && !selectedDayAudit.isFuture && (
                <Box sx={{ p: 1.8, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <Typography variant="caption" color="#166534" fontWeight={800} sx={{ display: 'block', mb: 0.5 }}>
                    HANDOVER MEMO & TILL RECONCILIATION
                  </Typography>
                  <Typography variant="body2" color="#14532d" fontWeight={600}>
                    <b>Handover Memo:</b> {selectedDayAudit.handoverMemoId}<br />
                    <b>Relieving Officer:</b> {selectedDayAudit.handoverTo}<br />
                    <b>Cash Till Reconciled:</b> ₦142,500.00 Balanced & Cleared<br />
                    <b>Timesheet Verification:</b> 8.0 Hours Approved and Appended to Monthly Record
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDayAuditModalOpen(false)} variant="contained" sx={{ textTransform: 'none', fontWeight: 700, bgcolor: COLORS.maroonPrimary }}>
            Close Audit
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── HR Public Holiday Modal ───────────────────────────────────────── */}
      <Dialog
        open={holidayModalOpen}
        onClose={() => setHolidayModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: COLORS.maroonPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Public sx={{ color: '#d97706' }} />
          Set Gazetted / Hospital Public Holiday
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configuring a public holiday will automatically credit standard 8.0 hours paid holiday inflow on assigned timesheets for the designated scope.
          </Typography>

          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              required
              label="Holiday Name / Title"
              value={holidayForm.title}
              onChange={(e) => setHolidayForm({ ...holidayForm, title: e.target.value })}
              placeholder="e.g. Independence Day, Eid-el-Maulud, Hospital Foundation Day"
            />

            <TextField
              fullWidth
              required
              type="date"
              label="Holiday Date"
              value={holidayForm.date}
              onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>Applicability Scope</InputLabel>
              <Select
                value={holidayForm.scope}
                label="Applicability Scope"
                onChange={(e) => setHolidayForm({ ...holidayForm, scope: e.target.value })}
              >
                <MenuItem value="ALL_STAFF">All Hospital Staff (Hospital-wide)</MenuItem>
                <MenuItem value="DEPARTMENT">Specific Department</MenuItem>
                <MenuItem value="CUSTOM_STAFF">Specific Staff Members (Custom)</MenuItem>
              </Select>
            </FormControl>

            {holidayForm.scope === 'DEPARTMENT' && (
              <FormControl fullWidth required>
                <InputLabel>Target Department</InputLabel>
                <Select
                  value={holidayForm.targetDepartment}
                  label="Target Department"
                  onChange={(e) => setHolidayForm({ ...holidayForm, targetDepartment: e.target.value })}
                >
                  <MenuItem value="Finance & Revenue">Finance & Revenue</MenuItem>
                  <MenuItem value="Clinical Services">Clinical Services (Doctors & OPD)</MenuItem>
                  <MenuItem value="Nursing & Ward">Nursing & Inpatient Care</MenuItem>
                  <MenuItem value="Pharmacy & Dispensary">Pharmacy & Dispensary</MenuItem>
                  <MenuItem value="Laboratory & Diagnostics">Laboratory & Diagnostics</MenuItem>
                  <MenuItem value="Administration">Administration & HR</MenuItem>
                </Select>
              </FormControl>
            )}

            {holidayForm.scope === 'CUSTOM_STAFF' && (
              <FormControl fullWidth required>
                <InputLabel>Select Staff Members</InputLabel>
                <Select
                  multiple
                  value={holidayForm.targetStaffIds}
                  label="Select Staff Members"
                  onChange={(e) => {
                    const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    setHolidayForm({ ...holidayForm, targetStaffIds: val });
                  }}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => {
                        const emp = employees.find(e => e.id === value || e.empId === value);
                        return (
                          <Chip key={value} label={emp ? `${emp.firstName} ${emp.lastName}` : value} size="small" />
                        );
                      })}
                    </Box>
                  )}
                >
                  {employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.role} • {emp.department})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description / Gazetted Reference"
              value={holidayForm.description}
              onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
              placeholder="e.g. Declared Federal Government Statutory Holiday"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setHolidayModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateHoliday}
            variant="contained"
            sx={{
              bgcolor: '#d97706',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 1.5,
              '&:hover': { bgcolor: '#b45309' }
            }}
          >
            Set Public Holiday
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── HR Staff Leave Grant Modal ────────────────────────────────────── */}
      <Dialog
        open={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: COLORS.maroonPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkOff sx={{ color: '#059669' }} />
          Grant Staff Leave & Absence Schedule
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Register and approve staff leaves (Annual, Maternity, Sick, Training). Approved dates reflect immediately in the staff member's timesheet grid and shift summaries.
          </Typography>

          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Staff Member</InputLabel>
              <Select
                value={leaveForm.staffId}
                label="Staff Member"
                onChange={(e) => setLeaveForm({ ...leaveForm, staffId: e.target.value })}
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.role} • {emp.department} • {emp.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Leave Category</InputLabel>
              <Select
                value={leaveForm.leaveType}
                label="Leave Category"
                onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
              >
                <MenuItem value="ANNUAL">Annual Leave</MenuItem>
                <MenuItem value="MATERNITY">Maternity Leave</MenuItem>
                <MenuItem value="PATERNITY">Paternity Leave</MenuItem>
                <MenuItem value="SICK">Sick / Medical Leave</MenuItem>
                <MenuItem value="TRAINING">Training / Clinical Conference</MenuItem>
                <MenuItem value="COMPASSIONATE">Compassionate / Emergency Leave</MenuItem>
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="Start Date"
                  value={leaveForm.startDate}
                  onChange={(e) => {
                    const start = e.target.value;
                    const d1 = new Date(start);
                    const d2 = new Date(leaveForm.endDate);
                    const diff = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                    setLeaveForm({ ...leaveForm, startDate: start, days: isNaN(diff) ? 1 : diff });
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="End Date"
                  value={leaveForm.endDate}
                  onChange={(e) => {
                    const end = e.target.value;
                    const d1 = new Date(leaveForm.startDate);
                    const d2 = new Date(end);
                    const diff = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                    setLeaveForm({ ...leaveForm, endDate: end, days: isNaN(diff) ? 1 : diff });
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              type="number"
              label="Total Leave Days"
              value={leaveForm.days}
              onChange={(e) => setLeaveForm({ ...leaveForm, days: Number(e.target.value) })}
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Reason / Clinical Handover Details"
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="e.g. Scheduled annual holiday leave / Clinical relieving officer assigned"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLeaveModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateLeave}
            variant="contained"
            sx={{
              bgcolor: '#059669',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 1.5,
              '&:hover': { bgcolor: '#047857' }
            }}
          >
            Grant & Schedule Leave
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          REVIEW TIMESHEET GRID MODAL (SUPERVISOR & ADMIN REVIEW DESK)
          ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        {selectedReviewTs && (() => {
          const isCashier = selectedReviewTs.designation?.toLowerCase().includes('cashier') || selectedReviewTs.projectName?.includes('Revenue');
          const grid = generateRosterGrid(
            selectedReviewTs.month || 'September',
            Number(selectedReviewTs.year) || 2026,
            selectedReviewTs.projectName || 'Revenue & Cash Desk Operations',
            isCashier ? 'cashier' : 'clinical',
            selectedReviewTs.empId || 'EMP-006',
            holidays,
            leaves,
            selectedReviewTs.department || 'Finance & Revenue'
          );

          return (
            <>
              {/* Header */}
              <DialogTitle
                sx={{
                  p: 2.5,
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1.5
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                    <AssignmentTurnedIn sx={{ fontSize: 26 }} />
                  </Box>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.02em', color: '#ffffff' }}>
                        Review Timesheet — {selectedReviewTs.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${selectedReviewTs.month} ${selectedReviewTs.year || '2026'}`}
                        sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: '#ffffff', fontWeight: 800, fontSize: '0.75rem' }}
                      />
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                      {selectedReviewTs.designation} • {selectedReviewTs.department} • {selectedReviewTs.empId}
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Chip
                    label={
                      selectedReviewTs.status === 'APPROVED' ? 'APPROVED & SEALED' :
                      selectedReviewTs.status === 'PENDING_ADMIN_APPROVAL' ? 'PENDING EXEC SEAL' :
                      selectedReviewTs.status === 'SUBMITTED' ? 'PENDING SUPERVISOR' :
                      selectedReviewTs.status === 'REJECTED' ? 'RETURNED' : 'DRAFT'
                    }
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      bgcolor:
                        selectedReviewTs.status === 'APPROVED' ? '#dcfce7' :
                        selectedReviewTs.status === 'PENDING_ADMIN_APPROVAL' ? '#fef3c7' :
                        selectedReviewTs.status === 'SUBMITTED' ? '#e0f2fe' :
                        selectedReviewTs.status === 'REJECTED' ? '#fee2e2' : '#f1f5f9',
                      color:
                        selectedReviewTs.status === 'APPROVED' ? '#16a34a' :
                        selectedReviewTs.status === 'PENDING_ADMIN_APPROVAL' ? '#d97706' :
                        selectedReviewTs.status === 'SUBMITTED' ? '#0284c7' :
                        selectedReviewTs.status === 'REJECTED' ? '#dc2626' : '#64748b'
                    }}
                  />
                  <IconButton onClick={() => setReviewModalOpen(false)} sx={{ color: '#ffffff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }} size="small">
                    <Close />
                  </IconButton>
                </Stack>
              </DialogTitle>

              {/* Content */}
              <DialogContent sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
                {/* Metrics Summary Strip */}
                {(() => {
                  const displayHoursWorked = Number(grid.totalHoursWorked || 112);
                  const displayExpectedHours = Number(grid.expectedShiftHours || 192);
                  const compliancePercent = displayExpectedHours > 0 ? Math.round((displayHoursWorked / displayExpectedHours) * 100) : 58;

                  return (
                    <Grid container spacing={2} sx={{ mb: 2.5 }}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card elevation={0} sx={{ p: 1.8, borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#dbeafe', color: '#1e40af' }}>
                            <AccessTime sx={{ fontSize: 22 }} />
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>Hours Worked</Typography>
                            <Typography variant="h6" fontWeight={900} color="#1e40af">
                              {displayHoursWorked} hrs
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <Card elevation={0} sx={{ p: 1.8, borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#fef3c7', color: '#b45309' }}>
                            <EventAvailable sx={{ fontSize: 22 }} />
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>Expected Hours</Typography>
                            <Typography variant="h6" fontWeight={900} color="#b45309">
                              {displayExpectedHours} hrs
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <Card elevation={0} sx={{ p: 1.8, borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#dcfce7', color: '#15803d' }}>
                            <Verified sx={{ fontSize: 22 }} />
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>Duty Compliance</Typography>
                            <Typography variant="h6" fontWeight={900} color="#15803d">
                              {compliancePercent}%
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <Card elevation={0} sx={{ p: 1.8, borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#ede9fe', color: '#6d28d9' }}>
                            <Apartment sx={{ fontSize: 22 }} />
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>Assigned Project</Typography>
                            <Typography variant="subtitle2" fontWeight={800} color="#6d28d9" noWrap>
                              {selectedReviewTs.projectName || 'Revenue Operations'}
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                    </Grid>
                  );
                })()}

                {/* Returned for Correction Alert Banner */}
                {selectedReviewTs.returnInfo && (
                  <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2, border: '1px solid #fde68a' }}>
                    <Typography variant="subtitle2" fontWeight={800} color="#92400e">
                      Returned for Correction by {selectedReviewTs.returnInfo.returnedBy} ({selectedReviewTs.returnInfo.returnedByRole}):
                    </Typography>
                    <Typography variant="body2" color="#78350f" sx={{ mt: 0.3 }}>
                      "{selectedReviewTs.returnInfo.reason}"
                    </Typography>
                  </Alert>
                )}

                {/* Monthly Timesheet Grid Table */}
                <Card elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle1" fontWeight={800} color="#1e3a8a" sx={{ mb: 1.5 }}>
                    Monthly Roster Shift Schedule & Activity Breakdown
                  </Typography>

                  <Box sx={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                    <Table size="small" sx={{ minWidth: 1200, '& th, & td': { p: '4px 6px', textAlign: 'center', fontSize: '0.75rem' } }}>
                      <TableHead sx={{ '& .MuiTableCell-head': { color: '#ffffff !important' }, '& th': { color: '#ffffff !important' } }}>
                        <TableRow sx={{ bgcolor: '#1e3a8a !important' }}>
                          <TableCell sx={{ fontWeight: 800, color: '#ffffff !important', textAlign: 'left !important', minWidth: 220, position: 'sticky', left: 0, zIndex: 4, bgcolor: '#1e3a8a !important' }}>
                            Day of Month
                          </TableCell>
                          {grid.days.map((d: any) => (
                            <TableCell key={`rev-head-day-${d.day}`} sx={{ fontWeight: 800, color: '#ffffff !important', minWidth: 32, bgcolor: '#1e3a8a !important' }}>
                              {d.day}
                            </TableCell>
                          ))}
                          <TableCell sx={{ fontWeight: 800, color: '#ffffff !important', minWidth: 70, bgcolor: '#1e3a8a !important' }}>Total</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#ffffff !important', minWidth: 65, bgcolor: '#1e3a8a !important' }}>%</TableCell>
                        </TableRow>
                        <TableRow sx={{ bgcolor: '#2563eb !important' }}>
                          <TableCell sx={{ fontWeight: 800, color: '#ffffff !important', textAlign: 'left !important', position: 'sticky', left: 0, zIndex: 4, bgcolor: '#2563eb !important' }}>
                            Day of Week
                          </TableCell>
                          {grid.days.map((d: any) => (
                            <TableCell key={`rev-head-dow-${d.day}`} sx={{ fontWeight: 800, color: '#ffffff !important', bgcolor: '#2563eb !important' }}>
                              {d.dayOfWeek}
                            </TableCell>
                          ))}
                          <TableCell sx={{ fontWeight: 800, color: '#ffffff !important', bgcolor: '#2563eb !important' }}>(hrs)</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#ffffff !important', bgcolor: '#2563eb !important' }}>(%)</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {/* Expected Shift Hours Row */}
                        <TableRow hover sx={{ bgcolor: '#ffffff' }}>
                          <TableCell sx={{ fontWeight: 800, color: '#1e3a8a', textAlign: 'left', position: 'sticky', left: 0, zIndex: 3, bgcolor: '#ffffff' }}>
                            Expected Shift Hours <Chip label="Plan" size="small" sx={{ height: 16, fontSize: '9px', fontWeight: 800, ml: 0.5 }} />
                          </TableCell>
                          {grid.days.map((d: any) => (
                            <TableCell key={`rev-exp-${d.day}`} sx={{ fontWeight: 700, color: d.isOffDuty || d.isWeekend ? '#94a3b8' : '#1e3a8a', bgcolor: d.isOffDuty || d.isWeekend ? '#f8fafc' : '#ffffff' }}>
                              {d.isOffDuty || d.isWeekend ? 'OFF' : Number(d.expectedHours ?? 8).toFixed(1)}
                            </TableCell>
                          ))}
                          <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>{Number(grid.expectedShiftHours ?? 176).toFixed(1)} hrs</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>100%</TableCell>
                        </TableRow>

                        {/* Actual Worked Row */}
                        {(() => {
                          const expShiftHours = Number(grid.expectedShiftHours || 192);
                          const actualWorkedTotal = grid.days.reduce((acc: number, d: any) => {
                            if (d.isOffDuty || d.isWeekend || d.isFuture) return acc;
                            const val = d.hoursWorked ?? d.projectHours ?? d.actualProjectHours ?? (d.isLeave || d.isHoliday ? 0 : d.expectedHours) ?? 0;
                            return acc + Number(val || 0);
                          }, 0) || Number(grid.totalProjectHours || 112);
                          const actualWorkedPct = expShiftHours > 0 ? Math.round((actualWorkedTotal / expShiftHours) * 100) : 0;

                          // Compute total leave hours across all categories
                          let totalLeaveHoursAll = 0;
                          const leaveRowData = [
                            { key: 'annual',         label: '🏖️ Annual leave' },
                            { key: 'sick',           label: '🤒 Sick / Medical leave' },
                            { key: 'maternity',      label: '🤱 Maternity leave' },
                            { key: 'paternity',      label: '👨‍👦 Paternity leave' },
                            { key: 'holiday',        label: '🎉 Holiday / Comp leave' },
                            { key: 'casual',         label: '✈️ Casual / Out-of-Office' },
                            { key: 'compassionate',  label: '🕊️ Compassionate / Bereavement' },
                            { key: 'study',          label: '📚 Study & Examination leave' },
                            { key: 'training',       label: '🎓 Training / Off-duty' }
                          ].map((row) => {
                            const rowTotal = grid.days.reduce((acc: number, d: any) => {
                              const lVal = (d.leaves && d.leaves[row.key]) ?? d[row.key] ?? d[row.key + 'Leave'] ?? 0;
                              return acc + Number(lVal || 0);
                            }, 0);
                            totalLeaveHoursAll += rowTotal;
                            const rowPct = expShiftHours > 0 ? Math.round((rowTotal / expShiftHours) * 100) : 0;
                            return { ...row, rowTotal, rowPct };
                          });

                          const totalActualLogged = actualWorkedTotal + totalLeaveHoursAll;
                          const totalLoggedPct = expShiftHours > 0 ? Math.round((totalActualLogged / expShiftHours) * 100) : 0;

                          return (
                            <>
                              <TableRow hover sx={{ bgcolor: '#f0fdf4' }}>
                                <TableCell sx={{ fontWeight: 800, color: '#166534', textAlign: 'left', position: 'sticky', left: 0, zIndex: 3, bgcolor: '#f0fdf4' }}>
                                  Actual Worked & Closed to Date
                                </TableCell>
                                {grid.days.map((d: any) => {
                                  const val = d.hoursWorked ?? d.projectHours ?? d.actualProjectHours ?? (d.isFuture ? 0 : d.expectedHours) ?? 0;
                                  return (
                                    <TableCell key={`rev-act-${d.day}`} sx={{ fontWeight: 800, color: d.isOffDuty || d.isWeekend ? '#94a3b8' : (d.isFuture ? '#cbd5e1' : '#166534'), bgcolor: d.isOffDuty || d.isWeekend ? '#f8fafc' : '#f0fdf4' }}>
                                      {d.isOffDuty || d.isWeekend ? 'OFF' : (d.isFuture ? '—' : Number(val).toFixed(1))}
                                    </TableCell>
                                  );
                                })}
                                <TableCell sx={{ fontWeight: 900, color: '#166534', bgcolor: '#dcfce7' }}>{Number(actualWorkedTotal).toFixed(1)} hrs</TableCell>
                                <TableCell sx={{ fontWeight: 900, color: '#166534', bgcolor: '#dcfce7' }}>{actualWorkedPct}%</TableCell>
                              </TableRow>

                              {/* Leave Breakdown Rows */}
                              {leaveRowData.map((row) => (
                                <TableRow key={`rev-row-${row.key}`} hover sx={{ bgcolor: '#ffffff' }}>
                                  <TableCell sx={{ fontWeight: 600, color: '#475569', textAlign: 'left', position: 'sticky', left: 0, zIndex: 3, bgcolor: '#ffffff' }}>
                                    {row.label}
                                  </TableCell>
                                  {grid.days.map((d: any) => {
                                    const lVal = (d.leaves && d.leaves[row.key]) ?? d[row.key] ?? d[row.key + 'Leave'] ?? 0;
                                    return (
                                      <TableCell key={`rev-day-${row.key}-${d.day}`} sx={{ color: '#64748b', bgcolor: d.isOffDuty || d.isWeekend ? '#f8fafc' : '#ffffff' }}>
                                        {Number(lVal).toFixed(1)}
                                      </TableCell>
                                    );
                                  })}
                                  <TableCell sx={{ fontWeight: 700, color: row.rowTotal > 0 ? '#1e40af' : '#64748b' }}>
                                    {Number(row.rowTotal).toFixed(1)} hrs
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 700, color: row.rowTotal > 0 ? '#1e40af' : '#64748b' }}>
                                    {row.rowPct}%
                                  </TableCell>
                                </TableRow>
                              ))}

                              {/* Total Logged Row */}
                              <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                <TableCell sx={{ fontWeight: 900, color: '#0f172a', textAlign: 'left', position: 'sticky', left: 0, zIndex: 3, bgcolor: '#f1f5f9' }}>
                                  Total Actual Logged
                                </TableCell>
                                {grid.days.map((d: any) => {
                                  const lVal = (d.annualLeave || 0) + (d.sickLeave || 0) + (d.maternity || 0) + (d.paternity || 0) + (d.holiday || 0) + (d.casualLeave || 0) + (d.compassionate || 0) + (d.study || 0) + (d.training || 0);
                                  const totVal = d.isOffDuty || d.isWeekend ? '' : (d.isFuture ? (lVal > 0 ? lVal : '—') : (d.totalDaily ?? d.hoursWorked ?? d.projectHours ?? 8));
                                  return (
                                    <TableCell key={`rev-total-${d.day}`} sx={{ fontWeight: 800, bgcolor: d.isOffDuty || d.isWeekend ? '#f8fafc' : '#ffffff', color: '#0f172a' }}>
                                      {totVal !== '' && totVal !== '—' ? Number(totVal).toFixed(1) : (totVal === '—' ? '—' : '')}
                                    </TableCell>
                                  );
                                })}
                                <TableCell sx={{ fontWeight: 900, color: '#16a34a', bgcolor: '#dcfce7' }}>{Number(totalActualLogged).toFixed(1)} hrs</TableCell>
                                <TableCell sx={{ fontWeight: 900, color: '#16a34a', bgcolor: '#dcfce7' }}>{totalLoggedPct}%</TableCell>
                              </TableRow>
                            </>
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </Box>
                </Card>

                {/* Verification & Sign-off Action Cards */}
                <Grid container spacing={2}>
                  {/* Card 1: Staff Officer Submission */}
                  <Grid item xs={12} md={selectedReviewTs.status === 'PENDING_ADMIN_APPROVAL' || selectedReviewTs.status === 'APPROVED' ? 4 : 5}>
                    <Card elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #e2e8f0', height: '100%' }}>
                      <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">
                        1. Staff Officer Submission
                      </Typography>
                      <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                        {selectedReviewTs.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {selectedReviewTs.designation || 'Staff Officer'}
                      </Typography>
                      <Box sx={{ my: 1, minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 1.5, p: 0.5 }}>
                        {selectedReviewTs.staffSignature?.signatureData ? (
                          <img src={selectedReviewTs.staffSignature.signatureData} alt="Staff Sig" style={{ maxHeight: 44, maxWidth: '100%', objectFit: 'contain' }} />
                        ) : (
                          <Typography variant="caption" color="text.secondary">Signed & Submitted</Typography>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Date: <b>{selectedReviewTs.staffSignature?.date || selectedReviewTs.submittedAt || 'September 14, 2026'}</b>
                      </Typography>
                      <Chip label="Staff Signed & Submitted" size="small" color="success" sx={{ mt: 1, fontWeight: 700, fontSize: '0.7rem' }} />
                    </Card>
                  </Grid>

                  {/* Card 2: Supervisor Verification & Sign-Off (Rendered if Supervisor approved or status is pending admin/approved) */}
                  {(selectedReviewTs.status === 'PENDING_ADMIN_APPROVAL' || selectedReviewTs.status === 'APPROVED' || selectedReviewTs.supervisorSignature?.signed) && (
                    <Grid item xs={12} md={4}>
                      <Card elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #e2e8f0', height: '100%' }}>
                        <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">
                          2. Supervisor Sign-Off
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                          {selectedReviewTs.supervisorSignature?.name || 'Mary Okon'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {selectedReviewTs.supervisorSignature?.role || 'Senior Cashier & Shift Supervisor'}
                        </Typography>
                        <Box sx={{ my: 1, minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 1.5, p: 0.5 }}>
                          {selectedReviewTs.supervisorSignature?.signatureData ? (
                            <img src={selectedReviewTs.supervisorSignature.signatureData} alt="Supervisor Sig" style={{ maxHeight: 44, maxWidth: '100%', objectFit: 'contain' }} />
                          ) : (
                            <Typography variant="caption" color="text.secondary">Supervisor Verified</Typography>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Date: <b>{selectedReviewTs.supervisorSignature?.date || 'September 14, 2026'}</b>
                        </Typography>
                        <Chip label="✓ Verified & Approved" size="small" color="success" sx={{ mt: 1, fontWeight: 700, fontSize: '0.7rem' }} />
                      </Card>
                    </Grid>
                  )}

                  {/* Card 3: Hospital Administrator Sign-Off & Official Executive Seal (When APPROVED) */}
                  {selectedReviewTs.status === 'APPROVED' ? (
                    <Grid item xs={12} md={4}>
                      <Card elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #86efac', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">
                              3. Hospital Administrator Sign-Off
                            </Typography>
                            <Chip label="Certified & Approved" size="small" color="success" sx={{ fontWeight: 800, fontSize: '0.68rem', height: 20 }} />
                          </Box>
                          <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                            {selectedReviewTs.adminSignature?.name || selectedAdmin || 'Tunde Fashola'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {selectedReviewTs.adminSignature?.role || 'Hospital Administrator'}
                          </Typography>

                          {/* Signature & Official Executive Seal Box */}
                          <Box sx={{
                            my: 1,
                            minHeight: 56,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-around',
                            bgcolor: '#f8fafc',
                            border: '1px dashed #16a34a',
                            borderRadius: 1.5,
                            p: 0.8,
                            gap: 1
                          }}>
                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img
                                src={selectedReviewTs.adminSignature?.signatureData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60"><path d="M15 25 C30 10, 45 40, 75 15 C95 35, 115 15, 140 25 C155 35, 175 15, 195 25" stroke="%23047857" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="15" y="52" font-family="Brush Script MT, cursive, sans-serif" font-size="22" font-style="italic" fill="%23047857">Tunde Fashola</text><line x1="10" y1="56" x2="200" y2="56" stroke="%23047857" stroke-width="1.2"/></svg>'}
                                alt="Administrator Signature"
                                style={{ maxHeight: 44, maxWidth: '100%', objectFit: 'contain' }}
                              />
                            </Box>
                            {/* Official Executive Stamp Graphic */}
                            <Box sx={{
                              border: '2px solid #059669',
                              borderRadius: '50%',
                              width: 52,
                              height: 52,
                              minWidth: 52,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#047857',
                              bgcolor: 'rgba(5, 150, 105, 0.06)',
                              transform: 'rotate(-8deg)',
                              boxShadow: '0 0 0 1px #059669 inset',
                              textAlign: 'center',
                              lineHeight: 1,
                              p: 0.2
                            }}>
                              <Typography sx={{ fontSize: '5.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1 }}>FAITH FOUNDATION</Typography>
                              <Typography sx={{ fontSize: '7px', fontWeight: 900, color: '#047857', my: 0.2, lineHeight: 1 }}>★ SEAL ★</Typography>
                              <Typography sx={{ fontSize: '5.5px', fontWeight: 800, textTransform: 'uppercase', lineHeight: 1 }}>APPROVED</Typography>
                            </Box>
                          </Box>

                          <Typography variant="caption" color="text.secondary" display="block">
                            Date: <b>{selectedReviewTs.adminSignature?.date || 'September 15, 2026'}</b>
                          </Typography>
                        </Box>

                        <Box sx={{ mt: 1 }}>
                          <Chip
                            icon={<CheckCircle sx={{ fontSize: '15px !important' }} />}
                            label="Official Executive Seal Affixed & Archived"
                            size="small"
                            color="success"
                            sx={{ fontWeight: 800, fontSize: '0.68rem', width: '100%', height: 26, '& .MuiChip-label': { px: 0.5 } }}
                          />
                        </Box>
                      </Card>
                    </Grid>
                  ) : (
                    /* Card 3: Action Desk Box for SUBMITTED or PENDING_ADMIN_APPROVAL */
                    <Grid item xs={12} md={selectedReviewTs.status === 'PENDING_ADMIN_APPROVAL' ? 4 : 7}>
                      <Card elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #e2e8f0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">
                              {selectedReviewTs.status === 'PENDING_ADMIN_APPROVAL' ? '3. Executive Seal & Administrator Sign-Off' : '2. Supervisor Verification & Forwarding'}
                            </Typography>
                            <Chip
                              size="small"
                              label={
                                selectedReviewTs.status === 'PENDING_ADMIN_APPROVAL' ? 'Ready for Admin Seal' :
                                selectedReviewTs.status === 'SUBMITTED' ? 'Awaiting Supervisor Approval' : 'Review'
                              }
                              color={
                                selectedReviewTs.status === 'PENDING_ADMIN_APPROVAL' ? 'warning' : 'info'
                              }
                              sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                            />
                          </Box>

                          {/* If Pending Supervisor */}
                          {selectedReviewTs.status === 'SUBMITTED' && (
                            <Box sx={{ mt: 1 }}>
                              <Alert severity="info" sx={{ mb: 1.5, py: 0.8, borderRadius: 1.5 }}>
                                <Typography variant="caption" fontWeight={700}>
                                  You are reviewing this timesheet as Supervisor (<b>{currentUserName}</b>). Approving will automatically append your digital signature and route to the designated Administrator / Bishop.
                                </Typography>
                              </Alert>

                              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                Select Forwarding Administrator / Bishop:
                              </Typography>
                              <Select
                                size="small"
                                fullWidth
                                value={reviewTargetAdmin}
                                onChange={(e) => setReviewTargetAdmin(e.target.value)}
                                sx={{ mb: 1.5, fontWeight: 700, bgcolor: '#ffffff', borderRadius: 1.5 }}
                              >
                                {EXECUTIVE_ADMIN_OPTIONS.map((a) => (
                                  <MenuItem key={a.id || a.name} value={a.name}>
                                    {a.name} ({a.title})
                                  </MenuItem>
                                ))}
                                {!EXECUTIVE_ADMIN_OPTIONS.some(a => a.name === reviewTargetAdmin) && reviewTargetAdmin && (
                                  <MenuItem value={reviewTargetAdmin}>
                                    {reviewTargetAdmin}
                                  </MenuItem>
                                )}
                              </Select>

                              {/* Supervisor Appended Digital Signature Preview Box & Validation */}
                              {savedSignature?.signatureData ? (
                                <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#ffffff', border: '1.5px solid #cbd5e1' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                                    <Typography variant="caption" fontWeight={800} color="#1e3a8a" textTransform="uppercase">
                                      Your Appended Supervisor Signature:
                                    </Typography>
                                    <Chip label="Configured & Ready" size="small" color="success" sx={{ height: 18, fontSize: '9px', fontWeight: 800 }} />
                                  </Box>
                                  <Box sx={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px dashed #94a3b8', p: 0.5 }}>
                                    <img src={savedSignature.signatureData} alt="Supervisor Signature" style={{ maxHeight: 42, maxWidth: '100%', objectFit: 'contain' }} />
                                  </Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'center', fontWeight: 600, fontSize: '0.72rem' }}>
                                    {currentUserName} • Official Verified Digital Signature
                                  </Typography>
                                </Box>
                              ) : (
                                <Alert
                                  severity="error"
                                  icon={<WarningAmber sx={{ color: '#dc2626', fontSize: 24 }} />}
                                  action={
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="error"
                                      startIcon={<Draw />}
                                      onClick={() => {
                                        setReviewModalOpen(false);
                                        setActiveTab(3);
                                      }}
                                      sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem', px: 1.5 }}
                                    >
                                      Set Signature
                                    </Button>
                                  }
                                  sx={{ mb: 1.5, borderRadius: 2, border: '1.5px solid #f87171', bgcolor: '#fef2f2', '& .MuiAlert-message': { width: '100%' } }}
                                >
                                  <Typography variant="subtitle2" fontWeight={800} color="#991b1b">
                                    ⚠️ Digital Signature Required
                                  </Typography>
                                  <Typography variant="caption" color="#7f1d1d" sx={{ display: 'block', mt: 0.3 }}>
                                    No signature configured. You must set up your digital signature in the "My Profile & Digital Signature" tab before approving and forwarding timesheets.
                                  </Typography>
                                </Alert>
                              )}
                            </Box>
                          )}

                          {/* If Pending Admin */}
                          {selectedReviewTs.status === 'PENDING_ADMIN_APPROVAL' && (
                            <Box sx={{ mt: 1 }}>
                              <Alert severity="success" sx={{ mb: 1.5, py: 0.5, borderRadius: 1.5 }}>
                                <Typography variant="caption" fontWeight={700}>
                                  Verified and approved by Supervisor ({selectedReviewTs.supervisorSignature?.name || 'Unit Supervisor'}). Ready for Executive Seal Authorization.
                                </Typography>
                              </Alert>

                              {/* Executive Seal & Signature Preview Box */}
                              {savedSignature?.signatureData ? (
                                <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1.5px solid #86efac' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                                    <Typography variant="caption" fontWeight={800} color="#166534" textTransform="uppercase">
                                      Executive Seal & Sign-off Preview:
                                    </Typography>
                                    <Chip label="Ready to Authorize" size="small" color="success" sx={{ height: 18, fontSize: '9px', fontWeight: 800 }} />
                                  </Box>
                                  <Box sx={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-around', bgcolor: '#ffffff', borderRadius: 1.5, border: '1px dashed #16a34a', p: 0.5 }}>
                                    <img
                                      src={savedSignature.signatureData}
                                      alt="Admin Signature Preview"
                                      style={{ maxHeight: 38, maxWidth: '60%', objectFit: 'contain' }}
                                    />
                                    <Box sx={{
                                      border: '1.5px solid #059669',
                                      borderRadius: '50%',
                                      width: 42,
                                      height: 42,
                                      minWidth: 42,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#047857',
                                      bgcolor: 'rgba(5, 150, 105, 0.08)',
                                      transform: 'rotate(-8deg)',
                                      textAlign: 'center'
                                    }}>
                                      <Typography sx={{ fontSize: '5px', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1 }}>FAITH FOUNDATION</Typography>
                                      <Typography sx={{ fontSize: '6px', fontWeight: 900, color: '#047857', my: 0.1, lineHeight: 1 }}>★ SEAL ★</Typography>
                                      <Typography sx={{ fontSize: '5px', fontWeight: 800, textTransform: 'uppercase', lineHeight: 1 }}>SEAL</Typography>
                                    </Box>
                                  </Box>
                                  <Typography variant="caption" color="#15803d" sx={{ display: 'block', mt: 0.5, textAlign: 'center', fontWeight: 700, fontSize: '0.72rem' }}>
                                    {isSuperAdminOrBishop ? currentUserName : (selectedAdmin || 'Amedu Alapa')} • Hospital Administrator / Bishop
                                  </Typography>
                                </Box>
                              ) : (
                                <Alert
                                  severity="error"
                                  icon={<WarningAmber sx={{ color: '#dc2626', fontSize: 24 }} />}
                                  action={
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="error"
                                      startIcon={<Draw />}
                                      onClick={() => {
                                        setReviewModalOpen(false);
                                        setActiveTab(3);
                                      }}
                                      sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem', px: 1.5 }}
                                    >
                                      Set Signature
                                    </Button>
                                  }
                                  sx={{ mb: 1.5, borderRadius: 2, border: '1.5px solid #f87171', bgcolor: '#fef2f2', '& .MuiAlert-message': { width: '100%' } }}
                                >
                                  <Typography variant="subtitle2" fontWeight={800} color="#991b1b">
                                    ⚠️ Administrator Signature Required
                                  </Typography>
                                  <Typography variant="caption" color="#7f1d1d" sx={{ display: 'block', mt: 0.3 }}>
                                    No signature configured. You must set up or upload your digital signature in the "My Profile & Digital Signature" tab before authorizing and sealing timesheets.
                                  </Typography>
                                </Alert>
                              )}

                              {!isSuperAdminOrBishop && (
                                <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    🔒 Executive Seal Restricted (Authorized only by Hospital Administrator / Bishop)
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          )}
                        </Box>

                        {/* Action Buttons */}
                        <Box sx={{ mt: 2 }}>
                          {selectedReviewTs.status === 'SUBMITTED' && (
                            <Stack direction="row" spacing={1.5}>
                              <Button
                                fullWidth
                                variant="contained"
                                color={savedSignature?.signatureData ? 'success' : 'error'}
                                disabled={!savedSignature?.signatureData}
                                startIcon={savedSignature?.signatureData ? <Check /> : <WarningAmber />}
                                onClick={async () => {
                                  if (!savedSignature?.signatureData) {
                                    enqueueSnackbar('⚠️ Signature Required: Please configure your signature in "My Profile & Digital Signature" tab first.', { variant: 'error' });
                                    setReviewModalOpen(false);
                                    setActiveTab(3);
                                    return;
                                  }
                                  await handleSupervisorApproveAndForward(selectedReviewTs.id, currentUserName, reviewTargetAdmin);
                                  setReviewModalOpen(false);
                                }}
                                sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 1.5, py: 1 }}
                              >
                                {savedSignature?.signatureData ? 'Approve & Forward to Executive' : 'Signature Required to Approve'}
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Reply />}
                                onClick={() => {
                                  setReviewModalOpen(false);
                                  handleOpenReturnModal(selectedReviewTs, 'Supervisor');
                                }}
                                sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 1.5, px: 2.5 }}
                              >
                                Return for Correction
                              </Button>
                            </Stack>
                          )}

                          {selectedReviewTs.status === 'PENDING_ADMIN_APPROVAL' && isSuperAdminOrBishop && (
                            <Stack direction="row" spacing={1.5}>
                              <Button
                                fullWidth
                                variant="contained"
                                color={savedSignature?.signatureData ? 'success' : 'error'}
                                disabled={!savedSignature?.signatureData}
                                startIcon={savedSignature?.signatureData ? <Shield /> : <WarningAmber />}
                                onClick={async () => {
                                  if (!savedSignature?.signatureData) {
                                    enqueueSnackbar('⚠️ Administrator Signature Required: Please configure your signature in "My Profile & Digital Signature" tab first.', { variant: 'error' });
                                    setReviewModalOpen(false);
                                    setActiveTab(3);
                                    return;
                                  }
                                  const effectiveAdmin = isSuperAdminOrBishop ? (currentUserName || 'Amedu Alapa') : selectedAdmin;
                                  await handleAdminSealTimesheet(selectedReviewTs.id, effectiveAdmin);
                                  setReviewModalOpen(false);
                                }}
                                sx={{
                                  bgcolor: savedSignature?.signatureData ? '#047857' : undefined,
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  textTransform: 'none',
                                  borderRadius: 1.5,
                                  py: 1,
                                  '&:hover': { bgcolor: savedSignature?.signatureData ? '#065f46' : undefined }
                                }}
                              >
                                {savedSignature?.signatureData ? 'Authorize Official Executive Seal' : 'Signature Required to Authorize'}
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Reply />}
                                onClick={() => {
                                  setReviewModalOpen(false);
                                  handleOpenReturnModal(selectedReviewTs, selectedAdmin.toLowerCase().includes('bishop') ? 'Bishop' : 'Hospital Administrator');
                                }}
                                sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 1.5, px: 2.5 }}
                              >
                                Return for Correction
                              </Button>
                            </Stack>
                          )}
                        </Box>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </DialogContent>

              {/* Dialog Actions */}
              <DialogActions sx={{ p: 2, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
                <Button
                  startIcon={<Print />}
                  onClick={() => {
                    setPrintPreviewTs(selectedReviewTs);
                    setPrintPreviewOpen(true);
                  }}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Print Timesheet Slip
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setReviewModalOpen(false)}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, px: 3 }}
                >
                  Close
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
}
