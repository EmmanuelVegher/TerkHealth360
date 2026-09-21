import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, Typography, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Stack, Divider,
  Tooltip, IconButton, Tabs, Tab, FormControl, InputLabel, Select, MenuItem,
  LinearProgress, Alert, AlertTitle, Badge, Avatar, List, ListItem,
  ListItemText, ListItemAvatar, ListItemIcon, Stepper, Step, StepLabel,
  StepContent
} from '@mui/material';
import {
  Shield, CheckCircle, Cancel, Receipt, People,
  LocalHospital, AccountBalance, Assignment, Security,
  Timeline, Warning, Refresh, VerifiedUser, Gavel,
  EventNote, HowToVote, HistoryEdu, TrendingUp,
  WorkHistory, Approval, KeyboardReturn,
  CalendarMonth, AccessTime, Person, CheckBox,
  NotificationsActive, Fingerprint, Stars
} from '@mui/icons-material';
import { NairaCircleIcon } from '../components/NairaIcon';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import {
  AccountantDashboard, AdminDashboard, AuditorDashboard,
  InsuranceDashboard, PhysioDashboard, SecretaryDashboard
} from './DashboardRolePanels';

// ─── Theme Tokens ──────────────────────────────────────────────────────────────
const C = {
  primary:   '#1e1b4b',
  secondary: '#3730a3',
  accent:    '#b45309',
  gold:      '#d97706',
  success:   '#166534',
  successBg: '#dcfce7',
  warning:   '#92400e',
  warningBg: '#fef3c7',
  danger:    '#991b1b',
  dangerBg:  '#fee2e2',
  info:      '#1e40af',
  infoBg:    '#dbeafe',
  surface:   '#f8fafc',
  border:    '#e2e8f0',
  text:      '#0f172a',
  muted:     '#64748b',
};

const gradientHeader = `linear-gradient(135deg, ${C.primary} 0%, #111827 60%, #1e3a5f 100%)`;

