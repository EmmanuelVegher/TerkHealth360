import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel,
  Checkbox, Alert, Chip, Divider, IconButton, Tooltip, Stack, CardHeader, Autocomplete
} from '@mui/material';
import {
  Healing, Add, Close, CheckCircle, Warning, Delete, Science, MedicalServices, Person
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

const LIGHT_BG = '#f8f9fa';
const PRIMARY = '#3b5bdb';
const WARNING = '#e67700';
const DANGER = '#c92a2a';

interface PncGynaeServicesViewProps {
  inpatients?: any[];
  selectedPatientId?: string;
  onSelectPatient?: (patient: any) => void;
}

export const PncGynaeServicesView: React.FC<PncGynaeServicesViewProps> = ({
  inpatients = [],
  selectedPatientId = '',
  onSelectPatient
}) => {
  const { enqueueSnackbar } = useSnackbar();
  
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [maternityProfile, setMaternityProfile] = useState<any>(null);
  const [patientPregnancies, setPatientPregnancies] = useState<any[]>([]);
  const [gynaeConsultations, setGynaeConsultations] = useState<any[]>([]);
  const [cervicalScreenings, setCervicalScreenings] = useState<any[]>([]);
  const [fertilityAssessments, setFertilityAssessments] = useState<any[]>([]);
  const [gynaeProcedures, setGynaeProcedures] = useState<any[]>([]);

  // Dialog States
  const [pncDialogOpen, setPncDialogOpen] = useState(false);
  const [fpDialogOpen, setFpDialogOpen] = useState(false);
  const [gynaeDialogOpen, setGynaeDialogOpen] = useState(false);
  const [cervicalDialogOpen, setCervicalDialogOpen] = useState(false);
  const [fertilityDialogOpen, setFertilityDialogOpen] = useState(false);
  const [procedureDialogOpen, setProcedureDialogOpen] = useState(false);

  // Form states
  const [pncForm, setPncForm] = useState({
    uterineInvolution: 'Normal (Well Involuted)',
    lochiaCharacter: 'Rubra (Normal)',
    breastfeedingStatus: 'Exclusive Breastfeeding',
    babyTemperature: '36.8',
    vitaminKGiven: true,
    vaccinesGiven: 'BCG, OPV0, HBV0',
    maternalDepression: false,
    notes: ''
  });

  const [fpForm, setFpForm] = useState({
    methodChosen: 'Jadelle Implants (5-Year)',
    nextAppointment: ''
  });

  const [gynaeForm, setGynaeForm] = useState({
    consultationType: 'ROUTINE',
    chiefComplaint: '',
    diagnosis: '',
    managementPlan: '',
    referralRequired: false,
    referralTo: ''
  });

  const [cervicalForm, setCervicalForm] = useState({
    screeningMethod: 'VIA',
    screeningResult: 'Negative',
    notes: ''
  });

  const [fertilityForm, setFertilityForm] = useState({
    infertilityType: 'PRIMARY',
    durationInfertility: '2 Years',
    artRecommended: false,
    notes: ''
  });

  const [procedureForm, setProcedureForm] = useState({
    procedureType: 'D&C',
    anaesthesiaType: 'SEDATION',
    findings: '',
    complications: 'None'
  });

  // Load patients list for search autocomplete
  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      const found = inpatients.find(adm => adm.patientId === selectedPatientId || adm.patient?.id === selectedPatientId);
      if (found) {
        setSelectedPatient(found.patient || found);
      } else {
        loadPatientById(selectedPatientId);
      }
    }
  }, [selectedPatientId, inpatients]);

  useEffect(() => {
    if (selectedPatient?.id) {
      loadClinicalData(selectedPatient.id);
    }
  }, [selectedPatient]);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients');
      setPatients(res.data || []);
    } catch (err) {
      console.error('Failed to load patients list', err);
    }
  };

  const loadPatientById = async (pId: string) => {
    try {
      const res = await api.get(`/patients/${pId}`);
      setSelectedPatient(res.data);
    } catch (err) {
      console.error('Error loading patient', err);
    }
  };

  const loadClinicalData = async (pId: string) => {
    setLoading(true);
    try {
      const [profRes, pregRes, gynRes, cerRes, ferRes, procRes] = await Promise.allSettled([
        api.get(`/maternity/profile/${pId}`),
        api.get(`/maternity/patient/${pId}/pregnancies`),
        api.get(`/maternity/gynaecology/patient/${pId}/consultations`),
        api.get(`/maternity/cervical-screening/patient/${pId}`),
        api.get(`/maternity/fertility/patient/${pId}`),
        api.get(`/maternity/gynaecology/patient/${pId}/procedures`)
      ]);

      if (profRes.status === 'fulfilled') setMaternityProfile(profRes.value.data);
      else setMaternityProfile(null);

      if (pregRes.status === 'fulfilled') setPatientPregnancies(pregRes.value.data || []);
      else setPatientPregnancies([]);

      if (gynRes.status === 'fulfilled') setGynaeConsultations(gynRes.value.data || []);
      else setGynaeConsultations([]);

      if (cerRes.status === 'fulfilled') setCervicalScreenings(cerRes.value.data || []);
      else setCervicalScreenings([]);

      if (ferRes.status === 'fulfilled') setFertilityAssessments(ferRes.value.data || []);
      else setFertilityAssessments([]);

      if (procRes.status === 'fulfilled') setGynaeProcedures(procRes.value.data || []);
      else setGynaeProcedures([]);
    } catch (err) {
      console.error('Error loading clinical details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogPnc = async () => {
    if (!selectedPatient) return;
    try {
      await api.post('/maternity/postnatal/visit', {
        maternityProfileId: maternityProfile?.id || selectedPatient.id,
        patientId: selectedPatient.id,
        ...pncForm,
        babyTemperature: parseFloat(pncForm.babyTemperature) || 36.5
      });
      enqueueSnackbar('Postnatal Care (PNC) assessment saved', { variant: 'success' });
      setPncDialogOpen(false);
      loadClinicalData(selectedPatient.id);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save PNC visit', { variant: 'error' });
    }
  };

  const handleLogFp = async () => {
    if (!selectedPatient) return;
    try {
      await api.post('/maternity/family-planning', {
        maternityProfileId: maternityProfile?.id || selectedPatient.id,
        patientId: selectedPatient.id,
        ...fpForm
      });
      enqueueSnackbar('Family planning enrollment saved', { variant: 'success' });
      setFpDialogOpen(false);
      loadClinicalData(selectedPatient.id);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save Family Planning enrollment', { variant: 'error' });
    }
  };

  const handleLogGynae = async () => {
    if (!selectedPatient) return;
    try {
      await api.post('/maternity/gynaecology/consult', {
        patientId: selectedPatient.id,
        ...gynaeForm
      });
      enqueueSnackbar('Gynaecology consultation saved', { variant: 'success' });
      setGynaeDialogOpen(false);
      loadClinicalData(selectedPatient.id);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save consultation', { variant: 'error' });
    }
  };

  const handleLogCervical = async () => {
    if (!selectedPatient) return;
    try {
      await api.post('/maternity/cervical-screening', {
        patientId: selectedPatient.id,
        ...cervicalForm
      });
      enqueueSnackbar('Cervical cancer screening logged', { variant: 'success' });
      setCervicalDialogOpen(false);
      loadClinicalData(selectedPatient.id);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to log screening', { variant: 'error' });
    }
  };

  const handleLogFertility = async () => {
    if (!selectedPatient) return;
    try {
      await api.post('/maternity/fertility/assess', {
        patientId: selectedPatient.id,
        ...fertilityForm
      });
      enqueueSnackbar('Fertility assessment logged', { variant: 'success' });
      setFertilityDialogOpen(false);
      loadClinicalData(selectedPatient.id);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to log fertility evaluation', { variant: 'error' });
    }
  };

  const handleLogProcedure = async () => {
    if (!selectedPatient) return;
    try {
      await api.post('/maternity/gynaecology/procedure', {
        patientId: selectedPatient.id,
        ...procedureForm,
        status: 'COMPLETED'
      });
      enqueueSnackbar('Gynaecological procedure logged', { variant: 'success' });
      setProcedureDialogOpen(false);
      loadClinicalData(selectedPatient.id);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to log procedure', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Patient Selector Bar */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: '#fff', border: '1px solid #e9ecef', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={7}>
            <Autocomplete
              options={inpatients.length > 0 ? inpatients.map(adm => adm.patient || adm) : patients}
              getOptionLabel={(option: any) => `${option.firstName || ''} ${option.lastName || ''} (MRN: ${option.mrn || option.id?.substring(0, 6)})`}
              value={selectedPatient}
              onChange={(_, newVal) => {
                setSelectedPatient(newVal);
                if (onSelectPatient) onSelectPatient(newVal);
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Select Maternity / Postnatal Patient (MPI or Inpatient Bed)" 
                  placeholder="Search by Patient Name or MRN..." 
                  size="small"
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            {selectedPatient ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip icon={<Person />} label={`${selectedPatient.firstName} ${selectedPatient.lastName}`} color="primary" sx={{ fontWeight: 800 }} />
                <Typography variant="caption" color="text.secondary">
                  Gender: {selectedPatient.gender || 'F'} · Age: {selectedPatient.age || '30'} yrs
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Select an admitted mother or search outpatient MPI to record PNC & Gynae care.
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>

      {!selectedPatient ? (
        <Card sx={{ p: 6, textAlign: 'center', bgcolor: '#f8f9fa', borderRadius: '16px', border: '1px dashed #dee2e6', boxShadow: 'none' }}>
          <Box sx={{ color: PRIMARY, mb: 2 }}>
            <Healing sx={{ fontSize: 60 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            Postnatal Care & Gynaecology Services Workspace
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto' }}>
            Please select a mother from the search bar above or click on an active bed in the Live Bed Census to log Postnatal Care assessments, Family Planning choices, Gynaecology consultations, Cervical Cancer VIA screenings, or Gynae minor procedures.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {/* Left Column: PNC & Family Planning */}
          <Grid item xs={12} md={6}>
            <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <CardHeader
                title="Postnatal Care (PNC) Assessments"
                titleTypographyProps={{ fontWeight: 800, fontSize: '1rem' }}
                action={
                  <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setPncDialogOpen(true)}>
                    Log PNC Assessment
                  </Button>
                }
              />
              <Divider />
              <CardContent>
                {maternityProfile?.postnatalVisits?.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: LIGHT_BG }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Involution</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Lochia</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Feeding</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Vit K</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>PPD Risk</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {maternityProfile.postnatalVisits.map((pnc: any) => (
                          <TableRow key={pnc.id}>
                            <TableCell>{new Date(pnc.visitDate).toLocaleDateString()}</TableCell>
                            <TableCell>{pnc.uterineInvolution}</TableCell>
                            <TableCell>{pnc.lochiaCharacter}</TableCell>
                            <TableCell>{pnc.breastfeedingStatus}</TableCell>
                            <TableCell>
                              <Chip size="small" label={pnc.vitaminKGiven ? 'Given' : 'No'} color={pnc.vitaminKGiven ? 'success' : 'default'} />
                            </TableCell>
                            <TableCell>
                              <Chip size="small" label={pnc.maternalDepression ? 'Alert' : 'Normal'} color={pnc.maternalDepression ? 'error' : 'success'} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    No Postnatal Care (PNC) visits documented for this patient yet.
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <CardHeader
                title="Contraceptive & Family Planning Choice"
                titleTypographyProps={{ fontWeight: 800, fontSize: '1rem' }}
                action={
                  <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => setFpDialogOpen(true)}>
                    New Choice
                  </Button>
                }
              />
              <Divider />
              <CardContent>
                {maternityProfile?.familyPlanningEnrollments?.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Contraceptive Method:</Typography>
                      <Typography variant="body2" fontWeight={800} color={PRIMARY}>
                        {maternityProfile.familyPlanningEnrollments[0].methodChosen}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Enrollment Date:</Typography>
                      <Typography variant="body2">
                        {new Date(maternityProfile.familyPlanningEnrollments[0].enrollmentDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    No family planning contraceptive method selected yet.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column: Gynaecology Consultations & Procedures */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <CardHeader
                title="Gynaecology Consultations & Procedures"
                titleTypographyProps={{ fontWeight: 800, fontSize: '1rem' }}
                action={
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" size="small" onClick={() => setGynaeDialogOpen(true)}>
                      Consult
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => setProcedureDialogOpen(true)}>
                      Procedure
                    </Button>
                  </Stack>
                }
              />
              <Divider />
              <CardContent>
                <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => setCervicalDialogOpen(true)}>
                    Cervical Cancer Screening (VIA)
                  </Button>
                  <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => setFertilityDialogOpen(true)}>
                    Fertility Evaluation
                  </Button>
                </Box>

                {gynaeConsultations.length > 0 ? (
                  <Stack spacing={1.5} sx={{ mb: 2 }}>
                    {gynaeConsultations.map((c: any) => (
                      <Box key={c.id} sx={{ p: 2, borderRadius: 2, bgcolor: LIGHT_BG, border: '1px solid #e9ecef' }}>
                        <Typography variant="subtitle2" fontWeight={800} color={PRIMARY}>
                          🩺 {c.consultationType} Consultation
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {new Date(c.consultDate).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" mt={0.5}><strong>Diagnosis:</strong> {c.diagnosis}</Typography>
                        <Typography variant="body2" color="text.secondary"><strong>Plan:</strong> {c.managementPlan}</Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    No specialized Gynaecology consultations documented for this patient.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* PNC Log Dialog */}
      <Dialog open={pncDialogOpen} onClose={() => setPncDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Log PNC Assessment</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Uterine Involution"
              size="small"
              fullWidth
              value={pncForm.uterineInvolution}
              onChange={e => setPncForm({ ...pncForm, uterineInvolution: e.target.value })}
            >
              <MenuItem value="Normal (Well Involuted)">Normal (Well Involuted)</MenuItem>
              <MenuItem value="Subinvoluted (Bulky)">Subinvoluted (Bulky)</MenuItem>
              <MenuItem value="Tender Uterus">Tender Uterus</MenuItem>
            </TextField>
            <TextField
              select
              label="Lochia Character"
              size="small"
              fullWidth
              value={pncForm.lochiaCharacter}
              onChange={e => setPncForm({ ...pncForm, lochiaCharacter: e.target.value })}
            >
              <MenuItem value="Rubra (Normal Red)">Rubra (Normal Red)</MenuItem>
              <MenuItem value="Serosa (Pinkish/Brown)">Serosa (Pinkish/Brown)</MenuItem>
              <MenuItem value="Alba (Yellowish/White)">Alba (Yellowish/White)</MenuItem>
              <MenuItem value="Foul-Smelling (Purulent)">Foul-Smelling (Purulent Alert)</MenuItem>
            </TextField>
            <TextField
              select
              label="Infant Feeding"
              size="small"
              fullWidth
              value={pncForm.breastfeedingStatus}
              onChange={e => setPncForm({ ...pncForm, breastfeedingStatus: e.target.value })}
            >
              <MenuItem value="Exclusive Breastfeeding">Exclusive Breastfeeding</MenuItem>
              <MenuItem value="Mixed Feeding">Mixed Feeding</MenuItem>
              <MenuItem value="Formula Feeding Only">Formula Feeding Only</MenuItem>
            </TextField>
            <TextField
              label="Baby Temp (°C)"
              size="small"
              fullWidth
              value={pncForm.babyTemperature}
              onChange={e => setPncForm({ ...pncForm, babyTemperature: e.target.value })}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={pncForm.vitaminKGiven}
                  onChange={e => setPncForm({ ...pncForm, vitaminKGiven: e.target.checked })}
                />
              }
              label="Vitamin K Administered to Newborn"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={pncForm.maternalDepression}
                  onChange={e => setPncForm({ ...pncForm, maternalDepression: e.target.checked })}
                />
              }
              label="Postpartum Depression Risk Alert (EPDS High Score)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPncDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleLogPnc}>Save PNC Assessment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
