import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField, Chip, Avatar,
  Stack, Dialog, DialogTitle, DialogContent, DialogActions, FormControl,
  InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Divider, Tabs, Tab, CircularProgress,
  Alert, Paper, Tooltip, Switch, FormControlLabel, InputAdornment, LinearProgress,
  Autocomplete
} from '@mui/material';
import {
  Shield, Add, Edit, Delete, Search, CheckCircle, Cancel, Warning,
  HealthAndSafety, Email, Business, Assignment, Refresh,
  Close, FileUpload, VerifiedUser, Policy as PolicyIcon, Receipt,
  Check, PlayArrow, HourglassEmpty, ThumbDown, People, DateRange,
  LocalAtm, Print, FileDownload, Visibility, Key, PointOfSale,
  LocalHospital, Science, Biotech, LocalPharmacy, MedicalServices,
  AccountBalance, MonetizationOn, EventNote, FolderShared, ReceiptLong,
  Assessment, Description, Settings, ContactPhone, PhoneInTalk, Public,
  PhoneCallback, HelpOutline, ArrowForward, ContentCopy, LockReset,
  Link as LinkIcon, FamilyRestroom, Person, Group, PersonAdd, PersonSearch
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { alpha } from '@mui/material/styles';

const C = {
  blue:   '#1e3a8a',
  indigo: '#3b5bdb',
  amber:  '#ea580c',
  red:    '#dc2626',
  green:  '#16a34a',
  teal:   '#0d9488',
  purple: '#7c3aed',
  gold:   '#ca8a04',
  navy:   '#0f172a',
  gray:   '#64748b',
};

const SCHEME_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  STATUTORY_FEDERAL: { label: 'Federal Statutory', color: '#16a34a' },
  STATE_STATUTORY: { label: 'State Statutory', color: '#0d9488' },
  MUTUAL_HEALTH_AGENCY: { label: 'Mutual Agency', color: '#ea580c' },
  DIOCESAN_FAITH_BASED: { label: 'Diocesan Faith Scheme', color: '#7c3aed' },
  PRIVATE_HMO: { label: 'Private HMO', color: '#3b5bdb' },
  CORPORATE: { label: 'Corporate Scheme', color: '#0284c7' },
};

