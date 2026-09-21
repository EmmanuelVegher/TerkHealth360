import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Card, CardContent, Button, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton,
  TextField, FormControl, InputLabel, Select, MenuItem, Stack,
  Divider, Alert, Rating, Paper, CircularProgress, Tabs, Tab, Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, FormControlLabel, Switch
} from '@mui/material';
import {
  Portrait, CalendarToday, Sync, Receipt, CheckCircle, Assignment, Star,
  Lock, Phone, Send, ArrowForward, Settings, Assessment, Psychology, HealthAndSafety,
  Videocam, PlayArrow, Warning, MedicalServices, Devices, NotificationsActive, Check
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

// ─── Design Colors ──────────────────────────────────────────────────────────
const PRIMARY = '#0f172a';
const SECONDARY = '#1e293b';
const SUCCESS = '#16a34a';
const WARNING = '#ea580c';
const DANGER = '#dc2626';
const PURPLE = '#7c3aed';
const TEAL = '#0d9488';

const TabPanel = ({ children, value, index }: any) => {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
};

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
  if (['SUCCESS', 'ACTIVE', 'TRUSTED', 'NORMAL', 'DELIVERED', 'PAID'].includes(l)) color = 'success';
  if (['PENDING_REVIEW', 'RUNNING', 'WAITING_ROOM', 'IN_CONSULTATION', 'FASTING', 'UNPAID'].includes(l)) color = 'warning';
  if (['FAILED', 'CRITICAL', 'LIFE_THREATENING', 'HIGH_RISK'].includes(l)) color = 'error';
  if (['BP', 'BG', 'SPO2', 'BLOOD_PRESSURE', 'BLOOD_GLUCOSE', 'PULSE_OXIMETER'].includes(l)) color = 'info';

  return <Chip label={label?.replace('_', ' ')} size="small" color={color} sx={{ fontWeight: 700, fontSize: '0.68rem' }} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PATIENT PORTAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const PatientPortal = () => {
  const { enqueueSnackbar } = useSnackbar();
  
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('portal_token'));
  const [patient, setPatient] = useState<any | null>(null);

  // Forms
  const [isRegistering, setIsRegistering] = useState(false);
  const [mrn, setMrn] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP verification
  const [otpSent, setOtpSent] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpMock, setOtpMock] = useState('');
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // Portal Dashboard Records
  const [records, setRecords] = useState<any | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Telemedicine Dialog Simulation
  const [teleRoomOpen, setTeleRoomOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<any | null>(null);

  // Feedback State
  const [rating, setRating] = useState<number | null>(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCat, setFeedbackCat] = useState('SERVICE');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Remote Patient Monitoring Inputs
  const [rpmType, setRpmType] = useState('BLOOD_PRESSURE');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [glucose, setGlucose] = useState('');
  const [spo2, setSpo2] = useState('');
  const [submittingRPM, setSubmittingRPM] = useState(false);

  // Fetch Portal Records
  const fetchRecords = async (patId: string) => {
    setLoadingRecords(true);
    try {
      const res = await api.get(`/portal/records/${patId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(res.data);
    } catch {
      enqueueSnackbar('Failed to fetch patient health records', { variant: 'error' });
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    const savedPat = localStorage.getItem('portal_patient');
    if (savedPat) {
      const p = JSON.parse(savedPat);
      setPatient(p);
      fetchRecords(p.id);
    }
  }, [token]);

  // Auth Functions
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAuth(true);
    try {
      const res = await api.post('/portal/register', {
        patientNumber: mrn,
        phone,
        password,
      });
      enqueueSnackbar(res.data.message, { variant: 'info' });
      setVerificationId(res.data.patientId);
      setOtpMock(res.data.mockOtp);
      setOtpSent(true);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Registration failed', { variant: 'error' });
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAuth(true);
    try {
      await api.post('/portal/verify-otp', {
        patientId: verificationId,
        otp: otpCode,
      });
      enqueueSnackbar('Portal account verified and activated. You can now login.', { variant: 'success' });
      setOtpSent(false);
      setIsRegistering(false);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Invalid verification OTP', { variant: 'error' });
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAuth(true);
    try {
      const res = await api.post('/portal/login', {
        mrn,
        password,
      });
      enqueueSnackbar('Logged into patient portal successfully', { variant: 'success' });
      localStorage.setItem('portal_token', res.data.token);
      localStorage.setItem('portal_patient', JSON.stringify(res.data.patient));
      setToken(res.data.token);
      setPatient(res.data.patient);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Authentication failed', { variant: 'error' });
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_patient');
    setToken(null);
    setPatient(null);
    setRecords(null);
    enqueueSnackbar('Logged out of Patient Portal', { variant: 'info' });
  };

  // Submit Feedback
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setSubmittingFeedback(true);
    try {
      await api.post('/portal/feedback', {
        patientId: patient.id,
        rating,
        feedbackText,
        category: feedbackCat,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      enqueueSnackbar('Thank you for your valuable feedback!', { variant: 'success' });
      setFeedbackText('');
      setRating(5);
      fetchRecords(patient.id);
    } catch {
      enqueueSnackbar('Failed to submit satisfaction feedback', { variant: 'error' });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Submit Wearables/RPM observations
  const handleRPMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setSubmittingRPM(true);
    try {
      const body: any = { patientId: patient.id, type: rpmType };
      if (rpmType === 'BLOOD_PRESSURE') {
        body.systolic = Number(systolic);
        body.diastolic = Number(diastolic);
      } else if (rpmType === 'BLOOD_GLUCOSE') {
        body.glucoseValue = Number(glucose);
      } else if (rpmType === 'PULSE_OXIMETER') {
        body.spo2 = Number(spo2);
      }

      const res = await api.post('/portal/rpm/reading', body, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.data.status === 'CRITICAL') {
        enqueueSnackbar('🚨 Critical RPM reading: Values exceed normal thresholds! High-alert flagged.', { variant: 'error' });
      } else {
        enqueueSnackbar('Home observation values submitted successfully.', { variant: 'success' });
      }
      setSystolic('');
      setDiastolic('');
      setGlucose('');
      setSpo2('');
      fetchRecords(patient.id);
    } catch {
      enqueueSnackbar('Failed to record RPM readings', { variant: 'error' });
    } finally {
      setSubmittingRPM(false);
    }
  };

  const handleJoinTelemedicine = async (session: any) => {
    try {
      await api.post('/portal/telemedicine/join', { sessionId: session.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveSession(session);
      setTeleRoomOpen(true);
      fetchRecords(patient.id);
    } catch {
      enqueueSnackbar('Failed to join telemedicine session', { variant: 'error' });
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER AUTHENTICATION VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (!token || !patient) {
    return (
      <Box sx={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', px: 2, py: 4
      }}>
        <Card sx={{ maxWidth: 440, width: '100%', borderRadius: 4, boxShadow: '0 20px 48px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
          <Box sx={{ bgcolor: PURPLE, color: '#fff', py: 3, px: 4, textAlign: 'center', position: 'relative' }}>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>👋 FFH Patient Portal</Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Faith Foundation Hospital · Digital Front Door</Typography>
          </Box>
          <CardContent sx={{ p: 4 }}>
            {!otpSent ? (
              <form onSubmit={isRegistering ? handleRegister : handleLogin}>
                <Stack spacing={2.5}>
                  <TextField label="Hospital Patient Number (MRN)" value={mrn} onChange={e => setMrn(e.target.value)} size="small" required fullWidth placeholder="e.g. PAT-101" />
                  {isRegistering && (
                    <TextField label="Registered Phone Number" value={phone} onChange={e => setPhone(e.target.value)} size="small" required fullWidth placeholder="e.g. +2348030000000" />
                  )}
                  <TextField label="Portal Password" type="password" value={password} onChange={e => setPassword(e.target.value)} size="small" required fullWidth />
                  <Button type="submit" variant="contained" fullWidth sx={{ bgcolor: PURPLE, py: 1.2, fontWeight: 700 }} disabled={submittingAuth}>
                    {submittingAuth ? <CircularProgress size={24} color="inherit" /> : (isRegistering ? 'Register Account' : 'Secure Login')}
                  </Button>
                  <Button variant="text" size="small" onClick={() => setIsRegistering(!isRegistering)}>
                    {isRegistering ? 'Already verified? Switch to Sign In' : 'New to Portal? Self-Service Register'}
                  </Button>
                </Stack>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <Stack spacing={2.5}>
                  <Alert severity="warning">OTP validation required (FR-PP-003). Check registered mobile phone.</Alert>
                  {otpMock && (
                    <Alert severity="info" icon={<Check />}>Mock OTP sent: <strong>{otpMock}</strong> (autofill allowed)</Alert>
                  )}
                  <TextField label="6-Digit SMS Verification OTP" value={otpCode} onChange={e => setOtpCode(e.target.value)} size="small" required fullWidth inputProps={{ maxLength: 6 }} />
                  <Button type="submit" variant="contained" fullWidth sx={{ bgcolor: SUCCESS, py: 1.2, fontWeight: 700 }} disabled={submittingAuth}>
                    {submittingAuth ? <CircularProgress size={24} color="inherit" /> : 'Verify Account'}
                  </Button>
                </Stack>
              </form>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN DASHBOARD VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 5 }}>
      {/* Banner */}
      <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 50%, ${TEAL} 100%)`, color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>👋 FFH Patient Portal Front Door</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 500 }}>
              Logged in as: <strong>{patient.firstName} {patient.lastName}</strong> ({patient.mrn})
            </Typography>
          </Box>
          <Button variant="outlined" color="inherit" sx={{ borderColor: 'rgba(255,255,255,0.4)' }} onClick={handleLogout}>Log Out</Button>
        </Stack>
      </Box>

      {/* KPI Stats Strip */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}><KPICard title="Queue Token Number" value={records?.queueDetails?.tokenNumber || 'None'} sub={records?.queueDetails ? `${records.queueDetails.ahead} patient(s) ahead` : 'No active queue token'} icon={<Assignment />} color={PRIMARY} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Telemedicine Room" value={records?.telemedicine?.length || 0} sub="Scheduled virtual consultations" icon={<Videocam />} color={PURPLE} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Active Wearables" value={records?.rpm?.length || 0} sub="Connected home care observations" icon={<Devices />} color={TEAL} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Billing Statements" value={records?.billingClaims?.length || 0} sub="Invoices & balance summaries" icon={<Receipt />} color={WARNING} /></Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 3, bgcolor: '#fff', borderRadius: 3, px: 1, py: 0.5, boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48, fontSize: '0.88rem' },
            '& .Mui-selected': { fontWeight: 800, color: `${PURPLE} !important` },
            '& .MuiTabs-indicator': { bgcolor: PURPLE, height: 3, borderRadius: 2 } }}>
          <Tab icon={<Assignment />} iconPosition="start" label="§26.1 Records & PHR" />
          <Tab icon={<Videocam />} iconPosition="start" label="§26.2 Telemedicine Room" />
          <Tab icon={<Devices />} iconPosition="start" label="§26.3 Remote Patient Wearables" />
          <Tab icon={<NotificationsActive />} iconPosition="start" label="§26.4 Engagement & Surveys" />
        </Tabs>

        <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>
          {loadingRecords && <LinearProgress color="secondary" sx={{ mb: 2 }} />}

          {/* §26.1 PHR RECORDS */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Active Clinical Conditions (PHR)</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow><TableCell sx={{ fontWeight: 700 }}>Condition</TableCell><TableCell sx={{ fontWeight: 700 }}>Verification Code</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {records?.conditions?.map((c: any) => (
                        <TableRow key={c.id} hover>
                          <TableCell sx={{ fontWeight: 650 }}>{c.display}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{c.code}</TableCell>
                        </TableRow>
                      ))}
                      {(!records?.conditions || records.conditions.length === 0) && (
                        <TableRow><TableCell colSpan={2} align="center">No documented chronic conditions</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Authorized Prescriptions</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow><TableCell sx={{ fontWeight: 700 }}>Medication Name</TableCell><TableCell sx={{ fontWeight: 700 }}>Dosage Instructions</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {records?.medications?.map((m: any) => (
                        <TableRow key={m.id} hover>
                          <TableCell sx={{ fontWeight: 650 }}>{m.medicationCodeableConceptText}</TableCell>
                          <TableCell>{m.dosageInstruction}</TableCell>
                        </TableRow>
                      ))}
                      {(!records?.medications || records.medications.length === 0) && (
                        <TableRow><TableCell colSpan={2} align="center">No active prescriptions available</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Electronic Billing Statements</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>{['Invoice ID', 'Date Created', 'Total Invoice Amount', 'Outstanding Balance', 'Payer Source', 'Status'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow>
                    </TableHead>
                    <TableBody>
                      {records?.billingClaims?.map((inv: any) => (
                        <TableRow key={inv.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{inv.id}</TableCell>
                          <TableCell>{inv.createdAt?.slice(0, 10)}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>₦{inv.amount.toLocaleString()}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>₦{inv.balance.toLocaleString()}</TableCell>
                          <TableCell sx={{ textTransform: 'capitalize' }}>{inv.type}</TableCell>
                          <TableCell><StatusChip label={inv.status} /></TableCell>
                        </TableRow>
                      ))}
                      {(!records?.billingClaims || records.billingClaims.length === 0) && (
                        <TableRow><TableCell colSpan={6} align="center">No outstanding billing statements</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </TabPanel>

          {/* §26.2 TELEMEDICINE VIRTUAL CONSULTATIONS */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Telemedicine Consultations (FR-TM-001–005)</Typography>
              <Typography variant="caption" color="text.secondary">Secure end-to-end encrypted video and voice checkups with your specialists.</Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>{['Session ID', 'Physician', 'Specialty', 'Schedule Time', 'Status Room', 'Action'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow>
                    </TableHead>
                    <TableBody>
                      {records?.telemedicine?.map((tel: any) => (
                        <TableRow key={tel.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{tel.id}</TableCell>
                          <TableCell sx={{ fontWeight: 650 }}>{tel.doctorName}</TableCell>
                          <TableCell><Chip label={tel.specialty} size="small" /></TableCell>
                          <TableCell>{tel.date} @ {tel.time}</TableCell>
                          <TableCell><StatusChip label={tel.status} /></TableCell>
                          <TableCell>
                            {tel.status === 'WAITING_ROOM' && (
                              <Button size="small" variant="contained" startIcon={<PlayArrow />} sx={{ bgcolor: PURPLE }} onClick={() => handleJoinTelemedicine(tel)}>Join Room</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ p: 2, borderLeft: `4px solid ${TEAL}` }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: TEAL }}>Tele-Pharmacy Refill Coordination</Typography>
                  <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                    Need medication delivery? Video-counseling can be coordinated with the pharmacy dispensary.
                  </Typography>
                  <Button variant="outlined" color="info" size="small" sx={{ mt: 2, color: TEAL, borderColor: TEAL }} onClick={() => enqueueSnackbar('Tele-pharmacy support request logged', { variant: 'info' })}>Coordinate Refill</Button>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* §26.3 REMOTE PATIENT MONITORING */}
          <TabPanel value={activeTab} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card sx={{ p: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>Log Connected Wearable Signs (FR-RPM-002)</Typography>
                  <form onSubmit={handleRPMSubmit}>
                    <Stack spacing={2}>
                      <TextField select label="Measurement Sign Type" value={rpmType} onChange={e => setRpmType(e.target.value)} size="small" fullWidth>
                        <MenuItem value="BLOOD_PRESSURE">Blood Pressure Sign</MenuItem>
                        <MenuItem value="BLOOD_GLUCOSE">Blood Glucose Sign</MenuItem>
                        <MenuItem value="PULSE_OXIMETER">Pulse Oximeter Sign</MenuItem>
                      </TextField>

                      {rpmType === 'BLOOD_PRESSURE' && (
                        <Stack direction="row" spacing={1}>
                          <TextField label="Systolic BP (mmHg)" value={systolic} onChange={e => setSystolic(e.target.value)} size="small" required fullWidth />
                          <TextField label="Diastolic BP (mmHg)" value={diastolic} onChange={e => setDiastolic(e.target.value)} size="small" required fullWidth />
                        </Stack>
                      )}

                      {rpmType === 'BLOOD_GLUCOSE' && (
                        <TextField label="Glucose Concentration (mg/dL)" value={glucose} onChange={e => setGlucose(e.target.value)} size="small" required fullWidth />
                      )}

                      {rpmType === 'PULSE_OXIMETER' && (
                        <TextField label="Blood Oxygen Saturation (SpO2 %)" value={spo2} onChange={e => setSpo2(e.target.value)} size="small" required fullWidth />
                      )}

                      <Button type="submit" variant="contained" fullWidth sx={{ bgcolor: TEAL }} disabled={submittingRPM}>
                        Submit Wearable Sign
                      </Button>
                    </Stack>
                  </form>
                </Card>
              </Grid>

              <Grid item xs={12} md={8}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Wearable Sign Log History (Zero Trust IoT Verified)</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>{['Reading ID', 'Sign Type', 'Value Measured', 'Timestamp', 'Status State'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow>
                    </TableHead>
                    <TableBody>
                      {records?.rpm?.map((reading: any) => (
                        <TableRow key={reading.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{reading.id}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{reading.type?.replace('_', ' ')}</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {reading.type === 'BLOOD_PRESSURE' ? `${reading.systolic}/${reading.diastolic} mmHg` : ''}
                            {reading.type === 'BLOOD_GLUCOSE' ? `${reading.glucoseValue} mg/dL (${reading.mealContext})` : ''}
                            {reading.type === 'PULSE_OXIMETER' ? `${reading.spo2}% SpO2` : ''}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{reading.timestamp}</TableCell>
                          <TableCell><StatusChip label={reading.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </TabPanel>

          {/* §26.4 DIGITAL ENGAGEMENT REMINDERS & SATISFACTION FEEDBACK */}
          <TabPanel value={activeTab} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>Omnichannel Reminder Preference center (FR-DE-002)</Typography>
                  <Stack spacing={1}>
                    <FormControlLabel control={<Switch checked={true} />} label="Enable Push Notifications reminders" />
                    <FormControlLabel control={<Switch checked={true} />} label="Enable WhatsApp ART Refill confirmations" />
                    <FormControlLabel control={<Switch checked={false} />} label="Enable SMS billing statements notifications" />
                  </Stack>

                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Active Public Health Outreach reminders</Typography>
                  <Stack spacing={1.5}>
                    {records?.campaigns?.map((c: any) => (
                      <Paper key={c.id} variant="outlined" sx={{ p: 1.5, borderLeft: `4px solid ${PURPLE}` }}>
                        <Typography variant="caption" sx={{ color: PURPLE, fontWeight: 800 }}>{c.channel} Notification · {c.dateSent}</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>{c.title}</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.82rem', color: 'text.secondary' }}>{c.message}</Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>Post-Visit Satisfaction Survey (FR-DE-011)</Typography>
                  <form onSubmit={handleFeedbackSubmit}>
                    <Stack spacing={2.5}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Experience category</InputLabel>
                        <Select label="Experience category" value={feedbackCat} onChange={e => setFeedbackCat(e.target.value)}>
                          <MenuItem value="SERVICE">Clinical Services</MenuItem>
                          <MenuItem value="TELEMEDICINE">Telemedicine Video Consultations</MenuItem>
                          <MenuItem value="BILLING">Billing & Cashier experience</MenuItem>
                        </Select>
                      </FormControl>

                      <Box>
                        <Typography variant="caption" color="text.secondary">Overall Star Rating Experience</Typography>
                        <Box sx={{ mt: 1 }}><Rating value={rating} onChange={(_, v) => setRating(v)} size="large" /></Box>
                      </Box>

                      <TextField label="How can we improve your care experience?" value={feedbackText} onChange={e => setFeedbackText(e.target.value)} size="small" multiline rows={3} fullWidth placeholder="Your voice matters to the Faith Foundation Hospital Quality team..." />
                      <Button type="submit" variant="contained" sx={{ bgcolor: PURPLE }} disabled={submittingFeedback}>
                        Submit Patient Survey
                      </Button>
                    </Stack>
                  </form>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </Card>
      </Box>

      {/* Telemedicine Video Room Simulation dialog */}
      <Dialog open={teleRoomOpen} onClose={() => setTeleRoomOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: PRIMARY, color: '#fff' }}>
          📹 Video Care Room: {activeSession?.doctorName} ({activeSession?.specialty})
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ width: '100%', height: 300, bgcolor: '#000', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Simulated Remote Feed */}
            <Box sx={{ color: '#fff', textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: TEAL, width: 80, height: 80, mx: 'auto', mb: 2 }}><Videocam fontSize="large" /></Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Simulated Telemedicine WebRTC Video Stream</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>Securely encrypted peer-to-peer transmission (AES-256)</Typography>
            </Box>
            {/* Local Feed Overlay */}
            <Box sx={{ position: 'absolute', bottom: 16, right: 16, width: 90, height: 120, bgcolor: '#334155', borderRadius: 1.5, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.65rem' }}>Self Camera</Typography>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            FR-TM-034 · falling back to secure messaging or audio voice channels if bandwidth connectivity drops.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeleRoomOpen(false)} variant="contained" color="error">Leave Room</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientPortal;
