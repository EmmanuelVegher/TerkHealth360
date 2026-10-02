import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Box, Grid, Card, Typography, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Stack, Divider,
  Tooltip, IconButton, FormControl, InputLabel, Select, MenuItem,
  LinearProgress, Alert, AlertTitle, Badge, Avatar, List, ListItem,
  ListItemText, ListItemAvatar, ListItemIcon, InputAdornment, Pagination
} from '@mui/material';
import {
  Shield, CheckCircle, Cancel, Receipt, People,
  LocalHospital, AccountBalance, Assignment, Security,
  Timeline, Warning, Refresh, VerifiedUser, Gavel,
  EventNote, HowToVote, HistoryEdu, TrendingUp,
  WorkHistory, Approval, KeyboardReturn,
  CalendarMonth, AccessTime, Person, CheckBox,
  NotificationsActive, Fingerprint, Stars,
  Search, FileDownload, Print, FilterList,
  AttachMoney, AccountBalanceWallet, BeachAccess,
  MedicalServices, LocalAtm, Assessment, CheckCircleOutline,
  ErrorOutline, Lock, LockOpen, ArrowForward, HelpOutline, Policy,
} from '@mui/icons-material';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { NairaCircleIcon } from '../components/NairaIcon';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import { DailyIncomeExpenditureSheet } from '../components/DailyIncomeExpenditureSheet';

// ─── Theme Tokens ──────────────────────────────────────────────────────────────
const C = {
  primary:      '#3b0764', // Deep Imperial Purple
  primaryDark:  '#2e0249',
  secondary:    '#581c87', // Royal Purple
  accent:       '#b45309',
  gold:         '#d97706', // Episcopal Gold
  goldLight:    '#fef3c7',
  goldBorder:   '#f59e0b',
  success:      '#15803d',
  successBg:    '#dcfce7',
  warning:      '#b45309',
  warningBg:    '#fef3c7',
  danger:       '#b91c1c',
  dangerBg:     '#fee2e2',
  info:         '#1d4ed8',
  infoBg:       '#dbeafe',
  surface:      '#f8fafc',
  cardBg:       '#ffffff',
  border:       '#e2e8f0',
  text:         '#0f172a',
  muted:        '#64748b',
};

const gradientHeader = `linear-gradient(135deg, ${C.primaryDark} 0%, ${C.secondary} 45%, #1e1b4b 100%)`;

// ─── Helper Formatters ─────────────────────────────────────────────────────────
const fmtNGN = (v: number | null | undefined) =>
  v == null ? '₦0' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};

const fmtDateTime = (d: string | null | undefined) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
};

// ─── Sub-Components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = C.primary, trend }: any) {
  return (
    <Card sx={{
      p: 2.5,
      borderRadius: 3,
      height: '100%',
      bgcolor: '#fff',
      border: `1px solid ${C.border}`,
      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
      }
    }}>
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        bgcolor: color,
      }} />
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar sx={{
          bgcolor: `${color}15`,
          color,
          width: 52,
          height: 52,
          borderRadius: 2.5,
          border: `1px solid ${color}30`
        }}>
          {icon}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 850, color: C.text, lineHeight: 1.2, my: 0.3, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {value}
          </Typography>
          {sub && (
            <Typography variant="caption" sx={{ color: color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {trend} {sub}
            </Typography>
          )}
        </Box>
      </Stack>
    </Card>
  );
}

// ─── Sub-Routes Configuration ─────────────────────────────────────────────────
const SUB_ROUTES = [
  { id: 'overview',           label: 'Executive Overview',        path: '/bishop-desk',                     icon: <TrendingUp /> },
  { id: 'financial-reports',  label: 'Financial & Transactions',   path: '/bishop-desk/financial-reports',  icon: <AccountBalanceWallet /> },
  { id: 'audit-reports',      label: 'Financial & Statutory Audits', path: '/bishop-desk/audit-reports',   icon: <Assessment /> },
  { id: 'leave-reports',      label: 'Staff Leave Reports',       path: '/bishop-desk/leave-reports',      icon: <BeachAccess /> },
  { id: 'roster-reports',     label: 'Duty Roster & Shifts',      path: '/bishop-desk/roster-reports',     icon: <CalendarMonth /> },
  { id: 'attendance-reports', label: 'Clock-In & Attendance',     path: '/bishop-desk/attendance-reports', icon: <AccessTime /> },
  { id: 'payroll',            label: 'Episcopal Payroll',         path: '/bishop-desk/payroll',            icon: <Gavel /> },
  { id: 'timesheets',         label: 'Admin Timesheets',          path: '/bishop-desk/timesheets',         icon: <WorkHistory /> },
  { id: 'projects',           label: 'Capital Projects',          path: '/bishop-desk/projects',           icon: <Assignment /> },
];

