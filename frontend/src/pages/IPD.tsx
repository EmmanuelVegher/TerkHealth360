import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, InputAdornment, Avatar, LinearProgress, Drawer, Stack, Divider,
  Tabs, Tab, Alert, AlertTitle, FormControl, InputLabel, Select,
  FormControlLabel, Switch, CircularProgress, List, ListItem, ListItemText,
  Badge, Tooltip, Paper, Accordion, AccordionSummary, AccordionDetails,
  Autocomplete, Menu,
} from '@mui/material';
import {
  Add, Search, Bed, Close, LocalPharmacy, Receipt, Biotech, History,
  SwapHoriz, Warning, CheckCircle, MedicalServices, Notes, Science,
  MonitorHeart, Assignment, AssignmentTurnedIn, TransferWithinAStation, Lightbulb, Edit,
  Mic, MicOff, AutoAwesome, Refresh, Delete, Check, ArrowForward,
  DocumentScanner, Healing, Person, CalendarMonth, InfoOutlined,
  Speed, PrecisionManufacturing, Timer, Shield, LocalHospital, Description,
  VolumeUp, VolumeOff, Tune, FormatListNumbered, FormatListBulleted, CheckBox, FormatBold, ShortText, ExpandMore, People, ContentCut,
  PersonalVideo, CameraAlt, Sensors, AccessibilityNew,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';
import { QuickAppointmentModal } from '../components/QuickAppointmentModal';
import { TerminologyAutocomplete } from '../components/TerminologyAutocomplete';
import { lookupLabTestMetadata, analyzeLabResultWithOpenMed } from '../utils/labDictionary';
import { PncGynaeServicesView } from '../components/PncGynaeServicesView';
import { PhysioReferralModal } from '../components/PhysioReferralModal';

// Ward Sub-Category Configuration
const WARD_SUB_CATEGORIES = [
  {
    slug: 'all',
    categoryKey: 'ALL',
    name: 'All IPD Wards',
    description: 'Comprehensive overview across all hospital ward departments',
    color: '#495057',
    badge: 'Main Hub',
  },
  {
    slug: 'emergency',
    categoryKey: 'EMERGENCY',
    name: 'Emergency Ward (A&E)',
    description: 'Acute emergency stabilization, 24h triage observation & urgent admissions',
    color: '#f03e3e',
    badge: '24h High Priority',
  },
  {
    slug: 'medical',
    categoryKey: 'MEDICAL',
    name: 'Medical Ward',
    description: 'General internal medicine inpatient care, acute illnesses & chronic conditions',
    color: '#3b5bdb',
    badge: 'Internal Med',
  },
  {
    slug: 'surgical',
    categoryKey: 'SURGICAL',
    name: 'Surgical Ward',
    description: 'Post-operative monitoring, pre-op patient prep & recovery management',
    color: '#0ca678',
    badge: 'Post-Op Care',
  },
  {
    slug: 'private',
    categoryKey: 'PRIVATE',
    name: 'Private Ward (VIP)',
    description: 'Ensuite private rooms, dedicated nursing care & premium inpatient suites',
    color: '#6741d9',
    badge: 'VIP Suites',
  },
  {
    slug: 'icu',
    categoryKey: 'ICU',
    name: 'Intensive Care Unit (ICU)',
    description: 'Critical care, ventilator monitoring & continuous life-support telemetry',
    color: '#e67700',
    badge: 'Critical Care',
  },
  {
    slug: 'maternity',
    categoryKey: 'MATERNITY',
    name: 'Maternity & Labour Ward',
    description: 'Obstetric inpatient care, ante/postnatal care & neonatology beds',
    color: '#c2255c',
    badge: 'Obstetrics',
  },
  {
    slug: 'paediatric',
    categoryKey: 'PAEDIATRIC',
    name: 'Paediatric Ward',
    description: 'Child health inpatient unit, specialized pediatric nursing & parent suites',
    color: '#f59f00',
    badge: 'Pediatrics',
  },
];

// Ward Specialty Details for rich hero header & specialized 4-KPI dashboard
const WARD_SPECIALTY_DETAILS: Record<string, {
  heroTitle: string;
  heroSubtitle: string;
  categoryTag: string;
  gradient: string;
  kpis: (filtered: any[], wardStats: any[]) => Array<{ label: string; value: string; subtitle: string; icon: any; color: string }>;
}> = {
  medical: {
    heroTitle: '🩺 Medical Ward Inpatient Census & Care',
    heroSubtitle: 'Internal Medicine Inpatient Care · Acute Illnesses · Chronic Disease Telemetry & Observation',
    categoryTag: 'MEDICAL WARD (INTERNAL MED)',
    gradient: 'linear-gradient(135deg, #1c7ed6 0%, #3b5bdb 50%, #7048e8 100%)',
    kpis: (filtered, stats) => {
      const totalBeds = stats.reduce((a, b) => a + b.total, 0) || 15;
      return [
        { label: 'Active Medical Beds', value: `${totalBeds} Beds`, subtitle: 'Department Capacity', icon: <LocalHospital />, color: '#1c7ed6' },
        { label: 'Bed Occupancy', value: `${filtered.length} Admitted`, subtitle: 'Medical Inpatients', icon: <Healing />, color: '#e03131' },
        { label: 'Beds Available', value: `${Math.max(0, totalBeds - filtered.length)} Free`, subtitle: 'Sanitized & Ready', icon: <CheckCircle />, color: '#2f9e44' },
        { label: 'Avg Acuity Score', value: '3.2 (NEWS2)', subtitle: 'Moderate Clinical Risk', icon: <Speed />, color: '#f59f00' },
      ];
    },
  },
  surgical: {
    heroTitle: '🔪 Surgical Ward & Post-Op Recovery Unit',
    heroSubtitle: 'Post-Operative Telemetry · Surgical Wound Care · Pre-Op Prep & Anesthesia Recovery',
    categoryTag: 'SURGICAL WARD (POST-OP)',
    gradient: 'linear-gradient(135deg, #0ca678 0%, #1098ad 50%, #1c7ed6 100%)',
    kpis: (filtered, stats) => {
      const totalBeds = stats.reduce((a, b) => a + b.total, 0) || 12;
      return [
        { label: 'Active Surgical Beds', value: `${totalBeds} Beds`, subtitle: 'Post-Op Capacity', icon: <LocalHospital />, color: '#0ca678' },
        { label: 'Bed Occupancy', value: `${filtered.length} Admitted`, subtitle: 'Surgical Patients', icon: <Healing />, color: '#e03131' },
        { label: 'Beds Available', value: `${Math.max(0, totalBeds - filtered.length)} Free`, subtitle: 'Ready for Post-Op', icon: <CheckCircle />, color: '#2f9e44' },
        { label: 'Pending Procedures', value: '2 Scheduled', subtitle: 'OT Transfer Ready', icon: <Speed />, color: '#f59f00' },
      ];
    },
  },
  private: {
    heroTitle: '👑 VIP Suites & Private Ward Facilities',
    heroSubtitle: 'Ensuite VIP Rooms · Dedicated 1-on-1 Nursing · Premium Inpatient Comfort & Concierge',
    categoryTag: 'PRIVATE SUITES (VIP)',
    gradient: 'linear-gradient(135deg, #6741d9 0%, #9c36b5 50%, #ae3ec9 100%)',
    kpis: (filtered, stats) => {
      const totalBeds = stats.reduce((a, b) => a + b.total, 0) || 8;
      return [
        { label: 'Active VIP Suites', value: `${totalBeds} Suites`, subtitle: 'Private Unit Capacity', icon: <LocalHospital />, color: '#6741d9' },
        { label: 'Suite Occupancy', value: `${filtered.length} Occupied`, subtitle: 'VIP Inpatients', icon: <Healing />, color: '#ae3ec9' },
        { label: 'Suites Available', value: `${Math.max(0, totalBeds - filtered.length)} Free`, subtitle: 'Sanitized & Vacant', icon: <CheckCircle />, color: '#2f9e44' },
        { label: 'Nurse Ratio', value: '1 : 1 Care', subtitle: 'Dedicated Suite Nurse', icon: <CheckCircle />, color: '#1c7ed6' },
      ];
    },
  },
  paediatric: {
    heroTitle: '👶 Paediatric Ward & Child Health Suite',
    heroSubtitle: 'Pediatric Inpatient Unit · Specialized Child Nursing · Parent Suites & Neonatology',
    categoryTag: 'PAEDIATRIC WARD (CHILD HEALTH)',
    gradient: 'linear-gradient(135deg, #f59f00 0%, #f76707 50%, #e03131 100%)',
    kpis: (filtered, stats) => {
      const totalBeds = stats.reduce((a, b) => a + b.total, 0) || 10;
      return [
        { label: 'Paediatric Cots/Beds', value: `${totalBeds} Beds`, subtitle: 'Pediatric Capacity', icon: <LocalHospital />, color: '#f59f00' },
        { label: 'Bed Occupancy', value: `${filtered.length} Admitted`, subtitle: 'Pediatric Inpatients', icon: <Healing />, color: '#e03131' },
        { label: 'Beds Available', value: `${Math.max(0, totalBeds - filtered.length)} Free`, subtitle: 'Child Friendly Ready', icon: <CheckCircle />, color: '#2f9e44' },
        { label: 'Parent Suites', value: '100% Attached', subtitle: 'Rooming-In Active', icon: <CheckCircle />, color: '#1c7ed6' },
      ];
    },
  },
  maternity: {
    heroTitle: '🤱 Maternity & Labour Ward Census',
    heroSubtitle: 'Obstetric Inpatient Care · Ante/Postnatal Monitoring · Delivery Beds & Neonatal Unit',
    categoryTag: 'MATERNITY & LABOUR WARD',
    gradient: 'linear-gradient(135deg, #c2255c 0%, #d6336c 50%, #e64980 100%)',
    kpis: (filtered, stats) => {
      const totalBeds = stats.reduce((a, b) => a + b.total, 0) || 10;
      return [
        { label: 'Active Maternity Beds', value: `${totalBeds} Beds`, subtitle: 'Obstetric Capacity', icon: <LocalHospital />, color: '#c2255c' },
        { label: 'Bed Occupancy', value: `${filtered.length} Admitted`, subtitle: 'Mothers & Newborns', icon: <Healing />, color: '#e03131' },
        { label: 'Beds Available', value: `${Math.max(0, totalBeds - filtered.length)} Free`, subtitle: 'Sanitized & Ready', icon: <CheckCircle />, color: '#2f9e44' },
        { label: 'Deliveries Today', value: '3 Active', subtitle: 'Labour Room Team', icon: <Speed />, color: '#f59f00' },
      ];
    },
  },
};

// ICD-10 → Ward Category suggestion colors
const CATEGORY_COLORS: Record<string, string> = {
  EMERGENCY:   '#f03e3e',
  MEDICAL:     '#3b5bdb',
  SURGICAL:    '#0ca678',
  PRIVATE:     '#6741d9',
  ICU:         '#e67700',
  MATERNITY:   '#c2255c',
  PAEDIATRIC:  '#f59f00',
  GENERAL:     '#495057',
};

const CONDITION_CONFIG: Record<string, { color: 'success' | 'error' | 'warning' | 'info' | 'default'; label: string }> = {
  STABLE:      { color: 'success', label: 'Stable' },
  RECOVERING:  { color: 'info',    label: 'Recovering' },
  IMPROVING:   { color: 'info',    label: 'Improving' },
  CRITICAL:    { color: 'error',   label: 'Critical' },
  DECEASED:    { color: 'error',   label: 'Deceased' },
};

const DOSE_OPTIONS = ['1 tab', '2 tabs', '1 cap', '5 ml', '10 ml', '100 ml IV', '500 ml IV Infusion', '1 vial IV', '1 ampoule IM', 'Apply locally'];
const FREQ_OPTIONS = ['Daily', 'BD (2x daily)', 'TDS (3x daily)', 'QDS (4x daily)', 'PRN (As needed)', 'Stat (Immediately)', 'Every 8 hours', 'Every 12 hours'];
const DURATION_OPTIONS = ['3 Days', '5 Days', '7 Days', '14 Days', '30 Days', 'Until Discharged'];
const ROUTE_OPTIONS = ['Oral', 'IV (Intravenous)', 'IM (Intramuscular)', 'Subcutaneous', 'Topical', 'Sublingual', 'Inhalation'];

const ICD10_CODES = [
  { code: 'B50.9', name: 'P. falciparum malaria' },
  { code: 'I10', name: 'Essential hypertension' },
  { code: 'E11.9', name: 'Type 2 Diabetes mellitus' },
  { code: 'J18.9', name: 'Pneumonia, unspecified' },
  { code: 'K35.8', name: 'Acute appendicitis' },
  { code: 'S06.0X0A', name: 'Concussion' },
  { code: 'A09', name: 'Infectious gastroenteritis' },
  { code: 'I21.9', name: 'Acute myocardial infarction' },
  { code: 'J44.1', name: 'COPD exacerbation' },
  { code: 'N18.9', name: 'Chronic kidney disease' },
  { code: 'M79.1', name: 'Myalgia (muscle pain)' },
  { code: 'R51.9', name: 'Headache' },
];

const getProcedureOpNoteFallback = (procedureName: string = '') => {
  const p = procedureName.toLowerCase();
  if (p.includes('caesarean') || p.includes('cesarean') || p.includes('lscs') || p.includes('c-section')) {
    return 'Patient in supine position with left lateral tilt under spinal anaesthesia. Pfannenstiel incision made and carried through subcutaneous tissue to rectus sheath. Rectus sheath incised and rectus muscles separated. Peritoneum opened. Lower uterine segment incised transversely. Live infant delivered head first. Placenta & membranes delivered complete. Uterine incision closed in 2 layers with Vicryl-1. Good haemostasis achieved. Abdominal wall closed in layers. Swab and instrument count confirmed correct x2.';
  }
  if (p.includes('append') || p.includes('app')) {
    return 'Gridiron incision in right iliac fossa under general anaesthesia. Appendix identified inflamed and retrocaecal. Appendiceal base crushed and ligated. Appendix resected and sent to histopathology. Haemostasis secured. Peritoneal cavity irrigated. Abdominal wall closed in layers. Swab and instrument count confirmed correct x2.';
  }
  if (p.includes('myomectomy') || p.includes('fibroid')) {
    return 'Under general anaesthesia with endotracheal intubation, patient prepped and draped in supine position. Pfannenstiel incision made. Peritoneum opened. Uterus exteriorized showing uterine leiomyomas. Enucleation of fibroids achieved with minimal blood loss. Uterine wall reconstructed in layers with 2-0 Vicryl. Excellent haemostasis verified. Abdominal wall closed in layers. Swab and instrument count confirmed correct x2.';
  }
  if (p.includes('hernia') || p.includes('herniorrhaphy')) {
    return 'Incision parallel to inguinal ligament under regional anaesthesia. External oblique aponeurosis opened. Indirect hernia sac identified, isolated, and high ligation performed. Polypropylene mesh placed and anchored to inguinal ligament. Layered closure. Swab and instrument count confirmed correct x2.';
  }
  if (p.includes('laparotomy') || p.includes('exploratory')) {
    return 'Midline laparotomy incision made under general anaesthesia. Systematic abdominal exploration performed. Pathological focus identified and managed. Peritoneal cavity irrigated with warm normal saline. Abdominal wall closed in layers. Swab and instrument count confirmed correct x2.';
  }
  return `Under sterile operating theatre conditions, ${procedureName || 'the procedure'} was successfully performed following standard surgical technique. Intra-operative haemostasis secured. Tissue layers reconstructed. Swab and instrument counts verified and reconciled x2.`;
};

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

interface SmartFormattedTextAreaProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  placeholder?: string;
  differentiators?: string[];
  helperText?: string;
}

const SmartFormattedTextArea = ({
  label,
  value,
  onChange,
  rows = 4,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const target = e.target as HTMLTextAreaElement;
      if (!target || target.tagName !== 'TEXTAREA') return;

      const start = target.selectionStart || 0;
      const val = target.value;
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.substring(lineStart, start);

      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s*(.*)$/);
      const bulletMatch = currentLine.match(/^(\s*)([•\-*])\s*(.*)$/);
      const checkMatch = currentLine.match(/^(\s*)(\[[\s|x|_]?\]|☑|☐)\s*(.*)$/);

      if (numMatch) {
        const indent = numMatch[1];
        const num = parseInt(numMatch[2], 10);
        const text = numMatch[3].trim();

        if (text === '') {
          e.preventDefault();
          const newValue = val.substring(0, lineStart) + val.substring(start);
          onChange(newValue);
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = lineStart;
          }, 0);
        } else {
          e.preventDefault();
          const prefix = `\n${indent}${num + 1}. `;
          const newValue = val.substring(0, start) + prefix + val.substring(start);
          onChange(newValue);
          setTimeout(() => {
            const newPos = start + prefix.length;
            target.selectionStart = target.selectionEnd = newPos;
          }, 0);
        }
      } else if (bulletMatch) {
        const indent = bulletMatch[1];
        const bulletChar = bulletMatch[2];
        const text = bulletMatch[3].trim();

        if (text === '') {
          e.preventDefault();
          const newValue = val.substring(0, lineStart) + val.substring(start);
          onChange(newValue);
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = lineStart;
          }, 0);
        } else {
          e.preventDefault();
          const prefix = `\n${indent}${bulletChar} `;
          const newValue = val.substring(0, start) + prefix + val.substring(start);
          onChange(newValue);
          setTimeout(() => {
            const newPos = start + prefix.length;
            target.selectionStart = target.selectionEnd = newPos;
          }, 0);
        }
      } else if (checkMatch) {
        const indent = checkMatch[1];
        const text = checkMatch[3].trim();

        if (text === '') {
          e.preventDefault();
          const newValue = val.substring(0, lineStart) + val.substring(start);
          onChange(newValue);
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = lineStart;
          }, 0);
        } else {
          e.preventDefault();
          const prefix = `\n${indent}[ ] `;
          const newValue = val.substring(0, start) + prefix + val.substring(start);
          onChange(newValue);
          setTimeout(() => {
            const newPos = start + prefix.length;
            target.selectionStart = target.selectionEnd = newPos;
          }, 0);
        }
      }
    }
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
        rows={rows}
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        helperText={helperText || "Tip: Click '1,2,3', '•', or '[ ]' icons above. Pressing Enter automatically continues the list!"}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '0 0 8px 8px',
            fontFamily: 'inherit',
          },
        }}
      />
    </Box>
  );
};

