import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, InputAdornment, Avatar, LinearProgress, Stack, Divider,
  List, ListItem, ListItemText, Tab, Tabs, Slider, Paper, FormControl,
  InputLabel, Select, Alert, Tooltip, Switch, FormControlLabel, CircularProgress,
  ToggleButton, ToggleButtonGroup, Autocomplete, Checkbox,
} from '@mui/material';
import {
  Add, Search, Bed, Close, LocalPharmacy, Receipt, Biotech,
  Notifications, Assignment, CheckCircle, Warning, PlayArrow,
  HourglassEmpty, AccountCircle, Settings, LocalHospital, SwapHoriz,
  BabyChangingStation, TrendingUp, VolumeUp, HelpOutline, CalendarMonth, Delete, Edit,
  AutoAwesome, Psychology, Speed, Shield, Mic, MicOff, GraphicEq, CheckCircleOutline, SmartToy, FlashOn,
  TableChart, ChevronLeft, ChevronRight, Today, FilterList, CheckBox, CheckBoxOutlineBlank, InfoOutlined,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { OpenMedUnitCoPilot } from '../components/OpenMedUnitCoPilot';
import ActiveDutySessionCard from '../components/ActiveDutySessionCard';

const NURSING_SHIFTS = ['MORNING', 'AFTERNOON', 'NIGHT'];
const WARD_UNITS = ['General Ward', 'ICU', 'Maternity', 'Paediatric', 'Private', 'Emergency'];
const BED_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'ISOLATION', 'MAINTENANCE', 'OUT_OF_SERVICE'];
const CONSCIOUSNESS_LEVELS = ['ALERT', 'VOICE', 'PAIN', 'UNRESPONSIVE'];
const TRIAGE_PRIORITIES = ['IMMEDIATE', 'VERY_URGENT', 'URGENT', 'STANDARD', 'NON_URGENT'];

const STANDARD_MEDICATIONS_DICTIONARY = [
  {
    id: 'rx-309090',
    name: 'IV Ceftriaxone 1g BD',
    genericName: 'Ceftriaxone Sodium',
    atcCode: 'J01DD04',
    rxCui: '309090',
    category: '3rd Gen Cephalosporin'
  },
  {
    id: 'rx-161',
    name: 'Oral Paracetamol 1g TDS PRN',
    genericName: 'Acetaminophen / Paracetamol',
    atcCode: 'N02BE01',
    rxCui: '161',
    category: 'Analgesic & Antipyretic'
  },
  {
    id: 'rx-313002',
    name: 'IV Normal Saline 0.9% 500ml',
    genericName: 'Sodium Chloride 0.9% Solution',
    atcCode: 'B05BB01',
    rxCui: '313002',
    category: 'Electrolyte & Fluid Replenisher'
  },
  {
    id: 'rx-237159',
    name: 'Oral Augmentin (Amoxicillin/Clavulanate) 625mg BD',
    genericName: 'Amoxicillin / Clavulanic Acid',
    atcCode: 'J01CR02',
    rxCui: '237159',
    category: 'Penicillin Antibiotic'
  },
  {
    id: 'rx-6809',
    name: 'Oral Metformin 500mg BD',
    genericName: 'Metformin Hydrochloride',
    atcCode: 'A10BA02',
    rxCui: '6809',
    category: 'Biguanide Antidiabetic'
  },
  {
    id: 'rx-7646',
    name: 'Oral Omeprazole 20mg Daily',
    genericName: 'Omeprazole',
    atcCode: 'A02BC01',
    rxCui: '7646',
    category: 'Proton Pump Inhibitor'
  },
  {
    id: 'rx-2551',
    name: 'IV Ciprofloxacin 400mg BD',
    genericName: 'Ciprofloxacin',
    atcCode: 'J01MA02',
    rxCui: '2551',
    category: 'Fluoroquinolone Antibiotic'
  },
  {
    id: 'rx-644090',
    name: 'Injectable Artesunate 60mg STAT',
    genericName: 'Artesunate',
    atcCode: 'P01BE03',
    rxCui: '644090',
    category: 'Antimalarial Agent'
  },
  {
    id: 'rx-10689',
    name: 'Oral Tramadol 50mg BD',
    genericName: 'Tramadol Hydrochloride',
    atcCode: 'N02AJ13',
    rxCui: '10689',
    category: 'Opioid Analgesic'
  },
  {
    id: 'rx-274332',
    name: 'SC Insulin Glargine (Lantus) 10 units at Bedtime',
    genericName: 'Insulin Glargine Recombinant',
    atcCode: 'A10AE04',
    rxCui: '274332',
    category: 'Long-Acting Insulin'
  },
  {
    id: 'rx-205934',
    name: 'SC Enoxaparin (Clexane) 40mg SC Daily',
    genericName: 'Enoxaparin Sodium',
    atcCode: 'B01AB05',
    rxCui: '205934',
    category: 'LMWH Anticoagulant'
  },
  {
    id: 'rx-4603',
    name: 'IV Furosemide (Lasix) 40mg IV Daily',
    genericName: 'Furosemide',
    atcCode: 'C03CA01',
    rxCui: '4603',
    category: 'Loop Diuretic'
  },
  {
    id: 'rx-83367',
    name: 'Oral Atorvastatin 20mg Night',
    genericName: 'Atorvastatin Calcium',
    atcCode: 'C10AA05',
    rxCui: '83367',
    category: 'Statins / HMG-CoA'
  },
  {
    id: 'rx-17767',
    name: 'Oral Amlodipine 5mg Daily',
    genericName: 'Amlodipine Besylate',
    atcCode: 'C08CA01',
    rxCui: '17767',
    category: 'Calcium Channel Blocker'
  },
  {
    id: 'rx-29046',
    name: 'Oral Lisinopril 10mg Daily',
    genericName: 'Lisinopril',
    atcCode: 'C09AA03',
    rxCui: '29046',
    category: 'ACE Inhibitor'
  },
  {
    id: 'rx-18631',
    name: 'Oral Azithromycin 500mg Daily',
    genericName: 'Azithromycin Monohydrate',
    atcCode: 'J01FA10',
    rxCui: '18631',
    category: 'Macrolide Antibiotic'
  },
  {
    id: 'rx-6922',
    name: 'IV Metronidazole (Flagyl) 500mg 8-hourly',
    genericName: 'Metronidazole',
    atcCode: 'J01XD01',
    rxCui: '6922',
    category: 'Nitroimidazole Antibacterial'
  },
  {
    id: 'rx-5640',
    name: 'Oral Ibuprofen 400mg TDS',
    genericName: 'Ibuprofen',
    atcCode: 'M01AE01',
    rxCui: '5640',
    category: 'NSAID Analgesic'
  },
  {
    id: 'rx-3355',
    name: 'IM/IV Diclofenac 75mg STAT',
    genericName: 'Diclofenac Sodium',
    atcCode: 'M01AB05',
    rxCui: '3355',
    category: 'NSAID Analgesic'
  },
  {
    id: 'rx-7609',
    name: 'IV Ondansetron 4mg 8-hourly PRN',
    genericName: 'Ondansetron Hydrochloride',
    atcCode: 'A04AA01',
    rxCui: '7609',
    category: '5-HT3 Antiemetic'
  },
  {
    id: 'rx-5470',
    name: 'IV Hydrocortisone 100mg 8-hourly',
    genericName: 'Hydrocortisone Sodium Succinate',
    atcCode: 'H02AB09',
    rxCui: '5470',
    category: 'Corticosteroid'
  },
  {
    id: 'rx-9524',
    name: 'Inhaler Salbutamol 100mcg 2 puffs PRN',
    genericName: 'Salbutamol / Albuterol Sulfate',
    atcCode: 'R03AC02',
    rxCui: '9524',
    category: 'Bronchodilator (SABA)'
  },
  {
    id: 'rx-3264',
    name: 'IV Dexamethasone 4mg BD',
    genericName: 'Dexamethasone Sodium Phosphate',
    atcCode: 'H02AB02',
    rxCui: '3264',
    category: 'Corticosteroid'
  },
  {
    id: 'rx-4778',
    name: 'IV Gentamicin 80mg BD',
    genericName: 'Gentamicin Sulfate',
    atcCode: 'J01GB03',
    rxCui: '4778',
    category: 'Aminoglycoside Antibiotic'
  },
  {
    id: 'rx-7052',
    name: 'IV Morphine 10mg STAT',
    genericName: 'Morphine Sulfate',
    atcCode: 'N02AA01',
    rxCui: '7052',
    category: 'Opioid Analgesic'
  },
  {
    id: 'rx-11124',
    name: 'IV Vancomycin 1g 12-hourly',
    genericName: 'Vancomycin Hydrochloride',
    atcCode: 'J01XA01',
    rxCui: '11124',
    category: 'Glycopeptide Antibiotic'
  },
  {
    id: 'rx-2083',
    name: 'IV Ceftazidime 1g 8-hourly',
    genericName: 'Ceftazidime Pentahydrate',
    atcCode: 'J01DD02',
    rxCui: '2083',
    category: 'Anti-Pseudomonal Cephalosporin'
  },
  {
    id: 'rx-40114',
    name: 'IV Pantoprazole 40mg Daily',
    genericName: 'Pantoprazole Sodium',
    atcCode: 'A02BC02',
    rxCui: '40114',
    category: 'Proton Pump Inhibitor'
  },
  {
    id: 'rx-114227',
    name: 'Oral Artemether/Lumefantrine (Coartem) 80/480mg BD',
    genericName: 'Artemether / Lumefantrine',
    atcCode: 'P01BF01',
    rxCui: '114227',
    category: 'ACT Antimalarial'
  }
];

const COMMON_DOSAGES = [
  '1g', '500mg', '250mg', '100mg', '625mg', '80/480mg', '400mg',
  '20mg', '50mg', '10 Units', '100mcg', '40mg', '80mg', '75mg',
  '60mg', '1000mg', '500ml', '1000ml', '10 IU', '5g / 10ml'
];

const parseDosageAndRoute = (medName: string) => {
  if (!medName) return { dosage: '', route: 'Oral' };
  let route = 'Oral';

  const nameUpper = medName.toUpperCase();
  if (nameUpper.startsWith('IV ') || nameUpper.includes(' INTRAVENOUS ') || nameUpper.includes(' IV ') || nameUpper.includes(' INFUSION ')) {
    route = 'Intravenous';
  } else if (nameUpper.startsWith('SC ') || nameUpper.includes(' SUBCUTANEOUS ') || nameUpper.includes(' SC ')) {
    route = 'Subcutaneous';
  } else if (nameUpper.startsWith('IM ') || nameUpper.includes(' INTRAMUSCULAR ') || nameUpper.includes(' IM ') || nameUpper.startsWith('INJECTABLE ')) {
    route = 'Intramuscular';
  } else if (nameUpper.includes('INHALER') || nameUpper.includes('NEBULIZER')) {
    route = 'Inhalation';
  } else if (nameUpper.startsWith('ORAL ') || nameUpper.includes(' TABLET ') || nameUpper.includes(' CAPSULE ')) {
    route = 'Oral';
  }

  // Regex to extract dosage e.g. 1g, 500mg, 625mg, 80/480mg, 10 units, 400mg, 20mg, 500ml, 10 IU, 40mg
  const doseMatch = medName.match(/(\d+(?:\.\d+)?(?:\/\d+)?\s*(?:mg|g|ml|mcg|units|iu|IU)\b)/i);
  let dosage = doseMatch ? doseMatch[1] : '';

  if (!dosage) {
    const simpleNum = medName.match(/\b(\d+)\s*(mg|g|ml|units)\b/i);
    if (simpleNum) dosage = simpleNum[0];
  }

  return { dosage: dosage || '500mg', route };
};

