import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Card, CardContent, Button, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, InputLabel,
  FormControl, Chip, Switch, Divider, Avatar, CircularProgress,
} from '@mui/material';
import { Add, Edit, SwapHoriz, History, Business, Work, CheckCircle, Cancel, Bed } from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  headStaffId: string | null;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
}

interface StaffItem {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  user: { id: string };
}

interface TransferHistoryItem {
  id: string;
  transferredAt: string;
  justification: string;
  oldDepartment: string;
  newDepartment: string;
}

const DepartmentManagement = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Transfer history dialog state
  const [history, setHistory] = useState<TransferHistoryItem[]>([]);
  const [openHistory, setOpenHistory] = useState(false);
  const [historyUser, setHistoryUser] = useState('');

  // Form toggles
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // Forms
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    headStaffId: '' as string | null | undefined,
    isActive: true,
  });

  const [transferForm, setTransferForm] = useState({
    userId: '',
    newDepartmentId: '',
    justification: '',
  });

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to fetch departments list', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      // List users that are staff members
      const res = await api.get('/users', { params: { limit: 100 } });
      const activeStaff = res.data.data
        .filter((u: any) => u.role !== 'PATIENT')
        .map((u: any) => ({
          id: u.employeeId,
          firstName: u.firstName,
          lastName: u.lastName,
          employeeId: u.employeeId,
          user: { id: u.id },
        }));
      setStaff(activeStaff);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchDepts();
    fetchStaff();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/departments', deptForm);
      enqueueSnackbar('Department created successfully!', { variant: 'success' });
      setOpenCreate(false);
      setDeptForm({ name: '', code: '', headStaffId: '', isActive: true });
      fetchDepts();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to create department', { variant: 'error' });
    }
  };

  const handleEditOpen = (dept: DepartmentItem) => {
    setSelectedDeptId(dept.id);
    setDeptForm({
      name: dept.name,
      code: dept.code,
      headStaffId: dept.headStaffId || '',
      isActive: dept.isActive,
    });
    setOpenEdit(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/departments/${selectedDeptId}`, deptForm);
      enqueueSnackbar('Department details saved successfully!', { variant: 'success' });
      setOpenEdit(false);
      fetchDepts();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to update department', { variant: 'error' });
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/departments/transfer', transferForm);
      enqueueSnackbar('Staff department transfer successful!', { variant: 'success' });
      setOpenTransfer(false);
      setTransferForm({ userId: '', newDepartmentId: '', justification: '' });
      fetchDepts();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to transfer staff', { variant: 'error' });
    }
  };

  const handleHistoryOpen = async (userId: string, userName: string) => {
    setHistoryUser(userName);
    try {
      const res = await api.get(`/departments/history/${userId}`);
      setHistory(res.data);
      setOpenHistory(true);
    } catch (error) {
      enqueueSnackbar('Failed to fetch department transfer history', { variant: 'error' });
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await api.delete(`/departments/${id}`);
      enqueueSnackbar('Department deleted successfully', { variant: 'success' });
      fetchDepts();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to delete department', { variant: 'error' });
    }
  };

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Department Management</Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<Bed />}
            onClick={() => navigate('/staff/attendance-roster/schedules?role=Nurse')}
            sx={{ borderRadius: 2 }}
          >
            Configure Wards
          </Button>
          <Button
            variant="outlined"
            startIcon={<SwapHoriz />}
            onClick={() => setOpenTransfer(true)}
            sx={{ borderRadius: 2 }}
          >
            Transfer Staff
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenCreate(true)}
            sx={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #4c6ef5 100%)', borderRadius: 2 }}
          >
            Add Department
          </Button>
        </Box>
      </Box>

      {/* Grid of Department Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {departments.map(d => {
            const head = staff.find(s => s.employeeId === d.headStaffId);
            return (
              <Grid item xs={12} sm={6} md={4} key={d.id}>
                <Card sx={{ height: '100%', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', position: 'relative' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Business color="primary" sx={{ fontSize: 28 }} />
                        <Box>
                          <Typography variant="h6" fontWeight={700}>{d.name}</Typography>
                          <Typography variant="caption" sx={{ letterSpacing: '0.05em', fontWeight: 'bold', color: 'text.secondary' }}>
                            CODE: {d.code}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={d.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={d.isActive ? 'success' : 'error'}
                        icon={d.isActive ? <CheckCircle /> : <Cancel />}
                        sx={{ height: 22 }}
                      />
                    </Box>
                    <Divider sx={{ my: 1.5 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Head of Department:</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {head ? `${head.firstName} ${head.lastName}` : 'Not Assigned'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Active Members:</Typography>
                        <Chip label={`${d.memberCount} Staff`} size="small" color="secondary" sx={{ height: 20 }} />
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <IconButton color="primary" onClick={() => handleEditOpen(d)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDeleteDept(d.id)}>
                        <Cancel fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Staff Members List & Transfer History Trigger */}
      <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', mt: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Work color="primary" />
              <Typography variant="h6" fontWeight={700}>Staff Department Mappings</Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Staff Member</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Staff ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Transfer History</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staff.map(s => {
                  // find staff department
                  const userDeptRes = departments.find(d => d.headStaffId === s.employeeId || d.code === 'MED' && s.employeeId === 'DOC-001'); // fallback mock linkage
                  return (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{s.firstName} {s.lastName}</TableCell>
                      <TableCell>{s.employeeId}</TableCell>
                      <TableCell>
                        <Chip label={userDeptRes?.name || 'General Medicine'} size="small" variant="outlined" color="primary" />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton color="secondary" onClick={() => handleHistoryOpen(s.user.id, `${s.firstName} ${s.lastName}`)}>
                          <History fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create Department</DialogTitle>
        <form onSubmit={handleCreateSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Department Name"
                  fullWidth
                  required
                  value={deptForm.name}
                  onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Department Code"
                  fullWidth
                  required
                  placeholder="e.g. MED, SURG, PEDS"
                  value={deptForm.code}
                  onChange={e => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Head of Department</InputLabel>
                  <Select
                    value={deptForm.headStaffId || ''}
                    label="Head of Department"
                    onChange={e => setDeptForm({ ...deptForm, headStaffId: e.target.value || null })}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {staff.map(s => (
                      <MenuItem key={s.id} value={s.employeeId}>
                        {s.firstName} {s.lastName} ({s.employeeId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Department</DialogTitle>
        <form onSubmit={handleEditSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Department Name"
                  fullWidth
                  required
                  value={deptForm.name}
                  onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Department Code"
                  fullWidth
                  required
                  value={deptForm.code}
                  onChange={e => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Head of Department</InputLabel>
                  <Select
                    value={deptForm.headStaffId || ''}
                    label="Head of Department"
                    onChange={e => setDeptForm({ ...deptForm, headStaffId: e.target.value || null })}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {staff.map(s => (
                      <MenuItem key={s.id} value={s.employeeId}>
                        {s.firstName} {s.lastName} ({s.employeeId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body1">Department Status Active</Typography>
                    <Switch
                      checked={deptForm.isActive}
                      onChange={e => setDeptForm({ ...deptForm, isActive: e.target.checked })}
                    />
                  </Box>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* TRANSFER DIALOG */}
      <Dialog open={openTransfer} onClose={() => setOpenTransfer(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Transfer Staff Member</DialogTitle>
        <form onSubmit={handleTransferSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Select Staff</InputLabel>
                  <Select
                    value={transferForm.userId}
                    label="Select Staff"
                    onChange={e => setTransferForm({ ...transferForm, userId: e.target.value })}
                  >
                    {staff.map(s => (
                      <MenuItem key={s.id} value={s.user.id}>
                        {s.firstName} {s.lastName} ({s.employeeId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>New Department</InputLabel>
                  <Select
                    value={transferForm.newDepartmentId}
                    label="New Department"
                    onChange={e => setTransferForm({ ...transferForm, newDepartmentId: e.target.value })}
                  >
                    {departments.map(d => (
                      <MenuItem key={d.id} value={d.id}>{d.name} ({d.code})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Justification for Transfer"
                  fullWidth
                  required
                  multiline
                  rows={3}
                  value={transferForm.justification}
                  onChange={e => setTransferForm({ ...transferForm, justification: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenTransfer(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Transfer</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* TRANSFER HISTORY DIALOG */}
      <Dialog open={openHistory} onClose={() => setOpenHistory(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Transfer History: {historyUser}</DialogTitle>
        <DialogContent dividers>
          {history.length === 0 ? (
            <Typography variant="body2" sx={{ py: 3, textAlign: 'center' }}>No transfer records found.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>From</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>To</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map(h => (
                    <TableRow key={h.id}>
                      <TableCell>{new Date(h.transferredAt).toLocaleDateString()}</TableCell>
                      <TableCell>{h.oldDepartment}</TableCell>
                      <TableCell>{h.newDepartment}</TableCell>
                      <TableCell>{h.justification}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistory(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DepartmentManagement;
