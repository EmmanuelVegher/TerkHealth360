import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, MenuItem, Stack, Alert, Box, Typography, Chip, Autocomplete
} from '@mui/material';
import { AccessibilityNew, Send } from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

interface PhysioReferralModalProps {
  open: boolean;
  onClose: () => void;
  patient?: {
    id?: string;
    mrn?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    ward?: string;
    bed?: string;
    diagnosis?: string;
    careSetting?: 'INPATIENT_BEDSIDE' | 'OUTPATIENT_GYM';
  } | null;
  onSuccess?: () => void;
}

// ── Dropdown Options Catalog ──────────────────────────────────────────────

export const URGENCY_PRIORITIES = [
  { value: 'URGENT', label: '🚨 STAT / URGENT (Immediate Bedside / Rehab Evaluation)' },
  { value: 'HIGH', label: '⚡ HIGH PRIORITY (Within 24 Hours / Post-Op Day 1)' },
  { value: 'ROUTINE', label: '📅 ROUTINE (Standard Inpatient / Outpatient Track)' },
  { value: 'PRE_DISCHARGE', label: '🏁 PRE-DISCHARGE (Mobility Clearance & Home Plan)' },
];

export const CARE_SETTINGS = [
  { value: 'INPATIENT_BEDSIDE', label: '🛏️ Inpatient Ward Bedside' },
  { value: 'OUTPATIENT_GYM', label: '🏋️ Outpatient Physio Gym' },
  { value: 'ICU_HDU', label: '🏥 Intensive Care Unit (ICU / HDU Early Mobilization)' },
  { value: 'HOME_TELE', label: '🏠 Home Rehabilitation / Tele-Physio Program' },
];

export const HOSPITAL_LOCATIONS = [
  'Surgical Ward A (Bed SUR-01)',
  'Surgical Ward B (Bed SUR-02)',
  'Surgical Ward B (Bed SUR-03)',
  'Medical Ward A (Bed MED-01)',
  'Medical Ward B (Bed MED-02)',
  'Orthopaedic & Trauma Ward (Bed ORT-01)',
  'Orthopaedic & Trauma Ward (Bed ORT-02)',
  'ICU / Critical Care Complex (Bed ICU-01)',
  'Paediatric Ward (Bed PAED-01)',
  'Private VIP Suite (Suite VIP-01)',
  'Emergency Observation Ward (Bed ER-01)',
  'OPD Consultation Room 1',
  'OPD Consultation Room 2',
  'OPD Consultation Room 3',
  'Physio Outpatient Gym & Wellness Suite',
];

export const REFERRING_DOCTORS = [
  'Dr. A. B. Balogun (Consultant Surgeon)',
  'Dr. Sarah Alabi (Consultant Neurologist)',
  'Dr. Emeka Eze (Chief of Surgery & Trauma)',
  'Dr. Fatima Bello (Consultant Rheumatologist & Internal Med)',
  'Dr. Michael Chen (Consultant Cardiothoracic Surgeon)',
  'Dr. Grace Oladipo (Consultant Paediatrician)',
  'Dr. Tunde Bakare (Consultant Spine & Neurosurgeon)',
  'Dr. Ngozi Okonjo (Consultant Obstetrician & Gynaecologist)',
  'Emergency Medicine Attending Physician',
  'Inpatient Medical Officer on Duty',
];

export const CLINICAL_DIAGNOSES = [
  'Post-Op Fracture / ORIF Mobility Impairment',
  'Post-Stroke Hemiparesis / Gait Re-education',
  'Total Knee Arthroplasty (TKA) Post-Op Rehabilitation',
  'Total Hip Arthroplasty (THA) Post-Op Rehabilitation',
  'Lumbar Spondylosis / Low Back Pain & Sciatica',
  'Cervical Spondylosis / Cervical Radiculopathy',
  'Adhesive Capsulitis (Frozen Shoulder) / Rotator Cuff Tendinopathy',
  'ACL Reconstruction & Meniscal Repair Return-to-Play',
  'Spinal Cord Injury (Paraplegia / Incomplete Tetraplegia)',
  'Parkinson\'s Disease / Movement Disorder Balance Training',
  'Chest Physiotherapy / Post-Op Pulmonary Atelectasis & Deconditioning',
  'Paediatric Cerebral Palsy / Delayed Motor Milestones',
  'Post-Mastectomy Secondary Lymphoedema Management',
];

