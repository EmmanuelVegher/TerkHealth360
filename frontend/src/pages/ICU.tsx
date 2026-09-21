import { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, InputAdornment, Tab, Tabs, CircularProgress,
  Stack, Divider, Paper, Switch, FormControlLabel, Slider, Alert, Tooltip
} from '@mui/material';
import {
  Add, Search, Visibility, LocalHospital, Shield, Timer, Speed,
  Warning, Healing, PrecisionManufacturing, CheckCircle, BarChart
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

// API root
const API = `${API_BASE_URL}/icu`;

interface Patient {
  id: string; firstName: string; lastName: string; patientNumber: string; gender: string;
}

interface Staff {
  id: string; firstName: string; lastName: string; designation: string;
}

interface IcuBed {
  id: string; bedCode: string; unit: string; status: string; isolationRules?: string;
}

interface IcuAdmission {
  id: string; admissionCode: string; patientId: string; patient: Patient;
  admittingStaffId: string; admittingStaff: Staff; bedId?: string; bed?: IcuBed;
  diagnosis: string; severityScore: number; indication: string; urgency: string;
  status: string; admittedAt: string; dischargedAt?: string;
  careGoals: any[]; equipments: any[]; observations: any[];
  ventilators: any[]; infusions: any[]; dialysisRuns: any[];
  neuroObservations: any[]; warningAlerts: any[]; progressNotes: any[];
  infectionChecks: any[]; pathways: any[]; handovers: any[]; incidents: any[];
}

const URGENCY_COLORS: Record<string, string> = {
  'EMERGENCY': '#e03131', 'URGENT': '#f59f00', 'POST_OPERATIVE': '#1c7ed6', 'MEDICAL': '#2f9e44',
  'SURGICAL': '#ae3ec9', 'OBSTETRIC': '#d0bfff', 'NEONATAL': '#e599f7', 'TRAUMA': '#c2255c'
};

const STATUS_COLORS: Record<string, string> = {
  'PENDING': '#f59f00', 'APPROVED': '#1c7ed6', 'ADMITTED': '#2f9e44', 'DISCHARGED': '#868e96'
};

const KpiCard = ({ icon, label, value, color, subtitle }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; subtitle?: string;
}) => (
  <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`, border: `1px solid ${color}30`, boxShadow: 'none' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>{label}</Typography>
          <Typography variant="h4" fontWeight={900} color={color} mt={0.5}>{value}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: `${color}20`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function ICU() {
  const theme = useTheme();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path.endsWith('/monitors')) setTab(1);
    else if (path.endsWith('/meds')) setTab(2);
    else if (path.endsWith('/notes')) setTab(3);
    else setTab(0);
  }, [location.pathname]);

  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    if (path.endsWith('/monitors')) {
      return {
        title: 'Ventilator & Real-Time Physiological Telemetry Feeds',
        subtitle: 'Invasive Arterial Pressure · SpO2 · Ventilator Waveforms · FiO2 Delivery',
        category: 'Intensive Care Unit (ICU)',
        kpis: [
          { label: 'Active Ventilators', value: '4 Operating', subtitle: 'Mechanical Vent', icon: <PrecisionManufacturing />, color: '#1c7ed6' },
          { label: 'High SpO2 Alarms', value: '0 Active', subtitle: 'Telemetry Desk', icon: <CheckCircle />, color: '#2f9e44' },
          { label: 'Infusion Pumps', value: '12 Running', subtitle: 'Continuous Drips', icon: <Healing />, color: '#ae3ec9' },
          { label: 'Telemetry Uptime', value: '99.9%', subtitle: 'Central Monitor', icon: <Timer />, color: '#7048e8' },
        ],
      };
    }

    if (path.endsWith('/meds')) {
      return {
        title: 'Critical Care High-Alert Infusions & Vasopressor Desk',
        subtitle: 'Double-Check Clearance · Inotrope Titration · High-Alert Med Protocols',
        category: 'Intensive Care Unit (ICU)',
        kpis: [
          { label: 'Active Inotrope Drips', value: '6 Titrating', subtitle: 'Norepinephrine/Dobutamine', icon: <Healing />, color: '#ae3ec9' },
          { label: 'Double-Check Passed', value: '100%', subtitle: 'Nurse Verification', icon: <CheckCircle />, color: '#2f9e44' },
          { label: 'Critical Med Orders', value: `${admissions.length || 2} Patients`, subtitle: 'ICU eMAR', icon: <LocalHospital />, color: '#1c7ed6' },
          { label: 'Infusion Alerts', value: '0 Escalated', subtitle: 'Safety Compliance', icon: <Shield />, color: '#7048e8' },
        ],
      };
    }

    if (path.endsWith('/notes')) {
      return {
        title: 'Intensivist Clinical Rounds & Critical Care Progress Notes',
        subtitle: 'Glasgow Coma Scale (GCS) · NEWS Early Warning Score · Daily Care Goals',
        category: 'Intensive Care Unit (ICU)',
        kpis: [
          { label: 'Rounds Completed', value: `${admissions.length || 0} Patients`, subtitle: 'Intensivist Sign-Off', icon: <LocalHospital />, color: '#1c7ed6' },
          { label: 'Avg GCS Score', value: '12 / 15', subtitle: 'Neurological Status', icon: <Speed />, color: '#2f9e44' },
          { label: 'NEWS Escalations', value: '1 Alert', subtitle: 'Warning Escalation', icon: <Warning />, color: '#e03131' },
          { label: 'Shift Handovers', value: '100% Signed', subtitle: 'SBAR Protocol', icon: <CheckCircle />, color: '#7048e8' },
        ],
      };
    }

    // Default: Beds
    return {
      title: 'ICU & HDU Bed Census & Admission Capacity',
      subtitle: 'Critical Care Bed Allocation · Isolation Rules · APACHE II Severity Scoring',
      category: 'Intensive Care Unit (ICU)',
      kpis: [
        { label: 'Active ICU Beds', value: `${beds.length || 0} Beds`, subtitle: 'Total Unit Capacity', icon: <LocalHospital />, color: '#ae3ec9' },
        { label: 'Bed Occupancy', value: `${admissions.filter(a => a.status === 'ADMITTED').length || 0} Admitted`, subtitle: 'Occupied Beds', icon: <Healing />, color: '#e03131' },
        { label: 'Beds Available', value: `${beds.filter(b => b.status === 'AVAILABLE').length || 0} Free`, subtitle: 'Sanitized & Ready', icon: <CheckCircle />, color: '#2f9e44' },
        { label: 'APACHE II Score Avg', value: '18.4', subtitle: 'Severity Index', icon: <Speed />, color: '#f59f00' },
      ],
    };
  };

  // Lists
  const [admissions, setAdmissions] = useState<IcuAdmission[]>([]);
  const [beds, setBeds] = useState<IcuBed[]>([]);
  const [search, setSearch] = useState('');

  // Dialog controls
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [bedOpen, setBedOpen] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const [ventOpen, setVentOpen] = useState(false);
  const [infusionOpen, setInfusionOpen] = useState(false);
  const [dialysisOpen, setDialysisOpen] = useState(false);
  const [neuroOpen, setNeuroOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [infectionOpen, setInfectionOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);

  // Selection
  const [selectedAdmission, setSelectedAdmission] = useState<IcuAdmission | null>(null);

  // Forms
  const [admissionForm, setAdmissionForm] = useState({
    patientId: '', diagnosis: '', severityScore: 12, indication: '', urgency: 'URGENT'
  });

  const [bedForm, setBedForm] = useState({
    bedCode: '', unit: 'ICU', isolationRules: ''
  });

  const [obsForm, setObsForm] = useState({
    heartRate: 85, bpSystolic: 120, bpDiastolic: 80, respirationRate: 18, spo2: 98, temperature: 36.8,
    centralVenousPressure: 8, arterialPressure: 90, intracranialPressure: 10, cardiacOutput: 5.2
  });

  const [ventForm, setVentForm] = useState({
    mode: 'AC', tidalVolumeML: 450, respirationRate: 14, fio2Percentage: 40, peepH2O: 5,
    supportPressureH2O: 10, pressureInspiratoryH2O: 15, weaningStatus: 'ONGOING', extubationReadiness: ''
  });

  const [infusionForm, setInfusionForm] = useState({
    medicationName: 'Norepinephrine', concentration: '4mg in 50ml D5W', doseRate: '0.05 mcg/kg/min',
    isHighAlert: true, verifiedClinicianId: ''
  });

  const [dialysisForm, setDialysisForm] = useState({
    dialysisType: 'CRRT', ultrafiltrationRateMLHr: 150, heparinDoseUnits: 500
  });

  const [neuroForm, setNeuroForm] = useState({
    gcsEye: 4, gcsVerbal: 5, gcsMotor: 6, pupilReactivity: 'NORMAL',
    limbMovementGrading: 'NORMAL', rassScore: 0
  });

  const [alertForm, setAlertForm] = useState({
    newsScore: 3, abnormalTriggers: 'SpO2 91% on room air', escalationLevel: 'NONE'
  });

  const [goalForm, setGoalForm] = useState({
    description: '', discipline: 'NURSING', targetDate: new Date().toISOString().slice(0, 10)
  });

  const [infectionForm, setInfectionForm] = useState({
    vapCompliance: true, clabsiCompliance: true, cautiCompliance: true, handHygieneCompliance: true
  });

  const [handoverForm, setHandoverForm] = useState({
    targetWard: 'Medical Ward 2', currentDiagnosis: 'Sepsis secondary to UTI.',
    medicationsActive: 'Ceftriaxone 2g IV daily', outstandingCare: 'Recheck vitals every 4 hours.'
  });

  const [incidentForm, setIncidentForm] = useState({
    incidentType: 'PATIENT_FALL', severityGrading: 'LOW',
    rcaFindings: 'Slippery floor near bed 4.', capaDetails: 'Add extra wet floor hazard warning cones.'
  });

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: token ? `Bearer ${token}` : '' };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [admRes, bedsRes] = await Promise.all([
        axios.get(`${API}/admissions`, { headers: getHeaders() }),
        axios.get(`${API}/beds`, { headers: getHeaders() })
      ]);
      setAdmissions(admRes.data);
      setBeds(bedsRes.data);
    } catch {
      enqueueSnackbar('Failed to load Critical Care data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle forms submits
  const handleAdmissionRequest = async () => {
    if (!admissionForm.patientId || !admissionForm.diagnosis) {
      enqueueSnackbar('Patient ID and diagnosis are required', { variant: 'warning' });
      return;
    }
    try {
      const staffList = await axios.get(`${API_BASE_URL}/nursing/staff`, { headers: getHeaders() });
      const admittingStaffId = staffList.data[0]?.id;
      if (!admittingStaffId) {
        enqueueSnackbar('No admitting staff registered', { variant: 'warning' });
        return;
      }

      await axios.post(`${API}/admissions`, {
        ...admissionForm,
        admittingStaffId
      }, { headers: getHeaders() });

      enqueueSnackbar('ICU Admission request raised successfully', { variant: 'success' });
      setAdmissionOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Admission request failed', { variant: 'error' });
    }
  };

  const handleApproveAdmission = async (id: string, bedId: string) => {
    try {
      await axios.post(`${API}/admissions/${id}/approve`, { bedId }, { headers: getHeaders() });
      enqueueSnackbar('Bed allocated. Patient admitted to ICU.', { variant: 'success' });
      fetchData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Allocation failed', { variant: 'error' });
    }
  };

  const handleCreateBed = async () => {
    if (!bedForm.bedCode) return;
    try {
      await axios.post(`${API}/beds`, bedForm, { headers: getHeaders() });
      enqueueSnackbar('Critical care bed registered successfully', { variant: 'success' });
      setBedOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Bed registry failed', { variant: 'error' });
    }
  };

  const handleSaveObservations = async () => {
    if (!selectedAdmission) return;
    try {
      const staffList = await axios.get(`${API_BASE_URL}/nursing/staff`, { headers: getHeaders() });
      const observerId = staffList.data[0]?.id;

      await axios.post(`${API}/admissions/${selectedAdmission.id}/observations`, {
        ...obsForm,
        patientId: selectedAdmission.patientId,
        observerId
      }, { headers: getHeaders() });

      enqueueSnackbar('Continuous observations logged successfully', { variant: 'success' });
      setObsOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Observation log failed', { variant: 'error' });
    }
  };

  const handleSaveVentilator = async () => {
    if (!selectedAdmission) return;
    try {
      await axios.post(`${API}/admissions/${selectedAdmission.id}/ventilator`, ventForm, { headers: getHeaders() });
      enqueueSnackbar('Ventilator parameters settings updated', { variant: 'success' });
      setVentOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Ventilator parameter log failed', { variant: 'error' });
    }
  };

  const handleSaveInfusion = async () => {
    if (!selectedAdmission) return;
    try {
      const staffList = await axios.get(`${API_BASE_URL}/nursing/staff`, { headers: getHeaders() });
      const initialClinicianId = staffList.data[0]?.id;
      const verifiedClinicianId = staffList.data[1]?.id || staffList.data[0]?.id;

      await axios.post(`${API}/admissions/${selectedAdmission.id}/infusions`, {
        ...infusionForm,
        patientId: selectedAdmission.patientId,
        initialClinicianId,
        verifiedClinicianId: infusionForm.isHighAlert ? verifiedClinicianId : null
      }, { headers: getHeaders() });

      enqueueSnackbar('Infusion therapy titrations logged', { variant: 'success' });
      setInfusionOpen(false);
      fetchData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Dual signature checklist missing', { variant: 'error' });
    }
  };

  const handleSaveDialysis = async () => {
    if (!selectedAdmission) return;
    try {
      await axios.post(`${API}/admissions/${selectedAdmission.id}/dialysis`, {
        ...dialysisForm,
        patientId: selectedAdmission.patientId
      }, { headers: getHeaders() });

      enqueueSnackbar('Dialysis / CRRT record saved', { variant: 'success' });
      setDialysisOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Dialysis logging failed', { variant: 'error' });
    }
  };

  const handleSaveNeuro = async () => {
    if (!selectedAdmission) return;
    try {
      const staffList = await axios.get(`${API_BASE_URL}/nursing/staff`, { headers: getHeaders() });
      const clinicianId = staffList.data[0]?.id;

      await axios.post(`${API}/admissions/${selectedAdmission.id}/neuro`, {
        ...neuroForm,
        patientId: selectedAdmission.patientId,
        clinicianId
      }, { headers: getHeaders() });

      enqueueSnackbar('GCS neurological assessment saved', { variant: 'success' });
      setNeuroOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('GCS assessment failed', { variant: 'error' });
    }
  };

  const handleSaveAlert = async () => {
    if (!selectedAdmission) return;
    try {
      await axios.post(`${API}/admissions/${selectedAdmission.id}/alerts`, {
        ...alertForm,
        patientId: selectedAdmission.patientId
      }, { headers: getHeaders() });

      enqueueSnackbar('Early warning alert news score logged', { variant: 'success' });
      setAlertOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Alert score failed', { variant: 'error' });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    const notes = prompt('Enter responder action details:');
    if (notes === null) return;
    try {
      await axios.put(`${API}/alerts/${alertId}/resolve`, { responderNotes: notes }, { headers: getHeaders() });
      enqueueSnackbar('NEWS warning alert resolved.', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Resolve alert failed', { variant: 'error' });
    }
  };

  const handleSaveGoal = async () => {
    if (!selectedAdmission) return;
    try {
      await axios.post(`${API}/admissions/${selectedAdmission.id}/goals`, goalForm, { headers: getHeaders() });
      enqueueSnackbar('Daily multidisciplinary goal assigned', { variant: 'success' });
      setGoalOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Goal registry failed', { variant: 'error' });
    }
  };

  const handleCompleteGoal = async (id: string, met: boolean) => {
    try {
      await axios.put(`${API}/goals/${id}`, { status: met ? 'MET' : 'UNMET' }, { headers: getHeaders() });
      enqueueSnackbar('Goal task updated', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Goal update failed', { variant: 'error' });
    }
  };

  const handleSaveInfection = async () => {
    if (!selectedAdmission) return;
    try {
      await axios.post(`${API}/admissions/${selectedAdmission.id}/infection-checks`, infectionForm, { headers: getHeaders() });
      enqueueSnackbar('Infection prevention bundle checklist saved', { variant: 'success' });
      setInfectionOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Infection bundle failed', { variant: 'error' });
    }
  };

  const handleSaveHandover = async () => {
    if (!selectedAdmission) return;
    try {
      const staffList = await axios.get(`${API_BASE_URL}/nursing/staff`, { headers: getHeaders() });
      const clinicianId = staffList.data[0]?.id;

      await axios.post(`${API}/admissions/${selectedAdmission.id}/handover`, {
        ...handoverForm,
        patientId: selectedAdmission.patientId,
        clinicianId
      }, { headers: getHeaders() });

      enqueueSnackbar('Discharged from ICU. Ward transfer clinical handover completed.', { variant: 'success' });
      setHandoverOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Handover failed', { variant: 'error' });
    }
  };

  const handleSaveIncident = async () => {
    if (!selectedAdmission) return;
    try {
      const staffList = await axios.get(`${API_BASE_URL}/nursing/staff`, { headers: getHeaders() });
      const reporterId = staffList.data[0]?.id;

      await axios.post(`${API}/admissions/${selectedAdmission.id}/incidents`, {
        ...incidentForm,
        patientId: selectedAdmission.patientId,
        reporterId
      }, { headers: getHeaders() });

      enqueueSnackbar('Quality patient safety incident reported. RCA initiated.', { variant: 'success' });
      setIncidentOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Incident report failed', { variant: 'error' });
    }
  };

  const handleSaveRca = async (id: string) => {
    const findings = prompt('Enter Root Cause Analysis (RCA) Findings:');
    const capa = prompt('Enter Corrective Actions (CAPAs):');
    if (!findings || !capa) return;
    try {
      await axios.put(`${API}/incidents/${id}/rca`, { status: 'CLOSED', rcaFindings: findings, capaDetails: capa }, { headers: getHeaders() });
      enqueueSnackbar('RCA CAPA investigation closed successfully', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('RCA update failed', { variant: 'error' });
    }
  };

  // Rendering Layouts
  const renderCensusTab = () => (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search patient number, clinical severity..."
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          sx={{ mr: 'auto', width: 320 }}
        />
        <Button variant="outlined" startIcon={<PrecisionManufacturing />} onClick={() => setBedOpen(true)}>Register Critical Bed</Button>
        <Button variant="contained" startIcon={<Add />} onClick={() => setAdmissionOpen(true)}>Admission Request</Button>
      </Box>

      {/* Bed Grid */}
      <Typography variant="subtitle2" fontWeight="bold" mb={2}>🛏️ ICU & HDU Beds Grid</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {beds.length === 0 ? (
          <Grid item xs={12}><Typography variant="body2" color="text.secondary">No critical beds registered.</Typography></Grid>
        ) : beds.map(b => (
          <Grid item xs={6} sm={4} md={2} key={b.id}>
            <Card sx={{
              border: '2px solid',
              borderColor: b.status === 'OCCUPIED' ? 'error.main' : b.status === 'ISOLATION' ? 'warning.main' : 'success.main',
              bgcolor: alpha(b.status === 'OCCUPIED' ? theme.palette.error.main : b.status === 'ISOLATION' ? theme.palette.warning.main : theme.palette.success.main, 0.05),
              boxShadow: 'none'
            }}>
              <CardContent sx={{ p: 2, textCenter: 'center' }}>
                <Typography variant="subtitle1" fontWeight={900}>{b.bedCode}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">{b.unit} Unit</Typography>
                <Chip label={b.status} size="small" color={b.status === 'OCCUPIED' ? 'error' : b.status === 'ISOLATION' ? 'warning' : 'success'} sx={{ mt: 1, fontSize: '0.6rem', fontWeight: 800 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Admissions queue */}
      <Typography variant="subtitle2" fontWeight="bold" mb={2}>📋 Admissions Priority Queue</Typography>
      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Patient Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Diagnosis / Indication</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Urgency</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Allocated Bed</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {admissions.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center">No admissions requested.</TableCell></TableRow>
            ) : admissions.map(adm => (
              <TableRow key={adm.id} hover>
                <TableCell><Typography variant="body2" fontWeight={800} color="primary.main">{adm.admissionCode}</Typography></TableCell>
                <TableCell><Typography variant="body2" fontWeight={700}>{adm.patient.firstName} {adm.patient.lastName}</Typography></TableCell>
                <TableCell>
                  <Typography variant="body2">{adm.diagnosis}</Typography>
                  <Typography variant="caption" color="text.secondary">Indication: {adm.indication}</Typography>
                </TableCell>
                <TableCell><Chip label={`APACHE: ${adm.severityScore}`} size="small" color="secondary" variant="outlined" sx={{ fontSize: '0.65rem', fontWeight: 700 }} /></TableCell>
                <TableCell>
                  <Chip label={adm.urgency} size="small" sx={{
                    bgcolor: alpha(URGENCY_COLORS[adm.urgency] || '#868e96', 0.1),
                    color: URGENCY_COLORS[adm.urgency] || '#868e96', fontWeight: 800, fontSize: '0.65rem'
                  }} />
                </TableCell>
                <TableCell><Typography variant="body2" fontWeight={700}>{adm.bed?.bedCode || 'Awaiting Bed'}</Typography></TableCell>
                <TableCell>
                  <Chip label={adm.status} size="small" sx={{
                    bgcolor: alpha(STATUS_COLORS[adm.status] || '#868e96', 0.1),
                    color: STATUS_COLORS[adm.status] || '#868e96', fontWeight: 700, fontSize: '0.65rem'
                  }} />
                </TableCell>
                <TableCell align="right">
                  {adm.status === 'PENDING' && (
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {beds.filter(b => b.status === 'AVAILABLE').map(availBed => (
                        <Button key={availBed.id} size="small" variant="contained" onClick={() => handleApproveAdmission(adm.id, availBed.id)}>
                          Assign {availBed.bedCode}
                        </Button>
                      ))}
                    </Stack>
                  )}
                  {adm.status === 'ADMITTED' && (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Button size="small" variant="outlined" color="primary" onClick={() => { setSelectedAdmission(adm); setObsOpen(true); }}>Obs</Button>
                      <Button size="small" variant="outlined" color="primary" onClick={() => { setSelectedAdmission(adm); setVentOpen(true); }}>Vent</Button>
                      <Button size="small" variant="outlined" color="primary" onClick={() => { setSelectedAdmission(adm); setInfusionOpen(true); }}>Infuse</Button>
                      <Button size="small" variant="outlined" color="primary" onClick={() => { setSelectedAdmission(adm); setDialysisOpen(true); }}>Dialysis</Button>
                      <Button size="small" variant="outlined" color="secondary" onClick={() => { setSelectedAdmission(adm); setNeuroOpen(true); }}>Neuro</Button>
                      <Button size="small" variant="outlined" color="warning" onClick={() => { setSelectedAdmission(adm); setAlertOpen(true); }}>Alert</Button>
                      <Button size="small" variant="outlined" color="success" onClick={() => { setSelectedAdmission(adm); setGoalOpen(true); }}>Goal</Button>
                      <Button size="small" variant="outlined" color="success" onClick={() => { setSelectedAdmission(adm); setInfectionOpen(true); }}>Infect</Button>
                      <Button size="small" variant="contained" color="error" onClick={() => { setSelectedAdmission(adm); setHandoverOpen(true); }}>Handover</Button>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderTelemetryTab = () => (
    <Box>
      <Typography variant="h6" fontWeight="bold" mb={3}>Continuous Telemetry Observations & Life Support Systems</Typography>
      <Grid container spacing={3}>
        {admissions.filter(a => a.status === 'ADMITTED').map(adm => {
          const latestObs = adm.observations[0];
          const latestVent = adm.ventilators[0];
          return (
            <Grid item xs={12} md={6} key={adm.id}>
              <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} color="primary.main">Bed: {adm.bed?.bedCode} | Patient: {adm.patient.firstName} {adm.patient.lastName}</Typography>
                  <Divider sx={{ my: 1 }} />
                  
                  {/* Physiological observations */}
                  <Typography variant="caption" fontWeight="bold" display="block" color="text.secondary" mb={1}>PHYSIOLOGICAL TELEMETRY FEED</Typography>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={3}><Typography variant="body2">HR: {latestObs?.heartRate || '--'} bpm</Typography></Grid>
                    <Grid item xs={4}><Typography variant="body2">BP: {latestObs?.bpSystolic || '--'}/{latestObs?.bpDiastolic || '--'}</Typography></Grid>
                    <Grid item xs={3}><Typography variant="body2">SpO2: {latestObs?.spo2 || '--'}%</Typography></Grid>
                    <Grid item xs={2}><Typography variant="body2">Temp: {latestObs?.temperature || '--'}°C</Typography></Grid>
                  </Grid>

                  {/* Ventilator Settings */}
                  <Typography variant="caption" fontWeight="bold" display="block" color="text.secondary" mb={1}>MECHANICAL VENTILATOR PARAMETERS</Typography>
                  {latestVent ? (
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                      <Grid item xs={3}><Typography variant="body2">Mode: {latestVent.mode}</Typography></Grid>
                      <Grid item xs={3}><Typography variant="body2">Tidal: {latestVent.tidalVolumeML}mL</Typography></Grid>
                      <Grid item xs={3}><Typography variant="body2">FiO2: {latestVent.fio2Percentage}%</Typography></Grid>
                      <Grid item xs={3}><Typography variant="body2">PEEP: {latestVent.peepH2O} cm</Typography></Grid>
                    </Grid>
                  ) : (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>No ventilator active.</Typography>
                  )}

                  {/* Infusion details */}
                  <Typography variant="caption" fontWeight="bold" display="block" color="text.secondary" mb={1}>ACTIVE MEDICATION INFUSIONS</Typography>
                  <Stack spacing={1}>
                    {adm.infusions.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">No infusions titrated.</Typography>
                    ) : adm.infusions.map((inf: any) => (
                      <Box key={inf.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight={700}>{inf.medicationName} ({inf.concentration})</Typography>
                        <Chip label={inf.doseRate} size="small" color={inf.isHighAlert ? 'error' : 'default'} sx={{ fontSize: '0.6rem' }} />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );

  const renderNeuroTab = () => (
    <Box>
      <Typography variant="h6" fontWeight="bold" mb={3}>GCS Neurological Logs & Early Warning Alerts</Typography>
      <Grid container spacing={3}>
        {admissions.filter(a => a.status === 'ADMITTED').map(adm => {
          const neuro = adm.neuroObservations[0];
          const activeAlert = adm.warningAlerts.filter((al: any) => al.status === 'ACTIVE')[0];
          return (
            <Grid item xs={12} md={6} key={adm.id}>
              <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} color="secondary.main">Bed: {adm.bed?.bedCode} | Patient: {adm.patient.firstName} {adm.patient.lastName}</Typography>
                  <Divider sx={{ my: 1 }} />
                  
                  {/* GCS score */}
                  <Typography variant="caption" fontWeight="bold" display="block" color="text.secondary" mb={1}>GLASGOW COMA SCALE (GCS) DETAILS</Typography>
                  {neuro ? (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={700}>Total GCS: {neuro.gcsEye + neuro.gcsVerbal + neuro.gcsMotor}/15</Typography>
                      <Typography variant="caption" color="text.secondary">Eye: {neuro.gcsEye} | Verbal: {neuro.gcsVerbal} | Motor: {neuro.gcsMotor} | RASS: {neuro.rassScore}</Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>No GCS logged.</Typography>
                  )}

                  {/* NEWS Alerts */}
                  <Typography variant="caption" fontWeight="bold" display="block" color="text.secondary" mb={1}>NATIONAL EARLY WARNING SCORE (NEWS) ALARMS</Typography>
                  {activeAlert ? (
                    <Box sx={{ p: 1, bgcolor: alpha(theme.palette.error.main, 0.1), border: '1px solid', borderColor: 'error.light', borderRadius: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Typography variant="body2" color="error" fontWeight="bold">NEWS: {activeAlert.newsScore} | {activeAlert.abnormalTriggers}</Typography>
                        <Button size="small" color="error" variant="outlined" onClick={() => handleResolveAlert(activeAlert.id)}>Resolve</Button>
                      </Stack>
                    </Box>
                  ) : (
                    <Chip label="NEWS Stable" color="success" size="small" sx={{ fontSize: '0.65rem', fontWeight: 800 }} />
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );

  const renderQualityTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight="bold">ICU Quality, Audits & Safety Incidents (RCA)</Typography>
        <Button variant="contained" startIcon={<Warning />} onClick={() => setIncidentOpen(true)}>Report Safety Incident</Button>
      </Box>

      <Typography variant="subtitle2" fontWeight="bold" mb={2}>🛡️ Incident Registers & Root Cause (RCA/CAPA) Status</Typography>
      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Incident Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>RCA Findings</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>CAPA Details</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {admissions.flatMap(a => a.incidents).length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No patient safety events reported.</TableCell></TableRow>
            ) : admissions.flatMap(a => a.incidents).map((inc: any) => (
              <TableRow key={inc.id}>
                <TableCell><Typography variant="body2" fontWeight={800}>{inc.incidentType}</Typography></TableCell>
                <TableCell><Chip label={inc.severityGrading} color={inc.severityGrading === 'SENTINEL' ? 'error' : 'warning'} size="small" sx={{ fontSize: '0.6rem', fontWeight: 800 }} /></TableCell>
                <TableCell><Typography variant="body2">{inc.rcaFindings}</Typography></TableCell>
                <TableCell><Typography variant="body2">{inc.capaDetails}</Typography></TableCell>
                <TableCell><Chip label={inc.status} size="small" color={inc.status === 'CLOSED' ? 'success' : 'default'} sx={{ fontSize: '0.65rem' }} /></TableCell>
                <TableCell align="right">
                  {inc.status === 'OPEN' && (
                    <Button size="small" variant="contained" onClick={() => handleSaveRca(inc.id)}>Perform RCA CAPA</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
      {/* Custom Header Banner Tailored to Page */}
      <Box sx={{ background: 'linear-gradient(135deg, #ae3ec9 0%, #e03131 50%, #7048e8 100%)', color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Intensive Care Unit &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              🏥 {pageDetails.title}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.88, fontWeight: 500, mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Tailored 4-Card KPI Strip */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Grid container spacing={2}>
          {pageDetails.kpis.map((kpi, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <KpiCard
                icon={kpi.icon}
                label={kpi.label}
                value={kpi.value}
                subtitle={kpi.subtitle}
                color={kpi.color}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Standalone Workspace Card */}
      <Box sx={{ px: 3 }}>
        <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
          ) : (
            <>
              {tab === 0 && renderCensusTab()}
              {tab === 1 && renderTelemetryTab()}
              {tab === 2 && renderNeuroTab()}
              {tab === 3 && renderQualityTab()}
            </>
          )}
        </Card>
      </Box>

      {/* Admission Dialog */}
      <Dialog open={admissionOpen} onClose={() => setAdmissionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Request ICU Admission</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField
              select
              label="Select Patient"
              fullWidth
              value={admissionForm.patientId}
              onChange={e => setAdmissionForm(o => ({ ...o, patientId: e.target.value }))}
            >
              {admissions.map(a => (
                <MenuItem key={a.patientId} value={a.patientId}>
                  {a.patient.firstName} {a.patient.lastName} ({a.patient.patientNumber})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Diagnosis"
              multiline
              rows={2}
              fullWidth
              value={admissionForm.diagnosis}
              onChange={e => setAdmissionForm(o => ({ ...o, diagnosis: e.target.value }))}
            />

            <TextField
              label="Severity Score Indication (APACHE index)"
              type="number"
              fullWidth
              value={admissionForm.severityScore}
              onChange={e => setAdmissionForm(o => ({ ...o, severityScore: Number(e.target.value) }))}
            />

            <TextField
              label="Indication for ICU Admission"
              fullWidth
              value={admissionForm.indication}
              onChange={e => setAdmissionForm(o => ({ ...o, indication: e.target.value }))}
            />

            <TextField
              select
              label="Admission Urgency Level"
              fullWidth
              value={admissionForm.urgency}
              onChange={e => setAdmissionForm(o => ({ ...o, urgency: e.target.value }))}
            >
              <MenuItem value="EMERGENCY">Emergency</MenuItem>
              <MenuItem value="URGENT">Urgent</MenuItem>
              <MenuItem value="POST_OPERATIVE">Post-Operative</MenuItem>
              <MenuItem value="MEDICAL">Medical</MenuItem>
              <MenuItem value="SURGICAL">Surgical</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdmissionOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdmissionRequest}>Request Admission</Button>
        </DialogActions>
      </Dialog>

      {/* Bed Dialog */}
      <Dialog open={bedOpen} onClose={() => setBedOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Register Critical Bed</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Bed Code (Asset Tag)"
              fullWidth
              value={bedForm.bedCode}
              onChange={e => setBedForm(o => ({ ...o, bedCode: e.target.value }))}
            />

            <TextField
              select
              label="Unit Location"
              fullWidth
              value={bedForm.unit}
              onChange={e => setBedForm(o => ({ ...o, unit: e.target.value }))}
            >
              <MenuItem value="ICU">Intensive Care Unit (ICU)</MenuItem>
              <MenuItem value="HDU">High Dependency Unit (HDU)</MenuItem>
            </TextField>

            <TextField
              label="Infection Isolation Rules"
              fullWidth
              value={bedForm.isolationRules}
              onChange={e => setBedForm(o => ({ ...o, isolationRules: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBedOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateBed}>Register Bed</Button>
        </DialogActions>
      </Dialog>

      {/* Observations Dialog */}
      <Dialog open={obsOpen} onClose={() => setObsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Log Telemetry physiological Observations</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="Heart Rate"
                  type="number"
                  fullWidth
                  value={obsForm.heartRate}
                  onChange={e => setObsForm(o => ({ ...o, heartRate: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="BP Systolic"
                  type="number"
                  fullWidth
                  value={obsForm.bpSystolic}
                  onChange={e => setObsForm(o => ({ ...o, bpSystolic: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="BP Diastolic"
                  type="number"
                  fullWidth
                  value={obsForm.bpDiastolic}
                  onChange={e => setObsForm(o => ({ ...o, bpDiastolic: Number(e.target.value) }))}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="Respiration Rate"
                  type="number"
                  fullWidth
                  value={obsForm.respirationRate}
                  onChange={e => setObsForm(o => ({ ...o, respirationRate: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="SpO2 (%)"
                  type="number"
                  fullWidth
                  value={obsForm.spo2}
                  onChange={e => setObsForm(o => ({ ...o, spo2: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Temperature (°C)"
                  type="number"
                  fullWidth
                  value={obsForm.temperature}
                  onChange={e => setObsForm(o => ({ ...o, temperature: Number(e.target.value) }))}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="CVP (mmHg)"
                  type="number"
                  fullWidth
                  value={obsForm.centralVenousPressure}
                  onChange={e => setObsForm(o => ({ ...o, centralVenousPressure: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Intracranial (mmHg)"
                  type="number"
                  fullWidth
                  value={obsForm.intracranialPressure}
                  onChange={e => setObsForm(o => ({ ...o, intracranialPressure: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Cardiac Output"
                  type="number"
                  fullWidth
                  value={obsForm.cardiacOutput}
                  onChange={e => setObsForm(o => ({ ...o, cardiacOutput: Number(e.target.value) }))}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setObsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveObservations}>Save Observations</Button>
        </DialogActions>
      </Dialog>

      {/* Ventilator Dialog */}
      <Dialog open={ventOpen} onClose={() => setVentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Mechanical Ventilator parameters</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Ventilation Mode"
                  fullWidth
                  value={ventForm.mode}
                  onChange={e => setVentForm(o => ({ ...o, mode: e.target.value }))}
                >
                  <MenuItem value="AC">Assist-Control (AC)</MenuItem>
                  <MenuItem value="SIMV">SIMV</MenuItem>
                  <MenuItem value="CPAP">CPAP</MenuItem>
                  <MenuItem value="BIPAP">BiPAP</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Tidal Volume (mL)"
                  type="number"
                  fullWidth
                  value={ventForm.tidalVolumeML}
                  onChange={e => setVentForm(o => ({ ...o, tidalVolumeML: Number(e.target.value) }))}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="FiO2 (%)"
                  type="number"
                  fullWidth
                  value={ventForm.fio2Percentage}
                  onChange={e => setVentForm(o => ({ ...o, fio2Percentage: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="PEEP (cmH2O)"
                  type="number"
                  fullWidth
                  value={ventForm.peepH2O}
                  onChange={e => setVentForm(o => ({ ...o, peepH2O: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Resp Rate Setting"
                  type="number"
                  fullWidth
                  value={ventForm.respirationRate}
                  onChange={e => setVentForm(o => ({ ...o, respirationRate: Number(e.target.value) }))}
                />
              </Grid>
            </Grid>

            <TextField
              label="Weaning Plan/Assessment Comments"
              multiline
              rows={2}
              fullWidth
              value={ventForm.extubationReadiness}
              onChange={e => setVentForm(o => ({ ...o, extubationReadiness: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVentOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveVentilator}>Save Ventilator Parameters</Button>
        </DialogActions>
      </Dialog>

      {/* Infusion Dialog */}
      <Dialog open={infusionOpen} onClose={() => setInfusionOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>eMAR Medication Infusion pump Titration</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Medication Name"
              fullWidth
              value={infusionForm.medicationName}
              onChange={e => setInfusionForm(o => ({ ...o, medicationName: e.target.value }))}
            />

            <TextField
              label="Concentration"
              fullWidth
              value={infusionForm.concentration}
              onChange={e => setInfusionForm(o => ({ ...o, concentration: e.target.value }))}
            />

            <TextField
              label="Infusion Dose Rate"
              fullWidth
              value={infusionForm.doseRate}
              onChange={e => setInfusionForm(o => ({ ...o, doseRate: e.target.value }))}
            />

            <FormControlLabel
              control={<Switch checked={infusionForm.isHighAlert} onChange={e => setInfusionForm(o => ({ ...o, isHighAlert: e.target.checked }))} />}
              label="High-Alert medication line"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfusionOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveInfusion}>Save Infusion Titration</Button>
        </DialogActions>
      </Dialog>

      {/* Dialysis Dialog */}
      <Dialog open={dialysisOpen} onClose={() => setDialysisOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Renal replacement dialysis / CRRT</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField
              select
              label="Dialysis Modality"
              fullWidth
              value={dialysisForm.dialysisType}
              onChange={e => setDialysisForm(o => ({ ...o, dialysisType: e.target.value }))}
            >
              <MenuItem value="CRRT">Continuous Renal Replacement Therapy (CRRT)</MenuItem>
              <MenuItem value="HAEMODIALYSIS">Intermittent Haemodialysis</MenuItem>
            </TextField>

            <TextField
              label="Ultrafiltration Rate (mL/Hour)"
              type="number"
              fullWidth
              value={dialysisForm.ultrafiltrationRateMLHr}
              onChange={e => setDialysisForm(o => ({ ...o, ultrafiltrationRateMLHr: Number(e.target.value) }))}
            />

            <TextField
              label="Heparin Dosage (Units)"
              type="number"
              fullWidth
              value={dialysisForm.heparinDoseUnits}
              onChange={e => setDialysisForm(o => ({ ...o, heparinDoseUnits: Number(e.target.value) }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialysisOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveDialysis}>Save Dialysis Run</Button>
        </DialogActions>
      </Dialog>

      {/* Neuro Dialog */}
      <Dialog open={neuroOpen} onClose={() => setNeuroOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>GCS Neurological Assessment</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <Typography variant="body2">GCS Eye response (1-4):</Typography>
            <Slider
              value={neuroForm.gcsEye}
              min={1} max={4} step={1} marks
              onChange={(_, v) => setNeuroForm(o => ({ ...o, gcsEye: v as number }))}
            />
            
            <Typography variant="body2">GCS Verbal response (1-5):</Typography>
            <Slider
              value={neuroForm.gcsVerbal}
              min={1} max={5} step={1} marks
              onChange={(_, v) => setNeuroForm(o => ({ ...o, gcsVerbal: v as number }))}
            />

            <Typography variant="body2">GCS Motor response (1-6):</Typography>
            <Slider
              value={neuroForm.gcsMotor}
              min={1} max={6} step={1} marks
              onChange={(_, v) => setNeuroForm(o => ({ ...o, gcsMotor: v as number }))}
            />

            <TextField
              select
              label="Pupils Reactivity"
              fullWidth
              value={neuroForm.pupilReactivity}
              onChange={e => setNeuroForm(o => ({ ...o, pupilReactivity: e.target.value }))}
            >
              <MenuItem value="NORMAL">Normal response</MenuItem>
              <MenuItem value="SLUGGISH">Sluggish response</MenuItem>
              <MenuItem value="FIXED">Fixed pupils</MenuItem>
            </TextField>

            <TextField
              label="Limb movement Grading"
              fullWidth
              value={neuroForm.limbMovementGrading}
              onChange={e => setNeuroForm(o => ({ ...o, limbMovementGrading: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNeuroOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveNeuro}>Save Neuro Check</Button>
        </DialogActions>
      </Dialog>

      {/* Alert Dialog */}
      <Dialog open={alertOpen} onClose={() => setAlertOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>NEWS Warning score triggers</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField
              label="NEWS Alert Score"
              type="number"
              fullWidth
              value={alertForm.newsScore}
              onChange={e => setAlertForm(o => ({ ...o, newsScore: Number(e.target.value) }))}
            />

            <TextField
              label="Abnormal physiological indicators"
              fullWidth
              value={alertForm.abnormalTriggers}
              onChange={e => setAlertForm(o => ({ ...o, abnormalTriggers: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAlert}>Trigger Warning Alert</Button>
        </DialogActions>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog open={goalOpen} onClose={() => setGoalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Add daily Care plan goal</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Goal description"
              fullWidth
              value={goalForm.description}
              onChange={e => setGoalForm(o => ({ ...o, description: e.target.value }))}
            />

            <TextField
              select
              label="Multidisciplinary discipline"
              fullWidth
              value={goalForm.discipline}
              onChange={e => setGoalForm(o => ({ ...o, discipline: e.target.value }))}
            >
              <MenuItem value="NURSING">Nursing care</MenuItem>
              <MenuItem value="PHYSIO">Physiotherapy rehabilitation</MenuItem>
              <MenuItem value="RESPIRATORY">Respiratory support</MenuItem>
              <MenuItem value="PHARMACY">Clinical pharmacy review</MenuItem>
              <MenuItem value="NUTRITION">Nutritionist diet plans</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveGoal}>Add Goal</Button>
        </DialogActions>
      </Dialog>

      {/* Infection Dialog */}
      <Dialog open={infectionOpen} onClose={() => setInfectionOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Daily Infection prevention checks (VAP, CLABSI)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <FormControlLabel
              control={<Switch checked={infectionForm.vapCompliance} onChange={e => setInfectionForm(o => ({ ...o, vapCompliance: e.target.checked }))} />}
              label="Ventilator-associated pneumonia prevention bundle complete"
            />
            <FormControlLabel
              control={<Switch checked={infectionForm.clabsiCompliance} onChange={e => setInfectionForm(o => ({ ...o, clabsiCompliance: e.target.checked }))} />}
              label="Central line blood infection bundle complete"
            />
            <FormControlLabel
              control={<Switch checked={infectionForm.cautiCompliance} onChange={e => setInfectionForm(o => ({ ...o, cautiCompliance: e.target.checked }))} />}
              label="Catheter UTI prevention bundle complete"
            />
            <FormControlLabel
              control={<Switch checked={infectionForm.handHygieneCompliance} onChange={e => setInfectionForm(o => ({ ...o, handHygieneCompliance: e.target.checked }))} />}
              label="Surgical hand hygiene compliant"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfectionOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveInfection}>Save Checklist</Button>
        </DialogActions>
      </Dialog>

      {/* Handover Dialog */}
      <Dialog open={handoverOpen} onClose={() => setHandoverOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Ward Transfer clinical handover</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Target receiving ward"
              fullWidth
              value={handoverForm.targetWard}
              onChange={e => setHandoverForm(o => ({ ...o, targetWard: e.target.value }))}
            />

            <TextField
              label="Current Diagnosis findings"
              multiline
              rows={2}
              fullWidth
              value={handoverForm.currentDiagnosis}
              onChange={e => setHandoverForm(o => ({ ...o, currentDiagnosis: e.target.value }))}
            />

            <TextField
              label="Active Medications list"
              multiline
              rows={2}
              fullWidth
              value={handoverForm.medicationsActive}
              onChange={e => setHandoverForm(o => ({ ...o, medicationsActive: e.target.value }))}
            />

            <TextField
              label="Outstanding care plan requirements"
              multiline
              rows={2}
              fullWidth
              value={handoverForm.outstandingCare}
              onChange={e => setHandoverForm(o => ({ ...o, outstandingCare: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHandoverOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveHandover}>Save Handover (Release bed)</Button>
        </DialogActions>
      </Dialog>

      {/* Incident Dialog */}
      <Dialog open={incidentOpen} onClose={() => setIncidentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Report Patient Safety Event</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField
              select
              label="Incident type"
              fullWidth
              value={incidentForm.incidentType}
              onChange={e => setIncidentForm(o => ({ ...o, incidentType: e.target.value }))}
            >
              <MenuItem value="PATIENT_FALL">Patient Bed Fall</MenuItem>
              <MenuItem value="MEDICATION_ERROR">Medication dosing administration error</MenuItem>
              <MenuItem value="PRESSURE_INJURY_STAGE_1">Pressure Injury stage 1</MenuItem>
              <MenuItem value="PRESSURE_INJURY_STAGE_2">Pressure Injury stage 2</MenuItem>
              <MenuItem value="DEVICE_MALFUNCTION">Ventilator/Infusion pump hardware failure</MenuItem>
            </TextField>

            <TextField
              select
              label="Severity Grading Level"
              fullWidth
              value={incidentForm.severityGrading}
              onChange={e => setIncidentForm(o => ({ ...o, severityGrading: e.target.value }))}
            >
              <MenuItem value="LOW">Low risk</MenuItem>
              <MenuItem value="MODERATE">Moderate risk</MenuItem>
              <MenuItem value="HIGH">High risk</MenuItem>
              <MenuItem value="SENTINEL">Sentinel Event (Requires instant review)</MenuItem>
            </TextField>

            <TextField
              label="RCA Findings investigation description"
              multiline
              rows={2}
              fullWidth
              value={incidentForm.rcaFindings}
              onChange={e => setIncidentForm(o => ({ ...o, rcaFindings: e.target.value }))}
            />

            <TextField
              label="CAPA Corrective actions details"
              multiline
              rows={2}
              fullWidth
              value={incidentForm.capaDetails}
              onChange={e => setIncidentForm(o => ({ ...o, capaDetails: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIncidentOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveIncident}>Save Incident Report</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
