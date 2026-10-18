import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Skeleton,
  Button,
  Stack,
  Card,
  CardContent,
  Avatar,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import {
  OpenInNew,
  TrendingUp,
  MonitorHeart,
  Bloodtype,
  Vaccines,
  BugReport,
  AccessTime,
  CheckCircle,
  Speed,
  Shield,
  Healing,
  LocalHospital,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import { api } from '../../services/api';
import { PROGRAM_ICONS, fmtDate } from './clinicTheme';

const TITLES: Record<string, { t: string; c: string; bg: string }> = {
  'hiv-art': { t: 'HIV / ART Clinic', c: '#e11d48', bg: '#ffe4e6' },
  'tb-dots': { t: 'TB / DOTS Clinic', c: '#d97706', bg: '#fef3c7' },
  malaria: { t: 'Malaria Clinic', c: '#059669', bg: '#d1fae5' },
  immunization: { t: 'Immunization (EPI)', c: '#2563eb', bg: '#dbeafe' },
  'polio-afp': { t: 'Polio / AFP Surveillance', c: '#7c3aed', bg: '#ede9fe' },
  mch: { t: 'Maternal & Child Health', c: '#db2777', bg: '#fce7f3' },
};

const short = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });

interface MetricPanelProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const MetricPanel: React.FC<MetricPanelProps> = ({
  title,
  subtitle,
  icon,
  color,
  badge,
  children,
}) => (
  <Card
    sx={{
      borderRadius: 3,
      border: `1px solid ${color}33`,
      boxShadow: `0 4px 20px ${color}12`,
      overflow: 'hidden',
      height: 310,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Box
      sx={{
        px: 2,
        py: 1.5,
        bgcolor: `${color}08`,
        borderBottom: `1px solid ${color}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Avatar
          sx={{
            bgcolor: `${color}18`,
            color: color,
            width: 32,
            height: 32,
            '& svg': { fontSize: 18 },
          }}
        >
          {icon}
        </Avatar>
        <Box>
          <Typography variant="body2" fontWeight={800} color="#0f172a">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 11 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {badge}
    </Box>
    <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
      {children}
    </CardContent>
  </Card>
);

const EmptyChartPlaceholder: React.FC<{ message: string; sub?: string; icon?: React.ReactNode }> = ({
  message,
  sub,
  icon,
}) => (
  <Box
    sx={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: '#f8fafc',
      borderRadius: 2,
      border: '1px dashed #cbd5e1',
      p: 2,
      textAlign: 'center',
    }}
  >
    {icon || <TrendingUp sx={{ fontSize: 32, color: '#94a3b8', mb: 1 }} />}
    <Typography variant="body2" fontWeight={700} color="#475569">
      {message}
    </Typography>
    {sub && (
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
        {sub}
      </Typography>
    )}
  </Box>
);

interface Props {
  patientId: string;
  onOpenForm?: (formSchemaId: string, eventId: string) => void;
}

/** Combined longitudinal view across every specialty clinic + vitals trends */
const PatientLongitudinal: React.FC<Props> = ({ patientId }) => {
  const nav = useNavigate();
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    api
      .get(`/disease-clinics/patients/${patientId}/longitudinal`)
      .then((r) => setD(r.data.data))
      .catch(() => setD(null))
      .finally(() => setLoading(false));
  }, [patientId]);

  const events = useMemo(
    () => (d?.events || []).filter((e: any) => filter === 'all' || e.program === filter),
    [d, filter]
  );

  if (loading) return <Skeleton variant="rounded" height={360} sx={{ borderRadius: 3 }} />;
  if (!d) return <Typography color="text.secondary">Could not load longitudinal data.</Typography>;

  const vlData = d.viralLoad.map((x: any) => ({ ...x, label: short(x.date) }));
  const cd4Data = d.cd4.map((x: any) => ({ ...x, label: short(x.date) }));
  const vit = d.vitals.map((x: any) => ({ ...x, label: short(x.date) }));

  const latestVl = vlData.length > 0 ? vlData[vlData.length - 1] : null;
  const latestCd4 = cd4Data.length > 0 ? cd4Data[cd4Data.length - 1] : null;
  const latestVit = vit.length > 0 ? vit[vit.length - 1] : null;

  return (
    <Stack spacing={3}>
      {/* ── TOP STATS BAR ─────────────────────────────────────── */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Avatar sx={{ bgcolor: '#eff6ff', color: '#2563eb', width: 44, height: 44 }}>
              <LocalHospital />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Total Clinic Encounters
              </Typography>
              <Typography variant="h6" fontWeight={900} color="#0f172a">
                {d.events.length}
              </Typography>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Avatar sx={{ bgcolor: '#d1fae5', color: '#059669', width: 44, height: 44 }}>
              <Shield />
            </Avatar>
            <Box>
              <Typography variant="caption" color="#047857" fontWeight={700}>
                Active Clinics Enrolled
              </Typography>
              <Typography variant="h6" fontWeight={900} color="#059669">
                {Object.keys(d.counts).length} Clinic Programs
              </Typography>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: '#fef2f2',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Avatar sx={{ bgcolor: '#fee2e2', color: '#e11d48', width: 44, height: 44 }}>
              <Bloodtype />
            </Avatar>
            <Box>
              <Typography variant="caption" color="#be123c" fontWeight={700}>
                Latest Viral Load
              </Typography>
              <Typography variant="h6" fontWeight={900} color="#e11d48">
                {latestVl ? `${latestVl.value} cp/mL` : 'No Lab VL Yet'}
              </Typography>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: '#f5f3ff',
              border: '1px solid #ddd6fe',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Avatar sx={{ bgcolor: '#ede9fe', color: '#7c3aed', width: 44, height: 44 }}>
              <Speed />
            </Avatar>
            <Box>
              <Typography variant="caption" color="#6d28d9" fontWeight={700}>
                Latest CD4 Count
              </Typography>
              <Typography variant="h6" fontWeight={900} color="#7c3aed">
                {latestCd4 ? `${latestCd4.value} cells/µL` : 'No CD4 Yet'}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* ── PROGRAM FILTER CHIPS ──────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip
          label={`All Clinics (${d.events.length})`}
          onClick={() => setFilter('all')}
          color={filter === 'all' ? 'primary' : 'default'}
          sx={{ fontWeight: 800, borderRadius: 2 }}
        />
        {Object.entries(d.counts).map(([k, n]: any) => (
          <Chip
            key={k}
            icon={PROGRAM_ICONS[k]}
            label={`${TITLES[k]?.t || k} (${n})`}
            onClick={() => setFilter(k)}
            sx={{
              fontWeight: 800,
              borderRadius: 2,
              bgcolor: filter === k ? TITLES[k]?.c : `${TITLES[k]?.c}15`,
              color: filter === k ? '#fff' : TITLES[k]?.c,
              border: `1px solid ${TITLES[k]?.c}33`,
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        ))}
      </Box>

      {/* ── 4 CHARTS & METRICS PANELS ─────────────────────────── */}
      <Grid container spacing={2.5}>
        {/* Panel 1: Viral Load */}
        <Grid item xs={12} md={6}>
          <MetricPanel
            title="HIV Viral Load Progression"
            subtitle="National target: <50 cp/mL (suppressed), <1000 cp/mL (FMoH guideline)"
            icon={<Bloodtype />}
            color="#e11d48"
            badge={
              latestVl ? (
                <Chip
                  label={latestVl.value < 50 ? 'Suppressed (<50)' : `${latestVl.value} cp/mL`}
                  size="small"
                  color={latestVl.value < 1000 ? 'success' : 'error'}
                  sx={{ fontWeight: 800, fontSize: 11 }}
                />
              ) : undefined
            }
          >
            {vlData.length > 0 ? (
              <Box sx={{ height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vlData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <ReferenceLine
                      y={1000}
                      stroke="#e11d48"
                      strokeDasharray="4 4"
                      label={{ value: '1000 Threshold', fontSize: 10, fill: '#e11d48' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Viral Load"
                      stroke="#e11d48"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <EmptyChartPlaceholder
                message="No Viral Load Lab Tests Documented"
                sub="Captured via Integrated Laboratory Order & Result or Clinical Follow-up Form"
                icon={<Bloodtype sx={{ fontSize: 32, color: '#fda4af', mb: 1 }} />}
              />
            )}
          </MetricPanel>
        </Grid>

        {/* Panel 2: CD4 Count */}
        <Grid item xs={12} md={6}>
          <MetricPanel
            title="CD4 Absolute Count Trajectory"
            subtitle="Immune reconstitution monitor (Target: >350 cells/µL, Alert: <200 cells/µL)"
            icon={<Speed />}
            color="#7c3aed"
            badge={
              latestCd4 ? (
                <Chip
                  label={`${latestCd4.value} cells/µL`}
                  size="small"
                  color={latestCd4.value > 350 ? 'success' : latestCd4.value < 200 ? 'error' : 'warning'}
                  sx={{ fontWeight: 800, fontSize: 11 }}
                />
              ) : undefined
            }
          >
            {cd4Data.length > 0 ? (
              <Box sx={{ height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cd4Data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <ReferenceLine
                      y={200}
                      stroke="#d97706"
                      strokeDasharray="4 4"
                      label={{ value: '200 Danger Threshold', fontSize: 10, fill: '#d97706' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="CD4 Count"
                      stroke="#7c3aed"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <EmptyChartPlaceholder
                message="No CD4 Lab Tests Documented"
                sub="Captured via CD4 LFA or Flow Cytometry in Laboratory Order & Result"
                icon={<Speed sx={{ fontSize: 32, color: '#c4b5fd', mb: 1 }} />}
              />
            )}
          </MetricPanel>
        </Grid>

        {/* Panel 3: Triage Vitals */}
        <Grid item xs={12} md={6}>
          <MetricPanel
            title="Blood Pressure & Weight (Triage)"
            subtitle="Longitudinal vitals across all OPD & specialty clinic visits"
            icon={<MonitorHeart />}
            color="#0284c7"
            badge={
              latestVit ? (
                <Chip
                  label={
                    latestVit.systolic && latestVit.diastolic
                      ? `${latestVit.systolic}/${latestVit.diastolic} mmHg`
                      : latestVit.weight
                      ? `${latestVit.weight} kg`
                      : undefined
                  }
                  size="small"
                  sx={{ fontWeight: 800, fontSize: 11, bgcolor: '#e0f2fe', color: '#0369a1' }}
                />
              ) : undefined
            }
          >
            {vit.length > 0 ? (
              <Box sx={{ height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vit}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="systolic"
                      name="Systolic BP"
                      stroke="#ef4444"
                      connectNulls
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolic"
                      name="Diastolic BP"
                      stroke="#f59e0b"
                      connectNulls
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      name="Weight (kg)"
                      stroke="#14b8a6"
                      connectNulls
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <EmptyChartPlaceholder
                message="No Triage Vitals Logged"
                sub="Systolic, diastolic, pulse, and weight captured during patient check-in / triage"
                icon={<MonitorHeart sx={{ fontSize: 32, color: '#7dd3fc', mb: 1 }} />}
              />
            )}
          </MetricPanel>
        </Grid>

        {/* Panel 4: Other Clinic Indicators */}
        <Grid item xs={12} md={6}>
          <MetricPanel
            title="Multi-Clinic Public Health Indicators"
            subtitle="Interoperable findings synced across TB, Malaria, EPI & MCH clinics"
            icon={<Healing />}
            color="#059669"
          >
            <Stack spacing={1.5} sx={{ height: '100%', overflowY: 'auto', pr: 0.5 }}>
              {/* Malaria */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#dcfce7', color: '#16a34a', width: 34, height: 34 }}>
                    <BugReport fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={800} color="#15803d">
                      Malaria Episodes
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {d.malariaPositives.length > 0
                        ? `Last confirmed positive: ${fmtDate(
                            d.malariaPositives[d.malariaPositives.length - 1].date
                          )}`
                        : 'No confirmed positive mRDT/microscopy recorded'}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${d.malariaPositives.length} Confirmed`}
                  size="small"
                  color={d.malariaPositives.length > 0 ? 'error' : 'success'}
                  sx={{ fontWeight: 800, fontSize: 11 }}
                />
              </Box>

              {/* Immunization */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#dbeafe', color: '#2563eb', width: 34, height: 34 }}>
                    <Vaccines fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={800} color="#1d4ed8">
                      Vaccination Sessions (EPI)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {d.vaccinations.length > 0
                        ? `${d.vaccinations.length} immunisation encounters documented`
                        : 'No routine immunization sessions logged'}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${d.vaccinations.length} Sessions`}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 800, fontSize: 11 }}
                />
              </Box>

              {/* TB Screening */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: '#fffbeb',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#fef3c7', color: '#d97706', width: 34, height: 34 }}>
                    <Shield fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={800} color="#b45309">
                      TB / DOTS Program
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {d.counts['tb-dots']
                        ? `${d.counts['tb-dots']} TB encounters documented on register`
                        : 'Routine TB screening performed during clinical visits'}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={d.counts['tb-dots'] ? `${d.counts['tb-dots']} Encounters` : 'Screened'}
                  size="small"
                  sx={{ fontWeight: 800, fontSize: 11, bgcolor: '#fde68a', color: '#92400e' }}
                />
              </Box>
            </Stack>
          </MetricPanel>
        </Grid>
      </Grid>

      {/* ── UNIFIED CROSS-CLINIC ENCOUNTERS TIMELINE ─────────── */}
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 2,
            bgcolor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#0f172a', color: '#fff', width: 36, height: 36 }}>
              <AccessTime fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                Unified Specialty Clinic Timeline ({events.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Longitudinal record of all national form entries, clinical registers &amp; laboratory tests
              </Typography>
            </Box>
          </Box>
          <Chip
            label={`${events.length} Filtered Events`}
            size="small"
            sx={{ fontWeight: 800, bgcolor: '#e2e8f0', color: '#334155' }}
          />
        </Box>

        <CardContent sx={{ p: 0 }}>
          {events.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No clinical encounters found for the selected filter.
              </Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11.5, py: 1.25 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11.5, py: 1.25 }}>Clinic Program</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11.5, py: 1.25 }}>Form Name / Register</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11.5, py: 1.25 }}>Encounter #</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11.5, py: 1.25 }}>Clinician</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11.5, py: 1.25 }}>Sync Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11.5, py: 1.25 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.slice(0, 100).map((e: any) => {
                  const pr = TITLES[e.program];
                  return (
                    <TableRow key={e.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                        {fmtDate(e.date)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={PROGRAM_ICONS[e.program]}
                          label={e.programTitle}
                          sx={{
                            fontWeight: 800,
                            fontSize: 10.5,
                            bgcolor: pr ? pr.bg : '#f1f5f9',
                            color: pr ? pr.c : '#475569',
                            '& .MuiChip-icon': { color: 'inherit' },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                        {e.formName}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                        {e.encounterNumber || '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#334155' }}>
                        {e.clinicianName || 'Medical Officer'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={e.syncStatus || 'SAVED'}
                          color={e.syncStatus === 'SYNCED' ? 'success' : 'default'}
                          variant="outlined"
                          sx={{ fontSize: 9.5, height: 20, fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {pr && (
                          <Button
                            size="small"
                            variant="outlined"
                            endIcon={<OpenInNew sx={{ fontSize: 14 }} />}
                            onClick={() => nav(`/clinics/${e.program}/patient/${patientId}`)}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 800,
                              fontSize: 11,
                              borderRadius: 1.5,
                              py: 0.25,
                              px: 1,
                              color: pr.c,
                              borderColor: `${pr.c}55`,
                              '&:hover': { bgcolor: `${pr.c}10`, borderColor: pr.c },
                            }}
                          >
                            Open Clinic
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

export default PatientLongitudinal;
