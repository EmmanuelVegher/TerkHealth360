import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Chip, TextField, InputAdornment, Skeleton, Paper, Avatar, CircularProgress } from '@mui/material';
import { Search, ArrowForward, People, EventNote, Description } from '@mui/icons-material';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import { PROGRAM_ICONS, gradient, glass, ProgramSummary, fmtDate } from './clinicTheme';

const ClinicsHub: React.FC = () => {
  const nav = useNavigate();
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api.get('/disease-clinics/programs').then((r) => setPrograms(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (term.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.get('/disease-clinics/patients/search', { params: { q: term } })
        .then((r) => setResults(r.data.data || [])).finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [term]);

  const titleOf = (id: string) => programs.find((p) => p.id === id);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100%', background: 'linear-gradient(160deg,#f8fafc 0%,#eef2ff 45%,#fdf2f8 100%)' }}>
      <Box sx={{ mb: 4, p: { xs: 3, md: 5 }, borderRadius: 5, color: '#fff', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(120deg,#0f172a 0%,#1e1b4b 50%,#4c1d95 100%)' }}>
        <Box sx={{ position: 'absolute', right: -60, top: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,#ec489966,transparent 70%)' }} />
        <Box sx={{ position: 'absolute', right: 160, bottom: -90, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,#38bdf855,transparent 70%)' }} />
        <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 3 }}>Specialty Disease Clinics</Typography>
        <Typography variant="h3" fontWeight={800} sx={{ mb: 1 }}>Choose a clinic</Typography>
        <Typography sx={{ opacity: 0.8, maxWidth: 640, mb: 3 }}>
          One connected patient record across HIV, TB, malaria, immunization, polio surveillance and maternal &amp; child health.
        </Typography>
        <TextField
          fullWidth placeholder="Search any patient by name, MRN, ART number or NIN…" value={term} onChange={(e) => setTerm(e.target.value)}
          sx={{ maxWidth: 640, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 3 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment>, endAdornment: searching ? <CircularProgress size={18} /> : null }}
        />
        {results.length > 0 && (
          <Paper sx={{ mt: 1, maxWidth: 640, borderRadius: 3, overflow: 'hidden', color: 'text.primary' }}>
            {results.map((p) => {
              const enrolled = Object.keys(p.programs);
              const target = enrolled[0] || 'hiv-art';
              return (
                <Box key={p.id} onClick={() => nav(`/clinics/${target}/patient/${p.id}`)}
                  sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { bgcolor: '#f1f5f9' } }}>
                  <Avatar sx={{ bgcolor: '#6366f1' }}>{p.name[0]}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.patientNumber} · {p.gender}{p.age != null ? ` · ${p.age}y` : ''}</Typography>
                  </Box>
                  {enrolled.map((id) => (
                    <Chip key={id} size="small" label={titleOf(id)?.title.split(' ')[0] || id}
                      sx={{ bgcolor: `${titleOf(id)?.color}22`, color: titleOf(id)?.color, fontWeight: 700 }} />
                  ))}
                </Box>
              );
            })}
          </Paper>
        )}
      </Box>

      <Grid container spacing={3}>
        {(loading ? Array.from({ length: 6 }) : programs).map((p: any, i) => (
          <Grid item xs={12} sm={6} lg={4} key={p?.id || i}>
            {!p ? <Skeleton variant="rounded" height={280} sx={{ borderRadius: 5 }} /> : (
              <Box id={`clinic-card-${p.id}`} onClick={() => nav(`/clinics/${p.id}`)}
                sx={{ cursor: 'pointer', overflow: 'hidden', ...glass, borderRadius: 5, transition: 'all .3s',
                  '&:hover': { transform: 'translateY(-8px)', boxShadow: `0 24px 48px ${p.color}44` },
                  '&:hover .arrow': { transform: 'translateX(6px)' } }}>
                <Box sx={{ p: 3, color: '#fff', background: gradient(p.color), position: 'relative' }}>
                  <Box sx={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.14)' }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', width: 48, height: 48 }}>{PROGRAM_ICONS[p.id]}</Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={800} lineHeight={1.15}>{p.title}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.85 }}>{p.standards}</Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.92 }}>{p.subtitle}</Typography>
                </Box>
                <Box sx={{ px: 3, pt: 2, pb: 1, display: 'flex', gap: 3 }}>
                  <Stat icon={<People fontSize="small" />} label="Patients" value={p.patients} />
                  <Stat icon={<EventNote fontSize="small" />} label="Last 30d" value={p.last30} />
                  <Stat icon={<Description fontSize="small" />} label="Forms" value={p.forms} />
                </Box>
                <Box sx={{ height: 56, px: 1 }}>
                  {p.sparkline.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={p.sparkline}>
                        <defs><linearGradient id={`g-${p.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={p.color} stopOpacity={0.5} /><stop offset="100%" stopColor={p.color} stopOpacity={0} /></linearGradient></defs>
                        <Area type="monotone" dataKey="v" stroke={p.color} strokeWidth={2} fill={`url(#g-${p.id})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>No activity yet — ready for first data entry</Typography>}
                </Box>
                <Box sx={{ px: 3, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">{p.encounters.toLocaleString()} total encounters</Typography>
                  <Chip className="arrow" label="Open clinic" icon={<ArrowForward />} sx={{ bgcolor: `${p.color}18`, color: p.color, fontWeight: 700, transition: 'transform .3s', '& .MuiChip-icon': { color: p.color } }} />
                </Box>
              </Box>
            )}
          </Grid>
        ))}
      </Grid>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>Metrics computed live from the shared encounter store · {fmtDate(new Date().toISOString())}</Typography>
    </Box>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{icon}{label}</Typography>
    <Typography variant="h6" fontWeight={800}>{value.toLocaleString()}</Typography>
  </Box>
);

export default ClinicsHub;
