import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip, Divider,
  IconButton, CardHeader, Autocomplete, Stack, FormControlLabel, Checkbox, CircularProgress,
  List, ListItem, ListItemText, Tabs, Tab
} from '@mui/material';
import {
  Healing, Add, CheckCircle, Warning, Edit, Delete, EventNote,
  ChildCare, People, History, HelpOutline, PregnantWoman, LocalHospital,
  Print, Save, Close, Assignment, Science, LocalPharmacy, PersonAdd
} from '@mui/icons-material';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { QuickAppointmentModal } from '../components/QuickAppointmentModal';
import { QuickExternalRegisterModal } from '../components/QuickExternalRegisterModal';
import { ANC_TEMPLATES } from '../services/ancTemplates';
import { AncCardPrintTemplate } from '../components/AncCardPrintTemplate';

const axios = {
  get: (url: string, config?: any) => api.get(url.startsWith('/api') ? url.substring(4) : url, config),
  post: (url: string, data?: any, config?: any) => api.post(url.startsWith('/api') ? url.substring(4) : url, data, config),
  put: (url: string, data?: any, config?: any) => api.put(url.startsWith('/api') ? url.substring(4) : url, data, config),
  delete: (url: string, config?: any) => api.delete(url.startsWith('/api') ? url.substring(4) : url, config),
};

