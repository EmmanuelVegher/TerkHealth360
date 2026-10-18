import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Grid, Chip, TextField, InputAdornment, Skeleton, Avatar, Button, Dialog, Tabs, Tab, Alert, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { Search, ArrowBack, OpenInNew, Edit, Description, CheckCircle } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../../services/api';
import { EsmFormEngine } from '../../components/esm-form-engine';
import { PROGRAM_ICONS, gradient, glass, fmtDate } from './clinicTheme';
import PatientLongitudinal from './PatientLongitudinal';

const normalizeSchema = (f: any) => {
  const raw = f?.schemaJson || {};
  if (raw.pages?.length) return raw;
  return { name: f?.formName, pages: [{ label: f?.formName, sections: raw.sections || [] }] };
};

const ClinicPatientWorkspace: React.FC = () => {
  const { program = 'hiv-art', patientId = '' } = useParams();
  const nav = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [ov, setOv] = useState<any>(null);
  const [forms, setForms] = useState<any[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<{ form: any; encounter?: any } | null>(null);
  const [saving, setSaving] = useState(false);
  const [progMeta, setProgMeta] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, f, h] = await Promise.all([
        api.get(`/disease-clinics/patients/${patientId}/overview`),
        api.get(`/disease-clinics/${program}/forms`, { params: { patientId } }),
        api.get(`/disease-clinics/patients/${patientId}/encounters`, { params: { program } }),
      ]);
      setOv(o.data.data); setForms(f.data.data); setGroups(f.data.groups); setHistory(h.data.data);
      setProgMeta(o.data.data.programs.find((p: any) => p.id === program));
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Failed to load patient', { variant: 'error' });
    } finally { setLoading(false); }
  }, [patientId, program, enqueueSnackbar]);

  useEffect(() => { load(); }, [load]);

  const color = progMeta?.color || '#6366f1';
  const shown = useMemo(() => forms.filter((f) => `${f.formName} ${f.formCode} ${f.group}`.toLowerCase().includes(filter.toLowerCase())), [forms, filter]);

  const openForm = async (f: any, encounter?: any) => {
    try {
      const r = await api.get(`/disease-clinics/forms/${f.id || f.formSchemaId}`);
      setActive({ form: r.data.data, encounter });
    } catch { enqueueSnackbar('Could not load form', { variant: 'error' }); }
  };

  const submit = async (formData: any, encounterPayload: any) => {
    if (!active) return;
    setSaving(true);
    try {
      if (active.encounter) await api.put(`/nmrs/encounters/${active.encounter.id}`, { formData, encounterPayload });
      else await api.post(`/disease-clinics/patients/${patientId}/forms/${active.form.id}/submit`, { formData });
      enqueueSnackbar(`${active.form.formName} saved`, { variant: 'success' });
      setActive(null); load();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Save failed', { variant: 'error' });
    } finally { setSaving(false); }
  };

  const hiv = ov?.hiv;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100%', background: 'linear-gradient(160deg,#f8fafc,#eef2ff 60%,#fdf2f8)' }}>
      <Button startIcon={<ArrowBack />} onClick={() => nav(`/clinics/${program}`)} sx={{ mb: 1, textTransform: 'none' }}>Back to clinic dashboard</Button>

      <Box sx={{ p: 3, borderRadius: 5, color: '#fff', background: gradient(color), mb: 3, display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
        {loading && !ov ? <Skeleton width={300} height={60} sx={{ bgcolor: 'rgba(255,255,255,.3)' }} /> : ov && (<>
          <Avatar sx={{ width: 68, height: 68, bgcolor: 'rgba(255,255,255,.25)', fontSize: 28, fontWeight: 800 }}>{ov.name[0]}</Avatar>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="h5" fontWeight={800}>{ov.name}</Typography>
            <Typography sx={{ opacity: 0.9 }}>{ov.patientNumber} · {ov.gender} · {ov.age ?? '—'} yrs{ov.address ? ` · ${ov.address}` : ''}</Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {ov.allergies.length > 0 && <Chip size="small" label={`Allergies: ${ov.allergies.join(', ')}`} sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700 }} />}
              {hiv && <Chip size="small" label={`ART ${hiv.artNumber || ''} · ${hiv.regimen || 'no regimen'}`} sx={{ bgcolor: 'rgba(255,255,255,.25)', color: '#fff' }} />}
              {hiv?.viralLoad != null && <Chip size="small" label={`VL ${hiv.viralLoad}`} sx={{ bgcolor: 'rgba(255,255,255,.25)', color: '#fff' }} />}
              {hiv?.cd4 != null && <Chip size="small" label={`CD4 ${hiv.cd4}`} sx={{ bgcolor: 'rgba(255,255,255,.25)', color: '#fff' }} />}
              {ov.vitals && <Chip size="small" label={`BP ${ov.vitals.systolic ?? '-'}/${ov.vitals.diastolic ?? '-'} · ${ov.vitals.weight ?? '-'} kg`} sx={{ bgcolor: 'rgba(255,255,255,.25)', color: '#fff' }} />}
            </Box>
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,.2)', color: '#fff' }}>{PROGRAM_ICONS[program]}</Avatar>
        </>)}
      </Box>

      {ov?.alerts?.map((a: any, i: number) => (
        <Alert key={i} severity={a.level} sx={{ mb: 1, borderRadius: 3 }}
          action={<Button size="small" color="inherit" onClick={() => nav(`/clinics/${a.program}/patient/${patientId}`)}>Open</Button>}>{a.text}</Alert>
      ))}

      <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 2, mb: 1 }}>Connected clinics for this patient</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(ov?.programs || []).map((p: any) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={p.id}>
            <Box onClick={() => nav(`/clinics/${p.id}/patient/${patientId}`)}
              sx={{ ...glass, p: 2, cursor: 'pointer', height: '100%', borderTop: `4px solid ${p.enrolled ? p.color : '#cbd5e1'}`, opacity: p.enrolled ? 1 : 0.8,
                outline: p.id === program ? `2px solid ${p.color}` : 'none', transition: 'transform .2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: p.color }}>{PROGRAM_ICONS[p.id]}<Typography variant="body2" fontWeight={800} noWrap>{p.title}</Typography></Box>
              {p.enrolled ? (<>
                <Typography variant="h5" fontWeight={800}>{p.encounters}<Typography component="span" variant="caption" color="text.secondary"> encounters</Typography></Typography>
                <Typography variant="caption" color="text.secondary">Last: {fmtDate(p.lastVisit)}</Typography>
                {p.recent[0] && <Typography variant="caption" display="block" noWrap>{p.recent[0].formName}</Typography>}
              </>) : <Typography variant="caption" color="text.secondary" display="block" mt={1}>Not enrolled · click to open clinic & enrol</Typography>}
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ ...glass, p: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label={`Forms (${forms.length})`} /><Tab label={`History (${history.length})`} /><Tab label="Longitudinal view" />
        </Tabs>

        {tab === 0 && (<>
          <TextField size="small" fullWidth placeholder="Search forms…" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ mb: 2, maxWidth: 420 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
          {groups.filter((g) => shown.some((f) => f.group === g)).map((g) => (
            <Box key={g} sx={{ mb: 3 }}>
              <Typography fontWeight={800} sx={{ mb: 1, color }}>{g}</Typography>
              <Grid container spacing={2}>
                {shown.filter((f) => f.group === g).map((f) => (
                  <Grid item xs={12} sm={6} md={4} xl={3} key={f.id}>
                    <Box id={`form-card-${f.formCode}`} onClick={() => openForm(f)}
                      sx={{ p: 2, height: '100%', borderRadius: 3, cursor: 'pointer', bgcolor: '#fff', border: '1px solid #e2e8f0', transition: 'all .25s',
                        '&:hover': { borderColor: color, transform: 'translateY(-4px)', boxShadow: `0 14px 28px ${color}33` } }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
                        <Avatar sx={{ bgcolor: `${color}18`, color, width: 38, height: 38 }}><Description fontSize="small" /></Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={700} variant="body2" sx={{ lineHeight: 1.3 }}>{f.formName}</Typography>
                          <Typography variant="caption" color="text.secondary">{f.pages} page{f.pages === 1 ? '' : 's'} · v{f.version}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {f.filledCount > 0 ? <Chip size="small" icon={<CheckCircle />} label={`Filled ${f.filledCount}× · ${fmtDate(f.lastFilled)}`} sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700 }} />
                          : <Chip size="small" label="Not filled" sx={{ bgcolor: '#f1f5f9' }} />}
                        <Typography variant="caption" sx={{ color, fontWeight: 800 }}>Fill →</Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
          {shown.length === 0 && <Typography color="text.secondary">No forms match.</Typography>}
        </>)}

        {tab === 1 && (
          <Table size="small">
            <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Form</TableCell><TableCell>Clinician</TableCell><TableCell>Sync</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {history.length === 0 && <TableRow><TableCell colSpan={5}>No encounters in this clinic yet.</TableCell></TableRow>}
              {history.map((h) => (
                <TableRow key={h.id} hover>
                  <TableCell>{fmtDate(h.encounterDate)}</TableCell><TableCell>{h.formName}</TableCell><TableCell>{h.clinicianName || '—'}</TableCell>
                  <TableCell><Chip size="small" label={h.syncStatus} /></TableCell>
                  <TableCell><Button size="small" startIcon={<Edit />} onClick={() => openForm({ id: h.formSchemaId }, h)}>Open</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {tab === 2 && <PatientLongitudinal patientId={patientId} />}
      </Box>

      <Dialog open={!!active} onClose={() => !saving && setActive(null)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', p: 0 } }}>
        {active && ov && (
          <EsmFormEngine
            schema={normalizeSchema(active.form)}
            patientContext={{ id: ov.id, uuid: ov.id, patientNumber: ov.patientNumber, name: ov.name, firstName: ov.name.split(' ')[0], lastName: ov.name.split(' ').slice(1).join(' '),
              gender: ov.gender, sex: ov.gender, age: ov.age, birthDate: ov.birthDate, phone: ov.phone, address: ov.address, artNumber: hiv?.artNumber } as any}
            initialValues={active.encounter?.formData || {}}
            mode={active.encounter ? 'edit' : 'enter'}
            isSubmitting={saving}
            onCancel={() => setActive(null)}
            onSubmit={submit}
          />
        )}
      </Dialog>
    </Box>
  );
};

export default ClinicPatientWorkspace;
