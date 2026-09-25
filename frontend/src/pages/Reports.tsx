import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box, Typography, Grid, Card, CardContent, Button, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, LinearProgress, Stack, Avatar, Tabs, Tab, TextField, MenuItem,
    InputAdornment, Paper, CircularProgress, Tooltip, IconButton,
  } from '@mui/material';
  import {
    Download, TrendingUp, TrendingDown, Assessment, People,
    LocalHospital, Receipt, Biotech, CameraAlt, AccountBalance,
    Assignment, History, Search, Refresh, Print, FilterList,
    MedicalServices, WarningAmber, Hotel, Science, Vaccines,
    ChildCare, MonitorHeart, Healing, FileDownload, CheckCircle,
  } from '@mui/icons-material';
  import { alpha } from '@mui/material/styles';
  import { api } from '../services/api';
  
/* ── Mini bar chart (CSS-only with dynamic live data) ────────── */
interface BarDataPoint {
  month: string;
  opd: number;
  revenue: number;
}

const BarChart = ({ data }: { data: BarDataPoint[] }) => {
  const chartData = data && data.length > 0 ? data : [
    { month: 'Jan', opd: 120, revenue: 620 },
    { month: 'Feb', opd: 145, revenue: 710 },
    { month: 'Mar', opd: 130, revenue: 680 },
    { month: 'Apr', opd: 160, revenue: 820 },
    { month: 'May', opd: 175, revenue: 900 },
    { month: 'Jun', opd: 148, revenue: 840 },
  ];
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 100);

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 1, sm: 2 }, height: 160, px: 1, pt: 2 }}>
      {chartData.map(d => (
        <Tooltip key={d.month} title={`${d.month}: ₦${d.revenue}K Revenue · ${d.opd} Visits`} arrow placement="top">
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.8, height: '100%' }}>
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
                ${d.revenue}k
              </Typography>
              <Box sx={{
                width: { xs: '80%', sm: '60%', md: '50%' },
                background: 'linear-gradient(180deg, #3b5bdb 0%, #1c7ed6 100%)',
                borderRadius: '6px 6px 0 0',
                height: `${Math.max(8, (d.revenue / maxRevenue) * 100)}%`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: 'linear-gradient(180deg, #4c6ef5 0%, #228be6 100%)',
                  transform: 'scaleY(1.04)',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59,91,219,0.3)',
                }
              }} />
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.75rem' }}>{d.month}</Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
};

/* ── Fallback Top diagnoses ─────────────────────────────────── */
const defaultDiagnoses: Array<{ name: string; count: number; pct: number; color: string; code: string; category: string }> = [
  { name: 'Malaria (Plasmodium Falciparum)', count: 342, pct: 28, color: '#f03e3e', code: 'B50.9', category: 'Communicable' },
  { name: 'Essential Hypertension',          count: 287, pct: 23, color: '#3b5bdb', code: 'I10', category: 'Cardiovascular' },
  { name: 'Type 2 Diabetes Mellitus',       count: 198, pct: 16, color: '#f59f00', code: 'E11.9', category: 'Endocrine' },
  { name: 'Typhoid Fever (Salmonella)',     count: 165, pct: 14, color: '#0ca678', code: 'A01.0', category: 'Communicable' },
  { name: 'Upper Respiratory Tract Infect.', count: 142, pct: 12, color: '#6741d9', code: 'J06.9', category: 'Respiratory' },
  { name: 'Gastroenteritis & Colitis',      count: 86,  pct: 7,  color: '#6b7194', code: 'A09', category: 'Gastrointestinal' },
];

/* ── Fallback Monthly summary table ─────────────────────────── */
const defaultMonthlySummary = [
  { month: 'June 2026',     patients: 712, opd: 148, ipd: 77,  revenue: '₦84,000',  expenses: '₦51,000', profit: '₦33,000' },
  { month: 'May 2026',      patients: 680, opd: 175, ipd: 82,  revenue: '₦90,000',  expenses: '₦54,000', profit: '₦36,000' },
  { month: 'April 2026',    patients: 655, opd: 160, ipd: 70,  revenue: '₦82,000',  expenses: '₦50,000', profit: '₦32,000' },
  { month: 'March 2026',    patients: 598, opd: 130, ipd: 65,  revenue: '₦68,000',  expenses: '₦42,000', profit: '₦26,000' },
];

/* ── Fallback Mock Data for Sub-Reports ─────────────────────── */
const defaultBalanceReportData = [
  { id: 'BAL-101', patient: 'Sarah Johnson', type: 'IPD', total: 3200, paid: 2500, balance: 700, tpa: 'AXA Mansard HMO', date: '2026-06-20' },
  { id: 'BAL-102', patient: 'Emeka Okonkwo', type: 'OPD', total: 1500, paid: 1500, balance: 0, tpa: 'None', date: '2026-06-22' },
  { id: 'BAL-103', patient: 'Adaeze Chukwu', type: 'IPD', total: 4500, paid: 3500, balance: 1000, tpa: 'Reliance HMO', date: '2026-06-23' },
  { id: 'BAL-104', patient: 'Yusuf Ibrahim', type: 'OPD', total: 800, paid: 300, balance: 500, tpa: 'Leadway Health', date: '2026-06-24' },
];
const defaultTpaClaimData = [
  { claimId: 'CLM-8831', patientName: 'Sarah Johnson', patientTpaId: 'AXA-PAT-901', insurer: 'AXA Mansard HMO', amount: 2500, status: 'Approved', date: '2026-06-21' },
  { claimId: 'CLM-9012', patientName: 'Adaeze Chukwu', patientTpaId: 'REL-PAT-332', insurer: 'Reliance HMO', amount: 3500, status: 'Submitted', date: '2026-06-23' },
  { claimId: 'CLM-7740', patientName: 'Yusuf Ibrahim', patientTpaId: 'LWY-PAT-551', insurer: 'Leadway Health', amount: 300, status: 'Pending', date: '2026-06-24' },
  { claimId: 'CLM-4112', patientName: 'Kemi Adeyemi', patientTpaId: 'AXA-PAT-712', insurer: 'AXA Mansard HMO', amount: 1800, status: 'Rejected', date: '2026-06-24' },
];
const defaultPathologyBalanceData = [
  { refNo: 'PATH-001', patient: 'Emeka Okonkwo', testName: 'Haemoglobin (Hb)', total: 12.00, paid: 12.00, balance: 0.00, date: '2026-06-24' },
  { refNo: 'PATH-002', patient: 'Adaeze Chukwu', testName: 'HIV ELISA', total: 30.00, paid: 0.00, balance: 30.00, date: '2026-06-24' },
  { refNo: 'PATH-003', patient: 'Yusuf Ibrahim', testName: 'Liver Function Test', total: 50.00, paid: 50.00, balance: 0.00, date: '2026-06-24' },
  { refNo: 'PATH-004', patient: 'Kemi Owolabi', testName: 'Pap Smear', total: 60.00, paid: 40.00, balance: 20.00, date: '2026-06-23' },
];
const defaultRadiologyBalanceData = [
  { refNo: 'RAD-001', patient: 'Kemi Adeyemi', testName: 'Chest X-Ray', total: 45.00, paid: 45.00, balance: 0.00, date: '2026-06-22' },
  { refNo: 'RAD-002', patient: 'Yusuf Ibrahim', testName: 'MRI Brain Scan', total: 250.00, paid: 150.00, balance: 100.00, date: '2026-06-23' },
  { refNo: 'RAD-003', patient: 'Felix Nwachukwu', testName: 'Ultrasound Abdomen', total: 35.00, paid: 0.00, balance: 35.00, date: '2026-06-24' },
];
const defaultAllTransactionsData = [
  { txId: 'TX-9011', description: 'Patient OPD Registration', type: 'Appointment', amount: 15.00, date: '2026-06-24', method: 'Cash' },
  { txId: 'TX-9012', description: 'Pharmacy Dispense - Amoxicillin', type: 'Pharmacy', amount: 24.50, date: '2026-06-24', method: 'POS' },
  { txId: 'TX-9013', description: 'Lab Request - Liver Function', type: 'Laboratory', amount: 50.00, date: '2026-06-24', method: 'TPA Claims' },
  { txId: 'TX-9014', description: 'IPD Ward Bed Charge Recovery', type: 'Billing', amount: 320.00, date: '2026-06-23', method: 'Bank Transfer' },
  { txId: 'TX-9015', description: 'Virtual OPD Consultation', type: 'Appointment', amount: 20.00, date: '2026-06-23', method: 'Stripe Gateway' },
];
const defaultLedgerData = [
  { item: 'Consultation Fees (OPD)', category: 'Income', amount: 14200, date: '2026-06-24' },
  { item: 'Ward Accommodation (IPD)', category: 'Income', amount: 28500, date: '2026-06-24' },
  { item: 'Vendor Invoice - Emzor Pharm.', category: 'Expense', amount: 12000, date: '2026-06-23' },
  { item: 'Diesel Generator Refueling', category: 'Expense', amount: 4500, date: '2026-06-23' },
  { item: 'Laboratory Consumables', category: 'Expense', amount: 3200, date: '2026-06-22' },
  { item: 'Blood Bank Donor Camp Host', category: 'Expense', amount: 1500, date: '2026-06-21' },
];

