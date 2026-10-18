import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, TextField, Button, Stack,
  MenuItem, Select, FormControl, InputLabel, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress, Tooltip,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Switch,
  FormControlLabel, Tabs, Tab, Divider, LinearProgress, RadioGroup, Radio,
  Accordion, AccordionSummary, AccordionDetails, InputAdornment
} from '@mui/material';
import {
  Storage, SyncAlt, AutoAwesome, CheckCircle, ErrorOutline, ContentCopy,
  PlayArrow, SettingsInputAntenna, Speed, Terminal, Hub, CloudDownload,
  DataObject, ReceiptLong, LocalPharmacy, Science, Person, MedicalInformation,
  Visibility, VisibilityOff, Code, MenuBook, Search, Check, Refresh, HelpOutline,
  Key, AccountTree, ExpandMore, CheckCircleOutline, Public, Shield
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import Dhis2PublicHealthStudio from './Dhis2PublicHealthStudio';
import NdpcPrivacyStudio from './NdpcPrivacyStudio';

export const UniversalInteropStudio = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);

  // ── Tab 1: Database Connector State ──────────────────────────────────────
  const [dialect, setDialect] = useState<'POSTGRESQL' | 'MYSQL' | 'MSSQL' | 'ORACLE' | 'SQLITE'>('MYSQL');
  const [dbName, setDbName] = useState('openmrs');
  const [dbHost, setDbHost] = useState('10.120.221.29');
  const [dbPort, setDbPort] = useState('3306');
  const [dbUser, setDbUser] = useState('root');
  const [dbPassword, setDbPassword] = useState('Admin123');
  const [showDbPassword, setShowDbPassword] = useState(false);
  const [sslEnabled, setSslEnabled] = useState(false);
  const [testStatus, setTestStatus] = useState<{ testing: boolean; success?: boolean; latency?: number; message?: string } | null>(null);

  // Introspection Manifest
  const [introspecting, setIntrospecting] = useState(false);
  const [manifest, setManifest] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<any>(null);

  // ── Tab 2: Redesigned Table-to-Table & SQL Join Studio ───────────────────
  const [sourceMode, setSourceMode] = useState<'TABLE' | 'QUERY'>('TABLE');
  const [customSqlQuery, setCustomSqlQuery] = useState(`SELECT p.patient_id, p.gender, p.birthdate, \n       n.given_name, n.family_name,\n       i.identifier AS card_number\nFROM patient p\nJOIN person_name n ON p.patient_id = n.person_id\nLEFT JOIN patient_identifier i ON p.patient_id = i.patient_id\nLIMIT 20`);
  const [queryExecuting, setQueryExecuting] = useState(false);
  const [queryColumns, setQueryColumns] = useState<any[]>([]);
  const [querySampleRows, setQuerySampleRows] = useState<any[]>([]);
  const [queryExecutionMs, setQueryExecutionMs] = useState<number | null>(null);

  // TerkHealth360 Schema Explorer (Live from PostgreSQL system catalog)
  const [terkTables, setTerkTables] = useState<any[]>([]);
  const [selectedTerkTable, setSelectedTerkTable] = useState('patients');
  const [terkColumns, setTerkColumns] = useState<any[]>([]);
  const [loadingTerkCols, setLoadingTerkCols] = useState(false);
  const [searchTerkCol, setSearchTerkCol] = useState('');

  // ── Tab 3: Full Live TerkHealthSchema State ───────────────────────────────
  const [fullSchema, setFullSchema] = useState<any>(null);
  const [loadingFullSchema, setLoadingFullSchema] = useState(false);
  const [schemaSearchQuery, setSchemaSearchQuery] = useState('');
  const [selectedSchemaCategory, setSelectedSchemaCategory] = useState('ALL');
  const [expandedSchemaTable, setExpandedSchemaTable] = useState<string | null>('patients');
  const [refreshingSchema, setRefreshingSchema] = useState(false);

  // Field Mapping Rules between Source (Table or SQL Join) and TerkHealth360
  const [mappingRules, setMappingRules] = useState<any[]>([]);
  const [syncingTable, setSyncingTable] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // ── Tab 4: Custom App Webhooks State ─────────────────────────────────────
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [loadingEndpoints, setLoadingEndpoints] = useState(false);
  const [openNewEndpointDialog, setOpenNewEndpointDialog] = useState(false);
  const [newEndpointName, setNewEndpointName] = useState('');
  const [newEndpointType, setNewEndpointType] = useState('CASHIER');
  const [newEndpointTarget, setNewEndpointTarget] = useState('insurance_daily_receipts');
  const [testPayloadModalOpen, setTestPayloadModalOpen] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState<any>(null);
  const [testPayloadText, setTestPayloadText] = useState('');
  const [ingestingTest, setIngestingTest] = useState(false);

  // ── Tab 5: Audit Logs ────────────────────────────────────────────────────
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLogPayload, setSelectedLogPayload] = useState<any>(null);

  // ── Initial Data Fetch ───────────────────────────────────────────────────
  useEffect(() => {
    fetchTerkTables();
    fetchEndpoints();
    fetchLogs();
    fetchFullSchema();
  }, []);

  useEffect(() => {
    if (selectedTerkTable) {
      fetchTerkTableColumns(selectedTerkTable);
    }
  }, [selectedTerkTable]);

  const fetchFullSchema = async (bypassCache = false) => {
    setLoadingFullSchema(true);
    try {
      const res = await api.get(`/interop/terk-schema${bypassCache ? '?refresh=true' : ''}`);
      if (res.data?.success) {
        setFullSchema(res.data.schema);
      }
    } catch (_) {}
    finally {
      setLoadingFullSchema(false);
    }
  };

  const handleRefreshSchema = async () => {
    setRefreshingSchema(true);
    try {
      const res = await api.post('/interop/schema/refresh');
      if (res.data?.success) {
        enqueueSnackbar(`TerkHealthSchema live! Discovered ${res.data.totalTables} tables & ${res.data.totalColumns} columns directly from database.`, { variant: 'success' });
        await fetchTerkTables();
        if (selectedTerkTable) {
          await fetchTerkTableColumns(selectedTerkTable);
        }
        await fetchFullSchema(true);
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: 'error' });
    } finally {
      setRefreshingSchema(false);
    }
  };

  const fetchTerkTables = async () => {
    try {
      const res = await api.get('/interop/terk-tables');
      if (res.data?.success) {
        setTerkTables(res.data.tables || []);
      }
    } catch (_) {}
  };

  const fetchTerkTableColumns = async (tableName: string) => {
    setLoadingTerkCols(true);
    try {
      const res = await api.get(`/interop/terk-tables/${tableName}`);
      if (res.data?.success) {
        const cols = res.data.columns || [];
        setTerkColumns(cols);
        autoAlignMappings(cols);
      }
    } catch (_) {}
    finally { setLoadingTerkCols(false); }
  };

  const fetchEndpoints = async () => {
    setLoadingEndpoints(true);
    try {
      const res = await api.get('/interop/endpoints');
      if (res.data?.success) setEndpoints(res.data.endpoints || []);
    } catch (_) {}
    finally { setLoadingEndpoints(false); }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/interop/logs?limit=40');
      if (res.data?.success) setLogs(res.data.logs || []);
    } catch (_) {}
    finally { setLoadingLogs(false); }
  };

  // Helper to extract clean name for fuzzy matching
  const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  // ── Auto-Align Source Columns with TerkHealth360 Target Columns ───────────
  const autoAlignMappings = (targetCols: any[]) => {
    const availableSources = sourceMode === 'QUERY'
      ? queryColumns.map(c => c.name)
      : (selectedTable?.columns?.map((c: any) => c.name) || []);

    const newRules = targetCols.map(tc => {
      const tcClean = cleanStr(tc.name);
      let bestSource = '';
      let confidence = 0;

      for (const sc of availableSources) {
        const scClean = cleanStr(sc);
        if (scClean === tcClean) {
          bestSource = sc;
          confidence = 100;
          break;
        } else if (scClean.includes(tcClean) || tcClean.includes(scClean)) {
          if (confidence < 75) {
            bestSource = sc;
            confidence = 75;
          }
        }
      }

      let defaultTransform = 'DIRECT';
      if (/amount|fee|price|cost|balance|total/.test(tcClean)) defaultTransform = 'PARSE_NUMBER';
      else if (/date|time|at$/.test(tcClean)) defaultTransform = 'PARSE_DATE';
      else if (/gender|sex/.test(tcClean)) defaultTransform = 'GENDER_NORMALIZE';

      return {
        targetField: tc.name,
        sourceColumn: bestSource,
        transformFunction: defaultTransform,
        confidence,
        description: tc.description,
        isPrimaryKey: tc.isPrimaryKey,
        isNullable: tc.isNullable,
        dataType: tc.dataType
      };
    });

    setMappingRules(newRules);
  };

  // ── Connection Testing ───────────────────────────────────────────────────
  const handleTestConnection = async () => {
    setTestStatus({ testing: true });
    try {
      const payload = {
        dialect,
        host: dbHost,
        port: parseInt(dbPort, 10),
        databaseName: dbName,
        username: dbUser,
        password: dbPassword,
        options: { ssl: sslEnabled, trustServerCertificate: true }
      };
      const res = await api.post('/interop/db/test', payload);
      setTestStatus({
        testing: false,
        success: res.data?.success,
        latency: res.data?.latencyMs,
        message: res.data?.message || (res.data?.success ? 'Connection Verified' : 'Failed')
      });
      if (res.data?.success) {
        enqueueSnackbar(`Connected successfully in ${res.data.latencyMs}ms`, { variant: 'success' });
      } else {
        enqueueSnackbar(res.data?.message || 'Connection failed', { variant: 'error' });
      }
    } catch (err: any) {
      setTestStatus({ testing: false, success: false, message: err.response?.data?.message || err.message });
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: 'error' });
    }
  };

  // ── Schema Auto-Introspection ────────────────────────────────────────────
  const handleIntrospect = async () => {
    setIntrospecting(true);
    setManifest(null);
    setSelectedTable(null);
    try {
      const payload = {
        dialect,
        host: dbHost,
        port: parseInt(dbPort, 10),
        databaseName: dbName,
        username: dbUser,
        password: dbPassword,
        options: { ssl: sslEnabled, trustServerCertificate: true }
      };
      const res = await api.post('/interop/db/introspect', payload);
      if (res.data?.success) {
        setManifest(res.data.manifest);
        if (res.data.manifest.tables?.length > 0) {
          const first = res.data.manifest.tables[0];
          setSelectedTable(first);
        }
        enqueueSnackbar(`Discovered ${res.data.manifest.tables?.length || 0} tables from remote database.`, { variant: 'success' });
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: 'error' });
    } finally {
      setIntrospecting(false);
    }
  };

  // ── Run Custom SQL Join Statement on Connected DB ─────────────────────────
  const handleExecuteCustomQuery = async () => {
    setQueryExecuting(true);
    setQueryColumns([]);
    setQuerySampleRows([]);
    setQueryExecutionMs(null);
    try {
      const payload = {
        config: {
          dialect,
          host: dbHost,
          port: parseInt(dbPort, 10),
          databaseName: dbName,
          username: dbUser,
          password: dbPassword,
          options: { ssl: sslEnabled, trustServerCertificate: true }
        },
        query: customSqlQuery,
        limit: 10
      };
      const res = await api.post('/interop/db/query', payload);
      if (res.data?.success) {
        setQueryColumns(res.data.columns || []);
        setQuerySampleRows(res.data.rows || []);
        setQueryExecutionMs(res.data.executionMs);
        enqueueSnackbar(`Query executed in ${res.data.executionMs}ms (${res.data.columns?.length || 0} columns derived)`, { variant: 'success' });
        // Automatically align these newly extracted query columns with the target table
        autoAlignMappings(terkColumns);
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: 'error' });
    } finally {
      setQueryExecuting(false);
    }
  };

  // ── Execute Immediate Database Ingestion ──────────────────────────────────
  const handleExecuteSync = async () => {
    setSyncingTable(true);
    setSyncResult(null);
    try {
      // 1. Save or retrieve connector
      const connRes = await api.post('/interop/db/connectors', {
        name: `${dialect} - ${dbName}`,
        dialect,
        host: dbHost,
        port: parseInt(dbPort, 10),
        databaseName: dbName,
        username: dbUser,
        password: dbPassword,
        options: { ssl: sslEnabled }
      });
      const connectorId = connRes.data.id;

      // 2. Save table mapping
      const mapRes = await api.post('/interop/db/mappings', {
        connectorId,
        sourceTable: sourceMode === 'TABLE' ? selectedTable?.name : 'CUSTOM_QUERY',
        sourceQuery: sourceMode === 'QUERY' ? customSqlQuery : undefined,
        targetTable: selectedTerkTable,
        targetEntity: `TABLE:${selectedTerkTable}`,
        fieldMappings: mappingRules.filter(r => r.sourceColumn),
        syncMode: 'MANUAL'
      });
      const mappingId = mapRes.data.id;

      // 3. Execute sync of 50 rows
      const syncRes = await api.post(`/interop/db/sync/${mappingId}?limit=50`);
      setSyncResult(syncRes.data);
      enqueueSnackbar(`Sync Complete! Ingested ${syncRes.data.totalIngested} records directly into "${selectedTerkTable}" table.`, { variant: 'success' });
      fetchLogs();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: 'error' });
    } finally {
      setSyncingTable(false);
    }
  };

  // ── Create Custom App Endpoint ────────────────────────────────────────────
  const handleCreateEndpoint = async () => {
    if (!newEndpointName) {
      enqueueSnackbar('Endpoint name is required', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/interop/endpoints', {
        name: newEndpointName,
        appType: newEndpointType,
        targetEntity: `TABLE:${newEndpointTarget}`,
        payloadFormat: 'JSON',
        fieldMappings: []
      });

      enqueueSnackbar('Custom application connector created!', { variant: 'success' });
      setOpenNewEndpointDialog(false);
      setNewEndpointName('');
      fetchEndpoints();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: 'error' });
    }
  };

  // ── Open Test Payload Modal ──────────────────────────────────────────────
  const handleOpenTester = (ep: any) => {
    setTestingEndpoint(ep);
    let sample = {
      receipt_number: `RCPT-${Math.floor(100000 + Math.random() * 900000)}`,
      folder_number: 'FF-0001',
      patient_name: 'Grace Okafor',
      amount_paid: 12500,
      payment_method: 'POS_TERMINAL',
      service_rendered: 'Consultation & Ultrasound Scan',
      cashier_name: 'Blessing Cashier'
    };
    setTestPayloadText(JSON.stringify(sample, null, 2));
    setTestPayloadModalOpen(true);
  };

  // ── Send Test Ingest Payload ─────────────────────────────────────────────
  const handleSendTestPayload = async () => {
    if (!testingEndpoint) return;
    setIngestingTest(true);
    try {
      const parsed = JSON.parse(testPayloadText);
      const res = await api.post(`/interop/webhook/ingest/${testingEndpoint.endpoint_token}`, parsed);
      if (res.data?.success) {
        enqueueSnackbar(`Ingested successfully! Record ID: ${res.data.recordIdentifier} (${res.data.processingMs}ms)`, { variant: 'success' });
        setTestPayloadModalOpen(false);
        fetchEndpoints();
        fetchLogs();
      } else {
        enqueueSnackbar(res.data?.error || 'Ingest failed', { variant: 'error' });
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: 'error' });
    } finally {
      setIngestingTest(false);
    }
  };

  // Filtered target columns for search
  const filteredTerkCols = terkColumns.filter(c =>
    c.name.toLowerCase().includes(searchTerkCol.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerkCol.toLowerCase())
  );

  return (
    <Card elevation={2} sx={{ borderRadius: 3, mb: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
      {/* Header Banner */}
      <Box sx={{
        p: 3,
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', display: 'flex' }}>
            <Hub sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 1 }}>
              Universal Database & Application Interoperability Studio
              <Chip label="TABLE-TO-TABLE & SQL JOIN ENGINE" size="small" sx={{ bgcolor: '#0EA5E9', color: '#fff', fontWeight: 800, fontSize: '0.65rem' }} />
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              Direct table-to-table mapping, custom SQL join statements, and inbound webhook ingestion across MSSQL, MySQL, Oracle, and Postgres.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tabs Switcher */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} textColor="primary" indicatorColor="primary">
          <Tab icon={<Storage fontSize="small" />} iconPosition="start" label="1. Database Connector & Crawler" sx={{ fontWeight: 700 }} />
          <Tab icon={<Code fontSize="small" />} iconPosition="start" label="2. Table-to-Table & SQL Join Studio" sx={{ fontWeight: 700 }} />
          <Tab icon={<MenuBook fontSize="small" />} iconPosition="start" label="3. TerkHealthSchema (Live Catalog)" sx={{ fontWeight: 700 }} />
          <Tab icon={<SettingsInputAntenna fontSize="small" />} iconPosition="start" label="4. Custom App Webhook Hub" sx={{ fontWeight: 700 }} />
          <Tab icon={<Speed fontSize="small" />} iconPosition="start" label="5. Ingestion Audit Log" sx={{ fontWeight: 700 }} />
          <Tab icon={<Public fontSize="small" sx={{ color: '#0ca678' }} />} iconPosition="start" label="6. Public Health (DHIS2 / OpenHEXA)" sx={{ fontWeight: 700 }} />
          <Tab icon={<Shield fontSize="small" sx={{ color: '#10b981' }} />} iconPosition="start" label="7. Privacy & NDPC Auditing (NDPA 2023)" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Box>

      <CardContent sx={{ p: 3 }}>
        {/* ── TAB 1: Database Connector & Auto-Introspector ────────────────── */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {/* Connection Parameters Form */}
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={800} color="primary" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Storage fontSize="small" /> Remote Database Server Configuration
                </Typography>

                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="db-dialect-label">Database Server Engine</InputLabel>
                    <Select
                      labelId="db-dialect-label"
                      value={dialect}
                      label="Database Server Engine"
                      onChange={e => {
                        const d = e.target.value as any;
                        setDialect(d);
                        if (d === 'MYSQL') setDbPort('3306');
                        else if (d === 'POSTGRESQL') setDbPort('5432');
                        else if (d === 'MSSQL') setDbPort('1433');
                        else if (d === 'ORACLE') setDbPort('1521');
                      }}
                    >
                      <MenuItem value="MYSQL">MySQL / MariaDB</MenuItem>
                      <MenuItem value="MSSQL">Microsoft SQL Server (MSSQL)</MenuItem>
                      <MenuItem value="POSTGRESQL">PostgreSQL (Local / Cloud)</MenuItem>
                      <MenuItem value="ORACLE">Oracle Database</MenuItem>
                      <MenuItem value="SQLITE">SQLite / MS Access</MenuItem>
                    </Select>
                  </FormControl>

                  <Grid container spacing={1.5}>
                    <Grid item xs={8}>
                      <TextField
                        fullWidth size="small" label="Host / IP Address"
                        value={dbHost} onChange={e => setDbHost(e.target.value)}
                        placeholder="192.168.1.100 or localhost"
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth size="small" label="Port"
                        value={dbPort} onChange={e => setDbPort(e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  <TextField
                    fullWidth size="small" label="Database Name / Service"
                    value={dbName} onChange={e => setDbName(e.target.value)}
                    placeholder="e.g. openmrs or hospital_billing"
                  />

                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth size="small" label="Username"
                        value={dbUser} onChange={e => setDbUser(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      {/* Password field with Show/Hide Eye Icon */}
                      <TextField
                        fullWidth size="small"
                        type={showDbPassword ? 'text' : 'password'}
                        label="Password"
                        value={dbPassword}
                        onChange={e => setDbPassword(e.target.value)}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setShowDbPassword(p => !p)}
                                edge="end"
                                aria-label={showDbPassword ? 'Hide password' : 'Show password'}
                              >
                                {showDbPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                  </Grid>

                  <FormControlLabel
                    control={<Switch checked={sslEnabled} onChange={e => setSslEnabled(e.target.checked)} size="small" />}
                    label={<Typography variant="body2">Enable SSL / TLS Encryption</Typography>}
                  />

                  {/* Actions */}
                  <Stack direction="row" spacing={1.5} pt={1}>
                    <Button
                      variant="outlined" color="primary" fullWidth
                      onClick={handleTestConnection}
                      disabled={testStatus?.testing}
                      startIcon={testStatus?.testing ? <CircularProgress size={16} /> : <Speed />}
                    >
                      Test Connection
                    </Button>
                    <Button
                      variant="contained" color="primary" fullWidth
                      onClick={handleIntrospect}
                      disabled={introspecting}
                      startIcon={introspecting ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}
                    >
                      {introspecting ? 'Crawling...' : 'Auto-Introspect'}
                    </Button>
                  </Stack>

                  {/* Test Status Banner */}
                  {testStatus && !testStatus.testing && (
                    <Alert severity={testStatus.success ? 'success' : 'error'} sx={{ mt: 1 }}>
                      <strong>{testStatus.message}</strong>
                      {testStatus.latency !== undefined && ` (Ping: ${testStatus.latency}ms)`}
                    </Alert>
                  )}
                </Stack>
              </Paper>
            </Grid>

            {/* Discovered Tables & Preview */}
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', minHeight: 380 }}>
                <Typography variant="subtitle2" fontWeight={800} color="text.primary" mb={1.5} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Discovered Remote Tables ({manifest?.tables?.length || 0})</span>
                  {manifest && <Chip label={`${manifest.dialect} Introspected`} size="small" color="success" />}
                </Typography>

                {introspecting && (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <CircularProgress size={36} />
                    <Typography variant="body2" color="text.secondary" mt={2}>
                      Crawling remote system catalogs, data types, indexes, and primary keys...
                    </Typography>
                  </Box>
                )}

                {!introspecting && !manifest && (
                  <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                    <Storage sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                    <Typography variant="body2">Enter connection parameters and click <strong>Auto-Introspect</strong> to crawl the database schema.</Typography>
                  </Box>
                )}

                {!introspecting && manifest && (
                  <Box>
                    {/* Tables Chip List */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 130, overflowY: 'auto', p: 1, bgcolor: 'action.hover', borderRadius: 1.5, mb: 2 }}>
                      {manifest.tables?.map((tbl: any) => (
                        <Chip
                          key={tbl.name}
                          label={`${tbl.name} (${tbl.columns?.length || 0} cols)`}
                          onClick={() => {
                            setSelectedTable(tbl);
                            autoAlignMappings(terkColumns);
                          }}
                          color={selectedTable?.name === tbl.name ? 'primary' : 'default'}
                          variant={selectedTable?.name === tbl.name ? 'filled' : 'outlined'}
                          clickable
                          size="small"
                        />
                      ))}
                    </Box>

                    {/* Selected Table Detail */}
                    {selectedTable && (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight={800}>
                            Table: <code>{selectedTable.name}</code> (Est. {selectedTable.estimatedRowCount} rows)
                          </Typography>
                          <Button size="small" variant="contained" color="secondary" onClick={() => setActiveTab(1)} endIcon={<SyncAlt />}>
                            Map to TerkHealth360 Table →
                          </Button>
                        </Box>

                        <TableContainer sx={{ maxHeight: 200, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell>Column</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>PK</TableCell>
                                <TableCell>Nullable</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedTable.columns?.map((c: any) => (
                                <TableRow key={c.name} hover>
                                  <TableCell><code>{c.name}</code></TableCell>
                                  <TableCell><Chip label={c.dataType} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></TableCell>
                                  <TableCell>{c.isPrimaryKey ? <CheckCircle fontSize="small" color="primary" /> : '-'}</TableCell>
                                  <TableCell>{c.isNullable ? 'YES' : 'NO'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* ── TAB 2: Table-to-Table & Custom SQL Join Studio ────────────────── */}
        {activeTab === 1 && (
          <Box>
            {/* Top Control Bar: Source Mode & Target Table Picker */}
            <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
              <Grid container spacing={2.5} alignItems="center">
                {/* Source Selection Mode */}
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">
                    Step 1: Choose Source Mode from Connected Database
                  </Typography>
                  <RadioGroup
                    row
                    value={sourceMode}
                    onChange={e => {
                      const m = e.target.value as any;
                      setSourceMode(m);
                      setTimeout(() => autoAlignMappings(terkColumns), 50);
                    }}
                  >
                    <FormControlLabel
                      value="TABLE"
                      control={<Radio size="small" />}
                      label={<strong>Single Table ({selectedTable?.name || 'Select Table'})</strong>}
                    />
                    <FormControlLabel
                      value="QUERY"
                      control={<Radio size="small" />}
                      label={<strong>Custom SQL Join Query (Multi-Table)</strong>}
                    />
                  </RadioGroup>
                </Grid>

                {/* Target TerkHealth360 Table */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" fontWeight={800} color="primary" textTransform="uppercase">
                      Step 2: Select Target TerkHealth360 Database Table
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip label="Auto-Syncs with TerkHealthSchema" size="small" color="success" variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
                      <Tooltip title="Refresh schema live from PostgreSQL — auto-detects newly added tables & columns in TerkHealth360">
                        <IconButton
                          size="small"
                          disabled={refreshingSchema}
                          onClick={handleRefreshSchema}
                        >
                          {refreshingSchema ? <CircularProgress size={14} /> : <Refresh fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
                    <Select
                      value={selectedTerkTable}
                      onChange={e => setSelectedTerkTable(e.target.value)}
                    >
                      {terkTables.map(t => (
                        <MenuItem key={t.tableName} value={t.tableName}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span><strong>{t.tableName}</strong> ({t.columnCount || 0} cols)</span>
                            <Chip label={t.category} size="small" sx={{ fontSize: '0.65rem', height: 20, ml: 1 }} />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Custom SQL Query Editor (when in QUERY mode) */}
              {sourceMode === 'QUERY' && (
                <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Code color="primary" /> SQL Join Statement on Connected Database ({dialect}):
                    </Typography>
                    <Button
                      variant="contained" color="primary" size="small"
                      startIcon={queryExecuting ? <CircularProgress size={14} color="inherit" /> : <PlayArrow />}
                      onClick={handleExecuteCustomQuery}
                      disabled={queryExecuting}
                    >
                      {queryExecuting ? 'Executing...' : 'Run & Extract Query Columns'}
                    </Button>
                  </Box>

                  <TextField
                    fullWidth multiline rows={4}
                    value={customSqlQuery}
                    onChange={e => setCustomSqlQuery(e.target.value)}
                    placeholder="SELECT p.id, p.first_name, p.last_name, v.visit_date FROM patients p JOIN visits v ON p.id = v.patient_id"
                    sx={{
                      '& .MuiInputBase-root': {
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        bgcolor: 'action.hover'
                      }
                    }}
                  />

                  {queryExecutionMs !== null && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                      <Chip label={`Execution: ${queryExecutionMs}ms`} size="small" color="success" />
                      <Typography variant="caption" color="text.secondary">
                        Extracted {queryColumns.length} columns: {queryColumns.map(c => c.name).join(', ')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>

            {/* Main Mapping Grid: Mapping Canvas & Target Column Reference */}
            <Grid container spacing={3}>
              {/* Field-to-Field Mapping Canvas */}
              <Grid item xs={12} lg={8}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800}>
                        Field Mapping Canvas: {sourceMode === 'TABLE' ? `[${selectedTable?.name || 'No Table Selected'}]` : '[Custom SQL Query]'} → <code>{selectedTerkTable}</code>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Map each column to its corresponding source field and specify any required transformation formulas.
                      </Typography>
                    </Box>

                    <Button
                      variant="contained" color="success"
                      startIcon={syncingTable ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
                      onClick={handleExecuteSync}
                      disabled={syncingTable}
                    >
                      {syncingTable ? 'Ingesting...' : 'Save & Ingest 50 Rows'}
                    </Button>
                  </Box>

                  {loadingTerkCols ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={30} /></Box>
                  ) : (
                    <TableContainer sx={{ maxHeight: 500 }}>
                      <Table size="small" stickyHeader>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell width="35%"><strong>Target Column & Description (TerkHealth360)</strong></TableCell>
                            <TableCell width="35%"><strong>Source Column (Connected DB)</strong></TableCell>
                            <TableCell width="30%"><strong>Transformation Function</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {mappingRules.map((r, idx) => {
                            const availableCols = sourceMode === 'QUERY'
                              ? queryColumns.map(c => c.name)
                              : (selectedTable?.columns?.map((c: any) => c.name) || []);

                            return (
                              <TableRow key={r.targetField} hover>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                    <Typography variant="body2" fontWeight={800}>
                                      <code>{r.targetField}</code>
                                    </Typography>
                                    <Chip label={r.dataType} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                                    {r.isPrimaryKey && <Chip label="PK" size="small" color="primary" sx={{ fontSize: '0.6rem', height: 18 }} />}
                                    {!r.isNullable && <span style={{ color: 'red', fontWeight: 'bold' }}>*</span>}
                                  </Box>
                                  {/* Short Description under target column */}
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, lineHeight: 1.25 }}>
                                    {r.description}
                                  </Typography>
                                </TableCell>

                                <TableCell>
                                  <Select
                                    size="small" fullWidth
                                    value={r.sourceColumn || ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setMappingRules(prev => {
                                        const next = [...prev];
                                        next[idx].sourceColumn = val;
                                        next[idx].confidence = val ? 100 : 0;
                                        return next;
                                      });
                                    }}
                                  >
                                    <MenuItem value=""><em>-- Unmapped (Skip) --</em></MenuItem>
                                    {availableCols.map((cName: string) => (
                                      <MenuItem key={cName} value={cName}>
                                        <code>{cName}</code>
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </TableCell>

                                <TableCell>
                                  <Select
                                    size="small" fullWidth
                                    value={r.transformFunction || 'DIRECT'}
                                    onChange={e => {
                                      const fn = e.target.value as any;
                                      setMappingRules(prev => {
                                        const next = [...prev];
                                        next[idx].transformFunction = fn;
                                        return next;
                                      });
                                    }}
                                  >
                                    <MenuItem value="DIRECT">Direct (Pass-Through)</MenuItem>
                                    <MenuItem value="PARSE_NUMBER">Parse Numeric (₦ Currency / Decimals)</MenuItem>
                                    <MenuItem value="PARSE_DATE">Parse Date / Timestamp (ISO)</MenuItem>
                                    <MenuItem value="GENDER_NORMALIZE">Gender (M/F → MALE/FEMALE)</MenuItem>
                                    <MenuItem value="UPPERCASE">Uppercase Clean</MenuItem>
                                    <MenuItem value="LOWERCASE">Lowercase Clean</MenuItem>
                                    <MenuItem value="TRIM">Trim Whitespace</MenuItem>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Grid>

              {/* Column Descriptions & Reference Guide for TerkHealth360 Target Table */}
              <Grid item xs={12} lg={4}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', maxHeight: 600, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MenuBook color="primary" fontSize="small" /> TerkHealth360 Column Dictionary
                    </Typography>
                    <Chip label={`${selectedTerkTable} (${terkColumns.length})`} size="small" color="primary" variant="outlined" />
                  </Box>

                  <Typography variant="caption" color="text.secondary" mb={1.5}>
                    Use these column definitions as a reference when writing your custom SQL Join aliases (e.g. <code>SELECT pt_no AS patientNumber</code>).
                  </Typography>

                  <TextField
                    size="small" fullWidth placeholder="Search columns & descriptions..."
                    value={searchTerkCol} onChange={e => setSearchTerkCol(e.target.value)}
                    InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    sx={{ mb: 1.5 }}
                  />

                  <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 0.5 }}>
                    <Stack spacing={1.5}>
                      {filteredTerkCols.map(c => (
                        <Box key={c.name} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5, borderLeft: '3px solid', borderColor: c.isPrimaryKey ? 'primary.main' : 'divider' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={800}>
                              <code>{c.name}</code>
                            </Typography>
                            <Chip label={c.dataType} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                          </Box>
                          <Typography variant="caption" sx={{ color: 'text.primary', display: 'block', lineHeight: 1.3 }}>
                            {c.description}
                          </Typography>
                          {!c.isNullable && (
                            <Typography variant="caption" color="error.main" fontWeight={700} sx={{ display: 'block', mt: 0.5 }}>
                              * Required field
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Sync Results Banner */}
            {syncResult && (
              <Alert severity="success" sx={{ mt: 3 }}>
                <strong>Sync Succeeded!</strong> Extracted {syncResult.totalFetched} rows. Successfully ingested <strong>{syncResult.totalIngested}</strong> records into TerkHealth360 table <code>{selectedTerkTable}</code>.
              </Alert>
            )}
          </Box>
        )}

        {/* ── TAB 3: TerkHealthSchema (Live Dynamic Catalog) ────────────────── */}
        {activeTab === 2 && (
          <Box>
            {/* Live Schema Header & Summary Cards */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MenuBook color="primary" /> TerkHealthSchema — Enterprise Data Dictionary
                  <Chip label="PostgreSQL Live" size="small" color="primary" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Live real-time introspection of all tables, columns, data types, primary keys, and foreign keys in TerkHealth360.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopy />}
                  onClick={() => {
                    if (fullSchema) {
                      navigator.clipboard.writeText(JSON.stringify(fullSchema, null, 2));
                      enqueueSnackbar('TerkHealthSchema JSON copied to clipboard!', { variant: 'success' });
                    }
                  }}
                >
                  Copy Schema JSON
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  disabled={refreshingSchema}
                  startIcon={refreshingSchema ? <CircularProgress size={14} color="inherit" /> : <Refresh />}
                  onClick={handleRefreshSchema}
                >
                  {refreshingSchema ? 'Re-scanning...' : 'Force Re-Scan Schema'}
                </Button>
              </Stack>
            </Box>

            {/* Dynamic Discovery Guarantee Alert */}
            <Alert
              severity="info"
              icon={<AutoAwesome />}
              sx={{ mb: 3, borderRadius: 2 }}
            >
              <strong>⚡ Automatic Schema Ingestion Active:</strong> Any new column or table added to the TerkHealth360 database (via Prisma migrations, DDL scripts, or SQL execution) is automatically introspected and incorporated into <code>TerkHealthSchema</code> in real-time without requiring application restarts.
            </Alert>

            {/* Metrics Row */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={3}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Total Tables</Typography>
                  <Typography variant="h4" fontWeight={900} color="primary">
                    {fullSchema?.totalTables || terkTables.length || 0}
                  </Typography>
                  <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                    <CheckCircleOutline fontSize="inherit" /> 100% Introspected
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Total Columns</Typography>
                  <Typography variant="h4" fontWeight={900} color="primary">
                    {fullSchema?.totalColumns?.toLocaleString() || '2,400+'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">With Clinical Descriptions</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Target Database</Typography>
                  <Typography variant="h6" fontWeight={800} color="text.primary" mt={0.5}>
                    PostgreSQL
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Schema: public</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Sync Engine</Typography>
                  <Typography variant="h6" fontWeight={800} color="success.main" mt={0.5}>
                    Dynamic / Real-Time
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fullSchema?.generatedAt ? new Date(fullSchema.generatedAt).toLocaleTimeString() : 'Live'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Search and Category Filter */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search table name, column name, or clinical concept..."
                    value={schemaSearchQuery}
                    onChange={e => setSchemaSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={7}>
                  <Stack direction="row" spacing={0.8} sx={{ overflowX: 'auto', py: 0.5 }}>
                    {['ALL', 'PATIENT & EMR', 'BILLING & FINANCE', 'PHARMACY & DRUGS', 'LABORATORY & LIMS', 'CLINICAL ENCOUNTERS', 'WORKFORCE & HR', 'INPATIENT (IPD)', 'DENTAL & RADIOLOGY', 'INTEROPERABILITY & NDR'].map(cat => (
                      <Chip
                        key={cat}
                        label={cat}
                        clickable
                        color={selectedSchemaCategory === cat ? 'primary' : 'default'}
                        variant={selectedSchemaCategory === cat ? 'filled' : 'outlined'}
                        size="small"
                        onClick={() => setSelectedSchemaCategory(cat)}
                        sx={{ fontSize: '0.7rem', fontWeight: selectedSchemaCategory === cat ? 800 : 500 }}
                      />
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* Tables & Columns Explorer */}
            {loadingFullSchema ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress size={32} sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Loading TerkHealthSchema directly from PostgreSQL...</Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {Object.values(fullSchema?.tables || {})
                  .filter((t: any) => {
                    const matchesCategory = selectedSchemaCategory === 'ALL' || t.category === selectedSchemaCategory;
                    if (!matchesCategory) return false;
                    if (!schemaSearchQuery) return true;
                    const q = schemaSearchQuery.toLowerCase();
                    const tableMatch = t.tableName.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
                    const colMatch = t.columns?.some((c: any) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
                    return tableMatch || colMatch;
                  })
                  .slice(0, 50)
                  .map((t: any) => {
                    const isExpanded = expandedSchemaTable === t.tableName;
                    return (
                      <Accordion
                        key={t.tableName}
                        expanded={isExpanded}
                        onChange={() => setExpandedSchemaTable(isExpanded ? null : t.tableName)}
                        variant="outlined"
                        sx={{ borderRadius: '8px !important', '&:before': { display: 'none' } }}
                      >
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: 'monospace' }}>
                                {t.tableName}
                              </Typography>
                              <Chip label={t.category} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                              <Chip label={`${t.columnCount} columns`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                              {t.primaryKeys?.length > 0 && (
                                <Chip
                                  icon={<Key sx={{ fontSize: '12px !important' }} />}
                                  label={`PK: ${t.primaryKeys.join(', ')}`}
                                  size="small"
                                  sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'action.hover' }}
                                />
                              )}
                              {t.foreignKeys?.length > 0 && (
                                <Chip
                                  icon={<AccountTree sx={{ fontSize: '12px !important' }} />}
                                  label={`${t.foreignKeys.length} FK relations`}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                  sx={{ fontSize: '0.65rem', height: 20 }}
                                />
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                              {t.description}
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                            <Table size="small" stickyHeader>
                              <TableHead>
                                <TableRow>
                                  <TableCell width="25%"><strong>Column Name</strong></TableCell>
                                  <TableCell width="15%"><strong>Data Type</strong></TableCell>
                                  <TableCell width="12%"><strong>Nullability</strong></TableCell>
                                  <TableCell width="18%"><strong>Key / Relationship</strong></TableCell>
                                  <TableCell width="30%"><strong>Clinical & System Description</strong></TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {t.columns?.map((c: any) => (
                                  <TableRow key={c.name} hover>
                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>
                                      {c.name}
                                    </TableCell>
                                    <TableCell>
                                      <Chip label={c.dataType} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                                    </TableCell>
                                    <TableCell>
                                      {c.isNullable ? (
                                        <Typography variant="caption" color="text.secondary">Nullable</Typography>
                                      ) : (
                                        <Chip label="Required" size="small" color="warning" sx={{ fontSize: '0.6rem', height: 18, fontWeight: 700 }} />
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {c.isPrimaryKey && (
                                        <Chip icon={<Key sx={{ fontSize: '12px !important' }} />} label="Primary Key" size="small" color="primary" sx={{ fontSize: '0.65rem', height: 20, mr: 0.5 }} />
                                      )}
                                      {c.isForeignKey && (
                                        <Tooltip title={`Points to ${c.foreignTable}.${c.foreignColumn}`}>
                                          <Chip
                                            icon={<AccountTree sx={{ fontSize: '12px !important' }} />}
                                            label={`→ ${c.foreignTable}`}
                                            size="small"
                                            color="secondary"
                                            variant="outlined"
                                            sx={{ fontSize: '0.65rem', height: 20 }}
                                          />
                                        </Tooltip>
                                      )}
                                      {!c.isPrimaryKey && !c.isForeignKey && (
                                        <Typography variant="caption" color="text.disabled">—</Typography>
                                      )}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                      {c.description}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
              </Stack>
            )}
          </Box>
        )}

        {/* ── TAB 4: Custom Application Webhook Gateway ───────────────────── */}
        {activeTab === 3 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  Active Application Ingestion Webhooks
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Connect third-party cashier POS terminals, standalone pharmacy dispensaries, or lab analyzers using live webhooks.
                </Typography>
              </Box>
              <Button
                variant="contained" color="primary"
                startIcon={<SettingsInputAntenna />}
                onClick={() => setOpenNewEndpointDialog(true)}
              >
                Create Connector Webhook
              </Button>
            </Box>

            {loadingEndpoints ? (
              <LinearProgress />
            ) : endpoints.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                <DataObject sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                <Typography variant="body2" color="text.secondary">No custom application connectors registered yet.</Typography>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {endpoints.map((ep: any) => {
                  const webhookUrl = `${window.location.protocol}//${window.location.hostname}:3000/api/interop/webhook/ingest/${ep.endpoint_token}`;
                  return (
                    <Grid item xs={12} md={6} key={ep.id}>
                      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, position: 'relative' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={800}>{ep.name}</Typography>
                            <Stack direction="row" spacing={1} mt={0.5}>
                              <Chip label={ep.app_type} size="small" color="primary" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                              <Chip label={`Target: ${ep.target_entity}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                            </Stack>
                          </Box>
                          <Chip label={`Ingested: ${ep.total_ingested || 0}`} size="small" color="success" sx={{ fontWeight: 800 }} />
                        </Box>

                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Inbound Webhook URL:</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'action.hover', p: 1, borderRadius: 1, my: 1 }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {webhookUrl}
                          </Typography>
                          <Tooltip title="Copy Inbound URL">
                            <IconButton size="small" onClick={() => {
                              navigator.clipboard.writeText(webhookUrl);
                              enqueueSnackbar('Webhook URL copied to clipboard!', { variant: 'info' });
                            }}>
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>

                        <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
                          <Button
                            size="small" variant="outlined" startIcon={<Terminal />}
                            onClick={() => handleOpenTester(ep)}
                          >
                            Simulate Inbound POST
                          </Button>
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        )}

        {/* ── TAB 5: Live Ingestion Audit Log ──────────────────────────────── */}
        {activeTab === 4 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={800}>Real-Time Ingestion Audit Trail</Typography>
              <Button size="small" onClick={fetchLogs} startIcon={<SyncAlt />}>Refresh Log</Button>
            </Box>

            {loadingLogs ? (
              <LinearProgress />
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Target Table</TableCell>
                      <TableCell>Identifier</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Latency</TableCell>
                      <TableCell>Inspection</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((log: any) => (
                      <TableRow key={log.id} hover>
                        <TableCell>{new Date(log.created_at).toLocaleTimeString()}</TableCell>
                        <TableCell>
                          <Chip label={log.source_type} size="small" sx={{ mr: 1, fontSize: '0.65rem' }} />
                          {log.source_name}
                        </TableCell>
                        <TableCell><code>{log.target_entity}</code></TableCell>
                        <TableCell><strong>{log.record_identifier || '-'}</strong></TableCell>
                        <TableCell>
                          <Chip
                            label={log.status}
                            size="small"
                            color={log.status === 'SUCCESS' ? 'success' : 'error'}
                            sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                          />
                        </TableCell>
                        <TableCell>{log.processing_ms}ms</TableCell>
                        <TableCell>
                          <Button size="small" variant="text" onClick={() => setSelectedLogPayload(log)}>
                            View Payload
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* ── TAB 6: NHTDAO Layer 4 Public Health Reporting (DHIS2 & OpenHEXA) ── */}
        {activeTab === 5 && (
          <Box sx={{ p: 0.5 }}>
            <Dhis2PublicHealthStudio />
          </Box>
        )}

        {/* ── TAB 7: NHTDAO Layer 5 Privacy-by-Design & NDPC Compliance Auditing ── */}
        {activeTab === 6 && (
          <Box sx={{ p: 0.5 }}>
            <NdpcPrivacyStudio />
          </Box>
        )}
      </CardContent>

      {/* ── Modal: Create New Application Endpoint ────────────────────────── */}
      <Dialog open={openNewEndpointDialog} onClose={() => setOpenNewEndpointDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Custom Application Webhook Connector</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              fullWidth label="Application Name / Label"
              placeholder="e.g. FrontDesk Cashier Till #1, or Satellite Pharmacy POS"
              value={newEndpointName} onChange={e => setNewEndpointName(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel id="ep-app-type-label">Application Category</InputLabel>
              <Select
                labelId="ep-app-type-label"
                value={newEndpointType}
                label="Application Category"
                onChange={e => setNewEndpointType(e.target.value)}
              >
                <MenuItem value="CASHIER">Cashier / POS Billing System</MenuItem>
                <MenuItem value="PHARMACY">Pharmacy / Drug Dispensary</MenuItem>
                <MenuItem value="LIMS">Laboratory / Analyzer Interface</MenuItem>
                <MenuItem value="CUSTOM">Custom External Hospital System</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="ep-target-label">Target TerkHealth360 Table</InputLabel>
              <Select
                labelId="ep-target-label"
                value={newEndpointTarget}
                label="Target TerkHealth360 Table"
                onChange={e => setNewEndpointTarget(e.target.value)}
              >
                <MenuItem value="insurance_daily_receipts">Cashier Receipt & Daily Collection (insurance_daily_receipts)</MenuItem>
                <MenuItem value="pharmacy_dispensing_records">Pharmacy Dispensing Log (pharmacy_dispensing_records)</MenuItem>
                <MenuItem value="patients">Patient Master Index (patients)</MenuItem>
                <MenuItem value="visits">Clinical Encounters (visits)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenNewEndpointDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateEndpoint}>Create Ingestion Endpoint</Button>
        </DialogActions>
      </Dialog>

      {/* ── Modal: Simulate Inbound Payload ────────────────────────────────── */}
      <Dialog open={testPayloadModalOpen} onClose={() => setTestPayloadModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Simulate External Inbound Transaction ({testingEndpoint?.name})
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Edit the mock JSON payload below and click <strong>Transmit Payload</strong> to test live ingestion:
          </Typography>
          <TextField
            fullWidth multiline rows={8}
            value={testPayloadText}
            onChange={e => setTestPayloadText(e.target.value)}
            sx={{ fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTestPayloadModalOpen(false)}>Close</Button>
          <Button
            variant="contained" color="success"
            startIcon={ingestingTest ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
            onClick={handleSendTestPayload}
            disabled={ingestingTest}
          >
            {ingestingTest ? 'Transmitting...' : 'Transmit Payload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Modal: View Audit Payload ──────────────────────────────────────── */}
      <Dialog open={Boolean(selectedLogPayload)} onClose={() => setSelectedLogPayload(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Ingested Payload Inspection</DialogTitle>
        <DialogContent dividers>
          {selectedLogPayload && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" fontWeight={800} mb={1}>Raw Inbound Payload</Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#0b0f15', color: '#38BDF8', fontFamily: 'monospace', fontSize: '0.75rem', maxHeight: 300, overflowY: 'auto' }}>
                  <pre>{JSON.stringify(selectedLogPayload.raw_payload, null, 2)}</pre>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" fontWeight={800} mb={1}>Transformed Canonical Record</Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#0b0f15', color: '#4ADE80', fontFamily: 'monospace', fontSize: '0.75rem', maxHeight: 300, overflowY: 'auto' }}>
                  <pre>{JSON.stringify(selectedLogPayload.canonical_payload, null, 2)}</pre>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLogPayload(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
export default UniversalInteropStudio;
