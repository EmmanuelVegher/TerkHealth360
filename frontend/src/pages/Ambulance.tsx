import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, InputAdornment, Avatar,
} from '@mui/material';
import { Search, DirectionsCar, Phone, LocationOn, Timer } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
type AmbStatus = 'Available' | 'Dispatched' | 'Returning' | 'Maintenance';
interface Ambulance { id:number; regNo:string; driver:string; phone:string; location:string; status:AmbStatus; lastTrip:string; }
interface Dispatch  { id:number; patient:string; address:string; ambulance:string; time:string; status:string; }
const statusColor: Record<AmbStatus,string> = {
  Available:'#2f9e44', Dispatched:'#f03e3e', Returning:'#f59f00', Maintenance:'#6b7194',
};
const AmbulancePage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ patient:'', address:'', phone:'', ambulance:'' });
  const [ambulances] = useState<Ambulance[]>([
    { id:1, regNo:'LGS-001-AMB', driver:'Seun Adesanya',  phone:'080-1111-2222', location:'Main Gate',      status:'Available',   lastTrip:'2026-06-24 08:30' },
    { id:2, regNo:'LGS-002-AMB', driver:'Musa Danladi',   phone:'080-3333-4444', location:'Lekki Phase 1',  status:'Dispatched',  lastTrip:'2026-06-24 11:15' },
    { id:3, regNo:'LGS-003-AMB', driver:'Chukwudi Obi',   phone:'080-5555-6666', location:'Returning base', status:'Returning',   lastTrip:'2026-06-24 10:00' },
    { id:4, regNo:'LGS-004-AMB', driver:'Biodun Oyelaran',phone:'080-7777-8888', location:'Workshop',       status:'Maintenance', lastTrip:'2026-06-22 14:00' },
  ]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([
    { id:1, patient:'Emeka Johnson',   address:'15 Adeola Odeku, VI',     ambulance:'LGS-001-AMB', time:'2026-06-24 11:20', status:'Completed' },
    { id:2, patient:'Sarah Ibrahim',   address:'22 Bode Thomas, Surulere', ambulance:'LGS-002-AMB', time:'2026-06-24 11:15', status:'En Route' },
    { id:3, patient:'Felix Nwosu',     address:'Sangotedo Estate, Ajah',   ambulance:'LGS-003-AMB', time:'2026-06-24 10:00', status:'Completed' },
  ]);
  const filtered = ambulances.filter(a =>
    a.regNo.toLowerCase().includes(search.toLowerCase()) ||
    a.driver.toLowerCase().includes(search.toLowerCase())
  );
  const handleDispatch = () => {
    setDispatches(prev => [{
      id: Date.now(),
      patient: form.patient,
      address: form.address,
      ambulance: form.ambulance,
      time: new Date().toLocaleString(),
      status: 'En Route',
    }, ...prev]);
    enqueueSnackbar(`Ambulance ${form.ambulance} dispatched`, { variant: 'success' });
    setDispatchOpen(false);
    setForm({ patient:'', address:'', phone:'', ambulance:'' });
  };
  const counts = {
    available: ambulances.filter(a => a.status==='Available').length,
    dispatched: ambulances.filter(a => a.status==='Dispatched').length,
    maintenance: ambulances.filter(a => a.status==='Maintenance').length,
  };
  return (
    <Box>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Ambulance Management</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Fleet status, dispatch and trip log</Typography>
        </Box>
        <Button variant="contained" startIcon={<DirectionsCar />} onClick={() => setDispatchOpen(true)}>
          Dispatch Ambulance
        </Button>
      </Box>
      {/* Summary */}
      <Grid container spacing={2} mb={3}>
        {[
          { label:'Total Fleet',    value:ambulances.length,    color:'#3b5bdb' },
          { label:'Available',      value:counts.available,     color:'#2f9e44' },
          { label:'Dispatched',     value:counts.dispatched,    color:'#f03e3e' },
          { label:'Maintenance',    value:counts.maintenance,   color:'#6b7194' },
        ].map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card sx={{ boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'none' }}>
              <CardContent sx={{ p:2, textAlign:'center' }}>
                <Typography variant="h4" fontWeight={800} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2.5}>
        {/* Fleet table */}
        <Grid item xs={12} md={7}>
          <Card sx={{ boxShadow:'0 4px 24px rgba(0,0,0,0.07)', border:'none' }}>
            <CardContent sx={{ p:2.5 }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2 }}>
                <Typography variant="h6" fontWeight={700}>Fleet Status</Typography>
                <TextField placeholder="Search…" size="small" value={search} onChange={e => setSearch(e.target.value)}
                  InputProps={{ startAdornment:<InputAdornment position="start"><Search sx={{ fontSize:18 }} /></InputAdornment> }}
                  sx={{ width:200 }} />
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Reg. No.</TableCell>
                      <TableCell>Driver</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map(a => (
                      <TableRow key={a.id} hover sx={{ '&:last-child td':{ border:0 } }}>
                        <TableCell>
                          <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                            <Avatar sx={{ width:32, height:32, bgcolor: alpha(statusColor[a.status],0.12), borderRadius:'10px' }}>
                              <DirectionsCar sx={{ fontSize:18, color: statusColor[a.status] }} />
                            </Avatar>
                            <Typography variant="body2" fontWeight={700}>{a.regNo}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{a.driver}</Typography>
                          <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                            <Phone sx={{ fontSize:12, color:'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">{a.phone}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                            <LocationOn sx={{ fontSize:14, color:'text.secondary' }} />
                            <Typography variant="body2">{a.location}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={a.status} size="small"
                            sx={{ bgcolor: alpha(statusColor[a.status],0.12), color: statusColor[a.status], fontWeight:600 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        {/* Recent dispatches */}
        <Grid item xs={12} md={5}>
          <Card sx={{ boxShadow:'0 4px 24px rgba(0,0,0,0.07)', border:'none', height:'100%' }}>
            <CardContent sx={{ p:2.5 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Recent Dispatches</Typography>
              {dispatches.map(d => (
                <Box key={d.id} sx={{ mb:2, p:1.5, bgcolor: alpha('#3b5bdb',0.04), borderRadius:2, border:'1px solid rgba(59,91,219,0.08)' }}>
                  <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
                    <Typography variant="body2" fontWeight={700}>{d.patient}</Typography>
                    <Chip label={d.status} size="small"
                      color={d.status==='Completed'?'success':'warning'}
                      sx={{ height:20, fontSize:'0.65rem', fontWeight:600 }} />
                  </Box>
                  <Box sx={{ display:'flex', alignItems:'center', gap:0.5, mb:0.5 }}>
                    <LocationOn sx={{ fontSize:13, color:'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">{d.address}</Typography>
                  </Box>
                  <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                    <DirectionsCar sx={{ fontSize:13, color:'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">{d.ambulance}</Typography>
                    <Timer sx={{ fontSize:13, color:'text.secondary', ml:1 }} />
                    <Typography variant="caption" color="text.secondary">{d.time}</Typography>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Dispatch Dialog */}
      <Dialog open={dispatchOpen} onClose={() => setDispatchOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
        <DialogTitle sx={{ fontWeight:700 }}>Dispatch Ambulance</DialogTitle>
        <DialogContent sx={{ pt:'8px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField label="Patient Name" fullWidth value={form.patient} onChange={e => setForm(p => ({ ...p, patient:e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField label="Pickup Address" fullWidth value={form.address} onChange={e => setForm(p => ({ ...p, address:e.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Contact Phone" fullWidth value={form.phone} onChange={e => setForm(p => ({ ...p, phone:e.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Select Ambulance" fullWidth value={form.ambulance} onChange={e => setForm(p => ({ ...p, ambulance:e.target.value }))}>
                {ambulances.filter(a => a.status==='Available').map(a =>
                  <MenuItem key={a.id} value={a.regNo}>{a.regNo} – {a.driver}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p:2.5, pt:1 }}>
          <Button onClick={() => setDispatchOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleDispatch} variant="contained" color="error" disabled={!form.patient||!form.ambulance}>
            Dispatch Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default AmbulancePage;