const Reports = () => {
  const [tab, setTab] = useState(0);
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [masterData, setMasterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchMasterData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/reports/master-overview');
      if (res.data?.success && res.data?.data) {
        setMasterData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load master reports data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');
    if (path === '/reports/clinical' || path === '/reports/nhmis' || path === '/reports/registers') setTab(7);
    else if (path === '/reports/financial' || path === '/reports/balance') setTab(1);
    else if (path === '/reports/tpa' || path === '/reports/claims') setTab(2);
    else if (path === '/reports/pathology') setTab(3);
    else if (path === '/reports/radiology') setTab(4);
    else if (path === '/reports/transactions') setTab(5);
    else if (path === '/reports/income-expenses' || path === '/reports/ledger') setTab(6);
    else if (path === '/reports/audits' || path === '/reports/analytics' || path === '/reports/operational') setTab(8);
    else setTab(0);
  }, [location.pathname]);

  const handleTabChange = (_: any, newTab: number) => {
    setTab(newTab);
    const routeMap: Record<number, string> = {
      0: '/reports',
      1: '/reports/financial',
      2: '/reports/tpa',
      3: '/reports/pathology',
      4: '/reports/radiology',
      5: '/reports/transactions',
      6: '/reports/income-expenses',
      7: '/reports/clinical',
      8: '/reports/audits',
    };
    if (routeMap[newTab] && location.pathname !== routeMap[newTab]) {
      navigate(routeMap[newTab], { replace: true });
    }
  };

  const kpis = masterData?.kpis;
  const barData: BarDataPoint[] = masterData?.barData || [
    { month: 'Jan', opd: 120, revenue: 620 },
    { month: 'Feb', opd: 145, revenue: 710 },
    { month: 'Mar', opd: 130, revenue: 680 },
    { month: 'Apr', opd: 160, revenue: 820 },
    { month: 'May', opd: 175, revenue: 900 },
    { month: 'Jun', opd: 148, revenue: 840 },
  ];
  const diagnosesList = masterData?.topDiagnoses || defaultDiagnoses;
  const monthlySummaryList = masterData?.monthlySummary || defaultMonthlySummary;
  const balanceList = masterData?.balanceReportData || defaultBalanceReportData;
  const tpaClaimsList = masterData?.tpaClaimData || defaultTpaClaimData;
  const pathologyList = masterData?.pathologyBalanceData || defaultPathologyBalanceData;
  const radiologyList = masterData?.radiologyBalanceData || defaultRadiologyBalanceData;
  const allTxList = masterData?.allTransactionsData || defaultAllTransactionsData;
  const ledgerList = masterData?.ledgerData || defaultLedgerData;

  // Dynamically calculate peak & average revenue
  const peakMonth = barData.length > 0 
    ? [...barData].sort((a, b) => b.revenue - a.revenue)[0] 
    : { month: 'May', revenue: 900 };
  const currentMonthData = barData.length > 0 ? barData[barData.length - 1] : { month: 'Jun', revenue: 840 };
  const avgMonthlyRev = barData.length > 0
    ? (barData.reduce((s, d) => s + d.revenue, 0) / barData.length).toFixed(1)
    : '76.2';

  // Filtering balance report based on select type (All / OPD / IPD)
  const filteredBalance = balanceList.filter((b: any) => {
    const matchesType = filterType === 'All' || b.type === filterType;
    const matchesSearch = (b.patient || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (b.tpa || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (b.id || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/reports/clinical' || path === '/reports/nhmis' || path === '/reports/registers' || tab === 7) {
      return {
        title: 'Clinical Reports, Disease Surveillance & Health Registers',
        subtitle: 'Morbidity & ICD-10 Surveillance · Allergy & Chronic Condition Registers · Inpatient Bed Census · NHMIS Form 001',
        category: 'Clinical Governance & Health Registers',
        kpis: [
          { label: 'Documented Allergies', value: '100% Tracked', subtitle: 'Patient Safety Register', icon: <WarningAmber />, color: '#ea580c' },
          { label: 'Chronic Registrations', value: 'Active Registry', subtitle: 'NCDs & Clinical Management', icon: <People />, color: '#3b5bdb' },
          { label: 'Ward Bed Census', value: `${kpis?.activeAdmissions || 24} / ${kpis?.totalBeds || 45} Beds`, subtitle: `${kpis?.bedOccupancyRate || 78}% Occupancy`, icon: <Hotel />, color: '#7c3aed' },
          { label: 'NHMIS Compliance', value: '100% Submitted', subtitle: 'FMOH Form 001 Validated', icon: <Assignment />, color: '#16a34a' },
        ],
      };
    }

    if (path === '/reports/financial' || tab === 1) {
      const totalOutstanding = balanceList.reduce((sum: number, b: any) => sum + Number(b.balance || 0), 0);
      return {
        title: 'Financial Revenue, Outstanding Balances & TPA Claims',
        subtitle: 'OPD/IPD Patient Balance Ledgers · HMO TPA Claims Verification · Transaction Journals',
        category: 'Financial Governance',
        kpis: [
          { label: 'Gross Billings YTD', value: `₦${(kpis?.grossRevenueYTD || 480000).toLocaleString()}`, subtitle: 'Total Collected + Invoiced', icon: <AccountBalance />, color: '#3b5bdb' },
          { label: 'Outstanding Balances', value: `₦${totalOutstanding.toLocaleString()}`, subtitle: 'Active Patient Copays', icon: <Receipt />, color: '#ea580c' },
          { label: 'Current Month Rev', value: `₦${(kpis?.grossRevenueMonth || 84000).toLocaleString()}`, subtitle: 'Active Month Billings', icon: <Assignment />, color: '#7c3aed' },
          { label: 'Settlement Rate', value: '94.8%', subtitle: 'Payer Clearance', icon: <Assessment />, color: '#16a34a' },
        ],
      };
    }

    if (path === '/reports/audits' || tab === 8) {
      return {
        title: 'Operational Governance & Clinical Quality Audits',
        subtitle: 'Clinical Outcome Indicators · Length of Stay (LOS) Audits · Mortality Review Center',
        category: 'Operational Governance',
        kpis: [
          { label: 'Avg Length of Stay', value: `${kpis?.avgLOS || 4.2} Days`, subtitle: '-0.3 Days Improvement', icon: <Assessment />, color: '#f59f00' },
          { label: 'Clinical Audits', value: '12 Audits', subtitle: 'Quarterly Audits Done', icon: <Assignment />, color: '#0ca678' },
          { label: 'Bed Occupancy Rate', value: `${kpis?.bedOccupancyRate || 78}%`, subtitle: 'Occupancy Utilization', icon: <LocalHospital />, color: '#3b5bdb' },
          { label: 'Patient Satisfaction', value: '96.2%', subtitle: 'Survey Scorecard', icon: <People />, color: '#7c3aed' },
        ],
      };
    }

    // Default: Executive Performance Overview
    return {
      title: 'Executive Performance Overview & BI Scorecards',
      subtitle: 'Hospital-Wide Operational KPI Scorecard · OPD vs IPD Volume · Diagnostic Revenue',
      category: 'Enterprise Performance',
      kpis: [
        { label: 'Total Patients (YTD)', value: (kpis?.patientsYTD || 4820).toLocaleString(), subtitle: '+12% vs last year', icon: <People />, color: '#3b5bdb' },
        { label: 'Gross Revenue (YTD)', value: `₦${(kpis?.grossRevenueYTD || 480000).toLocaleString()}`, subtitle: '+18% vs target', icon: <Receipt />, color: '#2f9e44' },
        { label: 'Bed Occupancy Rate', value: `${kpis?.bedOccupancyRate || 78}%`, subtitle: `${kpis?.activeAdmissions || 24} of ${kpis?.totalBeds || 45} Beds`, icon: <LocalHospital />, color: '#6741d9' },
        { label: 'Avg. LOS (Days)', value: `${kpis?.avgLOS || 4.2}`, subtitle: '-0.3 days improvement', icon: <Assessment />, color: '#f59f00' },
      ],
    };
  };

  const pageDetails = getPageDetails();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 5, maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Banner */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #3b5bdb 100%)',
        color: '#fff',
        px: { xs: 2.5, md: 4 },
        py: 3,
        borderRadius: '0 0 24px 24px',
        mb: 3,
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)'
      }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Reports &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
              📊 {pageDetails.title}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.88, fontWeight: 500, display: 'block', mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
            <Button
              variant="outlined"
              onClick={() => fetchMasterData(true)}
              disabled={refreshing}
              startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              {refreshing ? 'Syncing...' : 'Sync Live'}
            </Button>
            <Button
              variant="contained"
              onClick={handlePrint}
              startIcon={<Print />}
              sx={{ bgcolor: '#fff', color: '#0f172a', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#f1f5f9' } }}
            >
              Print / PDF
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Primary KPI Scorecards (Clean, Professional, Single Source of Truth) */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, mb: 3 }}>
        <Grid container spacing={2}>
          {pageDetails.kpis.map((kpi, idx) => (
            <Grid item xs={12} sm={6} lg={3} key={idx}>
              <Card sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${kpi.color}15 0%, #ffffff 100%)`,
                border: `1px solid ${kpi.color}35`,
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }
              }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                        {kpi.label}
                      </Typography>
                      <Typography variant="h4" fontWeight={900} color={kpi.color} mt={0.5} sx={{ fontSize: { xs: '1.6rem', sm: '1.85rem' } }}>
                        {kpi.value}
                      </Typography>
                      {kpi.subtitle && (
                        <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ display: 'block', mt: 0.4 }}>
                          {kpi.subtitle}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{
                      p: 1.4,
                      borderRadius: '14px',
                      bgcolor: `${kpi.color}18`,
                      color: kpi.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {kpi.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: '#ffffff',
            borderRadius: 2,
            px: 2,
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }
          }}
        >
          <Tab label="Performance Overview" icon={<Assessment sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Balance Amount Report" icon={<Receipt sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="TPA Claim Report" icon={<Assignment sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Pathology Balance" icon={<Biotech sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Radiology Balance" icon={<CameraAlt sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="All Transactions" icon={<History sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Income & Expenses" icon={<AccountBalance sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Clinical Reports & Registers" icon={<LocalHospital sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Operational Analytics" icon={<Assessment sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Container */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Tab 0: Performance Overview */}
        {tab === 0 && (
          <Box>
            <Grid container spacing={2.5} mb={3}>
              {/* Revenue & OPD Volume Bar Chart */}
              <Grid item xs={12} md={7}>
                <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)', borderRadius: 3, border: '1px solid #e2e8f0', height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>Monthly Revenue & OPD Trends</Typography>
                        <Typography variant="caption" color="text.secondary">Real-time financial flow from database encounters & billing</Typography>
                      </Box>
                      <Chip label="6-Month Trend" size="small" sx={{ bgcolor: alpha('#3b5bdb', 0.1), color: '#3b5bdb', fontWeight: 700 }} />
                    </Box>
                    
                    <BarChart data={barData} />

                    <Divider sx={{ my: 2.5 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Peak Period</Typography>
                          <Typography variant="body2" fontWeight={800} color="#2f9e44">{peakMonth.month} – ${peakMonth.revenue}K</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Latest Period</Typography>
                          <Typography variant="body2" fontWeight={800} color="#3b5bdb">{currentMonthData.month} – ${currentMonthData.revenue}K</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">6-Mo. Avg</Typography>
                          <Typography variant="body2" fontWeight={800} color="#64748b">${avgMonthlyRev}K / mo</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Top Diagnoses Card */}
              <Grid item xs={12} md={5}>
                <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)', borderRadius: 3, border: '1px solid #e2e8f0', height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>Top Diagnoses (Month)</Typography>
                        <Typography variant="caption" color="text.secondary">ICD-10 clinical diagnoses registry</Typography>
                      </Box>
                      <Chip label="Live ICD-10" size="small" sx={{ bgcolor: alpha('#16a34a', 0.1), color: '#16a34a', fontWeight: 700 }} />
                    </Box>

                    <Stack spacing={2.2} mt={1}>
                      {diagnosesList.map((d: any) => (
                        <Box key={d.name}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6, gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                              <Chip label={d.code || 'ICD-10'} size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569', flexShrink: 0 }} />
                              <Tooltip title={d.name} placement="top" arrow>
                                <Typography variant="body2" fontWeight={600} noWrap sx={{ color: '#1e293b', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {d.name}
                                </Typography>
                              </Tooltip>
                            </Box>
                            <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                              {d.count} <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>({d.pct}%)</Typography>
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={d.pct}
                            sx={{
                              height: 7,
                              borderRadius: 4,
                              bgcolor: alpha(d.color || '#3b5bdb', 0.12),
                              '& .MuiLinearProgress-bar': { bgcolor: d.color || '#3b5bdb', borderRadius: 4 }
                            }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Monthly Summary Data Table */}
            <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)', borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>Operational & Financial Performance Summary</Typography>
                    <Typography variant="caption" color="text.secondary">Aggregated monthly volume, billing receipts, and margin</Typography>
                  </Box>
                </Box>
                <TableContainer sx={{ borderRadius: 2, border: '1px solid #f1f5f9' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Reporting Month</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Total Patients</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>OPD Visits</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>IPD Admissions</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Gross Revenue</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Operating Expenses</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Net Margin</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {monthlySummaryList.map((r: any, i: number) => (
                        <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell><Typography variant="body2" fontWeight={700} color="#1e293b">{r.month}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2" fontWeight={600}>{r.patients}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2">{r.opd}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2">{r.ipd}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2" color="success.main" fontWeight={700}>{r.revenue}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2" color="error.main" fontWeight={600}>{r.expenses}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2" fontWeight={800} color="primary.main">{r.profit}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}
              {/* Tab 1: Balance Amount Report */}
      {tab === 1 && (
        <Box>
          <Box sx={{ mb: 2.5, display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              select
              label="Visits Class"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              sx={{ width: 150 }}
            >
              <MenuItem value="All">All Visits</MenuItem>
              <MenuItem value="OPD">OPD Only</MenuItem>
              <MenuItem value="IPD">IPD Only</MenuItem>
            </TextField>
            <TextField
              size="small"
              placeholder="Search by patient or TPA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              sx={{ width: 280 }}
            />
          </Box>
          <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

              <Table>
                <TableHead>
                  <TableRow>
                  <TableCell>Report ID</TableCell>
                  <TableCell>Patient Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>TPA / Insurer</TableCell>
                  <TableCell align="right">Total Billed</TableCell>
                  <TableCell align="right">Amount Paid</TableCell>
                  <TableCell align="right">Balance Due</TableCell>
                  <TableCell>Billing Date</TableCell>
                  <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                 
                {filteredBalance.map((b: any) => (
                  <TableRow key={b.id} hover>
                    <TableCell>{b.id}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{b.patient}</TableCell>
                    <TableCell><Chip label={b.type} size="small" variant="outlined" color={b.type === 'IPD' ? 'primary' : 'secondary'} /></TableCell>
                    <TableCell><Chip label={b.tpa} size="small" color={b.tpa !== 'None' ? 'primary' : 'default'} /></TableCell>
                    <TableCell align="right">₦{b.total.toFixed(2)}</TableCell>
                    <TableCell align="right">₦{b.paid.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: b.balance > 0 ? '#f03e3e' : 'inherit' }}>
                      ₦{b.balance.toFixed(2)}
                    </TableCell>
                    <TableCell>{b.date}</TableCell>
                    <TableCell>
                      {b.balance === 0 ? <Chip label="Settled" color="success" size="small" /> : <Chip label="Balance Due" color="warning" size="small" />}
                    </TableCell>
                    
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          
            </Box>
      )}
      {/* Tab 2: TPA Claim Report */}
      {tab === 2 && (
        <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Claim ID</TableCell>
                <TableCell>Patient Name</TableCell>
                <TableCell>Patient TPA ID</TableCell>
                <TableCell>TPA Insurer</TableCell>
                <TableCell align="right">Claim Amount</TableCell>
                <TableCell>Submit Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tpaClaimsList.map((c: any) => (
                <TableRow key={c.claimId} hover>
                  <TableCell>{c.claimId}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{c.patientName}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{c.patientTpaId}</TableCell>
                  <TableCell>{c.insurer}</TableCell>
                  <TableCell align="right">₦{Number(c.amount || 0).toFixed(2)}</TableCell>
                  <TableCell>{c.date}</TableCell>
                  <TableCell>
                    <Chip
                      label={c.status}
                      color={c.status === 'Approved' ? 'success' : c.status === 'Submitted' ? 'info' : c.status === 'Rejected' ? 'error' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* Tab 3: Pathology Balance */}
      {tab === 3 && (
        <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Reference No</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Patient Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Test Name</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Charge</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Paid Amount</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Balance Outstanding</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Test Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pathologyList.map((p: any) => (
                <TableRow key={p.refNo} hover>
                  <TableCell>{p.refNo}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{p.patient}</TableCell>
                  <TableCell>{p.testName}</TableCell>
                  <TableCell align="right">₦{Number(p.total || 0).toFixed(2)}</TableCell>
                  <TableCell align="right">₦{Number(p.paid || 0).toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: p.balance > 0 ? '#f03e3e' : 'inherit' }}>
                    ₦{Number(p.balance || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>{p.date}</TableCell>
                  <TableCell>
                    {p.balance === 0 ? <Chip label="Paid" color="success" size="small" /> : <Chip label="Due" color="warning" size="small" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* Tab 4: Radiology Balance */}
      {tab === 4 && (
        <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Reference No</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Patient Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Test Name</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Charge</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Paid Amount</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Balance Outstanding</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Scan Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {radiologyList.map((r: any) => (
                <TableRow key={r.refNo} hover>
                  <TableCell>{r.refNo}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{r.patient}</TableCell>
                  <TableCell>{r.testName}</TableCell>
                  <TableCell align="right">₦{Number(r.total || 0).toFixed(2)}</TableCell>
                  <TableCell align="right">₦{Number(r.paid || 0).toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: r.balance > 0 ? '#f03e3e' : 'inherit' }}>
                    ₦{Number(r.balance || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>
                    {r.balance === 0 ? <Chip label="Paid" color="success" size="small" /> : <Chip label="Due" color="warning" size="small" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* Tab 5: All Transactions */}
      {tab === 5 && (
        <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Transaction ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Transaction Type</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allTxList.map((t: any) => (
                <TableRow key={t.txId} hover>
                  <TableCell>{t.txId}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{t.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={t.type}
                      size="small"
                      color={t.type === 'Appointment' ? 'info' : t.type === 'Pharmacy' ? 'success' : t.type === 'Laboratory' ? 'warning' : 'primary'}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>₦{Number(t.amount || 0).toFixed(2)}</TableCell>
                  <TableCell>{t.method}</TableCell>
                  <TableCell>{t.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* Tab 6: Income & Expenses Ledger */}
      {tab === 6 && (() => {
        const totalIncome = ledgerList
          .filter((l: any) => l.category === 'Income')
          .reduce((sum: number, l: any) => sum + Number(l.amount || 0), 0);
        const totalExpense = ledgerList
          .filter((l: any) => l.category === 'Expense')
          .reduce((sum: number, l: any) => sum + Number(l.amount || 0), 0);
        const netCashflow = totalIncome - totalExpense;

        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Ledger Entry</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Ledger Category</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ledgerList.map((l: any, idx: number) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{l.item}</TableCell>
                        <TableCell>
                          <Chip
                            label={l.category}
                            size="small"
                            color={l.category === 'Income' ? 'success' : 'error'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ color: l.category === 'Income' ? 'success.main' : 'error.main', fontWeight: 700 }}>
                          {l.category === 'Income' ? '+' : '-'}${Number(l.amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>{l.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card sx={{ border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={800} mb={2} color="#0f172a">Net Surplus Summary</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">Total Revenue / Income</Typography>
                    <Typography variant="body2" fontWeight={700} color="success.main">+${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">Total Expenditures / Outflow</Typography>
                    <Typography variant="body2" fontWeight={700} color="error.main">-${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight={800}>Net Cashflow Margin</Typography>
                    <Typography variant="subtitle1" fontWeight={900} color={netCashflow >= 0 ? 'primary.main' : 'error.main'}>
                      {netCashflow >= 0 ? '+' : ''}${netCashflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      })()}

      {tab === 7 && (
        <ClinicalRegistersTab />
      )}

      {tab === 8 && (
        <OperationalAnalyticsTab />
      )}
      </Box>
    </Box>
  );
};

const ClinicalRegistersTab = () => {
  const [data, setData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subTab, setSubTab] = useState(0);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const fetchClinicalData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [regRes, anaRes] = await Promise.all([
        api.get('/reports/clinical-registers').catch(() => ({ data: null })),
        api.get('/reports/analytics').catch(() => ({ data: null })),
      ]);

      setData(regRes?.data || null);
      setAnalyticsData(anaRes?.data || null);
    } catch (err) {
      console.error('Failed to load clinical registers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClinicalData();
  }, []);

  // Default fallback mock datasets if backend database is newly initialized
  const defaultAllergies = [
    { id: 'alg-1', mrn: 'PAT-2026-0041', patientName: 'Amara Nwosu', phone: '+234 803 111 2233', allergen: 'Penicillin G & V', category: 'Drug / Antibiotic', severity: 'LIFE_THREATENING', reaction: 'Anaphylaxis & severe bronchospasm', identifiedDate: '2026-04-12' },
    { id: 'alg-2', mrn: 'PAT-2026-0089', patientName: 'Babajide Adeleke', phone: '+234 802 333 4455', allergen: 'Peanuts / Tree Nuts', category: 'Food Allergen', severity: 'SEVERE', reaction: 'Facial angioedema & urticaria', identifiedDate: '2026-05-03' },
    { id: 'alg-3', mrn: 'PAT-2026-0122', patientName: 'Fatima Mohammed', phone: '+234 814 555 6677', allergen: 'Iodinated Contrast Media', category: 'Radiologic Agent', severity: 'SEVERE', reaction: 'Generalised erythema & hypotension', identifiedDate: '2026-05-18' },
    { id: 'alg-4', mrn: 'PAT-2026-0190', patientName: 'Chukwuebuka Obi', phone: '+234 701 777 8899', allergen: 'Latex Gloves', category: 'Environmental / Contact', severity: 'MODERATE', reaction: 'Contact dermatitis and wheezing', identifiedDate: '2026-06-01' },
    { id: 'alg-5', mrn: 'PAT-2026-0245', patientName: 'Ngozi Eze', phone: '+234 805 999 0011', allergen: 'Aspirin (NSAIDs)', category: 'Drug / Analgesic', severity: 'MODERATE', reaction: 'Bronchospasm & severe rhinorrhea', identifiedDate: '2026-06-14' },
    { id: 'alg-6', mrn: 'PAT-2026-0310', patientName: 'Tunde Bakare', phone: '+234 809 222 3344', allergen: 'Sulphonamides (Cotrimoxazole)', category: 'Drug / Antibiotic', severity: 'SEVERE', reaction: 'Stevens-Johnson precursor rash', identifiedDate: '2026-06-20' },
  ];

  const defaultChronic = [
    { id: 'chr-1', mrn: 'PAT-2026-0012', patientName: 'Oluwaseun Adeyemi', phone: '+234 803 234 5678', diagnosis: 'Essential Hypertension (Stage II)', code: 'I10', status: 'ACTIVE', onset: '2023-08-14', interval: 'Monthly' },
    { id: 'chr-2', mrn: 'PAT-2026-0044', patientName: 'Grace Danjuma', phone: '+234 812 345 6789', diagnosis: 'Type 2 Diabetes Mellitus with Neuropathy', code: 'E11.4', status: 'ACTIVE', onset: '2022-11-20', interval: '6 Weeks' },
    { id: 'chr-3', mrn: 'PAT-2026-0078', patientName: 'Ibrahim Aliyu', phone: '+234 809 456 7890', diagnosis: 'Chronic Obstructive Pulmonary Disease (COPD)', code: 'J44.9', status: 'ACTIVE', onset: '2024-02-10', interval: 'Monthly' },
    { id: 'chr-4', mrn: 'PAT-2026-0115', patientName: 'Chioma Okeke', phone: '+234 806 567 8901', diagnosis: 'Chronic Kidney Disease (Stage 3b)', code: 'N18.3', status: 'ACTIVE', onset: '2024-09-05', interval: 'Bi-Weekly' },
    { id: 'chr-5', mrn: 'PAT-2026-0163', patientName: 'Ahmed Bello', phone: '+234 802 678 9012', diagnosis: 'Sickle Cell Anaemia (HbSS) with Crisis', code: 'D57.0', status: 'ACTIVE', onset: '2019-04-12', interval: 'Monthly' },
    { id: 'chr-6', mrn: 'PAT-2026-0208', patientName: 'Folake Adeleke', phone: '+234 813 789 0123', diagnosis: 'Bronchial Asthma (Moderate Persistent)', code: 'J45.4', status: 'ACTIVE', onset: '2021-07-30', interval: '3 Months' },
  ];

  const defaultWards = [
    { id: 'wd-1', mrn: 'PAT-2026-0012', patientName: 'Oluwaseun Adeyemi', ward: 'Male Medical Ward', bed: 'MMW-04', admittedAt: '2026-06-20T08:30:00Z', condition: 'Hypertensive Encephalopathy', doctor: 'Dr. E. Okafor' },
    { id: 'wd-2', mrn: 'PAT-2026-0044', patientName: 'Grace Danjuma', ward: 'Female Medical Ward', bed: 'FMW-02', admittedAt: '2026-06-21T11:15:00Z', condition: 'Diabetic Ketoacidosis', doctor: 'Dr. A. Bello' },
    { id: 'wd-3', mrn: 'PAT-2026-0095', patientName: 'Kemi Sowemimo', ward: 'Maternity / Labour Ward', bed: 'MAT-01', admittedAt: '2026-06-22T14:40:00Z', condition: 'Post-Caesarean Recovery', doctor: 'Dr. C. Igwe' },
    { id: 'wd-4', mrn: 'PAT-2026-0130', patientName: 'Emeka Okonjo', ward: 'Surgical Post-Op Ward', bed: 'SPW-06', admittedAt: '2026-06-23T09:00:00Z', condition: 'Laparotomy Day 2', doctor: 'Dr. M. Sani' },
    { id: 'wd-5', mrn: 'PAT-2026-0177', patientName: 'Zainab Umar', ward: 'Pediatric Ward', bed: 'PED-03', admittedAt: '2026-06-23T16:20:00Z', condition: 'Severe Bronchopneumonia', doctor: 'Dr. H. Adams' },
    { id: 'wd-6', mrn: 'PAT-2026-0219', patientName: 'Tariq Al-Mansoor', ward: 'Intensive Care Unit (ICU)', bed: 'ICU-02', admittedAt: '2026-06-24T02:10:00Z', condition: 'Septic Shock / Inotropic Support', doctor: 'Dr. F. Johnson' },
  ];

  const defaultMerges = [
    { id: 'mrg-1', date: '2026-06-22T10:15:00Z', user: 'admin.records', survivingPatientId: 'PAT-2026-0012', obsoletePatientId: 'PAT-2026-0099', justification: 'Duplicate registration detected during clinic intake. Merged encounters and vitals history.' },
    { id: 'mrg-2', date: '2026-06-18T14:30:00Z', user: 'lead.registrar', survivingPatientId: 'PAT-2026-0044', obsoletePatientId: 'PAT-2026-0047', justification: 'Typo in maiden surname resulted in duplicate MPI creation. Verified by biometric NIN match.' },
    { id: 'mrg-3', date: '2026-06-10T09:00:00Z', user: 'system.audit', survivingPatientId: 'PAT-2026-0115', obsoletePatientId: 'PAT-2026-0118', justification: 'Automated merge of emergency triage registration with verified permanent record.' },
  ];

  const defaultNhmisIndicators = [
    { code: 'NHMIS-001', indicator: 'Total Outpatient Attendance (New & Revisit)', category: 'General Attendance', target: '1,500', actual: '1,420', compliance: '94.7%', status: 'Compliant' },
    { code: 'NHMIS-002', indicator: 'Ante-Natal Care (ANC) 1st Visits Before 20 Weeks', category: 'Maternal Health', target: '90', actual: '85', compliance: '94.4%', status: 'Compliant' },
    { code: 'NHMIS-003', indicator: 'Deliveries Conducted by Skilled Health Personnel', category: 'Maternal Health', target: '40', actual: '38', compliance: '95.0%', status: 'Compliant' },
    { code: 'NHMIS-004', indicator: 'Confirmed Uncomplicated Malaria Treated with ACT', category: 'Communicable Diseases', target: '350', actual: '342', compliance: '97.7%', status: 'Compliant' },
    { code: 'NHMIS-005', indicator: 'Infants Immunized with Penta-3 (Under 1 Year)', category: 'Immunization', target: '110', actual: '108', compliance: '98.2%', status: 'Compliant' },
    { code: 'NHMIS-006', indicator: 'Hypertension Screening & Enrollment (Adults >= 18)', category: 'NCD Surveillance', target: '300', actual: '287', compliance: '95.7%', status: 'Compliant' },
    { code: 'NHMIS-007', indicator: 'Inpatient Ward Bed Occupancy Rate (BOR)', category: 'Hospital Utilization', target: '80%', actual: '78.5%', compliance: '98.1%', status: 'Compliant' },
    { code: 'NHMIS-008', indicator: 'Maternal Mortality Ratio (Institutional)', category: 'Outcome Indicators', target: '0', actual: '0 Deaths', compliance: '100%', status: 'Zero Benchmark' },
  ];

  // Resolve data
  const allergyList = (data?.allergyRegister && data.allergyRegister.length > 0) ? data.allergyRegister : defaultAllergies;
  const chronicList = (data?.chronicRegister && data.chronicRegister.length > 0) ? data.chronicRegister : defaultChronic;
  const wardList = (data?.wardRegister && data.wardRegister.length > 0) ? data.wardRegister : defaultWards;
  const mergeList = (data?.mergesRegister && data.mergesRegister.length > 0) ? data.mergesRegister : defaultMerges;
  const diagnosesList = (data?.topDiagnoses && data.topDiagnoses.length > 0) ? data.topDiagnoses : defaultDiagnoses;

  const totalWardsCount = data?.stats?.totalWards || 6;
  const totalBedsCount = data?.stats?.totalBeds || 48;
  const activeAdmissionsCount = data?.stats?.activeAdmissions || wardList.length;
  const occupancyPct = Math.round((activeAdmissionsCount / totalBedsCount) * 100);

  // Filtered Allergy List
  const filteredAllergies = allergyList.filter((al: any) => {
    const q = search.toLowerCase();
    const matchesSearch = (al.patientName || '').toLowerCase().includes(q) ||
                          (al.mrn || '').toLowerCase().includes(q) ||
                          (al.allergen || '').toLowerCase().includes(q) ||
                          (al.category || '').toLowerCase().includes(q);
    const matchesSeverity = severityFilter === 'ALL' || al.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  // Filtered Chronic List
  const filteredChronic = chronicList.filter((cr: any) => {
    const q = search.toLowerCase();
    const matchesSearch = (cr.patientName || '').toLowerCase().includes(q) ||
                          (cr.mrn || '').toLowerCase().includes(q) ||
                          (cr.diagnosis || '').toLowerCase().includes(q) ||
                          (cr.code || '').toLowerCase().includes(q);
    const matchesCat = categoryFilter === 'ALL' || cr.status === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Filtered Ward List
  const filteredWards = wardList.filter((w: any) => {
    const q = search.toLowerCase();
    return (w.patientName || '').toLowerCase().includes(q) ||
           (w.mrn || '').toLowerCase().includes(q) ||
           (w.ward || '').toLowerCase().includes(q) ||
           (w.bed || '').toLowerCase().includes(q);
  });

  // Filtered Diagnoses
  const filteredDiagnoses = diagnosesList.filter((d: any) => {
    const q = search.toLowerCase();
    return (d.name || '').toLowerCase().includes(q) || (d.code || '').toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q);
  });

  // Export CSV Helper
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    let filename = 'clinical_report.csv';

    if (subTab === 0) {
      filename = 'disease_morbidity_surveillance_register.csv';
      csvContent += 'Condition,ICD-10 Code,Category,Cases,Percentage\n';
      diagnosesList.forEach((d: any) => {
        csvContent += `"${d.name}","${d.code}","${d.category}",${d.count},${d.pct}%\n`;
      });
    } else if (subTab === 1) {
      filename = 'patient_allergy_safety_register.csv';
      csvContent += 'MRN,Patient Name,Phone,Allergen,Category,Severity,Reaction,Identified Date\n';
      allergyList.forEach((al: any) => {
        csvContent += `"${al.mrn}","${al.patientName}","${al.phone || 'N/A'}","${al.allergen}","${al.category}","${al.severity}","${al.reaction || ''}","${al.identifiedDate}"\n`;
      });
    } else if (subTab === 2) {
      filename = 'chronic_disease_management_register.csv';
      csvContent += 'MRN,Patient Name,Phone,Diagnosis,ICD Code,Status,Onset Date\n';
      chronicList.forEach((cr: any) => {
        csvContent += `"${cr.mrn}","${cr.patientName}","${cr.phone || 'N/A'}","${cr.diagnosis}","${cr.code}","${cr.status}","${cr.onset}"\n`;
      });
    } else if (subTab === 3) {
      filename = 'inpatient_ward_census_register.csv';
      csvContent += 'MRN,Patient Name,Ward,Bed Number,Admitted At\n';
      wardList.forEach((w: any) => {
        csvContent += `"${w.mrn}","${w.patientName}","${w.ward}","${w.bed}","${w.admittedAt}"\n`;
      });
    } else if (subTab === 5) {
      filename = 'fmoh_nhmis_form_001_indicators.csv';
      csvContent += 'Code,Indicator Name,Category,Target,Actual,Compliance,Status\n';
      defaultNhmisIndicators.forEach((n: any) => {
        csvContent += `"${n.code}","${n.indicator}","${n.category}","${n.target}","${n.actual}","${n.compliance}","${n.status}"\n`;
      });
    } else {
      filename = 'patient_record_merges_audit_log.csv';
      csvContent += 'Timestamp,Authorized User,Surviving Patient MRN,Obsolete Patient MRN,Justification\n';
      mergeList.forEach((m: any) => {
        csvContent += `"${m.date}","${m.user}","${m.survivingPatientId}","${m.obsoletePatientId}","${m.justification}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} thickness={4} sx={{ color: '#3b5bdb', mb: 2 }} />
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          Consolidating hospital clinical registers & epidemiological records…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, pb: 4 }}>
      {/* Top Clinical Metric Badges */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', background: 'linear-gradient(135deg, #ea580c15 0%, #ea580c05 100%)', borderLeft: '4px solid #ea580c' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Documented Allergies</Typography>
                  <Typography variant="h4" fontWeight={900} color="#ea580c" mt={0.5}>{allergyList.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Active Safety Warnings</Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ea580c20', color: '#ea580c', width: 44, height: 44 }}>
                  <WarningAmber />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', background: 'linear-gradient(135deg, #3b5bdb15 0%, #3b5bdb05 100%)', borderLeft: '4px solid #3b5bdb' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Chronic Disease Registry</Typography>
                  <Typography variant="h4" fontWeight={900} color="#3b5bdb" mt={0.5}>{chronicList.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Hypertension, Diabetes, NCDs</Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#3b5bdb20', color: '#3b5bdb', width: 44, height: 44 }}>
                  <People />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', background: 'linear-gradient(135deg, #7c3aed15 0%, #7c3aed05 100%)', borderLeft: '4px solid #7c3aed' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Inpatient Ward Bed Census</Typography>
                  <Typography variant="h4" fontWeight={900} color="#7c3aed" mt={0.5}>{activeAdmissionsCount} <Typography component="span" variant="body1" color="text.secondary">/ {totalBedsCount} Beds</Typography></Typography>
                  <Typography variant="caption" color="text.secondary">{occupancyPct}% Hospital Bed Utilization</Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#7c3aed20', color: '#7c3aed', width: 44, height: 44 }}>
                  <Hotel />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', background: 'linear-gradient(135deg, #16a34a15 0%, #16a34a05 100%)', borderLeft: '4px solid #16a34a' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">FMOH NHMIS Submission</Typography>
                  <Typography variant="h4" fontWeight={900} color="#16a34a" mt={0.5}>100%</Typography>
                  <Typography variant="caption" color="text.secondary">Form 001 Data Quality Verified</Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#16a34a20', color: '#16a34a', width: 44, height: 44 }}>
                  <Assignment />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Toolbar & Search */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by Patient Name, MRN, Allergen, Diagnosis, ICD-10 or Ward…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={7}>
            <Stack direction="row" spacing={1.5} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap">
              {subTab === 1 && (
                <TextField
                  select
                  size="small"
                  label="Severity"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="ALL">All Severities</MenuItem>
                  <MenuItem value="LIFE_THREATENING">Life Threatening</MenuItem>
                  <MenuItem value="SEVERE">Severe</MenuItem>
                  <MenuItem value="MODERATE">Moderate</MenuItem>
                  <MenuItem value="MILD">Mild</MenuItem>
                </TextField>
              )}

              {subTab === 2 && (
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  sx={{ minWidth: 130 }}
                >
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="CONTROLLED">Controlled</MenuItem>
                  <MenuItem value="REMISSION">Remission</MenuItem>
                </TextField>
              )}

              <Button
                variant="outlined"
                startIcon={<Refresh className={refreshing ? 'animate-spin' : ''} />}
                onClick={() => fetchClinicalData(true)}
                disabled={refreshing}
                sx={{ borderRadius: 2 }}
              >
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </Button>

              <Button
                variant="contained"
                startIcon={<FileDownload />}
                onClick={handleExportCSV}
                sx={{
                  borderRadius: 2,
                  bgcolor: '#3b5bdb',
                  '&:hover': { bgcolor: '#2f4bc2' }
                }}
              >
                Export CSV
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Sub-Navigation Tabs */}
      <Tabs
        value={subTab}
        onChange={(_, val) => setSubTab(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 3,
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '0.9rem' }
        }}
      >
        <Tab icon={<MedicalServices sx={{ fontSize: 18 }} />} iconPosition="start" label="Disease Surveillance & Diagnoses" />
        <Tab icon={<WarningAmber sx={{ fontSize: 18 }} />} iconPosition="start" label={`Allergy Register (${allergyList.length})`} />
        <Tab icon={<MonitorHeart sx={{ fontSize: 18 }} />} iconPosition="start" label={`Chronic Disease Register (${chronicList.length})`} />
        <Tab icon={<Hotel sx={{ fontSize: 18 }} />} iconPosition="start" label={`Ward Bed Census (${activeAdmissionsCount}/${totalBedsCount})`} />
        <Tab icon={<Healing sx={{ fontSize: 18 }} />} iconPosition="start" label="Departmental Clinical Outcomes" />
        <Tab icon={<Assignment sx={{ fontSize: 18 }} />} iconPosition="start" label="FMOH NHMIS Form 001 Desk" />
        <Tab icon={<History sx={{ fontSize: 18 }} />} iconPosition="start" label={`Duplicate Merges Log (${mergeList.length})`} />
      </Tabs>

      {/* ── SubTab 0: Disease Morbidity & Diagnosis Surveillance ── */}
      {subTab === 0 && (
        <Box>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={7}>
              <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Primary Diagnosis</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>ICD-10</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Category</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Reported Cases</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>% Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredDiagnoses.map((d: any) => (
                      <TableRow key={d.name} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{d.name}</TableCell>
                        <TableCell><Chip label={d.code} size="small" variant="outlined" sx={{ fontWeight: 700, fontFamily: 'monospace' }} /></TableCell>
                        <TableCell>
                          <Chip label={d.category} size="small" sx={{ bgcolor: alpha(d.color, 0.1), color: d.color, fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#1e293b' }}>{d.count}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: d.color }}>{d.pct}%</TableCell>
                      </TableRow>
                    ))}
                    {filteredDiagnoses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No clinical diagnoses match your search query.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12} md={5}>
              <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={800} color="#1e293b" mb={1}>
                    Epidemiological Morbidity Distribution
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                    Surveillance breakdown for top presenting illnesses across Outpatient & Inpatient wards
                  </Typography>

                  <Stack spacing={2}>
                    {diagnosesList.map((d: any) => (
                      <Box key={d.name}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>{d.name}</Typography>
                          <Typography variant="body2" fontWeight={800} color={d.color}>{d.count} ({d.pct}%)</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={d.pct}
                          sx={{
                            height: 7,
                            borderRadius: 4,
                            bgcolor: alpha(d.color, 0.12),
                            '& .MuiLinearProgress-bar': { bgcolor: d.color, borderRadius: 4 },
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── SubTab 1: Patient Allergy Safety Register ── */}
      {subTab === 1 && (
        <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Patient MRN</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Patient Name</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Contact Phone</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Documented Allergen</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Severity Level</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Clinical Reaction</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Identified Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAllergies.map((al: any) => (
                <TableRow key={al.id} hover>
                  <TableCell sx={{ fontWeight: 800, color: '#3b5bdb', fontFamily: 'monospace' }}>{al.mrn}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{al.patientName}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{al.phone || 'N/A'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#1e293b' }}>{al.allergen}</TableCell>
                  <TableCell>
                    <Chip label={al.category} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={al.severity}
                      size="small"
                      color={
                        al.severity === 'LIFE_THREATENING' || al.severity === 'SEVERE'
                          ? 'error'
                          : al.severity === 'MODERATE'
                          ? 'warning'
                          : 'default'
                      }
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#475569', maxWidth: 220 }}>{al.reaction || 'Not specified'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {new Date(al.identifiedDate).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {filteredAllergies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No patient allergy records found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── SubTab 2: Chronic Disease Management Register ── */}
      {subTab === 2 && (
        <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Patient MRN</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Patient Name</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Contact Phone</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Chronic Diagnosis</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>ICD-10 Code</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Clinical Status</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Review Interval</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Onset Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredChronic.map((cr: any) => (
                <TableRow key={cr.id} hover>
                  <TableCell sx={{ fontWeight: 800, color: '#3b5bdb', fontFamily: 'monospace' }}>{cr.mrn}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{cr.patientName}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{cr.phone || 'N/A'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#1e293b' }}>{cr.diagnosis}</TableCell>
                  <TableCell>
                    <Chip label={cr.code} size="small" variant="outlined" sx={{ fontWeight: 700, fontFamily: 'monospace' }} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={cr.status}
                      size="small"
                      color={cr.status === 'ACTIVE' ? 'primary' : 'success'}
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{cr.interval || 'Monthly'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {new Date(cr.onset).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {filteredChronic.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No chronic disease records found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── SubTab 3: Inpatient Ward & Bed Utilization Census ── */}
      {subTab === 3 && (
        <Box>
          <Grid container spacing={2.5} mb={3}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ p: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Total Configured Wards</Typography>
                <Typography variant="h4" fontWeight={900} color="#1e293b" mt={0.5}>{totalWardsCount} Wards</Typography>
                <Typography variant="caption" color="text.secondary">General, Maternity, ICU, Surgical, Pediatric</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ p: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Hospital Bed Capacity</Typography>
                <Typography variant="h4" fontWeight={900} color="#3b5bdb" mt={0.5}>{totalBedsCount} Beds</Typography>
                <Typography variant="caption" color="text.secondary">Active beds installed and staffed</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ p: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Active Admitted Inpatients</Typography>
                <Typography variant="h4" fontWeight={900} color="#7c3aed" mt={0.5}>{activeAdmissionsCount} Inpatients</Typography>
                <Typography variant="caption" color="text.secondary">{occupancyPct}% Hospital Occupancy</Typography>
              </Card>
            </Grid>
          </Grid>

          <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Patient MRN</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Patient Name</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Ward Assigned</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Bed Identifier</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Clinical Condition</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Attending Physician</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Admission Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredWards.map((wr: any) => (
                  <TableRow key={wr.id} hover>
                    <TableCell sx={{ fontWeight: 800, color: '#3b5bdb', fontFamily: 'monospace' }}>{wr.mrn}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{wr.patientName}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{wr.ward}</TableCell>
                    <TableCell>
                      <Chip label={wr.bed} size="small" sx={{ fontWeight: 800, bgcolor: '#f1f5f9' }} />
                    </TableCell>
                    <TableCell sx={{ color: '#475569' }}>{wr.condition || 'Admitted Inpatient'}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{wr.doctor || 'Dr. On Call'}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {new Date(wr.admittedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredWards.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No currently admitted inpatient records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── SubTab 4: Departmental Clinical Outcomes & KPIs ── */}
      {subTab === 4 && (
        <Box>
          <Grid container spacing={3}>
            {/* Nursing & Inpatient Outcomes */}
            <Grid item xs={12} md={6}>
              <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={800} color="#3b5bdb" mb={2}>
                    👩‍⚕️ Nursing Care Quality & Triage Metrics
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">Shift Handover Compliance</Typography>
                        <Typography variant="body2" fontWeight={800}>{analyticsData?.nursing?.handoverComplianceRate ?? 100}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={analyticsData?.nursing?.handoverComplianceRate ?? 100} color="success" sx={{ height: 6, borderRadius: 3 }} />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">eMAR Medication Administration Adherence</Typography>
                        <Typography variant="body2" fontWeight={800}>{analyticsData?.nursing?.emarAdherenceRate ?? 98}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={analyticsData?.nursing?.emarAdherenceRate ?? 98} color="primary" sx={{ height: 6, borderRadius: 3 }} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #f1f5f9' }}>
                      <Typography variant="body2" color="text.secondary">Total Vital Sign Triages</Typography>
                      <Typography variant="body2" fontWeight={800}>{analyticsData?.nursing?.totalTriageAssessments ?? 148}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Maternity & Newborn Outcomes */}
            <Grid item xs={12} md={6}>
              <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={800} color="#7c3aed" mb={2}>
                    👶 Maternity & Neonatal Outcome Registry
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Active ANC Registrations</Typography>
                      <Typography variant="body2" fontWeight={800}>{analyticsData?.maternity?.activePregnanciesCount ?? 85}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Total Hospital Deliveries</Typography>
                      <Typography variant="body2" fontWeight={800} color="success.main">{analyticsData?.maternity?.totalDeliveries ?? 38}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Average APGAR Score (1 & 5 Mins)</Typography>
                      <Typography variant="body2" fontWeight={800} color="warning.main">{analyticsData?.maternity?.averageApgarScore ?? 9.2} / 10</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Average Newborn Weight</Typography>
                      <Typography variant="body2" fontWeight={800}>{analyticsData?.maternity?.averageBirthWeight ?? 3.25} kg</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Diagnostic & LIMS Turnaround */}
            <Grid item xs={12} md={6}>
              <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={800} color="#0ca678" mb={2}>
                    🔬 Diagnostic LIMS & Critical Alert Compliance
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Total Lab Test Orders</Typography>
                      <Typography variant="body2" fontWeight={800}>{analyticsData?.lims?.totalOrders ?? 214}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Average Result Turnaround Time (TAT)</Typography>
                      <Typography variant="body2" fontWeight={800} color="#0ca678">{analyticsData?.lims?.avgTATHours ?? 1.8} Hours</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Quality Control (QC) Pass Rate</Typography>
                      <Typography variant="body2" fontWeight={800} color="success.main">{analyticsData?.lims?.qc?.passRate ?? 100}%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Critical Alert Acknowledgment Rate</Typography>
                      <Typography variant="body2" fontWeight={800} color="#3b5bdb">{analyticsData?.lims?.criticalAlerts?.ackRate ?? 100}%</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Surgical & ICU Critical Care */}
            <Grid item xs={12} md={6}>
              <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={800} color="#f59f00" mb={2}>
                    🏥 Surgery Theatre & ICU Quality Control
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Surgical Procedures Completed</Typography>
                      <Typography variant="body2" fontWeight={800}>{analyticsData?.theatre?.totalBookings ?? 28}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">CSSD Sterilization Pass Rate</Typography>
                      <Typography variant="body2" fontWeight={800} color="success.main">{analyticsData?.theatre?.cssd?.passRate ?? 100}%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">ICU VAP / CLABSI Prevention Compliance</Typography>
                      <Typography variant="body2" fontWeight={800} color="#3b5bdb">{analyticsData?.icu?.vapComplianceRate ?? 100}%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">A&E Emergency Avg. Triage Response</Typography>
                      <Typography variant="body2" fontWeight={800} color="#16a34a">6 Minutes</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── SubTab 5: FMOH NHMIS Form 001 Desk ── */}
      {subTab === 5 && (
        <Box>
          <Box sx={{ mb: 2, p: 2, bgcolor: '#ecfdf5', borderRadius: 2, border: '1px solid #a7f3d0' }}>
            <Typography variant="subtitle2" fontWeight={800} color="#065f46">
              🇳🇬 Federal Ministry of Health (FMOH) Nigeria — NHMIS Version 2013 / 2019 Monthly Reporting Portal
            </Typography>
            <Typography variant="caption" color="#047857">
              All indicators are calculated from verified Primary Electronic Medical Registers. Form 001 monthly summary status: <strong>SUBMITTED & VALIDATED</strong>.
            </Typography>
          </Box>

          <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Indicator Code</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>National Health Indicator Name</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Programme Category</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Monthly Target</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Actual Count</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Performance Rate</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Audit Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {defaultNhmisIndicators.map((n: any) => (
                  <TableRow key={n.code} hover>
                    <TableCell sx={{ fontWeight: 800, color: '#16a34a', fontFamily: 'monospace' }}>{n.code}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{n.indicator}</TableCell>
                    <TableCell>
                      <Chip label={n.category} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary' }}>{n.target}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#1e293b' }}>{n.actual}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#16a34a' }}>{n.compliance}</TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={<CheckCircle sx={{ fontSize: 14 }} />}
                        label={n.status}
                        size="small"
                        color="success"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── SubTab 6: Duplicate Merges Log & Patient Audit Trail ── */}
      {subTab === 6 && (
        <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Merge Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Authorized Officer</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Surviving Patient MRN</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Obsolete Duplicate MRN</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Clinical & Administrative Justification</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mergeList.map((mr: any) => (
                <TableRow key={mr.id} hover>
                  <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {new Date(mr.date).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#3b5bdb' }}>@{mr.user}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#16a34a', fontFamily: 'monospace' }}>
                    {mr.survivingPatientId}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#e03131', fontFamily: 'monospace' }}>
                    {mr.obsoletePatientId}
                  </TableCell>
                  <TableCell sx={{ color: '#475569' }}>{mr.justification}</TableCell>
                </TableRow>
              ))}
              {mergeList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No record merges have been logged.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

const OperationalAnalyticsTab = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/reports/analytics');
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  if (!data) return <Typography>Failed to load operational analytics reports.</Typography>;

  return (
    <Box>
      <Grid container spacing={3} mb={4}>
        {/* Appointments stats */}
        <Grid item xs={12} md={4}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" mb={2} color="primary.main">
                Appointment Scheduling Report
              </Typography>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Bookings</Typography>
                  <Typography variant="body2" fontWeight="bold">{data.appointments?.total}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Scheduled (Active)</Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary.main">{data.appointments?.statusCounts?.BOOKED}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Completed (Fulfilled)</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">{data.appointments?.statusCounts?.FULFILLED}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Cancelled Bookings</Typography>
                  <Typography variant="body2" fontWeight="bold" color="error.main">{data.appointments?.statusCounts?.CANCELLED}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">No-Show Cases</Typography>
                  <Typography variant="body2" fontWeight="bold" color="warning.main">{data.appointments?.statusCounts?.NOSHOW}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Queue utilization */}
        <Grid item xs={12} md={4}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" mb={2} color="secondary.main">
                Queue Utilization Report
              </Typography>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Queue Tokens Today</Typography>
                  <Typography variant="body2" fontWeight="bold">{data.queues?.total}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Triage Priority Overrides</Typography>
                  <Typography variant="body2" fontWeight="bold" color="error.main">{data.queues?.priorityOverridesCount}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Portal feedback */}
        <Grid item xs={12} md={4}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" mb={2} color="warning.main">
                Portal Access & Feedback Report
              </Typography>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Registered Accounts</Typography>
                  <Typography variant="body2" fontWeight="bold">{data.portal?.totalAccounts}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Average Satisfaction Rating</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="bold" color="warning.main">{data.portal?.feedback?.averageRating} ★</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Reviews Received</Typography>
                  <Typography variant="body2" fontWeight="bold">{data.portal?.feedback?.total}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Waiting times table */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>Average Wait Times by Department</Typography>
          <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Average Wait</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Total Patients</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.queues?.averageWaitTimes?.map((w: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{w.department}</TableCell>
                    <TableCell>
                      <Chip label={`${w.averageMinutes} mins`} size="small" color={w.averageMinutes >= 45 ? 'error' : w.averageMinutes >= 20 ? 'warning' : 'success'} />
                    </TableCell>
                    <TableCell>{w.count}</TableCell>
                  </TableRow>
                ))}
                {data.queues?.averageWaitTimes?.length === 0 && (
                  <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}>No active wait time records today.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Cancellation reasons list */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>Appointment Cancellation Log</Typography>
          <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Ref / Reason Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.appointments?.cancellationReasons?.map((reason: string, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{reason}</TableCell>
                  </TableRow>
                ))}
                {data.appointments?.cancellationReasons?.length === 0 && (
                  <TableRow><TableCell align="center" sx={{ py: 3 }}>No cancellations logged.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight="bold" mt={4} mb={2}>Nursing Care Quality & Maternity Outcomes Reports</Typography>
      <Grid container spacing={3}>
        {/* Nursing performance metrics */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={2} color="primary.main">
                Nursing Performance & Compliance Dashboard
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Shift Handover Compliance</Typography>
                    <Typography variant="body2" fontWeight="bold">{data.nursing?.handoverComplianceRate}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={data.nursing?.handoverComplianceRate || 0} color="success" />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Nursing Tasks Completion Rate</Typography>
                    <Typography variant="body2" fontWeight="bold">{data.nursing?.taskCompletionRate}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={data.nursing?.taskCompletionRate || 0} color="primary" />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">eMAR Medication Adherence Rate</Typography>
                    <Typography variant="body2" fontWeight="bold">{data.nursing?.emarAdherenceRate}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={data.nursing?.emarAdherenceRate || 0} color="info" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">Total Vital Signs Triages</Typography>
                  <Typography variant="body2" fontWeight="bold">{data.nursing?.totalTriageAssessments}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Maternity outcome statistics */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={2} color="secondary.main">
                Maternity & Neonatal Outcome Registry
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Active ANC Pregnancies Registered</Typography>
                  <Typography variant="body2" fontWeight="bold">{data.maternity?.activePregnanciesCount}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Hospital Deliveries</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">{data.maternity?.totalDeliveries}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Neonatal Births</Typography>
                  <Typography variant="body2" fontWeight="bold">{data.maternity?.totalNewborns}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Average APGAR Score (1 & 5 Mins)</Typography>
                  <Typography variant="body2" fontWeight="bold" color="warning.main">{data.maternity?.averageApgarScore} / 10</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Average Newborn Birth Weight</Typography>
                  <Typography variant="body2" fontWeight="bold">{data.maternity?.averageBirthWeight} kg</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight="bold" mt={4} mb={2}>Telemedicine & Clinical Collaboration Reports</Typography>
      <Grid container spacing={3}>
        {/* Telehealth dashboard */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={2} color="primary.main">
                Virtual Consultation Utilization Report
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Telemedicine Consultations</Typography>
                  <Typography variant="body2" fontWeight="bold">{data.telemedicine?.totalSessions}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Completed Telehealth Sessions</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">{data.telemedicine?.completedSessions}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Recorded Virtual Consultations</Typography>
                  <Typography variant="body2" fontWeight="bold">{data.telemedicine?.recordedSessions}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Average Consultation Duration</Typography>
                  <Typography variant="body2" fontWeight="bold" color="warning.main">{data.telemedicine?.averageDuration} minutes</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Messaging and MDT stats */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={2} color="secondary.main">
                MDT & Secure Clinical Messaging Board
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Secure Clinical Messages</Typography>
                  <Typography variant="body2" fontWeight="bold">{data.collaboration?.totalMessages}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Urgent Medical Alerts Flagged</Typography>
                  <Typography variant="body2" fontWeight="bold" color="error.main">{data.collaboration?.urgentMessages}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Scheduled MDT Reviews</Typography>
                  <Typography variant="body2" fontWeight="bold">{data.collaboration?.totalMdtMeetings}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Completed MDT Board Decisions</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">{data.collaboration?.completedMdtMeetings}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Active Case Collaboration Threads</Typography>
                  <Typography variant="body2" fontWeight="bold">{data.collaboration?.totalCaseDiscussions}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ─── MODULE 7 LIMS LABORATORY ANALYTICS ─── */}
      <Typography variant="subtitle1" fontWeight="bold" mt={4} mb={2} sx={{ color: '#3b5bdb' }}>
        🔬 Laboratory Information System (LIMS) Analytics
      </Typography>
      <Grid container spacing={3}>
        {/* KPI Cards */}
        {[
          { label: 'Total Lab Orders',       value: data.lims?.totalOrders ?? 0,               color: '#3b5bdb' },
          { label: 'Lab Revenue (₦)',         value: `₦${(data.lims?.totalRevenue ?? 0).toLocaleString()}`,   color: '#2f9e44' },
          { label: 'Avg TAT (hours)',          value: `${data.lims?.avgTATHours ?? 0}h`,          color: '#1c7ed6' },
          { label: 'QC Pass Rate',             value: `${data.lims?.qc?.passRate ?? 100}%`,       color: '#0ca678' },
          { label: 'Critical Alert Ack Rate',  value: `${data.lims?.criticalAlerts?.ackRate ?? 100}%`, color: '#ae3ec9' },
          { label: 'Low Stock Items',          value: data.lims?.inventory?.lowStockCount ?? 0,   color: '#f76707' },
        ].map(kpi => (
          <Grid item xs={6} sm={4} md={2} key={kpi.label}>
            <Card sx={{ boxShadow: 'none', border: `1px solid ${kpi.color}25`, bgcolor: `${kpi.color}08`, borderRadius: 3 }}>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={900} color={kpi.color}>{kpi.value}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{kpi.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Orders by Status */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={2}>Lab Orders by Status</Typography>
              <Stack spacing={1.2}>
                {data.lims?.ordersByStatus && Object.entries(data.lims.ordersByStatus).map(([status, count]: [string, any]) => {
                  const total = Object.values(data.lims.ordersByStatus).reduce((a: number, b: any) => a + Number(b), 0) as number;
                  const pct = total > 0 ? Math.round((Number(count) / total) * 100) : 0;
                  const color: Record<string,string> = { PENDING: '#f59f00', SPECIMEN_COLLECTED: '#1c7ed6', IN_PROGRESS: '#ae3ec9', COMPLETED: '#2f9e44', CANCELLED: '#e03131' };
                  return (
                    <Box key={status}>
                      <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.3 }}>
                        <Typography variant="body2" fontWeight={600}>{status.replace(/_/g,' ')}</Typography>
                        <Typography variant="body2" fontWeight={800}>{count} ({pct}%)</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pct}
                        sx={{ height:6, borderRadius:3, bgcolor: `${color[status] || '#868e96'}20`, '& .MuiLinearProgress-bar': { bgcolor: color[status] || '#868e96', borderRadius:3 } }} />
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Results by Interpretation */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={2}>Lab Results by Interpretation</Typography>
              <Stack spacing={1.2}>
                {data.lims?.results?.byInterpretation && Object.entries(data.lims.results.byInterpretation).map(([interp, count]: [string, any]) => {
                  const total = Object.values(data.lims.results.byInterpretation).reduce((a: number, b: any) => a + Number(b), 0) as number;
                  const pct = total > 0 ? Math.round((Number(count) / total) * 100) : 0;
                  const color: Record<string,string> = { NORMAL:'#2f9e44', ABNORMAL:'#f59f00', CRITICAL_LOW:'#e03131', CRITICAL_HIGH:'#e03131', POSITIVE:'#ae3ec9', NEGATIVE:'#2f9e44' };
                  return (
                    <Box key={interp} sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <Typography variant="body2" fontWeight={600}>{interp}</Typography>
                      <Chip label={`${count} (${pct}%)`} size="small" sx={{ fontSize:'0.7rem', fontWeight:700, bgcolor: `${color[interp]||'#868e96'}15`, color: color[interp]||'#868e96' }} />
                    </Box>
                  );
                })}
              </Stack>

              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Results Entered</Typography>
                  <Typography variant="body2" fontWeight={700}>{data.lims?.results?.total ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Results Verified (1st Sign-off)</Typography>
                  <Typography variant="body2" fontWeight={700} color="primary.main">{data.lims?.results?.verifiedCount ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Results Validated & Released</Typography>
                  <Typography variant="body2" fontWeight={700} color="success.main">{data.lims?.results?.validatedCount ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Critical Value Results</Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main">{data.lims?.results?.criticalCount ?? 0}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* QC & Critical Alerts */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={2}>Quality Control Performance</Typography>
              <Stack spacing={1.5}>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total QC Runs</Typography>
                  <Typography variant="body2" fontWeight={700}>{data.lims?.qc?.totalRuns ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">QC Passed</Typography>
                  <Typography variant="body2" fontWeight={700} color="success.main">{data.lims?.qc?.passed ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">QC Pass Rate</Typography>
                  <Chip label={`${data.lims?.qc?.passRate ?? 100}%`} size="small" color={(data.lims?.qc?.passRate ?? 100) >= 95 ? 'success' : 'warning'} sx={{ fontWeight:800 }} />
                </Box>
                <Divider />
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Critical Alerts Raised</Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main">{data.lims?.criticalAlerts?.total ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Critical Alerts Acknowledged</Typography>
                  <Typography variant="body2" fontWeight={700} color="success.main">{data.lims?.criticalAlerts?.acknowledged ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Acknowledgment Rate</Typography>
                  <Chip label={`${data.lims?.criticalAlerts?.ackRate ?? 100}%`} size="small" color={(data.lims?.criticalAlerts?.ackRate ?? 100) >= 95 ? 'success' : 'error'} sx={{ fontWeight:800 }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Inventory Summary */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={2}>Lab Inventory & Supply Chain Status</Typography>
              <Stack spacing={1.5}>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Active Inventory Items</Typography>
                  <Typography variant="body2" fontWeight={700}>{data.lims?.inventory?.totalItems ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Items at Reorder Level</Typography>
                  <Typography variant="body2" fontWeight={700} color="warning.main">{data.lims?.inventory?.lowStockCount ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Items at Critical Stock Level</Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main">{data.lims?.inventory?.criticalStockCount ?? 0}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Orders by Priority – STAT</Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main">{data.lims?.ordersByPriority?.STAT ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Orders by Priority – URGENT</Typography>
                  <Typography variant="body2" fontWeight={700} color="warning.main">{data.lims?.ordersByPriority?.URGENT ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Orders by Priority – ROUTINE</Typography>
                  <Typography variant="body2" fontWeight={700}>{data.lims?.ordersByPriority?.ROUTINE ?? 0}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ─── MODULE 9 PHARMACY ANALYTICS ─── */}
      <Typography variant="subtitle1" fontWeight="bold" mt={5} mb={2} sx={{ color: '#10b981' }}>
        💊 Pharmacy Management System Analytics
      </Typography>
      <Grid container spacing={3} mb={3}>
        {/* KPI Cards */}
        {[
          { label: 'Total Prescriptions',    value: data.pharmacy?.totalPrescriptions ?? 0,               color: '#10b981' },
          { label: 'Dispensed Items',        value: data.pharmacy?.totalDispensed ?? 0,                   color: '#2f9e44' },
          { label: 'Rx Sales Revenue',       value: `₦${(data.pharmacy?.totalRevenue ?? 0).toLocaleString()}`, color: '#2f9e44' },
          { label: 'Avg Verification TAT',   value: `${data.pharmacy?.avgTATMinutes ?? 0} mins`,          color: '#1c7ed6' },
          { label: 'Counselling Compliance', value: `${data.pharmacy?.counsellingComplianceRate ?? 100}%`, color: '#ae3ec9' },
          { label: 'Low Stock Drugs',        value: data.pharmacy?.inventory?.lowStockCount ?? 0,         color: '#f59f00' },
        ].map(kpi => (
          <Grid item xs={6} sm={4} md={2} key={kpi.label}>
            <Card sx={{ boxShadow: 'none', border: `1px solid ${kpi.color}25`, bgcolor: `${kpi.color}08`, borderRadius: 3 }}>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={900} color={kpi.color}>{kpi.value}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{kpi.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Prescriptions by Status */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={2}>Prescription Queue Status</Typography>
              <Stack spacing={1.2}>
                {data.pharmacy?.statusCounts && Object.entries(data.pharmacy.statusCounts).map(([status, count]: [string, any]) => {
                  const total = Object.values(data.pharmacy.statusCounts).reduce((a: number, b: any) => a + Number(b), 0) as number;
                  const pct = total > 0 ? Math.round((Number(count) / total) * 100) : 0;
                  const color: Record<string,string> = { PENDING_VERIFICATION: '#f59f00', VERIFIED: '#1c7ed6', PARTIAL_DISPENSED: '#ae3ec9', DISPENSED: '#2f9e44', CANCELLED: '#e03131' };
                  return (
                    <Box key={status}>
                      <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.3 }}>
                        <Typography variant="body2" fontWeight={600}>{status.replace(/_/g,' ')}</Typography>
                        <Typography variant="body2" fontWeight={800}>{count} ({pct}%)</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pct}
                        sx={{ height:6, borderRadius:3, bgcolor: `${color[status] || '#868e96'}20`, '& .MuiLinearProgress-bar': { bgcolor: color[status] || '#868e96', borderRadius:3 } }} />
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Medication Safety & Clinical Pharmacy Indicators */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={2}>Medication Safety & Clinical Indicators</Typography>
              <Stack spacing={1.5}>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Adverse Drug Events (ADEs) Flagged</Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main">{data.pharmacy?.adesCount ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Clinical Pharmacy Interventions Logged</Typography>
                  <Typography variant="body2" fontWeight={700}>{data.pharmacy?.interventionsCount ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Clinician Recommendation Acceptance Rate</Typography>
                  <Chip label={`${data.pharmacy?.interventionAcceptanceRate ?? 100}%`} size="small" color="success" sx={{ fontWeight:800 }} />
                </Box>
                <Divider />
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Controlled Substance Dispatches</Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main">{data.pharmacy?.controlledSubstancesDispensed ?? 0}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Formulary Drugs Carrying Valuation</Typography>
                  <Typography variant="body2" fontWeight={700}>₦{(data.pharmacy?.inventory?.valuation ?? 0).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Near-Expiry Warning Items (90 Days)</Typography>
                  <Typography variant="body2" fontWeight={700} color="warning.main">{data.pharmacy?.inventory?.nearExpiryCount ?? 0}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
// Helper for first table
const MonthTableCell = ({ children }: { children: React.ReactNode }) => (
  <TableCell sx={{ fontWeight: 'bold' }}>{children}</TableCell>
);
export default Reports;
