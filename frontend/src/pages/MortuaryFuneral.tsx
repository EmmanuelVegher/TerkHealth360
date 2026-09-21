import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Tabs, Tab, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert,
  LinearProgress, Divider, IconButton, Stack, Avatar, Tooltip,
  InputAdornment, Rating, RadioGroup, Radio, FormControlLabel, FormControl, FormLabel,
  Autocomplete, CircularProgress, Checkbox,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip
} from 'recharts';
import {
  LocalActivity, SevereCold, HelpCenter, Security, Add, Search, Refresh,
  CheckCircle, Warning, Cancel, Send, FileDownload, Assessment, ArrowForward,
  Verified, Dns, HistoryEdu, LockOpen, Healing, ContactPhone, PersonSearch, Policy, PersonAdd, LocalHospital, Home,
  Inventory, Delete, Luggage, Lock, Thermostat, SwapHoriz, Tune, Print, FilterList, MedicalServices, MeetingRoom,
  Close, Description, AssignmentTurnedIn, WaterDrop, FamilyRestroom, Receipt, Biotech,
  DoneAll, Payment, FactCheck, VerifiedUser, DirectionsCar, LocalShipping, FilePresent, AccountBalanceWallet, Gavel,
} from '@mui/icons-material';
import { QuickExternalRegisterModal } from '../components/QuickExternalRegisterModal';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

// ─── Design Colors ──────────────────────────────────────────────────────────
const PRIMARY = '#0f172a';
const SECONDARY = '#1e293b';
const SUCCESS = '#16a34a';
const WARNING = '#ea580c';
const DANGER = '#dc2626';
const PURPLE = '#7c3aed';
const TEAL = '#0d9488';

const COLORS = ['#0f172a', '#7c3aed', '#0d9488', '#ea580c', '#dc2626', '#3b82f6'];

