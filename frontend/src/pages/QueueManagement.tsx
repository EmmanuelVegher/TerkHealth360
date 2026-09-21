import { useState, useEffect } from 'react';
import {
  Typography, Box, Card, CardContent, Button, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton,
  TextField, FormControl, InputLabel, Select, MenuItem, Stack,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete,
  Paper, CircularProgress, Alert, Avatar, Tooltip
} from '@mui/material';
import {
  Sync, VolumeUp, ArrowForward, AccessTime, CheckCircle, HourglassEmpty,
  PersonAdd, Campaign, PriorityHigh
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import { broadcastDoctorCall } from '../components/GlobalCallDialog';
import { alpha } from '@mui/material/styles';

interface PatientOption {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
}

const DEPARTMENTS = [
  'REGISTRATION',
  'TRIAGE',
  'CONSULTATION',
  'LABORATORY',
  'RADIOLOGY',
  'PHARMACY',
  'BILLING',
];

const DEPT_THEMES: Record<string, { color: string; bg: string; label: string }> = {
  REGISTRATION: { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', label: 'Front Desk / Registration' },
  TRIAGE:       { color: '#f43f5e', bg: 'rgba(244,63,94,0.08)', label: 'Nursing Triage' },
  CONSULTATION: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', label: 'OPD Consultation' },
  LABORATORY:   { color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', label: 'Laboratory Service' },
  RADIOLOGY:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', label: 'Radiology / Imaging' },
  PHARMACY:    { color: '#10b981', bg: 'rgba(16,185,129,0.08)', label: 'Pharmacy Dispensary' },
  BILLING:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Billing / Cashier' },
};

const getInitialDept = (designation?: string): string => {
  const desc = designation || '';
  if (desc.includes('Nurse')) return 'TRIAGE';
  if (desc.includes('Doctor')) return 'CONSULTATION';
  if (desc.includes('Pharmacist') || desc.includes('Pharmacy')) return 'PHARMACY';
  if (desc.includes('Lab') || desc.includes('Pathologist') || desc.includes('Scientist')) return 'LABORATORY';
  if (desc.includes('Radiologist')) return 'RADIOLOGY';
  if (desc.includes('Accountant') || desc.includes('Billing')) return 'BILLING';
  return 'CONSULTATION';
};

const QueueManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const userDesignation = user?.designation || '';

  const [selectedDept, setSelectedDept] = useState(() => getInitialDept(userDesignation));
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPat, setSelectedPat] = useState<PatientOption | null>(null);

  // Overrides Dialog
  const [openOverride, setOpenOverride] = useState(false);
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const [overridePriority, setOverridePriority] = useState(0);
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  // Averages wait times
  const [waitStats, setWaitStats] = useState<any>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const [resQueue, resStats] = await Promise.all([
        api.get(`/queues/department/${selectedDept}`),
        api.get('/queues/waiting-times')
      ]);
      setQueue(resQueue.data || []);
      setWaitStats(resStats.data);
    } catch (err) {
      enqueueSnackbar('Failed to load queue details', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSearch = async (val: string) => {
    if (val.length < 2) return;
    try {
      const res = await api.get('/patients/mpi', { params: { query: val, limit: 30 } });
      setPatients((res.data.data || []).map((p: any) => ({
        id: p.id,
        mrn: p.patientNumber,
        firstName: p.firstName,
        lastName: p.lastName
      })));
    } catch (err) {
      console.error(err);
    }
  };

  // Pre-load patients on mount
  const fetchInitialPatients = async () => {
    try {
      const res = await api.get('/patients/mpi', { params: { limit: 50 } });
      setPatients((res.data.data || []).map((p: any) => ({
        id: p.id,
        mrn: p.patientNumber,
        firstName: p.firstName,
        lastName: p.lastName
      })));
    } catch (err) {
      console.error(err);
    }
  };

  // Sync selected department with logged-in user's role on mount
  useEffect(() => {
    if (user?.designation) {
      setSelectedDept(getInitialDept(user.designation));
    }
  }, [user]);

  useEffect(() => {
    fetchQueue();
    fetchInitialPatients();
    
    // SSE Live Updates
    const sse = new EventSource('/api/visits/events');
    sse.onmessage = (event) => {
      if (event.data === 'update') {
        fetchQueue();
      }
    };
    return () => sse.close();
  }, [selectedDept]);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPat) return;
    try {
      await api.post('/queues/check-in', {
        patientId: selectedPat.id,
        department: selectedDept,
        priority: 0,
      });
      enqueueSnackbar('Patient successfully checked in and token generated!', { variant: 'success' });
      setSelectedPat(null);
      fetchQueue();
    } catch (err) {
      enqueueSnackbar('Check-in failed', { variant: 'error' });
    }
  };

  const handleAction = async (id: string, newStatus: string, ticketObj?: any) => {
    try {
      const res = await api.post('/queues/action', {
        queueId: id,
        status: newStatus,
      });
      const docName = res.data?.doctorName || (user as any)?.fullName || ((user as any)?.username ? `Dr. ${(user as any).username}` : 'Dr. Medical Officer');
      
      if (newStatus === 'CALLED' && ticketObj) {
        const patName = `${ticketObj.patient?.firstName || ''} ${ticketObj.patient?.lastName || ''}`.trim() || 'Patient';
        broadcastDoctorCall({
          doctorName: docName,
          patientName: patName,
          tokenNumber: ticketObj.tokenNumber,
          department: DEPT_THEMES[selectedDept]?.label || selectedDept,
          timestamp: new Date().toISOString(),
        });
        handleCallAnnouncement(ticketObj.tokenNumber, patName);
      }

      enqueueSnackbar(`Ticket status updated: ${newStatus}`, { variant: 'info' });
      fetchQueue();

      if (newStatus === 'IN_SERVICE') {
        queryClient.invalidateQueries('encounters');
        queryClient.invalidateQueries('visits');
        enqueueSnackbar('Starting consultation... Redirecting to OPD Desk', { variant: 'success' });
        setTimeout(() => navigate('/opd'), 400);
      }
    } catch (err) {
      enqueueSnackbar('Transition action failed', { variant: 'error' });
    }
  };

  const handleCallAnnouncement = (token: string, name: string) => {
    const deptLabel = DEPT_THEMES[selectedDept]?.label || selectedDept.toLowerCase();
    const text = `${name}, please proceed to the ${deptLabel}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
    enqueueSnackbar(`Auditory announcement triggered: ${token}`, { variant: 'success' });
  };

  const handlePriorityOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideId) return;
    setSubmittingOverride(true);
    try {
      await api.post('/queues/priority-override', {
        queueId: overrideId,
        priority: overridePriority,
        reason: overrideReason,
      });
      enqueueSnackbar('Priority override registered successfully!', { variant: 'success' });
      setOpenOverride(false);
      setOverrideId(null);
      setOverrideReason('');
      fetchQueue();
    } catch (err) {
      enqueueSnackbar('Override action failed', { variant: 'error' });
    } finally {
      setSubmittingOverride(false);
    }
  };

  const deptTheme = DEPT_THEMES[selectedDept] || { color: '#3b5bdb', bg: 'rgba(59,91,219,0.08)', label: selectedDept };
  const deptStats = waitStats?.averages?.find((a: any) => a.department === selectedDept);

  const waitingCount = queue.filter(q => q.status === 'WAITING').length;
  const activeCount = queue.filter(q => q.status === 'CALLED').length;
  const avgWaitTime = deptStats ? deptStats.averageWaitMinutes : 0;

  return (
    <Box sx={{ py: 1 }}>
      {/* Upper header action bar */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -0.5, color: '#1e293b' }}>
            Queue & Flow Control
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage real-time patient status, auditory announcements, and clinical waitlists.
          </Typography>
        </Box>
        <FormControl sx={{ minWidth: 260 }} size="small">
          <InputLabel>Active Department</InputLabel>
          <Select 
            value={selectedDept} 
            onChange={e => setSelectedDept(e.target.value)} 
            label="Active Department"
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {DEPARTMENTS.map(d => (
              <MenuItem key={d} value={d} sx={{ fontWeight: 600 }}>
                {DEPT_THEMES[d]?.label || d}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* KPI Cards & Quick Check-in Panel */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3.2}>
          <Card sx={{ 
            borderRadius: '16px', 
            border: 'none', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)', 
            position: 'relative',
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Box sx={{ position: 'absolute', right: -10, top: -10, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(deptTheme.color, 0.1)} 0%, rgba(255,255,255,0) 70%)` }} />
            <CardContent sx={{ p: 3, width: '100%', display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Avatar sx={{ bgcolor: alpha(deptTheme.color, 0.1), color: deptTheme.color, width: 52, height: 52 }}>
                <HourglassEmpty />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Patients Waiting
                </Typography>
                <Typography variant="h4" fontWeight={800} color="#1e293b" sx={{ mt: 0.5 }}>
                  {waitingCount}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3.2}>
          <Card sx={{ 
            borderRadius: '16px', 
            border: 'none', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)', 
            position: 'relative',
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Box sx={{ position: 'absolute', right: -10, top: -10, width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(255,255,255,0) 70%)' }} />
            <CardContent sx={{ p: 3, width: '100%', display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Avatar sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', width: 52, height: 52 }}>
                <Campaign />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Called / Active
                </Typography>
                <Typography variant="h4" fontWeight={800} color="#1e293b" sx={{ mt: 0.5 }}>
                  {activeCount}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3.2}>
          <Card sx={{ 
            borderRadius: '16px', 
            border: 'none', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)', 
            position: 'relative',
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Box sx={{ position: 'absolute', right: -10, top: -10, width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, rgba(255,255,255,0) 70%)' }} />
            <CardContent sx={{ p: 3, width: '100%', display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Avatar sx={{ bgcolor: alpha(avgWaitTime >= 60 ? '#f43f5e' : '#f59e0b', 0.1), color: avgWaitTime >= 60 ? '#f43f5e' : '#f59e0b', width: 52, height: 52 }}>
                <AccessTime />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Avg Wait Time
                </Typography>
                <Typography variant="h4" fontWeight={800} color={avgWaitTime >= 60 ? '#f43f5e' : '#1e293b'} sx={{ mt: 0.5 }}>
                  {avgWaitTime} mins
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Check-in Action block */}
        <Grid item xs={12} md={2.4}>
          <Card sx={{ 
            borderRadius: '16px', 
            border: 'none', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            height: '100%'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', mb: 1, letterSpacing: 0.8 }}>
                Quick Patient Check-In
              </Typography>
              <form onSubmit={handleCheckIn}>
                <Stack spacing={1}>
                  <Autocomplete
                    options={patients}
                    getOptionLabel={(o) => `${o.mrn} - ${o.lastName}, ${o.firstName}`}
                    onInputChange={(e, val) => handlePatientSearch(val)}
                    onChange={(e, val) => setSelectedPat(val)}
                    value={selectedPat}
                    filterOptions={(x) => x}
                    renderInput={(params) => <TextField {...params} size="small" label="Search MRN/Name" placeholder="Type letters..." />}
                  />
                  <Button 
                    type="submit" 
                    variant="contained" 
                    size="small" 
                    startIcon={<PersonAdd />}
                    disabled={!selectedPat}
                    sx={{ 
                      bgcolor: deptTheme.color, 
                      '&:hover': { bgcolor: alpha(deptTheme.color, 0.9) },
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: '8px',
                      py: 0.85
                    }}
                  >
                    Add to Queue
                  </Button>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Queue Table list */}
      <Card sx={{ borderRadius: '20px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha(deptTheme.color, 0.04) }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: deptTheme.color, boxShadow: `0 0 10px ${deptTheme.color}` }} />
            <Typography variant="h6" fontWeight={800} color="#1e293b">
              {deptTheme.label} Workflow Queue
            </Typography>
          </Stack>
          <Chip 
            label={`${queue.length} Active Tickets`} 
            sx={{ fontWeight: 800, bgcolor: alpha(deptTheme.color, 0.1), color: deptTheme.color }} 
          />
        </Box>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.04)' }} />
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: deptTheme.color }} /></Box>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 'none', border: 'none' }}>
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.01)' }}>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary', py: 2, pl: 3 }}>Token</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary', py: 2 }}>Patient Details</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary', py: 2 }}>Triage Priority</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary', py: 2 }}>Time Checked In</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary', py: 2 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary', py: 2, pr: 3, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queue.map((q) => {
                  const elapsed = Math.floor((new Date().getTime() - new Date(q.createdAt).getTime()) / 60000);
                  const isOverThreshold = elapsed >= 60;
                  return (
                    <TableRow key={q.id} sx={{ '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' } }}>
                      {/* Token display */}
                      <TableCell sx={{ pl: 3, py: 2.2 }}>
                        <Chip 
                          label={q.tokenNumber} 
                          sx={{ 
                            fontWeight: 900, 
                            fontFamily: 'monospace', 
                            fontSize: '1rem',
                            bgcolor: alpha(deptTheme.color, 0.12),
                            color: deptTheme.color,
                            border: `1px solid ${alpha(deptTheme.color, 0.2)}`,
                            px: 1,
                            borderRadius: '8px'
                          }} 
                        />
                      </TableCell>

                      {/* Patient metadata */}
                      <TableCell sx={{ py: 2.2 }}>
                        <Typography variant="body1" fontWeight={700} color="#1e293b">
                          {q.patient.firstName} {q.patient.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                          MPI ID: {q.patient.patientNumber}
                        </Typography>
                      </TableCell>

                      {/* Priority chip */}
                      <TableCell sx={{ py: 2.2 }}>
                        <Chip
                          label={q.priority === 2 ? 'EMERGENCY' : q.priority === 1 ? 'PRIORITY' : 'NORMAL'}
                          size="small"
                          icon={q.priority > 0 ? <PriorityHigh sx={{ fontSize: '0.85rem' }} /> : undefined}
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            bgcolor: q.priority === 2 ? 'rgba(244,63,94,0.1)' : q.priority === 1 ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.05)',
                            color: q.priority === 2 ? '#e11d48' : q.priority === 1 ? '#d97706' : 'text.primary',
                            border: q.priority > 0 ? '1px solid currentColor' : 'none',
                          }}
                          onClick={() => {
                            setOverrideId(q.id);
                            setOverridePriority(q.priority);
                            setOpenOverride(true);
                          }}
                        />
                      </TableCell>

                      {/* Check-in time & Wait time tracker */}
                      <TableCell sx={{ py: 2.2 }}>
                        <Typography variant="body2" fontWeight={600} color="text.primary">
                          {new Date(q.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </Typography>
                        <Chip 
                          label={isOverThreshold ? `⚠️ ${elapsed}m wait` : `${elapsed}m wait`}
                          size="small"
                          sx={{ 
                            mt: 0.5, 
                            fontWeight: 800, 
                            fontSize: '0.72rem',
                            bgcolor: isOverThreshold ? 'rgba(244,63,94,0.1)' : 'rgba(0,0,0,0.04)',
                            color: isOverThreshold ? '#e11d48' : 'text.secondary',
                            border: isOverThreshold ? '1px solid #f43f5e' : 'none'
                          }} 
                        />
                      </TableCell>

                      {/* Status indicator */}
                      <TableCell sx={{ py: 2.2 }}>
                        <Chip
                          label={q.status.replace('_', ' ')}
                          size="small"
                          sx={{
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            bgcolor: 
                              q.status === 'IN_SERVICE' ? 'rgba(16,185,129,0.1)' :
                              q.status === 'CALLED' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                            color: 
                              q.status === 'IN_SERVICE' ? '#10b981' :
                              q.status === 'CALLED' ? '#d97706' : '#2563eb',
                            border: '1px solid currentColor'
                          }}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell sx={{ pr: 3, py: 2.2, textAlign: 'right' }}>
                        <Stack direction="row" spacing={1.5} justifyContent="flex-end" alignItems="center">
                          <Tooltip title="Auditory TV Announcement">
                            <IconButton 
                              color="primary" 
                              size="medium" 
                              onClick={() => handleCallAnnouncement(q.tokenNumber, `${q.patient.firstName} ${q.patient.lastName}`)}
                              sx={{ 
                                bgcolor: alpha(deptTheme.color, 0.05),
                                color: deptTheme.color,
                                '&:hover': { bgcolor: alpha(deptTheme.color, 0.1) }
                              }}
                            >
                              <VolumeUp />
                            </IconButton>
                          </Tooltip>
                          
                          {q.status === 'WAITING' && (
                            <Button 
                              size="medium" 
                              startIcon={<ArrowForward />} 
                              variant="outlined" 
                              onClick={() => handleAction(q.id, 'CALLED', q)}
                              sx={{ 
                                textTransform: 'none', 
                                fontWeight: 700, 
                                borderRadius: '10px',
                                border: `1px solid ${deptTheme.color}`,
                                color: deptTheme.color,
                                '&:hover': { bgcolor: alpha(deptTheme.color, 0.05), border: `1px solid ${deptTheme.color}` }
                              }}
                            >
                              Call Patient
                            </Button>
                          )}

                          {(q.status === 'CALLED' || q.status === 'WAITING' || q.status === 'IN_SERVICE') && (
                            <Button 
                              size="medium" 
                              startIcon={<AccessTime />} 
                              variant="contained" 
                              color="warning" 
                              onClick={() => handleAction(q.id, 'IN_SERVICE', q)}
                              sx={{ 
                                textTransform: 'none', 
                                fontWeight: 700, 
                                borderRadius: '10px',
                                color: '#fff',
                                bgcolor: '#f59e0b',
                                '&:hover': { bgcolor: '#d97706' }
                              }}
                            >
                              Start Consultation
                            </Button>
                          )}

                          {q.status === 'IN_SERVICE' && (
                            <Button 
                              size="medium" 
                              startIcon={<CheckCircle />} 
                              variant="contained" 
                              color="success" 
                              onClick={() => handleAction(q.id, 'COMPLETED')}
                              sx={{ 
                                textTransform: 'none', 
                                fontWeight: 700, 
                                borderRadius: '10px',
                                bgcolor: '#10b981',
                                '&:hover': { bgcolor: '#059669' }
                              }}
                            >
                              Complete Visit
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {queue.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Box sx={{ opacity: 0.45 }}>
                        <Campaign sx={{ fontSize: 44, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="body1" fontWeight={700} color="text.secondary">
                          No active tickets waiting in {deptTheme.label}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Priority Override Dialog */}
      <Dialog 
        open={openOverride} 
        onClose={() => setOpenOverride(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 1.5,
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.18)'
          }
        }}
      >
        <form onSubmit={handlePriorityOverride}>
          <DialogTitle sx={{ fontWeight: 800, fontSize: '1.4rem', color: '#1e293b' }}>
            Triage Priority Override
          </DialogTitle>
          <DialogContent dividers sx={{ borderTop: 'none', borderBottom: 'none' }}>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Priority level</InputLabel>
                <Select 
                  value={overridePriority} 
                  label="Priority level" 
                  onChange={e => setOverridePriority(Number(e.target.value))}
                  sx={{ borderRadius: '10px' }}
                >
                  <MenuItem value={0}>Normal Flow (First Come First Served)</MenuItem>
                  <MenuItem value={1}>Priority Category (Elderly, Pregnant, Kids)</MenuItem>
                  <MenuItem value={2}>Emergency Alert (Immediate Consultation)</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Clinical override justification reason"
                required
                fullWidth
                multiline
                rows={3}
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              onClick={() => setOpenOverride(false)}
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
              color="error" 
              disabled={submittingOverride}
              sx={{ 
                bgcolor: '#e11d48', 
                '&:hover': { bgcolor: '#be123c' }, 
                textTransform: 'none', 
                fontWeight: 700, 
                borderRadius: '8px',
                fontSize: '1rem',
                px: 3
              }}
            >
              Apply Override
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default QueueManagement;
