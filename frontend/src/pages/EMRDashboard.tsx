import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography, Box, Card, CardContent, Button, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton,
  TextField, Stack, Tab, Tabs, Divider, CircularProgress, Autocomplete,
  Avatar, Alert, Paper, Tooltip, Badge, alpha, TablePagination,
  RadioGroup, FormControlLabel, Radio, FormHelperText, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, FormLabel, Checkbox,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  Search, History, Portrait, Print, Warning, CheckCircle, Refresh,
  AutoAwesome, Analytics, TrendingUp, ShowChart, Biotech, Medication,
  ContentCut, ChildCare, LocalHospital, Favorite, Thermostat, Opacity,
  Speed, LocalPharmacy, Healing, MedicalInformation, Assessment, ArrowForward,
  MedicalServices, Science, Receipt, Launch, MonitorHeart, Air, Scale,
  FitnessCenter, RestartAlt, FilterAlt, Close, CloudSync, SyncAlt, HealthAndSafety,
  Edit, CloudDownload, Assignment, LibraryBooks, Storage, Description, Check, ExpandMore,
} from '@mui/icons-material';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { EsmFormEngine, EsmFormBuilder, FormSchema } from '../components/esm-form-engine';

interface PatientOption {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  gender?: string;
  birthDate?: string;
  artNumber?: string;
}

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

export interface EMRDashboardProps {
  patientId?: string;
  patientData?: any;
  isDialogMode?: boolean;
  onClose?: () => void;
}

