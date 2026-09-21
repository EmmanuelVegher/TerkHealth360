import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Button,
  Chip,
  Alert,
  Autocomplete,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  PregnantWoman,
  Timeline,
  Healing,
  CloudSync,
  Add,
  MedicalServices,
  Delete,
  LocalHospital,
  Receipt,
  LocalPharmacy,
  Warning,
  CheckCircle,
  AccountBox,
  Person,
  Mic,
  MicOff,
  AutoAwesome
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { OpenMedUnitCoPilot } from '../components/OpenMedUnitCoPilot';

const axios = {
  get: (url: string, config?: any) => api.get(url.startsWith('/api') ? url.substring(4) : url, config),
  post: (url: string, data?: any, config?: any) => api.post(url.startsWith('/api') ? url.substring(4) : url, data, config),
  put: (url: string, data?: any, config?: any) => api.put(url.startsWith('/api') ? url.substring(4) : url, data, config),
  delete: (url: string, config?: any) => api.delete(url.startsWith('/api') ? url.substring(4) : url, config),
};
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Color Palette
const PRIMARY = '#1976d2';
const SUCCESS = '#2e7d32';
const WARNING = '#ed6c02';
const DANGER = '#d32f2f';
const LIGHT_BG = '#f8f9fa';

export default function LabourWard() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State Variables
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientId, setPatientId] = useState<string>('');
  const [maternityProfile, setMaternityProfile] = useState<any>(null);
  const [activePregnancy, setActivePregnancy] = useState<any>(null);
  const [reportsData, setReportsData] = useState<any>({ ancQueue: [], pastQueue: [], activeAdmissions: [] });
  const [currentVisitId, setCurrentVisitId] = useState<string>('');
  const [currentVisitStatus, setCurrentVisitStatus] = useState<string>('');

  // Dialog States
  const [labourDialogOpen, setLabourDialogOpen] = useState(false);
  const [monitorDialogOpen, setMonitorDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeEmergency, setActiveEmergency] = useState<any>(null);
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [drugsAdministered, setDrugsAdministered] = useState('');

  // Delivery & Newborn Examination Notes State
  const [examNotes, setExamNotes] = useState('');
  const [isDictatingNotes, setIsDictatingNotes] = useState(false);
  const [isRewritingNotes, setIsRewritingNotes] = useState(false);
  const notesRecognitionRef = useRef<any>(null);

  const startNotesDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      enqueueSnackbar('Voice dictation is not supported in this browser. Please use Chrome or Edge.', { variant: 'warning' });
      return;
    }

    if (isDictatingNotes) {
      if (notesRecognitionRef.current) {
        try { notesRecognitionRef.current.stop(); } catch {}
      }
      setIsDictatingNotes(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      try { rec.lang = 'en-NG'; } catch { rec.lang = 'en-US'; }
      notesRecognitionRef.current = rec;
      setIsDictatingNotes(true);

      rec.onresult = (event: any) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        if (text) {
          setExamNotes((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${text.trim()}` : text.trim();
          });
        }
      };

      rec.onerror = (err: any) => {
        if (err?.error !== 'no-speech') {
          console.warn('Speech error:', err?.error);
          setIsDictatingNotes(false);
        }
      };

      rec.onend = () => {
        setIsDictatingNotes(false);
      };

      rec.start();
      enqueueSnackbar('🎙️ Voice dictation active. Speak clinical findings...', { variant: 'info' });
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsDictatingNotes(false);
    }
  };

  const handleRewriteNotes = async (textToRewrite?: string) => {
    const targetText = textToRewrite !== undefined ? textToRewrite : examNotes;
    if (!targetText.trim()) {
      enqueueSnackbar('Please type or dictate notes first before rewriting', { variant: 'warning' });
      return;
    }

    try {
      setIsRewritingNotes(true);
      const res = await axios.post('/api/maternity/rewrite-neonatal-notes', {
        text: targetText,
      });
      if (res.data?.rewritten) {
        setExamNotes(res.data.rewritten);
        enqueueSnackbar('✨ Notes rewritten into professional Newborn Examination Note', { variant: 'success' });
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to rewrite notes', { variant: 'error' });
    } finally {
      setIsRewritingNotes(false);
    }
  };

  const [labourBeds, setLabourBeds] = useState<any[]>([]);
  const [assignBedDialogOpen, setAssignBedDialogOpen] = useState(false);
  const [selectedBedId, setSelectedBedId] = useState('');
  const [recordsValidateDialogOpen, setRecordsValidateDialogOpen] = useState(false);
  const [hmoPreAuthCode, setHmoPreAuthCode] = useState('');

  // Unbooked emergency fast-track intake state
  const [unbookedDialogOpen, setUnbookedDialogOpen] = useState(false);
  const [unbookedData, setUnbookedData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    estimatedWeeks: 38,
    cervicalDilatation: 4,
    contractionsFrequency: 3,
    fetalHeartRate: 140,
    maternalBp: '120/80',
    maternalPulse: 80,
    membranesStatus: 'INTACT',
    bedId: '',
  });

  const handleFastTrackRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (unbookedData.phone && unbookedData.phone.length > 0 && unbookedData.phone.length !== 11) {
      enqueueSnackbar('Emergency phone number must be exactly 11 digits (e.g. 08031234567)', { variant: 'warning' });
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post('/api/maternity/labour/fast-track-register', unbookedData);
      enqueueSnackbar('⚡ Emergency Unbooked Labour Intake Complete! Digital Partograph Initialized.', { variant: 'success' });
      setUnbookedDialogOpen(false);
      await fetchReportsData();
      await fetchBeds();
      if (res.data?.patient) {
        handleSelectPatient(res.data.patient);
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed fast-track emergency intake', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const currentBedOfSelectedPatient = labourBeds.find(
    (b: any) =>
      selectedPatient &&
      (b.status === 'OCCUPIED' || b.isOccupied) &&
      b.patient &&
      ((b.patient.id && b.patient.id === selectedPatient.id) ||
       (b.patient.patientId && b.patient.patientId === selectedPatient.patientNumber) ||
       (b.patient.patientNumber && b.patient.patientNumber === selectedPatient.patientNumber))
  );

  const handleAssignBed = async () => {
    if (!selectedBedId) {
      enqueueSnackbar('Please select a stage spot or delivery suite', { variant: 'warning' });
      return;
    }
    if (!selectedPatient) {
      enqueueSnackbar('Please select an active labour patient first', { variant: 'warning' });
      return;
    }
    try {
      await api.post(`/ipd/beds/${selectedBedId}/assign`, {
        patientId: selectedPatient.id,
        clinicalCondition: 'ACTIVE_LABOUR',
        notes: `Stage spot assigned to ${selectedPatient.firstName} ${selectedPatient.lastName}`
      });
      enqueueSnackbar('Stage spot / Delivery Suite assigned and locked successfully!', { variant: 'success' });
      setAssignBedDialogOpen(false);
      await fetchBeds();
      await fetchPatients();
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Failed to assign bed spot', { variant: 'error' });
    }
  };

  const handleValidateRecords = async () => {
    if (!selectedPatient) {
      enqueueSnackbar('Please select an active labour patient first', { variant: 'warning' });
      return;
    }
    try {
      setLoading(true);
      await api.post('/maternity/labour/records-validate', {
        patientId: selectedPatient.id,
        hmoPreAuthCode,
      });
      enqueueSnackbar('📋 Labour Ward Administrative Check-in & Bio-Data validated by Records Desk!', { variant: 'success' });
      setRecordsValidateDialogOpen(false);
      await fetchPatients();
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Failed to validate administrative check-in', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTransferToOT = async () => {
    if (!selectedPatient) {
      enqueueSnackbar('Please select an active labour patient first', { variant: 'warning' });
      return;
    }
    try {
      // 1. Submit Complication Report
      await api.post('/maternity/complication', {
        maternityProfileId: maternityProfile?.id || selectedPatient.id,
        complicationType: 'CATEGORY_1_EMERGENCY_C_SECTION',
        severity: 'CRITICAL',
        managementNotes: `STAT Category 1 Emergency C-Section Transfer requested from Labour Ward for ${selectedPatient.firstName} ${selectedPatient.lastName}. Urgent Theatre & Anaesthesia prep!`,
      });

      // 2. Create Surgical Request in Theatre for Category 1 C-Section
      await axios.post('/api/theatre/requests', {
        patientId: selectedPatient.patientId || selectedPatient.id,
        diagnosis: 'Active Labour Complication - STAT Emergency C-Section Required',
        proposedProcedure: 'Category 1 Emergency Caesarean Section (C-Section)',
        urgency: 'EMERGENCY',
        estimatedDurationMin: 60,
        anaesthesiaReqs: 'Spinal / General Anaesthesia - STAT OB Prep',
        preferredDate: new Date().toISOString()
      });

      enqueueSnackbar(`🚨 STAT Category 1 Emergency C-Section alert sent! Patient transferred to Operating Theatre & Anaesthesia roster! Redirecting to Theatre...`, { variant: 'error' });
      
      // 3. Navigate to http://localhost:5173/theatre
      navigate('/theatre');
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Failed to trigger emergency OT transfer', { variant: 'error' });
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchReportsData();
    fetchBeds();
  }, []);

  const fetchBeds = async () => {
    try {
      const res = await axios.get('/api/ipd/beds');
      const bedsList = Array.isArray(res.data?.beds) ? res.data.beds : Array.isArray(res.data) ? res.data : [];
      const filtered = bedsList.filter((b: any) => {
        const wCat = (b.wardCategory || b.ward?.wardCategory || '').toUpperCase();
        const wName = (b.wardName || b.ward?.name || '').toUpperCase();
        const bType = (b.bedType || '').toUpperCase();
        const bNum = (b.number || b.bedNumber || '').toUpperCase();
        return (
          wCat === 'LABOUR' ||
          wCat === 'MATERNITY' ||
          wName.includes('LABOUR') ||
          wName.includes('DELIVERY') ||
          wName.includes('MATERNITY') ||
          bType === 'FIRST_STAGE_OBS' ||
          bType === 'DELIVERY_SUITE' ||
          bType === 'RECOVERY' ||
          bNum.startsWith('LBR-') ||
          bNum.startsWith('MAT-')
        );
      });
      setLabourBeds(filtered);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get('/api/patients/mpi?limit=1000&gender=FEMALE');
      const list = res.data?.data || res.data || [];
      setPatients(list.filter((p: any) => p.gender === 'FEMALE'));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReportsData = async () => {
    try {
      const res = await axios.get('/api/maternity/analytics/reports');
      setReportsData(res.data || { ancQueue: [], pastQueue: [], activeAdmissions: [] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectPatient = async (p: any) => {
    setSelectedPatient(p);
    setPatientId(p.id);
    fetchMaternityProfile(p.id);
    fetchActivePregnancy(p.id);

    // Fetch active visit
    try {
      const resVisits = await axios.get('/api/visits');
      const visitsArray = Array.isArray(resVisits.data) ? resVisits.data : (resVisits.data?.data || []);
      const activeVisit = visitsArray.find((v: any) => v.patient?.id === p.id && v.status !== 'CLOSED');
      if (activeVisit) {
        setCurrentVisitId(activeVisit.id);
        setCurrentVisitStatus(activeVisit.status);
      } else {
        setCurrentVisitId('');
        setCurrentVisitStatus('');
      }
    } catch (e) {
      console.error(e);
      setCurrentVisitId('');
      setCurrentVisitStatus('');
    }
  };

  const fetchMaternityProfile = async (pId: string) => {
    try {
      const res = await axios.get(`/api/maternity/profile/${pId}`);
      setMaternityProfile(res.data);
    } catch (e) {
      setMaternityProfile(null);
    }
  };

  const fetchActivePregnancy = async (pId: string) => {
    try {
      const res = await axios.get(`/api/maternity/patient/${pId}`);
      setActivePregnancy(res.data);
    } catch (e) {
      setActivePregnancy(null);
    }
  };

  // Admit patient in Labour
  const handleAdmitLabour = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activePregnancy) return;
    const data = new FormData(e.currentTarget);
    const body = {
      pregnancyId: activePregnancy.id,
      membranesStatus: data.get('membranesStatus'),
      cervicalDilatation: parseFloat(data.get('cervicalDilatation') as string) || 0,
      contractionsFrequency: parseInt(data.get('contractionsFrequency') as string) || 0,
      fetalHeartRate: parseFloat(data.get('fetalHeartRate') as string) || 140,
      maternalPulse: parseFloat(data.get('maternalPulse') as string) || 80,
      maternalBp: data.get('maternalBp') || '120/80',
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/labour/admit', body);
      enqueueSnackbar('Patient admitted to Labour ward', { variant: 'success' });
      setLabourDialogOpen(false);
      fetchActivePregnancy(patientId);
      fetchReportsData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to admit patient', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterEmergencyPregnancy = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const body = {
        patientId,
        gestationNumber: 1,
        lmpDate: new Date(Date.now() - 280 * 24 * 60 * 60 * 1000).toISOString(),
        isHighRisk: true,
        highRiskReason: 'Emergency Walk-in / Unbooked Delivery'
      };
      await axios.post('/api/maternity/register', body);
      enqueueSnackbar('Emergency Pregnancy Record Created', { variant: 'success' });
      await fetchActivePregnancy(patientId);
      fetchReportsData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to create emergency record', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Log Partograph Monitor Entry
  const handleLogMonitor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const activeLabour = activePregnancy?.labourRecords?.find((l: any) => l.status === 'ACTIVE');
    if (!activeLabour) return;

    const data = new FormData(e.currentTarget);
    const cervicalDilatation = parseFloat(data.get('cervicalDilatation') as string);
    const fetalHeartRate = parseFloat(data.get('fetalHeartRate') as string);
    const maternalPulse = parseFloat(data.get('maternalPulse') as string);
    const maternalBp = (data.get('maternalBp') as string) || '';
    const maternalTemp = parseFloat(data.get('maternalTemp') as string);

    // Validations
    const errors: Record<string, string> = {};
    if (isNaN(cervicalDilatation) || cervicalDilatation < 0 || cervicalDilatation > 10) {
      errors.cervicalDilatation = 'Cervical dilatation must be between 0 and 10 cm';
    }
    if (isNaN(fetalHeartRate) || fetalHeartRate < 50 || fetalHeartRate > 220) {
      errors.fetalHeartRate = 'FHR must be between 50 and 220 bpm';
    }
    if (isNaN(maternalPulse) || maternalPulse < 40 || maternalPulse > 200) {
      errors.maternalPulse = 'Pulse must be between 40 and 200 bpm';
    }
    if (!/^\d{2,3}\/\d{2,3}$/.test(maternalBp)) {
      errors.maternalBp = 'Blood Pressure must be in systolic/diastolic format (e.g. 120/80)';
    }
    if (isNaN(maternalTemp) || maternalTemp < 34.0 || maternalTemp > 43.0) {
      errors.maternalTemp = 'Temperature must be between 34°C and 43°C';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      enqueueSnackbar('Please correct the validation errors in the form', { variant: 'error' });
      return;
    }

    const body = {
      labourRecordId: activeLabour.id,
      cervicalDilatation,
      fetalStationLevel: data.get('fetalStationLevel'),
      fetalPresentation: data.get('fetalPresentation'),
      fetalHeartRate,
      uterineContractions: parseInt(data.get('uterineContractions') as string) || 0,
      contractionStrength: data.get('contractionStrength'),
      membranesStatus: data.get('membranesStatus'),
      liquidourColour: data.get('liquidourColour'),
      maternalPulse,
      maternalBp,
      maternalTemp,
      notes: data.get('notes'),
      enteredBy: user?.username || 'Midwife'
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/labour/monitor', body);
      enqueueSnackbar('Partograph data entry registered', { variant: 'success' });
      setMonitorDialogOpen(false);
      setValidationErrors({});
      fetchActivePregnancy(patientId);
      fetchReportsData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to log partograph data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Complete Delivery Documentation
  const handleCompleteDelivery = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activePregnancy) return;
    const data = new FormData(e.currentTarget);
    
    const bloodLossMl = parseFloat(data.get('bloodLossMl') as string);
    const birthWeight = parseFloat(data.get('birthWeight') as string);
    const birthLength = data.get('birthLength') ? parseFloat(data.get('birthLength') as string) : null;
    const headCircumference = data.get('headCircumference') ? parseFloat(data.get('headCircumference') as string) : null;
    const apgar1Min = parseInt(data.get('apgar1Min') as string);
    const apgar5Min = parseInt(data.get('apgar5Min') as string);

    // Validations
    const errors: Record<string, string> = {};
    if (isNaN(bloodLossMl) || bloodLossMl < 0) {
      errors.bloodLossMl = 'Blood loss must be a positive number';
    }
    if (isNaN(birthWeight) || birthWeight < 0.1 || birthWeight > 10.0) {
      errors.birthWeight = 'Birth weight must be between 0.1 and 10.0 kg';
    }
    if (birthLength !== null && (isNaN(birthLength) || birthLength < 10 || birthLength > 100)) {
      errors.birthLength = 'Birth length must be between 10 and 100 cm';
    }
    if (headCircumference !== null && (isNaN(headCircumference) || headCircumference < 10 || headCircumference > 60)) {
      errors.headCircumference = 'Head circumference must be between 10 and 60 cm';
    }
    if (isNaN(apgar1Min) || apgar1Min < 0 || apgar1Min > 10) {
      errors.apgar1Min = 'APGAR (1 min) must be between 0 and 10';
    }
    if (isNaN(apgar5Min) || apgar5Min < 0 || apgar5Min > 10) {
      errors.apgar5Min = 'APGAR (5 min) must be between 0 and 10';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      enqueueSnackbar('Please correct the validation errors in the form', { variant: 'error' });
      return;
    }

    const body = {
      pregnancyId: activePregnancy.id,
      deliveryType: data.get('deliveryType'),
      bloodLossMl,
      complications: data.get('complications'),
      placentaCondition: data.get('placentaCondition'),
      birthAttendantId: user?.staffId || '',
      babyName: data.get('babyName'),
      birthWeight,
      birthLength,
      headCircumference,
      sex: data.get('sex'),
      apgar1Min,
      apgar5Min,
      examinationNotes: examNotes || data.get('examinationNotes'),
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/delivery', body);
      enqueueSnackbar('Delivery and Neonatal records documented successfully', { variant: 'success' });
      setDeliveryDialogOpen(false);
      fetchActivePregnancy(patientId);
      fetchReportsData();

      // Advancing the visit to closed when delivery is completed
      if (currentVisitId) {
        await axios.post(`/api/workflow/visits/${currentVisitId}/advance`);
        enqueueSnackbar('Labour visit advanced and closed', { variant: 'info' });
        setSelectedPatient(null);
        navigate('/maternity', { state: { patientId: selectedPatient.id } });
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to document delivery', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const triggerObstetricEmergencyAlert = (type: string) => {
    const protocols: Record<string, any> = {
      'Postpartum Haemorrhage (PPH)': {
        type: 'Postpartum Haemorrhage (PPH)',
        severity: 'SEVERE',
        checklist: [
          'Call for help (Obstetric, Anesthetic, and Nursing team)',
          'Perform external bimanual uterine massage',
          'Administer Oxytocin 10 IU IM or 20 IU in 1L saline IV',
          'Insert two large-bore IV lines (14G/16G) and run crystalloids',
          'Group, match, and cross-match 2-4 units of blood',
          'Insert Foley catheter to monitor hourly urine output'
        ]
      },
      'Severe Pre-Eclampsia / Eclampsia': {
        type: 'Severe Pre-Eclampsia / Eclampsia',
        severity: 'LIFE_THREATENING',
        checklist: [
          'Secure airway, place mother in left lateral position, administer oxygen',
          'Administer Magnesium Sulfate (MgSO4) loading dose (4g IV + 10g IM)',
          'Monitor respiration (>16/min), patellar reflexes, and urine output',
          'Administer Hydralazine 5mg IV or Labetalol 20mg IV if BP >160/110 mmHg',
          'Monitor fetal heart rate and prepare for delivery within 24h'
        ]
      },
      'Sepsis / Chorioamnionitis': {
        type: 'Sepsis / Chorioamnionitis',
        severity: 'SEVERE',
        checklist: [
          'Check vitals (temperature >38°C or <36°C, pulse >90 bpm)',
          'Collect blood cultures, urine culture, and vaginal swab',
          'Administer broad-spectrum IV antibiotics immediately',
          'Provide aggressive IV fluid resuscitation for hypotension',
          'Plan for prompt delivery of the fetus'
        ]
      },
      'Umbilical Cord Prolapse': {
        type: 'Umbilical Cord Prolapse',
        severity: 'LIFE_THREATENING',
        checklist: [
          'Call for emergency Caesarean Section immediately',
          'Manually elevate presenting part off the prolapsed cord',
          'Place mother in knee-chest or steep Trendelenburg position',
          'Cover prolapsed cord with warm, saline-soaked gauze',
          'Prepare for rapid transfer to the Operating Theatre'
        ]
      }
    };

    const protocol = protocols[type];
    if (protocol) {
      setActiveEmergency(protocol);
      setEmergencyNotes('');
      setDrugsAdministered('');
      enqueueSnackbar(`[CRITICAL EMERGENCY]: ${type} Protocol Activated! Resuscitation teams notified.`, { variant: 'error' });
    }
  };

  const handleLogComplication = async () => {
    if (!maternityProfile) {
      enqueueSnackbar('No maternity profile loaded for this patient', { variant: 'error' });
      return;
    }
    try {
      setLoading(true);
      const body = {
        maternityProfileId: maternityProfile.id,
        pregnancyId: activePregnancy?.id || null,
        complicationType: activeEmergency.type,
        severity: activeEmergency.severity,
        managementNotes: emergencyNotes,
        drugsAdministered: drugsAdministered,
        outcome: 'MANAGED_ACTIVE',
        recordedBy: user?.username || 'Midwife'
      };
      await axios.post('/api/maternity/complication', body);
      
      await axios.post('/api/notifications', {
        title: `CRITICAL OBSTETRIC ALERT`,
        content: `${activeEmergency.type} active for ${selectedPatient.firstName} ${selectedPatient.lastName}. Urgent assistance required in Labour Ward!`,
        type: 'CRITICAL',
        userId: user?.id
      }).catch(() => {});

      enqueueSnackbar('Emergency complication logged and recorded successfully', { variant: 'success' });
      setActiveEmergency(null);
      fetchMaternityProfile(patientId);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to record emergency complication', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const activeLabourRecord = activePregnancy?.labourRecords?.find((l: any) => l.status === 'ACTIVE');
  
  const partographChartData = (() => {
    if (!activeLabourRecord) return [];
    const entries = activeLabourRecord.monitoringEntries || [];
    if (entries.length === 0 && activeLabourRecord.cervicalDilatation !== undefined) {
      return [
        {
          hour: 0,
          cervicalDilatation: activeLabourRecord.cervicalDilatation,
          fetalStationLevel: 0,
          alertLine: 4,
          actionLine: 8,
        }
      ];
    }
    return entries.map((entry: any, index: number) => ({
      hour: index * 2,
      cervicalDilatation: entry.cervicalDilatation,
      fetalStationLevel: entry.fetalStationLevel ? parseInt(entry.fetalStationLevel) || 0 : null,
      alertLine: index * 2 + 4,
      actionLine: index * 2 + 8,
    }));
  })();

  const livePartographNodes = (() => {
    if (!activeLabourRecord) return [];
    const entries = activeLabourRecord.monitoringEntries || [];
    if (entries.length === 0) {
      const d = activeLabourRecord.cervicalDilatation ?? 4;
      return [
        {
          dilatation: d,
          fhr: activeLabourRecord.fetalHeartRate || 140,
          contractions: activeLabourRecord.contractionsFrequency || 0,
          label: `${d} cm (Admission Baseline)`,
          time: activeLabourRecord.admittedAt ? new Date(activeLabourRecord.admittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Admission',
          isAlert: d >= 8,
          isDelivery: d >= 10,
        }
      ];
    }

    return entries.map((entry: any, idx: number) => {
      const dilatation = entry.cervicalDilatation;
      const isDelivery = dilatation >= 10;
      const isAlert = entry.alertLine || dilatation >= 8;
      const timeStr = entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `Log ${idx + 1}`;
      
      let tag = `${dilatation} cm`;
      if (idx === 0) tag += ' (Admission Baseline)';
      else if (isDelivery) tag += ' (Full Delivery)';
      else if (isAlert) tag += ' (Alert Line)';
      else tag += ` (Entry ${idx + 1})`;

      return {
        dilatation,
        fhr: entry.fetalHeartRate || 140,
        contractions: entry.uterineContractions || 0,
        label: tag,
        time: timeStr,
        isAlert,
        isDelivery,
        notes: entry.notes
      };
    });
  })();

  // Filter queue reports for active Labour Ward admissions
  const activeMaternityQueue = reportsData.labourQueue || reportsData.ancQueue?.filter((q: any) => q.status === 'IN_LABOUR' || q.status === 'ADMITTED') || [];
  const pastMaternityQueue: any[] = [];
  const isUnbooked = activePregnancy?.highRiskReason?.includes('Unbooked') || false;

  // 3-Stage Labour Ward Bed Calculations
  const firstStageBeds = labourBeds.filter(b => b.bedType === 'FIRST_STAGE_OBS' || b.number.includes('OBS'));
  const deliverySuites = labourBeds.filter(b => b.bedType === 'DELIVERY_SUITE' || b.number.includes('SUITE'));
  const recoveryBeds = labourBeds.filter(b => b.bedType === 'RECOVERY' || b.number.includes('REC'));

  const firstStageOccupied = firstStageBeds.filter(b => b.status === 'OCCUPIED').length;
  const deliverySuitesOccupied = deliverySuites.filter(b => b.status === 'OCCUPIED').length;
  const recoveryOccupied = recoveryBeds.filter(b => b.status === 'OCCUPIED').length;

  const firstStageTotal = firstStageBeds.length;
  const deliverySuitesTotal = deliverySuites.length;
  const recoveryTotal = recoveryBeds.length;

  const firstStageAvail = Math.max(0, firstStageTotal - firstStageOccupied);
  const deliverySuitesAvail = Math.max(0, deliverySuitesTotal - deliverySuitesOccupied);
  const recoveryAvail = Math.max(0, recoveryTotal - recoveryOccupied);

  const totalCapacity = labourBeds.length;
  const totalOccupied = labourBeds.filter(b => b.status === 'OCCUPIED').length;
  const totalAvail = Math.max(0, totalCapacity - totalOccupied);

  const isDeliverySuitesFull = deliverySuitesTotal > 0 && deliverySuitesAvail === 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Title Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: PRIMARY, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Labour & Delivery Ward
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Active Labour Surveillance Room, Partograph Dilatation Trends & Newborn Registry
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip
            icon={<LocalHospital sx={{ color: '#fff !important' }} />}
            label="System Online - Critical Care Monitoring"
            sx={{ bgcolor: SUCCESS, color: '#fff', fontWeight: 'bold' }}
          />
        </Box>
      </Box>

      {/* 🚨 Red Warning / Diversion Alert Banner when Delivery Suites are 100% Full */}
      {isDeliverySuitesFull && (
        <Alert
          severity="error"
          variant="filled"
          icon={<Warning sx={{ fontSize: 28 }} />}
          sx={{ mb: 3, borderRadius: 3, fontWeight: 800, fontSize: '0.95rem', boxShadow: '0 4px 20px rgba(211, 47, 47, 0.4)' }}
        >
          🚨 CRITICAL DIVERSION ALERT: ALL DELIVERY SUITES ARE 100% OCCUPIED (0 AVAILABLE TABLES)!
          <Typography variant="body2" sx={{ opacity: 0.95, mt: 0.5, fontWeight: 600 }}>
            Triage & Emergency Intake desks are notified to divert incoming active labour cases to designated referral facilities unless an emergency C-section or recovery transfer is completed immediately.
          </Typography>
        </Alert>
      )}

      {/* 📊 LABOUR WARD REAL-TIME CAPACITY STATUS COUNTER BANNER */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 4, borderRadius: 3, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1, letterSpacing: 0.5, color: '#38bdf8' }}>
            🏥 LABOUR WARD STATUS:
          </Typography>
          <Chip
            label={isDeliverySuitesFull ? '🔴 DELIVERY SUITES FULL — DIVERSION ALERT' : '🟢 DELIVERY SUITES AVAILABLE'}
            color={isDeliverySuitesFull ? 'error' : 'success'}
            sx={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.7rem' }}
          />
        </Box>
        <Grid container spacing={2}>
          {/* First Stage Counter */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                🛋️ First Stage Room
              </Typography>
              <Typography variant="h6" fontWeight={900} sx={{ color: '#60a5fa', my: 0.5 }}>
                {firstStageOccupied}/{firstStageTotal} Beds Full
              </Typography>
              <Typography variant="caption" sx={{ color: firstStageAvail > 0 ? '#4ade80' : '#f87171', fontWeight: 800 }}>
                ({firstStageAvail} Available)
              </Typography>
            </Paper>
          </Grid>

          {/* Delivery Suites Counter */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: isDeliverySuitesFull ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', borderColor: isDeliverySuitesFull ? '#ef4444' : 'rgba(255,255,255,0.15)' }}>
              <Typography variant="caption" sx={{ color: isDeliverySuitesFull ? '#fca5a5' : '#94a3b8', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                👶 Delivery Suites / Tables
              </Typography>
              <Typography variant="h6" fontWeight={900} sx={{ color: isDeliverySuitesFull ? '#f87171' : '#4ade80', my: 0.5 }}>
                {deliverySuitesOccupied}/{deliverySuitesTotal} Tables Full
              </Typography>
              <Typography variant="caption" sx={{ color: deliverySuitesAvail > 0 ? '#4ade80' : '#f87171', fontWeight: 800 }}>
                ({deliverySuitesAvail} Available)
              </Typography>
            </Paper>
          </Grid>

          {/* Recovery Area Counter */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                🛌 Recovery Area
              </Typography>
              <Typography variant="h6" fontWeight={900} sx={{ color: '#c084fc', my: 0.5 }}>
                {recoveryOccupied}/{recoveryTotal} Beds Full
              </Typography>
              <Typography variant="caption" sx={{ color: recoveryAvail > 0 ? '#4ade80' : '#f87171', fontWeight: 800 }}>
                ({recoveryAvail} Available)
              </Typography>
            </Paper>
          </Grid>

          {/* Total Capacity Counter */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}>
              <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                📊 Total Capacity
              </Typography>
              <Typography variant="h6" fontWeight={900} sx={{ color: '#f59e0b', my: 0.5 }}>
                {totalOccupied}/{totalCapacity} Beds Full
              </Typography>
              <Typography variant="caption" sx={{ color: totalAvail > 0 ? '#4ade80' : '#f87171', fontWeight: 800 }}>
                ({totalAvail} Available)
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Patient Selector Bar */}
      <Card sx={{ mb: 3, borderRadius: '12px' }}>
        <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Select Labour Ward Patient:</Typography>
          <Autocomplete
            options={patients}
            getOptionLabel={(p: any) => `${p.firstName} ${p.lastName} (${p.mrn || p.patientNumber})`}
            value={selectedPatient || null}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_, newValue) => {
              if (newValue) {
                handleSelectPatient(newValue);
              } else {
                setSelectedPatient(null);
                setPatientId('');
                setMaternityProfile(null);
                setActivePregnancy(null);
              }
            }}
            renderInput={(params) => (
              <TextField {...params} label="Search Patient Name or MRN" size="small" />
            )}
            sx={{ minWidth: 300 }}
          />

          {selectedPatient && (
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Chip label={`Blood: ${maternityProfile?.bloodGroup || 'Not set'}`} color="secondary" />
              <Chip
                label={activePregnancy ? `Gestational Age: ${activePregnancy.gestationNumber} Pregnancy` : 'No Active Pregnancy'}
                color={activePregnancy ? 'success' : 'default'}
              />
              {activePregnancy?.isHighRisk && <Chip label="HIGH RISK" color="error" />}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 🛠️ Clinical Role-Based Action Toolbar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 3, bgcolor: '#f8fafc', borderColor: '#cbd5e1' }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ alignItems: 'center' }}>
          <Typography variant="subtitle2" fontWeight={800} color={PRIMARY} sx={{ mr: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <MedicalServices sx={{ fontSize: 18 }} /> Role Actions:
          </Typography>

          {/* 0. Fast-Track Unbooked Labour Emergency Intake */}
          <Button
            variant="contained"
            color="warning"
            startIcon={<Add />}
            onClick={() => setUnbookedDialogOpen(true)}
            sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none', background: 'linear-gradient(135deg, #ed6c02 0%, #e65100 100%)' }}
          >
            ⚡ Quick Unbooked Intake (Emergency)
          </Button>

          {/* 1. Midwife Clinical Intake & Partograph */}
          {(() => {
            const hasActiveLabour = activePregnancy?.labourRecords?.some((lr: any) => lr.status === 'ACTIVE');
            return (
              <Button
                variant="contained"
                color={hasActiveLabour ? "info" : "primary"}
                startIcon={<PregnantWoman />}
                disabled={!selectedPatient}
                onClick={() => {
                  if (!selectedPatient) {
                    enqueueSnackbar('Please select a Labour Ward patient first', { variant: 'warning' });
                    return;
                  }
                  if (hasActiveLabour) {
                    setMonitorDialogOpen(true);
                  } else {
                    setLabourDialogOpen(true);
                  }
                }}
                sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
              >
                {hasActiveLabour
                  ? "📈 Log Partograph VE & Progress Check"
                  : "🩺 Midwife Intake (Booked ANC Admission)"}
              </Button>
            );
          })()}

          {/* 2. Matron Bed / Suite Allocation */}
          <Button
            variant="contained"
            color={currentBedOfSelectedPatient ? "success" : "secondary"}
            startIcon={<LocalHospital />}
            disabled={!selectedPatient}
            onClick={() => {
              if (!selectedPatient) {
                enqueueSnackbar('Please select a Labour Ward patient first', { variant: 'warning' });
                return;
              }
              if (currentBedOfSelectedPatient) {
                setSelectedBedId('');
              }
              setAssignBedDialogOpen(true);
            }}
            sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
          >
            {currentBedOfSelectedPatient
              ? `👩‍⚕️ ${currentBedOfSelectedPatient.number} Assigned (Transfer Stage)`
              : '👩‍⚕️ Matron Bed / Suite Allocation'}
          </Button>

          {/* 3. Records Unit Validation - Retrospective bio-data check-in moved to Registration / MPI desk */}
          {/* 
          {(() => {
            const isPendingBioData = selectedPatient?.identification === 'UNBOOKED_EMERGENCY_LABOUR';
            return (
              <Button
                variant={isPendingBioData ? "contained" : "outlined"}
                color={isPendingBioData ? "warning" : "info"}
                startIcon={<Receipt />}
                onClick={() => setRecordsValidateDialogOpen(true)}
                sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
              >
                {isPendingBioData
                  ? '📋 Bio-Data Pending (Records Check-In)'
                  : '📋 Records Admin Validation'}
              </Button>
            );
          })()}
          */}

          {/* 4. One-Click STAT C-Section Transfer */}
          <Button
            variant="contained"
            color="error"
            startIcon={<Warning />}
            onClick={handleTransferToOT}
            disabled={!selectedPatient}
            sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
          >
            ⚡ STAT Transfer to OT (Category 1 C-Section)
          </Button>

          {/* 5. Record Delivery & Newborn Registration */}
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            onClick={() => setDeliveryDialogOpen(true)}
            disabled={!selectedPatient}
            sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
          >
            👶 Record Delivery & New Baby
          </Button>
        </Stack>
      </Paper>

      {/* Live Configured Beds Grid */}
      <Card sx={{ mb: 4, borderRadius: 3, borderLeft: `6px solid ${PRIMARY}` }}>
        <CardHeader
          title="👶 Configured Labour & Delivery Ward Beds (Live Census)"
          subheader={`Synchronized from Bed Allocation Settings (${labourBeds.filter(b => b.status === 'OCCUPIED').length} Occupied / ${labourBeds.length} Configured Beds)`}
        />
        <Divider />
        <CardContent>
          {labourBeds.length === 0 ? (
            <Alert severity="info">
              No beds configured yet for Labour & Delivery Ward. Configure beds under Nursing &gt; Bed Management (http://localhost:5173/nursing/beds).
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {labourBeds.map((bed: any) => (
                <Grid item xs={12} sm={6} md={3} key={bed.id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      borderColor: bed.status === 'OCCUPIED' ? DANGER : SUCCESS,
                      bgcolor: bed.status === 'OCCUPIED' ? '#fff5f5' : '#f6fbf7'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={800} color={PRIMARY}>
                        {bed.number}
                      </Typography>
                      <Chip
                        label={bed.status}
                        size="small"
                        color={bed.status === 'OCCUPIED' ? 'error' : 'success'}
                        sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      Ward: {bed.wardName}
                    </Typography>
                    {bed.patient ? (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" fontWeight={800} color="text.primary" noWrap>
                          {bed.patient.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          MRN: {bed.patient.patientId} · {bed.patient.gender} ({bed.patient.age || 'N/A'}y)
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Bed Available for Delivery Admission
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Main Workspace */}
      {!selectedPatient ? (
        <Stack spacing={3}>
          {/* Active surveillance Queue */}
          <Card>
            <CardHeader title="Labour Ward Admissions & Queue" subheader="Active deliveries and labor tracking surveillance" />
            <Divider />
            <CardContent>
              {activeMaternityQueue.length === 0 && pastMaternityQueue.length === 0 ? (
                <Alert severity="info">No active patients currently logged in the Labour Ward queue.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: LIGHT_BG }}>
                      <TableRow>
                        <TableCell>Patient Name</TableCell>
                        <TableCell>MRN</TableCell>
                        <TableCell>Current Status</TableCell>
                        <TableCell>Admission Date</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Past Queue */}
                      {pastMaternityQueue.map((v: any) => (
                        <TableRow key={v.id} sx={{ bgcolor: '#fff9db' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>{v.patientName}</TableCell>
                          <TableCell>{v.mrn}</TableCell>
                          <TableCell>
                            <Chip label={v.status} size="small" color="warning" variant="outlined" />
                          </TableCell>
                          <TableCell>{new Date(v.createdAt).toLocaleString()}</TableCell>
                          <TableCell align="right">
                            <Button
                              variant="contained"
                              size="small"
                              color="warning"
                              onClick={() => {
                                const pt = patients.find(p => p.id === v.patientId || p.patientNumber === v.mrn);
                                if (pt) handleSelectPatient(pt);
                              }}
                            >
                              Monitor Patient
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Today's Queue */}
                      {activeMaternityQueue.map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell sx={{ fontWeight: 'bold' }}>{v.patientName}</TableCell>
                          <TableCell>{v.mrn}</TableCell>
                          <TableCell>
                            <Chip label={v.status} size="small" color="primary" variant="outlined" />
                          </TableCell>
                          <TableCell>{new Date(v.createdAt).toLocaleString()}</TableCell>
                          <TableCell align="right">
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => {
                                const pt = patients.find(p => p.id === v.patientId || p.patientNumber === v.mrn);
                                if (pt) handleSelectPatient(pt);
                              }}
                            >
                              Monitor Patient
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Stack>
      ) : (
        <Grid container spacing={3}>
          {/* Left Hand: Labour Admission Status & Clinical Alerts */}
          <Grid item xs={12} md={5}>
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Labour Admission Status" />
              <Divider />
              <CardContent>
                {!activePregnancy ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      No active ANC record found. Register pregnancy in Maternity Ward or create an emergency record below.
                    </Alert>
                    <Button 
                      variant="contained" 
                      color="error" 
                      onClick={handleRegisterEmergencyPregnancy}
                      disabled={loading}
                      startIcon={<Add />}
                    >
                      Create Emergency/Walk-in Pregnancy
                    </Button>
                  </Box>
                ) : activePregnancy.labourRecords?.length === 0 || !activePregnancy.labourRecords.some((lr: any) => lr.status === 'ACTIVE') ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Alert severity="info" sx={{ mb: 2 }}>No active labor admission record found for this pregnancy.</Alert>
                    <Button variant="contained" onClick={() => setLabourDialogOpen(true)}>Admit Mother in Labour</Button>
                  </Box>
                ) : (
                  <Box>
                    {/* Active Labour Vitals */}
                    {(() => {
                      const lr = activePregnancy.labourRecords.find((l: any) => l.status === 'ACTIVE');
                      return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Admitted at:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{new Date(lr.admittedAt).toLocaleTimeString()}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Cervical Dilatation:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: SUCCESS }}>{lr.cervicalDilatation} cm (dilating)</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Fetal Heart Rate:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{lr.fetalHeartRate} bpm</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Uterine Contractions:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{lr.contractionsFrequency} / 10 mins</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Membrane State:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{lr.membranesStatus}</Typography>
                          </Box>

                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                            <Button size="small" variant="contained" onClick={() => setMonitorDialogOpen(true)}>
                              Add Monitor Entry
                            </Button>
                            <Button size="small" variant="contained" color="success" onClick={() => setDeliveryDialogOpen(true)}>
                              Document Delivery
                            </Button>
                          </Box>
                        </Box>
                      );
                    })()}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Emergency Panel */}
            <Card sx={{ borderLeft: `5px solid ${DANGER}` }}>
              <CardHeader title="Obstetric Emergency Management" titleTypographyProps={{ color: DANGER }} />
              <Divider />
              <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                <Button variant="outlined" color="error" onClick={() => triggerObstetricEmergencyAlert('Postpartum Haemorrhage (PPH)')}>Trigger PPH Protocol</Button>
                <Button variant="outlined" color="error" onClick={() => triggerObstetricEmergencyAlert('Severe Pre-Eclampsia / Eclampsia')}>Trigger Eclampsia Protocol</Button>
                <Button variant="outlined" color="error" onClick={() => triggerObstetricEmergencyAlert('Sepsis / Chorioamnionitis')}>Trigger Sepsis Protocol</Button>
                <Button variant="outlined" color="error" onClick={() => triggerObstetricEmergencyAlert('Umbilical Cord Prolapse')}>Trigger Cord Prolapse Protocol</Button>
              </CardContent>
            </Card>

            {/* Logged Emergencies & Complications Card */}
            {maternityProfile?.maternalComplications?.length > 0 && (
              <Card sx={{ mt: 3, borderLeft: `5px solid ${DANGER}` }}>
                <CardHeader 
                  title="Logged Emergencies & Complications" 
                  titleTypographyProps={{ color: DANGER }}
                  subheader="Active emergency protocols and recorded complication events"
                />
                <Divider />
                <CardContent>
                  <Stack spacing={2}>
                    {maternityProfile.maternalComplications.map((comp: any) => (
                      <Box 
                        key={comp.id} 
                        sx={{ 
                          p: 1.5, 
                          borderRadius: 1.5, 
                          bgcolor: '#fffbfa', 
                          border: '1px solid #ffebe9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: DANGER }}>
                            ⚠️ {comp.complicationType}
                          </Typography>
                          <Chip 
                            label={comp.severity} 
                            color="error" 
                            size="small" 
                            sx={{ fontSize: '0.65rem', fontWeight: 'bold' }} 
                          />
                        </Box>
                        
                        {comp.managementNotes && (
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                            <strong>Management:</strong> {comp.managementNotes}
                          </Typography>
                        )}
                        
                        {comp.drugsAdministered && (
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                            <strong>Drugs Administered:</strong> {comp.drugsAdministered}
                          </Typography>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Recorded by: {comp.recordedBy || 'System'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {new Date(comp.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Back button */}
            <Button sx={{ mt: 3 }} onClick={() => setSelectedPatient(null)}>
              Return to Queue
            </Button>
          </Grid>

          {/* Right Hand: Partograph Visualization & ANC clinical details */}
          <Grid item xs={12} md={7}>
            <Stack spacing={3}>
              {activeLabourRecord && (
                <>
                  {/* Dynamic Visual Partograph Dilatation Progress Chart */}
                  <Card sx={{ borderRadius: 3, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <CardHeader
                      title="Visual Partograph Dilatation Progress Chart"
                      subheader={`Real-time WHO Dilatation Tracking for ${selectedPatient?.firstName} ${selectedPatient?.lastName}`}
                      avatar={<Timeline color="primary" />}
                      action={
                        (() => {
                          const lastNode = livePartographNodes[livePartographNodes.length - 1];
                          if (!lastNode) return null;
                          if (lastNode.isDelivery) {
                            return <Chip label="Full Delivery (10 cm)" color="success" sx={{ fontWeight: 800 }} />;
                          } else if (lastNode.isAlert) {
                            return <Chip label={`Alert Line (${lastNode.dilatation} cm)`} color="warning" sx={{ fontWeight: 800 }} />;
                          } else {
                            return <Chip label={`Dilatation: ${lastNode.dilatation} cm`} color="primary" sx={{ fontWeight: 800 }} />;
                          }
                        })()
                      }
                    />
                    <Divider />
                    <CardContent>
                      <Paper sx={{ p: 3, border: 'none', bgcolor: '#f8fafc', borderRadius: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', height: 210, display: 'flex', alignItems: 'flex-end', justifyContent: livePartographNodes.length === 1 ? 'center' : 'space-around', borderBottom: '2px solid #cbd5e1', borderLeft: '2px solid #cbd5e1', pl: 2, pb: 1 }}>
                          {livePartographNodes.map((node: any, idx: number) => {
                            const bottomOffset = `${Math.min(Math.max(node.dilatation * 16, 20), 160)}px`;
                            const nodeColor = node.isDelivery ? 'success.main' : (node.isAlert ? 'warning.main' : 'primary.main');
                            const shadowColor = node.isDelivery ? 'rgba(5,150,105,0.4)' : (node.isAlert ? 'rgba(217,119,6,0.4)' : 'rgba(37,99,235,0.4)');
                            return (
                              <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                <Typography variant="caption" fontWeight={700} color={node.isDelivery ? 'success.main' : (node.isAlert ? 'warning.main' : 'text.secondary')}>
                                  {node.label}
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', mb: 0.5 }}>
                                  {node.time} · FHR: {node.fhr} bpm
                                </Typography>
                                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: nodeColor, mb: bottomOffset, boxShadow: `0 0 10px ${shadowColor}` }} />
                              </Box>
                            );
                          })}
                        </Box>
                        <Typography variant="caption" color="text.secondary" mt={2} align="center">
                          Horizontal axis: Patient Monitoring Entries over Time. Vertical axis: Measured Cervical Dilatation (cm). Primary WHO alert/action lines are triggered if progression rate is less than 1 cm per hour.
                        </Typography>
                      </Paper>
                    </CardContent>
                  </Card>

                  {/* Recharts Partograph Trend Chart */}
                  <Card sx={{ minHeight: 380, borderRadius: 3, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <CardHeader title="Digital Partograph Dilatation Trend Chart" subheader="Active Dilatation Progress vs Alert / Action Lines" />
                    <Divider />
                    <CardContent>
                      {partographChartData.length === 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                          <Typography variant="body1" color="textSecondary">No Partograph dilatation metrics available yet.</Typography>
                        </Box>
                      ) : (
                        <Box sx={{ width: '100%', height: 280 }}>
                          <ResponsiveContainer>
                            <LineChart data={partographChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="hour" label={{ value: 'Hours in Labour', position: 'insideBottomRight', offset: -5 }} />
                              <YAxis label={{ value: 'Cervical Dilatation (cm)', angle: -90, position: 'insideLeft' }} domain={[0, 10]} />
                              <RechartsTooltip />
                              <Legend />
                              <Line type="monotone" dataKey="cervicalDilatation" stroke={PRIMARY} activeDot={{ r: 8 }} name="Dilatation (cm)" strokeWidth={3} />
                              <Line type="monotone" dataKey="fetalStationLevel" stroke="#e64980" name="Fetal Station Level" />
                              <Line type="monotone" dataKey="alertLine" stroke={WARNING} strokeDasharray="5 5" name="Alert Line" />
                              <Line type="monotone" dataKey="actionLine" stroke={DANGER} strokeDasharray="5 5" name="Action Line" />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {activePregnancy && (
                <Card sx={{ borderRadius: '12px', borderTop: `4px solid ${PRIMARY}` }}>
                  <CardHeader 
                    title="Antenatal Care (ANC) Profile & History" 
                    subheader="Linked pregnancy record details and antenatal clinic visit logs"
                  />
                  <Divider />
                  <CardContent>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">LMP Date</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {isUnbooked ? 'Not Recorded (Unbooked)' : (activePregnancy.lmpDate ? new Date(activePregnancy.lmpDate).toLocaleDateString() : 'N/A')}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">EDD Date</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: isUnbooked ? 'text.primary' : WARNING }}>
                          {isUnbooked ? 'Not Recorded (Unbooked)' : (activePregnancy.eddDate ? new Date(activePregnancy.eddDate).toLocaleDateString() : 'N/A')}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Gravidity / Parity</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {isUnbooked ? 'Not Recorded (Unbooked)' : `G${maternityProfile?.gravidity || 1} / P${maternityProfile?.parity || 0}`}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">HIV / Syphilis Status</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {isUnbooked ? 'Pending Screening (Unbooked)' : `${maternityProfile?.hivStatus || 'Negative'} / ${maternityProfile?.syphilisStatus || 'Negative'}`}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Timeline color="primary" /> Antenatal Visit Logs ({activePregnancy.antenatalVisits?.length || 0})
                    </Typography>

                    {(!activePregnancy.antenatalVisits || activePregnancy.antenatalVisits.length === 0) ? (
                      <Alert severity="info">No antenatal visit records registered for this active cycle.</Alert>
                    ) : (
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ bgcolor: LIGHT_BG }}>Date</TableCell>
                              <TableCell sx={{ bgcolor: LIGHT_BG }}>Weeks</TableCell>
                              <TableCell sx={{ bgcolor: LIGHT_BG }}>BP</TableCell>
                              <TableCell sx={{ bgcolor: LIGHT_BG }}>FHR (bpm)</TableCell>
                              <TableCell sx={{ bgcolor: LIGHT_BG }}>Presentation / Lie</TableCell>
                              <TableCell sx={{ bgcolor: LIGHT_BG }}>Fundal Ht (cm)</TableCell>
                              <TableCell sx={{ bgcolor: LIGHT_BG }}>Danger Signs</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {activePregnancy.antenatalVisits.map((v: any) => (
                              <TableRow key={v.id}>
                                <TableCell>{new Date(v.visitDate).toLocaleDateString()}</TableCell>
                                <TableCell>{v.gestationalWeeks} wks</TableCell>
                                <TableCell>{v.systolic || 'N/A'}/{v.diastolic || 'N/A'}</TableCell>
                                <TableCell>{v.fetalHeartRate || 'N/A'}</TableCell>
                                <TableCell>{v.fetalPresentation || 'N/A'} / {v.fetalLie || 'N/A'}</TableCell>
                                <TableCell>{v.fundalHeight || 'N/A'}</TableCell>
                                <TableCell>
                                  {v.dangerSigns ? (
                                    <Chip label={v.dangerSigns} color="error" size="small" variant="outlined" />
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">None</Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Grid>
        </Grid>
      )}

      {/* Labour Admission Dialog */}
      <Dialog open={labourDialogOpen} onClose={() => setLabourDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <form onSubmit={handleAdmitLabour}>
          <DialogTitle sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
            🩺 Midwife Intake — Active Labour Admission
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              {selectedPatient ? (
                <Alert severity="success" icon={<PregnantWoman />} sx={{ fontWeight: 800 }}>
                  Active Clinical Intake for: <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong> ({selectedPatient.mrn || selectedPatient.patientNumber})
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ fontWeight: 700 }}>
                  ⚠️ Please select a patient above before submitting clinical admission.
                </Alert>
              )}
              <Typography variant="body2" color="text.secondary">
                Log initial Vaginal Examination (VE) baseline findings to initiate Active Labour Surveillance and launch the Digital Partograph workspace.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField select fullWidth label="Membranes Status *" name="membranesStatus" defaultValue="INTACT" size="small">
                    <MenuItem value="INTACT">Intact (Membranes Unruptured)</MenuItem>
                    <MenuItem value="RUPTURED">Ruptured (SROM / ARM)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Initial Cervical Dilatation (cm) *" name="cervicalDilatation" type="number" inputProps={{ min: 0, max: 10, step: 0.5 }} defaultValue="4" size="small" helperText="≥ 4cm indicates Active Phase" required />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Contractions (per 10 mins) *" name="contractionsFrequency" type="number" inputProps={{ min: 0, max: 5 }} defaultValue="3" size="small" required />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Fetal Heart Rate (bpm) *" name="fetalHeartRate" type="number" defaultValue="140" size="small" helperText="Normal: 110 - 160 bpm" required />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Maternal Pulse (bpm) *" name="maternalPulse" type="number" defaultValue="80" size="small" required />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Maternal BP *" name="maternalBp" placeholder="e.g. 120/80" defaultValue="120/80" size="small" required />
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setLabourDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" disabled={loading} sx={{ fontWeight: 800 }}>
              ⚡ Admit & Launch Digital Partograph
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Partograph Monitor Entry Dialog */}
      <Dialog open={monitorDialogOpen} onClose={() => setMonitorDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleLogMonitor}>
          <DialogTitle>Add Partograph Monitoring Observation</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField select fullWidth label="Cervical Dilatation (cm) *" name="cervicalDilatation" defaultValue="4" error={!!validationErrors.cervicalDilatation} helperText={validationErrors.cervicalDilatation} required>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                    <MenuItem key={val} value={val}>{val} cm</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Fetal Station Level" name="fetalStationLevel" defaultValue="0">
                  <MenuItem value="-3">-3 (high)</MenuItem>
                  <MenuItem value="-2">-2</MenuItem>
                  <MenuItem value="-1">-1</MenuItem>
                  <MenuItem value="0">0 (engaged)</MenuItem>
                  <MenuItem value="+1">+1</MenuItem>
                  <MenuItem value="+2">+2</MenuItem>
                  <MenuItem value="+3">+3 (outlet)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Fetal Presentation" name="fetalPresentation" defaultValue="Cephalic">
                  <MenuItem value="Cephalic">Cephalic (Head first)</MenuItem>
                  <MenuItem value="Breech">Breech (Buttocks first)</MenuItem>
                  <MenuItem value="Shoulder">Shoulder / Transverse</MenuItem>
                  <MenuItem value="Face">Face</MenuItem>
                  <MenuItem value="Brow">Brow</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Fetal Heart Rate (bpm) *" name="fetalHeartRate" type="number" defaultValue="140" error={!!validationErrors.fetalHeartRate} helperText={validationErrors.fetalHeartRate || 'Normal: 110 - 160 bpm'} required />
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Contractions per 10 mins *" name="uterineContractions" defaultValue="3" required>
                  {[0, 1, 2, 3, 4, 5].map(val => (
                    <MenuItem key={val} value={val}>{val} contractions</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Contraction Strength" name="contractionStrength" defaultValue="MODERATE">
                  <MenuItem value="MILD">Mild</MenuItem>
                  <MenuItem value="MODERATE">Moderate</MenuItem>
                  <MenuItem value="STRONG">Strong</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Membranes Status" name="membranesStatus" defaultValue="INTACT">
                  <MenuItem value="INTACT">Intact</MenuItem>
                  <MenuItem value="RUPTURED">Ruptured</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Liquor Colour" name="liquidourColour" defaultValue="CLEAR">
                  <MenuItem value="CLEAR">Clear</MenuItem>
                  <MenuItem value="MECONIUM_STAINED">Meconium Stained</MenuItem>
                  <MenuItem value="BLOODSTAINED">Blood Stained</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Maternal Pulse (bpm) *" name="maternalPulse" type="number" defaultValue="80" error={!!validationErrors.maternalPulse} helperText={validationErrors.maternalPulse || 'Normal: 60 - 100 bpm'} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Maternal BP *" name="maternalBp" defaultValue="120/80" error={!!validationErrors.maternalBp} helperText={validationErrors.maternalBp || 'Format: 120/80'} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Maternal Temp (°C) *" name="maternalTemp" type="number" inputProps={{ step: '0.1' }} defaultValue="37.0" error={!!validationErrors.maternalTemp} helperText={validationErrors.maternalTemp || 'Normal: 36.5 - 37.5 °C'} required />
              </Grid>
              <Grid item xs={6} />
              <Grid item xs={12}><TextField fullWidth label="Notes / Interventions" name="notes" multiline rows={2} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setMonitorDialogOpen(false); setValidationErrors({}); }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Log Monitor Entry</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Document Delivery Dialog */}
      <Dialog open={deliveryDialogOpen} onClose={() => setDeliveryDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCompleteDelivery}>
          <DialogTitle>Document Delivery Details & Newborn Registry</DialogTitle>
          <DialogContent dividers>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: PRIMARY, mb: 1 }}>Delivery Method & Mother Outcomes:</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <TextField select fullWidth label="Delivery Type" name="deliveryType" defaultValue="VAGINAL">
                  <MenuItem value="VAGINAL">Normal Vaginal Delivery (SVD)</MenuItem>
                  <MenuItem value="ASSISTED">Assisted Vaginal (Vacuum/Forceps)</MenuItem>
                  <MenuItem value="CESAREAN">Caesarean Section</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Estimated Blood Loss (ml) *" name="bloodLossMl" type="number" error={!!validationErrors.bloodLossMl} helperText={validationErrors.bloodLossMl || 'Normal: < 500 ml'} required />
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Placenta Condition" name="placentaCondition" defaultValue="Complete & Intact">
                  <MenuItem value="Complete & Intact">Complete & Intact</MenuItem>
                  <MenuItem value="Incomplete / Fragmented">Incomplete / Fragmented</MenuItem>
                  <MenuItem value="Retained">Retained</MenuItem>
                  <MenuItem value="Manual Removal">Manual Removal</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Complications Detected" name="complications" defaultValue="None">
                  <MenuItem value="None">None</MenuItem>
                  <MenuItem value="Postpartum Haemorrhage (PPH)">Postpartum Haemorrhage (PPH)</MenuItem>
                  <MenuItem value="Perineal Tear (1st/2nd degree)">Perineal Tear (1st/2nd degree)</MenuItem>
                  <MenuItem value="Perineal Tear (3rd/4th degree)">Perineal Tear (3rd/4th degree)</MenuItem>
                  <MenuItem value="Shoulder Dystocia">Shoulder Dystocia</MenuItem>
                  <MenuItem value="Retained Placenta">Retained Placenta</MenuItem>
                  <MenuItem value="Maternal Sepsis">Maternal Sepsis</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: SUCCESS, mb: 1 }}>Newborn Physical Evaluation & APGAR:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField fullWidth label="Baby Name (Placeholder)" name="babyName" placeholder="e.g. Baby of Mary" required /></Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Baby Sex" name="sex" defaultValue="MALE">
                  <MenuItem value="MALE">Male</MenuItem>
                  <MenuItem value="FEMALE">Female</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth label="Birth Weight (kg) *" name="birthWeight" type="number" inputProps={{ step: '0.01' }} error={!!validationErrors.birthWeight} helperText={validationErrors.birthWeight || 'e.g. 3.20 kg'} required />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth label="Birth Length (cm)" name="birthLength" type="number" inputProps={{ step: '0.1' }} error={!!validationErrors.birthLength} helperText={validationErrors.birthLength || 'e.g. 50 cm'} />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth label="Head Circumference (cm)" name="headCircumference" type="number" inputProps={{ step: '0.1' }} error={!!validationErrors.headCircumference} helperText={validationErrors.headCircumference || 'e.g. 35 cm'} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Apgar Score (1 Minute) *" name="apgar1Min" type="number" error={!!validationErrors.apgar1Min} helperText={validationErrors.apgar1Min || 'Range: 0 - 10'} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Apgar Score (5 Minutes) *" name="apgar5Min" type="number" error={!!validationErrors.apgar5Min} helperText={validationErrors.apgar5Min || 'Range: 0 - 10'} required />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Newborn Examination / Resuscitation Notes"
                  name="examinationNotes"
                  multiline
                  rows={2.5}
                  value={examNotes}
                  onChange={(e) => setExamNotes(e.target.value)}
                  placeholder="e.g. Baby is fine, cried well at birth... (Speak 🎙️ or type & click ✨ AI Rewrite)"
                  helperText="Use 🎙️ Mic for live speech dictation, or tap ✨ AI Rewrite to transform notes into professional neonatal documentation."
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end" sx={{ alignSelf: 'flex-end', pb: 1 }}>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <Tooltip title={isDictatingNotes ? "Stop Voice Dictation" : "🎙️ Dictate Clinical Notes (Speech-to-Text)"}>
                            <IconButton
                              size="small"
                              color={isDictatingNotes ? "error" : "primary"}
                              onClick={startNotesDictation}
                              sx={{
                                bgcolor: isDictatingNotes ? 'rgba(211, 47, 47, 0.15)' : 'rgba(25, 118, 210, 0.1)',
                                border: isDictatingNotes ? '1px solid #d32f2f' : '1px solid #1976d2',
                                '&:hover': { bgcolor: isDictatingNotes ? 'rgba(211, 47, 47, 0.25)' : 'rgba(25, 118, 210, 0.2)' }
                              }}
                            >
                              {isDictatingNotes ? <MicOff fontSize="small" /> : <Mic fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="✨ AI Rewrite Cleanly into Professional Newborn Note">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleRewriteNotes()}
                              disabled={isRewritingNotes || !examNotes.trim()}
                              sx={{
                                bgcolor: 'rgba(46, 125, 50, 0.15)',
                                border: '1px solid #2e7d32',
                                '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.25)' }
                              }}
                            >
                              {isRewritingNotes ? <CircularProgress size={16} color="success" /> : <AutoAwesome fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setDeliveryDialogOpen(false); setValidationErrors({}); setExamNotes(''); }}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" disabled={loading}>Complete Birth Registry</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Obstetric Emergency Protocol Dialog */}
      <Dialog open={!!activeEmergency} onClose={() => setActiveEmergency(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: DANGER, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning /> Emergency Protocol: {activeEmergency?.type}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="h6" color="error" sx={{ mb: 2, fontWeight: 'bold' }}>
            CRITICAL PROTOCOL STEPS (Severity: {activeEmergency?.severity})
          </Typography>
          <Box sx={{ mb: 3 }}>
            {activeEmergency?.checklist.map((step: string, idx: number) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1.5 }}>
                <CheckCircle sx={{ color: SUCCESS }} />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{step}</Typography>
              </Box>
            ))}
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: PRIMARY }}>
            Emergency Management Documentation:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                label="Emergency Drugs Administered" 
                placeholder="e.g. Oxytocin 10IU IM, IV Crystalloids" 
                value={drugsAdministered}
                onChange={(e) => setDrugsAdministered(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                label="Clinical Action Notes" 
                placeholder="Detail the interventions performed, teams present, and patient response..."
                multiline
                rows={3}
                value={emergencyNotes}
                onChange={(e) => setEmergencyNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveEmergency(null)}>Close Window</Button>
          <Button onClick={handleLogComplication} variant="contained" color="error" disabled={loading}>
            Log Complication Event & Alert Teams
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Matron Bed & Suite Allocation */}
      <Dialog open={assignBedDialogOpen} onClose={() => setAssignBedDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>👩‍⚕️ Matron Bed & Suite Allocation</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {currentBedOfSelectedPatient ? (
              <Alert severity="success" sx={{ fontWeight: 700 }}>
                📍 <strong>Current Location</strong>: {currentBedOfSelectedPatient.number} ({currentBedOfSelectedPatient.bedType === 'DELIVERY_SUITE' ? 'Delivery Suite' : currentBedOfSelectedPatient.bedType === 'RECOVERY' ? 'Recovery Bed' : 'First Stage Obs'})
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  Assigning a new spot will automatically transfer <strong>{selectedPatient?.firstName} {selectedPatient?.lastName}</strong> and free up {currentBedOfSelectedPatient.number}.
                </Typography>
              </Alert>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Select an available stage spot or delivery table for <strong>{selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'the patient'}</strong>:
              </Typography>
            )}

            <TextField
              select
              fullWidth
              label="Stage Spot / Delivery Suite *"
              value={selectedBedId}
              onChange={e => setSelectedBedId(e.target.value)}
            >
              <MenuItem value="" disabled>Select Stage Spot</MenuItem>
              {labourBeds.map((bed: any) => {
                const isCurrent = currentBedOfSelectedPatient && currentBedOfSelectedPatient.id === bed.id;
                const isSuite = bed.bedType === 'DELIVERY_SUITE' || bed.number.includes('SUITE');
                const isObs = bed.bedType === 'FIRST_STAGE_OBS' || bed.number.includes('OBS');
                const isRec = bed.bedType === 'RECOVERY' || bed.number.includes('REC');
                const typeLabel = isSuite ? '👶 Delivery Suite' : isObs ? '🛋️ First Stage Obs' : isRec ? '🛌 Recovery Bed' : 'Bed';
                return (
                  <MenuItem key={bed.id} value={bed.id} disabled={bed.status === 'OCCUPIED' && !isCurrent}>
                    {typeLabel}: {bed.number} {isCurrent ? '(CURRENT SPOT)' : `(${bed.status})`} {bed.patient && !isCurrent ? `— ${bed.patient.name}` : ''}
                  </MenuItem>
                );
              })}
            </TextField>

            {selectedBedId && (() => {
              const b = labourBeds.find(item => item.id === selectedBedId);
              if (b && (b.bedType === 'DELIVERY_SUITE' || b.number.includes('SUITE'))) {
                return (
                  <Alert severity="warning" sx={{ fontWeight: 700 }}>
                    🔒 Assigning a Delivery Suite locks this table in the system and automatically decrements available delivery suites for hospital triage.
                  </Alert>
                );
              }
              return null;
            })()}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAssignBedDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignBed} variant="contained" color="secondary" sx={{ fontWeight: 800 }}>
            {currentBedOfSelectedPatient ? 'Transfer & Lock Bed Spot' : 'Lock & Assign Bed Spot'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Records Administrative Validation */}
      <Dialog open={recordsValidateDialogOpen} onClose={() => setRecordsValidateDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>📋 Records Administrative Check-In & Bio-Data</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              The Midwife has initiated clinical admission so the Partograph can run. Records completes the administrative check-in retrospectively.
            </Alert>
            {selectedPatient?.identification === 'UNBOOKED_EMERGENCY_LABOUR' && (
              <Alert severity="warning">
                <strong>⚡ Unbooked Emergency Patient</strong>: Bedside registration required! Complete full Master Patient Index (MPI) details in the Registration Desk.
              </Alert>
            )}
            <TextField
              fullWidth
              label="HMO Pre-Authorization / Deposit Code"
              placeholder="e.g. HMO-AUTH-9921 or LABOUR-DEP-001"
              value={hmoPreAuthCode}
              onChange={e => setHmoPreAuthCode(e.target.value)}
            />
            <TextField
              fullWidth
              label="Next of Kin / Partner Phone"
              placeholder="e.g. 0803 123 4567"
            />
            <Button
              variant="outlined"
              color="primary"
              startIcon={<Person />}
              onClick={() => {
                setRecordsValidateDialogOpen(false);
                if (selectedPatient) {
                  navigate(`/patients?search=${encodeURIComponent(selectedPatient.patientNumber || selectedPatient.firstName)}`);
                }
              }}
              sx={{ fontWeight: 700 }}
            >
              Open Full Patient Bio-Data File in Registration (MPI Desk)
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRecordsValidateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleValidateRecords} variant="contained" color="info" sx={{ fontWeight: 800 }}>
            Validate Admin Admission
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Quick Unbooked Emergency Labour Intake */}
      <Dialog open={unbookedDialogOpen} onClose={() => setUnbookedDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <form onSubmit={handleFastTrackRegister}>
          <DialogTitle sx={{ fontWeight: 800, color: WARNING }}>⚡ Quick Unbooked Emergency Labour Intake (Midwife Fast-Track)</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="warning">
                <strong>Emergency Intake</strong>: Clinical care & Digital Partograph start immediately! Demographics and payment validation will be completed by Records retrospectively.
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Mother's First Name"
                    placeholder="e.g. Fatima (or leave blank)"
                    value={unbookedData.firstName}
                    onChange={e => setUnbookedData({ ...unbookedData, firstName: e.target.value })}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Mother's Last Name / Alias"
                    placeholder="e.g. Bello (or leave blank)"
                    value={unbookedData.lastName}
                    onChange={e => setUnbookedData({ ...unbookedData, lastName: e.target.value })}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Emergency / Partner Phone"
                    placeholder="e.g. 08031234567"
                    value={unbookedData.phone}
                    onChange={e => {
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setUnbookedData({ ...unbookedData, phone: digitsOnly });
                    }}
                    inputProps={{ maxLength: 11 }}
                    error={unbookedData.phone.length > 0 && unbookedData.phone.length !== 11}
                    helperText={
                      unbookedData.phone.length > 0 && unbookedData.phone.length !== 11
                        ? `Must be 11 digits (${unbookedData.phone.length}/11)`
                        : 'Max 11 digits (e.g. 08031234567)'
                    }
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Estimated Gestation (Weeks)"
                    type="number"
                    value={unbookedData.estimatedWeeks}
                    onChange={e => setUnbookedData({ ...unbookedData, estimatedWeeks: Number(e.target.value) })}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Cervical Dilatation (cm) *"
                    type="number"
                    inputProps={{ min: 0, max: 10, step: 0.5 }}
                    value={unbookedData.cervicalDilatation}
                    onChange={e => setUnbookedData({ ...unbookedData, cervicalDilatation: Number(e.target.value) })}
                    size="small"
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Contractions (per 10m) *"
                    type="number"
                    inputProps={{ min: 0, max: 5 }}
                    value={unbookedData.contractionsFrequency}
                    onChange={e => setUnbookedData({ ...unbookedData, contractionsFrequency: Number(e.target.value) })}
                    size="small"
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Fetal Heart Rate (bpm) *"
                    type="number"
                    value={unbookedData.fetalHeartRate}
                    onChange={e => setUnbookedData({ ...unbookedData, fetalHeartRate: Number(e.target.value) })}
                    size="small"
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    fullWidth
                    label="Membranes *"
                    value={unbookedData.membranesStatus}
                    onChange={e => setUnbookedData({ ...unbookedData, membranesStatus: e.target.value })}
                    size="small"
                  >
                    <MenuItem value="INTACT">Intact (Membranes Unruptured)</MenuItem>
                    <MenuItem value="RUPTURED">Ruptured (SROM / ARM)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Assign Labour Bed Spot (Optional)"
                    value={unbookedData.bedId}
                    onChange={e => setUnbookedData({ ...unbookedData, bedId: e.target.value })}
                    size="small"
                    helperText={`${labourBeds.filter(b => b.status === 'AVAILABLE').length} available spots in Labour & Delivery Ward`}
                  >
                    <MenuItem value="">-- Select Bed Spot Later --</MenuItem>
                    {labourBeds.map(b => {
                      const bedNum = b.number || b.bedNumber || 'Bed';
                      const isSuite = b.bedType === 'DELIVERY_SUITE' || bedNum.includes('SUITE');
                      const isObs = b.bedType === 'FIRST_STAGE_OBS' || bedNum.includes('OBS');
                      const isRec = b.bedType === 'RECOVERY' || bedNum.includes('REC');
                      const typeLabel = isSuite ? '👶 Delivery Suite' : isObs ? '🛋️ First Stage Obs' : isRec ? '🛌 Recovery Bed' : 'Bed';
                      const wardLabel = b.wardName || 'Labour Ward';
                      const isAvailable = b.status === 'AVAILABLE';

                      return (
                        <MenuItem key={b.id} value={b.id} disabled={!isAvailable}>
                          {typeLabel}: {bedNum} ({wardLabel}) {isAvailable ? '🟢 Available' : `🔴 Occupied${b.patient ? ` (${b.patient.name})` : ''}`}
                        </MenuItem>
                      );
                    })}
                  </TextField>
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setUnbookedDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="warning" disabled={loading} sx={{ fontWeight: 800 }}>
              ⚡ Register & Launch Partograph
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