export default function InsurancePortal() {
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const navigate = useNavigate();

  // ── Tab Management ────────────────────────────────────────────────────────
  // 0: Schemes & Client Registry (Merged with Monthly Enrollee Register)
  // 1: Schemes Configuration & Policy Setup
  // [Commented out Tab: Coverage Verification & HMO Desk - Handled directly at Cashier Billing desk]
  // [Commented out Tab: Monthly Enrollee Register - Merged into Tab 0]
  // 2: Monthly Capitation
  // 3: Fee-For-Service (FFS) Claims
  // 4: Authorization Codes & Bill Chart
  // 5: Accredited Hospital Units
  // 6: Insurance Audit & Daily Receipts
  // 7: Tariffs & Code Master
  const [tabValue, setTabValue] = useState(0);

  // Sync tab with URL route
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/schemes-config')) setTabValue(1);
    else if (path.includes('/coverage-verification')) setTabValue(0); // Redirect to Tab 0 (Cashier Billing handles coverage verification)
    else if (path.includes('/monthly-register')) setTabValue(0); // Redirect merged monthly-register to Tab 0
    else if (path.includes('/capitation')) setTabValue(2);
    else if (path.includes('/fee-for-service')) setTabValue(3);
    else if (path.includes('/authorizations')) setTabValue(4);
    else if (path.includes('/accredited-units')) setTabValue(5);
    else if (path.includes('/audit')) setTabValue(6);
    else if (path.includes('/tariffs')) setTabValue(7);
    else setTabValue(0);
  }, [location.pathname]);

  const handleTabChange = (_: any, newValue: number) => {
    setTabValue(newValue);
    const routes = [
      '/insurance-portal',
      '/insurance-portal/schemes-config',
      // '/insurance-portal/coverage-verification', // Handled at Cashier Billing desk
      // '/insurance-portal/monthly-register', // Merged into /insurance-portal
      '/insurance-portal/capitation',
      '/insurance-portal/fee-for-service',
      '/insurance-portal/authorizations',
      '/insurance-portal/accredited-units',
      '/insurance-portal/audit',
      '/insurance-portal/tariffs',
    ];
    if (routes[newValue]) navigate(routes[newValue]);
  };

  // ── State for Core Data ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [selectedSchemeFilter, setSelectedSchemeFilter] = useState('ALL');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('ALL');
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<any[]>([]);

  // Registered Hospital Patients Search (for Enrollee Modal)
  const [registeredPatients, setRegisteredPatients] = useState<any[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [selectedHospitalPatient, setSelectedHospitalPatient] = useState<any | null>(null);

  // Monthly Register Data (Retained for batch analytics & reporting)
  const [monthlyRegisters, setMonthlyRegisters] = useState<any[]>([]);

  // Capitation State
  const [capitationLedger, setCapitationLedger] = useState<any[]>([]);
  const [capitationSummary, setCapitationSummary] = useState<any>({ totalExpected: 0, totalReceived: 0, totalVariance: 0 });

  // FFS Claims State
  const [ffsClaims, setFfsClaims] = useState<any[]>([]);
  const [ffsSummary, setFfsSummary] = useState<any>({ totalTariff: 0, totalClaimed: 0, totalApproved: 0, totalCopay: 0 });

  // Authorizations & Bill Chart
  const [authorizations, setAuthorizations] = useState<any[]>([]);
  const [billChartData, setBillChartData] = useState<any>({ items: [], summary: {} });

  // Accredited Units & Audit
  const [accreditedUnits, setAccreditedUnits] = useState<any[]>([]);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitLevelFilter, setUnitLevelFilter] = useState('ALL');
  const [unitStatusFilter, setUnitStatusFilter] = useState('ALL');
  const [openAddUnitDialog, setOpenAddUnitDialog] = useState(false);
  const [openEditUnitDialog, setOpenEditUnitDialog] = useState(false);
  const [openDeleteUnitDialog, setOpenDeleteUnitDialog] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<any | null>(null);
  const [savingUnit, setSavingUnit] = useState(false);

  const [unitForm, setUnitForm] = useState<any>({
    unitName: '',
    code: '',
    accreditationLevel: 'PRIMARY_SECONDARY',
    leadOfficer: '',
    schemesCovered: [] as string[],
    accreditationDate: new Date().toISOString().slice(0, 10),
    renewalDate: '2027-12-31',
    status: 'ACCREDITED',
    services: '',
  });

  const [auditData, setAuditData] = useState<any>({ dailyReceipts: [], canceledReceipts: [], dailyFolderVisits: [], specialistConsultationFees: [] });

  // Coverage Verification Desk State
  const [verificationSearchQuery, setVerificationSearchQuery] = useState('');
  const [verifiedPatientResult, setVerifiedPatientResult] = useState<any | null>(null);
  const [verifyingPatient, setVerifyingPatient] = useState(false);
  const [verificationLogs, setVerificationLogs] = useState<any[]>([]);

  // Tariffs & Code Master State
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [tariffsSummary, setTariffsSummary] = useState<any>({ totalItems: 0, categoriesCount: 0, preAuthItemsCount: 0 });
  const [tariffCategories, setTariffCategories] = useState<string[]>([]);
  const [tariffCategoryFilter, setTariffCategoryFilter] = useState('ALL');
  const [tariffSearch, setTariffSearch] = useState('');
  const [openAddTariffDialog, setOpenAddTariffDialog] = useState(false);
  const [openEditTariffDialog, setOpenEditTariffDialog] = useState(false);
  const [openDeleteTariffDialog, setOpenDeleteTariffDialog] = useState(false);
  const [editingTariffId, setEditingTariffId] = useState<string | null>(null);
  const [deletingTariff, setDeletingTariff] = useState<any | null>(null);
  const [savingTariff, setSavingTariff] = useState(false);

  const [tariffForm, setTariffForm] = useState<any>({
    category: 'Consultation',
    serviceCode: '',
    serviceName: '',
    privateFee: 5000,
    nhiaTariff: 0,
    esauhcTariff: 0,
    mutualTariff: 0,
    hmoTariff: 4000,
    schemeTariffs: [] as Array<{
      schemeCode: string;
      schemeName: string;
      tariffAmount: number;
      isCapitated: boolean;
      copayPercentage?: number;
    }>,
    preAuthRule: 'Covered under Primary Plan',
    copayPercentage: 10,
  });

  // Dialogs
  const [openAddClientDialog, setOpenAddClientDialog] = useState(false);
  const [openLinkFolderDialog, setOpenLinkFolderDialog] = useState(false);
  const [clientToLink, setClientToLink] = useState<any | null>(null);
  const [patientToLink, setPatientToLink] = useState<any | null>(null);
  const [linkingPatient, setLinkingPatient] = useState(false);
  const [openAddSchemeDialog, setOpenAddSchemeDialog] = useState(false);
  const [openEditSchemeDialog, setOpenEditSchemeDialog] = useState(false);
  const [openDeleteSchemeDialog, setOpenDeleteSchemeDialog] = useState(false);
  const [schemeToDelete, setSchemeToDelete] = useState<any | null>(null);
  const [deletingScheme, setDeletingScheme] = useState(false);
  const [savingEditScheme, setSavingEditScheme] = useState(false);
  const [openAddCapitationDialog, setOpenAddCapitationDialog] = useState(false);
  const [openAddFfsDialog, setOpenAddFfsDialog] = useState(false);
  
  // Authorizations (PA Codes) State
  const [authSearch, setAuthSearch] = useState('');
  const [authSchemeFilter, setAuthSchemeFilter] = useState('ALL');
  const [authCategoryFilter, setAuthCategoryFilter] = useState('ALL');
  const [authStatusFilter, setAuthStatusFilter] = useState('ALL');
  const [openAddAuthDialog, setOpenAddAuthDialog] = useState(false);
  const [openEditAuthDialog, setOpenEditAuthDialog] = useState(false);
  const [openDeleteAuthDialog, setOpenDeleteAuthDialog] = useState(false);
  const [editingAuthId, setEditingAuthId] = useState<string | null>(null);
  const [deletingAuth, setDeletingAuth] = useState<any | null>(null);
  const [savingAuth, setSavingAuth] = useState(false);
  const [selectedAuthPatient, setSelectedAuthPatient] = useState<any | null>(null);

  const [openLogVerificationDialog, setOpenLogVerificationDialog] = useState(false);
  const [openPrintBillDialog, setOpenPrintBillDialog] = useState(false);

  // Forms
  const [clientForm, setClientForm] = useState<any>({
    isNewPatient: false,
    patientId: '',
    folderNumber: '',
    firstName: '',
    lastName: '',
    middleName: '',
    gender: 'MALE',
    birthDate: '1990-01-01',
    age: '35',
    phone: '',
    address: '',
    bloodGroup: 'O+',
    genotype: 'AA',
    nationalId: '',
    schemeCode: 'NHIA',
    planId: '',
    membershipNumber: 'NHIA/POL/NEW',
    enrolleeNumber: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    primaryUnit: 'OPD Clinic',
    coverageScope: 'INDIVIDUAL',
    coveredDependents: [] as Array<{
      id?: string;
      name: string;
      relationship: string;
      gender: string;
      age: string;
      nationalId?: string;
    }>,
  });

  const [schemeForm, setSchemeForm] = useState<any>({
    code: '',
    name: '',
    shortName: '',
    category: 'PRIVATE_HMO',
    badge: 'Health Scheme',
    color: '#3b5bdb',
    contactPerson: '',
    contactDetails: '',
    phone: '',
    email: '',
    portalUrl: '',
    description: '',
    defaultCapitationRate: 750,
    defaultCopayPercentage: 10,
    accreditedStatus: 'ACCREDITED',
    accreditationExpiry: '2027-12-31',
    requiresPreAuthForSpecialist: false,
    requiresPreAuthForSurgery: true,
    requiresPreAuthForScans: true,
    requiresPreAuthForSpecialLabs: true,
    plans: [
      { name: 'Standard Benefit Plan', maxAnnualLimit: 1000000, copayPercentage: 10, deductibleAmount: 0 }
    ],
  });

  const [editSchemeForm, setEditSchemeForm] = useState<any>({
    id: '',
    code: '',
    name: '',
    shortName: '',
    category: 'PRIVATE_HMO',
    badge: 'Health Scheme',
    color: '#3b5bdb',
    contactPerson: '',
    contactDetails: '',
    phone: '',
    email: '',
    portalUrl: '',
    description: '',
    defaultCapitationRate: 750,
    defaultCopayPercentage: 10,
    accreditedStatus: 'ACCREDITED',
    accreditationExpiry: '2027-12-31',
    requiresPreAuthForSpecialist: false,
    requiresPreAuthForSurgery: true,
    requiresPreAuthForScans: true,
    requiresPreAuthForSpecialLabs: true,
    isActive: true,
    plans: [
      { name: 'Standard Benefit Plan', maxAnnualLimit: 1000000, copayPercentage: 10, deductibleAmount: 0 }
    ],
  });

  const [verificationForm, setVerificationForm] = useState<any>({
    patientId: '',
    folderNumber: '',
    patientName: '',
    schemeCode: 'NHIA',
    callReferenceCode: '',
    hmoOfficerName: '',
    hmoOfficerPhone: '',
    channel: 'PHONE_CALL',
    verifiedStatus: 'FULLY_COVERED',
    servicesDescription: 'Full Blood Count, Abdominal Ultrasound Scan, IV Antibiotics',
    hmoApprovedAmount: '45000',
    patientCopayAmount: '5000',
    extraOutofPocketNotes: 'Standard 10% statutory co-payment applies. No extra out-of-pocket required.',
    officerNotes: 'HMO confirmed patient is active and covered.',
  });

  const [capitationForm, setCapitationForm] = useState<any>({
    schemeCode: 'NHIA',
    month: new Date().toISOString().slice(0, 7),
    enrolleeCount: '',
    ratePerHead: '750',
    receivedAmount: '',
    bankReference: '',
    remittanceDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const [ffsForm, setFfsForm] = useState<any>({
    schemeCode: 'NHIA',
    folderNumber: '',
    clientName: '',
    serviceDescription: '',
    category: 'SURGERY',
    careLevel: 'SECONDARY_CARE',
    tariffAmount: '',
    copayPct: '10',
    paCode: '',
    doctorInCharge: '',
    notes: '',
  });

  const [authForm, setAuthForm] = useState<any>({
    schemeCode: 'NHIA',
    folderNumber: '',
    clientName: '',
    category: 'LABORATORY',
    serviceName: '',
    requestingDoctor: 'Attending Physician',
    tariffAmount: '15000',
    copayPct: '10',
    patientCopay: '1500',
    coverageAmount: '13500',
    paCode: '',
    requestDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: 'APPROVED',
    notes: 'Prior authorization code approved and validated against benefit schedule.',
  });

  // ── Fetch All Live Data ───────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        schemesRes, clientsRes, monthlyRes, capRes, ffsRes, authRes, billRes, unitsRes, auditRes, verifRes, tariffsRes
      ] = await Promise.all([
        api.get('/insurance/schemes').catch(() => ({ data: { data: [] } })),
        api.get('/insurance/clients').catch(() => ({ data: { data: [] } })),
        api.get('/insurance/monthly-register').catch(() => ({ data: { data: [] } })),
        api.get('/insurance/capitation').catch(() => ({ data: { data: [], summary: {} } })),
        api.get('/insurance/fee-for-service').catch(() => ({ data: { data: [], summary: {} } })),
        api.get('/insurance/authorizations').catch(() => ({ data: { data: [] } })),
        api.get('/insurance/bill-charts').catch(() => ({ data: { data: { items: [], summary: {} } } })),
        api.get('/insurance/accredited-units').catch(() => ({ data: { data: [] } })),
        api.get('/insurance/audit-summary').catch(() => ({ data: { data: {} } })),
        api.get('/insurance/verifications').catch(() => ({ data: { data: [] } })),
        api.get('/insurance/tariffs').catch(() => ({ data: { data: [], summary: {}, categories: [] } })),
      ]);

      setSchemes(schemesRes.data?.data || []);
      setClients(clientsRes.data?.data || []);
      setMonthlyRegisters(monthlyRes.data?.data || []);
      setCapitationLedger(capRes.data?.data || []);
      setCapitationSummary(capRes.data?.summary || {});
      setFfsClaims(ffsRes.data?.data || []);
      setFfsSummary(ffsRes.data?.summary || {});
      setAuthorizations(authRes.data?.data || []);
      setBillChartData(billRes.data?.data || { items: [], summary: {} });
      setAccreditedUnits(unitsRes.data?.data || []);
      setAuditData(auditRes.data?.data || {});
      setVerificationLogs(verifRes.data?.data || []);
      setTariffs(tariffsRes.data?.data || []);
      setTariffsSummary(tariffsRes.data?.summary || {});
      setTariffCategories(tariffsRes.data?.categories || []);
    } catch (err) {
      console.error('Failed fetching insurance module data:', err);
      enqueueSnackbar('Error loading insurance module data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Search registered hospital patients
  const searchHospitalPatients = async (queryStr: string) => {
    setPatientSearchLoading(true);
    try {
      const res = await api.get(`/insurance/registered-patients?query=${encodeURIComponent(queryStr)}`);
      setRegisteredPatients(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPatientSearchLoading(false);
    }
  };

  // Perform real-time coverage verification lookup
  const handlePerformCoverageCheck = async (queryVal: string) => {
    if (!queryVal || !queryVal.trim()) {
      enqueueSnackbar('Please enter a Folder Number, Patient Name, or Policy Number', { variant: 'warning' });
      return;
    }
    setVerifyingPatient(true);
    setVerifiedPatientResult(null);
    try {
      // First try by folder number lookup
      let res = await api.get(`/insurance/coverage-check-by-folder/${encodeURIComponent(queryVal.trim())}`).catch(() => null);
      if (!res?.data?.success) {
        // If not found by folder, search registered patients first
        const pSearch = await api.get(`/insurance/registered-patients?query=${encodeURIComponent(queryVal.trim())}`);
        const found = pSearch.data?.data?.[0];
        if (found) {
          res = await api.get(`/insurance/coverage-check/${found.id}`);
        }
      }

      if (res?.data?.success) {
        setVerifiedPatientResult(res.data);
        // Prepopulate verification log form
        if (res.data.patient) {
          setVerificationForm((prev: any) => ({
            ...prev,
            patientId: res.data.patient.id,
            folderNumber: res.data.patient.folderNumber,
            patientName: res.data.patient.name,
            schemeCode: res.data.scheme?.code || 'NHIA',
            hmoOfficerPhone: res.data.scheme?.phone || '',
          }));
        }
      } else {
        enqueueSnackbar('No patient or policy found matching query', { variant: 'info' });
        setVerifiedPatientResult({ hasInsurance: false, message: 'No active health insurance policy found.' });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Error checking coverage', { variant: 'error' });
    } finally {
      setVerifyingPatient(false);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  // Reset client enrollment form
  const resetClientForm = () => {
    setClientForm({
      isNewPatient: false,
      patientId: '',
      folderNumber: '',
      firstName: '',
      lastName: '',
      middleName: '',
      gender: 'MALE',
      birthDate: '1990-01-01',
      age: '35',
      phone: '',
      address: '',
      bloodGroup: 'O+',
      genotype: 'AA',
      nationalId: '',
      schemeCode: schemes[0]?.code || 'NHIA',
      planId: schemes[0]?.plans?.[0]?.id || '',
      membershipNumber: `${schemes[0]?.code || 'NHIA'}/POL/NEW`,
      enrolleeNumber: '',
      effectiveDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      primaryUnit: 'OPD Clinic',
      coverageScope: 'INDIVIDUAL',
      coveredDependents: [],
    });
    setSelectedHospitalPatient(null);
  };

  // Add family dependent row
  const handleAddDependentRow = () => {
    setClientForm((prev: any) => ({
      ...prev,
      coveredDependents: [
        ...(prev.coveredDependents || []),
        { id: `DEP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, name: '', relationship: 'SPOUSE', gender: 'FEMALE', age: '30', nationalId: '' }
      ]
    }));
  };

  // Remove family dependent row
  const handleRemoveDependentRow = (index: number) => {
    setClientForm((prev: any) => ({
      ...prev,
      coveredDependents: prev.coveredDependents.filter((_: any, i: number) => i !== index)
    }));
  };

  // Update family dependent field
  const handleDependentFieldChange = (index: number, field: string, value: any) => {
    setClientForm((prev: any) => {
      const updated = [...(prev.coveredDependents || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, coveredDependents: updated };
    });
  };

  // Enroll client into scheme (either existing patient or new walk-in client)
  const handleSaveClient = async () => {
    if (!clientForm.isNewPatient && !clientForm.patientId && !clientForm.folderNumber) {
      enqueueSnackbar('Please select an existing registered hospital patient, or switch to "New Walk-in Enrollee"', { variant: 'warning' });
      return;
    }
    if (clientForm.isNewPatient && (!clientForm.firstName?.trim() || !clientForm.lastName?.trim())) {
      enqueueSnackbar('First Name and Last Name are required for new enrollees', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/insurance/clients', clientForm);
      enqueueSnackbar(
        clientForm.isNewPatient 
          ? 'New enrollee registered into insurance scheme with provisional folder. Records can link their permanent folder anytime.' 
          : 'Patient enrolled into insurance scheme successfully', 
        { variant: 'success' }
      );
      setOpenAddClientDialog(false);
      resetClientForm();
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to enroll client', { variant: 'error' });
    }
  };

  // Open Link Patient Dialog
  const handleOpenLinkFolder = (client: any) => {
    setClientToLink(client);
    setPatientToLink(null);
    setOpenLinkFolderDialog(true);
  };

  // Execute Link Patient to Policy
  const handleExecuteLinkPatient = async () => {
    if (!clientToLink || !patientToLink) {
      enqueueSnackbar('Please select a registered hospital patient to link', { variant: 'warning' });
      return;
    }
    setLinkingPatient(true);
    try {
      const res = await api.post(`/insurance/clients/${clientToLink.id}/link-patient`, {
        patientId: patientToLink.id,
        folderNumber: patientToLink.patientNumber || patientToLink.folderNumber,
      });
      enqueueSnackbar(res.data?.message || 'Hospital folder linked to insurance policy successfully', { variant: 'success' });
      setOpenLinkFolderDialog(false);
      setClientToLink(null);
      setPatientToLink(null);
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to link hospital folder', { variant: 'error' });
    } finally {
      setLinkingPatient(false);
    }
  };

  // Add benefit plan row
  const handleAddPlanRow = (isEdit: boolean) => {
    if (isEdit) {
      setEditSchemeForm((prev: any) => ({
        ...prev,
        plans: [
          ...(prev.plans || []),
          { name: '', maxAnnualLimit: 1500000, copayPercentage: prev.defaultCopayPercentage || 10, deductibleAmount: 0 }
        ]
      }));
    } else {
      setSchemeForm((prev: any) => ({
        ...prev,
        plans: [
          ...(prev.plans || []),
          { name: '', maxAnnualLimit: 1500000, copayPercentage: prev.defaultCopayPercentage || 10, deductibleAmount: 0 }
        ]
      }));
    }
  };

  // Remove benefit plan row
  const handleRemovePlanRow = (index: number, isEdit: boolean) => {
    if (isEdit) {
      setEditSchemeForm((prev: any) => ({
        ...prev,
        plans: prev.plans.filter((_: any, i: number) => i !== index)
      }));
    } else {
      setSchemeForm((prev: any) => ({
        ...prev,
        plans: prev.plans.filter((_: any, i: number) => i !== index)
      }));
    }
  };

  // Update benefit plan field
  const handlePlanFieldChange = (index: number, field: string, value: any, isEdit: boolean) => {
    if (isEdit) {
      setEditSchemeForm((prev: any) => {
        const updated = [...(prev.plans || [])];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, plans: updated };
      });
    } else {
      setSchemeForm((prev: any) => {
        const updated = [...(prev.plans || [])];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, plans: updated };
      });
    }
  };

  // Create New Scheme
  const handleSaveScheme = async () => {
    if (!schemeForm.code || !schemeForm.name) {
      enqueueSnackbar('Scheme Code and Name are required', { variant: 'warning' });
      return;
    }
    const cleanPlans = (schemeForm.plans && schemeForm.plans.length > 0)
      ? schemeForm.plans.filter((p: any) => p.name && p.name.trim())
      : [{ name: `${schemeForm.name} Standard Plan`, maxAnnualLimit: 1000000, copayPercentage: Number(schemeForm.defaultCopayPercentage) || 10, deductibleAmount: 0 }];

    try {
      await api.post('/insurance/schemes', {
        ...schemeForm,
        plans: cleanPlans,
      });
      enqueueSnackbar(`Scheme ${schemeForm.name} created successfully`, { variant: 'success' });
      setOpenAddSchemeDialog(false);
      setSchemeForm({
        code: '', name: '', shortName: '', category: 'PRIVATE_HMO', badge: 'Health Scheme',
        color: '#3b5bdb', contactPerson: '', contactDetails: '', phone: '', email: '',
        portalUrl: '', description: '', defaultCapitationRate: 750, defaultCopayPercentage: 10,
        accreditedStatus: 'ACCREDITED', accreditationExpiry: '2027-12-31',
        requiresPreAuthForSpecialist: false, requiresPreAuthForSurgery: true,
        requiresPreAuthForScans: true, requiresPreAuthForSpecialLabs: true,
        plans: [
          { name: 'Standard Benefit Plan', maxAnnualLimit: 1000000, copayPercentage: 10, deductibleAmount: 0 }
        ],
      });
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create scheme', { variant: 'error' });
    }
  };

  // Open Edit Scheme Dialog
  const handleOpenEditScheme = (scheme: any) => {
    const schemePlans = (scheme.plans && Array.isArray(scheme.plans) && scheme.plans.length > 0)
      ? scheme.plans.map((p: any) => ({
          id: p.id,
          name: p.name,
          maxAnnualLimit: p.maxAnnualLimit || 1000000,
          copayPercentage: p.copayPercentage !== undefined ? p.copayPercentage : (scheme.defaultCopayPercentage || 10),
          deductibleAmount: p.deductibleAmount || 0,
        }))
      : [
          {
            name: `${scheme.name} Standard Plan`,
            maxAnnualLimit: 1000000,
            copayPercentage: scheme.defaultCopayPercentage || 10,
            deductibleAmount: 0,
          }
        ];

    setEditSchemeForm({
      id: scheme.id,
      code: scheme.code,
      name: scheme.name,
      shortName: scheme.shortName || scheme.name,
      category: scheme.category || 'PRIVATE_HMO',
      badge: scheme.badge || 'Health Scheme',
      color: scheme.color || '#3b5bdb',
      contactPerson: scheme.contactPerson || '',
      contactDetails: scheme.contactDetails || '',
      phone: scheme.phone || '',
      email: scheme.email || '',
      portalUrl: scheme.portalUrl || '',
      description: scheme.description || '',
      defaultCapitationRate: scheme.defaultCapitationRate || 750,
      defaultCopayPercentage: scheme.defaultCopayPercentage !== undefined ? scheme.defaultCopayPercentage : 10,
      accreditedStatus: scheme.accreditedStatus || 'ACCREDITED',
      accreditationExpiry: scheme.accreditationExpiry || '2027-12-31',
      requiresPreAuthForSpecialist: !!scheme.requiresPreAuthForSpecialist,
      requiresPreAuthForSurgery: scheme.requiresPreAuthForSurgery !== undefined ? !!scheme.requiresPreAuthForSurgery : true,
      requiresPreAuthForScans: scheme.requiresPreAuthForScans !== undefined ? !!scheme.requiresPreAuthForScans : true,
      requiresPreAuthForSpecialLabs: scheme.requiresPreAuthForSpecialLabs !== undefined ? !!scheme.requiresPreAuthForSpecialLabs : true,
      isActive: scheme.isActive !== undefined ? !!scheme.isActive : true,
      plans: schemePlans,
    });
    setOpenEditSchemeDialog(true);
  };

  // Save Scheme Edit
  const handleUpdateScheme = async () => {
    if (!editSchemeForm.name) {
      enqueueSnackbar('Scheme Name is required', { variant: 'warning' });
      return;
    }
    const cleanPlans = (editSchemeForm.plans && editSchemeForm.plans.length > 0)
      ? editSchemeForm.plans.filter((p: any) => p.name && p.name.trim())
      : [{ name: `${editSchemeForm.name} Standard Plan`, maxAnnualLimit: 1000000, copayPercentage: Number(editSchemeForm.defaultCopayPercentage) || 10, deductibleAmount: 0 }];

    setSavingEditScheme(true);
    try {
      const schemeIdentifier = editSchemeForm.id || editSchemeForm.code;
      await api.put(`/insurance/schemes/${schemeIdentifier}`, {
        ...editSchemeForm,
        plans: cleanPlans,
      });
      enqueueSnackbar(`Scheme "${editSchemeForm.name}" updated successfully`, { variant: 'success' });
      setOpenEditSchemeDialog(false);
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update scheme', { variant: 'error' });
    } finally {
      setSavingEditScheme(false);
    }
  };

  // Open Delete Confirmation Dialog
  const handleOpenDeleteScheme = (scheme: any) => {
    setSchemeToDelete(scheme);
    setOpenDeleteSchemeDialog(true);
  };

  // Confirm Delete Scheme
  const handleConfirmDeleteScheme = async () => {
    if (!schemeToDelete) return;
    setDeletingScheme(true);
    try {
      const schemeIdentifier = schemeToDelete.id || schemeToDelete.code;
      const res = await api.delete(`/insurance/schemes/${schemeIdentifier}`);
      enqueueSnackbar(res.data?.message || `Scheme "${schemeToDelete.name}" deleted successfully`, { variant: 'success' });
      setOpenDeleteSchemeDialog(false);
      setSchemeToDelete(null);
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete scheme', { variant: 'error' });
    } finally {
      setDeletingScheme(false);
    }
  };

  // Log External HMO Call / Portal Verification
  const handleSaveVerificationLog = async () => {
    if (!verificationForm.folderNumber || !verificationForm.patientName) {
      enqueueSnackbar('Folder number and patient name are required', { variant: 'warning' });
      return;
    }
    try {
      const services = verificationForm.servicesDescription
        .split(',')
        .map((s: string) => ({
          category: 'VERIFIED_SERVICE',
          item: s.trim(),
          isCovered: true,
          hmoPortionPct: 90,
          copayPct: 10,
        }))
        .filter((s: any) => s.item.length > 0);

      const res = await api.post('/insurance/log-verification', {
        ...verificationForm,
        verifiedServices: services,
      });

      enqueueSnackbar(res.data?.message || 'Verification log saved and PA Code issued', { variant: 'success' });
      setOpenLogVerificationDialog(false);
      fetchAllData();
      if (verificationForm.folderNumber) {
        handlePerformCoverageCheck(verificationForm.folderNumber);
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save verification log', { variant: 'error' });
    }
  };

  // Save Capitation Remittance
  const handleSaveCapitation = async () => {
    if (!capitationForm.enrolleeCount || !capitationForm.receivedAmount) {
      enqueueSnackbar('Enrollee count and received amount are required', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/insurance/capitation', capitationForm);
      enqueueSnackbar('Monthly capitation recorded successfully', { variant: 'success' });
      setOpenAddCapitationDialog(false);
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to record capitation', { variant: 'error' });
    }
  };

  // Save FFS Claim
  const handleSaveFfs = async () => {
    if (!ffsForm.folderNumber || !ffsForm.clientName || !ffsForm.tariffAmount) {
      enqueueSnackbar('Folder number, client name, and tariff amount are required', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/insurance/fee-for-service', ffsForm);
      enqueueSnackbar('Fee-For-Service claim submitted', { variant: 'success' });
      setOpenAddFfsDialog(false);
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to submit claim', { variant: 'error' });
    }
  };

  // ── Authorizations (PA Codes) Actions ────────────────────────────────────
  const handleOpenAddAuth = () => {
    setEditingAuthId(null);
    setSelectedAuthPatient(null);
    const defScheme = schemes[0]?.code || 'NHIA';
    setAuthForm({
      schemeCode: defScheme,
      folderNumber: '',
      clientName: '',
      category: 'LABORATORY',
      serviceName: '',
      requestingDoctor: 'Attending Physician',
      tariffAmount: '15000',
      copayPct: '10',
      patientCopay: '1500',
      coverageAmount: '13500',
      paCode: '',
      requestDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: 'APPROVED',
      notes: 'Prior authorization code issued and validated against benefit schedule.',
    });
    setOpenAddAuthDialog(true);
  };

  const handleOpenEditAuth = (auth: any) => {
    setEditingAuthId(auth.id);
    setSelectedAuthPatient(null);
    const tariff = Number(auth.tariffAmount) || 0;
    const copay = Number(auth.patientCopay) || 0;
    const copayPct = tariff > 0 ? Math.round((copay / tariff) * 100) : 10;

    setAuthForm({
      schemeCode: auth.schemeCode || 'NHIA',
      folderNumber: auth.folderNumber || '',
      clientName: auth.clientName || '',
      category: auth.category || 'LABORATORY',
      serviceName: auth.serviceName || '',
      requestingDoctor: auth.requestingDoctor || 'Attending Physician',
      tariffAmount: String(tariff),
      copayPct: String(copayPct),
      patientCopay: String(copay),
      coverageAmount: String(auth.coverageAmount || (tariff - copay)),
      paCode: auth.paCode || '',
      requestDate: auth.requestDate || new Date().toISOString().slice(0, 10),
      expiryDate: auth.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: auth.status || 'APPROVED',
      notes: auth.notes || '',
    });
    setOpenEditAuthDialog(true);
  };

  const handleAuthTariffOrCopayChange = (field: 'tariffAmount' | 'copayPct', value: string) => {
    setAuthForm((prev: any) => {
      const tariff = field === 'tariffAmount' ? (Number(value) || 0) : (Number(prev.tariffAmount) || 0);
      const copayPct = field === 'copayPct' ? (Number(value) || 0) : (Number(prev.copayPct) || 0);
      const patientCopay = Math.round((tariff * copayPct) / 100);
      const coverageAmount = tariff - patientCopay;

      return {
        ...prev,
        [field]: value,
        patientCopay: String(patientCopay),
        coverageAmount: String(coverageAmount),
      };
    });
  };

  const handleSelectPatientForAuth = (patientOrClient: any) => {
    if (!patientOrClient) return;
    setSelectedAuthPatient(patientOrClient);
    setAuthForm((prev: any) => ({
      ...prev,
      clientName: patientOrClient.name || `${patientOrClient.firstName || ''} ${patientOrClient.lastName || ''}`.trim(),
      folderNumber: patientOrClient.folderNumber || patientOrClient.patientNumber || '',
      schemeCode: patientOrClient.schemeCode || prev.schemeCode,
    }));
  };

  const handleSaveNewAuth = async () => {
    if (!authForm.folderNumber || !authForm.clientName || !authForm.serviceName) {
      enqueueSnackbar('Patient name, hospital folder number, and service / procedure name are required', { variant: 'warning' });
      return;
    }
    setSavingAuth(true);
    try {
      const res = await api.post('/insurance/authorizations', authForm);
      enqueueSnackbar(res.data?.message || 'Prior-Authorization code issued and saved to PostgreSQL', { variant: 'success' });
      setOpenAddAuthDialog(false);
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to issue prior-authorization code', { variant: 'error' });
    } finally {
      setSavingAuth(false);
    }
  };

  const handleUpdateAuth = async () => {
    if (!authForm.folderNumber || !authForm.clientName || !authForm.serviceName || !editingAuthId) {
      enqueueSnackbar('Patient name, hospital folder number, and service name are required', { variant: 'warning' });
      return;
    }
    setSavingAuth(true);
    try {
      const res = await api.put(`/insurance/authorizations/${editingAuthId}`, authForm);
      enqueueSnackbar(res.data?.message || 'Authorization updated successfully in PostgreSQL', { variant: 'success' });
      setOpenEditAuthDialog(false);
      setEditingAuthId(null);
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update authorization', { variant: 'error' });
    } finally {
      setSavingAuth(false);
    }
  };

  const handleQuickUpdateAuthStatus = async (authId: string, status: string) => {
    try {
      const res = await api.patch(`/insurance/authorizations/${authId}/decision`, { status });
      enqueueSnackbar(res.data?.message || `Authorization marked as ${status}`, { variant: 'success' });
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update authorization status', { variant: 'error' });
    }
  };

  const handleOpenDeleteAuth = (auth: any) => {
    setDeletingAuth(auth);
    setOpenDeleteAuthDialog(true);
  };

  const handleConfirmDeleteAuth = async () => {
    if (!deletingAuth) return;
    try {
      const res = await api.delete(`/insurance/authorizations/${deletingAuth.id}`);
      enqueueSnackbar(res.data?.message || 'Authorization deleted successfully from PostgreSQL', { variant: 'success' });
      setOpenDeleteAuthDialog(false);
      setDeletingAuth(null);
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete authorization', { variant: 'error' });
    }
  };

  const handleExportAuthsCsv = () => {
    if (authorizations.length === 0) {
      enqueueSnackbar('No authorizations available to export', { variant: 'info' });
      return;
    }
    const headers = ['PA Code', 'Scheme Code', 'Scheme Name', 'Patient Name', 'Folder Number', 'Category', 'Service / Procedure', 'Requesting Doctor', 'Tariff Amount (NGN)', 'Coverage Amount (NGN)', 'Patient Co-Pay (NGN)', 'Request Date', 'Expiry Date', 'Status', 'Notes'];
    const rows = authorizations.map(a => [
      `"${a.paCode}"`,
      `"${a.schemeCode}"`,
      `"${(a.schemeName || '').replace(/"/g, '""')}"`,
      `"${(a.clientName || '').replace(/"/g, '""')}"`,
      `"${a.folderNumber}"`,
      `"${a.category}"`,
      `"${(a.serviceName || '').replace(/"/g, '""')}"`,
      `"${(a.requestingDoctor || '').replace(/"/g, '""')}"`,
      a.tariffAmount,
      a.coverageAmount,
      a.patientCopay,
      `"${a.requestDate || ''}"`,
      `"${a.expiryDate || ''}"`,
      `"${a.status || ''}"`,
      `"${(a.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Insurance_Authorizations_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    enqueueSnackbar(`Exported ${authorizations.length} prior-authorization records to CSV`, { variant: 'success' });
  };

  // Export Client & Enrollee Register to CSV (Satisfies Monthly & Master Registers)
  const handleExportRegister = () => {
    if (!filteredClients || filteredClients.length === 0) {
      enqueueSnackbar('No clients found to export for the selected filter', { variant: 'warning' });
      return;
    }

    const headers = [
      'Folder Number',
      'Folder Status',
      'Client Full Name',
      'Coverage Scope',
      'Dependents Count',
      'Covered Dependents',
      'Age',
      'Gender',
      'Phone Number',
      'Scheme Code',
      'Scheme Name',
      'Benefit Plan Tier',
      'Policy Number',
      'Enrollee National Number',
      'Primary Clinic Unit',
      'Registration Date / Effective Date',
      'Expiry Date',
      'Blood Group',
      'Genotype',
      'Residential Address',
      'Status'
    ];

    const rows = filteredClients.map(c => {
      const schemeMatch = schemes.find(s => s.code === c.schemeCode);
      const dependentsStr = c.coveredDependents?.map((d: any) => `${d.name} (${d.relationship})`).join('; ') || 'None';
      return [
        `"${c.folderNumber || ''}"`,
        `"${c.isProvisionalFolder ? 'PROVISIONAL' : 'LINKED'}"`,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${c.coverageScope || 'INDIVIDUAL'}"`,
        `"${c.coveredDependents?.length || 0}"`,
        `"${dependentsStr.replace(/"/g, '""')}"`,
        `"${c.age || ''}"`,
        `"${c.gender || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.schemeCode || ''}"`,
        `"${(schemeMatch?.name || c.schemeName || '').replace(/"/g, '""')}"`,
        `"${(c.planName || '').replace(/"/g, '""')}"`,
        `"${c.membershipNumber || ''}"`,
        `"${c.enrolleeNumber || ''}"`,
        `"${c.primaryUnit || 'OPD Clinic'}"`,
        `"${c.effectiveDate ? new Date(c.effectiveDate).toLocaleDateString() : ''}"`,
        `"${c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : ''}"`,
        `"${c.bloodGroup || ''}"`,
        `"${c.genotype || ''}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${c.status || 'ACTIVE'}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const periodLabel = selectedMonthFilter === 'ALL' ? 'All_Periods' : selectedMonthFilter;
    link.setAttribute('download', `Insurance_Enrollee_Register_${selectedSchemeFilter}_${periodLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    enqueueSnackbar(`Exported ${filteredClients.length} insurance enrollee records to CSV successfully`, { variant: 'success' });
  };

  // ── Tariffs & Code Master Actions ──────────────────────────────────────────
  const handleAddSchemeTariffRow = () => {
    const existingCodes = (tariffForm.schemeTariffs || []).map((st: any) => st.schemeCode);
    const availableScheme = schemes.find(s => !existingCodes.includes(s.code)) || schemes[0] || { code: 'OTHER_HMO', name: 'Other Insurance Scheme' };
    setTariffForm((prev: any) => ({
      ...prev,
      schemeTariffs: [
        ...(prev.schemeTariffs || []),
        {
          schemeCode: availableScheme.code,
          schemeName: availableScheme.name || availableScheme.shortName || availableScheme.code,
          tariffAmount: 0,
          isCapitated: true,
          copayPercentage: prev.copayPercentage || 10,
        }
      ]
    }));
  };

  const handleRemoveSchemeTariffRow = (index: number) => {
    setTariffForm((prev: any) => ({
      ...prev,
      schemeTariffs: (prev.schemeTariffs || []).filter((_: any, i: number) => i !== index)
    }));
  };

  const handleSchemeTariffFieldChange = (index: number, field: string, value: any) => {
    setTariffForm((prev: any) => {
      const updated = [...(prev.schemeTariffs || [])];
      if (field === 'schemeCode') {
        const found = schemes.find(s => s.code === value);
        updated[index] = {
          ...updated[index],
          schemeCode: value,
          schemeName: found?.name || found?.shortName || value,
        };
      } else if (field === 'isCapitated') {
        updated[index] = {
          ...updated[index],
          isCapitated: Boolean(value),
          tariffAmount: value ? 0 : (updated[index].tariffAmount || 5000),
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, schemeTariffs: updated };
    });
  };

  const handleAddAllSchemesToTariff = () => {
    const existingCodes = (tariffForm.schemeTariffs || []).map((st: any) => st.schemeCode);
    const unaddedSchemes = schemes.filter(s => !existingCodes.includes(s.code));
    if (unaddedSchemes.length === 0) {
      enqueueSnackbar('All configured health schemes are already added to this tariff item', { variant: 'info' });
      return;
    }
    const newRows = unaddedSchemes.map(s => ({
      schemeCode: s.code,
      schemeName: s.name || s.shortName || s.code,
      tariffAmount: s.code === 'NHIA' || s.code === 'ESAUHC' ? 0 : 4000,
      isCapitated: s.code === 'NHIA' || s.code === 'ESAUHC',
      copayPercentage: tariffForm.copayPercentage || 10,
    }));
    setTariffForm((prev: any) => ({
      ...prev,
      schemeTariffs: [...(prev.schemeTariffs || []), ...newRows]
    }));
    enqueueSnackbar(`Added ${unaddedSchemes.length} schemes to tariff schedule`, { variant: 'success' });
  };

  const handleSaveNewTariff = async () => {
    if (!tariffForm.category || !tariffForm.serviceName) {
      enqueueSnackbar('Category and Service / Procedure Name are required', { variant: 'warning' });
      return;
    }
    setSavingTariff(true);
    try {
      await api.post('/insurance/tariffs', tariffForm);
      enqueueSnackbar('Tariff created and saved to PostgreSQL successfully', { variant: 'success' });
      setOpenAddTariffDialog(false);
      setTariffForm({
        category: 'Consultation',
        serviceCode: '',
        serviceName: '',
        privateFee: 5000,
        nhiaTariff: 0,
        esauhcTariff: 0,
        mutualTariff: 0,
        hmoTariff: 4000,
        schemeTariffs: [],
        preAuthRule: 'Covered under Primary Plan',
        copayPercentage: 10,
      });
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create tariff', { variant: 'error' });
    } finally {
      setSavingTariff(false);
    }
  };

  const handleOpenEditTariff = (t: any) => {
    setEditingTariffId(t.id);
    let initialSchemes: any[] = [];
    if (Array.isArray(t.schemeTariffs) && t.schemeTariffs.length > 0) {
      initialSchemes = t.schemeTariffs.map((item: any) => ({
        schemeCode: item.schemeCode,
        schemeName: item.schemeName || schemes.find(s => s.code === item.schemeCode)?.name || item.schemeCode,
        tariffAmount: Number(item.tariffAmount || 0),
        isCapitated: item.isCapitated !== undefined ? Boolean(item.isCapitated) : (Number(item.tariffAmount || 0) === 0),
        copayPercentage: Number(item.copayPercentage ?? t.copayPercentage ?? 10),
      }));
    } else {
      // Synthesize from configured schemes and fallback columns
      initialSchemes = schemes.map(s => {
        let amount = 0;
        if (s.code === 'NHIA') amount = Number(t.nhiaTariff || 0);
        else if (s.code === 'ESAUHC') amount = Number(t.esauhcTariff || 0);
        else if (s.code === 'CHIKADIBIA' || s.code === 'NDMHS') amount = Number(t.mutualTariff || 0);
        else amount = Number(t.hmoTariff || 0);
        return {
          schemeCode: s.code,
          schemeName: s.name || s.shortName || s.code,
          tariffAmount: amount,
          isCapitated: amount === 0,
          copayPercentage: Number(t.copayPercentage || 10),
        };
      });
    }

    setTariffForm({
      category: t.category,
      serviceCode: t.serviceCode,
      serviceName: t.serviceName,
      privateFee: t.privateFee,
      nhiaTariff: t.nhiaTariff,
      esauhcTariff: t.esauhcTariff,
      mutualTariff: t.mutualTariff,
      hmoTariff: t.hmoTariff,
      schemeTariffs: initialSchemes,
      preAuthRule: t.preAuthRule,
      copayPercentage: t.copayPercentage,
    });
    setOpenEditTariffDialog(true);
  };

  const handleUpdateTariff = async () => {
    if (!tariffForm.category || !tariffForm.serviceName || !editingTariffId) {
      enqueueSnackbar('Category and Service / Procedure Name are required', { variant: 'warning' });
      return;
    }
    setSavingTariff(true);
    try {
      await api.put(`/insurance/tariffs/${editingTariffId}`, tariffForm);
      enqueueSnackbar('Tariff updated successfully in PostgreSQL', { variant: 'success' });
      setOpenEditTariffDialog(false);
      setEditingTariffId(null);
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update tariff', { variant: 'error' });
    } finally {
      setSavingTariff(false);
    }
  };

  const handleConfirmDeleteTariff = async () => {
    if (!deletingTariff) return;
    try {
      await api.delete(`/insurance/tariffs/${deletingTariff.id}`);
      enqueueSnackbar('Tariff deleted successfully from database', { variant: 'success' });
      setOpenDeleteTariffDialog(false);
      setDeletingTariff(null);
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete tariff', { variant: 'error' });
    }
  };

  const handleExportTariffsCsv = () => {
    if (tariffs.length === 0) {
      enqueueSnackbar('No tariffs available to export', { variant: 'info' });
      return;
    }
    const headers = ['Category', 'Service Code', 'Service / Procedure Name', 'Private Fee (NGN)', 'Configured Scheme Tariffs', 'Co-Pay %', 'Pre-Auth Rule'];
    const rows = tariffs.map(t => {
      const schemeRatesStr = (t.schemeTariffs && t.schemeTariffs.length > 0)
        ? t.schemeTariffs.map((st: any) => `${st.schemeCode}: ${st.isCapitated || Number(st.tariffAmount) === 0 ? 'Capitated (NGN 0)' : `NGN ${Number(st.tariffAmount).toLocaleString()}`}`).join('; ')
        : `NHIA: ${t.nhiaTariff}; ESAUHC: ${t.esauhcTariff}; Mutual: ${t.mutualTariff}; HMO: ${t.hmoTariff}`;
      return [
        `"${t.category}"`,
        `"${t.serviceCode}"`,
        `"${(t.serviceName || '').replace(/"/g, '""')}"`,
        t.privateFee,
        `"${schemeRatesStr.replace(/"/g, '""')}"`,
        t.copayPercentage,
        `"${(t.preAuthRule || '').replace(/"/g, '""')}"`,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Hospital_Insurance_Tariffs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    enqueueSnackbar(`Exported ${tariffs.length} tariff items to CSV successfully`, { variant: 'success' });
  };

  // Filtered Tariffs (Category + Search Query)
  const filteredTariffs = useMemo(() => {
    let res = [...tariffs];
    if (tariffCategoryFilter !== 'ALL') {
      res = res.filter(t => t.category === tariffCategoryFilter);
    }
    if (tariffSearch.trim()) {
      const q = tariffSearch.toLowerCase();
      res = res.filter(t =>
        t.serviceName?.toLowerCase().includes(q) ||
        t.serviceCode?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.preAuthRule?.toLowerCase().includes(q)
      );
    }
    return res;
  }, [tariffs, tariffCategoryFilter, tariffSearch]);

  // ── Accredited Units Actions ──────────────────────────────────────────────
  const handleOpenAddUnit = () => {
    const defaultSchemes = schemes.length > 0 ? schemes.map(s => s.code) : ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS', 'HYGEIA'];
    setUnitForm({
      unitName: '',
      code: '',
      accreditationLevel: 'PRIMARY_SECONDARY',
      leadOfficer: '',
      schemesCovered: defaultSchemes,
      accreditationDate: new Date().toISOString().slice(0, 10),
      renewalDate: '2027-12-31',
      status: 'ACCREDITED',
      services: '',
    });
    setOpenAddUnitDialog(true);
  };

  const handleOpenEditUnit = (unit: any) => {
    setEditingUnitId(unit.id);
    let schemesList: string[] = [];
    if (Array.isArray(unit.schemesCovered)) {
      schemesList = unit.schemesCovered;
    } else if (typeof unit.schemesCovered === 'string') {
      try {
        schemesList = JSON.parse(unit.schemesCovered);
      } catch {
        schemesList = [];
      }
    }
    setUnitForm({
      unitName: unit.unitName || '',
      code: unit.code || '',
      accreditationLevel: unit.accreditationLevel || 'PRIMARY_SECONDARY',
      leadOfficer: unit.leadOfficer || '',
      schemesCovered: schemesList,
      accreditationDate: unit.accreditationDate || new Date().toISOString().slice(0, 10),
      renewalDate: unit.renewalDate || '2027-12-31',
      status: unit.status || 'ACCREDITED',
      services: unit.services || '',
    });
    setOpenEditUnitDialog(true);
  };

  const handleToggleUnitScheme = (schemeCode: string) => {
    setUnitForm((prev: any) => {
      const current = prev.schemesCovered || [];
      const updated = current.includes(schemeCode)
        ? current.filter((c: string) => c !== schemeCode)
        : [...current, schemeCode];
      return { ...prev, schemesCovered: updated };
    });
  };

  const handleSelectAllUnitSchemes = () => {
    const allCodes = schemes.map(s => s.code);
    setUnitForm((prev: any) => ({
      ...prev,
      schemesCovered: allCodes.length > 0 ? allCodes : ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS', 'HYGEIA'],
    }));
  };

  const handleClearAllUnitSchemes = () => {
    setUnitForm((prev: any) => ({
      ...prev,
      schemesCovered: [],
    }));
  };

  const handleSaveNewUnit = async () => {
    if (!unitForm.unitName) {
      enqueueSnackbar('Hospital Unit Name is required', { variant: 'warning' });
      return;
    }
    setSavingUnit(true);
    try {
      await api.post('/insurance/accredited-units', unitForm);
      enqueueSnackbar(`Accredited unit "${unitForm.unitName}" saved to PostgreSQL successfully`, { variant: 'success' });
      setOpenAddUnitDialog(false);
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save accredited unit', { variant: 'error' });
    } finally {
      setSavingUnit(false);
    }
  };

  const handleUpdateUnit = async () => {
    if (!unitForm.unitName || !editingUnitId) {
      enqueueSnackbar('Hospital Unit Name is required', { variant: 'warning' });
      return;
    }
    setSavingUnit(true);
    try {
      await api.put(`/insurance/accredited-units/${editingUnitId}`, unitForm);
      enqueueSnackbar(`Accredited unit "${unitForm.unitName}" updated successfully in PostgreSQL`, { variant: 'success' });
      setOpenEditUnitDialog(false);
      setEditingUnitId(null);
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update accredited unit', { variant: 'error' });
    } finally {
      setSavingUnit(false);
    }
  };

  const handleOpenDeleteUnit = (unit: any) => {
    setDeletingUnit(unit);
    setOpenDeleteUnitDialog(true);
  };

  const handleConfirmDeleteUnit = async () => {
    if (!deletingUnit) return;
    try {
      await api.delete(`/insurance/accredited-units/${deletingUnit.id}`);
      enqueueSnackbar(`Accredited unit "${deletingUnit.unitName}" deleted successfully from PostgreSQL`, { variant: 'success' });
      setOpenDeleteUnitDialog(false);
      setDeletingUnit(null);
      fetchAllData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete accredited unit', { variant: 'error' });
    }
  };

  // Filtered Accredited Units
  const filteredAccreditedUnits = useMemo(() => {
    let res = [...accreditedUnits];
    if (unitLevelFilter !== 'ALL') {
      res = res.filter(u => u.accreditationLevel === unitLevelFilter);
    }
    if (unitStatusFilter !== 'ALL') {
      res = res.filter(u => u.status === unitStatusFilter);
    }
    if (unitSearch.trim()) {
      const q = unitSearch.toLowerCase();
      res = res.filter(u =>
        u.unitName?.toLowerCase().includes(q) ||
        u.code?.toLowerCase().includes(q) ||
        u.leadOfficer?.toLowerCase().includes(q) ||
        u.services?.toLowerCase().includes(q) ||
        (Array.isArray(u.schemesCovered) && u.schemesCovered.some((s: string) => s.toLowerCase().includes(q)))
      );
    }
    return res;
  }, [accreditedUnits, unitLevelFilter, unitStatusFilter, unitSearch]);

  // Filtered Authorizations (Scheme + Category + Status + Search Query)
  const filteredAuthorizations = useMemo(() => {
    let res = [...authorizations];
    if (authSchemeFilter !== 'ALL') {
      res = res.filter(a => a.schemeCode === authSchemeFilter);
    }
    if (authCategoryFilter !== 'ALL') {
      res = res.filter(a => a.category === authCategoryFilter);
    }
    if (authStatusFilter !== 'ALL') {
      res = res.filter(a => a.status === authStatusFilter);
    }
    if (authSearch.trim()) {
      const q = authSearch.toLowerCase();
      res = res.filter(a =>
        a.clientName?.toLowerCase().includes(q) ||
        a.folderNumber?.toLowerCase().includes(q) ||
        a.paCode?.toLowerCase().includes(q) ||
        a.serviceName?.toLowerCase().includes(q) ||
        a.requestingDoctor?.toLowerCase().includes(q) ||
        a.schemeCode?.toLowerCase().includes(q)
      );
    }
    return res;
  }, [authorizations, authSchemeFilter, authCategoryFilter, authStatusFilter, authSearch]);

  // Filtered Clients (Scheme + Reporting Month + Search Term)
  const filteredClients = useMemo(() => {
    let res = [...clients];
    if (selectedSchemeFilter !== 'ALL') {
      res = res.filter(c => c.schemeCode === selectedSchemeFilter);
    }
    if (selectedMonthFilter !== 'ALL') {
      res = res.filter(c => {
        if (!c.effectiveDate) return false;
        return c.effectiveDate.startsWith(selectedMonthFilter);
      });
    }
    if (clientSearch.trim()) {
      const q = clientSearch.toLowerCase();
      res = res.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.folderNumber?.toLowerCase().includes(q) ||
        c.membershipNumber?.toLowerCase().includes(q) ||
        c.enrolleeNumber?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.coveredDependents?.some((d: any) => d.name?.toLowerCase().includes(q))
      );
    }
    return res;
  }, [clients, selectedSchemeFilter, selectedMonthFilter, clientSearch]);

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* ══════════════════════════════════════════════════════════════════════
          PAGE HEADER
         ══════════════════════════════════════════════════════════════════════ */}
      <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: C.blue, width: 44, height: 44 }}>
              <Shield sx={{ fontSize: 26, color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: C.navy, letterSpacing: '-0.02em' }}>
                Health Insurance & HMO Department
              </Typography>
              <Typography variant="body2" sx={{ color: C.gray }}>
                Schemes Configuration, Client Registry, External Verification Desk, Capitation & Cashier Billing
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchAllData}
            sx={{ borderRadius: 2, borderColor: '#cbd5e1', color: C.navy, textTransform: 'none', fontWeight: 600 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenAddClientDialog(true)}
            sx={{ borderRadius: 2, bgcolor: C.blue, color: '#fff', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: C.navy } }}
          >
            Enroll Hospital Patient
          </Button>
        </Stack>
      </Box>

      {/* ══════════════════════════════════════════════════════════════════════
          DYNAMIC SCHEMES OVERVIEW METRIC CARDS
         ══════════════════════════════════════════════════════════════════════ */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {schemes.slice(0, 4).map((s) => {
          const schemeClients = clients.filter(c => c.schemeCode === s.code);
          return (
            <Grid item xs={12} sm={6} md={3} key={s.code}>
              <Card
                onClick={() => {
                  setSelectedSchemeFilter(s.code);
                  setTabValue(0);
                }}
                sx={{
                  borderRadius: 3,
                  p: 2,
                  bgcolor: '#fff',
                  border: `1.5px solid ${selectedSchemeFilter === s.code ? s.color || C.blue : '#e2e8f0'}`,
                  boxShadow: selectedSchemeFilter === s.code ? `0 8px 24px ${alpha(s.color || C.blue, 0.18)}` : '0 1px 3px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': { transform: 'translateY(-2px)', borderColor: s.color || C.blue }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Chip
                    label={s.badge || 'Health Scheme'}
                    size="small"
                    sx={{ bgcolor: alpha(s.color || C.blue, 0.12), color: s.color || C.blue, fontWeight: 700, fontSize: '0.7rem' }}
                  />
                  <Avatar sx={{ bgcolor: alpha(s.color || C.blue, 0.15), color: s.color || C.blue, width: 32, height: 32 }}>
                    <HealthAndSafety sx={{ fontSize: 18 }} />
                  </Avatar>
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.navy, lineHeight: 1.25, height: 36, overflow: 'hidden' }}>
                  {s.shortName || s.name}
                </Typography>
                <Typography variant="caption" sx={{ color: C.gray, display: 'block', mt: 0.5 }}>
                  Capitation: ₦{s.defaultCapitationRate?.toLocaleString()}/head · Co-Pay: {s.defaultCopayPercentage}%
                </Typography>
                <Divider sx={{ my: 1.2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: C.gray, fontSize: '0.78rem' }}>
                    Active Enrollees
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: s.color || C.blue }}>
                    {schemeClients.length.toLocaleString()}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN TABS CONTAINER
         ══════════════════════════════════════════════════════════════════════ */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff', px: 2 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.86rem', py: 1.8, minHeight: 48 },
              '& .Mui-selected': { color: C.blue },
              '& .MuiTabs-indicator': { bgcolor: C.blue, height: 3 }
            }}
          >
            <Tab icon={<PolicyIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Schemes & Client Registry (${clients.length})`} />
            <Tab icon={<Settings sx={{ fontSize: 16 }} />} iconPosition="start" label={`Schemes Configuration (${schemes.length})`} />
            {/* <Tab icon={<ContactPhone sx={{ fontSize: 16 }} />} iconPosition="start" label="Coverage Verification & HMO Desk" /> */}
            {/* <Tab icon={<DateRange sx={{ fontSize: 16 }} />} iconPosition="start" label={`Monthly Enrollee Register (${monthlyRegisters.length})`} /> // Merged into Tab 0 */}
            <Tab icon={<LocalAtm sx={{ fontSize: 16 }} />} iconPosition="start" label="Monthly Capitation" />
            <Tab icon={<Receipt sx={{ fontSize: 16 }} />} iconPosition="start" label={`Fee-For-Service (FFS) Claims (${ffsClaims.length})`} />
            <Tab icon={<Assignment sx={{ fontSize: 16 }} />} iconPosition="start" label={`Authorization Codes & Bill Chart (${authorizations.length})`} />
            <Tab icon={<Business sx={{ fontSize: 16 }} />} iconPosition="start" label={`Accredited Hospital Units (${accreditedUnits.length})`} />
            <Tab icon={<Assessment sx={{ fontSize: 16 }} />} iconPosition="start" label="Insurance Audit & Daily Receipts" />
            <Tab icon={<Description sx={{ fontSize: 16 }} />} iconPosition="start" label="Tariffs & Code Master" />
          </Tabs>
        </Box>

        <CardContent sx={{ p: { xs: 1.5, md: 2.5 }, bgcolor: '#fff' }}>
          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 0: SCHEMES & CLIENT REGISTRY (MERGED WITH MONTHLY REGISTER)
             ══════════════════════════════════════════════════════════════════ */}
          {tabValue === 0 && (
            <Box>
              {/* Filter Chips Bar */}
              <Stack direction="row" spacing={1} sx={{ mb: 2.5, overflowX: 'auto', pb: 0.5 }} alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 700, color: C.navy, mr: 1 }}>Filter Scheme:</Typography>
                <Chip
                  label={`All Schemes (${clients.length})`}
                  clickable
                  onClick={() => setSelectedSchemeFilter('ALL')}
                  color={selectedSchemeFilter === 'ALL' ? 'primary' : 'default'}
                  sx={{ fontWeight: 700 }}
                />
                {schemes.map(s => (
                  <Chip
                    key={s.code}
                    label={`${s.shortName || s.name} (${clients.filter(c => c.schemeCode === s.code).length})`}
                    clickable
                    onClick={() => setSelectedSchemeFilter(s.code)}
                    sx={{
                      fontWeight: 700,
                      bgcolor: selectedSchemeFilter === s.code ? alpha(s.color || C.blue, 0.9) : '#f1f5f9',
                      color: selectedSchemeFilter === s.code ? '#fff' : C.navy,
                    }}
                  />
                ))}
              </Stack>

              {/* Search, Reporting Month & Actions Bar */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Search by Client Name, Folder Number, Policy No, NIN, Phone..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                    }}
                    sx={{ width: { xs: '100%', sm: 300 } }}
                  />

                  <TextField
                    select
                    size="small"
                    label="Registration Period / Month"
                    value={selectedMonthFilter}
                    onChange={(e) => setSelectedMonthFilter(e.target.value)}
                    sx={{ width: 200 }}
                  >
                    <MenuItem value="ALL">All Enrollee Periods</MenuItem>
                    <MenuItem value="2026-09">September 2026</MenuItem>
                    <MenuItem value="2026-08">August 2026</MenuItem>
                    <MenuItem value="2026-07">July 2026</MenuItem>
                  </TextField>

                  <Chip
                    label={`Showing ${filteredClients.length} Enrollee${filteredClients.length === 1 ? '' : 's'}`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>

                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    startIcon={<FileDownload />}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                    onClick={handleExportRegister}
                  >
                    Export Register (CSV)
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      resetClientForm();
                      setOpenAddClientDialog(true);
                    }}
                    sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Enroll Client into Scheme
                  </Button>
                </Stack>
              </Box>

              {/* Client Registry Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: C.navy }}>Folder & Status</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: C.navy }}>Client / Principal</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: C.navy }}>Coverage Scope</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: C.navy }}>Age / Gender</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: C.navy }}>Phone Number</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: C.navy }}>Scheme & Plan</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: C.navy }}>Policy / Enrollee No.</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: C.navy }}>Residential Address</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: C.navy }}>Blood / Genotype</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: C.navy }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: C.navy }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} align="center" sx={{ py: 4, color: C.gray }}>
                          No insured clients found matching the selected filter. Click "Enroll Client into Scheme" to add an enrollee.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClients.map((client) => {
                        const schemeMatch = schemes.find(s => s.code === client.schemeCode);
                        return (
                          <TableRow key={client.id} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: client.isProvisionalFolder ? C.amber : C.blue, fontFamily: 'monospace' }}>
                                #{client.folderNumber}
                              </Typography>
                              {client.isProvisionalFolder ? (
                                <Tooltip title="Provisional Folder issued at insurance registration. Records personnel can link a permanent hospital folder anytime.">
                                  <Chip label="PROVISIONAL" size="small" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 800, fontSize: '0.6rem', height: 18 }} />
                                </Tooltip>
                              ) : (
                                <Chip label="LINKED FOLDER" size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: C.navy }}>
                                {client.name}
                              </Typography>
                              {client.coveredDependents && client.coveredDependents.length > 0 && (
                                <Tooltip title={`Covered Dependents: ${client.coveredDependents.map((d: any) => `${d.name} (${d.relationship})`).join(', ')}`}>
                                  <Typography variant="caption" sx={{ color: C.purple, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <FamilyRestroom sx={{ fontSize: 13 }} /> +{client.coveredDependents.length} Dependent{client.coveredDependents.length > 1 ? 's' : ''}
                                  </Typography>
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={client.coverageScope === 'FAMILY' ? <FamilyRestroom sx={{ fontSize: '13px !important' }} /> : <Person sx={{ fontSize: '13px !important' }} />}
                                label={client.coverageScope === 'FAMILY' ? `Family (${client.coveredDependents?.length || 0} Dep.)` : client.coverageScope === 'CORPORATE_GROUP' ? 'Corporate' : 'Individual (Self)'}
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  borderColor: client.coverageScope === 'FAMILY' ? '#c084fc' : '#cbd5e1',
                                  color: client.coverageScope === 'FAMILY' ? C.purple : C.navy,
                                  bgcolor: client.coverageScope === 'FAMILY' ? '#faf5ff' : 'transparent',
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {client.age} yrs · {client.gender}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                              {client.phone}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={schemeMatch?.shortName || client.schemeName}
                                size="small"
                                sx={{
                                  bgcolor: alpha(schemeMatch?.color || C.blue, 0.12),
                                  color: schemeMatch?.color || C.blue,
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  mb: 0.3
                                }}
                              />
                              <Typography variant="caption" sx={{ display: 'block', color: C.gray, fontSize: '0.7rem' }}>
                                {client.planName}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: C.navy }}>
                              {client.membershipNumber}
                            </TableCell>
                            <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Tooltip title={client.address}><Typography variant="caption">{client.address}</Typography></Tooltip>
                            </TableCell>
                            <TableCell>
                              <Chip label={`${client.bloodGroup} · ${client.genotype}`} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.68rem' }} />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={client.status}
                                size="small"
                                color={client.status === 'ACTIVE' ? 'success' : 'warning'}
                                sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                <Tooltip title="Link / Update Hospital Patient Folder (Records Staff)">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenLinkFolder(client)}
                                    sx={{ color: client.isProvisionalFolder ? C.amber : C.gray, '&:hover': { color: C.blue, bgcolor: '#eff6ff' } }}
                                  >
                                    <LinkIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: SCHEMES CONFIGURATION & POLICY SETUP
             ══════════════════════════════════════════════════════════════════ */}
          {tabValue === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: C.navy }}>
                    Health Insurance Schemes Master Directory
                  </Typography>
                  <Typography variant="body2" sx={{ color: C.gray }}>
                    Configure statutory schemes, state agencies, mutual health agencies, faith-based schemes & private HMOs operating at the hospital.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setOpenAddSchemeDialog(true)}
                  sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Configure New Scheme
                </Button>
              </Box>

              <Grid container spacing={2.5}>
                {schemes.map((scheme) => (
                  <Grid item xs={12} md={6} key={scheme.code}>
                    <Card variant="outlined" sx={{ borderRadius: 3, border: `1.5px solid ${alpha(scheme.color || C.blue, 0.4)}`, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <Box sx={{ p: 2.5, bgcolor: alpha(scheme.color || C.blue, 0.04), borderBottom: '1px solid #e2e8f0' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar sx={{ bgcolor: scheme.color || C.blue, color: '#fff', width: 36, height: 36 }}>
                              <HealthAndSafety fontSize="small" />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.navy, lineHeight: 1.2 }}>
                                {scheme.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: C.gray, fontWeight: 700 }}>
                                Code: {scheme.code} · {SCHEME_CATEGORY_LABELS[scheme.category]?.label || scheme.category}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={0.8} alignItems="center">
                            <Chip
                              label={scheme.isActive ? 'ACTIVE' : 'INACTIVE'}
                              color={scheme.isActive ? 'success' : 'default'}
                              size="small"
                              sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                            />
                            <Tooltip title="Edit Scheme Configuration">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEditScheme(scheme)}
                                sx={{
                                  bgcolor: '#eff6ff',
                                  color: C.blue,
                                  border: '1px solid #bfdbfe',
                                  '&:hover': { bgcolor: '#dbeafe' },
                                  width: 32,
                                  height: 32,
                                }}
                              >
                                <Edit sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Scheme">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDeleteScheme(scheme)}
                                sx={{
                                  bgcolor: '#fef2f2',
                                  color: C.red,
                                  border: '1px solid #fecaca',
                                  '&:hover': { bgcolor: '#fee2e2' },
                                  width: 32,
                                  height: 32,
                                }}
                              >
                                <Delete sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>

                        <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.82rem', mt: 1 }}>
                          {scheme.description}
                        </Typography>
                      </Box>

                      <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: C.gray, fontWeight: 600 }}>Default Capitation Rate</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: C.navy }}>
                              ₦{scheme.defaultCapitationRate?.toLocaleString()} / head
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: C.gray, fontWeight: 600 }}>Standard Patient Co-Pay</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: C.amber }}>
                              {scheme.defaultCopayPercentage}% Co-Payment
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: C.gray, fontWeight: 600 }}>Accreditation Status</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: C.green }}>
                              {scheme.accreditedStatus} (Expires {scheme.accreditationExpiry || '2027-12-31'})
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: C.gray, fontWeight: 600 }}>Enrollee Count in Hospital</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: C.blue }}>
                              {clients.filter(c => c.schemeCode === scheme.code).length} Insured Patients
                            </Typography>
                          </Grid>
                        </Grid>

                        <Divider sx={{ my: 1.5 }} />

                        <Typography variant="caption" sx={{ fontWeight: 800, color: C.navy, display: 'block', mb: 1 }}>
                          Contact & External Verification Channel:
                        </Typography>
                        <Stack spacing={0.6}>
                          {scheme.phone && (
                            <Typography variant="caption" sx={{ color: '#334155', display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PhoneInTalk sx={{ fontSize: 14, color: C.blue }} /> Hotline: {scheme.phone}
                            </Typography>
                          )}
                          {scheme.email && (
                            <Typography variant="caption" sx={{ color: '#334155', display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Email sx={{ fontSize: 14, color: C.teal }} /> Email: {scheme.email}
                            </Typography>
                          )}
                          {scheme.portalUrl && (
                            <Typography variant="caption" sx={{ color: '#334155', display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Public sx={{ fontSize: 14, color: C.purple }} /> External Portal: <a href={scheme.portalUrl} target="_blank" rel="noreferrer" style={{ color: C.indigo }}>{scheme.portalUrl}</a>
                            </Typography>
                          )}
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        <Typography variant="caption" sx={{ fontWeight: 800, color: C.navy, display: 'block', mb: 1 }}>
                          Benefit Plans Configured:
                        </Typography>
                        <Stack spacing={0.8} sx={{ mb: 2 }}>
                          {scheme.plans?.map((pl: any, idx: number) => (
                            <Box key={idx} sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: C.navy }}>
                                {pl.name}
                              </Typography>
                              <Chip
                                label={`Limit: ₦${(pl.maxAnnualLimit || 1000000).toLocaleString()}`}
                                size="small"
                                sx={{ fontSize: '0.68rem', fontWeight: 600 }}
                              />
                            </Box>
                          ))}
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Edit fontSize="small" />}
                            onClick={() => handleOpenEditScheme(scheme)}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#bfdbfe', color: C.blue, '&:hover': { bgcolor: '#eff6ff' } }}
                          >
                            Edit Scheme
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Delete fontSize="small" />}
                            onClick={() => handleOpenDeleteScheme(scheme)}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#fecaca', color: C.red, '&:hover': { bgcolor: '#fef2f2' } }}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB: COVERAGE VERIFICATION & HMO DESK (COMMENTED OUT: UNIFIED IN CASHIER DESK)
             ══════════════════════════════════════════════════════════════════ */}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: MONTHLY CAPITATION
             ══════════════════════════════════════════════════════════════════ */}
          {tabValue === 2 && (
            <Box>
              {/* Summary KPIs */}
              <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
                    <Typography variant="caption" sx={{ color: C.gray, fontWeight: 700 }}>Total Expected Capitation</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.navy, mt: 0.5 }}>
                      ₦{(capitationSummary.totalExpected || 0).toLocaleString()}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f0fdf4' }}>
                    <Typography variant="caption" sx={{ color: C.green, fontWeight: 700 }}>Total Remitted / Received</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.green, mt: 0.5 }}>
                      ₦{(capitationSummary.totalReceived || 0).toLocaleString()}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: capitationSummary.totalVariance < 0 ? '#fef2f2' : '#f8fafc' }}>
                    <Typography variant="caption" sx={{ color: capitationSummary.totalVariance < 0 ? C.red : C.gray, fontWeight: 700 }}>
                      Reconciliation Variance
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: capitationSummary.totalVariance < 0 ? C.red : C.navy, mt: 0.5 }}>
                      ₦{(capitationSummary.totalVariance || 0).toLocaleString()}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.navy }}>
                  Capitation Ledger & Monthly Bank Remittance
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setOpenAddCapitationDialog(true)}
                  sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Record Monthly Capitation
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Month</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Scheme</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Enrollee Count</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Rate / Head</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Expected (₦)</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Received (₦)</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Variance</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Bank Reference No.</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {capitationLedger.map((cap) => (
                      <TableRow key={cap.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{cap.month}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{cap.schemeCode}</TableCell>
                        <TableCell>{cap.enrolleeCount?.toLocaleString()}</TableCell>
                        <TableCell>₦{cap.ratePerHead}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>₦{cap.expectedAmount?.toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: C.green }}>₦{cap.receivedAmount?.toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: cap.variance < 0 ? C.red : C.green }}>
                          {cap.variance === 0 ? '₦0' : `₦${cap.variance?.toLocaleString()}`}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{cap.bankReference}</TableCell>
                        <TableCell>
                          <Chip
                            label={cap.status}
                            size="small"
                            color={cap.status === 'RECONCILED' ? 'success' : 'warning'}
                            sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: FEE-FOR-SERVICE (FFS) CLAIMS
             ══════════════════════════════════════════════════════════════════ */}
          {tabValue === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.navy }}>
                    Monthly Secondary Care Fee-For-Service (FFS) Claims Schedule
                  </Typography>
                  <Typography variant="body2" sx={{ color: C.gray }}>
                    Claims billed for surgeries, high-resolution scans, specialist reviews & admissions outside primary capitation.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setOpenAddFfsDialog(true)}
                  sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Submit FFS Claim
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Claim No.</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Client & Folder</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Scheme</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Service Description</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>PA Code</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Tariff (₦)</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Claimed (₦)</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Co-Pay (₦)</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ffsClaims.map((claim) => (
                      <TableRow key={claim.id} hover>
                        <TableCell sx={{ fontWeight: 800, color: C.blue, fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          {claim.claimNumber}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{claim.clientName}</Typography>
                          <Typography variant="caption" sx={{ color: C.gray }}>Folder: {claim.folderNumber}</Typography>
                        </TableCell>
                        <TableCell><Chip label={claim.schemeCode} size="small" sx={{ fontWeight: 700 }} /></TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>{claim.serviceDescription}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{claim.paCode}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>₦{claim.tariffAmount?.toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: C.blue }}>₦{claim.claimedAmount?.toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: C.amber }}>₦{claim.copayAmount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip
                            label={claim.status}
                            size="small"
                            color={claim.status === 'PAID' ? 'success' : (claim.status === 'APPROVED' ? 'info' : 'warning')}
                            sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: AUTHORIZATION CODES (PA) & SERVICE BILL CHART (CRUD)
             ══════════════════════════════════════════════════════════════════ */}
          {tabValue === 4 && (
            <Box>
              {/* Header & Controls */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: C.navy, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Key sx={{ color: C.blue }} /> Clinical Prior-Authorization Codes & Itemized Service Bill Chart
                  </Typography>
                  <Typography variant="body2" sx={{ color: C.gray }}>
                    Manage and issue prior-authorization codes for laboratory diagnostics, medical imaging, surgical operations, specialty medications, and specialist consultations. Pulled live from PostgreSQL.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    startIcon={<FileDownload />}
                    onClick={handleExportAuthsCsv}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: '#cbd5e1', color: C.navy }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Print />}
                    onClick={() => setOpenPrintBillDialog(true)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: C.blue, color: C.blue }}
                  >
                    Print Service Bill Chart
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleOpenAddAuth}
                    sx={{ bgcolor: C.blue, '&:hover': { bgcolor: '#172554' }, textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 2.5 }}
                  >
                    Issue PA Code
                  </Button>
                </Stack>
              </Box>

              {/* Summary KPIs Row */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderLeft: `4px solid ${C.blue}`, bgcolor: '#ffffff' }}>
                    <Typography variant="caption" sx={{ color: C.gray, fontWeight: 700, textTransform: 'uppercase' }}>Total Authorized Items</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: C.navy, mt: 0.5 }}>
                      {authorizations.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.blue, fontWeight: 600 }}>Active in Database</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderLeft: `4px solid ${C.indigo}`, bgcolor: '#ffffff' }}>
                    <Typography variant="caption" sx={{ color: C.gray, fontWeight: 700, textTransform: 'uppercase' }}>Gross Service Bill</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: C.navy, mt: 0.5 }}>
                      ₦{authorizations.reduce((s, a) => s + (a.tariffAmount || 0), 0).toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.gray, fontWeight: 600 }}>Cumulative Statutory Tariff</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderLeft: `4px solid ${C.green}`, bgcolor: '#ffffff' }}>
                    <Typography variant="caption" sx={{ color: C.green, fontWeight: 700, textTransform: 'uppercase' }}>Total HMO Coverage</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: C.green, mt: 0.5 }}>
                      ₦{authorizations.reduce((s, a) => s + (a.coverageAmount || 0), 0).toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.green, fontWeight: 600 }}>Claimable from HMOs</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderLeft: `4px solid ${C.amber}`, bgcolor: '#ffffff' }}>
                    <Typography variant="caption" sx={{ color: C.amber, fontWeight: 700, textTransform: 'uppercase' }}>Patient Co-Payment</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: C.amber, mt: 0.5 }}>
                      ₦{authorizations.reduce((s, a) => s + (a.patientCopay || 0), 0).toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.amber, fontWeight: 600 }}>Point-of-Care Collections</Typography>
                  </Card>
                </Grid>
              </Grid>

              {/* Filters & Search Toolbar */}
              <Card variant="outlined" sx={{ p: 2, borderRadius: 2.5, mb: 3, bgcolor: '#f8fafc' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search patient, folder number, PA code, doctor, procedure..."
                      value={authSearch}
                      onChange={(e) => setAuthSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ color: C.gray, fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: authSearch ? (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setAuthSearch('')}>
                              <Close fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : null
                      }}
                      sx={{ bgcolor: 'white', borderRadius: 1.5 }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4} md={2.5}>
                    <FormControl fullWidth size="small" sx={{ bgcolor: 'white', borderRadius: 1.5 }}>
                      <InputLabel>Scheme</InputLabel>
                      <Select
                        value={authSchemeFilter}
                        label="Scheme"
                        onChange={(e) => setAuthSchemeFilter(e.target.value)}
                      >
                        <MenuItem value="ALL">All Enrolled Schemes</MenuItem>
                        {schemes.map(s => (
                          <MenuItem key={s.code} value={s.code}>{s.shortName || s.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={4} md={3}>
                    <FormControl fullWidth size="small" sx={{ bgcolor: 'white', borderRadius: 1.5 }}>
                      <InputLabel>Clinical Category</InputLabel>
                      <Select
                        value={authCategoryFilter}
                        label="Clinical Category"
                        onChange={(e) => setAuthCategoryFilter(e.target.value)}
                      >
                        <MenuItem value="ALL">All Clinical Categories</MenuItem>
                        <MenuItem value="LABORATORY">🔬 Laboratory Diagnostics</MenuItem>
                        <MenuItem value="RADIOLOGY">🩻 Radiology & Scans</MenuItem>
                        <MenuItem value="SURGERY">💉 Surgical Operations</MenuItem>
                        <MenuItem value="MEDICATION">💊 Specialized Medication</MenuItem>
                        <MenuItem value="SPECIALIST_CONSULTATION">👨‍⚕️ Specialist Consultation</MenuItem>
                        <MenuItem value="ADMISSION">🛏️ Inpatient Admission</MenuItem>
                        <MenuItem value="PROCEDURE">📋 Minor Procedures</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={4} md={2.5}>
                    <FormControl fullWidth size="small" sx={{ bgcolor: 'white', borderRadius: 1.5 }}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={authStatusFilter}
                        label="Status"
                        onChange={(e) => setAuthStatusFilter(e.target.value)}
                      >
                        <MenuItem value="ALL">All Statuses</MenuItem>
                        <MenuItem value="APPROVED">Approved (Active)</MenuItem>
                        <MenuItem value="PENDING">Pending Review</MenuItem>
                        <MenuItem value="USED">Claimed / Used</MenuItem>
                        <MenuItem value="REJECTED">Declined / Rejected</MenuItem>
                        <MenuItem value="EXPIRED">Expired</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Card>

              {/* Authorizations Table */}
              {filteredAuthorizations.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3, bgcolor: '#f8fafc' }}>
                  <Key sx={{ fontSize: 48, color: C.gray, opacity: 0.5, mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: C.navy }}>
                    No Prior-Authorizations Found
                  </Typography>
                  <Typography variant="body2" sx={{ color: C.gray, mt: 0.5, mb: 2 }}>
                    {authSearch || authSchemeFilter !== 'ALL' || authCategoryFilter !== 'ALL' || authStatusFilter !== 'ALL'
                      ? 'No authorization records match your active search or filter criteria.'
                      : 'No prior-authorization codes have been issued yet.'}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleOpenAddAuth}
                    sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700 }}
                  >
                    Issue First PA Code
                  </Button>
                </Paper>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>PA Code</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Client & Folder</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Scheme</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Service / Procedure</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Gross Tariff (₦)</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>HMO Cover (₦)</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Co-Pay (₦)</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Validity / Expiry</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAuthorizations.map((auth) => {
                        const isApproved = auth.status === 'APPROVED';
                        const isPending = auth.status === 'PENDING';
                        const isUsed = auth.status === 'USED';
                        const isRejected = auth.status === 'REJECTED';

                        return (
                          <TableRow key={auth.id} hover>
                            <TableCell sx={{ fontWeight: 800, color: C.blue, fontFamily: 'monospace', fontSize: '0.82rem' }}>
                              {auth.paCode}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: C.navy }}>{auth.clientName}</Typography>
                              <Typography variant="caption" sx={{ color: C.gray }}>Folder: <strong>{auth.folderNumber}</strong></Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={auth.schemeCode}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  bgcolor: auth.schemeCode === 'NHIA' ? alpha(C.green, 0.12) :
                                           auth.schemeCode === 'ESAUHC' ? alpha(C.teal, 0.12) :
                                           auth.schemeCode === 'CHIKADIBIA' || auth.schemeCode === 'NDMHS' ? alpha(C.purple, 0.12) :
                                           alpha(C.blue, 0.12),
                                  color: auth.schemeCode === 'NHIA' ? C.green :
                                         auth.schemeCode === 'ESAUHC' ? C.teal :
                                         auth.schemeCode === 'CHIKADIBIA' || auth.schemeCode === 'NDMHS' ? C.purple :
                                         C.blue,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ maxWidth: 220 }}>
                              <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{auth.serviceName}</Typography>
                              <Typography variant="caption" sx={{ color: C.gray, display: 'block' }}>Doc: {auth.requestingDoctor || 'Attending Physician'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={auth.category?.replace(/_/g, ' ')} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, color: C.navy }}>₦{Number(auth.tariffAmount || 0).toLocaleString()}</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: C.green }}>₦{Number(auth.coverageAmount || 0).toLocaleString()}</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: C.amber }}>₦{Number(auth.patientCopay || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ display: 'block', color: C.navy }}>
                                Req: {auth.requestDate || 'N/A'}
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block', color: C.amber, fontWeight: 700 }}>
                                Exp: {auth.expiryDate || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={auth.status}
                                size="small"
                                color={isApproved ? 'success' : isPending ? 'warning' : isUsed ? 'info' : isRejected ? 'error' : 'default'}
                                sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                              />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                {auth.status === 'APPROVED' && (
                                  <Tooltip title="Mark as Claimed / Used at Clinic">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleQuickUpdateAuthStatus(auth.id, 'USED')}
                                      sx={{ color: C.green, bgcolor: alpha(C.green, 0.08), '&:hover': { bgcolor: alpha(C.green, 0.2) } }}
                                    >
                                      <CheckCircle fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Edit Authorization Details">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenEditAuth(auth)}
                                    sx={{ color: C.blue, bgcolor: alpha(C.blue, 0.08), '&:hover': { bgcolor: alpha(C.blue, 0.2) } }}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Authorization">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDeleteAuth(auth)}
                                    sx={{ color: C.red, bgcolor: alpha(C.red, 0.08), '&:hover': { bgcolor: alpha(C.red, 0.2) } }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Service Bill Chart Calculator Box */}
              <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5, bgcolor: '#f8fafc' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.navy, mb: 1.5 }}>
                  📊 Live Hospital Insurance Service Bill Chart Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" sx={{ color: C.gray, fontWeight: 700 }}>Total Authorized Items</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.navy }}>{authorizations.length}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" sx={{ color: C.gray, fontWeight: 700 }}>Gross Service Bill (₦)</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.navy }}>
                      ₦{authorizations.reduce((s, a) => s + (a.tariffAmount || 0), 0).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" sx={{ color: C.green, fontWeight: 700 }}>Total HMO Coverage (₦)</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.green }}>
                      ₦{authorizations.reduce((s, a) => s + (a.coverageAmount || 0), 0).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" sx={{ color: C.amber, fontWeight: 700 }}>Total Patient Co-Payment (₦)</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.amber }}>
                      ₦{authorizations.reduce((s, a) => s + (a.patientCopay || 0), 0).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Card>
            </Box>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 5: ACCREDITED HOSPITAL UNITS UNDER THE SCHEMES (CRUD)
             ══════════════════════════════════════════════════════════════════ */}
          {tabValue === 5 && (
            <Box>
              {/* Header & Controls */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: C.navy, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Business sx={{ color: C.blue }} /> Hospital Units Accredited under the Schemes
                  </Typography>
                  <Typography variant="body2" sx={{ color: C.gray }}>
                    Clinical service points, departments, and specialty diagnostic suites accredited for service delivery across NHIA, ESAUHC, Diocesan, and Private HMOs. Managed live in PostgreSQL.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleOpenAddUnit}
                  sx={{ bgcolor: C.blue, '&:hover': { bgcolor: '#172554' }, textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 2.5, py: 1, whiteSpace: 'nowrap' }}
                >
                  Add Accredited Unit
                </Button>
              </Box>

              {/* KPI / Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderLeft: `4px solid ${C.blue}` }}>
                    <Typography variant="caption" sx={{ color: C.gray, fontWeight: 700, textTransform: 'uppercase' }}>Total Accredited Units</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: C.navy, mt: 0.5 }}>
                      {accreditedUnits.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.blue, fontWeight: 600 }}>Active in PostgreSQL</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderLeft: `4px solid ${C.green}` }}>
                    <Typography variant="caption" sx={{ color: C.gray, fontWeight: 700, textTransform: 'uppercase' }}>Fully Accredited</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: C.green, mt: 0.5 }}>
                      {accreditedUnits.filter(u => u.status === 'ACCREDITED').length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.green, fontWeight: 600 }}>100% Compliance Level</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderLeft: `4px solid ${C.purple}` }}>
                    <Typography variant="caption" sx={{ color: C.gray, fontWeight: 700, textTransform: 'uppercase' }}>Tertiary / Diagnostic Suites</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: C.purple, mt: 0.5 }}>
                      {accreditedUnits.filter(u => (u.accreditationLevel || '').includes('TERTIARY') || (u.accreditationLevel || '').includes('SURGICAL') || (u.accreditationLevel || '').includes('IMAGING') || (u.accreditationLevel || '').includes('ISO')).length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.purple, fontWeight: 600 }}>Specialist & Advanced Units</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderLeft: `4px solid ${C.teal}` }}>
                    <Typography variant="caption" sx={{ color: C.gray, fontWeight: 700, textTransform: 'uppercase' }}>Configured Health Schemes</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: C.teal, mt: 0.5 }}>
                      {schemes.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.teal, fontWeight: 600 }}>Multi-scheme coverage active</Typography>
                  </Card>
                </Grid>
              </Grid>

              {/* Filters & Search Toolbar */}
              <Card variant="outlined" sx={{ p: 2, borderRadius: 2.5, mb: 3, bgcolor: '#f8fafc' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search unit by name, department code, lead officer, or services..."
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ color: C.gray, fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: unitSearch ? (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setUnitSearch('')}>
                              <Close fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : null
                      }}
                      sx={{ bgcolor: 'white', borderRadius: 1.5 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small" sx={{ bgcolor: 'white', borderRadius: 1.5 }}>
                      <InputLabel>Accreditation Level</InputLabel>
                      <Select
                        value={unitLevelFilter}
                        label="Accreditation Level"
                        onChange={(e) => setUnitLevelFilter(e.target.value)}
                      >
                        <MenuItem value="ALL">All Accreditation Levels</MenuItem>
                        <MenuItem value="PRIMARY_CARE">Primary Care Only</MenuItem>
                        <MenuItem value="PRIMARY_SECONDARY">Primary & Secondary Care</MenuItem>
                        <MenuItem value="SECONDARY_CARE_WARDS">Secondary Care & Inpatient Wards</MenuItem>
                        <MenuItem value="MAJOR_SURGICAL_SUITE">Major Surgical Operating Suite</MenuItem>
                        <MenuItem value="COMPREHENSIVE_EMOC">Comprehensive EmOC (Maternity)</MenuItem>
                        <MenuItem value="TERTIARY_24_7">Tertiary 24/7 Casualty & Emergency</MenuItem>
                        <MenuItem value="TERTIARY_ISO15189">Tertiary Diagnostic Lab (ISO 15189)</MenuItem>
                        <MenuItem value="ADVANCED_IMAGING">Advanced Medical Imaging & Radiology</MenuItem>
                        <MenuItem value="FORMULARY_DISPENSARY">Pharmacy & Drug Revolving Dispensary</MenuItem>
                        <MenuItem value="REHABILITATION_CLINIC">Rehabilitation & Physiotherapy</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small" sx={{ bgcolor: 'white', borderRadius: 1.5 }}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={unitStatusFilter}
                        label="Status"
                        onChange={(e) => setUnitStatusFilter(e.target.value)}
                      >
                        <MenuItem value="ALL">All Statuses</MenuItem>
                        <MenuItem value="ACCREDITED">Accredited</MenuItem>
                        <MenuItem value="PROVISIONAL">Provisional</MenuItem>
                        <MenuItem value="PENDING_RENEWAL">Pending Renewal</MenuItem>
                        <MenuItem value="SUSPENDED">Suspended</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Card>

              {/* Units Grid */}
              {filteredAccreditedUnits.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3, bgcolor: '#f8fafc' }}>
                  <Business sx={{ fontSize: 48, color: C.gray, opacity: 0.5, mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: C.navy }}>
                    No Accredited Units Found
                  </Typography>
                  <Typography variant="body2" sx={{ color: C.gray, mt: 0.5, mb: 2 }}>
                    {unitSearch || unitLevelFilter !== 'ALL' || unitStatusFilter !== 'ALL'
                      ? 'No hospital units match your filter or search criteria.'
                      : 'No accredited hospital units have been configured yet.'}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleOpenAddUnit}
                    sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700 }}
                  >
                    Add First Hospital Unit
                  </Button>
                </Paper>
              ) : (
                <Grid container spacing={2.5}>
                  {filteredAccreditedUnits.map((unit) => {
                    const isAccredited = unit.status === 'ACCREDITED';
                    const isProvisional = unit.status === 'PROVISIONAL';
                    const isPending = unit.status === 'PENDING_RENEWAL';

                    return (
                      <Grid item xs={12} md={6} key={unit.id}>
                        <Card
                          variant="outlined"
                          sx={{
                            p: 2.5,
                            borderRadius: 3,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.08)',
                              borderColor: alpha(C.blue, 0.4),
                            }
                          }}
                        >
                          <Box>
                            {/* Card Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar
                                  sx={{
                                    bgcolor: alpha(C.blue, 0.1),
                                    color: C.blue,
                                    width: 42,
                                    height: 42,
                                    borderRadius: 2
                                  }}
                                >
                                  {unit.code?.includes('LAB') ? <Science /> :
                                   unit.code?.includes('PHARM') ? <LocalPharmacy /> :
                                   unit.code?.includes('RADIO') ? <Biotech /> :
                                   unit.code?.includes('SURG') ? <MedicalServices /> :
                                   <LocalHospital />}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.navy, lineHeight: 1.2 }}>
                                    {unit.unitName}
                                  </Typography>
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                    <Chip
                                      label={unit.code}
                                      size="small"
                                      sx={{
                                        fontWeight: 700,
                                        fontSize: '0.65rem',
                                        height: 20,
                                        bgcolor: '#f1f5f9',
                                        color: C.navy
                                      }}
                                    />
                                    <Chip
                                      label={(unit.accreditationLevel || 'PRIMARY_SECONDARY').replace(/_/g, ' ')}
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        fontWeight: 700,
                                        fontSize: '0.62rem',
                                        height: 20,
                                        borderColor: alpha(C.blue, 0.3),
                                        color: C.blue
                                      }}
                                    />
                                  </Stack>
                                </Box>
                              </Stack>

                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Chip
                                  label={unit.status || 'ACCREDITED'}
                                  size="small"
                                  color={isAccredited ? 'success' : isProvisional ? 'warning' : isPending ? 'secondary' : 'error'}
                                  sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }}
                                />
                                <Tooltip title="Edit Unit Details">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenEditUnit(unit)}
                                    sx={{ color: C.blue, bgcolor: alpha(C.blue, 0.05), '&:hover': { bgcolor: alpha(C.blue, 0.15) } }}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Unit">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDeleteUnit(unit)}
                                    sx={{ color: C.red, bgcolor: alpha(C.red, 0.05), '&:hover': { bgcolor: alpha(C.red, 0.15) } }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Box>

                            {/* Lead Officer */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1, px: 1, py: 0.5, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
                              <Person sx={{ fontSize: 16, color: C.gray }} />
                              <Typography variant="caption" sx={{ color: C.navy, fontWeight: 600 }}>
                                <strong>Lead Officer:</strong> {unit.leadOfficer || 'Unit Head / Consultant in Charge'}
                              </Typography>
                            </Box>

                            {/* Services Rendered */}
                            <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.82rem', my: 1.5, lineHeight: 1.4 }}>
                              <strong style={{ color: C.navy }}>Services & Capabilities:</strong> {unit.services || 'Clinical care, patient management, diagnostic and therapeutic support.'}
                            </Typography>
                          </Box>

                          {/* Footer: Schemes & Renewal */}
                          <Box sx={{ mt: 1 }}>
                            <Divider sx={{ my: 1.2 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                              <Box>
                                <Typography variant="caption" sx={{ color: C.gray, fontWeight: 700, display: 'block', mb: 0.5 }}>
                                  Covered Schemes ({unit.schemesCovered?.length || 0}):
                                </Typography>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ gap: 0.5 }}>
                                  {Array.isArray(unit.schemesCovered) && unit.schemesCovered.length > 0 ? (
                                    unit.schemesCovered.map((sc: string) => (
                                      <Chip
                                        key={sc}
                                        label={sc}
                                        size="small"
                                        variant="filled"
                                        sx={{
                                          fontSize: '0.65rem',
                                          fontWeight: 700,
                                          height: 20,
                                          bgcolor: sc === 'NHIA' ? alpha(C.green, 0.12) :
                                                   sc === 'ESAUHC' ? alpha(C.teal, 0.12) :
                                                   sc === 'CHIKADIBIA' || sc === 'NDMHS' ? alpha(C.purple, 0.12) :
                                                   alpha(C.blue, 0.12),
                                          color: sc === 'NHIA' ? C.green :
                                                 sc === 'ESAUHC' ? C.teal :
                                                 sc === 'CHIKADIBIA' || sc === 'NDMHS' ? C.purple :
                                                 C.blue,
                                        }}
                                      />
                                    ))
                                  ) : (
                                    <Typography variant="caption" sx={{ color: C.gray, fontStyle: 'italic' }}>
                                      No schemes assigned
                                    </Typography>
                                  )}
                                </Stack>
                              </Box>
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" sx={{ color: C.gray, display: 'block' }}>
                                  Accredited: <strong>{unit.accreditationDate || '2024-01-15'}</strong>
                                </Typography>
                                <Typography variant="caption" sx={{ color: C.amber, fontWeight: 700, display: 'block' }}>
                                  Renewal: <strong>{unit.renewalDate || '2027-12-31'}</strong>
                                </Typography>
                              </Box>
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

          {/* ══════════════════════════════════════════════════════════════════
              TAB 6: INSURANCE AUDIT & DAILY RECEIPTS
             ══════════════════════════════════════════════════════════════════ */}
          {tabValue === 6 && (
            <Box>
              <Grid container spacing={3}>
                {/* Daily Receipts */}
                <Grid item xs={12} lg={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.navy, mb: 1 }}>
                      🧾 1. Daily Transaction Receipts ({auditData.dailyReceipts?.length || 0})
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Receipt No.</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Patient (Folder)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Service</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Amount (₦)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {auditData.dailyReceipts?.map((r: any) => (
                            <TableRow key={r.id} hover>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', color: C.blue }}>
                                {r.receiptNumber}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.patientName}</Typography>
                                <Typography variant="caption" sx={{ color: C.gray }}>Folder: {r.folderNumber}</Typography>
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.78rem' }}>{r.serviceRendered}</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: C.green }}>₦{r.amountPaid?.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Grid>

                {/* Canceled Receipts */}
                <Grid item xs={12} lg={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.red, mb: 1 }}>
                      🚫 2. Canceled / Voided Receipts Log ({auditData.canceledReceipts?.length || 0})
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#fef2f2' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Canceled Receipt</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Patient</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Amount (₦)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Audit Reason & Auth</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {auditData.canceledReceipts?.map((c: any) => (
                            <TableRow key={c.id} hover>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: C.red, fontSize: '0.78rem' }}>
                                {c.receiptNumber}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.patientName}</Typography>
                                <Typography variant="caption" sx={{ color: C.gray }}>Folder: {c.folderNumber}</Typography>
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, color: C.red }}>₦{c.amount?.toLocaleString()}</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem' }}>
                                {c.reason}
                                <Typography variant="caption" sx={{ display: 'block', color: C.navy, fontWeight: 700, mt: 0.5 }}>
                                  Auth: {c.authorizedBy}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Grid>

                {/* Daily Patient Folder Visits */}
                <Grid item xs={12} lg={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.navy, mb: 1 }}>
                      📂 3. Daily Patient Folder Visits by Scheme
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Folder No.</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Patient Name</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Scheme</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Clinic Unit</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {auditData.dailyFolderVisits?.map((f: any, idx: number) => (
                            <TableRow key={idx} hover>
                              <TableCell sx={{ fontWeight: 800, color: C.blue }}>{f.folderNumber}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{f.patientName}</TableCell>
                              <TableCell><Chip label={f.schemeCode} size="small" sx={{ fontWeight: 700 }} /></TableCell>
                              <TableCell>{f.clinicUnit}</TableCell>
                              <TableCell>
                                <Chip label={f.status} size="small" color={f.status === 'COMPLETED' ? 'success' : 'warning'} sx={{ fontWeight: 700, fontSize: '0.68rem' }} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Grid>

                {/* Specialist Consultation Fee Schedule */}
                <Grid item xs={12} lg={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.navy, mb: 1 }}>
                      👨‍⚕️ 4. Specialist Case Directory & Consultation Fee Schedule
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Specialty</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Tariff (₦)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>HMO Cover (₦)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Co-Pay (₦)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {auditData.specialistConsultationFees?.map((s: any, idx: number) => (
                            <TableRow key={idx} hover>
                              <TableCell sx={{ fontWeight: 700 }}>{s.specialty}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>₦{s.statutoryTariff?.toLocaleString()}</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: C.green }}>₦{s.hmoCoverage?.toLocaleString()}</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: C.amber }}>₦{s.patientCopay?.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 7: TARIFFS & CODE MASTER (POSTGRESQL POWERED)
             ══════════════════════════════════════════════════════════════════ */}
          {tabValue === 7 && (
            <Box>
              {/* Category Filter Chips Bar */}
              <Stack direction="row" spacing={1} sx={{ mb: 2.5, overflowX: 'auto', pb: 0.5 }} alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 700, color: C.navy, mr: 1 }}>Filter Category:</Typography>
                <Chip
                  label={`All Categories (${tariffs.length})`}
                  clickable
                  onClick={() => setTariffCategoryFilter('ALL')}
                  color={tariffCategoryFilter === 'ALL' ? 'primary' : 'default'}
                  sx={{ fontWeight: 700 }}
                />
                {['Consultation', 'Laboratory', 'Radiology', 'Surgery', 'Maternity', 'Inpatient', 'Dental', 'Ophthalmology', ...tariffCategories.filter(c => !['Consultation', 'Laboratory', 'Radiology', 'Surgery', 'Maternity', 'Inpatient', 'Dental', 'Ophthalmology'].includes(c))].map(cat => {
                  const count = tariffs.filter(t => t.category === cat).length;
                  if (count === 0 && tariffCategoryFilter !== cat) return null;
                  return (
                    <Chip
                      key={cat}
                      label={`${cat} (${count})`}
                      clickable
                      onClick={() => setTariffCategoryFilter(cat)}
                      color={tariffCategoryFilter === cat ? 'primary' : 'default'}
                      variant={tariffCategoryFilter === cat ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 700 }}
                    />
                  );
                })}
              </Stack>

              {/* Search, Stats & Action Bar */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Search by Service Name, Code, Pre-Auth Rule..."
                    value={tariffSearch}
                    onChange={(e) => setTariffSearch(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                    }}
                    sx={{ width: { xs: '100%', sm: 340 } }}
                  />

                  <Chip
                    label={`Showing ${filteredTariffs.length} of ${tariffs.length} Tariff Items`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>

                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    startIcon={<FileDownload />}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                    onClick={handleExportTariffsCsv}
                  >
                    Export Tariffs (CSV)
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      const initialSchemes = schemes.map(s => ({
                        schemeCode: s.code,
                        schemeName: s.name || s.shortName || s.code,
                        tariffAmount: s.code === 'NHIA' || s.code === 'ESAUHC' ? 0 : 4000,
                        isCapitated: s.code === 'NHIA' || s.code === 'ESAUHC',
                        copayPercentage: 10,
                      }));

                      setTariffForm({
                        category: tariffCategoryFilter !== 'ALL' ? tariffCategoryFilter : 'Consultation',
                        serviceCode: '',
                        serviceName: '',
                        privateFee: 5000,
                        nhiaTariff: 0,
                        esauhcTariff: 0,
                        mutualTariff: 0,
                        hmoTariff: 4000,
                        schemeTariffs: initialSchemes,
                        preAuthRule: 'Covered under Primary Plan',
                        copayPercentage: 10,
                      });
                      setOpenAddTariffDialog(true);
                    }}
                    sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Add New Tariff Item
                  </Button>
                </Stack>
              </Box>

              {/* Live Tariffs Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Service / Procedure Name</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Private Fee (₦)</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Configured Scheme Tariffs</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Co-Pay</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Pre-Auth Rule</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTariffs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                          <Typography variant="body2" sx={{ color: C.gray, mb: 1 }}>
                            No tariff records found matching your search.
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => {
                              const initialSchemes = schemes.map(s => ({
                                schemeCode: s.code,
                                schemeName: s.name || s.shortName || s.code,
                                tariffAmount: s.code === 'NHIA' || s.code === 'ESAUHC' ? 0 : 4000,
                                isCapitated: s.code === 'NHIA' || s.code === 'ESAUHC',
                                copayPercentage: 10,
                              }));
                              setTariffForm({
                                category: tariffCategoryFilter !== 'ALL' ? tariffCategoryFilter : 'Consultation',
                                serviceCode: '',
                                serviceName: '',
                                privateFee: 5000,
                                nhiaTariff: 0,
                                esauhcTariff: 0,
                                mutualTariff: 0,
                                hmoTariff: 4000,
                                schemeTariffs: initialSchemes,
                                preAuthRule: 'Covered under Primary Plan',
                                copayPercentage: 10,
                              });
                              setOpenAddTariffDialog(true);
                            }}
                            sx={{ bgcolor: C.blue, textTransform: 'none' }}
                          >
                            Add New Tariff
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTariffs.map((t: any) => (
                        <TableRow key={t.id} hover>
                          <TableCell>
                            <Chip
                              label={t.category}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontWeight: 700,
                                borderColor: t.category === 'Surgery' ? C.red : t.category === 'Laboratory' ? C.teal : t.category === 'Radiology' ? C.purple : t.category === 'Maternity' ? C.amber : C.blue,
                                color: t.category === 'Surgery' ? C.red : t.category === 'Laboratory' ? C.teal : t.category === 'Radiology' ? C.purple : t.category === 'Maternity' ? C.amber : C.blue,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: C.blue, fontSize: '0.8rem' }}>
                            {t.serviceCode}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {t.serviceName}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            ₦{Number(t.privateFee || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, maxWidth: 380 }}>
                              {Array.isArray(t.schemeTariffs) && t.schemeTariffs.length > 0 ? (
                                t.schemeTariffs.map((st: any) => {
                                  const schemeMatch = schemes.find(s => s.code === st.schemeCode);
                                  const color = schemeMatch?.color || C.blue;
                                  const isCap = st.isCapitated || Number(st.tariffAmount) === 0;
                                  return (
                                    <Chip
                                      key={st.schemeCode}
                                      label={`${st.schemeCode}: ${isCap ? 'Capitated (₦0)' : `₦${Number(st.tariffAmount).toLocaleString()}`}`}
                                      size="small"
                                      sx={{
                                        fontWeight: 700,
                                        fontSize: '0.68rem',
                                        bgcolor: alpha(color, 0.08),
                                        color: color,
                                        border: `1px solid ${alpha(color, 0.3)}`,
                                      }}
                                    />
                                  );
                                })
                              ) : (
                                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                  <Chip label={`NHIA: ${Number(t.nhiaTariff) === 0 ? 'Capitated' : `₦${Number(t.nhiaTariff).toLocaleString()}`}`} size="small" sx={{ fontSize: '0.68rem', fontWeight: 700, color: C.green }} />
                                  <Chip label={`ESAUHC: ${Number(t.esauhcTariff) === 0 ? 'Capitated' : `₦${Number(t.esauhcTariff).toLocaleString()}`}`} size="small" sx={{ fontSize: '0.68rem', fontWeight: 700, color: C.teal }} />
                                  <Chip label={`HMO: ₦${Number(t.hmoTariff || 0).toLocaleString()}`} size="small" sx={{ fontSize: '0.68rem', fontWeight: 700, color: C.indigo }} />
                                </Stack>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={`${t.copayPercentage || 10}%`} size="small" sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={t.preAuthRule || 'Covered'}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                bgcolor: (t.preAuthRule || '').toLowerCase().includes('auth') || (t.preAuthRule || '').toLowerCase().includes('pa')
                                  ? alpha(C.red, 0.1)
                                  : (t.preAuthRule || '').toLowerCase().includes('capitat')
                                  ? alpha(C.green, 0.1)
                                  : alpha(C.blue, 0.1),
                                color: (t.preAuthRule || '').toLowerCase().includes('auth') || (t.preAuthRule || '').toLowerCase().includes('pa')
                                  ? C.red
                                  : (t.preAuthRule || '').toLowerCase().includes('capitat')
                                  ? C.green
                                  : C.blue,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Edit Tariff">
                                <IconButton size="small" color="primary" onClick={() => handleOpenEditTariff(t)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Tariff">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setDeletingTariff(t);
                                    setOpenDeleteTariffDialog(true);
                                  }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: ENROLL CLIENT INTO HEALTH INSURANCE SCHEME
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={openAddClientDialog} onClose={() => setOpenAddClientDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: C.navy, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Enroll Client into Health Insurance Scheme</span>
          <Chip
            label={clientForm.isNewPatient ? "New Walk-in Enrollee" : "Registered Hospital Patient"}
            color={clientForm.isNewPatient ? "secondary" : "primary"}
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </DialogTitle>
        <DialogContent dividers>
          {/* Mode Switcher */}
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: C.gray, display: 'block', mb: 1, textTransform: 'uppercase' }}>
              Enrollee Hospital Folder Status:
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant={!clientForm.isNewPatient ? 'contained' : 'outlined'}
                size="small"
                startIcon={<PersonSearch />}
                onClick={() => setClientForm((prev: any) => ({ ...prev, isNewPatient: false }))}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: !clientForm.isNewPatient ? C.blue : 'transparent',
                  borderColor: C.blue,
                  color: !clientForm.isNewPatient ? '#fff' : C.blue,
                }}
              >
                Existing Registered Hospital Patient
              </Button>
              <Button
                variant={clientForm.isNewPatient ? 'contained' : 'outlined'}
                size="small"
                startIcon={<PersonAdd />}
                onClick={() => {
                  setSelectedHospitalPatient(null);
                  setClientForm((prev: any) => ({ ...prev, isNewPatient: true, patientId: '', folderNumber: '' }));
                }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: clientForm.isNewPatient ? C.purple : 'transparent',
                  borderColor: C.purple,
                  color: clientForm.isNewPatient ? '#fff' : C.purple,
                }}
              >
                New Walk-in Client (No Hospital Folder Yet)
              </Button>
            </Stack>
          </Paper>

          {!clientForm.isNewPatient ? (
            /* Mode 1: Existing Hospital Patient Search */
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.navy, mb: 0.5 }}>
                  1. Search Master Patient Index (MPI):
                </Typography>
                <Autocomplete
                  options={registeredPatients}
                  getOptionLabel={(p) => `${p.fullName} (Folder #${p.patientNumber}) · Phone: ${p.phone} · ${p.gender}`}
                  loading={patientSearchLoading}
                  onInputChange={(_, value) => {
                    if (value.length >= 2) searchHospitalPatients(value);
                  }}
                  onChange={(_, value) => {
                    setSelectedHospitalPatient(value);
                    if (value) {
                      setClientForm((prev: any) => ({
                        ...prev,
                        patientId: value.id,
                        folderNumber: value.patientNumber,
                        membershipNumber: `${prev.schemeCode}/POL/${value.patientNumber}`,
                      }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search Registered Hospital Patients (Type Name or Folder No)"
                      placeholder="e.g. Igwe, Eze, 107T6..."
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {patientSearchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {selectedHospitalPatient && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.navy }}>
                      Selected Patient Details:
                    </Typography>
                    <Grid container spacing={1} sx={{ mt: 0.5 }}>
                      <Grid item xs={4}><Typography variant="caption"><strong>Folder Number:</strong> #{selectedHospitalPatient.folderNumber || selectedHospitalPatient.patientNumber}</Typography></Grid>
                      <Grid item xs={4}><Typography variant="caption"><strong>Full Name:</strong> {selectedHospitalPatient.fullName}</Typography></Grid>
                      <Grid item xs={4}><Typography variant="caption"><strong>Age / Gender:</strong> {selectedHospitalPatient.age} yrs · {selectedHospitalPatient.gender}</Typography></Grid>
                      <Grid item xs={4}><Typography variant="caption"><strong>Phone:</strong> {selectedHospitalPatient.phone}</Typography></Grid>
                      <Grid item xs={4}><Typography variant="caption"><strong>Blood Group:</strong> {selectedHospitalPatient.bloodGroup}</Typography></Grid>
                      <Grid item xs={4}><Typography variant="caption"><strong>Genotype:</strong> {selectedHospitalPatient.genotype}</Typography></Grid>
                      <Grid item xs={12}><Typography variant="caption"><strong>Residential Address:</strong> {selectedHospitalPatient.address}</Typography></Grid>
                    </Grid>
                  </Paper>
                </Grid>
              )}
            </Grid>
          ) : (
            /* Mode 2: New Walk-in Client (No Folder Yet) */
            <Box sx={{ mb: 2.5 }}>
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>Standalone Client Registration:</strong> This client will be registered with a provisional insurance folder (e.g. <code>#INS-XXXX</code>). Records personnel can merge or link this policy to any existing/new hospital patient folder at any time.
                </Typography>
              </Alert>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.navy, mb: 1 }}>
                1. Principal Enrollee Demographics & Bio-data:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    required
                    label="First Name"
                    value={clientForm.firstName}
                    onChange={(e) => setClientForm({ ...clientForm, firstName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    required
                    label="Last Name / Surname"
                    value={clientForm.lastName}
                    onChange={(e) => setClientForm({ ...clientForm, lastName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Middle Name (Optional)"
                    value={clientForm.middleName}
                    onChange={(e) => setClientForm({ ...clientForm, middleName: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Gender</InputLabel>
                    <Select
                      value={clientForm.gender}
                      label="Gender"
                      onChange={(e) => setClientForm({ ...clientForm, gender: e.target.value })}
                    >
                      <MenuItem value="MALE">Male</MenuItem>
                      <MenuItem value="FEMALE">Female</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Age (Years)"
                    value={clientForm.age}
                    onChange={(e) => setClientForm({ ...clientForm, age: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Date of Birth"
                    InputLabelProps={{ shrink: true }}
                    value={clientForm.birthDate}
                    onChange={(e) => setClientForm({ ...clientForm, birthDate: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Phone Number"
                    placeholder="080XXXXXXXX"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Blood Group</InputLabel>
                    <Select
                      value={clientForm.bloodGroup}
                      label="Blood Group"
                      onChange={(e) => setClientForm({ ...clientForm, bloodGroup: e.target.value })}
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => (
                        <MenuItem key={b} value={b}>{b}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Genotype</InputLabel>
                    <Select
                      value={clientForm.genotype}
                      label="Genotype"
                      onChange={(e) => setClientForm({ ...clientForm, genotype: e.target.value })}
                    >
                      {['AA', 'AS', 'SS', 'AC', 'SC'].map(g => (
                        <MenuItem key={g} value={g}>{g}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="National ID / NIN (Optional)"
                    value={clientForm.nationalId}
                    onChange={(e) => setClientForm({ ...clientForm, nationalId: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Residential Address"
                    value={clientForm.address}
                    onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Scheme & Plan Information */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.navy, mb: 1 }}>
            2. Health Scheme & Policy Subscription:
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Health Insurance Scheme</InputLabel>
                <Select
                  value={clientForm.schemeCode}
                  label="Health Insurance Scheme"
                  onChange={(e) => {
                    const code = e.target.value;
                    const match = schemes.find(s => s.code === code);
                    setClientForm({
                      ...clientForm,
                      schemeCode: code,
                      planId: match?.plans?.[0]?.id || '',
                      membershipNumber: `${code}/POL/${selectedHospitalPatient?.patientNumber || 'NEW'}`,
                    });
                  }}
                >
                  {schemes.map(s => (
                    <MenuItem key={s.code} value={s.code}>
                      {s.shortName || s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Benefit Plan Tier</InputLabel>
                <Select
                  value={clientForm.planId}
                  label="Benefit Plan Tier"
                  onChange={(e) => setClientForm({ ...clientForm, planId: e.target.value })}
                >
                  {schemes.find(s => s.code === clientForm.schemeCode)?.plans?.map((pl: any) => (
                    <MenuItem key={pl.id || pl.name} value={pl.id || pl.name}>
                      {pl.name} (₦{(pl.maxAnnualLimit || 1000000).toLocaleString()})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="HMO Policy / Membership Number"
                value={clientForm.membershipNumber}
                onChange={(e) => setClientForm({ ...clientForm, membershipNumber: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Enrollee National Number (Optional)"
                placeholder="e.g. EN-NHIA-99214"
                value={clientForm.enrolleeNumber}
                onChange={(e) => setClientForm({ ...clientForm, enrolleeNumber: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Effective Date"
                InputLabelProps={{ shrink: true }}
                value={clientForm.effectiveDate}
                onChange={(e) => setClientForm({ ...clientForm, effectiveDate: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Expiry Date"
                InputLabelProps={{ shrink: true }}
                value={clientForm.expiryDate}
                onChange={(e) => setClientForm({ ...clientForm, expiryDate: e.target.value })}
              />
            </Grid>
          </Grid>

          {/* Multi-Beneficiary / Coverage Scope Section */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fbfbfe', borderRadius: 2, border: '1px solid #e0e7ff' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.indigo, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FamilyRestroom sx={{ fontSize: 18 }} /> 3. Policy Coverage Extent (Individual vs Family / Multi-Beneficiary):
            </Typography>
            <Grid container spacing={2} sx={{ mb: 1.5 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Coverage Scope</InputLabel>
                  <Select
                    value={clientForm.coverageScope}
                    label="Coverage Scope"
                    onChange={(e) => setClientForm({ ...clientForm, coverageScope: e.target.value })}
                  >
                    <MenuItem value="INDIVIDUAL">👤 Individual Plan (Principal Only)</MenuItem>
                    <MenuItem value="FAMILY">👨‍👩‍👧‍👦 Family Plan (Principal + Dependents)</MenuItem>
                    <MenuItem value="CORPORATE_GROUP">🏢 Corporate / Group Plan (Employee + Beneficiaries)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: C.gray, display: 'block', pt: 0.5 }}>
                  {clientForm.coverageScope === 'FAMILY'
                    ? '✓ Covers the principal subscriber PLUS registered family dependents (Spouse, Children, etc.).'
                    : clientForm.coverageScope === 'CORPORATE_GROUP'
                    ? '✓ Covers principal corporate employee plus listed organizational beneficiaries.'
                    : 'ℹ Strictly covers ONLY the principal enrollee. Dependents will not be covered.'}
                </Typography>
              </Grid>
            </Grid>

            {/* If Family Plan or Corporate Plan: Dynamic Dependents Builder */}
            {(clientForm.coverageScope === 'FAMILY' || clientForm.coverageScope === 'CORPORATE_GROUP') && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #cbd5e1' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.navy }}>
                    Covered Family Dependents / Beneficiaries ({clientForm.coveredDependents?.length || 0})
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={handleAddDependentRow}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Add Dependent
                  </Button>
                </Box>

                {(!clientForm.coveredDependents || clientForm.coveredDependents.length === 0) ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Click <strong>"+ Add Dependent"</strong> to add family members (spouse, children, etc.) covered by this policy.
                  </Alert>
                ) : (
                  <Stack spacing={1.5}>
                    {clientForm.coveredDependents.map((dep: any, index: number) => (
                      <Paper key={dep.id || index} variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff' }}>
                        <Grid container spacing={1.5} alignItems="center">
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Dependent Full Name"
                              placeholder="e.g. Mary Eze"
                              value={dep.name}
                              onChange={(e) => handleDependentFieldChange(index, 'name', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={6} sm={2.5}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Relationship</InputLabel>
                              <Select
                                value={dep.relationship}
                                label="Relationship"
                                onChange={(e) => handleDependentFieldChange(index, 'relationship', e.target.value)}
                              >
                                <MenuItem value="SPOUSE">Spouse</MenuItem>
                                <MenuItem value="CHILD">Child / Dependent</MenuItem>
                                <MenuItem value="PARENT">Parent</MenuItem>
                                <MenuItem value="SIBLING">Sibling</MenuItem>
                                <MenuItem value="WARD">Ward</MenuItem>
                                <MenuItem value="OTHER">Other</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Gender</InputLabel>
                              <Select
                                value={dep.gender}
                                label="Gender"
                                onChange={(e) => handleDependentFieldChange(index, 'gender', e.target.value)}
                              >
                                <MenuItem value="MALE">Male</MenuItem>
                                <MenuItem value="FEMALE">Female</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={6} sm={1.5}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Age"
                              value={dep.age}
                              onChange={(e) => handleDependentFieldChange(index, 'age', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={6} sm={1.5}>
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleRemoveDependentRow(index)}
                              sx={{ border: '1px solid #fecaca', bgcolor: '#fef2f2' }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddClientDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveClient}
            disabled={!clientForm.isNewPatient && !selectedHospitalPatient}
            sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700 }}
          >
            {clientForm.isNewPatient ? "Register & Enroll Walk-in Enrollee" : "Enroll Patient into Scheme"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: LINK HOSPITAL PATIENT FOLDER TO INSURANCE (RECORDS DESK)
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={openLinkFolderDialog} onClose={() => setOpenLinkFolderDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: C.navy }}>
          Link Hospital Patient Folder to Insurance Policy
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Records Personnel Action:</strong> Select an existing registered hospital patient folder from the Master Patient Index to link or associate with this insurance policy.
            </Typography>
          </Alert>

          {clientToLink && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.navy, mb: 0.5 }}>
                Current Policy Enrollee:
              </Typography>
              <Typography variant="body2"><strong>Enrollee Name:</strong> {clientToLink.name}</Typography>
              <Typography variant="body2"><strong>Policy / Membership No:</strong> {clientToLink.membershipNumber}</Typography>
              <Typography variant="body2"><strong>Current Folder:</strong> #{clientToLink.folderNumber} ({clientToLink.isProvisionalFolder ? 'Provisional' : 'Linked'})</Typography>
            </Paper>
          )}

          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.navy, mb: 1 }}>
            Select Hospital Patient Folder to Link:
          </Typography>
          <Autocomplete
            options={registeredPatients}
            getOptionLabel={(p) => `${p.fullName} (Folder #${p.patientNumber}) · Phone: ${p.phone} · ${p.gender}`}
            loading={patientSearchLoading}
            onInputChange={(_, value) => {
              if (value.length >= 2) searchHospitalPatients(value);
            }}
            onChange={(_, value) => setPatientToLink(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Registered Hospital Patients (Type Name or Folder No)"
                placeholder="e.g. Igwe, Eze, 107T6..."
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {patientSearchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {patientToLink && (
            <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.green }}>
                ✓ Patient Folder to be Linked:
              </Typography>
              <Typography variant="body2"><strong>Full Name:</strong> {patientToLink.fullName}</Typography>
              <Typography variant="body2"><strong>Permanent Folder No:</strong> #{patientToLink.patientNumber || patientToLink.folderNumber}</Typography>
              <Typography variant="body2"><strong>Age / Gender:</strong> {patientToLink.age} yrs · {patientToLink.gender}</Typography>
              <Typography variant="body2"><strong>Phone:</strong> {patientToLink.phone}</Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenLinkFolderDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleExecuteLinkPatient}
            disabled={!patientToLink || linkingPatient}
            startIcon={linkingPatient ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}
            sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700 }}
          >
            {linkingPatient ? 'Linking Folder...' : 'Confirm Link Folder'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: CONFIGURE NEW HEALTH INSURANCE SCHEME
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={openAddSchemeDialog} onClose={() => setOpenAddSchemeDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: C.navy }}>
          Configure New Health Insurance Scheme / HMO
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Scheme Code (Unique)"
                placeholder="e.g. HYGEIA, AXA, BHCPF"
                value={schemeForm.code}
                onChange={(e) => setSchemeForm({ ...schemeForm, code: e.target.value.toUpperCase() })}
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                size="small"
                label="Full Scheme / Provider Name"
                placeholder="e.g. Hygeia HMO Limited / National Health Scheme"
                value={schemeForm.name}
                onChange={(e) => setSchemeForm({ ...schemeForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Scheme Category</InputLabel>
                <Select
                  value={schemeForm.category}
                  label="Scheme Category"
                  onChange={(e) => setSchemeForm({ ...schemeForm, category: e.target.value })}
                >
                  <MenuItem value="STATUTORY_FEDERAL">Federal Statutory Scheme (NHIA)</MenuItem>
                  <MenuItem value="STATE_STATUTORY">State Universal Agency (ESAUHC)</MenuItem>
                  <MenuItem value="MUTUAL_HEALTH_AGENCY">Community Mutual Health Agency</MenuItem>
                  <MenuItem value="DIOCESAN_FAITH_BASED">Diocesan / Faith-Based Scheme</MenuItem>
                  <MenuItem value="PRIVATE_HMO">Private Health Maintenance Org (HMO)</MenuItem>
                  <MenuItem value="CORPORATE">Corporate Retainership Scheme</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Display Badge Label"
                placeholder="e.g. Private HMO / Diocesan Scheme"
                value={schemeForm.badge}
                onChange={(e) => setSchemeForm({ ...schemeForm, badge: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Default Capitation Rate (₦ / head / month)"
                type="number"
                value={schemeForm.defaultCapitationRate}
                onChange={(e) => setSchemeForm({ ...schemeForm, defaultCapitationRate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Standard Co-Pay Percentage (%)"
                type="number"
                value={schemeForm.defaultCopayPercentage}
                onChange={(e) => setSchemeForm({ ...schemeForm, defaultCopayPercentage: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Official Contact Phone / Desk Hotline"
                placeholder="e.g. 0800-CALL-HMO"
                value={schemeForm.phone}
                onChange={(e) => setSchemeForm({ ...schemeForm, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Official Email Address"
                placeholder="claims@hmo.com"
                value={schemeForm.email}
                onChange={(e) => setSchemeForm({ ...schemeForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="External Verification Portal / Database URL"
                placeholder="https://portal.hmo-provider.com"
                value={schemeForm.portalUrl}
                onChange={(e) => setSchemeForm({ ...schemeForm, portalUrl: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Scheme Description & Notes"
                value={schemeForm.description}
                onChange={(e) => setSchemeForm({ ...schemeForm, description: e.target.value })}
              />
            </Grid>

            {/* Dynamic Benefit Plans Configurator for New Scheme */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1.5px solid #cbd5e1' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.navy, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PolicyIcon sx={{ color: C.blue, fontSize: 18 }} /> Benefit Plans & Tiered Coverage Packages
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.gray }}>
                      Configure benefit tiers, maximum annual caps (₦), and co-payment percentages for this scheme.
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleAddPlanRow(false)}
                    sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                  >
                    Add Plan Tier
                  </Button>
                </Box>

                <Stack spacing={1.5}>
                  {schemeForm.plans?.map((pl: any, idx: number) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                      <Grid container spacing={1.5} alignItems="center">
                        <Grid item xs={12} sm={5}>
                          <TextField
                            fullWidth
                            size="small"
                            label={`Plan #${idx + 1} Name`}
                            placeholder="e.g. Gold Comprehensive Plan / Family Shield"
                            value={pl.name}
                            onChange={(e) => handlePlanFieldChange(idx, 'name', e.target.value, false)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Max Annual Limit (₦)"
                            value={pl.maxAnnualLimit}
                            onChange={(e) => handlePlanFieldChange(idx, 'maxAnnualLimit', e.target.value, false)}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                            }}
                          />
                        </Grid>
                        <Grid item xs={9} sm={2}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Co-Pay %"
                            value={pl.copayPercentage}
                            onChange={(e) => handlePlanFieldChange(idx, 'copayPercentage', e.target.value, false)}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                          />
                        </Grid>
                        <Grid item xs={3} sm={1} sx={{ textAlign: 'center' }}>
                          <Tooltip title="Remove Plan Tier">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={schemeForm.plans.length <= 1}
                                onClick={() => handleRemovePlanRow(idx, false)}
                                sx={{ bgcolor: '#fee2e2', '&:hover': { bgcolor: '#fecaca' } }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddSchemeDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveScheme}
            sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700 }}
          >
            Save Scheme Configuration
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: EDIT EXISTING HEALTH INSURANCE SCHEME
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={openEditSchemeDialog} onClose={() => setOpenEditSchemeDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: editSchemeForm.color || C.blue, width: 34, height: 34 }}>
              <Edit sx={{ fontSize: 18, color: '#fff' }} />
            </Avatar>
            <span>Edit Scheme: {editSchemeForm.name || editSchemeForm.code}</span>
          </Stack>
          <Chip
            label={editSchemeForm.isActive ? 'ACTIVE' : 'INACTIVE'}
            color={editSchemeForm.isActive ? 'success' : 'default'}
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Scheme Code (Unique ID)"
                value={editSchemeForm.code}
                onChange={(e) => setEditSchemeForm({ ...editSchemeForm, code: e.target.value.toUpperCase() })}
                helperText="Primary identifier for claims & policies"
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                size="small"
                label="Full Scheme / Provider Name"
                value={editSchemeForm.name}
                onChange={(e) => setEditSchemeForm({ ...editSchemeForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Short Display Name"
                placeholder="e.g. NHIA (National)"
                value={editSchemeForm.shortName}
                onChange={(e) => setEditSchemeForm({ ...editSchemeForm, shortName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Scheme Category</InputLabel>
                <Select
                  value={editSchemeForm.category}
                  label="Scheme Category"
                  onChange={(e) => setEditSchemeForm({ ...editSchemeForm, category: e.target.value })}
                >
                  <MenuItem value="STATUTORY_FEDERAL">Federal Statutory Scheme (NHIA)</MenuItem>
                  <MenuItem value="STATE_STATUTORY">State Universal Agency (ESAUHC)</MenuItem>
                  <MenuItem value="MUTUAL_HEALTH_AGENCY">Community Mutual Health Agency</MenuItem>
                  <MenuItem value="DIOCESAN_FAITH_BASED">Diocesan / Faith-Based Scheme</MenuItem>
                  <MenuItem value="PRIVATE_HMO">Private Health Maintenance Org (HMO)</MenuItem>
                  <MenuItem value="CORPORATE">Corporate Retainership Scheme</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Display Badge Label"
                value={editSchemeForm.badge}
                onChange={(e) => setEditSchemeForm({ ...editSchemeForm, badge: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Default Capitation Rate (₦ / head / month)"
                type="number"
                value={editSchemeForm.defaultCapitationRate}
                onChange={(e) => setEditSchemeForm({ ...editSchemeForm, defaultCapitationRate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Standard Co-Pay Percentage (%)"
                type="number"
                value={editSchemeForm.defaultCopayPercentage}
                onChange={(e) => setEditSchemeForm({ ...editSchemeForm, defaultCopayPercentage: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Accreditation Status</InputLabel>
                <Select
                  value={editSchemeForm.accreditedStatus}
                  label="Accreditation Status"
                  onChange={(e) => setEditSchemeForm({ ...editSchemeForm, accreditedStatus: e.target.value })}
                >
                  <MenuItem value="ACCREDITED">✅ ACCREDITED (Fully Certified)</MenuItem>
                  <MenuItem value="PROVISIONAL">⚠️ PROVISIONAL (Under Review)</MenuItem>
                  <MenuItem value="RENEWAL_DUE">⏳ RENEWAL DUE (Expiring Soon)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Accreditation Expiry Date"
                InputLabelProps={{ shrink: true }}
                value={editSchemeForm.accreditationExpiry}
                onChange={(e) => setEditSchemeForm({ ...editSchemeForm, accreditationExpiry: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Liaison Officer / Contact Person"
                placeholder="e.g. Dr. Chika Okafor (Zonal Officer)"
                value={editSchemeForm.contactPerson}
                onChange={(e) => setEditSchemeForm({ ...editSchemeForm, contactPerson: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Official Contact Phone / Desk Hotline"
                value={editSchemeForm.phone}
                onChange={(e) => setEditSchemeForm({ ...editSchemeForm, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Official Email Address"
                value={editSchemeForm.email}
                onChange={(e) => setEditSchemeForm({ ...editSchemeForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="External Verification Portal / Database URL"
                value={editSchemeForm.portalUrl}
                onChange={(e) => setEditSchemeForm({ ...editSchemeForm, portalUrl: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Scheme Description & Hospital Policy Notes"
                value={editSchemeForm.description}
                onChange={(e) => setEditSchemeForm({ ...editSchemeForm, description: e.target.value })}
              />
            </Grid>

            {/* Dynamic Benefit Plans Configurator for Edit Scheme */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1.5px solid #cbd5e1' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.navy, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PolicyIcon sx={{ color: C.blue, fontSize: 18 }} /> Benefit Plans & Coverage Limits Configured ({editSchemeForm.plans?.length || 0} Plans)
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.gray }}>
                      Edit, add, or customize benefit plans, annual maximum expenditure caps (₦), and patient co-pay percentages.
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleAddPlanRow(true)}
                    sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                  >
                    Add Benefit Plan Tier
                  </Button>
                </Box>

                <Stack spacing={1.5}>
                  {editSchemeForm.plans?.map((pl: any, idx: number) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                      <Grid container spacing={1.5} alignItems="center">
                        <Grid item xs={12} sm={5}>
                          <TextField
                            fullWidth
                            size="small"
                            label={`Plan #${idx + 1} Name`}
                            placeholder="e.g. Reliance Red Beryl Premium / Essential Care"
                            value={pl.name}
                            onChange={(e) => handlePlanFieldChange(idx, 'name', e.target.value, true)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Max Annual Limit (₦)"
                            value={pl.maxAnnualLimit}
                            onChange={(e) => handlePlanFieldChange(idx, 'maxAnnualLimit', e.target.value, true)}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                            }}
                          />
                        </Grid>
                        <Grid item xs={9} sm={2}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Co-Pay %"
                            value={pl.copayPercentage}
                            onChange={(e) => handlePlanFieldChange(idx, 'copayPercentage', e.target.value, true)}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                          />
                        </Grid>
                        <Grid item xs={3} sm={1} sx={{ textAlign: 'center' }}>
                          <Tooltip title="Remove Plan Tier">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={editSchemeForm.plans.length <= 1}
                                onClick={() => handleRemovePlanRow(idx, true)}
                                sx={{ bgcolor: '#fee2e2', '&:hover': { bgcolor: '#fecaca' } }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            {/* Status & Pre-Authorization Configuration Controls */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.navy, mb: 1 }}>
                  Pre-Authorization (PA) Rules & Scheme Status:
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!editSchemeForm.isActive}
                          onChange={(e) => setEditSchemeForm({ ...editSchemeForm, isActive: e.target.checked })}
                          color="success"
                        />
                      }
                      label="Scheme Active in Hospital"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!editSchemeForm.requiresPreAuthForSurgery}
                          onChange={(e) => setEditSchemeForm({ ...editSchemeForm, requiresPreAuthForSurgery: e.target.checked })}
                          color="primary"
                        />
                      }
                      label="Surgery Requires Pre-Auth (PA)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!editSchemeForm.requiresPreAuthForScans}
                          onChange={(e) => setEditSchemeForm({ ...editSchemeForm, requiresPreAuthForScans: e.target.checked })}
                          color="primary"
                        />
                      }
                      label="Ultrasound/CT/MRI Requires PA"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!editSchemeForm.requiresPreAuthForSpecialLabs}
                          onChange={(e) => setEditSchemeForm({ ...editSchemeForm, requiresPreAuthForSpecialLabs: e.target.checked })}
                          color="primary"
                        />
                      }
                      label="Special Labs / Panels Require PA"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditSchemeDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdateScheme}
            disabled={savingEditScheme}
            startIcon={savingEditScheme ? <CircularProgress size={16} color="inherit" /> : <Check />}
            sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700 }}
          >
            {savingEditScheme ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: DELETE HEALTH INSURANCE SCHEME CONFIRMATION
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={openDeleteSchemeDialog} onClose={() => setOpenDeleteSchemeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: C.red, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning sx={{ color: C.red }} />
          Confirm Deletion of Scheme
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ py: 1 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Warning: You are about to permanently delete this health insurance scheme configuration.
              </Typography>
            </Alert>
            <Typography variant="body1" sx={{ color: C.navy, mb: 1 }}>
              Are you sure you want to delete <strong>{schemeToDelete?.name}</strong> (Code: <code>{schemeToDelete?.code}</code>)?
            </Typography>
            <Typography variant="body2" sx={{ color: C.gray }}>
              This will remove the scheme from the directory, unlink any associated benefit plans, and clean up configured insurance policies for this provider. This action cannot be undone.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteSchemeDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteScheme}
            disabled={deletingScheme}
            startIcon={deletingScheme ? <CircularProgress size={16} color="inherit" /> : <Delete />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {deletingScheme ? 'Deleting...' : 'Delete Scheme'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: LOG HMO TELEPHONE / EXTERNAL PORTAL AUTHORIZATION
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={openLogVerificationDialog} onClose={() => setOpenLogVerificationDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: C.navy }}>
          📞 Log HMO Phone Authorization & Issue PA Code
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Patient Full Name"
                value={verificationForm.patientName}
                onChange={(e) => setVerificationForm({ ...verificationForm, patientName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Hospital Folder Number"
                value={verificationForm.folderNumber}
                onChange={(e) => setVerificationForm({ ...verificationForm, folderNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="HMO Officer Contacted"
                placeholder="e.g. Dr. Chika Okafor (Desk Officer)"
                value={verificationForm.hmoOfficerName}
                onChange={(e) => setVerificationForm({ ...verificationForm, hmoOfficerName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Call Reference / Confirmation Ref No."
                placeholder="e.g. NHIA-CALL-88129"
                value={verificationForm.callReferenceCode}
                onChange={(e) => setVerificationForm({ ...verificationForm, callReferenceCode: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Services Verified & Approved (Comma-separated)"
                placeholder="e.g. Full Blood Count, Abdominal Ultrasound Scan, IV Ceftriaxone"
                value={verificationForm.servicesDescription}
                onChange={(e) => setVerificationForm({ ...verificationForm, servicesDescription: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="HMO Approved Amount (₦)"
                type="number"
                value={verificationForm.hmoApprovedAmount}
                onChange={(e) => setVerificationForm({ ...verificationForm, hmoApprovedAmount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Patient Co-Payment at Cashier (₦)"
                type="number"
                value={verificationForm.patientCopayAmount}
                onChange={(e) => setVerificationForm({ ...verificationForm, patientCopayAmount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Extra Out-of-Pocket / Non-Formulary Cash Surcharge Notes"
                placeholder="e.g. Non-formulary statin requires ₦4,500 cash self-pay; scan 10% co-pay."
                value={verificationForm.extraOutofPocketNotes}
                onChange={(e) => setVerificationForm({ ...verificationForm, extraOutofPocketNotes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenLogVerificationDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveVerificationLog}
            sx={{ bgcolor: C.amber, textTransform: 'none', fontWeight: 700 }}
          >
            Save Verification & Issue PA Code
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: RECORD MONTHLY CAPITATION
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={openAddCapitationDialog} onClose={() => setOpenAddCapitationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: C.navy }}>
          Record Monthly Scheme Capitation Remittance
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Health Insurance Scheme</InputLabel>
              <Select
                value={capitationForm.schemeCode}
                label="Health Insurance Scheme"
                onChange={(e) => setCapitationForm({ ...capitationForm, schemeCode: e.target.value })}
              >
                {schemes.map(s => (
                  <MenuItem key={s.code} value={s.code}>{s.shortName || s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              label="Reporting Month (YYYY-MM)"
              value={capitationForm.month}
              onChange={(e) => setCapitationForm({ ...capitationForm, month: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Enrollee Count (Headcount)"
              value={capitationForm.enrolleeCount}
              onChange={(e) => setCapitationForm({ ...capitationForm, enrolleeCount: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Remitted / Received Amount (₦)"
              value={capitationForm.receivedAmount}
              onChange={(e) => setCapitationForm({ ...capitationForm, receivedAmount: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              label="Bank Remittance Reference No."
              placeholder="e.g. CBN/TRZ/20260904-NHIA"
              value={capitationForm.bankReference}
              onChange={(e) => setCapitationForm({ ...capitationForm, bankReference: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddCapitationDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveCapitation}
            sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700 }}
          >
            Save Capitation Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: SUBMIT FFS CLAIM
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={openAddFfsDialog} onClose={() => setOpenAddFfsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: C.navy }}>
          Submit Secondary Care Fee-For-Service (FFS) Claim
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Scheme</InputLabel>
              <Select
                value={ffsForm.schemeCode}
                label="Scheme"
                onChange={(e) => setFfsForm({ ...ffsForm, schemeCode: e.target.value })}
              >
                {schemes.map(s => (
                  <MenuItem key={s.code} value={s.code}>{s.shortName || s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              label="Patient Full Name"
              value={ffsForm.clientName}
              onChange={(e) => setFfsForm({ ...ffsForm, clientName: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              label="Hospital Folder Number"
              value={ffsForm.folderNumber}
              onChange={(e) => setFfsForm({ ...ffsForm, folderNumber: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              label="Service / Procedure Description"
              value={ffsForm.serviceDescription}
              onChange={(e) => setFfsForm({ ...ffsForm, serviceDescription: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              label="Prior-Authorization (PA) Code"
              value={ffsForm.paCode}
              onChange={(e) => setFfsForm({ ...ffsForm, paCode: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Gross Tariff Amount (₦)"
              value={ffsForm.tariffAmount}
              onChange={(e) => setFfsForm({ ...ffsForm, tariffAmount: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddFfsDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveFfs}
            sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700 }}
          >
            Submit Claim
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: ISSUE / EDIT CLINICAL PRIOR-AUTHORIZATION (PA) CODE
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={openAddAuthDialog || openEditAuthDialog}
        onClose={() => {
          setOpenAddAuthDialog(false);
          setOpenEditAuthDialog(false);
          setEditingAuthId(null);
          setSelectedAuthPatient(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: C.navy, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Key sx={{ color: C.blue }} />
          {openEditAuthDialog ? 'Edit Clinical Prior-Authorization (PA) Code' : 'Issue Clinical Prior-Authorization (PA) Code'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {/* Scheme Selector */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Health Insurance Scheme *</InputLabel>
                <Select
                  value={authForm.schemeCode}
                  label="Health Insurance Scheme *"
                  onChange={(e) => setAuthForm({ ...authForm, schemeCode: e.target.value })}
                >
                  {schemes.map(s => (
                    <MenuItem key={s.code} value={s.code}>
                      {s.name || s.shortName || s.code} ({s.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Clinical Service Category */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Clinical Service Category *</InputLabel>
                <Select
                  value={authForm.category}
                  label="Clinical Service Category *"
                  onChange={(e) => setAuthForm({ ...authForm, category: e.target.value })}
                >
                  <MenuItem value="LABORATORY">🔬 Laboratory Test (Special Panel / Genotype / PCR)</MenuItem>
                  <MenuItem value="RADIOLOGY">🩻 Radiology / Scan (Ultrasound / X-Ray / CT / MRI)</MenuItem>
                  <MenuItem value="SURGERY">💉 Surgical Procedure (CS / Appendectomy / Myomectomy)</MenuItem>
                  <MenuItem value="MEDICATION">💊 Specialized Medication / Antimicrobials</MenuItem>
                  <MenuItem value="SPECIALIST_CONSULTATION">👨‍⚕️ Specialist Consultation Review</MenuItem>
                  <MenuItem value="ADMISSION">🛏️ Inpatient Admission & Bed Days</MenuItem>
                  <MenuItem value="PROCEDURE">📋 Clinical Bedside / Outpatient Procedures</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Quick Patient Autocomplete / Suggestion Selector */}
            {!openEditAuthDialog && (
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={clients.length > 0 ? clients : registeredPatients}
                  getOptionLabel={(option: any) => `${option.name || `${option.firstName || ''} ${option.lastName || ''}`.trim()} (Folder: ${option.folderNumber || option.patientNumber || 'N/A'}) - ${option.schemeCode || 'General'}`}
                  value={selectedAuthPatient}
                  onChange={(_, value) => handleSelectPatientForAuth(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Quick Select from Enrolled Patients / Hospital Register (Optional)"
                      placeholder="Type patient name or folder number to auto-populate..."
                      helperText="Select a registered insurance enrollee to auto-fill patient name and folder number"
                    />
                  )}
                />
              </Grid>
            )}

            {/* Patient Name */}
            <Grid item xs={12} sm={7}>
              <TextField
                fullWidth
                size="small"
                label="Patient Full Name *"
                placeholder="e.g. Mrs. Chioma Ezechukwu"
                value={authForm.clientName}
                onChange={(e) => setAuthForm({ ...authForm, clientName: e.target.value })}
              />
            </Grid>

            {/* Hospital Folder Number */}
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                size="small"
                label="Hospital Folder Number *"
                placeholder="e.g. 107T6"
                value={authForm.folderNumber}
                onChange={(e) => setAuthForm({ ...authForm, folderNumber: e.target.value })}
              />
            </Grid>

            {/* Service / Procedure Name */}
            <Grid item xs={12} sm={7}>
              <TextField
                fullWidth
                size="small"
                label="Service / Procedure / Medication Name *"
                placeholder="e.g. Full Blood Count (FBC) + Lipid Profile + Liver Function Test"
                value={authForm.serviceName}
                onChange={(e) => setAuthForm({ ...authForm, serviceName: e.target.value })}
              />
            </Grid>

            {/* Requesting Doctor */}
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                size="small"
                label="Requesting Doctor / Specialist"
                placeholder="e.g. Dr. Chinedu Eze"
                value={authForm.requestingDoctor}
                onChange={(e) => setAuthForm({ ...authForm, requestingDoctor: e.target.value })}
              />
            </Grid>

            {/* Tariff and Financials */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Gross Statutory Tariff (₦) *"
                value={authForm.tariffAmount}
                onChange={(e) => handleAuthTariffOrCopayChange('tariffAmount', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Co-Payment Percentage (%)"
                value={authForm.copayPct}
                onChange={(e) => handleAuthTariffOrCopayChange('copayPct', e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Authorization Status</InputLabel>
                <Select
                  value={authForm.status}
                  label="Authorization Status"
                  onChange={(e) => setAuthForm({ ...authForm, status: e.target.value })}
                >
                  <MenuItem value="APPROVED">Approved (Active)</MenuItem>
                  <MenuItem value="PENDING">Pending Approval</MenuItem>
                  <MenuItem value="USED">Claimed / Used</MenuItem>
                  <MenuItem value="REJECTED">Declined / Rejected</MenuItem>
                  <MenuItem value="EXPIRED">Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Financial Summary Preview */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0', borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: C.green, fontWeight: 700, display: 'block' }}>
                      Estimated HMO Coverage Portion:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: C.green }}>
                      ₦{Number(authForm.coverageAmount || 0).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: C.amber, fontWeight: 700, display: 'block' }}>
                      Patient Point-of-Care Co-Payment Due:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: C.amber }}>
                      ₦{Number(authForm.patientCopay || 0).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Custom PA Code (Optional) */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Custom PA Code (Optional)"
                placeholder="Leave blank to auto-generate"
                value={authForm.paCode}
                onChange={(e) => setAuthForm({ ...authForm, paCode: e.target.value.toUpperCase() })}
                helperText="Auto-generated if left blank"
              />
            </Grid>

            {/* Request Date */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Request Date"
                InputLabelProps={{ shrink: true }}
                value={authForm.requestDate}
                onChange={(e) => setAuthForm({ ...authForm, requestDate: e.target.value })}
              />
            </Grid>

            {/* Expiry Date */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Validity / Expiry Date"
                InputLabelProps={{ shrink: true }}
                value={authForm.expiryDate}
                onChange={(e) => setAuthForm({ ...authForm, expiryDate: e.target.value })}
              />
            </Grid>

            {/* Clinical Justification Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Clinical Justification / HMO Pre-Authorization Notes"
                placeholder="e.g. Approved via NHIA Portal automated pre-authorization gateway for acute pelvic pain evaluation."
                value={authForm.notes}
                onChange={(e) => setAuthForm({ ...authForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setOpenAddAuthDialog(false);
              setOpenEditAuthDialog(false);
              setEditingAuthId(null);
              setSelectedAuthPatient(null);
            }}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={savingAuth}
            onClick={openEditAuthDialog ? handleUpdateAuth : handleSaveNewAuth}
            sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700 }}
          >
            {savingAuth ? <CircularProgress size={20} color="inherit" /> : (openEditAuthDialog ? 'Update Authorization in Database' : 'Save & Issue PA Code')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: CONFIRM DELETE PRIOR-AUTHORIZATION (PA)
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={openDeleteAuthDialog}
        onClose={() => setOpenDeleteAuthDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: C.red }}>
          Delete Prior-Authorization Code
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Are you sure you want to permanently delete this prior-authorization record from PostgreSQL?
          </Typography>
          {deletingAuth && (
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#fef2f2', borderColor: '#fecaca', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.navy }}>
                PA Code: {deletingAuth.paCode}
              </Typography>
              <Typography variant="caption" sx={{ color: C.gray, display: 'block' }}>
                Patient: <strong>{deletingAuth.clientName}</strong> (Folder: {deletingAuth.folderNumber})
              </Typography>
              <Typography variant="caption" sx={{ color: C.navy, display: 'block', mt: 0.5 }}>
                Service: <strong>{deletingAuth.serviceName}</strong> ({deletingAuth.category})
              </Typography>
              <Typography variant="caption" sx={{ color: C.green, fontWeight: 700, display: 'block', mt: 0.5 }}>
                Tariff: ₦{Number(deletingAuth.tariffAmount || 0).toLocaleString()} · HMO Cover: ₦{Number(deletingAuth.coverageAmount || 0).toLocaleString()}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteAuthDialog(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteAuth}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Permanently Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: PRINTABLE SERVICE BILL CHART
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={openPrintBillDialog} onClose={() => setOpenPrintBillDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: C.navy, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Faith Foundation Mission Hospital — Official Insurance Service Bill Chart</span>
          <Button startIcon={<Print />} variant="contained" size="small" onClick={() => window.print()} sx={{ bgcolor: C.blue, textTransform: 'none' }}>
            Print Bill
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 2 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 900, color: C.blue }}>
                FAITH FOUNDATION MISSION HOSPITAL
              </Typography>
              <Typography variant="body2" sx={{ color: C.gray }}>
                Official Insurance Department — Statutory Healthcare Claim & Bill Breakdown
              </Typography>
              <Typography variant="caption" sx={{ color: C.navy, fontWeight: 700 }}>
                Generated on: {new Date().toLocaleString()} · Accreditation Level: Comprehensive Tertiary
              </Typography>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Service Description</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>PA Code</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Gross Tariff</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>HMO Claim (90%)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Co-Pay (10%)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {authorizations.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{item.serviceName}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.paCode}</TableCell>
                      <TableCell>₦{item.tariffAmount?.toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: C.green }}>₦{item.coverageAmount?.toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: C.amber }}>₦{item.patientCopay?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" sx={{ color: C.gray, display: 'block' }}>Verified By:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Emmanuel Vegher (Audit & Insurance Head)</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ color: C.gray, display: 'block' }}>Total Net Co-Payment Due at Cashier:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: C.amber }}>
                  ₦{authorizations.reduce((s, a) => s + (a.patientCopay || 0), 0).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenPrintBillDialog(false)} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: ADD / EDIT INSURANCE TARIFF ITEM (POSTGRESQL SAVED)
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={openAddTariffDialog || openEditTariffDialog}
        onClose={() => {
          setOpenAddTariffDialog(false);
          setOpenEditTariffDialog(false);
          setEditingTariffId(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: C.navy, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{openEditTariffDialog ? 'Edit Insurance Tariff Item' : 'Add New Insurance Tariff Item'}</span>
          <Chip
            label="PostgreSQL Persisted"
            color="primary"
            size="small"
            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
          />
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            <Typography variant="body2">
              Configure standard hospital private fees alongside health scheme tariffs (NHIA, State Agency, Mutual Risk Pools, and HMOs). Add or remove scheme rates dynamically as configured in your insurance schemes registry.
            </Typography>
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Service Category</InputLabel>
                <Select
                  value={tariffForm.category}
                  label="Service Category"
                  onChange={(e) => setTariffForm({ ...tariffForm, category: e.target.value })}
                >
                  {['Consultation', 'Laboratory', 'Radiology', 'Surgery', 'Maternity', 'Inpatient', 'Dental', 'Ophthalmology', 'Physiotherapy', 'Pharmacy', 'General'].map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Service Code"
                placeholder="e.g. SUR-CS-01 (Auto-generated if blank)"
                value={tariffForm.serviceCode}
                onChange={(e) => setTariffForm({ ...tariffForm, serviceCode: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Pre-Authorization Rule</InputLabel>
                <Select
                  value={tariffForm.preAuthRule}
                  label="Pre-Authorization Rule"
                  onChange={(e) => setTariffForm({ ...tariffForm, preAuthRule: e.target.value })}
                >
                  <MenuItem value="Covered under Primary Plan">Covered under Primary Plan</MenuItem>
                  <MenuItem value="Covered under Capitation">Covered under Capitation</MenuItem>
                  <MenuItem value="Primary Cover (10% Co-Pay)">Primary Cover (10% Co-Pay)</MenuItem>
                  <MenuItem value="Mandatory Prior Authorization">Mandatory Prior Authorization</MenuItem>
                  <MenuItem value="Requires PA Code">Requires PA Code</MenuItem>
                  <MenuItem value="Referral Letter Required">Referral Letter Required</MenuItem>
                  <MenuItem value="100% Covered Maternal Window">100% Covered Maternal Window</MenuItem>
                  <MenuItem value="Specialist Pre-Auth Required">Specialist Pre-Auth Required</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                required
                label="Service / Procedure Name"
                placeholder="e.g. Caesarean Section (Elective/Emergency)"
                value={tariffForm.serviceName}
                onChange={(e) => setTariffForm({ ...tariffForm, serviceName: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Standard Hospital Private Fee (₦)"
                value={tariffForm.privateFee}
                onChange={(e) => setTariffForm({ ...tariffForm, privateFee: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Default Statutory Co-Pay %"
                value={tariffForm.copayPercentage}
                onChange={(e) => setTariffForm({ ...tariffForm, copayPercentage: Number(e.target.value) })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>

            {/* Dynamic Scheme Tariffs Configurator */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1.5px solid #cbd5e1' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.navy, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PolicyIcon sx={{ color: C.blue, fontSize: 18 }} /> Health Insurance Schemes Tariff Schedule
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.gray }}>
                      Configure service tariffs and capitation rules for each enrolled insurance scheme.
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    {schemes.length > (tariffForm.schemeTariffs?.length || 0) && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleAddAllSchemesToTariff}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5 }}
                      >
                        Add All Configured Schemes
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Add />}
                      onClick={handleAddSchemeTariffRow}
                      sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                    >
                      Add Scheme Rate
                    </Button>
                  </Stack>
                </Box>

                {(!tariffForm.schemeTariffs || tariffForm.schemeTariffs.length === 0) ? (
                  <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#ffffff', borderRadius: 1.5, border: '1px dashed #cbd5e1' }}>
                    <Typography variant="body2" sx={{ color: C.gray, mb: 1.5 }}>
                      No insurance scheme rates added yet for this procedure.
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Add />}
                      onClick={handleAddSchemeTariffRow}
                      sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700 }}
                    >
                      Add First Scheme Tariff
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={1.5}>
                    {tariffForm.schemeTariffs.map((st: any, idx: number) => {
                      const schemeObj = schemes.find(s => s.code === st.schemeCode);
                      return (
                        <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                          <Grid container spacing={1.5} alignItems="center">
                            {/* Scheme Selector */}
                            <Grid item xs={12} sm={4.5}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Insurance Scheme</InputLabel>
                                <Select
                                  value={st.schemeCode}
                                  label="Insurance Scheme"
                                  onChange={(e) => handleSchemeTariffFieldChange(idx, 'schemeCode', e.target.value)}
                                >
                                  {schemes.map(s => (
                                    <MenuItem key={s.code} value={s.code}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color || C.blue }} />
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.shortName || s.name}</Typography>
                                      </Box>
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>

                            {/* Capitation / Pricing Type Toggle */}
                            <Grid item xs={6} sm={3}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    size="small"
                                    checked={Boolean(st.isCapitated)}
                                    onChange={(e) => handleSchemeTariffFieldChange(idx, 'isCapitated', e.target.checked)}
                                    color="success"
                                  />
                                }
                                label={
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: st.isCapitated ? C.green : C.gray }}>
                                    {st.isCapitated ? 'Capitated (₦0)' : 'Fee-for-Service'}
                                  </Typography>
                                }
                              />
                            </Grid>

                            {/* Tariff Amount (₦) */}
                            <Grid item xs={4.5} sm={3.5}>
                              <TextField
                                fullWidth
                                size="small"
                                type="number"
                                label={st.isCapitated ? "Capitated" : "Scheme Tariff (₦)"}
                                disabled={Boolean(st.isCapitated)}
                                value={st.isCapitated ? 0 : st.tariffAmount}
                                onChange={(e) => handleSchemeTariffFieldChange(idx, 'tariffAmount', Number(e.target.value))}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                                }}
                              />
                            </Grid>

                            {/* Remove Scheme Button */}
                            <Grid item xs={1.5} sm={1} sx={{ textAlign: 'center' }}>
                              <Tooltip title="Remove this Insurance Scheme">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveSchemeTariffRow(idx)}
                                  sx={{ bgcolor: '#fee2e2', '&:hover': { bgcolor: '#fecaca' } }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Grid>
                          </Grid>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setOpenAddTariffDialog(false);
              setOpenEditTariffDialog(false);
              setEditingTariffId(null);
            }}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={savingTariff}
            onClick={openEditTariffDialog ? handleUpdateTariff : handleSaveNewTariff}
            sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700 }}
          >
            {savingTariff ? <CircularProgress size={20} color="inherit" /> : (openEditTariffDialog ? 'Update Tariff in Database' : 'Save Tariff to Database')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: ADD / EDIT ACCREDITED HOSPITAL UNIT
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={openAddUnitDialog || openEditUnitDialog}
        onClose={() => {
          setOpenAddUnitDialog(false);
          setOpenEditUnitDialog(false);
          setEditingUnitId(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: C.navy, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Business sx={{ color: C.blue }} />
          {openEditUnitDialog ? 'Edit Accredited Hospital Unit' : 'Add New Accredited Hospital Unit'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {/* Unit Name */}
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                size="small"
                label="Hospital Department / Unit Name *"
                placeholder="e.g. Accident & Emergency (A&E) / Casualty Department"
                value={unitForm.unitName}
                onChange={(e) => setUnitForm({ ...unitForm, unitName: e.target.value })}
              />
            </Grid>

            {/* Department Code */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="System Code *"
                placeholder="e.g. EMERGENCY_DEPT"
                value={unitForm.code}
                onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                helperText="Unique uppercase identifier"
              />
            </Grid>

            {/* Accreditation Level */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Accreditation Level</InputLabel>
                <Select
                  value={unitForm.accreditationLevel}
                  label="Accreditation Level"
                  onChange={(e) => setUnitForm({ ...unitForm, accreditationLevel: e.target.value })}
                >
                  <MenuItem value="PRIMARY_CARE">Primary Care Only</MenuItem>
                  <MenuItem value="PRIMARY_SECONDARY">Primary & Secondary Care</MenuItem>
                  <MenuItem value="SECONDARY_CARE_WARDS">Secondary Care & Inpatient Wards</MenuItem>
                  <MenuItem value="MAJOR_SURGICAL_SUITE">Major Surgical Operating Suite</MenuItem>
                  <MenuItem value="COMPREHENSIVE_EMOC">Comprehensive EmOC (Maternity)</MenuItem>
                  <MenuItem value="TERTIARY_24_7">Tertiary 24/7 Casualty & Emergency</MenuItem>
                  <MenuItem value="TERTIARY_ISO15189">Tertiary Diagnostic Lab (ISO 15189)</MenuItem>
                  <MenuItem value="ADVANCED_IMAGING">Advanced Medical Imaging & Radiology</MenuItem>
                  <MenuItem value="FORMULARY_DISPENSARY">Pharmacy & Drug Revolving Dispensary</MenuItem>
                  <MenuItem value="REHABILITATION_CLINIC">Rehabilitation & Physiotherapy</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Accreditation Status</InputLabel>
                <Select
                  value={unitForm.status}
                  label="Accreditation Status"
                  onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value })}
                >
                  <MenuItem value="ACCREDITED">Accredited (Compliant)</MenuItem>
                  <MenuItem value="PROVISIONAL">Provisional Accreditation</MenuItem>
                  <MenuItem value="PENDING_RENEWAL">Pending Renewal</MenuItem>
                  <MenuItem value="SUSPENDED">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Lead Officer */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Lead Officer / Head of Department"
                placeholder="e.g. Dr. Ifeanyi Okoro (Emergency Director)"
                value={unitForm.leadOfficer}
                onChange={(e) => setUnitForm({ ...unitForm, leadOfficer: e.target.value })}
              />
            </Grid>

            {/* Accreditation Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Accreditation Date"
                InputLabelProps={{ shrink: true }}
                value={unitForm.accreditationDate}
                onChange={(e) => setUnitForm({ ...unitForm, accreditationDate: e.target.value })}
              />
            </Grid>

            {/* Renewal Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Accreditation Renewal / Expiry Date"
                InputLabelProps={{ shrink: true }}
                value={unitForm.renewalDate}
                onChange={(e) => setUnitForm({ ...unitForm, renewalDate: e.target.value })}
              />
            </Grid>

            {/* Health Schemes Covered Multi-select */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.navy, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PolicyIcon sx={{ color: C.blue, fontSize: 18 }} /> Health Insurance Schemes Covered
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.gray }}>
                      Click schemes to toggle accreditation coverage for this unit.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleSelectAllUnitSchemes}
                      sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 600, borderRadius: 1.5 }}
                    >
                      Select All ({schemes.length})
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      onClick={handleClearAllUnitSchemes}
                      sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 600, borderRadius: 1.5 }}
                    >
                      Clear
                    </Button>
                  </Stack>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                  {schemes.map((scheme) => {
                    const isSelected = unitForm.schemesCovered?.includes(scheme.code);
                    return (
                      <Chip
                        key={scheme.code}
                        label={`${scheme.name || scheme.shortName || scheme.code} (${scheme.code})`}
                        clickable
                        onClick={() => handleToggleUnitScheme(scheme.code)}
                        icon={isSelected ? <Check fontSize="small" /> : undefined}
                        color={isSelected ? 'primary' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          borderRadius: 2,
                          py: 2,
                          bgcolor: isSelected ? C.blue : 'white',
                          borderColor: isSelected ? C.blue : '#cbd5e1',
                          color: isSelected ? 'white' : '#475569',
                          '&:hover': {
                            bgcolor: isSelected ? '#172554' : '#f1f5f9'
                          }
                        }}
                      />
                    );
                  })}
                </Stack>
              </Paper>
            </Grid>

            {/* Services Rendered */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                label="Clinical Services & Capabilities Rendered *"
                placeholder="e.g. Resuscitation, STAT Trauma, Minor Surgery, Acute Admissions, 24/7 Casualty"
                value={unitForm.services}
                onChange={(e) => setUnitForm({ ...unitForm, services: e.target.value })}
                helperText="List specific procedures and diagnostic services provided at this accredited station"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setOpenAddUnitDialog(false);
              setOpenEditUnitDialog(false);
              setEditingUnitId(null);
            }}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={savingUnit}
            onClick={openEditUnitDialog ? handleUpdateUnit : handleSaveNewUnit}
            sx={{ bgcolor: C.blue, textTransform: 'none', fontWeight: 700 }}
          >
            {savingUnit ? <CircularProgress size={20} color="inherit" /> : (openEditUnitDialog ? 'Update Unit in Database' : 'Save Unit to Database')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: CONFIRM DELETE ACCREDITED UNIT
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={openDeleteUnitDialog}
        onClose={() => setOpenDeleteUnitDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: C.red }}>
          Delete Accredited Hospital Unit
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Are you sure you want to permanently delete the following accredited unit from PostgreSQL?
          </Typography>
          {deletingUnit && (
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#fef2f2', borderColor: '#fecaca', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.navy }}>
                {deletingUnit.unitName}
              </Typography>
              <Typography variant="caption" sx={{ color: C.gray, display: 'block' }}>
                Code: <strong>{deletingUnit.code}</strong> · Level: <strong>{deletingUnit.accreditationLevel}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: C.navy, display: 'block', mt: 0.5 }}>
                Lead: <strong>{deletingUnit.leadOfficer}</strong>
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteUnitDialog(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteUnit}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Permanently Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOG: CONFIRM DELETE TARIFF
         ══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={openDeleteTariffDialog}
        onClose={() => setOpenDeleteTariffDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: C.red }}>
          Delete Insurance Tariff
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Are you sure you want to permanently delete the following tariff item from PostgreSQL?
          </Typography>
          {deletingTariff && (
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#fef2f2', borderColor: '#fecaca', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.navy }}>
                {deletingTariff.serviceName}
              </Typography>
              <Typography variant="caption" sx={{ color: C.gray, display: 'block' }}>
                Code: <strong>{deletingTariff.serviceCode}</strong> · Category: <strong>{deletingTariff.category}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: C.red, fontWeight: 700, display: 'block', mt: 0.5 }}>
                Private: ₦{Number(deletingTariff.privateFee || 0).toLocaleString()} · NHIA: ₦{Number(deletingTariff.nhiaTariff || 0).toLocaleString()}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteTariffDialog(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteTariff}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Permanently Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
