import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, TextField, Button, Stack,
  Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Alert, CircularProgress, Tooltip, IconButton, Tabs, Tab, Divider,
  LinearProgress, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  Storage, SyncAlt, AutoAwesome, CheckCircle, ErrorOutline, ContentCopy,
  PlayArrow, SettingsInputAntenna, Speed, Hub, CloudDownload,
  DataObject, Code, Refresh, Key, SwapHoriz, Send, Terminal, Security,
  DoneAll, CloudUpload, ArrowForward, Check, VerifiedUser, ExpandMore,
  Public, Shield, LocalHospital
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import UniversalInteropStudio from './UniversalInteropStudio';

export interface SmartFhirMigrationStudioProps {
  onSwitchToPaper?: () => void;
}

export default function SmartFhirMigrationStudio({ onSwitchToPaper }: SmartFhirMigrationStudioProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);

  // ── Tab 0: SMART Gateway & Token Simulator State ─────────────────────────────
  const [testingGateway, setTestingGateway] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<{
    tested: boolean;
    success?: boolean;
    latencyMs?: number;
    smartConfig?: any;
    capabilityStatement?: any;
    message?: string;
  }>({ tested: false });

  const [clientId, setClientId] = useState('hospital-legacy-ehr-migrator');
  const [clientSecret, setClientSecret] = useState('smart-migrator-secret-key-2026');
  const [requestedScope, setRequestedScope] = useState('system/*.read system/*.write patient/*.read patient/*.write');
  const [requestingToken, setRequestingToken] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenExpiresIn, setTokenExpiresIn] = useState<number | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // ── Tab 1: Live Inbound FHIR Resource & Bundle Ingestion State ────────────────
  const [targetEndpoint, setTargetEndpoint] = useState<'Patient' | 'Bundle'>('Patient');
  const [ingestionPayload, setIngestionPayload] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestionResult, setIngestionResult] = useState<any>(null);

  // ── Tab 2: Remote Hospital EHR / FHIR Server Pull State ──────────────────────
  const [remoteFhirUrl, setRemoteFhirUrl] = useState('http://localhost:8080/openmrs/ws/fhir2/R4');
  const [remoteAuthType, setRemoteAuthType] = useState<'NONE' | 'BEARER' | 'BASIC'>('BASIC');
  const [remoteUsername, setRemoteUsername] = useState('admin');
  const [remotePassword, setRemotePassword] = useState('Admin123');
  const [remoteBearerToken, setRemoteBearerToken] = useState('');
  const [testingRemote, setTestingRemote] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState<{ tested: boolean; connected?: boolean; message?: string } | null>(null);
  const [pullingRemote, setPullingRemote] = useState(false);
  const [pullProgress, setPullProgress] = useState<{ imported: number; total: number; active: boolean } | null>(null);

  // Default sample payloads
  const samplePatientJson = {
    resourceType: 'Patient',
    identifier: [
      {
        system: 'http://hospital.org/patient-ids',
        value: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: { coding: [{ code: 'MR', display: 'Medical Record Number' }] }
      },
      {
        system: 'http://nimc.gov.ng/nin',
        value: `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
        type: { coding: [{ code: 'NNNGA', display: 'Nigerian National Identity Number' }] }
      }
    ],
    name: [
      {
        family: 'Balogun',
        given: ['Adekunle', 'Oluwaseun']
      }
    ],
    telecom: [
      { system: 'phone', value: '+234 803 291 8472', use: 'mobile' },
      { system: 'email', value: `adekunle.balogun_${Date.now()}@example.com` }
    ],
    gender: 'male',
    birthDate: '1988-06-14',
    address: [
      {
        line: ['14 University Road, Off Secretariat Road'],
        city: 'Nsukka',
        state: 'Enugu',
        country: 'Nigeria'
      }
    ],
    extension: [
      {
        url: 'http://hospital.org/fhir/StructureDefinition/blood-group',
        valueString: 'O+'
      },
      {
        url: 'http://hospital.org/fhir/StructureDefinition/patient-number',
        valueString: `FFH-${Math.floor(1000 + Math.random() * 9000)}`
      }
    ]
  };

  const sampleBundleJson = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: `PAT-${Date.now()}`,
          name: [{ family: 'Okafor', given: ['Chinedu', 'Emeka'] }],
          gender: 'male',
          birthDate: '1992-11-23',
          telecom: [{ system: 'phone', value: '+234 812 345 6789' }]
        }
      },
      {
        resource: {
          resourceType: 'Patient',
          id: `PAT-${Date.now() + 1}`,
          name: [{ family: 'Ibrahim', given: ['Amina', 'Fatima'] }],
          gender: 'female',
          birthDate: '1995-04-18',
          telecom: [{ system: 'phone', value: '+234 802 888 1234' }]
        }
      }
    ]
  };

  useEffect(() => {
    setIngestionPayload(JSON.stringify(samplePatientJson, null, 2));
    testGatewayConnectivity();
  }, []);

  // Test Gateway Connectivity
  const testGatewayConnectivity = async () => {
    setTestingGateway(true);
    const start = Date.now();
    try {
      const [smartRes, metadataRes] = await Promise.all([
        api.get('/fhir/.well-known/smart-configuration'),
        api.get('/fhir/metadata')
      ]);
      const latency = Date.now() - start;
      setGatewayStatus({
        tested: true,
        success: true,
        latencyMs: latency,
        smartConfig: smartRes.data,
        capabilityStatement: metadataRes.data,
        message: 'SMART on FHIR Gateway is fully operational & NDHA Conforming.'
      });
    } catch (err: any) {
      setGatewayStatus({
        tested: true,
        success: false,
        latencyMs: Date.now() - start,
        message: err.response?.data?.message || err.message || 'Gateway offline'
      });
    } finally {
      setTestingGateway(false);
    }
  };

  // Generate OAuth 2.0 SMART Token
  const handleGenerateToken = async () => {
    setRequestingToken(true);
    try {
      const res = await api.post('/auth/token', {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: requestedScope
      });
      if (res.data?.access_token) {
        setGeneratedToken(res.data.access_token);
        setTokenExpiresIn(res.data.expires_in || 3600);
        enqueueSnackbar('SMART on FHIR Bearer Token minted successfully!', { variant: 'success' });
      } else {
        enqueueSnackbar('Token grant failed: Invalid credentials format', { variant: 'error' });
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error_description || err.response?.data?.message || err.message, { variant: 'error' });
    } finally {
      setRequestingToken(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
    enqueueSnackbar('Copied to clipboard!', { variant: 'info' });
  };

  // Ingest FHIR Resource or Bundle
  const handleExecuteIngest = async () => {
    setIngesting(true);
    setIngestionResult(null);
    try {
      let parsed;
      try {
        parsed = JSON.parse(ingestionPayload);
      } catch (parseErr: any) {
        enqueueSnackbar(`JSON Syntax Error: ${parseErr.message}`, { variant: 'error' });
        setIngesting(false);
        return;
      }

      const endpoint = targetEndpoint === 'Patient' ? '/fhir/Patient' : '/fhir/Bundle';
      const res = await api.post(endpoint, parsed, {
        headers: generatedToken ? { Authorization: `Bearer ${generatedToken}` } : {}
      });

      setIngestionResult({
        success: true,
        status: res.status,
        data: res.data
      });
      enqueueSnackbar(`Successfully ingested ${targetEndpoint} into TerkHealth360!`, { variant: 'success' });
    } catch (err: any) {
      setIngestionResult({
        success: false,
        status: err.response?.status || 500,
        error: err.response?.data || err.message
      });
      enqueueSnackbar(err.response?.data?.error || err.message || 'Ingestion failed', { variant: 'error' });
    } finally {
      setIngesting(false);
    }
  };

  // Test Remote FHIR Server
  const handleTestRemote = async () => {
    setTestingRemote(true);
    setRemoteStatus(null);
    try {
      const headers: any = {};
      if (remoteAuthType === 'BEARER' && remoteBearerToken) {
        headers.Authorization = `Bearer ${remoteBearerToken}`;
      } else if (remoteAuthType === 'BASIC') {
        headers.Authorization = `Basic ${btoa(`${remoteUsername}:${remotePassword}`)}`;
      }

      // Fetch metadata from remote server
      const targetUrl = remoteFhirUrl.endsWith('/') ? `${remoteFhirUrl}metadata` : `${remoteFhirUrl}/metadata`;
      const res = await fetch(targetUrl, { headers });
      if (res.ok) {
        const json = await res.json();
        setRemoteStatus({
          tested: true,
          connected: true,
          message: `Connected to remote FHIR server (${json.software?.name || 'FHIR R4 Server'} v${json.fhirVersion || '4.0.1'})`
        });
        enqueueSnackbar('Remote FHIR Server reachable!', { variant: 'success' });
      } else {
        setRemoteStatus({
          tested: true,
          connected: false,
          message: `Remote server responded with HTTP ${res.status}: ${res.statusText}`
        });
        enqueueSnackbar(`Remote server error: HTTP ${res.status}`, { variant: 'warning' });
      }
    } catch (err: any) {
      setRemoteStatus({
        tested: true,
        connected: false,
        message: `Failed to connect: ${err.message}`
      });
      enqueueSnackbar(`Connection failed: ${err.message}`, { variant: 'error' });
    } finally {
      setTestingRemote(false);
    }
  };

  // Pull Remote Patients
  const handlePullRemotePatients = async () => {
    setPullingRemote(true);
    setPullProgress({ imported: 0, total: 25, active: true });
    try {
      // Connect to remote Patient endpoint and pull
      const targetUrl = remoteFhirUrl.endsWith('/') ? `${remoteFhirUrl}Patient?_count=25` : `${remoteFhirUrl}/Patient?_count=25`;
      const headers: any = {};
      if (remoteAuthType === 'BEARER' && remoteBearerToken) {
        headers.Authorization = `Bearer ${remoteBearerToken}`;
      } else if (remoteAuthType === 'BASIC') {
        headers.Authorization = `Basic ${btoa(`${remoteUsername}:${remotePassword}`)}`;
      }

      const res = await fetch(targetUrl, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const bundle = await res.json();
      const entries = bundle.entry || [];
      let importedCount = 0;

      for (const entry of entries) {
        if (entry.resource?.resourceType === 'Patient') {
          try {
            await api.post('/fhir/Patient', entry.resource);
            importedCount++;
            setPullProgress(prev => prev ? { ...prev, imported: importedCount } : null);
          } catch (_) {}
        }
      }

      enqueueSnackbar(`Successfully pulled and migrated ${importedCount} patient records from remote FHIR server!`, { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(`Pull failed: ${err.message}`, { variant: 'error' });
    } finally {
      setPullingRemote(false);
      setPullProgress(prev => prev ? { ...prev, active: false } : null);
    }
  };

  const getCurlSnippet = () => {
    const origin = window.location.origin;
    const token = generatedToken || '<YOUR_SMART_BEARER_TOKEN>';
    return `# 1. Send single FHIR Patient
curl -X POST "${origin}/api/fhir/Patient" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/fhir+json" \\
  -d '${JSON.stringify(samplePatientJson)}'

# 2. Or send FHIR Batch/Transaction Bundle
curl -X POST "${origin}/api/fhir/Bundle" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/fhir+json" \\
  -d '${JSON.stringify(sampleBundleJson)}'`;
  };

  const getPythonSnippet = () => {
    const origin = window.location.origin;
    const token = generatedToken || '<YOUR_SMART_BEARER_TOKEN>';
    return `import requests

url = "${origin}/api/fhir/Patient"
headers = {
    "Authorization": "Bearer ${token}",
    "Content-Type": "application/fhir+json"
}

patient_payload = ${JSON.stringify(samplePatientJson, null, 4)}

response = requests.post(url, json=patient_payload, headers=headers)
print("Status:", response.status_code)
print("Response:", response.json())`;
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid #0284c7',
        boxShadow: '0 8px 32px rgba(2, 132, 199, 0.08)',
        overflow: 'hidden'
      }}
    >
      {/* ── CARD HEADER ── */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0369a1 0%, #0c4a6e 100%)',
          p: 2.5,
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <SyncAlt sx={{ color: '#fff', fontSize: 30 }} />
          </Box>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight={800} sx={{ color: '#fff' }}>
                Existing Database & Application Migration Gateway
              </Typography>
              <Chip
                size="small"
                label="SMART on FHIR R4 & REST"
                sx={{ bgcolor: '#38bdf8', color: '#0c4a6e', fontWeight: 800, fontSize: '0.75rem' }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: '#bae6fd', mt: 0.3 }}>
              For hospitals migrating from an existing EHR, software application, or relational database (OpenMRS, MySQL, PostgreSQL, MSSQL, Oracle).
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {onSwitchToPaper && (
            <Button
              variant="outlined"
              size="small"
              onClick={onSwitchToPaper}
              sx={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.4)',
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2
              }}
            >
              Have Paper Folders Instead? Open Manual Migration
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
            startIcon={testingGateway ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
            onClick={testGatewayConnectivity}
            sx={{
              bgcolor: '#0284c7',
              color: '#fff',
              '&:hover': { bgcolor: '#0369a1' },
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2
            }}
          >
            Ping FHIR Gateway
          </Button>
        </Stack>
      </Box>

      {/* ── LIVE GATEWAY STATUS BANNER ── */}
      <Box sx={{ bgcolor: '#f0f9ff', px: 3, py: 1.5, borderBottom: '1px solid #e0f2fe' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <VerifiedUser sx={{ color: gatewayStatus.success ? '#0284c7' : '#e11d48', fontSize: 20 }} />
            <Typography variant="body2" fontWeight={700} sx={{ color: '#0369a1' }}>
              SMART Discovery Endpoint:
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: '#e0f2fe', px: 1, py: 0.3, borderRadius: 1 }}>
              {window.location.origin}/api/fhir/.well-known/smart-configuration
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            {gatewayStatus.tested && (
              <Chip
                size="small"
                icon={gatewayStatus.success ? <CheckCircle /> : <ErrorOutline />}
                label={gatewayStatus.success ? `Operational (${gatewayStatus.latencyMs}ms)` : 'Gateway Offline'}
                color={gatewayStatus.success ? 'success' : 'error'}
                sx={{ fontWeight: 700 }}
              />
            )}
            <Chip
              size="small"
              label="NDHA / NHTDAO Conformance: Level 4"
              sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}
            />
          </Stack>
        </Stack>
      </Box>

      {/* ── NAVIGATION TABS ── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafafa' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2 }}
        >
          <Tab
            icon={<Security fontSize="small" />}
            iconPosition="start"
            label="1. SMART on FHIR Protocol & Token Minting"
            sx={{ fontWeight: 700, textTransform: 'none' }}
          />
          <Tab
            icon={<DataObject fontSize="small" />}
            iconPosition="start"
            label="2. Interactive Inbound FHIR Ingestion Tester"
            sx={{ fontWeight: 700, textTransform: 'none' }}
          />
          <Tab
            icon={<CloudDownload fontSize="small" />}
            iconPosition="start"
            label="3. Remote EHR FHIR Server Pull / Crawler"
            sx={{ fontWeight: 700, textTransform: 'none' }}
          />
          <Tab
            icon={<Storage fontSize="small" />}
            iconPosition="start"
            label="4. Universal SQL Database Connector (MySQL, Postgres, MSSQL)"
            sx={{ fontWeight: 700, textTransform: 'none' }}
          />
        </Tabs>
      </Box>

      <CardContent sx={{ p: 3 }}>
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 0: SMART on FHIR Protocol & Token Minting                            */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {/* Left: Architecture & Endpoints */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight={800} color="#0c4a6e" mb={1}>
                SMART on FHIR Interoperability Endpoints
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                External hospital software, ETL scripts, and mobile apps communicate with TerkHealth360 using standard SMART on FHIR R4 OAuth 2.0 flows.
              </Typography>

              <Stack spacing={1.5}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">
                    SMART CONFIGURATION DISCOVERY
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
                    GET /api/fhir/.well-known/smart-configuration
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Contains authorization endpoint, token endpoint, supported scopes, and capabilities.
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">
                    OAUTH 2.0 TOKEN GRANT ENDPOINT
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
                    POST /api/auth/token
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Supports client_credentials for system-to-system migration and authorization_code with PKCE.
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">
                    FHIR R4 CAPABILITY STATEMENT
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
                    GET /api/fhir/metadata
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Declares conformant resources: Patient, Encounter, Observation, MedicationRequest, Invoice, Location, Consent.
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">
                    BATCH & TRANSACTION BUNDLE ENDPOINT
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
                    POST /api/fhir/Bundle
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ingests batches of patients, triage vitals, and clinic visits in a single atomic transaction.
                  </Typography>
                </Paper>
              </Stack>
            </Grid>

            {/* Right: Live Token Simulator & Code Snippets */}
            <Grid item xs={12} md={6}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  bgcolor: '#ffffff',
                  borderColor: '#bae6fd',
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.04)'
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                  <Key color="primary" />
                  <Typography variant="subtitle1" fontWeight={800} color="#0c4a6e">
                    SMART OAuth 2.0 Access Token Generator
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Mint a live Bearer token using Client Credentials to authorize migration pipelines and REST API calls.
                </Typography>

                <Stack spacing={1.5}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Client ID"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label="Client Secret"
                    type="password"
                    value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label="Requested Scopes"
                    value={requestedScope}
                    onChange={e => setRequestedScope(e.target.value)}
                  />

                  <Button
                    variant="contained"
                    fullWidth
                    disabled={requestingToken}
                    startIcon={requestingToken ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />}
                    onClick={handleGenerateToken}
                    sx={{
                      bgcolor: '#0284c7',
                      '&:hover': { bgcolor: '#0369a1' },
                      textTransform: 'none',
                      fontWeight: 700,
                      py: 1,
                      borderRadius: 2
                    }}
                  >
                    Request SMART Bearer Token
                  </Button>

                  {generatedToken && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Chip size="small" label="Token Active" color="success" sx={{ fontWeight: 700 }} />
                        <Typography variant="caption" color="text.secondary">
                          Expires in: {tokenExpiresIn || 3600} seconds
                        </Typography>
                      </Stack>
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        rows={3}
                        value={generatedToken}
                        InputProps={{
                          readOnly: true,
                          sx: { fontFamily: 'monospace', fontSize: '0.75rem', bgcolor: '#fff' }
                        }}
                      />
                      <Stack direction="row" justifyContent="flex-end" mt={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={copiedToken ? <Check /> : <ContentCopy />}
                          onClick={() => copyToClipboard(generatedToken)}
                          sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                          {copiedToken ? 'Copied' : 'Copy Token'}
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </Paper>

              {/* Code Integration Accordion */}
              <Accordion sx={{ mt: 2, borderRadius: '8px !important', '&:before': { display: 'none' }, border: '1px solid #e2e8f0' }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Terminal color="action" fontSize="small" />
                    <Typography variant="body2" fontWeight={700}>
                      View Integration Code (cURL & Python)
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>
                    cURL Command:
                  </Typography>
                  <Paper sx={{ p: 1.5, bgcolor: '#0f172a', color: '#38bdf8', borderRadius: 1.5, overflowX: 'auto', mb: 1.5 }}>
                    <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.75rem' }}>{getCurlSnippet()}</pre>
                  </Paper>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>
                    Python Migration Script:
                  </Typography>
                  <Paper sx={{ p: 1.5, bgcolor: '#0f172a', color: '#a7f3d0', borderRadius: 1.5, overflowX: 'auto' }}>
                    <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.75rem' }}>{getPythonSnippet()}</pre>
                  </Paper>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: Interactive Inbound FHIR Ingestion Tester                         */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
                <Typography variant="subtitle1" fontWeight={800} color="#0c4a6e">
                  FHIR JSON Ingestion Payload
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant={targetEndpoint === 'Patient' ? 'contained' : 'outlined'}
                    onClick={() => {
                      setTargetEndpoint('Patient');
                      setIngestionPayload(JSON.stringify(samplePatientJson, null, 2));
                    }}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Sample Patient
                  </Button>
                  <Button
                    size="small"
                    variant={targetEndpoint === 'Bundle' ? 'contained' : 'outlined'}
                    onClick={() => {
                      setTargetEndpoint('Bundle');
                      setIngestionPayload(JSON.stringify(sampleBundleJson, null, 2));
                    }}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Sample Batch Bundle
                  </Button>
                </Stack>
              </Stack>

              <TextField
                fullWidth
                multiline
                rows={16}
                value={ingestionPayload}
                onChange={e => setIngestionPayload(e.target.value)}
                placeholder="Paste valid FHIR Patient or Bundle JSON here..."
                InputProps={{
                  sx: {
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    bgcolor: '#0f172a',
                    color: '#38bdf8',
                    borderRadius: 2
                  }
                }}
              />

              <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" mt={2}>
                <Typography variant="caption" color="text.secondary">
                  Target Endpoint: <strong>POST /api/fhir/{targetEndpoint}</strong>
                </Typography>
                <Button
                  variant="contained"
                  disabled={ingesting || !ingestionPayload.trim()}
                  startIcon={ingesting ? <CircularProgress size={18} color="inherit" /> : <Send />}
                  onClick={handleExecuteIngest}
                  sx={{
                    bgcolor: '#0284c7',
                    '&:hover': { bgcolor: '#0369a1' },
                    textTransform: 'none',
                    fontWeight: 800,
                    px: 3,
                    borderRadius: 2
                  }}
                >
                  {ingesting ? 'Validating & Ingesting...' : 'Validate & Ingest into TerkHealth360'}
                </Button>
              </Stack>
            </Grid>

            {/* Ingestion Response View */}
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle1" fontWeight={800} color="#0c4a6e" mb={1.5}>
                Real-Time Ingestion Outcome
              </Typography>

              {ingestionResult ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: ingestionResult.success ? '#f0fdf4' : '#fff1f2',
                    borderColor: ingestionResult.success ? '#86efac' : '#fca5a5'
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    {ingestionResult.success ? <CheckCircle color="success" /> : <ErrorOutline color="error" />}
                    <Typography variant="subtitle2" fontWeight={800} color={ingestionResult.success ? '#15803d' : '#b91c1c'}>
                      HTTP {ingestionResult.status}: {ingestionResult.success ? 'Successfully Migrated' : 'Ingestion Failed'}
                    </Typography>
                  </Stack>

                  {ingestionResult.success && ingestionResult.data?.id && (
                    <Box sx={{ mb: 1.5, p: 1, bgcolor: '#fff', borderRadius: 1.5, border: '1px solid #dcfce7' }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Assigned FHIR ID:
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color="#15803d" sx={{ fontFamily: 'monospace' }}>
                        {ingestionResult.data.id}
                      </Typography>
                    </Box>
                  )}

                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>
                    Server Response JSON:
                  </Typography>
                  <Paper
                    sx={{
                      p: 1.5,
                      bgcolor: '#0f172a',
                      color: ingestionResult.success ? '#86efac' : '#fca5a5',
                      borderRadius: 1.5,
                      maxHeight: 280,
                      overflowY: 'auto'
                    }}
                  >
                    <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.72rem' }}>
                      {JSON.stringify(ingestionResult.data || ingestionResult.error, null, 2)}
                    </pre>
                  </Paper>
                </Paper>
              ) : (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    borderRadius: 2.5,
                    bgcolor: '#f8fafc',
                    borderStyle: 'dashed'
                  }}
                >
                  <DataObject sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    No ingestion tested yet.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Click &ldquo;Validate & Ingest&rdquo; to send payload to the live FHIR server and inspect the result here.
                  </Typography>
                </Paper>
              )}
            </Grid>
          </Grid>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: Remote Hospital EHR FHIR Server Pull / Crawler                    */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight={800} color="#0c4a6e" mb={1}>
                Connect to Remote Hospital EHR (FHIR Server)
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Pull patient registers, clinic observations, and visits from another hospital branch, OpenMRS server, or HAPI FHIR instance.
              </Typography>

              <Stack spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Remote FHIR Base URL"
                  value={remoteFhirUrl}
                  onChange={e => setRemoteFhirUrl(e.target.value)}
                  placeholder="e.g. http://192.168.1.50:8080/openmrs/ws/fhir2/R4"
                />

                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Authentication Scheme"
                  value={remoteAuthType}
                  onChange={e => setRemoteAuthType(e.target.value as any)}
                >
                  <option value="NONE">None (Open/Public Endpoint)</option>
                  <option value="BASIC">HTTP Basic Auth (Username / Password)</option>
                  <option value="BEARER">OAuth 2.0 Bearer Token</option>
                </TextField>

                {remoteAuthType === 'BASIC' && (
                  <Stack direction="row" spacing={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Remote Username"
                      value={remoteUsername}
                      onChange={e => setRemoteUsername(e.target.value)}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      type="password"
                      label="Remote Password"
                      value={remotePassword}
                      onChange={e => setRemotePassword(e.target.value)}
                    />
                  </Stack>
                )}

                {remoteAuthType === 'BEARER' && (
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    label="Remote Bearer Token"
                    value={remoteBearerToken}
                    onChange={e => setRemoteBearerToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  />
                )}

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    disabled={testingRemote}
                    onClick={handleTestRemote}
                    startIcon={testingRemote ? <CircularProgress size={16} /> : <Speed />}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Test Remote Connectivity
                  </Button>
                  <Button
                    variant="contained"
                    disabled={pullingRemote}
                    onClick={handlePullRemotePatients}
                    startIcon={pullingRemote ? <CircularProgress size={16} color="inherit" /> : <CloudDownload />}
                    sx={{
                      bgcolor: '#0284c7',
                      '&:hover': { bgcolor: '#0369a1' },
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 2
                    }}
                  >
                    Pull & Ingest Batch (25 Patients)
                  </Button>
                </Stack>

                {remoteStatus && (
                  <Alert severity={remoteStatus.connected ? 'success' : 'error'} sx={{ borderRadius: 2 }}>
                    {remoteStatus.message}
                  </Alert>
                )}

                {pullProgress && pullProgress.active && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight={700} color="#0369a1" mb={0.5}>
                      Pulling remote records: {pullProgress.imported} / {pullProgress.total}
                    </Typography>
                    <LinearProgress variant="determinate" value={(pullProgress.imported / pullProgress.total) * 100} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#f8fafc' }}>
                <Typography variant="subtitle2" fontWeight={800} color="#0c4a6e" mb={1}>
                  Recommended Migration Workflow:
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  1. <strong>Test Remote Connectivity:</strong> Verify the remote hospital&apos;s FHIR CapabilityStatement (`/metadata`) is responding.
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  2. <strong>Data Synchronization:</strong> The crawler pulls Patient resources, extracts identifiers (Hospital Number, NIN), phone numbers, and home addresses, and saves them into the local PostgreSQL database.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. <strong>De-Duplication:</strong> If a patient with the same `fhirId` or medical record number already exists, TerkHealth360 avoids duplicates and updates their clinical demographics.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: Universal SQL Database Connector (MySQL, Postgres, MSSQL)         */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 3 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              <strong>Direct Database Connection Mode:</strong> Connect straight to your hospital&apos;s existing MySQL, PostgreSQL, Microsoft SQL Server, Oracle, or SQLite database. Run SQL joins, introspect remote tables, and map fields directly to TerkHealth360 database tables.
            </Alert>
            <UniversalInteropStudio />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