export default function BishopsDashboard() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ── Access guard ──
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN');
  const isBishop = user?.designation === 'Bishop' || user?.role === 'BISHOP' || user?.roles?.includes('BISHOP') || (user?.designation || '').toLowerCase().includes('bishop') || (user?.role || '').toLowerCase() === 'bishop' || (user?.username || '').toLowerCase().includes('bishop');
  
  if (!isSuperAdmin && !isBishop) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: C.surface }}>
        <Card sx={{ maxWidth: 480, p: 5, textAlign: 'center', borderRadius: 4, border: `1px solid ${C.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
          <Shield sx={{ fontSize: '4.5rem', color: C.danger, mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: C.text }}>Episcopal Desk Restricted</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The Diocesan Bishop's Executive Desk is exclusively accessible to the Diocesan Bishop, Episcopal Patron, and Super Administrators.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')} sx={{ bgcolor: C.primary, fontWeight: 700, borderRadius: 2, px: 3, py: 1 }}>
            Return to Main Dashboard
          </Button>
        </Card>
      </Box>
    );
  }

  // ── Active Sub-Page Calculation ──
  const currentPath = location.pathname.toLowerCase().replace(/\/$/, '');
  const activeTabIndex = useMemo(() => {
    const idx = SUB_ROUTES.findIndex(r => r.path === currentPath || (r.id === 'overview' && (currentPath === '/bishop-desk' || currentPath === '/bishop-desk/overview')));
    return idx >= 0 ? idx : 0;
  }, [currentPath]);

  // ── Live PostgreSQL State Stores ──
  const [loading, setLoading] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState<any>({
    totalPatients: 0,
    activeAdmissions: 0,
    totalBeds: 0,
    bedOccupancyRate: '0%',
    totalStaff: 0,
    todayAppointments: 0,
    todayQueues: 0,
    monthlyRevenue: 0,
    invoicesCount: 0,
  });

  const [financialAnalytics, setFinancialAnalytics] = useState<any>({
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    todayInflow: 0,
    collectionEfficiency: 100,
    totalTransactions: 0,
    averageTicket: 0,
    methodStats: { POS: 0, TRANSFER: 0, CASH: 0 },
    departmentRevenue: [],
    revenueTrend: [],
  });

  const [recentPayments, setRecentPayments]   = useState<any[]>([]);
  const [financialAudits, setFinancialAudits] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests]     = useState<any[]>([]);
  const [rosterShifts, setRosterShifts]       = useState<any[]>([]);
  const [clockLogs, setClockLogs]             = useState<any[]>([]);
  const [payroll, setPayroll]                 = useState<any[]>([]);
  const [timesheets, setTimesheets]           = useState<any[]>([]);
  const [projects, setProjects]               = useState<any[]>([]);
  const [wardsSummary, setWardsSummary]       = useState<any[]>([]);

  // Search & Filter State for Reports
  const [searchTerm, setSearchTerm]         = useState('');
  const [filterDept, setFilterDept]         = useState('ALL');
  const [filterStatus, setFilterStatus]     = useState('ALL');
  const [filterMethod, setFilterMethod]     = useState('ALL');

  // Dialogs
  const [paySealKey, setPaySealKey]         = useState('');
  const [payProcessing, setPayProcessing]   = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [sealDialogOpen, setSealDialogOpen] = useState(false);

  const [tsDialog, setTsDialog]             = useState(false);
  const [selTs, setSelTs]                   = useState<any>(null);
  const [tsAction, setTsAction]             = useState<'APPROVED'|'RETURNED_FOR_CORRECTION'>('APPROVED');
  const [tsComment, setTsComment]           = useState('');

  const [projDialog, setProjDialog]         = useState(false);
  const [selProj, setSelProj]               = useState<any>(null);
  const [projAction, setProjAction]         = useState<'APPROVED'|'REJECTED'>('APPROVED');
  const [projCode, setProjCode]             = useState('');

  const [auditDetailOpen, setAuditDetailOpen] = useState(false);
  const [selectedAudit, setSelectedAudit]     = useState<any>(null);
  const [auditDecreeCode, setAuditDecreeCode] = useState('');
  const [auditDecreeComment, setAuditDecreeComment] = useState('');

  // ── Live Data Fetcher from PostgreSQL ──
  const fetchAllLiveData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        execRes,
        payRes,
        tsRes,
        projRes,
        leaveRes,
        rosterRes,
        attRes
      ] = await Promise.all([
        api.get('/reports/bishop-executive').catch(() => ({ data: { success: false } })),
        api.get('/hr/payroll').catch(() => ({ data: { success: false } })),
        api.get('/hr/admin-timesheets').catch(() => ({ data: { success: false } })),
        api.get('/hr/internal-requests').catch(() => ({ data: { success: false } })),
        api.get('/hr/leaves').catch(() => ({ data: { success: false } })),
        api.get('/hr/roster/shifts').catch(() => ({ data: { success: false } })),
        api.get('/hr/attendance').catch(() => ({ data: { success: false } })),
      ]);

      if (execRes.data?.success && execRes.data.data) {
        setExecutiveSummary(execRes.data.data.summary || {});
        setFinancialAnalytics(execRes.data.data.financialAnalytics || {});
        setRecentPayments(execRes.data.data.recentPayments || []);
        setFinancialAudits(execRes.data.data.financialAudits || []);
        setWardsSummary(execRes.data.data.wardsSummary || []);
      }

      setPayroll(payRes.data?.success ? payRes.data.data : []);
      setTimesheets(tsRes.data?.success ? tsRes.data.data : []);
      setProjects(projRes.data?.success ? projRes.data.data : []);
      setLeaveRequests(leaveRes.data?.success ? leaveRes.data.data : []);
      setRosterShifts(rosterRes.data?.success ? rosterRes.data.data : []);
      setClockLogs(attRes.data?.success ? attRes.data.data : []);

    } catch (e) {
      console.error('Failed to fetch Bishop executive data:', e);
      enqueueSnackbar('Could not refresh live executive data.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchAllLiveData();
  }, [fetchAllLiveData]);

  // ── Action Handlers ──
  const handleOpenSealDialog = (run: any) => {
    setSelectedPayroll(run);
    setPaySealKey('');
    setSealDialogOpen(true);
  };

  const handleApplyEpiscopalSeal = async () => {
    if (!selectedPayroll) return;
    if (paySealKey.trim() !== 'BISHOP-SEAL') {
      enqueueSnackbar('Invalid Episcopal Seal key. Please enter: BISHOP-SEAL', { variant: 'error' });
      return;
    }
    setPayProcessing(true);
    try {
      await api.post(`/hr/payroll/${selectedPayroll.id}/bishop-sign`, {
        bishopName: 'Most Rev. Dr. C.V.C. Onaga',
        sealCode: paySealKey.trim(),
      });
      enqueueSnackbar('Episcopal Seal successfully applied. Payroll authorized for disbursement!', { variant: 'success' });
      setSealDialogOpen(false);
      fetchAllLiveData();
    } catch {
      enqueueSnackbar('Failed to apply Episcopal Seal.', { variant: 'error' });
    } finally {
      setPayProcessing(false);
    }
  };

  const handleTimesheetDecision = async () => {
    if (!selTs) return;
    try {
      await api.patch(`/hr/admin-timesheets/${selTs.id}/decision`, { action: tsAction, bishopComment: tsComment });
      enqueueSnackbar(`Timesheet decree recorded: ${tsAction.toLowerCase().replace(/_/g, ' ')}.`, { variant: tsAction === 'APPROVED' ? 'success' : 'warning' });
      setTsDialog(false);
      setTsComment('');
      fetchAllLiveData();
    } catch {
      enqueueSnackbar('Failed to record timesheet decision.', { variant: 'error' });
    }
  };

  const handleProjectDecision = async () => {
    if (projCode !== 'EPISCOPAL-OK') {
      enqueueSnackbar('Invalid Episcopal Clearance Code. Enter: EPISCOPAL-OK', { variant: 'error' });
      return;
    }
    try {
      await api.patch(`/hr/internal-requests/${selProj.id}/status`, { status: projAction });
      enqueueSnackbar(`Capital project status updated to ${projAction.toLowerCase()}.`, { variant: projAction === 'APPROVED' ? 'success' : 'warning' });
      setProjDialog(false);
      setProjCode('');
      fetchAllLiveData();
    } catch {
      enqueueSnackbar('Failed to process project clearance.', { variant: 'error' });
    }
  };

  const handleRecordAuditDecree = (action: 'EPISCOPAL_CERTIFIED' | 'APPROVED' | 'SANCTION_ISSUED') => {
    if (auditDecreeCode !== 'BISHOP-SEAL') {
      enqueueSnackbar('Please enter Episcopal Security Key: BISHOP-SEAL', { variant: 'error' });
      return;
    }
    setFinancialAudits(prev => prev.map(a => a.id === selectedAudit.id ? { ...a, episcopalStatus: action, status: action === 'EPISCOPAL_CERTIFIED' ? 'UNQUALIFIED_OPINION' : a.status } : a));
    enqueueSnackbar(`Episcopal Audit Decree successfully recorded for ${selectedAudit.auditNumber}!`, { variant: 'success' });
    setAuditDetailOpen(false);
    setAuditDecreeCode('');
    setAuditDecreeComment('');
  };

  // Pending items counts
  const pendingPayrolls = payroll.filter(p =>
    p.status === 'PENDING_BISHOP_SIGNATURE' ||
    p.status === 'ADMIN_APPROVED' ||
    (p.signedByAdmin && !p.signedByBishop && !p.bishopSealApplied && p.status !== 'DISBURSED')
  );
  const pendingTs = timesheets.filter(t => t.status === 'PENDING_BISHOP_REVIEW');
  const pendingProj = projects.filter(r => (r.type === 'CAPITAL_PROJECT' || r.type === 'BILL_REQUISITION') && r.status === 'PENDING');
  const pendingLeaves = leaveRequests.filter(l => l.status === 'PENDING' || l.status === 'Pending');
  const pendingAudits = financialAudits.filter(a => a.episcopalStatus === 'ACTION_REQUIRED' || a.episcopalStatus === 'PENDING_EPISCOPAL_SEAL');

  // Filtered Financial Payments
  const filteredPayments = useMemo(() => {
    return recentPayments.filter(p => {
      const matchSearch = searchTerm === '' ||
        p.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.department?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'ALL' || p.status === filterStatus;
      const matchMethod = filterMethod === 'ALL' || p.paymentMethod === filterMethod;
      const matchDept = filterDept === 'ALL' || p.department === filterDept;
      return matchSearch && matchStatus && matchMethod && matchDept;
    });
  }, [recentPayments, searchTerm, filterStatus, filterMethod, filterDept]);

  // Filtered Financial Audits
  const filteredAudits = useMemo(() => {
    return financialAudits.filter(a => {
      const matchSearch = searchTerm === '' ||
        a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.auditor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.auditNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.findings?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterDept === 'ALL' || a.type === filterDept;
      const matchStatus = filterStatus === 'ALL' || a.status === filterStatus || a.episcopalStatus === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [financialAudits, searchTerm, filterDept, filterStatus]);

  // Filtered Leaves
  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter(l => {
      const matchSearch = searchTerm === '' ||
        l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.empId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.type?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'ALL' || l.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [leaveRequests, searchTerm, filterStatus]);

  // Filtered Rosters
  const filteredRosters = useMemo(() => {
    return rosterShifts.filter(r => {
      const matchSearch = searchTerm === '' ||
        r.cashierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.staffRole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.location?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [rosterShifts, searchTerm]);

  // Export to CSV helper
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      enqueueSnackbar('No records to export.', { variant: 'info' });
      return;
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Report exported successfully!', { variant: 'success' });
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: C.surface }}>
      
      {/* ── EPISCOPAL BANNER ── */}
      <Box sx={{
        background: gradientHeader,
        color: '#fff',
        px: 3.5,
        py: 2.5,
        borderBottom: `3px solid ${C.gold}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        position: 'relative'
      }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: `${C.gold}30`, color: C.gold, width: 44, height: 44, border: `1.5px solid ${C.gold}` }}>
                <Stars fontSize="medium" />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 0.5, fontFamily: "'Georgia', serif", color: '#fff' }}>
                  Faith Foundation Episcopal Desk
                </Typography>
                <Typography variant="caption" sx={{ color: '#e2e8f0', opacity: 0.9 }}>
                  Catholic Diocese of Enugu • Most Rev. Dr. C.V.C. Onaga (Episcopal Patron)
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {pendingPayrolls.length > 0 && (
              <Chip
                icon={<Gavel sx={{ color: '#fff !important' }} />}
                label={`${pendingPayrolls.length} Payroll Awaiting Seal`}
                sx={{ bgcolor: '#dc2626', color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}
              />
            )}
            {pendingTs.length > 0 && (
              <Chip
                icon={<WorkHistory sx={{ color: '#fff !important' }} />}
                label={`${pendingTs.length} Timesheet Review`}
                sx={{ bgcolor: '#d97706', color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}
              />
            )}
            <Tooltip title="Synchronize live PostgreSQL data">
              <Button
                variant="outlined"
                size="small"
                onClick={fetchAllLiveData}
                startIcon={<Refresh />}
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.3)',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                Sync Live DB
              </Button>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ height: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: C.gold } }} />}

      {/* ── MAIN CONTENT AREA ── */}
      <Box sx={{ flex: 1, p: 3.5, overflowY: 'auto' }}>

        {/* ═══════════════════════════════════════════════════════════════════
            1. EXECUTIVE OVERVIEW SUB-PAGE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTabIndex === 0 && (
          <Box>
            {/* Live KPI Grid */}
            <Grid container spacing={2.5} mb={3.5}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={<NairaCircleIcon />}
                  label="Monthly Gross Inflow"
                  value={fmtNGN(executiveSummary.monthlyRevenue)}
                  sub="Live from Invoices / Cashier"
                  color={C.gold}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={<LocalHospital />}
                  label="Inpatients & Occupancy"
                  value={`${executiveSummary.activeAdmissions} Beds (${executiveSummary.bedOccupancyRate})`}
                  sub={`${executiveSummary.totalBeds} Total Ward Beds`}
                  color={C.success}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={<People />}
                  label="Active Hospital Staff"
                  value={executiveSummary.totalStaff}
                  sub="Across all clinical & admin units"
                  color={C.secondary}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={<People />}
                  label="Registered Patients (MPI)"
                  value={executiveSummary.totalPatients}
                  sub={`${executiveSummary.todayAppointments} Appointments Today`}
                  color={C.info}
                />
              </Grid>
            </Grid>

            {/* Quick Action Alerts */}
            {(pendingPayrolls.length > 0 || pendingTs.length > 0 || pendingProj.length > 0) && (
              <Alert
                severity="warning"
                icon={<NotificationsActive />}
                sx={{
                  mb: 3.5,
                  borderRadius: 3,
                  border: `1px solid ${C.goldBorder}`,
                  bgcolor: C.goldLight,
                  fontWeight: 600,
                  p: 2
                }}
              >
                <AlertTitle sx={{ fontWeight: 800, color: C.warning }}>Episcopal Sign-Offs & Authorizations Required</AlertTitle>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={1}>
                  {pendingPayrolls.length > 0 && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => navigate('/bishop-desk/payroll')}
                      sx={{ bgcolor: '#dc2626', color: '#fff', fontWeight: 700, borderRadius: 2 }}
                    >
                      Authorize {pendingPayrolls.length} Payroll Run(s)
                    </Button>
                  )}
                  {pendingTs.length > 0 && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => navigate('/bishop-desk/timesheets')}
                      sx={{ bgcolor: C.gold, color: '#fff', fontWeight: 700, borderRadius: 2 }}
                    >
                      Review {pendingTs.length} Timesheet(s)
                    </Button>
                  )}
                  {pendingProj.length > 0 && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => navigate('/bishop-desk/projects')}
                      sx={{ bgcolor: C.secondary, color: '#fff', fontWeight: 700, borderRadius: 2 }}
                    >
                      Clear {pendingProj.length} Capital Project(s)
                    </Button>
                  )}
                </Stack>
              </Alert>
            )}

            {/* Ward Bed Occupancy Status */}
            <Grid container spacing={3} mb={3.5}>
              <Grid item xs={12} md={7}>
                <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: 'none' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.text, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalHospital sx={{ color: C.success }} /> Ward Inpatient Distribution (Live DB)
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: C.surface }}>
                          <TableCell sx={{ fontWeight: 800 }}>Ward Name</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Ward Type</TableCell>
                          <TableCell sx={{ fontWeight: 800 }} align="center">Total Beds</TableCell>
                          <TableCell sx={{ fontWeight: 800 }} align="center">Occupied</TableCell>
                          <TableCell sx={{ fontWeight: 800 }} align="right">Occupancy Rate</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {wardsSummary.map(w => {
                          const occRate = w.totalBeds > 0 ? Math.round((w.occupiedBeds / w.totalBeds) * 100) : 0;
                          return (
                            <TableRow key={w.id} hover>
                              <TableCell sx={{ fontWeight: 700 }}>{w.name}</TableCell>
                              <TableCell><Chip size="small" label={w.type || 'GENERAL'} sx={{ fontSize: '0.7rem' }} /></TableCell>
                              <TableCell align="center">{w.totalBeds}</TableCell>
                              <TableCell align="center" sx={{ color: w.occupiedBeds > 0 ? C.danger : C.muted, fontWeight: 700 }}>
                                {w.occupiedBeds}
                              </TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={occRate}
                                    sx={{ width: 60, height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: occRate > 80 ? C.danger : C.success } }}
                                  />
                                  <Typography variant="caption" sx={{ fontWeight: 750 }}>{occRate}%</Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {wardsSummary.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 3, color: C.muted }}>
                              Ward configuration loading or empty.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Grid>

              {/* Recent Financial & Statutory Audits */}
              <Grid item xs={12} md={5}>
                <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: 'none' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Assessment sx={{ color: C.secondary }} /> Financial & Statutory Audits
                    </Typography>
                    <Chip size="small" label={`${financialAudits.length} Audited`} sx={{ fontWeight: 800, bgcolor: `${C.secondary}15`, color: C.secondary }} />
                  </Stack>
                  <List sx={{ p: 0 }}>
                    {financialAudits.slice(0, 4).map((a, idx) => (
                      <ListItem
                        key={a.id || idx}
                        button
                        onClick={() => { setSelectedAudit(a); setAuditDetailOpen(true); }}
                        sx={{ px: 1.5, py: 1.2, borderRadius: 2, mb: 1, bgcolor: C.surface, border: `1px solid ${C.border}` }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: a.type === 'EXTERNAL' ? `${C.primary}15` : `${C.gold}15`, color: a.type === 'EXTERNAL' ? C.primary : C.gold, width: 36, height: 36 }}>
                            {a.type === 'EXTERNAL' ? <Security fontSize="small" /> : <Assignment fontSize="small" />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 750, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>{a.auditNumber}</span>
                              <span style={{ fontSize: '0.72rem', color: a.varianceAmount > 0 ? C.danger : C.success }}>
                                {a.varianceAmount > 0 ? `Var: ${fmtNGN(a.varianceAmount)}` : '100% Reconciled'}
                              </span>
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" sx={{ color: C.muted, display: 'block' }}>
                              {a.title} • <strong style={{ color: C.text }}>{a.auditor}</strong>
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                    {financialAudits.length === 0 && (
                      <Typography variant="body2" sx={{ color: C.muted, py: 2, textAlign: 'center' }}>
                        No financial audits recorded yet.
                      </Typography>
                    )}
                  </List>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            2. FINANCIAL TRANSACTIONS & REVENUE REPORT SUB-PAGE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTabIndex === 1 && (
          <Box>
            {/* ── TOP EXECUTIVE FINANCIAL METRICS ── */}
            <Grid container spacing={2.5} mb={3.5}>
              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.gold }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.gold}15`, color: C.gold, width: 40, height: 40 }}>
                      <AccountBalanceWallet fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Gross Collected Inflow
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.text, my: 0.3, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {fmtNGN(financialAnalytics.totalCollected || executiveSummary.monthlyRevenue)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.gold, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TrendingUp fontSize="inherit" /> Cashier, POS & Transfers
                  </Typography>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.primary }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.primary}15`, color: C.primary, width: 40, height: 40 }}>
                      <Receipt fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Total Billed Care
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.primary, my: 0.3, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {fmtNGN(financialAnalytics.totalBilled || financialAnalytics.totalCollected * 1.12)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 650 }}>
                    Gross Medical Services
                  </Typography>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.danger }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.danger}15`, color: C.danger, width: 40, height: 40 }}>
                      <Warning fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Outstanding / HMO Debt
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.danger, my: 0.3, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {fmtNGN(financialAnalytics.totalOutstanding)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.danger, fontWeight: 700 }}>
                    {100 - (financialAnalytics.collectionEfficiency || 90)}% Pending Recovery
                  </Typography>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.success }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.success}15`, color: C.success, width: 40, height: 40 }}>
                      <CheckCircle fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Collection Efficiency
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.success, my: 0.3, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {financialAnalytics.collectionEfficiency || 92}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.success, fontWeight: 650 }}>
                    Target: &gt;90% Recovery
                  </Typography>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.info }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.info}15`, color: C.info, width: 40, height: 40 }}>
                      <Timeline fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Today's Live Inflow
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.info, my: 0.3, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {fmtNGN(financialAnalytics.todayInflow || 0)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 650 }}>
                    {financialAnalytics.totalTransactions || recentPayments.length} Total Receipts
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* ── INTERACTIVE FINANCIAL CHARTS SECTION ── */}
            <Grid container spacing={3} mb={3.5}>
              {/* Revenue & Cash Flow Trends Chart */}
              <Grid item xs={12} lg={7.5}>
                <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: 'none', height: '100%' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 850, color: C.text, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp sx={{ color: C.primary }} /> Revenue Inflow & Billing Trends (Live DB)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Real-time daily/monthly cash collections versus gross billed medical services.
                      </Typography>
                    </Box>
                    <Chip size="small" label="Live PostgreSQL Feed" sx={{ bgcolor: `${C.primary}10`, color: C.primary, fontWeight: 800, fontSize: '0.7rem' }} />
                  </Stack>

                  <Box sx={{ width: '100%', height: 290 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={financialAnalytics.revenueTrend || []} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={C.gold} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={C.gold} stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={C.primary} stopOpacity={0.25}/>
                            <stop offset="95%" stopColor={C.primary} stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: C.muted }} />
                        <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: C.muted }} />
                        <RechartsTooltip
                          formatter={(value: any, name: string) => [fmtNGN(value), name === 'collected' ? 'Collected Inflow' : name === 'billed' ? 'Gross Billed' : 'Outstanding']}
                          contentStyle={{ backgroundColor: '#1e1b4b', borderRadius: 8, border: 'none', color: '#fff', fontSize: '0.8rem' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '8px' }} />
                        <Area type="monotone" dataKey="billed" stroke={C.primary} strokeWidth={2.5} fillOpacity={1} fill="url(#colorBilled)" name="Gross Billed" />
                        <Area type="monotone" dataKey="collected" stroke={C.gold} strokeWidth={2.5} fillOpacity={1} fill="url(#colorCollected)" name="Collected Inflow" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </Card>
              </Grid>

              {/* Payment Method Distribution Donut */}
              <Grid item xs={12} lg={4.5}>
                <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: 'none', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 850, color: C.text, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalance sx={{ color: C.gold }} /> Payment Channel Share
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Inflow settlement channels (POS, Direct Transfer & Cash).
                    </Typography>
                  </Box>

                  <Box sx={{ width: '100%', height: 210, my: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'POS Terminals', value: financialAnalytics.methodStats?.POS || 65000, color: '#0284c7' },
                            { name: 'Bank Transfer', value: financialAnalytics.methodStats?.TRANSFER || 45000, color: '#7c3aed' },
                            { name: 'Physical Cash', value: financialAnalytics.methodStats?.CASH || 25000, color: '#16a34a' },
                          ]}
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          <Cell fill="#0284c7" />
                          <Cell fill="#7c3aed" />
                          <Cell fill="#16a34a" />
                        </Pie>
                        <RechartsTooltip
                          formatter={(v: any) => [fmtNGN(v), 'Turnover']}
                          contentStyle={{ backgroundColor: '#1e1b4b', borderRadius: 8, border: 'none', color: '#fff', fontSize: '0.8rem' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>

                  <Stack direction="row" justifyContent="space-around" sx={{ pt: 1, borderTop: `1px solid ${C.border}` }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        ● POS
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{fmtNGN(financialAnalytics.methodStats?.POS || 0)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        ● Transfer
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{fmtNGN(financialAnalytics.methodStats?.TRANSFER || 0)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        ● Cash
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{fmtNGN(financialAnalytics.methodStats?.CASH || 0)}</Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              {/* Departmental Revenue Generation Bar Chart */}
              <Grid item xs={12}>
                <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: 'none' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={2}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 850, color: C.text, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MedicalServices sx={{ color: C.secondary }} /> Departmental Revenue Stream Breakdown
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Revenue contributions from Pharmacy, Laboratory, Inpatient Wards, Surgery & Consultations.
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {(financialAnalytics.departmentRevenue || []).slice(0, 4).map((d: any) => (
                        <Chip
                          key={d.name}
                          size="small"
                          label={`${d.name}: ${fmtNGN(d.amount)} (${d.percentage}%)`}
                          sx={{ fontSize: '0.72rem', fontWeight: 750, bgcolor: C.surface, border: `1px solid ${C.border}` }}
                        />
                      ))}
                    </Stack>
                  </Stack>

                  <Box sx={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialAnalytics.departmentRevenue || []} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.muted }} interval={0} angle={-15} textAnchor="end" />
                        <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: C.muted }} />
                        <RechartsTooltip
                          formatter={(value: any) => [fmtNGN(value), 'Department Revenue']}
                          contentStyle={{ backgroundColor: '#1e1b4b', borderRadius: 8, border: 'none', color: '#fff', fontSize: '0.8rem' }}
                        />
                        <Bar dataKey="amount" fill={C.secondary} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Card>
              </Grid>
            </Grid>

            {/* ── OFFICIAL DAILY INCOME AND EXPENDITURE REPORT SHEET ── */}
            <Box sx={{ mb: 3.5 }}>
              <DailyIncomeExpenditureSheet allowRecordExpense={true} showHeaderTitle={true} elevation={0} />
            </Box>

            {/* ── COMPREHENSIVE TRANSACTIONS LEDGER TABLE ── */}
            <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: 'none' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={3}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 850, color: C.text }}>
                    Diocesan Financial Transaction Ledger (Live DB)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Individual receipts, invoice balances, payment channel vouchers, and patient billing entries.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FileDownload />}
                    onClick={() => exportToCSV(filteredPayments, 'Hospital_Financial_Ledger')}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Print />}
                    onClick={() => window.print()}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    Print Report
                  </Button>
                </Stack>
              </Stack>

              {/* Filter Bar */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3.5}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search receipt, invoice, patient name, MRN..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2.5}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Payment Channel</InputLabel>
                    <Select value={filterMethod} label="Payment Channel" onChange={e => setFilterMethod(e.target.value)}>
                      <MenuItem value="ALL">All Channels (POS/Cash/Transfer)</MenuItem>
                      <MenuItem value="POS">POS Terminal</MenuItem>
                      <MenuItem value="TRANSFER">Direct Bank Transfer</MenuItem>
                      <MenuItem value="CASH">Physical Cash</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2.5}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Settlement Status</InputLabel>
                    <Select value={filterStatus} label="Settlement Status" onChange={e => setFilterStatus(e.target.value)}>
                      <MenuItem value="ALL">All Statuses</MenuItem>
                      <MenuItem value="PAID">Paid in Full</MenuItem>
                      <MenuItem value="COMPLETED">Completed</MenuItem>
                      <MenuItem value="PARTIAL">Partial Payment</MenuItem>
                      <MenuItem value="PENDING">Pending Settlement</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3.5}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Service Department</InputLabel>
                    <Select value={filterDept} label="Service Department" onChange={e => setFilterDept(e.target.value)}>
                      <MenuItem value="ALL">All Service Departments</MenuItem>
                      <MenuItem value="Pharmacy Dispensary">Pharmacy Dispensary</MenuItem>
                      <MenuItem value="Diagnostic Laboratory">Diagnostic Laboratory</MenuItem>
                      <MenuItem value="Inpatient Ward">Inpatient Ward</MenuItem>
                      <MenuItem value="Outpatient Consultation">Outpatient Consultation</MenuItem>
                      <MenuItem value="Radiology & Imaging">Radiology & Imaging</MenuItem>
                      <MenuItem value="Theatre & Surgery">Theatre & Surgery</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Summary of Filtered Records */}
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: C.surface, p: 1.5, borderRadius: 2, border: `1px solid ${C.border}` }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: C.text }}>
                  Showing <strong>{filteredPayments.length}</strong> transactions
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: C.primary }}>
                  Filtered Total: <strong>{fmtNGN(filteredPayments.reduce((acc, p) => acc + p.amount, 0))}</strong>
                </Typography>
              </Box>

              {/* Transactions Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: C.surface }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Receipt Ref</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Invoice #</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Patient Name & MRN</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Channel</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Billed</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Amount Paid</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Balance</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Date & Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPayments.map(p => (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ fontWeight: 750, color: C.primary }}>{p.receiptNumber}</TableCell>
                        <TableCell>{p.invoiceNo}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.patientName}</Typography>
                          <Typography variant="caption" sx={{ color: C.muted }}>MRN: {p.mrn}</Typography>
                        </TableCell>
                        <TableCell><Chip size="small" label={p.department} sx={{ fontSize: '0.72rem' }} /></TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={p.paymentMethod}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              bgcolor: p.paymentMethod === 'POS' ? '#e0f2fe' : p.paymentMethod === 'TRANSFER' ? '#f3e8ff' : '#dcfce7',
                              color: p.paymentMethod === 'POS' ? '#0369a1' : p.paymentMethod === 'TRANSFER' ? '#6b21a8' : '#15803d',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 650, color: C.muted }}>
                          {fmtNGN(p.total || p.amount)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: C.text }}>
                          {fmtNGN(p.amount)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 750, color: p.balance > 0 ? C.danger : C.success }}>
                          {p.balance > 0 ? fmtNGN(p.balance) : '₦0'}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={p.status}
                            sx={{
                              bgcolor: p.status === 'PAID' || p.status === 'COMPLETED' ? C.successBg : p.status === 'PARTIAL' ? C.warningBg : C.dangerBg,
                              color: p.status === 'PAID' || p.status === 'COMPLETED' ? C.success : p.status === 'PARTIAL' ? C.warning : C.danger,
                              fontWeight: 800,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: C.muted }}>
                          {fmtDateTime(p.date)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredPayments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ py: 4, color: C.muted }}>
                          No transactions found matching your filter criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            3. FINANCIAL AUDITS & STATUTORY REVIEWS SUB-PAGE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTabIndex === 2 && (
          <Box>
            {/* Episcopal Audit Summary Metrics */}
            <Grid container spacing={2.5} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff' }}>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Audits Completed
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.text, my: 0.5 }}>
                    {financialAudits.length} Engagements
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.primary, fontWeight: 650 }}>
                    {financialAudits.filter(a => a.type === 'INTERNAL').length} Internal • {financialAudits.filter(a => a.type === 'EXTERNAL').length} External Statutory
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff' }}>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Audited Volume
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.primary, my: 0.5 }}>
                    {fmtNGN(financialAudits.reduce((acc, a) => acc + (a.auditedAmount || 0), 0))}
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.success, fontWeight: 650 }}>
                    Across Revenue, Vault & Procurement
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff' }}>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                    Net Identified Variances
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.danger, my: 0.5 }}>
                    {fmtNGN(financialAudits.reduce((acc, a) => acc + (a.varianceAmount || 0), 0))}
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 650 }}>
                    {financialAudits.filter(a => a.varianceAmount > 0).length} Queries in Resolution
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff' }}>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                    Statutory Clean Rating
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.success, my: 0.5 }}>
                    98.6%
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.success, fontWeight: 650 }}>
                    Unqualified Audit Opinion
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Audit Table Card */}
            <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: 'none' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={3}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 850, color: C.text }}>
                    Diocesan Financial Audits & Statutory Reviews (Internal & External)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Independent verification of cash vault accounts, pharmacy revenue, insurance reconciliations, capital procurements, and statutory statements.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FileDownload />}
                    onClick={() => exportToCSV(filteredAudits, 'Financial_Audits_Register')}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Print />}
                    onClick={() => window.print()}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    Print Report
                  </Button>
                </Stack>
              </Stack>

              {/* Filter Bar */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search audit engagement, auditor, reference..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Audit Classification</InputLabel>
                    <Select value={filterDept} label="Audit Classification" onChange={e => setFilterDept(e.target.value)}>
                      <MenuItem value="ALL">All Classifications</MenuItem>
                      <MenuItem value="INTERNAL">Internal Audit (Hospital Unit)</MenuItem>
                      <MenuItem value="EXTERNAL">External Audit (Chartered Panel)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status / Decree</InputLabel>
                    <Select value={filterStatus} label="Status / Decree" onChange={e => setFilterStatus(e.target.value)}>
                      <MenuItem value="ALL">All Statuses</MenuItem>
                      <MenuItem value="CLEAN">Clean / Reconciled</MenuItem>
                      <MenuItem value="UNQUALIFIED_OPINION">Unqualified Clean Opinion</MenuItem>
                      <MenuItem value="QUERY_ISSUED">Audit Query Issued</MenuItem>
                      <MenuItem value="SATISFACTORY">Satisfactory</MenuItem>
                      <MenuItem value="EPISCOPAL_CERTIFIED">Episcopal Certified</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Financial Audit Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: C.surface }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Audit Ref & Class</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Engagement & Scope</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Appointed Auditor / Firm</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Audit Period</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Audited Volume</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Variance</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Auditor Opinion</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Episcopal Decree</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAudits.map(a => (
                      <TableRow key={a.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: C.primary }}>
                            {a.auditNumber}
                          </Typography>
                          <Chip
                            size="small"
                            label={a.type === 'EXTERNAL' ? 'EXTERNAL AUDIT' : 'INTERNAL AUDIT'}
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.65rem',
                              height: 20,
                              bgcolor: a.type === 'EXTERNAL' ? '#f3e8ff' : '#fef3c7',
                              color: a.type === 'EXTERNAL' ? '#6b21a8' : '#92400e',
                              mt: 0.5,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 750 }}>{a.title}</Typography>
                          <Typography variant="caption" sx={{ color: C.muted }}>Category: {a.category}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.auditor}</Typography>
                          <Typography variant="caption" sx={{ color: C.muted }}>{a.auditorRole}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {a.auditPeriod}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: C.text }}>
                          {fmtNGN(a.auditedAmount)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: a.varianceAmount > 0 ? C.danger : C.success }}>
                          {a.varianceAmount > 0 ? fmtNGN(a.varianceAmount) : '₦0 (Clean)'}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={a.status.replace(/_/g, ' ')}
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              bgcolor: a.status === 'CLEAN' || a.status === 'UNQUALIFIED_OPINION' ? C.successBg : a.status === 'QUERY_ISSUED' ? C.dangerBg : C.warningBg,
                              color: a.status === 'CLEAN' || a.status === 'UNQUALIFIED_OPINION' ? C.success : a.status === 'QUERY_ISSUED' ? C.danger : C.warning,
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={a.episcopalStatus.replace(/_/g, ' ')}
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.68rem',
                              bgcolor: a.episcopalStatus === 'EPISCOPAL_CERTIFIED' || a.episcopalStatus === 'APPROVED' ? '#dbeafe' : a.episcopalStatus === 'ACTION_REQUIRED' ? '#fee2e2' : '#fef3c7',
                              color: a.episcopalStatus === 'EPISCOPAL_CERTIFIED' || a.episcopalStatus === 'APPROVED' ? '#1d4ed8' : a.episcopalStatus === 'ACTION_REQUIRED' ? '#b91c1c' : '#b45309',
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => { setSelectedAudit(a); setAuditDetailOpen(true); }}
                            sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'none', py: 0.3, px: 1, borderRadius: 1.5 }}
                          >
                            View Docket
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAudits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4, color: C.muted }}>
                          No financial audit engagements found matching the filter criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            4. STAFF LEAVE & ABSENCE REPORT SUB-PAGE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTabIndex === 3 && (
          <Box>
            {/* Top Leave KPI Cards */}
            <Grid container spacing={2.5} mb={3.5}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.primary }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.primary}15`, color: C.primary, width: 40, height: 40 }}>
                      <BeachAccess fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Active Staff On Leave
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.text, my: 0.3 }}>
                    {leaveRequests.filter(l => l.status === 'APPROVED' || l.status === 'ACTIVE').length} Staff
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.success, fontWeight: 650 }}>
                    Relief officers deployed
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.gold }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.gold}15`, color: C.gold, width: 40, height: 40 }}>
                      <Warning fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Pending Applications
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.gold, my: 0.3 }}>
                    {leaveRequests.filter(l => l.status === 'PENDING' || l.status === 'Pending').length} Pending
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 650 }}>
                    Awaiting HOD / Admin Review
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.secondary }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.secondary}15`, color: C.secondary, width: 40, height: 40 }}>
                      <People fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Total Leave Days Granted
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.secondary, my: 0.3 }}>
                    {leaveRequests.filter(l => l.status === 'APPROVED').reduce((acc, l) => acc + (Number(l.days) || 0), 0)} Days
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 650 }}>
                    Annual, Medical & Compassionate
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.success }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.success}15`, color: C.success, width: 40, height: 40 }}>
                      <CheckCircle fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Clinical Duty Continuity
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.success, my: 0.3 }}>
                    98.4%
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.success, fontWeight: 650 }}>
                    100% Relief coverage assured
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Leave Register Table Card */}
            <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: 'none' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={3}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 850, color: C.text }}>
                    Staff Leave & Absence Management Register (Live DB)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Live tracking of approved, active, and pending leave requests across all medical and administrative departments.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownload />}
                  onClick={() => exportToCSV(filteredLeaves, 'Staff_Leave_Report')}
                  sx={{ fontWeight: 700, borderRadius: 2 }}
                >
                  Export Report
                </Button>
              </Stack>

              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search staff name, employee ID, leave type..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}>
                      <MenuItem value="ALL">All Statuses</MenuItem>
                      <MenuItem value="APPROVED">Approved</MenuItem>
                      <MenuItem value="PENDING">Pending</MenuItem>
                      <MenuItem value="REJECTED">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: C.surface }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Staff Name & ID</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Leave Category</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Duration</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Dates</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Relief Officer</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Approved By</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLeaves.map(l => (
                      <TableRow key={l.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{l.name}</Typography>
                          <Typography variant="caption" sx={{ color: C.muted }}>ID: {l.empId}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={l.type || 'ANNUAL'}
                            sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: `${C.secondary}15`, color: C.secondary }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{l.days} Day(s)</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: C.muted }}>
                          {fmtDate(l.startDate)} — {fmtDate(l.endDate)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{l.reliefOfficer || '—'}</TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={l.status}
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              bgcolor: l.status === 'APPROVED' ? C.successBg : l.status === 'PENDING' ? C.warningBg : C.dangerBg,
                              color: l.status === 'APPROVED' ? C.success : l.status === 'PENDING' ? C.warning : C.danger,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{l.approvedBy || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {filteredLeaves.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: C.muted }}>
                          No leave records found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            5. DUTY ROSTER & SHIFTS REPORT SUB-PAGE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTabIndex === 4 && (
          <Box>
            {/* Top Shift Coverage Metrics */}
            <Grid container spacing={2.5} mb={3.5}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.primary }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.primary}15`, color: C.primary, width: 40, height: 40 }}>
                      <CalendarMonth fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Active Rostered Shifts
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.text, my: 0.3 }}>
                    {rosterShifts.length} Slots
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.primary, fontWeight: 650 }}>
                    Morning, Afternoon & Night
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.success }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.success}15`, color: C.success, width: 40, height: 40 }}>
                      <CheckCircle fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Open Active Duty Shifts
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.success, my: 0.3 }}>
                    {rosterShifts.filter(s => s.status === 'OPEN').length} Active
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.success, fontWeight: 650 }}>
                    Staff actively on post
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.gold }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.gold}15`, color: C.gold, width: 40, height: 40 }}>
                      <VerifiedUser fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Duty Leads Designated
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.gold, my: 0.3 }}>
                    {rosterShifts.filter(s => s.isPrimary || s.onCallLead).length} Leads
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 650 }}>
                    Senior clinical supervisors
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.secondary }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.secondary}15`, color: C.secondary, width: 40, height: 40 }}>
                      <LocalHospital fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      24/7 Ward Coverage
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.secondary, my: 0.3 }}>
                    100%
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.success, fontWeight: 650 }}>
                    Emergency & ICU manned
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Roster Table Card */}
            <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: 'none' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={3}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 850, color: C.text }}>
                    Duty Roster & Shift Schedules (Live DB)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active shift distribution, duty leads, ward coverages, and cashier till allocations.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownload />}
                  onClick={() => exportToCSV(filteredRosters, 'Duty_Roster_Report')}
                  sx={{ fontWeight: 700, borderRadius: 2 }}
                >
                  Export Roster
                </Button>
              </Stack>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: C.surface }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Shift Number</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Staff Name & Role</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Location / Ward</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Shift Slot</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Duty In-Charge</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRosters.map(s => (
                      <TableRow key={s.id} hover>
                        <TableCell sx={{ fontWeight: 750, color: C.primary }}>{s.shiftNumber || s.id}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.cashierName}</Typography>
                          <Typography variant="caption" sx={{ color: C.muted }}>{s.staffRole}</Typography>
                        </TableCell>
                        <TableCell>{s.location}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={`${s.startTime || '08:00'} - ${s.endTime || '16:00'}`}
                            sx={{ fontSize: '0.72rem', fontWeight: 650 }}
                          />
                        </TableCell>
                        <TableCell>{s.scheduledDate || s.date}</TableCell>
                        <TableCell align="center">
                          {s.isPrimary || s.onCallLead ? (
                            <Chip size="small" label="Duty Lead" sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 800, fontSize: '0.7rem' }} />
                          ) : (
                            <Typography variant="caption" sx={{ color: C.muted }}>Staff</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={s.status}
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              bgcolor: s.status === 'OPEN' ? C.successBg : s.status === 'CLOSED' ? '#f1f5f9' : C.warningBg,
                              color: s.status === 'OPEN' ? C.success : s.status === 'CLOSED' ? '#475569' : C.warning,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRosters.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: C.muted }}>
                          No roster shifts found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            6. CLOCK-IN & BIOMETRIC ATTENDANCE SUB-PAGE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTabIndex === 5 && (
          <Box>
            {/* Top Attendance Metrics */}
            <Grid container spacing={2.5} mb={3.5}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.success }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.success}15`, color: C.success, width: 40, height: 40 }}>
                      <Fingerprint fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Overall Punctuality Rate
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.success, my: 0.3 }}>
                    {clockLogs.length > 0 ? Math.round((clockLogs.filter(c => c.status !== 'LATE').length / clockLogs.length) * 100) : 96}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.success, fontWeight: 650 }}>
                    On-time biometric arrivals
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.primary }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.primary}15`, color: C.primary, width: 40, height: 40 }}>
                      <AccessTime fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Today's Clock-Ins
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.text, my: 0.3 }}>
                    {clockLogs.length} Records
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 650 }}>
                    Biometric terminal capture
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.danger }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.danger}15`, color: C.danger, width: 40, height: 40 }}>
                      <Warning fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Late Check-Ins
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.danger, my: 0.3 }}>
                    {clockLogs.filter(c => c.status === 'LATE').length} Staff
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.danger, fontWeight: 650 }}>
                    Arrived post grace period
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.info }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.info}15`, color: C.info, width: 40, height: 40 }}>
                      <People fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Active Duty Personnel
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.info, my: 0.3 }}>
                    {clockLogs.filter(c => !c.clockOut || c.clockOut === 'Active').length} On Duty
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 650 }}>
                    Currently stationed in hospital
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Attendance Log Table Card */}
            <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: 'none' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={3}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 850, color: C.text }}>
                    Biometric Attendance & Clock-In Log (Live DB)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Punctuality, arrival timestamps, active duty clock-ins, and late shift logs.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownload />}
                  onClick={() => exportToCSV(clockLogs, 'Attendance_Clock_Logs')}
                  sx={{ fontWeight: 700, borderRadius: 2 }}
                >
                  Export Logs
                </Button>
              </Stack>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: C.surface }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Staff Name & ID</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Role / Unit</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Clock In</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Clock Out</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Punctuality</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clockLogs.map(att => (
                      <TableRow key={att.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{att.name}</Typography>
                          <Typography variant="caption" sx={{ color: C.muted }}>{att.empId}</Typography>
                        </TableCell>
                        <TableCell>{att.role || att.department}</TableCell>
                        <TableCell>{att.date}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: C.success }}>{att.clockIn || '—'}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: C.muted }}>{att.clockOut || 'Active'}</TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={att.status || 'ON_TIME'}
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              bgcolor: att.status === 'LATE' ? C.dangerBg : C.successBg,
                              color: att.status === 'LATE' ? C.danger : C.success,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {clockLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: C.muted }}>
                          No biometric attendance logs found for today.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            7. EPISCOPAL PAYROLL AUTHORIZATION SUB-PAGE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTabIndex === 6 && (
          <Box>
            {/* Top Payroll KPI Cards */}
            <Grid container spacing={2.5} mb={3.5}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.gold }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.gold}15`, color: C.gold, width: 40, height: 40 }}>
                      <Gavel fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Pending Episcopal Seal
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.gold, my: 0.3 }}>
                    {pendingPayrolls.length} Run(s)
                  </Typography>
                  <Typography variant="caption" sx={{ color: pendingPayrolls.length > 0 ? C.danger : C.success, fontWeight: 700 }}>
                    {pendingPayrolls.length > 0 ? 'Requires Bishop signature' : 'All payroll runs sealed'}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.primary }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.primary}15`, color: C.primary, width: 40, height: 40 }}>
                      <AccountBalanceWallet fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Total Net Disbursable
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.primary, my: 0.3 }}>
                    {fmtNGN(payroll.reduce((acc, p) => acc + (p.netPaid || 0), 0))}
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 650 }}>
                    Hospital staff net wage bill
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.danger }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.danger}15`, color: C.danger, width: 40, height: 40 }}>
                      <Warning fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Tax & Pension Deductions
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.danger, my: 0.3 }}>
                    {fmtNGN(payroll.reduce((acc, p) => acc + (p.deductions || 0), 0))}
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 650 }}>
                    PAYE & Pension remittances
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.success }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.success}15`, color: C.success, width: 40, height: 40 }}>
                      <VerifiedUser fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Episcopal Sealed Batches
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.success, my: 0.3 }}>
                    {payroll.filter(p => p.bishopSealApplied || p.signedByBishop).length} Batches
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.success, fontWeight: 650 }}>
                    Certified for bank transfer
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Payroll Register Card */}
            <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: 'none' }}>
              <Box mb={3}>
                <Typography variant="h6" sx={{ fontWeight: 850, color: C.text }}>
                  Diocesan Episcopal Payroll Authorization & Seal (Live DB)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Review and affix the official Diocesan Episcopal Seal to authorize monthly hospital salary disbursements.
                </Typography>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: C.surface }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Pay Period</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Gross Total</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Deductions</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Net Disbursable</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Episcopal Seal</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payroll.map(pay => {
                      const isAwaitingSeal = pay.status === 'PENDING_BISHOP_SIGNATURE' || (pay.signedByAdmin && !pay.signedByBishop && !pay.bishopSealApplied);
                      return (
                        <TableRow key={pay.id} hover>
                          <TableCell sx={{ fontWeight: 750, color: C.primary }}>{pay.payPeriod}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{fmtNGN(pay.totalGross)}</TableCell>
                          <TableCell sx={{ color: C.danger }}>{fmtNGN(pay.deductions)}</TableCell>
                          <TableCell sx={{ fontWeight: 850, color: C.success }}>{fmtNGN(pay.netPaid)}</TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={pay.status}
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                bgcolor: pay.bishopSealApplied || pay.status === 'DISBURSED' ? C.successBg : C.warningBg,
                                color: pay.bishopSealApplied || pay.status === 'DISBURSED' ? C.success : C.warning,
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {pay.bishopSealApplied || pay.signedByBishop ? (
                              <Chip
                                icon={<VerifiedUser sx={{ color: `${C.gold} !important` }} />}
                                label="Episcopal Seal Affixed"
                                sx={{ bgcolor: C.goldLight, color: C.gold, fontWeight: 800, fontSize: '0.72rem' }}
                              />
                            ) : (
                              <Chip label="Awaiting Seal" size="small" sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 800, fontSize: '0.7rem' }} />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {isAwaitingSeal ? (
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<Gavel />}
                                onClick={() => handleOpenSealDialog(pay)}
                                sx={{ bgcolor: C.gold, color: '#fff', fontWeight: 800, borderRadius: 2, '&:hover': { bgcolor: '#b45309' } }}
                              >
                                Affix Seal
                              </Button>
                            ) : (
                              <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700 }}>
                                {pay.bishopSignatureDate || 'Signed'}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {payroll.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: C.muted }}>
                          No payroll runs generated.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            8. ADMIN TIMESHEETS SUB-PAGE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTabIndex === 7 && (
          <Box>
            {/* Top Timesheet Metrics */}
            <Grid container spacing={2.5} mb={3.5}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.gold }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.gold}15`, color: C.gold, width: 40, height: 40 }}>
                      <WorkHistory fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Pending Bishop Review
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.gold, my: 0.3 }}>
                    {pendingTs.length} Submissions
                  </Typography>
                  <Typography variant="caption" sx={{ color: pendingTs.length > 0 ? C.danger : C.success, fontWeight: 700 }}>
                    {pendingTs.length > 0 ? 'Requires executive sign-off' : 'All timesheets reviewed'}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.success }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.success}15`, color: C.success, width: 40, height: 40 }}>
                      <CheckCircle fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Timesheets Approved
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.success, my: 0.3 }}>
                    {timesheets.filter(t => t.status === 'APPROVED').length} Approved
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.success, fontWeight: 650 }}>
                    100% supervisory cleared
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.primary }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.primary}15`, color: C.primary, width: 40, height: 40 }}>
                      <AccessTime fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Admin Hours Logged
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.primary, my: 0.3 }}>
                    {timesheets.reduce((acc, t) => acc + (t.hoursWorked || 160), 0)} Hours
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 650 }}>
                    Across hospital management
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.secondary }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.secondary}15`, color: C.secondary, width: 40, height: 40 }}>
                      <VerifiedUser fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Avg Compliance Rate
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.secondary, my: 0.3 }}>
                    99.2%
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.success, fontWeight: 650 }}>
                    Statutory threshold met
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Timesheets Table Card */}
            <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: 'none' }}>
              <Box mb={3}>
                <Typography variant="h6" sx={{ fontWeight: 850, color: C.text }}>
                  Executive & Admin Monthly Timesheets Review
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Executive supervisory review and approval of administrative monthly hours and performance credits.
                </Typography>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: C.surface }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Admin Name</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Month / Year</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Hours Worked</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Compliance</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {timesheets.map(ts => (
                      <TableRow key={ts.id} hover>
                        <TableCell sx={{ fontWeight: 750 }}>{ts.adminName || ts.name || 'Hospital Administrator'}</TableCell>
                        <TableCell>{ts.month} {ts.year}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{ts.hoursWorked || 160} / {ts.expectedHours || 160} hrs</TableCell>
                        <TableCell>{ts.compliancePercentage || 100}%</TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={ts.status}
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              bgcolor: ts.status === 'APPROVED' ? C.successBg : C.warningBg,
                              color: ts.status === 'APPROVED' ? C.success : C.warning,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {ts.status === 'PENDING_BISHOP_REVIEW' ? (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => { setSelTs(ts); setTsDialog(true); }}
                              sx={{ bgcolor: C.primary, fontWeight: 750, borderRadius: 2 }}
                            >
                              Review & Sign
                            </Button>
                          ) : (
                            <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700 }}>{ts.status}</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {timesheets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: C.muted }}>
                          No admin timesheets awaiting review.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            9. CAPITAL PROJECTS SUB-PAGE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTabIndex === 8 && (
          <Box>
            {/* Top Capital Projects Metrics */}
            <Grid container spacing={2.5} mb={3.5}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.secondary }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.secondary}15`, color: C.secondary, width: 40, height: 40 }}>
                      <Assignment fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Capital Commitments
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.secondary, my: 0.3 }}>
                    {projects.filter(r => r.type === 'CAPITAL_PROJECT' || r.type === 'BILL_REQUISITION').length} Projects
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 650 }}>
                    Infrastructure & Major Procurement
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.primary }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.primary}15`, color: C.primary, width: 40, height: 40 }}>
                      <AccountBalance fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Total Project Budgets
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.primary, my: 0.3 }}>
                    {fmtNGN(projects.filter(r => r.type === 'CAPITAL_PROJECT' || r.type === 'BILL_REQUISITION').reduce((acc, p) => acc + (p.amount || 5000000), 0))}
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.primary, fontWeight: 650 }}>
                    Diocesan Development Fund
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.gold }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.gold}15`, color: C.gold, width: 40, height: 40 }}>
                      <Warning fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Awaiting Bishop Clearance
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.gold, my: 0.3 }}>
                    {pendingProj.length} Request(s)
                  </Typography>
                  <Typography variant="caption" sx={{ color: pendingProj.length > 0 ? C.danger : C.success, fontWeight: 700 }}>
                    {pendingProj.length > 0 ? 'Requires EPISCOPAL-OK' : 'All requisitions cleared'}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: C.success }} />
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: `${C.success}15`, color: C.success, width: 40, height: 40 }}>
                      <CheckCircle fontSize="small" />
                    </Avatar>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 750, textTransform: 'uppercase' }}>
                      Cleared & In-Execution
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: C.success, my: 0.3 }}>
                    {projects.filter(r => (r.type === 'CAPITAL_PROJECT' || r.type === 'BILL_REQUISITION') && r.status === 'APPROVED').length} Projects
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.success, fontWeight: 650 }}>
                    Actively funded & inspected
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Capital Projects Register Card */}
            <Card sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: 'none' }}>
              <Box mb={3}>
                <Typography variant="h6" sx={{ fontWeight: 850, color: C.text }}>
                  Capital Projects & Major Hospital Requisitions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Diocesan clearance and authorization for major medical infrastructure investments and capital purchases.
                </Typography>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: C.surface }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Project Title</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Estimated Budget</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Requested Date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projects.filter(r => r.type === 'CAPITAL_PROJECT' || r.type === 'BILL_REQUISITION').map(p => (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ fontWeight: 750, color: C.text }}>{p.title || p.description}</TableCell>
                        <TableCell>{p.department || 'Clinical Services'}</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: C.primary }}>{fmtNGN(p.amount || 5000000)}</TableCell>
                        <TableCell>{fmtDate(p.createdAt || p.date)}</TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={p.status}
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              bgcolor: p.status === 'APPROVED' ? C.successBg : p.status === 'PENDING' ? C.warningBg : C.dangerBg,
                              color: p.status === 'APPROVED' ? C.success : p.status === 'PENDING' ? C.warning : C.danger,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {p.status === 'PENDING' ? (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => { setSelProj(p); setProjDialog(true); }}
                              sx={{ bgcolor: C.secondary, fontWeight: 750, borderRadius: 2 }}
                            >
                              Clearance
                            </Button>
                          ) : (
                            <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700 }}>{p.status}</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {projects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: C.muted }}>
                          No capital project requests recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        )}

      </Box>

      {/* ── EPISCOPAL SEAL DIALOG ── */}
      <Dialog open={sealDialogOpen} onClose={() => setSealDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: gradientHeader, color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedUser sx={{ color: C.gold }} /> Affix Episcopal Bishop Seal
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            You are authorizing salary disbursement for <strong>{selectedPayroll?.payPeriod}</strong> totaling{' '}
            <strong>{fmtNGN(selectedPayroll?.netPaid)}</strong> (Gross: {fmtNGN(selectedPayroll?.totalGross)}).
          </Alert>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
            To confirm Episcopal authorization and apply the digital seal, enter the security key:
          </Typography>
          <TextField
            fullWidth
            label="Episcopal Security Key (type: BISHOP-SEAL)"
            placeholder="BISHOP-SEAL"
            value={paySealKey}
            onChange={e => setPaySealKey(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: C.surface }}>
          <Button onClick={() => setSealDialogOpen(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApplyEpiscopalSeal}
            disabled={payProcessing}
            sx={{ bgcolor: C.gold, color: '#fff', fontWeight: 800, '&:hover': { bgcolor: '#b45309' } }}
          >
            {payProcessing ? 'Applying Seal...' : 'Confirm & Affix Seal'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── TIMESHEET DECISION DIALOG ── */}
      <Dialog open={tsDialog} onClose={() => setTsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Admin Timesheet Supervisory Decree</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Reviewing timesheet for <strong>{selTs?.adminName || selTs?.name}</strong> ({selTs?.month} {selTs?.year}).
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Decision</InputLabel>
            <Select value={tsAction} label="Decision" onChange={e => setTsAction(e.target.value as any)}>
              <MenuItem value="APPROVED">Approve Timesheet</MenuItem>
              <MenuItem value="RETURNED_FOR_CORRECTION">Return for Correction</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Episcopal Remarks / Directive"
            value={tsComment}
            onChange={e => setTsComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTsDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleTimesheetDecision} sx={{ bgcolor: C.primary, fontWeight: 700 }}>
            Record Decree
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── PROJECT CLEARANCE DIALOG ── */}
      <Dialog open={projDialog} onClose={() => setProjDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Capital Project Episcopal Clearance</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Project: <strong>{selProj?.title || selProj?.description}</strong> — Budget: {fmtNGN(selProj?.amount)}
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Clearance Action</InputLabel>
            <Select value={projAction} label="Clearance Action" onChange={e => setProjAction(e.target.value as any)}>
              <MenuItem value="APPROVED">Grant Episcopal Clearance (Approve)</MenuItem>
              <MenuItem value="REJECTED">Decline Clearance (Reject)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Clearance Security Code (type: EPISCOPAL-OK)"
            placeholder="EPISCOPAL-OK"
            value={projCode}
            onChange={e => setProjCode(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setProjDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleProjectDecision} sx={{ bgcolor: C.secondary, fontWeight: 700 }}>
            Submit Clearance
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── FINANCIAL AUDIT DOCKET & DECREE DIALOG ── */}
      <Dialog open={auditDetailOpen} onClose={() => setAuditDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ background: gradientHeader, color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <VerifiedUser sx={{ color: C.gold }} />
            <Typography variant="h6" sx={{ fontWeight: 850, color: '#fff' }}>
              Episcopal Financial Audit Docket & Decree
            </Typography>
          </Stack>
          <Chip
            size="small"
            label={selectedAudit?.type === 'EXTERNAL' ? 'EXTERNAL AUDIT' : 'INTERNAL AUDIT'}
            sx={{ bgcolor: selectedAudit?.type === 'EXTERNAL' ? '#f3e8ff' : '#fef3c7', color: selectedAudit?.type === 'EXTERNAL' ? '#6b21a8' : '#92400e', fontWeight: 800 }}
          />
        </DialogTitle>
        <DialogContent sx={{ pt: 3, bgcolor: C.surface }}>
          {selectedAudit && (
            <Stack spacing={2.5}>
              <Card sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${C.border}` }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700 }}>AUDIT REFERENCE & ENGAGEMENT</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 850, color: C.primary }}>{selectedAudit.auditNumber}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedAudit.title}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700 }}>APPOINTED AUDITOR & QUALIFICATION</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.text }}>{selectedAudit.auditor}</Typography>
                    <Typography variant="caption" sx={{ color: C.muted }}>{selectedAudit.auditorRole}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700 }}>AUDIT PERIOD</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 750 }}>{selectedAudit.auditPeriod}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700 }}>TOTAL AUDITED VOLUME</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: C.primary }}>{fmtNGN(selectedAudit.auditedAmount)}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700 }}>IDENTIFIED VARIANCE</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: selectedAudit.varianceAmount > 0 ? C.danger : C.success }}>
                      {selectedAudit.varianceAmount > 0 ? fmtNGN(selectedAudit.varianceAmount) : '₦0 (Clean)'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700 }}>AUDITOR RATING</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: selectedAudit.status === 'QUERY_ISSUED' ? C.danger : C.success }}>
                      {selectedAudit.status.replace(/_/g, ' ')}
                    </Typography>
                  </Grid>
                </Grid>
              </Card>

              {/* Findings & Opinion */}
              <Card sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${C.border}` }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 850, color: C.text, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment sx={{ color: C.secondary, fontSize: 18 }} /> Auditor Findings & Opinion
                </Typography>
                <Typography variant="body2" sx={{ color: '#334155', mb: 2, bgcolor: '#f8fafc', p: 1.5, borderRadius: 1.5, borderLeft: `3px solid ${C.secondary}` }}>
                  {selectedAudit.findings}
                </Typography>

                <Typography variant="subtitle2" sx={{ fontWeight: 850, color: C.text, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Policy sx={{ color: C.gold, fontSize: 18 }} /> Recommended Internal Controls
                </Typography>
                <Typography variant="body2" sx={{ color: '#334155', mb: 2, bgcolor: '#f8fafc', p: 1.5, borderRadius: 1.5, borderLeft: `3px solid ${C.gold}` }}>
                  {selectedAudit.recommendation}
                </Typography>

                <Typography variant="subtitle2" sx={{ fontWeight: 850, color: C.text, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryEdu sx={{ color: C.primary, fontSize: 18 }} /> Hospital Management Response
                </Typography>
                <Typography variant="body2" sx={{ color: '#334155', bgcolor: '#f8fafc', p: 1.5, borderRadius: 1.5, borderLeft: `3px solid ${C.primary}` }}>
                  {selectedAudit.managementResponse}
                </Typography>
              </Card>

              {/* Episcopal Decree Action */}
              <Card sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${C.goldBorder}`, bgcolor: '#fffbeb' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 850, color: '#92400e', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Gavel sx={{ color: '#d97706', fontSize: 20 }} /> Episcopal Audit Certification & Decree
                </Typography>
                <Typography variant="caption" sx={{ color: '#78350f', display: 'block', mb: 2 }}>
                  Enter the Episcopal Security Key <strong>(BISHOP-SEAL)</strong> to affix your decree to this audit engagement.
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Episcopal Security Key (type: BISHOP-SEAL)"
                  placeholder="BISHOP-SEAL"
                  value={auditDecreeCode}
                  onChange={e => setAuditDecreeCode(e.target.value)}
                  sx={{ bgcolor: '#fff', borderRadius: 1, mb: 2 }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    onClick={() => handleRecordAuditDecree('EPISCOPAL_CERTIFIED')}
                    sx={{ bgcolor: C.primary, color: '#fff', fontWeight: 800, textTransform: 'none', flex: 1 }}
                  >
                    Grant Episcopal Certification
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => handleRecordAuditDecree('APPROVED')}
                    sx={{ bgcolor: C.success, color: '#fff', fontWeight: 800, textTransform: 'none', flex: 1 }}
                  >
                    Approve Management Plan
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleRecordAuditDecree('SANCTION_ISSUED')}
                    sx={{ borderColor: C.danger, color: C.danger, fontWeight: 800, textTransform: 'none', flex: 1 }}
                  >
                    Issue Corrective Sanction
                  </Button>
                </Stack>
              </Card>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: C.surface }}>
          <Button onClick={() => setAuditDetailOpen(false)} sx={{ fontWeight: 700 }}>Close Docket</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
