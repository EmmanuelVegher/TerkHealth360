import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Grid, Chip, TextField, InputAdornment, Skeleton, Paper, Avatar, Button, Table, TableBody, TableCell, TableHead, TableRow, Tooltip,
} from '@mui/material';
import { Search, ArrowBack, ChevronRight, SwapHoriz } from '@mui/icons-material';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { api } from '../../services/api';
import { PROGRAM_ICONS, gradient, glass, fmtDate } from './clinicTheme';

const TONES: Record<string, string> = { success: '#059669', danger: '#e11d48', warning: '#d97706' };
const PALETTE = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#22c55e'];

const ClinicDashboard: React.FC = () => {
  const { program = 'hiv-art' } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [term, setTerm] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loadingP, setLoadingP] = useState(true);

  useEffect(() => {
    setData(null); setError('');
    api.get(`/disease-clinics/${program}/dashboard`).then((r) => setData(r.data.data)).catch((e) => setError(e?.response?.data?.message || 'Failed to load clinic'));
  }, [program]);

  useEffect(() => {
    setLoadingP(true);
    const t = setTimeout(() => {
      api.get(`/disease-clinics/${program}/patients`, { params: { search: term } })
        .then((r) => setPatients(r.data.data || [])).finally(() => setLoadingP(false));
    }, term ? 350 : 0);
    return () => clearTimeout(t);
  }, [program, term]);

  const color = data?.program?.color || '#6366f1';

  if (error) return <Box p={4}><Typography color="error">{error}</Typography><Button onClick={() => nav('/clinics')}>Back to clinics</Button></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100%', background: 'linear-gradient(160deg,#f8fafc,#eef2ff 60%,#fdf2f8)' }}>
      <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: 5, color: '#fff', mb: 3, background: gradient(color), position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', right: -50, top: -50, width: 240, height: 240, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.13)' }} />
        <Button startIcon={<ArrowBack />} onClick={() => nav('/clinics')} sx={{ color: '#fff', mb: 1, textTransform: 'none' }}>All clinics</Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Avatar sx={{ width: 60, height: 60, bgcolor: 'rgba(255,255,255,0.25)', color: '#fff' }}>{PROGRAM_ICONS[program]}</Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" fontWeight={800}>{data?.program?.title || <Skeleton width={260} />}</Typography>
            <Typography sx={{ opacity: 0.9 }}>{data?.program?.subtitle}</Typography>
          </Box>
          {data && <Chip label={data.program.standards} sx={{ bgcolor: 'rgba(255,255,255,0.22)', color: '#fff', fontWeight: 700 }} />}
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(data ? data.kpis : Array.from({ length: 6 })).map((k: any, i: number) => (
          <Grid item xs={6} md={4} lg={2} key={i}>
            {!k ? <Skeleton variant="rounded" height={96} sx={{ borderRadius: 4 }} /> : (
              <Box sx={{ ...glass, p: 2, borderTop: `4px solid ${TONES[k.tone] || color}`, transition: 'transform .2s', '&:hover': { transform: 'translateY(-3px)' } }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{k.label}</Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: TONES[k.tone] || 'text.primary' }}>{typeof k.value === 'number' ? k.value.toLocaleString() : k.value}</Typography>
                {k.hint && <Typography variant="caption" color="text.secondary">{k.hint}</Typography>}
              </Box>
            )}
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <Box sx={{ ...glass, p: 3, height: 320 }}>
            <Typography fontWeight={700} mb={1}>Encounters & patients — last 12 months</Typography>
            {data?.trend?.length ? (
              <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={data.trend}>
                  <defs><linearGradient id="tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.5} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><RTooltip />
                  <Area type="monotone" dataKey="encounters" stroke={color} strokeWidth={3} fill="url(#tr)" />
                  <Area type="monotone" dataKey="patients" stroke="#0ea5e9" strokeWidth={2} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Empty text="No encounters recorded yet. Open a patient and fill the first form." />}
          </Box>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Box sx={{ ...glass, p: 3, height: 320 }}>
            <Typography fontWeight={700} mb={1}>{data?.distribution?.title || 'Patients by sex'}</Typography>
            {(() => {
              const d = (data?.distribution?.data || data?.sex || []).filter((x: any) => x.name);
              return d.length ? (
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart><Pie data={d} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                    {d.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie><RTooltip /></PieChart>
                </ResponsiveContainer>
              ) : <Empty text="Nothing to chart yet" />;
            })()}
          </Box>
        </Grid>
        <Grid item xs={12} lg={7}>
          <Box sx={{ ...glass, p: 3, height: 320 }}>
            <Typography fontWeight={700} mb={1}>Most used forms</Typography>
            {data?.topForms?.length ? (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={data.topForms} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 10 }} /><RTooltip />
                  <Bar dataKey="value" fill={color} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty text="No forms filled yet" />}
          </Box>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Box sx={{ ...glass, p: 3, height: 320, overflow: 'auto' }}>
            <Typography fontWeight={700} mb={0.5}><SwapHoriz sx={{ verticalAlign: 'middle', mr: 0.5 }} />Shared with other clinics</Typography>
            <Typography variant="caption" color="text.secondary">Patients in this clinic who also have records in…</Typography>
            {(data?.overlap || []).map((o: any) => (
              <Box key={o.id} onClick={() => nav(`/clinics/${o.id}`)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, cursor: 'pointer', '&:hover': { bgcolor: '#f8fafc' }, borderRadius: 2 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: `${o.color}22`, color: o.color }}>{PROGRAM_ICONS[o.id]}</Avatar>
                <Typography sx={{ flex: 1 }} variant="body2" fontWeight={600}>{o.title}</Typography>
                <Chip size="small" label={o.patients.toLocaleString()} sx={{ bgcolor: `${o.color}18`, color: o.color, fontWeight: 800 }} />
              </Box>
            ))}
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ ...glass, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" fontWeight={800} sx={{ flex: 1 }}>Find a patient</Typography>
          <TextField size="small" id="clinic-patient-search" placeholder="Name, MRN, ART number or NIN…" value={term} onChange={(e) => setTerm(e.target.value)} sx={{ minWidth: 320 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
        </Box>
        <Typography variant="caption" color="text.secondary">{term.length >= 2 ? 'Search results (all patients)' : 'Recently seen in this clinic'}</Typography>
        <Table size="small">
          <TableHead><TableRow><TableCell>Patient</TableCell><TableCell>ID</TableCell><TableCell>Sex / Age</TableCell><TableCell>Status</TableCell><TableCell>Last visit</TableCell><TableCell>Other clinics</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {loadingP ? <TableRow><TableCell colSpan={7}><Skeleton height={40} /></TableCell></TableRow> : patients.length === 0 ? (
              <TableRow><TableCell colSpan={7}><Empty text={term ? 'No patient matches' : 'No patients enrolled yet — search to open any patient and enrol them.'} /></TableCell></TableRow>
            ) : patients.map((p) => (
              <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => nav(`/clinics/${program}/patient/${p.id}`)}>
                <TableCell><Typography fontWeight={700}>{p.name}</Typography></TableCell>
                <TableCell>{p.artNumber || p.patientNumber}</TableCell>
                <TableCell>{p.gender} · {p.age ?? '—'}</TableCell>
                <TableCell><Chip size="small" label={p.enrolled ? `Enrolled · ${p.encounters} enc.` : 'Not enrolled'} sx={{ bgcolor: p.enrolled ? `${color}18` : '#f1f5f9', color: p.enrolled ? color : '#64748b', fontWeight: 700 }} /></TableCell>
                <TableCell>{fmtDate(p.lastVisit)}</TableCell>
                <TableCell>
                  {Object.keys(p.programs).filter((k) => k !== program).map((k) => (
                    <Tooltip key={k} title={k}><Chip size="small" label={k.split('-')[0].toUpperCase()} sx={{ mr: 0.5, fontSize: 10 }} /></Tooltip>
                  ))}
                </TableCell>
                <TableCell><ChevronRight /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};

const Empty = ({ text }: { text: string }) => (
  <Box sx={{ height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 2 }}>
    <Typography variant="body2" color="text.secondary">{text}</Typography>
  </Box>
);

export default ClinicDashboard;