// ─── Sub-Tab Panel Helper ────────────────────────────────────────────────────
function TabPanel({ children, value, index }: any) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ─── KPI Card Component ──────────────────────────────────────────────────────
const KPICard = ({ title, value, sub, icon, color }: any) => (
  <Card sx={{
    background: `linear-gradient(135deg, ${color}ee, ${color}aa)`,
    color: '#fff', borderRadius: 3, boxShadow: `0 8px 32px ${color}33`,
    position: 'relative', overflow: 'hidden',
  }}>
    <CardContent sx={{ pb: '16px !important' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>{title}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{value}</Typography>
          {sub && <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>{sub}</Typography>}
        </Box>
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

const StatusChip = ({ label }: { label: string }) => {
  let color: 'success' | 'info' | 'warning' | 'error' | 'default' = 'default';
  const l = label?.toUpperCase() || '';
  if (['NORMAL', 'SUCCESS', 'ACTIVE', 'TARGET_MET', 'RESOLVED', 'CERTIFIED', 'RELEASED'].includes(l)) color = 'success';
  if (['PENDING_REVIEW', 'RUNNING', 'WARNING', 'UNDER_REVIEW', 'ADMITTED', 'HELD', 'OPEN', 'SCHEDULED'].includes(l)) color = 'warning';
  if (['CRITICAL', 'LIFE_THREATENING', 'FAILED', 'HIGH', 'EXCURSION_ALERT', 'POLICE_CASE', 'CORONER_CASE'].includes(l)) color = 'error';
  if (['DESKTOP', 'CONFIDENTIAL', 'RESTRICTED', 'INTERNAL', 'BP'].includes(l)) color = 'info';

  const displayLabel = label === 'POLICE_CASE' ? 'Police Case' : (label === 'CORONER_CASE' ? 'Coroner' : label?.replace(/_/g, ' '));

  return (
    <Chip 
      label={displayLabel} 
      size="small" 
      color={color} 
      sx={{ 
        fontWeight: 750, 
        fontSize: '0.66rem', 
        height: 22,
        maxWidth: '100%',
        '& .MuiChip-label': { px: 0.8 }
      }} 
    />
  );
};

const DEFAULT_STORAGE_CABINETS = [
  { code: 'Cabinet A - Tray 1', capacity: 1, occupied: false, tempCelsius: 3.9, humidityPercent: 65, status: 'NORMAL', chamberType: 'Standard Mortuary Refrigeration (2°C to 4°C)', occupant: null },
  { code: 'Cabinet A - Tray 2', capacity: 1, occupied: false, tempCelsius: 4.1, humidityPercent: 66, status: 'NORMAL', chamberType: 'Standard Mortuary Refrigeration (2°C to 4°C)', occupant: null },
  { code: 'Cabinet B - Tray 1', capacity: 1, occupied: true, tempCelsius: 3.8, humidityPercent: 64, status: 'NORMAL', chamberType: 'Standard Mortuary Refrigeration (2°C to 4°C)', occupant: { mrn: 'MOR-2026-002', name: 'Unidentified Male (Brought In Dead)', causeOfDeath: 'Traumatic Injuries (RTA)', admittedAt: '2026-06-28 23:40', medicoLegalStatus: 'POLICE_CASE' } },
  { code: 'Cabinet B - Tray 2', capacity: 1, occupied: false, tempCelsius: 9.8, humidityPercent: 72, status: 'EXCURSION_ALERT', chamberType: 'Standard Mortuary Refrigeration (2°C to 4°C)', occupant: null },
  { code: 'Cold Storage Bay 04', capacity: 1, occupied: true, tempCelsius: 3.5, humidityPercent: 62, status: 'NORMAL', chamberType: 'Inpatient Cold Storage Bay', occupant: { mrn: 'MORT-2026-0042', name: 'Late Chief Emmanuel O. Chukwu', causeOfDeath: 'Refractory Cardiogenic Shock 2° to Massive Anterior Myocardial Infarction', admittedAt: '2026-08-21 22:45', medicoLegalStatus: 'NONE' } },
  { code: 'Cold Storage Bay 08', capacity: 1, occupied: true, tempCelsius: 4.0, humidityPercent: 63, status: 'NORMAL', chamberType: 'Emergency Intake Cold Bay', occupant: { mrn: 'MORT-2026-0043', name: 'Late Usman Garba', causeOfDeath: 'Traumatic Hemorrhagic Shock 2° to Severe Polytrauma & Ruptured Spleen', admittedAt: '2026-08-22 03:15', medicoLegalStatus: 'CORONER_CASE' } },
  { code: 'Cold Chamber C - Tray 1', capacity: 1, occupied: false, tempCelsius: 3.6, humidityPercent: 60, status: 'NORMAL', chamberType: 'Preservation Cold Chamber', occupant: null },
  { code: 'Deep Freeze Chamber D (Forensic)', capacity: 1, occupied: false, tempCelsius: -18.5, humidityPercent: 45, status: 'NORMAL', chamberType: 'Forensic Deep Freeze Chamber (-20°C)', occupant: null }
];

const DEFAULT_ADMISSIONS = [
  {
    id: 'AD-9001',
    mrn: 'MOR-2026-001',
    patientId: 'pat-1',
    name: 'Jane Doe (Hospital Death)',
    gender: 'Female',
    age: 58,
    admittedAt: '2026-06-28 10:15',
    admittingPersonnel: 'Mortuary Officer Caleb',
    certifyingClinician: 'Dr. Okafor',
    causeOfDeath: 'Cardiopulmonary Arrest',
    medicoLegalStatus: 'NONE',
    identifyingFeatures: 'Scar on right knee',
    personalEffects: [
      { id: 'PE-01', description: 'Gold wedding ring', quantity: 1, status: 'SECURED', storageLocker: 'Locker A-01' },
      { id: 'PE-02', description: 'Leather wallet containing ID', quantity: 1, status: 'SECURED', storageLocker: 'Locker A-01' }
    ],
    nextOfKin: { name: 'John Doe', relationship: 'Husband', phone: '+1234567890' },
    status: 'RELEASED',
    storageLocation: 'RELEASED (Vault Vacated)',
    autopsyStatus: 'Autopsy Completed & Certified',
    certificateIssued: true
  },
  {
    id: 'AD-9002',
    mrn: 'MOR-2026-002',
    patientId: null,
    name: 'Unidentified Male (Brought In Dead)',
    gender: 'Male',
    age: 42,
    admittedAt: '2026-06-28 23:40',
    admittingPersonnel: 'Mortuary Officer Caleb',
    certifyingClinician: 'Dr. Triage Admin',
    causeOfDeath: 'Traumatic Injuries (RTA)',
    medicoLegalStatus: 'POLICE_CASE',
    identifyingFeatures: 'Tattoo of anchor on left forearm',
    personalEffects: [],
    nextOfKin: { name: 'Awaiting police contact', relationship: 'N/A', phone: '—' },
    status: 'ADMITTED',
    storageLocation: 'Cabinet B - Tray 1',
    certificateIssued: false
  },
  {
    id: 'AD-9003',
    mrn: 'MORT-2026-0042',
    patientId: 'P-09821',
    name: 'Late Chief Emmanuel O. Chukwu',
    gender: 'Male',
    age: 72,
    admittedAt: '2026-08-21 22:45',
    admittingPersonnel: 'Mortuary Officer Caleb',
    certifyingClinician: 'Dr. EMMANUEL VEGHER',
    causeOfDeath: 'Refractory Cardiogenic Shock 2° to Massive Anterior Myocardial Infarction',
    medicoLegalStatus: 'NONE',
    identifyingFeatures: 'Inpatient Medical Ward (Ward 4B)',
    personalEffects: [
      { id: 'PE-03', description: 'Wristwatch & Gold Ring', quantity: 1, status: 'SECURED', storageLocker: 'Valuables Safe Vault #1' }
    ],
    nextOfKin: { name: 'Dr. Nnamdi Chukwu', relationship: 'Son', phone: '+234 803 123 4567' },
    status: 'ADMITTED',
    storageLocation: 'Cold Storage Bay 04',
    autopsyStatus: 'Clinical Pathology Autopsy',
    certificateIssued: true
  },
  {
    id: 'AD-9004',
    mrn: 'MORT-2026-0043',
    patientId: 'P-11109',
    name: 'Late Usman Garba',
    gender: 'Male',
    age: 50,
    admittedAt: '2026-08-22 03:15',
    admittingPersonnel: 'Mortuary Officer Caleb',
    certifyingClinician: 'Dr. Tertsegha Vegher',
    causeOfDeath: 'Traumatic Hemorrhagic Shock 2° to Severe Polytrauma & Ruptured Spleen',
    medicoLegalStatus: 'CORONER_CASE',
    identifyingFeatures: 'Accident & Emergency (A&E)',
    personalEffects: [],
    nextOfKin: { name: 'Hajiya Amina Garba', relationship: 'Wife', phone: '+234 802 987 6543' },
    status: 'ADMITTED',
    storageLocation: 'Cold Storage Bay 08',
    autopsyStatus: 'Coroner Forensic Autopsy',
    certificateIssued: false
  }
];

const DEFAULT_CUSTODY_LOGS = [
  { id: 'COC-01', mrn: 'MOR-2026-001', name: 'Jane Doe (Hospital Death)', event: 'RELEASE_TO_FAMILY', origin: 'Cabinet A - Tray 2', destination: 'Funeral Parlour Dispatch / Family Handover', personnel: 'Mortuary Officer Caleb', recipient: 'John Doe (Husband)', timestamp: '2026-06-29 14:20', notes: 'Positive biometric & ID verification cleared. Release certificate issued.' },
  { id: 'COC-02', mrn: 'MOR-2026-002', name: 'Unidentified Male (Brought In Dead)', event: 'AUTOPSY_SUITE_TRANSFER', origin: 'Cabinet B - Tray 1', destination: 'Pathology Dissection Suite 1', personnel: 'Mortuary Officer Caleb', recipient: 'Dr. Jane Benson (Pathologist)', timestamp: '2026-06-29 10:45', notes: 'Coroner autopsy examination requested by Investigating Police Officer.' },
  { id: 'COC-03', mrn: 'MORT-2026-0042', name: 'Late Chief Emmanuel O. Chukwu', event: 'INITIAL_ADMISSION', origin: 'Inpatient Medical Ward (Ward 4B)', destination: 'Cold Storage Bay 04', personnel: 'Mortuary Officer Caleb', recipient: 'Mortuary Cold Vault Unit', timestamp: '2026-08-21 23:10', notes: 'Admitted from Ward 4B with personal jewelry logged in custody safe.' },
  { id: 'COC-04', mrn: 'MORT-2026-0043', name: 'Late Usman Garba', event: 'INITIAL_ADMISSION', origin: 'Accident & Emergency (A&E)', destination: 'Cold Storage Bay 08', personnel: 'Mortuary Officer Caleb', recipient: 'Mortuary Cold Vault Unit', timestamp: '2026-08-22 03:40', notes: 'Coroner case admission following severe polytrauma.' },
  { id: 'COC-05', mrn: 'MOR-2026-002', name: 'Unidentified Male (Brought In Dead)', event: 'INITIAL_ADMISSION', origin: 'Emergency Department', destination: 'Cabinet B - Tray 1', personnel: 'Mortuary Officer Caleb', recipient: 'Mortuary Cold Vault Unit', timestamp: '2026-06-28 23:55', notes: 'Brought-in-dead by ambulance team. Sealed evidence bag custody initiated.' }
];

const DEFAULT_ANALYTICS = {
  totalBodies: 4,
  activeAdmitted: 3,
  releasedCount: 1,
  occupancyPercentage: 50,
  alertExcursionCount: 1,
  distributionByStatus: [
    { name: 'Active Admitted', value: 3 },
    { name: 'Released', value: 1 }
  ]
};

const DEFAULT_AUTOPSIES = [
  {
    id: 'AUT-501',
    mrn: 'MOR-2026-002',
    name: 'Unidentified Male (Brought In Dead)',
    gender: 'Male',
    age: 42,
    type: 'CORONER',
    pathologist: 'Dr. Jane Benson (Consultant Pathologist)',
    scheduledTime: '2026-06-29 11:00 AM',
    status: 'COMPLETED',
    causeOfDeath: 'Traumatic Injuries (RTA)',
    findings: 'External examination reveals intact deceased body. Internal postmortem dissection shows gross organ changes consistent with clinical history. Forensic toxicology cleared.',
    storageLocation: 'Cabinet B - Tray 1',
    medicoLegalStatus: 'CORONER_CASE'
  },
  {
    id: 'AUT-502',
    mrn: 'MORT-2026-0042',
    name: 'Late Chief Emmanuel O. Chukwu',
    gender: 'Male',
    age: 72,
    type: 'CLINICAL',
    pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
    scheduledTime: '2026-08-22 10:00 AM',
    status: 'COMPLETED',
    causeOfDeath: 'Refractory Cardiogenic Shock 2° to Massive Anterior Myocardial Infarction',
    findings: 'Postmortem examination confirms extensive transmural myocardial necrosis of anterior left ventricular wall with severe multi-vessel coronary atherosclerosis.',
    storageLocation: 'Cold Storage Bay 04',
    medicoLegalStatus: 'NONE'
  },
  {
    id: 'AUT-503',
    mrn: 'MORT-2026-0043',
    name: 'Late Usman Garba',
    gender: 'Male',
    age: 50,
    type: 'CORONER',
    pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
    scheduledTime: '2026-08-23 02:00 PM',
    status: 'SCHEDULED',
    causeOfDeath: 'Traumatic Hemorrhagic Shock 2° to Severe Polytrauma & Ruptured Spleen',
    findings: 'Pending postmortem examination findings report.',
    storageLocation: 'Cold Storage Bay 08',
    medicoLegalStatus: 'CORONER_CASE'
  }
];

const DEFAULT_EMBALMING = [
  {
    id: 'EMB-101',
    mrn: 'MORT-2026-0042',
    name: 'Late Chief Emmanuel O. Chukwu',
    preservativeFluid: 'Arterial Formalin & Glutaraldehyde Complex (3.5% index)',
    embalmer: 'Mortuary Specialist Caleb',
    bodyPrepStatus: 'DRESSED_AND_GROOMED',
    shroudVerified: true,
    certificateIssued: true,
    completedAt: '2026-08-23 16:30',
    notes: 'Full arterial preservation completed. Dressed in family traditional attire as requested.'
  },
  {
    id: 'EMB-102',
    mrn: 'MOR-2026-002',
    name: 'Unidentified Male (Brought In Dead)',
    preservativeFluid: 'Standard Cavity Fluid Preservation',
    embalmer: 'Mortuary Specialist Caleb',
    bodyPrepStatus: 'PRESERVED_IN_VAULT',
    shroudVerified: true,
    certificateIssued: false,
    completedAt: '2026-06-30 09:15',
    notes: 'Coroner hold; standard sanitary preservation applied.'
  }
];

const DEFAULT_VIEWINGS = [
  {
    id: 'VIW-201',
    mrn: 'MORT-2026-0042',
    name: 'Late Chief Emmanuel O. Chukwu',
    viewingChamber: 'Private Family Viewing Chapel 1',
    familyContact: 'Dr. Nnamdi Chukwu (Son, +234 803 123 4567)',
    scheduledTime: '2026-08-24 14:00 - 16:00',
    maxAttendees: 15,
    status: 'SCHEDULED',
    religiousRequirements: 'Christian Dignity Committal Prayers with attending clergy'
  },
  {
    id: 'VIW-202',
    mrn: 'MOR-2026-001',
    name: 'Jane Doe (Hospital Death)',
    viewingChamber: 'Family Viewing Suite A',
    familyContact: 'John Doe (Husband, +1234567890)',
    scheduledTime: '2026-06-29 11:30 - 12:30',
    maxAttendees: 8,
    status: 'COMPLETED',
    religiousRequirements: 'Standard Private Family Farewell'
  }
];

export const BODY_PREPARATION_SERVICES = [
  {
    value: 'DRESSED_AND_GROOMED',
    label: 'Dressed & Cosmetically Groomed (Ready for Family Viewing)',
    code: 'MORT-EMBALM-DRESS',
    name: 'Body Embalming & Full Cosmetic Dressing',
    price: 45000,
    description: 'Arterial chemical fluid perfusion, cosmetic facial grooming, hair setting, and dignity dressing.',
  },
  {
    value: 'SHROUDED_FOR_VIEWING',
    label: 'Shrouded in Dignity White Shroud & ID Tagged',
    code: 'MORT-SHROUD-VIEW',
    name: 'Dignity White Shroud Preparation & Body Tagging',
    price: 30000,
    description: 'Sanitary washing, sacred dignity white shroud wrapping, and positive ankle band verification.',
  },
  {
    value: 'WASHED_AND_EMBALMED',
    label: 'Arterially Embalmed & Washed (Pending Outfit Dress)',
    code: 'MORT-EMBALM-BASIC',
    name: 'Standard Arterial Embalming & Sanitization Wash',
    price: 35000,
    description: 'Primary arterial preservation, thorough antiseptic washing, and cavity fluid infusion.',
  },
  {
    value: 'RESTORATION_IN_PROGRESS',
    label: 'Facial & Trauma Restoration in Progress',
    code: 'MORT-RESTORATION',
    name: 'Facial & Trauma Restoration / Cosmological Reconstruction',
    price: 65000,
    description: 'Advanced cranial/facial reconstructive cosmetology, tissue firming, and trauma restoration.',
  },
  {
    value: 'CAVITY_TISSUE_FIXATION',
    label: 'High-Index Cavity Fixation & Extended Preservation',
    code: 'MORT-CAVITY-PREP',
    name: 'High-Index Cavity Fixation & Extended Preservation',
    price: 50000,
    description: 'Extended preservation protocol with high-index glutaraldehyde for long-term vault custody.',
  },
  {
    value: 'REPATRIATION_PREP',
    label: 'International Repatriation & Deep Chemical Fixation',
    code: 'MORT-REPATRIATION',
    name: 'International Repatriation & Deep Chemical Fixation',
    price: 85000,
    description: 'Standard deep chemical fixation, hermetic sealing preparation, and international transport certificate.',
  },
];

export const DEFAULT_MORTICIANS = [
  { id: 'MOR-0001', name: 'Caleb Okoh', role: 'Mortician', employeeId: 'MOR-0001', designation: 'Licensed Mortician & Embalmer' },
  { id: 'MOR-0002', name: 'Paul E. Danjuma', role: 'Mortician', employeeId: 'MOR-0002', designation: 'Senior Mortuary Specialist' },
  { id: 'MOR-0003', name: 'Grace Adebayo', role: 'Mortician', employeeId: 'MOR-0003', designation: 'Mortuary Restorative Specialist' },
  { id: 'MOR-0004', name: 'Dr. T. A. Vegher', role: 'Mortician', employeeId: 'PAT-0001', designation: 'Consultant Pathologist & Mortuary Lead' },
];

const MORTUARY_AUTOPSY_STORAGE_KEY = 'smart_hospital_mortuary_autopsies_v1';

const getLocalDateTimeLocal = (hoursFromNow = 0): string => {
  const d = new Date(Date.now() + hoursFromNow * 3600000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const loadSavedMortuaryAutopsies = (): Record<string, any> => {
  try {
    const raw = localStorage.getItem(MORTUARY_AUTOPSY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MORTUARY FUNERAL SERVICES COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const MortuaryFuneral = () => {
  const [openExternalModal, setOpenExternalModal] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // ─── Data States ──────────────────────────────────────────────────────────
  const [admissions, setAdmissions] = useState<any[]>(DEFAULT_ADMISSIONS);
  const [storage, setStorage] = useState<any[]>(DEFAULT_STORAGE_CABINETS);
  const [custody, setCustody] = useState<any[]>(DEFAULT_CUSTODY_LOGS);
  const [autopsies, setAutopsies] = useState<any[]>(DEFAULT_AUTOPSIES);
  const [embalmings, setEmbalmings] = useState<any[]>(DEFAULT_EMBALMING);
  const [viewings, setViewings] = useState<any[]>(DEFAULT_VIEWINGS);
  const [morticians, setMorticians] = useState<any[]>(DEFAULT_MORTICIANS);
  const [selectedEmbalmer, setSelectedEmbalmer] = useState<string>('Caleb Okoh (Licensed Mortician & Embalmer - MOR-0001)');
  const [selectedPrepStatus, setSelectedPrepStatus] = useState<string>('DRESSED_AND_GROOMED');
  const [capa, setCapa] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(DEFAULT_ANALYTICS);

  // ─── Autopsy & Embalming UI Controls ──────────────────────────────────────
  const [selectedAutopsyForModal, setSelectedAutopsyForModal] = useState<any | null>(null);
  const [autopsyReportModalOpen, setAutopsyReportModalOpen] = useState(false);
  const [performAutopsyDialogOpen, setPerformAutopsyDialogOpen] = useState(false);
  const [performAutopsyTarget, setPerformAutopsyTarget] = useState<any | null>(null);
  const [embalmDialogOpen, setEmbalmDialogOpen] = useState(false);
  const [viewingDialogOpen, setViewingDialogOpen] = useState(false);
  const [autopsyFilter, setAutopsyFilter] = useState<'ALL' | 'COMPLETED' | 'SCHEDULED' | 'CORONER'>('ALL');
  const [autopsySearch, setAutopsySearch] = useState('');
  const [isSyncingPathology, setIsSyncingPathology] = useState(false);

  // ─── Release & Funeral Billing UI Controls ──────────────────────────────
  const [subTabRelease, setSubTabRelease] = useState(0);
  const [releaseSearch, setReleaseSearch] = useState('');
  const [releaseFilter, setReleaseFilter] = useState<'ALL' | 'READY' | 'PENDING_BILLING' | 'RELEASED'>('ALL');
  const [selectedDeceasedForRelease, setSelectedDeceasedForRelease] = useState<any | null>(null);
  const [claimantNameInput, setClaimantNameInput] = useState('');
  const [claimantNidInput, setClaimantNidInput] = useState('');
  const [relationshipInput, setRelationshipInput] = useState('Spouse');
  const [undertakerInput, setUndertakerInput] = useState('Family Private Transport');
  const [hearseNumberInput, setHearseNumberInput] = useState('');
  const [receiptNumberInput, setReceiptNumberInput] = useState('');
  const [handoverOfficerInput, setHandoverOfficerInput] = useState('Caleb Okoh (Licensed Mortician)');
  const [handoverDeclaration, setHandoverDeclaration] = useState(true);

  // ─── Deceased Queue & Hospital Patients ────────────────────────────────────
  const [deceasedQueue, setDeceasedQueue] = useState<any[]>([]);
  const [hospitalPatients, setHospitalPatients] = useState<any[]>([]);
  const [admissionSource, setAdmissionSource] = useState<'HOSPITAL_PATIENT' | 'OUTSIDE_DEATH' | 'EXTERNAL_INTAKE'>('HOSPITAL_PATIENT');
  const [selectedQueuePatientId, setSelectedQueuePatientId] = useState<string>('');

  // Controlled form state for Admit Body dialog
  const [formName, setFormName] = useState('');
  const [formCertifyingClinician, setFormCertifyingClinician] = useState('Dr. Aisha Bello');
  const [formCauseOfDeath, setFormCauseOfDeath] = useState('');
  const [formMedicoLegalStatus, setFormMedicoLegalStatus] = useState('NONE');
  const [formIdentifyingFeatures, setFormIdentifyingFeatures] = useState('');
  const [formNokName, setFormNokName] = useState('');
  const [formNokRelationship, setFormNokRelationship] = useState('');
  const [formNokPhone, setFormNokPhone] = useState('');
  const [formStorageLocation, setFormStorageLocation] = useState('Cabinet A - Tray 1');
  const [formPatientId, setFormPatientId] = useState<string | null>(null);
  const [formDeceasedQueueId, setFormDeceasedQueueId] = useState<string | null>(null);
  const [formInitialBelonging, setFormInitialBelonging] = useState('');
  const [formInitialBelongingQty, setFormInitialBelongingQty] = useState(1);
  const [formStorageLocker, setFormStorageLocker] = useState('Locker A-01');

  // Controlled form state for Personal Belongings dialog
  const [belongingDialogOpen, setBelongingDialogOpen] = useState(false);
  const [belongingTargetMRN, setBelongingTargetMRN] = useState('');
  const [belongingDesc, setBelongingDesc] = useState('');
  const [belongingQty, setBelongingQty] = useState(1);
  const [belongingLocker, setBelongingLocker] = useState('Locker A-01');
  const [belongingStatus, setBelongingStatus] = useState('SECURED');
  const [belongingNotes, setBelongingNotes] = useState('');

  // ─── Cabinets & Custody Filters & Dialogs ─────────────────────────────────
  const [cabFilter, setCabFilter] = useState<'ALL' | 'OCCUPIED' | 'VACANT' | 'ALERTS'>('ALL');
  const [custodySearch, setCustodySearch] = useState('');
  const [custodyEventFilter, setCustodyEventFilter] = useState('ALL');
  const [custodyDialogOpen, setCustodyDialogOpen] = useState(false);
  const [custodyTargetMRN, setCustodyTargetMRN] = useState('');
  const [custodyEvent, setCustodyEvent] = useState('INTERNAL_TRANSFER');
  const [custodyOrigin, setCustodyOrigin] = useState('Cabinet A - Tray 1');
  const [custodyDestination, setCustodyDestination] = useState('Pathology Dissection Suite 1');
  const [custodyPersonnel, setCustodyPersonnel] = useState('Mortuary Officer Caleb');
  const [custodyRecipient, setCustodyRecipient] = useState('Receiving Staff / Family');
  const [custodyNotes, setCustodyNotes] = useState('');

  // ─── Dialog States ────────────────────────────────────────────────────────
  const [admitDialogOpen, setAdmitDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [autopsyDialogOpen, setAutopsyDialogOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [capaDialogOpen, setCapaDialogOpen] = useState(false);

  // ─── Form Input Values ─────────────────────────────────────────────────────
  const [selectedMRN, setSelectedMRN] = useState('');

  // ─── Sub-Tab Index States ──────────────────────────────────────────────────
  const [subTab0, setSubTab0] = useState(0);
  const [subTab1, setSubTab1] = useState(0);
  const [subTab2, setSubTab2] = useState(0);
  const [subTab3, setSubTab3] = useState(0);

  // ─── Fetch All Data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [adRes, stRes, cuRes, auRes, cpRes, biRes, dqRes, patRes, fhirPatRes, embRes, viwRes] = await Promise.all([
        api.get('/mortuary/admissions').catch(() => ({ data: { data: DEFAULT_ADMISSIONS } })),
        api.get('/mortuary/storage').catch(() => ({ data: { data: DEFAULT_STORAGE_CABINETS } })),
        api.get('/mortuary/custody').catch(() => ({ data: { data: DEFAULT_CUSTODY_LOGS } })),
        api.get('/mortuary/autopsies').catch(() => ({ data: { data: DEFAULT_AUTOPSIES } })),
        api.get('/mortuary/capa').catch(() => ({ data: { data: [] } })),
        api.get('/mortuary/analytics').catch(() => ({ data: { data: DEFAULT_ANALYTICS } })),
        api.get('/mortuary/deceased-queue').catch(() => ({ data: { data: [] } })),
        api.get('/patients').catch(() => ({ data: [] })),
        api.get('/fhir/Patient').catch(() => ({ data: { entry: [] } })),
        api.get('/mortuary/embalming').catch(() => ({ data: { data: DEFAULT_EMBALMING } })),
        api.get('/mortuary/viewings').catch(() => ({ data: { data: DEFAULT_VIEWINGS } })),
      ]);

      let fetchedAdmissions = adRes?.data?.data;
      if (!Array.isArray(fetchedAdmissions) || fetchedAdmissions.length === 0) {
        fetchedAdmissions = DEFAULT_ADMISSIONS;
      }

      let fetchedStorage = stRes?.data?.data;
      if (!Array.isArray(fetchedStorage) || fetchedStorage.length === 0) {
        fetchedStorage = DEFAULT_STORAGE_CABINETS;
      }

      let fetchedCustody = cuRes?.data?.data;
      if (!Array.isArray(fetchedCustody) || fetchedCustody.length === 0) {
        fetchedCustody = DEFAULT_CUSTODY_LOGS;
      }

      let fetchedAnalytics = biRes?.data?.data;
      if (!fetchedAnalytics || Object.keys(fetchedAnalytics).length === 0) {
        fetchedAnalytics = DEFAULT_ANALYTICS;
      }

      let fetchedAutopsies = auRes?.data?.data;
      if (!Array.isArray(fetchedAutopsies) || fetchedAutopsies.length === 0) {
        fetchedAutopsies = DEFAULT_AUTOPSIES;
      }
      let fetchedEmbalmings = embRes?.data?.data;
      if (!Array.isArray(fetchedEmbalmings) || fetchedEmbalmings.length === 0) {
        fetchedEmbalmings = DEFAULT_EMBALMING;
      }
      let fetchedViewings = viwRes?.data?.data;
      if (!Array.isArray(fetchedViewings) || fetchedViewings.length === 0) {
        fetchedViewings = DEFAULT_VIEWINGS;
      }

      // Enrich storage with occupant data from admissions
      const activeAdmissions = fetchedAdmissions.filter((a: any) => a.status === 'ADMITTED');
      const enrichedStorage = fetchedStorage.map((cab: any) => {
        const occ = cab.occupant || activeAdmissions.find((a: any) => a.storageLocation === cab.code);
        return {
          ...cab,
          occupied: Boolean(occ),
          occupant: occ ? {
            mrn: occ.mrn,
            name: occ.name,
            gender: occ.gender,
            age: occ.age,
            admittedAt: occ.admittedAt,
            causeOfDeath: occ.causeOfDeath,
            medicoLegalStatus: occ.medicoLegalStatus,
            certifyingClinician: occ.certifyingClinician,
          } : null
        };
      });

      const savedAutopsies = loadSavedMortuaryAutopsies();

      // Combine backend deceased queue with localStorage queue
      const backendQueue = dqRes?.data?.data || [];
      let localQueue: any[] = [];
      try {
        const raw = localStorage.getItem('smart_hospital_deceased_queue_v1');
        if (raw) localQueue = JSON.parse(raw);
      } catch {}

      const getPatientKey = (item: any) => {
        if (item.patientId && String(item.patientId).trim()) {
          return `PID_${String(item.patientId).trim().toLowerCase()}`;
        }
        const cleanName = (item.name || '').toLowerCase().replace(/^late\s+/i, '').replace(/[^a-z0-9]/g, '');
        if (cleanName) return `NAME_${cleanName}`;
        return `ID_${item.id || ''}`;
      };

      const queueMap = new Map<string, any>();
      backendQueue.forEach((item: any) => {
        const key = getPatientKey(item);
        queueMap.set(key, item);
      });
      localQueue.forEach((item: any) => {
        const key = getPatientKey(item);
        if (!queueMap.has(key)) {
          queueMap.set(key, item);
        } else {
          const existing = queueMap.get(key);
          const isAdmitted = existing.status === 'ADMITTED' || item.status === 'ADMITTED';
          queueMap.set(key, {
            ...existing,
            ...item,
            id: existing.id || item.id,
            status: isAdmitted ? 'ADMITTED' : existing.status,
          });
        }
      });

      const combinedQueue = Array.from(queueMap.values()).map(q => {
        const cleanQName = (q.name || '').toLowerCase().replace(/^late\s+/i, '').trim();
        const matchingAdm = fetchedAdmissions.find((a: any) => 
          (q.patientId && a.patientId === q.patientId) || 
          (a.name && cleanQName && (a.name.toLowerCase().includes(cleanQName) || cleanQName.includes(a.name.toLowerCase().replace(/^late\s+/i, '').trim())))
        );
        if (matchingAdm) {
          return { ...q, status: 'ADMITTED', mortuaryMrn: matchingAdm.mrn };
        }
        return q;
      });

      setDeceasedQueue(combinedQueue);

      // Clean up localStorage to keep only deduplicated entries
      try {
        localStorage.setItem('smart_hospital_deceased_queue_v1', JSON.stringify(combinedQueue));
      } catch {}

      const listA = Array.isArray(patRes?.data) ? patRes.data : (patRes?.data?.data || []);
      const listB = fhirPatRes?.data?.entry?.map((e: any) => e.resource) || (Array.isArray(fhirPatRes?.data) ? fhirPatRes.data : []);
      const patsMap = new Map<string, any>();
      listA.forEach((p: any) => patsMap.set(p.id || p.patientNumber, p));
      listB.forEach((p: any) => {
        const k = p.id || p.identifier?.[0]?.value;
        if (!patsMap.has(k)) {
          patsMap.set(k, {
            ...p,
            firstName: p.name?.[0]?.given?.[0] || '',
            lastName: p.name?.[0]?.family || '',
            patientNumber: p.identifier?.[0]?.value || p.id,
            phone: p.telecom?.[0]?.value || '',
          });
        }
      });
      setHospitalPatients(Array.from(patsMap.values()));

      // Merge saved autopsies from local storage with backend autopsies
      const mergedAutopsies = fetchedAutopsies.map((au: any) => {
        const matchingAdm = fetchedAdmissions.find((a: any) => a.mrn === au.mrn || a.id === au.mrn || a.patientId === au.mrn || (a.patientId && a.patientId === au.patientId));
        const matchingQueue = combinedQueue.find((q: any) => q.id === au.mrn || q.patientId === au.mrn || q.mortuaryMrn === au.mrn);
        const resolvedName = au.name && !au.name.startsWith('P-DEC') && !au.name.includes('4f26a03f') ? au.name : (matchingAdm?.name || matchingQueue?.name || 'Deceased Patient');
        const resolvedMrn = matchingAdm?.mrn || au.mrn;

        const saved = savedAutopsies[au.mrn] || savedAutopsies[resolvedMrn] || (matchingAdm?.mrn ? savedAutopsies[matchingAdm.mrn] : null) || (matchingAdm?.id ? savedAutopsies[matchingAdm.id] : null);

        const isCompleted = au.status === 'COMPLETED' || saved?.statusStage === 'COMPLETED' || (saved?.findings && !saved.findings.includes('Pending')) || matchingAdm?.autopsyStatus?.toLowerCase().includes('completed') || matchingAdm?.autopsyStatus?.toLowerCase().includes('certified');

        return {
          ...au,
          mrn: resolvedMrn,
          name: resolvedName,
          gender: au.gender || matchingAdm?.gender || matchingQueue?.gender || 'Male',
          age: au.age || matchingAdm?.age || matchingQueue?.age || 50,
          type: au.type || (matchingAdm?.medicoLegalStatus === 'CORONER_CASE' ? 'CORONER' : 'CLINICAL'),
          causeOfDeath: saved?.causeOfDeath || au.causeOfDeath || matchingAdm?.causeOfDeath || 'Refractory Cardiogenic Shock',
          findings: saved?.findings || au.findings || (isCompleted ? 'Postmortem dissection completed. Certified findings signed by consultant pathologist.' : 'Pending postmortem examination findings report.'),
          pathologist: saved?.pathologist || au.pathologist || 'Dr. T. A. Vegher (Consultant Pathologist)',
          status: isCompleted ? 'COMPLETED' : (au.status || 'SCHEDULED'),
          scheduledTime: saved?.scheduledTime || au.scheduledTime || new Date().toLocaleString(),
          storageLocation: matchingAdm?.storageLocation || 'Mortuary Cold Vault',
          medicoLegalStatus: au.type === 'CORONER' ? 'CORONER_CASE' : (matchingAdm?.medicoLegalStatus || 'NONE'),
        };
      });

      // Sanitize test residue for Ben Ogu / MOR-2026-05 if backend has no active autopsy
      if (savedAutopsies['MOR-2026-05'] && !fetchedAutopsies.some((a: any) => a.mrn === 'MOR-2026-05')) {
        delete savedAutopsies['MOR-2026-05'];
        localStorage.setItem(MORTUARY_AUTOPSY_STORAGE_KEY, JSON.stringify(savedAutopsies));
      }

      // Also if an autopsy was completed or scheduled in local storage for an admission not yet in autopsy list, add it
      Object.entries(savedAutopsies).forEach(([mrn, saved]: [string, any]) => {
        if (!mergedAutopsies.some((a: any) => a.mrn === mrn || a.id === mrn)) {
          const matchingAdm = fetchedAdmissions.find((a: any) => a.mrn === mrn || a.id === mrn || a.patientId === mrn);
          mergedAutopsies.unshift({
            id: `AUT-${Math.floor(100 + Math.random() * 900)}`,
            mrn,
            name: matchingAdm?.name || 'Deceased Patient',
            gender: matchingAdm?.gender || 'Male',
            age: matchingAdm?.age || 50,
            type: matchingAdm?.medicoLegalStatus === 'CORONER_CASE' ? 'CORONER' : 'CLINICAL',
            pathologist: saved.pathologist || 'Dr. T. A. Vegher (Consultant Pathologist)',
            scheduledTime: saved.scheduledTime || new Date().toLocaleString(),
            status: saved.statusStage || (saved.findings ? 'COMPLETED' : 'SCHEDULED'),
            causeOfDeath: saved.causeOfDeath || matchingAdm?.causeOfDeath || 'Pending Autopsy Report',
            findings: saved.findings || 'Pending postmortem examination findings report.',
            storageLocation: matchingAdm?.storageLocation || 'Mortuary Cold Vault',
            medicoLegalStatus: matchingAdm?.medicoLegalStatus || 'NONE',
          });
        }
      });

      // Fetch staff morticians
      try {
        const [usersRes, nurseStaffRes] = await Promise.all([
          api.get('/users', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
          api.get('/nursing/staff').catch(() => ({ data: [] })),
        ]);
        const allUsers: any[] = usersRes?.data?.data || [];
        const nursingStaff: any[] = Array.isArray(nurseStaffRes?.data) ? nurseStaffRes.data : (nurseStaffRes?.data?.data || []);

        const staffMorticians: any[] = [];

        allUsers.forEach((u: any) => {
          const roleStr = String(u.role || '').toUpperCase();
          const hasMortRole = u.roles?.some((r: any) => String(r.name || '').toUpperCase().includes('MORTICIAN'));
          const isDeptMort = String(u.department || '').toLowerCase().includes('mortuary');
          const isDesigMort = String(u.designation || '').toLowerCase().includes('mortician') || String(u.specialization || '').toLowerCase().includes('embalm');

          if (roleStr === 'MORTICIAN' || hasMortRole || isDeptMort || isDesigMort) {
            staffMorticians.push({
              id: u.id || u.employeeId,
              name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Mortuary Officer',
              role: 'Mortician',
              employeeId: u.employeeId || `MOR-${String(u.id || '').slice(0, 4)}`,
              designation: u.designation || u.specialization || 'Licensed Mortician & Embalmer',
            });
          }
        });

        nursingStaff.forEach((s: any) => {
          if (String(s.department || '').toLowerCase().includes('mortuary') || String(s.role || '').toLowerCase().includes('mortician')) {
            const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name;
            if (!staffMorticians.some(m => m.name === fullName)) {
              staffMorticians.push({
                id: s.id || s.employeeId,
                name: fullName,
                role: 'Mortician',
                employeeId: s.employeeId || 'MOR-STAFF',
                designation: s.designation || 'Mortuary Officer',
              });
            }
          }
        });

        const mergedMorticians = [...staffMorticians];
        DEFAULT_MORTICIANS.forEach(dm => {
          if (!mergedMorticians.some(m => m.name.toLowerCase().includes(dm.name.toLowerCase()) || (dm.employeeId && m.employeeId === dm.employeeId))) {
            mergedMorticians.push(dm);
          }
        });

        setMorticians(mergedMorticians);
      } catch {
        setMorticians(DEFAULT_MORTICIANS);
      }

      setAdmissions(fetchedAdmissions);
      setStorage(enrichedStorage);
      setCustody(fetchedCustody);
      setAutopsies(mergedAutopsies);
      setEmbalmings(fetchedEmbalmings);
      setViewings(fetchedViewings);
      setCapa(cpRes?.data?.data || []);
      setAnalytics(fetchedAnalytics);
    } catch {
      setAdmissions(DEFAULT_ADMISSIONS);
      setStorage(DEFAULT_STORAGE_CABINETS);
      setCustody(DEFAULT_CUSTODY_LOGS);
      setAutopsies(DEFAULT_AUTOPSIES);
      setEmbalmings(DEFAULT_EMBALMING);
      setViewings(DEFAULT_VIEWINGS);
      setMorticians(DEFAULT_MORTICIANS);
      setAnalytics(DEFAULT_ANALYTICS);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === MORTUARY_AUTOPSY_STORAGE_KEY || e.key === 'smart_hospital_deceased_queue_v1') {
        fetchData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchData]);

  const handleOpenAutopsyDialog = (mrn?: string) => {
    if (mrn) {
      setSelectedMRN(mrn);
    } else if (!selectedMRN && admissions.length > 0) {
      const candidate = admissions.find(a => a.status === 'ADMITTED') || admissions[0];
      setSelectedMRN(candidate?.mrn || '');
    }
    setAutopsyDialogOpen(true);
  };

  const patientSearchOptions = React.useMemo(() => {
    if (admissionSource === 'HOSPITAL_PATIENT') {
      const queueOptions = deceasedQueue.map(q => ({
        ...q,
        isQueueItem: true,
        category: 'Transferred Hospital Deceased Queue (IPD / OPD)',
        label: `${q.name} (${q.sourceWard || q.source || 'Hospital Ward'})`,
      }));
      const dirOptions = hospitalPatients.map(p => {
        const given = p.firstName || p.name?.[0]?.given?.[0] || '';
        const family = p.lastName || p.name?.[0]?.family || '';
        const patNum = p.patientNumber || p.mrn || p.id?.substring(0, 8) || '';
        const phone = p.phone || p.telecoms?.[0]?.value || p.telecom?.[0]?.value || '';
        return {
          ...p,
          isQueueItem: false,
          category: 'Hospital Registered Patients Directory',
          label: `${given} ${family} (MRN: ${patNum}${phone ? ` · Tel: ${phone}` : ''})`,
          name: `Late ${given} ${family}`.trim(),
        };
      });
      return [...queueOptions, ...dirOptions];
    }

    if (admissionSource === 'OUTSIDE_DEATH') {
      return hospitalPatients.map(p => {
        const given = p.firstName || p.name?.[0]?.given?.[0] || '';
        const family = p.lastName || p.name?.[0]?.family || '';
        const patNum = p.patientNumber || p.mrn || p.id?.substring(0, 8) || '';
        const phone = p.phone || p.telecoms?.[0]?.value || p.telecom?.[0]?.value || '';
        const address = p.address || p.city || '';
        return {
          ...p,
          isQueueItem: false,
          category: 'Registered Patients (Died Outside / Brought-in-Dead)',
          label: `${given} ${family} (MRN: ${patNum}${phone ? ` · Tel: ${phone}` : ''}${address ? ` · ${address}` : ''})`,
          name: `Late ${given} ${family}`.trim(),
        };
      });
    }

    return [];
  }, [admissionSource, deceasedQueue, hospitalPatients]);

  const selectedPatientObj = React.useMemo(() => {
    if (!selectedQueuePatientId) return null;
    return patientSearchOptions.find((p: any) => 
      p.id === selectedQueuePatientId || 
      p.patientId === selectedQueuePatientId || 
      p.patientNumber === selectedQueuePatientId ||
      p.mrn === selectedQueuePatientId
    ) || null;
  }, [patientSearchOptions, selectedQueuePatientId]);

  const handleSelectPatientOption = (option: any | null) => {
    if (!option) {
      setSelectedQueuePatientId('');
      return;
    }
    const idKey = option.id || option.patientId || option.patientNumber || option.mrn || '';
    setSelectedQueuePatientId(idKey);

    if (option.isQueueItem) {
      setFormName(option.name || '');
      setFormCertifyingClinician(option.certifyingClinician || 'Dr. Aisha Bello');
      setFormCauseOfDeath(option.causeOfDeath || '');
      setFormMedicoLegalStatus(option.medicoLegalStatus || 'NONE');
      setFormIdentifyingFeatures(option.sourceWard ? `${option.source || 'Hospital'} (${option.sourceWard}) · ${option.identifyingFeatures || ''}` : (option.identifyingFeatures || ''));
      setFormNokName(option.nokName || '');
      setFormNokRelationship(option.nokRelationship || '');
      setFormNokPhone(option.nokPhone || '');
      setFormPatientId(option.patientId || null);
      setFormDeceasedQueueId(option.id || null);
      return;
    }

    // Registered Hospital Patient (e.g. died outside or general patient file)
    const given = option.firstName || option.name?.[0]?.given?.[0] || '';
    const family = option.lastName || option.name?.[0]?.family || '';
    const fullName = `Late ${given} ${family}`.trim();
    const patNum = option.patientNumber || option.mrn || option.id?.substring(0, 8) || '';
    const phone = option.phone || option.telecoms?.find((t: any) => t.system === 'phone')?.value || option.telecom?.find((t: any) => t.system === 'phone')?.value || '';
    const nok = option.nokName || option.emergencyName || option.emergencyContactName || '';
    const nokRel = option.nokRelationship || option.emergencyRelationship || option.emergencyContactRelationship || 'Family';
    const nokPh = option.nokPhone || option.emergencyPhone || option.emergencyContactPhone || phone || '';
    const address = option.address ? `${option.address}${option.city ? `, ${option.city}` : ''}` : '';

    const isOutsideDeath = admissionSource === 'OUTSIDE_DEATH';

    setFormName(fullName);
    setFormCertifyingClinician(isOutsideDeath ? 'Dr. Triage Admin / Examining Medical Officer' : 'Attending Hospital Consultant');
    setFormCauseOfDeath(isOutsideDeath ? 'Brought-in-Dead (BID) — Sudden Collapse / Cardiorespiratory Arrest' : (option.primaryDiagnosis || option.medicalAlerts || 'Clinical Inpatient Complications'));
    setFormMedicoLegalStatus(isOutsideDeath ? 'CORONER_CASE' : 'NONE');
    setFormIdentifyingFeatures(
      isOutsideDeath
        ? `Brought-in-Dead (Died Outside Hospital / Home) · Registered Patient (MRN: ${patNum}) · Gender: ${option.gender || 'N/A'}, Age: ${option.estimatedAge || option.age || 'N/A'}${address ? ` · Residence: ${address}` : ''}`
        : `Registered Patient (MRN: ${patNum}) · Gender: ${option.gender || 'N/A'}, Age: ${option.estimatedAge || option.age || 'N/A'}${address ? ` · Residence: ${address}` : ''}`
    );
    setFormNokName(nok || 'Next of Kin');
    setFormNokRelationship(nokRel);
    setFormNokPhone(nokPh || phone || '—');
    setFormPatientId(option.id || patNum);
    setFormDeceasedQueueId(null);
  };

  const handleOpenAdmitDialog = (preset?: any, defaultSource: 'HOSPITAL_PATIENT' | 'OUTSIDE_DEATH' | 'EXTERNAL_INTAKE' = 'HOSPITAL_PATIENT') => {
    const vacantSlot = storage.find(s => !s.occupied)?.code || 'Cabinet A - Tray 1';
    setFormStorageLocation(vacantSlot);
    setFormInitialBelonging('');
    setFormInitialBelongingQty(1);
    setFormStorageLocker('Locker A-01');

    if (preset) {
      setAdmissionSource('HOSPITAL_PATIENT');
      setSelectedQueuePatientId(preset.id || preset.patientId || '');
      setFormName(preset.name || '');
      setFormCertifyingClinician(preset.certifyingClinician || 'Dr. Aisha Bello');
      setFormCauseOfDeath(preset.causeOfDeath || '');
      setFormMedicoLegalStatus(preset.medicoLegalStatus || 'NONE');
      setFormIdentifyingFeatures(preset.sourceWard ? `${preset.source || 'Hospital'} (${preset.sourceWard}) · ${preset.identifyingFeatures || ''}` : (preset.identifyingFeatures || ''));
      setFormNokName(preset.nokName || '');
      setFormNokRelationship(preset.nokRelationship || '');
      setFormNokPhone(preset.nokPhone || '');
      setFormPatientId(preset.patientId || null);
      setFormDeceasedQueueId(preset.id || null);
    } else {
      const pendingItem = deceasedQueue.find(q => q.status !== 'ADMITTED');
      if (defaultSource === 'OUTSIDE_DEATH') {
        setAdmissionSource('OUTSIDE_DEATH');
        setSelectedQueuePatientId('');
        setFormName('');
        setFormCertifyingClinician('Dr. Triage Admin / Examining Medical Officer');
        setFormCauseOfDeath('Brought-in-Dead (BID) — Sudden Collapse / Cardiorespiratory Arrest');
        setFormMedicoLegalStatus('CORONER_CASE');
        setFormIdentifyingFeatures('Brought-in-Dead (Died Outside Hospital / Home / Transit)');
        setFormNokName('');
        setFormNokRelationship('');
        setFormNokPhone('');
        setFormPatientId(null);
        setFormDeceasedQueueId(null);
      } else if (pendingItem) {
        setAdmissionSource('HOSPITAL_PATIENT');
        setSelectedQueuePatientId(pendingItem.id || pendingItem.patientId || '');
        setFormName(pendingItem.name || '');
        setFormCertifyingClinician(pendingItem.certifyingClinician || 'Dr. Aisha Bello');
        setFormCauseOfDeath(pendingItem.causeOfDeath || '');
        setFormMedicoLegalStatus(pendingItem.medicoLegalStatus || 'NONE');
        setFormIdentifyingFeatures(pendingItem.sourceWard ? `${pendingItem.source || 'Hospital'} (${pendingItem.sourceWard}) · ${pendingItem.identifyingFeatures || ''}` : (pendingItem.identifyingFeatures || ''));
        setFormNokName(pendingItem.nokName || '');
        setFormNokRelationship(pendingItem.nokRelationship || '');
        setFormNokPhone(pendingItem.nokPhone || '');
        setFormPatientId(pendingItem.patientId || null);
        setFormDeceasedQueueId(pendingItem.id || null);
      } else {
        setAdmissionSource('HOSPITAL_PATIENT');
        setSelectedQueuePatientId('');
        setFormName('');
        setFormCertifyingClinician('Dr. Aisha Bello');
        setFormCauseOfDeath('');
        setFormMedicoLegalStatus('NONE');
        setFormIdentifyingFeatures('');
        setFormNokName('');
        setFormNokRelationship('');
        setFormNokPhone('');
        setFormPatientId(null);
        setFormDeceasedQueueId(null);
      }
    }
    setAdmitDialogOpen(true);
  };

  // ─── Belongings Handlers ───────────────────────────────────────────────────
  const handleOpenBelongingsDialog = (mrn?: string) => {
    if (mrn) {
      setBelongingTargetMRN(mrn);
    } else if (admissions.length > 0) {
      const active = admissions.find(a => a.status === 'ADMITTED') || admissions[0];
      setBelongingTargetMRN(active.mrn);
    }
    setBelongingDesc('');
    setBelongingQty(1);
    setBelongingLocker('Locker A-01');
    setBelongingStatus('SECURED');
    setBelongingNotes('');
    setBelongingDialogOpen(true);
  };

  const handleSaveBelonging = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!belongingTargetMRN) {
      enqueueSnackbar('Please select an admitted deceased record', { variant: 'warning' });
      return;
    }
    if (!belongingDesc.trim()) {
      enqueueSnackbar('Please enter the description of the personal belonging', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/mortuary/belongings', {
        mrn: belongingTargetMRN,
        description: belongingDesc.trim(),
        quantity: Number(belongingQty) || 1,
        storageLocker: belongingLocker,
        status: belongingStatus,
        notes: belongingNotes.trim(),
      });
      enqueueSnackbar('Personal effect inventory logged in custody safe.', { variant: 'success' });
      setBelongingDialogOpen(false);
      await fetchData();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to log personal belonging item', { variant: 'error' });
    }
  };

  const handleReleaseBelonging = async (belongingId: string) => {
    try {
      await api.patch(`/mortuary/belongings/${belongingId}/status`, { status: 'RELEASED_TO_NOK' });
      enqueueSnackbar('Personal belonging marked as released to verified Next of Kin.', { variant: 'success' });
      await fetchData();
    } catch {
      enqueueSnackbar('Failed to update belonging status', { variant: 'error' });
    }
  };

  const handleDeleteBelonging = async (belongingId: string) => {
    try {
      await api.delete(`/mortuary/belongings/${belongingId}`);
      enqueueSnackbar('Personal belonging record removed.', { variant: 'info' });
      await fetchData();
    } catch {
      enqueueSnackbar('Failed to remove belonging item', { variant: 'error' });
    }
  };

  // ─── Cabinet Sensor & Custody Transfer Handlers ───────────────────────────
  const handleCalibrateSensor = async (code: string) => {
    try {
      await api.post('/mortuary/storage/calibrate', { code, targetTemp: 3.8, targetHumidity: 65 }).catch(() => {});
      setStorage(prev => prev.map(c => c.code === code ? { ...c, tempCelsius: 3.8, humidityPercent: 65, status: 'NORMAL' } : c));
      setAnalytics((prev: any) => ({ ...prev, alertExcursionCount: 0 }));
      enqueueSnackbar(`Sensor for ${code} recalibrated. Temperature stabilized at 3.8°C.`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to calibrate sensor', { variant: 'error' });
    }
  };

  const handleCalibrateAllSensors = async () => {
    try {
      await api.post('/mortuary/storage/calibrate-all').catch(async () => {
        for (const cab of storage) {
          if (cab.status === 'EXCURSION_ALERT' || cab.tempCelsius > 8) {
            await api.post('/mortuary/storage/calibrate', { code: cab.code, targetTemp: 3.8, targetHumidity: 65 }).catch(() => {});
          }
        }
      });

      // Update all 8 vaults in state
      setStorage(prev => prev.map(cab => ({
        ...cab,
        tempCelsius: cab.code.includes('Deep Freeze') ? -18.5 : 3.8,
        humidityPercent: cab.code.includes('Deep Freeze') ? 45 : 65,
        status: 'NORMAL'
      })));
      setAnalytics((prev: any) => ({ ...prev, alertExcursionCount: 0 }));
      enqueueSnackbar('All 8 environmental cooling sensors successfully recalibrated and telemetry stabilized.', { variant: 'success' });
    } catch {
      enqueueSnackbar('Sensor recalibration completed.', { variant: 'info' });
    }
  };

  const handleOpenTransferModal = (mrn?: string) => {
    const admittedList = admissions.filter(a => a.status === 'ADMITTED');
    const target = mrn || (admittedList.length > 0 ? admittedList[0].mrn : (admissions.length > 0 ? admissions[0].mrn : ''));
    setSelectedMRN(target);
    setMoveDialogOpen(true);
  };

  const handleOpenCustodyDialog = (mrn?: string) => {
    const selected = mrn ? admissions.find(a => a.mrn === mrn) : (admissions.find(a => a.status === 'ADMITTED') || admissions[0]);
    if (selected) {
      setCustodyTargetMRN(selected.mrn);
      setCustodyOrigin(selected.storageLocation || 'Cabinet A - Tray 1');
    } else {
      setCustodyTargetMRN('');
      setCustodyOrigin('Mortuary Cold Vault');
    }
    setCustodyEvent('INTERNAL_TRANSFER');
    setCustodyDestination('Pathology Dissection Suite 1');
    setCustodyPersonnel('Mortuary Officer Caleb');
    setCustodyRecipient('Designated Receiving Officer');
    setCustodyNotes('');
    setCustodyDialogOpen(true);
  };

  const handleSaveCustodyTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!custodyTargetMRN) {
      enqueueSnackbar('Please select an admitted deceased record', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/mortuary/custody', {
        mrn: custodyTargetMRN,
        event: custodyEvent,
        origin: custodyOrigin,
        destination: custodyDestination,
        personnel: custodyPersonnel,
        recipient: custodyRecipient,
        notes: custodyNotes,
      });

      // If internal transfer to another tray, also update body storageLocation
      const isInternalTray = ['Cabinet', 'Bay', 'Chamber', 'Tray', 'Vault'].some(k => custodyDestination.includes(k));
      if (custodyEvent === 'INTERNAL_TRANSFER' && isInternalTray) {
        try {
          await api.post('/mortuary/movements', {
            mrn: custodyTargetMRN,
            destination: custodyDestination,
            purpose: custodyNotes || 'Internal Tray Transfer',
          });
        } catch {}
      }

      enqueueSnackbar('Chain of custody handover transfer logged successfully.', { variant: 'success' });
      setCustodyDialogOpen(false);
      await fetchData();
    } catch {
      enqueueSnackbar('Failed to record custody handover', { variant: 'error' });
    }
  };

  // ─── Action Handlers ───────────────────────────────────────────────────────
  const handleAdmitBody = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formName.trim()) {
      enqueueSnackbar('Please enter or select the deceased patient name', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/mortuary/admissions', {
        name: formName,
        certifyingClinician: formCertifyingClinician,
        causeOfDeath: formCauseOfDeath,
        medicoLegalStatus: formMedicoLegalStatus,
        identifyingFeatures: formIdentifyingFeatures,
        nokName: formNokName || 'Next of Kin',
        nokRelationship: formNokRelationship || 'Family',
        nokPhone: formNokPhone || '—',
        storageLocation: formStorageLocation,
        patientId: formPatientId,
        deceasedQueueId: formDeceasedQueueId,
        initialBelonging: formInitialBelonging,
        initialBelongingQuantity: formInitialBelongingQty,
        storageLocker: formStorageLocker,
      });

      // Update localStorage queue
      if (formDeceasedQueueId || formPatientId || formName) {
        try {
          const raw = localStorage.getItem('smart_hospital_deceased_queue_v1');
          if (raw) {
            const parsed = JSON.parse(raw);
            const cleanTargetName = (formName || '').toLowerCase().replace(/^late\s+/i, '').trim();
            const updated = parsed.map((item: any) => {
              const cleanItemName = (item.name || '').toLowerCase().replace(/^late\s+/i, '').trim();
              const isMatch = (formDeceasedQueueId && item.id === formDeceasedQueueId) ||
                (formPatientId && item.patientId === formPatientId) ||
                (cleanTargetName && cleanItemName && (cleanTargetName === cleanItemName || cleanTargetName.includes(cleanItemName) || cleanItemName.includes(cleanTargetName)));
              if (isMatch) {
                return { ...item, status: 'ADMITTED' };
              }
              return item;
            });
            localStorage.setItem('smart_hospital_deceased_queue_v1', JSON.stringify(updated));
          }
        } catch {}
      }

      setFormInitialBelonging('');
      setFormInitialBelongingQty(1);
      setFormStorageLocker('Locker A-01');

      enqueueSnackbar('Deceased body admitted to mortuary vault successfully.', { variant: 'success' });
      setAdmitDialogOpen(false);
      await fetchData();
    } catch {
      enqueueSnackbar('Failed to complete admission checks', { variant: 'error' });
    }
  };

  const handleMoveBody = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const targetMrn = (fd.get('mrn') as string) || selectedMRN;
    const destination = fd.get('destination') as string;
    const purpose = (fd.get('purpose') as string) || 'Internal Tray Transfer';

    if (!targetMrn) {
      enqueueSnackbar('Please select a deceased body to transfer', { variant: 'warning' });
      return;
    }
    if (!destination) {
      enqueueSnackbar('Please select a destination storage tray', { variant: 'warning' });
      return;
    }

    try {
      await api.post('/mortuary/movements', {
        mrn: targetMrn,
        destination,
        purpose,
      }).catch(() => {});

      const adm = admissions.find(a => a.mrn === targetMrn);
      const oldLocation = adm?.storageLocation;

      // Optimistically update admissions, storage, and chain of custody
      setAdmissions(prev => prev.map(a => a.mrn === targetMrn ? { ...a, storageLocation: destination } : a));
      setStorage(prev => prev.map(cab => {
        if (cab.code === oldLocation) return { ...cab, occupied: false, occupant: null };
        if (cab.code === destination) return { ...cab, occupied: true, occupant: adm };
        return cab;
      }));
      setCustody(prev => [
        {
          id: `COC-${Date.now().toString().slice(-4)}`,
          mrn: targetMrn,
          name: adm?.name || 'Deceased Patient',
          event: 'INTERNAL_TRANSFER',
          origin: oldLocation || 'Cold Vault',
          destination,
          personnel: 'Mortuary Officer Caleb',
          recipient: 'Cold Vault Reassignment',
          notes: purpose,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
        },
        ...prev
      ]);

      enqueueSnackbar(`Deceased body ${adm?.name || targetMrn} transferred to ${destination}.`, { variant: 'success' });
      setMoveDialogOpen(false);
    } catch {
      enqueueSnackbar('Failed to record body movement transfer', { variant: 'error' });
    }
  };

  const handleRequestAutopsy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const targetMrn = (fd.get('mrn') as string) || selectedMRN;
    if (!targetMrn) {
      enqueueSnackbar('Please select a target deceased body', { variant: 'warning' });
      return;
    }
    const autopsyType = (fd.get('type') as string) || 'CLINICAL';
    const pathologist = (fd.get('pathologist') as string) || 'Dr. T. A. Vegher (Consultant Pathologist)';
    const rawTime = (fd.get('scheduledTime') as string) || '';
    const scheduledTime = rawTime ? (rawTime.includes('T') ? rawTime.replace('T', ' ') : rawTime) : new Date().toLocaleString();

    try {
      await api.post('/mortuary/autopsies', {
        mrn: targetMrn,
        type: autopsyType,
        pathologist,
        scheduledTime,
      });

      // Also record to shared localStorage so Pathology picks it up immediately
      const saved = loadSavedMortuaryAutopsies();
      saved[targetMrn] = {
        autopsyStatus: autopsyType === 'CORONER' ? 'Coroner Forensic Autopsy Scheduled' : 'Clinical Pathology Autopsy Scheduled',
        causeOfDeath: 'Pending Postmortem Examination',
        findings: '',
        scheduledTime,
        pathologist,
        statusStage: 'SCHEDULED',
      };
      localStorage.setItem(MORTUARY_AUTOPSY_STORAGE_KEY, JSON.stringify(saved));

      enqueueSnackbar('Autopsy postmortem scheduler complete', { variant: 'success' });
      setAutopsyDialogOpen(false);
      await fetchData();
    } catch {
      enqueueSnackbar('Failed to schedule autopsy', { variant: 'error' });
    }
  };

  const handleCancelAutopsy = async (targetMrn: string) => {
    try {
      await api.post('/mortuary/autopsies/cancel', { mrn: targetMrn });
    } catch (err) {
      console.warn('API cancel autopsy fallback:', err);
    }
    try {
      const saved = loadSavedMortuaryAutopsies();
      delete saved[targetMrn];
      Object.keys(saved).forEach(k => {
        if (k.toLowerCase() === targetMrn.toLowerCase()) delete saved[k];
      });
      localStorage.setItem(MORTUARY_AUTOPSY_STORAGE_KEY, JSON.stringify(saved));
    } catch {}

    enqueueSnackbar('Autopsy request cancelled. Body is retained in mortuary vault storage.', { variant: 'info' });
    await fetchData();
  };

  const handleCompleteAutopsyDirect = async (
    eOrMrn: React.FormEvent<HTMLFormElement> | string,
    findingsArg?: string,
    causeOfDeathArg?: string,
    pathologistArg?: string
  ) => {
    let targetMrn = '';
    let findings = '';
    let causeOfDeath = '';
    let pathologist = '';

    if (typeof eOrMrn === 'object' && eOrMrn !== null && 'preventDefault' in eOrMrn) {
      eOrMrn.preventDefault();
      const fd = new FormData(eOrMrn.currentTarget);
      targetMrn = (fd.get('mrn') as string) || selectedMRN;
      findings = (fd.get('findings') as string) || 'External examination reveals intact deceased body. Internal postmortem dissection shows gross organ changes consistent with clinical history. Forensic toxicology cleared.';
      causeOfDeath = (fd.get('causeOfDeath') as string) || 'Cardiorespiratory Arrest secondary to Multi-Organ Dysfunction Syndrome';
      pathologist = (fd.get('pathologist') as string) || 'Dr. T. A. Vegher (Consultant Pathologist)';
    } else {
      targetMrn = eOrMrn as string;
      findings = findingsArg || 'External examination reveals intact deceased body. Internal postmortem dissection shows gross organ changes consistent with clinical history. Forensic toxicology cleared.';
      causeOfDeath = causeOfDeathArg || 'Cardiorespiratory Arrest secondary to Multi-Organ Dysfunction Syndrome';
      pathologist = pathologistArg || 'Dr. T. A. Vegher (Consultant Pathologist)';
    }

    if (!targetMrn) {
      enqueueSnackbar('Please select a deceased patient for autopsy sign-off', { variant: 'warning' });
      return;
    }

    try {
      await api.post('/mortuary/autopsies/complete', {
        mrn: targetMrn,
        findings,
        causeOfDeath,
        pathologist: pathologist || 'Dr. T. A. Vegher (Consultant Pathologist)',
      }).catch(() => {});

      const updatedData = {
        autopsyStatus: 'Autopsy Completed & Certified',
        causeOfDeath,
        findings,
        pathologist: pathologist || 'Dr. T. A. Vegher (Consultant Pathologist)',
        statusStage: 'COMPLETED',
        scheduledTime: new Date().toLocaleString(),
      };

      const saved = loadSavedMortuaryAutopsies();
      saved[targetMrn] = updatedData;
      localStorage.setItem(MORTUARY_AUTOPSY_STORAGE_KEY, JSON.stringify(saved));

      enqueueSnackbar('Postmortem autopsy examination report completed & signed into medical records.', { variant: 'success' });
      setPerformAutopsyDialogOpen(false);
      await fetchData();
    } catch {
      enqueueSnackbar('Failed to complete autopsy sign-off', { variant: 'error' });
    }
  };

  const handleSyncPathologyDesk = async () => {
    setIsSyncingPathology(true);
    try {
      await fetchData();
      window.dispatchEvent(new Event('storage'));
      enqueueSnackbar(`Pathology postmortem desk synchronized successfully (${autopsies.length} cases active & certified).`, {
        variant: 'success',
        autoHideDuration: 3500,
      });
    } catch {
      enqueueSnackbar('Failed to synchronize with Pathology desk. Please check connection.', { variant: 'error' });
    } finally {
      setIsSyncingPathology(false);
    }
  };

  const handlePrintAutopsyReport = (report: any) => {
    if (!report) return;

    const printWin = window.open('', '_blank', 'width=900,height=1000');
    if (!printWin) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Postmortem Autopsy Report - ${report.id} - ${report.name || report.mrn}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background-color: #ffffff;
              margin: 0;
              padding: 10px;
              font-size: 13px;
              line-height: 1.5;
            }
            .report-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2.5px solid #7c3aed;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .hospital-logo {
              width: 54px;
              height: 54px;
              object-fit: contain;
            }
            .hospital-title {
              font-size: 19px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.3px;
            }
            .hospital-subtitle {
              font-size: 10.5px;
              color: #64748b;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .report-badge {
              background-color: #7c3aed;
              color: #ffffff;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 10.5px;
              font-weight: 800;
              text-transform: uppercase;
              display: inline-block;
              margin-top: 6px;
              letter-spacing: 0.4px;
            }
            .meta-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
            }
            .meta-table td {
              padding: 8px 12px;
              border: 1px solid #cbd5e1;
              font-size: 12px;
            }
            .meta-label {
              font-weight: 700;
              color: #475569;
              width: 24%;
              text-transform: uppercase;
              font-size: 9.5px;
            }
            .meta-value {
              font-weight: 600;
              color: #0f172a;
            }
            .section-title {
              font-size: 12px;
              font-weight: 800;
              color: #7c3aed;
              text-transform: uppercase;
              border-bottom: 1.5px solid #e2e8f0;
              padding-bottom: 4px;
              margin-top: 16px;
              margin-bottom: 8px;
              letter-spacing: 0.3px;
            }
            .cause-box {
              background-color: #fff1f2;
              border: 1px solid #fecdd3;
              border-left: 4px solid #e11d48;
              padding: 12px;
              border-radius: 4px;
              margin-bottom: 16px;
            }
            .cause-title {
              font-weight: 800;
              color: #be123c;
              font-size: 10.5px;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .cause-text {
              font-size: 13.5px;
              font-weight: 750;
              color: #1e293b;
            }
            .findings-box {
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              padding: 12px;
              border-radius: 4px;
              font-size: 12px;
              line-height: 1.6;
              color: #334155;
              white-space: pre-line;
            }
            .clearance-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin-top: 10px;
              margin-bottom: 16px;
            }
            .clearance-card {
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
              border-radius: 4px;
              background-color: #ffffff;
            }
            .clearance-title {
              font-size: 9px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
            }
            .clearance-status {
              font-size: 11.5px;
              font-weight: 700;
              color: #16a34a;
              margin-top: 2px;
            }
            .sign-box {
              margin-top: 22px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-top: 1px dashed #94a3b8;
              padding-top: 12px;
            }
            .sign-label {
              font-size: 9.5px;
              color: #64748b;
              font-weight: 700;
              text-transform: uppercase;
            }
            .sign-name {
              font-family: Georgia, 'Times New Roman', serif;
              font-style: italic;
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 4px;
            }
            .sign-stamp {
              border: 2px solid #16a34a;
              color: #16a34a;
              padding: 5px 10px;
              border-radius: 4px;
              font-weight: 800;
              font-size: 10.5px;
              text-transform: uppercase;
              text-align: center;
              letter-spacing: 0.5px;
              background-color: #f0fdf4;
            }
            .print-button-bar {
              margin-bottom: 16px;
              text-align: right;
            }
            .print-btn {
              background-color: #7c3aed;
              color: #ffffff;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              font-weight: 700;
              cursor: pointer;
              font-size: 13px;
            }
            @media print {
              .print-button-bar {
                display: none !important;
              }
              body {
                padding: 0 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-button-bar">
            <button class="print-btn" onclick="window.print()">🖨️ Print Autopsy Report</button>
          </div>

          <div class="report-header">
            <div>
              <div class="hospital-title">FAITH FOUNDATION MISSION HOSPITAL</div>
              <div class="hospital-subtitle">Department of Anatomic Pathology & Forensic Mortuary Services</div>
              <div class="report-badge">POSTMORTEM AUTOPSY & PATHOLOGICAL EXAMINATION REPORT</div>
            </div>
            <div style="text-align: right;">
              <img src="/hospital-logo.png" alt="Hospital Logo" class="hospital-logo" onerror="this.style.display='none'" />
              <div style="font-size: 11px; font-weight: 700; color: #7c3aed; margin-top: 4px;">REF: ${report.id}</div>
            </div>
          </div>

          <table class="meta-table">
            <tr>
              <td class="meta-label">Deceased Patient:</td>
              <td class="meta-value"><strong>${report.name || 'Unknown Deceased'}</strong></td>
              <td class="meta-label">Mortuary MRN:</td>
              <td class="meta-value" style="font-family: monospace;">${report.mrn}</td>
            </tr>
            <tr>
              <td class="meta-label">Age / Gender:</td>
              <td class="meta-value">${report.age || 50} Yrs / ${report.gender || 'Male'}</td>
              <td class="meta-label">Medico-Legal Scope:</td>
              <td class="meta-value" style="color: ${report.type === 'CORONER' ? '#dc2626' : '#7c3aed'}; font-weight: 800;">
                ${report.type === 'CORONER' || (report.scope && report.scope.includes('Coroner')) ? 'CORONER / POLICE FORENSIC' : 'CLINICAL PATHOLOGY'}
              </td>
            </tr>
            <tr>
              <td class="meta-label">Examining Pathologist:</td>
              <td class="meta-value">${report.pathologist || 'Dr. T. A. Vegher (Consultant Pathologist)'}</td>
              <td class="meta-label">Examination Date:</td>
              <td class="meta-value">${report.scheduledTime || new Date().toLocaleString()}</td>
            </tr>
            <tr>
              <td class="meta-label">Storage Location:</td>
              <td class="meta-value">${report.storageLocation || 'Mortuary Cold Vault Bay 08'}</td>
              <td class="meta-label">Report Status:</td>
              <td class="meta-value" style="color: #16a34a; font-weight: 800;">${report.status || report.statusStage || 'COMPLETED & CERTIFIED'}</td>
            </tr>
          </table>

          <div class="section-title">I. Official Certified Cause of Death</div>
          <div class="cause-box">
            <div class="cause-title">Primary Pathological Mechanism (Immediate Cause):</div>
            <div class="cause-text">${report.causeOfDeath || 'Pending final toxicological & histological correlation'}</div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 5px;">
              ICD-10 Diagnostic Classification Completed · Certified for National Death Registry & Legal Release.
            </div>
          </div>

          <div class="section-title">II. Gross Organ Dissection & Pathological Findings</div>
          <div class="findings-box">
            ${report.findings || 'External examination reveals intact deceased body. Internal postmortem dissection shows gross organ changes consistent with clinical history. Forensic toxicology cleared.'}
          </div>

          <div class="section-title">III. Ancillary Diagnostic Clearances</div>
          <div class="clearance-grid">
            <div class="clearance-card">
              <div class="clearance-title">Histopathology</div>
              <div class="clearance-status">✅ Biopsies Cleared</div>
            </div>
            <div class="clearance-card">
              <div class="clearance-title">Forensic Toxicology</div>
              <div class="clearance-status">✅ Screened & Negative</div>
            </div>
            <div class="clearance-card">
              <div class="clearance-title">Police / Coroner Hold</div>
              <div class="clearance-status" style="color: #7c3aed;">✅ Cleared for Release</div>
            </div>
          </div>

          <div class="sign-box">
            <div>
              <div class="sign-label">Examining Consultant Pathologist:</div>
              <div class="sign-name">${report.pathologist || 'Dr. T. A. Vegher'}</div>
              <div style="font-size: 10.5px; color: #64748b;">Chief Consultant Pathologist · MD, FMCPath, FWACP</div>
              <div style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">Medical and Dental Council of Nigeria (MDCN) Certified</div>
            </div>
            <div style="text-align: right;">
              <div class="sign-stamp">MDCN DIGITAL SIGNATURE VERIFIED</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                Certified: ${report.scheduledTime || new Date().toLocaleString()}
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  const handleLogEmbalming = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const targetMrn = (fd.get('mrn') as string) || selectedMRN;
    const preservativeFluid = (fd.get('preservativeFluid') as string) || 'Arterial Formalin & Glutaraldehyde Complex (3.5% index)';
    const embalmer = (fd.get('embalmer') as string) || selectedEmbalmer || 'Caleb Okoh (Licensed Mortician & Embalmer - MOR-0001)';
    const bodyPrepStatus = (fd.get('bodyPrepStatus') as string) || selectedPrepStatus || 'DRESSED_AND_GROOMED';
    const notes = (fd.get('notes') as string) || '';

    const selectedService = BODY_PREPARATION_SERVICES.find(s => s.value === bodyPrepStatus) || BODY_PREPARATION_SERVICES[0];

    if (!targetMrn) {
      enqueueSnackbar('Please select an admitted deceased body', { variant: 'warning' });
      return;
    }

    try {
      const res = await api.post('/mortuary/embalming', {
        mrn: targetMrn,
        preservativeFluid,
        embalmer,
        bodyPrepStatus,
        serviceCode: selectedService.code,
        amount: selectedService.price,
        shroudVerified: true,
        certificateIssued: true,
        notes,
      }).catch(() => ({ data: null }));

      const adm = admissions.find(a => a.mrn === targetMrn);
      const newRec = res?.data?.data || {
        id: `EMB-${Date.now().toString().slice(-3)}`,
        mrn: targetMrn,
        name: adm?.name || 'Deceased Patient',
        preservativeFluid,
        embalmer,
        bodyPrepStatus,
        serviceCode: selectedService.code,
        shroudVerified: true,
        certificateIssued: true,
        completedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        notes,
      };

      setEmbalmings(prev => [newRec, ...prev]);
      setCustody(prev => [
        {
          id: `COC-${Date.now().toString().slice(-4)}`,
          mrn: targetMrn,
          name: adm?.name || 'Deceased Patient',
          event: 'EMBALMING_PREPARATION',
          origin: adm?.storageLocation || 'Cold Vault',
          destination: 'Embalming & Cosmological Prep Suite',
          personnel: embalmer,
          recipient: 'Family Viewing Chamber Ready',
          notes: `Arterial preservation completed (${preservativeFluid}). Status: ${bodyPrepStatus}. Invoiced: ${selectedService.code} (₦${selectedService.price.toLocaleString()}).`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
        },
        ...prev
      ]);

      enqueueSnackbar(`✅ Embalming logged! ₦${selectedService.price.toLocaleString()} (${selectedService.code}) invoiced to Internal Banking for payment.`, { variant: 'success' });
      setEmbalmDialogOpen(false);
      await fetchData();
    } catch {
      enqueueSnackbar('Failed to log embalming procedure', { variant: 'error' });
    }
  };

  const handleScheduleViewing = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const targetMrn = (fd.get('mrn') as string) || selectedMRN;
    const viewingChamber = (fd.get('viewingChamber') as string) || 'Private Family Viewing Chapel 1';
    const familyContact = (fd.get('familyContact') as string) || 'Next of Kin Contact';
    const rawTime = (fd.get('scheduledTime') as string) || '';
    const scheduledTime = rawTime ? (rawTime.includes('T') ? rawTime.replace('T', ' ') : rawTime) : new Date().toLocaleString();
    const maxAttendees = Number(fd.get('maxAttendees')) || 10;
    const religiousRequirements = (fd.get('religiousRequirements') as string) || 'Standard Dignity Committal Viewing';

    if (!targetMrn) {
      enqueueSnackbar('Please select a deceased body', { variant: 'warning' });
      return;
    }

    try {
      const res = await api.post('/mortuary/viewings', {
        mrn: targetMrn,
        viewingChamber,
        familyContact,
        scheduledTime,
        maxAttendees,
        religiousRequirements,
      }).catch(() => ({ data: null }));

      const adm = admissions.find(a => a.mrn === targetMrn);
      const newViewing = res?.data?.data || {
        id: `VIW-${Date.now().toString().slice(-3)}`,
        mrn: targetMrn,
        name: adm?.name || 'Deceased Patient',
        viewingChamber,
        familyContact,
        scheduledTime,
        maxAttendees,
        status: 'SCHEDULED',
        religiousRequirements,
      };

      setViewings(prev => [newViewing, ...prev]);
      setCustody(prev => [
        {
          id: `COC-${Date.now().toString().slice(-4)}`,
          mrn: targetMrn,
          name: adm?.name || 'Deceased Patient',
          event: 'DIGNITY_FAMILY_VIEWING',
          origin: adm?.storageLocation || 'Cold Vault',
          destination: viewingChamber,
          personnel: 'Mortuary Officer Caleb',
          recipient: familyContact,
          notes: `Family viewing session scheduled for ${scheduledTime}. Max attendees: ${maxAttendees}.`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
        },
        ...prev
      ]);

      enqueueSnackbar('Family dignity viewing session booked and invoiced to Cashier.', { variant: 'success' });
      setViewingDialogOpen(false);
      await fetchData();
    } catch {
      enqueueSnackbar('Failed to book viewing session', { variant: 'error' });
    }
  };

  const handleUpdateViewingStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/mortuary/viewings/${id}/status`, { status: newStatus }).catch(() => {});
      setViewings(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
      enqueueSnackbar(`Viewing session marked as ${newStatus.replace(/_/g, ' ')}.`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update viewing status', { variant: 'error' });
    }
  };

  const handleOpenReleaseDialog = (adm: any) => {
    setSelectedDeceasedForRelease(adm);
    setSelectedMRN(adm.mrn);
    setClaimantNameInput(adm.nextOfKin?.name || '');
    setClaimantNidInput('');
    setRelationshipInput(adm.nextOfKin?.relationship || 'Spouse');
    setUndertakerInput('Family Private Hearse');
    setHearseNumberInput('');
    setReceiptNumberInput(`RCP-MORT-${Date.now().toString().slice(-5)}`);
    setHandoverOfficerInput('Caleb Okoh (Licensed Mortician)');
    setHandoverDeclaration(true);
    setReleaseDialogOpen(true);
  };

  const handleReleaseBody = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const targetMrn = (fd.get('mrn') as string) || selectedMRN;
    const claimantName = (fd.get('claimantName') as string) || claimantNameInput;
    const claimantNid = (fd.get('claimantNid') as string) || claimantNidInput;
    const relationship = (fd.get('relationship') as string) || relationshipInput;
    const undertaker = (fd.get('undertaker') as string) || undertakerInput;
    const hearseNumber = (fd.get('hearseNumber') as string) || hearseNumberInput;
    const receiptNumber = (fd.get('receiptNumber') as string) || receiptNumberInput;
    const handoverOfficer = (fd.get('handoverOfficer') as string) || handoverOfficerInput;

    if (!claimantName || !claimantNid) {
      enqueueSnackbar('Claimant Name and National Identity Number (NIN) are mandatory for positive identification release.', { variant: 'warning' });
      return;
    }

    try {
      await api.post('/mortuary/release', {
        mrn: targetMrn,
        claimantName,
        claimantNid,
        relationship,
        undertaker,
        hearseNumber,
        receiptNumber,
      });

      const releasedRecord = {
        mrn: targetMrn,
        name: selectedDeceasedForRelease?.name || 'Deceased Patient',
        gender: selectedDeceasedForRelease?.gender,
        age: selectedDeceasedForRelease?.age,
        admittedAt: selectedDeceasedForRelease?.admittedAt,
        causeOfDeath: selectedDeceasedForRelease?.causeOfDeath,
        certifyingClinician: selectedDeceasedForRelease?.certifyingClinician,
        claimantName,
        claimantNid,
        relationship,
        undertaker,
        hearseNumber,
        receiptNumber,
        handoverOfficer,
        releasedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };

      setAdmissions(prev => prev.map(a => a.mrn === targetMrn ? {
        ...a,
        ...releasedRecord,
        status: 'RELEASED',
        storageLocation: 'RELEASED (Vault Vacated)',
      } : a));

      setCustody(prev => [
        {
          id: `COC-${Date.now().toString().slice(-4)}`,
          mrn: targetMrn,
          name: selectedDeceasedForRelease?.name || 'Deceased Patient',
          event: 'FINAL_RELEASE',
          origin: selectedDeceasedForRelease?.storageLocation || 'Cold Vault',
          destination: 'RELEASED_TO_FAMILY',
          personnel: handoverOfficer,
          recipient: `${claimantName} (${relationship} · NIN: ${claimantNid})`,
          notes: `Body released to family. Undertaker: ${undertaker} [${hearseNumber || 'N/A'}]. Cashier Receipt: ${receiptNumber}. Official gate pass issued.`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
        },
        ...prev
      ]);

      enqueueSnackbar('Positive identity confirmed. Deceased body released & custody sealed.', { variant: 'success' });
      setReleaseDialogOpen(false);
      
      // Auto-offer printable gate pass
      handlePrintReleasePass(releasedRecord);
      await fetchData();
    } catch {
      enqueueSnackbar('Failed to complete body release handover.', { variant: 'error' });
    }
  };

  const handlePrintReleasePass = (adm: any) => {
    if (!adm) return;
    const printWin = window.open('', '_blank', 'width=900,height=1000');
    if (!printWin) {
      window.print();
      return;
    }
    const releaseDate = adm.releasedAt || new Date().toLocaleString();
    const claimant = adm.claimantName || adm.nextOfKin?.name || 'Verified Legal Claimant';
    const nin = adm.claimantNid || 'NIN-VERIFIED';
    const rel = adm.relationship || adm.nextOfKin?.relationship || 'Next of Kin';
    const undertaker = adm.undertaker || 'Authorized Funeral Vehicle';
    const hearse = adm.hearseNumber || 'N/A';
    const officer = adm.handoverOfficer || 'Caleb Okoh (Licensed Mortician)';
    const rcp = adm.receiptNumber || `RCP-${Date.now().toString().slice(-5)}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mortuary Body Release Clearance & Gate Pass - ${adm.mrn}</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 15mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 13px; }
            .header { border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 11px; background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
            .section { margin-bottom: 15px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; }
            .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
            .label { font-size: 11px; color: #64748b; font-weight: 600; }
            .value { font-size: 13px; color: #0f172a; font-weight: 700; margin-top: 2px; }
            .gate-pass { border: 2px dashed #0f172a; padding: 15px; background: #f8fafc; border-radius: 8px; margin-top: 15px; text-align: center; }
            .signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; }
            .sig-box { width: 45%; text-align: center; border-top: 1px solid #0f172a; padding-top: 6px; font-size: 12px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">FAITH FOUNDATION MISSION HOSPITAL</div>
              <div style="font-size: 12px; font-weight: 700; color: #475569;">DEPARTMENT OF MORTUARY & FUNERAL SERVICES</div>
              <div style="font-size: 11px; color: #64748b;">Plot 12 Hospital Road · Tel: +234 803 123 4567 · ISO 9001:2015 Accredited</div>
            </div>
            <div style="text-align: right;">
              <div class="badge">OFFICIAL RELEASE PASS</div>
              <div style="font-size: 11px; font-family: monospace; font-weight: 800; margin-top: 4px;">PASS-${adm.mrn}</div>
              <div style="font-size: 10px; color: #64748b;">${releaseDate}</div>
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 15px;">
            <h2 style="margin: 0; font-size: 16px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">
              OFFICIAL BODY RELEASE & GATE EXIT CLEARANCE CERTIFICATE
            </h2>
            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
              Statutory clearance for handover of remains from hospital mortuary cold vault to authorized next-of-kin.
            </div>
          </div>

          <div class="section">
            <div class="section-title">1. DECEASED IDENTIFICATION & CUSTODY RECORD</div>
            <div class="grid">
              <div><div class="label">Full Name of Deceased:</div><div class="value" style="font-size: 15px; color: #0f172a;">${adm.name}</div></div>
              <div><div class="label">Mortuary MRN / Tag ID:</div><div class="value" style="font-family: monospace;">${adm.mrn}</div></div>
              <div><div class="label">Gender / Age:</div><div class="value">${adm.gender || 'Male'} · ${adm.age || 50} years</div></div>
              <div><div class="label">Date & Time Admitted:</div><div class="value">${adm.admittedAt || 'N/A'}</div></div>
              <div><div class="label">Certifying Clinician:</div><div class="value">${adm.certifyingClinician || 'Attending Physician'}</div></div>
              <div><div class="label">Certified Cause of Death:</div><div class="value">${adm.causeOfDeath || 'Refractory Cardiogenic Shock'}</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. AUTHORIZED CLAIMANT & HANDOVER VERIFICATION</div>
            <div class="grid">
              <div><div class="label">Claimant Full Name:</div><div class="value">${claimant}</div></div>
              <div><div class="label">National Identity No. (NIN):</div><div class="value" style="font-family: monospace;">${nin}</div></div>
              <div><div class="label">Legal Relationship to Deceased:</div><div class="value">${rel}</div></div>
              <div><div class="label">Receiving Undertaker & Hearse:</div><div class="value">${undertaker} [Vehicle Reg: ${hearse}]</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">3. STATUTORY STATUTES & FINANCIAL CLEARANCE</div>
            <div class="grid-3">
              <div><div class="label">Autopsy Clearance:</div><div class="value" style="color: #16a34a;">✅ Signed / Cleared</div></div>
              <div><div class="label">Death Certificate:</div><div class="value" style="color: #16a34a;">✅ Registered (#${adm.mrn.replace(/[^0-9]/g, '') || '8841'})</div></div>
              <div><div class="label">Vault Storage Billing:</div><div class="value" style="color: #16a34a;">✅ Fully Settled (Receipt: ${rcp})</div></div>
            </div>
          </div>

          <div class="gate-pass">
            <div style="font-weight: 900; font-size: 14px; color: #0f172a; text-transform: uppercase;">
              HOSPITAL MAIN GATE EXIT PASS · SECURITY CLEARANCE
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 4px;">
              Security checkpoint is authorized to grant gate exit to the hearse / transport vehicle carrying the remains of <strong>${adm.name}</strong> (Tag: ${adm.mrn}).
            </div>
            <div style="font-family: monospace; font-size: 14px; font-weight: 900; margin-top: 8px; letter-spacing: 2px;">
              *FFMH-EXIT-${adm.mrn}-CLEARED*
            </div>
          </div>

          <div class="signatures">
            <div class="sig-box">
              <div>${claimant}</div>
              <div style="font-size: 10px; color: #64748b; font-weight: normal;">Authorized Claimant / Next-of-Kin Signature</div>
            </div>
            <div class="sig-box">
              <div>${officer}</div>
              <div style="font-size: 10px; color: #64748b; font-weight: normal;">Mortuary In-Charge / Handover Officer</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  const handlePrintFuneralInvoice = (adm: any) => {
    if (!adm) return;
    const printWin = window.open('', '_blank', 'width=900,height=1000');
    if (!printWin) {
      window.print();
      return;
    }
    const days = Math.max(1, Math.ceil((Date.now() - new Date(adm.admittedAt || Date.now()).getTime()) / 86400000));
    const vaultFee = days * 5000;
    const embalmingItem = embalmings.find(e => e.mrn === adm.mrn);
    const embalmFee = embalmingItem ? 35000 : 0;
    const viewingItem = viewings.find(v => v.mrn === adm.mrn);
    const viewingFee = viewingItem ? 15000 : 0;
    const shroudFee = 10000;
    const total = vaultFee + embalmFee + viewingFee + shroudFee;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Funeral & Mortuary Service Bill - ${adm.mrn}</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 15mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 13px; }
            .header { border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 11px; background: #e0e7ff; color: #3730a3; }
            .table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
            .table th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 11px; font-weight: 800; border: 1px solid #cbd5e1; }
            .table td { padding: 8px 10px; font-size: 12px; border: 1px solid #cbd5e1; }
            .total-box { text-align: right; margin-top: 15px; font-size: 15px; font-weight: 800; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">FAITH FOUNDATION MISSION HOSPITAL</div>
              <div style="font-size: 12px; font-weight: 700; color: #475569;">MORTUARY SERVICES & FUNERAL BILLING INVOICE</div>
              <div style="font-size: 11px; color: #64748b;">Plot 12 Hospital Road · Tel: +234 803 123 4567</div>
            </div>
            <div style="text-align: right;">
              <div class="badge">FUNERAL BILLING INVOICE</div>
              <div style="font-size: 11px; font-family: monospace; font-weight: 800; margin-top: 4px;">INV-MORT-${adm.mrn}</div>
              <div style="font-size: 10px; color: #64748b;">Date: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div style="margin-bottom: 15px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px;">
            <div style="font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 6px;">PATIENT DEMOGRAPHICS & CUSTODY</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div><strong>Deceased:</strong> ${adm.name}</div>
              <div><strong>MRN / Tag:</strong> ${adm.mrn}</div>
              <div><strong>Admitted Date:</strong> ${adm.admittedAt || 'N/A'}</div>
              <div><strong>Next of Kin:</strong> ${adm.nextOfKin?.name || 'Family Representative'} (${adm.nextOfKin?.phone || '—'})</div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>SERVICE DESCRIPTION</th>
                <th>QUANTITY / DURATION</th>
                <th>UNIT RATE (₦)</th>
                <th style="text-align: right;">SUBTOTAL (₦)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Cold Vault Refrigeration & Preservation</strong><br/><span style="font-size: 11px; color: #64748b;">Daily environmental cold storage chamber</span></td>
                <td>${days} Day(s)</td>
                <td>₦5,000</td>
                <td style="text-align: right; font-weight: 700;">₦${vaultFee.toLocaleString()}</td>
              </tr>
              ${embalmingItem ? `
              <tr>
                <td><strong>Arterial Embalming & Restoration</strong><br/><span style="font-size: 11px; color: #64748b;">Glutaraldehyde/Formalin arterial perfusion protocol</span></td>
                <td>1 Procedure</td>
                <td>₦35,000</td>
                <td style="text-align: right; font-weight: 700;">₦35,000</td>
              </tr>` : ''}
              ${viewingItem ? `
              <tr>
                <td><strong>Family Dignity Viewing Suite Reservation</strong><br/><span style="font-size: 11px; color: #64748b;">Private serenity chapel committal session</span></td>
                <td>1 Session</td>
                <td>₦15,000</td>
                <td style="text-align: right; font-weight: 700;">₦15,000</td>
              </tr>` : ''}
              <tr>
                <td><strong>Sanitary Shroud, Grooming & Biometric Verification</strong><br/><span style="font-size: 11px; color: #64748b;">Preparation, restorative dressing, and security tagging</span></td>
                <td>1 Service</td>
                <td>₦10,000</td>
                <td style="text-align: right; font-weight: 700;">₦10,000</td>
              </tr>
            </tbody>
          </table>

          <div class="total-box">
            <div>TOTAL MORTUARY & FUNERAL CHARGES: <span style="color: #7c3aed; font-size: 18px;">₦${total.toLocaleString()}</span></div>
            <div style="font-size: 11px; color: #16a34a; margin-top: 4px;">Status: Certified Ready for Cashier Clearance</div>
          </div>

          <div style="margin-top: 40px; display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 10px;">
            <div>
              <div style="font-weight: 700;">Prepared by: Caleb Okoh</div>
              <div style="font-size: 11px; color: #64748b;">Licensed Mortician & Mortuary Officer</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700;">Internal Banking / Cashier Audit</div>
              <div style="font-size: 11px; color: #64748b;">Faith Foundation Finance Desk</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  const handleBillToCashier = async (adm: any) => {
    const days = Math.max(1, Math.ceil((Date.now() - new Date(adm.admittedAt || Date.now()).getTime()) / 86400000));
    const vaultFee = days * 5000;
    const embalmingItem = embalmings.find(e => e.mrn === adm.mrn);
    const embalmFee = embalmingItem ? 35000 : 0;
    const viewingItem = viewings.find(v => v.mrn === adm.mrn);
    const viewingFee = viewingItem ? 15000 : 0;
    const total = vaultFee + embalmFee + viewingFee + 10000;

    try {
      await api.post('/billing/invoices', {
        patientId: adm.patientId || adm.mrn,
        type: 'MORTUARY',
        amount: total,
        description: `Mortuary Vault Storage (${days}d) & Funeral Care for ${adm.name} (${adm.mrn})`,
        items: [
          { description: `Cold Vault Storage (${days} days @ ₦5,000/day)`, amount: vaultFee },
          ...(embalmingItem ? [{ description: 'Arterial Embalming & Body Restoration Protocol', amount: embalmFee }] : []),
          ...(viewingItem ? [{ description: 'Family Dignity Viewing Suite Reservation', amount: viewingFee }] : []),
          { description: 'Sanitary Shrouding & Biometric Security Tagging', amount: 10000 }
        ]
      }).catch(() => {});

      enqueueSnackbar(`Funeral bill of ₦${total.toLocaleString()} transmitted to Cashier Billing desk.`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to dispatch invoice to Cashier', { variant: 'error' });
    }
  };

  const handleCreateCAPA = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/mortuary/capa', {
        targetUnit: fd.get('targetUnit'),
        discrepancy: fd.get('discrepancy'),
        correctiveAction: fd.get('correctiveAction'),
        deadline: fd.get('deadline'),
      });
      enqueueSnackbar('CAPA plan filed to compliance quality review', { variant: 'warning' });
      setCapaDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to create CAPA plan', { variant: 'error' });
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 27.1: Body Admission & Intake
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab1 = () => (
    <Box>
      <Tabs value={subTab0} onChange={(_, v) => setSubTab0(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['Deceased Admissions Registry', 'Personal Belongings Inventory'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab0 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 27.1.1 Admissions ── */}
      <TabPanel value={subTab0} index={0}>
        {/* Pending Hospital Deceased Transfers Alert Banner */}
        {(() => {
          const seenPending = new Set<string>();
          const pending = deceasedQueue.filter(q => {
            if (q.status === 'ADMITTED') return false;
            const key = (q.patientId && String(q.patientId).trim())
              ? `PID_${String(q.patientId).trim().toLowerCase()}`
              : `NAME_${(q.name || '').toLowerCase().replace(/^late\s+/i, '').replace(/[^a-z0-9]/g, '')}`;
            if (seenPending.has(key)) return false;
            seenPending.add(key);
            return true;
          });
          if (pending.length === 0) return null;
          return (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 2.5,
                borderRadius: 2.5,
                bgcolor: alpha(WARNING, 0.05),
                borderColor: alpha(WARNING, 0.35),
                borderLeft: `5px solid ${WARNING}`,
                boxShadow: '0 4px 16px rgba(234, 88, 12, 0.08)',
              }}
            >
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: alpha(WARNING, 0.15), color: WARNING, width: 44, height: 44 }}>
                    <LocalHospital sx={{ fontSize: 24 }} />
                  </Avatar>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight={800} color="#c2410c">
                        Pending Hospital Deceased Transfers ({pending.length})
                      </Typography>
                      <Chip label="Action Required" color="warning" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      Patients marked deceased in IPD or OPD wards awaiting cold chamber allocation & mortician intake admission.
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {pending.map((item: any) => (
                    <Button
                      key={item.id || item.patientId || item.name}
                      size="small"
                      variant="contained"
                      onClick={() => handleOpenAdmitDialog(item)}
                      sx={{
                        textTransform: 'none',
                        bgcolor: WARNING,
                        '&:hover': { bgcolor: '#c2410c' },
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        borderRadius: 2,
                        py: 0.6,
                        px: 1.5,
                      }}
                      startIcon={<SevereCold sx={{ fontSize: 16 }} />}
                    >
                      Admit {item.name} ({item.source || 'Ward'})
                    </Button>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          );
        })()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Intake Admissions (FR-MOR-001–010)</Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<Home sx={{ fontSize: 17 }} />}
              onClick={() => handleOpenAdmitDialog(undefined, 'OUTSIDE_DEATH')}
              sx={{
                textTransform: 'none',
                fontWeight: 800,
                borderRadius: 2,
                fontSize: '0.78rem',
                borderColor: alpha(PRIMARY, 0.35),
                color: PRIMARY,
                '&:hover': { bgcolor: alpha(PRIMARY, 0.05), borderColor: PRIMARY },
              }}
            >
              Admit Outside Death (BID)
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenAdmitDialog()}
              sx={{ bgcolor: PRIMARY, borderRadius: 2, fontWeight: 800, textTransform: 'none', fontSize: '0.8rem' }}
            >
              Admit Body
            </Button>
          </Stack>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflowX: 'hidden' }}>
          <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
            <TableHead sx={{ bgcolor: PRIMARY, '& .MuiTableCell-head': { color: '#ffffff !important', fontWeight: 800 } }}>
              <TableRow>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.72rem', py: 1.2, width: '10%' }}>Mortuary MRN</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.72rem', py: 1.2, width: '14%' }}>Deceased Full Name</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.72rem', py: 1.2, width: '8%' }}>Admitted Date</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.72rem', py: 1.2, width: '11%' }}>Clinician Certifier</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.72rem', py: 1.2, width: '17%' }}>Cause of Death</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.72rem', py: 1.2, width: '9%' }}>Legal Status</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.72rem', py: 1.2, width: '11%' }}>Current Cabinet</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.72rem', py: 1.2, width: '8%', textAlign: 'center' }}>Status</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.72rem', py: 1.2, width: '12%', textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {admissions.map(adm => (
                <TableRow key={adm.id} hover sx={{ '& td': { py: 1, px: 0.8 } }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', wordBreak: 'break-word' }}>{adm.mrn}</TableCell>
                  <TableCell sx={{ fontWeight: 650, fontSize: '0.8rem', wordBreak: 'break-word' }}>{adm.name}</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{adm.admittedAt}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{adm.certifyingClinician}</TableCell>
                  <TableCell sx={{ fontSize: '0.73rem', wordBreak: 'break-word', lineHeight: 1.25 }}>{adm.causeOfDeath}</TableCell>
                  <TableCell><StatusChip label={adm.medicoLegalStatus} /></TableCell>
                  <TableCell sx={{ fontWeight: 700, color: PURPLE, fontSize: '0.74rem', wordBreak: 'break-word' }}>{adm.storageLocation}</TableCell>
                  <TableCell align="center"><StatusChip label={adm.status} /></TableCell>
                  <TableCell align="center">
                    {adm.status === 'ADMITTED' ? (
                      <Stack direction="column" spacing={0.4} alignItems="stretch" sx={{ width: '100%', maxWidth: 105, mx: 'auto' }}>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          onClick={() => { setSelectedMRN(adm.mrn); setMoveDialogOpen(true); }}
                          sx={{ py: 0.25, px: 0.5, fontSize: '0.68rem', fontWeight: 700, textTransform: 'none', borderRadius: 1, width: '100%' }}
                        >
                          Transfer
                        </Button>
                        {(() => {
                          const existingAut = autopsies.find((a: any) => 
                            a.mrn === adm.mrn || 
                            a.mrn === adm.id || 
                            (adm.patientId && a.mrn === adm.patientId)
                          );
                          const isCompleted = existingAut?.status === 'COMPLETED' || adm.autopsyStatus?.toLowerCase().includes('completed');
                          const hasRequested = Boolean(existingAut) || Boolean(adm.autopsyStatus && !adm.autopsyStatus.toLowerCase().includes('none') && !adm.autopsyStatus.toLowerCase().includes('no autopsy'));

                          if (isCompleted) {
                            return (
                              <Chip 
                                label="Autopsy Done" 
                                size="small" 
                                color="success" 
                                variant="outlined"
                                sx={{ fontWeight: 800, fontSize: '0.62rem', height: 20, width: '100%' }} 
                              />
                            );
                          }
                          if (hasRequested) {
                            return (
                              <Stack direction="column" spacing={0.1} alignItems="center" sx={{ width: '100%' }}>
                                <Chip 
                                  label="Autopsy Req." 
                                  size="small" 
                                  color="secondary" 
                                  variant="filled"
                                  sx={{ fontWeight: 800, fontSize: '0.62rem', height: 20, width: '100%' }} 
                                />
                                <Button
                                  size="small"
                                  color="error"
                                  variant="text"
                                  sx={{ fontSize: '0.6rem', minWidth: 'auto', p: '0px 2px', lineHeight: 1.1, fontWeight: 700, textTransform: 'none' }}
                                  onClick={() => handleCancelAutopsy(adm.mrn)}
                                >
                                  Cancel
                                </Button>
                              </Stack>
                            );
                          }
                          return (
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="secondary" 
                              onClick={() => handleOpenAutopsyDialog(adm.mrn)}
                              sx={{ py: 0.25, px: 0.5, fontSize: '0.66rem', fontWeight: 700, textTransform: 'none', borderRadius: 1, width: '100%', whiteSpace: 'nowrap' }}
                            >
                              Request Autopsy
                            </Button>
                          );
                        })()}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenBelongingsDialog(adm.mrn)}
                          sx={{
                            py: 0.25,
                            px: 0.5,
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: 1,
                            width: '100%',
                            borderColor: alpha(TEAL, 0.6),
                            color: TEAL,
                            '&:hover': { borderColor: TEAL, bgcolor: alpha(TEAL, 0.08) },
                          }}
                          startIcon={<Inventory sx={{ fontSize: 13 }} />}
                        >
                          + Belongings
                        </Button>
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="error" 
                          onClick={() => { setSelectedMRN(adm.mrn); setReleaseDialogOpen(true); }}
                          sx={{ py: 0.25, px: 0.5, fontSize: '0.68rem', fontWeight: 700, textTransform: 'none', borderRadius: 1, width: '100%' }}
                        >
                          Release
                        </Button>
                      </Stack>
                    ) : (
                      <Chip label="Released" size="small" color="default" sx={{ fontSize: '0.65rem', height: 20 }} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 27.1.2 Personal Effects ── */}
      <TabPanel value={subTab0} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Chain of Custody for Personal Effects (FR-MOR-017–019)</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>All personal items and valuables must be documented at admission or custody intake and released only to verified legal contacts.</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenBelongingsDialog()}
            sx={{
              bgcolor: TEAL,
              '&:hover': { bgcolor: '#0f766e' },
              borderRadius: 2,
              fontWeight: 800,
              textTransform: 'none',
              fontSize: '0.8rem',
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.25)',
            }}
          >
            + Log Personal Belonging
          </Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: TEAL, '& .MuiTableCell-head': { color: '#ffffff !important', fontWeight: 800 } }}>
              <TableRow>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '12%' }}>Mortuary MRN</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '18%' }}>Deceased Particulars</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '22%' }}>Belonging Item Description</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '9%' }}>Quantity</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '14%' }}>Storage Locker</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '11%' }}>Custody Status</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '14%', textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {admissions.flatMap(adm => (adm.personalEffects || []).map((pe: any) => (
                <TableRow key={pe.id || `${adm.mrn}-${pe.description}`} hover sx={{ '& td': { py: 1.1, px: 1 } }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem' }}>{adm.mrn}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{adm.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      Status: {adm.status} · Loc: {adm.storageLocation}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{pe.description}</Typography>
                    {pe.notes && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', fontSize: '0.7rem' }}>
                        Note: {pe.notes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{pe.quantity || 1} pc(s)</TableCell>
                  <TableCell>
                    <Chip
                      icon={<Lock sx={{ fontSize: '13px !important' }} />}
                      label={pe.storageLocker || 'Locker A-01'}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22, borderColor: alpha(PRIMARY, 0.25) }}
                    />
                  </TableCell>
                  <TableCell><StatusChip label={pe.status || 'SECURED'} /></TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                      {pe.status === 'SECURED' ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => handleReleaseBelonging(pe.id)}
                          sx={{ py: 0.2, px: 0.8, fontSize: '0.65rem', fontWeight: 700, textTransform: 'none', borderRadius: 1 }}
                        >
                          Handover NOK
                        </Button>
                      ) : pe.status === 'RELEASED_TO_NOK' ? (
                        <Chip label="Released" size="small" color="success" sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700 }} />
                      ) : (
                        <Chip label={pe.status} size="small" color="default" sx={{ fontSize: '0.65rem', height: 20 }} />
                      )}
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteBelonging(pe.id)}
                        sx={{ p: 0.4 }}
                        title="Remove Record"
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              )))}
              {admissions.every(adm => !adm.personalEffects || adm.personalEffects.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Inventory sx={{ fontSize: 40, color: 'text.disabled' }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        No personal belongings inventory logged yet.
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpenBelongingsDialog()}
                        sx={{ textTransform: 'none', fontWeight: 700, mt: 0.5, borderColor: TEAL, color: TEAL }}
                      >
                        + Log First Personal Effect
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 27.2: Refrigeration & Custody Logs
  // ══════════════════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 27.2: Refrigeration & Custody Logs
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab2 = () => {
    const occupiedCount = storage.filter(s => s.occupied).length;
    const vacantCount = storage.filter(s => !s.occupied).length;
    const alertCount = storage.filter(s => s.status === 'EXCURSION_ALERT' || s.tempCelsius > 8).length;

    const filteredStorage = storage.filter(s => {
      if (cabFilter === 'OCCUPIED') return s.occupied;
      if (cabFilter === 'VACANT') return !s.occupied;
      if (cabFilter === 'ALERTS') return s.status === 'EXCURSION_ALERT' || s.tempCelsius > 8;
      return true;
    });

    const filteredCustody = custody.filter(c => {
      const matchSearch = !custodySearch || 
        (c.mrn && c.mrn.toLowerCase().includes(custodySearch.toLowerCase())) ||
        (c.name && c.name.toLowerCase().includes(custodySearch.toLowerCase())) ||
        (c.event && c.event.toLowerCase().includes(custodySearch.toLowerCase())) ||
        (c.destination && c.destination.toLowerCase().includes(custodySearch.toLowerCase())) ||
        (c.personnel && c.personnel.toLowerCase().includes(custodySearch.toLowerCase()));

      const matchEvent = custodyEventFilter === 'ALL' || c.event === custodyEventFilter;
      return matchSearch && matchEvent;
    });

    return (
      <Box>
        <Tabs value={subTab1} onChange={(_, v) => setSubTab1(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
          {['Refrigeration Cabinet Status', 'Chain of Custody Transfers'].map((t, i) => (
            <Tab key={t} label={t} sx={{ fontWeight: subTab1 === i ? 800 : 500, textTransform: 'none' }} />
          ))}
        </Tabs>

        {/* ── 27.2.1 Refrigeration status ── */}
        <TabPanel value={subTab1} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Environmental Cooling Chambers & Vault Trays (FR-MOR-051–060)</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                Real-time digital telemetry, chamber temperature sensors, relative humidity, and tray occupancy census.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<Tune sx={{ fontSize: 17 }} />}
                onClick={handleCalibrateAllSensors}
                sx={{
                  textTransform: 'none',
                  fontWeight: 750,
                  fontSize: '0.78rem',
                  borderRadius: 2,
                  borderColor: alpha(PRIMARY, 0.3),
                  color: PRIMARY,
                  '&:hover': { bgcolor: alpha(PRIMARY, 0.04), borderColor: PRIMARY },
                }}
              >
                Recalibrate Sensors
              </Button>
              <Button
                variant="contained"
                startIcon={<SwapHoriz />}
                onClick={() => handleOpenTransferModal()}
                sx={{
                  bgcolor: PRIMARY,
                  borderRadius: 2,
                  fontWeight: 800,
                  textTransform: 'none',
                  fontSize: '0.8rem',
                }}
              >
                Transfer Body
              </Button>
            </Stack>
          </Box>

          {/* Quick Filter Badges */}
          <Stack direction="row" spacing={1} sx={{ mb: 2.5 }} flexWrap="wrap">
            <Chip
              label={`All Chambers (${storage.length})`}
              onClick={() => setCabFilter('ALL')}
              color={cabFilter === 'ALL' ? 'primary' : 'default'}
              variant={cabFilter === 'ALL' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 750, fontSize: '0.75rem', cursor: 'pointer' }}
            />
            <Chip
              label={`Occupied Trays (${occupiedCount})`}
              onClick={() => setCabFilter('OCCUPIED')}
              color={cabFilter === 'OCCUPIED' ? 'secondary' : 'default'}
              variant={cabFilter === 'OCCUPIED' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 750, fontSize: '0.75rem', cursor: 'pointer' }}
            />
            <Chip
              label={`Vacant Trays (${vacantCount})`}
              onClick={() => setCabFilter('VACANT')}
              color={cabFilter === 'VACANT' ? 'success' : 'default'}
              variant={cabFilter === 'VACANT' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 750, fontSize: '0.75rem', cursor: 'pointer' }}
            />
            <Chip
              label={`Sensor Alarms (${alertCount})`}
              onClick={() => setCabFilter('ALERTS')}
              color={cabFilter === 'ALERTS' ? 'error' : 'default'}
              variant={cabFilter === 'ALERTS' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 750, fontSize: '0.75rem', cursor: 'pointer' }}
            />
          </Stack>

          <Grid container spacing={2}>
            {filteredStorage.map((cab) => {
              const occupant = cab.occupant || admissions.find(a => a.status === 'ADMITTED' && a.storageLocation === cab.code);
              const isAlert = cab.status === 'EXCURSION_ALERT' || cab.tempCelsius > 8;

              return (
                <Grid item xs={12} sm={6} md={3} key={cab.code}>
                  <Card
                    sx={{
                      borderRadius: 2.5,
                      borderLeft: isAlert ? `6px solid ${DANGER}` : (cab.occupied ? `6px solid ${PURPLE}` : `6px solid ${SUCCESS}`),
                      boxShadow: isAlert ? '0 4px 20px rgba(220, 38, 38, 0.18)' : '0 4px 16px rgba(0,0,0,0.06)',
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '100%',
                      bgcolor: isAlert ? alpha(DANGER, 0.02) : '#ffffff',
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PRIMARY, fontSize: '0.95rem' }}>
                            {cab.code}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                            {cab.chamberType || 'Standard Cold Vault'}
                          </Typography>
                        </Box>
                        <StatusChip label={cab.status} />
                      </Box>

                      {/* Telemetry Sensor Metrics */}
                      <Paper variant="outlined" sx={{ p: 1.2, mb: 1.5, borderRadius: 2, bgcolor: isAlert ? alpha(DANGER, 0.06) : alpha(PRIMARY, 0.02) }}>
                        <Stack spacing={0.8}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Thermostat sx={{ fontSize: 15, color: isAlert ? DANGER : SUCCESS }} />
                              Temp Sensor:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.9rem', color: isAlert ? DANGER : (cab.tempCelsius < 0 ? '#0284c7' : SUCCESS) }}>
                              {cab.tempCelsius}°C
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">Relative Humidity:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 750, fontSize: '0.8rem' }}>{cab.humidityPercent}% RH</Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">Tray Capacity:</Typography>
                            <Chip
                              label={cab.occupied ? 'Occupied' : 'Vacant'}
                              size="small"
                              color={cab.occupied ? 'secondary' : 'success'}
                              sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                            />
                          </Stack>
                        </Stack>
                      </Paper>

                      {/* Occupant / Vacancy State */}
                      {occupant ? (
                        <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: alpha(PURPLE, 0.05), border: `1px dashed ${alpha(PURPLE, 0.3)}`, mb: 1.5 }}>
                          <Typography variant="caption" color={PURPLE} sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.04em' }}>
                            Current Deceased Occupant
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.82rem', mt: 0.3, color: PRIMARY }}>
                            {occupant.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.72rem', display: 'block' }}>
                            MRN: {occupant.mrn}
                          </Typography>
                          {occupant.causeOfDeath && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mt: 0.3, fontStyle: 'italic' }}>
                              {occupant.causeOfDeath}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: alpha(SUCCESS, 0.04), border: `1px dashed ${alpha(SUCCESS, 0.25)}`, mb: 1.5 }}>
                          <Typography variant="caption" color={SUCCESS} sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.72rem' }}>
                            <CheckCircle sx={{ fontSize: 14 }} /> Tray Cleaned & Sanitized
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mt: 0.3 }}>
                            Available for cold vault intake or internal transfer.
                          </Typography>
                        </Box>
                      )}

                      {/* Excursion Alert Warning */}
                      {isAlert && (
                        <Alert severity="error" sx={{ py: 0.5, px: 1, mb: 1.5, fontSize: '0.72rem', borderRadius: 1.5 }}>
                          <strong>Sensor Warning:</strong> Temp spike detected. Compressor check required.
                        </Alert>
                      )}
                    </Box>

                    {/* Card Actions */}
                    <Box sx={{ pt: 1, borderTop: '1px solid #f1f5f9' }}>
                      {isAlert ? (
                        <Button
                          fullWidth
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={() => handleCalibrateSensor(cab.code)}
                          startIcon={<Tune sx={{ fontSize: 15 }} />}
                          sx={{ textTransform: 'none', fontWeight: 750, fontSize: '0.72rem', borderRadius: 1.5 }}
                        >
                          Calibrate & Clear Alarm
                        </Button>
                      ) : occupant ? (
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          color="secondary"
                          onClick={() => {
                            setSelectedMRN(occupant.mrn);
                            setMoveDialogOpen(true);
                          }}
                          startIcon={<SwapHoriz sx={{ fontSize: 15 }} />}
                          sx={{ textTransform: 'none', fontWeight: 750, fontSize: '0.72rem', borderRadius: 1.5 }}
                        >
                          Transfer Deceased Body
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => handleOpenAdmitDialog()}
                          startIcon={<Add sx={{ fontSize: 15 }} />}
                          sx={{ textTransform: 'none', fontWeight: 750, fontSize: '0.72rem', borderRadius: 1.5 }}
                        >
                          + Admit Body Here
                        </Button>
                      )}
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </TabPanel>

        {/* ── 27.2.2 Custody Logs ── */}
        <TabPanel value={subTab1} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Chain of Custody Handover Register (FR-MOR-021–030)</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                Immutable audit trail for mortuary intakes, internal vault transfers, pathology suite handovers, and releases.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenCustodyDialog()}
              sx={{
                bgcolor: TEAL,
                '&:hover': { bgcolor: '#0f766e' },
                borderRadius: 2,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: '0.8rem',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.25)',
              }}
            >
              + Log Custody Transfer
            </Button>
          </Box>

          {/* Search & Filter Toolbar */}
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: alpha(PRIMARY, 0.015) }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search MRN, deceased name, or personnel..."
                  value={custodySearch}
                  onChange={(e) => setCustodySearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'text.secondary', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  size="small"
                  fullWidth
                  label="Filter Custody Event"
                  value={custodyEventFilter}
                  onChange={(e) => setCustodyEventFilter(e.target.value)}
                >
                  <MenuItem value="ALL">All Custody Events</MenuItem>
                  <MenuItem value="INITIAL_ADMISSION">Initial Mortuary Admission</MenuItem>
                  <MenuItem value="INTERNAL_TRANSFER">Internal Tray Movement</MenuItem>
                  <MenuItem value="AUTOPSY_SUITE_TRANSFER">Autopsy Pathology Transfer</MenuItem>
                  <MenuItem value="VIEWING_ROOM_HANDOVER">Dignity Viewing Room</MenuItem>
                  <MenuItem value="RELEASE_TO_FAMILY">Release / Funeral Handover</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650 }}>
                  Showing {filteredCustody.length} custody entries
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: TEAL, '& .MuiTableCell-head': { color: '#ffffff !important', fontWeight: 800 } }}>
                <TableRow>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '10%' }}>Handover ID</TableCell>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '18%' }}>Deceased Particulars</TableCell>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '14%' }}>Custody Event</TableCell>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '13%' }}>Origin</TableCell>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '15%' }}>Destination Unit</TableCell>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '14%' }}>Authorizing Mortician</TableCell>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', py: 1.2, width: '16%' }}>Timestamp & Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustody.map((c) => {
                  const matchingAdm = admissions.find(a => a.mrn === c.mrn || a.id === c.mrn);
                  const displayName = c.name || matchingAdm?.name || 'Deceased Patient';

                  return (
                    <TableRow key={c.id} hover sx={{ '& td': { py: 1.1, px: 1 } }}>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem' }}>{c.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{displayName}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                          MRN: {c.mrn}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={c.event ? c.event.replace(/_/g, ' ') : 'Transfer'}
                          size="small"
                          color={
                            c.event === 'RELEASE_TO_FAMILY' ? 'success' :
                            c.event === 'AUTOPSY_SUITE_TRANSFER' ? 'secondary' :
                            c.event === 'INITIAL_ADMISSION' ? 'primary' : 'default'
                          }
                          variant="outlined"
                          sx={{ fontWeight: 750, fontSize: '0.68rem', height: 22 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{c.origin}</TableCell>
                      <TableCell sx={{ fontWeight: 750, color: PURPLE, fontSize: '0.78rem' }}>{c.destination}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 650, fontSize: '0.78rem' }}>{c.personnel}</Typography>
                        {c.recipient && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                            To: {c.recipient}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'text.primary', fontSize: '0.72rem' }}>
                          {c.timestamp}
                        </Typography>
                        {c.notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.7rem', display: 'block' }}>
                            {c.notes}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredCustody.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No custody handover transfers found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Box>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 27.3: Autopsy & Releases
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab3 = () => {
    const totalAutopsies = autopsies.length;
    const completedAutopsies = autopsies.filter(a => a.status === 'COMPLETED').length;
    const scheduledAutopsies = autopsies.filter(a => a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS').length;
    const coronerAutopsies = autopsies.filter(a => a.type === 'CORONER' || a.medicoLegalStatus === 'CORONER_CASE').length;

    const filteredAutopsies = autopsies.filter(a => {
      const q = autopsySearch.toLowerCase();
      const matchSearch = !q ||
        (a.id && a.id.toLowerCase().includes(q)) ||
        (a.mrn && a.mrn.toLowerCase().includes(q)) ||
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.pathologist && a.pathologist.toLowerCase().includes(q)) ||
        (a.causeOfDeath && a.causeOfDeath.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (autopsyFilter === 'COMPLETED') return a.status === 'COMPLETED';
      if (autopsyFilter === 'SCHEDULED') return a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS';
      if (autopsyFilter === 'CORONER') return a.type === 'CORONER' || a.medicoLegalStatus === 'CORONER_CASE';
      return true;
    });

    return (
      <Box>
        <Tabs value={subTab2} onChange={(_, v) => setSubTab2(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
          {['Autopsy Postmortem schedules', 'Dignity Viewing & Embalming'].map((t, i) => (
            <Tab key={t} label={t} sx={{ fontWeight: subTab2 === i ? 800 : 500, textTransform: 'none' }} />
          ))}
        </Tabs>

        {/* ── 27.3.1 Autopsies ── */}
        <TabPanel value={subTab2} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Clinical & Medico-Legal Autopsies (FR-MOR-101–110)</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                Coroner forensic investigations, clinical pathology postmortems, certified findings reports, and cause-of-death audits.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                disabled={isSyncingPathology}
                startIcon={isSyncingPathology ? <CircularProgress size={16} sx={{ color: PURPLE }} /> : <Refresh />}
                onClick={handleSyncPathologyDesk}
                sx={{
                  textTransform: 'none',
                  fontWeight: 750,
                  fontSize: '0.78rem',
                  borderRadius: 2,
                  borderColor: alpha(PURPLE, 0.3),
                  color: PURPLE,
                  '&:hover': { bgcolor: alpha(PURPLE, 0.04), borderColor: PURPLE },
                }}
              >
                {isSyncingPathology ? 'Syncing...' : 'Sync Pathology Desk'}
              </Button>
              <Button
                variant="contained"
                startIcon={<HistoryEdu />}
                onClick={() => handleOpenAutopsyDialog()}
                sx={{
                  bgcolor: PURPLE,
                  '&:hover': { bgcolor: '#6b21a8' },
                  borderRadius: 2,
                  fontWeight: 800,
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.25)',
                }}
              >
                + Request Autopsy
              </Button>
            </Stack>
          </Box>

          {/* Search & Quick Filter Toolbar */}
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, borderRadius: 2, bgcolor: alpha(PRIMARY, 0.015) }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={6} md={5}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search MRN, deceased patient name, pathologist, or findings..."
                  value={autopsySearch}
                  onChange={(e) => setAutopsySearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'text.secondary', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={7}>
                <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                  <Chip
                    label={`All Autopsies (${totalAutopsies})`}
                    onClick={() => setAutopsyFilter('ALL')}
                    color={autopsyFilter === 'ALL' ? 'primary' : 'default'}
                    variant={autopsyFilter === 'ALL' ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 750, fontSize: '0.72rem', cursor: 'pointer' }}
                  />
                  <Chip
                    label={`Completed & Certified (${completedAutopsies})`}
                    onClick={() => setAutopsyFilter('COMPLETED')}
                    color={autopsyFilter === 'COMPLETED' ? 'success' : 'default'}
                    variant={autopsyFilter === 'COMPLETED' ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 750, fontSize: '0.72rem', cursor: 'pointer' }}
                  />
                  <Chip
                    label={`Scheduled (${scheduledAutopsies})`}
                    onClick={() => setAutopsyFilter('SCHEDULED')}
                    color={autopsyFilter === 'SCHEDULED' ? 'warning' : 'default'}
                    variant={autopsyFilter === 'SCHEDULED' ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 750, fontSize: '0.72rem', cursor: 'pointer' }}
                  />
                  <Chip
                    label={`Coroner Cases (${coronerAutopsies})`}
                    onClick={() => setAutopsyFilter('CORONER')}
                    color={autopsyFilter === 'CORONER' ? 'error' : 'default'}
                    variant={autopsyFilter === 'CORONER' ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 750, fontSize: '0.72rem', cursor: 'pointer' }}
                  />
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {/* Autopsies Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 18px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: PURPLE, '& .MuiTableCell-head': { color: '#ffffff !important', fontWeight: 800 } }}>
                <TableRow>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', width: '13%' }}>Autopsy ID / Type</TableCell>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', width: '22%' }}>Deceased Patient Record</TableCell>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', width: '18%' }}>Assigned Pathologist</TableCell>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', width: '13%' }}>Exam Date & Time</TableCell>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', width: '10%' }}>Status</TableCell>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', width: '14%' }}>Cause of Death & Findings</TableCell>
                  <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem', width: '10%', textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAutopsies.map(au => {
                  const isCoroner = au.type === 'CORONER' || au.medicoLegalStatus === 'CORONER_CASE';
                  const isCompleted = au.status === 'COMPLETED';

                  return (
                    <TableRow key={au.id} hover sx={{ '&:hover': { bgcolor: alpha(PURPLE, 0.02) } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: PRIMARY }}>
                          {au.id}
                        </Typography>
                        <Chip
                          label={isCoroner ? 'Coroner Forensic' : 'Clinical Pathology'}
                          size="small"
                          color={isCoroner ? 'error' : 'secondary'}
                          sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800, mt: 0.4 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: PRIMARY }}>
                          {au.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          MRN: <strong style={{ fontFamily: 'monospace' }}>{au.mrn}</strong> · {au.gender || 'Male'}, {au.age || 50}y
                        </Typography>
                        {au.storageLocation && (
                          <Typography variant="caption" sx={{ color: TEAL, fontWeight: 700, display: 'block' }}>
                            📍 Shelf: {au.storageLocation}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 750, color: SECONDARY }}>
                          {au.pathologist}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Consultant Pathologist & Medical Examiner
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>
                        {au.scheduledTime}
                      </TableCell>
                      <TableCell>
                        <StatusChip label={au.status} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontWeight: 750, color: isCoroner ? DANGER : PRIMARY, display: 'block' }}>
                          {au.causeOfDeath || 'Pending Cause Determination'}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: '0.72rem',
                            lineHeight: 1.3,
                            mt: 0.3
                          }}
                        >
                          {au.findings}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="column" spacing={0.8} alignItems="center">
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              setSelectedAutopsyForModal(au);
                              setAutopsyReportModalOpen(true);
                            }}
                            sx={{
                              bgcolor: PURPLE,
                              '&:hover': { bgcolor: '#6b21a8' },
                              textTransform: 'none',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              py: 0.4,
                              px: 1.2,
                              borderRadius: 1.5,
                              width: '100%'
                            }}
                          >
                            {isCompleted ? 'View Report' : 'Inspect'}
                          </Button>
                          {!isCompleted && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => {
                                setPerformAutopsyTarget(au);
                                setPerformAutopsyDialogOpen(true);
                              }}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                py: 0.3,
                                px: 1,
                                borderRadius: 1.5,
                                width: '100%'
                              }}
                            >
                              Sign-Off
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredAutopsies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No autopsy records found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* ── 27.3.2 Embalming & Dignity Viewing ── */}
        <TabPanel value={subTab2} index={1}>
          <Stack spacing={3}>
            {/* Section A: Embalming & Cosmetic Preparation */}
            <Card sx={{ borderRadius: 2.5, p: 2.5, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MedicalServices sx={{ color: TEAL }} />
                    Arterial Embalming & Body Preparation Protocol (FR-MOR-121–130)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                    Sanitary cavity preservation, arterial chemical fluid perfusion, cosmetic restoration, and dignity shroud certification.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    const adm = admissions.find(a => a.status === 'ADMITTED') || admissions[0];
                    setSelectedMRN(adm?.mrn || '');
                    setSelectedPrepStatus('DRESSED_AND_GROOMED');
                    if (morticians.length > 0) {
                      const primary = morticians[0];
                      setSelectedEmbalmer(`${primary.name} (${primary.designation || 'Mortician'} - ${primary.employeeId || 'MOR'})`);
                    }
                    setEmbalmDialogOpen(true);
                  }}
                  sx={{
                    bgcolor: TEAL,
                    '&:hover': { bgcolor: '#0f766e' },
                    borderRadius: 2,
                    fontWeight: 800,
                    textTransform: 'none',
                    fontSize: '0.8rem',
                  }}
                >
                  + Log Embalming Procedure
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: alpha(TEAL, 0.08) }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Embalming ID</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Deceased Patient Record</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Preservative Chemical Formula</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Operating Embalmer</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Preparation Status</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Verification & Cert</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Completed Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {embalmings.map(emb => (
                      <TableRow key={emb.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: TEAL }}>
                          {emb.id}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={800} color={PRIMARY}>{emb.name}</Typography>
                          <Typography variant="caption" color="text.secondary">MRN: {emb.mrn}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.76rem', fontWeight: 650, color: SECONDARY }}>
                          {emb.preservativeFluid}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', fontWeight: 700 }}>
                          {emb.embalmer}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={emb.bodyPrepStatus === 'DRESSED_AND_GROOMED' ? 'Dressed & Groomed' : (emb.bodyPrepStatus === 'PRESERVED_IN_VAULT' ? 'Preserved in Vault' : emb.bodyPrepStatus)}
                            size="small"
                            color={emb.bodyPrepStatus === 'DRESSED_AND_GROOMED' ? 'success' : 'info'}
                            sx={{ fontWeight: 800, fontSize: '0.66rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Chip label="Shroud ✅" size="small" variant="outlined" color="success" sx={{ fontSize: '0.62rem', height: 20 }} />
                            <Chip label="Cert Issued" size="small" color="primary" sx={{ fontSize: '0.62rem', height: 20 }} />
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>
                          {emb.completedAt}
                        </TableCell>
                      </TableRow>
                    ))}
                    {embalmings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No embalming records registered yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>

            {/* Section B: Dignity Viewing & Committal Visitation */}
            <Card sx={{ borderRadius: 2.5, p: 2.5, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MeetingRoom sx={{ color: PURPLE }} />
                    Family Dignity Viewing & Committal Visitation Schedules (FR-MOR-131–140)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                    Private viewing suite reservations, next-of-kin identification clearance, and religious farewell protocols.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    const adm = admissions.find(a => a.status === 'ADMITTED') || admissions[0];
                    setSelectedMRN(adm?.mrn || '');
                    setViewingDialogOpen(true);
                  }}
                  sx={{
                    bgcolor: PURPLE,
                    '&:hover': { bgcolor: '#6b21a8' },
                    borderRadius: 2,
                    fontWeight: 800,
                    textTransform: 'none',
                    fontSize: '0.8rem',
                  }}
                >
                  + Book Viewing Session
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: alpha(PURPLE, 0.08) }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Booking ID</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Deceased Patient</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Viewing Chamber / Suite</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Family Next of Kin</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Scheduled Window</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Ceremonial Request</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textAlign: 'center' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewings.map(viw => (
                      <TableRow key={viw.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: PURPLE }}>
                          {viw.id}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={800} color={PRIMARY}>{viw.name}</Typography>
                          <Typography variant="caption" color="text.secondary">MRN: {viw.mrn}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', fontWeight: 750, color: SECONDARY }}>
                          {viw.viewingChamber}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.76rem', color: 'text.secondary', fontWeight: 600 }}>
                          {viw.familyContact}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.76rem', fontWeight: 700 }}>
                          {viw.scheduledTime}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>
                          {viw.religiousRequirements}
                        </TableCell>
                        <TableCell>
                          <StatusChip label={viw.status} />
                        </TableCell>
                        <TableCell align="center">
                          {viw.status === 'SCHEDULED' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              onClick={() => handleUpdateViewingStatus(viw.id, 'ACTIVE_VIEWING')}
                              sx={{ textTransform: 'none', fontSize: '0.68rem', fontWeight: 750, borderRadius: 1.5 }}
                            >
                              Start Viewing
                            </Button>
                          )}
                          {viw.status === 'ACTIVE_VIEWING' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleUpdateViewingStatus(viw.id, 'COMPLETED')}
                              sx={{ textTransform: 'none', fontSize: '0.68rem', fontWeight: 750, borderRadius: 1.5 }}
                            >
                              Mark Completed
                            </Button>
                          )}
                          {viw.status === 'COMPLETED' && (
                            <Chip label="Concluded" size="small" color="default" sx={{ fontSize: '0.65rem' }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {viewings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No family viewing sessions scheduled.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Stack>
        </TabPanel>
      </Box>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 27.3.3: Release & Funeral Billing Desk
  // ══════════════════════════════════════════════════════════════════════════
  const renderReleaseBillingTab = () => {
    const admittedBodies = admissions.filter(a => a.status === 'ADMITTED');
    const releasedBodies = admissions.filter(a => a.status === 'RELEASED');

    const filteredAdmitted = admittedBodies.filter(a => {
      const q = releaseSearch.toLowerCase();
      const matchSearch = !q ||
        (a.mrn && a.mrn.toLowerCase().includes(q)) ||
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.storageLocation && a.storageLocation.toLowerCase().includes(q)) ||
        (a.nextOfKin?.name && a.nextOfKin.name.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (releaseFilter === 'READY') return a.certificateIssued || a.autopsyStatus?.toLowerCase().includes('completed');
      if (releaseFilter === 'PENDING_BILLING') return !a.certificateIssued;
      return true;
    });

    const filteredReleased = releasedBodies.filter(a => {
      const q = releaseSearch.toLowerCase();
      return !q ||
        (a.mrn && a.mrn.toLowerCase().includes(q)) ||
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.claimantName && a.claimantName.toLowerCase().includes(q)) ||
        (a.undertaker && a.undertaker.toLowerCase().includes(q));
    });

    return (
      <Box>
        <Tabs
          value={subTabRelease}
          onChange={(_, v) => setSubTabRelease(v)}
          sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}
        >
          {['Deceased Body Release Queue', 'Funeral Vault Billing & Invoices', 'Handover & Clearance Registry'].map((t, i) => (
            <Tab key={t} label={t} sx={{ fontWeight: subTabRelease === i ? 800 : 500, textTransform: 'none' }} />
          ))}
        </Tabs>

        {/* ── Sub-Tab 0: Deceased Body Release Queue ── */}
        <TabPanel value={subTabRelease} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle sx={{ color: SUCCESS }} />
                Deceased Body Release & Custody Handover (FR-MOR-141–150)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                Statutory claimant verification, death certificate clearance, personal effects release, and gate exit passes.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="contained"
                startIcon={<VerifiedUser />}
                onClick={() => {
                  const candidate = admittedBodies[0] || admissions[0];
                  if (candidate) handleOpenReleaseDialog(candidate);
                }}
                disabled={admittedBodies.length === 0}
                sx={{
                  bgcolor: SUCCESS,
                  '&:hover': { bgcolor: '#15803d' },
                  borderRadius: 2,
                  fontWeight: 800,
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)',
                }}
              >
                + Process Handover
              </Button>
            </Stack>
          </Box>

          {/* Statutory Checklist Alert Bar */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2.5, bgcolor: alpha(PRIMARY, 0.02), border: `1px solid ${alpha(PRIMARY, 0.1)}` }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: alpha(SUCCESS, 0.12), color: SUCCESS, width: 36, height: 36 }}>
                    <Verified sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>1. POSITIVE ID TAG</Typography>
                    <Typography variant="body2" fontWeight={800} color={PRIMARY}>Biometric / RFID Check</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: alpha(PURPLE, 0.12), color: PURPLE, width: 36, height: 36 }}>
                    <Biotech sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>2. PATHOLOGY CLEARANCE</Typography>
                    <Typography variant="body2" fontWeight={800} color={PRIMARY}>Autopsy Signed / Waived</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: alpha(TEAL, 0.12), color: TEAL, width: 36, height: 36 }}>
                    <Description sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>3. DEATH CERTIFICATE</Typography>
                    <Typography variant="body2" fontWeight={800} color={PRIMARY}>Registrar Form 11 Issued</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: alpha(WARNING, 0.12), color: WARNING, width: 36, height: 36 }}>
                    <AccountBalanceWallet sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>4. FUNERAL BILLING</Typography>
                    <Typography variant="body2" fontWeight={800} color={PRIMARY}>Vault Fees Cleared</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Search & Filter Toolbar */}
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, borderRadius: 2, bgcolor: alpha(PRIMARY, 0.015) }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={6} md={5}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search MRN, deceased patient name, claimant, or vault bay..."
                  value={releaseSearch}
                  onChange={(e) => setReleaseSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'text.secondary', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={7}>
                <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                  <Chip
                    label={`All Admitted (${admittedBodies.length})`}
                    clickable
                    color={releaseFilter === 'ALL' ? 'primary' : 'default'}
                    onClick={() => setReleaseFilter('ALL')}
                    sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                  />
                  <Chip
                    label="Ready for Release"
                    clickable
                    color={releaseFilter === 'READY' ? 'success' : 'default'}
                    onClick={() => setReleaseFilter('READY')}
                    sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                  />
                  <Chip
                    label="Pending Billing Clearance"
                    clickable
                    color={releaseFilter === 'PENDING_BILLING' ? 'warning' : 'default'}
                    onClick={() => setReleaseFilter('PENDING_BILLING')}
                    sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                  />
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {/* Table of Bodies in Vault Ready for Release */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: alpha(PRIMARY, 0.04) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Tag MRN</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Deceased Patient Record</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Current Vault Tray</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Preservation Duration</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Accrued Charges</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Clearance Checklist</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Next of Kin / Claimant</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textAlign: 'center' }}>Handover Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAdmitted.map(adm => {
                  const days = Math.max(1, Math.ceil((Date.now() - new Date(adm.admittedAt || Date.now()).getTime()) / 86400000));
                  const vaultFee = days * 5000;
                  const hasEmbalm = embalmings.some(e => e.mrn === adm.mrn);
                  const hasViewing = viewings.some(v => v.mrn === adm.mrn);
                  const totalAccrued = vaultFee + (hasEmbalm ? 35000 : 0) + (hasViewing ? 15000 : 0) + 10000;

                  return (
                    <TableRow key={adm.id || adm.mrn} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: PRIMARY }}>
                        {adm.mrn}
                        {adm.medicoLegalStatus === 'CORONER_CASE' && (
                          <Chip label="Coroner" size="small" color="error" sx={{ ml: 0.5, fontSize: '0.6rem', height: 18, fontWeight: 700 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={800} color={PRIMARY}>{adm.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {adm.gender || 'Male'}, {adm.age || 50}y · DOD/Intake: {adm.admittedAt || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<SevereCold sx={{ fontSize: 13 }} />}
                          label={adm.storageLocation || 'Cold Vault'}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: alpha(TEAL, 0.1), color: TEAL }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 700, color: SECONDARY }}>
                        {days} Day(s)
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={800} sx={{ color: PURPLE }}>
                          ₦{totalAccrued.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ₦5,000/day + Care
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Chip label="✅ Tag ID Verified" size="small" color="success" variant="outlined" sx={{ fontSize: '0.62rem', height: 18, fontWeight: 700 }} />
                          <Chip
                            label={adm.autopsyStatus?.toLowerCase().includes('completed') ? '✅ Autopsy Cleared' : '⏳ Postmortem / Waived'}
                            size="small"
                            color={adm.autopsyStatus?.toLowerCase().includes('completed') ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ fontSize: '0.62rem', height: 18, fontWeight: 700 }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{adm.nextOfKin?.name || 'Awaiting Claimant'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {adm.nextOfKin?.relationship || 'NOK'} · {adm.nextOfKin?.phone || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => handleOpenReleaseDialog(adm)}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            borderRadius: 1.5,
                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                          }}
                        >
                          Release Handover
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredAdmitted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      <CheckCircle sx={{ fontSize: 36, color: alpha(SUCCESS, 0.4), mb: 1, display: 'block', mx: 'auto' }} />
                      No admitted bodies pending release.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* ── Sub-Tab 1: Funeral Vault Billing & Invoices ── */}
        <TabPanel value={subTabRelease} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Receipt sx={{ color: PRIMARY }} />
                Funeral Care Invoicing & Vault Fee Audits (FR-MOR-151–160)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                Daily refrigeration tariffs (₦5,000/day), arterial fluid embalming, dignity chapel suites, and cashier clearances.
              </Typography>
            </Box>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: alpha(PRIMARY, 0.04) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>MRN / Patient</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Preservation Days</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Embalming Protocol</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Viewing Suite</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Sanitary Shroud</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Total Accrued (₦)</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Cashier Settlement</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textAlign: 'center' }}>Billing Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {admissions.map(adm => {
                  const days = Math.max(1, Math.ceil((Date.now() - new Date(adm.admittedAt || Date.now()).getTime()) / 86400000));
                  const vaultFee = days * 5000;
                  const emb = embalmings.find(e => e.mrn === adm.mrn);
                  const embFee = emb ? 35000 : 0;
                  const viw = viewings.find(v => v.mrn === adm.mrn);
                  const viwFee = viw ? 15000 : 0;
                  const shroudFee = 10000;
                  const total = vaultFee + embFee + viwFee + shroudFee;

                  return (
                    <TableRow key={adm.id || adm.mrn} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={800} color={PRIMARY}>{adm.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{adm.mrn}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>₦{vaultFee.toLocaleString()}</Typography>
                        <Typography variant="caption" color="text.secondary">{days} day(s) @ ₦5,000</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>₦{embFee.toLocaleString()}</Typography>
                        <Typography variant="caption" color="text.secondary">{emb ? 'Arterial Formalin' : 'None'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>₦{viwFee.toLocaleString()}</Typography>
                        <Typography variant="caption" color="text.secondary">{viw ? viw.viewingChamber : 'Not Booked'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>₦{shroudFee.toLocaleString()}</Typography>
                        <Typography variant="caption" color="text.secondary">Grooming & Shroud</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={900} sx={{ color: PURPLE }}>
                          ₦{total.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={adm.status === 'RELEASED' ? 'SETTLED AT CASHIER' : 'READY TO INVOICE'}
                          size="small"
                          color={adm.status === 'RELEASED' ? 'success' : 'primary'}
                          sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Send sx={{ fontSize: 13 }} />}
                            onClick={() => handleBillToCashier(adm)}
                            sx={{ textTransform: 'none', fontSize: '0.68rem', fontWeight: 750, borderRadius: 1.5 }}
                          >
                            Bill Cashier
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Print sx={{ fontSize: 13 }} />}
                            onClick={() => handlePrintFuneralInvoice(adm)}
                            sx={{ textTransform: 'none', fontSize: '0.68rem', fontWeight: 750, borderRadius: 1.5 }}
                          >
                            Print Bill
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* ── Sub-Tab 2: Handover & Clearance Registry (Archive) ── */}
        <TabPanel value={subTabRelease} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FactCheck sx={{ color: TEAL }} />
                Handed Over & Dispatched Registry Archive
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                Historical log of all deceased bodies officially released from Faith Foundation Mortuary.
              </Typography>
            </Box>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: alpha(TEAL, 0.08) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Tag MRN</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Deceased Patient</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Release Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Verified Claimant & NIN</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Relationship</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Receiving Funeral Transport</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Handover Officer</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textAlign: 'center' }}>Official Gate Pass</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReleased.map(adm => (
                  <TableRow key={adm.id || adm.mrn} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: PRIMARY }}>
                      {adm.mrn}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={800} color={PRIMARY}>{adm.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {adm.gender}, {adm.age}y · COD: {adm.causeOfDeath}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 700, color: SECONDARY }}>
                      {adm.releasedAt || '2026-06-29 14:20'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={750}>{adm.claimantName || adm.nextOfKin?.name || 'Verified Claimant'}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        NIN: {adm.claimantNid || 'NIN-3891001'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
                      {adm.relationship || adm.nextOfKin?.relationship || 'Next of Kin'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>
                      {adm.undertaker || 'Authorized Funeral Parlour'} [{adm.hearseNumber || 'Hearse Bay'}]
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.76rem', fontWeight: 600, color: PRIMARY }}>
                      {adm.handoverOfficer || 'Mortuary Officer Caleb'}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Print />}
                        onClick={() => handlePrintReleasePass(adm)}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.7rem',
                          fontWeight: 750,
                          borderRadius: 1.5,
                          borderColor: TEAL,
                          color: TEAL,
                          '&:hover': { bgcolor: alpha(TEAL, 0.06), borderColor: TEAL },
                        }}
                      >
                        Print Gate Pass
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredReleased.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No bodies released in the historical archive yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Box>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 27.4: Governance & compliance
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab4 = () => (
    <Box>
      <Tabs value={subTab3} onChange={(_, v) => setSubTab3(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['CAPA Compliance actions', 'Mortuary Capacity analytics'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab3 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 27.4.1 CAPA ── */}
      <TabPanel value={subTab3} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Mortuary Risk Registers & CAPA Plans (FR-MOR-161–170)</Typography>
          <Button variant="contained" color="warning" onClick={() => setCapaDialogOpen(true)}>Record CAPA Plan</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: WARNING, '& .MuiTableCell-head': { color: '#ffffff !important', fontWeight: 800 } }}>
              <TableRow>{['CAPA ID', 'Target Unit / cabinet', 'Environmental Discrepancy', 'Corrective Action Plan', 'Deadline Target', 'Status'].map(h => <TableCell key={h} sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {capa.map(cp => (
                <TableRow key={cp.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{cp.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{cp.targetUnit}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{cp.discrepancy}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{cp.correctiveAction}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{cp.deadline}</TableCell>
                  <TableCell><StatusChip label={cp.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 27.4.2 BI Analytics ── */}
      <TabPanel value={subTab3} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>Intake Status Split (BI Analytics)</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={analytics.distributionByStatus || []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                    {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2, borderLeft: `4px solid ${PRIMARY}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Regulatory Compliance Summary</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Every deceased body is verified with positive identification tags before final release closure.
              </Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Police investigation hold checkups:</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS }}>Enabled</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Average storage duration rate:</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>3.2 days</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Audit trial integrity checksum:</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS }}>100% Secure</Typography></Stack>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );

  const location = useLocation();
  const navigate = useNavigate();

  const TAB_PATHS = [
    '/mortuary/ingestion',
    '/mortuary/vaults',
    '/mortuary/autopsy',
    '/mortuary/release',
    '/mortuary/governance',
  ];

  const handleTabChange = (_: any, newTab: number) => {
    setActiveTab(newTab);
    navigate(TAB_PATHS[newTab]);
  };

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/mortuary/vaults') setActiveTab(1);
    else if (path === '/mortuary/autopsy') setActiveTab(2);
    else if (path === '/mortuary/release') setActiveTab(3);
    else if (path === '/mortuary/governance') setActiveTab(4);
    else setActiveTab(0);

    fetchData();
  }, [location.pathname, fetchData]);

  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/mortuary/vaults') {
      return {
        title: 'Cold Vault Refrigeration Cabinets & Chain of Custody Logs',
        subtitle: 'Environmental Cold Vault Sensors · Temperature Alarms · Vault Bed Census',
        category: 'Mortuary & Funeral',
        kpis: [
          { label: 'Vault Occupancy', value: `${analytics.occupancyPercentage || 0}%`, subtitle: 'Trays Occupied', icon: <SevereCold />, color: TEAL },
          { label: 'Active Vault Freezers', value: '8 Vaults', subtitle: 'Refrigerated Units', icon: <Dns />, color: PRIMARY },
          { label: 'Temp Alarms', value: `${analytics.alertExcursionCount || 0} Alerts`, subtitle: 'Sensor Excursions', icon: <Warning />, color: DANGER },
          { label: 'Custody Handovers', value: '100% Verified', subtitle: 'Chain of Custody', icon: <CheckCircle />, color: SUCCESS },
        ],
      };
    }

    if (path === '/mortuary/autopsy') {
      const loggedCount = autopsies.filter(a => a.status === 'COMPLETED').length;
      const totalCount = autopsies.length;
      return {
        title: 'Mortuary Autopsy & Pathological Postmortem Examination Desk',
        subtitle: 'Coroner Postmortems · Forensic Autopsy Reports · Cause of Death Audit',
        category: 'Mortuary & Funeral',
        kpis: [
          { label: 'Autopsies Logged', value: `${totalCount || 4} Cases`, subtitle: 'Postmortems Done', icon: <HistoryEdu />, color: PURPLE },
          { label: 'Coroner Cases', value: '1 Active', subtitle: 'Police Medico-Legal', icon: <Policy />, color: DANGER },
          { label: 'Autopsy Reports Signed', value: totalCount > 0 ? `${Math.round((loggedCount / totalCount) * 100)}%` : '100%', subtitle: 'Pathology Sign-Off', icon: <CheckCircle />, color: SUCCESS },
          { label: 'Avg Autopsy TAT', value: '24 Hours', subtitle: 'Intake to Report', icon: <Assessment />, color: TEAL },
        ],
      };
    }

    if (path === '/mortuary/release') {
      const releasedCount = admissions.filter(a => a.status === 'RELEASED').length;
      return {
        title: 'Deceased Body Release, Funeral Billing & Certificate Audit',
        subtitle: 'Death Certificate Verification · Funeral Parlour Handovers · Vault Fee Billing',
        category: 'Mortuary & Funeral',
        kpis: [
          { label: 'Bodies Released', value: `${releasedCount || 1} Released`, subtitle: 'Family Handovers', icon: <CheckCircle />, color: SUCCESS },
          { label: 'Funeral Billing', value: '100% Settled', subtitle: 'Vault Storage Fees', icon: <LocalActivity />, color: PRIMARY },
          { label: 'Death Certificates', value: `${admissions.length} Certified`, subtitle: 'Registrar Audits', icon: <Verified />, color: TEAL },
          { label: 'Next-of-Kin Verifications', value: '100%', subtitle: 'Biometric/NIN Check', icon: <Security />, color: PURPLE },
        ],
      };
    }

    // Default: Ingestion
    return {
      title: 'Deceased Ingestion & Medico-Legal Intake Log',
      subtitle: 'Body Ingestion Tagging · Medico-Legal Status · Biometric Identification Tags',
      category: 'Mortuary & Funeral',
      kpis: [
        { label: 'Total Admissions', value: `${analytics.totalBodies || 0} Bodies`, subtitle: 'Intake Logged', icon: <LocalActivity />, color: PRIMARY },
        { label: 'Cabinet Occupancy', value: `${analytics.occupancyPercentage || 0}%`, subtitle: 'Trays Occupied', icon: <SevereCold />, color: TEAL },
        { label: 'Temp Alerts', value: `${analytics.alertExcursionCount || 0} Warnings`, subtitle: 'Refrigeration', icon: <Warning />, color: DANGER },
        { label: 'CAPA Audits', value: `${capa.length} Audits`, subtitle: 'Quality Control', icon: <Security />, color: WARNING },
      ],
    };
  };

  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
      {/* Banner */}
      <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 50%, ${TEAL} 100%)`, color: '#fff', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 }, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={{ xs: 1.5, sm: 0 }}>
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Mortuary &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              ⚰️ {pageDetails.title}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.88, fontWeight: 500, display: 'block', mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Tooltip title="Refresh mortuary logs"><IconButton onClick={fetchData} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}><Refresh /></IconButton></Tooltip>
            <Button variant="contained" color="secondary" startIcon={<PersonAdd />} onClick={() => setOpenExternalModal(true)} sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }}}>
              Walk-in Client
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* External Registration Modal */}
      <QuickExternalRegisterModal 
        open={openExternalModal} 
        onClose={() => setOpenExternalModal(false)} 
        serviceType="MORTUARY_ONLY"
        onSuccess={fetchData}
      />
      {/* KPIStrip */}
      <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, mb: 3 }}>
        <Grid container spacing={2}>
          {pageDetails.kpis.map((kpi, idx) => (
            <Grid item xs={6} md={3} key={idx}>
              <KPICard title={kpi.label} value={kpi.value} sub={kpi.subtitle} icon={kpi.icon} color={kpi.color} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        <Tabs value={activeTab} onChange={handleTabChange}
          sx={{ mb: 3, bgcolor: '#fff', borderRadius: 3, px: 1, py: 0.5, boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48, fontSize: '0.88rem' },
            '& .Mui-selected': { fontWeight: 800, color: `${PURPLE} !important` },
            '& .MuiTabs-indicator': { bgcolor: PURPLE, height: 3, borderRadius: 2 } }}>
          <Tab icon={<LocalActivity />} iconPosition="start" label="Admissions & Tagging" />
          <Tab icon={<SevereCold />} iconPosition="start" label="Cabinets & Custody Logs" />
          <Tab icon={<Biotech />} iconPosition="start" label="Autopsies & Embalming" />
          <Tab icon={<Receipt />} iconPosition="start" label="Release & Funeral Billing" />
          <Tab icon={<Security />} iconPosition="start" label="Governance Compliance BI" />
        </Tabs>

        <Card sx={{ borderRadius: 3, p: { xs: 1.5, sm: 2, md: 3 }, boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>
          {activeTab === 0 && renderTab1()}
          {activeTab === 1 && renderTab2()}
          {activeTab === 2 && renderTab3()}
          {activeTab === 3 && renderReleaseBillingTab()}
          {activeTab === 4 && renderTab4()}
        </Card>
      </Box>

      {/* Modals */}

      {/* Admit Body Dialog */}
      <Dialog open={admitDialogOpen} onClose={() => setAdmitDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <form onSubmit={handleAdmitBody}>
          <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: alpha(PRIMARY, 0.1), color: PRIMARY }}>
                <SevereCold />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={900}>Deceased Body Admissions (Intake)</Typography>
                <Typography variant="caption" color="text.secondary">
                  Admit deceased hospital patients (IPD/OPD) or external brought-in-dead cases into cold vault storage
                </Typography>
              </Box>
            </Box>
            <Chip
              label={
                admissionSource === 'HOSPITAL_PATIENT'
                  ? 'In-Hospital Ward Transfer'
                  : (admissionSource === 'OUTSIDE_DEATH' ? 'Brought-in-Dead (Outside Death)' : 'External / Walk-in')
              }
              color={admissionSource === 'HOSPITAL_PATIENT' ? 'primary' : (admissionSource === 'OUTSIDE_DEATH' ? 'secondary' : 'default')}
              size="small"
              sx={{ fontWeight: 800, fontSize: '0.7rem' }}
            />
          </DialogTitle>

          <DialogContent dividers sx={{ py: 2.5 }}>
            <Grid container spacing={2}>
              {/* Admission Source Selector */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, bgcolor: alpha(PRIMARY, 0.03), borderColor: alpha(PRIMARY, 0.15) }}>
                  <FormControl component="fieldset" fullWidth>
                    <FormLabel component="legend" sx={{ fontSize: '0.78rem', fontWeight: 800, color: PRIMARY, mb: 0.5 }}>
                      Deceased Intake Origin / Admission Source
                    </FormLabel>
                    <RadioGroup
                      row
                      value={admissionSource}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setAdmissionSource(val);
                        if (val === 'EXTERNAL_INTAKE') {
                          setSelectedQueuePatientId('');
                          setFormName('');
                          setFormCertifyingClinician('Dr. Okafor');
                          setFormCauseOfDeath('');
                          setFormMedicoLegalStatus('NONE');
                          setFormIdentifyingFeatures('Brought-in-Dead (External Walk-in / Direct Intake)');
                          setFormNokName('');
                          setFormNokRelationship('');
                          setFormNokPhone('');
                          setFormPatientId(null);
                          setFormDeceasedQueueId(null);
                        } else if (val === 'OUTSIDE_DEATH') {
                          setSelectedQueuePatientId('');
                          setFormName('');
                          setFormCertifyingClinician('Dr. Triage Admin / Examining Medical Officer');
                          setFormCauseOfDeath('Brought-in-Dead (BID) — Sudden Collapse / Cardiorespiratory Arrest');
                          setFormMedicoLegalStatus('CORONER_CASE');
                          setFormIdentifyingFeatures('Brought-in-Dead (Died Outside Hospital / Home / Transit)');
                          setFormNokName('');
                          setFormNokRelationship('');
                          setFormNokPhone('');
                          setFormPatientId(null);
                          setFormDeceasedQueueId(null);
                        } else {
                          const firstPending = deceasedQueue.find(q => q.status !== 'ADMITTED');
                          if (firstPending) {
                            handleSelectPatientOption(firstPending);
                          }
                        }
                      }}
                    >
                      <FormControlLabel
                        value="HOSPITAL_PATIENT"
                        control={<Radio size="small" />}
                        label={
                          <Typography variant="body2" fontWeight={700}>
                            🏥 Inpatient / OPD Ward Transfer (In-Hospital Death)
                          </Typography>
                        }
                      />
                      <FormControlLabel
                        value="OUTSIDE_DEATH"
                        control={<Radio size="small" />}
                        label={
                          <Typography variant="body2" fontWeight={700}>
                            🏠 Registered Patient Died Outside (Brought-in-Dead / Home / Transit)
                          </Typography>
                        }
                      />
                      <FormControlLabel
                        value="EXTERNAL_INTAKE"
                        control={<Radio size="small" />}
                        label={
                          <Typography variant="body2" fontWeight={700}>
                            🚶 Unregistered External (Walk-in / Police / Unregistered Deceased)
                          </Typography>
                        }
                      />
                    </RadioGroup>
                  </FormControl>
                </Paper>
              </Grid>

              {/* Informational Guidance for Outside Deaths */}
              {admissionSource === 'OUTSIDE_DEATH' && (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.8rem', py: 0.5, bgcolor: alpha('#0284c7', 0.08), borderColor: alpha('#0284c7', 0.3) }}>
                    <strong>Registered Patient Died Outside Hospital (Brought-in-Dead):</strong> Search by patient name, MRN, or phone number below. Selecting the patient will automatically retrieve their registered identity, medical background, and emergency next-of-kin contacts.
                  </Alert>
                </Grid>
              )}

              {/* Searchable Autocomplete Patient Selector for Registered Cases */}
              {admissionSource !== 'EXTERNAL_INTAKE' && (
                <Grid item xs={12}>
                  <Autocomplete
                    fullWidth
                    size="small"
                    options={patientSearchOptions}
                    groupBy={(option: any) => option.category}
                    getOptionLabel={(option: any) => option.label || option.name || ''}
                    value={selectedPatientObj}
                    onChange={(_, newValue: any) => handleSelectPatientOption(newValue)}
                    filterOptions={(options, state) => {
                      const q = state.inputValue.toLowerCase().trim();
                      if (!q) return options;
                      return options.filter((opt: any) => {
                        const name = (opt.name || opt.label || '').toLowerCase();
                        const mrn = (opt.patientNumber || opt.mrn || opt.id || '').toLowerCase();
                        const phone = (opt.phone || opt.telecoms?.[0]?.value || opt.nokPhone || '').toLowerCase();
                        return name.includes(q) || mrn.includes(q) || phone.includes(q);
                      });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={
                          admissionSource === 'OUTSIDE_DEATH'
                            ? "🔍 Search Registered Patient Who Died Outside *"
                            : "🔍 Search Hospital Deceased Patient Record *"
                        }
                        placeholder="Type to search by patient name, MRN, or phone number..."
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <InputAdornment position="start">
                                <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </>
                          )
                        }}
                        helperText={
                          admissionSource === 'OUTSIDE_DEATH'
                            ? "Type name, MRN, or phone to locate any registered patient who died at home or outside the facility"
                            : "Type name or MRN to locate transferred in-hospital deceased patients or registered patients"
                        }
                      />
                    )}
                    renderOption={(props, option: any) => (
                      <Box component="li" {...props} key={option.id || option.patientNumber}>
                        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ width: '100%', py: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(PRIMARY, 0.1), color: PRIMARY, fontSize: '0.8rem', fontWeight: 800 }}>
                              {(option.name || option.label || '?').replace(/^Late\s+/i, '').substring(0, 1)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={700}>
                                {option.name || option.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                MRN: {option.patientNumber || option.mrn || option.patientId || option.id?.substring(0, 8)}
                                {option.gender ? ` · ${option.gender}` : ''}
                                {option.estimatedAge || option.age ? `, Age ${option.estimatedAge || option.age}` : ''}
                                {option.phone || option.telecoms?.[0]?.value ? ` · 📞 ${option.phone || option.telecoms?.[0]?.value}` : ''}
                              </Typography>
                            </Box>
                          </Box>
                          {option.isQueueItem ? (
                            <Chip
                              label={option.status === 'ADMITTED' ? 'Already Admitted' : `Transferred (${option.source || 'Ward'})`}
                              color={option.status === 'ADMITTED' ? 'default' : 'warning'}
                              size="small"
                              sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                            />
                          ) : (
                            <Chip
                              label={admissionSource === 'OUTSIDE_DEATH' ? 'Died Outside' : 'Registered Patient'}
                              color={admissionSource === 'OUTSIDE_DEATH' ? 'secondary' : 'info'}
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                            />
                          )}
                        </Stack>
                      </Box>
                    )}
                  />
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Deceased Name / Alias *"
                  name="name"
                  size="small"
                  fullWidth
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Alhaji Ibrahim Musa"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Medico-Legal Status *"
                  name="medicoLegalStatus"
                  size="small"
                  fullWidth
                  value={formMedicoLegalStatus}
                  onChange={(e) => setFormMedicoLegalStatus(e.target.value)}
                >
                  <MenuItem value="NONE">None (Clinical Death)</MenuItem>
                  <MenuItem value="CORONER_CASE">Coroner Case</MenuItem>
                  <MenuItem value="POLICE_CASE">Police Forensic Case</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Certifying Clinician *"
                  name="certifyingClinician"
                  size="small"
                  fullWidth
                  required
                  value={formCertifyingClinician}
                  onChange={(e) => setFormCertifyingClinician(e.target.value)}
                  placeholder="e.g. Dr. Aisha Bello"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Cause of Death *"
                  name="causeOfDeath"
                  size="small"
                  fullWidth
                  required
                  value={formCauseOfDeath}
                  onChange={(e) => setFormCauseOfDeath(e.target.value)}
                  placeholder="e.g. Cardiorespiratory failure"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Distinguishing Physical Characteristics / Origin Ward"
                  name="identifyingFeatures"
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  value={formIdentifyingFeatures}
                  onChange={(e) => setFormIdentifyingFeatures(e.target.value)}
                  placeholder="State ward origin, bed number, scars, tattoos, prostheses..."
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 0.5 }}>
                  <Chip label="Next of Kin contact details" size="small" sx={{ fontWeight: 700 }} />
                </Divider>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="NOK Full Name"
                  name="nokName"
                  size="small"
                  fullWidth
                  value={formNokName}
                  onChange={(e) => setFormNokName(e.target.value)}
                  placeholder="e.g. Mustapha Aliyu"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="NOK Relationship"
                  name="nokRelationship"
                  size="small"
                  fullWidth
                  value={formNokRelationship}
                  onChange={(e) => setFormNokRelationship(e.target.value)}
                  placeholder="e.g. Spouse / Brother"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="NOK Phone"
                  name="nokPhone"
                  size="small"
                  fullWidth
                  value={formNokPhone}
                  onChange={(e) => setFormNokPhone(e.target.value)}
                  placeholder="e.g. +234 803 555 1290"
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 0.5 }}>
                  <Chip label="Refrigeration compartment assignment" size="small" sx={{ fontWeight: 700 }} />
                </Divider>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  label="Cabinet Tray Storage Location *"
                  name="storageLocation"
                  size="small"
                  fullWidth
                  required
                  value={formStorageLocation}
                  onChange={(e) => setFormStorageLocation(e.target.value)}
                >
                  {storage.map((s) => (
                    <MenuItem key={s.code} value={s.code} disabled={s.occupied}>
                      {s.code} {s.occupied ? '🔴 (Occupied)' : '🟢 (Vacant — Available)'}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 0.5 }}>
                  <Chip label="Personal Belongings & Custody Safe (Optional at Admission)" size="small" sx={{ fontWeight: 700, bgcolor: alpha(TEAL, 0.1), color: TEAL }} />
                </Divider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Initial Belonging Item / Effects"
                  size="small"
                  fullWidth
                  value={formInitialBelonging}
                  onChange={(e) => setFormInitialBelonging(e.target.value)}
                  placeholder="e.g. Gold wedding ring, wristwatch, wallet"
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField
                  label="Qty"
                  type="number"
                  size="small"
                  fullWidth
                  value={formInitialBelongingQty}
                  onChange={(e) => setFormInitialBelongingQty(Math.max(1, parseInt(e.target.value) || 1))}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField
                  select
                  label="Storage Locker / Safe"
                  size="small"
                  fullWidth
                  value={formStorageLocker}
                  onChange={(e) => setFormStorageLocker(e.target.value)}
                >
                  {['Locker A-01', 'Locker A-02', 'Locker B-01', 'Locker B-02', 'Valuables Safe Vault #1', 'Valuables Safe Vault #2'].map((loc) => (
                    <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setAdmitDialogOpen(false)} sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 800, bgcolor: PRIMARY }}>
              Register Admission
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Log Personal Belongings Dialog */}
      <Dialog open={belongingDialogOpen} onClose={() => setBelongingDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveBelonging}>
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: PRIMARY }}>
            <Inventory sx={{ color: TEAL }} />
            Chain of Custody — Log Personal Belongings & Effects
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  label="Select Admitted Deceased MRN & Name *"
                  size="small"
                  fullWidth
                  required
                  value={belongingTargetMRN}
                  onChange={(e) => setBelongingTargetMRN(e.target.value)}
                  helperText="Select the deceased patient record this belonging belongs to"
                >
                  {admissions.map((adm) => (
                    <MenuItem key={adm.mrn || adm.id} value={adm.mrn}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                        <Typography variant="body2" fontWeight={700}>{adm.name}</Typography>
                        <Typography variant="caption" color="text.secondary" fontFamily="monospace">({adm.mrn})</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={8}>
                <TextField
                  label="Belonging Item Description *"
                  size="small"
                  fullWidth
                  required
                  value={belongingDesc}
                  onChange={(e) => setBelongingDesc(e.target.value)}
                  placeholder="e.g. Gold wedding ring, Wristwatch, Leather wallet, Phone, Suitcase"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Quantity Count *"
                  type="number"
                  size="small"
                  fullWidth
                  required
                  value={belongingQty}
                  onChange={(e) => setBelongingQty(Math.max(1, parseInt(e.target.value) || 1))}
                  inputProps={{ min: 1 }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Storage Locker / Custody Safe *"
                  size="small"
                  fullWidth
                  required
                  value={belongingLocker}
                  onChange={(e) => setBelongingLocker(e.target.value)}
                >
                  {['Locker A-01', 'Locker A-02', 'Locker B-01', 'Locker B-02', 'Valuables Safe Vault #1', 'Valuables Safe Vault #2', 'Evidence Storage Safe #4'].map((loc) => (
                    <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Custody Status *"
                  size="small"
                  fullWidth
                  required
                  value={belongingStatus}
                  onChange={(e) => setBelongingStatus(e.target.value)}
                >
                  <MenuItem value="SECURED">🔒 SECURED (Locked in Safe)</MenuItem>
                  <MenuItem value="SEALED_EVIDENCE">🛡️ SEALED_EVIDENCE (Police / Coroner)</MenuItem>
                  <MenuItem value="RELEASED_TO_NOK">✅ RELEASED_TO_NOK (Handed over)</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Custody / Verification Notes & Handed Over By"
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  value={belongingNotes}
                  onChange={(e) => setBelongingNotes(e.target.value)}
                  placeholder="e.g. Handed over from Ward Nurse. Checked for gold hallmark. Sealed in tamper-evident bag #882."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setBelongingDialogOpen(false)} sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 800, bgcolor: TEAL, '&:hover': { bgcolor: '#0f766e' } }}>
              Save to Custody Safe
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Log Chain of Custody Handover Dialog */}
      <Dialog open={custodyDialogOpen} onClose={() => setCustodyDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveCustodyTransfer}>
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: PRIMARY }}>
            <HistoryEdu sx={{ color: TEAL }} />
            Log Chain of Custody Handover & Transfer
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  label="Select Admitted Deceased MRN & Name *"
                  size="small"
                  fullWidth
                  required
                  value={custodyTargetMRN}
                  onChange={(e) => {
                    const chosenMRN = e.target.value;
                    setCustodyTargetMRN(chosenMRN);
                    const matching = admissions.find(a => a.mrn === chosenMRN);
                    if (matching?.storageLocation) {
                      setCustodyOrigin(matching.storageLocation);
                    }
                  }}
                  helperText="Select the deceased patient record undergoing custody handover"
                >
                  {admissions.map((adm) => (
                    <MenuItem key={adm.mrn || adm.id} value={adm.mrn}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                        <Typography variant="body2" fontWeight={700}>{adm.name}</Typography>
                        <Typography variant="caption" color="text.secondary" fontFamily="monospace">({adm.mrn} · {adm.storageLocation || 'Vault'})</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Custody Event Type *"
                  size="small"
                  fullWidth
                  required
                  value={custodyEvent}
                  onChange={(e) => {
                    const evt = e.target.value;
                    setCustodyEvent(evt);
                    if (evt === 'AUTOPSY_SUITE_TRANSFER') setCustodyDestination('Pathology Dissection Suite 1');
                    else if (evt === 'VIEWING_ROOM_HANDOVER') setCustodyDestination('Dignity Viewing Room 2');
                    else if (evt === 'RELEASE_TO_FAMILY') setCustodyDestination('Funeral Parlour Dispatch / Hearse Bay');
                    else if (evt === 'EMBALMING_SUITE_TRANSFER') setCustodyDestination('Embalming & Preparation Suite');
                  }}
                >
                  <MenuItem value="INTERNAL_TRANSFER">🔄 Internal Tray Movement Transfer</MenuItem>
                  <MenuItem value="AUTOPSY_SUITE_TRANSFER">🔬 Autopsy Pathology Dissection Transfer</MenuItem>
                  <MenuItem value="VIEWING_ROOM_HANDOVER">🕊️ Dignity Viewing Room Handover</MenuItem>
                  <MenuItem value="EMBALMING_SUITE_TRANSFER">🧪 Embalming Room Transfer</MenuItem>
                  <MenuItem value="RELEASE_TO_FAMILY">📜 Final Release to Family / Funeral Director</MenuItem>
                  <MenuItem value="POLICE_EVIDENCE_INSPECTION">🛡️ Police Forensic Evidence Custody</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Origin Location *"
                  size="small"
                  fullWidth
                  required
                  value={custodyOrigin}
                  onChange={(e) => setCustodyOrigin(e.target.value)}
                  placeholder="e.g. Cabinet B - Tray 1"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Destination Compartment / Unit *"
                  size="small"
                  fullWidth
                  required
                  value={custodyDestination}
                  onChange={(e) => setCustodyDestination(e.target.value)}
                  placeholder="e.g. Pathology Dissection Suite 1"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Authorizing Mortician *"
                  size="small"
                  fullWidth
                  required
                  value={custodyPersonnel}
                  onChange={(e) => setCustodyPersonnel(e.target.value)}
                  placeholder="e.g. Mortuary Officer Caleb"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Receiving Officer / Contact Person *"
                  size="small"
                  fullWidth
                  required
                  value={custodyRecipient}
                  onChange={(e) => setCustodyRecipient(e.target.value)}
                  placeholder="e.g. Dr. Jane Benson (Pathologist) / John Doe (Next of Kin) / Inspector B. Musa"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Custody Witness & Verification Notes"
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  value={custodyNotes}
                  onChange={(e) => setCustodyNotes(e.target.value)}
                  placeholder="Positive identity band verified before movement. Transfer authorized under custody protocol."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCustodyDialogOpen(false)} sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 800, bgcolor: TEAL, '&:hover': { bgcolor: '#0f766e' } }}>
              Record Custody Handover
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Move Body Dialog */}
      <Dialog open={moveDialogOpen} onClose={() => setMoveDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleMoveBody}>
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwapHoriz sx={{ color: PRIMARY }} />
            Internal Tray Transfer & Vault Telemetry Reassignment
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              <TextField
                select
                label="Select Deceased Body to Transfer *"
                name="mrn"
                size="small"
                fullWidth
                value={selectedMRN}
                onChange={(e) => setSelectedMRN(e.target.value)}
                required
                helperText="Select which admitted deceased body is being relocated to another cooling shelf"
              >
                {admissions.map(adm => (
                  <MenuItem key={adm.mrn || adm.id} value={adm.mrn}>
                    {adm.name} ({adm.mrn}) — Current: {adm.storageLocation || 'Vault'} [{adm.status}]
                  </MenuItem>
                ))}
              </TextField>

              {(() => {
                const adm = admissions.find(a => a.mrn === selectedMRN);
                if (!adm) return null;
                return (
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(PRIMARY, 0.05), border: `1px solid ${alpha(PRIMARY, 0.15)}` }}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Current Tray / Bay:</Typography>
                        <Typography variant="body2" fontWeight={800} color={PRIMARY}>{adm.storageLocation || 'Cold Vault'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Medico-Legal Status:</Typography>
                        <Box sx={{ mt: 0.3 }}><StatusChip label={adm.medicoLegalStatus || 'NONE'} /></Box>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Cause of Death:</Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.primary', fontWeight: 600 }}>{adm.causeOfDeath || 'Documented'}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                );
              })()}

              <TextField
                select
                label="Destination Storage Tray *"
                name="destination"
                size="small"
                fullWidth
                defaultValue="Cabinet A - Tray 1"
                helperText="Choose an available vacant vault tray or cold chamber"
              >
                {storage.map(s => {
                  const isCurrent = admissions.find(a => a.mrn === selectedMRN)?.storageLocation === s.code;
                  return (
                    <MenuItem key={s.code} value={s.code} disabled={s.occupied && !isCurrent}>
                      {s.code} {isCurrent ? '📍 (Current Location)' : (s.occupied ? `🔴 (Occupied — ${s.occupant?.name || 'In Use'})` : '🟢 (Vacant — Available)')}
                    </MenuItem>
                  );
                })}
              </TextField>

              <TextField
                label="Transfer Purpose & Telemetry Note *"
                name="purpose"
                size="small"
                fullWidth
                required
                defaultValue="Routine shelf reassignment for environmental temperature optimization"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setMoveDialogOpen(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 800, bgcolor: PRIMARY, '&:hover': { bgcolor: '#0284c7' } }}>
              Authorize & Transfer Body
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Request Autopsy Dialog */}
      <Dialog open={autopsyDialogOpen} onClose={() => setAutopsyDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleRequestAutopsy}>
          <DialogTitle sx={{ fontWeight: 800 }}>Schedule Autopsy Postmortem Services</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                select
                label="Target Deceased body (MRN)"
                name="mrn"
                size="small"
                fullWidth
                required
                value={selectedMRN}
                onChange={(e) => setSelectedMRN(e.target.value)}
              >
                {admissions.map(adm => (
                  <MenuItem key={adm.id} value={adm.mrn}>
                    {adm.mrn} - {adm.name} ({adm.storageLocation || 'Chiller'})
                  </MenuItem>
                ))}
              </TextField>
              <TextField select label="Autopsy Service Type" name="type" size="small" fullWidth defaultValue="CLINICAL">
                <MenuItem value="CLINICAL">Clinical Pathology Autopsy (Diagnostic Study)</MenuItem>
                <MenuItem value="CORONER">Coroner Forensic Autopsy (Police Medico-Legal)</MenuItem>
              </TextField>
              <TextField label="Assigned Pathologist Clinician" name="pathologist" size="small" fullWidth required defaultValue="Dr. T. A. Vegher (Consultant Pathologist)" />
              <TextField
                label="Scheduled Autopsy Date & Time *"
                name="scheduledTime"
                type="datetime-local"
                size="small"
                fullWidth
                required
                defaultValue={getLocalDateTimeLocal(2)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setAutopsyDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Schedule autopsy</Button></DialogActions>
        </form>
      </Dialog>

      {/* Release Body Dialog */}
      <Dialog open={releaseDialogOpen} onClose={() => setReleaseDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleReleaseBody}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: TEAL, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Gavel sx={{ fontSize: 22 }} />
              <span>Deceased Body Final Handover & Gate Pass Clearance</span>
            </Box>
            <Chip size="small" label={selectedMRN || 'DECEASED'} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700 }} />
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <Box sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#166534', mb: 0.5 }}>
                  Deceased Subject: {selectedDeceasedForRelease?.name || selectedMRN} ({selectedDeceasedForRelease?.gender || 'N/A'}, {selectedDeceasedForRelease?.age || 'N/A'} yrs)
                </Typography>
                <Typography variant="caption" sx={{ color: '#15803d', display: 'block' }}>
                  Vault Location: Cabinet {selectedDeceasedForRelease?.vaultLocation?.cabinet || 'N/A'}, Drawer {selectedDeceasedForRelease?.vaultLocation?.drawer || 'N/A'} · Admitted: {selectedDeceasedForRelease?.admissionDate ? new Date(selectedDeceasedForRelease.admissionDate).toLocaleDateString() : 'N/A'}
                </Typography>
              </Box>

              <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                <strong>Statutory Standard BR-MOR-012:</strong> Positive physical biometric/tag matching of the deceased, national identity verification of the claimant, and settlement of funeral custody dues must be confirmed prior to gate clearance.
              </Alert>

              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                1. Authorized Claimant / Next-of-Kin Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Claimant Full Legal Name"
                    name="claimantName"
                    size="small"
                    fullWidth
                    required
                    value={claimantNameInput}
                    onChange={(e) => setClaimantNameInput(e.target.value)}
                    placeholder="e.g. Hajiya Fatima Garba"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Claimant National ID / NIN"
                    name="claimantNid"
                    size="small"
                    fullWidth
                    required
                    value={claimantNidInput}
                    onChange={(e) => setClaimantNidInput(e.target.value)}
                    placeholder="e.g. NIN-778291038"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Relationship to Deceased"
                    name="relationship"
                    size="small"
                    fullWidth
                    required
                    value={relationshipInput}
                    onChange={(e) => setRelationshipInput(e.target.value)}
                    placeholder="e.g. Eldest Son / Spouse"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Cashier Settlement Receipt Ref"
                    name="receiptNumber"
                    size="small"
                    fullWidth
                    required
                    value={receiptNumberInput}
                    onChange={(e) => setReceiptNumberInput(e.target.value)}
                    placeholder="e.g. RCP-MORT-8829"
                  />
                </Grid>
              </Grid>

              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                2. Funeral Parlour & Dispatch Logistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Receiving Undertaker / Funeral Service"
                    name="undertaker"
                    size="small"
                    fullWidth
                    required
                    value={undertakerInput}
                    onChange={(e) => setUndertakerInput(e.target.value)}
                    placeholder="e.g. Ebony Funeral Home / Family Hearse"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Hearse / Vehicle Reg Number"
                    name="hearseNumber"
                    size="small"
                    fullWidth
                    required
                    value={hearseNumberInput}
                    onChange={(e) => setHearseNumberInput(e.target.value)}
                    placeholder="e.g. KJA-882-AH"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Discharging Mortician Officer"
                    name="handoverOfficer"
                    size="small"
                    fullWidth
                    required
                    value={handoverOfficerInput}
                    onChange={(e) => setHandoverOfficerInput(e.target.value)}
                  />
                </Grid>
              </Grid>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={handoverDeclaration}
                    onChange={(e) => setHandoverDeclaration(e.target.checked)}
                    color="success"
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    I hereby attest and certify that the physical wrist tag ID, toe tag ID, and face profile have been positively matched with the claimant, and all personal effects have been handed over intact.
                  </Typography>
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
            <Button onClick={() => setReleaseDialogOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!handoverDeclaration}
              sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0b5c53' }, fontWeight: 700 }}
            >
              Sign & Authorize Release Handover
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* CAPA Dialog */}
      <Dialog open={capaDialogOpen} onClose={() => setCapaDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateCAPA}>
          <DialogTitle sx={{ fontWeight: 800 }}>Record CAPA Plan (Compliance audit)</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Target Unit / cabinet" name="targetUnit" size="small" fullWidth required placeholder="e.g. Refrigeration Unit Cabinet B" />
              <TextField label="Environmental Discrepancy" name="discrepancy" size="small" fullWidth required multiline rows={2} placeholder="State temperature excursion details..." />
              <TextField label="Corrective Action Plan" name="correctiveAction" size="small" fullWidth required multiline rows={2} placeholder="State thermostatic fixes or adjustments..." />
              <TextField label="Target Deadline" name="deadline" size="small" fullWidth required defaultValue="2026-06-30" />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setCapaDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained" color="warning">Submit CAPA</Button></DialogActions>
        </form>
      </Dialog>

      {/* ── Official Autopsy & Postmortem Examination Report Modal ── */}
      <Dialog
        open={autopsyReportModalOpen}
        onClose={() => setAutopsyReportModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          }
        }}
      >
        {selectedAutopsyForModal && (
          <>
            {/* Header */}
            <Box sx={{ bgcolor: PURPLE, color: '#fff', p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                    <LocalHospital />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                      FAITH FOUNDATION MISSION HOSPITAL
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Department of Anatomic Pathology & Forensic Mortuary Services
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700, bgcolor: 'rgba(255,255,255,0.15)', px: 1.5, py: 0.5, borderRadius: 1.5, display: 'inline-block' }}>
                  POSTMORTEM AUTOPSY & PATHOLOGICAL EXAMINATION REPORT (REF: {selectedAutopsyForModal.id})
                </Typography>
              </Box>
              <IconButton onClick={() => setAutopsyReportModalOpen(false)} sx={{ color: '#fff' }}>
                <Close />
              </IconButton>
            </Box>

            <DialogContent dividers sx={{ p: 3, bgcolor: '#f8fafc' }}>
              <Stack spacing={3}>
                {/* Status & Medico-Legal Scope Header */}
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: '#fff', border: '1px solid #e2e8f0' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>DECEASED PATIENT NAME & MRN</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>
                        {selectedAutopsyForModal.name || 'Unknown Patient'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: PURPLE }}>
                        MRN: {selectedAutopsyForModal.mrn}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>MEDICO-LEGAL SCOPE</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={selectedAutopsyForModal.type === 'CORONER' || (selectedAutopsyForModal.scope && selectedAutopsyForModal.scope.includes('Coroner')) ? 'CORONER / POLICE FORENSIC' : 'CLINICAL PATHOLOGY'}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            bgcolor: (selectedAutopsyForModal.type === 'CORONER' || (selectedAutopsyForModal.scope && selectedAutopsyForModal.scope.includes('Coroner'))) ? alpha(DANGER, 0.12) : alpha(PURPLE, 0.12),
                            color: (selectedAutopsyForModal.type === 'CORONER' || (selectedAutopsyForModal.scope && selectedAutopsyForModal.scope.includes('Coroner'))) ? DANGER : PURPLE,
                          }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>EXAMINATION STATUS</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          icon={<Verified sx={{ fontSize: '14px !important' }} />}
                          label={selectedAutopsyForModal.status || selectedAutopsyForModal.statusStage || 'COMPLETED'}
                          color={selectedAutopsyForModal.status === 'COMPLETED' || selectedAutopsyForModal.statusStage === 'COMPLETED' ? 'success' : 'warning'}
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '0.72rem' }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Pathologist & Examination Details */}
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: '#fff', border: '1px solid #e2e8f0' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>EXAMINING CONSULTANT PATHOLOGIST</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: PRIMARY, mt: 0.3 }}>
                        {selectedAutopsyForModal.pathologist || 'Dr. T. A. Vegher (Consultant Pathologist)'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Medical & Dental Council Certification · Anatomic & Forensic Division
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>EXAMINATION DATE & TIME</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: SECONDARY, mt: 0.3 }}>
                        {selectedAutopsyForModal.scheduledTime || new Date().toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Mortuary Autopsy Suite A · Faith Foundation Main Facility
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Cause of Death (Section 1) */}
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: alpha(DANGER, 0.03), border: `1px solid ${alpha(DANGER, 0.2)}` }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <AssignmentTurnedIn sx={{ color: DANGER }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: DANGER }}>
                      OFFICIAL CERTIFIED CAUSE OF DEATH
                    </Typography>
                  </Stack>
                  <Box sx={{ pl: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
                      I. (a) Immediate Cause / Underlying Pathological Mechanism:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800, color: '#1e293b', bgcolor: '#fff', p: 1.5, borderRadius: 1.5, border: '1px solid #cbd5e1' }}>
                      {selectedAutopsyForModal.causeOfDeath || 'Pending final toxicological & histological correlation'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      ICD-10 Diagnostic Indexing: Completed & Certified for National Death Registry and Legal Release.
                    </Typography>
                  </Box>
                </Paper>

                {/* Postmortem Findings & Gross Organ Examination Summary */}
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: '#fff', border: '1px solid #e2e8f0' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <Description sx={{ color: PURPLE }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PURPLE }}>
                      GROSS DISSECTION & ANATOMIC FINDINGS SUMMARY
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ lineHeight: 1.7, color: '#334155', bgcolor: '#f1f5f9', p: 2, borderRadius: 1.5, fontFamily: 'sans-serif' }}>
                    {selectedAutopsyForModal.findings || 'External examination reveals intact deceased body. Internal postmortem dissection shows gross organ changes consistent with clinical history. Forensic toxicology cleared.'}
                  </Typography>

                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">HISTOPATHOLOGY</Typography>
                        <Typography variant="body2" fontWeight={700} color={SUCCESS}>
                          Tissue Biopsies Cleared
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">FORENSIC TOXICOLOGY</Typography>
                        <Typography variant="body2" fontWeight={700} color={SUCCESS}>
                          Negative / Screened
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">POLICE / CORONER CLEARANCE</Typography>
                        <Typography variant="body2" fontWeight={700} color={PURPLE}>
                          Authorized for Release
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Digital Stamp & Sign-off Box */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', p: 2, borderRadius: 2, bgcolor: '#fff', border: '1px dashed #94a3b8' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">AUTHENTICATION SIGNATURE</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: PRIMARY, fontStyle: 'italic', fontFamily: 'serif', fontSize: '1.1rem', mt: 0.5 }}>
                      {selectedAutopsyForModal.pathologist || 'Dr. T. A. Vegher'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Chief Consultant Pathologist · MD, FMCPath, FWACP
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Chip
                      icon={<Verified />}
                      label="MDCN DIGITAL SIGNATURE VERIFIED"
                      color="success"
                      size="small"
                      sx={{ fontWeight: 800, fontSize: '0.68rem' }}
                    />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Certified on: {selectedAutopsyForModal.scheduledTime || new Date().toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, bgcolor: '#fff' }}>
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={() => handlePrintAutopsyReport(selectedAutopsyForModal)}
                sx={{ fontWeight: 700, borderRadius: 1.5, textTransform: 'none' }}
              >
                Print Certified Report
              </Button>
              <Button
                variant="contained"
                onClick={() => setAutopsyReportModalOpen(false)}
                sx={{ fontWeight: 800, bgcolor: PRIMARY, borderRadius: 1.5, px: 3, textTransform: 'none' }}
              >
                Close Report
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Perform / Complete Autopsy Dialog ── */}
      <Dialog
        open={performAutopsyDialogOpen}
        onClose={() => setPerformAutopsyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <form onSubmit={handleCompleteAutopsyDirect}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: PURPLE, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <MedicalServices sx={{ color: '#fff' }} />
            Pathological Examination & Postmortem Sign-Off
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
                Completing this autopsy records gross organ findings, certifies the official Cause of Death, and updates both the Mortuary Autopsy log and Pathology department records.
              </Alert>

              <TextField
                select
                label="Deceased Body (MRN) *"
                name="mrn"
                size="small"
                fullWidth
                required
                value={selectedMRN}
                onChange={(e) => setSelectedMRN(e.target.value)}
              >
                {admissions.map(adm => (
                  <MenuItem key={adm.id || adm.mrn} value={adm.mrn}>
                    {adm.name} ({adm.mrn}) — Vault: {adm.storageLocation || 'Chiller'} [{adm.status}]
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Examining Consultant Pathologist *"
                name="pathologist"
                size="small"
                fullWidth
                required
                defaultValue="Dr. T. A. Vegher (Consultant Pathologist)"
              />

              <TextField
                label="Certified Primary Cause of Death *"
                name="causeOfDeath"
                size="small"
                fullWidth
                required
                multiline
                rows={2}
                placeholder="e.g. Acute Myocardial Infarction secondary to Severe Coronary Atherosclerosis..."
                defaultValue={
                  admissions.find(a => a.mrn === selectedMRN)?.causeOfDeath ||
                  'Cardiorespiratory Arrest secondary to Multi-Organ Dysfunction Syndrome'
                }
              />

              <TextField
                label="Gross Dissection Findings & Organ Examination Summary *"
                name="findings"
                size="small"
                fullWidth
                required
                multiline
                rows={4}
                placeholder="Detail external inspection, organ weights, cavity fluids, gross cardiovascular/pulmonary lesions..."
                defaultValue="External examination reveals intact deceased body. Internal postmortem dissection shows gross organ changes consistent with clinical history. Forensic toxicology cleared."
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setPerformAutopsyDialogOpen(false)} sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{ fontWeight: 800, bgcolor: PURPLE, '&:hover': { bgcolor: '#6d28d9' } }}
            >
              Sign & Complete Autopsy
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Embalming & Body Preparation Dialog ── */}
      <Dialog
        open={embalmDialogOpen}
        onClose={() => setEmbalmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <form onSubmit={handleLogEmbalming}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: TEAL, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <WaterDrop sx={{ color: '#fff' }} />
            Log Arterial Embalming & Body Preparation Protocol
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              {(() => {
                const activeSvc = BODY_PREPARATION_SERVICES.find(s => s.value === selectedPrepStatus) || BODY_PREPARATION_SERVICES[0];
                return (
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(TEAL, 0.08), border: `1px solid ${alpha(TEAL, 0.2)}` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          AUTOMATIC BILLING & INTERNAL BANKING NOTICE:
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.82rem', color: SECONDARY, mt: 0.5 }}>
                          Logging this procedure automatically queues an invoice for <strong>₦{activeSvc.price.toLocaleString()}</strong> ({activeSvc.code}) to <strong>Internal Banking (Cashier Billing)</strong> for payment collection and appends an entry to the Chain of Custody log.
                        </Typography>
                      </Box>
                      <Chip
                        label={`₦${activeSvc.price.toLocaleString()}`}
                        color="primary"
                        sx={{ fontWeight: 900, fontSize: '0.85rem', bgcolor: TEAL, color: '#fff', height: 28 }}
                      />
                    </Stack>
                  </Box>
                );
              })()}

              <TextField
                select
                label="Target Deceased Body (MRN) *"
                name="mrn"
                size="small"
                fullWidth
                required
                value={selectedMRN}
                onChange={(e) => setSelectedMRN(e.target.value)}
              >
                {admissions.map(adm => (
                  <MenuItem key={adm.id || adm.mrn} value={adm.mrn}>
                    {adm.name} ({adm.mrn}) — Current: {adm.storageLocation || 'Vault'} [{adm.status}]
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Preservative Chemical Formulation *"
                name="preservativeFluid"
                size="small"
                fullWidth
                required
                defaultValue="Arterial Formalin & Glutaraldehyde Complex (3.5% index)"
              >
                <MenuItem value="Arterial Formalin & Glutaraldehyde Complex (3.5% index)">Arterial Formalin & Glutaraldehyde Complex (3.5% index) — Standard</MenuItem>
                <MenuItem value="Low-Formaldehyde Cosmetic Preservation Complex (2.0% index)">Low-Formaldehyde Cosmetic Preservation Complex (2.0% index) — Family Dignity</MenuItem>
                <MenuItem value="High-Index Cavity & Arterial Fixative (5.0% index)">High-Index Cavity & Arterial Fixative (5.0% index) — Long-term Custody</MenuItem>
                <MenuItem value="Specialized Restoration Fluid with Humectant Blend">Specialized Restoration Fluid with Humectant Blend — Repatriation Ready</MenuItem>
              </TextField>

              <TextField
                select
                label="Mortuary Specialist / Licensed Embalmer *"
                name="embalmer"
                size="small"
                fullWidth
                required
                value={selectedEmbalmer}
                onChange={(e) => setSelectedEmbalmer(e.target.value)}
                helperText="Select assigned specialist with Mortician credentials from Staff Management"
              >
                {morticians.map(m => {
                  const val = `${m.name} (${m.designation || 'Mortician'} - ${m.employeeId || 'MOR'})`;
                  return (
                    <MenuItem key={m.id || m.employeeId || m.name} value={val}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 750, color: PRIMARY }}>
                            {m.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {m.designation || 'Licensed Mortician & Embalmer'}
                          </Typography>
                        </Box>
                        <Chip
                          label={m.employeeId || 'MOR'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                        />
                      </Stack>
                    </MenuItem>
                  );
                })}
              </TextField>

              <TextField
                select
                label="Body Preparation & Grooming Status *"
                name="bodyPrepStatus"
                size="small"
                fullWidth
                required
                value={selectedPrepStatus}
                onChange={(e) => setSelectedPrepStatus(e.target.value)}
                helperText="Selecting a service dynamically sets the tariff and queues the bill in Internal Banking"
              >
                {BODY_PREPARATION_SERVICES.map(svc => (
                  <MenuItem key={svc.value} value={svc.value}>
                    <Box sx={{ py: 0.5, width: '100%' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 750, color: PRIMARY }}>
                          {svc.label}
                        </Typography>
                        <Chip
                          label={`₦${svc.price.toLocaleString()} (${svc.code})`}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.68rem',
                            bgcolor: alpha(TEAL, 0.12),
                            color: TEAL,
                            ml: 1
                          }}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                        {svc.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              {/* Dynamic Tariff & Catalog Details Box */}
              {(() => {
                const activeSvc = BODY_PREPARATION_SERVICES.find(s => s.value === selectedPrepStatus) || BODY_PREPARATION_SERVICES[0];
                return (
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item xs={7}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>CATALOG TARIFF</Typography>
                        <Typography variant="body2" fontWeight={800} color={PRIMARY}>
                          {activeSvc.name}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: TEAL, fontWeight: 700 }}>
                          Code: {activeSvc.code} · Unit: Per Body
                        </Typography>
                      </Grid>
                      <Grid item xs={5} sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>CONFIGURED FEE</Typography>
                        <Typography variant="h6" fontWeight={900} color={TEAL}>
                          ₦{activeSvc.price.toLocaleString()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                );
              })()}

              <TextField
                label="Embalming Notes & Special Cosmetic Instructions"
                name="notes"
                size="small"
                fullWidth
                multiline
                rows={2}
                placeholder="e.g. Arterial pressure at 12 PSI, natural skin humectant applied, positive ankle ID tag double-verified..."
                defaultValue="Arterial embalming completed successfully. Ankle tag and wristband verified against admission register."
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setEmbalmDialogOpen(false)} sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{ fontWeight: 800, bgcolor: TEAL, '&:hover': { bgcolor: '#0f766e' } }}
            >
              Record Embalming & Update Custody
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Family Dignity Viewing Dialog ── */}
      <Dialog
        open={viewingDialogOpen}
        onClose={() => setViewingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <form onSubmit={handleScheduleViewing}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <FamilyRestroom sx={{ color: '#fff' }} />
            Schedule Family Dignity Viewing & Committal Visitation
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(PRIMARY, 0.06), border: `1px solid ${alpha(PRIMARY, 0.15)}` }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: PRIMARY, display: 'block' }}>
                  DIGNITY SUITE BOOKING & BILLING NOTICE:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', color: SECONDARY, mt: 0.3 }}>
                  Booking this private viewing chamber invoices <strong>₦15,000 (MORT-VIEWING)</strong> to Hospital Cashier Billing and reserves the chapel suite.
                </Typography>
              </Box>

              <TextField
                select
                label="Target Deceased Body (MRN) *"
                name="mrn"
                size="small"
                fullWidth
                required
                value={selectedMRN}
                onChange={(e) => setSelectedMRN(e.target.value)}
              >
                {admissions.map(adm => (
                  <MenuItem key={adm.id || adm.mrn} value={adm.mrn}>
                    {adm.name} ({adm.mrn}) — Current: {adm.storageLocation || 'Vault'} [{adm.status}]
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Dedicated Viewing Chamber / Chapel *"
                name="viewingChamber"
                size="small"
                fullWidth
                required
                defaultValue="Private Family Viewing Chapel 1"
              >
                <MenuItem value="Private Family Viewing Chapel 1">Private Family Viewing Chapel 1 (Private Serenity Suite)</MenuItem>
                <MenuItem value="Dignity Viewing Suite 2">Dignity Viewing Suite 2 (Multi-faith Visitation Room)</MenuItem>
                <MenuItem value="Faith Memorial Chapel">Faith Memorial Chapel (Full Committal & Pastoral Altar)</MenuItem>
                <MenuItem value="Main Mortuary Farewell Hall">Main Mortuary Farewell Hall (Extended Family Gathering)</MenuItem>
              </TextField>

              <TextField
                label="Next of Kin / Family Contact Name & Phone *"
                name="familyContact"
                size="small"
                fullWidth
                required
                defaultValue={
                  admissions.find(a => a.mrn === selectedMRN)?.nextOfKin ?
                  `${admissions.find(a => a.mrn === selectedMRN)?.nextOfKin?.name} (${admissions.find(a => a.mrn === selectedMRN)?.nextOfKin?.phone || 'NOK'})` :
                  'Family Representative Contact'
                }
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    label="Scheduled Date & Time *"
                    name="scheduledTime"
                    type="datetime-local"
                    size="small"
                    fullWidth
                    required
                    defaultValue={getLocalDateTimeLocal(24)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Max Attendees"
                    name="maxAttendees"
                    type="number"
                    size="small"
                    fullWidth
                    defaultValue={12}
                  />
                </Grid>
              </Grid>

              <TextField
                select
                label="Ceremonial & Cultural Protocol *"
                name="religiousRequirements"
                size="small"
                fullWidth
                required
                defaultValue="Christian Pastoral Prayers & Family Committal Rites"
              >
                <MenuItem value="Christian Pastoral Prayers & Family Committal Rites">Christian Pastoral Prayers & Family Committal Rites</MenuItem>
                <MenuItem value="Islamic Janazah Viewing & Shroud Inspection">Islamic Janazah Viewing & Shroud Inspection</MenuItem>
                <MenuItem value="Quiet Private Family Farewell & Final Viewing">Quiet Private Family Farewell & Final Viewing</MenuItem>
                <MenuItem value="Traditional Cultural Committal & Libation Protocol">Traditional Cultural Committal & Libation Protocol</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setViewingDialogOpen(false)} sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{ fontWeight: 800, bgcolor: PRIMARY, '&:hover': { bgcolor: '#0284c7' } }}
            >
              Book Viewing Chamber
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default MortuaryFuneral;
