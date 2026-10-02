import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  AutoAwesome,
  CameraAlt,
  CloudUpload,
  Delete,
  FlipCameraIos,
  PhotoCamera,
  Refresh,
  CheckCircle,
  FolderSpecial,
  Timeline,
  LocalHospital,
  Medication,
  Science,
  Warning,
  Description,
  Add,
  ZoomIn,
  ZoomOut,
  RotateRight,
  History,
  Person,
  Bolt,
  Close,
  AssignmentTurnedIn,
  Lock,
  Shield,
  FactCheck,
  CheckCircleOutline,
  HighlightOff,
  RemoveCircleOutline,
  FindInPage
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ScannedPage {
  id: string;
  dataUrl: string;
  label: string;
  rotation: number;
}

interface ExtractedVitalSign {
  id?: string;
  recordedDate: string;
  recordedTime?: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  painScore?: number;
  notes?: string;
}

interface ExtractedSOAPEncounter {
  id?: string;
  visitDate: string;
  visitType?: string;
  doctorName?: string;
  specialty?: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  physicalExamination: string;
  assessment: string;
  plan: string;
  clinicalNotes?: string;
}

interface ExtractedDiagnosis {
  id?: string;
  diagnosisName: string;
  icd10Code?: string;
  date?: string;
  type?: string;
  status?: string;
}

interface ExtractedPrescription {
  id?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  route?: string;
  duration?: string;
  instructions?: string;
  prescribedDate?: string;
}

interface ExtractedLabResult {
  id?: string;
  testName: string;
  specimenType?: string;
  resultValue?: string;
  unit?: string;
  referenceRange?: string;
  orderedDate?: string;
  status?: string;
}

interface ExtractedAllergy {
  id?: string;
  allergen: string;
  reaction?: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  category?: string;
}

interface ExtractedPatientBioData {
  folderNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate?: string;
  ageYears?: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'SEPARATED';
  bloodGroup?: string;
  genotype?: string;
  phone?: string;
  address?: string;
  occupation?: string;
  religion?: string;
  spokenLanguage?: string;
  nin?: string;
  stateOfOrigin?: string;
  lga?: string;
  nokName?: string;
  nokRelationship?: string;
  nokPhone?: string;
  nokAddress?: string;
  emergencyName?: string;
  emergencyPhone?: string;
}