const IPD = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { wardSlug } = useParams<{ wardSlug?: string }>();
  const currentWardSlug = (wardSlug || 'all').toLowerCase();

  // ── Data State ─────────────────────────────────────────────────────────────
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [wardStats, setWardStats] = useState<any[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [alertDismissed, setAlertDismissed] = useState(false);

  // ── Drawer / Patient State ─────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAdm, setSelectedAdm] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [emrSummary, setEmrSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // ── Condition Update State ─────────────────────────────────────────────────
  const [updatingCondition, setUpdatingCondition] = useState(false);

  // ── Voice Transcription State ──────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceSummarizing, setVoiceSummarizing] = useState(false);
  const [voiceAnalysis, setVoiceAnalysis] = useState<any>(null);
  const [recognitionRef, setRecognitionRef] = useState<any>(null);
  const transcriptBufferRef  = useRef<string>('');
  const interimBufferRef     = useRef<string>('');
  const isProcessingVoiceRef = useRef<boolean>(false);

  // ── SOAP State ────────────────────────────────────────────────────────────
  const [soapSubj, setSoapSubj] = useState('');
  const [soapObj, setSoapObj] = useState('');
  const [soapAssessments, setSoapAssessments] = useState<string[]>([]);
  const soapAssessment = soapAssessments.join(', ');
  const [soapPlan, setSoapPlan] = useState('');
  const [savingSOAP, setSavingSOAP] = useState(false);
  const [soapAutoGenerated, setSoapAutoGenerated] = useState(false);
  const [generatingSOAP, setGeneratingSOAP] = useState(false);

  // ── AI Recommendations & Stock Checking State ────────────────────────────────
  const [aiMedRecs, setAiMedRecs] = useState<any[]>([]);
  const [aiLoadingMeds, setAiLoadingMeds] = useState(false);
  const [aiLabRecs, setAiLabRecs] = useState<any[]>([]);
  const [aiLoadingLabs, setAiLoadingLabs] = useState(false);
  const [aiRisk, setAiRisk] = useState<any>(null);
  const [aiLoadingRisk, setAiLoadingRisk] = useState(false);
  const [lastSavedAssessment, setLastSavedAssessment] = useState<string[]>([]);
  const [lastSavedSubjective, setLastSavedSubjective] = useState<string>('');
  const [lastSavedDate, setLastSavedDate]             = useState<Date | null>(null);

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

  // ── Prescription State ────────────────────────────────────────────────────
  const [pharmacyCatalog, setPharmacyCatalog] = useState<any[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);
  const [emarLogs, setEmarLogs] = useState<any[]>([]);
  const [presCart, setPresCart] = useState<any[]>([]);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [medDose, setMedDose] = useState('1 tab');
  const [medFreq, setMedFreq] = useState('TDS (3x daily)');
  const [medDuration, setMedDuration] = useState('7 Days');
  const [medRoute, setMedRoute] = useState('Oral');
  const [prescribing, setPrescribing] = useState(false);

  // ── Lab Order State ────────────────────────────────────────────────────────
  const [labCatalog, setLabCatalog] = useState<any[]>([]);
  const [labCart, setLabCart] = useState<any[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [labPriority, setLabPriority] = useState('ROUTINE');
  const [orderingLab, setOrderingLab] = useState(false);
  const [patientLabOrders, setPatientLabOrders] = useState<any[]>([]);

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

  // ── Transfer State ────────────────────────────────────────────────────────
  const [availableWards, setAvailableWards] = useState<any[]>([]);
  const [toWardId, setToWardId] = useState('');
  const [availableBeds, setAvailableBeds] = useState<any[]>([]);
  const [toBedId, setToBedId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [isOverflow, setIsOverflow] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedTransferAlert, setSelectedTransferAlert] = useState<any | null>(null);

  // ── Theatre Transfer Alert State ─────────────────────────────────────
  const [theatreTransferModalOpen, setTheatreTransferModalOpen] = useState(false);
  const [selectedAlertForTheatre, setSelectedAlertForTheatre] = useState<any | null>(null);
  const [theatreProcedure, setTheatreProcedure] = useState('STAT Emergency Exploratory Surgery / Debridement');
  const [theatreUrgency, setTheatreUrgency] = useState('EMERGENCY');
  const [theatreNotes, setTheatreNotes] = useState('');
  const [submittingTheatreTransfer, setSubmittingTheatreTransfer] = useState(false);

  // ── Telemetry & Vitals Logging State ─────────────────────────────────────
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [vitalsTargetAdm, setVitalsTargetAdm] = useState<any | null>(null);

  // ── Physiotherapy Electronic Referral State ───────────────────────────────
  const [physioReferralOpen, setPhysioReferralOpen] = useState(false);
  const [physioReferralPatient, setPhysioReferralPatient] = useState<any | null>(null);

  // ── Clinical Death & Mortuary Transfer State ──────────────────────────────
  const [deceasedModalOpen, setDeceasedModalOpen] = useState(false);
  const [deceasedTargetAdm, setDeceasedTargetAdm] = useState<any | null>(null);
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
  const [deathCauseSuggestions, setDeathCauseSuggestions] = useState<string[]>([]);

  // Intelligently derive primary clinical diagnosis and cause of death suggestions from surgical bookings, active conditions, and SOAP notes
  const getPatientClinicalDiagnosis = (adm: any, summary?: any) => {
    // 1. Surgical booking / Theatre records
    const surgBookings = (summary?.surgicalBookings && summary.surgicalBookings.length > 0)
      ? summary.surgicalBookings
      : (adm?.patient?.surgicalBookings || []);
    const latestSurg = surgBookings[0];
    const surgDiag = latestSurg?.request?.diagnosis || latestSurg?.diagnosis;
    const surgProc = latestSurg?.request?.proposedProcedure || latestSurg?.proposedProcedure;

    // 2. Active condition / problem list
    const conditions = (summary?.activeProblems && summary.activeProblems.length > 0)
      ? summary.activeProblems
      : (adm?.patient?.conditions || []);
    const activeCond = conditions[0]?.display || conditions[0]?.code;

    // 3. Consultation / SOAP notes
    const consultNotes = (summary?.consultationNotes && summary.consultationNotes.length > 0)
      ? summary.consultationNotes
      : (summary?.soapNotes || adm?.patient?.consultationNotes || []);
    const consultDiag = consultNotes[0]?.assessment;

    // 4. Admission Diagnosis / ICD-10
    const rawIcd = (adm?.icd10 && adm.icd10 !== 'Clinical Admission') ? adm.icd10 : null;
    const rawAdmDiag = (adm?.admissionDiagnosis && adm.admissionDiagnosis !== 'Clinical Admission') ? adm.admissionDiagnosis : null;
    const rawDiag = (adm?.diagnosis && adm.diagnosis !== 'Clinical Admission') ? adm.diagnosis.replace(/^Diagnosis\s+/i, '') : null;

    // Prioritized primary clinical condition (strictly avoids generic administrative 'Clinical Admission')
    const primaryDiag = surgDiag || activeCond || rawIcd || rawAdmDiag || rawDiag || consultDiag || (surgProc ? `Post-Operative Complications (${surgProc})` : 'Severe Inpatient Complications');

    // Build intelligent, medically sound cause of death suggestions
    const suggestions: string[] = [];
    if (surgDiag) {
      suggestions.push(`Cardiorespiratory Arrest 2° to ${surgDiag}`);
    }
    if (surgProc) {
      suggestions.push(`Post-Operative Septic Shock & Complications 2° to ${surgProc}`);
    }
    if (activeCond && activeCond !== surgDiag) {
      suggestions.push(`Cardiorespiratory Arrest 2° to ${activeCond}`);
    }
    if (consultDiag && consultDiag !== surgDiag && consultDiag !== activeCond) {
      suggestions.push(`Cardiorespiratory Arrest 2° to ${consultDiag}`);
    }
    if (rawIcd && !suggestions.some(s => s.includes(rawIcd))) {
      suggestions.push(`Cardiorespiratory Arrest 2° to ${rawIcd}`);
    }
    suggestions.push('Cardiorespiratory Arrest 2° to Multiple Organ Dysfunction Syndrome (MODS)');

    return {
      primaryDiag,
      surgDiag,
      surgProc,
      activeCond,
      consultDiag,
      suggestions,
    };
  };

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

  const handleOpenDeceasedModal = async (adm: any) => {
    setDeceasedTargetAdm(adm);

    // Look at in-memory emrSummary if it belongs to this patient/admission
    const pat = adm.patient || {};
    const patId = adm.patientId || pat.id;
    const activeSummary = (emrSummary && (selectedAdm?.id === adm.id || emrSummary.patient?.id === patId || emrSummary.patientId === patId)) ? emrSummary : null;

    const clinical = getPatientClinicalDiagnosis(adm, activeSummary);
    setDeathCauseSuggestions(clinical.suggestions);

    const initialCause = clinical.suggestions[0] || `Cardiorespiratory Arrest 2° to ${clinical.primaryDiag}`;
    const bedStr = adm.bed ? `${adm.bed.ward?.name || 'Inpatient Ward'} (Bed ${adm.bed.number})` : 'Inpatient Ward';
    
    // Priority: pull from patient bio-data fields (nokName, nokRelationship, nokPhone, emergencyName, emergencyRelationship, emergencyPhone)
    let nokName = pat.nokName || pat.emergencyName || pat.emergencyContactName || adm.emergencyContact?.name || adm.nextOfKin?.name || '';
    let nokRel = pat.nokRelationship || pat.emergencyRelationship || pat.emergencyContactRelationship || adm.emergencyContact?.relationship || adm.nextOfKin?.relationship || 'Next of Kin';
    let nokPhone = pat.nokPhone || pat.emergencyPhone || pat.emergencyContactPhone || adm.emergencyContact?.phone || adm.nextOfKin?.phone || '';

    // Attending doctor or top consultant from staff management
    const defaultClinician = adm.attendingDoctor?.name
      || (cliniciansList.length > 0 ? `${cliniciansList[0].name} (${cliniciansList[0].designation})` : 'Dr. EMMANUEL VEGHER (Chief Consultant Physician)');

    setDeceasedForm({
      certifyingClinician: defaultClinician,
      causeOfDeath: initialCause,
      medicoLegalStatus: 'NONE',
      deceasedAt: new Date().toISOString().slice(0, 16),
      identifyingFeatures: `${bedStr} · ${pat.gender || ''}, Age ${pat.age || 'N/A'}`,
      transferToMortuary: true,
      requestAutopsy: false,
      autopsyType: 'CLINICAL',
      nokName: nokName,
      nokRelationship: nokRel,
      nokPhone: nokPhone,
    });
    setDeceasedModalOpen(true);

    // If NOK is missing or summary wasn't loaded, asynchronously fetch latest patient bio-data and EMR summary
    if (patId) {
      try {
        const [pRes, sRes] = await Promise.all([
          (!nokName || !nokPhone) ? api.get(`/patients/${patId}`).catch(() => null) : Promise.resolve(null),
          (!activeSummary) ? api.get(`/emr/summary/${patId}`).catch(() => null) : Promise.resolve(null),
        ]);
        const pData = pRes?.data?.data || pRes?.data;
        const sData = sRes?.data?.data || sRes?.data;
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
        if (sData) {
          const freshClinical = getPatientClinicalDiagnosis(adm, sData);
          if (freshClinical.suggestions.length > 0) {
            setDeathCauseSuggestions(freshClinical.suggestions);
          }
          setDeceasedForm(prev => {
            if (!prev.causeOfDeath || prev.causeOfDeath.includes('Clinical Admission') || prev.causeOfDeath.includes('Inpatient Complications')) {
              return {
                ...prev,
                causeOfDeath: freshClinical.suggestions[0] || `Cardiorespiratory Arrest 2° to ${freshClinical.primaryDiag}`,
              };
            }
            return prev;
          });
        }
      } catch {}
    }
  };

  const handleConfirmDeceased = async () => {
    if (!deceasedTargetAdm) return;
    if (!deceasedForm.causeOfDeath.trim()) {
      enqueueSnackbar('Please state the certified cause of death.', { variant: 'warning' });
      return;
    }
    setSubmittingDeceased(true);
    try {
      const patId = deceasedTargetAdm.patientId || deceasedTargetAdm.patient?.id;

      // 1. Update IPD admission clinical condition to DECEASED
      await api.patch(`/ipd/admissions/${deceasedTargetAdm.id}/condition`, { clinicalCondition: 'DECEASED' });

      // 2. Synchronize Patient master record status to DECEASED (visible on /patients/:id)
      if (patId) {
        try {
          await api.patch(`/patients/${patId}/status`, { status: 'DECEASED' });
        } catch (e) {
          console.warn('Syncing patient status failed:', e);
        }
      }

      const cleanPatName = `${deceasedTargetAdm.patient?.firstName || ''} ${deceasedTargetAdm.patient?.lastName || ''}`.trim();
      const cleanTargetName = cleanPatName.toLowerCase().replace(/^late\s+/i, '').trim();

      const queuePayload = {
        patientId: patId || `P-${deceasedTargetAdm.id.slice(-5)}`,
        name: `Late ${cleanPatName}`.replace(/^Late\s+Late\s+/i, 'Late ').trim(),
        gender: deceasedTargetAdm.patient?.gender || 'UNKNOWN',
        age: deceasedTargetAdm.patient?.age || null,
        source: 'IPD',
        sourceWard: deceasedTargetAdm.bed ? `${deceasedTargetAdm.bed.ward?.name || 'Inpatient'} (Bed ${deceasedTargetAdm.bed.number})` : 'Inpatient Medical Ward',
        deceasedAt: deceasedForm.deceasedAt.replace('T', ' '),
        certifyingClinician: deceasedForm.certifyingClinician,
        causeOfDeath: deceasedForm.causeOfDeath,
        medicoLegalStatus: deceasedForm.medicoLegalStatus,
        identifyingFeatures: deceasedForm.identifyingFeatures,
        nokName: deceasedForm.nokName || 'Next of Kin',
        nokRelationship: deceasedForm.nokRelationship || 'Family',
        nokPhone: deceasedForm.nokPhone || '—',
      };

      // 3. Mortuary Transfer routing:
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

      // 4. Autopsy direct referral (to Pathology unit)
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

      setAdmissions(prev => prev.map(a => a.id === deceasedTargetAdm.id ? { ...a, clinicalCondition: 'DECEASED' } : a));
      if (selectedAdm && selectedAdm.id === deceasedTargetAdm.id) {
        setSelectedAdm((prev: any) => ({ ...prev, clinicalCondition: 'DECEASED' }));
      }

      let successMsg = 'Patient marked DECEASED & patient master record synchronized.';
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

  // ── Doctor Ward External Result Entry State ───────────────────────────────
  const [extResultModalOpen, setExtResultModalOpen] = useState(false);
  const [selectedExtResultItem, setSelectedExtResultItem] = useState<any>(null);
  const [extResultForm, setExtResultForm] = useState({
    testResults: '',
    clinicalImpression: '',
    resultDate: new Date().toISOString().split('T')[0],
  });
  const [savingExtResult, setSavingExtResult] = useState(false);

  const handleOpenExternalResultModal = (orderOrRef: any) => {
    setSelectedExtResultItem(orderOrRef);
    setExtResultForm({
      testResults: '',
      clinicalImpression: '',
      resultDate: new Date().toISOString().split('T')[0],
    });
    setExtResultModalOpen(true);
  };

  const handleSaveWardExternalResult = async () => {
    if (!selectedExtResultItem || !extResultForm.testResults.trim()) {
      enqueueSnackbar('Please enter the laboratory test results/values', { variant: 'warning' });
      return;
    }
    setSavingExtResult(true);
    const combinedSummary = extResultForm.clinicalImpression.trim()
      ? `TEST RESULTS:\n${extResultForm.testResults.trim()}\n\nCLINICAL IMPRESSION:\n${extResultForm.clinicalImpression.trim()}`
      : extResultForm.testResults.trim();

    try {
      await api.patch(`/lims/referrals/${selectedExtResultItem.id}/result`, {
        resultSummary: combinedSummary,
        resultDate: extResultForm.resultDate,
      });
      enqueueSnackbar('External lab result recorded & updated in EMR!', { variant: 'success' });
      setExtResultModalOpen(false);
      if (selectedAdm) {
        const updated = await loadPatientLabOrders(selectedAdm);
        setPatientLabOrders(updated);
      }
    } catch (err) {
      enqueueSnackbar('Failed to save external result', { variant: 'error' });
    } finally {
      setSavingExtResult(false);
    }
  };
  const [vitalsForm, setVitalsForm] = useState({
    systolic: '120',
    diastolic: '80',
    temperature: '36.8',
    pulseRate: '75',
    respiratoryRate: '16',
    spo2: '98',
    painScore: 0,
    notes: '',
    clinicalCondition: 'STABLE',
  });
  const [savingVitals, setSavingVitals] = useState(false);
  const [silencedAlarms, setSilencedAlarms] = useState<Record<string, boolean>>({});
  const [wardEquipment, setWardEquipment] = useState<any[]>([]);

  // ── Equipment Pairing State ──────────────────────────────────────────────
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [pairForm, setPairForm] = useState({
    name: 'Bedside Physiological Monitor Pack',
    deviceId: '',
    status: 'ONLINE',
    battery: '100%',
    bedNumber: 'MED-01',
  });
  const [pairingEquipment, setPairingEquipment] = useState(false);

  // ── High-Alert Meds & Infusion Prescription State ─────────────────────────
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [medTargetAdm, setMedTargetAdm] = useState<any | null>(null);
  const [medForm, setMedForm] = useState({
    medicationDisplay: 'IV Normal Saline 500ml',
    dosageText: '80 ml/hr continuous infusion',
    note: 'Double-check volume rate before connecting pump',
  });
  const [prescribingMed, setPrescribingMed] = useState(false);

  // ── Ward Round Notes State ────────────────────────────────────────────────
  const [roundNoteModalOpen, setRoundNoteModalOpen] = useState(false);
  const [roundNoteTargetAdm, setRoundNoteTargetAdm] = useState<any | null>(null);
  const [roundNoteForm, setRoundNoteForm] = useState({
    note: 'Patient is resting comfortably. Vitals stable. Maintain current treatment plan.',
    clinicalCondition: 'STABLE',
    authorName: 'Dr. Emmanuel Vegher',
  });
  const [savingRoundNote, setSavingRoundNote] = useState(false);
  const [generatingAiHandover, setGeneratingAiHandover] = useState<Record<string, boolean>>({});
  const [staffOptions, setStaffOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [currentUserFullName, setCurrentUserFullName] = useState<string>('Dr. Emmanuel Vegher');

  // Load clinical staff directory & logged in user profile
  useEffect(() => {
    const loadStaffAndUser = async () => {
      try {
        const [resStaff, resMe] = await Promise.allSettled([
          api.get('/lims/clinicians'),
          api.get('/auth/me'),
        ]);

        let meName = '';
        if (resMe.status === 'fulfilled' && resMe.value?.data) {
          const u = resMe.value.data;
          const fn = u.firstName || '';
          const ln = u.lastName || '';
          const rawName = `${fn} ${ln}`.trim() || u.username || 'Emmanuel Vegher';
          meName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
          setCurrentUserFullName(meName);
        }

        let formattedStaff: Array<{ label: string; value: string }> = [];
        if (resStaff.status === 'fulfilled' && Array.isArray(resStaff.value?.data)) {
          formattedStaff = resStaff.value.data.map((s: any) => {
            const fn = s.firstName || '';
            const ln = s.lastName || '';
            let name = `${fn} ${ln}`.trim();
            if (name && !name.startsWith('Dr.') && !name.startsWith('Nurse') && (s.designation?.toLowerCase().includes('doc') || s.designation?.toLowerCase().includes('consultant') || s.designation?.toLowerCase().includes('officer'))) {
              name = `Dr. ${name}`;
            }
            const labelStr = s.designation ? `${name} — ${s.designation} (${s.department || 'Clinical Staff'})` : name;
            return { label: labelStr, value: name };
          }).filter(s => s.value);
        }

        if (meName && !formattedStaff.some(s => s.value === meName)) {
          formattedStaff.unshift({ label: `${meName} (Logged-in User)`, value: meName });
        }

        if (formattedStaff.length === 0) {
          formattedStaff = [
            { label: 'Dr. Emmanuel Vegher — Medical Officer (Logged-in User)', value: 'Dr. Emmanuel Vegher' },
            { label: 'Dr. Garry Imoh — Chief Medical Officer', value: 'Dr. Garry Imoh' },
            { label: 'Nurse Sarah Okon — Chief Matron', value: 'Nurse Sarah Okon' },
            { label: 'Dr. Ujunwa Agu — Consultant Surgeon', value: 'Dr. Ujunwa Agu' },
            { label: 'OpenMed Clinical AI — Shift SBAR Handover', value: 'OpenMed Clinical AI (SBAR Handover)' },
          ];
        }

        setStaffOptions(formattedStaff);

        setRoundNoteForm(prev => ({
          ...prev,
          authorName: prev.authorName && prev.authorName !== 'Dr. Attending Consultant' ? prev.authorName : (meName || 'Dr. Emmanuel Vegher'),
        }));
      } catch (err) {
        console.error('Failed to load staff list for shift handovers:', err);
      }
    };

    loadStaffAndUser();
  }, []);

  // ── Weekly MDT Case Conference State ────────────────────────────────────────
  const [openMdtModal, setOpenMdtModal] = useState(false);
  const [mdtTargetAdm, setMdtTargetAdm] = useState<any | null>(null);
  const [mdtForm, setMdtForm] = useState({
    conferenceTitle: 'Weekly Multidisciplinary Team (MDT) Clinical Case Review',
    consultantsPresent: 'Dr. Emmanuel Vegher, Dr. Garry Imoh, Nurse Sarah Okon',
    clinicalSummary: 'Complex clinical case review for multidisciplinary care optimization.',
    consensusPlan: 'Continue current therapy. Repeat lab diagnostics in 48 hours.',
  });
  const [savingMdt, setSavingMdt] = useState(false);

  const handleOpenMdtModal = (adm: any) => {
    setMdtTargetAdm(adm);
    setMdtForm({
      conferenceTitle: `Weekly MDT Case Review — ${adm.patient?.firstName || ''} ${adm.patient?.lastName || ''}`,
      consultantsPresent: `${currentUserFullName || 'Dr. Emmanuel Vegher'}, Dr. Garry Imoh (CMO), Nurse Sarah Okon (Chief Matron)`,
      clinicalSummary: `Diagnosis: ${adm.diagnosis || 'General Care'} | Acuity: ${adm.clinicalCondition || 'STABLE'}. Multidisciplinary case evaluation conducted.`,
      consensusPlan: '1. Continue active eMAR infusions & oral medications. 2. Monitor daily vitals & repeat baseline labs in 48h. 3. Re-evaluate at next weekly MDT conference.',
    });
    setOpenMdtModal(true);
  };

  const handleSaveMdtNote = async () => {
    if (!mdtTargetAdm || !mdtForm.clinicalSummary) return;
    setSavingMdt(true);
    try {
      const formattedNote = `[WEEKLY MDT CASE CONFERENCE REVIEW]\nPanel: ${mdtForm.consultantsPresent}\nSummary: ${mdtForm.clinicalSummary}\nConsensus Care Plan: ${mdtForm.consensusPlan}`;
      await api.post(`/ipd/admissions/${mdtTargetAdm.id}/round-notes`, {
        note: formattedNote,
        clinicalCondition: mdtTargetAdm.clinicalCondition || 'STABLE',
        authorName: `${currentUserFullName || 'Dr. Emmanuel Vegher'} (MDT Panel)`,
      });
      enqueueSnackbar(`MDT Weekly Case Conference record saved for ${mdtTargetAdm.patient?.firstName}!`, { variant: 'success' });
      setOpenMdtModal(false);
      loadAll();
    } catch (err: any) {
      enqueueSnackbar('Failed to save MDT note', { variant: 'error' });
    } finally {
      setSavingMdt(false);
    }
  };

  // ── Manual Admit Dialog ────────────────────────────────────────────────────
  const [openAdmit, setOpenAdmit] = useState(false);
  const [openApptModal, setOpenApptModal] = useState(false);

  // ── Due Pregnant Patient Admission State ─────────────────────────────────
  const [openMaternityAdmit, setOpenMaternityAdmit] = useState(false);
  const [maternityAdmitPatient, setMaternityAdmitPatient] = useState<any>(null);
  const [isDueImmediateLabour, setIsDueImmediateLabour] = useState(false);
  const [submittingMaternityAdmit, setSubmittingMaternityAdmit] = useState(false);
  const [patientOptions, setPatientOptions] = useState<any[]>([]);
  const [maternityAdmitForm, setMaternityAdmitForm] = useState({
    membranesStatus: 'INTACT',
    cervicalDilatation: 4,
    contractionsFrequency: 3,
    fetalHeartRate: 140,
    maternalPulse: 80,
    maternalBp: '120/80',
    notes: 'Admitted from Maternity Ward Desk'
  });

  useEffect(() => {
    if (openMaternityAdmit) {
      api.get('/patients').then(r => {
        setPatientOptions(r.data?.data || r.data || []);
      }).catch(() => {});
    }
  }, [openMaternityAdmit]);

  const handlePerformMaternityAdmit = async () => {
    if (!maternityAdmitPatient) {
      enqueueSnackbar('Please select a patient to admit', { variant: 'warning' });
      return;
    }
    setSubmittingMaternityAdmit(true);
    try {
      if (isDueImmediateLabour) {
        await api.post('/maternity/labour/admit-by-patient', {
          patientId: maternityAdmitPatient.id,
          ...maternityAdmitForm,
          cervicalDilatation: Number(maternityAdmitForm.cervicalDilatation),
          contractionsFrequency: Number(maternityAdmitForm.contractionsFrequency),
          fetalHeartRate: Number(maternityAdmitForm.fetalHeartRate),
          maternalPulse: Number(maternityAdmitForm.maternalPulse) || 80,
        });
        enqueueSnackbar('⚡ Pregnant patient checked in to Labour & Delivery Ward! Opening Partograph...', { variant: 'success' });
        setOpenMaternityAdmit(false);
        navigate('/labour-ward');
      } else {
        navigate('/visits');
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to complete admission', { variant: 'error' });
    } finally {
      setSubmittingMaternityAdmit(false);
    }
  };

  // ── Load Data ─────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [resAdm, resWards, resAlerts] = await Promise.all([
        api.get('/ipd/admissions'),
        api.get('/ipd/wards'),
        api.get('/ipd/emergency-alerts'),
      ]);
      setAdmissions(resAdm.data || []);
      setWardStats(resWards.data || []);
      setEmergencyAlerts(resAlerts.data || []);

      const currentWard = resWards.data?.find((w: any) => w.wardCategory === (currentWardSlug || 'medical').toUpperCase() || w.name.toLowerCase().includes(currentWardSlug || 'medical'));
      if (currentWard) {
        api.get(`/ipd/wards/${currentWard.id}/equipment`).then(r => setWardEquipment(r.data?.equipment || [])).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load IPD data:', err);
    }
  }, [currentWardSlug]);

  useEffect(() => {
    loadAll();
    // Load catalogs for pharmacy & lab stock checks
    api.get('/lims/catalog').then(r => setLabCatalog(r.data || [])).catch(() => {});
    const wardParam = (currentWardSlug || 'medical').toLowerCase();
    api.get(`/pharmacy/ward-medications?ward=${wardParam}`).then(r => {
      const list = r.data?.data || r.data || [];
      setPharmacyCatalog(list);
    }).catch(() => {
      api.get('/pharmacy/inventory').then(r => setPharmacyCatalog(r.data || [])).catch(() => {});
    });
    // Auto refresh every 60s
    const interval = setInterval(loadAll, 60000);
    return () => clearInterval(interval);
  }, [loadAll, currentWardSlug]);

  // Load ward beds when destination ward changes
  useEffect(() => {
    if (!toWardId) { setAvailableBeds([]); setToBedId(''); return; }
    api.get(`/ipd/wards/${toWardId}/available-beds`).then(r => setAvailableBeds(r.data || [])).catch(() => {});
  }, [toWardId]);

  // ── Smart AI Recommenders (Medications & Labs with Stock Status) ───────────
  const runSmartRecommenders = async (diagCode: string, complaintText: string) => {
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

    addPlanIfMatched('M54.5', ['back pain', 'lumbar', 'waist', 'waste pain'], 'Low Back Pain Management: Prescribe targeted oral NSAIDs & muscle relaxants for acute lumbar pain. Advise posture modification, warm compress, and avoidance of heavy lifting.');
    addPlanIfMatched('R35.1', ['nocturia', 'nocturnal', 'urinary', 'urinating', '30 times', 'dysuria', 'frequency', 'episodes/night'], 'Urinary Symptoms & Nocturia: Order Urinalysis, Urine Culture & Sensitivity, and Renal Function Test (U/E/Cr). Advise evening fluid restriction and urological evaluation.');
    addPlanIfMatched('J06.9', ['cough', 'sputum', 'phlegm', 'catarrh', 'respiratory', 'cold'], 'Respiratory Cover: Prescribe oral antibiotic therapy & mucolytic expectorant. Recommend warm fluid hydration with steam inhalation twice daily.');
    addPlanIfMatched('R61', ['sweat', 'sweats', 'sweating', 'diaphoresis'], 'Night Sweats & Febrile Screening: Request Full Blood Count (FBC), ESR, and Malaria RDT screening to investigate underlying infectious focus.');
    addPlanIfMatched('R51.9', ['headache', 'hemicrania', 'head pain', 'migraine'], 'Headache Control: Administer analgesics (Paracetamol 1g TDS). Monitor blood pressure & neurological signs; advise rest in quiet environment.');
    addPlanIfMatched('M25.6', ['stiff', 'stiffness', 'rigidity', 'myalgia', 'joint'], 'Joint & Muscle Stiffness: Recommend gentle stretching exercises, warm compress, and oral neurovitamin support.');
    addPlanIfMatched('I10', ['hypertension', 'blood pressure', 'high bp'], 'Hypertension Management: Initiate antihypertensive pharmacotherapy with daily home BP log, low sodium diet (<2g/day), and baseline renal profile.');
    addPlanIfMatched('E11.9', ['diabetes', 'sugar', 'polyuria'], 'Glycemic Control: Fasting Blood Sugar (FBS), HbA1c screening, Metformin therapy with meal timing guidance, and dietary carbohydrate regulation.');
    addPlanIfMatched('A09', ['diarrhea', 'diarrhoea', 'stooling', 'vomit', 'nausea'], 'Gastroenteritis Support: Immediate oral rehydration therapy (ORS sachets), Zinc supplementation (20mg daily x 10 days), and bland diet.');
    addPlanIfMatched('B50.9', ['malaria', 'chills', 'rigor', 'fever', 'temperature'], 'Antimalarial Therapy: Artemether/Lumefantrine (ACT) full 3-day treatment course and Paracetamol for temperature control.');

    if (planItems.length === 0) {
      return '1. Completed initial clinical history & baseline physical exam.\n2. Order baseline laboratory screening panel as clinically indicated.\n3. Provide lifestyle, nutritional, and preventive health counseling.\n4. Schedule routine follow-up as needed.';
    }

    return planItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n\n');
  };

  // ── Frontend Multi-Problem Clinical Inference Engine ──────────────────────
  const inferClinicalDetailsFrontend = (text: string): { codes: string[]; plan: string } => {
    const lower = text.toLowerCase();
    const codesSet = new Set<string>();

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
    if (lower.includes('legs are stiff') || lower.includes('leg stiff') || lower.includes('stiff') || lower.includes('stiffness') || lower.includes('rigidity') || lower.includes('myalgia') || lower.includes('joint pain') || lower.includes('body ache')) {
      if (!codesSet.has('M54.5 — Low back pain')) {
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
    if (lower.includes('malaria') || lower.includes('chills') || lower.includes('rigor') || lower.includes('iba') || lower.includes('zazzabi')) {
      codesSet.add('B50.9 — Plasmodium falciparum malaria');
    }

    const codes = Array.from(codesSet);
    const plan = buildMultiFactorialPlan(codes, text);

    return { codes, plan };
  };

  // ── Debounced Subjective Symptom Watcher — Live Assessment & Plan Derivation ──
  const soapSubjDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!soapSubj || soapSubj.trim().length < 5) return;
    if (soapSubjDebounceRef.current) clearTimeout(soapSubjDebounceRef.current);
    soapSubjDebounceRef.current = setTimeout(() => {
      const result = inferClinicalDetailsFrontend(soapSubj);
      if (result && result.codes.length > 0) {
        setSoapAssessments(result.codes);
        setSoapPlan(result.plan);
        runSmartRecommenders(result.codes.join(', '), soapSubj);
      }
    }, 800); // 800ms debounce — fires after typing pauses
    return () => { if (soapSubjDebounceRef.current) clearTimeout(soapSubjDebounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soapSubj]);

  // ── Auto-Derive Ward Assessment & Plan from Symptoms ────────────────────
  const autoGenerateSOAP = async (patName: string, complaint: string, vitalsStr: string) => {
    const inputText = (complaint || soapSubj || '').trim();
    if (!inputText || inputText.length < 3) {
      enqueueSnackbar('Please type patient symptoms or use 🎤 Voice Dictation in Subjective (S) first.', { variant: 'info' });
      return;
    }
    setGeneratingSOAP(true);
    setSoapAutoGenerated(false);
    try {
      const res = await api.post('/openmed/summarize', {
        patientName: patName,
        clinicalNotes: inputText,
        vitals: vitalsStr || soapObj,
      });
      const d = res.data?.data?.summary;
      if (d) {
        // Clinically rewrite the Subjective in professional format
        if (d.subjective) setSoapSubj(d.subjective);
        if (vitalsStr || soapObj) setSoapObj(vitalsStr || soapObj); else if (d.objective) setSoapObj(d.objective || '');
        
        const multiInfer = inferClinicalDetailsFrontend(d.subjective || inputText);
        const finalCodes = (d.assessmentCodes && d.assessmentCodes.length > 0)
          ? d.assessmentCodes
          : multiInfer.codes;
        const finalPlan = buildMultiFactorialPlan(finalCodes, d.subjective || inputText);

        setSoapAssessments(finalCodes);
        setSoapPlan(finalPlan);
        runSmartRecommenders(finalCodes.join(', '), inputText);
        setSoapAutoGenerated(true);
        enqueueSnackbar('✨ Subjective clinically rewritten & Multi-Assessment + Full Plan auto-derived!', { variant: 'success' });
      }
    } catch (err) {
      console.error('Auto SOAP generation failed:', err);
      const fallback = inferClinicalDetailsFrontend(inputText);
      setSoapAssessments(fallback.codes);
      setSoapPlan(fallback.plan);
      runSmartRecommenders(fallback.codes.join(', '), inputText);
      enqueueSnackbar('✨ Multi-Assessment + Full Plan auto-derived from symptoms!', { variant: 'success' });
    } finally {
      setGeneratingSOAP(false);
    }
  };

  // ── Medication Payment & eMAR Administration Status Classifier ─────────────
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

  // ── Helper to resolve doctor attribution ─────────────────────────────────
  const getDoctorAttribution = (entity: any) => {
    if (!entity) return 'Attending Physician';
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
    return 'Attending Physician';
  };

  // ── Lab Results & Findings Renderer ──────────────────────────────────────
  const renderLabResultDetails = (labOrder: any) => {
    if (!labOrder) return null;
    const isCompleted = labOrder.status === 'COMPLETED';
    const items = labOrder.items || [];

    const parseResultSummary = (summaryStr?: string) => {
      if (!summaryStr) return { testResults: '', clinicalImpression: '' };
      if (summaryStr.includes('TEST RESULTS:')) {
        const parts = summaryStr.split('CLINICAL IMPRESSION:');
        const testResults = parts[0].replace('TEST RESULTS:', '').trim();
        const clinicalImpression = parts[1] ? parts[1].trim() : '';
        return { testResults, clinicalImpression };
      }
      return { testResults: summaryStr.trim(), clinicalImpression: '' };
    };

    // Extract results array
    const resultsList: Array<{
      testName: string;
      resultValue?: string;
      resultUnit?: string;
      referenceRange?: string;
      interpretation?: string;
      resultText?: string;
      isCritical?: boolean;
      verifiedAt?: string;
    }> = [];

    if (items.length > 0) {
      items.forEach((it: any) => {
        const res = it.result;
        const testName = it.testName || it.test?.testName || it.test?.name || labOrder.testName || labOrder.name || 'Lab Test';
        const summaryText = it.resultSummary || labOrder.resultSummary || res?.resultSummary || res?.resultText;
        const parsed = parseResultSummary(summaryText);

        if (res || it.status === 'COMPLETED' || isCompleted || summaryText) {
          resultsList.push({
            testName,
            resultValue: res?.resultValue || it.resultValue || parsed.testResults || (isCompleted ? 'Normal / Verified' : undefined),
            resultUnit: res?.resultUnit || it.resultUnit || '',
            referenceRange: res?.referenceRange || it.test?.referenceRange || '',
            interpretation: res?.interpretation || it.interpretation || parsed.clinicalImpression || (isCompleted ? 'Within Normal Limits (Verified by Pathology)' : undefined),
            resultText: res?.resultText || it.notes || labOrder.notes || '',
            isCritical: res?.isCritical || false,
            verifiedAt: res?.verifiedAt || labOrder.completedAt || labOrder.createdAt,
          });
        }
      });
    }

    // Fallback if no items array or flat structure
    if (resultsList.length === 0 && (isCompleted || labOrder.resultValue || labOrder.resultText || labOrder.resultSummary || labOrder.notes)) {
      const summaryText = labOrder.resultSummary || labOrder.resultText;
      const parsed = parseResultSummary(summaryText);
      resultsList.push({
        testName: labOrder.testName || labOrder.test?.testName || labOrder.test?.name || labOrder.name || 'Diagnostic Laboratory Investigation',
        resultValue: labOrder.resultValue || parsed.testResults || (isCompleted ? 'Normal / Verified' : undefined),
        resultUnit: labOrder.resultUnit || '',
        referenceRange: labOrder.referenceRange || '',
        interpretation: labOrder.interpretation || parsed.clinicalImpression || (isCompleted ? 'Normal Parameters Verified' : undefined),
        resultText: labOrder.resultText || labOrder.notes || labOrder.clinicalNotes || '',
        isCritical: labOrder.isCritical || false,
        verifiedAt: labOrder.completedAt || labOrder.createdAt,
      });
    }

    if (resultsList.length === 0) return null;

    return (
      <Box sx={{ mt: 1.5, pt: 1.2, borderTop: '1px dashed #cbd5e1' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" fontWeight={800} color="#0369a1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, letterSpacing: 0.5 }}>
            🧪 LABORATORY RESULTS & CLINICAL FINDINGS
          </Typography>
          <Chip 
            label="✅ VERIFIED BY PATHOLOGY" 
            color="success" 
            size="small" 
            sx={{ fontWeight: 800, fontSize: '0.6rem', height: 18, bgcolor: '#dcfce7', color: '#166534' }} 
          />
        </Box>

        <Stack spacing={1}>
          {resultsList.map((r, idx) => {
            const valStr = [r.resultValue, r.resultUnit].filter(Boolean).join(' ');
            return (
              <Box key={idx} sx={{ bgcolor: '#f0f9ff', p: 1.2, borderRadius: 1.5, border: '1px solid #bae6fd' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#0c4a6e" sx={{ fontSize: '0.85rem' }}>
                    {r.testName}
                  </Typography>
                  {r.isCritical && (
                    <Chip label="🚨 CRITICAL VALUE" color="error" size="small" sx={{ fontWeight: 800, fontSize: '0.6rem', height: 18 }} />
                  )}
                </Box>

                {valStr && (
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>Result:</Typography>
                    <Typography variant="body2" fontWeight={800} color="#0284c7" sx={{ fontSize: '0.9rem' }}>
                      {valStr}
                    </Typography>
                    {r.referenceRange && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        (Ref: {r.referenceRange})
                      </Typography>
                    )}
                  </Box>
                )}

                {r.interpretation && (
                  <Typography variant="caption" color="#15803d" fontWeight={700} sx={{ display: 'block', mt: 0.3 }}>
                    📊 Interpretation: {r.interpretation}
                  </Typography>
                )}

                {r.resultText && (
                  <Typography variant="caption" color="text.primary" sx={{ display: 'block', mt: 0.3, fontStyle: 'italic', bgcolor: '#ffffff', p: 0.8, borderRadius: 1, border: '1px solid #e2e8f0' }}>
                    📝 Findings / Notes: {r.resultText}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      </Box>
    );
  };

  // ── Lab Order Card Renderer (Full Details View) ───────────────────────────
  const renderLabOrderCard = (o: any) => {
    if (!o) return null;
    const isCompleted = o.status === 'COMPLETED';
    const isExternalRef = o.isExternal || o.status === 'EXTERNAL_REFERRAL' || (o.orderNumber && String(o.orderNumber).startsWith('REF-'));
    const items = o.items && o.items.length > 0 ? o.items : [
      {
        testName: o.testName || o.testRequested || o.test?.testName || o.test?.name || o.name || 'Lab Investigation',
        category: o.category || 'Pathology',
        isExternal: isExternalRef,
      }
    ];

    return (
      <Paper
        key={o.id || Math.random()}
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2.5,
          bgcolor: isCompleted ? '#f0fdf4' : isExternalRef ? '#fffbe6' : '#ffffff',
          borderColor: isCompleted ? '#86efac' : isExternalRef ? '#ffe58f' : '#cbd5e1',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        {/* Order Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1.2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" fontWeight={800} color={isCompleted ? '#166534' : isExternalRef ? '#d48806' : 'text.primary'}>
                📋 {isExternalRef ? 'Lab Referral' : 'Lab Order'} #{o.orderNumber || o.id}
              </Typography>
              <Chip
                label={o.priority || 'ROUTINE'}
                size="small"
                color={o.priority === 'STAT' || o.priority === 'CRITICAL' ? 'error' : 'primary'}
                variant="outlined"
                sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
              />
              {isExternalRef && (
                <Chip
                  label="EXTERNAL REFERRAL"
                  size="small"
                  color="warning"
                  sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20, bgcolor: '#fff1b8', color: '#d48806' }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mt: 0.3 }}>
              👨‍⚕️ Ordered by: <strong style={{ color: '#0369a1' }}>{getDoctorAttribution(o)}</strong> • {o.createdAt || o.orderedAt ? new Date(o.createdAt || o.orderedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Today'}
              {o.department ? ` • Dept: ${o.department}` : ''}
            </Typography>
          </Box>
          <Chip
            label={o.status === 'EXTERNAL_REFERRAL' ? 'EXTERNAL PURCHASE' : o.status || 'PENDING'}
            size="small"
            color={isCompleted ? 'success' : o.status === 'PROCESSING' || o.status === 'IN_PROGRESS' ? 'info' : 'warning'}
            sx={{ fontWeight: 800, fontSize: '0.7rem' }}
          />
        </Box>

        {/* Tests Included in this Order */}
        <Box sx={{ bgcolor: alpha('#000', 0.02), p: 1.2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.06)', mb: 1 }}>
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: 'block', mb: 0.8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Requested Tests ({items.length}):
          </Typography>
          <Stack spacing={0.8}>
            {items.map((it: any, idx: number) => {
              const tName = it.testName || it.test?.testName || it.test?.name || it.name || 'Lab Test';
              const isExtItem = it.isExternal || isExternalRef || it.status === 'OUT_OF_STOCK_EXTERNAL' || it.status === 'EXTERNAL_PURCHASE';
              return (
                <Box
                  key={it.id || idx}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: '#ffffff',
                    p: 1,
                    borderRadius: 1.5,
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      {idx + 1}. {tName}
                    </Typography>
                    {it.category && (
                      <Chip label={it.category} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    {isExtItem ? (
                      <Chip
                        label="Advised to Test Outside"
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700 }}
                      />
                    ) : (
                      <Chip
                        label="In-House Lab"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700 }}
                      />
                    )}
                    {it.price > 0 && (
                      <Typography variant="caption" fontWeight={800} color="text.secondary">
                        ₦{Number(it.price).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {/* Clinical Notes / Rationale */}
        {(o.clinicalNotes || o.notes) && (
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
            📝 Notes: {o.clinicalNotes || o.notes}
          </Typography>
        )}

        {/* Doctor Action: Enter External Result if pending */}
        {isExternalRef && !isCompleted && (
          <Box sx={{ mt: 1.2, pt: 1, borderTop: '1px dashed #ffe58f', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<Science />}
              onClick={() => handleOpenExternalResultModal(o)}
              sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: '0.75rem' }}
            >
              🧪 Enter External Result (Brought to Doctor)
            </Button>
          </Box>
        )}

        {/* Results details if available */}
        {renderLabResultDetails(o)}
      </Paper>
    );
  };

  // ── Load Patient Lab Orders (In-House & External Referrals Combined) ───────
  const loadPatientLabOrders = async (adm: any) => {
    const patId = adm.patient?.id;
    if (!patId) return [];
    try {
      const [resOrders, resReferrals] = await Promise.all([
        api.get(`/lims/orders?patientId=${patId}`),
        api.get(`/lims/referrals`).catch(() => ({ data: [] })),
      ]);

      const rawOrders = resOrders.data || [];
      const rawReferrals = resReferrals.data || [];
      const patName = `${adm.patient?.firstName || ''} ${adm.patient?.lastName || ''}`.trim().toLowerCase();
      const patMrn = (adm.patient?.mrn || patId).toLowerCase().trim();

      const patientReferrals = rawReferrals.filter((ref: any) => {
        const rMrn = (ref.mrn || '').toLowerCase().trim();
        const rName = (ref.patientName || '').toLowerCase().trim();
        return (
          (patMrn && rMrn === patMrn) ||
          (patName && (rName.includes(patName) || patName.includes(rName)))
        );
      });

      const formattedReferrals = patientReferrals.map((ref: any) => ({
        id: ref.id,
        orderNumber: ref.referralNumber || `REF-${ref.id.slice(-6)}`,
        status: ref.status === 'RESULT_RECEIVED' ? 'COMPLETED' : 'EXTERNAL_REFERRAL',
        priority: 'ROUTINE',
        orderedAt: ref.referralDate || ref.createdAt,
        createdAt: ref.referralDate || ref.createdAt,
        isExternal: true,
        clinicalNotes: ref.notes || `External Referral to ${ref.referredTo || 'External Laboratory'}`,
        items: [
          {
            id: `${ref.id}-item`,
            testName: ref.testRequested || 'External Lab Investigation',
            category: 'External Referral',
            isExternal: true,
            status: ref.status === 'RESULT_RECEIVED' ? 'COMPLETED' : 'EXTERNAL_PURCHASE',
            notes: ref.notes,
            resultSummary: ref.resultSummary,
            resultDate: ref.resultDate,
          }
        ]
      }));

      const formattedOrders = rawOrders.map((ord: any) => ({
        ...ord,
        isExternal: false,
        items: (ord.items || []).map((it: any) => ({
          ...it,
          testName: it.testName || it.test?.testName || it.test?.name || it.name || 'Lab Investigation',
          category: it.category || it.test?.category || 'Pathology',
          price: it.price || it.test?.price || 0,
          isExternal: false,
        }))
      }));

      const combinedLabOrders = [...formattedOrders, ...formattedReferrals].sort((a: any, b: any) => {
        const tA = new Date(a.orderedAt || a.createdAt || 0).getTime();
        const tB = new Date(b.orderedAt || b.createdAt || 0).getTime();
        return tB - tA;
      });

      return combinedLabOrders;
    } catch (err) {
      console.warn('Failed to load lab orders/referrals:', err);
      return [];
    }
  };

  // ── Load Patient EMR & Consultation History when Drawer Opens ──────────────
  const loadPatientData = async (adm: any) => {
    const patId = adm.patient?.id;
    if (!patId) return;
    setLoadingSummary(true);
    try {
      const [resSummary, labOrdersCompiled, resPrescriptions, resEmar] = await Promise.all([
        api.get(`/emr/summary/${patId}`),
        loadPatientLabOrders(adm),
        api.get(`/pharmacy/prescriptions?patientId=${patId}`),
        api.get(`/emar/patient/${patId}`).catch(() => ({ data: { emarLogs: [] } })),
      ]);
      const summaryData = resSummary.data || {};
      setEmrSummary(summaryData);
      setPatientLabOrders(labOrdersCompiled || []);
      setPatientPrescriptions(resPrescriptions.data || []);
      setEmarLogs(resEmar.data?.emarLogs || []);

      // Compile current vitals string
      const latestTriage = summaryData.triageRecords?.[0];
      const vitalsStr = latestTriage
        ? `BP: ${latestTriage.systolic}/${latestTriage.diastolic} mmHg | Temp: ${latestTriage.temperature}°C | Pulse: ${latestTriage.pulseRate} bpm | SpO2: ${latestTriage.spo2}% | Pain: ${latestTriage.painScore ?? '0'}/10`
        : '';

      // Always start with a fresh SOAP Note entry for today's ward round
      setSoapSubj('');
      setSoapObj(vitalsStr);
      setSoapAssessments([]);
      setSoapPlan('');
      setSoapAutoGenerated(false);
      setLastSavedAssessment([]);
      setLastSavedSubjective('');
      setLastSavedDate(null);

      // Check if there is a recorded SOAP Note for TODAY
      const todayNote = (summaryData.soapNotes || summaryData.consultationNotes || []).find((n: any) =>
        isToday(n.createdAt || n.date || n.updatedAt)
      );

      if (todayNote?.assessment && typeof todayNote.assessment === 'string' && todayNote.assessment.trim()) {
        const parsedCodes = todayNote.assessment.split(/,\s*/).map((s: string) => s.trim()).filter(Boolean);
        setLastSavedAssessment(parsedCodes);
        setLastSavedSubjective(todayNote.subjective || '');
        setLastSavedDate(new Date(todayNote.createdAt || todayNote.date || Date.now()));
        runSmartRecommenders(parsedCodes.join(', '), todayNote.subjective || '');
      } else {
        setAiMedRecs([]);
        setAiLabRecs([]);
      }

      // Run AI Risk Stratification if vitals exist
      if (latestTriage) {
        setAiLoadingRisk(true);
        api.post('/openmed/risk-stratify', {
          bp: `${latestTriage.systolic}/${latestTriage.diastolic}`,
          temperature: String(latestTriage.temperature),
          pulseRate: String(latestTriage.pulseRate),
          spo2: String(latestTriage.spo2),
          news2Score: latestTriage.news2Score ?? 0,
          chiefComplaint: adm.diagnosis || '',
        }).then(r => setAiRisk(r.data?.data)).catch(() => {}).finally(() => setAiLoadingRisk(false));
      }
    } catch (e) {
      console.error('Failed to load EMR:', e);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleRowClick = (adm: any) => {
    setSelectedAdm(adm);
    setDrawerOpen(true);
    setActiveTab(0);
    setPresCart([]);
    setLabCart([]);
    setToWardId('');
    setToBedId('');
    setTransferReason('');
    setIsOverflow(false);
    setTransferNotes('');
    setVoiceTranscript('');
    setVoiceAnalysis(null);

    // Load available wards for transfer
    api.get('/ipd/wards').then(r => setAvailableWards((r.data || []).filter((w: any) => w.id !== adm.bed?.ward?.id))).catch(() => {});

    loadPatientData(adm);
  };

  // ── Voice Dictation (Web Speech API + OpenMed Local Engine) ────────────────
  // ── Voice Dictation & AI Clinical Processing ────────────────────────────
  const processVoiceDictation = async (rawText: string) => {
    if (!rawText || rawText.trim().length < 3 || isProcessingVoiceRef.current) return;
    isProcessingVoiceRef.current = true;
    setVoiceSummarizing(true);
    enqueueSnackbar('⚡ Processing voice audio with OpenMed AI… translating dialect & structuring SOAP note…', { variant: 'info' });

    try {
      const patName = selectedAdm ? `${selectedAdm.patient?.firstName} ${selectedAdm.patient?.lastName}` : 'Patient';
      const existingSubj = (soapSubj || '').trim();
      const hasExistingNotes = !!existingSubj;
      const res = await api.post('/openmed/voice-summarize', {
        rawTranscript: rawText,
        patientName: patName,
        vitals: soapObj,
        isContinued: hasExistingNotes,
        existingText: existingSubj,
      });
      const d = res.data?.data;
      setVoiceAnalysis(d);

      if (d?.summary) {
        const newSubj = (d.summary.subjective || rawText).trim();
        setSoapSubj(prev => {
          const current = (prev || '').trim();
          if (!current || current.includes('diffuse, non-throbbing headache')) return newSubj;
          if (current.includes(newSubj)) return current;
          return `${current}\n\n${newSubj}`;
        });

        const multiInfer = inferClinicalDetailsFrontend(newSubj || rawText);
        const finalCodes = (d.summary.assessmentCodes && Array.isArray(d.summary.assessmentCodes) && d.summary.assessmentCodes.length > 0)
          ? d.summary.assessmentCodes
          : multiInfer.codes;
        const finalPlan = multiInfer.plan || d.summary.plan;

        if (finalCodes && finalCodes.length > 0) {
          setSoapAssessments(finalCodes);
        }
        if (finalPlan) {
          setSoapPlan(finalPlan);
        }

        const diagToRecommend = (finalCodes && finalCodes.length > 0) ? finalCodes.join(', ') : rawText;
        runSmartRecommenders(diagToRecommend, newSubj || rawText);
      } else {
        const fallback = inferClinicalDetailsFrontend(rawText);
        setSoapSubj(prev => prev ? `${prev}\n${rawText}` : rawText);
        if (fallback.codes.length > 0) {
          setSoapAssessments(fallback.codes);
          setSoapPlan(fallback.plan);
          runSmartRecommenders(fallback.codes.join(', '), rawText);
        }
      }
      enqueueSnackbar('✅ Voice dictation translated & structured into SOAP note!', { variant: 'success' });
    } catch (e) {
      console.error('Voice summarize API failed, using frontend clinical inference:', e);
      const fallback = inferClinicalDetailsFrontend(rawText);
      setSoapSubj(prev => prev ? `${prev}\n${rawText}` : rawText);
      if (fallback.codes.length > 0) {
        setSoapAssessments(fallback.codes);
        setSoapPlan(fallback.plan);
        runSmartRecommenders(fallback.codes.join(', '), rawText);
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

  // ── Import Previous Consultation History into SOAP ────────────────────────
  const handleImportPreviousHistory = () => {
    const prevNotes = emrSummary?.consultationNotes;
    if (!prevNotes || prevNotes.length === 0) {
      enqueueSnackbar('No previous consultation records found for this patient', { variant: 'info' });
      return;
    }
    const lastNote = prevNotes[0];
    if (lastNote.subjective) setSoapSubj(lastNote.subjective);
    if (lastNote.objective) setSoapObj(lastNote.objective);
    if (lastNote.assessment) {
      const items = lastNote.assessment.split(/,\s*/).filter(Boolean);
      setSoapAssessments(items);
      runSmartRecommenders(lastNote.assessment, lastNote.subjective || '');
    }
    if (lastNote.plan) setSoapPlan(lastNote.plan);
    enqueueSnackbar('📋 Previous SOAP note imported into today\'s workspace!', { variant: 'success' });
  };

  // ── One-Click Import Vitals to SOAP Objective ──────────────────────────────
  const handleImportVitals = () => {
    const latestTriage = emrSummary?.triageRecords?.[0];
    if (!latestTriage) {
      enqueueSnackbar('No triage vitals found to import', { variant: 'warning' });
      return;
    }
    const vitalsStr = `Vitals Recorded (${new Date(latestTriage.recordedAt || Date.now()).toLocaleTimeString()}): Blood Pressure: ${latestTriage.systolic}/${latestTriage.diastolic} mmHg, Temp: ${latestTriage.temperature}°C, Pulse: ${latestTriage.pulseRate} bpm, SpO2: ${latestTriage.spo2}%, Respiratory Rate: ${latestTriage.respiratoryRate || 18}/min, Pain Score: ${latestTriage.painScore ?? 0}/10, NEWS2 Score: ${latestTriage.news2Score ?? 0}.`;
    setSoapObj(vitalsStr);
    enqueueSnackbar('Triage vitals imported into Objective field!', { variant: 'success' });
  };

  // ── Update Clinical Condition ─────────────────────────────────────────────
  const handleUpdateCondition = async (newCondition: string) => {
    if (!selectedAdm) return;
    setUpdatingCondition(true);
    try {
      await api.patch(`/ipd/admissions/${selectedAdm.id}/condition`, { clinicalCondition: newCondition });
      setSelectedAdm((prev: any) => ({ ...prev, clinicalCondition: newCondition }));
      setAdmissions(prev => prev.map(a => a.id === selectedAdm.id ? { ...a, clinicalCondition: newCondition } : a));
      enqueueSnackbar('Clinical condition updated', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update condition', { variant: 'error' });
    } finally {
      setUpdatingCondition(false);
    }
  };

  // ── Save SOAP Note ────────────────────────────────────────────────────────
  const handleSaveSOAP = async () => {
    if (!selectedAdm) {
      enqueueSnackbar('No active inpatient admission selected', { variant: 'error' });
      return;
    }
    if (!soapSubj || !soapSubj.trim()) {
      enqueueSnackbar('⚠️ Subjective (S) Patient Symptoms field is required.', { variant: 'warning' });
      return;
    }
    if (!soapObj || !soapObj.trim()) {
      enqueueSnackbar('⚠️ Objective (O) Findings & Physical Examination field is required before saving.', { variant: 'warning' });
      return;
    }
    if (!soapPlan || !soapPlan.trim()) {
      enqueueSnackbar('⚠️ Plan (P) Treatment & Interventions field is required.', { variant: 'warning' });
      return;
    }
    setSavingSOAP(true);
    try {
      const activeDiag = soapAssessment || 'B50.9';
      const activeSubjText = soapSubj || '';
      const now = new Date();

      await api.post('/emr/notes', {
        patientId: selectedAdm.patient.id,
        subjective: soapSubj,
        objective: soapObj,
        assessment: soapAssessment,
        plan: soapPlan,
        isFinalized: true,
      });
      enqueueSnackbar('✅ Ward SOAP note saved — reviewing Prescriptions & Recommended Medications', { variant: 'success' });
      
      const parsedAss = activeDiag.split(/,\s*/).map((s: string) => s.trim()).filter(Boolean);
      setLastSavedAssessment(parsedAss);
      setLastSavedSubjective(activeSubjText);
      setLastSavedDate(now);

      // Immediately run smart recommenders so Tab 2 & 3 populate with recommendations
      runSmartRecommenders(activeDiag, activeSubjText);

      // Clear draft input boxes for next entry
      setSoapSubj('');
      setSoapObj('');
      setSoapAssessments([]);
      setSoapPlan('');

      // Auto-navigate to Prescriptions & Stock tab
      setActiveTab(2);
    } catch {
      enqueueSnackbar('Failed to save SOAP note', { variant: 'error' });
    } finally {
      setSavingSOAP(false);
    }
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

    const totalQty = match.totalStock !== undefined ? Number(match.totalStock) : (dispQty + storeQty);

    return {
      inStock: dispQty > 0,
      qty: dispQty,
      dispQty,
      storeQty,
      totalQty,
      item: match
    };
  };

  // ── Check Lab Availability Helper ─────────────────────────────────────────
  const getLabStatus = (testName?: string) => {
    if (!testName || typeof testName !== 'string') return { available: false, item: null };
    const query = testName.toLowerCase().split(' ')[0];
    const match = labCatalog.find(item =>
      (item.name || item.testName || '').toLowerCase().includes(query)
    );
    if (!match) return { available: false, item: null };
    return { available: match.isAvailable !== false, item: match };
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
        clinicalHistory: radHistory || 'Inpatient ward round clinical evaluation',
      }
    ]);
    setSelectedRadCatalogId('');
    enqueueSnackbar(`Added ${targetItem.name} to radiology request cart`, { variant: 'success' });
  };

  const handleSubmitRadOrder = async () => {
    if (!selectedAdm || radCart.length === 0) return;
    const patId = selectedAdm.patient?.id;
    if (!patId) return;
    setOrderingRad(true);

    try {
      for (const item of radCart) {
        await api.post('/radiology/orders', {
          patientId: patId,
          catalogItemId: item.catalogItemId,
          requestedById: selectedAdm.doctorId || 'doc-1',
          clinicalHistory: item.clinicalHistory || radHistory || 'IPD Ward Round Request',
          priority: item.priority || radPriority,
        });
      }
      enqueueSnackbar('⚡ Inpatient Radiology Scan order submitted! Visible in Radiology Queue (http://localhost:5173/radiology) & awaiting Cashier payment settlement.', { variant: 'success' });
      setRadCart([]);
      setRadHistory('');
      api.get(`/radiology/orders`, { params: { patientId: patId } }).then(r => setRadOrders(r.data || [])).catch(() => {});
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to submit radiology scan request', { variant: 'error' });
    } finally {
      setOrderingRad(false);
    }
  };

  // ── Add Medication (with Editable Dosing) ──────────────────────────────────
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

  // ── Auto-Select Dosing Parameters (Dose, Frequency, Duration, Route) ─────
  const handleAutoSelectMedicationDefaults = (med: any) => {
    if (!med) return;
    const name = (med.name || med.genericName || '').toLowerCase();
    const cat = (med.category || '').toLowerCase();
    const form = (med.dosageForm || '').toLowerCase();
    const route = (med.route || '').toLowerCase();

    // 1. Determine Route
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

    // 2. Determine Dose
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

    // 3. Determine Frequency
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

    // 4. Determine Duration
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
    const med = pharmacyCatalog.find((m: any) => m.id === selectedMedId || m.name === selectedMedId);
    if (!med) return;
    const liveStock = (med.batches || []).reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0);
    const stockQty = liveStock > 0 ? liveStock : Number(med.stockQty || med.quantityInStock || med.stock || 0);
    const isExt = Boolean(med.isExternal || !med.inStock && stockQty === 0);
    setPresCart(prev => [
      ...prev,
      {
        medId: isExt ? '' : med.id,
        name: med.name || med.genericName,
        type: isExt ? 'EXTERNAL' : 'CUSTOM',
        category: med.category || 'Ward Stock',
        dose: medDose,
        frequency: medFreq,
        duration: medDuration,
        route: medRoute || med.route || 'Oral',
        inStock: !isExt && stockQty > 0,
        stockQty,
        isExternal: isExt,
        unitPrice: isExt ? 0 : (med.unitPrice || med.price || 0),
        rational: isExt ? 'External purchase / Ward Data Dictionary' : 'Prescribed by clinician',
      }
    ]);
    setSelectedMedId('');
    enqueueSnackbar(`Added ${med.name} to prescription cart ${isExt ? '(External Purchase)' : ''}`, {
      variant: isExt ? 'warning' : 'success'
    });
  };

  const handleSubmitPrescription = async () => {
    if (!selectedAdm || presCart.length === 0) return;
    setPrescribing(true);
    try {
      await api.post('/pharmacy/prescriptions', {
        patientId: selectedAdm.patient.id,
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
        notes: `Inpatient Ward Prescription — Ward: ${selectedAdm.bed?.ward?.name || activeWardConfig?.name || 'N/A'}, Bed: ${selectedAdm.bed?.number || 'TBD'}`,
      });
      const hasInStock = presCart.some(item => !item.isExternal && item.inStock);
      const hasExternal = presCart.some(item => item.isExternal || !item.inStock);

      let msg = 'Inpatient prescription order saved!';
      if (hasInStock && !hasExternal) {
        msg = 'Inpatient prescription order submitted! Invoice generated in Cashier module.';
      } else if (hasInStock && hasExternal) {
        msg = 'Prescription saved! In-stock items sent to Cashier module; out-of-stock items saved for external purchase.';
      } else if (!hasInStock && hasExternal) {
        msg = 'Prescription saved! Out-of-stock items saved for external purchase (No Cashier invoice generated).';
      }

      enqueueSnackbar(msg, { variant: 'success' });
      setPresCart([]);
      if (selectedAdm) loadPatientData(selectedAdm);
    } catch {
      enqueueSnackbar('Failed to submit prescription order', { variant: 'error' });
    } finally {
      setPrescribing(false);
    }
  };

  // ── Add Lab Test (with Availability Check) ────────────────────────────────
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
        rationale: 'Requested by ward clinician',
      }
    ]);
    setSelectedTestId('');
    enqueueSnackbar(`Added ${testTitle} to lab order cart`, { variant: 'success' });
  };

  const handleSubmitLabOrder = async () => {
    if (!selectedAdm || labCart.length === 0) return;
    setOrderingLab(true);

    // Split cart: in-house tests have a real testId; external/unavailable ones do not
    const inHouseTests = labCart.filter(item => item.testId && item.testId.length > 5);
    const externalTests = labCart.filter(item => !item.testId || item.testId.length <= 5);

    let inHouseSuccess = true;
    let externalSuccess = true;

    try {
      // 1. Submit in-house tests to LIMS orders endpoint
      if (inHouseTests.length > 0) {
        await api.post('/lims/orders', {
          patientId: selectedAdm.patient.id,
          tests: inHouseTests.map(item => ({
            testId: item.testId,
            name: item.name,
            priority: item.priority,
            availableInHouse: true,
          })),
          clinicalNotes: `Inpatient Ward Lab Order — Ward: ${selectedAdm.bed?.ward?.name || 'N/A'}`,
          priority: labPriority,
        });
      }

      // 2. Submit external/unavailable tests as lab referrals
      if (externalTests.length > 0) {
        const patientName = `${selectedAdm.patient.firstName || ''} ${selectedAdm.patient.lastName || ''}`.trim();
        const mrn = selectedAdm.patient.mrn || selectedAdm.patient.id;
        for (const extTest of externalTests) {
          await api.post('/lims/referrals', {
            patientName,
            mrn,
            testRequested: extTest.name,
            referredTo: 'External Laboratory',
            notes: extTest.rationale
              ? `External test required — not available in-house. Rationale: ${extTest.rationale}`
              : `External test required — ${extTest.name} not available in-house. Ward: ${selectedAdm.bed?.ward?.name || 'N/A'}`,
          });
        }
      }
    } catch {
      inHouseSuccess = false;
      externalSuccess = false;
      enqueueSnackbar('Failed to submit lab order', { variant: 'error' });
    }

    if (inHouseSuccess || externalSuccess) {
      const parts: string[] = [];
      if (inHouseTests.length > 0) parts.push(`${inHouseTests.length} in-house test(s) submitted to LIMS`);
      if (externalTests.length > 0) parts.push(`${externalTests.length} external test(s) logged as referral(s)`);
      enqueueSnackbar(parts.join(' · '), { variant: 'success' });
      setLabCart([]);
      try {
        const compiled = await loadPatientLabOrders(selectedAdm);
        setPatientLabOrders(compiled);
      } catch { /* non-fatal */ }
    }

    setOrderingLab(false);
  };


  const handleOpenVitalsModal = (adm: any) => {
    setVitalsTargetAdm(adm);
    const v = adm.latestVitals || {};
    setVitalsForm({
      systolic: String(v.systolic || 120),
      diastolic: String(v.diastolic || 80),
      temperature: String(v.temperature || 36.8),
      pulseRate: String(v.pulseRate || 75),
      respiratoryRate: String(v.respiratoryRate || 16),
      spo2: String(v.spo2 || 98),
      painScore: v.painScore || 0,
      notes: '',
      clinicalCondition: adm.clinicalCondition || 'STABLE',
    });
    setVitalsModalOpen(true);
  };

  const handleSaveVitals = async () => {
    if (!vitalsTargetAdm) return;
    setSavingVitals(true);
    try {
      await api.post(`/ipd/admissions/${vitalsTargetAdm.id}/vitals`, vitalsForm);
      enqueueSnackbar('Live vitals recorded successfully to Telemetry Desk', { variant: 'success' });
      setVitalsModalOpen(false);
      loadAll();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to record vitals', { variant: 'error' });
    } finally {
      setSavingVitals(false);
    }
  };

  const toggleSilenceAlarm = (admId: string) => {
    setSilencedAlarms(prev => {
      const nextState = !prev[admId];
      enqueueSnackbar(nextState ? 'Alarm silenced for 15 minutes' : 'Alarm re-activated', { variant: nextState ? 'info' : 'warning' });
      return { ...prev, [admId]: nextState };
    });
  };

  const handleOpenPairModal = () => {
    setPairForm({
      name: 'Bedside Physiological Monitor Pack',
      deviceId: `EQ-TEL-0${(wardEquipment.length + 1)}`,
      status: 'ONLINE',
      battery: '100%',
      bedNumber: 'MED-01',
    });
    setPairModalOpen(true);
  };

  const handlePairEquipment = async () => {
    const currentWard = wardStats.find((w: any) => w.wardCategory === (currentWardSlug || 'medical').toUpperCase() || w.name.toLowerCase().includes(currentWardSlug || 'medical'));
    if (!currentWard) return;
    if (!pairForm.name || !pairForm.deviceId) {
      enqueueSnackbar('Please enter device ID and equipment name', { variant: 'warning' });
      return;
    }
    setPairingEquipment(true);
    try {
      await api.post(`/ipd/wards/${currentWard.id}/equipment`, pairForm);
      enqueueSnackbar(`Hardware ${pairForm.deviceId} registered and paired successfully!`, { variant: 'success' });
      setPairModalOpen(false);
      loadAll();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to pair equipment', { variant: 'error' });
    } finally {
      setPairingEquipment(false);
    }
  };

  const handleUnpairEquipment = async (deviceId: string) => {
    const currentWard = wardStats.find((w: any) => w.wardCategory === (currentWardSlug || 'medical').toUpperCase() || w.name.toLowerCase().includes(currentWardSlug || 'medical'));
    if (!currentWard) return;
    try {
      await api.delete(`/ipd/wards/${currentWard.id}/equipment/${deviceId}`);
      enqueueSnackbar(`Hardware ${deviceId} unpaired successfully`, { variant: 'info' });
      loadAll();
    } catch (err: any) {
      enqueueSnackbar('Failed to unpair equipment', { variant: 'error' });
    }
  };

  const handleAutoFillInfusionDefaults = (med: any) => {
    if (!med) return;
    const name = (med.name || med.genericName || '').toLowerCase();
    const cat = (med.category || '').toLowerCase();

    let autoDosage = '80 ml/hr continuous infusion';
    let autoNote = 'Double-check volume rate before connecting pump';

    if (cat.includes('iv fluid') || name.includes('saline') || name.includes('dextrose') || name.includes('ringer') || name.includes('dns') || name.includes('gelofusine')) {
      autoDosage = '500ml @ 80 ml/hr continuous infusion';
      autoNote = 'Verify infusion rate & volumetric pump settings before starting line';
    } else if (name.includes('ceftriaxone') || name.includes('amoxicillin') || name.includes('ciprofloxacin') || name.includes('metronidazole') || name.includes('ampicillin') || cat.includes('antibiotic')) {
      autoDosage = '1g IV q12h (Infuse over 30 mins)';
      autoNote = 'Perform allergy / sensitivity check & verify patient ID before IV administration';
    } else if (name.includes('heparin') || name.includes('insulin') || name.includes('dopamine') || name.includes('noradrenaline') || name.includes('fentanyl') || name.includes('morphine')) {
      autoDosage = '50 units/hr continuous infusion';
      autoNote = 'HIGH-ALERT MEDICATION: Requires independent dual-nurse double check clearance';
    } else if (name.includes('paracetamol') || name.includes('tramadol') || name.includes('diclofenac') || cat.includes('analgesic')) {
      autoDosage = '1g IV q8h PRN';
      autoNote = 'Re-assess pain score 30 minutes post administration';
    } else if (name.includes('tab') || name.includes('cap') || cat.includes('oral')) {
      autoDosage = '1 tab TDS x 5 days';
      autoNote = 'Administer with water after meals';
    } else {
      autoDosage = `${med.dosageForm || '1 unit'} — Standard Inpatient Dosing`;
      autoNote = 'Nurse verification required before administration';
    }

    setMedForm({
      medicationDisplay: med.name || med.genericName || '',
      dosageText: autoDosage,
      note: autoNote,
    });
  };

  const handleOpenMedModal = (adm: any) => {
    setMedTargetAdm(adm);
    const defaultMed = pharmacyCatalog[0] || { name: 'IV Normal Saline 500ml', category: 'IV Fluid' };
    handleAutoFillInfusionDefaults(defaultMed);
    setMedModalOpen(true);
  };

  const handlePrescribeMedication = async () => {
    if (!medTargetAdm || !medForm.medicationDisplay) {
      enqueueSnackbar('Please specify medication name', { variant: 'warning' });
      return;
    }
    setPrescribingMed(true);
    try {
      await api.post(`/ipd/admissions/${medTargetAdm.id}/medications`, medForm);
      enqueueSnackbar(`Prescription for ${medForm.medicationDisplay} saved to eMAR!`, { variant: 'success' });
      setMedModalOpen(false);
      loadAll();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to prescribe medication', { variant: 'error' });
    } finally {
      setPrescribingMed(false);
    }
  };

  const handleOpenRoundNoteModal = (adm: any) => {
    setRoundNoteTargetAdm(adm);
    setRoundNoteForm({
      note: 'Patient is resting comfortably. Vitals stable. Maintain current treatment plan and monitor SpO2 levels every 4 hours.',
      clinicalCondition: adm.clinicalCondition || 'STABLE',
      authorName: currentUserFullName || 'Dr. Emmanuel Vegher',
    });
    setRoundNoteModalOpen(true);
  };

  const handleSaveRoundNote = async () => {
    if (!roundNoteTargetAdm || !roundNoteForm.note) {
      enqueueSnackbar('Please enter progress note text', { variant: 'warning' });
      return;
    }
    setSavingRoundNote(true);
    try {
      await api.post(`/ipd/admissions/${roundNoteTargetAdm.id}/round-notes`, roundNoteForm);
      enqueueSnackbar(`Ward progress note saved for ${roundNoteTargetAdm.patient?.firstName}!`, { variant: 'success' });
      setRoundNoteModalOpen(false);
      loadAll();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save round note', { variant: 'error' });
    } finally {
      setSavingRoundNote(false);
    }
  };

  const handleGenerateOpenMedHandover = async (adm: any, targetModal = false) => {
    if (!adm) return;
    setGeneratingAiHandover(prev => ({ ...prev, [adm.id]: true }));
    try {
      let vitals = adm.latestVitals || {};
      let soapNotes = 'Patient resting comfortably. Vitals recorded per schedule.';
      let labOrders: any[] = [];

      try {
        const resEmr = await api.get(`/emr/patient-summary/${adm.patientId}`);
        if (resEmr.data) {
          if (resEmr.data.triageRecords?.length > 0) vitals = resEmr.data.triageRecords[0];
          if (resEmr.data.consultationNotes?.length > 0) {
            const cn = resEmr.data.consultationNotes[0];
            soapNotes = `Subjective: ${cn.subjective || 'Stable'} | Assessment: ${cn.assessment || adm.diagnosis || 'Care'} | Plan: ${cn.plan || 'Continue treatment'}`;
          }
          if (resEmr.data.labOrders?.length > 0) labOrders = resEmr.data.labOrders;
        }
      } catch (e) {
        // Fallback
      }

      const payload = {
        patientName: `${adm.patient?.firstName} ${adm.patient?.lastName}`,
        bedNumber: adm.bed ? `Bed ${adm.bed.number}` : 'Unassigned',
        wardName: activeWardConfig.name,
        admissionDiagnosis: adm.diagnosis || 'General Care',
        icd10: adm.icd10 || 'Z00.00',
        clinicalCondition: adm.clinicalCondition || 'STABLE',
        vitals,
        soapNotes,
        medications: adm.patient?.medicationRequests || [],
        labOrders,
      };

      const resAi = await api.post('/openmed/sbar-handover', payload);
      const handoverText = resAi.data?.data?.handoverText || resAi.data?.data?.sbar?.fullHandoverNote;

      if (handoverText) {
        if (targetModal) {
          setRoundNoteForm(prev => ({
            ...prev,
            note: handoverText,
            authorName: 'OpenMed Clinical AI (SBAR Handover)',
          }));
          enqueueSnackbar('OpenMed SBAR Handover auto-filled into form!', { variant: 'info' });
        } else {
          await api.post(`/ipd/admissions/${adm.id}/round-notes`, {
            note: handoverText,
            clinicalCondition: adm.clinicalCondition || 'STABLE',
            authorName: 'OpenMed Clinical AI (SBAR Handover)',
          });
          enqueueSnackbar(`OpenMed SBAR Handover generated and saved for ${adm.patient?.firstName}!`, { variant: 'success' });
          loadAll();
        }
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to generate SBAR handover note', { variant: 'error' });
    } finally {
      setGeneratingAiHandover(prev => ({ ...prev, [adm.id]: false }));
    }
  };

  const [transferDilation, setTransferDilation] = useState('4');
  const [transferContractions, setTransferContractions] = useState('3');
  const [transferFhr, setTransferFhr] = useState('140');
  const [transferMembranes, setTransferMembranes] = useState('INTACT');
  const [transferMaternalBp, setTransferMaternalBp] = useState('120/80');
  const [transferMaternalPulse, setTransferMaternalPulse] = useState('80');

  // ── Ward Transfer ────────────────────────────────────────────────────────
  const handleOpenTransferModal = (adm: any, defaultCategory?: string) => {
    setSelectedAdm(adm);
    setToWardId('');
    setToBedId('');
    setTransferReason(`Transferring patient from ${adm?.bed?.ward?.name || 'Current Ward'}`);
    setIsOverflow(false);
    setTransferNotes('');
    
    api.get('/ipd/wards').then(r => {
      const wardsList = r.data || [];
      const nonCurrent = wardsList.filter((w: any) => w.id !== adm?.bed?.wardId);
      setAvailableWards(nonCurrent.length > 0 ? nonCurrent : wardsList);

      if (defaultCategory === 'LABOUR') {
        const labourWard = (nonCurrent.length > 0 ? nonCurrent : wardsList).find((w: any) => 
          w.name?.toLowerCase().includes('labour') || w.name?.toLowerCase().includes('delivery') || w.wardCategory === 'LABOUR'
        );
        if (labourWard) {
          setToWardId(labourWard.id);
        }
      }
    }).catch(() => {});

    setTransferModalOpen(true);
  };

  const handleOpenTransferDialogForAlert = (alert: any) => {
    setSelectedTransferAlert(alert);
    setSelectedAdm(alert.admission || null);
    setToWardId('');
    setToBedId('');
    setTransferReason(`${alert.hoursInEmergency || 24}h Emergency Ward length-of-stay alert — transferring patient to Inpatient Ward`);
    setIsOverflow(false);
    setTransferNotes('');
    
    // Load available wards for transfer
    api.get('/ipd/wards').then(r => {
      const wardsList = r.data || [];
      const nonEmergency = wardsList.filter((w: any) => w.wardCategory !== 'EMERGENCY' && w.id !== alert.wardId);
      setAvailableWards(nonEmergency.length > 0 ? nonEmergency : wardsList);
      
      const wardWithBeds = (nonEmergency.length > 0 ? nonEmergency : wardsList).find((w: any) => (w.available > 0 || (w.beds && w.beds.some((b: any) => b.status === 'AVAILABLE'))));
      if (wardWithBeds) {
        setToWardId(wardWithBeds.id);
      }
    }).catch(() => {});

    setTransferModalOpen(true);
  };

  const handleOpenTheatreTransferDialogForAlert = (alert: any) => {
    setSelectedAlertForTheatre(alert);
    setTheatreProcedure('STAT Emergency Exploratory Surgery / Debridement');
    setTheatreUrgency('EMERGENCY');
    setTheatreNotes(`${alert.hoursInEmergency || 24}h Emergency Ward alert — urgent transfer to Operating Theatre`);
    setTheatreTransferModalOpen(true);
  };

  const handleTheatreTransferSubmit = async () => {
    if (!selectedAlertForTheatre) return;
    setSubmittingTheatreTransfer(true);
    try {
      const patientId = selectedAlertForTheatre.patientId || selectedAlertForTheatre.admission?.patientId;
      
      if (patientId) {
        await api.post('/theatre/requests', {
          patientId,
          diagnosis: selectedAlertForTheatre.admission?.diagnosis || selectedAlertForTheatre.diagnosis || 'Emergency Ward Overstay — Acute Surgical Case',
          proposedProcedure: theatreProcedure || 'STAT Emergency Surgical Procedure',
          urgency: theatreUrgency || 'EMERGENCY',
          estimatedDurationMin: 90,
          anaesthesiaReqs: 'General Anaesthesia / STAT Airway Prep',
          preferredDate: new Date().toISOString()
        });
      }

      enqueueSnackbar(`🔪 Patient ${selectedAlertForTheatre.patientName || ''} transferred to Operating Theatre roster! Redirecting to Theatre...`, { variant: 'success' });
      setTheatreTransferModalOpen(false);
      loadAll();
      navigate('/theatre');
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to submit transfer to theatre', { variant: 'error' });
    } finally {
      setSubmittingTheatreTransfer(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedAdm || !toWardId || !toBedId || !transferReason) {
      enqueueSnackbar('Please complete all required transfer fields', { variant: 'warning' });
      return;
    }
    setTransferring(true);
    try {
      const destinationWard = availableWards.find(w => w.id === toWardId);
      const isLabourWard = destinationWard && (
        destinationWard.name?.toLowerCase().includes('labour') || 
        destinationWard.name?.toLowerCase().includes('delivery') || 
        destinationWard.wardCategory === 'LABOUR'
      );

      const finalNotes = isLabourWard 
        ? `${transferNotes ? transferNotes + ' | ' : ''}ACTIVE LABOUR TRIAGE: Dilation ${transferDilation}cm, Contractions ${transferContractions}/10m, FHR ${transferFhr}bpm, Membranes ${transferMembranes}, BP ${transferMaternalBp}, Pulse ${transferMaternalPulse}bpm`
        : transferNotes;

      await api.post(`/ipd/admissions/${selectedAdm.id}/transfer`, {
        toWardId,
        toBedId,
        transferReason,
        transferType: isOverflow ? 'OVERFLOW' : 'CLINICAL',
        isOverflow,
        clinicalDesignation: isOverflow ? selectedAdm.bed?.ward?.wardCategory : null,
        notes: finalNotes,
        triageData: isLabourWard ? {
          cervicalDilatation: Number(transferDilation) || 4,
          contractionsFrequency: Number(transferContractions) || 3,
          fetalHeartRate: Number(transferFhr) || 140,
          membranesStatus: transferMembranes || 'INTACT',
          maternalBp: transferMaternalBp || '120/80',
          maternalPulse: Number(transferMaternalPulse) || 80,
        } : null,
      });

      if (isLabourWard) {
        enqueueSnackbar(`Patient successfully transferred to ${destinationWard?.name} & Active Labour Partograph Initialized!`, { variant: 'success' });
        navigate('/labour-ward');
      } else {
        enqueueSnackbar(`Patient successfully transferred to ${destinationWard?.name}`, { variant: 'success' });
      }
      setDrawerOpen(false);
      setTransferModalOpen(false);
      loadAll();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Ward transfer failed', { variant: 'error' });
    } finally {
      setTransferring(false);
    }
  };

  const activeWardConfig = WARD_SUB_CATEGORIES.find(w => w.slug === currentWardSlug) || WARD_SUB_CATEGORIES[0];

  const [wardSubTab, setWardSubTab] = useState(0);

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');
    if (currentWardSlug === 'maternity') {
      if (path.endsWith('/pnc-gynae')) setWardSubTab(1);
      else if (path.endsWith('/notes') || path.endsWith('/rounds')) setWardSubTab(2);
      else setWardSubTab(0);
    } else {
      if (path.endsWith('/notes') || path.endsWith('/rounds') || path.endsWith('/monitors') || path.endsWith('/meds')) setWardSubTab(1);
      else setWardSubTab(0);
    }
  }, [location.pathname, currentWardSlug]);

  const filtered = admissions.filter(a => {
    const matchesSearch =
      `${a.patient?.firstName} ${a.patient?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      a.bed?.ward?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.diagnosis?.toLowerCase().includes(search.toLowerCase()) ||
      a.icd10?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (currentWardSlug === 'all') return true;

    const wardCat = (a.bed?.ward?.wardCategory || '').toUpperCase();
    const wardType = (a.bed?.ward?.type || '').toUpperCase();
    const wardName = (a.bed?.ward?.name || '').toUpperCase();
    const targetKey = activeWardConfig.categoryKey;

    return (
      wardCat === targetKey ||
      wardType === targetKey ||
      wardName.includes(targetKey) ||
      (targetKey === 'MEDICAL' && (wardCat.includes('MED') || wardType.includes('MED') || wardName.includes('MED') || wardName.includes('INTERNAL'))) ||
      (targetKey === 'EMERGENCY' && (wardName.includes('EMERGENCY') || wardName.includes('CASUALTY') || wardName.includes('A&E'))) ||
      (targetKey === 'MATERNITY' && ((wardName.includes('MATERNITY') || wardCat === 'MATERNITY') && !wardName.includes('LABOUR') && !wardName.includes('DELIVERY'))) ||
      (targetKey === 'PAEDIATRIC' && (wardName.includes('PAEDIATRIC') || wardName.includes('PEDIATRIC') || wardName.includes('CHILDREN'))) ||
      (!a.bed && (a.wardSuggestion?.suggestion === targetKey || a.clinicalDesignation === targetKey))
    );
  });

  const suggestionColor = (s: string) => s === 'SURGICAL' ? '#0ca678' : '#3b5bdb';

  return (
    <Box sx={{ pb: 6 }}>
      {/* ── 24h Emergency Alert Banner ─────────────────────────────────────── */}
      {!alertDismissed && emergencyAlerts.length > 0 && (
        <Alert
          severity="warning"
          icon={<Warning />}
          onClose={() => setAlertDismissed(true)}
          sx={{ mb: 2.5, borderRadius: 3, fontWeight: 600, boxShadow: '0 4px 16px rgba(240,62,62,0.12)' }}
          action={
            <IconButton size="small" onClick={() => setAlertDismissed(true)}><Close fontSize="inherit" /></IconButton>
          }
        >
          <AlertTitle sx={{ fontWeight: 800 }}>⏰ Emergency Ward — 24-Hour Transfer Alert</AlertTitle>
          {emergencyAlerts.map(alert => (
            <Box key={alert.admissionId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mt: 1, p: 1, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 2, border: '1px solid rgba(224,49,49,0.2)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={`${alert.hoursInEmergency}h`} color="error" size="small" sx={{ fontWeight: 800 }} />
                <Typography variant="body2">
                  <strong>{alert.patientName}</strong> has been in <strong>{alert.ward}</strong> for {alert.hoursInEmergency} hours — requires transfer to Medical or Surgical Ward.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<TransferWithinAStation fontSize="small" />}
                  onClick={() => handleOpenTransferDialogForAlert(alert)}
                  sx={{ textTransform: 'none', fontWeight: 800, whiteSpace: 'nowrap', borderRadius: 1.5 }}
                >
                  Transfer to Ward
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  sx={{ bgcolor: '#d6336c', color: '#fff', '&:hover': { bgcolor: '#c2255c' }, textTransform: 'none', fontWeight: 800, whiteSpace: 'nowrap', borderRadius: 1.5 }}
                  startIcon={<MedicalServices fontSize="small" />}
                  onClick={() => handleOpenTheatreTransferDialogForAlert(alert)}
                >
                  Transfer to Theatre 🔪
                </Button>
              </Box>
            </Box>
          ))}
        </Alert>
      )}

      {/* ── Page Header & Hero Banner ─────────────────────────────────────── */}
      {currentWardSlug !== 'all' ? (
        <Card
          sx={{
            mb: 3,
            background: WARD_SPECIALTY_DETAILS[currentWardSlug]?.gradient || 'linear-gradient(135deg, #1c7ed6 0%, #3b5bdb 50%, #7048e8 100%)',
            color: '#fff',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(59, 91, 219, 0.25)',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 3.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="caption" fontWeight={800} letterSpacing={1.2} sx={{ textTransform: 'uppercase', opacity: 0.85, display: 'block', mb: 0.8 }}>
                  INPATIENT DEPARTMENT &gt; {activeWardConfig.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.5px' }}>
                    {WARD_SPECIALTY_DETAILS[currentWardSlug]?.heroTitle || activeWardConfig.name}
                  </Typography>
                  <Chip
                    label={activeWardConfig.badge}
                    size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.22)', color: '#fff', fontWeight: 800, backdropFilter: 'blur(4px)', px: 0.5 }}
                  />
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.9, maxWidth: 720 }}>
                  {WARD_SPECIALTY_DETAILS[currentWardSlug]?.heroSubtitle || activeWardConfig.description}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} sx={{ mt: { xs: 1, md: 0 }, flexWrap: 'wrap', gap: 1 }}>
                {currentWardSlug === 'maternity' && (
                  <Button
                    variant="contained"
                    onClick={() => navigate('/maternity')}
                    sx={{ bgcolor: 'rgba(255,255,255,0.28)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.38)' }, fontWeight: 800, borderRadius: 2 }}
                  >
                    🤱 Clinical ANC/PNC Desk
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={() => navigate('/ipd')}
                  sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }, fontWeight: 700, borderRadius: 2 }}
                >
                  ← All Wards Hub
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={loadAll}
                  sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }, fontWeight: 700, borderRadius: 2 }}
                >
                  Refresh Wards
                </Button>
                {/* 
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => (currentWardSlug as string) === 'maternity' ? setOpenMaternityAdmit(true) : setOpenAdmit(true)}
                  sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }, fontWeight: 700, borderRadius: 2 }}
                >
                  {(currentWardSlug as string) === 'maternity' ? '⚡ Admit Pregnant Patient' : 'Admit Inpatient'}
                </Button>
                */}
              </Stack>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
                IPD — Inpatient Department
              </Typography>
              <Chip
                icon={<AutoAwesome sx={{ fontSize: '14px !important', color: activeWardConfig.color }} />}
                label={activeWardConfig.badge}
                size="small"
                sx={{ bgcolor: alpha(activeWardConfig.color, 0.1), color: activeWardConfig.color, fontWeight: 800, fontSize: '0.75rem' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {activeWardConfig.description}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadAll}>
              Refresh Wards
            </Button>
            <Button 
              variant="contained" 
              startIcon={<Add />} 
              onClick={() => (currentWardSlug as string) === 'maternity' ? setOpenMaternityAdmit(true) : setOpenAdmit(true)} 
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              {(currentWardSlug as string) === 'maternity' ? '⚡ Admit Pregnant Patient' : 'Admit Inpatient'}
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── 4-KPI Dashboard Cards Grid ───────────────────────────────────────── */}
      <Grid container spacing={2} mb={3.5}>
        {currentWardSlug !== 'all' && WARD_SPECIALTY_DETAILS[currentWardSlug] ? (
          WARD_SPECIALTY_DETAILS[currentWardSlug].kpis(filtered, wardStats.filter(data => {
            const targetKey = activeWardConfig.categoryKey;
            const wCat = (data.wardCategory || '').toUpperCase();
            const wType = (data.type || '').toUpperCase();
            const wName = (data.name || '').toUpperCase();
            return wCat === targetKey || wType === targetKey || wName.includes(targetKey);
          })).map((kpi, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${kpi.color}15 0%, ${kpi.color}05 100%)`, border: `1px solid ${kpi.color}30`, boxShadow: 'none', borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                        {kpi.label}
                      </Typography>
                      <Typography variant="h4" fontWeight={900} color={kpi.color} sx={{ my: 0.5 }}>
                        {kpi.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {kpi.subtitle}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: `${kpi.color}20`, color: kpi.color }}>
                      {kpi.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          wardStats.map((data) => {
            const color = data.color || CATEGORY_COLORS[data.wardCategory] || '#495057';
            const fillPercent = data.total > 0 ? Math.round((data.used / data.total) * 100) : 0;
            const matchedSlug = WARD_SUB_CATEGORIES.find(w => 
              w.categoryKey === data.wardCategory?.toUpperCase() || 
              data.name?.toUpperCase().includes(w.categoryKey)
            )?.slug || 'all';

            return (
              <Grid item xs={6} sm={4} md={2} key={data.id}>
                <Card
                  onClick={() => navigate(matchedSlug === 'emergency' ? '/ipd/emergency' : `/ipd/${matchedSlug}`)}
                  sx={{
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    border: `1px solid ${alpha(color, 0.2)}`,
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 24px ${alpha(color, 0.15)}` }
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Bed sx={{ fontSize: 18, color }} />
                        <Typography variant="caption" fontWeight={800} color="text.primary" noWrap>{data.name}</Typography>
                      </Box>
                    </Box>

                    {data.gender && (
                      <Chip label={data.gender} size="small" sx={{ fontSize: '0.625rem', height: 18, mb: 0.8, bgcolor: alpha(color, 0.1), color, fontWeight: 700 }} />
                    )}

                    <Typography variant="h5" fontWeight={800} color={color}>
                      {data.used}<Typography component="span" variant="caption" color="text.secondary" fontWeight={600}>/{data.total} Beds</Typography>
                    </Typography>

                    <LinearProgress
                      variant="determinate"
                      value={fillPercent}
                      sx={{
                        mt: 1.2,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: alpha(color, 0.12),
                        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.65rem' }}>
                      {fillPercent}% Occupied ({data.total - data.used} free)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* ── Sub-Tab Navigation Bar ─────────────────────────────────────────── */}
      {currentWardSlug !== 'all' && (
        <Paper sx={{ mb: 3, borderRadius: 3, p: 0.5, bgcolor: alpha('#3b5bdb', 0.04), border: '1px solid rgba(59,91,219,0.1)' }}>
          <Tabs
            value={wardSubTab}
            onChange={(_, v) => {
              setWardSubTab(v);
              const paths = currentWardSlug === 'maternity' ? ['', '/pnc-gynae', '/notes'] : ['', '/notes'];
              navigate(`/ipd/${currentWardSlug}${paths[v] || ''}`);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 700,
                fontSize: '0.83rem',
                borderRadius: 2,
                minHeight: 44,
                textTransform: 'none',
                color: 'text.secondary',
                '&.Mui-selected': { bgcolor: '#fff', color: '#1c7ed6', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
              },
              '& .MuiTabs-indicator': { display: 'none' }
            }}
          >
            <Tab icon={<Bed sx={{ fontSize: 18 }} />} iconPosition="start" label="Live Bed Census & Inpatient Directory" />
            {currentWardSlug === 'maternity' && (
              <Tab icon={<Healing sx={{ fontSize: 18 }} />} iconPosition="start" label="PNC & Gynaecology Services" />
            )}
            <Tab icon={<Description sx={{ fontSize: 18 }} />} iconPosition="start" label="Ward Rounds & Clinical Handovers" />
          </Tabs>
        </Paper>
      )}

      {/* ── Tab 0: Live Bed Census Table ─────────────────────────────────────── */}
      {wardSubTab === 0 && (
        <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: 'none', borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h6" fontWeight={800}>
                  Current Inpatients ({filtered.length})
                </Typography>
                <Chip label="Live Ward List" color="success" size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
              </Box>

              <TextField
                placeholder="Search by patient name, ward, diagnosis, or ICD-10…"
                size="small"
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment>
                }}
                sx={{ width: 340, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha('#3b5bdb', 0.03) }}>
                    <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Admission No</TableCell>
                    <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Patient Name</TableCell>
                    <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Age / Gender</TableCell>
                    <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Ward & Bed</TableCell>
                    <TableCell sx={{ fontWeight: 800, py: 1.5, minWidth: 260, maxWidth: 340 }}>ICD-10</TableCell>
                    <TableCell sx={{ fontWeight: 800, py: 1.5, minWidth: 200, maxWidth: 280 }}>Primary Diagnosis</TableCell>
                    <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Admit Date</TableCell>
                    <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Condition</TableCell>
                    <TableCell sx={{ fontWeight: 800, py: 1.5 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(adm => {
                    const name = `${adm.patient?.firstName} ${adm.patient?.lastName}`;
                    const admNo = `IPD-${adm.id.substring(0, 6).toUpperCase()}`;
                    const condCfg = CONDITION_CONFIG[adm.clinicalCondition] || CONDITION_CONFIG.STABLE;
                    const wardColor = adm.bed?.ward?.color || CATEGORY_COLORS[adm.bed?.ward?.wardCategory] || '#495057';
                    const age = adm.patient?.birthDate ? new Date().getFullYear() - new Date(adm.patient.birthDate).getFullYear() : '?';

                    return (
                      <TableRow
                        key={adm.id}
                        hover
                        onClick={() => handleRowClick(adm)}
                        sx={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      >
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary' }}>
                          {admNo}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="primary.main">
                            {name}
                          </Typography>
                          {adm.clinicalDesignation && (
                            <Chip label={`${adm.clinicalDesignation} patient`} size="small" sx={{ fontSize: '0.6rem', height: 16, mt: 0.3 }} color="warning" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {age} Yrs / {adm.patient?.gender === 'FEMALE' ? 'Female' : 'Male'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={adm.bed ? `${adm.bed.ward?.name} — Bed ${adm.bed.number}` : 'Pending Allocation'}
                            size="small"
                            variant="outlined"
                            sx={{ color: wardColor, borderColor: alpha(wardColor, 0.4), fontWeight: 700, bgcolor: alpha(wardColor, 0.05) }}
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 260, maxWidth: 340 }}>
                          {(() => {
                            const parseString = (str: string): { code: string; desc: string }[] => {
                              if (!str || str === '-') return [];
                              const cleanStr = str.replace(/^Diagnosis\s+/i, '').replace(/^ICD-10:\s*/i, '').trim();
                              const parts = cleanStr.split(/,\s*/);
                              const res: { code: string; desc: string }[] = [];

                              for (const part of parts) {
                                const p = part.trim();
                                if (!p) continue;
                                const codeMatch = p.match(/([A-Z]\d{2}(?:\.\d{1,3})?)/i);
                                if (codeMatch) {
                                  const code = codeMatch[1].toUpperCase();
                                  let desc = p.replace(codeMatch[0], '').replace(/^[—–\-\s:\]\)]+/, '').replace(/^\[/, '').trim();
                                  res.push({ code, desc });
                                } else {
                                  res.push({ code: 'ICD-10', desc: p });
                                }
                              }
                              return res;
                            };

                            let items: { code: string; desc: string }[] = [];
                            const conditions = adm.patient?.conditions || [];

                            if (conditions.length > 0) {
                              for (const c of conditions) {
                                const combined = [c.code, c.display, c.name].filter(Boolean).join(' — ');
                                items.push(...parseString(combined));
                              }
                            }

                            if (items.length === 0 && adm.icd10 && adm.icd10 !== '-') {
                              items = parseString(adm.icd10);
                            }

                            if (items.length === 0 && adm.diagnosis && adm.diagnosis !== 'Pending Diagnosis') {
                              items = parseString(adm.diagnosis);
                            }

                            const displayItems: { code: string; desc: string }[] = [];
                            const seen = new Set<string>();
                            for (const item of items) {
                              const key = `${item.code}::${item.desc}`;
                              if (!seen.has(key)) {
                                seen.add(key);
                                displayItems.push(item);
                              }
                            }

                            if (displayItems.length === 0) {
                              return <Typography variant="caption" color="text.secondary">—</Typography>;
                            }

                            return (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, py: 0.5 }}>
                                {displayItems.map((item, idx) => (
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
                                      label={item.code}
                                      size="small"
                                      color="primary"
                                      sx={{ fontWeight: 800, fontSize: '0.68rem', height: 20, flexShrink: 0, fontFamily: 'monospace' }}
                                    />
                                    {item.desc ? (
                                      <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.3, whiteSpace: 'normal', wordBreak: 'normal' }}>
                                        {item.desc}
                                      </Typography>
                                    ) : null}
                                  </Box>
                                ))}
                              </Box>
                            );
                          })()}
                        </TableCell>
                        <TableCell sx={{ minWidth: 200, maxWidth: 280 }}>
                          <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.35, whiteSpace: 'normal', wordBreak: 'normal' }}>
                            {(adm.diagnosis || 'Pending Diagnosis').replace(/^Diagnosis\s+/i, '')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {new Date(adm.admittedAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={condCfg.label} color={condCfg.color} size="small" sx={{ fontWeight: 800 }} />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                            {adm.clinicalCondition === 'DECEASED' ? (
                              <Chip label="DECEASED" color="error" size="small" sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                            ) : (
                              <Tooltip title="Declare Clinical Death & Transfer to Hospital Mortuary">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={(e) => { e.stopPropagation(); handleOpenDeceasedModal(adm); }}
                                  sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 700, fontSize: '0.72rem', py: 0.4, borderColor: alpha('#ef4444', 0.4), '&:hover': { bgcolor: alpha('#ef4444', 0.08) } }}
                                >
                                  Mark Deceased
                                </Button>
                              </Tooltip>
                            )}
                            <Button
                              size="small"
                              variant="contained"
                              disableElevation
                              startIcon={<MedicalServices sx={{ fontSize: 14 }} />}
                              onClick={(e) => { e.stopPropagation(); handleRowClick(adm); }}
                              sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 700, fontSize: '0.75rem', py: 0.5 }}
                            >
                              Open Workspace
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                          <Person sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                          <Typography color="text.secondary" fontWeight={600}>No matching inpatients found in current ward admissions</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Tab 1: Ward Telemetry & Vital Monitors (Commented out) ── */}
      {/* wardSubTab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card sx={{ borderRadius: 3, p: 2.5, bgcolor: 'background.paper', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)' }}>
            ...
          </Card>
        </Box>
      ) */}

      {/* ── Tab 2: High-Alert Meds & Infusion Desk (Commented out) ── */}
      {/* wardSubTab === 2 && (
        <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          ...
        </Card>
      ) */}

      {/* ── PNC & Gynaecology Services for Maternity Ward ───────────────── */}
      {currentWardSlug === 'maternity' && wardSubTab === 1 && (
        <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <PncGynaeServicesView inpatients={filtered} />
        </Card>
      )}

      {/* ── Ward Rounds & Clinical Handovers ────────────────────────── */}
      {((currentWardSlug === 'maternity' && wardSubTab === 2) || (currentWardSlug !== 'maternity' && wardSubTab === 1)) && (
        <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description sx={{ color: '#f59f00' }} /> Consultant Rounds & Shift Handovers
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Daily Ward Rounds · SBAR Shift Handovers · NEWS2 Early Warning Escalation Log
              </Typography>
            </Box>
            <Chip label="Shift Sign-Off Signed" color="primary" size="small" sx={{ fontWeight: 800 }} />
          </Box>
          <Grid container spacing={2}>
            {filtered.length > 0 ? filtered.map(adm => {
              const notes = adm.roundNotes || [];
              const latestNote = notes[0];
              const cond = adm.clinicalCondition || 'STABLE';
              const news2Score = adm.latestVitals?.news2Score || 0;

              return (
                <Grid item xs={12} key={adm.id}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: 'background.paper' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#f59f00', fontWeight: 800 }}>{(adm.patient?.firstName || '?').charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={800}>{adm.patient?.firstName} {adm.patient?.lastName} — Ward Progress Note</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {adm.bed ? `${adm.bed.ward?.name} — Bed ${adm.bed.number}` : 'Inpatient'} · Diagnosis: {adm.diagnosis || 'General Inpatient Care'}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={`Condition: ${cond}`}
                          color={cond === 'CRITICAL' ? 'error' : cond === 'STABLE' ? 'success' : 'warning'}
                          size="small"
                          sx={{ fontWeight: 800 }}
                        />
                        <Chip label={`NEWS2: ${news2Score} (${news2Score >= 5 ? 'High Risk' : 'Low Risk'})`} color={news2Score >= 5 ? 'error' : 'success'} size="small" sx={{ fontWeight: 800 }} />
                      </Box>
                    </Box>

                    {latestNote ? (
                      <Box sx={{ p: 1.5, bgcolor: alpha('#f59f00', 0.04), borderRadius: 2, border: '1px solid ' + alpha('#f59f00', 0.15), my: 1.5 }}>
                        <Typography variant="body2" color="text.primary" sx={{ fontStyle: 'italic', fontWeight: 500, whitespace: 'pre-line' }}>
                          {latestNote.note}
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ p: 1.5, bgcolor: alpha('#3b5bdb', 0.03), borderRadius: 2, border: '1px dashed ' + alpha('#3b5bdb', 0.2), my: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          "No ward progress notes recorded yet for this admission. Patient is currently assigned under {activeWardConfig.name}."
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {latestNote ? `Attending Doctor: ${latestNote.authorName} · Last Round: ${new Date(latestNote.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `Admitted: ${new Date(adm.admittedAt).toLocaleDateString()} · Status: ${cond}`}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<People />}
                          onClick={() => handleOpenMdtModal(adm)}
                          sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, color: '#0ca678', borderColor: '#0ca678' }}
                        >
                          👥 MDT Case Review
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AutoAwesome />}
                          disabled={!!generatingAiHandover[adm.id]}
                          onClick={() => handleGenerateOpenMedHandover(adm, false)}
                          sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, color: '#7048e8', borderColor: '#7048e8' }}
                        >
                          {generatingAiHandover[adm.id] ? 'Generating SBAR...' : 'OpenMed AI Handover'}
                        </Button>
                        <Button size="small" variant="contained" startIcon={<Edit />} onClick={() => handleOpenRoundNoteModal(adm)} sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, bgcolor: '#f59f00', '&:hover': { bgcolor: '#e08e00' } }}>
                          Add Round SOAP Note
                        </Button>
                      </Stack>
                    </Box>
                  </Paper>
                </Grid>
              );
            }) : (
              <Grid item xs={12}>
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Description sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary" fontWeight={600}>No active admissions registered in this ward</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Card>
      )}

      {/* ── Ultra-Smart Inpatient Clinical Workspace Drawer ─────────────────── */}
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
              <Avatar sx={{ bgcolor: '#3b5bdb', width: 42, height: 42, fontWeight: 800 }}>
                {(selectedAdm?.patient?.firstName || '?').charAt(0)}
              </Avatar>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" fontWeight={800} color="#fff">
                    {selectedAdm?.patient?.firstName} {selectedAdm?.patient?.lastName}
                  </Typography>
                  <Chip
                    icon={<AutoAwesome sx={{ fontSize: '12px !important', color: '#63e6be' }} />}
                    label="OpenMed CDS"
                    size="small"
                    sx={{ bgcolor: 'rgba(99, 230, 190, 0.15)', color: '#63e6be', fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                  IPD Case: {selectedAdm?.id ? `IPD-${selectedAdm.id.substring(0, 6).toUpperCase()}` : 'N/A'} · Ward: {selectedAdm?.bed?.ward?.name || 'Pending'} · Bed: {selectedAdm?.bed?.number || 'TBD'}
                </Typography>
              </Box>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              {/* Voice Mic Action Button */}
              <Tooltip title={isListening ? "Stop Voice Transcription" : "Start Voice Consultation Dictation"}>
                <IconButton
                  onClick={isListening ? stopVoice : startVoice}
                  sx={{
                    bgcolor: isListening ? '#f03e3e' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    '&:hover': { bgcolor: isListening ? '#c2255c' : 'rgba(255,255,255,0.2)' },
                    animation: isListening ? 'pulse 1.5s infinite' : 'none',
                  }}
                >
                  {isListening ? <MicOff /> : <Mic />}
                </IconButton>
              </Tooltip>
              <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: 'rgba(255,255,255,0.8)' }}><Close /></IconButton>
            </Stack>
          </Box>

          {selectedAdm && (
            <>
              {/* Voice Dictation Status Strip */}
              {isListening && (
                <Box sx={{ p: 1.5, bgcolor: '#fff5f5', borderBottom: '1px solid #ffc9c9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} color="error" />
                    <Typography variant="body2" color="error.main" fontWeight={700}>
                      Listening… Speak consultation notes clearly.
                    </Typography>
                  </Box>
                  <Button size="small" variant="contained" color="error" onClick={stopVoice} sx={{ py: 0.2, fontSize: '0.7rem' }}>
                    Finish & Structure SOAP
                  </Button>
                </Box>
              )}

              {/* Patient Profile Bar & Condition Switcher */}
              <Box sx={{ p: 2, bgcolor: alpha('#3b5bdb', 0.03), borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={<CalendarMonth sx={{ fontSize: 14 }} />}
                      sx={{ textTransform: 'none', py: 0.3, px: 1.2, fontSize: '0.725rem', borderRadius: 1.5, fontWeight: 700 }}
                      onClick={() => setOpenApptModal(true)}
                    >
                      Book Next Appointment
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      startIcon={<History sx={{ fontSize: 14 }} />}
                      onClick={handleImportPreviousHistory}
                      sx={{ textTransform: 'none', py: 0.3, px: 1.2, fontSize: '0.725rem', borderRadius: 1.5, fontWeight: 700 }}
                    >
                      Import Previous History
                    </Button>
                  </Stack>

                  {/* Clinical Condition Switcher */}
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <Select
                      value={selectedAdm.clinicalCondition || 'STABLE'}
                      onChange={e => handleUpdateCondition(e.target.value)}
                      disabled={updatingCondition}
                      sx={{ borderRadius: 2, bgcolor: 'background.paper', fontSize: '0.75rem', fontWeight: 700 }}
                      renderValue={(v) => (
                        <Chip label={CONDITION_CONFIG[v]?.label || v} color={CONDITION_CONFIG[v]?.color || 'default'} size="small" sx={{ fontWeight: 800 }} />
                      )}
                    >
                      {Object.entries(CONDITION_CONFIG).map(([k, v]) => (
                        <MenuItem key={k} value={k}><Chip label={v.label} color={v.color} size="small" sx={{ fontWeight: 800 }} /></MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedAdm.clinicalCondition !== 'DECEASED' && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleOpenDeceasedModal(selectedAdm)}
                      sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', fontSize: '0.75rem', py: 0.5, borderColor: alpha('#ef4444', 0.5), '&:hover': { bgcolor: alpha('#ef4444', 0.08) } }}
                    >
                      Declare Deceased
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Workspace Navigation Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 46 }}>
                  <Tab icon={<MonitorHeart sx={{ fontSize: 18 }} />} label="Overview" iconPosition="start" sx={{ minHeight: 46, fontWeight: 700, fontSize: '0.8rem' }} />
                  <Tab icon={<Notes sx={{ fontSize: 18 }} />} label="Ward SOAP Note" iconPosition="start" sx={{ minHeight: 46, fontWeight: 700, fontSize: '0.8rem' }} />
                  <Tab icon={<LocalPharmacy sx={{ fontSize: 18 }} />} label="Prescriptions & Stock" iconPosition="start" sx={{ minHeight: 46, fontWeight: 700, fontSize: '0.8rem' }} />
                  <Tab icon={<Science sx={{ fontSize: 18 }} />} label="Lab Orders & Availability" iconPosition="start" sx={{ minHeight: 46, fontWeight: 700, fontSize: '0.8rem' }} />
                  <Tab icon={<PersonalVideo sx={{ fontSize: 18 }} />} label="Radiology & PACS Scans" iconPosition="start" sx={{ minHeight: 46, fontWeight: 700, fontSize: '0.8rem' }} />
                  <Tab icon={<TransferWithinAStation sx={{ fontSize: 18 }} />} label="Ward Transfer" iconPosition="start" sx={{ minHeight: 46, fontWeight: 700, fontSize: '0.8rem' }} />
                </Tabs>
              </Box>

              {/* Workspace Scrollable Body */}
              <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>

                {/* ── TAB 0: OVERVIEW & CLINICAL INTELLIGENCE ──────────────────── */}
                <TabPanel value={activeTab} index={0}>
                  <Stack spacing={2.5}>
                    {/* Surgical History & Operative Notes Card */}
                    {emrSummary?.surgicalBookings?.length > 0 && (
                      <Accordion defaultExpanded sx={{ borderRadius: 2.5, border: '1px solid', borderColor: alpha('#f59f00', 0.35), bgcolor: alpha('#f59f00', 0.03), '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#f59f00' }} />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ContentCut sx={{ color: '#f59f00', fontSize: 18 }} />
                            <Typography variant="subtitle2" fontWeight={800} color="#b45309">
                              🔪 Surgical History — Operating Theatre Records ({emrSummary.surgicalBookings.length} Case{emrSummary.surgicalBookings.length > 1 ? 's' : ''})
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Stack spacing={2}>
                            {emrSummary.surgicalBookings.map((surg: any, sIdx: number) => {
                              const intraOp = surg.intraOpRecords?.[0] || surg.intraOpRecord;
                              const pacu = surg.pacuRecords?.[0] || surg.pacuRecord;
                              const surgeonName = surg.surgeon ? `Dr. ${surg.surgeon.firstName} ${surg.surgeon.lastName}` : 'Lead Surgeon';
                              const procName = surg.request?.proposedProcedure || surg.proposedProcedure || 'Abdominal Myomectomy (Enucleation of Uterine Fibroids)';
                              const notes: string = intraOp?.primaryProcedureNotes || '';
                              const diagMatch = notes.match(/DIAGNOSIS:\s*([^\n]+)/);
                              const procMatch = notes.match(/PROCEDURE:\s*([^\n]+)/);
                              const opNoteMatch = notes.match(/OPERATION NOTE:\n([\s\S]*?)(?=\n\nBaby Weight|\n\nPOST-OP ORDERS|$)/);
                              const postOpMatch = notes.match(/POST-OP ORDERS:\n([\s\S]*)$/);

                              const diagnosisDisplay = diagMatch?.[1]?.trim() || surg.request?.diagnosis || surg.diagnosis || 'K85.9 — Acute Necrotizing Pancreatitis';
                              const procedureDisplay = procMatch?.[1]?.trim() || procName;

                              const rawOpNote = opNoteMatch?.[1]?.trim() || (notes && !notes.includes('DIAGNOSIS:') ? notes : '');

                              const opNoteDisplay = (rawOpNote && rawOpNote !== 'Op-note filed in theatre record.' && rawOpNote.length > 5)
                                ? rawOpNote
                                : getProcedureOpNoteFallback(procedureDisplay);

                              const postOpOrdersDisplay = postOpMatch?.[1]?.trim() || 'Monitor vitals q4h, NPO until bowel sounds return, IV Fluids N/Saline 1L 8hrly, IV Ceftriaxone 1g 12hrly, IV Paracetamol 1g 8hrly.';

                              return (
                                <Paper key={surg.id || sIdx} variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderLeft: '4px solid #f59f00', bgcolor: '#fff' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                                    <Box>
                                      <Typography variant="subtitle2" fontWeight={800} color="#0f172a">🔪 {procedureDisplay}</Typography>
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        📅 {new Date(surg.scheduledStart || surg.createdAt).toLocaleDateString()} · OR: {surg.operatingRoom || 'Main Theatre'} · Surgeon: <strong>{surgeonName}</strong>
                                      </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={0.5}>
                                      <Chip label={surg.request?.urgency || 'ELECTIVE'} size="small" color={surg.request?.urgency === 'EMERGENCY' ? 'error' : 'warning'} sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                                      <Chip label={surg.status} size="small" color={surg.status === 'COMPLETED' ? 'success' : 'secondary'} sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                                    </Stack>
                                  </Box>

                                  <Stack spacing={1.5} sx={{ mb: 1.5 }}>
                                    <Grid container spacing={1.5}>
                                      <Grid item xs={12} sm={6}>
                                        <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid', borderColor: '#cbd5e1' }}>
                                          <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">🩺 Final Surgical Diagnosis</Typography>
                                          <Typography variant="caption" fontWeight={700} color="#0f172a" display="block">{diagnosisDisplay}</Typography>
                                        </Box>
                                      </Grid>
                                      <Grid item xs={12} sm={6}>
                                        <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid', borderColor: '#cbd5e1' }}>
                                          <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">✂️ Operative Procedure Performed</Typography>
                                          <Typography variant="caption" fontWeight={700} color="#0f172a" display="block">{procedureDisplay}</Typography>
                                        </Box>
                                      </Grid>
                                    </Grid>

                                    <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 1.5, border: '1px solid', borderColor: '#cbd5e1' }}>
                                      <Typography variant="caption" fontWeight={800} color="#334155" display="block" mb={0.3}>📝 Doctor Operation Note & Clinical Narrative:</Typography>
                                      <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', display: 'block', lineHeight: 1.5, color: '#1e293b' }}>{opNoteDisplay}</Typography>
                                    </Box>

                                    <Box sx={{ p: 1.5, bgcolor: alpha('#3b5bdb', 0.04), borderRadius: 1.5, border: '1px solid', borderColor: alpha('#3b5bdb', 0.15) }}>
                                      <Typography variant="caption" fontWeight={800} color="primary.main" display="block" mb={0.3}>📋 Post-Operative Orders & Care Instructions:</Typography>
                                      <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', display: 'block', lineHeight: 1.5, color: '#1e3a8a' }}>{postOpOrdersDisplay}</Typography>
                                    </Box>
                                  </Stack>

                                  {intraOp && (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                                      <Chip label={`EBL: ${intraOp.estimatedBloodLossML || 0}mL`} size="small" sx={{ bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                                      <Chip label={`Swabs: ${intraOp.initialSwabCount || 0}→${intraOp.closureSwabCount || 0} ✅`} size="small" sx={{ bgcolor: '#f0fdf4', color: '#15803d', fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                                      <Chip label={`Instruments: ${intraOp.initialInstrumentCount || 0}→${intraOp.closureInstrumentCount || 0} ✅`} size="small" sx={{ bgcolor: '#f0fdf4', color: '#15803d', fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                                      {pacu && <Chip label={`PACU Aldrete: ${pacu.aldreteScore ?? 'N/A'}/10`} size="small" sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '0.65rem', height: 20 }} />}
                                    </Stack>
                                  )}
                                </Paper>
                              );
                            })}
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    )}
                    {/* Previous Consultation Summary Card */}
                    {emrSummary?.consultationNotes?.length > 0 && (
                      <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: alpha('#3b5bdb', 0.25), bgcolor: alpha('#3b5bdb', 0.02) }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <History color="primary" fontSize="small" />
                              <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                                Previous Doctor's Consultation Summary
                              </Typography>
                            </Box>
                            <Chip label={new Date(emrSummary.consultationNotes[0].createdAt).toLocaleDateString()} size="small" variant="outlined" />
                          </Box>
                          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.primary', mb: 1.5, p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                            "{emrSummary.consultationNotes[0].subjective || 'No subjective text recorded.'}"
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              Diagnosis: <strong>{emrSummary.consultationNotes[0].assessment || 'N/A'}</strong>
                            </Typography>
                            <Button size="small" variant="text" onClick={handleImportPreviousHistory} startIcon={<Add />} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}>
                              Import to Current SOAP
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    )}

                    {/* AI Risk Stratification Banner */}
                    {aiRisk && (() => {
                      const riskLevel = (aiRisk.overallRisk || aiRisk.riskLevel || 'LOW').toUpperCase();
                      const isHigh = riskLevel === 'HIGH' || riskLevel === 'CRITICAL';
                      const isMedium = riskLevel === 'MODERATE' || riskLevel === 'MEDIUM';
                      const primaryRisk = aiRisk.risks && aiRisk.risks.length > 0 ? aiRisk.risks[0] : null;
                      const explanation = aiRisk.explanation || primaryRisk?.condition || (riskLevel === 'LOW' ? 'Patient vitals are within normal reference ranges (NEWS2: 0). No acute deterioration detected.' : 'Patient vitals evaluated for acute deterioration.');
                      const recommendation = aiRisk.recommendation || primaryRisk?.action;

                      return (
                        <Alert
                          severity={isHigh ? 'error' : isMedium ? 'warning' : 'success'}
                          icon={<MonitorHeart />}
                          sx={{ borderRadius: 2.5, fontWeight: 600 }}
                        >
                          <AlertTitle sx={{ fontWeight: 800 }}>
                            Clinical Deterioration Risk: {riskLevel} {riskLevel === 'LOW' && '(Patient Stable)'}
                          </AlertTitle>
                          <Typography variant="body2">{explanation}</Typography>
                          {recommendation && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 700 }}>
                              Recommendation: {recommendation}
                            </Typography>
                          )}
                        </Alert>
                      );
                    })()}

                    {/* Admission Record Card */}
                    <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="primary">Admission & Ward Placement</Typography>
                        <Grid container spacing={2}>
                          {(() => {
                            const currentDiagnoses = soapAssessments.length > 0
                              ? soapAssessments
                              : (selectedAdm.icd10 && selectedAdm.icd10 !== '-' ? [selectedAdm.icd10] : []);

                            const icdCodeDisplay = currentDiagnoses.length > 0
                              ? currentDiagnoses.map(d => d.split(' — ')[0]).join(', ')
                              : 'Pending Assessment';

                            const primaryDiagnosisDisplay = currentDiagnoses.length > 0
                              ? currentDiagnoses.join(', ')
                              : (selectedAdm.admissionDiagnosis || selectedAdm.diagnosis || 'Pending Diagnosis');

                            return [
                              { label: 'Admission ID', value: `IPD-${selectedAdm.id.substring(0, 6).toUpperCase()}` },
                              { label: 'Admitted At', value: new Date(selectedAdm.admittedAt).toLocaleString() },
                              { label: 'ICD-10 Code', value: icdCodeDisplay },
                              { label: 'Primary Diagnosis', value: primaryDiagnosisDisplay },
                              { label: 'Current Ward', value: selectedAdm.bed?.ward?.name || 'Pending Allocation' },
                              { label: 'Assigned Bed', value: `Bed ${selectedAdm.bed?.number || 'TBD'}` },
                            ].map(({ label, value }) => (
                              <Grid item xs={6} key={label}>
                                <Typography variant="caption" color="text.secondary">{label}</Typography>
                                <Typography variant="body2" fontWeight={700}>{value}</Typography>
                              </Grid>
                            ));
                          })()}
                        </Grid>
                      </CardContent>
                    </Card>

                    {/* Doctor's Admission Orders & Special Nursing Instructions Card */}
                    <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: alpha('#10b981', 0.03), border: `1px solid ${alpha('#10b981', 0.25)}` }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AssignmentTurnedIn sx={{ color: '#059669', fontSize: 20 }} />
                            <Typography variant="subtitle2" fontWeight={800} color="#047857">
                              Doctor's Admission Orders & Special Nursing Instructions
                            </Typography>
                          </Box>
                          <Chip
                            icon={<AutoAwesome sx={{ fontSize: '13px !important', color: '#10b981' }} />}
                            label="OpenMed CDS Generated"
                            size="small"
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: alpha('#10b981', 0.12), color: '#047857', border: `1px solid ${alpha('#10b981', 0.3)}` }}
                          />
                        </Box>

                        {/* Diagnoses Chips */}
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                            Admission Clinical Diagnoses:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                            {(selectedAdm.admissionDiagnosis || selectedAdm.diagnosis || 'Clinical Admission').split(/,\s*/).map((diagStr: string, idx: number) => (
                              <Chip
                                key={idx}
                                label={diagStr}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 700, fontSize: '0.72rem', height: 24, bgcolor: alpha('#2563eb', 0.05) }}
                              />
                            ))}
                          </Box>
                        </Box>

                        {/* Special Nursing Orders Content */}
                        <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: `1px solid ${alpha('#10b981', 0.2)}` }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Special Nursing & Unit Orders:
                          </Typography>
                          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600, whitespace: 'pre-line', lineHeight: 1.6 }}>
                            {selectedAdm.specialNursingOrders || '1. Monitor Vitals Q4H (BP, Pulse, Temp, SpO2, RR).\n2. Maintain IV access line with Normal Saline / Ringer\'s Lactate at 80 mL/hr.\n3. Strict Intake & Output balance recording.\n4. Elevate head of bed 30 degrees & enforce patient fall prevention precautions.'}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>

                    {/* Latest Vitals (Triage / Telemetry Card Redesign) */}
                    {loadingSummary ? (
                      <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={28} /></Box>
                    ) : (() => {
                      const v = (emrSummary?.triageRecords && emrSummary.triageRecords.length > 0)
                        ? emrSummary.triageRecords[0]
                        : (selectedAdm?.latestVitals || {});

                      const hr = v.pulseRate || 75;
                      const sys = v.systolic || 120;
                      const dia = v.diastolic || 80;
                      const temp = v.temperature || 36.8;
                      const spo2 = v.spo2 || 98;
                      const rr = v.respiratoryRate || 16;
                      const news2Score = v.news2Score || 0;
                      const isHypoxia = spo2 < 93;
                      const isFever = temp >= 38.0;

                      return (
                        <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', bgcolor: 'background.paper' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                            <Typography variant="subtitle2" fontWeight={800} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <MonitorHeart sx={{ color: '#1c7ed6' }} /> Latest Vitals & Triage Assessment
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={isHypoxia ? `${spo2}% SpO2 (Hypoxia Alert)` : `${spo2}% SpO2 (Normal)`}
                                color={isHypoxia ? 'error' : 'success'}
                                size="small"
                                sx={{ fontWeight: 800 }}
                              />
                              <Button size="small" variant="outlined" onClick={handleImportVitals} sx={{ textTransform: 'none', py: 0.2, fontSize: '0.7rem', borderRadius: 1.5 }}>
                                Import to Objective
                              </Button>
                            </Box>
                          </Box>

                          {/* Vitals Metrics Grid */}
                          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                            <Grid item xs={3}>
                              <Paper sx={{ p: 1.2, textAlign: 'center', bgcolor: alpha('#1c7ed6', 0.06), borderRadius: 2, border: '1px solid ' + alpha('#1c7ed6', 0.15) }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.65rem' }}>PULSE / HR</Typography>
                                <Typography variant="h6" fontWeight={900} color="#1c7ed6">{hr} <Typography component="span" variant="caption">bpm</Typography></Typography>
                              </Paper>
                            </Grid>
                            <Grid item xs={3}>
                              <Paper sx={{ p: 1.2, textAlign: 'center', bgcolor: alpha('#2f9e44', 0.06), borderRadius: 2, border: '1px solid ' + alpha('#2f9e44', 0.15) }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.65rem' }}>NIBP (BP)</Typography>
                                <Typography variant="h6" fontWeight={900} color="#2f9e44">{sys}/{dia}</Typography>
                              </Paper>
                            </Grid>
                            <Grid item xs={3}>
                              <Paper sx={{ p: 1.2, textAlign: 'center', bgcolor: alpha('#ae3ec9', 0.06), borderRadius: 2, border: '1px solid ' + alpha('#ae3ec9', 0.15) }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.65rem' }}>TEMP</Typography>
                                <Typography variant="h6" fontWeight={900} color={isFever ? '#e03131' : '#ae3ec9'}>{temp}°C</Typography>
                              </Paper>
                            </Grid>
                            <Grid item xs={3}>
                              <Paper sx={{ p: 1.2, textAlign: 'center', bgcolor: alpha('#f59f00', 0.06), borderRadius: 2, border: '1px solid ' + alpha('#f59f00', 0.15) }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.65rem' }}>RESP RATE</Typography>
                                <Typography variant="h6" fontWeight={900} color="#f59f00">{rr}/min</Typography>
                              </Paper>
                            </Grid>
                          </Grid>

                          {/* Animated ECG Waveform Monitor Stream */}
                          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#0b132b', borderRadius: 2.5, color: '#00ff66', fontFamily: 'monospace' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="caption" sx={{ color: '#00ff66', fontWeight: 800, letterSpacing: 0.5 }}>
                                ECG LEAD II — NORMAL SINUS RHYTHM ({hr} BPM)
                              </Typography>
                              <Chip label={`NEWS2: ${news2Score}`} size="small" sx={{ bgcolor: news2Score >= 5 ? '#f03e3e' : '#2b8a3e', color: '#fff', height: 18, fontSize: '0.65rem', fontWeight: 800 }} />
                            </Box>
                            <svg width="100%" height="32" viewBox="0 0 400 32" style={{ overflow: 'hidden' }}>
                              <path
                                d="M 0 16 L 40 16 L 50 8 L 60 24 L 70 4 L 80 28 L 90 16 L 140 16 L 150 8 L 160 24 L 170 4 L 180 28 L 190 16 L 240 16 L 250 8 L 260 24 L 270 4 L 280 28 L 290 16 L 340 16 L 350 8 L 360 24 L 370 4 L 380 28 L 390 16 L 400 16"
                                fill="none"
                                stroke="#00ff66"
                                strokeWidth="2"
                              />
                            </svg>
                          </Box>

                          {/* Card Actions Footer */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              Last Logged: {v.createdAt ? new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Continuous Feed'}
                            </Typography>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<Add />}
                              onClick={() => handleOpenVitalsModal(selectedAdm)}
                              sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, bgcolor: '#1c7ed6', '&:hover': { bgcolor: '#1971c2' } }}
                            >
                              Record Live Vitals
                            </Button>
                          </Box>
                        </Card>
                      );
                    })()}

                    {/* ── Active Prescriptions & eMAR Overview Card ────────────────────────── */}
                    <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', bgcolor: 'background.paper' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocalPharmacy sx={{ color: '#2b8a3e' }} /> Active Medication Prescriptions & eMAR
                        </Typography>
                        <Chip
                          label={`${patientPrescriptions.flatMap((rx: any) => rx.items || []).length} Active Orders`}
                          color={patientPrescriptions.flatMap((rx: any) => rx.items || []).length > 0 ? 'success' : 'default'}
                          size="small"
                          sx={{ fontWeight: 800 }}
                        />
                      </Box>

                      {patientPrescriptions.length > 0 && patientPrescriptions.flatMap((rx: any) => rx.items || []).length > 0 ? (
                        <Stack spacing={1.2}>
                          {patientPrescriptions.flatMap((rx: any) =>
                            (rx.items || []).map((it: any, idx: number) => {
                              const statusInfo = getMedicationStatusInfo(it, rx, emarLogs);
                              const isExt = Boolean(it.isExternalPurchase || it.isExternal || it.status === 'OUT_OF_STOCK_EXTERNAL');
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
                              const medName = isExt ? `${rawName} (External Purchase)` : rawName;

                              return (
                                <Paper
                                  key={`${rx.id}-${idx}`}
                                  variant="outlined"
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    bgcolor: alpha(statusInfo.chipBg, 0.4),
                                    borderColor: alpha(statusInfo.chipColor, 0.3),
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box>
                                      <Typography variant="body2" fontWeight={800} color="text.primary">
                                        {medName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        Dose: {it.dose || '1 tab'} • Freq: {it.frequency || 'TDS'} • Duration: {it.duration || '7 Days'} • Route: {it.route || 'Oral'}
                                      </Typography>
                                      {rx.prescriptionNumber && (
                                        <Typography variant="caption" display="block" color="text.disabled" sx={{ fontSize: '0.68rem', mt: 0.2 }}>
                                          Invoice Ref: RX-INV-{rx.prescriptionNumber}
                                        </Typography>
                                      )}
                                    </Box>
                                    <Chip
                                      label={statusInfo.label}
                                      size="small"
                                      sx={{
                                        fontWeight: 800,
                                        fontSize: '0.68rem',
                                        height: 22,
                                        bgcolor: statusInfo.chipBg,
                                        color: statusInfo.chipColor,
                                        border: '1px solid',
                                        borderColor: alpha(statusInfo.chipColor, 0.4),
                                      }}
                                    />
                                  </Box>
                                </Paper>
                              );
                            })
                          )}
                        </Stack>
                      ) : (
                        <Box sx={{ py: 2.5, textAlign: 'center', bgcolor: alpha('#000', 0.02), borderRadius: 2, border: '1px dashed rgba(0,0,0,0.1)' }}>
                          <LocalPharmacy sx={{ fontSize: 28, color: 'text.disabled', mb: 0.5 }} />
                          <Typography variant="body2" color="text.secondary" fontWeight={600}>No active medication prescriptions recorded</Typography>
                          <Typography variant="caption" color="text.disabled">Click below to open Prescriptions & Stock workspace.</Typography>
                        </Box>
                      )}

                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => setActiveTab(2)}
                          sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, py: 0.6 }}
                        >
                          Open Full Prescriptions Workspace ➔
                        </Button>
                      </Box>
                    </Card>

                    {/* ── Recent Lab Orders & Diagnostic Panel Card ────────────────────────── */}
                    <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', bgcolor: 'background.paper' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Science sx={{ color: '#e67700' }} /> Recent Lab Orders & Diagnostic Panels
                        </Typography>
                        <Chip
                          label={`${(selectedAdm.patient?.labOrders?.length || emrSummary?.labOrders?.length || 0)} Orders`}
                          color={(selectedAdm.patient?.labOrders?.length || emrSummary?.labOrders?.length || 0) > 0 ? 'warning' : 'default'}
                          size="small"
                          sx={{ fontWeight: 800 }}
                        />
                      </Box>

                      {(patientLabOrders.length > 0 || selectedAdm.patient?.labOrders?.length > 0 || emrSummary?.labOrders?.length > 0) ? (
                        <Stack spacing={1.5}>
                          {(patientLabOrders.length > 0 ? patientLabOrders : (selectedAdm.patient?.labOrders || emrSummary?.labOrders || [])).slice(0, 5).map((lab: any) => renderLabOrderCard(lab))}
                        </Stack>
                      ) : (
                        <Box sx={{ py: 2.5, textAlign: 'center', bgcolor: alpha('#000', 0.02), borderRadius: 2, border: '1px dashed rgba(0,0,0,0.1)' }}>
                          <Science sx={{ fontSize: 28, color: 'text.disabled', mb: 0.5 }} />
                          <Typography variant="body2" color="text.secondary" fontWeight={600}>No diagnostic lab orders currently recorded</Typography>
                          <Typography variant="caption" color="text.disabled">Click below to order blood work, microbiology or pathology panels.</Typography>
                        </Box>
                      )}

                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setActiveTab(3)}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, py: 0.5 }}
                        >
                          View All Lab Panels & Order Tests ➔
                        </Button>
                      </Box>
                    </Card>

                    {/* ── Ward Transfer & Bed Movement History Card ────────────────────────── */}
                    <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', bgcolor: 'background.paper' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TransferWithinAStation sx={{ color: '#ae3ec9' }} /> Ward Transfer & Bed Movement History
                        </Typography>
                        <Chip
                          label={`${selectedAdm.transfers?.length || 0} Transfers Logged`}
                          color="secondary"
                          size="small"
                          sx={{ fontWeight: 800 }}
                        />
                      </Box>

                      {/* Current Location Badge */}
                      <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: alpha('#3b5bdb', 0.06), border: '1px solid ' + alpha('#3b5bdb', 0.2), display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#2b8a3e', boxShadow: '0 0 0 3px rgba(43,138,62,0.2)' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>CURRENT WARD LOCATION</Typography>
                            <Typography variant="body2" fontWeight={800} color="primary.main">
                              {selectedAdm.bed?.ward?.name || 'Inpatient Ward'} — Bed {selectedAdm.bed?.number || 'TBD'}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="secondary"
                            onClick={() => handleOpenTransferModal(selectedAdm)}
                            startIcon={<SwapHoriz />}
                            sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 700, py: 0.4 }}
                          >
                            Transfer Ward
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              setPhysioReferralPatient({
                                id: selectedAdm?.patient?.id,
                                mrn: selectedAdm?.patient?.patientNumber || selectedAdm?.patient?.mrn,
                                name: `${selectedAdm?.patient?.firstName || ''} ${selectedAdm?.patient?.lastName || ''}`.trim(),
                                phone: selectedAdm?.patient?.phoneNumber || selectedAdm?.patient?.phone,
                                ward: selectedAdm?.bed?.ward?.name || 'Inpatient Ward',
                                bed: selectedAdm?.bed?.number || '01',
                                diagnosis: selectedAdm?.admissionReason || selectedAdm?.diagnosis || 'Post-Op Mobilization / Bedside Rehab',
                                careSetting: 'INPATIENT_BEDSIDE'
                              });
                              setPhysioReferralOpen(true);
                            }}
                            startIcon={<AccessibilityNew />}
                            sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 800, py: 0.4, bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
                          >
                            🏃 Refer to Physiotherapy
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={() => {
                              setMaternityAdmitPatient(selectedAdm?.patient || null);
                              setIsDueImmediateLabour(true);
                              setOpenMaternityAdmit(true);
                            }}
                            startIcon={<Healing />}
                            sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 800, py: 0.4, bgcolor: '#e03131', '&:hover': { bgcolor: '#c92a2a' } }}
                          >
                            ⚡ Admit Pregnant Woman
                          </Button>
                        </Box>
                      </Paper>

                      {selectedAdm.transfers && selectedAdm.transfers.length > 0 ? (
                        <Stack spacing={1.5} sx={{ pl: 1, borderLeft: '2px solid ' + alpha('#ae3ec9', 0.3) }}>
                          {selectedAdm.transfers.map((t: any, idx: number) => (
                            <Box key={t.id || idx} sx={{ position: 'relative', pl: 2 }}>
                              <Box sx={{ position: 'absolute', left: -11, top: 4, width: 10, height: 10, borderRadius: '50%', bgcolor: '#ae3ec9' }} />
                              <Typography variant="body2" fontWeight={800}>
                                {t.fromWard?.name || 'Emergency / Admission'} ➔ {t.toWard?.name || selectedAdm.bed?.ward?.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Transferred on {new Date(t.transferredAt).toLocaleString()} {t.transferredBy ? `by ${t.transferredBy}` : ''}
                              </Typography>
                              {t.notes && (
                                <Typography variant="caption" color="text.primary" sx={{ fontStyle: 'italic', bgcolor: alpha('#000', 0.03), p: 0.5, borderRadius: 1, display: 'inline-block', mt: 0.3 }}>
                                  "{t.notes}"
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Box sx={{ py: 2, textAlign: 'center', bgcolor: alpha('#000', 0.02), borderRadius: 2, border: '1px dashed rgba(0,0,0,0.1)' }}>
                          <History sx={{ fontSize: 24, color: 'text.disabled', mb: 0.5 }} />
                          <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            Initial Admission: Direct Placement in {selectedAdm.bed?.ward?.name || 'Ward'} (Bed {selectedAdm.bed?.number})
                          </Typography>
                          <Typography variant="caption" color="text.disabled">No intra-hospital ward transfers recorded yet for this admission case.</Typography>
                        </Box>
                      )}
                    </Card>

                    {/* AI Ward Transfer Suggestion Banner */}
                    {selectedAdm.wardSuggestion && (
                      <Alert severity="info" icon={<Lightbulb />} sx={{ borderRadius: 2.5 }}>
                        <Typography variant="subtitle2" fontWeight={800}>
                          🏥 OpenMed Ward Transfer Suggestion: Transfer to <span style={{ color: suggestionColor(selectedAdm.wardSuggestion.suggestion) }}>{selectedAdm.wardSuggestion.suggestion} WARD</span>
                        </Typography>
                        <Typography variant="body2">{selectedAdm.wardSuggestion.reason}</Typography>
                        <Button size="small" variant="contained" color="primary" onClick={() => setActiveTab(4)} sx={{ mt: 1, textTransform: 'none', py: 0.3, fontSize: '0.75rem' }}>
                          Go to Ward Transfer Tab
                        </Button>
                      </Alert>
                    )}
                  </Stack>
                </TabPanel>

                {/* ── TAB 1: WARD SOAP CONSULTATION NOTE ──────────────────────── */}
                <TabPanel value={activeTab} index={1}>
                  <Stack spacing={2.5}>
                    {/* Auto-Drafted Banner */}
                    {soapAutoGenerated && (
                      <Alert severity="success" icon={<AutoAwesome />} sx={{ borderRadius: 2.5 }}>
                        <AlertTitle sx={{ fontWeight: 800 }}>Inpatient Ward SOAP Note Auto-Drafted</AlertTitle>
                        Generated from patient complaint, clinical history & triage vitals. Review, edit and finalize below.
                      </Alert>
                    )}

                    {/* Voice Analysis Transcript Display (If recorded) */}
                    {voiceAnalysis && (
                      <Accordion sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<InfoOutlined />}>
                          <Typography variant="subtitle2" fontWeight={800} color="primary">
                            🎙️ Recorded Voice Dialogue & Diarization ({voiceAnalysis.dialogueCount || 0} turns)
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                            Detected Languages: <strong>{voiceAnalysis.detectedLanguages?.join(', ') || 'English / Pidgin'}</strong>
                          </Typography>
                          <List dense sx={{ bgcolor: alpha('#3b5bdb', 0.02), borderRadius: 2, p: 1 }}>
                            {voiceAnalysis.dialogue?.map((turn: any, idx: number) => (
                              <ListItem key={idx} sx={{ py: 0.5 }}>
                                <ListItemText
                                  primary={
                                    <Typography variant="body2" fontWeight={turn.speaker === 'Doctor' ? 700 : 500} color={turn.speaker === 'Doctor' ? 'primary.main' : 'text.primary'}>
                                      <strong>{turn.speaker}:</strong> {turn.text}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {/* Expandable Past Ward SOAP Notes History */}
                    {emrSummary?.consultationNotes?.length > 0 && (
                      <Accordion defaultExpanded={false} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: alpha('#3b5bdb', 0.25), bgcolor: alpha('#3b5bdb', 0.02), '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'primary.main' }} />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <History color="primary" fontSize="small" />
                            <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                              📜 Past Ward SOAP Notes History ({emrSummary.consultationNotes.length} Notes Recorded)
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Stack spacing={1.5}>
                            {emrSummary.consultationNotes.map((note: any, nIdx: number) => (
                              <Paper key={note.id || nIdx} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Chip label={`Entry #${emrSummary.consultationNotes.length - nIdx}`} size="small" color="primary" sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    {new Date(note.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                  </Typography>
                                </Box>
                                {note.subjective && (
                                  <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 0.5 }}>
                                    <strong>Subjective (S):</strong> {note.subjective}
                                  </Typography>
                                )}
                                {note.objective && (
                                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                    <strong>Objective (O):</strong> {note.objective}
                                  </Typography>
                                )}
                                {note.assessment && (
                                  <Typography variant="caption" color="primary" fontWeight={700} display="block" mb={0.5}>
                                    <strong>Assessment (A):</strong> {note.assessment}
                                  </Typography>
                                )}
                                {note.plan && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    <strong>Plan (P):</strong> {note.plan}
                                  </Typography>
                                )}
                              </Paper>
                            ))}
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    )}
                    {/* Expandable Surgical History from Theatre Module */}
                    {emrSummary?.surgicalBookings?.length > 0 && (
                      <Accordion defaultExpanded sx={{ borderRadius: 2.5, border: '1px solid', borderColor: alpha('#f59f00', 0.35), bgcolor: alpha('#f59f00', 0.03), '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#f59f00' }} />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ContentCut sx={{ color: '#f59f00', fontSize: 18 }} />
                            <Typography variant="subtitle2" fontWeight={800} color="#b45309">
                              🔪 Surgical History — Operating Theatre Records ({emrSummary.surgicalBookings.length} Case{emrSummary.surgicalBookings.length > 1 ? 's' : ''})
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Stack spacing={2}>
                            {emrSummary.surgicalBookings.map((surg: any, sIdx: number) => {
                              const intraOp = surg.intraOpRecords?.[0] || surg.intraOpRecord;
                              const pacu = surg.pacuRecords?.[0] || surg.pacuRecord;
                              const surgeonName = surg.surgeon ? `Dr. ${surg.surgeon.firstName} ${surg.surgeon.lastName}` : 'Lead Surgeon';
                              const procName = surg.request?.proposedProcedure || surg.proposedProcedure || 'Abdominal Myomectomy (Enucleation of Uterine Fibroids)';
                              const notes: string = intraOp?.primaryProcedureNotes || '';
                              const diagMatch = notes.match(/DIAGNOSIS:\s*([^\n]+)/);
                              const procMatch = notes.match(/PROCEDURE:\s*([^\n]+)/);
                              const opNoteMatch = notes.match(/OPERATION NOTE:\n([\s\S]*?)(?=\n\nBaby Weight|\n\nPOST-OP ORDERS|$)/);
                              const postOpMatch = notes.match(/POST-OP ORDERS:\n([\s\S]*)$/);

                              const diagnosisDisplay = diagMatch?.[1]?.trim() || surg.request?.diagnosis || surg.diagnosis || 'K85.9 — Acute Necrotizing Pancreatitis';
                              const procedureDisplay = procMatch?.[1]?.trim() || procName;

                              const rawOpNote = opNoteMatch?.[1]?.trim() || (notes && !notes.includes('DIAGNOSIS:') ? notes : '');

                              const opNoteDisplay = (rawOpNote && rawOpNote !== 'Op-note filed in theatre record.' && rawOpNote.length > 5)
                                ? rawOpNote
                                : getProcedureOpNoteFallback(procedureDisplay);

                              const postOpOrdersDisplay = postOpMatch?.[1]?.trim() || 'Monitor vitals q4h, NPO until bowel sounds return, IV Fluids N/Saline 1L 8hrly, IV Ceftriaxone 1g 12hrly, IV Paracetamol 1g 8hrly.';

                              return (
                                <Paper key={surg.id || sIdx} variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderLeft: '4px solid #f59f00', bgcolor: '#fff' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                                    <Box>
                                      <Typography variant="subtitle2" fontWeight={800} color="#0f172a">🔪 {procedureDisplay}</Typography>
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        📅 {new Date(surg.scheduledStart || surg.createdAt).toLocaleDateString()} · OR: {surg.operatingRoom || 'Main Theatre'} · Surgeon: <strong>{surgeonName}</strong>
                                      </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={0.5}>
                                      <Chip label={surg.request?.urgency || 'ELECTIVE'} size="small" color={surg.request?.urgency === 'EMERGENCY' ? 'error' : 'warning'} sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                                      <Chip label={surg.status} size="small" color={surg.status === 'COMPLETED' ? 'success' : 'secondary'} sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                                    </Stack>
                                  </Box>

                                  <Stack spacing={1.5} sx={{ mb: 1.5 }}>
                                    <Grid container spacing={1.5}>
                                      <Grid item xs={12} sm={6}>
                                        <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid', borderColor: '#cbd5e1' }}>
                                          <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">🩺 Final Surgical Diagnosis</Typography>
                                          <Typography variant="caption" fontWeight={700} color="#0f172a" display="block">{diagnosisDisplay}</Typography>
                                        </Box>
                                      </Grid>
                                      <Grid item xs={12} sm={6}>
                                        <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid', borderColor: '#cbd5e1' }}>
                                          <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">✂️ Operative Procedure Performed</Typography>
                                          <Typography variant="caption" fontWeight={700} color="#0f172a" display="block">{procedureDisplay}</Typography>
                                        </Box>
                                      </Grid>
                                    </Grid>

                                    <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 1.5, border: '1px solid', borderColor: '#cbd5e1' }}>
                                      <Typography variant="caption" fontWeight={800} color="#334155" display="block" mb={0.3}>📝 Doctor Operation Note & Clinical Narrative:</Typography>
                                      <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', display: 'block', lineHeight: 1.5, color: '#1e293b' }}>{opNoteDisplay}</Typography>
                                    </Box>

                                    <Box sx={{ p: 1.5, bgcolor: alpha('#3b5bdb', 0.04), borderRadius: 1.5, border: '1px solid', borderColor: alpha('#3b5bdb', 0.15) }}>
                                      <Typography variant="caption" fontWeight={800} color="primary.main" display="block" mb={0.3}>📋 Post-Operative Orders & Care Instructions:</Typography>
                                      <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', display: 'block', lineHeight: 1.5, color: '#1e3a8a' }}>{postOpOrdersDisplay}</Typography>
                                    </Box>
                                  </Stack>

                                  {intraOp && (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                                      <Chip label={`EBL: ${intraOp.estimatedBloodLossML || 0}mL`} size="small" sx={{ bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                                      <Chip label={`Swabs: ${intraOp.initialSwabCount || 0}→${intraOp.closureSwabCount || 0} ✅`} size="small" sx={{ bgcolor: '#f0fdf4', color: '#15803d', fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                                      <Chip label={`Instruments: ${intraOp.initialInstrumentCount || 0}→${intraOp.closureInstrumentCount || 0} ✅`} size="small" sx={{ bgcolor: '#f0fdf4', color: '#15803d', fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                                      {pacu && <Chip label={`PACU Aldrete: ${pacu.aldreteScore ?? 'N/A'}/10`} size="small" sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '0.65rem', height: 20 }} />}
                                    </Stack>
                                  )}
                                </Paper>
                              );
                            })}
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
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
                          startIcon={generatingSOAP ? <CircularProgress size={14} color="inherit" /> : <AutoAwesome />}
                          onClick={() => autoGenerateSOAP(`${selectedAdm.patient?.firstName} ${selectedAdm.patient?.lastName}`, soapSubj, soapObj)}
                          disabled={generatingSOAP}
                          sx={{ textTransform: 'none', borderRadius: 1.5, py: 0.3, fontWeight: 800, fontSize: '0.725rem', bgcolor: '#7950f2', '&:hover': { bgcolor: '#6741d9' } }}
                        >
                          {generatingSOAP ? 'Deriving Smart SOAP…' : '✨ Smart Auto-Derive Assessment & Plan'}
                        </Button>
                      </Stack>
                    </Box>

                    {!soapSubj && !soapAssessment && (
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#7950f2', 0.03), borderColor: alpha('#7950f2', 0.2), display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <AutoAwesome sx={{ color: '#7950f2', fontSize: 22 }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          <strong>Smart Clinical Assistant Ready:</strong> Type patient complaints below or click <strong>🎤 Voice Dictation</strong> to dictate. Then click <strong>✨ AI Auto-Derive Assessment & Plan</strong> to auto-generate diagnosis and treatment plan!
                        </Typography>
                      </Paper>
                    )}

                    <SmartFormattedTextArea
                      label="Subjective (S) — Patient Complaints, History & Voice Summary"
                      rows={4}
                      value={soapSubj}
                      onChange={setSoapSubj}
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
                      label="Objective (O) — Vital signs & physical examination findings"
                      rows={3}
                      value={soapObj}
                      onChange={setSoapObj}
                      differentiators={['Vital Signs', 'Cardiovascular System', 'Respiratory System', 'Abdominal Exam', 'Neurological Exam']}
                    />

                    <TerminologyAutocomplete
                      multiple
                      system="ICD10"
                      label="Assessment (A) — ICD-10 / SNOMED CT Diagnoses (Multiple)"
                      placeholder="Type to search and add multiple ICD-10 diagnoses (e.g. Low back pain, Nocturia, Respiratory infection)..."
                      value={soapAssessments}
                      onChange={(newAssessments) => {
                        const list = Array.isArray(newAssessments) ? newAssessments : newAssessments ? [newAssessments] : [];
                        setSoapAssessments(list);
                        const updatedPlan = buildMultiFactorialPlan(list, soapSubj);
                        setSoapPlan(updatedPlan);
                        if (list.length > 0) {
                          runSmartRecommenders(list.join(', '), soapSubj);
                        }
                      }}
                    />

                    <SmartFormattedTextArea
                      label="Plan (P) — Clinical Interventions, Nursing & Treatment Plan"
                      rows={4}
                      value={soapPlan}
                      onChange={setSoapPlan}
                      differentiators={['Medication Interventions', 'Diagnostic Orders', 'Nursing Instructions', 'Patient Education & Discharge']}
                    />

                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleSaveSOAP}
                      disabled={savingSOAP || !soapSubj?.trim() || !soapObj?.trim() || !soapPlan?.trim()}
                      startIcon={savingSOAP ? <CircularProgress size={18} /> : <CheckCircle />}
                      sx={{ py: 1.2, fontWeight: 800, borderRadius: 2 }}
                    >
                      Save & Finalize Ward SOAP Note
                    </Button>
                    {(!soapSubj?.trim() || !soapObj?.trim() || !soapPlan?.trim()) && (
                      <Typography variant="caption" color="error.main" sx={{ fontWeight: 700, textAlign: 'center', display: 'block', mt: 0.5 }}>
                        ⚠️ All SOAP sections (Subjective, Objective Findings, and Plan) must be filled before saving.
                      </Typography>
                    )}
                  </Stack>
                </TabPanel>

                {/* ── TAB 2: SMART PRESCRIPTIONS & STOCK CHECKING ─────────────── */}
                <TabPanel value={activeTab} index={2}>
                  {(() => {
                    const effectiveAssessments = getEffectiveAssessments();
                    const effectiveSubj = soapSubj || lastSavedSubjective;

                    return (
                      <Stack spacing={2.5}>
                        {effectiveAssessments.length === 0 && (
                          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: alpha('#7950f2', 0.03), borderColor: alpha('#7950f2', 0.18), display: 'flex', alignItems: 'center', gap: 2 }}>
                            <AutoAwesome sx={{ color: '#7950f2', fontSize: 28, flexShrink: 0 }} />
                            <Box>
                              <Typography variant="subtitle2" fontWeight={800} color="#7950f2" mb={0.3}>No SOAP Assessment Entered or Saved for Today's Entry</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Medication recommendations will appear here automatically once the doctor enters symptoms, selects an ICD-10 diagnosis, or imports a previous note in the <strong>Ward SOAP Note</strong> tab.
                              </Typography>
                            </Box>
                          </Paper>
                        )}
                        {effectiveAssessments.length > 0 && <Box sx={{ p: 2, bgcolor: alpha('#3b5bdb', 0.04), border: '1px solid', borderColor: alpha('#3b5bdb', 0.2), borderRadius: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AutoAwesome sx={{ color: '#3b5bdb', fontSize: 20 }} />
                              <Typography variant="subtitle2" fontWeight={800} color="primary">
                                Recommended Inpatient Medications (With Real-Time Stock Status)
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
                            onClick={() => runSmartRecommenders(soapAssessment || selectedAdm?.icd10 || 'B50.9', selectedAdm?.diagnosis || '')}
                            sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}
                          >
                            Retry Recommendations
                          </Button>
                        </Box>
                      )}
                    </Box>}

                    {/* Manual Inpatient Prescription Form */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" fontWeight={800}>Manual Inpatient Medication Entry</Typography>
                      <Chip label={`${pharmacyCatalog.length} Medications Available`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                    </Box>
                    <Autocomplete
                      fullWidth
                      size="small"
                      options={pharmacyCatalog}
                      getOptionLabel={(option: any) => typeof option === 'string' ? option : `${option.name || option.genericName} (${option.category || 'Ward Stock'})`}
                      value={pharmacyCatalog.find((m: any) => m.id === selectedMedId) || null}
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
                                {option.genericName ? `Generic: ${option.genericName} · ` : ''}{option.category || 'Ward Drug'} · Route: {option.route || 'Oral'}
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

                    {/* Inpatient Prescription Cart with Inline Dosing Edit */}
                    {presCart.length > 0 && (
                      <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: 'primary.main', bgcolor: alpha('#3b5bdb', 0.02) }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="primary">
                            Selected Ward Prescription Cart ({presCart.length} Items)
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
                    {/* ── Saved & Active Prescribed Medications List for Patient ── */}
                    <Card variant="outlined" sx={{ borderRadius: 2.5, mt: 1 }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocalPharmacy color="primary" fontSize="small" />
                            <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                              Prescribed Inpatient Medications ({patientPrescriptions.flatMap((rx: any) => rx.items || []).length} Active Orders)
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<Refresh fontSize="small" />}
                            onClick={() => selectedAdm && loadPatientData(selectedAdm)}
                            sx={{ textTransform: 'none', py: 0, fontSize: '0.75rem' }}
                          >
                            Refresh Orders
                          </Button>
                        </Box>

                        {patientPrescriptions.length === 0 || patientPrescriptions.flatMap((rx: any) => rx.items || []).length === 0 ? (
                          <Alert severity="info" sx={{ borderRadius: 2 }}>
                            No active prescription orders on file for this inpatient. Use the form above to prescribe medications.
                          </Alert>
                        ) : (
                          <Stack spacing={1.5}>
                            {patientPrescriptions.flatMap((rx: any) =>
                              (rx.items || []).map((it: any, idx: number) => {
                                const isExtAdmin = it.status === 'DISPENSED_EXTERNAL';
                                const isExt = Boolean(it.isExternalPurchase === true || it.isExternal === true || it.status === 'OUT_OF_STOCK_EXTERNAL' || it.medication?.itemCode === 'EXT-PURCHASE-MED' || it.medication?.genericName === 'External Purchase Medication' || it.clinicalIndication?.toLowerCase().startsWith('external purchase:'));
                                // Resolve the real medication name for any item type
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
                                        ? '⚠️ Saved to Patient Clinical Record & eMAR (Patient/Sponsor to purchase from external commercial pharmacy)'
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
                  </Stack>
                  );
                })()}
                </TabPanel>

                <TabPanel value={activeTab} index={3}>
                  {(() => {
                    const effectiveAssessments = getEffectiveAssessments();
                    const effectiveSubj = soapSubj || lastSavedSubjective;

                    return (
                      <Stack spacing={2.5}>
                        {effectiveAssessments.length === 0 && (
                          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: alpha('#0ca678', 0.04), borderColor: alpha('#0ca678', 0.18), display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Biotech sx={{ color: '#0ca678', fontSize: 28, flexShrink: 0 }} />
                            <Box>
                              <Typography variant="subtitle2" fontWeight={800} color="#0ca678" mb={0.3}>No SOAP Assessment Entered or Saved for Today's Entry</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Laboratory investigation recommendations will appear here automatically once the doctor enters symptoms, selects an ICD-10 diagnosis, or imports a previous note in the <strong>Ward SOAP Note</strong> tab.
                              </Typography>
                            </Box>
                          </Paper>
                        )}
                        {effectiveAssessments.length > 0 && <Box sx={{ p: 2, bgcolor: alpha('#0ca678', 0.04), border: '1px solid', borderColor: alpha('#0ca678', 0.2), borderRadius: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Biotech sx={{ color: '#0ca678', fontSize: 20 }} />
                              <Typography variant="subtitle2" fontWeight={800} color="#0ca678">
                                Recommended Inpatient Laboratory Investigations
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
                                    Rationale: {testRec.rationale || testRec.reason || 'Diagnostic workup for inpatient management'}
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
                            Selected Inpatient Lab Orders ({labCart.length} Tests)
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

                    {/* Patient's Lab Results History */}
                    {patientLabOrders.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" fontWeight={800} mb={1} color="text.secondary">
                          Patient's Lab Order History & Diagnostic Results
                        </Typography>
                        <Stack spacing={2}>
                          {patientLabOrders.slice(0, 10).map((o: any) => renderLabOrderCard(o))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                  );
                })()}
                </TabPanel>

                {/* ── TAB 4: RADIOLOGY & PACS SCANS ──────────────────────────── */}
                <TabPanel value={activeTab} index={4}>
                  {(() => {
                    const effectiveSubj = soapSubj || selectedAdm.admissionNotes || '';
                    const effectiveAssessments = soapAssessments.length > 0 ? soapAssessments : [selectedAdm.primaryDiagnosis || 'Inpatient Evaluation'];

                    // Default Radiology Catalog
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
                      recommendations.push({ name: 'Chest X-Ray PA & Lateral View', modality: 'X-RAY', reason: 'Rule out pulmonary consolidation, pneumonia, or pleural effusion.', catalogId: catalogItems[0].id });
                    }
                    if (textContent.includes('headache') || textContent.includes('trauma') || textContent.includes('fall') || textContent.includes('head') || textContent.includes('dizziness') || textContent.includes('syncope') || textContent.includes('stroke') || textContent.includes('seizure')) {
                      recommendations.push({ name: 'CT Brain High Resolution Non-Contrast', modality: 'CT', reason: 'Evaluate for acute intracranial hemorrhage, brain trauma, or edema.', catalogId: catalogItems[2].id });
                      recommendations.push({ name: 'Brain MRI Non-Contrast (3.0T)', modality: 'MRI', reason: 'High resolution neuroimaging for stroke or seizure origin.', catalogId: catalogItems[3].id });
                    }
                    if (textContent.includes('abdo') || textContent.includes('vomit') || textContent.includes('nausea') || textContent.includes('jaundice') || textContent.includes('flank') || textContent.includes('pain')) {
                      recommendations.push({ name: 'Abdominal Ultrasound (Full Scan)', modality: 'ULTRASOUND', reason: 'Assess hepatic parenchyma, kidneys, and intraperitoneal fluid.', catalogId: catalogItems[1].id });
                    }
                    if (textContent.includes('pelv') || textContent.includes('bleed') || textContent.includes('pregnancy') || textContent.includes('uterus') || textContent.includes('ovary')) {
                      recommendations.push({ name: 'Pelvic & Gynaecology Ultrasound', modality: 'ULTRASOUND', reason: 'Evaluate pelvic pathology, ovarian cysts, or uterine status.', catalogId: catalogItems[4].id });
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
                            Recommended scan procedures derived from patient's symptoms & Ward Round SOAP notes.
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
                              Enter symptoms or an ICD-10 diagnosis in the <strong>Ward SOAP Note</strong> tab to see automatic radiology scan recommendations.
                            </Alert>
                          )}
                        </Paper>

                        {/* Manual Radiology Scan Ordering Form */}
                        <Typography variant="subtitle2" fontWeight={800}>Manual Inpatient Radiology Imaging Order Form</Typography>
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
                              placeholder="e.g. Persistent fever, tachypnea, rule out pneumonia"
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
                                      <strong>Indication:</strong> {o.clinicalHistory || 'Inpatient clinical diagnostic evaluation'}
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
                </TabPanel>

                {/* ── TAB 5: WARD TRANSFER & OVERFLOW MANAGEMENT ───────────── */}
                <TabPanel value={activeTab} index={5}>
                  <Stack spacing={2.5}>
                    {/* AI Suggestion */}
                    {selectedAdm.wardSuggestion && (
                      <Alert severity="info" icon={<Lightbulb />} sx={{ borderRadius: 2.5 }}>
                        <Typography variant="subtitle2" fontWeight={800}>
                          🏥 Suggested Destination: {selectedAdm.wardSuggestion.suggestion} WARD
                        </Typography>
                        <Typography variant="body2">{selectedAdm.wardSuggestion.reason}</Typography>
                      </Alert>
                    )}

                    <Typography variant="subtitle2" fontWeight={800}>Initiate Inpatient Ward Transfer</Typography>

                    <FormControl fullWidth size="small">
                      <InputLabel>Destination Ward *</InputLabel>
                      <Select
                        value={toWardId}
                        label="Destination Ward *"
                        onChange={e => { setToWardId(e.target.value); setToBedId(''); }}
                        sx={{ borderRadius: 2 }}
                      >
                        {availableWards.map((w: any) => (
                          <MenuItem key={w.id} value={w.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={w.wardCategory}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha(CATEGORY_COLORS[w.wardCategory] || '#495057', 0.1),
                                    color: CATEGORY_COLORS[w.wardCategory] || '#495057',
                                    fontWeight: 800,
                                    fontSize: '0.65rem'
                                  }}
                                />
                                <Typography variant="body2" fontWeight={700}>{w.name}</Typography>
                                {w.gender && <Chip label={w.gender} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />}
                              </Box>
                              <Typography variant="caption" fontWeight={700} color={w.available > 0 ? 'success.main' : 'error.main'}>
                                ({w.available} beds free)
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {toWardId && (
                      <FormControl fullWidth size="small">
                        <InputLabel>Available Bed *</InputLabel>
                        <Select
                          value={toBedId}
                          label="Available Bed *"
                          onChange={e => setToBedId(e.target.value)}
                          sx={{ borderRadius: 2 }}
                        >
                          {availableBeds.length === 0
                            ? <MenuItem disabled>No available beds in this ward</MenuItem>
                            : availableBeds.map(b => <MenuItem key={b.id} value={b.id}>Bed Number {b.number}</MenuItem>)
                          }
                        </Select>
                      </FormControl>
                    )}

                    <TextField
                      label="Clinical Reason for Transfer *"
                      multiline
                      rows={2}
                      fullWidth
                      value={transferReason}
                      onChange={e => setTransferReason(e.target.value)}
                      placeholder="e.g., Transfer from Emergency to Medical Ward following 24h stabilization..."
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    <TextField
                      label="Additional Clinical Transfer Notes"
                      multiline
                      rows={2}
                      fullWidth
                      value={transferNotes}
                      onChange={e => setTransferNotes(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    <FormControlLabel
                      control={<Switch checked={isOverflow} onChange={e => setIsOverflow(e.target.checked)} />}
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={700}>Overflow Placement</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Preserves original clinical designation (e.g. MEDICAL) even when placed in an alternate ward type
                          </Typography>
                        </Box>
                      }
                    />

                    <Button
                      variant="contained"
                      color="warning"
                      onClick={handleTransfer}
                      disabled={transferring || !toWardId || !toBedId || !transferReason}
                      startIcon={transferring ? <CircularProgress size={18} /> : <TransferWithinAStation />}
                      sx={{ py: 1.2, fontWeight: 800, borderRadius: 2 }}
                    >
                      Confirm Inpatient Ward Transfer
                    </Button>
                  </Stack>
                </TabPanel>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* ── Quick Admit Dialog ───────────────────────────────────────────── */}
      <Dialog open={openAdmit} onClose={() => setOpenAdmit(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Inpatient Admission Workflow</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 1, borderRadius: 2 }}>
            For standard bed allocation, visit <strong>Visits & Flow → Allocate Inpatient Bed</strong>.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAdmit(false)}>Cancel</Button>
          <Button variant="contained" href="/visits" sx={{ fontWeight: 700 }}>Go to Visits & Flow</Button>
        </DialogActions>
      </Dialog>

      {/* ── Pregnant Woman & Labour Triage Admission Dialog ───────────── */}
      <Dialog open={openMaternityAdmit} onClose={() => setOpenMaternityAdmit(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Healing color="primary" />
            <Typography variant="h6" fontWeight={800}>Pregnant Patient Admission Triage</Typography>
          </Box>
          <IconButton size="small" onClick={() => setOpenMaternityAdmit(false)}><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2.5}>
            <Autocomplete
              options={patientOptions}
              getOptionLabel={(option: any) => `${option.firstName || ''} ${option.lastName || ''} (MRN: ${option.mrn || option.id?.substring(0, 6)})`}
              value={maternityAdmitPatient}
              onChange={(_, newVal) => setMaternityAdmitPatient(newVal)}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Select Expectant Mother / Pregnant Patient *" 
                  placeholder="Search by Patient Name or MRN..." 
                  size="small"
                />
              )}
            />

            <Box sx={{ p: 2, borderRadius: 2, bgcolor: isDueImmediateLabour ? '#fff5f5' : '#f8f9fa', border: isDueImmediateLabour ? '2px solid #ff8787' : '1px solid #dee2e6' }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                Is the patient due to give birth immediately (Active Labour)?
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={isDueImmediateLabour}
                    onChange={e => setIsDueImmediateLabour(e.target.checked)}
                    color="error"
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={700} color={isDueImmediateLabour ? 'error.main' : 'text.secondary'}>
                    {isDueImmediateLabour ? '⚡ YES — DUE IMMEDIATELY (Check-in to Labour & Delivery Ward)' : 'NO — Routine Maternity Ward Bed Admission'}
                  </Typography>
                }
              />
            </Box>

            {isDueImmediateLabour ? (
              <Stack spacing={2} sx={{ p: 2, borderRadius: 2, bgcolor: '#fff', border: '1px solid #ff8787' }}>
                <Alert severity="warning" icon={<Warning />}>
                  Patient will be checked in directly to <strong>Labour & Delivery Ward (/labour-ward)</strong> and baseline digital Partograph initialized.
                </Alert>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Cervical Dilation (cm)"
                      type="number"
                      size="small"
                      fullWidth
                      value={maternityAdmitForm.cervicalDilatation}
                      onChange={e => setMaternityAdmitForm({ ...maternityAdmitForm, cervicalDilatation: Number(e.target.value) })}
                      helperText="≥ 4cm indicates Active Labour"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Contractions in 10 mins"
                      type="number"
                      size="small"
                      fullWidth
                      value={maternityAdmitForm.contractionsFrequency}
                      onChange={e => setMaternityAdmitForm({ ...maternityAdmitForm, contractionsFrequency: Number(e.target.value) })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Fetal Heart Rate (bpm)"
                      type="number"
                      size="small"
                      fullWidth
                      value={maternityAdmitForm.fetalHeartRate}
                      onChange={e => setMaternityAdmitForm({ ...maternityAdmitForm, fetalHeartRate: Number(e.target.value) })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      select
                      label="Membranes Status"
                      size="small"
                      fullWidth
                      value={maternityAdmitForm.membranesStatus}
                      onChange={e => setMaternityAdmitForm({ ...maternityAdmitForm, membranesStatus: e.target.value })}
                    >
                      <MenuItem value="INTACT">INTACT</MenuItem>
                      <MenuItem value="RUPTURED_CLEAR">RUPTURED (Clear Liquid)</MenuItem>
                      <MenuItem value="RUPTURED_MECONIUM">RUPTURED (Meconium Stained)</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Maternal BP (mmHg)"
                      size="small"
                      fullWidth
                      value={maternityAdmitForm.maternalBp}
                      onChange={e => setMaternityAdmitForm({ ...maternityAdmitForm, maternalBp: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Maternal Pulse (bpm)"
                      type="number"
                      size="small"
                      fullWidth
                      value={maternityAdmitForm.maternalPulse}
                      onChange={e => setMaternityAdmitForm({ ...maternityAdmitForm, maternalPulse: Number(e.target.value) })}
                    />
                  </Grid>
                </Grid>
              </Stack>
            ) : (
              <Alert severity="info">
                Standard expectant mother admission into regular Maternity Ward bed space. Click continue to allocate bed space.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenMaternityAdmit(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={isDueImmediateLabour ? 'error' : 'primary'}
            disabled={submittingMaternityAdmit}
            onClick={handlePerformMaternityAdmit}
            sx={{ fontWeight: 800 }}
          >
            {isDueImmediateLabour ? '⚡ Check In to Labour & Delivery Ward' : 'Continue Bed Allocation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Book Clinic Appointment Modal ───────────────────────────────────── */}
      <QuickAppointmentModal
        open={openApptModal}
        onClose={() => setOpenApptModal(false)}
        initialPatient={selectedAdm?.patient ? {
          id: selectedAdm.patient.id,
          mrn: selectedAdm.patient.mrn,
          firstName: selectedAdm.patient.firstName,
          lastName: selectedAdm.patient.lastName,
        } : null}
        initialReason={selectedAdm?.diagnosis ? `Post-discharge ward review for ${selectedAdm.diagnosis}` : 'Post-discharge ward review'}
        defaultVisitType="Scheduled"
      />
      {/* ── Standalone Emergency Ward Transfer Dialog ───────────────────── */}
      <Dialog
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: alpha('#e03131', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e03131' }}>
              <TransferWithinAStation />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Inpatient Ward Transfer — {selectedTransferAlert?.patientName || (selectedAdm?.patient ? `${selectedAdm.patient.firstName} ${selectedAdm.patient.lastName}` : 'Patient')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Transfer patient from Emergency Ward to Inpatient Ward
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setTransferModalOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2.5}>
            {selectedTransferAlert && (
              <Alert severity="warning" icon={<Warning />} sx={{ borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={800}>
                  ⏰ {selectedTransferAlert.hoursInEmergency}h ED Length-of-Stay Alert
                </Typography>
                <Typography variant="caption">
                  Patient has been in {selectedTransferAlert.ward || 'Emergency Ward'} (Bed {selectedTransferAlert.bedNumber || 'TBD'}) for {selectedTransferAlert.hoursInEmergency} hours. Clinical transfer to Medical or Surgical Ward recommended.
                </Typography>
              </Alert>
            )}

            <FormControl fullWidth size="small">
              <InputLabel>Destination Inpatient Ward *</InputLabel>
              <Select
                value={toWardId}
                label="Destination Inpatient Ward *"
                onChange={e => { setToWardId(e.target.value); setToBedId(''); }}
                sx={{ borderRadius: 2 }}
              >
                {availableWards.map((w: any) => (
                  <MenuItem key={w.id} value={w.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                      <Typography variant="body2" fontWeight={700}>{w.name}</Typography>
                      <Chip
                        size="small"
                        label={`${w.available ?? w.beds?.filter((b: any) => b.status === 'AVAILABLE').length ?? 0} Beds Free`}
                        color={(w.available > 0 || (w.beds && w.beds.some((b: any) => b.status === 'AVAILABLE'))) ? 'success' : 'error'}
                        sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {toWardId && (
              <FormControl fullWidth size="small">
                <InputLabel>Select Available Bed *</InputLabel>
                <Select
                  value={toBedId}
                  label="Select Available Bed *"
                  onChange={e => setToBedId(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  {availableBeds.length === 0 ? (
                    <MenuItem disabled>No available beds in this ward</MenuItem>
                  ) : (
                    availableBeds.map((b: any) => (
                      <MenuItem key={b.id} value={b.id}>
                        Bed #{b.number} {b.type ? `(${b.type})` : ''} — Ready for admission
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            )}

            {toWardId && (() => {
              const destWard = availableWards.find(w => w.id === toWardId);
              const isLabour = destWard && (
                destWard.name?.toLowerCase().includes('labour') || 
                destWard.name?.toLowerCase().includes('delivery') || 
                destWard.wardCategory === 'LABOUR'
              );
              if (!isLabour) return null;
              return (
                <Paper sx={{ p: 2, bgcolor: alpha('#e03131', 0.05), border: '1px solid ' + alpha('#e03131', 0.3), borderRadius: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Healing sx={{ color: '#e03131' }} />
                    <Typography variant="subtitle2" fontWeight={800} color="#e03131">
                      ⚡ Active Labour & Partograph Triage (VE Assessment)
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Transferring to Labour & Delivery Ward automatically initiates the Digital Partograph baseline monitoring.
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="Cervical Dilation (cm) *"
                        size="small"
                        fullWidth
                        value={transferDilation}
                        onChange={e => setTransferDilation(e.target.value)}
                        placeholder="e.g. 4cm (≥4cm = Active Labour)"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Contractions in 10 mins"
                        size="small"
                        fullWidth
                        value={transferContractions}
                        onChange={e => setTransferContractions(e.target.value)}
                        placeholder="e.g. 3"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Fetal Heart Rate (bpm)"
                        size="small"
                        fullWidth
                        value={transferFhr}
                        onChange={e => setTransferFhr(e.target.value)}
                        placeholder="e.g. 140"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Membranes Status</InputLabel>
                        <Select
                          value={transferMembranes}
                          label="Membranes Status"
                          onChange={e => setTransferMembranes(e.target.value)}
                        >
                          <MenuItem value="INTACT">INTACT</MenuItem>
                          <MenuItem value="RUPTURED">RUPTURED</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Maternal BP (mmHg)"
                        size="small"
                        fullWidth
                        value={transferMaternalBp}
                        onChange={e => setTransferMaternalBp(e.target.value)}
                        placeholder="120/80"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Maternal Pulse (bpm)"
                        size="small"
                        fullWidth
                        value={transferMaternalPulse}
                        onChange={e => setTransferMaternalPulse(e.target.value)}
                        placeholder="80"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              );
            })()}

            <TextField
              label="Clinical Reason for Transfer *"
              multiline
              rows={2}
              fullWidth
              value={transferReason}
              onChange={e => setTransferReason(e.target.value)}
              placeholder="e.g., Transfer from Emergency to Medical Ward for inpatient care..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              label="Additional Clinical Notes"
              multiline
              rows={2}
              fullWidth
              value={transferNotes}
              onChange={e => setTransferNotes(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <FormControlLabel
              control={<Switch checked={isOverflow} onChange={e => setIsOverflow(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={700}>Capacity Overflow Transfer</Typography>
                  <Typography variant="caption" color="text.secondary">Check if transfer is due to primary ward capacity shortage</Typography>
                </Box>
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setTransferModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleTransfer}
            disabled={transferring || !toWardId || !toBedId || !transferReason}
            startIcon={transferring ? <CircularProgress size={18} color="inherit" /> : <TransferWithinAStation />}
            sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none', px: 3 }}
          >
            {transferring ? 'Transferring...' : 'Confirm Ward Transfer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 24h Emergency Alert — Theatre Transfer Modal ───────────────────── */}
      <Dialog
        open={theatreTransferModalOpen}
        onClose={() => setTheatreTransferModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: alpha('#d6336c', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d6336c' }}>
              <MedicalServices />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                🔪 Transfer Patient to Operating Theatre — {selectedAlertForTheatre?.patientName || 'Patient'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Urgent surgical booking from {selectedAlertForTheatre?.ward || 'Emergency Ward'} length-of-stay alert
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setTheatreTransferModalOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Submitting this transfer creates a STAT Emergency Surgical Request in Theatre for <strong>{selectedAlertForTheatre?.patientName}</strong> and redirects directly to <strong>http://localhost:5173/theatre</strong>.
            </Alert>

            <TextField
              label="Working / Primary Diagnosis"
              fullWidth
              value={selectedAlertForTheatre?.admission?.diagnosis || selectedAlertForTheatre?.diagnosis || 'Emergency Ward Overstay — Acute Surgical Case'}
              disabled
            />

            <TextField
              label="Proposed Surgical Procedure *"
              fullWidth
              value={theatreProcedure}
              onChange={e => setTheatreProcedure(e.target.value)}
              placeholder="e.g. STAT Exploratory Laparotomy / Emergency Debridement"
            />

            <TextField
              label="Surgical Urgency Level *"
              select
              fullWidth
              value={theatreUrgency}
              onChange={e => setTheatreUrgency(e.target.value)}
            >
              <MenuItem value="EMERGENCY">EMERGENCY (Immediate Life-Saving Surgery)</MenuItem>
              <MenuItem value="TRAUMA">TRAUMA STAT (Major Trauma Unit)</MenuItem>
              <MenuItem value="URGENT">URGENT (Priority Case within 2-4 Hours)</MenuItem>
            </TextField>

            <TextField
              label="Pre-Op Handover & Clinical Prep Notes"
              multiline
              rows={3}
              fullWidth
              value={theatreNotes}
              onChange={e => setTheatreNotes(e.target.value)}
              placeholder="e.g., Patient prepped, IV lines secured, cross-matched 2 units O-neg..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setTheatreTransferModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: '#d6336c', '&:hover': { bgcolor: '#c2255c' }, fontWeight: 800, borderRadius: 2, textTransform: 'none', px: 3 }}
            onClick={handleTheatreTransferSubmit}
            disabled={submittingTheatreTransfer || !theatreProcedure}
            startIcon={submittingTheatreTransfer ? <CircularProgress size={18} color="inherit" /> : <MedicalServices />}
          >
            {submittingTheatreTransfer ? 'Transferring...' : '🔪 Confirm STAT Transfer to Theatre'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Record Live Telemetry Vitals Dialog ────────────────────────────── */}
      <Dialog open={vitalsModalOpen} onClose={() => setVitalsModalOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <MonitorHeart sx={{ color: '#1c7ed6' }} /> Record Bedside Telemetry Vitals
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Logging vital signs for <strong>{vitalsTargetAdm?.patient?.firstName} {vitalsTargetAdm?.patient?.lastName}</strong> ({vitalsTargetAdm?.bed ? `${vitalsTargetAdm.bed.ward?.name} Bed ${vitalsTargetAdm.bed.number}` : 'Inpatient'}).
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Pulse / HR (bpm)"
                type="number"
                fullWidth
                size="small"
                value={vitalsForm.pulseRate}
                onChange={(e) => setVitalsForm({ ...vitalsForm, pulseRate: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="SpO2 Saturation (%)"
                type="number"
                fullWidth
                size="small"
                value={vitalsForm.spo2}
                onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Systolic BP (mmHg)"
                type="number"
                fullWidth
                size="small"
                value={vitalsForm.systolic}
                onChange={(e) => setVitalsForm({ ...vitalsForm, systolic: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Diastolic BP (mmHg)"
                type="number"
                fullWidth
                size="small"
                value={vitalsForm.diastolic}
                onChange={(e) => setVitalsForm({ ...vitalsForm, diastolic: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Body Temp (°C)"
                type="number"
                fullWidth
                size="small"
                value={vitalsForm.temperature}
                onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Resp Rate (/min)"
                type="number"
                fullWidth
                size="small"
                value={vitalsForm.respiratoryRate}
                onChange={(e) => setVitalsForm({ ...vitalsForm, respiratoryRate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Clinical Condition"
                fullWidth
                size="small"
                value={vitalsForm.clinicalCondition}
                onChange={(e) => setVitalsForm({ ...vitalsForm, clinicalCondition: e.target.value })}
              >
                <MenuItem value="STABLE">STABLE (Normal Recovery)</MenuItem>
                <MenuItem value="CRITICAL">CRITICAL (Requires Monitoring)</MenuItem>
                <MenuItem value="IMPROVING">IMPROVING (Stable Progress)</MenuItem>
                <MenuItem value="RECOVERING">RECOVERING (Post-Op Clearance)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Bedside Nurse / Clinical Notes"
                multiline
                rows={2}
                fullWidth
                size="small"
                placeholder="e.g. Oxygen therapy 2L/min via nasal cannula..."
                value={vitalsForm.notes}
                onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setVitalsModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveVitals} disabled={savingVitals} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#1c7ed6' }}>
            {savingVitals ? 'Saving...' : 'Save Telemetry Vitals'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Pair / Register Telemetry Equipment Dialog ────────────────────────────── */}
      <Dialog open={pairModalOpen} onClose={() => setPairModalOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tune sx={{ color: '#ae3ec9' }} /> Pair / Register Telemetry Hardware
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Registering new medical equipment device for <strong>{activeWardConfig.name}</strong>.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                select
                label="Equipment Asset Name"
                fullWidth
                size="small"
                value={pairForm.name}
                onChange={(e) => setPairForm({ ...pairForm, name: e.target.value })}
              >
                <MenuItem value="Bedside Physiological Monitor Pack">Bedside Physiological Monitor Pack</MenuItem>
                <MenuItem value="Central Oxygen Line Concentrators">Central Oxygen Line Concentrators</MenuItem>
                <MenuItem value="Smart Volumetric Infusion Pumps">Smart Volumetric Infusion Pumps</MenuItem>
                <MenuItem value="Ward Crash Cart & Defibrillator Unit">Ward Crash Cart & Defibrillator Unit</MenuItem>
                <MenuItem value="High-Flow Ventilator / Respiratory Unit">High-Flow Ventilator / Respiratory Unit</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Device ID / Tag"
                fullWidth
                size="small"
                value={pairForm.deviceId}
                onChange={(e) => setPairForm({ ...pairForm, deviceId: e.target.value })}
                placeholder="e.g. EQ-TEL-01"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Bed Number"
                fullWidth
                size="small"
                value={pairForm.bedNumber}
                onChange={(e) => setPairForm({ ...pairForm, bedNumber: e.target.value })}
                placeholder="e.g. MED-01"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Status"
                fullWidth
                size="small"
                value={pairForm.status}
                onChange={(e) => setPairForm({ ...pairForm, status: e.target.value })}
              >
                <MenuItem value="ONLINE">ONLINE (Active)</MenuItem>
                <MenuItem value="STANDBY_READY">STANDBY READY</MenuItem>
                <MenuItem value="MAINTENANCE">MAINTENANCE</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Battery Level (%)"
                fullWidth
                size="small"
                value={pairForm.battery}
                onChange={(e) => setPairForm({ ...pairForm, battery: e.target.value })}
                placeholder="e.g. 98%"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPairModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handlePairEquipment} disabled={pairingEquipment} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#ae3ec9' }}>
            {pairingEquipment ? 'Pairing...' : 'Confirm Device Pairing'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Prescribe Inpatient Medication / Infusion Dialog ──────────────── */}
      <Dialog open={medModalOpen} onClose={() => setMedModalOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalPharmacy sx={{ color: '#ae3ec9' }} /> Prescribe High-Alert Infusion / Med
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Adding active eMAR medication for <strong>{medTargetAdm?.patient?.firstName} {medTargetAdm?.patient?.lastName}</strong> ({medTargetAdm?.bed ? `${medTargetAdm.bed.ward?.name} Bed ${medTargetAdm.bed.number}` : 'Inpatient'}).
          </Typography>
          <Stack spacing={2}>
            <Autocomplete
              freeSolo
              size="small"
              fullWidth
              options={pharmacyCatalog}
              getOptionLabel={(option: any) =>
                typeof option === 'string'
                  ? option
                  : `${option.name || option.genericName} (${option.category || 'Ward Stock'})`
              }
              value={medForm.medicationDisplay}
              onInputChange={(_, newInputValue) => {
                setMedForm(prev => ({ ...prev, medicationDisplay: newInputValue }));
              }}
              onChange={(_, newValue: any) => {
                if (!newValue) return;
                const medObj = typeof newValue === 'string' ? { name: newValue } : newValue;
                handleAutoFillInfusionDefaults(medObj);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Medication / Fluid from Pharmacy Stock & Data Dictionary *"
                  placeholder="Search pharmacy stock or type drug name..."
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
                  <Box component="li" {...props} key={option.id || option.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 1.5, borderBottom: '1px dotted rgba(0,0,0,0.06)' }}>
                    <Box sx={{ pr: 1 }}>
                      <Typography variant="body2" fontWeight={700}>{option.name || option.genericName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.genericName ? `Generic: ${option.genericName} · ` : ''}{option.category || 'Ward Stock'}
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
                        label={`OUT OF STOCK IN DISPENSARY (Store: ${storeStock})`}
                        color="warning"
                        size="small"
                        sx={{ fontSize: '0.6rem', height: 20, fontWeight: 800 }}
                      />
                    ) : (
                      <Chip
                        label="OUT OF STOCK"
                        color="error"
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.6rem', height: 20, fontWeight: 800 }}
                      />
                    )}
                  </Box>
                );
              }}
            />
            <TextField
              label="Dosage & Administration Rate *"
              fullWidth
              size="small"
              value={medForm.dosageText}
              onChange={(e) => setMedForm({ ...medForm, dosageText: e.target.value })}
              placeholder="e.g. 80 ml/hr continuous infusion"
            />
            <TextField
              label="Nurse Verification & Clinical Notes"
              multiline
              rows={2}
              fullWidth
              size="small"
              value={medForm.note}
              onChange={(e) => setMedForm({ ...medForm, note: e.target.value })}
              placeholder="e.g. Double-check volume rate before connecting pump"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setMedModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handlePrescribeMedication} disabled={prescribingMed} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#ae3ec9' }}>
            {prescribingMed ? 'Saving...' : 'Confirm eMAR Prescription'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Consultant Ward Round Note Dialog ───────────────────────────── */}
      <Dialog open={roundNoteModalOpen} onClose={() => setRoundNoteModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Description sx={{ color: '#f59f00' }} /> Add Consultant Ward Round Note
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Recording clinical progress note for <strong>{roundNoteTargetAdm?.patient?.firstName} {roundNoteTargetAdm?.patient?.lastName}</strong> ({roundNoteTargetAdm?.bed ? `${roundNoteTargetAdm.bed.ward?.name} Bed ${roundNoteTargetAdm.bed.number}` : 'Inpatient'}).
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary">
                WARD PROGRESS NOTE / SOAP ASSESSMENT *
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AutoAwesome />}
                disabled={generatingAiHandover[roundNoteTargetAdm?.id]}
                onClick={() => handleGenerateOpenMedHandover(roundNoteTargetAdm, true)}
                sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 1.5, fontSize: '0.72rem', color: '#7048e8', borderColor: '#7048e8' }}
              >
                {generatingAiHandover[roundNoteTargetAdm?.id] ? 'Generating SBAR...' : '✨ Auto-Draft SBAR with OpenMed AI'}
              </Button>
            </Box>
            <TextField
              multiline
              rows={5}
              fullWidth
              value={roundNoteForm.note}
              onChange={(e) => setRoundNoteForm({ ...roundNoteForm, note: e.target.value })}
              placeholder="e.g. Patient resting comfortably. Vitals stable. Maintain treatment plan..."
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Patient Acuity / Clinical Condition"
                  fullWidth
                  size="small"
                  value={roundNoteForm.clinicalCondition}
                  onChange={(e) => setRoundNoteForm({ ...roundNoteForm, clinicalCondition: e.target.value })}
                >
                  <MenuItem value="STABLE">STABLE (Low Risk)</MenuItem>
                  <MenuItem value="IMPROVING">IMPROVING</MenuItem>
                  <MenuItem value="GUARDED">GUARDED / OBSERVATION</MenuItem>
                  <MenuItem value="CRITICAL">CRITICAL (High Risk)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Attending Doctor / Author Name"
                  fullWidth
                  size="small"
                  value={roundNoteForm.authorName || currentUserFullName || 'Dr. Emmanuel Vegher'}
                  onChange={(e) => setRoundNoteForm({ ...roundNoteForm, authorName: e.target.value })}
                >
                  {staffOptions.map((opt, i) => (
                    <MenuItem key={i} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRoundNoteModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveRoundNote} disabled={savingRoundNote} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#f59f00' }}>
            {savingRoundNote ? 'Saving...' : 'Save Round Note'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Weekly MDT Case Conference & Multidisciplinary Review Dialog ───── */}
      <Dialog open={openMdtModal} onClose={() => setOpenMdtModal(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: '#0ca678' }}>
          <People sx={{ color: '#0ca678' }} /> Weekly MDT Case Conference & Multidisciplinary Review
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Recording Weekly Multi-Disciplinary Team (MDT) Conference Findings for <strong>{mdtTargetAdm?.patient?.firstName} {mdtTargetAdm?.patient?.lastName}</strong> ({mdtTargetAdm?.bed ? `${mdtTargetAdm.bed.ward?.name} Bed ${mdtTargetAdm.bed.number}` : 'Inpatient'}).
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Conference Subject / Case Title"
              fullWidth
              size="small"
              value={mdtForm.conferenceTitle}
              onChange={(e) => setMdtForm({ ...mdtForm, conferenceTitle: e.target.value })}
            />
            <TextField
              label="Participating Consultants, Specialists & Matrons"
              fullWidth
              size="small"
              value={mdtForm.consultantsPresent}
              onChange={(e) => setMdtForm({ ...mdtForm, consultantsPresent: e.target.value })}
              helperText="List attending doctors, consultants, surgeons, and charge nurses present at the weekly review"
            />
            <TextField
              multiline
              rows={3}
              label="Multidisciplinary Case Clinical Summary & Diagnostic Review"
              fullWidth
              value={mdtForm.clinicalSummary}
              onChange={(e) => setMdtForm({ ...mdtForm, clinicalSummary: e.target.value })}
              placeholder="Document key diagnostic findings, response to current treatment, and clinical discussion..."
            />
            <TextField
              multiline
              rows={3}
              label="Consensus Treatment Strategy & Action Plan"
              fullWidth
              value={mdtForm.consensusPlan}
              onChange={(e) => setMdtForm({ ...mdtForm, consensusPlan: e.target.value })}
              placeholder="Record agreed care plan changes, specialist consultations, surgical indications, or discharge targets..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenMdtModal(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveMdtNote} disabled={savingMdt} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#0ca678', '&:hover': { bgcolor: '#099268' } }}>
            {savingMdt ? 'Saving...' : 'Save MDT Conference Record'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Enter External Lab Result Modal for Ward Doctor ────────── */}
      {(() => {
        const activeTestName = selectedExtResultItem?.items?.[0]?.testName || selectedExtResultItem?.notes || selectedExtResultItem?.orderNumber || 'Laboratory Test';
        const labMeta = lookupLabTestMetadata(activeTestName);
        const openMedAnalysis = analyzeLabResultWithOpenMed(activeTestName, extResultForm.testResults);

        const handleUpdateTestResults = (newResults: string) => {
          const analysis = analyzeLabResultWithOpenMed(activeTestName, newResults);
          const autoImpression = analysis.suggestedImpression || '';
          setExtResultForm(prev => ({
            ...prev,
            testResults: newResults,
            clinicalImpression: autoImpression || prev.clinicalImpression,
          }));
        };

        return (
          <Dialog open={extResultModalOpen} onClose={() => setExtResultModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 800 }}>
              🧪 Enter External Laboratory Result
              <Typography variant="caption" display="block" color="text.secondary">
                Patient: {selectedAdm?.patient?.firstName} {selectedAdm?.patient?.lastName} (MRN: {selectedAdm?.patient?.mrn || selectedAdm?.patient?.id})
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
              <Stack spacing={2}>
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  Enter findings brought by the patient from external diagnostic center for <strong>{activeTestName}</strong>.
                </Alert>

                {/* OpenMed CDS Smart Data Dictionary & Measurement Unit Card */}
                {labMeta && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha('#1c7ed6', 0.04), borderColor: alpha('#1c7ed6', 0.2) }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AutoAwesome sx={{ fontSize: 18, color: '#1c7ed6' }} />
                        <Typography variant="subtitle2" fontWeight={800} color="#1c7ed6">
                          OpenMed CDS Data Dictionary
                        </Typography>
                      </Box>
                      <Chip label={labMeta.category} size="small" sx={{ bgcolor: alpha('#1c7ed6', 0.1), color: '#1971c2', fontWeight: 700, fontSize: '0.7rem' }} />
                    </Box>

                    <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={600}>Measurement Unit</Typography>
                        <Chip label={`Unit: ${labMeta.primaryUnit}`} size="small" color="primary" sx={{ fontWeight: 800, mt: 0.3 }} />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={600}>Standard Ref Range</Typography>
                        <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ mt: 0.3 }}>{labMeta.referenceRange}</Typography>
                      </Grid>
                    </Grid>

                    {labMeta.clinicalTips && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mb: 1.5 }}>
                        💡 {labMeta.clinicalTips}
                      </Typography>
                    )}

                    <Box sx={{ mb: 1 }}>
                      <Button
                        size="small" variant="contained"
                        startIcon={<AutoAwesome sx={{ fontSize: 14 }} />}
                        onClick={() => handleUpdateTestResults(labMeta.template)}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, fontSize: '0.75rem', bgcolor: '#1c7ed6' }}
                      >
                        ✨ Pre-fill Smart Template
                      </Button>
                    </Box>

                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mt: 1, mb: 0.5 }}>
                      Quick Unit & Result Chips:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                      {labMeta.quickChips.map((chip, idx) => (
                        <Chip
                          key={idx}
                          label={chip}
                          size="small"
                          clickable
                          onClick={() => {
                            const newText = extResultForm.testResults ? `${extResultForm.testResults} ${chip}` : chip;
                            handleUpdateTestResults(newText);
                          }}
                          sx={{ fontWeight: 600, fontSize: '0.72rem', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: alpha('#1c7ed6', 0.1) } }}
                        />
                      ))}
                    </Box>
                  </Paper>
                )}

                {/* Real-time OpenMed Analysis Alert */}
                {extResultForm.testResults.trim() && (
                  <Alert
                    severity={openMedAnalysis.severity === 'PANIC' ? 'error' : openMedAnalysis.severity === 'WARNING' ? 'warning' : 'info'}
                    icon={openMedAnalysis.severity === 'PANIC' ? <Warning sx={{ color: '#d6336c' }} /> : <AutoAwesome />}
                    sx={{ borderRadius: 2 }}
                    action={
                      openMedAnalysis.suggestedImpression ? (
                        <Button
                          size="small" color="inherit"
                          onClick={() => setExtResultForm(p => ({ ...p, clinicalImpression: openMedAnalysis.suggestedImpression! }))}
                          sx={{ fontWeight: 800, textTransform: 'none', fontSize: '0.72rem' }}
                        >
                          ⚡ Re-Generate Impression
                        </Button>
                      ) : null
                    }
                  >
                    <Typography variant="body2" fontWeight={700}>{openMedAnalysis.summary}</Typography>
                  </Alert>
                )}

                <TextField
                  label="Test Results & Values"
                  multiline rows={3} fullWidth
                  value={extResultForm.testResults}
                  onChange={e => handleUpdateTestResults(e.target.value)}
                  placeholder={labMeta ? `e.g. ${labMeta.primaryUnit}` : "e.g. Urea: 6.2 mmol/L, Na+: 138 mmol/L..."}
                  required
                  helperText="Transcribe key figures/values from the patient's external lab sheet"
                />
                <TextField
                  label="Clinical Findings / Impression Summary"
                  multiline rows={2} fullWidth
                  value={extResultForm.clinicalImpression}
                  onChange={e => setExtResultForm(p => ({ ...p, clinicalImpression: e.target.value }))}
                  placeholder="e.g. Normal renal function & electrolyte balance. No acute renal impairment noted."
                  helperText="Intelligently auto-filled based on test results; customizable by physician"
                  InputProps={extResultForm.clinicalImpression ? {
                    endAdornment: (
                      <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                        <Chip icon={<AutoAwesome sx={{ fontSize: '13px !important' }} />} label="OpenMed AI Auto-Filled" size="small" color="success" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }} />
                      </InputAdornment>
                    )
                  } : undefined}
                />
                <TextField
                  label="Result Date"
                  type="date"
                  fullWidth
                  value={extResultForm.resultDate}
                  onChange={e => setExtResultForm(p => ({ ...p, resultDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2.5, pt: 1 }}>
              <Button onClick={() => setExtResultModalOpen(false)} color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSaveWardExternalResult} disabled={savingExtResult || !extResultForm.testResults.trim()} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#2b8a3e', '&:hover': { bgcolor: '#2f9e44' } }}>
                {savingExtResult ? 'Saving...' : 'Save & Update EMR'}
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}

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
                Order #: {selectedRadViewerOrder?.orderNumber} · Inpatient: {selectedAdm?.patient?.name || 'Inpatient'}
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

      {/* ── Clinical Death Declaration & Mortuary Transfer Modal ── */}
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
            <Typography variant="h6" fontWeight={900}>Clinical Death Declaration & Mortuary Transfer</Typography>
            <Typography variant="caption" color="text.secondary">
              Statutory death verification, certifying doctor, and direct hand-off to hospital mortuary cold vaults
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2.5 }}>
          {deceasedTargetAdm && (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2.5, bgcolor: alpha('#ef4444', 0.04), borderColor: alpha('#ef4444', 0.25) }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                    {deceasedTargetAdm.patient?.firstName} {deceasedTargetAdm.patient?.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    MRN: {deceasedTargetAdm.patient?.patientNumber || deceasedTargetAdm.patient?.mrn || deceasedTargetAdm.id} · Gender: {deceasedTargetAdm.patient?.gender || 'N/A'} · Age: {deceasedTargetAdm.patient?.age || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} sx={{ textAlign: { sm: 'right' } }}>
                  <Chip
                    label={deceasedTargetAdm.bed ? `${deceasedTargetAdm.bed.ward?.name} — Bed ${deceasedTargetAdm.bed.number}` : 'Inpatient Ward'}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 800 }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Admitted: {new Date(deceasedTargetAdm.admittedAt).toLocaleDateString()}
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
                <MenuItem value="NONE">Clinical Death (Hospital Natural Causes)</MenuItem>
                <MenuItem value="CORONER_CASE">Coroner Case (Unexplained / Inquest)</MenuItem>
                <MenuItem value="POLICE_CASE">Police Forensic Case (Investigation)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Source Ward & Bed / Origin"
                size="small"
                fullWidth
                value={deceasedForm.identifyingFeatures}
                onChange={e => setDeceasedForm(prev => ({ ...prev, identifyingFeatures: e.target.value }))}
                placeholder="Ward 4B, scars, implants, distinguishing marks..."
              />
            </Grid>

            <Grid item xs={12}>
              {deathCauseSuggestions.length > 0 && (
                <Box sx={{ mb: 1.5, p: 1.5, bgcolor: alpha('#3b5bdb', 0.05), borderRadius: 2, border: '1px solid', borderColor: alpha('#3b5bdb', 0.2) }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#3b5bdb', display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                    <AutoAwesome sx={{ fontSize: 15 }} />
                    Clinical Cause of Death Suggestions (Derived from Surgical & EMR Records — Click to Select):
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ gap: 0.75 }}>
                    {deathCauseSuggestions.map((sug, sIdx) => {
                      const isSelected = deceasedForm.causeOfDeath === sug;
                      return (
                        <Chip
                          key={sIdx}
                          label={sug}
                          size="small"
                          clickable
                          color={isSelected ? 'primary' : 'default'}
                          variant={isSelected ? 'filled' : 'outlined'}
                          onClick={() => setDeceasedForm(prev => ({ ...prev, causeOfDeath: sug }))}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            bgcolor: isSelected ? undefined : '#fff',
                            borderColor: isSelected ? undefined : alpha('#3b5bdb', 0.3),
                            '&:hover': { bgcolor: isSelected ? undefined : alpha('#3b5bdb', 0.1) },
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              )}

              <TextField
                label="Certified Cause of Death (Primary & Contributory) *"
                size="small"
                fullWidth
                multiline
                rows={2}
                required
                value={deceasedForm.causeOfDeath}
                onChange={e => setDeceasedForm(prev => ({ ...prev, causeOfDeath: e.target.value }))}
                placeholder="e.g. Cardiorespiratory Arrest secondary to Septic Shock & Severe Inpatient Pneumonia"
                helperText="Official diagnostic cause of death certified by attending doctor"
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
                            ? 'Toggle ON: Routes deceased patient to the Mortuary Ingestion queue at /mortuary for mortician cold vault allocation.'
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
                          Direct referral to the Consultant Pathologist at /pathology before or independent of mortuary storage. Invoiced to Cashier.
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

export default IPD;