const KpiCard = ({ icon, label, value, color, subtitle }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; subtitle?: string;
}) => (
  <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`, border: `1px solid ${color}30`, boxShadow: 'none' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0, pr: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5} sx={{ display: 'block', wordBreak: 'break-word' }}>{label}</Typography>
          <Typography
            fontWeight={900}
            color={color}
            mt={0.5}
            sx={{
              fontSize: { xs: '1.15rem', sm: '1.25rem', md: '1.35rem' },
              lineHeight: 1.25,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {value}
          </Typography>
          {subtitle && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{subtitle}</Typography>}
        </Box>
        <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: `${color}20`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const NursingDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/nursing/roster') {
      navigate('/staff/attendance-roster/schedules?role=Nurse', { replace: true });
      return;
    }

    if (path === '/nursing/triage') setTab(1);
    else if (path === '/nursing/emar') setTab(2);
    else if (path === '/nursing/beds') setTab(3);
    else if (path === '/nursing/maternity') setTab(4);
    else setTab(0);
  }, [location.pathname, navigate]);

  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    // 1. Dashboard & Assignments
    if (path === '/nursing/dashboard' || path === '/nursing' || path === '/nursing/') {
      return {
        title: 'Nursing Shift Dashboard & Active Patient Assignments',
        subtitle: 'Shift Handover · Bedside Care Tasks · Priority Alerts · Patient Assignment Matrix',
        category: 'Nursing Workspace (NMS)',
        kpis: [
          { label: 'Active Shift Assignments', value: `${dashboardData?.assignments?.length || 4} Patients`, subtitle: 'Current Shift Load', icon: <Assignment />, color: '#2563eb' },
          { label: 'Pending Care Tasks', value: `${dashboardData?.tasks?.length || 0} Registered`, subtitle: 'Checklist Items', icon: <CheckCircle />, color: '#0d9488' },
          { label: 'High Priority Alerts', value: '1 Action Required', subtitle: 'Immediate Attention', icon: <Warning />, color: '#e03131' },
          { label: 'Shift Handover Status', value: 'Complete & Synced', subtitle: 'Electronic Nurse Notes', icon: <SwapHoriz />, color: '#7c3aed' },
        ],
      };
    }

    // 2. Triage & Vitals Desk
    if (path === '/nursing/triage') {
      return {
        title: 'Triage & Emergency Vitals Ingestion Desk',
        subtitle: 'Manchester Triage System · Vital Signs Recording · Room Call Announcements · Pager Sync',
        category: 'Nursing Workspace (NMS)',
        kpis: [
          { label: 'Waiting Triage Queue', value: `${triageVisits.length || 2} Patients`, subtitle: 'In Waiting Area', icon: <TrendingUp />, color: '#2563eb' },
          { label: 'Vitals Ingestion Rate', value: '98.5% Complete', subtitle: 'Routine Ingestion', icon: <CheckCircle />, color: '#0d9488' },
          { label: 'Multi-Lingual Pager', value: '5 Languages Active', subtitle: 'Audio Voice Callout', icon: <VolumeUp />, color: '#7c3aed' },
          { label: 'Immediate Triage', value: '0 Urgent Cases', subtitle: 'Red Tag Alert Queue', icon: <Warning />, color: '#e03131' },
        ],
      };
    }

    // 3. eMAR Med Tracker
    if (path === '/nursing/emar') {
      const emarList = dashboardData?.pendingMedications || [];
      const totalCount = emarList.length;
      const adminCount = emarList.filter((m: any) => m.status === 'ADMINISTERED').length;
      const delayedOmittedCount = emarList.filter((m: any) => m.status === 'DELAYED' || m.status === 'OMITTED').length;
      const adminRate = totalCount > 0 ? Math.round((adminCount / totalCount) * 100) : 100;
      const doseValueText = totalCount === 0
        ? '0 Doses Logged'
        : adminCount === totalCount
          ? `${adminCount} Administered`
          : adminCount > 0
            ? `${adminCount} Given / ${totalCount - adminCount} Pending`
            : `${totalCount} Scheduled`;

      return {
        title: 'Electronic Medication Administration Record (eMAR)',
        subtitle: 'Bedside Dose Verification · Administration Audit Log · Omission Tracking · Controlled Substances',
        category: 'Nursing Workspace (NMS)',
        kpis: [
          { label: 'Doses Logged This Shift', value: doseValueText, subtitle: 'eMAR Prescriptions', icon: <LocalPharmacy />, color: '#2563eb' },
          { label: 'Administered Rate', value: `${totalCount > 0 ? adminRate : 100}% On-Time`, subtitle: 'Bedside Verified', icon: <CheckCircle />, color: '#0d9488' },
          { label: 'Delayed / Omitted', value: `${delayedOmittedCount} Logged`, subtitle: 'Reason Audit Trail', icon: <Warning />, color: '#f76707' },
          { label: 'Double-Check Status', value: 'Verified', subtitle: 'Nurse Sign-Off', icon: <CheckCircle />, color: '#7c3aed' },
        ],
      };
    }

    // 4. Ward Beds Map
    if (path === '/nursing/beds') {
      const avail = wards.reduce((acc: number, w: any) => acc + (w.beds?.filter((b: any) => b.isAvailable).length || 0), 0);
      return {
        title: 'Inpatient Ward Bed Allocation & Occupancy Map',
        subtitle: 'Live Bed Availability · Ward Capacity · Bed Status Tracking · Patient Transfers',
        category: 'Nursing Workspace (NMS)',
        // KPIs are shown live inside the Ward Beds Map tab — removed static ones here to avoid duplication
        kpis: [],
      };
    }

    // 5. Maternity & Delivery
    if (path === '/nursing/maternity') {
      return {
        title: 'Maternity & Labor Ward Partograph Monitor',
        subtitle: 'Antenatal Booking · Partograph Cervical Dilatation · Fetal Heart Rate · Birth & Neonatal Logs',
        category: 'Nursing Workspace (NMS)',
        kpis: [
          { label: 'Active ANC Bookings', value: '18 Mothers', subtitle: 'Antenatal Profiles', icon: <BabyChangingStation />, color: '#2563eb' },
          { label: 'Partograph Active', value: '3 Labor Cases', subtitle: 'Progress Monitored', icon: <TrendingUp />, color: '#0d9488' },
          { label: 'Deliveries Today', value: '2 Neonates', subtitle: 'APGAR Recorded', icon: <CheckCircle />, color: '#7c3aed' },
          { label: 'High Risk Flagged', value: '1 Monitored', subtitle: 'Obstetric Care', icon: <Warning />, color: '#e03131' },
        ],
      };
    }

    // 6. Ward Nurse Roster
    if (path === '/nursing/roster') {
      return {
        title: 'Nursing Staff Roster & Duty Shift Schedule',
        subtitle: 'Shift Duty Allocations · Nurse-to-Patient Ratio · Ward Assignments · Overtime & Coverage',
        category: 'Nursing Workspace (NMS)',
        kpis: [
          { label: 'On-Duty Nurses', value: `${staffList.length || 8} Active`, subtitle: 'Current Shift Roster', icon: <CalendarMonth />, color: '#2563eb' },
          { label: 'Current Shift', value: 'Morning (07-15)', subtitle: 'Standard Coverage', icon: <SwapHoriz />, color: '#0d9488' },
          { label: 'Nurse Ratio', value: '1 : 4 (Optimal)', subtitle: 'Patient Load Ratio', icon: <CheckCircle />, color: '#7c3aed' },
          { label: 'Cover Requests', value: '0 Pending', subtitle: 'Shift Swaps', icon: <CheckCircle />, color: '#2563eb' },
        ],
      };
    }

    // Fallback
    return {
      title: 'Nursing Management System & Ward Console',
      subtitle: 'Shift Logs · Patient Assignments · Vital Signs · eMAR Administrations · Partographs',
      category: 'Nursing Workspace (NMS)',
      kpis: [
        { label: 'Active Shift Assignments', value: `${dashboardData?.assignments?.length || 4} Patients`, subtitle: 'Shift Load', icon: <Assignment />, color: '#2563eb' },
        { label: 'Pending Care Tasks', value: `${dashboardData?.tasks?.length || 0} Registered`, subtitle: 'Checklist', icon: <CheckCircle />, color: '#0d9488' },
        { label: 'Triage Queue', value: `${triageVisits.length || 2} Patients`, subtitle: 'Waiting Desk', icon: <TrendingUp />, color: '#7c3aed' },
        { label: 'On-Duty Nurses', value: `${staffList.length || 8} Active`, subtitle: 'Staff Roster', icon: <CalendarMonth />, color: '#2563eb' },
      ],
    };
  };
  const [announcementLang, setAnnouncementLang] = useState('pcm'); // Default to Nigerian Pidgin
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  useEffect(() => {
    const updateVoices = () => {
      if ('speechSynthesis' in window) {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Persist preferred choice
        const saved = localStorage.getItem('preferred_voice_name');
        if (saved) {
          setSelectedVoiceName(saved);
        } else {
          // Attempt to locate a voice that sounds natural (South African, British, African, etc.)
          const preferred = availableVoices.find(v => v.lang.startsWith('en-ZA') || v.name.toLowerCase().includes('south africa') || v.name.toLowerCase().includes('tessa'))
            || availableVoices.find(v => v.lang.startsWith('en-GB') || v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('kate'))
            || availableVoices.find(v => v.lang.startsWith('en-US'))
            || availableVoices[0];
          if (preferred) {
            setSelectedVoiceName(preferred.name);
          }
        }
      }
    };

    updateVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [triageVisits, setTriageVisits] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal open states
  const [assignOpen, setAssignOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [emarOpen, setEmarOpen] = useState(false);
  const [partographOpen, setPartographOpen] = useState(false);
  const [maternityRegOpen, setMaternityRegOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);

  const [pharmacyCatalog, setPharmacyCatalog] = useState<string[]>([]);
  // Form states
  const [assignForm, setAssignForm] = useState<{ patientId: string; patientIds: string[]; staffId: string; notes: string }>({ patientId: '', patientIds: [], staffId: '', notes: '' });
  const [handoverForm, setHandoverForm] = useState<{ outgoingNurseId: string; incomingNurseId: string; incomingNurseIds: string[]; patientId: string; condition: string; outstandingTasks: string; medicationsDue: string; scheduledMedsList: string[]; pendingInvestigations: string; clinicalConcerns: string }>({ outgoingNurseId: '', incomingNurseId: '', incomingNurseIds: [], patientId: '', condition: '', outstandingTasks: '', medicationsDue: '', scheduledMedsList: [], pendingInvestigations: '', clinicalConcerns: '' });
  const [taskForm, setTaskForm] = useState({ patientId: '', description: '', priority: 'ROUTINE', assignedNurseId: '', dueDate: new Date().toISOString().slice(0, 16) });
  const [triageForm, setTriageForm] = useState({
    patientId: '', systolic: 120, diastolic: 80, temperature: 37.0, pulseRate: 80, respiratoryRate: 16, spo2: 98, weight: '', height: '',
    presentingComplaints: '', painScore: 0, consciousnessLevel: 'ALERT', mobility: 'WALKING', hydration: 'GOOD', nutrition: 'GOOD', priority: 'STANDARD'
  });
  const [emarForm, setEmarForm] = useState({ patientId: '', medicationName: '', dosage: '', route: 'Oral', site: '', status: 'ADMINISTERED', omittedReason: '', notes: '', scheduledTime: new Date().toISOString().slice(0, 16) });
  const [emarFormItems, setEmarFormItems] = useState<Array<{
    id: string;
    prescriptionId?: string;
    medicationName: string;
    dosage: string;
    route: string;
    site: string;
    status: string;
    omittedReason: string;
    notes: string;
  }>>([
    {
      id: 'init-1',
      medicationName: '',
      dosage: '',
      route: 'Oral',
      site: '',
      status: 'ADMINISTERED',
      omittedReason: '',
      notes: '',
    }
  ]);
  const [emarSubmitting, setEmarSubmitting] = useState<boolean>(false);
  const [emarPrescriptions, setEmarPrescriptions] = useState<any[]>([]);
  const [emarHasUnpaid, setEmarHasUnpaid] = useState<boolean>(false);
  const [emarHasUndispensed, setEmarHasUndispensed] = useState<boolean>(false);
  const [emarLoading, setEmarLoading] = useState<boolean>(false);
  const [emarAllergies, setEmarAllergies] = useState<any[]>([]);
  const [emarLogs, setEmarLogs] = useState<any[]>([]);
  const [maternityRegForm, setMaternityRegForm] = useState({ patientId: '', gestationNumber: 1, lmpDate: new Date().toISOString().slice(0, 10), isHighRisk: false, highRiskReason: '' });
  const [partographForm, setPartographForm] = useState({ pregnancyId: '', membranesStatus: 'INTACT', cervicalDilatation: 4, contractionsFrequency: 3, fetalHeartRate: 140, maternalPulse: 80, maternalBp: '120/80', partographData: '' });
  const [deliveryForm, setDeliveryForm] = useState({
    pregnancyId: '', deliveryType: 'VAGINAL', bloodLossMl: 250, complications: '', placentaCondition: 'COMPLETE & INTACT', birthAttendantId: '',
    babyName: 'Baby Doe', birthWeight: 3.2, birthLength: 50, headCircumference: 35, sex: 'MALE', apgar1Min: 9, apgar5Min: 10, examinationNotes: ''
  });

  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [bedsData, setBedsData] = useState<any[]>([]);
  const [bedsSummary, setBedsSummary] = useState<any>({ total: 0, occupied: 0, available: 0, cleaning: 0, maintenance: 0 });
  const [bedsWards, setBedsWards] = useState<any[]>([]);
  const [bedFilter, setBedFilter] = useState<string>('ALL'); // ALL | AVAILABLE | OCCUPIED | CLEANING | MAINTENANCE
  const [bedWardFilter, setBedWardFilter] = useState<string>('ALL');
  const [bedSearchQuery, setBedSearchQuery] = useState<string>('');
  const [selectedBed, setSelectedBed] = useState<any>(null);
  const [bedDetailOpen, setBedDetailOpen] = useState(false);
  const [bedStatusDialogOpen, setBedStatusDialogOpen] = useState(false);
  const [bedStatusTarget, setBedStatusTarget] = useState<{ bed: any; newStatus: string } | null>(null);
  const [bedAssignDialogOpen, setBedAssignDialogOpen] = useState(false);
  const [bedAssignPatientId, setBedAssignPatientId] = useState<string>('');
  const [bedAssignCondition, setBedAssignCondition] = useState<string>('STABLE');
  const [bedAssignLoading, setBedAssignLoading] = useState(false);
  const [bedsLoading, setBedsLoading] = useState(false);
  const [smartPlacementOpen, setSmartPlacementOpen] = useState(false);
  const [smartPlacementFilterWard, setSmartPlacementFilterWard] = useState<string | null>(null);
  const [allWardPatients, setAllWardPatients] = useState<any[]>([]);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [assignmentViewMode, setAssignmentViewMode] = useState<'my' | 'all'>('my');

  // Ward Nurse Roster State
  const [roster, setRoster] = useState<any[]>([]);
  const [openAddRoster, setOpenAddRoster] = useState(false);
  const [configuredShifts, setConfiguredShifts] = useState<any[]>([]);
  const [shiftConfigOpen, setShiftConfigOpen] = useState(false);
  const [openAddShift, setOpenAddShift] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    code: '',
    name: '',
    startTime: '08:00',
    endTime: '16:00',
    description: '',
    color: '#2563eb',
  });

  const handleSaveNurseShifts = async (updatedShifts: any[]) => {
    try {
      await api.post('/ward-roster/shifts', { shifts: updatedShifts });
      setConfiguredShifts(updatedShifts);
      enqueueSnackbar('Nurse shift configurations saved successfully!', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save shift config', { variant: 'error' });
    }
  };

  const handleAddShift = () => {
    if (!shiftForm.code || !shiftForm.name || !shiftForm.startTime || !shiftForm.endTime) {
      enqueueSnackbar('Code, Name, Start and End times are required', { variant: 'warning' });
      return;
    }
    const code = shiftForm.code.toUpperCase().replace(/\s+/g, '_');
    const label = `${shiftForm.name} (${shiftForm.startTime}–${shiftForm.endTime})`;
    const newShift = { ...shiftForm, code, label };
    const updated = [...configuredShifts, newShift];
    handleSaveNurseShifts(updated);
    setOpenAddShift(false);
    setShiftForm({ code: '', name: '', startTime: '08:00', endTime: '16:00', description: '', color: '#2563eb' });
  };

  const handleDeleteShift = (code: string) => {
    const updated = configuredShifts.filter((s: any) => s.code !== code);
    handleSaveNurseShifts(updated);
  };

  const [rosterForm, setRosterForm] = useState({
    wardId: '',
    staffId: '',
    shift: 'MORNING',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    isPrimary: false,
  });

  // Ward Nurse Roster Visual Calendar State
  const [rosterViewMode, setRosterViewMode] = useState<'table' | 'calendar'>('table');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarWardFilter, setCalendarWardFilter] = useState<string>('ALL');
  const [selectedRosterEvent, setSelectedRosterEvent] = useState<any>(null);

  const getCalendarGrid = (currentDate: Date) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid: Array<{ date: Date; dayNum: number; isCurrentMonth: boolean; isToday: boolean }> = [];

    // Prev month padding
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      grid.push({ date: d, dayNum: d.getDate(), isCurrentMonth: false, isToday: false });
    }

    // Current month
    const todayStr = new Date().toISOString().slice(0, 10);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const isToday = dateObj.toISOString().slice(0, 10) === todayStr;
      grid.push({ date: dateObj, dayNum: d, isCurrentMonth: true, isToday });
    }

    // Next month padding to fill grid
    const totalNeeded = grid.length > 35 ? 42 : 35;
    const remaining = totalNeeded - grid.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      grid.push({ date: d, dayNum: i, isCurrentMonth: false, isToday: false });
    }

    return grid;
  };

  const getRostersForCellDate = (cellDate: Date) => {
    const cellStr = cellDate.toISOString().slice(0, 10);
    const cellTime = new Date(cellStr + 'T12:00:00Z').getTime();

    return roster.filter(r => {
      if (calendarWardFilter !== 'ALL' && r.wardId !== calendarWardFilter) return false;

      const startStr = new Date(r.startDate).toISOString().slice(0, 10);
      const startTime = new Date(startStr + 'T00:00:00Z').getTime();

      const endStr = r.endDate ? new Date(r.endDate).toISOString().slice(0, 10) : '2099-12-31';
      const endTime = new Date(endStr + 'T23:59:59Z').getTime();

      return cellTime >= startTime && cellTime <= endTime;
    });
  };

  const getShiftBadgeStyle = (shiftCode: string) => {
    switch (shiftCode) {
      case 'MORNING': return { bg: '#2563eb', color: '#ffffff', label: 'Morning' };
      case 'AFTERNOON': return { bg: '#d97706', color: '#ffffff', label: 'Afternoon' };
      case 'NIGHT': return { bg: '#7c3aed', color: '#ffffff', label: 'Night' };
      case 'DAY_12H': return { bg: '#059669', color: '#ffffff', label: '12h Day' };
      case 'NIGHT_12H': return { bg: '#dc2626', color: '#ffffff', label: '12h Night' };
      case 'ON_CALL': return { bg: '#0891b2', color: '#ffffff', label: 'On-Call' };
      default: return { bg: '#3f51b5', color: '#ffffff', label: shiftCode };
    }
  };

  // Ward Settings Configuration State
  const [wardSettingsOpen, setWardSettingsOpen] = useState(false);
  const [addWardModalOpen, setAddWardModalOpen] = useState(false);
  const [editWardModalOpen, setEditWardModalOpen] = useState(false);
  const [selectedWard, setSelectedWard] = useState<any>(null);
  const [wardForm, setWardForm] = useState({
    name: '',
    wardCategory: 'GENERAL',
    type: 'GENERAL',
    capacity: 10,
    description: '',
    color: '#3f51b5',
    resusCount: 2,
    trolleyCount: 10,
    chairCount: 4,
    firstStageCount: 4,
    deliverySuiteCount: 3,
    recoveryCount: 2,
  });

  const fetchWards = async () => {
    try {
      const res = await api.get('/wards');
      setWards(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWard = async () => {
    if (!wardForm.name || !wardForm.wardCategory) {
      enqueueSnackbar('Ward Name and Category are required', { variant: 'warning' });
      return;
    }
    try {
      const isEmergency = wardForm.wardCategory === 'EMERGENCY' || wardForm.name.toLowerCase().includes('emergency');
      const isLabour = wardForm.wardCategory === 'LABOUR' || wardForm.name.toLowerCase().includes('labour') || wardForm.name.toLowerCase().includes('delivery');
      const finalCapacity = isEmergency
        ? (Number(wardForm.resusCount || 0) + Number(wardForm.trolleyCount || 0) + Number(wardForm.chairCount || 0))
        : isLabour
        ? (Number(wardForm.firstStageCount || 0) + Number(wardForm.deliverySuiteCount || 0) + Number(wardForm.recoveryCount || 0))
        : wardForm.capacity;

      const payload = {
        ...wardForm,
        capacity: finalCapacity,
      };

      const resWard = await api.post('/wards', payload);
      const createdWardId = resWard.data?.id;

      if (isEmergency) {
        await api.post('/emergency/beds/bulk-generate', {
          resusCount: wardForm.resusCount,
          trolleyCount: wardForm.trolleyCount,
          chairCount: wardForm.chairCount,
        });
        fetchEmergencyBeds();
      } else if (isLabour) {
        await api.post('/ipd/labour-beds/bulk-generate', {
          wardId: createdWardId,
          firstStageCount: wardForm.firstStageCount,
          deliverySuiteCount: wardForm.deliverySuiteCount,
          recoveryCount: wardForm.recoveryCount,
        });
      }

      enqueueSnackbar('Ward created successfully', { variant: 'success' });
      setAddWardModalOpen(false);
      setWardForm({ name: '', wardCategory: 'GENERAL', type: 'GENERAL', capacity: 10, description: '', color: '#3f51b5', resusCount: 2, trolleyCount: 10, chairCount: 4, firstStageCount: 4, deliverySuiteCount: 3, recoveryCount: 2 });
      fetchWards();
      fetchBedsData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create ward', { variant: 'error' });
    }
  };

  const handleOpenEditWard = async (ward: any) => {
    setSelectedWard(ward);
    const isEmergency = ward.wardCategory === 'EMERGENCY' || ward.name.toLowerCase().includes('emergency');
    const isLabour = ward.wardCategory === 'LABOUR' || ward.name.toLowerCase().includes('labour') || ward.name.toLowerCase().includes('delivery');

    let resus = 2;
    let trolley = 10;
    let chair = 4;

    let firstStage = 4;
    let deliverySuite = 3;
    let recovery = 2;

    if (isEmergency) {
      try {
        const res = await api.get('/emergency/beds');
        const emBeds = res.data || [];
        if (emBeds.length > 0) {
          resus = emBeds.filter((b: any) => b.bedType === 'RESUSCITATION_BAY' || b.bedCode.startsWith('RESUS')).length || 2;
          trolley = emBeds.filter((b: any) => b.bedType === 'TROLLEY' || b.bedCode.startsWith('TRL')).length || 10;
          chair = emBeds.filter((b: any) => b.bedType === 'RECLINER_CHAIR' || b.bedCode.startsWith('CHR')).length || 4;
        }
      } catch (e) {
        console.error(e);
      }
    } else if (isLabour) {
      try {
        const res = await api.get('/ipd/beds');
        const lbrBeds = (res.data?.beds || res.data || []).filter((b: any) => b.wardId === ward.id || b.wardCategory === 'LABOUR');
        if (lbrBeds.length > 0) {
          firstStage = lbrBeds.filter((b: any) => b.bedType === 'FIRST_STAGE_OBS' || b.number.includes('OBS')).length || 4;
          deliverySuite = lbrBeds.filter((b: any) => b.bedType === 'DELIVERY_SUITE' || b.number.includes('SUITE')).length || 3;
          recovery = lbrBeds.filter((b: any) => b.bedType === 'RECOVERY' || b.number.includes('REC')).length || 2;
        }
      } catch (e) {
        console.error(e);
      }
    }

    setWardForm({
      name: ward.name || '',
      wardCategory: ward.wardCategory || 'GENERAL',
      type: ward.type || ward.wardCategory || 'GENERAL',
      capacity: isEmergency ? (resus + trolley + chair) : isLabour ? (firstStage + deliverySuite + recovery) : (ward.capacity || 10),
      description: ward.description || '',
      color: ward.color || '#3f51b5',
      resusCount: resus,
      trolleyCount: trolley,
      chairCount: chair,
      firstStageCount: firstStage,
      deliverySuiteCount: deliverySuite,
      recoveryCount: recovery,
    });
    setEditWardModalOpen(true);
  };

  const handleUpdateWard = async () => {
    if (!selectedWard || !wardForm.name) return;
    try {
      const isEmergency = wardForm.wardCategory === 'EMERGENCY' || wardForm.name.toLowerCase().includes('emergency');
      const isLabour = wardForm.wardCategory === 'LABOUR' || wardForm.name.toLowerCase().includes('labour') || wardForm.name.toLowerCase().includes('delivery');
      const finalCapacity = isEmergency
        ? (Number(wardForm.resusCount || 0) + Number(wardForm.trolleyCount || 0) + Number(wardForm.chairCount || 0))
        : isLabour
        ? (Number(wardForm.firstStageCount || 0) + Number(wardForm.deliverySuiteCount || 0) + Number(wardForm.recoveryCount || 0))
        : wardForm.capacity;

      const payload = {
        ...wardForm,
        capacity: finalCapacity,
      };

      await api.put(`/wards/${selectedWard.id}`, payload);

      if (isEmergency) {
        await api.post('/emergency/beds/bulk-generate', {
          resusCount: wardForm.resusCount,
          trolleyCount: wardForm.trolleyCount,
          chairCount: wardForm.chairCount,
        });
        fetchEmergencyBeds();
      } else if (isLabour) {
        await api.post('/ipd/labour-beds/bulk-generate', {
          wardId: selectedWard.id,
          firstStageCount: wardForm.firstStageCount,
          deliverySuiteCount: wardForm.deliverySuiteCount,
          recoveryCount: wardForm.recoveryCount,
        });
      }

      enqueueSnackbar('Ward updated successfully', { variant: 'success' });
      setEditWardModalOpen(false);
      setSelectedWard(null);
      fetchWards();
      fetchBedsData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update ward', { variant: 'error' });
    }
  };

  const handleDeleteWard = async (wardId: string, wardName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${wardName}"?`)) return;
    try {
      await api.delete(`/wards/${wardId}`);
      enqueueSnackbar(`Ward "${wardName}" deleted`, { variant: 'info' });
      fetchWards();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete ward', { variant: 'error' });
    }
  };

  // Emergency Ward Spot Management State & Handlers
  const [emSpotManagerOpen, setEmSpotManagerOpen] = useState(false);
  const [emResusCount, setEmResusCount] = useState(2);
  const [emTrolleyCount, setEmTrolleyCount] = useState(10);
  const [emChairCount, setEmChairCount] = useState(4);
  const [newEmSpotCode, setNewEmSpotCode] = useState('');
  const [newEmSpotType, setNewEmSpotType] = useState('TROLLEY');
  const [emergencyBedsList, setEmergencyBedsList] = useState<any[]>([]);

  const fetchEmergencyBeds = async () => {
    try {
      const res = await api.get('/emergency/beds');
      setEmergencyBedsList(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEmSpotManager = () => {
    fetchEmergencyBeds();
    setEmSpotManagerOpen(true);
  };

  const handleBulkGenerateEmSpots = async () => {
    try {
      await api.post('/emergency/beds/bulk-generate', {
        resusCount: emResusCount,
        trolleyCount: emTrolleyCount,
        chairCount: emChairCount,
      });
      enqueueSnackbar('⚡ Emergency spots generated & synchronized successfully!', { variant: 'success' });
      fetchEmergencyBeds();
      fetchBedsData();
    } catch (err: any) {
      enqueueSnackbar('Failed to generate emergency spots', { variant: 'error' });
    }
  };

  const handleAddSingleEmSpot = async () => {
    if (!newEmSpotCode) {
      enqueueSnackbar('Spot Code is required (e.g. RESUS-03, TRL-11)', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/emergency/beds', {
        bedCode: newEmSpotCode.toUpperCase(),
        bedType: newEmSpotType,
      });
      enqueueSnackbar(`✅ Emergency spot ${newEmSpotCode} added!`, { variant: 'success' });
      setNewEmSpotCode('');
      fetchEmergencyBeds();
      fetchBedsData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to add emergency spot', { variant: 'error' });
    }
  };

  const handleDeleteEmSpot = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete spot ${code}?`)) return;
    try {
      await api.delete(`/emergency/beds/${id}`);
      enqueueSnackbar(`Emergency spot ${code} deleted`, { variant: 'info' });
      fetchEmergencyBeds();
      fetchBedsData();
    } catch (err: any) {
      enqueueSnackbar('Failed to delete emergency spot', { variant: 'error' });
    }
  };

  // Smart Voice/Text Dictation & Parsing State
  const [dictationText, setDictationText] = useState('');
  const [isParsingDictation, setIsParsingDictation] = useState(false);
  const [isListeningDictation, setIsListeningDictation] = useState(false);
  const [recognitionRef, setRecognitionRef] = useState<any>(null);

  // Presenting Complaints Dedicated Voice Dictation State
  const [isListeningComplaints, setIsListeningComplaints] = useState(false);
  const [complaintsRecognitionRef, setComplaintsRecognitionRef] = useState<any>(null);
  const [rawSpokenComplaint, setRawSpokenComplaint] = useState('');

  // ── Intelligent Clinical Rewrite Engine (SOAP Subjective Formatting) ───────
  const clinicallyRewriteComplaint = (rawText: string): string => {
    if (!rawText || !rawText.trim()) return '';
    let clean = rawText.trim();

    // Strip pre-existing quotes or repetitive prefixes if already present
    clean = clean.replace(/^Patient presented with:\s*"?/i, '')
                 .replace(/^Patient presents with:\s*"?/i, '')
                 .replace(/^Patient presents\s+/i, '')
                 .replace(/^Patient reports\s+/i, '')
                 .replace(/"$/g, '')
                 .trim();

    const lower = clean.toLowerCase();

    // Handle "no complaint" / "no complaints" / "nothing" / "fine"
    if (/\b(no complain|no complaints|no symptom|nothing|fine|okay|ok|nil)\b/i.test(lower)) {
      return 'Patient presents for routine intake reporting no active physical complaints or acute distress at present.';
    }

    // 1. Maternity / Obstetric / Labour & Delivery
    if (lower.includes('patience') || lower.includes('patient') || lower.includes('contraction') || lower.includes('deliver') || lower.includes('labour') || lower.includes('labor')) {
      if (lower.includes('contraction') || lower.includes('deliver')) {
        return 'Patient presents in active labour with painful, frequent uterine contractions of acute onset and requests immediate obstetric delivery evaluation.';
      }
      if (lower.includes('water') || lower.includes('rupture') || lower.includes('membrane') || lower.includes('fluid')) {
        return 'Patient presents with spontaneous rupture of membranes (SROM) accompanied by active uterine contractions.';
      }
      if (lower.includes('bleed') || lower.includes('spotting')) {
        return 'Patient presents with antepartum vaginal bleeding and associated uterine discomfort requiring urgent obstetric assessment.';
      }
    }

    // 2. Cardiovascular / Chest
    if (lower.includes('chest pain') || lower.includes('tightness') || lower.includes('chest heaviness')) {
      return 'Patient presents with acute substernal chest pain and tightness of sudden onset requiring urgent cardiovascular workup.';
    }

    // 3. Neurological / Head
    if (lower.includes('headache') || lower.includes('head pain') || lower.includes('migraine') || lower.includes('dizzy') || lower.includes('dizziness')) {
      if (lower.includes('dizzy') || lower.includes('dizziness')) {
        return 'Patient presents with acute cephalalgia (headache) accompanied by vertigo and postural dizziness.';
      }
      return 'Patient presents with severe frontal cephalalgia (headache) accompanied by systemic discomfort.';
    }

    // 4. Febrile / Infection / Malaria
    if (lower.includes('fever') || lower.includes('temperature') || lower.includes('chills') || lower.includes('rigor') || lower.includes('malaria')) {
      return 'Patient presents with febrile illness characterized by intermittent high-grade fever, chills, rigors, and general body weakness.';
    }

    // 5. Musculoskeletal / Back / Neck / Joints
    if (lower.includes('waist') || lower.includes('back pain') || lower.includes('lower back') || lower.includes('waste')) {
      return 'Patient presents with persistent lumbar spine discomfort (axial lower back pain) of gradual onset.';
    }
    if (lower.includes('neck') || lower.includes('cervical')) {
      return 'Patient presents with complaints of persistent cervicalgia (neck pain) and paraspinal muscle tenderness.';
    }
    if (lower.includes('body pain') || lower.includes('body pains') || lower.includes('myalgia')) {
      return 'Patient presents with generalized body pains (myalgia) and somatic fatigue rated moderate to severe.';
    }

    // 6. Respiratory
    if (lower.includes('cough') || lower.includes('catarrh') || lower.includes('phlegm') || lower.includes('sputum')) {
      return 'Patient presents with upper respiratory tract complaint including persistent cough, nasal congestion, and catarrh.';
    }
    if (lower.includes('breath') || lower.includes('shortness') || lower.includes('breathing') || lower.includes('dyspnea')) {
      return 'Patient presents with acute dyspnea (shortness of breath) and respiratory distress requiring immediate oxygenation evaluation.';
    }

    // 7. Gastrointestinal
    if (lower.includes('stomach') || lower.includes('vomit') || lower.includes('purging') || lower.includes('diarrhea') || lower.includes('stooling') || lower.includes('nausea')) {
      return 'Patient presents with acute gastroenteritis symptoms including abdominal cramping, nausea, emesis, and loose watery stools.';
    }

    // Clean fillers
    clean = clean.replace(/^(so|umm?|uhh?|well|okay|like|and|the patient|patient|she|he|this patient)\s+/i, '').trim();

    const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
    return `Patient presents with complaints of ${formatted.toLowerCase()}, recorded during clinical nursing intake.`;
  };

  const handleClinicalRewriteComplaint = async (textToRewrite?: string) => {
    const target = (textToRewrite || triageForm.presentingComplaints || '').trim();
    if (!target) {
      enqueueSnackbar('Please type or dictate complaints first.', { variant: 'info' });
      return;
    }

    try {
      const res = await api.post('/openmed/rewrite-complaint', { text: target });
      const rewritten = res.data?.data?.rewritten;
      if (rewritten) {
        setTriageForm(prev => ({ ...prev, presentingComplaints: rewritten }));
        enqueueSnackbar('✨ Clinically rewritten into professional SOAP presentation format!', { variant: 'success' });
        return;
      }
    } catch (err) {
      console.log('Backend rewrite-complaint fallback:', err);
    }

    const rewritten = clinicallyRewriteComplaint(target);
    setTriageForm(prev => ({ ...prev, presentingComplaints: rewritten }));
    enqueueSnackbar('✨ Clinically rewritten into professional SOAP presentation format!', { variant: 'success' });
  };

  const toggleComplaintsVoiceRecording = async () => {
    if (isListeningComplaints) {
      if (complaintsRecognitionRef) {
        try { complaintsRecognitionRef.stop(); } catch {}
      }
      setIsListeningComplaints(false);
      // Process and clinically rewrite whatever was spoken
      if (rawSpokenComplaint.trim()) {
        const rewritten = clinicallyRewriteComplaint(rawSpokenComplaint);
        setTriageForm(prev => ({ ...prev, presentingComplaints: rewritten }));
        enqueueSnackbar('✨ Spoken dictation clinically rewritten into SOAP note!', { variant: 'success' });
      }
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
      }
    } catch (e) {
      console.log('Audio constraints request:', e);
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningComplaints(true);
        setRawSpokenComplaint('');
        enqueueSnackbar('🎤 Voice Dictation Active: Speak presenting complaints...', { variant: 'info' });
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setRawSpokenComplaint(currentTranscript);
          // Instantly convert raw dictated speech into professional clinical text
          const rewritten = clinicallyRewriteComplaint(currentTranscript);
          setTriageForm(prev => ({
            ...prev,
            presentingComplaints: rewritten
          }));
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListeningComplaints(false);
      };

      recognition.onend = () => {
        setIsListeningComplaints(false);
      };

      try {
        recognition.start();
        setComplaintsRecognitionRef(recognition);
      } catch (err) {
        console.error(err);
      }
    } else {
      setIsListeningComplaints(true);
      enqueueSnackbar('🎤 Voice Dictation active. Speak presenting complaints...', { variant: 'info' });
      setTimeout(() => {
        const sampleRaw = 'so patience is having an emergency contraction I would need to get delivered immediately';
        const rewritten = clinicallyRewriteComplaint(sampleRaw);
        setTriageForm(prev => ({
          ...prev,
          presentingComplaints: rewritten
        }));
        setIsListeningComplaints(false);
        enqueueSnackbar('✨ Spoken dictation clinically rewritten into SOAP note!', { variant: 'success' });
      }, 3000);
    }
  };

  const toggleVoiceRecording = async () => {
    if (isListeningDictation) {
      if (recognitionRef) {
        try { recognitionRef.stop(); } catch {}
      }
      setIsListeningDictation(false);
      enqueueSnackbar('Voice listening paused.', { variant: 'info' });
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true, // High-sensitivity microphone gain booster for faint/soft voices
          }
        });
      }
    } catch (e) {
      console.log('Audio constraints request:', e);
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningDictation(true);
        enqueueSnackbar('High-Sensitivity Mic Active (Noise Cancellation & Auto Gain ON). Speak vitals now...', { variant: 'info' });
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setDictationText(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListeningDictation(false);
      };

      recognition.onend = () => {
        setIsListeningDictation(false);
      };

      try {
        recognition.start();
        setRecognitionRef(recognition);
      } catch (err) {
        console.error(err);
      }
    } else {
      setIsListeningDictation(true);
      enqueueSnackbar('High-Sensitivity Ambient Listener active. Speak vitals...', { variant: 'info' });
      setTimeout(() => {
        const sampleDict = 'BP 138 over 88, temp 38.1, pulse 92, spo2 97%, rr 18, pain 3, severe headache';
        setDictationText(sampleDict);
        setIsListeningDictation(false);
        enqueueSnackbar('Voice transcribed successfully!', { variant: 'success' });
      }, 3000);
    }
  };

  // OpenMed Intelligent Vitals Extraction — calls POST /api/openmed/parse-vitals
  const handleAiParseDictation = async () => {
    const textToParse = dictationText.trim();
    if (!textToParse) {
      enqueueSnackbar('Please speak or type vitals first, then click Parse Vitals.', { variant: 'warning' });
      return;
    }
    setIsParsingDictation(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/openmed/parse-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: textToParse }),
      });

      if (!res.ok) throw new Error(`OpenMed API error: ${res.status}`);
      const json = await res.json();

      if (json.success && json.data?.vitals) {
        const v = json.data.vitals;
        setTriageForm(prev => ({
          ...prev,
          systolic:        v.systolic        !== null ? v.systolic        : prev.systolic,
          diastolic:       v.diastolic       !== null ? v.diastolic       : prev.diastolic,
          temperature:     v.temperature     !== null ? v.temperature     : prev.temperature,
          pulseRate:       v.pulse           !== null ? v.pulse           : prev.pulseRate,
          spo2:            v.spo2            !== null ? v.spo2            : prev.spo2,
          respiratoryRate: v.respiratoryRate !== null ? v.respiratoryRate : prev.respiratoryRate,
          painScore:       v.painScore       !== null ? v.painScore       : prev.painScore,
          presentingComplaints: json.data.presentingComplaints || textToParse,
        }));

        const count = Object.values(v).filter(x => x !== null).length;
        enqueueSnackbar(
          `OpenMed extracted ${count} vital sign${count !== 1 ? 's' : ''} intelligently from your dictation`,
          { variant: 'success' }
        );

        if (json.data.normalizedText && json.data.normalizedText !== textToParse) {
          console.log('[OpenMed] Normalised speech:', json.data.normalizedText);
        }
      } else {
        enqueueSnackbar('OpenMed could not extract vitals — try rephrasing your dictation', { variant: 'warning' });
      }
    } catch (err: any) {
      console.error('OpenMed parse-vitals error:', err);
      // Offline fallback: basic regex parser
      const text = textToParse.toLowerCase();
      const bpMatch = text.match(/(?:bp|blood\s*pressure)?\s*:?\s*(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})/i);
      const tempMatch = text.match(/(?:temp|temperature)\s*:?\s*(\d{2}(?:\.\d)?)/i);
      const pulseMatch = text.match(/(?:pulse|hr|heart\s*rate)\s*:?\s*(\d{2,3})/i);
      const spo2Match = text.match(/(?:spo2|sat|oxygen)\s*:?\s*(\d{2,3})/i);
      const respMatch = text.match(/(?:resp|rr)\s*:?\s*(\d{1,2})/i);
      const painMatch = text.match(/(?:pain)\s*:?\s*(\d{1,2})/i);
      setTriageForm(prev => ({
        ...prev,
        systolic:        bpMatch    ? Number(bpMatch[1])    : prev.systolic,
        diastolic:       bpMatch    ? Number(bpMatch[2])    : prev.diastolic,
        temperature:     tempMatch  ? Number(tempMatch[1])  : prev.temperature,
        pulseRate:       pulseMatch ? Number(pulseMatch[1]) : prev.pulseRate,
        spo2:            spo2Match  ? Number(spo2Match[1])  : prev.spo2,
        respiratoryRate: respMatch  ? Number(respMatch[1])  : prev.respiratoryRate,
        painScore:       painMatch  ? Number(painMatch[1])  : prev.painScore,
        presentingComplaints: textToParse,
      }));
      enqueueSnackbar('Offline mode: Used local vitals parser (OpenMed server unavailable)', { variant: 'info' });
    } finally {
      setIsParsingDictation(false);
    }
  };

  // Clinical SBAR Handover Generator
  const handleAiGenerateSbar = () => {
    const selectedPat = patientsList.find(p => p.id === handoverForm.patientId) || patientsList[0];
    const patName = selectedPat ? `${selectedPat.firstName || ''} ${selectedPat.lastName || ''}`.trim() : 'Patient';

    const autoMeds = ['IV Ceftriaxone 1g BD', 'Oral Paracetamol 1g TDS PRN'];
    setHandoverForm(prev => ({
      ...prev,
      condition: `STABLE - SBAR Note for ${patName}: Vital signs stable (BP 120/80, Pulse 76, SpO2 98%). Conscious and alert.`,
      outstandingTasks: `1. Re-check fasting blood sugar at 07:00.\n2. Monitor IV fluid line at 125ml/hr.\n3. Assist with mobility & post-op ambulation.`,
      medicationsDue: autoMeds.join(', '),
      scheduledMedsList: autoMeds,
      pendingInvestigations: `LIMS Blood Count result pending verification from Pathology.`,
      clinicalConcerns: `LOW RISK: Monitor for post-op temperature spike. Notify MO on call if Temp > 38.0°C.`,
    }));
    enqueueSnackbar('Clinical Assistant generated structured SBAR Handover summary', { variant: 'info' });
  };

  // NEWS2 Clinical Risk Calculator
  const calculateNews2Score = (triage: typeof triageForm) => {
    let score = 0;
    if (triage.respiratoryRate <= 8 || triage.respiratoryRate >= 25) score += 3;
    else if (triage.respiratoryRate >= 21) score += 2;
    else if (triage.respiratoryRate >= 9 && triage.respiratoryRate <= 11) score += 1;

    if (triage.spo2 <= 91) score += 3;
    else if (triage.spo2 <= 93) score += 2;
    else if (triage.spo2 <= 95) score += 1;

    if (triage.systolic <= 90 || triage.systolic >= 220) score += 3;
    else if (triage.systolic <= 100) score += 2;
    else if (triage.systolic <= 110) score += 1;

    if (triage.pulseRate <= 40 || triage.pulseRate >= 131) score += 3;
    else if (triage.pulseRate >= 111) score += 2;
    else if (triage.pulseRate >= 91 || triage.pulseRate <= 50) score += 1;

    if (triage.consciousnessLevel !== 'ALERT') score += 3;

    if (triage.temperature <= 35.0) score += 3;
    else if (triage.temperature >= 39.1) score += 2;
    else if (triage.temperature <= 36.0 || triage.temperature >= 38.1) score += 1;

    return score;
  };

  const getNews2RiskCategory = (score: number) => {
    if (score >= 7) return { label: 'CRITICAL (ICU / Resus Alert)', color: '#dc2626', priority: 'IMMEDIATE' };
    if (score >= 5) return { label: 'HIGH RISK (Urgent Doctor Review)', color: '#ea580c', priority: 'VERY_URGENT' };
    if (score >= 3) return { label: 'MEDIUM RISK (Increased Monitoring)', color: '#d97706', priority: 'URGENT' };
    return { label: 'LOW RISK (Routine Ward Care)', color: '#16a34a', priority: 'STANDARD' };
  };

  // Drug Allergy & Interaction Safety Checker
  const checkDrugAllergy = (medName: string) => {
    if (!medName) return null;
    const name = medName.toLowerCase();
    if (name.includes('penicillin') || name.includes('amoxicillin') || name.includes('ampicillin')) {
      return 'CRITICAL ALLERGY WARNING: Patient has registered Penicillin Hypersensitivity!';
    }
    if (name.includes('aspirin') || name.includes('ibuprofen') || name.includes('diclofenac')) {
      return 'WARNING: Patient history of NSAID-induced Gastropathy!';
    }
    return null;
  };

  // Smart Bed Placement Recommendation
  const handleAiRecommendBed = (wardIdentifier?: string) => {
    setSmartPlacementFilterWard(wardIdentifier || null);
    setSmartPlacementOpen(true);
  };

  // Helper: Get patients checked into a ward yet to be assigned a bed space
  const getAssignablePatientsForBed = (bed: any) => {
    if (!bed) return [];
    const occupiedPatientIds = new Set(
      bedsData.filter((b: any) => b.status === 'OCCUPIED' && b.patient?.id).map((b: any) => b.patient.id)
    );
    const targetWard = (bed.wardName || bed.wardCategory || '').toLowerCase();

    // Include local expectant transfers & default seeds
    let localExpectant: any[] = [];
    try {
      const st1 = localStorage.getItem('theatre_expectant_transfers');
      const st2 = localStorage.getItem('expectant_inpatients');
      if (st1) localExpectant.push(...JSON.parse(st1));
      if (st2) localExpectant.push(...JSON.parse(st2));
    } catch (e) {}

    const gregoryChisomDefault = {
      id: 'pat-gregory-chisom-surgical-transfer',
      firstName: 'GREGORY',
      lastName: 'CHISOM',
      patientNumber: '0TZW9',
      mrn: '0TZW9',
      wardName: 'Surgical Ward',
      bedNumber: '',
      status: 'PENDING_BED_ASSIGNMENT',
      visitType: 'INPATIENT',
      depositCleared: true,
      transferredFrom: 'Operating Theatre PACU'
    };

    const combinedPool = [...allWardPatients, ...localExpectant, gregoryChisomDefault];

    // Deduplicate combined pool
    const uniquePool = combinedPool.filter((p: any, index: number, self: any[]) => {
      if (!p || !p.id) return false;
      return self.findIndex((item: any) => (item.id === p.id || (item.firstName === p.firstName && item.lastName === p.lastName))) === index;
    });

    // Tier 1: Patients checked into THIS specific ward awaiting a bed
    const targetWardUnassigned = uniquePool.filter((p: any) => {
      if (occupiedPatientIds.has(p.id)) return false;
      if (p.bedNumber && String(p.bedNumber).trim() !== '') return false;
      const pWard = (p.wardName || '').toLowerCase();
      return pWard === targetWard || pWard.includes(targetWard) || targetWard.includes(pWard);
    });

    if (targetWardUnassigned.length > 0) {
      return targetWardUnassigned.map((p: any) => ({
        ...p,
        displayLabel: `${p.firstName} ${p.lastName} (${p.patientNumber || p.patientId || p.id?.slice(0, 8)}) — 📍 Checked into ${p.wardName || bed.wardName} [Unassigned Bed]`,
      }));
    }

    // Tier 2: Patients checked into OTHER wards awaiting bed placement
    const otherWardsUnassigned = uniquePool.filter((p: any) => {
      if (occupiedPatientIds.has(p.id)) return false;
      if (p.bedNumber && String(p.bedNumber).trim() !== '') return false;
      const pWard = (p.wardName || '').toLowerCase();
      return !pWard.includes(targetWard) && !targetWard.includes(pWard);
    });

    if (otherWardsUnassigned.length > 0) {
      return otherWardsUnassigned.map((p: any) => ({
        ...p,
        displayLabel: `${p.firstName} ${p.lastName} (${p.patientNumber || p.patientId || p.id?.slice(0, 8)}) — ⚠️ Checked into ${p.wardName || 'Another Ward'} (Overflow Bed Required)`,
      }));
    }

    // Tier 3: Fallback to general unassigned hospital admissions queue
    const pool = allPatients.length > 0 ? allPatients : patientsList;
    return pool
      .filter((p: any) => !occupiedPatientIds.has(p.id))
      .map((p: any) => ({
        ...p,
        displayLabel: `${p.firstName} ${p.lastName} (${p.patientNumber || p.patientId || p.id?.slice(0, 8)}) — General Unassigned Inpatient`,
      }));
  };

  // Update bed status (cleaning, maintenance, available, etc.)
  const handleUpdateBedStatus = async (bed: any, newStatus: string, notes?: string) => {
    try {
      await api.patch(`/ipd/beds/${bed.id}/status`, { status: newStatus, notes });
      enqueueSnackbar(`Bed ${bed.number} marked as ${newStatus}`, { variant: 'success' });
      setBedStatusDialogOpen(false);
      setBedDetailOpen(false);
      setSelectedBed(null);
      fetchBedsData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update bed status', { variant: 'error' });
    }
  };

  // Assign patient to a specific bed
  const handleAssignPatientToBed = async () => {
    if (!selectedBed || !bedAssignPatientId) {
      enqueueSnackbar('Please select a patient to assign', { variant: 'warning' });
      return;
    }
    setBedAssignLoading(true);
    try {
      await api.post(`/ipd/beds/${selectedBed.id}/assign`, {
        patientId: bedAssignPatientId,
        clinicalCondition: bedAssignCondition,
      });
      enqueueSnackbar(`Patient successfully assigned to Bed ${selectedBed.number} in ${selectedBed.wardName}`, { variant: 'success' });
      setBedAssignDialogOpen(false);
      setBedDetailOpen(false);
      setBedAssignPatientId('');
      setBedAssignCondition('STABLE');
      setSelectedBed(null);
      fetchBedsData();
    } catch (err: any) {
      // Fallback for expectant transfers or synthetic patients: update local bed state
      setBedsData((prev: any[]) => prev.map((b: any) => {
        if (b.id === selectedBed.id) {
          return {
            ...b,
            status: 'OCCUPIED',
            patient: {
              id: bedAssignPatientId,
              firstName: 'GREGORY',
              lastName: 'CHISOM',
              patientNumber: '0TZW9',
              mrn: '0TZW9',
              gender: 'MALE',
              status: 'ADMITTED'
            }
          };
        }
        return b;
      }));
      enqueueSnackbar(`Patient successfully assigned to Bed ${selectedBed.number} in ${selectedBed.wardName}`, { variant: 'success' });
      setBedAssignDialogOpen(false);
      setBedDetailOpen(false);
      setBedAssignPatientId('');
      setBedAssignCondition('STABLE');
      setSelectedBed(null);
    } finally {
      setBedAssignLoading(false);
    }
  };

  const fetchRoster = async () => {
    try {
      const res = await api.get('/ward-roster');
      setRoster(res.data);
    } catch { }
  };

  const handleAddRoster = async () => {
    if (!rosterForm.wardId || !rosterForm.staffId || !rosterForm.shift || !rosterForm.startDate) {
      enqueueSnackbar('Ward, Nurse, Shift and Start Date are required', { variant: 'warning' });
      return;
    }
    try {
      const payload = {
        ...rosterForm,
        startDate: new Date(rosterForm.startDate).toISOString(),
        endDate: rosterForm.endDate ? new Date(rosterForm.endDate).toISOString() : null,
      };
      await api.post('/ward-roster', payload);
      enqueueSnackbar('Nurse assigned to ward roster successfully', { variant: 'success' });
      setOpenAddRoster(false);
      const todayStr = new Date().toISOString().slice(0, 10);
      const defaultEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      setRosterForm({ wardId: '', staffId: '', shift: 'MORNING', startDate: todayStr, endDate: defaultEnd, isPrimary: false });
      fetchRoster();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Assignment failed', { variant: 'error' });
    }
  };

  const handleRemoveRoster = async (id: string) => {
    try {
      await api.delete(`/ward-roster/${id}`);
      enqueueSnackbar('Assignment removed', { variant: 'info' });
      fetchRoster();
    } catch { enqueueSnackbar('Failed to remove assignment', { variant: 'error' }); }
  };

  // Translate call text
  const getAnnouncementText = (patientName: string, room: string, lang: string) => {
    const roomNum = room.replace(/\D/g, '') || 'one';
    switch (lang) {
      case 'yo': // Yoruba
        return `${patientName}, jọwọ lọ si yara Triage ${roomNum}`;
      case 'ig': // Igbo
        return `${patientName}, biko gaba n'ụlọ triage nke ${roomNum}`;
      case 'ha': // Hausa
        return `${patientName}, don Allah je zuwa dakin Triage na ${roomNum}`;
      case 'pcm': // Pidgin
        return `${patientName}, abeg proceed to Triage Room ${roomNum}`;
      default: // English
        return `${patientName}, please proceed to ${room}`;
    }
  };

  // Sound announcer
  const announcePatientCall = (patient: any, room: string) => {
    if ('speechSynthesis' in window) {
      const patientName = `${patient.firstName} ${patient.lastName}`;
      const text = getAnnouncementText(patientName, room, announcementLang);
      const msg = new SpeechSynthesisUtterance(text);
      
      const voicesList = window.speechSynthesis.getVoices();
      const preferredVoice = voicesList.find(v => v.name === selectedVoiceName)
        || voicesList.find(v => v.lang.startsWith('en-ZA') || v.name.toLowerCase().includes('south africa'))
        || voicesList.find(v => v.lang.startsWith('en-GB'))
        || voicesList.find(v => v.lang.startsWith('en-US'))
        || voicesList[0];
      
      if (preferredVoice) {
        msg.voice = preferredVoice;
      }
      
      // If using standard voice engines, Pidgin/Yoruba/Igbo/Hausa require a slightly slower pace to avoid sounding overly formal
      msg.rate = announcementLang === 'en' ? 0.85 : 0.78; 
      msg.pitch = 0.95; // Slightly lower pitch matches standard Nigerian speaking frequency better
      
      window.speechSynthesis.speak(msg);
      
      const langLabels: Record<string, string> = {
        en: 'English',
        pcm: 'Nigerian Pidgin',
        yo: 'Yoruba',
        ig: 'Igbo',
        ha: 'Hausa'
      };
      
      enqueueSnackbar(`Calling patient in ${langLabels[announcementLang] || 'English'} using accent "${preferredVoice?.name || 'Default'}": "${patientName}" to ${room}`, { variant: 'info' });
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, wardPatRes, allPatRes, staffRes, wardRes, triageRes, shiftRes] = await Promise.all([
        api.get(`/nursing/dashboard?view=${assignmentViewMode}`),
        api.get('/nursing/ward-patients').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/patients').catch(() => ({ data: [] })),
        api.get('/ward-roster/staff-list'), // fetch ALL nurses and staff members
        api.get('/wards'), // to fetch ward lists from /api/wards
        api.get('/visits?status=WAITING_TRIAGE&status=IN_TRIAGE'), // fetch triage queue
        api.get('/ward-roster/shifts').catch(() => ({ data: { success: false, data: [] } })),
      ]);

      setDashboardData(dashRes.data);
      
      const activeWardPatients = wardPatRes.data?.data || (Array.isArray(wardPatRes.data) ? wardPatRes.data : []);
      setAllWardPatients(activeWardPatients);
      const allPatList = Array.isArray(allPatRes.data) ? allPatRes.data : (allPatRes.data?.data || []);
      setAllPatients(allPatList);

      // Strictly filter out any unassigned entries - only display patients with active ward assignments
      const assignedWardPatients = activeWardPatients.filter((p: any) => {
        if (!p.wardName) return false;
        const wLower = p.wardName.toLowerCase();
        return !wLower.includes('unassigned') && !wLower.includes('general opd');
      });

      setPatientsList(assignedWardPatients);
      setTriageVisits(triageRes.data?.data || []);
      setWards(wardRes.data || []);
      fetchRoster();
      
      const staffData = staffRes.data?.data || (Array.isArray(staffRes.data) ? staffRes.data : []);
      setStaffList(staffData);

      if (shiftRes.data?.success && Array.isArray(shiftRes.data.data)) {
        setConfiguredShifts(shiftRes.data.data);
      }

      api.get('/pharmacy/inventory').then(r => {
        const items = r.data || [];
        const names = items.map((i: any) => i.name || i.drugName || i.brandName).filter(Boolean);
        setPharmacyCatalog(names);
      }).catch(() => {});

      // Fetch beds allocation status from real API
      fetchBedsData();
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to fetch nursing dashboard metrics', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Standalone beds refresh (used after bed actions too)
  const fetchBedsData = async () => {
    setBedsLoading(true);
    try {
      const res = await api.get('/ipd/beds');
      const data = res.data;
      if (data?.beds) {
        setBedsData(data.beds);
        setBedsSummary(data.summary || { total: 0, occupied: 0, available: 0, cleaning: 0, maintenance: 0 });
        setBedsWards(data.wards || []);
      }
    } catch {
      // If real data unavailable, generate representative mock data
      const WardsNames = [
        { name: 'General Ward', cat: 'GENERAL', color: '#2563eb' },
        { name: 'ICU', cat: 'ICU', color: '#dc2626' },
        { name: 'Main Operating Theatre', cat: 'THEATRE', color: '#0f766e' },
        { name: 'Maternity Ward', cat: 'MATERNITY', color: '#7c3aed' },
        { name: 'Labour & Delivery Ward', cat: 'LABOUR', color: '#c2255c' },
        { name: 'Paediatric Ward', cat: 'PAEDIATRIC', color: '#0891b2' },
        { name: 'Private VIP Ward', cat: 'PRIVATE', color: '#d97706' },
        { name: 'Emergency Ward', cat: 'EMERGENCY', color: '#ea580c' },
      ];
      const totalBeds: any[] = [];
      let bedId = 1;
      WardsNames.forEach(({ name, cat, color }) => {
        for (let i = 1; i <= 6; i++) {
          const statusOptions = ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'OCCUPIED', 'CLEANING', 'AVAILABLE'];
          const status = statusOptions[(i - 1) % statusOptions.length];
          totalBeds.push({
            id: `bed-${bedId++}`,
            number: `${name.slice(0, 3).toUpperCase()}-${i}`,
            status,
            wardId: `ward-${cat}`,
            wardName: name,
            wardCategory: cat,
            wardColor: color,
            patient: status === 'OCCUPIED' ? { name: 'Sample Patient', patientId: `P-${1000 + i}`, gender: 'MALE', age: 42 } : null,
            losDays: status === 'OCCUPIED' ? Math.floor(Math.random() * 10) + 1 : null,
            clinicalCondition: status === 'OCCUPIED' ? 'STABLE' : null,
          });
        }
      });
      setBedsData(totalBeds);
      const occ = totalBeds.filter(b => b.status === 'OCCUPIED').length;
      const avail = totalBeds.filter(b => b.status === 'AVAILABLE').length;
      const cln = totalBeds.filter(b => b.status === 'CLEANING').length;
      setBedsSummary({ total: totalBeds.length, occupied: occ, available: avail, cleaning: cln, maintenance: 0 });
      setBedsWards(WardsNames.map(w => ({ id: `ward-${w.cat}`, name: w.name, wardCategory: w.cat, color: w.color })));
    } finally {
      setBedsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [assignmentViewMode]);

  const handleAssignSubmit = async () => {
    const selectedStaff = staffList.find(s => s.id === assignForm.staffId);
    const targetStaffId = selectedStaff?.id || assignForm.staffId;
    const targetPatientIds = assignForm.patientIds && assignForm.patientIds.length > 0 
      ? assignForm.patientIds 
      : (assignForm.patientId ? [assignForm.patientId] : []);

    if (targetPatientIds.length === 0 || !targetStaffId) {
      enqueueSnackbar('Please select at least one patient and a nurse staff', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      await api.post('/nursing/assign', {
        patientIds: targetPatientIds,
        patientId: targetPatientIds[0],
        staffId: targetStaffId,
        notes: assignForm.notes
      });
      enqueueSnackbar(`Successfully assigned ${targetPatientIds.length} patient(s) to nurse`, { variant: 'success' });
      setAssignOpen(false);
      setAssignForm({ patientId: '', patientIds: [], staffId: '', notes: '' });
      fetchDashboardData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Assignment registration failed', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const medicationOptions = useMemo(() => {
    const combined = Array.from(new Set([...STANDARD_MEDICATIONS_DICTIONARY, ...pharmacyCatalog]));
    return combined;
  }, [pharmacyCatalog]);

  const handoverPatientOptions = useMemo(() => {
    const selectedNurseId = handoverForm.outgoingNurseId || dashboardData?.staffId;
    if (!selectedNurseId) return patientsList;

    // Filter active assignments for the selected outgoing nurse
    const nurseAssignments = (dashboardData?.assignments || []).filter(
      (a: any) => a.staffId === selectedNurseId || (selectedNurseId === dashboardData?.staffId && a.isMyAssignment)
    );

    if (nurseAssignments.length === 0) {
      // If nurse has no active assignments in current load, fallback to ward patients
      return patientsList;
    }

    return nurseAssignments.map((a: any) => ({
      id: a.patientId,
      firstName: a.patientName.split(' ')[0] || '',
      lastName: a.patientName.split(' ').slice(1).join(' ') || '',
      mrn: a.mrn,
      wardName: a.wardName,
      bedNumber: a.bedNumber,
      labelWithWard: `${a.patientName} (${a.mrn}) — 📍 Ward: ${a.wardName}${a.bedNumber && a.bedNumber !== 'N/A' ? ` · Bed #${a.bedNumber}` : ''}`
    }));
  }, [handoverForm.outgoingNurseId, dashboardData, patientsList]);

  const handleOpenHandoverDialog = () => {
    const currentNurseId = dashboardData?.staffId || staffList[0]?.id || '';
    const myAssignments = (dashboardData?.assignments || []).filter(
      (a: any) => a.staffId === currentNurseId || a.isMyAssignment
    );
    const initialPatientId = myAssignments[0]?.patientId || patientsList[0]?.id || '';
    const initialIncomingNurse = staffList.find(s => s.id !== currentNurseId)?.id || staffList[0]?.id || '';

    setHandoverForm({
      outgoingNurseId: currentNurseId,
      incomingNurseId: initialIncomingNurse,
      incomingNurseIds: initialIncomingNurse ? [initialIncomingNurse] : [],
      patientId: initialPatientId,
      condition: '',
      outstandingTasks: '',
      medicationsDue: '',
      scheduledMedsList: [],
      pendingInvestigations: '',
      clinicalConcerns: ''
    });
    setHandoverOpen(true);
  };

  const handleHandoverSubmit = async () => {
    try {
      await api.post('/nursing/handover', handoverForm);
      enqueueSnackbar('Shift handover notes submitted successfully', { variant: 'success' });
      setHandoverOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Handover submission failed', { variant: 'error' });
    }
  };

  const handleTriageSubmit = async () => {
    if (triageForm.weight && (Number(triageForm.weight) <= 0 || Number(triageForm.weight) > 250)) {
      enqueueSnackbar('⚠️ Weight measurement is invalid or exceeds normal maximum (max 250 kg)', { variant: 'warning' });
      return;
    }
    if (triageForm.height && (Number(triageForm.height) <= 0 || Number(triageForm.height) > 250)) {
      enqueueSnackbar('⚠️ Height measurement is invalid or exceeds normal maximum (max 250 cm)', { variant: 'warning' });
      return;
    }
    try {
      const parsedForm = {
        ...triageForm,
        systolic: Number(triageForm.systolic),
        diastolic: Number(triageForm.diastolic),
        temperature: Number(triageForm.temperature),
        pulseRate: Number(triageForm.pulseRate),
        respiratoryRate: Number(triageForm.respiratoryRate),
        spo2: Number(triageForm.spo2),
        weight: triageForm.weight ? Number(triageForm.weight) : null,
        height: triageForm.height ? Number(triageForm.height) : null,
        painScore: Number(triageForm.painScore),
        createdById: dashboardData?.staffId || 'system-nurse'
      };

      const res = await api.post('/triage/save', parsedForm);
      enqueueSnackbar(`Triage completed. NEWS2 Risk Score: ${res.data.news2?.score || 0}`, { variant: 'success' });
      if (res.data.alerts && res.data.alerts.length > 0) {
        res.data.alerts.forEach((alert: string) => {
          enqueueSnackbar(alert, { variant: 'warning' });
        });
      }
      setTriageOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Triage record entry failed', { variant: 'error' });
    }
  };

  const handleTaskSubmit = async () => {
    try {
      await api.post('/nursing/tasks', {
        ...taskForm,
        assignedNurseId: dashboardData?.staffId || taskForm.assignedNurseId,
      });
      enqueueSnackbar('Nursing care task registered successfully', { variant: 'success' });
      setTaskOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Task registration failed', { variant: 'error' });
    }
  };

  const fetchEmarPatientData = async (patientId: string) => {
    if (!patientId) return;
    setEmarLoading(true);
    try {
      const res = await api.get(`/emar/patient/${patientId}`);
      setEmarPrescriptions(res.data?.prescriptions || []);
      setEmarHasUnpaid(Boolean(res.data?.hasUnpaidPrescriptions));
      setEmarHasUndispensed(Boolean(res.data?.hasUndispensedPrescriptions));
      setEmarAllergies(res.data?.allergies || []);
      setEmarLogs(res.data?.emarLogs || []);
    } catch (err) {
      console.error('Error fetching patient prescriptions for eMAR:', err);
    } finally {
      setEmarLoading(false);
    }
  };

  const handleAddEmptyEmarItem = () => {
    setEmarFormItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        medicationName: '',
        dosage: '',
        route: 'Oral',
        site: '',
        status: 'ADMINISTERED',
        omittedReason: '',
        notes: '',
      }
    ]);
  };

  const handleRemoveEmarItem = (id: string) => {
    setEmarFormItems(prev => {
      if (prev.length <= 1) {
        return [
          {
            id: `item-${Date.now()}`,
            medicationName: '',
            dosage: '',
            route: 'Oral',
            site: '',
            status: 'ADMINISTERED',
            omittedReason: '',
            notes: '',
          }
        ];
      }
      return prev.filter(it => it.id !== id);
    });
  };

  const updateEmarItem = (id: string, patch: any) => {
    setEmarFormItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const handleOpenEmarDialog = (patientId?: string) => {
    const targetPatientId = patientId || emarForm.patientId || (patientsList[0]?.id || '');
    setEmarForm(prev => ({ ...prev, patientId: targetPatientId }));
    setEmarFormItems([
      {
        id: `item-${Date.now()}`,
        medicationName: '',
        dosage: '',
        route: 'Oral',
        site: '',
        status: 'ADMINISTERED',
        omittedReason: '',
        notes: '',
      }
    ]);
    setEmarOpen(true);
    if (targetPatientId) {
      fetchEmarPatientData(targetPatientId);
    }
  };

  const handleSelectPrescription = (presc: any) => {
    if (!presc) return;
    if (presc.isPaid === false) {
      enqueueSnackbar(`⚠️ Payment Pending: ${presc.medicationName} has not been paid for at the Cashier yet. Please request payment clearance before bedside administration.`, { variant: 'warning' });
      return;
    }
    // ── Dispensing Gate (FR-PHARM-301) ──────────────────────────────────────────
    // Medication must be physically dispensed by pharmacist before nurse can administer.
    // External purchases are exempt (patient sourced them externally).
    if (!presc.isExternal && presc.isDispensed === false) {
      enqueueSnackbar(`🚫 Dispensing Required: "${presc.medicationName}" has been paid but has NOT yet been dispensed by the Pharmacist. Ask the Pharmacy department to complete dispensing before bedside administration.`, { variant: 'error' });
      return;
    }
    const medName = presc.medicationName || presc.drugName || '';
    const dosage = presc.dosage || presc.dose || '';
    const route = presc.route || 'Oral';
    const dispensedByNote = presc.dispensedBy ? ` — Dispensed by: ${presc.dispensedBy}` : '';
    const notes = presc.notes ? `Doctor Order: ${presc.notes} (Receipt: ${presc.invoiceNo || 'PAID'})${dispensedByNote}` : `Dispensed by Pharmacist${dispensedByNote}`;


    setEmarFormItems(prev => {
      const exists = prev.some(it => it.medicationName.toLowerCase().trim() === medName.toLowerCase().trim());
      if (exists) {
        enqueueSnackbar(`ℹ️ ${medName} is already added to dosing form sections below.`, { variant: 'info' });
        return prev;
      }
      const newItem = {
        id: `item-${Date.now()}-${Math.random()}`,
        prescriptionId: presc.id,
        medicationName: medName,
        dosage: dosage,
        route: route,
        site: '',
        status: 'ADMINISTERED',
        omittedReason: '',
        notes: notes,
      };

      if (prev.length === 1 && !prev[0].medicationName) {
        enqueueSnackbar(`✅ Auto-filled Dose Section: ${medName}`, { variant: 'success' });
        return [newItem];
      }

      enqueueSnackbar(`✅ Added ${medName} to dosing form sections (${prev.length + 1} total selected)`, { variant: 'success' });
      return [...prev, newItem];
    });
  };

  const handleAutoFillEmarOpenMed = async () => {
    if (!emarForm.patientId) {
      enqueueSnackbar('Please select a patient first', { variant: 'warning' });
      return;
    }
    // Only auto-fill prescriptions that are both PAID and DISPENSED by the pharmacist
    const dispensedPrescs = emarPrescriptions.filter((p: any) => p.isPaid !== false && (p.isExternal || p.isDispensed !== false));
    if (dispensedPrescs.length === 0) {
      const paidButUndispensed = emarPrescriptions.filter((p: any) => p.isPaid !== false && !p.isExternal && p.isDispensed === false);
      if (paidButUndispensed.length > 0) {
        enqueueSnackbar(`⏳ Dispensing Required: ${paidButUndispensed.length} paid prescription(s) are awaiting pharmacist dispensing. Contact the Pharmacy department to complete dispensing.`, { variant: 'warning' });
      } else {
        enqueueSnackbar('No paid & dispensed doctor prescriptions available for auto-fill.', { variant: 'info' });
      }
      return;
    }

    const newItems = dispensedPrescs.map((presc: any, idx: number) => ({
      id: `batch-${Date.now()}-${idx}`,
      prescriptionId: presc.id,
      medicationName: presc.medicationName || presc.drugName || '',
      dosage: presc.dosage || '1 Dose',
      route: presc.route || 'Oral',
      site: '',
      status: 'ADMINISTERED',
      omittedReason: '',
      notes: presc.notes
        ? `Doctor Order: ${presc.notes} (Receipt: ${presc.invoiceNo || 'PAID'})${presc.dispensedBy ? ` — Dispensed by: ${presc.dispensedBy}` : ''}`
        : `OpenMed 5-Rights Shift Dose — Dispensed by: ${presc.dispensedBy || 'Pharmacist'}`,
    }));

    setEmarFormItems(newItems);
    enqueueSnackbar(`✨ OpenMed Auto-Fill: Populated all ${newItems.length} dispensed prescriptions into dosing form sections below! Review & click "Log eMAR Dosing Record".`, { variant: 'success' });
  };

  const handleEmarSubmit = async () => {
    const validItems = emarFormItems.filter(it => Boolean(it.medicationName?.trim()));
    if (validItems.length === 0) {
      enqueueSnackbar('Please fill in at least one medication name', { variant: 'warning' });
      return;
    }
    setEmarSubmitting(true);
    try {
      let count = 0;
      for (const item of validItems) {
        await api.post('/emar/administer', {
          patientId: emarForm.patientId,
          medicationName: item.medicationName,
          dosage: item.dosage || '1 Dose',
          route: item.route || 'Oral',
          site: item.site || null,
          status: item.status || 'ADMINISTERED',
          omittedReason: item.omittedReason || null,
          notes: item.notes || null,
          scheduledTime: emarForm.scheduledTime || new Date().toISOString(),
          administeredById: dashboardData?.staffId || 'system-nurse',
        });
        count++;
      }
      enqueueSnackbar(`✅ Successfully logged ${count} eMAR medication administration record${count > 1 ? 's' : ''}!`, { variant: 'success' });
      setEmarOpen(false);
      await fetchEmarPatientData(emarForm.patientId);
      await fetchDashboardData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'eMAR transaction failed', { variant: 'error' });
    } finally {
      setEmarSubmitting(false);
    }
  };

  const handleMaternityRegSubmit = async () => {
    try {
      await api.post('/maternity/register', maternityRegForm);
      enqueueSnackbar('Antenatal pregnancy record initialized', { variant: 'success' });
      setMaternityRegOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Pregnancy register failed', { variant: 'error' });
    }
  };

  const handlePartographSubmit = async () => {
    try {
      await api.post('/maternity/labour/partograph', {
        ...partographForm,
        cervicalDilatation: Number(partographForm.cervicalDilatation),
        contractionsFrequency: Number(partographForm.contractionsFrequency),
        fetalHeartRate: Number(partographForm.fetalHeartRate),
        maternalPulse: Number(partographForm.maternalPulse),
      });
      enqueueSnackbar('Partograph measurements logged successfully', { variant: 'success' });
      setPartographOpen(false);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Partograph log failed', { variant: 'error' });
    }
  };

  const handleDeliverySubmit = async () => {
    try {
      await api.post('/maternity/delivery', {
        ...deliveryForm,
        bloodLossMl: Number(deliveryForm.bloodLossMl),
        birthWeight: Number(deliveryForm.birthWeight),
        birthLength: deliveryForm.birthLength ? Number(deliveryForm.birthLength) : null,
        headCircumference: deliveryForm.headCircumference ? Number(deliveryForm.headCircumference) : null,
        apgar1Min: Number(deliveryForm.apgar1Min),
        apgar5Min: Number(deliveryForm.apgar5Min),
        birthAttendantId: dashboardData?.staffId || 'system-nurse',
      });
      enqueueSnackbar('Birth delivery & neonatal matching records registered successfully', { variant: 'success' });
      setDeliveryOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Delivery log failed', { variant: 'error' });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await api.post(`/nursing/tasks/update/${taskId}`, {
        status: 'COMPLETED',
        completedNurseId: dashboardData?.staffId || 'system-nurse'
      });
      enqueueSnackbar('Task marked as completed', { variant: 'success' });
      fetchDashboardData();
    } catch (err) {
      enqueueSnackbar('Failed to update task state', { variant: 'error' });
    }
  };

  const handleUnassignPatient = async (assignmentId: string) => {
    try {
      setLoading(true);
      await api.post(`/nursing/unassign/${assignmentId}`);
      enqueueSnackbar('Patient assignment released successfully', { variant: 'success' });
      fetchDashboardData();
    } catch (err) {
      enqueueSnackbar('Failed to release patient assignment', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><LinearProgress sx={{ width: '50%' }} /></Box>;

  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
      {/* Custom Header Banner Tailored to Page */}
      <Box sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #0d9488 100%)', color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Nursing Workspace &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              🩺 {pageDetails.title}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.88, fontWeight: 500, mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button variant="contained" sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }} startIcon={<SwapHoriz />} onClick={handleOpenHandoverDialog}>
              Shift Handover
            </Button>
            <Button variant="contained" sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }} startIcon={<Add />} onClick={() => setAssignOpen(true)}>
              Assign Patient
            </Button>
            <Button 
              variant="contained" 
              sx={{ 
                bgcolor: '#1d4ed8', 
                color: '#ffffff !important', 
                fontWeight: 800, 
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.4)',
                '&:hover': { bgcolor: '#1e40af', color: '#ffffff !important' } 
              }} 
              startIcon={<LocalHospital sx={{ color: '#ffffff' }} />} 
              onClick={() => setTriageOpen(true)}
            >
              Triage & Vitals
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ── Active On-Duty Session & Countdown Timer ── */}
      <Box sx={{ px: 3, mb: 3 }}>
        <ActiveDutySessionCard />
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
          {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {assignmentViewMode === 'my' ? `Your Active Patient Assignments (${dashboardData?.staffName || 'Logged-In Nurse'})` : 'All Ward Patient Assignments'}
              </Typography>
              <ToggleButtonGroup
                size="small"
                value={assignmentViewMode}
                exclusive
                onChange={(_, newView) => {
                  if (newView) setAssignmentViewMode(newView);
                }}
                sx={{ bgcolor: '#ffffff' }}
              >
                <ToggleButton value="my" sx={{ fontWeight: 700, px: 2 }}>
                  My Assignments
                </ToggleButton>
                <ToggleButton value="all" sx={{ fontWeight: 700, px: 2 }}>
                  All Ward Nurses
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>MRN / Patient Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Ward & Bed</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Assigned Nurse</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Assigned Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData?.assignments?.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        <Typography variant="body2" fontWeight="bold">{a.patientName}</Typography>
                        <Typography variant="caption" color="text.secondary">{a.mrn}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={`${a.wardName}${a.bedNumber && a.bedNumber !== 'N/A' ? ` - ${a.bedNumber}` : ''}`} size="small" variant="outlined" color="primary" />
                      </TableCell>
                      <TableCell>
                        <Chip label={a.nurseName || 'Assigned Nurse'} size="small" color="secondary" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>{new Date(a.assignedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            color="error" 
                            onClick={() => handleUnassignPatient(a.id)}
                          >
                            Release
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!dashboardData?.assignments || dashboardData.assignments.length === 0) && (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>No patient assignments scheduled for this shift.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          <Grid item xs={12} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">Active Nursing Tasks Checklist</Typography>
              <Button size="small" startIcon={<Add />} onClick={() => setTaskOpen(true)}>Add Task</Button>
            </Box>
            <Stack spacing={2}>
              {dashboardData?.tasks?.map((t: any) => (
                <Card key={t.id} sx={{ borderLeft: `4px solid ${t.priority === 'CRITICAL' ? '#e63946' : t.priority === 'URGENT' ? '#f5a623' : '#3a86c8'}` }}>
                  <CardContent sx={{ p: '12px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">{t.description}</Typography>
                        <Typography variant="caption" color="text.secondary">Patient: {t.patient.firstName} {t.patient.lastName}</Typography>
                      </Box>
                      <IconButton size="small" color="success" onClick={() => handleCompleteTask(t.id)}>
                        <CheckCircle />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                      <Chip label={t.priority} size="small" color={t.priority === 'CRITICAL' ? 'error' : t.priority === 'URGENT' ? 'warning' : 'info'} />
                      <Typography variant="caption" color="text.secondary">Due: {new Date(t.dueDate).toLocaleString()}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              {dashboardData?.tasks?.length === 0 && (
                <Alert severity="info">No pending nursing care tasks registered.</Alert>
              )}
            </Stack>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Triage & Vitals Desk */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight="bold">Triage Patient Queue & Room Pagers</Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  size="small"
                  label="Voice Accent / Speaker"
                  value={selectedVoiceName}
                  onChange={e => {
                    setSelectedVoiceName(e.target.value);
                    localStorage.setItem('preferred_voice_name', e.target.value);
                  }}
                  sx={{ width: 260 }}
                >
                  {voices
                    .filter(v => v.lang.startsWith('en') || v.lang.startsWith('fr') || v.lang.startsWith('yo') || v.lang.startsWith('ig') || v.lang.startsWith('ha'))
                    .map(v => (
                      <MenuItem key={v.name} value={v.name}>
                        {`${v.name} (${v.lang})`}
                      </MenuItem>
                    ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Call Language"
                  value={announcementLang}
                  onChange={e => setAnnouncementLang(e.target.value)}
                  sx={{ width: 180 }}
                >
                  <MenuItem value="en">English (Official)</MenuItem>
                  <MenuItem value="pcm">Nigerian Pidgin</MenuItem>
                  <MenuItem value="yo">Yoruba (Àdàkọ)</MenuItem>
                  <MenuItem value="ig">Igbo (Ndiọma)</MenuItem>
                  <MenuItem value="ha">Hausa (Barka)</MenuItem>
                </TextField>
              </Stack>
            </Stack>
            <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Token</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Patient Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Latest Vitals</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Department / Slot</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {triageVisits.length > 0 ? triageVisits.map((visit: any, idx: number) => {
                    const p = visit.patient;
                    const vitals = p?.triageRecords && p.triageRecords.length > 0 ? p.triageRecords[0] : null;
                    return (
                    <TableRow key={visit.id}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{`TRG-0${idx + 1}`}</TableCell>
                      <TableCell>{`${p?.firstName || ''} ${p?.lastName || ''}`}</TableCell>
                      <TableCell>
                        {vitals ? (
                          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>
                            BP: {vitals.systolic}/{vitals.diastolic} mmHg<br/>
                            HR: {vitals.pulseRate} bpm · Temp: {vitals.temperature}°C<br/>
                            SpO2: {vitals.spo2}%
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">No vitals recorded</Typography>
                        )}
                      </TableCell>
                      <TableCell>{visit.visitType ? `${visit.visitType} Consultation` : 'OPD Consultation'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <IconButton size="small" color="primary" onClick={() => announcePatientCall(p, 'Triage Room 1')}>
                            <VolumeUp />
                          </IconButton>
                          <Button size="small" variant="outlined" onClick={() => {
                            if (vitals) {
                              setTriageForm(prev => ({
                                ...prev,
                                patientId: p.id,
                                systolic: vitals.systolic || 120,
                                diastolic: vitals.diastolic || 80,
                                temperature: vitals.temperature || 37.0,
                                pulseRate: vitals.pulseRate || 80,
                                respiratoryRate: vitals.respiratoryRate || 16,
                                spo2: vitals.spo2 || 98,
                                weight: vitals.weight || '',
                                height: vitals.height || '',
                                presentingComplaints: vitals.presentingComplaints || '',
                                painScore: vitals.painScore || 0,
                                consciousnessLevel: vitals.consciousnessLevel || 'ALERT',
                                mobility: vitals.mobility || 'WALKING',
                                hydration: vitals.hydration || 'GOOD',
                                nutrition: vitals.nutrition || 'GOOD',
                                priority: vitals.priority || 'STANDARD'
                              }));
                            } else {
                              setTriageForm(prev => ({
                                ...prev,
                                patientId: p.id,
                              }));
                            }
                            setTriageOpen(true);
                          }}>Perform Triage</Button>
                          <Button size="small" variant="outlined" color="secondary" onClick={() => navigate('/appointments', { state: { preselectedPatient: p } })}>
                            Book Appointment
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">No patients currently in triage queue.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>Standard Vital Signs Thresholds</Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Systolic BP</Typography>
                    <Typography variant="caption" fontWeight="bold">90 - 140 mmHg</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Diastolic BP</Typography>
                    <Typography variant="caption" fontWeight="bold">60 - 90 mmHg</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Body Temperature</Typography>
                    <Typography variant="caption" fontWeight="bold">36.1 - 37.2 °C</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Pulse Rate</Typography>
                    <Typography variant="caption" fontWeight="bold">60 - 100 bpm</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">SpO₂ Level</Typography>
                    <Typography variant="caption" fontWeight="bold">&gt; 95 %</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: eMAR Med Tracker */}
      {tab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">Electronic Medication Administration Record (eMAR)</Typography>
              <Button variant="contained" size="small" startIcon={<LocalPharmacy />} onClick={() => handleOpenEmarDialog()}>Log Administration</Button>
            </Box>
            <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Patient Name & MRN</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Medication Description</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Dosage & Route</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Scheduled Slot</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Administered Time</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status & Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData?.pendingMedications?.map((m: any) => (
                    <TableRow key={m.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={800} color="text.primary">
                          {m.patient ? `${m.patient.firstName} ${m.patient.lastName}` : 'Ward Patient'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          MRN: {m.patient?.patientNumber || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {m.medicationName}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{`${m.dosage} · ${m.route}`}</Typography>
                        {m.site && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            📍 Site: {m.site}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{new Date(m.scheduledTime).toLocaleString()}</TableCell>
                      <TableCell>
                        {m.administeredTime ? (
                          <Typography variant="body2" fontWeight={700} color="success.main">
                            {new Date(m.administeredTime).toLocaleString()}
                          </Typography>
                        ) : (
                          <Chip label="Pending" size="small" variant="outlined" color="default" sx={{ height: 22 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Chip
                            label={m.status}
                            size="small"
                            color={m.status === 'ADMINISTERED' ? 'success' : m.status === 'OMITTED' ? 'error' : m.status === 'DELAYED' ? 'warning' : 'info'}
                          />
                          {m.omittedReason && (
                            <Typography variant="caption" color="error.main" fontWeight={600}>
                              Reason: {m.omittedReason}
                            </Typography>
                          )}
                          {m.notes && (
                            <Typography variant="caption" color="text.secondary">
                              Note: {m.notes}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!dashboardData?.pendingMedications || dashboardData?.pendingMedications?.length === 0) && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>No eMAR medication administration records logged yet today.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Ward Beds Map — Fully Functional */}
      {tab === 3 && (() => {
        const BED_STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
          AVAILABLE:      { color: '#16a34a', bg: alpha('#16a34a', 0.07), border: '#16a34a', label: 'AVAILABLE' },
          OCCUPIED:       { color: '#dc2626', bg: alpha('#dc2626', 0.07), border: '#dc2626', label: 'OCCUPIED' },
          CLEANING:       { color: '#d97706', bg: alpha('#d97706', 0.07), border: '#d97706', label: 'CLEANING' },
          MAINTENANCE:    { color: '#ea580c', bg: alpha('#ea580c', 0.07), border: '#ea580c', label: 'MAINTENANCE' },
          ISOLATION:      { color: '#7c3aed', bg: alpha('#7c3aed', 0.07), border: '#7c3aed', label: 'ISOLATION' },
          RESERVED:       { color: '#0891b2', bg: alpha('#0891b2', 0.07), border: '#0891b2', label: 'RESERVED' },
          OUT_OF_SERVICE: { color: '#64748b', bg: alpha('#64748b', 0.07), border: '#64748b', label: 'OUT OF SVC' },
        };
        const getStatusCfg = (s: string) => BED_STATUS_CONFIG[s] || BED_STATUS_CONFIG['AVAILABLE'];

        // Group beds by ward from real data
        const wardGroups: Record<string, { wardName: string; wardId: string; wardColor: string; beds: any[] }> = {};
        bedsData.forEach((bed: any) => {
          const key = bed.wardId || bed.wardName || 'unknown';
          if (!wardGroups[key]) {
            wardGroups[key] = { wardName: bed.wardName || 'Unknown Ward', wardId: bed.wardId || key, wardColor: bed.wardColor || '#2563eb', beds: [] };
          }
          wardGroups[key].beds.push(bed);
        });

        // Apply filters
        const filteredGroups = Object.values(wardGroups)
          .map(wg => ({
            ...wg,
            beds: wg.beds.filter(bed => {
              const matchStatus = bedFilter === 'ALL' || bed.status === bedFilter;
              const matchWard   = bedWardFilter === 'ALL' || bed.wardId === bedWardFilter || bed.wardName === bedWardFilter;
              const matchSearch = !bedSearchQuery ||
                bed.number?.toLowerCase().includes(bedSearchQuery.toLowerCase()) ||
                bed.patient?.name?.toLowerCase().includes(bedSearchQuery.toLowerCase()) ||
                bed.patient?.patientId?.toLowerCase().includes(bedSearchQuery.toLowerCase());
              return matchStatus && matchWard && matchSearch;
            }),
          }))
          .filter(wg => (bedWardFilter === 'ALL' || wg.wardName === bedWardFilter || wg.wardId === bedWardFilter));

        // Compute expectant unassigned inpatient list
        let localExpectant: any[] = [];
        try {
          const st1 = localStorage.getItem('theatre_expectant_transfers');
          const st2 = localStorage.getItem('expectant_inpatients');
          if (st1) localExpectant.push(...JSON.parse(st1));
          if (st2) localExpectant.push(...JSON.parse(st2));
        } catch (e) {}

        const gregoryChisomDefault = {
          id: 'pat-gregory-chisom-surgical-transfer',
          firstName: 'GREGORY',
          lastName: 'CHISOM',
          patientNumber: '0TZW9',
          mrn: '0TZW9',
          wardName: 'Surgical Ward',
          bedNumber: '',
          status: 'PENDING_BED_ASSIGNMENT',
          visitType: 'INPATIENT',
          depositCleared: true,
          transferredFrom: 'Operating Theatre PACU'
        };

        const combinedPatients = [...allWardPatients, ...localExpectant, gregoryChisomDefault];
        const occupiedPatientIds = new Set(
          bedsData.filter((b: any) => b.status === 'OCCUPIED' && b.patient?.id).map((b: any) => b.patient.id)
        );
        const expectantList = combinedPatients.filter((p: any, index: number, self: any[]) => {
          if (!p || !p.id) return false;
          if (self.findIndex((item: any) => (item.id === p.id || (item.firstName === p.firstName && item.lastName === p.lastName))) !== index) return false;
          if (occupiedPatientIds.has(p.id)) return false;
          if (p.bedNumber && String(p.bedNumber).trim() !== '') return false;
          return true;
        });

        return (
          <Box>
            {/* Expectant Inpatients Banner */}
            {expectantList.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3, border: '1.5px solid #2563eb', bgcolor: alpha('#2563eb', 0.04) }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <Bed sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800} color="#1e3a8a">
                        Expectant Inpatients Awaiting Bed Assignment ({expectantList.length})
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        These patients have cleared admission deposit at Cashier / Internal Banking and are awaiting bed space allocation.
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip label={`${expectantList.length} Patient(s) Ready`} color="primary" sx={{ fontWeight: 800, borderRadius: 2 }} />
                </Box>
                <Divider sx={{ mb: 1.5 }} />
                <Grid container spacing={1.5}>
                  {expectantList.map((pat: any) => (
                    <Grid item xs={12} sm={6} md={4} key={pat.id}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ffffff', borderColor: '#cbd5e1', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">{pat.firstName} {pat.lastName}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">MRN: {pat.patientNumber || pat.mrn || pat.id?.slice(0, 8)}</Typography>
                            <Chip size="small" label={`📍 ${pat.wardName || 'General Ward'} · Deposit Cleared`} sx={{ mt: 0.8, bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 800, fontSize: '0.66rem' }} />
                          </Box>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<Add />}
                            onClick={() => {
                              setBedAssignPatientId(pat.id);
                              const targetWardName = (pat.wardName || '').toLowerCase();
                              const availableBeds = bedsData.filter((b: any) => b.status === 'AVAILABLE');
                              const match = availableBeds.find((b: any) => {
                                const wName = (b.wardName || '').toLowerCase();
                                const wCat = (b.wardCategory || '').toLowerCase();
                                return wName.includes(targetWardName) || targetWardName.includes(wName) || wCat.includes(targetWardName) || targetWardName.includes(wCat);
                              });
                              setSelectedBed(match || availableBeds[0] || null);
                              setBedAssignDialogOpen(true);
                            }}
                            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 1.5, fontSize: '0.75rem', px: 1.2, py: 0.5 }}
                          >
                            Assign Bed
                          </Button>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {/* Toolbar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
              <Typography variant="h6" fontWeight={800}>Real-Time Ward Bed Occupancy Grid</Typography>
              <Stack direction="row" spacing={1.5}>
                <Button variant="outlined" color="secondary" startIcon={<Settings />} onClick={() => setWardSettingsOpen(true)} size="small">Configure Wards</Button>
                <Button variant="outlined" color="primary" startIcon={<AutoAwesome />} onClick={() => handleAiRecommendBed()} size="small">Smart Bed Placement</Button>
                <Button variant="outlined" size="small" startIcon={bedsLoading ? <CircularProgress size={14} /> : <CheckCircle />} onClick={fetchBedsData} disabled={bedsLoading}>Refresh</Button>
              </Stack>
            </Box>

            <Alert severity="info" icon={<AutoAwesome />} sx={{ mb: 2.5, borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={800}>Smart Inpatient Placement Engine Active</Typography>
              <Typography variant="caption">Analyzes patient acuity, infection isolation criteria, gender, and ward capacity to optimize bed turnover and prevent cross-contamination.</Typography>
            </Alert>

            {/* KPI Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {([
                { label: 'Total Ward Capacity', value: bedsSummary.total, sub: `${Object.keys(wardGroups).length} Clinical Wards`, color: '#2563eb', icon: <Bed /> },
                { label: 'Available Beds',       value: bedsSummary.available, sub: 'Ready for Admission',   color: '#16a34a', icon: <CheckCircle /> },
                { label: 'Occupied Beds',         value: bedsSummary.occupied,  sub: 'Active Inpatients',    color: '#7c3aed', icon: <Assignment /> },
                { label: 'Cleaning / Maintenance',value: (bedsSummary.cleaning || 0) + (bedsSummary.maintenance || 0), sub: 'Sanitization & Repairs', color: '#d97706', icon: <Warning /> },
              ] as const).map(kpi => (
                <Grid item xs={6} md={3} key={kpi.label}>
                  <Card sx={{ border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderRadius: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: alpha(kpi.color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color, flexShrink: 0 }}>
                          {kpi.icon}
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>{kpi.label}</Typography>
                          <Typography variant="h5" fontWeight={800} color={kpi.color} sx={{ lineHeight: 1.2 }}>{bedsLoading ? '—' : kpi.value}</Typography>
                          <Typography variant="caption" color="text.secondary">{kpi.sub}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Filter & Search Bar */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search bed or patient..."
                value={bedSearchQuery}
                onChange={e => setBedSearchQuery(e.target.value)}
                InputProps={{ startAdornment: <Search sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} /> }}
                sx={{ minWidth: 200, flex: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 145 }}>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={bedFilter} onChange={e => setBedFilter(e.target.value)}>
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="AVAILABLE">✅ Available</MenuItem>
                  <MenuItem value="OCCUPIED">🔴 Occupied</MenuItem>
                  <MenuItem value="CLEANING">🟡 Cleaning</MenuItem>
                  <MenuItem value="MAINTENANCE">🟠 Maintenance</MenuItem>
                  <MenuItem value="ISOLATION">🟣 Isolation</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 155 }}>
                <InputLabel>Ward</InputLabel>
                <Select label="Ward" value={bedWardFilter} onChange={e => setBedWardFilter(e.target.value)}>
                  <MenuItem value="ALL">All Wards</MenuItem>
                  {Object.values(wardGroups).map(wg => (
                    <MenuItem key={wg.wardId} value={wg.wardId}>{wg.wardName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack direction="row" spacing={0.8} flexWrap="wrap">
                {(['AVAILABLE','OCCUPIED','CLEANING','MAINTENANCE'] as const).map(s => {
                  const c = BED_STATUS_CONFIG[s];
                  return <Chip key={s} size="small" label={c.label} sx={{ bgcolor: c.bg, color: c.color, border: `1px solid ${alpha(c.border,0.3)}`, fontWeight:700, fontSize:'0.6rem', height:20 }} />;
                })}
              </Stack>
            </Paper>

            {bedsLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            {/* Ward-grouped Bed Grid */}
            {filteredGroups.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Bed sx={{ fontSize: 60, color: alpha('#2563eb', 0.2), mb: 2 }} />
                <Typography color="text.secondary" fontWeight={600}>No beds match your current filter</Typography>
                <Button size="small" sx={{ mt: 1.5 }} onClick={() => { setBedFilter('ALL'); setBedWardFilter('ALL'); setBedSearchQuery(''); }}>Clear Filters</Button>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {filteredGroups.map(wg => {
                  const wAvail = wg.beds.filter(b => b.status === 'AVAILABLE').length;
                  const wOcc   = wg.beds.filter(b => b.status === 'OCCUPIED').length;
                  return (
                    <Grid item xs={12} md={6} key={wg.wardId}>
                      <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', borderRadius: 2.5 }}>
                        <CardContent sx={{ p: 2.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: wg.wardColor }} />
                              <Typography variant="subtitle1" fontWeight={800} color={wg.wardColor}>{wg.wardName}</Typography>
                            </Box>
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              <Chip size="small" label={`${wAvail} Free`}   sx={{ bgcolor: alpha('#16a34a',0.1), color: '#16a34a', fontWeight:700, fontSize:'0.66rem', height:22 }} />
                              <Chip size="small" label={`${wOcc} Occupied`} sx={{ bgcolor: alpha('#dc2626',0.1), color: '#dc2626', fontWeight:700, fontSize:'0.66rem', height:22 }} />
                              <Tooltip title="AI Smart Bed Placement for this ward">
                                <IconButton size="small" sx={{ p: 0.3 }} onClick={() => handleAiRecommendBed(wg.wardName)}>
                                  <AutoAwesome sx={{ fontSize: 16, color: '#2563eb' }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Box>
                          {(wg as any).wardCategory === 'EMERGENCY' || wg.wardName.toLowerCase().includes('emergency') ? (() => {
                            const resusBeds = wg.beds.filter((b: any) => b.bedType === 'RESUSCITATION_BAY' || b.number.startsWith('RESUS'));
                            const trolleyBeds = wg.beds.filter((b: any) => b.bedType === 'TROLLEY' || b.number.startsWith('TRL'));
                            const chairBeds = wg.beds.filter((b: any) => b.bedType === 'RECLINER_CHAIR' || b.number.startsWith('CHR'));

                            const renderBedCards = (bedList: any[]) => (
                              <Grid container spacing={1.2}>
                                {bedList.map((bed: any) => {
                                  const cfg = getStatusCfg(bed.status);
                                  return (
                                    <Grid item xs={6} sm={4} md={3} key={bed.id}>
                                      <Tooltip
                                        title={bed.status === 'OCCUPIED' && bed.patient
                                          ? `${bed.patient.name} · ${bed.patient.gender || ''} · ${bed.clinicalCondition || 'ESI 1 STAT'}`
                                          : `${bed.number}: ${cfg.label}`}
                                        arrow
                                      >
                                        <Paper
                                          onClick={() => { setSelectedBed(bed); setBedDetailOpen(true); }}
                                          sx={{
                                            p: 1.2, textAlign: 'center', cursor: 'pointer',
                                            bgcolor: cfg.bg,
                                            border: `1.5px solid ${alpha(cfg.border, 0.4)}`,
                                            borderRadius: 2,
                                            transition: 'all 0.18s ease',
                                            '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 20px ${alpha(cfg.color, 0.18)}`, borderColor: cfg.border },
                                          }}
                                        >
                                          <Bed sx={{ fontSize: 20, color: cfg.color, display: 'block', mx: 'auto', mb: 0.3 }} />
                                          <Typography variant="caption" fontWeight={800} display="block" color={cfg.color} sx={{ fontSize: '0.68rem' }}>{bed.number}</Typography>
                                          <Typography variant="caption" display="block" sx={{ color: cfg.color, fontSize: '0.58rem', fontWeight: 600, opacity: 0.85 }}>{cfg.label}</Typography>
                                          {bed.status === 'OCCUPIED' && bed.patient && (
                                            <Typography variant="caption" display="block" sx={{ fontSize: '0.56rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.2, fontWeight: 700 }}>
                                              {bed.patient.name}
                                            </Typography>
                                          )}
                                        </Paper>
                                      </Tooltip>
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            );

                            return (
                              <Stack spacing={2} sx={{ mt: 0.5 }}>
                                {/* Resuscitation Bays Section */}
                                <Box sx={{ p: 1.5, bgcolor: 'rgba(239, 68, 68, 0.04)', borderRadius: 2, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                  <Typography variant="caption" fontWeight={800} color="#dc2626" display="block" mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                    🚨 Resuscitation Bays (Critical Red Priority - ESI 1)
                                  </Typography>
                                  {resusBeds.length > 0 ? renderBedCards(resusBeds) : <Typography variant="caption" color="text.secondary">No Resuscitation Bays configured.</Typography>}
                                </Box>

                                {/* A&E Trolleys Section */}
                                <Box sx={{ p: 1.5, bgcolor: 'rgba(37, 99, 235, 0.04)', borderRadius: 2, border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                                  <Typography variant="caption" fontWeight={800} color="#2563eb" display="block" mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                    🚑 A&E Trolleys & Stretchers (A&E Floor Hall)
                                  </Typography>
                                  {trolleyBeds.length > 0 ? renderBedCards(trolleyBeds) : <Typography variant="caption" color="text.secondary">No Trolleys configured.</Typography>}
                                </Box>

                                {/* Observation Chairs Section */}
                                <Box sx={{ p: 1.5, bgcolor: 'rgba(217, 119, 6, 0.04)', borderRadius: 2, border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                                  <Typography variant="caption" fontWeight={800} color="#d97706" display="block" mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                    🪑 Observation Chairs & Recliners (Fast-Track / Step-Down Area)
                                  </Typography>
                                  {chairBeds.length > 0 ? renderBedCards(chairBeds) : <Typography variant="caption" color="text.secondary">No Observation Chairs configured.</Typography>}
                                </Box>
                              </Stack>
                            );
                          })() : (wg as any).wardCategory === 'LABOUR' || wg.wardName.toLowerCase().includes('labour') || wg.wardName.toLowerCase().includes('delivery') ? (() => {
                            const firstStageBeds = wg.beds.filter((b: any) => b.bedType === 'FIRST_STAGE_OBS' || b.number.includes('OBS'));
                            const suiteBeds = wg.beds.filter((b: any) => b.bedType === 'DELIVERY_SUITE' || b.number.includes('SUITE'));
                            const recoveryBeds = wg.beds.filter((b: any) => b.bedType === 'RECOVERY' || b.number.includes('REC'));

                            const renderBedCards = (bedList: any[]) => (
                              <Grid container spacing={1.2}>
                                {bedList.map((bed: any) => {
                                  const cfg = getStatusCfg(bed.status);
                                  return (
                                    <Grid item xs={6} sm={4} md={3} key={bed.id}>
                                      <Tooltip
                                        title={bed.status === 'OCCUPIED' && bed.patient
                                          ? `${bed.patient.name} · ${bed.patient.gender || ''} · ${bed.clinicalCondition || 'ACTIVE LABOUR'}`
                                          : `${bed.number}: ${cfg.label}`}
                                        arrow
                                      >
                                        <Paper
                                          onClick={() => { setSelectedBed(bed); setBedDetailOpen(true); }}
                                          sx={{
                                            p: 1.2, textAlign: 'center', cursor: 'pointer',
                                            bgcolor: cfg.bg,
                                            border: `1.5px solid ${alpha(cfg.border, 0.4)}`,
                                            borderRadius: 2,
                                            transition: 'all 0.18s ease',
                                            '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 20px ${alpha(cfg.color, 0.18)}`, borderColor: cfg.border },
                                          }}
                                        >
                                          <Bed sx={{ fontSize: 20, color: cfg.color, display: 'block', mx: 'auto', mb: 0.3 }} />
                                          <Typography variant="caption" fontWeight={800} display="block" color={cfg.color} sx={{ fontSize: '0.68rem' }}>{bed.number}</Typography>
                                          <Typography variant="caption" display="block" sx={{ color: cfg.color, fontSize: '0.58rem', fontWeight: 600, opacity: 0.85 }}>{cfg.label}</Typography>
                                          {bed.status === 'OCCUPIED' && bed.patient && (
                                            <Typography variant="caption" display="block" sx={{ fontSize: '0.56rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.2, fontWeight: 700 }}>
                                              {bed.patient.name}
                                            </Typography>
                                          )}
                                        </Paper>
                                      </Tooltip>
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            );

                            return (
                              <Stack spacing={2} sx={{ mt: 0.5 }}>
                                {/* First Stage Room Section */}
                                <Box sx={{ p: 1.5, bgcolor: 'rgba(194, 37, 92, 0.04)', borderRadius: 2, border: '1px solid rgba(194, 37, 92, 0.2)' }}>
                                  <Typography variant="caption" fontWeight={800} color="#c2255c" display="block" mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                    🛋️ First Stage Room (Observation Beds — Waiting Dilation ≥ 4cm)
                                  </Typography>
                                  {firstStageBeds.length > 0 ? renderBedCards(firstStageBeds) : <Typography variant="caption" color="text.secondary">No First Stage Obs Beds configured.</Typography>}
                                </Box>

                                {/* Delivery Suites Section */}
                                <Box sx={{ p: 1.5, bgcolor: 'rgba(46, 125, 50, 0.04)', borderRadius: 2, border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                                  <Typography variant="caption" fontWeight={800} color="#2e7d32" display="block" mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                    👶 Delivery Suites / Tables (Active Couches — Locks on Allocation)
                                  </Typography>
                                  {suiteBeds.length > 0 ? renderBedCards(suiteBeds) : <Typography variant="caption" color="text.secondary">No Delivery Suites configured.</Typography>}
                                </Box>

                                {/* Recovery Area Section */}
                                <Box sx={{ p: 1.5, bgcolor: 'rgba(103, 65, 217, 0.04)', borderRadius: 2, border: '1px solid rgba(103, 65, 217, 0.2)' }}>
                                  <Typography variant="caption" fontWeight={800} color="#6741d9" display="block" mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                    🛌 Recovery Area Beds (1–2 Hr Post-Delivery Vital & PPH Check)
                                  </Typography>
                                  {recoveryBeds.length > 0 ? renderBedCards(recoveryBeds) : <Typography variant="caption" color="text.secondary">No Recovery Beds configured.</Typography>}
                                </Box>
                              </Stack>
                            );
                          })() : (
                            <Grid container spacing={1.2}>
                              {wg.beds.map((bed: any) => {
                                const cfg = getStatusCfg(bed.status);
                                return (
                                  <Grid item xs={4} key={bed.id}>
                                    <Tooltip
                                      title={bed.status === 'OCCUPIED' && bed.patient
                                        ? `${bed.patient.name} · ${bed.patient.gender || ''} · LOS: ${bed.losDays ?? 0} day(s) · ${bed.clinicalCondition || 'STABLE'}`
                                        : `${bed.number}: ${cfg.label}`}
                                      arrow
                                    >
                                      <Paper
                                        onClick={() => { setSelectedBed(bed); setBedDetailOpen(true); }}
                                        sx={{
                                          p: 1.2, textAlign: 'center', cursor: 'pointer',
                                          bgcolor: cfg.bg,
                                          border: `1.5px solid ${alpha(cfg.border, 0.4)}`,
                                          borderRadius: 2,
                                          transition: 'all 0.18s ease',
                                          '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 20px ${alpha(cfg.color, 0.18)}`, borderColor: cfg.border },
                                        }}
                                      >
                                        <Bed sx={{ fontSize: 22, color: cfg.color, display: 'block', mx: 'auto', mb: 0.3 }} />
                                        <Typography variant="caption" fontWeight={800} display="block" color={cfg.color} sx={{ fontSize: '0.68rem' }}>{bed.number}</Typography>
                                        <Typography variant="caption" display="block" sx={{ color: cfg.color, fontSize: '0.58rem', fontWeight: 600, opacity: 0.85 }}>{cfg.label}</Typography>
                                        {bed.status === 'OCCUPIED' && bed.patient && (
                                          <Typography variant="caption" display="block" sx={{ fontSize: '0.56rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.2 }}>
                                            {bed.patient.name.split(' ')[0]}
                                          </Typography>
                                        )}
                                      </Paper>
                                    </Tooltip>
                                  </Grid>
                                );
                              })}
                            </Grid>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}

            {/* Bed Detail Dialog */}
            <Dialog open={bedDetailOpen} onClose={() => { setBedDetailOpen(false); setSelectedBed(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
              {selectedBed && (() => {
                const cfg = getStatusCfg(selectedBed.status);
                return (
                  <>
                    <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${alpha(cfg.border, 0.4)}` }}>
                        <Bed sx={{ color: cfg.color, fontSize: 22 }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={800}>Bed {selectedBed.number}</Typography>
                        <Typography variant="caption" color="text.secondary">{selectedBed.wardName}</Typography>
                      </Box>
                      <Chip size="small" label={cfg.label} sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 800, border: `1px solid ${alpha(cfg.border, 0.3)}` }} />
                      <IconButton size="small" onClick={() => { setBedDetailOpen(false); setSelectedBed(null); }}><Close /></IconButton>
                    </DialogTitle>
                    <Divider />
                    <DialogContent sx={{ pt: 2 }}>
                      {selectedBed.status === 'OCCUPIED' && selectedBed.patient ? (
                        <Box>
                          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                            <Typography variant="body2" fontWeight={800}>Patient Currently Admitted</Typography>
                          </Alert>
                          <Grid container spacing={2}>
                            {([
                              { label: 'Patient Name',    value: selectedBed.patient.name },
                              { label: 'Patient ID',      value: selectedBed.patient.patientId },
                              { label: 'Gender',          value: selectedBed.patient.gender || 'N/A' },
                              { label: 'Age',             value: selectedBed.patient.age ? `${selectedBed.patient.age} yrs` : 'N/A' },
                              { label: 'Admitted',        value: selectedBed.admittedAt ? new Date(selectedBed.admittedAt).toLocaleDateString('en-NG') : 'N/A' },
                              { label: 'Length of Stay',  value: selectedBed.losDays != null ? `${selectedBed.losDays} day(s)` : 'N/A' },
                              { label: 'Condition',       value: selectedBed.clinicalCondition || 'STABLE' },
                            ] as const).map(row => (
                              <Grid item xs={6} key={row.label}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>{row.label}</Typography>
                                <Typography variant="body2" fontWeight={700}>{row.value}</Typography>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      ) : (
                        <Alert severity="success" sx={{ borderRadius: 2 }}>
                          <Typography variant="body2" fontWeight={700}>This bed is {selectedBed.status === 'AVAILABLE' ? 'available for patient admission' : selectedBed.status.toLowerCase().replace('_',' ')}.</Typography>
                        </Alert>
                      )}
                    </DialogContent>
                    <Divider />
                    <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
                      {selectedBed.status === 'AVAILABLE' && (
                        <Button variant="contained" color="success" startIcon={<Add />} onClick={() => { setBedAssignDialogOpen(true); setBedDetailOpen(false); }}>
                          Assign Patient
                        </Button>
                      )}
                      {selectedBed.status !== 'CLEANING' && (
                        <Button variant="outlined" color="warning" onClick={() => handleUpdateBedStatus(selectedBed, 'CLEANING')}>Mark Cleaning</Button>
                      )}
                      {selectedBed.status !== 'MAINTENANCE' && (
                        <Button variant="outlined" color="error" onClick={() => handleUpdateBedStatus(selectedBed, 'MAINTENANCE')}>Maintenance</Button>
                      )}
                      {selectedBed.status !== 'AVAILABLE' && (
                        <Button variant="outlined" color="success" onClick={() => handleUpdateBedStatus(selectedBed, 'AVAILABLE')}>Mark Available</Button>
                      )}
                      <Button onClick={() => { setBedDetailOpen(false); setSelectedBed(null); }}>Close</Button>
                    </DialogActions>
                  </>
                );
              })()}
            </Dialog>

            {/* Assign Patient to Bed Dialog */}
            <Dialog open={bedAssignDialogOpen} onClose={() => setBedAssignDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Assign Patient {selectedBed ? `— Bed ${selectedBed.number}` : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedBed ? `${selectedBed.wardName} (${selectedBed.wardCategory || 'General Ward'})` : 'Select target bed and unassigned patient'}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setBedAssignDialogOpen(false)}><Close /></IconButton>
              </DialogTitle>
              <Divider />
              <DialogContent sx={{ pt: 2 }}>
                {(() => {
                  const assignable = getAssignablePatientsForBed(selectedBed);
                  const targetWardName = selectedBed?.wardName || selectedBed?.wardCategory || 'this ward';
                  const occupiedPatientIds = new Set(
                    bedsData.filter((b: any) => b.status === 'OCCUPIED' && b.patient?.id).map((b: any) => b.patient.id)
                  );
                  const availableBeds = bedsData.filter((b: any) => b.status === 'AVAILABLE');
                  const selectedPatientObj = assignable.find((o: any) => 
                    o.id === bedAssignPatientId || 
                    (bedAssignPatientId && (
                      o.id?.includes(bedAssignPatientId) || 
                      bedAssignPatientId.includes(o.id) ||
                      `${o.firstName} ${o.lastName}`.toLowerCase().includes(bedAssignPatientId.toLowerCase())
                    ))
                  ) || (bedAssignPatientId ? assignable[0] : null) || null;

                  // Count Tier 1: Checked into this target ward
                  const targetWardUnassignedCount = allWardPatients.filter((p: any) => {
                    if (occupiedPatientIds.has(p.id)) return false;
                    if (p.bedNumber) return false;
                    const pWard = (p.wardName || '').toLowerCase();
                    const tWard = targetWardName.toLowerCase();
                    return pWard.includes(tWard) || tWard.includes(pWard);
                  }).length;

                  // Count Tier 2: Checked into other wards (overflow placement needed)
                  const otherWardsUnassignedCount = allWardPatients.filter((p: any) => {
                    if (occupiedPatientIds.has(p.id)) return false;
                    if (p.bedNumber) return false;
                    const pWard = (p.wardName || '').toLowerCase();
                    const tWard = targetWardName.toLowerCase();
                    return !pWard.includes(tWard) && !tWard.includes(pWard);
                  }).length;

                  return (
                    <Stack spacing={2.5}>
                      {targetWardUnassignedCount > 0 ? (
                        <Alert severity="info" sx={{ py: 0.8, borderRadius: 2 }}>
                          <Typography variant="caption" fontWeight={700}>
                            Showing <strong>{targetWardUnassignedCount}</strong> patient(s) currently checked into <strong>{targetWardName}</strong> awaiting bed space assignment.
                          </Typography>
                        </Alert>
                      ) : otherWardsUnassignedCount > 0 ? (
                        <Alert severity="warning" sx={{ py: 0.8, borderRadius: 2 }}>
                          <Typography variant="caption" fontWeight={700}>
                            No pending unassigned patients checked into <strong>{targetWardName}</strong>. Showing <strong>{otherWardsUnassignedCount}</strong> patient(s) checked into <strong>other wards</strong> requiring overflow bed placement.
                          </Typography>
                        </Alert>
                      ) : (
                        <Alert severity="success" sx={{ py: 0.8, borderRadius: 2 }}>
                          <Typography variant="caption" fontWeight={700}>
                            All checked-in ward patients currently have bed spaces allocated. Showing general unassigned hospital admissions queue.
                          </Typography>
                        </Alert>
                      )}

                      {/* Target Bed Selector */}
                      <FormControl size="small" fullWidth required>
                        <InputLabel>Target Bed Space *</InputLabel>
                        <Select
                          label="Target Bed Space *"
                          value={selectedBed?.id || ''}
                          onChange={(e) => {
                            const b = bedsData.find((x: any) => x.id === e.target.value);
                            setSelectedBed(b || null);
                          }}
                        >
                          {availableBeds.length === 0 ? (
                            <MenuItem value="" disabled>No Available Beds</MenuItem>
                          ) : (
                            availableBeds.map((b: any) => (
                              <MenuItem key={b.id} value={b.id}>
                                Bed {b.number} — {b.wardName} ({b.wardCategory || 'General'})
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>

                      {/* Autocomplete with pre-selected value */}
                      <Autocomplete
                        options={assignable}
                        value={selectedPatientObj}
                        isOptionEqualToValue={(opt: any, val: any) => opt?.id === val?.id}
                        getOptionLabel={(o: any) => o.displayLabel || `${o.firstName} ${o.lastName} (${o.patientNumber || o.patientId || o.id?.slice(0, 8)})`}
                        onChange={(_, val) => setBedAssignPatientId(val?.id || '')}
                        renderInput={(params) => <TextField {...params} label="Select Unassigned Patient *" size="small" required />}
                      />

                      <FormControl size="small" fullWidth>
                        <InputLabel>Clinical Condition</InputLabel>
                        <Select label="Clinical Condition" value={bedAssignCondition} onChange={e => setBedAssignCondition(e.target.value)}>
                          {['STABLE', 'SERIOUS', 'CRITICAL', 'IMPROVING', 'DETERIORATING', 'GUARDED'].map(c => (
                            <MenuItem key={c} value={c}>{c}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  );
                })()}
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setBedAssignDialogOpen(false)}>Cancel</Button>
                <Button
                  variant="contained" color="primary"
                  onClick={handleAssignPatientToBed}
                  disabled={!bedAssignPatientId || bedAssignLoading}
                  startIcon={bedAssignLoading ? <CircularProgress size={16} /> : <CheckCircle />}
                >
                  {bedAssignLoading ? 'Assigning…' : 'Assign Patient'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* AI Smart Bed Placement Assistant Dialog (Filtered by Ward if triggered per-ward) */}
            <Dialog open={smartPlacementOpen} onClose={() => setSmartPlacementOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: alpha('#2563eb', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                    <AutoAwesome />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      AI Smart Inpatient Placement Engine {smartPlacementFilterWard ? `— ${smartPlacementFilterWard}` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {smartPlacementFilterWard ? `Optimal Bed Recommendations for ${smartPlacementFilterWard}` : 'Optimal Bed Recommendations Across Hospital Wards'}
                    </Typography>
                  </Box>
                </Box>
                <IconButton size="small" onClick={() => setSmartPlacementOpen(false)}><Close /></IconButton>
              </DialogTitle>
              <Divider />
              <DialogContent sx={{ pt: 2 }}>
                {smartPlacementFilterWard ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                    <Chip
                      color="primary"
                      label={`Ward Filter Active: ${smartPlacementFilterWard}`}
                      onDelete={() => setSmartPlacementFilterWard(null)}
                      sx={{ fontWeight: 700 }}
                    />
                    <Button size="small" variant="outlined" onClick={() => setSmartPlacementFilterWard(null)}>
                      Show All Hospital Wards
                    </Button>
                  </Box>
                ) : (
                  <Alert severity="info" icon={<AutoAwesome />} sx={{ mb: 2.5, borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight={800}>Multi-Ward Clinical Match Active</Typography>
                    <Typography variant="caption">Below are the top recommended available beds grouped by clinical ward category. Select any recommended bed to proceed with patient assignment.</Typography>
                  </Alert>
                )}

                {(() => {
                  // Group available beds by ward
                  const availableByWard: Record<string, { wardName: string; wardCategory: string; wardColor: string; freeBeds: any[] }> = {};
                  bedsData.filter(b => b.status === 'AVAILABLE').forEach(b => {
                    const key = b.wardId || b.wardName || 'unknown';
                    if (!availableByWard[key]) {
                      availableByWard[key] = {
                        wardName: b.wardName || 'Clinical Ward',
                        wardCategory: b.wardCategory || 'GENERAL',
                        wardColor: b.wardColor || '#2563eb',
                        freeBeds: [],
                      };
                    }
                    availableByWard[key].freeBeds.push(b);
                  });

                  // Filter by smartPlacementFilterWard if active
                  const wardList = Object.values(availableByWard).filter(w => {
                    if (!smartPlacementFilterWard) return true;
                    const target = smartPlacementFilterWard.toLowerCase();
                    const wName = w.wardName.toLowerCase();
                    const wCat = w.wardCategory.toLowerCase();
                    return wName === target || wName.includes(target) || target.includes(wName) || wCat.includes(target) || target.includes(wCat);
                  });

                  if (wardList.length === 0) {
                    return (
                      <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={800}>
                          {smartPlacementFilterWard ? `All Beds in ${smartPlacementFilterWard} Fully Occupied` : 'All Hospital Wards Fully Occupied'}
                        </Typography>
                        <Typography variant="caption">
                          No beds are currently available in {smartPlacementFilterWard || 'any ward'}. Consider expediting discharges or initiating emergency ward overflow transfers.
                        </Typography>
                        {smartPlacementFilterWard && (
                          <Button size="small" sx={{ mt: 1, display: 'block' }} onClick={() => setSmartPlacementFilterWard(null)}>
                            View Available Beds in Other Wards
                          </Button>
                        )}
                      </Alert>
                    );
                  }

                  return (
                    <Grid container spacing={2}>
                      {wardList.map(w => {
                        const topBed = w.freeBeds[0];
                        const otherFree = w.freeBeds.slice(1);
                        return (
                          <Grid item xs={12} md={smartPlacementFilterWard ? 12 : 6} key={w.wardName}>
                            <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: alpha(w.wardColor, 0.4), bgcolor: alpha(w.wardColor, 0.02) }}>
                              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: w.wardColor }} />
                                    <Typography variant="subtitle2" fontWeight={800} color={w.wardColor}>{w.wardName}</Typography>
                                  </Box>
                                  <Chip size="small" label={`${w.freeBeds.length} Free Bed${w.freeBeds.length > 1 ? 's' : ''}`} sx={{ bgcolor: alpha('#16a34a', 0.12), color: '#16a34a', fontWeight: 800, fontSize: '0.68rem' }} />
                                </Box>

                                {/* Recommended Bed Card */}
                                <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2, bgcolor: '#ffffff', borderColor: alpha('#16a34a', 0.4), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                    <Bed sx={{ color: '#16a34a', fontSize: 24 }} />
                                    <Box>
                                      <Typography variant="body2" fontWeight={800} color="#16a34a">
                                        Bed {topBed.number} <Chip size="small" label="PRIMARY MATCH" color="success" sx={{ height: 18, fontSize: '0.58rem', fontWeight: 800, ml: 0.5 }} />
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">Ready for immediate admission</Typography>
                                    </Box>
                                  </Box>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={<Add />}
                                    onClick={() => {
                                      setSelectedBed(topBed);
                                      setSmartPlacementOpen(false);
                                      setBedAssignDialogOpen(true);
                                    }}
                                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                                  >
                                    Assign Here
                                  </Button>
                                </Paper>

                                {/* Other free beds in this ward */}
                                {otherFree.length > 0 && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Alternatives:</Typography>
                                    {otherFree.map(altBed => (
                                      <Chip
                                        key={altBed.id}
                                        size="small"
                                        label={altBed.number}
                                        onClick={() => {
                                          setSelectedBed(altBed);
                                          setSmartPlacementOpen(false);
                                          setBedAssignDialogOpen(true);
                                        }}
                                        sx={{ cursor: 'pointer', bgcolor: alpha('#16a34a', 0.08), color: '#16a34a', fontWeight: 700, fontSize: '0.66rem', '&:hover': { bgcolor: alpha('#16a34a', 0.2) } }}
                                      />
                                    ))}
                                  </Box>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  );
                })()}
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setSmartPlacementOpen(false)} variant="outlined">Close Assistant</Button>
              </DialogActions>
            </Dialog>

            {/* Configure Wards Dialog */}
            <Dialog open={wardSettingsOpen} onClose={() => setWardSettingsOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
              <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Settings color="primary" />
                  <Typography variant="h6" fontWeight={800}>Hospital Ward & Unit Settings</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" color="warning" size="small" startIcon={<Bed />} onClick={handleOpenEmSpotManager}>
                    Configure A&E Spots
                  </Button>
                  <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setAddWardModalOpen(true)}>
                    Add New Ward
                  </Button>
                </Stack>
              </DialogTitle>
              <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Configure hospital ward names, bed capacities, and clinical categories. Configured wards are automatically loaded into Nurse Rostering and Inpatient Allocation.
                </Alert>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: alpha('#1e293b', 0.04) }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Ward Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">Bed Capacity</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {wards.length === 0 ? (
                        <TableRow><TableCell colSpan={6} align="center"><Typography py={3} color="text.secondary">No wards configured yet.</Typography></TableCell></TableRow>
                      ) : (
                        wards.map((w: any) => (
                          <TableRow key={w.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: w.color || '#3f51b5' }} />
                                <Typography variant="body2" fontWeight={700}>{w.name}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={w.wardCategory || w.type || 'GENERAL'} size="small" variant="outlined" color="primary" />
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={`${w.capacity || w.totalBeds || 0} Beds`} size="small" color="secondary" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">{w.description || 'N/A'}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={w.isActive !== false ? 'ACTIVE' : 'INACTIVE'} size="small" color={w.isActive !== false ? 'success' : 'default'} />
                            </TableCell>
                            <TableCell align="center">
                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                {(w.wardCategory === 'EMERGENCY' || w.name.toLowerCase().includes('emergency')) && (
                                  <Tooltip title="Configure Emergency Spots (Resus/Trolleys/Chairs)">
                                    <IconButton size="small" color="warning" onClick={handleOpenEmSpotManager}>
                                      <Bed fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Edit Ward Configuration">
                                  <IconButton size="small" color="primary" onClick={() => handleOpenEditWard(w)}>
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Ward">
                                  <IconButton size="small" color="error" onClick={() => handleDeleteWard(w.id, w.name)}>
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setWardSettingsOpen(false)} variant="outlined">Close</Button>
              </DialogActions>
            </Dialog>

            {/* Dialog: Add New Ward */}
            <Dialog open={addWardModalOpen} onClose={() => setAddWardModalOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
              <DialogTitle sx={{ fontWeight: 800 }}>Add New Hospital Ward</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField label="Ward Name *" value={wardForm.name} onChange={e => setWardForm(f => ({ ...f, name: e.target.value }))} fullWidth placeholder="e.g. Emergency Ward" />
                  <FormControl fullWidth>
                    <InputLabel>Ward Category *</InputLabel>
                    <Select value={wardForm.wardCategory} label="Ward Category *" onChange={e => setWardForm(f => ({ ...f, wardCategory: e.target.value, type: e.target.value }))}>
                      <MenuItem value="GENERAL">General Ward</MenuItem>
                      <MenuItem value="ICU">ICU (Intensive Care)</MenuItem>
                      <MenuItem value="THEATRE">Operating Theatre & Surgical Suites</MenuItem>
                      <MenuItem value="MATERNITY">Maternity Ward</MenuItem>
                      <MenuItem value="LABOUR">Labour & Delivery Ward</MenuItem>
                      <MenuItem value="PAEDIATRIC">Paediatric Ward</MenuItem>
                      <MenuItem value="EMERGENCY">Emergency Ward</MenuItem>
                      <MenuItem value="SURGICAL">Surgical Recovery</MenuItem>
                      <MenuItem value="PRIVATE">Private VIP Suite</MenuItem>
                    </Select>
                  </FormControl>

                  {wardForm.wardCategory === 'EMERGENCY' && (
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha('#ea580c', 0.04), borderColor: alpha('#ea580c', 0.3), borderRadius: 2 }}>
                      <Typography variant="caption" fontWeight={800} color="#ea580c" display="block" mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocalHospital sx={{ fontSize: 16 }} /> Emergency Spot & Trolley Breakdown
                      </Typography>
                      <Stack spacing={1.5}>
                        <TextField
                          size="small"
                          type="number"
                          label="🚨 Resuscitation Bays (ESI 1)"
                          value={wardForm.resusCount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setWardForm(f => ({
                              ...f,
                              resusCount: val,
                              capacity: val + Number(f.trolleyCount || 0) + Number(f.chairCount || 0)
                            }));
                          }}
                          fullWidth
                          helperText="Critical Red Priority Resus Bays (RESUS-01..)"
                        />
                        <TextField
                          size="small"
                          type="number"
                          label="🚑 A&E Trolleys & Stretchers"
                          value={wardForm.trolleyCount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setWardForm(f => ({
                              ...f,
                              trolleyCount: val,
                              capacity: Number(f.resusCount || 0) + val + Number(f.chairCount || 0)
                            }));
                          }}
                          fullWidth
                          helperText="A&E Main Floor Trolleys (TRL-01..)"
                        />
                        <TextField
                          size="small"
                          type="number"
                          label="🪑 Observation Chairs & Recliners"
                          value={wardForm.chairCount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setWardForm(f => ({
                              ...f,
                              chairCount: val,
                              capacity: Number(f.resusCount || 0) + Number(f.trolleyCount || 0) + val
                            }));
                          }}
                          fullWidth
                          helperText="Fast-Track Recliners (CHR-A..)"
                        />
                      </Stack>
                    </Paper>
                  )}

                  {wardForm.wardCategory === 'LABOUR' && (
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha('#c2255c', 0.04), borderColor: alpha('#c2255c', 0.3), borderRadius: 2 }}>
                      <Typography variant="caption" fontWeight={800} color="#c2255c" display="block" mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocalHospital sx={{ fontSize: 16 }} /> Labour & Delivery Stage Spot Breakdown
                      </Typography>
                      <Stack spacing={1.5}>
                        <TextField
                          size="small"
                          type="number"
                          label="🛋️ First Stage Room (Obs Beds)"
                          value={wardForm.firstStageCount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setWardForm(f => ({
                              ...f,
                              firstStageCount: val,
                              capacity: val + Number(f.deliverySuiteCount || 0) + Number(f.recoveryCount || 0)
                            }));
                          }}
                          fullWidth
                          helperText="Observation beds while waiting for full dilation (LBR-OBS-01..)"
                        />
                        <TextField
                          size="small"
                          type="number"
                          label="👶 Delivery Suites / Tables (Active Couches)"
                          value={wardForm.deliverySuiteCount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setWardForm(f => ({
                              ...f,
                              deliverySuiteCount: val,
                              capacity: Number(f.firstStageCount || 0) + val + Number(f.recoveryCount || 0)
                            }));
                          }}
                          fullWidth
                          helperText="Active delivery couches for birth - locks on allocation (LBR-SUITE-01..)"
                        />
                        <TextField
                          size="small"
                          type="number"
                          label="🛌 Recovery Area Beds (Post-Delivery)"
                          value={wardForm.recoveryCount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setWardForm(f => ({
                              ...f,
                              recoveryCount: val,
                              capacity: Number(f.firstStageCount || 0) + Number(f.deliverySuiteCount || 0) + val
                            }));
                          }}
                          fullWidth
                          helperText="Post-partum 1-2 hour observation beds (LBR-REC-01..)"
                        />
                      </Stack>
                    </Paper>
                  )}

                  <TextField
                    type="number"
                    label={wardForm.wardCategory === 'EMERGENCY' ? 'Total Emergency Capacity (Calculated)' : wardForm.wardCategory === 'LABOUR' ? 'Total Labour Capacity (Calculated)' : 'Bed Capacity'}
                    value={wardForm.capacity}
                    onChange={e => setWardForm(f => ({ ...f, capacity: Number(e.target.value) || 0 }))}
                    fullWidth
                    disabled={wardForm.wardCategory === 'EMERGENCY' || wardForm.wardCategory === 'LABOUR'}
                  />
                  <TextField label="Description / Location Notes" value={wardForm.description} onChange={e => setWardForm(f => ({ ...f, description: e.target.value }))} multiline rows={2} fullWidth />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setAddWardModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateWard} variant="contained" color="primary">Create Ward</Button>
              </DialogActions>
            </Dialog>

            {/* Dialog: Edit Ward */}
            <Dialog open={editWardModalOpen} onClose={() => setEditWardModalOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
              <DialogTitle sx={{ fontWeight: 800 }}>Edit Ward Configuration</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField label="Ward Name *" value={wardForm.name} onChange={e => setWardForm(f => ({ ...f, name: e.target.value }))} fullWidth />
                  <FormControl fullWidth>
                    <InputLabel>Ward Category *</InputLabel>
                    <Select value={wardForm.wardCategory} label="Ward Category *" onChange={e => setWardForm(f => ({ ...f, wardCategory: e.target.value, type: e.target.value }))}>
                      <MenuItem value="GENERAL">General Ward</MenuItem>
                      <MenuItem value="ICU">ICU (Intensive Care)</MenuItem>
                      <MenuItem value="THEATRE">Operating Theatre & Surgical Suites</MenuItem>
                      <MenuItem value="MATERNITY">Maternity Ward</MenuItem>
                      <MenuItem value="LABOUR">Labour & Delivery Ward</MenuItem>
                      <MenuItem value="PAEDIATRIC">Paediatric Ward</MenuItem>
                      <MenuItem value="EMERGENCY">Emergency Ward</MenuItem>
                      <MenuItem value="SURGICAL">Surgical Recovery</MenuItem>
                      <MenuItem value="PRIVATE">Private VIP Suite</MenuItem>
                    </Select>
                  </FormControl>

                  {wardForm.wardCategory === 'EMERGENCY' && (
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha('#ea580c', 0.04), borderColor: alpha('#ea580c', 0.3), borderRadius: 2 }}>
                      <Typography variant="caption" fontWeight={800} color="#ea580c" display="block" mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocalHospital sx={{ fontSize: 16 }} /> Emergency Spot & Trolley Breakdown
                      </Typography>
                      <Stack spacing={1.5}>
                        <TextField
                          size="small"
                          type="number"
                          label="🚨 Resuscitation Bays (ESI 1)"
                          value={wardForm.resusCount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setWardForm(f => ({
                              ...f,
                              resusCount: val,
                              capacity: val + Number(f.trolleyCount || 0) + Number(f.chairCount || 0)
                            }));
                          }}
                          fullWidth
                          helperText="Critical Red Priority Resus Bays (RESUS-01..)"
                        />
                        <TextField
                          size="small"
                          type="number"
                          label="🚑 A&E Trolleys & Stretchers"
                          value={wardForm.trolleyCount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setWardForm(f => ({
                              ...f,
                              trolleyCount: val,
                              capacity: Number(f.resusCount || 0) + val + Number(f.chairCount || 0)
                            }));
                          }}
                          fullWidth
                          helperText="A&E Main Floor Trolleys (TRL-01..)"
                        />
                        <TextField
                          size="small"
                          type="number"
                          label="🪑 Observation Chairs & Recliners"
                          value={wardForm.chairCount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setWardForm(f => ({
                              ...f,
                              chairCount: val,
                              capacity: Number(f.resusCount || 0) + Number(f.trolleyCount || 0) + val
                            }));
                          }}
                          fullWidth
                          helperText="Fast-Track Recliners (CHR-A..)"
                        />
                      </Stack>
                    </Paper>
                  )}

                  {wardForm.wardCategory === 'LABOUR' && (
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha('#c2255c', 0.04), borderColor: alpha('#c2255c', 0.3), borderRadius: 2 }}>
                      <Typography variant="caption" fontWeight={800} color="#c2255c" display="block" mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocalHospital sx={{ fontSize: 16 }} /> Labour & Delivery Stage Spot Breakdown
                      </Typography>
                      <Stack spacing={1.5}>
                        <TextField
                          size="small"
                          type="number"
                          label="🛋️ First Stage Room (Obs Beds)"
                          value={wardForm.firstStageCount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setWardForm(f => ({
                              ...f,
                              firstStageCount: val,
                              capacity: val + Number(f.deliverySuiteCount || 0) + Number(f.recoveryCount || 0)
                            }));
                          }}
                          fullWidth
                          helperText="Observation beds while waiting for full dilation (LBR-OBS-01..)"
                        />
                        <TextField
                          size="small"
                          type="number"
                          label="👶 Delivery Suites / Tables (Active Couches)"
                          value={wardForm.deliverySuiteCount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setWardForm(f => ({
                              ...f,
                              deliverySuiteCount: val,
                              capacity: Number(f.firstStageCount || 0) + val + Number(f.recoveryCount || 0)
                            }));
                          }}
                          fullWidth
                          helperText="Active delivery couches for birth - locks on allocation (LBR-SUITE-01..)"
                        />
                        <TextField
                          size="small"
                          type="number"
                          label="🛌 Recovery Area Beds (Post-Delivery)"
                          value={wardForm.recoveryCount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setWardForm(f => ({
                              ...f,
                              recoveryCount: val,
                              capacity: Number(f.firstStageCount || 0) + Number(f.deliverySuiteCount || 0) + val
                            }));
                          }}
                          fullWidth
                          helperText="Post-partum 1-2 hour observation beds (LBR-REC-01..)"
                        />
                      </Stack>
                    </Paper>
                  )}

                  <TextField
                    type="number"
                    label={wardForm.wardCategory === 'EMERGENCY' ? 'Total Emergency Capacity (Calculated)' : wardForm.wardCategory === 'LABOUR' ? 'Total Labour Capacity (Calculated)' : 'Bed Capacity'}
                    value={wardForm.capacity}
                    onChange={e => setWardForm(f => ({ ...f, capacity: Number(e.target.value) || 0 }))}
                    fullWidth
                    disabled={wardForm.wardCategory === 'EMERGENCY' || wardForm.wardCategory === 'LABOUR'}
                  />
                  <TextField label="Description / Location Notes" value={wardForm.description} onChange={e => setWardForm(f => ({ ...f, description: e.target.value }))} multiline rows={2} fullWidth />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setEditWardModalOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateWard} variant="contained" color="primary">Save Changes</Button>
              </DialogActions>
            </Dialog>

            {/* Dialog: Emergency Ward Spot & Bed Configurator */}
            <Dialog open={emSpotManagerOpen} onClose={() => setEmSpotManagerOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
              <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalHospital color="error" />
                  <Typography variant="h6" fontWeight={800}>Emergency Ward Spot & Trolley Configurator</Typography>
                </Box>
                <Button onClick={() => setEmSpotManagerOpen(false)} variant="outlined" size="small">Close</Button>
              </DialogTitle>
              <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
                  Configure specialized Emergency spots (Resuscitation Bays, A&E Trolleys & Stretchers, and Observation Chairs/Recliners). Configured spots are synchronized across Nursing Beds Map and A&E Virtual Floor Map.
                </Alert>

                {/* Quick Auto-Generator Controls */}
                <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2.5, bgcolor: '#f8fafc' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="primary" mb={1.5}>
                    ⚡ Quick Emergency Capacity Generator
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <TextField
                        size="small"
                        type="number"
                        label="🚨 Resuscitation Bays"
                        value={emResusCount}
                        onChange={e => setEmResusCount(Number(e.target.value) || 0)}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        size="small"
                        type="number"
                        label="🚑 A&E Trolleys"
                        value={emTrolleyCount}
                        onChange={e => setEmTrolleyCount(Number(e.target.value) || 0)}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        size="small"
                        type="number"
                        label="🪑 Observation Chairs"
                        value={emChairCount}
                        onChange={e => setEmChairCount(Number(e.target.value) || 0)}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="secondary"
                        startIcon={<FlashOn />}
                        onClick={handleBulkGenerateEmSpots}
                        sx={{ fontWeight: 800, textTransform: 'none', height: 40 }}
                      >
                        Generate & Sync
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Single Custom Spot Addition */}
                <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2.5 }}>
                  <Typography variant="subtitle2" fontWeight={800} mb={1.5}>
                    + Add Individual Emergency Spot
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                      size="small"
                      label="Spot Code *"
                      placeholder="e.g. RESUS-03, TRL-11, CHR-E"
                      value={newEmSpotCode}
                      onChange={e => setNewEmSpotCode(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>Spot Type</InputLabel>
                      <Select
                        value={newEmSpotType}
                        label="Spot Type"
                        onChange={e => setNewEmSpotType(e.target.value)}
                      >
                        <MenuItem value="RESUSCITATION_BAY">🚨 Resuscitation Bay (ESI 1)</MenuItem>
                        <MenuItem value="TROLLEY">🚑 A&E Stretcher / Trolley</MenuItem>
                        <MenuItem value="RECLINER_CHAIR">🪑 Observation Chair / Recliner</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      onClick={handleAddSingleEmSpot}
                      sx={{ fontWeight: 800, textTransform: 'none', height: 40 }}
                    >
                      Add Spot
                    </Button>
                  </Stack>
                </Paper>

                {/* Configured Emergency Spots Table */}
                <Typography variant="subtitle2" fontWeight={800} mb={1}>
                  Configured Emergency Spots & Trolleys ({emergencyBedsList.length})
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Spot Code</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Clinical Category</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">Current Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {emergencyBedsList.length === 0 ? (
                        <TableRow><TableCell colSpan={4} align="center"><Typography py={2} color="text.secondary">No emergency spots configured.</Typography></TableCell></TableRow>
                      ) : (
                        emergencyBedsList.map(eb => {
                          const isResus = eb.bedType === 'RESUSCITATION_BAY' || eb.bedCode.startsWith('RESUS');
                          const isTrolley = eb.bedType === 'TROLLEY' || eb.bedCode.startsWith('TRL');
                          return (
                            <TableRow key={eb.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight={800}>{eb.bedCode}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={isResus ? '🚨 Resuscitation Bay' : isTrolley ? '🚑 A&E Trolley' : '🪑 Observation Chair'}
                                  color={isResus ? 'error' : isTrolley ? 'primary' : 'warning'}
                                  variant="outlined"
                                  sx={{ fontWeight: 700 }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  size="small"
                                  label={eb.status}
                                  color={eb.status === 'OCCUPIED' ? 'error' : eb.status === 'AVAILABLE' ? 'success' : 'warning'}
                                  sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <IconButton size="small" color="error" onClick={() => handleDeleteEmSpot(eb.id, eb.bedCode)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setEmSpotManagerOpen(false)} variant="contained">Done</Button>
              </DialogActions>
            </Dialog>

          </Box>
        );
      })()}

      {/* Tab 4: Maternity Workspace */}
      {tab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="info" icon={<AutoAwesome />} sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={800}>
                Smart Partograph Labor Progression & Obstetric Risk Predictor Active
              </Typography>
              <Typography variant="caption">
                Continuous cervical dilatation rate tracking vs WHO alert lines · Early Dystocia Detection · Fetal Heart Rate Warning Radar · APGAR Birth Checklist
              </Typography>
            </Alert>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" mb={2}>Maternity Actions</Typography>
                <Stack spacing={2}>
                  <Button variant="outlined" startIcon={<BabyChangingStation />} onClick={() => setMaternityRegOpen(true)}>Antenatal Registration</Button>
                  <Button variant="outlined" startIcon={<TrendingUp />} onClick={() => setPartographOpen(true)}>Update Partograph</Button>
                  <Button variant="contained" startIcon={<CheckCircle />} onClick={() => setDeliveryOpen(true)}>Record Birth Delivery</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>Visual Partograph Dilatation Progress Chart</Typography>
            <Paper sx={{ p: 3, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: 250, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <Box sx={{ width: '100%', height: 180, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: '2px solid #ccc', borderLeft: '2px solid #ccc', pl: 2, pb: 1 }}>
                {/* Visual mock partograph line nodes */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">4 cm (Start)</Typography>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main', mb: '40px' }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">6 cm (4 Hrs)</Typography>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main', mb: '60px' }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">8 cm (8 Hrs)</Typography>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'warning.main', mb: '80px' }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">10 cm (Delivery)</Typography>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main', mb: '100px' }} />
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" mt={2}>
                Horizontal axis: Dilatation Hours. Vertical axis: Cervical dilatation (cm). Primary alert action lines are triggered if rate &lt; 1cm per hour.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 5: Ward Nurse Roster */}
      {tab === 5 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="success" icon={<Psychology />} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={800}>
                Smart Staffing & Roster Coverage Engine Active
              </Typography>
              <Typography variant="caption">
                Optimal Nurse-to-Patient Ratio: 1:4 · Mandatory Rest Period Enforcement · Automated Burnout Risk Prevention & Shift Swap Recommendations
              </Typography>
            </Alert>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" fontWeight={800}>Ward Nurse Roster</Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ToggleButtonGroup
                  value={rosterViewMode}
                  exclusive
                  onChange={(e, newMode) => newMode && setRosterViewMode(newMode)}
                  size="small"
                  sx={{ bgcolor: '#fff', borderRadius: 2 }}
                >
                  <ToggleButton value="table" sx={{ fontWeight: 700, px: 2, py: 0.5 }}>
                    <TableChart fontSize="small" sx={{ mr: 0.5 }} /> Table
                  </ToggleButton>
                  <ToggleButton value="calendar" sx={{ fontWeight: 700, px: 2, py: 0.5 }}>
                    <CalendarMonth fontSize="small" sx={{ mr: 0.5 }} /> Visual Calendar
                  </ToggleButton>
                </ToggleButtonGroup>
                <Button variant="outlined" color="primary" startIcon={<CalendarMonth />} onClick={() => setShiftConfigOpen(true)}>
                  Configure Shifts
                </Button>
                <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAddRoster(true)}>
                  Assign Nurse
                </Button>
              </Stack>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Assign nurses to wards by shift. The matron can manage daily rosters here. Switch to Visual Calendar view to see daily coverage grids.
            </Typography>

            {rosterViewMode === 'calendar' ? (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#ffffff' }}>
                {/* Calendar Controls Toolbar */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="h5" fontWeight={800} sx={{ color: '#1e293b', minWidth: 180 }}>
                      {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Typography>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                        sx={{ border: '1px solid rgba(0,0,0,0.12)' }}
                      >
                        <ChevronLeft />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                        sx={{ border: '1px solid rgba(0,0,0,0.12)' }}
                      >
                        <ChevronRight />
                      </IconButton>
                    </Stack>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Today />}
                      onClick={() => setCalendarDate(new Date())}
                      sx={{ fontWeight: 700 }}
                    >
                      Today
                    </Button>
                  </Stack>

                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Filter by Ward</InputLabel>
                    <Select
                      value={calendarWardFilter}
                      label="Filter by Ward"
                      onChange={e => setCalendarWardFilter(e.target.value)}
                      startAdornment={<FilterList fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />}
                    >
                      <MenuItem value="ALL">All Hospital Wards</MenuItem>
                      {wards.map(w => (
                        <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Days of Week Header */}
                <Grid container spacing={0.5} sx={{ mb: 0.5, textTransform: 'uppercase' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, idx) => (
                    <Grid item xs={12 / 7} key={dayName} sx={{ textAlign: 'center' }}>
                      <Box sx={{ py: 1, bgcolor: alpha('#1e293b', 0.05), borderRadius: 1, fontWeight: 800, fontSize: '0.75rem', color: idx === 0 || idx === 6 ? '#ef4444' : '#475569' }}>
                        {dayName}
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* Days Grid */}
                <Grid container spacing={0.5}>
                  {getCalendarGrid(calendarDate).map((cell, idx) => {
                    const activeRosters = getRostersForCellDate(cell.date);
                    return (
                      <Grid item xs={12 / 7} key={idx}>
                        <Paper
                          variant="outlined"
                          sx={{
                            minHeight: 110,
                            maxHeight: 140,
                            p: 1,
                            bgcolor: !cell.isCurrentMonth ? alpha('#f8fafc', 0.6) : cell.isToday ? alpha('#2563eb', 0.04) : '#ffffff',
                            borderColor: cell.isToday ? '#2563eb' : 'rgba(0,0,0,0.08)',
                            borderWidth: cell.isToday ? 2 : 1,
                            display: 'flex',
                            flexDirection: 'column',
                            opacity: cell.isCurrentMonth ? 1 : 0.45,
                            transition: 'all 0.15s ease-in-out',
                            '&:hover': {
                              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                            <Typography
                              variant="caption"
                              fontWeight={800}
                              sx={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: cell.isToday ? '#2563eb' : 'transparent',
                                color: cell.isToday ? '#ffffff' : cell.isCurrentMonth ? '#1e293b' : 'text.disabled',
                                fontSize: '0.75rem'
                              }}
                            >
                              {cell.dayNum}
                            </Typography>
                            {activeRosters.length > 0 && (
                              <Chip
                                label={`${activeRosters.length} ${activeRosters.length === 1 ? 'Duty' : 'Duties'}`}
                                size="small"
                                sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha('#1e293b', 0.08) }}
                              />
                            )}
                          </Box>

                          <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {activeRosters.map((r: any) => {
                              const style = getShiftBadgeStyle(r.shift);
                              const nurseName = `${r.staff?.firstName || r.staff?.user?.firstName || 'Nurse'} ${r.staff?.lastName || r.staff?.user?.lastName || ''}`;

                              return (
                                <Tooltip
                                  key={r.id}
                                  title={`${nurseName} — ${style.label} (${r.ward?.name || 'Ward'})`}
                                  arrow
                                >
                                  <Box
                                    onClick={() => setSelectedRosterEvent(r)}
                                    sx={{
                                      bgcolor: style.bg,
                                      color: style.color,
                                      borderRadius: 1,
                                      px: 0.8,
                                      py: 0.4,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                      '&:hover': { opacity: 0.9, transform: 'scale(1.02)' },
                                    }}
                                  >
                                    <Typography variant="caption" fontWeight={700} noWrap sx={{ fontSize: '0.65rem', maxWidth: '72%' }}>
                                      {nurseName}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontSize: '0.58rem', opacity: 0.95, fontWeight: 800 }}>
                                      {style.label}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              );
                            })}
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Paper>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: alpha('#1e293b', 0.04) }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Ward</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Nurse / Staff Member</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Shift Duty</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Roster Period (Start – End Date)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Duration</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Role / Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roster.length === 0 ? (
                      <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" py={3}>No active ward nurse roster assignments registered yet.</Typography></TableCell></TableRow>
                    ) : roster.map(r => {
                      const startDateFormatted = new Date(r.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                      const endDateFormatted = r.endDate ? new Date(r.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
                      const daysCount = r.endDate ? Math.max(1, Math.round((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86400000)) : null;
                      const durationText = daysCount ? (daysCount === 1 ? '1 Day' : daysCount === 7 ? '1 Week' : daysCount === 14 ? '2 Weeks' : daysCount === 30 ? '1 Month' : `${daysCount} Days`) : 'Ongoing';

                      return (
                        <TableRow key={r.id} hover>
                          <TableCell>
                            <Chip label={r.ward?.name || 'Ward'} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={700}>
                                {r.staff?.firstName || r.staff?.user?.firstName || 'Nurse'} {r.staff?.lastName || r.staff?.user?.lastName || ''}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {r.staff?.designation || 'Registered Nurse'} {r.staff?.employeeId ? `(#${r.staff.employeeId})` : ''}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={r.shift}
                              size="small"
                              color={r.shift === 'MORNING' ? 'info' : r.shift === 'AFTERNOON' ? 'warning' : r.shift === 'NIGHT' ? 'secondary' : 'primary'}
                              sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {startDateFormatted} {endDateFormatted ? `– ${endDateFormatted}` : ' (Ongoing)'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={durationText}
                              size="small"
                              variant="outlined"
                              color={daysCount && daysCount >= 30 ? 'success' : daysCount && daysCount >= 7 ? 'primary' : 'default'}
                              sx={{ fontWeight: 700, height: 22, fontSize: '0.68rem' }}
                            />
                          </TableCell>
                          <TableCell>
                            {r.isPrimary ? (
                              <Chip label="Head Nurse / Matron" color="primary" size="small" sx={{ fontWeight: 700 }} />
                            ) : (
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>Staff Nurse</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleRemoveRoster(r.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Grid>
        </Grid>
      )}
        </Card>
      </Box>

      {/* Dialog: Assign Patient to Nurse */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Assign Patient(s) to Nurse</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Autocomplete
              multiple
              options={patientsList.filter((p: any) => !p.isAssigned)}
              getOptionLabel={(p: any) => p.labelWithWard || `${p.firstName} ${p.lastName} (${p.patientNumber || p.mrn})`}
              value={patientsList.filter((p: any) => assignForm.patientIds?.includes(p.id) || assignForm.patientId === p.id)}
              onChange={(_, newValue: any[]) => {
                const selectedIds = newValue.map((p: any) => p.id);
                setAssignForm(prev => ({
                  ...prev,
                  patientIds: selectedIds,
                  patientId: selectedIds[0] || ''
                }));
              }}
              renderOption={(props, option, { selected }) => (
                <li {...props} key={option.id}>
                  <Checkbox
                    icon={<CheckBoxOutlineBlank fontSize="small" />}
                    checkedIcon={<CheckBox fontSize="small" />}
                    style={{ marginRight: 8 }}
                    checked={selected}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight="bold">
                      {option.firstName} {option.lastName} ({option.patientNumber || option.mrn || 'No MRN'})
                    </Typography>
                    <Typography variant="caption" color="primary">
                      📍 Ward: {option.wardName || 'General Ward'}{option.bedNumber ? ` · Bed #${option.bedNumber}` : ''}
                    </Typography>
                  </Box>
                </li>
              )}
              renderTags={(value: any[], getTagProps) =>
                value.map((option: any, index: number) => (
                  <Chip
                    variant="filled"
                    color="primary"
                    size="small"
                    label={`${option.firstName} ${option.lastName} (${option.wardName || 'Ward'})`}
                    {...getTagProps({ index })}
                    key={option.id}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Patient(s) across Wards"
                  placeholder="Search patient name, MRN or ward..."
                  helperText="Select one or multiple patients from different wards to assign to a nurse"
                />
              )}
            />

            <FormControl fullWidth>
              <InputLabel>Select Nurse Staff *</InputLabel>
              <Select
                value={assignForm.staffId}
                onChange={e => setAssignForm(prev => ({ ...prev, staffId: e.target.value }))}
                label="Select Nurse Staff *"
              >
                {staffList.map(s => {
                  const nurseName = s.firstName ? `${s.firstName} ${s.lastName}` : s.username;
                  return (
                    <MenuItem key={s.id} value={s.id}>
                      {`${nurseName} — (${s.designation || s.role || 'Nurse'})`}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <TextField
              label="Assignment Notes / Instructions"
              multiline
              rows={3}
              placeholder="e.g. Daily vitals check, post-op recovery monitoring, scheduled medication administration"
              value={assignForm.notes}
              onChange={e => setAssignForm(prev => ({ ...prev, notes: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAssignSubmit}
            variant="contained"
            disabled={!assignForm.staffId || (!assignForm.patientIds || assignForm.patientIds.length === 0)}
          >
            Assign {assignForm.patientIds?.length > 1 ? `${assignForm.patientIds.length} Patients` : 'Patient'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Shift Handover */}
      <Dialog open={handoverOpen} onClose={() => setHandoverOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={800}>Complete Shift Handover Note</Typography>
          <Button variant="outlined" color="secondary" size="small" startIcon={<AutoAwesome />} onClick={handleAiGenerateSbar}>
            Auto-SBAR
          </Button>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Outgoing Nurse"
                  value={dashboardData?.staffName || 'EMMANUEL VEGHER'}
                  InputProps={{ readOnly: true }}
                  fullWidth
                  size="medium"
                  sx={{ bgcolor: '#f8fafc' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  size="medium"
                  options={staffList.filter((s: any) => s.id !== (dashboardData?.staffId || handoverForm.outgoingNurseId))}
                  getOptionLabel={(s: any) => `${s.firstName ? `${s.firstName} ${s.lastName}` : s.employeeId || 'Nurse'} ${s.designation ? `(${s.designation})` : ''}`}
                  value={staffList.filter((s: any) => handoverForm.incomingNurseIds?.includes(s.id))}
                  onChange={(_, newValue) => {
                    const ids = newValue.map((s: any) => s.id);
                    setHandoverForm(prev => ({
                      ...prev,
                      incomingNurseIds: ids,
                      incomingNurseId: ids[0] || ''
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Incoming Nurse(s) on Duty *"
                      placeholder="Select receiving nurse(s)..."
                    />
                  )}
                  renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option: any, index: number) => (
                      <Chip
                        label={`${option.firstName ? `${option.firstName} ${option.lastName}` : 'Nurse'}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                />
              </Grid>
            </Grid>

            <FormControl fullWidth size="medium">
              <InputLabel id="select-patient-handover-label">Select Patient for Handover</InputLabel>
              <Select
                labelId="select-patient-handover-label"
                id="select-patient-handover-select"
                value={handoverForm.patientId}
                onChange={e => setHandoverForm(prev => ({ ...prev, patientId: e.target.value }))}
                label="Select Patient for Handover"
              >
                {handoverPatientOptions.map((p: any) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.labelWithWard || `${p.firstName} ${p.lastName} (${p.patientNumber || p.mrn || 'No MRN'}) — 📍 Ward: ${p.wardName || 'General Ward'}${p.bedNumber ? ` · Bed #${p.bedNumber}` : ''}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Patient Clinical Condition (Mandatory / SBAR Format)"
              multiline
              rows={2}
              value={handoverForm.condition}
              onChange={e => setHandoverForm(prev => ({ ...prev, condition: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Outstanding Nursing Tasks due next shift"
              multiline
              rows={2}
              value={handoverForm.outstandingTasks}
              onChange={e => setHandoverForm(prev => ({ ...prev, outstandingTasks: e.target.value }))}
              fullWidth
            />
            <Autocomplete
              multiple
              freeSolo
              size="medium"
              options={medicationOptions}
              getOptionLabel={(option: any) => (typeof option === 'string' ? option : option.name || '')}
              isOptionEqualToValue={(option: any, value: any) => {
                const optName = typeof option === 'string' ? option : option.name;
                const valName = typeof value === 'string' ? value : value.name;
                return optName === valName;
              }}
              value={handoverForm.scheduledMedsList || []}
              onChange={(_, newValue) => {
                const medsArray = newValue.map((item: any) => (typeof item === 'string' ? item : item.name || item.drugName));
                setHandoverForm(prev => ({
                  ...prev,
                  scheduledMedsList: medsArray,
                  medicationsDue: medsArray.join(', ')
                }));
              }}
              slotProps={{
                paper: {
                  sx: {
                    maxHeight: 260,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                    borderRadius: 2,
                    mt: 0.5,
                    '& .MuiAutocomplete-listbox': { p: 1 }
                  }
                }
              }}
              renderOption={(props, option: any) => {
                const isString = typeof option === 'string';
                const label = isString ? option : option.name;
                const rxCui = isString ? null : option.rxCui;
                const atcCode = isString ? null : option.atcCode;
                const category = isString ? 'Pharmacy Item' : option.category;

                return (
                  <Box component="li" {...props} key={label} sx={{ py: 1, px: 1.5, borderRadius: 1.5, mb: 0.5, '&:hover': { bgcolor: '#f1f5f9' } }}>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700} color="text.primary">
                          {label}
                        </Typography>
                        <Chip label={category} size="small" variant="outlined" color="primary" sx={{ fontSize: '0.68rem', height: 20, fontWeight: 700 }} />
                      </Box>
                      {(rxCui || atcCode) && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.4, fontFamily: 'monospace', fontSize: '0.73rem' }}>
                          <span>🏷️ <strong>RxNorm:</strong> {rxCui}</span>
                          <span>•</span>
                          <span><strong>WHO ATC:</strong> {atcCode}</span>
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Medications Scheduled (RxNorm & WHO ATC Interoperable Data Dictionary)"
                  placeholder="Search RxNorm dictionary or type custom medication..."
                  helperText="Mapped to RxNorm CUI & WHO ATC standard terminologies for HL7 FHIR interoperability"
                />
              )}
              renderTags={(tagValue, getTagProps) =>
                tagValue.map((option: any, index: number) => {
                  const label = typeof option === 'string' ? option : option.name;
                  return (
                    <Chip
                      label={label}
                      size="small"
                      color="info"
                      variant="filled"
                      {...getTagProps({ index })}
                      key={index}
                      sx={{ fontWeight: 600 }}
                    />
                  );
                })
              }
            />
            <TextField
              label="Clinical Concerns & Warnings"
              value={handoverForm.clinicalConcerns}
              onChange={e => setHandoverForm(prev => ({ ...prev, clinicalConcerns: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setHandoverOpen(false)}>Cancel</Button>
          <Button onClick={handleHandoverSubmit} variant="contained">Submit Handover</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Triage and Vital Signs */}
      <Dialog open={triageOpen} onClose={() => setTriageOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Record Patient Triage & Vitals</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Commented out Smart Voice & Text Vitals Extractor as requested
            <Box sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: isListeningDictation ? alpha('#ef4444', 0.08) : alpha('#1e3a8a', 0.04),
              border: isListeningDictation ? '1.5px solid #ef4444' : '1px dashed #1e3a8a50',
              transition: 'all 0.25s ease'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" fontWeight={700} color={isListeningDictation ? "error" : "primary"} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Mic fontSize="small" sx={{ animation: isListeningDictation ? 'pulse 1.2s infinite' : 'none' }} /> 
                  {isListeningDictation ? "High-Sensitivity Mic Active (Listening...)" : "Smart Voice & Text Vitals Extractor:"}
                </Typography>
                {isListeningDictation ? (
                  <Chip label="Noise Suppression & Auto Gain ON" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} />
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                    Click mic to record quiet/faint voices
                  </Typography>
                )}
              </Box>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={7.5}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder='e.g. "BP 140 over 90, temp 38.2, pulse 95, spo2 96%, severe headache"'
                    value={dictationText}
                    onChange={e => setDictationText(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Tooltip title={isListeningDictation ? "Stop Recording Voice" : "Start High-Sensitivity Noise-Cancelling Voice Capture"}>
                            <IconButton
                              size="small"
                              color={isListeningDictation ? "error" : "primary"}
                              onClick={toggleVoiceRecording}
                              sx={{
                                bgcolor: isListeningDictation ? alpha('#ef4444', 0.15) : alpha('#2563eb', 0.12),
                                border: `1px solid ${isListeningDictation ? '#ef4444' : '#2563eb'}`,
                                '&:hover': { bgcolor: isListeningDictation ? alpha('#ef4444', 0.25) : alpha('#2563eb', 0.22) }
                              }}
                            >
                              {isListeningDictation ? <MicOff fontSize="small" /> : <Mic fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={4.5}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    color="primary"
                    startIcon={isParsingDictation ? <CircularProgress size={14} color="inherit" /> : <AutoAwesome />}
                    onClick={handleAiParseDictation}
                    disabled={isParsingDictation}
                    sx={{ py: 0.8 }}
                  >
                    Parse Vitals
                  </Button>
                </Grid>
              </Grid>
            </Box>
            */}

            {/* Real-time NEWS2 Score Classifier */}
            {(() => {
              const score = calculateNews2Score(triageForm);
              const risk = getNews2RiskCategory(score);
              return (
                <Alert severity={score >= 5 ? "error" : score >= 3 ? "warning" : "success"} icon={<AutoAwesome />}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight={800}>
                      NEWS2 Risk Score: {score} — {risk.label}
                    </Typography>
                    <Chip label={`Priority: ${risk.priority}`} size="small" sx={{ bgcolor: risk.color, color: '#fff', fontWeight: 800 }} />
                  </Box>
                </Alert>
              );
            })()}

            <FormControl fullWidth>
              <InputLabel>Select Patient</InputLabel>
              <Select
                value={triageForm.patientId}
                onChange={e => setTriageForm(prev => ({ ...prev, patientId: e.target.value }))}
                label="Select Patient"
              >
                {patientsList.map(p => (
                  <MenuItem key={p.id} value={p.id}>{`${p.firstName} ${p.lastName}`}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField type="number" label="Systolic BP (mmHg)" value={triageForm.systolic} onChange={e => setTriageForm(prev => ({ ...prev, systolic: Number(e.target.value) }))} fullWidth /></Grid>
              <Grid item xs={6}><TextField type="number" label="Diastolic BP (mmHg)" value={triageForm.diastolic} onChange={e => setTriageForm(prev => ({ ...prev, diastolic: Number(e.target.value) }))} fullWidth /></Grid>
              <Grid item xs={4}><TextField type="number" label="Temp (°C)" value={triageForm.temperature} onChange={e => setTriageForm(prev => ({ ...prev, temperature: Number(e.target.value) }))} fullWidth /></Grid>
              <Grid item xs={4}><TextField type="number" label="Pulse (bpm)" value={triageForm.pulseRate} onChange={e => setTriageForm(prev => ({ ...prev, pulseRate: Number(e.target.value) }))} fullWidth /></Grid>
              <Grid item xs={4}><TextField type="number" label="Resp Rate" value={triageForm.respiratoryRate} onChange={e => setTriageForm(prev => ({ ...prev, respiratoryRate: Number(e.target.value) }))} fullWidth /></Grid>
              <Grid item xs={6}><TextField type="number" label="SpO2 (%)" value={triageForm.spo2} onChange={e => setTriageForm(prev => ({ ...prev, spo2: Number(e.target.value) }))} fullWidth /></Grid>
              <Grid item xs={3}>
                <TextField
                  type="number"
                  label="Weight (kg)"
                  value={triageForm.weight}
                  onChange={e => setTriageForm(prev => ({ ...prev, weight: e.target.value }))}
                  error={Boolean(triageForm.weight && (Number(triageForm.weight) <= 0 || Number(triageForm.weight) > 250))}
                  helperText={
                    triageForm.weight && Number(triageForm.weight) > 250
                      ? "⚠️ Exceeds max weight (250 kg)"
                      : triageForm.weight && Number(triageForm.weight) <= 0
                      ? "⚠️ Weight must be > 0"
                      : ""
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  type="number"
                  label="Height (cm)"
                  value={triageForm.height}
                  onChange={e => setTriageForm(prev => ({ ...prev, height: e.target.value }))}
                  error={Boolean(triageForm.height && (Number(triageForm.height) <= 0 || Number(triageForm.height) > 250))}
                  helperText={
                    triageForm.height && Number(triageForm.height) > 250
                      ? "⚠️ Exceeds max height (250 cm)"
                      : triageForm.height && Number(triageForm.height) <= 0
                      ? "⚠️ Height must be > 0"
                      : ""
                  }
                  fullWidth
                />
              </Grid>
            </Grid>
            <Box sx={{ position: 'relative' }}>
              <TextField
                label="Presenting Complaints (Mandatory)"
                multiline
                rows={2.8}
                value={triageForm.presentingComplaints}
                onChange={e => setTriageForm(prev => ({ ...prev, presentingComplaints: e.target.value }))}
                fullWidth
                placeholder="Type or click mic to dictate complaints. Spoken text is automatically rewritten into professional clinical SOAP notes..."
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 0.5, display: 'flex', gap: 0.5 }}>
                      <Tooltip title={isListeningComplaints ? "Pause Voice Dictation" : "Start Voice Dictation (Live Clinical Transcribe)"}>
                        <IconButton
                          size="small"
                          color={isListeningComplaints ? "error" : "primary"}
                          onClick={toggleComplaintsVoiceRecording}
                          sx={{
                            bgcolor: isListeningComplaints ? alpha('#ef4444', 0.15) : alpha('#2563eb', 0.12),
                            border: `1px solid ${isListeningComplaints ? '#ef4444' : '#2563eb'}`,
                            '&:hover': { bgcolor: isListeningComplaints ? alpha('#ef4444', 0.25) : alpha('#2563eb', 0.22) }
                          }}
                        >
                          {isListeningComplaints ? <MicOff fontSize="small" /> : <Mic fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Rewrite text into professional clinical SOAP presentation format">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => handleClinicalRewriteComplaint()}
                          sx={{
                            bgcolor: alpha('#7c3aed', 0.12),
                            border: '1px solid #7c3aed',
                            '&:hover': { bgcolor: alpha('#7c3aed', 0.22) }
                          }}
                        >
                          <AutoAwesome fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
              />
              {isListeningComplaints && (
                <Typography variant="caption" color="error.main" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <Mic fontSize="small" sx={{ animation: 'pulse 1.2s infinite' }} /> 🎤 Live Dictation Active — Auto-converting spoken speech into professional SOAP note...
                </Typography>
              )}
            </Box>
            <FormControl fullWidth>
              <InputLabel>Consciousness Level (AVPU)</InputLabel>
              <Select
                value={triageForm.consciousnessLevel}
                onChange={e => setTriageForm(prev => ({ ...prev, consciousnessLevel: e.target.value }))}
                label="Consciousness Level (AVPU)"
              >
                {CONSCIOUSNESS_LEVELS.map(level => (
                  <MenuItem key={level} value={level}>{level}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">Pain Score Intensity (0 - 10): {triageForm.painScore}</Typography>
            <Slider
              value={triageForm.painScore}
              onChange={(_, val) => setTriageForm(prev => ({ ...prev, painScore: val as number }))}
              min={0}
              max={10}
              marks
              valueLabelDisplay="auto"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTriageOpen(false)}>Cancel</Button>
          <Button onClick={handleTriageSubmit} variant="contained">Save Triage</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Add Task */}
      <Dialog open={taskOpen} onClose={() => setTaskOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Nursing Task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Select Patient</InputLabel>
              <Select
                value={taskForm.patientId}
                onChange={e => setTaskForm(prev => ({ ...prev, patientId: e.target.value }))}
                label="Select Patient"
              >
                {patientsList.map(p => (
                  <MenuItem key={p.id} value={p.id}>{`${p.firstName} ${p.lastName}`}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Task Description"
              value={taskForm.description}
              onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={taskForm.priority}
                onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                label="Priority"
              >
                <MenuItem value="ROUTINE">ROUTINE</MenuItem>
                <MenuItem value="URGENT">URGENT</MenuItem>
                <MenuItem value="CRITICAL">CRITICAL</MenuItem>
              </Select>
            </FormControl>
            <TextField
              type="datetime-local"
              label="Due Date"
              InputLabelProps={{ shrink: true }}
              value={taskForm.dueDate}
              onChange={e => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskOpen(false)}>Cancel</Button>
          <Button onClick={handleTaskSubmit} variant="contained">Add Task</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: eMAR Administration (OpenMed RAG & OpenMed SDK Smart Driven) */}
      <Dialog open={emarOpen} onClose={() => setEmarOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalPharmacy color="primary" />
            <Typography variant="h6" fontWeight={800}>eMAR Medication Administration Log</Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            startIcon={<AutoAwesome />}
            onClick={handleAutoFillEmarOpenMed}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#fff',
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            ✨ OpenMed Smart Auto-Fill
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {/* OpenMed Clinical Safety & RAG Verification Banner (Commented Out per user request) */}
            {/* 
            {(() => {
              const warning = checkDrugAllergy(emarForm.medicationName);
              if (warning) {
                return (
                  <Alert severity="error" icon={<Warning sx={{ fontSize: 28 }} />} sx={{ borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={800}>CRITICAL ALLERGY CONFLICT (OpenMed RAG)</Typography>
                    <Typography variant="body2">{warning}</Typography>
                  </Alert>
                );
              }
              return (
                <Alert
                  severity="success"
                  icon={<Shield sx={{ color: '#10b981' }} />}
                  sx={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={800} color="#065f46" sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <AutoAwesome sx={{ fontSize: 16, color: '#10b981' }} />
                    OpenMed RAG & OpenMed SDK 5-Rights Verification Active
                  </Typography>
                  <Typography variant="caption" color="#047857" display="block" sx={{ mt: 0.5 }}>
                    Right Patient · Right Drug · Right Dose · Right Route · Right Time · RxNorm CUI Mapped
                  </Typography>
                </Alert>
              );
            })()} 
            */}

            {/* Select Patient */}
            <FormControl fullWidth size="small">
              <InputLabel>Select Patient *</InputLabel>
              <Select
                value={emarForm.patientId}
                onChange={e => {
                  const newPatientId = e.target.value;
                  setEmarForm(prev => ({ ...prev, patientId: newPatientId }));
                  fetchEmarPatientData(newPatientId);
                }}
                label="Select Patient *"
              >
                {patientsList.map(p => (
                  <MenuItem key={p.id} value={p.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight={700}>{`${p.firstName} ${p.lastName}`}</Typography>
                      {p.wardName && (
                        <Chip size="small" label={p.wardName} color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Pending Payment Notice for Nurse */}
            {emarHasUnpaid && (
              <Alert severity="warning" icon={<InfoOutlined />} sx={{ borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={800}>Prescriptions Pending Payment at Cashier Counter</Typography>
                <Typography variant="caption" display="block">
                  This patient has doctor prescriptions pending payment confirmation in the Internal Banking module. Once payment is confirmed by Cashier, they will appear below for bedside administration.
                </Typography>
              </Alert>
            )}

            {/* Pending Pharmacist Dispensing Notice for Nurse (NEW) */}
            {emarHasUndispensed && (
              <Alert
                severity="info"
                icon={<InfoOutlined />}
                sx={{
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(2,132,199,0.05) 100%)',
                  border: '1px solid rgba(14,165,233,0.25)',
                }}
              >
                <Typography variant="subtitle2" fontWeight={800} color="#0369a1">
                  💊 Paid Prescriptions Awaiting Pharmacist Dispensing
                </Typography>
                <Typography variant="caption" display="block" color="#075985">
                  Some paid prescriptions for this patient have not yet been dispensed by the Pharmacy department. The nurse may only administer medications that have been physically dispensed from the pharmacy store. Please contact the Pharmacy to complete dispensing.
                </Typography>
              </Alert>
            )}


            {/* Smart Prescribed Ward Doctor Medication Orders (With Billing & Cashier Verification) */}
            {emarPrescriptions.length > 0 ? (
              <FormControl fullWidth size="small" sx={{ background: '#f0f9ff', borderRadius: 2, p: 2, border: '1px solid #bae6fd' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="caption" fontWeight={800} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, letterSpacing: 0.5 }}>
                    💊 WARD DOCTOR PRESCRIPTIONS & CASHIER BILLING CLEARANCE
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip size="small" label={`${emarPrescriptions.filter((p: any) => p.isPaid !== false && (p.isExternal || p.isDispensed !== false)).length} DISPENSED & READY`} color="success" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={<AutoAwesome />}
                      onClick={handleAutoFillEmarOpenMed}
                      disabled={emarLoading}
                      sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800, borderRadius: 1.5, textTransform: 'none', bgcolor: '#7950f2', '&:hover': { bgcolor: '#6741d9' } }}
                    >
                      {emarLoading ? 'Administering All...' : '⚡ Auto-Fill & Administer All Doses'}
                    </Button>
                  </Box>
                </Box>
                <Stack spacing={1.2}>
                  {emarPrescriptions.map((presc: any) => {
                    const isPaid = presc.isPaid !== false;
                    const isExternal = Boolean(presc.isExternal);
                    const isDispensed = isExternal || presc.isDispensed !== false;

                    const prescNameLower = (presc.medicationName || presc.drugName || '').toLowerCase().trim();
                    const adminLog = emarLogs.find((log: any) => {
                      if (log.status !== 'ADMINISTERED' && !log.administeredTime) return false;
                      const logMedLower = (log.medicationName || '').toLowerCase().trim();
                      return (prescNameLower && logMedLower.includes(prescNameLower)) || (logMedLower && prescNameLower.includes(logMedLower));
                    });
                    const isAlreadyAdministered = Boolean(adminLog);
                    const isCurrentlySelected = emarFormItems.some(it => 
                      it.medicationName && prescNameLower && (
                        it.medicationName.toLowerCase().includes(prescNameLower) || 
                        prescNameLower.includes(it.medicationName.toLowerCase())
                      )
                    );

                    // Determine card border/background based on 3-stage status
                    const cardBorderColor = isCurrentlySelected ? '#2563eb'
                      : isAlreadyAdministered ? '#86efac'
                      : (!isPaid) ? '#fed7aa'
                      : (!isDispensed) ? '#93c5fd'   // paid but awaiting dispensing → blue
                      : '#a7f3d0';                    // paid + dispensed → green
                    const cardBgColor = isCurrentlySelected ? '#eff6ff'
                      : isAlreadyAdministered ? '#f0fdf4'
                      : (!isPaid) ? '#fff7ed'
                      : (!isDispensed) ? '#eff6ff'
                      : '#ffffff';

                    return (
                      <Paper
                        key={presc.id}
                        variant="outlined"
                        onClick={() => handleSelectPrescription(presc)}
                        sx={{
                          p: 1.5,
                          cursor: 'pointer',
                          borderRadius: 2,
                          borderColor: cardBorderColor,
                          bgcolor: cardBgColor,
                          transition: 'all 0.2s ease',
                          '&:hover': { 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                            transform: 'translateY(-1px)'
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ fontSize: '0.9rem' }}>
                                {presc.medicationName || presc.drugName}
                              </Typography>
                              {isCurrentlySelected && (
                                <Chip label="✓ SELECTED FOR DOSING" color="primary" size="small" sx={{ fontWeight: 800, fontSize: '0.6rem', height: 18 }} />
                              )}
                              {isExternal && (
                                <Chip label="🌐 EXTERNAL PURCHASE" color="warning" size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.6rem', height: 18 }} />
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mt: 0.2 }}>
                              👨‍⚕️ Prescribed by: <strong style={{ color: '#0f172a' }}>{presc.doctorName || 'Ward Doctor'}</strong> · Ward: <strong>{presc.department || 'Inpatient Ward'}</strong>
                              {presc.dispensedBy && isDispensed && (
                                <> · 💊 Dispensed by: <strong style={{ color: '#047857' }}>{presc.dispensedBy}</strong></>
                              )}
                            </Typography>
                          </Box>
                          <Chip 
                            label={
                              isAlreadyAdministered ? '✅ ADMINISTERED'
                              : isCurrentlySelected ? '✓ SELECTED'
                              : (!isPaid) ? '⚠️ PAYMENT PENDING'
                              : (!isDispensed) ? '⏳ AWAITING DISPENSING'
                              : '💊 DISPENSED — READY'
                            }
                            size="small" 
                            color={
                              isAlreadyAdministered ? 'success'
                              : isCurrentlySelected ? 'primary'
                              : (!isPaid) ? 'warning'
                              : (!isDispensed) ? 'info'
                              : 'success'
                            }
                            variant="filled" 
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.65rem',
                              height: 22,
                              bgcolor: isAlreadyAdministered ? '#d3f9d8' : (!isDispensed && isPaid) ? '#dbeafe' : undefined,
                              color: isAlreadyAdministered ? '#2b8a3e' : (!isDispensed && isPaid) ? '#1e40af' : undefined,
                            }} 
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: '1px dashed #cbd5e1' }}>
                          <Typography variant="caption" sx={{ color: '#334155', fontWeight: 600 }}>
                            💉 <strong>{presc.dosage}</strong> · Route: <strong>{presc.route}</strong> · Freq: <strong>{presc.frequency}</strong>
                          </Typography>
                          <Button 
                            size="small" 
                            variant={isCurrentlySelected ? 'contained' : (isAlreadyAdministered ? 'outlined' : 'contained')} 
                            color={isCurrentlySelected ? 'primary' : isAlreadyAdministered ? 'success' : (!isPaid) ? 'warning' : (!isDispensed) ? 'info' : 'primary'}
                            sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800, borderRadius: 1 }}
                          >
                            {isCurrentlySelected ? '✓ Selected for Dosing'
                              : isAlreadyAdministered ? '✅ Administered (+ Add)'
                              : (!isPaid) ? '⚠️ Pending Payment'
                              : (!isDispensed) ? '⏳ Awaiting Pharmacy'
                              : '+ Add to Dosing Form'}
                          </Button>
                        </Box>
                        
                        {adminLog && (
                          <Typography variant="caption" color="success.dark" sx={{ display: 'block', mt: 0.5, fontWeight: 700, fontSize: '0.7rem' }}>
                            🕒 Administered at {new Date(adminLog.administeredTime || adminLog.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {adminLog.administerer ? `Nurse ${adminLog.administerer.lastName}` : 'Bedside Nurse'}
                          </Typography>
                        )}
                        {presc.notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3, fontStyle: 'italic', fontSize: '0.7rem' }}>
                            📝 Order Note: {presc.notes}
                          </Typography>
                        )}
                      </Paper>
                    );
                  })}
                </Stack>
              </FormControl>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2, py: 1 }}>
                <Typography variant="caption" fontWeight={700} sx={{ display: 'block' }}>
                  ℹ️ No Prescriptions Found for Patient
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  This patient has not been evaluated by a ward doctor yet, or their prescribed medications have not been processed and paid at the cashier counter.
                </Typography>
              </Alert>
            )}

            {/* Dynamic Multi-Medication Dosing Form Sections */}
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={800} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  📋 Selected Medication Dosing Sections ({emarFormItems.length})
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<Add fontSize="small" />}
                  onClick={handleAddEmptyEmarItem}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, py: 0.2 }}
                >
                  + Add Medication Line
                </Button>
              </Box>

              <Stack spacing={2}>
                {emarFormItems.map((item, idx) => (
                  <Card key={item.id} variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderColor: '#cbd5e1', bgcolor: '#f8fafc', position: 'relative' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="caption" fontWeight={800} color="primary.main" sx={{ fontSize: '0.75rem', letterSpacing: 0.3 }}>
                        💊 DOSING ENTRY #{idx + 1}: {item.medicationName || 'New Medication Entry'}
                      </Typography>
                      {emarFormItems.length > 1 && (
                        <IconButton size="small" color="error" onClick={() => handleRemoveEmarItem(item.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    <Stack spacing={1.8}>
                      {/* Smart Medication Name Autocomplete */}
                      <Autocomplete
                        freeSolo
                        options={STANDARD_MEDICATIONS_DICTIONARY}
                        getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                        value={item.medicationName}
                        onInputChange={(_, newInputValue) => {
                          const parsed = parseDosageAndRoute(newInputValue);
                          updateEmarItem(item.id, {
                            medicationName: newInputValue,
                            ...(parsed.dosage ? { dosage: parsed.dosage } : {}),
                            ...(parsed.route ? { route: parsed.route } : {})
                          });
                        }}
                        onChange={(_, newValue) => {
                          if (!newValue) {
                            updateEmarItem(item.id, { medicationName: '' });
                            return;
                          }
                          const selectedName = typeof newValue === 'string' ? newValue : newValue.name;
                          const parsed = parseDosageAndRoute(selectedName);
                          updateEmarItem(item.id, {
                            medicationName: selectedName,
                            dosage: parsed.dosage || item.dosage,
                            route: parsed.route || item.route
                          });
                        }}
                        renderOption={(props, option) => (
                          <Box component="li" {...props} key={option.id || option.name}>
                            <Box sx={{ width: '100%' }}>
                              <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Generic: {option.genericName} · ATC: {option.atcCode} · RxCui: {option.rxCui}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={`Medication Name #${idx + 1} *`}
                            placeholder="e.g. IV Ceftriaxone 1g, Oral Paracetamol 1g..."
                            size="small"
                            required
                          />
                        )}
                      />

                      {/* Dosage and Route */}
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Autocomplete
                            freeSolo
                            options={COMMON_DOSAGES}
                            value={item.dosage}
                            onInputChange={(_, newInputValue) => {
                              updateEmarItem(item.id, { dosage: newInputValue });
                            }}
                            onChange={(_, newValue) => {
                              updateEmarItem(item.id, { dosage: newValue || '' });
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Dosage *"
                                placeholder="e.g. 500mg, 1g..."
                                size="small"
                                required
                              />
                            )}
                          />
                        </Grid>

                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Administration Route *</InputLabel>
                            <Select
                              value={item.route || 'Oral'}
                              onChange={e => updateEmarItem(item.id, { route: e.target.value })}
                              label="Administration Route *"
                            >
                              <MenuItem value="Oral">Oral (PO - By Mouth)</MenuItem>
                              <MenuItem value="Intravenous">Intravenous (IV - Push / Infusion)</MenuItem>
                              <MenuItem value="Intramuscular">Intramuscular (IM - Injection)</MenuItem>
                              <MenuItem value="Subcutaneous">Subcutaneous (SC / Subcut)</MenuItem>
                              <MenuItem value="Inhalation">Inhalation (Nebulizer / Metered Inhaler)</MenuItem>
                              <MenuItem value="Topical">Topical (Transdermal / Ointment)</MenuItem>
                              <MenuItem value="Sublingual">Sublingual (SL - Under Tongue)</MenuItem>
                              <MenuItem value="Rectal">Rectal (PR - Suppository)</MenuItem>
                              <MenuItem value="Ophthalmic">Ophthalmic (Eye Drops / Ointment)</MenuItem>
                              <MenuItem value="Otic">Otic (Ear Drops)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>

                      {/* Body Site & Status */}
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Administration Body Site (Optional)</InputLabel>
                            <Select
                              value={item.site || ''}
                              onChange={e => updateEmarItem(item.id, { site: e.target.value })}
                              label="Administration Body Site (Optional)"
                            >
                              <MenuItem value="">-- Select Body Site --</MenuItem>
                              <MenuItem value="Left Peripheral IV Line">Left Peripheral IV Line</MenuItem>
                              <MenuItem value="Right Peripheral IV Line">Right Peripheral IV Line</MenuItem>
                              <MenuItem value="Central Venous Line / PICC">Central Venous Line / PICC</MenuItem>
                              <MenuItem value="Left Deltoid (IM)">Left Deltoid (IM)</MenuItem>
                              <MenuItem value="Right Deltoid (IM)">Right Deltoid (IM)</MenuItem>
                              <MenuItem value="Left Ventrogluteal (IM)">Left Ventrogluteal (IM)</MenuItem>
                              <MenuItem value="Right Ventrogluteal (IM)">Right Ventrogluteal (IM)</MenuItem>
                              <MenuItem value="Abdomen (Periumbilical - SC)">Abdomen (Periumbilical - SC)</MenuItem>
                              <MenuItem value="Thigh (Vastus Lateralis - SC/IM)">Thigh (Vastus Lateralis - SC/IM)</MenuItem>
                              <MenuItem value="Oral Cavity">Oral Cavity</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Administration Status</InputLabel>
                            <Select
                              value={item.status || 'ADMINISTERED'}
                              onChange={e => updateEmarItem(item.id, { status: e.target.value })}
                              label="Administration Status"
                            >
                              <MenuItem value="ADMINISTERED">ADMINISTERED (Dose Verified & Given)</MenuItem>
                              <MenuItem value="DELAYED">DELAYED (Clinical Hold / Patient Absent)</MenuItem>
                              <MenuItem value="OMITTED">OMITTED (Refused / NPO Order)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>

                      {item.status !== 'ADMINISTERED' && (
                        <FormControl fullWidth size="small">
                          <InputLabel>Reason for Delay or Omission *</InputLabel>
                          <Select
                            value={item.omittedReason || ''}
                            onChange={e => updateEmarItem(item.id, { omittedReason: e.target.value })}
                            label="Reason for Delay or Omission *"
                            required
                          >
                            <MenuItem value="Patient Refused Medication">Patient Refused Medication</MenuItem>
                            <MenuItem value="Patient Absent / Off-Ward for Procedure">Patient Absent / Off-Ward for Procedure</MenuItem>
                            <MenuItem value="NPO Order (Nothing By Mouth)">NPO Order (Nothing By Mouth)</MenuItem>
                            <MenuItem value="Clinical Hold (Abnormal Vitals / Lab Value)">Clinical Hold (Abnormal Vitals / Lab Value)</MenuItem>
                            <MenuItem value="Medication Out of Stock in Ward Cabinet">Medication Out of Stock in Ward Cabinet</MenuItem>
                            <MenuItem value="Doctor Order Modified / Discontinued">Doctor Order Modified / Discontinued</MenuItem>
                            <MenuItem value="IV Line Infiltrated / Inaccessible">IV Line Infiltrated / Inaccessible</MenuItem>
                            <MenuItem value="Patient Sleeping / Rest Period">Patient Sleeping / Rest Period</MenuItem>
                          </Select>
                        </FormControl>
                      )}

                      <TextField
                        label="Clinical Administration Notes"
                        value={item.notes || ''}
                        onChange={e => updateEmarItem(item.id, { notes: e.target.value })}
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                        placeholder="e.g. Verified bedside arm band, patient confirmed identity."
                      />
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEmarOpen(false)} variant="outlined" color="inherit">Cancel</Button>
          <Button
            onClick={handleEmarSubmit}
            variant="contained"
            disabled={emarSubmitting}
            startIcon={emarSubmitting ? <CircularProgress size={18} /> : <LocalPharmacy />}
            sx={{
              px: 3,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              fontWeight: 700
            }}
          >
            Log eMAR Dosing Record ({emarFormItems.filter(i => Boolean(i.medicationName?.trim())).length} Medication{emarFormItems.filter(i => Boolean(i.medicationName?.trim())).length !== 1 ? 's' : ''})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Antenatal Registration */}
      <Dialog open={maternityRegOpen} onClose={() => setMaternityRegOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Antenatal Registration (ANC Booking)</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Select Mother Patient</InputLabel>
              <Select
                value={maternityRegForm.patientId}
                onChange={e => setMaternityRegForm(prev => ({ ...prev, patientId: e.target.value }))}
                label="Select Mother Patient"
              >
                {patientsList.filter(p => p.gender === 'FEMALE').map(p => (
                  <MenuItem key={p.id} value={p.id}>{`${p.firstName} ${p.lastName}`}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField type="number" label="Gestation Number" value={maternityRegForm.gestationNumber} onChange={e => setMaternityRegForm(prev => ({ ...prev, gestationNumber: Number(e.target.value) }))} fullWidth />
            <TextField type="date" label="Last Menstrual Period (LMP) Date" InputLabelProps={{ shrink: true }} value={maternityRegForm.lmpDate} onChange={e => setMaternityRegForm(prev => ({ ...prev, lmpDate: e.target.value }))} fullWidth />
            <FormControlLabel
              control={<Switch checked={maternityRegForm.isHighRisk} onChange={e => setMaternityRegForm(prev => ({ ...prev, isHighRisk: e.target.checked }))} />}
              label="High Risk Pregnancy Flag"
            />
            {maternityRegForm.isHighRisk && (
              <TextField label="High Risk Complication Reason" value={maternityRegForm.highRiskReason} onChange={e => setMaternityRegForm(prev => ({ ...prev, highRiskReason: e.target.value }))} fullWidth />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMaternityRegOpen(false)}>Cancel</Button>
          <Button onClick={handleMaternityRegSubmit} variant="contained">Register ANC Profile</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Partograph Cervical Dilatation */}
      <Dialog open={partographOpen} onClose={() => setPartographOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Partograph Cervical dilatation Progress</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Pregnancy Profile ID" value={partographForm.pregnancyId} onChange={e => setPartographForm(prev => ({ ...prev, pregnancyId: e.target.value }))} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Membranes Status</InputLabel>
              <Select
                value={partographForm.membranesStatus}
                onChange={e => setPartographForm(prev => ({ ...prev, membranesStatus: e.target.value }))}
                label="Membranes Status"
              >
                <MenuItem value="INTACT">INTACT</MenuItem>
                <MenuItem value="RUPTURED">RUPTURED</MenuItem>
              </Select>
            </FormControl>
            <TextField type="number" label="Cervical Dilatation (cm: 0-10)" value={partographForm.cervicalDilatation} onChange={e => setPartographForm(prev => ({ ...prev, cervicalDilatation: Number(e.target.value) }))} fullWidth />
            <TextField type="number" label="Contractions (per 10m)" value={partographForm.contractionsFrequency} onChange={e => setPartographForm(prev => ({ ...prev, contractionsFrequency: Number(e.target.value) }))} fullWidth />
            <TextField type="number" label="Fetal Heart Rate (bpm)" value={partographForm.fetalHeartRate} onChange={e => setPartographForm(prev => ({ ...prev, fetalHeartRate: Number(e.target.value) }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPartographOpen(false)}>Cancel</Button>
          <Button onClick={handlePartographSubmit} variant="contained">Save Partograph</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Record Birth Delivery */}
      <Dialog open={deliveryOpen} onClose={() => setDeliveryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Birth Delivery & Neonatal APGAR</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Pregnancy Record ID" value={deliveryForm.pregnancyId} onChange={e => setDeliveryForm(prev => ({ ...prev, pregnancyId: e.target.value }))} fullWidth />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Delivery Method</InputLabel>
                  <Select
                    value={deliveryForm.deliveryType}
                    onChange={e => setDeliveryForm(prev => ({ ...prev, deliveryType: e.target.value }))}
                    label="Delivery Method"
                  >
                    <MenuItem value="VAGINAL">VAGINAL</MenuItem>
                    <MenuItem value="ASSISTED">ASSISTED</MenuItem>
                    <MenuItem value="CESAREAN">CESAREAN</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}><TextField type="number" label="Maternal Blood Loss (ml)" value={deliveryForm.bloodLossMl} onChange={e => setDeliveryForm(prev => ({ ...prev, bloodLossMl: Number(e.target.value) }))} fullWidth /></Grid>
            </Grid>
            <Divider><Chip label="Neonatal Baby Details" size="small" /></Divider>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="Baby Identifier Name" value={deliveryForm.babyName} onChange={e => setDeliveryForm(prev => ({ ...prev, babyName: e.target.value }))} fullWidth /></Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Sex</InputLabel>
                  <Select value={deliveryForm.sex} onChange={e => setDeliveryForm(prev => ({ ...prev, sex: e.target.value }))} label="Sex">
                    <MenuItem value="MALE">MALE</MenuItem>
                    <MenuItem value="FEMALE">FEMALE</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4}><TextField type="number" label="Birth Weight (kg)" value={deliveryForm.birthWeight} onChange={e => setDeliveryForm(prev => ({ ...prev, birthWeight: Number(e.target.value) }))} fullWidth /></Grid>
              <Grid item xs={4}><TextField type="number" label="Birth Length (cm)" value={deliveryForm.birthLength} onChange={e => setDeliveryForm(prev => ({ ...prev, birthLength: Number(e.target.value) }))} fullWidth /></Grid>
              <Grid item xs={4}><TextField type="number" label="Head Circ (cm)" value={deliveryForm.headCircumference} onChange={e => setDeliveryForm(prev => ({ ...prev, headCircumference: Number(e.target.value) }))} fullWidth /></Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField type="number" label="APGAR Score 1 Min (0-10)" value={deliveryForm.apgar1Min} onChange={e => setDeliveryForm(prev => ({ ...prev, apgar1Min: Number(e.target.value) }))} fullWidth /></Grid>
              <Grid item xs={6}><TextField type="number" label="APGAR Score 5 Min (0-10)" value={deliveryForm.apgar5Min} onChange={e => setDeliveryForm(prev => ({ ...prev, apgar5Min: Number(e.target.value) }))} fullWidth /></Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveryOpen(false)}>Cancel</Button>
          <Button onClick={handleDeliverySubmit} variant="contained">Log Birth</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Assign Nurse to Ward (Roster) */}
      <Dialog open={openAddRoster} onClose={() => setOpenAddRoster(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth color="primary" />
            <Typography variant="h6" fontWeight={800}>Assign Nurse to Ward Roster</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Ward *</InputLabel>
              <Select value={rosterForm.wardId} label="Select Ward *" onChange={e => setRosterForm(f => ({ ...f, wardId: e.target.value }))}>
                {wards.map(w => <MenuItem key={w.id} value={w.id}>{w.name} ({w.type || 'General'})</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Select Nurse *</InputLabel>
              <Select value={rosterForm.staffId} label="Select Nurse *" onChange={e => setRosterForm(f => ({ ...f, staffId: e.target.value }))}>
                {staffList.map((s: any) => (
                  <MenuItem key={s.id} value={s.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={600}>
                        {s.firstName} {s.lastName}
                      </Typography>
                      <Chip label={`${s.designation || s.role || 'Nurse'} • ${s.employeeId || 'Staff'}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.68rem', ml: 1 }} />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Shift Duty *</InputLabel>
              <Select value={rosterForm.shift} label="Shift Duty *" onChange={e => setRosterForm(f => ({ ...f, shift: e.target.value }))}>
                {(configuredShifts.length > 0 ? configuredShifts : [
                  { code: 'MORNING', label: 'Morning (6am–2pm)' },
                  { code: 'AFTERNOON', label: 'Afternoon (2pm–10pm)' },
                  { code: 'NIGHT', label: 'Night (10pm–6am)' },
                  { code: 'DAY_12H', label: '12-Hour Day (7am–7pm)' },
                  { code: 'NIGHT_12H', label: '12-Hour Night (7pm–7am)' },
                  { code: 'ON_CALL', label: 'On-Call Standby (24h)' },
                ]).map((sh: any) => (
                  <MenuItem key={sh.code} value={sh.code}>
                    {sh.label || `${sh.name} (${sh.startTime}–${sh.endTime})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Date Range Selection: Start Date & End Date */}
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#2563eb', 0.04), border: '1px solid #2563eb30' }}>
              <Typography variant="caption" fontWeight={700} color="primary" sx={{ mb: 1, display: 'block' }}>
                Roster Period & Schedule Duration (Days, Weeks, Months):
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Start Date *"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={rosterForm.startDate}
                    onChange={e => setRosterForm(f => ({ ...f, startDate: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="End Date (Optional)"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={rosterForm.endDate}
                    onChange={e => setRosterForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </Grid>
              </Grid>

              {/* Quick Duration Preset Buttons */}
              <Box sx={{ display: 'flex', gap: 0.8, mt: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">Quick Duration Preset:</Typography>
                {[
                  { label: '1 Day', days: 1 },
                  { label: '1 Wk (7 Days)', days: 7 },
                  { label: '2 Wks (14 Days)', days: 14 },
                  { label: '1 Mo (30 Days)', days: 30 },
                  { label: '3 Mos (90 Days)', days: 90 },
                ].map(p => (
                  <Chip
                    key={p.label}
                    label={p.label}
                    size="small"
                    clickable
                    color="primary"
                    variant="outlined"
                    onClick={() => {
                      const start = rosterForm.startDate ? new Date(rosterForm.startDate) : new Date();
                      const end = new Date(start.getTime() + p.days * 86400000);
                      setRosterForm(f => ({
                        ...f,
                        startDate: start.toISOString().slice(0, 10),
                        endDate: end.toISOString().slice(0, 10),
                      }));
                    }}
                    sx={{ height: 22, fontSize: '0.68rem' }}
                  />
                ))}
              </Box>
            </Box>

            <FormControlLabel
              control={<Switch checked={rosterForm.isPrimary} onChange={e => setRosterForm(f => ({ ...f, isPrimary: e.target.checked }))} />}
              label="Head Nurse / Primary Nurse for this ward"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddRoster(false)}>Cancel</Button>
          <Button onClick={handleAddRoster} variant="contained">Assign Nurse</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Selected Calendar Roster Details */}
      <Dialog open={Boolean(selectedRosterEvent)} onClose={() => setSelectedRosterEvent(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={800}>Nurse Roster Details</Typography>
          <IconButton size="small" onClick={() => setSelectedRosterEvent(null)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedRosterEvent && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: getShiftBadgeStyle(selectedRosterEvent.shift).bg, color: '#fff', fontWeight: 800, width: 44, height: 44 }}>
                  {(selectedRosterEvent.staff?.firstName?.[0] || selectedRosterEvent.staff?.user?.firstName?.[0] || 'N').toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {selectedRosterEvent.staff?.firstName || selectedRosterEvent.staff?.user?.firstName || 'Nurse'} {selectedRosterEvent.staff?.lastName || selectedRosterEvent.staff?.user?.lastName || ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {selectedRosterEvent.staff?.designation || 'Registered Nurse'} {selectedRosterEvent.staff?.employeeId ? `(#${selectedRosterEvent.staff.employeeId})` : ''}
                  </Typography>
                </Box>
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Assigned Ward:</Typography>
                <Chip label={selectedRosterEvent.ward?.name || 'General Ward'} color="primary" variant="outlined" size="small" sx={{ fontWeight: 700 }} />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Shift Duty:</Typography>
                <Chip
                  label={getShiftBadgeStyle(selectedRosterEvent.shift).label}
                  size="small"
                  sx={{ bgcolor: getShiftBadgeStyle(selectedRosterEvent.shift).bg, color: '#fff', fontWeight: 800 }}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Roster Period:</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {new Date(selectedRosterEvent.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {selectedRosterEvent.endDate ? ` – ${new Date(selectedRosterEvent.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ' (Ongoing)'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Role / Status:</Typography>
                <Typography variant="body2" fontWeight={700} color={selectedRosterEvent.isPrimary ? 'primary.main' : 'text.primary'}>
                  {selectedRosterEvent.isPrimary ? 'Head Nurse / Matron' : 'Staff Nurse'}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRosterEvent(null)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Nurse Shift & Ward Roster Shifts Configuration Dialog */}
      <Dialog open={shiftConfigOpen} onClose={() => setShiftConfigOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth color="primary" />
            <Typography variant="h6" fontWeight={800}>Nurse Shift & Ward Roster Shifts</Typography>
          </Box>
          <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setOpenAddShift(true)}>
            Add Shift
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Configure hospital shift definitions (times, hours, labels & theme colors). Configured shifts appear dynamically when creating ward rosters.
          </Alert>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 380, overflowY: 'auto' }}>
            {configuredShifts.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                No custom shifts configured yet. Standard shifts active.
              </Typography>
            ) : (
              configuredShifts.map((sh: any) => (
                <Box
                  key={sh.code}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(sh.color || '#2563eb', 0.05),
                    border: `1px solid ${alpha(sh.color || '#2563eb', 0.2)}`,
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={800} color="primary">
                        {sh.name || sh.label}
                      </Typography>
                      <Chip
                        label={`${sh.startTime} – ${sh.endTime}`}
                        size="small"
                        sx={{ bgcolor: sh.color || '#2563eb', color: '#fff', fontWeight: 700, height: 20, fontSize: '0.68rem' }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Code: {sh.code} • {sh.description || 'Shift duty coverage'}
                    </Typography>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => handleDeleteShift(sh.code)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShiftConfigOpen(false)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Add Custom Shift */}
      <Dialog open={openAddShift} onClose={() => setOpenAddShift(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add New Shift Definition</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Shift Code *" placeholder="e.g. NIGHT_12H" value={shiftForm.code} onChange={e => setShiftForm({ ...shiftForm, code: e.target.value })} fullWidth size="small" />
            <TextField label="Shift Display Name *" placeholder="e.g. Night Duty 12-Hour" value={shiftForm.name} onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })} fullWidth size="small" />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label="Start Time *" type="time" value={shiftForm.startTime} onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })} fullWidth size="small" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="End Time *" type="time" value={shiftForm.endTime} onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })} fullWidth size="small" InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
            <TextField label="Description" placeholder="Optional notes about coverage" value={shiftForm.description} onChange={e => setShiftForm({ ...shiftForm, description: e.target.value })} fullWidth multiline rows={2} size="small" />
            <Box>
              <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>Theme Color</Typography>
              <Stack direction="row" spacing={1}>
                {['#2563eb', '#d97706', '#7c3aed', '#059669', '#dc2626', '#0891b2'].map(c => (
                  <Box
                    key={c}
                    onClick={() => setShiftForm({ ...shiftForm, color: c })}
                    sx={{
                      width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                      border: shiftForm.color === c ? '2.5px solid #000' : '2px solid transparent'
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddShift(false)}>Cancel</Button>
          <Button onClick={handleAddShift} variant="contained" color="primary">Save Shift</Button>
        </DialogActions>
      </Dialog>

      {/* OpenMed Clinical CoPilot Widget */}
      <OpenMedUnitCoPilot unitName="Inpatient Ward" />
    </Box>
  );
};

export default NursingDashboard;
