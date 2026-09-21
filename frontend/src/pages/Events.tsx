import { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Avatar, MenuItem,
} from '@mui/material';
import { Add, Search, Edit, Delete, Event, LocationOn, CalendarMonth } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
interface HospitalEvent {
  id: number; title: string; category: string; date: string; time: string;
  venue: string; description: string; organizer: string; status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
  createdBy: string;
}
const CATEGORIES = ['Health Camp', 'Training', 'Conference', 'Blood Drive', 'Vaccination', 'Awareness', 'Workshop', 'Other'];
const emptyForm: Omit<HospitalEvent, 'id'> = {
  title: '', category: 'Health Camp', date: '', time: '', venue: '', description: '', organizer: '', status: 'Upcoming', createdBy: 'Admin',
};
const Events = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });
  const [events, setEvents] = useState<HospitalEvent[]>([
    { id: 1, title: 'World Blood Donor Day Campaign', category: 'Blood Drive', date: '2026-06-14', time: '09:00', venue: 'Hospital Main Hall, Ground Floor', description: 'Annual blood donation drive to replenish blood bank. Free refreshments for all donors.', organizer: 'Blood Bank Unit', status: 'Completed', createdBy: 'Admin' },
    { id: 2, title: 'Free Malaria Screening', category: 'Health Camp', date: '2026-06-28', time: '08:00', venue: 'Community Health Center, Surulere', description: 'Free malaria testing and treatment for community members. Sponsored by the hospital.', organizer: 'Dr. Aliyu', status: 'Upcoming', createdBy: 'Admin' },
    { id: 3, title: 'Nursing Staff Training — Infection Control', category: 'Training', date: '2026-07-05', time: '10:00', venue: 'Hospital Conference Room, 2nd Floor', description: 'Mandatory infection control and hand hygiene training for all nursing staff.', organizer: 'Infection Control Unit', status: 'Upcoming', createdBy: 'HR Admin' },
    { id: 4, title: 'Meningitis Vaccination Drive', category: 'Vaccination', date: '2026-07-15', time: '08:30', venue: 'OPD Forecourt', description: 'Free meningitis vaccination for children under 5 and elderly above 65.', organizer: 'Public Health Dept.', status: 'Upcoming', createdBy: 'Admin' },
    { id: 5, title: 'Annual Medical Conference 2026', category: 'Conference', date: '2026-08-20', time: '09:00', venue: 'Eko Hotel & Suites, Victoria Island, Lagos', description: 'Annual conference bringing together healthcare professionals across Nigeria.', organizer: 'Hospital Management', status: 'Upcoming', createdBy: 'Admin' },
  ]);
  const statusColor: Record<string, any> = { Upcoming: 'primary', Ongoing: 'success', Completed: 'default', Cancelled: 'error' };
  const categoryColor: Record<string, string> = {
    'Blood Drive': '#f03e3e', 'Health Camp': '#2f9e44', 'Training': '#3b5bdb',
    'Conference': '#6741d9', 'Vaccination': '#0ca678', 'Awareness': '#f59f00', Workshop: '#1c7ed6', Other: '#6b7194',
  };
  const filtered = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase()) ||
    e.venue.toLowerCase().includes(search.toLowerCase())
  );
  const handleOpen = (item?: HospitalEvent) => {
    if (item) {
      setEditId(item.id);
      setForm({ title: item.title, category: item.category, date: item.date, time: item.time, venue: item.venue, description: item.description, organizer: item.organizer, status: item.status, createdBy: item.createdBy });
    } else {
      setEditId(null);
      setForm({ ...emptyForm });
    }
    setOpen(true);
  };
  const handleSave = () => {
    if (editId) {
      setEvents(prev => prev.map(e => e.id === editId ? { ...e, ...form } : e));
      enqueueSnackbar('Event updated', { variant: 'success' });
    } else {
      setEvents(prev => [{ id: Date.now(), ...form }, ...prev]);
      enqueueSnackbar('Event created', { variant: 'success' });
    }
    setOpen(false);
  };
  const handleDelete = (id: number) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    enqueueSnackbar('Event deleted', { variant: 'warning' });
  };
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Events</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Hospital events, health camps, training and conferences</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>Add Event</Button>
      </Box>
      {/* Summary cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total Events', value: events.length, color: '#3b5bdb' },
          { label: 'Upcoming', value: events.filter(e => e.status === 'Upcoming').length, color: '#1c7ed6' },
          { label: 'Ongoing', value: events.filter(e => e.status === 'Ongoing').length, color: '#2f9e44' },
          { label: 'Completed', value: events.filter(e => e.status === 'Completed').length, color: '#6b7194' },
        ].map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: 'none' }}>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={800} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>All Events</Typography>
            <TextField placeholder="Search events…" size="small" value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
              sx={{ width: 260 }} />
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Venue</TableCell>
                  <TableCell>Organizer</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(e => (
                  <TableRow key={e.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(categoryColor[e.category] ?? '#3b5bdb', 0.12) }}>
                          <Event sx={{ color: categoryColor[e.category] ?? '#3b5bdb', fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{e.title}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 220, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={e.category} size="small"
                        sx={{ bgcolor: alpha(categoryColor[e.category] ?? '#3b5bdb', 0.1), color: categoryColor[e.category] ?? '#3b5bdb', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarMonth sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2">{e.date}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">{e.time}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                        <LocationOn sx={{ fontSize: 14, color: 'text.secondary', mt: 0.3 }} />
                        <Typography variant="body2" sx={{ maxWidth: 180 }}>{e.venue}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2">{e.organizer}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{e.createdBy}</Typography></TableCell>
                    <TableCell><Chip label={e.status} size="small" color={statusColor[e.status]} sx={{ fontWeight: 600 }} /></TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpen(e)} sx={{ color: 'primary.main' }}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => handleDelete(e.id)} sx={{ color: 'error.main' }}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{editId ? 'Edit Event' : 'Add New Event'}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField label="Event Title" fullWidth value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Category" fullWidth value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Status" fullWidth value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}>
                {['Upcoming', 'Ongoing', 'Completed', 'Cancelled'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField label="Date" type="date" fullWidth value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Time" type="time" fullWidth value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><TextField label="Venue" fullWidth value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} placeholder="Building, floor, address…" /></Grid>
            <Grid item xs={12}><TextField label="Organizer" fullWidth value={form.organizer} onChange={e => setForm(p => ({ ...p, organizer: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField label="Description" multiline rows={3} fullWidth value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!form.title || !form.date || !form.venue}>
            {editId ? 'Update Event' : 'Create Event'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default Events;