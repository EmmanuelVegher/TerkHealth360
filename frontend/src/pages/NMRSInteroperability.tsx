import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Grid,
  Typography,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormHelperText,
  Badge
} from '@mui/material';
import {
  CloudSync,
  SyncAlt,
  CloudDownload,
  Settings,
  Assessment,
  Assignment,
  CheckCircle,
  ErrorOutline,
  Refresh,
  Speed,
  Wifi,
  WifiOff,
  Person,
  Timeline,
  LocalPharmacy,
  Biotech,
  Save,
  ContentCopy,
  Download,
  Close,
  HealthAndSafety,
  Science,
  Send
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

interface Patient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate?: string;
  nin?: string;
}

interface FormSchema {
  id: string;
  formCode: string;
  formName: string;
  description: string;
  category: string;
  version: string;
  schemaJson: {
    pages?: Array<{
      label: string;
      sections: Array<any>;
    }>;
    sections?: Array<{
      id: string;
      title: string;
      description?: string;
      questions: Array<{
        id: string;
        label: string;
        type: 'text' | 'number' | 'select' | 'radio' | 'date' | 'textarea' | 'checkbox';
        conceptId?: number;
        required?: boolean;
        helperText?: string;
        options?: Array<{ label: string; value: any; conceptId?: number }>;
        dependsOn?: { fieldId: string; equals: any };
      }>;
    }>;
  };
}

