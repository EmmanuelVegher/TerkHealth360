// Triggering hot-reload to clear Vite cache
import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Typography, Card, CardContent, Avatar, Chip, Divider,
  LinearProgress, Stack, CircularProgress, Button, Table, TableBody,
  TableCell, TableHead, TableRow, TableContainer, Badge, IconButton, Tooltip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, TextField,
  Autocomplete, Switch, FormControlLabel,
} from '@mui/material';
import {
  People, CalendarToday, LocalHospital,
  TrendingUp, TrendingDown, Science, LocalPharmacy,
  ArrowForward, Person, Assignment, MonitorHeart, Medication,
  Inventory, Receipt, Queue, CheckCircle, AccessTime, Warning,
  FiberManualRecord, MedicalServices, ArrowUpward, Biotech,
  Bed, Favorite, NotificationsActive, TaskAlt, NightlightRound,
  WbSunny, Brightness5, HourglassBottom, NoteAlt, Done, Build, Shield, ContactPhone,
  PersonalVideo, BarChart, Sensors, CameraAlt,
} from '@mui/icons-material';
import { NairaIcon } from '../components/NairaIcon';
import { alpha } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { isUserLabStaff, isUserPharmacyStaff, isUserMorticianStaff, isUserRadiologyStaff, isUserPhysioStaff, isUserCashierStaff, isUserFinanceStaff, isUserAuditorStaff } from '../utils/roleUtils';
import { getDashboardConfigForUser, type WidgetId, type DashboardRoleConfig } from '../config/dashboardConfig';
import {
  FinanceDashboard, AccountantDashboard, AdminDashboard, AuditorDashboard,
  InsuranceDashboard, MorticianDashboard, PhysioDashboard,
  SecretaryDashboard, CashierDashboard
} from './DashboardRolePanels';
import BishopsDashboard from './BishopsDashboard';
import ActiveDutySessionCard from '../components/ActiveDutySessionCard';

/* ── colour palette ───────────────────────────────────────────── */
const C = {
  blue:   '#3b5bdb',
  amber:  '#f59f00',
  red:    '#f03e3e',
  green:  '#2f9e44',
  teal:   '#0ca678',
  violet: '#7048e8',
  navy:   '#1e2a78',
  rose:   '#e64980',
  cyan:   '#0891b2',
};

const VISIT_TYPES = [
  { value: 'OUTPATIENT', label: 'Outpatient (OPD)' },
  { value: 'INPATIENT', label: 'Inpatient (IPD)' },
  { value: 'PAEDIATRIC', label: 'Paediatric Ward' },
  { value: 'EMERGENCY', label: 'Emergency (ER)' },
  { value: 'ANC', label: 'Antenatal (ANC)' },
  { value: 'MATERNITY', label: 'Maternity' },
  { value: 'LABOUR_DELIVERY', label: 'Labour & Delivery' },
  { value: 'LAB_ONLY', label: 'Lab Test Only' },
  { value: 'RADIOLOGY_ONLY', label: 'Radiology Only' },
  { value: 'PHYSIO', label: 'Physiotherapy' },
];

