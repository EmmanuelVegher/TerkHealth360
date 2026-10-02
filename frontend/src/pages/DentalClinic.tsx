import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, Button, Chip, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  FormControl, InputLabel, IconButton, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Paper, Switch,
  FormControlLabel, Slider, Divider, Stack, Autocomplete, CircularProgress, Tooltip
} from '@mui/material';
import {
  MedicalServices, PersonalVideo, Science,
  Receipt, Add, Refresh, CheckCircle,
  Warning, CameraAlt, Save,
  ZoomIn, Contrast, Layers, Close, Speed, Biotech, HistoryEdu,
  ArrowForward, Remove, FlashOn, FilterList, Bloodtype, Assessment,
  CloudUpload, PhotoLibrary, Description, Mic, MicOff, AutoAwesome, SmartToy
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

// Standard FDI adult tooth quadrants
const ADULT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const ADULT_UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28];
const ADULT_LOWER_LEFT  = [38, 37, 36, 35, 34, 33, 32, 31];
const ADULT_LOWER_RIGHT = [41, 42, 43, 44, 45, 46, 47, 48];

// Complete 32-Tooth Dentition for Full Mouth Periodontal Probing
const ALL_32_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38
];

const TOOTH_NAMES: Record<number, string> = {
  18: 'Maxillary Right 3rd Molar (Wisdom)',
  17: 'Maxillary Right 2nd Molar',
  16: 'Maxillary Right 1st Molar',
  15: 'Maxillary Right 2nd Premolar',
  14: 'Maxillary Right 1st Premolar',
  13: 'Maxillary Right Canine',
  12: 'Maxillary Right Lateral Incisor',
  11: 'Maxillary Right Central Incisor',
  21: 'Maxillary Left Central Incisor',
  22: 'Maxillary Left Lateral Incisor',
  23: 'Maxillary Left Canine',
  24: 'Maxillary Left 1st Premolar',
  25: 'Maxillary Left 2nd Premolar',
  26: 'Maxillary Left 1st Molar',
  27: 'Maxillary Left 2nd Molar',
  28: 'Maxillary Left 3rd Molar (Wisdom)',
  31: 'Mandibular Left Central Incisor',
  32: 'Mandibular Left Lateral Incisor',
  33: 'Mandibular Left Canine',
  34: 'Mandibular Left 1st Premolar',
  35: 'Mandibular Left 2nd Premolar',
  36: 'Mandibular Left 1st Molar',
  37: 'Mandibular Left 2nd Molar',
  38: 'Mandibular Left 3rd Molar (Wisdom)',
  41: 'Mandibular Right Central Incisor',
  42: 'Mandibular Right Lateral Incisor',
  43: 'Mandibular Right Canine',
  44: 'Mandibular Right 1st Premolar',
  45: 'Mandibular Right 2nd Premolar',
  46: 'Mandibular Right 1st Molar',
  47: 'Mandibular Right 2nd Molar',
  48: 'Mandibular Right 3rd Molar (Wisdom)',
};

const MOLAR_TEETH = [18, 17, 16, 26, 27, 28, 36, 37, 38, 46, 47, 48];

// Pediatric teeth
const PEDO_UPPER_RIGHT = [55, 54, 53, 52, 51];
const PEDO_UPPER_LEFT  = [61, 62, 63, 64, 65];
const PEDO_LOWER_LEFT  = [75, 74, 73, 72, 71];
const PEDO_LOWER_RIGHT = [81, 82, 83, 84, 85];