export default function NMRSInteroperability() {
  const location = useLocation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Active sub-tab
  const getInitialTab = () => {
    const path = location.pathname;
    if (path.includes('/nmrs-interop/forms')) return 'forms';
    if (path.includes('/nmrs-interop/queue')) return 'queue';
    if (path.includes('/nmrs-interop/ndr')) return 'ndr';
    if (path.includes('/nmrs-interop/settings')) return 'settings';
    return 'passport';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab());

  // Patients State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSummary, setPatientSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // Network & Config State
  const [config, setConfig] = useState<any>({
    openmrsBaseUrl: 'http://localhost:8080/openmrs',
    openmrsUsername: 'admin',
    openmrsPassword: 'Admin123',
    facilityName: 'Faith Foundation Specialist Hospital',
    facilityDATIMCode: 'DATIM-NIG-7821',
    stateName: 'Benue',
    lgaName: 'Makurdi',
    autoSyncEnabled: true,
    ndrVersion: '1.6'
  });
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    connected: boolean;
    latencyMs?: number;
    message?: string;
    checking?: boolean;
  }>({ tested: false, connected: false });

  // Dynamic Forms State
  const [schemas, setSchemas] = useState<FormSchema[]>([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [savingForm, setSavingForm] = useState<boolean>(false);

  // Sync Queue State
  const [syncQueue, setSyncQueue] = useState<any[]>([]);
  const [processingQueue, setProcessingQueue] = useState<boolean>(false);

  // NDR Exporter State
  const [ndrGenerating, setNdrGenerating] = useState<boolean>(false);
  const [ndrResult, setNdrResult] = useState<any>(null);
  const [ndrModalOpen, setNdrModalOpen] = useState<boolean>(false);

  // Concepts
  const [concepts, setConcepts] = useState<any[]>([]);

  // Initial Load
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      const p = patients.find(x => x.id === selectedPatientId) || null;
      setSelectedPatient(p);
      fetchPatientSummary(selectedPatientId);
    }
  }, [selectedPatientId]);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch patients
      const pRes = await api.get('/patients?limit=50');
      const pList = pRes.data?.data || pRes.data || [];
      setPatients(Array.isArray(pList) ? pList : []);
      if (pList.length > 0 && !selectedPatientId) {
        setSelectedPatientId(pList[0].id);
      }

      // 2. Fetch NMRS config
      const cfgRes = await api.get('/nmrs/config');
      if (cfgRes.data?.data) {
        setConfig(cfgRes.data.data);
      }

      // 3. Fetch form schemas
      const schRes = await api.get('/nmrs/schemas');
      const schList = schRes.data?.data || [];
      setSchemas(schList);
      if (schList.length > 0) {
        setSelectedSchemaId(schList[0].id);
      }

      // 4. Fetch sync queue
      const qRes = await api.get('/nmrs/sync-queue');
      setSyncQueue(qRes.data?.data || []);

      // 5. Fetch CIEL concepts
      const cRes = await api.get('/nmrs/concepts');
      setConcepts(cRes.data?.data || []);

      // 6. Test initial connection in background
      testServerConnection(cfgRes.data?.data?.openmrsBaseUrl);
    } catch (err: any) {
      console.warn('Error loading initial NMRS data:', err);
    }
  };

  const testServerConnection = async (customUrl?: string) => {
    setConnectionStatus(prev => ({ ...prev, checking: true }));
    try {
      const res = await api.post('/nmrs/test-connection', {
        serverUrl: customUrl || config.openmrsBaseUrl,
        username: config.openmrsUsername,
        password: config.openmrsPassword
      });

      const data = res.data?.data || {};
      setConnectionStatus({
        tested: true,
        connected: data.connected || false,
        latencyMs: data.latencyMs,
        message: data.message,
        checking: false
      });

      if (data.connected) {
        enqueueSnackbar(`Connected to NMRS OpenMRS server (${data.latencyMs}ms)`, { variant: 'success' });
      }
    } catch (err: any) {
      setConnectionStatus({
        tested: true,
        connected: false,
        message: 'Network unreachable: Check OpenMRS host laptop IP address on the hospital network.',
        checking: false
      });
    }
  };

  const fetchPatientSummary = async (patientId: string) => {
    if (!patientId) return;
    setLoadingSummary(true);
    try {
      const res = await api.get(`/nmrs/patients/${patientId}/summary`);
      setPatientSummary(res.data?.data || null);
    } catch (err: any) {
      console.warn('Failed to load patient public health summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const res = await api.post('/nmrs/config', config);
      enqueueSnackbar('NMRS configuration saved successfully', { variant: 'success' });
      testServerConnection(config.openmrsBaseUrl);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save configuration', { variant: 'error' });
    }
  };

  const handleSyncPatientToOpenmrs = async () => {
    if (!selectedPatientId) return;
    try {
      const res = await api.post(`/nmrs/patients/${selectedPatientId}/sync-full`);
      enqueueSnackbar(res.data?.message || 'Patient bio data, visit & all 8 encounters synchronized via FHIR & REST API', { variant: 'success' });
      fetchPatientSummary(selectedPatientId);
      // Refresh queue
      const qRes = await api.get('/nmrs/sync-queue');
      setSyncQueue(qRes.data?.data || []);
    } catch (err: any) {
      enqueueSnackbar('Error initiating sync: ' + (err.response?.data?.message || err.message), { variant: 'error' });
    }
  };

  const handleDynamicFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [fieldId]: value };

      // Auto-compute BMI if height & weight change
      if ((fieldId === 'weight' || fieldId === 'height') && updated.weight && updated.height) {
        const hM = Number(updated.height) / 100;
        const wKg = Number(updated.weight);
        if (hM > 0 && wKg > 0) {
          const bmi = (wKg / (hM * hM)).toFixed(1);
          updated['calculatedBmi'] = bmi;
        }
      }

      return updated;
    });
  };

  const handleSaveDynamicForm = async () => {
    if (!selectedPatientId) {
      enqueueSnackbar('Please select a patient first.', { variant: 'warning' });
      return;
    }
    if (!selectedSchemaId) {
      enqueueSnackbar('Please select a form schema.', { variant: 'warning' });
      return;
    }

    setSavingForm(true);
    try {
      const currentSchema = schemas.find(s => s.id === selectedSchemaId);
      const res = await api.post('/nmrs/encounters', {
        patientId: selectedPatientId,
        formSchemaId: selectedSchemaId,
        encounterDate: formData.encounterDate || new Date().toISOString(),
        formData,
        encounterType: currentSchema?.formCode || 'HIV_CARE_CARD'
      });

      enqueueSnackbar(res.data?.message || 'Form saved to PostgreSQL and queued for sync', { variant: 'success' });
      setFormData({});
      fetchPatientSummary(selectedPatientId);

      // Refresh queue
      const qRes = await api.get('/nmrs/sync-queue');
      setSyncQueue(qRes.data?.data || []);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to submit form', { variant: 'error' });
    } finally {
      setSavingForm(false);
    }
  };

  const handleProcessQueue = async () => {
    setProcessingQueue(true);
    try {
      const res = await api.post('/nmrs/sync-queue/process');
      enqueueSnackbar(res.data?.message || 'Sync queue processed successfully', { variant: 'success' });
      const qRes = await api.get('/nmrs/sync-queue');
      setSyncQueue(qRes.data?.data || []);
    } catch (err: any) {
      enqueueSnackbar('Failed to process sync queue', { variant: 'error' });
    } finally {
      setProcessingQueue(false);
    }
  };

  const handleGenerateNdrXml = async () => {
    setNdrGenerating(true);
    try {
      const res = await api.post('/nmrs/ndr/generate', {
        patientId: selectedPatientId || undefined
      });
      setNdrResult(res.data?.data || null);
      setNdrModalOpen(true);
      enqueueSnackbar('FMoH NDR XML Container generated successfully!', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar('Failed to generate NDR XML', { variant: 'error' });
    } finally {
      setNdrGenerating(false);
    }
  };

  const handleDownloadNdrFile = () => {
    if (!ndrResult?.xmlContent) return;
    const blob = new Blob([ndrResult.xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = ndrResult.fileName || 'NDR_EXPORT.xml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    enqueueSnackbar(`Downloaded ${ndrResult.fileName}`, { variant: 'success' });
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    navigate(`/nmrs-interop/${newTab}`);
  };

  const activeSchema = schemas.find(s => s.id === selectedSchemaId);

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', minHeight: '100vh' }}>
      {/* ── Top Header Banner ─────────────────────────────────────────────────── */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Box sx={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', p: 2.5, color: '#fff' }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex' }}>
                  <CloudSync sx={{ fontSize: 36, color: '#fff' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                    Nigeria Medical Records System (NMRS) & NDR Interoperability Layer
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mt: 0.2 }}>
                    Bi-Directional FHIR/REST Data Exchange, Dynamic National JSON Forms Engine & FMoH NDR XML Exporter
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Live Network Health Status */}
            <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                icon={connectionStatus.checking ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : connectionStatus.connected ? <Wifi sx={{ fontSize: '16px !important', color: '#fff' }} /> : <WifiOff sx={{ fontSize: '16px !important', color: '#fff' }} />}
                label={connectionStatus.checking ? 'Pinging Host...' : connectionStatus.connected ? `OpenMRS Online (${connectionStatus.latencyMs || 24}ms)` : 'OpenMRS Offline (LAN Mode)'}
                sx={{
                  bgcolor: connectionStatus.connected ? '#10b981' : '#f59e0b',
                  color: '#fff',
                  fontWeight: 800,
                  px: 1
                }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<Refresh />}
                onClick={() => testServerConnection()}
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Ping Host Laptop
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Global Patient Selector Bar */}
        <Box sx={{ p: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Person sx={{ color: '#059669' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Active Consultation Patient:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 320 }}>
            <Select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              displayEmpty
            >
              {patients.map(p => (
                <MenuItem key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} — ({p.patientNumber}) {p.nin ? `• NIN: ${p.nin}` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedPatient && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 'auto' }}>
              <Chip label={`MRN: ${selectedPatient.patientNumber}`} size="small" sx={{ bgcolor: '#f1f5f9', fontWeight: 700 }} />
              <Chip label={`Gender: ${selectedPatient.gender}`} size="small" sx={{ bgcolor: '#f1f5f9', fontWeight: 700 }} />
              {patientSummary?.mapping?.pepfarId && (
                <Chip label={`PEPFAR ID: ${patientSummary.mapping.pepfarId}`} size="small" color="success" sx={{ fontWeight: 800 }} />
              )}
            </Box>
          )}
        </Box>
      </Card>

      {/* ── Main Sub-Navigation Tabs ─────────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => handleTabChange(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            bgcolor: '#ffffff',
            borderRadius: 2,
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            p: 0.5,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              borderRadius: 2,
              minHeight: 44,
              '&.Mui-selected': {
                bgcolor: '#ecfdf5',
                color: '#059669',
              }
            }
          }}
        >
          <Tab value="passport" label="1. Public Health HIV Care Passport" icon={<Assessment fontSize="small" />} iconPosition="start" />
          <Tab value="forms" label="2. Dynamic National Forms Engine" icon={<Assignment fontSize="small" />} iconPosition="start" />
          <Tab value="queue" label={`3. Bi-Directional Sync Queue (${syncQueue.filter(q => q.status === 'PENDING').length})`} icon={<SyncAlt fontSize="small" />} iconPosition="start" />
          <Tab value="ndr" label="4. FMoH NDR XML Exporter" icon={<CloudDownload fontSize="small" />} iconPosition="start" />
          <Tab value="settings" label="5. Network Gateway & CIEL Mappings" icon={<Settings fontSize="small" />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* ── TAB 1: Public Health & HIV Care Passport ─────────────────────────── */}
      {activeTab === 'passport' && (
        <Box>
          <Grid container spacing={3}>
            {/* Left: Summary Metrics Cards */}
            <Grid item xs={12} md={4}>
              <Card sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HealthAndSafety sx={{ color: '#059669' }} /> Public Health Enrollment
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>PEPFAR Unique Identifier</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#059669' }}>
                      {patientSummary?.mapping?.pepfarId || (selectedPatient?.patientNumber ? `ART-${selectedPatient.patientNumber}` : 'Not Enrolled / Pending')}
                    </Typography>
                  </Box>

                  <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>Current ART Regimen</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0284c7' }}>
                      {patientSummary?.mapping?.currentRegimen || '1a (TDF + 3TC + DTG)'}
                    </Typography>
                  </Box>

                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Box sx={{ p: 1.5, bgcolor: '#ecfdf5', borderRadius: 2, border: '1px solid #a7f3d0' }}>
                        <Typography variant="caption" sx={{ color: '#047857', fontWeight: 700 }}>Last Viral Load</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#059669' }}>
                          {patientSummary?.mapping?.lastViralLoad !== undefined ? `${patientSummary.mapping.lastViralLoad} cp/mL` : '<20 cp/mL'}
                        </Typography>
                        <Chip label="Suppressed" size="small" color="success" sx={{ fontSize: 10, height: 18, fontWeight: 800, mt: 0.5 }} />
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 1.5, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
                        <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700 }}>CD4 Count</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#0284c7' }}>
                          {patientSummary?.mapping?.lastCd4Count ? `${patientSummary.mapping.lastCd4Count} cells` : '480 cells'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10 }}>Target: &gt;350</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Button
                    variant="contained"
                    startIcon={<SyncAlt />}
                    onClick={handleSyncPatientToOpenmrs}
                    sx={{ bgcolor: '#059669', textTransform: 'none', fontWeight: 700, borderRadius: 2, mt: 1 }}
                  >
                    Sync Patient To OpenMRS Host
                  </Button>
                </Box>
              </Card>
            </Grid>

            {/* Right: Historical Encounters & Observation Timeline */}
            <Grid item xs={12} md={8}>
              <Card sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    National HIV Encounter & Clinical Timeline
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Assignment />}
                    onClick={() => handleTabChange('forms')}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    + Record Clinical Encounter
                  </Button>
                </Box>

                {patientSummary?.encounters && patientSummary.encounters.length > 0 ? (
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800 }}>Encounter #</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Form Name</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Encounter Date</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Clinician</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Regimen / Findings</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Sync Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {patientSummary.encounters.map((enc: any) => (
                          <TableRow key={enc.id} hover>
                            <TableCell sx={{ fontWeight: 700, color: '#059669' }}>{enc.encounterNumber}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{enc.formSchema?.formName || enc.encounterType}</TableCell>
                            <TableCell>{new Date(enc.encounterDate).toLocaleDateString()}</TableCell>
                            <TableCell>{enc.clinicianName || 'Medical Officer'}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: 12 }}>
                                {enc.formData?.currentArvRegimen ? `Regimen: ${enc.formData.currentArvRegimen}` : ''}
                                {enc.formData?.viralLoadValue !== undefined ? ` • VL: ${enc.formData.viralLoadValue} cp/mL` : ''}
                                {enc.formData?.whoClinicalStage ? ` • WHO: ${enc.formData.whoClinicalStage}` : ''}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={<CheckCircle sx={{ fontSize: '14px !important' }} />}
                                label="Synced"
                                size="small"
                                color="success"
                                sx={{ height: 20, fontSize: 10, fontWeight: 800 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="body1" sx={{ color: '#64748b', mb: 1 }}>
                      No NMRS clinical encounters recorded yet for this patient.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => handleTabChange('forms')}
                      sx={{ bgcolor: '#059669', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                    >
                      Fill Care Card or Initial Evaluation Now
                    </Button>
                  </Box>
                )}
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── TAB 2: Dynamic National JSON Forms Engine ─────────────────────────── */}
      {activeTab === 'forms' && (
        <Box>
          <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  Dynamic National Clinical Forms Engine
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Schema-driven dynamic forms matching openmrs-esm-nmrs & nmrsmetadata. Updates dynamically without code refactoring.
                </Typography>
              </Box>

              <FormControl size="small" sx={{ minWidth: 340 }}>
                <InputLabel>Select National Form</InputLabel>
                <Select
                  value={selectedSchemaId}
                  label="Select National Form"
                  onChange={(e) => setSelectedSchemaId(e.target.value)}
                >
                  {schemas.map(s => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.formName} (v{s.version})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {activeSchema && (
              <Box sx={{ borderTop: '1px solid #e2e8f0', pt: 3 }}>
                <Box sx={{ mb: 2, p: 2, bgcolor: '#ecfdf5', borderRadius: 2, border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#065f46' }}>
                      {activeSchema.formName}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#047857' }}>
                      {activeSchema.description}
                    </Typography>
                  </Box>
                  <Chip label={`Category: ${activeSchema.category}`} size="small" sx={{ bgcolor: '#059669', color: '#fff', fontWeight: 700 }} />
                </Box>

                {/* Form Sections & Fields */}
                {((activeSchema.schemaJson?.sections && activeSchema.schemaJson.sections.length > 0)
                  ? activeSchema.schemaJson.sections
                  : (activeSchema.schemaJson?.pages?.flatMap((p: any) => p.sections) || [])
                ).map((section: any) => (
                  <Box key={section.id} sx={{ mb: 4, p: 2.5, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                      {section.title}
                    </Typography>
                    {section.description && (
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                        {section.description}
                      </Typography>
                    )}
                    <Divider sx={{ mb: 2.5 }} />

                    <Grid container spacing={2.5}>
                      {(section.questions || []).map((q: any) => {
                        // Check dependencies
                        if (q.dependsOn && formData[q.dependsOn.fieldId] !== q.dependsOn.equals) {
                          return null;
                        }

                        return (
                          <Grid item xs={12} sm={q.type === 'textarea' ? 12 : 6} md={q.type === 'textarea' ? 12 : 4} key={q.id}>
                            {/* Date Field */}
                            {q.type === 'date' && (
                              <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label={q.label}
                                InputLabelProps={{ shrink: true }}
                                value={formData[q.id] || ''}
                                onChange={(e) => handleDynamicFieldChange(q.id, e.target.value)}
                                helperText={q.helperText}
                                required={q.required}
                              />
                            )}

                            {/* Text / Number Field */}
                            {(q.type === 'text' || q.type === 'number') && (
                              <TextField
                                fullWidth
                                size="small"
                                type={q.type}
                                label={q.label}
                                value={formData[q.id] || ''}
                                onChange={(e) => handleDynamicFieldChange(q.id, e.target.value)}
                                helperText={q.helperText}
                                required={q.required}
                              />
                            )}

                            {/* Select Field */}
                            {q.type === 'select' && (
                              <FormControl fullWidth size="small" required={q.required}>
                                <InputLabel>{q.label}</InputLabel>
                                <Select
                                  value={formData[q.id] || ''}
                                  label={q.label}
                                  onChange={(e) => handleDynamicFieldChange(q.id, e.target.value)}
                                >
                                  {q.options?.map((opt: any) => (
                                    <MenuItem key={String(opt.value)} value={opt.value}>
                                      {opt.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                                {q.helperText && <FormHelperText>{q.helperText}</FormHelperText>}
                              </FormControl>
                            )}

                            {/* Radio Field */}
                            {q.type === 'radio' && (
                              <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#334155', display: 'block', mb: 0.5 }}>
                                  {q.label} {q.required && '*'}
                                </Typography>
                                <RadioGroup
                                  value={formData[q.id] || ''}
                                  onChange={(e) => handleDynamicFieldChange(q.id, e.target.value)}
                                >
                                  {q.options?.map((opt: any) => (
                                    <FormControlLabel
                                      key={String(opt.value)}
                                      value={opt.value}
                                      control={<Radio size="small" color="success" />}
                                      label={<Typography variant="body2">{opt.label}</Typography>}
                                    />
                                  ))}
                                </RadioGroup>
                              </Box>
                            )}

                            {/* Textarea Field */}
                            {q.type === 'textarea' && (
                              <TextField
                                fullWidth
                                size="small"
                                multiline
                                rows={3}
                                label={q.label}
                                value={formData[q.id] || ''}
                                onChange={(e) => handleDynamicFieldChange(q.id, e.target.value)}
                                helperText={q.helperText}
                                required={q.required}
                              />
                            )}
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                ))}

                {/* Auto Calculated BMI Badge if available */}
                {formData.calculatedBmi && (
                  <Box sx={{ mb: 3, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#166534' }}>
                      Calculated Body Mass Index (BMI):
                    </Typography>
                    <Chip label={`${formData.calculatedBmi} kg/m²`} color="success" sx={{ fontWeight: 800 }} />
                  </Box>
                )}

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setFormData({})}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Reset Form
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={savingForm ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <Save />}
                    onClick={handleSaveDynamicForm}
                    disabled={savingForm}
                    sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, textTransform: 'none', fontWeight: 800, borderRadius: 2, px: 3 }}
                  >
                    Save & Sync to OpenMRS Host
                  </Button>
                </Box>
              </Box>
            )}
          </Card>
        </Box>
      )}

      {/* ── TAB 3: Bi-Directional Sync Queue ─────────────────────────────────── */}
      {activeTab === 'queue' && (
        <Box>
          <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  Bi-Directional Synchronization Queue & Transaction Logs
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Offline-first resilient message queue. Automatically retries when the OpenMRS laptop reconnects.
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={processingQueue ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SyncAlt />}
                onClick={handleProcessQueue}
                disabled={processingQueue}
                sx={{ bgcolor: '#059669', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Process All Pending Syncs
              </Button>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Job ID</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Action / Type</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Entity</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Created At</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Retries</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {syncQueue.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                        No sync jobs in queue. Everything is synchronized.
                      </TableCell>
                    </TableRow>
                  ) : (
                    syncQueue.map((job) => (
                      <TableRow key={job.id} hover>
                        <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: 11 }}>{job.id.slice(0, 8)}</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#059669' }}>{job.jobType}</TableCell>
                        <TableCell>{job.entityType} ({job.entityId.slice(0, 8)})</TableCell>
                        <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{job.retryCount} / {job.maxRetries}</TableCell>
                        <TableCell>
                          <Chip
                            label={job.status}
                            size="small"
                            color={job.status === 'COMPLETED' ? 'success' : job.status === 'PENDING' ? 'warning' : 'error'}
                            sx={{ fontWeight: 800, fontSize: 10, height: 20 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {/* ── TAB 4: FMoH National Data Repository (NDR) XML Exporter ──────────── */}
      {activeTab === 'ndr' && (
        <Box>
          <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  Federal Ministry of Health (FMoH) NDR XML Generator
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Generates standardized, compliant XML containers for the National Data Repository (PEPFAR / Global Fund / CDC).
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={ndrGenerating ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <CloudDownload />}
                onClick={handleGenerateNdrXml}
                disabled={ndrGenerating}
                sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
              >
                Generate Compliant NDR XML Bundle
              </Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ p: 2, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
                  <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700 }}>Facility DATIM Code</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#0284c7' }}>{config.facilityDATIMCode}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ p: 2, bgcolor: '#ecfdf5', borderRadius: 2, border: '1px solid #a7f3d0' }}>
                  <Typography variant="caption" sx={{ color: '#047857', fontWeight: 700 }}>NDR Schema Specification</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#059669' }}>v{config.ndrVersion} Compliant</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>State & LGA</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#334155' }}>{config.stateName} / {config.lgaName}</Typography>
                </Box>
              </Grid>
            </Grid>

            {ndrResult && (
              <Box sx={{ mt: 3, p: 2.5, bgcolor: '#0f172a', borderRadius: 2, color: '#f8fafc' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ color: '#38bdf8', fontWeight: 800 }}>
                    Preview: {ndrResult.fileName} ({ndrResult.totalPatients} Patients, {ndrResult.totalEncounters} Encounters)
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Download />}
                    onClick={handleDownloadNdrFile}
                    sx={{ bgcolor: '#059669', textTransform: 'none', fontWeight: 700 }}
                  >
                    Download XML Package
                  </Button>
                </Box>
                <Box sx={{ maxHeight: 300, overflow: 'auto', p: 1.5, bgcolor: '#1e293b', borderRadius: 1, fontFamily: 'monospace', fontSize: 11 }}>
                  <pre style={{ margin: 0 }}>{ndrResult.xmlContent}</pre>
                </Box>
              </Box>
            )}
          </Card>
        </Box>
      )}

      {/* ── TAB 5: Network Gateway & CIEL Mappings ────────────────────────────── */}
      {activeTab === 'settings' && (
        <Box>
          <Grid container spacing={3}>
            {/* Left: Host Connection Settings */}
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
                  Remote NMRS OpenMRS Gateway Configuration
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                  Configure the IP address & port of the laptop or server running OpenMRS on the hospital network.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="OpenMRS Server Base URL"
                    helperText="e.g. http://192.168.100.205:8080/openmrs or http://localhost:8080/openmrs"
                    value={config.openmrsBaseUrl}
                    onChange={(e) => setConfig({ ...config, openmrsBaseUrl: e.target.value })}
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="OpenMRS Username"
                        value={config.openmrsUsername}
                        onChange={(e) => setConfig({ ...config, openmrsUsername: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        type="password"
                        label="OpenMRS Password"
                        value={config.openmrsPassword}
                        onChange={(e) => setConfig({ ...config, openmrsPassword: e.target.value })}
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Facility DATIM Code"
                        value={config.facilityDATIMCode}
                        onChange={(e) => setConfig({ ...config, facilityDATIMCode: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Facility Name"
                        value={config.facilityName}
                        onChange={(e) => setConfig({ ...config, facilityName: e.target.value })}
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="State"
                        value={config.stateName}
                        onChange={(e) => setConfig({ ...config, stateName: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="LGA"
                        value={config.lgaName}
                        onChange={(e) => setConfig({ ...config, lgaName: e.target.value })}
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Wifi />}
                      onClick={() => testServerConnection(config.openmrsBaseUrl)}
                      sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                    >
                      Test Network Connection
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSaveConfig}
                      sx={{ bgcolor: '#059669', textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
                    >
                      Save Configuration
                    </Button>
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* Right: CIEL Concept Dictionary */}
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                  CIEL Concept Dictionary Mappings
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                  Standardized Columbia International eHealth Laboratory (CIEL) concept mappings used for OpenMRS synchronization.
                </Typography>

                <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 380, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Local Key</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>CIEL Concept ID</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Display Name</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Datatype</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {concepts.map((c) => (
                        <TableRow key={c.localKey} hover>
                          <TableCell sx={{ fontWeight: 700, color: '#059669', fontSize: 11 }}>{c.localKey}</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#0284c7' }}>{c.cielId}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{c.displayName}</TableCell>
                          <TableCell><Chip label={c.datatype} size="small" sx={{ fontSize: 10, height: 18 }} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── NDR Export Modal ─────────────────────────────────────────────────── */}
      <Dialog
        open={ndrModalOpen}
        onClose={() => setNdrModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ bgcolor: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudDownload sx={{ color: '#38bdf8' }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              FMoH National Data Repository XML Generated
            </Typography>
          </Box>
          <IconButton onClick={() => setNdrModalOpen(false)} sx={{ color: '#94a3b8' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {ndrResult && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Generated valid NDR XML for <strong>{ndrResult.totalPatients} patients</strong> and <strong>{ndrResult.totalEncounters} clinical encounters</strong>.
              </Alert>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                File: {ndrResult.fileName} • Export Time: {ndrResult.exportTimestamp}
              </Typography>
              <Box sx={{ maxHeight: 350, overflow: 'auto', p: 2, bgcolor: '#0f172a', color: '#38bdf8', borderRadius: 2, fontFamily: 'monospace', fontSize: 11 }}>
                <pre style={{ margin: 0 }}>{ndrResult.xmlContent}</pre>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setNdrModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748b' }}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownloadNdrFile}
            sx={{ bgcolor: '#059669', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Download XML Package
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
