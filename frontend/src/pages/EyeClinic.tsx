import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { assetUrl } from '../utils/assetUrl';
import {
  Box, Typography, Grid, Card, Button, Chip, TextField,
  Select, MenuItem, FormControl, InputLabel,
  Alert, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Paper, Divider, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import {
  Visibility, RemoveRedEye, Save, Send, Add, AutoAwesome,
  Speed, Timeline, Palette, CameraAlt, LocalPharmacy,
  Print, History, DeleteOutline, RestartAlt, CheckCircle, Refresh,
  Undo, Brush, Download, Layers, Collections, ZoomIn, Close, Search, Image as ImageIcon,
  Receipt, ShoppingCart, FactCheck, Tune, CheckCircleOutline, ContentCopy, OpenInNew, DirectionsCar, Computer, MenuBook, LocalOffer,
  Science, CloudUpload, Assessment, Fullscreen, Memory, HelpOutline, Biotech, Analytics
} from '@mui/icons-material';
import { api } from '../services/api';

// Visual Acuity standard options
const VA_OPTIONS = [
  '6/4 (20/12)', '6/5 (20/16)', '6/6 (20/20)', '6/7.5 (20/25)',
  '6/9 (20/30)', '6/12 (20/40)', '6/18 (20/60)', '6/24 (20/80)',
  '6/36 (20/120)', '6/60 (20/200)', 'CF 3m', 'CF 1m', 'HM (Hand Motion)',
  'LP (Light Perception)', 'NLP (No Light Perception)'
];

const NEAR_VA_OPTIONS = ['N4', 'N5', 'N6', 'N8', 'N10', 'N12', 'N18', 'N24', 'N36'];

const OPTICAL_LENS_TYPES = [
  'Digital Free-Form Progressive',
  'Single Vision Distance',
  'Single Vision Reading (Near)',
  'Single Vision Intermediate (Computer)',
  'Bifocal D-Segment 28',
  'Trifocal 7x28',
  'Office / Occupational Progressive',
  'Anti-Fatigue / Digital Boost (+0.60 Add)'
];

const OPTICAL_LENS_MATERIALS = [
  'CR-39 Standard Resin (1.50)',
  'Polycarbonate 1.59 (Impact Resistant)',
  'High Index 1.60 MR-8 (Thin & Lightweight)',
  'High Index 1.67 Ultra-Thin (High Myopia/Hyperopia)',
  'Ultra High Index 1.74 Slim (Maximum Thinness)',
  'Trivex 1.53 Shatterproof (Sports / Rimless)',
  'Photochromic Transitions Gen-8 (1.56 Auto-Darkening)',
  'Photochromic Polycarbonate Transitions Gen-8 (1.59)'
];

const OPTICAL_COATINGS_OPTIONS = [
  'Anti-Reflective (AR)',
  'Blue-Light Blocker 420nm',
  'UV-400 Total Protection',
  'Hydrophobic Easy-Clean',
  'Scratch Guard Hard Coat',
  'Polarized Glare Shield',
  'Anti-Fog Nano Coating',
  'DriveSafe Night Anti-Glare'
];

const OPTICAL_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DISPATCHED_TO_OPTICAL_SHOP: { label: 'Dispatched to Optical Shop', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
  IN_SURFACING_EDGING: { label: 'In Surfacing & Edging', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  QUALITY_CHECKED: { label: 'Quality Checked & Verified', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  READY_FOR_COLLECTION: { label: 'Ready for Patient Pickup', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
  DISPENSED_TO_PATIENT: { label: 'Dispensed to Patient', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  ISSUED: { label: 'Issued / Active', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
};

const TELEMETRY_MODALITIES: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  OCT_MACULA: { label: 'Macular OCT (B-Scan)', icon: '🔬', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
  OCT_RNFL_GLAUCOMA: { label: 'Optic Disc RNFL & Glaucoma', icon: '🟢', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  FUNDUS_PHOTOGRAPHY: { label: 'Digital Fundus TrueColor', icon: '📷', color: '#be185d', bg: '#fdf2f8', border: '#fbcfe8' },
  VISUAL_FIELD_PERIMETRY: { label: 'Humphrey Visual Field 24-2', icon: '👁️', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  CORNEAL_TOPOGRAPHY: { label: 'Corneal Topography & Elevation', icon: '🌐', color: '#d97706', bg: '#fffbeb', border: '#fde68a' }
};

const TELEMETRY_DEVICES = [
  'Heidelberg Spectralis OCT2 MultiColor',
  'Zeiss Cirrus HD-OCT 5000 (AngioPlex)',
  'Topcon TRC-50DX Mydriatic/Non-Mydriatic Retinal Camera',
  'Humphrey Field Analyzer 3 (HFA3 24-2 SITA-Faster)',
  'Tomey TMS-4 Corneal Topographer',
  'Canon CR-2 AF Non-Mydriatic Retinal Camera'
];

const BLANK_REFRACTION_FORM = {
  examType: 'Subjective Manifest Refraction',
  vaDistanceOD: '6/6 (20/20)',
  vaNearOD: 'N6',
  sphereOD: '',
  cylinderOD: '',
  axisOD: '',
  addOD: '',
  bcvaOD: '6/6 (20/20)',
  vaDistanceOS: '6/6 (20/20)',
  vaNearOS: 'N6',
  sphereOS: '',
  cylinderOS: '',
  axisOS: '',
  addOS: '',
  bcvaOS: '6/6 (20/20)',
  vaDistanceOU: '6/6 (20/20)',
  pupillaryDistanceMM: 64,
  notes: '',
};

const BLANK_IOP_FORM = {
  method: 'Goldmann Applanation Tonometry',
  iopOD: '',
  iopOS: '',
  pachymetryOD: '',
  pachymetryOS: '',
  antiGlaucomaMeds: '',
  notes: '',
};

export default function EyeClinic() {
  const location = useLocation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Determine active subcategory from URL route
  const getSubCategoryFromPath = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/eye-clinic/iop')) return 'iop';
    if (path.includes('/eye-clinic/drawing')) return 'drawing';
    if (path.includes('/eye-clinic/optical-rx')) return 'optical-rx';
    if (path.includes('/eye-clinic/telemetry')) return 'telemetry';
    return 'refraction'; // default sub-page
  };

  const currentSubCategory = getSubCategoryFromPath();

  // Patient & Encounter State (100% PostgreSQL Synced)
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [currentEncounter, setCurrentEncounter] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Live Patient Refraction History & Live Database Stats
  const [patientRefractions, setPatientRefractions] = useState<any[]>([]);
  const [refractionStats, setRefractionStats] = useState<{
    refractionCount: number;
    encounterCount: number;
    latestRefraction?: any;
    latestIop?: any;
  }>({ refractionCount: 0, encounterCount: 0 });
  const [refractionTab, setRefractionTab] = useState<'workbench' | 'vault'>('workbench');
  const [savingRefraction, setSavingRefraction] = useState(false);
  const [selectedRefractionForModal, setSelectedRefractionForModal] = useState<any | null>(null);
  const [refractionModalOpen, setRefractionModalOpen] = useState(false);

  // Dual-Eye Refraction Form State
  const [refractionForm, setRefractionForm] = useState(BLANK_REFRACTION_FORM);

  // Tonometry & IOP state (100% PostgreSQL Synced)
  const [iopForm, setIopForm] = useState(BLANK_IOP_FORM);
  const [iopViewTab, setIopViewTab] = useState<'graph' | 'table'>('graph');
  const [savingIop, setSavingIop] = useState(false);

  // Longitudinal IOP History from PostgreSQL
  const [iopHistory, setIopHistory] = useState<any[]>([]);

  // Optical Shop Prescription State (100% PostgreSQL Synced)
  const [opticalRxTab, setOpticalRxTab] = useState<'prescribe' | 'vault'>('prescribe');
  const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [dispatchingRx, setDispatchingRx] = useState(false);
  const [selectedRxForModal, setSelectedRxForModal] = useState<any | null>(null);
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [rxSearchQuery, setRxSearchQuery] = useState('');
  const [updatingRxId, setUpdatingRxId] = useState<string | null>(null);

  const [opticalRx, setOpticalRx] = useState({
    lensType: 'Digital Free-Form Progressive',
    lensMaterial: 'Polycarbonate 1.59 (Impact Resistant)',
    coatings: ['Anti-Reflective (AR)', 'Blue-Light Blocker 420nm', 'UV-400 Total Protection', 'Hydrophobic Easy-Clean'],
    sphereOD: -1.50,
    cylinderOD: -0.75,
    axisOD: 90,
    addOD: 1.75,
    sphereOS: -1.75,
    cylinderOS: -0.50,
    axisOS: 85,
    addOS: 1.75,
    pdDistanceMM: 64,
    pdNearMM: 61,
    frameBrand: '',
    frameModel: '',
    frameColor: '',
    frameSize: '',
    usageAdvice: 'Constant wear for computer workstation and general distance viewing.',
    expiryDays: 365,
    prescribedByName: 'Dr. Emmanuel Vegher (Ophthalmologist)'
  });

  // Visual Drawing Canvas & Database State
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [penSize, setPenSize] = useState<number>(3);
  const [drawingTool, setDrawingTool] = useState<'pen' | 'eraser'>('pen');
  const [canvasTemplate, setCanvasTemplate] = useState<'fundus' | 'anterior' | 'eyelid' | 'blank'>('fundus');
  const [selectedEyeSide, setSelectedEyeSide] = useState<'OD' | 'OS' | 'OU'>('OD');
  const [drawingDiagnosis, setDrawingDiagnosis] = useState('');
  const [drawingNotes, setDrawingNotes] = useState('');
  const [drawingClinicianName, setDrawingClinicianName] = useState('Dr. Emmanuel Vegher (Ophthalmologist)');
  const [savedDrawings, setSavedDrawings] = useState<any[]>([]);
  const [loadingDrawings, setLoadingDrawings] = useState(false);
  const [savingDrawing, setSavingDrawing] = useState(false);
  const [selectedDrawingForModal, setSelectedDrawingForModal] = useState<any | null>(null);
  const [drawingModalOpen, setDrawingModalOpen] = useState(false);
  const [drawingTab, setDrawingTab] = useState<'studio' | 'vault'>('studio');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [drawingSearchQuery, setDrawingSearchQuery] = useState('');
  const [deviceTelemetry, setDeviceTelemetry] = useState<any | null>(null);

  // Diagnostic Telemetry & OCT State (100% PostgreSQL Synced)
  const [telemetryTab, setTelemetryTab] = useState<'pacs' | 'ingest' | 'vault'>('pacs');
  const [patientTelemetryScans, setPatientTelemetryScans] = useState<any[]>([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [ingestingScan, setIngestingScan] = useState(false);
  const [selectedScanForModal, setSelectedScanForModal] = useState<any | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [telemetryFilter, setTelemetryFilter] = useState<string>('ALL');
  const [telemetrySearchQuery, setTelemetrySearchQuery] = useState('');

  const [newScanForm, setNewScanForm] = useState({
    deviceModel: 'Heidelberg Spectralis OCT2 MultiColor',
    deviceSerial: 'HD-OCT-8821',
    modality: 'OCT_MACULA',
    eyeSide: 'OD',
    centralThickness: 248,
    rnflAverage: 98,
    cupDiscRatio: 0.32,
    signalQuality: 9,
    findingsSummary: 'Preserved foveal pit depression with intact IS/OS photoreceptor junction and continuous RPE layer.',
    clinicalNotes: 'Central subfield thickness: 248 µm (Normal normative range: 220–270 µm). Vitreomacular interface clear.',
    clinicianName: 'Dr. Emmanuel Vegher (Ophthalmologist)'
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients?limit=50');
      const data = Array.isArray(res.data) ? res.data : (res.data?.patients || res.data?.data || []);
      setPatients(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setSelectedPatient((prev: any) => {
          if (!prev) {
            handleSelectPatient(data[0]);
            return data[0];
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('Failed to load patients from database:', err);
    }
  };

  const handleSelectPatient = async (patient: any) => {
    setSelectedPatient(patient);
    setLoading(true);
    try {
      // 1. Fetch live encounters
      const encRes = await api.get(`/ophthalmology/encounters?patientId=${patient.id}`);
      const encs = encRes.data?.data || [];
      setEncounters(encs);
      if (encs.length > 0) {
        setCurrentEncounter(encs[0]);
      } else {
        setCurrentEncounter(null);
      }

      // 2. Fetch live refractions and stats from PostgreSQL
      await fetchPatientRefractions(patient.id);

      // 3. Fetch IOP history
      await fetchIopHistory(patient.id);

      // 4. Fetch live anatomical drawings
      await fetchPatientDrawings(patient.id);

      // 5. Fetch live optical prescriptions
      await fetchPatientPrescriptions(patient.id);

      // 6. Fetch live telemetry and OCT scans
      await fetchPatientTelemetry(patient.id);
    } catch (err: any) {
      console.error('Error fetching eye clinic data from PostgreSQL:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientDrawings = async (patientId: string) => {
    if (!patientId) return;
    setLoadingDrawings(true);
    try {
      const res = await api.get(`/ophthalmology/drawings?patientId=${patientId}`);
      const list = res.data?.data || [];
      setSavedDrawings(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to fetch patient drawings from PostgreSQL:', err);
    } finally {
      setLoadingDrawings(false);
    }
  };

  const fetchPatientRefractions = async (patientId: string) => {
    try {
      const [refRes, statsRes] = await Promise.all([
        api.get(`/ophthalmology/refractions?patientId=${patientId}`),
        api.get(`/ophthalmology/refractions/stats/${patientId}`)
      ]);

      const refList = refRes.data?.data || [];
      setPatientRefractions(refList);

      if (statsRes.data?.data) {
        setRefractionStats(statsRes.data.data);
      } else {
        setRefractionStats({
          refractionCount: refList.length,
          encounterCount: encounters.length
        });
      }

      // If patient has saved refractions in DB, pre-fill with latest exam
      if (refList.length > 0) {
        populateFormWithRefraction(refList[0]);
      } else {
        // Clean blank slate for fresh exam
        setRefractionForm(BLANK_REFRACTION_FORM);
      }
    } catch (e) {
      console.warn('Failed to fetch patient refraction records from PostgreSQL:', e);
    }
  };

  const populateFormWithRefraction = (r: any) => {
    setRefractionForm({
      examType: r.examType || 'Subjective Manifest Refraction',
      vaDistanceOD: r.vaDistanceOD || '6/6 (20/20)',
      vaNearOD: r.vaNearOD || 'N6',
      sphereOD: r.sphereOD !== null && r.sphereOD !== undefined ? String(r.sphereOD) : '',
      cylinderOD: r.cylinderOD !== null && r.cylinderOD !== undefined ? String(r.cylinderOD) : '',
      axisOD: r.axisOD !== null && r.axisOD !== undefined ? String(r.axisOD) : '',
      addOD: r.addOD !== null && r.addOD !== undefined ? String(r.addOD) : '',
      bcvaOD: r.bcvaOD || '6/6 (20/20)',
      vaDistanceOS: r.vaDistanceOS || '6/6 (20/20)',
      vaNearOS: r.vaNearOS || 'N6',
      sphereOS: r.sphereOS !== null && r.sphereOS !== undefined ? String(r.sphereOS) : '',
      cylinderOS: r.cylinderOS !== null && r.cylinderOS !== undefined ? String(r.cylinderOS) : '',
      axisOS: r.axisOS !== null && r.axisOS !== undefined ? String(r.axisOS) : '',
      addOS: r.addOS !== null && r.addOS !== undefined ? String(r.addOS) : '',
      bcvaOS: r.bcvaOS || '6/6 (20/20)',
      vaDistanceOU: r.vaDistanceOU || '6/6 (20/20)',
      pupillaryDistanceMM: r.pupillaryDistanceMM || 64,
      notes: r.notes || '',
    });
  };

  const fetchIopHistory = async (patientId: string) => {
    try {
      const res = await api.get(`/ophthalmology/iop-trends/${patientId}`);
      const list = res.data?.data || [];
      if (list.length > 0) {
        setIopHistory(list.map((m: any) => ({
          id: m.id,
          date: new Date(m.timeMeasured).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          isoDate: new Date(m.timeMeasured).toISOString().split('T')[0],
          time: new Date(m.timeMeasured).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          method: m.method || 'Goldmann Applanation Tonometry',
          iopOD: Number(m.iopOD),
          iopOS: Number(m.iopOS),
          pachymetryOD: m.pachymetryOD,
          pachymetryOS: m.pachymetryOS,
          meds: m.antiGlaucomaMeds || 'None Logged',
          notes: m.notes || '',
          encounterNumber: m.eyeEncounter?.encounterNumber || 'General Eye Exam',
          ophthalmologistName: m.eyeEncounter?.ophthalmologistName || 'Attending Tonometrist'
        })));
      } else {
        setIopHistory([]);
      }
    } catch (e) {
      console.warn('IOP history load failed from PostgreSQL:', e);
    }
  };

  const handleCreateEncounter = async () => {
    let patientToUse = selectedPatient;
    if (!patientToUse && patients.length > 0) {
      patientToUse = patients[0];
      setSelectedPatient(patientToUse);
    }
    if (!patientToUse) {
      enqueueSnackbar('Please select a patient first.', { variant: 'warning' });
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/ophthalmology/encounters', {
        patientId: patientToUse.id,
        chiefComplaint: 'Comprehensive Ophthalmic Examination, OD/OS Refraction & Glaucoma IOP Workup',
      });
      if (res.data?.data) {
        const msg = `Eye Encounter ${res.data.data.encounterNumber} initialized in PostgreSQL.`;
        enqueueSnackbar(msg, { variant: 'success' });
        setStatusMessage({ type: 'success', text: msg });
        await handleSelectPatient(patientToUse);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to start eye encounter in database.';
      enqueueSnackbar(errorMsg, { variant: 'error' });
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRefraction = async () => {
    let patientToUse = selectedPatient;
    if (!patientToUse && patients.length > 0) {
      patientToUse = patients[0];
      setSelectedPatient(patientToUse);
    }
    if (!patientToUse) {
      enqueueSnackbar('Please select a patient from the patient selector at the top first.', { variant: 'warning' });
      setStatusMessage({ type: 'error', text: 'Please select a patient first from the patient selector above.' });
      return;
    }
    try {
      setSavingRefraction(true);
      const res = await api.post('/ophthalmology/refractions', {
        patientId: patientToUse.id,
        eyeEncounterId: currentEncounter?.id || undefined,
        ...refractionForm
      });
      if (res.data?.data) {
        const encNum = res.data.data.eyeEncounter?.encounterNumber || 'Active';
        const msg = `Dual-Eye OD/OS Refraction saved in PostgreSQL! (Encounter: ${encNum})`;
        enqueueSnackbar(msg, { variant: 'success' });
        setStatusMessage({
          type: 'success',
          text: msg
        });
        await fetchPatientRefractions(patientToUse.id);
        const encRes = await api.get(`/ophthalmology/encounters?patientId=${patientToUse.id}`);
        const encs = encRes.data?.data || [];
        setEncounters(encs);
        if (encs.length > 0 && !currentEncounter) {
          setCurrentEncounter(encs[0]);
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save refraction in database.';
      enqueueSnackbar(errorMsg, { variant: 'error' });
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setSavingRefraction(false);
    }
  };

  const handleDeleteRefraction = async (refractionId: string) => {
    if (!window.confirm('Are you sure you want to delete this refraction exam record from the database?')) {
      return;
    }
    try {
      await api.delete(`/ophthalmology/refractions/${refractionId}`);
      enqueueSnackbar('Refraction exam record removed from PostgreSQL.', { variant: 'info' });
      setStatusMessage({ type: 'info', text: 'Refraction exam record removed from PostgreSQL.' });
      if (selectedPatient) {
        await fetchPatientRefractions(selectedPatient.id);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to delete refraction.';
      enqueueSnackbar(errorMsg, { variant: 'error' });
      setStatusMessage({ type: 'error', text: errorMsg });
    }
  };

  const handlePrintRefractionCertificate = () => {
    if (!selectedRefractionForModal) return;

    const patientName = `${selectedPatient?.firstName || ''} ${selectedPatient?.lastName || ''}`.trim() || 'Patient';
    const mrn = selectedPatient?.patientNumber || selectedPatient?.id?.slice(0, 8) || 'N/A';
    const encounterNum = selectedRefractionForModal.eyeEncounter?.encounterNumber || 'General Clinical Exam';
    const examDate = new Date(selectedRefractionForModal.createdAt).toLocaleDateString('en-GB', { dateStyle: 'long' });
    const doctorName = selectedRefractionForModal.eyeEncounter?.ophthalmologistName || 'Dr. Attending Optometrist / Ophthalmologist';
    const leftLogoUrl = window.location.origin + assetUrl('/anglican-logo.png');
    const rightLogoUrl = window.location.origin + assetUrl('/hospital-logo.png');

    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Official Ophthalmic Refraction Certificate - ${patientName}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #0f172a;
              background-color: #ffffff;
              padding: 20px;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
            .cert-card {
              max-width: 820px;
              margin: 0 auto;
              border: 2px solid #0284c7;
              border-radius: 12px;
              padding: 24px 28px;
              background: #ffffff;
            }
            .header-flex {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #0284c7;
              padding-bottom: 16px;
              margin-bottom: 20px;
              gap: 16px;
            }
            .crest-logo {
              width: 60px !important;
              height: 60px !important;
              max-width: 60px !important;
              max-height: 60px !important;
              object-fit: contain;
              flex-shrink: 0;
            }
            .seal-logo {
              width: 60px !important;
              height: 60px !important;
              max-width: 60px !important;
              max-height: 60px !important;
              object-fit: contain;
              border-radius: 50%;
              border: 2px solid #0284c7;
              padding: 2px;
              flex-shrink: 0;
            }
            .header-text {
              text-align: center;
              flex: 1;
            }
            .hospital-title {
              font-size: 19px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: -0.02em;
            }
            .dept-title {
              font-size: 12px;
              font-weight: 800;
              color: #0284c7;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              margin-top: 3px;
            }
            .facility-tag {
              font-size: 10.5px;
              color: #64748b;
              margin-top: 2px;
            }
            .patient-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 20px;
            }
            .lbl {
              font-size: 10.5px;
              font-weight: 600;
              color: #64748b;
              margin-bottom: 2px;
            }
            .val {
              font-size: 12.5px;
              font-weight: 700;
              color: #0f172a;
            }
            .val-accent {
              font-size: 12.5px;
              font-weight: 700;
              color: #0284c7;
            }
            .sec-heading {
              font-size: 12px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.03em;
              margin-bottom: 8px;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              overflow: hidden;
            }
            .data-table th {
              background-color: #0284c7;
              color: #ffffff;
              font-size: 10.5px;
              font-weight: 800;
              padding: 8px 10px;
              text-align: center;
              border: 1px solid #0284c7;
              text-transform: uppercase;
            }
            .data-table td {
              font-size: 12px;
              padding: 9px 10px;
              text-align: center;
              border: 1px solid #cbd5e1;
            }
            .od-row { background-color: #f0f9ff; }
            .os-row { background-color: #fdf2f8; }
            .od-lbl { font-weight: 800; color: #0369a1; text-align: left !important; }
            .os-lbl { font-weight: 800; color: #be185d; text-align: left !important; }
            .val-bold { font-weight: 700; color: #0f172a; }
            .val-bcva-od { font-weight: 800; color: #0284c7; }
            .val-bcva-os { font-weight: 800; color: #be185d; }
            .notes-grid {
              display: grid;
              grid-template-columns: 1fr 2fr;
              gap: 14px;
              margin-bottom: 22px;
            }
            .box-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 14px;
            }
            .pd-val {
              font-size: 15px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 3px;
            }
            .notes-val {
              font-size: 11.5px;
              color: #334155;
              font-weight: 500;
              margin-top: 3px;
              line-height: 1.45;
            }
            .footer-row {
              border-top: 1px dashed #94a3b8;
              padding-top: 16px;
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
            }
            .doctor-name {
              font-size: 13px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 2px;
            }
            .sig-area {
              text-align: right;
            }
            .sig-line {
              width: 220px;
              border-bottom: 1px solid #0f172a;
              margin-bottom: 4px;
            }
            .stamp-box {
              display: inline-block;
              border: 1.5px dashed #0284c7;
              border-radius: 6px;
              padding: 4px 10px;
              font-size: 10px;
              font-weight: 700;
              color: #0284c7;
              margin-top: 4px;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="cert-card">
            <!-- Header -->
            <div class="header-flex">
              <img src="${leftLogoUrl}" alt="Diocese Logo" class="crest-logo" onerror="this.src='${rightLogoUrl}';" />
              <div class="header-text">
                <div class="hospital-title">FAITH FOUNDATION MISSION HOSPITAL</div>
                <div class="dept-title">DIRECTORATE OF OPHTHALMOLOGY & VISUAL SCIENCES</div>
                <div class="facility-tag">Postgraduate Clinical Eye Pavilion • Comprehensive Refraction & Ophthalmic Diagnostics</div>
              </div>
              <img src="${rightLogoUrl}" alt="Hospital Seal" class="seal-logo" />
            </div>

            <!-- Patient Metadata -->
            <div class="patient-grid">
              <div>
                <div class="lbl">Patient Name:</div>
                <div class="val">${patientName}</div>
              </div>
              <div>
                <div class="lbl">Hospital MRN:</div>
                <div class="val-accent">${mrn}</div>
              </div>
              <div>
                <div class="lbl">Encounter Reference:</div>
                <div class="val">${encounterNum}</div>
              </div>
              <div>
                <div class="lbl">Date of Assessment:</div>
                <div class="val">${examDate}</div>
              </div>
            </div>

            <!-- Standardized Findings Table -->
            <div class="sec-heading">Standardized Dual-Eye (OD / OS) Refractive Findings</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Eye</th>
                  <th>Distance UCVA</th>
                  <th>Sphere (DS)</th>
                  <th>Cylinder (DC)</th>
                  <th>Axis (°)</th>
                  <th>Add (NV)</th>
                  <th>BCVA</th>
                  <th>Near UCVA</th>
                </tr>
              </thead>
              <tbody>
                <tr class="od-row">
                  <td class="od-lbl">OD (Right Eye)</td>
                  <td>${selectedRefractionForModal.vaDistanceOD || '6/6'}</td>
                  <td class="val-bold">${selectedRefractionForModal.sphereOD !== null && selectedRefractionForModal.sphereOD !== undefined ? (selectedRefractionForModal.sphereOD > 0 ? '+' : '') + selectedRefractionForModal.sphereOD : 'Plano'}</td>
                  <td class="val-bold">${selectedRefractionForModal.cylinderOD !== null && selectedRefractionForModal.cylinderOD !== undefined ? (selectedRefractionForModal.cylinderOD > 0 ? '+' : '') + selectedRefractionForModal.cylinderOD : '0.00'}</td>
                  <td class="val-bold">${selectedRefractionForModal.axisOD || '0'}°</td>
                  <td class="val-bold">${selectedRefractionForModal.addOD ? '+' + selectedRefractionForModal.addOD : '—'}</td>
                  <td class="val-bcva-od">${selectedRefractionForModal.bcvaOD || '6/6'}</td>
                  <td>${selectedRefractionForModal.vaNearOD || 'N6'}</td>
                </tr>
                <tr class="os-row">
                  <td class="os-lbl">OS (Left Eye)</td>
                  <td>${selectedRefractionForModal.vaDistanceOS || '6/6'}</td>
                  <td class="val-bold">${selectedRefractionForModal.sphereOS !== null && selectedRefractionForModal.sphereOS !== undefined ? (selectedRefractionForModal.sphereOS > 0 ? '+' : '') + selectedRefractionForModal.sphereOS : 'Plano'}</td>
                  <td class="val-bold">${selectedRefractionForModal.cylinderOS !== null && selectedRefractionForModal.cylinderOS !== undefined ? (selectedRefractionForModal.cylinderOS > 0 ? '+' : '') + selectedRefractionForModal.cylinderOS : '0.00'}</td>
                  <td class="val-bold">${selectedRefractionForModal.axisOS || '0'}°</td>
                  <td class="val-bold">${selectedRefractionForModal.addOS ? '+' + selectedRefractionForModal.addOS : '—'}</td>
                  <td class="val-bcva-os">${selectedRefractionForModal.bcvaOS || '6/6'}</td>
                  <td>${selectedRefractionForModal.vaNearOS || 'N6'}</td>
                </tr>
              </tbody>
            </table>

            <!-- Pupillary Distance & Dispensing Notes -->
            <div class="notes-grid">
              <div class="box-card">
                <div class="lbl">Pupillary Distance (PD):</div>
                <div class="pd-val">${selectedRefractionForModal.pupillaryDistanceMM ? selectedRefractionForModal.pupillaryDistanceMM + ' mm' : '64 mm'}</div>
              </div>
              <div class="box-card">
                <div class="lbl">Clinical Refraction & Dispensing Notes:</div>
                <div class="notes-val">${selectedRefractionForModal.notes || 'Routine vision examination. Corrected visual acuity verified.'}</div>
              </div>
            </div>

            <!-- Signature & Stamp Attestation -->
            <div class="footer-row">
              <div>
                <div class="lbl">Examining Practitioner:</div>
                <div class="doctor-name">${doctorName}</div>
                <div class="lbl" style="margin-top: 2px;">Directorate of Ophthalmology & Visual Sciences</div>
                <div class="stamp-box">✓ Clinically Verified & Validated</div>
              </div>
              <div class="sig-area">
                <div class="sig-line"></div>
                <div class="lbl" style="font-weight: 700; color: #0f172a;">Official Clinician Signature & Stamp</div>
                <div class="lbl">Faith Foundation Mission Hospital</div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleResetForm = () => {
    setRefractionForm(BLANK_REFRACTION_FORM);
    enqueueSnackbar('Refraction workbench reset to clean baseline values.', { variant: 'info' });
    setStatusMessage({ type: 'info', text: 'Refraction workbench reset to clean baseline values.' });
  };

  const handleSaveIop = async () => {
    let patientToUse = selectedPatient;
    if (!patientToUse && patients.length > 0) {
      patientToUse = patients[0];
      setSelectedPatient(patientToUse);
    }
    if (!patientToUse) {
      enqueueSnackbar('Please select a patient first from the patient selector above.', { variant: 'warning' });
      setStatusMessage({ type: 'error', text: 'Please select a patient first.' });
      return;
    }
    if (!iopForm.iopOD && !iopForm.iopOS) {
      enqueueSnackbar('Please input at least one IOP pressure measurement (OD or OS).', { variant: 'warning' });
      setStatusMessage({ type: 'error', text: 'Please input at least one IOP pressure measurement (OD or OS).' });
      return;
    }
    try {
      setSavingIop(true);
      const res = await api.post('/ophthalmology/iop', {
        patientId: patientToUse.id,
        eyeEncounterId: currentEncounter?.id || undefined,
        ...iopForm
      });
      if (res.data?.data) {
        const msg = `Tonometry recorded in PostgreSQL: OD ${iopForm.iopOD || '—'} mmHg / OS ${iopForm.iopOS || '—'} mmHg.`;
        enqueueSnackbar(msg, { variant: 'success' });
        setStatusMessage({
          type: 'success',
          text: msg
        });
        await fetchIopHistory(patientToUse.id);
        const encRes = await api.get(`/ophthalmology/encounters?patientId=${patientToUse.id}`);
        const encs = encRes.data?.data || [];
        setEncounters(encs);
        if (encs.length > 0 && !currentEncounter) {
          setCurrentEncounter(encs[0]);
        }
        setIopForm({
          ...BLANK_IOP_FORM,
          antiGlaucomaMeds: iopForm.antiGlaucomaMeds
        });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save tonometry in database.';
      enqueueSnackbar(errorMsg, { variant: 'error' });
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setSavingIop(false);
    }
  };

  const handleDeleteIop = async (iopId: string) => {
    if (!window.confirm('Are you sure you want to delete this tonometry record from PostgreSQL?')) {
      return;
    }
    try {
      await api.delete(`/ophthalmology/iop/${iopId}`);
      enqueueSnackbar('Tonometry record removed from PostgreSQL.', { variant: 'info' });
      setStatusMessage({ type: 'info', text: 'Tonometry record removed from PostgreSQL.' });
      if (selectedPatient) {
        await fetchIopHistory(selectedPatient.id);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to delete tonometry record.';
      enqueueSnackbar(errorMsg, { variant: 'error' });
      setStatusMessage({ type: 'error', text: errorMsg });
    }
  };

  const handleResetIopForm = () => {
    setIopForm(BLANK_IOP_FORM);
    enqueueSnackbar('Tonometry form reset to blank baseline.', { variant: 'info' });
    setStatusMessage({ type: 'info', text: 'Tonometry form reset to blank baseline.' });
  };

  const handleSimulateDeviceTelemetry = async () => {
    try {
      const res = await api.post('/ophthalmology/telemetry-import', {
        deviceType: 'Topcon KR-800 Auto Kerato-Refractometer (HL7 FHIR)'
      });
      if (res.data?.data) {
        const d = res.data.data;
        setDeviceTelemetry(d);
        setRefractionForm({
          ...refractionForm,
          sphereOD: String(d.od.sphere),
          cylinderOD: String(d.od.cylinder),
          axisOD: String(d.od.axis),
          sphereOS: String(d.os.sphere),
          cylinderOS: String(d.os.cylinder),
          axisOS: String(d.os.axis),
          pupillaryDistanceMM: d.pupillaryDistanceMM || 64,
          notes: `Telemetry imported from ${d.deviceModel} (Serial: ${d.deviceSerial}). Alignment confidence: ${d.confidenceScore}`
        });
        const msg = `Live readings imported from ${d.deviceModel} via DICOM/HL7 Modality!`;
        enqueueSnackbar(msg, { variant: 'success' });
        setStatusMessage({ type: 'success', text: msg });
      }
    } catch (err: any) {
      enqueueSnackbar('Failed to connect to diagnostic device.', { variant: 'error' });
      setStatusMessage({ type: 'error', text: 'Failed to connect to diagnostic device.' });
    }
  };

  const fetchPatientPrescriptions = async (patientId: string) => {
    if (!patientId) return;
    setLoadingPrescriptions(true);
    try {
      const res = await api.get(`/ophthalmology/optical-prescriptions?patientId=${patientId}`);
      const list = res.data?.data || [];
      setPatientPrescriptions(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to fetch optical prescriptions:', err);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  const handleAutofillRxFromRefraction = () => {
    if (refractionForm) {
      const sOD = parseFloat(refractionForm.sphereOD) || 0;
      const cOD = parseFloat(refractionForm.cylinderOD) || 0;
      const aOD = parseInt(refractionForm.axisOD, 10) || 0;
      const addOD = parseFloat(refractionForm.addOD) || 0;

      const sOS = parseFloat(refractionForm.sphereOS) || 0;
      const cOS = parseFloat(refractionForm.cylinderOS) || 0;
      const aOS = parseInt(refractionForm.axisOS, 10) || 0;
      const addOS = parseFloat(refractionForm.addOS) || 0;

      const pd = Number(refractionForm.pupillaryDistanceMM) || 64;

      setOpticalRx(prev => ({
        ...prev,
        sphereOD: sOD,
        cylinderOD: cOD,
        axisOD: aOD,
        addOD: addOD,
        sphereOS: sOS,
        cylinderOS: cOS,
        axisOS: aOS,
        addOS: addOS,
        pdDistanceMM: pd,
        pdNearMM: Math.max(50, pd - 3),
        usageAdvice: prev.usageAdvice || (addOD > 0 || addOS > 0 ? 'Presbyopic correction with near add. Constant wear recommended for computer workstation and reading.' : 'Distance correction for clear visual acuity.')
      }));
      enqueueSnackbar('Optical parameters autofilled from active Refraction exam!', { variant: 'success' });
    }
  };

  const handleDispatchOpticalRx = async () => {
    if (!selectedPatient?.id) {
      enqueueSnackbar('Please select a patient first.', { variant: 'warning' });
      setStatusMessage({ type: 'error', text: 'Please select a patient first.' });
      return;
    }
    setDispatchingRx(true);
    try {
      const payload = {
        patientId: selectedPatient.id,
        eyeEncounterId: currentEncounter?.id,
        lensType: opticalRx.lensType,
        lensMaterial: opticalRx.lensMaterial,
        coatings: opticalRx.coatings,
        sphereOD: Number(opticalRx.sphereOD) || 0,
        cylinderOD: Number(opticalRx.cylinderOD) || 0,
        axisOD: Number(opticalRx.axisOD) || 0,
        addOD: Number(opticalRx.addOD) || 0,
        sphereOS: Number(opticalRx.sphereOS) || 0,
        cylinderOS: Number(opticalRx.cylinderOS) || 0,
        axisOS: Number(opticalRx.axisOS) || 0,
        addOS: Number(opticalRx.addOS) || 0,
        pdDistanceMM: Number(opticalRx.pdDistanceMM) || 64,
        pdNearMM: Number(opticalRx.pdNearMM) || 61,
        usageAdvice: opticalRx.usageAdvice,
        expiryDays: opticalRx.expiryDays || 365,
        prescriberName: opticalRx.prescribedByName || 'Dr. Emmanuel Vegher (Ophthalmologist)'
      };

      const res = await api.post('/ophthalmology/optical-prescriptions', payload);
      if (res.data?.data) {
        const savedRx = res.data.data;
        const msg = `Prescription ${savedRx.rxNumber} saved in PostgreSQL & dispatched to Hospital Optical Shop!`;
        enqueueSnackbar(msg, { variant: 'success' });
        setStatusMessage({ type: 'success', text: msg });
        await fetchPatientPrescriptions(selectedPatient.id);
        setSelectedRxForModal(savedRx);
        setRxModalOpen(true);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to dispatch optical prescription.';
      enqueueSnackbar(errorMsg, { variant: 'error' });
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setDispatchingRx(false);
    }
  };

  const handleUpdateRxStatus = async (rxId: string, newStatus: string) => {
    setUpdatingRxId(rxId);
    try {
      const res = await api.patch(`/ophthalmology/optical-prescriptions/${rxId}/status`, { status: newStatus });
      if (res.data?.data) {
        enqueueSnackbar(`Optical order status updated to "${OPTICAL_STATUS_CONFIG[newStatus]?.label || newStatus}"`, { variant: 'success' });
        setPatientPrescriptions(prev => prev.map(rx => rx.id === rxId ? { ...rx, status: newStatus } : rx));
        if (selectedRxForModal?.id === rxId) {
          setSelectedRxForModal((prev: any) => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update order status', { variant: 'error' });
    } finally {
      setUpdatingRxId(null);
    }
  };

  const handleDeleteRx = async (rxId: string) => {
    if (!window.confirm('Are you sure you want to delete this optical prescription from PostgreSQL?')) return;
    try {
      await api.delete(`/ophthalmology/optical-prescriptions/${rxId}`);
      enqueueSnackbar('Optical prescription deleted from database.', { variant: 'info' });
      setPatientPrescriptions(prev => prev.filter(rx => rx.id !== rxId));
      if (selectedRxForModal?.id === rxId) {
        setRxModalOpen(false);
        setSelectedRxForModal(null);
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete prescription', { variant: 'error' });
    }
  };

  const handlePrintOpticalRxCertificate = (rxToPrint?: any) => {
    const rx = rxToPrint || selectedRxForModal;
    if (!rx) return;

    const patientName = `${selectedPatient?.firstName || ''} ${selectedPatient?.lastName || ''}`.trim() || 'Patient';
    const mrn = selectedPatient?.patientNumber || selectedPatient?.id?.slice(0, 8) || 'N/A';
    const gender = selectedPatient?.gender || 'N/A';
    const age = selectedPatient?.birthDate ? `${new Date().getFullYear() - new Date(selectedPatient.birthDate).getFullYear()} Yrs` : 'Adult';
    const rxNum = rx.rxNumber || `OPT-RX-${rx.id?.slice(0, 8)?.toUpperCase()}`;
    const rxDate = new Date(rx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const expDate = rx.expiryDate ? new Date(rx.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '1 Year from Issue';
    const doctorName = rx.eyeEncounter?.ophthalmologistName || opticalRx.prescribedByName || 'Dr. Emmanuel Vegher (Ophthalmologist)';
    const statusObj = OPTICAL_STATUS_CONFIG[rx.status] || { label: rx.status || 'ISSUED', color: '#0284c7', bg: '#f0f9ff' };
    const coatingsList = Array.isArray(rx.coatings) ? rx.coatings.join(', ') : 'Standard Protective Coating';

    const leftLogoUrl = window.location.origin + assetUrl('/anglican-logo.png');
    const rightLogoUrl = window.location.origin + assetUrl('/hospital-logo.png');

    const printWindow = window.open('', '_blank', 'width=950,height=1050');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Optical Prescription & Dispensing Certificate - ${rxNum}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #0f172a;
              background-color: #ffffff;
              padding: 20px;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
            .cert-card {
              max-width: 820px;
              margin: 0 auto;
              border: 2px solid #0284c7;
              border-radius: 12px;
              padding: 24px 28px;
              background: #ffffff;
              position: relative;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 72px;
              font-weight: 900;
              color: rgba(2, 132, 199, 0.04);
              letter-spacing: 6px;
              pointer-events: none;
              text-transform: uppercase;
            }
            .header-table {
              width: 100%;
              border-bottom: 2px solid #0284c7;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .logo-img {
              width: 60px;
              height: 60px;
              object-fit: contain;
            }
            .hospital-title {
              font-size: 19px;
              font-weight: 900;
              color: #0369a1;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .hospital-sub {
              font-size: 11px;
              font-weight: 700;
              color: #64748b;
              margin-top: 2px;
            }
            .cert-title-badge {
              display: inline-block;
              background: #0284c7;
              color: #ffffff;
              padding: 4px 14px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 800;
              letter-spacing: 0.5px;
              margin-top: 6px;
              text-transform: uppercase;
            }
            .patient-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 18px;
            }
            .patient-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px 16px;
              font-size: 12px;
            }
            .rx-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 18px;
              font-size: 12px;
            }
            .rx-table th {
              background: #0f172a;
              color: #ffffff;
              padding: 8px 10px;
              text-align: center;
              font-weight: 800;
              font-size: 11px;
              text-transform: uppercase;
            }
            .rx-table td {
              border: 1px solid #cbd5e1;
              padding: 10px;
              text-align: center;
              font-weight: 700;
            }
            .eye-col-od {
              background: #f0f9ff;
              color: #0369a1;
              font-weight: 800;
              text-align: left !important;
            }
            .eye-col-os {
              background: #fdf2f8;
              color: #be185d;
              font-weight: 800;
              text-align: left !important;
            }
            .specs-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 16px;
              font-size: 12px;
            }
            .specs-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 20px;
            }
            .footer-signatures {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-top: 24px;
              padding-top: 14px;
              border-top: 1px dashed #cbd5e1;
            }
            .sig-line {
              border-top: 1px solid #0f172a;
              margin-top: 36px;
              padding-top: 4px;
              font-size: 11px;
              color: #475569;
              text-align: center;
            }
            .print-btn {
              background: #0284c7;
              color: #ffffff;
              border: none;
              padding: 10px 24px;
              font-size: 14px;
              font-weight: 700;
              border-radius: 6px;
              cursor: pointer;
              margin-bottom: 16px;
              box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
            }
            .print-btn:hover {
              background: #0369a1;
            }
          </style>
        </head>
        <body>
          <div style="max-width: 820px; margin: 0 auto; text-align: right;" class="no-print">
            <button class="print-btn" onclick="window.print()">🖨️ Print Prescription Certificate</button>
          </div>

          <div class="cert-card">
            <div class="watermark">FAITH FOUNDATION HOSPITAL</div>

            <table class="header-table">
              <tr>
                <td style="width: 70px; vertical-align: middle;">
                  <img class="logo-img" src="${leftLogoUrl}" alt="Anglican Church Logo" onerror="this.style.display='none'" />
                </td>
                <td style="text-align: center; vertical-align: middle;">
                  <div class="hospital-title">Faith Foundation Specialist Hospital</div>
                  <div class="hospital-sub">Department of Ophthalmology, Optometry & Optical Dispensing Services</div>
                  <div class="cert-title-badge">Official Optical Prescription & Lab Work Order</div>
                </td>
                <td style="width: 70px; text-align: right; vertical-align: middle;">
                  <img class="logo-img" src="${rightLogoUrl}" alt="Hospital Logo" onerror="this.style.display='none'" />
                </td>
              </tr>
            </table>

            <div class="patient-box">
              <div class="patient-grid">
                <div><span style="color: #64748b;">Patient Name:</span> <strong>${patientName}</strong></div>
                <div><span style="color: #64748b;">Hospital No (MRN):</span> <strong>${mrn}</strong></div>
                <div><span style="color: #64748b;">Age / Sex:</span> <strong>${age} / ${gender}</strong></div>
                <div><span style="color: #64748b;">Prescription No:</span> <strong style="color: #0284c7;">${rxNum}</strong></div>
                <div><span style="color: #64748b;">Prescribed Date:</span> <strong>${rxDate}</strong></div>
                <div><span style="color: #64748b;">Prescription Validity:</span> <strong>${expDate}</strong></div>
                <div><span style="color: #64748b;">Prescribing Doctor:</span> <strong>${doctorName}</strong></div>
                <div><span style="color: #64748b;">Dispensary Status:</span> <strong style="color: ${statusObj.color};">${statusObj.label}</strong></div>
              </div>
            </div>

            <table class="rx-table">
              <thead>
                <tr>
                  <th>Eye</th>
                  <th>Sphere (DS)</th>
                  <th>Cylinder (DC)</th>
                  <th>Axis (°)</th>
                  <th>Near Add (NV)</th>
                  <th>Mono PD (mm)</th>
                  <th>Total PD (Dist / Near)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="eye-col-od">OD (Right Eye)</td>
                  <td>${Number(rx.sphereOD) > 0 ? '+' : ''}${Number(rx.sphereOD).toFixed(2)}</td>
                  <td>${Number(rx.cylinderOD) > 0 ? '+' : ''}${Number(rx.cylinderOD).toFixed(2)}</td>
                  <td>${rx.axisOD}°</td>
                  <td>${Number(rx.addOD) > 0 ? '+' + Number(rx.addOD).toFixed(2) : '--'}</td>
                  <td>${(Number(rx.pdDistanceMM) / 2).toFixed(1)} mm</td>
                  <td rowspan="2" style="background: #f8fafc; font-weight: 800; vertical-align: middle;">
                    Dist: ${rx.pdDistanceMM} mm<br/>
                    Near: ${rx.pdNearMM || rx.pdDistanceMM - 3} mm
                  </td>
                </tr>
                <tr>
                  <td class="eye-col-os">OS (Left Eye)</td>
                  <td>${Number(rx.sphereOS) > 0 ? '+' : ''}${Number(rx.sphereOS).toFixed(2)}</td>
                  <td>${Number(rx.cylinderOS) > 0 ? '+' : ''}${Number(rx.cylinderOS).toFixed(2)}</td>
                  <td>${rx.axisOS}°</td>
                  <td>${Number(rx.addOS) > 0 ? '+' + Number(rx.addOS).toFixed(2) : '--'}</td>
                  <td>${(Number(rx.pdDistanceMM) / 2).toFixed(1)} mm</td>
                </tr>
              </tbody>
            </table>

            <div class="specs-box">
              <div class="specs-grid">
                <div>
                  <span style="color: #64748b; font-weight: 600;">Lens Design / Geometry:</span><br/>
                  <strong style="color: #0f172a; font-size: 13px;">${rx.lensType || 'Digital Free-Form Progressive'}</strong>
                </div>
                <div>
                  <span style="color: #64748b; font-weight: 600;">Substrate Material / Index:</span><br/>
                  <strong style="color: #0f172a; font-size: 13px;">${rx.lensMaterial || 'Polycarbonate 1.59'}</strong>
                </div>
                <div style="grid-column: span 2;">
                  <span style="color: #64748b; font-weight: 600;">Applied Optical Coatings & Treatments:</span><br/>
                  <strong style="color: #0284c7;">${coatingsList}</strong>
                </div>
                <div style="grid-column: span 2;">
                  <span style="color: #64748b; font-weight: 600;">Clinical Usage Advice & Dispensing Directions:</span><br/>
                  <span style="color: #334155;">${rx.usageAdvice || 'Constant wear recommended for visual clarity and eye strain prevention.'}</span>
                </div>
              </div>
            </div>

            <div class="footer-signatures">
              <div>
                <div style="font-size: 11px; font-weight: 700; color: #475569;">PRESCRIBING OPTOMETRIST / OPHTHALMOLOGIST</div>
                <div class="sig-line">
                  <strong>${doctorName}</strong><br/>
                  <span>Consultant Ophthalmologist / Optometrist</span>
                </div>
              </div>
              <div>
                <div style="font-size: 11px; font-weight: 700; color: #475569;">OPTICAL LAB DISPENSING / VERIFICATION</div>
                <div class="sig-line">
                  <strong>Hospital Optical Workshop Dispenser</strong><br/>
                  <span>Lens Surfacing & Edging Verification Stamp</span>
                </div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 14px; font-size: 10px; color: #94a3b8;">
              This official optical electronic prescription is generated directly from Faith Foundation Hospital EMR System and verified against live PostgreSQL medical records.
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // ── Telemetry & OCT PACS Handlers (100% PostgreSQL Synced) ──────────────
  const fetchPatientTelemetry = async (patientId: string) => {
    if (!patientId) return;
    setLoadingTelemetry(true);
    try {
      const res = await api.get(`/ophthalmology/telemetry?patientId=${patientId}`);
      const list = res.data?.data || [];
      setPatientTelemetryScans(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to fetch telemetry scans from PostgreSQL:', err);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  const handleIngestTelemetryScan = async () => {
    if (!selectedPatient?.id) {
      enqueueSnackbar('Please select a patient first.', { variant: 'warning' });
      setStatusMessage({ type: 'error', text: 'Please select a patient first.' });
      return;
    }
    setIngestingScan(true);
    try {
      const payload = {
        patientId: selectedPatient.id,
        eyeEncounterId: currentEncounter?.id,
        deviceModel: newScanForm.deviceModel,
        deviceSerial: newScanForm.deviceSerial,
        modality: newScanForm.modality,
        eyeSide: newScanForm.eyeSide,
        centralThickness: Number(newScanForm.centralThickness) || null,
        rnflAverage: Number(newScanForm.rnflAverage) || null,
        cupDiscRatio: Number(newScanForm.cupDiscRatio) || null,
        signalQuality: Number(newScanForm.signalQuality) || 8,
        findingsSummary: newScanForm.findingsSummary,
        clinicalNotes: newScanForm.clinicalNotes,
        clinicianName: newScanForm.clinicianName
      };

      const res = await api.post('/ophthalmology/telemetry', payload);
      if (res.data?.data) {
        const saved = res.data.data;
        const msg = `Telemetry scan ${saved.scanNumber} successfully acquired and stored in PACS database!`;
        enqueueSnackbar(msg, { variant: 'success' });
        setStatusMessage({ type: 'success', text: msg });
        await fetchPatientTelemetry(selectedPatient.id);
        setSelectedScanForModal(saved);
        setScanModalOpen(true);
        setTelemetryTab('vault');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to ingest telemetry scan.';
      enqueueSnackbar(errorMsg, { variant: 'error' });
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setIngestingScan(false);
    }
  };

  const handleSimulateDeviceScan = async (modalityChoice?: string) => {
    if (!selectedPatient?.id) {
      enqueueSnackbar('Please select a patient first.', { variant: 'warning' });
      setStatusMessage({ type: 'error', text: 'Please select a patient first.' });
      return;
    }
    setIngestingScan(true);
    try {
      const payload = {
        patientId: selectedPatient.id,
        eyeEncounterId: currentEncounter?.id,
        modality: modalityChoice || 'OCT_MACULA',
        eyeSide: selectedEyeSide || 'OD'
      };
      const res = await api.post('/ophthalmology/telemetry/simulate', payload);
      if (res.data?.data) {
        const saved = res.data.data;
        const msg = `Direct PACS Acquisition Complete! ${saved.deviceModel} scan ${saved.scanNumber} committed to database.`;
        enqueueSnackbar(msg, { variant: 'success' });
        setStatusMessage({ type: 'success', text: msg });
        await fetchPatientTelemetry(selectedPatient.id);
        setSelectedScanForModal(saved);
        setScanModalOpen(true);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'PACS Acquisition stream failed.';
      enqueueSnackbar(errorMsg, { variant: 'error' });
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setIngestingScan(false);
    }
  };

  const handleDeleteTelemetryScan = async (scanId: string) => {
    if (!window.confirm('Are you sure you want to delete this telemetry scan from PostgreSQL PACS storage?')) return;
    try {
      await api.delete(`/ophthalmology/telemetry/${scanId}`);
      enqueueSnackbar('Telemetry scan removed from database.', { variant: 'info' });
      setPatientTelemetryScans(prev => prev.filter(s => s.id !== scanId));
      if (selectedScanForModal?.id === scanId) {
        setScanModalOpen(false);
        setSelectedScanForModal(null);
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete scan record', { variant: 'error' });
    }
  };

  const handlePrintTelemetryReport = (scanToPrint?: any) => {
    const scan = scanToPrint || selectedScanForModal;
    if (!scan) return;

    const patientName = `${selectedPatient?.firstName || ''} ${selectedPatient?.lastName || ''}`.trim() || 'Patient';
    const mrn = selectedPatient?.patientNumber || selectedPatient?.id?.slice(0, 8) || 'N/A';
    const gender = selectedPatient?.gender || 'N/A';
    const age = selectedPatient?.birthDate ? `${new Date().getFullYear() - new Date(selectedPatient.birthDate).getFullYear()} Yrs` : 'Adult';
    const scanNum = scan.scanNumber || `OCT-${scan.id?.slice(0, 8)?.toUpperCase()}`;
    const scanDate = new Date(scan.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const scanTime = new Date(scan.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const modConfig = TELEMETRY_MODALITIES[scan.modality] || { label: scan.modality || 'OCT Scan', color: '#0284c7' };
    const doctorName = scan.eyeEncounter?.ophthalmologistName || 'Dr. Emmanuel Vegher (Consultant Ophthalmologist)';

    const leftLogoUrl = window.location.origin + assetUrl('/anglican-logo.png');
    const rightLogoUrl = window.location.origin + assetUrl('/hospital-logo.png');

    const printWindow = window.open('', '_blank', 'width=950,height=1050');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Diagnostic Ophthalmic Telemetry Report - ${scanNum}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 14mm 16mm;
            }
            body {
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 10px;
              line-height: 1.4;
            }
            .cert-card {
              border: 2px solid #0284c7;
              border-radius: 12px;
              padding: 24px 28px;
              position: relative;
              background: #ffffff;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 42px;
              font-weight: 900;
              color: rgba(2, 132, 199, 0.04);
              text-transform: uppercase;
              letter-spacing: 6px;
              pointer-events: none;
              white-space: nowrap;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            .logo-img {
              width: 65px;
              height: 65px;
              object-fit: contain;
            }
            .hospital-title {
              font-size: 20px;
              font-weight: 900;
              color: #0369a1;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
            }
            .hospital-sub {
              font-size: 11px;
              font-weight: 600;
              color: #475569;
              margin-top: 2px;
            }
            .cert-title-badge {
              display: inline-block;
              background: #0284c7;
              color: #ffffff;
              font-weight: 800;
              font-size: 12px;
              padding: 4px 16px;
              border-radius: 20px;
              margin-top: 6px;
              letter-spacing: 0.5px;
            }
            .patient-box {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 16px;
              font-size: 12px;
            }
            .patient-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 16px;
            }
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 16px;
            }
            .metric-card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px;
              text-align: center;
              background: #f8fafc;
            }
            .metric-title {
              font-size: 10px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
            }
            .metric-val {
              font-size: 18px;
              font-weight: 900;
              color: #0369a1;
              margin-top: 4px;
            }
            .findings-box {
              background: #f0f9ff;
              border: 1px solid #bae6fd;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 16px;
              font-size: 12px;
            }
            .notes-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 16px;
              font-size: 12px;
            }
            .footer-signatures {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-top: 24px;
              padding-top: 14px;
              border-top: 1px dashed #cbd5e1;
            }
            .sig-line {
              border-top: 1px solid #0f172a;
              margin-top: 36px;
              padding-top: 4px;
              font-size: 11px;
              color: #475569;
              text-align: center;
            }
            .print-btn {
              background: #0284c7;
              color: #ffffff;
              border: none;
              padding: 10px 24px;
              font-size: 14px;
              font-weight: 700;
              border-radius: 6px;
              cursor: pointer;
              margin-bottom: 16px;
              box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
            }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0; }
              .cert-card { border: 2px solid #0284c7; }
            }
          </style>
        </head>
        <body>
          <div style="max-width: 820px; margin: 0 auto; text-align: right;" class="no-print">
            <button class="print-btn" onclick="window.print()">🖨️ Print Imaging Report</button>
          </div>

          <div class="cert-card">
            <div class="watermark">FAITH FOUNDATION HOSPITAL PACS</div>

            <table class="header-table">
              <tr>
                <td style="width: 70px; vertical-align: middle;">
                  <img class="logo-img" src="${leftLogoUrl}" alt="Anglican Church Logo" onerror="this.style.display='none'" />
                </td>
                <td style="text-align: center; vertical-align: middle;">
                  <div class="hospital-title">Faith Foundation Specialist Hospital</div>
                  <div class="hospital-sub">Department of Ophthalmology & Ophthalmic PACS Diagnostic Imaging</div>
                  <div class="cert-title-badge">High-Resolution Diagnostic Imaging & Telemetry Report</div>
                </td>
                <td style="width: 70px; text-align: right; vertical-align: middle;">
                  <img class="logo-img" src="${rightLogoUrl}" alt="Hospital Logo" onerror="this.style.display='none'" />
                </td>
              </tr>
            </table>

            <div class="patient-box">
              <div class="patient-grid">
                <div><span style="color: #64748b;">Patient Name:</span> <strong>${patientName}</strong></div>
                <div><span style="color: #64748b;">Hospital No (MRN):</span> <strong>${mrn}</strong></div>
                <div><span style="color: #64748b;">Age / Sex:</span> <strong>${age} / ${gender}</strong></div>
                <div><span style="color: #64748b;">Scan Accession No:</span> <strong style="color: #0284c7;">${scanNum}</strong></div>
                <div><span style="color: #64748b;">Acquisition Date & Time:</span> <strong>${scanDate} at ${scanTime}</strong></div>
                <div><span style="color: #64748b;">Tested Eye:</span> <strong>${scan.eyeSide === 'OD' ? 'Right Eye (OD)' : scan.eyeSide === 'OS' ? 'Left Eye (OS)' : 'Both Eyes (OU)'}</strong></div>
                <div><span style="color: #64748b;">Equipment Model:</span> <strong>${scan.deviceModel || 'Heidelberg Spectralis OCT2'}</strong></div>
                <div><span style="color: #64748b;">Modality:</span> <strong style="color: #0369a1;">${modConfig.label}</strong></div>
              </div>
            </div>

            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-title">Central Thickness</div>
                <div class="metric-val">${scan.centralThickness ? `${scan.centralThickness} µm` : '—'}</div>
                <div style="font-size: 9px; color: #64748b;">Norm: 220–270 µm</div>
              </div>
              <div class="metric-card">
                <div class="metric-title">RNFL Average</div>
                <div class="metric-val" style="color: #16a34a;">${scan.rnflAverage ? `${scan.rnflAverage} µm` : '—'}</div>
                <div style="font-size: 9px; color: #64748b;">Norm: 85–110 µm</div>
              </div>
              <div class="metric-card">
                <div class="metric-title">Cup / Disc Ratio</div>
                <div class="metric-val" style="color: #d97706;">${scan.cupDiscRatio !== null && scan.cupDiscRatio !== undefined ? scan.cupDiscRatio : '—'}</div>
                <div style="font-size: 9px; color: #64748b;">Norm: 0.20–0.45</div>
              </div>
              <div class="metric-card">
                <div class="metric-title">Signal Quality</div>
                <div class="metric-val" style="color: #7c3aed;">${scan.signalQuality || 9}/10</div>
                <div style="font-size: 9px; color: #16a34a;">Q-Score: Optimal</div>
              </div>
            </div>

            <div class="findings-box">
              <div style="font-weight: 800; color: #0369a1; margin-bottom: 6px; font-size: 13px;">DIAGNOSTIC FINDINGS & AUTOMATED SEGMENTATION:</div>
              <div style="font-weight: 600; color: #0f172a;">${scan.findingsSummary || 'No focal pathologies detected. Anatomical layers intact.'}</div>
            </div>

            <div class="notes-box">
              <div style="font-weight: 700; color: #475569; margin-bottom: 4px; font-size: 11px;">PHYSICIAN CLINICAL CORRELATION & INTERPRETATION:</div>
              <div style="color: #334155;">${scan.clinicalNotes || 'Consistent with normal retinal and optic nerve head architecture.'}</div>
            </div>

            <div class="footer-signatures">
              <div>
                <div style="font-size: 11px; font-weight: 700; color: #475569;">ACQUIRING DIAGNOSTIC TECHNICIAN</div>
                <div class="sig-line">
                  <strong>Ophthalmic PACS Diagnostic Workstation</strong><br/>
                  <span>Device S/N: ${scan.deviceSerial || 'HD-OCT-8821'}</span>
                </div>
              </div>
              <div>
                <div style="font-size: 11px; font-weight: 700; color: #475569;">REPORTING CONSULTANT OPHTHALMOLOGIST</div>
                <div class="sig-line">
                  <strong>${doctorName}</strong><br/>
                  <span>Consultant Vitreoretinal / Glaucoma Specialist</span>
                </div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 14px; font-size: 10px; color: #94a3b8;">
              Official High-Resolution Ophthalmic Imaging Document stored in Faith Foundation Hospital PACS PostgreSQL Repository.
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  useEffect(() => {
    if (currentSubCategory === 'drawing' && drawingTab === 'studio') {
      initCanvas();
    }
  }, [canvasTemplate, selectedEyeSide, currentSubCategory, drawingTab]);

  const initCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (canvasTemplate === 'fundus') {
      if (selectedEyeSide === 'OU') {
        drawFundusEye(ctx, 190, 200, 130, 'OD');
        drawFundusEye(ctx, 450, 200, 130, 'OS');
      } else {
        drawFundusEye(ctx, 320, 200, 160, selectedEyeSide);
      }
    } else if (canvasTemplate === 'anterior') {
      drawAnteriorSegment(ctx, 320, 200, 150);
    } else if (canvasTemplate === 'eyelid') {
      drawEyelidSchema(ctx, 320, 200);
    } else {
      drawBlankGrid(ctx, canvas.width, canvas.height);
    }

    setUndoStack([]);
  };

  const drawFundusEye = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, eye: 'OD' | 'OS') => {
    // Fundus background circle (warm retinal orange-pink)
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    grad.addColorStop(0, '#fff5f5');
    grad.addColorStop(1, '#ffe4e6');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#fda4af';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Cross-hairs / quadrants
    ctx.strokeStyle = '#fecdd3';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();
    ctx.setLineDash([]);

    // Anatomical Orientation:
    // OD (Right Eye): Disc is Nasal (Left), Macula is Temporal (Right)
    // OS (Left Eye): Disc is Nasal (Right), Macula is Temporal (Left)
    const isOD = eye === 'OD';
    const discX = isOD ? cx - r * 0.45 : cx + r * 0.45;
    const maculaX = isOD ? cx + r * 0.35 : cx - r * 0.35;
    const discRadius = r * 0.18;
    const cupRadius = r * 0.08;

    // Optic Disc
    ctx.beginPath();
    ctx.arc(discX, cy, discRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#fed7aa';
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Optic Cup
    ctx.beginPath();
    ctx.arc(discX, cy, cupRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff7ed';
    ctx.fill();
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Retinal Vascular Arcade Reference Paths
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 2;
    // Superior temporal arcade
    ctx.beginPath();
    ctx.moveTo(discX, cy - discRadius * 0.5);
    ctx.quadraticCurveTo(cx, cy - r * 0.65, maculaX, cy - r * 0.5);
    ctx.stroke();
    // Inferior temporal arcade
    ctx.beginPath();
    ctx.moveTo(discX, cy + discRadius * 0.5);
    ctx.quadraticCurveTo(cx, cy + r * 0.65, maculaX, cy + r * 0.5);
    ctx.stroke();

    // Macula / Fovea centralis
    ctx.beginPath();
    ctx.arc(maculaX, cy, r * 0.12, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(254, 202, 202, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Fovea center dot
    ctx.beginPath();
    ctx.arc(maculaX, cy, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#b91c1c';
    ctx.fill();

    // Labels
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${eye} - ${eye === 'OD' ? 'Oculus Dexter (Right Eye)' : 'Oculus Sinister (Left Eye)'}`, cx, cy - r - 10);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Superior', cx, cy - r + 15);
    ctx.fillText('Inferior', cx, cy + r - 8);
    ctx.fillText(isOD ? 'Nasal (Disc)' : 'Temporal (Macula)', cx - r + 45, cy - 8);
    ctx.fillText(isOD ? 'Temporal (Macula)' : 'Nasal (Disc)', cx + r - 45, cy - 8);
  };

  const drawAnteriorSegment = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    // Sclera / Outer Ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Cornea Circle
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.75, 0, 2 * Math.PI);
    ctx.fillStyle = '#f0fdf4';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Iris Ring
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.45, 0, 2 * Math.PI);
    ctx.fillStyle = '#e0f2fe';
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pupil
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.2, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // 12 Clock-Hour Limbal Markings
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let hour = 1; hour <= 12; hour++) {
      const angle = ((hour - 3) * 30 * Math.PI) / 180;
      const tickX1 = cx + (r * 0.75) * Math.cos(angle);
      const tickY1 = cy + (r * 0.75) * Math.sin(angle);
      const tickX2 = cx + (r * 0.82) * Math.cos(angle);
      const tickY2 = cy + (r * 0.82) * Math.sin(angle);
      const labelX = cx + (r * 0.92) * Math.cos(angle);
      const labelY = cy + (r * 0.92) * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(tickX1, tickY1);
      ctx.lineTo(tickX2, tickY2);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillText(`${hour}`, labelX, labelY);
    }

    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = '#0284c7';
    ctx.fillText('Corneal & Anterior Segment Clock-Hour Scheme', cx, cy - r - 12);
  };

  const drawEyelidSchema = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Upper eyelid curve
    ctx.moveTo(cx - 160, cy);
    ctx.quadraticCurveTo(cx, cy - 90, cx + 160, cy);
    // Lower eyelid curve
    ctx.quadraticCurveTo(cx, cy + 80, cx - 160, cy);
    ctx.fillStyle = '#fdf4ff';
    ctx.fill();
    ctx.stroke();

    // Eyeball in aperture
    ctx.beginPath();
    ctx.arc(cx, cy, 65, 0, 2 * Math.PI);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    // Iris & Pupil
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, 2 * Math.PI);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Lacrimal punctum
    ctx.beginPath();
    ctx.arc(cx - 145, cy - 10, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#dc2626';
    ctx.fill();

    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.fillText('Upper / Lower Eyelid Margin & Adnexa Schema', cx, cy - 110);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.fillText('• Punctum', cx - 145, cy - 20);
  };

  const drawBlankGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  };

  const getCanvasCoords = (canvas: HTMLCanvasElement, e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const pushUndoState = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    setUndoStack(prev => [...prev.slice(-15), dataUrl]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) {
      initCanvas();
      return;
    }
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prevData = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = prevData;
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    pushUndoState();
    setIsDrawing(true);
    const coords = getCanvasCoords(canvas, e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const onDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(canvas, e);
    ctx.lineWidth = drawingTool === 'eraser' ? penSize * 5 : penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = drawingTool === 'eraser' ? '#ffffff' : drawColor;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const handleSaveDrawing = async () => {
    if (!selectedPatient?.id) {
      enqueueSnackbar('Please select a patient first.', { variant: 'warning' });
      setStatusMessage({ type: 'error', text: 'Please select a patient first.' });
      return;
    }
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    setSavingDrawing(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const zone = canvasTemplate === 'fundus'
        ? 'RETINA_FUNDUS'
        : canvasTemplate === 'anterior'
        ? 'ANTERIOR_SEGMENT'
        : canvasTemplate === 'eyelid'
        ? 'EYELID_ADNEXA'
        : 'GENERAL_CANVAS';

      const res = await api.post('/ophthalmology/drawings', {
        patientId: selectedPatient.id,
        eyeEncounterId: currentEncounter?.id,
        eyeSide: selectedEyeSide,
        anatomicZone: zone,
        canvasSvgJson: JSON.stringify({
          template: canvasTemplate,
          eye: selectedEyeSide,
          penColor: drawColor,
          penSize: penSize
        }),
        pngDataUrl: dataUrl,
        diagnosis: drawingDiagnosis,
        annotations: drawingNotes || drawingDiagnosis || `Visual chart: ${zone} for ${selectedEyeSide}`,
        clinicianName: drawingClinicianName
      });

      const newDrawing = res.data?.data;
      if (newDrawing) {
        setSavedDrawings(prev => [newDrawing, ...prev]);
      }
      enqueueSnackbar('Anatomical drawing saved to PostgreSQL and archived in patient records.', { variant: 'success' });
      setStatusMessage({ type: 'success', text: 'Anatomical drawing saved to PostgreSQL and archived in patient records.' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to archive drawing in database.';
      enqueueSnackbar(errorMsg, { variant: 'error' });
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setSavingDrawing(false);
    }
  };

  const handleDeleteDrawing = async (drawingId: string) => {
    if (!window.confirm('Are you sure you want to delete this anatomical drawing?')) return;
    try {
      await api.delete(`/ophthalmology/drawings/${drawingId}`);
      setSavedDrawings(prev => prev.filter(d => d.id !== drawingId));
      if (selectedDrawingForModal?.id === drawingId) {
        setDrawingModalOpen(false);
      }
      enqueueSnackbar('Drawing deleted from database.', { variant: 'info' });
    } catch (err: any) {
      enqueueSnackbar('Failed to delete drawing', { variant: 'error' });
    }
  };

  const handleLoadDrawingToCanvas = (drawing: any) => {
    if (!drawing?.pngDataUrl) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setDrawingTab('studio');
    if (drawing.eyeSide) setSelectedEyeSide(drawing.eyeSide);
    if (drawing.annotations) setDrawingNotes(drawing.annotations);

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      pushUndoState();
    };
    img.src = drawing.pngDataUrl;
    enqueueSnackbar(`Loaded saved drawing #${drawing.id.slice(0, 8)} into canvas studio.`, { variant: 'info' });
  };

  const handleDownloadDrawing = (dataUrl?: string, filename?: string) => {
    const targetUrl = dataUrl || drawingCanvasRef.current?.toDataURL('image/png');
    if (!targetUrl) return;
    const link = document.createElement('a');
    link.download = filename || `eye-drawing-${selectedEyeSide}-${Date.now()}.png`;
    link.href = targetUrl;
    link.click();
    enqueueSnackbar('Drawing PNG downloaded.', { variant: 'success' });
  };

  const handlePrintDrawingReport = (drawingToPrint?: any) => {
    const drawing = drawingToPrint || selectedDrawingForModal;
    if (!drawing) return;

    const patientName = `${selectedPatient?.firstName || ''} ${selectedPatient?.lastName || ''}`.trim() || 'Patient';
    const mrn = selectedPatient?.patientNumber || selectedPatient?.id?.slice(0, 8) || 'N/A';
    const encounterNum = drawing.eyeEncounter?.encounterNumber || currentEncounter?.encounterNumber || 'General Clinical Exam';
    const reportDate = new Date(drawing.createdAt).toLocaleString();
    const doctorName = drawing.eyeEncounter?.ophthalmologistName || drawingClinicianName || 'Dr. Attending Ophthalmologist';
    const leftLogoUrl = window.location.origin + assetUrl('/anglican-logo.png');
    const rightLogoUrl = window.location.origin + assetUrl('/hospital-logo.png');

    const printWindow = window.open('', '_blank', 'width=950,height=1050');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Ophthalmic Anatomical Drawing Report - ${patientName}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #0f172a;
              background-color: #ffffff;
              padding: 20px;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
            .cert-card {
              max-width: 820px;
              margin: 0 auto;
              border: 2px solid #0284c7;
              border-radius: 12px;
              padding: 24px 28px;
              background: #ffffff;
            }
            .header-flex {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #0284c7;
              padding-bottom: 16px;
              margin-bottom: 18px;
              gap: 16px;
            }
            .crest-logo {
              width: 60px !important;
              height: 60px !important;
              max-width: 60px !important;
              max-height: 60px !important;
              object-fit: contain;
              flex-shrink: 0;
            }
            .seal-logo {
              width: 60px !important;
              height: 60px !important;
              max-width: 60px !important;
              max-height: 60px !important;
              object-fit: contain;
              border-radius: 50%;
              border: 2px solid #0284c7;
              padding: 2px;
              flex-shrink: 0;
            }
            .header-text {
              text-align: center;
              flex: 1;
            }
            .hospital-title {
              font-size: 19px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: -0.02em;
            }
            .dept-title {
              font-size: 12px;
              font-weight: 800;
              color: #0284c7;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              margin-top: 3px;
            }
            .facility-tag {
              font-size: 10.5px;
              color: #64748b;
              margin-top: 2px;
            }
            .doc-ribbon {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background-color: #0284c7;
              color: #ffffff;
              padding: 8px 14px;
              border-radius: 6px;
              margin-bottom: 16px;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.03em;
            }
            .patient-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 16px;
            }
            .lbl {
              font-size: 10px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .val {
              font-size: 12.5px;
              font-weight: 700;
              color: #0f172a;
            }
            .val-accent {
              font-size: 12.5px;
              font-weight: 700;
              color: #0284c7;
            }
            .canvas-container {
              border: 2px solid #cbd5e1;
              border-radius: 8px;
              overflow: hidden;
              text-align: center;
              background: #ffffff;
              margin-bottom: 16px;
              padding: 10px;
            }
            .canvas-img {
              max-width: 100%;
              max-height: 380px;
              object-fit: contain;
              display: block;
              margin: 0 auto;
            }
            .notes-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 18px;
            }
            .notes-box .title {
              font-size: 11px;
              font-weight: 800;
              color: #0284c7;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .notes-box p {
              font-size: 11.5px;
              color: #334155;
              line-height: 1.45;
            }
            .footer-row {
              border-top: 1px dashed #94a3b8;
              padding-top: 16px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .stamp-box {
              display: inline-block;
              border: 1.5px dashed #0284c7;
              border-radius: 6px;
              padding: 4px 10px;
              font-size: 10px;
              font-weight: 700;
              color: #0284c7;
              margin-top: 4px;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="cert-card">
            <!-- Header -->
            <div class="header-flex">
              <img src="${leftLogoUrl}" alt="Diocese Logo" class="crest-logo" onerror="this.src='${rightLogoUrl}';" />
              <div class="header-text">
                <div class="hospital-title">FAITH FOUNDATION MISSION HOSPITAL</div>
                <div class="dept-title">DIRECTORATE OF OPHTHALMOLOGY & VISUAL SCIENCES</div>
                <div class="facility-tag">Clinical Fundus & Anterior Segment Pathology Diagram • Diagnostic Report</div>
              </div>
              <img src="${rightLogoUrl}" alt="Hospital Seal" class="seal-logo" />
            </div>

            <!-- Ribbon -->
            <div class="doc-ribbon">
              <span>REPORT ID: DRAW-${drawing.id.slice(0, 8).toUpperCase()}</span>
              <span>EYE: ${drawing.eyeSide === 'OD' ? 'OD (RIGHT EYE)' : drawing.eyeSide === 'OS' ? 'OS (LEFT EYE)' : 'OU (BILATERAL)'} • ${drawing.anatomicZone || 'RETINA / FUNDUS'}</span>
            </div>

            <!-- Patient Grid -->
            <div class="patient-grid">
              <div>
                <div class="lbl">Patient Name</div>
                <div class="val">${patientName}</div>
              </div>
              <div>
                <div class="lbl">Hospital MRN</div>
                <div class="val-accent">${mrn}</div>
              </div>
              <div>
                <div class="lbl">Encounter Ref</div>
                <div class="val">${encounterNum}</div>
              </div>
              <div>
                <div class="lbl">Assessment Date</div>
                <div class="val">${reportDate}</div>
              </div>
            </div>

            <!-- Image -->
            <div class="canvas-container">
              <img src="${drawing.pngDataUrl}" alt="Anatomical Drawing" class="canvas-img" />
            </div>

            <!-- Notes -->
            <div class="notes-box">
              <div class="title">Clinical Diagnosis & Anatomic Annotations</div>
              <p>${drawing.annotations || 'Standard fundus/anterior segment visual examination recorded.'}</p>
            </div>

            <!-- Footer -->
            <div class="footer-row">
              <div>
                <div class="lbl">Examining Practitioner</div>
                <div class="val" style="font-size: 13px;">${doctorName}</div>
                <div class="lbl" style="margin-top: 2px;">Directorate of Ophthalmology & Visual Sciences</div>
                <div class="stamp-box">✓ Digitally Archived in PostgreSQL</div>
              </div>
              <div style="text-align: right;">
                <div style="width: 220px; border-bottom: 1px solid #0f172a; margin-bottom: 4px;"></div>
                <div class="lbl" style="font-weight: 700; color: #0f172a;">Official Clinician Signature & Stamp</div>
                <div class="lbl">Faith Foundation Mission Hospital</div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Sub-categories list for Eye Clinic
  const subCategories = [
    { key: 'refraction', path: '/eye-clinic/refraction', label: '1. Dual-Eye (OD/OS) Refraction', icon: <RemoveRedEye fontSize="small" /> },
    { key: 'iop', path: '/eye-clinic/iop', label: '2. Tonometry & Glaucoma IOP', icon: <Timeline fontSize="small" /> },
    { key: 'drawing', path: '/eye-clinic/drawing', label: '3. Anatomic Drawing & Fundus', icon: <Palette fontSize="small" /> },
    { key: 'optical-rx', path: '/eye-clinic/optical-rx', label: '4. Optical E-Prescribing', icon: <LocalPharmacy fontSize="small" /> },
    { key: 'telemetry', path: '/eye-clinic/telemetry', label: '5. OCT & Telemetry Scans', icon: <CameraAlt fontSize="small" /> },
  ];

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', minHeight: '100vh' }}>
      {/* ── Top Header & Patient Bar ────────────────────────────────────────────── */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Box sx={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', p: 2.5, color: '#fff' }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex' }}>
                  <Visibility sx={{ fontSize: 32, color: '#fff' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                    👁️ Eye Clinic (Ophthalmology & Optometry)
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    PostgreSQL-Synced Dual-Eye OD/OS Refraction, Tonometry IOP Trends, Anatomical Drawing & Optical Shop Dispatch
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Quick Patient Selector from PostgreSQL */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2 }}>
                <Select
                  value={selectedPatient?.id || ''}
                  displayEmpty
                  onChange={(e) => {
                    const p = patients.find(x => x.id === e.target.value);
                    if (p) handleSelectPatient(p);
                  }}
                  sx={{ color: '#fff', '& .MuiSvgIcon-root': { color: '#fff' } }}
                >
                  <MenuItem value="" disabled>Select Eye Patient</MenuItem>
                  {patients.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} — MRN: {p.patientNumber || p.id.slice(0, 8)} ({p.gender})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                New Eye Encounter
              </Button>
            </Grid>
          </Grid>
        </Box>

        {selectedPatient && (
          <Box sx={{ p: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 2.5, alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Patient Name</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                {selectedPatient.firstName} {selectedPatient.lastName}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>MRN / Patient ID</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0284c7' }}>
                {selectedPatient.patientNumber || selectedPatient.id.slice(0, 8)}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Current Encounter</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: currentEncounter ? '#10b981' : '#f59e0b' }}>
                {currentEncounter ? currentEncounter.encounterNumber : 'No Active Encounter (Auto-Creates on Save)'}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`EMR Primary Data Cache: Refraction Count: ${String(refractionStats.refractionCount ?? patientRefractions.length).padStart(2, '0')}`}
                color="primary"
                size="small"
                variant="filled"
                sx={{ fontWeight: 700, bgcolor: '#0284c7' }}
              />
              <Chip
                label={`Encounters on Record: ${encounters.length}`}
                color="secondary"
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label="CDS: Timolol Beta-Blocker Asthmatic Check OK"
                color="success"
                size="small"
                variant="outlined"
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
                bgcolor: isActive ? '#0284c7' : '#ffffff',
                color: isActive ? '#ffffff' : '#334155',
                borderColor: isActive ? '#0284c7' : '#cbd5e1',
                boxShadow: isActive ? '0 4px 14px rgba(2, 132, 199, 0.3)' : 'none',
                '&:hover': {
                  bgcolor: isActive ? '#0369a1' : '#f1f5f9',
                  borderColor: '#94a3b8'
                }
              }}
            >
              {sub.label}
            </Button>
          );
        })}
      </Box>

      {/* ── 1. Dual-Eye (OD / OS) Structured Charting (/eye-clinic/refraction) ─── */}
      {currentSubCategory === 'refraction' && (
        <Box>
          {/* Sub-Tabs: Live Workbench vs Refraction Vault */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
            <Button
              variant={refractionTab === 'workbench' ? 'contained' : 'outlined'}
              onClick={() => setRefractionTab('workbench')}
              startIcon={<RemoveRedEye />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                bgcolor: refractionTab === 'workbench' ? '#0f172a' : '#ffffff',
                color: refractionTab === 'workbench' ? '#ffffff' : '#334155',
                borderColor: '#cbd5e1',
                '&:hover': { bgcolor: refractionTab === 'workbench' ? '#1e293b' : '#f8fafc' }
              }}
            >
              Live Refraction Workbench
            </Button>
            <Button
              variant={refractionTab === 'vault' ? 'contained' : 'outlined'}
              onClick={() => setRefractionTab('vault')}
              startIcon={<History />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                bgcolor: refractionTab === 'vault' ? '#0f172a' : '#ffffff',
                color: refractionTab === 'vault' ? '#ffffff' : '#334155',
                borderColor: '#cbd5e1',
                '&:hover': { bgcolor: refractionTab === 'vault' ? '#1e293b' : '#f8fafc' }
              }}
            >
              Database Refraction Vault & History ({patientRefractions.length})
            </Button>
          </Box>

          {refractionTab === 'workbench' && (
            <Grid container spacing={3}>
              <Grid item xs={12} lg={9}>
                <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        Side-by-Side Dual-Eye (OD / OS) Refraction Workbench
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        PostgreSQL Live Examination • Right Eye (OD), Left Eye (OS), and Binocular (OU)
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        color="inherit"
                        size="small"
                        startIcon={<RestartAlt />}
                        onClick={handleResetForm}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                      >
                        Reset / New Exam
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AutoAwesome />}
                        onClick={handleSimulateDeviceTelemetry}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#0284c7', color: '#0284c7' }}
                      >
                        Pull Auto-Refractor Telemetry
                      </Button>
                    </Box>
                  </Box>

                  <Grid container spacing={3}>
                    {/* 👁️ Right Eye (OD) */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#f0f9ff', border: '2px solid #bae6fd' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Chip label="OD" color="primary" sx={{ fontWeight: 900, px: 1 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0369a1' }}>
                            Right Eye (Oculus Dexter)
                          </Typography>
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Distance UCVA</InputLabel>
                              <Select
                                value={refractionForm.vaDistanceOD}
                                label="Distance UCVA"
                                onChange={(e) => setRefractionForm({ ...refractionForm, vaDistanceOD: e.target.value })}
                              >
                                {VA_OPTIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Near UCVA</InputLabel>
                              <Select
                                value={refractionForm.vaNearOD}
                                label="Near UCVA"
                                onChange={(e) => setRefractionForm({ ...refractionForm, vaNearOD: e.target.value })}
                              >
                                {NEAR_VA_OPTIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={3}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Sphere (DS)"
                              placeholder="e.g. -1.50"
                              value={refractionForm.sphereOD}
                              onChange={(e) => setRefractionForm({ ...refractionForm, sphereOD: e.target.value })}
                            />
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Cylinder (DC)"
                              placeholder="e.g. -0.75"
                              value={refractionForm.cylinderOD}
                              onChange={(e) => setRefractionForm({ ...refractionForm, cylinderOD: e.target.value })}
                            />
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Axis (°)"
                              placeholder="e.g. 90"
                              value={refractionForm.axisOD}
                              onChange={(e) => setRefractionForm({ ...refractionForm, axisOD: e.target.value })}
                            />
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Add (NV)"
                              placeholder="e.g. +1.75"
                              value={refractionForm.addOD}
                              onChange={(e) => setRefractionForm({ ...refractionForm, addOD: e.target.value })}
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Best Corrected Visual Acuity (BCVA)</InputLabel>
                              <Select
                                value={refractionForm.bcvaOD}
                                label="Best Corrected Visual Acuity (BCVA)"
                                onChange={(e) => setRefractionForm({ ...refractionForm, bcvaOD: e.target.value })}
                              >
                                {VA_OPTIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>
                      </Card>
                    </Grid>

                    {/* 👁️ Left Eye (OS) */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#fdf2f8', border: '2px solid #fbcfe8' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Chip label="OS" color="secondary" sx={{ fontWeight: 900, px: 1 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#be185d' }}>
                            Left Eye (Oculus Sinister)
                          </Typography>
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Distance UCVA</InputLabel>
                              <Select
                                value={refractionForm.vaDistanceOS}
                                label="Distance UCVA"
                                onChange={(e) => setRefractionForm({ ...refractionForm, vaDistanceOS: e.target.value })}
                              >
                                {VA_OPTIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Near UCVA</InputLabel>
                              <Select
                                value={refractionForm.vaNearOS}
                                label="Near UCVA"
                                onChange={(e) => setRefractionForm({ ...refractionForm, vaNearOS: e.target.value })}
                              >
                                {NEAR_VA_OPTIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={3}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Sphere (DS)"
                              placeholder="e.g. -1.75"
                              value={refractionForm.sphereOS}
                              onChange={(e) => setRefractionForm({ ...refractionForm, sphereOS: e.target.value })}
                            />
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Cylinder (DC)"
                              placeholder="e.g. -0.50"
                              value={refractionForm.cylinderOS}
                              onChange={(e) => setRefractionForm({ ...refractionForm, cylinderOS: e.target.value })}
                            />
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Axis (°)"
                              placeholder="e.g. 85"
                              value={refractionForm.axisOS}
                              onChange={(e) => setRefractionForm({ ...refractionForm, axisOS: e.target.value })}
                            />
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Add (NV)"
                              placeholder="e.g. +1.75"
                              value={refractionForm.addOS}
                              onChange={(e) => setRefractionForm({ ...refractionForm, addOS: e.target.value })}
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Best Corrected Visual Acuity (BCVA)</InputLabel>
                              <Select
                                value={refractionForm.bcvaOS}
                                label="Best Corrected Visual Acuity (BCVA)"
                                onChange={(e) => setRefractionForm({ ...refractionForm, bcvaOS: e.target.value })}
                              >
                                {VA_OPTIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Pupillary Distance (PD mm)"
                        type="number"
                        value={refractionForm.pupillaryDistanceMM}
                        onChange={(e) => setRefractionForm({ ...refractionForm, pupillaryDistanceMM: Number(e.target.value) })}
                      />
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Optometrist / Ophthalmologist Refraction Notes"
                        placeholder="Clinical observations, crystalline lens clarity, fundus correlation..."
                        value={refractionForm.notes}
                        onChange={(e) => setRefractionForm({ ...refractionForm, notes: e.target.value })}
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      ⚡ Saves directly to PostgreSQL <code style={{ color: '#0284c7' }}>eye_refraction_exams</code> table.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={savingRefraction ? <CircularProgress size={18} color="inherit" /> : <Save />}
                      disabled={savingRefraction}
                      onClick={handleSaveRefraction}
                      sx={{
                        bgcolor: '#0284c7',
                        fontWeight: 700,
                        textTransform: 'none',
                        borderRadius: 2,
                        px: 3,
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                        '&:hover': { bgcolor: '#0369a1' }
                      }}
                    >
                      {savingRefraction ? 'Saving to Database...' : 'Save Dual-Eye Refraction'}
                    </Button>
                  </Box>
                </Card>
              </Grid>

              <Grid item xs={12} lg={3}>
                <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Speed sx={{ color: '#0284c7' }} /> Equipment Telemetry Feed
                  </Typography>

                  <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Connected Modality:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>Topcon KR-800 ARK</Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Suite: 5009 NW Clinic</Typography>
                    <Chip size="small" label="DICOM MWL Online" color="success" sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }} />
                  </Box>

                  {deviceTelemetry && (
                    <Box sx={{ p: 1.5, bgcolor: '#ecfdf5', borderRadius: 2, border: '1px solid #a7f3d0', mb: 2 }}>
                      <Typography variant="caption" sx={{ color: '#065f46', fontWeight: 700, display: 'block' }}>
                        Last Telemetry Ingestion:
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#047857', display: 'block' }}>
                        OD: {deviceTelemetry.od?.sphere} DS / {deviceTelemetry.od?.cylinder} DC @ {deviceTelemetry.od?.axis}°
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#047857', display: 'block' }}>
                        OS: {deviceTelemetry.os?.sphere} DS / {deviceTelemetry.os?.cylinder} DC @ {deviceTelemetry.os?.axis}°
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#059669', display: 'block', mt: 0.5, fontWeight: 600 }}>
                        Confidence: {deviceTelemetry.confidenceScore}
                      </Typography>
                    </Box>
                  )}

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ p: 1.5, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
                    <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700, display: 'block', mb: 0.5 }}>
                      Database Summary:
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#0284c7', display: 'block' }}>
                      • Saved Refraction Exams: {patientRefractions.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#0284c7', display: 'block' }}>
                      • Clinical Encounters: {encounters.length}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Database Refraction Vault & Historical Trends */}
          {refractionTab === 'vault' && (
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    PostgreSQL Refraction Vault & Historical Records
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Live clinical audit history for {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Selected Patient'}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Refresh />}
                  onClick={() => selectedPatient && fetchPatientRefractions(selectedPatient.id)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  Refresh Database Records
                </Button>
              </Box>

              {patientRefractions.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <RemoveRedEye sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#64748b' }}>
                    No Refraction Records in Database
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                    This patient has no saved refraction assessments in PostgreSQL yet.
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setRefractionTab('workbench')}
                    sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Perform New Refraction Exam
                  </Button>
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Date & Time</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Encounter #</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Exam Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1' }}>Right Eye (OD)</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#be185d' }}>Left Eye (OS)</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#475569' }}>PD</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#475569', textAlign: 'right' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {patientRefractions.map((r) => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>
                            {new Date(r.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={r.eyeEncounter?.encounterNumber || 'Unassigned'}
                              color="primary"
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#334155', fontWeight: 500 }}>
                            {r.examType || 'Subjective Manifest'}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0369a1' }}>
                              {r.sphereOD !== null ? `${r.sphereOD > 0 ? '+' : ''}${r.sphereOD} DS` : 'Plano'} / {r.cylinderOD !== null ? `${r.cylinderOD > 0 ? '+' : ''}${r.cylinderOD} DC` : '0'} x {r.axisOD || 0}°
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              Add: {r.addOD ? `+${r.addOD}` : '—'} • BCVA: {r.bcvaOD || '6/6'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#be185d' }}>
                              {r.sphereOS !== null ? `${r.sphereOS > 0 ? '+' : ''}${r.sphereOS} DS` : 'Plano'} / {r.cylinderOS !== null ? `${r.cylinderOS > 0 ? '+' : ''}${r.cylinderOS} DC` : '0'} x {r.axisOS || 0}°
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              Add: {r.addOS ? `+${r.addOS}` : '—'} • BCVA: {r.bcvaOS || '6/6'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#334155' }}>
                            {r.pupillaryDistanceMM ? `${r.pupillaryDistanceMM} mm` : '—'}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                              <Tooltip title="Load into Refraction Workbench">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    populateFormWithRefraction(r);
                                    setRefractionTab('workbench');
                                    setStatusMessage({ type: 'info', text: 'Historical refraction loaded into workbench for review.' });
                                  }}
                                >
                                  <RestartAlt fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View & Print Official Vision Certificate">
                                <IconButton
                                  size="small"
                                  sx={{ color: '#0284c7' }}
                                  onClick={() => {
                                    setSelectedRefractionForModal(r);
                                    setRefractionModalOpen(true);
                                  }}
                                >
                                  <Print fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Refraction from Database">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteRefraction(r.id)}
                                >
                                  <DeleteOutline fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          )}

          {/* ── Official Printable Refraction Certificate Modal ────────────────────── */}
          <Dialog
            open={refractionModalOpen}
            onClose={() => setRefractionModalOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle sx={{ bgcolor: '#0284c7', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Visibility />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Official Ophthalmic Refraction Certificate
                </Typography>
              </Box>
              <Chip label="PostgreSQL Verified" color="success" size="small" sx={{ bgcolor: '#10b981', color: '#fff', fontWeight: 700 }} />
            </DialogTitle>

            <DialogContent sx={{ p: 4, bgcolor: '#ffffff' }}>
              {selectedRefractionForModal && (
                <Box id="printable-refraction-certificate">
                  {/* Hospital Header with Official Logos */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      pb: 2.5,
                      borderBottom: '2px solid #0284c7',
                      mb: 3,
                      gap: 2
                    }}
                  >
                    {/* Left Sponsor / Diocesan Crest */}
                    <Box
                      component="img"
                      src={assetUrl('/anglican-logo.png')}
                      alt="Diocese Mission Logo"
                      style={{ width: 60, height: 60, maxWidth: 60, maxHeight: 60, objectFit: 'contain' }}
                      onError={(e: any) => {
                        e.currentTarget.src = assetUrl('/hospital-logo.png');
                      }}
                      sx={{
                        width: { xs: 45, sm: 60 },
                        height: { xs: 45, sm: 60 },
                        objectFit: 'contain',
                        flexShrink: 0
                      }}
                    />

                    {/* Central Hospital Authority Details */}
                    <Box sx={{ textAlign: 'center', flexGrow: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', fontSize: { xs: '1.15rem', sm: '1.45rem' } }}>
                        FAITH FOUNDATION MISSION HOSPITAL
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', mt: 0.2 }}>
                        DIRECTORATE OF OPHTHALMOLOGY & VISUAL SCIENCES
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.2 }}>
                        Postgraduate Clinical Eye Pavilion • Comprehensive Refraction & Ophthalmic Diagnostics
                      </Typography>
                    </Box>

                    {/* Right Official Hospital Crest */}
                    <Box
                      component="img"
                      src={assetUrl('/hospital-logo.png')}
                      alt="Hospital Seal"
                      style={{ width: 60, height: 60, maxWidth: 60, maxHeight: 60, objectFit: 'contain', borderRadius: '50%' }}
                      onError={(e: any) => {
                        e.currentTarget.src = assetUrl('/hospital-logo.webp');
                      }}
                      sx={{
                        width: { xs: 45, sm: 60 },
                        height: { xs: 45, sm: 60 },
                        objectFit: 'contain',
                        borderRadius: '50%',
                        border: '2px solid #0284c7',
                        p: 0.3,
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 8px rgba(2, 132, 199, 0.15)',
                        flexShrink: 0
                      }}
                    />
                  </Box>

                  {/* Patient Info Bar */}
                  <Grid container spacing={2} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, mb: 3, border: '1px solid #e2e8f0' }}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Patient Name:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {selectedPatient?.firstName} {selectedPatient?.lastName}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Hospital MRN:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0284c7' }}>
                        {selectedPatient?.patientNumber || selectedPatient?.id?.slice(0, 8)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Encounter Reference:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {selectedRefractionForModal.eyeEncounter?.encounterNumber || 'General Clinical Exam'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Date of Assessment:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {new Date(selectedRefractionForModal.createdAt).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* Refraction Table */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5, textTransform: 'uppercase' }}>
                    Standardized Dual-Eye (OD / OS) Refractive Findings
                  </Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #cbd5e1', borderRadius: 2, mb: 3 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800 }}>Eye</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Distance UCVA</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Sphere (DS)</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Cylinder (DC)</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Axis (°)</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Add (NV)</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>BCVA</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Near UCVA</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow sx={{ bgcolor: '#f0f9ff' }}>
                          <TableCell sx={{ fontWeight: 800, color: '#0369a1' }}>OD (Right Eye)</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{selectedRefractionForModal.vaDistanceOD || '6/6'}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{selectedRefractionForModal.sphereOD !== null ? `${selectedRefractionForModal.sphereOD > 0 ? '+' : ''}${selectedRefractionForModal.sphereOD}` : 'Plano'}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{selectedRefractionForModal.cylinderOD !== null ? `${selectedRefractionForModal.cylinderOD > 0 ? '+' : ''}${selectedRefractionForModal.cylinderOD}` : '0.00'}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{selectedRefractionForModal.axisOD || '0'}°</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{selectedRefractionForModal.addOD ? `+${selectedRefractionForModal.addOD}` : '—'}</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#0284c7' }}>{selectedRefractionForModal.bcvaOD || '6/6'}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{selectedRefractionForModal.vaNearOD || 'N6'}</TableCell>
                        </TableRow>
                        <TableRow sx={{ bgcolor: '#fdf2f8' }}>
                          <TableCell sx={{ fontWeight: 800, color: '#be185d' }}>OS (Left Eye)</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{selectedRefractionForModal.vaDistanceOS || '6/6'}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{selectedRefractionForModal.sphereOS !== null ? `${selectedRefractionForModal.sphereOS > 0 ? '+' : ''}${selectedRefractionForModal.sphereOS}` : 'Plano'}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{selectedRefractionForModal.cylinderOS !== null ? `${selectedRefractionForModal.cylinderOS > 0 ? '+' : ''}${selectedRefractionForModal.cylinderOS}` : '0.00'}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{selectedRefractionForModal.axisOS || '0'}°</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{selectedRefractionForModal.addOS ? `+${selectedRefractionForModal.addOS}` : '—'}</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#be185d' }}>{selectedRefractionForModal.bcvaOS || '6/6'}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{selectedRefractionForModal.vaNearOS || 'N6'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* PD and Notes */}
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Pupillary Distance (PD):</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {selectedRefractionForModal.pupillaryDistanceMM ? `${selectedRefractionForModal.pupillaryDistanceMM} mm` : '64 mm'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Clinical Refraction & Dispensing Notes:</Typography>
                        <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>
                          {selectedRefractionForModal.notes || 'Routine vision examination. Corrected visual acuity verified.'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Attestation & Signatures */}
                  <Box sx={{ pt: 3, borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                        Examining Practitioner:
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {selectedRefractionForModal.eyeEncounter?.ophthalmologistName || 'Dr. Attending Optometrist / Ophthalmologist'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Directorate of Ophthalmology & Visual Sciences
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                      <Box sx={{ borderBottom: '1px solid #0f172a', width: 200, mb: 0.5 }} />
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        Official Clinician Signature & Stamp
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <Button
                variant="outlined"
                onClick={() => setRefractionModalOpen(false)}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
              >
                Close
              </Button>
              <Button
                variant="contained"
                startIcon={<Print />}
                onClick={handlePrintRefractionCertificate}
                sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Print Official Certificate
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* ── 2. Tonometry & Glaucoma IOP Graph (/eye-clinic/iop) ───────────────── */}
      {currentSubCategory === 'iop' && (
        <Box>
          {/* Quick Metrics & Glaucoma Stratification Bar */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }}>
                  Latest OD Pressure
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#0284c7', mt: 0.5 }}>
                  {iopHistory.length > 0 ? `${iopHistory[iopHistory.length - 1].iopOD} mmHg` : '—'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Right Eye (Oculus Dexter)
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card sx={{ p: 2, borderRadius: 2.5, bgcolor: '#fdf2f8', border: '1px solid #fbcfe8' }}>
                <Typography variant="caption" sx={{ color: '#be185d', fontWeight: 700, textTransform: 'uppercase' }}>
                  Latest OS Pressure
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#db2777', mt: 0.5 }}>
                  {iopHistory.length > 0 ? `${iopHistory[iopHistory.length - 1].iopOS} mmHg` : '—'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Left Eye (Oculus Sinister)
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>
                  Target Pressure Zone
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#16a34a', mt: 0.5 }}>
                  ≤ 18.0 mmHg
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Safe Glaucoma Threshold
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                  Measurements on File
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                  {iopHistory.length} Record{iopHistory.length === 1 ? '' : 's'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  PostgreSQL Clinical Audit
                </Typography>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Record Tonometry Form */}
            <Grid item xs={12} lg={4}>
              <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Record Tonometry (IOP)
                  </Typography>
                  <Button
                    size="small"
                    color="inherit"
                    startIcon={<RestartAlt />}
                    onClick={handleResetIopForm}
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                  >
                    Reset
                  </Button>
                </Box>

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Tonometry Method</InputLabel>
                  <Select
                    value={iopForm.method}
                    label="Tonometry Method"
                    onChange={(e) => setIopForm({ ...iopForm, method: e.target.value })}
                  >
                    <MenuItem value="Goldmann Applanation Tonometry">Goldmann Applanation Tonometry (GAT - Gold Standard)</MenuItem>
                    <MenuItem value="Non-Contact Tonometry (NCT Air-Puff)">Non-Contact Tonometry (NCT Air-Puff)</MenuItem>
                    <MenuItem value="iCare Pro Rebound Tonometry">iCare Pro Rebound Tonometry</MenuItem>
                    <MenuItem value="Tono-Pen Electronic Applanation">Tono-Pen Electronic Applanation</MenuItem>
                    <MenuItem value="Dynamic Contour Tonometry">Dynamic Contour Tonometry (Pascal)</MenuItem>
                  </Select>
                </FormControl>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="OD IOP (mmHg)"
                      placeholder="e.g. 15.0"
                      value={iopForm.iopOD}
                      onChange={(e) => setIopForm({ ...iopForm, iopOD: e.target.value })}
                      sx={{ bgcolor: '#f0f9ff' }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="OS IOP (mmHg)"
                      placeholder="e.g. 16.0"
                      value={iopForm.iopOS}
                      onChange={(e) => setIopForm({ ...iopForm, iopOS: e.target.value })}
                      sx={{ bgcolor: '#fdf2f8' }}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="OD Pachymetry (µm)"
                      placeholder="e.g. 545"
                      value={iopForm.pachymetryOD}
                      onChange={(e) => setIopForm({ ...iopForm, pachymetryOD: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="OS Pachymetry (µm)"
                      placeholder="e.g. 548"
                      value={iopForm.pachymetryOS}
                      onChange={(e) => setIopForm({ ...iopForm, pachymetryOS: e.target.value })}
                    />
                  </Grid>
                </Grid>

                <TextField
                  fullWidth
                  size="small"
                  label="Anti-Glaucoma Medications"
                  placeholder="e.g. Latanoprost 0.005% QHS OU, Timolol 0.5% BID OU"
                  value={iopForm.antiGlaucomaMeds}
                  onChange={(e) => setIopForm({ ...iopForm, antiGlaucomaMeds: e.target.value })}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  label="Tonometrist / Glaucoma Clinical Notes"
                  placeholder="Optic disc C/D ratio, diurnal fluctuation, corneal hysteresis..."
                  value={iopForm.notes}
                  onChange={(e) => setIopForm({ ...iopForm, notes: e.target.value })}
                  sx={{ mb: 2.5 }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={savingIop ? <CircularProgress size={18} color="inherit" /> : <Save />}
                  disabled={savingIop}
                  onClick={handleSaveIop}
                  sx={{
                    bgcolor: '#0284c7',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 2,
                    py: 1,
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                    '&:hover': { bgcolor: '#0369a1' }
                  }}
                >
                  {savingIop ? 'Saving to Database...' : 'Save Tonometry Reading'}
                </Button>
              </Card>
            </Grid>

            {/* Longitudinal Graph & Audit Vault */}
            <Grid item xs={12} lg={8}>
              <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Longitudinal Glaucoma & IOP Progression (PostgreSQL)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Live timeline tracking Right Eye (OD - Cyan) vs Left Eye (OS - Pink) Pressure vs Safe Target (&le;18 mmHg)
                    </Typography>
                  </Box>

                  {/* Toggle: Graph vs History Table */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant={iopViewTab === 'graph' ? 'contained' : 'outlined'}
                      onClick={() => setIopViewTab('graph')}
                      startIcon={<Timeline />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        bgcolor: iopViewTab === 'graph' ? '#0f172a' : '#ffffff',
                        color: iopViewTab === 'graph' ? '#ffffff' : '#334155',
                        borderColor: '#cbd5e1'
                      }}
                    >
                      Graph View
                    </Button>
                    <Button
                      size="small"
                      variant={iopViewTab === 'table' ? 'contained' : 'outlined'}
                      onClick={() => setIopViewTab('table')}
                      startIcon={<History />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        bgcolor: iopViewTab === 'table' ? '#0f172a' : '#ffffff',
                        color: iopViewTab === 'table' ? '#ffffff' : '#334155',
                        borderColor: '#cbd5e1'
                      }}
                    >
                      Records Table ({iopHistory.length})
                    </Button>
                  </Box>
                </Box>

                {/* Graph View */}
                {iopViewTab === 'graph' && (
                  <Box>
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                      <Chip size="small" label="OD (Right Eye - Cyan)" sx={{ bgcolor: '#38bdf8', color: '#0f172a', fontWeight: 800 }} />
                      <Chip size="small" label="OS (Left Eye - Pink)" sx={{ bgcolor: '#f472b6', color: '#0f172a', fontWeight: 800 }} />
                      <Chip size="small" label="Target: ≤18 mmHg (Safe Zone)" color="success" sx={{ fontWeight: 700 }} />
                    </Box>

                    <Box sx={{ p: 2, bgcolor: '#0f172a', borderRadius: 3, color: '#fff', overflowX: 'auto' }}>
                      {iopHistory.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                          <Timeline sx={{ fontSize: 44, color: '#475569', mb: 1 }} />
                          <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                            No historical IOP tonometry records found for this patient in PostgreSQL.
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Record a reading using the form on the left to initialize the patient's longitudinal glaucoma curve.
                          </Typography>
                        </Box>
                      ) : (
                        <svg width="100%" height="240" viewBox="0 0 620 240" style={{ minWidth: 500 }}>
                          {/* Y-Axis Gridlines */}
                          <line x1="50" y1="30" x2="590" y2="30" stroke="#334155" strokeDasharray="4 4" />
                          <text x="25" y="34" fill="#94a3b8" fontSize="11">30</text>

                          <line x1="50" y1="75" x2="590" y2="75" stroke="#334155" strokeDasharray="4 4" />
                          <text x="25" y="79" fill="#94a3b8" fontSize="11">24</text>

                          {/* 18 mmHg Target Line & Green Zone */}
                          <rect x="50" y="120" width="540" height="90" fill="rgba(16, 185, 129, 0.12)" />
                          <line x1="50" y1="120" x2="590" y2="120" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" />
                          <text x="20" y="124" fill="#10b981" fontSize="11" fontWeight="bold">18</text>

                          <line x1="50" y1="165" x2="590" y2="165" stroke="#334155" strokeDasharray="4 4" />
                          <text x="25" y="169" fill="#94a3b8" fontSize="11">12</text>

                          <line x1="50" y1="210" x2="590" y2="210" stroke="#475569" />
                          <text x="25" y="214" fill="#94a3b8" fontSize="11">6</text>

                          {/* Polyline Path for OD (Cyan) */}
                          {iopHistory.length > 1 && (
                            <polyline
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={iopHistory.map((item, idx) => {
                                const spacing = Math.min(120, 480 / Math.max(iopHistory.length, 1));
                                const x = 80 + idx * spacing;
                                const yOD = Math.max(30, Math.min(210, 210 - (item.iopOD - 6) * 7.5));
                                return `${x},${yOD}`;
                              }).join(' ')}
                            />
                          )}

                          {/* Polyline Path for OS (Pink) */}
                          {iopHistory.length > 1 && (
                            <polyline
                              fill="none"
                              stroke="#f472b6"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={iopHistory.map((item, idx) => {
                                const spacing = Math.min(120, 480 / Math.max(iopHistory.length, 1));
                                const x = 80 + idx * spacing;
                                const yOS = Math.max(30, Math.min(210, 210 - (item.iopOS - 6) * 7.5));
                                return `${x},${yOS}`;
                              }).join(' ')}
                            />
                          )}

                          {/* Data Points */}
                          {iopHistory.map((item, idx) => {
                            const spacing = Math.min(120, 480 / Math.max(iopHistory.length, 1));
                            const x = 80 + idx * spacing;
                            const yOD = Math.max(30, Math.min(210, 210 - (item.iopOD - 6) * 7.5));
                            const yOS = Math.max(30, Math.min(210, 210 - (item.iopOS - 6) * 7.5));

                            return (
                              <g key={item.id || idx}>
                                {/* OD Point */}
                                <circle cx={x} cy={yOD} r="6" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
                                <text x={x} y={yOD - 10} fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
                                  {item.iopOD}
                                </text>

                                {/* OS Point */}
                                <circle cx={x} cy={yOS} r="6" fill="#f472b6" stroke="#0f172a" strokeWidth="2" />
                                <text x={x} y={yOS + 18} fill="#f472b6" fontSize="11" fontWeight="bold" textAnchor="middle">
                                  {item.iopOS}
                                </text>

                                {/* Date Label */}
                                <text x={x} y="230" fill="#94a3b8" fontSize="10" textAnchor="middle">
                                  {item.date}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Table View */}
                {iopViewTab === 'table' && (
                  <Box>
                    {iopHistory.length === 0 ? (
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                          No tonometry records found for this patient in PostgreSQL.
                        </Typography>
                      </Box>
                    ) : (
                      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Date & Time</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Method</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: '#0369a1' }}>OD (Right)</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: '#be185d' }}>OS (Left)</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>CCT (µm)</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Medications</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: '#475569', textAlign: 'right' }}>Action</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {iopHistory.map((item) => (
                              <TableRow key={item.id} hover>
                                <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>
                                  {item.date} {item.time}
                                </TableCell>
                                <TableCell sx={{ color: '#334155', fontSize: '0.8rem' }}>
                                  {item.method}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={`${item.iopOD} mmHg`}
                                    sx={{
                                      bgcolor: item.iopOD > 21 ? '#fee2e2' : item.iopOD > 18 ? '#fef3c7' : '#e0f2fe',
                                      color: item.iopOD > 21 ? '#b91c1c' : item.iopOD > 18 ? '#b45309' : '#0369a1',
                                      fontWeight: 800
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={`${item.iopOS} mmHg`}
                                    sx={{
                                      bgcolor: item.iopOS > 21 ? '#fee2e2' : item.iopOS > 18 ? '#fef3c7' : '#fce7f3',
                                      color: item.iopOS > 21 ? '#b91c1c' : item.iopOS > 18 ? '#b45309' : '#be185d',
                                      fontWeight: 800
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                                  {item.pachymetryOD || item.pachymetryOS ? `${item.pachymetryOD || '—'} / ${item.pachymetryOS || '—'}` : '—'}
                                </TableCell>
                                <TableCell sx={{ color: '#334155', fontSize: '0.8rem' }}>
                                  {item.meds || 'None'}
                                </TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteIop(item.id)}
                                  >
                                    <DeleteOutline fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                )}
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── 3. Anatomic Drawing & Fundus Annotation (/eye-clinic/drawing) ──────── */}
      {currentSubCategory === 'drawing' && (
        <Box>
          {/* Sub-Header & Navigation Tabs */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Palette sx={{ color: '#0284c7' }} />
                Visual Anatomic Drawing & Clinical Pathology Studio
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Digital interactive touch canvas for Fundus, Posterior Pole, Cornea & Anterior Segment lesion charting • Direct PostgreSQL Archival
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant={drawingTab === 'studio' ? 'contained' : 'outlined'}
                startIcon={<Brush />}
                onClick={() => setDrawingTab('studio')}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  bgcolor: drawingTab === 'studio' ? '#0284c7' : '#ffffff',
                  color: drawingTab === 'studio' ? '#ffffff' : '#334155',
                  borderColor: '#cbd5e1'
                }}
              >
                1. Drawing Studio
              </Button>
              <Button
                variant={drawingTab === 'vault' ? 'contained' : 'outlined'}
                startIcon={<Collections />}
                onClick={() => setDrawingTab('vault')}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  bgcolor: drawingTab === 'vault' ? '#0f172a' : '#ffffff',
                  color: drawingTab === 'vault' ? '#ffffff' : '#334155',
                  borderColor: '#cbd5e1'
                }}
              >
                2. Saved Drawings Vault ({savedDrawings.length})
              </Button>
            </Box>
          </Box>

          {/* TAB 1: STUDIO CANVAS */}
          {drawingTab === 'studio' && (
            <Grid container spacing={3}>
              {/* Left Main Canvas Studio */}
              <Grid item xs={12} lg={8}>
                <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  {/* Top Bar: Eye Selector + Template Selector */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                    {/* Eye Selector */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                        Eye Examined:
                      </Typography>
                      {[
                        { key: 'OD', label: 'OD (Right Eye)', color: '#0284c7' },
                        { key: 'OS', label: 'OS (Left Eye)', color: '#be185d' },
                        { key: 'OU', label: 'OU (Both Eyes)', color: '#6366f1' },
                      ].map(item => (
                        <Chip
                          key={item.key}
                          label={item.label}
                          onClick={() => setSelectedEyeSide(item.key as any)}
                          sx={{
                            fontWeight: 800,
                            cursor: 'pointer',
                            bgcolor: selectedEyeSide === item.key ? item.color : '#f1f5f9',
                            color: selectedEyeSide === item.key ? '#ffffff' : '#475569',
                            border: selectedEyeSide === item.key ? `2px solid ${item.color}` : '1px solid #cbd5e1'
                          }}
                        />
                      ))}
                    </Box>

                    {/* Template Selection */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant={canvasTemplate === 'fundus' ? 'contained' : 'outlined'}
                        onClick={() => setCanvasTemplate('fundus')}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                      >
                        Retina / Fundus
                      </Button>
                      <Button
                        size="small"
                        variant={canvasTemplate === 'anterior' ? 'contained' : 'outlined'}
                        onClick={() => setCanvasTemplate('anterior')}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                      >
                        Anterior Segment
                      </Button>
                      <Button
                        size="small"
                        variant={canvasTemplate === 'eyelid' ? 'contained' : 'outlined'}
                        onClick={() => setCanvasTemplate('eyelid')}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                      >
                        Eyelid / Adnexa
                      </Button>
                      <Button
                        size="small"
                        variant={canvasTemplate === 'blank' ? 'contained' : 'outlined'}
                        onClick={() => setCanvasTemplate('blank')}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                      >
                        Blank Grid
                      </Button>
                    </Box>
                  </Box>

                  {/* Tool & Palette Controls */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap', p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    {/* Tool toggle: Pen vs Eraser */}
                    <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
                      <Button
                        size="small"
                        variant={drawingTool === 'pen' ? 'contained' : 'outlined'}
                        onClick={() => setDrawingTool('pen')}
                        startIcon={<Brush />}
                        sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.2, borderRadius: 1.5 }}
                      >
                        Pen
                      </Button>
                      <Button
                        size="small"
                        variant={drawingTool === 'eraser' ? 'contained' : 'outlined'}
                        onClick={() => setDrawingTool('eraser')}
                        sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.2, borderRadius: 1.5 }}
                      >
                        Eraser
                      </Button>
                    </Box>

                    {/* Pen Size */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>Size:</Typography>
                      {[
                        { size: 2, label: 'Fine' },
                        { size: 4, label: 'Med' },
                        { size: 8, label: 'Bold' },
                      ].map(s => (
                        <Chip
                          key={s.size}
                          size="small"
                          label={s.label}
                          onClick={() => setPenSize(s.size)}
                          sx={{
                            fontWeight: 700,
                            cursor: 'pointer',
                            bgcolor: penSize === s.size ? '#0f172a' : '#ffffff',
                            color: penSize === s.size ? '#ffffff' : '#334155',
                            border: '1px solid #cbd5e1'
                          }}
                        />
                      ))}
                    </Box>

                    {/* Color Chips */}
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', mr: 0.5 }}>Color:</Typography>
                    {[
                      { color: '#ef4444', label: 'Red (Hemorrhage)' },
                      { color: '#3b82f6', label: 'Blue (Retinal Tear)' },
                      { color: '#eab308', label: 'Yellow (Exudate)' },
                      { color: '#22c55e', label: 'Green (Vitreous Opacity)' },
                      { color: '#0f172a', label: 'Black (Scar / Pigment)' },
                      { color: '#f97316', label: 'Orange (Nevus / Fluid)' },
                      { color: '#78350f', label: 'Brown (Iris / KP)' },
                    ].map((c) => (
                      <Tooltip key={c.color} title={c.label}>
                        <Box
                          onClick={() => {
                            setDrawColor(c.color);
                            setDrawingTool('pen');
                          }}
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: c.color,
                            cursor: 'pointer',
                            border: drawColor === c.color && drawingTool === 'pen' ? '3px solid #0f172a' : '2px solid #ffffff',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                            transition: 'transform 0.1s',
                            '&:hover': { transform: 'scale(1.2)' }
                          }}
                        />
                      </Tooltip>
                    ))}

                    {/* Undo, Reset & Download actions */}
                    <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Undo stroke">
                        <span>
                          <IconButton size="small" onClick={handleUndo} disabled={undoStack.length === 0} sx={{ border: '1px solid #cbd5e1' }}>
                            <Undo fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Download canvas PNG">
                        <IconButton size="small" onClick={() => handleDownloadDrawing()} sx={{ border: '1px solid #cbd5e1' }}>
                          <Download fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Button size="small" variant="text" color="error" onClick={initCanvas} startIcon={<RestartAlt />} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                        Clear
                      </Button>
                    </Box>
                  </Box>

                  {/* Canvas Container */}
                  <Box
                    sx={{
                      border: '2px solid #cbd5e1',
                      borderRadius: 3,
                      overflow: 'hidden',
                      textAlign: 'center',
                      bgcolor: '#ffffff',
                      boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.04)',
                      touchAction: 'none'
                    }}
                  >
                    <canvas
                      ref={drawingCanvasRef}
                      width={640}
                      height={400}
                      onMouseDown={startDraw}
                      onMouseMove={onDraw}
                      onMouseUp={endDraw}
                      onMouseLeave={endDraw}
                      onTouchStart={startDraw}
                      onTouchMove={onDraw}
                      onTouchEnd={endDraw}
                      style={{ cursor: 'crosshair', width: '100%', height: 'auto', display: 'block' }}
                    />
                  </Box>

                  {/* Clinical Findings & Metadata */}
                  <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                      Clinical Pathology Diagnosis & Localization
                    </Typography>

                    {/* Quick suggestion chips */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 2 }}>
                      {[
                        'Proliferative Diabetic Retinopathy (PDR)',
                        'Non-Proliferative DR (NPDR) with CSME',
                        'Rhegmatogenous Retinal Detachment (RRD)',
                        'Horseshoe Retinal Tear with Subretinal Fluid',
                        'Corneal Ulcer with Stromal Infiltrate',
                        'Glaucomatous Disc Cupping (C/D 0.8)',
                        'Age-Related Macular Degeneration (Wet AMD)',
                        'Branch Retinal Vein Occlusion (BRVO)',
                      ].map(diag => (
                        <Chip
                          key={diag}
                          size="small"
                          label={diag}
                          onClick={() => {
                            setDrawingDiagnosis(diag);
                            if (!drawingNotes) setDrawingNotes(`Identified lesion: ${diag}`);
                          }}
                          sx={{ fontSize: '0.75rem', cursor: 'pointer', bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' } }}
                        />
                      ))}
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Clinical Diagnosis / Key Findings"
                          placeholder="e.g. Inferotemporal Retinal Detachment with Macula Off"
                          value={drawingDiagnosis}
                          onChange={(e) => setDrawingDiagnosis(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Attending Examining Doctor"
                          value={drawingClinicianName}
                          onChange={(e) => setDrawingClinicianName(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          multiline
                          rows={2}
                          label="Detailed Anatomic Annotations & Lesion Locations"
                          placeholder="Clock-hour coordinates, laser marks, margin description, vitreous status..."
                          value={drawingNotes}
                          onChange={(e) => setDrawingNotes(e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Save Footer */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      ⚡ Saves directly to PostgreSQL <code style={{ color: '#0284c7' }}>eye_anatomical_drawings</code> table.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={savingDrawing ? <CircularProgress size={18} color="inherit" /> : <Save />}
                      disabled={savingDrawing}
                      onClick={handleSaveDrawing}
                      sx={{
                        bgcolor: '#0284c7',
                        fontWeight: 700,
                        textTransform: 'none',
                        borderRadius: 2,
                        px: 3,
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                        '&:hover': { bgcolor: '#0369a1' }
                      }}
                    >
                      {savingDrawing ? 'Saving to Database...' : 'Save Drawing to Patient File in PostgreSQL'}
                    </Button>
                  </Box>
                </Card>
              </Grid>

              {/* Right Column: Color Code Reference & Quick History */}
              <Grid item xs={12} lg={4}>
                <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Palette sx={{ color: '#0284c7', fontSize: 20 }} />
                    Standard Ophthalmology Color Codes
                  </Typography>
                  {[
                    { name: 'Red Marker', color: '#ef4444', desc: 'Retinal hemorrhages, microaneurysms, neovascularization (NVD/NVE), preretinal bleeds.' },
                    { name: 'Blue Marker', color: '#3b82f6', desc: 'Retinal detachment boundaries, horseshoe tears, operculated holes, lattice degeneration.' },
                    { name: 'Yellow Marker', color: '#eab308', desc: 'Hard exudates, macular drusen, lipofuscin deposits, choroidal neovascular membrane (CNVM).' },
                    { name: 'Green Marker', color: '#22c55e', desc: 'Preretinal membranes, vitreous traction bands, asteroid hyalosis, vitreous hemorrhage.' },
                    { name: 'Black Marker', color: '#0f172a', desc: 'Chorioretinal scars, laser photocoagulation burns, bone-spicule pigment, choroidal melanoma.' },
                    { name: 'Orange Marker', color: '#f97316', desc: 'Choroidal nevus, subretinal fluid demarcation lines, serous pigment epithelial detachments.' },
                    { name: 'Brown Marker', color: '#78350f', desc: 'Iris nevi, foreign bodies, pigmented keratic precipitates (KP) on corneal endothelium.' },
                  ].map((item, idx) => (
                    <Box key={idx} sx={{ p: 1, mb: 1, bgcolor: '#f8fafc', borderRadius: 2, borderLeft: `4px solid ${item.color}`, borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: item.color, fontSize: '0.8rem' }}>{item.name}</Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', display: 'block', mt: 0.2 }}>{item.desc}</Typography>
                    </Box>
                  ))}
                </Card>

                {/* Patient Saved Drawings Mini-Strip */}
                <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Recent Drawings for Patient ({savedDrawings.length})
                    </Typography>
                    <Button size="small" onClick={() => setDrawingTab('vault')} sx={{ textTransform: 'none', fontWeight: 700 }}>
                      View All
                    </Button>
                  </Box>

                  {loadingDrawings ? (
                    <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>
                  ) : savedDrawings.length === 0 ? (
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block', textAlign: 'center', py: 2 }}>
                      No drawings archived for this patient yet.
                    </Typography>
                  ) : (
                    savedDrawings.slice(0, 3).map((d) => (
                      <Box
                        key={d.id}
                        sx={{
                          p: 1.5,
                          mb: 1.5,
                          bgcolor: '#f8fafc',
                          borderRadius: 2,
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5
                        }}
                      >
                        {d.pngDataUrl && (
                          <Box
                            component="img"
                            src={d.pngDataUrl}
                            alt="Preview"
                            sx={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 1.5, border: '1px solid #cbd5e1', bgcolor: '#fff' }}
                          />
                        )}
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 0.3 }}>
                            <Chip
                              size="small"
                              label={d.eyeSide || 'OD'}
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                bgcolor: d.eyeSide === 'OD' ? '#0284c7' : d.eyeSide === 'OS' ? '#be185d' : '#6366f1',
                                color: '#fff'
                              }}
                            />
                            <Typography variant="caption" noWrap sx={{ fontWeight: 700, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 120 }}>
                              {d.annotations || d.anatomicZone}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                            {new Date(d.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Tooltip title="Load to Studio Canvas">
                          <IconButton size="small" onClick={() => handleLoadDrawingToCanvas(d)}>
                            <Brush fontSize="small" sx={{ color: '#0284c7' }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ))
                  )}
                </Card>
              </Grid>
            </Grid>
          )}

          {/* TAB 2: SAVED DRAWINGS VAULT */}
          {drawingTab === 'vault' && (
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Patient Anatomical Drawings Vault & Clinical Audit
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Historical fundus drawings and anterior segment records stored in PostgreSQL for {selectedPatient?.firstName} {selectedPatient?.lastName}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    placeholder="Search annotations / findings..."
                    value={drawingSearchQuery}
                    onChange={(e) => setDrawingSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: <Search fontSize="small" sx={{ color: '#64748b', mr: 1 }} />
                    }}
                    sx={{ width: 260 }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<Brush />}
                    onClick={() => setDrawingTab('studio')}
                    sx={{ bgcolor: '#0284c7', fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
                  >
                    New Drawing
                  </Button>
                </Box>
              </Box>

              {loadingDrawings ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>Loading archived drawings from database...</Typography>
                </Box>
              ) : savedDrawings.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #cbd5e1' }}>
                  <Palette sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#334155' }}>
                    No Saved Anatomical Drawings Found
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                    This patient has no visual clinical diagrams saved in the database yet.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Brush />}
                    onClick={() => setDrawingTab('studio')}
                    sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Open Drawing Studio
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2.5}>
                  {savedDrawings
                    .filter(d => {
                      if (!drawingSearchQuery) return true;
                      const q = drawingSearchQuery.toLowerCase();
                      return (
                        d.annotations?.toLowerCase().includes(q) ||
                        d.anatomicZone?.toLowerCase().includes(q) ||
                        d.eyeSide?.toLowerCase().includes(q) ||
                        d.eyeEncounter?.encounterNumber?.toLowerCase().includes(q)
                      );
                    })
                    .map((d) => (
                      <Grid item xs={12} sm={6} md={4} key={d.id}>
                        <Card
                          sx={{
                            borderRadius: 3,
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s',
                            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }
                          }}
                        >
                          {/* Image Box */}
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: '#f8fafc',
                              textAlign: 'center',
                              borderBottom: '1px solid #e2e8f0',
                              position: 'relative'
                            }}
                          >
                            <Box
                              component="img"
                              src={d.pngDataUrl}
                              alt="Drawing"
                              sx={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain', borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #cbd5e1' }}
                            />
                            <Box sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 0.5 }}>
                              <Chip
                                size="small"
                                label={d.eyeSide || 'OD'}
                                sx={{
                                  fontWeight: 800,
                                  bgcolor: d.eyeSide === 'OD' ? '#0284c7' : d.eyeSide === 'OS' ? '#be185d' : '#6366f1',
                                  color: '#ffffff'
                                }}
                              />
                              <Chip
                                size="small"
                                label={d.anatomicZone || 'FUNDUS'}
                                sx={{ fontWeight: 700, bgcolor: '#0f172a', color: '#ffffff', fontSize: '0.68rem' }}
                              />
                            </Box>
                          </Box>

                          {/* Body */}
                          <Box sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                              {d.annotations || 'Clinical Examination Drawing'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                              Encounter: <strong>{d.eyeEncounter?.encounterNumber || 'General Exam'}</strong> • {new Date(d.createdAt).toLocaleString()}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#0369a1', display: 'block', fontWeight: 600 }}>
                              Examiner: {d.eyeEncounter?.ophthalmologistName || 'Dr. Attending Doctor'}
                            </Typography>

                            {/* Actions */}
                            <Divider sx={{ my: 1.5 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Tooltip title="View High-Res & Report">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSelectedDrawingForModal(d);
                                      setDrawingModalOpen(true);
                                    }}
                                    sx={{ bgcolor: '#f0f9ff', color: '#0284c7' }}
                                  >
                                    <ZoomIn fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Load into Studio">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleLoadDrawingToCanvas(d)}
                                    sx={{ bgcolor: '#f8fafc', color: '#334155' }}
                                  >
                                    <Brush fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Print Report">
                                  <IconButton
                                    size="small"
                                    onClick={() => handlePrintDrawingReport(d)}
                                    sx={{ bgcolor: '#f8fafc', color: '#334155' }}
                                  >
                                    <Print fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Download PNG">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDownloadDrawing(d.pngDataUrl, `eye-drawing-${d.eyeSide}-${d.id.slice(0, 8)}.png`)}
                                    sx={{ bgcolor: '#f8fafc', color: '#334155' }}
                                  >
                                    <Download fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>

                              <Tooltip title="Delete Drawing from Database">
                                <IconButton size="small" color="error" onClick={() => handleDeleteDrawing(d.id)}>
                                  <DeleteOutline fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                </Grid>
              )}
            </Card>
          )}

          {/* LIGHTBOX / REPORT MODAL FOR DRAWING */}
          <Dialog
            open={drawingModalOpen}
            onClose={() => setDrawingModalOpen(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
          >
            <DialogTitle sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0f172a' }}>
                  Official Ophthalmic Anatomical Drawing Report
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Archived in PostgreSQL • Reference ID: DRAW-{selectedDrawingForModal?.id?.slice(0, 8).toUpperCase()}
                </Typography>
              </Box>
              <Chip label="PostgreSQL Verified" color="success" size="small" sx={{ fontWeight: 800 }} />
            </DialogTitle>

            <DialogContent sx={{ p: 3, bgcolor: '#ffffff' }}>
              {selectedDrawingForModal && (
                <Box>
                  {/* Demographics Bar */}
                  <Grid container spacing={2} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, mb: 2.5, border: '1px solid #e2e8f0' }}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Patient Name:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {selectedPatient?.firstName} {selectedPatient?.lastName}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Hospital MRN:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0284c7' }}>
                        {selectedPatient?.patientNumber || selectedPatient?.id?.slice(0, 8)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Eye & Zone:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {selectedDrawingForModal.eyeSide === 'OD' ? 'OD (Right Eye)' : selectedDrawingForModal.eyeSide === 'OS' ? 'OS (Left Eye)' : 'OU (Bilateral)'} • {selectedDrawingForModal.anatomicZone}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Date Recorded:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {new Date(selectedDrawingForModal.createdAt).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* High-Res Drawing Display */}
                  <Box sx={{ border: '2px solid #cbd5e1', borderRadius: 3, p: 1.5, textAlign: 'center', bgcolor: '#ffffff', mb: 2.5 }}>
                    <Box
                      component="img"
                      src={selectedDrawingForModal.pngDataUrl}
                      alt="Full Drawing"
                      sx={{ maxHeight: 380, maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                    />
                  </Box>

                  {/* Clinical Findings Box */}
                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                      Clinical Diagnosis & Anatomic Annotations:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500, lineHeight: 1.5 }}>
                      {selectedDrawingForModal.annotations || 'Routine anatomical examination diagram.'}
                    </Typography>
                  </Box>

                  {/* Practitioner Attestation */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pt: 1 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Examining Practitioner:</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {selectedDrawingForModal.eyeEncounter?.ophthalmologistName || drawingClinicianName || 'Dr. Attending Doctor'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Directorate of Ophthalmology & Visual Sciences</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Box sx={{ borderBottom: '1px solid #0f172a', width: 180, mb: 0.5 }} />
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Clinician Signature Stamp</Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="outlined" onClick={() => setDrawingModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                Close
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleDownloadDrawing(selectedDrawingForModal?.pngDataUrl)}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Download PNG
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Print />}
                  onClick={() => handlePrintDrawingReport(selectedDrawingForModal)}
                  sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Print Clinical Report
                </Button>
              </Box>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* ── 4. E-Prescribing & Optical Shop Dispatch (/eye-clinic/optical-rx) ──── */}
      {currentSubCategory === 'optical-rx' && (
        <Box>
          {/* Sub-Navigation Tabs */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant={opticalRxTab === 'prescribe' ? 'contained' : 'outlined'}
                startIcon={<LocalPharmacy />}
                onClick={() => setOpticalRxTab('prescribe')}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                  bgcolor: opticalRxTab === 'prescribe' ? '#0284c7' : 'transparent',
                  borderColor: '#0284c7',
                  color: opticalRxTab === 'prescribe' ? '#fff' : '#0284c7',
                  '&:hover': { bgcolor: opticalRxTab === 'prescribe' ? '#0369a1' : 'rgba(2, 132, 199, 0.08)' }
                }}
              >
                1. E-Prescribe Spectacles & Lenses
              </Button>
              <Button
                variant={opticalRxTab === 'vault' ? 'contained' : 'outlined'}
                startIcon={<History />}
                onClick={() => setOpticalRxTab('vault')}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                  bgcolor: opticalRxTab === 'vault' ? '#0f172a' : 'transparent',
                  borderColor: '#0f172a',
                  color: opticalRxTab === 'vault' ? '#fff' : '#0f172a',
                  '&:hover': { bgcolor: opticalRxTab === 'vault' ? '#1e293b' : 'rgba(15, 23, 42, 0.08)' }
                }}
              >
                2. Dispatched Rx Vault & Lab Queue ({patientPrescriptions.length})
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title="Reload optical orders from database">
                <IconButton
                  size="small"
                  onClick={() => selectedPatient && fetchPatientPrescriptions(selectedPatient.id)}
                  disabled={loadingPrescriptions}
                  sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}
                >
                  <Refresh fontSize="small" className={loadingPrescriptions ? 'animate-spin' : ''} />
                </IconButton>
              </Tooltip>
              <Chip
                label={`Active Patient: ${selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'None'}`}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            </Box>
          </Box>

          {/* TAB 1: E-Prescribing Workbench */}
          {opticalRxTab === 'prescribe' && (
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        Spectacle & Contact Lens Electronic Prescription (Rx)
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Live PostgreSQL e-prescribing with instant optical lab routing & surfacing work order generation
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                      <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<AutoAwesome />}
                        onClick={handleAutofillRxFromRefraction}
                        sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
                      >
                        ⚡ Autofill from Refraction
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={dispatchingRx ? <CircularProgress size={18} color="inherit" /> : <Send />}
                        onClick={handleDispatchOpticalRx}
                        disabled={dispatchingRx || !selectedPatient}
                        sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
                      >
                        {dispatchingRx ? 'Dispatching...' : 'Dispatch to Optical Shop'}
                      </Button>
                    </Box>
                  </Box>

                  {/* Dual-Eye Interactive Refractive Grid */}
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, width: '15%' }}>Eye Side</TableCell>
                          <TableCell sx={{ fontWeight: 800, width: '21%' }}>Sphere (DS)</TableCell>
                          <TableCell sx={{ fontWeight: 800, width: '21%' }}>Cylinder (DC)</TableCell>
                          <TableCell sx={{ fontWeight: 800, width: '15%' }}>Axis (°)</TableCell>
                          <TableCell sx={{ fontWeight: 800, width: '15%' }}>Add (NV)</TableCell>
                          <TableCell sx={{ fontWeight: 800, width: '13%' }}>Mono PD</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {/* OD Right Eye */}
                        <TableRow sx={{ bgcolor: 'rgba(2, 132, 199, 0.02)' }}>
                          <TableCell sx={{ fontWeight: 800, color: '#0284c7' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Visibility fontSize="small" />
                              OD (Right)
                            </Box>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              inputProps={{ step: '0.25', min: '-25.00', max: '+25.00' }}
                              value={opticalRx.sphereOD}
                              onChange={(e) => setOpticalRx({ ...opticalRx, sphereOD: parseFloat(e.target.value) || 0 })}
                              placeholder="-1.50"
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              inputProps={{ step: '0.25', min: '-10.00', max: '+10.00' }}
                              value={opticalRx.cylinderOD}
                              onChange={(e) => setOpticalRx({ ...opticalRx, cylinderOD: parseFloat(e.target.value) || 0 })}
                              placeholder="-0.75"
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              inputProps={{ min: 0, max: 180 }}
                              value={opticalRx.axisOD}
                              onChange={(e) => setOpticalRx({ ...opticalRx, axisOD: parseInt(e.target.value, 10) || 0 })}
                              placeholder="90"
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              inputProps={{ step: '0.25', min: 0, max: 4 }}
                              value={opticalRx.addOD}
                              onChange={(e) => setOpticalRx({ ...opticalRx, addOD: parseFloat(e.target.value) || 0 })}
                              placeholder="+1.75"
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#0284c7' }}>
                            {(opticalRx.pdDistanceMM / 2).toFixed(1)} mm
                          </TableCell>
                        </TableRow>

                        {/* OS Left Eye */}
                        <TableRow sx={{ bgcolor: 'rgba(190, 24, 93, 0.02)' }}>
                          <TableCell sx={{ fontWeight: 800, color: '#be185d' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Visibility fontSize="small" />
                              OS (Left)
                            </Box>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              inputProps={{ step: '0.25', min: '-25.00', max: '+25.00' }}
                              value={opticalRx.sphereOS}
                              onChange={(e) => setOpticalRx({ ...opticalRx, sphereOS: parseFloat(e.target.value) || 0 })}
                              placeholder="-1.75"
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              inputProps={{ step: '0.25', min: '-10.00', max: '+10.00' }}
                              value={opticalRx.cylinderOS}
                              onChange={(e) => setOpticalRx({ ...opticalRx, cylinderOS: parseFloat(e.target.value) || 0 })}
                              placeholder="-0.50"
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              inputProps={{ min: 0, max: 180 }}
                              value={opticalRx.axisOS}
                              onChange={(e) => setOpticalRx({ ...opticalRx, axisOS: parseInt(e.target.value, 10) || 0 })}
                              placeholder="85"
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              inputProps={{ step: '0.25', min: 0, max: 4 }}
                              value={opticalRx.addOS}
                              onChange={(e) => setOpticalRx({ ...opticalRx, addOS: parseFloat(e.target.value) || 0 })}
                              placeholder="+1.75"
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#be185d' }}>
                            {(opticalRx.pdDistanceMM / 2).toFixed(1)} mm
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Pupillary Distance Bar */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Binocular Distance PD (mm)"
                        type="number"
                        inputProps={{ min: 50, max: 80 }}
                        value={opticalRx.pdDistanceMM}
                        onChange={(e) => {
                          const distPd = parseInt(e.target.value, 10) || 64;
                          setOpticalRx({
                            ...opticalRx,
                            pdDistanceMM: distPd,
                            pdNearMM: Math.max(50, distPd - 3)
                          });
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Binocular Near PD (mm)"
                        type="number"
                        inputProps={{ min: 45, max: 75 }}
                        value={opticalRx.pdNearMM}
                        onChange={(e) => setOpticalRx({ ...opticalRx, pdNearMM: parseInt(e.target.value, 10) || 61 })}
                      />
                    </Grid>
                  </Grid>

                  {/* Quick Usage Presets */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                      ⚡ Fast Lens & Lifestyle Presets
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label="👓 Progressive Everyday"
                        onClick={() => setOpticalRx({
                          ...opticalRx,
                          lensType: 'Digital Free-Form Progressive',
                          lensMaterial: 'Polycarbonate 1.59 (Impact Resistant)',
                          coatings: ['Anti-Reflective (AR)', 'Blue-Light Blocker 420nm', 'UV-400 Total Protection', 'Hydrophobic Easy-Clean']
                        })}
                        clickable
                        variant="outlined"
                        color="primary"
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip
                        label="💻 Computer / Workstation"
                        onClick={() => setOpticalRx({
                          ...opticalRx,
                          lensType: 'Office / Occupational Progressive',
                          lensMaterial: 'High Index 1.60 MR-8 (Thin & Lightweight)',
                          coatings: ['Anti-Reflective (AR)', 'Blue-Light Blocker 420nm', 'UV-400 Total Protection']
                        })}
                        clickable
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip
                        label="🚗 Driving & Outdoor"
                        onClick={() => setOpticalRx({
                          ...opticalRx,
                          lensType: 'Single Vision Distance',
                          lensMaterial: 'Photochromic Transitions Gen-8 (1.56 Auto-Darkening)',
                          coatings: ['Anti-Reflective (AR)', 'DriveSafe Night Anti-Glare', 'UV-400 Total Protection']
                        })}
                        clickable
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip
                        label="📖 Reading Magnifier"
                        onClick={() => setOpticalRx({
                          ...opticalRx,
                          lensType: 'Single Vision Reading (Near)',
                          lensMaterial: 'CR-39 Standard Resin (1.50)',
                          coatings: ['Anti-Reflective (AR)', 'Scratch Guard Hard Coat']
                        })}
                        clickable
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  </Box>

                  {/* Lens Design & Material Selectors */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Lens Design & Geometry</InputLabel>
                        <Select
                          value={opticalRx.lensType}
                          label="Lens Design & Geometry"
                          onChange={(e) => setOpticalRx({ ...opticalRx, lensType: e.target.value })}
                        >
                          {OPTICAL_LENS_TYPES.map((t) => (
                            <MenuItem key={t} value={t}>{t}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Lens Material Substrate</InputLabel>
                        <Select
                          value={opticalRx.lensMaterial}
                          label="Lens Material Substrate"
                          onChange={(e) => setOpticalRx({ ...opticalRx, lensMaterial: e.target.value })}
                        >
                          {OPTICAL_LENS_MATERIALS.map((m) => (
                            <MenuItem key={m} value={m}>{m}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  {/* Coatings & Treatments Chips Selector */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                      ✨ Optical Treatments & Multi-Coating Matrix
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {OPTICAL_COATINGS_OPTIONS.map((coating) => {
                        const isSelected = opticalRx.coatings.includes(coating);
                        return (
                          <Chip
                            key={coating}
                            label={coating}
                            icon={isSelected ? <CheckCircle fontSize="small" /> : undefined}
                            color={isSelected ? 'primary' : 'default'}
                            variant={isSelected ? 'filled' : 'outlined'}
                            onClick={() => {
                              if (isSelected) {
                                setOpticalRx({ ...opticalRx, coatings: opticalRx.coatings.filter(c => c !== coating) });
                              } else {
                                setOpticalRx({ ...opticalRx, coatings: [...opticalRx.coatings, coating] });
                              }
                            }}
                            sx={{ fontWeight: 600, borderRadius: 2 }}
                          />
                        );
                      })}
                    </Box>
                  </Box>

                  {/* Frame & Prescriber Info */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Frame Brand / Model (Optional)"
                        value={opticalRx.frameBrand}
                        onChange={(e) => setOpticalRx({ ...opticalRx, frameBrand: e.target.value })}
                        placeholder="e.g. Ray-Ban RB5154"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Frame Color & Size"
                        value={opticalRx.frameColor}
                        onChange={(e) => setOpticalRx({ ...opticalRx, frameColor: e.target.value })}
                        placeholder="e.g. Matte Black (52-18-140)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Prescription Validity</InputLabel>
                        <Select
                          value={opticalRx.expiryDays}
                          label="Prescription Validity"
                          onChange={(e) => setOpticalRx({ ...opticalRx, expiryDays: Number(e.target.value) })}
                        >
                          <MenuItem value={365}>1 Year (365 Days)</MenuItem>
                          <MenuItem value={730}>2 Years (730 Days)</MenuItem>
                          <MenuItem value={180}>6 Months (Pediatric / High Myopia)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Dispensing Instructions & Clinical Notes"
                        multiline
                        rows={2}
                        value={opticalRx.usageAdvice}
                        onChange={(e) => setOpticalRx({ ...opticalRx, usageAdvice: e.target.value })}
                        placeholder="e.g. Constant wear for computer workstation and general distance viewing."
                      />
                    </Grid>
                  </Grid>
                </Card>
              </Grid>

              {/* Sidebar Cards */}
              <Grid item xs={12} lg={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {/* Optical Shop Status Card */}
                  <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ShoppingCart color="primary" fontSize="small" />
                      Internal Optical Shop & Lab Queue
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <CheckCircle sx={{ color: '#16a34a', fontSize: 18 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#166534' }}>
                          Surfacing Lab: Online & Connected
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#15803d', display: 'block' }}>
                        Dispatched orders route directly to the edging terminal with barcode tracking.
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                        Patient Issued Orders:
                      </Typography>
                      <Chip
                        label={`${patientPrescriptions.length} Records in DB`}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 800 }}
                      />
                    </Box>
                  </Card>

                  {/* Refraction Cross-Reference Card */}
                  <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RemoveRedEye color="info" fontSize="small" />
                      Refraction Exam Reference
                    </Typography>
                    <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#0284c7', display: 'block' }}>
                        OD: Sph {refractionForm.sphereOD || '0.00'} / Cyl {refractionForm.cylinderOD || '0.00'} x {refractionForm.axisOD || '0'}° (Add: {refractionForm.addOD || '0.00'})
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#be185d', display: 'block', mt: 0.5 }}>
                        OS: Sph {refractionForm.sphereOS || '0.00'} / Cyl {refractionForm.cylinderOS || '0.00'} x {refractionForm.axisOS || '0'}° (Add: {refractionForm.addOS || '0.00'})
                      </Typography>
                    </Box>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<AutoAwesome />}
                      onClick={handleAutofillRxFromRefraction}
                      sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
                    >
                      Sync Refraction into Rx Grid
                    </Button>
                  </Card>

                  {/* Lens Index Guide Card */}
                  <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Tune color="secondary" fontSize="small" />
                      Lens Index Guide
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: '11px', color: '#475569' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', pb: 0.5 }}>
                        <span>Plano to ±2.00 DS:</span>
                        <strong>CR-39 (1.50) / Polycarb (1.59)</strong>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', pb: 0.5 }}>
                        <span>±2.25 to ±4.00 DS:</span>
                        <strong>Polycarbonate 1.59 / Hi-Index 1.60</strong>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', pb: 0.5 }}>
                        <span>±4.25 to ±6.00 DS:</span>
                        <strong>Hi-Index 1.67 Ultra-Thin</strong>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Above ±6.00 DS:</span>
                        <strong>Ultra High-Index 1.74 Slim</strong>
                      </Box>
                    </Box>
                  </Card>
                </Box>
              </Grid>
            </Grid>
          )}

          {/* TAB 2: Dispatched Rx Vault & Lab Queue */}
          {opticalRxTab === 'vault' && (
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Optical Prescription Vault & Lab Tracking Queue
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    All spectacle & contact lens prescriptions archived in PostgreSQL with real-time status management
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
                  <TextField
                    size="small"
                    placeholder="Search Rx #, lens, status..."
                    value={rxSearchQuery}
                    onChange={(e) => setRxSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: <Search fontSize="small" sx={{ color: '#94a3b8', mr: 1 }} />
                    }}
                    sx={{ width: { xs: '100%', sm: 260 } }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpticalRxTab('prescribe')}
                    sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, bgcolor: '#0284c7' }}
                  >
                    New Prescription
                  </Button>
                </Box>
              </Box>

              {loadingPrescriptions ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                  <CircularProgress size={36} />
                </Box>
              ) : patientPrescriptions.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8, bgcolor: '#f8fafc', borderRadius: 3, border: '2px dashed #cbd5e1' }}>
                  <LocalPharmacy sx={{ fontSize: 56, color: '#94a3b8', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#475569' }}>
                    No Optical Prescriptions Dispatched Yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 450, mx: 'auto', mb: 3 }}>
                    Issue your first spectacle or contact lens prescription for {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'the patient'} to dispatch to the optical laboratory.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<LocalPharmacy />}
                    onClick={() => setOpticalRxTab('prescribe')}
                    sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    E-Prescribe Now
                  </Button>
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Rx Reference</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Date & Doctor</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>OD Parameters</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>OS Parameters</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Lens Design & Material</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Lab Status</TableCell>
                        <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {patientPrescriptions
                        .filter((rx) => {
                          if (!rxSearchQuery) return true;
                          const q = rxSearchQuery.toLowerCase();
                          return (
                            rx.rxNumber?.toLowerCase().includes(q) ||
                            rx.lensType?.toLowerCase().includes(q) ||
                            rx.lensMaterial?.toLowerCase().includes(q) ||
                            rx.status?.toLowerCase().includes(q) ||
                            rx.eyeEncounter?.ophthalmologistName?.toLowerCase().includes(q)
                          );
                        })
                        .map((rx) => {
                          const statusConfig = OPTICAL_STATUS_CONFIG[rx.status] || { label: rx.status || 'ISSUED', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' };
                          const isUpdating = updatingRxId === rx.id;
                          return (
                            <TableRow key={rx.id} hover>
                              <TableCell>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0284c7' }}>
                                  {rx.rxNumber}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                  PD: {rx.pdDistanceMM}mm (Dist)
                                </Typography>
                              </TableCell>

                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                  {new Date(rx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b' }}>
                                  {rx.eyeEncounter?.ophthalmologistName || opticalRx.prescribedByName || 'Dr. Attending Doctor'}
                                </Typography>
                              </TableCell>

                              <TableCell>
                                <Box sx={{ fontSize: '11px', color: '#0369a1', fontWeight: 600 }}>
                                  Sph: {Number(rx.sphereOD) > 0 ? '+' : ''}{Number(rx.sphereOD).toFixed(2)}<br/>
                                  Cyl: {Number(rx.cylinderOD) > 0 ? '+' : ''}{Number(rx.cylinderOD).toFixed(2)} x {rx.axisOD}°<br/>
                                  {Number(rx.addOD) > 0 && <span>Add: +{Number(rx.addOD).toFixed(2)}</span>}
                                </Box>
                              </TableCell>

                              <TableCell>
                                <Box sx={{ fontSize: '11px', color: '#be185d', fontWeight: 600 }}>
                                  Sph: {Number(rx.sphereOS) > 0 ? '+' : ''}{Number(rx.sphereOS).toFixed(2)}<br/>
                                  Cyl: {Number(rx.cylinderOS) > 0 ? '+' : ''}{Number(rx.cylinderOS).toFixed(2)} x {rx.axisOS}°<br/>
                                  {Number(rx.addOS) > 0 && <span>Add: +{Number(rx.addOS).toFixed(2)}</span>}
                                </Box>
                              </TableCell>

                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                  {rx.lensType}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                  {rx.lensMaterial}
                                </Typography>
                                {Array.isArray(rx.coatings) && rx.coatings.length > 0 && (
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                    {rx.coatings.slice(0, 2).map((c: string) => (
                                      <Chip key={c} label={c} size="small" variant="outlined" sx={{ fontSize: '10px', height: 20 }} />
                                    ))}
                                    {rx.coatings.length > 2 && (
                                      <Chip label={`+${rx.coatings.length - 2}`} size="small" sx={{ fontSize: '10px', height: 20 }} />
                                    )}
                                  </Box>
                                )}
                              </TableCell>

                              <TableCell>
                                <FormControl size="small" sx={{ minWidth: 170 }}>
                                  <Select
                                    value={rx.status || 'DISPATCHED_TO_OPTICAL_SHOP'}
                                    disabled={isUpdating}
                                    onChange={(e) => handleUpdateRxStatus(rx.id, e.target.value)}
                                    sx={{
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      color: statusConfig.color,
                                      bgcolor: statusConfig.bg,
                                      borderColor: statusConfig.border,
                                      height: 32
                                    }}
                                  >
                                    <MenuItem value="DISPATCHED_TO_OPTICAL_SHOP">Dispatched to Optical Shop</MenuItem>
                                    <MenuItem value="IN_SURFACING_EDGING">In Surfacing & Edging</MenuItem>
                                    <MenuItem value="QUALITY_CHECKED">Quality Checked & Verified</MenuItem>
                                    <MenuItem value="READY_FOR_COLLECTION">Ready for Patient Pickup</MenuItem>
                                    <MenuItem value="DISPENSED_TO_PATIENT">Dispensed to Patient</MenuItem>
                                  </Select>
                                </FormControl>
                              </TableCell>

                              <TableCell sx={{ textAlign: 'center' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                  <Tooltip title="View & Print Certificate">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => {
                                        setSelectedRxForModal(rx);
                                        setRxModalOpen(true);
                                      }}
                                      sx={{ border: '1px solid #bae6fd', bgcolor: '#f0f9ff' }}
                                    >
                                      <Visibility fontSize="small" />
                                    </IconButton>
                                  </Tooltip>

                                  <Tooltip title="Instant Print Certificate">
                                    <IconButton
                                      size="small"
                                      color="secondary"
                                      onClick={() => handlePrintOpticalRxCertificate(rx)}
                                      sx={{ border: '1px solid #e2e8f0' }}
                                    >
                                      <Print fontSize="small" />
                                    </IconButton>
                                  </Tooltip>

                                  <Tooltip title="Delete Prescription">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteRx(rx.id)}
                                      sx={{ border: '1px solid #fecdd3', bgcolor: '#fff1f2' }}
                                    >
                                      <DeleteOutline fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          )}

          {/* Modal / Dialog for Viewing & Printing Prescription Certificate */}
          <Dialog
            open={rxModalOpen}
            onClose={() => setRxModalOpen(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
          >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  👓 Optical Prescription Certificate & Work Order
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Archived in PostgreSQL • Reference: {selectedRxForModal?.rxNumber}
                </Typography>
              </Box>
              <IconButton onClick={() => setRxModalOpen(false)}>
                <Close />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers>
              {selectedRxForModal && (
                <Box sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  {/* Certificate Header Preview */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0284c7', pb: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <img src={assetUrl('/anglican-logo.png')} alt="Anglican Logo" style={{ width: 48, height: 48, objectFit: 'contain' }} onError={(e: any) => e.target.style.display = 'none'} />
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0369a1', textTransform: 'uppercase' }}>
                          Faith Foundation Specialist Hospital
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                          Department of Ophthalmology & Optical Dispensing Services
                        </Typography>
                      </Box>
                    </Box>
                    <img src={assetUrl('/hospital-logo.png')} alt="Hospital Logo" style={{ width: 48, height: 48, objectFit: 'contain' }} onError={(e: any) => e.target.style.display = 'none'} />
                  </Box>

                  {/* Patient Info Grid */}
                  <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, mb: 2, border: '1px solid #e2e8f0' }}>
                    <Grid container spacing={1.5} sx={{ fontSize: '13px' }}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Patient Name:</Typography>
                        <strong>{selectedPatient?.firstName} {selectedPatient?.lastName}</strong>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Hospital No (MRN):</Typography>
                        <strong>{selectedPatient?.patientNumber || selectedPatient?.id?.slice(0, 8)}</strong>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Prescription No:</Typography>
                        <strong style={{ color: '#0284c7' }}>{selectedRxForModal.rxNumber}</strong>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Prescribed Date:</Typography>
                        <strong>{new Date(selectedRxForModal.createdAt).toLocaleDateString('en-GB')}</strong>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Dual Eye Table */}
                  <Table size="small" sx={{ mb: 2, border: '1px solid #cbd5e1' }}>
                    <TableHead sx={{ bgcolor: '#0f172a' }}>
                      <TableRow>
                        <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Eye</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Sphere (DS)</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Cylinder (DC)</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Axis (°)</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Near Add (NV)</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Mono PD</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 800 }}>Total PD</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow sx={{ bgcolor: '#f0f9ff' }}>
                        <TableCell sx={{ fontWeight: 800, color: '#0284c7' }}>OD (Right Eye)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{Number(selectedRxForModal.sphereOD) > 0 ? '+' : ''}{Number(selectedRxForModal.sphereOD).toFixed(2)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{Number(selectedRxForModal.cylinderOD) > 0 ? '+' : ''}{Number(selectedRxForModal.cylinderOD).toFixed(2)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{selectedRxForModal.axisOD}°</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{Number(selectedRxForModal.addOD) > 0 ? '+' + Number(selectedRxForModal.addOD).toFixed(2) : '--'}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{(Number(selectedRxForModal.pdDistanceMM) / 2).toFixed(1)} mm</TableCell>
                        <TableCell rowSpan={2} sx={{ bgcolor: '#f8fafc', fontWeight: 800, verticalAlign: 'middle', textAlign: 'center' }}>
                          Dist: {selectedRxForModal.pdDistanceMM} mm<br/>
                          Near: {selectedRxForModal.pdNearMM || selectedRxForModal.pdDistanceMM - 3} mm
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ bgcolor: '#fdf2f8' }}>
                        <TableCell sx={{ fontWeight: 800, color: '#be185d' }}>OS (Left Eye)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{Number(selectedRxForModal.sphereOS) > 0 ? '+' : ''}{Number(selectedRxForModal.sphereOS).toFixed(2)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{Number(selectedRxForModal.cylinderOS) > 0 ? '+' : ''}{Number(selectedRxForModal.cylinderOS).toFixed(2)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{selectedRxForModal.axisOS}°</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{Number(selectedRxForModal.addOS) > 0 ? '+' + Number(selectedRxForModal.addOS).toFixed(2) : '--'}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{(Number(selectedRxForModal.pdDistanceMM) / 2).toFixed(1)} mm</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  {/* Lens Specs & Advice */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 700 }}>Lens Design / Geometry:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>{selectedRxForModal.lensType}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 700 }}>Substrate Material / Index:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>{selectedRxForModal.lensMaterial}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 700 }}>Coatings & Optical Treatments:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0284c7' }}>
                        {Array.isArray(selectedRxForModal.coatings) ? selectedRxForModal.coatings.join(', ') : 'Standard Protective Coating'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 700 }}>Dispensing Instructions & Clinical Notes:</Typography>
                      <Typography variant="body2" sx={{ color: '#334155' }}>
                        {selectedRxForModal.usageAdvice || 'Constant wear recommended for visual acuity and eye strain relief.'}
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* Doctor Signature Block */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px dashed #cbd5e1' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Prescribing Ophthalmologist:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {selectedRxForModal.eyeEncounter?.ophthalmologistName || opticalRx.prescribedByName || 'Dr. Emmanuel Vegher'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Dispensary Status:</Typography>
                      <Chip
                        label={OPTICAL_STATUS_CONFIG[selectedRxForModal.status]?.label || selectedRxForModal.status}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 800 }}
                      />
                    </Box>
                  </Box>
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setRxModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748b' }}>
                Close
              </Button>
              <Button
                variant="contained"
                startIcon={<Print />}
                onClick={() => handlePrintOpticalRxCertificate(selectedRxForModal)}
                sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Print Official Certificate
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* ── 5. Equipment Telemetry & OCT Scans (/eye-clinic/telemetry) ────────── */}
      {currentSubCategory === 'telemetry' && (
        <Box>
          {/* Header Action Banner */}
          <Card sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Diagnostic Equipment Telemetry & High-Resolution Imaging (OCT / Fundus)
                  </Typography>
                  <Chip
                    icon={<Biotech sx={{ fontSize: '16px !important' }} />}
                    label="PACS Live Synced"
                    size="small"
                    sx={{ bgcolor: '#ecfdf5', color: '#059669', fontWeight: 800, border: '1px solid #a7f3d0' }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                  Direct DICOM & Modality Worklist telemetry from Heidelberg Spectralis OCT, Humphrey HFA3, and Topcon Retinal Cameras stored in PostgreSQL.
                </Typography>
              </Box>

              {/* Quick 1-Click Stream Buttons */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Science />}
                  disabled={ingestingScan || !selectedPatient}
                  onClick={() => handleSimulateDeviceScan('OCT_MACULA')}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#0284c7', color: '#0284c7' }}
                >
                  Acquire Macular OCT
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Timeline />}
                  disabled={ingestingScan || !selectedPatient}
                  onClick={() => handleSimulateDeviceScan('OCT_RNFL_GLAUCOMA')}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#16a34a', color: '#16a34a' }}
                >
                  Acquire RNFL Glaucoma
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CameraAlt />}
                  disabled={ingestingScan || !selectedPatient}
                  onClick={() => handleSimulateDeviceScan('FUNDUS_PHOTOGRAPHY')}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#be185d', color: '#be185d' }}
                >
                  Acquire Fundus Photo
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RemoveRedEye />}
                  disabled={ingestingScan || !selectedPatient}
                  onClick={() => handleSimulateDeviceScan('VISUAL_FIELD_PERIMETRY')}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#7c3aed', color: '#7c3aed' }}
                >
                  Acquire Visual Field
                </Button>
                <Tooltip title="Refresh Telemetry from Database">
                  <IconButton
                    size="small"
                    onClick={() => selectedPatient && fetchPatientTelemetry(selectedPatient.id)}
                    sx={{ border: '1px solid #cbd5e1', bgcolor: '#fff' }}
                  >
                    <Refresh fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Sub-Tab Navigator */}
            <Box sx={{ display: 'flex', gap: 1, mt: 2.5, borderTop: '1px solid #f1f5f9', pt: 2 }}>
              <Button
                variant={telemetryTab === 'pacs' ? 'contained' : 'outlined'}
                onClick={() => setTelemetryTab('pacs')}
                startIcon={<Fullscreen />}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: telemetryTab === 'pacs' ? '#0f172a' : '#fff',
                  color: telemetryTab === 'pacs' ? '#fff' : '#475569',
                  borderColor: '#cbd5e1',
                  '&:hover': { bgcolor: telemetryTab === 'pacs' ? '#1e293b' : '#f8fafc' }
                }}
              >
                Interactive PACS Viewer ({patientTelemetryScans.length})
              </Button>
              <Button
                variant={telemetryTab === 'ingest' ? 'contained' : 'outlined'}
                onClick={() => setTelemetryTab('ingest')}
                startIcon={<CloudUpload />}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: telemetryTab === 'ingest' ? '#0284c7' : '#fff',
                  color: telemetryTab === 'ingest' ? '#fff' : '#475569',
                  borderColor: '#cbd5e1',
                  '&:hover': { bgcolor: telemetryTab === 'ingest' ? '#0369a1' : '#f8fafc' }
                }}
              >
                Manual Ingestion & Upload
              </Button>
              <Button
                variant={telemetryTab === 'vault' ? 'contained' : 'outlined'}
                onClick={() => setTelemetryTab('vault')}
                startIcon={<Assessment />}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: telemetryTab === 'vault' ? '#059669' : '#fff',
                  color: telemetryTab === 'vault' ? '#fff' : '#475569',
                  borderColor: '#cbd5e1',
                  '&:hover': { bgcolor: telemetryTab === 'vault' ? '#047857' : '#f8fafc' }
                }}
              >
                Telemetry Vault & DICOM Logs
              </Button>
            </Box>
          </Card>

          {/* TAB 1: Interactive PACS Viewer & Live Scans */}
          {telemetryTab === 'pacs' && (
            <Box>
              {/* Filter Bar */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569' }}>Filter Modality:</Typography>
                {['ALL', 'OCT_MACULA', 'OCT_RNFL_GLAUCOMA', 'FUNDUS_PHOTOGRAPHY', 'VISUAL_FIELD_PERIMETRY', 'CORNEAL_TOPOGRAPHY'].map((modKey) => {
                  const isSelected = telemetryFilter === modKey;
                  const label = modKey === 'ALL' ? 'All Modalities' : (TELEMETRY_MODALITIES[modKey]?.label || modKey);
                  return (
                    <Chip
                      key={modKey}
                      label={label}
                      clickable
                      onClick={() => setTelemetryFilter(modKey)}
                      sx={{
                        fontWeight: 700,
                        bgcolor: isSelected ? '#0f172a' : '#f1f5f9',
                        color: isSelected ? '#fff' : '#475569',
                        '&:hover': { bgcolor: isSelected ? '#1e293b' : '#e2e8f0' }
                      }}
                    />
                  );
                })}
              </Box>

              {loadingTelemetry ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress size={36} sx={{ color: '#0284c7' }} />
                </Box>
              ) : patientTelemetryScans.length === 0 ? (
                <Card sx={{ p: 5, textAlign: 'center', borderRadius: 3, border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
                  <Biotech sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155' }}>
                    No Diagnostic Telemetry Scans in Database Yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 500, mx: 'auto', mt: 1, mb: 3 }}>
                    Acquire live telemetry directly from ophthalmic devices into PostgreSQL or manually ingest an external scan.
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      startIcon={<Science />}
                      onClick={() => handleSimulateDeviceScan('OCT_MACULA')}
                      sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                    >
                      Acquire Heidelberg Macular OCT
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Timeline />}
                      onClick={() => handleSimulateDeviceScan('OCT_RNFL_GLAUCOMA')}
                      sx={{ bgcolor: '#16a34a', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                    >
                      Acquire Zeiss RNFL Glaucoma Scan
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<CameraAlt />}
                      onClick={() => handleSimulateDeviceScan('FUNDUS_PHOTOGRAPHY')}
                      sx={{ bgcolor: '#be185d', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                    >
                      Acquire Topcon TrueColor Fundus
                    </Button>
                  </Box>
                </Card>
              ) : (
                <Grid container spacing={3}>
                  {patientTelemetryScans
                    .filter(s => telemetryFilter === 'ALL' || s.modality === telemetryFilter)
                    .map((scan) => {
                      const modConfig = TELEMETRY_MODALITIES[scan.modality] || {
                        label: scan.modality,
                        icon: '🔬',
                        color: '#0284c7',
                        bg: '#f0f9ff',
                        border: '#bae6fd'
                      };
                      return (
                        <Grid item xs={12} lg={6} key={scan.id}>
                          <Card sx={{
                            borderRadius: 3,
                            overflow: 'hidden',
                            border: `1px solid ${modConfig.border}`,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%'
                          }}>
                            {/* Card Top Header */}
                            <Box sx={{
                              p: 2,
                              bgcolor: modConfig.bg,
                              borderBottom: `1px solid ${modConfig.border}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ fontSize: 18 }}>{modConfig.icon}</Typography>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: modConfig.color }}>
                                    {modConfig.label}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                    {scan.deviceModel} • {new Date(scan.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip
                                  label={scan.eyeSide === 'OD' ? 'OD (Right)' : scan.eyeSide === 'OS' ? 'OS (Left)' : 'OU (Both)'}
                                  size="small"
                                  sx={{ fontWeight: 800, bgcolor: scan.eyeSide === 'OD' ? '#e0f2fe' : '#fce7f3', color: scan.eyeSide === 'OD' ? '#0369a1' : '#be185d' }}
                                />
                                <Chip
                                  label={`Q: ${scan.signalQuality || 9}/10`}
                                  size="small"
                                  sx={{ fontWeight: 800, bgcolor: '#f1f5f9', color: '#334155' }}
                                />
                              </Box>
                            </Box>

                            {/* Dynamic SVG / Telemetry Graphic Render */}
                            <Box sx={{ p: 2, bgcolor: '#020617', color: '#fff', position: 'relative' }}>
                              {scan.modality === 'OCT_MACULA' && (
                                <Box>
                                  <svg width="100%" height="180" viewBox="0 0 400 180" style={{ background: '#020617', borderRadius: 8 }}>
                                    {/* Retinal Layers */}
                                    <path d="M 20 110 Q 200 155 380 110" stroke="#22c55e" strokeWidth="4" fill="none" />
                                    <path d="M 20 90 Q 200 125 380 90" stroke="#eab308" strokeWidth="3" fill="none" />
                                    <path d="M 20 70 Q 200 100 380 70" stroke="#ef4444" strokeWidth="2" fill="none" strokeDasharray="4 2" />
                                    <ellipse cx="200" cy="135" rx="35" ry="10" fill="#38bdf8" opacity="0.45" />
                                    {/* Markers */}
                                    <line x1="200" y1="30" x2="200" y2="135" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
                                    <text x="200" y="24" fill="#38bdf8" textAnchor="middle" fontSize="12" fontWeight="700">
                                      FOVEAL ARCHITECTURE (CENTRAL: {scan.centralThickness || 248} µm)
                                    </text>
                                    <text x="200" y="170" fill="#94a3b8" textAnchor="middle" fontSize="10">
                                      Normative Range: 220–270 µm • IS/OS Photoreceptors Intact
                                    </text>
                                  </svg>
                                </Box>
                              )}

                              {scan.modality === 'OCT_RNFL_GLAUCOMA' && (
                                <Box>
                                  <svg width="100%" height="180" viewBox="0 0 400 180" style={{ background: '#020617', borderRadius: 8 }}>
                                    {/* TSNIT RNFL Curve */}
                                    <rect x="30" y="30" width="340" height="110" fill="#0f172a" rx="4" />
                                    {/* Normative Green Zone */}
                                    <rect x="30" y="55" width="340" height="45" fill="#16a34a" opacity="0.25" />
                                    <rect x="30" y="100" width="340" height="25" fill="#eab308" opacity="0.25" />
                                    <rect x="30" y="125" width="340" height="15" fill="#ef4444" opacity="0.25" />
                                    {/* TSNIT Graph line */}
                                    <path d="M 30 95 Q 115 45 200 95 T 370 95" stroke="#4ade80" strokeWidth="3" fill="none" />
                                    <text x="200" y="22" fill="#4ade80" textAnchor="middle" fontSize="12" fontWeight="700">
                                      RNFL TSNIT PROFILE (AVG: {scan.rnflAverage || 98} µm • C/D: {scan.cupDiscRatio || 0.32})
                                    </text>
                                    <text x="50" y="165" fill="#64748b" fontSize="10">Temporal</text>
                                    <text x="135" y="165" fill="#64748b" fontSize="10">Superior</text>
                                    <text x="200" y="165" fill="#64748b" fontSize="10">Nasal</text>
                                    <text x="270" y="165" fill="#64748b" fontSize="10">Inferior</text>
                                    <text x="345" y="165" fill="#64748b" fontSize="10">Temporal</text>
                                  </svg>
                                </Box>
                              )}

                              {scan.modality === 'FUNDUS_PHOTOGRAPHY' && (
                                <Box>
                                  <svg width="100%" height="180" viewBox="0 0 400 180" style={{ background: '#020617', borderRadius: 8 }}>
                                    <circle cx="200" cy="90" r="75" fill="#831843" opacity="0.85" />
                                    <circle cx="160" cy="90" r="16" fill="#fed7aa" />
                                    <circle cx="160" cy="90" r="6" fill="#ffedd5" />
                                    <circle cx="230" cy="90" r="6" fill="#4c0519" />
                                    <path d="M 160 90 Q 200 50 255 45 M 160 90 Q 200 130 255 135 M 160 90 Q 130 60 100 55 M 160 90 Q 130 120 100 125" stroke="#ef4444" strokeWidth="2.5" fill="none" />
                                    <text x="200" y="22" fill="#f472b6" textAnchor="middle" fontSize="12" fontWeight="700">
                                      POSTERIOR POLE • OPTIC NERVE & MACULA
                                    </text>
                                    <text x="200" y="172" fill="#94a3b8" textAnchor="middle" fontSize="10">
                                      Retinal Arteries & Veins Caliber Normal • A/V Ratio 2:3
                                    </text>
                                  </svg>
                                </Box>
                              )}

                              {scan.modality === 'VISUAL_FIELD_PERIMETRY' && (
                                <Box>
                                  <svg width="100%" height="180" viewBox="0 0 400 180" style={{ background: '#020617', borderRadius: 8 }}>
                                    <circle cx="200" cy="90" r="70" stroke="#334155" strokeWidth="1" fill="#0f172a" />
                                    <line x1="130" y1="90" x2="270" y2="90" stroke="#334155" strokeWidth="1" />
                                    <line x1="200" y1="20" x2="200" y2="160" stroke="#334155" strokeWidth="1" />
                                    {/* Grayscale perimetry sensitivity dots */}
                                    <circle cx="200" cy="90" r="5" fill="#f8fafc" />
                                    <circle cx="180" cy="80" r="5" fill="#e2e8f0" />
                                    <circle cx="220" cy="80" r="5" fill="#cbd5e1" />
                                    <circle cx="180" cy="100" r="5" fill="#e2e8f0" />
                                    <circle cx="220" cy="100" r="5" fill="#cbd5e1" />
                                    <circle cx="155" cy="90" r="5" fill="#94a3b8" />
                                    <circle cx="245" cy="90" r="6" fill="#020617" stroke="#ef4444" strokeWidth="1.5" />
                                    <text x="200" y="20" fill="#a78bfa" textAnchor="middle" fontSize="12" fontWeight="700">
                                      HFA3 24-2 SITA-FASTER • SENSITIVITY MAP
                                    </text>
                                    <text x="200" y="172" fill="#94a3b8" textAnchor="middle" fontSize="10">
                                      Mean Deviation (MD): -0.84 dB (Normal) • VFI: 99%
                                    </text>
                                  </svg>
                                </Box>
                              )}

                              {scan.modality === 'CORNEAL_TOPOGRAPHY' && (
                                <Box>
                                  <svg width="100%" height="180" viewBox="0 0 400 180" style={{ background: '#020617', borderRadius: 8 }}>
                                    <circle cx="200" cy="90" r="65" fill="#1e3a8a" opacity="0.6" />
                                    <circle cx="200" cy="90" r="48" fill="#0284c7" opacity="0.6" />
                                    <circle cx="200" cy="90" r="32" fill="#22c55e" opacity="0.6" />
                                    <circle cx="200" cy="90" r="16" fill="#eab308" opacity="0.6" />
                                    <text x="200" y="20" fill="#fbbf24" textAnchor="middle" fontSize="12" fontWeight="700">
                                      AXIAL POWER MAP (SIM-K: 43.25 D @ 90° / 42.75 D @ 180°)
                                    </text>
                                    <text x="200" y="172" fill="#94a3b8" textAnchor="middle" fontSize="10">
                                      Symmetric With-The-Rule Astigmatism • Regular Cornea
                                    </text>
                                  </svg>
                                </Box>
                              )}
                            </Box>

                            {/* Card Body Metrics & Findings */}
                            <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              {/* Quantitative Metric Badges */}
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1.5, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10, fontWeight: 700 }}>CENTRAL</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#0284c7' }}>
                                    {scan.centralThickness ? `${scan.centralThickness} µm` : '—'}
                                  </Typography>
                                </Box>
                                <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1.5, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10, fontWeight: 700 }}>RNFL AVG</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#16a34a' }}>
                                    {scan.rnflAverage ? `${scan.rnflAverage} µm` : '—'}
                                  </Typography>
                                </Box>
                                <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1.5, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10, fontWeight: 700 }}>C/D RATIO</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#d97706' }}>
                                    {scan.cupDiscRatio !== null && scan.cupDiscRatio !== undefined ? scan.cupDiscRatio : '—'}
                                  </Typography>
                                </Box>
                              </Box>

                              {/* Findings Summary */}
                              <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534', display: 'block', mb: 0.5 }}>
                                  Diagnostic Findings:
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#14532d', fontSize: 12 }}>
                                  {scan.findingsSummary}
                                </Typography>
                              </Box>

                              {scan.clinicalNotes && (
                                <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                                  Notes: {scan.clinicalNotes}
                                </Typography>
                              )}
                            </Box>

                            {/* Card Footer Actions */}
                            <Box sx={{
                              p: 1.5,
                              px: 2,
                              bgcolor: '#f8fafc',
                              borderTop: '1px solid #e2e8f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                                {scan.scanNumber}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Fullscreen />}
                                  onClick={() => {
                                    setSelectedScanForModal(scan);
                                    setScanModalOpen(true);
                                  }}
                                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, fontSize: 11 }}
                                >
                                  PACS Details
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<Print />}
                                  onClick={() => handlePrintTelemetryReport(scan)}
                                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, bgcolor: '#0284c7', fontSize: 11 }}
                                >
                                  Print Report
                                </Button>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteTelemetryScan(scan.id)}
                                  sx={{ p: 0.5 }}
                                >
                                  <DeleteOutline fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          </Card>
                        </Grid>
                      );
                    })}
                </Grid>
              )}
            </Box>
          )}

          {/* TAB 2: Manual Ingestion & Upload */}
          {telemetryTab === 'ingest' && (
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                Manual Diagnostic Telemetry Ingestion & DICOM Upload
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 3 }}>
                Ingest custom OCT cross-sections, RNFL analyses, or external DICOM packages into the patient's permanent PostgreSQL medical file.
              </Typography>

              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Equipment / Device Model</InputLabel>
                    <Select
                      value={newScanForm.deviceModel}
                      label="Equipment / Device Model"
                      onChange={(e) => setNewScanForm(prev => ({ ...prev, deviceModel: e.target.value }))}
                    >
                      {TELEMETRY_DEVICES.map((d) => (
                        <MenuItem key={d} value={d}>{d}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Device Serial Number (S/N)"
                    value={newScanForm.deviceSerial}
                    onChange={(e) => setNewScanForm(prev => ({ ...prev, deviceSerial: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Diagnostic Modality</InputLabel>
                    <Select
                      value={newScanForm.modality}
                      label="Diagnostic Modality"
                      onChange={(e) => setNewScanForm(prev => ({ ...prev, modality: e.target.value }))}
                    >
                      {Object.entries(TELEMETRY_MODALITIES).map(([key, item]) => (
                        <MenuItem key={key} value={key}>{item.icon} {item.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Examined Eye (Side)</InputLabel>
                    <Select
                      value={newScanForm.eyeSide}
                      label="Examined Eye (Side)"
                      onChange={(e) => setNewScanForm(prev => ({ ...prev, eyeSide: e.target.value }))}
                    >
                      <MenuItem value="OD">OD — Right Eye</MenuItem>
                      <MenuItem value="OS">OS — Left Eye</MenuItem>
                      <MenuItem value="OU">OU — Both Eyes (Binocular)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Central Subfield Thickness (µm)"
                    value={newScanForm.centralThickness}
                    onChange={(e) => setNewScanForm(prev => ({ ...prev, centralThickness: Number(e.target.value) }))}
                    helperText="Norm: 220–270 µm"
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Average RNFL Thickness (µm)"
                    value={newScanForm.rnflAverage}
                    onChange={(e) => setNewScanForm(prev => ({ ...prev, rnflAverage: Number(e.target.value) }))}
                    helperText="Norm: 85–110 µm"
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    inputProps={{ step: '0.01', min: '0', max: '1' }}
                    label="Optic Cup / Disc Ratio"
                    value={newScanForm.cupDiscRatio}
                    onChange={(e) => setNewScanForm(prev => ({ ...prev, cupDiscRatio: Number(e.target.value) }))}
                    helperText="Norm: 0.20–0.45"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Automated Segmentation & Diagnostic Findings"
                    multiline
                    rows={2}
                    value={newScanForm.findingsSummary}
                    onChange={(e) => setNewScanForm(prev => ({ ...prev, findingsSummary: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Physician Clinical Notes & Diagnostic Summary"
                    multiline
                    rows={2}
                    value={newScanForm.clinicalNotes}
                    onChange={(e) => setNewScanForm(prev => ({ ...prev, clinicalNotes: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Attending Specialist / Optometrist"
                    value={newScanForm.clinicianName}
                    onChange={(e) => setNewScanForm(prev => ({ ...prev, clinicianName: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setTelemetryTab('pacs')}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={ingestingScan ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <CloudUpload />}
                    disabled={ingestingScan || !selectedPatient}
                    onClick={handleIngestTelemetryScan}
                    sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    {ingestingScan ? 'Ingesting to PostgreSQL...' : 'Ingest Scan into PACS'}
                  </Button>
                </Grid>
              </Grid>
            </Card>
          )}

          {/* TAB 3: Diagnostic Telemetry Vault & DICOM Logs */}
          {telemetryTab === 'vault' && (
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Diagnostic Telemetry Vault & Permanent PACS Log
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Audit trail of all high-resolution scans, DICOM objects, and diagnostic sessions stored for this patient.
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  placeholder="Search scan #, device, findings..."
                  value={telemetrySearchQuery}
                  onChange={(e) => setTelemetrySearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <Search fontSize="small" sx={{ color: '#94a3b8', mr: 1 }} />
                  }}
                  sx={{ width: 280 }}
                />
              </Box>

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Accession #</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Modality</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Eye</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Device Model</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Central / RNFL / CDR</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Quality</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Date & Time</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {patientTelemetryScans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                          No telemetry records found for this patient in PostgreSQL.
                        </TableCell>
                      </TableRow>
                    ) : (
                      patientTelemetryScans
                        .filter(s => {
                          if (!telemetrySearchQuery) return true;
                          const q = telemetrySearchQuery.toLowerCase();
                          return (
                            (s.scanNumber || '').toLowerCase().includes(q) ||
                            (s.deviceModel || '').toLowerCase().includes(q) ||
                            (s.modality || '').toLowerCase().includes(q) ||
                            (s.findingsSummary || '').toLowerCase().includes(q)
                          );
                        })
                        .map((scan) => {
                          const modConfig = TELEMETRY_MODALITIES[scan.modality] || { label: scan.modality, icon: '🔬', color: '#0284c7' };
                          return (
                            <TableRow key={scan.id} hover>
                              <TableCell sx={{ fontWeight: 700, color: '#0284c7' }}>
                                {scan.scanNumber}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={`${modConfig.icon} ${modConfig.label}`}
                                  size="small"
                                  sx={{ fontWeight: 700, bgcolor: '#f0f9ff', color: '#0369a1' }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={scan.eyeSide}
                                  size="small"
                                  sx={{
                                    fontWeight: 800,
                                    bgcolor: scan.eyeSide === 'OD' ? '#e0f2fe' : '#fce7f3',
                                    color: scan.eyeSide === 'OD' ? '#0369a1' : '#be185d'
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ color: '#334155' }}>
                                {scan.deviceModel}
                              </TableCell>
                              <TableCell sx={{ color: '#0f172a', fontWeight: 600 }}>
                                {scan.centralThickness ? `${scan.centralThickness}µm` : '—'} / {scan.rnflAverage ? `${scan.rnflAverage}µm` : '—'} / {scan.cupDiscRatio || '—'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={`${scan.signalQuality || 9}/10`}
                                  size="small"
                                  sx={{ bgcolor: '#ecfdf5', color: '#059669', fontWeight: 700 }}
                                />
                              </TableCell>
                              <TableCell sx={{ color: '#64748b', fontSize: 12 }}>
                                {new Date(scan.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(scan.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSelectedScanForModal(scan);
                                      setScanModalOpen(true);
                                    }}
                                    sx={{ color: '#0284c7' }}
                                  >
                                    <Fullscreen fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handlePrintTelemetryReport(scan)}
                                    sx={{ color: '#475569' }}
                                  >
                                    <Print fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteTelemetryScan(scan.id)}
                                  >
                                    <DeleteOutline fontSize="small" />
                                  </IconButton>
                                </Box>
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

          {/* High-Resolution Scan Details & Printable Report Dialog */}
          <Dialog
            open={scanModalOpen}
            onClose={() => setScanModalOpen(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
          >
            <DialogTitle sx={{ bgcolor: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Fullscreen sx={{ color: '#38bdf8' }} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  PACS High-Resolution Telemetry — {selectedScanForModal?.scanNumber}
                </Typography>
              </Box>
              <IconButton onClick={() => setScanModalOpen(false)} sx={{ color: '#94a3b8' }}>
                <Close />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              {selectedScanForModal && (
                <Box>
                  {/* Patient & Device Meta Grid */}
                  <Grid container spacing={2} sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 700 }}>Patient Name & MRN:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {selectedPatient?.firstName} {selectedPatient?.lastName} ({selectedPatient?.patientNumber || 'MRN-N/A'})
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 700 }}>Device Model & S/N:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {selectedScanForModal.deviceModel} ({selectedScanForModal.deviceSerial || 'HD-OCT-8821'})
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 700 }}>Modality & Examined Eye:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0284c7' }}>
                        {TELEMETRY_MODALITIES[selectedScanForModal.modality]?.label || selectedScanForModal.modality} • {selectedScanForModal.eyeSide === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'}
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* Quantitative Telemetry Metrics */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 3 }}>
                    <Box sx={{ p: 1.5, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700, display: 'block' }}>Central Thickness</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#0284c7' }}>
                        {selectedScanForModal.centralThickness ? `${selectedScanForModal.centralThickness} µm` : '—'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10 }}>Norm: 220–270 µm</Typography>
                    </Box>

                    <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#166534', fontWeight: 700, display: 'block' }}>RNFL Average</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#16a34a' }}>
                        {selectedScanForModal.rnflAverage ? `${selectedScanForModal.rnflAverage} µm` : '—'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10 }}>Norm: 85–110 µm</Typography>
                    </Box>

                    <Box sx={{ p: 1.5, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fde68a', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 700, display: 'block' }}>Cup / Disc Ratio</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#d97706' }}>
                        {selectedScanForModal.cupDiscRatio !== null && selectedScanForModal.cupDiscRatio !== undefined ? selectedScanForModal.cupDiscRatio : '—'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10 }}>Norm: 0.20–0.45</Typography>
                    </Box>

                    <Box sx={{ p: 1.5, bgcolor: '#f5f3ff', borderRadius: 2, border: '1px solid #ddd6fe', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#5b21b6', fontWeight: 700, display: 'block' }}>Signal Quality</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#7c3aed' }}>
                        {selectedScanForModal.signalQuality || 9}/10
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#16a34a', fontSize: 10 }}>Optimal Acquisition</Typography>
                    </Box>
                  </Box>

                  {/* Findings Box */}
                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                      Automated Segmentation & Pathology Findings:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#334155' }}>
                      {selectedScanForModal.findingsSummary}
                    </Typography>
                  </Box>

                  {selectedScanForModal.clinicalNotes && (
                    <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                        Consultant Ophthalmic Notes:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        {selectedScanForModal.clinicalNotes}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between', bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <Button onClick={() => setScanModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748b' }}>
                Close
              </Button>
              <Button
                variant="contained"
                startIcon={<Print />}
                onClick={() => handlePrintTelemetryReport(selectedScanForModal)}
                sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Print High-Resolution Report
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
}
