import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Typography, Box, Card, CardContent, Button, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton,
  TextField, FormControl, InputLabel, Select, MenuItem, Stack,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete,
  Paper, Switch, FormControlLabel
} from '@mui/material';
import {
  CalendarToday, Add, Cancel, Sync, EventNote, Person, Schedule, Block
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

interface PatientOption {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
}

interface StaffOption {
  id: string;
  firstName: string;
  lastName: string;
  designation: string;
}

const AppointmentCalendar = () => {
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  // Dialogs
  const [openBook, setOpenBook] = useState(false);
  const [openCancel, setOpenCancel] = useState(false);
  const [openBlock, setOpenBlock] = useState(false);

  // New Booking State
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [selectedPat, setSelectedPat] = useState<PatientOption | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<StaffOption | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingDuration, setBookingDuration] = useState(15);
  const [bookingType, setBookingType] = useState('NEW');
  const [visitType, setVisitType] = useState('SCHEDULED');
  const [reason, setReason] = useState('');
  const [bypassConflict, setBypassConflict] = useState(false);
  const [submittingBook, setSubmittingBook] = useState(false);

  // Cancellation State
  const [activeApptId, setActiveApptId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Leave Block State
  const [blockDoc, setBlockDoc] = useState<StaffOption | null>(null);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [submittingBlock, setSubmittingBlock] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data);
    } catch (err) {
      enqueueSnackbar('Failed to load appointments', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const resStaff = await api.get('/staff', { params: { limit: 50 } });
      setStaff(resStaff.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInitialPatients = async () => {
    try {
      const res = await api.get('/patients/mpi', { params: { limit: 50 } });
      setPatients(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePatientSearch = async (val: string) => {
    try {
      const params: any = { limit: 50 };
      if (val && val.trim().length >= 1) {
        params.query = val;
      }
      const res = await api.get('/patients/mpi', { params });
      setPatients(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStaffSearch = async (val: string) => {
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
      setStaff(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    loadData();
    fetchInitialPatients();
  }, []);

  useEffect(() => {
    if (location.state && (location.state as any).preselectedPatient) {
      const p = (location.state as any).preselectedPatient;
      setSelectedPat({
        id: p.id,
        mrn: p.mrn || p.patientNumber || '',
        firstName: p.firstName || '',
        lastName: p.lastName || ''
      });
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      setBookingDate(tomorrow);
      setBookingTime('09:00');
      setSelectedDoc(null);
      setBookingDuration(15);
      setBookingType('NEW');
      setVisitType('SCHEDULED');
      setReason('Next review check-up');
      setBypassConflict(false);
      setOpenBook(true);
    }
  }, [location.state]);

  useEffect(() => {
    handleStaffSearch('');
  }, [bookingDate, bookingTime, bookingDuration]);

  const handleOpenBook = () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    setBookingDate(tomorrow);
    setBookingTime('09:00');
    setSelectedPat(null);
    setSelectedDoc(null);
    setBookingDuration(15);
    setBookingType('NEW');
    setVisitType('SCHEDULED');
    setReason('');
    setBypassConflict(false);
    setOpenBook(true);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPat) {
      enqueueSnackbar('Patient selection is mandatory', { variant: 'warning' });
      return;
    }
    setSubmittingBook(true);
    try {
      const isoStart = new Date(`${bookingDate}T${bookingTime}`).toISOString();
      await api.post('/appointments', {
        patientId: selectedPat.id,
        staffId: selectedDoc?.id || null,
        start: isoStart,
        duration: bookingDuration,
        appointmentType: bookingType,
        visitType,
        reasonText: reason,
        bypassConflict,
      });

      enqueueSnackbar('Appointment successfully booked!', { variant: 'success' });
      setOpenBook(false);
      // Clear forms
      setSelectedPat(null); setSelectedDoc(null); setBookingDate(''); setBookingTime('');
      setReason(''); setBypassConflict(false);
      fetchAppointments();
    } catch (err: any) {
      if (err.response?.status === 409) {
        enqueueSnackbar('Slot conflict: Selected provider is already booked. Select bypass control to override.', { variant: 'warning' });
      } else {
        enqueueSnackbar(err.response?.data?.message || 'Error booking appointment', { variant: 'error' });
      }
    } finally {
      setSubmittingBook(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApptId) return;
    setSubmittingCancel(true);
    try {
      await api.post(`/appointments/cancel/${activeApptId}`, {
        statusReason: cancelReason,
      });
      enqueueSnackbar('Appointment successfully cancelled.', { variant: 'success' });
      setOpenCancel(false);
      setCancelReason('');
      setActiveApptId(null);
      fetchAppointments();
    } catch (err) {
      enqueueSnackbar('Cancellation failed', { variant: 'error' });
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDoc) return;
    setSubmittingBlock(true);
    try {
      await api.post('/appointments/blocks', {
        staffId: blockDoc.id,
        startTime: new Date(blockStart).toISOString(),
        endTime: new Date(blockEnd).toISOString(),
        reason: blockReason,
      });
      enqueueSnackbar('Provider leave blocked successfully!', { variant: 'success' });
      setOpenBlock(false);
      setBlockDoc(null); setBlockStart(''); setBlockEnd(''); setBlockReason('');
    } catch (err) {
      enqueueSnackbar('Failed to register leave block', { variant: 'error' });
    } finally {
      setSubmittingBlock(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Appointments Scheduler</Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<Block />} onClick={() => setOpenBlock(true)}>
            Block Provider Leave
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenBook}>
            Book Appointment
          </Button>
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><Sync className="spin" /></Box>
      ) : (
        <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: 'none' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Token / Ref</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Patient</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Provider / Doctor</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Schedule Time</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Flow Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {appointments.map((appt) => (
                    <TableRow key={appt.id}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{appt.appointmentNumber || 'N/A'}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {appt.patient.firstName} {appt.patient.lastName}
                        <Typography variant="caption" display="block" color="text.secondary">
                          MRN: {appt.patient.patientNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {appt.staff ? `Dr. ${appt.staff.firstName} ${appt.staff.lastName}` : 'General Clinic'}
                      </TableCell>
                      <TableCell>
                        {new Date(appt.start).toLocaleString()}
                        <Typography variant="caption" display="block" color="text.secondary">
                          Duration: {appt.duration} mins
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            appt.appointmentType === 'FAMILY_PLANNING' ? 'Family Planning' :
                            appt.appointmentType === 'ANC_FOLLOW_UP' ? 'ANC Follow-up' :
                            appt.appointmentType || 'GENERAL'
                          } 
                          size="small" 
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={appt.status}
                          size="small"
                          color={
                            appt.status === 'FULFILLED' ? 'success' :
                            appt.status === 'CANCELLED' ? 'error' : 'primary'
                          }
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {appt.status !== 'CANCELLED' && appt.status !== 'FULFILLED' && (
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => {
                              setActiveApptId(appt.id);
                              setOpenCancel(true);
                            }}
                          >
                            <Cancel />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {appointments.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>No appointments registered.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Book Appointment Dialog */}
      <Dialog open={openBook} onClose={() => setOpenBook(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleBook}>
          <DialogTitle sx={{ fontWeight: 'bold' }}>Book Clinic Appointment</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5}>
              <Autocomplete
                options={patients}
                getOptionLabel={(o) => o ? `${o.mrn || ''} - ${o.lastName || ''}, ${o.firstName || ''}` : ''}
                filterOptions={(x) => x}
                onInputChange={(e, val) => handlePatientSearch(val)}
                onChange={(e, val) => setSelectedPat(val)}
                value={selectedPat}
                isOptionEqualToValue={(option, val) => option.id === val.id}
                renderInput={(params) => <TextField {...params} required label="Search Patient Name/MRN" placeholder="Type name or MRN to search..." />}
              />

              <Autocomplete
                options={staff}
                getOptionLabel={(o) => o ? `Dr. ${o.lastName || ''}, ${o.firstName || ''} (${o.designation || ''})` : ''}
                filterOptions={(x) => x}
                onInputChange={(e, val) => handleStaffSearch(val)}
                onChange={(e, val) => setSelectedDoc(val)}
                value={selectedDoc}
                isOptionEqualToValue={(option, val) => option.id === val.id}
                renderInput={(params) => <TextField {...params} label="Assign Doctor / Specialist" placeholder="Type doctor name to search..." />}
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField type="date" required fullWidth label="Date" InputLabelProps={{ shrink: true }} value={bookingDate} onChange={e => setBookingDate(e.target.value)} inputProps={{ min: tomorrowStr }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField type="time" required fullWidth label="Time" InputLabelProps={{ shrink: true }} value={bookingTime} onChange={e => setBookingTime(e.target.value)} />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <TextField type="number" required fullWidth label="Duration (mins)" value={bookingDuration} onChange={e => setBookingDuration(parseInt(e.target.value))} />
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
                    <Select value={visitType} onChange={e => setVisitType(e.target.value)} label="Visit Type">
                      <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                      <MenuItem value="WALK_IN">Walk-In</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <TextField label="Reason for Consultation" multiline rows={2} fullWidth value={reason} onChange={e => setReason(e.target.value)} />

              <FormControlLabel
                control={<Switch checked={bypassConflict} onChange={e => setBypassConflict(e.target.checked)} />}
                label="Bypass booking slots conflict rules (Emergency override)"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBook(false)}>Discard</Button>
            <Button type="submit" variant="contained" disabled={submittingBook}>Confirm Booking</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Cancel Appointment Dialog */}
      <Dialog open={openCancel} onClose={() => setOpenCancel(false)}>
        <form onSubmit={handleCancel}>
          <DialogTitle sx={{ fontWeight: 'bold' }}>Cancel Appointment Case</DialogTitle>
          <DialogContent dividers>
            <TextField
              label="Reason for cancellation"
              required
              fullWidth
              multiline
              rows={2}
              placeholder="Provide reason (patient request, clinician unavailable etc.)"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCancel(false)}>Keep Booking</Button>
            <Button type="submit" color="error" variant="contained" disabled={submittingCancel}>Confirm Cancellation</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Block Leave Dialog */}
      <Dialog open={openBlock} onClose={() => setOpenBlock(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateBlock}>
          <DialogTitle sx={{ fontWeight: 'bold' }}>Register Provider Leave Block</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Autocomplete
                options={staff}
                getOptionLabel={(o) => `Dr. ${o.lastName}, ${o.firstName}`}
                onChange={(e, val) => setBlockDoc(val)}
                renderInput={(params) => <TextField {...params} required label="Select Doctor" />}
              />
              <TextField type="datetime-local" required fullWidth label="Block Start" InputLabelProps={{ shrink: true }} value={blockStart} onChange={e => setBlockStart(e.target.value)} />
              <TextField type="datetime-local" required fullWidth label="Block End" InputLabelProps={{ shrink: true }} value={blockEnd} onChange={e => setBlockEnd(e.target.value)} />
              <TextField label="Block Reason (Holiday/Leave)" required fullWidth value={blockReason} onChange={e => setBlockReason(e.target.value)} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBlock(false)}>Discard</Button>
            <Button type="submit" variant="contained" color="error" disabled={submittingBlock}>Block Period</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default AppointmentCalendar;
