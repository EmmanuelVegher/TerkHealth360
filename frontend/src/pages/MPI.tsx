import { useState, useEffect, useRef, useCallback } from 'react';
import { assetUrl } from '../utils/assetUrl';
import {
  Typography, Box, Card, CardContent, TextField, Button, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, InputAdornment,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Avatar,
  FormControl, InputLabel, Select, MenuItem, Divider, Tabs, Tab, Alert, LinearProgress, Pagination,
} from '@mui/material';
import { Search, Badge, Phone, HowToReg, CheckCircle, Sync, Portrait, QrCodeScanner, Edit, Payment, CameraAlt, KeyboardAlt, Close, PersonSearch, HealthAndSafety } from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { EmergencyPendingBanner } from '../components/EmergencyPendingBanner';
import { EsmFormEngine, FormSchema } from '../components/esm-form-engine';

interface PatientItem {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  gender: string;
  birthDate: string | null;
  status: string;
  phone: string;
  email: string;
  photoUrl: string | null;
  nin: string | null;
  artNumber?: string | null;
  nmrsHospitalNumber?: string | null;
  currentRegimen?: string | null;
  insurance: string;
  lastVisitDate: string | null;
  createdAt?: string;
  createdBy?: string;
}

const MPI = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search state
  const [query, setQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Metrics state
  const [metrics, setMetrics] = useState({ total: 0, active: 0, deceased: 0, archived: 0, external: 0 });

  // Patient Card Print Dialog state
  const [openCard, setOpenCard] = useState(false);
  const [cardPatient, setCardPatient] = useState<PatientItem | null>(null);
  const [cardReason, setCardReason] = useState('');
  const [printingLog, setPrintingLog] = useState<any[]>([]);

  // Scan Card Dialog
  const [openScan, setOpenScan] = useState(false);
  const [scanTab, setScanTab] = useState(0); // 0 = hardware, 1 = camera
  const [scanInput, setScanInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanResult, setScanResult] = useState<PatientItem | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerMountedRef = useRef(false);
  const hardwareBuffer = useRef('');
  const hardwareTimer = useRef<any>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // ESM Form Engine Dialog State
  const [openEsmModal, setOpenEsmModal] = useState(false);
  const [esmPatient, setEsmPatient] = useState<PatientItem | null>(null);
  const [availableSchemas, setAvailableSchemas] = useState<any[]>([]);
  const [selectedEsmSchemaId, setSelectedEsmSchemaId] = useState<string>('');
  const [loadingEsmSchemas, setLoadingEsmSchemas] = useState(false);
  const [savingEsmEncounter, setSavingEsmEncounter] = useState(false);

  const fetchEsmSchemas = async () => {
    if (availableSchemas.length > 0) return;
    setLoadingEsmSchemas(true);
    try {
      const res = await api.get('/nmrs/schemas');
      if (res.data?.schemas?.length > 0) {
        setAvailableSchemas(res.data.schemas);
        setSelectedEsmSchemaId(res.data.schemas[0]?.id || '');
      }
    } catch {
      // ignore
    } finally {
      setLoadingEsmSchemas(false);
    }
  };

  const handleOpenEsmForm = (p: PatientItem) => {
    setEsmPatient(p);
    setOpenEsmModal(true);
    fetchEsmSchemas();
  };

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/patients/mpi', {
        params: {
          query,
          gender: genderFilter || undefined,
          status: statusFilter || undefined,
          page,
          limit: 10,
        },
      });
      setPatients(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to fetch patient index', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/patients/metrics');
      setMetrics(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [query, genderFilter, statusFilter, page]);

  useEffect(() => {
    fetchMetrics();
  }, []);

  // ─── Hardware Scanner Listener ──────────────────────────────────────────────
  // Hardware scanners type characters rapidly then send Enter.
  // We detect rapid keystrokes (< 50ms gap) and treat them as a barcode scan.
  useEffect(() => {
    if (!openScan || scanTab !== 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea (other than our scan input)
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        if (hardwareBuffer.current.length > 2) {
          handleMrnLookup(hardwareBuffer.current.trim());
        }
        hardwareBuffer.current = '';
        clearTimeout(hardwareTimer.current);
        return;
      }

      if (e.key.length === 1) {
        hardwareBuffer.current += e.key;
        clearTimeout(hardwareTimer.current);
        hardwareTimer.current = setTimeout(() => {
          hardwareBuffer.current = '';
        }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openScan, scanTab]);

  // ─── Camera Scanner ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!openScan || scanTab !== 1) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
        scannerMountedRef.current = false;
      }
      return;
    }

    const mountScanner = () => {
      if (scannerMountedRef.current) return;
      const el = document.getElementById('mpi-qr-reader');
      if (!el) return;
      scannerMountedRef.current = true;

      scannerRef.current = new Html5QrcodeScanner(
        'mpi-qr-reader',
        {
          fps: 10,
          qrbox: { width: 260, height: 130 },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.PDF_417,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
        },
        false
      );

      scannerRef.current.render(
        (decodedText: string) => {
          // Camera successfully scanned
          handleMrnLookup(decodedText.trim());
        },
        (_errorMsg: string) => { /* ignore per-frame errors */ }
      );
    };

    // Small delay to ensure DOM element is ready
    const t = setTimeout(mountScanner, 300);
    return () => {
      clearTimeout(t);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
        scannerMountedRef.current = false;
      }
    };
  }, [openScan, scanTab]);

  const handleMrnLookup = useCallback(async (mrn: string) => {
    setScanLoading(true);
    setScanError('');
    setScanResult(null);
    setScanInput(mrn);
    try {
      const res = await api.get('/patients/mpi', { params: { query: mrn, limit: 1 } });
      const list: PatientItem[] = res.data.data;
      if (list.length === 0) {
        setScanError(`No patient found for MRN / code: "${mrn}"`);
      } else {
        setScanResult(list[0]);
      }
    } catch {
      setScanError('Lookup failed. Please try again.');
    } finally {
      setScanLoading(false);
    }
  }, []);

  const handleCloseScan = () => {
    setOpenScan(false);
    setScanInput('');
    setScanError('');
    setScanResult(null);
    setScanLoading(false);
    setScanTab(0);
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
      scannerMountedRef.current = false;
    }
  };

  const handlePrintCardOpen = async (patient: PatientItem) => {
    setCardPatient(patient);
    setCardReason('Initial registration card print');
    
    // Fetch reprint log history
    try {
      const details = await api.get(`/patients/${patient.id}`);
      setPrintingLog(details.data.cardReprints || []);
    } catch (err) {
      console.error(err);
    }
    setOpenCard(true);
  };

  const handlePrintCardConfirm = async () => {
    if (!cardPatient) return;
    try {
      await api.post(`/patients/${cardPatient.id}/card-reprint`, { reason: cardReason });
      enqueueSnackbar('Card reprint audit logged successfully.', { variant: 'success' });
      
      setTimeout(() => {
        window.print();
        setOpenCard(false);
        setCardReason('');
      }, 300);
    } catch (err) {
      enqueueSnackbar('Logging card reprint audit failed', { variant: 'error' });
    }
  };

  const getStatusColor = (status: string): "success" | "warning" | "error" | "default" | "info" | "secondary" => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'warning';
      case 'DECEASED':
      case 'DEAD': return 'error';
      case 'TRANSFERRED_OUT': return 'secondary';
      case 'LTFU': return 'warning';
      case 'STOPPED_TREATMENT': return 'error';
      case 'ARCHIVED': return 'default';
      default: return 'info';
    }
  };

  return (
    <div>
      <EmergencyPendingBanner mode="navigate" />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Master Patient Index (MPI)</Typography>
        <Button
          variant="contained"
          component={RouterLink}
          to="/register-patient"
          sx={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #4c6ef5 100%)', borderRadius: 2 }}
        >
          Register New Patient
        </Button>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Registered Patients', count: metrics.total, color: '#3b5bdb' },
          { title: 'Active', count: metrics.active, color: '#2b8a3e' },
          { title: 'External / Walk-in', count: metrics.external, color: '#f59f00' },
          { title: 'Archived', count: metrics.archived, color: '#868e96' },
          { title: 'Deceased', count: metrics.deceased, color: '#c92a2a' }
        ].map((m, i) => (
          <Grid item xs={12} sm={6} md={2.4} key={i}>
            <Card sx={{ borderLeft: `4px solid ${m.color}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderRadius: 2 }}>
              <CardContent sx={{ p: '16px !important' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">{m.title}</Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: m.color, mt: 0.5 }}>{m.count.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Advanced filters */}
      <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by MRN, ART Number (PEPFAR ID), Name, NIN, Phone..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Sex</InputLabel>
                <Select value={genderFilter} label="Sex" onChange={e => setGenderFilter(e.target.value)}>
                  <MenuItem value="">All Sexes</MenuItem>
                  <MenuItem value="MALE">MALE</MenuItem>
                  <MenuItem value="FEMALE">FEMALE</MenuItem>
                  <MenuItem value="UNKNOWN">UNKNOWN</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                  <MenuItem value="INACTIVE">INACTIVE</MenuItem>
                  <MenuItem value="DECEASED">DECEASED / DEAD</MenuItem>
                  <MenuItem value="TRANSFERRED_OUT">TRANSFERRED OUT</MenuItem>
                  <MenuItem value="LTFU">LOST TO FOLLOW-UP</MenuItem>
                  <MenuItem value="STOPPED_TREATMENT">STOPPED TREATMENT</MenuItem>
                  <MenuItem value="ARCHIVED">ARCHIVED</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <Button
                variant="outlined"
                fullWidth
                size="small"
                startIcon={<QrCodeScanner />}
                onClick={() => { setScanResult(null); setScanError(''); setScanInput(''); setOpenScan(true); }}
              >
                Scan Card
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Patient Index Table */}
      <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Patient MRN / ART</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Demographics</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Phone & Location</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Scheme / Insurance</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date Created</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Created By</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Last Visit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.map(p => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {p.mrn}
                      </Typography>
                      {p.artNumber && (
                        <Chip
                          label={`ART: ${p.artNumber}`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(5, 150, 105, 0.12)',
                            color: '#047857',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            height: 20,
                            mt: 0.4
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={p.photoUrl || undefined} alt={p.firstName} sx={{ width: 34, height: 34 }}>
                          {p.firstName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {p.lastName}, {p.firstName} {p.middleName || ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.gender} • {p.birthDate ? `${new Date(p.birthDate).toLocaleDateString()} (${new Date().getFullYear() - new Date(p.birthDate).getFullYear()} yrs)` : 'Age unknown'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{p.phone}</Typography>
                      <Typography variant="caption" color="text.secondary">NIN: {p.nin || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={p.insurance} size="small" variant="outlined" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: p.mrn.startsWith('EXT-') ? 'primary.main' : 'text.secondary' }}>
                        {p.createdBy || (p.mrn.startsWith('EXT-') ? 'External / Walk-in' : 'Registration Desk')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {p.lastVisitDate ? new Date(p.lastVisitDate).toLocaleDateString() : 'No recorded visits'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={p.status} size="small" color={getStatusColor(p.status)} sx={{ height: 20 }} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton component={RouterLink} to={`/patients/${p.id}`} color="primary" title="View details profile">
                        <Portrait fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => handlePrintCardOpen(p)} color="secondary" title="Print identification card">
                        <QrCodeScanner fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => handleOpenEsmForm(p)} color="success" title="Launch National Form (OpenMRS ESM Engine)">
                        <HealthAndSafety fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {patients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                      No patients found in matching search parameters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={(_e, val) => setPage(val)} 
              color="primary" 
              showFirstButton 
              showLastButton 
            />
          </Box>
        )}
      </Card>

      {/* PRINT CARD DIALOG */}
      <Dialog open={openCard} onClose={() => setOpenCard(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Reprint Patient ID Card</DialogTitle>
        <DialogContent dividers>
          {cardPatient && (
            <Stack spacing={2.5}>
              {/* Virtual ID Card Preview */}
              <Box
                sx={{
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 3,
                  p: 2,
                  background: 'linear-gradient(135deg, #1e2a78 0%, #162068 100%)',
                  color: 'common.white',
                  position: 'relative',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  minHeight: 180,
                }}
                className="printable-patient-id-card"
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box component="img" src={assetUrl('/hospital-logo.png')} sx={{ width: 22, height: 22, objectFit: 'contain', borderRadius: '4px', bgcolor: '#fff', p: 0.2 }} />
                  <Typography variant="caption" sx={{ letterSpacing: '0.05em', fontWeight: 'bold' }}>
                    FAITH FOUNDATION MISSION HOSPITAL
                  </Typography>
                </Stack>
                <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.15)' }} />
                
                <Stack direction="row" spacing={2} sx={{ mt: 1.5 }} alignItems="center">
                  <Avatar src={cardPatient.photoUrl || undefined} sx={{ width: 64, height: 64, border: '2px solid #fff' }}>
                    {cardPatient.firstName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {cardPatient.firstName} {cardPatient.lastName}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, fontFamily: 'monospace', mt: 0.5 }}>
                      MRN: {cardPatient.mrn}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', opacity: 0.7 }}>
                      Sex: {cardPatient.gender} • Insurance: {cardPatient.insurance}
                    </Typography>
                  </Box>
                </Stack>
                {/* Simulated barcode */}
                <Box sx={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 0.5, bgcolor: '#fff', p: 0.5, borderRadius: 1 }}>
                  {[1, 3, 2, 4, 1, 2, 3, 1, 4, 2].map((w, idx) => (
                    <Box key={idx} sx={{ width: w, height: 20, bgcolor: '#000' }} />
                  ))}
                </Box>
              </Box>

              <TextField
                label="Reason for reprint"
                placeholder="e.g. Lost original card"
                fullWidth
                value={cardReason}
                onChange={e => setCardReason(e.target.value)}
              />

              {/* History list */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Card Reprint Logs</Typography>
                {printingLog.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">No reprint history logged.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {printingLog.map(l => (
                      <Box key={l.id} sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" fontWeight="bold">@{l.reprintedBy}</Typography>
                        <Typography variant="caption">{new Date(l.reprintedAt).toLocaleDateString()} {new Date(l.reprintedAt).toLocaleTimeString()}</Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCard(false)}>Cancel</Button>
          <Button onClick={handlePrintCardConfirm} variant="contained" startIcon={<QrCodeScanner />}>
            Print Card
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════ SCAN CARD DIALOG ═══════════ */}
      <Dialog open={openScan} onClose={handleCloseScan} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeScanner sx={{ color: 'primary.main' }} />
            Scan Patient Card
          </Box>
          <IconButton size="small" onClick={handleCloseScan}><Close fontSize="small" /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {/* Mode Tabs */}
          <Tabs
            value={scanTab}
            onChange={(_, v) => {
              setScanResult(null); setScanError(''); setScanInput(''); setScanTab(v);
            }}
            variant="fullWidth"
            sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Tab icon={<KeyboardAlt fontSize="small" />} iconPosition="start" label="Hardware Scanner" />
            <Tab icon={<CameraAlt fontSize="small" />} iconPosition="start" label="Camera / QR" />
          </Tabs>

          {scanLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {/* ── Tab 0: Hardware Scanner ── */}
          {scanTab === 0 && (
            <Stack spacing={2}>
              <Box sx={{ p: 3, bgcolor: 'primary.light', borderRadius: 2, textAlign: 'center' }}>
                <QrCodeScanner sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" fontWeight={700} color="primary.dark">
                  Ready to Scan
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Aim your <strong>barcode / QR scanner</strong> at the patient card and pull the trigger.
                  The MRN will be read automatically.
                </Typography>
              </Box>

              <Divider>or enter manually</Divider>

              <TextField
                inputRef={scanInputRef}
                label="MRN / Barcode Value"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && scanInput.trim()) handleMrnLookup(scanInput.trim()); }}
                placeholder="e.g. FFMH-10004"
                fullWidth
                size="small"
                autoFocus
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => scanInput.trim() && handleMrnLookup(scanInput.trim())} size="small">
                        <PersonSearch />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          )}

          {/* ── Tab 1: Camera Scanner ── */}
          {scanTab === 1 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Point your camera at the patient card's <strong>QR code or barcode</strong>. Ensure good lighting.
              </Typography>
              <Box id="mpi-qr-reader" sx={{ width: '100%', '& video': { borderRadius: 2 } }} />
            </Stack>
          )}

          {/* ── Error state ── */}
          {scanError && (
            <Alert severity="error" sx={{ mt: 2 }}>{scanError}</Alert>
          )}

          {/* ── Patient Result Card ── */}
          {scanResult && (
            <Box sx={{ mt: 2, p: 2.5, border: '2px solid', borderColor: 'success.main', borderRadius: 2.5, bgcolor: 'success.light' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={scanResult.photoUrl || undefined}
                  sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22, fontWeight: 700 }}
                >
                  {scanResult.firstName[0]}{scanResult.lastName[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={800} color="success.dark">
                    ✅ Patient Found
                  </Typography>
                  <Typography fontWeight={700}>{scanResult.firstName} {scanResult.middleName} {scanResult.lastName}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    <Chip label={scanResult.mrn} size="small" color="primary" />
                    <Chip label={scanResult.status} size="small"
                      color={scanResult.status === 'ACTIVE' ? 'success' : scanResult.status === 'DECEASED' ? 'error' : 'default'}
                    />
                    <Chip label={scanResult.gender} size="small" variant="outlined" />
                  </Stack>
                  {scanResult.phone && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      📞 {scanResult.phone}
                    </Typography>
                  )}
                </Box>
              </Stack>
              <Button
                fullWidth
                variant="contained"
                color="success"
                sx={{ mt: 2, fontWeight: 700 }}
                onClick={() => { handleCloseScan(); navigate(`/patients/${scanResult.id}`); }}
              >
                Open Patient Profile →
              </Button>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseScan}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── National Clinical Form (OpenMRS ESM Engine) Dialog ── */}
      <Dialog
        open={openEsmModal}
        onClose={() => setOpenEsmModal(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', p: 0 } }}
      >
        {esmPatient && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {availableSchemas.length > 1 && (
              <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                  Select National Form:
                </Typography>
                <FormControl size="small" sx={{ minWidth: 320 }}>
                  <Select
                    value={selectedEsmSchemaId}
                    onChange={(e) => setSelectedEsmSchemaId(e.target.value)}
                  >
                    {availableSchemas.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.formName} {s.version ? `(v${s.version})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {(() => {
              const active = availableSchemas.find((s) => s.id === selectedEsmSchemaId) || availableSchemas[0];
              const rawSchema = active?.schemaJson || {};
              const schemaToRender: FormSchema = rawSchema.pages && rawSchema.pages.length > 0
                ? rawSchema
                : {
                    name: active?.formName || 'National Encounter Form',
                    encounterType: rawSchema.encounterType || 'Clinical Encounter',
                    pages: [
                      {
                        label: active?.formName || 'Clinical Form Details',
                        sections: rawSchema.sections || [],
                      }
                    ],
                    processor: 'EncounterFormProcessor',
                    uuid: active?.id,
                  };

              return (
                <EsmFormEngine
                  schema={schemaToRender}
                  patientContext={{
                    id: esmPatient.id,
                    uuid: esmPatient.id,
                    patientNumber: esmPatient.mrn,
                    name: `${esmPatient.firstName} ${esmPatient.lastName}`,
                    firstName: esmPatient.firstName,
                    lastName: esmPatient.lastName,
                    gender: esmPatient.gender,
                    sex: esmPatient.gender,
                    age: esmPatient.birthDate ? Math.max(1, Math.floor((Date.now() - new Date(esmPatient.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))) : 30,
                    birthDate: esmPatient.birthDate || undefined,
                    phone: esmPatient.phone,
                    artNumber: esmPatient.artNumber || esmPatient.mrn,
                    hospitalNumber: esmPatient.nmrsHospitalNumber || esmPatient.mrn,
                  }}
                  mode="enter"
                  isSubmitting={savingEsmEncounter}
                  onCancel={() => setOpenEsmModal(false)}
                  onSubmit={async (formData, encounterPayload) => {
                    setSavingEsmEncounter(true);
                    try {
                      await api.post('/nmrs/encounters', {
                        patientId: esmPatient.id,
                        formSchemaId: active?.id,
                        encounterType: schemaToRender.encounterType || active?.formName,
                        formData,
                        encounterPayload,
                      });
                      enqueueSnackbar('National encounter form saved successfully.', { variant: 'success' });
                      setOpenEsmModal(false);
                      fetchPatients();
                    } catch (err: any) {
                      enqueueSnackbar(err.response?.data?.message || 'Failed to save encounter form', { variant: 'error' });
                    } finally {
                      setSavingEsmEncounter(false);
                    }
                  }}
                />
              );
            })()}
          </Box>
        )}
      </Dialog>
    </div>
  );
};

export default MPI;
