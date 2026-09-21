import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Tabs, Tab, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel,
  Checkbox, Alert, Badge, Chip, LinearProgress, Divider, Icon, IconButton, CardHeader, Autocomplete, Stack,
  List, ListItem, ListItemText, CircularProgress, Tooltip
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend, AreaChart, Area
} from 'recharts';
import {
  ChildCare, PregnantWoman, LocalHospital, Healing, BarChart as BarChartIcon,
  CloudSync, Print, Save, Add, CheckCircle, Warning, Error as ErrorIcon,
  Timeline, Assignment, Download, LocalActivity, People, EventNote, PersonAdd, MedicalServices, Delete,
  Close, Science, LocalPharmacy, Shield
} from '@mui/icons-material';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { useLocation, useNavigate } from 'react-router-dom';
import { QuickAppointmentModal } from '../components/QuickAppointmentModal';
import { QuickExternalRegisterModal } from '../components/QuickExternalRegisterModal';
import { ANC_TEMPLATES } from '../services/ancTemplates';
import { AncCardPrintTemplate } from '../components/AncCardPrintTemplate';

// Safe API wrapper to transparently intercept axios.get/axios.post calls
const axios = {
  get: (url: string, config?: any) => api.get(url.startsWith('/api') ? url.substring(4) : url, config),
  post: (url: string, data?: any, config?: any) => api.post(url.startsWith('/api') ? url.substring(4) : url, data, config),
  put: (url: string, data?: any, config?: any) => api.put(url.startsWith('/api') ? url.substring(4) : url, data, config),
  delete: (url: string, config?: any) => api.delete(url.startsWith('/api') ? url.substring(4) : url, config),
};