export const REHAB_PACKAGES = [
  { name: 'Post-Op Mobilization (10 Sessions)', defaultSessions: 10 },
  { name: 'Stroke Neurological Rehabilitation (20 Sessions)', defaultSessions: 20 },
  { name: 'Orthopaedic Joint & Fracture Recovery (12 Sessions)', defaultSessions: 12 },
  { name: 'Spine, Core & Postural Realignment (8 Sessions)', defaultSessions: 8 },
  { name: 'Chest Physiotherapy & Pulmonary Hygiene (5 Sessions)', defaultSessions: 5 },
  { name: 'Sports Injury & Return-to-Play Conditioning (15 Sessions)', defaultSessions: 15 },
  { name: 'Paediatric Neurodevelopmental Therapy (20 Sessions)', defaultSessions: 20 },
  { name: 'Geriatric Fall Prevention & Gait Stability (10 Sessions)', defaultSessions: 10 },
  { name: 'Pelvic Floor & Women\'s Health Physio (6 Sessions)', defaultSessions: 6 },
  { name: 'General Musculoskeletal Rehabilitation (8 Sessions)', defaultSessions: 8 },
];

export const CLINICAL_PRECAUTION_CHIPS = [
  'Tilt-table weight bearing',
  'Non-weight bearing (NWB)',
  'Partial weight bearing (PWB)',
  'Full weight bearing as tolerated (FWBAT)',
  'Fall risk precautions',
  'DVT / Anticoagulation alert',
  'Sternal precautions',
  'Spinal precautions (No bending/twisting)',
  'Gentle passive ROM only',
  'Cryotherapy & TENS for pain relief',
];

