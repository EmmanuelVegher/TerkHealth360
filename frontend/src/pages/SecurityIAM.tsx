import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Tabs, Tab, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert,
  LinearProgress, Divider, IconButton, Stack, Avatar, Tooltip,
  InputAdornment, Switch, FormControlLabel
} from '@mui/material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip
} from 'recharts';
import {
  Shield, Lock, Fingerprint, Gavel, Add, Search, Refresh, CheckCircle,
  Warning, Cancel, Send, FileDownload, Assessment, ArrowForward, Verified,
  Devices, Security, Dns, HistoryEdu, LockOpen
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { OpenMedAssistant } from '../components/OpenMedAssistant';

// ─── Design Tokens & Theme Formatting ────────────────────────────────────────
const PRIMARY = '#0f172a';
const SECONDARY = '#334155';
const SUCCESS = '#16a34a';
const WARNING = '#d97706';
const DANGER = '#dc2626';
const PURPLE = '#7c3aed';
const TEAL = '#0d9488';
const GOLD = '#ca8a04';

const COLORS = ['#16a34a', '#dc2626', '#3b82f6', '#7c3aed', '#0f172a', '#334155'];

// ─── Sub-Tab Panel Helper ────────────────────────────────────────────────────
function TabPanel({ children, value, index }: any) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ─── KPI Card Component ──────────────────────────────────────────────────────
const KPICard = ({ title, value, sub, icon, color }: any) => (
  <Card sx={{
    background: `linear-gradient(135deg, ${color}ee, ${color}aa)`,
    color: '#fff', borderRadius: 3, boxShadow: `0 8px 32px ${color}33`,
    position: 'relative', overflow: 'hidden',
  }}>
    <CardContent sx={{ pb: '16px !important' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>{title}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{value}</Typography>
          {sub && <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>{sub}</Typography>}
        </Box>
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

const StatusChip = ({ label }: { label: string }) => {
  let color: 'success' | 'info' | 'warning' | 'error' | 'default' = 'default';
  const l = label?.toUpperCase();
  if (['CERTIFIED', 'APPROVED', 'ACTIVE', 'TRUSTED', 'BLOCKED', 'ENROLLED'].includes(l)) color = 'success';
  if (['PENDING_REVIEW', 'NEW', 'FLAGGED', 'UNDER_REVIEW', 'SMS_OTP'].includes(l)) color = 'warning';
  if (['CRITICAL', 'LIFE_THREATENING', 'FAILED', 'HIGH', 'UNACKNOWLEDGED'].includes(l)) color = 'error';
  if (['AUTHENTICATOR_APP', 'CONFIDENTIAL', 'RESTRICTED', 'INTERNAL'].includes(l)) color = 'info';

  return <Chip label={label?.replace('_', ' ')} size="small" color={color} sx={{ fontWeight: 700, fontSize: '0.68rem' }} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SECURITY IAM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const SecurityIAM = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // ─── Data States ──────────────────────────────────────────────────────────
  const [mfaUsers, setMfaUsers] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});

  // ─── Dialog States ────────────────────────────────────────────────────────
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [breakGlassDialogOpen, setBreakGlassDialogOpen] = useState(false);

  // ─── Sub-Tab Index States ──────────────────────────────────────────────────
  const [subTab0, setSubTab0] = useState(0);
  const [subTab1, setSubTab1] = useState(0);
  const [subTab2, setSubTab2] = useState(0);
  const [subTab3, setSubTab3] = useState(0);

  // ─── Fetch All Data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mfRes, inRes, deRes, ceRes, biRes] = await Promise.all([
        api.get('/security/mfa'),
        api.get('/security/incidents'),
        api.get('/security/devices'),
        api.get('/security/certifications'),
        api.get('/security/analytics'),
      ]);
      setMfaUsers(mfRes.data.data || []);
      setIncidents(inRes.data.data || []);
      setDevices(deRes.data.data || []);
      setCertifications(ceRes.data.data || []);
      setAnalytics(biRes.data.data || {});
    } catch {
      enqueueSnackbar('Failed to load Security IAM database', { variant: 'error' });
    }
    setLoading(false);
  }, [enqueueSnackbar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Action Handlers ───────────────────────────────────────────────────────
  const handleEnrollMFA = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/security/mfa/enroll', {
        username: fd.get('username'),
        method: fd.get('method'),
      });
      enqueueSnackbar('MFA factors successfully registered & verified', { variant: 'success' });
      setMfaDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to enroll MFA', { variant: 'error' });
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/security/devices', {
        name: fd.get('name'),
        type: fd.get('type'),
        os: fd.get('os'),
      });
      enqueueSnackbar('Device validated & Zero Trust certificate assigned', { variant: 'success' });
      setDeviceDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to register device', { variant: 'error' });
    }
  };

  const handleCreateIncident = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/security/incidents', {
        sourceIp: fd.get('sourceIp'),
        eventName: fd.get('eventName'),
        severity: fd.get('severity'),
        targetUser: fd.get('targetUser'),
        mitigation: fd.get('mitigation'),
      });
      enqueueSnackbar('Security threat logged & mitigated by gatekeeper', { variant: 'error' });
      setIncidentDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to record incident', { variant: 'error' });
    }
  };

  const handleCertifyAccess = async (id: string, status: string) => {
    try {
      await api.patch(`/security/certifications/${id}/certify`, { status });
      enqueueSnackbar(`Access privileges marked as ${status}`, { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to update certification', { variant: 'error' });
    }
  };

  const handleBreakGlassOverride = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/roles/break-glass', {
        reason: fd.get('reason'),
        actionPerformed: fd.get('actionPerformed'),
      });
      enqueueSnackbar('Break Glass clinical emergency override logged to audit', { variant: 'error' });
      setBreakGlassDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to trigger emergency override', { variant: 'error' });
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 24.1: Authentication & MFA
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab1 = () => (
    <Box>
      <Tabs value={subTab0} onChange={(_, v) => setSubTab0(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['MFA Enrollment Status', 'Self-Service Recovery Policies'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab0 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 24.1.1 MFA ── */}
      <TabPanel value={subTab0} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Multi-Factor Authentication (MFA) Enrollment (FR-IAM-013)</Typography>
          <Button variant="contained" startIcon={<Fingerprint />} onClick={() => setMfaDialogOpen(true)} sx={{ bgcolor: PURPLE }}>Configure MFA Factor</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY }}>
              <TableRow>{['User Account ID', 'Username / ID', 'MFA Enrolled', 'Authentication Method Factor', 'Last Authentication Timestamp'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {mfaUsers.map(u => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{u.id}</TableCell>
                  <TableCell sx={{ fontWeight: 650 }}>{u.username}</TableCell>
                  <TableCell>{u.enrolled ? '✅ Enrolled' : '❌ Disabled'}</TableCell>
                  <TableCell><StatusChip label={u.method} /></TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{u.lastUsed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 24.1.2 Recovery ── */}
      <TabPanel value={subTab0} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Account Recovery Policy Settings (FR-IAM-031–034)</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Self-service recovery OTP templates require multi-channel verification rules before changing user credentials.
              </Typography>
              <Stack spacing={1.5}>
                <FormControlLabel control={<Switch checked={true} disabled />} label="Enforce minimum 8 characters with symbol requirements" />
                <FormControlLabel control={<Switch checked={true} disabled />} label="5 failed attempts lock out account for 15 minutes" />
                <FormControlLabel control={<Switch checked={true} disabled />} label="Mandatory MFA Step-up for off-schedule clinical shifts" />
              </Stack>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2, borderLeft: `4px solid ${SUCCESS}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: SUCCESS, mb: 1 }}>Self-Service Password Reset (UC-IAM-002)</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Initiate a mock self-service verification checklist. Invalidates other concurrent active sessions upon execution.
              </Typography>
              <Button variant="outlined" color="success" onClick={() => enqueueSnackbar('Self-service password reset link sent to your registered email address', { variant: 'info' })}>Trigger Password Reset Simulator</Button>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 24.2: Authorization & Overrides
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab2 = () => (
    <Box>
      <Tabs value={subTab1} onChange={(_, v) => setSubTab1(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['RBAC Permissions Catalog', 'Break Glass Override Logs'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab1 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 24.2.1 Permissions ── */}
      <TabPanel value={subTab1} index={0}>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY }}>
              <TableRow>{['Role', 'Description', 'Clinical Module Access', 'Financial Permission', 'Sensitive Program Access (HIV/ART)'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              <TableRow hover>
                <TableCell sx={{ fontWeight: 700 }}>Super Admin</TableCell>
                <TableCell>Full system access overrides</TableCell>
                <TableCell sx={{ color: SUCCESS, fontWeight: 700 }}>READ/WRITE</TableCell>
                <TableCell sx={{ color: SUCCESS, fontWeight: 700 }}>READ/WRITE</TableCell>
                <TableCell sx={{ color: SUCCESS, fontWeight: 700 }}>READ/WRITE</TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ fontWeight: 700 }}>Clinician Doctor</TableCell>
                <TableCell>Clinical workspace, encounter logs</TableCell>
                <TableCell sx={{ color: SUCCESS, fontWeight: 700 }}>READ/WRITE</TableCell>
                <TableCell sx={{ color: DANGER }}>NONE</TableCell>
                <TableCell sx={{ color: WARNING, fontWeight: 700 }}>CARE_TEAM_ONLY (ABAC)</TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ fontWeight: 700 }}>Billing Officer</TableCell>
                <TableCell>Revenue cycle management, cashier invoices</TableCell>
                <TableCell sx={{ color: DANGER }}>NONE</TableCell>
                <TableCell sx={{ color: SUCCESS, fontWeight: 700 }}>READ/WRITE</TableCell>
                <TableCell sx={{ color: DANGER }}>NONE</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 24.2.2 Break Glass ── */}
      <TabPanel value={subTab1} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Clinical Emergency Override (UC-AUTH-002)</Typography>
            <Typography variant="caption" color="text.secondary">Use ONLY when vital signs require immediate restricted clinical records access. Events are forwarded directly to the Security Committee.</Typography>
          </Box>
          <Button variant="contained" startIcon={<LockOpen />} onClick={() => setBreakGlassDialogOpen(true)} sx={{ bgcolor: DANGER }}>Invoke Break Glass</Button>
        </Box>
        <Alert severity="warning" sx={{ mb: 2 }}>
          FR-AUTH-027 · Invoking emergency Break Glass triggers enhanced audit tracking. Multi-party verification checks are validated post-event.
        </Alert>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 24.3: Cybersecurity & Threat Monitoring
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab3 = () => (
    <Box>
      <Tabs value={subTab2} onChange={(_, v) => setSubTab2(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['Threat Intelligence Logs', 'Zero Trust Trusted Devices'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab2 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 24.3.1 Threats ── */}
      <TabPanel value={subTab2} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Real-Time Threat Detection Alerts (FR-SEC-011–020)</Typography>
          <Button variant="contained" startIcon={<Warning />} onClick={() => setIncidentDialogOpen(true)} sx={{ bgcolor: DANGER }}>Simulate Threat Alert</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: DANGER }}>
              <TableRow>{['Incident ID', 'Attacker IP Address', 'Threat Type Name', 'Severity', 'Target Account', 'Incident Timestamp', 'Status', 'Automated Mitigation Action'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {incidents.map(inc => (
                <TableRow key={inc.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{inc.id}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{inc.sourceIp}</TableCell>
                  <TableCell sx={{ fontWeight: 650 }}>{inc.eventName?.replace('_', ' ')}</TableCell>
                  <TableCell><StatusChip label={inc.severity} /></TableCell>
                  <TableCell>{inc.targetUser}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{inc.timestamp}</TableCell>
                  <TableCell><StatusChip label={inc.status} /></TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', color: SECONDARY }}>{inc.mitigation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 24.3.2 Zero Trust ── */}
      <TabPanel value={subTab2} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Zero Trust Device Directory (FR-SEC-035)</Typography>
          <Button variant="contained" startIcon={<Devices />} onClick={() => setDeviceDialogOpen(true)} sx={{ bgcolor: TEAL }}>Enroll Device</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: TEAL }}>
              <TableRow>{['Device ID', 'Device Label Name', 'Endpoint Type', 'Operating System', 'Last Security Patch', 'Encryption Active', 'Trust Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {devices.map(dev => (
                <TableRow key={dev.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{dev.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{dev.name}</TableCell>
                  <TableCell><Chip label={dev.type} size="small" /></TableCell>
                  <TableCell>{dev.os}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{dev.lastPatchDate}</TableCell>
                  <TableCell>{dev.encryptionActive ? '🔒 AES-256 Enabled' : '🔓 Disabled'}</TableCell>
                  <TableCell><StatusChip label={dev.trustStatus} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 24.4: Governance & Compliance
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab4 = () => (
    <Box>
      <Tabs value={subTab3} onChange={(_, v) => setSubTab3(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['Periodic Access Certification Campaigns', 'Security Maturity Scorecard'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab3 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 24.4.1 Certification ── */}
      <TabPanel value={subTab3} index={0}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Managerial Access Audits (FR-GOV-001–005)</Typography>
          <Typography variant="caption" color="text.secondary">Periodic certification campaigns require department managers to audit staff privileges. Dormant or excessive privileges must be revoked.</Typography>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PURPLE }}>
              <TableRow>{['Cert ID', 'Staff Username', 'Assigned Roles', 'Steward Department', 'Designated Reviewer', 'Review Date', 'Campaign Status', 'Actions'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {certifications.map(cert => (
                <TableRow key={cert.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{cert.id}</TableCell>
                  <TableCell sx={{ fontWeight: 650 }}>{cert.username}</TableCell>
                  <TableCell>{cert.role}</TableCell>
                  <TableCell><Chip label={cert.department} size="small" variant="outlined" /></TableCell>
                  <TableCell>{cert.reviewer}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{cert.dateReviewed}</TableCell>
                  <TableCell><StatusChip label={cert.status} /></TableCell>
                  <TableCell>
                    {cert.status === 'PENDING_REVIEW' && (
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="contained" color="success" onClick={() => handleCertifyAccess(cert.id, 'CERTIFIED')}>Certify</Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => handleCertifyAccess(cert.id, 'REVOKED')}>Revoke</Button>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 24.4.2 Dashboard BI ── */}
      <TabPanel value={subTab3} index={1}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}><KPICard title="MFA Adoption Rate" value={`${analytics.mfaEnrolledCount || 0} / ${analytics.totalMFAUsers || 0}`} sub="Enrolled user accounts" icon={<Fingerprint />} color={SUCCESS} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Active SIEM Incidents" value={analytics.activeIncidents || 0} sub="Brute-force/Anomalous attempts" icon={<Warning />} color={DANGER} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Zero Trust Enrolled" value={analytics.trustedDevicesCount || 0} sub="Trusted desktops & mobile" icon={<Devices />} color={TEAL} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="NDPA Compliance status" value="100% Compliant" sub="Nigeria Data Protection compliance" icon={<Verified />} color={PRIMARY} /></Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: PRIMARY }}>MFA Adoption Mix (BI Analytics)</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={analytics.distributionByMFA || []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                    {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, p: 2, borderLeft: `4px solid ${WARNING}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: WARNING, mb: 1 }}>API Integrity & Audit logs</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                All authorization audits use HMAC sha256 checksum validations to detect tampered database entries (BR-SEC-002).
              </Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">OAuth 2.0 Identity Server status:</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS }}>ONLINE</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Dormant clinical account locks:</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>Enabled (90 Days)</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Machine identity API throughput:</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS }}>Normal (SLA met)</Typography></Stack>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN COMPONENT BUILD
  // ══════════════════════════════════════════════════════════════════════════
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/security-iam/rbac') setActiveTab(0);
    else if (path === '/security-iam/mfa') setActiveTab(0);
    else if (path === '/security-iam/audit-logs') setActiveTab(2);
    else if (path === '/security-iam/break-glass') setActiveTab(1);
    else setActiveTab(0);
  }, [location.pathname]);

  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/security-iam/rbac') {
      return {
        title: 'Role-Based Access Control (RBAC) & Permission Matrices',
        subtitle: 'Role Hierarchy Catalog · Designation Scope Rules · Granular API Entitlements',
        category: 'Security IAM',
        kpis: [
          { label: 'Role Definitions', value: '8 Roles', subtitle: 'Designations Catalog', icon: <Shield />, color: PRIMARY },
          { label: 'System Permissions', value: '45 Rules', subtitle: 'Granular Scopes', icon: <Lock />, color: TEAL },
          { label: 'Privilege Reviews', value: '100% Passed', subtitle: 'Quarterly Audit', icon: <Verified />, color: SUCCESS },
          { label: 'Access Violations', value: '0 Breaches', subtitle: 'Zero Trust Control', icon: <Security />, color: PURPLE },
        ],
      };
    }

    if (path === '/security-iam/mfa') {
      return {
        title: 'Multi-Factor Authentication (MFA) & Password Policy',
        subtitle: 'TOTP Authenticator Apps · SMS OTP Enrolment · Zero-Trust Device Binding',
        category: 'Security IAM',
        kpis: [
          { label: 'Active MFA Users', value: `${mfaUsers.filter(u=>u.enrolled).length || 0} Staff`, subtitle: 'MFA Enrolled', icon: <Fingerprint />, color: PRIMARY },
          { label: 'MFA Adoption', value: '94%', subtitle: 'Clinical Staff Rate', icon: <CheckCircle />, color: SUCCESS },
          { label: 'Trusted Devices', value: `${devices.length || 0} Devices`, subtitle: 'Zero Trust Enrolled', icon: <Devices />, color: TEAL },
          { label: 'Failed OTP Attempts', value: '0 Locked', subtitle: 'Brute Force Shield', icon: <Warning />, color: WARNING },
        ],
      };
    }

    if (path === '/security-iam/audit-logs') {
      return {
        title: 'SIEM Audit Trail & Security Logs Explorer',
        subtitle: 'Real-Time Audit Trail · Tamper-Evident SHA256 Logs · IP Excursion Tracking',
        category: 'Security IAM',
        kpis: [
          { label: 'SIEM Log Entries', value: '14,250 Events', subtitle: '24h Log Volume', icon: <Dns />, color: PURPLE },
          { label: 'Log Integrity', value: '100% SHA256', subtitle: 'HMAC Validated', icon: <CheckCircle />, color: SUCCESS },
          { label: 'Threat Alerts', value: `${incidents.filter(i=>i.status!=='RESOLVED').length || 0} Alerts`, subtitle: 'Active SIEM Alarms', icon: <Security />, color: DANGER },
          { label: 'Retention Days', value: '365 Days', subtitle: 'NDPA/HIPAA Compliant', icon: <HistoryEdu />, color: PRIMARY },
        ],
      };
    }

    if (path === '/security-iam/break-glass') {
      return {
        title: 'Break-Glass Emergency Access & Incident Protocol Desk',
        subtitle: 'Emergency Bypass Overrides · High-Risk Clinical Override Audits · Incident Review',
        category: 'Security IAM',
        kpis: [
          { label: 'Break-Glass Overrides', value: '1 Active', subtitle: 'Emergency Elevation', icon: <LockOpen />, color: DANGER },
          { label: 'Justification Audits', value: '100% Logged', subtitle: 'Post-Emergency Check', icon: <Gavel />, color: WARNING },
          { label: 'Review Sign-Off', value: 'Pending MD', subtitle: 'Director Sign-Off', icon: <Assessment />, color: TEAL },
          { label: 'Incident Escalation', value: 'Level 1 Alert', subtitle: 'Protocol Active', icon: <Warning />, color: PURPLE },
        ],
      };
    }

    // Default: Users
    return {
      title: 'Identity Access Management & User Credentials Master',
      subtitle: 'Staff User Directory · MFA Enrolments · Adaptive Lockouts · NDPA Privacy Audits',
      category: 'Security IAM',
      kpis: [
        { label: 'Active MFA Users', value: `${mfaUsers.filter(u=>u.enrolled).length || 0} Staff`, subtitle: 'Authenticator Enrolled', icon: <Fingerprint />, color: PRIMARY },
        { label: 'Trusted Devices', value: `${devices.length || 0} Units`, subtitle: 'Zero Trust Enrolled', icon: <Devices />, color: TEAL },
        { label: 'Threat Alerts', value: `${incidents.filter(i=>i.status!=='RESOLVED').length || 0} Active`, subtitle: 'Gatekeeper Alarms', icon: <Security />, color: DANGER },
        { label: 'Certifications', value: `${certifications.filter(c=>c.status==='PENDING_REVIEW').length || 0} Pending`, subtitle: 'Managerial Audits', icon: <HistoryEdu />, color: WARNING },
      ],
    };
  };

  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
      {/* Banner */}
      <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 50%, ${TEAL} 100%)`, color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Security &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              🛡️ {pageDetails.title}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.88, fontWeight: 500, display: 'block', mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh Security logs"><IconButton onClick={fetchData} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}><Refresh /></IconButton></Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* KPIStrip */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Grid container spacing={2}>
          {pageDetails.kpis.map((kpi, idx) => (
            <Grid item xs={6} md={3} key={idx}>
              <KPICard title={kpi.label} value={kpi.value} sub={kpi.subtitle} icon={kpi.icon} color={kpi.color} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 3, bgcolor: '#fff', borderRadius: 3, px: 1, py: 0.5, boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48, fontSize: '0.88rem' },
            '& .Mui-selected': { fontWeight: 800, color: `${PURPLE} !important` },
            '& .MuiTabs-indicator': { bgcolor: PURPLE, height: 3, borderRadius: 2 } }}>
          <Tab icon={<Lock />} iconPosition="start" label="§24.1 MFA & Passwords" />
          <Tab icon={<Verified />} iconPosition="start" label="§24.2 Access Control & Overrides" />
          <Tab icon={<Dns />} iconPosition="start" label="§24.3 Cybersecurity Alerts & SIEM" />
          <Tab icon={<Gavel />} iconPosition="start" label="§24.4 Governance Certifications BI" />
          <Tab icon={<Shield sx={{ color: '#16a34a' }} />} iconPosition="start" label="§24.5 OpenMed™ NDPR PII Inspector" />
        </Tabs>

        <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>
          {activeTab === 0 && renderTab1()}
          {activeTab === 1 && renderTab2()}
          {activeTab === 2 && renderTab3()}
          {activeTab === 3 && renderTab4()}
          {activeTab === 4 && (
            <OpenMedAssistant
              defaultNotes="Patient Alhaji Ibrahim Babangida (NIN: 23499102931, Phone: 08023456789, Address: No 15 Mission Road, Makurdi) diagnosed with Falciparum Malaria. Email contact: ibrahim.b@gmail.com."
              patientName="Audited Patient"
            />
          )}
        </Card>
      </Box>

      {/* Modals */}

      {/* Enroll MFA Dialog */}
      <Dialog open={mfaDialogOpen} onClose={() => setMfaDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleEnrollMFA}>
          <DialogTitle sx={{ fontWeight: 800 }}>Enroll MFA Factor factor</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="User Account Username" name="username" size="small" fullWidth required placeholder="e.g. nurse.joy" />
              <TextField select label="Verification Factor Method" name="method" size="small" fullWidth defaultValue="AUTHENTICATOR_APP"><MenuItem value="AUTHENTICATOR_APP">Authenticator App OTP</MenuItem><MenuItem value="SMS_OTP">SMS Mobile OTP</MenuItem></TextField>
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setMfaDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Register Factor</Button></DialogActions>
        </form>
      </Dialog>

      {/* Register Device Dialog */}
      <Dialog open={deviceDialogOpen} onClose={() => setDeviceDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleRegisterDevice}>
          <DialogTitle sx={{ fontWeight: 800 }}>Enroll Trusted Device (Zero Trust)</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Device Label Name" name="name" size="small" fullWidth required placeholder="e.g. Lab Triage Desktop" />
              <TextField select label="Endpoint Type" name="type" size="small" fullWidth defaultValue="DESKTOP"><MenuItem value="DESKTOP">Desktop PC</MenuItem><MenuItem value="MOBILE">Mobile Smartphone</MenuItem><MenuItem value="TABLET">Tablet workstation</MenuItem></TextField>
              <TextField label="Operating System & version" name="os" size="small" fullWidth required placeholder="e.g. Windows 11 Build 22H2" />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setDeviceDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Register Device</Button></DialogActions>
        </form>
      </Dialog>

      {/* Simulate Threat Dialog */}
      <Dialog open={incidentDialogOpen} onClose={() => setIncidentDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateIncident}>
          <DialogTitle sx={{ fontWeight: 800 }}>Simulate Threat Alert (SIEM)</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Attacker Source IP" name="sourceIp" size="small" fullWidth required placeholder="e.g. 197.210.12.8" />
              <TextField select label="Incident Threat Name" name="eventName" size="small" fullWidth defaultValue="BRUTE_FORCE_ATTEMPT"><MenuItem value="BRUTE_FORCE_ATTEMPT">Brute-Force Login attempts</MenuItem><MenuItem value="ANOMALOUS_OFF_SHIFT_LOGIN">Anomalous Off-Shift Login</MenuItem></TextField>
              <TextField select label="Severity Level" name="severity" size="small" fullWidth defaultValue="HIGH"><MenuItem value="HIGH">High Severity</MenuItem><MenuItem value="MEDIUM">Medium Severity</MenuItem></TextField>
              <TextField label="Target Account Username" name="targetUser" size="small" fullWidth required placeholder="e.g. admin" />
              <TextField label="Automated Mitigation action taken" name="mitigation" size="small" fullWidth multiline rows={2} required defaultValue="IP blocked & account locked for 15 mins." />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setIncidentDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained" color="error">Inject Alert</Button></DialogActions>
        </form>
      </Dialog>

      {/* Break Glass Dialog */}
      <Dialog open={breakGlassDialogOpen} onClose={() => setBreakGlassDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleBreakGlassOverride}>
          <DialogTitle sx={{ fontWeight: 800 }}>Clinical Emergency Override (Break Glass)</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Emergency Clinical Reason" name="reason" size="small" fullWidth required placeholder="e.g. Patient arriving unconscious, urgent blood type check needed." />
              <TextField label="Action Performed / Restricted Module" name="actionPerformed" size="small" fullWidth required placeholder="e.g. View restricted medical history files" />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setBreakGlassDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained" color="error">Authorize Override</Button></DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default SecurityIAM;
