import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography, Box, Card, CardContent, Button, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton,
  Autocomplete, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Stack, Tab, Tabs, Divider, CircularProgress,
  Badge, Tooltip, Alert, Paper, Avatar, Pagination, ListSubheader, FormHelperText,
} from '@mui/material';
import {
  Add, Search, Bed, ExitToApp, Visibility, CheckCircle, ArrowForward,
  Refresh, Timeline, LocalHospital, Payment, Science, MedicalServices,
  Medication, DoneAll, AccessTime, Warning, Person, Group, HourglassEmpty, AssignmentTurnedIn,
  AccessibilityNew,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ─── Status configuration ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; severity: 'info' | 'warning' | 'success' | 'error' }> = {
  REGISTERED: { label: 'Registered', color: '#6366f1', icon: <Person sx={{ fontSize: 14 }} />, severity: 'info' },
  AWAITING_PAYMENT: { label: 'Awaiting Payment', color: '#f59e0b', icon: <Payment sx={{ fontSize: 14 }} />, severity: 'warning' },
  PAYMENT_CONFIRMED: { label: 'Payment Confirmed', color: '#10b981', icon: <CheckCircle sx={{ fontSize: 14 }} />, severity: 'success' },
  WAITING_TRIAGE: { label: 'Waiting for Triage', color: '#3b82f6', icon: <AccessTime sx={{ fontSize: 14 }} />, severity: 'info' },
  IN_TRIAGE: { label: 'In Triage', color: '#8b5cf6', icon: <LocalHospital sx={{ fontSize: 14 }} />, severity: 'info' },
  WAITING_CONSULTATION: { label: 'Waiting for Consultation', color: '#0ea5e9', icon: <AccessTime sx={{ fontSize: 14 }} />, severity: 'info' },
  IN_CONSULTATION: { label: 'In Consultation', color: '#06b6d4', icon: <MedicalServices sx={{ fontSize: 14 }} />, severity: 'info' },
  IN_PHYSIOTHERAPY: { label: 'In Physiotherapy & Rehab', color: '#06b6d4', icon: <AccessibilityNew sx={{ fontSize: 14 }} />, severity: 'info' },
  WAITING_PHYSIO: { label: 'Waiting for Physiotherapy', color: '#0ea5e9', icon: <AccessTime sx={{ fontSize: 14 }} />, severity: 'info' },
  IN_REHAB_MIRROR: { label: 'Kinematic Mirror Session', color: '#8b5cf6', icon: <AccessibilityNew sx={{ fontSize: 14 }} />, severity: 'info' },
  PHYSIO_EVALUATION: { label: 'Physio Assessment & SOAP', color: '#0284c7', icon: <AccessibilityNew sx={{ fontSize: 14 }} />, severity: 'info' },
  AWAITING_INVESTIGATION: { label: 'Awaiting Investigation', color: '#f97316', icon: <Science sx={{ fontSize: 14 }} />, severity: 'warning' },
  IN_LABORATORY: { label: 'In Laboratory', color: '#ec4899', icon: <Science sx={{ fontSize: 14 }} />, severity: 'info' },
  IN_RADIOLOGY: { label: 'In Radiology', color: '#a855f7', icon: <Science sx={{ fontSize: 14 }} />, severity: 'info' },
  RESULTS_AVAILABLE: { label: 'Results Available', color: '#14b8a6', icon: <CheckCircle sx={{ fontSize: 14 }} />, severity: 'success' },
  WAITING_PHARMACY: { label: 'Waiting for Pharmacy', color: '#f59e0b', icon: <Medication sx={{ fontSize: 14 }} />, severity: 'warning' },
  MEDICATION_DISPENSED: { label: 'Medication Dispensed', color: '#10b981', icon: <CheckCircle sx={{ fontSize: 14 }} />, severity: 'success' },
  ORDERED_ADMISSION: { label: 'Admission Ordered (Awaiting Billing)', color: '#ea580c', icon: <LocalHospital sx={{ fontSize: 14 }} />, severity: 'warning' },
  PENDING_BED_ASSIGNMENT: { label: 'Deposit Paid (Awaiting Bed Space)', color: '#8b5cf6', icon: <Bed sx={{ fontSize: 14 }} />, severity: 'info' },
  ADMITTED: { label: 'Admitted (IPD Bed Assigned)', color: '#0284c7', icon: <Bed sx={{ fontSize: 14 }} />, severity: 'success' },
  DISCHARGED: { label: 'Discharged', color: '#6b7280', icon: <ExitToApp sx={{ fontSize: 14 }} />, severity: 'info' },
  CLOSED: { label: 'Closed', color: '#22c55e', icon: <DoneAll sx={{ fontSize: 14 }} />, severity: 'success' },
  // legacy
  Waiting: { label: 'Waiting', color: '#f59e0b', icon: <AccessTime sx={{ fontSize: 14 }} />, severity: 'warning' },
  'In Progress': { label: 'In Progress', color: '#3b82f6', icon: <MedicalServices sx={{ fontSize: 14 }} />, severity: 'info' },
  Completed: { label: 'Completed', color: '#22c55e', icon: <DoneAll sx={{ fontSize: 14 }} />, severity: 'success' },
};

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#6b7280', severity: 'info' as const };
  return (
    <Chip
      icon={cfg.icon ? <Box sx={{ display: 'flex', color: 'inherit', mr: -0.5 }}>{cfg.icon}</Box> : undefined}
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: `${cfg.color}12`,
        color: cfg.color,
        border: `1.5px solid ${cfg.color}35`,
        fontWeight: 700,
        fontSize: '0.72rem',
        borderRadius: '8px',
        px: 0.5,
      }}
    />
  );
}

interface VisitItem {
  id: string;
  visitNumber: string;
  visitType: string;
  status: string;
  chiefComplaint?: string;
  createdAt: string;
  patient: { id: string; firstName: string; lastName: string; patientNumber: string };
  encounters: any[];
  workflowState?: { currentStatus: string; currentStepOrder: number; completedSteps: any[]; templateId: string };
}

interface PatientOption { id: string; mrn: string; firstName: string; lastName: string; gender?: string; }
interface WardItem { id: string; name: string; type: string; wardCategory?: string; beds: { id: string; number: string; status: string }[] }
interface ConsultationServiceOption { id: string; code: string; name: string; category: string; price: number; duration: number }

const VISIT_TYPES = [
  { value: 'OUTPATIENT', label: 'Outpatient (OPD)' },
  { value: 'INPATIENT', label: 'Inpatient (IPD)' },
  { value: 'PAEDIATRIC', label: 'Paediatric Ward' },
  { value: 'EMERGENCY', label: 'Emergency (ER)' },
  { value: 'ANC', label: 'Antenatal (ANC)' },
  { value: 'MATERNITY', label: 'Maternity' },
  { value: 'LABOUR_DELIVERY', label: 'Labour & Delivery' },
  { value: 'LAB_ONLY', label: 'Lab Test Only' },
  { value: 'RADIOLOGY_ONLY', label: 'Radiology Only' },
  { value: 'PHYSIO', label: 'Physiotherapy' },
];

const getWaitTimeInfo = (createdAt: string, status: string) => {
  const isDone = ['CLOSED', 'DISCHARGED', 'Completed'].includes(status);
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  
  let label = '';
  if (diffMins < 60) {
    label = `${diffMins}m`;
  } else {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    label = `${hours}h ${mins}m`;
  }

  if (isDone) {
    return { label, color: '#6b7280', pulsing: false, bg: 'rgba(107,114,128,0.08)' };
  }
  if (diffMins >= 60) {
    return { label, color: '#ef4444', pulsing: true, bg: 'rgba(239,68,68,0.1)' };
  }
  if (diffMins >= 30) {
    return { label, color: '#f59e0b', pulsing: false, bg: 'rgba(245,158,11,0.1)' };
  }
  return { label, color: '#10b981', pulsing: false, bg: 'rgba(16,185,129,0.1)' };
};

