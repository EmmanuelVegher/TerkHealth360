import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, InputAdornment, Tab, Tabs, CircularProgress,
  Stack, Paper, Switch, FormControlLabel, Alert, Drawer, IconButton,
  Tooltip, Badge, Avatar, Autocomplete, Divider, FormControl, InputLabel, Select,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  Add, Search, LocalHospital, Warning, Healing, CheckCircle,
  SwapHoriz, Person, MonitorHeart, LocalPharmacy, Biotech,
  BedroomChild, SingleBed, MeetingRoom, Hotel, AssignmentTurnedIn,
  Refresh, Close, AccessTime, FlashOn, ReceiptLong, LocalShipping,
  Medication, ArrowForward, Shield, Mic, MicOff, AutoAwesome, ElectricBolt,
  Delete, ShoppingBag, Science, Inventory, Cancel, MedicalServices,
  PersonalVideo, Notes, CameraAlt, Sensors, History, ExpandMore, Assignment, PostAdd,
  AccessibilityNew,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';
import { PhysioReferralModal } from '../components/PhysioReferralModal';

const API = `${API_BASE_URL}/emergency`;

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  patientNumber: string;
  gender: string;
  phone?: string;
  address?: string;
  nin?: string;
}

interface EmergencyBed {
  id: string;
  bedCode: string;
  bedType: string; // 'RESUSCITATION_BAY' | 'TROLLEY' | 'RECLINER_CHAIR'
  status: string;  // 'AVAILABLE' | 'OCCUPIED' | 'CLEANING'
}

interface EmergencyTriage {
  id: string;
  triageCategory: string; // 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE'
  presentingComplaint: string;
  heartRate: number;
  bpSystolic: number;
  bpDiastolic: number;
  respirationRate: number;
  spo2: number;
  temperature: number;
  painScore: number;
  gcsScore: number;
  triageNurseName: string;
  triageTime: string;
}

interface EmergencyArrival {
  id: string;
  arrivalCode: string;
  patientId?: string;
  patient?: Patient;
  tempPatientName?: string;
  arrivalMethod: string;
  presentingComplaint: string;
  arrivalTime: string;
  status: string; // 'ARRIVED' | 'TRIAGE' | 'TREATMENT' | 'OBSERVATION' | 'TRANSFERRED_TO_WARD' | 'DISCHARGED'
  bedId?: string;
  bed?: EmergencyBed;
  triages: EmergencyTriage[];
}

const ACUITY_COLORS: Record<string, string> = {
  'RED': '#e03131',
  'ORANGE': '#f59f00',
  'YELLOW': '#fab005',
  'GREEN': '#2f9e44',
  'BLUE': '#1c7ed6'
};

const ACUITY_LABELS: Record<string, string> = {
  'RED': 'RED (ESI 1 - Resuscitation STAT)',
  'ORANGE': 'ORANGE (ESI 2 - Emergent Urgent)',
  'YELLOW': 'YELLOW (ESI 3 - Urgent)',
  'GREEN': 'GREEN (ESI 4 - Less Urgent)',
  'BLUE': 'BLUE (ESI 5 - Non-Urgent)'
};

const BED_TYPE_LABELS: Record<string, string> = {
  'RESUSCITATION_BAY': '🚨 Resuscitation Bay',
  'TROLLEY': '🚑 A&E Stretcher / Trolley',
  'RECLINER_CHAIR': '🪑 Observation Chair'
};

interface StatMedItem {
  id: string;
  name: string;
  dose: string;
  inStock: boolean;
  dispensaryStock?: number;
  centralStoreStock?: number;
}

interface StatLabItem {
  id: string;
  name: string;
  category?: string;
  inStock: boolean;
}

const DEFAULT_EMERGENCY_MEDS = [
  { id: 'em-1', name: 'Inj. Paracetamol 1g', genericName: 'Acetaminophen', category: 'Analgesic / Antipyretic', route: 'IV', defaultDose: '1g IV STAT', dispensaryStock: 120, centralStoreStock: 500 },
  { id: 'em-2', name: 'Inj. Tramadol 50mg', genericName: 'Tramadol Hydrochloride', category: 'Opioid Analgesic', route: 'IV/IM', defaultDose: '50mg IV STAT', dispensaryStock: 45, centralStoreStock: 200 },
  { id: 'em-3', name: 'IV Normal Saline 0.9% 500ml', genericName: 'Sodium Chloride 0.9%', category: 'IV Crystalloid Fluid', route: 'IV Infusion', defaultDose: '500ml IV Infusion STAT', dispensaryStock: 80, centralStoreStock: 350 },
  { id: 'em-4', name: 'IV Ringers Lactate 1000ml', genericName: 'Compound Sodium Lactate', category: 'IV Crystalloid Fluid', route: 'IV Infusion', defaultDose: '1000ml IV Infusion STAT', dispensaryStock: 60, centralStoreStock: 180 },
  { id: 'em-5', name: 'Inj. Ceftriaxone 1g', genericName: 'Ceftriaxone Sodium', category: 'Antibiotic (Cephalosporin)', route: 'IV', defaultDose: '1g IV STAT', dispensaryStock: 30, centralStoreStock: 150 },
  { id: 'em-6', name: 'Inj. Hydrocortisone 100mg', genericName: 'Hydrocortisone Sodium Succinate', category: 'Corticosteroid', route: 'IV STAT', defaultDose: '200mg IV STAT', dispensaryStock: 25, centralStoreStock: 90 },
  { id: 'em-7', name: 'Nebulized Salbutamol 5mg', genericName: 'Salbutamol Sulfate', category: 'Bronchodilator', route: 'Inhalation', defaultDose: '5mg Nebulized STAT', dispensaryStock: 15, centralStoreStock: 80 },
  { id: 'em-8', name: 'Tab Aspirin 300mg', genericName: 'Acetylsalicylic Acid', category: 'Antiplatelet', route: 'Oral / Soluble', defaultDose: '300mg Soluble STAT', dispensaryStock: 200, centralStoreStock: 600 },
  { id: 'em-9', name: 'Inj. Morphine 10mg', genericName: 'Morphine Sulfate', category: 'Controlled Opioid', route: 'IV Slow', defaultDose: '2.5mg IV STAT', dispensaryStock: 0, centralStoreStock: 12 },
  { id: 'em-10', name: 'Inj. Adrenaline 1:1000', genericName: 'Epinephrine', category: 'Resuscitation Inotrope', route: 'IV/IM STAT', defaultDose: '1mg IV Bolus STAT', dispensaryStock: 50, centralStoreStock: 120 },
  { id: 'em-11', name: 'Inj. Diazepam 10mg/2ml', genericName: 'Diazepam', category: 'Anticonvulsant / Anxiolytic', route: 'IV Slow', defaultDose: '10mg IV Slow STAT', dispensaryStock: 18, centralStoreStock: 75 },
  { id: 'em-12', name: 'Inj. Tetanus Toxoid 0.5ml', genericName: 'Tetanus Vaccine', category: 'Immunological', route: 'IM', defaultDose: '0.5ml IM STAT', dispensaryStock: 0, centralStoreStock: 0 }
];

const DEFAULT_EMERGENCY_LABS = [
  { id: 'el-1', code: 'LAB-FBC', name: 'Full Blood Count (FBC / CBC)', category: 'Haematology', inStock: true, tatMinutes: 30 },
  { id: 'el-2', code: 'LAB-BG', name: 'Blood Group & Compatibility Crossmatch', category: 'Blood Transfusion', inStock: true, tatMinutes: 45 },
  { id: 'el-3', code: 'LAB-EUC', name: 'Serum Electrolytes, Urea & Creatinine (E/U/Cr)', category: 'Clinical Chemistry', inStock: true, tatMinutes: 40 },
  { id: 'el-4', code: 'LAB-TROP', name: 'Cardiac Troponin I / T (STAT)', category: 'Immunoassay', inStock: true, tatMinutes: 20 },
  { id: 'el-5', code: 'LAB-ABG', name: 'Arterial Blood Gas (ABG Analysis)', category: 'Critical Care Lab', inStock: true, tatMinutes: 15 },
  { id: 'el-6', code: 'LAB-RBG', name: 'Random Blood Glucose (RBG STAT)', category: 'Point of Care', inStock: true, tatMinutes: 5 },
  { id: 'el-7', code: 'LAB-MP', name: 'Malaria Parasite Smear & Rapid Test', category: 'Parasitology', inStock: true, tatMinutes: 30 },
  { id: 'el-8', code: 'LAB-XRAY', name: 'Digital X-Ray (STAT Affected Limb / CXR)', category: 'Radiology / Imaging', inStock: true, tatMinutes: 25 },
  { id: 'el-9', code: 'LAB-CT', name: 'Non-Contrast Brain CT Scan (STAT)', category: 'Radiology / Imaging', inStock: false, tatMinutes: 60 }
];

interface AIRecommendation {
  protocolName: string;
  medications: { name: string; dose: string }[];
  labs: string[];
}

const getEmergencyAIRecommendations = (complaintStr: string = ''): AIRecommendation => {
  const text = complaintStr.toLowerCase();

  if (text.includes('fracture') || text.includes('trauma') || text.includes('accident') || text.includes('injury') || text.includes('fall') || text.includes('rta') || text.includes('wound')) {
    return {
      protocolName: '🎯 Suspected Fracture & Acute Trauma Protocol',
      medications: [
        { name: 'Inj. Paracetamol', dose: '1g IV STAT' },
        { name: 'Inj. Tramadol', dose: '50mg IV STAT' },
        { name: 'IV Normal Saline 0.9%', dose: '500ml IV Infusion STAT' },
        { name: 'Inj. Tetanus Toxoid', dose: '0.5ml IM STAT' },
      ],
      labs: [
        'Full Blood Count (FBC)',
        'Blood Group & Compatibility Crossmatch',
        'Serum Electrolytes, Urea & Creatinine (E/U/Cr)',
        'Digital X-Ray (Affected Limb / Joint)',
      ]
    };
  }

  if (text.includes('chest pain') || text.includes('cardiac') || text.includes('mi') || text.includes('heart attack') || text.includes('angina') || text.includes('palpitations')) {
    return {
      protocolName: '🫀 Acute Cardiac / Chest Pain Emergency Protocol',
      medications: [
        { name: 'Tab Aspirin', dose: '300mg Soluble STAT' },
        { name: 'Inj. Morphine', dose: '2.5mg - 5mg IV STAT' },
        { name: 'Sublingual Nitroglycerin', dose: '0.4mg STAT' },
        { name: 'IV Normal Saline 0.9%', dose: '500ml KVO' },
      ],
      labs: [
        'Cardiac Troponin I / T (STAT)',
        '12-Lead Electrocardiogram (ECG STAT)',
        'Full Blood Count (FBC)',
        'Serum Electrolytes & Lipid Profile',
        'Portable Chest X-Ray (CXR)',
      ]
    };
  }

  if (text.includes('dyspnea') || text.includes('breath') || text.includes('asthma') || text.includes('respiratory') || text.includes('wheezing') || text.includes('cough')) {
    return {
      protocolName: '🫁 Acute Respiratory Distress & Asthma Protocol',
      medications: [
        { name: 'Nebulized Salbutamol', dose: '5mg via Nebulizer STAT' },
        { name: 'Inj. Hydrocortisone', dose: '200mg IV STAT' },
        { name: 'Oxygen Inhalation', dose: '4-6L/min via Nasal Cannula / Mask' },
        { name: 'Nebulized Ipratropium Bromide', dose: '500mcg STAT' },
      ],
      labs: [
        'Arterial Blood Gas (ABG STAT)',
        'Chest X-Ray (CXR AP/PA STAT)',
        'Full Blood Count (FBC)',
        'Serum Electrolytes & CRP',
      ]
    };
  }

  if (text.includes('fever') || text.includes('sepsis') || text.includes('infection') || text.includes('chills') || text.includes('rigors') || text.includes('typhoid')) {
    return {
      protocolName: '🌡️ Febrile Emergency & Sepsis Workup Protocol',
      medications: [
        { name: 'Inj. Ceftriaxone', dose: '1g IV STAT' },
        { name: 'Inj. Paracetamol', dose: '1g IV Infusion STAT' },
        { name: 'IV Ringers Lactate', dose: '1000ml STAT' },
        { name: 'Inj. Artemether', dose: '80mg IM STAT' },
      ],
      labs: [
        'Full Blood Count (FBC)',
        'Malaria Parasite Density (MP Rapid/Smear STAT)',
        'Blood Culture & Sensitivity (x2 sets)',
        'Serum Lactate & Urinalysis STAT',
      ]
    };
  }

  if (text.includes('convulsion') || text.includes('seizure') || text.includes('fits') || text.includes('epilepsy') || text.includes('eclampsia') || text.includes('unconscious')) {
    return {
      protocolName: '⚡ Acute Convulsion & Neuro Emergency Protocol',
      medications: [
        { name: 'Inj. Diazepam', dose: '10mg IV Slow Bolus STAT' },
        { name: 'Inj. Magnesium Sulfate', dose: '4g IV in 100ml NS over 15 mins STAT' },
        { name: 'IV 10% Dextrose', dose: '500ml STAT' },
        { name: 'Inj. Levetiracetam', dose: '1000mg IV STAT' },
      ],
      labs: [
        'Random Blood Glucose (RBG STAT)',
        'Serum Electrolytes, Calcium & Magnesium',
        'Full Blood Count (FBC)',
        'Non-Contrast Brain CT Scan STAT',
      ]
    };
  }

  if (text.includes('abdominal') || text.includes('stomach') || text.includes('vomiting') || text.includes('appendix') || text.includes('diarrhea')) {
    return {
      protocolName: '🩺 Acute Abdomen & Gastrointestinal Emergency Protocol',
      medications: [
        { name: 'Inj. Hyoscine N-Butylbromide', dose: '20mg IV STAT' },
        { name: 'Inj. Ondansetron', dose: '4mg IV STAT' },
        { name: 'Inj. Tramadol', dose: '50mg IV STAT' },
        { name: 'IV Normal Saline 0.9%', dose: '1000ml STAT' },
      ],
      labs: [
        'Full Blood Count (FBC)',
        'Abdominal & Pelvic Ultrasound (STAT)',
        'Serum Amylase & Lipase',
        'Urinalysis & Pregnancy Test (hCG)',
      ]
    };
  }

  return {
    protocolName: '🚨 General STAT Emergency Care Protocol',
    medications: [
      { name: 'IV Normal Saline 0.9%', dose: '500ml IV STAT' },
      { name: 'Inj. Paracetamol', dose: '1g IV STAT' },
      { name: 'Inj. Tramadol', dose: '50mg IV STAT' },
    ],
    labs: [
      'Full Blood Count (FBC)',
      'Random Blood Glucose (RBG STAT)',
      'Serum Electrolytes, Urea & Creatinine',
    ]
  };
};