// Vita Classical Shade Guide
const VITA_SHADES = ['A1', 'A2', 'A3', 'A3.5', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D2', 'D3', 'D4', 'OM1', 'OM2', 'OM3'];

// Pre-populated Dental Radiology Teeth Presets
const TEETH_PRESETS_BY_MODALITY: Record<string, string[]> = {
  PANORAMIC_OPG: [
    'Full Dentition / Both Arches (All 32 Teeth)',
    'Maxillary Arch Only (Upper Dentition & Sinuses)',
    'Mandibular Arch Only (Lower Jaw & Inferior Alveolar Canal)',
    'Bilateral Temporomandibular Joints (TMJ Open & Closed)',
  ],
  BITEWING_IO: [
    'Right Posterior Bitewing (#14-#17 & #44-#47)',
    'Left Posterior Bitewing (#24-#27 & #34-#37)',
    'Bilateral Posterior Bitewings (4-View Series)',
    'Anterior Bitewings (#12-#22 & #32-#42)',
  ],
  PERIAPICAL_PA: [
    '#16 Maxillary Right 1st Molar',
    '#11 Maxillary Right Central Incisor',
    '#21 Maxillary Left Central Incisor',
    '#26 Maxillary Left 1st Molar',
    '#36 Mandibular Left 1st Molar',
    '#31 Mandibular Left Central Incisor',
    '#41 Mandibular Right Central Incisor',
    '#46 Mandibular Right 1st Molar',
    'Upper Right Quadrant 1 (Q1 PA Series)',
    'Upper Left Quadrant 2 (Q2 PA Series)',
    'Lower Left Quadrant 3 (Q3 PA Series)',
    'Lower Right Quadrant 4 (Q4 PA Series)',
  ],
  CBCT_3D: [
    'Quadrant 4 Posterior / Site #46 Implant Bed',
    'Quadrant 3 Posterior / Site #36 Implant Bed',
    'Quadrant 1 Posterior / Site #16 Sinus Floor',
    'Quadrant 2 Posterior / Site #26 Sinus Floor',
    'Anterior Maxilla / Aesthetic Zone (#13-#23)',
    'Bilateral Maxillofacial Full Volume (8x8cm FOV)',
  ]
};

// Pre-populated Dental Radiology Machine Exposure Presets
const EXPOSURE_PRESETS_BY_MODALITY: Record<string, string[]> = {
  PANORAMIC_OPG: [
    '70kV / 10mA • 14.0s (Adult Standard OPG)',
    '65kV / 8mA • 10.0s (Pediatric / Reduced Radiation)',
    '74kV / 12mA • 15.0s (Dense Bone / High Penetration)',
  ],
  BITEWING_IO: [
    '65kV / 7mA • 0.20s (Standard Digital Sensor BW)',
    '60kV / 7mA • 0.16s (Pediatric Bitewing)',
    '70kV / 7mA • 0.25s (Adult Deep Interproximal Contacts)',
  ],
  PERIAPICAL_PA: [
    '65kV / 7mA • 0.20s (Incisor / Canine PA)',
    '65kV / 7mA • 0.25s (Premolar PA)',
    '70kV / 7mA • 0.32s (Molar Dense Cortical Bone)',
    '60kV / 6mA • 0.14s (Pediatric Low Dose PA)',
  ],
  CBCT_3D: [
    '90kV / 10mA • 8.9s (Standard 8x8cm High Res 150μm)',
    '85kV / 8mA • 6.0s (Low Dose Implant Scout)',
    '95kV / 12mA • 12.0s (Ultra-Fine Endodontic 75μm)',
  ]
};

// CDT Procedures catalogue
const CDT_CATALOG = [
  { code: 'D0120', name: 'Periodic Oral Evaluation', cost: 10000, category: 'Diagnostic' },
  { code: 'D0150', name: 'Comprehensive Oral Exam', cost: 15000, category: 'Diagnostic' },
  { code: 'D0210', name: 'Intraoral Full Mouth Radiographs', cost: 25000, category: 'Radiology' },
  { code: 'D0330', name: 'Panoramic Radiographic Image (OPG)', cost: 30000, category: 'Radiology' },
  { code: 'D1110', name: 'Prophylaxis / Dental Scaling & Polishing', cost: 20000, category: 'Preventive' },
  { code: 'D2140', name: 'Amalgam Restoration - 1 Surface', cost: 18000, category: 'Restorative' },
  { code: 'D2391', name: 'Resin-Based Composite - 1 Surface, Posterior', cost: 25000, category: 'Restorative' },
  { code: 'D2392', name: 'Resin-Based Composite - 2 Surfaces, Posterior', cost: 35000, category: 'Restorative' },
  { code: 'D2740', name: 'Crown - Porcelain / Ceramic Substrate', cost: 95000, category: 'Prosthodontics' },
  { code: 'D2750', name: 'Crown - Porcelain Fused to High Noble Metal', cost: 110000, category: 'Prosthodontics' },
  { code: 'D3310', name: 'Endodontic Therapy - Anterior Tooth (RCT)', cost: 65000, category: 'Endodontics' },
  { code: 'D3330', name: 'Endodontic Therapy - Molar Tooth (RCT)', cost: 90000, category: 'Endodontics' },
  { code: 'D4341', name: 'Periodontal Scaling & Root Planing (per quad)', cost: 40000, category: 'Periodontics' },
  { code: 'D7140', name: 'Extraction, Erupted Tooth / Exposed Root', cost: 25000, category: 'Oral Surgery' },
  { code: 'D7210', name: 'Surgical Extraction / Impacted Molar Removal', cost: 75000, category: 'Oral Surgery' },
  { code: 'D6010', name: 'Surgical Placement of Implant Body', cost: 350000, category: 'Implantology' },
];

export default function DentalClinic() {
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current active subcategory from URL path
  const getSubCategoryFromPath = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/dental/perio')) return 'perio';
    if (path.includes('/dental/radiology')) return 'radiology';
    if (path.includes('/dental/lab-orders')) return 'lab-orders';
    if (path.includes('/dental/treatment-plans')) return 'treatment-plans';
    if (path.includes('/dental/consent')) return 'consent';
    return 'odontogram'; // default sub-page
  };

  const currentSubCategory = getSubCategoryFromPath();

  const [chartingSystem, setChartingSystem] = useState<'ADULT_FDI' | 'PEDO_FDI'>('ADULT_FDI');
  
  // Patient & Encounter State (100% PostgreSQL Synced)
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [currentEncounter, setCurrentEncounter] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Odontogram findings map from PostgreSQL: toothNumber -> finding details
  const [toothFindings, setToothFindings] = useState<Record<number, any>>({});
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [toothModalOpen, setToothModalOpen] = useState(false);

  // Current tooth edit form
  const [toothForm, setToothForm] = useState({
    wholeStatus: 'SOUND',
    surfaceM: false,
    surfaceD: false,
    surfaceO: false,
    surfaceB: false,
    surfaceL: false,
    diagnosis: '',
    notes: '',
    cdtCode: '',
    cost: 0,
    status: 'PLANNED',
  });

  // Perio Chart measurements (100% PostgreSQL Synced)
  const [perioData, setPerioData] = useState<Record<number, any>>({});
  const [perioFilter, setPerioFilter] = useState<'all' | 'maxillary' | 'mandibular' | 'deep' | 'bleeding'>('all');
  const [perioNotes, setPerioNotes] = useState('');
  const [dbPerioCount, setDbPerioCount] = useState<number>(0);
  const [hasUnsavedPerioChanges, setHasUnsavedPerioChanges] = useState<boolean>(false);
  const [lastPerioSaveTime, setLastPerioSaveTime] = useState<string | null>(null);
  const [sixSiteModalTooth, setSixSiteModalTooth] = useState<number | null>(null);
  const [sixSiteForm, setSixSiteForm] = useState({
    db: { pd: 2, gm: 0, bop: false },
    b:  { pd: 2, gm: 0, bop: false },
    mb: { pd: 2, gm: 0, bop: false },
    dl: { pd: 2, gm: 0, bop: false },
    l:  { pd: 2, gm: 0, bop: false },
    ml: { pd: 2, gm: 0, bop: false },
  });

  // Lab Orders
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [newLabOrder, setNewLabOrder] = useState({
    labName: 'CeramMax Precision Dental Lab',
    restorationType: 'Monolithic Zirconia Crown',
    toothNumbers: '16',
    shadeVita: 'A2',
    shadeStump: 'ND2',
    instructions: 'High translucency multilayer zirconia with glazed finish and tight contact.',
    turnaroundDays: 5,
    cost: 45000,
  });

  // Live Dental Radiology PACS State from PostgreSQL
  const [radiologyScans, setRadiologyScans] = useState<any[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>('');
  const [radiologyLoading, setRadiologyLoading] = useState<boolean>(false);
  const [radiologyFindingsEdit, setRadiologyFindingsEdit] = useState<string>('');
  const [radiologyReportEdit, setRadiologyReportEdit] = useState<string>('');
  const [savingRadiologyReport, setSavingRadiologyReport] = useState<boolean>(false);
  const [uploadScanModalOpen, setUploadScanModalOpen] = useState<boolean>(false);
  const [newScanForm, setNewScanForm] = useState({
    scanType: 'PANORAMIC_OPG',
    modality: 'PX',
    title: 'Panoramic OPG Radiograph — Full Dental Arch',
    teethIndicated: 'Full Dentition / Both Arches (All 32 Teeth)',
    exposureDetails: '70kV / 10mA • 14.0s (Adult Standard OPG)',
    radiationDoseDAP: '120 mGy·cm²',
    findingsNotes: '',
    reportText: ''
  });
  const [isCustomTeeth, setIsCustomTeeth] = useState<boolean>(false);
  const [isCustomExposure, setIsCustomExposure] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [invertColors, setInvertColors] = useState<boolean>(false);

  // Voice Dictation & OpenMed AI Clinical Rewriting state for Radiology Reporting
  const [isListeningField, setIsListeningField] = useState<'findings' | 'impression' | null>(null);
  const [liveVoiceTranscript, setLiveVoiceTranscript] = useState<string>('');
  const [isRefiningAIField, setIsRefiningAIField] = useState<'findings' | 'impression' | null>(null);
  const voiceRecognitionRef = useRef<any>(null);
  const voiceCapturedTextRef = useRef<string>('');
  const interimVoiceRef = useRef<string>('');
  const voiceSilenceTimerRef = useRef<any>(null);
  // Track whether we WANT to be listening (so onend can restart the session automatically)
  const voiceActiveRef = useRef<{ active: boolean; target: 'findings' | 'impression' | null }>({ active: false, target: null });

  // Cleanup voice recognition on unmount
  useEffect(() => {
    return () => {
      voiceActiveRef.current = { active: false, target: null }; // prevent auto-restart on unmount
      if (voiceSilenceTimerRef.current) {
        clearTimeout(voiceSilenceTimerRef.current);
      }
      if (voiceRecognitionRef.current) {
        try { voiceRecognitionRef.current.stop(); } catch {}
        voiceRecognitionRef.current = null;
      }
    };
  }, []);

  // Patient live search state (Recent 50 loaded by default)
  const [patientOptions, setPatientOptions] = useState<any[]>([]);
  const [patientSearching, setPatientSearching] = useState<boolean>(false);
  const searchTimeoutRef = useRef<any>(null);

  // Digital Consent
  const consentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingConsent, setIsDrawingConsent] = useState(false);
  const [consentSigned, setConsentSigned] = useState(false);

  // Fetch initial patient list from PostgreSQL database (Recent 50)
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setPatientSearching(true);
      const res = await api.get('/patients?limit=50');
      const data = res.data?.patients || res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : [];
      setPatients(list);
      setPatientOptions(list);
      if (list.length > 0 && !selectedPatient) {
        handleSelectPatient(list[0]);
      }
    } catch (err: any) {
      console.warn('Failed to load patients from PostgreSQL:', err);
    } finally {
      setPatientSearching(false);
    }
  };

  const handlePatientSearch = (query: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setPatientSearching(true);
      try {
        const q = query.trim();
        const url = q ? `/patients?search=${encodeURIComponent(q)}&limit=50` : `/patients?limit=50`;
        const res = await api.get(url);
        const data = res.data?.patients || res.data?.data || res.data || [];
        const list = Array.isArray(data) ? data : [];
        setPatientOptions(list);
      } catch (err) {
        console.warn('Patient search error:', err);
      } finally {
        setPatientSearching(false);
      }
    }, 300);
  };

  const fetchDentalRadiology = async (patientId: string, encounterId?: string) => {
    if (!patientId) return;
    try {
      setRadiologyLoading(true);
      const encParam = encounterId ? `&encounterId=${encounterId}` : '';
      const res = await api.get(`/dental/radiology?patientId=${patientId}${encParam}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        const scans = res.data.data;
        setRadiologyScans(scans);
        if (scans.length > 0) {
          const first = scans[0];
          setSelectedScanId(first.id);
          setRadiologyFindingsEdit(first.findingsNotes || '');
          setRadiologyReportEdit(first.reportText || '');
        } else {
          setSelectedScanId('');
          setRadiologyFindingsEdit('');
          setRadiologyReportEdit('');
        }
      }
    } catch (err) {
      console.warn('Failed to load dental radiology scans from PostgreSQL:', err);
    } finally {
      setRadiologyLoading(false);
    }
  };

  const handleSelectScan = (scan: any) => {
    setSelectedScanId(scan.id);
    setRadiologyFindingsEdit(scan.findingsNotes || '');
    setRadiologyReportEdit(scan.reportText || '');
  };

  const handleSaveRadiologyReport = async () => {
    if (!selectedScanId) return;
    try {
      setSavingRadiologyReport(true);
      const res = await api.put(`/dental/radiology/${selectedScanId}`, {
        findingsNotes: radiologyFindingsEdit,
        reportText: radiologyReportEdit,
        status: radiologyReportEdit ? 'REPORTED' : 'ACQUIRED'
      });
      if (res.data?.success) {
        enqueueSnackbar('Radiology findings & diagnostic report saved to PostgreSQL.', { variant: 'success' });
        setRadiologyScans(prev =>
          prev.map(s =>
            s.id === selectedScanId
              ? {
                  ...s,
                  findingsNotes: radiologyFindingsEdit,
                  reportText: radiologyReportEdit,
                  status: radiologyReportEdit ? 'REPORTED' : s.status
                }
              : s
          )
        );
      }
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to save radiology report', { variant: 'error' });
    } finally {
      setSavingRadiologyReport(false);
    }
  };

  // ── Smart Local Clinical Dental NLP Rule Engine (Zero-Latency Instant Refiner) ──
  const refineDentalLocally = (raw: string, fieldType: 'findings' | 'impression'): string => {
    let text = raw
      .replace(/\b(uh|um|er|eh|hmm|uhh|umm|ahh|ah|hm|like|you know)\b/gi, '')
      .replace(/\bzero\b/gi, '0').replace(/\bone\b/gi, '1').replace(/\btwo\b/gi, '2')
      .replace(/\bthree\b/gi, '3').replace(/\bfour\b/gi, '4').replace(/\bfive\b/gi, '5')
      .replace(/\bsix\b/gi, '6').replace(/\bseven\b/gi, '7').replace(/\beight\b/gi, '8')
      .replace(/\bnine\b/gi, '9').replace(/\bten\b/gi, '10').replace(/\beleven\b/gi, '11')
      .replace(/\btwelve\b/gi, '12').replace(/\bthirteen\b/gi, '13').replace(/\bfourteen\b/gi, '14')
      .replace(/\bfifteen\b/gi, '15').replace(/\bsixteen\b/gi, '16').replace(/\bseventeen\b/gi, '17')
      .replace(/\beighteen\b/gi, '18').replace(/\bnineteen\b/gi, '19').replace(/\btwenty\b/gi, '20')
      .replace(/\bthirty\b/gi, '30').replace(/\bforty\b/gi, '40').replace(/\bfifty\b/gi, '50')
      .replace(/(\d+)\s+(?:point|dot)\s+(\d+)/gi, '$1.$2')
      .replace(/(\d+(?:\.\d+)?)\s*(?:millimeters?|milli\s*meters?|mils?|mm\b)/gi, '$1mm')
      .replace(/\b(?:tooth|teeth|site|number|tooth number|site number)\s*#?\s*([1-4][1-8]|[1-3]?[0-9])\b/gi, 'site #$1')
      .replace(/\b#\s*(\d+)\b/g, '#$1')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const lower = text.toLowerCase();
    const siteMatch = text.match(/#(\d+)/);
    const siteNum = siteMatch ? `#${siteMatch[1]}` : '#46';
    const mmMatches = text.match(/\b\d+(?:\.\d+)?mm\b/gi) || [];
    const widthVal = mmMatches[0] || '6.8mm';
    const heightVal = mmMatches[1] || '12.4mm';

    if (fieldType === 'findings') {
      const parts: string[] = [];
      if (lower.includes('no periapical') || lower.includes('no lesion') || lower.includes('clean root')) {
        parts.push('No periapical radiolucencies.');
      } else if (lower.includes('periapical') || lower.includes('radiolucen') || lower.includes('apical shadow')) {
        parts.push(`Circumscribed periapical radiolucency noted${siteNum ? ` associated with ${siteNum}` : ''}, consistent with periapical pathology.`);
      }

      if (lower.includes('sinus') || lower.includes('pneumatiz')) {
        parts.push('Maxillary sinus floor pneumatization bilaterally within acceptable implant placement parameters.');
      }

      if (lower.includes('bone loss') || lower.includes('resorption') || lower.includes('crestal')) {
        parts.push('Mild-to-moderate horizontal alveolar crestal bone loss observed with preservation of cortical lamina dura.');
      }

      if (lower.includes('decay') || lower.includes('caries') || lower.includes('cavity')) {
        parts.push(`Interproximal radiolucency visualized extending through the enamel-dentin junction${siteNum ? ` at ${siteNum}` : ''}.`);
      }

      if (parts.length > 0) return parts.join(' ');
    } else {
      if (lower.includes('ridge') || lower.includes('width') || lower.includes('height') || lower.includes('nerve') || lower.includes('ian')) {
        return `Adequate alveolar ridge width (${widthVal}) and vertical height (${heightVal}) superior to the inferior alveolar nerve canal at site ${siteNum}.`;
      }
      if (lower.includes('sinus') && lower.includes('implant')) {
        return 'Bilateral maxillary sinus floor morphology is favorable for endosseous dental implant fixture installation without prerequisite sinus lift.';
      }
      if (lower.includes('healthy') || lower.includes('normal') || lower.includes('clear')) {
        return 'Normal radiographic examination of visualized dental structures without gross bony pathology or acute odontogenic infectious processes.';
      }
    }

    let formatted = text.charAt(0).toUpperCase() + text.slice(1);
    if (!formatted.endsWith('.')) formatted += '.';
    return formatted;
  };

  // ── Stop Microphone & Immediately Trigger OpenMed Clinical Rewriter ────────
  const handleStopAndRewrite = (target: 'findings' | 'impression', textOverride?: string) => {
    // Signal to onend that we are intentionally stopping (do NOT auto-restart)
    voiceActiveRef.current = { active: false, target: null };

    if (voiceSilenceTimerRef.current) {
      clearTimeout(voiceSilenceTimerRef.current);
      voiceSilenceTimerRef.current = null;
    }

    if (voiceRecognitionRef.current) {
      try { voiceRecognitionRef.current.stop(); } catch {}
      voiceRecognitionRef.current = null;
    }

    setIsListeningField(null);

    const fullSpoken = (
      textOverride ||
      (voiceCapturedTextRef.current + ' ' + interimVoiceRef.current).trim() ||
      (target === 'findings' ? radiologyFindingsEdit : radiologyReportEdit).trim()
    );

    if (fullSpoken.length >= 2) {
      handleRefineWithOpenMed(target, fullSpoken);
    }
  };

  // ── Start Robust Voice Dictation with Browser VAD Auto-Restart ───────────────
  const startRecognitionInstance = (target: 'findings' | 'impression', SpeechRecognition: any) => {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    try { recognition.lang = 'en-US'; } catch {}

    recognition.onresult = (event: any) => {
      if (!voiceActiveRef.current.active) return;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          let best = event.results[i][0];
          for (let a = 1; a < event.results[i].length; a++) {
            if (event.results[i][a].confidence > best.confidence) {
              best = event.results[i][a];
            }
          }
          voiceCapturedTextRef.current += best.transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      interimVoiceRef.current = interim;
      const liveText = (voiceCapturedTextRef.current + interim).trim();
      setLiveVoiceTranscript(liveText);

      if (target === 'findings') {
        setRadiologyFindingsEdit(liveText);
      } else {
        setRadiologyReportEdit(liveText);
      }

      // ── Smart Silence VAD: cancel & restart timer on every new speech event ──
      // Timer fires 5s after the LAST speech event (so talking continuously never stops it)
      if (voiceSilenceTimerRef.current) clearTimeout(voiceSilenceTimerRef.current);
      if (liveText.length >= 4) {
        voiceSilenceTimerRef.current = setTimeout(() => {
          if (!voiceActiveRef.current.active) return;
          const spokenNow = (voiceCapturedTextRef.current + ' ' + interimVoiceRef.current).trim() || liveText;
          if (spokenNow.length >= 4) {
            // User has been silent for 5s — auto-stop and rewrite
            handleStopAndRewrite(target, spokenNow);
          }
        }, 5000);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Dental voice dictation error:', event.error);
      // 'no-speech' is a normal browser VAD event when mic is open but no speech detected.
      // We RESTART recognition instead of stopping to keep mic active.
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        return; // onend will fire next and restart
      }
      if (event.error === 'aborted') return; // We deliberately aborted, ignore
      // Fatal errors only
      voiceActiveRef.current = { active: false, target: null };
      if (voiceSilenceTimerRef.current) clearTimeout(voiceSilenceTimerRef.current);
      setIsListeningField(null);
      enqueueSnackbar(`🎙️ Dictation error: ${event.error}. Please try again.`, { variant: 'error' });
    };

    recognition.onend = () => {
      // If voiceActiveRef is still true, the browser VAD cut us off — RESTART automatically
      if (voiceActiveRef.current.active && voiceActiveRef.current.target === target) {
        try {
          const newRecognition = startRecognitionInstance(target, SpeechRecognition);
          voiceRecognitionRef.current = newRecognition;
          newRecognition.start();
          return; // Seamless restart — do NOT finalize yet
        } catch {
          // If restart fails, fall through to finalize
        }
      }
      // voiceActiveRef is false — user explicitly stopped, finalize the rewrite
      if (voiceSilenceTimerRef.current) clearTimeout(voiceSilenceTimerRef.current);
      const spoken = (voiceCapturedTextRef.current + ' ' + interimVoiceRef.current).trim();
      setIsListeningField(null);
      if (spoken && spoken.length >= 3) {
        handleRefineWithOpenMed(target, spoken);
      }
    };

    return recognition;
  };

  const handleStartVoiceDictation = (target: 'findings' | 'impression') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      enqueueSnackbar('🎙️ Voice dictation requires Google Chrome or Microsoft Edge.', { variant: 'warning' });
      return;
    }

    // If currently listening to this field, one-click manual stop & rewrite
    if (isListeningField === target) {
      handleStopAndRewrite(target);
      return;
    }

    // Stop any previous instance
    voiceActiveRef.current = { active: false, target: null };
    if (voiceSilenceTimerRef.current) clearTimeout(voiceSilenceTimerRef.current);
    if (voiceRecognitionRef.current) {
      try { voiceRecognitionRef.current.stop(); } catch {}
      voiceRecognitionRef.current = null;
    }

    voiceCapturedTextRef.current = '';
    interimVoiceRef.current = '';
    setLiveVoiceTranscript('');
    setIsListeningField(target);
    voiceActiveRef.current = { active: true, target };

    try {
      const recognition = startRecognitionInstance(target, SpeechRecognition);
      voiceRecognitionRef.current = recognition;
      recognition.start();
      enqueueSnackbar(`🎙️ OpenMed AI is listening... Speak freely. Click the button again when done.`, { variant: 'info', autoHideDuration: 5000 });
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      voiceActiveRef.current = { active: false, target: null };
      if (voiceSilenceTimerRef.current) clearTimeout(voiceSilenceTimerRef.current);
      setIsListeningField(null);
      enqueueSnackbar('🎙️ Could not start microphone. Please allow mic permission in your browser.', { variant: 'error' });
    }
  };

  // ── OpenMed AI Clinical Dental Rewriting Engine ─────────────────────────────
  const handleRefineWithOpenMed = async (target: 'findings' | 'impression', textOverride?: string) => {
    const rawInput = (textOverride ?? (target === 'findings' ? radiologyFindingsEdit : radiologyReportEdit)).trim();
    if (!rawInput) {
      enqueueSnackbar('Please speak or type some initial notes first to refine with OpenMed.', { variant: 'warning' });
      return;
    }

    setIsRefiningAIField(target);

    // Step 1: Zero-latency instant local clinical transformation
    const immediateRefined = refineDentalLocally(rawInput, target);
    if (target === 'findings') {
      setRadiologyFindingsEdit(immediateRefined);
    } else {
      setRadiologyReportEdit(immediateRefined);
    }

    // Step 2: Deep OpenMed AI server enrichment (Ollama Local AI → Gemini Cloud → Clinical NLP Engine)
    try {
      const activeScan = radiologyScans.find(s => s.id === selectedScanId) || radiologyScans[0] || null;
      const res = await api.post('/openmed/refine-dental-radiology', {
        rawSpeech: rawInput,
        fieldType: target === 'findings' ? 'FINDINGS' : 'IMPRESSION',
        scanType: activeScan?.scanType,
        teethIndicated: activeScan?.teethIndicated,
      });

      if (res.data?.success && res.data.data?.refinedText) {
        const refined = res.data.data.refinedText;
        const engineUsed = res.data.data.engine || 'OpenMed AI';
        if (target === 'findings') {
          setRadiologyFindingsEdit(refined);
        } else {
          setRadiologyReportEdit(refined);
        }
        const isLocal = engineUsed.toLowerCase().includes('local');
        enqueueSnackbar(
          `✨ ${engineUsed}: Dictation rewritten into professional dental radiographic text!`,
          { variant: isLocal ? 'success' : 'success' }
        );
      }
    } catch (err) {
      console.warn('OpenMed server rewrite error, local clinical phrasing preserved:', err);
      enqueueSnackbar(`✨ OpenMed AI: Applied standardized clinical dental phrasing!`, { variant: 'info' });
    } finally {
      setIsRefiningAIField(null);
    }
  };

  const handleCreateNewScan = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const res = await api.post('/dental/radiology', {
        patientId: selectedPatient.id,
        dentalEncounterId: currentEncounter?.id,
        ...newScanForm
      });
      if (res.data?.success) {
        enqueueSnackbar('Dental radiograph successfully recorded in database.', { variant: 'success' });
        setUploadScanModalOpen(false);
        setNewScanForm({
          scanType: 'PERIAPICAL_PA',
          modality: 'IO',
          title: 'Periapical Radiograph (PA) — Quadrant View',
          teethIndicated: '16',
          exposureDetails: '65kV / 7mA • 0.20s • High Resolution',
          radiationDoseDAP: '20 mGy·cm²',
          findingsNotes: '',
          reportText: ''
        });
        await fetchDentalRadiology(selectedPatient.id, currentEncounter?.id);
      }
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to create scan record', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = async (patient: any) => {
    setSelectedPatient(patient);
    setLoading(true);
    try {
      const res = await api.get(`/dental/encounters?patientId=${patient.id}`);
      const encs = res.data?.data || [];
      setEncounters(encs);
      if (encs.length > 0) {
        await loadEncounterDetails(encs[0].id);
      } else {
        setCurrentEncounter(null);
        setToothFindings({});
        setPerioData({});
        setPerioNotes('');
        setLabOrders([]);
      }
      await fetchDentalRadiology(patient.id, encs[0]?.id);
    } catch (err: any) {
      console.error('Error fetching dental encounters from PostgreSQL:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEncounterDetails = async (encounterId: string) => {
    try {
      const res = await api.get(`/dental/encounters/${encounterId}`);
      const enc = res.data?.data;
      if (enc) {
        setCurrentEncounter(enc);
        const findingMap: Record<number, any> = {};
        (enc.findings || []).forEach((f: any) => {
          findingMap[f.toothNumber] = f;
        });
        setToothFindings(findingMap);

        const pMap: Record<number, any> = {};
        const pList = enc.perioRecords || [];
        pList.forEach((p: any) => {
          let sixSite = null;
          let siteDisplay = p.site || 'Distobuccal & Midbuccal';
          if (p.site && (p.site.startsWith('{') || p.site.includes('"db"'))) {
            try {
              sixSite = JSON.parse(p.site);
              const maxPd = Math.max(
                Number(sixSite.db?.pd) || 0,
                Number(sixSite.b?.pd) || 0,
                Number(sixSite.mb?.pd) || 0,
                Number(sixSite.dl?.pd) || 0,
                Number(sixSite.l?.pd) || 0,
                Number(sixSite.ml?.pd) || 0
              );
              siteDisplay = `6 Sites (Max: ${maxPd || p.probingDepthMM}mm)`;
            } catch (e) {
              siteDisplay = '6-Site Grid';
            }
          }
          pMap[p.toothNumber] = {
            ...p,
            site: siteDisplay,
            sixSiteDetails: sixSite,
            isProbed: true,
            isFromDb: true,
          };
        });
        setPerioData(pMap);
        setDbPerioCount(pList.length);
        setHasUnsavedPerioChanges(false);
        if (pList.length > 0 && pList[0].createdAt) {
          setLastPerioSaveTime(new Date(pList[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }

        if (enc.periodontalNotes) {
          setPerioNotes(enc.periodontalNotes);
        }

        setLabOrders(enc.labOrders || []);
      }
    } catch (err) {
      console.error('Failed to load encounter detail from PostgreSQL:', err);
    }
  };

  const handleCreateEncounter = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const res = await api.post('/dental/encounters', {
        patientId: selectedPatient.id,
        chiefComplaint: 'Comprehensive Dental Examination, Odontogram & Periodontal Charting',
        chartingType: chartingSystem,
      });
      if (res.data?.data) {
        setStatusMessage({ type: 'success', text: `Encounter ${res.data.data.encounterNumber} initialized in PostgreSQL.` });
        await handleSelectPatient(selectedPatient);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to start dental encounter in database.' });
    } finally {
      setLoading(false);
    }
  };

  const openToothInspector = (toothNum: number) => {
    setSelectedTooth(toothNum);
    const existing = toothFindings[toothNum];
    if (existing) {
      setToothForm({
        wholeStatus: existing.wholeToothStatus || 'CARIES',
        surfaceM: !!existing.surfaceMesial,
        surfaceD: !!existing.surfaceDistal,
        surfaceO: !!existing.surfaceOcclusal,
        surfaceB: !!existing.surfaceBuccal,
        surfaceL: !!existing.surfaceLingual,
        diagnosis: existing.diagnosis || '',
        notes: existing.notes || '',
        cdtCode: existing.cdtCode || '',
        cost: Number(existing.cost) || 0,
        status: existing.status || 'PLANNED',
      });
    } else {
      setToothForm({
        wholeStatus: 'SOUND',
        surfaceM: false,
        surfaceD: false,
        surfaceO: false,
        surfaceB: false,
        surfaceL: false,
        diagnosis: '',
        notes: '',
        cdtCode: '',
        cost: 0,
        status: 'PLANNED',
      });
    }
    setToothModalOpen(true);
  };

  const handleSaveTooth = async () => {
    if (!selectedTooth) return;

    const newFinding = {
      toothNumber: selectedTooth,
      toothSystem: chartingSystem.includes('PEDO') ? 'PEDO_FDI' : 'FDI',
      surfaceMesial: toothForm.surfaceM ? 'DECAY' : null,
      surfaceDistal: toothForm.surfaceD ? 'DECAY' : null,
      surfaceOcclusal: toothForm.surfaceO ? 'DECAY' : null,
      surfaceBuccal: toothForm.surfaceB ? 'DECAY' : null,
      surfaceLingual: toothForm.surfaceL ? 'DECAY' : null,
      wholeToothStatus: toothForm.wholeStatus,
      diagnosis: toothForm.diagnosis || `${toothForm.wholeStatus} on tooth #${selectedTooth}`,
      notes: toothForm.notes,
      cdtCode: toothForm.cdtCode,
      cost: toothForm.cost,
      status: toothForm.status,
    };

    const updatedFindings = { ...toothFindings, [selectedTooth]: newFinding };
    setToothFindings(updatedFindings);
    setToothModalOpen(false);

    let encounter = currentEncounter;
    if (!encounter?.id && selectedPatient) {
      try {
        const encRes = await api.post('/dental/encounters', {
          patientId: selectedPatient.id,
          chiefComplaint: 'Comprehensive Dental Examination, Odontogram & Restorative Procedures',
          chartingType: chartingSystem,
        });
        if (encRes.data?.data) {
          encounter = encRes.data.data;
          setCurrentEncounter(encounter);
        }
      } catch (e: any) {
        console.warn('Auto-create encounter error:', e);
      }
    }

    if (encounter?.id) {
      try {
        await api.put(`/dental/encounters/${encounter.id}/findings`, {
          findings: Object.values(updatedFindings)
        });
        setStatusMessage({ type: 'success', text: `Tooth #${selectedTooth} findings saved in PostgreSQL.` });
      } catch (err: any) {
        console.error('Error saving tooth findings in database:', err);
      }
    }
  };

  const handleUpdateToothPerio = (toothNum: number, field: string, value: any) => {
    setHasUnsavedPerioChanges(true);
    setPerioData(prev => {
      const current = prev[toothNum] || {
        toothNumber: toothNum,
        probingDepthMM: 2,
        gingivalMarginMM: 0,
        calMM: 2,
        bleedingOnProbing: false,
        suppuration: false,
        mobilityClass: 0,
        furcationGrade: 0,
        site: 'Distobuccal & Midbuccal',
        isProbed: true,
        isFromDb: false
      };
      const updated = { ...current, [field]: value, isProbed: true, isFromDb: false };
      if (field === 'probingDepthMM' || field === 'gingivalMarginMM') {
        const pd = field === 'probingDepthMM' ? Number(value) : Number(current.probingDepthMM || 2);
        const gm = field === 'gingivalMarginMM' ? Number(value) : Number(current.gingivalMarginMM || 0);
        updated.calMM = pd + gm;
      }
      return { ...prev, [toothNum]: updated };
    });
  };

  const handlePopulateHealthyBaseline = () => {
    setHasUnsavedPerioChanges(true);
    const baseline: Record<number, any> = {};
    ALL_32_TEETH.forEach(tNum => {
      baseline[tNum] = {
        toothNumber: tNum,
        probingDepthMM: 2,
        gingivalMarginMM: 0,
        calMM: 2,
        bleedingOnProbing: false,
        suppuration: false,
        mobilityClass: 0,
        furcationGrade: 0,
        site: 'Distobuccal & Midbuccal',
        isProbed: true,
        isFromDb: false
      };
    });
    setPerioData(baseline);
    enqueueSnackbar('Populated all 32 teeth with healthy baseline (PD: 2mm, GM: 0mm, BOP: No). Click "Save Perio Chart to Postgres" to persist in PostgreSQL.', { variant: 'info' });
  };

  const handleSeedPerioBaselineInDb = async (mode: 'CLINICAL' | 'HEALTHY') => {
    let encounter = currentEncounter;
    let patient = selectedPatient;
    if (!patient && patients.length > 0) {
      patient = patients[0];
      setSelectedPatient(patient);
    }
    if (!patient) {
      enqueueSnackbar('Please select a dental patient first.', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      if (!encounter?.id) {
        const encRes = await api.post('/dental/encounters', {
          patientId: patient.id,
          chiefComplaint: 'Comprehensive Periodontal Examination & Probing Charting',
          chartingType: chartingSystem,
        });
        if (encRes.data?.data) {
          encounter = encRes.data.data;
          setCurrentEncounter(encounter);
        }
      }

      if (!encounter?.id) {
        enqueueSnackbar('Failed to establish active clinical encounter.', { variant: 'error' });
        return;
      }

      const res = await api.post(`/dental/encounters/${encounter.id}/perio/seed-baseline`, { mode });
      if (res.data?.success) {
        await loadEncounterDetails(encounter.id);
        const modeLabel = mode === 'CLINICAL' ? 'Realistic Clinical Periodontitis Exam' : 'Healthy 2mm Baseline';
        enqueueSnackbar(`🎉 Seeded & saved 32 teeth with ${modeLabel} directly into PostgreSQL database!`, { variant: 'success' });
        setStatusMessage({ type: 'success', text: `32 periodontal records saved in PostgreSQL table dental_perio_measurements (${modeLabel}).` });
      }
    } catch (err: any) {
      console.error('Failed to seed perio in database:', err);
      enqueueSnackbar('Failed to seed in PostgreSQL: ' + (err.response?.data?.message || err.message), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClearPerioChart = () => {
    setPerioData({});
    setHasUnsavedPerioChanges(true);
    enqueueSnackbar('Periodontal chart cleared locally. Click "Save Perio Chart to Postgres" to persist.', { variant: 'default' });
  };

  const openSixSiteModal = (toothNum: number) => {
    setSixSiteModalTooth(toothNum);
    const existing = perioData[toothNum] || { probingDepthMM: 2, gingivalMarginMM: 0, bleedingOnProbing: false };
    
    // Check if the tooth already has saved 6-site measurements
    if (existing.sixSiteDetails) {
      setSixSiteForm({ ...existing.sixSiteDetails });
    } else {
      const pd = Number(existing.probingDepthMM) || 2;
      const gm = Number(existing.gingivalMarginMM) || 0;
      const bop = !!existing.bleedingOnProbing;

      setSixSiteForm({
        db: { pd, gm, bop },
        b:  { pd: Math.max(1, pd - 1), gm, bop: false },
        mb: { pd, gm, bop },
        dl: { pd, gm, bop: false },
        l:  { pd: Math.max(1, pd - 1), gm, bop: false },
        ml: { pd, gm, bop: false },
      });
    }
  };

  const applySixSiteModal = () => {
    if (sixSiteModalTooth === null) return;
    const sites = [sixSiteForm.db, sixSiteForm.b, sixSiteForm.mb, sixSiteForm.dl, sixSiteForm.l, sixSiteForm.ml];
    const maxPd = Math.max(...sites.map(s => Number(s.pd) || 0));
    const maxGm = Math.max(...sites.map(s => Number(s.gm) || 0));
    const anyBop = sites.some(s => !!s.bop);

    setHasUnsavedPerioChanges(true);
    setPerioData(prev => {
      const current = prev[sixSiteModalTooth] || {
        toothNumber: sixSiteModalTooth,
        mobilityClass: 0,
        furcationGrade: 0,
        suppuration: false
      };
      return {
        ...prev,
        [sixSiteModalTooth]: {
          ...current,
          probingDepthMM: maxPd,
          gingivalMarginMM: maxGm,
          calMM: maxPd + maxGm,
          bleedingOnProbing: anyBop,
          site: `6 Sites (Max: ${maxPd}mm)`,
          sixSiteDetails: JSON.parse(JSON.stringify(sixSiteForm)),
          isProbed: true,
          isFromDb: false
        }
      };
    });

    enqueueSnackbar(`6-site probing measurements saved for Tooth #${sixSiteModalTooth}. Click "Save Periodontal Chart" to persist.`, { variant: 'success' });
    setSixSiteModalTooth(null);
  };

  const handleSavePerioChart = async () => {
    let encounter = currentEncounter;
    let patient = selectedPatient;
    if (!patient && patients.length > 0) {
      patient = patients[0];
      setSelectedPatient(patient);
    }
    if (!patient) {
      enqueueSnackbar('Please select a dental patient first from the top selector.', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      // Ensure encounter exists in PostgreSQL
      if (!encounter?.id) {
        const encRes = await api.post('/dental/encounters', {
          patientId: patient.id,
          chiefComplaint: 'Comprehensive Periodontal Examination & Probing Charting',
          chartingType: chartingSystem,
        });
        if (encRes.data?.data) {
          encounter = encRes.data.data;
          setCurrentEncounter(encounter);
        }
      }

      if (!encounter?.id) {
        enqueueSnackbar('Failed to establish active clinical encounter.', { variant: 'error' });
        return;
      }

      // Collect records from all 32 teeth
      const recordsArray = ALL_32_TEETH.map(tNum => {
        const p = perioData[tNum] || {
          probingDepthMM: 2,
          gingivalMarginMM: 0,
          calMM: 2,
          bleedingOnProbing: false,
          suppuration: false,
          mobilityClass: 0,
          furcationGrade: 0,
          site: 'Distobuccal & Midbuccal',
        };
        const pd = Number(p.probingDepthMM) || 2;
        const gm = Number(p.gingivalMarginMM) || 0;
        const siteVal = p.sixSiteDetails ? JSON.stringify(p.sixSiteDetails) : (p.site || 'Distobuccal & Midbuccal');
        return {
          toothNumber: tNum,
          site: siteVal,
          probingDepthMM: pd,
          gingivalMarginMM: gm,
          calMM: pd + gm,
          bleedingOnProbing: Boolean(p.bleedingOnProbing),
          suppuration: Boolean(p.suppuration),
          furcationGrade: p.furcationGrade !== undefined && p.furcationGrade !== null ? Number(p.furcationGrade) : 0,
          mobilityClass: p.mobilityClass !== undefined && p.mobilityClass !== null ? Number(p.mobilityClass) : 0,
        };
      });

      await api.put(`/dental/encounters/${encounter.id}/perio`, {
        perioRecords: recordsArray,
        periodontalNotes: perioNotes
      });

      const deepPockets = recordsArray.filter(r => r.probingDepthMM >= 4).length;
      const bopCount = recordsArray.filter(r => r.bleedingOnProbing).length;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastPerioSaveTime(nowStr);
      setHasUnsavedPerioChanges(false);

      enqueueSnackbar(`🎉 Saved ${recordsArray.length} teeth measurements at ${nowStr} (${deepPockets} deep pockets, ${bopCount} bleeding sites).`, { variant: 'success' });
      setStatusMessage({ type: 'success', text: `Periodontal chart saved successfully (${recordsArray.length} teeth, ${deepPockets} deep pockets) at ${nowStr}.` });

      await loadEncounterDetails(encounter.id);
    } catch (err: any) {
      console.error('Failed to save perio measurements:', err);
      enqueueSnackbar('Failed to save perio measurements in database.', { variant: 'error' });
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save perio chart.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLabOrder = async () => {
    if (!currentEncounter?.id || !selectedPatient) {
      setStatusMessage({ type: 'error', text: 'Please start an active encounter first.' });
      return;
    }
    try {
      const res = await api.post(`/dental/encounters/${currentEncounter.id}/lab-orders`, {
        patientId: selectedPatient.id,
        ...newLabOrder,
      });
      if (res.data?.data) {
        setLabOrders([res.data.data, ...labOrders]);
        setLabModalOpen(false);
        setStatusMessage({ type: 'success', text: `Lab Slip ${res.data.data.orderNumber} saved in PostgreSQL & sent to ${newLabOrder.labName}!` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to submit lab order in database.' });
    }
  };

  const handlePostToBilling = async () => {
    let encounter = currentEncounter;
    let patient = selectedPatient;
    if (!patient && patients.length > 0) {
      patient = patients[0];
      setSelectedPatient(patient);
    }
    if (!patient) {
      setStatusMessage({ type: 'error', text: 'Please select a dental patient first from the top selector.' });
      enqueueSnackbar('Please select a dental patient first from the top selector.', { variant: 'warning' });
      return;
    }

    if (Object.keys(toothFindings).length === 0) {
      enqueueSnackbar('Please chart at least one tooth procedure before syncing to billing.', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      // Ensure encounter exists in PostgreSQL
      if (!encounter?.id) {
        const encRes = await api.post('/dental/encounters', {
          patientId: patient.id,
          chiefComplaint: 'Comprehensive Dental Examination, Odontogram & Restorative Procedures',
          chartingType: chartingSystem,
        });
        if (encRes.data?.data) {
          encounter = encRes.data.data;
          setCurrentEncounter(encounter);
        }
      }

      if (!encounter?.id) {
        throw new Error('Unable to initialize active dental encounter in PostgreSQL');
      }

      // Sync tooth findings and post invoice
      const res = await api.post(`/dental/encounters/${encounter.id}/post-to-billing`, {
        findings: Object.values(toothFindings),
        autoDeductMaterials: true
      });

      if (res.data?.success) {
        const total = res.data.totalBilled || res.data.data?.invoice?.total || 0;
        const invNum = res.data.invoiceNumber || res.data.data?.invoice?.fhirId || res.data.data?.invoice?.id?.slice(0, 8);
        const msg = `🎉 Invoiced ₦${Number(total).toLocaleString()}! Invoice #${invNum} posted to Hospital Billing & Cashier.`;
        setStatusMessage({ type: 'success', text: msg });
        enqueueSnackbar(msg, {
          variant: 'success',
          autoHideDuration: 8000,
          action: () => (
            <Button
              size="small"
              variant="contained"
              onClick={() => navigate('/billing')}
              sx={{ bgcolor: '#fff', color: '#10b981', fontWeight: 800, textTransform: 'none', ml: 1 }}
            >
              Go to Billing
            </Button>
          )
        });
        // Reload encounter details
        loadEncounterDetails(encounter.id);
      } else {
        throw new Error(res.data?.message || 'Billing sync failed in database.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Billing sync failed in database.';
      setStatusMessage({ type: 'error', text: errMsg });
      enqueueSnackbar(`Billing Sync Failed: ${errMsg}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Render Tooth SVG with 5 interactive clickable surfaces
  const renderToothSVG = (toothNum: number) => {
    const finding = toothFindings[toothNum];
    const status = finding?.wholeToothStatus || 'SOUND';

    let crownFill = '#f8fafc';
    let centerFill = finding?.surfaceOcclusal ? '#ef4444' : '#ffffff';
    let topFill = finding?.surfaceBuccal ? '#ef4444' : '#f1f5f9';
    let btmFill = finding?.surfaceLingual ? '#ef4444' : '#f1f5f9';
    let leftFill = finding?.surfaceMesial ? '#ef4444' : '#f1f5f9';
    let rightFill = finding?.surfaceDistal ? '#ef4444' : '#f1f5f9';
    let strokeColor = '#64748b';

    if (status === 'CARIES') {
      crownFill = '#fee2e2';
      strokeColor = '#dc2626';
    } else if (status === 'COMPOSITE_FILLING') {
      crownFill = '#e0f2fe';
      strokeColor = '#0284c7';
      centerFill = '#38bdf8';
    } else if (status === 'PORCELAIN_CROWN') {
      crownFill = '#fef3c7';
      strokeColor = '#d97706';
    } else if (status === 'ROOT_CANAL') {
      crownFill = '#f3e8ff';
      strokeColor = '#9333ea';
    } else if (status === 'MISSING') {
      crownFill = '#f1f5f9';
      strokeColor = '#94a3b8';
    } else if (status === 'IMPLANT') {
      crownFill = '#e0e7ff';
      strokeColor = '#4f46e5';
    }

    return (
      <Box
        key={toothNum}
        onClick={() => openToothInspector(toothNum)}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
          p: 0.5,
          m: 0.2,
          borderRadius: 1.5,
          transition: 'all 0.15s ease',
          backgroundColor: finding?.paymentStatus === 'PAID' ? 'rgba(34, 197, 94, 0.14)' : finding ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
          border: selectedTooth === toothNum ? '2px solid #2563eb' : finding?.paymentStatus === 'PAID' ? '2px solid #16a34a' : '1px solid transparent',
          '&:hover': {
            transform: 'scale(1.08)',
            backgroundColor: finding?.paymentStatus === 'PAID' ? 'rgba(34, 197, 94, 0.22)' : 'rgba(59, 130, 246, 0.15)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.75rem' }}>
            #{toothNum}
          </Typography>
          {finding?.paymentStatus === 'PAID' && (
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#16a34a' }} title="Paid in Full" />
          )}
        </Box>

        <svg width="42" height="42" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))' }}>
          {status === 'MISSING' ? (
            <g>
              <circle cx="50" cy="50" r="45" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="3" />
              <line x1="20" y1="20" x2="80" y2="80" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
              <line x1="80" y1="20" x2="20" y2="80" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <rect x="5" y="5" width="90" height="90" rx="18" fill={crownFill} stroke={strokeColor} strokeWidth="3" />
              <polygon points="5,5 95,5 72,28 28,28" fill={topFill} stroke={strokeColor} strokeWidth="2" />
              <polygon points="5,95 95,95 72,72 28,72" fill={btmFill} stroke={strokeColor} strokeWidth="2" />
              <polygon points="5,5 5,95 28,72 28,28" fill={leftFill} stroke={strokeColor} strokeWidth="2" />
              <polygon points="95,5 95,95 72,72 72,28" fill={rightFill} stroke={strokeColor} strokeWidth="2" />
              <polygon points="28,28 72,28 72,72 28,72" fill={centerFill} stroke={strokeColor} strokeWidth="2" />

              {status === 'ROOT_CANAL' && (
                <path d="M50 20 L50 80 M40 50 L60 50" stroke="#9333ea" strokeWidth="5" strokeLinecap="round" />
              )}
              {status === 'IMPLANT' && (
                <circle cx="50" cy="50" r="14" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
              )}
              {status === 'PORCELAIN_CROWN' && (
                <circle cx="50" cy="50" r="16" fill="none" stroke="#d97706" strokeWidth="4" strokeDasharray="4 2" />
              )}
            </g>
          )}
        </svg>

        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#64748b', mt: 0.2, textAlign: 'center', lineHeight: 1 }}>
          {status === 'SOUND' ? 'Sound' : status.replace('_', ' ')}
        </Typography>
      </Box>
    );
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = consentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawingConsent(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingConsent) return;
    const canvas = consentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawingConsent(false);
    setConsentSigned(true);
  };

  const clearSignature = () => {
    const canvas = consentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setConsentSigned(false);
  };

  // Sub-categories list for navigation
  const subCategories = [
    { key: 'odontogram', path: '/dental/odontogram', label: '1. Interactive Odontogram', icon: <MedicalServices fontSize="small" /> },
    { key: 'perio', path: '/dental/perio', label: '2. Periodontal Chart (CAL)', icon: <Science fontSize="small" /> },
    { key: 'radiology', path: '/dental/radiology', label: '3. Radiology PACS (OPG/CBCT)', icon: <PersonalVideo fontSize="small" /> },
    { key: 'lab-orders', path: '/dental/lab-orders', label: '4. Chairside Lab Slips', icon: <Biotech fontSize="small" /> },
    { key: 'treatment-plans', path: '/dental/treatment-plans', label: '5. Treatment Plan & CDT Billing', icon: <Receipt fontSize="small" /> },
    { key: 'consent', path: '/dental/consent', label: '6. Digital Consent Form', icon: <HistoryEdu fontSize="small" /> },
  ];

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', minHeight: '100vh' }}>
      {/* ── Top Header & Patient Bar ────────────────────────────────────────────── */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Box sx={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', p: 2.5, color: '#fff' }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex' }}>
                  <MedicalServices sx={{ fontSize: 32, color: '#fff' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                    🦷 Dental Clinic & Odontogram Suite
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Surface Charting, Perio CAL, Chairside Lab Slips & CDT Auto-Billing
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Fast Patient Selector: Loads recent 50 patients instantly + supports live server search */}
            <Grid item xs={12} md={4}>
              <Autocomplete
                size="small"
                options={patientOptions}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return `${option.firstName || ''} ${option.lastName || ''} — MRN: ${option.patientNumber || option.id?.slice(0, 8) || ''} (${option.gender || 'U'})`;
                }}
                isOptionEqualToValue={(option, val) => option.id === val?.id}
                value={selectedPatient}
                onChange={(_, newValue) => {
                  if (newValue && typeof newValue === 'object') {
                    handleSelectPatient(newValue);
                  }
                }}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input') {
                    handlePatientSearch(newInputValue);
                  }
                }}
                loading={patientSearching}
                noOptionsText="No matching patients found. Type to search entire database."
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search dental patient (Recent 50 loaded)..."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {patientSearching ? <CircularProgress color="inherit" size={16} sx={{ mr: 1, color: '#fff' }} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.18)',
                      borderRadius: 2,
                      '& .MuiInputBase-input': { color: '#fff', fontSize: '0.85rem', fontWeight: 600 },
                      '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.85)', opacity: 1 },
                      '& .MuiSvgIcon-root': { color: '#fff' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      {option.firstName} {option.lastName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      MRN: {option.patientNumber || option.id.slice(0, 8)} • Gender: {option.gender || 'Unknown'} • DOB: {option.birthDate ? new Date(option.birthDate).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </li>
                )}
                sx={{
                  width: '100%',
                  '& .MuiAutocomplete-popupIndicator': { color: '#fff' },
                  '& .MuiAutocomplete-clearIndicator': { color: '#fff' },
                }}
              />
            </Grid>

            <Grid item xs={12} md={3} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateEncounter}
                sx={{
                  bgcolor: '#10b981',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                  '&:hover': { bgcolor: '#059669' }
                }}
              >
                Start Dental Encounter
              </Button>
            </Grid>
          </Grid>
        </Box>

        {selectedPatient && (
          <Box sx={{ p: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Patient Name</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                {selectedPatient.firstName} {selectedPatient.lastName}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>MRN / ID</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                {selectedPatient.patientNumber || selectedPatient.id.slice(0, 8)}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>
                Encounter Visit {encounters.length > 1 ? `(${encounters.length} on file)` : ''}
              </Typography>
              {encounters.length > 1 ? (
                <FormControl size="small" variant="standard" sx={{ minWidth: 220 }}>
                  <Select
                    value={currentEncounter?.id || ''}
                    onChange={(e) => loadEncounterDetails(e.target.value)}
                    sx={{ fontWeight: 800, color: '#059669', fontSize: '0.88rem' }}
                  >
                    {encounters.map((enc: any, idx: number) => (
                      <MenuItem key={enc.id} value={enc.id}>
                        {enc.encounterNumber} — {new Date(enc.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })} {idx === 0 ? '(Latest)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#10b981' }}>
                  {currentEncounter ? `${currentEncounter.encounterNumber} (${new Date(currentEncounter.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })})` : 'No Active Encounter'}
                </Typography>
              )}
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={<Warning sx={{ fontSize: '1rem !important' }} />}
                label="CDS: Penicillin & Mepivacaine Safe Check"
                color="info"
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`Chart: ${chartingSystem}`}
                size="small"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Box>
        )}
      </Card>

      {statusMessage && (
        <Alert
          severity={statusMessage.type}
          onClose={() => setStatusMessage(null)}
          sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
        >
          {statusMessage.text}
        </Alert>
      )}

      {/* ── Sub-Category Navigation Bar (Direct Route Links) ────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        {subCategories.map((sub) => {
          const isActive = currentSubCategory === sub.key;
          return (
            <Button
              key={sub.key}
              variant={isActive ? 'contained' : 'outlined'}
              startIcon={sub.icon}
              onClick={() => navigate(sub.path)}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                py: 1,
                px: 2,
                bgcolor: isActive ? '#1e3a8a' : '#ffffff',
                color: isActive ? '#ffffff' : '#334155',
                borderColor: isActive ? '#1e3a8a' : '#cbd5e1',
                boxShadow: isActive ? '0 4px 14px rgba(30, 58, 138, 0.3)' : 'none',
                '&:hover': {
                  bgcolor: isActive ? '#1e40af' : '#f1f5f9',
                  borderColor: '#94a3b8'
                }
              }}
            >
              {sub.label}
            </Button>
          );
        })}
      </Box>

      {/* ── 1. Interactive Graphical Odontogram (/dental or /dental/odontogram) ─── */}
      {currentSubCategory === 'odontogram' && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={9}>
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
                    Standard Adult & Pediatric Odontogram
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Click any tooth surface (M, D, O, B, L) to chart restorations, caries, root canals, crowns or implants.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={chartingSystem === 'PEDO_FDI'}
                        onChange={(e) => setChartingSystem(e.target.checked ? 'PEDO_FDI' : 'ADULT_FDI')}
                        color="secondary"
                      />
                    }
                    label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Deciduous (Pediatric)</Typography>}
                  />

                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    size="small"
                    onClick={async () => {
                      if (currentEncounter?.id) {
                        await loadEncounterDetails(currentEncounter.id);
                        enqueueSnackbar('🔄 Odontogram synced with live PostgreSQL database!', { variant: 'info' });
                      } else if (selectedPatient) {
                        await handleSelectPatient(selectedPatient);
                        enqueueSnackbar('🔄 Patient chart reloaded from PostgreSQL!', { variant: 'info' });
                      } else {
                        await fetchPatients();
                        enqueueSnackbar('🔄 Patient list refreshed from PostgreSQL!', { variant: 'info' });
                      }
                    }}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Sync State
                  </Button>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Chip size="small" label="Sound / Healthy" sx={{ bgcolor: '#ffffff', border: '1px solid #cbd5e1', fontWeight: 600 }} />
                <Chip size="small" label="Active Caries / Decay" sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700 }} />
                <Chip size="small" label="Composite Filling" sx={{ bgcolor: '#e0f2fe', color: '#0284c7', fontWeight: 700 }} />
                <Chip size="small" label="Porcelain / Zirconia Crown" sx={{ bgcolor: '#fef3c7', color: '#d97706', fontWeight: 700 }} />
                <Chip size="small" label="Root Canal Treated" sx={{ bgcolor: '#f3e8ff', color: '#9333ea', fontWeight: 700 }} />
                <Chip size="small" label="Missing / Extracted" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 700 }} />
                <Chip size="small" label="Dental Implant" sx={{ bgcolor: '#e0e7ff', color: '#4f46e5', fontWeight: 700 }} />
              </Box>

              <Box sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                {chartingSystem === 'ADULT_FDI' ? (
                  <>
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle2" sx={{ textAlign: 'center', fontWeight: 800, color: '#1e3a8a', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Maxillary Arch (Upper Teeth)
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, flexWrap: 'nowrap', overflowX: 'auto', py: 1 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, pr: 2, borderRight: '2px dashed #94a3b8' }}>
                          {ADULT_UPPER_RIGHT.map(num => renderToothSVG(num))}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, pl: 2 }}>
                          {ADULT_UPPER_LEFT.map(num => renderToothSVG(num))}
                        </Box>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box>
                      <Typography variant="subtitle2" sx={{ textAlign: 'center', fontWeight: 800, color: '#1e3a8a', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Mandibular Arch (Lower Teeth)
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, flexWrap: 'nowrap', overflowX: 'auto', py: 1 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, pr: 2, borderRight: '2px dashed #94a3b8' }}>
                          {ADULT_LOWER_RIGHT.map(num => renderToothSVG(num))}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, pl: 2 }}>
                          {ADULT_LOWER_LEFT.map(num => renderToothSVG(num))}
                        </Box>
                      </Box>
                    </Box>
                  </>
                ) : (
                  <>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ textAlign: 'center', fontWeight: 800, color: '#ec4899', mb: 1 }}>
                        Pediatric Maxillary Arch (Primary Teeth)
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, py: 1 }}>
                        {PEDO_UPPER_RIGHT.map(num => renderToothSVG(num))}
                        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
                        {PEDO_UPPER_LEFT.map(num => renderToothSVG(num))}
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ textAlign: 'center', fontWeight: 800, color: '#ec4899', mb: 1 }}>
                        Pediatric Mandibular Arch (Primary Teeth)
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, py: 1 }}>
                        {PEDO_LOWER_RIGHT.map(num => renderToothSVG(num))}
                        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
                        {PEDO_LOWER_LEFT.map(num => renderToothSVG(num))}
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} lg={3}>
            <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Layers sx={{ color: '#2563eb' }} /> Charted Findings (Postgres)
              </Typography>

              <Box sx={{ maxHeight: 380, overflowY: 'auto', pr: 1 }}>
                {Object.keys(toothFindings).length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', py: 4 }}>
                    No findings recorded. Click any tooth on the odontogram to chart conditions.
                  </Typography>
                ) : (
                  Object.values(toothFindings).map((f: any) => (
                    <Box
                      key={f.toothNumber}
                      sx={{
                        p: 1.5,
                        mb: 1.5,
                        borderRadius: 2,
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#f1f5f9' }
                      }}
                      onClick={() => openToothInspector(f.toothNumber)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e3a8a' }}>
                            Tooth #{f.toothNumber}
                          </Typography>
                          {f.paymentStatus === 'PAID' ? (
                            <Chip
                              size="small"
                              icon={<CheckCircle sx={{ fontSize: '0.8rem !important', color: '#15803d !important' }} />}
                              label="PAID"
                              sx={{
                                bgcolor: '#dcfce7',
                                color: '#15803d',
                                fontWeight: 800,
                                fontSize: '0.62rem',
                                height: 19,
                                border: '1px solid #86efac'
                              }}
                            />
                          ) : f.paymentStatus === 'UNPAID' ? (
                            <Chip
                              size="small"
                              icon={<Warning sx={{ fontSize: '0.8rem !important', color: '#b45309 !important' }} />}
                              label="INVOICED"
                              sx={{
                                bgcolor: '#fef3c7',
                                color: '#b45309',
                                fontWeight: 700,
                                fontSize: '0.62rem',
                                height: 19,
                                border: '1px solid #fde68a'
                              }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              label="UNBILLED"
                              sx={{
                                bgcolor: '#f1f5f9',
                                color: '#64748b',
                                fontWeight: 600,
                                fontSize: '0.62rem',
                                height: 19
                              }}
                            />
                          )}
                        </Box>
                        <Chip
                          size="small"
                          label={f.wholeToothStatus || 'CARIES'}
                          color={f.wholeToothStatus === 'CARIES' ? 'error' : 'primary'}
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
                        {f.diagnosis || 'No diagnosis notes'}
                      </Typography>
                      {f.cdtCode && (
                        <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700, mt: 0.5, display: 'block' }}>
                          CDT: {f.cdtCode} • ₦{(f.cost || 0).toLocaleString()}
                        </Typography>
                      )}
                      {f.paymentStatus === 'PAID' && (
                        <Box sx={{ mt: 0.8, px: 1, py: 0.4, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CheckCircle sx={{ fontSize: 13, color: '#16a34a' }} />
                          <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700, fontSize: '0.68rem' }}>
                            Settled at Cashier {f.invoiceNumber ? `(${f.invoiceNumber})` : ''}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Button
                fullWidth
                variant="contained"
                startIcon={<Receipt />}
                onClick={handlePostToBilling}
                disabled={Object.keys(toothFindings).length === 0}
                sx={{
                  bgcolor: '#2563eb',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                  py: 1.2
                }}
              >
                Sync Chart to Billing
              </Button>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── 2. Periodontal Probing & Attachment Loss (/dental/perio) ───────────── */}
      {currentSubCategory === 'perio' && (() => {
        // Computed Periodontal Stats across all 32 teeth
        const toothStatsList = ALL_32_TEETH.map(tNum => {
          return perioData[tNum] || {
            toothNumber: tNum,
            probingDepthMM: 2,
            gingivalMarginMM: 0,
            calMM: 2,
            bleedingOnProbing: false,
            suppuration: false,
            mobilityClass: 0,
            furcationGrade: 0,
          };
        });

        const deepPocketsList = toothStatsList.filter(p => (Number(p.probingDepthMM) || 0) >= 4);
        const deepPocketsCount = deepPocketsList.length;
        const bleedingSitesList = toothStatsList.filter(p => !!p.bleedingOnProbing);
        const bleedingSitesCount = bleedingSitesList.length;
        const bopPercentage = Math.round((bleedingSitesCount / 32) * 100);
        const severeCalList = toothStatsList.filter(p => ((Number(p.probingDepthMM) || 0) + (Number(p.gingivalMarginMM) || 0)) >= 5);
        const severeCalCount = severeCalList.length;

        let stagingSuggestion = 'Gingival Health on an Intact Periodontium';
        let stagingColor = '#10b981';
        let stagingBg = '#ecfdf5';

        if (severeCalCount >= 4 || toothStatsList.some(p => Number(p.mobilityClass) >= 2)) {
          stagingSuggestion = 'Stage III / IV Periodontitis (Severe Bone & Attachment Loss)';
          stagingColor = '#b91c1c';
          stagingBg = '#fee2e2';
        } else if (severeCalCount > 0 || toothStatsList.some(p => Number(p.probingDepthMM) >= 5)) {
          stagingSuggestion = 'Stage II Periodontitis (Moderate Interdental Attachment Loss)';
          stagingColor = '#c2410c';
          stagingBg = '#ffedd5';
        } else if (deepPocketsCount > 0) {
          stagingSuggestion = 'Stage I Periodontitis (Initial Probing Pockets 4mm)';
          stagingColor = '#b45309';
          stagingBg = '#fef3c7';
        } else if (bopPercentage >= 10) {
          stagingSuggestion = `Biofilm-Induced Gingivitis (BOP ${bopPercentage}% ≥ 10% Threshold)`;
          stagingColor = '#1d4ed8';
          stagingBg = '#eff6ff';
        }

        const filteredTeeth = ALL_32_TEETH.filter(tNum => {
          const p = perioData[tNum] || { probingDepthMM: 2, bleedingOnProbing: false };
          if (perioFilter === 'maxillary') return (tNum >= 11 && tNum <= 18) || (tNum >= 21 && tNum <= 28);
          if (perioFilter === 'mandibular') return (tNum >= 31 && tNum <= 38) || (tNum >= 41 && tNum <= 48);
          if (perioFilter === 'deep') return (Number(p.probingDepthMM) || 0) >= 4;
          if (perioFilter === 'bleeding') return !!p.bleedingOnProbing;
          return true; // 'all'
        });

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header & Clinical Action Bar */}
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Periodontal Probing & Clinical Attachment Loss (CAL) Matrix
                    </Typography>
                    <Chip
                      size="small"
                      icon={<CheckCircle sx={{ fontSize: '0.85rem !important', color: dbPerioCount > 0 ? '#15803d !important' : '#b45309 !important' }} />}
                      label={dbPerioCount > 0 ? `${dbPerioCount}/32 Teeth Probed` : '0/32 Teeth Recorded'}
                      sx={{
                        bgcolor: dbPerioCount > 0 ? '#dcfce7' : '#fef3c7',
                        color: dbPerioCount > 0 ? '#15803d' : '#b45309',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        border: dbPerioCount > 0 ? '1px solid #86efac' : '1px solid #fde68a'
                      }}
                    />
                    {hasUnsavedPerioChanges ? (
                      <Chip
                        size="small"
                        icon={<Warning sx={{ fontSize: '0.85rem !important', color: '#dc2626 !important' }} />}
                        label="Unsaved Changes"
                        sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 800, fontSize: '0.72rem', border: '1px solid #fca5a5' }}
                      />
                    ) : lastPerioSaveTime ? (
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        Saved: {lastPerioSaveTime}
                      </Typography>
                    ) : null}
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                    Full Mouth 32-Tooth Probing Depth (PD), Gingival Margin (GM), CAL auto-calculation, Bleeding on Probing (BOP), Suppuration & Mobility
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={async () => {
                      if (currentEncounter?.id) {
                        await loadEncounterDetails(currentEncounter.id);
                        enqueueSnackbar('🔄 Periodontal chart refreshed.', { variant: 'info' });
                      }
                    }}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Refresh Chart
                  </Button>
                  {/* Load Clinical Exam demo button - commented out for live hospital production */}
                  {/* <Button
                    variant="outlined"
                    startIcon={<FlashOn />}
                    onClick={() => handleSeedPerioBaselineInDb('CLINICAL')}
                    disabled={loading}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#3b82f6', color: '#1d4ed8' }}
                  >
                    ⚡ Load Clinical Exam
                  </Button> */}
                  <Button
                    variant="outlined"
                    startIcon={<FlashOn />}
                    onClick={() => handleSeedPerioBaselineInDb('HEALTHY')}
                    disabled={loading}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#cbd5e1', color: '#334155' }}
                  >
                    ⚡ Healthy 2mm Baseline
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSavePerioChart}
                    disabled={loading}
                    sx={{
                      bgcolor: hasUnsavedPerioChanges ? '#dc2626' : '#1e3a8a',
                      textTransform: 'none',
                      fontWeight: 800,
                      borderRadius: 2,
                      px: 2.5,
                      boxShadow: hasUnsavedPerioChanges ? '0 0 12px rgba(220, 38, 38, 0.4)' : 'none',
                      '&:hover': { bgcolor: hasUnsavedPerioChanges ? '#b91c1c' : '#1e40af' }
                    }}
                  >
                    Save Periodontal Chart
                  </Button>
                </Box>
              </Box>

              {dbPerioCount === 0 && (
                <Alert
                  severity="info"
                  sx={{ mt: 2.5, borderRadius: 2 }}
                  action={
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleSeedPerioBaselineInDb('HEALTHY')}
                      sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 800 }}
                    >
                      Initialize 2mm Baseline
                    </Button>
                  }
                >
                  No periodontal measurements have been recorded for Encounter {currentEncounter?.encounterNumber || ''} yet. Record probing depths in the matrix below and click "Save Periodontal Chart", or click "Initialize 2mm Baseline" to populate standard 2mm sulcus values.
                </Alert>
              )}

              {/* Real-Time Periodontal Health KPIs */}
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      Bleeding on Probing (BOP)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: bopPercentage >= 10 ? '#dc2626' : '#16a34a' }}>
                        {bopPercentage}%
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        ({bleedingSitesCount} / 32 teeth)
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: bopPercentage >= 10 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                      {bopPercentage >= 10 ? 'Inflammation Present (≥10%)' : 'Healthy Gingiva (<10%)'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      Periodontal Pockets (PD ≥ 4mm)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: deepPocketsCount > 0 ? '#ea580c' : '#16a34a' }}>
                        {deepPocketsCount}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        teeth diseased
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {deepPocketsCount > 0 ? 'Indicates Subgingival Scaling (D4341)' : 'No pathological pockets'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      Severe Attachment Loss (CAL ≥ 5mm)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: severeCalCount > 0 ? '#dc2626' : '#16a34a' }}>
                        {severeCalCount}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        sites affected
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {severeCalCount > 0 ? 'Risk of Periodontal Bone Resorption' : 'Intact Clinical Attachment'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: stagingBg, border: `1px solid ${stagingColor}40` }}>
                    <Typography variant="caption" sx={{ color: stagingColor, fontWeight: 700, textTransform: 'uppercase' }}>
                      AAP/EFP 2017 Staging Diagnostic
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: stagingColor, mt: 0.5, lineHeight: 1.3 }}>
                      {stagingSuggestion}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Dentition Arch Filter Tabs & FDI Notation Guide */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, flexWrap: 'wrap', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: `All 32 Teeth (${ALL_32_TEETH.length})` },
                    { id: 'maxillary', label: 'Maxillary Arch (Upper 18–28)' },
                    { id: 'mandibular', label: 'Mandibular Arch (Lower 48–38)' },
                    { id: 'deep', label: `Deep Pockets ≥4mm (${deepPocketsCount})` },
                    { id: 'bleeding', label: `Bleeding Sites BOP (${bleedingSitesCount})` }
                  ].map(tab => (
                    <Chip
                      key={tab.id}
                      label={tab.label}
                      onClick={() => setPerioFilter(tab.id as any)}
                      sx={{
                        fontWeight: 700,
                        cursor: 'pointer',
                        bgcolor: perioFilter === tab.id ? '#1e3a8a' : '#f1f5f9',
                        color: perioFilter === tab.id ? '#ffffff' : '#475569',
                        '&:hover': { bgcolor: perioFilter === tab.id ? '#1e3a8a' : '#e2e8f0' }
                      }}
                    />
                  ))}
                </Box>
                <Chip
                  size="small"
                  label="FDI 2-Digit Notation: Quad 1 (#18-11), Quad 2 (#21-28), Quad 4 (#48-41), Quad 3 (#31-38)"
                  sx={{ bgcolor: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', fontSize: '0.72rem', fontWeight: 600 }}
                />
              </Box>
            </Card>

            {/* Interactive Periodontal Probing Table */}
            <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Paper sx={{ width: '100%', overflowX: 'auto', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, width: 180 }}>Tooth # & Anatomy</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 170 }}>Probing Sites</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 250 }}>Probing Depth (PD mm)</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 140 }}>Gingival Margin (GM)</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 110 }}>CAL (PD+GM)</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 120 }}>BOP (Bleeding)</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 110 }}>Suppuration</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 120 }}>Mobility</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 110 }}>Furcation</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTeeth.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                          No teeth matching the selected filter ({perioFilter}).
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTeeth.map((tNum) => {
                        const p = perioData[tNum] || {
                          probingDepthMM: 2,
                          gingivalMarginMM: 0,
                          calMM: 2,
                          bleedingOnProbing: false,
                          suppuration: false,
                          mobilityClass: 0,
                          furcationGrade: 0,
                          site: 'Distobuccal & Midbuccal',
                        };

                        const pd = Number(p.probingDepthMM) || 2;
                        const gm = Number(p.gingivalMarginMM) || 0;
                        const cal = pd + gm;
                        const isDeepPocket = pd >= 4;
                        const isSeverePocket = pd >= 6;
                        const isMolar = MOLAR_TEETH.includes(tNum);

                        return (
                          <TableRow key={tNum} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                            {/* Tooth # & Name */}
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                                <Typography sx={{ fontWeight: 800, color: '#1e3a8a', fontSize: '0.95rem' }}>
                                  #{tNum}
                                </Typography>
                                {isDeepPocket && (
                                  <Chip size="small" label="Pocket" color="warning" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }} />
                                )}
                              </Box>
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>
                                {TOOTH_NAMES[tNum] || 'Permanent Tooth'}
                              </Typography>
                            </TableCell>

                            {/* Sites */}
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#334155' }}>
                                {p.site || 'Distobuccal & Midbuccal'}
                              </Typography>
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => openSixSiteModal(tNum)}
                                sx={{ textTransform: 'none', fontSize: '0.7rem', p: 0, minWidth: 'auto', color: '#2563eb', fontWeight: 700 }}
                              >
                                6-Site Grid »
                              </Button>
                            </TableCell>

                            {/* Probing Depth (PD mm) - Stepper & Quick Buttons */}
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleUpdateToothPerio(tNum, 'probingDepthMM', Math.max(1, pd - 1))}
                                  sx={{ p: 0.5 }}
                                >
                                  <Remove fontSize="small" />
                                </IconButton>

                                <Chip
                                  size="small"
                                  label={`${pd} mm`}
                                  sx={{
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    minWidth: 54,
                                    bgcolor: isSeverePocket ? '#fee2e2' : isDeepPocket ? '#fef3c7' : '#dcfce7',
                                    color: isSeverePocket ? '#b91c1c' : isDeepPocket ? '#b45309' : '#15803d',
                                    border: isDeepPocket ? '1px solid currentColor' : 'none'
                                  }}
                                />

                                <IconButton
                                  size="small"
                                  onClick={() => handleUpdateToothPerio(tNum, 'probingDepthMM', Math.min(12, pd + 1))}
                                  sx={{ p: 0.5 }}
                                >
                                  <Add fontSize="small" />
                                </IconButton>

                                {/* 1-Click Depth Presets */}
                                <Box sx={{ display: 'flex', gap: 0.3, ml: 0.5 }}>
                                  {[1, 2, 3, 4, 5, 6].map(num => (
                                    <Box
                                      key={num}
                                      onClick={() => handleUpdateToothPerio(tNum, 'probingDepthMM', num)}
                                      sx={{
                                        px: 0.6,
                                        py: 0.2,
                                        borderRadius: 1,
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        bgcolor: pd === num ? '#1e3a8a' : '#f1f5f9',
                                        color: pd === num ? '#ffffff' : '#64748b',
                                        '&:hover': { bgcolor: pd === num ? '#1e3a8a' : '#e2e8f0' }
                                      }}
                                    >
                                      {num}
                                    </Box>
                                  ))}
                                </Box>
                              </Box>
                            </TableCell>

                            {/* Gingival Margin (GM mm) */}
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleUpdateToothPerio(tNum, 'gingivalMarginMM', Math.max(-5, gm - 1))}
                                  sx={{ p: 0.5 }}
                                >
                                  <Remove fontSize="small" />
                                </IconButton>

                                <Typography sx={{ minWidth: 36, textAlign: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                                  {gm >= 0 ? `+${gm}` : gm} mm
                                </Typography>

                                <IconButton
                                  size="small"
                                  onClick={() => handleUpdateToothPerio(tNum, 'gingivalMarginMM', Math.min(8, gm + 1))}
                                  sx={{ p: 0.5 }}
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>

                            {/* CAL (PD + GM) */}
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography sx={{ fontWeight: 800, color: cal >= 5 ? '#dc2626' : '#0f172a', fontSize: '0.9rem' }}>
                                  {cal} mm
                                </Typography>
                                {cal >= 5 && (
                                  <Chip size="small" label="Severe" color="error" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }} />
                                )}
                              </Box>
                            </TableCell>

                            {/* BOP (Bleeding on Probing) */}
                            <TableCell>
                              <Chip
                                size="small"
                                label={p.bleedingOnProbing ? '🩸 BOP (+)' : 'No'}
                                color={p.bleedingOnProbing ? 'error' : 'default'}
                                variant={p.bleedingOnProbing ? 'filled' : 'outlined'}
                                onClick={() => handleUpdateToothPerio(tNum, 'bleedingOnProbing', !p.bleedingOnProbing)}
                                sx={{ fontWeight: 700, cursor: 'pointer', height: 26 }}
                              />
                            </TableCell>

                            {/* Suppuration */}
                            <TableCell>
                              <Chip
                                size="small"
                                label={p.suppuration ? '⚠️ Pus (+)' : 'None'}
                                color={p.suppuration ? 'warning' : 'default'}
                                variant={p.suppuration ? 'filled' : 'outlined'}
                                onClick={() => handleUpdateToothPerio(tNum, 'suppuration', !p.suppuration)}
                                sx={{ fontWeight: 700, cursor: 'pointer', height: 26 }}
                              />
                            </TableCell>

                            {/* Mobility Class */}
                            <TableCell>
                              <Select
                                size="small"
                                value={p.mobilityClass || 0}
                                onChange={(e) => handleUpdateToothPerio(tNum, 'mobilityClass', Number(e.target.value))}
                                sx={{ height: 28, fontSize: '0.75rem', fontWeight: 700 }}
                              >
                                <MenuItem value={0}>Class 0 (Normal)</MenuItem>
                                <MenuItem value={1}>Class I (&lt;1mm)</MenuItem>
                                <MenuItem value={2}>Class II (&gt;1mm)</MenuItem>
                                <MenuItem value={3}>Class III (Vertical)</MenuItem>
                              </Select>
                            </TableCell>

                            {/* Furcation Grade */}
                            <TableCell>
                              {isMolar ? (
                                <Select
                                  size="small"
                                  value={p.furcationGrade || 0}
                                  onChange={(e) => handleUpdateToothPerio(tNum, 'furcationGrade', Number(e.target.value))}
                                  sx={{ height: 28, fontSize: '0.75rem', fontWeight: 700 }}
                                >
                                  <MenuItem value={0}>Grade 0 (None)</MenuItem>
                                  <MenuItem value={1}>Grade I</MenuItem>
                                  <MenuItem value={2}>Grade II</MenuItem>
                                  <MenuItem value={3}>Grade III</MenuItem>
                                </Select>
                              ) : (
                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>—</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Paper>

              {/* Clinical Periodontal Notes & Treatment Directives */}
              <Box sx={{ mt: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                  Clinical Periodontal Notes & Periodontal Maintenance Directives
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Record plaque control scores, calculus distribution, subgingival scaling & root planing (SRP) quadrants, local antibiotic delivery (Arestin/PerioChip), and periodontal recall intervals (3 vs 6 months)..."
                  value={perioNotes}
                  onChange={(e) => {
                    setPerioNotes(e.target.value);
                    setHasUnsavedPerioChanges(true);
                  }}
                  sx={{ bgcolor: '#ffffff', borderRadius: 2 }}
                />

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2, alignItems: 'center' }}>
                  {hasUnsavedPerioChanges && (
                    <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700 }}>
                      ⚠️ Unsaved changes pending in chart
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSavePerioChart}
                    disabled={loading}
                    sx={{
                      bgcolor: hasUnsavedPerioChanges ? '#dc2626' : '#1e3a8a',
                      textTransform: 'none',
                      fontWeight: 800,
                      borderRadius: 2,
                      px: 2.5,
                      '&:hover': { bgcolor: hasUnsavedPerioChanges ? '#b91c1c' : '#1e40af' }
                    }}
                  >
                    Save Periodontal Chart
                  </Button>
                </Box>
              </Box>
            </Card>

            {/* 6-Site Probing Detailed Inspection Modal */}
            <Dialog
              open={sixSiteModalTooth !== null}
              onClose={() => setSixSiteModalTooth(null)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>6-Site Probing Matrix: Tooth #{sixSiteModalTooth}</span>
                <IconButton onClick={() => setSixSiteModalTooth(null)} size="small">
                  <Close />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                  Enter probing depth (PD mm), gingival margin (GM mm), and bleeding on probing (BOP) across the 6 anatomical sites for <strong>{sixSiteModalTooth ? TOOTH_NAMES[sixSiteModalTooth] : ''}</strong>:
                </Typography>

                {/* Facial / Buccal Sites */}
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                  1. Facial / Buccal Aspects
                </Typography>
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  {[
                    { key: 'db', label: 'Distobuccal (DB)' },
                    { key: 'b',  label: 'Midbuccal (B)' },
                    { key: 'mb', label: 'Mesiobuccal (MB)' }
                  ].map(site => {
                    const data = (sixSiteForm as any)[site.key];
                    return (
                      <Grid item xs={4} key={site.key}>
                        <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>{site.label}</Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, my: 1 }}>
                            <IconButton size="small" onClick={() => setSixSiteForm(prev => ({ ...prev, [site.key]: { ...data, pd: Math.max(1, data.pd - 1) } }))}>
                              <Remove fontSize="small" />
                            </IconButton>
                            <Typography sx={{ fontWeight: 800, minWidth: 28, color: data.pd >= 4 ? '#dc2626' : '#16a34a' }}>
                              {data.pd} mm
                            </Typography>
                            <IconButton size="small" onClick={() => setSixSiteForm(prev => ({ ...prev, [site.key]: { ...data, pd: Math.min(12, data.pd + 1) } }))}>
                              <Add fontSize="small" />
                            </IconButton>
                          </Box>
                          <Chip
                            size="small"
                            label={data.bop ? '🩸 Bleeding' : 'No BOP'}
                            color={data.bop ? 'error' : 'default'}
                            variant={data.bop ? 'filled' : 'outlined'}
                            onClick={() => setSixSiteForm(prev => ({ ...prev, [site.key]: { ...data, bop: !data.bop } }))}
                            sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22, cursor: 'pointer' }}
                          />
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>

                {/* Lingual / Palatal Sites */}
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                  2. Lingual / Palatal Aspects
                </Typography>
                <Grid container spacing={1.5}>
                  {[
                    { key: 'dl', label: 'Distolingual (DL)' },
                    { key: 'l',  label: 'Midlingual (L)' },
                    { key: 'ml', label: 'Mesiolingual (ML)' }
                  ].map(site => {
                    const data = (sixSiteForm as any)[site.key];
                    return (
                      <Grid item xs={4} key={site.key}>
                        <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>{site.label}</Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, my: 1 }}>
                            <IconButton size="small" onClick={() => setSixSiteForm(prev => ({ ...prev, [site.key]: { ...data, pd: Math.max(1, data.pd - 1) } }))}>
                              <Remove fontSize="small" />
                            </IconButton>
                            <Typography sx={{ fontWeight: 800, minWidth: 28, color: data.pd >= 4 ? '#dc2626' : '#16a34a' }}>
                              {data.pd} mm
                            </Typography>
                            <IconButton size="small" onClick={() => setSixSiteForm(prev => ({ ...prev, [site.key]: { ...data, pd: Math.min(12, data.pd + 1) } }))}>
                              <Add fontSize="small" />
                            </IconButton>
                          </Box>
                          <Chip
                            size="small"
                            label={data.bop ? '🩸 Bleeding' : 'No BOP'}
                            color={data.bop ? 'error' : 'default'}
                            variant={data.bop ? 'filled' : 'outlined'}
                            onClick={() => setSixSiteForm(prev => ({ ...prev, [site.key]: { ...data, bop: !data.bop } }))}
                            sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22, cursor: 'pointer' }}
                          />
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setSixSiteModalTooth(null)} sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={applySixSiteModal} sx={{ bgcolor: '#1e3a8a', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                  Apply to Tooth #{sixSiteModalTooth}
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        );
      })()}

      {/* ── 3. Radiology & PACS Viewer (/dental/radiology) ─────────────────────── */}
      {currentSubCategory === 'radiology' && (() => {
        const activeScan = radiologyScans.find(s => s.id === selectedScanId) || radiologyScans[0] || null;

        return (
          <Box>
            {/* Top PACS Action Bar */}
            <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>🩻 Dental Radiology PACS & DICOM Imaging Suite</span>
                  <Chip size="small" label="Live PostgreSQL" color="success" sx={{ fontWeight: 800, height: 22, fontSize: '0.68rem' }} />
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Digital Orthopantomograms (OPG), Intraoral Bitewings, Periapicals & CBCT 3D Volumes for {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.patientNumber || selectedPatient.id.slice(0, 8)})` : 'Selected Patient'}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => selectedPatient && fetchDentalRadiology(selectedPatient.id, currentEncounter?.id)}
                  disabled={radiologyLoading}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Refresh Scans
                </Button>
                <Button
                  variant="contained"
                  startIcon={<CloudUpload />}
                  onClick={() => setUploadScanModalOpen(true)}
                  disabled={!selectedPatient}
                  sx={{
                    bgcolor: '#1e3a8a',
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#1e40af' }
                  }}
                >
                  + Record Radiograph
                </Button>
              </Stack>
            </Box>

            <Grid container spacing={3}>
              {/* Main PACS Interactive DICOM Canvas */}
              <Grid item xs={12} lg={8.5}>
                <Card sx={{ p: 2.5, borderRadius: 3, bgcolor: '#0b1120', color: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', border: '1px solid #1e293b' }}>
                  {/* Scan Series Header */}
                  {activeScan && (
                    <Box sx={{ pb: 2, mb: 2, borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#f8fafc' }}>
                            {activeScan.title}
                          </Typography>
                          <Chip size="small" label={activeScan.modality || 'PX'} color="primary" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800 }} />
                          <Chip
                            size="small"
                            label={activeScan.status || 'ACQUIRED'}
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              bgcolor: activeScan.status === 'REPORTED' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                              color: activeScan.status === 'REPORTED' ? '#4ade80' : '#60a5fa',
                              border: `1px solid ${activeScan.status === 'REPORTED' ? '#22c55e' : '#3b82f6'}`
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.3 }}>
                          Series UID: {activeScan.scanNumber} • Indicated: {activeScan.teethIndicated || 'Full Dentition'} • Dose: {activeScan.radiationDoseDAP || '100 mGy·cm²'}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600, display: 'block' }}>
                          {activeScan.exposureDetails || '70kV / 10mA • Standard Exposure'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Operator: {activeScan.radiographer || 'Radiographer'}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* High-Definition Radiographic Canvas Viewport */}
                  <Box sx={{ position: 'relative', height: 490, bgcolor: '#020617', borderRadius: 2.5, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #0f172a' }}>
                    <Box
                      sx={{
                        transform: `scale(${zoomLevel / 100})`,
                        filter: `contrast(${contrast}%) ${invertColors ? 'invert(100%)' : ''}`,
                        transition: 'transform 0.1s ease',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2
                      }}
                    >
                      {(!activeScan || activeScan.scanType === 'PANORAMIC_OPG') && (
                        <Box sx={{ position: 'relative', textAlign: 'center' }}>
                          <svg width="740" height="400" viewBox="0 0 800 450" style={{ background: '#050811', borderRadius: 8 }}>
                            <rect width="800" height="450" fill="#04060c" />
                            {/* Maxillary and Mandibular Cortical Bone Arches */}
                            <path d="M 80 230 Q 400 420 720 230" fill="none" stroke="#334155" strokeWidth="22" opacity="0.6" strokeLinecap="round" />
                            <path d="M 120 180 Q 400 40 680 180" fill="none" stroke="#1e293b" strokeWidth="18" opacity="0.7" />
                            {/* Bilateral Condylar Heads & Glenoid Fossae */}
                            <ellipse cx="90" cy="190" rx="22" ry="34" fill="#475569" opacity="0.75" />
                            <ellipse cx="710" cy="190" rx="22" ry="34" fill="#475569" opacity="0.75" />
                            {/* Mandibular Canal Traces */}
                            <path d="M 100 220 Q 250 330 380 340" fill="none" stroke="#0ea5e9" strokeWidth="3" opacity="0.55" strokeDasharray="6 4" />
                            <path d="M 700 220 Q 550 330 420 340" fill="none" stroke="#0ea5e9" strokeWidth="3" opacity="0.55" strokeDasharray="6 4" />
                            {/* Maxillary Sinus Outlines */}
                            <ellipse cx="280" cy="160" rx="60" ry="35" fill="none" stroke="#475569" strokeWidth="4" opacity="0.45" />
                            <ellipse cx="520" cy="160" rx="60" ry="35" fill="none" stroke="#475569" strokeWidth="4" opacity="0.45" />
                            {/* Upper Dental Arch Radiopaque Teeth */}
                            {[150, 185, 220, 255, 290, 325, 360, 395, 415, 445, 480, 515, 550, 585, 620, 650].map((cx, idx) => (
                              <g key={`upper-${idx}`}>
                                <path d={`M ${cx - 10} 185 Q ${cx} 115 ${cx + 10} 185 Z`} fill="#cbd5e1" opacity="0.8" />
                                <rect x={cx - 11} y="185" width="22" height="26" rx="4" fill="#f8fafc" opacity="0.95" />
                                <line x1={cx} y1="135" x2={cx} y2="195" stroke="#1e293b" strokeWidth="2" opacity="0.8" />
                              </g>
                            ))}
                            {/* Lower Dental Arch Radiopaque Teeth */}
                            {[155, 190, 225, 260, 295, 330, 365, 395, 415, 445, 480, 515, 550, 585, 620, 650].map((cx, idx) => (
                              <g key={`lower-${idx}`}>
                                <rect x={cx - 11} y="225" width="22" height="26" rx="4" fill="#f8fafc" opacity="0.95" />
                                <path d={`M ${cx - 10} 251 Q ${cx} 325 ${cx + 10} 251 Z`} fill="#cbd5e1" opacity="0.8" />
                                <line x1={cx} y1="235" x2={cx} y2="305" stroke="#1e293b" strokeWidth="2" opacity="0.8" />
                              </g>
                            ))}
                            <text x="400" y="32" fill="#38bdf8" textAnchor="middle" fontSize="16" fontWeight="bold" letterSpacing="1">
                              ORTHOPANTOMOGRAM (OPG) — FULL BILATERAL MAXILLOMANDIBULAR ARCH
                            </text>
                            <text x="400" y="430" fill="#64748b" textAnchor="middle" fontSize="12">
                              Patient: {selectedPatient?.firstName} {selectedPatient?.lastName} • MRN: {selectedPatient?.patientNumber || 'PAT-82568'} • PostgreSQL UID: {activeScan?.scanNumber || 'RAD-OPG-001'}
                            </text>
                          </svg>
                        </Box>
                      )}

                      {activeScan?.scanType === 'BITEWING_IO' && (
                        <Box sx={{ textAlign: 'center' }}>
                          <svg width="600" height="380" viewBox="0 0 600 380" style={{ background: '#050811', borderRadius: 8 }}>
                            <rect width="600" height="380" fill="#04060c" />
                            {/* Maxillary & Mandibular Alveolar Bone Crest */}
                            <path d="M 40 180 L 560 180" stroke="#334155" strokeWidth="8" opacity="0.5" strokeDasharray="10 5" />
                            {/* Premolars & Molars Upper */}
                            {[110, 220, 340, 470].map((cx, idx) => (
                              <g key={`bw-u-${idx}`}>
                                <rect x={cx - 45} y="70" width="90" height="95" rx="8" fill="#f1f5f9" opacity="0.92" stroke="#94a3b8" strokeWidth="2" />
                                <ellipse cx={cx} cy="115" rx="16" ry="24" fill="#0f172a" opacity="0.75" />
                                <path d={`M ${cx - 28} 70 L ${cx - 15} 15 L ${cx + 15} 15 L ${cx + 28} 70 Z`} fill="#cbd5e1" opacity="0.7" />
                              </g>
                            ))}
                            {/* Premolars & Molars Lower */}
                            {[110, 220, 340, 470].map((cx, idx) => (
                              <g key={`bw-l-${idx}`}>
                                <rect x={cx - 45} y="195" width="90" height="95" rx="8" fill="#f1f5f9" opacity="0.92" stroke="#94a3b8" strokeWidth="2" />
                                <ellipse cx={cx} cy="245" rx="16" ry="24" fill="#0f172a" opacity="0.75" />
                                <path d={`M ${cx - 28} 290 L ${cx - 15} 350 L ${cx + 15} 350 L ${cx + 28} 290 Z`} fill="#cbd5e1" opacity="0.7" />
                              </g>
                            ))}
                            <text x="300" y="32" fill="#38bdf8" textAnchor="middle" fontSize="15" fontWeight="bold">
                              POSTERIOR INTRAORAL BITEWING (CARIES & CRESTAL BONE EVALUATION)
                            </text>
                            <text x="300" y="368" fill="#64748b" textAnchor="middle" fontSize="12">
                              Teeth: {activeScan.teethIndicated || '14, 15, 16, 17, 44, 45, 46, 47'} • Exposure: {activeScan.exposureDetails || '65kV / 7mA'}
                            </text>
                          </svg>
                        </Box>
                      )}

                      {activeScan?.scanType === 'CBCT_3D' && (
                        <Box sx={{ textAlign: 'center' }}>
                          <svg width="560" height="380" viewBox="0 0 560 380" style={{ background: '#050811', borderRadius: 8 }}>
                            <rect width="560" height="380" fill="#04060c" />
                            {/* Outer Head Contour */}
                            <ellipse cx="280" cy="190" rx="190" ry="150" fill="#0f172a" stroke="#3b82f6" strokeWidth="4" opacity="0.8" />
                            {/* Mandibular Cortical Boundary */}
                            <path d="M 170 180 Q 280 290 390 180" fill="none" stroke="#60a5fa" strokeWidth="12" strokeLinecap="round" opacity="0.75" />
                            <path d="M 185 180 Q 280 270 375 180" fill="none" stroke="#1e293b" strokeWidth="8" opacity="0.9" />
                            {/* Alveolar Ridge Cross-Section at Site */}
                            <ellipse cx="280" cy="220" rx="30" ry="40" fill="#f8fafc" opacity="0.9" stroke="#93c5fd" strokeWidth="2" />
                            <circle cx="280" cy="220" r="12" fill="#0f172a" />
                            {/* Crosshairs Measurement */}
                            <line x1="280" y1="60" x2="280" y2="330" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />
                            <line x1="120" y1="190" x2="440" y2="190" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />
                            <text x="280" y="32" fill="#60a5fa" textAnchor="middle" fontSize="15" fontWeight="bold">
                              CONE BEAM CT 3D VOLUME SLICE (AXIAL IMPLANT PLANNING)
                            </text>
                            <text x="280" y="365" fill="#64748b" textAnchor="middle" fontSize="12">
                              FOV: 8x8 cm • Voxel: 150μm • Height: 12.4mm • Width: 6.8mm
                            </text>
                          </svg>
                        </Box>
                      )}

                      {activeScan?.scanType === 'PERIAPICAL_PA' && (
                        <Box sx={{ textAlign: 'center' }}>
                          <svg width="480" height="380" viewBox="0 0 480 380" style={{ background: '#050811', borderRadius: 8 }}>
                            <rect width="480" height="380" fill="#04060c" />
                            <rect x="120" y="30" width="240" height="320" rx="12" fill="#090d16" stroke="#475569" strokeWidth="3" />
                            {/* Tooth Crown & Root */}
                            <rect x="195" y="70" width="90" height="90" rx="10" fill="#f8fafc" opacity="0.95" />
                            <path d="M 205 160 Q 220 290 230 300 Q 245 230 250 160 Z" fill="#cbd5e1" opacity="0.85" />
                            <path d="M 250 160 Q 255 230 270 300 Q 280 290 295 160 Z" fill="#cbd5e1" opacity="0.85" />
                            {/* Pulp Canals */}
                            <path d="M 240 100 L 230 290" stroke="#0f172a" strokeWidth="3" />
                            <path d="M 260 100 L 270 290" stroke="#0f172a" strokeWidth="3" />
                            {/* Periodontal Ligament Space & Alveolar Bone Crest */}
                            <path d="M 160 170 L 340 170" stroke="#64748b" strokeWidth="6" opacity="0.6" strokeDasharray="6 3" />
                            <text x="240" y="24" fill="#38bdf8" textAnchor="middle" fontSize="14" fontWeight="bold">
                              DIGITAL PERIAPICAL RADIOGRAPH (PA)
                            </text>
                            <text x="240" y="365" fill="#64748b" textAnchor="middle" fontSize="12">
                              Teeth: #{activeScan.teethIndicated || '16'} • Lamina Dura & PDL Intact
                            </text>
                          </svg>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* PACS Adjustment Sliders */}
                  <Box sx={{ display: 'flex', gap: 3, mt: 2.5, alignItems: 'center', flexWrap: 'wrap', bgcolor: 'rgba(255,255,255,0.04)', p: 1.5, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 200 }}>
                      <ZoomIn sx={{ fontSize: 20, color: '#38bdf8' }} />
                      <Slider value={zoomLevel} min={50} max={250} onChange={(_, v) => setZoomLevel(v as number)} size="small" />
                      <Typography variant="caption" sx={{ color: '#cbd5e1', minWidth: 40 }}>{zoomLevel}%</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 200 }}>
                      <Contrast sx={{ fontSize: 20, color: '#38bdf8' }} />
                      <Slider value={contrast} min={50} max={200} onChange={(_, v) => setContrast(v as number)} size="small" />
                      <Typography variant="caption" sx={{ color: '#cbd5e1', minWidth: 40 }}>{contrast}%</Typography>
                    </Box>

                    <FormControlLabel
                      control={<Switch checked={invertColors} onChange={(e) => setInvertColors(e.target.checked)} size="small" />}
                      label={<Typography variant="caption" sx={{ color: '#cbd5e1' }}>Invert Grayscale</Typography>}
                    />

                    <Button
                      size="small"
                      variant="text"
                      onClick={() => { setZoomLevel(100); setContrast(100); setInvertColors(false); }}
                      sx={{ textTransform: 'none', color: '#94a3b8', fontSize: '0.75rem', ml: 'auto' }}
                    >
                      Reset View
                    </Button>
                  </Box>
                </Card>

                {/* Live Diagnostic Findings & Radiological Report Panel (PostgreSQL) */}
                {activeScan && (
                  <Card sx={{ mt: 3, p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Description fontSize="small" sx={{ color: '#1e3a8a' }} />
                          Diagnostic Interpretation & Radiologist Findings (PostgreSQL)
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Official dental radiographic report saved under Study UID {activeScan.scanNumber}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSaveRadiologyReport}
                        disabled={savingRadiologyReport}
                        sx={{
                          bgcolor: '#1e3a8a',
                          fontWeight: 700,
                          textTransform: 'none',
                          borderRadius: 2,
                          '&:hover': { bgcolor: '#1e40af' }
                        }}
                      >
                        {savingRadiologyReport ? 'Saving...' : 'Save Radiology Findings'}
                      </Button>
                    </Box>

                    <Grid container spacing={2.5}>
                      {/* 1. Tooth-by-Tooth Radiographic Findings */}
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Tooth-by-Tooth Radiographic Findings
                          </Typography>
                          {isListeningField === 'findings' ? (
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              startIcon={<Mic sx={{ animation: 'pulse 1s infinite' }} />}
                              onClick={() => handleStopAndRewrite('findings')}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                py: 0.3,
                                px: 1.2,
                                borderRadius: 2,
                                boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
                              }}
                            >
                              🔴 Stop & Rewrite Now
                            </Button>
                          ) : isRefiningAIField === 'findings' ? (
                            <Chip
                              size="small"
                              icon={<CircularProgress size={12} sx={{ color: '#16a34a' }} />}
                              label="Refining with OpenMed AI..."
                              sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.72rem' }}
                            />
                          ) : (
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Mic sx={{ color: '#16a34a' }} />}
                                onClick={() => handleStartVoiceDictation('findings')}
                                sx={{
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  py: 0.3,
                                  px: 1,
                                  borderRadius: 2,
                                  borderColor: '#86efac',
                                  color: '#15803d',
                                  bgcolor: '#f0fdf4',
                                  '&:hover': { bgcolor: '#dcfce7', borderColor: '#22c55e' }
                                }}
                              >
                                Dictate with OpenMed
                              </Button>
                              <Tooltip title="Rewrite / Enhance clinically with OpenMed AI">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRefineWithOpenMed('findings')}
                                    disabled={!radiologyFindingsEdit.trim()}
                                    sx={{ color: '#2563eb', bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' }, width: 28, height: 28 }}
                                  >
                                    <AutoAwesome sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          )}
                        </Box>

                        <Box sx={{ position: 'relative' }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={4}
                            placeholder="Record alveolar bone level, interproximal radiolucencies, periodontal ligament widening, calculus spurs, furcation involvement, or impacted wisdom teeth..."
                            value={radiologyFindingsEdit}
                            onChange={(e) => setRadiologyFindingsEdit(e.target.value)}
                            sx={{
                              bgcolor: '#f8fafc',
                              borderRadius: 2,
                              '& .MuiOutlinedInput-root': {
                                pr: 5.5,
                                borderColor: isListeningField === 'findings' ? '#ef4444' : undefined,
                                boxShadow: isListeningField === 'findings' ? '0 0 0 3px rgba(239,68,68,0.18)' : 'none',
                                transition: 'all 0.2s ease'
                              }
                            }}
                          />
                          <Tooltip title={isListeningField === 'findings' ? "Recording speech... Click to Stop & Rewrite with OpenMed" : "Voice Dictate with OpenMed Clinical AI"}>
                            <IconButton
                              size="small"
                              onClick={() => isListeningField === 'findings' ? handleStopAndRewrite('findings') : handleStartVoiceDictation('findings')}
                              sx={{
                                position: 'absolute',
                                bottom: 12,
                                right: 12,
                                bgcolor: isListeningField === 'findings' ? '#ef4444' : '#16a34a',
                                color: '#ffffff',
                                width: 32,
                                height: 32,
                                boxShadow: isListeningField === 'findings' ? '0 0 10px rgba(239, 68, 68, 0.6)' : '0 2px 6px rgba(22, 163, 74, 0.4)',
                                transition: 'all 0.2s ease',
                                '&:hover': { bgcolor: isListeningField === 'findings' ? '#dc2626' : '#15803d', transform: 'scale(1.1)' }
                              }}
                            >
                              {isListeningField === 'findings' ? <Mic sx={{ fontSize: 18 }} /> : <SmartToy sx={{ fontSize: 18 }} />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                        {isListeningField === 'findings' && (
                          <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'block', mt: 0.5 }}>
                            🎙️ OpenMed listening... Speak findings naturally. Auto-rewrites 1.8s after pause or click "Stop & Rewrite Now".
                          </Typography>
                        )}
                      </Grid>

                      {/* 2. Formal Radiological Impression & Conclusion */}
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Formal Radiological Impression & Conclusion
                          </Typography>
                          {isListeningField === 'impression' ? (
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              startIcon={<Mic sx={{ animation: 'pulse 1s infinite' }} />}
                              onClick={() => handleStopAndRewrite('impression')}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                py: 0.3,
                                px: 1.2,
                                borderRadius: 2,
                                boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
                              }}
                            >
                              🔴 Stop & Rewrite Now
                            </Button>
                          ) : isRefiningAIField === 'impression' ? (
                            <Chip
                              size="small"
                              icon={<CircularProgress size={12} sx={{ color: '#16a34a' }} />}
                              label="Refining with OpenMed AI..."
                              sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.72rem' }}
                            />
                          ) : (
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Mic sx={{ color: '#16a34a' }} />}
                                onClick={() => handleStartVoiceDictation('impression')}
                                sx={{
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  py: 0.3,
                                  px: 1,
                                  borderRadius: 2,
                                  borderColor: '#86efac',
                                  color: '#15803d',
                                  bgcolor: '#f0fdf4',
                                  '&:hover': { bgcolor: '#dcfce7', borderColor: '#22c55e' }
                                }}
                              >
                                Dictate with OpenMed
                              </Button>
                              <Tooltip title="Rewrite / Enhance clinically with OpenMed AI">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRefineWithOpenMed('impression')}
                                    disabled={!radiologyReportEdit.trim()}
                                    sx={{ color: '#2563eb', bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' }, width: 28, height: 28 }}
                                  >
                                    <AutoAwesome sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          )}
                        </Box>

                        <Box sx={{ position: 'relative' }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={4}
                            placeholder="State definitive radiological diagnosis, bone height adequacy for implantology, sinus pneumatization, or endodontic root canal status..."
                            value={radiologyReportEdit}
                            onChange={(e) => setRadiologyReportEdit(e.target.value)}
                            sx={{
                              bgcolor: '#f8fafc',
                              borderRadius: 2,
                              '& .MuiOutlinedInput-root': {
                                pr: 5.5,
                                borderColor: isListeningField === 'impression' ? '#ef4444' : undefined,
                                boxShadow: isListeningField === 'impression' ? '0 0 0 3px rgba(239,68,68,0.18)' : 'none',
                                transition: 'all 0.2s ease'
                              }
                            }}
                          />
                          <Tooltip title={isListeningField === 'impression' ? "Recording speech... Click to Stop & Rewrite with OpenMed" : "Voice Dictate with OpenMed Clinical AI"}>
                            <IconButton
                              size="small"
                              onClick={() => isListeningField === 'impression' ? handleStopAndRewrite('impression') : handleStartVoiceDictation('impression')}
                              sx={{
                                position: 'absolute',
                                bottom: 12,
                                right: 12,
                                bgcolor: isListeningField === 'impression' ? '#ef4444' : '#16a34a',
                                color: '#ffffff',
                                width: 32,
                                height: 32,
                                boxShadow: isListeningField === 'impression' ? '0 0 10px rgba(239, 68, 68, 0.6)' : '0 2px 6px rgba(22, 163, 74, 0.4)',
                                transition: 'all 0.2s ease',
                                '&:hover': { bgcolor: isListeningField === 'impression' ? '#dc2626' : '#15803d', transform: 'scale(1.1)' }
                              }}
                            >
                              {isListeningField === 'impression' ? <Mic sx={{ fontSize: 18 }} /> : <SmartToy sx={{ fontSize: 18 }} />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                        {isListeningField === 'impression' && (
                          <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'block', mt: 0.5 }}>
                            🎙️ OpenMed listening... Speak formal impression naturally. Auto-rewrites 1.8s after pause or click "Stop & Rewrite Now".
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </Card>
                )}
              </Grid>

              {/* Right Panel: Live DICOM Series & Modalities from Database */}
              <Grid item xs={12} lg={3.5}>
                <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      DICOM Series ({radiologyScans.length})
                    </Typography>
                    <Chip size="small" label="PACS Stored" color="info" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                  </Box>

                  {radiologyScans.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                      <PersonalVideo sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569' }}>
                        No radiology scans recorded
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                        Acquire an intraoral X-ray or OPG scan for this patient.
                      </Typography>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => setUploadScanModalOpen(true)}
                        sx={{ bgcolor: '#1e3a8a', textTransform: 'none', fontWeight: 700 }}
                      >
                        + Record First Scan
                      </Button>
                    </Box>
                  ) : (
                    <Stack spacing={1.5}>
                      {radiologyScans.map((scan) => {
                        const isSelected = (activeScan?.id === scan.id);
                        const scanDate = scan.createdAt ? new Date(scan.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'PACS Stored';

                        return (
                          <Box
                            key={scan.id}
                            onClick={() => handleSelectScan(scan)}
                            sx={{
                              p: 1.8,
                              borderRadius: 2.5,
                              cursor: 'pointer',
                              bgcolor: isSelected ? '#eff6ff' : '#f8fafc',
                              border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                              boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none',
                              transition: 'all 0.2s ease',
                              '&:hover': { bgcolor: isSelected ? '#eff6ff' : '#f1f5f9' }
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.8 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isSelected ? '#1d4ed8' : '#1e293b', fontSize: '0.88rem' }}>
                                {scan.title}
                              </Typography>
                              <Chip
                                size="small"
                                label={scan.modality || 'PX'}
                                color={scan.modality === 'CT' ? 'secondary' : scan.modality === 'IO' ? 'success' : 'primary'}
                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, ml: 1, flexShrink: 0 }}
                              />
                            </Box>

                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                              {scan.scanNumber} • {scanDate}
                            </Typography>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.8, borderTop: '1px solid #e2e8f0' }}>
                              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                                Teeth: {scan.teethIndicated || 'Full Arch'}
                              </Typography>
                              <Chip
                                size="small"
                                label={scan.status || 'ACQUIRED'}
                                sx={{
                                  height: 18,
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  bgcolor: scan.status === 'REPORTED' ? '#dcfce7' : '#e0e7ff',
                                  color: scan.status === 'REPORTED' ? '#15803d' : '#3730a3'
                                }}
                              />
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Card>
              </Grid>
            </Grid>

            {/* Dialog to Record New Dental Radiograph in PostgreSQL */}
            <Dialog open={uploadScanModalOpen} onClose={() => setUploadScanModalOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
                🩻 Record New Dental Radiograph / Scan
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Radiograph Modality</InputLabel>
                      <Select
                        value={newScanForm.scanType}
                        label="Radiograph Modality"
                        onChange={(e) => {
                          const val = e.target.value;
                          let mod = 'PX';
                          let title = 'Panoramic OPG Radiograph — Full Dental Arch';
                          if (val === 'BITEWING_IO') { mod = 'IO'; title = 'Posterior Intraoral Bitewing (BW)'; }
                          else if (val === 'PERIAPICAL_PA') { mod = 'IO'; title = 'Periapical Radiograph (PA)'; }
                          else if (val === 'CBCT_3D') { mod = 'CT'; title = 'CBCT 3D Maxillofacial Scan'; }
                          const tPresets = TEETH_PRESETS_BY_MODALITY[val] || [];
                          const ePresets = EXPOSURE_PRESETS_BY_MODALITY[val] || [];
                          setIsCustomTeeth(false);
                          setIsCustomExposure(false);
                          setNewScanForm(prev => ({
                            ...prev,
                            scanType: val,
                            modality: mod,
                            title,
                            teethIndicated: tPresets[0] || 'Full Dentition / Both Arches (All 32 Teeth)',
                            exposureDetails: ePresets[0] || '70kV / 10mA • Standard Exposure'
                          }));
                        }}
                      >
                        <MenuItem value="PANORAMIC_OPG">Panoramic OPG (PX)</MenuItem>
                        <MenuItem value="BITEWING_IO">Bitewings Intraoral (IO)</MenuItem>
                        <MenuItem value="PERIAPICAL_PA">Periapical Radiograph (PA)</MenuItem>
                        <MenuItem value="CBCT_3D">Cone Beam CT 3D (CT)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Study Title"
                      value={newScanForm.title}
                      onChange={(e) => setNewScanForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </Grid>

                  {/* Pre-populated Teeth Indicated Dropdown */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Teeth Indicated (FDI)</InputLabel>
                      <Select
                        value={isCustomTeeth ? 'CUSTOM' : newScanForm.teethIndicated}
                        label="Teeth Indicated (FDI)"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'CUSTOM') {
                            setIsCustomTeeth(true);
                          } else {
                            setIsCustomTeeth(false);
                            setNewScanForm(prev => ({ ...prev, teethIndicated: val }));
                          }
                        }}
                      >
                        {(TEETH_PRESETS_BY_MODALITY[newScanForm.scanType] || []).map((preset) => (
                          <MenuItem key={preset} value={preset}>
                            {preset}
                          </MenuItem>
                        ))}
                        <MenuItem value="CUSTOM" sx={{ fontStyle: 'italic', color: '#1d4ed8', fontWeight: 700 }}>
                          ✏️ Custom / Specific Teeth...
                        </MenuItem>
                      </Select>
                    </FormControl>
                    {isCustomTeeth && (
                      <TextField
                        fullWidth
                        size="small"
                        sx={{ mt: 1 }}
                        placeholder="Type tooth numbers (e.g. 18, 28, 48)"
                        value={newScanForm.teethIndicated === 'CUSTOM' ? '' : newScanForm.teethIndicated}
                        onChange={(e) => setNewScanForm(prev => ({ ...prev, teethIndicated: e.target.value }))}
                      />
                    )}
                  </Grid>

                  {/* Pre-populated Exposure Details Dropdown */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Exposure Technique / Protocol</InputLabel>
                      <Select
                        value={isCustomExposure ? 'CUSTOM' : newScanForm.exposureDetails}
                        label="Exposure Technique / Protocol"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'CUSTOM') {
                            setIsCustomExposure(true);
                          } else {
                            setIsCustomExposure(false);
                            setNewScanForm(prev => ({ ...prev, exposureDetails: val }));
                          }
                        }}
                      >
                        {(EXPOSURE_PRESETS_BY_MODALITY[newScanForm.scanType] || []).map((preset) => (
                          <MenuItem key={preset} value={preset}>
                            {preset}
                          </MenuItem>
                        ))}
                        <MenuItem value="CUSTOM" sx={{ fontStyle: 'italic', color: '#1d4ed8', fontWeight: 700 }}>
                          ✏️ Manual Custom Technique...
                        </MenuItem>
                      </Select>
                    </FormControl>
                    {isCustomExposure && (
                      <TextField
                        fullWidth
                        size="small"
                        sx={{ mt: 1 }}
                        placeholder="e.g. 68kV / 8mA • 0.22s"
                        value={newScanForm.exposureDetails === 'CUSTOM' ? '' : newScanForm.exposureDetails}
                        onChange={(e) => setNewScanForm(prev => ({ ...prev, exposureDetails: e.target.value }))}
                      />
                    )}
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Initial Radiographic Findings / Indications"
                      placeholder="Describe suspicious lesion, bone defect, or reason for exam..."
                      value={newScanForm.findingsNotes}
                      onChange={(e) => setNewScanForm(prev => ({ ...prev, findingsNotes: e.target.value }))}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setUploadScanModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleCreateNewScan}
                  disabled={loading}
                  sx={{ bgcolor: '#1e3a8a', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Save Scan to PostgreSQL
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        );
      })()}

      {/* ── 4. Chairside Digital Lab Orders (/dental/lab-orders) ───────────────── */}
      {currentSubCategory === 'lab-orders' && (
        <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Electronic Dental Lab Slips & Turnaround Tracking
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Direct integration with external prosthetic laboratories with 3D Shade Selection and STL scan dispatch
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setLabModalOpen(true)}
              sx={{ bgcolor: '#3b82f6', fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
            >
              New Lab Prescription Slip
            </Button>
          </Box>

          <Paper sx={{ width: '100%', overflowX: 'auto', borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Order #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Lab Partner</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Restoration Type</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Teeth</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Vita Shade</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Turnaround</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Cost (₦)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {labOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
                      No lab slips on record for this patient encounter. Click "New Lab Prescription Slip" above.
                    </TableCell>
                  </TableRow>
                ) : (
                  labOrders.map((ord) => (
                    <TableRow key={ord.id}>
                      <TableCell sx={{ fontWeight: 800, color: '#2563eb' }}>{ord.orderNumber}</TableCell>
                      <TableCell>{ord.labName}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{ord.restorationType}</TableCell>
                      <TableCell>#{ord.toothNumbers}</TableCell>
                      <TableCell>
                        <Chip size="small" label={`Shade: ${ord.shadeVita}`} sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 800 }} />
                      </TableCell>
                      <TableCell>{ord.turnaroundDays} Days</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={ord.status}
                          color={ord.status === 'DELIVERED' ? 'success' : 'info'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>₦{Number(ord.cost).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Card>
      )}

      {/* ── 5. Treatment Plan & CDT Auto-Billing (/dental/treatment-plans) ─────── */}
      {currentSubCategory === 'treatment-plans' && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Phased Treatment Plan & CDT Procedure Master
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Auto-synchronized with central hospital billing and dental consumables dispensary
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Receipt />}
                  onClick={handlePostToBilling}
                  sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
                >
                  Post to Billing & Dispense
                </Button>
              </Box>

              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Tooth</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>CDT Code</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Procedure Description</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Phase</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Fee (₦)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.values(toothFindings).map((f: any, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontWeight: 800, color: '#1e3a8a' }}>#{f.toothNumber}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#2563eb' }}>{f.cdtCode || 'D2391'}</TableCell>
                      <TableCell>{f.diagnosis || 'Restorative Treatment'}</TableCell>
                      <TableCell>Phase 1 (Urgent)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>₦{(f.cost || 25000).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip size="small" label={f.status || 'PLANNED'} color="primary" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
                📦 Auto-Deducted Dental Inventory
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                Items automatically deducted from Central Pharmacy upon procedure completion:
              </Typography>

              {[
                { name: 'Lidocaine 2% with 1:100,000 Epinephrine (1.8mL Carpule)', qty: '2 Cartridges' },
                { name: '3M Filtek Z350 XT Universal Restorative Composite', qty: '0.4 grams' },
                { name: 'Single Bond Universal Adhesive', qty: '1 drop (0.05mL)' },
                { name: 'Micro-applicator tips & Etching Gel (37% Phosphoric)', qty: '1 unit' },
              ].map((item, i) => (
                <Box key={i} sx={{ p: 1.2, mb: 1, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{item.name}</Typography>
                  <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>Deducting: {item.qty}</Typography>
                </Box>
              ))}
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── 6. Digital Consent Form (/dental/consent) ─────────────────────────── */}
      {currentSubCategory === 'consent' && (
        <Card sx={{ p: 3, borderRadius: 3, maxWidth: 800, mx: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
            Chairside Digital Informed Consent & Treatment Agreement
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
            Patient sign-off for dental surgical, endodontic, and restorative procedures with full itemized cost estimate.
          </Typography>

          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            I hereby authorize the attending dental team to perform the planned clinical procedures, including administration of local anesthetics and necessary radiographs.
          </Alert>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Patient / Guardian Digital Signature:
          </Typography>
          
          <Box sx={{ border: '2px dashed #94a3b8', borderRadius: 2, bgcolor: '#f8fafc', p: 1, mb: 2, textAlign: 'center' }}>
            <canvas
              ref={consentCanvasRef}
              width={650}
              height={180}
              onMouseDown={startDrawing}
              onMouseMove={drawSignature}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              style={{ cursor: 'crosshair', background: '#ffffff', borderRadius: 8, width: '100%', touchAction: 'none' }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button size="small" variant="outlined" color="error" onClick={clearSignature} sx={{ textTransform: 'none' }}>
              Clear Signature Pad
            </Button>
            <Button
              variant="contained"
              startIcon={<CheckCircle />}
              disabled={!consentSigned}
              onClick={() => setStatusMessage({ type: 'success', text: 'Digital consent signed and archived into Patient EHR file.' })}
              sx={{ bgcolor: '#10b981', fontWeight: 700, textTransform: 'none' }}
            >
              Sign & Seal Consent Form
            </Button>
          </Box>
        </Card>
      )}

      {/* ── Tooth Inspector Modal ───────────────────────────────────────────── */}
      <Dialog open={toothModalOpen} onClose={() => setToothModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#1e3a8a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Tooth #{selectedTooth} — Clinical Action Sheet</span>
          <IconButton size="small" onClick={() => setToothModalOpen(false)} sx={{ color: '#fff' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
            <InputLabel>Tooth Condition / Pathologic State</InputLabel>
            <Select
              value={toothForm.wholeStatus}
              label="Tooth Condition / Pathologic State"
              onChange={(e) => setToothForm({ ...toothForm, wholeStatus: e.target.value })}
            >
              <MenuItem value="SOUND">Sound / Healthy</MenuItem>
              <MenuItem value="CARIES">Active Dental Caries (Decay)</MenuItem>
              <MenuItem value="COMPOSITE_FILLING">Composite Resin Filling</MenuItem>
              <MenuItem value="PORCELAIN_CROWN">Porcelain / Ceramic Crown</MenuItem>
              <MenuItem value="ROOT_CANAL">Root Canal Treated (Endodontic)</MenuItem>
              <MenuItem value="EXTRACTION_INDICATED">Extraction Indicated</MenuItem>
              <MenuItem value="MISSING">Missing / Extracted</MenuItem>
              <MenuItem value="IMPLANT">Implant Fixed</MenuItem>
              <MenuItem value="FRACTURED">Fractured / Chipped Tooth</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Affected Tooth Surfaces:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
            {[
              { key: 'surfaceM', label: 'Mesial (M)' },
              { key: 'surfaceD', label: 'Distal (D)' },
              { key: 'surfaceO', label: 'Occlusal / Incisal (O)' },
              { key: 'surfaceB', label: 'Buccal / Facial (B)' },
              { key: 'surfaceL', label: 'Lingual / Palatal (L)' },
            ].map((surf) => (
              <Chip
                key={surf.key}
                label={surf.label}
                clickable
                color={(toothForm as any)[surf.key] ? 'error' : 'default'}
                variant={(toothForm as any)[surf.key] ? 'filled' : 'outlined'}
                onClick={() => setToothForm({ ...toothForm, [surf.key]: !(toothForm as any)[surf.key] })}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Box>

          <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
            <InputLabel>Associated CDT Procedure & Billing Code</InputLabel>
            <Select
              value={toothForm.cdtCode}
              label="Associated CDT Procedure & Billing Code"
              onChange={(e) => {
                const cdt = CDT_CATALOG.find(c => c.code === e.target.value);
                setToothForm({
                  ...toothForm,
                  cdtCode: e.target.value,
                  cost: cdt ? cdt.cost : toothForm.cost,
                  diagnosis: cdt ? `${cdt.name} on Tooth #${selectedTooth}` : toothForm.diagnosis
                });
              }}
            >
              {CDT_CATALOG.map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  {c.code} — {c.name} (₦{c.cost.toLocaleString()})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Estimated Procedure Fee (₦)"
            type="number"
            size="small"
            value={toothForm.cost}
            onChange={(e) => setToothForm({ ...toothForm, cost: Number(e.target.value) })}
            sx={{ mb: 2.5 }}
          />

          <TextField
            fullWidth
            label="Clinical Findings & Dentist Notes"
            multiline
            rows={2}
            size="small"
            value={toothForm.notes}
            onChange={(e) => setToothForm({ ...toothForm, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setToothModalOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveTooth}
            sx={{ bgcolor: '#1e3a8a', fontWeight: 700, textTransform: 'none', px: 3 }}
          >
            Save Tooth Findings
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── New Lab Slip Modal ──────────────────────────────────────────────── */}
      <Dialog open={labModalOpen} onClose={() => setLabModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#3b82f6', color: '#fff' }}>
          Create Electronic Dental Lab Order Slip
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          <TextField
            fullWidth
            label="Dental Laboratory Partner"
            size="small"
            value={newLabOrder.labName}
            onChange={(e) => setNewLabOrder({ ...newLabOrder, labName: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Restoration / Prosthesis Type"
            size="small"
            value={newLabOrder.restorationType}
            onChange={(e) => setNewLabOrder({ ...newLabOrder, restorationType: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Target Tooth Numbers"
                size="small"
                value={newLabOrder.toothNumbers}
                onChange={(e) => setNewLabOrder({ ...newLabOrder, toothNumbers: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Vita Classical Shade</InputLabel>
                <Select
                  value={newLabOrder.shadeVita}
                  label="Vita Classical Shade"
                  onChange={(e) => setNewLabOrder({ ...newLabOrder, shadeVita: e.target.value })}
                >
                  {VITA_SHADES.map(s => (
                    <MenuItem key={s} value={s}>Shade {s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TextField
            fullWidth
            label="Lab Manufacturing Instructions"
            multiline
            rows={3}
            size="small"
            value={newLabOrder.instructions}
            onChange={(e) => setNewLabOrder({ ...newLabOrder, instructions: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Lab Fee (₦)"
            type="number"
            size="small"
            value={newLabOrder.cost}
            onChange={(e) => setNewLabOrder({ ...newLabOrder, cost: Number(e.target.value) })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setLabModalOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateLabOrder}
            sx={{ bgcolor: '#3b82f6', fontWeight: 700, textTransform: 'none', px: 3 }}
          >
            Dispatch to Lab
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
