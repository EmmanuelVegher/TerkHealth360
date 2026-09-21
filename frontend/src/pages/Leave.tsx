import { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, InputAdornment, Avatar,
} from '@mui/material';
import { Add, Search, Delete, CheckCircle, Cancel } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
const LEAVE_TYPES = ['Sick Leave', 'Annual Leave', 'Maternity Leave', 'Paternity Leave', 'Emergency Leave', 'Study Leave', 'Unpaid Leave'];
interface LeaveRequest {
  id: number; staffName: string; role: string; department: string;
  leaveType: string; fromDate: string; toDate: string; days: number;
  reason: string; status: 'Pending' | 'Approved' | 'Rejected';
  appliedOn: string; createdBy: string;
}
const emptyForm = {
  staffName: '', role: '', department: '', leaveType: 'Annual Leave',
  fromDate: '', toDate: '', reason: '', createdBy: 'Admin',
};
const Leave = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [filterStatus, setFilterStatus] = useState('All');
  const [requests, setRequests] = useState<LeaveRequest[]>([
    { id: 1, staffName: 'Ngozi Adeyemi', role: 'Nurse', department: 'ICU', leaveType: 'Sick Leave', fromDate: '2026-06-25', toDate: '2026-06-27', days: 3, reason: 'Medical treatment for viral infection', status: 'Pending', appliedOn: '2026-06-24', createdBy: 'Ngozi Adeyemi' },
    { id: 2, staffName: 'Chidi Nwosu', role: 'Pharmacist', department: 'Pharmacy', leaveType: 'Annual Leave', fromDate: '2026-07-01', toDate: '2026-07-07', days: 7, reason: 'Family vacation', status: 'Approved', appliedOn: '2026-06-20', createdBy: 'Admin' },
    { id: 3, staffName: 'Tunde Fashola', role: 'Admin', department: 'Administration', leaveType: 'Emergency Leave', fromDate: '2026-06-24', toDate: '2026-06-24', days: 1, reason: 'Family emergency', status: 'Approved', appliedOn: '2026-06-24', createdBy: 'Tunde Fashola' },
    { id: 4, staffName: 'Aisha Bello', role: 'Lab Technician', department: 'Laboratory', leaveType: 'Study Leave', fromDate: '2026-07-10', toDate: '2026-07-14', days: 5, reason: 'Professional development course', status: 'Pending', appliedOn: '2026-06-22', createdBy: 'Admin' },
    { id: 5, staffName: 'Biodun Oyelaran', role: 'Receptionist', department: 'OPD', leaveType: 'Maternity Leave', fromDate: '2026-07-01', toDate: '2026-09-30', days: 91, reason: 'Maternity leave', status: 'Rejected', appliedOn: '2026-06-18', createdBy: 'Admin' },
  ]);
  const statusColor: Record<string, 'warning' | 'success' | 'error'> = { Pending: 'warning', Approved: 'success', Rejected: 'error' };
  const filtered = requests.filter(r => {
    const matchStatus = filterStatus === 'All' || r.status === filterStatus;
    const matchSearch = r.staffName.toLowerCase().includes(search.toLowerCase()) || r.leaveType.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });
  const handleAction = (id: number, action: 'Approved' | 'Rejected') => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
    enqueueSnackbar(`Leave request ${action.toLowerCase()}`, { variant: action === 'Approved' ? 'success' : 'warning' });
  };
  const handleDelete = (id: number) => {
    setRequests(prev => prev.filter(r => r.id !== id));
    enqueueSnackbar('Leave request deleted', { variant: 'warning' });
  };
  const handleSave = () => {
    const from = new Date(form.fromDate);
    const to = new Date(form.toDate);
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    setRequests(prev => [{
      id: Date.now(), staffName: form.staffName, role: form.role, department: form.department,
      leaveType: form.leaveType, fromDate: form.fromDate, toDate: form.toDate, days,
      reason: form.reason, status: 'Pending', appliedOn: new Date().toISOString().slice(0, 10), createdBy: form.createdBy,
    }, ...prev]);
    enqueueSnackbar('Leave request submitted', { variant: 'success' });
    setOpen(false);
  };
  const counts = { pending: requests.filter(r => r.status === 'Pending').length, approved: requests.filter(r => r.status === 'Approved').length, rejected: requests.filter(r => r.status === 'Rejected').length };
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Leave Management</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Manage staff leave requests and approvals</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>New Leave Request</Button>
      </Box>
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total Requests', value: requests.length, color: '#3b5bdb' },
          { label: 'Pending', value: counts.pending, color: '#f59f00' },
          { label: 'Approved', value: counts.approved, color: '#2f9e44' },
          { label: 'Rejected', value: counts.rejected, color: '#f03e3e' },
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
            <Typography variant="h6" fontWeight={700}>Leave Requests</Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField select label="Status" size="small" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} sx={{ width: 130 }}>
                {['All', 'Pending', 'Approved', 'Rejected'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField placeholder="Search…" size="small" value={search} onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
                sx={{ width: 220 }} />
            </Box>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Staff</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Leave Type</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>Days</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Applied On</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.72rem', fontWeight: 700, bgcolor: alpha('#3b5bdb', 0.1), color: '#3b5bdb' }}>
                          {r.staffName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{r.staffName}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.role}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2">{r.department}</Typography></TableCell>
                    <TableCell><Chip label={r.leaveType} size="small" sx={{ bgcolor: alpha('#6741d9', 0.1), color: '#6741d9', fontWeight: 600 }} /></TableCell>
                    <TableCell><Typography variant="body2">{r.fromDate}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{r.toDate}</Typography></TableCell>
                    <TableCell><Chip label={`${r.days}d`} size="small" color="primary" sx={{ fontWeight: 700 }} /></TableCell>
                    <TableCell><Typography variant="body2" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{r.appliedOn}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{r.createdBy}</Typography></TableCell>
                    <TableCell><Chip label={r.status} size="small" color={statusColor[r.status]} sx={{ fontWeight: 600 }} /></TableCell>
                    <TableCell align="right">
                      {r.status === 'Pending' && (<>
                        <IconButton size="small" onClick={() => handleAction(r.id, 'Approved')} sx={{ color: 'success.main' }}><CheckCircle fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => handleAction(r.id, 'Rejected')} sx={{ color: 'warning.main' }}><Cancel fontSize="small" /></IconButton>
                      </>)}
                      <IconButton size="small" onClick={() => handleDelete(r.id)} sx={{ color: 'error.main' }}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      {/* New Leave Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>New Leave Request</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField label="Staff Name" fullWidth value={form.staffName} onChange={e => setForm(p => ({ ...p, staffName: e.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Role" fullWidth value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Department" fullWidth value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Leave Type" fullWidth value={form.leaveType} onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))}>
                {LEAVE_TYPES.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField label="From Date" type="date" fullWidth value={form.fromDate} onChange={e => setForm(p => ({ ...p, fromDate: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="To Date" type="date" fullWidth value={form.toDate} onChange={e => setForm(p => ({ ...p, toDate: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><TextField label="Reason" multiline rows={3} fullWidth value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!form.staffName || !form.fromDate || !form.toDate}>Submit Request</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default Leave;