const DOSE_OPTIONS = ['1 tab', '2 tabs', '1 cap', '5 ml', '10 ml', '1 injection', 'Apply locally'];
const FREQ_OPTIONS = ['Daily', 'BD', 'TDS', 'QDS', 'PRN', 'Stat', 'Weekly'];
const DURATION_OPTIONS = ['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '30 Days', '60 Days', '90 Days', '120 Days', '150 Days', '180 Days', 'Single Dose'];

const PRIMARY = '#3b5bdb';
const SUCCESS = '#2b8a3e';
const WARNING = '#e67700';
const DANGER = '#c92a2a';
const LIGHT_BG = '#f8f9fa';

const VISIT_STATUS_LABELS: Record<string, string> = {
  REGISTERED: 'Registered',
  AWAITING_PAYMENT: 'ANC Fee Payment',
  PAYMENT_CONFIRMED: 'Payment Confirmed',
  IN_TRIAGE: 'ANC Vitals / Nursing',
  IN_CONSULTATION: 'Doctor / Midwife Consultation',
  AWAITING_INVESTIGATION: 'ANC Laboratory',
  WAITING_PHARMACY: 'Pharmacy / Supplements',
  CLOSED: 'Closed — Next ANC Visit Booked',
};

const AncWorkspace = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  
  // Navigation Tabs state
  const [activeReportTab, setActiveReportTab] = useState(0);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // General States
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [maternityProfile, setMaternityProfile] = useState<any>(null);
  const [activePregnancy, setActivePregnancy] = useState<any>(null);
  const [currentVisitId, setCurrentVisitId] = useState('');
  const [currentVisitStatus, setCurrentVisitStatus] = useState('');
  const [visitQueue, setVisitQueue] = useState<any[]>([]);
  const [pastQueue, setPastQueue] = useState<any[]>([]);

  // Dialog States
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [pregnancyDialogOpen, setPregnancyDialogOpen] = useState(false);
  const [visitLogDialogOpen, setVisitLogDialogOpen] = useState(false);
  const [scanReportDialogOpen, setScanReportDialogOpen] = useState(false);
  const [complicationDialogOpen, setComplicationDialogOpen] = useState(false);
  const [deathDialogOpen, setDeathDialogOpen] = useState(false);
  const [printCardDialogOpen, setPrintCardDialogOpen] = useState(false);
  const [editingVisitLog, setEditingVisitLog] = useState<any>(null);
  const [editingScanReport, setEditingScanReport] = useState<any>(null);
  const [editingComplication, setEditingComplication] = useState<any>(null);
  const [openApptModal, setOpenApptModal] = useState(false);
  const [openExternalModal, setOpenExternalModal] = useState(false);
  const [endCycleDialogOpen, setEndCycleDialogOpen] = useState(false);
  const [endCycleOutcome, setEndCycleOutcome] = useState('DELIVERED');

  // CPOE Pad States
  const [labCatalog, setLabCatalog] = useState<any[]>([]);
  const [pharmacyCatalog, setPharmacyCatalog] = useState<any[]>([]);
  const [labCart, setLabCart] = useState<any[]>([]);
  const [presCart, setPresCart] = useState<any[]>([]);
  const [orderLogs, setOrderLogs] = useState<any[]>([]);
  const [presLogs, setPresLogs] = useState<any[]>([]);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState(0);

  // Edit Dialog States for Lab & Prescriptions
  const [selectedLabOrder, setSelectedLabOrder] = useState<any>(null);
  const [editLabPriority, setEditLabPriority] = useState('ROUTINE');
  const [editLabNotes, setEditLabNotes] = useState('');
  const [editLabDiagnosis, setEditLabDiagnosis] = useState('');
  const [editLabPaymentStatus, setEditLabPaymentStatus] = useState('UNPAID');

  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [editPresPriority, setEditPresPriority] = useState('ROUTINE');
  const [editPresNotes, setEditPresNotes] = useState('');
  const [editPresDiagnosis, setEditPresDiagnosis] = useState('');
  const [editPresPaymentStatus, setEditPresPaymentStatus] = useState('UNPAID');

  // Form Fields - Maternal Profile
  const [formGravidity, setFormGravidity] = useState(0);
  const [formParity, setFormParity] = useState(0);
  const [formAbortions, setFormAbortions] = useState(0);
  const [formHivStatus, setFormHivStatus] = useState('NEGATIVE');
  const [formPartnerPhone, setFormPartnerPhone] = useState('');
  const [formEmergencyPhone, setFormEmergencyPhone] = useState('');

  // Form Fields - Pregnancy Record
  const [lmpDate, setLmpDate] = useState('');
  const [eddDate, setEddDate] = useState('');
  const [gestationNum, setGestationNum] = useState(1);
  const [isHighRisk, setIsHighRisk] = useState(false);
  const [ancTemplate, setAncTemplate] = useState('Faith Foundation Replica Template');
  const [overduePregnancies, setOverduePregnancies] = useState<any[]>([]);
  const [patientPregnancies, setPatientPregnancies] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<string[]>([]);

  // Form Fields - Visit Log
  const [visitFundalHeight, setVisitFundalHeight] = useState('');
  const [visitFPresentation, setVisitFPresentation] = useState('Cephalic');
  const [visitFLie, setVisitFLie] = useState('Longitudinal');
  const [visitFhr, setVisitFhr] = useState(140);
  const [visitWeight, setVisitWeight] = useState('');
  const [visitBP, setVisitBP] = useState('');

  const [dashboardData, setDashboardData] = useState<any>({
    activePregnancies: 0,
    highRiskPregnancies: 0,
    deliveriesCount: 0,
    activePmtct: 0,
    wardBeds: { occupied: 0, total: 10 }
  });

  useEffect(() => {
    fetchPatients();
    fetchActiveQueue();
    fetchDashboardKPIs();
    fetchOverduePregnancies();

    // Fetch catalogs for CPOE
    axios.get('/api/lims/catalog').then(res => setLabCatalog(res.data || [])).catch(console.error);
    axios.get('/api/pharmacy/inventory').then(res => setPharmacyCatalog(res.data || [])).catch(console.error);

    // Fetch doctors for consultant dropdown
    axios.get('/api/hr/employees').then(res => {
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const docs = data.filter((e: any) => 
        e.role?.toLowerCase().includes('doctor') || 
        e.role?.toLowerCase().includes('consultant') ||
        e.role?.toLowerCase().includes('medical') ||
        e.role?.toLowerCase().includes('surgeon') ||
        e.role?.toLowerCase().includes('physician')
      ).map((e: any) => `Dr. ${e.firstName} ${e.lastName}`);
      setDoctorsList(docs);
    }).catch(console.error);
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await axios.get('/api/patients/mpi?limit=1000&gender=FEMALE');
      const list = res.data.data || [];
      setPatients(list.filter((p: any) => p.gender === 'FEMALE'));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClinicalOrdersHistory = async (patId: string) => {
    try {
      const [resLab, resPres] = await Promise.all([
        axios.get(`/api/lims/orders`, { params: { patientId: patId } }),
        axios.get(`/api/pharmacy/prescriptions`, { params: { patientId: patId } }),
      ]);
      setOrderLogs(Array.isArray(resLab.data) ? resLab.data : (resLab.data?.data || []));
      setPresLogs(Array.isArray(resPres.data) ? resPres.data : (resPres.data?.data || []));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActiveQueue = async () => {
    try {
      const resToday = await axios.get('/api/visits/events?serviceType=ANC');
      const resPast = await axios.get('/api/visits/events?serviceType=ANC&pastPending=true');
      setVisitQueue(Array.isArray(resToday.data) ? resToday.data : []);
      setPastQueue(Array.isArray(resPast.data) ? resPast.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardKPIs = async () => {
    try {
      const res = await axios.get('/api/maternity/analytics/dashboard');
      setDashboardData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch patient profile details once patient is selected
  const handleSelectPatient = async (p: any) => {
    setSelectedPatient(p);
    setPatientId(p.id);
    fetchMaternityProfile(p.id);
    fetchActivePregnancy(p.id, p);
    
    // Clear carts on selecting new patient
    setLabCart([]);
    setPresCart([]);

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

    // Fetch clinical order history
    fetchClinicalOrdersHistory(p.id);
  };

  const fetchMaternityProfile = async (pId: string) => {
    try {
      const res = await axios.get(`/api/maternity/profile/${pId}`);
      setMaternityProfile(res.data);
      if (res.data) {
        setFormGravidity(res.data.gravidity || 0);
        setFormParity(res.data.parity || 0);
        setFormAbortions(res.data.abortions || 0);
        setFormHivStatus(res.data.hivStatus || 'NEGATIVE');
        try {
          const custom = JSON.parse(res.data.customFields || '{}');
          setFormPartnerPhone(custom.partnerPhone || '');
        } catch {
          setFormPartnerPhone('');
        }
      }
    } catch (e) {
      setMaternityProfile(null);
    }
  };

  const fetchOverduePregnancies = async () => {
    try {
      const res = await axios.get('/api/maternity/pregnancies/active');
      const activePregnancies = res.data?.data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdue = activePregnancies.filter((p: any) => {
        const edd = new Date(p.eddDate);
        edd.setHours(0, 0, 0, 0);
        return today >= edd;
      });

      setOverduePregnancies(overdue);

      // Trigger alerts for all overdue pregnancies
      if (overdue.length > 0) {
        const alertsRes = await axios.get('/api/notifications/alerts');
        const existingAlerts = alertsRes.data?.data || [];
        
        for (const p of overdue) {
          if (!p.patient) continue;
          const patientName = `${p.patient.firstName} ${p.patient.lastName}`;
          const alertExists = existingAlerts.some((al: any) =>
            al.patientName === patientName && al.labParameter === 'EDD Overdue'
          );
          if (!alertExists) {
            await axios.post('/api/notifications/alerts', {
              patientName,
              labParameter: 'EDD Overdue',
              value: `Expected Delivery Date (${new Date(p.eddDate).toLocaleDateString()}) reached/passed.`,
              severity: 'CRITICAL',
              clinicianName: 'ANC Monitor System'
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch overdue pregnancies', e);
    }
  };

  const fetchActivePregnancy = async (pId: string, patientObj?: any) => {
    try {
      const res = await axios.get(`/api/maternity/patient/${pId}/pregnancies`);
      const pregnanciesList = res.data || [];
      setPatientPregnancies(pregnanciesList);
      
      const active = pregnanciesList.find((p: any) => p.status === 'ACTIVE');
      if (active) {
        // Parse ancTemplate from customFields JSON
        const custom = (() => {
          try { return JSON.parse(active.customFields || '{}'); } catch { return {}; }
        })();
        active.ancTemplate = custom.ancTemplate || 'Faith Foundation Replica Template';
        setAncTemplate(active.ancTemplate);
        setFormEmergencyPhone(custom.emergencyContactPhone || '');
      }
      setActivePregnancy(active || null);
    } catch (e) {
      setPatientPregnancies([]);
      setActivePregnancy(null);
    }
  };

  // Automatically calculate EDD when LMP is entered
  const handleLmpChange = (val: string) => {
    setLmpDate(val);
    if (val) {
      const lmp = new Date(val);
      const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
      setEddDate(edd.toISOString().slice(0, 10));
    } else {
      setEddDate('');
    }
  };

  // Save Maternal Profile
  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patientId) return;

    const data = new FormData(e.currentTarget);
    
    // Pull the static fields
    const payload: any = {
      patientId,
      gravidity: formGravidity,
      parity: formParity,
      abortions: formAbortions,
      livingChildren: Number(data.get('livingChildren')) || 0,
      bloodGroup: data.get('bloodGroup'),
      rhesusStatus: data.get('rhesusStatus'),
      hivStatus: formHivStatus,
      hepatitisBStatus: data.get('hepatitisB'),
      syphilisStatus: data.get('syphilis'),
      ttDoseCount: Number(data.get('ttDoseCount')) || 0,
      malariaStatus: 'NEGATIVE',
    };

    // Serialize custom fields based on template schema
    const custom: Record<string, any> = {};
    
    // Non-db medical history checklist and socio-demographics fields saved to customFields
    custom.sickleCellGenotype = data.get('sickleCellGenotype') || 'AA';
    custom.hepatitisC = data.get('hepatitisC') || 'NEGATIVE';
    custom.preExistingHypertension = data.get('preExistingHypertension') === 'on';
    custom.preExistingDiabetes = data.get('preExistingDiabetes') === 'on';
    custom.preExistingAsthma = data.get('preExistingAsthma') === 'on';
    custom.preExistingEpilepsy = data.get('preExistingEpilepsy') === 'on';
    custom.previousCesareanSection = data.get('previousCesareanSection') === 'on';
    custom.previousMyomectomy = data.get('previousMyomectomy') === 'on';
    custom.familyHistoryTwins = data.get('familyHistoryTwins') === 'on';
    custom.familyHistoryHypertension = data.get('familyHistoryHypertension') === 'on';
    custom.familyHistoryDiabetes = data.get('familyHistoryDiabetes') === 'on';
    custom.socialSmoking = data.get('socialSmoking') === 'on';
    custom.socialAlcohol = data.get('socialAlcohol') === 'on';
    custom.occupation = data.get('occupation') || '';
    custom.partnerName = data.get('partnerName') || '';
    custom.partnerPhone = data.get('partnerPhone') || '';

    const activeTemplate = ANC_TEMPLATES.find(t => t.name === ancTemplate);
    if (activeTemplate) {
      activeTemplate.profileFields.forEach(f => {
        const val = data.get(f.name);
        if (f.type === 'number') {
          custom[f.name] = val ? Number(val) : null;
        } else if (f.type === 'boolean') {
          custom[f.name] = data.get(f.name) === 'on';
        } else {
          custom[f.name] = val || '';
        }
      });
    }
    payload.customFields = JSON.stringify(custom);

    try {
      setLoading(true);
      await axios.post('/api/maternity/profile', payload);
      enqueueSnackbar('Maternal clinical profile saved successfully', { variant: 'success' });
      setProfileDialogOpen(false);
      fetchMaternityProfile(patientId);
      fetchDashboardKPIs();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to save maternal profile', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Register Pregnancy Record
  const handleSavePregnancy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patientId || !maternityProfile) return;

    const data = new FormData(e.currentTarget);
    const payload: any = {
      maternityProfileId: maternityProfile.id,
      patientId,
      lmpDate: lmpDate || null,
      eddDate: eddDate || null,
      gestationNumber: gestationNum,
      isHighRisk,
      riskFactors: data.get('riskFactors') || '',
      preferredPlaceOfDelivery: data.get('preferredPlaceOfDelivery') || '',
      bloodDonorPlanned: data.get('bloodDonorPlanned') || '',
      emergencyContactName: data.get('emergencyContactName') || '',
      emergencyContactPhone: data.get('emergencyContactPhone') || '',
      transportArrangements: data.get('transportArrangements') || '',
      birthCompanion: data.get('birthCompanion') || '',
      ancTemplate: ancTemplate,
    };

    // Serialize pregnancy custom fields
    const activeTemplate = ANC_TEMPLATES.find(t => t.name === ancTemplate);
    const custom: Record<string, any> = {
      ancTemplate,
      riskFactors: data.get('riskFactors') || '',
      preferredPlaceOfDelivery: data.get('preferredPlaceOfDelivery') || '',
      bloodDonorPlanned: data.get('bloodDonorPlanned') || '',
      emergencyContactName: data.get('emergencyContactName') || '',
      emergencyContactPhone: data.get('emergencyContactPhone') || '',
      transportArrangements: data.get('transportArrangements') || '',
      birthCompanion: data.get('birthCompanion') || '',
    };
    if (activeTemplate) {
      activeTemplate.pregnancyFields.forEach(f => {
        const val = data.get(f.name);
        if (f.type === 'number') {
          custom[f.name] = val ? Number(val) : null;
        } else if (f.type === 'boolean') {
          custom[f.name] = data.get(f.name) === 'on';
        } else {
          custom[f.name] = val || '';
        }
      });
    }
    payload.customFields = JSON.stringify(custom);
    payload.highRiskReason = (data.get('riskFactors') as string) || '';

    try {
      setLoading(true);
      if (activePregnancy?.id) {
        await axios.put(`/api/maternity/pregnancy/${activePregnancy.id}`, payload);
        enqueueSnackbar('Pregnancy record updated successfully', { variant: 'success' });
      } else {
        await axios.post('/api/maternity/register', payload);
        enqueueSnackbar('Pregnancy registered successfully', { variant: 'success' });
      }
      setPregnancyDialogOpen(false);
      fetchActivePregnancy(patientId);
      fetchDashboardKPIs();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to save pregnancy record', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEndPregnancyCycle = async () => {
    if (!activePregnancy) return;
    try {
      setLoading(true);
      await axios.post(`/api/maternity/pregnancy/${activePregnancy.id}/end`, { status: endCycleOutcome });
      enqueueSnackbar(`Pregnancy cycle closed as ${endCycleOutcome}`, { variant: 'success' });
      setEndCycleDialogOpen(false);
      fetchActivePregnancy(patientId);
      fetchDashboardKPIs();
      fetchOverduePregnancies();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to end pregnancy cycle', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditVisitLog = (log: any) => {
    setEditingVisitLog(log);
    setVisitFundalHeight(log.fundalHeight?.toString() || '');
    setVisitFhr(log.fetalHeartRate || 140);
    setVisitFLie(log.fetalLie || 'Longitudinal');
    setVisitFPresentation(log.fetalPresentation || 'Cephalic');
    setVisitBP(`${log.systolic || ''}/${log.diastolic || ''}`);
    setVisitWeight(log.weight?.toString() || '');
    setVisitLogDialogOpen(true);
  };

  const handleDeleteVisitLog = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this antenatal visit log?')) {
      try {
        setLoading(true);
        await axios.delete(`/api/maternity/visit/${id}`);
        enqueueSnackbar('ANC follow-up visit note deleted', { variant: 'success' });
        fetchActivePregnancy(patientId);
      } catch (error: any) {
        enqueueSnackbar(error.response?.data?.message || 'Failed to delete visit log', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  // Add ANC Visit Log
  const handleSaveVisitLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activePregnancy) return;

    const data = new FormData(e.currentTarget);
    const payload = {
      pregnancyId: activePregnancy.id,
      weight: visitWeight ? Number(visitWeight) : null,
      systolic: Number(visitBP.split('/')[0]) || null,
      diastolic: Number(visitBP.split('/')[1]) || null,
      urineProtein: data.get('protein') || '',
      urineGlucose: data.get('glucose') || '',
      fundalHeight: visitFundalHeight ? Number(visitFundalHeight) : null,
      fetalPresentation: visitFPresentation,
      fetalLie: visitFLie,
      fetalHeartRate: visitFhr ? Number(visitFhr) : null,
      fetalMovement: 'Normal',
      dangerSigns: data.get('dangerSigns') === 'on' ? 'Yes' : 'No',
      educationTopics: [
        data.get('nutrition') === 'on' && 'Nutrition',
        data.get('dangerSigns') === 'on' && 'Danger Signs',
        data.get('birthPrep') === 'on' && 'Birth Prep'
      ].filter(Boolean).join(', '),
      nextVisitDate: data.get('nextAppt') || null,
      gestationalWeeks: editingVisitLog ? editingVisitLog.gestationalWeeks : getGestationalAgeWeeks(activePregnancy.lmpDate),
      visitDate: editingVisitLog ? editingVisitLog.visitDate : new Date().toISOString()
    };

    if (editingVisitLog) {
      try {
        setLoading(true);
        await axios.put(`/api/maternity/visit/${editingVisitLog.id}`, payload);
        enqueueSnackbar('ANC follow-up visit note updated', { variant: 'success' });
        setVisitLogDialogOpen(false);
        setEditingVisitLog(null);
        fetchActivePregnancy(patientId);
      } catch (error: any) {
        enqueueSnackbar(error.response?.data?.message || 'Failed to update visit log', { variant: 'error' });
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      await axios.post('/api/maternity/visit', payload);
      enqueueSnackbar('ANC follow-up visit note recorded', { variant: 'success' });
      setVisitLogDialogOpen(false);
      fetchActivePregnancy(patientId);
      
      // Auto update next appointment if present
      if (payload.nextVisitDate) {
        axios.post('/api/appointments', {
          patientId,
          appointmentDate: payload.nextVisitDate,
          timeSlot: '09:00',
          reason: 'Antenatal Routine Checkup',
          type: 'CONSULTATION',
          status: 'SCHEDULED'
        }).catch(console.error);
      }
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to record visit log', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditScanReport = (scan: any) => {
    setEditingScanReport(scan);
    setScanReportDialogOpen(true);
  };

  const handleDeleteScanReport = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this ultrasound scan report?')) {
      try {
        setLoading(true);
        await axios.delete(`/api/maternity/fetal-surveillance/${id}`);
        enqueueSnackbar('Ultrasound Scan report deleted', { variant: 'success' });
        fetchActivePregnancy(patientId);
        fetchMaternityProfile(patientId);
      } catch (error: any) {
        enqueueSnackbar(error.response?.data?.message || 'Failed to delete scan report', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  // Save Ultrasound Fetal Scan report
  const handleSaveScanReport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activePregnancy || !maternityProfile) return;

    const data = new FormData(e.currentTarget);
    const payload = {
      maternityProfileId: maternityProfile.id,
      pregnancyId: activePregnancy.id,
      surveillanceType: 'ULTRASOUND',
      gestationalAgeWeeks: Number(data.get('gaWeeks')) || 0,
      estimatedFetalWeight: Number(data.get('weight')) || null,
      placentaLocation: data.get('placenta') || '',
      anomaliesDetected: data.get('anomalies') !== 'None detected',
      anomalyDetails: data.get('anomalies') || '',
      reportNotes: `${data.get('findings') || ''} (Amniotic Fluid: ${data.get('amniotic') || 'Normal'})`,
      reportedBy: data.get('sonographer') || '',
    };

    if (editingScanReport) {
      try {
        setLoading(true);
        await axios.put(`/api/maternity/fetal-surveillance/${editingScanReport.id}`, payload);
        enqueueSnackbar('Ultrasound Scan report updated', { variant: 'success' });
        setScanReportDialogOpen(false);
        setEditingScanReport(null);
        fetchActivePregnancy(patientId);
        fetchMaternityProfile(patientId);
      } catch (error: any) {
        enqueueSnackbar(error.response?.data?.message || 'Failed to update scan report', { variant: 'error' });
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      await axios.post('/api/maternity/fetal-surveillance', payload);
      enqueueSnackbar('Ultrasound Scan report logged', { variant: 'success' });
      setScanReportDialogOpen(false);
      fetchActivePregnancy(patientId);
      fetchMaternityProfile(patientId);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to log scan report', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditComplication = (comp: any) => {
    setEditingComplication(comp);
    setComplicationDialogOpen(true);
  };

  const handleDeleteComplication = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this complication flag?')) {
      try {
        setLoading(true);
        await axios.delete(`/api/maternity/complication/${id}`);
        enqueueSnackbar('Complication flag deleted', { variant: 'success' });
        fetchActivePregnancy(patientId);
        fetchMaternityProfile(patientId);
        fetchDashboardKPIs();
      } catch (error: any) {
        enqueueSnackbar(error.response?.data?.message || 'Failed to delete complication', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  // Log Complication Episode
  const handleSaveComplication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activePregnancy || !maternityProfile) return;

    const data = new FormData(e.currentTarget);
    const payload = {
      maternityProfileId: maternityProfile.id,
      pregnancyId: activePregnancy.id,
      complicationType: data.get('complicationType'),
      severity: data.get('severity'),
      managementNotes: data.get('notes') || '',
    };

    if (editingComplication) {
      try {
        setLoading(true);
        await axios.put(`/api/maternity/complication/${editingComplication.id}`, payload);
        enqueueSnackbar('High-risk complication flag updated', { variant: 'success' });
        setComplicationDialogOpen(false);
        setEditingComplication(null);
        fetchActivePregnancy(patientId);
        fetchMaternityProfile(patientId);
        fetchDashboardKPIs();
      } catch (error: any) {
        enqueueSnackbar(error.response?.data?.message || 'Failed to update complication', { variant: 'error' });
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      await axios.post('/api/maternity/complication', payload);
      enqueueSnackbar('High-risk complication flag updated', { variant: 'success' });
      setComplicationDialogOpen(false);
      fetchActivePregnancy(patientId);
      fetchMaternityProfile(patientId);
      fetchDashboardKPIs();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to log complication', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // CPOE Pharmacy prescription pad handlers
  const handleAddPharmacyCart = (item: any, quantity: number, dose: string, freq: string, dur: string) => {
    if (presCart.some((p: any) => p.id === item.id)) {
      enqueueSnackbar('Drug is already added to script', { variant: 'warning' });
      return;
    }
    const cartItem = {
      id: item.id,
      name: item.name || item.brandName || item.genericName,
      unitPrice: item.salePrice || 50,
      quantity,
      dosage: dose,
      frequency: freq,
      duration: dur,
      route: 'Oral',
    };
    setPresCart([...presCart, cartItem]);
    enqueueSnackbar('Added drug to prescription pad', { variant: 'success' });
  };

  const handleRemovePharmacyCart = (id: string) => {
    setPresCart(presCart.filter((item: any) => item.id !== id));
  };

  const handleSavePharmacyPrescriptions = async () => {
    if (presCart.length === 0) return;
    try {
      setLoading(true);
      const items = presCart.map((item: any) => ({
        medicationId: item.id,
        quantityPrescribed: Number(item.quantity) || 1,
        dose: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instruction: 'Take as directed',
        route: 'Oral',
      }));
      const payload = {
        patientId,
        visitId: currentVisitId || null,
        notes: `Antenatal clinic routine prescription: GA ${getGestationalAgeWeeks(activePregnancy?.lmpDate) || 'unknown'} weeks.`,
        items
      };
      await axios.post('/api/pharmacy/prescriptions', payload);
      enqueueSnackbar('Prescriptions submitted successfully to pharmacy unit', { variant: 'success' });
      setPresCart([]);
      fetchClinicalOrdersHistory(patientId);
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || e.response?.data?.error || 'Failed to save prescriptions', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // CPOE Laboratory request handlers
  const handleAddLabCart = (item: any) => {
    if (labCart.some((l: any) => l.id === item.id)) {
      enqueueSnackbar('Test already selected', { variant: 'warning' });
      return;
    }
    setLabCart([...labCart, item]);
    enqueueSnackbar('Test added to LIMS laboratory cart', { variant: 'success' });
  };

  const handleRemoveLabCart = (id: string) => {
    setLabCart(labCart.filter((item: any) => item.id !== id));
  };

  const handleSaveLabRequests = async () => {
    if (labCart.length === 0) return;
    try {
      setLoading(true);
      const tests = labCart.map((item: any) => ({
        testId: item.id,
        clinicalHistory: `Routine ANC diagnostic workup. GA ${getGestationalAgeWeeks(activePregnancy?.lmpDate) || 'unknown'} weeks.`,
      }));
      const payload = {
        patientId,
        visitId: currentVisitId || null,
        tests,
      };
      await axios.post('/api/lims/orders', payload);
      enqueueSnackbar('Diagnostic lab request orders logged into LIMS queue', { variant: 'success' });
      setLabCart([]);
      fetchClinicalOrdersHistory(patientId);
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || e.response?.data?.error || 'Failed to submit lab requests', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Edit & Delete handlers for Lab Orders
  const handleEditLabOrder = (order: any) => {
    setSelectedLabOrder(order);
    setEditLabPriority(order.priority || 'ROUTINE');
    setEditLabNotes(order.clinicalNotes || '');
    setEditLabDiagnosis(order.diagnosis || '');
    setEditLabPaymentStatus(order.paymentStatus || 'UNPAID');
  };

  const handleUpdateLabOrder = async () => {
    if (!selectedLabOrder) return;
    try {
      setLoading(true);
      await axios.put(`/api/lims/orders/${selectedLabOrder.id}`, {
        priority: editLabPriority,
        clinicalNotes: editLabNotes,
        diagnosis: editLabDiagnosis,
        paymentStatus: editLabPaymentStatus,
      });
      enqueueSnackbar('Laboratory order updated successfully', { variant: 'success' });
      setSelectedLabOrder(null);
      fetchClinicalOrdersHistory(patientId);
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Failed to update lab order', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLabOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this laboratory order?')) return;
    try {
      setLoading(true);
      await axios.delete(`/api/lims/orders/${orderId}`);
      enqueueSnackbar('Laboratory order deleted successfully', { variant: 'success' });
      fetchClinicalOrdersHistory(patientId);
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Failed to delete lab order', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Edit & Delete handlers for Pharmacy Prescriptions
  const handleEditPrescription = (rx: any) => {
    setSelectedPrescription(rx);
    setEditPresPriority(rx.priority || 'ROUTINE');
    setEditPresNotes(rx.clinicalNotes || '');
    setEditPresDiagnosis(rx.diagnosis || '');
    setEditPresPaymentStatus(rx.paymentStatus || 'UNPAID');
  };

  const handleUpdatePrescription = async () => {
    if (!selectedPrescription) return;
    try {
      setLoading(true);
      await axios.put(`/api/pharmacy/prescriptions/${selectedPrescription.id}`, {
        priority: editPresPriority,
        clinicalNotes: editPresNotes,
        diagnosis: editPresDiagnosis,
        paymentStatus: editPresPaymentStatus,
      });
      enqueueSnackbar('Prescription updated successfully', { variant: 'success' });
      setSelectedPrescription(null);
      fetchClinicalOrdersHistory(patientId);
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Failed to update prescription', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrescription = async (rxId: string) => {
    if (!window.confirm('Are you sure you want to delete this prescription?')) return;
    try {
      setLoading(true);
      await axios.delete(`/api/pharmacy/prescriptions/${rxId}`);
      enqueueSnackbar('Prescription deleted successfully', { variant: 'success' });
      fetchClinicalOrdersHistory(patientId);
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Failed to delete prescription', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Advance Patient Workflow (Midwife Consultation -> Pharmacy/Lab)
  const handleAdvanceWorkflow = async () => {
    if (!currentVisitId) return;
    try {
      setLoading(true);
      await axios.post(`/api/visits/${currentVisitId}/advance`);
      enqueueSnackbar('Visit workflow advanced successfully', { variant: 'success' });
      
      // Reload queue and clear selections
      fetchActiveQueue();
      setSelectedPatient(null);
      setPatientId('');
      setMaternityProfile(null);
      setActivePregnancy(null);
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Failed to advance workflow', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getGestationalAgeWeeks = (lmpDateStr: string | Date | undefined) => {
    if (!lmpDateStr) return 0;
    const lmp = new Date(lmpDateStr);
    const diff = new Date().getTime() - lmp.getTime();
    const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
    return weeks >= 0 ? weeks : 0;
  };

  const getCustomFieldValue = (fieldName: string) => {
    if (!activePregnancy?.customFields) return '';
    try {
      const custom = JSON.parse(activePregnancy.customFields);
      return custom[fieldName] || '';
    } catch (e) {
      return '';
    }
  };

  const getProfileCustomValue = (fieldName: string) => {
    if (!maternityProfile?.customFields) return '';
    try {
      const custom = JSON.parse(maternityProfile.customFields);
      return custom[fieldName];
    } catch (e) {
      return '';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: PRIMARY, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Antenatal Care (ANC) Workspace
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Booking Visits, Pregnancy Registry, Risk Profiling, Maternal History & Clinical Orders (CPOE)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button variant="contained" color="primary" startIcon={<PersonAdd />} onClick={() => setOpenExternalModal(true)}>
            Walk-in / External Client
          </Button>
          <Button variant="outlined" color="primary" startIcon={<EventNote />} onClick={() => setOpenApptModal(true)}>
            Schedule ANC / Follow-up
          </Button>
          <Chip
            icon={<LocalHospital sx={{ color: '#fff !important' }} />}
            label="System Online - Interop Connected"
            sx={{ bgcolor: SUCCESS, color: '#fff', fontWeight: 'bold' }}
          />
        </Box>
      </Box>

      {/* Grid of Key KPIs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: `5px solid ${PRIMARY}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2" gutterBottom>ACTIVE PREGNANCIES</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{dashboardData.activePregnancies}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: `5px solid ${WARNING}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2" gutterBottom>HIGH RISK CASES</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{dashboardData.highRiskPregnancies}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: `5px solid ${SUCCESS}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2" gutterBottom>DELIVERIES (THIS MONTH)</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{dashboardData.deliveriesCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: `5px solid #6741d9`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2" gutterBottom>PMTCT ENROLLMENTS</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{dashboardData.activePmtct}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: `5px solid ${SUCCESS}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2" gutterBottom>LABOUR WARD BEDS</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {dashboardData.wardBeds.occupied} / {dashboardData.wardBeds.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Patient selector bar */}
      <Card sx={{ mb: 4, borderRadius: '12px' }}>
        <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Select Antenatal Patient (MPI):</Typography>
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
                label={activePregnancy ? `Gestational Age: ${getGestationalAgeWeeks(activePregnancy.lmpDate)} Weeks` : 'No Active Pregnancy'}
                color={activePregnancy ? 'success' : 'default'}
              />
              {activePregnancy?.isHighRisk && <Chip label="HIGH RISK" color="error" />}
              <Button 
                variant="contained" 
                color="primary" 
                size="small" 
                onClick={() => navigate('/appointments', { state: { preselectedPatient: selectedPatient } })}
              >
                Book Next Appointment
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {overduePregnancies.length > 0 && overduePregnancies.map((p) => (
        <Alert 
          key={p.id}
          severity="error" 
          variant="filled" 
          sx={{ 
            mb: 3, 
            fontWeight: 'bold', 
            fontSize: '1rem',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.8 },
              '100%': { opacity: 1 }
            }
          }}
          action={
            <Button color="inherit" size="small" variant="outlined" sx={{ fontWeight: 'bold' }} onClick={() => handleSelectPatient(p.patient)}>
              VIEW PATIENT WORKSPACE
            </Button>
          }
        >
          ⚠️ CRITICAL ALERT: {p.patient.firstName} {p.patient.lastName}'s Expected Date of Delivery (EDD: {new Date(p.eddDate).toLocaleDateString()}) has been reached or passed, but the pregnancy cycle is still active. Please discharge or end the cycle.
        </Alert>
      ))}

      {/* ANC Workspace Panel */}
      <Box>
        {!selectedPatient ? (
          <Stack spacing={3}>
            {/* Today's ANC Queue */}
            <Card>
              <CardHeader title="Today's ANC Queue" subheader="Select a patient from the queue to begin consultation" />
              <Divider />
              <CardContent>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: LIGHT_BG }}>
                      <TableRow>
                        <TableCell>Patient Name</TableCell>
                        <TableCell>MRN / ID</TableCell>
                        <TableCell>Checked-in Time</TableCell>
                        <TableCell>Billing Status</TableCell>
                        <TableCell>Current Step</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visitQueue.length === 0 ? (
                        <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>No active patients registered for ANC check-ins today.</Typography></TableCell></TableRow>
                      ) : (
                        visitQueue.map((v: any) => (
                          <TableRow key={v.id}>
                            <TableCell sx={{ fontWeight: 'bold' }}>{v.patientName}</TableCell>
                            <TableCell>{v.mrn}</TableCell>
                            <TableCell>{new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={v.billingStatus === 'PAID' ? 'PAID' : 'AWAITING PAYMENT'}
                                color={v.billingStatus === 'PAID' ? 'success' : 'warning'}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={VISIT_STATUS_LABELS[v.status] || v.status}
                                variant="outlined"
                                color="primary"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleSelectPatient({ id: v.patientId, firstName: v.patientName.split(' ')[0], lastName: v.patientName.split(' ')[1], mrn: v.mrn })}
                              >
                                Select Patient
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Past Pending ANC Queue */}
            <Card sx={{ borderColor: WARNING, borderStyle: 'solid', borderWidth: 1 }}>
              <CardHeader 
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning color="warning" />
                    <Typography variant="h6" fontWeight={700}>Past Pending ANC Queue</Typography>
                  </Box>
                } 
                subheader="Patients checked in on previous days that still require consultation" 
              />
              <Divider />
              <CardContent>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: LIGHT_BG }}>
                      <TableRow>
                        <TableCell>Patient Name</TableCell>
                        <TableCell>MRN / ID</TableCell>
                        <TableCell>Date Checked-in</TableCell>
                        <TableCell>Billing Status</TableCell>
                        <TableCell>Last Recorded Step</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pastQueue.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
                              No pending past visits found.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        pastQueue.map((v: any) => (
                          <TableRow key={v.id}>
                            <TableCell sx={{ fontWeight: 'bold' }}>{v.patientName}</TableCell>
                            <TableCell>{v.mrn}</TableCell>
                            <TableCell>{new Date(v.createdAt).toLocaleDateString()} {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={v.billingStatus === 'PAID' ? 'PAID' : 'AWAITING PAYMENT'}
                                color={v.billingStatus === 'PAID' ? 'success' : 'warning'}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={VISIT_STATUS_LABELS[v.status] || v.status}
                                variant="outlined"
                                color="warning"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                onClick={() => handleSelectPatient({ id: v.patientId, firstName: v.patientName.split(' ')[0], lastName: v.patientName.split(' ')[1], mrn: v.mrn })}
                              >
                                Resume Visit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Stack>
        ) : (
          <Grid container spacing={3}>
            {/* Left Panel: Clinical Profiles */}
            <Grid item xs={12} md={4}>
              {/* Profile Card */}
              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title="Maternal History Registry"
                  action={
                    <Button variant="outlined" size="small" onClick={() => setProfileDialogOpen(true)}>
                      {maternityProfile ? 'Edit Profile' : 'Initialize Profile'}
                    </Button>
                  }
                />
                <Divider />
                <CardContent sx={{ p: 0 }}>
                  {!maternityProfile ? (
                    <Box sx={{ p: 3 }}>
                      <Alert severity="warning">Patient has no initialized Maternal Profile.</Alert>
                    </Box>
                  ) : (
                    <Box>
                      <List dense>
                        <ListItem>
                          <ListItemText primary="Obstetric Code" secondary={`Gravidity: ${maternityProfile.gravidity} | Parity: ${maternityProfile.parity} | Abortions: ${maternityProfile.abortions} | Living Children: ${maternityProfile.livingChildren}`} />
                        </ListItem>
                        <Divider />
                        <ListItem>
                          <ListItemText primary="Serology Status" secondary={`Genotype: ${getProfileCustomValue('sickleCellGenotype') || 'Not set'} | Hepatitis B: ${maternityProfile.hepatitisBStatus || 'NEGATIVE'} | Hepatitis C: ${getProfileCustomValue('hepatitisC') || 'NEGATIVE'} | Syphilis: ${maternityProfile.syphilisStatus || 'NEGATIVE'}`} />
                        </ListItem>
                        <Divider />
                        <ListItem>
                          <ListItemText
                            primary="Pre-existing Conditions"
                            secondary={
                              [
                                getProfileCustomValue('preExistingHypertension') && 'Hypertension',
                                getProfileCustomValue('preExistingDiabetes') && 'Diabetes',
                                getProfileCustomValue('preExistingAsthma') && 'Asthma',
                                getProfileCustomValue('preExistingEpilepsy') && 'Epilepsy',
                                getProfileCustomValue('previousCesareanSection') && 'Prev CS',
                                getProfileCustomValue('previousMyomectomy') && 'Prev Myomectomy'
                              ].filter(Boolean).join(', ') || 'Nil'
                            }
                          />
                        </ListItem>
                        <Divider />
                        <ListItem>
                          <ListItemText primary="Immunization Status" secondary={`Tetanus Toxoid (TT) Doses Administered: ${maternityProfile?.ttDoseCount ?? 0}`} />
                        </ListItem>
                      </List>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Pregnancy Record Card */}
              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title="Pregnancy Episode Info"
                  action={
                    maternityProfile && (
                      <Stack direction="row" spacing={1}>
                        <Button variant="outlined" size="small" onClick={() => setPregnancyDialogOpen(true)}>
                          {activePregnancy ? 'Edit Pregnancy' : 'Register Pregnancy'}
                        </Button>
                        {activePregnancy && activePregnancy.status === 'ACTIVE' && (
                          <Button variant="outlined" size="small" color="error" onClick={() => setEndCycleDialogOpen(true)}>
                            End Cycle
                          </Button>
                        )}
                        {activePregnancy && activePregnancy.status !== 'ACTIVE' && (
                          <Button variant="outlined" size="small" onClick={() => setActivePregnancy(null)}>
                            Close Details
                          </Button>
                        )}
                      </Stack>
                    )
                  }
                />
                <Divider />
                <CardContent>
                  {!activePregnancy ? (
                    patientPregnancies.length === 0 ? (
                      <Alert severity="warning">No pregnancy cycles registered for this patient.</Alert>
                    ) : (
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>Previous Pregnancy Cycles</Typography>
                        <List disablePadding>
                          {patientPregnancies.map((p: any) => (
                            <ListItem key={p.id} divider sx={{ px: 0 }}>
                              <ListItemText
                                primary={`Gestation #${p.gestationNumber} (LMP: ${new Date(p.lmpDate).toLocaleDateString()})`}
                                secondary={`Status: ${p.status} | EDD: ${new Date(p.eddDate).toLocaleDateString()}`}
                              />
                              <Button variant="outlined" size="small" onClick={() => setActivePregnancy(p)}>
                                View Details
                              </Button>
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">LMP DATE</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{new Date(activePregnancy.lmpDate).toLocaleDateString()}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">EDD DATE</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{new Date(activePregnancy.eddDate).toLocaleDateString()}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">GESTATIONAL AGE (WEEKS)</Typography>
                          <Typography variant="body2">{getGestationalAgeWeeks(activePregnancy.lmpDate)} weeks (Gestation #{activePregnancy.gestationNumber})</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">ANC CARD PRINT TEMPLATE</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: PRIMARY }}>{activePregnancy.ancTemplate || 'Faith Foundation Replica Template'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">RISK FACTORS</Typography>
                          <Typography variant="body2" sx={{ color: activePregnancy.isHighRisk ? DANGER : 'text.primary', fontWeight: 'bold' }}>
                            {activePregnancy.isHighRisk ? `HIGH RISK: ${activePregnancy.riskFactors || 'Maternal risk factors flagged'}` : 'LOW RISK'}
                          </Typography>
                        </Grid>
                      </Grid>

                      {/* Display Custom Fields defined by selected template */}
                      {(() => {
                        const activeTemplate = ANC_TEMPLATES.find(t => t.name === (activePregnancy.ancTemplate || 'Faith Foundation Replica Template'));
                        if (activeTemplate && activeTemplate.pregnancyFields.length > 0) {
                          return (
                            <Box sx={{ mt: 1, p: 1.5, bgcolor: '#f1f3f5', borderRadius: 2 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>TEMPLATE CONFIG SPECIFIC FIELDS ({activeTemplate.name}):</Typography>
                              <Grid container spacing={1}>
                                {activeTemplate.pregnancyFields.map(f => (
                                  <Grid item xs={6} key={f.name}>
                                    <Typography variant="caption" color="text.secondary" display="block">{f.label}</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{getCustomFieldValue(f.name) || 'Not recorded'}</Typography>
                                  </Grid>
                                ))}
                              </Grid>
                            </Box>
                          );
                        }
                        return null;
                      })()}

                      {/* Completed Delivery Summary */}
                      {activePregnancy.deliveryRecords && activePregnancy.deliveryRecords.length > 0 && (
                        <Box sx={{ mt: 2, p: 1.5, bgcolor: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 2 }}>
                          <Typography variant="subtitle2" sx={{ color: '#2e7d32', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                            <ChildCare fontSize="small" /> Delivery & Birth Registry Record
                          </Typography>
                          {activePregnancy.deliveryRecords.map((del: any) => (
                            <Box key={del.id} sx={{ mb: 1.5 }}>
                              <Grid container spacing={1}>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Delivery Type</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{del.deliveryType}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Date & Time</Typography>
                                  <Typography variant="body2">{new Date(del.birthTimestamp).toLocaleString()}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Blood Loss</Typography>
                                  <Typography variant="body2">{del.bloodLossMl} ml</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Placenta</Typography>
                                  <Typography variant="body2">{del.placentaCondition || 'N/A'}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                  <Typography variant="caption" color="text.secondary">Delivery Complications</Typography>
                                  <Typography variant="body2" sx={{ color: del.complications !== 'None' ? 'error.main' : 'text.primary', fontWeight: 'bold' }}>
                                    {del.complications || 'None'}
                                  </Typography>
                                </Grid>
                              </Grid>

                              {/* Neonatal Records */}
                              {del.neonatalRecords && del.neonatalRecords.length > 0 && (
                                <Box sx={{ mt: 1, pl: 1, borderLeft: '3px solid #81c784' }}>
                                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#2e7d32', display: 'block', mb: 0.5 }}>Newborn Registry:</Typography>
                                  {del.neonatalRecords.map((neo: any) => (
                                    <Box key={neo.id} sx={{ mb: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                        {neo.babyName} ({neo.sex}) — {neo.birthWeight} kg
                                      </Typography>
                                      {neo.birthLength && (
                                        <Typography variant="caption" display="block">
                                          Length: {neo.birthLength} cm | HC: {neo.headCircumference || 'N/A'} cm
                                        </Typography>
                                      )}
                                      <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                                        APGAR: 1m: {neo.apgar1Min} | 5m: {neo.apgar5Min}
                                      </Typography>
                                      {neo.examinationNotes && (
                                        <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                                          Notes: {neo.examinationNotes}
                                        </Typography>
                                      )}
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}

                      <Button variant="contained" startIcon={<Print />} color="secondary" onClick={() => setPrintCardDialogOpen(true)}>
                        Print High-Res ANC Card
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Visit Progress & Advance Workflow Card */}
              {currentVisitId && (
                <Card sx={{ borderLeft: `5px solid ${PRIMARY}` }}>
                  <CardHeader
                    title="Visit Steps & Workflow"
                    action={
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={handleAdvanceWorkflow}
                        disabled={loading}
                        sx={{ position: 'relative' }}
                      >
                        {loading && <CircularProgress size={16} sx={{ mr: 1, color: '#fff' }} />}
                        Advance Workflow
                      </Button>
                    }
                  />
                  <Divider />
                  <CardContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Visit status step:</Typography>
                        <Chip
                          size="small"
                          label={VISIT_STATUS_LABELS[currentVisitStatus] || currentVisitStatus}
                          color="primary"
                        />
                      </Box>
                      <Alert severity="info" sx={{ py: 0.5 }}>
                        Once you order diagnostic tests, log consults, or prescribe meds, click Advance Workflow to route the mother in the patient journey lifecycle.
                      </Alert>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Grid>

            {/* Right Panel: Workspace Tabs (Consults, Orders) */}
            <Grid item xs={12} md={8}>
              <Card sx={{ height: '100%' }}>
                <Tabs value={activeWorkspaceTab} onChange={(e, val) => setActiveWorkspaceTab(val)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                  <Tab icon={<Assignment />} label="Clinical Consults & Visit Logs" />
                  <Tab icon={<Science />} label="Laboratory Requests" />
                  <Tab icon={<LocalPharmacy />} label="Prescription CPOE Pad" />
                </Tabs>

                {activeWorkspaceTab === 0 && (
                  <CardContent>
                    {!activePregnancy ? (
                      <Alert severity="warning">Register Pregnancy record first to write ANC visit notes.</Alert>
                    ) : (
                      <Box>
                        {/* Summary metrics header */}
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                          <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingVisitLog(null); setVisitLogDialogOpen(true); }}>Record ANC Routine Checkup</Button>
                          <Button variant="outlined" startIcon={<Add />} onClick={() => { setEditingScanReport(null); setScanReportDialogOpen(true); }}>Record Obstetric Ultrasound</Button>
                          <Button variant="outlined" startIcon={<Add />} color="error" onClick={() => { setEditingComplication(null); setComplicationDialogOpen(true); }}>Flag Complication</Button>
                        </Box>

                        {/* Recent progress log entries */}
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Routine Checkup Logs</Typography>
                        {!activePregnancy.antenatalVisits || activePregnancy.antenatalVisits.length === 0 ? (
                          <Alert severity="info" sx={{ mb: 3 }}>No ANC follow-up checkup logged for this pregnancy yet.</Alert>
                        ) : (
                          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: LIGHT_BG }}>
                                <TableRow>
                                  <TableCell>Visit Date</TableCell>
                                  <TableCell>GA (Weeks)</TableCell>
                                  <TableCell>BP (mmHg)</TableCell>
                                  <TableCell>Weight (kg)</TableCell>
                                  <TableCell>Fundal Ht (cm)</TableCell>
                                  <TableCell>F Presentation</TableCell>
                                  <TableCell>FHR (bpm)</TableCell>
                                  <TableCell>Urine Prot/Glu</TableCell>
                                  <TableCell align="right">Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {activePregnancy.antenatalVisits.map((log: any) => (
                                  <TableRow key={log.id}>
                                    <TableCell>{new Date(log.visitDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{log.gestationalWeeks}</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{log.systolic}/{log.diastolic}</TableCell>
                                    <TableCell>{log.weight ? `${log.weight} kg` : 'N/A'}</TableCell>
                                    <TableCell>{log.fundalHeight || 'N/A'}</TableCell>
                                    <TableCell>{log.fetalPresentation || 'N/A'} ({log.fetalLie || 'N/A'})</TableCell>
                                    <TableCell sx={{ color: SUCCESS }}>{log.fetalHeartRate ? `${log.fetalHeartRate} bpm` : 'N/A'}</TableCell>
                                    <TableCell>{log.urineProtein || 'Nil'}/{log.urineGlucose || 'Nil'}</TableCell>
                                    <TableCell align="right">
                                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        <IconButton size="small" color="primary" onClick={() => handleEditVisitLog(log)}>
                                          <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleDeleteVisitLog(log.id)}>
                                          <Delete fontSize="small" />
                                        </IconButton>
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}

                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Obstetric Ultrasound Scan Logs</Typography>
                        {(!maternityProfile?.fetalSurveillance || 
                          maternityProfile.fetalSurveillance.filter((s: any) => s.pregnancyId === activePregnancy?.id).length === 0) ? (
                          <Alert severity="info">No obstetric ultrasound scans recorded.</Alert>
                        ) : (
                          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: LIGHT_BG }}>
                                <TableRow>
                                  <TableCell>Scan Date</TableCell>
                                  <TableCell>GA (Weeks)</TableCell>
                                  <TableCell>Placenta</TableCell>
                                  <TableCell>Est Fetal Wt</TableCell>
                                  <TableCell>Findings Summary</TableCell>
                                  <TableCell>Sonographer</TableCell>
                                  <TableCell align="right">Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {maternityProfile.fetalSurveillance
                                  .filter((s: any) => s.pregnancyId === activePregnancy?.id)
                                  .map((scan: any) => (
                                  <TableRow key={scan.id}>
                                    <TableCell>{new Date(scan.performedDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{scan.gestationalAgeWeeks || 'N/A'}</TableCell>
                                    <TableCell>{scan.placentaLocation || 'N/A'}</TableCell>
                                    <TableCell>{scan.estimatedFetalWeight ? `${scan.estimatedFetalWeight}g` : 'N/A'}</TableCell>
                                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scan.reportNotes || 'N/A'}</TableCell>
                                    <TableCell>{scan.reportedBy || 'N/A'}</TableCell>
                                    <TableCell align="right">
                                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        <IconButton size="small" color="primary" onClick={() => handleEditScanReport(scan)}>
                                          <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleDeleteScanReport(scan.id)}>
                                          <Delete fontSize="small" />
                                        </IconButton>
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}

                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Flagged Complications</Typography>
                        {(!maternityProfile?.maternalComplications || 
                          maternityProfile.maternalComplications.filter((c: any) => c.pregnancyId === activePregnancy?.id).length === 0) ? (
                          <Alert severity="info">No high-risk complications flagged for this pregnancy.</Alert>
                        ) : (
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead sx={{ bgcolor: LIGHT_BG }}>
                                <TableRow>
                                  <TableCell>Complication Type</TableCell>
                                  <TableCell>Severity</TableCell>
                                  <TableCell>Onset Date</TableCell>
                                  <TableCell>Notes</TableCell>
                                  <TableCell align="right">Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {maternityProfile.maternalComplications
                                  .filter((c: any) => c.pregnancyId === activePregnancy?.id)
                                  .map((comp: any) => (
                                  <TableRow key={comp.id}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{comp.complicationType}</TableCell>
                                    <TableCell>
                                      <Chip size="small" label={comp.severity} color={comp.severity === 'SEVERE' || comp.severity === 'LIFE_THREATENING' ? 'error' : 'warning'} />
                                    </TableCell>
                                    <TableCell>{new Date(comp.onsetDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{comp.managementNotes || '—'}</TableCell>
                                    <TableCell align="right">
                                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        <IconButton size="small" color="primary" onClick={() => handleEditComplication(comp)}>
                                          <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleDeleteComplication(comp.id)}>
                                          <Delete fontSize="small" />
                                        </IconButton>
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Box>
                    )}
                  </CardContent>
                )}

                {activeWorkspaceTab === 1 && (
                  <CardContent>
                    <Grid container spacing={3}>
                      {/* Catalog Select */}
                      <Grid item xs={12} md={7}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Available Diagnostic Tests (Catalog)</Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                          <Table size="small" stickyHeader>
                            <TableHead sx={{ bgcolor: LIGHT_BG }}>
                              <TableRow>
                                <TableCell>Test Name</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Price</TableCell>
                                <TableCell>Action</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {labCatalog.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell sx={{ fontWeight: 'bold' }}>{item.testName}</TableCell>
                                  <TableCell>{item.category}</TableCell>
                                  <TableCell>₦{item.price}</TableCell>
                                  <TableCell>
                                    <Button size="small" startIcon={<Add />} onClick={() => handleAddLabCart(item)}>
                                      Add Request
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Grid>

                      {/* Request Cart */}
                      <Grid item xs={12} md={5}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>LIMS Diagnostic Basket</Typography>
                        {labCart.length === 0 ? (
                          <Alert severity="info">No diagnostic tests added yet. Click Add Request next to a test.</Alert>
                        ) : (
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Stack spacing={1.5} sx={{ mb: 3 }}>
                              {labCart.map((item: any) => (
                                <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: '#f8f9fa', borderRadius: 1.5 }}>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{item.testName}</Typography>
                                    <Typography variant="caption" color="text.secondary">Code: {item.testCode}</Typography>
                                  </Box>
                                  <IconButton size="small" color="error" onClick={() => handleRemoveLabCart(item.id)}>
                                    <Close />
                                  </IconButton>
                                </Box>
                              ))}
                            </Stack>
                            <Button variant="contained" fullWidth startIcon={<Save />} onClick={handleSaveLabRequests}>
                              Submit LIMS Order Pad
                            </Button>
                          </Paper>
                        )}
                      </Grid>

                      {/* Diagnostic history */}
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Recent Lab Orders & Diagnostic Results</Typography>
                        {(() => {
                          const filteredOrders = orderLogs.filter((log: any) => {
                            if (!activePregnancy) return false;
                            const orderTime = new Date(log.createdAt).getTime();
                            const lmpTime = new Date(activePregnancy.lmpDate).getTime();
                            if (activePregnancy.status === 'ACTIVE') {
                              return orderTime >= lmpTime;
                            } else {
                              return orderTime >= lmpTime && orderTime <= (lmpTime + 300 * 24 * 60 * 60 * 1000);
                            }
                          });
                          return filteredOrders.length === 0 ? (
                            <Alert severity="info">No lab orders logged for this patient profile.</Alert>
                          ) : (
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead sx={{ bgcolor: LIGHT_BG }}>
                                  <TableRow>
                                    <TableCell>Order ID</TableCell>
                                    <TableCell>Test Name</TableCell>
                                    <TableCell>Date Requested</TableCell>
                                    <TableCell>Billing Status</TableCell>
                                    <TableCell>LIMS Status</TableCell>
                                    <TableCell>Result Outcome</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {filteredOrders.map((log: any) => (
                                  <TableRow key={log.id}>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{log.id.slice(0, 8)}</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>
                                      {log.items?.map((it: any) => it.test?.testName).join(', ') || 'N/A'}
                                    </TableCell>
                                    <TableCell>{new Date(log.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                      <Chip
                                        size="small"
                                        label={log.paymentStatus || 'Awaiting Payment'}
                                        color={log.paymentStatus === 'PAID' ? 'success' : 'warning'}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        size="small"
                                        label={log.status}
                                        color={log.status === 'COMPLETED' ? 'success' : 'primary'}
                                      />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: log.items?.some((it: any) => it.result?.resultValue) ? PRIMARY : 'text.secondary' }}>
                                      {log.items?.map((it: any) => it.result?.resultValue || 'Awaiting result').join(', ')}
                                    </TableCell>
                                    <TableCell align="right">
                                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        <IconButton size="small" color="primary" onClick={() => handleEditLabOrder(log)}>
                                          <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleDeleteLabOrder(log.id)}>
                                          <Delete fontSize="small" />
                                        </IconButton>
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          );
                        })()}
                      </Grid>
                    </Grid>
                  </CardContent>
                )}

                {activeWorkspaceTab === 2 && (
                  <CardContent>
                    <Grid container spacing={3}>
                      {/* Catalog selection */}
                      <Grid item xs={12} md={7}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Prescription drugpad Catalog</Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                          <Table size="small" stickyHeader>
                            <TableHead sx={{ bgcolor: LIGHT_BG }}>
                              <TableRow>
                                <TableCell>Drug Name</TableCell>
                                <TableCell>Stock</TableCell>
                                <TableCell>Price</TableCell>
                                <TableCell>Action</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {pharmacyCatalog.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell sx={{ fontWeight: 'bold' }}>{item.name || item.brandName}</TableCell>
                                  <TableCell>{item.quantityInStock} units</TableCell>
                                  <TableCell>₦{item.salePrice}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="small"
                                      startIcon={<Add />}
                                      onClick={() => handleAddPharmacyCart(item, 1, '1 tab', 'Daily', '30 Days')}
                                    >
                                      Add to Pad
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Grid>

                      {/* Script pad */}
                      <Grid item xs={12} md={5}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Active Clinical Prescription Pad</Typography>
                        {presCart.length === 0 ? (
                          <Alert severity="info">Prescription pad is empty. Click Add to Pad next to a drug.</Alert>
                        ) : (
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Stack spacing={2} sx={{ mb: 3 }}>
                              {presCart.map((item: any) => (
                                <Box key={item.id} sx={{ p: 1.5, bgcolor: '#f8f9fa', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{item.name}</Typography>
                                    <IconButton size="small" color="error" onClick={() => handleRemovePharmacyCart(item.id)}>
                                      <Close />
                                    </IconButton>
                                  </Box>
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                      select
                                      size="small"
                                      label="Dose"
                                      value={item.dosage}
                                      onChange={(e) => {
                                        setPresCart(presCart.map((p: any) => p.id === item.id ? { ...p, dosage: e.target.value } : p));
                                      }}
                                    >
                                      {DOSE_OPTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                                    </TextField>
                                    <TextField
                                      select
                                      size="small"
                                      label="Freq"
                                      value={item.frequency}
                                      onChange={(e) => {
                                        setPresCart(presCart.map((p: any) => p.id === item.id ? { ...p, frequency: e.target.value } : p));
                                      }}
                                    >
                                      {FREQ_OPTIONS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                                    </TextField>
                                    <TextField
                                      select
                                      size="small"
                                      label="Dur"
                                      value={item.duration}
                                      onChange={(e) => {
                                        setPresCart(presCart.map((p: any) => p.id === item.id ? { ...p, duration: e.target.value } : p));
                                      }}
                                    >
                                      {DURATION_OPTIONS.map(dur => <MenuItem key={dur} value={dur}>{dur}</MenuItem>)}
                                    </TextField>
                                  </Box>
                                </Box>
                              ))}
                            </Stack>
                            <Button variant="contained" fullWidth startIcon={<Save />} onClick={handleSavePharmacyPrescriptions}>
                              Submit Prescription to Pharmacy
                            </Button>
                          </Paper>
                        )}
                      </Grid>

                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Historic Routine Prescription Logs</Typography>
                        {(() => {
                          const filteredPres = presLogs.filter((p: any) => {
                            if (!activePregnancy) return false;
                            const rxTime = new Date(p.createdAt || p.orderedAt).getTime();
                            const lmpTime = new Date(activePregnancy.lmpDate).getTime();
                            if (activePregnancy.status === 'ACTIVE') {
                              return rxTime >= lmpTime;
                            } else {
                              return rxTime >= lmpTime && rxTime <= (lmpTime + 300 * 24 * 60 * 60 * 1000);
                            }
                          });
                          return filteredPres.length === 0 ? (
                            <Alert severity="info">No active prescriptions logged.</Alert>
                          ) : (
                            <Stack spacing={2}>
                              {filteredPres.map((p: any) => (
                              <Card key={p.id} variant="outlined">
                                <CardHeader
                                  title={`Script ID: ${p.id.slice(0, 8)}`}
                                  subheader={`Dispensed status: ${p.status} | Date: ${new Date(p.createdAt).toLocaleDateString()}`}
                                  action={
                                    <Stack direction="row" spacing={0.5}>
                                      <IconButton size="small" color="primary" onClick={() => handleEditPrescription(p)}>
                                        <Edit fontSize="small" />
                                      </IconButton>
                                      <IconButton size="small" color="error" onClick={() => handleDeletePrescription(p.id)}>
                                        <Delete fontSize="small" />
                                      </IconButton>
                                    </Stack>
                                  }
                                />
                                <Divider />
                                <CardContent sx={{ p: 1.5 }}>
                                  {p.items ? (
                                    <Stack spacing={1}>
                                      {p.items.map((item: any) => (
                                        <Box key={item.id} sx={{ pl: 2, borderLeft: '3px solid #dee2e6' }}>
                                          <Typography variant="body2" fontWeight="bold">
                                            {item.medication?.name || 'Medication'} — {item.dose} ({item.frequency}) for {item.duration}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Stack>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>No items recorded.</Typography>
                                  )}
                                </CardContent>
                              </Card>
                              ))}
                            </Stack>
                          );
                        })()}
                      </Grid>
                    </Grid>
                  </CardContent>
                )}
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* DIALOGS FOR FORMS */}
      
      {/* 1. Maternal Profile Dialog */}
      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveProfile}>
          <DialogTitle>Create/Edit Maternity Profile</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField fullWidth label="Gravidity" name="gravidity" type="number" value={formGravidity} onChange={(e) => setFormGravidity(Number(e.target.value) || 0)} /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Parity" name="parity" type="number" value={formParity} onChange={(e) => setFormParity(Number(e.target.value) || 0)} /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Abortions" name="abortions" type="number" value={formAbortions} onChange={(e) => setFormAbortions(Number(e.target.value) || 0)} /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Living Children" name="livingChildren" type="number" defaultValue={maternityProfile?.livingChildren || 0} /></Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Blood Group" name="bloodGroup" defaultValue={maternityProfile?.bloodGroup || 'A_POSITIVE'}>
                  <MenuItem value="A_POSITIVE">A+</MenuItem>
                  <MenuItem value="A_NEGATIVE">A-</MenuItem>
                  <MenuItem value="B_POSITIVE">B+</MenuItem>
                  <MenuItem value="B_NEGATIVE">B-</MenuItem>
                  <MenuItem value="O_POSITIVE">O+</MenuItem>
                  <MenuItem value="O_NEGATIVE">O-</MenuItem>
                  <MenuItem value="AB_POSITIVE">AB+</MenuItem>
                  <MenuItem value="AB_NEGATIVE">AB-</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Rhesus Status" name="rhesusStatus" defaultValue={maternityProfile?.rhesusStatus || 'POSITIVE'}>
                  <MenuItem value="POSITIVE">Positive</MenuItem>
                  <MenuItem value="NEGATIVE">Negative</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="HIV Status" name="hivStatus" value={formHivStatus} onChange={(e) => setFormHivStatus(e.target.value)}>
                  <MenuItem value="POSITIVE">Positive</MenuItem>
                  <MenuItem value="NEGATIVE">Negative</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Genotype" name="sickleCellGenotype" defaultValue={getProfileCustomValue('sickleCellGenotype') || 'AA'}>
                  <MenuItem value="AA">AA</MenuItem>
                  <MenuItem value="AS">AS</MenuItem>
                  <MenuItem value="SS">SS</MenuItem>
                  <MenuItem value="AC">AC</MenuItem>
                  <MenuItem value="SC">SC</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={4}>
                <TextField select fullWidth label="Hep B" name="hepatitisB" defaultValue={maternityProfile?.hepatitisBStatus || 'NEGATIVE'}>
                  <MenuItem value="POSITIVE">Pos</MenuItem>
                  <MenuItem value="NEGATIVE">Neg</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={4}>
                <TextField select fullWidth label="Hep C" name="hepatitisC" defaultValue={getProfileCustomValue('hepatitisC') || 'NEGATIVE'}>
                  <MenuItem value="POSITIVE">Pos</MenuItem>
                  <MenuItem value="NEGATIVE">Neg</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={4}>
                <TextField select fullWidth label="Syphilis" name="syphilis" defaultValue={maternityProfile?.syphilisStatus || 'NEGATIVE'}>
                  <MenuItem value="POSITIVE">Pos</MenuItem>
                  <MenuItem value="NEGATIVE">Neg</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth label="Tetanus Toxoid (TT) Doses" name="ttDoseCount" type="number" defaultValue={maternityProfile?.ttDoseCount ?? 0} inputProps={{ min: 0, max: 10 }} />
              </Grid>

              {/* Preexisting Medical Checklist */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Pre-existing Medical History Flags</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <FormControlLabel control={<Checkbox name="preExistingHypertension" defaultChecked={!!getProfileCustomValue('preExistingHypertension')} />} label="Hypertension" />
                  </Grid>
                  <Grid item xs={4}>
                    <FormControlLabel control={<Checkbox name="preExistingDiabetes" defaultChecked={!!getProfileCustomValue('preExistingDiabetes')} />} label="Diabetes" />
                  </Grid>
                  <Grid item xs={4}>
                    <FormControlLabel control={<Checkbox name="preExistingAsthma" defaultChecked={!!getProfileCustomValue('preExistingAsthma')} />} label="Asthma" />
                  </Grid>
                  <Grid item xs={4}>
                    <FormControlLabel control={<Checkbox name="preExistingEpilepsy" defaultChecked={!!getProfileCustomValue('preExistingEpilepsy')} />} label="Epilepsy" />
                  </Grid>
                  <Grid item xs={4}>
                    <FormControlLabel control={<Checkbox name="previousCesareanSection" defaultChecked={!!getProfileCustomValue('previousCesareanSection')} />} label="Prev C-Section" />
                  </Grid>
                  <Grid item xs={4}>
                    <FormControlLabel control={<Checkbox name="previousMyomectomy" defaultChecked={!!getProfileCustomValue('previousMyomectomy')} />} label="Prev Myomectomy" />
                  </Grid>
                </Grid>
              </Grid>

              {/* Family & Social History */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Family & Social History</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <FormControlLabel control={<Checkbox name="familyHistoryTwins" defaultChecked={!!getProfileCustomValue('familyHistoryTwins')} />} label="History of Twins" />
                  </Grid>
                  <Grid item xs={4}>
                    <FormControlLabel control={<Checkbox name="familyHistoryHypertension" defaultChecked={!!getProfileCustomValue('familyHistoryHypertension')} />} label="Fam Hypertension" />
                  </Grid>
                  <Grid item xs={4}>
                    <FormControlLabel control={<Checkbox name="familyHistoryDiabetes" defaultChecked={!!getProfileCustomValue('familyHistoryDiabetes')} />} label="Fam Diabetes" />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel control={<Checkbox name="socialSmoking" defaultChecked={!!getProfileCustomValue('socialSmoking')} />} label="Smoking Habits" />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel control={<Checkbox name="socialAlcohol" defaultChecked={!!getProfileCustomValue('socialAlcohol')} />} label="Alcohol Consumption" />
                  </Grid>
                </Grid>
              </Grid>

              {/* Partners info */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Socio-demographics & Next of Kin</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}><TextField fullWidth size="small" label="Maternal Occupation" name="occupation" defaultValue={getProfileCustomValue('occupation') || ''} /></Grid>
                  <Grid item xs={4}><TextField fullWidth size="small" label="Partner's Name" name="partnerName" defaultValue={getProfileCustomValue('partnerName') || ''} /></Grid>
                  <Grid item xs={4}>
                    <TextField 
                      fullWidth 
                      size="small" 
                      label="Partner's Phone" 
                      name="partnerPhone" 
                      value={formPartnerPhone} 
                      onChange={(e) => setFormPartnerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      inputProps={{ maxLength: 11 }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Custom fields configured by active template */}
              {(() => {
                const activeTemplate = ANC_TEMPLATES.find(t => t.name === ancTemplate);
                if (activeTemplate && activeTemplate.profileFields.length > 0) {
                  // Get saved custom fields values if exist
                  let savedCustom: Record<string, any> = {};
                  if (maternityProfile?.customFields) {
                    try {
                      savedCustom = JSON.parse(maternityProfile.customFields);
                    } catch (e) {
                      savedCustom = {};
                    }
                  }
                  return (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: PRIMARY }}>Template-Specific Fields ({activeTemplate.name})</Typography>
                      <Grid container spacing={2}>
                        {activeTemplate.profileFields.map(f => {
                          if (f.type === 'select') {
                            return (
                              <Grid item xs={6} key={f.name}>
                                <TextField select fullWidth size="small" label={f.label} name={f.name} defaultValue={savedCustom[f.name] || f.options?.[0] || ''}>
                                  {f.options?.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                </TextField>
                              </Grid>
                            );
                          } else if (f.type === 'boolean') {
                            return (
                              <Grid item xs={6} key={f.name}>
                                <FormControlLabel control={<Checkbox name={f.name} defaultChecked={!!savedCustom[f.name]} />} label={f.label} />
                              </Grid>
                            );
                          } else {
                            return (
                              <Grid item xs={6} key={f.name}>
                                <TextField fullWidth size="small" label={f.label} name={f.name} type={f.type} defaultValue={savedCustom[f.name] || ''} />
                              </Grid>
                            );
                          }
                        })}
                      </Grid>
                    </Grid>
                  );
                }
                return null;
              })()}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Save Clinical Profile</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 2. Register Pregnancy Dialog */}
      <Dialog open={pregnancyDialogOpen} onClose={() => setPregnancyDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSavePregnancy}>
          <DialogTitle>Register Active Pregnancy Cycle</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Select ANC Card Template (Replica Layout)"
                  value={ancTemplate}
                  onChange={(e) => setAncTemplate(e.target.value)}
                >
                  {ANC_TEMPLATES.map(t => <MenuItem key={t.name} value={t.name}>{t.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="LMP Date" type="date" value={lmpDate} onChange={(e) => handleLmpChange(e.target.value)} InputLabelProps={{ shrink: true }} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Calculated EDD Date" type="date" value={eddDate} InputLabelProps={{ shrink: true }} disabled />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Gestation Number" type="number" value={gestationNum} onChange={(e) => setGestationNum(Number(e.target.value) || 1)} />
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Risk Status Level" value={isHighRisk ? 'true' : 'false'} onChange={(e) => setIsHighRisk(e.target.value === 'true')}>
                  <MenuItem value="false">Low Risk</MenuItem>
                  <MenuItem value="true">High Risk</MenuItem>
                </TextField>
              </Grid>
              {isHighRisk && (
                <Grid item xs={12}>
                  <TextField fullWidth label="Indicate Risk Factors" name="riskFactors" defaultValue={activePregnancy?.riskFactors || ''} placeholder="e.g. Severe pre-eclampsia, twins, severe anemia" />
                </Grid>
              )}

              {/* Birth Preparedness Plan */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Birth Preparedness Plan (BPP)</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}><TextField fullWidth size="small" label="Preferred Delivery Facility" name="preferredPlaceOfDelivery" defaultValue={activePregnancy?.preferredPlaceOfDelivery || ''} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="Designated Blood Donor" name="bloodDonorPlanned" defaultValue={activePregnancy?.bloodDonorPlanned || ''} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="Emergency Companion Name" name="emergencyContactName" defaultValue={activePregnancy?.emergencyContactName || ''} /></Grid>
                  <Grid item xs={6}>
                    <TextField 
                      fullWidth 
                      size="small" 
                      label="Companion Phone" 
                      name="emergencyContactPhone" 
                      value={formEmergencyPhone} 
                      onChange={(e) => setFormEmergencyPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      inputProps={{ maxLength: 11 }}
                    />
                  </Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="Transport Arrangements" name="transportArrangements" defaultValue={activePregnancy?.transportArrangements || ''} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="Preferred Birth Companion" name="birthCompanion" defaultValue={activePregnancy?.birthCompanion || ''} /></Grid>
                </Grid>
              </Grid>

              {/* Custom fields configured by active template */}
              {(() => {
                const activeTemplate = ANC_TEMPLATES.find(t => t.name === ancTemplate);
                if (activeTemplate && activeTemplate.pregnancyFields.length > 0) {
                  let savedCustom: Record<string, any> = {};
                  if (activePregnancy?.customFields) {
                    try {
                      savedCustom = JSON.parse(activePregnancy.customFields);
                    } catch (e) {
                      savedCustom = {};
                    }
                  }
                  return (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: PRIMARY }}>Template-Specific Fields ({activeTemplate.name})</Typography>
                      <Grid container spacing={2}>
                        {activeTemplate.pregnancyFields.map(f => {
                          if (f.type === 'select') {
                            const optionsToRender = f.name === 'consultant' ? (doctorsList.length > 0 ? doctorsList : ['Dr. Emmanuel Vegher']) : f.options;
                            return (
                              <Grid item xs={6} key={f.name}>
                                <TextField select fullWidth size="small" label={f.label} name={f.name} defaultValue={savedCustom[f.name] || optionsToRender?.[0] || ''}>
                                  {optionsToRender?.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                </TextField>
                              </Grid>
                            );
                          } else if (f.type === 'boolean') {
                            return (
                              <Grid item xs={6} key={f.name}>
                                <FormControlLabel control={<Checkbox name={f.name} defaultChecked={!!savedCustom[f.name]} />} label={f.label} />
                              </Grid>
                            );
                          } else {
                            return (
                              <Grid item xs={6} key={f.name}>
                                <TextField fullWidth size="small" label={f.label} name={f.name} type={f.type} defaultValue={savedCustom[f.name] || ''} />
                              </Grid>
                            );
                          }
                        })}
                      </Grid>
                    </Grid>
                  );
                }
                return null;
              })()}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPregnancyDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Register Pregnancy</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 3. Routine ANC Visit Log Dialog */}
      <Dialog open={visitLogDialogOpen} onClose={() => { setVisitLogDialogOpen(false); setEditingVisitLog(null); }} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveVisitLog} key={editingVisitLog?.id || 'new'}>
          <DialogTitle>{editingVisitLog ? 'Edit Routine Antenatal Checkup' : 'Log Routine Antenatal Checkup'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2.5}>
              <Grid item xs={6}>
                <TextField fullWidth label="Fundal Height (cm)" value={visitFundalHeight} onChange={(e) => setVisitFundalHeight(e.target.value)} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Fetal Heart Rate (bpm)" type="number" value={visitFhr} onChange={(e) => setVisitFhr(Number(e.target.value) || 0)} required />
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Fetal Lie" value={visitFLie} onChange={(e) => setVisitFLie(e.target.value)}>
                  <MenuItem value="Longitudinal">Longitudinal</MenuItem>
                  <MenuItem value="Transverse">Transverse</MenuItem>
                  <MenuItem value="Oblique">Oblique</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Fetal Presentation" value={visitFPresentation} onChange={(e) => setVisitFPresentation(e.target.value)}>
                  <MenuItem value="Cephalic">Cephalic (Head)</MenuItem>
                  <MenuItem value="Breech">Breech (Buttocks)</MenuItem>
                  <MenuItem value="Shoulder">Shoulder / Arm</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Maternal BP (mmHg)" value={visitBP} onChange={(e) => setVisitBP(e.target.value)} placeholder="e.g. 120/80" required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Maternal Weight (kg)" type="number" value={visitWeight} onChange={(e) => setVisitWeight(e.target.value)} required />
              </Grid>

              {/* Urinalysis Dipstick */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Dipstick Urinalysis</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField select fullWidth size="small" label="Urine Protein" name="protein" defaultValue={editingVisitLog ? editingVisitLog.urineProtein || 'NIL' : 'NIL'}>
                      <MenuItem value="NIL">Nil</MenuItem>
                      <MenuItem value="TRACE">Trace</MenuItem>
                      <MenuItem value="+1">+1 (Light)</MenuItem>
                      <MenuItem value="+2">+2 (Mod)</MenuItem>
                      <MenuItem value="+3">+3 (Severe)</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField select fullWidth size="small" label="Urine Glucose" name="glucose" defaultValue={editingVisitLog ? editingVisitLog.urineGlucose || 'NIL' : 'NIL'}>
                      <MenuItem value="NIL">Nil</MenuItem>
                      <MenuItem value="TRACE">Trace</MenuItem>
                      <MenuItem value="+1">+1</MenuItem>
                      <MenuItem value="+2">+2</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </Grid>

              {/* Vaccines & Meds dispensed on hand */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Hand-dispensed Meds & Vaccines</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField fullWidth size="small" label="Routine Meds (e.g. Iron, Folic)" name="meds" placeholder="e.g. Iron Tabs 200mg, Folic Acid 5mg" />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField fullWidth size="small" label="Immunizations Given (e.g. TT)" name="immunization" placeholder="e.g. Tetanus Toxoid (TT1)" />
                  </Grid>
                </Grid>
              </Grid>

              {/* Health Education check */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Clinician Counselling Checklist</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}><FormControlLabel control={<Checkbox name="nutrition" defaultChecked={editingVisitLog ? editingVisitLog.educationTopics?.includes('Nutrition') : true} />} label="ANC Nutrition" /></Grid>
                  <Grid item xs={4}><FormControlLabel control={<Checkbox name="dangerSigns" defaultChecked={editingVisitLog ? editingVisitLog.dangerSigns === 'Yes' : true} />} label="Obstetric Danger Signs" /></Grid>
                  <Grid item xs={4}><FormControlLabel control={<Checkbox name="birthPrep" defaultChecked={editingVisitLog ? editingVisitLog.educationTopics?.includes('Birth Prep') : true} />} label="Birth Preparedness" /></Grid>
                </Grid>
              </Grid>

              <Grid item xs={6}>
                <TextField fullWidth label="Next Scheduled ANC Visit Date" name="nextAppt" type="date" defaultValue={editingVisitLog?.nextVisitDate ? new Date(editingVisitLog.nextVisitDate).toISOString().slice(0, 10) : ''} InputLabelProps={{ shrink: true }} inputProps={{ min: tomorrowStr }} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={2} label="Clinical Summary Notes" name="notes" placeholder="Write physical assessment observations and checkup findings..." />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setVisitLogDialogOpen(false); setEditingVisitLog(null); }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>{editingVisitLog ? 'Save Changes' : 'Submit Visit Note'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 4. Log Ultrasound Scan report Dialog */}
      <Dialog open={scanReportDialogOpen} onClose={() => { setScanReportDialogOpen(false); setEditingScanReport(null); }} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveScanReport} key={editingScanReport?.id || 'new'}>
          <DialogTitle>{editingScanReport ? 'Edit Obstetric Ultrasound Scan' : 'Record Obstetric Ultrasound Scan'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2.5}>
              <Grid item xs={6}>
                <TextField fullWidth label="Scan Date" name="scanDate" type="date" defaultValue={editingScanReport ? new Date(editingScanReport.performedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)} InputLabelProps={{ shrink: true }} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="GA by Scan (Weeks)" name="gaWeeks" type="number" defaultValue={editingScanReport ? editingScanReport.gestationalAgeWeeks || '' : ''} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Fetus Count" name="fetuses" type="number" defaultValue={1} required />
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Placenta Location" name="placenta" defaultValue={editingScanReport ? editingScanReport.placentaLocation || 'Anterior' : 'Anterior'}>
                  <MenuItem value="Anterior">Anterior</MenuItem>
                  <MenuItem value="Posterior">Posterior</MenuItem>
                  <MenuItem value="Fundal">Fundal</MenuItem>
                  <MenuItem value="Previa">Placenta Previa</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Est Fetal Weight (grams)" name="weight" type="number" defaultValue={editingScanReport ? editingScanReport.estimatedFetalWeight || '' : ''} />
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Amniotic Fluid Volume" name="amniotic" defaultValue={editingScanReport ? (editingScanReport.reportNotes?.includes('Oligohydramnios') ? 'Oligohydramnios' : editingScanReport.reportNotes?.includes('Polyhydramnios') ? 'Polyhydramnios' : 'Normal') : 'Normal'}>
                  <MenuItem value="Normal">Normal</MenuItem>
                  <MenuItem value="Oligohydramnios">Oligohydramnios (Low)</MenuItem>
                  <MenuItem value="Polyhydramnios">Polyhydramnios (High)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Congenital Anomalies Screen" name="anomalies" defaultValue={editingScanReport ? editingScanReport.anomalyDetails || 'None detected' : 'None detected'} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Sonographer Name" name="sonographer" defaultValue={editingScanReport ? editingScanReport.reportedBy || '' : ''} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={3} label="Ultrasound Findings Summary" name="findings" defaultValue={editingScanReport ? editingScanReport.reportNotes?.replace(/\s*\(Amniotic Fluid:.*\)\s*/, '') || '' : ''} placeholder="Describe fetal presentation, cardiac activity, and scan details..." required />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setScanReportDialogOpen(false); setEditingScanReport(null); }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>{editingScanReport ? 'Save Changes' : 'Submit Scan Report'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 5. Log Complication Episode Dialog */}
      <Dialog open={complicationDialogOpen} onClose={() => { setComplicationDialogOpen(false); setEditingComplication(null); }} maxWidth="xs" fullWidth>
        <form onSubmit={handleSaveComplication} key={editingComplication?.id || 'new'}>
          <DialogTitle>{editingComplication ? 'Edit High-risk Complication Episode' : 'Flag High-risk Complication Episode'}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5}>
              <TextField select fullWidth label="Complication Diagnosis" name="complicationType" defaultValue={editingComplication ? editingComplication.complicationType : "Gestational Hypertension"}>
                <MenuItem value="Gestational Hypertension">Gestational Hypertension</MenuItem>
                <MenuItem value="Severe Pre-Eclampsia">Severe Pre-Eclampsia</MenuItem>
                <MenuItem value="Gestational Diabetes">Gestational Diabetes Mellitus (GDM)</MenuItem>
                <MenuItem value="Severe Anemia in Pregnancy">Severe Anemia (Hb &lt; 7.0g/dL)</MenuItem>
                <MenuItem value="Antepartum Haemorrhage">Antepartum Haemorrhage (APH)</MenuItem>
                <MenuItem value="Multiple Gestation">Multiple Gestation (Twins/Triplets)</MenuItem>
                <MenuItem value="Breech Presentation in Late Pregnancy">Breech Presentation (&gt;36 weeks)</MenuItem>
                <MenuItem value="Rhesus Isoimmunization">Rhesus Isoimmunization</MenuItem>
              </TextField>
              <TextField select fullWidth label="Severity Index" name="severity" defaultValue={editingComplication ? editingComplication.severity : "SEVERE"}>
                <MenuItem value="MILD">Mild (Monitor carefully)</MenuItem>
                <MenuItem value="MODERATE">Moderate</MenuItem>
                <MenuItem value="SEVERE">Severe (Active Intervention)</MenuItem>
                <MenuItem value="LIFE_THREATENING">Critical / Life Threatening (Immediate Admission)</MenuItem>
              </TextField>
              <TextField fullWidth label="Diagnosis Date" name="diagnosisDate" type="date" defaultValue={editingComplication ? new Date(editingComplication.onsetDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)} InputLabelProps={{ shrink: true }} required />
              <TextField select fullWidth label="Referral Required?" name="referral" defaultValue="false">
                <MenuItem value="false">No (Manage in-house)</MenuItem>
                <MenuItem value="true">Yes (Refer to obstetrician / specialist)</MenuItem>
              </TextField>
              <TextField fullWidth label="Referral Target Facility" name="facility" placeholder="e.g. Teaching Hospital OBGYN ward" />
              <TextField fullWidth multiline rows={2} label="Management Intervention Notes" name="notes" defaultValue={editingComplication ? editingComplication.managementNotes || '' : ''} placeholder="Outline drug therapy, activity restrictions, or hospitalization plan..." required />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setComplicationDialogOpen(false); setEditingComplication(null); }}>Cancel</Button>
            <Button type="submit" variant="contained" color="error" disabled={loading}>{editingComplication ? 'Save Changes' : 'Flag Complication'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 6. Maternal Death Audit Dialog */}
      <Dialog open={deathDialogOpen} onClose={() => setDeathDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          try {
            setLoading(true);
            await axios.post('/api/maternity/death-review', {
              patientId,
              deathDate: new Date(),
              deathLocation: d.get('deathLocation'),
              deathCause: d.get('deathCause'),
              avoidability: d.get('avoidability'),
              findingsSummary: d.get('findingsSummary'),
              recommendations: d.get('recommendations'),
            });
            enqueueSnackbar('Maternal Death Review audit recorded successfully', { variant: 'success' });
            setDeathDialogOpen(false);
            fetchDashboardKPIs();
          } catch (err: any) {
            enqueueSnackbar('Failed to log death review', { variant: 'error' });
          } finally {
            setLoading(false);
          }
        }}>
          <DialogTitle>Audit Maternal Death Review (MDDR)</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField select fullWidth label="Death Location" name="deathLocation" defaultValue="WARD">
                  <MenuItem value="WARD">Labour / Postnatal Ward</MenuItem>
                  <MenuItem value="THEATRE">Operating Theatre</MenuItem>
                  <MenuItem value="EMERGENCY">Accident & Emergency</MenuItem>
                  <MenuItem value="ENROUTE">Enroute to facility</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Primary Cause of Death" name="deathCause" defaultValue="HAEMORRHAGE">
                  <MenuItem value="HAEMORRHAGE">Postpartum Haemorrhage (PPH)</MenuItem>
                  <MenuItem value="ECLAIMSIA">Eclampsia / Pre-eclampsia</MenuItem>
                  <MenuItem value="SEPSIS">Puerperal Sepsis</MenuItem>
                  <MenuItem value="EMBOLISM">Amniotic Fluid Embolism</MenuItem>
                  <MenuItem value="INDIRECT">Indirect Obstetric Cause</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField select fullWidth label="Avoidability Status" name="avoidability" defaultValue="AVOIDABLE">
                  <MenuItem value="AVOIDABLE">Avoidable Death</MenuItem>
                  <MenuItem value="NON_AVOIDABLE">Non-avoidable</MenuItem>
                  <MenuItem value="POSSIBLY_AVOIDABLE">Possibly Avoidable</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}><TextField fullWidth label="Summary of Review Findings" name="findingsSummary" multiline rows={3} required /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Clinical / Systemic Action Plan & Recommendations" name="recommendations" multiline rows={3} required /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeathDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="error" disabled={loading}>Submit Audit Report</Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* 18. Print ANC Card Dialog */}
      <Dialog open={printCardDialogOpen} onClose={() => setPrintCardDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Print Antenatal Card</span>
          <Button variant="contained" startIcon={<Print />} onClick={() => window.print()}>
            Print
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#f5f5f5' }}>
          <div id="printable-anc-card">
            <AncCardPrintTemplate 
              patient={selectedPatient}
              maternityProfile={maternityProfile}
              activePregnancy={activePregnancy}
              forceTemplate={ancTemplate}
            />
          </div>
          {/* Printable style overrides to hide everything else */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-anc-card, #printable-anc-card * {
                visibility: visible !important;
              }
              #printable-anc-card {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
              }
            }
          `}} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintCardDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Laboratory Order Dialog */}
      <Dialog open={Boolean(selectedLabOrder)} onClose={() => setSelectedLabOrder(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Laboratory Order</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Priority"
              value={editLabPriority}
              onChange={(e) => setEditLabPriority(e.target.value)}
              fullWidth
            >
              <MenuItem value="ROUTINE">Routine</MenuItem>
              <MenuItem value="URGENT">Urgent</MenuItem>
              <MenuItem value="STAT">Stat</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
            </TextField>

            <TextField
              select
              label="Billing Status"
              value={editLabPaymentStatus}
              onChange={(e) => setEditLabPaymentStatus(e.target.value)}
              fullWidth
            >
              <MenuItem value="UNPAID">Unpaid</MenuItem>
              <MenuItem value="PAID">Paid</MenuItem>
              <MenuItem value="WAIVED">Waived</MenuItem>
              <MenuItem value="INSURANCE">Insurance</MenuItem>
            </TextField>

            <TextField
              label="Diagnosis / Indication"
              value={editLabDiagnosis}
              onChange={(e) => setEditLabDiagnosis(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />

            <TextField
              label="Clinical Notes"
              value={editLabNotes}
              onChange={(e) => setEditLabNotes(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLabOrder(null)}>Cancel</Button>
          <Button onClick={handleUpdateLabOrder} variant="contained" color="primary" disabled={loading}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Prescription Dialog */}
      <Dialog open={Boolean(selectedPrescription)} onClose={() => setSelectedPrescription(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Prescription Order</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Priority"
              value={editPresPriority}
              onChange={(e) => setEditPresPriority(e.target.value)}
              fullWidth
            >
              <MenuItem value="ROUTINE">Routine</MenuItem>
              <MenuItem value="URGENT">Urgent</MenuItem>
              <MenuItem value="STAT">Stat</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
            </TextField>

            <TextField
              select
              label="Billing Status"
              value={editPresPaymentStatus}
              onChange={(e) => setEditPresPaymentStatus(e.target.value)}
              fullWidth
            >
              <MenuItem value="UNPAID">Unpaid</MenuItem>
              <MenuItem value="PAID">Paid</MenuItem>
              <MenuItem value="WAIVED">Waived</MenuItem>
              <MenuItem value="INSURANCE">Insurance</MenuItem>
            </TextField>

            <TextField
              label="Diagnosis / Indication"
              value={editPresDiagnosis}
              onChange={(e) => setEditPresDiagnosis(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />

            <TextField
              label="Clinical Notes"
              value={editPresNotes}
              onChange={(e) => setEditPresNotes(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedPrescription(null)}>Cancel</Button>
          <Button onClick={handleUpdatePrescription} variant="contained" color="primary" disabled={loading}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* End Pregnancy Cycle Dialog */}
      <Dialog open={endCycleDialogOpen} onClose={() => setEndCycleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Discharge / End Pregnancy Cycle</DialogTitle>
        <DialogContent dividers sx={{ pb: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              You are about to end the active pregnancy cycle for this patient. This will close the current antenatal episode so a new cycle can be initialized when needed.
            </Typography>
            <TextField
              select
              fullWidth
              label="Select Pregnancy Outcome"
              value={endCycleOutcome}
              onChange={(e) => setEndCycleOutcome(e.target.value)}
            >
              <MenuItem value="DELIVERED">Delivered (Successful birth)</MenuItem>
              <MenuItem value="ABORTED">Aborted / Miscarriage</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEndCycleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEndPregnancyCycle} variant="contained" color="error" disabled={loading}>
            End Cycle Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* External Registration Modal */}
      <QuickExternalRegisterModal 
        open={openExternalModal} 
        onClose={() => setOpenExternalModal(false)} 
        serviceType="ANC"
        onSuccess={fetchPatients}
      />

      {/* Quick Appointment Modal */}
      <QuickAppointmentModal 
        open={openApptModal} 
        onClose={() => setOpenApptModal(false)} 
        defaultVisitType="ANC" 
      />
    </Box>
  );
};

export default AncWorkspace;
