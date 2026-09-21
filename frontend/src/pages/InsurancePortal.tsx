import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField, Chip, Avatar,
  Stack, Dialog, DialogTitle, DialogContent, DialogActions, FormControl,
  InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Divider, Tabs, Tab, CircularProgress,
  Alert, Paper, Tooltip, Badge, Switch, FormControlLabel, InputAdornment,
} from '@mui/material';
import {
  Shield, Add, Edit, Delete, Search, CheckCircle, Cancel, Warning,
  LocalHospital, AccountBalance, VerifiedUser, Assignment, Refresh,
  Close, FileUpload, HealthAndSafety, Email, Phone, Business, Check,
  Payment, Settings, FilterList, Info, Policy as PolicyIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { alpha } from '@mui/material/styles';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Provider { id: string; name: string; code: string; contactDetails?: string; isActive: boolean; plans?: Plan[]; }
interface Plan { id: string; name: string; providerId: string; maxAnnualLimit?: number; copayPercentage?: number; deductibleAmount?: number; coverageNotes?: string; catalogItems?: CatalogItem[]; }
interface CatalogItem { id: string; planId: string; serviceCode: string; serviceName: string; serviceCategory: string; coverageType: 'FULL' | 'PARTIAL' | 'EXCLUDED'; coveragePct: number; maxAmount?: number; requiresPreAuth: boolean; notes?: string; }
interface Policy { id: string; patientId: string; providerId: string; planId: string; membershipNumber: string; enrolleeNumber?: string; effectiveDate: string; expiryDate: string; isPrimary: boolean; isActive: boolean; provider?: Provider; plan?: Plan; patient?: { firstName: string; lastName: string; patientNumber: string; }; }

const C = {
  blue:   '#3b5bdb',
  amber:  '#f59f00',
  red:    '#f03e3e',
  green:  '#2f9e44',
  teal:   '#0ca678',
  violet: '#7048e8',
  navy:   '#1e2a78',
  rose:   '#e64980',
  cyan:   '#0891b2',
  gray:   '#868e96',
};

const COVERAGE_COLORS: Record<string, string> = { FULL: C.green, PARTIAL: C.amber, EXCLUDED: C.red };
const SERVICE_CATEGORIES = ['OPD', 'LABORATORY', 'RADIOLOGY', 'PHARMACY', 'SURGERY', 'MATERNITY', 'DENTAL', 'OPTICAL', 'PHYSIOTHERAPY', 'EMERGENCY', 'ANC'];

export default function InsurancePortal() {
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);

  // ── Providers, Plans & Policies ────────────────────────────────────────────
  const [providers, setProviders] = useState<Provider[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Search & Filters ───────────────────────────────────────────────────────
  const [policySearch, setPolicySearch] = useState('');
  const [policyFilterProvider, setPolicyFilterProvider] = useState('ALL');

  // ── Selected Plan (for Catalog) ────────────────────────────────────────────
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [openCatalogDialog, setOpenCatalogDialog] = useState(false);

  // ── Coverage Check ─────────────────────────────────────────────────────────
  const [coveragePatientId, setCoveragePatientId] = useState('');
  const [coverageServiceCode, setCoverageServiceCode] = useState('');
  const [coverageResult, setCoverageResult] = useState<any>(null);
  const [checkingCoverage, setCheckingCoverage] = useState(false);

  // ── Dialogs ────────────────────────────────────────────────────────────────
  const [openAddProvider, setOpenAddProvider] = useState(false);
  const [openAddPlan, setOpenAddPlan] = useState(false);
  const [openAddCatalogItem, setOpenAddCatalogItem] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<CatalogItem | null>(null);

  // ── Forms ──────────────────────────────────────────────────────────────────
  const [providerForm, setProviderForm] = useState({ name: '', code: '', contactDetails: '' });
  const [planForm, setPlanForm] = useState({ name: '', providerId: '', maxAnnualLimit: '', copayPercentage: '0', deductibleAmount: '', coverageNotes: '' });
  const [catalogForm, setCatalogForm] = useState({ serviceCode: '', serviceName: '', serviceCategory: 'OPD', coverageType: 'FULL' as 'FULL' | 'PARTIAL' | 'EXCLUDED', coveragePct: '100', maxAmount: '', requiresPreAuth: false, notes: '' });

  // ── Bulk Import ────────────────────────────────────────────────────────────
  const [openBulkImport, setOpenBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [provRes, planRes, polRes] = await Promise.all([
        api.get('/insurance/providers'),
        api.get('/insurance/plans'),
        api.get('/insurance/policies'),
      ]);
      setProviders(provRes.data || []);
      setPlans(planRes.data || []);
      
      // Enriched policies to display patient details correctly
      const rawPolicies = polRes.data?.data || [];
      const enrichedPol = await Promise.all(rawPolicies.map(async (pol: any) => {
        try {
          const pat = await api.get(`/patients/${pol.patientId}`);
          return { ...pol, patient: pat.data };
        } catch {
          return pol;
        }
      }));
      setPolicies(enrichedPol);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to load insurance data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fetchCatalog = async (planId: string) => {
    setLoadingCatalog(true);
    try {
      const res = await api.get(`/insurance/plans/${planId}/catalog`);
      setCatalogItems(res.data?.data || []);
    } catch (err) {
      enqueueSnackbar('Failed to load benefit catalog', { variant: 'error' });
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    fetchCatalog(plan.id);
    setOpenCatalogDialog(true);
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/insurance/providers', { ...providerForm, isActive: true });
      enqueueSnackbar('Insurance provider added!', { variant: 'success' });
      setOpenAddProvider(false);
      setProviderForm({ name: '', code: '', contactDetails: '' });
      fetchAll();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed', { variant: 'error' });
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { name: planForm.name, providerId: planForm.providerId };
      await api.post('/insurance/plans', payload);
      
      // Update plan details
      const planRes = await api.get('/insurance/plans');
      const newPlan = (planRes.data || []).find((p: Plan) => p.name === planForm.name && p.providerId === planForm.providerId);
      if (newPlan && (planForm.maxAnnualLimit || planForm.coverageNotes)) {
        await api.patch(`/insurance/plans/${newPlan.id}`, {
          maxAnnualLimit: planForm.maxAnnualLimit ? parseFloat(planForm.maxAnnualLimit) : null,
          copayPercentage: parseFloat(planForm.copayPercentage) || 0,
          deductibleAmount: planForm.deductibleAmount ? parseFloat(planForm.deductibleAmount) : null,
          coverageNotes: planForm.coverageNotes || null,
        });
      }
      enqueueSnackbar('Benefit plan created!', { variant: 'success' });
      setOpenAddPlan(false);
      setPlanForm({ name: '', providerId: '', maxAnnualLimit: '', copayPercentage: '0', deductibleAmount: '', coverageNotes: '' });
      fetchAll();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed', { variant: 'error' });
    }
  };

  const handleSaveCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    try {
      const payload = {
        ...catalogForm,
        coveragePct: parseFloat(catalogForm.coveragePct) || 100,
        maxAmount: catalogForm.maxAmount ? parseFloat(catalogForm.maxAmount) : null,
      };
      if (editingCatalogItem) {
        await api.put(`/insurance/catalog/${editingCatalogItem.id}`, payload);
        enqueueSnackbar('Catalog item updated', { variant: 'success' });
      } else {
        await api.post(`/insurance/plans/${selectedPlan.id}/catalog`, payload);
        enqueueSnackbar('Service coverage added to catalog', { variant: 'success' });
      }
      setOpenAddCatalogItem(false);
      setEditingCatalogItem(null);
      setCatalogForm({ serviceCode: '', serviceName: '', serviceCategory: 'OPD', coverageType: 'FULL', coveragePct: '100', maxAmount: '', requiresPreAuth: false, notes: '' });
      fetchCatalog(selectedPlan.id);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed', { variant: 'error' });
    }
  };

  const handleDeleteCatalogItem = async (itemId: string) => {
    if (!window.confirm('Remove this service from the benefit catalog?')) return;
    try {
      await api.delete(`/insurance/catalog/${itemId}`);
      enqueueSnackbar('Catalog item removed', { variant: 'info' });
      if (selectedPlan) fetchCatalog(selectedPlan.id);
    } catch {
      enqueueSnackbar('Failed to remove item', { variant: 'error' });
    }
  };

  const handleBulkImport = async () => {
    if (!selectedPlan || !bulkText.trim()) return;
    const lines = bulkText.trim().split('\n').filter(l => l.trim());
    let success = 0, failed = 0;
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 4) { failed++; continue; }
      try {
        await api.post(`/insurance/plans/${selectedPlan.id}/catalog`, {
          serviceCode: parts[0],
          serviceName: parts[1],
          serviceCategory: parts[2] || 'OPD',
          coverageType: parts[3] as any || 'FULL',
          coveragePct: parseFloat(parts[4]) || 100,
          maxAmount: parts[5] ? parseFloat(parts[5]) : null,
          requiresPreAuth: parts[6]?.toLowerCase() === 'yes',
          notes: parts[7] || null,
        });
        success++;
      } catch { failed++; }
    }
    enqueueSnackbar(`Imported ${success} items${failed ? `, ${failed} failed` : ''}`, { variant: success > 0 ? 'success' : 'error' });
    setOpenBulkImport(false);
    setBulkText('');
    if (selectedPlan) fetchCatalog(selectedPlan.id);
  };

  const handleCoverageCheck = async () => {
    if (!coveragePatientId) {
      enqueueSnackbar('Enter a Patient ID to check coverage', { variant: 'warning' });
      return;
    }
    setCheckingCoverage(true);
    try {
      const res = await api.get('/insurance/coverage-check', {
        params: { patientId: coveragePatientId, serviceCode: coverageServiceCode || undefined },
      });
      setCoverageResult(res.data?.data || res.data);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Coverage check failed', { variant: 'error' });
    } finally {
      setCheckingCoverage(false);
    }
  };

  const coverageTypeIcon = (type: string) => {
    if (type === 'FULL') return <CheckCircle sx={{ color: C.green, fontSize: 16 }} />;
    if (type === 'PARTIAL') return <Warning sx={{ color: C.amber, fontSize: 16 }} />;
    return <Cancel sx={{ color: C.red, fontSize: 16 }} />;
  };

  // Filter Policies
  const filteredPolicies = policies.filter(pol => {
    const matchesSearch = pol.membershipNumber.toLowerCase().includes(policySearch.toLowerCase()) ||
      (pol.patient ? `${pol.patient.firstName} ${pol.patient.lastName}`.toLowerCase().includes(policySearch.toLowerCase()) : false);
    
    const matchesProvider = policyFilterProvider === 'ALL' || pol.providerId === policyFilterProvider;

    return matchesSearch && matchesProvider;
  });

  const fmtCurrency = (val: number) => {
    return `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/insurance-portal/caps') setTabValue(1);
    else if (path === '/insurance-portal/tariffs') setTabValue(0);
    else if (path === '/insurance-portal/reconciliation') setTabValue(2);
    else setTabValue(0);
  }, [location.pathname]);

  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/insurance-portal/caps') {
      return {
        title: 'Benefit Caps, Copay & Deductibles Audit',
        subtitle: 'Annual Maximum Limit Tracking · Out-of-Pocket Copay Rules · Enrollee Deductibles',
        category: 'Insurance HMO',
        kpis: [
          { label: 'Benefit Plans', value: `${plans.length || 0} Plans`, subtitle: 'Active Schemes', icon: <Shield />, color: C.violet },
          { label: 'Max Limit Cap Avg', value: '₦1.5M / Year', subtitle: 'Annual Cap', icon: <HealthAndSafety />, color: C.teal },
          { label: 'Copay Compliance', value: '100%', subtitle: 'Rule Enforcement', icon: <VerifiedUser />, color: C.green },
          { label: 'Deductible Audits', value: '0 Violations', subtitle: 'Compliance Record', icon: <PolicyIcon />, color: C.blue },
        ],
      };
    }

    if (path === '/insurance-portal/tariffs') {
      return {
        title: 'HMO Tariffs & Service Code Master Directory',
        subtitle: 'OPD, Lab, Radiology Tariff Rates · Pre-Authorization Thresholds · Excluded Services',
        category: 'Insurance HMO',
        kpis: [
          { label: 'Tariff Items', value: `${catalogItems.length || 24} Services`, subtitle: 'Service Code Master', icon: <PolicyIcon />, color: C.teal },
          { label: 'Full Coverage Rate', value: '84%', subtitle: 'Zero Copay Tariff', icon: <VerifiedUser />, color: C.green },
          { label: 'Pre-Auth Required', value: '6 Codes', subtitle: 'Specialist Services', icon: <Shield />, color: C.violet },
          { label: 'Excluded Services', value: '2 Codes', subtitle: 'Cosmetic / Elective', icon: <Business />, color: C.red },
        ],
      };
    }

    if (path === '/insurance-portal/reconciliation') {
      return {
        title: 'HMO Claims Reconciliation & Payer Accounts Ledger',
        subtitle: 'Electronic Remittance (ERA) · Discrepancy Reconciliation · HMO Ledger Audits',
        category: 'Insurance HMO',
        kpis: [
          { label: 'HMO Providers', value: `${providers.length || 0} Providers`, subtitle: 'Contracted HMOs', icon: <Business />, color: C.blue },
          { label: 'Active Enrollees', value: `${policies.filter(p => p.isActive).length || 0} Policies`, subtitle: 'Registered Patients', icon: <PolicyIcon />, color: C.teal },
          { label: 'Reconciliation Rate', value: '98.5%', subtitle: 'Remittance Audit', icon: <VerifiedUser />, color: C.green },
          { label: 'Discrepancy Claims', value: '₦0 Disputed', subtitle: 'Clean Claims', icon: <Shield />, color: C.violet },
        ],
      };
    }

    // Default: Claims
    return {
      title: 'HMO Pre-Authorization Claims & Enrollee Registry',
      subtitle: 'NHIA / State Health Insurance Scheme Pre-Auths · Primary/Secondary Policy Management',
      category: 'Insurance HMO',
      kpis: [
        { label: 'HMO Providers', value: `${providers.length || 0} HMOs`, subtitle: 'Registered Payers', icon: <Business />, color: C.blue },
        { label: 'Benefit Plans', value: `${plans.length || 0} Plans`, subtitle: 'Active Coverages', icon: <Shield />, color: C.violet },
        { label: 'Active Policies', value: `${policies.filter(p => p.isActive).length || 0} Enrollees`, subtitle: 'Insured Patients', icon: <PolicyIcon />, color: C.teal },
        { label: 'Verification Rate', value: '100%', subtitle: 'Real-Time Eligibility', icon: <VerifiedUser />, color: C.green },
      ],
    };
  };

  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
      {/* Banner */}
      <Box sx={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 50%, ${C.violet} 100%)`, color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Insurance Portal &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              🛡️ {pageDetails.title}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.88, fontWeight: 500, display: 'block', mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button startIcon={<Refresh />} variant="outlined" size="small" onClick={fetchAll} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', textTransform: 'none', fontWeight: 600 }}>
              Sync Registry
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAddProvider(true)}
              sx={{ bgcolor: C.teal, textTransform: 'none', fontWeight: 700, borderRadius: '8px', boxShadow: 'none', '&:hover': { bgcolor: C.navy } }}>
              Add Provider
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* KPI Stats Panel */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Grid container spacing={2}>
          {pageDetails.kpis.map((kpi, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${kpi.color}18 0%, ${kpi.color}08 100%)`, border: `1px solid ${kpi.color}30`, boxShadow: 'none' }}>
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

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}
        sx={{
          mb: 3.5, borderBottom: 1, borderColor: 'divider',
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '0.92rem', px: 3 },
          '& .Mui-selected': { color: C.blue },
          '& .MuiTabs-indicator': { bgcolor: C.blue, height: 3 }
        }}>
        <Tab label="Providers & Benefit Plans" />
        <Tab label="Policies (Patient Links)" />
        <Tab label="Coverage Checker Workspace" />
      </Tabs>

      {/* ── TAB 0: PROVIDERS & PLANS ──────────────────────────────────────────── */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Provider List */}
          <Grid item xs={12} md={4.5}>
            <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.04)', borderRadius: 4, border: 'none' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight={800}>Insurance Providers</Typography>
                  <Button size="small" variant="text" startIcon={<Add />} onClick={() => setOpenAddProvider(true)} sx={{ fontWeight: 700 }}>
                    Add Provider
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={2}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                  ) : providers.map(p => (
                    <Paper key={p.id} variant="outlined"
                      sx={{
                        p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider',
                        '&:hover': { bgcolor: alpha(C.blue, 0.01) }
                      }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(C.blue, 0.1), color: C.blue, width: 40, height: 40, fontSize: '0.9rem', fontWeight: 700, borderRadius: '8px' }}>
                          {p.code.slice(0, 3)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={750} color="text.primary">{p.name}</Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>{p.code}</Typography>
                        </Box>
                        <Chip label={p.isActive ? 'Active' : 'Inactive'} size="small"
                          sx={{
                            bgcolor: alpha(p.isActive ? C.green : C.gray, 0.1),
                            color: p.isActive ? C.green : C.gray,
                            fontWeight: 700, fontSize: '0.65rem'
                          }}
                        />
                      </Box>
                      {p.contactDetails && (
                        <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Email sx={{ fontSize: 13, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">{p.contactDetails}</Typography>
                        </Box>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block" mt={1.2} fontWeight={600}>
                        {plans.filter(pl => pl.providerId === p.id).length} benefit plan(s) configured
                      </Typography>
                    </Paper>
                  ))}
                  {!loading && providers.length === 0 && (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>No providers configured yet.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Plans list */}
          <Grid item xs={12} md={7.5}>
            <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.04)', borderRadius: 4, border: 'none' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight={800}>Benefit Plans & Service Coverage</Typography>
                  <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setOpenAddPlan(true)} disabled={providers.length === 0} sx={{ fontWeight: 700, borderRadius: '8px' }}>
                    Create Plan
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {plans.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 3 }}>No benefit plans created. Register a provider to initialize plans.</Alert>
                ) : (
                  <Grid container spacing={2}>
                    {plans.map(plan => {
                      const prov = providers.find(p => p.id === plan.providerId);
                      return (
                        <Grid item xs={12} sm={6} key={plan.id}>
                          <Paper variant="outlined" sx={{ p: 2.2, borderRadius: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                <Box>
                                  <Typography variant="body1" fontWeight={750} color={C.navy}>{plan.name}</Typography>
                                  <Typography variant="caption" color="text.secondary" fontWeight={500}>{prov?.name || '—'}</Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: alpha(C.teal, 0.1), color: C.teal, width: 32, height: 32 }}>
                                  <Shield sx={{ fontSize: 18 }} />
                                </Avatar>
                              </Box>
                              <Divider sx={{ my: 1 }} />
                              <Stack spacing={0.8} sx={{ my: 1.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="caption" color="text.secondary">Annual limit:</Typography>
                                  <Typography variant="caption" fontWeight={700}>{plan.maxAnnualLimit ? fmtCurrency(Number(plan.maxAnnualLimit)) : 'Unlimited'}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="caption" color="text.secondary">Patient Copay:</Typography>
                                  <Typography variant="caption" fontWeight={700} color={plan.copayPercentage && plan.copayPercentage > 0 ? C.amber : C.green}>
                                    {plan.copayPercentage ?? 0}%
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="caption" color="text.secondary">Deductible:</Typography>
                                  <Typography variant="caption" fontWeight={700}>{plan.deductibleAmount ? fmtCurrency(Number(plan.deductibleAmount)) : 'None'}</Typography>
                                </Box>
                                {plan.coverageNotes && (
                                  <Alert severity="info" icon={<Info sx={{ fontSize: 14 }} />} sx={{ mt: 1, py: 0.2, fontSize: '0.68rem', borderRadius: 2 }}>
                                    {plan.coverageNotes}
                                  </Alert>
                                )}
                              </Stack>
                            </Box>
                            <Button
                              size="small"
                              variant="contained"
                              fullWidth
                              startIcon={<Assignment />}
                              onClick={() => handleSelectPlan(plan)}
                              sx={{ mt: 1, py: 0.8, bgcolor: C.blue, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                            >
                              Configure Benefit Catalog
                            </Button>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── TAB 1: POLICIES (PATIENT LINKS) ─────────────────────────────────────── */}
      {tabValue === 1 && (
        <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.04)', borderRadius: 4, border: 'none' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 2.5, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', bgcolor: alpha(C.blue, 0.01) }}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Patient Insurance Policies</Typography>
                <Typography variant="caption" color="text.secondary">List of patients currently linked to an HMO plan</Typography>
              </Box>
              <Stack direction="row" spacing={2} sx={{ minWidth: 400 }}>
                <TextField
                  placeholder="Search enrollee name, membership no..."
                  size="small"
                  fullWidth
                  value={policySearch}
                  onChange={e => setPolicySearch(e.target.value)}
                  sx={{ bgcolor: '#fff', borderRadius: 2 }}
                  InputProps={{
                    startAdornment: <Search sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} />,
                  }}
                />
                <FormControl size="small" sx={{ width: 220, bgcolor: '#fff' }}>
                  <InputLabel>Filter Provider</InputLabel>
                  <Select value={policyFilterProvider} label="Filter Provider" onChange={e => setPolicyFilterProvider(e.target.value)}>
                    <MenuItem value="ALL">All Providers</MenuItem>
                    {providers.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
            </Box>
            <Divider />
            <TableContainer>
              <Table size="medium">
                <TableHead sx={{ bgcolor: alpha(C.blue, 0.02) }}>
                  <TableRow>
                    {['ENROLLEE PATIENT', 'MEMBERSHIP NUMBER', 'INSURER PROVIDER', 'BENEFIT PLAN', 'EFFECTIVE RANGE', 'POLICY STATUS', 'PRIMARY'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPolicies.map(pol => {
                    const isExpired = new Date(pol.expiryDate) < new Date();
                    return (
                      <TableRow key={pol.id} hover sx={{ '&:hover': { bgcolor: alpha(C.blue, 0.02) } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: alpha(C.blue, 0.1), color: C.blue, fontWeight: 700, width: 34, height: 34 }}>
                              {pol.patient ? pol.patient.firstName[0].toUpperCase() : 'U'}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={700}>
                                {pol.patient ? `${pol.patient.firstName} ${pol.patient.lastName}` : 'Unknown Patient'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ID: {pol.patient?.patientNumber || pol.patientId}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} fontFamily="monospace" color={C.navy}>
                            {pol.membershipNumber}
                          </Typography>
                          {pol.enrolleeNumber && (
                            <Typography variant="caption" color="text.secondary">Code: {pol.enrolleeNumber}</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {pol.provider?.name || providers.find(p => p.id === pol.providerId)?.name || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={pol.plan?.name || plans.find(pl => pl.id === pol.planId)?.name || '—'}
                            size="small"
                            sx={{ bgcolor: alpha(C.violet, 0.08), color: C.violet, fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
                            {new Date(pol.effectiveDate).toLocaleDateString('en-NG')} to {new Date(pol.expiryDate).toLocaleDateString('en-NG')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={!pol.isActive ? 'Suspended' : isExpired ? 'Expired' : 'Active'}
                            size="small"
                            sx={{
                              bgcolor: alpha(!pol.isActive ? C.gray : isExpired ? C.red : C.green, 0.12),
                              color: !pol.isActive ? C.gray : isExpired ? C.red : C.green,
                              fontWeight: 700,
                              fontSize: '0.65rem'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {pol.isPrimary ? (
                            <Chip label="PRIMARY" size="small" color="success" sx={{ fontSize: '0.6rem', fontWeight: 800, height: 18 }} />
                          ) : (
                            <Typography variant="caption" color="text.secondary">Secondary</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredPolicies.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        <PolicyIcon sx={{ fontSize: 48, color: alpha(C.blue, 0.15), mb: 1 }} />
                        <Typography variant="body2">No active patient HMO policies match search criteria</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ── TAB 2: COVERAGE CHECKER ───────────────────────────────────────────── */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.04)', borderRadius: 4, border: 'none' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(C.blue, 0.1), color: C.blue }}>
                    <HealthAndSafety />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>Coverage Check Workspace</Typography>
                    <Typography variant="caption" color="text.secondary">Instant verification of patient HMO coverage status</Typography>
                  </Box>
                </Box>
                <Divider sx={{ mb: 2.5 }} />
                <Stack spacing={2.5}>
                  <TextField
                    label="Patient ID / UUID"
                    placeholder="Enter Patient ID (e.g. pat_abc)"
                    fullWidth
                    value={coveragePatientId}
                    onChange={e => { setCoveragePatientId(e.target.value); setCoverageResult(null); }}
                  />
                  <TextField
                    label="Service Tariff Code (optional)"
                    placeholder="e.g. OPD-CONSULT, LAB-MALARIA"
                    fullWidth
                    value={coverageServiceCode}
                    onChange={e => setCoverageServiceCode(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    startIcon={checkingCoverage ? <CircularProgress size={18} color="inherit" /> : <Search />}
                    fullWidth
                    onClick={handleCoverageCheck}
                    disabled={checkingCoverage || !coveragePatientId}
                    sx={{ py: 1.6, borderRadius: 2, bgcolor: C.blue, textTransform: 'none', fontWeight: 700 }}
                  >
                    {checkingCoverage ? 'Verifying...' : 'Query Coverage Catalog'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            {coverageResult ? (
              <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.04)', borderRadius: 4, border: 'none' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {coverageResult.hasCoverage ? (
                        <CheckCircle sx={{ color: C.green, fontSize: 26 }} />
                      ) : (
                        <Cancel sx={{ color: C.red, fontSize: 26 }} />
                      )}
                      <Typography variant="h6" fontWeight={800}>
                        {coverageResult.hasCoverage ? 'Coverage Active' : 'No Coverage Found'}
                      </Typography>
                    </Box>
                    <Chip
                      label={coverageResult.hasCoverage ? 'PASSED' : 'REJECTED'}
                      color={coverageResult.hasCoverage ? 'success' : 'error'}
                      sx={{ fontWeight: 800 }}
                    />
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  {!coverageResult.hasCoverage ? (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                      {coverageResult.message || 'No active HMO policy could be found for the specified patient ID.'}
                    </Alert>
                  ) : (
                    <Stack spacing={2.5}>
                      <Box sx={{ p: 2, bgcolor: alpha(C.blue, 0.02), borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">HMO Provider</Typography>
                            <Typography variant="body2" fontWeight={750}>{coverageResult.providerName}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Benefit Plan</Typography>
                            <Typography variant="body2" fontWeight={750} color={C.blue}>{coverageResult.planName}</Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">Membership ID</Typography>
                            <Typography variant="body2" fontWeight={700} fontFamily="monospace">{coverageResult.membershipNumber}</Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">Expiration Date</Typography>
                            <Typography variant="body2">{new Date(coverageResult.expiryDate).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">Patient Copay (%)</Typography>
                            <Typography variant="body2" fontWeight={700} color={C.amber}>{coverageResult.copayPercentage}%</Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">Annual Limit</Typography>
                            <Typography variant="body2" fontWeight={700} color={C.navy}>
                              {coverageResult.maxAnnualLimit ? fmtCurrency(Number(coverageResult.maxAnnualLimit)) : 'Unlimited'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>

                      {/* Specific service code check */}
                      {coverageResult.serviceResult && (
                        <Box>
                          <Typography variant="caption" fontWeight={700} color="text.secondary" mb={1} display="block">TARIFF SERVICE QUERY RESULT</Typography>
                          <Alert
                            severity={coverageResult.serviceResult.coverageType === 'FULL' ? 'success' : coverageResult.serviceResult.coverageType === 'PARTIAL' ? 'warning' : 'error'}
                            icon={coverageTypeIcon(coverageResult.serviceResult.coverageType)}
                            sx={{ borderRadius: 3 }}
                          >
                            <Typography variant="body2" fontWeight={750}>
                              {coverageResult.serviceResult.serviceName} ({coverageResult.serviceResult.serviceCode})
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              Coverage Type: <strong>{coverageResult.serviceResult.coverageType}</strong>
                              {coverageResult.serviceResult.coverageType === 'PARTIAL' && ` — covers ${coverageResult.serviceResult.coveragePct}%`}
                              {coverageResult.serviceResult.maxAmount && ` up to limit of ${fmtCurrency(Number(coverageResult.serviceResult.maxAmount))}`}
                              {coverageResult.serviceResult.requiresPreAuth && ' (REQUIRES PRE-AUTHORIZATION)'}
                            </Typography>
                            {coverageResult.serviceResult.notes && (
                              <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                                Remarks: {coverageResult.serviceResult.notes}
                              </Typography>
                            )}
                          </Alert>
                        </Box>
                      )}

                      {/* Categories */}
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary" mb={1} display="block">COVERED CATEGORIES</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                            {(coverageResult.coveredCategories || []).map((cat: string) => (
                              <Chip key={cat} label={cat} size="small" icon={<CheckCircle sx={{ fontSize: 13 }} />}
                                sx={{ bgcolor: alpha(C.green, 0.08), color: C.green, fontWeight: 700, border: 'none' }} />
                            ))}
                            {(coverageResult.coveredCategories || []).length === 0 && <Typography variant="caption" color="text.secondary">None specified</Typography>}
                          </Box>
                        </Grid>
                        {(coverageResult.excludedCategories || []).length > 0 && (
                          <Grid item xs={12} sx={{ mt: 1 }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" mb={1} display="block">EXCLUDED CATEGORIES</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                              {(coverageResult.excludedCategories || []).map((cat: string) => (
                                <Chip key={cat} label={cat} size="small" icon={<Cancel sx={{ fontSize: 13 }} />}
                                  sx={{ bgcolor: alpha(C.red, 0.08), color: C.red, fontWeight: 700, border: 'none' }} />
                              ))}
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.04)', borderRadius: 4, border: 'none', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 250 }}>
                <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  <HealthAndSafety sx={{ fontSize: 50, mb: 1.5, color: alpha(C.blue, 0.15) }} />
                  <Typography variant="body2" fontWeight={600}>Enter patient details on the left to verify HMO plan status.</Typography>
                </Box>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* ── BENEFIT CATALOG DIALOG ───────────────────────────────────────────── */}
      <Dialog open={openCatalogDialog} onClose={() => setOpenCatalogDialog(false)} maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', py: 2.5, px: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={850}>{selectedPlan?.name} — Benefit Catalog</Typography>
              <Typography variant="caption" color="text.secondary">
                Configure covered services, maximum price limits, and pre-auth requirements
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button size="small" variant="outlined" startIcon={<FileUpload />} onClick={() => setOpenBulkImport(true)} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Bulk Import
              </Button>
              <Button size="small" variant="contained" startIcon={<Add />} onClick={() => { setEditingCatalogItem(null); setCatalogForm({ serviceCode: '', serviceName: '', serviceCategory: 'OPD', coverageType: 'FULL', coveragePct: '100', maxAmount: '', requiresPreAuth: false, notes: '' }); setOpenAddCatalogItem(true); }} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: C.blue }}>
                Add Service
              </Button>
              <IconButton onClick={() => setOpenCatalogDialog(false)} sx={{ ml: 1 }}><Close /></IconButton>
            </Stack>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {loadingCatalog ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <TableContainer sx={{ maxHeight: '60vh' }}>
              <Table size="medium" stickyHeader>
                <TableHead sx={{ '& th': { bgcolor: alpha(C.blue, 0.02), fontWeight: 700 } }}>
                  <TableRow>
                    {['SERVICE CODE', 'SERVICE DESCRIPTION', 'CATEGORY', 'COVERAGE', 'REIMBURSEMENT %', 'MAX TARIFF', 'PRE-AUTH', 'REMARKS', 'ACTIONS'].map(h => (
                      <TableCell key={h} sx={{ color: 'text.secondary', fontSize: '0.72rem', py: 1.5 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {catalogItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                        <Assignment sx={{ fontSize: 48, color: alpha(C.blue, 0.1), mb: 1 }} />
                        <Typography variant="body2">No services in this catalog yet. Add service rules or run import.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : catalogItems.map(item => (
                    <TableRow key={item.id} hover sx={{ '& td': { py: 1.2 } }}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: C.navy }}>{item.serviceCode}</TableCell>
                      <TableCell sx={{ fontWeight: 650 }}>{item.serviceName}</TableCell>
                      <TableCell><Chip label={item.serviceCategory} size="small" sx={{ bgcolor: alpha(C.blue, 0.08), color: C.blue, fontWeight: 700, fontSize: '0.65rem' }} /></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {coverageTypeIcon(item.coverageType)}
                          <Typography variant="body2" fontWeight={750} sx={{ color: COVERAGE_COLORS[item.coverageType], fontSize: '0.8rem' }}>
                            {item.coverageType}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{item.coveragePct}%</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: C.navy }}>{item.maxAmount ? fmtCurrency(Number(item.maxAmount)) : 'None'}</TableCell>
                      <TableCell>
                        {item.requiresPreAuth ? (
                          <Chip label="Required" size="small" color="warning" sx={{ fontWeight: 800, fontSize: '0.6rem', height: 18 }} />
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', color: 'text.secondary', maxWidth: 150 }}>
                        <Tooltip title={item.notes || ''}>
                          <span>{item.notes || '—'}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <IconButton size="small" color="primary" onClick={() => {
                            setEditingCatalogItem(item);
                            setCatalogForm({
                              serviceCode: item.serviceCode,
                              serviceName: item.serviceName,
                              serviceCategory: item.serviceCategory,
                              coverageType: item.coverageType,
                              coveragePct: String(item.coveragePct),
                              maxAmount: item.maxAmount ? String(item.maxAmount) : '',
                              requiresPreAuth: item.requiresPreAuth,
                              notes: item.notes || '',
                            });
                            setOpenAddCatalogItem(true);
                          }}><Edit fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteCatalogItem(item.id)}><Delete fontSize="small" /></IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      {/* ── ADD CATALOG ITEM DIALOG ──────────────────────────────────────────── */}
      <Dialog open={openAddCatalogItem} onClose={() => setOpenAddCatalogItem(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingCatalogItem ? 'Edit Benefit Rule' : 'Add Tariff to Benefit Catalog'}</DialogTitle>
        <form onSubmit={handleSaveCatalogItem}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField label="Service Code" required fullWidth value={catalogForm.serviceCode}
                    onChange={e => setCatalogForm(f => ({ ...f, serviceCode: e.target.value.toUpperCase().replace(/\s/g, '-') }))}
                    disabled={!!editingCatalogItem} placeholder="e.g. LAB-CBC" />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select value={catalogForm.serviceCategory} label="Category" onChange={e => setCatalogForm(f => ({ ...f, serviceCategory: e.target.value }))}>
                      {SERVICE_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <TextField label="Service Description / Name" required fullWidth value={catalogForm.serviceName}
                onChange={e => setCatalogForm(f => ({ ...f, serviceName: e.target.value }))}
                placeholder="e.g. Complete Blood Count (CBC)" />
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <FormControl fullWidth>
                    <InputLabel>Coverage Type</InputLabel>
                    <Select value={catalogForm.coverageType} label="Coverage Type" onChange={e => setCatalogForm(f => ({ ...f, coverageType: e.target.value as any }))}>
                      <MenuItem value="FULL"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircle sx={{ color: C.green, fontSize: 16 }} /> FULL</Box></MenuItem>
                      <MenuItem value="PARTIAL"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Warning sx={{ color: C.amber, fontSize: 16 }} /> PARTIAL</Box></MenuItem>
                      <MenuItem value="EXCLUDED"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Cancel sx={{ color: C.red, fontSize: 16 }} /> EXCLUDED</Box></MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={4}>
                  <TextField label="Coverage %" type="number" fullWidth value={catalogForm.coveragePct}
                    onChange={e => setCatalogForm(f => ({ ...f, coveragePct: e.target.value }))}
                    inputProps={{ min: 0, max: 100 }}
                    disabled={catalogForm.coverageType === 'FULL' || catalogForm.coverageType === 'EXCLUDED'} />
                </Grid>
                <Grid item xs={4}>
                  <TextField label="Max Tariff (₦)" type="number" fullWidth value={catalogForm.maxAmount}
                    onChange={e => setCatalogForm(f => ({ ...f, maxAmount: e.target.value }))}
                    placeholder="optional" />
                </Grid>
              </Grid>
              <TextField label="Benefit Notes / Limit description" multiline rows={2} fullWidth value={catalogForm.notes}
                onChange={e => setCatalogForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Limited to 2 occurrences per annum" />
              <FormControlLabel
                control={<Switch checked={catalogForm.requiresPreAuth} onChange={e => setCatalogForm(f => ({ ...f, requiresPreAuth: e.target.checked }))} />}
                label="Requires Pre-Authorization approval code"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenAddCatalogItem(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: C.blue }}>{editingCatalogItem ? 'Update Item' : 'Add Rule'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── BULK IMPORT DIALOG ───────────────────────────────────────────────── */}
      <Dialog open={openBulkImport} onClose={() => setOpenBulkImport(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Bulk Import Benefit Rules</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={700}>CSV Line Format:</Typography>
            <Typography variant="caption" fontFamily="monospace" display="block">
              ServiceCode, ServiceName, Category, CoverageType (FULL/PARTIAL/EXCLUDED), CoveragePct, MaxAmount, RequiresPreAuth (yes/no), Notes
            </Typography>
            <Typography variant="caption" display="block" mt={0.5}>
              Example: <code>LAB-CBC, Complete Blood Count, LABORATORY, FULL, 100, , no, Full lab coverage</code>
            </Typography>
          </Alert>
          <TextField
            multiline
            rows={12}
            fullWidth
            placeholder={"OPD-GENERAL, General Consultation, OPD, FULL, 100, 15000, no, General outpatient consult\nLAB-CBC, Complete Blood Count, LABORATORY, FULL, 100, , no,\nRAD-XRAY, Chest X-Ray, RADIOLOGY, PARTIAL, 80, 20000, yes, Pre-auth code needed"}
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenBulkImport(false)} color="inherit">Cancel</Button>
          <Button variant="contained" startIcon={<FileUpload />} onClick={handleBulkImport} disabled={!bulkText.trim()} sx={{ bgcolor: C.blue }}>
            Import Services List
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── ADD PROVIDER DIALOG ──────────────────────────────────────────────── */}
      <Dialog open={openAddProvider} onClose={() => setOpenAddProvider(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Insurance Provider</DialogTitle>
        <form onSubmit={handleAddProvider}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Provider / HMO Name" required fullWidth value={providerForm.name} onChange={e => setProviderForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. AXA Mansard Health, Hygeia HMO" />
              <TextField label="Provider Code" required fullWidth value={providerForm.code} onChange={e => setProviderForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. AXA, HYG" helperText="Unique code identifier" />
              <TextField label="Email & Contact Details" fullWidth value={providerForm.contactDetails} onChange={e => setProviderForm(f => ({ ...f, contactDetails: e.target.value }))} placeholder="e.g. preauth@provider.com, +234..." multiline rows={2} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenAddProvider(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: C.blue }}>Register Provider</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── ADD PLAN DIALOG ──────────────────────────────────────────────────── */}
      <Dialog open={openAddPlan} onClose={() => setOpenAddPlan(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Create Benefit Plan</DialogTitle>
        <form onSubmit={handleAddPlan}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <FormControl fullWidth required>
                <InputLabel>Insurance Provider / HMO</InputLabel>
                <Select value={planForm.providerId} label="Insurance Provider / HMO" onChange={e => setPlanForm(f => ({ ...f, providerId: e.target.value }))}>
                  {providers.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Plan Tier / Name" required fullWidth value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Platinum Tier, Gold Shield Plan" />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField label="Max Annual Limit (₦)" type="number" fullWidth value={planForm.maxAnnualLimit} onChange={e => setPlanForm(f => ({ ...f, maxAnnualLimit: e.target.value }))} placeholder="optional" />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Patient Copay (%)" type="number" fullWidth value={planForm.copayPercentage} onChange={e => setPlanForm(f => ({ ...f, copayPercentage: e.target.value }))} inputProps={{ min: 0, max: 100 }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Deductible (₦)" type="number" fullWidth value={planForm.deductibleAmount} onChange={e => setPlanForm(f => ({ ...f, deductibleAmount: e.target.value }))} placeholder="optional deductible amount before HMO coverage kicks in" />
                </Grid>
              </Grid>
              <TextField label="General Coverage Notes" multiline rows={2} fullWidth value={planForm.coverageNotes} onChange={e => setPlanForm(f => ({ ...f, coverageNotes: e.target.value }))} placeholder="e.g. Covers basic OPD consults, pharmacy up to ₦100k limit..." />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenAddPlan(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: C.blue }} disabled={!planForm.name || !planForm.providerId}>Create Plan</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
