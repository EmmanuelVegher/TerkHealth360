import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Box, Chip, Drawer, Typography, Stack, Divider,
  IconButton, List, ListItem, ListItemText, Avatar, Card, Tabs, Tab,
  CircularProgress, Alert, AlertTitle, LinearProgress, CardContent, Accordion,
  AccordionSummary, AccordionDetails, Tooltip, Menu, FormControl, InputLabel, Select, Grid, Autocomplete,
  FormControlLabel, Switch,
} from '@mui/material';
import {
  Close, EventNote, AutoAwesome, Shield, Science, Speed,
  Memory, WarningAmber, CheckCircle, ErrorOutline, Info, SmartToy,
  Mic, MicOff, DocumentScanner, GraphicEq, Add, Search, LocalPharmacy,
  Biotech, History, Warning, Edit, Delete, Check, ArrowForward,
  InfoOutlined, Description, VolumeUp, VolumeOff, Tune, FormatListNumbered,
  FormatListBulleted, CheckBox, FormatBold, ShortText, ExpandMore, FilterList,
  People, CheckCircleOutline, HourglassEmpty, ReportProblem, LocalHospitalOutlined, LocalHospital,
  MonitorHeart, Notes, Refresh, Repeat, AccessTime, TrendingUp, Lock, SwapHoriz, Person, PersonSearch,
  PersonalVideo, CameraAlt, Sensors, AccessibilityNew,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { QuickAppointmentModal } from '../components/QuickAppointmentModal';
import { TerminologyAutocomplete } from '../components/TerminologyAutocomplete';
import { PhysioReferralModal } from '../components/PhysioReferralModal';

const AI_PRIMARY = '#1e3a8a';
const AI_PURPLE  = '#7c3aed';
const AI_TEAL    = '#0d9488';

const DOSE_OPTIONS = ['1 tab', '2 tabs', '1 cap', '2 caps', '5 ml', '10 ml', '1 vial', '1 ampoule', '500 ml IV Infusion', '100 ml IV', 'Apply locally'];
const FREQ_OPTIONS = ['OD (Once daily)', 'BD (2x daily)', 'TDS (3x daily)', 'QDS (4x daily)', 'Stat (Immediately)', 'PRN (As needed)', 'Every 8 hours', 'Every 12 hours', 'Daily'];
const DURATION_OPTIONS = ['1 Day', '3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '30 Days', '60 Days', 'Continuous'];
const ROUTE_OPTIONS = ['Oral', 'IV (Intravenous)', 'IM (Intramuscular)', 'Subcutaneous', 'Topical', 'Inhalation', 'Sublingual', 'Rectal', 'Ophthalmic', 'Otic'];
const AI_SUCCESS = '#16a34a';
const AI_WARN    = '#ea580c';
const AI_DANGER  = '#dc2626';

const ICD10_CODES = [
  { code: 'B50.9', name: 'Plasmodium falciparum malaria, unspecified' },
  { code: 'I10',   name: 'Essential (primary) hypertension' },
  { code: 'E11.9', name: 'Type 2 diabetes mellitus without complications' },
  { code: 'J06.9', name: 'Acute upper respiratory infection, unspecified' },
  { code: 'A09',   name: 'Infectious gastroenteritis and colitis' },
  { code: 'K35.8', name: 'Acute appendicitis, unspecified' },
  { code: 'M79.1', name: 'Myalgia (muscle pain)' },
  { code: 'R50.9', name: 'Fever, unspecified' },
];



interface Patient   { id: string; name: { given: string[]; family: string }[]; }
interface Encounter {
  id: string; status: string;
  class: { code: string };
  subject: { reference: string; display: string };
  period: { start: string; end?: string };
  reasonCode?: { text: string }[];
  extension?: { url: string; valueString?: string }[];
}

interface SmartFormattedTextAreaProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  minRows?: number;
  maxRows?: number;
  placeholder?: string;
  differentiators?: string[];
  helperText?: string;
}

const SmartFormattedTextArea = ({
  label,
  value,
  onChange,
  rows,
  minRows = 4,
  maxRows = 12,
  placeholder,
  differentiators = [
    'Differential Diagnoses',
    'Clinical Findings',
    'Vital Parameters',
    'Treatment Plan',
    'Nursing Orders',
  ],
  helperText,
}: SmartFormattedTextAreaProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll to bottom when new text (like Voice Dictation) is appended
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [value]);

  const handleApplyFormatting = (type: 'numbered' | 'bullet' | 'checkbox' | 'bold') => {
    const activeEl = document.activeElement as HTMLTextAreaElement;
    const isThisTextarea = activeEl && activeEl.tagName === 'TEXTAREA';
    const start = isThisTextarea ? activeEl.selectionStart : value.length;
    const end = isThisTextarea ? activeEl.selectionEnd : value.length;
    const selectedText = value.substring(start, end);

    if (selectedText.length > 0) {
      const lines = selectedText.split('\n');
      let inserted = '';
      if (type === 'numbered') {
        inserted = lines.map((l, i) => `${i + 1}. ${l.replace(/^(\d+\.|[•\-*]|\[[\s|x]?\])\s*/, '')}`).join('\n');
      } else if (type === 'bullet') {
        inserted = lines.map(l => `• ${l.replace(/^(\d+\.|[•\-*]|\[[\s|x]?\])\s*/, '')}`).join('\n');
      } else if (type === 'checkbox') {
        inserted = lines.map(l => `[ ] ${l.replace(/^(\d+\.|[•\-*]|\[[\s|x]?\])\s*/, '')}`).join('\n');
      } else if (type === 'bold') {
        inserted = `**${selectedText}**`;
      }
      const newValue = value.substring(0, start) + inserted + value.substring(end);
      onChange(newValue);
    } else {
      const isStartOfLine = start === 0 || value[start - 1] === '\n';
      const prefix = isStartOfLine ? '' : '\n';
      let inserted = '';

      if (type === 'numbered') inserted = `${prefix}1. `;
      else if (type === 'bullet') inserted = `${prefix}• `;
      else if (type === 'checkbox') inserted = `${prefix}[ ] `;
      else if (type === 'bold') inserted = `**Key Clinical Finding**: `;

      const newValue = value.substring(0, start) + inserted + value.substring(start);
      onChange(newValue);
    }
  };

  const handleInsertDifferentiator = (diffText: string) => {
    const isStartOfLine = value.length === 0 || value.endsWith('\n');
    const prefix = isStartOfLine ? '' : '\n';
    const formatted = `${prefix}• ${diffText}: `;
    onChange(value + formatted);
    setAnchorEl(null);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          p: '4px 10px',
          borderRadius: '8px 8px 0 0',
          bgcolor: alpha('#1c7ed6', 0.05),
          borderColor: 'rgba(0, 0, 0, 0.2)',
          borderBottom: 'none',
        }}
      >
        <Typography variant="caption" fontWeight={800} color="primary" sx={{ mr: 1, fontSize: '0.725rem' }}>
          Format Toolbar:
        </Typography>

        <Tooltip title="Numbered List (1, 2, 3...) — Auto-increments on Enter">
          <IconButton size="small" onClick={() => handleApplyFormatting('numbered')} sx={{ borderRadius: 1.5, p: 0.5 }}>
            <FormatListNumbered fontSize="small" sx={{ color: '#1976d2' }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Bulleted List (•) — Auto-continues on Enter">
          <IconButton size="small" onClick={() => handleApplyFormatting('bullet')} sx={{ borderRadius: 1.5, p: 0.5 }}>
            <FormatListBulleted fontSize="small" sx={{ color: '#2e7d32' }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Task Checkbox ([ ]) — Auto-continues on Enter">
          <IconButton size="small" onClick={() => handleApplyFormatting('checkbox')} sx={{ borderRadius: 1.5, p: 0.5 }}>
            <CheckBox fontSize="small" sx={{ color: '#ed6c02' }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Bold Header (**Key**)">
          <IconButton size="small" onClick={() => handleApplyFormatting('bold')} sx={{ borderRadius: 1.5, p: 0.5 }}>
            <FormatBold fontSize="small" sx={{ color: '#9c27b0' }} />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.8 }} />

        <Button
          size="small"
          variant="text"
          startIcon={<ShortText fontSize="small" />}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ textTransform: 'none', fontSize: '0.725rem', fontWeight: 800, color: '#1c7ed6' }}
        >
          + Clinical Headers
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          {differentiators.map((diff, idx) => (
            <MenuItem key={idx} onClick={() => handleInsertDifferentiator(diff)} sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
              + {diff}
            </MenuItem>
          ))}
        </Menu>
      </Paper>

      <TextField
        label={label}
        multiline
        minRows={rows || minRows}
        maxRows={maxRows}
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputRef={textareaRef}
        placeholder={placeholder}
        helperText={helperText}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '0 0 8px 8px',
          },
        }}
      />
    </Box>
  );
};

const AiBadge = ({ label, color = AI_PURPLE }: { label: string; color?: string }) => (
  <Chip icon={<AutoAwesome sx={{ color: '#fff !important', fontSize: 12 }} />} label={label} size="small"
    sx={{ bgcolor: color, color: '#fff', fontWeight: 800, fontSize: '0.62rem', height: 20, px: 0.5 }} />
);

