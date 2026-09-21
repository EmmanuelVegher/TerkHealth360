import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, FormControl, InputLabel, Select, MenuItem, CircularProgress, Typography } from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { DuplicateWarningModal, Candidate } from './DuplicateWarningModal';

interface Props {
  open: boolean;
  onClose: () => void;
  serviceType: 'PHARMACY_ONLY' | 'LAB_ONLY' | 'MORTUARY_ONLY' | string;
  onSuccess?: () => void;
}

export const QuickExternalRegisterModal = ({ open, onClose, serviceType, onSuccess }: Props) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    gender: serviceType === 'ANC' ? 'FEMALE' : 'MALE',
  });

  // Duplicate Warning Modal states
  const [duplicateCandidates, setDuplicateCandidates] = useState<Candidate[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  React.useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        gender: serviceType === 'ANC' ? 'FEMALE' : 'MALE'
      }));
    }
  }, [open, serviceType]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const registerPatient = async (overrideDuplicate = false) => {
    setLoading(true);
    try {
      let registrationFee = 0;
      const catsJson = localStorage.getItem('registration_categories');
      if (catsJson) {
        try {
          const cats = JSON.parse(catsJson);
          const cat = cats.find((c: any) => c.code === serviceType);
          if (cat) {
            registrationFee = cat.fee || 0;
          }
        } catch (e) {}
      }

      if (serviceType === 'ANC') {
        try {
          const tariffsRes = await api.get('/workflow/consultation-services?activeOnly=true');
          const ancTariff = tariffsRes.data?.data?.find((t: any) => t.code === 'ANC-VISIT' || t.category === 'ANC');
          if (ancTariff) {
            registrationFee = ancTariff.price || 0;
          }
        } catch (e) {
          console.error("Failed to fetch ANC tariff", e);
        }
      }

      const res = await api.post('/patients/external', {
        ...formData,
        serviceType,
        registrationFee,
        overrideDuplicate,
      });

      if (res.data?.success) {
        const visitId = res.data.visit.id;
        try {
          await api.post(`/workflow/visits/${visitId}/start`);
        } catch (err) {
          console.error("Failed to start workflow automatically", err);
        }

        enqueueSnackbar(`External client registered and queued for ${serviceType.replace('_ONLY', '')} successfully!`, { variant: 'success' });
        if (onSuccess) onSuccess();
        setShowDuplicateModal(false);
        onClose();
        setFormData({ firstName: '', lastName: '', phone: '', gender: 'MALE' });
      }
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.duplicateDetected) {
        setDuplicateCandidates(err.response.data.candidates || []);
        setShowDuplicateModal(true);
      } else {
        enqueueSnackbar(err.response?.data?.message || 'Failed to register external client', { variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      enqueueSnackbar('First Name, Last Name and Phone are required.', { variant: 'warning' });
      return;
    }
    await registerPatient(false);
  };

  const handleSelectExistingCandidate = (candidate: Candidate) => {
    enqueueSnackbar(`Selected existing patient: ${candidate.firstName} ${candidate.lastName} (${candidate.patientNumber})`, { variant: 'info' });
    setShowDuplicateModal(false);
    onClose();
    if (onSuccess) onSuccess();
  };

  const handleOverrideDuplicate = async () => {
    setShowDuplicateModal(false);
    await registerPatient(true);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <PersonAdd color="primary" /> Register External Client
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Quickly register an external walk-in client to process their {serviceType.replace('_ONLY', '')} request. No registration fee will be charged.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  inputProps={{ maxLength: 11, pattern: '[0-9]*' }}
                  helperText="Must not exceed 11 digits"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Sex</InputLabel>
                  <Select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    label="Sex"
                    disabled={serviceType === 'ANC'}
                  >
                    {serviceType !== 'ANC' && <MenuItem value="MALE">Male</MenuItem>}
                    <MenuItem value="FEMALE">Female</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
              Register & Queue
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <DuplicateWarningModal
        open={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        incomingName={`${formData.firstName} ${formData.lastName}`}
        incomingPhone={formData.phone}
        candidates={duplicateCandidates}
        onSelectExisting={handleSelectExistingCandidate}
        onOverride={handleOverrideDuplicate}
      />
    </>
  );
};
