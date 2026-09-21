import { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, InputAdornment, Avatar, Tabs, Tab, CircularProgress,
  Stack, Divider, Paper, Alert, Tooltip, Switch, FormControlLabel,
  Slider
} from '@mui/material';
import {
  Add, Search, Edit, Visibility, CalendarMonth, Settings, Warning,
  BarChart, Bloodtype, Description, TouchApp, MedicalServices,
  LocalHospital, ReportProblem, Shield, History, AccessTime, Thermostat,
  DoneAll
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

// API root
const API = `${API_BASE_URL}/bloodbank`;

interface BloodDonor {
  id: string; donorNumber: string; firstName: string; lastName: string;
  birthDate: string; gender: string; bloodGroup: string; rhStatus: string;
  donorCategory: string; consentSigned: boolean; deferralStatus: string;
  deferralReason?: string; deferralExpiry?: string; lastDonationDate?: string;
  patientId?: string;
  donations: any[];
}

interface BloodDonation {
  id: string; donationUnitNo: string; donorId: string;
  donor: BloodDonor; collectionDate: string; collectionSite: string;
  phlebotomistId: string; anticoagulantType: string; volumeML: number;
  adverseReaction?: string; status: string;
  testResults: any[]; components: any[];
}

interface BloodComponent {
  id: string; donationId: string; donation: BloodDonation;
  componentCode: string; componentType: string; volumeML: number;
  expiryDate: string; storageLocation: string; status: string;
  reservedForId?: string;
}

interface TransfusionRequest {
  id: string; requestNumber: string; patientId: string;
  patient: { firstName: string; lastName: string; patientNumber: string };
  requesterId: string; requester: { firstName: string; lastName: string };
  urgency: string; componentType: string; quantityUnits: number;
  clinicalIndication: string; intendedDate: string; status: string;
  crossmatches: any[];
}

const BLOOD_GROUPS = ['A', 'B', 'AB', 'O'];
const RH_STATUSES = ['POSITIVE', 'NEGATIVE'];
const COMPONENT_TYPES = ['PRBC', 'FFP', 'PLATELETS', 'CRYOPRECIPITATE', 'WHOLE_BLOOD'];

const GROUP_COLORS: Record<string, string> = {
  'A': '#f03e3e', 'B': '#228be6', 'AB': '#7048e8', 'O': '#37b24d'
};

const STATUS_COLORS: Record<string, string> = {
  // Donation Statuses
  'COLLECTED': '#f59f00', 'SCREENED': '#10b981', 'COMPONENT_PROCESSED': '#ae3ec9',
  'QUARANTINED': '#f59f00', 'DISCARDED': '#e03131',
  // Component Inventory Statuses
  'AVAILABLE': '#2f9e44', 'RESERVED': '#1c7ed6', 'TRANSFUSED': '#868e96', 'EXPIRED': '#e03131'
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

export default function BloodBank() {
  const theme = useTheme();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/blood-bank/stocks') setTab(1);
    else if (path === '/blood-bank/crossmatch') setTab(2);
    else if (path === '/blood-bank/requests') setTab(3);
    else setTab(0);
  }, [location.pathname]);

  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/blood-bank/stocks') {
      return {
        title: 'Blood Component Inventory & Stock Management',
        subtitle: 'PRBC · FFP · Platelets · Cryoprecipitate · Whole Blood Shelf-Life Tracking',
        category: 'Blood Bank & Transfusion',
        kpis: [
          { label: 'Total Units Stocked', value: `${inventory.length || 0} Units`, subtitle: 'Available Stock', icon: <Bloodtype />, color: '#f03e3e' },
          { label: 'Quarantined Units', value: `${inventory.filter(i => i.status === 'QUARANTINED').length || 0} Pending`, subtitle: 'Screening Audit', icon: <Thermostat />, color: '#f59f00' },
          { label: 'Available PRBC Doses', value: `${inventory.filter(i => i.componentType === 'PRBC').length || 0} Units`, subtitle: 'Red Cell Doses', icon: <Bloodtype />, color: '#10b981' },
          { label: 'Expiring Doses (7d)', value: '0 Expiring', subtitle: 'Shelf Life Alert', icon: <Thermostat />, color: '#ae3ec9' },
        ],
      };
    }

    if (path === '/blood-bank/crossmatch') {
      return {
        title: 'ABO/Rh Compatibility, Crossmatching & Transfusion Safety Desk',
        subtitle: 'Major/Minor Crossmatch · Bedside Verification · Haemovigilance Safety Logs',
        category: 'Blood Bank & Transfusion',
        kpis: [
          { label: 'Crossmatches Done', value: '14 Tests', subtitle: 'Today Shift', icon: <TouchApp />, color: '#7048e8' },
          { label: 'Compatible Matches', value: '100% Verified', subtitle: 'Zero Mismatch', icon: <Bloodtype />, color: '#10b981' },
          { label: 'Pending Safety Checks', value: '2 Waiting', subtitle: 'Bedside Release', icon: <Thermostat />, color: '#f59f00' },
          { label: 'Reaction Incidents', value: '0 Reported', subtitle: 'Safety Compliance', icon: <Description />, color: '#e03131' },
        ],
      };
    }

    if (path === '/blood-bank/requests') {
      return {
        title: 'Clinical Transfusion Requests & Cold Chain Vault Logs',
        subtitle: 'Stat Order Ingestion · Blood Unit Dispatch · Vault Temperature Tracking',
        category: 'Blood Bank & Transfusion',
        kpis: [
          { label: 'Transfusion Orders', value: `${txRequests.length || 0} Orders`, subtitle: 'Clinical Ingestion', icon: <Description />, color: '#228be6' },
          { label: 'Stat Priority Orders', value: `${txRequests.filter(r => r.urgency === 'STAT').length || 0} Emergency`, subtitle: 'Immediate Release', icon: <Thermostat />, color: '#f03e3e' },
          { label: 'Cold Chain Vaults', value: `${equipments.length || 0} Active`, subtitle: 'Calibrated Freezers', icon: <Thermostat />, color: '#10b981' },
          { label: 'Avg Dispatch Time', value: '18 Minutes', subtitle: 'Order to Bedside', icon: <TouchApp />, color: '#7048e8' },
        ],
      };
    }

    // Default: Donors
    return {
      title: 'Blood Donor Registration & Screening Registry',
      subtitle: 'Voluntary & Replacement Donors · Hemoglobin Testing · Serology Screenings',
      category: 'Blood Bank & Transfusion',
      kpis: [
        { label: 'Registered Donors', value: `${donors.length || 0} Donors`, subtitle: 'Active Registry', icon: <Description />, color: '#f03e3e' },
        { label: 'Donations Collected', value: `${donations.length || 0} Bags`, subtitle: 'Blood Units', icon: <Bloodtype />, color: '#10b981' },
        { label: 'Voluntary Donors', value: '85%', subtitle: 'Community Drive', icon: <TouchApp />, color: '#228be6' },
        { label: 'Deferral Rate', value: '3.2%', subtitle: 'Screening Deferrals', icon: <Thermostat />, color: '#f59f00' },
      ],
    };
  };

  // Lists
  const [donors, setDonors] = useState<BloodDonor[]>([]);
  const [donations, setDonations] = useState<BloodDonation[]>([]);
  const [inventory, setInventory] = useState<BloodComponent[]>([]);
  const [txRequests, setTxRequests] = useState<TransfusionRequest[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);

  // Search & Filter
  const [search, setSearch] = useState('');

  // Dialog Controls
  const [newDonorOpen, setNewDonorOpen] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [screenOpen, setScreenOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [crossmatchOpen, setCrossmatchOpen] = useState(false);
  const [bedsideOpen, setBedsideOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);

  // Selected entities
  const [selectedDonor, setSelectedDonor] = useState<BloodDonor | null>(null);
  const [selectedDonation, setSelectedDonation] = useState<BloodDonation | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<TransfusionRequest | null>(null);
  const [selectedTxRecordId, setSelectedTxRecordId] = useState<string>('');

  // Form States
  const [donorForm, setDonorForm] = useState({
    firstName: '', lastName: '', birthDate: '', gender: 'FEMALE',
    bloodGroup: 'O', rhStatus: 'POSITIVE', donorCategory: 'VOLUNTARY',
    consentSigned: false, weightKg: 65, hemoglobinGdL: 13.5, systolicBp: 120, diastolicBp: 80
  });

  const [collectForm, setCollectForm] = useState({
    collectionSite: 'MAIN_BANK', anticoagulantType: 'CPD', volumeML: 450, adverseReaction: ''
  });

  const [screenForm, setScreenForm] = useState({
    testType: 'HIV', outcome: 'NON_REACTIVE', details: 'Automated EIA assay negative'
  });

  const [splitForm, setSplitForm] = useState({
    componentType: 'PRBC', volumeML: 250, expiryDays: 35, storageLocation: 'Fridge-A'
  });

  const [requestForm, setRequestForm] = useState({
    patientId: '', urgency: 'ROUTINE', componentType: 'PRBC', quantityUnits: 1,
    clinicalIndication: '', intendedDate: new Date().toISOString().slice(0, 16)
  });

  const [crossmatchForm, setCrossmatchForm] = useState({
    componentId: '', method: 'GEL_COLUMN', result: 'COMPATIBLE'
  });

  const [bedsideForm, setBedsideForm] = useState({
    wristbandScanned: false, bagLabelScanned: false, doubleCheckedBy: '',
    vitalsBaseline: 'BP: 120/80, Pulse: 78, Temp: 36.8C'
  });

  const [reactionForm, setReactionForm] = useState({
    vitalsCompletion: 'BP: 118/75, Pulse: 80, Temp: 37.1C',
    status: 'COMPLETED', suspectedReaction: false,
    reactionSeverity: 'LOW', reactionDetails: ''
  });

  const [tempLogForm, setTempLogForm] = useState<Record<string, number>>({});

  // Headers
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: token ? `Bearer ${token}` : '' };
  };

  // Fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [donorsRes, donationsRes, invRes, reqRes, equipRes] = await Promise.all([
        axios.get(`${API}/donors`, { headers: getHeaders() }),
        axios.get(`${API}/donations`, { headers: getHeaders() }),
        axios.get(`${API}/inventory`, { headers: getHeaders() }),
        axios.get(`${API}/transfusions/requests`, { headers: getHeaders() }),
        axios.get(`${API}/equipment`, { headers: getHeaders() })
      ]);
      setDonors(donorsRes.data);
      setDonations(donationsRes.data);
      setInventory(invRes.data);
      setTxRequests(reqRes.data);
      setEquipments(equipRes.data);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to fetch blood bank registry data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Actions
  const handleRegisterDonor = async () => {
    if (!donorForm.firstName || !donorForm.lastName || !donorForm.birthDate) {
      enqueueSnackbar('Demographics info are mandatory', { variant: 'warning' });
      return;
    }
    // Enforce Weight & Hemoglobin eligibility guidelines (weight >= 50kg, Hb >= 12.5 g/dL)
    if (donorForm.weightKg < 50) {
      enqueueSnackbar('Donor Weight deferral: weight must be >= 50kg to donate.', { variant: 'error' });
      return;
    }
    if (donorForm.hemoglobinGdL < 12.5) {
      enqueueSnackbar('Donor Hemoglobin deferral: Hb level must be >= 12.5 g/dL.', { variant: 'error' });
      return;
    }

    try {
      const { data } = await axios.post(`${API}/donors`, donorForm, { headers: getHeaders() });
      enqueueSnackbar(`Donor ${data.donorNumber} registered successfully`, { variant: 'success' });
      
      // Auto consent capture
      if (!donorForm.consentSigned) {
        enqueueSnackbar('Warning: Informed consent is required before drawing blood.', { variant: 'warning' });
      }

      setNewDonorOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Donor registration failed', { variant: 'error' });
    }
  };

  const handleStartDonation = async () => {
    if (!selectedDonor) return;
    try {
      const staffList = await axios.get(`${API_BASE_URL}/nursing/staff`, { headers: getHeaders() });
      const phleb = staffList.data[0];
      if (!phleb) {
        enqueueSnackbar('No phlebotomist staff registered', { variant: 'warning' });
        return;
      }

      await axios.post(`${API}/donations`, {
        donorId: selectedDonor.id,
        phlebotomistId: phleb.id,
        ...collectForm
      }, { headers: getHeaders() });

      enqueueSnackbar('Blood collection logged. Bag labeled with ISBT-128 code.', { variant: 'success' });
      setCollectOpen(false);
      fetchData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Blood collection log failed', { variant: 'error' });
    }
  };

  const handleProcessComponent = async () => {
    if (!selectedDonation) return;
    try {
      const staffList = await axios.get(`${API_BASE_URL}/nursing/staff`, { headers: getHeaders() });
      const operator = staffList.data[0];
      if (!operator) return;

      const expiry = new Date();
      expiry.setDate(expiry.getDate() + splitForm.expiryDays);

      await axios.post(`${API}/donations/${selectedDonation.id}/components`, {
        componentType: splitForm.componentType,
        volumeML: splitForm.volumeML,
        expiryDate: expiry.toISOString(),
        storageLocation: splitForm.storageLocation,
        processedById: operator.id
      }, { headers: getHeaders() });

      enqueueSnackbar('Centrifuge split processed successfully', { variant: 'success' });
      setSplitOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Component processing failed', { variant: 'error' });
    }
  };

  const handleScreenDonation = async () => {
    if (!selectedDonation) return;
    try {
      const { data } = await axios.post(`${API}/donations/${selectedDonation.id}/screening`, screenForm, { headers: getHeaders() });
      if (data.outcome === 'REACTIVE') {
        enqueueSnackbar('ALERT: Reactive screening test. Unit automatically quarantined for discard!', { variant: 'error' });
      } else {
        enqueueSnackbar(`Screening result recorded: ${screenForm.testType} is negative`, { variant: 'success' });
      }
      setScreenOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Screening entry failed', { variant: 'error' });
    }
  };

  const handleCreateRequest = async () => {
    try {
      const staffList = await axios.get(`${API_BASE_URL}/nursing/staff`, { headers: getHeaders() });
      const requester = staffList.data[0];
      if (!requester) return;

      // Select first active patient ID
      const patientId = donors.find(d => d.patientId)?.patientId || donors[0]?.id; // fallback

      await axios.post(`${API}/transfusions/requests`, {
        patientId,
        requesterId: requester.id,
        urgency: requestForm.urgency,
        componentType: requestForm.componentType,
        quantityUnits: requestForm.quantityUnits,
        clinicalIndication: requestForm.clinicalIndication,
        intendedDate: requestForm.intendedDate
      }, { headers: getHeaders() });

      enqueueSnackbar('Transfusion electronic request routed to blood bank', { variant: 'success' });
      setRequestOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Transfusion order failed', { variant: 'error' });
    }
  };

  const handlePerformCrossmatch = async () => {
    if (!selectedRequest) return;
    try {
      const staffList = await axios.get(`${API_BASE_URL}/nursing/staff`, { headers: getHeaders() });
      const scientist = staffList.data[0];
      if (!scientist) return;

      const comp = inventory.find(c => c.id === crossmatchForm.componentId);
      if (comp && comp.donation.donor.bloodGroup !== 'O' && comp.donation.donor.bloodGroup !== 'A' && crossmatchForm.result === 'COMPATIBLE') {
        enqueueSnackbar('Safety Alert: Incompatible typing identified. Please verify compatibility before proceeding.', { variant: 'warning' });
      }

      await axios.post(`${API}/transfusions/crossmatch`, {
        requestId: selectedRequest.id,
        componentId: crossmatchForm.componentId,
        method: crossmatchForm.method,
        result: crossmatchForm.result,
        scientistId: scientist.id
      }, { headers: getHeaders() });

      enqueueSnackbar(crossmatchForm.result === 'COMPATIBLE' ? 'Crossmatch COMPATIBLE. Unit reserved for patient.' : 'Incompatible result logged.', { variant: 'info' });
      setCrossmatchOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Crossmatch logging failed', { variant: 'error' });
    }
  };

  const handleStartTransfusion = async () => {
    if (!selectedRequest) return;
    const matchedComp = selectedRequest.crossmatches[0]?.component;
    if (!matchedComp) return;

    if (!bedsideForm.wristbandScanned || !bedsideForm.bagLabelScanned) {
      enqueueSnackbar('Safety Block: Bedside scans of patient wristband and blood bag barcode are mandatory.', { variant: 'error' });
      return;
    }

    try {
      const staffList = await axios.get(`${API_BASE_URL}/nursing/staff`, { headers: getHeaders() });
      const nurse = staffList.data[0];
      if (!nurse) return;

      const { data } = await axios.post(`${API}/transfusions/start`, {
        requestId: selectedRequest.id,
        componentId: matchedComp.id,
        patientId: selectedRequest.patientId || selectedRequest.id,
        administeredById: nurse.id,
        wristbandScanned: bedsideForm.wristbandScanned,
        bagLabelScanned: bedsideForm.bagLabelScanned,
        doubleCheckedBy: bedsideForm.doubleCheckedBy || 'Charge Nurse Obi',
        vitalsBaseline: bedsideForm.vitalsBaseline
      }, { headers: getHeaders() });

      setSelectedTxRecordId(data.id);
      enqueueSnackbar('Bedside check passed. Transfusion administration initiated.', { variant: 'success' });
      setBedsideOpen(false);
      fetchData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Transfusion launch failed', { variant: 'error' });
    }
  };

  const handleUpdateTransfusion = async () => {
    if (!selectedTxRecordId) return;
    try {
      await axios.put(`${API}/transfusions/${selectedTxRecordId}/complete`, reactionForm, { headers: getHeaders() });
      enqueueSnackbar(reactionForm.status === 'COMPLETED' ? 'Transfusion completed successfully' : 'Transfusion stopped. Incident routed to safety board.', { variant: 'info' });
      setReactionOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Update failed', { variant: 'error' });
    }
  };

  const handleLogTemperature = async (equipCode: string) => {
    const val = tempLogForm[equipCode];
    if (val === undefined) return;
    try {
      const { data } = await axios.post(`${API}/equipment/temperature`, {
        equipmentCode: equipCode,
        currentTemp: val
      }, { headers: getHeaders() });

      if (data.status === 'TEMPERATURE_ALARM') {
        enqueueSnackbar(`ALARM: Temperature excursion detected in ${equipCode} (${val}°C)!`, { variant: 'error' });
      } else {
        enqueueSnackbar(`Temperature logged for ${equipCode} (${val}°C)`, { variant: 'success' });
      }
      fetchData();
    } catch {
      enqueueSnackbar('Log failed', { variant: 'error' });
    }
  };

  // UI rendering tabs
  const renderDonorsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search by Donor Name, ID..."
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          sx={{ mr: 'auto', width: 320 }}
        />
        <Button variant="contained" startIcon={<Add />} onClick={() => setNewDonorOpen(true)}>Register Blood Donor</Button>
      </Box>

      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Donor Number</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>FullName</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Group / Rh</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Eligibility</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Consent</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {donors.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">No blood donors registered.</TableCell></TableRow>
            ) : donors.map(donor => (
              <TableRow key={donor.id} hover>
                <TableCell><Typography variant="body2" fontWeight={800} color="primary.main">{donor.donorNumber}</Typography></TableCell>
                <TableCell><Typography variant="body2" fontWeight={700}>{donor.firstName} {donor.lastName}</Typography></TableCell>
                <TableCell>
                  <Chip label={`${donor.bloodGroup} ${donor.rhStatus === 'POSITIVE' ? '+' : '-'}`} size="small" sx={{
                    bgcolor: alpha(GROUP_COLORS[donor.bloodGroup] || '#868e96', 0.1),
                    color: GROUP_COLORS[donor.bloodGroup] || '#868e96', fontWeight: 800, fontSize: '0.65rem'
                  }} />
                </TableCell>
                <TableCell><Chip label={donor.donorCategory} size="small" sx={{ fontSize: '0.65rem' }} /></TableCell>
                <TableCell>
                  <Chip label={donor.deferralStatus} size="small" color={donor.deferralStatus === 'ELIGIBLE' ? 'success' : 'error'} sx={{ fontSize: '0.65rem', fontWeight: 700 }} />
                </TableCell>
                <TableCell>
                  <Chip label={donor.consentSigned ? 'Consent Active' : 'No Consent'} size="small" color={donor.consentSigned ? 'success' : 'warning'} sx={{ fontSize: '0.65rem' }} />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {donor.deferralStatus === 'ELIGIBLE' && (
                      <Button size="small" variant="outlined" color="primary" onClick={() => { setSelectedDonor(donor); setCollectOpen(true); }}>
                        Draw Blood
                      </Button>
                    )}
                    <Button size="small" variant="text" color="error" onClick={async () => {
                      const reason = prompt('Enter Deferral Reason (Configurable exclusion):');
                      if (reason) {
                        await axios.put(`${API}/donors/${donor.id}/eligibility`, {
                          deferralStatus: 'DEFERRED',
                          deferralReason: reason,
                          deferralExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
                        }, { headers: getHeaders() });
                        enqueueSnackbar('Donor deferred successfully', { variant: 'info' });
                        fetchData();
                      }
                    }}>
                      Defer Donor
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderComponentTab = () => (
    <Box>
      <Typography variant="subtitle2" fontWeight="bold" mb={2}>Centrifuge Splits & Infectious Disease Screening Worklist</Typography>
      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Donation bag ID (ISBT)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Donor Group</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Site / Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Volume</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Screenings Result</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {donations.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">No blood bags in worklist.</TableCell></TableRow>
            ) : donations.map(d => (
              <TableRow key={d.id} hover>
                <TableCell><Typography variant="body2" fontWeight={800} color="secondary.main">{d.donationUnitNo}</Typography></TableCell>
                <TableCell><Typography variant="body2">{d.donor.firstName} {d.donor.lastName} ({d.donor.bloodGroup})</Typography></TableCell>
                <TableCell><Typography variant="caption">{d.collectionSite} · {new Date(d.collectionDate).toLocaleDateString()}</Typography></TableCell>
                <TableCell><Typography variant="body2">{d.volumeML} mL</Typography></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {d.testResults.map((t: any) => (
                      <Chip key={t.id} label={`${t.testType}: ${t.outcome}`} size="small" color={t.outcome === 'NON_REACTIVE' ? 'success' : 'error'} sx={{ fontSize: '0.55rem' }} />
                    ))}
                    {d.testResults.length === 0 && <Typography variant="caption" color="text.secondary">Pending tests</Typography>}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip label={d.status} size="small" sx={{
                    fontWeight: 700, fontSize: '0.65rem',
                    bgcolor: alpha(STATUS_COLORS[d.status] || '#868e96', 0.1),
                    color: STATUS_COLORS[d.status] || '#868e96'
                  }} />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Button size="small" variant="outlined" color="primary" onClick={() => { setSelectedDonation(d); setScreenOpen(true); }}>
                      Screen Disease
                    </Button>
                    <Button size="small" variant="outlined" color="secondary" onClick={() => { setSelectedDonation(d); setSplitOpen(true); }}>
                      Centrifuge Split
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle2" fontWeight="bold" mb={2}>📦 Available Inventory (FEFO Enforced)</Typography>
      <Grid container spacing={2}>
        {inventory.filter(c => c.status === 'AVAILABLE').map(comp => (
          <Grid item xs={12} sm={6} md={4} key={comp.id}>
            <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={800} color="primary.main">{comp.componentCode}</Typography>
                    <Typography variant="subtitle2" fontWeight={900}>{comp.componentType}</Typography>
                  </Box>
                  <Chip label={`${comp.donation.donor.bloodGroup} ${comp.donation.donor.rhStatus === 'POSITIVE' ? '+' : '-'}`} size="small" sx={{
                    bgcolor: GROUP_COLORS[comp.donation.donor.bloodGroup], color: '#fff', fontWeight: 900
                  }} />
                </Box>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary" display="block">Volume: {comp.volumeML} mL</Typography>
                <Typography variant="caption" color="text.secondary" display="block">Expiry: {new Date(comp.expiryDate).toLocaleDateString()}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">Storage: {comp.storageLocation}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderTransfusionTab = () => (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mr: 'auto' }}>Clinical Transfusion Requests</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setRequestOpen(true)}>Create Transfusion Request</Button>
      </Box>

      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Request ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Patient</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Component</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Urgency</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Crossmatch Unit</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {txRequests.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">No active transfusion requests.</TableCell></TableRow>
            ) : txRequests.map(req => (
              <TableRow key={req.id} hover>
                <TableCell><Typography variant="body2" fontWeight={800} color="primary.main">{req.requestNumber}</Typography></TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>Patient Recipient</Typography>
                  <Typography variant="caption" color="text.secondary">{req.clinicalIndication}</Typography>
                </TableCell>
                <TableCell><Typography variant="body2">{req.quantityUnits} unit(s) of {req.componentType}</Typography></TableCell>
                <TableCell><Chip label={req.urgency} size="small" color={req.urgency === 'STAT' ? 'error' : 'default'} sx={{ fontSize: '0.65rem' }} /></TableCell>
                <TableCell>
                  {req.crossmatches.length > 0 ? (
                    <Chip label={req.crossmatches[0].component.componentCode} size="small" color="success" sx={{ fontSize: '0.65rem', fontWeight: 800 }} />
                  ) : (
                    <Typography variant="caption" color="text.secondary">Not matched</Typography>
                  )}
                </TableCell>
                <TableCell><Chip label={req.status} size="small" sx={{ fontSize: '0.65rem' }} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {req.status === 'PENDING' && (
                      <Button size="small" variant="outlined" color="primary" onClick={() => { setSelectedRequest(req); setCrossmatchOpen(true); }}>
                        Crossmatch
                      </Button>
                    )}
                    {req.status === 'CROSSMATCHED' && (
                      <Button size="small" variant="contained" color="success" onClick={() => { setSelectedRequest(req); setBedsideOpen(true); }}>
                        Bedside Administer
                      </Button>
                    )}
                    {req.status === 'ISSUED' && (
                      <Button size="small" variant="outlined" color="error" onClick={() => { setSelectedRequest(req); setReactionOpen(true); }}>
                        eMAR Complete / Reaction
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderColdChainTab = () => (
    <Box>
      <Typography variant="h6" fontWeight="bold" mb={3}>❄️ Cold Chain Temperature Agitator Registry</Typography>
      <Grid container spacing={3}>
        {equipments.map(eq => {
          const isAlarm = eq.status === 'TEMPERATURE_ALARM';
          return (
            <Grid item xs={12} sm={6} md={4} key={eq.id}>
              <Card sx={{
                border: '2px solid',
                borderColor: isAlarm ? 'error.main' : 'divider',
                bgcolor: isAlarm ? alpha('#e03131', 0.05) : 'background.paper',
                boxShadow: 'none'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={800}>{eq.name} ({eq.equipmentCode})</Typography>
                    <Chip label={eq.status} size="small" color={isAlarm ? 'error' : 'success'} sx={{ fontSize: '0.6rem' }} />
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" spacing={2} sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                    <Thermostat sx={{ fontSize: 36, color: isAlarm ? 'red' : 'green' }} />
                    <Box>
                      <Typography variant="h4" fontWeight={900}>{Number(eq.currentTemp).toFixed(1)}°C</Typography>
                      <Typography variant="caption" color="text.secondary">Limit: {Number(eq.minTempLimit)}°C to {Number(eq.maxTempLimit)}°C</Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      placeholder="Temp"
                      size="small"
                      type="number"
                      onChange={e => setTempLogForm(prev => ({ ...prev, [eq.equipmentCode]: Number(e.target.value) }))}
                      sx={{ width: 80 }}
                    />
                    <Button variant="outlined" size="small" onClick={() => handleLogTemperature(eq.equipmentCode)}>Log Temp</Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );

  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
      {/* Custom Header Banner Tailored to Page */}
      <Box sx={{ background: 'linear-gradient(135deg, #e64980 0%, #f03e3e 50%, #7048e8 100%)', color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Blood Bank &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              🩸 {pageDetails.title}
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
              {tab === 0 && renderDonorsTab()}
              {tab === 1 && renderComponentTab()}
              {tab === 2 && renderTransfusionTab()}
              {tab === 3 && renderColdChainTab()}
            </>
          )}
        </Card>
      </Box>

      {/* New Donor Dialog */}
      <Dialog open={newDonorOpen} onClose={() => setNewDonorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Register New Blood Donor</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label="First Name" fullWidth value={donorForm.firstName} onChange={e => setDonorForm(o => ({ ...o, firstName: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Last Name" fullWidth value={donorForm.lastName} onChange={e => setDonorForm(o => ({ ...o, lastName: e.target.value }))} />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label="Birth Date" type="date" fullWidth InputLabelProps={{ shrink: true }} value={donorForm.birthDate} onChange={e => setDonorForm(o => ({ ...o, birthDate: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Sex" fullWidth value={donorForm.gender} onChange={e => setDonorForm(o => ({ ...o, gender: e.target.value }))}>
                  <MenuItem value="FEMALE">Female</MenuItem>
                  <MenuItem value="MALE">Male</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField select label="Blood Group" fullWidth value={donorForm.bloodGroup} onChange={e => setDonorForm(o => ({ ...o, bloodGroup: e.target.value }))}>
                  {BLOOD_GROUPS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Rh Status" fullWidth value={donorForm.rhStatus} onChange={e => setDonorForm(o => ({ ...o, rhStatus: e.target.value }))}>
                  {RH_STATUSES.map(rh => <MenuItem key={rh} value={rh}>{rh}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>

            <Typography variant="caption" color="text.secondary" fontWeight="bold">DONOR VITAL SIGNS GUIDELINES CHECK</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField label="Weight (Kg)" type="number" fullWidth value={donorForm.weightKg} onChange={e => setDonorForm(o => ({ ...o, weightKg: Number(e.target.value) }))} />
              </Grid>
              <Grid item xs={4}>
                <TextField label="Hemoglobin (g/dL)" type="number" fullWidth value={donorForm.hemoglobinGdL} onChange={e => setDonorForm(o => ({ ...o, hemoglobinGdL: Number(e.target.value) }))} />
              </Grid>
              <Grid item xs={4}>
                <TextField label="Systolic BP" type="number" fullWidth value={donorForm.systolicBp} onChange={e => setDonorForm(o => ({ ...o, systolicBp: Number(e.target.value) }))} />
              </Grid>
            </Grid>

            <FormControlLabel
              control={<Switch checked={donorForm.consentSigned} onChange={e => setDonorForm(o => ({ ...o, consentSigned: e.target.checked }))} />}
              label="Capture Informed Electronic Consent"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDonorOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRegisterDonor}>Save Donor Record</Button>
        </DialogActions>
      </Dialog>

      {/* Collect Dialog */}
      <Dialog open={collectOpen} onClose={() => setCollectOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Donor Blood Collection Logging</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField label="Collection Site" fullWidth value={collectForm.collectionSite} onChange={e => setCollectForm(o => ({ ...o, collectionSite: e.target.value }))} />
            <TextField label="Anticoagulant Type" fullWidth value={collectForm.anticoagulantType} onChange={e => setCollectForm(o => ({ ...o, anticoagulantType: e.target.value }))} />
            <TextField label="Volume Collected (mL)" type="number" fullWidth value={collectForm.volumeML} onChange={e => setCollectForm(o => ({ ...o, volumeML: Number(e.target.value) }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCollectOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStartDonation}>Submit Bag Collection</Button>
        </DialogActions>
      </Dialog>

      {/* Screen Dialog */}
      <Dialog open={screenOpen} onClose={() => setScreenOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>LIMS Screening Entry</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField select label="Infectious Screen Test" fullWidth value={screenForm.testType} onChange={e => setScreenForm(o => ({ ...o, testType: e.target.value }))}>
              <MenuItem value="HIV">HIV Antibody</MenuItem>
              <MenuItem value="HEP_B">Hepatitis B Surface Antigen</MenuItem>
              <MenuItem value="HEP_C">Hepatitis C Antibody</MenuItem>
              <MenuItem value="SYPHILIS">VDRL Syphilis</MenuItem>
              <MenuItem value="MALARIA">Malaria Smear</MenuItem>
            </TextField>

            <TextField select label="Test Outcome" fullWidth value={screenForm.outcome} onChange={e => setScreenForm(o => ({ ...o, outcome: e.target.value }))}>
              <MenuItem value="NON_REACTIVE">NON-REACTIVE</MenuItem>
              <MenuItem value="REACTIVE">REACTIVE (Discard bag)</MenuItem>
            </TextField>

            <TextField label="Assay Details" fullWidth value={screenForm.details} onChange={e => setScreenForm(o => ({ ...o, details: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScreenOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleScreenDonation}>Record Result</Button>
        </DialogActions>
      </Dialog>

      {/* Split Dialog */}
      <Dialog open={splitOpen} onClose={() => setSplitOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Component Centrifuge Processing</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField select label="Component Category" fullWidth value={splitForm.componentType} onChange={e => setSplitForm(o => ({ ...o, componentType: e.target.value }))}>
              {COMPONENT_TYPES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField label="Volume (mL)" type="number" fullWidth value={splitForm.volumeML} onChange={e => setSplitForm(o => ({ ...o, volumeML: Number(e.target.value) }))} />
            <TextField label="Expiry Buffer (Days)" type="number" fullWidth value={splitForm.expiryDays} onChange={e => setSplitForm(o => ({ ...o, expiryDays: Number(e.target.value) }))} />
            <TextField label="Storage Location Location" fullWidth value={splitForm.storageLocation} onChange={e => setSplitForm(o => ({ ...o, storageLocation: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSplitOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleProcessComponent}>Process Centrifuge Split</Button>
        </DialogActions>
      </Dialog>

      {/* Request Dialog */}
      <Dialog open={requestOpen} onClose={() => setRequestOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Create Electronic Transfusion Order</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField select label="Urgency Urgency" fullWidth value={requestForm.urgency} onChange={e => setRequestForm(o => ({ ...o, urgency: e.target.value }))}>
              <MenuItem value="ROUTINE">Routine Request</MenuItem>
              <MenuItem value="URGENT">Urgent Order</MenuItem>
              <MenuItem value="STAT">STAT Emergency</MenuItem>
            </TextField>
            <TextField select label="Requested Component" fullWidth value={requestForm.componentType} onChange={e => setRequestForm(o => ({ ...o, componentType: e.target.value }))}>
              {COMPONENT_TYPES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField label="Quantity (Bags)" type="number" fullWidth value={requestForm.quantityUnits} onChange={e => setRequestForm(o => ({ ...o, quantityUnits: Number(e.target.value) }))} />
            <TextField label="Clinical Indication / Diagnosis" multiline rows={2} fullWidth value={requestForm.clinicalIndication} onChange={e => setRequestForm(o => ({ ...o, clinicalIndication: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateRequest}>Submit Order</Button>
        </DialogActions>
      </Dialog>

      {/* Crossmatch Dialog */}
      <Dialog open={crossmatchOpen} onClose={() => setCrossmatchOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Compatibility Crossmatch Matching</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField select label="Select Compatible Bag (FEFO default)" fullWidth value={crossmatchForm.componentId} onChange={e => setCrossmatchForm(o => ({ ...o, componentId: e.target.value }))}>
              {inventory.filter(c => c.status === 'AVAILABLE').map(c => (
                <MenuItem key={c.id} value={c.id}>
                  [{c.donation.donor.bloodGroup} {c.donation.donor.rhStatus === 'POSITIVE' ? '+' : '-'}] {c.componentCode} ({c.componentType})
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Method Used" fullWidth value={crossmatchForm.method} onChange={e => setCrossmatchForm(o => ({ ...o, method: e.target.value }))}>
              <MenuItem value="GEL_COLUMN">Gel Column</MenuItem>
              <MenuItem value="IMMEDIATE_SPIN">Immediate Spin</MenuItem>
            </TextField>
            <TextField select label="Outcome Result" fullWidth value={crossmatchForm.result} onChange={e => setCrossmatchForm(o => ({ ...o, result: e.target.value }))}>
              <MenuItem value="COMPATIBLE">COMPATIBLE</MenuItem>
              <MenuItem value="INCOMPATIBLE">INCOMPATIBLE (Block Release)</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCrossmatchOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePerformCrossmatch}>Verify & Allocate Unit</Button>
        </DialogActions>
      </Dialog>

      {/* Bedside Dialog */}
      <Dialog open={bedsideOpen} onClose={() => setBedsideOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Electronic Bedside Verification</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <FormControlLabel
              control={<Switch checked={bedsideForm.wristbandScanned} onChange={e => setBedsideForm(o => ({ ...o, wristbandScanned: e.target.checked }))} />}
              label="Scan Patient Wristband Barcode"
            />
            <FormControlLabel
              control={<Switch checked={bedsideForm.bagLabelScanned} onChange={e => setBedsideForm(o => ({ ...o, bagLabelScanned: e.target.checked }))} />}
              label="Scan Blood Component Bag Code"
            />
            <TextField label="Witnessed by (Staff Username)" fullWidth value={bedsideForm.doubleCheckedBy} onChange={e => setBedsideForm(o => ({ ...o, doubleCheckedBy: e.target.value }))} />
            <TextField label="Baseline Vitals Assessment" fullWidth value={bedsideForm.vitalsBaseline} onChange={e => setBedsideForm(o => ({ ...o, vitalsBaseline: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBedsideOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStartTransfusion} color="success">Start Transfusion</Button>
        </DialogActions>
      </Dialog>

      {/* Complete & Reaction Dialog */}
      <Dialog open={reactionOpen} onClose={() => setReactionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Complete Transfusion / SUSPECTED REACTION (Haemovigilance)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField select label="Transaction Outcome" fullWidth value={reactionForm.status} onChange={e => setReactionForm(o => ({ ...o, status: e.target.value }))}>
              <MenuItem value="COMPLETED">Completed Normally</MenuItem>
              <MenuItem value="STOPPED_REACTION">Stopped Due to Suspected Reaction</MenuItem>
            </TextField>

            <TextField label="Completion Vitals" fullWidth value={reactionForm.vitalsCompletion} onChange={e => setReactionForm(o => ({ ...o, vitalsCompletion: e.target.value }))} />

            <FormControlLabel
              control={<Switch checked={reactionForm.suspectedReaction} onChange={e => setReactionForm(o => ({ ...o, suspectedReaction: e.target.checked }))} />}
              label="Report Suspected Adverse Transfusion Reaction"
            />

            {reactionForm.suspectedReaction && (
              <>
                <TextField select label="Reaction Severity" fullWidth value={reactionForm.reactionSeverity} onChange={e => setReactionForm(o => ({ ...o, reactionSeverity: e.target.value }))}>
                  <MenuItem value="LOW">Mild (Urticaria/Pruritus)</MenuItem>
                  <MenuItem value="MODERATE">Moderate (Febrile non-hemolytic)</MenuItem>
                  <MenuItem value="SEVERE">Severe (Anaphylaxis/Hemolytic)</MenuItem>
                </TextField>
                <TextField label="Clinical Details / Immediate Actions" multiline rows={3} fullWidth value={reactionForm.reactionDetails} onChange={e => setReactionForm(o => ({ ...o, reactionDetails: e.target.value }))} />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReactionOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateTransfusion} color={reactionForm.suspectedReaction ? 'error' : 'primary'}>Save Record</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}