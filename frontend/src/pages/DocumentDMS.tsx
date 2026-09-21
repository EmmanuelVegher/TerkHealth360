import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Tabs, Tab, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert,
  LinearProgress, Divider, IconButton, Stack, Avatar, Tooltip,
  InputAdornment, CardHeader, Switch, FormControlLabel
} from '@mui/material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip
} from 'recharts';
import {
  FolderZip, Description, AutoStories, Gavel, Add, Search, Refresh,
  CheckCircle, Warning, Cancel, Send, FileDownload, Assessment, ArrowForward,
  Verified, Lock, History, Storage, Build, LibraryBooks, CloudUpload
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

// ─── Design Tokens & Theme Formatting ────────────────────────────────────────
const PRIMARY = '#0f172a';
const SECONDARY = '#475569';
const SUCCESS = '#16a34a';
const WARNING = '#ea580c';
const DANGER = '#dc2626';
const PURPLE = '#7c3aed';
const TEAL = '#0d9488';
const GOLD = '#ca8a04';

const COLORS = ['#7c3aed', '#0d9488', '#ea580c', '#16a34a', '#0f172a', '#475569'];

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
  if (['PUBLISHED', 'APPROVED', 'ACTIVE', 'VERIFIED'].includes(l)) color = 'success';
  if (['PENDING_APPROVAL', 'NEW', 'UNDER_REVIEW', 'DRAFT'].includes(l)) color = 'warning';
  if (['EXPIRED', 'LEGAL_HOLD', 'CONFIDENTIAL', 'RESTRICTED'].includes(l)) color = 'error';
  if (['POLICY_SOP', 'CONTRACTS', 'PATIENT_CONSENT', 'INTERNAL'].includes(l)) color = 'info';

  return <Chip label={label?.replace('_', ' ')} size="small" color={color} sx={{ fontWeight: 700, fontSize: '0.68rem' }} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DOCUMENT DMS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const DocumentDMS = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // ─── Data States ──────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});

  // ─── Dialog States ────────────────────────────────────────────────────────
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [wfDialogOpen, setWfDialogOpen] = useState(false);

  // ─── Sub-Tab Index States ──────────────────────────────────────────────────
  const [subTab0, setSubTab0] = useState(0);
  const [subTab1, setSubTab1] = useState(0);
  const [subTab2, setSubTab2] = useState(0);
  const [subTab3, setSubTab3] = useState(0);

  // ─── Search & Filters ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Fetch All Data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [doRes, foRes, wfRes, siRes, anRes] = await Promise.all([
        api.get('/dms/documents'),
        api.get('/dms/forms'),
        api.get('/dms/workflows'),
        api.get('/dms/signatures'),
        api.get('/dms/analytics'),
      ]);
      setDocuments(doRes.data.data || []);
      setForms(foRes.data.data || []);
      setWorkflows(wfRes.data.data || []);
      setSignatures(siRes.data.data || []);
      setAnalytics(anRes.data.data || {});
    } catch {
      enqueueSnackbar('Failed to load document DMS records', { variant: 'error' });
    }
    setLoading(false);
  }, [enqueueSnackbar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Form Submission Handlers ──────────────────────────────────────────────
  const handleUploadDoc = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/dms/documents', {
        name: fd.get('name'),
        category: fd.get('category'),
        mimeType: fd.get('mimeType'),
        department: fd.get('department'),
        creator: fd.get('creator'),
        retentionPeriodYears: Number(fd.get('retentionPeriodYears')),
        classification: fd.get('classification'),
        ocrText: fd.get('ocrText'),
      });
      enqueueSnackbar('Document captured & OCR indexed successfully', { variant: 'success' });
      setDocDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to upload document', { variant: 'error' });
    }
  };

  const handleAddForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/dms/forms', {
        title: fd.get('title'),
        department: fd.get('department'),
        creator: fd.get('creator'),
        inputsCount: Number(fd.get('inputsCount')),
      });
      enqueueSnackbar('Low-code digital form published successfully', { variant: 'success' });
      setFormDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to publish digital form', { variant: 'error' });
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/dms/workflows', {
        docId: fd.get('docId'),
        stage: fd.get('stage'),
        assignee: fd.get('assignee'),
        comments: fd.get('comments'),
      });
      enqueueSnackbar('Document routed through approval workflow', { variant: 'success' });
      setWfDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to route document', { variant: 'error' });
    }
  };

  const handleApproveWorkflow = async (id: string) => {
    try {
      await api.patch(`/dms/workflows/${id}/approve`, { comments: 'Approved under electronic audit signature.' });
      enqueueSnackbar('Document Approved & Digitally Signed', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to approve workflow routing', { variant: 'error' });
    }
  };

  const handleToggleLegalHold = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/dms/documents/${id}/hold`, { isLegalHold: !currentStatus });
      enqueueSnackbar(`Document Legal Hold: ${!currentStatus ? 'ENABLED (Freezing deletion)' : 'DISABLED'}`, { variant: 'warning' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to toggle legal hold', { variant: 'error' });
    }
  };

  const filteredDocs = documents.filter(d =>
    !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.ocrText && d.ocrText.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 22.1: Document Capture & Forms
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab1 = () => (
    <Box>
      <Tabs value={subTab0} onChange={(_, v) => setSubTab0(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['Enterprise Repository', 'Low-Code Digital Forms'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab0 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 22.1.1 Repository ── */}
      <TabPanel value={subTab0} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Enterprise Document Archive (FR-DMS-001–010)</Typography>
          <Stack direction="row" spacing={1}>
            <TextField size="small" placeholder="Full-text search OCR..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
            <Button variant="contained" startIcon={<CloudUpload />} onClick={() => setDocDialogOpen(true)} sx={{ bgcolor: PURPLE }}>Capture Document</Button>
          </Stack>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY }}>
              <TableRow>
                {['Doc ID', 'Document Description Name', 'Category Type', 'File Format', 'Department', 'Uploader / Creator', 'Version', 'Uploaded Date', 'Classification', 'Status'].map(h => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocs.map(doc => (
                <TableRow key={doc.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: PURPLE }}>{doc.id}</TableCell>
                  <TableCell sx={{ fontWeight: 650 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Description fontSize="small" color="primary" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{doc.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell><StatusChip label={doc.category} /></TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{doc.mimeType}</TableCell>
                  <TableCell>{doc.department}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{doc.creator}</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>v{doc.version}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{doc.createdDate}</TableCell>
                  <TableCell><StatusChip label={doc.classification} /></TableCell>
                  <TableCell><StatusChip label={doc.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 22.1.2 Digital Forms ── */}
      <TabPanel value={subTab0} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Low-Code Digital Form Templates (FR-DMS-031–040)</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setFormDialogOpen(true)} sx={{ bgcolor: TEAL }}>Publish Digital Form</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: TEAL }}>
              <TableRow>{['Form Template ID', 'Form Title / Description', 'Department', 'Steward Owner', 'Version', 'Configured Fields Count', 'Submissions logged', 'Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {forms.map(fm => (
                <TableRow key={fm.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{fm.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{fm.title}</TableCell>
                  <TableCell>{fm.department}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{fm.creator}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>v{fm.version}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>{fm.inputsCount}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: SUCCESS }}>{fm.submissionsCount} submissions</TableCell>
                  <TableCell><StatusChip label={fm.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 22.2: Workflows & Signatures
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab2 = () => (
    <Box>
      <Tabs value={subTab1} onChange={(_, v) => setSubTab1(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['Lifecycle Review Workflows', 'Electronic audit Signatures'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab1 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 22.2.1 Workflows ── */}
      <TabPanel value={subTab1} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Document Approval Routings (FR-DWF-001–010)</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setWfDialogOpen(true)} sx={{ bgcolor: PURPLE }}>Route Document</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PURPLE }}>
              <TableRow>{['Workflow ID', 'Document Target Name', 'Approval Stage', 'Assigned Approver', 'Initiated Date', 'Approver Comments', 'Status', 'Action'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {workflows.map(wf => (
                <TableRow key={wf.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{wf.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{wf.docName}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}><Chip label={wf.stage} size="small" variant="outlined" /></TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{wf.assignee}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{wf.dateInitiated}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{wf.comments}</TableCell>
                  <TableCell><StatusChip label={wf.status} /></TableCell>
                  <TableCell>
                    {wf.status === 'PENDING_APPROVAL' && (
                      <Button size="small" variant="contained" color="success" onClick={() => handleApproveWorkflow(wf.id)}>Sign & Approve</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 22.2.2 Electronic Signatures ── */}
      <TabPanel value={subTab1} index={1}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Electronic Signatures Audit Logs (FR-DWF-025–030)</Typography>
          <Typography variant="caption" color="text.secondary">Cryptographically verified electronic signatures mapped to major document revisions.</Typography>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: SUCCESS }}>
              <TableRow>{['Signature ID', 'Signer Full Name', 'Signer Role Position', 'Signing Timestamp', 'Audit Verify Hash'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {signatures.map(sig => (
                <TableRow key={sig.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{sig.id}</TableCell>
                  <TableCell sx={{ fontWeight: 650 }}>{sig.signer}</TableCell>
                  <TableCell><Chip label={sig.role} size="small" variant="outlined" color="primary" sx={{ fontSize: '0.7rem' }} /></TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{sig.timestamp}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: SUCCESS, fontWeight: 700 }}>{sig.hash}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 22.3: Retention, Security & Legal Hold
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab3 = () => (
    <Box>
      <Tabs value={subTab2} onChange={(_, v) => setSubTab2(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['Retention lifecycle schedules', 'Legal Holds (Litigation Freeze)'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab2 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 22.3.1 Retention ── */}
      <TabPanel value={subTab2} index={0}>
        <Alert severity="info" icon={<Storage />} sx={{ mb: 3 }}>
          FR-RLG-001–010 · Enforces strict NDPA audit schedules. Documents are kept for configured retention durations before archival triggers.
        </Alert>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: GOLD }}>
              <TableRow>{['Doc ID', 'Document Description Name', 'Classification', 'Created Date', 'Retention Period', 'Legal hold status', 'Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {documents.map(doc => (
                <TableRow key={doc.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{doc.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{doc.name}</TableCell>
                  <TableCell><StatusChip label={doc.classification} /></TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{doc.createdDate}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{doc.retentionPeriodYears} Years</TableCell>
                  <TableCell>{doc.isLegalHold ? '⚠️ FREEZE (Active Hold)' : 'No Hold'}</TableCell>
                  <TableCell><StatusChip label={doc.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 22.3.2 Legal Holds ── */}
      <TabPanel value={subTab2} index={1}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Legal Hold Controls (Litigation Freeze) (FR-RLG-011–014)</Typography>
          <Typography variant="caption" color="text.secondary">Toggling Legal Hold freezes a document or record. Once locked, it cannot be modified or destroyed by retention routines.</Typography>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: DANGER }}>
              <TableRow>{['Doc ID', 'Governed Document Name', 'Audit Classification', 'Retention Expiry', 'Legal Hold Toggle Switch'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {documents.map(doc => (
                <TableRow key={doc.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{doc.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{doc.name}</TableCell>
                  <TableCell><StatusChip label={doc.classification} /></TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{new Date(doc.createdDate).getFullYear() + doc.retentionPeriodYears}-12-31</TableCell>
                  <TableCell>
                    <FormControlLabel control={
                      <Switch checked={doc.isLegalHold} color="error" onChange={() => handleToggleLegalHold(doc.id, doc.isLegalHold)} />
                    } label={doc.isLegalHold ? 'Hold Active (Locked)' : 'Apply Legal Hold'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 22.4: Knowledge BI
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab4 = () => (
    <Box>
      <Tabs value={subTab3} onChange={(_, v) => setSubTab3(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
        {['Institutional Knowledge BI', 'Metadata Audit logs'].map((t, i) => (
          <Tab key={t} label={t} sx={{ fontWeight: subTab3 === i ? 800 : 500, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* ── 22.4.1 BI Dashboard ── */}
      <TabPanel value={subTab3} index={0}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}><KPICard title="Total Documents" value={analytics.totalCount || 0} sub="Captured repository files" icon={<LibraryBooks />} color={PRIMARY} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Legal Holds Active" value={analytics.holdCount || 0} sub="Frozen litigation records" icon={<Gavel />} color={DANGER} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Pending Approvals" value={analytics.activeWorkflows || 0} sub="Active document routings" icon={<History />} color={WARNING} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Published Digital Forms" value={analytics.publishedForms || 0} sub="Low-code template forms" icon={<Verified />} color={SUCCESS} /></Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: PRIMARY }}>Governed Documents Distribution (BI Classification)</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={analytics.distributionByCategory || []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                    {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, p: 2, borderLeft: `4px solid ${SUCCESS}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: SUCCESS, mb: 1 }}>OCR Indexing & Search Audit</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Full-text search indexing is automatically parsed via local OCR engine servers upon document check-in.
              </Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Metadata completeness index rating:</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS }}>100% complete</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Average OCR processing speed:</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>1.2 Seconds / page</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">NDPA Audit logs integrity status:</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS }}>SECURED</Typography></Stack>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── 22.4.2 Metadata Logs ── */}
      <TabPanel value={subTab3} index={1}>
        <Alert severity="success" icon={<Verified />} sx={{ mb: 2 }}>
          DMS-GOV-010 · Metadata completeness audits confirmed zero orphaned document headers. NDPA controls mapped successfully.
        </Alert>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN COMPONENT BUILD
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
      {/* Banner */}
      <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 50%, ${TEAL} 100%)`, color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>📂 Enterprise Document DMS & Governance</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 500 }}>Module 22 · Document capture & OCR · Low-code digital forms · Version check-in controls · Signatures · Legal Hold</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh DMS logs"><IconButton onClick={fetchData} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}><Refresh /></IconButton></Tooltip>
            <Button variant="outlined" startIcon={<FileDownload />} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }} onClick={() => enqueueSnackbar('Exporting document catalog registers', { variant: 'info' })}>Export Catalog</Button>
          </Stack>
        </Stack>
      </Box>

      {/* KPIStrip */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}><KPICard title="Total Documents" value={documents.length} sub="Captured and categorized" icon={<LibraryBooks />} color={PRIMARY} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Digital Templates" value={forms.length} sub="Published forms" icon={<Verified />} color={TEAL} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Legal Holds" value={`${documents.filter(d=>d.isLegalHold).length} active`} sub="Frozen records" icon={<Gavel />} color={DANGER} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Workflow Routings" value={`${workflows.filter(w=>w.status==='PENDING_APPROVAL').length} pending`} sub="Awaiting signature" icon={<History />} color={WARNING} /></Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 3, bgcolor: '#fff', borderRadius: 3, px: 1, py: 0.5, boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48, fontSize: '0.88rem' },
            '& .Mui-selected': { fontWeight: 800, color: `${PURPLE} !important` },
            '& .MuiTabs-indicator': { bgcolor: PURPLE, height: 3, borderRadius: 2 } }}>
          <Tab icon={<CloudUpload />} iconPosition="start" label="§22.1 Capture & Forms" />
          <Tab icon={<Verified />} iconPosition="start" label="§22.2 Workflows & Signatures" />
          <Tab icon={<Lock />} iconPosition="start" label="§22.3 Retention & Legal Holds" />
          <Tab icon={<AutoStories />} iconPosition="start" label="§22.4 Institutional Knowledge BI" />
        </Tabs>

        <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>
          {activeTab === 0 && renderTab1()}
          {activeTab === 1 && renderTab2()}
          {activeTab === 2 && renderTab3()}
          {activeTab === 3 && renderTab4()}
        </Card>
      </Box>

      {/* Modals */}

      {/* Upload Doc Dialog */}
      <Dialog open={docDialogOpen} onClose={() => setDocDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleUploadDoc}>
          <DialogTitle sx={{ fontWeight: 800 }}>Capture & Index Document (FR-DMS-001–005)</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}><TextField label="Document Name" name="name" size="small" fullWidth required placeholder="e.g. Clinical guidelines for COVID screening" /></Grid>
              <Grid item xs={6}><TextField select label="Document Category" name="category" size="small" fullWidth defaultValue="POLICY_SOP"><MenuItem value="POLICY_SOP">Policy & Standard SOPs</MenuItem><MenuItem value="CONTRACTS">Contracts & Vendor Agreements</MenuItem><MenuItem value="PATIENT_CONSENT">Patient Disclosures & Consent Forms</MenuItem></TextField></Grid>
              <Grid item xs={6}><TextField label="File Mimetype Format" name="mimeType" size="small" fullWidth defaultValue="application/pdf" required /></Grid>
              <Grid item xs={6}><TextField select label="Department Steward" name="department" size="small" fullWidth defaultValue="OPD">{['OPD', 'IPD', 'ICU', 'Pharmacy', 'Laboratory', 'Radiology', 'Administration', 'Emergency', 'Maternity'].map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField></Grid>
              <Grid item xs={6}><TextField label="Uploader / Author Name" name="creator" size="small" fullWidth defaultValue="Dr. Fatima Aliyu" required /></Grid>
              <Grid item xs={6}><TextField label="Retention Period (Years)" name="retentionPeriodYears" type="number" size="small" fullWidth defaultValue="7" required /></Grid>
              <Grid item xs={6}><TextField select label="Security Classification" name="classification" size="small" fullWidth defaultValue="INTERNAL"><MenuItem value="PUBLIC">Public</MenuItem><MenuItem value="INTERNAL">Internal</MenuItem><MenuItem value="CONFIDENTIAL">Confidential</MenuItem><MenuItem value="RESTRICTED">Restricted</MenuItem></TextField></Grid>
              <Grid item xs={12}><TextField label="Simulate Extracted OCR Text context" name="ocrText" size="small" fullWidth multiline rows={3} required defaultValue="Enter searchable text blocks to simulate OCR engine parsing..." /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions><Button onClick={() => setDocDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Upload & OCR Index</Button></DialogActions>
        </form>
      </Dialog>

      {/* Form Template Dialog */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddForm}>
          <DialogTitle sx={{ fontWeight: 800 }}>Publish Low-Code Digital Form</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Digital Form Title" name="title" size="small" fullWidth required placeholder="e.g. Needle-Stick Incident Audit Sheet" />
              <TextField select label="Target Department" name="department" size="small" fullWidth defaultValue="Nursing">{['OPD', 'IPD', 'ICU', 'Pharmacy', 'Laboratory', 'Radiology', 'Administration', 'Emergency', 'Maternity', 'Nursing'].map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField>
              <TextField label="Steward QA Owner" name="creator" size="small" fullWidth required defaultValue="Quality Assurance Officer" />
              <TextField label="Configured Inputs Count" name="inputsCount" type="number" size="small" fullWidth required defaultValue="10" />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setFormDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Publish Form</Button></DialogActions>
        </form>
      </Dialog>

      {/* Workflow Route Dialog */}
      <Dialog open={wfDialogOpen} onClose={() => setWfDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateWorkflow}>
          <DialogTitle sx={{ fontWeight: 800 }}>Route Document for Approvals</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField select label="Select Target Document" name="docId" size="small" fullWidth required defaultValue="">{documents.map(d => <MenuItem key={d.id} value={d.id}>{d.name} ({d.id})</MenuItem>)}</TextField>
              <TextField select label="Routing Stage" name="stage" size="small" fullWidth defaultValue="MEDICAL_DIRECTOR_REVIEW"><MenuItem value="MEDICAL_DIRECTOR_REVIEW">Medical Director Clinical Review</MenuItem><MenuItem value="LEGAL_REVIEW">General Counsel Legal check</MenuItem><MenuItem value="QA_OFFICER_REVIEW">Quality Assurance validation</MenuItem></TextField>
              <TextField label="Assignee Approver" name="assignee" size="small" fullWidth required defaultValue="Medical Director" />
              <TextField label="Audit comments / Instructions" name="comments" size="small" fullWidth multiline rows={2} required />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setWfDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Route Document</Button></DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default DocumentDMS;