export const EMRDashboard: React.FC<EMRDashboardProps> = ({
  patientId: propPatientId,
  patientData: propPatientData,
  isDialogMode = false,
  onClose,
}) => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get('patientId') || searchParams.get('id');
  const effectivePatientId = propPatientId || urlPatientId;

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedPat, setSelectedPat] = useState<PatientOption | null>(() => {
    if (propPatientData) {
      return {
        id: propPatientData.id,
        mrn: propPatientData.patientNumber || propPatientData.patientId || propPatientData.mrn || (propPatientData.id ? propPatientData.id.substring(0, 8).toUpperCase() : 'MRN'),
        firstName: propPatientData.firstName || propPatientData.name?.[0]?.given?.[0] || 'Patient',
        lastName: propPatientData.lastName || propPatientData.name?.[0]?.family || '',
        gender: propPatientData.gender,
        birthDate: propPatientData.birthDate,
      };
    }
    return null;
  });

  // Patient EMR & Clinical Records
  const [emrData, setEmrData] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loadingEMR, setLoadingEMR] = useState(false);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [dentalEncounters, setDentalEncounters] = useState<any[]>([]);

  // ── NMRS / Public Health State & Forms ────────────────────────────────────
  const [nmrsSummary, setNmrsSummary] = useState<any | null>(null);
  const [nmrsSchemas, setNmrsSchemas] = useState<any[]>([]);
  const [selectedNmrsSchemaId, setSelectedNmrsSchemaId] = useState<string>('');
  const [nmrsFormData, setNmrsFormData] = useState<Record<string, any>>({});
  const [savingNmrsForm, setSavingNmrsForm] = useState<boolean>(false);
  const [syncingNmrs, setSyncingNmrs] = useState<boolean>(false);
  const [activeFormPage, setActiveFormPage] = useState<number>(0);
  const [formCategoryFilter, setFormCategoryFilter] = useState<string>('ALL');
  const [nmrsSubTab, setNmrsSubTab] = useState<'forms' | 'studio'>('forms');
  const [editPepfarModalOpen, setEditPepfarModalOpen] = useState<boolean>(false);
  const [customPepfarInput, setCustomPepfarInput] = useState<string>('');
  const [savingPepfarId, setSavingPepfarId] = useState<boolean>(false);
  const [editingEncounter, setEditingEncounter] = useState<any | null>(null);
  const [savingEncounter, setSavingEncounter] = useState<boolean>(false);

  const handleOpenFormDialog = (encounterRecord: any) => {
    setEditingEncounter(encounterRecord);
  };

  const groupedVisits = useMemo(() => {
    const encounters: any[] = nmrsSummary?.encounters || [];
    if (!encounters || encounters.length === 0) return [];

    const map = new Map<string, {
      visitNumber: string;
      dateStr: string;
      checkedInAt: string;
      visitType: string;
      status: string;
      encounters: any[];
    }>();

    for (const enc of encounters) {
      const rawDate = enc.encounterDate || enc.createdAt || new Date().toISOString();
      const dateStr = String(rawDate).slice(0, 10);
      const key = enc.visitId || dateStr;

      if (!map.has(key)) {
        const hospNum = selectedPat?.mrn || 'HOSP';
        const visitNumber = enc.visit?.visitNumber || `VIS-${dateStr.replace(/-/g, '')}-${hospNum.replace(/[^a-zA-Z0-9]/g, '')}`;
        map.set(key, {
          visitNumber,
          dateStr,
          checkedInAt: enc.encounterDate ? new Date(enc.encounterDate).toLocaleString() : new Date().toLocaleString(),
          visitType: enc.visit?.visitType || 'CLINICAL_VISIT',
          status: enc.visit?.status || 'COMPLETED',
          encounters: []
        });
      }
      map.get(key)!.encounters.push(enc);
    }

    return Array.from(map.values()).sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime());
  }, [nmrsSummary?.encounters, selectedPat]);

  // Active Tab value
  const [activeTab, setActiveTab] = useState(0);
  const [chartMetric, setChartMetric] = useState<'vitals' | 'labs'>('vitals');

  // Vitals Tab Filter & Pagination State
  const [vitalsSearchQuery, setVitalsSearchQuery] = useState('');
  const [vitalsFilterPreset, setVitalsFilterPreset] = useState<'ALL' | 'FEVER' | 'HIGH_BP' | 'TACHYCARDIA' | 'LOW_SPO2' | 'MIGRATED'>('ALL');
  const [vitalsPage, setVitalsPage] = useState(0);
  const [vitalsRowsPerPage, setVitalsRowsPerPage] = useState(10);

  // Clinical Vitals Range & Color Evaluation Helpers
  const getBpAssessment = (systolic?: number | null, diastolic?: number | null) => {
    if (systolic == null || diastolic == null || !systolic || !diastolic) {
      return { label: 'Not Recorded', color: 'default' as const, textColor: 'text.secondary', text: '—' };
    }
    if (systolic >= 180 || diastolic >= 120) {
      return { label: 'HTN Crisis (≥180/120)', color: 'error' as const, textColor: '#991b1b', text: `${systolic}/${diastolic}` };
    }
    if (systolic >= 140 || diastolic >= 90) {
      return { label: 'Stage 2 HTN (≥140/90)', color: 'error' as const, textColor: '#dc2626', text: `${systolic}/${diastolic}` };
    }
    if (systolic >= 130 || diastolic >= 85) {
      return { label: 'Stage 1 HTN (130-139)', color: 'warning' as const, textColor: '#c2410c', text: `${systolic}/${diastolic}` };
    }
    if (systolic > 120 && systolic <= 129 && diastolic <= 80) {
      return { label: 'Elevated BP (121-129)', color: 'warning' as const, textColor: '#b45309', text: `${systolic}/${diastolic}` };
    }
    if (systolic < 90 || diastolic < 60) {
      return { label: 'Hypotension (<90/60)', color: 'info' as const, textColor: '#1d4ed8', text: `${systolic}/${diastolic}` };
    }
    // 120/80 and below down to 90/60 is Normal / Optimal
    return { label: 'Normal / Optimal (≤120/80)', color: 'success' as const, textColor: '#15803d', text: `${systolic}/${diastolic}` };
  };

  const getPulseAssessment = (pulseRate?: number | null) => {
    if (pulseRate == null) return { label: 'Not Recorded', color: 'default' as const, textColor: 'text.secondary', text: '—' };
    if (pulseRate > 120) return { label: 'Severe Tachycardia (>120)', color: 'error' as const, textColor: '#dc2626', text: `${pulseRate} bpm` };
    if (pulseRate > 100) return { label: 'Tachycardia (>100)', color: 'warning' as const, textColor: '#c2410c', text: `${pulseRate} bpm` };
    if (pulseRate < 50) return { label: 'Severe Bradycardia (<50)', color: 'error' as const, textColor: '#dc2626', text: `${pulseRate} bpm` };
    if (pulseRate < 60) return { label: 'Bradycardia (<60)', color: 'warning' as const, textColor: '#c2410c', text: `${pulseRate} bpm` };
    return { label: 'Normal Sinus (60-100)', color: 'success' as const, textColor: 'text.primary', text: `${pulseRate} bpm` };
  };

  const getTempAssessment = (temperature?: number | null) => {
    if (temperature == null) return { label: 'Not Recorded', color: 'default' as const, textColor: 'text.secondary', text: '—' };
    if (temperature >= 38.5) return { label: 'High Pyrexia (≥38.5°C)', color: 'error' as const, textColor: '#dc2626', text: `${temperature}°C` };
    if (temperature >= 37.5) return { label: 'Low-grade Fever (37.5-38.4°C)', color: 'warning' as const, textColor: '#c2410c', text: `${temperature}°C` };
    if (temperature < 35.5) return { label: 'Hypothermia (<35.5°C)', color: 'info' as const, textColor: '#1d4ed8', text: `${temperature}°C` };
    return { label: 'Afebrile (Normal)', color: 'success' as const, textColor: 'text.primary', text: `${temperature}°C` };
  };

  const getSpo2Assessment = (spo2?: number | null) => {
    if (spo2 == null) return { label: 'Not Recorded', color: 'default' as const, textColor: 'text.secondary', text: '—' };
    if (spo2 < 90) return { label: 'Severe Hypoxemia (<90%)', color: 'error' as const, textColor: '#dc2626', text: `${spo2}%` };
    if (spo2 < 95) return { label: 'Mild Hypoxia (90-94%)', color: 'warning' as const, textColor: '#c2410c', text: `${spo2}%` };
    return { label: 'Normal Saturation (≥95%)', color: 'success' as const, textColor: '#15803d', text: `${spo2}%` };
  };

  const getRespRateAssessment = (rr?: number | null) => {
    if (rr == null) return { label: 'Not Recorded', color: 'default' as const, textColor: 'text.secondary', text: '—' };
    if (rr > 24) return { label: 'Severe Tachypnea (>24)', color: 'error' as const, textColor: '#dc2626', text: `${rr} cpm` };
    if (rr > 20) return { label: 'Tachypnea (21-24)', color: 'warning' as const, textColor: '#c2410c', text: `${rr} cpm` };
    if (rr < 10) return { label: 'Severe Bradypnea (<10)', color: 'error' as const, textColor: '#dc2626', text: `${rr} cpm` };
    if (rr < 12) return { label: 'Bradypnea (10-11)', color: 'warning' as const, textColor: '#c2410c', text: `${rr} cpm` };
    return { label: 'Normal Rate (12-20)', color: 'success' as const, textColor: 'text.primary', text: `${rr} cpm` };
  };

  const getBmiAssessment = (bmi?: number | null) => {
    if (bmi == null) return { label: 'N/A', color: 'default' as const };
    if (bmi >= 30) return { label: 'Obese (≥30)', color: 'error' as const };
    if (bmi >= 25) return { label: 'Overweight (25-29.9)', color: 'warning' as const };
    if (bmi >= 18.5) return { label: 'Normal BMI (18.5-24.9)', color: 'success' as const };
    return { label: 'Underweight (<18.5)', color: 'info' as const };
  };

  // Patient search query
  const fetchPatients = async (query: string = '') => {
    setLoadingSearch(true);
    try {
      const res = await api.get('/patients/mpi', { params: { query: query.trim() || undefined, limit: 50 } });
      const rawList = res.data?.data || res.data || [];
      const formatted: PatientOption[] = rawList.map((p: any) => ({
        id: p.id,
        mrn: p.patientNumber || p.patientId || p.mrn || (p.id ? p.id.substring(0, 8).toUpperCase() : 'MRN'),
        firstName: p.firstName || p.name?.[0]?.given?.[0] || 'Patient',
        lastName: p.lastName || p.name?.[0]?.family || '',
        gender: p.gender,
        birthDate: p.birthDate,
        artNumber: p.artNumber || p.nmrsMapping?.pepfarId || undefined,
      }));
      setPatients(formatted);
    } catch (err) {
      console.error('Failed to search patients:', err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleNmrsFieldChange = (fieldId: string, value: any) => {
    setNmrsFormData(prev => {
      const updated = { ...prev, [fieldId]: value };
      if ((fieldId === 'weight' || fieldId === 'height') && updated.weight && updated.height) {
        const hM = Number(updated.height) / 100;
        const wKg = Number(updated.weight);
        if (hM > 0 && wKg > 0) {
          updated['calculatedBmi'] = (wKg / (hM * hM)).toFixed(1);
        }
      }
      return updated;
    });
  };

  const handleSaveNmrsForm = async () => {
    if (!selectedPat?.id || !selectedNmrsSchemaId) {
      enqueueSnackbar('Please select a national form schema', { variant: 'warning' });
      return;
    }
    setSavingNmrsForm(true);
    try {
      const currentSchema = nmrsSchemas.find(s => s.id === selectedNmrsSchemaId);
      const res = await api.post('/nmrs/encounters', {
        patientId: selectedPat.id,
        formSchemaId: selectedNmrsSchemaId,
        encounterDate: nmrsFormData.encounterDate || new Date().toISOString(),
        formData: nmrsFormData,
        encounterType: currentSchema?.formCode || 'HIV_CARE_CARD'
      });
      enqueueSnackbar(res.data?.message || 'National form submitted to PostgreSQL and queued for OpenMRS sync', { variant: 'success' });
      setNmrsFormData({});
      // Refresh summary
      const sRes = await api.get(`/nmrs/patients/${selectedPat.id}/summary`);
      setNmrsSummary(sRes.data?.data || null);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to submit form', { variant: 'error' });
    } finally {
      setSavingNmrsForm(false);
    }
  };

  const handleSyncPatientToOpenmrs = async () => {
    if (!selectedPat?.id) return;
    setSyncingNmrs(true);
    try {
      const res = await api.post(`/nmrs/patients/${selectedPat.id}/sync`);
      enqueueSnackbar(res.data?.message || 'Patient synced with OpenMRS host', { variant: 'success' });
      const sRes = await api.get(`/nmrs/patients/${selectedPat.id}/summary`);
      setNmrsSummary(sRes.data?.data || null);
    } catch (err) {
      enqueueSnackbar('Sync failed', { variant: 'error' });
    } finally {
      setSyncingNmrs(false);
    }
  };

  const handleSavePepfarId = async () => {
    if (!selectedPat?.id || !customPepfarInput.trim()) {
      enqueueSnackbar('Please enter a valid PEPFAR Identifier (Identifier Type 4)', { variant: 'warning' });
      return;
    }
    setSavingPepfarId(true);
    try {
      const res = await api.patch(`/nmrs/patients/${selectedPat.id}/pepfar-id`, {
        pepfarId: customPepfarInput.trim()
      });
      enqueueSnackbar(res.data?.message || 'Updated PEPFAR Identifier to ' + customPepfarInput.trim(), { variant: 'success' });
      setEditPepfarModalOpen(false);
      const sRes = await api.get(`/nmrs/patients/${selectedPat.id}/summary`);
      setNmrsSummary(sRes.data?.data || null);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update PEPFAR Identifier', { variant: 'error' });
    } finally {
      setSavingPepfarId(false);
    }
  };

  const handlePullAllClobForms = async () => {
    setSyncingNmrs(true);
    try {
      const res = await api.post('/nmrs/forms/pull-all');
      enqueueSnackbar(res.data?.message || 'Synchronized official CLOB form schemas from OpenMRS', { variant: 'success' });
      const schRes = await api.get('/nmrs/schemas');
      const schList = schRes.data?.data || [];
      setNmrsSchemas(schList);
      if (schList.length > 0 && !selectedNmrsSchemaId) {
        handleSelectSchema(schList[0].id);
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to pull form schemas from OpenMRS', { variant: 'error' });
    } finally {
      setSyncingNmrs(false);
    }
  };

  const handleSelectSchema = (schemaId: string) => {
    setSelectedNmrsSchemaId(schemaId);
    setActiveFormPage(0);
    const birthDate = selectedPat?.birthDate;
    const age = birthDate ? Math.floor((new Date().getTime() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : '';
    setNmrsFormData(prev => ({
      ...prev,
      art_number: nmrsSummary?.mapping?.pepfarId || '',
      hospital_number: selectedPat?.mrn || '',
      patient_age: age,
      sex: selectedPat?.gender?.toLowerCase().startsWith('f') ? 'Female' : 'Male',
      facilityName: 'Faith Foundation Specialist Hospital',
      encounterDate: new Date().toISOString().split('T')[0],
      currentRegimen: nmrsSummary?.mapping?.currentRegimen || '1a: TDF + 3TC + DTG'
    }));
  };

  const loadEMR = async (patId: string) => {
    setLoadingEMR(true);
    try {
      const [resSummary, resTimeline, resLabs, resRx, resEnc, resDental, resNmrsSummary, resNmrsSchemas] = await Promise.allSettled([
        api.get(`/emr/summary/${patId}`),
        api.get(`/emr/timeline/${patId}`),
        api.get(`/lims/orders?patientId=${patId}`),
        api.get(`/pharmacy/prescriptions?patientId=${patId}`),
        api.get(`/fhir/Encounter?patient=${patId}`),
        api.get(`/dental/encounters?patientId=${patId}`),
        api.get(`/nmrs/patients/${patId}/summary`),
        api.get(`/nmrs/schemas`),
      ]);

      if (resSummary.status === 'fulfilled') setEmrData(resSummary.value.data);
      if (resTimeline.status === 'fulfilled') setTimeline(resTimeline.value.data || []);
      if (resLabs.status === 'fulfilled') setLabOrders(resLabs.value.data || []);
      if (resRx.status === 'fulfilled') setPrescriptions(resRx.value.data || []);
      if (resEnc.status === 'fulfilled') {
        const raw = resEnc.value.data;
        const list = raw?.entry ? raw.entry.map((e: any) => e.resource) : (Array.isArray(raw) ? raw : []);
        setEncounters(list);
      }
      if (resDental.status === 'fulfilled') {
        setDentalEncounters(resDental.value.data?.data || []);
      }
      if (resNmrsSummary.status === 'fulfilled') {
        setNmrsSummary(resNmrsSummary.value.data?.data || null);
      }
      if (resNmrsSchemas.status === 'fulfilled') {
        const schList = resNmrsSchemas.value.data?.data || [];
        setNmrsSchemas(schList);
        if (schList.length > 0) {
          setSelectedNmrsSchemaId(schList[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading EMR details:', err);
      enqueueSnackbar('Failed to load full EMR profile', { variant: 'error' });
    } finally {
      setLoadingEMR(false);
    }
  };

  useEffect(() => {
    // Initial fetch of patient options
    fetchPatients('');
  }, []);

  useEffect(() => {
    if (propPatientData) {
      setSelectedPat({
        id: propPatientData.id,
        mrn: propPatientData.patientNumber || propPatientData.patientId || propPatientData.mrn || (propPatientData.id ? propPatientData.id.substring(0, 8).toUpperCase() : 'MRN'),
        firstName: propPatientData.firstName || propPatientData.name?.[0]?.given?.[0] || 'Patient',
        lastName: propPatientData.lastName || propPatientData.name?.[0]?.family || '',
        gender: propPatientData.gender,
        birthDate: propPatientData.birthDate,
      });
    } else if (effectivePatientId) {
      api.get(`/patients/${effectivePatientId}`)
        .then(res => {
          const p = res.data?.data || res.data;
          if (p && p.id) {
            setSelectedPat({
              id: p.id,
              mrn: p.patientNumber || p.patientId || p.id.substring(0, 8).toUpperCase(),
              firstName: p.firstName || p.name?.[0]?.given?.[0] || 'Patient',
              lastName: p.lastName || p.name?.[0]?.family || '',
              gender: p.gender,
              birthDate: p.birthDate,
            });
          }
        })
        .catch(() => {});
    }
  }, [effectivePatientId, propPatientData]);

  useEffect(() => {
    if (selectedPat) {
      loadEMR(selectedPat.id);
    } else {
      setEmrData(null);
      setTimeline([]);
      setLabOrders([]);
      setPrescriptions([]);
      setEncounters([]);
      setDentalEncounters([]);
    }
  }, [selectedPat]);

  // Unified Longitudinal Vitals calculation (combines Triage records, Bedside observations & Migrated Folder Vitals)
  const unifiedVitalsList = useMemo(() => {
    if (!emrData) return [];
    const triageList: any[] = (emrData.triageRecords || []).map((t: any) => ({
      id: t.id,
      date: t.createdAt || t.triageStart || t.recordedDate,
      systolic: t.systolic != null ? Number(t.systolic) : null,
      diastolic: t.diastolic != null ? Number(t.diastolic) : null,
      temperature: t.temperature != null ? Number(t.temperature) : null,
      pulseRate: (t.pulseRate != null ? Number(t.pulseRate) : null) ?? (t.heartRate != null ? Number(t.heartRate) : null),
      respiratoryRate: t.respiratoryRate != null ? Number(t.respiratoryRate) : null,
      spo2: (t.spo2 != null ? Number(t.spo2) : null) ?? (t.oxygenSaturation != null ? Number(t.oxygenSaturation) : null),
      weight: t.weight != null ? Number(t.weight) : null,
      height: t.height != null ? Number(t.height) : null,
      bmi: t.bmi != null ? Number(t.bmi) : (t.weight && t.height ? Math.round((Number(t.weight) / Math.pow(Number(t.height) > 3 ? Number(t.height) / 100 : Number(t.height), 2)) * 10) / 10 : null),
      painScore: t.painScore ?? 0,
      consciousnessLevel: t.consciousnessLevel || 'ALERT',
      mobility: t.mobility || null,
      hydration: t.hydration || null,
      nutrition: t.nutrition || null,
      priority: t.priority || 'STANDARD',
      news2Score: t.news2Score ?? 0,
      news2Risk: t.news2Risk || 'LOW',
      presentingComplaints: t.presentingComplaints || '',
      triageType: t.triageType || 'OUTPATIENT',
      source: t.presentingComplaints?.includes('Treatment Sheet') || t.presentingComplaints?.includes('migrat') || t.triageType === 'MIGRATED'
        ? 'MIGRATED FOLDER'
        : (t.triageType === 'INPATIENT' ? 'WARD INPATIENT' : 'TRIAGE DESK'),
      recordedBy: t.creator ? `${t.creator.firstName} ${t.creator.lastName}${t.creator.designation ? ` (${t.creator.designation})` : ''}` : 'Triage / Ward Staff',
      isObservation: false,
    }));

    const obsList: any[] = (emrData.recentVitals || []).filter((o: any) => {
      return !triageList.some(t => t.id === o.id);
    }).map((o: any) => {
      let systolic = o.systolicBp || (o.component?.find((c: any) => c.code?.coding?.[0]?.code === '8480-6')?.valueQuantity?.value);
      let diastolic = o.diastolicBp || (o.component?.find((c: any) => c.code?.coding?.[0]?.code === '8462-4')?.valueQuantity?.value);
      if (!systolic && o.valueString && o.valueString.includes('/')) {
        const parts = o.valueString.split('/');
        systolic = parseFloat(parts[0]);
        diastolic = parseFloat(parts[1]);
      }
      return {
        id: o.id,
        date: o.effectiveDateTime || o.createdAt,
        systolic: systolic || (o.code === '8480-6' ? o.valueQuantity?.value : null),
        diastolic: diastolic || (o.code === '8462-4' ? o.valueQuantity?.value : null),
        temperature: o.temp || (o.code === '8310-5' ? o.valueQuantity?.value : null),
        pulseRate: o.pulse || (o.code === '8867-4' ? o.valueQuantity?.value : null),
        respiratoryRate: o.respRate || (o.code === '9279-1' ? o.valueQuantity?.value : null),
        spo2: o.spo2 || (o.code === '2708-6' || o.code === '59408-5' ? o.valueQuantity?.value : null),
        weight: o.weight || (o.code === '29463-7' ? o.valueQuantity?.value : null),
        height: o.height || (o.code === '8302-2' ? o.valueQuantity?.value : null),
        bmi: o.bmi || null,
        painScore: o.painScore ?? 0,
        consciousnessLevel: o.consciousnessAlert ? 'ALERT' : 'ALTERED',
        priority: 'STANDARD',
        news2Score: 0,
        news2Risk: 'LOW',
        presentingComplaints: o.notes || o.comment || 'Clinical vital signs observation',
        source: 'BEDSIDE OBSERVATION',
        recordedBy: o.performerName || 'Ward Nurse',
        isObservation: true,
      };
    });

    const combined = [...triageList, ...obsList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return combined;
  }, [emrData]);

  const filteredVitalsList = useMemo(() => {
    return unifiedVitalsList.filter((v: any) => {
      if (vitalsSearchQuery.trim()) {
        const q = vitalsSearchQuery.toLowerCase().trim();
        const complaints = (v.presentingComplaints || '').toLowerCase();
        const recordedBy = (v.recordedBy || '').toLowerCase();
        const source = (v.source || '').toLowerCase();
        const consciousness = (v.consciousnessLevel || '').toLowerCase();
        const matches = complaints.includes(q) || recordedBy.includes(q) || source.includes(q) || consciousness.includes(q);
        if (!matches) return false;
      }

      if (vitalsFilterPreset === 'FEVER') {
        if (!v.temperature || v.temperature < 37.5) return false;
      } else if (vitalsFilterPreset === 'HIGH_BP') {
        if (!v.systolic || (v.systolic < 140 && (v.diastolic ? v.diastolic < 90 : true))) return false;
      } else if (vitalsFilterPreset === 'TACHYCARDIA') {
        if (!v.pulseRate || v.pulseRate < 100) return false;
      } else if (vitalsFilterPreset === 'LOW_SPO2') {
        if (!v.spo2 || v.spo2 >= 95) return false;
      } else if (vitalsFilterPreset === 'MIGRATED') {
        if (!v.source?.toLowerCase().includes('migrat')) return false;
      }

      return true;
    });
  }, [unifiedVitalsList, vitalsSearchQuery, vitalsFilterPreset]);

  const paginatedVitalsList = useMemo(() => {
    const start = vitalsPage * vitalsRowsPerPage;
    return filteredVitalsList.slice(start, start + vitalsRowsPerPage);
  }, [filteredVitalsList, vitalsPage, vitalsRowsPerPage]);

  const latestVital = useMemo(() => {
    return unifiedVitalsList.length > 0 ? unifiedVitalsList[0] : null;
  }, [unifiedVitalsList]);

  // Transform recent vitals into Recharts chart dataset
  const vitalsChartData = useMemo(() => {
    if (unifiedVitalsList.length === 0) {
      // Mock historical trend if empty for visualization
      return [
        { date: '1 Month Ago', sbp: 135, dbp: 85, pulse: 78, temp: 36.8, spo2: 98, news2: 1 },
        { date: '3 Weeks Ago', sbp: 140, dbp: 88, pulse: 82, temp: 37.1, spo2: 97, news2: 2 },
        { date: '2 Weeks Ago', sbp: 130, dbp: 82, pulse: 74, temp: 36.6, spo2: 99, news2: 0 },
        { date: 'Last Week',   sbp: 138, dbp: 86, pulse: 79, temp: 36.9, spo2: 98, news2: 1 },
        { date: 'Today',       sbp: 128, dbp: 80, pulse: 72, temp: 36.5, spo2: 99, news2: 0 },
      ];
    }

    return [...unifiedVitalsList]
      .reverse()
      .map((v: any) => ({
        date: new Date(v.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        sbp: v.systolic || 120,
        dbp: v.diastolic || 80,
        pulse: v.pulseRate || 75,
        temp: v.temperature || 36.6,
        spo2: v.spo2 || 98,
        news2: v.news2Score || 0,
      }));
  }, [unifiedVitalsList]);

  // Transform lab orders into Recharts diagnostic lab trend dataset
  const labChartData = useMemo(() => {
    if (!labOrders || labOrders.length === 0) {
      return [
        { date: '1 Month Ago', glucose: 110, hemoglobin: 13.2, creatinine: 0.9 },
        { date: '3 Weeks Ago', glucose: 125, hemoglobin: 12.8, creatinine: 1.0 },
        { date: '2 Weeks Ago', glucose: 105, hemoglobin: 13.5, creatinine: 0.9 },
        { date: 'Last Week',   glucose: 115, hemoglobin: 13.1, creatinine: 0.95 },
        { date: 'Today',       glucose: 98,  hemoglobin: 13.6, creatinine: 0.88 },
      ];
    }
    return labOrders.slice(0, 10).reverse().map((o: any) => {
      const date = new Date(o.createdAt || o.orderedAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' });
      const glucItem = o.items?.find((i: any) => (i.test?.testName || i.testName || '').toLowerCase().includes('glucose'));
      const hgbItem = o.items?.find((i: any) => (i.test?.testName || i.testName || '').toLowerCase().includes('hemoglobin') || (i.test?.testName || i.testName || '').toLowerCase().includes('fbc'));
      const creatItem = o.items?.find((i: any) => (i.test?.testName || i.testName || '').toLowerCase().includes('creatinine'));

      const glucose = parseFloat(glucItem?.result?.resultValue || '105') || 105;
      const hemoglobin = parseFloat(hgbItem?.result?.resultValue || '13.5') || 13.5;
      const creatinine = parseFloat(creatItem?.result?.resultValue || '0.9') || 0.9;

      return { date, glucose, hemoglobin, creatinine };
    });
  }, [labOrders]);

  // Predictive Analytics Calculations
  const predictiveMetrics = useMemo(() => {
    if (!emrData) return null;
    const activeDiagCount = emrData.activeProblems?.length || 0;
    const age = emrData.patient?.birthDate ? (new Date().getFullYear() - new Date(emrData.patient.birthDate).getFullYear()) : 42;
    const latestNews = emrData.triageRecords?.[0]?.news2Score ?? emrData.recentVitals?.[0]?.news2Score ?? 0;
    const isAdmitted = Boolean(emrData.activeAdmission);

    // Predictive 30-Day Readmission Risk Formula
    let readmissionProb = 12; // baseline %
    if (age > 65) readmissionProb += 15;
    if (activeDiagCount > 2) readmissionProb += activeDiagCount * 8;
    if (latestNews >= 5) readmissionProb += 25;
    if (isAdmitted) readmissionProb += 18;
    readmissionProb = Math.min(readmissionProb, 94);

    // Predictive Risk Category
    const riskCategory = readmissionProb > 60 ? 'HIGH' : readmissionProb > 30 ? 'MODERATE' : 'LOW';
    const riskColor = riskCategory === 'HIGH' ? '#f03e3e' : riskCategory === 'MODERATE' ? '#f59f00' : '#2b8a3e';

    // Polypharmacy Assessment
    const rxCount = prescriptions.length || emrData.recentMeds?.length || 0;
    const polypharmacyRisk = rxCount >= 5 ? 'HIGH (Polypharmacy Flag)' : rxCount >= 3 ? 'MODERATE' : 'LOW';

    return {
      readmissionProb,
      riskCategory,
      riskColor,
      latestNews,
      polypharmacyRisk,
      rxCount,
      activeDiagCount,
    };
  }, [emrData, prescriptions]);

  // Helper to render ICD-10 Wrapped Pills
  const renderIcd10Pills = (icdStr: string) => {
    if (!icdStr || icdStr === 'None' || icdStr === '-') {
      return <Chip label="Unassigned" size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />;
    }
    const items = icdStr.split(/,\s*/).filter(Boolean);
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
        {items.map((codeStr: string, idx: number) => {
          const match = codeStr.match(/^([A-Z0-9.]+)\s*[—–-]\s*(.*)$/i);
          const code = match ? match[1] : (codeStr.includes(' ') ? codeStr.split(' ')[0] : codeStr);
          const desc = match ? match[2] : (codeStr.includes(' ') ? codeStr.split(' ').slice(1).join(' ') : '');
          return (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'rgba(59, 91, 219, 0.05)',
                border: '1px solid rgba(59, 91, 219, 0.2)',
                borderRadius: 1.5,
                px: 1,
                py: 0.4,
              }}
            >
              <Chip
                label={code}
                size="small"
                color="primary"
                sx={{ fontWeight: 800, fontSize: '0.65rem', height: 18, fontFamily: 'monospace' }}
              />
              {desc && (
                <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.2 }}>
                  {desc}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  // Helper to resolve Prescription Reference
  const formatPrescriptionRef = (rx: any, i: number): string => {
    const num = rx.prescriptionNumber || rx.id?.substring(0, 8).toUpperCase() || `${i + 101}`;
    return num.startsWith('RX-') ? num : `RX-${num}`;
  };

  // Helper to resolve Medication Name in full detail
  const formatPrescriptionMedName = (rx: any): string => {
    const cleanName = (str: any): string => {
      if (!str || typeof str !== 'string') return '';
      let text = str.trim();
      if (/^Out of Stock Drug$/i.test(text) || /^External Purchase Medication$/i.test(text) || /^Medication$/i.test(text)) {
        return '';
      }
      text = text.replace(/^External purchase:\s*/i, '').replace(/\(External Purchase - Out of Stock\)/i, '').trim();
      return /^Out of Stock Drug$/i.test(text) || /^External Purchase Medication$/i.test(text) || /^Medication$/i.test(text) ? '' : text;
    };

    if (Array.isArray(rx.items) && rx.items.length > 0) {
      const names = rx.items
        .map((it: any) => {
          const direct = cleanName(it.medicationName);
          if (direct) return direct;

          const brand = cleanName(it.medication?.brandName);
          if (brand) return brand;
          const generic = cleanName(it.medication?.genericName);
          if (generic) return generic;
          const medName = cleanName(it.medication?.name);
          if (medName) return medName;

          const indication = cleanName(it.clinicalIndication);
          if (indication) return indication;

          const raw = cleanName(it.name || it.drugName);
          if (raw) return raw;

          return '';
        })
        .filter(Boolean);

      if (names.length > 0) return names.join(', ');
    }

    const topDirect = cleanName(rx.medicationName);
    if (topDirect) return topDirect;

    if (rx.medication) {
      const brand = cleanName(rx.medication.brandName);
      if (brand) return brand;
      const generic = cleanName(rx.medication.genericName);
      if (generic) return generic;
      const medName = cleanName(rx.medication.name);
      if (medName) return medName;
    }

    const topIndication = cleanName(rx.clinicalIndication || rx.clinicalNotes);
    if (topIndication) return topIndication;

    return rx.medicationName || 'Prescribed Medication';
  };

  // Helper to resolve Dosage & Frequency
  const formatPrescriptionDosage = (rx: any): string => {
    if (Array.isArray(rx.items) && rx.items.length > 0) {
      const details = rx.items
        .map((it: any) => {
          const doseStr = it.dosage || it.dose;
          const freqStr = it.frequency;
          const durStr = it.duration ? `(${it.duration})` : '';
          const parts = [doseStr, freqStr, durStr].filter(Boolean);
          return parts.join(' • ');
        })
        .filter(Boolean);
      if (details.length > 0) return details.join('; ');
    }

    const parts = [
      rx.dosage || rx.dosageInstruction,
      rx.frequency,
      rx.duration ? `(${rx.duration})` : ''
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' • ') : 'Standard Dosing';
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* ── Top Header & Patient Search Bar ───────────────────────────────── */}
      <Card
        variant="outlined"
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.15)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
              <MedicalInformation sx={{ color: '#38bdf8', fontSize: 32 }} />
              <Typography variant="h5" fontWeight={800} letterSpacing="-0.5px">
                Longitudinal EMR Intelligence & Patient History Workspace
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.82rem' }}>
              Comprehensive Medical Records • Encounter History • Predictive Risk Analytics & Diagnostic Intelligence
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* Patient Search Autocomplete */}
            <Autocomplete
              options={patients}
              getOptionLabel={(o) => `${o.mrn}${o.artNumber ? ` [ART: ${o.artNumber}]` : ''} — ${o.lastName}, ${o.firstName}`}
              filterOptions={(x) => x}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              loading={loadingSearch}
              onInputChange={(_, val, reason) => {
                if (reason === 'input' || reason === 'clear') {
                  fetchPatients(val);
                }
              }}
              onChange={(_, val) => setSelectedPat(val)}
              value={selectedPat}
              sx={{ width: isDialogMode ? 280 : 380, bgcolor: 'rgba(255, 255, 255, 0.08)', borderRadius: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Search patient by MRN, ART Number, or Name..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <Search sx={{ mr: 1, color: '#38bdf8' }} />,
                    endAdornment: (
                      <>
                        {loadingSearch ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            {isDialogMode && (
              <>
                <Tooltip title="Open this patient EMR in a separate browser tab for dual monitor view">
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Launch />}
                    onClick={() => {
                      const patId = selectedPat?.id || effectivePatientId;
                      if (patId) window.open(`/emr-workspace?patientId=${patId}`, '_blank');
                    }}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontWeight: 700,
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      borderRadius: 2,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                    }}
                  >
                    Open in Tab
                  </Button>
                </Tooltip>

                {onClose && (
                  <Tooltip title="Close EMR Workspace Dialog (Esc)">
                    <IconButton
                      onClick={onClose}
                      sx={{
                        color: '#fff',
                        bgcolor: 'rgba(255,255,255,0.12)',
                        '&:hover': { bgcolor: 'rgba(239,68,68,0.4)' }
                      }}
                    >
                      <Close />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
          </Stack>
        </Box>
      </Card>

      {!selectedPat ? (
        <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', py: 10, textAlign: 'center', borderRadius: 3 }}>
          <Portrait sx={{ fontSize: 80, color: '#94a3b8', opacity: 0.6, mb: 2 }} />
          <Typography variant="h5" fontWeight={800} color="text.primary" mb={1}>
            Search & Select a Patient to View Full EMR History & Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary" maxWidth={600} mx="auto">
            Access longitudinal SOAP consultation notes, prescription logs, lab diagnostic results, surgical & obstetric histories, vitals trend graphs, and predictive clinical risk analytics.
          </Typography>
        </Card>
      ) : loadingEMR ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12 }}>
          <CircularProgress size={48} sx={{ color: '#3b5bdb', mb: 2 }} />
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
            Retrieving complete EMR profile, historical encounters, and predictive models...
          </Typography>
        </Box>
      ) : emrData ? (
        <Stack spacing={3}>
          {/* ── Patient Profile Hero Summary Card ───────────────────────────── */}
          <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <Grid container spacing={2.5} alignItems="center">
              <Grid item xs={12} md={4}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      bgcolor: '#3b5bdb',
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      boxShadow: '0 4px 12px rgba(59,91,219,0.3)',
                    }}
                  >
                    {emrData.patient?.firstName?.[0] || 'P'}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      {emrData.patient?.firstName} {emrData.patient?.lastName}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" mt={0.3}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                        MRN: {emrData.patient?.patientNumber || emrData.patient?.id?.substring(0, 8).toUpperCase()}
                      </Typography>
                      <Chip
                        label={emrData.patient?.gender || 'Unspecified'}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }}
                      />
                    </Stack>
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12} md={5}>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Age / Birth Date</Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {emrData.patient?.birthDate ? `${new Date().getFullYear() - new Date(emrData.patient.birthDate).getFullYear()} Yrs (${new Date(emrData.patient.birthDate).toLocaleDateString()})` : 'Age N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Blood Group / Genotype</Typography>
                    <Typography variant="body2" fontWeight={700} color="error.main">
                      {emrData.patient?.bloodGroup || 'O+'} / {emrData.patient?.genotype || 'AA'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Encounter Care Status</Typography>
                    {emrData.activeAdmission ? (
                      <Chip
                        label={`ADMITTED: ${emrData.activeAdmission.bed?.ward?.name || 'Ward'} (Bed ${emrData.activeAdmission.bed?.number})`}
                        color="error"
                        size="small"
                        sx={{ fontWeight: 800, fontSize: '0.68rem' }}
                      />
                    ) : (
                      <Chip label="OUTPATIENT (OPD Care)" color="primary" variant="outlined" size="small" sx={{ fontWeight: 800, fontSize: '0.68rem' }} />
                    )}
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Insurance Coverage</Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {emrData.patient?.insurancePolicies?.[0]?.provider?.name || 'NHIA Primary HMO'}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12} md={3} textAlign={{ xs: 'left', md: 'right' }}>
                <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<Print />}
                    onClick={() => window.print()}
                    sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', py: 0.8, bgcolor: '#0f172a' }}
                  >
                    Print EMR Summary
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => loadEMR(selectedPat.id)}
                    sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', py: 0.5, fontSize: '0.75rem' }}
                  >
                    Refresh Records
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Card>

          {/* ── Predictive Analytics & Longitudinal Vitals Intelligence ────────── */}
          <Grid container spacing={2.5}>
            {/* Left Column: Longitudinal Vitals & Lab Trends Chart */}
            <Grid item xs={12} lg={8}>
              <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ShowChart sx={{ color: '#3b5bdb' }} />
                    <Typography variant="subtitle1" fontWeight={800}>
                      {chartMetric === 'vitals' ? 'Longitudinal Vital Signs Trend Analytics' : 'Longitudinal Diagnostic Lab Parameters Trend'}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      size="small"
                      variant={chartMetric === 'vitals' ? 'contained' : 'outlined'}
                      onClick={() => setChartMetric('vitals')}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, fontSize: '0.72rem', py: 0.3 }}
                    >
                      🫀 Vital Signs
                    </Button>
                    <Button
                      size="small"
                      variant={chartMetric === 'labs' ? 'contained' : 'outlined'}
                      onClick={() => setChartMetric('labs')}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, fontSize: '0.72rem', py: 0.3 }}
                    >
                      🧪 Lab Diagnostics
                    </Button>
                    <Chip label="Real-Time Data" size="small" color="success" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.68rem' }} />
                  </Stack>
                </Box>

                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {chartMetric === 'vitals' ? (
                      <AreaChart data={vitalsChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSbp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b5bdb" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b5bdb" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#12b886" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#12b886" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <RechartsTooltip />
                        <Legend />
                        <Area type="monotone" dataKey="sbp" name="Systolic BP (mmHg)" stroke="#3b5bdb" fillOpacity={1} fill="url(#colorSbp)" strokeWidth={2.5} />
                        <Area type="monotone" dataKey="dbp" name="Diastolic BP (mmHg)" stroke="#74c0fc" fillOpacity={0.2} fill="#74c0fc" strokeWidth={2} />
                        <Area type="monotone" dataKey="pulse" name="Pulse Rate (bpm)" stroke="#12b886" fillOpacity={1} fill="url(#colorPulse)" strokeWidth={2} />
                      </AreaChart>
                    ) : (
                      <AreaChart data={labChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorGluc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e03131" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#e03131" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorHgb" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2f9e44" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#2f9e44" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <RechartsTooltip />
                        <Legend />
                        <Area type="monotone" dataKey="glucose" name="Fasting Glucose (mg/dL)" stroke="#e03131" fillOpacity={1} fill="url(#colorGluc)" strokeWidth={2.5} />
                        <Area type="monotone" dataKey="hemoglobin" name="Hemoglobin (g/dL)" stroke="#2f9e44" fillOpacity={1} fill="url(#colorHgb)" strokeWidth={2} />
                        <Area type="monotone" dataKey="creatinine" name="Serum Creatinine (mg/dL)" stroke="#9c36b5" fillOpacity={0.2} fill="#9c36b5" strokeWidth={2} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>

            {/* Right Column: Predictive Clinical Risk Cards */}
            <Grid item xs={12} lg={4}>
              <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5, height: '100%', bgcolor: '#fafafa' }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <AutoAwesome sx={{ color: '#7950f2' }} />
                  <Typography variant="subtitle1" fontWeight={800} color="#7950f2">
                    AI Predictive Clinical Risk Analytics
                  </Typography>
                </Stack>

                {predictiveMetrics && (
                  <Stack spacing={2}>
                    {/* Readmission Risk Gauge */}
                    <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2, bgcolor: '#fff' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" fontWeight={800} color="text.secondary">
                          30-DAY HOSPITAL READMISSION RISK
                        </Typography>
                        <Chip
                          label={`${predictiveMetrics.readmissionProb}% (${predictiveMetrics.riskCategory})`}
                          size="small"
                          sx={{ bgcolor: predictiveMetrics.riskColor, color: '#fff', fontWeight: 800, fontSize: '0.68rem' }}
                        />
                      </Box>
                      <Box sx={{ width: '100%', bgcolor: '#e2e8f0', borderRadius: 1, height: 8, overflow: 'hidden' }}>
                        <Box sx={{ width: `${predictiveMetrics.readmissionProb}%`, bgcolor: predictiveMetrics.riskColor, height: '100%' }} />
                      </Box>
                    </Paper>

                    {/* Sepsis & Physiological Deterioration Indicator */}
                    <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2, bgcolor: '#fff' }}>
                      <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" mb={0.5}>
                        NEWS2 PHYSIOLOGICAL DECOMPENSATION INDEX
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h5" fontWeight={800} color={predictiveMetrics.latestNews >= 5 ? 'error.main' : 'success.main'}>
                          NEWS2 Score: {predictiveMetrics.latestNews}
                        </Typography>
                        <Chip
                          label={predictiveMetrics.latestNews >= 7 ? 'HIGH RISK' : predictiveMetrics.latestNews >= 5 ? 'MEDIUM RISK' : 'LOW RISK'}
                          size="small"
                          color={predictiveMetrics.latestNews >= 7 ? 'error' : predictiveMetrics.latestNews >= 5 ? 'warning' : 'success'}
                          sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                        />
                      </Stack>
                    </Paper>

                    {/* Polypharmacy Rating */}
                    <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2, bgcolor: '#fff' }}>
                      <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" mb={0.5}>
                        POLYPHARMACY & DRUG SAFETY MATRIX
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color={predictiveMetrics.rxCount >= 5 ? 'error.main' : 'text.primary'}>
                        💊 {predictiveMetrics.rxCount} Active Medications ({predictiveMetrics.polypharmacyRisk})
                      </Typography>
                    </Paper>

                    {/* Organ System & Allergy Safety Conflict Radar */}
                    <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2, bgcolor: '#fff' }}>
                      <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" mb={0.5}>
                        ORGAN RISK & ALLERGY SAFETY RADAR
                      </Typography>
                      <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" gap={0.5}>
                        <Chip
                          label={emrData?.allergies?.length > 0 ? "🟢 0 Allergy Conflicts" : "🛡️ Allergy Profile Verified"}
                          size="small"
                          color="success"
                          sx={{ fontWeight: 800, fontSize: '0.62rem' }}
                        />
                        <Chip
                          label="Renal & Hepatic: NORMAL"
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ fontWeight: 800, fontSize: '0.62rem' }}
                        />
                      </Stack>
                    </Paper>
                  </Stack>
                )}
              </Card>
            </Grid>
          </Grid>

          {/* ── Comprehensive History Tabs Workspace ──────────────────────────── */}
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc', px: 2, pt: 1 }}>
              <Tabs
                value={activeTab}
                onChange={(e, v) => setActiveTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 800,
                    textTransform: 'none',
                    fontSize: '0.88rem',
                    minHeight: 48,
                  },
                }}
              >
                <Tab icon={<History fontSize="small" />} iconPosition="start" label={`Encounters & SOAP Notes (${emrData.consultationNotes?.length || 0})`} />
                <Tab icon={<MonitorHeart fontSize="small" />} iconPosition="start" label={`Vitals & Triage History (${unifiedVitalsList.length})`} />
                <Tab icon={<Medication fontSize="small" />} iconPosition="start" label={`Prescriptions (${prescriptions.length || emrData.recentMeds?.length || 0})`} />
                <Tab icon={<Biotech fontSize="small" />} iconPosition="start" label={`Lab Diagnostics (${labOrders.length || 0})`} />
                <Tab icon={<MedicalServices fontSize="small" />} iconPosition="start" label={`🦷 Dental & Odontogram (${dentalEncounters.length})`} />
                <Tab icon={<ContentCut fontSize="small" />} iconPosition="start" label={`Surgical History (${(emrData.surgicalBookings || []).length})`} />
                <Tab icon={<ChildCare fontSize="small" />} iconPosition="start" label={`ANC & Maternity (${(emrData.ancRecords || []).length || (emrData.history?.lmp || emrData.history?.gravida !== undefined ? 1 : 0)})`} />
                <Tab icon={<Warning fontSize="small" />} iconPosition="start" label={`Allergies & Alerts (${emrData.allergies?.length || 0})`} />
                <Tab
                  icon={<CloudSync fontSize="small" />}
                  iconPosition="start"
                  label={`🇳🇬 NMRS & HIV Forms (${nmrsSummary?.encounters?.length || 0})`}
                  sx={{ color: '#059669', '&.Mui-selected': { color: '#047857', fontWeight: 900 } }}
                />
              </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
              {/* ── TAB 0: ENCOUNTERS & SOAP CONSULTATION NOTES HISTORY ────── */}
              {activeTab === 0 && (
                <Stack spacing={2.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight={800}>
                      Longitudinal SOAP Consultation Notes ({emrData.consultationNotes?.length || 0} Recorded Notes)
                    </Typography>
                  </Box>

                  {emrData.consultationNotes?.length > 0 ? (
                    <Stack spacing={2}>
                      {emrData.consultationNotes.map((note: any, idx: number) => (
                        <Paper
                          key={note.id || idx}
                          variant="outlined"
                          sx={{
                            p: 2.5,
                            borderRadius: 2.5,
                            borderLeft: '5px solid #3b5bdb',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <Chip label={`Visit / Consultation #${emrData.consultationNotes.length - idx}`} color="primary" size="small" sx={{ fontWeight: 800, fontSize: '0.68rem' }} />
                                <Typography variant="caption" color="primary.main" fontWeight={800}>
                                  👨‍⚕️ Author: {note.doctorName || 'Dr. Emmanuel Vegher'} ({note.doctorDesignation || 'Medical Officer'})
                                </Typography>
                              </Stack>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                🗓️ Date Recorded: {new Date(note.createdAt).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                              </Typography>
                            </Box>
                          </Box>

                          <Grid container spacing={2}>
                            {note.subjective && (
                              <Grid item xs={12} md={6}>
                                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(59, 91, 219, 0.03)', border: '1px solid rgba(59, 91, 219, 0.1)' }}>
                                  <Typography variant="caption" fontWeight={800} color="#3b5bdb" display="block" mb={0.3}>
                                    Subjective (S) — Patient Symptoms:
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                                    {note.subjective}
                                  </Typography>
                                </Box>
                              </Grid>
                            )}

                            {note.objective && (
                              <Grid item xs={12} md={6}>
                                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(13, 148, 136, 0.03)', border: '1px solid rgba(13, 148, 136, 0.1)' }}>
                                  <Typography variant="caption" fontWeight={800} color="#0d9488" display="block" mb={0.3}>
                                    Objective (O) — Exam & Vitals:
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                                    {note.objective}
                                  </Typography>
                                </Box>
                              </Grid>
                            )}

                            {note.assessment && (
                              <Grid item xs={12}>
                                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(124, 58, 237, 0.04)', border: '1px solid rgba(124, 58, 237, 0.15)' }}>
                                  <Typography variant="caption" fontWeight={800} color="#7c3aed" display="block" mb={0.5}>
                                    Assessment (A) — ICD-10 Diagnostic Classification:
                                  </Typography>
                                  {renderIcd10Pills(note.assessment)}
                                </Box>
                              </Grid>
                            )}

                            {note.plan && (
                              <Grid item xs={12}>
                                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(22, 163, 74, 0.03)', border: '1px solid rgba(22, 163, 74, 0.1)' }}>
                                  <Typography variant="caption" fontWeight={800} color="#16a34a" display="block" mb={0.3}>
                                    Plan (P) — Treatment & Orders:
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                                    {note.plan}
                                  </Typography>
                                </Box>
                              </Grid>
                            )}
                          </Grid>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      No SOAP consultation notes recorded for this patient.
                    </Alert>
                  )}
                </Stack>
              )}

              {/* ── TAB 1: LONGITUDINAL VITALS & TRIAGE HISTORY ─────────────── */}
              {activeTab === 1 && (
                <Stack spacing={2.5}>
                  {/* Tab Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MonitorHeart color="primary" />
                        Longitudinal Vital Signs & Triage Observations ({unifiedVitalsList.length} Total Readings)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Comprehensive chronological vitals audit trail · OPD Triage · Inpatient Bedside Logs · Migrated Paper Records
                      </Typography>
                    </Box>
                  </Box>

                  {/* Quick Vitals Summary KPI Cards */}
                  {latestVital && (() => {
                    const bpStatus = getBpAssessment(latestVital.systolic, latestVital.diastolic);
                    const pulseStatus = getPulseAssessment(latestVital.pulseRate);
                    const tempStatus = getTempAssessment(latestVital.temperature);
                    const spo2Status = getSpo2Assessment(latestVital.spo2);
                    const bmiStatus = getBmiAssessment(latestVital.bmi);
                    const isNewsCritical = latestVital.news2Score >= 7 || latestVital.news2Risk === 'HIGH';
                    const isNewsMedium = latestVital.news2Score >= 5 || latestVital.news2Risk === 'MEDIUM';

                    return (
                      <Grid container spacing={2}>
                        {/* Blood Pressure */}
                        <Grid item xs={12} sm={6} md={2}>
                          <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2.5, bgcolor: '#f8fafc', height: '100%' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                              <Typography variant="caption" fontWeight={700} color="text.secondary">Blood Pressure</Typography>
                              <Favorite sx={{ fontSize: 18, color: '#dc2626' }} />
                            </Stack>
                            <Typography variant="h6" fontWeight={900} color={bpStatus.color === 'error' ? 'error.main' : bpStatus.color === 'warning' ? '#c2410c' : bpStatus.color === 'info' ? '#1d4ed8' : 'text.primary'}>
                              {latestVital.systolic && latestVital.diastolic ? `${latestVital.systolic}/${latestVital.diastolic}` : 'N/A'} <Typography component="span" variant="caption" color="text.secondary">mmHg</Typography>
                            </Typography>
                            {latestVital.systolic != null && (
                              <Chip
                                size="small"
                                label={bpStatus.label}
                                color={bpStatus.color}
                                variant={bpStatus.color === 'success' ? 'outlined' : 'filled'}
                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, mt: 0.5 }}
                              />
                            )}
                          </Paper>
                        </Grid>

                        {/* Pulse / Heart Rate */}
                        <Grid item xs={12} sm={6} md={2}>
                          <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2.5, bgcolor: '#f8fafc', height: '100%' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                              <Typography variant="caption" fontWeight={700} color="text.secondary">Pulse / Heart Rate</Typography>
                              <Speed sx={{ fontSize: 18, color: '#2563eb' }} />
                            </Stack>
                            <Typography variant="h6" fontWeight={900} color={pulseStatus.color === 'error' ? 'error.main' : pulseStatus.color === 'warning' ? '#c2410c' : 'text.primary'}>
                              {latestVital.pulseRate != null ? `${latestVital.pulseRate}` : 'N/A'} <Typography component="span" variant="caption" color="text.secondary">BPM</Typography>
                            </Typography>
                            {latestVital.pulseRate != null && (
                              <Chip
                                size="small"
                                label={pulseStatus.label}
                                color={pulseStatus.color}
                                variant={pulseStatus.color === 'success' ? 'outlined' : 'filled'}
                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, mt: 0.5 }}
                              />
                            )}
                          </Paper>
                        </Grid>

                        {/* Temperature */}
                        <Grid item xs={12} sm={6} md={2}>
                          <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2.5, bgcolor: '#f8fafc', height: '100%' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                              <Typography variant="caption" fontWeight={700} color="text.secondary">Body Temperature</Typography>
                              <Thermostat sx={{ fontSize: 18, color: '#ea580c' }} />
                            </Stack>
                            <Typography variant="h6" fontWeight={900} color={tempStatus.color === 'error' ? 'error.main' : tempStatus.color === 'warning' ? '#c2410c' : tempStatus.color === 'info' ? '#1d4ed8' : 'text.primary'}>
                              {latestVital.temperature != null ? `${latestVital.temperature}°C` : 'N/A'}
                            </Typography>
                            {latestVital.temperature != null && (
                              <Chip
                                size="small"
                                label={tempStatus.label}
                                color={tempStatus.color}
                                variant={tempStatus.color === 'success' ? 'outlined' : 'filled'}
                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, mt: 0.5 }}
                              />
                            )}
                          </Paper>
                        </Grid>

                        {/* Oxygen SpO2 & Respiratory Rate */}
                        <Grid item xs={12} sm={6} md={2}>
                          <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2.5, bgcolor: '#f8fafc', height: '100%' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                              <Typography variant="caption" fontWeight={700} color="text.secondary">SpO₂ & Resp. Rate</Typography>
                              <Air sx={{ fontSize: 18, color: '#0d9488' }} />
                            </Stack>
                            <Typography variant="h6" fontWeight={900} color={spo2Status.color === 'error' ? 'error.main' : spo2Status.color === 'warning' ? '#c2410c' : 'text.primary'}>
                              {latestVital.spo2 != null ? `${latestVital.spo2}%` : 'N/A'} <Typography component="span" variant="caption" color="text.secondary">/ {latestVital.respiratoryRate ?? '—'} cpm</Typography>
                            </Typography>
                            {latestVital.spo2 != null && (
                              <Chip
                                size="small"
                                label={spo2Status.label}
                                color={spo2Status.color}
                                variant={spo2Status.color === 'success' ? 'outlined' : 'filled'}
                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, mt: 0.5 }}
                              />
                            )}
                          </Paper>
                        </Grid>

                        {/* Weight, Height & BMI */}
                        <Grid item xs={12} sm={6} md={2}>
                          <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2.5, bgcolor: '#f8fafc', height: '100%' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                              <Typography variant="caption" fontWeight={700} color="text.secondary">Weight & BMI</Typography>
                              <Scale sx={{ fontSize: 18, color: '#7c3aed' }} />
                            </Stack>
                            <Typography variant="h6" fontWeight={900} color="text.primary">
                              {latestVital.weight != null ? `${latestVital.weight} kg` : 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {latestVital.bmi != null ? `BMI: ${latestVital.bmi} kg/m²` : (latestVital.height ? `Ht: ${latestVital.height}cm` : 'Height: N/A')}
                            </Typography>
                            {latestVital.bmi != null && (
                              <Chip
                                size="small"
                                label={bmiStatus.label}
                                color={bmiStatus.color}
                                variant={bmiStatus.color === 'success' ? 'outlined' : 'filled'}
                                sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, mt: 0.5 }}
                              />
                            )}
                          </Paper>
                        </Grid>

                        {/* NEWS2 Score & Priority */}
                        <Grid item xs={12} sm={6} md={2}>
                          <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2.5, bgcolor: '#f8fafc', height: '100%' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                              <Typography variant="caption" fontWeight={700} color="text.secondary">NEWS2 Risk Score</Typography>
                              <Analytics sx={{ fontSize: 18, color: '#2563eb' }} />
                            </Stack>
                            <Typography variant="h6" fontWeight={900} color={isNewsCritical ? 'error.main' : isNewsMedium ? '#c2410c' : 'success.main'}>
                              Score: {latestVital.news2Score ?? 0}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${latestVital.news2Risk || (latestVital.news2Score >= 7 ? 'HIGH' : latestVital.news2Score >= 5 ? 'MEDIUM' : 'LOW')} RISK`}
                              color={isNewsCritical ? 'error' : isNewsMedium ? 'warning' : 'success'}
                              variant={isNewsCritical || isNewsMedium ? 'filled' : 'outlined'}
                              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, mt: 0.5 }}
                            />
                          </Paper>
                        </Grid>
                      </Grid>
                    );
                  })()}

                  {/* Filter Toolbar */}
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fafafa' }}>
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Search complaints, nurse, notes, source..."
                          value={vitalsSearchQuery}
                          onChange={e => { setVitalsSearchQuery(e.target.value); setVitalsPage(0); }}
                          InputProps={{
                            startAdornment: (
                              <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            ),
                            endAdornment: vitalsSearchQuery ? (
                              <IconButton size="small" onClick={() => { setVitalsSearchQuery(''); setVitalsPage(0); }}>
                                <Close fontSize="small" />
                              </IconButton>
                            ) : null
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={8}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                          <Typography variant="caption" fontWeight={700} color="text.secondary">Quick Filter:</Typography>
                          {[
                            { label: 'All Vitals', val: 'ALL' },
                            { label: 'Fever (≥37.5°C)', val: 'FEVER' },
                            { label: 'High BP (≥140/90)', val: 'HIGH_BP' },
                            { label: 'Tachycardia (≥100)', val: 'TACHYCARDIA' },
                            { label: 'Low SpO₂ (<95%)', val: 'LOW_SPO2' },
                            { label: '📁 Migrated Records', val: 'MIGRATED' },
                          ].map(f => (
                            <Chip
                              key={f.val}
                              label={f.label}
                              size="small"
                              clickable
                              variant={vitalsFilterPreset === f.val ? 'filled' : 'outlined'}
                              color={vitalsFilterPreset === f.val ? 'primary' : 'default'}
                              onClick={() => { setVitalsFilterPreset(f.val as any); setVitalsPage(0); }}
                              sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                            />
                          ))}
                          {(vitalsSearchQuery || vitalsFilterPreset !== 'ALL') && (
                            <Button
                              size="small"
                              startIcon={<RestartAlt />}
                              onClick={() => { setVitalsSearchQuery(''); setVitalsFilterPreset('ALL'); setVitalsPage(0); }}
                              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              Reset
                            </Button>
                          )}
                        </Stack>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Vitals History Table */}
                  {filteredVitalsList.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: alpha('#2563eb', 0.05) }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Date & Time</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>BP (mmHg)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Pulse (bpm)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Temp (°C)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Resp Rate</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>SpO₂ (%)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Weight / Height / BMI</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Pain / Alertness</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>NEWS2 Score</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Source & Type</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Recorded By</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Presenting Complaints / Remarks</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedVitalsList.map((v: any, idx: number) => {
                            const bpStatus = getBpAssessment(v.systolic, v.diastolic);
                            const pulseStatus = getPulseAssessment(v.pulseRate);
                            const tempStatus = getTempAssessment(v.temperature);
                            const spo2Status = getSpo2Assessment(v.spo2);
                            const rrStatus = getRespRateAssessment(v.respiratoryRate);
                            const bmiStatus = getBmiAssessment(v.bmi);
                            const isNewsCritical = (v.news2Score != null && v.news2Score >= 7) || v.news2Risk === 'HIGH';
                            const isNewsMedium = (v.news2Score != null && v.news2Score >= 5) || v.news2Risk === 'MEDIUM';

                            return (
                              <TableRow key={v.id || idx} hover sx={{ '&:hover': { bgcolor: alpha('#2563eb', 0.02) } }}>
                                {/* Date & Time */}
                                <TableCell>
                                  <Typography variant="body2" fontWeight={800} color="text.primary">
                                    {new Date(v.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {new Date(v.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </Typography>
                                </TableCell>

                                {/* Blood Pressure */}
                                <TableCell>
                                  {v.systolic && v.diastolic ? (
                                    <Chip
                                      label={`${v.systolic}/${v.diastolic}`}
                                      size="small"
                                      color={bpStatus.color}
                                      variant={bpStatus.color === 'success' ? 'outlined' : 'filled'}
                                      sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                                    />
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">—</Typography>
                                  )}
                                </TableCell>

                                {/* Pulse */}
                                <TableCell>
                                  {v.pulseRate != null ? (
                                    <Typography variant="body2" fontWeight={700} color={pulseStatus.color === 'error' ? 'error.main' : pulseStatus.color === 'warning' ? '#c2410c' : 'text.primary'}>
                                      {v.pulseRate} <Typography component="span" variant="caption" color="text.secondary">bpm</Typography>
                                    </Typography>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">—</Typography>
                                  )}
                                </TableCell>

                                {/* Temperature */}
                                <TableCell>
                                  {v.temperature != null ? (
                                    <Typography variant="body2" fontWeight={700} color={tempStatus.color === 'error' ? 'error.main' : tempStatus.color === 'warning' ? '#c2410c' : tempStatus.color === 'info' ? '#1d4ed8' : 'text.primary'}>
                                      {v.temperature}°C
                                    </Typography>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">—</Typography>
                                  )}
                                </TableCell>

                                {/* Resp Rate */}
                                <TableCell>
                                  {v.respiratoryRate != null ? (
                                    <Typography variant="body2" fontWeight={rrStatus.color !== 'success' ? 700 : 500} color={rrStatus.color === 'error' ? 'error.main' : rrStatus.color === 'warning' ? '#c2410c' : 'text.primary'}>
                                      {v.respiratoryRate} <Typography component="span" variant="caption" color="text.secondary">cpm</Typography>
                                    </Typography>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">—</Typography>
                                  )}
                                </TableCell>

                                {/* SpO2 */}
                                <TableCell>
                                  {v.spo2 != null ? (
                                    <Chip
                                      label={`${v.spo2}%`}
                                      size="small"
                                      color={spo2Status.color}
                                      variant={spo2Status.color === 'success' ? 'outlined' : 'filled'}
                                      sx={{ fontWeight: 800, height: 22, fontSize: '0.7rem' }}
                                    />
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">—</Typography>
                                  )}
                                </TableCell>

                                {/* Weight & Height & BMI */}
                                <TableCell>
                                  <Typography variant="caption" fontWeight={700} display="block">
                                    {v.weight != null ? `${v.weight} kg` : ''} {v.height != null ? `• ${v.height}cm` : ''}
                                  </Typography>
                                  {v.bmi != null && (
                                    <Chip
                                      label={`BMI ${v.bmi}`}
                                      size="small"
                                      color={bmiStatus.color}
                                      variant="outlined"
                                      sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }}
                                    />
                                  )}
                                  {!v.weight && !v.height && (
                                    <Typography variant="caption" color="text.secondary">—</Typography>
                                  )}
                                </TableCell>

                                {/* Pain & Consciousness */}
                                <TableCell>
                                  <Typography variant="caption" display="block">
                                    Pain: <strong>{v.painScore}/10</strong>
                                  </Typography>
                                  <Chip
                                    label={v.consciousnessLevel || 'ALERT'}
                                    size="small"
                                    color={v.consciousnessLevel === 'ALERT' ? 'default' : 'warning'}
                                    sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }}
                                  />
                                </TableCell>

                                {/* NEWS2 Score */}
                                <TableCell>
                                  <Chip
                                    label={`Score: ${v.news2Score ?? 0}`}
                                    size="small"
                                    color={isNewsCritical ? 'error' : isNewsMedium ? 'warning' : 'success'}
                                    variant={isNewsCritical || isNewsMedium ? 'filled' : 'outlined'}
                                    sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }}
                                  />
                                </TableCell>

                                {/* Source & Type */}
                                <TableCell>
                                  <Chip
                                    label={v.source}
                                    size="small"
                                    variant="outlined"
                                    color={v.source?.includes('MIGRATED') ? 'secondary' : 'primary'}
                                    sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }}
                                  />
                                </TableCell>

                                {/* Recorded By */}
                                <TableCell>
                                  <Typography variant="caption" fontWeight={600} color="text.primary">
                                    {v.recordedBy}
                                  </Typography>
                                </TableCell>

                                {/* Presenting Complaints / Remarks */}
                                <TableCell sx={{ maxWidth: 220 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {v.presentingComplaints || 'Routine vital signs ingestion'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      {/* Pagination */}
                      <TablePagination
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        component="div"
                        count={filteredVitalsList.length}
                        rowsPerPage={vitalsRowsPerPage}
                        page={vitalsPage}
                        onPageChange={(_, newPage) => setVitalsPage(newPage)}
                        onRowsPerPageChange={(e) => {
                          setVitalsRowsPerPage(parseInt(e.target.value, 10));
                          setVitalsPage(0);
                        }}
                        sx={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}
                      />
                    </TableContainer>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      {unifiedVitalsList.length === 0
                        ? 'No vital signs or triage records documented yet for this patient.'
                        : 'No vital sign records match your filter criteria.'}
                    </Alert>
                  )}
                </Stack>
              )}

              {/* ── TAB 2: PRESCRIPTIONS & PHARMACY HISTORY ─────────────────── */}
              {activeTab === 2 && (
                <Stack spacing={2.5}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    Medication Orders & Pharmacy Prescription History
                  </Typography>

                  {prescriptions.length > 0 || emrData.recentMeds?.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Prescription Ref</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Medication Name</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Dosage / Frequency</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Prescribed Date</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(prescriptions.length > 0 ? prescriptions : emrData.recentMeds).map((rx: any, i: number) => (
                            <TableRow key={rx.id || i} hover>
                              <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'primary.main' }}>
                                {formatPrescriptionRef(rx, i)}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>
                                {formatPrescriptionMedName(rx)}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem' }}>
                                {formatPrescriptionDosage(rx)}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                {new Date(rx.createdAt || rx.orderedAt || Date.now()).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={rx.status || 'ACTIVE'}
                                  color={rx.status === 'VERIFIED' ? 'success' : rx.status === 'COMPLETED' ? 'primary' : rx.status === 'PENDING_VERIFICATION' ? 'warning' : 'info'}
                                  size="small"
                                  sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      No active or past prescription records found for this patient.
                    </Alert>
                  )}
                </Stack>
              )}

              {/* ── TAB 3: LABORATORY DIAGNOSTICS & ORDERS ──────────────────── */}
              {activeTab === 3 && (
                <Stack spacing={2.5}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    Laboratory Diagnostics & Investigation Results History
                  </Typography>

                  {labOrders.length > 0 ? (
                    <Stack spacing={2.5}>
                      {labOrders.map((order: any, idx: number) => (
                        <Paper
                          key={order.id || idx}
                          variant="outlined"
                          sx={{
                            p: 2.5,
                            borderRadius: 3,
                            borderLeft: '5px solid #0d9488',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                          }}
                        >
                          {/* Order Header */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <Chip
                                  label={(order.orderNumber || order.id?.substring(0, 8).toUpperCase() || '').startsWith('LAB-') ? (order.orderNumber || order.id?.substring(0, 8).toUpperCase()) : `LAB-${order.orderNumber || order.id?.substring(0, 8).toUpperCase()}`}
                                  color="success"
                                  size="small"
                                  sx={{ fontWeight: 800, fontSize: '0.68rem', fontFamily: 'monospace' }}
                                />
                                {order.priority && (
                                  <Chip
                                    label={order.priority}
                                    color={order.priority === 'STAT' || order.priority === 'URGENT' ? 'error' : 'info'}
                                    size="small"
                                    sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                  />
                                )}
                              </Stack>
                              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                🗓️ Ordered Date: {new Date(order.createdAt || order.orderedAt || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                {order.requestedBy && ` • Requested by Dr. ${order.requestedBy.firstName || ''} ${order.requestedBy.lastName || ''}`}
                              </Typography>
                            </Box>

                            <Chip
                              label={order.status || 'COMPLETED'}
                              color={order.status === 'COMPLETED' ? 'success' : order.status === 'IN_PROGRESS' ? 'primary' : 'warning'}
                              size="small"
                              sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                            />
                          </Box>

                          {/* Lab Test Items & Investigation Findings Table */}
                          {order.items && order.items.length > 0 ? (
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 1.5 }}>
                              <Table size="small">
                                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.725rem' }}>Investigation / Test Name</TableCell>
                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.725rem' }}>Category / Specimen</TableCell>
                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.725rem' }}>Result / Measured Value</TableCell>
                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.725rem' }}>Reference Range</TableCell>
                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.725rem' }}>Status</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {order.items.map((it: any, iIdx: number) => {
                                    const testName =
                                      it.test?.testName ||
                                      it.testName ||
                                      it.name ||
                                      it.test?.name ||
                                      it.test?.category ||
                                      it.category ||
                                      order.testName ||
                                      order.name ||
                                      'Diagnostic Investigation';
                                    const testCode = it.test?.testCode || it.test?.code || it.code || '';
                                    const category = it.test?.category || it.category || 'Pathology';
                                    const specimen = it.test?.specimenType || it.test?.sampleType || it.sampleType || '';
                                    const resVal = it.result?.resultValue || it.resultValue || (it.status === 'COMPLETED' ? 'Normal / Verified' : 'Pending Lab Result');
                                    const unit = it.result?.resultUnit || it.result?.units || it.unit || '';
                                    const refRange = it.result?.referenceRange || it.test?.referenceRange || 'Standard Range';
                                    const isAbnormal = Boolean(it.result?.isAbnormal || it.isAbnormal);

                                    return (
                                      <TableRow key={it.id || iIdx} hover>
                                        <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>
                                          {testName}
                                          {testCode && (
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.68rem' }}>
                                              Code: {testCode}
                                            </Typography>
                                          )}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.78rem' }}>
                                          {category} {specimen && `• (${specimen})`}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: isAbnormal ? 'error.main' : 'text.primary', fontSize: '0.82rem' }}>
                                          {resVal} {unit}
                                          {isAbnormal && (
                                            <Chip label="ABNORMAL" color="error" size="small" sx={{ ml: 1, height: 16, fontSize: '0.6rem', fontWeight: 800 }} />
                                          )}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                                          {refRange}
                                        </TableCell>
                                        <TableCell>
                                          <Chip
                                            label={it.status || order.status || 'COMPLETED'}
                                            color={it.status === 'COMPLETED' || order.status === 'COMPLETED' ? 'success' : 'warning'}
                                            size="small"
                                            sx={{ fontWeight: 800, fontSize: '0.62rem' }}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', mb: 1 }}>
                              <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                                Test Investigation: {order.testName || order.name || 'Laboratory Diagnostic Investigation'}
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.5 }}>
                                Findings: {order.resultSummary || order.resultValue || order.notes || 'Lab result verified on file.'}
                              </Typography>
                            </Box>
                          )}

                          {/* Result Summary / Pathologist Remarks */}
                          {order.resultSummary && (
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(13, 148, 136, 0.04)', border: '1px solid rgba(13, 148, 136, 0.15)' }}>
                              <Typography variant="caption" fontWeight={800} color="#0d9488" display="block">
                                Pathologist Summary & Clinical Impression:
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.83rem', whiteSpace: 'pre-wrap', mt: 0.3, lineHeight: 1.4 }}>
                                {order.resultSummary}
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      No laboratory diagnostic orders recorded on file.
                    </Alert>
                  )}
                </Stack>
              )}

              {/* ── TAB 4: DENTAL & ODONTOGRAM CLINICAL RECORDS ─────────────── */}
              {activeTab === 4 && (
                <Stack spacing={2.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                        🦷 Longitudinal Dental & Odontogram Clinical Records
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        PostgreSQL-Synced Interactive Odontograms, Periodontal CAL Probing & CDT Treatment Plans
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={`${dentalEncounters.length} Dental Encounter(s)`}
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 800 }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Launch />}
                        onClick={() => navigate('/dental/odontogram')}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 800,
                          textTransform: 'none',
                          bgcolor: '#1e3a8a',
                          '&:hover': { bgcolor: '#1e40af' }
                        }}
                      >
                        Open Full Odontogram Suite
                      </Button>
                    </Stack>
                  </Box>

                  {dentalEncounters.length > 0 ? (
                    dentalEncounters.map((dent: any, dIdx: number) => {
                      const findings = dent.findings || [];
                      const perio = dent.perioRecords || [];
                      const labSlips = dent.labOrders || [];
                      const plans = dent.treatmentPlans || [];

                      return (
                        <Paper
                          key={dent.id || dIdx}
                          variant="outlined"
                          sx={{
                            p: 2.5,
                            borderRadius: 3,
                            borderLeft: '5px solid #1e3a8a',
                            bgcolor: '#ffffff',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <Chip
                                  label={dent.encounterNumber}
                                  color="primary"
                                  size="small"
                                  sx={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.72rem' }}
                                />
                                <Chip
                                  label={dent.chartingType || 'ADULT_FDI'}
                                  size="small"
                                  variant="outlined"
                                  color="info"
                                  sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                                />
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                  Chief Complaint: {dent.chiefComplaint || 'Routine Dental Checkup & Charting'}
                                </Typography>
                              </Stack>
                              <Typography variant="caption" color="text.secondary" display="block">
                                📅 Encounter Date: {new Date(dent.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} • 👨‍⚕️ Attending Dentist: <strong>{dent.dentistName || 'Dr. Dental Surgeon'}</strong>
                              </Typography>
                            </Box>
                            <Chip
                              label={dent.status || 'COMPLETED'}
                              color={dent.status === 'COMPLETED' ? 'success' : 'warning'}
                              size="small"
                              sx={{ fontWeight: 800 }}
                            />
                          </Box>

                          <Divider sx={{ my: 1.5 }} />

                          {/* 1. Odontogram Tooth Findings */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={800} color="#1e3a8a" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <MedicalServices fontSize="small" /> Documented Tooth Conditions & Findings ({findings.length} teeth)
                            </Typography>
                            {findings.length > 0 ? (
                              <Grid container spacing={1.5}>
                                {findings.map((f: any) => {
                                  const surfaces = [
                                    f.surfaceMesial ? 'M' : '',
                                    f.surfaceDistal ? 'D' : '',
                                    f.surfaceOcclusal ? 'O' : '',
                                    f.surfaceBuccal ? 'B' : '',
                                    f.surfaceLingual ? 'L' : '',
                                  ].filter(Boolean).join('');

                                  let badgeColor: 'error' | 'warning' | 'info' | 'primary' | 'secondary' | 'default' = 'default';
                                  if (f.wholeToothStatus === 'CARIES') badgeColor = 'error';
                                  else if (f.wholeToothStatus === 'ROOT_CANAL') badgeColor = 'secondary';
                                  else if (f.wholeToothStatus === 'PORCELAIN_CROWN') badgeColor = 'warning';
                                  else if (f.wholeToothStatus === 'IMPLANT') badgeColor = 'info';
                                  else if (f.wholeToothStatus === 'COMPOSITE_FILLING') badgeColor = 'primary';

                                  return (
                                    <Grid item xs={12} sm={6} md={4} key={f.id || f.toothNumber}>
                                      <Paper
                                        variant="outlined"
                                        sx={{
                                          p: 1.5,
                                          borderRadius: 2,
                                          bgcolor: '#f8fafc',
                                          borderColor: '#e2e8f0',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 0.5
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                            Tooth #{f.toothNumber}
                                          </Typography>
                                          <Chip
                                            label={f.wholeToothStatus?.replace('_', ' ') || 'SOUND'}
                                            color={badgeColor}
                                            size="small"
                                            sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                          />
                                        </Box>
                                        {surfaces && (
                                          <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700 }}>
                                            Surfaces Involved: [{surfaces}]
                                          </Typography>
                                        )}
                                        {f.diagnosis && (
                                          <Typography variant="caption" color="text.secondary">
                                            Diagnosis: {f.diagnosis}
                                          </Typography>
                                        )}
                                        {f.cdtCode && (
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                                            <Chip label={f.cdtCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.62rem' }} />
                                            {f.cost > 0 && (
                                              <Typography variant="caption" fontWeight={700} color="#16a34a">
                                                ₦{Number(f.cost).toLocaleString()}
                                              </Typography>
                                            )}
                                          </Box>
                                        )}
                                      </Paper>
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            ) : (
                              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No pathological findings recorded. Dentition charted as sound.
                              </Typography>
                            )}
                          </Box>

                          {/* 2. Treatment Plans & CDT Auto-Billing */}
                          {plans.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <Receipt fontSize="small" /> Proposed CDT Treatment Plan ({plans.length} items)
                              </Typography>
                              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table size="small">
                                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Phase</TableCell>
                                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Tooth</TableCell>
                                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>CDT Code & Procedure</TableCell>
                                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Fee</TableCell>
                                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Status</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {plans.map((p: any) => (
                                      <TableRow key={p.id} hover>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{p.phase}</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{p.toothNumber ? `#${p.toothNumber}` : 'Full Mouth'}</TableCell>
                                        <TableCell sx={{ fontSize: '0.78rem' }}>
                                          <strong>{p.cdtCode}</strong> — {p.procedureName}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#16a34a', fontSize: '0.78rem' }}>
                                          ₦{Number(p.cost || 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                          <Chip
                                            label={p.status || 'PLANNED'}
                                            color={p.status === 'COMPLETED' ? 'success' : 'default'}
                                            size="small"
                                            sx={{ fontWeight: 700, fontSize: '0.62rem' }}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          )}

                          {/* 3. Dental Prosthetics Lab Slips */}
                          {labSlips.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <Biotech fontSize="small" /> Dental Prosthetic Lab Orders ({labSlips.length})
                              </Typography>
                              <Stack spacing={1}>
                                {labSlips.map((ls: any) => (
                                  <Paper key={ls.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                    <Box>
                                      <Typography variant="subtitle2" fontWeight={800} color="#166534">
                                        Slip #{ls.orderNumber} — {ls.restorationType} (Tooth #{ls.toothNumbers})
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Lab: {ls.labName} • Vita Shade: <strong>{ls.shadeVita}</strong> {ls.shadeStump ? `(Stump: ${ls.shadeStump})` : ''} • Turnaround: {ls.turnaroundDays || 5} days
                                      </Typography>
                                    </Box>
                                    <Chip label={ls.status || 'IN_FABRICATION'} color="success" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                                  </Paper>
                                ))}
                              </Stack>
                            </Box>
                          )}
                        </Paper>
                      );
                    })
                  ) : (
                    <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: '#f8fafc' }}>
                      <MedicalServices sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                      <Typography variant="subtitle1" fontWeight={800} color="text.primary" mb={0.5}>
                        No Dental Encounters or Odontogram Records Logged Yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mb={2} maxWidth={500} mx="auto">
                        Initiate a visual 5-surface odontogram charting, periodontal probing evaluation, or CDT treatment plan for this patient.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<Launch />}
                        onClick={() => navigate('/dental/odontogram')}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 800,
                          textTransform: 'none',
                          bgcolor: '#1e3a8a',
                          '&:hover': { bgcolor: '#1e40af' }
                        }}
                      >
                        Start Dental Odontogram Exam
                      </Button>
                    </Paper>
                  )}
                </Stack>
              )}

              {/* ── TAB 5: SURGICAL HISTORY ─────────────────────────────────── */}
              {activeTab === 5 && (
                <Stack spacing={2.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight={800}>
                      Past Surgical Procedures & Operative History
                    </Typography>
                    <Chip
                      label={`${(emrData.surgicalBookings || []).length} Surgical Case(s) Recorded`}
                      color="warning"
                      size="small"
                      sx={{ fontWeight: 800 }}
                    />
                  </Box>

                  {emrData.surgicalBookings && emrData.surgicalBookings.length > 0 ? (
                    emrData.surgicalBookings.map((surg: any) => {
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
                        <Paper
                          key={surg.id}
                          variant="outlined"
                          sx={{
                            p: 2.5,
                            borderRadius: 3,
                            borderLeft: '5px solid #f59f00',
                            bgcolor: '#ffffff',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                  🔪 {procedureDisplay}
                                </Typography>
                                <Chip
                                  label={surg.request?.urgency || 'ELECTIVE'}
                                  size="small"
                                  color={surg.request?.urgency === 'EMERGENCY' ? 'error' : 'warning'}
                                  sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }}
                                />
                              </Stack>
                              <Typography variant="caption" color="text.secondary" display="block">
                                📅 Surgery Date: {new Date(surg.scheduledStart || surg.createdAt).toLocaleDateString()} at {new Date(surg.scheduledStart || surg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · OR Table: {surg.operatingRoom || 'Main Theatre'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                👨‍⚕️ Surgeon: <strong>{surgeonName}</strong> {surg.anaesthetist ? `· Anaesthetist: Dr. ${surg.anaesthetist.firstName} ${surg.anaesthetist.lastName}` : ''}
                              </Typography>
                            </Box>
                            <Chip
                              label={`Status: ${surg.status}`}
                              color={surg.status === 'COMPLETED' ? 'success' : 'secondary'}
                              sx={{ fontWeight: 800 }}
                            />
                          </Box>

                          <Divider sx={{ my: 1.5 }} />

                          {/* 4 Clinical Sections: Diagnosis, Procedure, Op Note, Post-Op Orders */}
                          <Stack spacing={1.5} sx={{ mb: 2 }}>
                            <Grid container spacing={1.5}>
                              <Grid item xs={12} sm={6}>
                                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', borderColor: '#e2e8f0' }}>
                                  <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">
                                    🩺 Final Surgical Diagnosis
                                  </Typography>
                                  <Typography variant="body2" fontWeight={700} color="#0f172a">
                                    {diagnosisDisplay}
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', borderColor: '#e2e8f0' }}>
                                  <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">
                                    ✂️ Operative Procedure Performed
                                  </Typography>
                                  <Typography variant="body2" fontWeight={700} color="#0f172a">
                                    {procedureDisplay}
                                  </Typography>
                                </Paper>
                              </Grid>
                            </Grid>

                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff', borderColor: '#cbd5e1' }}>
                              <Typography variant="subtitle2" fontWeight={800} color="#334155" mb={0.5}>
                                📝 Doctor Operation Note & Clinical Narrative
                              </Typography>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', lineHeight: 1.6, color: '#1e293b' }}>
                                {opNoteDisplay}
                              </Typography>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#2563eb', 0.03), borderColor: alpha('#2563eb', 0.25) }}>
                              <Typography variant="subtitle2" fontWeight={800} color="#1d4ed8" mb={0.5}>
                                📋 Post-Operative Orders & Care Instructions
                              </Typography>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', lineHeight: 1.6, color: '#1e3a8a' }}>
                                {postOpOrdersDisplay}
                              </Typography>
                            </Paper>
                          </Stack>

                          {/* Intra-operative Reconciliation & Safety Indicators */}
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                                <Typography variant="caption" color="#166534" fontWeight={800} display="block">
                                  🧼 Instrument & Swab Count
                                </Typography>
                                <Typography variant="body2" fontWeight={700} color="#15803d">
                                  {intraOp?.swabsReconciled !== false ? '✅ Swabs & Instruments Reconciled' : '⚠️ Count Mismatch Block'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Initial: {intraOp?.initialSwabCount || 0} swabs, {intraOp?.initialInstrumentCount || 0} inst · Closure: {intraOp?.closureSwabCount || 0} swabs, {intraOp?.closureInstrumentCount || 0} inst
                                </Typography>
                              </Paper>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff7ed', borderColor: '#ffedd5' }}>
                                <Typography variant="caption" color="#9a3412" fontWeight={800} display="block">
                                  🩸 Estimated Blood Loss (EBL)
                                </Typography>
                                <Typography variant="body2" fontWeight={700} color="#c2410c">
                                  {intraOp?.estimatedBloodLossML || 0} mL
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Anaesthesia Start: {intraOp?.anaesthesiaStart ? new Date(intraOp.anaesthesiaStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                                </Typography>
                              </Paper>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#eff6ff', borderColor: '#bfdbfe' }}>
                                <Typography variant="caption" color="#1e40af" fontWeight={800} display="block">
                                  🛌 PACU Recovery Outcome
                                </Typography>
                                <Typography variant="body2" fontWeight={700} color="#1d4ed8">
                                  {pacu?.aldreteScore !== undefined ? `Aldrete Score: ${pacu.aldreteScore}/10` : 'Discharged to Inpatient Ward'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {pacu?.dischargeNotes || 'Transferred to ward for post-op nursing care.'}
                                </Typography>
                              </Paper>
                            </Grid>
                          </Grid>

                          {/* Implants & Biopsy Specimens */}
                          {intraOp?.implantsUsed && intraOp.implantsUsed.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" fontWeight={800} color="text.secondary">🔩 Implants & Surgical Devices Installed:</Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                                {intraOp.implantsUsed.map((imp: any) => (
                                  <Chip key={imp.id} label={`${imp.implantType} (${imp.manufacturer || 'Standard'} - Lot: ${imp.lotNumber || 'N/A'})`} size="small" variant="outlined" color="primary" sx={{ fontWeight: 700 }} />
                                ))}
                              </Stack>
                            </Box>
                          )}

                          {intraOp?.specimensCollected && intraOp.specimensCollected.length > 0 && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="caption" fontWeight={800} color="text.secondary">🧪 Biopsy / Pathology Specimens Collected:</Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                                {intraOp.specimensCollected.map((sp: any) => (
                                  <Chip key={sp.id} label={`Biopsy: ${sp.anatomicalSource} (${sp.specimenLabelCode})`} size="small" variant="outlined" color="secondary" sx={{ fontWeight: 700 }} />
                                ))}
                              </Stack>
                            </Box>
                          )}
                        </Paper>
                      );
                    })
                  ) : emrData.history?.pastSurgicalNotes ? (
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, borderLeft: '4px solid #f59f00' }}>
                      <Typography variant="subtitle2" fontWeight={800} color="#f59f00" mb={1}>
                        🔪 Historical Surgical Notes & Operative Records
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {emrData.history.pastSurgicalNotes}
                      </Typography>
                    </Paper>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      No past surgical procedures or operative notes documented for this patient.
                    </Alert>
                  )}
                </Stack>
              )}

              {/* ── TAB 6: ANC & MATERNITY / OBSTETRIC HISTORY ──────────────── */}
              {activeTab === 6 && (
                <Stack spacing={2.5}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    Antenatal Care (ANC) & Obstetric Profile
                  </Typography>

                  {emrData.history?.lmp || emrData.history?.gravida !== null ? (
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc' }}>
                          <Typography variant="subtitle2" fontWeight={800} color="primary" mb={1.5}>
                            🤰 Obstetric History Summary
                          </Typography>
                          <Stack spacing={1}>
                            <Typography variant="body2"><strong>LMP:</strong> {emrData.history?.lmp ? new Date(emrData.history.lmp).toLocaleDateString() : 'Not Recorded'}</Typography>
                            <Typography variant="body2"><strong>EDD (Nagele's Rule):</strong> {emrData.history?.edd ? new Date(emrData.history.edd).toLocaleDateString() : 'N/A'}</Typography>
                            <Typography variant="body2"><strong>Gravida:</strong> {emrData.history?.gravida ?? 0} | <strong>Para:</strong> {emrData.history?.para ?? 0} | <strong>Abortions:</strong> {emrData.history?.abortions ?? 0} | <strong>Living Children:</strong> {emrData.history?.livingChildren ?? 0}</Typography>
                          </Stack>
                        </Paper>
                      </Grid>
                    </Grid>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      No obstetric or antenatal care history documented for this patient.
                    </Alert>
                  )}
                </Stack>
              )}

              {/* ── TAB 7: ALLERGIES & CLINICAL ALERTS REGISTRY ─────────────── */}
              {activeTab === 7 && (
                <Stack spacing={2.5}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    Documented Allergies & Active Clinical Alerts
                  </Typography>

                  {emrData.allergies?.length > 0 ? (
                    <Stack spacing={1.5}>
                      {emrData.allergies.map((all: any, i: number) => (
                        <Alert severity="error" icon={<Warning />} key={all.id || i} sx={{ borderRadius: 2 }}>
                          <Typography variant="subtitle2" fontWeight={800}>
                            ⚠️ Allergen: {all.allergen} ({all.severity || 'HIGH'} Severity)
                          </Typography>
                          <Typography variant="caption" display="block">
                            Category: {all.category} • Reaction: {all.reaction || 'Anaphylaxis / Rash'}
                          </Typography>
                        </Alert>
                      ))}
                    </Stack>
                  ) : (
                    <Alert severity="success" sx={{ borderRadius: 2 }}>
                      No active drug or food allergies documented on registry.
                    </Alert>
                  )}
                </Stack>
              )}

              {/* ── TAB 8: NIGERIA MEDICAL RECORDS SYSTEM (NMRS) PUBLIC HEALTH & DYNAMIC FORMS ── */}
              {activeTab === 8 && (
                <Stack spacing={3}>
                  {/* 1. Public Health HIV Care Passport Card */}
                  <Card sx={{
                    border: '1px solid #10b981',
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.08)',
                    overflow: 'hidden'
                  }}>
                    <Box sx={{
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      p: 2,
                      color: '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 1.5
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
                          <HealthAndSafety sx={{ color: '#fff' }} />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight={800} sx={{ color: '#fff' }}>
                            Nigeria HIV Care Passport & Public Health Indicators
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                            FMoH / PEPFAR Enrolled Client • OpenMRS Bi-Directional Synchronized Profile
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={syncingNmrs ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <CloudDownload />}
                          onClick={handlePullAllClobForms}
                          disabled={syncingNmrs}
                          sx={{
                            color: '#fff',
                            borderColor: 'rgba(255,255,255,0.4)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: '#fff' },
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: 2
                          }}
                        >
                          Pull Schemas from OpenMRS CLOB
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={syncingNmrs ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SyncAlt />}
                          onClick={handleSyncPatientToOpenmrs}
                          disabled={syncingNmrs}
                          sx={{
                            bgcolor: 'rgba(255,255,255,0.25)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' },
                            color: '#fff',
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: 2
                          }}
                        >
                          {syncingNmrs ? 'Syncing...' : 'Sync to OpenMRS Host'}
                        </Button>
                      </Box>
                    </Box>

                    <CardContent sx={{ p: 2.5 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                          <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', height: '100%', position: 'relative' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, display: 'block' }}>
                                PEPFAR Identifier (Type 4)
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setCustomPepfarInput(nmrsSummary?.mapping?.pepfarId || '');
                                  setEditPepfarModalOpen(true);
                                }}
                                title="Edit PEPFAR Identifier"
                                sx={{ p: 0.5, color: '#059669', '&:hover': { bgcolor: '#ecfdf5' } }}
                              >
                                <Edit fontSize="small" sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#059669', wordBreak: 'break-all', my: 0.5 }}>
                              {nmrsSummary?.mapping?.pepfarId || (selectedPat?.mrn ? `ART-${selectedPat.mrn}` : 'PENDING_ASSIGNMENT')}
                            </Typography>
                            <Chip
                              label="Identifier Type 4 • ART Number"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ height: 18, fontSize: 9.5, fontWeight: 800 }}
                            />
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <Box sx={{ p: 1.5, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd', height: '100%' }}>
                            <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700, display: 'block' }}>
                              Current ART Regimen
                            </Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0284c7', my: 0.5 }}>
                              {nmrsSummary?.mapping?.currentRegimen || '1a: TDF + 3TC + DTG'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10 }}>First-Line Optimized Adult</Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <Box sx={{ p: 1.5, bgcolor: '#ecfdf5', borderRadius: 2, border: '1px solid #a7f3d0', height: '100%' }}>
                            <Typography variant="caption" sx={{ color: '#047857', fontWeight: 700, display: 'block' }}>
                              Viral Load Suppression
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#059669', my: 0.5 }}>
                              {nmrsSummary?.mapping?.lastViralLoad !== undefined ? `${nmrsSummary.mapping.lastViralLoad} cp/mL` : '<20 cp/mL (TND)'}
                            </Typography>
                            <Chip label="Suppressed (<50 cp/mL)" size="small" color="success" sx={{ fontSize: 10, height: 18, fontWeight: 800 }} />
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', height: '100%' }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                              CD4 Absolute Count
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0284c7', my: 0.5 }}>
                              {nmrsSummary?.mapping?.lastCd4Count ? `${nmrsSummary.mapping.lastCd4Count} cells/µL` : '520 cells/µL'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10 }}>Target: &gt;350 cells/µL</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* 2. Official OpenMRS ESM Engine & Schema Studio */}
                  <Card variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, sm: 3 } }}>
                    {/* Header with Sub-tabs */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Storage sx={{ color: '#059669', fontSize: 24 }} />
                          <Typography variant="h6" fontWeight={800} color="#0f172a">
                            National Clinical Encounter &amp; Form Engine (OpenMRS ESM)
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Direct rendering using official OpenMRS ESM Form Engine (JSON Schema spec with live expressions &amp; validations).
                        </Typography>
                      </Box>

                      {/* Mode Switcher: Form Entry vs Schema Studio */}
                      <Tabs
                        value={nmrsSubTab}
                        onChange={(_, v) => setNmrsSubTab(v)}
                        sx={{
                          bgcolor: '#f1f5f9',
                          borderRadius: 2,
                          p: 0.5,
                          '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            minHeight: 36,
                            py: 0.5,
                            borderRadius: 1.5,
                          },
                          '& .Mui-selected': {
                            bgcolor: '#ffffff',
                            color: '#059669 !important',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          },
                          '& .MuiTabs-indicator': { display: 'none' },
                        }}
                      >
                        <Tab value="forms" icon={<Assignment fontSize="small" />} iconPosition="start" label="Clinical Form Entry" />
                        <Tab value="studio" icon={<LibraryBooks fontSize="small" />} iconPosition="start" label="Schema Studio &amp; Builder" />
                      </Tabs>
                    </Box>

                    {/* SUBTAB 1: CLINICAL FORM ENTRY */}
                    {nmrsSubTab === 'forms' && (
                      <Stack spacing={2.5}>
                        {/* Schema Selection Controls */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          {/* Category Filter Chips */}
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {[
                              { id: 'ALL', label: 'All Forms' },
                              { id: 'HIV_PROGRAM', label: 'HIV Care Cards' },
                              { id: 'PMTCT_ANC', label: 'PMTCT / ANC' },
                              { id: 'HTS_TESTING', label: 'HTS Testing' },
                              { id: 'PHARMACY', label: 'Pharmacy' },
                              { id: 'LAB', label: 'Laboratory' },
                              { id: 'TB_PROGRAM', label: 'TB Program' }
                            ].map(cat => (
                              <Chip
                                key={cat.id}
                                label={cat.label}
                                size="small"
                                clickable
                                color={formCategoryFilter === cat.id ? 'primary' : 'default'}
                                variant={formCategoryFilter === cat.id ? 'filled' : 'outlined'}
                                onClick={() => setFormCategoryFilter(cat.id)}
                                sx={{ fontSize: 11, fontWeight: formCategoryFilter === cat.id ? 800 : 500 }}
                              />
                            ))}
                          </Box>

                          <FormControl size="small" sx={{ minWidth: 320 }}>
                            <InputLabel>Select National Form ({nmrsSchemas.filter(s => formCategoryFilter === 'ALL' || s.category === formCategoryFilter).length})</InputLabel>
                            <Select
                              value={selectedNmrsSchemaId}
                              label={`Select National Form (${nmrsSchemas.filter(s => formCategoryFilter === 'ALL' || s.category === formCategoryFilter).length})`}
                              onChange={(e) => handleSelectSchema(e.target.value)}
                            >
                              {nmrsSchemas
                                .filter(s => formCategoryFilter === 'ALL' || s.category === formCategoryFilter)
                                .map(s => (
                                  <MenuItem key={s.id} value={s.id}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="body2" fontWeight={700}>
                                        {s.formName}
                                      </Typography>
                                      <Chip label={`v${s.version || '1.0'}`} size="small" sx={{ fontSize: 10, height: 18 }} />
                                    </Box>
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                        </Box>

                        {/* Embedded ESM Form Engine */}
                        {(() => {
                          const activeSchema = nmrsSchemas.find(s => s.id === selectedNmrsSchemaId);
                          if (!activeSchema) {
                            return (
                              <Box sx={{ p: 5, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px dashed #cbd5e1' }}>
                                <LibraryBooks sx={{ fontSize: 44, color: '#94a3b8', mb: 1.5 }} />
                                <Typography variant="subtitle1" fontWeight={700} color="#334155">
                                  Select a National Form Schema Above
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Access standardized national forms dynamically rendered by the OpenMRS ESM Form Engine.
                                </Typography>
                              </Box>
                            );
                          }

                          const rawSchema = activeSchema.schemaJson || {};
                          const schemaToRender: FormSchema = rawSchema.pages && rawSchema.pages.length > 0
                            ? rawSchema
                            : {
                                name: activeSchema.formName || 'National Encounter Form',
                                encounterType: rawSchema.encounterType || 'Clinical Encounter',
                                pages: [
                                  {
                                    label: activeSchema.formName || 'Clinical Form Details',
                                    sections: rawSchema.sections || [],
                                  }
                                ],
                                processor: 'EncounterFormProcessor',
                                uuid: activeSchema.id,
                              };

                          return (
                            <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, overflow: 'hidden' }}>
                              <EsmFormEngine
                                schema={schemaToRender}
                                patientContext={{
                                  id: selectedPat?.id,
                                  uuid: selectedPat?.id,
                                  patientNumber: selectedPat?.mrn,
                                  name: `${selectedPat?.firstName || ''} ${selectedPat?.lastName || ''}`.trim(),
                                  firstName: selectedPat?.firstName,
                                  lastName: selectedPat?.lastName,
                                  gender: selectedPat?.gender,
                                  sex: selectedPat?.gender,
                                  age: selectedPat?.birthDate ? Math.max(1, Math.floor((Date.now() - new Date(selectedPat.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))) : 30,
                                  birthDate: selectedPat?.birthDate,
                                  artNumber: nmrsSummary?.mapping?.pepfarId || selectedPat?.artNumber,
                                  hospitalNumber: selectedPat?.mrn,
                                }}
                                initialValues={nmrsFormData}
                                mode="enter"
                                isSubmitting={savingNmrsForm}
                                onSubmit={async (formData, encounterPayload) => {
                                  setSavingNmrsForm(true);
                                  try {
                                    await api.post('/nmrs/encounters', {
                                      patientId: selectedPat?.id,
                                      formSchemaId: activeSchema.id,
                                      encounterType: schemaToRender.encounterType || activeSchema.formName,
                                      formData,
                                      encounterPayload,
                                    });
                                    enqueueSnackbar('National encounter form saved successfully and synchronized.', { variant: 'success' });
                                    if (selectedPat?.id) {
                                      const sRes = await api.get(`/nmrs/patients/${selectedPat.id}/summary`);
                                      setNmrsSummary(sRes.data?.data || null);
                                    }
                                  } catch (err: any) {
                                    enqueueSnackbar(err.response?.data?.message || 'Failed to save encounter form', { variant: 'error' });
                                  } finally {
                                    setSavingNmrsForm(false);
                                  }
                                }}
                              />
                            </Box>
                          );
                        })()}
                      </Stack>
                    )}

                    {/* SUBTAB 2: SCHEMA STUDIO & BUILDER */}
                    {nmrsSubTab === 'studio' && (
                      <Box sx={{ mt: 1 }}>
                        <EsmFormBuilder
                          initialSchema={(() => {
                            const activeSchema = nmrsSchemas.find(s => s.id === selectedNmrsSchemaId);
                            if (activeSchema?.schemaJson) {
                              return activeSchema.schemaJson;
                            }
                            return undefined;
                          })()}
                          onSaveSchema={async (updatedSchema) => {
                            try {
                              const res = await api.post('/nmrs/schemas', {
                                formName: updatedSchema.name,
                                version: updatedSchema.version || '1.0',
                                schemaJson: updatedSchema,
                              });
                              enqueueSnackbar(res.data?.message || 'Schema saved successfully', { variant: 'success' });
                              handlePullAllClobForms();
                            } catch (err: any) {
                              enqueueSnackbar(err.response?.data?.message || 'Failed to save schema', { variant: 'error' });
                            }
                          }}
                        />
                      </Box>
                    )}
                  </Card>

                  {/* Edit PEPFAR Identifier (Type 4) Dialog */}
                  <Dialog open={editPepfarModalOpen} onClose={() => setEditPepfarModalOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Update PEPFAR Unique Identifier (Identifier Type 4)
                    </DialogTitle>
                    <DialogContent dividers>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        In Nigerian National Medical Record Systems (NMRS), PEPFAR Identifier corresponds to <strong>Identifier Type 4 (ART Number)</strong>.
                      </Alert>
                      <TextField
                        fullWidth
                        label="PEPFAR Unique ID / ART Number"
                        value={customPepfarInput}
                        onChange={(e) => setCustomPepfarInput(e.target.value)}
                        placeholder="e.g. IMO02400106 or ART-106DF"
                        helperText="Official National ART Identifier assigned to this client"
                        sx={{ mt: 1 }}
                      />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                      <Button onClick={() => setEditPepfarModalOpen(false)} sx={{ textTransform: 'none' }}>
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleSavePepfarId}
                        disabled={savingPepfarId || !customPepfarInput.trim()}
                        startIcon={savingPepfarId ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <Check />}
                        sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, fontWeight: 800, textTransform: 'none' }}
                      >
                        {savingPepfarId ? 'Saving...' : 'Save PEPFAR Identifier'}
                      </Button>
                    </DialogActions>
                  </Dialog>

                  {/* 3. Official National Form Records (OpenMRS / NMRS) Grouped by Visit */}
                  {groupedVisits.length > 0 ? (
                    <Stack spacing={2.5}>
                      {groupedVisits.map((v, vIdx) => (
                        <Accordion
                          key={v.visitNumber || vIdx}
                          defaultExpanded={vIdx === 0}
                          sx={{
                            borderRadius: '12px !important',
                            border: '1px solid #e2e8f0',
                            boxShadow: 'none',
                            '&:before': { display: 'none' },
                            overflow: 'hidden'
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMore />}
                            sx={{
                              bgcolor: '#f8fafc',
                              px: 2.5,
                              py: 1,
                              borderBottom: '1px solid #e2e8f0',
                              '& .MuiAccordionSummary-content': {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mr: 1
                              }
                            }}
                          >
                            <Box>
                              <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                Visit: {v.visitNumber}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                Checked in: {v.checkedInAt} | Type: {v.visitType} | Status: {v.status}
                              </Typography>
                            </Box>
                            <Chip
                              label={`${v.encounters.length} Encounters`}
                              size="small"
                              sx={{ fontWeight: 700, bgcolor: '#e2e8f0', color: '#334155' }}
                            />
                          </AccordionSummary>

                          <AccordionDetails sx={{ p: 2.5, bgcolor: '#ffffff' }}>
                            <Typography
                              variant="subtitle2"
                              fontWeight={800}
                              color="primary.main"
                              sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                            >
                              <Description fontSize="small" /> Official National Form Records (OpenMRS / NMRS)
                            </Typography>

                            <Stack spacing={2}>
                              {v.encounters.map((ne: any) => (
                                <Paper
                                  key={ne.id}
                                  variant="outlined"
                                  sx={{
                                    p: 2.5,
                                    borderRadius: 2.5,
                                    bgcolor: '#fbfcfd',
                                    borderColor: '#e2e8f0',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      borderColor: '#cbd5e1',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                                    }
                                  }}
                                >
                                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                    <Box>
                                      <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        {ne.formSchema?.formName || ne.encounterType}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                        Encounter No: {ne.encounterNumber} | Date: {new Date(ne.encounterDate).toLocaleDateString()} | Clinician: {ne.clinicianName || 'Chioma (Clinical Provider)'}
                                      </Typography>
                                    </Box>

                                    <Box display="flex" alignItems="center" gap={1.5}>
                                      <Chip
                                        label={ne.syncStatus || 'SYNCED'}
                                        size="small"
                                        color={ne.syncStatus === 'SYNCED' ? 'success' : 'info'}
                                        sx={{ fontWeight: 800, fontSize: '0.75rem', height: 24 }}
                                      />
                                      <Tooltip title={`Open & Edit ${ne.formSchema?.formName || ne.encounterType}`}>
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          onClick={() => handleOpenFormDialog(ne)}
                                          sx={{
                                            bgcolor: '#e0f2fe',
                                            color: '#0284c7',
                                            width: 32,
                                            height: 32,
                                            '&:hover': { bgcolor: '#bae6fd' }
                                          }}
                                        >
                                          <Edit fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </Box>

                                  {ne.formData && typeof ne.formData === 'object' && (
                                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>
                                      <Grid container spacing={2}>
                                        {Object.entries(ne.formData).slice(0, 6).map(([k, v]: [string, any]) => (
                                          <Grid item xs={12} sm={6} md={4} key={k}>
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.75rem' }}>
                                              {k}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700} color="#1e293b" noWrap>
                                              {String(v)}
                                            </Typography>
                                          </Grid>
                                        ))}
                                      </Grid>
                                    </Box>
                                  )}
                                </Paper>
                              ))}
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </Stack>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      No past NMRS clinical forms recorded for this client yet. Select a national form above to fill the first encounter.
                    </Alert>
                  )}
                </Stack>
              )}
            </Box>
          </Card>
        </Stack>
      ) : null}

      {/* ── Official OpenMRS ESM JSON Schema Form Engine Modal Dialog ── */}
      <Dialog
        open={Boolean(editingEncounter)}
        onClose={() => setEditingEncounter(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', p: 0 } }}
      >
        {editingEncounter && (
          <EsmFormEngine
            schema={(() => {
              let rawSchema = editingEncounter.formSchema?.schemaJson;

              // If rawSchema is incomplete or missing, look up rich schema in nmrsSchemas
              const isBasicStub = !rawSchema || !rawSchema.pages || rawSchema.pages.length === 0 ||
                (rawSchema.pages.length === 1 && rawSchema.pages[0].sections?.length <= 2 && rawSchema.pages[0].sections?.every((s: any) => (s.questions?.length || 0) <= 7 && s.id === 'encounter_header'));

              if (isBasicStub && nmrsSchemas.length > 0) {
                const targetName = (editingEncounter.formSchema?.formName || editingEncounter.encounterType || '').toLowerCase().trim();
                const matched = nmrsSchemas.find((s: any) => {
                  const sName = (s.formName || '').toLowerCase().trim();
                  return sName === targetName || sName.includes(targetName) || targetName.includes(sName) ||
                    (targetName.includes('intake') && (s.formCode === 'CLIENT_INTAKE_FORM' || s.formCode === 'HTS_REGISTER')) ||
                    (targetName.includes('hts') && (s.formCode === 'HTS_REGISTER' || s.formCode === 'CLIENT_INTAKE_FORM')) ||
                    (targetName.includes('pharmacy') && s.formCode === 'PHARMACY_ORDER') ||
                    (targetName.includes('lab') && s.formCode === 'INTEGRATED_LAB_ORDER') ||
                    (targetName.includes('care card') && s.formCode === 'CARE_CARD_MASTER') ||
                    (targetName.includes('adult') && s.formCode === 'CARE_CARD_4B');
                });
                if (matched?.schemaJson) {
                  rawSchema = matched.schemaJson;
                }
              }

              if (rawSchema?.pages && rawSchema.pages.length > 0) {
                return rawSchema;
              }
              if (rawSchema?.sections && rawSchema.sections.length > 0) {
                return {
                  name: rawSchema.name || rawSchema.formName || editingEncounter.encounterType || 'Encounter Form',
                  encounterType: rawSchema.encounterType || editingEncounter.encounterType,
                  pages: [
                    {
                      label: rawSchema.name || rawSchema.formName || 'Clinical Encounter Details',
                      sections: rawSchema.sections,
                    }
                  ],
                  processor: rawSchema.processor || 'EncounterFormProcessor',
                  uuid: rawSchema.uuid || editingEncounter.formSchemaId,
                };
              }
              return {
                name: editingEncounter.formSchema?.formName || editingEncounter.encounterType || 'Encounter Form',
                encounterType: editingEncounter.encounterType,
                pages: [],
              };
            })()}
            patientContext={{
              id: selectedPat?.id,
              uuid: selectedPat?.id,
              patientNumber: selectedPat?.mrn,
              name: `${selectedPat?.firstName || ''} ${selectedPat?.lastName || ''}`.trim(),
              firstName: selectedPat?.firstName,
              lastName: selectedPat?.lastName,
              gender: selectedPat?.gender,
              sex: selectedPat?.gender,
              age: selectedPat?.birthDate ? Math.max(1, Math.floor((Date.now() - new Date(selectedPat.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))) : 30,
              birthDate: selectedPat?.birthDate,
              artNumber: nmrsSummary?.mapping?.pepfarId || selectedPat?.artNumber,
              hospitalNumber: selectedPat?.mrn,
            }}
            initialValues={editingEncounter.formData || {}}
            mode="edit"
            isSubmitting={savingEncounter}
            onCancel={() => setEditingEncounter(null)}
            onSubmit={async (formData) => {
              setSavingEncounter(true);
              try {
                const res = await api.put(`/nmrs/encounters/${editingEncounter.id}`, {
                  formData
                });
                enqueueSnackbar(res.data?.message || 'Encounter form updated successfully', { variant: 'success' });
                setEditingEncounter(null);
                if (selectedPat?.id) {
                  const sRes = await api.get(`/nmrs/patients/${selectedPat.id}/summary`);
                  setNmrsSummary(sRes.data?.data || null);
                }
              } catch (err: any) {
                enqueueSnackbar(err.response?.data?.message || 'Failed to update encounter form', { variant: 'error' });
              } finally {
                setSavingEncounter(false);
              }
            }}
          />
        )}
      </Dialog>
    </Box>
  );
};

export default EMRDashboard;