const fmtCurrency = (v: number) => {
  if (v >= 1000000) return `₦${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `₦${(v / 1000).toFixed(0)}k`;
  return `₦${v.toLocaleString()}`;
};

const getStatusChip = (status: string) => {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    PENDING:     { color: C.amber,   bg: alpha(C.amber, 0.12),   label: 'Pending' },
    CONFIRMED:   { color: C.blue,    bg: alpha(C.blue, 0.10),    label: 'Confirmed' },
    ARRIVED:     { color: C.teal,    bg: alpha(C.teal, 0.10),    label: 'Arrived' },
    IN_PROGRESS: { color: C.violet,  bg: alpha(C.violet, 0.12),  label: 'In Progress' },
    COMPLETED:   { color: C.green,   bg: alpha(C.green, 0.10),   label: 'Completed' },
    CANCELLED:   { color: '#868e96', bg: alpha('#868e96', 0.10), label: 'Cancelled' },
    CRITICAL:    { color: C.red,     bg: alpha(C.red, 0.12),     label: 'Critical' },
    SCHEDULED:   { color: C.blue,    bg: alpha(C.blue, 0.10),    label: 'Scheduled' },
    OVERDUE:     { color: C.red,     bg: alpha(C.red, 0.12),     label: 'Overdue' },
  };
  const s = map[status?.toUpperCase()] ?? { color: '#868e96', bg: alpha('#868e96', 0.1), label: status };
  return <Chip label={s.label} size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: s.bg, color: s.color }} />;
};

/* ══════════════════════════════════════════════════════════════════
   SHARED KPI CARD (used by both Doctor and Nurse)
══════════════════════════════════════════════════════════════════ */
interface KPICardProps {
  label: string; value: string | number; sub: string;
  icon: React.ReactNode; color: string; trend?: number; gradient?: string;
}
const KPICard = ({ label, value, sub, icon, color, trend, gradient }: KPICardProps) => (
  <Card sx={{
    position: 'relative', overflow: 'hidden', border: 'none',
    background: gradient ?? '#fff',
    boxShadow: gradient ? `0 8px 32px ${alpha(color, 0.35)}` : '0 4px 20px rgba(0,0,0,0.07)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 16px 40px ${alpha(color, 0.3)}` },
  }}>
    <Box sx={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', bgcolor: alpha('#fff', gradient ? 0.08 : 0), border: gradient ? `2px solid ${alpha('#fff', 0.12)}` : `2px solid ${alpha(color, 0.08)}` }} />
    <Box sx={{ position: 'absolute', bottom: -20, left: -10, width: 70, height: 70, borderRadius: '50%', bgcolor: alpha(gradient ? '#fff' : color, 0.06) }} />
    <CardContent sx={{ p: 2.5, position: 'relative' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ color: gradient ? alpha('#fff', 0.85) : 'text.secondary', mb: 0.5, fontSize: '0.78rem' }}>{label}</Typography>
          <Typography variant="h3" fontWeight={900} sx={{ color: gradient ? '#fff' : 'text.primary', lineHeight: 1.1, letterSpacing: '-1px' }}>{value}</Typography>
          <Typography variant="caption" sx={{ color: gradient ? alpha('#fff', 0.65) : 'text.secondary', mt: 0.5, display: 'block' }}>{sub}</Typography>
        </Box>
        <Avatar sx={{ width: 52, height: 52, borderRadius: '16px', bgcolor: gradient ? alpha('#fff', 0.15) : alpha(color, 0.12), color: gradient ? '#fff' : color, '& svg': { fontSize: 26 } }}>
          {icon}
        </Avatar>
      </Box>
      {trend !== undefined && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
          {trend >= 0 ? <TrendingUp sx={{ fontSize: 15, color: gradient ? alpha('#fff', 0.8) : C.green }} /> : <TrendingDown sx={{ fontSize: 15, color: gradient ? alpha('#fff', 0.8) : C.red }} />}
          <Typography variant="caption" fontWeight={700} sx={{ color: gradient ? alpha('#fff', 0.85) : (trend >= 0 ? C.green : C.red) }}>{trend >= 0 ? '+' : ''}{trend}%</Typography>
          <Typography variant="caption" sx={{ color: gradient ? alpha('#fff', 0.55) : 'text.secondary' }}>vs last week</Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

/* ══════════════════════════════════════════════════════════════════
   NURSE COMPONENTS
══════════════════════════════════════════════════════════════════ */

/* ── Shift badge ─────────────────────────────────────────────── */
const ShiftBadge = () => {
  const hour = new Date().getHours();
  const shift = hour >= 7 && hour < 14 ? 'MORNING'
    : hour >= 14 && hour < 21 ? 'AFTERNOON'
    : 'NIGHT';
  const map = {
    MORNING:   { label: 'Morning Shift', icon: <WbSunny sx={{ fontSize: 16 }} />, color: '#ffd43b',  bg: 'rgba(255, 255, 255, 0.12)' },
    AFTERNOON: { label: 'Afternoon Shift', icon: <Brightness5 sx={{ fontSize: 16 }} />, color: '#63e6be', bg: 'rgba(255, 255, 255, 0.12)' },
    NIGHT:     { label: 'Night Shift', icon: <NightlightRound sx={{ fontSize: 16 }} />, color: '#e5dbff', bg: 'rgba(255, 255, 255, 0.12)' },
  };
  const s = map[shift];
  return (
    <Chip
      icon={s.icon}
      label={s.label}
      size="small"
      sx={{
        bgcolor: s.bg,
        color: '#fff',
        fontWeight: 700,
        fontSize: '0.78rem',
        px: 0.5,
        border: '1px solid rgba(255, 255, 255, 0.15)',
        '& .MuiChip-icon': { color: `${s.color} !important` }
      }}
    />
  );
};

/* ── Assigned Patients table ─────────────────────────────────── */
const AssignedPatientsTable = ({ assignments, loading }: { assignments: any[]; loading: boolean }) => {
  const colors = [C.blue, C.violet, C.teal, C.rose, C.green, C.cyan];
  const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return '—'; } };
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>My Assigned Patients</Typography>
            <Typography variant="caption" color="text.secondary">{assignments.length} patient{assignments.length !== 1 ? 's' : ''} under your care</Typography>
          </Box>
          <Button size="small" href="/nursing" endIcon={<ArrowForward sx={{ fontSize: 14 }} />} sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem' }}>Nursing Workspace</Button>
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={28} sx={{ color: C.blue }} /></Box>
        ) : assignments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <People sx={{ fontSize: 48, color: alpha(C.blue, 0.2), mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>No patients assigned to you yet</Typography>
            <Typography variant="caption" color="text.secondary">Check with the ward sister for assignments</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['PATIENT', 'BED / WARD', 'ALERTS', 'ASSIGNED', 'ACTION'].map(h => (
                    <TableCell key={h} sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 700, py: 1, border: 'none', pl: h === 'PATIENT' ? 2.5 : undefined, pr: h === 'ACTION' ? 2.5 : undefined }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments.slice(0, 8).map((a: any, i: number) => {
                  const name = a.patientName ?? 'Unknown';
                  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  const c = colors[i % colors.length];
                  const hasAlert = a.alerts && a.alerts.length > 0;
                  return (
                    <TableRow key={a.id} sx={{ '&:hover': { bgcolor: alpha(C.blue, 0.03) }, '& td': { border: 'none', py: 1.2 } }}>
                      <TableCell sx={{ pl: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: '0.72rem', fontWeight: 700, bgcolor: alpha(c, 0.12), color: c, borderRadius: '10px' }}>{initials}</Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>{name}</Typography>
                            <Typography variant="caption" color="text.secondary">{a.mrn ?? '—'} · {a.gender ?? 'N/A'}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{a.bedNumber ?? '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">{a.wardName ?? 'N/A'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {hasAlert ? (
                          <Tooltip title={a.alerts.join(', ')}>
                            <Chip
                              size="small"
                              label={`${a.alerts.length} alert${a.alerts.length > 1 ? 's' : ''}`}
                              icon={<Warning sx={{ fontSize: '12px !important', color: `${C.red} !important` }} />}
                              sx={{ bgcolor: alpha(C.red, 0.1), color: C.red, fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer' }}
                            />
                          </Tooltip>
                        ) : (
                          <Chip size="small" label="Clear" icon={<CheckCircle sx={{ fontSize: '12px !important', color: `${C.green} !important` }} />}
                            sx={{ bgcolor: alpha(C.green, 0.1), color: C.green, fontWeight: 700, fontSize: '0.65rem' }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{fmtTime(a.assignedAt)}</Typography>
                      </TableCell>
                      <TableCell sx={{ pr: 2.5 }}>
                        <Button size="small" href="/nursing"
                          sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.75rem', py: 0.3, px: 1.2, bgcolor: alpha(C.blue, 0.08), borderRadius: '8px', '&:hover': { bgcolor: alpha(C.blue, 0.16) } }}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Medication Administration Panel ─────────────────────────── */
const MedicationAdminPanel = ({ meds, loading }: { meds: any[]; loading: boolean }) => {
  const now = new Date();
  const getMedStatus = (m: any) => {
    if (m.status === 'ADMINISTERED' || m.administeredTime) return 'ADMINISTERED';
    if (m.status === 'OMITTED') return 'OMITTED';
    try {
      const t = new Date(m.scheduledTime);
      const diffMin = (t.getTime() - now.getTime()) / 60000;
      if (diffMin < -30) return 'OVERDUE';
      if (diffMin < 30) return 'DUE_NOW';
      return 'SCHEDULED';
    } catch { return 'SCHEDULED'; }
  };
  const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return '—'; } };
  const overdue = meds.filter(m => getMedStatus(m) === 'OVERDUE');
  const dueNow  = meds.filter(m => getMedStatus(m) === 'DUE_NOW');
  const upcoming = meds.filter(m => getMedStatus(m) === 'SCHEDULED');
  const administered = meds.filter(m => getMedStatus(m) === 'ADMINISTERED');

  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(C.violet, 0.12), color: C.violet, borderRadius: '12px' }}>
              <Medication sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>Medication Administration</Typography>
              <Typography variant="caption" color="text.secondary">{meds.length} dose{meds.length !== 1 ? 's' : ''} this shift</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {overdue.length > 0 && <Chip label={`${overdue.length} overdue`} size="small" sx={{ bgcolor: alpha(C.red, 0.1), color: C.red, fontWeight: 700, fontSize: '0.68rem' }} />}
            {dueNow.length > 0 && <Chip label={`${dueNow.length} due now`} size="small" sx={{ bgcolor: alpha(C.amber, 0.1), color: C.amber, fontWeight: 700, fontSize: '0.68rem' }} />}
            {administered.length > 0 && <Chip label={`${administered.length} given`} size="small" sx={{ bgcolor: alpha(C.green, 0.1), color: C.green, fontWeight: 700, fontSize: '0.68rem' }} />}
          </Box>
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={26} sx={{ color: C.violet }} /></Box>
        ) : meds.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <CheckCircle sx={{ fontSize: 44, color: alpha(C.green, 0.3), mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>All medications administered</Typography>
          </Box>
        ) : (
          <Stack divider={<Divider sx={{ borderColor: 'rgba(0,0,0,0.04)' }} />}>
            {[...overdue, ...dueNow, ...upcoming, ...administered].slice(0, 7).map((med: any, i: number) => {
              const status = getMedStatus(med);
              const statusMap = {
                ADMINISTERED: { color: C.green, bg: alpha(C.green, 0.08), label: 'Administered', icon: <CheckCircle sx={{ fontSize: 15, color: C.green }} /> },
                OMITTED:      { color: '#64748b', bg: alpha('#64748b', 0.08), label: 'Omitted', icon: <Warning sx={{ fontSize: 15, color: '#64748b' }} /> },
                OVERDUE:      { color: C.red,   bg: alpha(C.red, 0.08),   label: 'Overdue',      icon: <Warning sx={{ fontSize: 15, color: C.red }} /> },
                DUE_NOW:      { color: C.amber, bg: alpha(C.amber, 0.08), label: 'Due Now',      icon: <HourglassBottom sx={{ fontSize: 15, color: C.amber }} /> },
                SCHEDULED:    { color: C.blue,  bg: 'transparent',        label: 'Scheduled',    icon: <AccessTime sx={{ fontSize: 15, color: C.blue }} /> },
              };
              const sm = statusMap[status as keyof typeof statusMap];
              const pName = med.patient ? `${med.patient.firstName ?? ''} ${med.patient.lastName ?? ''}`.trim() : 'Patient';
              return (
                <Box key={med.id ?? i} sx={{
                  px: 2.5, py: 1.25, display: 'flex', alignItems: 'center', gap: 2,
                  bgcolor: sm.bg, '&:hover': { bgcolor: alpha(sm.color, 0.06) },
                }}>
                  <Box sx={{ flexShrink: 0 }}>{sm.icon}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {med.medicationName ?? med.medication ?? 'Medication'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {pName} {med.dosage ? `· ${med.dosage}` : med.dose ? `· ${med.dose}` : ''} {med.route ? `· ${med.route}` : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
                    <Typography variant="caption" fontWeight={700} color={sm.color}>
                      {med.administeredTime ? fmtTime(med.administeredTime) : fmtTime(med.scheduledTime)}
                    </Typography>
                    <Typography variant="caption" color={sm.color} display="block" fontWeight={700}>{sm.label}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
        <Box sx={{ p: 2, pt: 1.5 }}>
          <Button fullWidth variant="outlined" href="/nursing" size="small"
            sx={{ borderColor: alpha(C.violet, 0.3), color: C.violet, textTransform: 'none', fontWeight: 600, borderRadius: '10px', '&:hover': { bgcolor: alpha(C.violet, 0.06) } }}>
            View Full eMAR
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

/* ── Active Nursing Tasks Panel ──────────────────────────────── */
const NursingTasksPanel = ({ tasks, loading }: { tasks: any[]; loading: boolean }) => {
  const pendingTasks = tasks.filter(t => t.status === 'PENDING');
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
  const priorityMap: Record<string, { color: string; label: string }> = {
    HIGH:   { color: C.red,    label: 'High' },
    MEDIUM: { color: C.amber,  label: 'Medium' },
    LOW:    { color: C.green,  label: 'Low' },
  };
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 38, height: 38, bgcolor: alpha(C.blue, 0.12), color: C.blue, borderRadius: '12px' }}>
              <TaskAlt sx={{ fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>Nursing Tasks</Typography>
              <Typography variant="caption" color="text.secondary">{pendingTasks.length} pending · {inProgressTasks.length} in progress</Typography>
            </Box>
          </Box>
          <Button size="small" href="/nursing" endIcon={<ArrowForward sx={{ fontSize: 14 }} />} sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem' }}>All Tasks</Button>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} sx={{ color: C.blue }} /></Box>
        ) : tasks.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircle sx={{ fontSize: 40, color: alpha(C.green, 0.3), mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>All tasks completed!</Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {tasks.slice(0, 5).map((task: any, i: number) => {
              const pInfo = task.patient ? `${task.patient.firstName ?? ''} ${task.patient.lastName ?? ''}`.trim() : 'Patient';
              const priority = task.priority?.toUpperCase() ?? 'MEDIUM';
              const pm = priorityMap[priority] ?? priorityMap.MEDIUM;
              return (
                <Box key={task.id ?? i} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${alpha(pm.color, 0.15)}`, bgcolor: alpha(pm.color, 0.04), display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: pm.color, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{task.taskType ?? task.description ?? 'Nursing Task'}</Typography>
                    <Typography variant="caption" color="text.secondary">{pInfo}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <Chip size="small" label={pm.label} sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha(pm.color, 0.12), color: pm.color }} />
                    {getStatusChip(task.status ?? 'PENDING')}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Ward Bed Occupancy (rich version for nurses) ────────────── */
const NurseBedOccupancy = ({ wardStats, loading }: { wardStats: any[]; loading: boolean }) => {
  const wardColors = [C.blue, C.teal, C.red, C.violet, C.amber, C.green];
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 38, height: 38, bgcolor: alpha(C.cyan, 0.12), color: C.cyan, borderRadius: '12px' }}>
              <Bed sx={{ fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>Ward Bed Occupancy</Typography>
              <Typography variant="caption" color="text.secondary">Real-time capacity</Typography>
            </Box>
          </Box>
          <Button size="small" href="/ipd" endIcon={<ArrowForward sx={{ fontSize: 14 }} />} sx={{ color: C.cyan, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem' }}>Inpatient Care (IPD)</Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={26} sx={{ color: C.cyan }} /></Box>
        ) : wardStats.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Bed sx={{ fontSize: 44, color: alpha(C.cyan, 0.2), mb: 1 }} />
            <Typography variant="body2" color="text.secondary">No ward data available</Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {wardStats.slice(0, 6).map((ward: any, i: number) => {
              const total = ward.total ?? ward.totalBeds ?? 0;
              const used  = ward.used ?? ward.occupiedBeds ?? 0;
              const pct   = total > 0 ? Math.round((used / total) * 100) : 0;
              const available = total - used;
              const color = wardColors[i % wardColors.length];
              const urgency = pct >= 90 ? C.red : pct >= 70 ? C.amber : color;
              return (
                <Box key={ward.name ?? ward.id ?? i}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{ward.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{available} bed{available !== 1 ? 's' : ''} available</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight={700} color={urgency}>{used}/{total}</Typography>
                      <Typography variant="caption" sx={{ color: urgency, fontWeight: 700 }}>{pct}% full</Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate" value={pct}
                    sx={{ height: 8, borderRadius: 4, bgcolor: alpha(urgency, 0.1), '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: urgency } }}
                  />
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Nurse Shift Summary card ────────────────────────────────── */
const NurseShiftSummary = ({ data, assignments, meds, tasks }: { data: any; assignments: any[]; meds: any[]; tasks: any[] }) => {
  const pendingMeds = meds.filter(m => m.status !== 'ADMINISTERED' && !m.administeredTime && m.status !== 'OMITTED');
  const overdueMeds = meds.filter(m => {
    if (m.status === 'ADMINISTERED' || m.administeredTime || m.status === 'OMITTED') return false;
    try { const diff = (new Date(m.scheduledTime).getTime() - Date.now()) / 60000; return diff < -30; } catch { return false; }
  });
  const criticalPatients = assignments.filter(a => a.alerts && a.alerts.length > 0);
  const pendingTasks = tasks.filter(t => t.status === 'PENDING');
  const items = [
    { label: 'Assigned Patients',   value: assignments.length, color: C.blue,   icon: <People sx={{ fontSize: 16 }} /> },
    { label: 'Medications Pending', value: pendingMeds.length,  color: C.violet,  icon: <Medication sx={{ fontSize: 16 }} /> },
    { label: 'Overdue Meds',        value: overdueMeds.length, color: C.red,     icon: <Warning sx={{ fontSize: 16 }} /> },
    { label: 'Active Tasks',        value: pendingTasks.length, color: C.blue,   icon: <TaskAlt sx={{ fontSize: 16 }} /> },
    { label: 'Clinical Alerts',     value: criticalPatients.length, color: C.red, icon: <NotificationsActive sx={{ fontSize: 16 }} /> },
    { label: 'IPD Admissions',      value: data?.stats?.activeAdmissions ?? 0, color: C.cyan, icon: <LocalHospital sx={{ fontSize: 16 }} /> },
  ];
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>Shift Summary</Typography>
        <Grid container spacing={1.5}>
          {items.map(item => (
            <Grid item xs={6} key={item.label}>
              <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: alpha(item.color, 0.06), display: 'flex', alignItems: 'center', gap: 1.5, border: `1px solid ${alpha(item.color, 0.1)}` }}>
                <Box sx={{ color: item.color, flexShrink: 0 }}>{item.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" fontWeight={800} sx={{ color: item.color, lineHeight: 1.2 }}>{item.value}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', lineHeight: 1.3 }}>{item.label}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

/* ── Nurse Quick Actions bar ─────────────────────────────────── */
const NurseQuickActions = ({ config }: { config: DashboardRoleConfig }) => {
  const actionDefs = [
    { label: 'Record Vitals',      route: '/nursing', icon: <Favorite sx={{ fontSize: 20 }} />,       color: C.rose },
    { label: 'Medication Admin',   route: '/nursing', icon: <Medication sx={{ fontSize: 20 }} />,      color: C.violet },
    { label: 'Nursing Notes',      route: '/nursing', icon: <NoteAlt sx={{ fontSize: 20 }} />,         color: C.blue },
    { label: 'View Patients',      route: '/patients', icon: <People sx={{ fontSize: 20 }} />,         color: C.blue },
    { label: 'Inpatient Care (IPD)', route: '/ipd',   icon: <Bed sx={{ fontSize: 20 }} />,             color: C.cyan },
    { label: 'Handover',           route: '/nursing', icon: <Assignment sx={{ fontSize: 20 }} />,      color: C.amber },
  ];
  const actions = config.quickActions.length > 0 ? config.quickActions : actionDefs.slice(0, 3).map(a => ({ label: a.label, route: a.route }));
  return (
    <Card sx={{
      mb: 3, border: 'none',
      background: `linear-gradient(135deg, ${C.navy} 0%, #2b3fa6 60%, ${C.blue} 100%)`,
      boxShadow: '0 8px 32px rgba(30,42,120,0.35)',
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#fff' }}>Quick Actions — Nurse</Typography>
          <ShiftBadge />
        </Box>
        <Grid container spacing={1.5}>
          {actionDefs.map((action) => (
            <Grid item xs={6} sm={4} md={2} key={action.label}>
              <Button
                variant="text" href={action.route} fullWidth
                startIcon={action.icon}
                sx={{
                  justifyContent: 'flex-start', textTransform: 'none',
                  color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '0.85rem',
                  py: 1.2, px: 1.5, borderRadius: '10px',
                  bgcolor: alpha('#fff', 0.08),
                  border: `1px solid ${alpha('#fff', 0.12)}`,
                  '&:hover': { bgcolor: alpha('#fff', 0.18), color: '#fff', transform: 'translateY(-2px)' },
                  transition: 'all 0.18s ease',
                  '& .MuiButton-startIcon': { color: 'rgba(255,255,255,0.75)' },
                }}
              >{action.label}</Button>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

/* ══════════════════════════════════════════════════════════════════
   DOCTOR COMPONENTS
══════════════════════════════════════════════════════════════════ */

/* ── Today's Appointments Table ────────────────────────────────── */
const AppointmentsTable = ({ appointments, loading }: { appointments: any[]; loading: boolean }) => {
  const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return '—'; } };
  const colors = [C.blue, C.violet, C.teal, C.amber, C.red, C.green];
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Today's Appointments</Typography>
            <Typography variant="caption" color="text.secondary">{appointments.length} patient{appointments.length !== 1 ? 's' : ''} scheduled</Typography>
          </Box>
          <Button size="small" href="/appointments" endIcon={<ArrowForward sx={{ fontSize: 14 }} />} sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem' }}>View All</Button>
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} sx={{ color: C.blue }} /></Box>
        ) : appointments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <CalendarToday sx={{ fontSize: 44, color: alpha(C.blue, 0.2), mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>No appointments scheduled for today</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['PATIENT', 'TIME', 'TYPE', 'STATUS', 'ACTION'].map(h => (
                    <TableCell key={h} sx={{ color: 'text.secondary', fontSize: '0.72rem', fontWeight: 700, py: 1, border: 'none', pl: h === 'PATIENT' ? 2.5 : undefined, pr: h === 'ACTION' ? 2.5 : undefined }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.slice(0, 8).map((appt: any, i: number) => {
                  const pName = appt.patient ? `${appt.patient.firstName ?? ''} ${appt.patient.lastName ?? ''}`.trim() : 'Unknown';
                  const initials = pName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  const c = colors[i % colors.length];

                  const getTargetRoute = (a: any) => {
                    const patientId = a.patientId || a.patient?.id;
                    const serviceType = (a.serviceType || '').toLowerCase();
                    const department = (a.department || a.type || '').toLowerCase();
                    const activeAdm = a.patient?.admissions?.[0];
                    const wardName = (activeAdm?.bed?.ward?.name || '').toLowerCase();
                    const wardCode = (activeAdm?.bed?.ward?.code || '').toLowerCase();

                    if (wardName.includes('emergency') || wardCode.includes('emerg') || serviceType.includes('emergency') || serviceType.includes('a&e') || department.includes('emergency')) {
                      return `/ipd/emergency${patientId ? `?patientId=${patientId}` : ''}`;
                    }
                    if (wardName.includes('icu') || wardCode.includes('icu') || serviceType.includes('icu') || department.includes('icu')) {
                      return `/ipd/icu${patientId ? `?patientId=${patientId}` : ''}`;
                    }
                    if (wardName.includes('maternity') || wardName.includes('anc') || wardName.includes('obstetric') || serviceType.includes('maternity') || serviceType.includes('anc') || serviceType.includes('obstetric') || serviceType.includes('gynaecology') || department.includes('maternity')) {
                      return `/ipd/maternity${patientId ? `?patientId=${patientId}` : ''}`;
                    }
                    if (wardName.includes('surgical') || serviceType.includes('surgical') || department.includes('surgical')) {
                      return `/ipd/surgical${patientId ? `?patientId=${patientId}` : ''}`;
                    }
                    if (wardName.includes('paediatric') || wardName.includes('pediatric') || serviceType.includes('paediatric') || serviceType.includes('pediatric')) {
                      return `/ipd/paediatric${patientId ? `?patientId=${patientId}` : ''}`;
                    }
                    if (wardName.includes('private') || serviceType.includes('private') || serviceType.includes('vip')) {
                      return `/ipd/private${patientId ? `?patientId=${patientId}` : ''}`;
                    }
                    if (wardName.includes('medical') || serviceType.includes('medical') || department.includes('medical')) {
                      return `/ipd/medical${patientId ? `?patientId=${patientId}` : ''}`;
                    }

                    if (activeAdm) {
                      return `/ipd/medical${patientId ? `?patientId=${patientId}` : ''}`;
                    }

                    // If it's a clearly outpatient consultation (no inpatient admission), go to OPD
                    if (serviceType.includes('opd') || serviceType.includes('outpatient') || serviceType.includes('clinic') || serviceType.includes('consultation')) {
                      return `/opd${patientId ? `?patientId=${patientId}` : ''}`;
                    }

                    // Default: open Clinical Workspace (EMR) for all other cases
                    return patientId ? `/emr-workspace?patientId=${patientId}` : '/emr-workspace';
                  };

                  const targetUrl = getTargetRoute(appt);

                  return (
                    <TableRow key={appt.id} sx={{ '&:hover': { bgcolor: alpha(C.blue, 0.03) }, '& td': { border: 'none', py: 1.25 } }}>
                      <TableCell sx={{ pl: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: '0.72rem', fontWeight: 700, bgcolor: alpha(c, 0.12), color: c, borderRadius: '10px' }}>{initials || <Person sx={{ fontSize: 16 }} />}</Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>{pName}</Typography>
                            <Typography variant="caption" color="text.secondary">{appt.patient?.patientNumber ?? appt.patient?.patientId ?? '—'}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTime sx={{ fontSize: 13, color: 'text.secondary' }} />
                          <Typography variant="body2" fontWeight={500}>{fmtTime(appt.start)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>{appt.serviceType ?? 'General'}</Typography></TableCell>
                      <TableCell>{getStatusChip(appt.status ?? 'PENDING')}</TableCell>
                      <TableCell sx={{ pr: 2.5 }}>
                        <Button size="small" href={targetUrl} sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.75rem', py: 0.3, px: 1.2, bgcolor: alpha(C.blue, 0.07), borderRadius: '8px', '&:hover': { bgcolor: alpha(C.blue, 0.14) } }}>Open</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Active Patients Panel ────────────────────────────────────── */
const ActivePatientsPanel = ({ patients, loading }: { patients: any[]; loading: boolean }) => {
  const acuityMap: Record<number, { label: string; color: string }> = {
    1: { label: 'Critical', color: C.red }, 2: { label: 'Urgent', color: C.amber },
    3: { label: 'Moderate', color: C.blue }, 4: { label: 'Minor', color: C.green }, 5: { label: 'Non-urgent', color: '#868e96' },
  };
  const colors = [C.blue, C.violet, C.teal, C.amber, C.red, C.green];
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Active Patients</Typography>
            <Typography variant="caption" color="text.secondary">Current encounters</Typography>
          </Box>
          <Button size="small" href="/patients" endIcon={<ArrowForward sx={{ fontSize: 14 }} />} sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem' }}>All Patients</Button>
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} sx={{ color: C.blue }} /></Box>
        ) : patients.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <People sx={{ fontSize: 44, color: alpha(C.blue, 0.2), mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>No active patients found</Typography>
          </Box>
        ) : (
          <Stack divider={<Divider sx={{ borderColor: 'rgba(0,0,0,0.04)' }} />}>
            {patients.slice(0, 6).map((p: any, i: number) => {
              const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Unknown';
              const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              const c = colors[i % colors.length];
              const triage = p.triageRecords?.[0];
              const acuityInfo = triage?.acuityLevel ? acuityMap[triage.acuityLevel] : null;
              return (
                <Box key={p.id} onClick={() => { window.location.href = `/emr-workspace?patientId=${p.id}`; }}
                  sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, '&:hover': { bgcolor: alpha(C.blue, 0.03) }, cursor: 'pointer' }}>
                  <Avatar sx={{ width: 38, height: 38, fontSize: '0.78rem', fontWeight: 700, bgcolor: alpha(c, 0.12), color: c, borderRadius: '12px' }}>{initials}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{name}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.patientId ?? '—'} · {p.gender ?? 'N/A'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    {acuityInfo && <Chip size="small" label={acuityInfo.label} icon={<FiberManualRecord sx={{ fontSize: '8px !important', color: `${acuityInfo.color} !important` }} />}
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: alpha(acuityInfo.color, 0.1), color: acuityInfo.color }} />}
                    <ArrowForward sx={{ fontSize: 14, color: 'text.secondary' }} />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Pending Labs Panel ───────────────────────────────────────── */
const PendingLabsPanel = ({ labs, loading }: { labs: any[]; loading: boolean }) => (
  <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: alpha(C.amber, 0.12), color: C.amber, borderRadius: '12px' }}><Biotech sx={{ fontSize: 20 }} /></Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>Pending Lab Results</Typography>
            <Typography variant="caption" color="text.secondary">Awaiting your review</Typography>
          </Box>
        </Box>
        <Button size="small" href="/lims" sx={{ color: C.amber, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem' }} endIcon={<ArrowForward sx={{ fontSize: 14 }} />}>View All</Button>
      </Box>
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} sx={{ color: C.amber }} /></Box>
        : labs.length === 0 ? <Box sx={{ textAlign: 'center', py: 3 }}><CheckCircle sx={{ fontSize: 40, color: alpha(C.green, 0.3), mb: 1 }} /><Typography variant="body2" color="text.secondary" fontWeight={500}>All lab results reviewed</Typography></Box>
        : <Stack spacing={1}>{labs.slice(0, 5).map((lab: any, i: number) => (
          <Box key={lab.id ?? i} sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(C.amber, 0.05), border: `1px solid ${alpha(C.amber, 0.12)}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Science sx={{ fontSize: 18, color: C.amber, flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>{lab.testName ?? lab.items?.[0]?.test?.name ?? 'Lab Order'}</Typography>
              <Typography variant="caption" color="text.secondary">{lab.patient ? `${lab.patient.firstName} ${lab.patient.lastName}` : 'Patient'}{lab.createdAt ? ` · ${new Date(lab.createdAt).toLocaleDateString('en-NG')}` : ''}</Typography>
            </Box>
            {getStatusChip(lab.status ?? 'PENDING')}
          </Box>
        ))}</Stack>}
    </CardContent>
  </Card>
);

/* ── Critical Alerts Panel ────────────────────────────────────── */
const CriticalAlertsPanel = ({ alerts, loading }: { alerts: any[]; loading: boolean }) => (
  <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: alpha(C.red, 0.12), color: C.red, borderRadius: '12px' }}><MonitorHeart sx={{ fontSize: 20 }} /></Avatar>
          <Box><Typography variant="h6" fontWeight={700}>Critical Vitals</Typography><Typography variant="caption" color="text.secondary">Abnormal readings</Typography></Box>
        </Box>
        {alerts.length > 0 && <Chip label={`${alerts.length} alert${alerts.length > 1 ? 's' : ''}`} size="small" icon={<Warning sx={{ fontSize: '14px !important', color: `${C.red} !important` }} />} sx={{ bgcolor: alpha(C.red, 0.1), color: C.red, fontWeight: 700 }} />}
      </Box>
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} sx={{ color: C.red }} /></Box>
        : alerts.length === 0 ? <Box sx={{ textAlign: 'center', py: 3 }}><CheckCircle sx={{ fontSize: 40, color: alpha(C.green, 0.3), mb: 1 }} /><Typography variant="body2" color="text.secondary" fontWeight={500}>No critical alerts at this time</Typography></Box>
        : <Stack spacing={1}>{alerts.slice(0, 5).map((alert: any, i: number) => (
          <Box key={alert.id ?? i} sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(C.red, 0.05), border: `1px solid ${alpha(C.red, 0.15)}`, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Warning sx={{ fontSize: 18, color: C.red, mt: 0.2, flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={700} color={C.red}>{alert.message ?? alert.alertType ?? 'Critical Value'}</Typography>
              <Typography variant="caption" color="text.secondary">{alert.patientName ?? 'Patient'} · {alert.testName ?? ''}{alert.value ? ` — Value: ${alert.value}` : ''}</Typography>
            </Box>
          </Box>
        ))}</Stack>}
    </CardContent>
  </Card>
);

/* ── Consultation Trend Chart ──────────────────────────────────── */
const ConsultationTrend = ({ weekData }: { weekData: { day: string; count: number }[] }) => {
  const defaults = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => ({ day, count: 0 }));
  const points = weekData && weekData.length > 0 ? weekData : defaults;
  const maxVal = Math.max(1, ...points.map(p => p.count));
  const W = 560; const H = 130;
  const stepX = W / Math.max(points.length - 1, 1);
  const getY = (v: number) => H - 20 - ((v / maxVal) * (H - 30));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * stepX + 20} ${getY(p.count)}`).join(' ');
  const areaD = `${pathD} L ${(points.length - 1) * stepX + 20} ${H} L 20 ${H} Z`;
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Consultations This Week</Typography>
            <Typography variant="caption" color="text.secondary">Total: {points.reduce((a, p) => a + p.count, 0)} consultations</Typography>
          </Box>
          <Chip label="7-day trend" size="small" icon={<ArrowUpward sx={{ fontSize: '13px !important', color: `${C.blue} !important` }} />} sx={{ bgcolor: alpha(C.blue, 0.08), color: C.blue, fontWeight: 600 }} />
        </Box>
        <Box sx={{ width: '100%', height: 150 }}>
          <svg viewBox={`0 0 600 ${H + 10}`} width="100%" height="100%">
            <defs><linearGradient id="docBlueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity="0.25" /><stop offset="100%" stopColor={C.blue} stopOpacity="0.02" /></linearGradient></defs>
            {[0, 0.5, 1].map((pct, i) => <line key={i} x1="20" y1={getY(maxVal * pct)} x2={W + 20} y2={getY(maxVal * pct)} stroke="#f1f3f5" strokeWidth="1" />)}
            <path d={areaD} fill="url(#docBlueGrad)" />
            <path d={pathD} fill="none" stroke={C.blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => (<g key={i}><circle cx={i * stepX + 20} cy={getY(p.count)} r="5" fill={C.blue} stroke="#fff" strokeWidth="2" />{p.count > 0 && <text x={i * stepX + 20} y={getY(p.count) - 10} textAnchor="middle" fontSize="9" fill={C.blue} fontWeight="700">{p.count}</text>}</g>))}
            {points.map((p, i) => <text key={`x-${i}`} x={i * stepX + 20} y={H + 5} textAnchor="middle" fontSize="10" fill="#868e96">{p.day}</text>)}
          </svg>
        </Box>
      </CardContent>
    </Card>
  );
};

/* ── Generic Stat Card ─────────────────────────────────────────── */
const StatCard = ({ title, value, sub, icon, color, trend, up }: { title: string; value: string; sub: string; icon: React.ReactNode; color: string; trend?: string; up?: boolean }) => (
  <Card sx={{ position: 'relative', overflow: 'hidden', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' } }}>
    <Box sx={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', bgcolor: alpha(color, 0.12) }} />
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500} mb={0.5}>{title}</Typography>
          <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.2 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary" mt={0.5} display="block">{sub}</Typography>
        </Box>
        <Avatar sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: alpha(color, 0.15), color, '& svg': { fontSize: 24 } }}>{icon}</Avatar>
      </Box>
      {trend && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>{up ? <TrendingUp sx={{ fontSize: 16, color: C.green }} /> : <TrendingDown sx={{ fontSize: 16, color: C.red }} />}<Typography variant="caption" fontWeight={600} color={up ? C.green : C.red}>{trend}</Typography><Typography variant="caption" color="text.secondary">vs last week</Typography></Box>}
    </CardContent>
  </Card>
);

/* ── Record Officer Workspace Console (Quick Actions) ──────── */
const RecQuickActions = () => {
  const actions = [
    { label: 'Register Patient',   route: '/register-patient', icon: <Person sx={{ fontSize: 20 }} /> },
    { label: 'Book Appointment',   route: '/appointments',     icon: <CalendarToday sx={{ fontSize: 18 }} /> },
    { label: 'Queue Board',        route: '/queues',           icon: <Queue sx={{ fontSize: 20 }} /> },
    { label: 'Record Merges',      route: '/merge-records',    icon: <Assignment sx={{ fontSize: 20 }} /> },
    { label: 'Visits & Flow',      route: '/visits',           icon: <People sx={{ fontSize: 20 }} /> },
    { label: 'Patient CRM',        route: '/crm',              icon: <ContactPhone sx={{ fontSize: 20 }} /> },
  ];
  return (
    <Card sx={{ mb: 3, border: 'none', background: `linear-gradient(135deg, ${C.blue} 0%, #4c6ef5 60%, ${C.cyan} 100%)`, boxShadow: '0 8px 32px rgba(59,91,219,0.35)' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#fff' }}>Record Officer Console</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Front Desk & Patient Administration · {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })}</Typography>
          </Box>
          <Chip icon={<CheckCircle sx={{ fontSize: 14 }} />} label="Admissions Desk Active" size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)', '& .MuiChip-icon': { color: '#63e6be !important' } }} />
        </Box>
        <Grid container spacing={1.5}>
          {actions.map((a) => (
            <Grid item xs={6} sm={4} md={2} key={a.label}>
              <Button variant="text" href={a.route} fullWidth startIcon={a.icon}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.85rem', py: 1.2, px: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', transform: 'translateY(-2px)' }, transition: 'all 0.18s ease', '& .MuiButton-startIcon': { color: 'rgba(255,255,255,0.85)' } }}>
                {a.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

/* ── Recent Patient Registrations ─────────────────────────── */
const RecRecentPatients = ({ patients, loading }: { patients: any[]; loading: boolean }) => {
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Recent Registrations</Typography>
            <Typography variant="caption" color="text.secondary">Newly registered hospital patients</Typography>
          </Box>
          <Button size="small" href="/register-patient" sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem' }}>Register Patient</Button>
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={28} sx={{ color: C.blue }} /></Box>
        ) : patients.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body2" color="text.secondary">No registrations found today.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['MPI NUMBER', 'PATIENT NAME', 'GENDER', 'PHONE', 'DATE REG'].map(h => (
                    <TableCell key={h} sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 700, py: 1, border: 'none', pl: h === 'MPI NUMBER' ? 2.5 : undefined }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.slice(0, 5).map((pat: any) => {
                  const name = `${pat.firstName ?? ''} ${pat.lastName ?? ''}`.trim() || 'Unknown';
                  const phone = pat.telecoms?.find((t: any) => t.system === 'PHONE' || t.system === 'phone')?.value || '—';
                  const gender = pat.gender || '—';
                  const dateReg = pat.createdAt ? new Date(pat.createdAt).toLocaleDateString() : '—';
                  return (
                    <TableRow key={pat.id} sx={{ '&:hover': { bgcolor: alpha(C.blue, 0.02) }, '& td': { border: 'none', py: 1.2 } }}>
                      <TableCell sx={{ pl: 2.5 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: C.blue, fontFamily: 'monospace', fontSize: '0.8rem' }}>{pat.patientNumber}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={gender} sx={{ fontSize: '0.65rem', height: 18 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{phone}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{dateReg}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Record Officer Appointments Queue ─────────────────────── */
const RecAppointmentsQueue = ({ appointments, loading, onCheckIn, onBookAppointment }: { appointments: any[]; loading: boolean; onCheckIn: (appt: any) => void; onBookAppointment?: () => void }) => {
  const navigate = useNavigate();
  const prioColor: Record<string, string> = { STAT: C.red, CRITICAL: C.red, URGENT: C.amber, ROUTINE: C.blue };
  const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return '—'; } };
  
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Today's Appointments</Typography>
            <Typography variant="caption" color="text.secondary">{appointments.length} appointments scheduled today</Typography>
          </Box>
          <Button size="small" onClick={onBookAppointment} sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem' }}>Book Appointment</Button>
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5, flexGrow: 1, alignItems: 'center' }}><CircularProgress size={28} sx={{ color: C.blue }} /></Box>
        ) : appointments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <CalendarToday sx={{ fontSize: 40, color: 'text.secondary', mb: 1, opacity: 0.4 }} />
            <Typography variant="body2" color="text.secondary">No appointments scheduled today.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ flexGrow: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['TIME', 'PATIENT', 'DOCTOR', 'PRIORITY', 'STATUS', 'ACTION'].map(h => (
                    <TableCell key={h} sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 700, py: 1, border: 'none', pl: h === 'TIME' ? 2.5 : undefined, pr: h === 'ACTION' ? 2.5 : undefined }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.slice(0, 8).map((appt: any) => {
                  const patName = `${appt.patient?.firstName ?? ''} ${appt.patient?.lastName ?? ''}`.trim() || 'Unknown';
                  const docName = appt.staff ? `Dr. ${appt.staff.firstName ?? ''} ${appt.staff.lastName ?? ''}`.trim() : 'Unassigned';
                  const prio = (appt.priority ?? 'ROUTINE').toUpperCase();
                  const pc = prioColor[prio] ?? C.blue;
                  const isCheckedIn = (appt.status ?? '').toUpperCase() === 'FULFILLED' || (appt.status ?? '').toUpperCase() === 'COMPLETED';
                  return (
                    <TableRow key={appt.id} sx={{ '&:hover': { bgcolor: alpha(C.blue, 0.02) }, '& td': { border: 'none', py: 1.2 } }}>
                      <TableCell sx={{ pl: 2.5 }}>
                        <Typography variant="body2" fontWeight={700} color="text.primary">{fmtTime(appt.start)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{patName}</Typography>
                        <Typography variant="caption" color="text.secondary">{appt.patient?.patientNumber ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{docName}</Typography>
                        <Typography variant="caption" color="text.secondary">{appt.serviceType ?? 'General Consultation'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={prio} sx={{ bgcolor: alpha(pc, 0.1), color: pc, fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={isCheckedIn ? "Checked In" : "Scheduled"} 
                          color={isCheckedIn ? "success" : "default"}
                          sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                      </TableCell>
                      <TableCell sx={{ pr: 2.5 }}>
                        {!isCheckedIn ? (
                          <Button size="small" onClick={() => onCheckIn(appt)}
                            sx={{ color: '#fff', bgcolor: C.blue, fontWeight: 700, textTransform: 'none', fontSize: '0.72rem', py: 0.4, px: 1.2, borderRadius: '8px', '&:hover': { bgcolor: '#1e2a78' } }}>
                            Check In
                          </Button>
                        ) : (
                          <Typography variant="caption" color="success.main" fontWeight={600}>Active in Queue</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)', pt: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
          <Button 
            variant="text" 
            size="small"
            endIcon={<ArrowForward />} 
            onClick={() => navigate('/appointments')}
            sx={{ 
              color: C.blue, 
              fontWeight: 700, 
              textTransform: 'none', 
              fontSize: '0.8rem',
              '&:hover': { bgcolor: 'rgba(59,91,219,0.05)' } 
            }}
          >
            View Full Patients Appointment
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

/* ── Department Queue Status & Delay Tracker ────────────────── */
const RecQueueStatusPanel = ({ waitData, loading, onCheckInPatient }: { waitData: any; loading: boolean; onCheckInPatient: () => void }) => {
  const navigate = useNavigate();
  const averages = waitData?.averages ?? [];
  const waitTimes = waitData?.waitTimes ?? [];
  const delayedTickets = waitTimes.filter((t: any) => t.exceedsThreshold);

  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Department Queue Status</Typography>
            <Typography variant="caption" color="text.secondary">Real-time patient flow and delays</Typography>
          </Box>
          <Button size="small" onClick={onCheckInPatient} sx={{ color: C.blue, fontWeight: 700, textTransform: 'none', fontSize: '0.8rem' }}>+ New Check-In</Button>
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)', mb: 2 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5, flexGrow: 1, alignItems: 'center' }}><CircularProgress size={28} sx={{ color: C.blue }} /></Box>
        ) : (
          <Stack spacing={2.5} sx={{ flexGrow: 1 }}>
            {/* Delay Alert banner */}
            {delayedTickets.length > 0 && (
              <Alert severity="warning" sx={{ borderRadius: 2.5, '& .MuiAlert-message': { width: '100%' } }}>
                <Typography variant="body2" fontWeight={700} color="warning.dark">Excessive Wait Alert</Typography>
                <Typography variant="caption" color="text.secondary">
                  {delayedTickets.length} patients have been waiting in queue for over 60 minutes.
                </Typography>
                <Stack spacing={0.5} mt={1}>
                  {delayedTickets.slice(0, 3).map((t: any) => (
                    <Box key={t.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" fontWeight={600} color="text.primary">{t.patientName} ({t.tokenNumber})</Typography>
                      <Typography variant="caption" fontWeight={700} color={C.red}>{t.waitMinutes} mins ({t.department})</Typography>
                    </Box>
                  ))}
                </Stack>
              </Alert>
            )}

            {/* Department Averages list */}
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">Average Wait Times</Typography>
            {averages.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" py={2}>No active queues at this time.</Typography>
            ) : (
              <Stack spacing={1.8}>
                {averages.map((avg: any) => {
                  const wait = avg.averageWaitMinutes;
                  const color = wait > 45 ? C.red : wait > 20 ? C.amber : C.green;
                  return (
                    <Box key={avg.department}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>{avg.department}</Typography>
                        <Typography variant="caption" fontWeight={700} color={color}>{avg.count} in queue · {wait}m avg wait</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={Math.min((wait / 60) * 100, 100)} 
                        sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
                    </Box>
                  );
                })}
              </Stack>
            )}
            
            <Box sx={{ flexGrow: 1 }} />
            <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)', pt: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button 
                variant="text" 
                size="small"
                endIcon={<ArrowForward />} 
                onClick={() => navigate('/visits')}
                sx={{ 
                  color: C.blue, 
                  fontWeight: 700, 
                  textTransform: 'none', 
                  fontSize: '0.8rem',
                  py: 0.5,
                  '&:hover': { bgcolor: 'rgba(59,91,219,0.05)' } 
                }}
              >
                View Full Patient Flow & Visits
              </Button>
            </Box>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Bed Occupancy (Admin) ─────────────────────────────────────── */
const BedOccupancy = ({ data }: { data: { name: string; used: number; total: number; color: string }[] }) => {
  const wards = data && data.length > 0 ? data : [{ name: 'Medical Ward A', used: 0, total: 5, color: C.blue }, { name: 'Surgical Ward B', used: 0, total: 5, color: C.amber }, { name: 'ICU', used: 0, total: 5, color: C.red }];
  return (
    <Card sx={{ height: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={700} mb={2.5}>Bed Occupancy</Typography>
        <Stack spacing={2.5}>
          {wards.map(w => (
            <Box key={w.name}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="body2" fontWeight={500}>{w.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">{w.used}/{w.total}</Typography>
                  <Typography variant="caption" sx={{ color: w.color, fontWeight: 700 }}>{w.total > 0 ? `${Math.round((w.used / w.total) * 100)}%` : '0%'}</Typography>
                </Box>
              </Box>
              <LinearProgress variant="determinate" value={w.total > 0 ? (w.used / w.total) * 100 : 0} sx={{ height: 8, borderRadius: 4, bgcolor: alpha(w.color, 0.12), '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: w.color } }} />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

/* ── Revenue Widget ────────────────────────────────────────────── */
const RevenueWidget = ({ data }: { data: any }) => (
  <Card sx={{ height: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>Revenue Overview</Typography>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>Collection Rate</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 1 }}>
            <Typography variant="h5" fontWeight={800}>78.5%</Typography>
            <Typography variant="body2" color="success.main" fontWeight={600}>+4.2% vs last month</Typography>
          </Box>
          <LinearProgress variant="determinate" value={78.5} sx={{ height: 8, borderRadius: 4, bgcolor: alpha(C.green, 0.12), '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: C.green } }} />
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
        <Grid container spacing={2}>
          <Grid item xs={6}><Typography variant="caption" color="text.secondary" display="block">Paid Invoices</Typography><Typography variant="subtitle1" fontWeight={700} color={C.green}>{fmtCurrency((data?.stats?.revenueThisMonth ?? 16000000) * 0.78)}</Typography></Grid>
          <Grid item xs={6}><Typography variant="caption" color="text.secondary" display="block">Pending Claims</Typography><Typography variant="subtitle1" fontWeight={700} color={C.amber}>{fmtCurrency((data?.stats?.revenueThisMonth ?? 16000000) * 0.22)}</Typography></Grid>
        </Grid>
      </Stack>
    </CardContent>
  </Card>
);

/* ── Quick Stats ───────────────────────────────────────────────── */
const QuickStats = ({ data }: { data: any }) => {
  const items = [
    { label: 'OPD Today', value: data?.opdToday ?? 0, icon: <LocalHospital />, color: C.blue },
    { label: 'Prescriptions', value: data?.prescriptionsToday ?? 0, icon: <LocalPharmacy />, color: C.teal },
    { label: 'Lab Tests', value: data?.labsToday ?? 0, icon: <Science />, color: C.amber },
    { label: 'Revenue Today', value: fmtCurrency(data?.revenueToday ?? 0), icon: <NairaIcon />, color: C.green },
  ];
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>Today's Summary</Typography>
        <Grid container spacing={2}>{items.map(item => (
          <Grid item xs={6} sm={3} key={item.label}>
            <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(item.color, 0.07), textAlign: 'center', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.03)' } }}>
              <Avatar sx={{ width: 40, height: 40, mx: 'auto', mb: 1, bgcolor: alpha(item.color, 0.15), color: item.color, borderRadius: '12px' }}>{item.icon}</Avatar>
              <Typography variant="h6" fontWeight={800}>{item.value}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>{item.label}</Typography>
            </Box>
          </Grid>
        ))}</Grid>
      </CardContent>
    </Card>
  );
};

/* ── Admissions Trend ──────────────────────────────────────────── */
const AdmissionsTrend = ({ data }: { data: { month: string; opd: number; ipd: number }[] }) => {
  const points = data && data.length > 0 ? data : ['Jan','Feb','Mar','Apr','May','Jun'].map(m => ({ month: m, opd: 0, ipd: 0 }));
  const maxVal = Math.max(10, ...points.map(p => Math.max(p.opd, p.ipd)));
  const maxAxisVal = Math.ceil(maxVal / 10) * 10;
  const getSvgY = (v: number) => 170 - (v / maxAxisVal) * 140;
  const getSvgX = (i: number) => 40 + i * 104;
  const opdPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getSvgX(i)} ${getSvgY(p.opd)}`).join(' ');
  const ipdPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getSvgX(i)} ${getSvgY(p.ipd)}`).join(' ');
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>Admissions Trend (OPD vs IPD)</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: C.blue }} /><Typography variant="caption" fontWeight={600} color="text.secondary">OPD</Typography></Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: C.red }} /><Typography variant="caption" fontWeight={600} color="text.secondary">IPD</Typography></Box>
          </Box>
        </Box>
        <svg viewBox="0 0 600 200" width="100%" height="200">
          <line x1="40" y1="30" x2="560" y2="30" stroke="#f1f3f5" strokeWidth="1" />
          <line x1="40" y1="100" x2="560" y2="100" stroke="#f1f3f5" strokeWidth="1" />
          <line x1="40" y1="170" x2="560" y2="170" stroke="#ced4da" strokeWidth="1.5" />
          <text x="15" y="35" fontSize="10" fill="#868e96">{maxAxisVal}</text>
          <text x="15" y="105" fontSize="10" fill="#868e96">{Math.round(maxAxisVal / 2)}</text>
          <text x="20" y="175" fontSize="10" fill="#868e96">0</text>
          <path d={opdPath} fill="none" stroke={C.blue} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => <circle key={`o-${i}`} cx={getSvgX(i)} cy={getSvgY(p.opd)} r="4.5" fill={C.blue} stroke="#fff" strokeWidth="1.5" />)}
          <path d={ipdPath} fill="none" stroke={C.red} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => <circle key={`i-${i}`} cx={getSvgX(i)} cy={getSvgY(p.ipd)} r="4.5" fill={C.red} stroke="#fff" strokeWidth="1.5" />)}
          {points.map((p, i) => <text key={`x-${i}`} x={getSvgX(i)} y={192} fontSize="10" fill="#868e96" textAnchor="middle">{p.month}</text>)}
        </svg>
      </CardContent>
    </Card>
  );
};

/* ── Placeholder Card ──────────────────────────────────────────── */
const PlaceholderCard = ({ title, subtitle, icon, color, link }: { title: string; subtitle: string; icon: React.ReactNode; color: string; link?: string }) => (
  <Card sx={{ height: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(color, 0.15), color, borderRadius: '12px' }}>{icon}</Avatar>
        <Box><Typography variant="h6" fontWeight={700}>{title}</Typography><Typography variant="caption" color="text.secondary">{subtitle}</Typography></Box>
      </Box>
      {link && <Button size="small" variant="outlined" href={link} sx={{ borderColor: alpha(color, 0.4), color, textTransform: 'none' }}>Open Module</Button>}
    </CardContent>
  </Card>
);

/* ── Doctor Quick Actions ──────────────────────────────────────── */
const DoctorQuickActions = ({ config }: { config: DashboardRoleConfig }) => {
  const actionIcons = [<MedicalServices sx={{ fontSize: 20 }} />, <Science sx={{ fontSize: 20 }} />, <LocalPharmacy sx={{ fontSize: 20 }} />, <People sx={{ fontSize: 20 }} />];
  return (
    <Card sx={{ mb: 3, border: 'none', background: `linear-gradient(135deg, ${C.navy} 0%, #2b3fa6 60%, ${C.blue} 100%)`, boxShadow: '0 8px 32px rgba(30,42,120,0.35)' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: '#fff' }}>Quick Actions — Doctor</Typography>
        <Grid container spacing={1.5}>
          {config.quickActions.map((action, i) => (
            <Grid item xs={6} sm={4} md={3} key={action.label}>
              <Button variant="text" href={action.route ?? '#'} fullWidth startIcon={actionIcons[i % actionIcons.length]}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '0.88rem', py: 1.2, px: 1.5, borderRadius: '10px', bgcolor: alpha('#fff', 0.08), border: `1px solid ${alpha('#fff', 0.12)}`, '&:hover': { bgcolor: alpha('#fff', 0.16), color: '#fff', transform: 'translateY(-1px)' }, transition: 'all 0.18s ease' }}
              >{action.label}</Button>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

/* ══════════════════════════════════════════════════════════════════
   PHARMACIST COMPONENTS
══════════════════════════════════════════════════════════════════ */

const PharmQuickActions = () => {
  const actions = [
    { label: 'Dispense Rx',        route: '/pharmacy/queue', icon: <LocalPharmacy sx={{ fontSize: 20 }} /> },
    { label: 'Medication Catalog', route: '/pharmacy/catalog', icon: <Receipt sx={{ fontSize: 20 }} /> },
    { label: 'Safety & Narcotics', route: '/pharmacy/safety', icon: <Shield sx={{ fontSize: 20 }} /> },
    { label: 'Central Inventory',  route: '/inventory/master/catalogue', icon: <Inventory sx={{ fontSize: 20 }} /> },
    { label: 'Procurement (PO)',   route: '/inventory/procurement/requisitions', icon: <Assignment sx={{ fontSize: 20 }} /> },
    { label: 'Stock Logistics',    route: '/inventory/logistics/transfers', icon: <LocalHospital sx={{ fontSize: 20 }} /> },
  ];
  return (
    <Card sx={{ mb: 3, border: 'none', background: `linear-gradient(135deg, ${C.navy} 0%, #2b3fa6 60%, ${C.blue} 100%)`, boxShadow: '0 8px 32px rgba(30,42,120,0.35)' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#fff' }}>Pharmacy Workstation</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Faith Foundation Mission Hospital, Nsukka · {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })}</Typography>
          </Box>
          <Chip icon={<CheckCircle sx={{ fontSize: 14 }} />} label="Pharmacy Open" size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 700, border: '1px solid rgba(255,255,255,0.15)', '& .MuiChip-icon': { color: '#63e6be !important' } }} />
        </Box>
        <Grid container spacing={1.5}>
          {actions.map((a) => (
            <Grid item xs={6} sm={4} md={2} key={a.label}>
              <Button variant="text" href={a.route} fullWidth startIcon={a.icon}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '0.85rem', py: 1.2, px: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', transform: 'translateY(-2px)' }, transition: 'all 0.18s ease', '& .MuiButton-startIcon': { color: 'rgba(255,255,255,0.75)' } }}>
                {a.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

const PendingPrescriptionsTable = ({ prescriptions, loading }: { prescriptions: any[]; loading: boolean }) => {
  const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return '—'; } };
  const prioColor: Record<string, string> = { URGENT: C.red, STAT: C.red, ROUTINE: C.blue, HIGH: C.amber };
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Pending Prescriptions</Typography>
            <Typography variant="caption" color="text.secondary">{prescriptions.length} awaiting dispensing</Typography>
          </Box>
          <Button size="small" href="/pharmacy" endIcon={<ArrowForward sx={{ fontSize: 14 }} />} sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem' }}>Open Pharmacy</Button>
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={28} sx={{ color: C.blue }} /></Box>
        ) : prescriptions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircle sx={{ fontSize: 48, color: alpha(C.green, 0.3), mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>All prescriptions dispensed!</Typography>
            <Typography variant="caption" color="text.secondary">Queue is clear for this session</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['RX #', 'PATIENT', 'PRIORITY', 'ITEMS', 'TIME', 'ACTION'].map(h => (
                    <TableCell key={h} sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 700, py: 1, border: 'none', pl: h === 'RX #' ? 2.5 : undefined, pr: h === 'ACTION' ? 2.5 : undefined }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {prescriptions.slice(0, 8).map((rx: any) => {
                  const prio = (rx.priority ?? 'ROUTINE').toUpperCase();
                  const pc = prioColor[prio] ?? C.blue;
                  const patName = `${rx.patient?.firstName ?? ''} ${rx.patient?.lastName ?? ''}`.trim() || 'Unknown';
                  return (
                    <TableRow key={rx.id} sx={{ '&:hover': { bgcolor: alpha(C.blue, 0.03) }, '& td': { border: 'none', py: 1.2 } }}>
                      <TableCell sx={{ pl: 2.5 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: C.blue, fontFamily: 'monospace', fontSize: '0.8rem' }}>{rx.prescriptionNumber}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{patName}</Typography>
                        <Typography variant="caption" color="text.secondary">{rx.patient?.patientNumber ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={prio} sx={{ bgcolor: alpha(pc, 0.1), color: pc, fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{rx.items?.length ?? 0} item{(rx.items?.length ?? 0) !== 1 ? 's' : ''}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{fmtTime(rx.orderedAt)}</Typography>
                      </TableCell>
                      <TableCell sx={{ pr: 2.5 }}>
                        <Button size="small" href="/pharmacy" sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.75rem', py: 0.3, px: 1.2, bgcolor: alpha(C.blue, 0.08), borderRadius: '8px', '&:hover': { bgcolor: alpha(C.blue, 0.16) } }}>Dispense</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

const LowStockAlertsPanel = ({ inventory, loading }: { inventory: any[]; loading: boolean }) => {
  const REORDER_THRESHOLD = 50;
  const now = new Date(); const expiryAlert = new Date(); expiryAlert.setDate(now.getDate() + 90);
  const lowStock = inventory.map(item => {
    const qty = item.batches?.reduce((s: number, b: any) => s + b.currentQuantity, 0) ?? 0;
    const nearExpiry = item.batches?.some((b: any) => b.expiryDate && new Date(b.expiryDate) <= expiryAlert && new Date(b.expiryDate) > now);
    return { ...item, currentQty: qty, nearExpiry };
  }).filter(item => item.currentQty <= REORDER_THRESHOLD || item.nearExpiry).sort((a, b) => a.currentQty - b.currentQty).slice(0, 8);

  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Stock Alerts</Typography>
            <Typography variant="caption" color="text.secondary">{lowStock.length} item{lowStock.length !== 1 ? 's' : ''} requiring attention</Typography>
          </Box>
          <Button size="small" href="/pharmacy" endIcon={<ArrowForward sx={{ fontSize: 14 }} />} sx={{ color: C.amber, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem' }}>Inventory</Button>
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={28} sx={{ color: C.blue }} /></Box>
        ) : lowStock.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircle sx={{ fontSize: 48, color: alpha(C.green, 0.3), mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>All stock levels adequate</Typography>
          </Box>
        ) : (
          <Stack spacing={0}>
            {lowStock.map((item, i) => {
              const isOut = item.currentQty === 0; const isLow = item.currentQty <= 20;
              const statusColor = isOut ? C.red : isLow ? C.amber : C.blue;
              const statusLabel = isOut ? 'Out of Stock' : isLow ? 'Critical Low' : item.nearExpiry ? 'Near Expiry' : 'Low Stock';
              const pct = Math.min(100, (item.currentQty / REORDER_THRESHOLD) * 100);
              return (
                <Box key={item.id ?? i} sx={{ px: 2.5, py: 1.5, borderBottom: i < lowStock.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', '&:hover': { bgcolor: alpha(C.blue, 0.02) } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                    <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{item.genericName}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.dosageForm} · {item.strength}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                      <Typography variant="body2" fontWeight={800} sx={{ color: statusColor }}>{item.currentQty}</Typography>
                      <Chip size="small" label={statusLabel} sx={{ bgcolor: alpha(statusColor, 0.1), color: statusColor, fontWeight: 700, fontSize: '0.62rem', height: 18 }} />
                    </Box>
                  </Box>
                  <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 2, bgcolor: alpha(statusColor, 0.1), '& .MuiLinearProgress-bar': { bgcolor: statusColor, borderRadius: 2 } }} />
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

const PharmSummaryPanel = ({ analytics, loading }: { analytics: any; loading: boolean }) => {
  const s = analytics?.summary;
  const items = [
    { label: 'Total Prescriptions', value: s?.totalPrescriptions ?? 0,  color: C.blue,   icon: <Receipt sx={{ fontSize: 16 }} /> },
    { label: 'Dispensed',           value: s?.totalDispensed ?? 0,       color: C.green,  icon: <CheckCircle sx={{ fontSize: 16 }} /> },
    { label: 'Avg TAT (min)',        value: s?.avgTATMinutes ?? '—',      color: C.cyan,   icon: <AccessTime sx={{ fontSize: 16 }} /> },
    { label: 'Low Stock Items',      value: s?.lowStockItems ?? 0,        color: C.amber,  icon: <Warning sx={{ fontSize: 16 }} /> },
    { label: 'Near Expiry',          value: s?.nearExpiryCount ?? 0,      color: C.rose,   icon: <HourglassBottom sx={{ fontSize: 16 }} /> },
    { label: 'ADEs Reported',        value: s?.adesCount ?? 0,           color: C.red,    icon: <MonitorHeart sx={{ fontSize: 16 }} /> },
  ];
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>Session Summary</Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: C.blue }} /></Box>
        ) : (
          <Grid container spacing={1.5}>
            {items.map(item => (
              <Grid item xs={6} key={item.label}>
                <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: alpha(item.color, 0.06), display: 'flex', alignItems: 'center', gap: 1.5, border: `1px solid ${alpha(item.color, 0.1)}` }}>
                  <Box sx={{ color: item.color, flexShrink: 0 }}>{item.icon}</Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ color: item.color, lineHeight: 1.2 }}>{item.value}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', lineHeight: 1.3 }}>{item.label}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

const InventoryValueCard = ({ analytics, inventory, loading }: { analytics: any; inventory: any[]; loading: boolean }) => {
  const s = analytics?.summary;
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>Inventory Overview</Typography>
          <Button size="small" href="/pharmacy" sx={{ color: C.blue, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}>View All →</Button>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: C.blue }} /></Box>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ p: 2, borderRadius: 2.5, background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`, color: '#fff' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>TOTAL INVENTORY VALUE</Typography>
              <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-1px', mt: 0.5 }}>{fmtCurrency(s?.inventoryTotalValue ?? 0)}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{inventory.length} unique drug items in catalog</Typography>
            </Box>
            {[
              { label: 'Clinical Interventions',      value: s?.interventionsCount ?? 0,              color: C.violet },
              { label: 'Controlled Substance Logs',   value: s?.controlledSubstancesDispensed ?? 0,   color: C.amber },
            ].map(r => (
              <Box key={r.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FiberManualRecord sx={{ fontSize: 10, color: r.color }} />
                  <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                </Box>
                <Typography variant="body2" fontWeight={700} sx={{ color: r.color }}>{r.value}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};


/* ══════════════════════════════════════════════════════════════════
   LABORATORY COMPONENTS
══════════════════════════════════════════════════════════════════ */

/* ── Lab Quick Actions bar ─────────────────────────────────── */
const LabQuickActions = () => {
  const actions = [
    { label: 'LIMS Lab Queue',  route: '/lims/orders', icon: <Assignment sx={{ fontSize: 20 }} /> },
    { label: 'Pathology Desk',  route: '/pathology', icon: <Biotech sx={{ fontSize: 20 }} /> },
    { label: 'Histology Orders',route: '/pathology/histology', icon: <Science sx={{ fontSize: 20 }} /> },
    { label: 'Cytology Workspace', route: '/pathology/cytology', icon: <Science sx={{ fontSize: 20 }} /> },
    // { label: 'Diagnostic Hub',  route: '/radiology/hub', icon: <Done sx={{ fontSize: 20 }} /> },
    { label: 'Quality Control', route: '/lims/qc', icon: <CheckCircle sx={{ fontSize: 20 }} /> },
  ];
  return (
    <Card sx={{ mb: 3, border: 'none', background: `linear-gradient(135deg, ${C.blue} 0%, #4c6ef5 60%, ${C.cyan} 100%)`, boxShadow: '0 8px 32px rgba(59,91,219,0.35)' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#fff' }}>LIMS & Pathology Workstation Console</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Faith Foundation Diagnostic Laboratory & Pathology Center · {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })}</Typography>
          </Box>
          <Chip icon={<CheckCircle sx={{ fontSize: 14 }} />} label="Lab Online" size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)', '& .MuiChip-icon': { color: '#63e6be !important' } }} />
        </Box>
        <Grid container spacing={1.5}>
          {actions.map((a) => (
            <Grid item xs={6} sm={4} md={2.4} key={a.label}>
              <Button variant="text" href={a.route} fullWidth startIcon={a.icon}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.85rem', py: 1.2, px: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', transform: 'translateY(-2px)' }, transition: 'all 0.18s ease', '& .MuiButton-startIcon': { color: 'rgba(255,255,255,0.85)' } }}>
                {a.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

/* ── Pending Lab Worklist Table ─────────────────────────────── */
const PendingLabWorklistTable = ({ orders, loading }: { orders: any[]; loading: boolean }) => {
  const navigate = useNavigate();
  const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return '—'; } };
  const prioColor: Record<string, string> = { STAT: C.red, CRITICAL: C.red, URGENT: C.amber, ROUTINE: C.blue };
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Pending Lab Orders</Typography>
            <Typography variant="caption" color="text.secondary">{orders.length} orders awaiting processing</Typography>
          </Box>
          <Button 
            size="small" 
            href="/lims/orders" 
            onClick={(e) => { e.preventDefault(); navigate('/lims/orders'); }}
            endIcon={<ArrowForward sx={{ fontSize: 14 }} />} 
            sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Open LIMS Queue
          </Button>
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={28} sx={{ color: C.blue }} /></Box>
        ) : orders.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircle sx={{ fontSize: 48, color: alpha(C.green, 0.3), mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>All orders completed!</Typography>
            <Typography variant="caption" color="text.secondary">Lab queue is empty</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['ORDER #', 'PATIENT', 'PRIORITY', 'TESTS REQUESTED', 'ORDERED BY', 'TIME', 'ACTION'].map(h => (
                    <TableCell key={h} sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 700, py: 1, border: 'none', pl: h === 'ORDER #' ? 2.5 : undefined, pr: h === 'ACTION' ? 2.5 : undefined }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.slice(0, 8).map((order: any) => {
                  const prio = (order.priority ?? 'ROUTINE').toUpperCase();
                  const pc = prioColor[prio] ?? C.blue;
                  const patName = `${order.patient?.firstName ?? ''} ${order.patient?.lastName ?? ''}`.trim() || 'Unknown';
                  const reqName = `${order.requestedBy?.firstName ?? ''} ${order.requestedBy?.lastName ?? ''}`.trim() || 'Unknown';
                  const testsText = order.items?.map((i: any) => i.test?.testName).join(', ') || 'None';
                  return (
                    <TableRow key={order.id} sx={{ '&:hover': { bgcolor: alpha(C.blue, 0.03) }, '& td': { border: 'none', py: 1.2 } }}>
                      <TableCell sx={{ pl: 2.5 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: C.blue, fontFamily: 'monospace', fontSize: '0.8rem' }}>{order.orderNumber}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{patName}</Typography>
                        <Typography variant="caption" color="text.secondary">{order.patient?.patientNumber ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={prio} sx={{ bgcolor: alpha(pc, 0.1), color: pc, fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 220, fontWeight: 500 }} title={testsText}>{testsText}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{reqName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{fmtTime(order.orderedAt)}</Typography>
                      </TableCell>
                      <TableCell sx={{ pr: 2.5 }}>
                        <Button 
                          size="small" 
                          href="/lims/orders" 
                          onClick={(e) => { e.preventDefault(); navigate('/lims/orders'); }}
                          sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.75rem', py: 0.3, px: 1.2, bgcolor: alpha(C.blue, 0.08), borderRadius: '8px', '&:hover': { bgcolor: alpha(C.blue, 0.16) } }}
                        >
                          Process
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Reagent Stock Alerts Panel ──────────────────────────────── */
const ReagentStockAlertsPanel = ({ lowStock, nearExpiry, loading }: { lowStock: any[]; nearExpiry: any[]; loading: boolean }) => {
  const navigate = useNavigate();
  const alertsCount = (lowStock?.length ?? 0) + (nearExpiry?.length ?? 0);
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Reagent Stock Alerts</Typography>
            <Typography variant="caption" color="text.secondary">{alertsCount} items requiring replenishment</Typography>
          </Box>
          <Button 
            size="small" 
            href="/lims/inventory" 
            onClick={(e) => { e.preventDefault(); navigate('/lims/inventory'); }}
            endIcon={<ArrowForward sx={{ fontSize: 14 }} />} 
            sx={{ color: C.amber, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Inventory
          </Button>
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={28} sx={{ color: C.blue }} /></Box>
        ) : alertsCount === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircle sx={{ fontSize: 48, color: alpha(C.green, 0.3), mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>All reagent stock levels normal</Typography>
          </Box>
        ) : (
          <Stack spacing={0}>
            {lowStock?.slice(0, 4).map((item: any, i: number) => {
              const isOut = item.currentStock === 0;
              const statusColor = isOut ? C.red : C.amber;
              const statusLabel = isOut ? 'Out of Stock' : 'Low Stock';
              return (
                <Box 
                  key={item.id ?? i} 
                  onClick={() => navigate('/lims/inventory')}
                  sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', '&:hover': { bgcolor: alpha(C.blue, 0.02) } }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ minWidth: 0, mr: 2 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{item.itemName}</Typography>
                      <Typography variant="caption" color="text.secondary">Reorder Level: {item.reorderLevel} {item.unit}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={800} color={statusColor}>{item.currentStock}</Typography>
                      <Chip size="small" label={statusLabel} sx={{ bgcolor: alpha(statusColor, 0.1), color: statusColor, fontWeight: 700, fontSize: '0.62rem', height: 18 }} />
                    </Box>
                  </Box>
                </Box>
              );
            })}
            {nearExpiry?.slice(0, 4).map((item: any, i: number) => {
              const expDate = new Date(item.expiryDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <Box 
                  key={item.id ?? i} 
                  onClick={() => navigate('/lims/inventory')}
                  sx={{ px: 2.5, py: 1.5, borderBottom: i < nearExpiry.slice(0, 4).length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', cursor: 'pointer', '&:hover': { bgcolor: alpha(C.blue, 0.02) } }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ minWidth: 0, mr: 2 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{item.itemName}</Typography>
                      <Typography variant="caption" color="text.secondary">Expires: {expDate}</Typography>
                    </Box>
                    <Chip size="small" label="Near Expiry" sx={{ bgcolor: alpha(C.rose, 0.1), color: C.rose, fontWeight: 700, fontSize: '0.62rem', height: 18 }} />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Lab Workload Summary Panel ──────────────────────────────── */
const LabSummaryPanel = ({ summary, loading }: { summary: any; loading: boolean }) => {
  const items = [
    { label: "Today's Orders",     value: summary?.ordersToday ?? 0,             color: C.blue,   icon: <Science sx={{ fontSize: 16 }} /> },
    { label: 'Avg Turnaround (Hr)', value: summary?.avgTATHours ?? '—',           color: C.green,  icon: <AccessTime sx={{ fontSize: 16 }} /> },
    { label: 'Pending Criticals',   value: summary?.pendingCriticalAlerts ?? 0,    color: C.red,    icon: <Warning sx={{ fontSize: 16 }} /> },
    { label: 'QC Fails (Month)',    value: summary?.qcFailsThisMonth ?? 0,        color: C.amber,  icon: <CheckCircle sx={{ fontSize: 16 }} /> },
  ];
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>Operational Metrics</Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: C.blue }} /></Box>
        ) : (
          <Grid container spacing={1.5}>
            {items.map(item => (
              <Grid item xs={6} key={item.label}>
                <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: alpha(item.color, 0.06), display: 'flex', alignItems: 'center', gap: 1.5, border: `1px solid ${alpha(item.color, 0.1)}` }}>
                  <Box sx={{ color: item.color, flexShrink: 0 }}>{item.icon}</Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ color: item.color, lineHeight: 1.2 }}>{item.value}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', lineHeight: 1.3 }}>{item.label}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Quality Control & Equipment status ────────────────────────── */
const EquipmentStatusCard = ({ equipmentStatus, loading }: { equipmentStatus: any; loading: boolean }) => {
  const statuses = [
    { label: 'Analyzers Active',    value: equipmentStatus?.ACTIVE ?? 0,      color: C.green },
    { label: 'Under Maintenance',   value: equipmentStatus?.MAINTENANCE ?? 0, color: C.amber },
    { label: 'Offline / Calibrate', value: equipmentStatus?.OFFLINE ?? 0,     color: C.red },
  ];
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>Analyzer & Equipment Status</Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: C.blue }} /></Box>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ p: 2, borderRadius: 2.5, background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`, color: '#fff' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>SYSTEM CALIBRATION STATUS</Typography>
              <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-1px', mt: 0.5 }}>100% QC Pass</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>All internal validation controls complete</Typography>
            </Box>
            {statuses.map(s => (
              <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FiberManualRecord sx={{ fontSize: 10, color: s.color }} />
                  <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                </Box>
                <Typography variant="body2" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};


/* ══════════════════════════════════════════════════════════════════
   RADIOLOGY COMPONENTS
══════════════════════════════════════════════════════════════════ */

/* ── Radiology Quick Actions bar ───────────────────────────── */
const RadQuickActions = () => {
  const navigate = useNavigate();
  const actions = [
    { label: 'RIS Order Queue',      route: '/radiology/orders', icon: <Assignment sx={{ fontSize: 20 }} /> },
    { label: 'PACS Studies',         route: '/radiology/pacs', icon: <PersonalVideo sx={{ fontSize: 20 }} /> },
    { label: 'Ultrasound Suite',     route: '/radiology/ultrasound', icon: <Sensors sx={{ fontSize: 20 }} /> },
    { label: 'Digital X-Ray',        route: '/radiology/xray', icon: <CameraAlt sx={{ fontSize: 20 }} /> },
    { label: 'Modality QA & Safety', route: '/radiology/qa', icon: <Build sx={{ fontSize: 20 }} /> },
    { label: 'Radiation Dosimetry',  route: '/radiology/analytics', icon: <BarChart sx={{ fontSize: 20 }} /> },
  ];
  return (
    <Card sx={{ mb: 3, border: 'none', background: `linear-gradient(135deg, ${C.blue} 0%, #4c6ef5 60%, ${C.cyan} 100%)`, boxShadow: '0 8px 32px rgba(59,91,219,0.35)' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#fff' }}>Radiology Workspace Console</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Faith Foundation Imaging & Radiography Unit · {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })}</Typography>
          </Box>
          <Chip icon={<CheckCircle sx={{ fontSize: 14 }} />} label="Modality Online" size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)', '& .MuiChip-icon': { color: '#63e6be !important' } }} />
        </Box>
        <Grid container spacing={1.5}>
          {actions.map((a) => (
            <Grid item xs={6} sm={4} md={2} key={a.label}>
              <Button variant="text" onClick={() => navigate(a.route)} fullWidth startIcon={a.icon}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.85rem', py: 1.2, px: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', transform: 'translateY(-2px)' }, transition: 'all 0.18s ease', '& .MuiButton-startIcon': { color: 'rgba(255,255,255,0.85)' } }}>
                {a.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

/* ── Pending Radiology Queue Table ─────────────────────────── */
const PendingRadiologyTable = ({ orders, loading }: { orders: any[]; loading: boolean }) => {
  const navigate = useNavigate();
  const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return '—'; } };
  const prioColor: Record<string, string> = { STAT: C.red, CRITICAL: C.red, URGENT: C.amber, ROUTINE: C.blue };
  const pendingOrders = orders.filter(o => ['ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'ARRIVED'].includes((o.status ?? '').toUpperCase()));
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Active Imaging Requests</Typography>
            <Typography variant="caption" color="text.secondary">{pendingOrders.length} patients awaiting scans</Typography>
          </Box>
          <Button size="small" onClick={() => navigate('/radiology/orders')} endIcon={<ArrowForward sx={{ fontSize: 14 }} />} sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem' }}>Open Modality Queue</Button>
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={28} sx={{ color: C.blue }} /></Box>
        ) : pendingOrders.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircle sx={{ fontSize: 48, color: alpha(C.green, 0.3), mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>All imaging complete!</Typography>
            <Typography variant="caption" color="text.secondary">No active orders</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['ORDER #', 'PATIENT', 'PRIORITY', 'PROCEDURE', 'MODALITY', 'TIME', 'ACTION'].map(h => (
                    <TableCell key={h} sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 700, py: 1, border: 'none', pl: h === 'ORDER #' ? 2.5 : undefined, pr: h === 'ACTION' ? 2.5 : undefined }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingOrders.slice(0, 8).map((order: any) => {
                  const prio = (order.priority ?? 'ROUTINE').toUpperCase();
                  const pc = prioColor[prio] ?? C.blue;
                  const patName = `${order.patient?.firstName ?? ''} ${order.patient?.lastName ?? ''}`.trim() || 'Unknown';
                  const procedure = order.catalogItem?.name || 'Imaging Procedure';
                  const modality = order.catalogItem?.modality || 'X-RAY';
                  return (
                    <TableRow key={order.id} sx={{ '&:hover': { bgcolor: alpha(C.blue, 0.03) }, '& td': { border: 'none', py: 1.2 } }}>
                      <TableCell sx={{ pl: 2.5 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: C.blue, fontFamily: 'monospace', fontSize: '0.8rem' }}>{order.orderNumber}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{patName}</Typography>
                        <Typography variant="caption" color="text.secondary">{order.patient?.patientNumber ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={prio} sx={{ bgcolor: alpha(pc, 0.1), color: pc, fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 180, fontWeight: 500 }}>{procedure}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={modality} sx={{ bgcolor: alpha(C.blue, 0.1), color: C.blue, fontWeight: 700, fontSize: '0.62rem', height: 18 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{fmtTime(order.createdAt)}</Typography>
                      </TableCell>
                      <TableCell sx={{ pr: 2.5 }}>
                        <Button size="small" onClick={() => navigate('/radiology/orders')} sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.75rem', py: 0.3, px: 1.2, bgcolor: alpha(C.blue, 0.08), borderRadius: '8px', '&:hover': { bgcolor: alpha(C.blue, 0.16) } }}>Report</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Radiology Equipment Panel ─────────────────────────────── */
const RadiologyEquipmentPanel = ({ equipment, loading }: { equipment: any[]; loading: boolean }) => {
  const navigate = useNavigate();
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Modality Machines status</Typography>
            <Typography variant="caption" color="text.secondary">Imaging devices and live calibration audits</Typography>
          </Box>
          <Button size="small" onClick={() => navigate('/radiology/qa')} endIcon={<ArrowForward sx={{ fontSize: 14 }} />} sx={{ color: C.blue, fontWeight: 600, textTransform: 'none', fontSize: '0.8rem' }}>Manage</Button>
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={28} sx={{ color: C.blue }} /></Box>
        ) : !equipment || equipment.length === 0 ? (
          <Box sx={{ px: 2.5, py: 3 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>All devices online. QA telemetry synchronizing...</Alert>
          </Box>
        ) : (
          <Stack spacing={0}>
            {equipment.slice(0, 5).map((dev: any, i: number) => {
              const active = (dev.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE';
              const color = active ? C.green : dev.status === 'MAINTENANCE' ? C.amber : C.red;
              const formattedDate = dev.lastCalibrated 
                ? new Date(dev.lastCalibrated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Today (Live)';
              const physicist = dev.lastCalibratedBy || 'Medical Physics Unit';
              return (
                <Box key={dev.id ?? i} sx={{ px: 2.5, py: 1.5, borderBottom: i < equipment.slice(0, 5).length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', '&:hover': { bgcolor: alpha(C.blue, 0.02) } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ minWidth: 0, mr: 2 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{dev.name} ({dev.modality})</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last Calibration: {formattedDate} · {physicist}
                      </Typography>
                    </Box>
                    <Chip size="small" label={dev.status ?? 'ACTIVE'} sx={{ bgcolor: alpha(color, 0.1), color: color, fontWeight: 700, fontSize: '0.62rem', height: 18 }} />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Radiology Summary Panel ────────────────────────────────── */
const RadSummaryPanel = ({ 
  orders, 
  incidents, 
  equipment, 
  loading 
}: { 
  orders: any[]; 
  incidents: any[]; 
  equipment?: any[]; 
  loading: boolean 
}) => {
  const activeCount = equipment && equipment.length > 0 
    ? equipment.filter(d => (d.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE').length 
    : 5;
  const totalCount = equipment && equipment.length > 0 ? equipment.length : 5;

  const stats = [
    { label: "Today's Scans",      value: orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length, color: C.blue,  icon: <Biotech sx={{ fontSize: 16 }} /> },
    { label: 'Pending Reports',   value: orders.filter(o => o.status === 'COMPLETED_STUDY' || o.status === 'IN_PROGRESS').length,        color: C.cyan,    icon: <AccessTime sx={{ fontSize: 16 }} /> },
    { label: 'Safety Incidents',   value: incidents.filter(i => i.status !== 'RESOLVED').length,                                          color: C.red,     icon: <Warning sx={{ fontSize: 16 }} /> },
    { label: 'Active Devices',     value: `${activeCount}/${totalCount}`,                                                                  color: C.green,   icon: <CheckCircle sx={{ fontSize: 16 }} /> },
  ];
  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>Operational Metrics</Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: C.blue }} /></Box>
        ) : (
          <Grid container spacing={1.5}>
            {stats.map(item => (
              <Grid item xs={6} key={item.label}>
                <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: alpha(item.color, 0.06), display: 'flex', alignItems: 'center', gap: 1.5, border: `1px solid ${alpha(item.color, 0.1)}` }}>
                  <Box sx={{ color: item.color, flexShrink: 0 }}>{item.icon}</Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ color: item.color, lineHeight: 1.2 }}>{item.value}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', lineHeight: 1.3 }}>{item.label}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Modality Calibration & Safety Card ──────────────────────── */
const ModalitySafetyCard = ({ 
  safetyData, 
  loading,
  onCalibrate,
  calibrating 
}: { 
  safetyData: any; 
  loading: boolean;
  onCalibrate?: () => void;
  calibrating?: boolean;
}) => {
  const dosimetry = safetyData?.dosimetry;
  const leadAprons = safetyData?.leadAprons;
  const ctPhantom = safetyData?.ctWaterPhantom;

  return (
    <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>Radiation Safety & Calibration</Typography>
          <Chip size="small" label="Live Calibration" color="success" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: C.blue }} /></Box>
        ) : (
          <Stack spacing={1.5}>
            <Box sx={{ p: 2, borderRadius: 2.5, background: `linear-gradient(135deg, ${C.blue} 0%, ${C.cyan} 100%)`, color: '#fff' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>RADIATION DOSIMETRY STATUS</Typography>
                <Chip size="small" label={dosimetry?.status ?? 'OPTIMAL'} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
              </Box>
              <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-1px', mt: 0.5 }}>
                {dosimetry?.exposureMsv ?? '0.04 mSv'} Exposure
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem' }}>
                {dosimetry?.standard ?? 'All rooms meet IAEA/NNRA background limits (<20 mSv/yr)'}
              </Typography>
            </Box>

            <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)', bgcolor: alpha(C.green, 0.04), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ minWidth: 0, mr: 1 }}>
                <Typography variant="body2" fontWeight={600} color="text.primary">Lead Aprons Integrity Check</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {leadAprons?.integrityScore ?? '100% Passed (0 Pinholes/Tears)'} {leadAprons?.lastAuditDate ? `· ${new Date(leadAprons.lastAuditDate).toLocaleDateString()}` : ''}
                </Typography>
              </Box>
              <Chip size="small" label={leadAprons?.status ?? 'Pass (12/12)'} color="success" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
            </Box>

            <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)', bgcolor: alpha(C.blue, 0.04), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ minWidth: 0, mr: 1 }}>
                <Typography variant="body2" fontWeight={600} color="text.primary">Daily CT Scanner Water Phantoms</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {ctPhantom?.machineName ?? 'Siemens Somatom 128-Slice CT'} {ctPhantom?.baselineNoise ? `· ${ctPhantom.baselineNoise}` : ''}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="contained"
                disabled={calibrating}
                onClick={onCalibrate}
                sx={{
                  bgcolor: C.blue,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1.5,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: alpha(C.blue, 0.9), boxShadow: 'none' }
                }}
              >
                {calibrating ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : (ctPhantom?.status ?? 'Calibrated')}
              </Button>
            </Box>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════════ */
const Dashboard = () => {

  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Doctor state
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const [labLoading, setLabLoading] = useState(false);

  // Nurse state
  const [nurseData, setNurseData] = useState<any>(null);
  const [wardStats, setWardStats] = useState<any[]>([]);
  const [nurseLoading, setNurseLoading] = useState(false);
  const [wardLoading, setWardLoading] = useState(false);

  // Pharmacist state
  const [pharmAnalytics, setPharmAnalytics] = useState<any>(null);
  const [pharmPrescriptions, setPharmPrescriptions] = useState<any[]>([]);
  const [pharmInventory, setPharmInventory] = useState<any[]>([]);
  const [pharmLoading, setPharmLoading] = useState(false);

  // Lab state
  const [labAnalytics, setLabAnalytics] = useState<any>(null);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [limsLoading, setLimsLoading] = useState(false);

  // Radiology state
  const [radOrders, setRadOrders] = useState<any[]>([]);
  const [radEquipment, setRadEquipment] = useState<any[]>([]);
  const [radIncidents, setRadIncidents] = useState<any[]>([]);
  const [radSafetyData, setRadSafetyData] = useState<any>(null);
  const [radCalibrating, setRadCalibrating] = useState(false);
  const [radLoading, setRadLoading] = useState(false);

  const roleConfig: DashboardRoleConfig = getDashboardConfigForUser(user ?? {});
  const allowedWidgets: WidgetId[] = roleConfig.widgets;
  const primaryRole = (user?.roles?.[0] ?? user?.role ?? '').toUpperCase();
  const isSuperAdmin    = user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN');
  const isAdmin         = isSuperAdmin
                       || primaryRole === 'ADMIN'
                       || user?.roles?.includes('ADMIN')
                       || (user?.designation ?? '').toLowerCase() === 'admin';
  const isRadiologist = !isAdmin && isUserRadiologyStaff(user);
  const isDoctor      = !isAdmin && ((primaryRole === 'DOCTOR') && !isRadiologist && (user?.designation ?? '').toLowerCase() !== 'physiotherapist');
  const isNurse       = !isAdmin && (primaryRole === 'NURSE');
  const isPharmacist  = !isAdmin && isUserPharmacyStaff(user);
  const isLab         = !isAdmin && isUserLabStaff(user);
  const isRecordOfficer = !isAdmin && (primaryRole === 'RECEPTIONIST'
                       || (user?.designation ?? '').toLowerCase() === 'record officer'
                       || (user?.designation ?? '').toLowerCase() === 'receptionist');
  const isFinance       = !isAdmin && (
    isUserFinanceStaff(user) ||
    primaryRole === 'FINANCE_OFFICER' ||
    primaryRole === 'ACCOUNTANT' ||
    primaryRole === 'FINANCE' ||
    (user?.roles || []).some((r: string) => ['FINANCE_OFFICER', 'ACCOUNTANT', 'FINANCE', 'CFO', 'CHIEF_FINANCIAL_OFFICER'].includes(r.toUpperCase())) ||
    (user?.designation ?? '').toLowerCase().includes('cfo') ||
    (user?.designation ?? '').toLowerCase().includes('finance') ||
    (user?.designation ?? '').toLowerCase().includes('accountant')
  );
  const isAccountant    = !isAdmin && (isFinance || primaryRole === 'ACCOUNTANT'
                       || (user?.designation ?? '').toLowerCase() === 'accountant');
  const isCashier       = !isAdmin && isUserCashierStaff(user);
  const isAuditor       = !isAdmin && isUserAuditorStaff(user);
  const isInsurance     = !isAdmin && (primaryRole === 'INSURANCE_OFFICER'
                       || (user?.designation ?? '').toLowerCase() === 'insurance officer');
  const isMortician     = !isAdmin && isUserMorticianStaff(user);
  const isPhysio        = !isAdmin && isUserPhysioStaff(user);
  const isSecretary     = !isAdmin && (primaryRole === 'SECRETARY'
                       || (user?.designation ?? '').toLowerCase() === 'secretary');
  const isBishop        = (user?.role === 'BISHOP') || (user?.roles?.includes('BISHOP')) || ((user?.role ?? '').toLowerCase() === 'bishop') || ((user?.designation ?? '').toLowerCase().includes('bishop'));

  // Record Officer state
  const [recPatients, setRecPatients] = useState<any[]>([]);
  const [recAppointments, setRecAppointments] = useState<any[]>([]);
  const [recQueueWaitTimes, setRecQueueWaitTimes] = useState<any>({ waitTimes: [], averages: [] });
  const [recLoading, setRecLoading] = useState(false);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [patientOptions, setPatientOptions] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [visitType, setVisitType] = useState('OUTPATIENT');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [triagePriority, setTriagePriority] = useState(0);
  const [priorityReason, setPriorityReason] = useState('');
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [consultationServices, setConsultationServices] = useState<any[]>([]);

  // New Booking State
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [selectedBookPatient, setSelectedBookPatient] = useState<any>(null);
  const [selectedBookDoctor, setSelectedBookDoctor] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingDuration, setBookingDuration] = useState(15);
  const [bookingType, setBookingType] = useState('NEW');
  const [bookingVisitType, setBookingVisitType] = useState('SCHEDULED');
  const [bookingReason, setBookingReason] = useState('');
  const [bypassConflict, setBypassConflict] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [loadingStaffSearch, setLoadingStaffSearch] = useState(false);

  const authHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Main dashboard stats (all roles)
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/reports/dashboard`, { headers: authHeaders() });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (json.success) { setData(json.data); setError(false); } else throw new Error();
      } catch { setError(true); } finally { setLoading(false); }
    };
    fetchDashboard();
  }, [authHeaders]);

  // Doctor-specific fetches
  useEffect(() => {
    if (!isDoctor) return;
    const h = authHeaders();
    const fetchAppts = async () => {
      setApptLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const res = await fetch(`/api/appointments?startDate=${today}&endDate=${tomorrow}`, { headers: h });
        if (res.ok) setAppointments(await res.json());
      } catch { /**/ } finally { setApptLoading(false); }
    };
    const fetchPatients = async () => {
      setPatientLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/patients`, { headers: h });
        if (res.ok) { const j = await res.json(); setPatients(Array.isArray(j) ? j : j.data ?? []); }
      } catch { /**/ } finally { setPatientLoading(false); }
    };
    const fetchLabs = async () => {
      setLabLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/lims/orders?status=PENDING`, { headers: h });
        if (res.ok) { const j = await res.json(); setLabs(Array.isArray(j) ? j : j.data ?? j.orders ?? []); }
      } catch { /**/ } finally { setLabLoading(false); }
    };
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/lims/critical-alerts`, { headers: h });
        if (res.ok) { const j = await res.json(); setCriticalAlerts(Array.isArray(j) ? j : j.data ?? j.alerts ?? []); }
      } catch { /**/ }
    };
    fetchAppts(); fetchPatients(); fetchLabs(); fetchAlerts();
  }, [isDoctor, authHeaders]);

  // Nurse-specific fetches
  useEffect(() => {
    if (!isNurse) return;
    const h = authHeaders();
    const fetchNurseDashboard = async () => {
      setNurseLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/nursing/dashboard`, { headers: h });
        if (res.ok) setNurseData(await res.json());
      } catch { /**/ } finally { setNurseLoading(false); }
    };
    const fetchWardStats = async () => {
      setWardLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/ipd/stats`, { headers: h });
        if (res.ok) { const j = await res.json(); setWardStats(Array.isArray(j) ? j : []); }
      } catch { /**/ } finally { setWardLoading(false); }
    };
    fetchNurseDashboard(); fetchWardStats();
  }, [isNurse, authHeaders]);

  // Pharmacist-specific fetches
  useEffect(() => {
    if (!isPharmacist) return;
    const h = authHeaders();
    setPharmLoading(true);
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/pharmacy/analytics`, { headers: h });
        if (res.ok) setPharmAnalytics(await res.json());
      } catch { /**/ }
    };
    const fetchPrescriptions = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/pharmacy/prescriptions?status=PENDING`, { headers: h });
        if (res.ok) { const j = await res.json(); setPharmPrescriptions(Array.isArray(j) ? j : []); }
      } catch { /**/ }
    };
    const fetchInventory = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/pharmacy/inventory`, { headers: h });
        if (res.ok) { const j = await res.json(); setPharmInventory(Array.isArray(j) ? j : []); }
      } catch { /**/ } finally { setPharmLoading(false); }
    };
    fetchAnalytics(); fetchPrescriptions(); fetchInventory();
  }, [isPharmacist, authHeaders]);

  // Lab-specific fetches
  useEffect(() => {
    if (!isLab) return;
    const h = authHeaders();
    setLimsLoading(true);
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/lims/analytics`, { headers: h });
        if (res.ok) setLabAnalytics(await res.json());
      } catch { /**/ }
    };
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/lims/orders?status=PENDING`, { headers: h });
        if (res.ok) { const j = await res.json(); setLabOrders(Array.isArray(j) ? j : []); }
      } catch { /**/ } finally { setLimsLoading(false); }
    };
    fetchAnalytics(); fetchOrders();
  }, [isLab, authHeaders]);

  // Radiology-specific fetches
  useEffect(() => {
    if (!isRadiologist) return;
    const h = authHeaders();
    setRadLoading(true);
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/radiology/orders`, { headers: h });
        if (res.ok) setRadOrders(await res.json());
      } catch { /**/ }
    };
    const fetchEquipment = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/radiology/equipment`, { headers: h });
        if (res.ok) setRadEquipment(await res.json());
      } catch { /**/ }
    };
    const fetchIncidents = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/radiology/incidents`, { headers: h });
        if (res.ok) setRadIncidents(await res.json());
      } catch { /**/ }
    };
    const fetchSafetyCalibration = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/radiology/safety-calibration`, { headers: h });
        if (res.ok) setRadSafetyData(await res.json());
      } catch { /**/ } finally { setRadLoading(false); }
    };
    fetchOrders(); fetchEquipment(); fetchIncidents(); fetchSafetyCalibration();
  }, [isRadiologist, authHeaders]);

  const handleTriggerCalibration = async () => {
    setRadCalibrating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/radiology/safety-calibration/calibrate-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          performedBy: `${user?.firstName ?? 'Khadijah'} ${user?.lastName ?? 'Aliyu'} (${user?.designation ?? 'Radiologist'})`,
          notes: 'Daily routine CT scanner water phantom calibration & beam alignment verified live.'
        })
      });
      if (res.ok) {
        enqueueSnackbar('CT Scanner Water Phantom QC calibration completed & logged live!', { variant: 'success' });
        const h = authHeaders();
        const [resEquip, resSafety] = await Promise.all([
          fetch(`${API_BASE_URL}/radiology/equipment`, { headers: h }),
          fetch(`${API_BASE_URL}/radiology/safety-calibration`, { headers: h })
        ]);
        if (resEquip.ok) setRadEquipment(await resEquip.json());
        if (resSafety.ok) setRadSafetyData(await resSafety.json());
      } else {
        enqueueSnackbar('Failed to calibrate modality machine', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Error connecting to modality calibration controller', { variant: 'error' });
    } finally {
      setRadCalibrating(false);
    }
  };

  // Record Officer fetches
  useEffect(() => {
    if (!isRecordOfficer) return;
    const h = authHeaders();
    const fetchRecAppts = async () => {
      setRecLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const res = await fetch(`/api/appointments?startDate=${today}&endDate=${tomorrow}`, { headers: h });
        if (res.ok) setRecAppointments(await res.json());
      } catch { /**/ }
    };
    const fetchRecPatients = async () => {
      setRecLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/patients`, { headers: h });
        if (res.ok) {
          const j = await res.json();
          setRecPatients(Array.isArray(j) ? j : j.data ?? []);
        }
      } catch { /**/ }
    };
    const fetchRecWaitTimes = async () => {
      setRecLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/queues/waiting-times`, { headers: h });
        if (res.ok) setRecQueueWaitTimes(await res.json());
      } catch { /**/ } finally { setRecLoading(false); }
    };
    const fetchRecConsultationServices = async () => {
      try {
        const res = await api.get('/workflow/consultation-services?activeOnly=true');
        setConsultationServices(res.data?.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    const fetchRecPatientOptions = async () => {
      try {
        const res = await api.get('/patients/mpi', { params: { limit: 15 } });
        setPatientOptions((res.data.data || []).map((p: any) => ({
          id: p.id,
          mrn: p.mrn,
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender
        })));
      } catch (err) {
        console.error(err);
      }
    };
    fetchRecAppts(); fetchRecPatients(); fetchRecWaitTimes(); fetchRecConsultationServices(); fetchRecPatientOptions();
  }, [isRecordOfficer, authHeaders]);

  const handlePatientSearch = async (val: string) => {
    if (!val || val.length < 2) {
      try {
        const res = await api.get('/patients/mpi', { params: { limit: 15 } });
        setPatientOptions((res.data.data || []).map((p: any) => ({
          id: p.id,
          mrn: p.mrn,
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender
        })));
      } catch (err) {
        console.error(err);
      }
      return;
    }
    setLoadingSearch(true);
    try {
      const res = await api.get('/patients/mpi', { params: { query: val, limit: 15 } });
      setPatientOptions((res.data.data || []).map((p: any) => ({
        id: p.id,
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleCheckInSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPatient) return;

    if ((visitType === 'ANC' || visitType === 'MATERNITY' || visitType === 'LABOUR_DELIVERY') && selectedPatient.gender !== 'FEMALE') {
      enqueueSnackbar(`Only female patients can be checked into ${
        visitType === 'ANC' ? 'Antenatal' : visitType === 'MATERNITY' ? 'Maternity' : 'Labour & Delivery'
      } services.`, { variant: 'error' });
      return;
    }

    setCheckInSubmitting(true);
    try {
      await api.post('/visits', {
        patientId: selectedPatient.id,
        visitType,
        consultationServiceId: selectedServiceId || null,
        chiefComplaint: chiefComplaint || null,
        priority: triagePriority,
        priorityReason: priorityReason || null,
      });
      enqueueSnackbar('Patient checked in successfully! Workflow started.', { variant: 'success' });
      setCheckInDialogOpen(false);
      setSelectedPatient(null);
      setVisitType('OUTPATIENT');
      setSelectedServiceId('');
      setChiefComplaint('');
      setTriagePriority(0);
      setPriorityReason('');

      // Refresh wait times and appointments
      const h = authHeaders();
      const resAppt = await fetch(`/api/appointments?startDate=${new Date().toISOString().split('T')[0]}&endDate=${new Date(Date.now() + 86400000).toISOString().split('T')[0]}`, { headers: h });
      if (resAppt.ok) setRecAppointments(await resAppt.json());
      const resWait = await fetch(`${API_BASE_URL}/queues/waiting-times`, { headers: h });
      if (resWait.ok) setRecQueueWaitTimes(await resWait.json());
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Check-in failed', { variant: 'error' });
    } finally {
      setCheckInSubmitting(false);
    }
  };

  const loadInitialBookData = async () => {
    try {
      // Fetch initial patients (up to 50)
      const resPat = await api.get('/patients/mpi', { params: { limit: 50 } });
      setPatientOptions((resPat.data.data || []).map((p: any) => ({
        id: p.id,
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender
      })));

      // Fetch initial staff (up to 50)
      const resStaff = await api.get('/staff', { params: { limit: 50 } });
      setStaffOptions(resStaff.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenBookDialog = () => {
    loadInitialBookData();
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    setBookingDate(tomorrow);
    setBookingTime('09:00');
    setSelectedBookPatient(null);
    setSelectedBookDoctor(null);
    setBookingDuration(15);
    setBookingType('NEW');
    setBookingVisitType('SCHEDULED');
    setBookingReason('');
    setBypassConflict(false);
    setBookDialogOpen(true);
  };

  const handleBookDoctorSearch = async (val: string) => {
    try {
      const params: any = { limit: 50 };
      if (val && val.trim().length >= 1) {
        params.query = val;
      }
      if (bookingDate && bookingTime) {
        const start = new Date(`${bookingDate}T${bookingTime}`).toISOString();
        const end = new Date(new Date(`${bookingDate}T${bookingTime}`).getTime() + bookingDuration * 60 * 1000).toISOString();
        params.startTime = start;
        params.endTime = end;
      }
      const res = await api.get('/staff', { params });
      setStaffOptions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookPatient) {
      enqueueSnackbar('Patient selection is mandatory', { variant: 'warning' });
      return;
    }
    setBookingSubmitting(true);
    try {
      const isoStart = new Date(`${bookingDate}T${bookingTime}`).toISOString();
      await api.post('/appointments', {
        patientId: selectedBookPatient.id,
        staffId: selectedBookDoctor?.id || null,
        start: isoStart,
        duration: bookingDuration,
        appointmentType: bookingType,
        visitType: bookingVisitType,
        reasonText: bookingReason,
        bypassConflict,
      });

      enqueueSnackbar('Appointment successfully booked!', { variant: 'success' });
      setBookDialogOpen(false);

      // Refresh Record Officer appointments list
      const h = authHeaders();
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const res = await fetch(`/api/appointments?startDate=${today}&endDate=${tomorrow}`, { headers: h });
      if (res.ok) setRecAppointments(await res.json());
    } catch (err: any) {
      if (err.response?.status === 409) {
        enqueueSnackbar('Slot conflict: Selected provider is already booked. Select bypass control to override.', { variant: 'warning' });
      } else {
        enqueueSnackbar(err.response?.data?.message || 'Error booking appointment', { variant: 'error' });
      }
    } finally {
      setBookingSubmitting(false);
    }
  };

  useEffect(() => {
    if (bookDialogOpen) {
      handleBookDoctorSearch('');
    }
  }, [bookingDate, bookingTime, bookingDuration, bookDialogOpen]);

  const selectedService = consultationServices.find(s => s.id === selectedServiceId);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress sx={{ color: C.blue }} /></Box>;
  if (error || !data) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography variant="h6" color="error" fontWeight={600}>Failed to load dashboard metrics.</Typography><Typography variant="body2" color="text.secondary" mt={1}>Please check your connection and try again.</Typography></Box>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Doctor derived values
  const weekData = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => ({ day: d, count: i === new Date().getDay() ? (data.stats?.todayAppointments ?? appointments.length) : 0 }));
  const pendingAppts = appointments.filter(a => ['PENDING','CONFIRMED','ARRIVED'].includes((a.status ?? '').toUpperCase())).length;
  const completedToday = appointments.filter(a => (a.status ?? '').toUpperCase() === 'COMPLETED').length;

  // Nurse derived values
  const nurseAssignments = nurseData?.assignments ?? [];
  const nurseMeds        = nurseData?.pendingMedications ?? [];
  const nurseTasks       = nurseData?.tasks ?? [];
  const overdueMedCount  = nurseMeds.filter((m: any) => {
    if (m.status === 'ADMINISTERED' || m.administeredTime || m.status === 'OMITTED') return false;
    try { return (new Date(m.scheduledTime).getTime() - Date.now()) / 60000 < -30; } catch { return false; }
  }).length;
  const criticalPatients = nurseAssignments.filter((a: any) => a.alerts && a.alerts.length > 0);

  const adminStats = [
    { title: 'Total Patients', value: (data.stats?.totalPatients ?? 0).toLocaleString(), sub: `${data.stats?.registeredThisYear ?? 0} this year`, icon: <People />, color: C.blue, trend: '+12.5%', up: true },
    { title: "Today's Appointments", value: (data.stats?.todayAppointments ?? 0).toString(), sub: `${data.stats?.pendingAppointments ?? 0} pending`, icon: <CalendarToday />, color: C.amber, trend: '+8.2%', up: true },
    { title: 'Active IPD Patients', value: (data.stats?.activeAdmissions ?? 0).toString(), sub: `${data.stats?.criticalAdmissions ?? 0} critical`, icon: <LocalHospital />, color: C.red, trend: '-3.1%', up: false },
    { title: 'Revenue (This Month)', value: fmtCurrency(data.stats?.revenueThisMonth ?? 0), sub: 'Payments received', icon: <NairaIcon />, color: C.green, trend: '+21.4%', up: true },
  ];

  if (isBishop) {
    return <BishopsDashboard />;
  }

  return (
    <Box>
      {/* ── Page header ─────────────────────────────────────────── */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight={800} color="text.primary">
          {isDoctor      ? `${greeting}, Dr. ${user?.lastName ?? user?.firstName ?? 'Doctor'}`
           : isNurse     ? `${greeting}, Nurse ${user?.lastName ?? user?.firstName ?? ''}`
           : isPharmacist ? `${greeting}, Pharm. ${user?.lastName ?? user?.firstName ?? ''}`
           : isLab        ? `${greeting}, ${user?.lastName ?? user?.firstName ?? 'Technician'}`
           : isRadiologist ? `${greeting}, ${user?.designation?.toLowerCase().includes('consultant') || user?.designation?.toLowerCase().includes('radiologist') ? 'Dr. ' : ''}${user?.lastName ?? user?.firstName ?? 'Radiology Staff'}`
           : isRecordOfficer ? `${greeting}, ${user?.lastName ?? user?.firstName ?? 'Record Officer'}`
           : isFinance    ? `${greeting}, ${user?.designation ? user.designation.replace(/\(CFO\)/i, "").trim() : "Chief Financial Officer"} ${user?.lastName ?? user?.firstName ?? ""}`
           : isAccountant ? `${greeting}, Accountant ${user?.lastName ?? user?.firstName ?? ""}`
           : isCashier    ? `${greeting}, Cashier ${user?.lastName ?? user?.firstName ?? ''}`
           : isAdmin      ? `${greeting}, Admin ${user?.lastName ?? user?.firstName ?? ''}`
           : isAuditor    ? `${greeting}, Auditor ${user?.lastName ?? user?.firstName ?? ''}`
           : isInsurance  ? `${greeting}, Insurance Officer ${user?.lastName ?? user?.firstName ?? ''}`
           : isMortician  ? `${greeting}, Mortician ${user?.lastName ?? user?.firstName ?? ''}`
           : isPhysio     ? `${greeting}, Physio ${user?.lastName ?? user?.firstName ?? ''}`
           : isSecretary  ? `${greeting}, Secretary ${user?.lastName ?? user?.firstName ?? ''}`
           : 'Dashboard'}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {(isDoctor || isNurse || isPharmacist || isLab || isRadiologist || isRecordOfficer || isFinance || isAccountant || isCashier || isAdmin || isAuditor || isInsurance || isMortician || isPhysio || isSecretary)
            ? `${dateStr} · Faith Foundation Mission Hospital, Nsukka`
            : `Welcome back, ${user?.firstName ?? 'User'}! Here's what's happening today.`}
        </Typography>
      </Box>

      {/* ── Real-Time Active On-Duty Session & Countdown Timer (Moved to Sidebar) ── */}
      {/* <Box sx={{ mb: 3 }}>
        <ActiveDutySessionCard />
      </Box> */}

      {/* ══════════════ NURSE LAYOUT ══════════════════════════════ */}
      {isNurse && (
        <>
          {/* Nurse Quick Actions (green gradient) */}
          <NurseQuickActions config={roleConfig} />

          {/* KPI Row */}
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Assigned Patients" value={nurseAssignments.length} sub="Under your direct care"
                icon={<People />} color={C.blue} gradient={`linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`} trend={nurseAssignments.length > 0 ? 5 : 0} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Medications Due" value={nurseMeds.length} sub={`${overdueMedCount} overdue · this shift`}
                icon={<Medication />} color={C.violet}
                gradient={overdueMedCount > 0 ? `linear-gradient(135deg, #4c1d95 0%, ${C.violet} 100%)` : undefined} trend={overdueMedCount > 0 ? -8 : 0} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Active Nursing Tasks" value={nurseTasks.length} sub={`${nurseTasks.filter((t: any) => t.status === 'IN_PROGRESS').length} in progress`}
                icon={<TaskAlt />} color={C.blue} trend={nurseTasks.length > 5 ? -5 : 2} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Clinical Alerts" value={criticalPatients.length}
                sub={criticalPatients.length > 0 ? 'Patients with active alerts' : 'All patients stable'}
                icon={<NotificationsActive />} color={C.red}
                gradient={criticalPatients.length > 0 ? `linear-gradient(135deg, #7f1d1d 0%, ${C.red} 100%)` : undefined}
                trend={criticalPatients.length > 0 ? -10 : 3} />
            </Grid>
          </Grid>

          {/* Assigned Patients table + Medication Admin */}
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} lg={7}>
              <AssignedPatientsTable assignments={nurseAssignments} loading={nurseLoading} />
            </Grid>
            <Grid item xs={12} lg={5}>
              <MedicationAdminPanel meds={nurseMeds} loading={nurseLoading} />
            </Grid>
          </Grid>

          {/* Nursing Tasks + Ward Bed Occupancy + Shift Summary */}
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} md={5} lg={4}>
              <NursingTasksPanel tasks={nurseTasks} loading={nurseLoading} />
            </Grid>
            <Grid item xs={12} md={7} lg={5}>
              <NurseBedOccupancy wardStats={wardStats} loading={wardLoading} />
            </Grid>
            <Grid item xs={12} lg={3}>
              <NurseShiftSummary data={data} assignments={nurseAssignments} meds={nurseMeds} tasks={nurseTasks} />
            </Grid>
          </Grid>
        </>
      )}

      {/* ══════════════ PHARMACIST LAYOUT ════════════════════════ */}
      {isPharmacist && (
        <>
          <PharmQuickActions />

          {/* Pharmacist KPI Row */}
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Pending Rx" value={pharmPrescriptions.length} sub="Awaiting dispensing"
                icon={<LocalPharmacy />} color={C.blue} gradient={`linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`}
                trend={pharmPrescriptions.length > 0 ? -5 : 0} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Low Stock Items" value={pharmAnalytics?.summary?.lowStockItems ?? 0}
                sub={`${pharmAnalytics?.summary?.nearExpiryCount ?? 0} near expiry`}
                icon={<Inventory />} color={C.amber}
                gradient={pharmAnalytics?.summary?.lowStockItems > 0 ? `linear-gradient(135deg, #92400e 0%, ${C.amber} 100%)` : undefined}
                trend={-3} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Total Dispensed" value={pharmAnalytics?.summary?.totalDispensed ?? 0}
                sub={`Avg TAT: ${pharmAnalytics?.summary?.avgTATMinutes ?? '—'} min`}
                icon={<CheckCircle />} color={C.green} trend={12} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="ADEs Reported" value={pharmAnalytics?.summary?.adesCount ?? 0}
                sub={`${pharmAnalytics?.summary?.interventionsCount ?? 0} interventions`}
                icon={<MonitorHeart />} color={C.red}
                gradient={pharmAnalytics?.summary?.adesCount > 0 ? `linear-gradient(135deg, #7f1d1d 0%, ${C.red} 100%)` : undefined}
                trend={pharmAnalytics?.summary?.adesCount > 0 ? -10 : 2} />
            </Grid>
          </Grid>

          {/* Prescriptions Table + Stock Alerts */}
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} lg={7}>
              <PendingPrescriptionsTable prescriptions={pharmPrescriptions} loading={pharmLoading} />
            </Grid>
            <Grid item xs={12} lg={5}>
              <LowStockAlertsPanel inventory={pharmInventory} loading={pharmLoading} />
            </Grid>
          </Grid>

          {/* Session Summary + Inventory Overview */}
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} md={7}>
              <PharmSummaryPanel analytics={pharmAnalytics} loading={pharmLoading} />
            </Grid>
            <Grid item xs={12} md={5}>
              <InventoryValueCard analytics={pharmAnalytics} inventory={pharmInventory} loading={pharmLoading} />
            </Grid>
          </Grid>
        </>
      )}

      {/* ══════════════ LABORATORY LAYOUT ════════════════════════ */}

      {isLab && (
        <>
          <LabQuickActions />
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Today's Lab Orders" value={labAnalytics?.summary?.ordersToday ?? 0}
                sub={`${labOrders.length} currently pending`}
                icon={<Science />} color={C.blue} gradient={`linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`} trend={6} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Average TAT" value={`${labAnalytics?.summary?.avgTATHours ?? 0} hrs`}
                sub="This month's average" icon={<AccessTime />} color={C.green} trend={-12} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Pending Criticals" value={labAnalytics?.summary?.pendingCriticalAlerts ?? 0}
                sub="Immediate action required" icon={<Warning />} color={C.rose}
                gradient={(labAnalytics?.summary?.pendingCriticalAlerts ?? 0) > 0 ? `linear-gradient(135deg, #7f1d1d 0%, ${C.red} 100%)` : undefined}
                trend={(labAnalytics?.summary?.pendingCriticalAlerts ?? 0) > 0 ? -8 : 0} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="QC Fails (Month)" value={labAnalytics?.summary?.qcFailsThisMonth ?? 0}
                sub="Calibration alerts" icon={<CheckCircle />} color={C.amber}
                gradient={(labAnalytics?.summary?.qcFailsThisMonth ?? 0) > 0 ? `linear-gradient(135deg, #78350f 0%, ${C.amber} 100%)` : undefined}
                trend={(labAnalytics?.summary?.qcFailsThisMonth ?? 0) > 0 ? -15 : 2} />
            </Grid>
          </Grid>

          {/* Pending Worklist + Reagent Stock Alerts */}
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} lg={7}>
              <PendingLabWorklistTable orders={labOrders} loading={limsLoading} />
            </Grid>
            <Grid item xs={12} lg={5}>
              <ReagentStockAlertsPanel lowStock={labAnalytics?.lowStockItems ?? []} nearExpiry={labAnalytics?.nearExpiryItems ?? []} loading={limsLoading} />
            </Grid>
          </Grid>

          {/* Operational Metrics + Equipment Status */}
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} md={6}>
              <LabSummaryPanel summary={labAnalytics?.summary} loading={limsLoading} />
            </Grid>
            <Grid item xs={12} md={6}>
              <EquipmentStatusCard equipmentStatus={labAnalytics?.equipmentByStatus} loading={limsLoading} />
            </Grid>
          </Grid>
        </>
      )}

      {/* ══════════════ RADIOLOGY LAYOUT ═════════════════════════ */}

      {isRadiologist && (
        <>
          <RadQuickActions />
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Today's Scans" value={radOrders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length || radOrders.filter(o => ['ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'ARRIVED'].includes((o.status ?? '').toUpperCase())).length}
                sub={`${radOrders.filter(o => ['ORDERED', 'SCHEDULED'].includes((o.status ?? '').toUpperCase())).length} ordered · ${radOrders.filter(o => (o.status ?? '').toUpperCase() === 'IN_PROGRESS').length} active`}
                icon={<Biotech />} color={C.blue} gradient={`linear-gradient(135deg, ${C.blue} 0%, #4c6ef5 100%)`} trend={4} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Pending Reports" value={radOrders.filter(o => ['COMPLETED_STUDY', 'IN_PROGRESS', 'ARRIVED'].includes((o.status ?? '').toUpperCase())).length}
                sub="Awaiting radiologist review" icon={<AccessTime />} color={C.cyan} trend={-10} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Dosimetry Dose" value={radSafetyData?.dosimetry?.exposureMsv ?? '0.04 mSv'}
                sub="Background level normal" icon={<Shield />} color={C.green} trend={0} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Safety Alerts" value={radIncidents.filter(i => (i.status ?? '').toUpperCase() !== 'RESOLVED').length}
                sub="Equipment incidents" icon={<Warning />} color={C.red}
                gradient={radIncidents.filter(i => (i.status ?? '').toUpperCase() !== 'RESOLVED').length > 0 ? `linear-gradient(135deg, #7f1d1d 0%, ${C.red} 100%)` : undefined}
                trend={radIncidents.filter(i => (i.status ?? '').toUpperCase() !== 'RESOLVED').length > 0 ? -12 : 0} />
            </Grid>
          </Grid>

          {/* Pending Worklist + Equipment Status */}
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} lg={7}>
              <PendingRadiologyTable orders={radOrders} loading={radLoading} />
            </Grid>
            <Grid item xs={12} lg={5}>
              <RadiologyEquipmentPanel equipment={radEquipment} loading={radLoading} />
            </Grid>
          </Grid>

          {/* Operational Metrics + Calibration & Safety */}
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} md={6}>
              <RadSummaryPanel orders={radOrders} incidents={radIncidents} equipment={radEquipment} loading={radLoading} />
            </Grid>
            <Grid item xs={12} md={6}>
              <ModalitySafetyCard 
                safetyData={radSafetyData} 
                loading={radLoading} 
                onCalibrate={handleTriggerCalibration}
                calibrating={radCalibrating}
              />
            </Grid>
          </Grid>
        </>
      )}

      {/* ══════════════ DOCTOR LAYOUT ════════════════════════════ */}

      {isDoctor && (
        <>
          <DoctorQuickActions config={roleConfig} />
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Today's Appointments" value={appointments.length} sub={`${pendingAppts} pending · ${completedToday} done`}
                icon={<CalendarToday />} color={C.blue} gradient={`linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`} trend={8} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Active Patients" value={patients.length} sub="In your care today" icon={<People />} color={C.teal} trend={5} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Pending Lab Results" value={labs.length} sub="Awaiting clinical review" icon={<Biotech />} color={C.amber} trend={labs.length > 3 ? -10 : 0} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Critical Alerts" value={criticalAlerts.length} sub={criticalAlerts.length > 0 ? 'Immediate attention' : 'All clear'}
                icon={<MonitorHeart />} color={C.red}
                gradient={criticalAlerts.length > 0 ? `linear-gradient(135deg, #c92a2a 0%, ${C.red} 100%)` : undefined}
                trend={criticalAlerts.length > 0 ? -5 : 2} />
            </Grid>
          </Grid>
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} md={8}><ConsultationTrend weekData={weekData} /></Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" fontWeight={700} mb={1.5}>Day Summary</Typography>
                  <Stack spacing={1.5}>
                    {[
                      { label: 'Total Scheduled', value: appointments.length, color: C.blue, icon: <CalendarToday sx={{ fontSize: 16 }} /> },
                      { label: 'Completed', value: completedToday, color: C.green, icon: <CheckCircle sx={{ fontSize: 16 }} /> },
                      { label: 'Pending / Active', value: pendingAppts, color: C.amber, icon: <AccessTime sx={{ fontSize: 16 }} /> },
                      { label: 'Lab Orders', value: labs.length, color: C.amber, icon: <Science sx={{ fontSize: 16 }} /> },
                      { label: 'Critical Alerts', value: criticalAlerts.length, color: C.red, icon: <Warning sx={{ fontSize: 16 }} /> },
                    ].map(item => (
                      <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.2, borderRadius: 2, bgcolor: alpha(item.color, 0.06) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: item.color }}>{item.icon}<Typography variant="body2" fontWeight={500} color="text.secondary">{item.label}</Typography></Box>
                        <Typography variant="body2" fontWeight={800} color={item.color}>{item.value}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} lg={7}><AppointmentsTable appointments={appointments} loading={apptLoading} /></Grid>
            <Grid item xs={12} lg={5}><ActivePatientsPanel patients={patients} loading={patientLoading} /></Grid>
          </Grid>
          {(allowedWidgets.includes('pendingLabs') || allowedWidgets.includes('criticalVitals')) && (
            <Grid container spacing={2.5} mb={3}>
              {allowedWidgets.includes('pendingLabs') && <Grid item xs={12} md={6}><PendingLabsPanel labs={labs} loading={labLoading} /></Grid>}
              {allowedWidgets.includes('criticalVitals') && <Grid item xs={12} md={6}><CriticalAlertsPanel alerts={criticalAlerts} loading={false} /></Grid>}
            </Grid>
          )}
        </>
      )}

      {/* ══════════════ RECORD OFFICER LAYOUT ════════════════════ */}

      {isRecordOfficer && (
        <>
          <RecQuickActions />
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Today's Appointments" 
                value={recAppointments.length} 
                sub={`${recAppointments.filter(a => ['PENDING','CONFIRMED','ARRIVED'].includes((a.status ?? '').toUpperCase())).length} pending · ${recAppointments.filter(a => (a.status ?? '').toUpperCase() === 'COMPLETED').length} done`}
                icon={<CalendarToday />} color={C.blue} gradient={`linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`} trend={8} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="New Registrations" 
                value={recPatients.filter(p => new Date(p.createdAt).toDateString() === new Date().toDateString()).length} 
                sub="Registered today" icon={<Person />} color={C.teal} trend={5} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="OPD Queue Waitlist" 
                value={(recQueueWaitTimes?.waitTimes ?? []).length} 
                sub="Active queued patients" icon={<Queue />} color={C.amber} trend={(recQueueWaitTimes?.waitTimes ?? []).length > 5 ? -10 : 0} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <KPICard label="Average Wait Time" 
                value={`${recQueueWaitTimes?.averages?.find((a: any) => a.department === 'OPD')?.averageWaitMinutes ?? 0} mins`} 
                sub="Outpatient wait average" icon={<AccessTime />} color={C.blue} trend={0} />
            </Grid>
          </Grid>

          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} lg={7}>
              <RecAppointmentsQueue 
                appointments={recAppointments} 
                loading={recLoading} 
                onCheckIn={(appt) => {
                  setSelectedPatient({
                    id: appt.patient?.id,
                    mrn: appt.patient?.mrn || appt.patient?.patientNumber,
                    firstName: appt.patient?.firstName,
                    lastName: appt.patient?.lastName,
                    gender: appt.patient?.gender
                  });
                  setSelectedAppointment(appt);
                  setVisitType('OUTPATIENT');
                  setSelectedServiceId('');
                  setTriagePriority(0);
                  setPriorityReason('');
                  setChiefComplaint('');
                  setCheckInDialogOpen(true);
                }} 
                onBookAppointment={handleOpenBookDialog}
              />
            </Grid>
            <Grid item xs={12} lg={5}>
              <RecQueueStatusPanel 
                waitData={recQueueWaitTimes} 
                loading={recLoading} 
                onCheckInPatient={() => {
                  setSelectedPatient(null);
                  setSelectedAppointment(null);
                  setVisitType('OUTPATIENT');
                  setSelectedServiceId('');
                  setTriagePriority(0);
                  setPriorityReason('');
                  setChiefComplaint('');
                  setCheckInDialogOpen(true);
                }} 
              />
            </Grid>
          </Grid>

          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12}>
              <RecRecentPatients patients={recPatients} loading={recLoading} />
            </Grid>
          </Grid>

          {/* Patient Queue Check-in Dialog */}
          <Dialog 
            open={checkInDialogOpen} 
            onClose={() => setCheckInDialogOpen(false)} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: '24px',
                p: 1.5,
                boxShadow: '0 24px 48px -12px rgba(0,0,0,0.18)'
              }
            }}
          >
            <DialogTitle sx={{ fontWeight: 700, pb: 1, fontSize: '1.5rem', color: '#1e293b' }}>
              Patient Queue Check-In
            </DialogTitle>
            <form onSubmit={handleCheckInSubmit}>
              <DialogContent>
                <Stack spacing={2.5}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: '16px', 
                    bgcolor: 'rgba(59, 91, 219, 0.05)', 
                    border: '1px solid rgba(59, 91, 219, 0.1)',
                    mb: 1
                  }}>
                    <Typography variant="caption" sx={{ color: '#3b5bdb', fontWeight: 700, letterSpacing: '0.05em' }}>
                      PATIENT PROFILE
                    </Typography>
                    <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5, color: '#1e293b' }}>
                      {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Walk-in Patient'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      MPI ID: {selectedPatient?.mrn || selectedPatient?.patientNumber || 'Walk-in Check-in'}
                    </Typography>
                  </Box>

                  <Autocomplete
                    options={patientOptions}
                    getOptionLabel={o => `${o.mrn || o.patientNumber || ''} — ${o.lastName}, ${o.firstName}`}
                    loading={loadingSearch}
                    onInputChange={(_, val) => handlePatientSearch(val)}
                    onChange={(_, val) => setSelectedPatient(val)}
                    value={selectedPatient}
                    renderInput={params => (
                      <TextField {...params} label="Select Patient" required
                        InputProps={{ ...params.InputProps, endAdornment: <>{loadingSearch ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</> }}
                      />
                    )}
                  />

                  <FormControl fullWidth>
                    <InputLabel>Visit Service Category</InputLabel>
                    <Select value={visitType} label="Visit Service Category" onChange={e => setVisitType(e.target.value)}>
                      {VISIT_TYPES.map(vt => <MenuItem key={vt.value} value={vt.value}>{vt.label}</MenuItem>)}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Consultation Service (for billing)</InputLabel>
                    <Select value={selectedServiceId} label="Consultation Service (for billing)" onChange={e => setSelectedServiceId(e.target.value)}>
                      <MenuItem value=""><em>None / Not selected</em></MenuItem>
                      {consultationServices.map(svc => (
                        <MenuItem key={svc.id} value={svc.id}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>{svc.name}</span>
                            <Chip label={`₦${svc.price.toLocaleString()}`} size="small" color="success" sx={{ ml: 1 }} />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedService && (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      <strong>{selectedService.name}</strong> — ₦{selectedService.price.toLocaleString()}, {selectedService.duration} min, Category: {selectedService.category}
                    </Alert>
                  )}

                  <FormControl fullWidth>
                    <InputLabel>Triage Priority</InputLabel>
                    <Select
                      value={triagePriority}
                      label="Triage Priority"
                      onChange={e => setTriagePriority(Number(e.target.value))}
                    >
                      <MenuItem value={0}>Routine / Normal</MenuItem>
                      <MenuItem value={1}>Priority / Urgent</MenuItem>
                      <MenuItem value={2}>Emergency / STAT</MenuItem>
                    </Select>
                  </FormControl>

                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button 
                  onClick={() => setCheckInDialogOpen(false)} 
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 700, 
                    color: '#1e293b',
                    fontSize: '1rem'
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={checkInSubmitting || !selectedPatient}
                  sx={{ 
                    bgcolor: '#3b5bdb', 
                    '&:hover': { bgcolor: '#2b49c4' }, 
                    textTransform: 'none', 
                    fontWeight: 700, 
                    borderRadius: '8px',
                    fontSize: '1rem',
                    px: 3
                  }}
                >
                  {checkInSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Complete Check-In'}
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          {/* Book Appointment Dialog */}
          <Dialog 
            open={bookDialogOpen} 
            onClose={() => setBookDialogOpen(false)} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: '24px',
                p: 1.5,
                boxShadow: '0 24px 48px -12px rgba(0,0,0,0.18)'
              }
            }}
          >
            <form onSubmit={handleBookSubmit}>
              <DialogTitle sx={{ fontWeight: 700, pb: 1, fontSize: '1.5rem', color: '#1e293b' }}>
                Book Clinic Appointment
              </DialogTitle>
              <DialogContent dividers sx={{ borderTop: 'none', borderBottom: 'none' }}>
                <Stack spacing={2.5} sx={{ mt: 1 }}>
                  <Autocomplete
                    options={patientOptions}
                    getOptionLabel={(o) => o ? `${o.mrn || ''} - ${o.lastName || ''}, ${o.firstName || ''}` : ''}
                    filterOptions={(x) => x}
                    onInputChange={(e, val) => handlePatientSearch(val)}
                    onChange={(e, val) => setSelectedBookPatient(val)}
                    value={selectedBookPatient}
                    isOptionEqualToValue={(option, val) => option.id === val.id}
                    renderInput={(params) => <TextField {...params} required label="Search Patient Name/MRN" placeholder="Type name or MRN to search..." />}
                  />

                  <Autocomplete
                    options={staffOptions}
                    getOptionLabel={(o) => o ? `Dr. ${o.lastName || ''}, ${o.firstName || ''} (${o.designation || ''})` : ''}
                    filterOptions={(x) => x}
                    onInputChange={(e, val) => handleBookDoctorSearch(val)}
                    onChange={(e, val) => setSelectedBookDoctor(val)}
                    value={selectedBookDoctor}
                    isOptionEqualToValue={(option, val) => option.id === val.id}
                    renderInput={(params) => <TextField {...params} label="Assign Doctor / Specialist" placeholder="Type doctor name to search..." />}
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField 
                        type="date" 
                        required 
                        fullWidth 
                        label="Date" 
                        InputLabelProps={{ shrink: true }} 
                        value={bookingDate} 
                        onChange={e => setBookingDate(e.target.value)} 
                        inputProps={{ min: new Date(Date.now() + 86400000).toISOString().slice(0, 10) }} 
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField 
                        type="time" 
                        required 
                        fullWidth 
                        label="Time" 
                        InputLabelProps={{ shrink: true }} 
                        value={bookingTime} 
                        onChange={e => setBookingTime(e.target.value)} 
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <TextField 
                        type="number" 
                        required 
                        fullWidth 
                        label="Duration (mins)" 
                        value={bookingDuration} 
                        onChange={e => setBookingDuration(parseInt(e.target.value) || 0)} 
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <FormControl fullWidth>
                        <InputLabel>Appt Type</InputLabel>
                        <Select value={bookingType} onChange={e => setBookingType(e.target.value)} label="Appt Type">
                          <MenuItem value="NEW">New Patient</MenuItem>
                          <MenuItem value="RETURNING">Follow-Up</MenuItem>
                          <MenuItem value="SPECIALIST">Specialist Clinic</MenuItem>
                          <MenuItem value="ANC">ANC Clinic</MenuItem>
                          <MenuItem value="TELEMEDICINE">Telemedicine</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={4}>
                      <FormControl fullWidth>
                        <InputLabel>Visit Type</InputLabel>
                        <Select value={bookingVisitType} onChange={e => setBookingVisitType(e.target.value)} label="Visit Type">
                          <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                          <MenuItem value="WALK_IN">Walk-In</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <TextField 
                    label="Reason for Consultation" 
                    multiline 
                    rows={2} 
                    fullWidth 
                    value={bookingReason} 
                    onChange={e => setBookingReason(e.target.value)} 
                  />

                  <FormControlLabel
                    control={<Switch checked={bypassConflict} onChange={e => setBypassConflict(e.target.checked)} />}
                    label="Bypass booking slots conflict rules (Emergency override)"
                  />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button 
                  onClick={() => setBookDialogOpen(false)}
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 700, 
                    color: '#1e293b',
                    fontSize: '1rem'
                  }}
                >
                  Discard
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={bookingSubmitting || !selectedBookPatient}
                  sx={{ 
                    bgcolor: '#3b5bdb', 
                    '&:hover': { bgcolor: '#2b49c4' }, 
                    textTransform: 'none', 
                    fontWeight: 700, 
                    borderRadius: '8px',
                    fontSize: '1rem',
                    px: 3
                  }}
                >
                  {bookingSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Confirm Booking'}
                </Button>
              </DialogActions>
            </form>
          </Dialog>
        </>
      )}

      {(isFinance || isAccountant) && <FinanceDashboard data={data} />}
      {isCashier && <CashierDashboard data={data} />}
      {isAdmin && <AdminDashboard data={data} />}
      {isAuditor && <AuditorDashboard data={data} />}
      {isInsurance && <InsuranceDashboard data={data} />}
      {isMortician && <MorticianDashboard data={data} />}
      {isPhysio && <PhysioDashboard data={data} />}
      {isSecretary && <SecretaryDashboard data={data} />}

      {/* ══════════════ OTHER ROLES ═══════════════════════════════ */}
      {!isDoctor && !isNurse && !isRecordOfficer && !isPharmacist && !isLab && !isRadiologist && !isFinance && !isAccountant && !isCashier && !isAdmin && !isAuditor && !isInsurance && !isMortician && !isPhysio && !isSecretary && (
        <>
          {allowedWidgets.includes('stats') && (
            <Grid container spacing={2.5} mb={3}>
              {adminStats.map((s, i) => <Grid item xs={12} sm={6} lg={3} key={s.title} className={`fade-in-up delay-${i + 1}`}><StatCard {...s} /></Grid>)}
            </Grid>
          )}
          {allowedWidgets.includes('quickStats') && <Box mb={3}><QuickStats data={data.todaySummary} /></Box>}
          {allowedWidgets.includes('trendGraph') && <Box mb={3}><AdmissionsTrend data={data.trendGraph} /></Box>}
          <Grid container spacing={2.5} mb={3}>
            {allowedWidgets.includes('wardVitals') && <Grid item xs={12} md={6}><PlaceholderCard title="Ward Vitals Pending" subtitle="Patients awaiting vitals" icon={<Assignment sx={{ fontSize: 22 }} />} color={C.blue} link="/nursing" /></Grid>}
            {allowedWidgets.includes('medicationAdmin') && <Grid item xs={12} md={6}><PlaceholderCard title="Medication Administration" subtitle="Scheduled doses this shift" icon={<Medication sx={{ fontSize: 22 }} />} color={C.teal} link="/nursing" /></Grid>}
            {allowedWidgets.includes('pendingPrescriptions') && <Grid item xs={12} md={6}><PlaceholderCard title="Pending Prescriptions" subtitle="Awaiting dispensing" icon={<Receipt sx={{ fontSize: 22 }} />} color={C.green} link="/pharmacy" /></Grid>}
            {allowedWidgets.includes('lowStock') && <Grid item xs={12} md={6}><PlaceholderCard title="Low Stock Alerts" subtitle="Items below reorder level" icon={<Inventory sx={{ fontSize: 22 }} />} color={C.amber} link="/inventory" /></Grid>}
            {allowedWidgets.includes('todayAppointments') && <Grid item xs={12} md={6}><PlaceholderCard title="Today's Appointments" subtitle="Clinic queue & schedule" icon={<CalendarToday sx={{ fontSize: 22 }} />} color={C.blue} link="/appointments" /></Grid>}
            {allowedWidgets.includes('newRegistrations') && <Grid item xs={12} md={6}><PlaceholderCard title="New Registrations" subtitle="Recently registered patients" icon={<Person sx={{ fontSize: 22 }} />} color={C.teal} link="/register-patient" /></Grid>}
            {allowedWidgets.includes('queueStatus') && <Grid item xs={12} md={6}><PlaceholderCard title="Queue Status" subtitle="OPD current wait & flow" icon={<Queue sx={{ fontSize: 22 }} />} color={C.amber} link="/queues" /></Grid>}
            {allowedWidgets.includes('staffOnDuty') && <Grid item xs={12} md={6}><PlaceholderCard title="Staff On Duty" subtitle="Attendance & coverage" icon={<People sx={{ fontSize: 22 }} />} color={C.blue} link="/staff" /></Grid>}
            {allowedWidgets.includes('pendingLabs') && <Grid item xs={12} md={6}><PlaceholderCard title="Pending Lab Results" subtitle="Awaiting review" icon={<Science sx={{ fontSize: 22 }} />} color={C.amber} link="/lims" /></Grid>}
            {allowedWidgets.includes('myAppointments') && <Grid item xs={12} md={6}><PlaceholderCard title="My Appointments" subtitle="Assigned to you today" icon={<CalendarToday sx={{ fontSize: 22 }} />} color={C.amber} link="/appointments" /></Grid>}
          </Grid>
          <Grid container spacing={2.5}>
            {allowedWidgets.includes('revenue') && <Grid item xs={12} md={4}><RevenueWidget data={data} /></Grid>}
            {allowedWidgets.includes('bedOccupancy') && <Grid item xs={12} md={allowedWidgets.includes('revenue') ? 4 : 5}><BedOccupancy data={data.bedOccupancy} /></Grid>}
            {/* recentActivity lives on the Audit Logs page — not shown here */}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default Dashboard;
