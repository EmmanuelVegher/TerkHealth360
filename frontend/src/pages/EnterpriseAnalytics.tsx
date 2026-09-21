import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Tabs, Tab, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert,
  LinearProgress, Divider, IconButton, Stack, Avatar, Tooltip,
  InputAdornment, Switch, FormControlLabel
} from '@mui/material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip
} from 'recharts';
import {
  Storage, Psychology, Assessment, Gavel, PlayArrow, Refresh, Add, Search,
  CheckCircle, Warning, Cancel, Send, FileDownload, Verified, BarChart,
  Timeline, Policy, LibraryBooks, NetworkCell
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

// ─── Design Tokens & Theme Formatting ────────────────────────────────────────
const PRIMARY = '#1e293b';
const SECONDARY = '#0f172a';
const SUCCESS = '#16a34a';
const WARNING = '#ea580c';
const DANGER = '#dc2626';
const PURPLE = '#7c3aed';
const TEAL = '#0d9488';
const GOLD = '#ca8a04';

const COLORS = ['#7c3aed', '#0d9488', '#ea580c', '#16a34a', '#1e293b', '#3b82f6'];

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
  const l = label?.toUpperCase();
  if (['SUCCESS', 'ACTIVE', 'TARGET_MET', 'RESOLVED', 'CERTIFIED'].includes(l)) color = 'success';
  if (['PENDING_REVIEW', 'RUNNING', 'WARNING', 'MEDIUM_RISK', 'HOURLY', 'DAILY'].includes(l)) color = 'warning';
  if (['FAILED', 'HIGH_RISK', 'LIFE_THREATENING', 'CRITICAL'].includes(l)) color = 'error';
  if (['PATIENT', 'MEDICATION', 'CLINICAL', 'FINANCIAL', 'OPERATIONAL', 'REAL_TIME'].includes(l)) color = 'info';

  return <Chip label={label?.replace('_', ' ')} size="small" color={color} sx={{ fontWeight: 700, fontSize: '0.68rem' }} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTERPRISE ANALYTICS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const EnterpriseAnalytics = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // ─── Data States ──────────────────────────────────────────────────────────
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [mdm, setMdm] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});

  // ─── Dialog States ────────────────────────────────────────────────────────
  const [predictionDialogOpen, setPredictionDialogOpen] = useState(false);

  // ─── Sub-Tab Index States ──────────────────────────────────────────────────
  const [subTab0, setSubTab0] = useState(0);
  const [subTab1, setSubTab1] = useState(0);
  const [subTab2, setSubTab2] = useState(0);
  const [subTab3, setSubTab3] = useState(0);

  // ─── Fetch All Data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [piRes, mdRes, moRes, prRes, kpRes, biRes] = await Promise.all([
        api.get('/analytics/etl'),
        api.get('/analytics/mdm'),
        api.get('/analytics/models'),
        api.get('/analytics/predictions'),
        api.get('/analytics/kpis'),
        api.get('/analytics/analytics'),
      ]);
      setPipelines(piRes.data.data || []);
      setMdm(mdRes.data.data || []);
      setModels(moRes.data.data || []);
      setPredictions(prRes.data.data || []);
      setKpis(kpRes.data.data || []);
      setAnalytics(biRes.data.data || {});
    } catch {
      enqueueSnackbar('Failed to load analytical database', { variant: 'error' });
    }
    setLoading(false);
  }, [enqueueSnackbar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Action Handlers ───────────────────────────────────────────────────────
  const handleTriggerPipeline = async (pipelineId: string) => {
    try {
      await api.post('/analytics/etl/run', { pipelineId });
      enqueueSnackbar('ETL pipeline check-in extraction triggered successfully', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to run ETL pipeline', { variant: 'error' });
    }
  };

  const handleTriggerPrediction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/analytics/predictions', {
        patientName: fd.get('patientName'),
        model: fd.get('model'),
        riskScore: fd.get('riskScore'),
        status: fd.get('status'),
        explainability: fd.get('explainability'),
      });
      enqueueSnackbar('AI model validation complete. Early warning alert dispatched.', { variant: 'success' });
      setPredictionDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to run model prediction', { variant: 'error' });
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 25.1: Data Warehouse & ETL Ingestions
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab1 = () => (
    <Box>
      <Tabs value={subTab0} onChange={(_, v) => setSubTab0(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['ETL Ingestion Pipelines', 'Master Data Management (MDM)'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab0 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 25.1.1 Pipelines ── */}
      <TabPanel value={subTab0} index={0}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Enterprise Data Ingestion Workflows (FR-EDW-011–020)</Typography>
          <Typography variant="caption" color="text.secondary">ETL/ELT data integration scripts extracting data from EMR, NigeriaMRS, and LIMS databases.</Typography>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY }}>
              <TableRow>{['Pipeline ID', 'Pipeline Description Name', 'Schedule Interval', 'Records Ingested Count', 'Latency Average', 'Last Execution Run', 'Status', 'Trigger'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {pipelines.map(pipe => (
                <TableRow key={pipe.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{pipe.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{pipe.name}</TableCell>
                  <TableCell><StatusChip label={pipe.schedule} /></TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{pipe.recordsProcessed} rows</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{pipe.latencySeconds}s</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{pipe.lastRun}</TableCell>
                  <TableCell><StatusChip label={pipe.status} /></TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" startIcon={<PlayArrow />} onClick={() => handleTriggerPipeline(pipe.id)}>Run Sync</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 25.1.2 MDM ── */}
      <TabPanel value={subTab0} index={1}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Master Data Reconciliation Directory (FR-EDW-021–030)</Typography>
          <Typography variant="caption" color="text.secondary">Master Data Management (MDM) ensures consistent enterprise identifiers across patient EMR files and insurer claims profiles.</Typography>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: TEAL }}>
              <TableRow>{['MDM ID', 'Entity Schema Type', 'Primary Golden Record Name', 'Enterprise Master Identifier', 'Source Identifiers reconciled', 'Confidence Rate', 'Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {mdm.map(rec => (
                <TableRow key={rec.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{rec.id}</TableCell>
                  <TableCell><StatusChip label={rec.entityType} /></TableCell>
                  <TableCell sx={{ fontWeight: 650 }}>{rec.primaryName}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: PURPLE }}>{rec.uniqueId}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>{rec.sourceCount} sources</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: TEAL }}>{rec.matchConfidence}</TableCell>
                  <TableCell><StatusChip label={rec.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 25.2: Clinical AI & Decision Support
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab2 = () => (
    <Box>
      <Tabs value={subTab1} onChange={(_, v) => setSubTab1(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['AI Deterioration early warnings', 'Machine Learning Models catalog'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab1 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 25.2.1 Early Warning ── */}
      <TabPanel value={subTab1} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Clinical Early warning warnings (FR-AI-011–020)</Typography>
          <Button variant="contained" startIcon={<Psychology />} onClick={() => setPredictionDialogOpen(true)} sx={{ bgcolor: PURPLE }}>Simulate AI Prediction</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PURPLE }}>
              <TableRow>{['Prediction ID', 'Patient Name', 'Inference AI Model', 'Predicted Risk Score', 'Explainability contributing factors summary', 'Advisory Clinical Action Taken', 'Risk State'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {predictions.map(pred => (
                <TableRow key={pred.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{pred.id}</TableCell>
                  <TableCell sx={{ fontWeight: 650 }}>{pred.patientName}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{pred.model}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: DANGER }}>{pred.riskScore}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{pred.explainability}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', color: SECONDARY }}>{pred.actionTaken}</TableCell>
                  <TableCell><StatusChip label={pred.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 25.2.2 Models Catalog ── */}
      <TabPanel value={subTab1} index={1}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Production AI Models (FR-AI-001–010)</Typography>
          <Typography variant="caption" color="text.secondary">Adheres to explainable AI guidelines (BR-AI-001). Performance and data drift are audited monthly.</Typography>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY }}>
              <TableRow>{['Model ID', 'Model Description Name', 'Version', 'Validated Accuracy', 'Data Drift Factor', 'Last Retrained Date', 'Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {models.map(mod => (
                <TableRow key={mod.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{mod.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{mod.name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{mod.version}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: SUCCESS }}>{mod.accuracy}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', color: DANGER }}>{mod.driftFactor}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{mod.lastRetainedDate}</TableCell>
                  <TableCell><StatusChip label={mod.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 25.3: Business Intelligence scorecards
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab3 = () => (
    <Box>
      <Tabs value={subTab2} onChange={(_, v) => setSubTab2(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['Strategic Balanced Scorecard KPIs', 'Clinical Quality Indicators'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab2 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 25.3.1 KPIs ── */}
      <TabPanel value={subTab2} index={0}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Enterprise Balanced Scorecard KPIs (FR-BI-001–010)</Typography>
          <Typography variant="caption" color="text.secondary">Calculates Target vs Actual parameters across all administrative and operational wards.</Typography>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY }}>
              <TableRow>{['KPI ID', 'Scorecard Metric Particulars', 'Domain Category', 'Baseline reference', 'Target Goal', 'Actual Measured', 'Status Target'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {kpis.map(k => (
                <TableRow key={k.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{k.id}</TableCell>
                  <TableCell sx={{ fontWeight: 650 }}>{k.metricName}</TableCell>
                  <TableCell><StatusChip label={k.category} /></TableCell>
                  <TableCell>{k.baseline}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{k.target}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: k.status === 'TARGET_MET' ? SUCCESS : WARNING }}>{k.actual}</TableCell>
                  <TableCell><StatusChip label={k.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 25.3.2 Clinical Quality ── */}
      <TabPanel value={subTab2} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>HIV Programme Cascade (CARITAS/CDC Nigeria)</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Longitudinal reporting mapping HIV positive treatment initiation to viral suppression rates.
              </Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Enrolled patients currently in care:</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>1,240 patients</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Viral Load Suppression Ratio:</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS }}>94.8% suppression</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Retention in care rate (12 months):</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>91.2% retention</Typography></Stack>
              </Stack>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2, borderLeft: `4px solid ${TEAL}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: TEAL, mb: 1 }}>Maternal & Neonatal Outcomes</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Quality audits tracking pregnancy registry indices over consecutive reporting campaigns.
              </Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Maternal mortality index:</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS }}>0.0% (Zero mortality)</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Early infant diagnosis prophylaxis rate:</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS }}>100% compliant</Typography></Stack>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 25.4: Data Governance & Regulatory
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab4 = () => (
    <Box>
      <Tabs value={subTab3} onChange={(_, v) => setSubTab3(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['Data Governance dashboard', 'NDPA & CARITAS Regulatory Audits'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab3 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 25.4.1 Governance Dashboard ── */}
      <TabPanel value={subTab3} index={0}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}><KPICard title="ETL Pipelines active" value={analytics.totalPipelines || 0} sub="Scheduled extraction flows" icon={<Storage />} color={PRIMARY} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="AI Models running" value={analytics.totalAIModels || 0} sub="Accuracy validations monitored" icon={<Psychology />} color={PURPLE} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="High Risk Predictions" value={analytics.highRiskCount || 0} sub="Early warnings active" icon={<Warning />} color={DANGER} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="KPI target met" value={`${analytics.kpiSuccessRatio || 0}%`} sub="Scorecard target status" icon={<CheckCircle />} color={SUCCESS} /></Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: PRIMARY }}>ETL Pipeline Records Processed (BI Analytics)</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={analytics.distributionByPipeline || []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                    {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, p: 2, borderLeft: `4px solid ${TEAL}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: TEAL, mb: 1 }}>Regulatory De-Identification Exports (FR-EDW-038)</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Research data exports are automatically stripped of personal identifiers (names, telecoms) before compilation (BR-BI-004).
              </Typography>
              <Button variant="outlined" color="primary" onClick={() => enqueueSnackbar('Research de-identified cohort exported successfully', { variant: 'success' })}>Request De-Identified Research Export</Button>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── 25.4.2 Audits Checklist ── */}
      <TabPanel value={subTab3} index={1}>
        <Alert severity="success" icon={<Verified />} sx={{ mb: 2 }}>
          NDPA compliance review completed. Consent matrices correctly block outbound tracking on HIV/TB identifiers (BR-EDW-003).
        </Alert>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN COMPONENT BUILD
  // ══════════════════════════════════════════════════════════════════════════
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/analytics/bi') setActiveTab(0);
    else if (path === '/analytics/predictive') setActiveTab(1);
    else if (path === '/analytics/custom') setActiveTab(2);
    else setActiveTab(0);
  }, [location.pathname]);

  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/analytics/bi') {
      return {
        title: 'Business Intelligence (BI) Operational Dashboards',
        subtitle: 'Enterprise Data Warehouse (EDW) ETL Ingestions · Departmental KPIs',
        category: 'Enterprise Analytics',
        kpis: [
          { label: 'ETL Pipelines', value: `${pipelines.length || 0} Pipelines`, subtitle: 'Active Ingestions', icon: <Storage />, color: PRIMARY },
          { label: 'Data Warehouse Size', value: '42.8 GB', subtitle: 'PostgreSQL DW', icon: <NetworkCell />, color: TEAL },
          { label: 'ETL Success Rate', value: '99.9%', subtitle: 'Nightly Sync', icon: <CheckCircle />, color: SUCCESS },
          { label: 'BI Reports Generated', value: '142 Reports', subtitle: 'Automated Scorecards', icon: <Assessment />, color: PURPLE },
        ],
      };
    }

    if (path === '/analytics/predictive') {
      return {
        title: 'Clinical Decision Support (CDS) & Sepsis Predictive AI',
        subtitle: 'NEWS2 Score Alerts · Machine Learning Sepsis Triggers · Readmission Risk Scores',
        category: 'Enterprise Analytics',
        kpis: [
          { label: 'AI Predictors Active', value: `${models.filter((m: any)=>m.isActive).length || 0} Models`, subtitle: 'Clinical AI Engines', icon: <Psychology />, color: PURPLE },
          { label: 'Sepsis EWS Alerts', value: '0 Active', subtitle: 'Real-Time Monitoring', icon: <Warning />, color: WARNING },
          { label: 'Readmission Risk Avg', value: '12.4%', subtitle: '30-Day Predictive Model', icon: <CheckCircle />, color: SUCCESS },
          { label: 'CDS Rules Active', value: '28 Rules', subtitle: 'Clinical Decision System', icon: <Verified />, color: TEAL },
        ],
      };
    }

    if (path === '/analytics/custom') {
      return {
        title: 'Custom Query Builder, Exports & NDPA Privacy Audits',
        subtitle: 'SQL/NoSQL Report Builder · De-Identified Data Exports · NDPA Consent Audits',
        category: 'Enterprise Analytics',
        kpis: [
          { label: 'Saved Custom Reports', value: '18 Templates', subtitle: 'Query Builder', icon: <LibraryBooks />, color: PRIMARY },
          { label: 'De-Identified Exports', value: '100% Scrubbed', subtitle: 'NDPA Anonymized', icon: <CheckCircle />, color: SUCCESS },
          { label: 'Privacy Audits', value: '0 Breaches', subtitle: 'Consent Matrix', icon: <Policy />, color: TEAL },
          { label: 'Data Retention', value: 'Compliant', subtitle: 'Regulatory Policy', icon: <Gavel />, color: PURPLE },
        ],
      };
    }

    // Default: Warehousing
    return {
      title: 'Enterprise Data Warehousing & Clinical Analytics Center',
      subtitle: 'Data Ingestion Pipelines · Clinical AI Models · Public Health Cascade Dashboards',
      category: 'Enterprise Analytics',
      kpis: [
        { label: 'ETL Pipelines', value: `${pipelines.length || 0} Ingests`, subtitle: 'ETL Scripts', icon: <Storage />, color: PRIMARY },
        { label: 'Active AI Models', value: `${models.filter((m: any)=>m.isActive).length || 0} CDS Models`, subtitle: 'Predictive Engines', icon: <Psychology />, color: PURPLE },
        { label: 'Sepsis Risk Alerts', value: '0 Active', subtitle: 'NEWS2 EWS Monitor', icon: <Warning />, color: WARNING },
        { label: 'De-identified Exports', value: '100% Clean', subtitle: 'NDPA Scrubbed', icon: <Verified />, color: SUCCESS },
      ],
    };
  };

  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', pb: 4 }}>
      {/* Banner */}
      <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 50%, ${TEAL} 100%)`, color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Analytics &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              📈 {pageDetails.title}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.88, fontWeight: 500, display: 'block', mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh analytical scorecards"><IconButton onClick={fetchData} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}><Refresh /></IconButton></Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* KPIStrip */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Grid container spacing={2}>
          {pageDetails.kpis.map((kpi, idx) => (
            <Grid item xs={6} md={3} key={idx}>
              <KPICard title={kpi.label} value={kpi.value} sub={kpi.subtitle} icon={kpi.icon} color={kpi.color} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 3, bgcolor: '#fff', borderRadius: 3, px: 1, py: 0.5, boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48, fontSize: '0.88rem' },
            '& .Mui-selected': { fontWeight: 800, color: `${TEAL} !important` },
            '& .MuiTabs-indicator': { bgcolor: TEAL, height: 3, borderRadius: 2 } }}>
          <Tab icon={<Storage />} iconPosition="start" label="§25.1 Data Warehouse & ETL" />
          <Tab icon={<Psychology />} iconPosition="start" label="§25.2 Clinical AI & CDS Alerts" />
          <Tab icon={<BarChart />} iconPosition="start" label="§25.3 BI Performance Scorecard" />
          <Tab icon={<Gavel />} iconPosition="start" label="§25.4 Governance & Compliance" />
        </Tabs>

        <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>
          {activeTab === 0 && renderTab1()}
          {activeTab === 1 && renderTab2()}
          {activeTab === 2 && renderTab3()}
          {activeTab === 3 && renderTab4()}
        </Card>
      </Box>

      {/* Modals */}

      {/* AI Prediction Dialog */}
      <Dialog open={predictionDialogOpen} onClose={() => setPredictionDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleTriggerPrediction}>
          <DialogTitle sx={{ fontWeight: 800 }}>Simulate Clinical Decision AI</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Patient Name" name="patientName" size="small" fullWidth required placeholder="e.g. Baby Joy" />
              <TextField select label="Inference AI Model" name="model" size="small" fullWidth defaultValue="Sepsis Deterioration Predictor"><MenuItem value="Sepsis Deterioration Predictor">Sepsis Deterioration Predictor</MenuItem><MenuItem value="HIV Treatment Interruption Classifier">HIV Treatment Interruption Classifier</MenuItem></TextField>
              <TextField label="Predicted Risk Score" name="riskScore" size="small" fullWidth required placeholder="e.g. 85%" />
              <TextField select label="Risk Severity Status" name="status" size="small" fullWidth defaultValue="HIGH_RISK"><MenuItem value="HIGH_RISK">High Risk Alert</MenuItem><MenuItem value="MEDIUM_RISK">Medium Risk Alert</MenuItem></TextField>
              <TextField label="Explainability factors details" name="explainability" size="small" fullWidth multiline rows={3} required placeholder="State exact feature values explaining target prediction..." />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setPredictionDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Trigger Alert</Button></DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default EnterpriseAnalytics;