export default function RecordMigration() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const isSuperAdmin = Boolean(
    user?.role === 'SUPER_ADMIN' ||
    user?.roles?.includes('SUPER_ADMIN') ||
    user?.role?.toUpperCase() === 'SUPER_ADMIN' ||
    (user?.designation || '').toLowerCase().includes('super admin')
  );

  // Camera & Capture State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Scanned Pages Batch
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Extraction & Processing State
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionStep, setExtractionStep] = useState<string>('');
  const [activeTab, setActiveTab] = useState<number>(0);

  // Extracted Data State
  const [patientData, setPatientData] = useState<ExtractedPatientBioData | null>(null);
  const [vitalsList, setVitalsList] = useState<ExtractedVitalSign[]>([]);
  const [encountersList, setEncountersList] = useState<ExtractedSOAPEncounter[]>([]);
  const [diagnosesList, setDiagnosesList] = useState<ExtractedDiagnosis[]>([]);
  const [prescriptionsList, setPrescriptionsList] = useState<ExtractedPrescription[]>([]);
  const [labList, setLabList] = useState<ExtractedLabResult[]>([]);
  const [allergiesList, setAllergiesList] = useState<ExtractedAllergy[]>([]);
  const [confidenceScore, setConfidenceScore] = useState<number>(95);
  const [aiNotes, setAiNotes] = useState<string>('');

  // Existing Patient Detection & Merge
  const [existingMatch, setExistingMatch] = useState<any | null>(null);
  const [mergeOption, setMergeOption] = useState<'CREATE_NEW' | 'MERGE_APPEND'>('CREATE_NEW');

  // Commit & Ingestion State
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [migrationSuccessDialog, setMigrationSuccessDialog] = useState<boolean>(false);
  const [migrationResultSummary, setMigrationResultSummary] = useState<any | null>(null);

  // Migration Stats & History
  const [stats, setStats] = useState<{ totalScannedPagesArchived: number; estimatedMigratedFolders: number; totalHospitalPatients: number }>({
    totalScannedPagesArchived: 0,
    estimatedMigratedFolders: 0,
    totalHospitalPatients: 0
  });
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [recentMigrations, setRecentMigrations] = useState<any[]>([]);

  useEffect(() => {
    // Purge any huge or accidental folder-extraction items from offline_sync_queue
    try {
      const queueRaw = localStorage.getItem('offline_sync_queue');
      if (queueRaw) {
        const queue = JSON.parse(queueRaw);
        if (Array.isArray(queue)) {
          const filtered = queue.filter((item: any) => 
            !item.url?.includes('/records-migration/extract-folder') &&
            !item.url?.includes('/records-migration/check-patient-match')
          );
          if (filtered.length !== queue.length) {
            localStorage.setItem('offline_sync_queue', JSON.stringify(filtered));
            window.dispatchEvent(new Event('offline-sync-updated'));
          }
        }
      }
    } catch {
      // Non-blocking
    }

    fetchStatsAndHistory();
    refreshCameraDevices();
    return () => {
      stopCamera();
    };
  }, []);

  // Ensure video element plays stream as soon as it mounts or stream changes
  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(err => {
        console.warn('Video element auto-play waiting for user interaction:', err);
      });
    }
  }, [cameraActive, stream]);

  const refreshCameraDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devices.filter(d => d.kind === 'videoinput');
        setCameraDevices(videoDevs);
      }
    } catch {
      // Non-blocking
    }
  };

  const fetchStatsAndHistory = async () => {
    try {
      const res = await api.get('/records-migration/history');
      if (res.data?.success) {
        setStats(res.data.stats || { totalScannedPagesArchived: 0, estimatedMigratedFolders: 0, totalHospitalPatients: 0 });
        setRecentMigrations(res.data.recentMigrations || []);
      }
    } catch {
      // Non-blocking
    }
  };

  // Resilient Multi-tier Camera Management (Laptops, Tablets, Webcams)
  const startCamera = async (mode: 'environment' | 'user' = facingMode, deviceId?: string) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not available in this browser context (HTTPS or localhost required).');
      }

      let mediaStream: MediaStream | null = null;
      const targetDeviceId = deviceId || selectedDeviceId;

      // Tier 1: Target specific selected camera device if chosen
      if (targetDeviceId) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: targetDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          });
        } catch {
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: targetDeviceId }
            });
          } catch {
            // fallback
          }
        }
      }

      // Tier 2: Try ideal facingMode and high-resolution document scanning
      if (!mediaStream) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          });
        } catch (err1) {
          console.warn('High-res facingMode camera constraint failed, trying standard facingMode...', err1);
        }
      }

      // Tier 3: Standard facingMode
      if (!mediaStream) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode }
          });
        } catch (err2) {
          console.warn('Standard facingMode failed, falling back to universal video...', err2);
        }
      }

      // Tier 4: Universal fallback for any laptop webcam or tablet camera
      if (!mediaStream) {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      setStream(mediaStream);
      setCameraActive(true);
      refreshCameraDevices();
      enqueueSnackbar('📸 Camera scanner activated! Position the folder page and tap Snap.', { variant: 'success' });
    } catch (err: any) {
      console.warn('Camera stream initialization error:', err);
      enqueueSnackbar(
        err.message || 'Could not start live camera. You can also tap "Direct Device Camera" or "Upload Files".',
        { variant: 'warning' }
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  // Image optimizer to keep high OCR clarity while reducing multi-page payload from ~30MB down to ~1.5MB
  const optimizeImageForOCR = (dataUrl: string, maxDim = 1600, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && dataUrl.length < 500000) {
          resolve(dataUrl);
          return;
        }
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const rawW = videoRef.current.videoWidth || 1280;
    const rawH = videoRef.current.videoHeight || 720;
    const maxDim = 1600;
    let w = rawW;
    let h = rawH;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    const newPage: ScannedPage = {
      id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      dataUrl,
      label: `Page ${pages.length + 1} (Camera Snap)`,
      rotation: 0
    };

    setPages(prev => [...prev, newPage]);
    setSelectedPageIndex(pages.length);
    enqueueSnackbar(`📸 Page ${pages.length + 1} captured!`, { variant: 'success' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawDataUrl = event.target?.result as string;
        if (rawDataUrl) {
          const optimizedDataUrl = await optimizeImageForOCR(rawDataUrl);
          setPages(prev => [
            ...prev,
            {
              id: `page-upload-${Date.now()}-${index}`,
              dataUrl: optimizedDataUrl,
              label: `Page ${prev.length + 1} (${file.name})`,
              rotation: 0
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    enqueueSnackbar(`📥 Added ${files.length} document page(s) to migration queue`, { variant: 'info' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePage = (index: number) => {
    setPages(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (selectedPageIndex >= updated.length) {
        setSelectedPageIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const handleRotatePage = (index: number) => {
    setPages(prev => prev.map((p, i) => i === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  };

  // Run Multimodal AI Extraction
  const handleRunAiExtraction = async () => {
    if (pages.length === 0) {
      enqueueSnackbar('Please snap or upload at least one folder page first!', { variant: 'warning' });
      return;
    }

    setIsExtracting(true);
    setExtractionStep('1/5 Optical Character Recognition & Clinical Classification...');

    try {
      setTimeout(() => setExtractionStep('2/5 Extracting Patient Identity & Hospital Folder Numbers...'), 1200);
      setTimeout(() => setExtractionStep('3/5 Parsing Time-Series Vital Signs Observation Charts...'), 2600);
      setTimeout(() => setExtractionStep('4/5 Structuring Chronological Doctor SOAP Consultations & Diagnoses...'), 4200);
      setTimeout(() => setExtractionStep('5/5 Formatting Historical Prescriptions, Lab Slips & Allergies...'), 6000);

      const payload = {
        images: pages.map(p => p.dataUrl)
      };

      const res = await api.post('/records-migration/extract-folder', payload, {
        timeout: 180000,
        skipOfflineQueue: true
      } as any);

      if (res.data?.success && res.data.data) {
        const extracted = res.data.data;
        setPatientData(extracted.patient);
        setVitalsList(extracted.vitals || []);
        setEncountersList(extracted.encounters || []);
        setDiagnosesList(extracted.diagnoses || []);
        setPrescriptionsList(extracted.prescriptions || []);
        setLabList(extracted.labInvestigations || []);
        setAllergiesList(extracted.allergies || []);
        setConfidenceScore(extracted.overallConfidenceScore || 95);
        setAiNotes(extracted.aiNotes || '');

        if (res.data.existingMatch) {
          setExistingMatch(res.data.existingMatch);
          setMergeOption('MERGE_APPEND');
          enqueueSnackbar(`⚠️ Matching Patient Profile Detected: "${res.data.existingMatch.fullName}" (${res.data.existingMatch.patientNumber})`, { variant: 'info' });
        } else {
          setExistingMatch(null);
          setMergeOption('CREATE_NEW');
        }

        stopCamera();
        enqueueSnackbar('🎉 Folder analysis completed! Review and verify clinical fields below.', { variant: 'success' });
      } else {
        throw new Error(res.data?.message || 'Failed to extract folder data');
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || err.message || 'AI folder extraction encountered an issue', { variant: 'error' });
    } finally {
      setIsExtracting(false);
      setExtractionStep('');
    }
  };

  // Commit Verified Data into Database
  const handleCommitMigration = async () => {
    if (!patientData || !patientData.firstName || !patientData.lastName) {
      enqueueSnackbar('Patient first name and last name are required to commit records', { variant: 'error' });
      return;
    }

    setIsCommitting(true);
    try {
      const payload = {
        patient: patientData,
        vitals: vitalsList,
        encounters: encountersList,
        diagnoses: diagnosesList,
        prescriptions: prescriptionsList,
        labInvestigations: labList,
        allergies: allergiesList,
        scannedPages: pages.map((p, idx) => ({ pageIndex: idx, dataUrl: p.dataUrl, label: p.label })),
        mergeOption,
        existingPatientId: existingMatch?.patientId
      };

      const res = await api.post('/records-migration/commit-migration', payload);

      if (res.data?.success) {
        setMigrationResultSummary(res.data.data);
        setMigrationSuccessDialog(true);
        enqueueSnackbar(res.data.message || 'Hospital records migrated successfully!', { variant: 'success' });
        fetchStatsAndHistory();
      } else {
        throw new Error(res.data?.message || 'Failed to commit migration');
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || err.message || 'Failed to commit migration', { variant: 'error' });
    } finally {
      setIsCommitting(false);
    }
  };

  const handleResetForNextFolder = () => {
    setPages([]);
    setPatientData(null);
    setVitalsList([]);
    setEncountersList([]);
    setDiagnosesList([]);
    setPrescriptionsList([]);
    setLabList([]);
    setAllergiesList([]);
    setExistingMatch(null);
    setMergeOption('CREATE_NEW');
    setMigrationSuccessDialog(false);
    setMigrationResultSummary(null);
    setSelectedPageIndex(0);
    setActiveTab(0);
    startCamera();
  };

  // ── Form Completeness & Emptiness Audit Matrix ────────────────────
  const isBioDataComplete = Boolean(patientData?.folderNumber?.trim() && patientData?.lastName?.trim() && patientData?.firstName?.trim());
  const isBioDataEmpty = !patientData || (!patientData.folderNumber && !patientData.lastName && !patientData.firstName);

  const formAuditList = [
    {
      id: 0,
      name: 'Bio-Data',
      label: 'Patient Identity & Demographics',
      count: isBioDataComplete ? 1 : 0,
      countLabel: isBioDataComplete ? 'Complete' : 'Incomplete',
      isEmpty: isBioDataEmpty || !isBioDataComplete,
      color: isBioDataComplete ? '#047857' : '#d97706',
      bgColor: isBioDataComplete ? '#ecfdf5' : '#fffbeb',
      borderColor: isBioDataComplete ? '#a7f3d0' : '#fed7aa',
      icon: <Person fontSize="small" />
    },
    {
      id: 1,
      name: 'Vitals Chart',
      label: 'Time-Series Vital Signs',
      count: vitalsList.length,
      countLabel: `${vitalsList.length} Record${vitalsList.length !== 1 ? 's' : ''}`,
      isEmpty: vitalsList.length === 0,
      color: vitalsList.length > 0 ? '#047857' : '#dc2626',
      bgColor: vitalsList.length > 0 ? '#ecfdf5' : '#fef2f2',
      borderColor: vitalsList.length > 0 ? '#a7f3d0' : '#fecaca',
      icon: <Timeline fontSize="small" />
    },
    {
      id: 2,
      name: 'SOAP Notes',
      label: 'Doctor Clinical Encounters',
      count: encountersList.length,
      countLabel: `${encountersList.length} Visit${encountersList.length !== 1 ? 's' : ''}`,
      isEmpty: encountersList.length === 0,
      color: encountersList.length > 0 ? '#047857' : '#dc2626',
      bgColor: encountersList.length > 0 ? '#ecfdf5' : '#fef2f2',
      borderColor: encountersList.length > 0 ? '#a7f3d0' : '#fecaca',
      icon: <LocalHospital fontSize="small" />
    },
    {
      id: 3,
      name: 'Prescriptions',
      label: 'Historical Prescriptions & Rx',
      count: prescriptionsList.length,
      countLabel: `${prescriptionsList.length} Drug${prescriptionsList.length !== 1 ? 's' : ''}`,
      isEmpty: prescriptionsList.length === 0,
      color: prescriptionsList.length > 0 ? '#047857' : '#dc2626',
      bgColor: prescriptionsList.length > 0 ? '#ecfdf5' : '#fef2f2',
      borderColor: prescriptionsList.length > 0 ? '#a7f3d0' : '#fecaca',
      icon: <Medication fontSize="small" />
    },
    {
      id: 4,
      name: 'Lab Reports',
      label: 'Diagnostic Investigations',
      count: labList.length,
      countLabel: `${labList.length} Test${labList.length !== 1 ? 's' : ''}`,
      isEmpty: labList.length === 0,
      color: labList.length > 0 ? '#047857' : '#dc2626',
      bgColor: labList.length > 0 ? '#ecfdf5' : '#fef2f2',
      borderColor: labList.length > 0 ? '#a7f3d0' : '#fecaca',
      icon: <Science fontSize="small" />
    },
    {
      id: 5,
      name: 'Allergies',
      label: 'Documented Drug & Food Allergies',
      count: allergiesList.length,
      countLabel: `${allergiesList.length} Alert${allergiesList.length !== 1 ? 's' : ''}`,
      isEmpty: allergiesList.length === 0,
      color: allergiesList.length > 0 ? '#047857' : '#64748b',
      bgColor: allergiesList.length > 0 ? '#ecfdf5' : '#f8fafc',
      borderColor: allergiesList.length > 0 ? '#a7f3d0' : '#e2e8f0',
      icon: <Warning fontSize="small" />
    }
  ];

  const totalFormsCount = formAuditList.length;
  const populatedFormsCount = formAuditList.filter(f => !f.isEmpty).length;
  const emptyFormsCount = formAuditList.filter(f => f.isEmpty).length;

  if (!isSuperAdmin) {
    return (
      <Box sx={{ p: { xs: 2, md: 6 }, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '75vh' }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            maxWidth: 550,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid #fed7aa',
            bgcolor: '#fffbeb',
            boxShadow: '0 8px 24px rgba(217, 119, 6, 0.1)'
          }}
        >
          <Avatar sx={{ bgcolor: '#fef3c7', color: '#d97706', width: 72, height: 72, mx: 'auto', mb: 2 }}>
            <Lock sx={{ fontSize: 38 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={900} color="#92400e" gutterBottom>
            Super Administrator Access Required
          </Typography>
          <Typography variant="body2" color="#78350f" sx={{ mb: 3, lineHeight: 1.6 }}>
            The <b>AI Hospital Paper Folder & Record Migration Station</b> is strictly restricted to <b>Super Administrators</b> only due to deep clinical database writes, patient chart merges, and historical audit compliance.
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.history.back()}
            sx={{
              bgcolor: '#d97706',
              color: '#ffffff',
              fontWeight: 800,
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: 2,
              '&:hover': { bgcolor: '#b45309' }
            }}
          >
            Return to Previous Page
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* ── Top Hero Header ────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.4)'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56, border: '2px solid rgba(255,255,255,0.3)' }}>
                <FolderSpecial sx={{ fontSize: 32, color: '#ffffff' }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>
                  📸 AI Hospital Paper Folder & Record Migration Station
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5, fontWeight: 500 }}>
                  Intelligent Multi-Page Ingestion · Time-Series Vitals Extraction · Doctor SOAP Continuation Sheets & Prescriptions
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => setHistoryOpen(true)}
              startIcon={<History />}
              sx={{
                color: '#ffffff',
                borderColor: 'rgba(255,255,255,0.4)',
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', borderColor: '#ffffff' }
              }}
            >
              Migration Logs ({stats.estimatedMigratedFolders})
            </Button>
            <Button
              variant="contained"
              onClick={handleResetForNextFolder}
              startIcon={<Add />}
              sx={{
                bgcolor: '#ffffff',
                color: '#065f46',
                fontWeight: 800,
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                '&:hover': { bgcolor: '#f0fdf4' }
              }}
            >
              New Folder Batch
            </Button>
          </Grid>
        </Grid>

        {/* Quick KPI stats strip */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.15)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>PAGES ARCHIVED</Typography>
              <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 900 }}>{stats.totalScannedPagesArchived} Pages</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.15)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>DIGITIZED FOLDERS</Typography>
              <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 900 }}>{stats.estimatedMigratedFolders} Folders</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.15)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>TOTAL PATIENTS</Typography>
              <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 900 }}>{stats.totalHospitalPatients}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.15)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>AI VISION ENGINE</Typography>
              <Typography variant="h6" sx={{ color: '#a7f3d0', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AutoAwesome sx={{ fontSize: 18 }} /> Multimodal Vision
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* ── MAIN WORKBENCH GRID ───────────────────────────────────────── */}
      <Grid container spacing={3}>
        {/* ── LEFT COLUMN: CAMERA / MULTI-PAGE SCANNER / IMAGE REEL ── */}
        <Grid item xs={12} lg={5}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: '#ffffff',
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhotoCamera sx={{ color: '#059669' }} />
                Folder Document Camera & Scanned Filmstrip
              </Typography>
              <Chip
                label={`${pages.length} Page${pages.length !== 1 ? 's' : ''} Ready`}
                size="small"
                sx={{ bgcolor: pages.length > 0 ? '#ecfdf5' : '#f1f5f9', color: pages.length > 0 ? '#047857' : '#64748b', fontWeight: 800 }}
              />
            </Stack>

            {/* Live Camera Viewfinder or Selected Page Preview */}
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: 320,
                bgcolor: '#0f172a',
                borderRadius: 2.5,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #cbd5e1'
              }}
            >
              {cameraActive ? (
                <>
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && stream && el.srcObject !== stream) {
                        el.srcObject = stream;
                        el.play().catch(e => console.warn('video play:', e));
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Scanner overlay reticle */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '8%',
                      left: '8%',
                      right: '8%',
                      bottom: '8%',
                      border: '2px dashed rgba(16, 185, 129, 0.85)',
                      borderRadius: 2,
                      boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#ffffff', bgcolor: 'rgba(0,0,0,0.6)', px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 700 }}>
                      Align Document Page Inside Box
                    </Typography>
                  </Box>
                </>
              ) : pages.length > 0 && pages[selectedPageIndex] ? (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    overflow: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#000000'
                  }}
                >
                  <Box
                    component="img"
                    src={pages[selectedPageIndex].dataUrl}
                    alt={pages[selectedPageIndex].label}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      transform: `rotate(${pages[selectedPageIndex].rotation}deg) scale(${zoomLevel})`,
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </Box>
              ) : (
                <Stack spacing={1.5} alignItems="center" sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.1)', width: 64, height: 64 }}>
                    <PhotoCamera sx={{ color: '#ffffff', fontSize: 32 }} />
                  </Avatar>
                  <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 800 }}>
                    Camera Ready on Tablet & Laptop
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', maxWidth: 280 }}>
                    Click &quot;Start Live Camera&quot; to scan live, or &quot;Direct Tablet Shutter&quot; to capture ultra-crisp photos.
                  </Typography>
                </Stack>
              )}

              {/* Extraction Progress Overlay */}
              {isExtracting && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(15, 23, 42, 0.88)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    zIndex: 10,
                    px: 3,
                    textAlign: 'center'
                  }}
                >
                  <CircularProgress size={48} sx={{ color: '#10b981' }} />
                  <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 800 }}>
                    {extractionStep || 'Multimodal AI Analyzing Case Notes & Vitals Charts...'}
                  </Typography>
                  <Chip label="Processing Multi-Page Clinical OCR" size="small" sx={{ bgcolor: '#059669', color: '#fff', fontWeight: 700 }} />
                </Box>
              )}
            </Box>

            {/* Camera Controls & Multi-Method Snapping */}
            <Grid container spacing={1.5}>
              {cameraActive ? (
                <>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<CameraAlt />}
                      onClick={handleCapturePhoto}
                      disabled={isExtracting}
                      sx={{
                        bgcolor: '#059669',
                        color: '#ffffff',
                        fontWeight: 800,
                        py: 1.2,
                        borderRadius: 2,
                        textTransform: 'none',
                        boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                        '&:hover': { bgcolor: '#047857' }
                      }}
                    >
                      📸 Snap Page ({pages.length + 1})
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<FlipCameraIos />}
                      onClick={() => {
                        const next = facingMode === 'environment' ? 'user' : 'environment';
                        setFacingMode(next);
                        startCamera(next);
                      }}
                      disabled={isExtracting}
                      sx={{ fontWeight: 700, textTransform: 'none', borderColor: '#cbd5e1', color: '#334155', py: 1.2, borderRadius: 2 }}
                    >
                      Switch Cam
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      color="error"
                      onClick={stopCamera}
                      disabled={isExtracting}
                      sx={{ fontWeight: 700, textTransform: 'none', py: 1.2, borderRadius: 2 }}
                    >
                      Stop Camera
                    </Button>
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12} sm={5}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<CameraAlt />}
                      onClick={() => startCamera()}
                      disabled={isExtracting}
                      sx={{
                        bgcolor: '#059669',
                        color: '#ffffff',
                        fontWeight: 800,
                        py: 1.2,
                        borderRadius: 2,
                        textTransform: 'none',
                        boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                        '&:hover': { bgcolor: '#047857' }
                      }}
                    >
                      Start Live Camera
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<PhotoCamera />}
                      onClick={() => nativeCameraInputRef.current?.click()}
                      disabled={isExtracting}
                      sx={{
                        fontWeight: 800,
                        textTransform: 'none',
                        borderColor: '#059669',
                        color: '#059669',
                        py: 1.2,
                        borderRadius: 2,
                        '&:hover': { bgcolor: '#ecfdf5', borderColor: '#047857' }
                      }}
                    >
                      Tablet Shutter
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<CloudUpload />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isExtracting}
                      sx={{ fontWeight: 700, textTransform: 'none', borderColor: '#cbd5e1', color: '#334155', py: 1.2, borderRadius: 2 }}
                    >
                      Upload Files
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>

            {/* Hidden Input for Standard File/PDF Upload */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            {/* Hidden Input for Direct Native Tablet/Mobile Camera Capture */}
            <input
              type="file"
              ref={nativeCameraInputRef}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            {/* Interactive Scanned Filmstrip */}
            {pages.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 1, display: 'block' }}>
                  📑 CAPTURED DOCUMENT PAGES ({pages.length}) — Click thumbnail to inspect:
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 1 }}>
                  {pages.map((p, idx) => (
                    <Card
                      key={p.id}
                      onClick={() => {
                        setSelectedPageIndex(idx);
                        stopCamera();
                      }}
                      sx={{
                        minWidth: 100,
                        maxWidth: 100,
                        cursor: 'pointer',
                        borderRadius: 2,
                        border: selectedPageIndex === idx && !cameraActive ? '2px solid #059669' : '1px solid #e2e8f0',
                        boxShadow: selectedPageIndex === idx && !cameraActive ? '0 0 0 2px rgba(5,150,105,0.2)' : 'none',
                        position: 'relative'
                      }}
                    >
                      <Box sx={{ height: 80, bgcolor: '#0f172a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={p.dataUrl}
                          alt={p.label}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: `rotate(${p.rotation}deg)`
                          }}
                        />
                      </Box>
                      <Box sx={{ p: 0.8, bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.65rem' }}>
                          P.{idx + 1}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRotatePage(idx);
                            }}
                            sx={{ p: 0.2 }}
                          >
                            <RotateRight sx={{ fontSize: 14 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePage(idx);
                            }}
                            sx={{ p: 0.2 }}
                          >
                            <Delete sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Stack>
                      </Box>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Primary Action Button: Run Multimodal AI */}
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={isExtracting ? <CircularProgress size={20} color="inherit" /> : <Bolt />}
              onClick={handleRunAiExtraction}
              disabled={isExtracting || pages.length === 0}
              sx={{
                bgcolor: '#047857',
                color: '#ffffff',
                fontWeight: 900,
                py: 1.5,
                borderRadius: 2.5,
                textTransform: 'none',
                fontSize: '1rem',
                boxShadow: '0 4px 15px rgba(4, 120, 87, 0.4)',
                '&:hover': { bgcolor: '#065f46' }
              }}
            >
              {isExtracting ? 'Multimodal AI Extracting Folder...' : `⚡ Extract Structured Records (${pages.length} Pages)`}
            </Button>
          </Paper>
        </Grid>

        {/* ── RIGHT COLUMN: STRUCTURED VERIFICATION & MULTI-TABLE EDITOR ── */}
        <Grid item xs={12} lg={7}>
          {patientData ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, md: 3 },
                bgcolor: '#ffffff',
                borderRadius: 3,
                border: '1px solid #10b981',
                boxShadow: '0 8px 30px rgba(16, 185, 129, 0.12)'
              }}
            >
              {/* Confidence & AI Summary Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  icon={<CheckCircle sx={{ color: '#047857 !important', fontSize: 18 }} />}
                  label={`AI Extracted & Parsed (${confidenceScore}% Confidence)`}
                  sx={{ bgcolor: '#ecfdf5', color: '#065f46', fontWeight: 800, border: '1px solid #a7f3d0' }}
                />
                <Chip
                  label="✨ Multimodal Gemini Clinical Vision"
                  size="small"
                  sx={{ bgcolor: '#eff6ff', color: '#1e40af', fontWeight: 700 }}
                />
              </Box>

              {/* ── FOLDER AUDIT & FORM COMPLETENESS MATRIX ────────────────── */}
              <Paper
                elevation={0}
                sx={{
                  p: 1.75,
                  mb: 2.5,
                  borderRadius: 2.5,
                  bgcolor: emptyFormsCount > 0 ? '#fffbeb' : '#f0fdf4',
                  border: `1px solid ${emptyFormsCount > 0 ? '#fed7aa' : '#bbf7d0'}`
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1.2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FactCheck sx={{ color: emptyFormsCount > 0 ? '#d97706' : '#059669', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Folder Content Audit: <b>{populatedFormsCount} of {totalFormsCount}</b> Forms Populated
                    </Typography>
                  </Stack>
                  <Chip
                    size="small"
                    label={emptyFormsCount === 0 ? '✓ All Forms Populated' : `⚠️ ${emptyFormsCount} Form${emptyFormsCount !== 1 ? 's' : ''} Empty (Not In Paper Scans)`}
                    sx={{
                      fontWeight: 800,
                      bgcolor: emptyFormsCount === 0 ? '#dcfce7' : '#fee2e2',
                      color: emptyFormsCount === 0 ? '#15803d' : '#b91c1c'
                    }}
                  />
                </Stack>

                <Grid container spacing={1}>
                  {formAuditList.map((form) => (
                    <Grid item xs={6} sm={4} key={form.id}>
                      <Box
                        onClick={() => setActiveTab(form.id)}
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor: '#ffffff',
                          border: `1.5px solid ${activeTab === form.id ? '#059669' : form.borderColor}`,
                          boxShadow: activeTab === form.id ? '0 0 0 2px rgba(5,150,105,0.2)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          '&:hover': { bgcolor: '#f8fafc', borderColor: '#059669' }
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                            <Box sx={{ color: form.color, display: 'flex' }}>{form.icon}</Box>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {form.name}
                            </Typography>
                          </Stack>
                          <Chip
                            size="small"
                            label={form.isEmpty ? 'EMPTY' : form.countLabel}
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              bgcolor: form.bgColor,
                              color: form.color,
                              border: `1px solid ${form.borderColor}`
                            }}
                          />
                        </Stack>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              {/* Duplicate / Existing Match Alert */}
              {existingMatch && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2.5, borderRadius: 2 }}
                  action={
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant={mergeOption === 'MERGE_APPEND' ? 'contained' : 'outlined'}
                        color="warning"
                        onClick={() => setMergeOption('MERGE_APPEND')}
                        sx={{ fontWeight: 800, textTransform: 'none' }}
                      >
                        Append to Existing
                      </Button>
                      <Button
                        size="small"
                        variant={mergeOption === 'CREATE_NEW' ? 'contained' : 'outlined'}
                        color="inherit"
                        onClick={() => setMergeOption('CREATE_NEW')}
                        sx={{ fontWeight: 700, textTransform: 'none' }}
                      >
                        Create New
                      </Button>
                    </Stack>
                  }
                >
                  <AlertTitle sx={{ fontWeight: 800 }}>Existing Hospital Profile Detected</AlertTitle>
                  Found record for <b>{existingMatch.fullName}</b> (Folder #{existingMatch.patientNumber}). Choose to append new historical encounters & vitals or create a separate folder.
                </Alert>
              )}

              {/* Navigation Tabs with Live Status Badges */}
              <Tabs
                value={activeTab}
                onChange={(_, val) => setActiveTab(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  borderBottom: '1px solid #e2e8f0',
                  mb: 2.5,
                  '& .MuiTab-root': { fontWeight: 800, textTransform: 'none', minHeight: 46 }
                }}
              >
                <Tab
                  icon={<Person fontSize="small" />}
                  iconPosition="start"
                  label={
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <span>👤 Bio-Data</span>
                      <Chip
                        size="small"
                        label={isBioDataComplete ? 'Complete' : 'Incomplete'}
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          bgcolor: isBioDataComplete ? '#ecfdf5' : '#fffbeb',
                          color: isBioDataComplete ? '#047857' : '#d97706'
                        }}
                      />
                    </Stack>
                  }
                />
                <Tab
                  icon={<Timeline fontSize="small" />}
                  iconPosition="start"
                  label={
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <span>📈 Vitals</span>
                      <Chip
                        size="small"
                        label={vitalsList.length > 0 ? `${vitalsList.length}` : 'EMPTY'}
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          bgcolor: vitalsList.length > 0 ? '#ecfdf5' : '#fef2f2',
                          color: vitalsList.length > 0 ? '#047857' : '#dc2626'
                        }}
                      />
                    </Stack>
                  }
                />
                <Tab
                  icon={<LocalHospital fontSize="small" />}
                  iconPosition="start"
                  label={
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <span>🩺 SOAP Notes</span>
                      <Chip
                        size="small"
                        label={encountersList.length > 0 ? `${encountersList.length}` : 'EMPTY'}
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          bgcolor: encountersList.length > 0 ? '#ecfdf5' : '#fef2f2',
                          color: encountersList.length > 0 ? '#047857' : '#dc2626'
                        }}
                      />
                    </Stack>
                  }
                />
                <Tab
                  icon={<Medication fontSize="small" />}
                  iconPosition="start"
                  label={
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <span>💊 Prescriptions</span>
                      <Chip
                        size="small"
                        label={prescriptionsList.length > 0 ? `${prescriptionsList.length}` : 'EMPTY'}
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          bgcolor: prescriptionsList.length > 0 ? '#ecfdf5' : '#fef2f2',
                          color: prescriptionsList.length > 0 ? '#047857' : '#dc2626'
                        }}
                      />
                    </Stack>
                  }
                />
                <Tab
                  icon={<Science fontSize="small" />}
                  iconPosition="start"
                  label={
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <span>🧪 Labs</span>
                      <Chip
                        size="small"
                        label={labList.length > 0 ? `${labList.length}` : 'EMPTY'}
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          bgcolor: labList.length > 0 ? '#ecfdf5' : '#fef2f2',
                          color: labList.length > 0 ? '#047857' : '#dc2626'
                        }}
                      />
                    </Stack>
                  }
                />
                <Tab
                  icon={<Warning fontSize="small" />}
                  iconPosition="start"
                  label={
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <span>⚠️ Allergies</span>
                      <Chip
                        size="small"
                        label={allergiesList.length > 0 ? `${allergiesList.length}` : 'EMPTY'}
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          bgcolor: allergiesList.length > 0 ? '#ecfdf5' : '#f8fafc',
                          color: allergiesList.length > 0 ? '#047857' : '#64748b'
                        }}
                      />
                    </Stack>
                  }
                />
              </Tabs>

              {/* ── TAB 0: PATIENT BIO-DATA ── */}
              {activeTab === 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
                    Patient Identity & Demographics (Target Table: `patients` & `users`)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Hospital Folder Number *"
                        value={patientData.folderNumber || ''}
                        onChange={e => setPatientData({ ...patientData, folderNumber: e.target.value })}
                        InputProps={{ sx: { fontWeight: 800, color: '#047857' } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Surname / Last Name *"
                        value={patientData.lastName || ''}
                        onChange={e => setPatientData({ ...patientData, lastName: e.target.value })}
                        InputProps={{ sx: { fontWeight: 800 } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="First Name *"
                        value={patientData.firstName || ''}
                        onChange={e => setPatientData({ ...patientData, firstName: e.target.value })}
                        InputProps={{ sx: { fontWeight: 800 } }}
                      />
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Date of Birth"
                        value={patientData.birthDate || ''}
                        onChange={e => setPatientData({ ...patientData, birthDate: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Age (Years)"
                        value={patientData.ageYears || ''}
                        onChange={e => setPatientData({ ...patientData, ageYears: Number(e.target.value) })}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Gender *"
                        value={patientData.gender || 'MALE'}
                        onChange={e => setPatientData({ ...patientData, gender: e.target.value as any })}
                      >
                        <MenuItem value="MALE">Male</MenuItem>
                        <MenuItem value="FEMALE">Female</MenuItem>
                        <MenuItem value="OTHER">Other</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Marital Status"
                        value={patientData.maritalStatus || 'MARRIED'}
                        onChange={e => setPatientData({ ...patientData, maritalStatus: e.target.value as any })}
                      >
                        <MenuItem value="SINGLE">Single</MenuItem>
                        <MenuItem value="MARRIED">Married</MenuItem>
                        <MenuItem value="DIVORCED">Divorced</MenuItem>
                        <MenuItem value="WIDOWED">Widowed</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Blood Group"
                        value={patientData.bloodGroup || 'O_POSITIVE'}
                        onChange={e => setPatientData({ ...patientData, bloodGroup: e.target.value })}
                      >
                        <MenuItem value="O_POSITIVE">O+</MenuItem>
                        <MenuItem value="A_POSITIVE">A+</MenuItem>
                        <MenuItem value="B_POSITIVE">B+</MenuItem>
                        <MenuItem value="AB_POSITIVE">AB+</MenuItem>
                        <MenuItem value="O_NEGATIVE">O-</MenuItem>
                        <MenuItem value="A_NEGATIVE">A-</MenuItem>
                        <MenuItem value="B_NEGATIVE">B-</MenuItem>
                        <MenuItem value="AB_NEGATIVE">AB-</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Genotype"
                        value={patientData.genotype || 'AA'}
                        onChange={e => setPatientData({ ...patientData, genotype: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Phone Number"
                        value={patientData.phone || ''}
                        onChange={e => setPatientData({ ...patientData, phone: e.target.value })}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Residential Address"
                        value={patientData.address || ''}
                        onChange={e => setPatientData({ ...patientData, address: e.target.value })}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Next of Kin Name & Relationship"
                        value={`${patientData.nokName || ''} (${patientData.nokRelationship || ''})`}
                        onChange={e => setPatientData({ ...patientData, nokName: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Next of Kin Phone"
                        value={patientData.nokPhone || ''}
                        onChange={e => setPatientData({ ...patientData, nokPhone: e.target.value })}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* ── TAB 1: VITALS HISTORY TIMELINE ── */}
              {activeTab === 1 && (
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Time-Series Vital Signs Chart (Target Table: `triage_records`)
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Add />}
                      onClick={() => setVitalsList(prev => [
                        ...prev,
                        {
                          id: `vit-new-${Date.now()}`,
                          recordedDate: new Date().toISOString().split('T')[0],
                          recordedTime: '09:00',
                          systolic: 120,
                          diastolic: 80,
                          heartRate: 75,
                          temperature: 36.8,
                          respiratoryRate: 18,
                          oxygenSaturation: 98,
                          weightKg: 70,
                          notes: 'Additional observation entry'
                        }
                      ])}
                      sx={{ fontWeight: 700, textTransform: 'none' }}
                    >
                      Add Vitals Entry
                    </Button>
                  </Stack>

                  {vitalsList.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        bgcolor: '#fef2f2',
                        border: '1.5px dashed #fecaca',
                        borderRadius: 3
                      }}
                    >
                      <Avatar sx={{ bgcolor: '#fee2e2', color: '#dc2626', width: 48, height: 48, mx: 'auto', mb: 1.5 }}>
                        <FindInPage sx={{ fontSize: 28 }} />
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#991b1b' }}>
                        ⚠️ Form Status: EMPTY (0 Vitals Chart Entries Found)
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#7f1d1d', maxWidth: 460, mx: 'auto', mt: 0.5, mb: 2, fontSize: '0.82rem' }}>
                        The Multimodal AI scanned all captured pages and did not locate a recorded vital signs chart in this paper folder. 0 triage records will be committed unless added manually.
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => setVitalsList(prev => [
                          ...prev,
                          {
                            id: `vit-new-${Date.now()}`,
                            recordedDate: new Date().toISOString().split('T')[0],
                            recordedTime: '09:00',
                            systolic: 120,
                            diastolic: 80,
                            heartRate: 75,
                            temperature: 36.8,
                            respiratoryRate: 18,
                            oxygenSaturation: 98,
                            weightKg: 70,
                            notes: 'Manual entry'
                          }
                        ])}
                        sx={{ bgcolor: '#dc2626', color: '#fff', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#b91c1c' } }}
                      >
                        + Add First Vitals Entry Manually
                      </Button>
                    </Paper>
                  ) : (
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Date & Time</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>BP (mmHg)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Pulse (bpm)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Temp (°C)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Resp / SpO2</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Weight / BMI</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {vitalsList.map((v, idx) => (
                            <TableRow key={v.id || idx}>
                              <TableCell>
                                <TextField
                                  type="date"
                                  size="small"
                                  value={v.recordedDate}
                                  onChange={e => {
                                    const updated = [...vitalsList];
                                    updated[idx].recordedDate = e.target.value;
                                    setVitalsList(updated);
                                  }}
                                  sx={{ width: 130, '& input': { fontSize: '0.8rem', py: 0.5 } }}
                                />
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={v.systolic}
                                    onChange={e => {
                                      const updated = [...vitalsList];
                                      updated[idx].systolic = Number(e.target.value);
                                      setVitalsList(updated);
                                    }}
                                    sx={{ width: 55, '& input': { fontSize: '0.8rem', py: 0.5, fontWeight: 700 } }}
                                  />
                                  <span>/</span>
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={v.diastolic}
                                    onChange={e => {
                                      const updated = [...vitalsList];
                                      updated[idx].diastolic = Number(e.target.value);
                                      setVitalsList(updated);
                                    }}
                                    sx={{ width: 55, '& input': { fontSize: '0.8rem', py: 0.5, fontWeight: 700 } }}
                                  />
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={v.heartRate}
                                  onChange={e => {
                                    const updated = [...vitalsList];
                                    updated[idx].heartRate = Number(e.target.value);
                                    setVitalsList(updated);
                                  }}
                                  sx={{ width: 60, '& input': { fontSize: '0.8rem', py: 0.5 } }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={v.temperature}
                                  onChange={e => {
                                    const updated = [...vitalsList];
                                    updated[idx].temperature = Number(e.target.value);
                                    setVitalsList(updated);
                                  }}
                                  sx={{ width: 65, '& input': { fontSize: '0.8rem', py: 0.5 } }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  {v.respiratoryRate} cpm · {v.oxygenSaturation}%
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  {v.weightKg || '--'} kg · BMI {v.bmi || '--'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setVitalsList(prev => prev.filter((_, i) => i !== idx))}
                                >
                                  <Delete sx={{ fontSize: 16 }} />
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

              {/* ── TAB 2: CLINICAL ENCOUNTERS & DOCTOR SOAP NOTES ── */}
              {activeTab === 2 && (
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Dated Clinical Consultations (Target Tables: `visits`, `encounters`, `consultation_notes`)
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Add />}
                      onClick={() => setEncountersList(prev => [
                        ...prev,
                        {
                          id: `enc-new-${Date.now()}`,
                          visitDate: new Date().toISOString().split('T')[0],
                          visitType: 'OUTPATIENT',
                          doctorName: 'Dr. Attending Clinician',
                          specialty: 'General Medicine',
                          chiefComplaint: '',
                          historyOfPresentIllness: '',
                          physicalExamination: '',
                          assessment: '',
                          plan: ''
                        }
                      ])}
                      sx={{ fontWeight: 700, textTransform: 'none' }}
                    >
                      Add Visit / Note
                    </Button>
                  </Stack>

                  {encountersList.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        bgcolor: '#fef2f2',
                        border: '1.5px dashed #fecaca',
                        borderRadius: 3
                      }}
                    >
                      <Avatar sx={{ bgcolor: '#fee2e2', color: '#dc2626', width: 48, height: 48, mx: 'auto', mb: 1.5 }}>
                        <FindInPage sx={{ fontSize: 28 }} />
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#991b1b' }}>
                        ⚠️ Form Status: EMPTY (0 Doctor Clinical Notes / Continuation Sheets)
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#7f1d1d', maxWidth: 460, mx: 'auto', mt: 0.5, mb: 2, fontSize: '0.82rem' }}>
                        No doctor SOAP consultation notes were found on the scanned papers. Click below to add a historical clinical encounter manually.
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => setEncountersList(prev => [
                          ...prev,
                          {
                            id: `enc-new-${Date.now()}`,
                            visitDate: new Date().toISOString().split('T')[0],
                            visitType: 'OUTPATIENT',
                            doctorName: 'Dr. Attending Clinician',
                            specialty: 'General Medicine',
                            chiefComplaint: '',
                            historyOfPresentIllness: '',
                            physicalExamination: '',
                            assessment: '',
                            plan: ''
                          }
                        ])}
                        sx={{ bgcolor: '#dc2626', color: '#fff', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#b91c1c' } }}
                      >
                        + Add First SOAP Visit / Note Manually
                      </Button>
                    </Paper>
                  ) : (
                    <Stack spacing={2.5}>
                      {encountersList.map((enc, idx) => (
                        <Card key={enc.id || idx} variant="outlined" sx={{ borderRadius: 2.5, p: 2 }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Chip label={`Visit #${idx + 1}`} size="small" sx={{ bgcolor: '#047857', color: '#fff', fontWeight: 800 }} />
                              <TextField
                                type="date"
                                size="small"
                                label="Consultation Date"
                                value={enc.visitDate}
                                onChange={e => {
                                  const updated = [...encountersList];
                                  updated[idx].visitDate = e.target.value;
                                  setEncountersList(updated);
                                }}
                                InputLabelProps={{ shrink: true }}
                                sx={{ width: 160 }}
                              />
                              <TextField
                                size="small"
                                label="Doctor / Signee"
                                value={enc.doctorName || ''}
                                onChange={e => {
                                  const updated = [...encountersList];
                                  updated[idx].doctorName = e.target.value;
                                  setEncountersList(updated);
                                }}
                                sx={{ width: 200 }}
                              />
                            </Stack>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setEncountersList(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Stack>

                          <Grid container spacing={1.5}>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Chief Complaint (c/o)"
                                value={enc.chiefComplaint}
                                onChange={e => {
                                  const updated = [...encountersList];
                                  updated[idx].chiefComplaint = e.target.value;
                                  setEncountersList(updated);
                                }}
                                InputProps={{ sx: { fontWeight: 700 } }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                multiline
                                rows={3}
                                size="small"
                                label="Subjective (History of Present Illness - HPI)"
                                value={enc.historyOfPresentIllness}
                                onChange={e => {
                                  const updated = [...encountersList];
                                  updated[idx].historyOfPresentIllness = e.target.value;
                                  setEncountersList(updated);
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                multiline
                                rows={3}
                                size="small"
                                label="Objective (Physical Examination - O/E)"
                                value={enc.physicalExamination}
                                onChange={e => {
                                  const updated = [...encountersList];
                                  updated[idx].physicalExamination = e.target.value;
                                  setEncountersList(updated);
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                size="small"
                                label="Assessment / Impression (Diagnoses)"
                                value={enc.assessment}
                                onChange={e => {
                                  const updated = [...encountersList];
                                  updated[idx].assessment = e.target.value;
                                  setEncountersList(updated);
                                }}
                                InputProps={{ sx: { fontWeight: 700, color: '#047857' } }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                size="small"
                                label="Plan / Treatment (Rx & Management)"
                                value={enc.plan}
                                onChange={e => {
                                  const updated = [...encountersList];
                                  updated[idx].plan = e.target.value;
                                  setEncountersList(updated);
                                }}
                              />
                            </Grid>
                          </Grid>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}

              {/* ── TAB 3: PRESCRIPTIONS & TREATMENTS ── */}
              {activeTab === 3 && (
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Historical Prescriptions & Medication Logs (Target Table: `pharmacy_prescriptions`)
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Add />}
                      onClick={() => setPrescriptionsList(prev => [
                        ...prev,
                        {
                          id: `rx-new-${Date.now()}`,
                          medicationName: '',
                          dosage: '500mg',
                          frequency: 'TDS (3x daily)',
                          route: 'Oral',
                          duration: '5 days',
                          instructions: 'Take after meals',
                          prescribedDate: new Date().toISOString().split('T')[0]
                        }
                      ])}
                      sx={{ fontWeight: 700, textTransform: 'none' }}
                    >
                      Add Prescription
                    </Button>
                  </Stack>

                  {prescriptionsList.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        bgcolor: '#fef2f2',
                        border: '1.5px dashed #fecaca',
                        borderRadius: 3
                      }}
                    >
                      <Avatar sx={{ bgcolor: '#fee2e2', color: '#dc2626', width: 48, height: 48, mx: 'auto', mb: 1.5 }}>
                        <FindInPage sx={{ fontSize: 28 }} />
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#991b1b' }}>
                        ⚠️ Form Status: EMPTY (0 Prescriptions Found)
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#7f1d1d', maxWidth: 460, mx: 'auto', mt: 0.5, mb: 2, fontSize: '0.82rem' }}>
                        No medication charts or prescription orders were detected in this folder. Click below to add a prescription manually.
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => setPrescriptionsList(prev => [
                          ...prev,
                          {
                            id: `rx-new-${Date.now()}`,
                            medicationName: '',
                            dosage: '500mg',
                            frequency: 'TDS (3x daily)',
                            route: 'Oral',
                            duration: '5 days',
                            instructions: 'Take after meals',
                            prescribedDate: new Date().toISOString().split('T')[0]
                          }
                        ])}
                        sx={{ bgcolor: '#dc2626', color: '#fff', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#b91c1c' } }}
                      >
                        + Add First Prescription Manually
                      </Button>
                    </Paper>
                  ) : (
                    <Stack spacing={1.5}>
                      {prescriptionsList.map((p, idx) => (
                        <Card key={p.id || idx} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                          <Grid container spacing={1.5} alignItems="center">
                            <Grid item xs={12} sm={4}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Drug Name *"
                                value={p.medicationName}
                                onChange={e => {
                                  const updated = [...prescriptionsList];
                                  updated[idx].medicationName = e.target.value;
                                  setPrescriptionsList(updated);
                                }}
                                InputProps={{ sx: { fontWeight: 800, color: '#047857' } }}
                              />
                            </Grid>
                            <Grid item xs={6} sm={2}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Dosage"
                                value={p.dosage}
                                onChange={e => {
                                  const updated = [...prescriptionsList];
                                  updated[idx].dosage = e.target.value;
                                  setPrescriptionsList(updated);
                                }}
                              />
                            </Grid>
                            <Grid item xs={6} sm={2}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Frequency"
                                value={p.frequency}
                                onChange={e => {
                                  const updated = [...prescriptionsList];
                                  updated[idx].frequency = e.target.value;
                                  setPrescriptionsList(updated);
                                }}
                              />
                            </Grid>
                            <Grid item xs={6} sm={2}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Duration"
                                value={p.duration}
                                onChange={e => {
                                  const updated = [...prescriptionsList];
                                  updated[idx].duration = e.target.value;
                                  setPrescriptionsList(updated);
                                }}
                              />
                            </Grid>
                            <Grid item xs={6} sm={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setPrescriptionsList(prev => prev.filter((_, i) => i !== idx))}
                              >
                                <Delete />
                              </IconButton>
                            </Grid>
                          </Grid>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}

              {/* ── TAB 4: LABS & DIAGNOSTICS ── */}
              {activeTab === 4 && (
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Diagnostic & Laboratory Investigations (Target Table: `observations`)
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Add />}
                      onClick={() => setLabList(prev => [
                        ...prev,
                        {
                          id: `lab-new-${Date.now()}`,
                          testName: 'Full Blood Count',
                          specimenType: 'Blood',
                          resultValue: '',
                          unit: '',
                          referenceRange: '',
                          orderedDate: new Date().toISOString().split('T')[0],
                          status: 'COMPLETED'
                        }
                      ])}
                      sx={{ fontWeight: 700, textTransform: 'none' }}
                    >
                      Add Lab Result
                    </Button>
                  </Stack>

                  {labList.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        bgcolor: '#fef2f2',
                        border: '1.5px dashed #fecaca',
                        borderRadius: 3
                      }}
                    >
                      <Avatar sx={{ bgcolor: '#fee2e2', color: '#dc2626', width: 48, height: 48, mx: 'auto', mb: 1.5 }}>
                        <FindInPage sx={{ fontSize: 28 }} />
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#991b1b' }}>
                        ⚠️ Form Status: EMPTY (0 Lab Investigation Slips)
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#7f1d1d', maxWidth: 460, mx: 'auto', mt: 0.5, mb: 2, fontSize: '0.82rem' }}>
                        No pathology, chemistry, or imaging test slips were detected on scanned pages. Click below to add a lab result manually.
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => setLabList(prev => [
                          ...prev,
                          {
                            id: `lab-new-${Date.now()}`,
                            testName: 'Full Blood Count',
                            specimenType: 'Blood',
                            resultValue: '',
                            unit: '',
                            referenceRange: '',
                            orderedDate: new Date().toISOString().split('T')[0],
                            status: 'COMPLETED'
                          }
                        ])}
                        sx={{ bgcolor: '#dc2626', color: '#fff', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#b91c1c' } }}
                      >
                        + Add First Lab Result Manually
                      </Button>
                    </Paper>
                  ) : (
                    <Stack spacing={1.5}>
                      {labList.map((l, idx) => (
                        <Card key={l.id || idx} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                          <Grid container spacing={1.5} alignItems="center">
                            <Grid item xs={12} sm={4}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Test / Investigation Name *"
                                value={l.testName}
                                onChange={e => {
                                  const updated = [...labList];
                                  updated[idx].testName = e.target.value;
                                  setLabList(updated);
                                }}
                                InputProps={{ sx: { fontWeight: 800 } }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={5}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Findings / Result Value"
                                value={l.resultValue || ''}
                                onChange={e => {
                                  const updated = [...labList];
                                  updated[idx].resultValue = e.target.value;
                                  setLabList(updated);
                                }}
                                InputProps={{ sx: { fontWeight: 700, color: '#1e40af' } }}
                              />
                            </Grid>
                            <Grid item xs={6} sm={2}>
                              <TextField
                                type="date"
                                fullWidth
                                size="small"
                                label="Date"
                                value={l.orderedDate}
                                onChange={e => {
                                  const updated = [...labList];
                                  updated[idx].orderedDate = e.target.value;
                                  setLabList(updated);
                                }}
                                InputLabelProps={{ shrink: true }}
                              />
                            </Grid>
                            <Grid item xs={6} sm={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setLabList(prev => prev.filter((_, i) => i !== idx))}
                              >
                                <Delete />
                              </IconButton>
                            </Grid>
                          </Grid>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}

              {/* ── TAB 5: ALLERGIES & ALERTS ── */}
              {activeTab === 5 && (
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Documented Allergies & Adverse Reactions (Target Table: `allergies`)
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Add />}
                      onClick={() => setAllergiesList(prev => [
                        ...prev,
                        {
                          id: `alg-new-${Date.now()}`,
                          allergen: '',
                          severity: 'MODERATE',
                          reaction: '',
                          category: 'Medication'
                        }
                      ])}
                      sx={{ fontWeight: 700, textTransform: 'none' }}
                    >
                      Add Allergy
                    </Button>
                  </Stack>

                  {allergiesList.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        bgcolor: '#f8fafc',
                        border: '1.5px dashed #cbd5e1',
                        borderRadius: 3
                      }}
                    >
                      <Avatar sx={{ bgcolor: '#f1f5f9', color: '#64748b', width: 48, height: 48, mx: 'auto', mb: 1.5 }}>
                        <FindInPage sx={{ fontSize: 28 }} />
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155' }}>
                        ℹ️ Form Status: EMPTY (No Allergies Noted)
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 460, mx: 'auto', mt: 0.5, mb: 2, fontSize: '0.82rem' }}>
                        No drug or food allergies documented on the scanned sheets. If the patient has NKDA (No Known Drug Allergies) or known reactions, you can add an entry below.
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => setAllergiesList(prev => [
                          ...prev,
                          {
                            id: `alg-new-${Date.now()}`,
                            allergen: '',
                            severity: 'MODERATE',
                            reaction: '',
                            category: 'Medication'
                          }
                        ])}
                        sx={{ borderColor: '#64748b', color: '#334155', fontWeight: 800, textTransform: 'none' }}
                      >
                        + Add Allergy Alert Manually
                      </Button>
                    </Paper>
                  ) : (
                    <Stack spacing={1.5}>
                      {allergiesList.map((a, idx) => (
                        <Card key={a.id || idx} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                          <Grid container spacing={1.5} alignItems="center">
                            <Grid item xs={12} sm={4}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Allergen *"
                                value={a.allergen}
                                onChange={e => {
                                  const updated = [...allergiesList];
                                  updated[idx].allergen = e.target.value;
                                  setAllergiesList(updated);
                                }}
                                InputProps={{ sx: { fontWeight: 800, color: '#dc2626' } }}
                              />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <TextField
                                select
                                fullWidth
                                size="small"
                                label="Severity"
                                value={a.severity || 'MODERATE'}
                                onChange={e => {
                                  const updated = [...allergiesList];
                                  updated[idx].severity = e.target.value as any;
                                  setAllergiesList(updated);
                                }}
                              >
                                <MenuItem value="MILD">Mild</MenuItem>
                                <MenuItem value="MODERATE">Moderate</MenuItem>
                                <MenuItem value="SEVERE">Severe</MenuItem>
                              </TextField>
                            </Grid>
                            <Grid item xs={6} sm={4}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Reaction (e.g. Rash, Anaphylaxis)"
                                value={a.reaction || ''}
                                onChange={e => {
                                  const updated = [...allergiesList];
                                  updated[idx].reaction = e.target.value;
                                  setAllergiesList(updated);
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setAllergiesList(prev => prev.filter((_, i) => i !== idx))}
                              >
                                <Delete />
                              </IconButton>
                            </Grid>
                          </Grid>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}

              {/* Bottom Atomic Commit Action Bar */}
              <Divider sx={{ my: 3 }} />
              <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" flexWrap="wrap">
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Target Transaction: <b>1 Patient Record + {encountersList.length} Visits + {vitalsList.length} Vitals + {prescriptionsList.length} Prescriptions + {pages.length} Scanned Proofs</b>
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    onClick={handleResetForNextFolder}
                    disabled={isCommitting}
                    sx={{ fontWeight: 700, textTransform: 'none', color: '#475569', borderColor: '#cbd5e1' }}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={isCommitting ? <CircularProgress size={20} color="inherit" /> : <AssignmentTurnedIn />}
                    onClick={handleCommitMigration}
                    disabled={isCommitting}
                    sx={{
                      bgcolor: '#059669',
                      color: '#ffffff',
                      fontWeight: 900,
                      px: 3,
                      py: 1.2,
                      borderRadius: 2,
                      textTransform: 'none',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)',
                      '&:hover': { bgcolor: '#047857' }
                    }}
                  >
                    {isCommitting ? 'Committing Atomic Migration...' : '💾 Ingest & Commit Patient Folder to Database'}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                bgcolor: '#ffffff',
                borderRadius: 3,
                border: '1.5px dashed #cbd5e1',
                height: '100%',
                minHeight: 480,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}
            >
              <Avatar sx={{ bgcolor: '#ecfdf5', width: 72, height: 72, mb: 2 }}>
                <FolderSpecial sx={{ color: '#059669', fontSize: 40 }} />
              </Avatar>

              <Chip
                label="📁 BATCH STATUS: EMPTY (AWAITING SCANS)"
                sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 900, fontSize: '0.75rem', mb: 1.5, border: '1px solid #fecaca' }}
              />

              <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a', mb: 1 }}>
                No Patient Folder Loaded Yet
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 460, lineHeight: 1.6, mb: 3 }}>
                Capture or upload physical paper pages (folder jacket, observation sheets, doctor notes, prescription slips). The AI Vision engine will automatically extract and indicate which forms are populated or empty.
              </Typography>

              {/* Form Completeness Diagnostic Grid */}
              <Box sx={{ width: '100%', maxWidth: 480, mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', display: 'block', mb: 1.5, textAlign: 'left' }}>
                  📋 CLINICAL SECTIONS TO BE INGESTED (All currently empty):
                </Typography>
                <Grid container spacing={1}>
                  {[
                    { name: 'Bio-Data', icon: <Person sx={{ fontSize: 16 }} /> },
                    { name: 'Vitals Chart', icon: <Timeline sx={{ fontSize: 16 }} /> },
                    { name: 'SOAP Notes', icon: <LocalHospital sx={{ fontSize: 16 }} /> },
                    { name: 'Prescriptions', icon: <Medication sx={{ fontSize: 16 }} /> },
                    { name: 'Lab Reports', icon: <Science sx={{ fontSize: 16 }} /> },
                    { name: 'Allergies', icon: <Warning sx={{ fontSize: 16 }} /> }
                  ].map((s, idx) => (
                    <Grid item xs={6} key={idx}>
                      <Box sx={{ p: 1, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Box sx={{ color: '#94a3b8', display: 'flex' }}>{s.icon}</Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>{s.name}</Typography>
                        </Stack>
                        <Chip label="EMPTY" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, bgcolor: '#f1f5f9', color: '#94a3b8' }} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="center">
                <Button
                  variant="contained"
                  startIcon={<CameraAlt />}
                  onClick={() => startCamera()}
                  sx={{
                    bgcolor: '#059669',
                    color: '#ffffff',
                    fontWeight: 800,
                    textTransform: 'none',
                    px: 2.5,
                    py: 1,
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                    '&:hover': { bgcolor: '#047857' }
                  }}
                >
                  Start Live Camera
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PhotoCamera />}
                  onClick={() => nativeCameraInputRef.current?.click()}
                  sx={{ fontWeight: 800, textTransform: 'none', color: '#059669', borderColor: '#059669', borderRadius: 2 }}
                >
                  Tablet Shutter
                </Button>
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* ── SUCCESS DIALOG ────────────────────────────────────────────── */}
      <Dialog
        open={migrationSuccessDialog}
        onClose={() => setMigrationSuccessDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
          <Avatar sx={{ bgcolor: '#ecfdf5', color: '#059669', width: 64, height: 64, mx: 'auto', mb: 1.5 }}>
            <CheckCircle sx={{ fontSize: 44 }} />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#064e3b' }}>
            🎉 Patient Folder Ingested!
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            All clinical records, chronological vitals, and doctor notes have been saved to the database.
          </Typography>
        </DialogTitle>
        <DialogContent>
          {migrationResultSummary && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', mt: 1 }}>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">PATIENT NAME</Typography>
                  <Typography variant="subtitle2" fontWeight={800}>
                    {migrationResultSummary.patient.firstName} {migrationResultSummary.patient.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">FOLDER NUMBER</Typography>
                  <Typography variant="subtitle2" fontWeight={800} color="#059669">
                    {migrationResultSummary.patient.patientNumber}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">ENCOUNTERS</Typography>
                  <Typography variant="body2" fontWeight={700}>{migrationResultSummary.encountersCreated} Visits</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">VITALS ROWS</Typography>
                  <Typography variant="body2" fontWeight={700}>{migrationResultSummary.vitalsCreated} Records</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">PAGES ARCHIVED</Typography>
                  <Typography variant="body2" fontWeight={700}>{migrationResultSummary.scannedPagesArchived} Scans</Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleResetForNextFolder}
            sx={{
              bgcolor: '#059669',
              color: '#ffffff',
              fontWeight: 800,
              py: 1.2,
              borderRadius: 2,
              textTransform: 'none',
              '&:hover': { bgcolor: '#047857' }
            }}
          >
            Snap Next Patient Folder ➔
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── MIGRATION HISTORY DIALOG ──────────────────────────────────── */}
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History sx={{ color: '#059669' }} />
            <Typography variant="h6" fontWeight={800}>Recent Folder Migration Batches</Typography>
          </Box>
          <IconButton onClick={() => setHistoryOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {recentMigrations.length === 0 ? (
            <Alert severity="info">No physical folder migration batches recorded yet.</Alert>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Patient Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Folder Number</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Document Label</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Migrated At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentMigrations.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {m.patient ? `${m.patient.firstName} ${m.patient.lastName}` : 'Migrated Patient'}
                      </TableCell>
                      <TableCell>
                        <Chip label={m.patient?.patientNumber || 'FFH-REC'} size="small" sx={{ fontWeight: 800, bgcolor: '#ecfdf5', color: '#047857' }} />
                      </TableCell>
                      <TableCell>{m.title || 'Case Folder Page'}</TableCell>
                      <TableCell>{new Date(m.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
