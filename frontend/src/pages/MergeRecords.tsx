import { useState, useEffect } from 'react';
import {
  Typography, Box, Card, CardContent, Button, Grid, TextField,
  Autocomplete, Divider, Stack, Alert, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableRow,
  Chip, TableHead, Paper
} from '@mui/material';
import { MergeType, Info, Search, HelpOutline, AutoAwesome, CompareArrows } from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

interface PatientOption {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
}

interface CandidatePair {
  patientA: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    phone: string | null;
    status: string;
    createdAt: string;
  };
  patientB: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    phone: string | null;
    status: string;
    createdAt: string;
  };
  score: number;
  reasons: string[];
}

const MergeRecords = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Auto-flagged Candidate Pairs
  const [candidatePairs, setCandidatePairs] = useState<CandidatePair[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // Selected Patients
  const [surviving, setSurviving] = useState<PatientOption | null>(null);
  const [obsolete, setObsolete] = useState<PatientOption | null>(null);

  // Details
  const [survDetails, setSurvDetails] = useState<any | null>(null);
  const [obsDetails, setObsDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Merge controls
  const [justification, setJustification] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchCandidatePairs = async () => {
    setLoadingQueue(true);
    try {
      const res = await api.get('/patients/duplicate-candidates');
      if (res.data?.success) {
        setCandidatePairs(res.data.pairs || []);
      }
    } catch (err) {
      console.error('Failed to load duplicate queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchCandidatePairs();
  }, []);

  const fetchOptions = async (val: string) => {
    if (val.length < 2) return;
    setLoadingSearch(true);
    try {
      const res = await api.get('/patients/mpi', { params: { query: val, limit: 30 } });
      const options = res.data.data.map((p: any) => ({
        id: p.id,
        mrn: p.patientNumber,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        status: p.status,
      }));
      setPatients(options);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectSurviving = async (val: PatientOption | null) => {
    setSurviving(val);
    if (!val) {
      setSurvDetails(null);
      return;
    }
    setLoadingDetails(true);
    try {
      const res = await api.get(`/patients/${val.id}`);
      setSurvDetails(res.data);
    } catch (err) {
      enqueueSnackbar('Failed to fetch surviving patient details', { variant: 'error' });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectObsolete = async (val: PatientOption | null) => {
    setObsolete(val);
    if (!val) {
      setObsDetails(null);
      return;
    }
    setLoadingDetails(true);
    try {
      const res = await api.get(`/patients/${val.id}`);
      setObsDetails(res.data);
    } catch (err) {
      enqueueSnackbar('Failed to fetch obsolete patient details', { variant: 'error' });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleLoadPairToWorkspace = (pair: CandidatePair) => {
    const survOpt: PatientOption = {
      id: pair.patientA.id,
      mrn: pair.patientA.patientNumber,
      firstName: pair.patientA.firstName,
      lastName: pair.patientA.lastName,
      phone: pair.patientA.phone || '',
      status: pair.patientA.status,
    };
    const obsOpt: PatientOption = {
      id: pair.patientB.id,
      mrn: pair.patientB.patientNumber,
      firstName: pair.patientB.firstName,
      lastName: pair.patientB.lastName,
      phone: pair.patientB.phone || '',
      status: pair.patientB.status,
    };

    handleSelectSurviving(survOpt);
    handleSelectObsolete(obsOpt);
    setJustification(`Automated Super-User Review: Merging duplicate patient profiles (${pair.reasons.join(', ')})`);
    enqueueSnackbar('Candidate pair loaded into Merge Workspace!', { variant: 'info' });
  };

  const handleMergeConfirm = async () => {
    if (!surviving || !obsolete || !justification) {
      enqueueSnackbar('Select both patients and enter a justification', { variant: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/patients/merge', {
        survivingPatientId: surviving.id,
        obsoletePatientId: obsolete.id,
        justification,
      });
      enqueueSnackbar('Patient records merged successfully!', { variant: 'success' });
      setOpenConfirm(false);
      setSurviving(null);
      setObsolete(null);
      setSurvDetails(null);
      setObsDetails(null);
      setJustification('');
      fetchCandidatePairs(); // Refresh queue
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Merge failed', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Merge Duplicate Records</Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Super-User Quality Assurance Dashboard & Master Patient Index (MPI) Deduplication Engine
      </Typography>
      
      <Alert severity="info" sx={{ mb: 4 }}>
        This action consolidates clinical encounters, prescriptional medication requests, laboratory/radiology orders, and billing invoices from an obsolete patient file into a surviving patient file. The obsolete file is archived to prevent active check-ins.
      </Alert>

      {/* SUPER-USER MORNING DUPLICATE QUEUE */}
      <Card sx={{ border: '1px solid #E0E0E0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <AutoAwesome color="primary" fontSize="large" />
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  OpenMed Automated Morning Duplicate Queue ({candidatePairs.length} Flagged Pairs)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Real-time cross-departmental duplicate detection scan
                </Typography>
              </Box>
            </Box>
            <Button variant="outlined" size="small" onClick={fetchCandidatePairs} disabled={loadingQueue}>
              {loadingQueue ? <CircularProgress size={18} /> : 'Refresh Scan'}
            </Button>
          </Box>

          {candidatePairs.length === 0 ? (
            <Alert severity="success">
              No potential duplicate candidate pairs currently detected across the Master Patient Index!
            </Alert>
          ) : (
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F5F5F5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Record A (Primary Candidate)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Record B (Potential Duplicate)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Match Score & Reasons</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {candidatePairs.map((pair, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {pair.patientA.firstName} {pair.patientA.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          MRN: {pair.patientA.patientNumber} | Phone: {pair.patientA.phone || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {pair.patientB.firstName} {pair.patientB.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          MRN: {pair.patientB.patientNumber} | Phone: {pair.patientB.phone || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${pair.score}% Confidence`}
                          size="small"
                          color={pair.score >= 70 ? 'error' : 'warning'}
                          sx={{ fontWeight: 800, mr: 1, mb: 0.5 }}
                        />
                        {pair.reasons.map((r, rIdx) => (
                          <Chip key={rIdx} label={r} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<CompareArrows />}
                          onClick={() => handleLoadPairToWorkspace(pair)}
                          sx={{ fontWeight: 700 }}
                        >
                          Review & Merge
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </CardContent>
      </Card>

      <Typography variant="h5" fontWeight={800} mb={2}>Side-by-Side Merge Workspace</Typography>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        {/* Left Side: Surviving patient search */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>
                1. Surviving Record (The Active Profile)
              </Typography>
              <Autocomplete
                options={patients}
                getOptionLabel={(o) => `${o.mrn} - ${o.lastName}, ${o.firstName} (${o.phone})`}
                loading={loadingSearch}
                onInputChange={(e, val) => fetchOptions(val)}
                onChange={(e, val) => handleSelectSurviving(val)}
                value={surviving}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Surviving Patient"
                    placeholder="Enter MRN, name..."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingSearch ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              <Divider sx={{ my: 3 }} />
              {survDetails && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Demographics Preview</Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow><TableCell>Name</TableCell><TableCell sx={{ fontWeight: 'bold' }}>{survDetails.firstName} {survDetails.lastName}</TableCell></TableRow>
                      <TableRow><TableCell>Sex</TableCell><TableCell>{survDetails.gender}</TableCell></TableRow>
                      <TableRow><TableCell>DOB</TableCell><TableCell>{survDetails.birthDate ? new Date(survDetails.birthDate).toLocaleDateString() : 'N/A'}</TableCell></TableRow>
                      <TableRow><TableCell>Phone</TableCell><TableCell>{survDetails.telecoms?.[0]?.value || 'N/A'}</TableCell></TableRow>
                      <TableRow><TableCell>Status</TableCell><TableCell><Chip label={survDetails.status} size="small" color="success" /></TableCell></TableRow>
                    </TableBody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Obsolete patient search */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} color="error" mb={2}>
                2. Obsolete Record (The Duplicate Profile)
              </Typography>
              <Autocomplete
                options={patients}
                getOptionLabel={(o) => `${o.mrn} - ${o.lastName}, ${o.firstName} (${o.phone})`}
                loading={loadingSearch}
                onInputChange={(e, val) => fetchOptions(val)}
                onChange={(e, val) => handleSelectObsolete(val)}
                value={obsolete}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Obsolete Patient"
                    placeholder="Enter MRN, name..."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingSearch ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              <Divider sx={{ my: 3 }} />
              {obsDetails && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Demographics Preview</Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow><TableCell>Name</TableCell><TableCell sx={{ fontWeight: 'bold' }}>{obsDetails.firstName} {obsDetails.lastName}</TableCell></TableRow>
                      <TableRow><TableCell>Sex</TableCell><TableCell>{obsDetails.gender}</TableCell></TableRow>
                      <TableRow><TableCell>DOB</TableCell><TableCell>{obsDetails.birthDate ? new Date(obsDetails.birthDate).toLocaleDateString() : 'N/A'}</TableCell></TableRow>
                      <TableRow><TableCell>Phone</TableCell><TableCell>{obsDetails.telecoms?.[0]?.value || 'N/A'}</TableCell></TableRow>
                      <TableRow><TableCell>Status</TableCell><TableCell><Chip label={obsDetails.status} size="small" color="error" /></TableCell></TableRow>
                    </TableBody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action panel */}
      {surviving && obsolete && (
        <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>3. Finalize Merge Actions</Typography>
            <Stack spacing={3}>
              <TextField
                label="Audited Justification for Record Merge"
                placeholder="Enter justification reasons (e.g. duplicate created during emergency check-in)"
                multiline
                rows={3}
                fullWidth
                value={justification}
                onChange={e => setJustification(e.target.value)}
              />
              <Button
                variant="contained"
                color="error"
                size="large"
                startIcon={<MergeType />}
                disabled={!justification}
                onClick={() => setOpenConfirm(true)}
              >
                Perform Patient Record Merge
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* CONFIRMATION DIALOG */}
      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Merge Operation</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This process is permanent. Are you sure you want to merge 
            <strong> {obsolete?.firstName} {obsolete?.lastName} ({obsolete?.mrn})</strong> into 
            <strong> {surviving?.firstName} {surviving?.lastName} ({surviving?.mrn})</strong>?
          </Typography>
          <Typography variant="caption" color="text.secondary">
            All appointments, consultation notes, laboratory tests, admissions, and financial invoices of the obsolete record will be re-mapped to the surviving patient.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleMergeConfirm} variant="contained" color="error" disabled={submitting}>
            {submitting ? 'Merging...' : 'Confirm Merge'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MergeRecords;
