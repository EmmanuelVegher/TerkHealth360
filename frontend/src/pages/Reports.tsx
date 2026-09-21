import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
    Box, Typography, Grid, Card, CardContent, Button, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, LinearProgress, Stack, Avatar, Tabs, Tab, TextField, MenuItem,
    InputAdornment, Paper, CircularProgress,
  } from '@mui/material';
  import {
    Download, TrendingUp, TrendingDown, Assessment, People,
    LocalHospital, Receipt, Biotech, CameraAlt, AccountBalance,
    Assignment, History, Search,
  } from '@mui/icons-material';
  import { alpha } from '@mui/material/styles';
  import { api } from '../services/api';
  
  /* ── Mini bar chart (CSS-only) ─────────────────────────────── */
  const BAR_DATA = [
    { month:'Jan', opd:120, revenue:620 },
    { month: 'Jan', opd: 120, revenue: 620 },
  { month: 'Feb', opd: 145, revenue: 710 },
  { month: 'Mar', opd: 130, revenue: 680 },
  { month: 'Apr', opd: 160, revenue: 820 },
  { month: 'May', opd: 175, revenue: 900 },
  { month: 'Jun', opd: 148, revenue: 840 },
  ];
  const BarChart = () => {
    const maxRevenue = Math.max(...BAR_DATA.map(d => d.revenue));
    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 140, px: 1 }}>
        {BAR_DATA.map(d => (
          
          <Box key={d.month} sx={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:0.5 }}>
            <Box sx={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:0.5, flex:1, justifyContent:'flex-end' }}>
              <Box sx={{ width:'60%', bgcolor:'#3b5bdb', borderRadius:'4px 4px 0 0',
                height:`${(d.revenue/maxRevenue)*100}%`, minHeight:4,
                transition:'height 0.4s ease', '&:hover':{ bgcolor:'#4c6ef5', cursor:'pointer' } }} />
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>{d.month}</Typography>
          </Box>
        ))}
      </Box>
    );
  };
  /* ── Top diagnoses ─────────────────────────────────────────── */
  const diagnoses = [
    { name: 'Malaria',           count: 342, pct: 28, color: '#f03e3e' },
    { name: 'Hypertension',      count: 287, pct: 23, color: '#3b5bdb' },
    { name: 'Diabetes Mellitus', count: 198, pct: 16, color: '#f59f00' },
    { name: 'Typhoid Fever',     count: 165, pct: 14, color: '#0ca678' },
    { name: 'Respiratory Tract', count: 142, pct: 12, color: '#6741d9' },
    { name: 'Others',            count: 86,  pct: 7,  color: '#6b7194' },
  ];
  /* ── Monthly summary table ─────────────────────────────────── */
  const monthlySummary = [
    { month: 'June 2026',     patients: 712, opd: 148, ipd: 77,  revenue: '$84,000',  expenses: '$51,000', profit: '$33,000' },
    { month: 'May 2026',      patients: 680, opd: 175, ipd: 82,  revenue: '$90,000',  expenses: '$54,000', profit: '$36,000' },
    { month: 'April 2026',    patients: 655, opd: 160, ipd: 70,  revenue: '$82,000',  expenses: '$50,000', profit: '$32,000' },
    { month: 'March 2026',    patients: 598, opd: 130, ipd: 65,  revenue: '$68,000',  expenses: '$42,000', profit: '$26,000' },
  ];