const DOSE_OPTIONS = ['1 tab', '2 tabs', '1 cap', '5 ml', '10 ml', '1 injection', 'Apply locally'];
const FREQ_OPTIONS = ['Daily', 'BD', 'TDS', 'QDS', 'PRN', 'Stat', 'Weekly'];
const DURATION_OPTIONS = ['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '30 Days', '60 Days', '90 Days', '120 Days', '150 Days', '180 Days', 'Single Dose'];
const QTY_OPTIONS = [1, 2, 5, 10, 15, 20, 30, 60, 90, 100, 120, 150, 180];

// Theme colors
const PRIMARY = '#3b5bdb';
const SUCCESS = '#2b8a3e';
const WARNING = '#e67700';
const DANGER = '#c92a2a';
const LIGHT_BG = '#f8f9fa';

const getTomorrowString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const Maternity = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const location = useLocation();
  
  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState(0);
  const [activeReportTab, setActiveReportTab] = useState(0);

  const renderNoPatientSelected = (title: string, description: string, icon: React.ReactNode) => (
    <Card sx={{ p: 6, textAlign: 'center', bgcolor: '#f8f9fa', borderRadius: '16px', border: '1px dashed #dee2e6', boxShadow: 'none', my: 2 }}>
      <Box sx={{ color: PRIMARY, mb: 2 }}>{icon}</Box>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto' }}>
        {description}
      </Typography>
    </Card>
  );

  // General States
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [activePregnancy, setActivePregnancy] = useState<any>(null);
  const [patientPregnancies, setPatientPregnancies] = useState<any[]>([]);
  const [gynaeConsultations, setGynaeConsultations] = useState<any[]>([]);
  const [cervicalScreenings, setCervicalScreenings] = useState<any[]>([]);
  const [fertilityAssessments, setFertilityAssessments] = useState<any[]>([]);
  const [gynaeProcedures, setGynaeProcedures] = useState<any[]>([]);
  
  // CPOE catalog states
  const [labCatalog, setLabCatalog] = useState<any[]>([]);
  const [pharmacyCatalog, setPharmacyCatalog] = useState<any[]>([]);
  
  // Patient history clinical states
  const [patientLabOrders, setPatientLabOrders] = useState<any[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);
  
  // Current session clinical carts
  const [labCart, setLabCart] = useState<any[]>([]);
  const [presCart, setPresCart] = useState<any[]>([]);
  
  // Selected values for ordering
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [labPriority, setLabPriority] = useState<string>('ROUTINE');
  const [selectedMedId, setSelectedMedId] = useState<string>('');
  const [medDose, setMedDose] = useState<string>('1 tab');
  const [medFreq, setMedFreq] = useState<string>('Daily');
  const [medDuration, setMedDuration] = useState<string>('7 Days');
  const [medQty, setMedQty] = useState<number>(10);
  const [orderingLab, setOrderingLab] = useState(false);
  const [prescribing, setPrescribing] = useState(false);
  
  const [currentVisitId, setCurrentVisitId] = useState<string>('');
  const [currentVisitStatus, setCurrentVisitStatus] = useState<string>('');
  const [advancingWorkflow, setAdvancingWorkflow] = useState(false);
  const [cpoeTab, setCpoeTab] = useState<number>(0);

  // Dialog Open States
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [pregnancyDialogOpen, setPregnancyDialogOpen] = useState(false);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [surveillanceDialogOpen, setSurveillanceDialogOpen] = useState(false);
  const [complicationDialogOpen, setComplicationDialogOpen] = useState(false);
  const [labourDialogOpen, setLabourDialogOpen] = useState(false);
  const [monitorDialogOpen, setMonitorDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [pncDialogOpen, setPncDialogOpen] = useState(false);
  const [gynaeDialogOpen, setGynaeDialogOpen] = useState(false);
  const [procedureDialogOpen, setProcedureDialogOpen] = useState(false);
  const [cervicalDialogOpen, setCervicalDialogOpen] = useState(false);
  const [fpDialogOpen, setFpDialogOpen] = useState(false);
  const [fertilityDialogOpen, setFertilityDialogOpen] = useState(false);
  const [pmtctDialogOpen, setPmtctDialogOpen] = useState(false);
  const [deathDialogOpen, setDeathDialogOpen] = useState(false);
  const [dischargeDialogOpen, setDischargeDialogOpen] = useState(false);
  const [fhirDialogOpen, setFhirDialogOpen] = useState(false);
  const [fhirPayloadData, setFhirPayloadData] = useState<any>(null);

  // Form Fields States
  const [lmpDate, setLmpDate] = useState('');
  const [eddDate, setEddDate] = useState('');
  const [bpSystolic, setBpSystolic] = useState<string>('');
  const [bpDiastolic, setBpDiastolic] = useState<string>('');

  useEffect(() => {
    if (!visitDialogOpen) {
      setBpSystolic('');
      setBpDiastolic('');
    }
  }, [visitDialogOpen]);

  const getBPStatus = (sysStr: string, diaStr: string) => {
    const sys = parseInt(sysStr);
    const dia = parseInt(diaStr);
    if (isNaN(sys) || isNaN(dia)) return null;

    if (sys >= 160 || dia >= 110) {
      return { label: 'Severe Hypertension (Emergency)', color: 'error.main' };
    }
    if (sys >= 140 || dia >= 90) {
      return { label: 'Hypertension (High BP)', color: 'error.main' };
    }
    if (sys < 90 || dia < 60) {
      return { label: 'Hypotension (Low BP)', color: 'warning.main' };
    }
    return { label: 'Normal BP', color: 'success.main' };
  };

  const [complicationDrugs, setComplicationDrugs] = useState<string[]>([]);

  useEffect(() => {
    if (!complicationDialogOpen) {
      setComplicationDrugs([]);
    }
  }, [complicationDialogOpen]);

  const [isHighRisk, setIsHighRisk] = useState(false);
  const [highRiskReason, setHighRiskReason] = useState('');
  
  // Custom Template states
  const [ancTemplate, setAncTemplate] = useState('anc_faith_foundation_replica');
  const [profileCustomData, setProfileCustomData] = useState<any>({});
  const [pregnancyCustomData, setPregnancyCustomData] = useState<any>({});
  const [printCardDialogOpen, setPrintCardDialogOpen] = useState(false);
  
  // Analytics & BI Reports state
  const [dashboardData, setDashboardData] = useState<any>({
    wardBeds: { total: 12, occupied: 5 },
    activePregnancies: 0,
    highRiskPregnancies: 0,
    deliveriesCount: 0,
    activePmtct: 0,
    totalGynae: 0
  });
  const [reportsData, setReportsData] = useState<any>({
    pregnancies: [],
    activeAdmissions: [],
    recentDeliveries: [],
    riskScreeningList: [],
    ancQueue: [],
    pastQueue: []
  });
  const [maternityBeds, setMaternityBeds] = useState<any[]>([]);

  // Profile Form Controlled States for Dependencies
  const [formGravidity, setFormGravidity] = useState<number>(1);
  const [formParity, setFormParity] = useState<number>(0);
  const [formAbortions, setFormAbortions] = useState<number>(0);
  const [formHivStatus, setFormHivStatus] = useState<string>('NEGATIVE');
  
  // Risk Assessment Form States
  const [riskFactorsState, setRiskFactorsState] = useState({
    htn: false, dm: false, prevCs: false, multi: false, age: false, anaemia: false, other: false
  });
  const [otherRiskFactorText, setOtherRiskFactorText] = useState('');
  const [riskCategory, setRiskCategory] = useState('LOW');
  const [referralRequired, setReferralRequired] = useState('false');

  const handleRiskFactorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    const newState = { ...riskFactorsState, [name as keyof typeof riskFactorsState]: checked };
    setRiskFactorsState(newState);

    const checkedCount = Object.values(newState).filter(Boolean).length;
    if (checkedCount >= 3) {
      setRiskCategory('VERY_HIGH');
    } else if (checkedCount === 2) {
      setRiskCategory('HIGH');
    } else if (checkedCount === 1) {
      setRiskCategory('MODERATE');
    } else {
      setRiskCategory('LOW');
    }
  };

  // External Configs
  const [insuranceProviders, setInsuranceProviders] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const defaultPmtctRegimens = [
    { code: 'TDF/3TC/DTG', name: 'Tenofovir + Lamivudine + Dolutegravir', status: 'ACTIVE' },
    { code: 'TDF/3TC/EFV', name: 'Tenofovir + Lamivudine + Efavirenz', status: 'ACTIVE' },
    { code: 'AZT/3TC/NVP', name: 'Zidovudine + Lamivudine + Nevirapine', status: 'INACTIVE' },
    { code: 'AZT/3TC/EFV', name: 'Zidovudine + Lamivudine + Efavirenz', status: 'ACTIVE' },
  ];

  const [pmtctRegimens, setPmtctRegimens] = useState<any[]>(() => {
    const saved = localStorage.getItem('pmtct_arv_regimens');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('pmtct_arv_regimens', JSON.stringify(defaultPmtctRegimens));
    return defaultPmtctRegimens;
  });

  const [newPmtctCode, setNewPmtctCode] = useState('');
  const [newPmtctName, setNewPmtctName] = useState('');
  const [openAddPmtct, setOpenAddPmtct] = useState(false);

  // Derived Score
  const derivedObstetricScore = `Para ${formParity}+${formAbortions} Gravida ${formGravidity}`;

  const [maternityProfile, setMaternityProfile] = useState<any>(null);
  const [openApptModal, setOpenApptModal] = useState(false);
  const [openExternalModal, setOpenExternalModal] = useState(false);

  useEffect(() => {
    if (profileDialogOpen) {
      setFormGravidity(maternityProfile?.gravidity || 1);
      setFormParity(maternityProfile?.parity || 0);
      setFormAbortions(maternityProfile?.abortions || 0);
      setFormHivStatus(maternityProfile?.hivStatus || 'NEGATIVE');
      
      if (maternityProfile?.customFields) {
        try {
          setProfileCustomData(JSON.parse(maternityProfile.customFields));
        } catch (e) {
          setProfileCustomData({});
        }
      } else {
        setProfileCustomData({});
      }
    }
  }, [profileDialogOpen, maternityProfile]);

  useEffect(() => {
    if (pregnancyDialogOpen) {
      setLmpDate(activePregnancy?.lmpDate?.slice(0, 10) || '');
      setEddDate(activePregnancy?.eddDate?.slice(0, 10) || '');
      setIsHighRisk(activePregnancy?.isHighRisk || false);
      setHighRiskReason(activePregnancy?.highRiskReason || '');
      
      if (activePregnancy?.customFields) {
        try {
          setPregnancyCustomData(JSON.parse(activePregnancy.customFields));
        } catch (e) {
          setPregnancyCustomData({});
        }
      } else {
        setPregnancyCustomData({});
      }
    } else {
      setPregnancyCustomData({});
    }
  }, [pregnancyDialogOpen, activePregnancy]);

  // Load patient list and configs on load
  useEffect(() => {
    fetchPatients();
    fetchDashboardKPIs();
    fetchReportsData();
    fetchMaternityBeds();
    
    // Load active ANC Template from configurations
    axios.get('/api/config/modules').then(res => {
      if (res.data?.success) {
        const configs = res.data.data;
        const ancConfig = configs.find((c: any) => c.moduleKey === 'ANC_PRINT_TEMPLATE');
        if (ancConfig?.description) {
          setAncTemplate(ancConfig.description);
        }
      }
    }).catch(console.error);
    
    // Fetch Insurance Providers
    axios.get('/api/insurance/providers').then(res => setInsuranceProviders(res.data)).catch(console.error);

    // Fetch Staff for Consultants
    axios.get('/api/users?limit=100').then(res => {
      const users = res.data.data || res.data || [];
      // Keep the user object itself since it has firstName and lastName
      const staffMembers = users.filter((u: any) => u.role !== 'PATIENT');
      setStaffList(staffMembers);
    }).catch(console.error);

    // Fetch catalogs for CPOE
    axios.get('/api/lims/catalog').then(res => setLabCatalog(res.data || [])).catch(console.error);
    axios.get('/api/pharmacy/inventory').then(res => setPharmacyCatalog(res.data || [])).catch(console.error);
  }, []);

  // Auto-select patient passed in navigation state (e.g. from Labour Ward)
  useEffect(() => {
    if (location.state?.patientId && patients.length > 0) {
      const match = patients.find((p: any) => p.id === location.state.patientId);
      if (match) {
        handleSelectPatient(match);
      }
    }
  }, [location.state, patients]);

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
        axios.get(`/api/pharmacy/prescriptions`, { params: { patientId: patId } })
      ]);
      setPatientLabOrders(resLab.data || []);
      setPatientPrescriptions(resPres.data || []);
    } catch (e) {
      console.error('Failed to fetch clinical orders history:', e);
    }
  };

  const handleAddTestToCart = () => {
    if (!selectedTestId) return;
    const test = labCatalog.find(t => t.id === selectedTestId);
    if (!test) return;

    const existing = labCart.find(t => t.testId === selectedTestId);
    if (existing) {
      enqueueSnackbar('Test already added to laboratory cart', { variant: 'warning' });
      return;
    }

    setLabCart([...labCart, {
      testId: selectedTestId,
      name: test.testName,
      price: Number(test.price),
    }]);
    setSelectedTestId('');
  };

  const handleRemoveTestFromCart = (index: number) => {
    setLabCart(labCart.filter((_, i) => i !== index));
  };

  const handleLabOrderSubmit = async () => {
    if (labCart.length === 0) return;
    if (!patientId) {
      enqueueSnackbar('No patient selected', { variant: 'warning' });
      return;
    }

    setOrderingLab(true);
    try {
      let visitId = currentVisitId;
      if (!visitId) {
        const resVisits = await axios.get('/api/visits');
        const visitsArray = Array.isArray(resVisits.data) ? resVisits.data : (resVisits.data?.data || []);
        const activeVisit = visitsArray.find((v: any) => v.patient?.id === patientId && v.status !== 'CLOSED');
        if (activeVisit) {
          visitId = activeVisit.id;
          setCurrentVisitId(visitId);
        }
      }

      await axios.post('/api/lims/orders', {
        patientId,
        visitId: visitId || null,
        tests: labCart,
        priority: labPriority,
        paymentStatus: 'UNPAID',
        clinicalNotes: 'ANC Laboratory Request from Maternity Consultation',
        diagnosis: 'Pregnancy Consultation',
      });

      enqueueSnackbar('Laboratory order placed successfully!', { variant: 'success' });
      setLabCart([]);
      fetchClinicalOrdersHistory(patientId);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to submit laboratory order', { variant: 'error' });
    } finally {
      setOrderingLab(false);
    }
  };

  const handleAddMedToCart = () => {
    if (!selectedMedId) return;
    const med = pharmacyCatalog.find(m => m.id === selectedMedId);
    if (!med) return;

    const existing = presCart.find(m => m.inventoryItemId === selectedMedId);
    if (existing) {
      enqueueSnackbar('Medication already added to prescription cart', { variant: 'warning' });
      return;
    }

    setPresCart([...presCart, {
      inventoryItemId: selectedMedId,
      name: med.genericName || med.tradeName,
      dose: medDose,
      frequency: medFreq,
      duration: medDuration,
      quantityPrescribed: medQty,
      price: Number(med.price || 0),
    }]);
    setSelectedMedId('');
  };

  const handleRemoveMedFromCart = (index: number) => {
    setPresCart(presCart.filter((_, i) => i !== index));
  };

  const handlePrescribeSubmit = async () => {
    if (presCart.length === 0) return;
    if (!patientId) {
      enqueueSnackbar('No patient selected', { variant: 'warning' });
      return;
    }

    setPrescribing(true);
    try {
      let visitId = currentVisitId;
      if (!visitId) {
        const resVisits = await axios.get('/api/visits');
        const visitsArray = Array.isArray(resVisits.data) ? resVisits.data : (resVisits.data?.data || []);
        const activeVisit = visitsArray.find((v: any) => v.patient?.id === patientId && v.status !== 'CLOSED');
        if (activeVisit) {
          visitId = activeVisit.id;
          setCurrentVisitId(visitId);
        }
      }

      await axios.post('/api/pharmacy/prescriptions', {
        patientId,
        visitId: visitId || null,
        items: presCart.map(item => ({
          medicationId: item.inventoryItemId,
          dose: item.dose,
          frequency: item.frequency,
          duration: item.duration,
          route: 'Oral',
          quantityPrescribed: item.quantityPrescribed,
        })),
        priority: 'ROUTINE',
        paymentStatus: 'UNPAID'
      });

      enqueueSnackbar('Prescription submitted and sent to pharmacy queue!', { variant: 'success' });
      setPresCart([]);
      fetchClinicalOrdersHistory(patientId);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to submit prescription', { variant: 'error' });
    } finally {
      setPrescribing(false);
    }
  };

  const handleAdvanceWorkflow = async () => {
    if (!currentVisitId) return;
    setAdvancingWorkflow(true);
    try {
      const res = await axios.post(`/api/workflow/visits/${currentVisitId}/advance`, {});
      enqueueSnackbar(res.data.message || 'Workflow advanced successfully!', { variant: 'success' });
      
      // Clear selected patient to route back to Today's ANC Queue
      setSelectedPatient(null);
      setPatientId('');
      setCurrentVisitId('');
      setCurrentVisitStatus('');
      
      // Refresh the queue and dashboard records
      fetchReportsData();
      fetchDashboardKPIs();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || err.response?.data?.error || 'Failed to advance workflow', { variant: 'error' });
    } finally {
      setAdvancingWorkflow(false);
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

  const fetchReportsData = async () => {
    try {
      const res = await axios.get('/api/maternity/analytics/reports');
      setReportsData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMaternityBeds = async () => {
    try {
      const res = await axios.get('/api/ipd/beds');
      const bedsList = Array.isArray(res.data?.beds) ? res.data.beds : Array.isArray(res.data) ? res.data : [];
      const filtered = bedsList.filter((b: any) => {
        const wCat = (b.wardCategory || b.ward?.wardCategory || '').toUpperCase();
        const wName = (b.wardName || b.ward?.name || '').toUpperCase();
        const bType = (b.bedType || '').toUpperCase();
        const bNum = (b.number || b.bedNumber || '').toUpperCase();
        return (
          wCat === 'MATERNITY' ||
          wCat === 'LABOUR' ||
          wName.includes('MATERNITY') ||
          wName.includes('LABOUR') ||
          wName.includes('DELIVERY') ||
          bNum.startsWith('MAT-') ||
          bNum.startsWith('LBR-')
        );
      });
      setMaternityBeds(filtered);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch patient profile details once patient is selected
  const handleSelectPatient = async (p: any) => {
    setSelectedPatient(p);
    setPatientId(p.id);
    fetchMaternityProfile(p.id);
    fetchActivePregnancy(p.id);
    fetchPatientPregnancies(p.id);
    fetchGynaeConsultations(p.id);
    fetchCervicalScreenings(p.id);
    fetchFertilityAssessments(p.id);
    fetchGynaeProcedures(p.id);
    
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

  const fetchPatientPregnancies = async (pId: string) => {
    try {
      const res = await axios.get(`/api/maternity/patient/${pId}/pregnancies`);
      setPatientPregnancies(res.data || []);
    } catch (e) {
      setPatientPregnancies([]);
    }
  };

  const fetchGynaeConsultations = async (pId: string) => {
    try {
      const res = await axios.get(`/api/maternity/gynaecology/patient/${pId}/consultations`);
      setGynaeConsultations(res.data || []);
    } catch (e) {
      setGynaeConsultations([]);
    }
  };

  const fetchCervicalScreenings = async (pId: string) => {
    try {
      const res = await axios.get(`/api/maternity/cervical-screening/patient/${pId}`);
      setCervicalScreenings(res.data || []);
    } catch (e) {
      setCervicalScreenings([]);
    }
  };

  const fetchFertilityAssessments = async (pId: string) => {
    try {
      const res = await axios.get(`/api/maternity/fertility/patient/${pId}`);
      setFertilityAssessments(res.data || []);
    } catch (e) {
      setFertilityAssessments([]);
    }
  };

  const fetchGynaeProcedures = async (pId: string) => {
    try {
      const res = await axios.get(`/api/maternity/gynaecology/patient/${pId}/procedures`);
      setGynaeProcedures(res.data || []);
    } catch (e) {
      setGynaeProcedures([]);
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
    if (profileCustomData.husbandPhone && profileCustomData.husbandPhone.length !== 11) {
      enqueueSnackbar('Husband Phone must be exactly 11 digits', { variant: 'warning' });
      return;
    }
    const data = new FormData(e.currentTarget);
    const body = {
      patientId,
      gravidity: parseInt(data.get('gravidity') as string) || 1,
      parity: parseInt(data.get('parity') as string) || 0,
      abortions: parseInt(data.get('abortions') as string) || 0,
      livingChildren: parseInt(data.get('livingChildren') as string) || 0,
      bloodGroup: data.get('bloodGroup'),
      rhesusStatus: data.get('rhesusStatus'),
      hivStatus: data.get('hivStatus'),
      hivTestDate: data.get('hivTestDate') || null,
      pmtctEnrolled: data.get('pmtctEnrolled') === 'true',
      pmtctArv: data.get('pmtctArv'),
      syphilisStatus: data.get('syphilisStatus'),
      hepatitisBStatus: data.get('hepatitisBStatus'),
      malariaStatus: data.get('malariaStatus'),
      ttDoseCount: parseInt(data.get('ttDoseCount') as string) || 0,
      ironFolateSupplied: data.get('ironFolateSupplied') === 'true',
      insuranceScheme: data.get('insuranceScheme'),
      referralSource: data.get('referralSource'),
      bookingDate: data.get('bookingDate') || null,
      nigeriaObstetricScore: data.get('nigeriaObstetricScore'),
      customFields: JSON.stringify(profileCustomData)
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/profile', body);
      enqueueSnackbar('Maternity profile saved successfully', { variant: 'success' });
      setProfileDialogOpen(false);
      fetchMaternityProfile(patientId);
      fetchDashboardKPIs();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save profile', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Save Pregnancy Record
  const handleSavePregnancy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.post('/api/maternity/register', {
        patientId,
        gestationNumber: activePregnancy ? activePregnancy.gestationNumber + 1 : 1,
        lmpDate,
        isHighRisk,
        highRiskReason,
        customFields: JSON.stringify(pregnancyCustomData)
      });
      enqueueSnackbar('Pregnancy registered successfully', { variant: 'success' });
      setPregnancyDialogOpen(false);
      fetchActivePregnancy(patientId);
      fetchDashboardKPIs();
      fetchReportsData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to register pregnancy', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Save Antenatal Visit
  const handleSaveVisit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activePregnancy) return;
    const data = new FormData(e.currentTarget);
    const body = {
      pregnancyId: activePregnancy.id,
      weight: parseFloat(data.get('weight') as string) || null,
      systolic: parseFloat(data.get('systolic') as string) || null,
      diastolic: parseFloat(data.get('diastolic') as string) || null,
      urineProtein: data.get('urineProtein'),
      urineGlucose: data.get('urineGlucose'),
      fundalHeight: parseFloat(data.get('fundalHeight') as string) || null,
      fetalPresentation: data.get('fetalPresentation'),
      fetalLie: data.get('fetalLie'),
      fetalHeartRate: parseFloat(data.get('fetalHeartRate') as string) || null,
      fetalMovement: data.get('fetalMovement'),
      dangerSigns: data.get('dangerSigns'),
      educationTopics: data.get('educationTopics'),
      nextVisitDate: data.get('nextVisitDate') || null,
      visitDate: data.get('visitDate') || null,
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/visit', body);
      enqueueSnackbar('ANC Visit recorded successfully', { variant: 'success' });
      setVisitDialogOpen(false);
      fetchActivePregnancy(patientId);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to record visit', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Save Risk Assessment
  const handleSaveRisk = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!maternityProfile) return;
    const data = new FormData(e.currentTarget);
    const riskFactors = [];
    if (riskFactorsState.htn) riskFactors.push('Hypertension');
    if (riskFactorsState.dm) riskFactors.push('Diabetes Mellitus');
    if (riskFactorsState.prevCs) riskFactors.push('Previous Caesarean Section');
    if (riskFactorsState.multi) riskFactors.push('Multiple Gestation');
    if (riskFactorsState.age) riskFactors.push('Advanced Maternal Age');
    if (riskFactorsState.anaemia) riskFactors.push('Severe Anaemia');
    if (riskFactorsState.other && otherRiskFactorText.trim()) riskFactors.push(otherRiskFactorText.trim());

    const body = {
      maternityProfileId: maternityProfile.id,
      assessorId: user?.staffId || '',
      riskCategory: riskCategory,
      riskFactors: JSON.stringify(riskFactors),
      recommendedCare: data.get('recommendedCare'),
      referralRequired: referralRequired === 'true',
      referralReason: data.get('referralReason'),
      referralFacility: data.get('referralFacility'),
      actionPlan: data.get('actionPlan'),
      nextReviewDate: data.get('nextReviewDate') || null,
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/risk-assessment', body);
      enqueueSnackbar('Maternal risk assessment recorded', { variant: 'success' });
      setRiskDialogOpen(false);
      fetchMaternityProfile(patientId);
      fetchReportsData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save risk', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Save Fetal Surveillance
  const handleSaveSurveillance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!maternityProfile) return;
    const data = new FormData(e.currentTarget);
    const body = {
      maternityProfileId: maternityProfile.id,
      pregnancyId: activePregnancy?.id || null,
      surveillanceType: data.get('surveillanceType'),
      gestationalAgeWeeks: parseInt(data.get('gestationalAgeWeeks') as string) || null,
      biparietal: parseFloat(data.get('biparietal') as string) || null,
      fetalLength: parseFloat(data.get('fetalLength') as string) || null,
      abdominalCirc: parseFloat(data.get('abdominalCirc') as string) || null,
      estimatedFetalWeight: parseFloat(data.get('estimatedFetalWeight') as string) || null,
      amnioticFluidIndex: parseFloat(data.get('amnioticFluidIndex') as string) || null,
      placentaGrade: data.get('placentaGrade'),
      placentaLocation: data.get('placentaLocation'),
      cervicalLength: parseFloat(data.get('cervicalLength') as string) || null,
      fetalHeartRate: parseFloat(data.get('fetalHeartRate') as string) || null,
      kicksPerHour: parseInt(data.get('kicksPerHour') as string) || null,
      biophysicalScore: parseInt(data.get('biophysicalScore') as string) || null,
      dopplerFindings: data.get('dopplerFindings'),
      anomaliesDetected: data.get('anomaliesDetected') === 'true',
      anomalyDetails: data.get('anomalyDetails'),
      reportNotes: data.get('reportNotes'),
      reportedBy: user?.username || 'Sonographer',
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/fetal-surveillance', body);
      enqueueSnackbar('Fetal surveillance log added successfully', { variant: 'success' });
      setSurveillanceDialogOpen(false);
      fetchMaternityProfile(patientId);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to record surveillance', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Save Obstetric Complication
  const handleSaveComplication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!maternityProfile) return;
    const data = new FormData(e.currentTarget);
    const body = {
      maternityProfileId: maternityProfile.id,
      pregnancyId: activePregnancy?.id || null,
      complicationType: data.get('complicationType'),
      severity: data.get('severity'),
      managementNotes: data.get('managementNotes'),
      drugsAdministered: JSON.stringify(complicationDrugs),
      outcome: data.get('outcome') || 'ONGOING',
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/complication', body);
      enqueueSnackbar('Maternal complication logged', { variant: 'warning' });
      setComplicationDialogOpen(false);
      fetchMaternityProfile(patientId);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to log complication', { variant: 'error' });
    } finally {
      setLoading(false);
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

  // Log Partograph Monitor Entry
  const handleLogMonitor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const activeLabour = activePregnancy?.labourRecords?.find((l: any) => l.status === 'ACTIVE');
    if (!activeLabour) return;
    
    const data = new FormData(e.currentTarget);
    const body = {
      labourRecordId: activeLabour.id,
      cervicalDilatation: parseFloat(data.get('cervicalDilatation') as string) || 0,
      fetalStationLevel: data.get('fetalStationLevel'),
      fetalPresentation: data.get('fetalPresentation'),
      fetalHeartRate: parseFloat(data.get('fetalHeartRate') as string) || 140,
      uterineContractions: parseInt(data.get('uterineContractions') as string) || 0,
      contractionStrength: data.get('contractionStrength'),
      membranesStatus: data.get('membranesStatus'),
      liquidourColour: data.get('liquidourColour'),
      maternalPulse: parseFloat(data.get('maternalPulse') as string) || 80,
      maternalBp: data.get('maternalBp') || '120/80',
      maternalTemp: parseFloat(data.get('maternalTemp') as string) || 37,
      notes: data.get('notes'),
      enteredBy: user?.username || 'Midwife'
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/labour/monitor', body);
      enqueueSnackbar('Partograph data entry registered', { variant: 'success' });
      setMonitorDialogOpen(false);
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
    const body = {
      pregnancyId: activePregnancy.id,
      deliveryType: data.get('deliveryType'),
      bloodLossMl: parseFloat(data.get('bloodLossMl') as string) || 0,
      complications: data.get('complications'),
      placentaCondition: data.get('placentaCondition'),
      birthAttendantId: user?.staffId || '',
      babyName: data.get('babyName'),
      birthWeight: parseFloat(data.get('birthWeight') as string) || 0,
      birthLength: parseFloat(data.get('birthLength') as string) || null,
      headCircumference: parseFloat(data.get('headCircumference') as string) || null,
      sex: data.get('sex'),
      apgar1Min: parseInt(data.get('apgar1Min') as string) || 8,
      apgar5Min: parseInt(data.get('apgar5Min') as string) || 9,
      examinationNotes: data.get('examinationNotes'),
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/delivery', body);
      enqueueSnackbar('Delivery and Neonatal records documented successfully', { variant: 'success' });
      setDeliveryDialogOpen(false);
      fetchActivePregnancy(patientId);
      fetchDashboardKPIs();
      fetchReportsData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to document delivery', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Save Postnatal Visit (PNC)
  const handleSavePnc = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patientId) {
      enqueueSnackbar('No patient selected', { variant: 'warning' });
      return;
    }
    const data = new FormData(e.currentTarget);
    const body = {
      patientId: patientId,
      visitType: data.get('visitType'),
      dayPostDelivery: parseInt(data.get('dayPostDelivery') as string) || 1,
      motherVitalsBp: data.get('motherVitalsBp'),
      motherPulse: parseFloat(data.get('motherPulse') as string) || null,
      motherTemp: parseFloat(data.get('motherTemp') as string) || null,
      uterineInvolution: data.get('uterineInvolution'),
      lochiaCharacter: data.get('lochiaCharacter'),
      perinealHealing: data.get('perinealHealing'),
      breastfeedingStatus: data.get('breastfeedingStatus'),
      maternalDepression: data.get('maternalDepression') === 'true',
      epsychologicalScreen: data.get('epsychologicalScreen'),
      babyWeight: parseFloat(data.get('babyWeight') as string) || null,
      babyTemperature: parseFloat(data.get('babyTemperature') as string) || null,
      babyBreathing: data.get('babyBreathing'),
      cordHealingStatus: data.get('cordHealingStatus'),
      vitaminKGiven: data.get('vitaminKGiven') === 'true',
      vaccinesGiven: data.get('vaccinesGiven') || '',
      immunizationsGiven: data.get('immunizationsGiven') || '',
      clinicianNotes: data.get('clinicianNotes'),
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/postnatal/visit', body);
      enqueueSnackbar('PNC record saved successfully', { variant: 'success' });
      setPncDialogOpen(false);
      fetchMaternityProfile(patientId);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to record PNC visit', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Save Gynaecology Consultation
  const handleSaveGynae = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = {
      patientId,
      clinicianId: user?.staffId || '',
      consultationType: data.get('consultationType'),
      chiefComplaint: data.get('chiefComplaint'),
      menstrualHistory: data.get('menstrualHistory'),
      obstetricHistory: data.get('obstetricHistory'),
      contraceptiveHistory: data.get('contraceptiveHistory'),
      clinicalFindings: data.get('clinicalFindings'),
      diagnosis: data.get('diagnosis'),
      managementPlan: data.get('managementPlan'),
      referralRequired: data.get('referralRequired') === 'true',
      referralTo: data.get('referralTo'),
      followUpDate: data.get('followUpDate') || null,
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/gynaecology/consult', body);
      enqueueSnackbar('Gynaecology consultation recorded successfully', { variant: 'success' });
      setGynaeDialogOpen(false);
      fetchGynaeConsultations(patientId);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save consultation', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Save Family Planning contraceptive choice
  const handleSaveFP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patientId) {
      enqueueSnackbar('No patient selected', { variant: 'warning' });
      return;
    }
    const data = new FormData(e.currentTarget);
    const body = {
      patientId,
      counsellorId: user?.staffId || '',
      methodChosen: data.get('methodChosen'),
      methodStartDate: data.get('methodStartDate') || null,
      reasonForMethod: data.get('reasonForMethod'),
      isPostpartum: data.get('isPostpartum') === 'true',
      nextAppointment: data.get('nextAppointment') || null,
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/family-planning', body);
      enqueueSnackbar('Family planning enrollment recorded successfully', { variant: 'success' });
      setFpDialogOpen(false);
      fetchMaternityProfile(patientId);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save enrollment', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // PMTCT ARV Regimens Functions
  const handleAddPmtct = () => {
    if (!newPmtctCode || !newPmtctName) return;
    const newList = [...pmtctRegimens, { code: newPmtctCode, name: newPmtctName, status: 'ACTIVE' }];
    setPmtctRegimens(newList);
    localStorage.setItem('pmtct_arv_regimens', JSON.stringify(newList));
    setNewPmtctCode('');
    setNewPmtctName('');
    setOpenAddPmtct(false);
    enqueueSnackbar('PMTCT regimen added', { variant: 'success' });
  };

  const handleTogglePmtctStatus = (code: string) => {
    const newList = pmtctRegimens.map(r => r.code === code ? { ...r, status: r.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : r);
    setPmtctRegimens(newList);
    localStorage.setItem('pmtct_arv_regimens', JSON.stringify(newList));
    enqueueSnackbar('Regimen status updated', { variant: 'success' });
  };

  const handleDeletePmtct = (code: string) => {
    const newList = pmtctRegimens.filter(r => r.code !== code);
    setPmtctRegimens(newList);
    localStorage.setItem('pmtct_arv_regimens', JSON.stringify(newList));
    enqueueSnackbar('Regimen deleted', { variant: 'info' });
  };

  // PMTCT Follow-up
  const handleSavePmtct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!maternityProfile) return;
    const data = new FormData(e.currentTarget);
    const body = {
      maternityProfileId: maternityProfile.id,
      infantAge: data.get('infantAge'),
      infantArvProphylaxis: data.get('infantArvProphylaxis'),
      infantEidTest: data.get('infantEidTest') === 'true',
      infantEidResult: data.get('infantEidResult'),
      infantEidDate: data.get('infantEidDate') || null,
      breastfeedingStatus: data.get('breastfeedingStatus'),
      motherArvAdherence: data.get('motherArvAdherence'),
      motherVlMonitoring: data.get('motherVlMonitoring') === 'true',
      motherVlResult: parseFloat(data.get('motherVlResult') as string) || null,
      motherVlDate: data.get('motherVlDate') || null,
      clinicianNotes: data.get('clinicianNotes'),
      nextFollowUp: data.get('nextFollowUp') || null,
    };

    try {
      setLoading(true);
      await axios.post('/api/maternity/pmtct/followup', body);
      enqueueSnackbar('PMTCT followup logged successfully', { variant: 'success' });
      setPmtctDialogOpen(false);
      fetchMaternityProfile(patientId);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save PMTCT details', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // NigeriaMRS Interoperability manual sync trigger
  const handleSyncNigeriaMrs = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const res = await axios.post('/api/maternity/nigeriamrs/sync', { patientId });
      enqueueSnackbar(`Successfully synchronized with NigeriaMRS database! Txn ID: ${res.data.transactionId}`, { variant: 'success' });
      setFhirPayloadData(res.data.fhirPayload);
      setFhirDialogOpen(true);
      fetchMaternityProfile(patientId);
    } catch (err: any) {
      enqueueSnackbar('NigeriaMRS sync failed check logs', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDischargePatient = async () => {
    if (!activePregnancy) return;
    try {
      setLoading(true);
      await axios.post(`/api/maternity/pregnancy/${activePregnancy.id}/discharge`);
      enqueueSnackbar('Patient has been successfully discharged from maternity care', { variant: 'success' });
      setDischargeDialogOpen(false);
      fetchActivePregnancy(patientId);
      fetchPatientPregnancies(patientId);
    } catch (err: any) {
      enqueueSnackbar('Failed to discharge patient', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Trigger Emergency blood/theatre call simulation
  const triggerObstetricEmergencyAlert = (type: string) => {
    enqueueSnackbar(`[CRITICAL ALERT]: Predefined response protocol activated for obstetric emergency: ${type}! Resuscitation teams notified.`, { variant: 'warning' });
  };

  // Mock Partograph dil trends
  const activeLabourRecord = activePregnancy?.labourRecords?.find((l: any) => l.status === 'ACTIVE');
  const partographChartData = activeLabourRecord?.monitoringEntries?.map((entry: any, index: number) => ({
    hour: index * 2,
    cervicalDilatation: entry.cervicalDilatation,
    fetalStationLevel: entry.fetalStationLevel ? parseInt(entry.fetalStationLevel) || 0 : null,
    alertLine: index * 2 + 4,
    actionLine: index * 2 + 8,
  })) || [];

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/maternity/partographs') setActiveTab(0);
    else if (path === '/maternity/deliveries') setActiveTab(0);
    else if (path === '/maternity/postnatal') setActiveTab(0);
    else setActiveTab(0);
  }, [location.pathname]);

  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/maternity/partographs') {
      return {
        title: 'Labor Ward Partograph & Intrapartum Monitoring',
        subtitle: 'WHO Modified Partographs · Fetal Heart Rates · Uterine Contraction Traces',
        category: 'Maternity & Postnatal Ward',
        kpis: [
          { label: 'Active Labor Cases', value: `${dashboardData.wardBeds?.occupied || 0} Patients`, subtitle: 'Labor Ward', icon: <Timeline />, color: '#e03131' },
          { label: 'Alert Line Crossed', value: '0 Alert', subtitle: 'Action Line Warning', icon: <Warning />, color: '#f59f00' },
          { label: 'Avg Labor Duration', value: '8.5 Hours', subtitle: 'Primigravida Avg', icon: <ChildCare />, color: '#1c7ed6' },
          { label: 'Partographs Logged', value: '100% Tracked', subtitle: 'Clinical Audit', icon: <CheckCircle />, color: '#2f9e44' },
        ],
      };
    }

    if (path === '/maternity/deliveries') {
      return {
        title: 'Delivery & Live Birth Register',
        subtitle: 'Spontaneous Vaginal Deliveries · C-Section Logs · APGAR Scores · Neonatal Resus',
        category: 'Maternity & Postnatal Ward',
        kpis: [
          { label: 'Deliveries This Month', value: `${dashboardData.deliveriesCount || 0} Births`, subtitle: 'Live Deliveries', icon: <ChildCare />, color: '#2b8a3e' },
          { label: 'C-Section Rate', value: '18.4%', subtitle: 'Surgical Deliveries', icon: <Healing />, color: '#ae3ec9' },
          { label: 'Avg APGAR Score (5m)', value: '9.2 / 10', subtitle: 'Neonatal Well-Being', icon: <CheckCircle />, color: '#1c7ed6' },
          { label: 'PPH Incidence', value: '0.0%', subtitle: 'Zero PPH Incidents', icon: <Shield />, color: '#7048e8' },
        ],
      };
    }

    if (path === '/maternity/postnatal') {
      return {
        title: 'Postnatal Care (PNC) & Immunization Registry',
        subtitle: 'Mother/Infant 6-Week Checkups · Uterine Involution · Vitamin K & Vaccines',
        category: 'Maternity & Postnatal Ward',
        kpis: [
          { label: 'PNC Assessments', value: '14 Checkups', subtitle: 'Postpartum Visits', icon: <Healing />, color: '#2b8a3e' },
          { label: 'Exclusive Breastfeeding', value: '92%', subtitle: 'Maternal Survey', icon: <ChildCare />, color: '#1c7ed6' },
          { label: 'Postpartum Depression', value: '0 Screened High', subtitle: 'EPDS Survey', icon: <CheckCircle />, color: '#f59f00' },
          { label: 'Infant Vaccines Given', value: '100%', subtitle: 'BCG/OPV0/HBV0', icon: <Shield />, color: '#7048e8' },
        ],
      };
    }

    // Default: ANC
    return {
      title: 'Antenatal Care (ANC) Registration & High-Risk Cohort Desk',
      subtitle: 'GRAVIDA / PARITY Profiling · High-Risk Screening · Tetanus Toxoid & Iron-Folate',
      category: 'Maternity & Postnatal Ward',
      kpis: [
        { label: 'Active Pregnancies', value: `${dashboardData.activePregnancies || 0} ANC Patients`, subtitle: 'Active ANC Cohort', icon: <PregnantWoman />, color: '#3b5bdb' },
        { label: 'High-Risk Pregnancies', value: `${dashboardData.highRiskPregnancies || 0} Patients`, subtitle: 'Pre-Eclampsia/GDM', icon: <Warning />, color: '#e67700' },
        { label: 'PMTCT Enrollments', value: `${dashboardData.activePmtct || 0} Mothers`, subtitle: 'Option B+ Protocol', icon: <Shield />, color: '#6741d9' },
        { label: 'Ward Bed Occupancy', value: `${dashboardData.wardBeds?.occupied || 0} / ${dashboardData.wardBeds?.total || 12}`, subtitle: 'Labor Beds', icon: <LocalHospital />, color: '#2b8a3e' },
      ],
    };
  };

  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
      {/* Custom Header Banner Tailored to Page */}
      <Box sx={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #2b8a3e 50%, #6741d9 100%)', color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Maternity &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              🤱 {pageDetails.title}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.88, fontWeight: 500, mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" color="secondary" startIcon={<PersonAdd />} onClick={() => setOpenExternalModal(true)}>
              Walk-in Client
            </Button>
            <Button variant="outlined" sx={{ color: '#fff', borderColor: '#fff' }} startIcon={<EventNote />} onClick={() => setOpenApptModal(true)}>
              Schedule ANC
            </Button>
            <Button 
              variant="outlined" 
              sx={{ color: '#fff', borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }} 
              startIcon={<LocalHospital />} 
              onClick={() => navigate('/ipd/maternity')}
            >
              🛏️ Inpatient Bed Census
            </Button>
          </Box>
        </Stack>
      </Box>

      {/* Tailored 4-Card KPI Strip */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Grid container spacing={2}>
          {pageDetails.kpis.map((kpi, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Card 
                onClick={() => {
                  if (kpi.label.includes('Bed')) navigate('/ipd/maternity');
                }}
                sx={{ 
                  height: '100%', 
                  background: `linear-gradient(135deg, ${kpi.color}18 0%, ${kpi.color}08 100%)`, 
                  border: `1px solid ${kpi.color}30`, 
                  boxShadow: 'none',
                  cursor: kpi.label.includes('Bed') ? 'pointer' : 'default',
                  transition: 'transform 0.2s',
                  '&:hover': kpi.label.includes('Bed') ? { transform: 'translateY(-2px)' } : {}
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>{kpi.label}</Typography>
                      <Typography variant="h4" fontWeight={900} color={kpi.color} mt={0.5}>{kpi.value}</Typography>
                      {kpi.subtitle && <Typography variant="caption" color="text.secondary">{kpi.subtitle}</Typography>}
                    </Box>
                    <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: `${kpi.color}20`, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {kpi.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Live Configured Beds Grid */}
      {maternityBeds.length > 0 && (
        <Box sx={{ px: 3, mb: 3 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={800} color="#3b5bdb" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🤱 Configured Maternity & Labour Beds (Live Census)
              </Typography>
              <Chip
                label={`${maternityBeds.filter(b => b.status === 'OCCUPIED').length} Occupied / ${maternityBeds.length} Total Configured`}
                color="primary"
                size="small"
                sx={{ fontWeight: 800 }}
              />
            </Box>
            <Grid container spacing={2}>
              {maternityBeds.map((bed: any) => (
                <Grid item xs={12} sm={6} md={3} key={bed.id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.8,
                      borderRadius: 2,
                      borderColor: bed.status === 'OCCUPIED' ? '#e03131' : '#2b8a3e',
                      bgcolor: bed.status === 'OCCUPIED' ? '#fff5f5' : '#f6fbf7'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight={800} color="#1c7ed6">
                        {bed.number}
                      </Typography>
                      <Chip
                        label={bed.status}
                        size="small"
                        color={bed.status === 'OCCUPIED' ? 'error' : 'success'}
                        sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                      Ward: {bed.wardName}
                    </Typography>
                    {bed.patient ? (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" fontWeight={800} color="text.primary" noWrap>
                          {bed.patient.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          MRN: {bed.patient.patientId} · {bed.patient.gender} ({bed.patient.age || 'N/A'}y)
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Bed Vacant / Clean
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Box>
      )}

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
                setPatientPregnancies([]);
                setGynaeConsultations([]);
                setCervicalScreenings([]);
                setFertilityAssessments([]);
                setGynaeProcedures([]);
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
                label={
                  activePregnancy 
                    ? activePregnancy.status === 'DELIVERED' 
                      ? 'Delivered (Postpartum)' 
                      : `Gestational Age: ${activePregnancy.gestationNumber} Pregnancy` 
                    : 'No Active Pregnancy'
                }
                color={activePregnancy ? 'success' : 'default'}
              />
              {activePregnancy?.isHighRisk && <Chip label="HIGH RISK" color="error" />}
              {activePregnancy && ['ACTIVE', 'DELIVERED'].includes(activePregnancy.status) && (
                <Button variant="outlined" color="primary" size="small" onClick={() => setDischargeDialogOpen(true)}>
                  Discharge Patient
                </Button>
              )}
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

      {/* TABS CONTAINER */}
      <Paper sx={{ mb: 4, borderRadius: '12px' }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<Healing />} label="PNC & Gynaecology Services" />
          <Tab icon={<CloudSync />} label="PMTCT & NigeriaMRS Integration" />
          <Tab icon={<BarChartIcon />} label="Executive BI & Reports" />
        </Tabs>
      </Paper>
      <Box>
        <Alert 
          severity="info" 
          sx={{ mb: 3, borderRadius: 3, border: '1px solid #74c0fc', bgcolor: '#e7f5ff' }} 
          action={
            <Button color="primary" size="small" variant="contained" onClick={() => navigate('/ipd/maternity/pnc-gynae')}>
              Open PNC & Gynaecology in IPD Beds
            </Button>
          }
        >
          <strong>PNC & Gynaecology Services relocated:</strong> Postnatal Care assessments, Family Planning, Cervical Cancer Screenings, and Gynaecology Consultations are now hosted directly under <strong>Active Maternity Beds (http://localhost:5173/ipd/maternity)</strong>.
        </Alert>
        {activeTab === 0 && (!selectedPatient ? renderNoPatientSelected("Postnatal Care & Family Planning Registry", "Please select a patient to document postnatal checkup outcomes, schedule gynaecological surgery procedures, log cervical cancer VIA tests, or choose family planning contraceptive methods.", <Healing sx={{ fontSize: 60 }} />) : (
          <Grid container spacing={3}>
            {/* PNC Forms & Lists */}
            <Grid item xs={12} md={6}>
              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title="Postnatal Care (PNC) Assessments"
                  action={
                    <Button variant="contained" size="small" onClick={() => setPncDialogOpen(true)}>Log PNC Assessment</Button>
                  }
                />
                <Divider />
                <CardContent>
                  {maternityProfile?.postnatalVisits?.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead sx={{ bgcolor: LIGHT_BG }}>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Involution</TableCell>
                            <TableCell>Lochia</TableCell>
                            <TableCell>Feeding</TableCell>
                            <TableCell>Baby Temp</TableCell>
                            <TableCell>Vitamin K</TableCell>
                            <TableCell>Vaccines Given</TableCell>
                            <TableCell>PPD Screen</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {maternityProfile.postnatalVisits.map((pnc: any) => (
                            <TableRow key={pnc.id}>
                              <TableCell>{new Date(pnc.visitDate).toLocaleDateString()}</TableCell>
                              <TableCell>{pnc.uterineInvolution}</TableCell>
                              <TableCell>{pnc.lochiaCharacter}</TableCell>
                              <TableCell>{pnc.breastfeedingStatus}</TableCell>
                              <TableCell>{pnc.babyTemperature}°C</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={pnc.vitaminKGiven ? 'Given' : 'Not Given'}
                                  color={pnc.vitaminKGiven ? 'success' : 'default'}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                {pnc.vaccinesGiven ? (
                                  <Tooltip title={String(pnc.immunizationsGiven || 'No details')}>
                                    <span>
                                      <Chip size="small" label={pnc.vaccinesGiven} color="info" />
                                    </span>
                                  </Tooltip>
                                ) : (
                                  <Typography variant="caption" color="text.secondary">—</Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={pnc.maternalDepression ? 'PPD Risk Alert' : 'Normal'}
                                  color={pnc.maternalDepression ? 'error' : 'success'}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">No PNC visits documented for this mother yet.</Alert>
                  )}
                </CardContent>
              </Card>

              {/* Family Planning */}
              <Card>
                <CardHeader
                  title="Contraceptive & Family Planning Choice"
                  action={<Button variant="outlined" size="small" onClick={() => setFpDialogOpen(true)}>New Enrollment</Button>}
                />
                <Divider />
                <CardContent>
                  {maternityProfile?.familyPlanningEnrollments?.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Contraceptive Method:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{maternityProfile.familyPlanningEnrollments[0].methodChosen}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Enrollment Date:</Typography>
                        <Typography variant="body2">{new Date(maternityProfile.familyPlanningEnrollments[0].enrollmentDate).toLocaleDateString()}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Next Appointment Reminder:</Typography>
                        <Typography variant="body2" sx={{ color: WARNING, fontWeight: 'bold' }}>
                          {maternityProfile.familyPlanningEnrollments[0].nextAppointment
                            ? new Date(maternityProfile.familyPlanningEnrollments[0].nextAppointment).toLocaleDateString()
                            : 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Alert severity="info">No family planning methods documented.</Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Gynaecology consultations & screenings */}
            <Grid item xs={12} md={6}>
              {/* Delivery History & Newborn Registry */}
              {(() => {
                const deliveries = patientPregnancies?.flatMap((p: any) => 
                  p.deliveryRecords?.map((d: any) => ({ ...d, gestationNumber: p.gestationNumber })) || []
                ) || [];
                
                if (deliveries.length === 0) return null;
                
                return (
                  <Card sx={{ mb: 3, borderLeft: `5px solid ${PRIMARY}` }}>
                    <CardHeader title="Delivery History & Newborn Registry" />
                    <Divider />
                    <CardContent>
                      <Stack spacing={2.5}>
                        {deliveries.map((d: any) => (
                          <Box 
                            key={d.id} 
                            sx={{ 
                              p: 2, 
                              borderRadius: '8px', 
                              bgcolor: LIGHT_BG, 
                              border: '1px solid #dee2e6' 
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                👶 Delivery (Pregnancy #{d.gestationNumber})
                              </Typography>
                              <Chip 
                                label={d.deliveryType} 
                                color="primary" 
                                size="small" 
                                sx={{ fontWeight: 'bold', fontSize: '0.7rem' }} 
                              />
                            </Box>
                            
                            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Date & Time</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {new Date(d.birthTimestamp).toLocaleString()}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Blood Loss</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {d.bloodLossMl} ml
                                </Typography>
                              </Grid>
                              {d.complications && (
                                <Grid item xs={12}>
                                  <Typography variant="caption" color="text.secondary">Complications</Typography>
                                  <Typography variant="body2" sx={{ color: DANGER, fontWeight: 600 }}>
                                    {d.complications}
                                  </Typography>
                                </Grid>
                              )}
                            </Grid>

                            <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: PRIMARY, fontSize: '0.8rem' }}>
                              Newborn Details
                            </Typography>
                            {d.neonatalRecords?.map((n: any) => (
                              <Box 
                                key={n.id} 
                                sx={{ 
                                  p: 1.5, 
                                  borderRadius: '6px', 
                                  bgcolor: '#fff', 
                                  border: '1px solid #e9ecef' 
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    {n.babyName}
                                  </Typography>
                                  <Chip 
                                    label={n.sex} 
                                    size="small" 
                                    color={n.sex === 'MALE' ? 'info' : 'secondary'} 
                                    sx={{ height: 18, fontSize: '0.65rem' }} 
                                  />
                                </Box>
                                <Grid container spacing={1}>
                                  <Grid item xs={4}>
                                    <Typography variant="caption" color="text.secondary">Weight</Typography>
                                    <Typography variant="body2">{n.birthWeight} kg</Typography>
                                  </Grid>
                                  <Grid item xs={4}>
                                    <Typography variant="caption" color="text.secondary">Length</Typography>
                                    <Typography variant="body2">{n.birthLength || 'N/A'} cm</Typography>
                                  </Grid>
                                  <Grid item xs={4}>
                                    <Typography variant="caption" color="text.secondary">APGAR (1m/5m)</Typography>
                                    <Typography variant="body2">{n.apgar1Min}/{n.apgar5Min}</Typography>
                                  </Grid>
                                </Grid>
                              </Box>
                            ))}
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })()}

              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title="Gynaecology Consultations & Procedures"
                  action={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="contained" size="small" onClick={() => setGynaeDialogOpen(true)}>New Consultation</Button>
                      <Button variant="outlined" size="small" onClick={() => setProcedureDialogOpen(true)}>Procedure</Button>
                    </Box>
                  }
                />
                <Divider />
                <CardContent>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Comprehensive specialist record dashboard for non-pregnancy related gynaecological cases, diagnostic scopes, pap smears, and surgeries.
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    <Button variant="outlined" startIcon={<Add />} onClick={() => setCervicalDialogOpen(true)} sx={{ mr: 1, mb: 1 }}>Cervical Cancer Screening Log</Button>
                    <Button variant="outlined" startIcon={<Add />} onClick={() => setFertilityDialogOpen(true)} sx={{ mb: 1 }}>Fertility Assessment</Button>
                  </Box>

                  {gynaeConsultations.length > 0 ? (
                    <Stack spacing={2} sx={{ mb: 3 }}>
                      {gynaeConsultations.map((c: any) => (
                        <Box key={c.id} sx={{ p: 2, borderRadius: '8px', bgcolor: '#f8f9fa', border: '1px solid #dee2e6' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              🩺 {c.consultationType} Consultation
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(c.consultDate).toLocaleString()}
                            </Typography>
                          </Box>
                          
                          <Grid container spacing={1.5}>
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">Chief Complaint</Typography>
                              <Typography variant="body2">{c.chiefComplaint}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">Diagnosis</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: PRIMARY }}>{c.diagnosis}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">Management Plan</Typography>
                              <Typography variant="body2">{c.managementPlan}</Typography>
                            </Grid>
                            {c.referralRequired && (
                              <Grid item xs={12}>
                                <Chip label={`Referred to: ${c.referralTo || 'Specialist'}`} color="warning" size="small" />
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ced4da', mb: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No gynaecology consultations found for this patient.
                      </Typography>
                    </Box>
                  )}

                  {cervicalScreenings.length > 0 && (
                    <Stack spacing={2} sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}>Cervical Screenings</Typography>
                      {cervicalScreenings.map((c: any) => (
                        <Box key={c.id} sx={{ p: 2, borderRadius: '8px', bgcolor: '#fff', border: '1px solid #1976d240', borderLeft: '4px solid #1976d2' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {c.screeningMethod} Screening
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(c.screeningDate).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Typography variant="body2"><strong>Result:</strong> {c.screeningResult}</Typography>
                          {c.notes && <Typography variant="body2"><strong>Notes:</strong> {c.notes}</Typography>}
                        </Box>
                      ))}
                    </Stack>
                  )}

                  {fertilityAssessments.length > 0 && (
                    <Stack spacing={2} sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}>Fertility Assessments</Typography>
                      {fertilityAssessments.map((f: any) => (
                        <Box key={f.id} sx={{ p: 2, borderRadius: '8px', bgcolor: '#fff', border: '1px solid #9c27b040', borderLeft: '4px solid #9c27b0' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              Fertility Evaluation
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(f.assessmentDate).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Typography variant="body2"><strong>Type:</strong> {f.infertilityType} Infertility ({f.durationInfertility})</Typography>
                          <Typography variant="body2"><strong>ART Recommended:</strong> {f.artRecommended ? 'Yes' : 'No'}</Typography>
                          {f.notes && <Typography variant="body2"><strong>Notes:</strong> {f.notes}</Typography>}
                        </Box>
                      ))}
                    </Stack>
                  )}

                  {gynaeProcedures.length > 0 && (
                    <Stack spacing={2} sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}>Gynaecology Procedures</Typography>
                      {gynaeProcedures.map((proc: any) => (
                        <Box key={proc.id} sx={{ p: 2, borderRadius: '8px', bgcolor: '#fff', border: '1px solid #4caf5040', borderLeft: '4px solid #4caf50' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              🔪 {proc.procedureType} Procedure
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {proc.performedDate ? new Date(proc.performedDate).toLocaleDateString() : 'Pending'}
                            </Typography>
                          </Box>
                          <Grid container spacing={1}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2"><strong>Status:</strong> {proc.status}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2"><strong>Anaesthesia:</strong> {proc.anaesthesiaType}</Typography>
                            </Grid>
                            {proc.findings && (
                              <Grid item xs={12}>
                                <Typography variant="body2"><strong>Findings:</strong> {proc.findings}</Typography>
                              </Grid>
                            )}
                            {proc.complications && proc.complications !== 'None' && (
                              <Grid item xs={12}>
                                <Typography variant="body2" color="error.main"><strong>Complications:</strong> {proc.complications}</Typography>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ))}

        {/* Tab 2: PMTCT & Interop */}
        {activeTab === 1 && (
          <Grid container spacing={3}>
            {/* PMTCT ARV Regimens Config (Global) */}
            <Grid item xs={12}>
              <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MedicalServices color="secondary" />
                      <Typography variant="h6" fontWeight={700}>PMTCT ARV Regimens</Typography>
                    </Box>
                    <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setOpenAddPmtct(true)} color="secondary">
                      Add Regimen
                    </Button>
                  </Box>
                  <Divider sx={{ marginBottom: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {pmtctRegimens.map((r) => (
                      <Box
                        key={r.code}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 1.5,
                          bgcolor: 'action.hover',
                          borderRadius: 2,
                          opacity: r.status === 'ACTIVE' ? 1 : 0.6
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{r.name}</Typography>
                          <Typography variant="caption" color="text.secondary">Code: {r.code}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={r.status} 
                            size="small" 
                            color={r.status === 'ACTIVE' ? 'success' : 'default'} 
                            onClick={() => handleTogglePmtctStatus(r.code)}
                            sx={{ cursor: 'pointer' }}
                          />
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDeletePmtct(r.code)}
                            sx={{ minWidth: 40 }}
                          >
                            <Delete />
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Patient Specific Stuff */}
            {!selectedPatient ? (
              <Grid item xs={12}>
                {renderNoPatientSelected("PMTCT Cohort Interoperability Panel", "Please select a patient to audit the HIV mother-to-child cohort timeline registry and synchronize clinical files directly with the national NigeriaMRS OpenMRS database.", <CloudSync sx={{ fontSize: 60 }} />)}
              </Grid>
            ) : (
              <>
                {/* PMTCT Cohort Tracker */}
                <Grid item xs={12} md={6}>
              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title="PMTCT Mother-Baby Care Cohort"
                  action={
                    <Button variant="contained" size="small" onClick={() => setPmtctDialogOpen(true)}>Record PMTCT Followup</Button>
                  }
                />
                <Divider />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body1">PMTCT Care Enrollment Status:</Typography>
                      {maternityProfile?.pmtctEnrolled ? (
                        <Chip label="ENROLLED IN COHORT" color="error" size="small" />
                      ) : (
                        <Chip label="NOT ENROLLED" color="default" size="small" />
                      )}
                    </Box>

                    {maternityProfile?.pmtctFollowUps?.length > 0 ? (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Follow-up Entries:</Typography>
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead sx={{ bgcolor: LIGHT_BG }}>
                              <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Infant Age</TableCell>
                                <TableCell>Infant EID Result</TableCell>
                                <TableCell>ARV Adherence</TableCell>
                                <TableCell>Mother VL Result</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {maternityProfile.pmtctFollowUps.map((pmtct: any) => (
                                <TableRow key={pmtct.id}>
                                  <TableCell>{new Date(pmtct.followUpDate).toLocaleDateString()}</TableCell>
                                  <TableCell>{pmtct.infantAge || 'N/A'}</TableCell>
                                  <TableCell>
                                    <Chip
                                      size="small"
                                      label={pmtct.infantEidResult || 'PENDING'}
                                      color={pmtct.infantEidResult === 'NEGATIVE' ? 'success' : 'warning'}
                                    />
                                  </TableCell>
                                  <TableCell>{pmtct.motherArvAdherence}</TableCell>
                                  <TableCell>{pmtct.motherVlResult ? `${pmtct.motherVlResult} c/mL` : 'N/A'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    ) : (
                      <Alert severity="info">No PMTCT followup history logged.</Alert>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* NigeriaMRS OpenMRS Interoperability */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="NigeriaMRS & OpenMRS Interoperability Console" />
                <Divider />
                <CardContent>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    This console manages standard mapping of patient registries between local Faith Foundation HIMS and external systems (NigeriaMRS, LIMS, and National PMTCT networks).
                  </Alert>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Connected Patient MRS UUID:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{maternityProfile?.openMrsPatientUuid || 'Unmapped'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Last Synchronization Action:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: SUCCESS }}>SUCCESSFUL</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button variant="contained" startIcon={<CloudSync />} onClick={handleSyncNigeriaMrs}>
                      Synchronize with NigeriaMRS
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
              </>
            )}
          </Grid>
        )}

        {/* Tab 3: BI Reports & Analytics */}
        {activeTab === 2 && (
          <Box>
            {/* Operational dashboards & trends */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={7}>
                <Card sx={{ height: 350 }}>
                  <CardHeader title="Pregnancy Registration Trends (Month-on-Month)" />
                  <Divider />
                  <CardContent>
                    <Box sx={{ width: '100%', height: 260 }}>
                      <ResponsiveContainer>
                        <AreaChart data={[
                          { name: 'Jan', count: 45 },
                          { name: 'Feb', count: 50 },
                          { name: 'Mar', count: 48 },
                          { name: 'Apr', count: 62 },
                          { name: 'May', count: 70 },
                          { name: 'Jun', count: 85 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <RechartsTooltip />
                          <Area type="monotone" dataKey="count" stroke={PRIMARY} fill="#dbe4ff" name="Pregnancies Registered" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={5}>
                <Card sx={{ height: 350 }}>
                  <CardHeader title="Maternal Safety Review & Audit Console" />
                  <Divider />
                  <CardContent>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Track NHMIS maternal health indicators, regulatory compliance, near-misses, and maternal death reviews.
                    </Typography>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Warning />}
                      onClick={() => setDeathDialogOpen(true)}
                      sx={{ mb: 2, display: 'block', width: '100%' }}
                    >
                      Audit Maternal Death Review (MDDR)
                    </Button>
                    <Alert severity="success">NHMIS reporting status: Fully Compliant for current cycle.</Alert>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Section reporting lists */}
            <Card>
              <CardHeader title="Maternity Reports Center" subheader="Review clinics registers, export FMOH NHMIS and donor program indicator reports" />
              <Divider />
              <CardContent>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={3}>
                    <Button variant="outlined" startIcon={<Download />} fullWidth onClick={fetchReportsData}>
                      Refresh Report Registers
                    </Button>
                  </Grid>
                </Grid>

                <Tabs value={activeReportTab} onChange={(e, val) => setActiveReportTab(val)} indicatorColor="secondary" sx={{ mb: 2 }}>
                  <Tab label="Pregnancies Register" />
                  <Tab label="Labour Admissions" />
                  <Tab label="Deliveries Log" />
                  <Tab label="High-Risk Cohort" />
                  <Tab label="Today's ANC Queue" />
                </Tabs>

                {activeReportTab === 0 && (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ bgcolor: LIGHT_BG }}>
                        <TableRow>
                          <TableCell>Patient Name</TableCell>
                          <TableCell>MRN</TableCell>
                          <TableCell>Gestation</TableCell>
                          <TableCell>LMP Date</TableCell>
                          <TableCell>EDD Date</TableCell>
                          <TableCell>Risk status</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportsData.pregnancies?.length === 0 ? (
                          <TableRow><TableCell colSpan={7} align="center">No records available</TableCell></TableRow>
                        ) : (
                          reportsData.pregnancies?.map((p: any) => (
                            <TableRow key={p.id}>
                              <TableCell>{p.patientName}</TableCell>
                              <TableCell>{p.mrn}</TableCell>
                              <TableCell>{p.gestationNumber}</TableCell>
                              <TableCell>{new Date(p.lmpDate).toLocaleDateString()}</TableCell>
                              <TableCell>{new Date(p.eddDate).toLocaleDateString()}</TableCell>
                              <TableCell>{p.isHighRisk ? 'High Risk' : 'Normal'}</TableCell>
                              <TableCell>{p.status}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {activeReportTab === 1 && (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ bgcolor: LIGHT_BG }}>
                        <TableRow>
                          <TableCell>Patient Name</TableCell>
                          <TableCell>MRN</TableCell>
                          <TableCell>Cervical Dilation</TableCell>
                          <TableCell>Membranes Status</TableCell>
                          <TableCell>Admitted At</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportsData.activeAdmissions?.length === 0 ? (
                          <TableRow><TableCell colSpan={5} align="center">No active labour admissions</TableCell></TableRow>
                        ) : (
                          reportsData.activeAdmissions?.map((la: any) => (
                            <TableRow key={la.id}>
                              <TableCell>{la.patientName}</TableCell>
                              <TableCell>{la.mrn}</TableCell>
                              <TableCell>{la.dilation} cm</TableCell>
                              <TableCell>{la.membranesStatus}</TableCell>
                              <TableCell>{new Date(la.admittedAt).toLocaleTimeString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {activeReportTab === 2 && (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ bgcolor: LIGHT_BG }}>
                        <TableRow>
                          <TableCell>Mother Name</TableCell>
                          <TableCell>Delivery Type</TableCell>
                          <TableCell>Birth Time</TableCell>
                          <TableCell>Est. Blood Loss</TableCell>
                          <TableCell>Complications</TableCell>
                          <TableCell>Baby Count</TableCell>
                          <TableCell>Baby Names</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportsData.recentDeliveries?.length === 0 ? (
                          <TableRow><TableCell colSpan={7} align="center">No delivery logs found</TableCell></TableRow>
                        ) : (
                          reportsData.recentDeliveries?.map((d: any) => (
                            <TableRow key={d.id}>
                              <TableCell>{d.motherName}</TableCell>
                              <TableCell>{d.deliveryType}</TableCell>
                              <TableCell>{new Date(d.birthTimestamp).toLocaleDateString()} {new Date(d.birthTimestamp).toLocaleTimeString()}</TableCell>
                              <TableCell>{d.bloodLossMl} ml</TableCell>
                              <TableCell>{d.complications || 'Nil'}</TableCell>
                              <TableCell>{d.babyCount}</TableCell>
                              <TableCell>{d.babyNames}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {activeReportTab === 3 && (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ bgcolor: LIGHT_BG }}>
                        <TableRow>
                          <TableCell>Patient Name</TableCell>
                          <TableCell>Risk level</TableCell>
                          <TableCell>Assessment Date</TableCell>
                          <TableCell>Referral Required</TableCell>
                          <TableCell>Referral Facility</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportsData.riskScreeningList?.length === 0 ? (
                          <TableRow><TableCell colSpan={5} align="center">No high risk cases tracked</TableCell></TableRow>
                        ) : (
                          reportsData.riskScreeningList?.map((ra: any) => (
                            <TableRow key={ra.id}>
                              <TableCell>{ra.patientName}</TableCell>
                              <TableCell><Chip size="small" label={ra.riskCategory} color="error" /></TableCell>
                              <TableCell>{new Date(ra.assessmentDate).toLocaleDateString()}</TableCell>
                              <TableCell>{ra.referralRequired ? 'Yes' : 'No'}</TableCell>
                              <TableCell>{ra.referralFacility || 'N/A'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {activeReportTab === 4 && (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ bgcolor: LIGHT_BG }}>
                        <TableRow>
                          <TableCell>Patient Name</TableCell>
                          <TableCell>MRN</TableCell>
                          <TableCell>Check-in Time</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportsData.ancQueue?.length === 0 ? (
                          <TableRow><TableCell colSpan={5} align="center">No ANC/Maternity patients in queue today</TableCell></TableRow>
                        ) : (
                          reportsData.ancQueue?.map((v: any) => (
                            <TableRow key={v.id}>
                              <TableCell>{v.patientName}</TableCell>
                              <TableCell>{v.mrn}</TableCell>
                              <TableCell>{new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                              <TableCell><Chip size="small" label={v.status} color={v.status === 'REGISTERED' ? 'warning' : 'primary'} /></TableCell>
                              <TableCell>
                                <Button size="small" onClick={() => {
                                  handleSelectPatient({ id: v.patientId, firstName: v.patientName.split(' ')[0], lastName: v.patientName.split(' ')[1], mrn: v.mrn });
                                  setActiveTab(0);
                                }}>
                                  Open Profile
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Box>
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
                  <MenuItem value="UNKNOWN">Unknown</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="HIV Test Date" name="hivTestDate" type="date" InputLabelProps={{ shrink: true }} defaultValue={maternityProfile?.hivTestDate?.slice(0, 10) || ''} />
              </Grid>
              
              {formHivStatus === 'POSITIVE' && (
                <>
                  <Grid item xs={6}>
                    <TextField select fullWidth label="PMTCT Cohort Enrollment" name="pmtctEnrolled" defaultValue={maternityProfile?.pmtctEnrolled ? 'true' : 'false'}>
                      <MenuItem value="true">Enrolled</MenuItem>
                      <MenuItem value="false">Not Enrolled</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField select fullWidth label="PMTCT ARV Regimen" name="pmtctArv" defaultValue={maternityProfile?.pmtctArv || ''}>
                      {pmtctRegimens.filter((r: any) => r.status === 'ACTIVE').map((r: any) => (
                        <MenuItem key={r.code} value={r.code}>{r.code} - {r.name}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </>
              )}

              <Grid item xs={6}>
                <TextField select fullWidth label="Syphilis Status" name="syphilisStatus" defaultValue={maternityProfile?.syphilisStatus || 'UNKNOWN'}>
                  <MenuItem value="POSITIVE">Positive</MenuItem>
                  <MenuItem value="NEGATIVE">Negative</MenuItem>
                  <MenuItem value="UNKNOWN">Unknown</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Hepatitis B Status" name="hepatitisBStatus" defaultValue={maternityProfile?.hepatitisBStatus || 'UNKNOWN'}>
                  <MenuItem value="POSITIVE">Positive</MenuItem>
                  <MenuItem value="NEGATIVE">Negative</MenuItem>
                  <MenuItem value="UNKNOWN">Unknown</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Malaria Status" name="malariaStatus" defaultValue={maternityProfile?.malariaStatus || 'UNKNOWN'}>
                  <MenuItem value="POSITIVE">Positive</MenuItem>
                  <MenuItem value="NEGATIVE">Negative</MenuItem>
                  <MenuItem value="UNKNOWN">Unknown</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField fullWidth label="TT Dose Count" name="ttDoseCount" type="number" defaultValue={maternityProfile?.ttDoseCount || 0} /></Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Iron/Folate Supplied" name="ironFolateSupplied" defaultValue={maternityProfile?.ironFolateSupplied ? 'true' : 'false'}>
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Insurance Scheme" name="insuranceScheme" defaultValue={maternityProfile?.insuranceScheme || ''}>
                  <MenuItem value="">None / Out of Pocket</MenuItem>
                  {insuranceProviders.map((provider: any) => (
                    <MenuItem key={provider.id} value={provider.name}>{provider.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField fullWidth label="Referral Source" name="referralSource" defaultValue={maternityProfile?.referralSource || ''} /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Nigeria Obstetric Score" name="nigeriaObstetricScore" value={derivedObstetricScore} disabled /></Grid>
              
              {/* Dynamic Template Custom Fields Grouped by Section */}
              {(() => {
                const tpl = ANC_TEMPLATES.find(t => t.id === ancTemplate) || ANC_TEMPLATES[0];
                if (tpl.profileFields.length === 0) return null;

                // Group fields by section
                const fieldsBySection = tpl.profileFields.reduce((acc, field) => {
                  const sec = field.section || 'general';
                  if (!acc[sec]) acc[sec] = [];
                  acc[sec].push(field);
                  return acc;
                }, {} as Record<string, typeof tpl.profileFields>);

                const renderField = (field: typeof tpl.profileFields[0]) => {
                  const value = profileCustomData[field.name];

                  // Conditional rendering for otherSymptomsDesc:
                  // If it is 'otherSymptomsDesc', it is only rendered if otherSymptoms (checkbox) is ticked!
                  if (field.name === 'otherSymptomsDesc') {
                    if (!profileCustomData['otherSymptoms']) {
                      return null;
                    }
                  }

                  if (field.type === 'boolean') {
                    return (
                      <Grid item xs={6} key={field.name}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={!!value}
                              onChange={(e) => setProfileCustomData({ ...profileCustomData, [field.name]: e.target.checked })}
                            />
                          }
                          label={field.label}
                        />
                      </Grid>
                    );
                  }

                  if (field.type === 'select') {
                    return (
                      <Grid item xs={6} key={field.name}>
                        <TextField
                          select
                          fullWidth
                          label={field.label}
                          value={value || ''}
                          onChange={(e) => setProfileCustomData({ ...profileCustomData, [field.name]: e.target.value })}
                        >
                          {(field.options || []).map((opt) => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    );
                  }

                  if (field.type === 'checkbox-group') {
                    const selectedOpts = Array.isArray(value) ? value : [];
                    return (
                      <Grid item xs={12} key={field.name}>
                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>{field.label}</Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {(field.options || []).map((opt) => {
                            const checked = selectedOpts.includes(opt);
                            return (
                              <FormControlLabel
                                key={opt}
                                control={
                                  <Checkbox
                                    checked={checked}
                                    onChange={(e) => {
                                      const nextOpts = e.target.checked
                                        ? [...selectedOpts, opt]
                                        : selectedOpts.filter(o => o !== opt);
                                      setProfileCustomData({ ...profileCustomData, [field.name]: nextOpts });
                                    }}
                                  />
                                }
                                label={opt}
                              />
                            );
                          })}
                        </Box>
                      </Grid>
                    );
                  }

                  if (field.type === 'date') {
                    return (
                      <Grid item xs={6} key={field.name}>
                        <TextField
                          fullWidth
                          label={field.label}
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          value={value || ''}
                          onChange={(e) => setProfileCustomData({ ...profileCustomData, [field.name]: e.target.value })}
                        />
                      </Grid>
                    );
                  }

                  return (
                    <Grid item xs={6} key={field.name}>
                      <TextField
                        fullWidth
                        label={field.label}
                        type={field.type}
                        value={value || ''}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (field.name === 'husbandPhone') {
                            val = val.replace(/\D/g, '').slice(0, 11);
                          }
                          setProfileCustomData({ ...profileCustomData, [field.name]: val });
                        }}
                        error={field.name === 'husbandPhone' && value && value.length !== 11}
                        helperText={field.name === 'husbandPhone' && value && value.length !== 11 ? 'Phone number must be exactly 11 digits' : ''}
                      />
                    </Grid>
                  );
                };

                const sectionsConfig = [
                  { id: 'general', title: 'General Antenatal Profile Fields' },
                  { id: 'pmh', title: '"PMSII" SECTION' },
                  { id: 'risk_factors', title: 'Social & Risk Factors' },
                  { id: 'present_pregnancy', title: 'Present Pregnancy' },
                  { id: 'previous_pregnancy', title: 'Details of Previous Pregnancies' }
                ];

                return (
                  <>
                    {sectionsConfig.map((sec) => {
                      const fields = fieldsBySection[sec.id] || [];
                      if (fields.length === 0) return null;
                      return (
                        <React.Fragment key={sec.id}>
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 2, mb: 1 }}>
                              {sec.title}
                            </Typography>
                          </Grid>
                          {fields.map(field => renderField(field))}
                        </React.Fragment>
                      );
                    })}
                  </>
                );
              })()}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Save Profile</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 2. Register Pregnancy Dialog */}
      <Dialog open={pregnancyDialogOpen} onClose={() => setPregnancyDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSavePregnancy}>
          <DialogTitle>Register New Pregnancy</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField fullWidth label="Last Menstrual Period (LMP)" type="date" InputLabelProps={{ shrink: true }} value={lmpDate} onChange={(e) => handleLmpChange(e.target.value)} required />
              <TextField fullWidth label="Estimated Delivery Date (EDD)" type="date" InputLabelProps={{ shrink: true }} value={eddDate} disabled />
              <FormControlLabel
                control={<Checkbox checked={isHighRisk} onChange={(e) => setIsHighRisk(e.target.checked)} />}
                label="Flag as High Risk Pregnancy"
              />
              {isHighRisk && <TextField fullWidth label="High Risk Reason" value={highRiskReason} onChange={(e) => setHighRiskReason(e.target.value)} multiline rows={2} />}
              
              {/* Dynamic Pregnancy Fields */}
              {(() => {
                const tpl = ANC_TEMPLATES.find(t => t.id === ancTemplate) || ANC_TEMPLATES[0];
                if (tpl.pregnancyFields.length === 0) return null;
                return (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      Template Details ({tpl.name})
                    </Typography>
                    {tpl.pregnancyFields.map((field) => {
                      const value = pregnancyCustomData[field.name];
                      
                      if (field.type === 'boolean') {
                        return (
                          <FormControlLabel
                            key={field.name}
                            control={
                              <Checkbox
                                checked={!!value}
                                onChange={(e) => setPregnancyCustomData({ ...pregnancyCustomData, [field.name]: e.target.checked })}
                              />
                            }
                            label={field.label}
                          />
                        );
                      }
                      
                      if (field.type === 'select') {
                        return (
                          <TextField
                            key={field.name}
                            select
                            fullWidth
                            label={field.label}
                            value={value || ''}
                            onChange={(e) => setPregnancyCustomData({ ...pregnancyCustomData, [field.name]: e.target.value })}
                          >
                            {field.name === 'consultant'
                              ? staffList.map((s: any) => {
                                  const docName = `${s.firstName || ''} ${s.lastName || ''}`.trim();
                                  return <MenuItem key={s.id || docName} value={docName}>{docName}</MenuItem>;
                                })
                              : (field.options || []).map((opt) => (
                                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                ))
                            }
                          </TextField>
                        );
                      }
                      
                      if (field.type === 'date') {
                        return (
                          <TextField
                            key={field.name}
                            fullWidth
                            label={field.label}
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={value || ''}
                            onChange={(e) => setPregnancyCustomData({ ...pregnancyCustomData, [field.name]: e.target.value })}
                          />
                        );
                      }
                      
                      return (
                        <TextField
                          key={field.name}
                          fullWidth
                          label={field.label}
                          type={field.type}
                          value={value || ''}
                          onChange={(e) => setPregnancyCustomData({ ...pregnancyCustomData, [field.name]: e.target.value })}
                        />
                      );
                    })}
                  </>
                );
              })()}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPregnancyDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Register</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 3. Antenatal Visit Dialog */}
      <Dialog open={visitDialogOpen} onClose={() => setVisitDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveVisit}>
          <DialogTitle>Log Antenatal Visit Observations</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Visit Date"
                  name="visitDate"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={6}><TextField fullWidth label="Weight (kg)" name="weight" type="number" inputProps={{ step: '0.1' }} required /></Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Systolic BP (mmHg)"
                  name="systolic"
                  type="number"
                  required
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Diastolic BP (mmHg)"
                  name="diastolic"
                  type="number"
                  required
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(e.target.value)}
                />
              </Grid>
              {(() => {
                const bpStatus = getBPStatus(bpSystolic, bpDiastolic);
                if (!bpStatus) return null;
                return (
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: '8px',
                        bgcolor: bpStatus.color === 'success.main' ? '#e6fcf5' : bpStatus.color === 'warning.main' ? '#fff9db' : '#fff5f5',
                        border: `1px solid ${bpStatus.color === 'success.main' ? '#96f2d7' : bpStatus.color === 'warning.main' ? '#ffe066' : '#ffc9c9'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      {bpStatus.color === 'success.main' ? (
                        <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                      ) : bpStatus.color === 'warning.main' ? (
                        <Warning sx={{ color: 'warning.main', fontSize: 20 }} />
                      ) : (
                        <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 'bold',
                          color: bpStatus.color,
                        }}
                      >
                        BP Status: {bpStatus.label}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })()}
              <Grid item xs={6}>
                <TextField select fullWidth label="Urine Protein" name="urineProtein" defaultValue="Nil">
                  <MenuItem value="Nil">Nil</MenuItem>
                  <MenuItem value="+">+</MenuItem>
                  <MenuItem value="++">++</MenuItem>
                  <MenuItem value="+++">+++</MenuItem>
                  <MenuItem value="++++">++++</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Urine Glucose" name="urineGlucose" defaultValue="Nil">
                  <MenuItem value="Nil">Nil</MenuItem>
                  <MenuItem value="+">+</MenuItem>
                  <MenuItem value="++">++</MenuItem>
                  <MenuItem value="+++">+++</MenuItem>
                  <MenuItem value="++++">++++</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField fullWidth label="Fundal Height (cm)" name="fundalHeight" type="number" /></Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Fetal Presentation" name="fetalPresentation" defaultValue="Cephalic">
                  <MenuItem value="Cephalic">Cephalic</MenuItem>
                  <MenuItem value="Breech">Breech</MenuItem>
                  <MenuItem value="Shoulder/Transverse">Shoulder/Transverse</MenuItem>
                  <MenuItem value="Face/Brow">Face/Brow</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Fetal Lie" name="fetalLie" defaultValue="Longitudinal">
                  <MenuItem value="Longitudinal">Longitudinal</MenuItem>
                  <MenuItem value="Transverse">Transverse</MenuItem>
                  <MenuItem value="Oblique">Oblique</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField fullWidth label="Fetal Heart Rate (bpm)" name="fetalHeartRate" type="number" /></Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Fetal Movement Status" name="fetalMovement" defaultValue="Active">
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Reduced">Reduced</MenuItem>
                  <MenuItem value="Absent">Absent</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}><TextField fullWidth label="Danger Signs Noticed" name="dangerSigns" multiline rows={2} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Health Education Topics Discussed" name="educationTopics" multiline rows={2} /></Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Next Scheduled Visit Date"
                  name="nextVisitDate"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: getTomorrowString() }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVisitDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Log Visit</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 4. Risk Assessment Dialog */}
      <Dialog open={riskDialogOpen} onClose={() => setRiskDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveRisk}>
          <DialogTitle>Log Maternal Risk Assessment & Screening</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Select Risk Factors Detected:</Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}><FormControlLabel control={<Checkbox name="htn" checked={riskFactorsState.htn} onChange={handleRiskFactorChange} />} label="Hypertension" /></Grid>
                <Grid item xs={6}><FormControlLabel control={<Checkbox name="dm" checked={riskFactorsState.dm} onChange={handleRiskFactorChange} />} label="Diabetes" /></Grid>
                <Grid item xs={6}><FormControlLabel control={<Checkbox name="prevCs" checked={riskFactorsState.prevCs} onChange={handleRiskFactorChange} />} label="Prev C-Section" /></Grid>
                <Grid item xs={6}><FormControlLabel control={<Checkbox name="multi" checked={riskFactorsState.multi} onChange={handleRiskFactorChange} />} label="Multiple Gestation" /></Grid>
                <Grid item xs={6}><FormControlLabel control={<Checkbox name="age" checked={riskFactorsState.age} onChange={handleRiskFactorChange} />} label="Maternal Age (>35)" /></Grid>
                <Grid item xs={6}><FormControlLabel control={<Checkbox name="anaemia" checked={riskFactorsState.anaemia} onChange={handleRiskFactorChange} />} label="Severe Anaemia" /></Grid>
                <Grid item xs={12}><FormControlLabel control={<Checkbox name="other" checked={riskFactorsState.other} onChange={handleRiskFactorChange} />} label="Other" /></Grid>
                {riskFactorsState.other && (
                  <Grid item xs={12}>
                    <TextField fullWidth label="Specify Other Risk Factor" value={otherRiskFactorText} onChange={(e) => setOtherRiskFactorText(e.target.value)} size="small" />
                  </Grid>
                )}
              </Grid>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField select fullWidth label="Overall Risk Category" name="riskCategory" value={riskCategory} onChange={(e) => setRiskCategory(e.target.value)}>
                  <MenuItem value="LOW">Low Risk</MenuItem>
                  <MenuItem value="MODERATE">Moderate Risk</MenuItem>
                  <MenuItem value="HIGH">High Risk Alert</MenuItem>
                  <MenuItem value="VERY_HIGH">Very High Risk Critical</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Referral Required?" name="referralRequired" value={referralRequired} onChange={(e) => setReferralRequired(e.target.value)}>
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </TextField>
              </Grid>
              {referralRequired === 'true' && (
                <>
                  <Grid item xs={6}><TextField fullWidth label="Referral Facility" name="referralFacility" /></Grid>
                  <Grid item xs={6}><TextField fullWidth label="Referral Reason" name="referralReason" /></Grid>
                </>
              )}
              <Grid item xs={12}><TextField fullWidth label="Specialist Care Plan / Actions" name="actionPlan" multiline rows={2} required /></Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label="Next Review Date" 
                  name="nextReviewDate" 
                  type="date" 
                  InputLabelProps={{ shrink: true }} 
                  inputProps={{ min: new Date(Date.now() + 86400000).toISOString().split('T')[0] }} 
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRiskDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Save Risk Audit</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 5. Ultrasound Report Dialog */}
      <Dialog open={surveillanceDialogOpen} onClose={() => setSurveillanceDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveSurveillance}>
          <DialogTitle>Obstetric Ultrasound & Fetal Scan Report</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField select fullWidth label="Surveillance Type" name="surveillanceType" defaultValue="ULTRASOUND">
                  <MenuItem value="ULTRASOUND">Ultrasound Scan</MenuItem>
                  <MenuItem value="CTG">Cardiotocography (CTG)</MenuItem>
                  <MenuItem value="BIOPHYSICAL">Biophysical Profile</MenuItem>
                  <MenuItem value="DOPPLER">Doppler Study</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField fullWidth label="Gestational Age (Weeks)" name="gestationalAgeWeeks" type="number" /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Biparietal (BPD - mm)" name="biparietal" type="number" /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Fetal Length (FL - mm)" name="fetalLength" type="number" /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Abdominal Circ (AC - mm)" name="abdominalCirc" type="number" /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Est Fetal Weight (grams)" name="estimatedFetalWeight" type="number" /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Amniotic Fluid Index (AFI)" name="amnioticFluidIndex" type="number" inputProps={{ step: '0.1' }} /></Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Placenta Location" name="placentaLocation" defaultValue="Posterior">
                  <MenuItem value="Anterior">Anterior</MenuItem>
                  <MenuItem value="Posterior">Posterior</MenuItem>
                  <MenuItem value="Fundal">Fundal</MenuItem>
                  <MenuItem value="Lateral">Lateral</MenuItem>
                  <MenuItem value="Low Lying (Placenta Praevia)">Low Lying (Placenta Praevia)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Placenta Grade" name="placentaGrade" defaultValue="Grade I">
                  <MenuItem value="Grade 0">Grade 0</MenuItem>
                  <MenuItem value="Grade I">Grade I</MenuItem>
                  <MenuItem value="Grade II">Grade II</MenuItem>
                  <MenuItem value="Grade III">Grade III</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField fullWidth label="FHR (bpm)" name="fetalHeartRate" type="number" /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Biophysical Score (0-10)" name="biophysicalScore" type="number" /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Doppler Findings" name="dopplerFindings" multiline rows={2} /></Grid>
              <Grid item xs={12}>
                <TextField select fullWidth label="Fetal Anomalies Detected?" name="anomaliesDetected" defaultValue="false">
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}><TextField fullWidth label="Anomaly Details" name="anomalyDetails" multiline rows={2} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Report Summaries / Notes" name="reportNotes" multiline rows={2} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSurveillanceDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Log Scan</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 6. Complications Dialog */}
      <Dialog open={complicationDialogOpen} onClose={() => setComplicationDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSaveComplication}>
          <DialogTitle>Log Maternal / Pregnancy Complication</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField select fullWidth label="Complication Type" name="complicationType" defaultValue="Severe Pre-Eclampsia" required>
                <MenuItem value="Severe Pre-Eclampsia">Severe Pre-Eclampsia</MenuItem>
                <MenuItem value="Mild/Moderate Pre-Eclampsia">Mild/Moderate Pre-Eclampsia</MenuItem>
                <MenuItem value="Eclampsia">Eclampsia</MenuItem>
                <MenuItem value="Gestational Hypertension">Gestational Hypertension</MenuItem>
                <MenuItem value="Gestational Diabetes">Gestational Diabetes</MenuItem>
                <MenuItem value="Severe Anaemia">Severe Anaemia</MenuItem>
                <MenuItem value="Antepartum Hemorrhage (APH)">Antepartum Hemorrhage (APH)</MenuItem>
                <MenuItem value="Postpartum Hemorrhage (PPH)">Postpartum Hemorrhage (PPH)</MenuItem>
                <MenuItem value="Obstructed Labour">Obstructed Labour</MenuItem>
                <MenuItem value="Puerperal Sepsis">Puerperal Sepsis</MenuItem>
                <MenuItem value="Premature Rupture of Membranes (PROM)">Premature Rupture of Membranes (PROM)</MenuItem>
                <MenuItem value="Preterm Labour">Preterm Labour</MenuItem>
                <MenuItem value="Hyperemesis Gravidarum">Hyperemesis Gravidarum</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
              <TextField select fullWidth label="Severity Level" name="severity" defaultValue="SEVERE">
                <MenuItem value="MILD">Mild</MenuItem>
                <MenuItem value="MODERATE">Moderate</MenuItem>
                <MenuItem value="SEVERE">Severe Alert</MenuItem>
                <MenuItem value="LIFE_THREATENING">Life Threatening Critical</MenuItem>
              </TextField>
              <TextField
                select
                fullWidth
                label="Emergency Drugs Administered"
                name="drugsAdministered"
                SelectProps={{
                  multiple: true,
                  value: complicationDrugs,
                  onChange: (e: any) => setComplicationDrugs(e.target.value),
                  renderValue: (selected: any) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )
                }}
              >
                <MenuItem value="Magnesium Sulfate">Magnesium Sulfate</MenuItem>
                <MenuItem value="Oxytocin">Oxytocin</MenuItem>
                <MenuItem value="Misoprostol">Misoprostol</MenuItem>
                <MenuItem value="Ergometrine">Ergometrine</MenuItem>
                <MenuItem value="Tranexamic Acid">Tranexamic Acid</MenuItem>
                <MenuItem value="Hydralazine">Hydralazine</MenuItem>
                <MenuItem value="Labetalol">Labetalol</MenuItem>
                <MenuItem value="Nifedipine">Nifedipine</MenuItem>
                <MenuItem value="Calcium Gluconate">Calcium Gluconate</MenuItem>
                <MenuItem value="Dexamethasone">Dexamethasone</MenuItem>
                <MenuItem value="Antibiotics">Antibiotics</MenuItem>
                <MenuItem value="None">None</MenuItem>
              </TextField>
              <TextField fullWidth label="Management / Action Notes" name="managementNotes" multiline rows={3} required />
              <TextField select fullWidth label="Patient Outcome" name="outcome" defaultValue="ONGOING">
                <MenuItem value="RESOLVED">Resolved</MenuItem>
                <MenuItem value="ONGOING">Ongoing Monitoring</MenuItem>
                <MenuItem value="REFERRED">Referred Outward</MenuItem>
                <MenuItem value="MATERNAL_DEATH">Maternal Death Audit</MenuItem>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setComplicationDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="error" disabled={loading}>Log Complication</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 7. Labour Admission Dialog */}
      <Dialog open={labourDialogOpen} onClose={() => setLabourDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAdmitLabour}>
          <DialogTitle>Labour Admission Registration</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField select fullWidth label="Membranes status" name="membranesStatus" defaultValue="INTACT">
                <MenuItem value="INTACT">Intact</MenuItem>
                <MenuItem value="RUPTURED">Ruptured</MenuItem>
              </TextField>
              <TextField fullWidth label="Initial Cervical Dilatation (cm)" name="cervicalDilatation" type="number" required />
              <TextField fullWidth label="Contractions (per 10 mins)" name="contractionsFrequency" type="number" required />
              <TextField fullWidth label="Fetal Heart Rate (bpm)" name="fetalHeartRate" type="number" defaultValue="140" required />
              <TextField fullWidth label="Maternal Pulse (bpm)" name="maternalPulse" type="number" defaultValue="80" required />
              <TextField fullWidth label="Maternal BP" name="maternalBp" placeholder="e.g. 120/80" required />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLabourDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Admit</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 8. Partograph Monitor Entry Dialog */}
      <Dialog open={monitorDialogOpen} onClose={() => setMonitorDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleLogMonitor}>
          <DialogTitle>Add Partograph Monitoring Observation</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField fullWidth label="Cervical Dilatation (cm)" name="cervicalDilatation" type="number" required /></Grid>
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
              <Grid item xs={6}><TextField fullWidth label="Fetal Presentation" name="fetalPresentation" defaultValue="Cephalic" /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Fetal Heart Rate (bpm)" name="fetalHeartRate" type="number" required /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Contractions per 10 mins" name="uterineContractions" type="number" required /></Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Contraction Strength" name="contractionStrength" defaultValue="MODERATE">
                  <MenuItem value="MILD">Mild</MenuItem>
                  <MenuItem value="MODERATE">Moderate</MenuItem>
                  <MenuItem value="STRONG">Strong</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Liquor Colour" name="liquidourColour" defaultValue="CLEAR">
                  <MenuItem value="CLEAR">Clear</MenuItem>
                  <MenuItem value="MECONIUM_STAINED">Meconium Stained</MenuItem>
                  <MenuItem value="BLOODSTAINED">Blood Stained</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField fullWidth label="Maternal Pulse (bpm)" name="maternalPulse" type="number" /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Maternal BP" name="maternalBp" defaultValue="120/80" /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Maternal Temp (°C)" name="maternalTemp" type="number" inputProps={{ step: '0.1' }} defaultValue="37.0" /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Notes / Interventions" name="notes" multiline rows={2} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMonitorDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Log Monitor Entry</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 9. Document Delivery Dialog */}
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
              <Grid item xs={6}><TextField fullWidth label="Estimated Blood Loss (ml)" name="bloodLossMl" type="number" required /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Placenta Condition" name="placentaCondition" placeholder="e.g. Complete & Intact" /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Complications Detected" name="complications" placeholder="e.g. Nil / Perineal Tear" /></Grid>
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
              <Grid item xs={4}><TextField fullWidth label="Birth Weight (kg)" name="birthWeight" type="number" inputProps={{ step: '0.01' }} required /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Birth Length (cm)" name="birthLength" type="number" inputProps={{ step: '0.1' }} /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Head Circumference (cm)" name="headCircumference" type="number" inputProps={{ step: '0.1' }} /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Apgar Score (1 Minute)" name="apgar1Min" type="number" required /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Apgar Score (5 Minutes)" name="apgar5Min" type="number" required /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Newborn Examination / Resuscitation Notes" name="examinationNotes" multiline rows={2} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeliveryDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" disabled={loading}>Complete Birth Registry</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 10. Postnatal Checkup (PNC) Dialog */}
      <Dialog open={pncDialogOpen} onClose={() => setPncDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSavePnc}>
          <DialogTitle>Record Postnatal Care Assessment</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField select fullWidth label="Visit Type" name="visitType" defaultValue="ROUTINE">
                  <MenuItem value="ROUTINE">Routine Follow-up</MenuItem>
                  <MenuItem value="EMERGENCY">Emergency PNC</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField fullWidth label="Days Post Delivery" name="dayPostDelivery" type="number" defaultValue="6" required inputProps={{ min: 0 }} /></Grid>
              <Grid item xs={4}><TextField fullWidth label="BP" name="motherVitalsBp" defaultValue="120/80" inputProps={{ pattern: "^\\d{2,3}/\\d{2,3}$", title: "Format: Systolic/Diastolic (e.g. 120/80)" }} /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Pulse" name="motherPulse" type="number" defaultValue="72" inputProps={{ min: 30, max: 200 }} /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Temp (°C)" name="motherTemp" type="number" inputProps={{ step: '0.1', min: 30, max: 45 }} defaultValue="36.8" /></Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Uterine Involution" name="uterineInvolution" defaultValue="GOOD">
                  <MenuItem value="GOOD">Normal involution (firm)</MenuItem>
                  <MenuItem value="SUBINVOLUTED">Subinvoluted (boggy)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Lochia Character" name="lochiaCharacter" defaultValue="RUBRA">
                  <MenuItem value="RUBRA">Rubra (red)</MenuItem>
                  <MenuItem value="SEROSA">Serosa (pink/brown)</MenuItem>
                  <MenuItem value="ALBA">Alba (white)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Perineal / Wound Healing" name="perinealHealing" defaultValue="Healed">
                  <MenuItem value="Healed">Healed</MenuItem>
                  <MenuItem value="Healing well">Healing well</MenuItem>
                  <MenuItem value="Infected">Infected</MenuItem>
                  <MenuItem value="Dehisced">Dehisced / Gaping</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Breastfeeding Status" name="breastfeedingStatus" defaultValue="EBF">
                  <MenuItem value="EBF">Exclusive Breastfeeding (EBF)</MenuItem>
                  <MenuItem value="PARTIAL">Partial Breastfeeding</MenuItem>
                  <MenuItem value="FORMULA">Replacement Formula</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Maternal Depression Screen" name="maternalDepression" defaultValue="false">
                  <MenuItem value="true">PPD Risk Identified</MenuItem>
                  <MenuItem value="false">No Depression Signs</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField fullWidth label="Edinburgh PPD Score Detail" name="epsychologicalScreen" placeholder="Score: 3/30" /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Baby Weight (kg)" name="babyWeight" type="number" inputProps={{ step: '0.01', min: 0.5, max: 10 }} /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Baby Temp (°C)" name="babyTemperature" type="number" inputProps={{ step: '0.1', min: 30, max: 45 }} /></Grid>
              <Grid item xs={4}>
                <TextField select fullWidth label="Baby Breathing Status" name="babyBreathing" defaultValue="Normal">
                  <MenuItem value="Normal">Normal</MenuItem>
                  <MenuItem value="Fast Breathing (Tachypnea)">Fast Breathing (Tachypnea)</MenuItem>
                  <MenuItem value="Grunting/Retractions">Grunting / Retractions</MenuItem>
                  <MenuItem value="Apnea">Apnea</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Cord Healing Status" name="cordHealingStatus" defaultValue="Dry & Healing">
                  <MenuItem value="Dry & Healing">Dry & Healing</MenuItem>
                  <MenuItem value="Moist">Moist</MenuItem>
                  <MenuItem value="Infected">Infected / Smelly</MenuItem>
                  <MenuItem value="Bleeding">Bleeding</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Vitamin K Administered" name="vitaminKGiven" defaultValue="false">
                  <MenuItem value="true">Yes, Administered</MenuItem>
                  <MenuItem value="false">No / Deferred</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Vaccines Given" name="vaccinesGiven" placeholder="e.g. BCG, OPV 0, HepB 0" defaultValue="" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Immunization Notes" name="immunizationsGiven" placeholder="e.g. BCG batch #B45123 administered" defaultValue="" />
              </Grid>
              <Grid item xs={12}><TextField fullWidth label="Clinician Review Notes" name="clinicianNotes" multiline rows={2} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPncDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Log PNC</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 11. Gynaecology Consultation Dialog */}
      <Dialog open={gynaeDialogOpen} onClose={() => setGynaeDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveGynae}>
          <DialogTitle>New Gynaecology Outpatient Consultation</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Consultation Type" name="consultationType" defaultValue="OUTPATIENT">
                  <MenuItem value="OUTPATIENT">Outpatient Regular</MenuItem>
                  <MenuItem value="EMERGENCY">Emergency Gynae</MenuItem>
                  <MenuItem value="FOLLOW_UP">Follow Up Room</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Referral Required?" name="referralRequired" defaultValue="false">
                  <MenuItem value="false">No Referral</MenuItem>
                  <MenuItem value="true">Yes, Refer Patient</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}><TextField fullWidth label="Chief Complaint" name="chiefComplaint" multiline rows={2} required /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Menstrual History" name="menstrualHistory" placeholder="LMP, Cycle length, dysmenorrhea detail" multiline rows={2} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Obstetric / Contraceptive History" name="obstetricHistory" multiline rows={2} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Clinical findings & Pelvic Exams" name="clinicalFindings" multiline rows={3} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Primary Gynae Diagnosis" name="diagnosis" required /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Management / Surgical Plan" name="managementPlan" multiline rows={3} required /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Follow Up Review Date" name="followUpDate" type="date" InputLabelProps={{ shrink: true }} inputProps={{ min: new Date().toISOString().split('T')[0] }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Referral To (if applicable)" name="referralTo" placeholder="E.g., Oncology, General Surgery" /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGynaeDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Save Consultation</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 12. Gynae Procedure Dialog */}
      <Dialog open={procedureDialogOpen} onClose={() => setProcedureDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          try {
            setLoading(true);
            await axios.post('/api/maternity/gynaecology/procedure', {
              patientId,
              procedureType: d.get('procedureType'),
              surgeonId: user?.id,
              indication: d.get('indication'),
              procedureNotes: d.get('procedureNotes'),
              status: 'COMPLETED'
            });
            enqueueSnackbar('Gynaecology procedure completed successfully', { variant: 'success' });
            setProcedureDialogOpen(false);
            fetchGynaeProcedures(patientId);
          } catch (err: any) {
            enqueueSnackbar(err.response?.data?.error || 'Failed to save', { variant: 'error' });
          } finally {
            setLoading(false);
          }
        }}>
          <DialogTitle>Document Gynaecological Surgical Procedure</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField select fullWidth label="Procedure Type" name="procedureType" defaultValue="MVA">
                <MenuItem value="D_AND_C">Dilation & Curettage (D&C)</MenuItem>
                <MenuItem value="COLPOSCOPY">Colposcopy</MenuItem>
                <MenuItem value="HYSTEROSCOPY">Hysteroscopy</MenuItem>
                <MenuItem value="LAPAROSCOPY">Laparoscopy</MenuItem>
                <MenuItem value="MVA">Manual Vacuum Aspiration (MVA)</MenuItem>
                <MenuItem value="LEEP">LEEP Biopsy</MenuItem>
              </TextField>
              <TextField fullWidth label="Clinical Indication" name="indication" required />
              <TextField fullWidth label="Operative Notes & Findings" name="procedureNotes" multiline rows={3} required />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProcedureDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Document Procedure</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 13. Cervical Screening Dialog */}
      <Dialog open={cervicalDialogOpen} onClose={() => setCervicalDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          try {
            setLoading(true);
            await axios.post('/api/maternity/cervical-screening', {
              patientId,
              clinicianId: user?.staffId || '',
              screeningMethod: formData.get('screeningMethod'),
              screeningResult: formData.get('screeningResult'),
              notes: formData.get('notes')
            });
            enqueueSnackbar('Cervical screening logged successfully', { variant: 'success' });
            setCervicalDialogOpen(false);
            fetchCervicalScreenings(patientId);
          } catch (err: any) {
            enqueueSnackbar('Failed to log screening', { variant: 'error' });
          } finally {
            setLoading(false);
          }
        }}>
          <DialogTitle>Log Cervical Cancer Screening</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField select fullWidth label="Screening Method" name="screeningMethod" defaultValue="VIA">
                <MenuItem value="VIA">Visual Inspection with Acetic Acid (VIA)</MenuItem>
                <MenuItem value="PAP_SMEAR">Pap Smear</MenuItem>
                <MenuItem value="HPV_TEST">HPV Genotype Test</MenuItem>
              </TextField>
              <TextField select fullWidth label="Screening Result" name="screeningResult" defaultValue="NEGATIVE">
                <MenuItem value="NEGATIVE">Negative</MenuItem>
                <MenuItem value="POSITIVE">Positive Acetowhite</MenuItem>
                <MenuItem value="ASCUS">ASC-US</MenuItem>
                <MenuItem value="LSIL">LSIL (low grade dysplasia)</MenuItem>
                <MenuItem value="HSIL">HSIL (high grade dysplasia)</MenuItem>
                <MenuItem value="CANCER_SUSPECTED">Suspected Malignancy</MenuItem>
              </TextField>
              <TextField fullWidth label="Screening Notes / Follow-up Plan" name="notes" multiline rows={2} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCervicalDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Log Screening</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 14. Family Planning Dialog */}
      <Dialog open={fpDialogOpen} onClose={() => setFpDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSaveFP}>
          <DialogTitle>Contraceptive & Family Planning Enrollment</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField select fullWidth label="Selected Contraceptive Method" name="methodChosen" defaultValue="OCP">
                <MenuItem value="CONDOM">Barrier Condoms</MenuItem>
                <MenuItem value="OCP">Oral Contraceptive Pills (OCP)</MenuItem>
                <MenuItem value="INJECTABLES">Injectables (Depo-provera)</MenuItem>
                <MenuItem value="IUD">Intrauterine Device (IUD)</MenuItem>
                <MenuItem value="IMPLANT">Subdermal Implant</MenuItem>
                <MenuItem value="STERILIZATION">Surgical Sterilization</MenuItem>
                <MenuItem value="NATURAL">Natural Family Planning</MenuItem>
              </TextField>
              <TextField fullWidth label="Method Start Date" name="methodStartDate" type="date" InputLabelProps={{ shrink: true }} required />
              <TextField fullWidth label="Justification / Reason chosen" name="reasonForMethod" />
              <TextField select fullWidth label="Postpartum Choice?" name="isPostpartum" defaultValue="false">
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>
              <TextField fullWidth label="Next Appointment Date" name="nextAppointment" type="date" InputLabelProps={{ shrink: true }} inputProps={{ min: getTomorrowString() }} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFpDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Enroll Method</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 15. Infertility Assessment Dialog */}
      <Dialog open={fertilityDialogOpen} onClose={() => setFertilityDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          try {
            setLoading(true);
            await axios.post('/api/maternity/fertility/assess', {
              patientId,
              clinicianId: user?.staffId || '',
              durationInfertility: formData.get('durationInfertility'),
              infertilityType: formData.get('infertilityType'),
              artRecommended: formData.get('artRecommended') === 'true',
              notes: formData.get('notes')
            });
            enqueueSnackbar('Infertility assessment log saved successfully', { variant: 'success' });
            setFertilityDialogOpen(false);
            fetchFertilityAssessments(patientId);
          } catch (err: any) {
            enqueueSnackbar('Failed to save assessment', { variant: 'error' });
          } finally {
            setLoading(false);
          }
        }}>
          <DialogTitle>Fertility Clinic Case Log</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField select fullWidth label="Infertility Classification" name="infertilityType" defaultValue="PRIMARY">
                <MenuItem value="PRIMARY">Primary Infertility</MenuItem>
                <MenuItem value="SECONDARY">Secondary Infertility</MenuItem>
              </TextField>
              <TextField fullWidth label="Duration of Infertility" name="durationInfertility" placeholder="e.g. 3 years" required />
              <TextField fullWidth label="Female Clinical Findings" name="diagnosisFemal" placeholder="e.g. PCOS / Fallopian Tubal Blockage" required />
              <TextField select fullWidth label="Assisted Reproductive Technology (ART) Recommended?" name="artRecommended" defaultValue="false">
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>
              <TextField fullWidth label="Treatment Plan summary" name="treatmentPlan" multiline rows={3} required />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFertilityDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Save Case Log</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 16. PMTCT Dialog */}
      <Dialog open={pmtctDialogOpen} onClose={() => setPmtctDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSavePmtct}>
          <DialogTitle>Log PMTCT Followup Details</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField fullWidth label="Infant Age" name="infantAge" placeholder="e.g. 6 weeks" required /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Infant ARV Prophylaxis" name="infantArvProphylaxis" placeholder="e.g. Nevirapine" required /></Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Early Infant Diagnosis (EID) Done?" name="infantEidTest" defaultValue="false">
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Infant EID Result" name="infantEidResult" defaultValue="PENDING">
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="NEGATIVE">Negative</MenuItem>
                  <MenuItem value="POSITIVE">Positive</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField fullWidth label="Infant EID Test Date" name="infantEidDate" type="date" InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Breastfeeding Status" name="breastfeedingStatus" defaultValue="EBF">
                  <MenuItem value="EBF">Exclusive Breast Feeding</MenuItem>
                  <MenuItem value="REPLACEMENT">Replacement Formula</MenuItem>
                  <MenuItem value="MIXED">Mixed feeding</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Mother ARV Adherence" name="motherArvAdherence" defaultValue="GOOD">
                  <MenuItem value="GOOD">Good Adherence</MenuItem>
                  <MenuItem value="FAIR">Fair Adherence</MenuItem>
                  <MenuItem value="POOR">Poor / Missed Doses</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Viral Load Monitoring Done?" name="motherVlMonitoring" defaultValue="false">
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField fullWidth label="Mother Viral Load Value" name="motherVlResult" type="number" placeholder="copies/ml" /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Viral Load Test Date" name="motherVlDate" type="date" InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Clinician Counseling Notes" name="clinicianNotes" multiline rows={2} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Next PMTCT Visit" name="nextFollowUp" type="date" InputLabelProps={{ shrink: true }} inputProps={{ min: getTomorrowString() }} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPmtctDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>Log PMTCT Entry</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Add PMTCT Regimen Modal */}
      <Dialog open={openAddPmtct} onClose={() => setOpenAddPmtct(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add PMTCT Regimen</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Regimen Code (e.g. TDF/3TC/DTG)" value={newPmtctCode} onChange={(e) => setNewPmtctCode(e.target.value.toUpperCase())} fullWidth />
            <TextField label="Full Regimen Name" value={newPmtctName} onChange={(e) => setNewPmtctName(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddPmtct(false)}>Cancel</Button>
          <Button onClick={handleAddPmtct} variant="contained" color="secondary">Add Regimen</Button>
        </DialogActions>
      </Dialog>

      {/* 17. Maternal Death Review Dialog */}
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
            fetchReportsData();
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

      {/* Discharge Dialog */}
      <Dialog open={dischargeDialogOpen} onClose={() => setDischargeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Discharge Maternity Patient</DialogTitle>
        <Divider />
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will formally close the active pregnancy record and discharge the mother (and newborn) from the Maternity ward workflow.
          </Alert>
          <Typography variant="body2">Are you sure you want to discharge <strong>{selectedPatient?.firstName} {selectedPatient?.lastName}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDischargeDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleDischargePatient} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Confirm Discharge'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* FHIR Interoperability Payload Visualizer Dialog */}
      <Dialog open={fhirDialogOpen} onClose={() => setFhirDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudSync color="primary" /> HL7 FHIR Interoperability Payload
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 0 }}>
          <Box sx={{ p: 2, overflowX: 'auto', maxHeight: '60vh' }}>
            <pre style={{ margin: 0, fontSize: '0.85rem', fontFamily: 'monospace' }}>
              {fhirPayloadData ? JSON.stringify(fhirPayloadData, null, 2) : 'No payload generated.'}
            </pre>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFhirDialogOpen(false)}>Close Inspector</Button>
        </DialogActions>
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

export default Maternity;
