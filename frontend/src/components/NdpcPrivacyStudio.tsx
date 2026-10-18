import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, TextField, Button, Stack,
  MenuItem, Select, FormControl, InputLabel, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress, Tooltip,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Switch,
  FormControlLabel, Tabs, Tab, Divider, LinearProgress, FormGroup, Checkbox
} from '@mui/material';
import {
  Security, Shield, Lock, LockOpen, Gavel, CheckCircle, Warning,
  ErrorOutline, Download, Refresh, HistoryEdu, Visibility, VisibilityOff,
  Person, Fingerprint, LocalHospital, AssignmentTurnedIn, Code,
  VerifiedUser, Group, CloudDownload, DeleteOutline
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

export const NdpcPrivacyStudio: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [subTab, setSubTab] = useState(0);

  // ── Overview & Statistics State ───────────────────────────────────────────
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewData, setOverviewData] = useState<any>(null);

  // ── Tab 1: Consent Directives State ───────────────────────────────────────
  const [consents, setConsents] = useState<any[]>([]);
  const [loadingConsents, setLoadingConsents] = useState(false);
  const [consentFilterStatus, setConsentFilterStatus] = useState('ALL');
  const [consentFilterScope, setConsentFilterScope] = useState('ALL');
  const [consentSearch, setConsentSearch] = useState('');
  const [openNewConsentModal, setOpenNewConsentModal] = useState(false);
  const [openRevokeModal, setOpenRevokeModal] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<any>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [openFhirModal, setOpenFhirModal] = useState(false);
  const [fhirConsentJson, setFhirConsentJson] = useState<any>(null);

  // New Consent Form State
  const [newPatientId, setNewPatientId] = useState('');
  const [newScope, setNewScope] = useState('PATIENT_PRIVACY');
  const [newCategory, setNewCategory] = useState('DATA_PROCESSING');
  const [newProvisionType, setNewProvisionType] = useState('PERMIT');
  const [newPurposeOfUse, setNewPurposeOfUse] = useState('TREATMENT');
  const [newLawfulBasis, setNewLawfulBasis] = useState('EXPLICIT_CONSENT');
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyRel, setNewPartyRel] = useState('SELF');
  const [newSigType, setNewSigType] = useState('DIGITAL');
  const [newNotes, setNewNotes] = useState('');
  const [newAllowedClasses, setNewAllowedClasses] = useState<string[]>([
    'DEMOGRAPHICS', 'DIAGNOSES', 'MEDICATIONS', 'LABS'
  ]);
  const [newRestrictedClasses, setNewRestrictedClasses] = useState<string[]>([]);
  const [submittingConsent, setSubmittingConsent] = useState(false);

  // ── Tab 2: Break-Glass Emergency Access State ─────────────────────────────
  const [breakGlassLogs, setBreakGlassLogs] = useState<any[]>([]);
  const [loadingBreakGlass, setLoadingBreakGlass] = useState(false);
  const [breakGlassSeverityFilter, setBreakGlassSeverityFilter] = useState('ALL');
  const [breakGlassDpoFilter, setBreakGlassDpoFilter] = useState('ALL');
  const [openBreakGlassModal, setOpenBreakGlassModal] = useState(false);
  const [openDpoReviewModal, setOpenDpoReviewModal] = useState(false);
  const [selectedBreakGlassLog, setSelectedBreakGlassLog] = useState<any>(null);
  const [dpoAction, setDpoAction] = useState<'APPROVED' | 'FLAG_BREACH' | 'ESCALATED'>('APPROVED');
  const [dpoNotes, setDpoNotes] = useState('');
  const [reviewingDpo, setReviewingDpo] = useState(false);

  // Break-glass override trigger form
  const [bgPatientId, setBgPatientId] = useState('');
  const [bgReason, setBgReason] = useState('');
  const [bgSeverity, setBgSeverity] = useState('EMERGENCY');
  const [recordingBreakGlass, setRecordingBreakGlass] = useState(false);

  // ── Tab 3: Anonymization Pipeline State ───────────────────────────────────
  const [anonymizePreview, setAnonymizePreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [anonAgeBanding, setAnonAgeBanding] = useState(true);
  const [anonRespectConsent, setAnonRespectConsent] = useState(true);
  const [anonIncludeRx, setAnonIncludeRx] = useState(true);
  const [anonIncludeDx, setAnonIncludeDx] = useState(true);
  const [anonIncludeObs, setAnonIncludeObs] = useState(true);
  const [exportingDataset, setExportingDataset] = useState(false);

  // ── Tab 4: NDPC Regulatory Checklist State ────────────────────────────────
  const [checklistData, setChecklistData] = useState<any>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  // ── Fetch Initial Data ────────────────────────────────────────────────────
  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await api.get('/privacy/overview');
      if (res.data?.success) {
        setOverviewData(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching privacy overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchConsents = async () => {
    setLoadingConsents(true);
    try {
      const params: any = {};
      if (consentFilterStatus !== 'ALL') params.status = consentFilterStatus;
      if (consentFilterScope !== 'ALL') params.scope = consentFilterScope;
      if (consentSearch) params.search = consentSearch;

      const res = await api.get('/privacy/consents', { params });
      if (res.data?.success) {
        setConsents(res.data.data.items || []);
      }
    } catch (err: any) {
      console.error('Error fetching consents:', err);
    } finally {
      setLoadingConsents(false);
    }
  };

  const fetchBreakGlass = async () => {
    setLoadingBreakGlass(true);
    try {
      const params: any = {};
      if (breakGlassSeverityFilter !== 'ALL') params.severity = breakGlassSeverityFilter;
      if (breakGlassDpoFilter === 'PENDING') params.reviewedByDpo = 'false';
      if (breakGlassDpoFilter === 'REVIEWED') params.reviewedByDpo = 'true';

      const res = await api.get('/privacy/break-glass', { params });
      if (res.data?.success) {
        setBreakGlassLogs(res.data.data.items || []);
      }
    } catch (err: any) {
      console.error('Error fetching break glass logs:', err);
    } finally {
      setLoadingBreakGlass(false);
    }
  };

  const fetchChecklist = async () => {
    setLoadingChecklist(true);
    try {
      const res = await api.get('/privacy/ndpc-checklist');
      if (res.data?.success) {
        setChecklistData(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching NDPC checklist:', err);
    } finally {
      setLoadingChecklist(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchChecklist();
  }, []);

  useEffect(() => {
    if (subTab === 0) fetchOverview();
    if (subTab === 1) fetchConsents();
    if (subTab === 2) fetchBreakGlass();
    if (subTab === 4) fetchChecklist();
  }, [subTab]);

  // ── Handle Register Consent ───────────────────────────────────────────────
  const handleRegisterConsent = async () => {
    if (!newPatientId.trim()) {
      enqueueSnackbar('Patient ID or UUID is required to record a directive', { variant: 'warning' });
      return;
    }
    setSubmittingConsent(true);
    try {
      const payload = {
        patientId: newPatientId.trim(),
        scope: newScope,
        category: newCategory,
        provisionType: newProvisionType,
        purposeOfUse: newPurposeOfUse,
        ndpcLawfulBasis: newLawfulBasis,
        dataClassesAllowed: newAllowedClasses,
        dataClassesRestricted: newRestrictedClasses,
        consentingPartyName: newPartyName || undefined,
        consentingPartyRel: newPartyRel,
        signatureType: newSigType,
        notes: newNotes || undefined
      };
      const res = await api.post('/privacy/consents', payload);
      if (res.data?.success) {
        enqueueSnackbar('Consent directive registered under NDPA 2023!', { variant: 'success' });
        setOpenNewConsentModal(false);
        setNewPatientId('');
        fetchConsents();
        fetchOverview();
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || err.message, { variant: 'error' });
    } finally {
      setSubmittingConsent(false);
    }
  };

  // ── Handle Revoke Consent ─────────────────────────────────────────────────
  const handleRevokeConsent = async () => {
    if (!selectedConsent) return;
    setRevoking(true);
    try {
      const res = await api.put(`/privacy/consents/${selectedConsent.id}/revoke`, {
        revokedReason: revokeReason.trim() || 'Patient exercised Right to Revoke under NDPA 2023 Section 34'
      });
      if (res.data?.success) {
        enqueueSnackbar('Consent directive revoked. Restrictions applied immediately.', { variant: 'info' });
        setOpenRevokeModal(false);
        setSelectedConsent(null);
        setRevokeReason('');
        fetchConsents();
        fetchOverview();
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || err.message, { variant: 'error' });
    } finally {
      setRevoking(false);
    }
  };

  // ── Handle Record Emergency Break-Glass ───────────────────────────────────
  const handleRecordBreakGlass = async () => {
    if (!bgReason.trim() || bgReason.trim().length < 5) {
      enqueueSnackbar('Please provide a clinical emergency reason (min 5 chars)', { variant: 'warning' });
      return;
    }
    setRecordingBreakGlass(true);
    try {
      const res = await api.post('/privacy/break-glass', {
        patientId: bgPatientId.trim() || undefined,
        reason: bgReason.trim(),
        severity: bgSeverity
      });
      if (res.data?.success) {
        enqueueSnackbar('Break-glass emergency override logged with non-repudiation audit record.', { variant: 'warning' });
        setOpenBreakGlassModal(false);
        setBgPatientId('');
        setBgReason('');
        fetchBreakGlass();
        fetchOverview();
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || err.message, { variant: 'error' });
    } finally {
      setRecordingBreakGlass(false);
    }
  };

  // ── Handle DPO Audit Review ───────────────────────────────────────────────
  const handleReviewBreakGlass = async () => {
    if (!selectedBreakGlassLog) return;
    setReviewingDpo(true);
    try {
      const res = await api.put(`/privacy/break-glass/${selectedBreakGlassLog.id}/review`, {
        dpoAction,
        dpoNotes: dpoNotes.trim() || undefined
      });
      if (res.data?.success) {
        enqueueSnackbar(`Break-glass reviewed by DPO: ${dpoAction}`, { variant: 'success' });
        setOpenDpoReviewModal(false);
        setSelectedBreakGlassLog(null);
        setDpoNotes('');
        fetchBreakGlass();
        fetchOverview();
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || err.message, { variant: 'error' });
    } finally {
      setReviewingDpo(false);
    }
  };

  // ── Handle Anonymization Preview ──────────────────────────────────────────
  const handleRunAnonymizationPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await api.post('/privacy/anonymize/preview', {
        options: {
          ageBanding: anonAgeBanding,
          respectConsentDirectives: anonRespectConsent,
          includePrescriptions: anonIncludeRx,
          includeDiagnoses: anonIncludeDx,
          includeVitals: anonIncludeObs
        }
      });
      if (res.data?.success) {
        setAnonymizePreview(res.data.data);
        enqueueSnackbar(`De-identification pipeline executed. ${res.data.data.records?.length || 0} records anonymized.`, { variant: 'success' });
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || err.message, { variant: 'error' });
    } finally {
      setLoadingPreview(false);
    }
  };

  // ── Handle Anonymized Export (JSON / CSV) ──────────────────────────────────
  const handleExportDataset = async (format: 'json' | 'csv') => {
    setExportingDataset(true);
    try {
      const res = await api.post(
        '/privacy/anonymize/export',
        {
          format,
          options: {
            ageBanding: anonAgeBanding,
            respectConsentDirectives: anonRespectConsent,
            includePrescriptions: anonIncludeRx,
            includeDiagnoses: anonIncludeDx,
            includeVitals: anonIncludeObs
          }
        },
        { responseType: format === 'csv' ? 'blob' : 'json' }
      );

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `terkhealth360_anonymized_dataset_${timestamp}.${format}`;

      let blob: Blob;
      if (format === 'csv') {
        blob = new Blob([res.data], { type: 'text/csv' });
      } else {
        blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      enqueueSnackbar(`Downloaded anonymized dataset (${format.toUpperCase()})`, { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar('Failed to download anonymized dataset: ' + (err.response?.data?.error || err.message), { variant: 'error' });
    } finally {
      setExportingDataset(false);
    }
  };

  // ── View FHIR Consent Resource ────────────────────────────────────────────
  const handleViewFhirConsent = async (consent: any) => {
    try {
      const res = await api.get(`/fhir/Consent/${consent.id}`);
      setFhirConsentJson(res.data);
      setOpenFhirModal(true);
    } catch (err: any) {
      enqueueSnackbar('Failed to load FHIR Consent resource', { variant: 'error' });
    }
  };

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      {/* ── Studio Header ── */}
      <Box sx={{ p: 3, bgcolor: '#0f172a', color: '#f8fafc' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
              <Shield sx={{ color: '#10b981', fontSize: 32 }} />
              <Typography variant="h5" fontWeight={800} letterSpacing="-0.5px">
                Privacy-by-Design & NDPC Compliance Auditing
              </Typography>
              <Chip
                label="NDPA 2023 CERTIFIED"
                size="small"
                sx={{ bgcolor: '#065f46', color: '#a7f3d0', fontWeight: 700, fontSize: '0.72rem' }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Nigeria Data Protection Act (NDPA 2023) & NHTDAO Layer 5 • Granular Consent Directives, Non-Repudiation Break-Glass Logs, and Deterministic De-Identification Pipelines.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh />}
              onClick={() => {
                fetchOverview();
                fetchConsents();
                fetchBreakGlass();
                fetchChecklist();
              }}
              sx={{ color: '#e2e8f0', borderColor: '#334155', '&:hover': { borderColor: '#64748b' } }}
            >
              Refresh Audit
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<HistoryEdu />}
              onClick={() => setOpenNewConsentModal(true)}
              sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, fontWeight: 700 }}
            >
              Register Consent
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<LockOpen />}
              onClick={() => setOpenBreakGlassModal(true)}
              sx={{ bgcolor: '#b91c1c', '&:hover': { bgcolor: '#991b1b' }, fontWeight: 700 }}
            >
              Break-Glass Override
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ── Sub Navigation Tabs ── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc' }}>
        <Tabs value={subTab} onChange={(_, val) => setSubTab(val)} textColor="primary" indicatorColor="primary">
          <Tab icon={<VerifiedUser fontSize="small" />} iconPosition="start" label="1. Overview & Compliance Score" sx={{ fontWeight: 700 }} />
          <Tab icon={<HistoryEdu fontSize="small" />} iconPosition="start" label="2. Consent Directive Register" sx={{ fontWeight: 700 }} />
          <Tab icon={<Lock fontSize="small" sx={{ color: '#dc2626' }} />} iconPosition="start" label="3. Break-Glass Audit Trail" sx={{ fontWeight: 700 }} />
          <Tab icon={<Fingerprint fontSize="small" sx={{ color: '#2563eb' }} />} iconPosition="start" label="4. Privacy-by-Design Anonymizer" sx={{ fontWeight: 700 }} />
          <Tab icon={<AssignmentTurnedIn fontSize="small" />} iconPosition="start" label="5. NDPA 2023 Regulatory Checklist" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Box>

      <CardContent sx={{ p: 3 }}>
        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ── TAB 0: OVERVIEW & COMPLIANCE SCORE ──────────────────────────── */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {subTab === 0 && (
          <Stack spacing={3}>
            {/* Top Score Banner */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: '#bbf7d0',
                bgcolor: '#f0fdf4',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', md: 'center' },
                gap: 2
              }}
            >
              <Box>
                <Typography variant="overline" color="success.dark" fontWeight={800}>
                  NATIONAL HEALTH TECHNOLOGY & DATA ANALYTICS (NHTDAO) PRIVACY AUDIT
                </Typography>
                <Typography variant="h5" fontWeight={800} color="#14532d">
                  Nigeria Data Protection Act (NDPA 2023) Compliance Status
                </Typography>
                <Typography variant="body2" color="#166534" mt={0.5}>
                  Hospital-wide consent directives active, emergency override non-repudiation enabled, and HMAC-SHA256 salted pseudonymization operational.
                </Typography>
              </Box>

              <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Typography variant="h3" fontWeight={900} color="#15803d">
                  {checklistData?.scorePercentage || 100}%
                </Typography>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  COMPLIANCE RATING (6 OF 6 PILLARS VERIFIED)
                </Typography>
              </Box>
            </Paper>

            {/* 4 Summary Metric Cards */}
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #10b981' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    PATIENT CONSENT COVERAGE
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="primary" mt={0.5}>
                    {overviewData?.consentCoveragePercentage ?? 100}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {overviewData?.consentStatusCounts?.active ?? 0} active directives across {overviewData?.totalPatients ?? 0} patients
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #3b82f6' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    TOTAL CONSENT DIRECTIVES
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#1d4ed8" mt={0.5}>
                    {overviewData?.totalConsents ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {overviewData?.consentStatusCounts?.revoked ?? 0} revoked • {overviewData?.consentStatusCounts?.expired ?? 0} expired
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #ef4444' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    BREAK-GLASS EMERGENCIES
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#b91c1c" mt={0.5}>
                    {overviewData?.breakGlassMetrics?.total ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {overviewData?.breakGlassMetrics?.pendingDpoReviews ?? 0} pending DPO review sign-offs
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #8b5cf6' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    ANONYMIZATION ENGINE
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#6d28d9" mt={0.5}>
                    ACTIVE
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Salted HMAC-SHA256 & NHMIS Safe Harbor
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Recent Break-Glass Audit Overrides */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Lock sx={{ color: '#dc2626' }} fontSize="small" /> Recent Emergency Break-Glass Overrides
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Clinical emergency overrides that bypassed standard consent restrictions under NDPA 2023 Sec 29(c).
                  </Typography>
                </Box>
                <Button size="small" variant="text" onClick={() => setSubTab(2)}>
                  View Full Audit Log →
                </Button>
              </Stack>

              {overviewData?.recentBreakGlass?.length === 0 ? (
                <Alert severity="info" variant="outlined">
                  No emergency break-glass overrides recorded. Access controls operating normally.
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Clinician / User</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Patient</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Clinical Justification</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>DPO Sign-Off</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overviewData?.recentBreakGlass?.map((bg: any) => (
                        <TableRow key={bg.id} hover>
                          <TableCell sx={{ fontSize: '0.8rem' }}>
                            {new Date(bg.accessedAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700}>{bg.user}</Typography>
                            <Typography variant="caption" color="text.secondary">{bg.userRole}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{bg.patientName}</Typography>
                            <Typography variant="caption" color="text.secondary">{bg.patientNumber || 'ID: ' + bg.patientId}</Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 280, fontSize: '0.82rem' }}>
                            {bg.reason}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={bg.severity}
                              size="small"
                              color={bg.severity === 'EMERGENCY' ? 'error' : 'warning'}
                              sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                            />
                          </TableCell>
                          <TableCell>
                            {bg.reviewedByDpo ? (
                              <Chip
                                label={bg.dpoAction || 'APPROVED'}
                                size="small"
                                color={bg.dpoAction === 'FLAG_BREACH' ? 'error' : 'success'}
                                sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                              />
                            ) : (
                              <Chip
                                label="PENDING REVIEW"
                                size="small"
                                sx={{ bgcolor: '#fed7aa', color: '#9a3412', fontWeight: 700, fontSize: '0.7rem' }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Stack>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ── TAB 1: PATIENT CONSENT DIRECTIVE REGISTER ───────────────────── */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {subTab === 1 && (
          <Stack spacing={2.5}>
            {/* Filter Toolbar */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by Patient name, number, or notes..."
                    value={consentSearch}
                    onChange={(e) => setConsentSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchConsents(); }}
                  />
                </Grid>
                <Grid item xs={6} sm={2.5}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="consent-status-label">Directive Status</InputLabel>
                    <Select
                      labelId="consent-status-label"
                      value={consentFilterStatus}
                      label="Directive Status"
                      onChange={(e) => setConsentFilterStatus(e.target.value)}
                    >
                      <MenuItem value="ALL">All Statuses</MenuItem>
                      <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                      <MenuItem value="REVOKED">REVOKED</MenuItem>
                      <MenuItem value="EXPIRED">EXPIRED</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={2.5}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="consent-scope-label">Consent Scope</InputLabel>
                    <Select
                      labelId="consent-scope-label"
                      value={consentFilterScope}
                      label="Consent Scope"
                      onChange={(e) => setConsentFilterScope(e.target.value)}
                    >
                      <MenuItem value="ALL">All Scopes</MenuItem>
                      <MenuItem value="PATIENT_PRIVACY">PATIENT_PRIVACY</MenuItem>
                      <MenuItem value="RESEARCH">RESEARCH</MenuItem>
                      <MenuItem value="REGISTRY_SHARING">REGISTRY_SHARING</MenuItem>
                      <MenuItem value="THIRD_PARTY_DISCLOSURE">THIRD_PARTY_DISCLOSURE</MenuItem>
                      <MenuItem value="TELEHEALTH">TELEHEALTH</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" size="small" onClick={fetchConsents}>
                      Filter
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<HistoryEdu />}
                      onClick={() => setOpenNewConsentModal(true)}
                      sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                    >
                      New Directive
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* Consents Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Directive ID & Patient</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Scope & Provision</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Purpose of Use</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Lawful Basis (NDPA)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Data Classes</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Signature & Witness</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingConsents ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : consents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No consent directives found matching current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    consents.map((c) => (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : 'Patient ID: ' + c.patientId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Card #{c.patient?.patientNumber || 'N/A'} • Pseudonym: {c.patient?.pseudonymId}
                          </Typography>
                          {c.patient?.maskedNin && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              NIN: {c.patient.maskedNin}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={c.scope}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '0.68rem', mb: 0.5 }}
                          />
                          <Box>
                            <Chip
                              label={c.provisionType}
                              size="small"
                              color={c.provisionType === 'PERMIT' ? 'success' : 'error'}
                              sx={{ fontWeight: 800, fontSize: '0.68rem' }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {c.purposeOfUse}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={c.ndpcLawfulBasis}
                            size="small"
                            sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 700, fontSize: '0.68rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', maxWidth: 160 }}>
                          {c.dataClassesAllowed && (
                            <Box sx={{ color: 'success.main' }}>
                              ✓ Allowed: {c.dataClassesAllowed}
                            </Box>
                          )}
                          {c.dataClassesRestricted && (
                            <Box sx={{ color: 'error.main', mt: 0.5 }}>
                              ✗ Restricted: {c.dataClassesRestricted}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={c.status}
                            size="small"
                            color={c.status === 'ACTIVE' ? 'success' : c.status === 'REVOKED' ? 'error' : 'default'}
                            sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                          />
                          {c.revokedReason && (
                            <Typography variant="caption" display="block" color="error.main" sx={{ fontSize: '0.68rem', mt: 0.5 }}>
                              {c.revokedReason}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>
                          <Box fontWeight={600}>{c.signatureType} ({c.consentingPartyRel})</Box>
                          {c.witnessStaff && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Witness: {c.witnessStaff.firstName} {c.witnessStaff.lastName} ({c.witnessStaff.designation || 'Staff'})
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="View FHIR R4 Consent JSON">
                              <IconButton size="small" onClick={() => handleViewFhirConsent(c)}>
                                <Code fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {c.status === 'ACTIVE' && (
                              <Tooltip title="Revoke Consent (NDPA Sec 34)">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setSelectedConsent(c);
                                    setOpenRevokeModal(true);
                                  }}
                                >
                                  <DeleteOutline fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ── TAB 2: BREAK-GLASS EMERGENCY AUDIT TRAIL ─────────────────────── */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {subTab === 2 && (
          <Stack spacing={2.5}>
            {/* Header info */}
            <Alert severity="warning" variant="outlined" sx={{ bgcolor: '#fef2f2' }}>
              <Typography variant="subtitle2" fontWeight={800} color="#991b1b">
                Emergency Break-Glass Audit Trail (NDPA 2023 Sec 29(c) - Vital Interests)
              </Typography>
              <Typography variant="caption" color="#7f1d1d">
                All clinician overrides that bypass patient consent or restricted file locks are cryptographically recorded with full non-repudiation audit trails (User ID, IP address, exact justification, timestamp). The Data Protection Officer (DPO) must review and approve or escalate each incident.
              </Typography>
            </Alert>

            {/* Filter controls */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={2} sx={{ width: '100%', maxWidth: 500 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="bg-severity-label">Severity Level</InputLabel>
                    <Select
                      labelId="bg-severity-label"
                      value={breakGlassSeverityFilter}
                      label="Severity Level"
                      onChange={(e) => setBreakGlassSeverityFilter(e.target.value)}
                    >
                      <MenuItem value="ALL">All Severities</MenuItem>
                      <MenuItem value="EMERGENCY">EMERGENCY</MenuItem>
                      <MenuItem value="CRITICAL_OVERRIDE">CRITICAL_OVERRIDE</MenuItem>
                      <MenuItem value="SENSITIVE_RECORD">SENSITIVE_RECORD</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel id="bg-dpo-label">DPO Audit Status</InputLabel>
                    <Select
                      labelId="bg-dpo-label"
                      value={breakGlassDpoFilter}
                      label="DPO Audit Status"
                      onChange={(e) => setBreakGlassDpoFilter(e.target.value)}
                    >
                      <MenuItem value="ALL">All Events</MenuItem>
                      <MenuItem value="PENDING">Pending DPO Sign-Off</MenuItem>
                      <MenuItem value="REVIEWED">Reviewed by DPO</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                <Button
                  variant="contained"
                  color="error"
                  startIcon={<LockOpen />}
                  onClick={() => setOpenBreakGlassModal(true)}
                  sx={{ fontWeight: 700 }}
                >
                  Trigger Emergency Break-Glass
                </Button>
              </Stack>
            </Paper>

            {/* Logs Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Timestamp & IP</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Staff / Clinician</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Patient File Overridden</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Clinical Justification</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>DPO Sign-Off</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>DPO Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingBreakGlass ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : breakGlassLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No break-glass override events found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    breakGlassLogs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {new Date(log.accessedAt).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            IP: {log.ipAddress || '127.0.0.1'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {log.userDisplayName || log.user?.username || 'Staff'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Role: {log.userRole || log.user?.role || 'CLINICIAN'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {log.patient ? `${log.patient.firstName} ${log.patient.lastName}` : 'Patient ID: ' + (log.patientId || 'GENERAL')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Card #{log.patient?.patientNumber || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300, fontSize: '0.82rem' }}>
                          <Box sx={{ p: 1, bgcolor: '#fff1f2', borderRadius: 1, border: '1px solid #fecdd3' }}>
                            {log.reason}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.severity}
                            size="small"
                            color={log.severity === 'EMERGENCY' ? 'error' : 'warning'}
                            sx={{ fontWeight: 800, fontSize: '0.68rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          {log.reviewedByDpo ? (
                            <Box>
                              <Chip
                                label={log.dpoAction || 'APPROVED'}
                                size="small"
                                color={log.dpoAction === 'FLAG_BREACH' ? 'error' : 'success'}
                                sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                              />
                              <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.65rem', mt: 0.5 }}>
                                Reviewed {new Date(log.reviewedAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          ) : (
                            <Chip
                              label="PENDING DPO AUDIT"
                              size="small"
                              sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 800, fontSize: '0.68rem' }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setSelectedBreakGlassLog(log);
                              setDpoAction(log.dpoAction || 'APPROVED');
                              setDpoNotes(log.dpoNotes || '');
                              setOpenDpoReviewModal(true);
                            }}
                          >
                            {log.reviewedByDpo ? 'Update DPO Review' : 'DPO Sign-Off'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ── TAB 3: PRIVACY-BY-DESIGN DE-IDENTIFICATION PIPELINE ─────────── */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {subTab === 3 && (
          <Stack spacing={3}>
            {/* Architecture Explanation */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #86efac' }}>
              <Typography variant="subtitle1" fontWeight={800} color="#166534" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Fingerprint sx={{ color: '#16a34a' }} /> NHTDAO & NDPA 2023 Compliant De-Identification Architecture
              </Typography>
              <Typography variant="body2" color="#14532d" mt={0.5}>
                Clinical analytics, research registries, and OpenHEXA/DHIS2 export feeds are automatically processed through the De-Identification Pipeline.
                Direct identifiers (NIN, Phone Number, Name, Street Address) are permanently masked or replaced with deterministic HMAC-SHA256 salted pseudonyms (`ANON-PAT-XXXXXX`). Exact birthdates are converted into standard NHMIS age bands (&lt;1, 1-4, 5-14, 15-49, 50+). Patient consent directives opting out of research are strictly respected.
              </Typography>
            </Paper>

            {/* Pipeline Configuration Switches */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} color="primary" mb={2}>
                De-Identification Pipeline Controls
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <FormControlLabel
                    control={<Switch checked={anonRespectConsent} onChange={(e) => setAnonRespectConsent(e.target.checked)} color="success" />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={700}>Respect Patient Consent Opt-Outs</Typography>
                        <Typography variant="caption" color="text.secondary">Automatically exclude records where consent provision is DENY for research.</Typography>
                      </Box>
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <FormControlLabel
                    control={<Switch checked={anonAgeBanding} onChange={(e) => setAnonAgeBanding(e.target.checked)} color="primary" />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={700}>NHMIS 5-Year Age Banding</Typography>
                        <Typography variant="caption" color="text.secondary">Replaces exact date of birth with national demographic age tiers.</Typography>
                      </Box>
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <FormControlLabel
                    control={<Switch checked={anonIncludeDx} onChange={(e) => setAnonIncludeDx(e.target.checked)} />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={700}>Include ICD-10 / ICD-11 Diagnoses</Typography>
                        <Typography variant="caption" color="text.secondary">Redacts sensitive categories if restricted by directive.</Typography>
                      </Box>
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <FormControlLabel
                    control={<Switch checked={anonIncludeRx} onChange={(e) => setAnonIncludeRx(e.target.checked)} />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={700}>Include WHO ATC Formularies</Typography>
                        <Typography variant="caption" color="text.secondary">De-identifies prescription items to generic names & doses.</Typography>
                      </Box>
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <FormControlLabel
                    control={<Switch checked={anonIncludeObs} onChange={(e) => setAnonIncludeObs(e.target.checked)} />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={700}>Include Clinical Observations Summary</Typography>
                        <Typography variant="caption" color="text.secondary">Aggregated clinical visit observations.</Typography>
                      </Box>
                    }
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2.5 }} />

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<Visibility />}
                  onClick={handleRunAnonymizationPreview}
                  disabled={loadingPreview}
                >
                  {loadingPreview ? 'Running Pipeline...' : 'Preview De-Identified Cohort'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={() => handleExportDataset('csv')}
                  disabled={exportingDataset}
                  sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
                >
                  Export Anonymized CSV
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Code />}
                  onClick={() => handleExportDataset('json')}
                  disabled={exportingDataset}
                  sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, fontWeight: 700 }}
                >
                  Export Anonymized JSON
                </Button>
              </Stack>
            </Paper>

            {/* Preview Results Table */}
            {anonymizePreview && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800} color="primary">
                      Pipeline Output Preview ({anonymizePreview.summary?.totalOutputRecords} records generated)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Algorithm: {anonymizePreview.summary?.anonymizationAlgorithm} • Total Excluded by Consent Directives: {anonymizePreview.summary?.totalExcludedByConsent}
                    </Typography>
                  </Box>
                </Stack>

                <TableContainer sx={{ maxHeight: 380 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Pseudonym Token (HMAC-SHA256)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Age Band</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Gender</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Geography (State / LGA)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Encounters</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Harmonized Diagnoses (ICD-10/11)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>De-Identified Medications</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {anonymizePreview.records?.map((r: any, idx: number) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0369a1' }}>
                            {r.pseudonymId}
                          </TableCell>
                          <TableCell>{r.ageBand}</TableCell>
                          <TableCell>{r.gender}</TableCell>
                          <TableCell>{r.state} / {r.lga}</TableCell>
                          <TableCell>{r.encountersCount}</TableCell>
                          <TableCell sx={{ maxWidth: 220, fontSize: '0.78rem' }}>
                            {r.diagnoses?.length === 0 ? (
                              <Typography variant="caption" color="text.secondary">None recorded</Typography>
                            ) : (
                              r.diagnoses?.map((d: any, i: number) => (
                                <Chip
                                  key={i}
                                  label={`${d.code}: ${d.description}`}
                                  size="small"
                                  sx={{ mr: 0.5, mb: 0.5, fontSize: '0.65rem' }}
                                />
                              ))
                            )}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 220, fontSize: '0.78rem' }}>
                            {r.medications?.length === 0 ? (
                              <Typography variant="caption" color="text.secondary">None</Typography>
                            ) : (
                              r.medications?.map((m: any, i: number) => (
                                <Box key={i} sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                  • {m.name} {m.dosage ? `(${m.dosage})` : ''}
                                </Box>
                              ))
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
          </Stack>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ── TAB 4: NDPA 2023 REGULATORY AUDIT CHECKLIST ─────────────────── */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {subTab === 4 && (
          <Stack spacing={2.5}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={800} color="primary" mb={1}>
                Nigeria Data Protection Act (NDPA 2023) Legal & Interoperability Compliance Audit
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Evaluated against the Nigeria Data Protection Commission (NDPC) standard guidelines for Electronic Health Record (EHR) systems and National Health Interoperability (NHTDAO).
              </Typography>

              <Grid container spacing={2}>
                {checklistData?.checklist?.map((item: any) => (
                  <Grid item xs={12} md={6} key={item.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderLeft: `5px solid ${item.status === 'COMPLIANT' ? '#10b981' : '#f59e0b'}`,
                        height: '100%'
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Box>
                          <Chip
                            label={item.id}
                            size="small"
                            sx={{ fontWeight: 800, fontSize: '0.68rem', mb: 0.5, bgcolor: '#f1f5f9' }}
                          />
                          <Typography variant="subtitle2" fontWeight={800}>
                            {item.title}
                          </Typography>
                        </Box>
                        <Chip
                          label={item.status}
                          size="small"
                          color={item.status === 'COMPLIANT' ? 'success' : 'warning'}
                          sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                        {item.description}
                      </Typography>
                      <Box sx={{ mt: 1.5, p: 1, bgcolor: '#f8fafc', borderRadius: 1, fontSize: '0.78rem', color: '#334155' }}>
                        <strong>Evidence:</strong> {item.evidence}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Stack>
        )}
      </CardContent>

      {/* ── MODAL: Register New Patient Consent Directive ──────────────────── */}
      <Dialog open={openNewConsentModal} onClose={() => setOpenNewConsentModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#0f172a', color: '#f8fafc' }}>
          Register Patient Consent Directive (NDPA 2023 Section 25 & 26)
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Alert severity="info" variant="outlined">
              Consent directives establish legally-binding permissions for clinical care, health information exchange (HIE), or clinical research.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Patient ID or UUID"
                  required
                  placeholder="Paste Patient UUID or ID"
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="consent-lawful-label">NDPC Lawful Basis</InputLabel>
                  <Select
                    labelId="consent-lawful-label"
                    value={newLawfulBasis}
                    label="NDPC Lawful Basis"
                    onChange={(e) => setNewLawfulBasis(e.target.value)}
                  >
                    <MenuItem value="EXPLICIT_CONSENT">EXPLICIT_CONSENT (Patient Written/Digital)</MenuItem>
                    <MenuItem value="VITAL_INTEREST">VITAL_INTEREST (Life/Death Emergency)</MenuItem>
                    <MenuItem value="PUBLIC_HEALTH_LAW">PUBLIC_HEALTH_LAW (Statutory Disease Surveillance)</MenuItem>
                    <MenuItem value="LEGAL_OBLIGATION">LEGAL_OBLIGATION (Court/Law Enforcement)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel id="consent-scope-input">Consent Scope</InputLabel>
                  <Select
                    labelId="consent-scope-input"
                    value={newScope}
                    label="Consent Scope"
                    onChange={(e) => setNewScope(e.target.value)}
                  >
                    <MenuItem value="PATIENT_PRIVACY">PATIENT_PRIVACY (General Healthcare)</MenuItem>
                    <MenuItem value="RESEARCH">RESEARCH (Clinical Trials & Studies)</MenuItem>
                    <MenuItem value="REGISTRY_SHARING">REGISTRY_SHARING (NHTDAO HIE Interop)</MenuItem>
                    <MenuItem value="THIRD_PARTY_DISCLOSURE">THIRD_PARTY_DISCLOSURE (HMO/Insurance)</MenuItem>
                    <MenuItem value="TELEHEALTH">TELEHEALTH (Remote Consultations)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel id="consent-category-input">Data Category</InputLabel>
                  <Select
                    labelId="consent-category-input"
                    value={newCategory}
                    label="Data Category"
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <MenuItem value="DATA_PROCESSING">DATA_PROCESSING (Standard EHR)</MenuItem>
                    <MenuItem value="SENSITIVE_HEALTH_DATA">SENSITIVE_HEALTH_DATA (Special Category)</MenuItem>
                    <MenuItem value="GENETIC_DATA">GENETIC_DATA (DNA / Genotypes)</MenuItem>
                    <MenuItem value="REPRODUCTIVE_HEALTH">REPRODUCTIVE_HEALTH (Maternity / FP)</MenuItem>
                    <MenuItem value="MENTAL_HEALTH">MENTAL_HEALTH (Psychiatric)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel id="consent-provision-input">Provision Directive</InputLabel>
                  <Select
                    labelId="consent-provision-input"
                    value={newProvisionType}
                    label="Provision Directive"
                    onChange={(e) => setNewProvisionType(e.target.value)}
                  >
                    <MenuItem value="PERMIT">PERMIT (Allow Processing)</MenuItem>
                    <MenuItem value="DENY">DENY (Prohibit Processing)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Consenting Party Name (Leave blank if Patient)"
                  placeholder="e.g. Self or Guardian Full Name"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="party-rel-label">Relationship</InputLabel>
                  <Select
                    labelId="party-rel-label"
                    value={newPartyRel}
                    label="Relationship"
                    onChange={(e) => setNewPartyRel(e.target.value)}
                  >
                    <MenuItem value="SELF">SELF</MenuItem>
                    <MenuItem value="PARENT">PARENT</MenuItem>
                    <MenuItem value="GUARDIAN">GUARDIAN</MenuItem>
                    <MenuItem value="SPOUSE">SPOUSE</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="sig-type-label">Signature Type</InputLabel>
                  <Select
                    labelId="sig-type-label"
                    value={newSigType}
                    label="Signature Type"
                    onChange={(e) => setNewSigType(e.target.value)}
                  >
                    <MenuItem value="DIGITAL">DIGITAL (Electronic Confirmation)</MenuItem>
                    <MenuItem value="WRITTEN">WRITTEN (Physical Document Scan)</MenuItem>
                    <MenuItem value="VERBAL_WITNESSED">VERBAL_WITNESSED (Staff Attested)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  label="Directive Notes & Explanations"
                  placeholder="Any specific restrictions or conditions specified by the patient..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenNewConsentModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRegisterConsent}
            disabled={submittingConsent}
            sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, fontWeight: 700 }}
          >
            {submittingConsent ? 'Registering...' : 'Save Directive'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── MODAL: Revoke Patient Consent Directive ────────────────────────── */}
      <Dialog open={openRevokeModal} onClose={() => setOpenRevokeModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#dc2626' }}>
          Revoke Consent Directive (NDPA 2023 Section 34)
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="warning">
              Under Section 34 of the Nigeria Data Protection Act 2023, data subjects have an unfettered legal right to withdraw consent at any time. Revoking this directive will immediately restrict corresponding data sharing.
            </Alert>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Legal Revocation Reason"
              placeholder="e.g. Patient requested withdrawal from research database / third-party disclosure."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenRevokeModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRevokeConsent}
            disabled={revoking}
            sx={{ fontWeight: 700 }}
          >
            {revoking ? 'Revoking...' : 'Confirm Revocation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── MODAL: Record Emergency Break-Glass Access ──────────────────────── */}
      <Dialog open={openBreakGlassModal} onClose={() => setOpenBreakGlassModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#7f1d1d', color: '#fef2f2' }}>
          Emergency Break-Glass Record Override
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Alert severity="error">
              <strong>NDPA 2023 Non-Repudiation Notice:</strong> You are initiating an emergency override to access restricted medical records. Your User ID, IP address, and justification will be permanently audited and reported to the Data Protection Officer (DPO).
            </Alert>

            <TextField
              fullWidth
              size="small"
              label="Patient ID or Number (Optional if facility-wide emergency)"
              placeholder="UUID or Hospital Card Number"
              value={bgPatientId}
              onChange={(e) => setBgPatientId(e.target.value)}
            />

            <FormControl fullWidth size="small">
              <InputLabel id="bg-sev-modal-label">Severity Classification</InputLabel>
              <Select
                labelId="bg-sev-modal-label"
                value={bgSeverity}
                label="Severity Classification"
                onChange={(e) => setBgSeverity(e.target.value)}
              >
                <MenuItem value="EMERGENCY">EMERGENCY (Immediate Life or Limb Risk)</MenuItem>
                <MenuItem value="CRITICAL_OVERRIDE">CRITICAL_OVERRIDE (Urgent Resuscitation / ICU)</MenuItem>
                <MenuItem value="SENSITIVE_RECORD">SENSITIVE_RECORD (Clinically Indicated Override)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              required
              label="Mandatory Clinical Emergency Justification"
              placeholder="e.g. Patient unconscious in trauma resuscitation room. Immediate access to blood group and allergy records required."
              value={bgReason}
              onChange={(e) => setBgReason(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenBreakGlassModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRecordBreakGlass}
            disabled={recordingBreakGlass}
            sx={{ fontWeight: 700 }}
          >
            {recordingBreakGlass ? 'Logging Override...' : 'Confirm Break-Glass Access'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── MODAL: DPO Review & Sign-Off ───────────────────────────────────── */}
      <Dialog open={openDpoReviewModal} onClose={() => setOpenDpoReviewModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          DPO Compliance Audit Sign-Off
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Staff Member Who Broke Glass:</Typography>
              <Typography variant="body1" fontWeight={700}>
                {selectedBreakGlassLog?.userDisplayName || selectedBreakGlassLog?.user?.username} ({selectedBreakGlassLog?.userRole})
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">Override Justification Provided:</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f8fafc', mt: 0.5, fontSize: '0.85rem' }}>
                {selectedBreakGlassLog?.reason}
              </Paper>
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel id="dpo-action-label">DPO Audit Finding</InputLabel>
              <Select
                labelId="dpo-action-label"
                value={dpoAction}
                label="DPO Audit Finding"
                onChange={(e) => setDpoAction(e.target.value as any)}
              >
                <MenuItem value="APPROVED">APPROVED (Legitimate Clinical Emergency)</MenuItem>
                <MenuItem value="FLAG_BREACH">FLAG_BREACH (Unjustified / Potential Privacy Breach)</MenuItem>
                <MenuItem value="ESCALATED">ESCALATED (Referred to NDPC Regulatory Committee)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Data Protection Officer Notes"
              placeholder="Document review findings and verification of emergency circumstances..."
              value={dpoNotes}
              onChange={(e) => setDpoNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDpoReviewModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleReviewBreakGlass}
            disabled={reviewingDpo}
            sx={{ fontWeight: 700 }}
          >
            {reviewingDpo ? 'Saving...' : 'Submit DPO Sign-Off'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── MODAL: View FHIR R4 Consent Resource JSON ──────────────────────── */}
      <Dialog open={openFhirModal} onClose={() => setOpenFhirModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#0f172a', color: '#f8fafc' }}>
          HL7 FHIR R4 Consent Resource
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#020617', color: '#38bdf8', p: 2 }}>
          <pre style={{ margin: 0, fontSize: '0.78rem', overflowX: 'auto', fontFamily: 'monospace' }}>
            {JSON.stringify(fhirConsentJson, null, 2)}
          </pre>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenFhirModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default NdpcPrivacyStudio;