/* ── Mock Data for Sub-Reports ─────────────────────────────── */
const balanceReportData = [
  { id: 'BAL-101', patient: 'Sarah Johnson', type: 'IPD', total: 3200, paid: 2500, balance: 700, tpa: 'AXA Mansard HMO', date: '2026-06-20' },
  { id: 'BAL-102', patient: 'Emeka Okonkwo', type: 'OPD', total: 1500, paid: 1500, balance: 0, tpa: 'None', date: '2026-06-22' },
  { id: 'BAL-103', patient: 'Adaeze Chukwu', type: 'IPD', total: 4500, paid: 3500, balance: 1000, tpa: 'Reliance HMO', date: '2026-06-23' },
  { id: 'BAL-104', patient: 'Yusuf Ibrahim', type: 'OPD', total: 800, paid: 300, balance: 500, tpa: 'Leadway Health', date: '2026-06-24' },
];
const tpaClaimData = [
  { claimId: 'CLM-8831', patientName: 'Sarah Johnson', patientTpaId: 'AXA-PAT-901', insurer: 'AXA Mansard HMO', amount: 2500, status: 'Approved', date: '2026-06-21' },
  { claimId: 'CLM-9012', patientName: 'Adaeze Chukwu', patientTpaId: 'REL-PAT-332', insurer: 'Reliance HMO', amount: 3500, status: 'Submitted', date: '2026-06-23' },
  { claimId: 'CLM-7740', patientName: 'Yusuf Ibrahim', patientTpaId: 'LWY-PAT-551', insurer: 'Leadway Health', amount: 300, status: 'Pending', date: '2026-06-24' },
  { claimId: 'CLM-4112', patientName: 'Kemi Adeyemi', patientTpaId: 'AXA-PAT-712', insurer: 'AXA Mansard HMO', amount: 1800, status: 'Rejected', date: '2026-06-24' },
];
const pathologyBalanceData = [
  { refNo: 'PATH-001', patient: 'Emeka Okonkwo', testName: 'Haemoglobin (Hb)', total: 12.00, paid: 12.00, balance: 0.00, date: '2026-06-24' },
  { refNo: 'PATH-002', patient: 'Adaeze Chukwu', testName: 'HIV ELISA', total: 30.00, paid: 0.00, balance: 30.00, date: '2026-06-24' },
  { refNo: 'PATH-003', patient: 'Yusuf Ibrahim', testName: 'Liver Function Test', total: 50.00, paid: 50.00, balance: 0.00, date: '2026-06-24' },
  { refNo: 'PATH-004', patient: 'Kemi Owolabi', testName: 'Pap Smear', total: 60.00, paid: 40.00, balance: 20.00, date: '2026-06-23' },
];
const radiologyBalanceData = [
  { refNo: 'RAD-001', patient: 'Kemi Adeyemi', testName: 'Chest X-Ray', total: 45.00, paid: 45.00, balance: 0.00, date: '2026-06-22' },
  { refNo: 'RAD-002', patient: 'Yusuf Ibrahim', testName: 'MRI Brain Scan', total: 250.00, paid: 150.00, balance: 100.00, date: '2026-06-23' },
  { refNo: 'RAD-003', patient: 'Felix Nwachukwu', testName: 'Ultrasound Abdomen', total: 35.00, paid: 0.00, balance: 35.00, date: '2026-06-24' },
];
const allTransactionsData = [
  { txId: 'TX-9011', description: 'Patient OPD Registration', type: 'Appointment', amount: 15.00, date: '2026-06-24', method: 'Cash' },
  { txId: 'TX-9012', description: 'Pharmacy Dispense - Amoxicillin', type: 'Pharmacy', amount: 24.50, date: '2026-06-24', method: 'POS' },
  { txId: 'TX-9013', description: 'Lab Request - Liver Function', type: 'Laboratory', amount: 50.00, date: '2026-06-24', method: 'TPA Claims' },
  { txId: 'TX-9014', description: 'IPD Ward Bed Charge Recovery', type: 'Billing', amount: 320.00, date: '2026-06-23', method: 'Bank Transfer' },
  { txId: 'TX-9015', description: 'Virtual OPD Consultation', type: 'Appointment', amount: 20.00, date: '2026-06-23', method: 'Stripe Gateway' },
];
const ledgerData = [
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

    const kpis = [
      { label: 'Total Patients (YTD)', value: '4,821', sub: '+12.5% vs last year', icon: <People />, color: '#3b5bdb', up: true },
    { label: 'OPD Visits (Month)',   value: '148',   sub: '+8.2% vs last month', icon: <LocalHospital />, color: '#0ca678', up: true },
    { label: 'Revenue (Month)',      value: '$84,000', sub: '+21.4% vs last month', icon: <Receipt />, color: '#2f9e44', up: true },
    { label: 'Avg. LOS (Days)',      value: '4.2',   sub: '-0.3 days improvement', icon: <Assessment />, color: '#f59f00', up: true },
    ];

    // Filtering balance report based on select type (All / OPD / IPD)
  const filteredBalance = balanceReportData.filter(b => {
    const matchesType = filterType === 'All' || b.type === filterType;
    const matchesSearch = b.patient.toLowerCase().includes(searchQuery.toLowerCase()) || b.tpa.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/reports/nhmis') setTab(7);
    else if (path === '/reports/financial') setTab(1);
    else if (path === '/reports/audits') setTab(8);
    else setTab(0);
  }, [location.pathname]);

  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/reports/nhmis') {
      return {
        title: 'FMOH NHMIS & Clinical Health Registers Desk',
        subtitle: 'National Health Management Information System (NHMIS 2013/2019) Monthly Indicators',
        category: 'Enterprise Reports',
        kpis: [
          { label: 'NHMIS Compliance', value: '100% Submitted', subtitle: 'Monthly Indicator Status', icon: <Assignment />, color: '#16a34a' },
          { label: 'OPD Attendances', value: '1,420 Patients', subtitle: 'Form 001 Submissions', icon: <People />, color: '#3b5bdb' },
          { label: 'Maternal Registrations', value: '85 Mothers', subtitle: 'ANC Register Logged', icon: <LocalHospital />, color: '#7c3aed' },
          { label: 'Data Quality Audit', value: 'Zero Errors', subtitle: 'LGA Verification', icon: <Assessment />, color: '#0ca678' },
        ],
      };
    }

    if (path === '/reports/financial') {
      return {
        title: 'Financial Revenue, Outstanding Balances & TPA Claims',
        subtitle: 'OPD/IPD Patient Balance Ledgers · HMO TPA Claims Verification · Transaction Journals',
        category: 'Enterprise Reports',
        kpis: [
          { label: 'Total Revenue YTD', value: '$480,000', subtitle: 'Gross Billings', icon: <AccountBalance />, color: '#3b5bdb' },
          { label: 'Outstanding Balances', value: '$34,500', subtitle: 'Pending Copays', icon: <Receipt />, color: '#ea580c' },
          { label: 'TPA Claims Value', value: '$84,200', subtitle: 'HMO Receivables', icon: <Assignment />, color: '#7c3aed' },
          { label: 'Settlement Rate', value: '94.8%', subtitle: 'Payer Clearance', icon: <Assessment />, color: '#16a34a' },
        ],
      };
    }

    if (path === '/reports/audits') {
      return {
        title: 'Operational Governance & Clinical Quality Audits',
        subtitle: 'Clinical Outcome Indicators · Length of Stay (LOS) Audits · Mortality Review Center',
        category: 'Enterprise Reports',
        kpis: [
          { label: 'Avg Length of Stay', value: '4.2 Days', subtitle: '-0.3 Days Improvement', icon: <Assessment />, color: '#f59f00' },
          { label: 'Clinical Audits', value: '12 Audits', subtitle: 'Quarterly Audits Done', icon: <Assignment />, color: '#0ca678' },
          { label: 'Bed Turnover Rate', value: '88%', subtitle: 'Occupancy Utilization', icon: <LocalHospital />, color: '#3b5bdb' },
          { label: 'Patient Satisfaction', value: '96.2%', subtitle: 'Survey Scorecard', icon: <People />, color: '#7c3aed' },
        ],
      };
    }

    // Default: Executive
    return {
      title: 'Executive Performance Overview & BI Scorecards',
      subtitle: 'Hospital-Wide Operational KPI Scorecard · OPD vs IPD Volume · Diagnostic Revenue',
      category: 'Enterprise Reports',
      kpis: [
        { label: 'Total Patients (YTD)', value: '4,820', subtitle: '+12% vs last year', icon: <People />, color: '#3b5bdb' },
        { label: 'Gross Revenue (YTD)', value: '$480,000', subtitle: '+18% vs target', icon: <Receipt />, color: '#2f9e44' },
        { label: 'Bed Occupancy Rate', value: '78%', subtitle: '+5% vs last month', icon: <LocalHospital />, color: '#6741d9' },
        { label: 'Avg. LOS (Days)', value: '4.2', subtitle: '-0.3 days improvement', icon: <Assessment />, color: '#f59f00' },
      ],
    };
  };

  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
      {/* Banner */}
      <Box sx={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #3b5bdb 100%)', color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Reports &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              📊 {pageDetails.title}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.88, fontWeight: 500, display: 'block', mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Download />} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}>Export PDF</Button>
          </Stack>
        </Stack>
      </Box>

      {/* KPI Cards */}
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
      <Tabs value={tab} onChange={(_, val) => setTab(val)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab label="Performance Overview" icon={<Assessment sx={{ fontSize: 16 }} />} iconPosition="start" />
        <Tab label="Balance Amount Report" icon={<Receipt sx={{ fontSize: 16 }} />} iconPosition="start" />
        <Tab label="TPA Claim Report" icon={<Assignment sx={{ fontSize: 16 }} />} iconPosition="start" />
        <Tab label="Pathology Balance" icon={<Biotech sx={{ fontSize: 16 }} />} iconPosition="start" />
        <Tab label="Radiology Balance" icon={<CameraAlt sx={{ fontSize: 16 }} />} iconPosition="start" />
        <Tab label="All Transactions" icon={<History sx={{ fontSize: 16 }} />} iconPosition="start" />
        <Tab label="Income & Expenses" icon={<AccountBalance sx={{ fontSize: 16 }} />} iconPosition="start" />
        <Tab label="Clinical Registers" icon={<People sx={{ fontSize: 16 }} />} iconPosition="start" />
        <Tab label="Operational Analytics" icon={<Assessment sx={{ fontSize: 16 }} />} iconPosition="start" />
      </Tabs>
      {/* Tab 0: Performance Overview */}
      {tab === 0 && (
        <Box>
          {/* KPI cards */}
          <Grid container spacing={2.5} mb={3}>
          {kpis.map((k) => (
              <Grid item xs={12} sm={6} lg={3} key={k.label}>
                <Card sx={{
                  boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none',
                  transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-3px)' }
                }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>{k.label}</Typography>
                        <Typography variant="h4" fontWeight={800} mt={0.5}>{k.value}</Typography>
                      </Box>
                      <Avatar sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: alpha(k.color, 0.12), color: k.color }}>
                        {k.icon}
                      </Avatar>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                      {k.up ? <TrendingUp sx={{ fontSize: 15, color: '#2f9e44' }} /> : <TrendingDown sx={{ fontSize: 15, color: '#f03e3e' }} />}
                      <Typography variant="caption" color={k.up ? '#2f9e44' : '#f03e3e'} fontWeight={600}>{k.sub}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            
            
            </Grid>
         
            <Grid container spacing={2.5} mb={3}>
            {/* Revenue chart */}
            <Grid item xs={12} md={7}>
              <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={700}>Monthly Revenue ($000)</Typography>
                    <Chip label="Jan–Jun 2026" size="small" sx={{ bgcolor: alpha('#3b5bdb', 0.08), color: '#3b5bdb', fontWeight: 600 }} />

                 
                    </Box>
                 
         
                    <BarChart />
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    {[{ label: 'Peak Month', value: 'May – $90K', color: '#2f9e44' }, { label: 'Current Month', value: 'Jun – $84K', color: '#3b5bdb' }, { label: 'Avg Monthly', value: '$76.2K', color: '#6b7194' }].map(s => (
                      <Box key={s.label}>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        <Typography variant="body2" fontWeight={700} color={s.color}>{s.value}</Typography>
                      </Box>
                    ))}

                    </Box>
                    </CardContent>
              </Card>
            </Grid>
            {/* Top diagnoses */}
            <Grid item xs={12} md={5}>
              <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none', height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" fontWeight={700} mb={2.5}>Top Diagnoses (Month)</Typography>
                  <Stack spacing={2}>
                    {diagnoses.map(d => (
                      <Box key={d.name}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                          <Typography variant="body2" fontWeight={500}>{d.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{d.count} <Typography component="span" variant="caption">({d.pct}%)</Typography></Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={d.pct}
                          sx={{
                            height: 7, borderRadius: 4, bgcolor: alpha(d.color, 0.1),
                            '& .MuiLinearProgress-bar': { bgcolor: d.color, borderRadius: 4 }
                          }} />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          {/* Monthly summary table */}
          <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Monthly Summary</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <MonthTableCell>Month</MonthTableCell>
                      <TableCell align="right">Total Patients</TableCell>
                      <TableCell align="right">OPD</TableCell>
                      <TableCell align="right">IPD</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">Expenses</TableCell>
                      <TableCell align="right">Net Profit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {monthlySummary.map((r, i) => (
                      <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell><Typography variant="body2" fontWeight={600}>{r.month}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2">{r.patients}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2">{r.opd}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2">{r.ipd}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" color="success.main" fontWeight={600}>{r.revenue}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" color="error.main">{r.expenses}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" fontWeight={700} color="primary.main">{r.profit}</Typography></TableCell>
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
                 
                {filteredBalance.map((b) => (
                  <TableRow key={b.id} hover>
                    <TableCell>{b.id}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{b.patient}</TableCell>
                    <TableCell><Chip label={b.type} size="small" variant="outlined" color={b.type === 'IPD' ? 'primary' : 'secondary'} /></TableCell>
                    <TableCell><Chip label={b.tpa} size="small" color={b.tpa !== 'None' ? 'primary' : 'default'} /></TableCell>
                    <TableCell align="right">${b.total.toFixed(2)}</TableCell>
                    <TableCell align="right">${b.paid.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: b.balance > 0 ? '#f03e3e' : 'inherit' }}>
                      ${b.balance.toFixed(2)}
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
              {tpaClaimData.map((c) => (
                <TableRow key={c.claimId} hover>
                  <TableCell>{c.claimId}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{c.patientName}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{c.patientTpaId}</TableCell>
                  <TableCell>{c.insurer}</TableCell>
                  <TableCell align="right">${c.amount.toFixed(2)}</TableCell>
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
        <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Reference No</TableCell>
                <TableCell>Patient Name</TableCell>
                <TableCell>Test Name</TableCell>
                <TableCell align="right">Total Charge</TableCell>
                <TableCell align="right">Paid Amount</TableCell>
                <TableCell align="right">Balance Outstanding</TableCell>
                <TableCell>Test Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pathologyBalanceData.map((p) => (
                <TableRow key={p.refNo} hover>
                  <TableCell>{p.refNo}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{p.patient}</TableCell>
                  <TableCell>{p.testName}</TableCell>
                  <TableCell align="right">${p.total.toFixed(2)}</TableCell>
                  <TableCell align="right">${p.paid.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: p.balance > 0 ? '#f03e3e' : 'inherit' }}>
                    ${p.balance.toFixed(2)}
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
        <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Reference No</TableCell>
                <TableCell>Patient Name</TableCell>
                <TableCell>Test Name</TableCell>
                <TableCell align="right">Total Charge</TableCell>
                <TableCell align="right">Paid Amount</TableCell>
                <TableCell align="right">Balance Outstanding</TableCell>
                <TableCell>Scan Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {radiologyBalanceData.map((r) => (
                <TableRow key={r.refNo} hover>
                  <TableCell>{r.refNo}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{r.patient}</TableCell>
                  <TableCell>{r.testName}</TableCell>
                  <TableCell align="right">${r.total.toFixed(2)}</TableCell>
                  <TableCell align="right">${r.paid.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: r.balance > 0 ? '#f03e3e' : 'inherit' }}>
                    ${r.balance.toFixed(2)}
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
        <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Transaction ID</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Transaction Type</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allTransactionsData.map((t) => (
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
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>${t.amount.toFixed(2)}</TableCell>
                  <TableCell>{t.method}</TableCell>
                  <TableCell>{t.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* Tab 6: Income & Expenses Ledger */}
      {tab === 6 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ledger Entry</TableCell>
                    <TableCell>Ledger Category</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                {ledgerData.map((l, idx) => (
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
                        {l.category === 'Income' ? '+' : '-'}${l.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{l.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Net Surplus Summary</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">Total Revenue</Typography>
                  <Typography variant="body2" fontWeight={700} color="success.main">+$42,700.00</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">Total Expenditures</Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main">-$21,200.00</Typography>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" fontWeight="bold">Net Cashflow margin</Typography>
                  <Typography variant="subtitle2" fontWeight={800} color="primary.main">+$21,500.00</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 7 && (
        <ClinicalRegistersTab />
      )}

      {tab === 8 && (
        <OperationalAnalyticsTab />
      )}
    </Box>
  );
};

const ClinicalRegistersTab = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState(0);

  useEffect(() => {
    const fetchRegisters = async () => {
      try {
        const res = await api.get('/reports/clinical-registers');
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRegisters();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  if (!data) return <Typography>Failed to load clinical registers.</Typography>;

  return (
    <Box>
      <Tabs value={subTab} onChange={(_, val) => setSubTab(val)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab label="Allergy Register" />
        <Tab label="Chronic Disease Register" />
        <Tab label="Duplicate Merges Log" />
        <Tab label="Inpatient Ward Occupancy" />
      </Tabs>

      {/* Allergy Register */}
      {subTab === 0 && (
        <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Patient MRN</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Allergen Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Severity</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Identified Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.allergyRegister?.map((al: any) => (
                <TableRow key={al.id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{al.mrn}</TableCell>
                  <TableCell>{al.patientName}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{al.allergen}</TableCell>
                  <TableCell>{al.category}</TableCell>
                  <TableCell>
                    <Chip label={al.severity} size="small" color={al.severity === 'LIFE_THREATENING' || al.severity === 'SEVERE' ? 'error' : 'warning'} />
                  </TableCell>
                  <TableCell>{new Date(al.identifiedDate).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {data.allergyRegister?.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>No documented allergies in register.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Chronic Disease Register */}
      {subTab === 1 && (
        <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Patient MRN</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Chronic Diagnosis</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ICD Code</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Onset Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.chronicRegister?.map((cr: any) => (
                <TableRow key={cr.id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{cr.mrn}</TableCell>
                  <TableCell>{cr.patientName}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{cr.diagnosis}</TableCell>
                  <TableCell><Chip label={cr.code} size="small" variant="outlined" /></TableCell>
                  <TableCell>{new Date(cr.onset).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {data.chronicRegister?.length === 0 && (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>No active chronic disease registers documented.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Merges Register */}
      {subTab === 2 && (
        <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Authorized User</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Surviving Patient</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Obsolete Patient</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Justification</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.mergesRegister?.map((mr: any) => (
                <TableRow key={mr.id}>
                  <TableCell>{new Date(mr.date).toLocaleDateString()}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>@{mr.user}</TableCell>
                  <TableCell>{mr.survivingPatientId}</TableCell>
                  <TableCell>{mr.obsoletePatientId}</TableCell>
                  <TableCell>{mr.justification}</TableCell>
                </TableRow>
              ))}
              {data.mergesRegister?.length === 0 && (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>No record merges have been logged.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Inpatient Ward Register */}
      {subTab === 3 && (
        <Box>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ p: 2, bgcolor: 'action.hover', border: 'none' }}>
                <Typography variant="caption" color="text.secondary">Total Configured Wards</Typography>
                <Typography variant="h5" fontWeight="bold">{data.stats?.totalWards}</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ p: 2, bgcolor: 'action.hover', border: 'none' }}>
                <Typography variant="caption" color="text.secondary">Total Hospital Beds</Typography>
                <Typography variant="h5" fontWeight="bold">{data.stats?.totalBeds}</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ p: 2, bgcolor: 'action.hover', border: 'none' }}>
                <Typography variant="caption" color="text.secondary">Active Inpatients Admitted</Typography>
                <Typography variant="h5" fontWeight="bold">{data.stats?.activeAdmissions}</Typography>
              </Card>
            </Grid>
          </Grid>
          <TableContainer component={Paper} sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Patient MRN</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Ward Assigned</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Bed Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Admission Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.wardRegister?.map((wr: any) => (
                  <TableRow key={wr.id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{wr.mrn}</TableCell>
                    <TableCell>{wr.patientName}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{wr.ward}</TableCell>
                    <TableCell><Chip label={wr.bed} size="small" /></TableCell>
                    <TableCell>{new Date(wr.admittedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {data.wardRegister?.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>No patients are currently admitted in the hospital wards.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
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