export const PhysioReferralModal: React.FC<PhysioReferralModalProps> = ({
  open,
  onClose,
  patient,
  onSuccess
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [submitting, setSubmitting] = useState(false);

  const patientName = patient?.name || (patient?.firstName ? `${patient.firstName} ${patient.lastName || ''}`.trim() : '');
  const isWard = !!(patient?.ward || patient?.careSetting === 'INPATIENT_BEDSIDE');

  const [form, setForm] = useState({
    patientId: patient?.id || patient?.mrn || '',
    patientName: patientName || 'GREGORY CHISOM',
    phone: patient?.phone || '+2348031234567',
    wardLocation: patient?.ward ? `${patient.ward} (Bed ${patient.bed || 'SUR-02'})` : (isWard ? 'Surgical Ward B (Bed SUR-02)' : 'Physio Outpatient Gym'),
    careSetting: isWard ? 'INPATIENT_BEDSIDE' : 'OUTPATIENT_GYM',
    referredBy: 'Dr. A. B. Balogun (Consultant Surgeon)',
    diagnosis: patient?.diagnosis || 'Post-Op Fracture / Mobility Impairment',
    priority: 'URGENT',
    recommendedPackage: 'Post-Op Mobilization (10 Sessions)',
    targetSessions: 10,
    clinicalNotes: 'Patient requires bedside passive-to-active assisted joint mobilization and tilt-table weight bearing.'
  });

  // Keep state synced when patient prop changes
  useEffect(() => {
    if (patient) {
      const pName = patient.name || (patient.firstName ? `${patient.firstName} ${patient.lastName || ''}`.trim() : '');
      const ward = !!(patient.ward || patient.careSetting === 'INPATIENT_BEDSIDE');
      setForm(prev => ({
        ...prev,
        patientId: patient.id || patient.mrn || prev.patientId,
        patientName: pName || prev.patientName,
        phone: patient.phone || prev.phone,
        wardLocation: patient.ward ? `${patient.ward} (Bed ${patient.bed || 'SUR-02'})` : prev.wardLocation,
        careSetting: ward ? 'INPATIENT_BEDSIDE' : 'OUTPATIENT_GYM',
        diagnosis: patient.diagnosis || prev.diagnosis
      }));
    }
  }, [patient]);

  const handlePackageChange = (pkgName: string) => {
    const found = REHAB_PACKAGES.find(p => p.name === pkgName);
    setForm(prev => ({
      ...prev,
      recommendedPackage: pkgName,
      targetSessions: found ? found.defaultSessions : prev.targetSessions
    }));
  };

  const handleAddPrecaution = (precaution: string) => {
    setForm(prev => {
      if (prev.clinicalNotes.includes(precaution)) return prev;
      const separator = prev.clinicalNotes.trim().length > 0 ? (prev.clinicalNotes.endsWith('.') ? ' ' : '. ') : '';
      return {
        ...prev,
        clinicalNotes: `${prev.clinicalNotes.trim()}${separator}${precaution}.`
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/rehabilitation/referrals', form);
      enqueueSnackbar(res.data?.message || `Electronic referral for ${form.patientName} submitted to Physiotherapy!`, { variant: 'success' });
      onClose();
      if (onSuccess) onSuccess();
    } catch {
      enqueueSnackbar('Failed to submit electronic referral to Physiotherapy', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{
          fontWeight: 800,
          bgcolor: '#0f172a',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2,
          px: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <AccessibilityNew sx={{ color: '#38bdf8', fontSize: '1.6rem' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
                Electronic Referral to Physiotherapy & Rehabilitation
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                Internal Inter-Departmental Paperless Clinical Dispatch
              </Typography>
            </Box>
          </Box>
          <Chip
            size="small"
            label="Doctor's Module Trigger"
            sx={{ bgcolor: 'rgba(56,189,248,0.2)', color: '#38bdf8', fontWeight: 800, fontSize: '0.72rem' }}
          />
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            p: 3,
            bgcolor: '#fdfdfd',
            maxHeight: 'calc(80vh - 120px)',
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { background: '#f1f5f9', borderRadius: '4px' },
            '&::-webkit-scrollbar-thumb': { background: '#94a3b8', borderRadius: '4px', '&:hover': { background: '#64748b' } }
          }}
        >
          <Stack spacing={2.5}>
            <Alert severity="info" sx={{ fontSize: '0.82rem', borderRadius: 2, bgcolor: '#e0f2fe', color: '#0369a1', '& .MuiAlert-icon': { color: '#0284c7' } }}>
              Dispatches a paperless clinical referral from <strong>{form.careSetting === 'INPATIENT_BEDSIDE' ? 'Inpatient Ward' : 'Outpatient Ward / Clinic'}</strong> directly to the <strong>Physiotherapy Pending Referrals Queue</strong>. A billing invoice is automatically issued for the {form.targetSessions} session(s).
            </Alert>

            {/* 1. Patient Details */}
            <TextField
              label="Patient Full Name *"
              fullWidth
              size="small"
              value={form.patientName}
              onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))}
              required
              helperText={form.patientId ? `Patient ID / MRN: ${form.patientId}` : undefined}
            />

            {/* 2. Phone & Priority Dropdown */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Patient Phone Number *"
                  fullWidth
                  size="small"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Clinical Urgency Priority *"
                  fullWidth
                  size="small"
                  value={form.priority}
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  required
                >
                  {URGENCY_PRIORITIES.map(opt => (
                    <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.86rem' }}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {/* 3. Care Setting Dropdown & Ward/Bed Location Autocomplete */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Care Setting *"
                  fullWidth
                  size="small"
                  value={form.careSetting}
                  onChange={e => setForm(p => ({ ...p, careSetting: e.target.value }))}
                  required
                >
                  {CARE_SETTINGS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.86rem' }}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={HOSPITAL_LOCATIONS}
                  value={form.wardLocation}
                  onInputChange={(_, val) => setForm(p => ({ ...p, wardLocation: val }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Ward & Bed Location / Clinic *"
                      size="small"
                      required
                    />
                  )}
                />
              </Grid>
            </Grid>

            {/* 4. Referring Doctor & Department Dropdown */}
            <Autocomplete
              freeSolo
              options={REFERRING_DOCTORS}
              value={form.referredBy}
              onInputChange={(_, val) => setForm(p => ({ ...p, referredBy: val }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Referring Doctor & Department *"
                  size="small"
                  required
                />
              )}
            />

            {/* 5. Clinical Diagnosis & Indications Dropdown */}
            <Autocomplete
              freeSolo
              options={CLINICAL_DIAGNOSES}
              value={form.diagnosis}
              onInputChange={(_, val) => setForm(p => ({ ...p, diagnosis: val }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Clinical Diagnosis & Indications *"
                  size="small"
                  required
                />
              )}
            />

            {/* 6. Treatment Package Dropdown & Total Sessions */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <Autocomplete
                  freeSolo
                  options={REHAB_PACKAGES.map(p => p.name)}
                  value={form.recommendedPackage}
                  onChange={(_, val) => handlePackageChange(val || '')}
                  onInputChange={(_, val) => setForm(p => ({ ...p, recommendedPackage: val }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Prescribed Rehab Treatment Package"
                      size="small"
                      helperText="Selecting a package auto-fills the standard session count"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  type="number"
                  label="Total Sessions"
                  fullWidth
                  size="small"
                  value={form.targetSessions}
                  onChange={e => setForm(p => ({ ...p, targetSessions: Math.max(1, Number(e.target.value) || 1) }))}
                  inputProps={{ min: 1, max: 100 }}
                />
              </Grid>
            </Grid>

            {/* 7. Clinical Instructions & Precautions with Quick-Select Chips */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mb: 0.8, display: 'block' }}>
                💡 Quick-Select Clinical Precautions (Click to append):
              </Typography>
              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mb: 1.2 }}>
                {CLINICAL_PRECAUTION_CHIPS.map(chip => (
                  <Chip
                    key={chip}
                    label={`+ ${chip}`}
                    size="small"
                    onClick={() => handleAddPrecaution(chip)}
                    clickable
                    sx={{
                      fontSize: '0.73rem',
                      fontWeight: 600,
                      bgcolor: form.clinicalNotes.includes(chip) ? '#dbeafe' : '#f1f5f9',
                      color: form.clinicalNotes.includes(chip) ? '#1d4ed8' : '#334155',
                      border: '1px solid',
                      borderColor: form.clinicalNotes.includes(chip) ? '#93c5fd' : '#e2e8f0',
                      '&:hover': { bgcolor: '#e2e8f0' }
                    }}
                  />
                ))}
              </Stack>

              <TextField
                label="Clinical Instructions & Precautions"
                multiline
                rows={3}
                fullWidth
                size="small"
                value={form.clinicalNotes}
                onChange={e => setForm(p => ({ ...p, clinicalNotes: e.target.value }))}
                placeholder="Specific weight bearing orders, range of motion limits, surgical precautions, or monitoring instructions..."
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc', justifyContent: 'space-between' }}>
          <Button onClick={onClose} disabled={submitting} sx={{ color: '#64748b', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={<Send />}
            sx={{
              bgcolor: '#0284c7',
              fontWeight: 800,
              textTransform: 'none',
              px: 3.5,
              py: 1,
              boxShadow: '0 4px 14px rgba(2,132,199,0.35)',
              '&:hover': { bgcolor: '#0369a1' }
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Electronic Referral'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
