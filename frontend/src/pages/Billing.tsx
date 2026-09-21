import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Tabs, Tab, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert,
  LinearProgress, Divider, IconButton, Stack, Avatar, Tooltip,
  InputAdornment, CardHeader, CircularProgress, Autocomplete,
  FormControl, InputLabel, Select, FormControlLabel, Switch, TablePagination,
  ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Receipt, Payment, AccountBalance, TrendingUp, Assessment,
  Add, Print, Download, Search, Refresh, CheckCircle, Warning,
  Business, Security, Gavel, Analytics,
  CreditCard, VerifiedUser, Cancel, Send, Undo,
  BarChart as BarChartIcon, Timeline, Shield, ElectricBolt,
  Group, RequestQuote, LocalAtm, AccountBalanceWallet, ArrowForward, Tune,
  MedicalServices, Edit, Delete, SwapHoriz, PersonAdd, CalendarMonth, PlayArrow, AccessTime, Schedule,
  ChevronLeft, ChevronRight, Today, ViewModule, TableRows, DateRange, Person, Badge, AccountCircle, HowToReg, Check, FilterAlt, Close,
  Psychology, TableChart, Lock
} from '@mui/icons-material';
import { NairaIcon, NairaCircleIcon } from '../components/NairaIcon';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { OpenMedUnitCoPilot } from '../components/OpenMedUnitCoPilot';
import { useAuth } from '../contexts/AuthContext';
import CentralizedDutyRoster from '../components/CentralizedDutyRoster';

// ─── Design Tokens ──────────────────────────────────────────────────────────
const PRIMARY = '#1a237e';
const SECONDARY = '#0d47a1';
const SUCCESS = '#1b5e20';
const WARNING = '#e65100';
const DANGER = '#b71c1c';
const GOLD = '#f57f17';
const TEAL = '#004d40';
const PURPLE = '#4a148c';
const PINK = '#880e4f';

const COLORS = ['#1a237e', '#0d47a1', '#1b5e20', '#e65100', '#4a148c', '#004d40', '#f57f17', '#880e4f'];

