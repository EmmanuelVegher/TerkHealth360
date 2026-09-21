import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Tabs, Tab, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert,
  LinearProgress, Divider, IconButton, Stack, Avatar, Tooltip
} from '@mui/material';
import {
  Dns, Cable, Security, DeveloperMode, Refresh, Add, PlayArrow, CheckCircle,
  Warning, Cancel, FileDownload, Send, SyncProblem, CloudQueue, DeveloperBoard
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

// ─── Design Colors ──────────────────────────────────────────────────────────
const PRIMARY = '#0f172a';
const SECONDARY = '#1e293b';
const SUCCESS = '#16a34a';
const WARNING = '#ea580c';
const DANGER = '#dc2626';
const PURPLE = '#7c3aed';
const TEAL = '#0d9488';

const StatusChip = ({ label }: { label: string }) => {
  let color: 'success' | 'info' | 'warning' | 'error' | 'default' = 'default';
  const l = label?.toUpperCase();
  if (['HEALTHY', 'SUCCESS', 'VERIFIED_RESTORED', 'RESOLVED', 'COMPLETED'].includes(l)) color = 'success';
  if (['WARNING', 'MEDIUM', 'PENDING_APPROVAL', 'RUNNING'].includes(l)) color = 'warning';
  if (['CRITICAL', 'HIGH', 'FAILED', 'QUARANTINED', 'OPEN'].includes(l)) color = 'error';
  if (['HL7_V2', 'FHIR_JSON', 'JSON'].includes(l)) color = 'info';

  return <Chip label={label?.replace('_', ' ')} size="small" color={color} sx={{ fontWeight: 700, fontSize: '0.68rem' }} />;
};

function TabPanel({ children, value, index }: any) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TECHNICAL ARCHITECTURE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const TechnicalArchitecture = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // ─── Data States ──────────────────────────────────────────────────────────
  const [healthComponents, setHealthComponents] = useState<any[]>([]);
  const [integrationLogs, setIntegrationLogs] = useState<any[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});

  // ─── Interactive SVG Hover State ──────────────────────────────────────────
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);

  // ─── Integration Simulator Form State ─────────────────────────────────────
  const [payloadType, setPayloadType] = useState<'HL7_V2' | 'FHIR_JSON'>('HL7_V2');
  const [payloadContent, setPayloadContent] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);

  // ─── Fetch All Data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hlRes, lgRes, scRes, bkRes, mtRes] = await Promise.all([
        api.get('/architecture/health-monitor'),
        api.get('/architecture/integration/logs'),
        api.get('/architecture/security/alerts'),
        api.get('/architecture/dr/backups'),
        api.get('/architecture/analytics'),
      ]);
      setHealthComponents(hlRes.data.data || []);
      setIntegrationLogs(lgRes.data.data || []);
      setSecurityAlerts(scRes.data.data || []);
      setBackups(bkRes.data.data || []);
      setMetrics(mtRes.data.data || {});
    } catch {
      enqueueSnackbar('Failed to load system architecture metrics', { variant: 'error' });
    }
    setLoading(false);
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleValidatePayload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/architecture/integration/validate', {
        payloadType,
        payload: payloadContent
      });
      setValidationResult(res.data.data);
      enqueueSnackbar('Payload validation process completed.', {
        variant: res.data.data.status === 'SUCCESS' ? 'success' : 'error'
      });
      fetchData();
    } catch {
      enqueueSnackbar('Error during schema validation', { variant: 'error' });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.post('/architecture/security/resolve-alert', { alertId });
      enqueueSnackbar('Security alert marked as resolved', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to update alert', { variant: 'error' });
    }
  };

  const handleTriggerBackup = async () => {
    try {
      await api.post('/architecture/dr/trigger-backup');
      enqueueSnackbar('Backup transaction log snapshot triggered', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to trigger database backup', { variant: 'error' });
    }
  };

  const loadSamplePayload = (type: 'HL7_V2' | 'FHIR_JSON') => {
    if (type === 'HL7_V2') {
      setPayloadContent(
        `MSH|^~\\&|LIS|HOSPITAL_LAB|EHIMS|CENTRAL_RECEIVER|202606290215||ADT^A08^ADT_A08|MSG0001|P|2.5\n` +
        `PID|1||PAT-2024-001||Jane^Doe||19920815|F|||123 Main St^^Lagos^NG||+1234567890\n` +
        `PV1|1|I|Ward 3^Bed 2||||Dr. Okafor|||||||||||||`
      );
    } else {
      setPayloadContent(
        JSON.stringify({
          resourceType: "Patient",
          id: "PAT-2024-001",
          active: true,
          name: [{ use: "official", family: "Doe", given: ["Jane"] }],
          telecom: [{ system: "phone", value: "+1234567890" }]
        }, null, 2)
      );
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 29.1: System Design & Visual SVG Flowchart
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab1 = () => (
    <Box>
      <Grid container spacing={3}>
        {/* Visual SVG Blueprint */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 2, bgcolor: '#0f172a', color: '#fff', borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: TEAL }}>
              EHIMS Enterprise Component Flowchart (Interactive SVG)
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <svg viewBox="0 0 500 480" width="100%" height="auto" style={{ background: '#0f172a', borderRadius: '8px' }}>
                {/* Defs for gradients */}
                <defs>
                  <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#4c1d95" />
                  </linearGradient>
                  <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#115e59" />
                  </linearGradient>
                  <linearGradient id="slateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                </defs>

                {/* Flow lines */}
                <path d="M 250 60 L 250 110" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow)" />
                <path d="M 250 150 L 250 200" stroke="#475569" strokeWidth="2" />
                <path d="M 250 240 L 250 290" stroke="#475569" strokeWidth="2" />
                <path d="M 250 330 L 250 380" stroke="#475569" strokeWidth="2" />

                {/* 1. Presentation Layer */}
                <g transform="translate(100, 20)"
                   onMouseEnter={() => setHoveredLayer('PRESENTATION')}
                   onMouseLeave={() => setHoveredLayer(null)}
                   style={{ cursor: 'pointer' }}>
                  <rect width="300" height="40" rx="6" fill={hoveredLayer === 'PRESENTATION' ? '#7c3aed' : '#1e293b'} stroke="#475569" strokeWidth="1.5" />
                  <text x="150" y="25" fill="#fff" textAnchor="middle" fontSize="11" fontWeight="700">Presentation: Web / Mobile / Patient Portal</text>
                </g>

                {/* 2. API Gateway Layer */}
                <g transform="translate(100, 110)"
                   onMouseEnter={() => setHoveredLayer('GATEWAY')}
                   onMouseLeave={() => setHoveredLayer(null)}
                   style={{ cursor: 'pointer' }}>
                  <rect width="300" height="40" rx="6" fill={hoveredLayer === 'GATEWAY' ? '#0d9488' : '#1e293b'} stroke="#475569" strokeWidth="1.5" />
                  <text x="150" y="25" fill="#fff" textAnchor="middle" fontSize="11" fontWeight="700">API Gateway: Kong Layer & Auth Verification</text>
                </g>

                {/* 3. Microservices Layer */}
                <g transform="translate(100, 200)"
                   onMouseEnter={() => setHoveredLayer('MICROSERVICES')}
                   onMouseLeave={() => setHoveredLayer(null)}
                   style={{ cursor: 'pointer' }}>
                  <rect width="300" height="40" rx="6" fill={hoveredLayer === 'MICROSERVICES' ? '#ea580c' : '#1e293b'} stroke="#475569" strokeWidth="1.5" />
                  <text x="150" y="25" fill="#fff" textAnchor="middle" fontSize="11" fontWeight="700">Services: Clinical, Billing, Labs, Rehab</text>
                </g>

                {/* 4. Asynchronous Messaging Broker */}
                <g transform="translate(100, 290)"
                   onMouseEnter={() => setHoveredLayer('KAFKA')}
                   onMouseLeave={() => setHoveredLayer(null)}
                   style={{ cursor: 'pointer' }}>
                  <rect width="300" height="40" rx="6" fill={hoveredLayer === 'KAFKA' ? '#06b6d4' : '#1e293b'} stroke="#475569" strokeWidth="1.5" />
                  <text x="150" y="25" fill="#fff" textAnchor="middle" fontSize="11" fontWeight="700">Event Streaming Broker: Apache Kafka</text>
                </g>

                {/* 5. Database Persistence Layer */}
                <g transform="translate(100, 380)"
                   onMouseEnter={() => setHoveredLayer('DATABASE')}
                   onMouseLeave={() => setHoveredLayer(null)}
                   style={{ cursor: 'pointer' }}>
                  <rect width="300" height="40" rx="6" fill={hoveredLayer === 'DATABASE' ? '#16a34a' : '#1e293b'} stroke="#475569" strokeWidth="1.5" />
                  <text x="150" y="25" fill="#fff" textAnchor="middle" fontSize="11" fontWeight="700">Storage: PostgreSQL & Redis Caching</text>
                </g>

                {/* SVG Marker */}
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                </marker>
              </svg>
            </Box>
          </Card>
        </Grid>

        {/* Selected Component Metadata Cards */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 3, borderLeft: `5px solid ${PURPLE}` }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 800 }}>
                Layer Metadata (Click/Hover SVG component)
              </Typography>
              <Divider sx={{ my: 1 }} />

              {hoveredLayer === 'PRESENTATION' && (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: PURPLE }}>Presentation Web Portal</Typography>
                  <Typography variant="body2">Core UI stack utilizing React 18, Vite bundling, and Material-UI elements. Fully responsive client portals optimized for low bandwidth and mobile compatibility.</Typography>
                  <Chip label="Tech: React, Vite, CSS Grid" size="small" />
                </Stack>
              )}

              {hoveredLayer === 'GATEWAY' && (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: TEAL }}>API Gateway Routing</Typography>
                  <Typography variant="body2">Centrally intercepts client calls, verifies JWT authentication headers, throttles requests, and routes traffic directly to specialized backends.</Typography>
                  <Chip label="Tech: Kong, NginX, OAuth 2.1" size="small" />
                </Stack>
              )}

              {hoveredLayer === 'MICROSERVICES' && (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: WARNING }}>Business Service Layer</Typography>
                  <Typography variant="body2">Independent modular business containers built using Domain-Driven Design (DDD). Loose coupling prevents outages cascading across clinical systems.</Typography>
                  <Chip label="Tech: Node.js, NestJS, Spring Boot" size="small" />
                </Stack>
              )}

              {hoveredLayer === 'KAFKA' && (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#06b6d4' }}>Kafka Event Broker</Typography>
                  <Typography variant="body2">Enterprise message queue ensuring guaranteed delivery, audit retention trails, and asynchronous background worker processing.</Typography>
                  <Chip label="Tech: Apache Kafka, AMQP" size="small" />
                </Stack>
              )}

              {hoveredLayer === 'DATABASE' && (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: SUCCESS }}>Persistence Storage Engine</Typography>
                  <Typography variant="body2">PostgreSQL relational engine with write replicas, paired with high-performance Redis cache pools for instant retrieval of active patient queues.</Typography>
                  <Chip label="Tech: PostgreSQL (3NF), Redis Cache" size="small" />
                </Stack>
              )}

              {!hoveredLayer && (
                <Box sx={{ py: 6, textAlignment: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Hover over any layer in the left systems design diagram to inspect technical standards, parameters, and technologies.</Typography>
                </Box>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Component Live Telemetry Replicas</Typography>
              <Table size="small">
                <TableBody>
                  {healthComponents.map(c => (
                    <TableRow key={c.name}>
                      <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{c.name}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }} align="right">
                        <StatusChip label={c.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 29.2: HL7/FHIR Integration Console & Simulator
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab2 = () => (
    <Box>
      <Grid container spacing={3}>
        {/* Integration Simulator */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              HL7/FHIR Interoperability Simulator (FR-INT-001–005)
            </Typography>
            <form onSubmit={handleValidatePayload}>
              <Stack spacing={2}>
                <TextField select label="Interoperability Format Type" size="small" value={payloadType} onChange={(e) => setPayloadType(e.target.value as any)}>
                  <MenuItem value="HL7_V2">HL7 v2 Message Block (ADT/ORM/ORU)</MenuItem>
                  <MenuItem value="FHIR_JSON">HL7 FHIR JSON Resource</MenuItem>
                </TextField>

                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" size="small" onClick={() => loadSamplePayload(payloadType)}>
                    Load Sample Payload
                  </Button>
                  <Button variant="outlined" color="error" size="small" onClick={() => setPayloadContent('')}>
                    Clear Input
                  </Button>
                </Stack>

                <TextField
                  label="Raw Message Content payload"
                  multiline
                  rows={8}
                  fullWidth
                  required
                  placeholder="Paste HL7 segments or FHIR resource JSON..."
                  value={payloadContent}
                  onChange={(e) => setPayloadContent(e.target.value)}
                  inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.78rem' } }}
                />

                <Button type="submit" variant="contained" startIcon={<Send />} sx={{ bgcolor: PURPLE }}>
                  Validate Message Schema
                </Button>
              </Stack>
            </form>

            {validationResult && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 855 }}>Validation Assessment Result:</Typography>
                <Alert severity={validationResult.status === 'SUCCESS' ? 'success' : 'error'} sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>Status: {validationResult.status}</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>{validationResult.details}</Typography>
                </Alert>
              </Box>
            )}
          </Card>
        </Grid>

        {/* Real-time Exchange Logs */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Active Interoperability Logs (FR-INT-010–020)
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: TEAL }}>
                  <TableRow>
                    {['Timestamp', 'Interface Target', 'Type', 'Status', 'Latency'].map(h => (
                      <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {integrationLogs.map(log => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ fontSize: '0.72rem' }}>{log.timestamp}</TableCell>
                      <TableCell sx={{ fontWeight: 650, fontSize: '0.75rem' }}>{log.interfaceName}</TableCell>
                      <TableCell><StatusChip label={log.payloadType} /></TableCell>
                      <TableCell><StatusChip label={log.status} /></TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{log.latencyMs}ms</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 29.3: Zero Trust Security Audits
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab3 = () => (
    <Box>
      <Grid container spacing={3}>
        {/* Compliance Checklist */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Zero Trust Security Rules (FR-SEC-001–010)
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Identity Federation active. Policy compliance audited in real time against Zero Trust standards (BR-SEC-001).
            </Alert>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Data Encryption at rest (AES-256):</Typography>
                <StatusChip label="SUCCESS" />
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Mutual TLS (mTLS) Service handshakes:</Typography>
                <StatusChip label="WARNING" />
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Privileged Admin MFA Verification:</Typography>
                <StatusChip label="SUCCESS" />
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">SAST/SCA Container vulnerability scans:</Typography>
                <StatusChip label="SUCCESS" />
              </Stack>
            </Stack>
          </Card>
        </Grid>

        {/* SIEM Incident Log */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              SIEM Real-Time Cybersecurity Threats (FR-SEC-031–040)
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: PRIMARY }}>
                  <TableRow>
                    {['Timestamp', 'Security Rule Triggered', 'Source Host', 'Status', 'Action'].map(h => (
                      <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {securityAlerts.map(alert => (
                    <TableRow key={alert.id} hover>
                      <TableCell sx={{ fontSize: '0.72rem' }}>{alert.timestamp}</TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{alert.ruleName}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{alert.description}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{alert.sourceIp}</TableCell>
                      <TableCell><StatusChip label={alert.status} /></TableCell>
                      <TableCell>
                        {alert.status === 'OPEN' && (
                          <Button size="small" variant="contained" color="error" onClick={() => handleResolveAlert(alert.id)}>
                            Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 29.4: DevOps CI/CD Pipelines & DR Control
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab4 = () => (
    <Box>
      <Grid container spacing={3}>
        {/* DevOps build pipelines */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Continuous Integration & Deployments (FR-TECH-031–040)
            </Typography>
            <Stack spacing={3}>
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Pipeline Stage 1: Static Code Compilation & Lints</Typography>
                  <Typography variant="caption" sx={{ color: SUCCESS, fontWeight: 700 }}>COMPLETED</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={100} color="success" sx={{ mt: 1, height: 6, borderRadius: 3 }} />
              </Box>
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Pipeline Stage 2: SAST Security Vulnerability Scans</Typography>
                  <Typography variant="caption" sx={{ color: SUCCESS, fontWeight: 700 }}>COMPLETED</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={100} color="success" sx={{ mt: 1, height: 6, borderRadius: 3 }} />
              </Box>
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Pipeline Stage 3: Containerize Image Build & Registry Push</Typography>
                  <Typography variant="caption" sx={{ color: SUCCESS, fontWeight: 700 }}>COMPLETED</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={100} color="success" sx={{ mt: 1, height: 6, borderRadius: 3 }} />
              </Box>
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Pipeline Stage 4: Kubernetes Rollout Release Sync</Typography>
                  <Typography variant="caption" sx={{ color: SUCCESS, fontWeight: 700 }}>COMPLETED</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={100} color="success" sx={{ mt: 1, height: 6, borderRadius: 3 }} />
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Disaster Recovery Backups */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Disaster Recovery (DR) Backups
              </Typography>
              <Button variant="contained" color="warning" onClick={handleTriggerBackup}>
                Trigger Backup
              </Button>
            </Box>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Stack direction="row" justifyContent="space-between"><Typography variant="caption">RTO Threshold limit:</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>{metrics.rtoThresholdMin} minutes</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography variant="caption">RPO Threshold limit:</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>{metrics.rpoThresholdMin} minutes</Typography></Stack>
            </Stack>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: PURPLE }}>
                  <TableRow>
                    {['Timestamp', 'Type', 'Size', 'Integrity'].map(h => (
                      <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backups.map(b => (
                    <TableRow key={b.id} hover>
                      <TableCell sx={{ fontSize: '0.72rem' }}>{b.timestamp}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{b.backupType}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{b.sizeMb} MB</TableCell>
                      <TableCell><StatusChip label={b.integrityStatus} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN COMPONENT BUILD
  // ══════════════════════════════════════════════════════════════════════════
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/architecture/hl7-fhir') setActiveTab(1);
    else if (path === '/architecture/microservices') setActiveTab(0);
    else if (path === '/architecture/devops') setActiveTab(3);
    else setActiveTab(0);
  }, [location.pathname]);

  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/architecture/hl7-fhir') {
      return {
        title: 'HL7 v2 & FHIR R4 Interoperability Integration Desk',
        subtitle: 'HL7 ADT/ORM/ORU Parsers · FHIR JSON Resource Validation · Interop Bridge',
        category: 'System Architecture',
        kpis: [
          { label: 'FHIR Resources', value: '4 R4 Resources', subtitle: 'Patient/Observation/Encounter', icon: <Cable />, color: TEAL },
          { label: 'HL7 Message Throughput', value: '1,420 Msg/hr', subtitle: 'ADT/ORM/ORU Messages', icon: <Dns />, color: PRIMARY },
          { label: 'Validation Pass Rate', value: '99.8%', subtitle: 'Schema Compliance', icon: <CheckCircle />, color: SUCCESS },
          { label: 'Interop Adapters', value: '3 Active', subtitle: 'RIS/LIMS/PACS Bridge', icon: <CloudQueue />, color: PURPLE },
        ],
      };
    }

    if (path === '/architecture/microservices') {
      return {
        title: 'Microservices Topography & Distributed Services Health',
        subtitle: 'Kubernetes Pod Replicas · Node CPU/Memory Metrics · Service Mesh Gateway',
        category: 'System Architecture',
        kpis: [
          { label: 'Kubernetes Nodes', value: `${metrics.kubernetesNodesCount || 0} Nodes`, subtitle: 'Active Cluster Replicas', icon: <CloudQueue />, color: PRIMARY },
          { label: 'CPU Utilization', value: `${metrics.cpuUsagePercent || 0}%`, subtitle: 'Cluster Load', icon: <DeveloperBoard />, color: TEAL },
          { label: 'Memory Allocation', value: `${metrics.memoryUsagePercent || 0}%`, subtitle: 'JVM Heap Usage', icon: <Dns />, color: PURPLE },
          { label: 'Microservices Count', value: '14 Services', subtitle: 'Docker Containers', icon: <DeveloperMode />, color: SUCCESS },
        ],
      };
    }

    if (path === '/architecture/devops') {
      return {
        title: 'DevOps CI/CD Build Pipelines & Disaster Recovery Control',
        subtitle: 'Automated SAST Security Scans · Kubernetes Helm Rollouts · Automated DB Backups',
        category: 'System Architecture',
        kpis: [
          { label: 'CI/CD Pipeline Status', value: '100% Passing', subtitle: 'Stage 1-4 Complete', icon: <CheckCircle />, color: SUCCESS },
          { label: 'RTO Threshold', value: `${metrics.rtoThresholdMin || 15} Mins`, subtitle: 'Disaster Recovery Target', icon: <Warning />, color: WARNING },
          { label: 'RPO Threshold', value: `${metrics.rpoThresholdMin || 5} Mins`, subtitle: 'Data Loss Prevention', icon: <Security />, color: PURPLE },
          { label: 'Backup Status', value: 'Verified', subtitle: 'Snapshot Certified', icon: <Dns />, color: PRIMARY },
        ],
      };
    }

    // Default: Diagrams
    return {
      title: 'Enterprise Architecture Blueprints & Security Topology',
      subtitle: 'C4 Component Architecture · Technical Specs · Zero Trust Security Scorecards',
      category: 'System Architecture',
      kpis: [
        { label: 'Cluster Nodes', value: `${metrics.kubernetesNodesCount || 0} Nodes`, subtitle: 'Replica Sets', icon: <CloudQueue />, color: PRIMARY },
        { label: 'CPU Load', value: `${metrics.cpuUsagePercent || 0}%`, subtitle: 'Load Balanced', icon: <DeveloperBoard />, color: TEAL },
        { label: 'Memory Usage', value: `${metrics.memoryUsagePercent || 0}%`, subtitle: 'JVM Heaps', icon: <Dns />, color: PURPLE },
        { label: 'Vulnerabilities', value: `${metrics.activeVulnerabilities || 0} Vulnerabilities`, subtitle: 'SAST Scans Clean', icon: <CheckCircle />, color: SUCCESS },
      ],
    };
  };

  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
      {/* Banner */}
      <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 50%, ${TEAL} 100%)`, color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Architecture &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              ⚙️ {pageDetails.title}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.88, fontWeight: 500, display: 'block', mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh metrics logs"><IconButton onClick={fetchData} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}><Refresh /></IconButton></Tooltip>
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
            '& .Mui-selected': { fontWeight: 800, color: `${PURPLE} !important` },
            '& .MuiTabs-indicator': { bgcolor: PURPLE, height: 3, borderRadius: 2 } }}>
          <Tab icon={<DeveloperMode />} iconPosition="start" label="§29.1 System Blueprints" />
          <Tab icon={<Cable />} iconPosition="start" label="§29.2 HL7/FHIR Integrations" />
          <Tab icon={<Security />} iconPosition="start" label="§29.3 Zero Trust & Threat Audits" />
          <Tab icon={<CloudQueue />} iconPosition="start" label="§29.4 DevOps Pipelines & DR" />
        </Tabs>

        <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>
          {activeTab === 0 && renderTab1()}
          {activeTab === 1 && renderTab2()}
          {activeTab === 2 && renderTab3()}
          {activeTab === 3 && renderTab4()}
        </Card>
      </Box>
    </Box>
  );
};

export default TechnicalArchitecture;
