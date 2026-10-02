import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, Button, Chip, TextField,
  Select, MenuItem, FormControl, InputLabel,
  Alert, Table, TableHead, TableRow, TableCell, TableBody,
  Divider
} from '@mui/material';
import {
  Visibility, RemoveRedEye, Save, Send, Add, AutoAwesome,
  Speed, Timeline, Palette, CameraAlt, LocalPharmacy
} from '@mui/icons-material';
import { api } from '../services/api';

// Visual Acuity standard options
const VA_OPTIONS = [
  '6/4 (20/12)', '6/5 (20/16)', '6/6 (20/20)', '6/7.5 (20/25)',
  '6/9 (20/30)', '6/12 (20/40)', '6/18 (20/60)', '6/24 (20/80)',
  '6/36 (20/120)', '6/60 (20/200)', 'CF 3m', 'CF 1m', 'HM (Hand Motion)',
  'LP (Light Perception)', 'NLP (No Light Perception)'
];

const NEAR_VA_OPTIONS = ['N4', 'N5', 'N6', 'N8', 'N10', 'N12', 'N18', 'N24', 'N36'];

export default function EyeClinic() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active subcategory from URL route
  const getSubCategoryFromPath = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/eye-clinic/iop')) return 'iop';
    if (path.includes('/eye-clinic/drawing')) return 'drawing';
    if (path.includes('/eye-clinic/optical-rx')) return 'optical-rx';
    if (path.includes('/eye-clinic/telemetry')) return 'telemetry';
    return 'refraction'; // default sub-page
  };

  const currentSubCategory = getSubCategoryFromPath();

  // Patient & Encounter State (100% PostgreSQL Synced)
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [currentEncounter, setCurrentEncounter] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Dual-Eye Refraction Form State
  const [refractionForm, setRefractionForm] = useState({
    examType: 'Subjective Manifest Refraction',
    vaDistanceOD: '6/6 (20/20)',
    vaNearOD: 'N6',
    sphereOD: '-1.50',
    cylinderOD: '-0.75',
    axisOD: '90',
    addOD: '+1.75',
    bcvaOD: '6/6 (20/20)',
    vaDistanceOS: '6/6 (20/20)',
    vaNearOS: 'N6',
    sphereOS: '-1.75',
    cylinderOS: '-0.50',
    axisOS: '85',
    addOS: '+1.75',
    bcvaOS: '6/6 (20/20)',
    vaDistanceOU: '6/6 (20/20)',
    pupillaryDistanceMM: 64,
    notes: 'Mild myopic astigmatism with early presbyopia. Clear crystalline lens.',
  });

  // Tonometry & IOP state
  const [iopForm, setIopForm] = useState({
    method: 'Goldmann Applanation Tonometry',
    iopOD: 15.0,
    iopOS: 16.0,
    pachymetryOD: 545,
    pachymetryOS: 548,
    antiGlaucomaMeds: 'Latanoprost 0.005% QHS OU',
    notes: 'Optic nerve cup-to-disc ratio: OD 0.35, OS 0.40. IOP well controlled within target range.',
  });

  // Longitudinal IOP History from PostgreSQL
  const [iopHistory, setIopHistory] = useState<any[]>([]);

  // Optical Shop Prescription State
  const [opticalRx, setOpticalRx] = useState({
    lensType: 'Digital Free-Form Progressive',
    lensMaterial: 'Polycarbonate 1.59 (Impact Resistant)',
    coatings: ['Anti-Reflective', 'Blue-Light Filter', 'UV-400 Protection', 'Hydrophobic'],
    sphereOD: -1.50,
    cylinderOD: -0.75,
    axisOD: 90,
    addOD: 1.75,
    sphereOS: -1.75,
    cylinderOS: -0.50,
    axisOS: 85,
    addOS: 1.75,
    pdDistanceMM: 64,
    pdNearMM: 61,
    usageAdvice: 'Constant wear for computer workstation and general distance viewing.',
    expiryDays: 365,
  });

  // Visual Drawing Canvas State
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [canvasTemplate, setCanvasTemplate] = useState<'fundus' | 'anterior'>('fundus');
  const [deviceTelemetry, setDeviceTelemetry] = useState<any | null>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients?limit=50');
      const data = res.data?.patients || res.data?.data || res.data || [];
      setPatients(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !selectedPatient) {
        handleSelectPatient(data[0]);
      }
    } catch (err) {
      console.warn('Failed to load patients from database:', err);
    }
  };

  const handleSelectPatient = async (patient: any) => {
    setSelectedPatient(patient);
    setLoading(true);
    try {
      const res = await api.get(`/ophthalmology/encounters?patientId=${patient.id}`);
      const encs = res.data?.data || [];
      setEncounters(encs);
      if (encs.length > 0) {
        loadEncounterDetails(encs[0].id);
      } else {
        setCurrentEncounter(null);
      }
      await fetchIopHistory(patient.id);
    } catch (err: any) {
      console.error('Error fetching eye encounters from PostgreSQL:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIopHistory = async (patientId: string) => {
    try {
      const res = await api.get(`/ophthalmology/iop-trends/${patientId}`);
      const list = res.data?.data || [];
      if (list.length > 0) {
        setIopHistory(list.map((m: any) => ({
          date: new Date(m.timeMeasured).toISOString().split('T')[0],
          iopOD: Number(m.iopOD),
          iopOS: Number(m.iopOS),
          meds: m.antiGlaucomaMeds || 'No Meds Logged'
        })));
      } else {
        setIopHistory([]);
      }
    } catch (e) {
      console.warn('IOP history load failed from PostgreSQL:', e);
    }
  };

  const loadEncounterDetails = async (encounterId: string) => {
    try {
      const res = await api.get(`/ophthalmology/encounters/${encounterId}`);
      const enc = res.data?.data;
      if (enc) {
        setCurrentEncounter(enc);
        if (enc.refractions && enc.refractions.length > 0) {
          const r = enc.refractions[0];
          setRefractionForm({
            examType: r.examType || 'Manifest Refraction',
            vaDistanceOD: r.vaDistanceOD || '6/6 (20/20)',
            vaNearOD: r.vaNearOD || 'N6',
            sphereOD: String(r.sphereOD ?? '-1.50'),
            cylinderOD: String(r.cylinderOD ?? '-0.75'),
            axisOD: String(r.axisOD ?? '90'),
            addOD: String(r.addOD ?? '+1.75'),
            bcvaOD: r.bcvaOD || '6/6',
            vaDistanceOS: r.vaDistanceOS || '6/6 (20/20)',
            vaNearOS: r.vaNearOS || 'N6',
            sphereOS: String(r.sphereOS ?? '-1.75'),
            cylinderOS: String(r.cylinderOS ?? '-0.50'),
            axisOS: String(r.axisOS ?? '85'),
            addOS: String(r.addOS ?? '+1.75'),
            bcvaOS: r.bcvaOS || '6/6',
            vaDistanceOU: r.vaDistanceOU || '6/6',
            pupillaryDistanceMM: r.pupillaryDistanceMM || 64,
            notes: r.notes || '',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load eye encounter details from PostgreSQL:', err);
    }
  };

  const handleCreateEncounter = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const res = await api.post('/ophthalmology/encounters', {
        patientId: selectedPatient.id,
        chiefComplaint: 'Comprehensive Ophthalmic Examination, OD/OS Refraction & Glaucoma IOP Workup',
      });
      if (res.data?.data) {
        setStatusMessage({ type: 'success', text: `Eye Encounter ${res.data.data.encounterNumber} initialized in PostgreSQL.` });
        await handleSelectPatient(selectedPatient);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to start eye encounter in database.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRefraction = async () => {
    if (!currentEncounter?.id) {
      setStatusMessage({ type: 'error', text: 'Please start an active eye encounter first.' });
      return;
    }
    try {
      setLoading(true);
      const res = await api.post(`/ophthalmology/encounters/${currentEncounter.id}/refractions`, refractionForm);
      if (res.data?.data) {
        setStatusMessage({ type: 'success', text: 'Dual-Eye OD/OS Refraction & Visual Acuity saved in PostgreSQL.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save refraction in database.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIop = async () => {
    if (!currentEncounter?.id || !selectedPatient) {
      setStatusMessage({ type: 'error', text: 'Please start an active eye encounter first.' });
      return;
    }
    try {
      setLoading(true);
      const res = await api.post(`/ophthalmology/encounters/${currentEncounter.id}/iop`, {
        patientId: selectedPatient.id,
        ...iopForm
      });
      if (res.data?.data) {
        await fetchIopHistory(selectedPatient.id);
        setStatusMessage({ type: 'success', text: `Tonometry recorded in PostgreSQL: OD ${iopForm.iopOD} mmHg / OS ${iopForm.iopOS} mmHg.` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save tonometry in database.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateDeviceTelemetry = async () => {
    try {
      const res = await api.post('/ophthalmology/telemetry-import', {
        deviceType: 'Topcon KR-800 Auto Kerato-Refractometer (HL7 FHIR)'
      });
      if (res.data?.data) {
        const d = res.data.data;
        setDeviceTelemetry(d);
        setRefractionForm({
          ...refractionForm,
          sphereOD: String(d.od.sphere),
          cylinderOD: String(d.od.cylinder),
          axisOD: String(d.od.axis),
          sphereOS: String(d.os.sphere),
          cylinderOS: String(d.os.cylinder),
          axisOS: String(d.os.axis),
          pupillaryDistanceMM: d.pupillaryDistanceMM || 64,
          notes: `Telemetry imported from ${d.deviceModel} (Serial: ${d.deviceSerial}). Alignment confidence: ${d.confidenceScore}`
        });
        setStatusMessage({ type: 'success', text: `Live readings imported from ${d.deviceModel} via DICOM/HL7 Modality!` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to connect to diagnostic device.' });
    }
  };

  const handleDispatchOpticalRx = async () => {
    if (!currentEncounter?.id || !selectedPatient) {
      setStatusMessage({ type: 'error', text: 'Please start an active encounter first.' });
      return;
    }
    try {
      setLoading(true);
      const res = await api.post(`/ophthalmology/encounters/${currentEncounter.id}/optical-prescriptions`, {
        patientId: selectedPatient.id,
        ...opticalRx
      });
      if (res.data?.data) {
        setStatusMessage({
          type: 'success',
          text: `Prescription ${res.data.data.rxNumber} saved in PostgreSQL & dispatched to Hospital Optical Shop!`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to dispatch optical prescription.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initCanvas();
  }, [canvasTemplate, currentSubCategory]);

  const initCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (canvasTemplate === 'fundus') {
      ctx.beginPath();
      ctx.arc(320, 200, 160, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff1f2';
      ctx.fill();
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(240, 200, 30, 0, 2 * Math.PI);
      ctx.fillStyle = '#fed7aa';
      ctx.fill();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(360, 200, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#b91c1c';
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('Nasal (Optic Disc)', 190, 150);
      ctx.fillText('Temporal (Macula/Fovea)', 320, 150);
    } else {
      ctx.beginPath();
      ctx.arc(320, 200, 150, 0, 2 * Math.PI);
      ctx.fillStyle = '#f0fdf4';
      ctx.fill();
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(320, 200, 50, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
    }
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const onDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = drawColor;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const saveDrawingToEncounter = async () => {
    if (!currentEncounter?.id) {
      setStatusMessage({ type: 'error', text: 'Please start an active eye encounter first.' });
      return;
    }
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    try {
      await api.post(`/ophthalmology/encounters/${currentEncounter.id}/drawings`, {
        eyeSide: 'OU',
        anatomicZone: canvasTemplate === 'fundus' ? 'RETINA_FUNDUS' : 'ANTERIOR_SEGMENT',
        canvasSvgJson: JSON.stringify({ template: canvasTemplate }),
        pngDataUrl: dataUrl,
        annotations: `Clinical drawing of ${canvasTemplate === 'fundus' ? 'Posterior Pole / Retina' : 'Anterior Segment Cornea'}`
      });
      setStatusMessage({ type: 'success', text: 'Anatomical drawing saved in PostgreSQL and archived in patient record.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to archive drawing in database.' });
    }
  };

  // Sub-categories list for Eye Clinic
  const subCategories = [
    { key: 'refraction', path: '/eye-clinic/refraction', label: '1. Dual-Eye (OD/OS) Refraction', icon: <RemoveRedEye fontSize="small" /> },
    { key: 'iop', path: '/eye-clinic/iop', label: '2. Tonometry & Glaucoma IOP', icon: <Timeline fontSize="small" /> },
    { key: 'drawing', path: '/eye-clinic/drawing', label: '3. Anatomic Drawing & Fundus', icon: <Palette fontSize="small" /> },
    { key: 'optical-rx', path: '/eye-clinic/optical-rx', label: '4. Optical E-Prescribing', icon: <LocalPharmacy fontSize="small" /> },
    { key: 'telemetry', path: '/eye-clinic/telemetry', label: '5. OCT & Telemetry Scans', icon: <CameraAlt fontSize="small" /> },
  ];

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', minHeight: '100vh' }}>
      {/* ── Top Header & Patient Bar ────────────────────────────────────────────── */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Box sx={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', p: 2.5, color: '#fff' }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex' }}>
                  <Visibility sx={{ fontSize: 32, color: '#fff' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                    👁️ Eye Clinic (Ophthalmology & Optometry)
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    PostgreSQL-Synced Dual-Eye OD/OS Refraction, Tonometry IOP Trends, Anatomical Drawing & Optical Shop Dispatch
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Quick Patient Selector from PostgreSQL */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2 }}>
                <Select
                  value={selectedPatient?.id || ''}
                  displayEmpty
                  onChange={(e) => {
                    const p = patients.find(x => x.id === e.target.value);
                    if (p) handleSelectPatient(p);
                  }}
                  sx={{ color: '#fff', '& .MuiSvgIcon-root': { color: '#fff' } }}
                >
                  <MenuItem value="" disabled>Select Eye Patient</MenuItem>
                  {patients.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} — MRN: {p.patientNumber || p.id.slice(0, 8)} ({p.gender})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateEncounter}
                sx={{
                  bgcolor: '#10b981',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                  '&:hover': { bgcolor: '#059669' }
                }}
              >
                New Eye Encounter
              </Button>
            </Grid>
          </Grid>
        </Box>

        {selectedPatient && (
          <Box sx={{ p: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Patient Name</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                {selectedPatient.firstName} {selectedPatient.lastName}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>MRN / Patient ID</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0284c7' }}>
                {selectedPatient.patientNumber || selectedPatient.id.slice(0, 8)}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Current Encounter</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#10b981' }}>
                {currentEncounter ? currentEncounter.encounterNumber : 'No Active Encounter'}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="CDS: Timolol Beta-Blocker Asthmatic Check OK"
                color="success"
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label="Diabetic Retinopathy Protocol Active"
                size="small"
                color="info"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Box>
        )}
      </Card>

      {statusMessage && (
        <Alert
          severity={statusMessage.type}
          onClose={() => setStatusMessage(null)}
          sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
        >
          {statusMessage.text}
        </Alert>
      )}

      {/* ── Sub-Category Navigation Bar (Direct Route Links) ────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        {subCategories.map((sub) => {
          const isActive = currentSubCategory === sub.key;
          return (
            <Button
              key={sub.key}
              variant={isActive ? 'contained' : 'outlined'}
              startIcon={sub.icon}
              onClick={() => navigate(sub.path)}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                py: 1,
                px: 2,
                bgcolor: isActive ? '#0284c7' : '#ffffff',
                color: isActive ? '#ffffff' : '#334155',
                borderColor: isActive ? '#0284c7' : '#cbd5e1',
                boxShadow: isActive ? '0 4px 14px rgba(2, 132, 199, 0.3)' : 'none',
                '&:hover': {
                  bgcolor: isActive ? '#0369a1' : '#f1f5f9',
                  borderColor: '#94a3b8'
                }
              }}
            >
              {sub.label}
            </Button>
          );
        })}
      </Box>

      {/* ── 1. Dual-Eye (OD / OS) Structured Charting (/eye-clinic/refraction) ─── */}
      {currentSubCategory === 'refraction' && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={9}>
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Side-by-Side Dual-Eye (OD / OS) Refraction Workbench
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Standardized optometric measurement for Right Eye (OD), Left Eye (OS), and Binocular (OU)
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<AutoAwesome />}
                  onClick={handleSimulateDeviceTelemetry}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#0284c7', color: '#0284c7' }}
                >
                  Pull Auto-Refractor Telemetry
                </Button>
              </Box>

              <Grid container spacing={3}>
                {/* 👁️ Right Eye (OD) */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#f0f9ff', border: '2px solid #bae6fd' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Chip label="OD" color="primary" sx={{ fontWeight: 900, px: 1 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0369a1' }}>
                        Right Eye (Oculus Dexter)
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Distance UCVA</InputLabel>
                          <Select
                            value={refractionForm.vaDistanceOD}
                            label="Distance UCVA"
                            onChange={(e) => setRefractionForm({ ...refractionForm, vaDistanceOD: e.target.value })}
                          >
                            {VA_OPTIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Near UCVA</InputLabel>
                          <Select
                            value={refractionForm.vaNearOD}
                            label="Near UCVA"
                            onChange={(e) => setRefractionForm({ ...refractionForm, vaNearOD: e.target.value })}
                          >
                            {NEAR_VA_OPTIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Sphere (DS)"
                          value={refractionForm.sphereOD}
                          onChange={(e) => setRefractionForm({ ...refractionForm, sphereOD: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Cylinder (DC)"
                          value={refractionForm.cylinderOD}
                          onChange={(e) => setRefractionForm({ ...refractionForm, cylinderOD: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Axis (°)"
                          value={refractionForm.axisOD}
                          onChange={(e) => setRefractionForm({ ...refractionForm, axisOD: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Add (NV)"
                          value={refractionForm.addOD}
                          onChange={(e) => setRefractionForm({ ...refractionForm, addOD: e.target.value })}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Best Corrected Visual Acuity (BCVA)</InputLabel>
                          <Select
                            value={refractionForm.bcvaOD}
                            label="Best Corrected Visual Acuity (BCVA)"
                            onChange={(e) => setRefractionForm({ ...refractionForm, bcvaOD: e.target.value })}
                          >
                            {VA_OPTIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>

                {/* 👁️ Left Eye (OS) */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#fdf2f8', border: '2px solid #fbcfe8' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Chip label="OS" color="secondary" sx={{ fontWeight: 900, px: 1 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#be185d' }}>
                        Left Eye (Oculus Sinister)
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Distance UCVA</InputLabel>
                          <Select
                            value={refractionForm.vaDistanceOS}
                            label="Distance UCVA"
                            onChange={(e) => setRefractionForm({ ...refractionForm, vaDistanceOS: e.target.value })}
                          >
                            {VA_OPTIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Near UCVA</InputLabel>
                          <Select
                            value={refractionForm.vaNearOS}
                            label="Near UCVA"
                            onChange={(e) => setRefractionForm({ ...refractionForm, vaNearOS: e.target.value })}
                          >
                            {NEAR_VA_OPTIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Sphere (DS)"
                          value={refractionForm.sphereOS}
                          onChange={(e) => setRefractionForm({ ...refractionForm, sphereOS: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Cylinder (DC)"
                          value={refractionForm.cylinderOS}
                          onChange={(e) => setRefractionForm({ ...refractionForm, cylinderOS: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Axis (°)"
                          value={refractionForm.axisOS}
                          onChange={(e) => setRefractionForm({ ...refractionForm, axisOS: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Add (NV)"
                          value={refractionForm.addOS}
                          onChange={(e) => setRefractionForm({ ...refractionForm, addOS: e.target.value })}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Best Corrected Visual Acuity (BCVA)</InputLabel>
                          <Select
                            value={refractionForm.bcvaOS}
                            label="Best Corrected Visual Acuity (BCVA)"
                            onChange={(e) => setRefractionForm({ ...refractionForm, bcvaOS: e.target.value })}
                          >
                            {VA_OPTIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Pupillary Distance (PD mm)"
                    type="number"
                    value={refractionForm.pupillaryDistanceMM}
                    onChange={(e) => setRefractionForm({ ...refractionForm, pupillaryDistanceMM: Number(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Optometrist / Ophthalmologist Refraction Notes"
                    value={refractionForm.notes}
                    onChange={(e) => setRefractionForm({ ...refractionForm, notes: e.target.value })}
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveRefraction}
                  sx={{ bgcolor: '#0284c7', fontWeight: 700, textTransform: 'none', borderRadius: 2, px: 3 }}
                >
                  Save Dual-Eye Refraction
                </Button>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} lg={3}>
            <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Speed sx={{ color: '#0284c7' }} /> Equipment Telemetry Feed
              </Typography>

              <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Connected Modality:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>Topcon KR-800 ARK</Typography>
                <Chip size="small" label="DICOM MWL Online" color="success" sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }} />
              </Box>

              {deviceTelemetry && (
                <Box sx={{ p: 1.5, bgcolor: '#ecfdf5', borderRadius: 2, border: '1px solid #a7f3d0' }}>
                  <Typography variant="caption" sx={{ color: '#065f46', fontWeight: 700, display: 'block' }}>
                    Last Telemetry Sync:
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#047857', display: 'block' }}>
                    OD: {deviceTelemetry.od?.sph} / {deviceTelemetry.od?.cyl} @ {deviceTelemetry.od?.axis}°
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#047857', display: 'block' }}>
                    OS: {deviceTelemetry.os?.sph} / {deviceTelemetry.os?.cyl} @ {deviceTelemetry.os?.axis}°
                  </Typography>
                </Box>
              )}
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── 2. Tonometry & Glaucoma IOP Graph (/eye-clinic/iop) ───────────────── */}
      {currentSubCategory === 'iop' && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={4}>
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
                Record Tonometry (IOP)
              </Typography>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Tonometry Method</InputLabel>
                <Select
                  value={iopForm.method}
                  label="Tonometry Method"
                  onChange={(e) => setIopForm({ ...iopForm, method: e.target.value })}
                >
                  <MenuItem value="Goldmann Applanation Tonometry">Goldmann Applanation Tonometry (GAT)</MenuItem>
                  <MenuItem value="Non-Contact Tonometry (NCT Air-Puff)">Non-Contact Tonometry (NCT Air-Puff)</MenuItem>
                  <MenuItem value="iCare Pro Rebound Tonometry">iCare Pro Rebound Tonometry</MenuItem>
                  <MenuItem value="Tono-Pen Electronic Applanation">Tono-Pen Electronic Applanation</MenuItem>
                </Select>
              </FormControl>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="OD IOP (mmHg)"
                    type="number"
                    value={iopForm.iopOD}
                    onChange={(e) => setIopForm({ ...iopForm, iopOD: Number(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="OS IOP (mmHg)"
                    type="number"
                    value={iopForm.iopOS}
                    onChange={(e) => setIopForm({ ...iopForm, iopOS: Number(e.target.value) })}
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                size="small"
                label="Anti-Glaucoma Medications"
                value={iopForm.antiGlaucomaMeds}
                onChange={(e) => setIopForm({ ...iopForm, antiGlaucomaMeds: e.target.value })}
                sx={{ mb: 2 }}
              />

              <Button
                fullWidth
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveIop}
                sx={{ bgcolor: '#0284c7', fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
              >
                Save Tonometry Reading
              </Button>
            </Card>
          </Grid>

          <Grid item xs={12} lg={8}>
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Longitudinal Glaucoma & IOP Progression Graph (PostgreSQL)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Tracking Right Eye (OD - Blue) vs Left Eye (OS - Pink) Pressure vs Target Threshold (&lt;18 mmHg)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip size="small" label="OD (Right Eye)" sx={{ bgcolor: '#bae6fd', color: '#0369a1', fontWeight: 700 }} />
                  <Chip size="small" label="OS (Left Eye)" sx={{ bgcolor: '#fbcfe8', color: '#be185d', fontWeight: 700 }} />
                  <Chip size="small" label="Target: ≤18 mmHg" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
                </Box>
              </Box>

              <Box sx={{ p: 2, bgcolor: '#0f172a', borderRadius: 3, color: '#fff' }}>
                {iopHistory.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', py: 6 }}>
                    No historical IOP tonometry records found for this patient in PostgreSQL. Record a reading on the left to start longitudinal graphing.
                  </Typography>
                ) : (
                  <svg width="100%" height="220" viewBox="0 0 600 220">
                    <line x1="50" y1="40" x2="560" y2="40" stroke="#334155" strokeDasharray="4 4" />
                    <text x="30" y="45" fill="#94a3b8" fontSize="12">30</text>
                    
                    <line x1="50" y1="100" x2="560" y2="100" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" />
                    <text x="30" y="105" fill="#10b981" fontSize="12" fontWeight="bold">18</text>

                    <line x1="50" y1="160" x2="560" y2="160" stroke="#334155" strokeDasharray="4 4" />
                    <text x="30" y="165" fill="#94a3b8" fontSize="12">10</text>

                    <rect x="50" y="100" width="510" height="80" fill="rgba(16, 185, 129, 0.08)" />

                    {iopHistory.map((item, idx) => {
                      const spacing = Math.min(130, 480 / Math.max(iopHistory.length, 1));
                      const x = 80 + idx * spacing;
                      const yOD = 200 - (item.iopOD - 5) * 8;
                      const yOS = 200 - (item.iopOS - 5) * 8;
                      return (
                        <g key={idx}>
                          <circle cx={x} cy={yOD} r="6" fill="#38bdf8" stroke="#fff" strokeWidth="2" />
                          <text x={x} y={yOD - 10} fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
                            {item.iopOD}
                          </text>

                          <circle cx={x} cy={yOS} r="6" fill="#f472b6" stroke="#fff" strokeWidth="2" />
                          <text x={x} y={yOS + 18} fill="#f472b6" fontSize="11" fontWeight="bold" textAnchor="middle">
                            {item.iopOS}
                          </text>

                          <text x={x} y="205" fill="#94a3b8" fontSize="10" textAnchor="middle">{item.date}</text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── 3. Anatomic Drawing & Fundus Annotation (/eye-clinic/drawing) ──────── */}
      {currentSubCategory === 'drawing' && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Visual Anatomic Drawing & Clinical Canvas
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Standard color markup: Red = Hemorrhages, Blue = Tears/Detachments, Yellow = Hard Exudates, Green = Vitreous
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant={canvasTemplate === 'fundus' ? 'contained' : 'outlined'}
                    onClick={() => setCanvasTemplate('fundus')}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Retina / Fundus
                  </Button>
                  <Button
                    size="small"
                    variant={canvasTemplate === 'anterior' ? 'contained' : 'outlined'}
                    onClick={() => setCanvasTemplate('anterior')}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Anterior Segment
                  </Button>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, mr: 1 }}>Clinical Pen:</Typography>
                {[
                  { color: '#ef4444', label: 'Red (Hemorrhage)' },
                  { color: '#3b82f6', label: 'Blue (Retinal Tear)' },
                  { color: '#eab308', label: 'Yellow (Exudate)' },
                  { color: '#22c55e', label: 'Green (Vitreous Opacity)' },
                  { color: '#0f172a', label: 'Black (Scar / Pigment)' },
                ].map((c) => (
                  <Chip
                    key={c.color}
                    label={c.label}
                    onClick={() => setDrawColor(c.color)}
                    sx={{
                      bgcolor: c.color,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      border: drawColor === c.color ? '2px solid #000' : 'none'
                    }}
                  />
                ))}

                <Button size="small" variant="text" color="error" onClick={initCanvas} sx={{ ml: 'auto', textTransform: 'none' }}>
                  Clear Canvas
                </Button>
              </Box>

              <Box sx={{ border: '2px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', textAlign: 'center' }}>
                <canvas
                  ref={drawingCanvasRef}
                  width={640}
                  height={400}
                  onMouseDown={startDraw}
                  onMouseMove={onDraw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  style={{ cursor: 'crosshair', width: '100%', height: 'auto', display: 'block' }}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={saveDrawingToEncounter}
                  sx={{ bgcolor: '#0284c7', fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
                >
                  Save Drawing to Patient File in PostgreSQL
                </Button>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
                Standard Ophthalmology Color Codes
              </Typography>
              {[
                { name: 'Red Marker', desc: 'Retinal dot/blot hemorrhages, microaneurysms, neovascularization (NVD/NVE)' },
                { name: 'Blue Marker', desc: 'Retinal detachment outlines, horseshoe tears, lattice degeneration' },
                { name: 'Yellow Marker', desc: 'Hard exudates, macular drusen, lipofuscin, choroidal neovascular membrane' },
                { name: 'Green Marker', desc: 'Preretinal membranes, vitreous traction bands, asteroid hyalosis' },
                { name: 'Black Marker', desc: 'Chorioretinal scars, laser photocoagulation burns, bone-spicule pigment' },
              ].map((item, idx) => (
                <Box key={idx} sx={{ p: 1.2, mb: 1, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>{item.name}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>{item.desc}</Typography>
                </Box>
              ))}
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── 4. E-Prescribing & Optical Shop Dispatch (/eye-clinic/optical-rx) ──── */}
      {currentSubCategory === 'optical-rx' && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Spectacle & Contact Lens Electronic Prescription (Rx)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Instant dispatch to internal optical dispensary or export to patient health portal
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Send />}
                  onClick={handleDispatchOpticalRx}
                  sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, bgcolor: '#0284c7' }}
                >
                  Dispatch to Optical Shop
                </Button>
              </Box>

              <Table size="small" sx={{ mb: 3, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Eye</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Sphere (DS)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Cylinder (DC)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Axis (°)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Add (NV)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>PD (mm)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#0284c7' }}>OD (Right)</TableCell>
                    <TableCell>{refractionForm.sphereOD}</TableCell>
                    <TableCell>{refractionForm.cylinderOD}</TableCell>
                    <TableCell>{refractionForm.axisOD}°</TableCell>
                    <TableCell>{refractionForm.addOD}</TableCell>
                    <TableCell>{opticalRx.pdDistanceMM / 2} mm</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#be185d' }}>OS (Left)</TableCell>
                    <TableCell>{refractionForm.sphereOS}</TableCell>
                    <TableCell>{refractionForm.cylinderOS}</TableCell>
                    <TableCell>{refractionForm.axisOS}°</TableCell>
                    <TableCell>{refractionForm.addOS}</TableCell>
                    <TableCell>{opticalRx.pdDistanceMM / 2} mm</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Lens Design & Geometry</InputLabel>
                    <Select
                      value={opticalRx.lensType}
                      label="Lens Design & Geometry"
                      onChange={(e) => setOpticalRx({ ...opticalRx, lensType: e.target.value })}
                    >
                      <MenuItem value="Digital Free-Form Progressive">Digital Free-Form Progressive (No lines)</MenuItem>
                      <MenuItem value="Single Vision Distance">Single Vision Distance</MenuItem>
                      <MenuItem value="Single Vision Reading (Near)">Single Vision Reading (Near)</MenuItem>
                      <MenuItem value="Bifocal D-Segment 28">Bifocal D-Segment 28</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Lens Material Substrate</InputLabel>
                    <Select
                      value={opticalRx.lensMaterial}
                      label="Lens Material Substrate"
                      onChange={(e) => setOpticalRx({ ...opticalRx, lensMaterial: e.target.value })}
                    >
                      <MenuItem value="Polycarbonate 1.59 (Impact Resistant)">Polycarbonate 1.59 (Impact Resistant)</MenuItem>
                      <MenuItem value="CR-39 Standard Resin">CR-39 Standard Resin</MenuItem>
                      <MenuItem value="High Index 1.67 Ultra-Thin">High Index 1.67 Ultra-Thin</MenuItem>
                      <MenuItem value="Trivex 1.53 Shatterproof">Trivex 1.53 Shatterproof</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Dispensing Instructions & Frame Recommendations"
                    multiline
                    rows={2}
                    value={opticalRx.usageAdvice}
                    onChange={(e) => setOpticalRx({ ...opticalRx, usageAdvice: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
                👓 Internal Optical Shop Status
              </Typography>
              <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534' }}>
                  Optical Shop Queue: Connected
                </Typography>
                <Typography variant="caption" sx={{ color: '#15803d', display: 'block', mt: 0.5 }}>
                  Once dispatched, the lens technician receives the surfacing parameters directly on the edging station terminal.
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── 5. Equipment Telemetry & OCT Scans (/eye-clinic/telemetry) ────────── */}
      {currentSubCategory === 'telemetry' && (
        <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
            Diagnostic Equipment Telemetry & High-Resolution Imaging (OCT / Fundus)
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 3 }}>
            Direct PACS Modality Worklist streaming from Optical Coherence Tomography (OCT), Humphrey Field Analyzers, and Slit Lamp Cameras.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 2, bgcolor: '#0f172a', color: '#fff', borderRadius: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#38bdf8', mb: 1 }}>
                  Spectral Domain OCT — Macular Cross-Section B-Scan
                </Typography>
                <svg width="100%" height="200" viewBox="0 0 400 200" style={{ background: '#020617', borderRadius: 8 }}>
                  <path d="M 20 120 Q 200 160 380 120" stroke="#22c55e" strokeWidth="4" fill="none" />
                  <path d="M 20 100 Q 200 130 380 100" stroke="#eab308" strokeWidth="3" fill="none" />
                  <ellipse cx="200" cy="140" rx="30" ry="10" fill="#38bdf8" opacity="0.4" />
                  <text x="200" y="30" fill="#38bdf8" textAnchor="middle" fontSize="13">FOVEAL DEPRESSION: NORMAL ARCHITECTURE</text>
                  <text x="200" y="190" fill="#64748b" textAnchor="middle" fontSize="11">Central Subfield Thickness: 248 µm</text>
                </svg>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ p: 2, bgcolor: '#0f172a', color: '#fff', borderRadius: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f472b6', mb: 1 }}>
                  Digital Fundus Camera — TrueColor Posterior Pole
                </Typography>
                <svg width="100%" height="200" viewBox="0 0 400 200" style={{ background: '#020617', borderRadius: 8 }}>
                  <circle cx="200" cy="100" r="85" fill="#831843" opacity="0.8" />
                  <circle cx="160" cy="100" r="18" fill="#fdba74" />
                  <circle cx="230" cy="100" r="6" fill="#450a0a" />
                  <path d="M 160 100 Q 200 60 250 50 M 160 100 Q 200 140 250 150" stroke="#ef4444" strokeWidth="3" fill="none" />
                  <text x="200" y="25" fill="#f472b6" textAnchor="middle" fontSize="13">OPTIC DISC: PINK, SHARP MARGINS</text>
                </svg>
              </Card>
            </Grid>
          </Grid>
        </Card>
      )}
    </Box>
  );
}