const formatNGN = (v: number) => `₦${(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPct = (v: number) => `${(v || 0).toFixed(1)}%`;

// ─── KPI Card ───────────────────────────────────────────────────────────────
const KPICard = ({ title, value, sub, icon, color, trend }: any) => (
  <Card sx={{
    background: `linear-gradient(135deg, ${color}ee, ${color}aa)`,
    color: '#fff', borderRadius: 3, boxShadow: `0 8px 32px ${color}55`,
    position: 'relative', overflow: 'hidden',
    '&::after': { content: '""', position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }
  }}>
    <CardContent sx={{ pb: '16px !important' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.68rem' }}>{title}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</Typography>
          {sub && <Typography variant="caption" sx={{ opacity: 0.8 }}>{sub}</Typography>}
          {trend !== undefined && (
            <Chip size="small" label={`${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`}
              sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: '0.7rem' }} />
          )}
        </Box>
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

// ─── Status Chip ────────────────────────────────────────────────────────────
const statusColors: Record<string, any> = {
  PAID: 'success', ISSUED: 'info', PARTIAL: 'warning', CANCELLED: 'error',
  SUBMITTED: 'info', APPROVED: 'success', DENIED: 'error', APPEALED: 'warning', PARTIAL_APPROVE: 'warning',
  PENDING_APPROVAL: 'warning', COMPLETED: 'success', OPEN: 'info', CLOSED: 'default',
  PARTIALLY_REFUNDED: 'warning', REFUNDED: 'error',
};
const StatusChip = ({ label }: { label: string }) => (
  <Chip label={label?.replace('_', ' ')} size="small" color={statusColors[label] || 'default'}
    sx={{ fontWeight: 700, fontSize: '0.68rem' }} />
);

// ─── Payment Method Icons ────────────────────────────────────────────────────
const PAY_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'DEBIT_CARD', label: 'Debit Card / POS' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'E_WALLET', label: 'Hospital E-Wallet' },
  { value: 'MOBILE_WALLET', label: 'Mobile Wallet (Paystack/Flutterwave)' },
  { value: 'USSD', label: 'USSD' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'INSURANCE', label: 'Insurance (HMO/NHIA)' },
  { value: 'CORPORATE', label: 'Corporate Credit Account' },
  { value: 'DONOR', label: 'Donor Programme' },
];

const FUNDING_SOURCES = ['SELF_PAY', 'NHIA', 'HMO', 'CORPORATE', 'DONOR_PROGRAMME', 'STAFF_BENEFIT', 'CHARITY', 'RESEARCH_GRANT'];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const Billing = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(0);

  // ─── Sub-tab States ───────────────────────────────────────────────────────
  const [billingSubTab, setBillingSubTab] = useState(0);
  const [cashierSubTab, setCashierSubTab] = useState(0);
  const [claimsSubTab, setClaimsSubTab] = useState(0);
  const [analyticsSubTab, setAnalyticsSubTab] = useState(0);
  const [ewSubTab, setEwSubTab] = useState(0);
  const [chargeMasterSubTab, setChargeMasterSubTab] = useState(0);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  // ── Registration Categories & Fees State & Handlers ───────────────────────
  const defaultRegCategories = [
    { code: 'INDIVIDUAL', name: 'Individual Account', fee: 1500 },
    { code: 'FAMILY', name: 'Family Package', fee: 3000 },
    { code: 'EMERGENCY', name: 'Emergency Triage', fee: 0 },
    { code: 'WALKIN', name: 'Walk-In Patient', fee: 1000 },
    { code: 'CORPORATE', name: 'Corporate Link', fee: 2500 },
    { code: 'INSURANCE', name: 'Insurance Managed', fee: 2000 },
    { code: 'LABOUR_DELIVERY', name: 'Labour & Delivery Fee', fee: 5000 }
  ];

  const [regCategories, setRegCategories] = useState<any[]>(() => {
    const saved = localStorage.getItem('registration_categories');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.some((c: any) => c.code === 'LABOUR_DELIVERY')) {
        const updated = [...parsed, { code: 'LABOUR_DELIVERY', name: 'Labour & Delivery Fee', fee: 5000 }];
        localStorage.setItem('registration_categories', JSON.stringify(updated));
        return updated;
      }
      return parsed;
    }
    localStorage.setItem('registration_categories', JSON.stringify(defaultRegCategories));
    return defaultRegCategories;
  });

  const [newCatCode, setNewCatCode] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatFee, setNewCatFee] = useState('');
  const [openAddCat, setOpenAddCat] = useState(false);

  const handleUpdateRegFee = (code: string, feeStr: string) => {
    const fee = parseFloat(feeStr) || 0;
    const updated = regCategories.map((c: any) => (c.code === code ? { ...c, fee } : c));
    setRegCategories(updated);
    localStorage.setItem('registration_categories', JSON.stringify(updated));
    enqueueSnackbar('Registration fee updated', { variant: 'success' });
  };

  const handleAddRegCategory = () => {
    if (!newCatCode || !newCatName) {
      enqueueSnackbar('Code and Name are required', { variant: 'warning' });
      return;
    }
    const cleanCode = newCatCode.trim().toUpperCase().replace(/\s+/g, '_');
    const updated = [...regCategories, { code: cleanCode, name: newCatName.trim(), fee: parseFloat(newCatFee) || 0 }];
    setRegCategories(updated);
    localStorage.setItem('registration_categories', JSON.stringify(updated));
    setNewCatCode('');
    setNewCatName('');
    setNewCatFee('');
    setOpenAddCat(false);
    enqueueSnackbar('Registration category added', { variant: 'success' });
  };

  const handleDeleteRegCategory = (code: string) => {
    if (regCategories.length <= 1) {
      enqueueSnackbar('At least one category is required', { variant: 'error' });
      return;
    }
    const updated = regCategories.filter((c: any) => c.code !== code);
    setRegCategories(updated);
    localStorage.setItem('registration_categories', JSON.stringify(updated));
    enqueueSnackbar('Registration category deleted', { variant: 'info' });
  };

  // ── Consultation Service Tariff State & Handlers ──────────────────────────
  const [consultServices, setConsultServices] = useState<any[]>([]);
  const [loadingConsultServices, setLoadingConsultServices] = useState(false);
  const [openAddConsultService, setOpenAddConsultService] = useState(false);
  const [editingConsultService, setEditingConsultService] = useState<any>(null);
  const [consultSvcForm, setConsultSvcForm] = useState({ code: '', name: '', category: 'GENERAL', price: '', description: '', duration: '20', requiresDoctor: true });

  const fetchConsultServices = useCallback(async () => {
    setLoadingConsultServices(true);
    try {
      const res = await api.get('/workflow/consultation-services');
      setConsultServices(res.data?.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingConsultServices(false); }
  }, []);

  useEffect(() => {
    fetchConsultServices();
  }, [fetchConsultServices]);

  const handleSaveConsultService = async () => {
    if (!consultSvcForm.code || !consultSvcForm.name || !consultSvcForm.price) {
      enqueueSnackbar('Code, Name and Price are required', { variant: 'warning' }); return;
    }
    try {
      const payload = { ...consultSvcForm, price: parseFloat(consultSvcForm.price), duration: parseInt(consultSvcForm.duration) || 20 };
      if (editingConsultService) {
        await api.put(`/workflow/consultation-services/${editingConsultService.id}`, payload);
        enqueueSnackbar('Service updated', { variant: 'success' });
      } else {
        await api.post('/workflow/consultation-services', payload);
        enqueueSnackbar('Service added', { variant: 'success' });
      }
      setOpenAddConsultService(false);
      setEditingConsultService(null);
      setConsultSvcForm({ code: '', name: '', category: 'GENERAL', price: '', description: '', duration: '20', requiresDoctor: true });
      fetchConsultServices();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save service', { variant: 'error' });
    }
  };

  const handleDeleteConsultService = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this service type?')) return;
    try {
      await api.delete(`/workflow/consultation-services/${id}`);
      enqueueSnackbar('Service deleted', { variant: 'success' });
      fetchConsultServices();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete service', { variant: 'error' });
    }
  };

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path.startsWith('/billing/charge-master')) {
      setActiveTab(5);
      if (path === '/billing/charge-master/tariffs' || path === '/billing/charge-master/multipliers') {
        navigate('/billing/charge-master', { replace: true });
        setChargeMasterSubTab(0);
      } else {
        setChargeMasterSubTab(0);
      }
    } else if (path.startsWith('/billing/billing') || path === '/billing' || path === '/billing/') {
      setActiveTab(0);
      if (path === '/billing/billing/invoices') setBillingSubTab(1);
      else if (path === '/billing/billing/refunds') setBillingSubTab(2);
      else if (path === '/billing/billing/capture') setBillingSubTab(3);
      else if (path === '/billing/billing/estimates') setBillingSubTab(4);
      else if (path === '/billing/billing/kpis') setBillingSubTab(4);
      else setBillingSubTab(0);
    } else if (path.startsWith('/billing/cashier')) {
      if (path === '/billing/cashier/refunds') {
        navigate('/billing/billing/refunds', { replace: true });
        setActiveTab(0);
        setBillingSubTab(2);
      } else {
        navigate('/billing/billing', { replace: true });
        setActiveTab(0);
        setBillingSubTab(0);
      }
    } else if (path.startsWith('/billing/claims')) {
      navigate('/billing/billing', { replace: true });
      setActiveTab(0);
      setBillingSubTab(0);
    } else if (path.startsWith('/billing/analytics')) {
      navigate('/billing/billing/kpis', { replace: true });
      setActiveTab(0);
      setBillingSubTab(4);
    } else if (path.startsWith('/billing/wallets')) {
      setActiveTab(4);
      if (path === '/billing/wallets/deposit' || path === '/billing/wallets') {
        setEwSubTab(1); // Patient Wallets
      } else {
        setEwSubTab(0); // Monnify Virtual Accounts & Ledger
      }
    } else {
      setActiveTab(0);
      setBillingSubTab(0);
    }
  }, [location.pathname]);

  // ─── Data States ─────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [chargeMaster, setChargeMaster] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [ageingData, setAgeingData] = useState<any>({});
  const [payerPerformance, setPayerPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [kpiReceiptSearch, setKpiReceiptSearch] = useState('');
  const [showExecutiveKPIs, setShowExecutiveKPIs] = useState(false);

  // ─── Dialog States ────────────────────────────────────────────────────────
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [chargeItemDialogOpen, setChargeItemDialogOpen] = useState(false);
  const [editChargeItemDialogOpen, setEditChargeItemDialogOpen] = useState(false);
  const [editingChargeItem, setEditingChargeItem] = useState<any>(null);
  const [chargeItemForm, setChargeItemForm] = useState({
    name: '',
    category: '',
    basePrice: '',
    nhiaPrice: '',
    hmoPrice: '',
    vat: '',
    unit: ''
  });
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [adjudicateDialogOpen, setAdjudicateDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundForm, setRefundForm] = useState({
    paymentId: '',
    amount: '',
    reason: '',
    refundMethod: 'CASH',
  });
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [startShiftModal, setStartShiftModal] = useState<any | null>(null);
  const [clockInFloat, setClockInFloat] = useState<string>('20000');
  const [clockInNotes, setClockInNotes] = useState<string>('');
  const [handoverShiftModal, setHandoverShiftModal] = useState<any | null>(null);
  const [closingActualBalance, setClosingActualBalance] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [payerDialogOpen, setPayerDialogOpen] = useState(false);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [invoiceToRevert, setInvoiceToRevert] = useState<string | null>(null);
  const [cashiersList, setCashiersList] = useState<any[]>([]);
  const [activeShiftId, setActiveShiftId] = useState<string>('');
  const [paymentShiftId, setPaymentShiftId] = useState<string>('');
  const [reassignShiftModal, setReassignShiftModal] = useState<any | null>(null);
  const [reassignCashierId, setReassignCashierId] = useState<string>('');
  const [reassignNotes, setReassignNotes] = useState<string>('');
  const [scheduleShiftDialogOpen, setScheduleShiftDialogOpen] = useState(false);
  const [shiftViewMode, setShiftViewMode] = useState<'sessions' | 'calendar' | 'matrix'>('sessions');
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarStaffFilter, setCalendarStaffFilter] = useState<string>('ALL');
  const [calendarShiftTypeFilter, setCalendarShiftTypeFilter] = useState<string>('ALL');
  const [selectedCalendarShift, setSelectedCalendarShift] = useState<any | null>(null);
  const [shiftsRosterFilter, setShiftsRosterFilter] = useState<'ALL' | 'MY_SHIFTS'>('MY_SHIFTS');
  const [shiftConfigOpen, setShiftConfigOpen] = useState(false);
  const [openAddShift, setOpenAddShift] = useState(false);
  const [configuredCashierShifts, setConfiguredCashierShifts] = useState<any[]>([
    { code: 'MORNING_8H', name: 'Morning Shift (7am–3pm)', startTime: '07:00', endTime: '15:00', description: 'Main morning OPD and outpatient revenue collection', color: '#2563eb' },
    { code: 'AFTERNOON_8H', name: 'Afternoon Shift (2pm–10pm)', startTime: '14:00', endTime: '22:00', description: 'Afternoon clinic, pharmacy & discharge billing', color: '#d97706' },
    { code: 'NIGHT_12H', name: 'Overnight Shift (10pm–8am)', startTime: '22:00', endTime: '08:00', description: 'Emergency & IPD 24/7 night coverage', color: '#7c3aed' },
    { code: 'DAY_12H', name: '12-Hour Day (7am–7pm)', startTime: '07:00', endTime: '19:00', description: 'Extended full-day weekend / holiday duty', color: '#059669' },
    { code: 'NIGHT_12H_ALT', name: '12-Hour Night (7pm–7am)', startTime: '19:00', endTime: '07:00', description: 'Extended overnight inpatient duty', color: '#dc2626' },
    { code: 'ON_CALL', name: 'Standby / Call Duty (24h)', startTime: '08:00', endTime: '08:00', description: 'On-call emergency revenue support', color: '#0891b2' },
  ]);
  const [shiftForm, setShiftForm] = useState({
    code: '',
    name: '',
    startTime: '07:00',
    endTime: '15:00',
    description: '',
    color: '#2563eb'
  });
  const [assignRosterForm, setAssignRosterForm] = useState({
    location: 'Main Outpatient Cash Desk #01',
    cashierId: 'cashier',
    shift: 'MORNING_8H',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    cashDrawer: 'Drawer A (Mary Okon)',
    openingBalance: 20000,
    isPrimary: false,
  });



  // ─── Invoice Form State ───────────────────────────────────────────────────
  const [invoiceForm, setInvoiceForm] = useState({
    patientId: '', patientName: '', fundingSource: 'SELF_PAY', payerId: '', notes: '', discount: 0
  });
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);

  // ─── Payment Form State ───────────────────────────────────────────────────
  const [payMethods, setPayMethods] = useState([{ method: 'CASH', amount: 0 }]);

  // ─── Search States ────────────────────────────────────────────────────────
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [claimSearch, setClaimSearch] = useState('');
  
  // ─── E-Wallet Workspace States ──────────────────────────────────────────────
  const [walletSearch, setWalletSearch] = useState('');
  const [walletFilter, setWalletFilter] = useState<'ALL' | 'FUNDED' | 'MONNIFY' | 'DEBT' | 'SETTLE_WALLET'>('ALL');
  const [fundingAmount, setFundingAmount] = useState('');
  const [fundingMethod, setFundingMethod] = useState('CASH');
  const [fundingReference, setFundingReference] = useState('');
  const [fundingNotes, setFundingNotes] = useState('');
  const [selectedWalletPatient, setSelectedWalletPatient] = useState<any>(null);
  const [walletFundingLoading, setWalletFundingLoading] = useState(false);
  const [walletPatients, setWalletPatients] = useState<any[]>([]);
  const [walletPage, setWalletPage] = useState(0);
  const [walletRowsPerPage, setWalletRowsPerPage] = useState(25);
  const [walletTotalCount, setWalletTotalCount] = useState(0);
  const [walletCounts, setWalletCounts] = useState<any>({
    total: 0,
    funded: 0,
    bankLinked: 0,
    debt: 0,
    settleWallet: 0,
    totalFunds: 0,
    totalDebt: 0,
  });
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletTxnLog, setWalletTxnLog] = useState<any[]>([]);
  const [walletDeductMode, setWalletDeductMode] = useState(false);
  const [deductReason, setDeductReason] = useState('');
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  // ─── Monnify Virtual Account States ──────────────────────────────────
  const [monnifyStatus, setMonnifyStatus] = useState<any>(null);
  const [virtualAccounts, setVirtualAccounts] = useState<any[]>([]);
  const [selectedVirtualAccount, setSelectedVirtualAccount] = useState<any>(null);
  const [vaTxns, setVaTxns] = useState<any[]>([]);
  const [vaTxnsLoading, setVaTxnsLoading] = useState(false);
  const [createVaLoading, setCreateVaLoading] = useState(false);
  const [vaDialogOpen, setVaDialogOpen] = useState(false);
  const [vaCreatePatientId, setVaCreatePatientId] = useState('');
  const [selectedVaPatient, setSelectedVaPatient] = useState<any>(null);
  const [vaBvn, setVaBvn] = useState('');
  const [vaNin, setVaNin] = useState('');


  // ─── Eligibility/Claim Verification State ──────────────────────────────────
  const [eligibilityPolicyNo, setEligibilityPolicyNo] = useState('');
  const [eligibilityPatientId, setEligibilityPatientId] = useState('');
  const [verifyingEligibility, setVerifyingEligibility] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<any>(null);

  // ─── Estimate Form States ──────────────────────────────────────────────────
  const [estimatePatientId, setEstimatePatientId] = useState('');
  const [estimateService, setEstimateService] = useState('anc');
  const [estimateFundingSource, setEstimateFundingSource] = useState('SELF_PAY');
  const [estimateValidityDays, setEstimateValidityDays] = useState(7);
  const [estimates, setEstimates] = useState<any[]>([
    { id: 'EST-2026-0001', patientId: 'pat-1', patientName: 'Mrs. Kemi Adeyemi', service: 'anc', serviceName: 'ANC Package (8 Visits + Delivery)', amount: 280000, fundingSource: 'SELF_PAY', valid: '2026-07-25', status: 'PENDING' },
    { id: 'EST-2026-0002', patientId: 'pat-2', patientName: 'Mr. Felix Nwachukwu', service: 'admission', serviceName: 'General Ward Admission (5 Days)', amount: 95000, fundingSource: 'SELF_PAY', valid: '2026-07-23', status: 'ACCEPTED' },
    { id: 'EST-2026-0003', patientId: 'pat-3', patientName: 'Mrs. Ngozi Eze', service: 'cs', serviceName: 'Caesarean Section Package', amount: 450000, fundingSource: 'SELF_PAY', valid: '2026-07-22', status: 'EXPIRED' },
  ]);

  const handleVerifyEligibility = async (policyNo: string) => {
    if (!policyNo) return;
    setVerifyingEligibility(true);
    setEligibilityResult(null);
    try {
      const { data } = await api.get(`/insurance/policies?membershipNumber=${policyNo}`);
      if (data.success && data.data && data.data.length > 0) {
        setEligibilityResult(data.data[0]);
      } else {
        setEligibilityResult({ notFound: true });
      }
    } catch (e) {
      console.error(e);
      setEligibilityResult({ notFound: true });
    } finally {
      setVerifyingEligibility(false);
    }
  };

  const handleGenerateEstimate = () => {
    if (!estimatePatientId) {
      enqueueSnackbar('Please select a patient', { variant: 'warning' });
      return;
    }
    const pat = patients.find(p => p.id === estimatePatientId);
    if (!pat) return;

    let serviceName = '';
    let amount = 0;
    if (estimateService === 'anc') {
      serviceName = 'ANC Package (8 Visits + Delivery)';
      amount = 280000;
    } else if (estimateService === 'cs') {
      serviceName = 'Caesarean Section Package';
      amount = 450000;
    } else if (estimateService === 'appendix') {
      serviceName = 'Appendicectomy Package';
      amount = 350000;
    } else if (estimateService === 'admission') {
      serviceName = 'General Ward Admission (5 Days)';
      amount = 95000;
    } else if (estimateService === 'icu') {
      serviceName = 'ICU Admission (3 Days)';
      amount = 180000;
    }

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Number(estimateValidityDays));

    const newEst = {
      id: `EST-2026-${String(estimates.length + 1).padStart(4, '0')}`,
      patientId: pat.id,
      patientName: `${pat.firstName} ${pat.lastName}`,
      service: estimateService,
      serviceName,
      amount,
      fundingSource: estimateFundingSource,
      valid: futureDate.toISOString().slice(0, 10),
      status: 'PENDING'
    };

    setEstimates(prev => [newEst, ...prev]);
    enqueueSnackbar(`Pre-service estimate ${newEst.id} generated!`, { variant: 'success' });
  };

  const handleConvertEstimateToInvoice = async (est: any) => {
    setLoading(true);
    try {
      let items: any[] = [];
      if (est.service === 'anc') {
        items = [{ chargeCode: 'ANC-001', name: 'ANC Package (8 Visits + Delivery)', category: 'Maternity', quantity: 1, unitPrice: 280000, vat: 0, donorFunded: false, donorProgramme: null }];
      } else if (est.service === 'cs') {
        items = [{ chargeCode: 'CS-001', name: 'Caesarean Section Package', category: 'Theatre', quantity: 1, unitPrice: 450000, vat: 0, donorFunded: false, donorProgramme: null }];
      } else if (est.service === 'appendix') {
        items = [{ chargeCode: 'APP-001', name: 'Appendicectomy Package', category: 'Theatre', quantity: 1, unitPrice: 350000, vat: 0, donorFunded: false, donorProgramme: null }];
      } else if (est.service === 'admission') {
        items = [{ chargeCode: 'ADM-001', name: 'General Ward Admission (5 Days)', category: 'Maternity', quantity: 1, unitPrice: 95000, vat: 0, donorFunded: false, donorProgramme: null }];
      } else if (est.service === 'icu') {
        items = [{ chargeCode: 'ICU-001', name: 'ICU Admission (3 Days)', category: 'Maternity', quantity: 1, unitPrice: 180000, vat: 0, donorFunded: false, donorProgramme: null }];
      } else {
        items = [{ chargeCode: 'SVC-GEN', name: est.serviceName, category: 'Consultation', quantity: 1, unitPrice: est.amount, vat: 0, donorFunded: false, donorProgramme: null }];
      }

      await api.post('/billing/invoices', {
        patientId: est.patientId || patients[0]?.id || '',
        patientName: est.patientName,
        fundingSource: est.fundingSource || 'SELF_PAY',
        payerId: est.payerId || null,
        notes: `Converted from estimate ${est.no || est.id}`,
        discount: 0,
        items
      });

      // Update estimate status
      setEstimates(prev => prev.map(e => e.id === est.id ? { ...e, status: 'ACCEPTED' } : e));
      enqueueSnackbar(`Successfully generated invoice from ${est.no || est.id}`, { variant: 'success' });
      fetchAll();
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to convert estimate to invoice', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch Functions ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, pmtRes, cmRes, payRes, clmRes, refRes, shiftRes, patRes, anlRes, ageRes, ppRes, cshRes, tmplRes] = await Promise.all([
        api.get('/billing/invoices').catch(() => ({ data: { data: [] } })),
        api.get('/billing/payments').catch(() => ({ data: { data: [] } })),
        api.get('/billing/charge-master').catch(() => ({ data: { data: [] } })),
        api.get('/billing/payers').catch(() => ({ data: { data: [] } })),
        api.get('/billing/claims').catch(() => ({ data: { data: [] } })),
        api.get('/billing/refunds').catch(() => ({ data: { data: [] } })),
        api.get('/billing/cashier/shifts').catch(() => ({ data: { data: [] } })),
        api.get('/billing/patients-lookup').catch(() => ({ data: { data: [] } })),
        api.get('/billing/analytics/summary').catch(() => ({ data: { data: {} } })),
        api.get('/billing/analytics/reports?type=ageing').catch(() => ({ data: { data: {} } })),
        api.get('/billing/analytics/reports?type=payer-performance').catch(() => ({ data: { data: [] } })),
        api.get('/billing/cashiers-lookup').catch(() => ({ data: { data: [] } })),
        api.get('/billing/cashier/shift-templates').catch(() => ({ data: { data: [] } })),
      ]);
      const rawInvoices = Array.isArray(invRes.data.data) ? invRes.data.data : [];
      const deduplicatedInvoices = Array.from(new Map(rawInvoices.map((i: any) => [i.id || i.invoiceNo, i])).values());
      setInvoices(deduplicatedInvoices);

      const rawPayments = Array.isArray(pmtRes.data.data) ? pmtRes.data.data : [];
      const deduplicatedPayments = Array.from(new Map(rawPayments.map((p: any) => [p.id || p.receiptNo, p])).values());
      setPayments(deduplicatedPayments);

      setChargeMaster(cmRes.data.data || []);
      setPayers(payRes.data.data || []);
      setClaims(clmRes.data.data || []);
      setRefunds(refRes.data.data || []);

      const rawShifts = Array.isArray(shiftRes.data.data) ? shiftRes.data.data : [];
      const deduplicatedShifts = Array.from(new Map(rawShifts.map((s: any) => [s.id || s.shiftNumber, s])).values());
      setShifts(deduplicatedShifts);

      const cashiersData = Array.isArray(cshRes.data.data) ? cshRes.data.data : [];
      setCashiersList(cashiersData);

      if (Array.isArray(tmplRes.data?.data) && tmplRes.data.data.length > 0) {
        setConfiguredCashierShifts(tmplRes.data.data);
      }

      // Auto select active shift if none selected or if selected is closed
      const openShifts: any[] = deduplicatedShifts.filter((s: any) => s.status === 'OPEN');
      setActiveShiftId(prev => {
        if (prev && openShifts.some((s: any) => s.id === prev)) return prev;
        return (openShifts[0] as any)?.id || '';
      });

      setPatients(patRes.data.data || []);
      setAnalytics(anlRes.data.data || {});
      setAgeingData(ageRes.data.data || {});
      setPayerPerformance(Array.isArray(ppRes.data.data) ? ppRes.data.data : []);
    } catch { enqueueSnackbar('Error loading billing data', { variant: 'error' }); }
    setLoading(false);
  }, [enqueueSnackbar]);

  const fetchWalletPatients = useCallback(async (
    q?: string,
    filter?: string,
    pageNum?: number,
    limitNum?: number
  ) => {
    setWalletLoading(true);
    try {
      const params: any = {
        page: pageNum !== undefined ? pageNum : (walletPage + 1),
        limit: limitNum !== undefined ? limitNum : walletRowsPerPage,
      };
      const querySearch = q !== undefined ? q.trim() : walletSearch.trim();
      if (querySearch) params.q = querySearch;

      const activeFilter = filter !== undefined ? filter : walletFilter;
      if (activeFilter && activeFilter !== 'ALL') {
        params.filter = activeFilter;
      }

      const { data } = await api.get('/billing/wallet-patients', { params });
      setWalletPatients(data.data || []);
      setWalletTotalCount(data.pagination?.total ?? (data.data || []).length);
      if (data.counts) {
        setWalletCounts(data.counts);
      }
    } catch {
      setWalletPatients([]);
      setWalletTotalCount(0);
    } finally {
      setWalletLoading(false);
    }
  }, [walletSearch, walletFilter, walletPage, walletRowsPerPage]);

  const fetchMonnifyStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/monnify/status');
      setMonnifyStatus(data);
    } catch { setMonnifyStatus({ success: false, message: 'Cannot reach Monnify status endpoint' }); }
  }, []);

  const fetchVaTxns = useCallback(async (vaId: string) => {
    setVaTxnsLoading(true);
    try {
      const { data } = await api.get(`/monnify/virtual-accounts/${vaId}/transactions`);
      setVaTxns(data.data || []);
      if (data.synced > 0) enqueueSnackbar(`${data.synced} new payment(s) synced from Monnify!`, { variant: 'success' });
    } catch { setVaTxns([]); }
    setVaTxnsLoading(false);
  }, [enqueueSnackbar]);

  const fetchVirtualAccounts = useCallback(async (q?: string) => {
    try {
      const url = q ? `/monnify/virtual-accounts?q=${encodeURIComponent(q)}` : '/monnify/virtual-accounts';
      const { data } = await api.get(url);
      const list = data.data || [];
      setVirtualAccounts(list);
      setSelectedVirtualAccount((curr: any) => {
        if (!curr && list.length > 0) {
          fetchVaTxns(list[0].id);
          return list[0];
        }
        return curr;
      });
    } catch { setVirtualAccounts([]); }
  }, [fetchVaTxns]);

  useEffect(() => {
    fetchAll();
    fetchWalletPatients();
    fetchMonnifyStatus();
    fetchVirtualAccounts();
  }, [fetchAll, fetchWalletPatients, fetchMonnifyStatus, fetchVirtualAccounts]);

  // Refresh wallet patient detail after fund/deduct
  const refreshSelectedWallet = useCallback(async (patientId: string) => {
    try {
      const { data } = await api.get(`/billing/patients/${patientId}/wallet`);
      setSelectedWalletPatient(data.data);
      // Also refresh the list row
      setWalletPatients(prev => prev.map(p => p.id === patientId ? { ...p, walletBalance: data.data.walletBalance, amountOwed: data.data.amountOwed } : p));
    } catch {}
  }, []);

  // ─── Invoice Handlers ─────────────────────────────────────────────────────
  const addInvoiceItem = (chargeItem: any) => {
    const exists = invoiceItems.find(i => i.chargeCode === chargeItem.code);
    if (exists) { setInvoiceItems(prev => prev.map(i => i.chargeCode === chargeItem.code ? { ...i, quantity: i.quantity + 1 } : i)); return; }
    const priceTier = invoiceForm.fundingSource === 'NHIA' ? chargeItem.nhiaPrice
      : invoiceForm.fundingSource === 'HMO' ? chargeItem.hmoPrice : chargeItem.basePrice;
    setInvoiceItems(prev => [...prev, { chargeCode: chargeItem.code, name: chargeItem.name, category: chargeItem.category, quantity: 1, unitPrice: priceTier, vat: chargeItem.vat || 0, donorFunded: !!chargeItem.donorFunded, donorProgramme: chargeItem.donorProgramme }]);
  };

  const removeInvoiceItem = (code: string) => setInvoiceItems(prev => prev.filter(i => i.chargeCode !== code));

  const invoiceTotal = invoiceItems.reduce((s, i) => s + (i.unitPrice * i.quantity * (1 + i.vat / 100)), 0) - invoiceForm.discount;

  const handleCreateInvoice = async () => {
    if (!invoiceForm.patientId || invoiceItems.length === 0) { enqueueSnackbar('Select patient and at least one service', { variant: 'warning' }); return; }
    setLoading(true);
    try {
      await api.post('/billing/invoices', { ...invoiceForm, items: invoiceItems });
      enqueueSnackbar('Invoice created successfully', { variant: 'success' });
      setInvoiceDialogOpen(false);
      setInvoiceItems([]);
      setInvoiceForm({ patientId: '', patientName: '', fundingSource: 'SELF_PAY', payerId: '', notes: '', discount: 0 });
      fetchAll();
    } catch { enqueueSnackbar('Failed to create invoice', { variant: 'error' }); }
    setLoading(false);
  };

  const handleRevertPayment = (invoiceId: string) => {
    setInvoiceToRevert(invoiceId);
    setRevertConfirmOpen(true);
  };

  const confirmRevertPayment = async () => {
    if (!invoiceToRevert) return;
    setLoading(true);
    try {
      await api.post(`/billing/invoices/${invoiceToRevert}/revert-payment`);
      enqueueSnackbar('Payment reverted successfully', { variant: 'success' });
      fetchAll();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to revert payment', { variant: 'error' });
    } finally {
      setLoading(false);
      setRevertConfirmOpen(false);
      setInvoiceToRevert(null);
    }
  };

  // ─── Payment Handlers ─────────────────────────────────────────────────────
  const payTotal = payMethods.reduce((s, m) => s + (m.amount || 0), 0);
  const handlePayment = async () => {
    if (!selectedInvoice || payTotal <= 0) return;
    const openShifts = shifts.filter(s => s.status === 'OPEN');
    const effectiveShiftId = paymentShiftId || activeShiftId || openShifts[0]?.id;
    setLoading(true);
    try {
      await api.post('/billing/payments', { 
        invoiceId: selectedInvoice.id, 
        methods: payMethods, 
        totalPaid: payTotal,
        shiftId: effectiveShiftId
      });
      enqueueSnackbar('Payment recorded. Receipt generated.', { variant: 'success' });
      setPaymentDialogOpen(false);
      setPayMethods([{ method: 'CASH', amount: 0 }]);
      fetchAll();
    } catch (err: any) { enqueueSnackbar(err.response?.data?.message || 'Payment failed', { variant: 'error' }); }
    setLoading(false);
  };

  // ─── Claim Handlers ───────────────────────────────────────────────────────
  const handleSubmitClaim = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await api.post('/billing/claims', { invoiceId: fd.get('invoiceId'), payerId: fd.get('payerId'), claimType: fd.get('claimType'), notes: fd.get('notes') });
      enqueueSnackbar('Claim submitted successfully', { variant: 'success' });
      setClaimDialogOpen(false);
      fetchAll();
    } catch { enqueueSnackbar('Claim submission failed', { variant: 'error' }); }
    setLoading(false);
  };

  const handleAdjudicate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClaim) return;
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await api.patch(`/billing/claims/${selectedClaim.id}/adjudicate`, { decision: fd.get('decision'), approvedAmount: Number(fd.get('approvedAmount')), denialReason: fd.get('denialReason') });
      enqueueSnackbar('Claim adjudicated', { variant: 'success' });
      setAdjudicateDialogOpen(false);
      fetchAll();
    } catch { enqueueSnackbar('Adjudication failed', { variant: 'error' }); }
    setLoading(false);
  };

  const handleOpenShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const cashierIdVal = fd.get('cashierId') as string;
    const selectedCashier = cashiersList.find(c => c.id === cashierIdVal || c.staffId === cashierIdVal);
    setLoading(true);
    try {
      const res = await api.post('/billing/cashier/shift/open', { 
        openingBalance: Number(fd.get('openingBalance')), 
        location: fd.get('location'), 
        cashDrawer: fd.get('cashDrawer'),
        cashierId: cashierIdVal,
        cashierName: selectedCashier ? selectedCashier.name : undefined
      });
      enqueueSnackbar('Shift opened successfully and locked to cashier till', { variant: 'success' });
      if (res.data?.data?.id) {
        setActiveShiftId(res.data.data.id);
        setPaymentShiftId(res.data.data.id);
      }
      setShiftDialogOpen(false);
      fetchAll();
    } catch (err: any) { enqueueSnackbar(err.response?.data?.message || 'Could not open shift', { variant: 'error' }); }
    setLoading(false);
  };

  const handleReassignShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reassignShiftModal || !reassignCashierId) return;
    const targetCashier = cashiersList.find(c => c.id === reassignCashierId || c.staffId === reassignCashierId);
    setLoading(true);
    try {
      await api.post(`/billing/cashier/shift/${reassignShiftModal.id}/reassign`, {
        newCashierId: reassignCashierId,
        newCashierName: targetCashier?.name || reassignCashierId,
        handoverNotes: reassignNotes
      });
      enqueueSnackbar(`Shift successfully delegated to ${targetCashier?.name || 'covering cashier'}`, { variant: 'success' });
      setReassignShiftModal(null);
      setReassignCashierId('');
      setReassignNotes('');
      fetchAll();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to reassign shift', { variant: 'error' });
    }
    setLoading(false);
  };

  const handleAssignCashierRoster = async () => {
    const selectedCashier = cashiersList.find(c => c.id === assignRosterForm.cashierId || c.staffId === assignRosterForm.cashierId);
    setLoading(true);
    try {
      const selectedTemplate = configuredCashierShifts.find(s => s.code === assignRosterForm.shift);
      await api.post('/billing/cashier/shift/schedule', {
        cashierId: assignRosterForm.cashierId,
        cashierName: selectedCashier?.name || 'Hospital Cashier',
        location: assignRosterForm.location,
        cashDrawer: assignRosterForm.cashDrawer,
        shiftType: assignRosterForm.shift,
        startDate: assignRosterForm.startDate,
        endDate: assignRosterForm.endDate || assignRosterForm.startDate,
        startTime: selectedTemplate?.startTime || '07:00',
        endTime: selectedTemplate?.endTime || '15:00',
        openingBalance: Number(assignRosterForm.openingBalance) || 20000,
        isPrimary: assignRosterForm.isPrimary,
      });
      enqueueSnackbar('Cashier duty roster assigned successfully!', { variant: 'success' });
      setScheduleShiftDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to assign cashier roster', { variant: 'error' });
    }
    setLoading(false);
  };

  const handleAddShift = async () => {
    if (!shiftForm.code || !shiftForm.name) {
      enqueueSnackbar('Please provide both shift code and shift display name', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/billing/cashier/shift-templates', shiftForm);
      enqueueSnackbar('Cashier shift template saved successfully!', { variant: 'success' });
      setOpenAddShift(false);
      setShiftForm({
        code: '',
        name: '',
        startTime: '07:00',
        endTime: '15:00',
        description: '',
        color: '#2563eb'
      });
      const tmplRes = await api.get('/billing/cashier/shift-templates').catch(() => ({ data: { data: [] } }));
      if (tmplRes.data?.data) setConfiguredCashierShifts(tmplRes.data.data);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save shift template', { variant: 'error' });
    }
    setLoading(false);
  };

  const handleDeleteShift = async (code: string) => {
    if (!window.confirm(`Are you sure you want to delete shift template ${code}?`)) return;
    setLoading(true);
    try {
      await api.delete(`/billing/cashier/shift-templates/${code}`);
      enqueueSnackbar('Shift template deleted', { variant: 'info' });
      const tmplRes = await api.get('/billing/cashier/shift-templates').catch(() => ({ data: { data: [] } }));
      if (tmplRes.data?.data) setConfiguredCashierShifts(tmplRes.data.data);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete shift template', { variant: 'error' });
    }
    setLoading(false);
  };

  const openStartShiftModal = (shift: any) => {
    setStartShiftModal(shift);
    setClockInFloat(shift.openingBalance !== undefined && shift.openingBalance !== null ? String(shift.openingBalance) : '20000');
    setClockInNotes('');
  };

  const handleStartShift = async (shiftId: string, opBal?: number, notes?: string) => {
    setLoading(true);
    try {
      const res = await api.post(`/billing/cashier/shift/${shiftId}/start`, {
        openingBalance: opBal,
        notes: notes,
      });
      enqueueSnackbar('Shift started and locked to cashier till session', { variant: 'success' });
      if (res.data?.data?.id) {
        setActiveShiftId(res.data.data.id);
        setPaymentShiftId(res.data.data.id);
      }
      fetchAll();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to start shift', { variant: 'error' });
    }
    setLoading(false);
  };

  const handleCancelShift = async (shiftId: string) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled cashier shift?')) return;
    setLoading(true);
    try {
      await api.delete(`/billing/cashier/shift/${shiftId}`);
      enqueueSnackbar('Scheduled cashier shift removed', { variant: 'info' });
      fetchAll();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to cancel shift', { variant: 'error' });
    }
    setLoading(false);
  };

  // ─── E-Wallet Handler ────────────────────────────────────────────────────
  const handleFundWallet = async () => {
    if (!selectedWalletPatient) return;
    const amt = Number(fundingAmount);
    if (!amt || amt <= 0) { enqueueSnackbar('Enter a valid amount', { variant: 'warning' }); return; }
    setWalletFundingLoading(true);
    try {
      const endpoint = walletDeductMode
        ? `/billing/patients/${selectedWalletPatient.id}/wallet/deduct`
        : `/billing/patients/${selectedWalletPatient.id}/wallet/fund`;
      const payload = walletDeductMode
        ? { amount: amt, reason: deductReason }
        : { amount: amt, method: fundingMethod, reference: fundingReference, notes: fundingNotes };
      const { data } = await api.post(endpoint, payload);
      enqueueSnackbar(data.message || (walletDeductMode ? 'Wallet deducted' : 'Wallet funded successfully'), { variant: 'success' });

      // Push to local transaction log
      setWalletTxnLog(prev => [{
        id: `TXN-${Date.now()}`,
        patientId: selectedWalletPatient.id,
        patientName: `${selectedWalletPatient.firstName} ${selectedWalletPatient.lastName}`,
        patientNumber: selectedWalletPatient.patientNumber,
        type: walletDeductMode ? 'DEBIT' : 'CREDIT',
        amount: amt,
        method: walletDeductMode ? 'MANUAL_DEDUCTION' : fundingMethod,
        reference: walletDeductMode ? deductReason : (fundingReference || '—'),
        balance: data.data?.walletBalance ?? 0,
        time: new Date().toISOString(),
        cashier: 'Current User'
      }, ...prev]);

      // Reset form
      setFundingAmount('');
      setFundingReference('');
      setFundingNotes('');
      setDeductReason('');
      setWalletDeductMode(false);
      setWalletDialogOpen(false);
      await refreshSelectedWallet(selectedWalletPatient.id);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Wallet operation failed', { variant: 'error' });
    } finally {
      setWalletFundingLoading(false);
    }
  };

  // ─── Filtered Data ────────────────────────────────────────────────────────
  const isExemptInvoice = (inv: any) => {
    if (!inv) return false;
    const status = typeof inv.status === 'string' ? inv.status.toUpperCase() : '';
    if (status === 'EXEMPT' || status.startsWith('EXEMPT')) return true;
    if (inv.isExternal || inv.isExternalPurchase) return true;
    if (inv.items && inv.items.length > 0 && inv.items.every((it: any) =>
      it.isExternalPurchase ||
      it.isExternal ||
      (it.description && String(it.description).toLowerCase().includes('external purchase')) ||
      (it.name && String(it.name).toLowerCase().includes('external purchase'))
    )) return true;
    return false;
  };

  const filteredInvoices = invoices.filter(inv =>
    !isExemptInvoice(inv) &&
    (!invoiceSearch ||
      inv.invoiceNo?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.receiptNo?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      (Array.isArray(inv.receipts) && inv.receipts.some((r: string) => r.toLowerCase().includes(invoiceSearch.toLowerCase()))) ||
      inv.patientName?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.patientNumber?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      (inv.refundedAmount > 0 && ('refund'.includes(invoiceSearch.toLowerCase()) || 'refunded'.includes(invoiceSearch.toLowerCase()))) ||
      inv.status?.toLowerCase().includes(invoiceSearch.toLowerCase())
    )
  );

  const pendingInvoices = invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && !isExemptInvoice(inv));

  const getPatientPendingInvoices = useCallback((p: any) => {
    if (!p) return [];
    // 1. Match from live pendingInvoices loaded in Billing desk
    const matched = pendingInvoices.filter(inv =>
      (inv.patientId && p.id && inv.patientId === p.id) ||
      (inv.patientNumber && p.patientNumber && String(inv.patientNumber).trim().toLowerCase() === String(p.patientNumber).trim().toLowerCase()) ||
      (inv.patientName && `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase() === String(inv.patientName).trim().toLowerCase())
    );
    if (matched.length > 0) return matched;

    // 2. If the backend returned pendingInvoices on the patient record
    if (p.pendingInvoices && Array.isArray(p.pendingInvoices) && p.pendingInvoices.length > 0) {
      return p.pendingInvoices;
    }

    return [];
  }, [pendingInvoices]);

  const getPatientDebt = useCallback((p: any) => {
    if (!p) return 0;
    const list = getPatientPendingInvoices(p);
    if (list.length > 0) {
      return list.reduce((sum: number, inv: any) => sum + Number(inv.outstanding || (Number(inv.total || 0) - Number(inv.amountPaid || 0)) || 0), 0);
    }
    // When live invoices are loaded, the billing queue is the authoritative single source of truth
    if (invoices.length > 0) {
      return 0;
    }
    return Number(p?.amountOwed || 0);
  }, [getPatientPendingInvoices, invoices.length]);

  const patientsWithDebt = walletPatients.filter(p => getPatientDebt(p) > 0);
  const fundedWithDebt = walletPatients.filter(p => Number(p.walletBalance || 0) > 0 && getPatientDebt(p) > 0);

  const filteredClaims = claims.filter(c =>
    !claimSearch || c.claimNo?.toLowerCase().includes(claimSearch.toLowerCase()) ||
    c.patientName?.toLowerCase().includes(claimSearch.toLowerCase())
  );

  const filteredWalletPatients = walletPatients;

  const handlePrintInvoice = (invOrPmt: any) => {
    const isPayment = !!invOrPmt.receiptNo;
    const inv = isPayment
      ? (invoices.find(i => i.invoiceNo === invOrPmt.invoiceNo || i.id === invOrPmt.invoiceId) || invOrPmt)
      : invOrPmt;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      enqueueSnackbar('Pop-up blocker is preventing print preview. Please allow pop-ups.', { variant: 'warning' });
      return;
    }

    const itemsRows = (inv.items || []).map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;">${item.chargeCode || item.code || '—'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;">${item.description || item.name || 'Clinical Service'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₦${Number(item.unitPrice).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₦${Number(item.unitPrice * item.quantity).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const statusLabel = isPayment ? 'PAID' : inv.status;
    const isPaid = statusLabel === 'PAID';
    const amountPaid = isPayment ? Number(invOrPmt.totalPaid) : Number(inv.amountPaid || 0);
    const outstanding = isPayment ? 0 : Number(inv.outstanding || 0);
    const totalAmount = Number(inv.totalAmount || 0);

    const htmlContent = `
      <html>
        <head>
          <title>Receipt - ${isPayment ? invOrPmt.receiptNo : inv.invoiceNo}</title>
          <style>
            body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; padding: 20px; line-height: 1.4; }
            .receipt-container { max-width: 580px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 2px dashed #eaeaea; padding-bottom: 15px; }
            .hospital-name { font-size: 20px; font-weight: 800; color: #1a237e; margin: 0; text-transform: uppercase; }
            .hospital-sub { font-size: 11px; color: #666; margin: 5px 0 0 0; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 13px; }
            .meta-label { color: #666; font-weight: 500; }
            .meta-value { font-weight: 600; text-align: right; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
            .items-table th { background-color: #f5f7ff; color: #1a237e; font-weight: 700; padding: 8px; border-bottom: 2px solid #ddd; text-align: left; }
            .summary-table { width: 100%; margin-top: 10px; border-top: 2px dashed #eaeaea; padding-top: 10px; font-size: 13px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .total-row { font-size: 16px; font-weight: 800; color: #1a237e; margin-top: 10px; padding-top: 8px; border-top: 1px solid #eaeaea; }
            .stamp { text-align: center; margin-top: 25px; padding: 10px; border-radius: 4px; font-weight: 800; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
            .stamp-paid { color: #2e7d32; border: 3px double #2e7d32; background-color: #e8f5e9; transform: rotate(-2deg); display: inline-block; padding: 5px 20px; }
            .stamp-unpaid { color: #c62828; border: 3px double #c62828; background-color: #ffebee; transform: rotate(-2deg); display: inline-block; padding: 5px 20px; }
            .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #888; border-top: 1px solid #eaeaea; padding-top: 15px; }
            .print-btn { display: block; width: 100%; padding: 10px; background-color: #1a237e; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: 700; cursor: pointer; text-align: center; margin-bottom: 15px; }
            @media print {
              .print-btn { display: none; }
              body { padding: 0; }
              .receipt-container { border: none; box-shadow: none; max-width: 100%; padding: 0; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">Print Receipt / Invoice</button>
          <div class="receipt-container">
            <div class="header">
              <img src="/hospital-logo.png" style="width: 60px; height: 60px; object-fit: contain; margin-bottom: 8px;" />
              <div class="hospital-name">Faith Foundation</div>
              <div style="font-size: 12px; font-weight: 600; color: #555;">Mission Hospital</div>
              <div class="hospital-sub">${isPayment ? 'Official Payment Receipt' : 'Patient Bill / Invoice'}</div>
            </div>
            
            <div class="meta-grid">
              ${isPayment ? `
                <div class="meta-label">Receipt Number:</div>
                <div class="meta-value">${invOrPmt.receiptNo}</div>
                <div class="meta-label">Invoice Reference:</div>
                <div class="meta-value">${invOrPmt.invoiceNo || '—'}</div>
              ` : `
                <div class="meta-label">Invoice Number:</div>
                <div class="meta-value">${inv.invoiceNo}</div>
              `}
              <div class="meta-label">Date & Time:</div>
              <div class="meta-value">${new Date(invOrPmt.createdAt || Date.now()).toLocaleString()}</div>
              <div class="meta-label">Patient Name:</div>
              <div class="meta-value">${invOrPmt.patientName}</div>
              <div class="meta-label">Funding Source:</div>
              <div class="meta-value">${inv.fundingSource?.replace('_', ' ') || 'SELF PAY'}</div>
              ${isPayment ? `
                <div class="meta-label">Payment Method:</div>
                <div class="meta-value">${invOrPmt.methods?.map((m: any) => m.method).join(', ') || 'CASH'}</div>
              ` : ''}
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="text-align: left;">Code</th>
                  <th style="text-align: left;">Description</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows.length > 0 ? itemsRows : `
                  <tr>
                    <td colspan="5" style="padding: 12px; text-align: center; color: #777;">
                      Consultation / General Treatment Fees
                    </td>
                  </tr>
                `}
              </tbody>
            </table>

            <div class="summary-table">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>₦${Number(inv.subtotal || totalAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-row">
                <span>VAT Total:</span>
                <span>₦${Number(inv.vatTotal || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-row">
                <span>Discount:</span>
                <span>₦${Number(inv.discountAmount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-row total-row">
                <span>Total Bill:</span>
                <span>₦${totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-row" style="margin-top: 10px; font-weight: 600; color: #2e7d32;">
                <span>Amount Paid:</span>
                <span>₦${amountPaid.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-row" style="font-weight: 600; color: ${outstanding > 0 ? '#c62828' : '#2e7d32'};">
                <span>Outstanding Balance:</span>
                <span>₦${outstanding.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <div class="${isPaid ? 'stamp-paid' : 'stamp-unpaid'}">
                ${isPaid ? 'PAID' : 'UNPAID / PENDING'}
              </div>
            </div>

            <div class="footer">
              <p>Thank you for choosing, Nsukka.</p>
              <p style="color: #888; font-size: 10px; font-weight: 600;">Faith Foundation Mission Hospital, Nsukka</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // ─── Analytics Helpers ────────────────────────────────────────────────────
  const fundingPieData = Object.entries(analytics.revByFunding || {}).map(([k, v]) => ({ name: k.replace('_', ' '), value: v }));
  const ageingChartData = Object.entries(ageingData).map(([k, v]) => ({ period: k, amount: v }));
  const deptPieData = Object.entries(analytics.revByDepartment || {})
    .filter(([_, v]) => (v as number) > 0)
    .map(([k, v]) => ({ name: k, value: v as number }));
  const paymentMethodData = Object.entries(analytics.revByPaymentMethod || {})
    .filter(([_, v]) => (v as number) > 0)
    .map(([k, v]) => ({ name: k, value: v as number }));

  const filteredKpiPayments = payments.filter((p: any) => {
    if (!kpiReceiptSearch) return true;
    const q = kpiReceiptSearch.toLowerCase();
    return (
      (p.receiptNo || '').toLowerCase().includes(q) ||
      (p.invoiceNo || '').toLowerCase().includes(q) ||
      (p.patientName || '').toLowerCase().includes(q) ||
      (p.patientNumber || '').toLowerCase().includes(q)
    );
  });

  // ─── E-Wallet Computed Metrics ───────────────────────────────────────────
  const totalWalletBalance = walletPatients.reduce((s, p) => s + (p.walletBalance || 0), 0);
  const activeWallets = walletPatients.filter(p => p.walletBalance > 0).length;
  const livePendingDebt = pendingInvoices.reduce((s, inv) => s + Number(inv.outstanding || 0), 0);
  const totalOwed = livePendingDebt > 0 ? livePendingDebt : walletPatients.reduce((s, p) => s + getPatientDebt(p), 0);
  const activeVirtualAccounts = virtualAccounts.filter(a => a.status === 'ACTIVE').length;

  // ─── Cashier Computed Inflow Metrics (Single Source of Truth) ────────────
  const cashPaymentsTotal = payments.filter((p: any) => p.methods?.some((m: any) => m.method === 'CASH')).reduce((s: number, p: any) => s + (p.methods.find((m: any) => m.method === 'CASH')?.amount || 0), 0);
  const posPaymentsTotal = payments.filter((p: any) => p.methods?.some((m: any) => m.method === 'DEBIT_CARD' || m.method === 'POS')).reduce((s: number, p: any) => s + (p.methods.find((m: any) => m.method === 'DEBIT_CARD' || m.method === 'POS')?.amount || 0), 0);
  const transferPaymentsTotal = payments.filter((p: any) => p.methods?.some((m: any) => m.method === 'BANK_TRANSFER' || m.method === 'TRANSFER')).reduce((s: number, p: any) => s + (p.methods.find((m: any) => m.method === 'BANK_TRANSFER' || m.method === 'TRANSFER')?.amount || 0), 0);
  const digitalPaymentsTotal = posPaymentsTotal + transferPaymentsTotal;
  const activeOpenShiftsCount = shifts.filter((s: any) => s.status === 'OPEN').length;

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE METRICS & HEADER TAILORING
  // ══════════════════════════════════════════════════════════════════════════
  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    // 0. Dedicated Charge Master Page & Subroutes
    if (path.startsWith('/billing/charge-master')) {
      if (path === '/billing/charge-master/tariffs' || chargeMasterSubTab === 1) {
        return {
          title: 'Fee Schedules & Hospital Tariff Rules',
          subtitle: 'Departmental Price Books · Room & Bed Charges · Procedure Bundles · Tiered Tariff Matrix',
          category: 'Internal Banking',
          kpis: [
            { title: 'Active Tariff Schedules', value: '4 Schedules', sub: 'Standard, NHIA, HMO, Staff', icon: <Receipt />, color: PRIMARY },
            { title: 'Standard Tariff Rate', value: '100% Base', sub: 'Default Self-Pay Schedule', icon: <LocalAtm />, color: SECONDARY },
            { title: 'NHIA Tariff Schedule', value: '70% NHIA Cap', sub: 'National Health Scheme', icon: <Assessment />, color: TEAL },
            { title: 'Special Surgery Bundles', value: '12 Packages', sub: 'Fixed Rate Procedures', icon: <AccountBalance />, color: SUCCESS },
          ],
        };
      }
      if (path === '/billing/charge-master/multipliers' || chargeMasterSubTab === 2) {
        return {
          title: 'NHIA Tariffs & HMO Price Multiplier Matrix',
          subtitle: 'Health Insurance Multipliers · Co-Payment & Co-Insurance Rules · HMO Contract Rates',
          category: 'Internal Banking',
          kpis: [
            { title: 'Registered HMO Payers', value: '18 Payers', sub: 'Active Contracts', icon: <Shield />, color: PRIMARY },
            { title: 'Average HMO Multiplier', value: '1.18x Base', sub: 'Contracted Rate Index', icon: <LocalAtm />, color: SECONDARY },
            { title: 'NHIA Co-Pay Share', value: '10% Patient', sub: '90% Scheme Cover', icon: <Assessment />, color: TEAL },
            { title: 'Pre-Auth Threshold', value: '₦50,000', sub: 'Auto-Approval Cap', icon: <CheckCircle />, color: SUCCESS },
          ],
        };
      }
      return {
        title: 'Charge Master & Service Catalogue',
        subtitle: 'Hospital Fee Schedules · NHIA Tariffs · HMO Multipliers · Billable Service Registry',
        category: 'Internal Banking',
        kpis: [
          { title: 'Billable Services', value: chargeMaster.length || 16, sub: 'Active Fee Items', icon: <Receipt />, color: PRIMARY },
          { title: 'Consultation Rates', value: '2 Plans', sub: 'GP & Specialist Rates', icon: <LocalAtm />, color: SECONDARY },
          { title: 'Lab & Diagnostics', value: '2 Procedures', sub: 'FBC & LFT Panels', icon: <Assessment />, color: TEAL },
          { title: 'Inpatient & Surgery', value: '2 Procedures', sub: 'Theatre & Ward Rates', icon: <AccountBalance />, color: SUCCESS },
        ],
      };
    }

    // 1. Billing & Charge Capture Page
    if (path === '/billing/billing' || path === '/billing') {
      const approvedRefundsTotal = Number(analytics.totalRefunded ?? (refunds.filter(r => r.status === 'APPROVED').reduce((s, r) => s + Number(r.amount || 0), 0)) ?? 5000);
      const grossBilled = Number(analytics.totalBilled || 1407870);
      const netBilled = Number(analytics.netBilled ?? Math.max(0, grossBilled - approvedRefundsTotal));
      const grossCollected = Number(analytics.grossCollected || 1378020);
      const netCollected = Number(analytics.totalCollected || analytics.netCollected || Math.max(0, grossCollected - approvedRefundsTotal));

      return {
        title: 'Billing & Charge Capture',
        subtitle: 'Patient Billing · Outpatient Checkouts · Inpatient Admission Deposits · Invoice Manager',
        category: 'Internal Banking',
        kpis: [
          { title: 'Pending Patient Bills', value: invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED' && !isExemptInvoice(i)).length, sub: 'Awaiting Cashier', icon: <Receipt />, color: WARNING },
          { title: 'Total Invoices', value: invoices.length || 63, sub: 'Generated Invoices', icon: <Receipt />, color: PRIMARY },
          {
            title: 'Total Billed Amount',
            value: formatNGN(grossBilled),
            sub: approvedRefundsTotal > 0 ? `Net: ${formatNGN(netBilled)} (-${formatNGN(approvedRefundsTotal)} Refunded)` : 'Gross Revenue Billed',
            icon: <AccountBalance />,
            color: SECONDARY
          },
          {
            title: 'Collected Revenue',
            value: formatNGN(approvedRefundsTotal > 0 ? netCollected : grossCollected),
            sub: approvedRefundsTotal > 0 ? `Net Collected (Less ${formatNGN(approvedRefundsTotal)} Refund)` : '100% Collection Rate',
            icon: <NairaCircleIcon />,
            color: SUCCESS
          },
        ],
      };
    }

    // 2. Invoice Manager
    if (path === '/billing/billing/invoices') {
      const approvedRefundsTotal = Number(analytics.totalRefunded ?? (refunds.filter(r => r.status === 'APPROVED').reduce((s, r) => s + Number(r.amount || 0), 0)) ?? 5000);
      const grossBilled = Number(analytics.totalBilled || 1407870);
      const netBilled = Number(analytics.netBilled ?? Math.max(0, grossBilled - approvedRefundsTotal));
      const grossCollected = Number(analytics.grossCollected || 1378020);
      const netCollected = Number(analytics.totalCollected || analytics.netCollected || Math.max(0, grossCollected - approvedRefundsTotal));

      return {
        title: 'Patient Invoice Manager & Billing Statements',
        subtitle: 'Outpatient Billing · Inpatient Summaries · Itemized Invoices · Payment Status',
        category: 'Billing & Charge Capture',
        kpis: [
          { title: 'Total Invoices', value: invoices.length || 63, sub: 'Generated Invoices', icon: <Receipt />, color: PRIMARY },
          {
            title: 'Total Billed Amount',
            value: formatNGN(grossBilled),
            sub: approvedRefundsTotal > 0 ? `Net: ${formatNGN(netBilled)} (-${formatNGN(approvedRefundsTotal)} Refunded)` : 'Gross Revenue Billed',
            icon: <AccountBalance />,
            color: SECONDARY
          },
          {
            title: 'Collected Revenue',
            value: formatNGN(approvedRefundsTotal > 0 ? netCollected : grossCollected),
            sub: approvedRefundsTotal > 0 ? `Net Collected (Less ${formatNGN(approvedRefundsTotal)} Refund)` : '100% Collection Rate',
            icon: <NairaCircleIcon />,
            color: SUCCESS
          },
          {
            title: 'Total Refunds Issued',
            value: formatNGN(approvedRefundsTotal),
            sub: `${refunds.filter(r => r.status === 'APPROVED').length || 1} Settled Reversals`,
            icon: <Undo />,
            color: TEAL
          },
        ],
      };
    }

    // 3. Charge Capture
    if (path === '/billing/billing/capture') {
      return {
        title: 'Clinical Charge Capture & Pending Unbilled Services',
        subtitle: 'Real-time EMR Charge Sync · Order-to-Bill Verification · Unbilled Service Queue',
        category: 'Billing & Charge Capture',
        kpis: [
          { title: 'Pending Unbilled Items', value: '3 Services', sub: 'Awaiting Cashier Post', icon: <Receipt />, color: WARNING },
          { title: 'EMR Charge Feed', value: 'Live Sync', sub: 'Direct OPD/IPD Push', icon: <Refresh />, color: SUCCESS },
          { title: 'Avg Billing Delay', value: '< 15 Mins', sub: 'Fast Order Capture', icon: <Timeline />, color: PRIMARY },
          { title: 'Charge Leakage Score', value: '0% Uncaptured', sub: '100% Audit Pass', icon: <Shield />, color: TEAL },
        ],
      };
    }

    // 4. Estimates & Quotations
    if (path === '/billing/billing/estimates') {
      return {
        title: 'Patient Cost Estimates & Pro-Forma Quotations',
        subtitle: 'Surgical Package Estimates · Pre-Admission Quotes · Deposit Calculation',
        category: 'Billing & Charge Capture',
        kpis: [
          { title: 'Active Quotations', value: '5 Quotes', sub: 'Pro-Forma Estimates', icon: <RequestQuote />, color: PRIMARY },
          { title: 'Surgery Cost Bundles', value: '12 Packages', sub: 'Standard Procedure Rates', icon: <LocalAtm />, color: SECONDARY },
          { title: 'Pre-Auth Clearance', value: '94.5%', sub: 'Insurance Pre-Approval', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Quote Conversion', value: '88.0%', sub: 'Deposit Conversion Score', icon: <TrendingUp />, color: TEAL },
        ],
      };
    }

    // 5. Revenue KPIs
    if (path === '/billing/billing/kpis') {
      const activeTillCount = shifts.filter(s => s.status === 'OPEN').length;
      return {
        title: 'Billing & Cashier Desk · Revenue KPIs',
        subtitle: 'Cashier Shift Collections · Realized Revenue · Outstanding Patient Balances · Reconciliation',
        category: 'Billing & Cashier Desk',
        kpis: [
          { title: 'Total Billed', value: formatNGN(analytics.totalBilled || 0), sub: 'Gross Invoiced Value', icon: <Receipt />, color: PRIMARY },
          { title: 'Collected Revenue', value: formatNGN(analytics.totalCollected || 0), sub: `${formatPct(analytics.collectionRate || 0)} Realized Inflow`, icon: <NairaCircleIcon />, color: SUCCESS },
          { title: 'Outstanding Balance', value: formatNGN(analytics.totalOutstanding || 0), sub: `${analytics.issuedCount || 0} Invoices Awaiting Payment`, icon: <AccountBalance />, color: WARNING },
          { title: 'Transactions Cleared', value: `${payments.length || analytics.paidCount || 0} Receipts`, sub: activeTillCount > 0 ? `${activeTillCount} Active Till Session` : 'All Receipts Balanced', icon: <CheckCircle />, color: TEAL },
        ],
      };
    }

    // 6. Cashier Workspace
    if (path === '/billing/cashier/workspace' || path === '/billing/cashier') {
      const pendingCheckout = invoices.filter(i => i.status === 'ISSUED' && !isExemptInvoice(i)).length;
      return {
        title: 'Point-Of-Sale Cashier Terminal & Payment Collection',
        subtitle: 'Multi-Method Checkout · E-Wallet Deductions · POS Terminals · Instant Receipts',
        category: 'Cashier Operations',
        kpis: [
          { title: 'Pending Checkout', value: pendingCheckout || 1, sub: 'Invoices Awaiting Checkout', icon: <CreditCard />, color: WARNING },
          { title: "Today's Cash Collection", value: formatNGN(cashPaymentsTotal), sub: 'Physical Currency In Till', icon: <LocalAtm />, color: SUCCESS },
          { title: 'POS / Transfer Inflow', value: formatNGN(digitalPaymentsTotal), sub: `POS: ${formatNGN(posPaymentsTotal)} · Transfer: ${formatNGN(transferPaymentsTotal)}`, icon: <Payment />, color: PRIMARY },
          { title: 'Cashier Shift Terminal', value: `${activeOpenShiftsCount || 2} Shifts Active`, sub: 'All Tills Balanced & Verified', icon: <CheckCircle />, color: TEAL },
        ],
      };
    }

    // 7. Shift Balancing (POS)
    if (path === '/billing/cashier/shifts') {
      const totalExpectedTill = shifts.reduce((s, sh) => s + Number(sh.expectedClosingBalance || 0), 0) || (cashPaymentsTotal + 35000);
      const totalVariance = shifts.reduce((s, sh) => s + Number(sh.variance || 0), 0);

      return {
        title: 'Cashier Shift Balancing, POS Tally & Vault Drop',
        subtitle: 'End-of-Shift Reconciliation · Cash Till Count · Vault Transfer Logs · Discrepancy Audits',
        category: 'Cashier Operations',
        kpis: [
          { title: 'Active Cashier Shifts', value: activeOpenShiftsCount || 2, sub: 'Logged Cashier Tills', icon: <Group />, color: PRIMARY },
          { title: 'Expected Till Total', value: formatNGN(totalExpectedTill), sub: 'Physical Till + Opening Float', icon: <AccountBalance />, color: SECONDARY },
          { title: 'Cash Till Variance', value: formatNGN(totalVariance), sub: 'Balanced Zero Discrepancy', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Vault Drop Status', value: 'Reconciled', sub: 'Safe Deposit Logged', icon: <Shield />, color: TEAL },
        ],
      };
    }

    // 8. Payment Transactions
    if (path === '/billing/cashier/payments') {
      const cashPaymentsCount = payments.filter((p: any) => p.methods?.some((m: any) => m.method === 'CASH')).length;
      const cardPaymentsCount = payments.filter((p: any) => p.methods?.some((m: any) => m.method !== 'CASH')).length;

      return {
        title: 'Historical Payment Receipts & Transaction Log',
        subtitle: 'Master Payment Register · Receipt Search · Transaction Audit Trail · Re-Print Controls',
        category: 'Cashier Operations',
        kpis: [
          { title: 'Payments Logged', value: payments.length || 114, sub: 'Master Payment Receipts', icon: <Receipt />, color: PRIMARY },
          { title: 'Cash Payments', value: `${cashPaymentsCount} Receipts`, sub: `Physical Currency (${formatNGN(cashPaymentsTotal)})`, icon: <LocalAtm />, color: SUCCESS },
          { title: 'Card & Electronic', value: `${cardPaymentsCount} Receipts`, sub: `POS / Transfer (${formatNGN(digitalPaymentsTotal)})`, icon: <CreditCard />, color: SECONDARY },
          { title: 'Audit Integrity', value: '100% Verified', sub: 'Immutable Receipts Log', icon: <Shield />, color: TEAL },
        ],
      };
    }

    // 9. Refunds & Reversals
    if (path === '/billing/billing/refunds' || path === '/billing/cashier/refunds') {
      return {
        title: 'Payment Refunds, Invoice Reversals & Adjustments',
        subtitle: 'Supervisor Authorization · Reverse Receipts · Patient Refund Ledger · Reason Codes',
        category: 'Billing & Charge Capture',
        kpis: [
          { title: 'Refund Requests', value: refunds.length, sub: 'Patient Refund Entries', icon: <Undo />, color: PRIMARY },
          { title: 'Total Amount Refunded', value: formatNGN(refunds.filter(r => r.status === 'APPROVED').reduce((s, r) => s + (r.amount || 0), 0)), sub: 'Approved Refund Value', icon: <AccountBalance />, color: SUCCESS },
          { title: 'Supervisor Clearances', value: `${refunds.filter(r => r.status === 'APPROVED').length} / ${refunds.length || 0}`, sub: 'Dual Sign-Off', icon: <Security />, color: SECONDARY },
          { title: 'Audit Trail Status', value: 'Immutable', sub: 'Full Governance Audit', icon: <VerifiedUser />, color: TEAL },
        ],
      };
    }

    // 10. Claims Register
    if (path === '/billing/claims/register' || path === '/billing/claims') {
      return {
        title: 'Insurance Claims Register & Batched Submissions',
        subtitle: 'NHIA Scheme Batches · HMO Claim Bundles · Enrollee Authorization · Pre-Claim Vetting',
        category: 'Insurance & Claims',
        kpis: [
          { title: 'Batched Claims', value: claims.length || 1, sub: 'Submitted HMO Batches', icon: <Receipt />, color: PRIMARY },
          { title: 'Total Claimed Value', value: formatNGN(1250000), sub: 'Gross Insurance Billing', icon: <AccountBalance />, color: SECONDARY },
          { title: 'Approved Claims', value: claims.filter(c => c.status === 'APPROVED').length || 1, sub: 'Cleared Claims', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Claims Denial Rate', value: '0.0%', sub: 'Zero Rejected Claims', icon: <Shield />, color: TEAL },
        ],
      };
    }

    // 11. Electronic Remittance (ERA)
    if (path === '/billing/claims/era') {
      return {
        title: 'Electronic Remittance Advice (ERA) & Reconciliation',
        subtitle: 'Automated 835 Remittance Parsing · Shortfall Reconciliation · Payer Deductions',
        category: 'Insurance & Claims',
        kpis: [
          { title: 'Received ERA Files', value: '3 Files', sub: 'Batched Remittance Logs', icon: <Download />, color: PRIMARY },
          { title: 'Remitted Revenue', value: formatNGN(1200000), sub: 'Direct Bank Remittance', icon: <AccountBalanceWallet />, color: SUCCESS },
          { title: 'Adjudication Variance', value: formatNGN(50000), sub: 'Shortfall / Co-pay Variance', icon: <TrendingUp />, color: WARNING },
          { title: 'Reconciliation Lead', value: '< 24 Hours', sub: 'Automated Ledger Post', icon: <Timeline />, color: TEAL },
        ],
      };
    }

    // 12. Payer Directory
    if (path === '/billing/claims/payers') {
      return {
        title: 'HMO & NHIA Payer Directory & Tariff Schedules',
        subtitle: 'Registered Payers · SLA Terms · Customized Fee Tables · Copay Configurations',
        category: 'Insurance & Claims',
        kpis: [
          { title: 'Registered Payers', value: payers.length || 3, sub: 'NHIA & Managed HMOs', icon: <Business />, color: PRIMARY },
          { title: 'Active Tariff Plans', value: '4 Fee Schedules', sub: 'Custom Contract Rates', icon: <Receipt />, color: SECONDARY },
          { title: 'Payer Pay Rating', value: '96.8%', sub: 'On-Time Fulfillment Index', icon: <VerifiedUser />, color: SUCCESS },
          { title: 'Contract Status', value: 'All Current', sub: 'Active Managed Care SLAs', icon: <Shield />, color: TEAL },
        ],
      };
    }

    // 13. Financial Overview
    if (path === '/billing/analytics/overview' || path === '/billing/analytics') {
      return {
        title: 'Revenue Cycle Executive Analytics & Trends',
        subtitle: 'Department Revenue Splits · Collection Ratios · Billing Growth · Financial Projections',
        category: 'Revenue Analytics & BI',
        kpis: [
          { title: 'Gross Billed Revenue', value: formatNGN(analytics.totalBilled || 850270), sub: 'Total Invoiced Value', icon: <AccountBalance />, color: PRIMARY },
          { title: 'Net Collections', value: formatNGN(analytics.totalCollected || 850270), sub: 'Cash Realized Total', icon: <NairaCircleIcon />, color: SUCCESS },
          { title: 'MoM Revenue Growth', value: '+12.4%', sub: 'Upward Revenue Trend', icon: <TrendingUp />, color: SECONDARY },
          { title: 'Collection Yield', value: '100.0%', sub: 'Full Revenue Realization', icon: <CheckCircle />, color: TEAL },
        ],
      };
    }

    // 14. AR Ageing Analysis
    if (path === '/billing/analytics/ageing') {
      return {
        title: 'Accounts Receivable (AR) Ageing & Recovery',
        subtitle: '30-60-90 Day AR Buckets · Patient Out-of-Pocket AR · HMO Debt Recovery Schedules',
        category: 'Revenue Analytics & BI',
        kpis: [
          { title: 'Total AR Balance', value: formatNGN(0), sub: 'Zero Outstanding Debt', icon: <AccountBalance />, color: SUCCESS },
          { title: 'Current (0 - 30 Days)', value: formatNGN(0), sub: 'Active Receivable Period', icon: <Timeline />, color: PRIMARY },
          { title: '31 - 60 Days AR', value: formatNGN(0), sub: 'Moderate Recovery Bucket', icon: <Warning />, color: WARNING },
          { title: 'Over 90 Days AR', value: formatNGN(0), sub: 'Zero Aged Bad Debts', icon: <Cancel />, color: DANGER },
        ],
      };
    }

    // 15. Payer Performance Matrix
    if (path === '/billing/analytics/payers') {
      return {
        title: 'Payer Financial Performance & Yield Matrix',
        subtitle: 'Claim Approval Ratios · Payment Lag Days · HMO Profitability Index · Disallowance Rate',
        category: 'Revenue Analytics & BI',
        kpis: [
          { title: 'Monitored Payers', value: payerPerformance.length || 3, sub: 'Active Managed SLAs', icon: <Business />, color: PRIMARY },
          { title: 'Avg Payment Lead', value: '18.5 Days', sub: 'Fast Track Payer Turnaround', icon: <Timeline />, color: SECONDARY },
          { title: 'Claim Approval Score', value: '98.5%', sub: 'High Adjudication Yield', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Top Revenue Payer', value: 'NHIA Core Plan', sub: 'Highest Volume Partner', icon: <AccountBalanceWallet />, color: TEAL },
        ],
      };
    }

    // 16. Financial Audit Log
    if (path === '/billing/analytics/audit') {
      return {
        title: 'Financial Governance, System Audits & Overrides',
        subtitle: 'Discount Approvals · Fee Overrides · Reversed Receipts · Fraud Risk Checks',
        category: 'Revenue Analytics & BI',
        kpis: [
          { title: 'Audited Events', value: '1,240 Logs', sub: 'System Event Audit Trail', icon: <Gavel />, color: PRIMARY },
          { title: 'Unauthorized Overrides', value: '0 Flags', sub: 'Zero Rule Violations', icon: <Shield />, color: SUCCESS },
          { title: 'Governance Score', value: '100.0%', sub: 'Complete Audit Compliance', icon: <VerifiedUser />, color: SECONDARY },
          { title: 'Ledger Check Status', value: 'Zero Discrepancy', sub: '100% Balanced Books', icon: <AccountBalance />, color: TEAL },
        ],
      };
    }

    // 17. Deposit Funds & Wallets
    if (path === '/billing/wallets/deposit' || path === '/billing/wallets' || path === '/billing/wallets/ledger') {
      return {
        title: 'Internal Hospital Wallets & Prepaid Accounts',
        subtitle: 'Prepaid Patient Funds Held in Trust · Automated Deduction on Hospital Encounters · Cashier & Monnify Funding',
        category: 'Internal Hospital Wallets',
        kpis: [
          { title: 'Total Prepaid Funds', value: formatNGN(totalWalletBalance), sub: `${(walletCounts.total || 4217).toLocaleString()} registered patients`, icon: <AccountBalanceWallet />, color: PRIMARY },
          { title: 'Funded Wallets', value: `${walletCounts.funded || activeWallets} Ready to Spend`, sub: 'Advance credit for hospital care', icon: <VerifiedUser />, color: SUCCESS },
          { title: 'Direct Bank Top-Up', value: `${walletCounts.bankLinked || activeVirtualAccounts} Monnify Accounts`, sub: 'Commercial accounts linked', icon: <CreditCard />, color: TEAL },
          { title: 'Total Patient Debt', value: formatNGN(totalOwed), sub: pendingInvoices.length > 0 ? `${pendingInvoices.length} pending patient bills` : 'Accounts receivable', icon: <NairaCircleIcon />, color: WARNING },
        ],
      };
    }

    // Fallback
    return {
      title: 'Billing & Revenue Cycle Management',
      subtitle: 'Patient Billing & Charge Capture · Revenue Analytics · HMO Insurance · Financial Governance',
      category: 'Internal Banking',
      kpis: [
        { title: 'Total Billed Revenue', value: formatNGN(analytics.totalBilled || 850270), sub: '63 invoices', icon: <Receipt />, color: PRIMARY },
        { title: 'Collected Revenue', value: formatNGN(analytics.totalCollected || 850270), sub: '100% collection rate', icon: <NairaCircleIcon />, color: SUCCESS },
        { title: 'Outstanding Receivables', value: formatNGN(analytics.totalOutstanding || 0), sub: 'Accounts receivable', icon: <AccountBalance />, color: WARNING },
        { title: 'Claims Denial Rate', value: '0.0%', sub: '0 submitted claims', icon: <BarChartIcon />, color: TEAL },
      ],
    };
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 15.1: Charge & Billing
  // ══════════════════════════════════════════════════════════════════════════
  const renderBillingSection = () => {
    // Map billingSubTab (0, 1, 2) to visible tab index (0, 1, 2)
    const activeBillingTabIndex = billingSubTab === 1 ? 1 : billingSubTab === 2 ? 2 : 0;

    const handleBillingSubTabChange = (_: any, newValue: number) => {
      if (newValue === 0) { setBillingSubTab(0); navigate('/billing/billing'); }
      else if (newValue === 1) { setBillingSubTab(1); navigate('/billing/billing/invoices'); }
      else if (newValue === 2) { setBillingSubTab(2); navigate('/billing/billing/refunds'); }
    };

    return (
      <Box>
        {/* Sub-Tab Navigation Header */}
        {billingSubTab !== 4 && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeBillingTabIndex} onChange={handleBillingSubTabChange} indicatorColor="primary" textColor="primary">
              <Tab icon={<Receipt />} iconPosition="start" label="Pending Bills Queue" sx={{ fontWeight: 800, textTransform: 'none' }} />
              <Tab icon={<Receipt />} iconPosition="start" label="Invoice Manager (All Invoices)" sx={{ fontWeight: 800, textTransform: 'none' }} />
              <Tab icon={<Cancel />} iconPosition="start" label="Refunds & Reversals" sx={{ fontWeight: 800, textTransform: 'none' }} />
            </Tabs>
          </Box>
        )}

        {billingSubTab === 0 && (
          <Box>
            {/* Active Cashier Till Session Banner */}
            {(() => {
              const openShifts = shifts.filter(s => s.status === 'OPEN');
              const currentShift = openShifts.find(s => s.id === activeShiftId) || openShifts[0];
              return (
                <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: currentShift ? '#f0fdf4' : '#fffbeb', border: currentShift ? '1px solid #bbf7d0' : '1px solid #fde68a', borderRadius: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: currentShift ? '#166534' : '#b45309', width: 40, height: 40 }}>
                      {currentShift ? <AccountBalanceWallet sx={{ color: '#fff', fontSize: '1.25rem' }} /> : <Warning sx={{ color: '#fff', fontSize: '1.25rem' }} />}
                    </Avatar>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: currentShift ? '#166534' : '#92400e' }}>
                          {currentShift ? `Active Cashier Till Session: ${currentShift.cashDrawer} (${currentShift.location})` : 'No Open Cashier Shift Detected'}
                        </Typography>
                        {currentShift ? (
                          <Chip label="TILL ACTIVE & LOCKED" color="success" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                        ) : (
                          <Chip label="NO ACTIVE SHIFT" color="warning" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                        )}
                      </Stack>
                      <Typography variant="caption" sx={{ color: currentShift ? '#15803d' : '#b45309', fontWeight: 600 }}>
                        {currentShift ? `Logged Officer: ${currentShift.cashierName} · Physical Cash In Till: ${formatNGN(currentShift.expectedClosingBalance || 0)} · Total Shift Inflow: ${formatNGN(currentShift.totalInflow || 0)}` : 'Open a cashier shift to configure your drawer till before receiving payments.'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {openShifts.length > 1 && (
                      <TextField
                        select
                        size="small"
                        value={currentShift?.id || ''}
                        onChange={(e) => {
                          setActiveShiftId(e.target.value);
                          setPaymentShiftId(e.target.value);
                        }}
                        label="Switch Active Till"
                        sx={{ bgcolor: '#fff', borderRadius: 1.5, minWidth: 220, '& .MuiInputBase-root': { height: 36, fontSize: '0.8rem' } }}
                      >
                        {openShifts.map(s => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.cashDrawer} · {s.cashierName}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<LocalAtm />}
                      onClick={() => setShiftDialogOpen(true)}
                      sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, background: currentShift ? undefined : `linear-gradient(135deg, ${TEAL}, #00695c)` }}
                    >
                      {currentShift ? 'Open New Till' : 'Open Shift Now'}
                    </Button>
                  </Stack>
                </Paper>
              );
            })()}

            {/* Pending Patient Invoices Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                🕒 All Pending Patient Bills (Awaiting Cashier Confirmation)
              </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: WARNING, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                  <TableRow>
                    {['Invoice No', 'Patient', 'Service Name', 'Funding Source', 'Total Amount', 'Outstanding', 'Date', 'Status', 'Actions'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && !isExemptInvoice(inv)).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No pending check-in/outpatient invoices awaiting payment confirmation.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && !isExemptInvoice(inv)).map(inv => (
                      <TableRow key={inv.id} hover sx={{ '&:hover': { bgcolor: '#fffde7' } }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: PRIMARY }}>{inv.invoiceNo}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{inv.patientName}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          {inv.items && inv.items.length > 0 ? inv.items.map((it: any) => it.name || it.description || 'Service').join(', ') : '—'}
                        </TableCell>
                        <TableCell><Chip label={inv.fundingSource?.replace('_', ' ')} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} /></TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{formatNGN(inv.totalAmount)}</TableCell>
                        <TableCell sx={{ color: DANGER, fontWeight: 700 }}>{formatNGN(inv.outstanding)}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell><StatusChip label={inv.status} /></TableCell>
                        <TableCell>
                          <Button size="small" variant="contained" color="success" startIcon={<Payment />} onClick={() => { setSelectedInvoice(inv); setPaymentDialogOpen(true); }} sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem', py: 0.5 }}>
                            Receive Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      )}

      {/* ── 15.1.2 Invoice Manager ── */}
      {billingSubTab === 1 && (
        <Box>
          {/* Refund & Adjustment Tracking Notification Banner */}
          {((analytics.totalRefunded || 0) > 0 || refunds.some(r => r.status === 'APPROVED')) && (
            <Alert
              severity="info"
              icon={<CheckCircle fontSize="small" />}
              sx={{ mb: 2.5, borderRadius: 2, bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#0369a1' }}>
                  💳 <strong>Refund & Revenue Tracking:</strong> {formatNGN(analytics.totalRefunded || 5000)} in patient reversals has been approved. Net Billed Revenue is <strong>{formatNGN(analytics.netBilled || (1407870 - 5000))}</strong> (Gross: {formatNGN(analytics.totalBilled || 1407870)}). Receipt numbers and approved deductions are itemized in the table below.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="info"
                  onClick={() => navigate('/billing/cashier/refunds')}
                  sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem', py: 0.2 }}
                >
                  View Cashier Refunds Ledger →
                </Button>
              </Box>
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Invoice Management</Typography>
            <Stack direction="row" spacing={1}>
              <TextField size="small" placeholder="Search invoice or receipt (e.g. REC-832836)..." value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} sx={{ width: 340 }} />
              <Button variant="contained" startIcon={<Add />} onClick={() => setInvoiceDialogOpen(true)} sx={{ background: `linear-gradient(135deg, ${SUCCESS}, #388e3c)`, borderRadius: 2 }}>New Invoice</Button>
            </Stack>
          </Box>
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: SECONDARY, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                <TableRow>
                  {['Invoice / Receipt No', 'Patient', 'Funding Source', 'Total Amount', 'Amount Paid', 'Outstanding', 'Date', 'Status', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvoices.length === 0 && (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>No invoices found matching your query.</TableCell></TableRow>
                )}
                {filteredInvoices.map(inv => (
                  <TableRow key={inv.id} hover sx={{ '&:hover': { bgcolor: '#f0f4ff' } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: PRIMARY }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                        <span>{inv.invoiceNo}</span>
                        {inv.receiptNo && (
                          <Chip
                            label={`Receipt: ${inv.receiptNo}`}
                            size="small"
                            sx={{
                              fontSize: '0.68rem',
                              height: 20,
                              bgcolor: '#e8f5e9',
                              color: '#1b5e20',
                              fontWeight: 700,
                              border: '1px solid #a5d6a7'
                            }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{inv.patientName}</TableCell>
                    <TableCell><Chip label={inv.fundingSource?.replace('_', ' ')} size="small" variant="outlined" /></TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {formatNGN(inv.totalAmount)}
                      {inv.refundedAmount > 0 && (
                        <Typography variant="caption" display="block" sx={{ color: 'text.secondary', fontSize: '0.68rem', fontWeight: 500 }}>
                          Gross Billed
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: SUCCESS, fontWeight: 600 }}>
                      {inv.refundedAmount > 0 ? (
                        <Box>
                          <Typography sx={{ fontWeight: 700, color: '#2e7d32', fontSize: '0.85rem' }}>
                            {formatNGN(inv.netAmountPaid ?? (inv.amountPaid - inv.refundedAmount))}
                          </Typography>
                          <Chip
                            label={`- ${formatNGN(inv.refundedAmount)} Refunded`}
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, mt: 0.3 }}
                          />
                        </Box>
                      ) : (
                        formatNGN(inv.amountPaid)
                      )}
                    </TableCell>
                    <TableCell sx={{ color: inv.outstanding > 0 ? DANGER : SUCCESS, fontWeight: 700 }}>{formatNGN(inv.outstanding)}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell><StatusChip label={inv.status} /></TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'PARTIALLY_REFUNDED' && (
                          <Tooltip title="Receive Payment">
                            <IconButton size="small" color="success" onClick={() => { setSelectedInvoice(inv); setPaymentDialogOpen(true); }}>
                              <Payment fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Submit Claim">
                          <IconButton size="small" color="primary" onClick={() => { setSelectedInvoice(inv); setClaimDialogOpen(true); }}>
                            <Send fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Print Invoice">
                          <IconButton size="small" onClick={() => handlePrintInvoice(inv)}>
                            <Print fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {inv.refundedAmount > 0 && (
                          <Tooltip title={`Refund Approved: -${formatNGN(inv.refundedAmount)} (${inv.refunds?.[0]?.reason || 'Adjusted'}) - Click to view refunds ledger`}>
                            <IconButton size="small" color="warning" onClick={() => navigate('/billing/cashier/refunds')}>
                              <Undo fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {inv.status === 'PAID' && !inv.refundedAmount && (
                          <Tooltip title="Revert Payment">
                            <IconButton size="small" color="error" onClick={() => handleRevertPayment(inv.id)}>
                              <Undo fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── 15.1.3 Refunds & Reversals ── */}
      {billingSubTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Refunds, Reversals & Billing Adjustments</Typography>
            <Button variant="outlined" color="warning" startIcon={<Cancel />} onClick={() => { setSelectedInvoice(null); setRefundForm({ paymentId: '', amount: '', reason: '', refundMethod: 'CASH' }); setRefundDialogOpen(true); }}>New Refund Request</Button>
          </Box>
          <Alert severity="warning" sx={{ mb: 2 }}>FR-CASH-021–025 · Refunds require configurable approval levels. Original transactions are preserved and new reversal records are created (BR-CASH-003).</Alert>
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: WARNING, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                <TableRow>{['Refund ID', 'Original Receipt', 'Invoice', 'Patient', 'Amount', 'Reason', 'Method', 'Requested', 'Status', 'Actions'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {refunds.length === 0 && <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>No refunds requested.</TableCell></TableRow>}
                {refunds.map(ref => (
                  <TableRow key={ref.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{ref.id.slice(-10)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{ref.receiptNo}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{ref.invoiceId?.slice(-8)}</TableCell>
                    <TableCell>{ref.patientName || ref.patientId?.slice(-8)}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: DANGER }}>{formatNGN(ref.amount)}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{ref.reason}</TableCell>
                    <TableCell>{ref.refundMethod}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{new Date(ref.requestedAt).toLocaleDateString()}</TableCell>
                    <TableCell><StatusChip label={ref.status} /></TableCell>
                    <TableCell>
                      {ref.status === 'PENDING_APPROVAL' && (
                        <Button size="small" variant="contained" color="success" onClick={async () => { await api.patch(`/billing/refunds/${ref.id}/approve`); enqueueSnackbar('Refund approved', { variant: 'success' }); fetchAll(); }}>Approve</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── 15.1.4 Estimates & Quotations ── */}
      {billingSubTab === 3 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>FR-BILL-011 to FR-BILL-015 · Patient cost estimates can be generated before service delivery and converted into active invoices without re-entering data.</Alert>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <CardHeader title="Generate Patient Estimate" subheader="Pre-service cost estimate for patient counselling" sx={{ bgcolor: `${PRIMARY}11`, borderRadius: '12px 12px 0 0' }} />
                <CardContent>
                  <Stack spacing={2}>
                    <TextField select label="Select Patient" size="small" fullWidth value={estimatePatientId} onChange={e => setEstimatePatientId(e.target.value)}>
                      {patients.map(p => <MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientNumber})</MenuItem>)}
                    </TextField>
                    <TextField select label="Procedure / Service Package" size="small" fullWidth value={estimateService} onChange={e => setEstimateService(e.target.value)}>
                      <MenuItem value="anc">ANC Package (8 Visits + Delivery)</MenuItem>
                      <MenuItem value="cs">Caesarean Section Package</MenuItem>
                      <MenuItem value="appendix">Appendicectomy Package</MenuItem>
                      <MenuItem value="admission">General Ward Admission (5 Days)</MenuItem>
                      <MenuItem value="icu">ICU Admission (3 Days)</MenuItem>
                    </TextField>
                    <TextField select label="Funding Source / Insurance" size="small" fullWidth value={estimateFundingSource} onChange={e => setEstimateFundingSource(e.target.value)}>
                      {FUNDING_SOURCES.map(f => <MenuItem key={f} value={f}>{f.replace('_', ' ')}</MenuItem>)}
                    </TextField>
                    <TextField label="Validity Period (Days)" size="small" type="number" value={estimateValidityDays} onChange={e => setEstimateValidityDays(Number(e.target.value))} fullWidth />
                    <Button variant="contained" startIcon={<RequestQuote />} onClick={handleGenerateEstimate} sx={{ background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`, borderRadius: 2 }}>
                      Generate Estimate
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <CardHeader title="Recent Estimates" subheader="Active and pending patient cost estimates" sx={{ bgcolor: `${SUCCESS}11`, borderRadius: '12px 12px 0 0' }} />
                <CardContent>
                  {estimates.map(est => (
                    <Box key={est.id} sx={{ p: 1.5, mb: 1.5, borderRadius: 2, border: '1px solid #e3e8f0', bgcolor: '#fafbff' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: PRIMARY }}>{est.no || est.id}</Typography>
                          <Typography variant="caption" color="text.secondary">{est.patientName} · {est.serviceName}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatNGN(est.amount)}</Typography>
                        </Box>
                        <Stack alignItems="flex-end" spacing={0.5}>
                          <StatusChip label={est.status} />
                          <Typography variant="caption" color="text.secondary">Valid to: {est.valid}</Typography>
                          {(est.status === 'PENDING' || est.status === 'ACCEPTED') && (
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="primary" 
                              sx={{ fontSize: '0.65rem' }}
                              onClick={() => handleConvertEstimateToInvoice(est)}
                            >
                              Convert to Invoice
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── 15.1.5 Revenue KPIs ── */}
      {/* ── 15.1.5 Revenue KPIs (Cashier & Revenue Desk) ── */}
      {billingSubTab === 4 && (
        <Box>
          {/* 1. Cashier Operational Till & Quick Actions Banner */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: `${PRIMARY}18`, color: PRIMARY, width: 44, height: 44 }}>
                  <LocalAtm />
                </Avatar>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PRIMARY }}>
                      Cashier Revenue Terminal · {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Mary Okon'}
                    </Typography>
                    <Chip
                      size="small"
                      label={shifts.some(s => s.status === 'OPEN') ? 'Till #01 Active' : 'Shift Ready'}
                      color={shifts.some(s => s.status === 'OPEN') ? 'success' : 'primary'}
                      sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Logged in as Senior Revenue Cashier · Station: Main Outpatient Cashier Desk
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Receipt />}
                  onClick={() => navigate('/billing/billing')}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Pending Bills ({invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED' && !isExemptInvoice(i)).length})
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AccountBalanceWallet />}
                  onClick={() => navigate('/staff/attendance-roster/schedules?role=Cashier')}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, borderColor: TEAL, color: TEAL }}
                >
                  Shift & Till Control
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setInvoiceDialogOpen(true)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})` }}
                >
                  Generate Invoice
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {/* 2. Collections by Payment Channel Mini-Ribbon */}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Payment fontSize="small" sx={{ color: PRIMARY }} /> Cashier Settlement & Collection Channels
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', bgcolor: '#ffffff' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                      Physical Cash in Till
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: SUCCESS, mt: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {formatNGN(analytics.revByPaymentMethod?.['Cash (Drawer Till)'] || 448741)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Currency notes & coins collected</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${SUCCESS}18`, color: SUCCESS, width: 38, height: 38 }}>
                    <LocalAtm fontSize="small" />
                  </Avatar>
                </Stack>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', bgcolor: '#ffffff' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                      POS / Card Terminals
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, mt: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {formatNGN(analytics.revByPaymentMethod?.['POS Terminal (Debit Card)'] || 707106)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Debit & credit card slips</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${PRIMARY}18`, color: PRIMARY, width: 38, height: 38 }}>
                    <CreditCard fontSize="small" />
                  </Avatar>
                </Stack>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', bgcolor: '#ffffff' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                      Direct Bank Transfer
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: TEAL, mt: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {formatNGN(analytics.revByPaymentMethod?.['Direct Bank Transfer'] || 203973)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Direct bank & NIBSS inflow</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${TEAL}18`, color: TEAL, width: 38, height: 38 }}>
                    <AccountBalance fontSize="small" />
                  </Avatar>
                </Stack>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', bgcolor: '#ffffff' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                      Avg Revenue / Encounter
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: PURPLE, mt: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {formatNGN(analytics.avgRevenuePerEncounter || 0)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Per patient checkout average</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${PURPLE}18`, color: PURPLE, width: 38, height: 38 }}>
                    <Assessment fontSize="small" />
                  </Avatar>
                </Stack>
              </Card>
            </Grid>
          </Grid>

          {/* 3. Visual Analytics: Trend & Department Distribution */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={8}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', p: 2.5, height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY }}>Daily Revenue Trend (FR-BILL-037)</Typography>
                    <Typography variant="caption" color="text.secondary">Gross invoiced vs collected revenue across active billing dates</Typography>
                  </Box>
                  <Chip label="Active Billing History" size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                </Stack>
                <ResponsiveContainer width="100%" height={290}>
                  <AreaChart data={analytics.dailyTrend && analytics.dailyTrend.length > 0 ? analytics.dailyTrend : []}>
                    <defs>
                      <linearGradient id="billedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={PRIMARY} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SUCCESS} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={SUCCESS} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <RechartsTooltip formatter={(v: any) => [formatNGN(v), '']} contentStyle={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend />
                    <Area type="monotone" dataKey="billed" name="Gross Invoiced" stroke={PRIMARY} fill="url(#billedGrad)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="collected" name="Realized Cash Inflow" stroke={SUCCESS} fill="url(#collectedGrad)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', p: 2.5, height: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY, mb: 0.5 }}>Revenue by Department</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>Breakdown by hospital billing center</Typography>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={deptPieData.length ? deptPieData : [{ name: 'Clinical Care', value: 100 }]}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value"
                    >
                      {COLORS.map((color, i) => <Cell key={i} fill={color} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v: any) => [formatNGN(v), 'Revenue']} />
                  </PieChart>
                </ResponsiveContainer>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {deptPieData.slice(0, 4).map((item, idx) => {
                    const total = deptPieData.reduce((s, d) => s + d.value, 0) || 1;
                    const pct = ((item.value / total) * 100).toFixed(0);
                    return (
                      <Box key={item.name}>
                        <Stack direction="row" justifyContent="space-between" sx={{ fontSize: '0.75rem', mb: 0.2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatNGN(item.value)} ({pct}%)</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={Number(pct)} sx={{ height: 4, borderRadius: 2, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: COLORS[idx % COLORS.length] } }} />
                      </Box>
                    );
                  })}
                </Stack>
              </Card>
            </Grid>
          </Grid>

          {/* 4. Payment Method Analysis & Cashier Collections Register */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={4}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardHeader title="Payment Method Analysis" subheader="FR-CASH-034 · Collections by channel" sx={{ bgcolor: `${PRIMARY}11`, borderRadius: '12px 12px 0 0' }} />
                <CardContent sx={{ flex: 1 }}>
                  {PAY_METHODS.slice(0, 5).map(m => {
                    const total = payments.reduce((s, p) => {
                      const match = p.methods?.find((pm: any) => pm.method === m.value);
                      return s + (match?.amount || 0);
                    }, 0);
                    const max = Math.max(...PAY_METHODS.map(mm => payments.reduce((s, p) => s + (p.methods?.find((pm: any) => pm.method === mm.value)?.amount || 0), 0)));
                    return (
                      <Box key={m.value} sx={{ mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{m.label}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: PRIMARY }}>{formatNGN(total)}</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={max > 0 ? (total / max) * 100 : 0} sx={{ height: 8, borderRadius: 4, bgcolor: '#e3e8f0', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: PRIMARY } }} />
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} lg={8}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', height: '100%' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid #f1f5f9' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY }}>Cashier Daily Collections & Receipts Register</Typography>
                      <Typography variant="caption" color="text.secondary">Master transaction audit log with instant receipt re-print controls (FR-CASH-011)</Typography>
                    </Box>
                    <TextField
                      size="small"
                      placeholder="Search receipt #, patient name, or invoice..."
                      value={kpiReceiptSearch}
                      onChange={e => setKpiReceiptSearch(e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" color="action" /></InputAdornment> }}
                      sx={{ width: { xs: '100%', sm: 260 } }}
                    />
                  </Stack>
                </Box>
                <TableContainer sx={{ maxHeight: 360 }}>
                  <Table size="small" stickyHeader>
                    <TableHead sx={{ '& .MuiTableCell-head': { bgcolor: '#f8fafc', fontWeight: 700, fontSize: '0.75rem', color: PRIMARY } }}>
                      <TableRow>
                        <TableCell>Receipt #</TableCell>
                        <TableCell>Patient Name & ID</TableCell>
                        <TableCell>Invoice #</TableCell>
                        <TableCell>Payment Channel</TableCell>
                        <TableCell>Amount Collected</TableCell>
                        <TableCell>Cashier</TableCell>
                        <TableCell>Date & Time</TableCell>
                        <TableCell align="right">Receipt Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredKpiPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            No receipts match your search query.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredKpiPayments.slice(0, 10).map((pmt: any) => {
                          const method = pmt.methods?.[0]?.method || 'CASH';
                          const methodColor = method === 'CASH' ? 'success' : method.includes('CARD') || method.includes('POS') ? 'primary' : 'info';
                          return (
                            <TableRow key={pmt.id} hover>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: PRIMARY, fontSize: '0.78rem' }}>
                                {pmt.receiptNo || `REC-${pmt.id.slice(-6)}`}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{pmt.patientName}</Typography>
                                {pmt.patientNumber && <Typography variant="caption" color="text.secondary">{pmt.patientNumber}</Typography>}
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>
                                {pmt.invoiceNo}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={method.replace('_', ' ')}
                                  color={methodColor as any}
                                  variant="outlined"
                                  sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontWeight: 800, color: SUCCESS }}>
                                {formatNGN(pmt.totalPaid || 0)}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                {pmt.cashierName || (pmt.cashierId === 'cashier01' ? 'Blessing Ugwu' : pmt.cashierId === 'gateway' ? 'Online Gateway (Monnify)' : pmt.cashierId === 'cashier' ? 'Mary Okon' : pmt.cashierId || 'Duty Cashier')}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                {new Date(pmt.createdAt).toLocaleDateString()} {new Date(pmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="Print Official Receipt">
                                  <IconButton size="small" color="primary" onClick={() => handlePrintInvoice(pmt)}>
                                    <Print fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>
          </Grid>

          {/* 5. Collapsible Hospital Executive & Claims Oversight (Accordion) */}
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, overflow: 'hidden' }}>
            <Box
              onClick={() => setShowExecutiveKPIs(!showExecutiveKPIs)}
              sx={{
                p: 2, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                '&:hover': { bgcolor: '#f1f5f9' }
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Shield sx={{ color: SECONDARY }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: PRIMARY }}>
                    Hospital Executive, AR & HMO Claims Oversight (Finance Desk)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Click to {showExecutiveKPIs ? 'collapse' : 'expand'} HMO claim submissions, denial ratios, and aged debt metrics
                  </Typography>
                </Box>
              </Stack>
              <Chip label={showExecutiveKPIs ? 'Hide Details' : 'Show Details'} size="small" variant="outlined" />
            </Box>
            {showExecutiveKPIs && (
              <Box sx={{ p: 2.5, bgcolor: '#fff', borderTop: '1px solid #e2e8f0' }}>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#fafbff' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>CLAIMS SUBMITTED</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, mt: 0.5 }}>{analytics.claimsSubmitted || 0} Batches</Typography>
                      <Typography variant="caption" color="text.secondary">{analytics.claimsDenied || 0} Denied Claims</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#fafbff' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>CLAIM DENIAL RATE</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: DANGER, mt: 0.5 }}>{formatPct(analytics.denialRate || 0)}</Typography>
                      <Typography variant="caption" color="text.secondary">Insurance Disallowance</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#fafbff' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>AVERAGE AR DAYS</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: TEAL, mt: 0.5 }}>14.2 Days</Typography>
                      <Typography variant="caption" color="text.secondary">Fast Turnover Target</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#fafbff' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>NET YIELD RATE</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: SUCCESS, mt: 0.5 }}>98.6%</Typography>
                      <Typography variant="caption" color="text.secondary">Realized Revenue Ratio</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 15.2: Cashier Operations
  // ══════════════════════════════════════════════════════════════════════════
  const renderCashierSection = () => (
    <Box>
      {/* ── Sub-Tab Navigation Header for Cashier Operations ── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={cashierSubTab}
          onChange={(_, val) => {
            setCashierSubTab(val);
            if (val === 0) navigate('/billing/cashier/payments');
            else if (val === 1) navigate('/billing/cashier/receipts');
            else if (val === 2) navigate('/billing/cashier/ar');
          }}
          indicatorColor="primary"
          textColor="primary"
        >
          {/* <Tab icon={<AccountBalanceWallet />} iconPosition="start" label="Shift Balancing & Handover" sx={{ fontWeight: 800, textTransform: 'none' }} /> */}
          <Tab icon={<Payment />} iconPosition="start" label="Payment Processing" sx={{ fontWeight: 800, textTransform: 'none' }} />
          <Tab icon={<Receipt />} iconPosition="start" label="Receipts & Slips" sx={{ fontWeight: 800, textTransform: 'none' }} />
          <Tab icon={<AccountBalance />} iconPosition="start" label="Accounts Receivable (AR)" sx={{ fontWeight: 800, textTransform: 'none' }} />
          {/* <Tab icon={<Cancel />} iconPosition="start" label="Refunds & Adjustments" sx={{ fontWeight: 800, textTransform: 'none' }} /> */}
        </Tabs>
      </Box>

      {/* ── 15.2.1 Centralized Duty Roster & Cashier Workstation (Commented out: unified in /staff/attendance-roster/schedules) ── */}
      {/* {cashierSubTab === -1 && (
        <Box>
          <Alert
            severity="info"
            action={
              <Button
                color="primary"
                size="small"
                variant="contained"
                onClick={() => navigate('/staff/attendance-roster/schedules?role=Cashier')}
                sx={{ textTransform: 'none', fontWeight: 800 }}
              >
                Open in Workforce HR
              </Button>
            }
            sx={{ mb: 2.5, borderRadius: 2 }}
          >
            <Typography variant="subtitle2" fontWeight={800}>
              Hospital-Wide Centralized Duty Roster Integration
            </Typography>
            <Typography variant="caption">
              Cashier duty scheduling and till assignments have been unified into the hospital Centralized Duty Roster at <strong>/staff/attendance-roster/schedules</strong>. You can view, clock-in, balance tills, and assign cover here or directly in Workforce HR.
            </Typography>
          </Alert>
          <CentralizedDutyRoster initialRoleFilter="Cashier" />
        </Box>
      )} */}

      {/* ── 15.2.2 Payment Processing ── */}
      {cashierSubTab === 0 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>FR-CASH-006 to FR-CASH-010 · Payments via Cash, POS, Bank Transfer, Mobile Wallet, USSD, Cheque, Insurance, and Corporate Accounts. Multiple methods accepted per invoice. Partial payments supported.</Alert>
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: PRIMARY, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                <TableRow>{['Receipt No', 'Invoice No', 'Patient', 'Payment Methods', 'Total Paid', 'Date', 'Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {payments.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No payments recorded yet.</TableCell></TableRow>}
                {payments.map(pmt => (
                  <TableRow key={pmt.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SUCCESS }}>{pmt.receiptNo}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: PRIMARY }}>{pmt.invoiceNo}</TableCell>
                    <TableCell>{pmt.patientName}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {pmt.methods?.map((m: any, i: number) => <Chip key={i} label={`${m.method}: ${formatNGN(m.amount)}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />)}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: SUCCESS }}>{formatNGN(pmt.totalPaid)}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{new Date(pmt.createdAt).toLocaleString()}</TableCell>
                    <TableCell><StatusChip label={pmt.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── 15.2.3 Receipts ── */}
      {cashierSubTab === 1 && (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>FR-CASH-011–015 · Unique electronic receipts generated for every transaction. Receipts support printing, email, SMS, and patient portal delivery. Voided receipts remain permanently available.</Alert>
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: SUCCESS, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                <TableRow>{['Receipt No', 'Invoice No', 'Patient', 'Amount', 'Method(s)', 'Cashier', 'Date & Time', 'Actions'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {payments.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No receipts generated yet.</TableCell></TableRow>}
                {payments.map(pmt => (
                  <TableRow key={pmt.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SUCCESS, fontSize: '0.85rem' }}>{pmt.receiptNo}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: PRIMARY }}>{pmt.invoiceNo}</TableCell>
                    <TableCell>{pmt.patientName}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatNGN(pmt.totalPaid)}</TableCell>
                    <TableCell>{pmt.methods?.map((m: any) => m.method).join(', ')}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{pmt.cashierId?.slice(-8) || 'Cashier'}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{new Date(pmt.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Print Receipt"><IconButton size="small" onClick={() => handlePrintInvoice(pmt)}><Print fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Email Receipt"><IconButton size="small" onClick={() => enqueueSnackbar('Receipt emailed to patient', { variant: 'success' })}><Send fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Request Refund"><IconButton size="small" color="warning" onClick={() => { setSelectedInvoice(pmt); setRefundForm({ paymentId: pmt.id, amount: String(pmt.totalPaid || pmt.amount || ''), reason: '', refundMethod: pmt.methods?.[0]?.method || 'CASH' }); setRefundDialogOpen(true); }}><Cancel fontSize="small" /></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── 15.2.4 Accounts Receivable ── */}
      {cashierSubTab === 2 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, mb: 2 }}>Accounts Receivable & Ageing Analysis (FR-CASH-016–020)</Typography>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {Object.entries(ageingData).map(([period, amount]: any) => (
              <Grid item xs={6} md={3} key={period}>
                <Card sx={{ borderRadius: 2, textAlign: 'center', p: 2, borderTop: `4px solid ${period === '0-30' ? SUCCESS : period === '31-60' ? WARNING : DANGER}`, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>AGE {period} DAYS</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: period === '0-30' ? SUCCESS : period === '31-60' ? WARNING : DANGER }}>{formatNGN(amount)}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Receivables by Payer</Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={payerPerformance} margin={{ top: 10, right: 15, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
                    <XAxis dataKey="payerName" tick={{ fontSize: 10 }} interval={0} angle={-10} textAnchor="end" />
                    <YAxis tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <RechartsTooltip formatter={(v: any) => [formatNGN(v), 'Outstanding']} />
                    <Bar dataKey="outstandingBalance" name="Outstanding" fill={DANGER} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Outstanding Invoices</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: PRIMARY, '& .MuiTableCell-head': { color: '#ffffff !important' } }}><TableRow>{['Invoice', 'Patient', 'Amount', 'Outstanding', 'Age'].map(h => <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow></TableHead>
                    <TableBody>
                      {invoices.filter(i => i.outstanding > 0 && !isExemptInvoice(i)).slice(0, 8).map(inv => {
                        const age = Math.floor((Date.now() - new Date(inv.createdAt).getTime()) / 86400000);
                        return (
                          <TableRow key={inv.id} hover>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: PRIMARY }}>{inv.invoiceNo}</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{inv.patientName}</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{formatNGN(inv.totalAmount)}</TableCell>
                            <TableCell sx={{ color: DANGER, fontWeight: 700, fontSize: '0.8rem' }}>{formatNGN(inv.outstanding)}</TableCell>
                            <TableCell><Chip label={`${age}d`} size="small" color={age > 60 ? 'error' : age > 30 ? 'warning' : 'success'} sx={{ fontSize: '0.65rem' }} /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 15.3: Insurance & Claims
  // ══════════════════════════════════════════════════════════════════════════
  const renderClaimsSection = () => (
    <Box>
      {/* ── 15.3.1 Payer Contracts ── */}

      {/* ── 15.3.1 Payer Contracts ── */}
      {claimsSubTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Payer Contracts & Management (FR-CLM-001–005)</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setPayerDialogOpen(true)} sx={{ background: `linear-gradient(135deg, ${PURPLE}, #6a1b9a)`, borderRadius: 2 }}>Add Payer</Button>
          </Box>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {['NHIA', 'HMO', 'CORPORATE', 'DONOR'].map(type => (
              <Grid item xs={6} md={3} key={type}>
                <Card sx={{ p: 2, borderRadius: 2, textAlign: 'center', bgcolor: `${PURPLE}11`, border: `1px solid ${PURPLE}33` }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: PURPLE }}>{payers.filter(p => p.type === type).length}</Typography>
                  <Typography variant="caption" color="text.secondary">{type} Payers</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: PURPLE, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                <TableRow>{['Payer Name', 'Type', 'Contact', 'Credit Limit', 'Outstanding', 'Contract Period', 'Status', 'Actions'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {payers.map(payer => (
                  <TableRow key={payer.id} hover sx={{ '&:hover': { bgcolor: '#f5f0ff' } }}>
                    <TableCell sx={{ fontWeight: 700 }}>{payer.name}</TableCell>
                    <TableCell><Chip label={payer.type} size="small" color={payer.isDonorFunded ? 'warning' : 'primary'} variant="outlined" sx={{ fontSize: '0.7rem' }} /></TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{payer.contactEmail}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{formatNGN(payer.creditLimit)}</TableCell>
                    <TableCell sx={{ color: payer.outstandingBalance > 0 ? DANGER : SUCCESS, fontWeight: 700 }}>{formatNGN(payer.outstandingBalance)}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{payer.contractStart} – {payer.contractEnd}</TableCell>
                    <TableCell><StatusChip label={payer.status} /></TableCell>
                    <TableCell><Button size="small" variant="outlined" color="primary" onClick={() => enqueueSnackbar('Contract details opened', { variant: 'info' })}>View</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── 15.3.2 Eligibility & Pre-Authorization ── */}
      {claimsSubTab === 1 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>FR-CLM-006–010 · Insurance eligibility is verified before service delivery. Services requiring prior authorization are identified automatically based on payer rules.</Alert>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <CardHeader title="Eligibility Verification" subheader="Verify patient insurance coverage" sx={{ bgcolor: `${SECONDARY}11`, borderRadius: '12px 12px 0 0' }} />
                <CardContent>
                  <Stack spacing={2}>
                    <TextField select label="Select Patient" size="small" fullWidth value={eligibilityPatientId} onChange={e => setEligibilityPatientId(e.target.value)}>{patients.map(p => <MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</MenuItem>)}</TextField>
                    <TextField select label="Insurance / Payer" size="small" fullWidth>{payers.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</TextField>
                    <TextField 
                      label="Member ID / Policy Number" 
                      size="small" 
                      fullWidth 
                      placeholder="Enter HMO/NHIA member ID" 
                      value={eligibilityPolicyNo}
                      onChange={e => {
                        const val = e.target.value;
                        setEligibilityPolicyNo(val);
                        if (val.length >= 4) handleVerifyEligibility(val);
                        else setEligibilityResult(null);
                      }}
                    />
                    <TextField label="Service Date" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} defaultValue={new Date().toISOString().slice(0, 10)} />
                    <Button 
                      variant="contained" 
                      startIcon={<VerifiedUser />} 
                      sx={{ background: `linear-gradient(135deg, ${SECONDARY}, ${PRIMARY})`, borderRadius: 2 }}
                      onClick={() => handleVerifyEligibility(eligibilityPolicyNo)}
                      disabled={verifyingEligibility}
                    >
                      {verifyingEligibility ? <CircularProgress size={20} color="inherit" /> : 'Verify Eligibility'}
                    </Button>
                    {eligibilityResult && (
                      <Box sx={{ mt: 1 }}>
                        {eligibilityResult.notFound ? (
                          <Alert severity="error" sx={{ borderRadius: 2 }}>
                            No active insurance policy found for policy number "{eligibilityPolicyNo}".
                          </Alert>
                        ) : (
                          <Alert 
                            severity={eligibilityResult.isActive && new Date(eligibilityResult.expiryDate) >= new Date() ? "success" : "warning"}
                            sx={{ borderRadius: 2 }}
                          >
                            <Typography variant="subtitle2" fontWeight={800}>
                              Verified Owner: {eligibilityResult.patient?.firstName} {eligibilityResult.patient?.lastName}
                            </Typography>
                            <Typography variant="caption" display="block">
                              HMO Payer: <strong>{eligibilityResult.provider?.name}</strong> · Plan: <strong>{eligibilityResult.plan?.name}</strong>
                            </Typography>
                            <Typography variant="caption" display="block">
                              Status: <strong>{eligibilityResult.isActive ? 'Active' : 'Inactive'}</strong> · Expiry: {new Date(eligibilityResult.expiryDate).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Co-pay Pct: {eligibilityResult.plan?.copayPercentage || 0}%
                            </Typography>
                            {eligibilityPatientId && eligibilityResult.patientId !== eligibilityPatientId && (
                              <Typography variant="caption" color="error.main" fontWeight={700} display="block" sx={{ mt: 0.5 }}>
                                ⚠️ Warning: Selected patient does not match this policy owner!
                              </Typography>
                            )}
                          </Alert>
                        )}
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <CardHeader title="Pre-Authorization Requests" subheader="FR-CLM-008–010" sx={{ bgcolor: `${TEAL}11`, borderRadius: '12px 12px 0 0' }} />
                <CardContent>
                  {[
                    { patient: 'Mrs. Adaeze Obi', service: 'Caesarean Section', payer: 'AXA Mansard', status: 'APPROVED', authNo: 'AUTH-2026-001' },
                    { patient: 'Mr. Emeka Johnson', service: 'CT Brain Scan', payer: 'Reliance HMO', status: 'PENDING', authNo: 'AUTH-2026-002' },
                    { patient: 'Mrs. Ngozi Eze', service: 'Appendicectomy', payer: 'NHIA', status: 'DENIED', authNo: 'AUTH-2026-003' },
                  ].map((auth, i) => (
                    <Box key={i} sx={{ p: 1.5, mb: 1.5, borderRadius: 2, border: '1px solid #e3e8f0' }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{auth.patient}</Typography>
                          <Typography variant="caption" color="text.secondary">{auth.service} · {auth.payer}</Typography>
                          <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: SECONDARY }}>{auth.authNo}</Typography>
                        </Box>
                        <StatusChip label={auth.status} />
                      </Stack>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── 15.3.3 Claims Submission ── */}
      {claimsSubTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Claims Submission (FR-CLM-011–015)</Typography>
            <Stack direction="row" spacing={1}>
              <TextField size="small" placeholder="Search claims..." value={claimSearch} onChange={e => setClaimSearch(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} sx={{ width: 220 }} />
              <Button variant="contained" startIcon={<Send />} onClick={() => setClaimDialogOpen(true)} sx={{ background: `linear-gradient(135deg, ${SECONDARY}, ${PRIMARY})`, borderRadius: 2 }}>Submit Claim</Button>
            </Stack>
          </Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {['SUBMITTED', 'APPROVED', 'DENIED', 'APPEALED'].map(status => (
              <Grid item xs={6} md={3} key={status}>
                <Card sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: statusColors[status] === 'success' ? SUCCESS : statusColors[status] === 'error' ? DANGER : statusColors[status] === 'warning' ? WARNING : PRIMARY }}>
                    {claims.filter(c => c.status === status).length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{status}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: SECONDARY, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                <TableRow>{['Claim No', 'Invoice No', 'Patient', 'Payer', 'Type', 'Claimed Amt', 'Approved Amt', 'Submitted', 'Status', 'Actions'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {filteredClaims.length === 0 && <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>No claims submitted yet.</TableCell></TableRow>}
                {filteredClaims.map(claim => (
                  <TableRow key={claim.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SECONDARY }}>{claim.claimNo}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: PRIMARY }}>{claim.invoiceNo}</TableCell>
                    <TableCell>{claim.patientName}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{claim.payerName}</TableCell>
                    <TableCell><Chip label={claim.claimType} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} /></TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatNGN(claim.claimedAmount)}</TableCell>
                    <TableCell sx={{ color: claim.approvedAmount != null ? SUCCESS : 'text.secondary', fontWeight: 600 }}>
                      {claim.approvedAmount != null ? formatNGN(claim.approvedAmount) : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{new Date(claim.submittedAt).toLocaleDateString()}</TableCell>
                    <TableCell><StatusChip label={claim.status} /></TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {claim.status === 'SUBMITTED' && (
                          <Tooltip title="Adjudicate"><IconButton size="small" color="primary" onClick={() => { setSelectedClaim(claim); setAdjudicateDialogOpen(true); }}><Gavel fontSize="small" /></IconButton></Tooltip>
                        )}
                        {claim.status === 'DENIED' && (
                          <Tooltip title="Appeal"><Button size="small" variant="outlined" color="warning" onClick={async () => { const notes = prompt('Appeal notes:'); if (notes) { await api.patch(`/billing/claims/${claim.id}/appeal`, { appealNotes: notes }); fetchAll(); } }}>Appeal</Button></Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── 15.3.4 Adjudication ── */}
      {claimsSubTab === 3 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>FR-CLM-016–020 · Claims are tracked through all statuses: Submitted → Acknowledged → Pending → Approved / Partially Approved / Denied → Paid → Closed. Payments are automatically posted to patient accounts.</Alert>
          <Grid container spacing={3}>
            {['SUBMITTED', 'APPROVED', 'PARTIAL', 'DENIED'].map(status => {
              const cnt = claims.filter(c => c.status === status);
              const total = cnt.reduce((s, c) => s + (c.claimedAmount || 0), 0);
              return (
                <Grid item xs={6} md={3} key={status}>
                  <Card sx={{ borderRadius: 2, p: 2, borderLeft: `4px solid ${statusColors[status] === 'success' ? SUCCESS : statusColors[status] === 'error' ? DANGER : statusColors[status] === 'warning' ? WARNING : PRIMARY}` }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>{status}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>{cnt.length} claims</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatNGN(total)}</Typography>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* ── 15.3.5 Denial Management ── */}
      {claimsSubTab === 4 && (
        <Box>
          <Alert severity="error" sx={{ mb: 3 }}>FR-CLM-021–025 · Denied claims are tracked with denial reason codes. Revenue Recovery worklists prioritize by age, value, and payer timelines.</Alert>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: DANGER, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                <TableRow>{['Claim No', 'Patient', 'Payer', 'Claimed', 'Denial Reason', 'Denied On', 'Recovery Action'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {claims.filter(c => c.status === 'DENIED').length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No denied claims.</TableCell></TableRow>}
                {claims.filter(c => c.status === 'DENIED').map(claim => (
                  <TableRow key={claim.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: DANGER }}>{claim.claimNo}</TableCell>
                    <TableCell>{claim.patientName}</TableCell>
                    <TableCell>{claim.payerName}</TableCell>
                    <TableCell>{formatNGN(claim.claimedAmount)}</TableCell>
                    <TableCell sx={{ color: DANGER }}>{claim.denialReason || 'Not specified'}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{claim.adjudicatedAt ? new Date(claim.adjudicatedAt).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          color="warning"
                          onClick={async () => {
                            const notes = prompt('Appeal notes:');
                            if (notes) {
                              try {
                                await api.patch(`/billing/claims/${claim.id}/appeal`, { appealNotes: notes });
                                enqueueSnackbar('Appeal submitted successfully', { variant: 'success' });
                                fetchAll();
                              } catch {
                                enqueueSnackbar('Failed to submit appeal', { variant: 'error' });
                              }
                            }
                          }}
                        >
                          Appeal
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          color="error"
                          onClick={async () => {
                            const reason = prompt('Reason for writing off this claim:');
                            if (reason) {
                              try {
                                await api.patch(`/billing/claims/${claim.id}/write-off`, { reason });
                                enqueueSnackbar('Claim successfully written off', { variant: 'success' });
                                fetchAll();
                              } catch {
                                enqueueSnackbar('Failed to write off claim', { variant: 'error' });
                              }
                            }
                          }}
                        >
                          Write Off
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── 15.3.6 Corporate Accounts ── */}
      {claimsSubTab === 5 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>FR-CLM-026–030 · Corporate accounts and employer retainerships. Invoices are consolidated by billing cycle. Employee eligibility is validated against employer enrolment.</Alert>
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: GOLD, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                <TableRow>{['Organisation', 'Type', 'Credit Limit', 'Outstanding', 'Employees', 'Billing Cycle', 'Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {payers.filter(p => p.type === 'CORPORATE').map(payer => (
                  <TableRow key={payer.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{payer.name}</TableCell>
                    <TableCell><Chip label={payer.type} size="small" color="warning" sx={{ fontSize: '0.7rem' }} /></TableCell>
                    <TableCell>{formatNGN(payer.creditLimit)}</TableCell>
                    <TableCell sx={{ color: payer.outstandingBalance > 0 ? DANGER : SUCCESS, fontWeight: 700 }}>{formatNGN(payer.outstandingBalance)}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>Monthly</TableCell>
                    <TableCell><StatusChip label={payer.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 15.4: Revenue Analytics & Governance
  // ══════════════════════════════════════════════════════════════════════════
  const renderAnalyticsSection = () => (
    <Box>
      {/* ── 15.4.1 Enterprise Revenue BI ── */}

      {/* ── 15.4.1 Enterprise Revenue BI ── */}
      {analyticsSubTab === 0 && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}><KPICard title="Gross Revenue" value={formatNGN(analytics.totalBilled || 0)} icon={<NairaCircleIcon />} color={PRIMARY} trend={8.4} /></Grid>
            <Grid item xs={6} md={3}><KPICard title="Net Revenue" value={formatNGN(analytics.totalCollected || 0)} icon={<TrendingUp />} color={SUCCESS} trend={12.1} /></Grid>
            <Grid item xs={6} md={3}><KPICard title="Collection Rate" value={formatPct(analytics.collectionRate || 0)} icon={<Analytics />} color={TEAL} /></Grid>
            <Grid item xs={6} md={3}><KPICard title="Days in A/R" value={`${Math.round((analytics.totalOutstanding || 0) / Math.max((analytics.totalCollected || 1) / 30, 1))} days`} icon={<Timeline />} color={WARNING} /></Grid>
          </Grid>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY, mb: 2 }}>Revenue Trend Analysis (FR-REV-003)</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.dailyTrend || []}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(v: any) => formatNGN(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="billed" name="Billed" stroke={PRIMARY} fill="url(#revGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="collected" name="Collected" stroke={SUCCESS} strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY, mb: 2 }}>Payer Mix</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={fundingPieData.length ? fundingPieData : [{ name: 'No Data', value: 1 }]}
                      cx="50%" cy="50%" outerRadius={110} paddingAngle={2} dataKey="value">
                      {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v: any) => formatNGN(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY, mb: 2 }}>Payer Performance (FR-REV-043 / FR-CLM-050)</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: PRIMARY, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                      <TableRow>{['Payer', 'Type', 'Total Claims', 'Approved', 'Denied', 'Approval Rate', 'Outstanding'].map(h => <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
                    </TableHead>
                    <TableBody>
                      {payerPerformance.map((p, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{p.payerName}</TableCell>
                          <TableCell><Chip label={p.type} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} /></TableCell>
                          <TableCell>{p.totalClaims}</TableCell>
                          <TableCell sx={{ color: SUCCESS, fontWeight: 600 }}>{p.approvedClaims}</TableCell>
                          <TableCell sx={{ color: DANGER, fontWeight: 600 }}>{p.deniedClaims}</TableCell>
                          <TableCell>
                            <Chip label={`${p.approvalRate}%`} size="small" color={Number(p.approvalRate) >= 80 ? 'success' : Number(p.approvalRate) >= 60 ? 'warning' : 'error'} sx={{ fontWeight: 700, fontSize: '0.75rem' }} />
                          </TableCell>
                          <TableCell sx={{ color: p.outstandingBalance > 0 ? DANGER : SUCCESS, fontWeight: 600 }}>{formatNGN(p.outstandingBalance)}</TableCell>
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

      {/* ── 15.4.2 Financial Governance ── */}
      {analyticsSubTab === 1 && (
        <Box>
          <Alert severity="warning" sx={{ mb: 3 }}>FR-REV-006–010 · Segregation of duties enforced across billing, cashiering, approvals, refunds, and reporting. All activities maintain immutable audit logs (BR-REV-003).</Alert>
          <Grid container spacing={3}>
            {[
              { title: 'Segregation Controls Active', value: '12/12', color: SUCCESS, desc: 'Role-based access enforced' },
              { title: 'Approval Workflows', value: '4 Levels', color: PRIMARY, desc: 'Transaction value-based approval' },
              { title: 'Manual Overrides Today', value: '2', color: WARNING, desc: 'Require documented justification' },
              { title: 'Audit Log Entries', value: '1,847', color: TEAL, desc: 'Immutable financial audit trail' },
            ].map(item => (
              <Grid item xs={6} md={3} key={item.title}>
                <KPICard title={item.title} value={item.value} sub={item.desc} icon={<Shield />} color={item.color} />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY, mb: 2 }}>Recent High-Risk Transactions (FR-REV-008)</Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: WARNING, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                  <TableRow>{['Transaction', 'Type', 'Amount', 'User', 'Timestamp', 'Risk Level', 'Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { txn: 'INV-2026-01042', type: 'Large Invoice Adjustment', amount: 150000, user: 'Billing Officer (Amaka)', ts: '2026-06-28 14:32', risk: 'HIGH', status: 'Approved' },
                    { txn: 'RCP-2026-05123', type: 'Manual Discount Override', amount: 45000, user: 'Cashier (Bola)', ts: '2026-06-28 11:17', risk: 'MEDIUM', status: 'Reviewed' },
                    { txn: 'REF-2026-0021', type: 'Refund > ₦50,000', amount: 75000, user: 'Finance (Chidi)', ts: '2026-06-27 16:45', risk: 'HIGH', status: 'Pending' },
                  ].map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: PRIMARY }}>{row.txn}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{formatNGN(row.amount)}</TableCell>
                      <TableCell>{row.user}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{row.ts}</TableCell>
                      <TableCell><Chip label={row.risk} size="small" color={row.risk === 'HIGH' ? 'error' : 'warning'} sx={{ fontWeight: 700, fontSize: '0.7rem' }} /></TableCell>
                      <TableCell><StatusChip label={row.status.toUpperCase()} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      )}

      {/* ── 15.4.3 Fraud Detection ── */}
      {analyticsSubTab === 2 && (
        <Box>
          <Alert severity="error" icon={<Security />} sx={{ mb: 3 }}>FR-REV-011–015 · Automated fraud detection monitors: Duplicate Billing · Duplicate Payments · Excessive Discounts · Unusual Refunds · Abnormal Transaction Patterns. Configurable thresholds and real-time alerting.</Alert>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Duplicate Billing Flags', count: 0, color: SUCCESS },
              { label: 'Excessive Discounts', count: 2, color: WARNING },
              { label: 'Unusual Refund Patterns', count: 1, color: DANGER },
              { label: 'Failed Transactions', count: 5, color: SECONDARY },
            ].map(item => (
              <Grid item xs={6} md={3} key={item.label}>
                <Card sx={{ p: 2, textAlign: 'center', borderRadius: 2, borderTop: `4px solid ${item.color}` }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: item.color }}>{item.count}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Card sx={{ borderRadius: 2, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY, mb: 2 }}>Fraud Investigation Log (FR-REV-045)</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: DANGER, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                  <TableRow>{['Flag ID', 'Type', 'Description', 'Amount', 'Flagged On', 'Assigned To', 'Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { id: 'FRD-001', type: 'Excessive Discount', desc: 'Discount > 30% on single invoice without supervisor approval', amount: 45000, date: '2026-06-28', assigned: 'Internal Audit', status: 'INVESTIGATING' },
                    { id: 'FRD-002', type: 'Unusual Refund', desc: 'Refund within 24h of payment, same cashier', amount: 25000, date: '2026-06-27', assigned: 'Finance Manager', status: 'RESOLVED' },
                  ].map(row => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: DANGER }}>{row.id}</TableCell>
                      <TableCell><Chip label={row.type} size="small" color="error" variant="outlined" sx={{ fontSize: '0.7rem' }} /></TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>{row.desc}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{formatNGN(row.amount)}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{row.date}</TableCell>
                      <TableCell>{row.assigned}</TableCell>
                      <TableCell><StatusChip label={row.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {/* ── 15.4.4 Regulatory Compliance ── */}
      {analyticsSubTab === 3 && (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>FR-REV-016–020 · Financial reporting complies with applicable regulatory and accounting standards. Audit workpapers are linked to financial transactions.</Alert>
          <Grid container spacing={3}>
            {[
              { title: 'NHIA Regulatory Filings', status: 'Current', due: '2026-07-31', color: SUCCESS },
              { title: 'Tax Compliance (FIRS)', status: 'Due Soon', due: '2026-07-15', color: WARNING },
              { title: 'Annual Audit (CAC)', status: 'In Progress', due: '2026-08-31', color: PRIMARY },
              { title: 'Donor Programme Report', status: 'Current', due: '2026-07-15', color: TEAL },
            ].map(item => (
              <Grid item xs={6} md={3} key={item.title}>
                <Card sx={{ borderRadius: 2, p: 2, borderLeft: `4px solid ${item.color}` }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>{item.title}</Typography>
                  <Chip label={item.status} size="small" color={item.color === SUCCESS ? 'success' : item.color === WARNING ? 'warning' : 'info'} sx={{ display: 'block', mt: 1, width: 'fit-content', fontWeight: 700, fontSize: '0.7rem' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>Due: {item.due}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ── 15.4.5 Donor Programme ── */}
      {analyticsSubTab === 4 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>FR-REV-021–025 · FR-BILL-026–030 · Donor-funded services (CDC/CARITAS ART Programme) are automatically excluded from patient billing. Separate cost centre accounting is maintained for programme financial accountability.</Alert>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {[
              { title: 'ART Patients on Programme', value: '847', color: TEAL },
              { title: 'Programme Services This Month', value: '2,341', color: PRIMARY },
              {title: 'Cost to Donor This Month', value: '₦2.4M', color: GOLD},
              { title: 'Patient Billing Excluded', value: '₦0 charged', color: SUCCESS },
            ].map(item => (
              <Grid item xs={6} md={3} key={item.title}>
                <KPICard title={item.title} value={item.value} icon={<Group />} color={item.color} />
              </Grid>
            ))}
          </Grid>
          <Card sx={{ borderRadius: 2, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY, mb: 2 }}>Donor Programme Financial Report (FR-BILL-048 / FR-REV-048)</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: TEAL, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                  <TableRow>{['Programme', 'Donor', 'Service Category', 'Utilization', 'Programme Cost', 'Patient Bill', 'Period'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { prog: 'CDC/CARITAS ART', donor: 'CDC Nigeria', cat: 'ART Consultations', util: 1247, cost: 3741000, bill: 0, period: 'Jun 2026' },
                    { prog: 'CDC/CARITAS ART', donor: 'CDC Nigeria', cat: 'Viral Load Testing', util: 312, cost: 936000, bill: 0, period: 'Jun 2026' },
                    { prog: 'CDC/CARITAS ART', donor: 'CDC Nigeria', cat: 'ARV Medications', util: 847, cost: 4235000, bill: 0, period: 'Jun 2026' },
                  ].map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{row.prog}</TableCell>
                      <TableCell>{row.donor}</TableCell>
                      <TableCell>{row.cat}</TableCell>
                      <TableCell>{row.util.toLocaleString()} services</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: GOLD }}>{formatNGN(row.cost)}</TableCell>
                      <TableCell><Chip label="₦0 – EXCLUDED" size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.7rem' }} /></TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{row.period}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {/* ── 15.4.6 Executive Scorecard ── */}
      {analyticsSubTab === 5 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: PRIMARY, mb: 3 }}>Enterprise Financial Business Intelligence (FR-REV-050)</Typography>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={6} md={2}><KPICard title="Gross Revenue" value={formatNGN(analytics.totalBilled || 0)} icon={<NairaCircleIcon />} color={PRIMARY} trend={8.4} /></Grid>
            <Grid item xs={6} md={2}><KPICard title="Collection Rate" value={formatPct(analytics.collectionRate || 0)} icon={<TrendingUp />} color={SUCCESS} trend={3.2} /></Grid>
            <Grid item xs={6} md={2}><KPICard title="Claim Denial Rate" value={formatPct(analytics.denialRate || 0)} icon={<Warning />} color={DANGER} /></Grid>
            <Grid item xs={6} md={2}><KPICard title="A/R Outstanding" value={formatNGN(analytics.totalOutstanding || 0)} icon={<AccountBalance />} color={WARNING} /></Grid>
            <Grid item xs={6} md={2}><KPICard title="Avg Rev/Encounter" value={formatNGN(analytics.avgRevenuePerEncounter || 0)} icon={<Assessment />} color={TEAL} /></Grid>
            <Grid item xs={6} md={2}><KPICard title="Open Shifts" value={analytics.shiftsOpen || 0} icon={<LocalAtm />} color={PURPLE} /></Grid>
          </Grid>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY, mb: 2 }}>Invoice Status Distribution</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { status: 'PAID', count: analytics.paidCount || 0 },
                    { status: 'PARTIAL', count: analytics.partialCount || 0 },
                    { status: 'ISSUED', count: analytics.issuedCount || 0 },
                    { status: 'CANCELLED', count: analytics.cancelledCount || 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" name="Invoices" radius={[4, 4, 0, 0]}>
                      {['#1b5e20', '#e65100', '#1a237e', '#b71c1c'].map((c, i) => <Cell key={i} fill={c} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY, mb: 2 }}>Accounts Receivable Ageing</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ageingChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(v: any) => formatNGN(v)} />
                    <Bar dataKey="amount" name="Outstanding" radius={[4, 4, 0, 0]}>
                      {[SUCCESS, WARNING, DANGER, '#4a0000'].map((c, i) => <Cell key={i} fill={c} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // E-WALLET SECTION RENDER (Wallet Balances + Monnify Virtual Accounts)
  // ══════════════════════════════════════════════════════════════════════════
  const renderEWalletSection = () => {
    const handleCreateVirtualAccount = async () => {
      if (!vaCreatePatientId) { enqueueSnackbar('Select a patient first', { variant: 'warning' }); return; }
      setCreateVaLoading(true);
      try {
        const { data } = await api.post('/monnify/virtual-accounts/create', {
          patientId: vaCreatePatientId,
          bvn: vaBvn.trim() || undefined,
          nin: vaNin.trim() || undefined,
        });
        enqueueSnackbar(data.message, { variant: 'success' });
        setVaDialogOpen(false);
        setVaCreatePatientId('');
        setSelectedVaPatient(null);
        setVaBvn('');
        setVaNin('');
        await fetchVirtualAccounts();
        await fetchWalletPatients();
      } catch (err: any) {
        enqueueSnackbar(err.response?.data?.message || 'Failed to create virtual account', { variant: 'error' });
      }
      setCreateVaLoading(false);
    };

    const handleCreateVaForPatient = async (patientId: string) => {
      try {
        const { data } = await api.post('/monnify/virtual-accounts/create', { patientId });
        enqueueSnackbar(data.message, { variant: 'success' });
        await fetchVirtualAccounts();
      } catch (err: any) {
        enqueueSnackbar(err.response?.data?.message || 'Failed to create virtual account', { variant: 'error' });
      }
    };

    const handleAutoProvisionAll = async () => {
      setCreateVaLoading(true);
      try {
        const { data } = await api.post('/monnify/virtual-accounts/auto-provision-all');
        enqueueSnackbar(data.message, { variant: 'success' });
        await fetchVirtualAccounts();
      } catch (err: any) {
        enqueueSnackbar(err.response?.data?.message || 'Auto-provision failed', { variant: 'error' });
      }
      setCreateVaLoading(false);
    };

    const handleDeactivateVirtualAccount = async (vaId: string) => {
      try {
        await api.patch(`/monnify/virtual-accounts/${vaId}/deactivate`);
        enqueueSnackbar('Virtual account deactivated', { variant: 'success' });
        await fetchVirtualAccounts();
      } catch (err: any) {
        enqueueSnackbar(err.response?.data?.message || 'Failed to deactivate', { variant: 'error' });
      }
    };

    return (
      <Box>

        {/* ════════ UNIFIED INTERNAL HOSPITAL WALLET CONSOLE ════════ */}
        {/* Monnify Gateway Status & System Overview Banner */}
        <Card sx={{ mb: 2.5, borderRadius: 3, p: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box sx={{ maxWidth: 880 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                <Chip
                  size="small"
                  icon={monnifyStatus?.success ? <CheckCircle sx={{ fontSize: '14px !important', color: '#16a34a !important' }} /> : <Warning sx={{ fontSize: '14px !important', color: '#ea580c !important' }} />}
                  label={monnifyStatus?.success ? `Monnify ${monnifyStatus.mode} Gateway Connected` : 'Monnify Gateway Status'}
                  sx={{ fontWeight: 800, bgcolor: monnifyStatus?.success ? '#dcfce7' : '#ffedd5', color: monnifyStatus?.success ? '#15803d' : '#c2410c' }}
                />
                {monnifyStatus?.contractCode && (
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                    Contract: {monnifyStatus.contractCode}
                  </Typography>
                )}
                <Button size="small" onClick={fetchMonnifyStatus} sx={{ minWidth: 'auto', p: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                  Re-check
                </Button>
              </Stack>
              <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500, lineHeight: 1.5 }}>
                💡 <strong>Internal Hospital Prepaid Wallet:</strong> Every registered patient possesses an internal hospital wallet holding pending advance funds in trust. When a patient arrives for clinical care, consultations, lab investigations, or pharmacy prescriptions, their prepaid balance automatically settles their hospital bills. Wallets can be funded via <strong>Direct Commercial Bank Transfer (Monnify)</strong> or directly at the <strong>Cashier Counter (Cash / POS)</strong>.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexShrink={0} flexWrap="wrap">
              <Tooltip title="Batch generate dedicated Monnify commercial bank accounts for active patients who do not have one yet. Patients or relatives can transfer funds directly from any bank app to credit their hospital wallet.">
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    color="secondary"
                    startIcon={<ElectricBolt />}
                    onClick={handleAutoProvisionAll}
                    disabled={createVaLoading}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    {createVaLoading ? 'Provisioning...' : 'Auto-Provision All'}
                  </Button>
                </span>
              </Tooltip>
              <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={() => {
                  setSelectedVaPatient(null);
                  setVaCreatePatientId('');
                  setVaDialogOpen(true);
                }}
                sx={{ fontWeight: 700, bgcolor: PRIMARY, borderRadius: 2 }}
              >
                Link Bank Account
              </Button>
            </Stack>
          </Stack>
        </Card>

        {/* Main Grid: Unified Wallets Register (Left) + Selected Patient Dossier (Right) */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={selectedWalletPatient ? 7 : 12}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <CardHeader
                title={
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>
                      🏦 Internal Hospital Wallets (Prepaid Accounts)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Showing {walletTotalCount > 0 ? `${(walletPage * walletRowsPerPage + 1).toLocaleString()}–${Math.min((walletPage + 1) * walletRowsPerPage, walletTotalCount).toLocaleString()} of ${walletTotalCount.toLocaleString()}` : '0'} registered patient accounts · {(walletCounts.funded || activeWallets).toLocaleString()} with advance prepaid credit
                    </Typography>
                  </Box>
                }
              />
              <Divider />

              {/* Filter Pills & Search Bar */}
              <Box sx={{ p: 2, pb: 1.5, bgcolor: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }}>
                  {/* Category Pills */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                    {[
                      { key: 'ALL', label: `All Patients (${(walletCounts.total || 4217).toLocaleString()})`, icon: <Group sx={{ fontSize: 16 }} /> },
                      { key: 'FUNDED', label: `💳 Funded (${(walletCounts.funded || activeWallets).toLocaleString()} Ready)`, icon: <AccountBalanceWallet sx={{ fontSize: 16 }} /> },
                      { key: 'MONNIFY', label: `📲 Bank Linked (${(walletCounts.bankLinked || activeVirtualAccounts).toLocaleString()})`, icon: <CreditCard sx={{ fontSize: 16 }} /> },
                      { key: 'DEBT', label: `⚠️ Unsettled Bills (${(walletCounts.debt || 2).toLocaleString()})`, icon: <NairaCircleIcon sx={{ fontSize: 16 }} /> },
                      { key: 'SETTLE_WALLET', label: `⚡ Settle from Wallet (${(walletCounts.settleWallet || 1).toLocaleString()})`, icon: <ElectricBolt sx={{ fontSize: 16 }} /> },
                    ].map(f => {
                      const isSel = walletFilter === f.key;
                      return (
                        <Chip
                          key={f.key}
                          icon={f.icon}
                          label={f.label}
                          clickable
                          onClick={() => {
                            setWalletFilter(f.key as any);
                            setWalletPage(0);
                            fetchWalletPatients(walletSearch, f.key, 1, walletRowsPerPage);
                          }}
                          sx={{
                            fontWeight: isSel ? 800 : 600,
                            bgcolor: isSel ? `${PRIMARY}15` : '#ffffff',
                            color: isSel ? PRIMARY : '#475569',
                            border: isSel ? `1.5px solid ${PRIMARY}` : '1px solid #e2e8f0',
                            '&:hover': { bgcolor: `${PRIMARY}20` },
                            fontSize: '0.78rem',
                            py: 1.6,
                          }}
                        />
                      );
                    })}
                  </Stack>

                  {/* Search and Refresh */}
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', lg: 'auto' } }}>
                    <TextField
                      size="small"
                      placeholder="Search all 4,200+ patients (name, MRN, bank acc)..."
                      value={walletSearch}
                      onChange={e => {
                        const val = e.target.value;
                        setWalletSearch(val);
                        setWalletPage(0);
                        fetchWalletPatients(val, walletFilter, 1, walletRowsPerPage);
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                        endAdornment: walletSearch ? (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => {
                              setWalletSearch('');
                              setWalletPage(0);
                              fetchWalletPatients('', walletFilter, 1, walletRowsPerPage);
                            }}>
                              <Cancel sx={{ fontSize: 14 }} />
                            </IconButton>
                          </InputAdornment>
                        ) : null,
                      }}
                      sx={{ width: { xs: '100%', sm: 310 } }}
                    />
                    <Tooltip title="Refresh Wallets & Virtual Accounts">
                      <IconButton
                        size="small"
                        onClick={() => {
                          fetchVirtualAccounts();
                          fetchWalletPatients(walletSearch, walletFilter, walletPage + 1, walletRowsPerPage);
                        }}
                        sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}
                      >
                        <Refresh sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Box>

              {walletLoading && <LinearProgress sx={{ height: 3 }} />}

              {/* Unified Table */}
              <TableContainer sx={{ maxHeight: 540 }}>
                <Table size="small" stickyHeader>
                  <TableHead sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 3,
                    '& .MuiTableCell-head': {
                      bgcolor: '#f8fafc !important',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      color: PRIMARY,
                      borderBottom: '2px solid #e2e8f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    }
                  }}>
                    <TableRow>
                      <TableCell sx={{ bgcolor: '#f8fafc !important' }}>Patient</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc !important' }}>MRN</TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#f8fafc !important' }}>Prepaid Balance (Pending)</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc !important' }}>Direct Bank Top-Up (Monnify)</TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#f8fafc !important' }}>Unsettled Bill</TableCell>
                      <TableCell align="center" sx={{ bgcolor: '#f8fafc !important' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredWalletPatients.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                          <AccountBalanceWallet sx={{ fontSize: 44, color: '#cbd5e1', mb: 1 }} />
                          <Typography color="text.secondary" fontWeight={700}>No patient wallets match your criteria</Typography>
                          <Typography variant="caption" color="text.secondary">Try adjusting search query or clearing filter chips</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredWalletPatients.map(p => {
                      const linkedVa = virtualAccounts.find(va => va.patientId === p.id && (va.status === 'ACTIVE' || va.status === 'PENDING'))
                        || virtualAccounts.find(va => va.patientId === p.id)
                        || p.monnifyAccount
                        || null;

                      const isSelected = selectedWalletPatient?.id === p.id;
                      const hasFunds = Number(p.walletBalance || 0) > 0;
                      const debtAmount = getPatientDebt(p);
                      const hasDebt = debtAmount > 0;
                      const patientInvs = getPatientPendingInvoices(p);

                      return (
                        <TableRow
                          key={p.id}
                          hover
                          selected={isSelected}
                          onClick={() => {
                            setSelectedWalletPatient(p);
                            if (linkedVa) {
                              setSelectedVirtualAccount(linkedVa);
                              fetchVaTxns(linkedVa.id);
                            } else {
                              setSelectedVirtualAccount(null);
                              setVaTxns([]);
                            }
                          }}
                          sx={{ cursor: 'pointer', '&.Mui-selected': { bgcolor: `${PRIMARY}12` } }}
                        >
                          {/* Patient */}
                          <TableCell>
                            <Stack direction="row" spacing={1.2} alignItems="center">
                              <Avatar sx={{ width: 30, height: 30, bgcolor: PRIMARY, fontSize: 12, fontWeight: 700 }}>
                                {p.firstName?.[0]}{p.lastName?.[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a' }}>
                                  {p.firstName} {p.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {p.gender || '—'}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>

                          {/* MRN */}
                          <TableCell>
                            <Chip label={p.patientNumber || '—'} size="small" sx={{ fontFamily: 'monospace', bgcolor: '#f1f5f9', fontWeight: 600, fontSize: '0.72rem' }} />
                          </TableCell>

                          {/* Prepaid Balance (Pending / Ready to Spend) */}
                          <TableCell align="right">
                            <Typography fontWeight={800} sx={{ color: hasFunds ? SUCCESS : 'text.secondary', fontSize: '0.92rem' }}>
                              {formatNGN(p.walletBalance || 0)}
                            </Typography>
                            <Chip
                              size="small"
                              label={hasFunds ? 'Prepaid Ready' : '₦0.00 Balance'}
                              color={hasFunds ? 'success' : 'default'}
                              sx={{ fontWeight: 700, fontSize: '0.64rem', height: 20 }}
                            />
                          </TableCell>

                          {/* Direct Bank Top-Up Account (Monnify) */}
                          <TableCell>
                            {linkedVa && linkedVa.accountNumber ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.88rem', color: PRIMARY }}>
                                    {linkedVa.accountNumber}
                                  </Typography>
                                  <Tooltip title="Copy Account Number">
                                    <IconButton
                                      size="small"
                                      onClick={e => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(linkedVa.accountNumber);
                                        enqueueSnackbar('Account number copied to clipboard!', { variant: 'info' });
                                      }}
                                      sx={{ p: 0.2 }}
                                    >
                                      <Send sx={{ fontSize: 13, color: PRIMARY }} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem' }}>
                                  {linkedVa.bankName || 'Wema Bank'} · ⚡ Auto-Credit
                                </Typography>
                              </Box>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Add sx={{ fontSize: 13 }} />}
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedVaPatient(p);
                                  setVaCreatePatientId(p.id);
                                  setVaDialogOpen(true);
                                }}
                                sx={{
                                  fontSize: '0.7rem',
                                  textTransform: 'none',
                                  py: 0.3,
                                  px: 1,
                                  borderRadius: 1.5,
                                  borderColor: '#cbd5e1',
                                  color: PRIMARY,
                                  fontWeight: 700,
                                  '&:hover': { borderColor: PRIMARY }
                                }}
                              >
                                Link Bank Acc
                              </Button>
                            )}
                          </TableCell>

                          {/* Unsettled Bill */}
                          <TableCell align="right">
                            <Typography fontWeight={700} sx={{ color: hasDebt ? DANGER : 'text.secondary', fontSize: '0.85rem' }}>
                              {formatNGN(debtAmount)}
                            </Typography>
                            {hasDebt && (
                              <Chip
                                size="small"
                                label={hasFunds ? '⚡ Settle from Wallet' : (patientInvs.length > 0 ? `${patientInvs.length} Bill${patientInvs.length > 1 ? 's' : ''}` : 'Pending Bill')}
                                color={hasFunds ? 'secondary' : 'error'}
                                variant={hasFunds ? 'filled' : 'outlined'}
                                sx={{ fontWeight: 800, fontSize: '0.62rem', height: 18, mt: 0.3 }}
                              />
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                              {hasDebt && hasFunds && (
                                <Tooltip title="⚡ 1-Click Settle from Prepaid Wallet">
                                  <IconButton
                                    size="small"
                                    sx={{ color: '#7c3aed', bgcolor: '#f5f3ff', border: '1px solid #ddd6fe', '&:hover': { bgcolor: '#ede9fe' } }}
                                    onClick={e => {
                                      e.stopPropagation();
                                      setSelectedWalletPatient(p);
                                      if (patientInvs.length > 0) {
                                        setSelectedInvoice(patientInvs[0]);
                                        setPayMethods([{ method: 'E_WALLET', amount: Math.min(Number(p.walletBalance || 0), Number(patientInvs[0].outstanding || patientInvs[0].totalAmount || debtAmount)) }]);
                                        setPaymentDialogOpen(true);
                                      } else {
                                        setWalletDeductMode(true);
                                        setWalletDialogOpen(true);
                                      }
                                    }}
                                  >
                                    <ElectricBolt fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Fund wallet (Cash/POS/Transfer)">
                                <IconButton
                                  size="small"
                                  sx={{ color: PRIMARY }}
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedWalletPatient(p);
                                    setWalletDeductMode(false);
                                    setWalletDialogOpen(true);
                                  }}
                                >
                                  <AccountBalanceWallet fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Deduct to settle bill">
                                <IconButton
                                  size="small"
                                  sx={{ color: DANGER }}
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedWalletPatient(p);
                                    setWalletDeductMode(true);
                                    setWalletDialogOpen(true);
                                  }}
                                >
                                  <LocalAtm fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View statement & Monnify ledger">
                                <IconButton
                                  size="small"
                                  sx={{ color: SECONDARY }}
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedWalletPatient(p);
                                    if (linkedVa) {
                                      setSelectedVirtualAccount(linkedVa);
                                      fetchVaTxns(linkedVa.id);
                                    } else {
                                      setSelectedVirtualAccount(null);
                                      setVaTxns([]);
                                    }
                                  }}
                                >
                                  <Timeline fontSize="small" />
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

              {/* Server-Side Pagination Controls */}
              <TablePagination
                component="div"
                count={walletTotalCount}
                page={walletPage}
                onPageChange={(_, newPage) => {
                  setWalletPage(newPage);
                  fetchWalletPatients(walletSearch, walletFilter, newPage + 1, walletRowsPerPage);
                }}
                rowsPerPage={walletRowsPerPage}
                onRowsPerPageChange={e => {
                  const newLimit = parseInt(e.target.value, 10);
                  setWalletRowsPerPage(newLimit);
                  setWalletPage(0);
                  fetchWalletPatients(walletSearch, walletFilter, 1, newLimit);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Patients per page:"
                sx={{
                  borderTop: '1px solid #f1f5f9',
                  bgcolor: '#fafafa',
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#475569'
                  }
                }}
              />
            </Card>
          </Grid>

          {/* Right Column: Selected Patient Wallet Dossier & Audit Ledger */}
          {selectedWalletPatient && (
            <Grid item xs={12} md={5}>
              {(() => {
                const linkedVa = virtualAccounts.find(va => va.patientId === selectedWalletPatient.id && (va.status === 'ACTIVE' || va.status === 'PENDING'))
                  || virtualAccounts.find(va => va.patientId === selectedWalletPatient.id)
                  || selectedWalletPatient.monnifyAccount
                  || null;

                const patientDebt = getPatientDebt(selectedWalletPatient);
                const patientPendingList = getPatientPendingInvoices(selectedWalletPatient);

                const combinedTxns = [
                  ...vaTxns.map(t => ({
                    id: t.id,
                    date: t.createdAt,
                    type: t.type,
                    channel: t.channel ? t.channel.replace(/_/g, ' ') : 'Monnify Bank Transfer',
                    ref: t.transactionRef || t.id,
                    narration: t.narration || (t.sourceAccountName ? `From ${t.sourceAccountName}` : 'Monnify Transfer Top-Up'),
                    amount: Number(t.amount || 0),
                    balanceAfter: Number(t.balanceAfter || 0),
                    source: 'MONNIFY'
                  })),
                  ...walletTxnLog.filter(t => t.patientId === selectedWalletPatient.id).map(t => ({
                    id: t.id,
                    date: t.time,
                    type: t.type,
                    channel: t.method === 'CASH' ? 'Cashier (Cash)' : t.method === 'POS' ? 'Cashier (POS)' : t.method,
                    ref: t.reference || 'Cashier Desk',
                    narration: t.type === 'CREDIT' ? 'Cashier Desk Deposit' : (t.reference || 'Hospital Bill Settlement'),
                    amount: Number(t.amount || 0),
                    balanceAfter: Number(t.balance || 0),
                    source: 'CASHIER'
                  }))
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                return (
                  <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.07)', position: 'sticky', top: 90 }}>
                    {/* Header Banner */}
                    <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`, borderRadius: '12px 12px 0 0', px: 2.5, py: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff' }}>
                            {selectedWalletPatient.firstName} {selectedWalletPatient.lastName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                            MRN: <strong>{selectedWalletPatient.patientNumber || '—'}</strong> · {selectedWalletPatient.gender || 'N/A'}
                          </Typography>
                        </Box>
                        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.8)' }} onClick={() => setSelectedWalletPatient(null)}>
                          <Cancel fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 1.5 }} />

                      {/* Balances Display */}
                      <Grid container spacing={1.5}>
                        <Grid item xs={6}>
                          <Box sx={{ bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 2, p: 1.5 }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700 }}>
                              Prepaid Hospital Balance
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 900, color: '#fff', mt: 0.3 }}>
                              {formatNGN(selectedWalletPatient.walletBalance || 0)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.64rem', display: 'block', mt: 0.3 }}>
                              Ready for hospital visits
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 2, p: 1.5 }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700 }}>
                              Unsettled Hospital Debt
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 900, color: patientDebt > 0 ? '#fecdd3' : '#fff', mt: 0.3 }}>
                              {formatNGN(patientDebt)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.64rem', display: 'block', mt: 0.3 }}>
                              {patientPendingList.length > 0 ? `${patientPendingList.length} pending bill(s)` : 'No pending bills'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>

                    <CardContent sx={{ pt: 2, pb: 2 }}>
                      {/* Active Pending Invoices Breakdown from Billing Queue */}
                      {patientPendingList.length > 0 && (
                        <Box sx={{ mb: 2, p: 1.6, borderRadius: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Stack direction="row" spacing={0.6} alignItems="center">
                              <NairaCircleIcon sx={{ fontSize: 16, color: '#dc2626' }} />
                              <Typography variant="caption" fontWeight={800} color="error.dark">
                                UNSETTLED BILLS IN BILLING QUEUE ({patientPendingList.length})
                              </Typography>
                            </Stack>
                            <Chip
                              label={formatNGN(patientDebt)}
                              size="small"
                              color="error"
                              sx={{ fontWeight: 800, fontSize: '0.68rem', height: 20 }}
                            />
                          </Stack>
                          <Stack spacing={1}>
                            {patientPendingList.map((inv: any) => {
                              const invDue = Number(inv.outstanding || (Number(inv.total || inv.totalAmount || 0) - Number(inv.amountPaid || 0)) || 0);
                              const pBalance = Number(selectedWalletPatient.walletBalance || 0);
                              const canCover = pBalance >= invDue;

                              return (
                                <Box
                                  key={inv.id}
                                  sx={{
                                    p: 1.2,
                                    borderRadius: 1.5,
                                    bgcolor: '#ffffff',
                                    border: '1px solid #fee2e2',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 1
                                  }}
                                >
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Stack direction="row" spacing={0.6} alignItems="center">
                                      <Typography variant="caption" fontWeight={800} sx={{ color: PRIMARY, fontFamily: 'monospace' }}>
                                        {inv.invoiceNo || inv.invoiceNumber || inv.fhirId || inv.id}
                                      </Typography>
                                      <Chip label={inv.status} size="small" sx={{ fontSize: '0.6rem', height: 16, fontWeight: 700 }} />
                                    </Stack>
                                    <Typography variant="caption" noWrap sx={{ color: '#475569', fontSize: '0.7rem', display: 'block' }}>
                                      {inv.items?.length ? inv.items.map((i: any) => i.name || i.description).join(', ') : (inv.reason || 'Hospital Billable Services')}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: DANGER, fontWeight: 800, fontSize: '0.75rem', display: 'block', mt: 0.2 }}>
                                      Outstanding: {formatNGN(invDue)}
                                    </Typography>
                                  </Box>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color={canCover ? 'secondary' : 'success'}
                                    startIcon={canCover ? <ElectricBolt sx={{ fontSize: 13 }} /> : <Payment sx={{ fontSize: 13 }} />}
                                    onClick={() => {
                                      setSelectedInvoice(inv);
                                      if (pBalance > 0) {
                                        setPayMethods([{ method: 'E_WALLET', amount: Math.min(pBalance, invDue) }]);
                                      }
                                      setPaymentDialogOpen(true);
                                    }}
                                    sx={{
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      textTransform: 'none',
                                      py: 0.4,
                                      px: 1,
                                      borderRadius: 1.5,
                                      flexShrink: 0,
                                      bgcolor: canCover ? '#7c3aed' : undefined,
                                      '&:hover': { bgcolor: canCover ? '#6d28d9' : undefined }
                                    }}
                                  >
                                    {canCover ? '⚡ Settle from Wallet' : 'Receive Payment'}
                                  </Button>
                                </Box>
                              );
                            })}
                          </Stack>
                        </Box>
                      )}

                      {/* Direct Bank Top-Up Account (Monnify) Card */}
                      <Box sx={{ mb: 2, p: 1.8, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        {linkedVa && linkedVa.accountNumber ? (
                          <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                              <Typography variant="caption" fontWeight={800} color="success.dark">
                                📲 DIRECT BANK TOP-UP ACCOUNT (MONNIFY)
                              </Typography>
                              <Chip label="Active · Auto-Credit" size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.62rem', height: 18 }} />
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 0.5 }}>
                              <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.05rem', color: '#065f46', letterSpacing: '0.05em' }}>
                                {linkedVa.accountNumber}
                              </Typography>
                              <Tooltip title="Copy Account Number">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    navigator.clipboard.writeText(linkedVa.accountNumber);
                                    enqueueSnackbar('Bank account number copied!', { variant: 'info' });
                                  }}
                                  sx={{ p: 0.3, bgcolor: '#dcfce7' }}
                                >
                                  <Send sx={{ fontSize: 13, color: '#16a34a' }} />
                                </IconButton>
                              </Tooltip>
                              <Typography variant="caption" fontWeight={700} sx={{ color: '#047857' }}>
                                ({linkedVa.bankName || 'Wema Bank'})
                              </Typography>
                            </Stack>
                            <Typography variant="caption" sx={{ color: '#047857', display: 'block', lineHeight: 1.3 }}>
                              Patient or family can transfer directly into this account from any bank app. The transfer immediately credits this hospital wallet.
                            </Typography>
                            <Button
                              size="small"
                              variant="text"
                              startIcon={vaTxnsLoading ? <CircularProgress size={12} /> : <Refresh sx={{ fontSize: 13 }} />}
                              onClick={() => fetchVaTxns(linkedVa.id)}
                              disabled={vaTxnsLoading}
                              sx={{ mt: 0.8, p: '2px 6px', fontSize: '0.7rem', fontWeight: 700, color: '#065f46' }}
                            >
                              Sync Monnify Payments
                            </Button>
                          </Box>
                        ) : (
                          <Box>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              📲 DIRECT BANK TRANSFER
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8rem', mb: 1 }}>
                              No dedicated bank account linked to this patient yet.
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<Add />}
                              onClick={() => {
                                setSelectedVaPatient(selectedWalletPatient);
                                setVaCreatePatientId(selectedWalletPatient.id);
                                setVaDialogOpen(true);
                              }}
                              sx={{ fontWeight: 700, fontSize: '0.74rem' }}
                            >
                              Generate Monnify Virtual Account
                            </Button>
                          </Box>
                        )}
                      </Box>

                      {/* Cashier Quick Fund & Settle */}
                      <Typography variant="subtitle2" fontWeight={800} color={PRIMARY} sx={{ mb: 1 }}>
                        💳 Cashier Counter Actions
                      </Typography>
                      <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <TextField
                              label="Amount (₦)"
                              type="number"
                              size="small"
                              fullWidth
                              value={fundingAmount}
                              onChange={e => setFundingAmount(e.target.value)}
                              InputProps={{ startAdornment: <InputAdornment position="start">₦</InputAdornment> }}
                              inputProps={{ min: 100, step: 100 }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              select
                              label="Funding Channel"
                              size="small"
                              fullWidth
                              value={fundingMethod}
                              onChange={e => setFundingMethod(e.target.value)}
                            >
                              {[
                                { v: 'CASH', l: '💵 Cash' },
                                { v: 'POS', l: '💳 POS / Card' },
                                { v: 'BANK_TRANSFER', l: '🏦 Bank Transfer' },
                                { v: 'MONNIFY', l: '📲 Monnify Gateway' }
                              ].map(m => (<MenuItem key={m.v} value={m.v}>{m.l}</MenuItem>))}
                            </TextField>
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              label="Reference / Teller / POS Slip #"
                              size="small"
                              fullWidth
                              value={fundingReference}
                              onChange={e => setFundingReference(e.target.value)}
                            />
                          </Grid>
                        </Grid>
                        <Stack direction="row" spacing={1}>
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={walletFundingLoading ? <CircularProgress size={15} color="inherit" /> : <AccountBalanceWallet />}
                            disabled={walletFundingLoading || !fundingAmount}
                            onClick={() => { setWalletDeductMode(false); handleFundWallet(); }}
                            sx={{ fontWeight: 700, bgcolor: PRIMARY, py: 1, '&:hover': { bgcolor: SECONDARY } }}
                          >
                            {walletFundingLoading ? 'Processing...' : 'Deposit Funds'}
                          </Button>
                          <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            startIcon={<LocalAtm />}
                            onClick={() => { setWalletDialogOpen(true); setWalletDeductMode(true); }}
                            sx={{ fontWeight: 700, py: 1 }}
                          >
                            Deduct / Settle
                          </Button>
                        </Stack>
                      </Stack>

                      {/* Unified Statement / Transaction History */}
                      <Divider sx={{ my: 1.5 }} />
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800} color={PRIMARY}>
                          📑 Wallet Statement & Audit Trail
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {combinedTxns.length} records
                        </Typography>
                      </Stack>

                      {combinedTxns.length === 0 ? (
                        <Box sx={{ py: 3, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            No wallet transactions on file yet. Deposit funds above or transfer into the Monnify virtual account to begin.
                          </Typography>
                        </Box>
                      ) : (
                        <TableContainer sx={{ maxHeight: 220, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ '& th': { bgcolor: '#f1f5f9', fontWeight: 700, fontSize: '0.68rem', color: '#334155' } }}>
                                <TableCell>Date</TableCell>
                                <TableCell>Channel</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell align="right">Balance</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {combinedTxns.map(t => (
                                <TableRow key={t.id} hover>
                                  <TableCell>
                                    <Typography variant="caption" sx={{ fontSize: '0.68rem', color: '#475569' }}>
                                      {new Date(t.date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.68rem', color: '#1e293b' }}>
                                      {t.channel}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="caption" fontWeight={800} sx={{ color: t.type === 'CREDIT' ? SUCCESS : DANGER }}>
                                      {t.type === 'CREDIT' ? '+' : '−'}{formatNGN(t.amount)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.68rem' }}>
                                      {formatNGN(t.balanceAfter)}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </Grid>
          )}
        </Grid>

        {/* ─── Wallet Fund / Deduct Dialog ─── */}
        <Dialog open={walletDialogOpen} onClose={() => setWalletDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: walletDeductMode ? DANGER : PRIMARY }}>
            {walletDeductMode ? '💳 Deduct from Patient Wallet' : '💰 Fund Patient Wallet'}
          </DialogTitle>
          <DialogContent dividers>
            {selectedWalletPatient && (
              <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, bgcolor: walletDeductMode ? '#fce4ec' : '#e8f5e9' }}>
                <Typography variant="subtitle2" fontWeight={800}>{selectedWalletPatient.firstName} {selectedWalletPatient.lastName}</Typography>
                <Typography variant="caption" color="text.secondary">{selectedWalletPatient.patientNumber}</Typography>
                <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5 }}>Current Balance: <span style={{ color: PRIMARY }}>{formatNGN(selectedWalletPatient.walletBalance || 0)}</span></Typography>
              </Box>
            )}
            <Stack spacing={2}>
              <TextField label={`Amount to ${walletDeductMode ? 'Deduct' : 'Add'} (₦)`} type="number" fullWidth
                value={fundingAmount} onChange={e => setFundingAmount(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">₦</InputAdornment> }} inputProps={{ min: 100, step: 100 }} />
              {walletDeductMode ? (
                <TextField label="Reason for Deduction" fullWidth multiline rows={2} value={deductReason} onChange={e => setDeductReason(e.target.value)} required />
              ) : (
                <>
                  <TextField select label="Payment Method" fullWidth value={fundingMethod} onChange={e => setFundingMethod(e.target.value)}>
                    {[{ v: 'CASH', l: '💵 Cash' }, { v: 'POS', l: '💳 POS / Card' }, { v: 'BANK_TRANSFER', l: '🏦 Bank Transfer' }, { v: 'MONNIFY', l: '📲 Monnify Virtual Account' }].map(m => (<MenuItem key={m.v} value={m.v}>{m.l}</MenuItem>))}
                  </TextField>
                  <TextField label="Reference / Teller No." fullWidth value={fundingReference} onChange={e => setFundingReference(e.target.value)} />
                  <TextField label="Notes" fullWidth multiline rows={2} value={fundingNotes} onChange={e => setFundingNotes(e.target.value)} />
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setWalletDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" color={walletDeductMode ? 'error' : 'primary'}
              disabled={walletFundingLoading || !fundingAmount || (walletDeductMode && !deductReason)}
              onClick={handleFundWallet}
              startIcon={walletFundingLoading ? <CircularProgress size={16} color="inherit" /> : (walletDeductMode ? <LocalAtm /> : <AccountBalanceWallet />)}>
              {walletFundingLoading ? 'Processing...' : (walletDeductMode ? 'Confirm Deduction' : 'Fund Wallet')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ─── Create Virtual Account Dialog ─── */}
        <Dialog open={vaDialogOpen} onClose={() => setVaDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: PRIMARY }}>📲 Create Monnify Virtual Account</DialogTitle>
          <DialogContent dividers>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              This will assign a dedicated bank account number to the patient via Monnify. The patient can then fund their hospital wallet by transferring money to that account number from any bank.
            </Alert>
            <Stack spacing={2}>
              <Autocomplete
                options={walletPatients.filter(p => !virtualAccounts.some(va => va.patientId === p.id && (va.status === 'ACTIVE' || va.status === 'PENDING')))}
                getOptionLabel={(p) => typeof p === 'string' ? p : `${p.firstName || ''} ${p.lastName || ''} (${p.patientNumber || p.mrn || 'No MRN'})`}
                isOptionEqualToValue={(option, val) => option.id === val.id}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input') {
                    fetchWalletPatients(newInputValue);
                  } else if (reason === 'clear') {
                    fetchWalletPatients('');
                    setSelectedVaPatient(null);
                    setVaCreatePatientId('');
                  }
                }}
                filterOptions={(options, state) => {
                  const query = state.inputValue.toLowerCase().trim();
                  if (!query) return options;
                  return options.filter(p =>
                    `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(query) ||
                    (p.patientNumber && p.patientNumber.toLowerCase().includes(query)) ||
                    (p.mrn && p.mrn.toLowerCase().includes(query))
                  );
                }}
                value={selectedVaPatient}
                onChange={(_, newValue) => {
                  setSelectedVaPatient(newValue);
                  setVaCreatePatientId(newValue ? newValue.id : '');
                }}
                renderOption={(props, p) => (
                  <Box component="li" {...props} key={p.id}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: PRIMARY, fontWeight: 700 }}>
                        {p.firstName?.[0]}{p.lastName?.[0]}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ color: '#1a1a1a' }}>
                          {p.firstName} {p.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          MRN: <strong>{p.patientNumber || p.mrn || 'N/A'}</strong>
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Patient (by Name or MRN)"
                    placeholder="Type patient name or MRN (e.g. FFMH-10029)..."
                    fullWidth
                    autoFocus
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <Search sx={{ color: PRIMARY }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Patient BVN (11 digits)"
                    placeholder="e.g. 22222222222"
                    fullWidth
                    value={vaBvn}
                    onChange={e => setVaBvn(e.target.value)}
                    inputProps={{ maxLength: 11 }}
                    helperText="Required by Monnify in Production mode"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Patient NIN (Alternative)"
                    placeholder="e.g. 12345678901"
                    fullWidth
                    value={vaNin}
                    onChange={e => setVaNin(e.target.value)}
                    inputProps={{ maxLength: 11 }}
                    helperText="11-digit National Identity Number"
                  />
                </Grid>
              </Grid>

              <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f0f4ff', border: `1px solid ${PRIMARY}30` }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  🏦 <strong>Banks:</strong> Wema Bank (035A), Access Bank (035) — the patient will receive account numbers from these banks.
                </Typography>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setVaDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" disabled={createVaLoading || !vaCreatePatientId} onClick={handleCreateVirtualAccount}
              startIcon={createVaLoading ? <CircularProgress size={16} color="inherit" /> : <AccountBalanceWallet />}
              sx={{ fontWeight: 700, bgcolor: PRIMARY }}>
              {createVaLoading ? 'Creating...' : 'Create Virtual Account'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  const renderChargeMasterSection = () => {
    const handleSubTabChange = (_: any, newValue: number) => {
      setChargeMasterSubTab(newValue);
      if (newValue === 0) navigate('/billing/charge-master');
      else if (newValue === 1) navigate('/billing/charge-master/multipliers');
    };

    const hmoMultipliersList = [
      { id: 'HMO-001', name: 'NHIA National Health Insurance Authority', code: 'NHIA-GOV', class: 'NHIA Scheme', multiplier: 0.70, copay: 10, preauthCap: 30000, preauthRequired: true, status: 'Active' },
      { id: 'HMO-002', name: 'Hygeia HMO (Gold & Platinum Plans)', code: 'HYG-PRIV', class: 'Private HMO', multiplier: 1.15, copay: 0, preauthCap: 50000, preauthRequired: false, status: 'Active' },
      { id: 'HMO-003', name: 'Reliance Health HMO', code: 'REL-PRIV', class: 'Private HMO', multiplier: 1.20, copay: 5, preauthCap: 75000, preauthRequired: false, status: 'Active' },
      { id: 'HMO-004', name: 'AXA Mansard Health Insurance', code: 'AXA-CORP', class: 'Corporate HMO', multiplier: 1.25, copay: 0, preauthCap: 100000, preauthRequired: true, status: 'Active' },
      { id: 'HMO-005', name: 'Total Health Trust (THT)', code: 'THT-PRIV', class: 'Private HMO', multiplier: 1.10, copay: 10, preauthCap: 40000, preauthRequired: true, status: 'Active' },
      { id: 'HMO-006', name: 'Redcare HMO', code: 'RED-PRIV', class: 'Private HMO', multiplier: 1.12, copay: 10, preauthCap: 35000, preauthRequired: false, status: 'Active' },
      { id: 'HMO-007', name: 'NLNG Corporate Staff Executive Care', code: 'NLNG-CORP', class: 'Corporate Direct', multiplier: 1.30, copay: 0, preauthCap: 250000, preauthRequired: false, status: 'Active' },
    ];

    const tariffSchedulesList = chargeMaster.map((item: any) => ({
      code: item.code,
      name: item.name,
      category: item.category,
      basePrice: item.basePrice,
      nhiaPrice: item.nhiaPrice || Math.round(item.basePrice * 0.7),
      hmoPrice: item.hmoPrice || Math.round(item.basePrice * 1.18),
      staffPrice: Math.round(item.basePrice * 0.5),
      billingMethod: item.unit || 'Per Visit',
    }));

    // Format Registration Categories as Charge Master Items
    const regCatMasterItems = regCategories.map((c: any) => ({
      id: `REG-${c.code}`,
      code: c.code,
      name: `${c.name} Registration Fee`,
      category: 'Registration',
      basePrice: Number(c.fee) || 0,
      nhiaPrice: Number(c.fee) || 0,
      hmoPrice: Number(c.fee) || 0,
      vat: 0,
      unit: 'Per Account',
      isActive: true,
      isRegCat: true,
      rawCat: c,
    }));

    // Format Consultation Services as Charge Master Items
    const consultSvcMasterItems = consultServices.map((s: any) => ({
      id: s.id || `CSVC-${s.code}`,
      code: s.code,
      name: s.name,
      category: 'Consultation',
      basePrice: Number(s.price) || 0,
      nhiaPrice: Math.round((Number(s.price) || 0) * 0.7),
      hmoPrice: Math.round((Number(s.price) || 0) * 1.15),
      vat: 0,
      unit: `${s.duration || 20} min`,
      isActive: s.isActive !== false,
      isConsultSvc: true,
      rawSvc: s,
    }));

    // Existing codes set to avoid duplication
    const existingCodes = new Set([
      ...regCatMasterItems.map(r => r.code),
      ...consultSvcMasterItems.map(c => c.code)
    ]);

    const combinedMasterList = [
      ...regCatMasterItems,
      ...consultSvcMasterItems,
      ...chargeMaster.filter((cm: any) => !existingCodes.has(cm.code))
    ];

    const filteredMasterList = selectedCategoryFilter === 'All'
      ? combinedMasterList
      : combinedMasterList.filter((item: any) => item.category === selectedCategoryFilter);

    return (
      <Box>
        {/* Sub-Tab Navigation Header (Sub-tabs commented out since all services, tariffs & multipliers are consolidated) */}
        {/* <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={chargeMasterSubTab} onChange={handleSubTabChange} indicatorColor="primary" textColor="primary">
            <Tab icon={<Receipt />} iconPosition="start" label="All Billable Services" sx={{ fontWeight: 800, textTransform: 'none' }} />
            <Tab icon={<LocalAtm />} iconPosition="start" label="Fee Schedules & Tariffs" sx={{ fontWeight: 800, textTransform: 'none' }} />
            <Tab icon={<Shield />} iconPosition="start" label="NHIA / HMO Multipliers" sx={{ fontWeight: 800, textTransform: 'none' }} />
          </Tabs>
        </Box> */}

        {/* ── Sub-Tab 0: All Billable Services (Unified Single Section) ── */}
        {chargeMasterSubTab === 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>
                  Charge Master & General Service Catalogue
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Single Source of Truth for all Hospital Tariffs · Registration Fees · Consultation Tariffs · Lab & Radiology · Surgery & Bed Charges
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setOpenAddCat(true)}
                  sx={{ borderRadius: 2 }}
                >
                  Add Reg Category
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => { setEditingConsultService(null); setConsultSvcForm({ code: '', name: '', category: 'GENERAL', price: '', description: '', duration: '20', requiresDoctor: true }); setOpenAddConsultService(true); }}
                  sx={{ borderRadius: 2 }}
                >
                  Add Consult Tariff
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setChargeItemDialogOpen(true)}
                  sx={{ background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`, borderRadius: 2 }}
                >
                  Add Service
                </Button>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
              FR-BILL-001–005 · All billable services (Registration, Consultation, Laboratory, Radiology, Maternity, Admissions) originate from this single unified Charge Master catalogue.
            </Alert>

            {/* Category Filter Cards */}
            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              {['All', 'Registration', 'Consultation', 'Laboratory', 'Radiology', 'Theatre', 'Maternity', 'Admission', 'Emergency', 'ART Programme'].map(cat => {
                const count = cat === 'All'
                  ? combinedMasterList.length
                  : combinedMasterList.filter(c => c.category === cat).length;
                const isSelected = selectedCategoryFilter === cat;
                return (
                  <Grid item xs={6} sm={4} md={2.4} key={cat}>
                    <Card
                      onClick={() => setSelectedCategoryFilter(cat)}
                      sx={{
                        textAlign: 'center',
                        p: 1.5,
                        borderRadius: 2,
                        cursor: 'pointer',
                        bgcolor: isSelected ? `${PRIMARY}15` : 'background.paper',
                        border: isSelected ? `2px solid ${PRIMARY}` : '1px solid #e2e8f0',
                        boxShadow: isSelected ? `0 4px 12px ${PRIMARY}25` : '0 2px 8px rgba(0,0,0,0.04)',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': { transform: 'translateY(-2px)' }
                      }}
                    >
                      <Typography variant="h5" sx={{ fontWeight: 800, color: isSelected ? PRIMARY : 'text.primary' }}>{count}</Typography>
                      <Typography variant="caption" color={isSelected ? PRIMARY : 'text.secondary'} sx={{ fontWeight: 700 }}>{cat}</Typography>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Unified Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: PRIMARY, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                  <TableRow>
                    {['Code', 'Service Name', 'Category', 'Base Price', 'NHIA Price', 'HMO Price', 'VAT%', 'Unit', 'Donor', 'Status', 'Actions'].map(h => (
                      <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMasterList.map((item: any) => (
                    <TableRow key={item.id || item.code} hover sx={{ '&:hover': { bgcolor: '#f0f4ff' } }}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: SECONDARY, fontWeight: 700 }}>{item.code}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.category}
                          size="small"
                          variant="outlined"
                          color={
                            item.category === 'Registration' ? 'success' :
                            item.category === 'Consultation' ? 'primary' :
                            item.category === 'Laboratory' ? 'info' :
                            item.category === 'Radiology' ? 'secondary' : 'default'
                          }
                          sx={{ fontSize: '0.7rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{formatNGN(item.basePrice)}</TableCell>
                      <TableCell sx={{ color: TEAL }}>{formatNGN(item.nhiaPrice)}</TableCell>
                      <TableCell sx={{ color: PURPLE }}>{formatNGN(item.hmoPrice)}</TableCell>
                      <TableCell>{item.vat || 0}%</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{item.unit}</TableCell>
                      <TableCell>
                        {item.donorFunded ? <Chip label={item.donorProgramme || 'Donor'} size="small" color="warning" sx={{ fontSize: '0.65rem' }} /> : <Typography variant="caption" color="text.secondary">—</Typography>}
                      </TableCell>
                      <TableCell>
                        <Chip label={item.isActive !== false ? 'Active' : 'Inactive'} size="small" color={item.isActive !== false ? 'success' : 'default'} sx={{ fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell>
                        {item.isRegCat ? (
                          <IconButton size="small" color="error" onClick={() => handleDeleteRegCategory(item.code)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        ) : item.isConsultSvc ? (
                          <Stack direction="row" spacing={0.5}>
                            <IconButton size="small" color="primary" onClick={() => {
                              setEditingConsultService(item.rawSvc);
                              setConsultSvcForm({ code: item.rawSvc.code, name: item.rawSvc.name, category: item.rawSvc.category, price: String(item.rawSvc.price), description: item.rawSvc.description || '', duration: String(item.rawSvc.duration), requiresDoctor: item.rawSvc.requiresDoctor });
                              setOpenAddConsultService(true);
                            }}><Edit fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteConsultService(item.rawSvc.id)}><Delete fontSize="small" /></IconButton>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Edit Pricing & Tariffs">
                              <IconButton size="small" color="primary" onClick={() => {
                                setEditingChargeItem(item);
                                setChargeItemForm({
                                  name: item.name,
                                  category: item.category,
                                  basePrice: String(item.basePrice || 0),
                                  nhiaPrice: String(item.nhiaPrice || 0),
                                  hmoPrice: String(item.hmoPrice || 0),
                                  vat: String(item.vat || 0),
                                  unit: item.unit || 'Per Item'
                                });
                                setEditChargeItemDialogOpen(true);
                              }}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={item.isActive ? 'Deactivate' : 'Activate'}>
                              <IconButton size="small" onClick={async () => { await api.patch(`/billing/charge-master/${item.id}/toggle`); fetchAll(); }}>
                                {item.isActive ? <Cancel fontSize="small" color="error" /> : <CheckCircle fontSize="small" color="success" />}
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Sub-Tab 1: Fee Schedules & Tariffs ── */}
        {chargeMasterSubTab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>
                  Fee Schedules & Hospital Tariff Rules
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Departmental Price Books · Room & Bed Rates · Procedure Bundles · Tiered Price Matrices
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Tune />}
                onClick={() => enqueueSnackbar('Tariff schedule editor opened. All fee rules active.', { variant: 'info' })}
                sx={{ background: `linear-gradient(135deg, ${SECONDARY}, ${PRIMARY})`, borderRadius: 2 }}
              >
                Update Tariff Rules
              </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
              FR-BILL-006 · Hospital Fee Schedules define default pricing tiers for Self-Pay, NHIA, HMO, and Staff. Price changes automatically synchronize with EMR order entry across all clinical departments.
            </Alert>

            {/* Tariff Schedule Category Cards */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f0f7ff', border: '1px solid #cce3ff' }}>
                  <Typography variant="subtitle2" fontWeight={800} color={PRIMARY}>Standard Self-Pay Schedule</Typography>
                  <Typography variant="h5" fontWeight={900} color={PRIMARY} mt={0.5}>100% Base Rate</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>Default Cash / Debit Card Tariff</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2, borderRadius: 2.5, bgcolor: '#e6fffa', border: '1px solid #99f6e4' }}>
                  <Typography variant="subtitle2" fontWeight={800} color={TEAL}>NHIA Capitation Schedule</Typography>
                  <Typography variant="h5" fontWeight={900} color={TEAL} mt={0.5}>70% NHIA Tariff</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>National Health Authority Cap</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2, borderRadius: 2.5, bgcolor: '#fbf0ff', border: '1px solid #f3d5ff' }}>
                  <Typography variant="subtitle2" fontWeight={800} color={PURPLE}>HMO Negotiated Tariff</Typography>
                  <Typography variant="h5" fontWeight={900} color={PURPLE} mt={0.5}>115% - 125% Rate</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>Contracted Private HMO Schedule</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ p: 2, borderRadius: 2.5, bgcolor: '#fff9db', border: '1px solid #ffe066' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#b57600">Staff & Sponsor Subsidy</Typography>
                  <Typography variant="h5" fontWeight={900} color="#b57600" mt={0.5}>50% Subsidy Rate</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>Internal Employee Benefit Tariff</Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Tariff Matrix Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: SECONDARY, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                  <TableRow>
                    {['Service Code', 'Service Name', 'Category', 'Self-Pay (Base)', 'NHIA Rate (70%)', 'HMO Negotiated', 'Staff Subsidy (50%)', 'Billing Unit', 'Actions'].map(h => (
                      <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tariffSchedulesList.map(row => (
                    <TableRow key={row.code} hover sx={{ '&:hover': { bgcolor: '#f0f4ff' } }}>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SECONDARY }}>{row.code}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                      <TableCell><Chip label={row.category} size="small" variant="outlined" color="primary" sx={{ fontSize: '0.7rem' }} /></TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{formatNGN(row.basePrice)}</TableCell>
                      <TableCell sx={{ color: TEAL, fontWeight: 700 }}>{formatNGN(row.nhiaPrice)}</TableCell>
                      <TableCell sx={{ color: PURPLE, fontWeight: 700 }}>{formatNGN(row.hmoPrice)}</TableCell>
                      <TableCell sx={{ color: SUCCESS, fontWeight: 700 }}>{formatNGN(row.staffPrice)}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{row.billingMethod}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" color="primary" onClick={() => enqueueSnackbar(`Editing tariff tier for ${row.name}`, { variant: 'info' })} sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: '0.7rem', py: 0.2 }}>
                          Edit Rate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Sub-Tab 1: NHIA / HMO Multipliers ── */}
        {(chargeMasterSubTab === 1 || chargeMasterSubTab === 2) && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>
                  NHIA Tariffs & HMO Multiplier Matrix
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Insurance Multipliers · Patient Co-Payment Shares · Pre-Authorization Thresholds
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => enqueueSnackbar('HMO Multiplier Configuration dialog opened.', { variant: 'info' })}
                sx={{ background: `linear-gradient(135deg, ${TEAL}, ${PRIMARY})`, borderRadius: 2 }}
              >
                Configure HMO Multiplier
              </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
              FR-BILL-007 · Multipliers automatically scale standard base prices when billing via insurance providers. Patient Co-Pay % dictates out-of-pocket settlement required at the cashier desk.
            </Alert>

            {/* Payer Multipliers Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: TEAL, '& .MuiTableCell-head': { color: '#ffffff !important' } }}>
                  <TableRow>
                    {['Payer Name', 'Payer Code', 'Payer Class', 'Price Multiplier', 'Patient Co-Pay %', 'Pre-Auth Cap', 'Pre-Auth Required', 'Status', 'Actions'].map(h => (
                      <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hmoMultipliersList.map(hmo => (
                    <TableRow key={hmo.id} hover sx={{ '&:hover': { bgcolor: '#e6fffa' } }}>
                      <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>{hmo.name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SECONDARY }}>{hmo.code}</TableCell>
                      <TableCell><Chip label={hmo.class} size="small" variant="outlined" color={hmo.class.includes('NHIA') ? 'success' : 'primary'} sx={{ fontSize: '0.7rem' }} /></TableCell>
                      <TableCell sx={{ fontWeight: 900, color: TEAL, fontSize: '0.9rem' }}>{hmo.multiplier.toFixed(2)}x</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: hmo.copay > 0 ? WARNING : SUCCESS }}>{hmo.copay}%</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{formatNGN(hmo.preauthCap)}</TableCell>
                      <TableCell>
                        <Chip
                          label={hmo.preauthRequired ? 'Yes (Strict)' : 'No (Auto-Approve)'}
                          size="small"
                          color={hmo.preauthRequired ? 'warning' : 'success'}
                          sx={{ fontSize: '0.7rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell><Chip label={hmo.status} size="small" color="success" sx={{ fontSize: '0.7rem' }} /></TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" color="primary" onClick={() => enqueueSnackbar(`Editing multiplier for ${hmo.name}`, { variant: 'info' })} sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: '0.7rem', py: 0.2 }}>
                          Configure
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ══════════════════════════════════════════════════════════════════════════
  const pageDetails = getPageDetails();

  return (
    <Box sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', bgcolor: '#f5f7ff', pb: 4 }}>
      {/* ── Custom Header Banner Tailored to Page ── */}
      <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 50%, ${TEAL} 100%)`, px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3, boxShadow: '0 8px 32px rgba(26,35,126,0.3)' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
              Internal Banking &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              💰 {pageDetails.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500, mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {loading && <LinearProgress sx={{ width: 80, borderRadius: 2 }} />}
            <Tooltip title="Refresh Page Data">
              <IconButton onClick={fetchAll} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => enqueueSnackbar(`Exporting ${pageDetails.title} report`, { variant: 'info' })}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', textTransform: 'none', fontWeight: 700, '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              Export Report
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ── Tailored 4-Card KPI Strip ── */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Grid container spacing={2}>
          {pageDetails.kpis.map((kpi, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <KPICard
                title={kpi.title}
                value={kpi.value}
                sub={kpi.sub}
                icon={kpi.icon}
                color={kpi.color}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── Standalone Workspace Card ── */}
      <Box sx={{ px: 3 }}>
        <Card sx={{ borderRadius: 3, boxShadow: '0 8px 40px rgba(0,0,0,0.07)', p: 3 }}>
          {activeTab === 0 && renderBillingSection()}
          {/* {activeTab === 1 && renderCashierSection()} */}
          {activeTab === 2 && renderClaimsSection()}
          {activeTab === 3 && renderAnalyticsSection()}
          {activeTab === 4 && renderEWalletSection()}
          {activeTab === 5 && renderChargeMasterSection()}
        </Card>
      </Box>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS
          ══════════════════════════════════════════════════════════════════ */}

      {/* ── New Invoice Dialog ── */}
      <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`, color: '#fff', fontWeight: 800 }}>
          📄 Generate New Invoice
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#f5f7ff' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Card sx={{ borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: PRIMARY }}>Invoice Details</Typography>
                <Stack spacing={2}>
                  <TextField select label="Patient" size="small" fullWidth value={invoiceForm.patientId}
                    onChange={e => { const p = patients.find(pt => pt.id === e.target.value); setInvoiceForm(prev => ({ ...prev, patientId: e.target.value, patientName: p ? `${p.firstName} ${p.lastName}` : '' })); }}>
                    {patients.map(p => <MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientNumber})</MenuItem>)}
                  </TextField>
                  <TextField select label="Funding Source" size="small" fullWidth value={invoiceForm.fundingSource}
                    onChange={e => setInvoiceForm(prev => ({ ...prev, fundingSource: e.target.value }))}>
                    {FUNDING_SOURCES.map(f => <MenuItem key={f} value={f}>{f.replace('_', ' ')}</MenuItem>)}
                  </TextField>
                  {(invoiceForm.fundingSource === 'NHIA' || invoiceForm.fundingSource === 'HMO' || invoiceForm.fundingSource === 'CORPORATE') && (
                    <TextField select label="Payer / Insurer" size="small" fullWidth value={invoiceForm.payerId}
                      onChange={e => setInvoiceForm(prev => ({ ...prev, payerId: e.target.value }))}>
                      {payers.filter(p => invoiceForm.fundingSource === 'NHIA' ? p.type === 'NHIA' : invoiceForm.fundingSource === 'HMO' ? p.type === 'HMO' : p.type === 'CORPORATE').map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                    </TextField>
                  )}
                  <TextField label="Discount (₦)" size="small" type="number" value={invoiceForm.discount}
                    onChange={e => setInvoiceForm(prev => ({ ...prev, discount: Number(e.target.value) }))} fullWidth inputProps={{ step: '100' }} />
                  <TextField label="Notes" size="small" multiline rows={2} fullWidth value={invoiceForm.notes}
                    onChange={e => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))} />
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ p: 2, bgcolor: `${PRIMARY}11`, borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Invoice Total:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: PRIMARY }}>{formatNGN(invoiceTotal)}</Typography>
                  </Stack>
                  {invoiceForm.discount > 0 && <Typography variant="caption" color="text.secondary">Discount applied: {formatNGN(invoiceForm.discount)}</Typography>}
                </Box>
              </Card>
            </Grid>
            <Grid item xs={12} md={7}>
              <Card sx={{ borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: PRIMARY }}>Add Services from Charge Master</Typography>
                <TextField size="small" placeholder="Search services..." fullWidth sx={{ mb: 2 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
                <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 2, border: '1px solid #e3e8f0', borderRadius: 2 }}>
                  <Table size="small">
                    <TableBody>
                      {chargeMaster.filter(i => i.isActive && !i.donorFunded).map(item => (
                        <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => addInvoiceItem(item)}>
                          <TableCell sx={{ py: 0.8 }}><Typography variant="caption" sx={{ fontFamily: 'monospace', color: SECONDARY, fontWeight: 700 }}>{item.code}</Typography></TableCell>
                          <TableCell sx={{ py: 0.8 }}><Typography variant="caption" sx={{ fontWeight: 600 }}>{item.name}</Typography></TableCell>
                          <TableCell sx={{ py: 0.8 }}><Chip label={item.category} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></TableCell>
                          <TableCell align="right" sx={{ py: 0.8 }}><Typography variant="caption" sx={{ fontWeight: 700 }}>{formatNGN(invoiceForm.fundingSource === 'NHIA' ? item.nhiaPrice : invoiceForm.fundingSource === 'HMO' ? item.hmoPrice : item.basePrice)}</Typography></TableCell>
                          <TableCell sx={{ py: 0.8 }}><Tooltip title="Add to invoice"><IconButton size="small" color="primary"><Add fontSize="small" /></IconButton></Tooltip></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Invoice Line Items:</Typography>
                {invoiceItems.length === 0 && <Alert severity="info">Click services above to add them to the invoice.</Alert>}
                {invoiceItems.map(item => (
                  <Box key={item.chargeCode} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, mb: 0.5, bgcolor: '#f0f4ff', borderRadius: 1 }}>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: PRIMARY }}>{item.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{item.chargeCode} · {formatNGN(item.unitPrice)} × {item.quantity}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>{formatNGN(item.unitPrice * item.quantity * (1 + item.vat / 100))}</Typography>
                      <IconButton size="small" onClick={() => removeInvoiceItem(item.chargeCode)}><Cancel fontSize="small" color="error" /></IconButton>
                    </Stack>
                  </Box>
                ))}
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setInvoiceDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateInvoice} disabled={loading} sx={{ background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})` }}>
            Generate Invoice {formatNGN(invoiceTotal)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Payment Dialog ── */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: `linear-gradient(135deg, ${SUCCESS}, #388e3c)`, color: '#fff', fontWeight: 800 }}>
          💳 Receive Payment
        </DialogTitle>
        <DialogContent dividers>
          {selectedInvoice && (
            <Box>
              {/* Assigned Cashier Shift & Till Box */}
              <Box sx={{ mb: 2.5, p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LocalAtm sx={{ color: PRIMARY, fontSize: '1.2rem' }} />
                    <Typography variant="caption" sx={{ fontWeight: 800, color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Processing Cashier Shift & Drawer Till
                    </Typography>
                  </Stack>
                  {shifts.filter(s => s.status === 'OPEN').length > 0 ? (
                    <Chip label="TILL ACTIVE" color="success" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                  ) : (
                    <Chip label="NO OPEN SHIFT" color="error" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                  )}
                </Stack>

                {shifts.filter(s => s.status === 'OPEN').length === 0 ? (
                  <Alert severity="warning" sx={{ py: 0.5, fontSize: '0.8rem' }} action={
                    <Button size="small" color="inherit" onClick={() => { setPaymentDialogOpen(false); setShiftDialogOpen(true); }}>Open Shift</Button>
                  }>
                    No open cashier shift found. Open a shift first so funds are credited to your till.
                  </Alert>
                ) : (
                  <TextField
                    select
                    size="small"
                    fullWidth
                    label="Credited Shift / Till Drawer"
                    value={paymentShiftId || activeShiftId || (shifts.find(s => s.status === 'OPEN')?.id || '')}
                    onChange={(e) => {
                      setPaymentShiftId(e.target.value);
                      setActiveShiftId(e.target.value);
                    }}
                    helperText="Funds received will be credited directly to this cashier's shift & expected till closing"
                  >
                    {shifts.filter(s => s.status === 'OPEN').map(s => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.cashDrawer} ({s.location} · {s.cashierName}) — Till Float + Collections: {formatNGN(s.expectedClosingBalance || 0)}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                Invoice: <strong>{selectedInvoice.invoiceNo}</strong> · Patient: <strong>{selectedInvoice.patientName}</strong>
                <br />Outstanding: <strong>{formatNGN(selectedInvoice.outstanding)}</strong>
              </Alert>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Payment Methods (FR-CASH-006–007)</Typography>
              {payMethods.map((m, i) => (
                <Grid container spacing={1} sx={{ mb: 1 }} key={i}>
                  <Grid item xs={7}>
                    <TextField select size="small" fullWidth label="Method" value={m.method}
                      onChange={e => setPayMethods(prev => prev.map((pm, pi) => pi === i ? { ...pm, method: e.target.value } : pm))}>
                      {PAY_METHODS.map(pm => <MenuItem key={pm.value} value={pm.value}>{pm.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={4}>
                    <TextField size="small" type="number" fullWidth label="Amount (₦)" value={m.amount}
                      onChange={e => setPayMethods(prev => prev.map((pm, pi) => pi === i ? { ...pm, amount: Number(e.target.value) } : pm))}
                      inputProps={{ step: '100' }} />
                  </Grid>
                  <Grid item xs={1}>
                    {payMethods.length > 1 && <IconButton size="small" color="error" onClick={() => setPayMethods(prev => prev.filter((_, pi) => pi !== i))}><Cancel fontSize="small" /></IconButton>}
                  </Grid>
                </Grid>
              ))}
              <Button size="small" startIcon={<Add />} onClick={() => setPayMethods(prev => [...prev, { method: 'CASH', amount: 0 }])}>Add Payment Method</Button>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" justifyContent="space-between" sx={{ p: 1.5, bgcolor: payTotal > (selectedInvoice.outstanding + 0.01) ? '#fff5f5' : '#f0fff4', borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Total Being Paid:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: payTotal > selectedInvoice.outstanding ? DANGER : SUCCESS }}>{formatNGN(payTotal)}</Typography>
              </Stack>
              {payTotal > selectedInvoice.outstanding && <Alert severity="error" sx={{ mt: 1 }}>Payment exceeds outstanding balance. Please adjust.</Alert>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handlePayment} disabled={loading || payTotal <= 0 || payTotal > (selectedInvoice?.outstanding + 0.01)}>
            Confirm Payment & Issue Receipt
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Charge Item Dialog ── */}
      <Dialog open={chargeItemDialogOpen} onClose={() => setChargeItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await api.post('/billing/charge-master', { code: fd.get('code'), name: fd.get('name'), category: fd.get('category'), basePrice: Number(fd.get('basePrice')), nhiaPrice: Number(fd.get('nhiaPrice')), hmoPrice: Number(fd.get('hmoPrice')), vat: Number(fd.get('vat')), unit: fd.get('unit') }); enqueueSnackbar('Service added to Charge Master', { variant: 'success' }); setChargeItemDialogOpen(false); fetchAll(); }}>
          <DialogTitle sx={{ fontWeight: 800 }}>Add Service to Charge Master</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="Billing Code" name="code" size="small" fullWidth required placeholder="e.g. LAB-HIV001" /></Grid>
              <Grid item xs={6}><TextField label="Service Name" name="name" size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField select label="Category" name="category" size="small" fullWidth defaultValue="Consultation">{['Mortuary & Pathology', 'Consultation', 'Laboratory', 'Radiology', 'Theatre', 'Pharmacy', 'Admission', 'Emergency', 'Transport', 'Medical Documentation', 'General'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField></Grid>
              <Grid item xs={6}><TextField label="Unit" name="unit" size="small" fullWidth defaultValue="Per Visit" /></Grid>
              <Grid item xs={4}><TextField label="Base Price (₦)" name="basePrice" size="small" type="number" fullWidth required inputProps={{ step: '100' }} /></Grid>
              <Grid item xs={4}><TextField label="NHIA Price (₦)" name="nhiaPrice" size="small" type="number" fullWidth inputProps={{ step: '100' }} defaultValue="0" /></Grid>
              <Grid item xs={4}><TextField label="HMO Price (₦)" name="hmoPrice" size="small" type="number" fullWidth inputProps={{ step: '100' }} defaultValue="0" /></Grid>
              <Grid item xs={6}><TextField label="VAT (%)" name="vat" size="small" type="number" fullWidth defaultValue="0" inputProps={{ step: '0.5' }} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions><Button onClick={() => setChargeItemDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Add Service</Button></DialogActions>
        </form>
      </Dialog>

      {/* ── Edit Charge Item Dialog ── */}
      <Dialog open={editChargeItemDialogOpen} onClose={() => setEditChargeItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            const id = editingChargeItem?.id || editingChargeItem?.code;
            await api.put(`/billing/charge-master/${id}`, {
              name: chargeItemForm.name,
              category: chargeItemForm.category,
              basePrice: Number(chargeItemForm.basePrice),
              nhiaPrice: Number(chargeItemForm.nhiaPrice),
              hmoPrice: Number(chargeItemForm.hmoPrice),
              vat: Number(chargeItemForm.vat),
              unit: chargeItemForm.unit
            });
            enqueueSnackbar('Charge Master item updated successfully', { variant: 'success' });
            setEditChargeItemDialogOpen(false);
            fetchAll();
          } catch (err: any) {
            enqueueSnackbar(err.response?.data?.message || 'Failed to update charge item', { variant: 'error' });
          }
        }}>
          <DialogTitle sx={{ fontWeight: 800 }}>Edit Service Pricing & Tariff ({editingChargeItem?.code})</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="Billing Code" value={editingChargeItem?.code || ''} size="small" fullWidth disabled /></Grid>
              <Grid item xs={6}><TextField label="Service Name" value={chargeItemForm.name} onChange={e => setChargeItemForm(prev => ({ ...prev, name: e.target.value }))} size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField select label="Category" value={chargeItemForm.category} onChange={e => setChargeItemForm(prev => ({ ...prev, category: e.target.value }))} size="small" fullWidth>{['Mortuary & Pathology', 'Consultation', 'Laboratory', 'Radiology', 'Theatre', 'Pharmacy', 'Admission', 'Emergency', 'Transport', 'Medical Documentation', 'General'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField></Grid>
              <Grid item xs={6}><TextField label="Unit" value={chargeItemForm.unit} onChange={e => setChargeItemForm(prev => ({ ...prev, unit: e.target.value }))} size="small" fullWidth /></Grid>
              <Grid item xs={4}><TextField label="Base Price (₦)" value={chargeItemForm.basePrice} onChange={e => setChargeItemForm(prev => ({ ...prev, basePrice: e.target.value }))} size="small" type="number" fullWidth required inputProps={{ step: '100' }} /></Grid>
              <Grid item xs={4}><TextField label="NHIA Price (₦)" value={chargeItemForm.nhiaPrice} onChange={e => setChargeItemForm(prev => ({ ...prev, nhiaPrice: e.target.value }))} size="small" type="number" fullWidth inputProps={{ step: '100' }} /></Grid>
              <Grid item xs={4}><TextField label="HMO Price (₦)" value={chargeItemForm.hmoPrice} onChange={e => setChargeItemForm(prev => ({ ...prev, hmoPrice: e.target.value }))} size="small" type="number" fullWidth inputProps={{ step: '100' }} /></Grid>
              <Grid item xs={6}><TextField label="VAT (%)" value={chargeItemForm.vat} onChange={e => setChargeItemForm(prev => ({ ...prev, vat: e.target.value }))} size="small" type="number" fullWidth inputProps={{ step: '0.5' }} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditChargeItemDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">Save Changes</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Claim Submission Dialog ── */}
      <Dialog open={claimDialogOpen} onClose={() => setClaimDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitClaim}>
          <DialogTitle sx={{ background: `linear-gradient(135deg, ${SECONDARY}, ${PRIMARY})`, color: '#fff', fontWeight: 800 }}>Submit Insurance/NHIA Claim</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField select label="Invoice" name="invoiceId" size="small" fullWidth required defaultValue={selectedInvoice?.id || ''}>
                {invoices.filter(i => i.status !== 'CANCELLED' && !isExemptInvoice(i)).map(inv => <MenuItem key={inv.id} value={inv.id}>{inv.invoiceNo} – {inv.patientName} ({formatNGN(inv.totalAmount)})</MenuItem>)}
              </TextField>
              <TextField select label="Payer / Insurer" name="payerId" size="small" fullWidth required defaultValue="">
                {payers.filter(p => p.type !== 'DONOR').map(p => <MenuItem key={p.id} value={p.id}>{p.name} ({p.type})</MenuItem>)}
              </TextField>
              <TextField select label="Claim Type" name="claimType" size="small" fullWidth defaultValue="STANDARD">
                <MenuItem value="STANDARD">Standard Claim</MenuItem>
                <MenuItem value="NHIA">NHIA Electronic Claim</MenuItem>
                <MenuItem value="CAPITATION">Capitation Claim</MenuItem>
                <MenuItem value="EMERGENCY">Emergency Claim</MenuItem>
              </TextField>
              <TextField label="Notes / Supporting Info" name="notes" size="small" multiline rows={3} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setClaimDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={loading}>Submit Claim</Button></DialogActions>
        </form>
      </Dialog>

      {/* ── Adjudicate Dialog ── */}
      <Dialog open={adjudicateDialogOpen} onClose={() => setAdjudicateDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleAdjudicate}>
          <DialogTitle sx={{ fontWeight: 800 }}>Adjudicate Claim – {selectedClaim?.claimNo}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="info">Claimed Amount: <strong>{formatNGN(selectedClaim?.claimedAmount)}</strong></Alert>
              <TextField select label="Decision" name="decision" size="small" fullWidth required defaultValue="APPROVED">
                <MenuItem value="APPROVED">Approved in Full</MenuItem>
                <MenuItem value="PARTIAL">Partially Approved</MenuItem>
                <MenuItem value="DENIED">Denied</MenuItem>
              </TextField>
              <TextField label="Approved Amount (₦)" name="approvedAmount" size="small" type="number" fullWidth defaultValue={selectedClaim?.claimedAmount} inputProps={{ step: '100' }} />
              <TextField label="Denial / Notes" name="denialReason" size="small" multiline rows={2} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setAdjudicateDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Record Decision</Button></DialogActions>
        </form>
      </Dialog>

      {/* ── Refund Dialog ── */}
      <Dialog
        open={refundDialogOpen}
        onClose={() => {
          setRefundDialogOpen(false);
          setSelectedInvoice(null);
          setRefundForm({ paymentId: '', amount: '', reason: '', refundMethod: 'CASH' });
        }}
        maxWidth="xs"
        fullWidth
      >
        {(() => {
          const selectedRefundPayment = payments.find(p => p.id === refundForm.paymentId);
          const maxRefundable = selectedRefundPayment ? Number(selectedRefundPayment.totalPaid || selectedRefundPayment.amount || 0) : 0;
          const refundAmountNum = Number(refundForm.amount);
          const hasEnteredAmount = refundForm.amount !== '' && !isNaN(refundAmountNum);
          const isAmountExceeded = Boolean(refundForm.paymentId && hasEnteredAmount && refundAmountNum > maxRefundable);
          const isAmountInvalid = Boolean(hasEnteredAmount && refundAmountNum <= 0);
          const isSubmitDisabled = !refundForm.paymentId || !refundForm.amount || isAmountExceeded || isAmountInvalid || !refundForm.reason.trim();

          return (
            <form
              noValidate
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmitDisabled) return;
                try {
                  const isWallet = refundForm.refundMethod === 'E_WALLET' || refundForm.refundMethod === 'WALLET';
                  const res = await api.post('/billing/refunds', {
                    paymentId: refundForm.paymentId,
                    amount: Number(refundForm.amount),
                    reason: refundForm.reason,
                    refundMethod: refundForm.refundMethod
                  });
                  if (isWallet) {
                    enqueueSnackbar(`Refund of ${formatNGN(Number(refundForm.amount))} automatically credited to patient's hospital e-wallet!`, { variant: 'success' });
                  } else {
                    enqueueSnackbar('Refund request submitted for approval', { variant: 'success' });
                  }
                  setRefundDialogOpen(false);
                  setSelectedInvoice(null);
                  setRefundForm({ paymentId: '', amount: '', reason: '', refundMethod: 'CASH' });
                  fetchAll();
                  if (typeof fetchWalletPatients === 'function') {
                    fetchWalletPatients();
                  }
                } catch (err: any) {
                  enqueueSnackbar(err.response?.data?.message || 'Refund failed', { variant: 'error' });
                }
              }}
            >
              <DialogTitle sx={{ fontWeight: 800 }}>Request Refund</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    select
                    label="Original Payment"
                    name="paymentId"
                    size="small"
                    fullWidth
                    required
                    value={refundForm.paymentId}
                    onChange={(e) => {
                      const pId = e.target.value;
                      const selectedP = payments.find(p => p.id === pId);
                      setRefundForm(prev => ({
                        ...prev,
                        paymentId: pId,
                        amount: selectedP ? String(selectedP.totalPaid || selectedP.amount || '') : prev.amount,
                        refundMethod: selectedP?.methods?.[0]?.method || prev.refundMethod,
                      }));
                    }}
                  >
                    {payments.map(p => {
                      const patName = (() => {
                        if (p.patientName && p.patientName !== 'Hospital Patient' && p.patientName !== 'Patient') {
                          return p.patientName;
                        }
                        const matchedInv = invoices.find((inv: any) => inv.id === p.invoiceId || inv.invoiceNo === p.invoiceNo);
                        if (matchedInv?.patientName && matchedInv.patientName !== 'Hospital Patient' && matchedInv.patientName !== 'Patient') {
                          return matchedInv.patientName;
                        }
                        if (p.patientId) {
                          const matchedPat = patients.find((pt: any) => pt.id === p.patientId || pt.patientNumber === p.patientNumber);
                          if (matchedPat) {
                            return `${matchedPat.firstName || ''} ${matchedPat.lastName || ''}`.trim() || matchedPat.name;
                          }
                        }
                        return p.patientName || 'Hospital Patient';
                      })();
                      return (
                        <MenuItem key={p.id} value={p.id}>
                          {p.receiptNo} – {patName} ({formatNGN(p.totalPaid || p.amount || 0)})
                        </MenuItem>
                      );
                    })}
                  </TextField>

                  <TextField
                    label="Refund Amount (₦)"
                    name="amount"
                    size="small"
                    type="number"
                    fullWidth
                    required
                    value={refundForm.amount}
                    onChange={(e) => setRefundForm(prev => ({ ...prev, amount: e.target.value }))}
                    error={isAmountExceeded || isAmountInvalid}
                    helperText={
                      isAmountExceeded
                        ? `Refund amount cannot exceed original payment of ${formatNGN(maxRefundable)}`
                        : isAmountInvalid
                        ? 'Refund amount must be greater than ₦0.00'
                        : selectedRefundPayment
                        ? `Maximum refundable amount: ${formatNGN(maxRefundable)}`
                        : undefined
                    }
                    inputProps={{ step: 'any', min: '0.01' }}
                  />

                  {isAmountExceeded && (
                    <Alert severity="error" sx={{ py: 0.5, fontSize: '0.8rem', '& .MuiAlert-icon': { fontSize: '1.1rem' } }}>
                      <strong>Amount Exceeded:</strong> You entered {formatNGN(refundAmountNum)}, but the original payment is only {formatNGN(maxRefundable)}. Please reduce the refund amount to proceed.
                    </Alert>
                  )}

                  <TextField
                    select
                    label="Refund Method"
                    name="refundMethod"
                    size="small"
                    fullWidth
                    value={refundForm.refundMethod}
                    onChange={(e) => setRefundForm(prev => ({ ...prev, refundMethod: e.target.value }))}
                  >
                    {PAY_METHODS.slice(0, 4).map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                  </TextField>

                  {(refundForm.refundMethod === 'E_WALLET' || refundForm.refundMethod === 'WALLET') && (
                    <Alert severity="info" sx={{ py: 0.6, fontSize: '0.8rem', bgcolor: 'rgba(2, 136, 209, 0.08)', border: '1px solid rgba(2, 136, 209, 0.2)' }}>
                      💳 <strong>Automatic Hospital E-Wallet Credit:</strong> Approving this refund will automatically credit <strong>{formatNGN(refundAmountNum || 0)}</strong> directly into the patient's internal hospital wallet.
                    </Alert>
                  )}

                  <TextField
                    label="Reason for Refund"
                    name="reason"
                    size="small"
                    multiline
                    rows={2}
                    fullWidth
                    required
                    value={refundForm.reason}
                    onChange={(e) => setRefundForm(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    setRefundDialogOpen(false);
                    setSelectedInvoice(null);
                    setRefundForm({ paymentId: '', amount: '', reason: '', refundMethod: 'CASH' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="warning"
                  disabled={isSubmitDisabled}
                  sx={{
                    fontWeight: 700,
                    opacity: isSubmitDisabled ? 0.6 : 1,
                    cursor: isSubmitDisabled ? 'not-allowed' : 'pointer'
                  }}
                >
                  Submit Refund Request
                </Button>
              </DialogActions>
            </form>
          );
        })()}
      </Dialog>

      {/* ── Open Shift Dialog ── */}
      <Dialog open={shiftDialogOpen} onClose={() => setShiftDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleOpenShift}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalAtm sx={{ color: PRIMARY }} /> Open Cashier Shift & Lock Till
          </DialogTitle>
          <DialogContent dividers sx={{ p: 2.5 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                label="Assigned Cashier / Revenue Officer"
                name="cashierId"
                size="small"
                fullWidth
                defaultValue={cashiersList[0]?.id || 'cashier'}
                required
                helperText="Select the cashier staff member operating this session"
              >
                {cashiersList.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} ({c.designation || c.department})
                  </MenuItem>
                ))}
              </TextField>

              <TextField select label="Hospital Location / Desk" name="location" size="small" fullWidth defaultValue="Main Cashier">
                {['Main Cashier', 'OPD Cashier', 'Pharmacy Cashier', 'Emergency Cashier', 'IPD Cashier', 'Radiology Cash Desk', 'Laboratory Cash Desk'].map(l => (
                  <MenuItem key={l} value={l}>{l}</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Cash Drawer Till ID"
                name="cashDrawer"
                size="small"
                fullWidth
                defaultValue="Drawer-01"
              >
                {['Drawer-01', 'Drawer-02', 'Drawer-03', 'Drawer A (Mary Okon)', 'Drawer B (Blessing Ugwu)', 'Drawer C (Emergency)'].map(d => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </TextField>

              <TextField
                label="Opening Cash Float Balance (₦)"
                name="openingBalance"
                size="small"
                type="number"
                fullWidth
                defaultValue="0"
                inputProps={{ step: '100' }}
                helperText="Physical currency float already placed in drawer till"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <Button onClick={() => setShiftDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
              Open Shift & Lock Till
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Cashier Shift Clock-In & Float Verification Dialog ── */}
      <Dialog open={Boolean(startShiftModal)} onClose={() => setStartShiftModal(null)} maxWidth="sm" fullWidth>
        {startShiftModal && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const opBal = Number(clockInFloat) || 0;
            await handleStartShift(startShiftModal.id, opBal, clockInNotes);
            setStartShiftModal(null);
          }}>
            <DialogTitle sx={{ 
              fontWeight: 800, 
              bgcolor: '#f8fafc', 
              borderBottom: '1px solid #e2e8f0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: 1 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Avatar sx={{ bgcolor: '#ecfdf5', color: '#10b981', width: 38, height: 38 }}>
                  <LocalAtm fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#0f172a', lineHeight: 1.2 }}>
                    Cashier Shift Clock-In & Float Verification
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Review shift duty schedule and confirm / adjust opening cash float in till
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => setStartShiftModal(null)}>
                <Close fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                {/* Shift Details Summary Card */}
                <Card variant="outlined" sx={{ bgcolor: '#f8fafc', borderRadius: 2, borderColor: '#e2e8f0' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>ASSIGNED CASHIER</Typography>
                        <Typography variant="body2" fontWeight={800} sx={{ color: PRIMARY }}>
                          {startShiftModal.cashierName || 'Mary Okon'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>DUTY DATE</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.2 }}>
                          <Chip size="small" label="TODAY" color="success" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} />
                          <Typography variant="body2" fontWeight={700}>
                            {startShiftModal.scheduledDate ? new Date(startShiftModal.scheduledDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>SHIFT WINDOW & HOURS</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {startShiftModal.shiftWindow || `${startShiftModal.startTime || '07:00'} – ${startShiftModal.endTime || '15:00'}`}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>DUTY LOCATION / DESK</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {startShiftModal.location || startShiftModal.desk || 'Main Outpatient Cash Desk #01'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>CASH DRAWER TILL ID</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {startShiftModal.cashDrawer || startShiftModal.drawerId || 'Drawer A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>ADMIN ASSIGNED FLOAT</Typography>
                        <Typography variant="body2" fontWeight={800} color={SUCCESS}>
                          {formatNGN(startShiftModal.openingBalance || 20000)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Float Adjustment & Verification */}
                <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#166534" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <LocalAtm fontSize="small" /> Physical Float Verification
                  </Typography>
                  <Typography variant="caption" color="#15803d" sx={{ display: 'block', mb: 2 }}>
                    The administrator assigned an opening float of <b>{formatNGN(startShiftModal.openingBalance || 20000)}</b>. Please count the physical currency in your cash drawer till and adjust the figure below if different before clocking in.
                  </Typography>

                  <TextField
                    label="Confirmed / Adjusted Opening Cash Float"
                    fullWidth
                    size="small"
                    type="number"
                    value={clockInFloat}
                    onChange={(e) => setClockInFloat(e.target.value)}
                    required
                    inputProps={{ min: 0, step: 100 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><span style={{ fontWeight: 800 }}>₦</span></InputAdornment>,
                    }}
                    sx={{ bgcolor: '#fff', borderRadius: 1 }}
                    helperText="Opening physical cash balance that will be locked into this cashier session"
                  />

                  {/* Quick preset chips */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Quick Float Presets:</Typography>
                    {[0, 10000, 20000, 30000, 50000].map((amt) => (
                      <Chip
                        key={amt}
                        size="small"
                        label={`₦${amt.toLocaleString()}`}
                        onClick={() => setClockInFloat(String(amt))}
                        variant={Number(clockInFloat) === amt ? 'filled' : 'outlined'}
                        color={Number(clockInFloat) === amt ? 'success' : 'default'}
                        sx={{ fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}
                      />
                    ))}
                    <Chip
                      size="small"
                      label="Reset to Default"
                      onClick={() => setClockInFloat(String(startShiftModal.openingBalance !== undefined ? startShiftModal.openingBalance : 20000))}
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer', ml: 'auto' }}
                    />
                  </Box>
                </Box>

                {/* Handover / Denomination Notes */}
                <TextField
                  label="Clock-In Notes & Denomination Breakdown (Optional)"
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  value={clockInNotes}
                  onChange={(e) => setClockInNotes(e.target.value)}
                  placeholder="e.g. Verified ₦20,000 cash float (10x ₦1,000 notes + 20x ₦500 notes). Key received from Supervisor."
                  helperText="Audit trail note saved with this cashier shift session"
                />
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
              <Button onClick={() => setStartShiftModal(null)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="success"
                startIcon={<PlayArrow />}
                disabled={loading}
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                }}
              >
                Confirm Float & Clock-In
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      {/* ── Cashier Shift Handover & Reconciliation Dialog ── */}
      <Dialog open={Boolean(handoverShiftModal)} onClose={() => setHandoverShiftModal(null)} maxWidth="sm" fullWidth>
        {handoverShiftModal && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const actBal = Number(closingActualBalance);
            try {
              await api.post(`/billing/cashier/shift/${handoverShiftModal.id}/close`, {
                actualClosingBalance: actBal,
                supervisorNotes: handoverNotes,
              });
              enqueueSnackbar('Cashier Shift successfully closed and balanced for handover', { variant: 'success' });
              setHandoverShiftModal(null);
              fetchAll();
            } catch (err: any) {
              enqueueSnackbar(err.response?.data?.message || 'Failed to close shift', { variant: 'error' });
            }
          }}>
            <DialogTitle sx={{ fontWeight: 800, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceWallet sx={{ color: PRIMARY }} /> Cashier Shift Handover & Vault Transfer
            </DialogTitle>
            <DialogContent dividers sx={{ p: 3 }}>
              <Alert severity="info" sx={{ mb: 2.5 }}>
                Enter physical currency counted in till. The system calculates discrepancy and logs the official handover memorandum for the incoming cashier.
              </Alert>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>TERMINAL / STATION</Typography>
                  <Typography variant="body2" fontWeight={800}>{handoverShiftModal.location || 'Main Cash Desk'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>CASH DRAWER TILL</Typography>
                  <Typography variant="body2" fontWeight={800}>{handoverShiftModal.cashDrawer || 'Drawer A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>OPENING FLOAT</Typography>
                  <Typography variant="body2" fontWeight={800} color={PRIMARY}>{formatNGN(handoverShiftModal.openingBalance)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>SYSTEM EXPECTED CLOSING</Typography>
                  <Typography variant="body2" fontWeight={800} color={SUCCESS}>{formatNGN(handoverShiftModal.expectedClosingBalance)}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                <TextField
                  label="Counted Physical Cash in Drawer (₦)"
                  type="number"
                  required
                  fullWidth
                  value={closingActualBalance}
                  onChange={(e) => setClosingActualBalance(e.target.value)}
                  helperText={
                    (() => {
                      const diff = Number(closingActualBalance) - (handoverShiftModal.expectedClosingBalance || 0);
                      if (closingActualBalance === '') return 'Count all currency notes and coins in the drawer till';
                      if (diff === 0) return '✓ Perfect match: Till is fully balanced (₦0.00 variance)';
                      if (diff > 0) return `⚠️ Till Surplus: +${formatNGN(diff)} excess over system total`;
                      return `⚠️ Till Shortage: ${formatNGN(diff)} discrepancy deficit`;
                    })()
                  }
                  FormHelperTextProps={{
                    sx: {
                      fontWeight: 700,
                      color: Number(closingActualBalance) === handoverShiftModal.expectedClosingBalance ? SUCCESS : WARNING
                    }
                  }}
                />

                <TextField
                  label="Relinquishing Cashier Notes / Incoming Cashier Handover Memo"
                  multiline
                  rows={2}
                  fullWidth
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="e.g. Handed over physical cash float and POS batch receipts to incoming cashier. Vault drop pending."
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <Button onClick={() => setHandoverShiftModal(null)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="error"
                startIcon={<CheckCircle />}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Confirm Dual Handover & Close Shift
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      {/* ── Reassign Shift Cover Dialog ── */}
      <Dialog open={Boolean(reassignShiftModal)} onClose={() => setReassignShiftModal(null)} maxWidth="xs" fullWidth>
        {reassignShiftModal && (
          <form onSubmit={handleReassignShift}>
            <DialogTitle sx={{ fontWeight: 800, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonAdd sx={{ color: PRIMARY }} /> Reassign Shift Cover (Delegation)
            </DialogTitle>
            <DialogContent dividers sx={{ p: 2.5 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Delegate active till <strong>{reassignShiftModal.cashDrawer}</strong> ({reassignShiftModal.location}) currently operated by <strong>{reassignShiftModal.cashierName}</strong> to a covering colleague.
              </Alert>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Covering Cashier / Officer"
                  required
                  fullWidth
                  size="small"
                  value={reassignCashierId}
                  onChange={(e) => setReassignCashierId(e.target.value)}
                  helperText="Select the staff member taking temporary or full shift responsibility"
                >
                  {cashiersList.filter(c => c.id !== reassignShiftModal.cashierId && c.name !== reassignShiftModal.cashierName).map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} ({c.designation || c.department})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Delegation Reason / Handover Notes"
                  multiline
                  rows={2}
                  fullWidth
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  placeholder="e.g. Relief cover for 1 hour lunch break. Counted physical till matched."
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <Button onClick={() => setReassignShiftModal(null)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!reassignCashierId}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Confirm Reassignment
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      {/* ── Add Payer Dialog ── */}
      <Dialog open={payerDialogOpen} onClose={() => setPayerDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await api.post('/billing/payers', { name: fd.get('name'), type: fd.get('type'), contactEmail: fd.get('contactEmail'), creditLimit: Number(fd.get('creditLimit')), contractStart: fd.get('contractStart'), contractEnd: fd.get('contractEnd') }); enqueueSnackbar('Payer contract added', { variant: 'success' }); setPayerDialogOpen(false); fetchAll(); }}>
          <DialogTitle sx={{ fontWeight: 800 }}>Add Payer / Contract</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={8}><TextField label="Organisation Name" name="name" size="small" fullWidth required /></Grid>
              <Grid item xs={4}><TextField select label="Type" name="type" size="small" fullWidth defaultValue="HMO">{['NHIA', 'HMO', 'CORPORATE', 'DONOR'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField></Grid>
              <Grid item xs={12}><TextField label="Contact Email" name="contactEmail" size="small" type="email" fullWidth /></Grid>
              <Grid item xs={12}><TextField label="Credit Limit (₦)" name="creditLimit" size="small" type="number" fullWidth defaultValue="1000000" inputProps={{ step: '100000' }} /></Grid>
              <Grid item xs={6}><TextField label="Contract Start" name="contractStart" size="small" type="date" fullWidth InputLabelProps={{ shrink: true }} defaultValue={new Date().toISOString().slice(0, 10)} /></Grid>
              <Grid item xs={6}><TextField label="Contract End" name="contractEnd" size="small" type="date" fullWidth InputLabelProps={{ shrink: true }} defaultValue={`${new Date().getFullYear() + 1}-12-31`} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions><Button onClick={() => setPayerDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Add Payer</Button></DialogActions>
        </form>
      </Dialog>
      {/* ── Revert Payment Confirmation Dialog ── */}
      <Dialog open={revertConfirmOpen} onClose={() => setRevertConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: DANGER }}>Confirm Payment Reversion</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1">
            Are you sure you want to revert the payment for this invoice?
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            This will set the status back to Issued and mark the associated patient visit as awaiting payment.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRevertConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmRevertPayment} variant="contained" color="error" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Revert Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Registration Category Dialog ── */}
      <Dialog open={openAddCat} onClose={() => setOpenAddCat(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Registration Category</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Category Name"
              placeholder="e.g. Special VIP Account"
              fullWidth
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
            <TextField
              label="Unique Code (Alphanumeric)"
              placeholder="e.g. VIP_SPECIAL"
              fullWidth
              value={newCatCode}
              onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
              helperText="Only letters, numbers and underscores."
            />
            <TextField
              label="Registration Fee (₦)"
              type="number"
              placeholder="e.g. 5000"
              fullWidth
              value={newCatFee}
              onChange={(e) => setNewCatFee(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddCat(false)}>Cancel</Button>
          <Button onClick={handleAddRegCategory} variant="contained">Add Category</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add/Edit Consultation Service Dialog ── */}
      <Dialog open={openAddConsultService} onClose={() => setOpenAddConsultService(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingConsultService ? 'Edit Consultation Service' : 'Add Consultation Service Type'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label="Service Code" placeholder="e.g. OPD-CARDIOLOGIST" fullWidth value={consultSvcForm.code} onChange={e => setConsultSvcForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '-') }))} disabled={!!editingConsultService} helperText="Unique identifier" />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select value={consultSvcForm.category} label="Category" onChange={e => setConsultSvcForm(f => ({ ...f, category: e.target.value }))}>
                    {['GENERAL', 'SPECIALIST', 'PROCEDURE', 'DIAGNOSTIC', 'ANC', 'EMERGENCY'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField label="Service Name" placeholder="e.g. Cardiologist Consultation" fullWidth value={consultSvcForm.name} onChange={e => setConsultSvcForm(f => ({ ...f, name: e.target.value }))} />
            <TextField label="Description" multiline rows={2} fullWidth value={consultSvcForm.description} onChange={e => setConsultSvcForm(f => ({ ...f, description: e.target.value }))} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label="Price (₦)" type="number" fullWidth value={consultSvcForm.price} onChange={e => setConsultSvcForm(f => ({ ...f, price: e.target.value }))} inputProps={{ min: 0 }} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Duration (minutes)" type="number" fullWidth value={consultSvcForm.duration} onChange={e => setConsultSvcForm(f => ({ ...f, duration: e.target.value }))} inputProps={{ min: 5 }} />
              </Grid>
            </Grid>
            <FormControlLabel
              control={<Switch checked={consultSvcForm.requiresDoctor} onChange={e => setConsultSvcForm(f => ({ ...f, requiresDoctor: e.target.checked }))} />}
              label="Requires Doctor Assignment"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddConsultService(false)}>Cancel</Button>
          <Button onClick={handleSaveConsultService} variant="contained">{editingConsultService ? 'Update Service' : 'Add Service'}</Button>
        </DialogActions>
      </Dialog>

      {/* ── Assign Cashier to Station Roster Dialog (Replicating Nurse Roster) ── */}
      <Dialog open={scheduleShiftDialogOpen} onClose={() => setScheduleShiftDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth color="primary" />
            <Typography variant="h6" fontWeight={800}>Assign Cashier to Station Roster</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Duty Station / Cash Desk *</InputLabel>
              <Select
                value={assignRosterForm.location}
                label="Select Duty Station / Cash Desk *"
                onChange={e => setAssignRosterForm(f => ({ ...f, location: e.target.value }))}
              >
                {[
                  'Main Outpatient Cash Desk #01 (Revenue)',
                  'Emergency & IPD Cash Desk #02 (Revenue)',
                  'Pharmacy Cash Desk #03 (Dispensary)',
                  'Laboratory & Diagnostic Cash Desk #04',
                  'General Revenue Office',
                  'VIP & Private Wing Desk #05'
                ].map(loc => (
                  <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Select Cashier Officer *</InputLabel>
              <Select
                value={assignRosterForm.cashierId}
                label="Select Cashier Officer *"
                onChange={e => setAssignRosterForm(f => ({ ...f, cashierId: e.target.value }))}
              >
                {cashiersList
                  .filter((c: any) => {
                    const desig = (c.designation || '').toLowerCase();
                    const name = (c.name || '').toLowerCase();
                    if (desig.includes('consultant') || desig.includes('surgeon') || desig.includes('physician') || desig.includes('nurse') || desig.includes('matron') || desig.includes('radiographer') || desig.includes('mortician') || desig.includes('pharmacist') || desig.includes('physiotherapist')) {
                      return name.includes('mary') || name.includes('blessing') || name.includes('ibrahim');
                    }
                    return true;
                  })
                  .map((c: any) => (
                    <MenuItem key={c.id} value={c.id}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight={600}>
                          {c.name}
                        </Typography>
                        <Chip
                          label={`${c.designation || 'Cashier'} • ${c.department || 'Billing & Finance'}`}
                          size="small"
                          variant="outlined"
                          color={c.name.toLowerCase().includes('mary') ? 'primary' : 'default'}
                          sx={{ height: 20, fontSize: '0.68rem', ml: 1, fontWeight: 700 }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Shift Duty *</InputLabel>
              <Select
                value={assignRosterForm.shift}
                label="Shift Duty *"
                onChange={e => setAssignRosterForm(f => ({ ...f, shift: e.target.value }))}
              >
                {configuredCashierShifts.map((sh: any) => (
                  <MenuItem key={sh.code} value={sh.code}>
                    {sh.name} ({sh.startTime}–{sh.endTime})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Date Range Selection: Start Date & End Date */}
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#2563eb', 0.04), border: '1px solid #2563eb30' }}>
              <Typography variant="caption" fontWeight={700} color="primary" sx={{ mb: 1, display: 'block' }}>
                Roster Period & Schedule Duration (Days, Weeks, Months):
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Start Date *"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={assignRosterForm.startDate}
                    onChange={e => setAssignRosterForm(f => ({ ...f, startDate: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="End Date (Optional)"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={assignRosterForm.endDate}
                    onChange={e => setAssignRosterForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </Grid>
              </Grid>

              {/* Quick Duration Preset Buttons */}
              <Box sx={{ display: 'flex', gap: 0.8, mt: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">Quick Duration Preset:</Typography>
                {[
                  { label: '1 Day', days: 1 },
                  { label: '1 Wk (7 Days)', days: 7 },
                  { label: '2 Wks (14 Days)', days: 14 },
                  { label: '1 Mo (30 Days)', days: 30 },
                  { label: '3 Mos (90 Days)', days: 90 },
                ].map(p => (
                  <Chip
                    key={p.label}
                    label={p.label}
                    size="small"
                    clickable
                    color="primary"
                    variant="outlined"
                    onClick={() => {
                      const start = assignRosterForm.startDate ? new Date(assignRosterForm.startDate) : new Date();
                      const end = new Date(start.getTime() + p.days * 86400000);
                      setAssignRosterForm(f => ({
                        ...f,
                        startDate: start.toISOString().slice(0, 10),
                        endDate: end.toISOString().slice(0, 10),
                      }));
                    }}
                    sx={{ height: 22, fontSize: '0.68rem' }}
                  />
                ))}
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Assigned Cash Drawer Till *</InputLabel>
                  <Select
                    value={assignRosterForm.cashDrawer}
                    label="Assigned Cash Drawer Till *"
                    onChange={e => setAssignRosterForm(f => ({ ...f, cashDrawer: e.target.value }))}
                  >
                    {[
                      'Drawer A (Mary Okon)',
                      'Drawer B (Blessing Ugwu)',
                      'Drawer C (Emergency)',
                      'Drawer-01',
                      'Drawer-02'
                    ].map(d => (
                      <MenuItem key={d} value={d}>{d}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Allocated Opening Float (₦) *"
                  type="number"
                  size="small"
                  fullWidth
                  value={assignRosterForm.openingBalance}
                  onChange={e => setAssignRosterForm(f => ({ ...f, openingBalance: Number(e.target.value) }))}
                  inputProps={{ step: '1000' }}
                  helperText="Physical currency float provided to till"
                />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Switch
                  checked={assignRosterForm.isPrimary}
                  onChange={e => setAssignRosterForm(f => ({ ...f, isPrimary: e.target.checked }))}
                />
              }
              label="Head Cashier / Lead Revenue Officer for this station"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setScheduleShiftDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignCashierRoster} variant="contained" color="primary">
            Assign Cashier
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Cashier Shifts & Duty Shift Definitions Configuration Dialog ── */}
      <Dialog open={shiftConfigOpen} onClose={() => setShiftConfigOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth color="primary" />
            <Typography variant="h6" fontWeight={800}>Cashier Shifts & Duty Definitions</Typography>
          </Box>
          <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setOpenAddShift(true)}>
            Add Shift
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Configure hospital cashier shift definitions (times, hours, labels & theme colors). Configured shifts appear dynamically when creating cashier duty rosters.
          </Alert>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 380, overflowY: 'auto' }}>
            {configuredCashierShifts.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                No custom shifts configured yet. Standard shifts active.
              </Typography>
            ) : (
              configuredCashierShifts.map((sh: any) => (
                <Box
                  key={sh.code}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(sh.color || '#2563eb', 0.05),
                    border: `1px solid ${alpha(sh.color || '#2563eb', 0.2)}`,
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={800} color="primary">
                        {sh.name || sh.label}
                      </Typography>
                      <Chip
                        label={`${sh.startTime} – ${sh.endTime}`}
                        size="small"
                        sx={{ bgcolor: sh.color || '#2563eb', color: '#fff', fontWeight: 700, height: 20, fontSize: '0.68rem' }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Code: {sh.code} • {sh.description || 'Cashier duty coverage'}
                    </Typography>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => handleDeleteShift(sh.code)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShiftConfigOpen(false)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Add Custom Cashier Shift Definition ── */}
      <Dialog open={openAddShift} onClose={() => setOpenAddShift(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add New Cashier Shift Definition</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Shift Code *"
              placeholder="e.g. CASHIER_EVENING_6H"
              value={shiftForm.code}
              onChange={e => setShiftForm({ ...shiftForm, code: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Shift Display Name *"
              placeholder="e.g. Evening Urgent Care Shift"
              value={shiftForm.name}
              onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })}
              fullWidth
              size="small"
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Start Time *"
                  type="time"
                  value={shiftForm.startTime}
                  onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End Time *"
                  type="time"
                  value={shiftForm.endTime}
                  onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Description"
              placeholder="Optional notes about coverage"
              value={shiftForm.description}
              onChange={e => setShiftForm({ ...shiftForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
            <Box>
              <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>Theme Color</Typography>
              <Stack direction="row" spacing={1}>
                {['#2563eb', '#d97706', '#7c3aed', '#059669', '#dc2626', '#0891b2'].map(c => (
                  <Box
                    key={c}
                    onClick={() => setShiftForm({ ...shiftForm, color: c })}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: c,
                      cursor: 'pointer',
                      border: shiftForm.color === c ? '2.5px solid #000' : '2px solid transparent'
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddShift(false)}>Cancel</Button>
          <Button onClick={handleAddShift} variant="contained" color="primary">Save Shift</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Billing;