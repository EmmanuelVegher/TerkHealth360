import { useState, useEffect } from 'react';
import {
  Typography, Box, Card, CardContent, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Paper, Stack,
  Avatar, Divider
} from '@mui/material';
import { Sync, LocalHospital, VolumeUp, Campaign, AccessTime } from '@mui/icons-material';
import { api } from '../services/api';
import { alpha } from '@mui/material/styles';

const QueueBoard = () => {
  const [calledTickets, setCalledTickets] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchActiveQueues = async () => {
    try {
      const depts = ['TRIAGE', 'CONSULTATION', 'LABORATORY', 'PHARMACY', 'RADIOLOGY', 'BILLING'];
      const responses = await Promise.all(depts.map(d => api.get(`/queues/department/${d}`)));
      
      const allActive = responses.flatMap(res => res.data);
      const called = allActive.filter(q => q.status === 'CALLED' || q.status === 'IN_SERVICE');
      
      called.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setCalledTickets(called.slice(0, 10)); // Display up to 10 active/recent calls
    } catch (err) {
      console.error('Queue board polling failed', err);
    }
  };

  useEffect(() => {
    fetchActiveQueues();
    const queueInterval = setInterval(fetchActiveQueues, 4000);
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(queueInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const getDeptColor = (dept: string) => {
    const map: Record<string, string> = {
      TRIAGE:       '#f43f5e', // Rose
      CONSULTATION: '#3b82f6', // Bright Blue
      LABORATORY:   '#06b6d4', // Cyan
      PHARMACY:    '#10b981', // Emerald
      RADIOLOGY:   '#8b5cf6', // Violet
      BILLING:     '#f59e0b', // Amber
    };
    return map[dept?.toUpperCase()] ?? '#64748b';
  };

  const getDeptAbbr = (dept: string) => {
    const map: Record<string, string> = {
      TRIAGE:       'OPD-TRIAGE',
      CONSULTATION: 'OPD-CONSULT',
      LABORATORY:   'LIMS-TESTS',
      PHARMACY:    'RX-DISPENSE',
      RADIOLOGY:   'PACS-SCANS',
      BILLING:     'FIN-CASHIER',
    };
    return map[dept?.toUpperCase()] ?? dept;
  };

  const nowServing = calledTickets.slice(0, 4); // Top 4 active announcements
  const previousCalls = calledTickets.slice(4); // Rest go to previous calls register

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#060814',
      color: '#fff',
      p: { xs: 2, md: 4.5 },
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Watermark Glows */}
      <Box sx={{ position: 'absolute', top: '-10%', left: '-5%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />

      {/* Header Digital Signage Bar */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 2,
        mb: 4.5,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        pb: 3,
        position: 'relative',
        zIndex: 2
      }}>
        <Stack direction="row" spacing={2.5} alignItems="center">
          <Avatar sx={{
            width: 56,
            height: 56,
            bgcolor: 'rgba(59,130,246,0.1)',
            color: '#3b82f6',
            border: '1px solid rgba(59,130,246,0.2)',
            boxShadow: '0 0 20px rgba(59,130,246,0.15)'
          }}>
            <LocalHospital sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5, fontFamily: "'Georgia', serif", color: '#f8fafc' }}>
              Faith Foundation Mission Hospital
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800, letterSpacing: 1.5, display: 'block', mt: 0.25 }}>
              PUBLIC OUTPATIENT QUEUE BOARD • DIGITAL SIGNAGE SERVICE
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={3} alignItems="center" alignSelf={{ xs: 'stretch', md: 'auto' }} justifyContent={{ xs: 'space-between', md: 'flex-end' }}>
          {/* Real-time Clock */}
          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#fbbf24', letterSpacing: 1 }}>
              {currentTime.toLocaleTimeString('en-US', { hour12: false })}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)', display: { xs: 'none', md: 'block' } }} />

          <Stack direction="row" spacing={1.2} alignItems="center">
            <Box sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: '#10b981',
              boxShadow: '0 0 10px #10b981',
              animation: 'pulse 1.5s infinite'
            }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: 0.5 }}>
              LIVE MONITOR
            </Typography>
          </Stack>
        </Stack>
      </Box>

      {/* Main Layout Grids */}
      <Grid container spacing={4} sx={{ position: 'relative', zIndex: 2 }}>
        {/* Left Column: Serving Now */}
        <Grid item xs={12} lg={7.5}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={3.5}>
            <Campaign sx={{ color: '#fbbf24', fontSize: '2rem' }} />
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.5, color: '#f8fafc' }}>
              NOW SERVING / ACTIVE CALLS
            </Typography>
          </Stack>

          <Stack spacing={3}>
            {nowServing.map((t, idx) => {
              const isHero = idx === 0;
              const deptColor = getDeptColor(t.department);
              return (
                <Card key={t.id} sx={{
                  bgcolor: isHero ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.45)',
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${isHero ? '#3b82f6' : 'rgba(255,255,255,0.06)'}`,
                  color: '#fff',
                  borderRadius: 4,
                  boxShadow: isHero ? '0 12px 40px rgba(59,130,246,0.15), inset 0 0 20px rgba(59,130,246,0.05)' : 'none',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Glowing vertical stripe for hero card */}
                  {isHero && (
                    <Box sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 6,
                      height: '100%',
                      bgcolor: '#3b82f6',
                      boxShadow: '0 0 15px #3b82f6'
                    }} />
                  )}

                  <CardContent sx={{ p: isHero ? 4 : 3, '&:last-child': { pb: isHero ? 4 : 3 } }}>
                    <Grid container alignItems="center" spacing={3}>
                      {/* Token display */}
                      <Grid item xs={12} sm={4.5} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', mb: 0.5 }}>
                            TOKEN ID
                          </Typography>
                          <Typography variant={isHero ? 'h2' : 'h3'} sx={{
                            fontWeight: 950,
                            color: '#fbbf24',
                            fontFamily: 'monospace',
                            lineHeight: 1,
                            textShadow: '0 0 20px rgba(251,191,36,0.35)'
                          }}>
                            {t.tokenNumber}
                          </Typography>
                        </Box>
                      </Grid>

                      {/* Patient Details */}
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', mb: 0.5 }}>
                          PATIENT NAME
                        </Typography>
                        <Typography variant={isHero ? 'h5' : 'subtitle1'} sx={{ fontWeight: 850, color: '#f8fafc' }}>
                          {t.patient?.firstName} {t.patient?.lastName ? `${t.patient.lastName.substring(0, 1)}.` : ''}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                          <VolumeUp sx={{ fontSize: 16, color: '#10b981' }} />
                          <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 750 }}>
                            {t.status === 'CALLED' ? 'Please proceed to counter' : 'Consultation in progress'}
                          </Typography>
                        </Stack>
                      </Grid>

                      {/* Department Chip & Action */}
                      <Grid item xs={12} sm={3.5} sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 1 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: { xs: 'none', sm: 'block' }, mb: 0.5 }}>
                          DESTINATION
                        </Typography>
                        <Chip
                          label={getDeptAbbr(t.department)}
                          sx={{
                            fontWeight: 900,
                            fontSize: '0.82rem',
                            letterSpacing: 0.5,
                            bgcolor: alpha(deptColor, 0.15),
                            color: deptColor,
                            border: `1px solid ${alpha(deptColor, 0.3)}`,
                            px: 1.5,
                            py: 2,
                            borderRadius: '10px'
                          }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              );
            })}

            {calledTickets.length === 0 && (
              <Paper sx={{
                p: 5,
                bgcolor: 'rgba(30, 41, 59, 0.3)',
                border: '1px dashed rgba(255,255,255,0.12)',
                borderRadius: 4,
                textAlign: 'center'
              }}>
                <LocalHospital sx={{ fontSize: 48, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>
                  All Queues Cleared
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mt: 1 }}>
                  No active patient calls at the moment. Please wait for your token to display.
                </Typography>
              </Paper>
            )}
          </Stack>
        </Grid>

        {/* Right Column: Previous Calls Register */}
        <Grid item xs={12} lg={4.5}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={3.5}>
            <AccessTime sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.8rem' }} />
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.5, color: 'rgba(255,255,255,0.7)' }}>
              RECENTLY CALLED
            </Typography>
          </Stack>

          <TableContainer component={Paper} sx={{
            bgcolor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 4,
            boxShadow: 'none',
            overflow: 'hidden'
          }}>
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '0.75rem', letterSpacing: 0.5, border: 'none', pl: 3 }}>TOKEN</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '0.75rem', letterSpacing: 0.5, border: 'none' }}>DEPARTMENT</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '0.75rem', letterSpacing: 0.5, border: 'none', pr: 3 }} align="right">TIME</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previousCalls.map((t) => {
                  const deptColor = getDeptColor(t.department);
                  return (
                    <TableRow key={t.id} sx={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      '&:last-child': { borderBottom: 'none' },
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' }
                    }}>
                      <TableCell sx={{ pl: 3, border: 'none', py: 2.2 }}>
                        <Typography variant="h6" sx={{
                          color: '#fbbf24',
                          fontWeight: 900,
                          fontFamily: 'monospace',
                          fontSize: '1.25rem',
                          lineHeight: 1
                        }}>
                          {t.tokenNumber}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ border: 'none', py: 2.2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: deptColor }} />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                            {getDeptAbbr(t.department)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ pr: 3, border: 'none', py: 2.2 }} align="right">
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 700, fontFamily: 'monospace' }}>
                          {t.calledAt ? new Date(t.calledAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {previousCalls.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ color: 'rgba(255,255,255,0.4)', py: 6, border: 'none' }}>
                      <Box sx={{ opacity: 0.5 }}>
                        <Campaign sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant="body2">No previous calls register display.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QueueBoard;