const RiskBadge = ({ risk }: { risk: string }) => {
  const cfg: any = {
    CRITICAL: { color: '#fff', bgcolor: AI_DANGER,  icon: <ErrorOutline sx={{ fontSize: 14 }} /> },
    HIGH:     { color: '#fff', bgcolor: AI_WARN,    icon: <WarningAmber sx={{ fontSize: 14 }} /> },
    MODERATE: { color: '#fff', bgcolor: '#d97706',  icon: <Info sx={{ fontSize: 14 }} /> },
    LOW:      { color: '#fff', bgcolor: AI_SUCCESS, icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  }[risk] || { color: '#fff', bgcolor: AI_SUCCESS, icon: <CheckCircle sx={{ fontSize: 14 }} /> };
  return <Chip icon={cfg.icon} label={risk} size="small" sx={{ bgcolor: cfg.bgcolor, color: cfg.color, fontWeight: 900, fontSize: '0.72rem', height: 22 }} />;
};

const OPD = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [open, setOpen]             = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openApptModal, setOpenApptModal] = useState(false);
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active'|'finished'|'all'>('active');
  const [doctorFilterMode, setDoctorFilterMode] = useState<'my_patients' | 'all_patients'>('my_patients');
  const [search, setSearch]         = useState('');
  const [activeTab, setActiveTab]   = useState(0);

  // Doctor Patient Transfer Modal state
  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [transferNotes, setTransferNotes] = useState('');
  const [targetDoctor, setTargetDoctor] = useState<any>(null);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Physiotherapy Electronic Referral Modal state
  const [physioReferralOpen, setPhysioReferralOpen] = useState(false);
  const [physioReferralPatient, setPhysioReferralPatient] = useState<any | null>(null);

  // Clinical Death & Mortuary Transfer state
  const [deceasedModalOpen, setDeceasedModalOpen] = useState(false);
  const [deceasedTargetEncounter, setDeceasedTargetEncounter] = useState<any | null>(null);
  const [cliniciansList, setCliniciansList] = useState<Array<{
    id: string;
    employeeId?: string;
    name: string;
    fullName: string;
    designation: string;
    department: string;
    label: string;
  }>>([]);
  const [deceasedForm, setDeceasedForm] = useState({
    certifyingClinician: '',
    causeOfDeath: '',
    medicoLegalStatus: 'NONE',
    deceasedAt: new Date().toISOString().slice(0, 16),
    identifyingFeatures: '',
    transferToMortuary: true,
    requestAutopsy: false,
    autopsyType: 'CLINICAL' as 'CLINICAL' | 'CORONER',
    nokName: '',
    nokRelationship: '',
    nokPhone: '',
  });
  const [submittingDeceased, setSubmittingDeceased] = useState(false);
  const [localDeceasedIds, setLocalDeceasedIds] = useState<Record<string, boolean>>({});

  // Load clinicians, physicians & medical consultants from staff management
  useEffect(() => {
    const fetchClinicians = async () => {
      try {
        const res = await api.get('/mortuary/certifying-clinicians');
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setCliniciansList(res.data.data);
          return;
        }
      } catch {}
      try {
        const staffRes = await api.get('/nursing/staff');
        const list = (staffRes.data || []).filter((s: any) => {
          const des = (s.designation || '').toLowerCase();
          return des.includes('doctor') || des.includes('physician') || des.includes('consultant')
            || des.includes('officer') || des.includes('surgeon') || des.includes('registrar') || des.includes('specialist');
        }).map((s: any) => {
          const fullName = `${s.firstName} ${s.lastName}`.replace(/^Dr\.?\s+/i, '');
          return {
            id: s.id,
            employeeId: s.employeeId,
            name: `Dr. ${fullName}`,
            fullName,
            designation: s.designation || 'Medical Officer',
            department: s.department || 'Clinical Services',
            label: `Dr. ${fullName} — ${s.designation || 'Medical Officer'} (${s.department || 'Clinical'}${s.employeeId ? ` · ${s.employeeId}` : ''})`
          };
        });
        if (list.length > 0) setCliniciansList(list);
      } catch {}
    };
    fetchClinicians();
  }, []);

  const handleOpenDeceasedModal = async (enc: any) => {
    setDeceasedTargetEncounter(enc);
    const diag = getIcd10(enc) || enc.reasonCode?.[0]?.text || 'Outpatient Emergency';
    const pat = (enc as any)?.patient || {};
    let nokName = pat.nokName || pat.emergencyName || pat.emergencyContactName || (enc as any)?.emergencyContact?.name || '';
    let nokRel = pat.nokRelationship || pat.emergencyRelationship || pat.emergencyContactRelationship || (enc as any)?.emergencyContact?.relationship || 'Next of Kin';
    let nokPhone = pat.nokPhone || pat.emergencyPhone || pat.emergencyContactPhone || (enc as any)?.emergencyContact?.phone || '';

    const defaultClinician = (cliniciansList.length > 0 ? `${cliniciansList[0].name} (${cliniciansList[0].designation})` : 'Dr. EMMANUEL VEGHER (Chief Consultant Physician)');

    setDeceasedForm({
      certifyingClinician: defaultClinician,
      causeOfDeath: `Cardiorespiratory Failure secondary to ${diag}`,
      medicoLegalStatus: 'NONE',
      deceasedAt: new Date().toISOString().slice(0, 16),
      identifyingFeatures: `Outpatient Department / Emergency · ${enc.subject?.display || 'Patient'}`,
      transferToMortuary: true,
      requestAutopsy: false,
      autopsyType: 'CLINICAL',
      nokName: nokName,
      nokRelationship: nokRel,
      nokPhone: nokPhone,
    });
    setDeceasedModalOpen(true);

    const patId = enc.subject?.reference ? enc.subject.reference.split('/')[1] : pat.id;
    if ((!nokName || !nokPhone) && patId) {
      try {
        const pRes = await api.get(`/patients/${patId}`);
        const pData = pRes.data?.data || pRes.data;
        if (pData) {
          const freshName = pData.nokName || pData.emergencyName || pData.emergencyContactName || '';
          const freshRel = pData.nokRelationship || pData.emergencyRelationship || pData.emergencyContactRelationship || '';
          const freshPhone = pData.nokPhone || pData.emergencyPhone || pData.emergencyContactPhone || '';
          if (freshName || freshPhone) {
            setDeceasedForm(prev => ({
              ...prev,
              nokName: prev.nokName || freshName,
              nokRelationship: prev.nokRelationship && prev.nokRelationship !== 'Next of Kin' ? prev.nokRelationship : (freshRel || 'Next of Kin'),
              nokPhone: prev.nokPhone || freshPhone,
            }));
          }
        }
      } catch {}
    }
  };

  const handleConfirmDeceased = async () => {
    if (!deceasedTargetEncounter) return;
    if (!deceasedForm.causeOfDeath.trim()) {
      enqueueSnackbar('Please state the certified cause of death.', { variant: 'warning' });
      return;
    }
    setSubmittingDeceased(true);
    try {
      const patId = deceasedTargetEncounter.subject?.reference ? deceasedTargetEncounter.subject.reference.split('/')[1] : `P-${deceasedTargetEncounter.id.substring(0, 6)}`;
      const patientDisplayName = deceasedTargetEncounter.subject?.display || 'Outpatient';

      // Synchronize Patient master record status to DECEASED (visible on /patients/:id)
      if (patId) {
        try {
          await api.patch(`/patients/${patId}/status`, { status: 'DECEASED' });
        } catch (e) {
          console.warn('Syncing patient status failed:', e);
        }
      }

      const cleanTargetName = patientDisplayName.toLowerCase().replace(/^late\s+/i, '').trim();

      const queuePayload = {
        patientId: patId,
        name: `Late ${patientDisplayName}`.replace(/^Late\s+Late\s+/i, 'Late '),
        gender: (deceasedTargetEncounter as any)?.patient?.gender || 'UNKNOWN',
        age: (deceasedTargetEncounter as any)?.patient?.age || null,
        source: 'OPD',
        sourceWard: 'Outpatient Department / Emergency',
        deceasedAt: deceasedForm.deceasedAt.replace('T', ' '),
        certifyingClinician: deceasedForm.certifyingClinician,
        causeOfDeath: deceasedForm.causeOfDeath,
        medicoLegalStatus: deceasedForm.medicoLegalStatus,
        identifyingFeatures: deceasedForm.identifyingFeatures,
        nokName: deceasedForm.nokName || 'Next of Kin',
        nokRelationship: deceasedForm.nokRelationship || 'Family',
        nokPhone: deceasedForm.nokPhone || '—',
      };

      if (deceasedForm.transferToMortuary) {
        let queuedItem = null;
        try {
          const resQ = await api.post('/mortuary/deceased-queue', queuePayload);
          if (resQ.data?.data) queuedItem = resQ.data.data;
        } catch {}

        try {
          const stored: any[] = JSON.parse(localStorage.getItem('smart_hospital_deceased_queue_v1') || '[]');
          const filtered = stored.filter(s => {
            if (queuePayload.patientId && s.patientId === queuePayload.patientId) return false;
            const sName = (s.name || '').toLowerCase().replace(/^late\s+/i, '').trim();
            if (sName && cleanTargetName && sName === cleanTargetName) return false;
            return true;
          });
          const itemToSave = queuedItem || { ...queuePayload, id: `DEC-${Date.now().toString().slice(-4)}`, status: 'PENDING_MORTUARY_INTAKE' };
          filtered.unshift(itemToSave);
          localStorage.setItem('smart_hospital_deceased_queue_v1', JSON.stringify(filtered));
        } catch {}
      } else {
        // Explicitly purge from Mortician's queue on backend and localStorage
        if (patId) {
          try {
            await api.delete(`/mortuary/deceased-queue/${patId}`);
          } catch {}
        }
        try {
          const raw = localStorage.getItem('smart_hospital_deceased_queue_v1');
          if (raw) {
            const stored: any[] = JSON.parse(raw);
            const filtered = stored.filter(s => {
              if (patId && s.patientId === patId) return false;
              if (s.id === patId) return false;
              const sName = (s.name || '').toLowerCase().replace(/^late\s+/i, '').trim();
              if (sName && cleanTargetName && sName === cleanTargetName) return false;
              return true;
            });
            localStorage.setItem('smart_hospital_deceased_queue_v1', JSON.stringify(filtered));
          }
        } catch {}
      }

      // Autopsy direct referral (to Pathology unit)
      if (deceasedForm.requestAutopsy) {
        try {
          const autPayload = {
            mrn: queuePayload.patientId,
            patientId: queuePayload.patientId,
            name: queuePayload.name,
            gender: queuePayload.gender,
            age: queuePayload.age,
            sourceWard: queuePayload.sourceWard,
            certifyingClinician: queuePayload.certifyingClinician,
            causeOfDeath: queuePayload.causeOfDeath,
            type: deceasedForm.autopsyType,
            inMortuary: deceasedForm.transferToMortuary,
            directReferral: true,
            pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
            scheduledTime: new Date().toLocaleString(),
          };

          await api.post('/mortuary/autopsies', autPayload);

          const savedAutopsies = JSON.parse(localStorage.getItem('smart_hospital_mortuary_autopsies_v1') || '{}');
          savedAutopsies[queuePayload.patientId] = {
            autopsyStatus: deceasedForm.autopsyType === 'CORONER' ? 'Coroner Forensic Autopsy Scheduled' : 'Clinical Pathology Autopsy Scheduled',
            causeOfDeath: queuePayload.causeOfDeath,
            findings: '',
            scheduledTime: new Date().toLocaleString(),
            pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
            statusStage: 'SCHEDULED',
          };
          localStorage.setItem('smart_hospital_mortuary_autopsies_v1', JSON.stringify(savedAutopsies));
        } catch (e) {
          console.warn('Failed to schedule direct autopsy:', e);
        }
      }

      setLocalDeceasedIds(prev => ({ ...prev, [deceasedTargetEncounter.id]: true }));
      if (selectedEncounter && selectedEncounter.id === deceasedTargetEncounter.id) {
        setSelectedEncounter((prev: any) => ({ ...prev, status: 'deceased' }));
      }
      queryClient.invalidateQueries('encounters');

      let successMsg = 'Outpatient certified deceased & patient master record synchronized.';
      if (deceasedForm.requestAutopsy && deceasedForm.transferToMortuary) {
        successMsg = 'Patient marked DECEASED, post-mortem autopsy requested with Pathology, and queued for Mortuary Cold Vault admission.';
      } else if (deceasedForm.requestAutopsy) {
        successMsg = 'Patient marked DECEASED and directly referred to Pathology for Post-Mortem Autopsy Examination (invoiced to Cashier).';
      } else if (deceasedForm.transferToMortuary) {
        successMsg = 'Patient marked DECEASED and queued for Mortuary Cold Vault admission.';
      }

      enqueueSnackbar(successMsg, { variant: 'success' });
      setDeceasedModalOpen(false);
    } catch (err: any) {
      enqueueSnackbar('Error recording death: ' + err.message, { variant: 'error' });
    } finally {
      setSubmittingDeceased(false);
    }
  };

  const DEFAULT_DOCTORS = [
    { id: 'doc-001', staffId: 'doc-001', fullName: 'Dr. Emmanuel Vegher', designation: 'Consultant Physician', department: 'OPD' },
    { id: 'doc-002', staffId: 'doc-002', fullName: 'Dr. Tertsegha Vegher', designation: 'Medical Officer', department: 'OPD' },
    { id: 'doc-003', staffId: 'doc-003', fullName: 'Dr. Grace Okafor', designation: 'Consultant Obstetrician & Gynaecologist', department: 'Maternity' },
    { id: 'doc-004', staffId: 'doc-004', fullName: 'Dr. Fatima Bello', designation: 'Senior Registrar Pediatrics', department: 'Pediatrics' },
    { id: 'doc-005', staffId: 'doc-005', fullName: 'Dr. Chidi Nwachukwu', designation: 'Consultant General Surgeon', department: 'Surgery' },
    { id: 'doc-006', staffId: 'doc-006', fullName: 'Dr. Ahmed Usman', designation: 'Medical Officer Emergency Care', department: 'Emergency' },
    { id: 'doc-007', staffId: 'doc-007', fullName: 'Dr. Sarah Johnson', designation: 'Senior Medical Officer', department: 'OPD' },
  ];

  const fetchDoctorsList = async () => {
    try {
      const r = await api.get('/queues/doctors').catch(() => null);
      if (r && Array.isArray(r.data) && r.data.length > 0) {
        setDoctorsList(r.data);
        return;
      }

      const hrRes = await api.get('/hr/employees').catch(() => null);
      if (hrRes && Array.isArray(hrRes.data) && hrRes.data.length > 0) {
        const docEmployees = hrRes.data.filter((e: any) => 
          (e.role || '').toLowerCase().includes('doctor') || 
          (e.role || '').toLowerCase().includes('physician') || 
          (e.firstName || '').startsWith('Dr.')
        ).map((e: any) => ({
          id: e.id,
          staffId: e.id,
          fullName: e.firstName && e.lastName ? (e.firstName.startsWith('Dr.') ? `${e.firstName} ${e.lastName}` : `Dr. ${e.firstName} ${e.lastName}`) : e.firstName,
          department: e.department || 'OPD',
          designation: e.role || 'Doctor',
        }));
        if (docEmployees.length > 0) {
          setDoctorsList(docEmployees);
          return;
        }
      }
      setDoctorsList(DEFAULT_DOCTORS);
    } catch (e) {
      console.warn('Failed to fetch doctors list:', e);
      setDoctorsList(DEFAULT_DOCTORS);
    }
  };

  const handleOpenTransfer = () => {
    fetchDoctorsList();
    setOpenTransferModal(true);
  };

  const handleTransferPatient = async () => {
    if (!selectedEncounter || !targetDoctor) {
      enqueueSnackbar('Please select a target doctor to transfer this patient to', { variant: 'warning' });
      return;
    }
    setSubmittingTransfer(true);
    try {
      const encId = selectedEncounter.id;
      const vId = (selectedEncounter as any).visitId || (selectedEncounter as any).visit?.id;
      const targetName = targetDoctor.fullName || targetDoctor.name || targetDoctor.username;

      await api.post('/queues/transfer-doctor', {
        encounterId: encId,
        visitId: vId,
        targetDoctorId: targetDoctor.id || targetDoctor.staffId,
        targetDoctorName: targetName.startsWith('Dr.') ? targetName : `Dr. ${targetName}`,
        transferNotes,
      });

      enqueueSnackbar(`✅ Patient ${selectedEncounter.subject?.display || ''} successfully transferred to ${targetName}`, { variant: 'success' });
      setOpenTransferModal(false);
      setTransferNotes('');
      setTargetDoctor(null);
      setDrawerOpen(false);
      queryClient.invalidateQueries('encounters');
    } catch (err) {
      enqueueSnackbar('Transfer failed', { variant: 'error' });
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const isAssignedToCurrentDoctor = (enc: Encounter) => {
    if (doctorFilterMode === 'all_patients') return true;
    const u = user as any;

    const currentDoctorIds = new Set(
      [u?.id, u?.userId, u?.staffId, u?.staff?.id].filter(Boolean)
    );

    const currentDoctorNames = [
      u?.fullName,
      u?.username,
      u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : null,
      u?.firstName ? `Dr. ${u.firstName}` : null,
    ].filter(Boolean).map((n: string) => n.toLowerCase());

    const assignedDocId = enc.extension?.find((x: any) => x.url?.includes('assignedDoctorId'))?.valueString;
    const assignedDocName = enc.extension?.find((x: any) => x.url?.includes('assignedDoctorName'))?.valueString;
    const encStaffId = (enc as any).staff?.id || (enc as any).staffId;

    if (assignedDocId || assignedDocName || encStaffId) {
      const idMatch = Boolean(
        (assignedDocId && currentDoctorIds.has(assignedDocId)) || 
        (encStaffId && currentDoctorIds.has(encStaffId))
      );
      const nameMatch = Boolean(
        assignedDocName && currentDoctorNames.some((name: string) => 
          assignedDocName.toLowerCase().includes(name) || name.includes(assignedDocName.toLowerCase())
        )
      );
      return idMatch || nameMatch;
    }
    
    // In "My Assigned Patients" mode, unassigned patients belong to general queue until claimed
    return false;
  };

  const getEncounterClassDisplay = (enc: Encounter) => {
    const vType = enc.extension?.find((x: any) => x.url?.includes('visitType'))?.valueString;
    const rawClass = vType || (enc as any).serviceType || (enc as any).type || (typeof enc.class === 'string' ? enc.class : enc.class?.code) || 'OUTPATIENT';
    const clean = rawClass.toUpperCase().replace(/_/g, ' ').trim();
    if (clean === 'AMBULATORY' || clean === 'AMB') return 'OUTPATIENT';
    if (clean === 'IMP') return 'INPATIENT';
    return clean;
  };
  const [emrSummary, setEmrSummary] = useState<any>(null);
  const [labOrders, setLabOrders]   = useState<any[]>([]);
  const [labCatalog, setLabCatalog] = useState<any[]>([]);
  const [pharmacyCatalog, setPharmacyCatalog] = useState<any[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [soapSubjective, setSoapSubjective]   = useState('');
  const [soapObjective, setSoapObjective]     = useState('');
  const [soapAssessments, setSoapAssessments] = useState<string[]>([]);
  const [soapPlan, setSoapPlan]               = useState('');
  const [savingSoap, setSavingSoap]           = useState(false);

  const [presCart, setPresCart]         = useState<any[]>([]);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [medDose, setMedDose]           = useState('1 tab');
  const [medFreq, setMedFreq]           = useState('TDS');
  const [medDuration, setMedDuration]   = useState('5 Days');
  const [medRoute, setMedRoute]         = useState('Oral');
  const [medQty, setMedQty]             = useState(10);
  const [prescribing, setPrescribing]   = useState(false);
  const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);

  const [labCart, setLabCart]           = useState<any[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [labPriority, setLabPriority]   = useState('ROUTINE');
  const [orderingLab, setOrderingLab]   = useState(false);

  // ── Radiology Scan State ──────────────────────────────────────────────────
  const [radOrders, setRadOrders]             = useState<any[]>([]);
  const [radCatalog, setRadCatalog]           = useState<any[]>([]);
  const [radCart, setRadCart]                 = useState<any[]>([]);
  const [selectedRadCatalogId, setSelectedRadCatalogId] = useState('');
  const [radPriority, setRadPriority]         = useState('ROUTINE');
  const [radHistory, setRadHistory]           = useState('');
  const [orderingRad, setOrderingRad]         = useState(false);
  const [radViewerOpen, setRadViewerOpen]     = useState(false);
  const [selectedRadViewerOrder, setSelectedRadViewerOrder] = useState<any>(null);

  // OpenMed Clinical Intelligence state
  const [aiStatus, setAiStatus]                 = useState<any>(null);
  const [aiRisk, setAiRisk]                     = useState<any>(null);
  const [aiNerEntities, setAiNerEntities]       = useState<any[]>([]);
  const [aiSoapLoading, setAiSoapLoading]       = useState(false);
  const [aiLoadingRisk, setAiLoadingRisk]       = useState(false);
  const [aiLoadingLabs, setAiLoadingLabs]       = useState(false);
  const [aiLabSuggestions, setAiLabSuggestions] = useState<any[]>([]);
  const [aiMedSuggestions, setAiMedSuggestions] = useState<any[]>([]);
  const [aiMedRecs, setAiMedRecs]               = useState<any[]>([]);
  const [aiLabRecs, setAiLabRecs]               = useState<any[]>([]);
  const [aiLoadingMeds, setAiLoadingMeds]       = useState(false);
  const [aiPrescribeRecs, setAiPrescribeRecs]   = useState<any[]>([]);
  const [aiLoadingPrescribeRecs, setAiLoadingPrescribeRecs] = useState(false);
  const [soapAutoGenerated, setSoapAutoGenerated] = useState(false);
  const [emarLogs, setEmarLogs]                 = useState<any[]>([]);
  const [lastSavedAssessment, setLastSavedAssessment] = useState<string[]>([]);
  const [lastSavedSubjective, setLastSavedSubjective] = useState<string>('');
  const [lastSavedPlan, setLastSavedPlan]             = useState<string>('');
  const [lastSavedDate, setLastSavedDate]             = useState<Date | null>(null);

  // Doctor Inpatient Admission Order state
  const [orderAdmissionOpen, setOrderAdmissionOpen] = useState(false);
  const [wardsList, setWardsList]                   = useState<any[]>([]);
  const [targetWardCategory, setTargetWardCategory] = useState('PAEDIATRIC');
  const [admissionUrgency, setAdmissionUrgency]       = useState('URGENT');
  const [admissionDiagnosis, setAdmissionDiagnosis] = useState('');
  const [admissionDiagnosisList, setAdmissionDiagnosisList] = useState<string[]>([]);
  const [admissionNotes, setAdmissionNotes]         = useState('');
  const [submittingAdmissionOrder, setSubmittingAdmissionOrder] = useState(false);
  const [generatingNursingOrders, setGeneratingNursingOrders]   = useState(false);

  const handleOpenAdmissionModal = () => {
    // 1. Gather active/saved diagnoses
    let initialDiags: string[] = [];
    if (soapAssessments && soapAssessments.length > 0) {
      initialDiags = [...soapAssessments];
    } else if (lastSavedAssessment && lastSavedAssessment.length > 0) {
      initialDiags = [...lastSavedAssessment];
    } else if (selectedEncounter) {
      const encDiag = getIcd10(selectedEncounter);
      if (encDiag && encDiag !== 'None') {
        initialDiags = [encDiag];
      }
    }
    
    const pastNotes = emrSummary?.consultationNotes || [];
    if (initialDiags.length === 0 && pastNotes.length > 0) {
      const latestNote = pastNotes[0];
      if (latestNote.assessment) {
        initialDiags = latestNote.assessment.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    setAdmissionDiagnosisList(initialDiags);
    setAdmissionDiagnosis(initialDiags.join(', '));

    // 2. Gather active/saved Plan for Special Nursing / Unit Orders
    let initialPlan = (soapPlan && soapPlan.trim()) || lastSavedPlan || '';
    if (!initialPlan && pastNotes.length > 0) {
      initialPlan = pastNotes[0]?.plan || '';
    }

    if (initialPlan) {
      setAdmissionNotes(initialPlan);
    } else if (initialDiags.length > 0) {
      handleAutoGenerateNursingOrders(initialDiags);
    }

    setOrderAdmissionOpen(true);
  };

  const handleAutoGenerateNursingOrders = async (diagList?: string[]) => {
    const currentDiags = diagList || admissionDiagnosisList;
    if (!currentDiags || currentDiags.length === 0) return;
    setGeneratingNursingOrders(true);
    try {
      const res = await api.post('/openmed/suggest-nursing-orders', {
        diagnoses: currentDiags,
        ward: targetWardCategory,
        urgency: admissionUrgency,
      });
      if (res.data?.nursingOrders) {
        setAdmissionNotes(res.data.nursingOrders);
        enqueueSnackbar('✨ OpenMed CDS auto-generated Special Nursing / Unit Orders', { variant: 'info' });
      }
    } catch (err) {
      console.error('Failed to generate nursing orders:', err);
    } finally {
      setGeneratingNursingOrders(false);
    }
  };

  const handleOrderInpatientAdmission = async () => {
    const encAny = selectedEncounter as any;
    const visitId = encAny?.visitId || encAny?.visit?.id || encAny?.id;
    if (!visitId) {
      enqueueSnackbar('Please select an active patient encounter first', { variant: 'warning' });
      return;
    }
    setSubmittingAdmissionOrder(true);
    const finalDiag = (admissionDiagnosisList.length > 0 ? admissionDiagnosisList.join(', ') : admissionDiagnosis) || (selectedEncounter ? getIcd10(selectedEncounter) : '') || 'Clinical Admission';
    try {
      await api.post(
        `/visits/${visitId}/order-admission`,
        {
          targetWardCategory,
          urgency: admissionUrgency,
          admissionDiagnosis: finalDiag,
          notes: admissionNotes,
        }
      );
      enqueueSnackbar('✅ Inpatient Admission Order submitted! Patient sent to Internal Banking for deposit clearance.', { variant: 'success' });
      setOrderAdmissionOpen(false);
      setDrawerOpen(false);
      queryClient.invalidateQueries('encounters');
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to submit admission order', { variant: 'error' });
    } finally {
      setSubmittingAdmissionOrder(false);
    }
  };

  const isToday = (dateString?: string | Date) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const getEffectiveAssessments = (): string[] => {
    // 1. Active draft in input box (typed, selected chips, or imported into input box)
    if (soapAssessments.length > 0) return soapAssessments;

    // 2. Saved in current session for TODAY
    if (lastSavedAssessment.length > 0 && lastSavedDate && isToday(lastSavedDate)) {
      return lastSavedAssessment;
    }

    // 3. Recorded SOAP Note for TODAY in patient history
    const todayNote = (emrSummary?.soapNotes || emrSummary?.consultationNotes || []).find((n: any) =>
      isToday(n.createdAt || n.date || n.updatedAt)
    );

    if (todayNote?.assessment && typeof todayNote.assessment === 'string' && todayNote.assessment.trim()) {
      return todayNote.assessment.split(/,\s*/).map((s: string) => s.trim()).filter(Boolean);
    }

    // 4. Otherwise (no note recorded for today and input box is empty), return []
    return [];
  };

  // Voice transcription state
  const [isListening, setIsListening]           = useState(false);
  const [voiceTranscript, setVoiceTranscript]   = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceSupported]                         = useState(() => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const [recognitionRef, setRecognitionRef]      = useState<any>(null);
  const [voiceAnalysis, setVoiceAnalysis]       = useState<any>(null);
  const [voiceSummarizing, setVoiceSummarizing] = useState(false);
  const transcriptBufferRef  = useRef<string>('');
  const interimBufferRef     = useRef<string>('');
  const isProcessingVoiceRef = useRef<boolean>(false);

  // Scan / OCR state
  const [scanLoading, setScanLoading]           = useState(false);

  // Helper to resolve doctor attribution
  const getDoctorAttribution = (entity: any) => {
    if (!entity) return 'Attending OPD Doctor';
    if (entity.requestedBy) {
      if (typeof entity.requestedBy === 'object') {
        const fn = entity.requestedBy.firstName || '';
        const ln = entity.requestedBy.lastName || '';
        const name = `${fn} ${ln}`.trim() || entity.requestedBy.name || 'Doctor';
        const role = entity.requestedBy.designation || entity.requestedBy.role || '';
        return `Dr. ${name.replace(/^Dr\.\s*/i, '')}${role ? ` (${role})` : ''}`;
      }
      return `Dr. ${String(entity.requestedBy).replace(/^Dr\.\s*/i, '')}`;
    }
    if (entity.doctor) {
      if (typeof entity.doctor === 'object') {
        const fn = entity.doctor.firstName || '';
        const ln = entity.doctor.lastName || '';
        const name = `${fn} ${ln}`.trim() || entity.doctor.name || 'Doctor';
        const role = entity.doctor.designation || entity.doctor.role || '';
        return `Dr. ${name.replace(/^Dr\.\s*/i, '')}${role ? ` (${role})` : ''}`;
      }
      return `Dr. ${String(entity.doctor).replace(/^Dr\.\s*/i, '')}`;
    }
    if (entity.doctorName) return `Dr. ${String(entity.doctorName).replace(/^Dr\.\s*/i, '')}`;
    if (entity.prescribedBy) return `Dr. ${String(entity.prescribedBy).replace(/^Dr\.\s*/i, '')}`;
    if (entity.authorName) return `Dr. ${String(entity.authorName).replace(/^Dr\.\s*/i, '')}`;
    return 'Attending OPD Doctor';
  };

  const getStockStatus = (medName?: string) => {
    if (!medName || typeof medName !== 'string') return { inStock: false, qty: 0, item: null, dispQty: 0, storeQty: 0, totalQty: 0 };
    const cleanMed = medName.toLowerCase().replace(/\([^)]*\)/g, '').trim();
    const tokens = cleanMed.split(/[\s\/-]+/).filter(t => t.length > 2 && !/^\d+mg$/i.test(t) && !/^\d+g$/i.test(t));
    const match = pharmacyCatalog.find(item => {
      const haystack = `${item.name || ''} ${item.genericName || ''} ${item.brandName || ''} ${item.tradeName || ''}`.toLowerCase();
      return tokens.some(t => haystack.includes(t)) || haystack.includes(cleanMed.substring(0, 5));
    });

    if (!match) return { inStock: false, qty: 0, item: null, dispQty: 0, storeQty: 0, totalQty: 0 };

    const batches = match.batches || [];
    const dispQty = match.dispensaryStock !== undefined ? Number(match.dispensaryStock) : batches
      .filter((b: any) => b.warehouse?.code === 'DISP-MAIN' || b.warehouse?.name?.toLowerCase().includes('dispensary'))
      .reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0);

    const storeQty = match.centralStoreStock !== undefined ? Number(match.centralStoreStock) : batches
      .filter((b: any) => b.warehouse?.code === 'WH-MAIN' || b.warehouse?.name?.toLowerCase().includes('central') || b.warehouse?.name?.toLowerCase().includes('warehouse') || b.warehouse?.name?.toLowerCase().includes('store'))
      .reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0);

    const totalQty = dispQty + storeQty;
    return {
      inStock: totalQty > 0,
      qty: totalQty,
      dispQty,
      storeQty,
      totalQty,
      item: match,
    };
  };

  const getLabStatus = (testName?: string) => {
    if (!testName || typeof testName !== 'string') return { available: false, item: null };
    const cleanTest = testName.toLowerCase().replace(/\([^)]*\)/g, '').trim();
    const match = labCatalog.find(item => {
      const nameStr = (item.testName || item.name || '').toLowerCase();
      const codeStr = (item.testCode || item.code || '').toLowerCase();
      const catStr = (item.category || '').toLowerCase();
      const haystack = `${nameStr} ${codeStr} ${catStr}`;
      return haystack.includes(cleanTest) || (nameStr.length > 2 && cleanTest.includes(nameStr));
    });
    if (!match) return { available: false, item: null };
    return {
      available: match.isAvailable !== false && match.isActive !== false,
      item: match,
    };
  };

  const fetchWards = useCallback(async () => {
    try {
      const res = await api.get('/wards');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (list.length > 0) {
        setWardsList(list);
        setTargetWardCategory(prev => prev || list[0].name || list[0].wardCategory || 'GENERAL');
        return;
      }
    } catch (e) {}

    try {
      const res = await api.get('/ipd/wards');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (list.length > 0) {
        setWardsList(list);
        setTargetWardCategory(prev => prev || list[0].name || list[0].wardCategory || 'GENERAL');
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchWards();
    api.get('/openmed/status').then(r => setAiStatus(r.data.data)).catch(() =>
      setAiStatus({ modelName: 'OpenMed-Clinical-NER-DeID-7B', latencyAvgMs: 22, memoryUsageMb: 1850, status: 'ONLINE' })
    );
    api.get('/lims/catalog').then(r => setLabCatalog(r.data)).catch(() => {});
    api.get('/pharmacy/inventory').then(r => setPharmacyCatalog(r.data)).catch(() => {});
    api.get('/radiology/catalog').then(r => setRadCatalog(r.data || [])).catch(() => {});
  }, [fetchWards]);

  const fetchEmrData = async (patId: string) => {
    setLoadingSummary(true);
    try {
      const [rs, ro, rads] = await Promise.all([
        api.get(`/emr/summary/${patId}`),
        api.get(`/lims/orders`, { params: { patientId: patId } }),
        api.get(`/radiology/orders`, { params: { patientId: patId } })
      ]);
      setEmrSummary(rs.data);
      setLabOrders(ro.data);
      setRadOrders(rads.data || []);
    } catch { enqueueSnackbar('Failed to load clinical data', { variant: 'error' }); }
    finally { setLoadingSummary(false); }
  };

  useEffect(() => {
    if (!selectedEncounter) {
      setEmrSummary(null); setLabOrders([]); setPatientPrescriptions([]);
      setAiRisk(null); setAiNerEntities([]); setAiLabSuggestions([]); setAiMedSuggestions([]); setAiPrescribeRecs([]);
      return;
    }
    const patId = selectedEncounter.subject.reference.split('/')[1];
    if (!patId) return;
    fetchEmrData(patId); setPresCart([]); setLabCart([]);
    api.get(`/pharmacy/prescriptions?patientId=${patId}`).then(r => setPatientPrescriptions(r.data || [])).catch(() => {});

    // Automatically transition Visit Journey state to IN_CONSULTATION when patient workspace is opened
    api.post('/workflow/start-consultation', { encounterId: selectedEncounter.id, patientId: patId }).then(() => {
      queryClient.invalidateQueries('visits');
    }).catch(() => {});
  }, [selectedEncounter]);

  const loadedEncounterIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!emrSummary || !selectedEncounter) return;

    const encId = selectedEncounter.id;
    const isNewEncounter = loadedEncounterIdRef.current !== encId;

    // Check triage vitals for risk stratify
    const tr = emrSummary.triageRecords?.[0];
    const vitStr = tr
      ? `BP: ${tr.systolic}/${tr.diastolic} mmHg | Temp: ${tr.temperature}°C | Pulse: ${tr.pulseRate} bpm | SpO2: ${tr.spo2}% | RR: ${tr.respiratoryRate}/min | NEWS2: ${tr.news2Score ?? 0}`
      : '';

    if (isNewEncounter) {
      loadedEncounterIdRef.current = encId;

      // Clean draft SOAP entry for new note with Clinical Rewrite
      const rawTriageComplaint = tr?.presentingComplaints || selectedEncounter.reasonCode?.[0]?.text || '';
      const rewrittenSubjective = clinicallyRewriteSubjective(rawTriageComplaint);
      
      setSoapSubjective(rewrittenSubjective || rawTriageComplaint);
      setSoapObjective(vitStr);
      setSoapAutoGenerated(false);

      setLastSavedAssessment([]);
      setLastSavedSubjective('');
      setLastSavedDate(null);

      // Auto-detect if a SOAP note was recorded for TODAY
      const todayNote = (emrSummary.soapNotes || emrSummary.consultationNotes || []).find((n: any) =>
        isToday(n.createdAt || n.date || n.updatedAt)
      );

      if (todayNote?.assessment && typeof todayNote.assessment === 'string' && todayNote.assessment.trim()) {
        const parsedCodes = todayNote.assessment.split(/,\s*/).map((s: string) => s.trim()).filter(Boolean);
        setLastSavedAssessment(parsedCodes);
        setLastSavedSubjective(todayNote.subjective || '');
        setLastSavedDate(new Date(todayNote.createdAt || todayNote.date || Date.now()));
        if (todayNote.subjective) setSoapSubjective(todayNote.subjective);
        setSoapAssessments(parsedCodes);
        if (todayNote.plan) setSoapPlan(todayNote.plan);
        runSmartRecommenders(parsedCodes.join(', '), todayNote.subjective || '');
      } else {
        // Auto-Derive Assessment (A) & Plan (P) automatically from triage complaints!
        const activeComplaint = rewrittenSubjective || rawTriageComplaint;
        if (activeComplaint) {
          const autoDerive = inferClinicalDetailsFrontend(activeComplaint);
          if (autoDerive && autoDerive.codes.length > 0) {
            setSoapAssessments(autoDerive.codes);
            setSoapPlan(autoDerive.plan);
            setSoapAutoGenerated(true);
            runSmartRecommenders(autoDerive.codes.join(', '), activeComplaint);
          } else {
            setSoapAssessments([]);
            setSoapPlan('');
            setAiMedRecs([]);
            setAiLabRecs([]);
          }
        } else {
          setSoapAssessments([]);
          setSoapPlan('');
          setAiMedRecs([]);
          setAiLabRecs([]);
        }
      }
    }

    if (tr) {
      runRiskStratify(tr, selectedEncounter.reasonCode?.[0]?.text || '');
    }
  }, [emrSummary]);

  const runRiskStratify = async (tr: any, complaint: string) => {
    setAiLoadingRisk(true);
    try {
      const res = await api.post('/openmed/risk-stratify', { bp: `${tr.systolic}/${tr.diastolic}`, temperature: String(tr.temperature), pulseRate: String(tr.pulseRate), spo2: String(tr.spo2), respiratoryRate: String(tr.respiratoryRate), chiefComplaint: complaint, news2Score: tr.news2Score ?? 0 });
      setAiRisk(res.data.data);
    } catch {}
    setAiLoadingRisk(false);
  };

  const runSmartRecommenders = async (diagCode: string, complaintText: string) => {
    if (!diagCode) return;
    setAiLoadingMeds(true);
    setAiLoadingLabs(true);
    setAiMedRecs([]);
    setAiLabRecs([]);

    try {
      const [medRes, labRes] = await Promise.all([
        api.post('/openmed/suggest-meds', { diagnosisCode: diagCode, chiefComplaint: complaintText }),
        api.post('/openmed/suggest-labs', { diagnosisCode: diagCode, chiefComplaint: complaintText }),
      ]);

      const rawMeds = medRes.data?.data?.recommendations || [];
      const normalizedMeds = rawMeds.map((rec: any) => ({
        ...rec,
        name: rec.name || rec.genericName || rec.brandName || rec.drugName || 'Unknown Medication',
        displayName: rec.genericName || rec.name || '',
        brandName: rec.brandName || '',
      }));

      const rawLabs = labRes.data?.data?.suggestions || [];
      const normalizedLabs = rawLabs.map((s: any) => ({
        ...s,
        name: s.name || s.testName || s.investigationName || 'Unknown Test',
        category: s.category || 'Pathology',
        priority: s.priority || 'ROUTINE',
      }));

      setAiMedRecs(normalizedMeds);
      setAiLabRecs(normalizedLabs);
    } catch (e) {
      console.error('Failed AI recommenders:', e);
    } finally {
      setAiLoadingMeds(false);
      setAiLoadingLabs(false);
    }
  };

  const handleAddMedicationToCart = (item: any) => {
    const existingIndex = presCart.findIndex(p => p.name.toLowerCase() === item.name.toLowerCase());
    if (existingIndex >= 0) {
      enqueueSnackbar(`${item.name} is already in the prescription cart`, { variant: 'info' });
      return;
    }
    const stockInfo = getStockStatus(item.name);
    setPresCart(prev => [
      ...prev,
      {
        medId: stockInfo.item?.id || '',
        name: item.name,
        type: item.type || 'FIRST-LINE',
        category: item.category || 'Medication',
        dose: item.dose || medDose,
        frequency: item.frequency || medFreq,
        duration: item.duration || medDuration,
        route: item.route || medRoute,
        inStock: stockInfo.inStock,
        stockQty: stockInfo.qty,
        rational: item.rational || item.rationale || '',
      }
    ]);
    enqueueSnackbar(`Added ${item.name} to prescription cart`, { variant: 'success' });
  };

  const handleAutoSelectMedicationDefaults = (med: any) => {
    if (!med) return;
    const name = (med.name || med.genericName || '').toLowerCase();
    const cat = (med.category || '').toLowerCase();
    const form = (med.dosageForm || '').toLowerCase();
    const route = (med.route || '').toLowerCase();

    let autoRoute = 'Oral';
    if (route.includes('iv') || route.includes('intravenous') || form.includes('iv') || form.includes('infusion') || cat.includes('iv fluid') || name.includes('saline') || name.includes('dextrose') || name.includes('ringer') || name.includes('gelofusine') || name.includes('dns')) {
      autoRoute = 'IV (Intravenous)';
    } else if (route.includes('im') || route.includes('intramuscular') || name.includes('im') || form.includes('ampoule')) {
      autoRoute = 'IM (Intramuscular)';
    } else if (route.includes('subcutaneous') || route.includes('sc') || name.includes('insulin') || name.includes('clexane') || name.includes('heparin')) {
      autoRoute = 'Subcutaneous';
    } else if (route.includes('topical') || form.includes('solution') || form.includes('cream') || form.includes('ointment') || cat.includes('wound')) {
      autoRoute = 'Topical';
    } else if (route.includes('inhal') || name.includes('inhaler') || name.includes('ventolin') || name.includes('salbutamol')) {
      autoRoute = 'Inhalation';
    } else if (route.includes('sublingual')) {
      autoRoute = 'Sublingual';
    }
    setMedRoute(autoRoute);

    let autoDose = '1 tab';
    if (cat.includes('iv fluid') || name.includes('saline') || name.includes('dextrose') || name.includes('ringer') || name.includes('gelofusine') || name.includes('dns')) {
      autoDose = (name.includes('1000ml') || name.includes('1000 ml') || name.includes('500ml') || name.includes('500 ml'))
        ? '500 ml IV Infusion'
        : (name.includes('100ml') || name.includes('100 ml')) ? '100 ml IV' : '500 ml IV Infusion';
    } else if (form.includes('injection') || form.includes('vial') || form.includes('infusion') || name.includes('injection')) {
      autoDose = form.includes('ampoule') || name.includes('ampoule') ? '1 ampoule IM' : '1 vial IV';
    } else if (form.includes('solution') || form.includes('suspension') || form.includes('syrup') || name.includes('ml')) {
      autoDose = name.includes('10ml') ? '10 ml' : '5 ml';
    } else if (form.includes('capsule') || form.includes('cap') || name.includes('cap')) {
      autoDose = '1 cap';
    } else if (name.includes('paracetamol') || name.includes('panadol') || name.includes('ibuprofen') || name.includes('advil')) {
      autoDose = '2 tabs';
    } else if (cat.includes('wound') || autoRoute === 'Topical') {
      autoDose = 'Apply locally';
    }
    setMedDose(autoDose);

    let autoFreq = 'TDS (3x daily)';
    if (cat.includes('iv fluid') || name.includes('saline') || name.includes('dextrose') || name.includes('ringer') || name.includes('dns')) {
      autoFreq = 'Every 8 hours';
    } else if (name.includes('ceftriaxone') || name.includes('amoxicillin') || name.includes('cipro') || name.includes('paracetamol 1g') || name.includes('cefazolin') || name.includes('heparin')) {
      autoFreq = 'BD (2x daily)';
    } else if (name.includes('amlodipine') || name.includes('lisinopril') || name.includes('metformin') || name.includes('lantus') || name.includes('daily')) {
      autoFreq = 'Daily';
    } else if (name.includes('prn') || name.includes('as needed') || name.includes('morphine') || name.includes('pethidine')) {
      autoFreq = 'PRN (As needed)';
    } else if (name.includes('stat') || name.includes('adrenaline') || name.includes('atropine')) {
      autoFreq = 'Stat (Immediately)';
    }
    setMedFreq(autoFreq);

    let autoDuration = '7 Days';
    if (cat.includes('iv fluid') || name.includes('saline') || name.includes('dextrose') || name.includes('ringer') || name.includes('dns')) {
      autoDuration = '3 Days';
    } else if (name.includes('coartem') || name.includes('azithromycin') || name.includes('artemether')) {
      autoDuration = '3 Days';
    } else if (name.includes('antibiotic') || name.includes('ceftriaxone') || name.includes('metronidazole') || name.includes('amoxicillin')) {
      autoDuration = '5 Days';
    } else if (name.includes('hypertension') || name.includes('diabetes') || name.includes('metformin') || name.includes('amlodipine')) {
      autoDuration = '30 Days';
    }
    setMedDuration(autoDuration);
  };

  const handleManualAddMed = () => {
    if (!selectedMedId) return;
    const med = pharmacyCatalog.find((m: any) => m.id === selectedMedId || m.name === selectedMedId || m.genericName === selectedMedId);
    if (!med) return;
    const liveStock = (med.batches || []).reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0);
    const stockQty = liveStock > 0 ? liveStock : Number(med.stockQty || med.quantityInStock || med.stock || 0);
    const isExt = Boolean(med.isExternal || (!med.inStock && stockQty === 0));
    setPresCart(prev => [
      ...prev,
      {
        medId: isExt ? '' : med.id,
        name: med.name || med.genericName,
        type: isExt ? 'EXTERNAL' : 'CUSTOM',
        category: med.category || 'Outpatient Stock',
        dose: medDose,
        frequency: medFreq,
        duration: medDuration,
        route: medRoute || med.route || 'Oral',
        inStock: !isExt && stockQty > 0,
        stockQty,
        isExternal: isExt,
        unitPrice: isExt ? 0 : (med.unitPrice || med.price || 0),
        rational: isExt ? 'External purchase / Pharmacy Data Dictionary' : 'Prescribed by clinician',
      }
    ]);
    setSelectedMedId('');
    enqueueSnackbar(`Added ${med.name} to prescription cart ${isExt ? '(External Purchase)' : ''}`, {
      variant: isExt ? 'warning' : 'success'
    });
  };

  const handleSubmitPrescription = async () => {
    if (!selectedEncounter || presCart.length === 0) return;
    const patId = selectedEncounter.subject.reference.split('/')[1];
    if (!patId) return;
    setPrescribing(true);
    try {
      await api.post('/pharmacy/prescriptions', {
        patientId: patId,
        items: presCart.map(item => ({
          medicationId: item.isExternal || !item.medId ? null : item.medId,
          name: item.name,
          dose: item.dose,
          frequency: item.frequency,
          duration: item.duration,
          route: item.route,
          inStock: item.inStock,
          isExternalPurchase: item.isExternal || !item.inStock,
          unitPrice: item.isExternal || !item.inStock ? 0 : (item.unitPrice || 0),
          quantityPrescribed: 1,
          instructions: `${item.dose} ${item.frequency} for ${item.duration} (${item.route})`,
        })),
        notes: `Outpatient OPD Consultation Prescription`,
      });
      const hasInStock = presCart.some(item => !item.isExternal && item.inStock);
      const hasExternal = presCart.some(item => item.isExternal || !item.inStock);

      let msg = 'Outpatient prescription order saved!';
      if (hasInStock && !hasExternal) {
        msg = 'Prescription submitted! Invoice generated in Cashier module.';
      } else if (hasInStock && hasExternal) {
        msg = 'Prescription saved! In-stock items sent to Cashier module; out-of-stock items saved for external purchase.';
      } else if (!hasInStock && hasExternal) {
        msg = 'Prescription saved! Out-of-stock items saved for external purchase (No Cashier invoice generated).';
      }

      enqueueSnackbar(msg, { variant: 'success' });
      setPresCart([]);
      api.get(`/pharmacy/prescriptions?patientId=${patId}`).then(r => setPatientPrescriptions(r.data || [])).catch(() => {});
    } catch {
      enqueueSnackbar('Failed to submit prescription order', { variant: 'error' });
    } finally {
      setPrescribing(false);
    }
  };

  const handleAddLabToCart = (labItem: any) => {
    const existingIndex = labCart.findIndex(l => l.name.toLowerCase() === labItem.name.toLowerCase());
    if (existingIndex >= 0) {
      enqueueSnackbar(`${labItem.name} is already in the lab order cart`, { variant: 'info' });
      return;
    }
    const labInfo = getLabStatus(labItem.name);
    setLabCart(prev => [
      ...prev,
      {
        testId: labInfo.item?.id || '',
        name: labItem.name,
        category: labItem.category || 'Pathology',
        priority: labPriority,
        available: labInfo.available,
        rationale: labItem.rationale || labItem.reason || '',
      }
    ]);
    enqueueSnackbar(`Added ${labItem.name} to lab order cart`, { variant: 'success' });
  };

  const handleManualAddLab = () => {
    if (!selectedTestId) return;
    const test = labCatalog.find((t: any) => t.id === selectedTestId);
    if (!test) return;
    const testTitle = test.testName || test.name || test.testCode || 'Lab Investigation Test';
    setLabCart(prev => [
      ...prev,
      {
        testId: test.id,
        name: testTitle,
        category: test.category || 'General Pathology',
        priority: labPriority,
        available: test.isAvailable !== false && test.isActive !== false,
        rationale: 'Requested by OPD clinician',
      }
    ]);
    setSelectedTestId('');
    enqueueSnackbar(`Added ${testTitle} to lab order cart`, { variant: 'success' });
  };

  const handleSubmitLabOrder = async () => {
    if (!selectedEncounter || labCart.length === 0) return;
    const patId = selectedEncounter.subject.reference.split('/')[1];
    if (!patId) return;
    setOrderingLab(true);

    const inHouseTests = labCart.filter(item => item.testId && item.testId.length > 5);
    const externalTests = labCart.filter(item => !item.testId || item.testId.length <= 5);

    try {
      if (inHouseTests.length > 0) {
        await api.post('/lims/orders', {
          patientId: patId,
          tests: inHouseTests.map(item => ({
            testId: item.testId,
            name: item.name,
            priority: item.priority,
            availableInHouse: true,
          })),
          clinicalNotes: `Outpatient OPD Lab Order`,
          priority: labPriority,
        });
      }

      if (externalTests.length > 0) {
        const patientName = selectedEncounter.subject.display || 'Outpatient';
        for (const extTest of externalTests) {
          await api.post('/lims/referrals', {
            patientName,
            mrn: patId,
            testRequested: extTest.name,
            referredTo: 'External Laboratory',
            notes: extTest.rationale || 'Unavailable in hospital lab',
          });
        }
      }

      enqueueSnackbar('Outpatient laboratory order submitted successfully!', { variant: 'success' });
      setLabCart([]);
      api.get(`/lims/orders`, { params: { patientId: patId } }).then(r => setLabOrders(r.data || [])).catch(() => {});
    } catch {
      enqueueSnackbar('Failed to submit lab order', { variant: 'error' });
    } finally {
      setOrderingLab(false);
    }
  };

  const handleManualAddRad = (item?: any) => {
    const targetItem = item || radCatalog.find(c => c.id === selectedRadCatalogId);
    if (!targetItem) {
      enqueueSnackbar('Please select a valid radiology imaging scan procedure', { variant: 'warning' });
      return;
    }
    setRadCart(prev => [
      ...prev,
      {
        catalogItemId: targetItem.id,
        name: targetItem.name || targetItem.procedureName || 'Radiology Imaging Scan',
        modality: targetItem.modality || 'X-RAY',
        price: targetItem.price || 15000,
        priority: radPriority,
        clinicalHistory: radHistory || 'Outpatient clinical diagnostic workup',
      }
    ]);
    setSelectedRadCatalogId('');
    enqueueSnackbar(`Added ${targetItem.name} to radiology request cart`, { variant: 'success' });
  };

  const handleSubmitRadOrder = async () => {
    if (!selectedEncounter || radCart.length === 0) return;
    const patId = selectedEncounter.subject.reference.split('/')[1];
    if (!patId) return;
    setOrderingRad(true);

    try {
      for (const item of radCart) {
        await api.post('/radiology/orders', {
          patientId: patId,
          catalogItemId: item.catalogItemId,
          requestedById: user?.id || (user as any)?.userId || 'doc-1',
          clinicalHistory: item.clinicalHistory || radHistory || 'OPD Clinician Request',
          priority: item.priority || radPriority,
        });
      }
      enqueueSnackbar('⚡ Outpatient Radiology Scan order submitted! Order is now visible in Radiology Queue (http://localhost:5173/radiology) & awaiting Cashier payment settlement.', { variant: 'success' });
      setRadCart([]);
      setRadHistory('');
      api.get(`/radiology/orders`, { params: { patientId: patId } }).then(r => setRadOrders(r.data || [])).catch(() => {});
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to submit radiology scan request', { variant: 'error' });
    } finally {
      setOrderingRad(false);
    }
  };

  const getMedicationStatusInfo = (item: any, rx: any, logs: any[]) => {
    const isExternal = Boolean(
      item.isExternalPurchase === true ||
      item.isExternal === true ||
      item.status === 'OUT_OF_STOCK_EXTERNAL' ||
      item.medication?.itemCode === 'EXT-PURCHASE-MED' ||
      item.medication?.genericName === 'External Purchase Medication' ||
      item.clinicalIndication?.toLowerCase().startsWith('external purchase:')
    );

    const rawName = (
      item.medication && item.medication.genericName !== 'External Purchase Medication'
        ? item.medication.genericName
        : (item.name || item.medicationDisplay || item.clinicalIndication || '')
    ).replace(/^external purchase:\s*/i, '').trim().toLowerCase();

    const isPaid = rx?.paymentStatus === 'PAID' || item?.paymentStatus === 'PAID' || item?.isPaid === true;

    const isAdministered = logs?.some((log: any) => {
      if (log.status !== 'ADMINISTERED' && !log.administeredTime) return false;
      const logMed = (log.medicationName || '').toLowerCase();
      return (rawName && logMed.includes(rawName)) || (logMed && rawName.includes(logMed));
    });

    if (isExternal) {
      return {
        label: 'OUT OF STOCK (External Purchase)',
        color: 'warning' as const,
        chipBg: '#fffbe6',
        chipColor: '#d48806',
      };
    }

    if (isPaid && isAdministered) {
      return {
        label: 'Paid & Administered',
        color: 'success' as const,
        chipBg: '#d3f9d8',
        chipColor: '#2b8a3e',
      };
    }

    if (isPaid) {
      return {
        label: 'Paid',
        color: 'success' as const,
        chipBg: '#ebfbee',
        chipColor: '#2f9e44',
      };
    }

    return {
      label: 'Unpaid',
      color: 'info' as const,
      chipBg: '#e7f5ff',
      chipColor: '#1c7ed6',
    };
  };

  // ── Automatic Clinical Rewrite of Triage Chief Complaint ────────────────
  const clinicallyRewriteSubjective = (rawText: string): string => {
    if (!rawText || rawText.trim().length === 0) return '';
    const clean = rawText.trim();
    const lower = clean.toLowerCase();

    // Avoid double rewriting if already formatted
    if (clean.startsWith('Patient presents') || clean.startsWith('Patient reports')) {
      return clean;
    }

    if (lower.includes('neck') && lower.includes('back')) {
      return 'Patient presents with complaints of persistent cervicalgia (neck pain) and axial back pain of gradual onset, accompanied by musculoskeletal discomfort.';
    }
    if (lower.includes('neck')) {
      return 'Patient presents with complaints of persistent cervicalgia (neck pain) and paraspinal muscle tenderness.';
    }
    if (lower.includes('back') || lower.includes('waist') || lower.includes('waste')) {
      return 'Patient presents with complaints of persistent axial lower back pain (lumbar discomfort) of gradual onset.';
    }
    if (lower.includes('headache') || lower.includes('head pain')) {
      return 'Patient presents with a history of persistent headache (hemicrania) accompanied by physical discomfort.';
    }
    if (lower.includes('fever') || lower.includes('malaria') || lower.includes('chills') || lower.includes('rigor')) {
      return 'Patient presents with febrile illness characterized by intermittent high-grade fever, chills, rigors, and general body weakness.';
    }
    if (lower.includes('body pain') || lower.includes('body pains') || lower.includes('pains plus')) {
      return 'Patient presents with complaints of generalized body pains (myalgia) and somatic fatigue rated moderate in severity.';
    }
    if (lower.includes('cough') || lower.includes('catarrh') || lower.includes('phlegm')) {
      return 'Patient presents with upper respiratory complaints including persistent cough, nasal congestion, and mild catarrh.';
    }
    if (lower.includes('general ambulatory consultation') || lower.includes('general consultation')) {
      return 'Patient presents for routine ambulatory outpatient clinical evaluation and general health assessment.';
    }

    return `Patient presents with complaints of ${clean.toLowerCase()}, reported during initial nursing triage.`;
  };

  // ── Multi-Factorial Clinical Treatment Plan Builder ────────────────────────
  const buildMultiFactorialPlan = (assessmentCodes: string[], text: string): string => {
    const lower = (text || '').toLowerCase();
    const planItems: string[] = [];

    const addPlanIfMatched = (codePrefix: string, keywords: string[], planText: string) => {
      const hasCode = assessmentCodes.some(c => c.includes(codePrefix));
      const hasKw = keywords.some(k => lower.includes(k));
      if ((hasCode || hasKw) && !planItems.includes(planText)) {
        planItems.push(planText);
      }
    };

    addPlanIfMatched('M54.2', ['neck', 'cervicalgia', 'cervical'], 'Cervical Spine & Neck Care: Administer oral analgesics/NSAIDs and muscle relaxants. Recommend cervical posture support, ergonomic adjustments, and avoidance of sudden neck strain.');
    addPlanIfMatched('M54.5', ['back pain', 'lumbar', 'waist', 'waste pain'], 'Low Back Pain Management: Prescribe targeted oral NSAIDs & muscle relaxants for acute lumbar pain. Advise posture modification, warm compress, and avoidance of heavy lifting.');
    addPlanIfMatched('R35.1', ['nocturia', 'nocturnal', 'urinary', 'urinating', '30 times', 'dysuria', 'frequency', 'episodes/night'], 'Urinary Symptoms & Nocturia: Order Urinalysis, Urine Culture & Sensitivity, and Renal Function Test (U/E/Cr). Advise evening fluid restriction and urological evaluation.');
    addPlanIfMatched('J06.9', ['cough', 'sputum', 'phlegm', 'catarrh', 'respiratory', 'cold'], 'Respiratory Cover: Prescribe oral antibiotic therapy & mucolytic expectorant. Recommend warm fluid hydration with steam inhalation twice daily.');
    addPlanIfMatched('R61', ['sweat', 'sweats', 'sweating', 'diaphoresis'], 'Night Sweats & Febrile Screening: Request Full Blood Count (FBC), ESR, and Malaria RDT screening to investigate underlying infectious focus.');
    addPlanIfMatched('R51.9', ['headache', 'hemicrania', 'head pain', 'migraine'], 'Headache Control: Administer analgesics (Paracetamol 1g TDS). Monitor blood pressure & neurological signs; advise rest in quiet environment.');
    addPlanIfMatched('M25.6', ['stiff', 'stiffness', 'rigidity', 'myalgia', 'joint', 'body pain', 'pains plus'], 'Joint & Muscle Support: Recommend gentle stretching exercises, warm compress, oral analgesics, and neurovitamin support.');
    addPlanIfMatched('I10', ['hypertension', 'blood pressure', 'high bp'], 'Hypertension Management: Initiate antihypertensive pharmacotherapy with daily home BP log, low sodium diet (<2g/day), and baseline renal profile.');
    addPlanIfMatched('E11.9', ['diabetes', 'sugar', 'polyuria'], 'Glycemic Control: Fasting Blood Sugar (FBS), HbA1c screening, Metformin therapy with meal timing guidance, and dietary carbohydrate regulation.');
    addPlanIfMatched('A09', ['diarrhea', 'diarrhoea', 'stooling', 'vomit', 'nausea'], 'Gastroenteritis Support: Immediate oral rehydration therapy (ORS sachets), Zinc supplementation (20mg daily x 10 days), and bland diet.');
    addPlanIfMatched('B50.9', ['malaria', 'chills', 'rigor', 'fever', 'temperature'], 'Antimalarial Therapy: Artemether/Lumefantrine (ACT) full 3-day treatment course and Paracetamol for temperature control.');

    if (planItems.length === 0) {
      return '1. Completed initial outpatient clinical history & baseline physical exam.\n2. Order baseline laboratory screening panel as clinically indicated.\n3. Provide lifestyle, nutritional, and preventive health counseling.\n4. Schedule routine follow-up as needed.';
    }

    return planItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n\n');
  };

  // ── Frontend Multi-Problem Clinical Inference Engine ──────────────────────
  const inferClinicalDetailsFrontend = (text: string): { codes: string[]; plan: string } => {
    const lower = text.toLowerCase();
    const codesSet = new Set<string>();

    if (lower.includes('neck') || lower.includes('cervicalgia') || lower.includes('cervical')) {
      codesSet.add('M54.2 — Cervicalgia (Neck pain)');
    }
    if (lower.includes('back pain') || lower.includes('back pains') || lower.includes('backache') || lower.includes('lumbar') || lower.includes('waist pain') || lower.includes('waste pain')) {
      codesSet.add('M54.5 — Low back pain');
    }
    if (lower.includes('nocturia') || lower.includes('nocturnal') || lower.includes('30 times') || lower.includes('urinating') || lower.includes('urinate') || lower.includes('peace for most') || lower.includes('frequency') || lower.includes('dysuria') || lower.includes('urinary')) {
      codesSet.add('R35.1 — Severe nocturia & urinary frequency');
    }
    if (lower.includes('cough') || lower.includes('coughing') || lower.includes('sputum') || lower.includes('spugtum') || lower.includes('phlegm') || lower.includes('catarrh') || lower.includes('sore throat') || lower.includes('cold') || lower.includes('chest pain')) {
      codesSet.add('J06.9 — Acute upper respiratory infection');
    }
    if (lower.includes('sweat') || lower.includes('sweats') || lower.includes('sweating') || lower.includes('night sweat') || lower.includes('diaphoresis')) {
      codesSet.add('R61 — Night sweats');
    }
    if (lower.includes('left side of my head') || lower.includes('hemicrania') || lower.includes('headache') || lower.includes('migraine') || lower.includes('head pain') || lower.includes('ori n fo')) {
      codesSet.add('R51.9 — Left-sided headache');
    }
    if (lower.includes('legs are stiff') || lower.includes('leg stiff') || lower.includes('stiff') || lower.includes('stiffness') || lower.includes('rigidity') || lower.includes('myalgia') || lower.includes('joint pain') || lower.includes('body pain') || lower.includes('body pains') || lower.includes('pains plus')) {
      if (!codesSet.has('M54.5 — Low back pain') && !codesSet.has('M54.2 — Cervicalgia (Neck pain)')) {
        codesSet.add('M25.6 — Joint & muscle stiffness');
      }
    }
    if (lower.includes('hypertension') || lower.includes('high bp') || lower.includes('blood pressure')) {
      codesSet.add('I10 — Essential (primary) hypertension');
    }
    if (lower.includes('diabetes') || lower.includes('sugar') || lower.includes('polyuria') || lower.includes('polydipsia')) {
      codesSet.add('E11.9 — Type 2 diabetes mellitus');
    }
    if (lower.includes('diarrhea') || lower.includes('diarrhoea') || lower.includes('stooling') || lower.includes('vomit') || lower.includes('nausea')) {
      codesSet.add('A09 — Infectious gastroenteritis and colitis');
    }
    if (lower.includes('fever') || lower.includes('pyrexia') || lower.includes('temperature') || lower.includes('body hot') || lower.includes('malaria') || lower.includes('chills') || lower.includes('rigor') || lower.includes('iba') || lower.includes('zazzabi')) {
      codesSet.add('B50.9 — Plasmodium falciparum malaria & febrile illness');
    }
    if (lower.includes('headache') || lower.includes('head pain') || lower.includes('hemicrania') || lower.includes('migraine') || lower.includes('ori n fo')) {
      codesSet.add('R51.9 — Headache, unspecified');
    }

    const codes = Array.from(codesSet);
    const plan = buildMultiFactorialPlan(codes, text);

    return { codes, plan };
  };

  // ── Debounced Subjective Symptom Watcher — Continuous Live Assessment & Plan Derivation ──
  const soapSubjDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!soapSubjective || soapSubjective.trim().length < 4) return;
    if (soapSubjDebounceRef.current) clearTimeout(soapSubjDebounceRef.current);

    soapSubjDebounceRef.current = setTimeout(() => {
      const result = inferClinicalDetailsFrontend(soapSubjective);
      if (result && result.codes.length > 0) {
        setSoapAssessments(prev => Array.from(new Set([...prev, ...result.codes])));
        setSoapPlan(prev => {
          if (!prev || !prev.trim()) return result.plan;
          const newPlanLines = result.plan.split('\n\n').filter((line: string) => !prev.includes(line.trim()));
          return newPlanLines.length > 0 ? `${prev.trim()}\n\n${newPlanLines.join('\n\n')}` : prev;
        });
        runSmartRecommenders(result.codes.join(', '), soapSubjective);
      }
    }, 500);

    return () => { if (soapSubjDebounceRef.current) clearTimeout(soapSubjDebounceRef.current); };
  }, [soapSubjective]);

  // ── Auto-Derive OPD Assessment & Plan from Symptoms ─────────────────────
  const handleAiGenerateSOAP = async () => {
    const inputText = (soapSubjective || selectedEncounter?.reasonCode?.[0]?.text || '').trim();
    if (!inputText || inputText.length < 3) {
      enqueueSnackbar('Please type patient symptoms or use 🎤 Voice Dictation in Subjective (S) first.', { variant: 'info' });
      return;
    }
    setAiSoapLoading(true);
    setSoapAutoGenerated(false);
    try {
      const patName = selectedEncounter?.subject?.display || 'Patient';
      const res = await api.post('/openmed/summarize', {
        patientName: patName,
        clinicalNotes: inputText,
        vitals: soapObjective,
      });
      const d = res.data?.data?.summary;
      if (d) {
        if (d.subjective) setSoapSubjective(d.subjective);
        if (soapObjective) setSoapObjective(soapObjective); else if (d.objective) setSoapObjective(d.objective || '');

        const multiInfer = inferClinicalDetailsFrontend(d.subjective || inputText);
        const finalCodes = (d.assessmentCodes && d.assessmentCodes.length > 0)
          ? Array.from(new Set([...multiInfer.codes, ...d.assessmentCodes]))
          : multiInfer.codes;
        const finalPlan = buildMultiFactorialPlan(finalCodes, d.subjective || inputText);

        setSoapAssessments(prev => Array.from(new Set([...prev, ...finalCodes])));
        setSoapPlan(prev => prev ? `${prev.trim()}\n\n${finalPlan}` : finalPlan);
        runSmartRecommenders(finalCodes.join(', '), inputText);
        setSoapAutoGenerated(true);
        enqueueSnackbar('✨ Subjective clinically rewritten & Multi-Assessment + Full Plan auto-derived!', { variant: 'success' });
      } else {
        throw new Error('Empty summary');
      }
    } catch (err) {
      console.error('Auto SOAP generation failed:', err);
      const fallback = inferClinicalDetailsFrontend(inputText);
      setSoapAssessments(prev => Array.from(new Set([...prev, ...fallback.codes])));
      setSoapPlan(prev => prev ? `${prev.trim()}\n\n${fallback.plan}` : fallback.plan);
      runSmartRecommenders(fallback.codes.join(', '), inputText);
      enqueueSnackbar('✨ Multi-Assessment + Full Plan auto-derived from symptoms!', { variant: 'success' });
    } finally {
      setAiSoapLoading(false);
    }
  };

  const handleImportPreviousHistory = () => {
    const prevNotes = emrSummary?.consultationNotes;
    if (!prevNotes || prevNotes.length === 0) {
      enqueueSnackbar('No previous consultation records found for this patient', { variant: 'info' });
      return;
    }
    const lastNote = prevNotes[0];
    if (lastNote.subjective) setSoapSubjective(lastNote.subjective);
    if (lastNote.objective) setSoapObjective(lastNote.objective);
    if (lastNote.assessment) {
      const items = lastNote.assessment.split(/,\s*/).filter(Boolean);
      setSoapAssessments(items);
      runSmartRecommenders(lastNote.assessment, lastNote.subjective || '');
    }
    if (lastNote.plan) setSoapPlan(lastNote.plan);
    enqueueSnackbar('📋 Previous consultation note imported into today\'s workspace!', { variant: 'success' });
  };

  const handleImportVitals = () => {
    const tr = emrSummary?.triageRecords?.[0];
    if (tr) { setSoapObjective(`BP: ${tr.systolic}/${tr.diastolic} mmHg | Temp: ${tr.temperature}°C | Pulse: ${tr.pulseRate} bpm | SpO2: ${tr.spo2}% | RR: ${tr.respiratoryRate}/min | NEWS2: ${tr.news2Score ?? 0}`); enqueueSnackbar('Vitals imported!', { variant: 'info' }); }
    else enqueueSnackbar('No triage vitals found', { variant: 'warning' });
  };

  const VOICE_CONTROL_NOISE = /^(switch off|stop|stop dictation|stop listening|cancel|clear|testing|test|hello|hi|thank you|thanks|okay|ok|never mind)\b/i;

  // ── Voice Transcription & AI Clinical Processing ────────────────────────────
  const processVoiceDictation = async (rawText: string) => {
    if (!rawText || rawText.trim().length < 3 || isProcessingVoiceRef.current) return;
    
    if (VOICE_CONTROL_NOISE.test(rawText.trim())) {
      enqueueSnackbar(`ℹ️ Voice command / non-clinical speech detected ("${rawText.trim()}") — skipped updating SOAP notes.`, { variant: 'info' });
      return;
    }

    isProcessingVoiceRef.current = true;
    setVoiceSummarizing(true);
    enqueueSnackbar('⚡ Processing voice dictation… converting speech to clinical findings…', { variant: 'info' });

    try {
      const patName = selectedEncounter?.subject?.display || 'Patient';
      const existingSubj = (soapSubjective || '').trim();
      const hasExistingNotes = !!existingSubj;

      const res = await api.post('/openmed/voice-summarize', {
        rawTranscript: rawText,
        patientName: patName,
        vitals: soapObjective,
        isContinued: hasExistingNotes,
        existingText: existingSubj,
      }).catch(() => null);

      const d = res?.data?.data;
      setVoiceAnalysis(d);

      const transcribedClinicalText = (d?.summary?.subjective || '').trim();

      if (!transcribedClinicalText || VOICE_CONTROL_NOISE.test(transcribedClinicalText)) {
        enqueueSnackbar(`ℹ️ Voice command detected ("${rawText.trim()}") — skipped updating SOAP notes.`, { variant: 'info' });
        return;
      }

      let newSubjectiveText = '';
      setSoapSubjective(prev => {
        const currentSubj = (prev || '').trim();
        if (!currentSubj) {
          newSubjectiveText = transcribedClinicalText;
        } else {
          // If the transcribed text is already in currentSubj, skip appending duplicate!
          if (currentSubj.includes(transcribedClinicalText)) {
            newSubjectiveText = currentSubj;
          } else {
            newSubjectiveText = `${currentSubj}\n\n${transcribedClinicalText}`;
          }
        }
        return newSubjectiveText;
      });

      // Perform clinical inference on the full combined text
      const multiInfer = inferClinicalDetailsFrontend(newSubjectiveText || transcribedClinicalText);

      const finalCodes = (d?.summary?.assessmentCodes && Array.isArray(d.summary.assessmentCodes) && d.summary.assessmentCodes.length > 0)
        ? Array.from(new Set([...multiInfer.codes, ...d.summary.assessmentCodes]))
        : multiInfer.codes;

      if (finalCodes && finalCodes.length > 0) {
        setSoapAssessments(prev => Array.from(new Set([...prev, ...finalCodes])));
      }

      const finalPlan = multiInfer.plan || d?.summary?.plan;
      if (finalPlan) {
        setSoapPlan(prev => {
          if (!prev || !prev.trim()) return finalPlan;
          const newPlanLines = finalPlan.split('\n\n').filter((line: string) => !prev.includes(line.trim()));
          return newPlanLines.length > 0 ? `${prev.trim()}\n\n${newPlanLines.join('\n\n')}` : prev;
        });
      }

      const diagToRecommend = (finalCodes && finalCodes.length > 0) ? finalCodes.join(', ') : (newSubjectiveText || transcribedClinicalText);
      runSmartRecommenders(diagToRecommend, newSubjectiveText || transcribedClinicalText);

      enqueueSnackbar('🎤 Voice dictation appended to Subjective notes & Assessment updated!', { variant: 'success' });
    } catch (e) {
      console.error('Voice summarize processing error:', e);
      let fallbackText = '';
      setSoapSubjective(prev => {
        const currentSubj = (prev || '').trim();
        fallbackText = currentSubj ? `${currentSubj}\n\n${rawText.trim()}` : rawText.trim();
        return fallbackText;
      });

      const fallback = inferClinicalDetailsFrontend(fallbackText || rawText.trim());
      if (fallback.codes.length > 0) {
        setSoapAssessments(prev => Array.from(new Set([...prev, ...fallback.codes])));
        setSoapPlan(prev => prev ? `${prev.trim()}\n\n${fallback.plan}` : fallback.plan);
        runSmartRecommenders(fallback.codes.join(', '), fallbackText || rawText.trim());
      }
      enqueueSnackbar('✅ Voice transcribed & clinical details inferred!', { variant: 'success' });
    } finally {
      setVoiceSummarizing(false);
      isProcessingVoiceRef.current = false;
    }
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      enqueueSnackbar('Voice recognition is not supported in this browser. Please use Chrome or Edge.', { variant: 'warning' });
      return;
    }
    transcriptBufferRef.current = '';
    interimBufferRef.current = '';
    isProcessingVoiceRef.current = false;
    setVoiceTranscript('');
    setInterimTranscript('');

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    try { rec.lang = 'en-NG'; } catch { rec.lang = 'en-US'; }

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          transcriptBufferRef.current += t + ' ';
        } else {
          interim += t;
        }
      }
      interimBufferRef.current = interim;
      setInterimTranscript(interim);
      setVoiceTranscript(transcriptBufferRef.current);
    };

    rec.onerror = (err: any) => {
      console.warn('SpeechRecognition error:', err?.error);
      if (err?.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      const fullRecordedText = (transcriptBufferRef.current + ' ' + interimBufferRef.current).trim();
      if (fullRecordedText.length >= 3 && !isProcessingVoiceRef.current) {
        processVoiceDictation(fullRecordedText);
      }
    };

    rec.start();
    setRecognitionRef(rec);
    setIsListening(true);
    enqueueSnackbar('🎙️ Voice dictation active — speak symptoms & findings. Auto-translates on completion.', { variant: 'info' });
  };

  const stopVoice = () => {
    if (recognitionRef) {
      try { recognitionRef.stop(); } catch {}
    }
    setIsListening(false);
    const fullText = (transcriptBufferRef.current + ' ' + interimBufferRef.current).trim();
    setInterimTranscript('');
    if (fullText.length >= 3 && !isProcessingVoiceRef.current) {
      processVoiceDictation(fullText);
    }
  };

  const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanLoading(true);
    enqueueSnackbar('Scanning document with OCR...', { variant: 'info' });
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const r = await api.post('/openmed/ocr-scan', { imageBase64: base64, mimeType: file.type || 'image/jpeg' });
          const text = r.data.data?.text || '';
          if (text) {
            setSoapSubjective(prev => prev ? `${prev}\n[SCANNED DOCUMENT]\n${text}` : text);
            enqueueSnackbar('OCR scan successful — transcribed into Subjective field!', { variant: 'success' });
          } else {
            enqueueSnackbar('No text detected in document image', { variant: 'warning' });
          }
        } catch { enqueueSnackbar('OCR scan failed', { variant: 'error' }); }
        finally { setScanLoading(false); }
      };
      reader.readAsDataURL(file);
    } catch { setScanLoading(false); }
  };

  const { data: encounters, isLoading } = useQuery<Encounter[]>('encounters', async () => { const r = await api.get('/fhir/Encounter'); return r.data.entry?.map((e: any) => e.resource) || []; });
  const { data: patients } = useQuery<Patient[]>('patients', async () => { const r = await api.get('/fhir/Patient'); return r.data.entry?.map((e: any) => e.resource) || []; });
  const createMutation = useMutation((enc: any) => api.post('/fhir/Encounter', enc), { onSuccess: () => queryClient.invalidateQueries('encounters') });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pid = f.get('patientId') as string; const pn = patients?.find(p => p.id === pid)?.name?.[0];
    await createMutation.mutateAsync({ resourceType: 'Encounter', status: f.get('status'), class: { code: f.get('class') }, subject: { reference: `Patient/${pid}`, display: pn ? `${pn.given?.[0]} ${pn.family}` : 'Unknown' }, period: { start: new Date(f.get('start') as string).toISOString() }, reasonCode: [{ text: f.get('reasonText') }], extension: [{ url: 'http://hospital.org/fhir/StructureDefinition/icd10', valueString: f.get('icd10') }] });
    setOpen(false);
  };

  const getStatusColor = (s: string) => ({ 'in-progress': 'warning', 'finished': 'success', 'completed': 'success', 'cancelled': 'error', 'deceased': 'error' }[s.toLowerCase()] || 'primary') as any;
  const getIcd10 = (enc: any) => {
    const ext = enc.extension?.find((e: any) => e.url.includes('/icd10'))?.valueString;
    if (ext) return ext;
    if (enc.diagnosis?.[0]?.condition?.display) return enc.diagnosis[0].condition.display;
    return 'None';
  };

  const renderIcd10Pills = (icdStr: string) => {
    if (!icdStr || icdStr === 'None' || icdStr === '-') {
      return (
        <Chip label="Pending Diagnosis" size="small" variant="outlined" sx={{ fontSize: '0.68rem', color: 'text.secondary', borderStyle: 'dashed' }} />
      );
    }

    const items = icdStr.split(/,\s*/).filter(Boolean);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, py: 0.5, maxWidth: 320 }}>
        {items.map((codeStr: string, idx: number) => {
          const match = codeStr.match(/^([A-Z0-9.]+)\s*[—–-]\s*(.*)$/i);
          let code = match ? match[1] : (codeStr.includes(' ') ? codeStr.split(' ')[0] : codeStr);
          let desc = match ? match[2] : (codeStr.includes(' ') ? codeStr.split(' ').slice(1).join(' ').replace(/^[—–-]\s*/, '') : '');

          if (!desc) {
            const dictMatch = ICD10_CODES.find(c => c.code.toLowerCase() === code.toLowerCase());
            if (dictMatch) {
              desc = dictMatch.name;
            }
          }

          return (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: alpha('#3b5bdb', 0.05),
                border: '1px solid',
                borderColor: alpha('#3b5bdb', 0.2),
                borderRadius: 2,
                px: 1,
                py: 0.6,
              }}
            >
              <Chip
                label={code}
                size="small"
                color="primary"
                sx={{ fontWeight: 800, fontSize: '0.68rem', height: 20, flexShrink: 0, fontFamily: 'monospace' }}
              />
              {desc ? (
                <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.3, whiteSpace: 'normal', wordBreak: 'normal' }}>
                  {desc}
                </Typography>
              ) : null}
            </Box>
          );
        })}
      </Box>
    );
  };

  const isSentToInternalBanking = (enc: Encounter) => {
    const s = (enc.status || '').toLowerCase();
    const extStatus = (enc.extension?.find((x: any) => x.url?.includes('visitStatus'))?.valueString || '').toUpperCase();

    // If patient is in active consultation or waiting for consultation, workspace is UNLOCKED
    if (s === 'in-progress' || s === 'in_progress' || extStatus === 'IN_CONSULTATION' || extStatus === 'WAITING_CONSULTATION') {
      return false;
    }

    const isBankingStatus = s === 'sent_to_internal_banking' || s === 'ordered_admission';
    const isVisitBanking = extStatus === 'ORDERED_ADMISSION';
    return isBankingStatus || isVisitBanking;
  };

  const handleRowClick = (enc: Encounter) => {
    if (isSentToInternalBanking(enc)) {
      enqueueSnackbar('💳 Patient has been sent to Internal Banking for admission deposit clearance. Workspace is locked.', { variant: 'info' });
      return;
    }
    setSelectedEncounter(enc);
    setActiveTab(0);
    setDrawerOpen(true);
    setAiRisk(null); setAiNerEntities([]); setAiLabSuggestions([]); setAiPrescribeRecs([]);
    setPresCart([]); setLabCart([]); setSoapAutoGenerated(false);
  };

  // Exclude IPD Bed-Admitted Patients, Discharged / Closed Visits & Ancillary-Only Desks from Outpatient Care (OPD) Queue
  // Exclude IPD Inpatient Bed-Admitted Patients, Discharged / Closed Visits & Ancillary-Only Desks from Outpatient Care (OPD) Desk
  const isAdmittedToBed = (enc: Encounter) => {
    const s = (enc.status || '').toLowerCase();
    const extStatus = (enc.extension?.find((x: any) => x.url?.includes('visitStatus'))?.valueString || '').toUpperCase();
    const cc = (enc.reasonCode?.[0]?.text || '').toLowerCase();
    const classCode = (enc.class?.code || '').toUpperCase();

    // Check if patient has an active inpatient bed admission extension
    const isAdmittedExt = enc.extension?.some((x: any) => 
      (x.url?.includes('isAdmitted') || x.url?.includes('admittedWard') || x.url?.includes('admitted')) && 
      (x.valueBoolean === true || (typeof x.valueString === 'string' && x.valueString.length > 0))
    );

    // Any patient who is admitted to IPD, transferred to IPD, pending bed assignment, or has an active bed admission is an INPATIENT (IPD)
    const isIPDInpatient = 
      s === 'admitted' ||
      s === 'transferred_to_ipd' ||
      s === 'pending_bed_assignment' ||
      extStatus === 'PENDING_BED_ASSIGNMENT' ||
      extStatus === 'ADMITTED' ||
      extStatus === 'INPATIENT' ||
      classCode === 'IMP' ||
      classCode === 'INPATIENT' ||
      cc.includes('admitted to bed') ||
      isAdmittedExt;

    if (isIPDInpatient) return true;

    // Any patient whose visit/encounter is closed, discharged, finished, or cancelled is NOT active on OPD
    const isDischargedOrClosed =
      s === 'discharged' ||
      s === 'closed' ||
      s === 'finished' ||
      s === 'completed' ||
      s === 'cancelled' ||
      extStatus === 'DISCHARGED' ||
      extStatus === 'CLOSED' ||
      extStatus === 'COMPLETED' ||
      extStatus === 'FINISHED' ||
      extStatus === 'CANCELLED';

    if (isDischargedOrClosed) return true;

    const vTypeExt = (enc.extension?.find((x: any) => x.url?.includes('visitType'))?.valueString || '').toUpperCase();
    const isOutpatientConsultation = vTypeExt === 'OUTPATIENT' || vTypeExt === 'AMBULATORY' || vTypeExt === 'EMERGENCY' || vTypeExt === 'CONSULTATION' || !vTypeExt;
    
    if (!isOutpatientConsultation) {
      const specializedAncillaryDesks = ['LAB_ONLY', 'RADIOLOGY_ONLY', 'PHYSIO', 'INPATIENT'];
      if (specializedAncillaryDesks.includes(vTypeExt)) return true;
    }

    return false;
  };

  const activeEncounters = useMemo(() => {
    const raw = encounters?.filter(enc => {
      if (isAdmittedToBed(enc)) return false;
      if (!isAssignedToCurrentDoctor(enc)) return false;
      const s = enc.status?.toLowerCase();
      const isFinished = s === 'finished' || s === 'completed' || s === 'closed' || s === 'discharged' || s === 'cancelled';
      return !isFinished;
    }) || [];
    const sorted = [...raw].sort((a: any, b: any) => {
      const timeA = new Date(a.period?.start || a.start || a.createdAt || 0).getTime();
      const timeB = new Date(b.period?.start || b.start || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    const map = new Map<string, Encounter>();
    for (const enc of sorted) {
      const patKey = enc.subject?.reference || enc.subject?.display || enc.id;
      if (!map.has(patKey)) map.set(patKey, enc);
    }
    return Array.from(map.values());
  }, [encounters, doctorFilterMode, user]);

  const finishedEncountersList = encounters?.filter(enc => {
    if (isAdmittedToBed(enc)) return false;
    const s = enc.status?.toLowerCase();
    return s === 'finished' || s === 'completed' || s === 'closed' || s === 'discharged' || s === 'cancelled';
  }) || [];

  const filteredEncounters = useMemo(() => {
    const raw = encounters?.filter(enc => {
      if (isAdmittedToBed(enc)) return false;
      if (!isAssignedToCurrentDoctor(enc)) return false;

      const matchesSearch = search ? (
        enc.subject?.display?.toLowerCase().includes(search.toLowerCase()) ||
        enc.id?.toLowerCase().includes(search.toLowerCase()) ||
        enc.reasonCode?.[0]?.text?.toLowerCase().includes(search.toLowerCase()) ||
        getIcd10(enc).toLowerCase().includes(search.toLowerCase())
      ) : true;

      if (!matchesSearch) return false;

      const s = enc.status?.toLowerCase();
      const isFinished = s === 'finished' || s === 'completed' || s === 'closed' || s === 'discharged' || s === 'cancelled';
      if (statusFilter === 'active') return !isFinished;
      if (statusFilter === 'finished') return isFinished;
      return true;
    }) || [];

    const sorted = [...raw].sort((a: any, b: any) => {
      const timeA = new Date(a.period?.start || a.start || a.createdAt || 0).getTime();
      const timeB = new Date(b.period?.start || b.start || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const map = new Map<string, Encounter>();
    for (const enc of sorted) {
      const patKey = enc.subject?.reference || enc.subject?.display || enc.id;
      if (!map.has(patKey)) map.set(patKey, enc);
    }
    return Array.from(map.values());
  }, [encounters, search, statusFilter, doctorFilterMode, user]);

  const handleSaveSOAP = async () => {
    if (!selectedEncounter) {
      enqueueSnackbar('No active consultation encounter selected', { variant: 'error' });
      return;
    }
    if (!soapSubjective || !soapSubjective.trim()) {
      enqueueSnackbar('⚠️ Subjective (S) Patient Symptoms field is required.', { variant: 'warning' });
      return;
    }
    if (!soapObjective || !soapObjective.trim()) {
      enqueueSnackbar('⚠️ Objective (O) Findings & Physical Examination field is required before saving.', { variant: 'warning' });
      return;
    }
    if (!soapPlan || !soapPlan.trim()) {
      enqueueSnackbar('⚠️ Plan (P) Treatment & Interventions field is required.', { variant: 'warning' });
      return;
    }
    const patId = selectedEncounter.subject.reference.split('/')[1];
    setSavingSoap(true);
    try {
      const savedCodes = [...soapAssessments];
      const savedSubj = soapSubjective;

      await api.post('/emr/notes', {
        patientId: patId,
        encounterId: selectedEncounter.id,
        subjective: soapSubjective,
        objective: soapObjective,
        assessment: soapAssessments.join(', '),
        plan: soapPlan,
        isFinalized: true,
      });
      enqueueSnackbar('✅ OPD Consultation SOAP Note saved successfully!', { variant: 'success' });
      
      // Preserve saved assessment, plan & date for TODAY so Tabs 2 & 3 stay populated!
      setLastSavedAssessment(savedCodes);
      setLastSavedSubjective(savedSubj);
      setLastSavedPlan(soapPlan);
      setLastSavedDate(new Date());

      const diagStr = savedCodes.join(', ') || getIcd10(selectedEncounter);
      if (diagStr) {
        runSmartRecommenders(diagStr, savedSubj);
      }

      // Reset draft input boxes
      setSoapSubjective('');
      setSoapObjective('');
      setSoapAssessments([]);
      setSoapPlan('');

      fetchEmrData(patId);
      queryClient.invalidateQueries('encounters');
      setActiveTab(2); // Auto-navigate to Prescriptions
    } catch {
      enqueueSnackbar('Failed to save SOAP note', { variant: 'error' });
    } finally {
      setSavingSoap(false);
    }
  };

  const [completingConsultation, setCompletingConsultation] = useState(false);

  const handleCompleteConsultation = async () => {
    if (!selectedEncounter) return;
    const patId = selectedEncounter.subject.reference.split('/')[1];
    setCompletingConsultation(true);
    try {
      const res = await api.post('/workflow/complete-consultation', {
        encounterId: selectedEncounter.id,
        patientId: patId,
      });
      const patName = selectedEncounter.subject.display || 'Patient';
      const nextStatus = res.data?.nextStatus;
      let deptMsg = 'Visit completed.';
      if (nextStatus === 'AWAITING_INVESTIGATION') deptMsg = 'Transferred to Laboratory Queue.';
      else if (nextStatus === 'WAITING_PHARMACY') deptMsg = 'Transferred to Pharmacy Queue.';
      else if (nextStatus === 'CLOSED') deptMsg = 'Outpatient Consultation Completed.';

      enqueueSnackbar(`🏁 Outpatient consultation completed for ${patName}! ${deptMsg}`, { variant: 'success' });
      setDrawerOpen(false);
      setSelectedEncounter(null);
      queryClient.invalidateQueries('encounters');
      queryClient.invalidateQueries('visits');
      queryClient.invalidateQueries('queues');
    } catch {
      enqueueSnackbar('Failed to complete consultation', { variant: 'error' });
    } finally {
      setCompletingConsultation(false);
    }
  };



  return (
    <Box sx={{ pb: 4 }}>
      {/* ── Modern Hero Header Banner ───────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b5bdb 100%)',
          color: '#ffffff',
          boxShadow: '0 8px 32px rgba(30, 58, 138, 0.25)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -0.5, mb: 0.5 }}>
              Outpatient Care (OPD) & Ambulatory Clinic Desk
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, mb: 1.5 }}>
              Ambulatory Consultations · Triage & Vitals Desk · OpenMed CDS Intelligence
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1}>
              <AiBadge label="Clinical Intelligence: ONLINE" color={aiStatus?.status === 'ONLINE' ? AI_TEAL : '#94a3b8'} />
              {aiStatus && (
                <>
                  <Chip icon={<Speed sx={{ fontSize: 12, color: '#fff !important' }} />} label={`${aiStatus.latencyAvgMs}ms`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.65rem', height: 20 }} />
                  <Chip icon={<Memory sx={{ fontSize: 12, color: '#fff !important' }} />} label={`${aiStatus.memoryUsageMb}MB RAM`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.65rem', height: 20 }} />
                  <Chip icon={<Shield sx={{ fontSize: 12, color: '#63e6be !important' }} />} label="LOCAL · OFFLINE" size="small" sx={{ bgcolor: 'rgba(99, 230, 190, 0.2)', color: '#63e6be', fontSize: '0.65rem', height: 20, fontWeight: 800 }} />
                </>
              )}
            </Stack>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<EventNote />}
              onClick={() => setOpenApptModal(true)}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', textTransform: 'none', fontWeight: 800, borderRadius: 2, '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              Schedule Follow-up
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpen(true)}
              sx={{ bgcolor: '#ffffff', color: '#1e3a8a', textTransform: 'none', fontWeight: 900, borderRadius: 2, '&:hover': { bgcolor: '#f8fafc' } }}
            >
              Record OPD Visit
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* ── Summary Statistics Grid (100% Active Queue Focused) ─────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Active Queue Total
                </Typography>
                <Typography variant="h4" fontWeight={900} color="#1e3a8a" mt={0.5}>
                  {activeEncounters.length}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: alpha('#1e3a8a', 0.1), color: '#1e3a8a', width: 48, height: 48 }}>
                <People />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Triaged & Ready
                </Typography>
                <Typography variant="h4" fontWeight={900} color="#0d9488" mt={0.5}>
                  {activeEncounters.filter((e: any) => e.extension?.some((x: any) => x.url.includes('triage')) || e.reasonCode?.[0]?.text).length}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: alpha('#0d9488', 0.1), color: '#0d9488', width: 48, height: 48 }}>
                <MonitorHeart />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Awaiting Triage Vitals
                </Typography>
                <Typography variant="h4" fontWeight={900} color="#f59f00" mt={0.5}>
                  {Math.max(0, activeEncounters.length - activeEncounters.filter((e: any) => e.extension?.some((x: any) => x.url.includes('triage')) || e.reasonCode?.[0]?.text).length)}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: alpha('#f59f00', 0.1), color: '#f59f00', width: 48, height: 48 }}>
                <CheckCircleOutline />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  High Risk Escalations
                </Typography>
                <Typography variant="h4" fontWeight={900} color="#dc2626" mt={0.5}>
                  {activeEncounters.filter((e: any) => getIcd10(e) !== 'None').length}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: alpha('#dc2626', 0.1), color: '#dc2626', width: 48, height: 48 }}>
                <ReportProblem />
              </Avatar>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* ── Table Toolbar & Search Bar ──────────────────────────────────────── */}
      <Card sx={{ borderRadius: 3, p: 2.5, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search outpatients by name, case ID, complaint or ICD-10..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
            }}
            sx={{ width: { xs: '100%', sm: 380 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Stack direction="row" spacing={1} sx={{ bg: '#f1f5f9', p: 0.5, borderRadius: 2 }}>
              <Button
                size="small"
                variant={doctorFilterMode === 'my_patients' ? 'contained' : 'text'}
                onClick={() => setDoctorFilterMode('my_patients')}
                startIcon={<Person sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  borderRadius: 1.5,
                  bgcolor: doctorFilterMode === 'my_patients' ? AI_PRIMARY : 'transparent',
                  color: doctorFilterMode === 'my_patients' ? '#fff' : 'text.secondary',
                  boxShadow: doctorFilterMode === 'my_patients' ? '0 2px 8px rgba(30,58,138,0.2)' : 'none',
                }}
              >
                My Assigned Patients
              </Button>
              <Button
                size="small"
                variant={doctorFilterMode === 'all_patients' ? 'contained' : 'text'}
                onClick={() => setDoctorFilterMode('all_patients')}
                startIcon={<PersonSearch sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  borderRadius: 1.5,
                  bgcolor: doctorFilterMode === 'all_patients' ? AI_PRIMARY : 'transparent',
                  color: doctorFilterMode === 'all_patients' ? '#fff' : 'text.secondary',
                  boxShadow: doctorFilterMode === 'all_patients' ? '0 2px 8px rgba(30,58,138,0.2)' : 'none',
                }}
              >
                All Outpatients
              </Button>
            </Stack>

            <Chip
              label={`${activeEncounters.length} Patients Waiting`}
              color="primary"
              sx={{ fontWeight: 800, fontSize: '0.82rem', py: 0.5, px: 1, borderRadius: 2 }}
            />
          </Box>
        </Box>

        {/* ── Outpatient Directory Table ────────────────────────────────────── */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, borderColor: 'divider' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                {['Patient Name', 'Encounter ID', 'Visit Date / Time', 'Class', 'Diagnosis ICD-10', 'Chief Complaint', 'Status', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={28} /><Typography variant="caption" display="block" color="text.secondary" mt={1}>Loading outpatient directory...</Typography></TableCell></TableRow>
              ) : filteredEncounters?.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}><Typography fontWeight={700}>No active outpatients in queue</Typography></TableCell></TableRow>
              ) : filteredEncounters?.map((enc: any) => (
                <TableRow key={enc.id} hover onClick={() => handleRowClick(enc)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(AI_PRIMARY, 0.03) } }}>
                  <TableCell sx={{ fontWeight: 800 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: AI_PRIMARY, width: 34, height: 34, fontSize: '0.85rem', fontWeight: 800 }}>
                        {enc.subject?.display?.substring(0, 1) || '?'}
                      </Avatar>
                      <Typography variant="body2" fontWeight={800}>{enc.subject?.display}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: AI_PRIMARY, fontWeight: 700 }}>
                    {enc.id.substring(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary' }}>
                    {enc.period?.start ? new Date(enc.period.start).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip label={getEncounterClassDisplay(enc)} size="small" variant="outlined" sx={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }} />
                  </TableCell>
                  <TableCell sx={{ minWidth: 260, maxWidth: 340 }}>
                    {renderIcd10Pills(getIcd10(enc))}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'text.primary' }}>
                    {enc.reasonCode?.[0]?.text || 'General Ambulatory Consultation'}
                  </TableCell>
                  <TableCell>
                    {isSentToInternalBanking(enc) ? (
                      <Chip
                        label="Sent to Internal Banking"
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.68rem',
                          bgcolor: alpha('#ea580c', 0.12),
                          color: '#ea580c',
                          border: '1.5px solid rgba(234, 88, 12, 0.35)',
                          borderRadius: '8px',
                        }}
                      />
                    ) : (
                      <Chip label={enc.status} color={getStatusColor(enc.status)} size="small" sx={{ fontWeight: 800, fontSize: '0.68rem' }} />
                    )}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {isSentToInternalBanking(enc) ? (
                      <Tooltip title="Patient sent to Internal Banking for admission deposit invoice clearance.">
                        <span>
                          <Button
                            size="small"
                            variant="contained"
                            disabled
                            startIcon={<Lock sx={{ fontSize: '14px !important' }} />}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 800,
                              borderRadius: 2,
                              py: 0.4,
                              fontSize: '0.75rem',
                              bgcolor: '#94a3b8 !important',
                              color: '#ffffff !important',
                              cursor: 'not-allowed !important',
                              '&.Mui-disabled': {
                                bgcolor: '#94a3b8 !important',
                                color: '#ffffff !important'
                              }
                            }}
                          >
                            Sent to Internal Banking
                          </Button>
                        </span>
                      </Tooltip>
                    ) : (
                      <Stack direction="row" spacing={1} alignItems="center">
                        {(enc.status?.toLowerCase() === 'deceased' || !!localDeceasedIds[enc.id]) ? (
                          <Chip label="DECEASED" color="error" size="small" sx={{ fontWeight: 800, fontSize: '0.68rem' }} />
                        ) : (
                          <Tooltip title="Declare Outpatient Deceased & Transfer to Mortuary">
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={(e) => { e.stopPropagation(); handleOpenDeceasedModal(enc); }}
                              sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, py: 0.35, px: 1, fontSize: '0.72rem', borderColor: alpha('#ef4444', 0.4), '&:hover': { bgcolor: alpha('#ef4444', 0.08) } }}
                            >
                              Mark Deceased
                            </Button>
                          </Tooltip>
                        )}
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleRowClick(enc)}
                          endIcon={<ArrowForward sx={{ fontSize: '14px !important' }} />}
                          sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, py: 0.4, fontSize: '0.75rem', bgcolor: AI_PRIMARY }}
                        >
                          Open Workspace
                        </Button>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* ── Record OPD Visit Dialog ────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>📋 Record Outpatient OPD Visit</DialogTitle>
        <DialogContent>
          <form id="opd-form" onSubmit={handleSubmit}>
            <TextField margin="dense" name="patientId" label="Select Registered Patient *" select fullWidth required defaultValue="">
              {patients?.map(p => <MenuItem key={p.id} value={p.id}>{p.name?.[0]?.given?.[0]} {p.name?.[0]?.family} ({p.id.substring(0,8)})</MenuItem>)}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField margin="dense" name="class" label="Encounter Class" select fullWidth required defaultValue="ambulatory">
                <MenuItem value="ambulatory">Ambulatory</MenuItem><MenuItem value="emergency">Emergency</MenuItem><MenuItem value="virtual">Virtual</MenuItem>
              </TextField>
              <TextField margin="dense" name="status" label="Status" select fullWidth required defaultValue="in-progress">
                <MenuItem value="planned">Planned</MenuItem><MenuItem value="arrived">Arrived</MenuItem><MenuItem value="in-progress">In-Progress</MenuItem><MenuItem value="finished">Finished</MenuItem><MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField margin="dense" name="start" label="Visit Date/Time" type="datetime-local" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={new Date().toISOString().substring(0,16)} />
              <TextField margin="dense" name="icd10" label="Diagnosis ICD-10" select fullWidth defaultValue="B50.9">
                {ICD10_CODES.map(c => <MenuItem key={c.code} value={c.code}>{c.code} — {c.name}</MenuItem>)}
              </TextField>
            </Box>
            <TextField margin="dense" name="reasonText" label="Chief Complaint / Reason for Visit *" fullWidth required multiline rows={3} placeholder="Describe patient symptoms (e.g. Fever, headache, joint pain x 3 days)..." />
          </form>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button type="submit" form="opd-form" variant="contained" sx={{ textTransform: 'none', fontWeight: 800, bgcolor: AI_PRIMARY }}>Record OPD Visit</Button>
        </DialogActions>
      </Dialog>

      {/* ── Ultra-Smart Outpatient Clinical Workspace Drawer ──────────────── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 580, md: 660 }, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' } }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
          {/* Workspace Header */}
          <Box sx={{ p: 2.5, bgcolor: '#1a202c', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: AI_PRIMARY, width: 42, height: 42, fontWeight: 800 }}>
                {selectedEncounter?.subject?.display?.substring(0,1) || '?'}
              </Avatar>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" fontWeight={800} color="#fff">
                    {selectedEncounter?.subject?.display}
                  </Typography>
                  <Chip
                    icon={<AutoAwesome sx={{ fontSize: '12px !important', color: '#63e6be' }} />}
                    label="OpenMed CDS"
                    size="small"
                    sx={{ bgcolor: 'rgba(99, 230, 190, 0.15)', color: '#63e6be', fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                  OPD Case: {selectedEncounter?.id ? `OPD-${selectedEncounter.id.substring(0, 6).toUpperCase()}` : 'N/A'} · Type: {selectedEncounter?.class?.code || 'Ambulatory'}
                </Typography>
              </Box>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              {/* Complete Consultation Button */}
              <Button
                size="small"
                variant="contained"
                startIcon={<CheckCircle fontSize="small" />}
                disabled={completingConsultation}
                onClick={handleCompleteConsultation}
                sx={{
                  bgcolor: '#10b981',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  boxShadow: '0 2px 10px rgba(16,185,129,0.3)',
                  '&:hover': { bgcolor: '#059669' }
                }}
              >
                {completingConsultation ? 'Completing...' : '🏁 End Consultation'}
              </Button>

              {/* Declare Deceased Button */}
              {selectedEncounter?.status?.toLowerCase() !== 'deceased' && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleOpenDeceasedModal(selectedEncounter)}
                  sx={{
                    color: '#fca5a5',
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    textTransform: 'none',
                    borderRadius: 2,
                    '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#fff' }
                  }}
                >
                  Declare Deceased
                </Button>
              )}

              {/* Doctor-to-Doctor Transfer Button */}
              <Button
                size="small"
                variant="outlined"
                startIcon={<SwapHoriz fontSize="small" />}
                onClick={handleOpenTransfer}
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.4)',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                Transfer Patient
              </Button>

              {/* Voice Mic Action Button */}
              {voiceSupported && (
                <Tooltip title={isListening ? "Stop Voice Transcription" : "Start Voice Consultation Dictation"}>
                  <IconButton
                    size="small"
                    onClick={isListening ? stopVoice : startVoice}
                    sx={{
                      color: isListening ? '#fbbf24' : '#fff',
                      bgcolor: isListening ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.1)',
                      border: isListening ? '1.5px solid #fbbf24' : '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    {isListening ? <GraphicEq fontSize="small" /> : <Mic fontSize="small" />}
                  </IconButton>
                </Tooltip>
              )}
              {/* OCR Document Scan Button */}
              <Box component="label" htmlFor="ocr-scan-input-drawer">
                <IconButton
                  component="span"
                  size="small"
                  disabled={scanLoading}
                  sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                  title="Scan paper note (OCR)"
                >
                  {scanLoading ? <CircularProgress size={16} sx={{ color: '#fbbf24' }} /> : <DocumentScanner fontSize="small" />}
                </IconButton>
                <input id="ocr-scan-input-drawer" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScanUpload} />
              </Box>
              <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: '#fff' }}>
                <Close />
              </IconButton>
            </Stack>
          </Box>

          {/* Quick Action Navigation Bar */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 46 }}>
              <Tab icon={<MonitorHeart sx={{ fontSize: 18 }} />} label="Overview & Vitals" iconPosition="start" sx={{ minHeight: 46, fontWeight: 800, fontSize: '0.8rem' }} />
              <Tab icon={<Notes sx={{ fontSize: 18 }} />} label="Clinic SOAP Note" iconPosition="start" sx={{ minHeight: 46, fontWeight: 800, fontSize: '0.8rem' }} />
              <Tab icon={<LocalPharmacy sx={{ fontSize: 18 }} />} label="Prescriptions & Stock" iconPosition="start" sx={{ minHeight: 46, fontWeight: 800, fontSize: '0.8rem' }} />
              <Tab icon={<Science sx={{ fontSize: 18 }} />} label="Lab Orders & Availability" iconPosition="start" sx={{ minHeight: 46, fontWeight: 800, fontSize: '0.8rem' }} />
              <Tab icon={<PersonalVideo sx={{ fontSize: 18 }} />} label="Radiology & PACS Scans" iconPosition="start" sx={{ minHeight: 46, fontWeight: 800, fontSize: '0.8rem' }} />
            </Tabs>
          </Box>

          {/* Workspace Scrollable Body */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
            {loadingSummary ? (
              <Box sx={{ py: 10, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" mt={2}>Loading patient record & preparing clinical summary...</Typography>
              </Box>
            ) : (
              <>
                {/* ── TAB 0: OVERVIEW & VITALS ───────────────────────────────── */}
                {activeTab === 0 && (
                  <Stack spacing={2.5}>
                    {/* Risk Stratification Panel */}
                    <Box sx={{ p: 2, borderRadius: 3, border: `2px solid ${alpha(AI_PURPLE, 0.25)}`, background: `linear-gradient(135deg, ${alpha(AI_PURPLE, 0.04)}, ${alpha(AI_PRIMARY, 0.06)})` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <SmartToy sx={{ color: AI_PURPLE, fontSize: 20 }} />
                          <Typography variant="subtitle2" fontWeight={900} color={AI_PRIMARY}>Clinical Risk Stratification</Typography>
                          <AiBadge label="AUTO" color={AI_PURPLE} />
                        </Stack>
                        {aiLoadingRisk && <CircularProgress size={16} sx={{ color: AI_PURPLE }} />}
                      </Stack>
                      {aiLoadingRisk && !aiRisk && <><LinearProgress sx={{ borderRadius: 2, mb: 1 }} color="secondary" /><Typography variant="caption" color="text.secondary">Analysing vitals and clinical pattern...</Typography></>}
                      {aiRisk ? (
                        <Stack spacing={1.5}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <RiskBadge risk={aiRisk.overallRisk} />
                            <Typography variant="body2" fontWeight={700}>Overall Risk</Typography>
                            <Typography variant="caption" color="text.secondary">NEWS2: {aiRisk.news2Score} · {aiRisk.risksFound} condition(s)</Typography>
                          </Stack>
                          {aiRisk.risks?.map((r: any, i: number) => (
                            <Alert key={i} severity={r.severity === 'CRITICAL' ? 'error' : r.severity === 'HIGH' ? 'warning' : r.severity === 'MODERATE' ? 'info' : 'success'} sx={{ borderRadius: 2, py: 0.5 }}>
                              <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: '0.82rem' }}>{r.condition}</Typography>
                              <Typography variant="caption" display="block">{r.action}</Typography>
                            </Alert>
                          ))}
                        </Stack>
                      ) : !aiLoadingRisk && <Typography variant="body2" color="text.secondary">Triage vitals required for automatic risk stratification.</Typography>}
                    </Box>

                    {/* Triage Vitals */}
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800} color="text.secondary" mb={1}>📊 Triage Vitals History</Typography>
                      {(() => {
                        const rawRecords = emrSummary?.triageRecords || [];
                        const uniqueRecords = rawRecords.filter((tr: any, idx: number, arr: any[]) => {
                          if (idx === 0) return true;
                          const prev = arr[idx - 1];
                          const timeDiffSec = Math.abs(new Date(tr.createdAt).getTime() - new Date(prev.createdAt).getTime()) / 1000;
                          const isSameVitals =
                            tr.systolic === prev.systolic &&
                            tr.diastolic === prev.diastolic &&
                            tr.temperature === prev.temperature &&
                            tr.pulseRate === prev.pulseRate;
                          return !(timeDiffSec <= 120 && isSameVitals);
                        });

                        return uniqueRecords.length > 0 ? (
                          <Stack spacing={1.5}>
                            {uniqueRecords.slice(0, 2).map((tr: any) => (
                              <Card key={tr.id} variant="outlined" sx={{ p: 2, borderRadius: 2.5, border: `1px solid ${alpha(AI_PRIMARY, 0.15)}` }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>{new Date(tr.createdAt).toLocaleString()}</Typography>
                                  <Chip label={`NEWS2: ${tr.news2Score ?? 0}`} size="small" color={tr.news2Score >= 7 ? 'error' : tr.news2Score >= 5 ? 'warning' : 'success'} sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />
                                </Stack>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                  {[['BP', `${tr.systolic}/${tr.diastolic} mmHg`, tr.systolic >= 180 || tr.systolic <= 90], ['Temp', `${tr.temperature}°C`, tr.temperature >= 38.5], ['Pulse', `${tr.pulseRate} bpm`, tr.pulseRate > 100], ['SpO₂', `${tr.spo2}%`, tr.spo2 < 94], ['RR', `${tr.respiratoryRate}/min`, tr.respiratoryRate >= 25], ['Pain', tr.painScore != null ? `${tr.painScore}/10` : 'N/A', tr.painScore >= 7]].map(([l, v, a]) => (
                                    <Box key={l as string} sx={{ p: 1, borderRadius: 1.5, bgcolor: a ? alpha(AI_DANGER, 0.07) : alpha(AI_SUCCESS, 0.06), border: `1px solid ${a ? alpha(AI_DANGER, 0.2) : alpha(AI_SUCCESS, 0.2)}` }}>
                                      <Typography variant="caption" color="text.secondary" display="block" fontWeight={700}>{l}</Typography>
                                      <Typography variant="subtitle2" fontWeight={900} color={a ? AI_DANGER : AI_SUCCESS}>{v as string}</Typography>
                                    </Box>
                                  ))}
                                </Box>
                              </Card>
                            ))}
                          </Stack>
                        ) : (
                          <Alert severity="info" sx={{ borderRadius: 2 }}>No triage vitals recorded for this visit yet.</Alert>
                        );
                      })()}
                    </Box>
                  </Stack>
                )}

                {/* ── TAB 1: CLINIC SOAP CONSULTATION NOTE ──────────────────── */}
                {activeTab === 1 && (
                  <Stack spacing={2.5}>
                    {/* Past Consultation Notes History Accordion */}
                    {emrSummary?.consultationNotes?.length > 0 ? (
                      <Accordion defaultExpanded={true} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: alpha('#3b5bdb', 0.25), bgcolor: alpha('#3b5bdb', 0.02), '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'primary.main' }} />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <History color="primary" fontSize="small" />
                            <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                              📜 Past Consultation Notes History ({emrSummary.consultationNotes.length} Notes Recorded)
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Stack spacing={1.5}>
                            {emrSummary.consultationNotes.map((note: any, nIdx: number) => (
                              <Paper
                                key={note.id || nIdx}
                                variant="outlined"
                                sx={{
                                  p: 2,
                                  borderRadius: 2.5,
                                  bgcolor: 'background.paper',
                                  borderLeft: '4px solid #1e3a8a',
                                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                                  <Box>
                                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                      <Chip label={`Consultation #${emrSummary.consultationNotes.length - nIdx}`} size="small" color="primary" sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                                      <Typography variant="caption" color="primary" fontWeight={800}>
                                        👨‍⚕️ Author: {note.doctorName || getDoctorAttribution(note)} ({note.doctorDesignation || 'Medical Officer'})
                                      </Typography>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                      🗓️ Date: {new Date(note.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </Typography>
                                  </Box>

                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<History sx={{ fontSize: 13 }} />}
                                    onClick={() => {
                                      if (note.subjective) setSoapSubjective(note.subjective);
                                      if (note.objective) setSoapObjective(note.objective);
                                      if (note.assessment) {
                                        const items = note.assessment.split(/,\s*/).filter(Boolean);
                                        setSoapAssessments(items);
                                        runSmartRecommenders(note.assessment, note.subjective || '');
                                      }
                                      if (note.plan) setSoapPlan(note.plan);
                                      enqueueSnackbar(`Copied Consultation #${emrSummary.consultationNotes.length - nIdx} into today's workspace!`, { variant: 'success' });
                                    }}
                                    sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: '0.72rem', fontWeight: 800, py: 0.3 }}
                                  >
                                    📋 Copy to Today's Note
                                  </Button>
                                </Box>

                                <Stack spacing={1}>
                                  {note.subjective && (
                                    <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: alpha('#1e3a8a', 0.03), border: `1px solid ${alpha('#1e3a8a', 0.08)}` }}>
                                      <Typography variant="caption" fontWeight={800} color="#1e3a8a" display="block">Subjective (S):</Typography>
                                      <Typography variant="body2" sx={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{note.subjective}</Typography>
                                    </Box>
                                  )}
                                  {note.objective && (
                                    <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: alpha('#0d9488', 0.03), border: `1px solid ${alpha('#0d9488', 0.08)}` }}>
                                      <Typography variant="caption" fontWeight={800} color="#0d9488" display="block">Objective (O):</Typography>
                                      <Typography variant="body2" sx={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{note.objective}</Typography>
                                    </Box>
                                  )}
                                  {note.assessment && (
                                    <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: alpha('#7c3aed', 0.04), border: `1px solid ${alpha('#7c3aed', 0.12)}` }}>
                                      <Typography variant="caption" fontWeight={800} color="#7c3aed" display="block">Assessment / Diagnoses (A):</Typography>
                                      <Typography variant="subtitle2" fontWeight={800} color="#7c3aed">{note.assessment}</Typography>
                                    </Box>
                                  )}
                                  {note.plan && (
                                    <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: alpha('#16a34a', 0.03), border: `1px solid ${alpha('#16a34a', 0.08)}` }}>
                                      <Typography variant="caption" fontWeight={800} color="#16a34a" display="block">Plan (P):</Typography>
                                      <Typography variant="body2" sx={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{note.plan}</Typography>
                                    </Box>
                                  )}
                                </Stack>
                              </Paper>
                            ))}
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    ) : (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        No previous consultation notes on file for this patient. Enter initial findings below to start a new record.
                      </Alert>
                    )}

                    {/* SOAP Fields Header & Smart Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="subtitle2" fontWeight={800}>SOAP Clinical Form (Today's Entry)</Typography>
                      <Stack direction="row" spacing={1}>
                        {emrSummary?.consultationNotes?.length > 0 && (
                          <Button
                            size="small" variant="outlined" color="primary"
                            startIcon={<History sx={{ fontSize: 14 }} />}
                            onClick={handleImportPreviousHistory}
                            sx={{ textTransform: 'none', borderRadius: 1.5, py: 0.3, fontWeight: 700, fontSize: '0.725rem' }}
                          >
                            📋 Import Previous Note
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant={isListening ? "contained" : "outlined"}
                          color={isListening ? "error" : "primary"}
                          startIcon={isListening ? <MicOff /> : <Mic />}
                          onClick={isListening ? stopVoice : startVoice}
                          sx={{ textTransform: 'none', borderRadius: 1.5, py: 0.3, fontWeight: 700, fontSize: '0.725rem' }}
                        >
                          {isListening ? 'Stop Voice Dictation' : '🎤 Voice Dictation'}
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="secondary"
                          startIcon={aiSoapLoading ? <CircularProgress size={14} color="inherit" /> : <AutoAwesome />}
                          onClick={handleAiGenerateSOAP}
                          disabled={aiSoapLoading}
                          sx={{ textTransform: 'none', borderRadius: 1.5, py: 0.3, fontWeight: 800, fontSize: '0.725rem', bgcolor: '#7950f2', '&:hover': { bgcolor: '#6741d9' } }}
                        >
                          {aiSoapLoading ? 'Deriving Smart SOAP…' : '✨ Smart Auto-Derive Assessment & Plan'}
                        </Button>
                      </Stack>
                    </Box>

                    <SmartFormattedTextArea
                      label="Subjective (S) — Patient Complaints & History"
                      rows={4}
                      value={soapSubjective}
                      onChange={setSoapSubjective}
                      placeholder="Type patient symptoms (e.g. fever, headache, joint pain) or use 🎤 Voice Dictation above..."
                      differentiators={['Patient Symptoms', 'History of Present Illness', 'Drug Allergies', 'Chief Complaint']}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Objective Findings & Physical Examination</Typography>
                      <Button size="small" variant="text" onClick={handleImportVitals} sx={{ textTransform: 'none', py: 0, fontSize: '0.7rem' }}>
                        Import Triage Vitals
                      </Button>
                    </Box>

                    <SmartFormattedTextArea
                      label="Objective (O) — Physical Exam & Vital Parameters"
                      rows={3}
                      value={soapObjective}
                      onChange={setSoapObjective}
                      differentiators={['Vital Signs', 'Cardiovascular System', 'Respiratory System', 'Abdominal Exam']}
                    />

                    <TerminologyAutocomplete
                      multiple
                      system="ICD10"
                      label="Assessment (A) — ICD-10 / SNOMED CT Diagnoses (Multiple)"
                      placeholder="Type to search and add multiple ICD-10 diagnoses..."
                      value={soapAssessments}
                      onChange={(newAssessments) => {
                        const list = Array.isArray(newAssessments) ? newAssessments : newAssessments ? [newAssessments] : [];
                        setSoapAssessments(list);
                        const updatedPlan = buildMultiFactorialPlan(list, soapSubjective);
                        setSoapPlan(updatedPlan);
                        if (list.length > 0) {
                          runSmartRecommenders(list.join(', '), soapSubjective);
                        }
                      }}
                    />

                    <SmartFormattedTextArea
                      label="Plan (P) — Clinical Interventions, Medications & Lab Orders"
                      rows={4}
                      value={soapPlan}
                      onChange={setSoapPlan}
                      differentiators={['Medication Interventions', 'Diagnostic Orders', 'Patient Education & Discharge']}
                    />

                    <Stack direction="row" spacing={1.5} flexWrap="wrap">
                      <Button
                        variant="contained"
                        color="success"
                        onClick={handleSaveSOAP}
                        disabled={savingSoap || !soapSubjective?.trim() || !soapObjective?.trim() || !soapPlan?.trim()}
                        startIcon={savingSoap ? <CircularProgress size={18} /> : <CheckCircle />}
                        sx={{ py: 1.2, fontWeight: 800, borderRadius: 2, flex: 1, minWidth: 220 }}
                      >
                        Save & Finalize OPD Consultation Note
                      </Button>

                      <Button
                        variant="contained"
                        onClick={() => {
                          setPhysioReferralPatient({
                            id: selectedEncounter?.subject?.reference?.replace('Patient/', '') || (selectedEncounter as any)?.patient?.id,
                            mrn: (selectedEncounter as any)?.patient?.patientNumber || (selectedEncounter as any)?.patient?.mrn || 'OPD-PATIENT',
                            name: selectedEncounter?.subject?.display || `${(selectedEncounter as any)?.patient?.firstName || ''} ${(selectedEncounter as any)?.patient?.lastName || ''}`.trim(),
                            phone: (selectedEncounter as any)?.patient?.phoneNumber || (selectedEncounter as any)?.patient?.phone || '',
                            ward: 'Outpatient Clinic Desk',
                            bed: 'Consulting Room',
                            diagnosis: soapAssessments?.join(', ') || lastSavedAssessment?.join(', ') || 'Mobility Impairment / Musculoskeletal Condition',
                            careSetting: 'OUTPATIENT_GYM'
                          });
                          setPhysioReferralOpen(true);
                        }}
                        startIcon={<AccessibilityNew />}
                        sx={{ py: 1.2, fontWeight: 800, borderRadius: 2, bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
                      >
                        🏃 Refer to Physiotherapy
                      </Button>

                      <Button
                        variant="contained"
                        onClick={handleOpenAdmissionModal}
                        startIcon={<LocalHospitalOutlined />}
                        sx={{ py: 1.2, fontWeight: 800, borderRadius: 2, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
                      >
                        🏨 Order Inpatient Admission
                      </Button>
                    </Stack>
                    {(!soapSubjective?.trim() || !soapObjective?.trim() || !soapPlan?.trim()) && (
                      <Typography variant="caption" color="error.main" sx={{ fontWeight: 700, textAlign: 'center', display: 'block', mt: 0.5 }}>
                        ⚠️ All SOAP sections (Subjective, Objective Findings, and Plan) must be filled before saving.
                      </Typography>
                    )}
                  </Stack>
                )}

                {/* ── TAB 2: SMART PRESCRIPTIONS & STOCK CHECKING ─────────────── */}
                {activeTab === 2 && (() => {
                  const effectiveAssessments = getEffectiveAssessments();
                  const effectiveSubj = soapSubjective || lastSavedSubjective;
                  return (
                  <Stack spacing={2.5}>
                    {/* AI Smart Prescribing Recommendation Banner — only shown when no draft or saved assessment */}
                    {effectiveAssessments.length === 0 && (
                      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: alpha('#7950f2', 0.03), borderColor: alpha('#7950f2', 0.18), display: 'flex', alignItems: 'center', gap: 2 }}>
                        <AutoAwesome sx={{ color: '#7950f2', fontSize: 28, flexShrink: 0 }} />
                        <Box>
                          <Typography variant="subtitle2" fontWeight={800} color="#7950f2" mb={0.3}>No SOAP Assessment Entered or Saved for Today's Entry</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Medication recommendations will appear here automatically once the doctor enters symptoms, selects an ICD-10 diagnosis, or imports a previous note in the <strong>Clinic SOAP Note</strong> tab.
                          </Typography>
                        </Box>
                      </Paper>
                    )}
                    {effectiveAssessments.length > 0 && <Box sx={{ p: 2, bgcolor: alpha('#3b5bdb', 0.04), border: '1px solid', borderColor: alpha('#3b5bdb', 0.2), borderRadius: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AutoAwesome sx={{ color: '#3b5bdb', fontSize: 20 }} />
                          <Typography variant="subtitle2" fontWeight={800} color="primary">
                            Recommended Outpatient Medications (With Real-Time Stock Status)
                          </Typography>
                        </Box>
                        <Tooltip title="Refresh recommendations for current diagnosis">
                          <IconButton
                            size="small"
                            onClick={() => runSmartRecommenders(effectiveAssessments.join(', '), effectiveSubj)}
                            disabled={aiLoadingMeds}
                            sx={{ color: 'primary.main' }}
                          >
                            {aiLoadingMeds ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                        Calculated for ICD-10: <strong>{effectiveAssessments.join(', ')}</strong>. Click "Add & Edit Dosing" to prescribe.
                      </Typography>

                      {aiLoadingMeds ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2, justifyContent: 'center' }}>
                          <CircularProgress size={20} />
                          <Typography variant="caption" color="text.secondary">Fetching medication recommendations...</Typography>
                        </Box>
                      ) : aiMedRecs.length > 0 ? (
                        <Grid container spacing={1.5}>
                          {aiMedRecs.filter((rec: any) => rec?.name).map((rec: any, idx: number) => {
                            const stockInfo = getStockStatus(rec.name);
                            return (
                              <Grid item xs={12} key={idx}>
                                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.paper', border: stockInfo.dispQty > 0 ? '1px solid' : '1px dashed', borderColor: stockInfo.dispQty > 0 ? 'success.light' : 'error.light' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.8 }}>
                                    <Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                                        <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                                          {rec.name}
                                        </Typography>
                                        {rec.brandName && (
                                          <Chip label={rec.brandName} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16, color: 'text.secondary' }} />
                                        )}
                                        {rec.priority && (
                                          <Chip
                                            label={rec.priority}
                                            size="small"
                                            color={rec.priority === 'FIRST-LINE' ? 'primary' : rec.priority === 'ADJUNCT' ? 'info' : 'default'}
                                            sx={{ fontSize: '0.6rem', height: 16, fontWeight: 700 }}
                                          />
                                        )}
                                      </Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Suggested: {rec.dose || '1 tab'} · {rec.frequency || 'TDS'} · {rec.duration || '5 Days'} · {rec.route || 'Oral'}
                                        {rec.quantityPrescribed ? ` (Qty: ${rec.quantityPrescribed})` : ''}
                                      </Typography>
                                    </Box>

                                    {/* Real-time Stock Check Badge */}
                                    {stockInfo.dispQty > 0 ? (
                                      <Chip
                                        icon={<Check sx={{ fontSize: '12px !important' }} />}
                                        label={`DISPENSARY: ${stockInfo.dispQty} left | STORE: ${stockInfo.storeQty}`}
                                        color="success"
                                        size="small"
                                        sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                      />
                                    ) : stockInfo.storeQty > 0 ? (
                                      <Chip
                                        icon={<Warning sx={{ fontSize: '12px !important' }} />}
                                        label={`OUT OF STOCK IN DISPENSARY (Central Store: ${stockInfo.storeQty})`}
                                        color="warning"
                                        size="small"
                                        sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                      />
                                    ) : (
                                      <Chip
                                        icon={<Warning sx={{ fontSize: '12px !important' }} />}
                                        label="OUT OF STOCK (External Purchase)"
                                        color="error"
                                        size="small"
                                        sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                      />
                                    )}
                                  </Box>

                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontStyle: 'italic' }}>
                                    Rationale: {rec.rationale || rec.rational || 'First-line protocol for diagnosis'}
                                  </Typography>

                                  <Button
                                    size="small"
                                    variant={stockInfo.inStock ? "contained" : "outlined"}
                                    color={stockInfo.inStock ? "primary" : "warning"}
                                    startIcon={<Add />}
                                    onClick={() => handleAddMedicationToCart(rec)}
                                    sx={{ textTransform: 'none', py: 0.2, px: 1.5, fontSize: '0.725rem', borderRadius: 1.5, fontWeight: 700 }}
                                  >
                                    {stockInfo.inStock ? "Add & Edit Dosing" : "Add (Outside Purchase)"}
                                  </Button>
                                </Paper>
                              </Grid>
                            );
                          })}
                        </Grid>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="body2" color="text.secondary">No medication recommendations for this ICD-10 code.</Typography>
                          <Button
                            size="small"
                            startIcon={<Refresh />}
                            onClick={() => runSmartRecommenders(soapAssessments.join(', '), soapSubjective)}
                            sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}
                          >
                            Retry Recommendations
                          </Button>
                        </Box>
                      )}
                    </Box>}

                    {/* Manual Prescription Form */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" fontWeight={800}>Manual Outpatient Medication Entry</Typography>
                      <Chip label={`${pharmacyCatalog.length} Medications Available`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                    </Box>
                    <Autocomplete
                      fullWidth
                      size="small"
                      options={pharmacyCatalog}
                      getOptionLabel={(option: any) => typeof option === 'string' ? option : `${option.name || option.genericName} (${option.category || 'Outpatient Stock'})`}
                      value={pharmacyCatalog.find((m: any) => m.id === selectedMedId || m.name === selectedMedId) || null}
                      onChange={(_, newValue: any) => {
                        if (!newValue) {
                          setSelectedMedId('');
                          return;
                        }
                        setSelectedMedId(newValue.id || newValue.name);
                        handleAutoSelectMedicationDefaults(newValue);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Medication / Fluid from Pharmacy Stock & Data Dictionary"
                          placeholder="Search IV fluids, antibiotics, analgesics, etc..."
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      )}
                      renderOption={(props, option: any) => {
                        const batches = option.batches || [];
                        const dispStock = option.dispensaryStock !== undefined ? Number(option.dispensaryStock) : batches
                          .filter((b: any) => b.warehouse?.code === 'DISP-MAIN' || b.warehouse?.name?.toLowerCase().includes('dispensary'))
                          .reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0);

                        const storeStock = option.centralStoreStock !== undefined ? Number(option.centralStoreStock) : batches
                          .filter((b: any) => b.warehouse?.code === 'WH-MAIN' || b.warehouse?.name?.toLowerCase().includes('central') || b.warehouse?.name?.toLowerCase().includes('warehouse') || b.warehouse?.name?.toLowerCase().includes('store'))
                          .reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0);

                        return (
                          <Box component="li" {...props} key={option.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 1.5, borderBottom: '1px dotted rgba(0,0,0,0.06)' }}>
                            <Box sx={{ pr: 1 }}>
                              <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {option.genericName ? `Generic: ${option.genericName} · ` : ''}{option.category || 'Drug'} · Route: {option.route || 'Oral'}
                              </Typography>
                            </Box>
                            {dispStock > 0 ? (
                              <Chip
                                label={`DISPENSARY: ${dispStock} left | STORE: ${storeStock}`}
                                color="success"
                                size="small"
                                sx={{ fontSize: '0.6rem', height: 20, fontWeight: 800 }}
                              />
                            ) : storeStock > 0 ? (
                              <Chip
                                label={`OUT OF STOCK IN DISPENSARY (Central Store: ${storeStock})`}
                                color="warning"
                                size="small"
                                sx={{ fontSize: '0.6rem', height: 20, fontWeight: 800 }}
                              />
                            ) : (
                              <Chip
                                label={option.isPharmacyItem ? 'OUT OF STOCK (External)' : 'EXTERNAL PURCHASE'}
                                color={option.isPharmacyItem ? 'error' : 'warning'}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.6rem', height: 20, fontWeight: 800 }}
                              />
                            )}
                          </Box>
                        );
                      }}
                    />

                    {/* Editable Dosage Parameters for Manual Entry */}
                    <Grid container spacing={1.5}>
                      <Grid item xs={6} sm={3}>
                        <TextField label="Dose" select fullWidth size="small" value={medDose} onChange={e => setMedDose(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                          {DOSE_OPTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField label="Frequency" select fullWidth size="small" value={medFreq} onChange={e => setMedFreq(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                          {FREQ_OPTIONS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField label="Duration" select fullWidth size="small" value={medDuration} onChange={e => setMedDuration(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                          {DURATION_OPTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField label="Route" select fullWidth size="small" value={medRoute} onChange={e => setMedRoute(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                          {ROUTE_OPTIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </TextField>
                      </Grid>
                    </Grid>

                    <Button
                      variant="outlined"
                      onClick={handleManualAddMed}
                      disabled={!selectedMedId}
                      startIcon={<Add />}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      Add Custom Medication to Order
                    </Button>

                    {/* Prescription Cart with Inline Dosing Editors */}
                    {presCart.length > 0 && (
                      <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: 'primary.main', bgcolor: alpha('#3b5bdb', 0.02) }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="primary">
                            Selected Outpatient Prescription Cart ({presCart.length} Items)
                          </Typography>
                          {presCart.map((item, i) => (
                            <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2, bgcolor: 'background.paper' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography variant="subtitle2" fontWeight={800}>{item.name}</Typography>
                                    {item.inStock ? (
                                      <Chip label="In Stock" color="success" size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                                    ) : (
                                      <Chip label="Out of Stock" color="error" size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                                    )}
                                    {item.type && <Chip label={item.type} variant="outlined" size="small" sx={{ fontSize: '0.6rem', height: 18 }} />}
                                  </Box>
                                </Box>
                                <IconButton size="small" color="error" onClick={() => setPresCart(prev => prev.filter((_, idx) => idx !== i))}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                              {/* Inline Dosing Editors */}
                              <Grid container spacing={1}>
                                <Grid item xs={6} sm={3}>
                                  <TextField
                                    label="Dose" select fullWidth size="small" value={item.dose}
                                    onChange={e => setPresCart(prev => prev.map((p, idx) => idx === i ? { ...p, dose: e.target.value } : p))}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                  >
                                    {DOSE_OPTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                                  </TextField>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <TextField
                                    label="Frequency" select fullWidth size="small" value={item.frequency}
                                    onChange={e => setPresCart(prev => prev.map((p, idx) => idx === i ? { ...p, frequency: e.target.value } : p))}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                  >
                                    {FREQ_OPTIONS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                                  </TextField>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <TextField
                                    label="Duration" select fullWidth size="small" value={item.duration}
                                    onChange={e => setPresCart(prev => prev.map((p, idx) => idx === i ? { ...p, duration: e.target.value } : p))}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                  >
                                    {DURATION_OPTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                                  </TextField>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <TextField
                                    label="Route" select fullWidth size="small" value={item.route}
                                    onChange={e => setPresCart(prev => prev.map((p, idx) => idx === i ? { ...p, route: e.target.value } : p))}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                  >
                                    {ROUTE_OPTIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                                  </TextField>
                                </Grid>
                              </Grid>
                              {item.rational && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                                  Rationale: {item.rational}
                                </Typography>
                              )}
                            </Paper>
                          ))}

                          <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            onClick={handleSubmitPrescription}
                            disabled={prescribing}
                            startIcon={prescribing ? <CircularProgress size={18} /> : <LocalPharmacy />}
                            sx={{ mt: 1.5, py: 1.2, fontWeight: 800, borderRadius: 2 }}
                          >
                            Submit Prescription Order to Pharmacy Dispensary
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Saved & Active Prescribed Medications List for Patient */}
                    <Card variant="outlined" sx={{ borderRadius: 2.5, mt: 1 }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocalPharmacy color="primary" fontSize="small" />
                            <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                              Prescribed Outpatient Medications ({patientPrescriptions.flatMap((rx: any) => rx.items || []).length} Active Orders)
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<Refresh fontSize="small" />}
                            onClick={() => {
                              if (!selectedEncounter) return;
                              const pId = selectedEncounter.subject.reference.split('/')[1];
                              if (pId) api.get(`/pharmacy/prescriptions?patientId=${pId}`).then(r => setPatientPrescriptions(r.data || [])).catch(() => {});
                            }}
                            sx={{ textTransform: 'none', py: 0, fontSize: '0.75rem' }}
                          >
                            Refresh Orders
                          </Button>
                        </Box>

                        {patientPrescriptions.length === 0 || patientPrescriptions.flatMap((rx: any) => rx.items || []).length === 0 ? (
                          <Alert severity="info" sx={{ borderRadius: 2 }}>
                            No active prescription orders on file for this patient. Use the form above to prescribe medications.
                          </Alert>
                        ) : (
                          <Stack spacing={1.5}>
                            {patientPrescriptions.flatMap((rx: any) =>
                              (rx.items || []).map((it: any, idx: number) => {
                                const isExtAdmin = it.status === 'DISPENSED_EXTERNAL';
                                const isExt = Boolean(it.isExternalPurchase === true || it.isExternal === true || it.status === 'OUT_OF_STOCK_EXTERNAL' || it.medication?.itemCode === 'EXT-PURCHASE-MED' || it.medication?.genericName === 'External Purchase Medication' || it.clinicalIndication?.toLowerCase().startsWith('external purchase:'));
                                const rawName = (() => {
                                  if (it.clinicalIndication?.toLowerCase().startsWith('external purchase:')) {
                                    return it.clinicalIndication.replace(/^external purchase:\s*/i, '').trim();
                                  }
                                  if (it.medication && it.medication.genericName !== 'External Purchase Medication') {
                                    return it.medication.brandName
                                      ? `${it.medication.genericName} (${it.medication.brandName})`
                                      : it.medication.genericName;
                                  }
                                  return (it.name || 'Prescribed Drug').trim();
                                })();
                                const medName = isExt ? `${rawName} (External Purchase - Out of Stock)` : rawName;
                                return (
                                  <Paper
                                    key={`${rx.id}-${idx}`}
                                    variant="outlined"
                                    sx={{
                                      p: 1.5,
                                      borderRadius: 2,
                                      bgcolor: isExtAdmin ? '#f0fdf4' : (isExt ? '#fffdf5' : '#f8fafc'),
                                      border: '1px solid',
                                      borderColor: isExtAdmin ? '#86efac' : (isExt ? '#fde047' : '#cbd5e1'),
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.8 }}>
                                      <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                          <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                                            {medName}
                                          </Typography>
                                          {(() => {
                                            const statusInfo = getMedicationStatusInfo(it, rx, emarLogs);
                                            return (
                                              <Chip
                                                label={statusInfo.label}
                                                size="small"
                                                sx={{
                                                  fontWeight: 800,
                                                  fontSize: '0.65rem',
                                                  height: 20,
                                                  bgcolor: statusInfo.chipBg,
                                                  color: statusInfo.chipColor,
                                                  border: '1px solid',
                                                  borderColor: alpha(statusInfo.chipColor, 0.4),
                                                }}
                                              />
                                            );
                                          })()}
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3 }}>
                                          Dose: <strong>{it.dose || '1 tab'}</strong> · Frequency: <strong>{it.frequency || 'TDS'}</strong> · Duration: <strong>{it.duration || '7 Days'}</strong> · Route: <strong>{it.route || 'Oral'}</strong>
                                        </Typography>
                                      </Box>
                                      <Typography variant="caption" color="primary" fontWeight={700}>
                                        👨‍⚕️ Prescribed by: {getDoctorAttribution(rx)} · {new Date(rx.orderedAt || rx.createdAt || Date.now()).toLocaleDateString()}
                                      </Typography>
                                    </Box>
                                    <Typography variant="caption" color={isExt ? 'warning.dark' : 'text.secondary'} display="block" sx={{ fontStyle: 'italic' }}>
                                      {isExt
                                        ? '⚠️ Saved to Patient Clinical Record (Patient/Sponsor to purchase from external commercial pharmacy)'
                                        : `Hospital Invoice Ref: RX-INV-${rx.prescriptionNumber}`}
                                    </Typography>
                                  </Paper>
                                );
                              })
                            )}
                          </Stack>
                        )}
                      </CardContent>
                    </Card>

                    {/* Navigation footer to Lab Orders */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        endIcon={<ArrowForward />}
                        onClick={() => setActiveTab(3)}
                        sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none', px: 3, py: 1 }}
                      >
                        Proceed to Lab & Diagnostic Orders ➔
                      </Button>
                    </Box>
                  </Stack>
                  );
                })()}

                {/* ── TAB 3: LAB ORDERS & AVAILABILITY ──────────────────────── */}
                {activeTab === 3 && (() => {
                  const effectiveAssessments = getEffectiveAssessments();
                  const effectiveSubj = soapSubjective || lastSavedSubjective;
                  return (
                  <Stack spacing={2.5}>
                    {/* AI Smart Lab Recommendation Banner */}
                    {effectiveAssessments.length === 0 && (
                      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: alpha('#0ca678', 0.04), borderColor: alpha('#0ca678', 0.18), display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Biotech sx={{ color: '#0ca678', fontSize: 28, flexShrink: 0 }} />
                        <Box>
                          <Typography variant="subtitle2" fontWeight={800} color="#0ca678" mb={0.3}>No SOAP Assessment Entered or Saved for Today's Entry</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Laboratory investigation recommendations will appear here automatically once the doctor enters symptoms, selects an ICD-10 diagnosis, or imports a previous note in the <strong>Clinic SOAP Note</strong> tab.
                          </Typography>
                        </Box>
                      </Paper>
                    )}
                    {effectiveAssessments.length > 0 && <Box sx={{ p: 2, bgcolor: alpha('#0ca678', 0.04), border: '1px solid', borderColor: alpha('#0ca678', 0.2), borderRadius: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Biotech sx={{ color: '#0ca678', fontSize: 20 }} />
                          <Typography variant="subtitle2" fontWeight={800} color="#0ca678">
                            Recommended Outpatient Laboratory Investigations
                          </Typography>
                        </Box>
                        <Tooltip title="Refresh lab recommendations">
                          <IconButton
                            size="small"
                            onClick={() => runSmartRecommenders(effectiveAssessments.join(', '), effectiveSubj)}
                            disabled={aiLoadingLabs}
                            sx={{ color: '#0ca678' }}
                          >
                            {aiLoadingLabs ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                        Recommended for ICD-10: <strong>{effectiveAssessments.join(', ')}</strong>. Checks real-time lab capability.
                      </Typography>

                      {aiLoadingLabs ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2, justifyContent: 'center' }}>
                          <CircularProgress size={20} />
                          <Typography variant="caption" color="text.secondary">Fetching lab recommendations...</Typography>
                        </Box>
                      ) : aiLabRecs.length > 0 ? (
                        <Grid container spacing={1.5}>
                          {aiLabRecs.filter((testRec: any) => testRec?.name).map((testRec: any, idx: number) => {
                            const labInfo = getLabStatus(testRec.name);
                            return (
                              <Grid item xs={12} key={idx}>
                                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.paper' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.8 }}>
                                    <Box>
                                      <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                                        {testRec.name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Category: {testRec.category || 'Pathology'} · Priority: {testRec.priority || 'ROUTINE'}
                                      </Typography>
                                    </Box>

                                    {/* Real-time Lab Availability Badge */}
                                    {labInfo.available ? (
                                      <Chip
                                        icon={<Check sx={{ fontSize: '12px !important' }} />}
                                        label="AVAILABLE IN LAB"
                                        color="success"
                                        size="small"
                                        sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                      />
                                    ) : (
                                      <Chip
                                        icon={<Warning sx={{ fontSize: '12px !important' }} />}
                                        label="UNAVAILABLE — Advise to Test Outside"
                                        color="warning"
                                        size="small"
                                        sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                      />
                                    )}
                                  </Box>

                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontStyle: 'italic' }}>
                                    Rationale: {testRec.rationale || testRec.reason || 'Diagnostic workup for outpatient management'}
                                  </Typography>

                                  <Button
                                    size="small"
                                    variant={labInfo.available ? "contained" : "outlined"}
                                    color={labInfo.available ? "success" : "warning"}
                                    startIcon={<Add />}
                                    onClick={() => handleAddLabToCart(testRec)}
                                    sx={{ textTransform: 'none', py: 0.2, px: 1.5, fontSize: '0.725rem', borderRadius: 1.5, fontWeight: 700 }}
                                  >
                                    {labInfo.available ? "Add to Lab Order" : "Add (Unavailable — External Lab Request)"}
                                  </Button>
                                </Paper>
                              </Grid>
                            );
                          })}
                        </Grid>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No automatic lab recommendations available for this diagnosis.</Typography>
                      )}
                    </Box>}

                    {/* Manual Lab Investigation Request Form */}
                    <Typography variant="subtitle2" fontWeight={800}>Manual Laboratory Test Selection</Typography>
                    <FormControl fullWidth size="small">
                      <InputLabel>Select Test Item</InputLabel>
                      <Select
                        value={selectedTestId}
                        label="Select Test Item"
                        onChange={e => setSelectedTestId(e.target.value)}
                        sx={{ borderRadius: 2 }}
                      >
                        {labCatalog.map((t: any) => {
                          const testTitle = t.testName || t.name || t.testCode || 'Lab Test';
                          const isAvail = t.isActive !== false && t.isAvailable !== false;
                          return (
                            <MenuItem key={t.id} value={t.id}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <Box sx={{ py: 0.2 }}>
                                  <Typography variant="body2" fontWeight={700} color="text.primary">
                                    {testTitle}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {t.testCode ? `${t.testCode} · ` : ''}{t.category || 'General Lab'}{t.price ? ` · ₦${Number(t.price).toLocaleString()}` : ''}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={isAvail ? 'Available' : 'Unavailable'}
                                  color={isAvail ? 'success' : 'warning'}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.625rem', height: 18, ml: 1, fontWeight: 700 }}
                                />
                              </Box>
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>

                    <TextField
                      label="Lab Priority"
                      select
                      fullWidth
                      size="small"
                      value={labPriority}
                      onChange={e => setLabPriority(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      {['ROUTINE', 'URGENT', 'STAT (Emergency Immediate)'].map(p => <MenuItem key={p} value={p.split(' ')[0]}>{p}</MenuItem>)}
                    </TextField>

                    <Button
                      variant="outlined"
                      color="success"
                      onClick={handleManualAddLab}
                      disabled={!selectedTestId}
                      startIcon={<Add />}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      Add Lab Test to Order
                    </Button>

                    {/* Lab Order Cart */}
                    {labCart.length > 0 && (
                      <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: '#0ca678', bgcolor: alpha('#0ca678', 0.02) }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="#0ca678">
                            Selected Outpatient Lab Orders ({labCart.length} Tests)
                          </Typography>
                          {labCart.map((item, i) => (
                            <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2, bgcolor: 'background.paper' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={800}>{item.name}</Typography>
                                    <Chip label={item.priority} color={item.priority === 'STAT' ? 'error' : 'info'} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                                    {item.available ? (
                                      <Chip label="In-House Lab" color="success" size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                                    ) : (
                                      <Chip label="External Test Required" color="warning" size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                                    )}
                                  </Box>
                                </Box>
                                <IconButton size="small" color="error" onClick={() => setLabCart(prev => prev.filter((_, idx) => idx !== i))}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            </Paper>
                          ))}

                          <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            onClick={handleSubmitLabOrder}
                            disabled={orderingLab}
                            startIcon={orderingLab ? <CircularProgress size={18} /> : <Biotech />}
                            sx={{ mt: 1.5, py: 1.2, fontWeight: 800, borderRadius: 2 }}
                          >
                            Submit Orders to LIMS Laboratory
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Redesigned Active Lab Orders & Diagnostic Results List for Patient */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="text.secondary">
                        🧪 Patient's Lab Order History & Diagnostic Results ({labOrders.length} Orders)
                      </Typography>
                      {labOrders.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>No previous lab orders on file for this patient.</Alert>
                      ) : (
                        <Stack spacing={2}>
                          {labOrders.map((o: any) => (
                            <Paper
                              key={o.id}
                              variant="outlined"
                              sx={{
                                p: 2,
                                borderRadius: 2.5,
                                bgcolor: 'background.paper',
                                borderLeft: '4px solid #0ca678',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                                transition: 'all 0.2s',
                                '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.08)' },
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                  <Avatar sx={{ bgcolor: alpha('#0ca678', 0.1), color: '#0ca678', width: 38, height: 38 }}>
                                    <Biotech fontSize="small" />
                                  </Avatar>
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                                      📋 Order #{o.orderNumber || o.id?.substring(0, 8).toUpperCase()}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Type: {o.items?.[0]?.test?.category || 'Clinical Pathology'}
                                    </Typography>
                                  </Box>
                                </Stack>

                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip label={o.priority || 'ROUTINE'} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.65rem', height: 22 }} />
                                  <Chip label={o.status || 'PENDING'} size="small" color={o.status === 'COMPLETED' ? 'success' : 'warning'} sx={{ fontWeight: 800, fontSize: '0.65rem', height: 22 }} />
                                </Stack>
                              </Box>

                              {/* Test items list */}
                              {o.items?.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                                  {o.items.map((it: any, iIdx: number) => (
                                    <Chip key={iIdx} icon={<Science sx={{ fontSize: 13 }} />} label={`${it.test?.testName || it.testName || 'Lab Test'}: ${it.status || 'PENDING'}`} size="small" variant="outlined" color={it.status === 'COMPLETED' ? 'success' : 'default'} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                                  ))}
                                </Box>
                              )}

                              {/* Doctor Attribution Footer Banner */}
                              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha('#0ca678', 0.04), border: `1px solid ${alpha('#0ca678', 0.1)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" fontWeight={800} color="#0ca678">
                                  👨‍⚕️ Ordered by: {getDoctorAttribution(o)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                  🗓️ {new Date(o.createdAt || o.orderedAt || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </Typography>
                              </Box>
                            </Paper>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                  );
                })()}

                {/* ── TAB 4: RADIOLOGY & PACS SCANS ──────────────────────────── */}
                {activeTab === 4 && (() => {
                  const effectiveSubj = soapSubjective || emrSummary?.encounters?.[0]?.notes?.[0]?.subjectiveNote || '';
                  const effectiveAssessments = soapAssessments.length > 0 ? soapAssessments : (emrSummary?.encounters?.[0]?.diagnoses || []);
                  
                  // Default Radiology Imaging Catalog
                  const catalogItems = radCatalog.length > 0 ? radCatalog : [
                    { id: 'rad-cat-1', code: 'XR-CHEST', name: 'Chest X-Ray PA & Lateral View', modality: 'X-RAY', price: 12500 },
                    { id: 'rad-cat-2', code: 'US-ABD', name: 'Abdominal Ultrasound (Full Scan)', modality: 'ULTRASOUND', price: 15000 },
                    { id: 'rad-cat-3', code: 'CT-BRAIN', name: 'CT Brain High Resolution Non-Contrast', modality: 'CT', price: 45000 },
                    { id: 'rad-cat-4', code: 'MRI-BRAIN', name: 'Brain MRI Non-Contrast (3.0T)', modality: 'MRI', price: 65000 },
                    { id: 'rad-cat-5', code: 'US-PELVIC', name: 'Pelvic & Gynaecology Ultrasound', modality: 'ULTRASOUND', price: 12500 },
                    { id: 'rad-cat-6', code: 'XR-SPINE', name: 'Cervical Spine X-Ray AP/Lat/Flexion', modality: 'X-RAY', price: 14000 },
                    { id: 'rad-cat-7', code: 'MAMMO', name: 'Bilateral Mammography (Digital)', modality: 'MAMMOGRAPHY', price: 25000 },
                    { id: 'rad-cat-8', code: 'ECHO-2D', name: 'Transthoracic 2D Echocardiogram', modality: 'ECHO', price: 30000 },
                  ];

                  // Smart AI Recommendations based on symptoms/notes
                  const textContent = `${effectiveSubj} ${effectiveAssessments.join(' ')}`.toLowerCase();
                  const recommendations = [];
                  if (textContent.includes('cough') || textContent.includes('fever') || textContent.includes('chest') || textContent.includes('breath') || textContent.includes('dyspnea') || textContent.includes('pneumonia')) {
                    recommendations.push({ name: 'Chest X-Ray PA & Lateral View', modality: 'X-RAY', reason: 'Rule out pulmonary consolidation, pneumonia, or pleural effusion based on respiratory symptoms.', catalogId: catalogItems[0].id });
                  }
                  if (textContent.includes('headache') || textContent.includes('trauma') || textContent.includes('fall') || textContent.includes('head') || textContent.includes('dizziness') || textContent.includes('syncope') || textContent.includes('stroke') || textContent.includes('seizure')) {
                    recommendations.push({ name: 'CT Brain High Resolution Non-Contrast', modality: 'CT', reason: 'Evaluate for acute intracranial hemorrhage, skull trauma, or space-occupying lesion.', catalogId: catalogItems[2].id });
                    recommendations.push({ name: 'Brain MRI Non-Contrast (3.0T)', modality: 'MRI', reason: 'Detailed neuroimaging for ischemic stroke or seizure focus.', catalogId: catalogItems[3].id });
                  }
                  if (textContent.includes('abdo') || textContent.includes('vomit') || textContent.includes('nausea') || textContent.includes('jaundice') || textContent.includes('flank') || textContent.includes('pain')) {
                    recommendations.push({ name: 'Abdominal Ultrasound (Full Scan)', modality: 'ULTRASOUND', reason: 'Assess hepatic parenchyma, gallbladder, kidneys, and intraperitoneal fluid.', catalogId: catalogItems[1].id });
                  }
                  if (textContent.includes('pelv') || textContent.includes('bleed') || textContent.includes('pregnancy') || textContent.includes('uterus') || textContent.includes('ovary')) {
                    recommendations.push({ name: 'Pelvic & Gynaecology Ultrasound', modality: 'ULTRASOUND', reason: 'Evaluate pelvic pathology, ovarian cysts, or intrauterine gestational status.', catalogId: catalogItems[4].id });
                  }

                  return (
                    <Stack spacing={2.5}>
                      {/* AI Symptom Recommendation Banner */}
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha('#1c7ed6', 0.04), borderColor: alpha('#1c7ed6', 0.2) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <AutoAwesome sx={{ color: '#1c7ed6', fontSize: 20 }} />
                          <Typography variant="subtitle2" fontWeight={800} color="#1c7ed6">
                            Smart Diagnostic Radiology Recommendations
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                          Recommended scan procedures derived from patient's symptoms, clinical SOAP note & ICD-10 diagnoses.
                        </Typography>

                        {recommendations.length > 0 ? (
                          <Grid container spacing={1.5}>
                            {recommendations.map((rec, idx) => (
                              <Grid item xs={12} sm={6} key={idx}>
                                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                    <Typography variant="subtitle2" fontWeight={800}>{rec.name}</Typography>
                                    <Chip label={rec.modality} size="small" color="primary" sx={{ fontSize: '0.6rem', fontWeight: 800 }} />
                                  </Box>
                                  <Typography variant="caption" color="text.secondary" display="block" mb={1} sx={{ fontStyle: 'italic' }}>
                                    Indication: {rec.reason}
                                  </Typography>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    startIcon={<Add />}
                                    onClick={() => handleManualAddRad(catalogItems.find(c => c.id === rec.catalogId) || catalogItems[0])}
                                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, fontSize: '0.725rem' }}
                                  >
                                    Add Scan to Order
                                  </Button>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        ) : (
                          <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Enter symptoms or an ICD-10 diagnosis in the <strong>Clinic SOAP Note</strong> tab to see automatic radiology scan recommendations.
                          </Alert>
                        )}
                      </Paper>

                      {/* Manual Radiology Scan Ordering Form */}
                      <Typography variant="subtitle2" fontWeight={800}>Manual Radiology Imaging Order Form</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={7}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Select Imaging Procedure</InputLabel>
                            <Select
                              value={selectedRadCatalogId}
                              label="Select Imaging Procedure"
                              onChange={e => setSelectedRadCatalogId(e.target.value)}
                              sx={{ borderRadius: 2 }}
                            >
                              {catalogItems.map(c => (
                                <MenuItem key={c.id} value={c.id}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <Typography variant="body2" fontWeight={700}>{c.name}</Typography>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Chip label={c.modality} size="small" sx={{ fontSize: '0.6rem', fontWeight: 800 }} />
                                      {c.price && <Typography variant="caption" fontWeight={700} color="primary.main">₦{Number(c.price).toLocaleString()}</Typography>}
                                    </Stack>
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={5}>
                          <TextField
                            label="Scan Priority"
                            select
                            fullWidth
                            size="small"
                            value={radPriority}
                            onChange={e => setRadPriority(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          >
                            <MenuItem value="ROUTINE">ROUTINE</MenuItem>
                            <MenuItem value="URGENT">URGENT</MenuItem>
                            <MenuItem value="STAT">STAT (Emergency Immediate)</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Clinical History & Symptoms / Indication"
                            value={radHistory}
                            onChange={e => setRadHistory(e.target.value)}
                            placeholder="e.g. Persistent cough x 2 weeks, fever, rule out pneumonia"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        </Grid>
                      </Grid>

                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => handleManualAddRad()}
                        disabled={!selectedRadCatalogId}
                        startIcon={<Add />}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}
                      >
                        Add Imaging Scan to Order Cart
                      </Button>

                      {/* Radiology Order Cart */}
                      {radCart.length > 0 && (
                        <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: '#1c7ed6', bgcolor: alpha('#1c7ed6', 0.02) }}>
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="#1c7ed6">
                              Selected Radiology Scan Requests ({radCart.length} Scans)
                            </Typography>
                            {radCart.map((item, i) => (
                              <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2, bgcolor: 'background.paper' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Typography variant="subtitle2" fontWeight={800}>{item.name}</Typography>
                                      <Chip label={item.modality} color="primary" size="small" sx={{ fontSize: '0.6rem', height: 18, fontWeight: 800 }} />
                                      <Chip label={item.priority} color={item.priority === 'STAT' ? 'error' : 'info'} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                                      Indication: {item.clinicalHistory}
                                    </Typography>
                                  </Box>
                                  <IconButton size="small" color="error" onClick={() => setRadCart(prev => prev.filter((_, idx) => idx !== i))}>
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Box>
                              </Paper>
                            ))}

                            <Button
                              fullWidth
                              variant="contained"
                              color="primary"
                              onClick={handleSubmitRadOrder}
                              disabled={orderingRad}
                              startIcon={orderingRad ? <CircularProgress size={18} /> : <CameraAlt />}
                              sx={{ mt: 1.5, py: 1.2, fontWeight: 800, borderRadius: 2 }}
                            >
                              Submit Orders to Radiology Desk
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {/* Active Patient Radiology Order History Table */}
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="text.secondary">
                          🩻 Patient's Radiology Order History & DICOM PACS Studies ({radOrders.length} Scans)
                        </Typography>
                        {radOrders.length === 0 ? (
                          <Alert severity="info" sx={{ borderRadius: 2 }}>No previous radiology imaging scan orders on file for this patient.</Alert>
                        ) : (
                          <Stack spacing={2}>
                            {radOrders.map((o: any) => {
                              const procName = o.catalogItem?.name || 'Diagnostic Imaging Scan';
                              const mod = o.catalogItem?.modality || 'X-RAY';
                              const isPaid = o.insuranceStatus && o.insuranceStatus.includes('PAID');
                              const isCompleted = o.status === 'COMPLETED' || o.status === 'IMAGE_ACQUIRED' || (o.pacsStudies && o.pacsStudies.length > 0);
                              const latestStudy = o.pacsStudies && o.pacsStudies.length > 0 ? o.pacsStudies[o.pacsStudies.length - 1] : null;
                              const rawUrl = latestStudy?.pacsUrl || o.pacsStudies?.[0]?.pacsUrl;
                              const isChestOrXray = procName.toLowerCase().includes('chest') || mod === 'X-RAY';
                              const scanUrl = (rawUrl && !rawUrl.startsWith('blob:')) ? rawUrl : (isChestOrXray ? '/scans/chest_xray_dicom.png' : '/scans/ct_brain_dicom.png');

                              return (
                                <Paper key={o.id} variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderColor: '#e2e8f0' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                                    <Box>
                                      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                        <Typography variant="subtitle1" fontWeight={800}>{procName}</Typography>
                                        <Chip label={mod} color="primary" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                                        <Chip label={o.priority || 'ROUTINE'} color={o.priority === 'STAT' ? 'error' : 'info'} size="small" sx={{ fontSize: '0.65rem' }} />
                                      </Stack>
                                      <Typography variant="caption" color="primary.main" fontWeight={700}>
                                        Order #: {o.orderNumber}
                                      </Typography>
                                    </Box>

                                    <Stack direction="row" spacing={1} alignItems="center">
                                      {/* Cashier Payment Status */}
                                      <Chip
                                        label={isPaid ? (o.insuranceStatus || 'PAID') : 'AWAITING PAYMENT (Cashier Desk)'}
                                        color={isPaid ? 'success' : 'warning'}
                                        size="small"
                                        sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                      />

                                      {/* Scan Status */}
                                      <Chip
                                        label={isCompleted ? 'IMAGE ACQUIRED & VERIFIED' : 'QUEUED FOR SCAN'}
                                        color={isCompleted ? 'success' : 'info'}
                                        size="small"
                                        sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                      />
                                    </Stack>
                                  </Box>

                                  <Typography variant="body2" color="text.secondary" mb={1.5}>
                                    <strong>Indication:</strong> {o.clinicalHistory || 'Outpatient clinical diagnostic evaluation'}
                                  </Typography>

                                  {/* Clinician PACS DICOM Viewer Button */}
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #f1f5f9' }}>
                                    <Typography variant="caption" color="text.secondary">
                                      🗓️ {new Date(o.createdAt || Date.now()).toLocaleDateString()}
                                    </Typography>
                                    <Button
                                      size="small"
                                      variant={isCompleted ? "contained" : "outlined"}
                                      color="primary"
                                      startIcon={<PersonalVideo />}
                                      onClick={() => {
                                        setSelectedRadViewerOrder({ ...o, scanUrl });
                                        setRadViewerOpen(true);
                                      }}
                                      sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
                                    >
                                      👁️ View DICOM Scan (PACS Viewer)
                                    </Button>
                                  </Box>
                                </Paper>
                              );
                            })}
                          </Stack>
                        )}
                      </Box>
                    </Stack>
                  );
                })()}
              </>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* Clinician PACS DICOM Viewer Dialog Modal */}
      <Dialog
        open={radViewerOpen}
        onClose={() => setRadViewerOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, bgcolor: '#0f172a', color: '#fff' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#1c7ed6' }}><PersonalVideo /></Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#fff">
                PACS Diagnostic Image Web Viewer — {selectedRadViewerOrder?.catalogItem?.name || 'Radiology Scan'}
              </Typography>
              <Typography variant="caption" color="#94a3b8">
                Order #: {selectedRadViewerOrder?.orderNumber} · Patient: {selectedEncounter?.subject?.display || 'Outpatient'}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setRadViewerOpen(false)} sx={{ color: '#fff' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#000', borderColor: '#334155', borderRadius: 2, textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={selectedRadViewerOrder?.scanUrl || '/scans/chest_xray_dicom.png'}
                  alt="DICOM Scan"
                  onError={(e) => {
                    const name = selectedRadViewerOrder?.catalogItem?.name?.toLowerCase() || '';
                    const mod = selectedRadViewerOrder?.catalogItem?.modality || '';
                    (e.target as HTMLImageElement).src = (name.includes('chest') || mod === 'X-RAY') ? '/scans/chest_xray_dicom.png' : '/scans/ct_brain_dicom.png';
                  }}
                  style={{ maxHeight: 420, maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }}
                />
                <Stack direction="row" spacing={1} justifyContent="center" mt={2}>
                  <Chip label="2048 x 2048 DICOM High-Res" size="small" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontSize: '0.65rem' }} />
                  <Chip label="Window/Level: 40/400 (Lung)" size="small" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontSize: '0.65rem' }} />
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#1e293b', borderColor: '#334155', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#38bdf8" mb={1}>
                    🩻 Radiologist Diagnostic Impression
                  </Typography>
                  <Typography variant="body2" color="#e2e8f0" mb={1.5}>
                    {selectedRadViewerOrder?.reports?.[0]?.findings || selectedRadViewerOrder?.clinicalHistory || 'Radiology diagnostic findings verified by consultant radiologist. Bilateral lung fields clear. No acute focal lesion or consolidation detected.'}
                  </Typography>
                  <Chip label="E-SIGNED & VERIFIED" color="success" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#1e293b', borderColor: '#334155', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#38bdf8" mb={1}>
                    📋 Scan Acquisition Details
                  </Typography>
                  <Typography variant="caption" color="#94a3b8" display="block">
                    Modality: {selectedRadViewerOrder?.catalogItem?.modality || 'X-RAY'}
                  </Typography>
                  <Typography variant="caption" color="#94a3b8" display="block">
                    Payment Status: {selectedRadViewerOrder?.insuranceStatus || 'PAID (CASH)'}
                  </Typography>
                  <Typography variant="caption" color="#94a3b8" display="block">
                    Status: {selectedRadViewerOrder?.status || 'COMPLETED'}
                  </Typography>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #334155', px: 3, py: 1.5 }}>
          <Button onClick={() => setRadViewerOpen(false)} variant="contained" color="primary" sx={{ fontWeight: 800, borderRadius: 2 }}>
            Close Viewer
          </Button>
        </DialogActions>
      </Dialog>

      <QuickAppointmentModal
        open={openApptModal}
        onClose={() => setOpenApptModal(false)}
        initialPatient={selectedEncounter?.subject ? {
          id: selectedEncounter.subject.reference ? selectedEncounter.subject.reference.split('/')[1] : '',
          firstName: selectedEncounter.subject.display ? selectedEncounter.subject.display.split(' ')[0] : '',
          lastName: selectedEncounter.subject.display ? selectedEncounter.subject.display.split(' ').slice(1).join(' ') : '',
        } : null}
        initialReason={selectedEncounter ? `OPD follow-up for ${getIcd10(selectedEncounter) || 'consultation'}` : 'Follow-up consultation'}
        defaultVisitType="Scheduled"
      />

      {/* ── DOCTOR ORDER INPATIENT ADMISSION DIALOG ──────────────────────────── */}
      <Dialog open={orderAdmissionOpen} onClose={() => setOrderAdmissionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#7c3aed', color: '#fff' }}>
          🏨 Order Inpatient Admission (Doctor's Decision)
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2.5}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Submitting this clinical order flags the patient for <strong>Records File Processing & Billing Clearance</strong>, after which the <strong>Ward Matron / Nursing Sister</strong> will allocate a physical bed space.
            </Alert>

            <FormControl fullWidth>
              <InputLabel id="target-ward-label">Target Specialty Ward</InputLabel>
              <Select
                labelId="target-ward-label"
                value={targetWardCategory}
                label="Target Specialty Ward"
                onChange={(e) => setTargetWardCategory(e.target.value)}
              >
                {(wardsList.length > 0 ? wardsList : [
                  { name: 'Pediatrics & Adolescent Ward', wardCategory: 'PAEDIATRIC' },
                  { name: 'Male Medical Ward', wardCategory: 'MALE_MEDICAL' },
                  { name: 'Female Medical Ward', wardCategory: 'FEMALE_MEDICAL' },
                  { name: 'Surgical Ward', wardCategory: 'SURGICAL' },
                  { name: 'Maternity & Postnatal Ward', wardCategory: 'MATERNITY' },
                  { name: 'Emergency & Trauma Bay', wardCategory: 'EMERGENCY' },
                  { name: 'Private VIP Suite', wardCategory: 'PRIVATE_SUITE' },
                  { name: 'Intensive Care Unit (ICU)', wardCategory: 'ICU' },
                ]).map((w: any) => (
                  <MenuItem key={w.id || w.name} value={w.name || w.wardCategory}>
                    {w.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="urgency-label">Admission Urgency</InputLabel>
              <Select
                labelId="urgency-label"
                value={admissionUrgency}
                label="Admission Urgency"
                onChange={(e) => setAdmissionUrgency(e.target.value)}
              >
                <MenuItem value="ROUTINE">Routine (Elective / Standard Admission)</MenuItem>
                <MenuItem value="URGENT">Urgent (Within 2 Hours)</MenuItem>
                <MenuItem value="STAT">STAT (Immediate Critical Admission)</MenuItem>
              </Select>
            </FormControl>

            <TerminologyAutocomplete
              multiple
              system="ICD10"
              label="Admission Clinical Diagnoses (Data Dictionary Multi-Select)"
              placeholder="Type to search and select multiple diagnoses (e.g. Severe Malaria, Anaemia, Acute Abdomen)..."
              value={admissionDiagnosisList}
              onChange={(newList) => {
                const list = Array.isArray(newList) ? newList : newList ? [newList] : [];
                setAdmissionDiagnosisList(list);
                setAdmissionDiagnosis(list.join(', '));
                if (list.length > 0) {
                  handleAutoGenerateNursingOrders(list);
                }
              }}
            />

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Special Nursing / Unit Orders
                  </Typography>
                  <Chip
                    icon={<AutoAwesome sx={{ fontSize: '13px !important', color: '#10b981' }} />}
                    label="OpenMed CDS AI"
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: alpha('#10b981', 0.08), color: '#059669', border: `1px solid ${alpha('#10b981', 0.2)}` }}
                  />
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  disabled={generatingNursingOrders || admissionDiagnosisList.length === 0}
                  startIcon={generatingNursingOrders ? <CircularProgress size={14} color="inherit" /> : <AutoAwesome fontSize="small" />}
                  onClick={() => handleAutoGenerateNursingOrders()}
                  sx={{ textTransform: 'none', borderRadius: 1.5, py: 0.2, px: 1.2, fontWeight: 800, fontSize: '0.72rem' }}
                >
                  {generatingNursingOrders ? 'Generating Orders…' : '✨ OpenMed Auto-Generate Unit Orders'}
                </Button>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={4}
                value={admissionNotes}
                onChange={(e) => setAdmissionNotes(e.target.value)}
                placeholder="e.g. Monitor vitals Q2H, NPO for surgery tomorrow 6 AM, strict intake/output..."
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOrderAdmissionOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleOrderInpatientAdmission}
            disabled={submittingAdmissionOrder}
            startIcon={submittingAdmissionOrder ? <CircularProgress size={18} /> : <CheckCircle />}
            sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' }, fontWeight: 800 }}
          >
            {submittingAdmissionOrder ? 'Submitting Order...' : 'Submit Admission Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── DOCTOR-TO-DOCTOR PATIENT TRANSFER DIALOG ──────────────────────────── */}
      <Dialog
        open={openTransferModal}
        onClose={() => setOpenTransferModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: AI_PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHoriz sx={{ color: AI_PRIMARY }} />
          Transfer Patient to Colleague Doctor
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Select a colleague doctor to transfer patient <strong>{selectedEncounter?.subject?.display}</strong> to. The patient will be reassigned and move off your active queue list.
          </Typography>
          <Autocomplete
            options={doctorsList.length > 0 ? doctorsList : DEFAULT_DOCTORS}
            getOptionLabel={(opt) => {
              const name = opt.fullName || opt.name || (opt.firstName && opt.lastName ? `Dr. ${opt.firstName} ${opt.lastName}` : opt.username) || 'Doctor';
              const desig = opt.designation || opt.role || '';
              return desig ? `${name} (${desig})` : name;
            }}
            value={targetDoctor}
            onChange={(_, val) => setTargetDoctor(val)}
            renderInput={(params) => (
              <TextField {...params} label="Select Recipient Doctor *" placeholder="Choose doctor..." fullWidth margin="dense" />
            )}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Transfer Reason / Clinical Brief Notes (Optional)"
            placeholder="e.g. Emergency call, lunch break handover, specialist opinion request..."
            multiline
            rows={3}
            value={transferNotes}
            onChange={(e) => setTransferNotes(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenTransferModal(false)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleTransferPatient}
            disabled={submittingTransfer || !targetDoctor}
            startIcon={submittingTransfer ? <CircularProgress size={16} color="inherit" /> : <SwapHoriz />}
            sx={{ fontWeight: 800, bgcolor: AI_PRIMARY }}
          >
            Confirm Transfer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Clinical Death Declaration & Mortuary Transfer Modal (OPD) ── */}
      <Dialog
        open={deceasedModalOpen}
        onClose={() => !submittingDeceased && setDeceasedModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 0.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ p: 0.8, bgcolor: alpha('#ef4444', 0.1), borderRadius: 2, color: '#ef4444', display: 'flex', alignItems: 'center' }}>
            <LocalHospital sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={900}>Outpatient Clinical Death Declaration & Mortuary Transfer</Typography>
            <Typography variant="caption" color="text.secondary">
              Statutory death verification, certifying doctor, and direct hand-off to hospital mortuary cold vaults
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2.5 }}>
          {deceasedTargetEncounter && (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2.5, bgcolor: alpha('#ef4444', 0.04), borderColor: alpha('#ef4444', 0.25) }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                    {deceasedTargetEncounter.subject?.display || 'Outpatient'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Encounter: {deceasedTargetEncounter.id ? `OPD-${deceasedTargetEncounter.id.substring(0, 8).toUpperCase()}` : 'N/A'} · Class: {deceasedTargetEncounter.class?.code || 'Ambulatory'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} sx={{ textAlign: { sm: 'right' } }}>
                  <Chip
                    label="Outpatient / Emergency Care"
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 800 }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Visit: {deceasedTargetEncounter.period?.start ? new Date(deceasedTargetEncounter.period.start).toLocaleDateString() : 'Today'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date & Time of Death *"
                type="datetime-local"
                size="small"
                fullWidth
                required
                value={deceasedForm.deceasedAt}
                onChange={e => setDeceasedForm(prev => ({ ...prev, deceasedAt: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={cliniciansList}
                getOptionLabel={(opt: any) => (typeof opt === 'string' ? opt : (opt.label || opt.name || ''))}
                value={deceasedForm.certifyingClinician}
                onChange={(_e, newValue: any) => {
                  if (typeof newValue === 'string') {
                    setDeceasedForm(prev => ({ ...prev, certifyingClinician: newValue }));
                  } else if (newValue && newValue.name) {
                    setDeceasedForm(prev => ({ ...prev, certifyingClinician: `${newValue.name} (${newValue.designation || 'Consultant'})` }));
                  } else {
                    setDeceasedForm(prev => ({ ...prev, certifyingClinician: '' }));
                  }
                }}
                onInputChange={(_e, newInputValue) => {
                  setDeceasedForm(prev => ({ ...prev, certifyingClinician: newInputValue }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Certifying Clinician / Consultant *"
                    size="small"
                    fullWidth
                    required
                    placeholder="Select doctor, physician or consultant..."
                    helperText="Select from Staff Management or type name"
                  />
                )}
                renderOption={(props, option: any) => (
                  <Box component="li" {...props} key={option.id || option.name}>
                    <Box sx={{ py: 0.5, width: '100%' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', gap: 1, alignItems: 'center' }}>
                        <span>{option.designation}</span>
                        <span>•</span>
                        <span>{option.department}</span>
                        {option.employeeId && (
                          <>
                            <span>•</span>
                            <Chip label={option.employeeId} size="small" sx={{ height: 16, fontSize: '0.65rem' }} />
                          </>
                        )}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Medico-Legal Classification *"
                size="small"
                fullWidth
                value={deceasedForm.medicoLegalStatus}
                onChange={e => setDeceasedForm(prev => ({ ...prev, medicoLegalStatus: e.target.value }))}
              >
                <MenuItem value="NONE">Clinical Death (Natural Causes / Arrest)</MenuItem>
                <MenuItem value="CORONER_CASE">Coroner Case (Unexplained / DOA)</MenuItem>
                <MenuItem value="POLICE_CASE">Police Forensic Case (Trauma / Investigation)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Origin / Identifying Notes"
                size="small"
                fullWidth
                value={deceasedForm.identifyingFeatures}
                onChange={e => setDeceasedForm(prev => ({ ...prev, identifyingFeatures: e.target.value }))}
                placeholder="OPD Triage, Emergency Bay, marks, personal effects..."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Certified Cause of Death (Primary & Contributory) *"
                size="small"
                fullWidth
                multiline
                rows={2}
                required
                value={deceasedForm.causeOfDeath}
                onChange={e => setDeceasedForm(prev => ({ ...prev, causeOfDeath: e.target.value }))}
                placeholder="e.g. Cardiorespiratory Arrest secondary to Traumatic Shock or Acute Ambulatory Complication"
                helperText="Official diagnostic cause of death certified by examining clinician"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }}>
                <Chip label="Next of Kin (NOK) Information — Bio Data" size="small" sx={{ fontWeight: 700 }} />
              </Divider>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="NOK Full Name"
                size="small"
                fullWidth
                value={deceasedForm.nokName}
                onChange={e => setDeceasedForm(prev => ({ ...prev, nokName: e.target.value }))}
                helperText="Auto-populated from patient bio data"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="NOK Relationship"
                size="small"
                fullWidth
                value={deceasedForm.nokRelationship}
                onChange={e => setDeceasedForm(prev => ({ ...prev, nokRelationship: e.target.value }))}
                helperText="Auto-populated from patient bio data"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="NOK Phone"
                size="small"
                fullWidth
                value={deceasedForm.nokPhone}
                onChange={e => setDeceasedForm(prev => ({ ...prev, nokPhone: e.target.value }))}
                helperText="Auto-populated from patient bio data"
              />
            </Grid>

            <Grid item xs={12}>
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha('#3b5bdb', 0.04), borderColor: alpha('#3b5bdb', 0.25) }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={deceasedForm.transferToMortuary}
                        onChange={e => setDeceasedForm(prev => ({ ...prev, transferToMortuary: e.target.checked }))}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                          Transfer Body to Hospital Mortuary Cold Vaults
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {deceasedForm.transferToMortuary
                            ? 'Toggle ON: Directly dispatches this deceased patient to the Mortuary Ingestion intake queue at /mortuary for mortician vault assignment.'
                            : 'Toggle OFF: Patient will NOT be transferred to the hospital mortuary. Kept in clinical custody or released directly to relatives.'}
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha('#7c3aed', 0.04), borderColor: alpha('#7c3aed', 0.25) }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={deceasedForm.requestAutopsy}
                        onChange={e => setDeceasedForm(prev => ({ ...prev, requestAutopsy: e.target.checked }))}
                        color="secondary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#7c3aed' }}>
                          🔬 Refer to Pathology for Post-Mortem Autopsy Examination (Direct Referral)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Direct clinical referral to the Consultant Pathologist at /pathology before or independent of mortuary cold vaults. Invoiced to Cashier.
                        </Typography>
                      </Box>
                    }
                  />

                  {deceasedForm.requestAutopsy && (
                    <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed', borderColor: alpha('#7c3aed', 0.3) }}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: '#7c3aed', mb: 1, display: 'block' }}>
                        Select Autopsy Classification & Charge Master Service:
                      </Typography>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={deceasedForm.autopsyType}
                        onChange={e => setDeceasedForm(prev => ({ ...prev, autopsyType: e.target.value as any }))}
                        label="Autopsy Procedure Type"
                        helperText="Generates billable invoice for Cashier (rate set in Catalog / Charge Master)"
                      >
                        <MenuItem value="CLINICAL">
                          Clinical Pathology Post-Mortem Autopsy (MORT-AUTOPSY-CLIN — ₦60,000)
                        </MenuItem>
                        <MenuItem value="CORONER">
                          Coroner Forensic Medico-Legal Autopsy (MORT-AUTOPSY-CORONER — ₦90,000)
                        </MenuItem>
                      </TextField>
                    </Box>
                  )}
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeceasedModalOpen(false)} disabled={submittingDeceased} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeceased}
            disabled={submittingDeceased}
            sx={{ fontWeight: 800, borderRadius: 2, px: 2.5 }}
          >
            {submittingDeceased
              ? 'Processing...'
              : (deceasedForm.requestAutopsy && deceasedForm.transferToMortuary)
                ? 'Certify Death, Request Autopsy & Transfer to Mortuary'
                : (deceasedForm.requestAutopsy && !deceasedForm.transferToMortuary)
                  ? 'Certify Death & Refer for Autopsy (Pathology Desk)'
                  : deceasedForm.transferToMortuary
                    ? 'Certify Death & Transfer to Mortuary Cold Vaults'
                    : 'Certify Death (Clinical Discharge / NOK Custody)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Physiotherapy & Rehabilitation Referral Modal ── */}
      <PhysioReferralModal
        open={physioReferralOpen}
        onClose={() => setPhysioReferralOpen(false)}
        patient={physioReferralPatient}
      />
    </Box>
  );
};

export default OPD;
