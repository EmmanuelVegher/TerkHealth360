import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid,
  TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete,
  CircularProgress, Box, FormControlLabel, Switch, Typography, Chip, Stack
} from '@mui/material';
import { EventNote, Lightbulb, Person, MedicalServices } from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';

export interface PatientOption {
  id: string;
  mrn?: string;
  firstName: string;
  lastName: string;
}

export interface StaffOption {
  id: string;
  firstName: string;
  lastName: string;
  designation?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  defaultVisitType?: string;
  initialPatient?: PatientOption | null;
  initialDoctor?: StaffOption | null;
  initialReason?: string;
}

const DEFAULT_RECOMMENDED_REASONS = [
  'Post-discharge ward review',
  'Next review check-up',
  'Follow-up consultation',
  'Lab & Diagnostic results review',
  'Medication review & refill',
  'Routine 2-week check-up',
];

export const QuickAppointmentModal = ({
  open,
  onClose,
  defaultVisitType = 'Scheduled',
  initialPatient = null,
  initialDoctor = null,
  initialReason = '',
}: Props) => {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const [selectedPat, setSelectedPat] = useState<PatientOption | null>(initialPatient);
  const [selectedDoc, setSelectedDoc] = useState<StaffOption | null>(initialDoctor);
  
  // Default to tomorrow's date
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [bookingDate, setBookingDate] = useState(tomorrowStr);
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingDuration, setBookingDuration] = useState(15);
  const [bookingType, setBookingType] = useState('New Patient');
  const [visitType, setVisitType] = useState(defaultVisitType);
  const [reason, setReason] = useState(initialReason);
  const [bypassConflict, setBypassConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchRecentPatients = async () => {
    try {
      const res = await api.get('/patients/mpi', { params: { limit: 20 } });
      const found: PatientOption[] = res.data?.data || res.data || [];
      setPatients(found);
    } catch (err) {
      console.error('Failed to fetch recent patients:', err);
    }
  };

  // Sync initial props when modal opens
  useEffect(() => {
    if (open) {
      fetchRecentPatients();
      if (initialPatient) {
        setSelectedPat(initialPatient);
        setPatients(prev => {
          if (!prev.some(p => p.id === initialPatient.id)) {
            return [initialPatient, ...prev];
          }
          return prev;
        });
      }
      if (initialReason) {
        setReason(initialReason);
      }
      setBookingDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
      setBookingTime('09:00');

      // Load staff list & auto-select logged in doctor
      setLoadingStaff(true);
      api.get('/staff')
        .then(res => {
          const staffList: StaffOption[] = res.data || [];
          setStaff(staffList);

          // Auto-select doctor if initialDoctor provided or from logged in user
          if (initialDoctor) {
            setSelectedDoc(initialDoctor);
          } else if (user) {
            const matchedDoc = staffList.find(s =>
              (user.staffId && s.id === user.staffId) ||
              (user.firstName && s.firstName?.toLowerCase() === user.firstName?.toLowerCase() &&
               s.lastName?.toLowerCase() === user.lastName?.toLowerCase())
            );
            if (matchedDoc) {
              setSelectedDoc(matchedDoc);
            } else if (staffList.length > 0) {
              // Default to first available clinician/doctor
              setSelectedDoc(staffList[0]);
            }
          }
        })
        .catch(err => console.error('Failed to load staff list:', err))
        .finally(() => setLoadingStaff(false));
    }
  }, [open, initialPatient, initialDoctor, initialReason, user]);

  const handlePatientSearch = async (val: string) => {
    if (!val || val.trim().length === 0) {
      fetchRecentPatients();
      return;
    }
    try {
      const res = await api.get('/patients/mpi', { params: { query: val } });
      const found: PatientOption[] = res.data?.data || res.data || [];
      setPatients(found);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectReasonChip = (chipText: string) => {
    setReason(chipText);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPat) {
      enqueueSnackbar('Patient selection is mandatory', { variant: 'warning' });
      return;
    }
    if (!bookingDate || !bookingTime) {
      enqueueSnackbar('Please select date and time', { variant: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      const isoStart = new Date(`${bookingDate}T${bookingTime}`).toISOString();
      await api.post('/appointments', {
        patientId: selectedPat.id,
        staffId: selectedDoc?.id || null,
        start: isoStart,
        duration: Number(bookingDuration) || 15,
        appointmentType: bookingType,
        visitType,
        reasonText: reason || 'Clinic consultation',
        bypassConflict,
      });

      const patName = `${selectedPat.lastName}, ${selectedPat.firstName}`;
      enqueueSnackbar(`Clinic appointment booked for ${patName}!`, { variant: 'success' });
      handleClose();
    } catch (err: any) {
      if (err.response?.status === 409) {
        enqueueSnackbar('Slot conflict: Selected provider is already booked. Enable Emergency override to bypass.', { variant: 'warning' });
      } else {
        enqueueSnackbar(err.response?.data?.message || 'Error booking appointment', { variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedPat(null);
    setSelectedDoc(null);
    setReason('');
    setBypassConflict(false);
    onClose();
  };

  // Compile recommended reasons list (including initialReason if unique)
  const recommendedReasons = Array.from(new Set([
    ...(initialReason ? [initialReason] : []),
    ...DEFAULT_RECOMMENDED_REASONS,
  ]));

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, fontSize: '1.25rem', py: 2 }}>
        <EventNote color="primary" /> Book Clinic Appointment
      </DialogTitle>
      <form onSubmit={handleBook}>
        <DialogContent dividers sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            {/* Search Patient Name/MRN */}
            <Grid item xs={12}>
              <Autocomplete
                options={patients}
                getOptionLabel={(p) => `${p.mrn || 'MRN'} - ${p.lastName?.toUpperCase() || ''}, ${p.firstName || ''}`}
                onOpen={() => {
                  if (patients.length === 0) fetchRecentPatients();
                }}
                onInputChange={(_, val, reason) => {
                  if (reason === 'input') {
                    handlePatientSearch(val);
                  }
                }}
                onChange={(_, val) => setSelectedPat(val)}
                value={selectedPat}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Patient Name/MRN *"
                    required
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />
            </Grid>

            {/* Assign Doctor / Specialist */}
            <Grid item xs={12}>
              <Autocomplete
                options={staff}
                getOptionLabel={(s) => `${s.lastName || ''}, ${s.firstName || ''} ${s.designation ? `(${s.designation})` : ''}`}
                onChange={(_, val) => setSelectedDoc(val)}
                value={selectedDoc}
                loading={loadingStaff}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Assign Doctor / Specialist"
                    placeholder="Select attending clinician"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />
            </Grid>

            {/* Date & Time */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="date"
                label="Date *"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={bookingDate}
                onChange={e => setBookingDate(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                type="time"
                label="Time *"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={bookingTime}
                onChange={e => setBookingTime(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            {/* Duration, Appt Type, Visit Type */}
            <Grid item xs={12} sm={4}>
              <TextField
                type="number"
                label="Duration (mins) *"
                fullWidth
                required
                value={bookingDuration}
                onChange={e => setBookingDuration(parseInt(e.target.value) || 15)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Appt Type</InputLabel>
                <Select
                  value={bookingType}
                  label="Appt Type"
                  onChange={e => setBookingType(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="New Patient">New Patient</MenuItem>
                  <MenuItem value="Follow-up">Follow-up</MenuItem>
                  <MenuItem value="Procedure">Procedure</MenuItem>
                  <MenuItem value="Routine">Routine</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Visit Type</InputLabel>
                <Select
                  value={visitType}
                  label="Visit Type"
                  onChange={e => setVisitType(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="Scheduled">Scheduled</MenuItem>
                  <MenuItem value="Walk-in">Walk-in</MenuItem>
                  <MenuItem value="Telemedicine">Telemedicine</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Reason for Consultation */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason for Consultation"
                placeholder="Enter consultation reason or select recommendation below"
                multiline
                rows={2.5}
                value={reason}
                onChange={e => setReason(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            {/* Recommended Reason Chips */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
                <Lightbulb sx={{ color: 'warning.main', fontSize: 16 }} />
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  Recommended Reasons (Tap to inject into input):
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                {recommendedReasons.map((recText) => (
                  <Chip
                    key={recText}
                    label={recText}
                    size="small"
                    onClick={() => handleSelectReasonChip(recText)}
                    color={reason === recText ? 'primary' : 'default'}
                    variant={reason === recText ? 'filled' : 'outlined'}
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.725rem',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'primary.light', color: '#fff' }
                    }}
                  />
                ))}
              </Stack>
            </Grid>

            {/* Bypass Emergency Override Switch */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={bypassConflict}
                    onChange={e => setBypassConflict(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    Bypass booking slots conflict rules (Emergency override)
                  </Typography>
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleClose} variant="outlined" color="inherit" sx={{ borderRadius: 2, fontWeight: 700 }}>
            Discard
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{ borderRadius: 2, fontWeight: 800, px: 3, py: 1 }}
          >
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'Confirm Booking'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