const Visits = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role || '';

  const getWorkstationPath = (visitType: string) => {
    switch (visitType) {
      case 'OUTPATIENT':
        return '/opd';
      case 'INPATIENT':
        return '/ipd';
      case 'PAEDIATRIC':
        return '/ipd/paediatric';
      case 'MATERNITY':
      case 'ANC':
        return '/maternity';
      case 'EMERGENCY':
        return '/emergency';
      case 'ICU':
        return '/icu';
      case 'LAB_ONLY':
        return '/lims';
      case 'RADIOLOGY_ONLY':
        return '/radiology';
      case 'PHYSIO':
        return '/rehabilitation';
      default:
        return '/opd';
    }
  };

  const [tabValue, setTabValue] = useState(0);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [wards, setWards] = useState<WardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [consultationServices, setConsultationServices] = useState<ConsultationServiceOption[]>([]);

  // Check-In dialog
  const [openCheckin, setOpenCheckin] = useState(false);
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [visitType, setVisitType] = useState('OUTPATIENT');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [triagePriority, setTriagePriority] = useState(0);
  const [priorityReason, setPriorityReason] = useState('');

  // Physiotherapy Session Wallet & Top-Up States
  const [physioWallet, setPhysioWallet] = useState<any | null>(null);
  const [loadingPhysioWallet, setLoadingPhysioWallet] = useState(false);
  const [physioPackageType, setPhysioPackageType] = useState('COMP_10');
  const [physioSessionCount, setPhysioSessionCount] = useState(10);
  const [physioPaymentMethod, setPhysioPaymentMethod] = useState('CASH');

  // Admission dialog
  const [openAdmit, setOpenAdmit] = useState(false);
  const [admitVisit, setAdmitVisit] = useState<VisitItem | null>(null);
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedBedId, setSelectedBedId] = useState('');

  const handleOpenAdmitDialog = (v: VisitItem) => {
    setAdmitVisit(v);
    setSelectedBedId('');

    // Pre-select matching ward
    const patAge = getPatientAgeYears(v.patient);
    let targetWard = wards.find(w => {
      const wCat = (w.wardCategory || '').toUpperCase();
      const wName = (w.name || '').toLowerCase();
      if (v.visitType === 'PAEDIATRIC' && (wCat === 'PAEDIATRIC' || wName.includes('paediatric') || wName.includes('pediatric'))) return true;
      if (['MATERNITY', 'ANC', 'LABOUR_DELIVERY'].includes(v.visitType) && (wCat === 'MATERNITY' || wCat === 'LABOUR' || wName.includes('maternity') || wName.includes('labour') || wName.includes('delivery'))) return true;
      if (v.visitType === 'EMERGENCY' && (wCat === 'EMERGENCY' || wName.includes('emergency'))) return true;
      return false;
    });

    if (!targetWard && patAge <= 18) {
      targetWard = wards.find(w => (w.wardCategory || '').toUpperCase() === 'PAEDIATRIC' || (w.name || '').toLowerCase().includes('paediatric'));
    }

    if (!targetWard && wards.length > 0) {
      targetWard = wards[0];
    }

    const wardId = targetWard ? targetWard.id : (wards[0]?.id || '');
    setSelectedWardId(wardId);

    // Auto-select first available bed in target ward
    if (targetWard) {
      const availBed = targetWard.beds.find(b => b.status === 'AVAILABLE');
      if (availBed) setSelectedBedId(availBed.id);
    }

    setOpenAdmit(true);
  };

  // Discharge dialog
  const [openDischarge, setOpenDischarge] = useState(false);
  const [dischargeVisit, setDischargeVisit] = useState<VisitItem | null>(null);
  const [dischargeReason, setDischargeReason] = useState('');

  // Visit summary dialog
  const [openSummary, setOpenSummary] = useState(false);
  const [summaryVisit, setSummaryVisit] = useState<VisitItem | null>(null);
  const [workflowDetail, setWorkflowDetail] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Advance confirmation dialog
  const [openAdvance, setOpenAdvance] = useState(false);
  const [advanceVisit, setAdvanceVisit] = useState<VisitItem | null>(null);
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [advancing, setAdvancing] = useState(false);

  const fetchVisits = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const showReceptionTab = ['RECEPTIONIST', 'NURSE', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);
      const showClinicalTab = ['DOCTOR', 'LAB_TECHNICIAN', 'PHARMACIST', 'NURSE', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);

      const dynamicTabs = [];
      if (showReceptionTab) dynamicTabs.push({ label: 'Reception & Triage Queue', statuses: ['REGISTERED', 'AWAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'WAITING_TRIAGE', 'IN_TRIAGE', 'WAITING_CONSULTATION', 'WAITING_PHYSIO', 'Waiting'] });
      if (showClinicalTab) dynamicTabs.push({ label: 'Clinical In-Progress', statuses: ['IN_CONSULTATION', 'IN_PHYSIOTHERAPY', 'IN_REHAB_MIRROR', 'PHYSIO_EVALUATION', 'AWAITING_INVESTIGATION', 'IN_LABORATORY', 'IN_RADIOLOGY', 'RESULTS_AVAILABLE', 'WAITING_PHARMACY', 'MEDICATION_DISPENSED', 'ADMITTED', 'IN_LABOUR', 'DELIVERED', 'In Progress'] });
      dynamicTabs.push({ label: 'Discharged & Closed', statuses: ['DISCHARGED', 'CLOSED', 'Completed'] });

      const activeTabStatuses = dynamicTabs[tabValue]?.statuses || [];

      const params = new URLSearchParams();
      activeTabStatuses.forEach(s => params.append('status', s));
      params.append('page', page.toString());
      params.append('limit', '50');
      
      const res = await api.get(`/visits?${params}`);
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setVisits(data);
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err) {
      console.error(err);
      if (!isBackground) enqueueSnackbar('Failed to fetch visits', { variant: 'error' });
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [tabValue, page, userRole, enqueueSnackbar]);

  useEffect(() => { setPage(1); }, [tabValue]);
  useEffect(() => { fetchVisits(false); }, [tabValue, page, fetchVisits]);

  useEffect(() => {
    api.get('/visits/wards').then(r => setWards(r.data)).catch(console.error);
    api.get('/workflow/consultation-services?activeOnly=true')
      .then(r => setConsultationServices(r.data?.data || []))
      .catch(console.error);
    api.get('/patients/mpi', { params: { limit: 15 } })
      .then(res => {
        setPatientOptions((res.data.data || []).map((p: any) => ({ id: p.id, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName, gender: p.gender })));
      })
      .catch(console.error);
  }, []);

  // Auto-refresh every 10s and listen to real-time events via EventSource (SSE)
  useEffect(() => {
    const interval = setInterval(() => fetchVisits(true), 10000);

    const token = localStorage.getItem('token');
    const eventSource = new EventSource(`/api/visits/events?token=${token}`);
    eventSource.onmessage = () => {
      fetchVisits(true);
    };
    eventSource.onerror = () => {
      // quiet fallback
    };

    return () => {
      clearInterval(interval);
      eventSource.close();
    };
  }, [fetchVisits]);

  const handlePatientSearch = async (val: string) => {
    if (!val || val.length < 2) {
      try {
        const res = await api.get('/patients/mpi', { params: { limit: 15 } });
        setPatientOptions((res.data.data || []).map((p: any) => ({ id: p.id, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName, gender: p.gender })));
      } catch (e) { console.error(e); }
      return;
    }
    setLoadingSearch(true);
    try {
      const res = await api.get(`/patients/mpi?search=${encodeURIComponent(val)}`);
      setPatientOptions((res.data.data || []).map((p: any) => ({ id: p.id, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName, gender: p.gender })));
    } catch (e) { console.error(e); }
    finally { setLoadingSearch(false); }
  };

  const selectedService = consultationServices.find(s => s.id === selectedServiceId);
  const isPhysioCheckin = visitType === 'PHYSIO' || 
    (selectedService && (
      (selectedService.name || '').toLowerCase().includes('physio') ||
      (selectedService.code || '').includes('PHYSIO')
    ));

  useEffect(() => {
    if (selectedPatient && isPhysioCheckin) {
      setLoadingPhysioWallet(true);
      const queryId = selectedPatient.id || selectedPatient.mrn || selectedPatient.lastName;
      api.get(`/rehabilitation/wallet/${encodeURIComponent(queryId)}`)
        .then(res => {
          if (res.data?.success && res.data.data) {
            setPhysioWallet(res.data.data);
          } else {
            setPhysioWallet(null);
          }
        })
        .catch(() => setPhysioWallet(null))
        .finally(() => setLoadingPhysioWallet(false));
    } else {
      setPhysioWallet(null);
    }
  }, [selectedPatient, isPhysioCheckin]);

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    if ((visitType === 'ANC' || visitType === 'MATERNITY' || visitType === 'LABOUR_DELIVERY') && selectedPatient.gender !== 'FEMALE') {
      enqueueSnackbar(`Only female patients can be checked into ${
        visitType === 'ANC' ? 'Antenatal' : visitType === 'MATERNITY' ? 'Maternity' : 'Labour & Delivery'
      } services.`, { variant: 'error' });
      return;
    }

    if (visitType === 'PAEDIATRIC') {
      const age = getPatientAgeYears(selectedPatient);
      if (age > 18) {
        enqueueSnackbar(`Paediatric Ward check-in is restricted to children & adolescents (Age 0–18 years). Patient ${selectedPatient.firstName} ${selectedPatient.lastName} is ${age} years old. Please select Outpatient (OPD), Inpatient (IPD), or Emergency (ER).`, {
          variant: 'error',
          autoHideDuration: 8000,
        });
        return;
      }
    }

    try {
      // If checking in for Physiotherapy and patient needs top-up / package purchase
      if (isPhysioCheckin && (!physioWallet || physioWallet.sessionsRemaining <= 0)) {
        const computedAmount = physioPackageType === 'SINGLE' ? 7000 :
          physioPackageType === 'ACUTE_5' ? 30000 :
          physioPackageType === 'COMP_10' ? 55000 :
          physioPackageType === 'ORTHO_15' ? 75000 :
          physioPackageType === 'NEURO_20' ? 95000 :
          physioSessionCount * 5500;

        const pkgLabel = physioPackageType === 'SINGLE' ? '1 Single Treatment Session (₦7,000)' :
          physioPackageType === 'ACUTE_5' ? '5 Sessions Acute Rehabilitation Pack' :
          physioPackageType === 'COMP_10' ? '10 Sessions Comprehensive Recovery Pack' :
          physioPackageType === 'ORTHO_15' ? '15 Sessions Orthopaedic & Trauma Pack' :
          physioPackageType === 'NEURO_20' ? '20 Sessions Neurological / Stroke Track' :
          `Custom Session Package (${physioSessionCount} Sessions)`;

        await api.post('/rehabilitation/wallet/topup', {
          patientId: selectedPatient.id || selectedPatient.mrn,
          patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`.trim(),
          sessionCount: physioSessionCount,
          packageName: pkgLabel,
          totalAmount: computedAmount,
          paymentMethod: physioPaymentMethod
        }).catch(err => console.warn('Wallet topup warning:', err));
      }

      await api.post('/visits', {
        patientId: selectedPatient.id,
        visitType,
        consultationServiceId: (isPhysioCheckin && physioWallet?.sessionsRemaining > 0) ? null : (selectedServiceId || null),
        chiefComplaint: chiefComplaint || (isPhysioCheckin ? 'Rehabilitation & Physio Session Visit' : null),
        priority: triagePriority,
        priorityReason: priorityReason || null,
      });
      enqueueSnackbar(isPhysioCheckin ? `Patient checked in to Physiotherapy! (${physioWallet?.sessionsRemaining > 0 ? 'Prepaid credit active' : `${physioSessionCount} sessions credited & billed`})` : 'Patient checked in successfully! Workflow started.', { variant: 'success' });
      setOpenCheckin(false);
      setSelectedPatient(null);
      setVisitType('OUTPATIENT');
      setSelectedServiceId('');
      setChiefComplaint('');
      setTriagePriority(0);
      setPriorityReason('');
      setPhysioWallet(null);
      fetchVisits();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Check-in failed', { variant: 'error' });
    }
  };

  const handleViewSummary = async (visit: VisitItem) => {
    setLoadingSummary(true);
    setSummaryVisit(visit);
    setOpenSummary(true);
    try {
      const [summRes, wfRes] = await Promise.all([
        api.get(`/visits/${visit.id}/summary`),
        api.get(`/workflow/visits/${visit.id}`).catch(() => ({ data: null })),
      ]);
      setSummaryData(summRes.data);
      setWorkflowDetail(wfRes.data?.data || null);
    } catch (err) {
      enqueueSnackbar('Failed to load visit summary', { variant: 'error' });
    } finally { setLoadingSummary(false); }
  };

  const handleAdvanceClick = (visit: VisitItem) => {
    setAdvanceVisit(visit);
    setAdvanceNotes('');
    setOpenAdvance(true);
  };

  const handleAdvanceConfirm = async () => {
    if (!advanceVisit) return;
    setAdvancing(true);
    try {
      const res = await api.post(`/workflow/visits/${advanceVisit.id}/advance`, { notes: advanceNotes });
      enqueueSnackbar(`Visit advanced → ${res.data.newStatus}`, { variant: 'success' });
      setOpenAdvance(false);
      fetchVisits();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to advance visit', { variant: 'error' });
    } finally { setAdvancing(false); }
  };

  const handleCloseVisit = async (visit: VisitItem) => {
    if (!window.confirm('Close this visit? This will finalize all clinical activities.')) return;
    try {
      await api.post(`/visits/${visit.id}/close`);
      enqueueSnackbar('Visit session closed successfully.', { variant: 'success' });
      fetchVisits();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to close visit', { variant: 'error' });
    }
  };

  const getPatientAgeYears = (patient: any): number => {
    if (!patient) return 0;
    if (typeof patient.age === 'number' && !isNaN(patient.age) && patient.age >= 0) return patient.age;
    if (patient.estimatedAge) {
      const parsedEst = parseInt(String(patient.estimatedAge));
      if (!isNaN(parsedEst) && parsedEst >= 0) return parsedEst;
    }
    const rawDob = patient.dateOfBirth || patient.birthDate || patient.dob;
    if (rawDob) {
      const dob = new Date(rawDob);
      if (!isNaN(dob.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return Math.max(0, age);
      }
    }
    return 0;
  };

  const [depositAmount, setDepositAmount] = useState<number>(25000);
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [inpatientNumber, setInpatientNumber] = useState<string>('');

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitVisit) return;

    // Check Paediatric Ward age restriction (Age 0-18 only)
    let isPaediatricWard = false;
    if (selectedBedId) {
      for (const w of wards) {
        const foundBed = w.beds.find(b => b.id === selectedBedId);
        if (foundBed) {
          if (w.wardCategory === 'PAEDIATRIC' || w.name?.toLowerCase().includes('paediatric') || w.name?.toLowerCase().includes('pediatric')) {
            isPaediatricWard = true;
          }
          break;
        }
      }
    }

    const patientAge = getPatientAgeYears(admitVisit.patient);
    if (isPaediatricWard && patientAge > 18) {
      enqueueSnackbar(`Paediatric Ward admission is restricted to pediatric patients & adolescents (Age 0–18 years). Patient ${admitVisit.patient?.firstName || ''} ${admitVisit.patient?.lastName || ''} is ${patientAge} years old. Please assign adult patients to Medical, Surgical, Private, or Emergency Ward.`, {
        variant: 'error',
        autoHideDuration: 8000,
      });
      return;
    }

    try {
      await api.post(`/visits/${admitVisit.id}/process-admission-file`, {
        depositAmount: depositAmount || 0,
        paymentMode,
        inpatientNumber: inpatientNumber || undefined,
      });

      if (selectedBedId) {
        await api.post(`/visits/${admitVisit.id}/admit`, { bedId: selectedBedId });
        enqueueSnackbar('Inpatient File processed & Bed Space allocated successfully!', { variant: 'success' });
      } else {
        enqueueSnackbar('Inpatient Admission File processed! Patient queued for Ward Matron bed assignment.', { variant: 'success' });
      }
      setOpenAdmit(false);
      setSelectedBedId('');
      fetchVisits();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Processing failed', { variant: 'error' });
    }
  };

  const handleDischargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeVisit || !dischargeReason) return;
    try {
      await api.post(`/visits/${dischargeVisit.id}/discharge`, { reason: dischargeReason });
      enqueueSnackbar('Patient discharged!', { variant: 'success' });
      setOpenDischarge(false);
      setDischargeReason('');
      fetchVisits();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Discharge failed', { variant: 'error' });
    }
  };

  const isClosed = (v: VisitItem) => ['CLOSED', 'DISCHARGED', 'Completed'].includes(v.status);
  const isAdmitted = (v: VisitItem) => v.encounters?.some(e => e.type === 'Admission' && e.status === 'IN_PROGRESS');

  const canAdmitPatient = (v: VisitItem) => {
    if (isAdmitted(v) || isClosed(v)) return false;
    // Emergency visits allow immediate admission processing at Records
    if (v.visitType === 'EMERGENCY') return true;
    // All other visits require Doctor's Admission Order or Pending Bed Assignment state
    if (v.status === 'ORDERED_ADMISSION' || v.status === 'PENDING_BED_ASSIGNMENT') return true;
    return false;
  };

  const showReceptionTab = ['RECEPTIONIST', 'NURSE', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);
  const showClinicalTab = ['DOCTOR', 'LAB_TECHNICIAN', 'PHARMACIST', 'NURSE', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);

  const dynamicTabs = [];
  if (showReceptionTab) dynamicTabs.push({ label: 'Reception & Triage Queue' });
  if (showClinicalTab) dynamicTabs.push({ label: 'Clinical In-Progress' });
  dynamicTabs.push({ label: 'Discharged & Closed' });

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={850} sx={{ letterSpacing: '-0.03em', background: 'linear-gradient(90deg, #1e2a78 0%, #3b5bdb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Patient Flow & Visits
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            Real-time visual tracker & flow manager with automatic 17-state orchestration engine
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Force Refresh">
            <IconButton onClick={() => fetchVisits()} sx={{ bgcolor: 'rgba(59,91,219,0.06)', color: '#3b5bdb', '&:hover': { bgcolor: 'rgba(59,91,219,0.12)' }, border: '1px solid rgba(59,91,219,0.1)' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenCheckin(true)}
            sx={{
              background: 'linear-gradient(135deg, #3b5bdb 0%, #1e2d80 100%)',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.88rem',
              boxShadow: '0 4px 18px rgba(59,91,219,0.25)',
              textTransform: 'none',
              px: 2.5,
              py: 1,
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 22px rgba(59,91,219,0.3)',
              },
              transition: 'all 0.2s',
            }}
          >
            Check-In Patient
          </Button>
        </Stack>
      </Box>

      {/* Summary KPIs */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { label: 'Total Visits Today', value: visits.filter(v => new Date(v.createdAt).toDateString() === new Date().toDateString()).length, color: '#3b5bdb', icon: <Group /> },
          { label: 'Awaiting Payment', value: visits.filter(v => v.status === 'AWAITING_PAYMENT').length, color: '#f59e0b', icon: <Payment /> },
          { label: 'In Triage & Consult', value: visits.filter(v => ['IN_TRIAGE', 'IN_CONSULTATION', 'WAITING_TRIAGE', 'WAITING_CONSULTATION'].includes(v.status)).length, color: '#8b5cf6', icon: <HourglassEmpty /> },
          { label: 'Delayed (>45 mins)', value: visits.filter(v => !['CLOSED', 'DISCHARGED', 'Completed'].includes(v.status) && (Date.now() - new Date(v.createdAt).getTime() > 45 * 60 * 1000)).length, color: '#ef4444', icon: <Warning /> },
        ].map(kpi => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <Card
              sx={{
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '5px',
                  bgcolor: kpi.color,
                },
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 12px 35px rgba(0,0,0,0.05)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <CardContent sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {kpi.label}
                  </Typography>
                  <Typography variant="h3" fontWeight={850} sx={{ color: '#1e293b', mt: 0.5, lineHeight: 1 }}>
                    {kpi.value}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: `${kpi.color}15`, color: kpi.color, width: 44, height: 44 }}>
                  {kpi.icon}
                </Avatar>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root': {
              borderRadius: '20px',
              px: 3,
              py: 0.8,
              mr: 1.5,
              minHeight: '38px',
              textTransform: 'none',
              fontWeight: 700,
              color: 'text.secondary',
              transition: 'all 0.2s',
              '&.Mui-selected': {
                bgcolor: '#3b5bdb',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(59,91,219,0.22)',
              },
              '&:hover:not(.Mui-selected)': {
                bgcolor: 'rgba(59,91,219,0.06)',
                color: '#1e2a78',
              }
            }
          }}
        >
          {dynamicTabs.map((tab, i) => (
            <Tab key={i} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {/* Visits Table */}
      <Card sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', overflow: 'hidden', background: '#fff' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, gap: 2 }}>
            <CircularProgress size={36} thickness={4.5} />
            <Typography variant="body2" color="text.secondary" fontWeight={600}>Loading queue metrics…</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.015)', borderBottom: '1.5px solid rgba(0,0,0,0.06)' }}>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary', py: 2 }}>Visit Number</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>MRN ID</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Patient details</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Checked In</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Wait Time</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Workflow State</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visits.map(v => (
                  <TableRow key={v.id} hover sx={{ '&:hover': { bgcolor: 'rgba(59,91,219,0.015)' }, '& td': { py: 1.6 } }}>
                    <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem', color: '#1e293b' }}>
                      {v.visitNumber}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 600 }}>
                      {v.patient?.patientNumber}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {v.patient?.firstName} {v.patient?.lastName}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={v.visitType}
                        size="small"
                        sx={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          bgcolor: 'rgba(59,91,219,0.08)',
                          color: '#3b5bdb',
                          borderRadius: '6px',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 550 }}>
                      {new Date(v.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const info = getWaitTimeInfo(v.createdAt, v.status);
                        return (
                          <Tooltip title={isClosed(v) ? 'Session closed' : `Total elapsed wait time: ${info.label}`} arrow>
                            <Chip
                              icon={info.pulsing ? <Warning sx={{ fontSize: '12px !important', color: 'inherit', animation: 'pulse 1.5s infinite', '@keyframes pulse': { '0%': { opacity: 0.4 }, '50%': { opacity: 1 }, '100%': { opacity: 0.4 } } }} /> : undefined}
                              label={info.label}
                              size="small"
                              sx={{
                                bgcolor: info.bg,
                                color: info.color,
                                border: `1.5px solid ${info.color}35`,
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                borderRadius: '8px',
                                px: 0.5,
                              }}
                            />
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell><StatusChip status={v.status} /></TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View Timeline" arrow>
                          <IconButton size="small" onClick={() => handleViewSummary(v)} sx={{ color: '#0284c7', bgcolor: 'rgba(2,132,199,0.08)', '&:hover': { bgcolor: 'rgba(2,132,199,0.15)' } }}>
                            <Timeline sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Open Clinical Desk" arrow>
                          <IconButton size="small" onClick={() => navigate(getWorkstationPath(v.visitType))} sx={{ color: '#d97706', bgcolor: 'rgba(217,119,6,0.08)', '&:hover': { bgcolor: 'rgba(217,119,6,0.15)' } }}>
                            <MedicalServices sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        {!isClosed(v) && (
                          <>
                            {!['CLOSED', 'DISCHARGED', 'Completed'].includes(v.status) && (
                              <Tooltip title="Advance Journey" arrow>
                                <IconButton size="small" onClick={() => handleAdvanceClick(v)} sx={{ color: '#4f46e5', bgcolor: 'rgba(79,70,229,0.08)', '&:hover': { bgcolor: 'rgba(79,70,229,0.15)' } }}>
                                  <ArrowForward sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canAdmitPatient(v) && (
                              <Tooltip title="Process Admission Order (Inpatient File & Deposit Clearance)" arrow>
                                <IconButton size="small" onClick={() => handleOpenAdmitDialog(v)} sx={{ color: '#7c3aed', bgcolor: 'rgba(124,58,237,0.08)', '&:hover': { bgcolor: 'rgba(124,58,237,0.15)' } }}>
                                  <AssignmentTurnedIn sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {isAdmitted(v) ? (
                              <Tooltip title="Discharge Patient" arrow>
                                <IconButton size="small" onClick={() => { setOpenDischarge(true); setDischargeVisit(v); }} sx={{ color: '#dc2626', bgcolor: 'rgba(220,38,38,0.08)', '&:hover': { bgcolor: 'rgba(220,38,38,0.15)' } }}>
                                  <ExitToApp sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Close Session" arrow>
                                <IconButton size="small" onClick={() => handleCloseVisit(v)} sx={{ color: '#16a34a', bgcolor: 'rgba(22,163,74,0.08)', '&:hover': { bgcolor: 'rgba(22,163,74,0.15)' } }}>
                                  <CheckCircle sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {visits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8, color: 'text.secondary', fontWeight: 600 }}>
                      No patients in this queue.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {totalPages > 1 && !loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2.5, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={(_e, val) => setPage(val)} 
              color="primary" 
              sx={{ '& .MuiPaginationItem-root': { fontWeight: 700 } }}
            />
          </Box>
        )}
      </Card>

      {/* Patient check-in Dialog */}
      <Dialog 
        open={openCheckin} 
        onClose={() => setOpenCheckin(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 2,
            boxShadow: '0 24px 50px -12px rgba(30,42,120,0.15)',
            border: '1px solid rgba(0,0,0,0.06)',
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 850, pb: 1, fontSize: '1.4rem', color: '#1e2a78', letterSpacing: '-0.02em' }}>
          Patient Flow Check-In
        </DialogTitle>
        <form onSubmit={handleCheckinSubmit}>
          <DialogContent sx={{ py: 1 }}>
            <Stack spacing={2.5}>
              <Box sx={{ 
                p: 2, 
                borderRadius: '16px', 
                bgcolor: 'rgba(59, 91, 219, 0.05)', 
                border: '1.5px solid rgba(59, 91, 219, 0.1)',
                mb: 0.5
              }}>
                <Typography variant="caption" sx={{ color: '#3b5bdb', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Patient Context Details
                </Typography>
                <Typography variant="body1" fontWeight={800} sx={{ mt: 0.5, color: '#1e293b' }}>
                  {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'No patient selected'}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                  MPI ID: {selectedPatient?.mrn ?? 'Enter details below'}
                </Typography>
              </Box>

              <Autocomplete
                options={patientOptions}
                getOptionLabel={o => `${o.mrn} — ${o.lastName}, ${o.firstName}`}
                loading={loadingSearch}
                onInputChange={(_, val) => handlePatientSearch(val)}
                onChange={(_, val) => setSelectedPatient(val)}
                value={selectedPatient}
                renderInput={params => (
                  <TextField {...params} label="Search Patient Name/MRN" required
                    InputProps={{ ...params.InputProps, endAdornment: <>{loadingSearch ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</> }}
                  />
                )}
              />

              <FormControl fullWidth>
                <InputLabel>Visit Category</InputLabel>
                <Select value={visitType} label="Visit Category" onChange={e => {
                  const vt = e.target.value;
                  setVisitType(vt);
                  if (vt === 'LABOUR_DELIVERY') setTriagePriority(2);
                  if (['MATERNITY', 'LABOUR_DELIVERY', 'EMERGENCY', 'INPATIENT', 'PAEDIATRIC'].includes(vt)) {
                    setSelectedServiceId('');
                  }
                }}>
                  {VISIT_TYPES.map(vt => <MenuItem key={vt.value} value={vt.value}>{vt.label}</MenuItem>)}
                </Select>
              </FormControl>

              {visitType === 'LABOUR_DELIVERY' && (
                <Alert severity="error" sx={{ borderRadius: '12px', fontWeight: 600 }}>
                  <strong>⚡ Active Labour / Emergency Intake:</strong> Patient will be routed directly to the Labour & Delivery Ward for immediate Midwife intake & Partograph.
                </Alert>
              )}

              {visitType === 'MATERNITY' && (
                <Alert severity="info" sx={{ borderRadius: '12px', fontWeight: 600 }}>
                  <strong>🛌 Pre-Labour / Antenatal Admission:</strong> Patient will be routed to the Maternity & Antenatal Ward for pre-delivery observation or scheduled procedure.
                </Alert>
              )}

              {visitType === 'PHYSIO' && (
                <Alert severity="info" sx={{ borderRadius: '12px', fontWeight: 600, bgcolor: 'rgba(6,182,212,0.1)', color: '#0e7490', border: '1px solid rgba(6,182,212,0.25)' }}>
                  <strong>🏃 Physiotherapy & Rehabilitation:</strong> Patient will be routed directly to the Physiotherapy Suite for package credit allocation, SOAP evaluation, Rehabilitation Exercise Analysis System, and daily exercise treatment.
                </Alert>
              )}

              {/* Physiotherapy Session Wallet & Package Credit Gate */}
              {isPhysioCheckin && selectedPatient && (
                <Box>
                  {loadingPhysioWallet ? (
                    <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(6,182,212,0.05)', borderRadius: '14px' }}>
                      <CircularProgress size={20} sx={{ mr: 1, verticalAlign: 'middle', color: '#0284c7' }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Checking patient Physiotherapy Session Wallet…
                      </Typography>
                    </Box>
                  ) : physioWallet && physioWallet.sessionsRemaining > 0 ? (
                    <Card variant="outlined" sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(16,185,129,0.06)', borderColor: '#10b981' }}>
                      <Typography variant="subtitle2" fontWeight={800} color="#059669" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        🎟️ Active Physiotherapy Session Credit Found ({physioWallet.sessionsRemaining} Sessions Remaining)
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        Plan: <strong>{physioWallet.packageName}</strong> • Prescribed: <strong>{physioWallet.totalSessionsPrescribed}</strong> • Completed: <strong>{physioWallet.sessionsCompleted}</strong> • Remaining Balance: <strong style={{ color: '#059669', fontSize: '0.9rem' }}>{physioWallet.sessionsRemaining} session(s)</strong>
                      </Typography>
                      <Typography variant="caption" color="#047857" fontWeight={700} display="block" sx={{ mt: 0.8 }}>
                        ✓ No extra consultation ticket charge required. Check-in directly grants access to the Physiotherapy module and deducts 1 session upon completion.
                      </Typography>
                    </Card>
                  ) : (
                    <Card variant="outlined" sx={{ p: 2.2, borderRadius: '16px', bgcolor: 'rgba(2,132,199,0.04)', borderColor: '#0284c7' }}>
                      <Typography variant="subtitle2" fontWeight={800} color="#0284c7" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        💳 Purchase / Top-Up Physiotherapy Session Wallet
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                        Patient has 0 prepaid sessions remaining. Select rehabilitation package or number of sessions to issue billing invoice and grant session access:
                      </Typography>
                      <Grid container spacing={1.8}>
                        <Grid item xs={12} sm={8}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Rehab Treatment Package</InputLabel>
                            <Select
                              value={physioPackageType}
                              label="Rehab Treatment Package"
                              onChange={e => {
                                const val = e.target.value;
                                setPhysioPackageType(val);
                                if (val === 'SINGLE') setPhysioSessionCount(1);
                                else if (val === 'ACUTE_5') setPhysioSessionCount(5);
                                else if (val === 'COMP_10') setPhysioSessionCount(10);
                                else if (val === 'ORTHO_15') setPhysioSessionCount(15);
                                else if (val === 'NEURO_20') setPhysioSessionCount(20);
                              }}
                            >
                              <MenuItem value="SINGLE">1 Single Treatment Session (₦7,000)</MenuItem>
                              <MenuItem value="ACUTE_5">5 Sessions Acute Rehabilitation Pack (₦30,000)</MenuItem>
                              <MenuItem value="COMP_10">10 Sessions Comprehensive Recovery Pack (₦55,000)</MenuItem>
                              <MenuItem value="ORTHO_15">15 Sessions Orthopaedic & Trauma Pack (₦75,000)</MenuItem>
                              <MenuItem value="NEURO_20">20 Sessions Neurological / Stroke Track (₦95,000)</MenuItem>
                              <MenuItem value="CUSTOM">Custom Number of Sessions (₦5,500/session)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            type="number"
                            label="Total Sessions"
                            size="small"
                            fullWidth
                            value={physioSessionCount}
                            onChange={e => setPhysioSessionCount(Math.max(1, Number(e.target.value) || 1))}
                            inputProps={{ min: 1, max: 100 }}
                            disabled={physioPackageType !== 'CUSTOM'}
                          />
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 1.5, p: 1.2, borderRadius: '10px', bgcolor: '#fff', border: '1px solid rgba(2,132,199,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                          Total Amount Payable:
                        </Typography>
                        <Chip
                          label={`₦${(
                            physioPackageType === 'SINGLE' ? 7000 :
                            physioPackageType === 'ACUTE_5' ? 30000 :
                            physioPackageType === 'COMP_10' ? 55000 :
                            physioPackageType === 'ORTHO_15' ? 75000 :
                            physioPackageType === 'NEURO_20' ? 95000 :
                            physioSessionCount * 5500
                          ).toLocaleString()}`}
                          color="primary"
                          sx={{ fontWeight: 850, fontSize: '0.85rem' }}
                        />
                      </Box>
                    </Card>
                  )}
                </Box>
              )}

              {/* Consultation Service Item - Only for Outpatient / Clinic Visit Types */}
              {!['MATERNITY', 'LABOUR_DELIVERY', 'EMERGENCY', 'INPATIENT', 'PAEDIATRIC'].includes(visitType) && !isPhysioCheckin ? (
                <>
                  <FormControl fullWidth>
                    <InputLabel>Consultation Service Item</InputLabel>
                    <Select value={selectedServiceId} label="Consultation Service Item" onChange={e => setSelectedServiceId(e.target.value)}>
                      <MenuItem value=""><em>None / Free Consultation</em></MenuItem>
                      {consultationServices.map(svc => (
                        <MenuItem key={svc.id} value={svc.id}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span>{svc.name}</span>
                            <Chip label={`₦${svc.price.toLocaleString()}`} size="small" color="success" sx={{ ml: 1, fontWeight: 700, borderRadius: '6px' }} />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedService && (
                    <Alert severity="info" sx={{ borderRadius: '12px', fontWeight: 600 }}>
                      <strong>{selectedService.name}</strong> — ₦{selectedService.price.toLocaleString()} ({selectedService.duration} min duration).
                    </Alert>
                  )}
                </>
              ) : null}

              <FormControl fullWidth>
                <InputLabel>Triage Priority Rank</InputLabel>
                <Select
                  value={triagePriority}
                  label="Triage Priority Rank"
                  onChange={e => setTriagePriority(Number(e.target.value))}
                >
                  <MenuItem value={0}>Routine / Normal</MenuItem>
                  <MenuItem value={1}>Priority / Urgent</MenuItem>
                  <MenuItem value={2}>Emergency / STAT</MenuItem>
                </Select>
              </FormControl>

            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, display: 'flex', gap: 1.5, mt: 1 }}>
            <Button 
              onClick={() => setOpenCheckin(false)} 
              sx={{ 
                textTransform: 'none', 
                fontWeight: 700, 
                color: 'text.secondary',
                fontSize: '0.88rem'
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={!selectedPatient}
              sx={{ 
                bgcolor: '#3b5bdb', 
                '&:hover': { bgcolor: '#1e2d80' }, 
                textTransform: 'none', 
                fontWeight: 700, 
                borderRadius: '10px',
                px: 3.5,
                fontSize: '0.88rem'
              }}
            >
              Complete Check-In
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Advance Workflow Dialog */}
      <Dialog 
        open={openAdvance} 
        onClose={() => setOpenAdvance(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Advance Journey step</DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Stack spacing={2}>
            <Alert severity="info" sx={{ borderRadius: '12px', fontWeight: 550 }}>
              This will transition <strong>{advanceVisit?.patient?.firstName} {advanceVisit?.patient?.lastName}</strong> to the next outpatient flow state.
            </Alert>
            <TextField
              label="Transition Notes (optional)"
              multiline
              rows={2}
              fullWidth
              value={advanceNotes}
              onChange={e => setAdvanceNotes(e.target.value)}
              placeholder="Record any details about this transition…"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAdvance(false)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={advancing ? <CircularProgress size={16} /> : <ArrowForward />}
            onClick={handleAdvanceConfirm}
            disabled={advancing}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: '#3b5bdb' }}
          >
            Advance
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bed Allocation Admit Dialog */}
      <Dialog 
        open={openAdmit} 
        onClose={() => setOpenAdmit(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: '12px', bgcolor: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex' }}>
            <Bed />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2}>Admit Patient to Hospital Ward</Typography>
            <Typography variant="caption" color="text.secondary">Assign ward and bed allocation for inpatient care</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleAdmitSubmit}>
          <DialogContent sx={{ py: 1 }}>
            <Stack spacing={2.5}>
              {/* Patient Banner */}
              {admitVisit && (
                <Card variant="outlined" sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(248,250,252,0.8)', borderColor: 'rgba(0,0,0,0.08)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                        {admitVisit.patient?.firstName} {admitVisit.patient?.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        MRN: <strong>{(admitVisit.patient as any)?.patientNumber || (admitVisit.patient as any)?.mrn || admitVisit.patient?.id}</strong> • Gender: {(admitVisit.patient as any)?.gender || 'N/A'} • Age: <strong>{getPatientAgeYears(admitVisit.patient)} years</strong>
                      </Typography>
                    </Box>
                    <Chip label={admitVisit.visitType} size="small" color="primary" sx={{ fontWeight: 700, borderRadius: '8px' }} />
                  </Box>
                </Card>
              )}

              {/* Obstetric Intake Destination Selector for Maternity / ANC / Labour Visits */}
              {admitVisit && (['MATERNITY', 'ANC', 'LABOUR_DELIVERY'].includes(admitVisit.visitType) || (admitVisit.patient as any)?.gender?.toUpperCase() === 'FEMALE') && (
                <Card variant="outlined" sx={{ p: 2, borderRadius: '16px', borderColor: '#7c3aed', bgcolor: 'rgba(124,58,237,0.03)' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#7c3aed" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    🤰 Obstetric Inpatient Routing Guidance
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    Select destination based on patient clinical presentation:
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Paper 
                        variant="outlined" 
                        onClick={() => {
                          const lWard = wards.find(w => (w.wardCategory || '').toUpperCase() === 'LABOUR' || (w.name || '').toLowerCase().includes('labour') || (w.name || '').toLowerCase().includes('delivery'));
                          if (lWard) {
                            setSelectedWardId(lWard.id);
                            const availB = lWard.beds.find(b => b.status === 'AVAILABLE');
                            if (availB) setSelectedBedId(availB.id);
                          }
                        }}
                        sx={{ 
                          p: 1.5, 
                          borderRadius: '12px', 
                          cursor: 'pointer', 
                          border: '2px solid',
                          borderColor: wards.find(w => w.id === selectedWardId)?.wardCategory === 'LABOUR' || wards.find(w => w.id === selectedWardId)?.name?.toLowerCase().includes('labour') ? '#d32f2f' : 'rgba(0,0,0,0.1)',
                          bgcolor: wards.find(w => w.id === selectedWardId)?.wardCategory === 'LABOUR' || wards.find(w => w.id === selectedWardId)?.name?.toLowerCase().includes('labour') ? 'rgba(211,47,47,0.06)' : '#fff',
                          '&:hover': { bgcolor: 'rgba(211,47,47,0.08)' }
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={800} color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          ⚡ Labour & Delivery Ward
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Path A: Active Labour / Emergency</strong><br/>
                          In pain, water broken (SROM), bleeding. Goes straight to Labour Room for Partograph.
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper 
                        variant="outlined"
                        onClick={() => {
                          const mWard = wards.find(w => (w.wardCategory || '').toUpperCase() === 'MATERNITY' || (w.name || '').toLowerCase().includes('maternity') || (w.name || '').toLowerCase().includes('antenatal'));
                          if (mWard) {
                            setSelectedWardId(mWard.id);
                            const availB = mWard.beds.find(b => b.status === 'AVAILABLE');
                            if (availB) setSelectedBedId(availB.id);
                          }
                        }}
                        sx={{ 
                          p: 1.5, 
                          borderRadius: '12px', 
                          cursor: 'pointer', 
                          border: '2px solid',
                          borderColor: wards.find(w => w.id === selectedWardId)?.wardCategory === 'MATERNITY' || wards.find(w => w.id === selectedWardId)?.name?.toLowerCase().includes('maternity') ? '#7c3aed' : 'rgba(0,0,0,0.1)',
                          bgcolor: wards.find(w => w.id === selectedWardId)?.wardCategory === 'MATERNITY' || wards.find(w => w.id === selectedWardId)?.name?.toLowerCase().includes('maternity') ? 'rgba(124,58,237,0.06)' : '#fff',
                          '&:hover': { bgcolor: 'rgba(124,58,237,0.08)' }
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={800} color="#7c3aed" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          🛌 Antenatal / Maternity Ward
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Path B: Scheduled / Pre-Labour</strong><br/>
                          Not in active labour yet. Scheduled for C-Section, Induction, or pre-delivery observation.
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Card>
              )}

              {/* 1. Select Target Ward */}
              <FormControl fullWidth required>
                <InputLabel>Select Hospital Ward</InputLabel>
                <Select 
                  value={selectedWardId} 
                  label="Select Hospital Ward" 
                  onChange={e => {
                    const wId = e.target.value;
                    setSelectedWardId(wId);
                    const targetW = wards.find(w => w.id === wId);
                    const availB = targetW?.beds.find(b => b.status === 'AVAILABLE');
                    setSelectedBedId(availB ? availB.id : '');
                  }}
                >
                  {wards.map(w => {
                    const availCount = w.beds.filter(b => b.status === 'AVAILABLE').length;
                    return (
                      <MenuItem key={w.id} value={w.id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{w.name}</span>
                          <Chip 
                            label={`${availCount} Available`} 
                            size="small" 
                            color={availCount > 0 ? 'success' : 'default'} 
                            variant={availCount > 0 ? 'filled' : 'outlined'}
                            sx={{ ml: 1, fontWeight: 700, fontSize: '0.7rem' }} 
                          />
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              {/* 2. Select Bed / Room */}
              {(() => {
                const activeWard = wards.find(w => w.id === selectedWardId);
                const activeBeds = activeWard?.beds || [];
                const availBeds = activeBeds.filter(b => b.status === 'AVAILABLE');

                const isPaediatric = activeWard?.wardCategory === 'PAEDIATRIC' || 
                                    activeWard?.name?.toLowerCase().includes('paediatric') || 
                                    activeWard?.name?.toLowerCase().includes('pediatric');
                const age = getPatientAgeYears(admitVisit?.patient);
                const isTooOld = isPaediatric && age > 18;

                return (
                  <>
                    <FormControl fullWidth required disabled={!selectedWardId || availBeds.length === 0}>
                      <InputLabel>Select Available Ward Bed / Room</InputLabel>
                      <Select 
                        value={selectedBedId} 
                        label="Select Available Ward Bed / Room" 
                        onChange={e => setSelectedBedId(e.target.value)}
                      >
                        {activeBeds.map(b => (
                          <MenuItem key={b.id} value={b.id} disabled={b.status !== 'AVAILABLE'}>
                            {b.number} — {b.status === 'AVAILABLE' ? 'Available' : 'Occupied'}
                          </MenuItem>
                        ))}
                      </Select>
                      {availBeds.length === 0 && (
                        <FormHelperText error>No available beds in this ward. Please select another ward.</FormHelperText>
                      )}
                    </FormControl>

                    {/* Age Eligibility Feedback */}
                    {isTooOld && (
                      <Alert severity="error" sx={{ borderRadius: 3 }}>
                        <strong>Age Restriction Alert:</strong> Paediatric Ward is reserved for children and adolescents (Age 0–18 years). Patient <strong>{admitVisit?.patient?.firstName} {admitVisit?.patient?.lastName}</strong> is <strong>{age} years old</strong>. Please select an adult ward (General, Surgical, Private, or Emergency).
                      </Alert>
                    )}

                    {isPaediatric && !isTooOld && (
                      <Alert severity="success" sx={{ borderRadius: 3 }}>
                        <strong>Pediatric Ward Matched:</strong> Patient <strong>{admitVisit?.patient?.firstName} {admitVisit?.patient?.lastName}</strong> (Age {age}) is eligible for admission to the Paediatric Ward.
                      </Alert>
                    )}

                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block" align="center" sx={{ mb: 1, fontStyle: 'italic' }}>
                        📋 Records handles administrative registration link; Ward Sister/Matron completes physical bed allotment.
                      </Typography>
                      <DialogActions sx={{ px: 0, pt: 0, display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                        <Button onClick={() => setOpenAdmit(false)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
                        <Button 
                          type="submit" 
                          variant="contained" 
                          disabled={!selectedBedId || isTooOld} 
                          sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '12px', bgcolor: isTooOld ? 'text.disabled' : '#7c3aed', px: 3 }}
                        >
                          ⚡ Finalize Inpatient Registration
                        </Button>
                      </DialogActions>
                    </Box>
                  </>
                );
              })()}
            </Stack>
          </DialogContent>
        </form>
      </Dialog>

      {/* Discharge Dialog */}
      <Dialog 
        open={openDischarge} 
        onClose={() => setOpenDischarge(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Discharge Patient</DialogTitle>
        <form onSubmit={handleDischargeSubmit}>
          <DialogContent sx={{ py: 1 }}>
            <Stack spacing={2.5}>
              <Typography variant="body2" color="text.secondary">Record the discharge summary and free the allocated bed.</Typography>
              <TextField label="Discharge Summary & Instructions" required multiline rows={3} fullWidth value={dischargeReason} onChange={e => setDischargeReason(e.target.value)} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenDischarge(false)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
            <Button type="submit" variant="contained" color="error" disabled={!dischargeReason} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Discharge</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Visit Summary Timeline Dialog */}
      <Dialog 
        open={openSummary} 
        onClose={() => setOpenSummary(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px', p: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 850, fontSize: '1.4rem', color: '#1e2a78' }}>
          Visit Journey Timeline
          {summaryVisit && (
            <Typography variant="body2" color="text.secondary" fontWeight={600} mt={0.5}>
              {summaryVisit.visitNumber} — {summaryVisit.patient?.firstName} {summaryVisit.patient?.lastName}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          {loadingSummary ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : (
            <Grid container spacing={3}>
              {/* Left: Stepper timeline */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={2}>
                  Workflow Progress Steps
                </Typography>
                {workflowDetail?.template?.steps ? (
                  <Box sx={{ pl: 1 }}>
                    {workflowDetail.template.steps.map((step: any) => {
                      const completedStepsRaw = workflowDetail.state?.completedSteps || [];
                      const parsedSteps = typeof completedStepsRaw === 'string' ? JSON.parse(completedStepsRaw) : completedStepsRaw;
                      const completedArray = Array.isArray(parsedSteps) ? parsedSteps : [];
                      const isClosed = workflowDetail.state?.currentStatus === 'CLOSED';
                      const isCompleted = completedArray.some((cs: any) => cs.stepOrder === step.stepOrder) || (isClosed && step.stepOrder === workflowDetail.template?.steps?.length);
                      const isCurrent = step.stepOrder === workflowDetail.state?.currentStepOrder && !isClosed;
                      const completedEntry = completedArray.find((cs: any) => cs.stepOrder === step.stepOrder);
                      return (
                        <Box key={step.id} sx={{ display: 'flex', gap: 2, mb: 1.8 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Avatar sx={{
                              width: 28, height: 28, fontSize: '0.72rem', fontWeight: 800,
                              bgcolor: isCompleted ? '#10b981' : isCurrent ? '#3b5bdb' : 'rgba(0,0,0,0.04)',
                              color: isCompleted || isCurrent ? '#fff' : 'text.secondary',
                            }}>
                              {isCompleted ? '✓' : step.stepOrder}
                            </Avatar>
                            {step.stepOrder < workflowDetail.template.steps.length && (
                              <Box sx={{ width: '2px', height: '24px', bgcolor: isCompleted ? '#10b98150' : 'rgba(0,0,0,0.06)', mt: 0.5 }} />
                            )}
                          </Box>
                          <Box sx={{ pt: 0.2 }}>
                            <Typography variant="body2" fontWeight={isCurrent ? 800 : 700} color={isCurrent ? '#3b5bdb' : isCompleted ? '#10b981' : 'text.primary'}>
                              {step.label}
                            </Typography>
                            {completedEntry ? (
                              <Typography variant="caption" color="text.secondary" fontWeight={550}>
                                ✓ {new Date(completedEntry.completedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {completedEntry.completedBy !== 'System' ? ` by ${completedEntry.completedBy}` : ''}
                              </Typography>
                            ) : (isClosed && step.stepOrder === workflowDetail.template?.steps?.length) ? (
                              <Typography variant="caption" color="text.secondary" fontWeight={550}>
                                ✓ {new Date(workflowDetail.state?.updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            ) : null}
                            <Box sx={{ mt: 0.3, display: 'flex', gap: 0.5 }}>
                              {isCurrent && <Chip label="Active Position" size="small" color="primary" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }} />}
                              {step.isBillingGate && <Chip label="Billing Gate" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#fef3c7', color: '#92400e' }} />}
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: '12px' }}>No workflow template assigned to this visit.</Alert>
                )}
              </Grid>

              {/* Right: Encounter timeline */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={2}>
                  Encounter Logs
                </Typography>
                <Stack spacing={1.5}>
                  {summaryData?.encounters?.map((e: any) => (
                    <Paper key={e.id} variant="outlined" sx={{ p: 1.5, borderRadius: '14px', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <Typography variant="body2" fontWeight={800}>{e.type}</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={550}>
                        {e.staff ? `Dr. ${e.staff.firstName} ${e.staff.lastName}` : 'System Agent'} · {e.status}
                      </Typography>
                    </Paper>
                  ))}
                  {!summaryData?.encounters?.length && (
                    <Typography variant="caption" color="text.secondary" fontWeight={550}>No encounters recorded yet.</Typography>
                  )}
                </Stack>

                {summaryData?.vitals?.length > 0 && (
                  <>
                    <Divider sx={{ my: 2.5, borderColor: 'rgba(0,0,0,0.06)' }} />
                    <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1.5}>
                      Vitals Recorded
                    </Typography>
                    <Grid container spacing={1}>
                      {summaryData.vitals.map((v: any) => (
                        <Grid item xs={6} key={v.id}>
                          <Paper variant="outlined" sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(0,0,0,0.01)', border: '1px solid rgba(0,0,0,0.04)' }}>
                            <Typography variant="caption" color="text.secondary" display="block">{v.display}</Typography>
                            <Typography variant="body2" fontWeight={750}>{v.valueString || v.valueQuantity?.value}</Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', gap: 1.5 }}>
          <Button onClick={() => setOpenSummary(false)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>
            Close
          </Button>
          {summaryVisit && !isClosed(summaryVisit) && (
            <Button variant="contained" startIcon={<ArrowForward />} onClick={() => { setOpenSummary(false); handleAdvanceClick(summaryVisit); }} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: '#3b5bdb' }}>
              Advance Workflow
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Visits;