// ─── Helper Formatters ─────────────────────────────────────────────────────────
const fmtNGN = (v: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(v);

const statusColor = (s: string): 'warning' | 'success' | 'error' | 'default' | 'info' => {
  if (s === 'PENDING_BISHOP_REVIEW' || s === 'PENDING_BISHOP_SIGNATURE' || s === 'PENDING') return 'warning';
  if (s === 'APPROVED' || s === 'DISBURSED') return 'success';
  if (s === 'REJECTED' || s === 'RETURNED_FOR_CORRECTION') return 'error';
  return 'default';
};

const statusLabel: Record<string, string> = {
  PENDING_BISHOP_REVIEW:    '⏳ Awaiting Bishop Review',
  PENDING_BISHOP_SIGNATURE: '⏳ Awaiting Episcopal Seal',
  APPROVED:                 '✅ Approved',
  DISBURSED:                '✅ Disbursed',
  RETURNED_FOR_CORRECTION:  '↩ Returned',
  REJECTED:                 '❌ Rejected',
  PENDING:                  '⏳ Pending',
};

const auditTypeIcon: Record<string, React.ReactNode> = {
  PAYROLL_SIGNED:    <NairaCircleIcon sx={{ color: C.success }} />,
  TIMESHEET_APPROVED: <CheckBox sx={{ color: C.success }} />,
  TIMESHEET_RETURNED: <KeyboardReturn sx={{ color: C.warning }} />,
  PROJECT_APPROVED:  <Approval sx={{ color: C.success }} />,
  PROJECT_REJECTED:  <Cancel sx={{ color: C.danger }} />,
};

// ─── Sub-Components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = C.primary }: any) {
  return (
    <Card sx={{ p: 2.5, borderRadius: 2.5, height: '100%', border: `1px solid ${C.border}`, boxShadow: 'none' }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar sx={{ bgcolor: `${color}15`, color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{value}</Typography>
          {sub && <Typography variant="caption" sx={{ color: C.muted }}>{sub}</Typography>}
        </Box>
      </Stack>
    </Card>
  );
}

function TabPanel({ children, value, index }: any) {
  return value === index ? <Box sx={{ pt: 2.5 }}>{children}</Box> : null;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function BishopsDashboard() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  // ── Access guard ──
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN');
  const isBishop = user?.designation === 'Bishop' || user?.role === 'BISHOP' || user?.roles?.includes('BISHOP') || (user?.designation || '').toLowerCase().includes('bishop') || (user?.role || '').toLowerCase() === 'bishop';
  if (!isSuperAdmin && !isBishop) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: C.surface }}>
        <Card sx={{ maxWidth: 480, p: 5, textAlign: 'center', borderRadius: 3, border: `1px solid ${C.border}` }}>
          <Shield sx={{ fontSize: '4rem', color: C.danger, mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Access Denied</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The Episcopal Desk is restricted to the Bishop and Super Administrators only.
          </Typography>
          <Button variant="contained" href="/" sx={{ bgcolor: C.primary, fontWeight: 700, borderRadius: 2 }}>
            Return to Dashboard
          </Button>
        </Card>
      </Box>
    );
  }

  // ── State ──
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [focusDash, setFocusDash] = useState('executive');

  const [payroll, setPayroll]         = useState<any[]>([]);
  const [timesheets, setTimesheets]   = useState<any[]>([]);
  const [requests, setRequests]       = useState<any[]>([]);
  const [auditLog, setAuditLog]       = useState<any[]>([]);
  const [stats, setStats]             = useState({ activePatients: 24, bedOccupancy: '78%', monthlyRevenue: 28450000, totalStaff: 9, pendingPayrolls: 0, pendingTimesheets: 0, pendingProjects: 0 });

  // Timesheet dialog
  const [tsDialog, setTsDialog]       = useState(false);
  const [selTs, setSelTs]             = useState<any>(null);
  const [tsAction, setTsAction]       = useState<'APPROVED'|'RETURNED_FOR_CORRECTION'>('APPROVED');
  const [tsComment, setTsComment]     = useState('');

  // Payroll dialog
  const [paySealKey, setPaySealKey]   = useState('');
  const [payProcessing, setPayProcessing] = useState(false);

  // Project dialog
  const [projDialog, setProjDialog]   = useState(false);
  const [selProj, setSelProj]         = useState<any>(null);
  const [projAction, setProjAction]   = useState<'APPROVED'|'REJECTED'>('APPROVED');
  const [projCode, setProjCode]       = useState('');
  const [projRemark, setProjRemark]   = useState('');

  // ── Fetch ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, tsRes, reqRes, logRes] = await Promise.all([
        api.get('/hr/payroll'),
        api.get('/hr/admin-timesheets'),
        api.get('/hr/internal-requests'),
        api.get('/hr/bishop-audit-log'),
      ]);
      const pay  = payRes.data?.success  ? payRes.data.data  : [];
      const ts   = tsRes.data?.success   ? tsRes.data.data   : [];
      const reqs = reqRes.data?.success  ? reqRes.data.data  : [];
      const log  = logRes.data?.success  ? logRes.data.data  : [];

      setPayroll(pay);
      setTimesheets(ts);
      setRequests(reqs);
      setAuditLog(log);
      setStats(prev => ({
        ...prev,
        pendingPayrolls:   pay.filter((p: any) =>
          p.status === 'PENDING_BISHOP_SIGNATURE' ||
          p.status === 'ADMIN_APPROVED' ||
          p.status === 'APPROVED_BY_ADMIN' ||
          (p.signedByAdmin && !p.signedByBishop && !p.bishopSealApplied && p.status !== 'DISBURSED')
        ).length,
        pendingTimesheets: ts.filter((t: any)  => t.status === 'PENDING_BISHOP_REVIEW').length,
        pendingProjects:   reqs.filter((r: any) => r.type === 'CAPITAL_PROJECT' && r.status === 'PENDING').length,
      }));
    } catch (e) {
      console.error('Bishop dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Handlers ──
  const handleTimesheetDecision = async () => {
    if (!selTs) return;
    try {
      await api.patch(`/hr/admin-timesheets/${selTs.id}/decision`, { action: tsAction, bishopComment: tsComment });
      enqueueSnackbar(`Timesheet ${tsAction.toLowerCase().replace(/_/g, ' ')}.`, { variant: tsAction === 'APPROVED' ? 'success' : 'warning' });
      setTsDialog(false); setTsComment(''); fetchAll();
    } catch {
      enqueueSnackbar('Failed to process timesheet decision.', { variant: 'error' });
    }
  };

  const handleSignPayroll = async (runId: string) => {
    setPayProcessing(true);
    try {
      await api.post(`/hr/payroll/${runId}/bishop-sign`, {
        bishopName: 'Most Rev. Dr. C.V.C. Onaga',
        sealCode: paySealKey || 'BISHOP-SEAL'
      });
      enqueueSnackbar('Episcopal Seal affixed. Payroll authorized for disbursement.', { variant: 'success' });
      setPaySealKey(''); fetchAll();
    } catch {
      enqueueSnackbar('Failed to sign payroll.', { variant: 'error' });
    } finally { setPayProcessing(false); }
  };

  const handleProjectDecision = async () => {
    if (projCode !== 'EPISCOPAL-OK') {
      enqueueSnackbar('Invalid Clearance Code. Enter: EPISCOPAL-OK', { variant: 'error' }); return;
    }
    try {
      await api.patch(`/hr/internal-requests/${selProj.id}/status`, { status: projAction });
      enqueueSnackbar(`Project ${projAction.toLowerCase()}.`, { variant: projAction === 'APPROVED' ? 'success' : 'warning' });
      setProjDialog(false); setProjCode(''); setProjRemark(''); fetchAll();
    } catch {
      enqueueSnackbar('Failed to update project.', { variant: 'error' });
    }
  };

  const pendingPayrolls = payroll.filter(p =>
    p.status === 'PENDING_BISHOP_SIGNATURE' ||
    p.status === 'ADMIN_APPROVED' ||
    p.status === 'APPROVED_BY_ADMIN' ||
    (p.signedByAdmin && !p.signedByBishop && !p.bishopSealApplied && p.status !== 'DISBURSED')
  );
  const disbursedPayroll = payroll.filter(p =>
    p.status === 'DISBURSED' ||
    p.status === 'EPISCOPAL_APPROVED' ||
    p.status === 'TRANSMITTED_TO_FINANCE' ||
    p.signedByBishop ||
    p.bishopSealApplied
  );
  const pendingTs        = timesheets.filter(t => t.status === 'PENDING_BISHOP_REVIEW');
  const reviewedTs       = timesheets.filter(t => t.status !== 'PENDING_BISHOP_REVIEW');
  const capProjects      = requests.filter(r => r.type === 'CAPITAL_PROJECT' || r.type === 'BILL_REQUISITION');
  const pendingProjects  = capProjects.filter(r => r.status === 'PENDING');
  const clearedProjects  = capProjects.filter(r => r.status !== 'PENDING');

  const totalPending = stats.pendingPayrolls + stats.pendingTimesheets + stats.pendingProjects;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: C.surface, overflow: 'hidden' }}>

      {/* ── HEADER BANNER ── */}
      <Box sx={{ background: gradientHeader, color: '#fff', px: 3, py: 2.5, flexShrink: 0, borderBottom: `3px solid ${C.gold}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
              <Stars sx={{ color: C.gold, fontSize: '1.6rem' }} />
              <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 0.3, fontFamily: "'Georgia', serif" }}>
                Episcopal General Superintendent — Bishop's Desk
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} ml={4}>
              {[
                { label: 'Timesheets', count: stats.pendingTimesheets, color: C.gold },
                { label: 'Payrolls',   count: stats.pendingPayrolls,   color: '#f87171' },
                { label: 'Projects',   count: stats.pendingProjects,   color: '#93c5fd' },
              ].map(i => (
                <Chip key={i.label} size="small"
                  label={`${i.count} ${i.label} Awaiting`}
                  sx={{ bgcolor: `${i.color}25`, color: i.color, fontWeight: 700, fontSize: '0.72rem', border: `1px solid ${i.color}40` }}
                />
              ))}
            </Stack>
          </Box>
          <Tooltip title="Refresh all data">
            <IconButton onClick={fetchAll} size="small" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ height: 2 }} />}

      {/* ── TABS ── */}
      <Box sx={{ px: 3, pt: 2, flexShrink: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          bgcolor: '#fff', borderRadius: 3, border: `1px solid ${C.border}`, px: 1,
          '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.87rem', minHeight: 52 },
          '& .Mui-selected': { fontWeight: 800, color: `${C.primary} !important` },
          '& .MuiTabs-indicator': { bgcolor: C.gold, height: 3, borderRadius: 2 },
        }}>
          <Tab icon={<TrendingUp />} iconPosition="start" label="Executive Overview" />
          <Tab
            icon={<Badge badgeContent={stats.pendingTimesheets} color="warning" max={9}><WorkHistory /></Badge>}
            iconPosition="start" label="Admin Timesheet" />
          <Tab
            icon={<Badge badgeContent={stats.pendingPayrolls} color="error" max={9}><Gavel /></Badge>}
            iconPosition="start" label="Payroll Authorization" />
          <Tab
            icon={<Badge badgeContent={stats.pendingProjects} color="warning" max={9}><Assignment /></Badge>}
            iconPosition="start" label="Capital Projects" />
        </Tabs>
      </Box>

      {/* ── SCROLLABLE CONTENT ── */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, pb: 3 }}>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 0 — EXECUTIVE OVERVIEW
        ═══════════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={0}>
          {totalPending > 0 && (
            <Alert severity="warning" icon={<NotificationsActive />} sx={{ mb: 2.5, borderRadius: 2, fontWeight: 600 }}>
              <AlertTitle sx={{ fontWeight: 800 }}>Episcopal Actions Required</AlertTitle>
              You have <strong>{totalPending}</strong> items awaiting your authority —{' '}
              {stats.pendingTimesheets > 0 && `${stats.pendingTimesheets} timesheet(s), `}
              {stats.pendingPayrolls > 0 && `${stats.pendingPayrolls} payroll run(s), `}
              {stats.pendingProjects > 0 && `${stats.pendingProjects} capital project(s).`}
            </Alert>
          )}

          {/* KPI Cards */}
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={6} sm={3}>
              <StatCard icon={<People />} label="Hospital Staff" value={stats.totalStaff} sub="Active headcount" color={C.secondary} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard icon={<LocalHospital />} label="Bed Occupancy" value={stats.bedOccupancy} sub="Inpatients today" color={C.success} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard icon={<NairaCircleIcon />} label="Monthly Revenue" value={fmtNGN(stats.monthlyRevenue)} sub="This month" color={C.accent} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard icon={<HistoryEdu />} label="Audit Log Entries" value={auditLog.length} sub="Episcopal decisions" color={C.primary} />
            </Grid>
          </Grid>

          {/* Workflow Status Board */}
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} md={5}>
              <Card sx={{ p: 3, borderRadius: 2.5, border: `1px solid ${C.border}`, height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: C.primary }}>
                  Episcopal Workflow Status
                </Typography>
                <Stack spacing={2}>
                  {[
                    { icon: <WorkHistory />, label: "Admin's Timesheet", pending: stats.pendingTimesheets, total: timesheets.length, tabIdx: 1 },
                    { icon: <Gavel />,       label: 'Payroll Authorization', pending: stats.pendingPayrolls, total: payroll.length, tabIdx: 2 },
                    { icon: <Assignment />, label: 'Capital Projects', pending: stats.pendingProjects, total: capProjects.length, tabIdx: 3 },
                  ].map(item => (
                    <Paper key={item.label} onClick={() => setTab(item.tabIdx)}
                      sx={{ p: 2, borderRadius: 2, cursor: 'pointer', border: `1px solid ${item.pending > 0 ? '#fbbf24' : C.border}`,
                        bgcolor: item.pending > 0 ? '#fffbeb' : '#fff',
                        '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 36, height: 36, bgcolor: item.pending > 0 ? '#fef3c7' : '#f1f5f9', color: item.pending > 0 ? C.accent : C.muted }}>
                            {item.icon}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.label}</Typography>
                            <Typography variant="caption" sx={{ color: C.muted }}>{item.total} total records</Typography>
                          </Box>
                        </Stack>
                        {item.pending > 0
                          ? <Chip label={`${item.pending} Pending`} color="warning" size="small" sx={{ fontWeight: 800 }} />
                          : <Chip label="All Clear" color="success" size="small" sx={{ fontWeight: 700 }} />
                        }
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Card>
            </Grid>

            {/* Recent Audit Log */}
            <Grid item xs={12} md={7}>
              <Card sx={{ p: 3, borderRadius: 2.5, border: `1px solid ${C.border}`, height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: C.primary }}>
                  Recent Episcopal Decisions
                </Typography>
                <Stack spacing={1.5}>
                  {auditLog.slice(0, 5).map(log => (
                    <Paper key={log.id} sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${C.border}`, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: log.action === 'APPROVED' ? C.successBg : C.dangerBg }}>
                        {auditTypeIcon[log.type] || <HowToVote fontSize="small" />}
                      </Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: C.muted }}>{log.decisionDate} · {log.decidedBy}</Typography>
                      </Box>
                      <Chip label={log.action} size="small" color={log.action === 'APPROVED' ? 'success' : 'error'} sx={{ fontSize: '0.65rem', fontWeight: 800 }} />
                    </Paper>
                  ))}
                  {auditLog.length === 0 && <Typography variant="caption" color="text.secondary">No decisions recorded yet.</Typography>}
                </Stack>
              </Card>
            </Grid>
          </Grid>

          {/* Focus Dashboard Switcher */}
          <Card sx={{ p: 2.5, mb: 2, borderRadius: 2.5, border: `1px solid ${C.border}` }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <VerifiedUser sx={{ color: C.secondary }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Live 360° Focus Dashboard</Typography>
              </Stack>
              <FormControl size="small" sx={{ minWidth: 280 }}>
                <InputLabel>Select Role Dashboard to View</InputLabel>
                <Select value={focusDash} label="Select Role Dashboard to View" onChange={e => setFocusDash(e.target.value)} sx={{ borderRadius: 2 }}>
                  <MenuItem value="executive">Episcopal Overview</MenuItem>
                  <MenuItem value="admin">Administrator Dashboard</MenuItem>
                  <MenuItem value="accountant">Accountant Dashboard</MenuItem>
                  <MenuItem value="auditor">Internal Auditor Dashboard</MenuItem>
                  <MenuItem value="insurance">Insurance HMO Dashboard</MenuItem>
                  <MenuItem value="secretary">Secretary Dashboard</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Card>
          {focusDash !== 'executive' && (() => {
            const map: any = { admin: AdminDashboard, accountant: AccountantDashboard, auditor: AuditorDashboard, insurance: InsuranceDashboard, secretary: SecretaryDashboard };
            const Comp = map[focusDash];
            return Comp ? <Comp data={{}} /> : null;
          })()}
        </TabPanel>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1 — ADMINISTRATOR TIMESHEET APPROVAL
        ═══════════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={1}>
          <Grid container spacing={3}>
            {/* LEFT — Pending Timesheets */}
            <Grid item xs={12} md={7}>
              <Card sx={{ p: 3, borderRadius: 2.5, border: `1px solid ${C.border}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.primary }}>Administrator Monthly Timesheets</Typography>
                    <Typography variant="caption" sx={{ color: C.muted }}>The Hospital Administrator reports to the Bishop. Review and sign off each monthly timesheet.</Typography>
                  </Box>
                  <Chip label={`${pendingTs.length} Pending`} color={pendingTs.length > 0 ? 'warning' : 'success'} sx={{ fontWeight: 700 }} />
                </Stack>

                {pendingTs.length > 0 && (
                  <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.82rem' }}>
                    <strong>{pendingTs.length} timesheet(s)</strong> from the Hospital Administrator require your Episcopal review and decision.
                  </Alert>
                )}

                <Stack spacing={2.5}>
                  {timesheets.map(ts => (
                    <Paper key={ts.id} sx={{
                      p: 0, borderRadius: 2.5, overflow: 'hidden',
                      border: `2px solid ${ts.status === 'PENDING_BISHOP_REVIEW' ? '#f59e0b' : ts.status === 'APPROVED' ? '#22c55e' : '#ef4444'}`,
                    }}>
                      {/* Card Header */}
                      <Box sx={{ px: 2.5, py: 1.5, bgcolor: ts.status === 'PENDING_BISHOP_REVIEW' ? '#fffbeb' : ts.status === 'APPROVED' ? '#f0fdf4' : '#fef2f2', borderBottom: `1px solid ${C.border}` }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <CalendarMonth sx={{ color: C.muted, fontSize: '1.1rem' }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{ts.month} — Administrator Timesheet</Typography>
                          </Stack>
                          <Chip label={statusLabel[ts.status] || ts.status} color={statusColor(ts.status)} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                        </Stack>
                      </Box>

                      {/* Card Body */}
                      <Box sx={{ p: 2.5 }}>
                        <Grid container spacing={2} mb={2}>
                          {[
                            { icon: <Person fontSize="small" />, label: 'Submitted By', val: ts.submittedBy },
                            { icon: <AccessTime fontSize="small" />, label: 'Days Worked', val: `${ts.daysWorked} / ${ts.totalHospitalDays}` },
                            { icon: <WorkHistory fontSize="small" />, label: 'Overtime Hours', val: `${ts.overtimeHours} hrs` },
                            { icon: <EventNote fontSize="small" />, label: 'Leaves Taken', val: `${ts.leavesTaken} days` },
                          ].map(f => (
                            <Grid item xs={6} key={f.label}>
                              <Stack direction="row" spacing={0.75} alignItems="center" mb={0.25}>
                                <Box sx={{ color: C.muted }}>{f.icon}</Box>
                                <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600 }}>{f.label}</Typography>
                              </Stack>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{f.val}</Typography>
                            </Grid>
                          ))}
                        </Grid>

                        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1.5, mb: 2, border: `1px solid ${C.border}` }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: C.muted, display: 'block', mb: 0.5 }}>Administrator's Report</Typography>
                          <Typography variant="body2" sx={{ fontStyle: 'italic', lineHeight: 1.6, color: C.text }}>{ts.remarks}</Typography>
                        </Box>

                        {/* Bishop's Prior Comment */}
                        {ts.bishopComment && (
                          <Box sx={{ p: 2, bgcolor: ts.status === 'APPROVED' ? C.successBg : C.warningBg, borderRadius: 1.5, mb: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: ts.status === 'APPROVED' ? C.success : C.warning, display: 'block', mb: 0.25 }}>
                              Episcopal Remark ({ts.bishopDecisionDate})
                            </Typography>
                            <Typography variant="body2">{ts.bishopComment}</Typography>
                          </Box>
                        )}

                        {ts.status === 'PENDING_BISHOP_REVIEW' && (
                          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                            <Button variant="outlined" color="warning" startIcon={<KeyboardReturn />}
                              onClick={() => { setSelTs(ts); setTsAction('RETURNED_FOR_CORRECTION'); setTsDialog(true); }}
                              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                              Return for Correction
                            </Button>
                            <Button variant="contained" color="success" startIcon={<CheckCircle />}
                              onClick={() => { setSelTs(ts); setTsAction('APPROVED'); setTsDialog(true); }}
                              sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}>
                              Approve Timesheet
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    </Paper>
                  ))}
                  {timesheets.length === 0 && (
                    <Box sx={{ py: 5, textAlign: 'center' }}>
                      <Typography color="text.secondary">No timesheets submitted yet.</Typography>
                    </Box>
                  )}
                </Stack>
              </Card>
            </Grid>

            {/* RIGHT — History & Audit */}
            <Grid item xs={12} md={5}>
              <Card sx={{ p: 3, borderRadius: 2.5, border: `1px solid ${C.border}`, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: C.primary }}>Episcopal Decision History</Typography>
                <Stack spacing={1.5}>
                  {reviewedTs.map(ts => (
                    <Paper key={ts.id} sx={{ p: 2, borderRadius: 2, border: `1px solid ${C.border}`, borderLeft: `4px solid ${ts.status === 'APPROVED' ? '#22c55e' : '#f97316'}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="start">
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 800 }}>{ts.month}</Typography>
                          <Typography variant="caption" sx={{ color: C.muted, display: 'block' }}>By: {ts.submittedBy}</Typography>
                          {ts.bishopComment && <Typography variant="caption" sx={{ color: C.muted, fontStyle: 'italic' }}>"{ts.bishopComment}"</Typography>}
                        </Box>
                        <Chip label={statusLabel[ts.status] || ts.status} color={statusColor(ts.status)} size="small" sx={{ fontSize: '0.65rem', fontWeight: 700 }} />
                      </Stack>
                    </Paper>
                  ))}
                  {reviewedTs.length === 0 && <Typography variant="caption" color="text.secondary">No reviewed timesheets yet.</Typography>}
                </Stack>
              </Card>

              {/* Workflow Steps Card */}
              <Card sx={{ p: 3, borderRadius: 2.5, border: `1px solid ${C.border}` }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: C.primary }}>Timesheet Review Process</Typography>
                <Stepper orientation="vertical" nonLinear activeStep={-1}>
                  {[
                    { label: 'Admin Submits Timesheet', desc: 'Administrator submits monthly attendance and duties report.' },
                    { label: 'Arrives at Bishop\'s Desk', desc: 'Timesheet appears as PENDING BISHOP REVIEW in the Episcopal Desk.' },
                    { label: 'Bishop Reviews & Decides', desc: 'Bishop reads the report, adds remarks, then Approves or Returns.' },
                    { label: 'Decision is Logged', desc: 'The decision is recorded in the Episcopal Audit Log permanently.' },
                  ].map(step => (
                    <Step key={step.label} expanded>
                      <StepLabel><Typography variant="caption" sx={{ fontWeight: 700 }}>{step.label}</Typography></StepLabel>
                      <StepContent><Typography variant="caption" color="text.secondary">{step.desc}</Typography></StepContent>
                    </Step>
                  ))}
                </Stepper>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2 — PAYROLL AUTHORIZATION
        ═══════════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={2}>
          {pendingPayrolls.length > 0 && (
            <Alert severity="error" icon={<NotificationsActive />} sx={{ mb: 2.5, borderRadius: 2 }}>
              <AlertTitle sx={{ fontWeight: 800 }}>{pendingPayrolls.length} Payroll Run(s) Awaiting Episcopal Seal</AlertTitle>
              Finance has compiled the monthly salary schedule. No disbursements may occur until you affix the Episcopal Seal.
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* LEFT — Decree cards */}
            <Grid item xs={12} md={7}>
              <Card sx={{ p: 3, borderRadius: 2.5, border: `1px solid ${C.border}` }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2.5, color: C.primary }}>Pending Salary Authorization Decrees</Typography>

                {pendingPayrolls.length > 0 ? pendingPayrolls.map(run => (
                  <Paper key={run.id} sx={{
                    p: 3, mb: 2.5, borderRadius: 2.5, position: 'relative', overflow: 'hidden',
                    border: `2px solid ${C.gold}`, bgcolor: '#fffbeb',
                  }}>
                    {/* Watermark */}
                    <Typography sx={{ position: 'absolute', bottom: -30, right: -20, fontSize: '7rem', opacity: 0.04, userSelect: 'none', fontFamily: 'serif' }}>✟</Typography>

                    <Typography align="center" variant="overline" sx={{ color: C.accent, fontWeight: 900, letterSpacing: 2, mb: 2, display: 'block' }}>
                      📜 Episcopal Authorization Decree
                    </Typography>

                    <Typography variant="body2" sx={{ fontFamily: 'Georgia, serif', lineHeight: 2, color: C.text, mb: 2.5, textAlign: 'justify' }}>
                      "I, the Bishop of the Diocese of Faith Foundation, hereby authorize the final
                      disbursement of staff salaries for the period of <strong>{run.payPeriod}</strong>. The Finance
                      Department has compiled and verified the payroll totaling a gross of{' '}
                      <strong>{fmtNGN(run.totalGross)}</strong>, with authorized statutory deductions of{' '}
                      <strong>{fmtNGN(run.deductions)}</strong>, resulting in a net payable of{' '}
                      <strong>{fmtNGN(run.netPaid)}</strong> to all eligible hospital staff. The Administrator
                      is hereby directed to release funds from the Central Treasury accordingly."
                    </Typography>

                    <Divider sx={{ mb: 2.5, borderColor: `${C.gold}50` }} />

                    {/* Summary */}
                    <Grid container spacing={2} mb={2.5}>
                      {[
                        { label: 'Gross Payroll', val: fmtNGN(run.totalGross), color: C.text },
                        { label: 'Deductions (Tax/Pension)', val: fmtNGN(run.deductions), color: C.danger },
                        { label: 'Net Disbursement', val: fmtNGN(run.netPaid), color: C.success },
                        { label: 'Pay Period', val: run.payPeriod, color: C.primary },
                      ].map(f => (
                        <Grid item xs={6} key={f.label}>
                          <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, display: 'block' }}>{f.label}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: f.color }}>{f.val}</Typography>
                        </Grid>
                      ))}
                    </Grid>

                    {/* Seal Input */}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="stretch">
                      <TextField
                        label="Affix Episcopal Seal Key"
                        placeholder="Type: BISHOP-SEAL"
                        size="small"
                        fullWidth
                        value={paySealKey}
                        onChange={e => setPaySealKey(e.target.value)}
                        InputProps={{ startAdornment: <Fingerprint sx={{ color: C.muted, mr: 1 }} /> }}
                        sx={{ bgcolor: '#fff' }}
                      />
                      <Button
                        variant="contained"
                        disabled={payProcessing}
                        onClick={() => handleSignPayroll(run.id)}
                        startIcon={<Gavel />}
                        sx={{ bgcolor: C.accent, color: '#fff', fontWeight: 800, textTransform: 'none', whiteSpace: 'nowrap', '&:hover': { bgcolor: '#92400e' }, minWidth: 160 }}
                      >
                        Sign & Authorize
                      </Button>
                    </Stack>
                  </Paper>
                )) : (
                  <Box sx={{ py: 5, textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 2 }}>
                    <CheckCircle sx={{ fontSize: '2.5rem', color: '#22c55e', mb: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.success }}>All Payrolls Cleared</Typography>
                    <Typography variant="caption" color="text.secondary">No pending salary decrees awaiting the Episcopal Seal.</Typography>
                  </Box>
                )}
              </Card>
            </Grid>

            {/* RIGHT — Disbursement History */}
            <Grid item xs={12} md={5}>
              <Card sx={{ p: 3, borderRadius: 2.5, border: `1px solid ${C.border}` }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: C.primary }}>Disbursement History</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Period</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Net Paid</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Date Signed</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {disbursedPayroll.map(h => (
                        <TableRow key={h.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                          <TableCell sx={{ fontWeight: 700 }}>{h.payPeriod}</TableCell>
                          <TableCell sx={{ color: C.success, fontWeight: 800 }}>{fmtNGN(h.netPaid)}</TableCell>
                          <TableCell>
                            <Chip label={h.bishopSignatureDate || '—'} size="small" color="success" sx={{ fontSize: '0.7rem', fontWeight: 700 }} />
                          </TableCell>
                        </TableRow>
                      ))}
                      {disbursedPayroll.length === 0 && (
                        <TableRow><TableCell colSpan={3} align="center"><Typography variant="caption" color="text.secondary">No disbursed payrolls</Typography></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3 — CAPITAL PROJECTS
        ═══════════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Card sx={{ p: 3, borderRadius: 2.5, border: `1px solid ${C.border}` }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2.5, color: C.primary }}>Pending Capital Projects & Procurement Clearance</Typography>
                {pendingProjects.length > 0 ? (
                  <Stack spacing={2.5}>
                    {pendingProjects.map(proj => (
                      <Paper key={proj.id} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${C.border}`, borderLeft: `5px solid ${C.gold}` }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="start" mb={1}>
                          <Box flex={1} mr={1}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{proj.title}</Typography>
                            <Typography variant="caption" sx={{ color: C.muted }}>{proj.date} · {proj.requester} · {proj.department}</Typography>
                          </Box>
                          <Chip label={proj.type.replace(/_/g, ' ')} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                        </Stack>
                        <Typography variant="body2" sx={{ color: C.muted, mb: 2, lineHeight: 1.6 }}>{proj.content}</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" sx={{ color: C.muted, display: 'block' }}>Estimated Budget</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: C.primary, fontSize: '1.05rem' }}>
                              {proj.estimatedBudget ? fmtNGN(proj.estimatedBudget) : '₦—'}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Button variant="outlined" color="error" size="small" startIcon={<Cancel />}
                              onClick={() => { setSelProj(proj); setProjAction('REJECTED'); setProjDialog(true); }}
                              sx={{ textTransform: 'none', fontWeight: 700 }}>Reject</Button>
                            <Button variant="contained" size="small" startIcon={<CheckCircle />}
                              onClick={() => { setSelProj(proj); setProjAction('APPROVED'); setProjDialog(true); }}
                              sx={{ bgcolor: C.success, fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#14532d' } }}>
                              Approve
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Box sx={{ py: 5, textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 2 }}>
                    <CheckCircle sx={{ fontSize: '2.5rem', color: '#22c55e', mb: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.success }}>No Pending Projects</Typography>
                    <Typography variant="caption" color="text.secondary">All capital requisitions are cleared.</Typography>
                  </Box>
                )}
              </Card>
            </Grid>

            <Grid item xs={12} md={5}>
              <Card sx={{ p: 3, borderRadius: 2.5, border: `1px solid ${C.border}` }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: C.primary }}>Project Approvals Log</Typography>
                <Stack spacing={1.5}>
                  {clearedProjects.map(p => (
                    <Paper key={p.id} sx={{ p: 2, borderRadius: 2, border: `1px solid ${C.border}`, borderLeft: `4px solid ${p.status === 'APPROVED' ? '#22c55e' : '#ef4444'}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="start">
                        <Box flex={1} mr={1}>
                          <Typography variant="caption" sx={{ fontWeight: 800, display: 'block' }}>{p.title}</Typography>
                          <Typography variant="caption" sx={{ color: C.muted }}>{p.estimatedBudget ? fmtNGN(p.estimatedBudget) : '₦—'}</Typography>
                        </Box>
                        <Chip label={p.status} color={p.status === 'APPROVED' ? 'success' : 'error'} size="small" sx={{ fontSize: '0.65rem', fontWeight: 700 }} />
                      </Stack>
                    </Paper>
                  ))}
                  {clearedProjects.length === 0 && <Typography variant="caption" color="text.secondary">No cleared projects yet.</Typography>}
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Box>

      {/* ══════════════════════════════════
          TIMESHEET DECISION DIALOG
      ══════════════════════════════════ */}
      <Dialog open={tsDialog} onClose={() => setTsDialog(false)} PaperProps={{ sx: { borderRadius: 3, minWidth: 420, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 900, color: C.primary }}>
          {tsAction === 'APPROVED' ? '✅ Approve Administrator Timesheet' : '↩ Return Timesheet for Correction'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: C.muted }}>
            Timesheet: <strong>{selTs?.month}</strong> submitted by <strong>{selTs?.submittedBy}</strong>
          </Typography>
          <TextField
            label="Episcopal Remark (required)"
            placeholder={tsAction === 'APPROVED' ? 'e.g. Excellent performance this month.' : 'e.g. Please resubmit with corrected overtime figures.'}
            multiline rows={3} fullWidth size="small"
            value={tsComment} onChange={e => setTsComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setTsDialog(false)} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={handleTimesheetDecision} variant="contained"
            color={tsAction === 'APPROVED' ? 'success' : 'warning'}
            disabled={!tsComment.trim()}
            sx={{ textTransform: 'none', fontWeight: 800 }}>
            {tsAction === 'APPROVED' ? 'Confirm Approval' : 'Return for Correction'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════
          PROJECT APPROVAL DIALOG
      ══════════════════════════════════ */}
      <Dialog open={projDialog} onClose={() => setProjDialog(false)} PaperProps={{ sx: { borderRadius: 3, minWidth: 440, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 900, color: C.primary }}>
          {projAction === 'APPROVED' ? '⛪ Episcopal Project Clearance' : '❌ Reject Capital Project'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: C.muted }}>
            Project: <strong>{selProj?.title}</strong><br />
            Budget: <strong>{selProj?.estimatedBudget ? fmtNGN(selProj.estimatedBudget) : '₦—'}</strong>
          </Typography>
          <TextField
            label="Clearance Code (type: EPISCOPAL-OK)"
            placeholder="EPISCOPAL-OK" fullWidth size="small"
            value={projCode} onChange={e => setProjCode(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Audit Remarks"
            multiline rows={2} fullWidth size="small"
            value={projRemark} onChange={e => setProjRemark(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setProjDialog(false)} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={handleProjectDecision} variant="contained"
            color={projAction === 'APPROVED' ? 'success' : 'error'}
            sx={{ textTransform: 'none', fontWeight: 800 }}>
            Submit Decision
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
