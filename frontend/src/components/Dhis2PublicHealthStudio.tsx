import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, TextField, Button, Stack,
  Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Alert, CircularProgress, Tooltip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch, FormControlLabel, Tabs, Tab, Divider,
  MenuItem, Select, FormControl, InputLabel, InputAdornment
} from '@mui/material';
import {
  Public, CheckCircle, Refresh, PlayArrow, Settings, Storage,
  CloudUpload, Description, ContentCopy, OpenInNew, Send, Security,
  FactCheck, BugReport, LocalHospital, Science, ChildCare, PregnantWoman,
  FolderZip, Visibility, ArrowForward
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

export const Dhis2PublicHealthStudio: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  // Tab navigation
  const [activeTab, setActiveTab] = useState(0);

  // Period state (default: previous calendar month YYYYMM)
  const defaultPeriod = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const [period, setPeriod] = useState<string>(defaultPeriod());

  // Preview & Indicator State
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [payloadModalOpen, setPayloadModalOpen] = useState(false);

  // Mappings State
  const [mappings, setMappings] = useState<any[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);

  // Connection Config State
  const [config, setConfig] = useState<any>({
    baseUrl: 'https://dhis2nigeria.org.ng/dhis',
    authType: 'BASIC',
    username: '',
    password: '',
    personalAccessToken: '',
    orgUnitUid: '',
    dataSetUid: '',
    attributeOptionComboUid: '',
    periodType: 'Monthly',
    openhexaFeedEnabled: true,
    openhexaApiKey: '',
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<any>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  // Submission History State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const fetchPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const res = await api.get(`/dhis2/preview?period=${period}`);
      if (res.data?.success) {
        setPreviewData(res.data);
      }
    } catch (err: any) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.message || 'Failed to compute monthly indicators', { variant: 'error' });
    } finally {
      setLoadingPreview(false);
    }
  }, [period, enqueueSnackbar]);

  const fetchMappings = useCallback(async () => {
    setLoadingMappings(true);
    try {
      const res = await api.get('/dhis2/mappings');
      if (res.data?.success) {
        setMappings(res.data.data || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingMappings(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await api.get('/dhis2/config');
      if (res.data?.success) {
        setConfig(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const res = await api.get('/dhis2/submissions');
      if (res.data?.success) {
        setSubmissions(res.data.data || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview();
    fetchMappings();
    fetchConfig();
    fetchSubmissions();
  }, [fetchPreview, fetchMappings, fetchConfig, fetchSubmissions]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await api.post('/dhis2/test-connection', config);
      setConnectionTestResult(res.data?.data || res.data);
      if (res.data?.success) {
        enqueueSnackbar('Successfully authenticated with DHIS2 server', { variant: 'success' });
      } else {
        enqueueSnackbar(res.data?.data?.message || 'Connection test failed', { variant: 'warning' });
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Connection error', { variant: 'error' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await api.post('/dhis2/config', config);
      if (res.data?.success) {
        enqueueSnackbar('DHIS2 & OpenHEXA settings saved', { variant: 'success' });
        setConfig(res.data.data);
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save config', { variant: 'error' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSeedDefaultMappings = async () => {
    try {
      const res = await api.post('/dhis2/seed-default-mappings');
      enqueueSnackbar(res.data?.message || 'Seeded standard NHMIS data element mappings', { variant: 'success' });
      await fetchMappings();
      await fetchPreview();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to seed mappings', { variant: 'error' });
    }
  };

  const handleSaveMappings = async () => {
    setSavingMappings(true);
    try {
      const payload = mappings.map((m) => ({
        indicatorKey: m.key,
        dataElementUid: m.dataElementUid,
        categoryOptionComboUid: m.categoryOptionComboUid,
        isEnabled: m.isEnabled,
      }));
      const res = await api.put('/dhis2/mappings', { mappings: payload });
      if (res.data?.success) {
        enqueueSnackbar('Indicator data element mappings updated', { variant: 'success' });
        await fetchPreview();
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save mappings', { variant: 'error' });
    } finally {
      setSavingMappings(false);
    }
  };

  const handleMappingChange = (key: string, field: string, val: any) => {
    setMappings((prev) =>
      prev.map((m) => (m.key === key ? { ...m, [field]: val } : m))
    );
  };

  const handleSubmit = async (dryRun: boolean) => {
    setSubmitting(true);
    try {
      const res = await api.post('/dhis2/submit', {
        period,
        dryRun,
        forceMock: false,
      });
      setSubmissionResult(res.data);
      setResultModalOpen(true);
      fetchSubmissions();
      if (res.data?.success) {
        enqueueSnackbar(
          dryRun ? 'Dry-Run validation passed without errors' : 'Monthly return submitted to DHIS2!',
          { variant: 'success' }
        );
      } else {
        enqueueSnackbar(res.data?.importSummary?.description || 'Submission warning/error', { variant: 'warning' });
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Submission failed', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    enqueueSnackbar(`${label} to clipboard!`, { variant: 'info' });
  };

  const handleDownloadPayloadJson = () => {
    if (!previewData?.dhis2Payload) return;
    const blob = new Blob([JSON.stringify(previewData.dhis2Payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DHIS2_Aggregate_DataValueSet_${period}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadOpenHexaJson = async () => {
    try {
      const res = await api.get(`/dhis2/openhexa/feed?period=${period}`);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OpenHEXA_PublicHealth_Feed_${period}.json`;
      a.click();
      URL.revokeObjectURL(url);
      enqueueSnackbar('Exported OpenHEXA pipeline feed', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar('Failed to export OpenHEXA feed', { variant: 'error' });
    }
  };

  // Group helpers for badge styling
  const getGroupChip = (group: string) => {
    switch (group) {
      case 'OPD': return <Chip label="OPD Attendance" size="small" sx={{ bgcolor: alpha('#1971c2', 0.1), color: '#1971c2', fontWeight: 700 }} />;
      case 'IPD': return <Chip label="Inpatient / Mortality" size="small" sx={{ bgcolor: alpha('#d9480f', 0.1), color: '#d9480f', fontWeight: 700 }} />;
      case 'MATERNAL': return <Chip label="Maternal / ANC" size="small" sx={{ bgcolor: alpha('#ae3ec9', 0.1), color: '#ae3ec9', fontWeight: 700 }} />;
      case 'NEWBORN': return <Chip label="Newborn Care" size="small" sx={{ bgcolor: alpha('#0ca678', 0.1), color: '#0ca678', fontWeight: 700 }} />;
      case 'FAMILY_PLANNING': return <Chip label="Family Planning" size="small" sx={{ bgcolor: alpha('#f59f00', 0.1), color: '#f59f00', fontWeight: 700 }} />;
      case 'MALARIA': return <Chip label="Malaria Elimination" size="small" sx={{ bgcolor: alpha('#e03131', 0.1), color: '#e03131', fontWeight: 700 }} />;
      case 'IDSR': return <Chip label="IDSR Surveillance" size="small" sx={{ bgcolor: alpha('#7048e8', 0.1), color: '#7048e8', fontWeight: 700 }} />;
      default: return <Chip label={group} size="small" />;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* ── Banner: NHTDAO Layer 4 Compliance Header ───────────────────────── */}
      <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, bgcolor: alpha('#0ca678', 0.03), borderColor: alpha('#0ca678', 0.3) }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Public sx={{ color: '#0ca678', fontSize: 28 }} />
                <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.3px' }}>
                  Public Health Aggregation & DHIS2 / OpenHEXA Reporting
                </Typography>
                <Chip
                  label="NHTDAO Layer 4 Certified"
                  size="small"
                  sx={{ bgcolor: '#0ca678', color: '#fff', fontWeight: 800, fontSize: '0.7rem' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                National Health Management Information System (NHMIS) monthly returns & Integrated Disease Surveillance and Response (IDSR) pipeline for Federal Ministry of Health & NCDC.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                size="small"
                label="Reporting Period (YYYYMM)"
                value={period}
                onChange={(e) => setPeriod(e.target.value.trim())}
                sx={{ width: 180, bgcolor: 'background.paper', borderRadius: 2 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">📅</InputAdornment>,
                }}
              />
              <Button
                variant="outlined"
                startIcon={loadingPreview ? <CircularProgress size={16} /> : <Refresh />}
                onClick={fetchPreview}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Refresh
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* ── Top Level Key Metrics ────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: alpha('#1971c2', 0.03) }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>COMPUTED INDICATORS</Typography>
              <Typography variant="h4" fontWeight={800} color="primary.main">
                {previewData?.totalComputed ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Period {period} (OPD, IPD, ANC, Deliveries, IDSR)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: alpha('#0ca678', 0.03) }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>MAPPED TO NHMIS DATA ELEMENTS</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#0ca678' }}>
                {previewData?.mappedCount ?? 0} / {previewData?.totalComputed ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ready for DHIS2 DataValueSet Export
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: alpha('#f59f00', 0.03) }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>FACILITY DHPRS / NHFR CODE</Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#f59f00', mt: 0.5 }}>
                {previewData?.facility?.dhprsCode || 'DHPRS-FCT-0482'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {previewData?.facility?.nhfrCode || 'NHFR-2489-01'} · {previewData?.facility?.name || 'Hospital Master'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: alpha('#7048e8', 0.03) }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>OPENHEXA PIPELINE STATUS</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <CheckCircle sx={{ color: '#7048e8', fontSize: 24 }} />
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#7048e8' }}>
                  Live API Feed Active
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                REST / GeoJSON Feed for automated pull
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Tabs Navigation ─────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 2.5, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 48 } }}
        >
          <Tab icon={<FactCheck sx={{ fontSize: 18 }} />} label={`Monthly Aggregate Return (${period})`} iconPosition="start" />
          <Tab icon={<Storage sx={{ fontSize: 18 }} />} label="Data Element Mappings" iconPosition="start" />
          <Tab icon={<Settings sx={{ fontSize: 18 }} />} label="DHIS2 & OpenHEXA Server Settings" iconPosition="start" />
          <Tab icon={<Security sx={{ fontSize: 18 }} />} label="Submission Audit Log" iconPosition="start" />
        </Tabs>

        {/* ── TAB 0: Monthly Aggregate Return ───────────────────────────────── */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  National Health Management Information System (NHMIS) Return for Period {period}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Calculated directly from TerkHealth360 visits, admissions, deliveries, lab results, and ICD-11 notifiable disease encounters.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<Visibility />}
                  onClick={() => setPayloadModalOpen(true)}
                  disabled={!previewData}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Inspect DHIS2 JSON
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<FolderZip />}
                  onClick={handleDownloadOpenHexaJson}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Export OpenHEXA Feed
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={submitting ? <CircularProgress size={16} /> : <PlayArrow />}
                  onClick={() => handleSubmit(true)}
                  disabled={submitting || !previewData}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Dry-Run Validate
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Send />}
                  onClick={() => handleSubmit(false)}
                  disabled={submitting || !previewData}
                  sx={{ borderRadius: 2, fontWeight: 700, bgcolor: '#0ca678', '&:hover': { bgcolor: '#099268' } }}
                >
                  Submit to DHIS2
                </Button>
              </Stack>
            </Box>

            {loadingPreview ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <CircularProgress size={36} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Aggregating hospital records for period {period}...
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: alpha('#1971c2', 0.04) }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Domain / Program</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>National Health Indicator</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Computed Monthly Total</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>DHIS2 DataElement UID</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Data Source / Derivation Rule</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData?.indicators?.map((item: any) => (
                      <TableRow key={item.key} hover>
                        <TableCell>{getGroupChip(item.group)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {item.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {item.key}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.value.toLocaleString()}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              bgcolor: item.value > 0 ? alpha('#0ca678', 0.15) : alpha('#868e96', 0.1),
                              color: item.value > 0 ? '#0ca678' : '#868e96',
                              minWidth: 44,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {item.dataElementUid ? (
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                              {item.dataElementUid}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="error.main" fontWeight={700}>
                              ⚠️ Not mapped
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {item.source}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {item.isMapped ? (
                            <Tooltip title="Ready for upload">
                              <CheckCircle sx={{ color: '#0ca678', fontSize: 20 }} />
                            </Tooltip>
                          ) : (
                            <Tooltip title="Configure mapping in tab 2">
                              <Typography variant="caption" color="error.main">
                                Unmapped
                              </Typography>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* ── TAB 1: Data Element Mappings ─────────────────────────────────── */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  NHMIS / IDSR DataElement & CategoryOptionCombo UIDs
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Maps each TerkHealth360 clinical indicator to your state/national DHIS2 instance's 11-character UID codes.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleSeedDefaultMappings}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Seed Standard NHMIS Mappings
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveMappings}
                  disabled={savingMappings}
                  startIcon={savingMappings ? <CircularProgress size={16} /> : <CheckCircle />}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Save Mappings
                </Button>
              </Stack>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: alpha('#1971c2', 0.04) }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Indicator Key</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>National Indicator Label</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Domain</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>DHIS2 DataElement UID</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>CategoryOptionCombo UID</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="center">Active</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mappings.map((item) => (
                    <TableRow key={item.key} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem' }}>
                        {item.key}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{item.label}</TableCell>
                      <TableCell>{getGroupChip(item.group)}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.dataElementUid || ''}
                          onChange={(e) => handleMappingChange(item.key, 'dataElementUid', e.target.value)}
                          placeholder="e.g. f7n9E0hX8qk"
                          sx={{ '& .MuiOutlinedInput-input': { fontFamily: 'monospace', fontSize: '0.8rem', py: 0.8 } }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.categoryOptionComboUid || ''}
                          onChange={(e) => handleMappingChange(item.key, 'categoryOptionComboUid', e.target.value)}
                          placeholder="e.g. HllvX50cXC0 (Default)"
                          sx={{ '& .MuiOutlinedInput-input': { fontFamily: 'monospace', fontSize: '0.8rem', py: 0.8 } }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={item.isEnabled}
                          onChange={(e) => handleMappingChange(item.key, 'isEnabled', e.target.checked)}
                          size="small"
                          color="primary"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── TAB 2: DHIS2 & OpenHEXA Server Settings ───────────────────────── */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <form onSubmit={handleSaveConfig}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2.5 }}>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Settings color="primary" /> DHIS2 National / State Instance Credentials
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="DHIS2 Base URL *"
                          value={config.baseUrl || ''}
                          onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                          helperText="e.g. https://dhis2nigeria.org.ng/dhis or state DHIS2 portal URL"
                          required
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Auth Method</InputLabel>
                          <Select
                            value={config.authType || 'BASIC'}
                            label="Auth Method"
                            onChange={(e) => setConfig({ ...config, authType: e.target.value })}
                          >
                            <MenuItem value="BASIC">HTTP Basic Auth</MenuItem>
                            <MenuItem value="PAT">Personal Access Token (PAT)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      {config.authType === 'BASIC' ? (
                        <>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Username"
                              value={config.username || ''}
                              onChange={(e) => setConfig({ ...config, username: e.target.value })}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Password"
                              type="password"
                              value={config.password || ''}
                              onChange={(e) => setConfig({ ...config, password: e.target.value })}
                              placeholder="Leave blank to keep current"
                            />
                          </Grid>
                        </>
                      ) : (
                        <Grid item xs={12} sm={8}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Personal Access Token (PAT)"
                            value={config.personalAccessToken || ''}
                            onChange={(e) => setConfig({ ...config, personalAccessToken: e.target.value })}
                            placeholder="d2pat_..."
                          />
                        </Grid>
                      )}

                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Facility OrgUnit UID *"
                          value={config.orgUnitUid || ''}
                          onChange={(e) => setConfig({ ...config, orgUnitUid: e.target.value })}
                          helperText="11-character DHIS2 organisation unit ID"
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="DataSet UID *"
                          value={config.dataSetUid || ''}
                          onChange={(e) => setConfig({ ...config, dataSetUid: e.target.value })}
                          helperText="NHMIS monthly summary dataset ID"
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Attribute Option Combo UID"
                          value={config.attributeOptionComboUid || ''}
                          onChange={(e) => setConfig({ ...config, attributeOptionComboUid: e.target.value })}
                          helperText="Default COC UID"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Stack direction="row" spacing={2} justifyContent="flex-end">
                          <Button
                            variant="outlined"
                            onClick={handleTestConnection}
                            disabled={testingConnection}
                            startIcon={testingConnection ? <CircularProgress size={16} /> : <FactCheck />}
                            sx={{ borderRadius: 2, fontWeight: 700 }}
                          >
                            Test Connection
                          </Button>
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={savingConfig}
                            startIcon={savingConfig ? <CircularProgress size={16} /> : <CheckCircle />}
                            sx={{ borderRadius: 2, fontWeight: 700 }}
                          >
                            Save Settings
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2.5, mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Science color="secondary" /> OpenHEXA Automated Pipeline Feed
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                      Allows OpenHEXA public-health analytical workspaces to automatically pull TerkHealth360 monthly returns via REST API without manual export.
                    </Typography>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(config.openhexaFeedEnabled)}
                          onChange={(e) => setConfig({ ...config, openhexaFeedEnabled: e.target.checked })}
                          color="secondary"
                        />
                      }
                      label={<Typography variant="body2" fontWeight={700}>Enable OpenHEXA Pipeline Feed</Typography>}
                    />

                    <TextField
                      fullWidth
                      size="small"
                      label="OpenHEXA API Pipeline Secret Key"
                      value={config.openhexaApiKey || ''}
                      onChange={(e) => setConfig({ ...config, openhexaApiKey: e.target.value })}
                      sx={{ mt: 2 }}
                      helperText="Supplied in X-OpenHEXA-Key HTTP header by automated workers"
                    />

                    <Box sx={{ mt: 2, p: 1.5, bgcolor: '#1e1e1e', borderRadius: 2, color: '#4ec9b0', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      curl -H "X-OpenHEXA-Key: {config.openhexaApiKey || 'SECRET'}" \{'\n'}
                      {'  '}http://localhost:5000/api/dhis2/openhexa/feed?period={period}
                    </Box>
                  </Card>

                  {connectionTestResult && (
                    <Alert
                      severity={connectionTestResult.success ? 'success' : 'error'}
                      sx={{ borderRadius: 2 }}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        {connectionTestResult.message}
                      </Typography>
                      {connectionTestResult.systemInfo && (
                        <Typography variant="caption" display="block">
                          DHIS2 v{connectionTestResult.systemInfo.version} · Latency: {connectionTestResult.latencyMs}ms
                        </Typography>
                      )}
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </form>
          </Box>
        )}

        {/* ── TAB 3: Submission History & Audit Log ─────────────────────────── */}
        {activeTab === 3 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={800}>
                National Reporting Submission History & Audit Log
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchSubmissions}
                sx={{ borderRadius: 2 }}
              >
                Refresh Log
              </Button>
            </Box>

            {submissions.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No submissions recorded yet. Execute a Dry-Run or Submit action in Tab 1 to generate an audit log record.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: alpha('#1971c2', 0.04) }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Period</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Timestamp</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Execution Mode</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Import Count</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {submissions.map((sub) => (
                      <TableRow key={sub.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{sub.period}</TableCell>
                        <TableCell>{new Date(sub.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip
                            label={sub.dryRun ? 'DRY-RUN VALIDATION' : 'LIVE UPLOAD'}
                            size="small"
                            variant="outlined"
                            color={sub.dryRun ? 'warning' : 'primary'}
                            sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={sub.status}
                            size="small"
                            color={sub.status === 'SUCCESS' || sub.status === 'DRY_RUN_OK' ? 'success' : 'error'}
                            sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            Imported: {sub.importedCount} · Updated: {sub.updatedCount} · Ignored: {sub.ignoredCount}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {sub.importSummary?.description || sub.errorMessage || '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>

      {/* ── Dialog: Inspect DHIS2 JSON Payload ──────────────────────────────── */}
      <Dialog
        open={payloadModalOpen}
        onClose={() => setPayloadModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>DHIS2 Aggregate DataValueSet Payload ({period})</span>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<ContentCopy />}
              onClick={() => handleCopy(JSON.stringify(previewData?.dhis2Payload, null, 2), 'Payload')}
            >
              Copy JSON
            </Button>
            <Button size="small" startIcon={<FolderZip />} onClick={handleDownloadPayloadJson}>
              Download JSON
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 2, bgcolor: '#1e1e1e', color: '#9cdcfe', borderRadius: 2, fontFamily: 'monospace', fontSize: '0.8rem', maxHeight: 450, overflow: 'auto' }}>
            <pre style={{ margin: 0 }}>{JSON.stringify(previewData?.dhis2Payload, null, 2)}</pre>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPayloadModalOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Submission Result Summary ───────────────────────────────── */}
      <Dialog
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CheckCircle color={submissionResult?.success ? 'success' : 'error'} />
          DHIS2 Import Summary ({submissionResult?.period})
        </DialogTitle>
        <DialogContent dividers>
          <Alert
            severity={submissionResult?.success ? 'success' : 'error'}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            <Typography variant="body2" fontWeight={800}>
              {submissionResult?.importSummary?.description || (submissionResult?.dryRun ? 'Dry-Run Validated' : 'Submitted')}
            </Typography>
            <Typography variant="caption">
              Status: {submissionResult?.status} · Mode: {submissionResult?.dryRun ? 'Dry-Run Validation' : 'Live Data Import'}
            </Typography>
          </Alert>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={3}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Imported</Typography>
                <Typography variant="h6" fontWeight={800} color="success.main">
                  {submissionResult?.importSummary?.importCount?.imported ?? 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={3}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Updated</Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  {submissionResult?.importSummary?.importCount?.updated ?? 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={3}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Ignored</Typography>
                <Typography variant="h6" fontWeight={800} color="warning.main">
                  {submissionResult?.importSummary?.importCount?.ignored ?? 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={3}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Conflicts</Typography>
                <Typography variant="h6" fontWeight={800} color="error.main">
                  {submissionResult?.importSummary?.conflicts?.length ?? 0}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setResultModalOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dhis2PublicHealthStudio;
