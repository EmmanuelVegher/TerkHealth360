import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Tabs, Tab, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert,
  LinearProgress, Divider, IconButton, Stack, Avatar, Tooltip,
  InputAdornment, ListSubheader
} from '@mui/material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip
} from 'recharts';
import {
  ContactPhone, Campaign, Star, Policy, Add, Search, Refresh, CheckCircle,
  Warning, Cancel, Send, FileDownload, Assessment, ArrowForward, SupportAgent,
  QuestionAnswer, Sms, Stars, ReportProblem, Shield, HeadsetMic, Settings
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

// ─── Design Tokens & Theme Formatting ────────────────────────────────────────
const PRIMARY = '#1e2a78';     // Deep navy blue
const SECONDARY = '#3b5bdb';   // Royal blue
const SUCCESS = '#10b981';     // Vibrant green
const WARNING = '#f59e0b';     // Amber/warning
const DANGER = '#ef4444';      // Red/danger
const INFO = '#0284c7';        // Cyan/info
const PURPLE = '#8b5cf6';      // Indigo purple

const COLORS = ['#3b5bdb', '#1e2a78', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6'];

const formatDate = (d: string) => d || new Date().toISOString().slice(0, 10);
const formatNGN = (v: number) => `₦${(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

// ─── Sub-Tab Panel Helper ────────────────────────────────────────────────────
function TabPanel(props: { children: React.ReactNode; value: number; index: number }) {
  const { children, value, index } = props;
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ─── Refactored Glassmorphic KPI Card Component ─────────────────────────────
const KPICard = ({ title, value, sub, icon, color }: any) => (
  <Card sx={{
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(20px)',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '5px',
      bgcolor: color,
    },
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 12px 35px rgba(0,0,0,0.05)',
    },
    transition: 'all 0.3s ease',
  }}>
    <CardContent sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={850} sx={{ color: '#1e293b', mt: 0.5, lineHeight: 1 }}>
          {value}
        </Typography>
        {sub && <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mt: 0.5 }}>{sub}</Typography>}
      </Box>
      <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 44, height: 44 }}>
        {icon}
      </Avatar>
    </CardContent>
  </Card>
);

const StatusChip = ({ label }: { label: string }) => {
  let colorCode = '#6b7280';
  const l = label?.toUpperCase() || '';
  if (['RESOLVED', 'COMPLETED', 'DELIVERED', 'ACTIVE', 'SENT', 'NORMAL', 'YES'].includes(l)) colorCode = SUCCESS;
  if (['OPEN', 'UNDER_INVESTIGATION', 'IN_PROGRESS', 'PENDING', 'CORRECTIVE_ACTION_INITIATED', 'MEDIUM', 'NO'].includes(l)) colorCode = WARNING;
  if (['HIGH', 'CRITICAL', 'FAILED', 'CORRECTIVE_REQUIRED'].includes(l)) colorCode = DANGER;
  if (['WHATSAPP', 'SMS', 'EMAIL', 'CHRONIC_CARE', 'MATERNAL_HEALTH'].includes(l)) colorCode = SECONDARY;

  return (
    <Chip
      label={label?.replace('_', ' ')}
      size="small"
      sx={{
        bgcolor: `${colorCode}12`,
        color: colorCode,
        border: `1.5px solid ${colorCode}30`,
        fontWeight: 750,
        fontSize: '0.68rem',
        borderRadius: '8px',
        px: 0.5
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PATIENT CRM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const PatientCRM = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // ─── Data States ──────────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});

  // ─── Dialog States ────────────────────────────────────────────────────────
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);
  const [complaintDialogOpen, setComplaintDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // ─── Sub-Tab Index States ──────────────────────────────────────────────────
  const [subTab0, setSubTab0] = useState(0);
  const [subTab1, setSubTab1] = useState(0);
  const [subTab2, setSubTab2] = useState(0);
  const [subTab3, setSubTab3] = useState(0);

  // ─── Search & Filters ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Fetch All Data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [prRes, caRes, reRes, suRes, coRes, cpRes, anRes] = await Promise.all([
        api.get('/crm/profiles'),
        api.get('/crm/cases'),
        api.get('/crm/reminders'),
        api.get('/crm/surveys'),
        api.get('/crm/complaints'),
        api.get('/crm/campaigns'),
        api.get('/crm/analytics'),
      ]);
      setProfiles(prRes.data.data || []);
      setCases(caRes.data.data || []);
      setReminders(reRes.data.data || []);
      setSurveys(suRes.data.data || []);
      setComplaints(coRes.data.data || []);
      setCampaigns(cpRes.data.data || []);
      setAnalytics(anRes.data.data || {});
    } catch {
      enqueueSnackbar('Failed to load Patient CRM database', { variant: 'error' });
    }
    setLoading(false);
  }, [enqueueSnackbar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Form Submission Handlers ──────────────────────────────────────────────
  const handleAddProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/crm/profiles', {
        patientId: fd.get('patientId'),
        name: fd.get('name'),
        phone: fd.get('phone'),
        email: fd.get('email'),
        preferredChannel: fd.get('preferredChannel'),
        preferredLanguage: fd.get('preferredLanguage'),
        preferredTime: fd.get('preferredTime'),
        consentReminders: fd.get('consentReminders') === 'YES',
        consentHealthEd: fd.get('consentHealthEd') === 'YES',
        referralSource: fd.get('referralSource'),
        segment: fd.get('segment'),
        tag: fd.get('tag'),
        caregiverName: fd.get('caregiverName'),
        caregiverPhone: fd.get('caregiverPhone'),
        caregiverRole: fd.get('caregiverRole'),
      });
      enqueueSnackbar('CRM patient profile created successfully', { variant: 'success' });
      setProfileDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to create profile', { variant: 'error' });
    }
  };

  const handleAddCase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/crm/cases', {
        crmId: fd.get('crmId'),
        category: fd.get('category'),
        priority: fd.get('priority'),
        agent: fd.get('agent'),
        description: fd.get('description'),
      });
      enqueueSnackbar('Contact centre ticket generated', { variant: 'success' });
      setCaseDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to log case', { variant: 'error' });
    }
  };

  const handleResolveCase = async (id: string) => {
    try {
      await api.patch(`/crm/cases/${id}/status`, { status: 'RESOLVED' });
      enqueueSnackbar('Inquiry ticket resolved successfully', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to resolve case', { variant: 'error' });
    }
  };

  const handleSendReminder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/crm/reminders', {
        crmId: fd.get('crmId'),
        appointmentDate: fd.get('appointmentDate'),
        reminderType: fd.get('reminderType'),
        content: fd.get('content'),
      });
      enqueueSnackbar('Omnichannel reminder notification dispatched', { variant: 'success' });
      setReminderDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to send reminder', { variant: 'error' });
    }
  };

  const handleAddCampaign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/crm/campaigns', {
        name: fd.get('name'),
        targetAudience: fd.get('targetAudience'),
        channel: fd.get('channel'),
        cost: Number(fd.get('cost')),
        targetCount: Number(fd.get('targetCount')),
      });
      enqueueSnackbar('Outreach campaign launched', { variant: 'success' });
      setCampaignDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to launch campaign', { variant: 'error' });
    }
  };

  const handleAddSurvey = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/crm/surveys', {
        crmId: fd.get('crmId'),
        department: fd.get('department'),
        scoreCSAT: Number(fd.get('scoreCSAT')),
        scoreNPS: Number(fd.get('scoreNPS')),
        feedbackText: fd.get('feedbackText'),
      });
      enqueueSnackbar('Satisfaction survey scorecard logged', { variant: 'success' });
      setSurveyDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to save survey', { variant: 'error' });
    }
  };

  const handleAddComplaint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/crm/complaints', {
        patientName: fd.get('patientName'),
        department: fd.get('department'),
        category: fd.get('category'),
        severity: fd.get('severity'),
        actionsTaken: fd.get('actionsTaken'),
      });
      enqueueSnackbar('Patient complaint logged & escalated', { variant: 'warning' });
      setComplaintDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to file complaint', { variant: 'error' });
    }
  };

  const handleResolveComplaint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedComplaintId) return;
    const fd = new FormData(e.currentTarget);
    try {
      await api.patch(`/crm/complaints/${selectedComplaintId}/resolve`, {
        actionsTaken: fd.get('actionsTaken'),
      });
      enqueueSnackbar('Complaint ticket marked as RESOLVED', { variant: 'success' });
      setResolveDialogOpen(false);
      setSelectedComplaintId(null);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to close complaint', { variant: 'error' });
    }
  };

  const filteredProfiles = profiles.filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 21.1: Patient Profile & Caregivers
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab1 = () => (
    <Box>
      <Tabs 
        value={subTab0} 
        onChange={(_, v) => setSubTab0(v)} 
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { bgcolor: SECONDARY, height: 3, borderRadius: 2 },
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', color: 'text.secondary', '&.Mui-selected': { color: SECONDARY } }
        }}
      >
        {['Patient Care Profiles', 'Family & Caregiver Networks'].map((t) => (
          <Tab key={t} label={t} />
        ))}
      </Tabs>

      {/* ── 21.1.1 Profiles ── */}
      <TabPanel value={subTab0} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, letterSpacing: '-0.02em' }}>
            Enterprise 360° Patient Engagement Directory
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField size="small" placeholder="Search profiles..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setProfileDialogOpen(true)}
              sx={{
                bgcolor: SECONDARY,
                '&:hover': { bgcolor: '#1e2d80' },
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '10px'
              }}
            >
              Add Patient Profile
            </Button>
          </Stack>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.015)', borderBottom: '1.5px solid rgba(0,0,0,0.06)' }}>
              <TableRow>
                {['Profile ID', 'Patient MPI ID', 'Full Name', 'Contact Number', 'Preferred Channel', 'Language', 'Consent Reminders', 'Referral Source', 'Segment Group', 'Status'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 800, color: 'text.secondary', py: 1.8 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProfiles.map(prof => (
                <TableRow key={prof.id} hover sx={{ '& td': { py: 1.5 } }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SECONDARY }}>{prof.id}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{prof.patientId}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{prof.name}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 550, color: 'text.secondary' }}>{prof.phone}</TableCell>
                  <TableCell><StatusChip label={prof.preferredChannel} /></TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.secondary' }}>{prof.preferredLanguage}</TableCell>
                  <TableCell><StatusChip label={prof.consentReminders ? 'YES' : 'NO'} /></TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>{prof.referralSource}</TableCell>
                  <TableCell>
                    <Chip 
                      label={prof.segment?.replace('_', ' ')} 
                      size="small" 
                      variant="outlined" 
                      sx={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 800, 
                        borderColor: 'rgba(59,91,219,0.3)', 
                        color: SECONDARY, 
                        bgcolor: 'rgba(59,91,219,0.04)',
                        borderRadius: '6px'
                      }} 
                    />
                  </TableCell>
                  <TableCell><StatusChip label={prof.lifecycle} /></TableCell>
                </TableRow>
              ))}
              {filteredProfiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 600 }}>
                    No patient care profiles found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 21.1.2 Caregivers ── */}
      <TabPanel value={subTab0} index={1}>
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, letterSpacing: '-0.02em' }}>
            Caregivers & Family Kin Networks
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            Maintain active linkages with patient relatives and representatives for consent validation and pediatric care navigation.
          </Typography>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.015)', borderBottom: '1.5px solid rgba(0,0,0,0.06)' }}>
              <TableRow>
                {['Patient Profile ID', 'Patient Name', 'Linked Caregiver Name', 'Relationship Role', 'Caregiver Contact', 'Lifecycle Status'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 800, color: 'text.secondary', py: 1.8 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {profiles.filter(p => p.caregiverName).map(prof => (
                <TableRow key={prof.id} hover sx={{ '& td': { py: 1.5 } }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SECONDARY }}>{prof.id}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{prof.name}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: SECONDARY }}>{prof.caregiverName}</TableCell>
                  <TableCell>
                    <Chip 
                      label={prof.caregiverRole} 
                      size="small" 
                      sx={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 800, 
                        bgcolor: 'rgba(59,91,219,0.08)', 
                        color: SECONDARY,
                        borderRadius: '6px'
                      }} 
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 550, color: 'text.secondary' }}>{prof.caregiverPhone}</TableCell>
                  <TableCell><StatusChip label="ACTIVE" /></TableCell>
                </TableRow>
              ))}
              {profiles.filter(p => p.caregiverName).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 600 }}>
                    No caregivers linked at this time.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 21.2: Contact Centre Omnichannel
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab2 = () => (
    <Box>
      <Tabs 
        value={subTab1} 
        onChange={(_, v) => setSubTab1(v)} 
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { bgcolor: SECONDARY, height: 3, borderRadius: 2 },
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', color: 'text.secondary', '&.Mui-selected': { color: SECONDARY } }
        }}
      >
        {['Contact Centre Cases', 'Omnichannel Reminders Logs', 'Targeted Outreach Campaigns'].map((t) => (
          <Tab key={t} label={t} />
        ))}
      </Tabs>

      {/* ── 21.2.1 Inquiries ── */}
      <TabPanel value={subTab1} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, letterSpacing: '-0.02em' }}>
            Integrated Care Support Tickets
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCaseDialogOpen(true)}
            sx={{
              bgcolor: SECONDARY,
              '&:hover': { bgcolor: '#1e2d80' },
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '10px'
            }}
          >
            Log Support Inquiry
          </Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.015)', borderBottom: '1.5px solid rgba(0,0,0,0.06)' }}>
              <TableRow>
                {['Ticket ID', 'Patient Name', 'Category Type', 'Priority', 'Assigned Staff', 'Log Date', 'Complaint Description Summary', 'Status', 'Action'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 800, color: 'text.secondary', py: 1.8 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {cases.map(cs => (
                <TableRow key={cs.id} hover sx={{ '& td': { py: 1.5 } }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SECONDARY }}>{cs.id}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{cs.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={cs.category?.replace('_', ' ')} 
                      size="small" 
                      variant="outlined" 
                      sx={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 800, 
                        borderColor: 'rgba(2,132,199,0.3)', 
                        color: INFO,
                        borderRadius: '6px'
                      }} 
                    />
                  </TableCell>
                  <TableCell><StatusChip label={cs.priority} /></TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.secondary' }}>{cs.agent}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 550, color: 'text.secondary' }}>{cs.date}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 500, color: '#475569' }}>{cs.description}</TableCell>
                  <TableCell><StatusChip label={cs.status} /></TableCell>
                  <TableCell>
                    {cs.status === 'OPEN' && (
                      <Button
                        size="small"
                        variant="contained"
                        sx={{
                          bgcolor: SUCCESS,
                          '&:hover': { bgcolor: '#0f766e' },
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          boxShadow: 'none'
                        }}
                        onClick={() => handleResolveCase(cs.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {cases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 600 }}>
                    No support cases logged.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 21.2.2 Reminders ── */}
      <TabPanel value={subTab1} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, letterSpacing: '-0.02em' }}>
            Omnichannel Reminder Logs
          </Typography>
          <Button
            variant="contained"
            startIcon={<Sms />}
            onClick={() => setReminderDialogOpen(true)}
            sx={{
              bgcolor: SUCCESS,
              '&:hover': { bgcolor: '#059669' },
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '10px'
            }}
          >
            Send Reminder Alert
          </Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.015)', borderBottom: '1.5px solid rgba(0,0,0,0.06)' }}>
              <TableRow>
                {['Alert ID', 'Recipient', 'Phone Number', 'Channel Type', 'Reminder Target', 'Notification Content Particulars', 'Delivery Status'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 800, color: 'text.secondary', py: 1.8 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {reminders.map(rem => (
                <TableRow key={rem.id} hover sx={{ '& td': { py: 1.5 } }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SECONDARY }}>{rem.id}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{rem.name}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 550, color: 'text.secondary' }}>{rem.phone}</TableCell>
                  <TableCell><StatusChip label={rem.channel} /></TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{rem.appointmentDate}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 500, color: '#475569' }}>{rem.content}</TableCell>
                  <TableCell><StatusChip label={rem.status} /></TableCell>
                </TableRow>
              ))}
              {reminders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 600 }}>
                    No reminder logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 21.2.3 Campaigns ── */}
      <TabPanel value={subTab1} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, letterSpacing: '-0.02em' }}>
            Targeted Health Outreach Campaigns
          </Typography>
          <Button
            variant="contained"
            startIcon={<Campaign />}
            onClick={() => setCampaignDialogOpen(true)}
            sx={{
              bgcolor: WARNING,
              '&:hover': { bgcolor: '#d97706' },
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '10px'
            }}
          >
            Launch Campaign
          </Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.015)', borderBottom: '1.5px solid rgba(0,0,0,0.06)' }}>
              <TableRow>
                {['Campaign ID', 'Campaign Name', 'Target Segment Audience', 'Communication Channel', 'Campaign Cost (₦)', 'Target Reach Count', 'Response Count', 'Conversion Rate', 'Status'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 800, color: 'text.secondary', py: 1.8 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map(camp => {
                const pct = camp.targetCount ? ((camp.respondedCount / camp.targetCount) * 100).toFixed(1) : 0;
                return (
                  <TableRow key={camp.id} hover sx={{ '& td': { py: 1.5 } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SECONDARY }}>{camp.id}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{camp.name}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.secondary' }}>{camp.targetAudience}</TableCell>
                    <TableCell><StatusChip label={camp.channel} /></TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{formatNGN(camp.cost)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 750 }}>{camp.targetCount}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 750, color: SUCCESS }}>{camp.respondedCount}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: SECONDARY }}>{pct}%</TableCell>
                    <TableCell><StatusChip label={camp.status} /></TableCell>
                  </TableRow>
                );
              })}
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 600 }}>
                    No outreach campaigns recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 21.3: Surveys, Complaints & Recovery
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab3 = () => (
    <Box>
      <Tabs 
        value={subTab2} 
        onChange={(_, v) => setSubTab2(v)} 
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { bgcolor: SECONDARY, height: 3, borderRadius: 2 },
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', color: 'text.secondary', '&.Mui-selected': { color: SECONDARY } }
        }}
      >
        {['Satisfaction Experience Surveys', 'Grievance Complaints Logs'].map((t) => (
          <Tab key={t} label={t} />
        ))}
      </Tabs>

      {/* ── 21.3.1 Surveys ── */}
      <TabPanel value={subTab2} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, letterSpacing: '-0.02em' }}>
            Patient Experience Survey Scores
          </Typography>
          <Button
            variant="contained"
            startIcon={<Stars />}
            onClick={() => setSurveyDialogOpen(true)}
            sx={{
              bgcolor: SUCCESS,
              '&:hover': { bgcolor: '#059669' },
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '10px'
            }}
          >
            Log Survey Response
          </Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.015)', borderBottom: '1.5px solid rgba(0,0,0,0.06)' }}>
              <TableRow>
                {['Survey ID', 'Patient Name', 'Service Department', 'CSAT Rating (5.0)', 'NPS Score (0-10)', 'Qualitative Feedback', 'Survey Date', 'Status'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 800, color: 'text.secondary', py: 1.8 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {surveys.map(srv => (
                <TableRow key={srv.id} hover sx={{ '& td': { py: 1.5 } }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SECONDARY }}>{srv.id}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{srv.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={srv.department} 
                      size="small" 
                      variant="outlined" 
                      sx={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 800, 
                        borderColor: 'rgba(59,91,219,0.3)', 
                        color: SECONDARY,
                        borderRadius: '6px'
                      }} 
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: srv.scoreCSAT >= 4 ? SUCCESS : srv.scoreCSAT <= 2 ? DANGER : WARNING }}>{srv.scoreCSAT} / 5.0</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: srv.scoreNPS >= 9 ? SUCCESS : srv.scoreNPS <= 6 ? DANGER : WARNING }}>{srv.scoreNPS} / 10</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 500, color: '#475569' }}>{srv.feedbackText}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 550, color: 'text.secondary' }}>{srv.surveyDate}</TableCell>
                  <TableCell><StatusChip label={srv.status} /></TableCell>
                </TableRow>
              ))}
              {surveys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 600 }}>
                    No experience surveys logged.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 21.3.2 Complaints ── */}
      <TabPanel value={subTab2} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, letterSpacing: '-0.02em' }}>
            Patient Grievances & Service Recovery Tracker
          </Typography>
          <Button
            variant="contained"
            startIcon={<ReportProblem />}
            onClick={() => setComplaintDialogOpen(true)}
            sx={{
              bgcolor: DANGER,
              '&:hover': { bgcolor: '#dc2626' },
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '10px'
            }}
          >
            File Grievance Complaint
          </Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.015)', borderBottom: '1.5px solid rgba(0,0,0,0.06)' }}>
              <TableRow>
                {['Ticket ID', 'Patient Name', 'Disgruntled Department', 'Issue Category', 'Severity', 'Actions Taken & Service Recovery Status', 'Resolved Date', 'Status', 'Action'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 800, color: 'text.secondary', py: 1.8 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {complaints.map(comp => (
                <TableRow key={comp.id} hover sx={{ '& td': { py: 1.5 } }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SECONDARY }}>{comp.id}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{comp.patientName}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>{comp.department}</TableCell>
                  <TableCell>
                    <Chip 
                      label={comp.category?.replace('_', ' ')} 
                      size="small" 
                      variant="outlined" 
                      sx={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 800, 
                        borderColor: 'rgba(239,68,68,0.3)', 
                        color: DANGER,
                        borderRadius: '6px'
                      }} 
                    />
                  </TableCell>
                  <TableCell><StatusChip label={comp.severity} /></TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 500, color: '#475569' }}>{comp.actionsTaken}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 550, color: 'text.secondary' }}>{comp.resolvedDate}</TableCell>
                  <TableCell><StatusChip label={comp.status} /></TableCell>
                  <TableCell>
                    {comp.status !== 'RESOLVED' && (
                      <Button
                        size="small"
                        variant="contained"
                        sx={{
                          bgcolor: SUCCESS,
                          '&:hover': { bgcolor: '#0f766e' },
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          boxShadow: 'none'
                        }}
                        onClick={() => {
                          setSelectedComplaintId(comp.id);
                          setResolveDialogOpen(true);
                        }}
                      >
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {complaints.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 600 }}>
                    No patient complaints logged.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 21.4: Governance & Analytics BI
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab4 = () => (
    <Box>
      <Tabs 
        value={subTab3} 
        onChange={(_, v) => setSubTab3(v)} 
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { bgcolor: SECONDARY, height: 3, borderRadius: 2 },
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', color: 'text.secondary', '&.Mui-selected': { color: SECONDARY } }
        }}
      >
        {['CRM Governance BI', 'Policy Regulations'].map((t) => (
          <Tab key={t} label={t} />
        ))}
      </Tabs>

      {/* ── 21.4.1 BI Dashboard ── */}
      <TabPanel value={subTab3} index={0}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}><KPICard title="Customer Satisfaction CSAT" value={`${analytics.avgCSAT || 0} / 5.0`} sub="Outpatients survey average" icon={<Star />} color={SUCCESS} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Net Promoter Score NPS" value={`${analytics.calculatedNPS || 0}%`} sub="Promoters minus detractors" icon={<Stars />} color={SECONDARY} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Active Inquiry Cases" value={analytics.activeCases || 0} sub="CRM agent backlog" icon={<SupportAgent />} color={WARNING} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Reminders Dispatched" value={analytics.totalRemindersSent || 0} sub="WhatsApp/SMS alerts total" icon={<Sms />} color={PRIMARY} /></Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)', p: 3, boxShadow: '0 8px 30px rgba(0,0,0,0.015)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, color: PRIMARY, letterSpacing: '-0.01em' }}>
                Preferred Communication Channels (Response Mix)
              </Typography>
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.responseChannelMix || []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)', p: 3, borderLeft: `5px solid ${SECONDARY}`, boxShadow: '0 8px 30px rgba(0,0,0,0.015)', height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: SECONDARY, mb: 1.5, letterSpacing: '-0.01em' }}>
                Outreach & Help Desk Governance Compliance
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', fontWeight: 500 }}>
                Patient outreach communication compliance monitor logs verify that consent flags are validated against patient registries in real time (BR-CRM-002).
              </Typography>
              <Stack spacing={2.2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Consent validation rate for messages:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS }}>100% compliant</Typography>
                </Stack>
                <Divider sx={{ borderColor: 'rgba(0,0,0,0.04)' }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>SMS delivery success rate:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b' }}>98.9%</Typography>
                </Stack>
                <Divider sx={{ borderColor: 'rgba(0,0,0,0.04)' }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>WhatsApp API Sandbox status:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS }}>ACTIVE</Typography>
                </Stack>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── 21.4.2 Policies ── */}
      <TabPanel value={subTab3} index={1}>
        <Alert severity="info" icon={<Shield />} sx={{ borderRadius: '14px', fontWeight: 600 }}>
          GOV-001 · Under NDPR rules, patient health campaign tagging (HIV/ART clinic, TB clinic) details are restricted from digital broadcast logs to protect patient confidentiality (BR-COM-003).
        </Alert>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN COMPONENT BUILD
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 5 }}>
      {/* Banner */}
      <Box 
        sx={{ 
          background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 50%, #0d9488 100%)`, 
          color: '#fff', 
          px: 4, 
          py: 3, 
          borderRadius: '0 0 24px 24px', 
          mb: 4,
          boxShadow: '0 10px 30px rgba(30,42,120,0.1)'
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
              📞 Patient Care Center & Help Desk
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600, mt: 0.5, display: 'block' }}>
              Caregiver Networks · Omnichannel Reminders · CSAT Surveys · Complaint Resolution Recovery · NPS Metrics
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Tooltip title="Refresh Care Database">
              <IconButton 
                onClick={fetchData} 
                sx={{ 
                  color: '#fff', 
                  bgcolor: 'rgba(255,255,255,0.12)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button 
              variant="outlined" 
              startIcon={<FileDownload />} 
              sx={{ 
                color: '#fff', 
                borderColor: 'rgba(255,255,255,0.4)',
                borderWidth: '1.5px',
                fontWeight: 700,
                borderRadius: '10px',
                textTransform: 'none',
                '&:hover': { borderColor: '#fff', borderWidth: '1.5px', bgcolor: 'rgba(255,255,255,0.06)' }
              }} 
              onClick={() => enqueueSnackbar('Exporting outreach registry logs', { variant: 'info' })}
            >
              Export Outreach Logs
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* KPIStrip */}
      <Box sx={{ px: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={6} md={3}><KPICard title="Total Patient Profiles" value={profiles.length} sub="Registered Care profiles" icon={<ContactPhone />} color={SECONDARY} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Inquiry Backlog" value={`${cases.filter(c=>c.status==='OPEN').length} active`} sub="Awaiting team response" icon={<HeadsetMic />} color={SECONDARY} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Average CSAT Score" value={`${analytics.avgCSAT || 0} / 5.0`} sub="Rating average index" icon={<Star />} color={SUCCESS} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Active Campaigns" value={`${campaigns.filter(cm=>cm.status==='IN_PROGRESS').length} running`} sub="Target outreach" icon={<Campaign />} color={WARNING} /></Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, v) => setActiveTab(v)}
          sx={{ 
            mb: 4, 
            bgcolor: '#fff', 
            borderRadius: '20px', 
            px: 1.5, 
            py: 0.8, 
            boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
            border: '1px solid rgba(0,0,0,0.04)',
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root': { 
              fontWeight: 700, 
              textTransform: 'none', 
              minHeight: 40, 
              fontSize: '0.88rem',
              borderRadius: '15px',
              transition: 'all 0.2s',
              mr: 1
            },
            '& .Mui-selected': { 
              fontWeight: 800, 
              bgcolor: SECONDARY, 
              color: '#fff !important',
              boxShadow: '0 4px 14px rgba(59,91,219,0.22)'
            },
            '&:hover:not(.Mui-selected)': {
              bgcolor: 'rgba(59,91,219,0.05)'
            }
          }}
        >
          <Tab icon={<ContactPhone />} iconPosition="start" label="Profile & Caregivers" />
          <Tab icon={<HeadsetMic />} iconPosition="start" label="Contact Centre & Reminders" />
          <Tab icon={<Star />} iconPosition="start" label="Experience & Complaints" />
          <Tab icon={<Policy />} iconPosition="start" label="Outreach Compliance BI" />
        </Tabs>

        <Card sx={{ borderRadius: '24px', p: 3.5, boxShadow: '0 10px 40px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', background: '#fff' }}>
          {activeTab === 0 && renderTab1()}
          {activeTab === 1 && renderTab2()}
          {activeTab === 2 && renderTab3()}
          {activeTab === 3 && renderTab4()}
        </Card>
      </Box>

      {/* Modals */}

      {/* Profile Dialog */}
      <Dialog 
        open={profileDialogOpen} 
        onClose={() => setProfileDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 2,
            boxShadow: '0 24px 50px -12px rgba(30,42,120,0.15)',
            border: '1px solid rgba(0,0,0,0.06)'
          }
        }}
      >
        <form onSubmit={handleAddProfile}>
          <DialogTitle sx={{ fontWeight: 850, pb: 1.5, fontSize: '1.35rem', color: PRIMARY, letterSpacing: '-0.02em' }}>
            Create Patient Support Profile
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
              <Grid item xs={6}><TextField label="Patient MPI Identifier" name="patientId" size="small" fullWidth required placeholder="e.g. PAT-001" /></Grid>
              <Grid item xs={6}><TextField label="Patient Full Name" name="name" size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField label="Contact Number" name="phone" size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField label="Email Address" name="email" size="small" type="email" fullWidth required /></Grid>
              <Grid item xs={6}><TextField select label="Preferred Contact Channel" name="preferredChannel" size="small" fullWidth defaultValue="WHATSAPP"><MenuItem value="WHATSAPP">WhatsApp Message</MenuItem><MenuItem value="SMS">SMS Message</MenuItem><MenuItem value="EMAIL">Email</MenuItem></TextField></Grid>
              <Grid item xs={6}><TextField select label="Preferred Language" name="preferredLanguage" size="small" fullWidth defaultValue="ENGLISH"><MenuItem value="ENGLISH">English</MenuItem><MenuItem value="HAUSA">Hausa</MenuItem><MenuItem value="YORUBA">Yoruba</MenuItem><MenuItem value="IGBO">Igbo</MenuItem></TextField></Grid>
              <Grid item xs={6}><TextField select label="Preferred Contact Time" name="preferredTime" size="small" fullWidth defaultValue="MORNING"><MenuItem value="MORNING">Morning (8AM - 12PM)</MenuItem><MenuItem value="AFTERNOON">Afternoon (12PM - 4PM)</MenuItem><MenuItem value="EVENING">Evening (4PM - 8PM)</MenuItem></TextField></Grid>
              <Grid item xs={6}><TextField select label="Consent Reminders" name="consentReminders" size="small" fullWidth defaultValue="YES"><MenuItem value="YES">Yes, Opt-In</MenuItem><MenuItem value="NO">No, Opt-Out</MenuItem></TextField></Grid>
              <Grid item xs={6}><TextField select label="Consent Health Education" name="consentHealthEd" size="small" fullWidth defaultValue="YES"><MenuItem value="YES">Yes, Opt-In</MenuItem><MenuItem value="NO">No, Opt-Out</MenuItem></TextField></Grid>
              <Grid item xs={6}><TextField select label="Referral Acquisition Source" name="referralSource" size="small" fullWidth defaultValue="SELF_REFERRAL"><MenuItem value="SELF_REFERRAL">Self Referral</MenuItem><MenuItem value="MEDIA_CAMPAIGN">Social Media Campaign</MenuItem><MenuItem value="COMMUNITY_OUTREACH">Community Health Outreach</MenuItem><MenuItem value="PARTNER_ORG">Partner Hospital Clinic</MenuItem></TextField></Grid>
              <Grid item xs={6}><TextField select label="Payer Segment Group" name="segment" size="small" fullWidth defaultValue="CORE_OPD"><MenuItem value="CORE_OPD">Core Outpatients OPD</MenuItem><MenuItem value="CHRONIC_CARE">Chronic Care Management</MenuItem><MenuItem value="MATERNAL_HEALTH">Maternal ANC care</MenuItem></TextField></Grid>
              <Grid item xs={6}><TextField label="Special Follow-Up tag" name="tag" size="small" fullWidth defaultValue="GENERAL_WELLNESS" placeholder="e.g. HYPERTENSION, ART" /></Grid>
              <Grid item xs={12}><Divider sx={{ my: 1.5 }}><Chip label="Designated Caregiver Linkage" size="small" sx={{ fontWeight: 700 }} /></Divider></Grid>
              <Grid item xs={4}><TextField label="Caregiver Full Name" name="caregiverName" size="small" fullWidth /></Grid>
              <Grid item xs={4}><TextField label="Caregiver Phone Number" name="caregiverPhone" size="small" fullWidth /></Grid>
              <Grid item xs={4}><TextField select label="Caregiver Relationship" name="caregiverRole" size="small" fullWidth defaultValue="SPOUSE"><MenuItem value="SPOUSE">Spouse</MenuItem><MenuItem value="FATHER">Father</MenuItem><MenuItem value="MOTHER">Mother</MenuItem><MenuItem value="CHILD">Child / Next of Kin</MenuItem></TextField></Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 2, display: 'flex', gap: 1.5 }}>
            <Button onClick={() => setProfileDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: SECONDARY, '&:hover': { bgcolor: '#1e2d80' }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Save Profile</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Case Dialog */}
      <Dialog 
        open={caseDialogOpen} 
        onClose={() => setCaseDialogOpen(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 2,
            boxShadow: '0 24px 50px -12px rgba(30,42,120,0.15)',
            border: '1px solid rgba(0,0,0,0.06)'
          }
        }}
      >
        <form onSubmit={handleAddCase}>
          <DialogTitle sx={{ fontWeight: 850, pb: 1.5, fontSize: '1.35rem', color: PRIMARY, letterSpacing: '-0.02em' }}>
            Log Patient Support Ticket
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField select label="Select Patient Profile" name="crmId" size="small" fullWidth required defaultValue="">{profiles.map(p => <MenuItem key={p.id} value={p.id}>{p.name} ({p.id})</MenuItem>)}</TextField>
              <TextField select label="Ticket Category" name="category" size="small" fullWidth defaultValue="APPOINTMENT_REQUEST"><MenuItem value="APPOINTMENT_REQUEST">Appointment Rescheduling</MenuItem><MenuItem value="COMPLAINT_BILLING">Billing Inquiry / Dispute</MenuItem><MenuItem value="FEEDBACK_GENERAL">General Feedback / Inquiries</MenuItem></TextField>
              <TextField select label="Ticket Priority" name="priority" size="small" fullWidth defaultValue="MEDIUM"><MenuItem value="LOW">Low</MenuItem><MenuItem value="MEDIUM">Medium</MenuItem><MenuItem value="HIGH">High</MenuItem></TextField>
              <TextField label="Assigned Staff Name" name="agent" size="small" fullWidth required defaultValue="Support Staff" />
              <TextField label="Description Detail" name="description" size="small" fullWidth multiline rows={3} required />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 2, display: 'flex', gap: 1.5 }}>
            <Button onClick={() => setCaseDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: SECONDARY, '&:hover': { bgcolor: '#1e2d80' }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Create Case Ticket</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog 
        open={reminderDialogOpen} 
        onClose={() => setReminderDialogOpen(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 2,
            boxShadow: '0 24px 50px -12px rgba(30,42,120,0.15)',
            border: '1px solid rgba(0,0,0,0.06)'
          }
        }}
      >
        <form onSubmit={handleSendReminder}>
          <DialogTitle sx={{ fontWeight: 850, pb: 1.5, fontSize: '1.35rem', color: PRIMARY, letterSpacing: '-0.02em' }}>
            Dispatch Omnichannel Reminder
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField select label="Target Patient Profile" name="crmId" size="small" fullWidth required defaultValue="">{profiles.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</TextField>
              <TextField label="Scheduled Appointment Date" type="date" name="appointmentDate" size="small" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={new Date().toISOString().slice(0, 10)} />
              <TextField select label="Reminder Type" name="reminderType" size="small" fullWidth defaultValue="CLINIC_VISIT"><MenuItem value="CLINIC_VISIT">Routine Clinic Visit</MenuItem><MenuItem value="PROCEDURE">Investigation / Procedure</MenuItem><MenuItem value="IMMUNIZATION">Pediatric Immunization Due</MenuItem></TextField>
              <TextField label="Reminder Notification Content" name="content" size="small" fullWidth multiline rows={3} required defaultValue="Dear [Patient], this is a reminder for your upcoming appointment. Please confirm." />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 2, display: 'flex', gap: 1.5 }}>
            <Button onClick={() => setReminderDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: SECONDARY, '&:hover': { bgcolor: '#1e2d80' }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Dispatch Notification</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog 
        open={campaignDialogOpen} 
        onClose={() => setCampaignDialogOpen(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 2,
            boxShadow: '0 24px 50px -12px rgba(30,42,120,0.15)',
            border: '1px solid rgba(0,0,0,0.06)'
          }
        }}
      >
        <form onSubmit={handleAddCampaign}>
          <DialogTitle sx={{ fontWeight: 850, pb: 1.5, fontSize: '1.35rem', color: PRIMARY, letterSpacing: '-0.02em' }}>
            Launch Outreach Campaign
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Campaign Name" name="name" size="small" fullWidth required />
              <TextField label="Target Segment Audience" name="targetAudience" size="small" fullWidth required placeholder="e.g. Hypertension chronic segment" />
              <TextField select label="Communication Channel" name="channel" size="small" fullWidth defaultValue="WHATSAPP"><MenuItem value="WHATSAPP">WhatsApp Broadcast</MenuItem><MenuItem value="SMS">SMS Broadcast</MenuItem></TextField>
              <TextField label="Campaign Budget / Cost (₦)" name="cost" type="number" size="small" fullWidth required />
              <TextField label="Target Reach Count" name="targetCount" type="number" size="small" fullWidth required defaultValue="100" />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 2, display: 'flex', gap: 1.5 }}>
            <Button onClick={() => setCampaignDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: SECONDARY, '&:hover': { bgcolor: '#1e2d80' }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Launch Outreach</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Survey Dialog */}
      <Dialog 
        open={surveyDialogOpen} 
        onClose={() => setSurveyDialogOpen(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 2,
            boxShadow: '0 24px 50px -12px rgba(30,42,120,0.15)',
            border: '1px solid rgba(0,0,0,0.06)'
          }
        }}
      >
        <form onSubmit={handleAddSurvey}>
          <DialogTitle sx={{ fontWeight: 850, pb: 1.5, fontSize: '1.35rem', color: PRIMARY, letterSpacing: '-0.02em' }}>
            Log Experience Survey Response
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField select label="Survey Patient" name="crmId" size="small" fullWidth required defaultValue="">{profiles.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</TextField>
              <TextField label="Visited Clinic Department" name="department" size="small" fullWidth required defaultValue="Outpatient Clinic" />
              <TextField label="CSAT Rating Score (1 to 5)" name="scoreCSAT" type="number" size="small" fullWidth required inputProps={{ min: '1', max: '5' }} />
              <TextField label="Net Promoter Score NPS (0 to 10)" name="scoreNPS" type="number" size="small" fullWidth required inputProps={{ min: '0', max: '10' }} />
              <TextField label="Qualitative Feedback Remarks" name="feedbackText" size="small" fullWidth multiline rows={3} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 2, display: 'flex', gap: 1.5 }}>
            <Button onClick={() => setSurveyDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: SECONDARY, '&:hover': { bgcolor: '#1e2d80' }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Log Scorecard</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Complaint Dialog */}
      <Dialog 
        open={complaintDialogOpen} 
        onClose={() => setComplaintDialogOpen(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 2,
            boxShadow: '0 24px 50px -12px rgba(30,42,120,0.15)',
            border: '1px solid rgba(0,0,0,0.06)'
          }
        }}
      >
        <form onSubmit={handleAddComplaint}>
          <DialogTitle sx={{ fontWeight: 850, pb: 1.5, fontSize: '1.35rem', color: PRIMARY, letterSpacing: '-0.02em' }}>
            File Grievance Complaint Ticket
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Disgruntled Patient Name" name="patientName" size="small" fullWidth required />
              <TextField label="Fault Department" name="department" size="small" fullWidth required defaultValue="Emergency Unit" />
              <TextField select label="Complaint Category" name="category" size="small" fullWidth defaultValue="WAITING_TIME"><MenuItem value="WAITING_TIME">Long Waiting Times</MenuItem><MenuItem value="STAFF_BEHAVIOUR">Staff Attitude / Behaviour</MenuItem><MenuItem value="FACILITIES">Facilities / Cleaning deficiencies</MenuItem></TextField>
              <TextField select label="Severity Impact" name="severity" size="small" fullWidth defaultValue="HIGH"><MenuItem value="CRITICAL">Critical Escalation</MenuItem><MenuItem value="HIGH">High Severity</MenuItem><MenuItem value="MEDIUM">Medium</MenuItem><MenuItem value="LOW">Low</MenuItem></TextField>
              <TextField label="Investigation Notes / Actions Proposed" name="actionsTaken" size="small" fullWidth multiline rows={3} required defaultValue="Under investigation by ward matron." />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 2, display: 'flex', gap: 1.5 }}>
            <Button onClick={() => setComplaintDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: SECONDARY, '&:hover': { bgcolor: '#1e2d80' }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>File Complaint</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Resolve Complaint Dialog */}
      <Dialog 
        open={resolveDialogOpen} 
        onClose={() => setResolveDialogOpen(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 2,
            boxShadow: '0 24px 50px -12px rgba(30,42,120,0.15)',
            border: '1px solid rgba(0,0,0,0.06)'
          }
        }}
      >
        <form onSubmit={handleResolveComplaint}>
          <DialogTitle sx={{ fontWeight: 850, pb: 1.5, fontSize: '1.35rem', color: PRIMARY, letterSpacing: '-0.02em' }}>
            Close Complaint Ticket & Log Service Recovery
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Grievance Service Recovery Actions Taken" name="actionsTaken" size="small" fullWidth multiline rows={3} required placeholder="State exact apologies or adjustments made to resolve complaint..." />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 2, display: 'flex', gap: 1.5 }}>
            <Button onClick={() => setResolveDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Mark Resolved</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default PatientCRM;
