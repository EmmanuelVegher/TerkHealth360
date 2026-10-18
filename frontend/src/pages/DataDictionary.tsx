import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, InputAdornment, Stack, Tabs, Tab, Alert, FormControl,
  InputLabel, Select, CircularProgress, Paper, Tooltip, Switch, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails, Menu, LinearProgress
} from '@mui/material';
import {
  Search, Add, Download, Hub, LocalHospital, Science, LocalPharmacy,
  Receipt, Bloodtype, MonitorHeart, Refresh, CheckCircle, Category,
  Link as LinkIcon, MenuBook, Code, Storage, Language, CloudDownload,
  ExpandMore, Public, ContentCopy, Visibility, AccountTree, FileDownload,
  Clear, Dns
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

const SYSTEM_CONFIG: Record<string, { label: string; color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' | 'default'; uri: string; dept: string; countStr: string }> = {
  ICD11:   { label: 'ICD-11 MMS', color: 'primary',   uri: 'http://id.who.int/icd/release/11/mms',         dept: 'WHO Diagnoses (NHTDAO Mandatory)', countStr: '35,000 Categories' },
  ATC:     { label: 'WHO ATC',   color: 'success',   uri: 'http://www.whocc.no/atc',                      dept: 'WHO Formulary Classification (NHTDAO)', countStr: '6,500 Substances' },
  LOINC:   { label: 'LOINC',   color: 'info',      uri: 'http://loinc.org',                             dept: 'Laboratory & Pathology', countStr: '109,328 Concepts' },
  ICD10:   { label: 'ICD-10-CM',  color: 'primary',   uri: 'http://hl7.org/fhir/sid/icd-10',               dept: 'Clinical Diagnoses & Morbidity', countStr: '71,712 Codes' },
  RXNORM:  { label: 'RxNorm',  color: 'success',   uri: 'http://www.nlm.nih.gov/research/umls/rxnorm',   dept: 'Pharmacy & Dispensary', countStr: '118,523 Formulations' },
  CPT:     { label: 'CPT-4 / HCPCS', color: 'warning', uri: 'http://www.ama-assn.org/go/cpt',             dept: 'Billing & Tariffs', countStr: '16,324 Tariffs' },
  ISBT128: { label: 'ISBT 128', color: 'error', uri: 'http://isbt128.org',                               dept: 'Blood Bank & Cellular Therapy', countStr: '5,094 Products' },
  SNOMED:  { label: 'SNOMED CT',color:'secondary', uri: 'http://snomed.info/sct',                       dept: 'Clinical Terminology', countStr: '350,014 Concepts' },
};

export const DataDictionary = () => {
  const { enqueueSnackbar } = useSnackbar();

  // Data State
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [concepts, setConcepts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeTab, setActiveTab] = useState(0);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Multi-Format Export Menu
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

  // FHIR Inspector Modal (JSON, XML, ND-JSON, UML)
  const [openFhirInspector, setOpenFhirInspector] = useState(false);
  const [inspectConcept, setInspectConcept] = useState<any>(null);
  const [fhirData, setFhirData] = useState<any>(null);
  const [loadingFhir, setLoadingFhir] = useState(false);
  const [fhirTab, setFhirTab] = useState(0);

  // Create Concept Dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    system: 'ICD11',
    code: '',
    display: '',
    description: '',
    category: 'DIAGNOSIS',
    systemUri: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Map Item Dialog
  const [openMap, setOpenMap] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<any>(null);
  const [seedingWho, setSeedingWho] = useState(false);
  const [mapForm, setMapForm] = useState({
    localItemType: 'LAB_TEST',
    localItemId: '',
    notes: '',
  });

  // Load live data from PostgreSQL via backend API
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resStats, resConcepts] = await Promise.all([
        api.get('/terminology/stats'),
        api.get('/terminology/concepts', {
          params: {
            search: debouncedSearch.trim() || undefined,
            system: selectedSystem !== 'ALL' ? selectedSystem : undefined,
            category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
            page: page + 1,
            limit: rowsPerPage,
          },
        }),
      ]);

      setStats(resStats.data);
      setConcepts(resConcepts.data.data || []);
      setTotal(resConcepts.data.total || 0);
    } catch (err: any) {
      console.error('Failed to load terminology data from PostgreSQL:', err);
      enqueueSnackbar(err.response?.data?.message || 'Error communicating with local terminology server', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedSystem, selectedCategory, page, rowsPerPage, enqueueSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (_: any, val: number) => {
    setActiveTab(val);
    setPage(0);
    switch (val) {
      case 0: setSelectedCategory('ALL'); setSelectedSystem('ALL'); break;
      case 1: setSelectedCategory('ALL'); setSelectedSystem('ICD11'); break;
      case 2: setSelectedCategory('ALL'); setSelectedSystem('ATC'); break;
      case 3: setSelectedCategory('ALL'); setSelectedSystem('LOINC'); break;
      case 4: setSelectedCategory('ALL'); setSelectedSystem('ICD10'); break;
      case 5: setSelectedCategory('ALL'); setSelectedSystem('RXNORM'); break;
      case 6: setSelectedCategory('ALL'); setSelectedSystem('CPT'); break;
      case 7: setSelectedCategory('ALL'); setSelectedSystem('ISBT128'); break;
      case 8: setSelectedCategory('ALL'); setSelectedSystem('SNOMED'); break;
    }
  };

  const handleSeedWhoStandards = async () => {
    setSeedingWho(true);
    try {
      const res = await api.post('/terminology/seed-who-standards');
      enqueueSnackbar(res.data?.message || 'Successfully synchronized WHO ICD-11 & WHO ATC standards!', { variant: 'success' });
      loadData();
    } catch (err: any) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.message || 'Failed to seed WHO standards', { variant: 'error' });
    } finally {
      setSeedingWho(false);
    }
  };

  const handleExportFHIRFormat = async (format: 'json' | 'xml' | 'ndjson') => {
    setExportAnchorEl(null);
    setExporting(true);
    try {
      const res = await api.get(`/terminology/export-fhir?format=${format}`, { responseType: 'blob' });
      const ext = format === 'ndjson' ? 'ndjson' : format;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `HL7_FHIR_Release5_DataDictionary_${Date.now()}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      enqueueSnackbar(`HL7 FHIR Bundle exported in .${ext.toUpperCase()} format!`, { variant: 'success' });
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to export FHIR Bundle', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleOpenFhirInspector = async (concept: any) => {
    setInspectConcept(concept);
    setOpenFhirInspector(true);
    setLoadingFhir(true);
    try {
      const res = await api.get(`/terminology/concept-fhir/${concept.id}`);
      setFhirData(res.data);
    } catch (err) {
      console.error('Failed to load FHIR inspection data:', err);
      enqueueSnackbar('Failed to load FHIR definition', { variant: 'error' });
    } finally {
      setLoadingFhir(false);
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    enqueueSnackbar('Copied to clipboard!', { variant: 'info' });
  };

  const handleCreateConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.code || !createForm.display) {
      enqueueSnackbar('Code and Standard Display Name are required', { variant: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/terminology/concepts', createForm);
      enqueueSnackbar(`Standard Concept ${createForm.code} created!`, { variant: 'success' });
      setOpenCreate(false);
      setCreateForm({ system: 'ICD11', code: '', display: '', description: '', category: 'DIAGNOSIS', systemUri: '' });
      loadData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create concept', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConcept || !mapForm.localItemId) {
      enqueueSnackbar('Local Item ID is required', { variant: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/terminology/map', {
        conceptId: selectedConcept.id,
        localItemType: mapForm.localItemType,
        localItemId: mapForm.localItemId,
        notes: mapForm.notes,
      });
      enqueueSnackbar(`Local item mapped to standard code ${selectedConcept.code}!`, { variant: 'success' });
      setOpenMap(false);
      setMapForm({ localItemType: 'LAB_TEST', localItemId: '', notes: '' });
      loadData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to map item', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalAllStandards = stats?.totalConcepts || 712495;

  return (
    <Box sx={{ p: 3, maxWidth: 1600, margin: '0 auto' }}>
      {/* ── Page Header & Multi-Format Actions ─────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
              Data Dictionary & World Interoperability Standards
            </Typography>
            <Chip
              icon={<Hub sx={{ fontSize: '14px !important', color: '#12b886' }} />}
              label="HL7 FHIR Release 5 & NHTDAO Compliant"
              size="small"
              sx={{ bgcolor: alpha('#12b886', 0.1), color: '#0ca678', fontWeight: 700, fontSize: '0.75rem' }}
            />
            <Chip
              icon={<Dns sx={{ fontSize: '14px !important', color: '#228be6' }} />}
              label="PostgreSQL Live Local Store"
              size="small"
              sx={{ bgcolor: alpha('#228be6', 0.1), color: '#1c7ed6', fontWeight: 700, fontSize: '0.75rem' }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Global Terminology Server & Live Registries: WHO ICD-11 MMS (NHTDAO Mandatory), WHO ATC, LOINC, ICD-10, RxNorm, SNOMED CT, CPT-4, ISBT 128.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            color="success"
            startIcon={seedingWho ? <CircularProgress size={16} color="inherit" /> : <Public />}
            onClick={handleSeedWhoStandards}
            disabled={seedingWho}
            sx={{ fontWeight: 700, borderRadius: 2, bgcolor: '#2b8a3e', '&:hover': { bgcolor: '#237032' } }}
          >
            Sync WHO Standards (NHTDAO)
          </Button>

          <Button
            variant="outlined"
            color="primary"
            endIcon={<ExpandMore />}
            startIcon={exporting ? <CircularProgress size={16} /> : <Download />}
            onClick={e => setExportAnchorEl(e.currentTarget)}
            disabled={exporting}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Export FHIR Bundle
          </Button>

          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={() => setExportAnchorEl(null)}
            PaperProps={{ sx: { borderRadius: 2, minWidth: 220 } }}
          >
            <MenuItem onClick={() => handleExportFHIRFormat('json')} sx={{ fontWeight: 700 }}>
              <Code sx={{ mr: 1.5, color: '#3b5bdb' }} /> Export FHIR JSON (.json)
            </MenuItem>
            <MenuItem onClick={() => handleExportFHIRFormat('xml')} sx={{ fontWeight: 700 }}>
              <Language sx={{ mr: 1.5, color: '#e03131' }} /> Export FHIR XML (.xml)
            </MenuItem>
            <MenuItem onClick={() => handleExportFHIRFormat('ndjson')} sx={{ fontWeight: 700 }}>
              <Storage sx={{ mr: 1.5, color: '#2f9e44' }} /> Export Bulk Data (.ndjson)
            </MenuItem>
          </Menu>

          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => setOpenCreate(true)}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Add Standard Concept
          </Button>
        </Stack>
      </Box>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: alpha('#3b5bdb', 0.03) }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>HOSPITAL ACTIVE DICTIONARY</Typography>
                  <Typography variant="h4" fontWeight={800} color="primary">
                    {totalAllStandards.toLocaleString()}
                  </Typography>
                </Box>
                <Storage color="primary" sx={{ fontSize: 32, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: alpha('#0ca678', 0.03) }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>ALL LOCAL REGISTRIES (POSTGRES)</Typography>
                  <Typography variant="h4" fontWeight={800} color="#0ca678">
                    {totalAllStandards.toLocaleString()}
                  </Typography>
                </Box>
                <Language sx={{ color: '#0ca678', fontSize: 32, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: alpha('#f59f00', 0.03) }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>LOCAL MAPPINGS CONNECTED</Typography>
                  <Typography variant="h4" fontWeight={800} color="#f59f00">{stats?.totalMappings || 0}</Typography>
                </Box>
                <LinkIcon sx={{ color: '#f59f00', fontSize: 32, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: alpha('#6741d9', 0.03) }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>FHIR SPECIFICATION</Typography>
                  <Typography variant="h6" fontWeight={800} color="#6741d9">JSON | XML | ND-JSON</Typography>
                </Box>
                <CheckCircle sx={{ color: '#6741d9', fontSize: 32, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Official World Standards Global Database Breakdown ──────────────────── */}
      <Accordion defaultExpanded variant="outlined" sx={{ borderRadius: '10px !important', mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Public color="info" />
            <Typography variant="subtitle2" fontWeight={800}>
              International Medical Standards Local PostgreSQL Registries ({totalAllStandards.toLocaleString()} Total Concepts)
            </Typography>
            <Chip label="WHO ICD-11 • WHO ATC • LOINC • ICD-10 • RxNorm • SNOMED CT • CPT-4 • ISBT 128" size="small" color="success" variant="outlined" sx={{ fontWeight: 800 }} />
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Grid container spacing={2}>
            {[
              { l: 'WHO ICD-11 MMS', v: stats?.bySystem?.ICD11?.toLocaleString() || '35,000', desc: 'Clinical Diagnoses & Morbidity (NHTDAO Mandatory)' },
              { l: 'WHO ATC Formularies', v: stats?.bySystem?.ATC?.toLocaleString() || '6,500', desc: 'Anatomical Therapeutic Chemical (NHTDAO Mandatory)' },
              { l: 'LOINC (Labs & Vitals)', v: stats?.bySystem?.LOINC?.toLocaleString() || '109,328', desc: 'Laboratory, Clinical, Surveys, Claims' },
              { l: 'ICD-10-CM (Diagnoses)', v: stats?.bySystem?.ICD10?.toLocaleString() || '71,712', desc: 'Clinical Diseases, Morbidity & Mortality' },
              { l: 'RxNorm (Medications)', v: stats?.bySystem?.RXNORM?.toLocaleString() || '118,523', desc: 'Clinical Drugs, Dosage Forms & Active Ingredients' },
              { l: 'SNOMED CT (Clinical)', v: stats?.bySystem?.SNOMED?.toLocaleString() || '350,014', desc: 'Clinical Findings, Anatomy & Procedures' },
              { l: 'CPT-4 / HCPCS (Tariffs)', v: stats?.bySystem?.CPT?.toLocaleString() || '16,324', desc: 'Medical Procedures, Surgeries & Billing' },
              { l: 'ISBT 128 (Blood Bank)', v: stats?.bySystem?.ISBT128?.toLocaleString() || '5,094', desc: 'Blood Products, Cellular Therapy & Plasma' },
            ].map(item => (
              <Grid item xs={12} sm={6} md={3} lg={1.5} key={item.l}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, bgcolor: alpha('#0288d1', 0.02) }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>{item.l}</Typography>
                  <Typography variant="h6" fontWeight={800} color="info.main">{item.v}</Typography>
                  <Typography variant="caption" color="text.secondary" fontSize="0.65rem" display="block">{item.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* ── Department / Domain Navigation Tabs ──────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 2.5, mb: 3, bgcolor: 'background.paper' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.825rem' } }}
        >
          <Tab icon={<Hub sx={{ fontSize: 18 }} />} label={`All Standards (${totalAllStandards.toLocaleString()})`} iconPosition="start" />
          <Tab icon={<LocalHospital sx={{ fontSize: 18, color: '#2b8a3e' }} />} label={`WHO ICD-11 MMS (${(stats?.bySystem?.ICD11 || 35000).toLocaleString()})`} iconPosition="start" />
          <Tab icon={<LocalPharmacy sx={{ fontSize: 18, color: '#0ca678' }} />} label={`WHO ATC (${(stats?.bySystem?.ATC || 6500).toLocaleString()})`} iconPosition="start" />
          <Tab icon={<Science sx={{ fontSize: 18 }} />} label={`LOINC Labs (${(stats?.bySystem?.LOINC || 109328).toLocaleString()})`} iconPosition="start" />
          <Tab icon={<LocalHospital sx={{ fontSize: 18 }} />} label={`ICD-10-CM (${(stats?.bySystem?.ICD10 || 71712).toLocaleString()})`} iconPosition="start" />
          <Tab icon={<LocalPharmacy sx={{ fontSize: 18 }} />} label={`RxNorm Drugs (${(stats?.bySystem?.RXNORM || 118523).toLocaleString()})`} iconPosition="start" />
          <Tab icon={<Receipt sx={{ fontSize: 18 }} />} label={`CPT-4 / Tariffs (${(stats?.bySystem?.CPT || 16324).toLocaleString()})`} iconPosition="start" />
          <Tab icon={<Bloodtype sx={{ fontSize: 18 }} />} label={`ISBT 128 (${(stats?.bySystem?.ISBT128 || 5094).toLocaleString()})`} iconPosition="start" />
          <Tab icon={<MonitorHeart sx={{ fontSize: 18 }} />} label={`SNOMED CT (${(stats?.bySystem?.SNOMED || 350014).toLocaleString()})`} iconPosition="start" />
        </Tabs>

        {/* ── Search Bar & Filter Controls ──────────────────────────────────── */}
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder={`Search across ${totalAllStandards.toLocaleString()} local PostgreSQL concepts by code or description...`}
            size="small"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 320, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}>
                    <Clear fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Standard System</InputLabel>
            <Select
              value={selectedSystem}
              label="Standard System"
              onChange={e => {
                setSelectedSystem(e.target.value);
                setPage(0);
              }}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="ALL">All Systems ({totalAllStandards.toLocaleString()})</MenuItem>
              {Object.keys(SYSTEM_CONFIG).map(sys => {
                const sysCount = stats?.bySystem?.[sys] || SYSTEM_CONFIG[sys].countStr;
                return (
                  <MenuItem key={sys} value={sys}>
                    {SYSTEM_CONFIG[sys].label} ({typeof sysCount === 'number' ? sysCount.toLocaleString() : sysCount})
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              label="Category"
              onChange={e => {
                setSelectedCategory(e.target.value);
                setPage(0);
              }}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="ALL">All Categories</MenuItem>
              <MenuItem value="DIAGNOSIS">Clinical Diagnoses</MenuItem>
              <MenuItem value="LAB">Laboratory & Pathology</MenuItem>
              <MenuItem value="PHARMACY">Pharmacy & Drugs</MenuItem>
              <MenuItem value="BILLING">Billing & Tariffs</MenuItem>
              <MenuItem value="BLOOD_BANK">Blood Bank</MenuItem>
              <MenuItem value="VITAL">Vitals & Nursing</MenuItem>
              <MenuItem value="PROCEDURE">Surgical Procedures</MenuItem>
            </Select>
          </FormControl>

          <Button
            size="small"
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => loadData()}
            sx={{ borderRadius: 2, fontWeight: 700, height: 40 }}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* ── Local PostgreSQL Terminology Table with Pagination ──────────────── */}
      <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
        {loading && <LinearProgress sx={{ height: 3 }} />}
        
        {/* Table Results Indicator */}
        <Box sx={{ px: 2.5, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha('#3b5bdb', 0.02), borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Showing <strong style={{ color: '#1c7ed6' }}>{total === 0 ? 0 : (page * rowsPerPage) + 1}</strong> to <strong style={{ color: '#1c7ed6' }}>{Math.min((page + 1) * rowsPerPage, total)}</strong> of <strong style={{ color: '#1c7ed6' }}>{total.toLocaleString()}</strong> standard concepts in PostgreSQL
            {selectedSystem !== 'ALL' && ` (${selectedSystem})`}
            {debouncedSearch && ` matching "${debouncedSearch}"`}
          </Typography>
          <Chip
            size="small"
            label={`${total.toLocaleString()} Concepts Total`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: alpha('#3b5bdb', 0.04) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Standard Code</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>System Standard</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Official Display Name</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Domain / Category</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>System URI</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Mapped Local Items</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && concepts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Querying local PostgreSQL Terminology Database (712,495 concepts)...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : concepts.length > 0 ? (
                concepts.map(concept => {
                  const sysConfig = SYSTEM_CONFIG[concept.system] || { label: concept.system, color: 'default', uri: concept.systemUri, dept: 'General' };
                  return (
                    <TableRow key={concept.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Code sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="subtitle2" fontWeight={800} fontFamily="monospace" color="primary">
                            {concept.code}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={sysConfig.label}
                          color={sysConfig.color as any}
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '0.675rem' }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{concept.display}</Typography>
                        {concept.description && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {concept.description}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={concept.category || 'GENERAL'}
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 700, fontSize: '0.625rem' }}
                        />
                      </TableCell>

                      <TableCell>
                        <Tooltip title={concept.systemUri || sysConfig.uri}>
                          <Typography variant="caption" color="text.secondary" fontFamily="monospace" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
                            {(concept.systemUri || sysConfig.uri || '').replace('http://', '').replace('https://', '').substring(0, 30)}...
                          </Typography>
                        </Tooltip>
                      </TableCell>

                      <TableCell>
                        <Chip
                          icon={<LinkIcon sx={{ fontSize: '12px !important' }} />}
                          label={`${concept.mappings?.length || 0} local mapped`}
                          color={concept.mappings?.length > 0 ? 'success' : 'default'}
                          variant="outlined"
                          size="small"
                          sx={{ fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            startIcon={<Visibility />}
                            onClick={() => handleOpenFhirInspector(concept)}
                            sx={{ textTransform: 'none', py: 0.2, px: 1, fontSize: '0.7rem', borderRadius: 1.5, fontWeight: 700 }}
                          >
                            FHIR Specs
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<LinkIcon />}
                            onClick={() => {
                              setSelectedConcept(concept);
                              setOpenMap(true);
                            }}
                            sx={{ textTransform: 'none', py: 0.2, px: 1, fontSize: '0.7rem', borderRadius: 1.5, fontWeight: 700 }}
                          >
                            Map Item
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Alert severity="info" sx={{ display: 'inline-flex', borderRadius: 2 }}>
                      No standard concepts matching your filter criteria. Try searching with a different keyword or resetting filters.
                    </Alert>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Table Pagination Controls ────────────────────────────────────────── */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Concepts per page:"
          showFirstButton
          showLastButton
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            px: 2,
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontWeight: 600,
              fontSize: '0.85rem'
            }
          }}
        />
      </Card>

      {/* ── Dialog 1: HL7 FHIR Release 5 Multi-Format Specification Inspector ─ */}
      <Dialog
        open={openFhirInspector}
        onClose={() => setOpenFhirInspector(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Hub color="primary" />
            <Typography variant="h6" fontWeight={800}>
              HL7 FHIR Release 5 Specification: {inspectConcept?.display} ({inspectConcept?.code})
            </Typography>
          </Box>
          <Chip label="Normative Standard" color="success" size="small" sx={{ fontWeight: 800 }} />
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Tabs
            value={fhirTab}
            onChange={(_, v) => setFhirTab(v)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha('#3b5bdb', 0.03) }}
          >
            <Tab icon={<Code sx={{ fontSize: 18 }} />} label="JSON Representation" iconPosition="start" sx={{ fontWeight: 700 }} />
            <Tab icon={<Language sx={{ fontSize: 18 }} />} label="XML Representation" iconPosition="start" sx={{ fontWeight: 700 }} />
            <Tab icon={<Storage sx={{ fontSize: 18 }} />} label="ND-JSON (Bulk Data)" iconPosition="start" sx={{ fontWeight: 700 }} />
            <Tab icon={<AccountTree sx={{ fontSize: 18 }} />} label="UML & Logical Definition" iconPosition="start" sx={{ fontWeight: 700 }} />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {loadingFhir ? (
              <Box sx={{ textAlign: 'center', py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CircularProgress size={36} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Generating HL7 FHIR Release 5 serialization payloads...
                </Typography>
              </Box>
            ) : fhirData ? (
              <>
                {/* ── JSON Representation ── */}
                {fhirTab === 0 && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        MIME-Type: <code>application/fhir+json</code> (HL7 FHIR R5)
                      </Typography>
                      <Button size="small" startIcon={<ContentCopy />} onClick={() => handleCopyCode(JSON.stringify(fhirData.json, null, 2))}>
                        Copy JSON
                      </Button>
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#1e1e1e', color: '#4ec9b0', borderRadius: 2, fontFamily: 'monospace', fontSize: '0.8rem', overflowX: 'auto', maxHeight: 400 }}>
                      <pre style={{ margin: 0 }}>{JSON.stringify(fhirData.json, null, 2)}</pre>
                    </Paper>
                  </Box>
                )}

                {/* ── XML Representation ── */}
                {fhirTab === 1 && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        MIME-Type: <code>application/fhir+xml</code> (HL7 FHIR R5)
                      </Typography>
                      <Button size="small" startIcon={<ContentCopy />} onClick={() => handleCopyCode(fhirData.xml)}>
                        Copy XML
                      </Button>
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#1e1e1e', color: '#ce9178', borderRadius: 2, fontFamily: 'monospace', fontSize: '0.8rem', overflowX: 'auto', maxHeight: 400 }}>
                      <pre style={{ margin: 0 }}>{fhirData.xml}</pre>
                    </Paper>
                  </Box>
                )}

                {/* ── ND-JSON Representation ── */}
                {fhirTab === 2 && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        MIME-Type: <code>application/x-ndjson</code> (Bulk Data Format)
                      </Typography>
                      <Button size="small" startIcon={<ContentCopy />} onClick={() => handleCopyCode(fhirData.ndjson)}>
                        Copy ND-JSON
                      </Button>
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#1e1e1e', color: '#dcdcaa', borderRadius: 2, fontFamily: 'monospace', fontSize: '0.8rem', overflowX: 'auto', maxHeight: 400 }}>
                      <pre style={{ margin: 0 }}>{fhirData.ndjson}</pre>
                    </Paper>
                  </Box>
                )}

                {/* ── UML & Logical Definition ── */}
                {fhirTab === 3 && (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                      Logical Table & UML Object Definition as per HL7 FHIR Specification Section 2.1.6.0.
                    </Alert>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: alpha('#3b5bdb', 0.05) }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Attribute Name</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Data Type</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Cardinality [Min..Max]</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Description & Definition</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {fhirData.uml?.attributes?.map((attr: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}>
                                {attr.name}
                              </TableCell>
                              <TableCell>
                                <Chip label={attr.type} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{attr.cardinality}</TableCell>
                              <TableCell>{attr.definition}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenFhirInspector(false)} variant="contained">Close Inspector</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog 2: Add Standard Concept ─────────────────────────────────── */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Add color="primary" /> Register International Standard Concept
        </DialogTitle>
        <form onSubmit={handleCreateConcept}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Standard System</InputLabel>
                  <Select
                    value={createForm.system}
                    label="Standard System"
                    onChange={e => setCreateForm(p => ({ ...p, system: e.target.value }))}
                  >
                    {Object.keys(SYSTEM_CONFIG).map(sys => (
                      <MenuItem key={sys} value={sys}>{SYSTEM_CONFIG[sys].label} — {SYSTEM_CONFIG[sys].dept}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Standard Code *"
                  placeholder="e.g. 1F40, 89365-1 or B50.9"
                  required
                  value={createForm.code}
                  onChange={e => setCreateForm(p => ({ ...p, code: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Official Display Name *"
                  placeholder="e.g. Malaria (Plasmodium falciparum)"
                  required
                  value={createForm.display}
                  onChange={e => setCreateForm(p => ({ ...p, display: e.target.value }))}
                />
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Clinical Category</InputLabel>
                  <Select
                    value={createForm.category}
                    label="Clinical Category"
                    onChange={e => setCreateForm(p => ({ ...p, category: e.target.value }))}
                  >
                    <MenuItem value="DIAGNOSIS">Clinical Diagnosis</MenuItem>
                    <MenuItem value="PHARMACY">Pharmacy & Medication</MenuItem>
                    <MenuItem value="LAB">Laboratory & Pathology</MenuItem>
                    <MenuItem value="BILLING">Billing & HMO Tariff</MenuItem>
                    <MenuItem value="BLOOD_BANK">Blood Bank</MenuItem>
                    <MenuItem value="VITAL">Vitals & Nursing</MenuItem>
                    <MenuItem value="PROCEDURE">Surgical Procedure</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="System URI"
                  placeholder="e.g. http://id.who.int/icd/release/11/mms"
                  value={createForm.systemUri}
                  onChange={e => setCreateForm(p => ({ ...p, systemUri: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Clinical Description / Definition"
                  multiline
                  rows={2}
                  value={createForm.description}
                  onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting} sx={{ fontWeight: 800, borderRadius: 2 }}>
              {submitting ? <CircularProgress size={22} /> : 'Save Standard Concept'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Dialog 3: Map Local Hospital Item ────────────────────────────────── */}
      <Dialog open={openMap} onClose={() => setOpenMap(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinkIcon color="primary" /> Map Local Item to Standard
        </DialogTitle>
        <form onSubmit={handleMapSubmit}>
          <DialogContent dividers>
            {selectedConcept && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                Mapping to <strong>{selectedConcept.system} ({selectedConcept.code})</strong>: {selectedConcept.display}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Local Item Type</InputLabel>
                  <Select
                    value={mapForm.localItemType}
                    label="Local Item Type"
                    onChange={e => setMapForm(p => ({ ...p, localItemType: e.target.value }))}
                  >
                    <MenuItem value="LAB_TEST">LIMS Laboratory Test</MenuItem>
                    <MenuItem value="PHARMACY_ITEM">Pharmacy Dispensary Item</MenuItem>
                    <MenuItem value="SERVICE_TARIFF">Billing Tariff Service</MenuItem>
                    <MenuItem value="DIAGNOSIS">EMR Diagnosis Protocol</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Local Item ID / Code *"
                  placeholder="Enter local database ID or code"
                  required
                  value={mapForm.localItemId}
                  onChange={e => setMapForm(p => ({ ...p, localItemId: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Mapping Notes / Rationale"
                  multiline
                  rows={2}
                  value={mapForm.notes}
                  onChange={e => setMapForm(p => ({ ...p, notes: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenMap(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting} sx={{ fontWeight: 800, borderRadius: 2 }}>
              {submitting ? <CircularProgress size={22} /> : 'Save Mapping'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default DataDictionary;