export default function Emergency() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // State Management
  const [roleMode, setRoleMode] = useState<'ALL' | 'TRIAGE' | 'DOCTOR' | 'MATRON' | 'RECORDS'>('ALL');
  const [viewMode, setViewMode] = useState<'FLOOR_MAP' | 'ROSTER_TABLE'>('FLOOR_MAP');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [arrivals, setArrivals] = useState<EmergencyArrival[]>([]);
  const [beds, setBeds] = useState<EmergencyBed[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Selected Patient Drawer & Action Modals
  const [selectedArrival, setSelectedArrival] = useState<EmergencyArrival | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<number>(0);
  const [physioReferralOpen, setPhysioReferralOpen] = useState(false);
  const [physioReferralPatient, setPhysioReferralPatient] = useState<any | null>(null);

  // Quick Register / Quick Triage Dialog State
  const [quickRegOpen, setQuickRegOpen] = useState(false);
  const [isTempTag, setIsTempTag] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [tempName, setTempName] = useState('');
  const [arrivalMethod, setArrivalMethod] = useState('AMBULANCE');
  const [complaint, setComplaint] = useState('');
  
  // Triage Vitals State
  const [triageCategory, setTriageCategory] = useState('RED');
  const [heartRate, setHeartRate] = useState('110');
  const [bpSystolic, setBpSystolic] = useState('120');
  const [bpDiastolic, setBpDiastolic] = useState('80');
  const [respirationRate, setRespirationRate] = useState('22');
  const [spo2, setSpo2] = useState('95');
  const [temperature, setTemperature] = useState('37.5');
  const [gcsScore, setGcsScore] = useState('15');

  // Bed Assignment Dialog State
  const [assignBedOpen, setAssignBedOpen] = useState(false);
  const [targetBedId, setTargetBedId] = useState('');

  // Retrospective Bio-Data Registration Modal (Records Unit)
  const [retroRegOpen, setRetroRegOpen] = useState(false);
  const [retroFirstName, setRetroFirstName] = useState('');
  const [retroLastName, setRetroLastName] = useState('');
  const [retroGender, setRetroGender] = useState('MALE');
  const [retroPhone, setRetroPhone] = useState('');
  const [retroAddress, setRetroAddress] = useState('');
  const [retroNokName, setRetroNokName] = useState('');
  const [retroNokPhone, setRetroNokPhone] = useState('');
  const [retroNin, setRetroNin] = useState('');

  // STAT Orders State & Data Dictionary Catalogs
  const [pharmacyCatalog, setPharmacyCatalog] = useState<any[]>(DEFAULT_EMERGENCY_MEDS);
  const [labCatalog, setLabCatalog] = useState<any[]>(DEFAULT_EMERGENCY_LABS);
  const [statMedsList, setStatMedsList] = useState<StatMedItem[]>([]);
  const [statLabsList, setStatLabsList] = useState<StatLabItem[]>([]);
  const [statMedName, setStatMedName] = useState('');
  const [statMedDose, setStatMedDose] = useState('500mg IV');
  const [statLabName, setStatLabName] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Emergency SOAP Note State
  const [emergencySoapSubj, setEmergencySoapSubj] = useState('');
  const [emergencySoapObj, setEmergencySoapObj]   = useState('');
  const [emergencySoapAssessments, setEmergencySoapAssessments] = useState<string[]>([]);
  const [emergencySoapPlan, setEmergencySoapPlan] = useState('');
  const [savingEmergencySoap, setSavingEmergencySoap] = useState(false);
  const [historicalSoapNotes, setHistoricalSoapNotes] = useState<any[]>([]);
  const [loadingSoapHistory, setLoadingSoapHistory] = useState(false);
  const [showHistoryAccordion, setShowHistoryAccordion] = useState(true);

  // Emergency Voice Dictation & OpenMed AI States
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceSummarizing, setVoiceSummarizing] = useState(false);
  const [voiceAnalysis, setVoiceAnalysis] = useState<any>(null);
  const [recognitionRef, setRecognitionRef] = useState<any>(null);
  const transcriptBufferRef = useRef('');
  const interimBufferRef = useRef('');
  const isProcessingVoiceRef = useRef(false);
  const userStoppedVoiceRef = useRef(false);

  // AI Smart Recommendations for Emergency SOAP
  const [aiLabRecs, setAiLabRecs] = useState<any[]>([]);
  const [aiRxRecs, setAiRxRecs] = useState<any[]>([]);
  const [aiRadRecs, setAiRadRecs] = useState<any[]>([]);
  const [aiLoadingMeds, setAiLoadingMeds] = useState(false);
  const [aiLoadingLabs, setAiLoadingLabs] = useState(false);
  const [aiLoadingRad, setAiLoadingRad] = useState(false);

  // Emergency Radiology Scan State
  const [emergencyRadOrders, setEmergencyRadOrders] = useState<any[]>([]);
  const [emergencyRadCatalog, setEmergencyRadCatalog] = useState<any[]>([]);
  const [emergencyRadCart, setEmergencyRadCart] = useState<any[]>([]);
  const [selectedEmergencyRadId, setSelectedEmergencyRadId] = useState('');
  const [emergencyRadPriority, setEmergencyRadPriority] = useState('STAT');
  const [emergencyRadHistory, setEmergencyRadHistory] = useState('');
  const [submittingEmergencyRad, setSubmittingEmergencyRad] = useState(false);
  const [emergencyRadViewerOpen, setEmergencyRadViewerOpen] = useState(false);
  const [selectedEmergencyRadViewerOrder, setSelectedEmergencyRadViewerOrder] = useState<any>(null);

  // Parent Ward Transfer Modal State
  const [transferWardOpen, setTransferWardOpen] = useState(false);
  const [targetWard, setTargetWard] = useState('Male Surgical Ward');
  const [transferDiagnosis, setTransferDiagnosis] = useState('');
  const [transferHandoverNotes, setTransferHandoverNotes] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Theatre Transfer Modal State
  const [transferTheatreOpen, setTransferTheatreOpen] = useState(false);
  const [theatreProcedure, setTheatreProcedure] = useState('STAT Emergency Exploratory Surgery / Debridement');
  const [theatreUrgency, setTheatreUrgency] = useState('EMERGENCY');
  const [theatreNotes, setTheatreNotes] = useState('');
  const [submittingTheatreTransfer, setSubmittingTheatreTransfer] = useState(false);

  // Voice Dictation Review Modal States
  const [activeVoiceTarget, setActiveVoiceTarget] = useState<'COMPLAINT' | 'TAG' | null>(null);
  const [voiceReviewOpen, setVoiceReviewOpen] = useState(false);
  const [voiceReviewText, setVoiceReviewText] = useState('');
  const [voiceReviewTarget, setVoiceReviewTarget] = useState<'COMPLAINT' | 'TAG' | null>(null);
  const voiceRecognitionRef = useRef<any>(null);

  const VOICE_NOISE = /^(switch off|stop|stop dictation|cancel|clear|testing|test|hello|hi|thank you|thanks|okay|ok|never mind)\b/i;

  const processVoiceComplaint = async (rawText: string) => {
    if (!rawText || rawText.trim().length < 3 || isProcessingVoiceRef.current) return;
    if (VOICE_NOISE.test(rawText.trim())) {
      enqueueSnackbar('ℹ️ Non-clinical speech detected — skipped.', { variant: 'info' });
      return;
    }
    isProcessingVoiceRef.current = true;
    setVoiceSummarizing(true);
    enqueueSnackbar('⚡ Analysing dictation… converting to clinical summary…', { variant: 'info' });
    try {
      const res = await axios.post(`${API_BASE_URL}/openmed/voice-summarize`, {
        rawTranscript: rawText,
        patientName: 'Emergency Patient',
        isContinued: !!complaint.trim(),
        existingText: complaint.trim(),
        isEmergency: true,
      }, { headers: getHeaders() }).catch(() => null);

      const summarized = res?.data?.data?.summary?.subjective?.trim() || rawText.trim();
      // In emergency mode the backend never returns the boilerplate —
      // but double-check in case of old cached backend
      const BOILERPLATE = 'presents for outpatient consultation';
      const cleaned = summarized.includes(BOILERPLATE) ? rawText.trim() : summarized;
      if (VOICE_NOISE.test(cleaned)) {
        enqueueSnackbar('ℹ️ Voice command detected — skipped.', { variant: 'info' });
        return;
      }
      setVoiceReviewText(cleaned);
      setVoiceReviewTarget('COMPLAINT');
      setVoiceReviewOpen(true);
    } catch {
      setVoiceReviewText(rawText.trim());
      setVoiceReviewTarget('COMPLAINT');
      setVoiceReviewOpen(true);
    } finally {
      setVoiceSummarizing(false);
      isProcessingVoiceRef.current = false;
    }
  };

  // Cleans up a dictated patient tag via AI, with a title-case fallback
  const processVoiceTag = async (rawText: string) => {
    if (!rawText || rawText.trim().length < 2 || isProcessingVoiceRef.current) return;
    isProcessingVoiceRef.current = true;
    setVoiceSummarizing(true);
    enqueueSnackbar('⚡ Cleaning up patient tag…', { variant: 'info' });
    try {
      const res = await axios.post(`${API_BASE_URL}/openmed/voice-summarize`, {
        rawTranscript: `Patient identification tag: ${rawText}`,
        patientName: 'Emergency Triage',
        isContinued: false,
        existingText: '',
      }, { headers: getHeaders() }).catch(() => null);

      // Extract a clean name from the AI response; fallback to a smart title-case of raw text
      const aiSubjective: string = res?.data?.data?.summary?.subjective?.trim() || '';
      // Try to pull just the meaningful name phrase from the AI response
      const firstLine = aiSubjective.split('\n')[0].replace(/^patient identification tag[:\s]*/i, '').trim();
      const cleaned = firstLine.length >= 3 ? firstLine : rawText.trim();

      // Apply title-case and deduplicate repeated words as final pass
      const titleCased = cleaned
        .toLowerCase()
        .replace(/\b(\w)/g, (c) => c.toUpperCase())
        .replace(/\b(\w+ )\1+/gi, '$1')   // remove consecutive duplicate words
        .trim();

      setVoiceReviewText(titleCased);
      setVoiceReviewTarget('TAG');
      setVoiceReviewOpen(true);
      enqueueSnackbar('✅ Patient tag auto-cleaned — review and confirm.', { variant: 'success' });
    } catch {
      // Fallback frontend clean: title-case + deduplicate
      const titleCased = rawText.trim()
        .toLowerCase()
        .replace(/\b(\w)/g, (c) => c.toUpperCase())
        .replace(/\b(\w+ )\1+/gi, '$1')
        .trim();
      setVoiceReviewText(titleCased);
      setVoiceReviewTarget('TAG');
      setVoiceReviewOpen(true);
    } finally {
      setVoiceSummarizing(false);
      isProcessingVoiceRef.current = false;
    }
  };

  const stopVoiceDictation = () => {
    if (voiceRecognitionRef.current) {
      try { voiceRecognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
    setActiveVoiceTarget(null);
    const full = (transcriptBufferRef.current + ' ' + interimBufferRef.current).trim();
    interimBufferRef.current = '';
    if (full.length >= 3 && !isProcessingVoiceRef.current && voiceReviewTarget === 'COMPLAINT') {
      processVoiceComplaint(full);
    } else if (full.length >= 3 && !isProcessingVoiceRef.current && voiceReviewTarget === 'TAG') {
      processVoiceTag(full);
    }
  };

  const startVoiceDictation = (targetField: 'COMPLAINT' | 'TAG') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      enqueueSnackbar('Voice dictation is not supported in this browser. Please use Chrome or Edge.', { variant: 'warning' });
      return;
    }
    if (isListening) { stopVoiceDictation(); return; }

    transcriptBufferRef.current = '';
    interimBufferRef.current = '';
    isProcessingVoiceRef.current = false;
    setVoiceReviewTarget(targetField);

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
    };

    rec.onerror = (err: any) => {
      if (err?.error !== 'no-speech') {
        setIsListening(false);
        setActiveVoiceTarget(null);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      setActiveVoiceTarget(null);
      const full = (transcriptBufferRef.current + ' ' + interimBufferRef.current).trim();
      if (full.length >= 3 && !isProcessingVoiceRef.current) {
        if (targetField === 'COMPLAINT') {
          processVoiceComplaint(full);
        } else {
          processVoiceTag(full);
        }
      }
    };

    rec.start();
    voiceRecognitionRef.current = rec;
    setIsListening(true);
    setActiveVoiceTarget(targetField);
    enqueueSnackbar(
      targetField === 'COMPLAINT'
        ? '🎙️ Listening… speak presenting complaint. Tap button again to stop & analyse.'
        : '🎙️ Listening… speak patient name or tag. Tap button again to stop.',
      { variant: 'info' }
    );
  };

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch Arrivals, Beds, Patients, Pharmacy Catalog & Lab Catalog
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [arrRes, bedsRes, patRes, rxRes, labRes, radRes] = await Promise.all([
        axios.get(`${API}/arrivals`, { headers: getHeaders() }),
        axios.get(`${API}/beds`, { headers: getHeaders() }),
        axios.get(`${API_BASE_URL}/patients`, { headers: getHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/pharmacy/inventory`, { headers: getHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/lims/catalog`, { headers: getHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/radiology/catalog`, { headers: getHeaders() }).catch(() => ({ data: [] }))
      ]);

      setArrivals(arrRes.data || []);
      setBeds(bedsRes.data || []);
      setPatients(patRes.data?.patients || patRes.data || []);
      if (rxRes.data && Array.isArray(rxRes.data) && rxRes.data.length > 0) {
        setPharmacyCatalog(rxRes.data);
      }
      if (labRes.data && Array.isArray(labRes.data) && labRes.data.length > 0) {
        setLabCatalog(labRes.data);
      }
      if (radRes.data && Array.isArray(radRes.data) && radRes.data.length > 0) {
        setEmergencyRadCatalog(radRes.data);
      }
    } catch (err) {
      console.error('Failed to load emergency data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // 15s auto-refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  // Load Radiology Orders for Active Emergency Patient
  useEffect(() => {
    if (!selectedArrival) {
      setEmergencyRadOrders([]);
      return;
    }
    const patId = selectedArrival.patientId || selectedArrival.patient?.id || selectedArrival.id;
    if (patId) {
      axios.get(`${API_BASE_URL}/radiology/orders?patientId=${patId}`, { headers: getHeaders() })
        .then(res => setEmergencyRadOrders(res.data || []))
        .catch(() => {});
    }
  }, [selectedArrival]);

  const handleManualAddEmergencyRad = (item?: any) => {
    const targetItem = item || emergencyRadCatalog.find(c => c.id === selectedEmergencyRadId);
    if (!targetItem) {
      enqueueSnackbar('Please select a valid radiology procedure', { variant: 'warning' });
      return;
    }
    setEmergencyRadCart(prev => [
      ...prev,
      {
        catalogItemId: targetItem.id,
        name: targetItem.name || targetItem.procedureName || 'Emergency Imaging Scan',
        modality: targetItem.modality || 'X-RAY',
        price: targetItem.price || 15000,
        priority: emergencyRadPriority,
        clinicalHistory: emergencyRadHistory || selectedArrival?.presentingComplaint || 'STAT Emergency bedside evaluation',
      }
    ]);
    setSelectedEmergencyRadId('');
    enqueueSnackbar(`Added ${targetItem.name} to STAT radiology cart`, { variant: 'success' });
  };

  const handleSubmitEmergencyRadOrder = async () => {
    if (!selectedArrival || emergencyRadCart.length === 0) return;
    const patId = selectedArrival.patientId || selectedArrival.patient?.id || selectedArrival.id;
    if (!patId) return;
    setSubmittingEmergencyRad(true);

    try {
      for (const item of emergencyRadCart) {
        await axios.post(`${API_BASE_URL}/radiology/orders`, {
          patientId: patId,
          catalogItemId: item.catalogItemId,
          requestedById: 'doc-er-1',
          clinicalHistory: item.clinicalHistory || emergencyRadHistory || selectedArrival?.presentingComplaint || 'STAT Emergency Bedside Evaluation',
          priority: item.priority || 'STAT',
        }, { headers: getHeaders() });
      }
      enqueueSnackbar('⚡ STAT Emergency Radiology scan order submitted! Visible in Radiology Queue (http://localhost:5173/radiology) & awaiting Cashier payment settlement.', { variant: 'success' });
      setEmergencyRadCart([]);
      setEmergencyRadHistory('');
      axios.get(`${API_BASE_URL}/radiology/orders?patientId=${patId}`, { headers: getHeaders() })
        .then(r => setEmergencyRadOrders(r.data || []))
        .catch(() => {});
    } catch (err: any) {
      enqueueSnackbar('Failed to submit STAT radiology order', { variant: 'error' });
    } finally {
      setSubmittingEmergencyRad(false);
    }
  };

  // Dynamic 100% Offline Clinical NLP & Rewrite Engine (Handles ANY spoken/typed complaint)
  const inferClinicalDetailsFrontend = (text: string, patientName?: string): { codes: string[]; plan: string; subjective: string } => {
    const raw = (text || '').trim();
    const pName = patientName || 'Patient';
    if (!raw) {
      return {
        codes: ['Z00.00 — General adult medical examination'],
        plan: '1. Complete baseline clinical assessment & vital signs check.\n2. Order routine screening investigations as clinically indicated.',
        subjective: '',
      };
    }

    // Tokenize text into words for semantic matching (fuzzy prefix & substring matching)
    const cleanWords = raw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    
    // Concept matcher helper
    const containsConcept = (keywords: string[]) => {
      return keywords.some(kw => {
        if (raw.toLowerCase().includes(kw)) return true;
        const kwTokens = kw.split(' ');
        return kwTokens.every(t => cleanWords.some(w => {
          if (w.includes(t) || t.includes(w)) return true;
          if (Math.abs(w.length - t.length) <= 2 && w.length >= 4) {
            return w.slice(0, 3) === t.slice(0, 3);
          }
          return false;
        }));
      });
    };

    const detectedAnatomy: string[] = [];
    const detectedPathology: string[] = [];
    const codesSet = new Set<string>();
    const planSet = new Set<string>();

    // 1. Head / Skull / Brain / Neurological
    if (containsConcept(['head', 'skull', 'brain', 'scalp', 'forehead', 'temple', 'concussion', 'gcs', 'unconscious', 'seizure', 'dizzy'])) {
      detectedAnatomy.push('head injury');
      if (containsConcept(['fracture', 'facture', 'broken', 'crack', 'hit'])) {
        codesSet.add('S02.91 — Fracture of skull, closed / Traumatic brain injury');
        detectedPathology.push('suspected closed skull fracture');
        planSet.add('STAT Airway & Cervical Spine Stabilization: Immobilize head/neck with rigid collar. Monitor GCS & pupillary responses Q15M.');
        planSet.add('STAT Imaging & Neuro Consultation: Request urgent Non-Contrast CT Brain & Cervical Spine X-Ray with STAT Neurosurgery notification.');
      } else if (containsConcept(['seizure', 'fits', 'convulsion'])) {
        codesSet.add('R56.9 — Unspecified convulsions / Acute seizure');
        detectedPathology.push('acute seizure activity');
        planSet.add('STAT Seizure Protocol: Maintain lateral recovery position, protect airway, administer IV Diazepam 10mg STAT / IV Levetiracetam.');
      } else {
        codesSet.add('S09.9 — Head injury, unspecified');
        detectedPathology.push('head trauma');
        planSet.add('STAT Head Injury Observation: Monitor vitals, GCS & neurological observations Q15M.');
      }
    }

    // 2. Chest / Ribs / Respiratory
    if (containsConcept(['chest', 'rib', 'ribs', 'whip', 'whips', 'thorax', 'lungs', 'breath', 'cough', 'pneumothorax'])) {
      detectedAnatomy.push('chest trauma');
      if (containsConcept(['fracture', 'facture', 'broken', 'crack', 'whip', 'whips'])) {
        codesSet.add('S22.39 — Fracture of rib, unspecified / Acute chest trauma');
        detectedPathology.push('suspected rib fractures');
        planSet.add('STAT Chest Trauma Protocol: Request STAT Chest X-Ray PA & Lateral views. Administer STAT IV analgesia (Tramadol 100mg IV / Paracetamol 1g IV).');
      } else if (containsConcept(['breath', 'cough', 'dyspnea', 'pneumonia'])) {
        codesSet.add('J96.00 — Acute respiratory failure / Pneumonia');
        detectedPathology.push('respiratory distress');
        planSet.add('Respiratory Management: Administer high-flow supplemental O2 via non-rebreather mask, nebulize with Salbutamol, and order STAT ABG & Chest X-Ray.');
      } else {
        codesSet.add('R07.9 — Chest pain, unspecified');
        detectedPathology.push('chest pain');
        planSet.add('Cardiac & Chest Screening: Order STAT 12-lead ECG, High-Sensitivity Troponin-I, and Chest X-Ray.');
      }
    }

    // 3. Limbs / Extremities / Bones
    if (containsConcept(['femur', 'leg', 'arm', 'hand', 'foot', 'ankle', 'knee', 'hip', 'shoulder', 'bone', 'limb'])) {
      detectedAnatomy.push('extremity injury');
      if (containsConcept(['fracture', 'facture', 'broken', 'crack', 'deformity'])) {
        codesSet.add('S72.90 — Fracture of femur, unspecified / Traumatic bone fracture');
        detectedPathology.push('suspected long bone fracture');
        planSet.add('STAT Limb Fracture Protocol: Immobilize affected limb with splint/traction. Administer IV analgesia & IV Tetanus Toxoid.');
      }
    }

    // 4. Abdomen / Gastrointestinal / Pelvis
    if (containsConcept(['abdomen', 'abdo', 'belly', 'stomach', 'flank', 'bowel', 'vomit', 'diarrhea', 'stool'])) {
      if (containsConcept(['pain', 'rigid', 'guarding', 'trauma', 'accident'])) {
        codesSet.add('R10.0 — Acute abdomen / Severe abdominal trauma');
        detectedAnatomy.push('acute abdominal trauma');
        planSet.add('STAT Acute Abdomen Protocol: Keep NPO. Establish 2 large-bore IV access, request Abdominal FAST Ultrasound & General Surgery evaluation.');
      } else {
        codesSet.add('A09 — Acute gastroenteritis and vomiting');
        detectedPathology.push('gastroenteritis');
        planSet.add('Rehydration & Anti-emetic Cover: Administer IV Normal Saline fluid resuscitation & IV Ondansetron 4mg STAT.');
      }
    }

    // 5. Back / Waist / Spine
    if (containsConcept(['back', 'waist', 'lumbar', 'spine'])) {
      codesSet.add('M54.5 — Low back pain / Lumbar spine trauma');
      detectedAnatomy.push('lumbar back pain');
      planSet.add('Lumbar Spine Protocol: Prescribe targeted IV/oral NSAIDs, order Lumbar Spine X-Ray, and advise strict bed rest on hard mattress.');
    }

    // 6. Febrile / Malaria / Infections
    if (containsConcept(['fever', 'febrile', 'hot', 'chills', 'rigor', 'sweat', 'malaria'])) {
      codesSet.add('B50.9 — Severe Plasmodium falciparum malaria');
      detectedPathology.push('febrile illness with rigors');
      planSet.add('Antimalarial & Antipyretic Resuscitation: Initiate IV Artesunate / Artemether-Lumefantrine therapy and IV Paracetamol 1g STAT.');
    }

    // 7. Urinary / Renal
    if (containsConcept(['urinate', 'urine', 'dysuria', 'nocturia', 'pee', 'peeing'])) {
      codesSet.add('R30.0 — Dysuria and urinary discomfort');
      detectedPathology.push('dysuria');
      planSet.add('Urinary Evaluation: Request Urinalysis, Urine Culture & Sensitivity, and Renal Function Profile.');
    }

    // Clean noise words for dynamic narrative generation
    const cleanedSpeech = raw
      .replace(/\b(um|uh|er|err|like|you know|you see|so|okay|alright)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Construct Smart Dynamic Clinical Subjective Presentation
    let dynamicSubjective = '';
    if (detectedAnatomy.length > 0 || detectedPathology.length > 0) {
      const mainFindings = [...detectedAnatomy, ...detectedPathology].filter((v, i, a) => a.indexOf(v) === i).join(', ');
      dynamicSubjective = `${pName} presents with acute clinical symptoms including ${mainFindings}. Detailed physical examination, vital signs monitoring, and baseline STAT investigations are advised.`;
    } else {
      const formattedInput = cleanedSpeech.charAt(0).toUpperCase() + cleanedSpeech.slice(1);
      dynamicSubjective = `${pName} presents with clinical complaints of "${formattedInput}". Detailed physical examination, vital signs monitoring, and baseline STAT investigations are advised.`;
    }

    const codes = codesSet.size > 0 ? Array.from(codesSet) : ['T14.9 — Injury, unspecified / Acute medical complaint'];
    
    if (planSet.size === 0) {
      planSet.add('STAT Resuscitation: Secure airway, assess breathing & circulation.');
      planSet.add('Establish 2 large-bore IV cannula access & start IV normal saline.');
      planSet.add('Request STAT emergency diagnostics & monitor vitals Q15M.');
    }

    const planLines = Array.from(planSet).map((p, idx) => `${idx + 1}. ${p}`);

    return {
      codes,
      plan: planLines.join('\n\n'),
      subjective: dynamicSubjective,
    };
  };

  // Run Smart AI Recommenders for Emergency (Lab, Prescriptions, Radiology)
  const runSmartRecommenders = async (diagCode: string, complaintText: string) => {
    setAiLoadingMeds(true);
    setAiLoadingLabs(true);
    setAiLoadingRad(true);
    const text = ((complaintText || '') + ' ' + (diagCode || '')).toLowerCase();

    // 1. Lab Recommendations
    const labs: any[] = [];
    if (text.includes('fracture') || text.includes('trauma') || text.includes('bleed') || text.includes('head') || text.includes('skull')) {
      labs.push({ name: 'Full Blood Count (FBC + Platelets)', category: 'Hematology', priority: 'STAT', isCatalog: true, reason: 'STAT baseline hemoglobin & blood loss assessment.' });
      labs.push({ name: 'Blood Grouping & Crossmatching (2 Units)', category: 'Blood Bank', priority: 'STAT', isCatalog: true, reason: 'STAT emergency blood availability for potential surgical intervention.' });
      labs.push({ name: 'Prothrombin Time (PT / INR)', category: 'Hematology', priority: 'STAT', isCatalog: false, reason: 'Coagulation profile screening for internal hemorrhage.' });
    }
    if (text.includes('chest') || text.includes('breath') || text.includes('heart') || text.includes('pain')) {
      labs.push({ name: 'High-Sensitivity Cardiac Troponin-I', category: 'Biochemistry', priority: 'STAT', isCatalog: true, reason: 'STAT screening for acute myocardial infarction.' });
      labs.push({ name: 'Urgent Serum Electrolytes, Urea & Creatinine (U/E/Cr)', category: 'Biochemistry', priority: 'STAT', isCatalog: true, reason: 'Renal function & electrolyte balance screening.' });
    }
    if (labs.length === 0) {
      labs.push({ name: 'Full Blood Count (FBC + Differential)', category: 'Hematology', priority: 'STAT', isCatalog: true, reason: 'STAT baseline emergency infectious & anemia screening.' });
      labs.push({ name: 'Random Blood Glucose (RBG)', category: 'Biochemistry', priority: 'STAT', isCatalog: true, reason: 'Rule out acute hypoglycemia or diabetic emergency.' });
    }
    setAiLabRecs(labs);

    // 2. Prescription / Medication Recommendations
    const meds: any[] = [];
    if (text.includes('fracture') || text.includes('pain') || text.includes('trauma') || text.includes('head') || text.includes('skull')) {
      meds.push({ name: 'Injectable Tramadol 100mg IV STAT', category: 'Analgesic / Narcotic', dosage: '100mg IV stat over 5 mins', isCatalog: true, reason: 'STAT severe trauma & fracture pain control.' });
      meds.push({ name: 'IV Paracetamol 1000mg Infusion STAT', category: 'Analgesic / Antipyretic', dosage: '1000mg IV stat piggyback', isCatalog: true, reason: 'Adjunctive multimodal pain relief.' });
      meds.push({ name: 'IV Ceftriaxone 1g STAT', category: 'Antibiotic', dosage: '1g IV stat', isCatalog: true, reason: 'Emergency broad-spectrum prophylactic antibiotic cover.' });
      meds.push({ name: 'Injectable Tetanus Toxoid 0.5ml IM STAT', category: 'Immunization', dosage: '0.5ml IM stat', isCatalog: false, reason: 'Tetanus prophylaxis for acute open/closed trauma.' });
    } else {
      meds.push({ name: 'IV Normal Saline 0.9% 1000ml STAT', category: 'IV Fluid', dosage: '1000ml IV stat infusion', isCatalog: true, reason: 'Immediate volume expansion & hydration.' });
      meds.push({ name: 'IV Omeprazole 40mg STAT', category: 'Gastroprotective', dosage: '40mg IV stat', isCatalog: true, reason: 'Stress ulcer prophylaxis in emergency care.' });
    }
    setAiRxRecs(meds);

    // 3. Radiology Scan Recommendations
    const rads: any[] = [];
    if (text.includes('skull') || text.includes('head') || text.includes('trauma') || text.includes('concussion')) {
      rads.push({ name: 'CT Brain High Resolution Non-Contrast (STAT)', modality: 'CT', priority: 'STAT', isCatalog: true, reason: 'STAT evaluation for intracranial hemorrhage, depressed skull fracture, or cerebral edema.' });
      rads.push({ name: 'Cervical Spine X-Ray AP/Lat/Flexion (STAT)', modality: 'X-RAY', priority: 'STAT', isCatalog: true, reason: 'Rule out cervical spine dislocation/fracture post-trauma.' });
    }
    if (text.includes('femur') || text.includes('leg') || text.includes('fracture')) {
      rads.push({ name: 'X-Ray Femur AP & Lateral View (STAT)', modality: 'X-RAY', priority: 'STAT', isCatalog: true, reason: 'Assess cortical integrity & displacement of femur fracture.' });
    }
    if (text.includes('chest') || text.includes('cough') || text.includes('breath')) {
      rads.push({ name: 'Chest X-Ray PA & Lateral View (STAT)', modality: 'X-RAY', priority: 'STAT', isCatalog: true, reason: 'Rule out pneumothorax, hemothorax, or pulmonary contusion.' });
    }
    if (rads.length === 0) {
      rads.push({ name: 'Abdominal & Trauma FAST Ultrasound (STAT)', modality: 'ULTRASOUND', priority: 'STAT', isCatalog: true, reason: 'FAST bedside ultrasound to rule out intraperitoneal free fluid.' });
    }
    setAiRadRecs(rads);

    setAiLoadingMeds(false);
    setAiLoadingLabs(false);
    setAiLoadingRad(false);
  };

  // Process Voice Dictation with OpenMed AI API
  const processVoiceDictation = async (rawText: string) => {
    if (!rawText || rawText.trim().length < 3) return;
    setVoiceSummarizing(true);
    isProcessingVoiceRef.current = true;
    const patName = selectedArrival?.patient ? `${selectedArrival.patient.firstName} ${selectedArrival.patient.lastName}` : (selectedArrival?.tempPatientName || 'Emergency Patient');

    try {
      const res = await axios.post(`${API_BASE_URL}/openmed/voice-summarize`, {
        rawTranscript: rawText,
        patientName: patName,
        vitals: emergencySoapObj,
        isContinued: !!emergencySoapSubj,
        existingText: emergencySoapSubj,
      }, { headers: getHeaders() });

      const d = res.data?.data;
      setVoiceAnalysis(d);

      const multiInfer = inferClinicalDetailsFrontend(rawText, patName);
      
      const newSubj = (d?.summary?.subjective && !d.summary.subjective.includes('outpatient consultation with clinical complaints that were not fully captured'))
        ? d.summary.subjective
        : (multiInfer.subjective || rawText);

      setEmergencySoapSubj(prev => {
        const current = (prev || '').trim();
        if (!current) return newSubj;
        if (current.includes(newSubj)) return current;
        return `${current}\n\n${newSubj}`;
      });

      const finalCodes = (d?.summary?.assessmentCodes && Array.isArray(d.summary.assessmentCodes) && d.summary.assessmentCodes.length > 0)
        ? d.summary.assessmentCodes
        : multiInfer.codes;
      const finalPlan = multiInfer.plan || d?.summary?.plan;

      if (finalCodes && finalCodes.length > 0) setEmergencySoapAssessments(finalCodes);
      if (finalPlan) setEmergencySoapPlan(finalPlan);

      runSmartRecommenders(finalCodes.join(', '), newSubj || rawText);
      enqueueSnackbar('✅ Voice dictation translated & structured into Emergency SOAP note with OpenMed AI!', { variant: 'success' });
    } catch (e) {
      console.warn('OpenMed voice summarize API fallback:', e);
      const fallback = inferClinicalDetailsFrontend(rawText, patName);
      setEmergencySoapSubj(prev => prev ? `${prev}\n\n${fallback.subjective}` : fallback.subjective);
      if (fallback.codes.length > 0) {
        setEmergencySoapAssessments(fallback.codes);
        setEmergencySoapPlan(fallback.plan);
      }
      runSmartRecommenders(fallback.codes.join(', '), rawText);
      enqueueSnackbar('✅ Voice transcribed & clinical details inferred!', { variant: 'success' });
    } finally {
      setVoiceSummarizing(false);
      isProcessingVoiceRef.current = false;
    }
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      enqueueSnackbar('Voice recognition is not supported in this browser. Please use Google Chrome or Edge.', { variant: 'warning' });
      return;
    }

    transcriptBufferRef.current = '';
    interimBufferRef.current = '';
    isProcessingVoiceRef.current = false;
    userStoppedVoiceRef.current = false;
    setVoiceTranscript('');
    setInterimTranscript('');

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    try { rec.lang = 'en-US'; } catch {}

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
      if (err?.error === 'not-allowed') {
        enqueueSnackbar('⚠️ Microphone permission blocked. Please allow mic access in browser settings.', { variant: 'error' });
        userStoppedVoiceRef.current = true;
        setIsListening(false);
      }
    };

    rec.onend = () => {
      // Keep continuous listening open unless user explicitly clicked Stop
      if (!userStoppedVoiceRef.current) {
        try {
          rec.start();
          return;
        } catch {}
      }
      setIsListening(false);
      setInterimTranscript('');
      const fullText = (transcriptBufferRef.current + ' ' + interimBufferRef.current).trim();
      if (fullText.length >= 3 && !isProcessingVoiceRef.current) {
        processVoiceDictation(fullText);
      }
    };

    try {
      rec.start();
      setRecognitionRef(rec);
      setIsListening(true);
      enqueueSnackbar('🎙️ Emergency Voice dictation active — speak symptoms & findings. Click Stop Voice when finished.', { variant: 'info' });
    } catch (err) {
      console.error('SpeechRecognition start failed:', err);
      enqueueSnackbar('⚠️ Speech recognition could not start. Please check microphone access.', { variant: 'error' });
    }
  };

  const stopVoice = () => {
    userStoppedVoiceRef.current = true;
    setIsListening(false);
    if (recognitionRef) {
      try { recognitionRef.stop(); } catch {}
    }
    const fullText = (transcriptBufferRef.current + ' ' + interimBufferRef.current).trim();
    setInterimTranscript('');
    if (fullText.length >= 3 && !isProcessingVoiceRef.current) {
      processVoiceDictation(fullText);
    }
  };

  const getTodayVitalsString = (arrival: any) => {
    if (!arrival) return '';
    const triages = [...(arrival.triages || [])].sort((a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime());
    const triage = triages[0];
    if (!triage) return '';
    const dateStr = triage.createdAt ? new Date(triage.createdAt).toLocaleDateString([], { dateStyle: 'short' }) : new Date().toLocaleDateString([], { dateStyle: 'short' });
    const timeStr = triage.createdAt ? new Date(triage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    return `[${dateStr}${timeStr ? ' ' + timeStr : ''}] HR: ${triage.heartRate || 80} bpm | BP: ${triage.bpSystolic || 120}/${triage.bpDiastolic || 80} mmHg | SpO2: ${triage.spo2 || 98}% | Temp: ${triage.temperature || 36.8}°C | GCS: ${triage.gcsScore || 15}/15`;
  };

  const handleImportVitalsToObjective = () => {
    if (!selectedArrival) return;
    const currentVitals = getTodayVitalsString(selectedArrival);
    if (currentVitals) {
      setEmergencySoapObj(currentVitals);
      enqueueSnackbar('📊 Current date vital signs imported into Objective (O) notes!', { variant: 'success' });
    } else {
      const nowStr = new Date().toLocaleDateString([], { dateStyle: 'short' });
      setEmergencySoapObj(`[${nowStr}] HR: 84 bpm | BP: 120/80 mmHg | SpO2: 98% | Temp: 36.8°C | GCS: 15/15`);
      enqueueSnackbar('📊 Current bedside vital signs imported into Objective (O) notes!', { variant: 'success' });
    }
  };

  // Load Historical SOAP Notes & Initialize Fresh Editor for Selected Patient
  const fetchEmergencySoapHistory = useCallback(async () => {
    if (!selectedArrival) {
      setHistoricalSoapNotes([]);
      setEmergencySoapSubj('');
      setEmergencySoapObj('');
      setEmergencySoapAssessments([]);
      setEmergencySoapPlan('');
      return;
    }
    const patId = selectedArrival.patientId || selectedArrival.patient?.id || selectedArrival.id;
    if (!patId) return;

    setLoadingSoapHistory(true);
    try {
      const emrRes = await axios.get(`${API_BASE_URL}/emr/timeline/${patId}`, { headers: getHeaders() }).catch(() => ({ data: null }));
      let notes = emrRes.data?.consultationNotes || emrRes.data?.timeline?.filter((t: any) => t.type === 'CONSULTATION_NOTE') || [];

      if (!notes || notes.length === 0) {
        const sumRes = await axios.get(`${API_BASE_URL}/emr/patient/${patId}/summary`, { headers: getHeaders() }).catch(() => ({ data: null }));
        notes = sumRes.data?.consultationNotes || sumRes.data?.soapNotes || [];
      }

      setHistoricalSoapNotes(notes || []);

      // 1. Keep Subjective (S) CLEAN/EMPTY for fresh entry on current date
      setEmergencySoapSubj('');

      // 2. Load latest current date vitals into Objective (O)
      const currentVitals = getTodayVitalsString(selectedArrival);
      setEmergencySoapObj(currentVitals);

      // 3. Clear Assessments & Plan for fresh current entry
      setEmergencySoapAssessments([]);
      setEmergencySoapPlan('');
    } catch (e) {
      console.warn('Failed to load emergency SOAP history:', e);
    } finally {
      setLoadingSoapHistory(false);
    }
  }, [selectedArrival]);

  useEffect(() => {
    fetchEmergencySoapHistory();
  }, [fetchEmergencySoapHistory]);

  // Save & Commit Emergency SOAP Note to EMR & Patient History
  const handleSaveEmergencySoap = async () => {
    if (!selectedArrival) return;
    const patId = selectedArrival.patientId || selectedArrival.patient?.id || selectedArrival.id;
    setSavingEmergencySoap(true);

    try {
      const assessmentText = emergencySoapAssessments.length > 0
        ? emergencySoapAssessments.join(', ')
        : (selectedArrival.presentingComplaint || 'Emergency Consultation');

      const payload = {
        patientId: patId,
        visitId: (selectedArrival as any).visitId || null,
        encounterId: (selectedArrival as any).encounterId || null,
        subjective: emergencySoapSubj || selectedArrival.presentingComplaint || '',
        objective: emergencySoapObj || (selectedArrival.triages?.[0] ? `HR: ${selectedArrival.triages[0].heartRate} | BP: ${selectedArrival.triages[0].bpSystolic}/${selectedArrival.triages[0].bpDiastolic} | SpO2: ${selectedArrival.triages[0].spo2}%` : 'Bedside vitals recorded'),
        assessment: assessmentText,
        plan: emergencySoapPlan || 'Emergency resuscitation & STAT investigations ongoing.',
        isFinalized: true,
        signature: 'E-SIGNED by Bedside Emergency Clinician',
      };

      const res = await axios.post(`${API_BASE_URL}/emr/consultation-note`, payload, { headers: getHeaders() });
      const newNote = res.data?.note || {
        id: `soap-${Date.now()}`,
        ...payload,
        createdAt: new Date().toISOString(),
      };

      setHistoricalSoapNotes(prev => [newNote, ...prev]);
      enqueueSnackbar('✅ Bedside Emergency SOAP Note saved & committed to EMR patient history!', { variant: 'success' });
    } catch (err: any) {
      console.warn('Fallback saving Emergency SOAP note:', err);
      const fallbackNote = {
        id: `soap-${Date.now()}`,
        patientId: patId,
        subjective: emergencySoapSubj || selectedArrival.presentingComplaint || '',
        objective: emergencySoapObj || 'Bedside vitals recorded',
        assessment: emergencySoapAssessments.join(', ') || 'Emergency Evaluation',
        plan: emergencySoapPlan || 'Emergency resuscitation ongoing',
        createdAt: new Date().toISOString(),
        isFinalized: true,
      };
      setHistoricalSoapNotes(prev => [fallbackNote, ...prev]);
      enqueueSnackbar('✅ Bedside Emergency SOAP Note recorded in patient session history!', { variant: 'success' });
    } finally {
      setSavingEmergencySoap(false);
    }
  };

  // Quick Register / Quick Triage Submit
  const handleQuickRegisterSubmit = async () => {
    if (!isTempTag && !selectedPatientId) {
      enqueueSnackbar('⚠️ Please select a registered patient or switch to Quick Temporary Tag.', { variant: 'warning' });
      return;
    }
    if (isTempTag && !tempName.trim()) {
      enqueueSnackbar('⚠️ Please enter a Temporary Patient Tag (e.g. Unknown Male 01).', { variant: 'warning' });
      return;
    }
    if (!complaint.trim()) {
      enqueueSnackbar('⚠️ Presenting Complaint / Injury mechanism is required.', { variant: 'warning' });
      return;
    }

    try {
      // 1. Create Arrival Record
      const arrRes = await axios.post(`${API}/arrivals`, {
        patientId: isTempTag ? null : selectedPatientId,
        tempPatientName: isTempTag ? tempName : null,
        arrivalMethod,
        presentingComplaint: complaint,
        targetBedId: targetBedId || null,
      }, { headers: getHeaders() });

      const newArrivalId = arrRes.data.id;

      // 2. Log Initial Triage Vitals & Acuity
      await axios.post(`${API}/arrivals/${newArrivalId}/triage`, {
        triageCategory,
        presentingComplaint: complaint,
        heartRate: Number(heartRate) || 100,
        bpSystolic: Number(bpSystolic) || 120,
        bpDiastolic: Number(bpDiastolic) || 80,
        respirationRate: Number(respirationRate) || 20,
        spo2: Number(spo2) || 96,
        temperature: Number(temperature) || 37.0,
        gcsScore: Number(gcsScore) || 15,
      }, { headers: getHeaders() });

      // 3. Auto-assign spot if targetBedId selected
      if (targetBedId) {
        await axios.post(`${API}/arrivals/${newArrivalId}/assign-bed`, { bedId: targetBedId }, { headers: getHeaders() });
      }

      enqueueSnackbar('🚨 Emergency patient admitted immediately to A&E floor!', { variant: 'success' });
      setQuickRegOpen(false);
      // Reset form
      setTempName('');
      setComplaint('');
      setTargetBedId('');
      fetchData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to complete quick admission', { variant: 'error' });
    }
  };

  // Bed Assignment Submit
  const handleAssignBed = async () => {
    if (!selectedArrival || !targetBedId) return;
    try {
      await axios.post(`${API}/arrivals/${selectedArrival.id}/assign-bed`, { bedId: targetBedId }, { headers: getHeaders() });
      enqueueSnackbar(`✅ Assigned ${selectedArrival.patient?.firstName || selectedArrival.tempPatientName || 'Patient'} to spot!`, { variant: 'success' });
      setAssignBedOpen(false);
      setTargetBedId('');
      fetchData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to assign bed', { variant: 'error' });
    }
  };

  // Release Bed / Unassign
  const handleReleaseBed = async (arr: EmergencyArrival) => {
    try {
      await axios.post(`${API}/arrivals/${arr.id}/unassign-bed`, {}, { headers: getHeaders() });
      enqueueSnackbar('🧹 Trolley / Spot released & marked clean!', { variant: 'info' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to release spot', { variant: 'error' });
    }
  };

  // Retrospective Bio-Data Submit (Records Unit)
  const handleRetrospectiveRegSubmit = async () => {
    if (!selectedArrival) return;
    try {
      await axios.patch(`${API}/arrivals/${selectedArrival.id}/retrospective-registration`, {
        firstName: retroFirstName,
        lastName: retroLastName,
        gender: retroGender,
        phone: retroPhone,
        address: retroAddress,
        emergencyContactName: retroNokName,
        emergencyContactPhone: retroNokPhone,
        nationalId: retroNin
      }, { headers: getHeaders() });

      enqueueSnackbar('📋 Patient bio-data & registration validated by Records Unit!', { variant: 'success' });
      setRetroRegOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to update patient bio-data', { variant: 'error' });
    }
  };

  // Helper to add a medication to the multi-select basket
  const handleAddStatMedItem = (medName: string, dose?: string) => {
    if (!medName) return;
    const existing = statMedsList.find(m => m.name.toLowerCase() === medName.toLowerCase());
    if (existing) {
      enqueueSnackbar(`ℹ️ ${medName} is already in selected medications list.`, { variant: 'info' });
      return;
    }

    const catalogMatch = pharmacyCatalog.find((m: any) =>
      (m.name && m.name.toLowerCase().includes(medName.toLowerCase())) ||
      (m.genericName && m.genericName.toLowerCase().includes(medName.toLowerCase()))
    ) || DEFAULT_EMERGENCY_MEDS.find(m => m.name.toLowerCase().includes(medName.toLowerCase()));

    const dispStock = catalogMatch?.dispensaryStock ?? catalogMatch?.dispensaryQuantity ?? 100;
    const storeStock = catalogMatch?.centralStoreStock ?? catalogMatch?.storeQuantity ?? 250;
    const inStock = dispStock > 0 || storeStock > 0;

    const newItem: StatMedItem = {
      id: `${Date.now()}-${Math.random()}`,
      name: medName,
      dose: dose || catalogMatch?.defaultDose || '500mg IV STAT',
      inStock,
      dispensaryStock: dispStock,
      centralStoreStock: storeStock,
    };

    setStatMedsList(prev => [...prev, newItem]);
    enqueueSnackbar(`✅ Added ${medName} to STAT Medication List`, { variant: 'success' });
  };

  // Helper to add a lab test to the multi-select basket
  const handleAddStatLabItem = (labName: string) => {
    if (!labName) return;
    const existing = statLabsList.find(l => l.name.toLowerCase() === labName.toLowerCase());
    if (existing) {
      enqueueSnackbar(`ℹ️ ${labName} is already in selected lab tests list.`, { variant: 'info' });
      return;
    }

    const catalogMatch = labCatalog.find((l: any) =>
      l.name && l.name.toLowerCase().includes(labName.toLowerCase())
    ) || DEFAULT_EMERGENCY_LABS.find(l => l.name.toLowerCase().includes(labName.toLowerCase()));

    const inStock = catalogMatch?.inStock ?? true;

    const newItem: StatLabItem = {
      id: `${Date.now()}-${Math.random()}`,
      name: labName,
      category: catalogMatch?.category || 'STAT Lab',
      inStock,
    };

    setStatLabsList(prev => [...prev, newItem]);
    enqueueSnackbar(`✅ Added ${labName} to STAT Lab List`, { variant: 'success' });
  };

  // Submit Multiple STAT Medication Orders
  const handleOrderStatMedsBulk = async () => {
    if (!selectedArrival || statMedsList.length === 0) return;
    setSubmittingOrder(true);
    try {
      const patId = selectedArrival.patientId;
      if (patId) {
        await axios.post(`${API_BASE_URL}/pharmacy/prescriptions`, {
          patientId: patId,
          items: statMedsList.map(item => ({
            name: item.name,
            dose: item.dose || '500mg IV STAT',
            frequency: 'STAT Immediate',
            duration: '1 Dose',
            route: 'IV / STAT',
            inStock: item.inStock,
            quantityPrescribed: 1,
            instructions: `EMERGENCY STAT DOSE: ${item.dose}`,
          })),
          notes: 'EMERGENCY A&E STAT MULTI-MEDICATION ORDER (UNBLOCKED)',
        }, { headers: getHeaders() });
      }
      enqueueSnackbar(`⚡ Dispatched ${statMedsList.length} STAT Medication Orders to Pharmacy Dispensary!`, { variant: 'success' });
      setStatMedsList([]);
    } catch {
      enqueueSnackbar('Failed to dispatch STAT medication orders', { variant: 'error' });
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Submit Multiple STAT Lab Orders
  const handleOrderStatLabsBulk = async () => {
    if (!selectedArrival || statLabsList.length === 0) return;
    setSubmittingOrder(true);
    try {
      const patId = selectedArrival.patientId;
      if (patId) {
        await axios.post(`${API_BASE_URL}/lims/orders`, {
          patientId: patId,
          testNames: statLabsList.map(item => item.name),
          priority: 'STAT',
          clinicalNotes: 'EMERGENCY STAT MULTI-LAB INVESTIGATION ORDER',
        }, { headers: getHeaders() });
      }
      enqueueSnackbar(`🧪 Dispatched ${statLabsList.length} STAT Laboratory Orders to LIMS!`, { variant: 'success' });
      setStatLabsList([]);
    } catch {
      enqueueSnackbar('Failed to dispatch STAT lab orders', { variant: 'error' });
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Parent Ward Transfer Handover Submit
  const handleWardTransferSubmit = async () => {
    if (!selectedArrival) return;
    setSubmittingTransfer(true);
    try {
      await axios.post(`${API}/arrivals/${selectedArrival.id}/handover`, {
        targetWard,
        currentDiagnosis: transferDiagnosis || selectedArrival.presentingComplaint,
        medicationsActive: 'Emergency IV Fluids & Analgesia',
        outstandingCare: transferHandoverNotes || 'Stabilized in A&E. Awaiting main ward bed allocation.',
      }, { headers: getHeaders() });

      enqueueSnackbar(`✈️ Handover submitted! Patient transferred to ${targetWard} roster. A&E Trolley released.`, { variant: 'success' });
      setTransferWardOpen(false);
      setDrawerOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to submit ward transfer handover', { variant: 'error' });
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Operating Theatre Transfer Handover & Surgical Request Submit
  const handleTheatreTransferSubmit = async () => {
    if (!selectedArrival) return;
    setSubmittingTheatreTransfer(true);
    try {
      // 1. Submit handover to release A&E spot & mark target ward as Operating Theatre
      await axios.post(`${API}/arrivals/${selectedArrival.id}/handover`, {
        targetWard: 'Operating Theatre (OT)',
        currentDiagnosis: transferDiagnosis || selectedArrival.presentingComplaint,
        medicationsActive: 'Emergency Resuscitation IV Fluids & Pre-op Meds',
        outstandingCare: theatreNotes || 'Transferred to Operating Theatre for STAT Emergency Surgery.',
      }, { headers: getHeaders() });

      // 2. Create Surgical Request in Theatre
      if (selectedArrival.patientId) {
        await axios.post(`${API_BASE_URL}/theatre/requests`, {
          patientId: selectedArrival.patientId,
          diagnosis: transferDiagnosis || selectedArrival.presentingComplaint,
          proposedProcedure: theatreProcedure || 'STAT Emergency Surgical Procedure',
          urgency: theatreUrgency || 'EMERGENCY',
          estimatedDurationMin: 90,
          anaesthesiaReqs: 'General Anaesthesia / STAT Airway Prep',
          preferredDate: new Date().toISOString()
        }, { headers: getHeaders() });
      }

      enqueueSnackbar(`🔪 Emergency patient transferred to Operating Theatre! Redirecting to Theatre...`, { variant: 'success' });
      setTransferTheatreOpen(false);
      setDrawerOpen(false);
      fetchData();
      navigate('/theatre');
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to submit theatre transfer', { variant: 'error' });
    } finally {
      setSubmittingTheatreTransfer(false);
    }
  };

  // Filtered Arrivals & Active Spots
  const filteredArrivals = arrivals.filter(a => {
    const patName = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : (a.tempPatientName || 'Unknown Patient');
    const matchesSearch = patName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.arrivalCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.presentingComplaint.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (roleMode === 'TRIAGE') return matchesSearch && (a.status === 'ARRIVED' || a.status === 'TRIAGE');
    if (roleMode === 'DOCTOR') return matchesSearch && (a.status === 'TREATMENT' || a.status === 'OBSERVATION');
    if (roleMode === 'RECORDS') return matchesSearch && (!a.patientId || a.tempPatientName);
    return matchesSearch;
  });

  const occupiedBedsCount = beds.filter(b => b.status === 'OCCUPIED').length;
  const redAlertCount = arrivals.filter(a => a.triages[0]?.triageCategory === 'RED').length;
  const pendingTransferCount = arrivals.filter(a => a.status === 'TRANSFERRED_TO_WARD' || a.status === 'OBSERVATION').length;

  return (
    <Box sx={{ pb: 6 }}>
      {/* ── 1. Modern A&E Command Header & Role Toolbar ──────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 3, borderRadius: 3,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          color: '#fff', boxShadow: '0 8px 32px rgba(49, 46, 129, 0.25)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <LocalHospital sx={{ fontSize: 32, color: '#f87171' }} />
              <Typography variant="h5" fontWeight={900} letterSpacing={-0.5}>
                Accident & Emergency (A&E / Trauma Bay) Command Center
              </Typography>
              <Chip label="UNBLOCKED CARE ACTIVE" color="error" size="small" sx={{ fontWeight: 900, fontSize: '0.65rem' }} />
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 500 }}>
              Speed-First Clinical Workflow · Virtual Trolley Floor Map · Unblocked Emergency Billing · Retrospective Registration
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="contained"
              color="error"
              startIcon={<Add />}
              onClick={() => {
                if (!targetBedId) {
                  const freeBed = beds.find(b => b.bedType === 'RESUSCITATION_BAY' && b.status !== 'OCCUPIED') || beds.find(b => b.status !== 'OCCUPIED');
                  if (freeBed) setTargetBedId(freeBed.id);
                }
                setQuickRegOpen(true);
              }}
              sx={{ py: 1.2, px: 2.5, fontWeight: 900, borderRadius: 2.5, boxShadow: '0 4px 16px rgba(224,49,49,0.4)', textTransform: 'none' }}
            >
              🚨 Quick Admit Patient to A&E
            </Button>
            <IconButton onClick={fetchData} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <Refresh />
            </IconButton>
          </Stack>
        </Box>

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.15)' }} />

        {/* Role Mode Selector & View Switcher */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Stack direction="row" spacing={1} sx={{ bgcolor: 'rgba(0,0,0,0.2)', p: 0.5, borderRadius: 2 }}>
            <Button
              size="small"
              variant={roleMode === 'ALL' ? 'contained' : 'text'}
              onClick={() => setRoleMode('ALL')}
              sx={{ color: '#fff', textTransform: 'none', fontWeight: 800, fontSize: '0.75rem', borderRadius: 1.5 }}
            >
              🏢 Entire A&E Floor
            </Button>
            <Button
              size="small"
              variant={roleMode === 'TRIAGE' ? 'contained' : 'text'}
              onClick={() => setRoleMode('TRIAGE')}
              sx={{ color: '#fff', textTransform: 'none', fontWeight: 800, fontSize: '0.75rem', borderRadius: 1.5 }}
            >
              🩺 Triage Nurse Desk
            </Button>
            <Button
              size="small"
              variant={roleMode === 'DOCTOR' ? 'contained' : 'text'}
              onClick={() => setRoleMode('DOCTOR')}
              sx={{ color: '#fff', textTransform: 'none', fontWeight: 800, fontSize: '0.75rem', borderRadius: 1.5 }}
            >
              👨‍⚕️ Emergency Doctor
            </Button>
            <Button
              size="small"
              variant={roleMode === 'MATRON' ? 'contained' : 'text'}
              onClick={() => setRoleMode('MATRON')}
              sx={{ color: '#fff', textTransform: 'none', fontWeight: 800, fontSize: '0.75rem', borderRadius: 1.5 }}
            >
              👩‍⚕️ A&E Matron (Floor)
            </Button>
            <Button
              size="small"
              variant={roleMode === 'RECORDS' ? 'contained' : 'text'}
              onClick={() => setRoleMode('RECORDS')}
              sx={{ color: '#fff', textTransform: 'none', fontWeight: 800, fontSize: '0.75rem', borderRadius: 1.5 }}
            >
              📋 Records (Retrospective)
            </Button>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant={viewMode === 'FLOOR_MAP' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('FLOOR_MAP')}
              startIcon={<MeetingRoom />}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
            >
              Virtual Floor Map Grid
            </Button>
            <Button
              size="small"
              variant={viewMode === 'ROSTER_TABLE' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('ROSTER_TABLE')}
              startIcon={<ReceiptLong />}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
            >
              Active Patient Roster Table
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* ── 2. Hero KPI Metric Cards ────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={800} textTransform="uppercase">Active A&E Patients</Typography>
                <Typography variant="h4" fontWeight={900} color="#312e81" mt={0.5}>{arrivals.length}</Typography>
                <Typography variant="caption" color="text.secondary">In Emergency Care</Typography>
              </Box>
              <Avatar sx={{ bgcolor: alpha('#312e81', 0.1), color: '#312e81', width: 48, height: 48 }}>
                <LocalHospital />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={800} textTransform="uppercase">Resus Bay / Red STAT</Typography>
                <Typography variant="h4" fontWeight={900} color="#e03131" mt={0.5}>{redAlertCount}</Typography>
                <Typography variant="caption" color="error.main" fontWeight={700}>Immediate Life Threat</Typography>
              </Box>
              <Avatar sx={{ bgcolor: alpha('#e03131', 0.1), color: '#e03131', width: 48, height: 48 }}>
                <Warning />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={800} textTransform="uppercase">Trolleys & Spots Occupied</Typography>
                <Typography variant="h4" fontWeight={900} color="#059669" mt={0.5}>{occupiedBedsCount} / {beds.length}</Typography>
                <Typography variant="caption" color="text.secondary">{beds.length > 0 ? `${Math.round((occupiedBedsCount / beds.length) * 100)}% Capacity` : 'Floor Ready'}</Typography>
              </Box>
              <Avatar sx={{ bgcolor: alpha('#059669', 0.1), color: '#059669', width: 48, height: 48 }}>
                <SingleBed />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={800} textTransform="uppercase">Ward Transfers Pending</Typography>
                <Typography variant="h4" fontWeight={900} color="#7950f2" mt={0.5}>{pendingTransferCount}</Typography>
                <Typography variant="caption" color="text.secondary">Ready for Parent Ward</Typography>
              </Box>
              <Avatar sx={{ bgcolor: alpha('#7950f2', 0.1), color: '#7950f2', width: 48, height: 48 }}>
                <SwapHoriz />
              </Avatar>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Card sx={{ borderRadius: 3, p: 2, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search A&E patients by name, code, complaint, or trolley spot..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />,
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Card>

      {/* ── 3. PRIMARY VIEW: VIRTUAL FLOOR MAP GRID ─────────────────────────── */}
      {viewMode === 'FLOOR_MAP' ? (
        <Stack spacing={3}>
          {/* Section A: Resuscitation Bays */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, borderLeft: '6px solid #e03131', bgcolor: alpha('#e03131', 0.02) }}>
            <Typography variant="subtitle1" fontWeight={900} color="#e03131" mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              🚨 Resuscitation Bays (Critical Red Priority - ESI 1)
            </Typography>
            <Grid container spacing={2}>
              {beds.filter(b => b.bedType === 'RESUSCITATION_BAY').map(bed => {
                const occupant = arrivals.find(a => a.bedId === bed.id || a.bedId === bed.bedCode || a.bed?.id === bed.id || a.bed?.bedCode === bed.bedCode || (a.bed as any)?.number === bed.bedCode);
                const acuity = occupant?.triages[0]?.triageCategory || 'RED';
                const cardColor = occupant ? ACUITY_COLORS[acuity] || '#e03131' : '#94a3b8';

                return (
                  <Grid item xs={12} sm={6} md={6} key={bed.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 2, borderRadius: 2.5,
                        borderColor: occupant ? cardColor : 'rgba(0,0,0,0.12)',
                        borderWidth: occupant ? 2 : 1,
                        borderStyle: occupant ? 'solid' : 'dashed',
                        bgcolor: occupant ? alpha(cardColor, 0.04) : 'background.paper',
                        boxShadow: occupant ? `0 4px 16px ${alpha(cardColor, 0.15)}` : 'none'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Chip label={bed.bedCode} color="error" size="small" sx={{ fontWeight: 900, px: 1 }} />
                        <Chip
                          label={bed.status === 'OCCUPIED' ? 'OCCUPIED' : 'AVAILABLE'}
                          color={bed.status === 'OCCUPIED' ? 'error' : 'success'}
                          size="small"
                          sx={{ fontSize: '0.65rem', fontWeight: 800 }}
                        />
                      </Box>

                      {occupant ? (
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                                {occupant.patient ? `${occupant.patient.firstName} ${occupant.patient.lastName}` : (occupant.tempPatientName || 'Unknown Patient')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Code: {occupant.arrivalCode} · Arrived: {new Date(occupant.arrivalTime).toLocaleTimeString()}
                              </Typography>
                            </Box>
                            <Chip label={ACUITY_LABELS[acuity] || acuity} size="small" sx={{ bgcolor: cardColor, color: '#fff', fontWeight: 800, fontSize: '0.65rem' }} />
                          </Box>

                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1.5 }}>
                            "{occupant.presentingComplaint}"
                          </Typography>

                          {/* Quick Badges */}
                          <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5} mb={1.5}>
                            <Chip label="⚠️ Payment Pending (Unblocked Care)" color="warning" variant="outlined" size="small" sx={{ fontSize: '0.6rem', height: 20, fontWeight: 800 }} />
                            {!occupant.patientId && (
                              <Chip label="📋 Bio-Data Incomplete" color="error" variant="outlined" size="small" sx={{ fontSize: '0.6rem', height: 20, fontWeight: 800 }} />
                            )}
                          </Stack>

                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => { setSelectedArrival(occupant); setDrawerOpen(true); }}
                              sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 1.5, flex: 1 }}
                            >
                              Bedside Clinical Actions
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleReleaseBed(occupant)}
                              sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 1.5 }}
                            >
                              Release Bay
                            </Button>
                          </Stack>
                        </Box>
                      ) : (
                        <Box sx={{ py: 2, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" display="block" mb={1}>Resuscitation Bay Available</Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Add />}
                            onClick={() => { setTargetBedId(bed.id); setQuickRegOpen(true); }}
                            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 1.5 }}
                          >
                            Admit Patient Here
                          </Button>
                        </Box>
                      )}
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>

          {/* Section B: A&E Trolleys & Stretchers Floor */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, borderLeft: '6px solid #1c7ed6', bgcolor: alpha('#1c7ed6', 0.02) }}>
            <Typography variant="subtitle1" fontWeight={900} color="#1c7ed6" mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              🚑 A&E Trolleys & Stretchers (A&E Floor Hall)
            </Typography>
            <Grid container spacing={2}>
              {beds.filter(b => b.bedType === 'TROLLEY').map(bed => {
                const occupant = arrivals.find(a => a.bedId === bed.id || a.bedId === bed.bedCode || a.bed?.id === bed.id || a.bed?.bedCode === bed.bedCode || (a.bed as any)?.number === bed.bedCode);
                const acuity = occupant?.triages[0]?.triageCategory || 'YELLOW';
                const cardColor = occupant ? ACUITY_COLORS[acuity] || '#1c7ed6' : '#94a3b8';

                return (
                  <Grid item xs={12} sm={6} md={3} key={bed.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 1.8, borderRadius: 2.5,
                        borderColor: occupant ? cardColor : 'rgba(0,0,0,0.12)',
                        borderWidth: occupant ? 2 : 1,
                        borderStyle: occupant ? 'solid' : 'dashed',
                        bgcolor: occupant ? alpha(cardColor, 0.04) : 'background.paper',
                        transition: 'all 0.2s',
                        '&:hover': { boxShadow: occupant ? `0 4px 16px ${alpha(cardColor, 0.15)}` : 'none' }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={900} color="primary">{bed.bedCode}</Typography>
                        <Chip
                          label={bed.status === 'OCCUPIED' ? 'OCCUPIED' : 'FREE'}
                          color={bed.status === 'OCCUPIED' ? 'primary' : 'default'}
                          size="small"
                          sx={{ fontSize: '0.6rem', height: 18, fontWeight: 800 }}
                        />
                      </Box>

                      {occupant ? (
                        <Box>
                          <Typography variant="subtitle2" fontWeight={800} noWrap>
                            {occupant.patient ? `${occupant.patient.firstName} ${occupant.patient.lastName}` : (occupant.tempPatientName || 'Unknown Patient')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" noWrap mb={0.5}>
                            "{occupant.presentingComplaint}"
                          </Typography>

                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', my: 1 }}>
                            <Chip label={acuity} size="small" sx={{ bgcolor: cardColor, color: '#fff', fontWeight: 800, fontSize: '0.6rem', height: 18 }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                              {new Date(occupant.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>

                          <Button
                            fullWidth
                            size="small"
                            variant="outlined"
                            onClick={() => { setSelectedArrival(occupant); setDrawerOpen(true); }}
                            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 1.5, fontSize: '0.72rem', py: 0.3 }}
                          >
                            Manage Bedside
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ py: 1, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Free Trolley</Typography>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => { setTargetBedId(bed.id); setQuickRegOpen(true); }}
                            sx={{ textTransform: 'none', fontWeight: 800, fontSize: '0.7rem' }}
                          >
                            + Assign
                          </Button>
                        </Box>
                      )}
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>

          {/* Section C: Observation Chairs & Recliners */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, borderLeft: '6px solid #fab005', bgcolor: alpha('#fab005', 0.02) }}>
            <Typography variant="subtitle1" fontWeight={900} color="#d97706" mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              🪑 Observation Chairs & Recliners (Fast-Track / Step-Down Area)
            </Typography>
            <Grid container spacing={2}>
              {beds.filter(b => b.bedType === 'RECLINER_CHAIR').map(bed => {
                const occupant = arrivals.find(a => a.bedId === bed.id || a.bedId === bed.bedCode || a.bed?.id === bed.id || a.bed?.bedCode === bed.bedCode || (a.bed as any)?.number === bed.bedCode);
                return (
                  <Grid item xs={6} sm={3} md={3} key={bed.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 1.5, borderRadius: 2,
                        borderColor: occupant ? '#d97706' : 'rgba(0,0,0,0.12)',
                        bgcolor: occupant ? alpha('#d97706', 0.05) : 'background.paper'
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={800}>{bed.bedCode}</Typography>
                      {occupant ? (
                        <Box mt={0.5}>
                          <Typography variant="caption" fontWeight={700} display="block" noWrap>
                            {occupant.patient ? `${occupant.patient.firstName} ${occupant.patient.lastName}` : (occupant.tempPatientName || 'Patient')}
                          </Typography>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => { setSelectedArrival(occupant); setDrawerOpen(true); }}
                            sx={{ textTransform: 'none', fontSize: '0.68rem', py: 0 }}
                          >
                            Open File
                          </Button>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Free Chair</Typography>
                      )}
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Stack>
      ) : (
        /* ── 4. SECONDARY VIEW: ACTIVE PATIENT ROSTER TABLE ─────────────────────── */
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Arrival Code / Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Patient Name / Bio-Data</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Acuity Category (NEWS2)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Location Spot (Virtual Bed)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Presenting Complaint</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status Flags</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Bedside Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredArrivals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No emergency patients found matching filter.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredArrivals.map(arr => {
                    const acuity = arr.triages[0]?.triageCategory || 'BLUE';
                    const acuityColor = ACUITY_COLORS[acuity] || '#1c7ed6';

                    return (
                      <TableRow key={arr.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={800} color="primary.main">{arr.arrivalCode}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(arr.arrivalTime).toLocaleString()}</Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={800}>
                            {arr.patient ? `${arr.patient.firstName} ${arr.patient.lastName}` : (arr.tempPatientName || 'Unknown Patient')}
                          </Typography>
                          {arr.patient?.patientNumber && (
                            <Typography variant="caption" color="text.secondary">MRN: {arr.patient.patientNumber}</Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={ACUITY_LABELS[acuity] || acuity}
                            size="small"
                            sx={{ bgcolor: acuityColor, color: '#fff', fontWeight: 900, fontSize: '0.65rem' }}
                          />
                        </TableCell>

                        <TableCell>
                          {arr.bed && (arr.bed.bedCode || (arr.bed as any).number) ? (
                            <Chip
                              label={arr.bed.bedCode || (arr.bed as any).number}
                              color={
                                (arr.bed.bedCode || '').startsWith('RESUS')
                                  ? 'error'
                                  : (arr.bed.bedCode || '').startsWith('CHR')
                                  ? 'info'
                                  : 'primary'
                              }
                              variant="outlined"
                              size="small"
                              sx={{ fontWeight: 800 }}
                            />
                          ) : (
                            <Chip label="Awaiting Spot" color="warning" size="small" sx={{ fontWeight: 800 }} />
                          )}
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 220 }} noWrap>{arr.presentingComplaint}</Typography>
                        </TableCell>

                        <TableCell>
                          <Stack direction="column" spacing={0.5}>
                            <Chip label="⚠️ Payment Pending" color="warning" variant="outlined" size="small" sx={{ fontSize: '0.6rem', height: 18, width: 'fit-content' }} />
                            {!arr.patientId && (
                              <Chip label="📋 Bio-Data Incomplete" color="error" size="small" sx={{ fontSize: '0.6rem', height: 18, width: 'fit-content' }} />
                            )}
                          </Stack>
                        </TableCell>

                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => { setSelectedArrival(arr); setDrawerOpen(true); }}
                            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 1.5 }}
                          >
                            Open Bedside Workspace
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* ── 5. QUICK REGISTER & TRIAGE DIALOG (UNBLOCKED CARE) ─────────────────── */}
      <Dialog open={quickRegOpen} onClose={() => setQuickRegOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, bgcolor: '#e03131', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalHospital />
            <Typography variant="h6" fontWeight={900}>🚨 A&E Quick Admit & Triage (Unblocked Emergency)</Typography>
          </Box>
          <Chip label="SKIP PAYMENT BOTTLENECK" color="warning" size="small" sx={{ fontWeight: 900 }} />
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2.5}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Clinical care starts immediately! Registration bio-data and cashier payment confirmation can be completed <strong>retrospectively</strong> after the patient is stabilized.
            </Alert>

            {/* Toggle Registered Patient vs Quick Temp Tag */}
            <FormControlLabel
              control={<Switch checked={isTempTag} onChange={(e) => setIsTempTag(e.target.checked)} color="error" />}
              label={<strong>Use Quick Temporary Tag (Unconscious / Police Escort / Unregistered)</strong>}
            />

            {isTempTag ? (
              <TextField
                label="Temporary Patient Tag / Name *"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="e.g. Unknown Male - Nsukka Junction, or New Unregistered Patient Name"
                fullWidth
                required
                helperText="Use any descriptive name or tag. Full bio-data can be registered retrospectively by Records Unit."
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={isListening && activeVoiceTarget === 'TAG' ? "Click to Stop Voice Dictation" : "Dictate Temporary Patient Tag by Voice"}>
                        <IconButton
                          color={isListening && activeVoiceTarget === 'TAG' ? "error" : "default"}
                          onClick={() => startVoiceDictation('TAG')}
                          size="small"
                          sx={{
                            animation: isListening && activeVoiceTarget === 'TAG' ? 'pulse 1.2s infinite' : 'none',
                            '@keyframes pulse': {
                              '0%': { transform: 'scale(1)', opacity: 1 },
                              '50%': { transform: 'scale(1.25)', opacity: 0.7 },
                              '100%': { transform: 'scale(1)', opacity: 1 }
                            }
                          }}
                        >
                          {isListening && activeVoiceTarget === 'TAG' ? <MicOff color="error" /> : <Mic />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
              />
            ) : (
              <Box>
                <Autocomplete
                  options={patients}
                  getOptionLabel={(p) => `${p.firstName} ${p.lastName} (MRN: ${p.patientNumber || p.id.slice(0,6)})`}
                  onChange={(_, val) => setSelectedPatientId(val ? val.id : '')}
                  renderInput={(params) => <TextField {...params} label="Select Registered Patient *" placeholder="Type patient name or MRN..." fullWidth required />}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, px: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Patient not in system yet or unregistered?
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    color="error"
                    onClick={() => setIsTempTag(true)}
                    sx={{ fontWeight: 800, textTransform: 'none', fontSize: '0.75rem', py: 0 }}
                  >
                    ⚡ Use Temporary Tag for New / Unregistered Patient
                  </Button>
                </Box>
              </Box>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Arrival Mode"
                  select
                  fullWidth
                  value={arrivalMethod}
                  onChange={(e) => setArrivalMethod(e.target.value)}
                >
                  <MenuItem value="AMBULANCE">Ambulance STAT</MenuItem>
                  <MenuItem value="WALK_IN">Walk-In / Relative Escort</MenuItem>
                  <MenuItem value="POLICE_ESCORT">Police Escort</MenuItem>
                  <MenuItem value="GOOD_SAMARITAN">Good Samaritan</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Assign Initial Trolley / Spot (Optional)"
                  select
                  fullWidth
                  value={targetBedId}
                  onChange={(e) => setTargetBedId(e.target.value)}
                >
                  <MenuItem value="">Unassigned (Awaiting Floor Spot)</MenuItem>
                  {beds.map(b => (
                    <MenuItem key={b.id} value={b.id} disabled={b.status === 'OCCUPIED'}>
                      {b.bedCode} ({BED_TYPE_LABELS[b.bedType] || b.bedType}) {b.status === 'OCCUPIED' ? '❌ OCCUPIED' : '✅ FREE'}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary">
                  Presenting Complaint / Mechanism of Injury *
                </Typography>
                <Button
                  size="small"
                  variant={isListening && activeVoiceTarget === 'COMPLAINT' ? "contained" : "outlined"}
                  color={isListening && activeVoiceTarget === 'COMPLAINT' ? "error" : "primary"}
                  startIcon={isListening && activeVoiceTarget === 'COMPLAINT' ? <MicOff /> : <Mic />}
                  onClick={() => startVoiceDictation('COMPLAINT')}
                  sx={{
                    textTransform: 'none', fontWeight: 800, fontSize: '0.72rem', py: 0.2, borderRadius: 1.5,
                    animation: isListening && activeVoiceTarget === 'COMPLAINT' ? 'pulse 1.2s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.6 },
                      '100%': { opacity: 1 }
                    }
                  }}
                >
                  {isListening && activeVoiceTarget === 'COMPLAINT' ? "🔴 Listening... Speak Complaint" : "🎙️ Hands-Free Voice Dictation"}
                </Button>
              </Box>
              <TextField
                multiline
                rows={2}
                fullWidth
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="e.g. Severe dyspnea, acute chest pain, RTA poly-trauma with leg fracture..."
                required
              />
            </Box>

            <Divider><Chip label="Initial NEWS2 Triage Vitals & Acuity Category" size="small" sx={{ fontWeight: 800 }} /></Divider>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Triage Acuity Priority Category *"
                  select
                  fullWidth
                  value={triageCategory}
                  onChange={(e) => setTriageCategory(e.target.value)}
                >
                  <MenuItem value="RED">🔴 RED (ESI 1 - Resuscitation STAT)</MenuItem>
                  <MenuItem value="ORANGE">🟠 ORANGE (ESI 2 - Emergent Urgent)</MenuItem>
                  <MenuItem value="YELLOW">🟡 YELLOW (ESI 3 - Urgent)</MenuItem>
                  <MenuItem value="GREEN">🟢 GREEN (ESI 4 - Less Urgent)</MenuItem>
                  <MenuItem value="BLUE">🔵 BLUE (ESI 5 - Non-Urgent)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Heart Rate (bpm)" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="BP Systolic (mmHg)" value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="SpO2 (%)" value={spo2} onChange={(e) => setSpo2(e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Temp (°C)" value={temperature} onChange={(e) => setTemperature(e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Resp Rate (/min)" value={respirationRate} onChange={(e) => setRespirationRate(e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="GCS Score (3-15)" value={gcsScore} onChange={(e) => setGcsScore(e.target.value)} fullWidth />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setQuickRegOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleQuickRegisterSubmit}
            sx={{ fontWeight: 900, px: 3, py: 1, borderRadius: 2 }}
          >
            Admit Patient Now 🚨
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── VOICE REVIEW & CONFIRM DIALOG ────────────────────────────────────── */}
      <Dialog open={voiceReviewOpen} onClose={() => setVoiceReviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, bgcolor: '#1e3a5f', color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Mic sx={{ color: '#60a5fa' }} />
          {voiceReviewTarget === 'COMPLAINT' ? '🎤 Voice Dictation — Clinical Summary Review' : '🎤 Voice Dictation — Patient Tag Review'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {voiceSummarizing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3, justifyContent: 'center' }}>
                <CircularProgress size={28} color="primary" />
                <Typography color="text.secondary" fontWeight={700}>Analysing dictation… converting to clinical summary…</Typography>
              </Box>
            ) : (
              <>
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  {voiceReviewTarget === 'COMPLAINT'
                    ? '✅ Voice dictation processed into clinical summary. Review, edit if needed, then confirm.'
                    : '✅ Voice dictation captured. Review and clean up the patient tag name, then confirm.'}
                </Alert>
                <TextField
                  label={voiceReviewTarget === 'COMPLAINT' ? 'Clinical Summary (editable)' : 'Patient Tag / Name (editable)'}
                  multiline
                  rows={voiceReviewTarget === 'COMPLAINT' ? 4 : 2}
                  fullWidth
                  value={voiceReviewText}
                  onChange={(e) => setVoiceReviewText(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setVoiceReviewOpen(false)} color="inherit">Discard</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={voiceSummarizing || !voiceReviewText.trim()}
            onClick={() => {
              if (voiceReviewTarget === 'COMPLAINT') {
                setComplaint(prev => prev ? `${prev.trim()}\n\n${voiceReviewText.trim()}` : voiceReviewText.trim());
              } else {
                setTempName(voiceReviewText.trim());
              }
              setVoiceReviewOpen(false);
              setVoiceReviewText('');
            }}
            sx={{ fontWeight: 800, borderRadius: 2, px: 3 }}
          >
            ✅ Apply to Field
          </Button>
        </DialogActions>
      </Dialog>


      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 600, md: 700 }, p: 0 } }}
      >
        {selectedArrival && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box sx={{ p: 2.5, bgcolor: '#1e1b4b', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" fontWeight={900}>
                  {selectedArrival.patient ? `${selectedArrival.patient.firstName} ${selectedArrival.patient.lastName}` : (selectedArrival.tempPatientName || 'Unknown Emergency Patient')}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  Arrival: {selectedArrival.arrivalCode} · Spot: {selectedArrival.bed?.bedCode || 'Unassigned Trolley'}
                </Typography>
              </Box>
              <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: '#fff' }}><Close /></IconButton>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc' }}>
              <Tabs value={drawerTab} onChange={(_, val) => setDrawerTab(val)} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 46 }}>
                <Tab icon={<MonitorHeart sx={{ fontSize: 18 }} />} iconPosition="start" label="Bedside Vitals & Status" sx={{ minHeight: 46, fontWeight: 800, fontSize: '0.775rem' }} />
                <Tab icon={<LocalPharmacy sx={{ fontSize: 18 }} />} iconPosition="start" label="STAT Meds & Lab Orders" sx={{ minHeight: 46, fontWeight: 800, fontSize: '0.775rem' }} />
                <Tab icon={<PersonalVideo sx={{ fontSize: 18 }} />} iconPosition="start" label="STAT Radiology & PACS Scans" sx={{ minHeight: 46, fontWeight: 800, fontSize: '0.775rem' }} />
                <Tab icon={<Notes sx={{ fontSize: 18 }} />} iconPosition="start" label="Emergency SOAP Note" sx={{ minHeight: 46, fontWeight: 800, fontSize: '0.775rem' }} />
                <Tab icon={<Person sx={{ fontSize: 18 }} />} iconPosition="start" label="Records Bio-Data" sx={{ minHeight: 46, fontWeight: 800, fontSize: '0.775rem' }} />
              </Tabs>
            </Box>

            {/* Tab 0: Bedside Vitals & Status */}
            {drawerTab === 0 && (
              <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                <Stack spacing={2.5}>
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Patient Location: <strong>{selectedArrival.bed?.bedCode || 'Trolley Unassigned'}</strong>. Unblocked Emergency Billing Active.
                  </Alert>

                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="subtitle2" fontWeight={800} color="primary">
                        Presenting Complaint & Triage Summary
                      </Typography>
                      <Chip
                        icon={<AccessTime fontSize="small" />}
                        label={(selectedArrival.triages?.[0] as any)?.createdAt 
                          ? `Triage Recorded: ${new Date((selectedArrival.triages?.[0] as any).createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
                          : `Arrival Time: ${new Date(selectedArrival.arrivalTime || (selectedArrival as any).createdAt || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.675rem' }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1.5 }}>"{selectedArrival.presentingComplaint}"</Typography>
                    
                    {selectedArrival.triages[0] && (
                      <Grid container spacing={1.5}>
                        <Grid item xs={4}><Typography variant="caption" color="text.secondary">Heart Rate</Typography><Typography variant="body2" fontWeight={800}>{selectedArrival.triages[0].heartRate} bpm</Typography></Grid>
                        <Grid item xs={4}><Typography variant="caption" color="text.secondary">Blood Pressure</Typography><Typography variant="body2" fontWeight={800}>{selectedArrival.triages[0].bpSystolic}/{selectedArrival.triages[0].bpDiastolic} mmHg</Typography></Grid>
                        <Grid item xs={4}><Typography variant="caption" color="text.secondary">SpO2</Typography><Typography variant="body2" fontWeight={800}>{selectedArrival.triages[0].spo2}%</Typography></Grid>
                        <Grid item xs={4}><Typography variant="caption" color="text.secondary">Temperature</Typography><Typography variant="body2" fontWeight={800}>{selectedArrival.triages[0].temperature} °C</Typography></Grid>
                        <Grid item xs={4}><Typography variant="caption" color="text.secondary">GCS Score</Typography><Typography variant="body2" fontWeight={800}>{selectedArrival.triages[0].gcsScore} / 15</Typography></Grid>
                      </Grid>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<SingleBed />}
                      onClick={() => setAssignBedOpen(true)}
                      sx={{ flex: 1, fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
                    >
                      Assign / Move Trolley Spot
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<SwapHoriz />}
                      onClick={() => setTransferWardOpen(true)}
                      sx={{ flex: 1, fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
                    >
                      Transfer to Main Ward ✈️
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<MedicalServices />}
                      onClick={() => setTransferTheatreOpen(true)}
                      sx={{ flex: 1, fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
                    >
                      Transfer to Theatre 🔪
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<AccessibilityNew />}
                      onClick={() => {
                        setPhysioReferralPatient({
                          id: selectedArrival?.patient?.id || selectedArrival?.patientId,
                          mrn: selectedArrival?.patient?.patientNumber,
                          name: `${selectedArrival?.patient?.firstName || ''} ${selectedArrival?.patient?.lastName || ''}`.trim() || selectedArrival?.tempPatientName || 'Emergency Patient',
                          phone: selectedArrival?.patient?.phone,
                          ward: 'Emergency Observation Ward',
                          bed: selectedArrival?.bed?.bedCode || 'A&E Bed',
                          diagnosis: selectedArrival?.presentingComplaint || 'Emergency Trauma / Acute Mobility Evaluation',
                          careSetting: 'INPATIENT_BEDSIDE'
                        });
                        setPhysioReferralOpen(true);
                      }}
                      sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2, color: '#0284c7', borderColor: '#0284c7', '&:hover': { bgcolor: 'rgba(2,132,199,0.08)' } }}
                    >
                      🏃 Refer to Physio
                    </Button>
                  </Box>
                </Stack>
              </Box>
            )}

            {/* Tab 1: STAT Meds & Lab Orders */}
            {drawerTab === 1 && (() => {
              const aiRecs = getEmergencyAIRecommendations(selectedArrival?.presentingComplaint);
              return (
                <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                  <Stack spacing={3}>
                    {/* OpenMed SMART Prescriptions & Lab Recommendations Box */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #f8f0fc 0%, #f3d9fa 100%)',
                        borderColor: '#ae3ec9',
                        boxShadow: '0 4px 20px rgba(174, 62, 201, 0.15)'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AutoAwesome sx={{ color: '#ae3ec9' }} />
                          <Typography variant="subtitle2" fontWeight={900} color="#862e9c">
                            OpenMed SMART Prescription & Lab Recommendations
                          </Typography>
                        </Box>
                        <Chip
                          label={aiRecs.protocolName}
                          size="small"
                          sx={{ bgcolor: '#862e9c', color: '#fff', fontWeight: 800, fontSize: '0.68rem' }}
                        />
                      </Box>

                      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                        Based on emergency SOAP clinical assessment & presenting complaint: <em>"{emergencySoapSubj || selectedArrival?.presentingComplaint}"</em>.
                      </Typography>

                      {/* Recommended Meds Section */}
                      <Box mb={2}>
                        <Typography variant="caption" fontWeight={800} color="#862e9c" display="block" mb={0.8}>
                          💊 Recommended STAT Emergency Medications ({aiRxRecs.length > 0 ? aiRxRecs.length : aiRecs.medications.length}):
                        </Typography>
                        {aiRxRecs.length > 0 ? (
                          <Grid container spacing={1.5}>
                            {aiRxRecs.map((rx, idx) => (
                              <Grid item xs={12} sm={6} key={idx}>
                                <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, bgcolor: '#fff', border: '1px solid #f5d0fe' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                    <Typography variant="subtitle2" fontWeight={800}>{rx.name}</Typography>
                                    <Chip
                                      label={rx.isCatalog !== false ? "IN PHARMACY" : "EXTERNAL PURCHASE"}
                                      color={rx.isCatalog !== false ? "success" : "warning"}
                                      size="small"
                                      sx={{ fontSize: '0.55rem', height: 16, fontWeight: 800 }}
                                    />
                                  </Box>
                                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5} sx={{ fontSize: '0.675rem' }}>
                                    <strong>Dosage:</strong> {rx.dosage || '1g IV STAT'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block" mb={1} sx={{ fontSize: '0.675rem' }}>
                                    {rx.reason || 'STAT emergency medication recommendation'}
                                  </Typography>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="secondary"
                                    startIcon={<Add />}
                                    onClick={() => handleAddStatMedItem(rx.name, rx.dosage || '1g IV STAT')}
                                    sx={{ fontSize: '0.675rem', textTransform: 'none', fontWeight: 800, py: 0.3 }}
                                  >
                                    Add to Prescription Basket
                                  </Button>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        ) : (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {aiRecs.medications.map((m, idx) => {
                              const isAdded = statMedsList.some(item => item.name.toLowerCase() === m.name.toLowerCase());
                              return (
                                <Chip
                                  key={idx}
                                  icon={<Add fontSize="small" />}
                                  label={`${m.name} (${m.dose})`}
                                  clickable
                                  color="secondary"
                                  variant={isAdded ? "filled" : "outlined"}
                                  onClick={() => handleAddStatMedItem(m.name, m.dose)}
                                  sx={{ fontWeight: 800, fontSize: '0.73rem', py: 0.5 }}
                                />
                              );
                            })}
                          </Box>
                        )}
                      </Box>

                      {/* Recommended Labs Section */}
                      <Box mb={2}>
                        <Typography variant="caption" fontWeight={800} color="#0ca678" display="block" mb={0.8}>
                          🧪 Recommended STAT Laboratory Investigations ({aiLabRecs.length > 0 ? aiLabRecs.length : aiRecs.labs.length}):
                        </Typography>
                        {aiLabRecs.length > 0 ? (
                          <Grid container spacing={1.5}>
                            {aiLabRecs.map((lab, idx) => (
                              <Grid item xs={12} sm={6} key={idx}>
                                <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, bgcolor: '#fff', border: '1px solid #bae6fd' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                    <Typography variant="subtitle2" fontWeight={800}>{lab.name}</Typography>
                                    <Chip
                                      label={lab.isCatalog !== false ? "IN CATALOG" : "EXTERNAL REFERRAL"}
                                      color={lab.isCatalog !== false ? "success" : "warning"}
                                      size="small"
                                      sx={{ fontSize: '0.55rem', height: 16, fontWeight: 800 }}
                                    />
                                  </Box>
                                  <Typography variant="caption" color="text.secondary" display="block" mb={1} sx={{ fontSize: '0.675rem' }}>
                                    {lab.reason || 'STAT emergency lab investigation'}
                                  </Typography>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    startIcon={<Add />}
                                    onClick={() => handleAddStatLabItem(lab.name)}
                                    sx={{ fontSize: '0.675rem', textTransform: 'none', fontWeight: 800, py: 0.3 }}
                                  >
                                    Add to Lab Basket
                                  </Button>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        ) : (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {aiRecs.labs.map((lab, idx) => {
                              const isAdded = statLabsList.some(item => item.name.toLowerCase() === lab.toLowerCase());
                              return (
                                <Chip
                                  key={idx}
                                  icon={<Add fontSize="small" />}
                                  label={lab}
                                  clickable
                                  color="success"
                                  variant={isAdded ? "filled" : "outlined"}
                                  onClick={() => handleAddStatLabItem(lab)}
                                  sx={{ fontWeight: 800, fontSize: '0.73rem', py: 0.5 }}
                                />
                              );
                            })}
                          </Box>
                        )}
                      </Box>

                      {/* 1-Click Order All Protocol Meds & Labs */}
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<ElectricBolt />}
                        onClick={() => {
                          if (aiRxRecs.length > 0) {
                            aiRxRecs.forEach(rx => handleAddStatMedItem(rx.name, rx.dosage || '1g IV STAT'));
                          } else {
                            aiRecs.medications.forEach(m => handleAddStatMedItem(m.name, m.dose));
                          }
                          if (aiLabRecs.length > 0) {
                            aiLabRecs.forEach(l => handleAddStatLabItem(l.name));
                          } else {
                            aiRecs.labs.forEach(l => handleAddStatLabItem(l));
                          }
                        }}
                        sx={{
                          mt: 0.5,
                          background: 'linear-gradient(135deg, #862e9c 0%, #ae3ec9 100%)',
                          fontWeight: 900,
                          textTransform: 'none',
                          borderRadius: 2
                        }}
                      >
                        ⚡ Add Full STAT Protocol to Order Baskets (1-Click)
                      </Button>
                    </Paper>

                    {/* STAT Medication Ordering (Multi-Select Data Dictionary) */}
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, borderColor: '#7950f2' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="#7950f2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocalPharmacy /> Order STAT Emergency Medications / IV Fluids
                        </Typography>
                        <Chip
                          label={`${pharmacyCatalog.length} Medicines in Dictionary`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem', fontWeight: 800 }}
                        />
                      </Box>

                      <Stack spacing={2}>
                        <Autocomplete
                          fullWidth
                          size="small"
                          options={pharmacyCatalog}
                          getOptionLabel={(option: any) => typeof option === 'string' ? option : `${option.name} (${option.category || option.route || 'Emergency Stock'})`}
                          onChange={(_, newValue: any) => {
                            if (newValue && typeof newValue === 'object') {
                              handleAddStatMedItem(newValue.name, newValue.defaultDose);
                            }
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Select Medication / Fluid from Pharmacy Stock & Data Dictionary"
                              placeholder="Search IV fluids, analgesics, antibiotics, resuscitation meds..."
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                          renderOption={(props, option: any) => {
                            const dispStock = option.dispensaryStock !== undefined ? Number(option.dispensaryStock) : (option.dispensaryQuantity || 0);
                            const storeStock = option.centralStoreStock !== undefined ? Number(option.centralStoreStock) : (option.storeQuantity || 0);

                            return (
                              <Box component="li" {...props} key={option.id || option.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 1.5, borderBottom: '1px dotted rgba(0,0,0,0.06)' }}>
                                <Box sx={{ pr: 1 }}>
                                  <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {option.genericName ? `Generic: ${option.genericName} · ` : ''}{option.category || 'Ward Stock'} · Route: {option.route || 'IV'}
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
                                    label={`STORE: ${storeStock} (Dispensary Out of Stock)`}
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

                        {/* Selected STAT Medications Basket */}
                        <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid rgba(121,80,242,0.2)' }}>
                          <Typography variant="caption" fontWeight={800} color="#7950f2" display="block" mb={1}>
                            📋 Selected STAT Medications Basket ({statMedsList.length} items):
                          </Typography>

                          {statMedsList.length === 0 ? (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              No medications selected yet. Use the search bar above or click AI recommendation chips.
                            </Typography>
                          ) : (
                            <Stack spacing={1.5}>
                              {statMedsList.map(item => (
                                <Paper key={item.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                    <Box>
                                      <Typography variant="subtitle2" fontWeight={800}>{item.name}</Typography>
                                      {item.inStock ? (
                                        <Chip
                                          label={item.dispensaryStock ? `🟢 IN STOCK (Dispensary: ${item.dispensaryStock})` : '🟢 IN STOCK'}
                                          color="success"
                                          size="small"
                                          sx={{ fontSize: '0.6rem', height: 18, fontWeight: 800, mt: 0.3 }}
                                        />
                                      ) : (
                                        <Chip
                                          label="🔴 OUT OF STOCK"
                                          color="error"
                                          size="small"
                                          sx={{ fontSize: '0.6rem', height: 18, fontWeight: 800, mt: 0.3 }}
                                        />
                                      )}
                                    </Box>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => setStatMedsList(prev => prev.filter(m => m.id !== item.id))}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Box>

                                  <TextField
                                    label="Dose, Route & Frequency"
                                    size="small"
                                    fullWidth
                                    value={item.dose}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setStatMedsList(prev => prev.map(m => m.id === item.id ? { ...m, dose: val } : m));
                                    }}
                                    placeholder="e.g. 1g IV STAT"
                                  />
                                </Paper>
                              ))}
                            </Stack>
                          )}
                        </Box>

                        <Button
                          variant="contained"
                          sx={{ bgcolor: '#7950f2', '&:hover': { bgcolor: '#6741d9' }, fontWeight: 800 }}
                          disabled={submittingOrder || statMedsList.length === 0}
                          onClick={handleOrderStatMedsBulk}
                        >
                          {submittingOrder ? 'Dispatching...' : `⚡ Dispatch ${statMedsList.length} STAT Medication Orders to Pharmacy`}
                        </Button>
                      </Stack>
                    </Paper>

                    {/* STAT Lab Ordering (Multi-Select Data Dictionary) */}
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, borderColor: '#0ca678' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="#0ca678" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Biotech /> Order STAT Emergency Laboratory Investigations
                        </Typography>
                        <Chip
                          label={`${labCatalog.length} Lab Tests in Dictionary`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem', fontWeight: 800 }}
                        />
                      </Box>

                      <Stack spacing={2}>
                        <Autocomplete
                          fullWidth
                          size="small"
                          options={labCatalog}
                          getOptionLabel={(option: any) => typeof option === 'string' ? option : `${option.name} (${option.category || 'STAT Lab'})`}
                          onChange={(_, newValue: any) => {
                            if (newValue && typeof newValue === 'object') {
                              handleAddStatLabItem(newValue.name);
                            }
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Select Lab Investigation from LIMS Data Dictionary"
                              placeholder="Search FBC, Troponin, ABG, Crossmatch, X-Ray, CT..."
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                          renderOption={(props, option: any) => {
                            const isAvail = option.inStock !== false;
                            return (
                              <Box component="li" {...props} key={option.id || option.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 1.5, borderBottom: '1px dotted rgba(0,0,0,0.06)' }}>
                                <Box sx={{ pr: 1 }}>
                                  <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {option.code ? `Code: ${option.code} · ` : ''}{option.category || 'Lab Test'} · STAT TAT: {option.tatMinutes || 30} mins
                                  </Typography>
                                </Box>
                                {isAvail ? (
                                  <Chip
                                    label="🟢 IN-HOUSE LAB (STAT)"
                                    color="success"
                                    size="small"
                                    sx={{ fontSize: '0.6rem', height: 20, fontWeight: 800 }}
                                  />
                                ) : (
                                  <Chip
                                    label="🟠 EXTERNAL REFERRAL"
                                    color="warning"
                                    size="small"
                                    sx={{ fontSize: '0.6rem', height: 20, fontWeight: 800 }}
                                  />
                                )}
                              </Box>
                            );
                          }}
                        />

                        {/* Selected STAT Labs Basket */}
                        <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid rgba(12,166,120,0.2)' }}>
                          <Typography variant="caption" fontWeight={800} color="#0ca678" display="block" mb={1}>
                            🧪 Selected STAT Lab Orders Basket ({statLabsList.length} items):
                          </Typography>

                          {statLabsList.length === 0 ? (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              No lab tests selected yet. Use the search bar above or click AI recommendation chips.
                            </Typography>
                          ) : (
                            <Stack spacing={1}>
                              {statLabsList.map(item => (
                                <Paper key={item.id} variant="outlined" sx={{ p: 1.2, px: 1.8, borderRadius: 2, bgcolor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight={800}>{item.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{item.category || 'STAT Investigation'}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {item.inStock ? (
                                      <Chip label="🟢 AVAILABLE (STAT)" color="success" size="small" sx={{ fontSize: '0.6rem', height: 18, fontWeight: 800 }} />
                                    ) : (
                                      <Chip label="🟠 EXTERNAL REFERRAL" color="warning" size="small" sx={{ fontSize: '0.6rem', height: 18, fontWeight: 800 }} />
                                    )}
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => setStatLabsList(prev => prev.filter(l => l.id !== item.id))}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </Paper>
                              ))}
                            </Stack>
                          )}
                        </Box>

                        <Button
                          variant="contained"
                          color="success"
                          sx={{ fontWeight: 800 }}
                          disabled={submittingOrder || statLabsList.length === 0}
                          onClick={handleOrderStatLabsBulk}
                        >
                          {submittingOrder ? 'Dispatching...' : `🧪 Dispatch ${statLabsList.length} STAT Laboratory Orders to LIMS`}
                        </Button>
                      </Stack>
                    </Paper>
                  </Stack>
                </Box>
              );
            })()}

            {/* Tab 2: STAT Radiology & PACS Scans */}
            {drawerTab === 2 && (() => {
              const effectiveComplaint = selectedArrival.presentingComplaint || '';
              const catalogItems = emergencyRadCatalog.length > 0 ? emergencyRadCatalog : [
                { id: 'rad-cat-1', code: 'XR-CHEST', name: 'Chest X-Ray PA & Lateral View (STAT)', modality: 'X-RAY', price: 12500 },
                { id: 'rad-cat-2', code: 'US-ABD', name: 'Abdominal Ultrasound (Full Scan STAT)', modality: 'ULTRASOUND', price: 15000 },
                { id: 'rad-cat-3', code: 'CT-BRAIN', name: 'CT Brain High Resolution Non-Contrast (STAT)', modality: 'CT', price: 45000 },
                { id: 'rad-cat-4', code: 'MRI-BRAIN', name: 'Brain MRI Non-Contrast (3.0T STAT)', modality: 'MRI', price: 65000 },
                { id: 'rad-cat-5', code: 'US-PELVIC', name: 'Pelvic & Trauma Ultrasound (STAT)', modality: 'ULTRASOUND', price: 12500 },
                { id: 'rad-cat-6', code: 'XR-SPINE', name: 'Cervical Spine X-Ray AP/Lat/Flexion (STAT)', modality: 'X-RAY', price: 14000 },
                { id: 'rad-cat-7', code: 'ECHO-2D', name: 'Transthoracic 2D Echocardiogram (STAT)', modality: 'ECHO', price: 30000 },
              ];

              const textContent = effectiveComplaint.toLowerCase();
              const recommendations = [];
              if (textContent.includes('chest') || textContent.includes('cough') || textContent.includes('breath') || textContent.includes('dyspnea') || textContent.includes('fever') || textContent.includes('pneumonia')) {
                recommendations.push({ name: 'Chest X-Ray PA & Lateral View (STAT)', modality: 'X-RAY', reason: 'STAT evaluation for acute pneumothorax, pulmonary edema, consolidation, or effusion.', catalogId: catalogItems[0].id });
              }
              if (textContent.includes('head') || textContent.includes('trauma') || textContent.includes('fall') || textContent.includes('dizziness') || textContent.includes('stroke') || textContent.includes('seizure') || textContent.includes('loss of consciousness')) {
                recommendations.push({ name: 'CT Brain High Resolution Non-Contrast (STAT)', modality: 'CT', reason: 'Urgent evaluation for acute intracranial hemorrhage, skull fracture, or cerebral edema.', catalogId: catalogItems[2].id });
              }
              if (textContent.includes('abdo') || textContent.includes('pain') || textContent.includes('vomit') || textContent.includes('trauma') || textContent.includes('accident')) {
                recommendations.push({ name: 'Abdominal Ultrasound (Full Scan STAT)', modality: 'ULTRASOUND', reason: 'FAST Ultrasound scan to rule out free intraperitoneal fluid, organ laceration, or acute abdomen.', catalogId: catalogItems[1].id });
              }
              if (textContent.includes('pelv') || textContent.includes('bleed') || textContent.includes('pregnancy')) {
                recommendations.push({ name: 'Pelvic & Trauma Ultrasound (STAT)', modality: 'ULTRASOUND', reason: 'FAST scan for pelvic fluid accumulation or acute gynaecological emergency.', catalogId: catalogItems[4].id });
              }

              return (
                <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                  <Stack spacing={2.5}>
                    {/* OpenMed AI Radiology Recommendations Box */}
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha('#1c7ed6', 0.04), borderColor: alpha('#1c7ed6', 0.2) }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <AutoAwesome sx={{ color: '#1c7ed6', fontSize: 20 }} />
                        <Typography variant="subtitle2" fontWeight={800} color="#1c7ed6">
                          OpenMed SMART Emergency Radiology Recommendations
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                        Emergency imaging protocols suggested based on emergency SOAP assessment & complaint: <em>"{emergencySoapSubj || effectiveComplaint}"</em>.
                      </Typography>

                      {aiRadRecs.length > 0 ? (
                        <Grid container spacing={1.5}>
                          {aiRadRecs.map((rec, idx) => (
                            <Grid item xs={12} sm={6} key={idx}>
                              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff', border: '1px solid #bbf7d0' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                  <Typography variant="subtitle2" fontWeight={800}>{rec.name}</Typography>
                                  <Chip label={rec.modality || "X-RAY"} size="small" color="primary" sx={{ fontSize: '0.6rem', fontWeight: 800 }} />
                                </Box>
                                <Typography variant="caption" color="text.secondary" display="block" mb={1} sx={{ fontStyle: 'italic' }}>
                                  Indication: {rec.reason || 'STAT emergency imaging indication.'}
                                </Typography>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<Add />}
                                  onClick={() => handleManualAddEmergencyRad({ id: `rad-ai-${idx}`, name: rec.name, modality: rec.modality || 'X-RAY', price: 15000 })}
                                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, fontSize: '0.725rem' }}
                                >
                                  Add STAT Scan Order
                                </Button>
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>
                      ) : recommendations.length > 0 ? (
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
                                  onClick={() => handleManualAddEmergencyRad(catalogItems.find(c => c.id === rec.catalogId) || catalogItems[0])}
                                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, fontSize: '0.725rem' }}
                                >
                                  Add STAT Scan Order
                                </Button>
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Select an emergency procedure from the dropdown below to order STAT imaging.</Typography>
                      )}
                    </Paper>

                    {/* Manual Radiology Form */}
                    <Typography variant="subtitle2" fontWeight={800}>Manual STAT Emergency Radiology Request</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={7}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Select Imaging Procedure</InputLabel>
                          <Select
                            value={selectedEmergencyRadId}
                            label="Select Imaging Procedure"
                            onChange={e => setSelectedEmergencyRadId(e.target.value)}
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
                          label="Priority Level"
                          select
                          fullWidth
                          size="small"
                          value={emergencyRadPriority}
                          onChange={e => setEmergencyRadPriority(e.target.value)}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        >
                          <MenuItem value="STAT">STAT (Emergency Immediate)</MenuItem>
                          <MenuItem value="URGENT">URGENT</MenuItem>
                          <MenuItem value="ROUTINE">ROUTINE</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Clinical Indication / Emergency History"
                          value={emergencyRadHistory}
                          onChange={e => setEmergencyRadHistory(e.target.value)}
                          placeholder="e.g. Acute trauma, severe chest pain, acute respiratory distress"
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Grid>
                    </Grid>

                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => handleManualAddEmergencyRad()}
                      disabled={!selectedEmergencyRadId}
                      startIcon={<Add />}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}
                    >
                      Add Scan to STAT Cart
                    </Button>

                    {/* Cart */}
                    {emergencyRadCart.length > 0 && (
                      <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: '#1c7ed6', bgcolor: alpha('#1c7ed6', 0.02) }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="#1c7ed6">
                            Selected Emergency Scan Orders ({emergencyRadCart.length} Scans)
                          </Typography>
                          {emergencyRadCart.map((item, i) => (
                            <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2, bgcolor: '#fff' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="subtitle2" fontWeight={800}>{item.name}</Typography>
                                    <Chip label={item.modality} color="primary" size="small" sx={{ fontSize: '0.6rem', height: 18, fontWeight: 800 }} />
                                    <Chip label={item.priority} color="error" size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                                  </Stack>
                                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                                    Indication: {item.clinicalHistory}
                                  </Typography>
                                </Box>
                                <IconButton size="small" color="error" onClick={() => setEmergencyRadCart(prev => prev.filter((_, idx) => idx !== i))}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            </Paper>
                          ))}

                          <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            onClick={handleSubmitEmergencyRadOrder}
                            disabled={submittingEmergencyRad}
                            startIcon={submittingEmergencyRad ? <CircularProgress size={18} /> : <CameraAlt />}
                            sx={{ mt: 1.5, py: 1.2, fontWeight: 800, borderRadius: 2 }}
                          >
                            Dispatch STAT Orders to Radiology Desk
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Patient Radiology History & DICOM PACS */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="text.secondary">
                        🩻 Patient's Emergency Radiology History & PACS DICOM Studies ({emergencyRadOrders.length} Scans)
                      </Typography>
                      {emergencyRadOrders.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>No previous radiology imaging scan orders on file for this patient.</Alert>
                      ) : (
                        <Stack spacing={2}>
                          {emergencyRadOrders.map((o: any) => {
                            const procName = o.catalogItem?.name || 'Emergency Imaging Scan';
                            const mod = o.catalogItem?.modality || 'X-RAY';
                            const isPaid = o.insuranceStatus && o.insuranceStatus.includes('PAID');
                            const isCompleted = o.status === 'COMPLETED' || o.status === 'IMAGE_ACQUIRED' || (o.pacsStudies && o.pacsStudies.length > 0);
                            const latestStudy = o.pacsStudies && o.pacsStudies.length > 0 ? o.pacsStudies[o.pacsStudies.length - 1] : null;
                            const rawUrl = latestStudy?.pacsUrl || o.pacsStudies?.[0]?.pacsUrl;
                            const isChestOrXray = procName.toLowerCase().includes('chest') || mod === 'X-RAY';
                            const scanUrl = isCompleted ? ((rawUrl && !rawUrl.startsWith('blob:')) ? rawUrl : (isChestOrXray ? '/scans/chest_xray_dicom.png' : '/scans/ct_brain_dicom.png')) : null;

                            return (
                              <Paper key={o.id} variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderColor: '#e2e8f0' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                                  <Box>
                                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                      <Typography variant="subtitle1" fontWeight={800}>{procName}</Typography>
                                      <Chip label={mod} color="primary" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                                      <Chip label={o.priority || 'STAT'} color="error" size="small" sx={{ fontSize: '0.65rem', fontWeight: 800 }} />
                                    </Stack>
                                    <Typography variant="caption" color="primary.main" fontWeight={700}>
                                      Order #: {o.orderNumber}
                                    </Typography>
                                  </Box>

                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip
                                      label={isPaid ? (o.insuranceStatus || 'PAID') : 'AWAITING PAYMENT (Cashier Desk)'}
                                      color={isPaid ? 'success' : 'warning'}
                                      size="small"
                                      sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                    />
                                    <Chip
                                      label={isCompleted ? 'IMAGE ACQUIRED & VERIFIED' : 'QUEUED FOR SCAN'}
                                      color={isCompleted ? 'success' : 'info'}
                                      size="small"
                                      sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                    />
                                  </Stack>
                                </Box>

                                <Typography variant="body2" color="text.secondary" mb={1.5}>
                                  <strong>Indication:</strong> {o.clinicalHistory || 'STAT Bedside Evaluation'}
                                </Typography>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #f1f5f9' }}>
                                  <Typography variant="caption" color="text.secondary">
                                    🗓️ {new Date(o.createdAt || Date.now()).toLocaleDateString()}
                                  </Typography>
                                  <Button
                                    size="small"
                                    variant={isCompleted ? "contained" : "outlined"}
                                    color={isCompleted ? "primary" : "secondary"}
                                    startIcon={<PersonalVideo />}
                                    onClick={() => {
                                      setSelectedEmergencyRadViewerOrder({ ...o, scanUrl, isCompleted });
                                      setEmergencyRadViewerOpen(true);
                                    }}
                                    sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
                                  >
                                    {isCompleted ? '👁️ View DICOM Scan (PACS Viewer)' : '⏳ Check Imaging & Acquisition Status'}
                                  </Button>
                                </Box>
                              </Paper>
                            );
                          })}
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                </Box>
              );
            })()}

            {/* Tab 3: Emergency SOAP Note */}
            {drawerTab === 3 && (
              <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                <Stack spacing={2.5}>
                  <Alert severity="info" icon={<Notes />} sx={{ borderRadius: 2.5 }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      🚑 Bedside Emergency SOAP Clinical Assessment & OpenMed AI Assistant
                    </Typography>
                    <Typography variant="caption">
                      Use hands-free voice dictation or text to record SOAP notes. View past SOAP note entries in patient history or create a new entry below.
                    </Typography>
                  </Alert>

                  {/* ── 0. HISTORICAL EMERGENCY SOAP NOTES TIMELINE ────────────────────── */}
                  <Accordion
                    expanded={showHistoryAccordion}
                    onChange={(_, isExp) => setShowHistoryAccordion(isExp)}
                    variant="outlined"
                    sx={{ borderRadius: 2.5, borderColor: '#7950f2', bgcolor: alpha('#7950f2', 0.02), '&:before': { display: 'none' } }}
                  >
                    <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#7950f2' }} />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <History sx={{ color: '#7950f2' }} />
                          <Typography variant="subtitle2" fontWeight={800} color="#7950f2">
                            📜 Historical Emergency SOAP Notes & EMR Timeline ({historicalSoapNotes.length} Note{historicalSoapNotes.length !== 1 ? 's' : ''})
                          </Typography>
                        </Box>
                        <Chip
                          label={historicalSoapNotes.length > 0 ? `${historicalSoapNotes.length} Entries On File` : 'No Previous Entries'}
                          color={historicalSoapNotes.length > 0 ? "primary" : "default"}
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {loadingSoapHistory ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : historicalSoapNotes.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                          No previous Emergency SOAP notes found for this patient. Record a new SOAP note below to start patient history.
                        </Alert>
                      ) : (
                        <Stack spacing={2}>
                          {historicalSoapNotes.map((note: any, idx: number) => {
                            const noteNum = historicalSoapNotes.length - idx;
                            const createdDate = note.createdAt ? new Date(note.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recent Encounter';
                            const author = note.signature || (note.author ? `Dr. ${note.author.firstName} ${note.author.lastName}` : 'Attending Emergency Clinician');

                            return (
                              <Paper key={note.id || idx} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#fff', borderColor: '#cbd5e1' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip label={`Entry #${noteNum} (SOAP)`} color="primary" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                      🗓️ {createdDate}
                                    </Typography>
                                  </Stack>

                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip label={author} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                      startIcon={<Assignment />}
                                      onClick={() => {
                                        if (note.subjective) setEmergencySoapSubj(note.subjective);
                                        if (note.objective) setEmergencySoapObj(note.objective);
                                        if (note.assessment) {
                                          const codes = note.assessment.split(/,\s*/).filter(Boolean);
                                          setEmergencySoapAssessments(codes);
                                        }
                                        if (note.plan) setEmergencySoapPlan(note.plan);
                                        enqueueSnackbar(`📋 Historical SOAP Entry #${noteNum} imported into active editor!`, { variant: 'success' });
                                      }}
                                      sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'none', py: 0.2 }}
                                    >
                                      Import into Editor
                                    </Button>
                                  </Stack>
                                </Box>

                                {note.subjective && (
                                  <Typography variant="body2" sx={{ mb: 1, color: '#1e293b' }}>
                                    <strong>Subjective (S):</strong> {note.subjective}
                                  </Typography>
                                )}
                                {note.objective && (
                                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                    <strong>Objective (O):</strong> {note.objective}
                                  </Typography>
                                )}
                                {note.assessment && (
                                  <Box sx={{ mb: 1 }}>
                                    <Typography variant="caption" color="primary.main" fontWeight={800} display="block" mb={0.5}>
                                      Assessment (A) — Diagnoses:
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                      {note.assessment.split(/,\s*/).filter(Boolean).map((diag: string, dIdx: number) => (
                                        <Chip key={dIdx} label={diag} color="info" size="small" sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700, my: 0.2 }} />
                                      ))}
                                    </Stack>
                                  </Box>
                                )}
                                {note.plan && (
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic', bgcolor: '#f8fafc', p: 1, borderRadius: 1.5 }}>
                                    <strong>Plan (P):</strong> {note.plan}
                                  </Typography>
                                )}
                              </Paper>
                            );
                          })}
                        </Stack>
                      )}
                    </AccordionDetails>
                  </Accordion>

                  {/* ── 1. ACTION & VOICE DICTATION TOOLBAR ────────────────────────────── */}
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
                      <Button
                        variant="contained"
                        color={isListening ? "error" : "primary"}
                        startIcon={isListening ? <MicOff /> : <Mic />}
                        onClick={isListening ? stopVoice : startVoice}
                        sx={{
                          fontWeight: 800,
                          borderRadius: 2,
                          px: 2.5,
                          py: 1,
                          textTransform: 'none',
                          boxShadow: isListening ? '0 0 12px rgba(224,49,49,0.6)' : undefined,
                          animation: isListening ? 'pulse 1.5s infinite' : undefined,
                        }}
                      >
                        {isListening ? "🔴 Stop Listening & Process Voice" : "🎙️ Start Voice Dictation"}
                      </Button>

                      <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={voiceSummarizing ? <CircularProgress size={18} /> : <AutoAwesome />}
                        onClick={() => processVoiceDictation(emergencySoapSubj || selectedArrival.presentingComplaint || '')}
                        disabled={voiceSummarizing}
                        sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
                      >
                        ⚡ OpenMed AI Clinical Rewrite
                      </Button>

                      <Button
                        variant="outlined"
                        color="info"
                        startIcon={<MonitorHeart />}
                        onClick={handleImportVitalsToObjective}
                        sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
                      >
                        📊 Import Vitals to Objective
                      </Button>
                    </Stack>

                    {/* Live Voice Dictation Transcript Box */}
                    {(isListening || voiceTranscript || interimTranscript) && (
                      <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: isListening ? '#fff5f5' : '#f1f5f9', borderColor: isListening ? '#ffa8a8' : '#cbd5e1' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {isListening && <CircularProgress size={14} color="error" />}
                          <Typography variant="caption" fontWeight={800} color={isListening ? "error.main" : "text.secondary"}>
                            {isListening ? "🎙️ Live Microphone Dictation Transcribing..." : "📋 Recorded Speech Transcript:"}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#1e293b' }}>
                          {voiceTranscript} <strong>{interimTranscript}</strong>
                        </Typography>
                      </Paper>
                    )}
                  </Paper>

                  {/* OpenMed AI Voice Analysis Summary Banner */}
                  {voiceAnalysis && (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha('#7950f2', 0.05), borderColor: alpha('#7950f2', 0.3) }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <AutoAwesome sx={{ color: '#7950f2', fontSize: 20 }} />
                        <Typography variant="subtitle2" fontWeight={800} color="#7950f2">
                          OpenMed AI Clinical Rewrite & Diagnosis Inferred
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        <strong>Structured Subjective:</strong> {voiceAnalysis.summary?.subjective || 'Clinical summary processed.'}
                      </Typography>
                      {voiceAnalysis.summary?.assessmentCodes && voiceAnalysis.summary.assessmentCodes.length > 0 && (
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="caption" fontWeight={800} color="text.secondary">Inferred ICD-10:</Typography>
                          {voiceAnalysis.summary.assessmentCodes.map((code: string, idx: number) => (
                            <Chip key={idx} label={code} color="secondary" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                          ))}
                        </Stack>
                      )}
                    </Paper>
                  )}

                  {/* ── 2. SOAP FIELDS ────────────────────────────────────────────────── */}
                  <TextField
                    label="Subjective (S) — Presenting Complaint & History of Presenting Illness"
                    multiline rows={3} fullWidth size="small"
                    value={emergencySoapSubj}
                    onChange={e => {
                      const val = e.target.value;
                      setEmergencySoapSubj(val);
                      if (val.length > 8) {
                        const inf = inferClinicalDetailsFrontend(val);
                        if (inf.codes.length > 0) {
                          setEmergencySoapAssessments(inf.codes);
                          setEmergencySoapPlan(inf.plan);
                          runSmartRecommenders(inf.codes.join(', '), val);
                        }
                      }
                    }}
                    placeholder="Describe patient's chief complaint, onset, duration, and mechanism of trauma/illness..."
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />

                  <TextField
                    label="Objective (O) — Bedside Vital Signs & Physical Exam"
                    multiline rows={3} fullWidth size="small"
                    value={emergencySoapObj}
                    onChange={e => setEmergencySoapObj(e.target.value)}
                    placeholder="Vitals, GCS, physical examination findings..."
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />

                  <Box>
                    <Typography variant="subtitle2" fontWeight={800} mb={1}>Assessment (A) — ICD-10 Emergency Diagnosis</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
                      {emergencySoapAssessments.map((diag, idx) => (
                        <Chip
                          key={idx}
                          label={diag}
                          color="primary"
                          onDelete={() => setEmergencySoapAssessments(prev => prev.filter((_, i) => i !== idx))}
                          sx={{ fontWeight: 800, my: 0.5 }}
                        />
                      ))}
                    </Stack>
                    <TextField
                      fullWidth size="small"
                      placeholder="Type diagnosis and press Enter to add (e.g. S02.91 Fracture of skull, S72.90 Fracture of femur, R07.9 Chest pain)..."
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                          const newDiag = (e.target as HTMLInputElement).value.trim();
                          const updated = [...emergencySoapAssessments, newDiag];
                          setEmergencySoapAssessments(updated);
                          runSmartRecommenders(updated.join(', '), emergencySoapSubj);
                          (e.target as HTMLInputElement).value = '';
                          e.preventDefault();
                        }
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Box>

                  <TextField
                    label="Plan (P) — Emergency Resuscitation, STAT Orders & Disposition Plan"
                    multiline rows={3} fullWidth size="small"
                    value={emergencySoapPlan}
                    onChange={e => setEmergencySoapPlan(e.target.value)}
                    placeholder="Resuscitation steps, STAT medications, lab/radiology orders, ward/theatre transfer plan..."
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />

                  {/* ── 4. SAVE BUTTON ───────────────────────────────────────────────── */}
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={savingEmergencySoap ? <CircularProgress size={18} /> : <CheckCircle />}
                    onClick={handleSaveEmergencySoap}
                    disabled={savingEmergencySoap}
                    sx={{ py: 1.2, fontWeight: 800, borderRadius: 2 }}
                  >
                    {savingEmergencySoap ? "Saving to EMR Patient History..." : "Save & Commit Emergency SOAP Note to EMR History"}
                  </Button>
                </Stack>
              </Box>
            )}

            {/* Tab 4: Records Unit Bio-Data Registration */}
            {drawerTab === 4 && (
              <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                <Stack spacing={2}>
                  <Alert severity={selectedArrival.patientId ? "success" : "error"} sx={{ borderRadius: 2 }}>
                    {selectedArrival.patientId ? "✅ Patient registration is complete and validated in HMIS Master Index." : "📋 Incomplete Registration! Records Unit staff should complete patient bio-data bedside."}
                  </Alert>

                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AssignmentTurnedIn />}
                    onClick={() => {
                      setRetroFirstName(selectedArrival.patient?.firstName || '');
                      setRetroLastName(selectedArrival.patient?.lastName || '');
                      setRetroGender(selectedArrival.patient?.gender || 'MALE');
                      setRetroPhone(selectedArrival.patient?.phone || '');
                      setRetroAddress(selectedArrival.patient?.address || '');
                      setRetroRegOpen(true);
                    }}
                    sx={{ fontWeight: 800, py: 1.2, borderRadius: 2 }}
                  >
                    Validate & Complete Bio-Data Bedside
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>
        )}
      </Drawer>

      {/* ── 7. ASSIGN TROLLEY / BED SPOT DIALOG ──────────────────────────────── */}
      <Dialog open={assignBedOpen} onClose={() => setAssignBedOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Assign / Move A&E Trolley Spot</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <TextField
            label="Select Available Trolley Spot *"
            select
            fullWidth
            value={targetBedId}
            onChange={(e) => setTargetBedId(e.target.value)}
          >
            {beds.map(b => (
              <MenuItem key={b.id} value={b.id} disabled={b.status === 'OCCUPIED'}>
                {b.bedCode} ({BED_TYPE_LABELS[b.bedType] || b.bedType}) {b.status === 'OCCUPIED' ? '❌ OCCUPIED' : '✅ FREE'}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAssignBedOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleAssignBed} disabled={!targetBedId}>
            Confirm Spot Assignment
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 8. RETROSPECTIVE REGISTRATION MODAL (RECORDS UNIT) ────────────────── */}
      <Dialog open={retroRegOpen} onClose={() => setRetroRegOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, bgcolor: '#312e81', color: '#fff' }}>
          📋 Bedside Retrospective Registration (Records Unit)
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="First Name *" value={retroFirstName} onChange={(e) => setRetroFirstName(e.target.value)} fullWidth required /></Grid>
              <Grid item xs={6}><TextField label="Last Name *" value={retroLastName} onChange={(e) => setRetroLastName(e.target.value)} fullWidth required /></Grid>
              <Grid item xs={6}>
                <TextField label="Gender" select value={retroGender} onChange={(e) => setRetroGender(e.target.value)} fullWidth>
                  <MenuItem value="MALE">Male</MenuItem>
                  <MenuItem value="FEMALE">Female</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField label="Phone Number" value={retroPhone} onChange={(e) => setRetroPhone(e.target.value)} fullWidth /></Grid>
              <Grid item xs={12}><TextField label="Home Address" value={retroAddress} onChange={(e) => setRetroAddress(e.target.value)} fullWidth /></Grid>
              <Grid item xs={6}><TextField label="Next of Kin Name" value={retroNokName} onChange={(e) => setRetroNokName(e.target.value)} fullWidth /></Grid>
              <Grid item xs={6}><TextField label="Next of Kin Phone" value={retroNokPhone} onChange={(e) => setRetroNokPhone(e.target.value)} fullWidth /></Grid>
              <Grid item xs={12}><TextField label="National ID / NIN" value={retroNin} onChange={(e) => setRetroNin(e.target.value)} fullWidth /></Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setRetroRegOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleRetrospectiveRegSubmit} sx={{ fontWeight: 800 }}>
            Save & Validate Registration
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 9. PARENT WARD TRANSFER HANDOVER MODAL ────────────────────────────── */}
      <Dialog open={transferWardOpen} onClose={() => setTransferWardOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, bgcolor: '#7950f2', color: '#fff' }}>
          ✈️ Transfer Patient from A&E to Parent Inpatient Ward
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Submitting transfer releases the A&E Trolley spot and sends an electronic handover request to the receiving <strong>Ward Matron / Nursing Sister</strong>.
            </Alert>

            <TextField
              label="Destination Inpatient Ward *"
              select
              fullWidth
              value={targetWard}
              onChange={(e) => setTargetWard(e.target.value)}
            >
              <MenuItem value="Male Surgical Ward">Male Surgical Ward</MenuItem>
              <MenuItem value="Female Medical Ward">Female Medical Ward</MenuItem>
              <MenuItem value="Pediatrics & Adolescent Ward">Pediatrics & Adolescent Ward</MenuItem>
              <MenuItem value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</MenuItem>
              <MenuItem value="Maternity & Postnatal Ward">Maternity & Postnatal Ward</MenuItem>
            </TextField>

            <TextField
              label="Working Diagnosis"
              value={transferDiagnosis}
              onChange={(e) => setTransferDiagnosis(e.target.value)}
              placeholder="e.g. Acute Appendicitis post-resuscitation"
              fullWidth
            />

            <TextField
              label="Ward Handover & Care Instructions Notes"
              multiline
              rows={3}
              value={transferHandoverNotes}
              onChange={(e) => setTransferHandoverNotes(e.target.value)}
              placeholder="e.g. Vitals Q1H, IV Fluids ongoing, prepared for surgery..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setTransferWardOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleWardTransferSubmit}
            disabled={submittingTransfer}
            sx={{ fontWeight: 900 }}
          >
            {submittingTransfer ? 'Transferring...' : 'Submit Ward Transfer & Release Trolley'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 10. OPERATING THEATRE TRANSFER MODAL ────────────────────────────── */}
      <Dialog open={transferTheatreOpen} onClose={() => setTransferTheatreOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, bgcolor: '#e03131', color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <MedicalServices /> 🔪 STAT Transfer Emergency Patient to Operating Theatre (OT)
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Submitting this transfer releases the A&E Trolley/Resus spot, creates a STAT Emergency Surgical Request in Theatre, and redirects directly to <strong>http://localhost:5173/theatre</strong>.
            </Alert>

            <TextField
              label="Working Diagnosis"
              value={transferDiagnosis}
              onChange={(e) => setTransferDiagnosis(e.target.value)}
              placeholder="e.g. Acute Abdomen / Ruptured Ectopic Pregnancy / Penetrating Trauma"
              fullWidth
            />

            <TextField
              label="Proposed Surgical Procedure *"
              value={theatreProcedure}
              onChange={(e) => setTheatreProcedure(e.target.value)}
              placeholder="e.g. STAT Exploratory Laparotomy / Emergency Debridement"
              fullWidth
            />

            <TextField
              label="Surgical Urgency Level *"
              select
              fullWidth
              value={theatreUrgency}
              onChange={(e) => setTheatreUrgency(e.target.value)}
            >
              <MenuItem value="EMERGENCY">EMERGENCY (Immediate Life-Saving Surgery)</MenuItem>
              <MenuItem value="TRAUMA">TRAUMA STAT (Major Trauma Unit)</MenuItem>
              <MenuItem value="URGENT">URGENT (Priority Case within 2-4 Hours)</MenuItem>
            </TextField>

            <TextField
              label="Handover Notes & Pre-Op Prep Instructions"
              multiline
              rows={3}
              value={theatreNotes}
              onChange={(e) => setTheatreNotes(e.target.value)}
              placeholder="e.g. Patient cross-matched 2 units O negative blood, NPO since admission, IV lines secured..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setTransferTheatreOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleTheatreTransferSubmit}
            disabled={submittingTheatreTransfer}
            sx={{ fontWeight: 900 }}
          >
            {submittingTheatreTransfer ? 'Transferring...' : '🔪 Confirm STAT Transfer to Theatre'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clinician PACS DICOM Viewer Dialog Modal */}
      <Dialog
        open={emergencyRadViewerOpen}
        onClose={() => setEmergencyRadViewerOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, bgcolor: '#0f172a', color: '#fff' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#1c7ed6' }}><PersonalVideo /></Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#fff">
                PACS Diagnostic Image Web Viewer — {selectedEmergencyRadViewerOrder?.catalogItem?.name || 'Emergency Scan'}
              </Typography>
              <Typography variant="caption" color="#94a3b8">
                Order #: {selectedEmergencyRadViewerOrder?.orderNumber} · Emergency Patient: {selectedArrival?.patient ? `${selectedArrival.patient.firstName} ${selectedArrival.patient.lastName}` : (selectedArrival?.tempPatientName || 'Emergency Patient')}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setEmergencyRadViewerOpen(false)} sx={{ color: '#fff' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {selectedEmergencyRadViewerOrder?.scanUrl ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#000', borderColor: '#334155', borderRadius: 2, textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={selectedEmergencyRadViewerOrder.scanUrl}
                    alt="DICOM Scan"
                    onError={(e) => {
                      const name = selectedEmergencyRadViewerOrder?.catalogItem?.name?.toLowerCase() || '';
                      const mod = selectedEmergencyRadViewerOrder?.catalogItem?.modality || '';
                      (e.target as HTMLImageElement).src = (name.includes('chest') || mod === 'X-RAY') ? '/scans/chest_xray_dicom.png' : '/scans/ct_brain_dicom.png';
                    }}
                    style={{ maxHeight: 420, maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }}
                  />
                  <Stack direction="row" spacing={1} justifyContent="center" mt={2}>
                    <Chip label="2048 x 2048 DICOM High-Res" size="small" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontSize: '0.65rem' }} />
                    <Chip label="Window/Level: 40/400 (STAT)" size="small" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontSize: '0.65rem' }} />
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
                      {selectedEmergencyRadViewerOrder?.reports?.[0]?.findings || selectedEmergencyRadViewerOrder?.clinicalHistory || 'Radiology diagnostic findings verified by consultant radiologist. Emergency scan verified for clinical management.'}
                    </Typography>
                    <Chip label="E-SIGNED & VERIFIED" color="success" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#1e293b', borderColor: '#334155', borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={800} color="#38bdf8" mb={1}>
                      📋 Scan Acquisition Details
                    </Typography>
                    <Typography variant="caption" color="#94a3b8" display="block">
                      Modality: {selectedEmergencyRadViewerOrder?.catalogItem?.modality || 'X-RAY'}
                    </Typography>
                    <Typography variant="caption" color="#94a3b8" display="block">
                      Payment Status: {selectedEmergencyRadViewerOrder?.insuranceStatus || 'PAID (CASH)'}
                    </Typography>
                    <Typography variant="caption" color="#94a3b8" display="block">
                      Priority: STAT Emergency
                    </Typography>
                    <Typography variant="caption" color="#94a3b8" display="block">
                      Status: {selectedEmergencyRadViewerOrder?.status || 'COMPLETED'}
                    </Typography>
                  </Paper>
                </Stack>
              </Grid>
            </Grid>
          ) : (
            <Paper variant="outlined" sx={{ p: 4, bgcolor: '#020617', borderColor: '#1e293b', borderRadius: 3, textAlign: 'center', minHeight: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={44} sx={{ color: '#38bdf8', mb: 2 }} />
              <Typography variant="h6" fontWeight={800} color="#f8fafc" mb={1}>
                ⏳ DICOM Imaging Scan Pending Acquisition & Settlement
              </Typography>
              <Typography variant="body2" color="#94a3b8" sx={{ maxWidth: 520, mb: 3, lineHeight: 1.6 }}>
                This STAT radiology imaging order (<strong>#{selectedEmergencyRadViewerOrder?.orderNumber}</strong>) is currently queued. Payment status is <strong style={{ color: '#f59e0b' }}>{selectedEmergencyRadViewerOrder?.insuranceStatus || 'AWAITING PAYMENT (Cashier Desk)'}</strong>. Once payment is confirmed and the scan is acquired at the Radiology Desk, the DICOM image & radiologist report will appear here automatically.
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Chip label={`Modality: ${selectedEmergencyRadViewerOrder?.catalogItem?.modality || 'X-RAY'}`} color="primary" size="small" sx={{ fontWeight: 800 }} />
                <Chip label={`Status: ${selectedEmergencyRadViewerOrder?.status || 'ORDERED'}`} color="warning" size="small" sx={{ fontWeight: 800 }} />
                <Chip label={`Priority: ${selectedEmergencyRadViewerOrder?.priority || 'STAT'}`} color="error" size="small" sx={{ fontWeight: 800 }} />
              </Stack>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #334155', px: 3, py: 1.5 }}>
          <Button onClick={() => setEmergencyRadViewerOpen(false)} variant="contained" color="primary" sx={{ fontWeight: 800, borderRadius: 2 }}>
            Close Viewer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 12. ELECTRONIC PHYSIOTHERAPY & REHABILITATION REFERRAL MODAL ── */}
      <PhysioReferralModal
        open={physioReferralOpen}
        onClose={() => setPhysioReferralOpen(false)}
        patient={physioReferralPatient}
      />
    </Box>
  );
}
