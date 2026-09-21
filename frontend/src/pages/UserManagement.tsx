import { useState, useEffect } from 'react';
import {
  Typography, Box, Card, CardContent, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl, Chip,
  Switch, Grid, Avatar, InputAdornment, FormHelperText, CircularProgress, Divider,
} from '@mui/material';
import {
  Add, Search, Edit, LockReset, Delete, Block, ToggleOn, ToggleOff,
  Portrait, WorkOutline, ShieldOutlined, EmailOutlined, AccountCircleOutlined,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  patientNumber: string | null;
  roles: { id: string; name: string }[];
  departments: { id: string; name: string; code: string }[];
  profilePicture: string | null;
  createdAt: string;
}

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
}

interface DeptItem {
  id: string;
  name: string;
  code: string;
}

const UserManagement = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [departments, setDepartments] = useState<DeptItem[]>([]);
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Dialog open controls
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openResetPw, setOpenResetPw] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    roles: [] as string[],
    departments: [] as string[],
    firstName: '',
    lastName: '',
    employeeId: '',
  });

  const [editForm, setEditForm] = useState({
    email: '',
    roles: [] as string[],
    departments: [] as string[],
    firstName: '',
    lastName: '',
    designation: '',
    specialization: '',
    licenseNumber: '',
  });

  const [resetPwPassword, setResetPwPassword] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users', {
        params: {
          search,
          role: roleFilter,
          department: deptFilter,
          page,
          limit: 10,
        },
      });
      setUsers(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to fetch user accounts', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const rolesRes = await api.get('/roles');
      setRoles(rolesRes.data);
      
      const deptRes = await api.get('/departments');
      setDepartments(deptRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, deptFilter, page]);

  useEffect(() => {
    fetchFilters();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.roles.length === 0 || createForm.departments.length === 0) {
      enqueueSnackbar('Please select at least one role and department', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/users', createForm);
      enqueueSnackbar('User account created successfully!', { variant: 'success' });
      setOpenCreate(false);
      setCreateForm({
        username: '',
        email: '',
        password: '',
        roles: [],
        departments: [],
        firstName: '',
        lastName: '',
        employeeId: '',
      });
      fetchUsers();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to create user account', { variant: 'error' });
    }
  };

  const handleEditOpen = (user: UserItem) => {
    setSelectedUserId(user.id);
    setEditForm({
      email: user.email,
      roles: user.roles.map(r => r.id),
      departments: user.departments.map(d => d.id),
      firstName: user.firstName,
      lastName: user.lastName,
      designation: '', // loaded below
      specialization: '',
      licenseNumber: '',
    });

    // Fetch user details to prefill details
    api.get(`/users/${user.id}`).then(res => {
      const details = res.data.staffDetails || {};
      setEditForm(prev => ({
        ...prev,
        designation: details.designation || '',
        specialization: details.specialization || '',
        licenseNumber: details.licenseNumber || '',
      }));
    });

    setOpenEdit(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/users/${selectedUserId}`, editForm);
      enqueueSnackbar('User account updated successfully!', { variant: 'success' });
      setOpenEdit(false);
      fetchUsers();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to update user account', { variant: 'error' });
    }
  };

  const handleResetPwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/users/${selectedUserId}/reset-password`, { newPassword: resetPwPassword });
      enqueueSnackbar('Password reset successfully! Force change triggers at login.', { variant: 'success' });
      setOpenResetPw(false);
      setResetPwPassword('');
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to reset password', { variant: 'error' });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.post(`/users/${id}/status`, { isActive: !currentStatus });
      enqueueSnackbar(`User account ${!currentStatus ? 'activated' : 'deactivated'} successfully.`, { variant: 'success' });
      fetchUsers();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to change user status', { variant: 'error' });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      enqueueSnackbar('User deleted successfully', { variant: 'success' });
      fetchUsers();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Deactivation recommended: records exist', { variant: 'error', autoHideDuration: 6000 });
    }
  };

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>User Accounts Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenCreate(true)}
          sx={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #4c6ef5 100%)', borderRadius: 2 }}
        >
          Add User Account
        </Button>
      </Box>

      {/* Filter Section */}
      <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name, username or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Role</InputLabel>
                <Select
                  value={roleFilter}
                  label="Filter by Role"
                  onChange={e => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="">All Roles</MenuItem>
                  {roles.map(r => (
                    <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Department</InputLabel>
                <Select
                  value={deptFilter}
                  label="Filter by Department"
                  onChange={e => setDeptFilter(e.target.value)}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map(d => (
                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2} sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" fullWidth size="small" onClick={() => { setSearch(''); setRoleFilter(''); setDeptFilter(''); }}>
                Reset
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Staff ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Roles</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Departments</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar src={u.profilePicture || undefined} alt={u.firstName}>
                          {u.firstName?.[0] || u.username?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {u.firstName} {u.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            @{u.username} • {u.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {u.employeeId || 'STAFF'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {u.roles.map(r => (
                          <Chip key={r.id} label={r.name} size="small" variant="outlined" color="primary" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {u.departments.map(d => (
                          <Chip key={d.id} label={d.code} size="small" variant="outlined" color="secondary" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Switch
                          checked={u.isActive}
                          onChange={() => handleToggleStatus(u.id, u.isActive)}
                          size="small"
                        />
                        <Chip
                          label={u.isActive ? 'Active' : 'Deactivated'}
                          size="small"
                          color={u.isActive ? 'success' : 'error'}
                          sx={{ ml: 1, height: 20 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton color="primary" onClick={() => handleEditOpen(u)} title="Edit user">
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton color="warning" onClick={() => { setSelectedUserId(u.id); setOpenResetPw(true); }} title="Reset password">
                        <LockReset fontSize="small" />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDeleteUser(u.id)} title="Delete account">
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create New User Account</DialogTitle>
        <form onSubmit={handleCreateSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  fullWidth
                  required
                  value={createForm.firstName}
                  onChange={e => setCreateForm({ ...createForm, firstName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  fullWidth
                  required
                  value={createForm.lastName}
                  onChange={e => setCreateForm({ ...createForm, lastName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Username"
                  fullWidth
                  required
                  placeholder="Min 5 characters"
                  value={createForm.username}
                  onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Staff ID / Employee ID"
                  fullWidth
                  required
                  placeholder="e.g. DOC-123"
                  value={createForm.employeeId}
                  onChange={e => setCreateForm({ ...createForm, employeeId: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Email Address"
                  fullWidth
                  required
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Temporary Password"
                  fullWidth
                  required
                  type="password"
                  value={createForm.password}
                  onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  helperText="User must change this temporary password at first login."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Roles</InputLabel>
                  <Select
                    multiple
                    value={createForm.roles}
                    label="Roles"
                    onChange={e => setCreateForm({ ...createForm, roles: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const r = roles.find(item => item.id === value);
                          return <Chip key={value} label={r ? r.name : value} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {roles.map(r => (
                      <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Departments</InputLabel>
                  <Select
                    multiple
                    value={createForm.departments}
                    label="Departments"
                    onChange={e => setCreateForm({ ...createForm, departments: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const d = departments.find(item => item.id === value);
                          return <Chip key={value} label={d ? d.name : value} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {departments.map(d => (
                      <MenuItem key={d.id} value={d.id}>{d.name} ({d.code})</MenuItem>
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
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Edit User Profile</DialogTitle>
        <form onSubmit={handleEditSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  fullWidth
                  required
                  value={editForm.firstName}
                  onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  fullWidth
                  required
                  value={editForm.lastName}
                  onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Email Address"
                  fullWidth
                  required
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Roles</InputLabel>
                  <Select
                    multiple
                    value={editForm.roles}
                    label="Roles"
                    onChange={e => setEditForm({ ...editForm, roles: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const r = roles.find(item => item.id === value);
                          return <Chip key={value} label={r ? r.name : value} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {roles.map(r => (
                      <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Departments</InputLabel>
                  <Select
                    multiple
                    value={editForm.departments}
                    label="Departments"
                    onChange={e => setEditForm({ ...editForm, departments: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const d = departments.find(item => item.id === value);
                          return <Chip key={value} label={d ? d.name : value} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {departments.map(d => (
                      <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Clinical/Job Details</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Designation"
                  fullWidth
                  value={editForm.designation}
                  onChange={e => setEditForm({ ...editForm, designation: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Specialization"
                  fullWidth
                  value={editForm.specialization}
                  onChange={e => setEditForm({ ...editForm, specialization: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="License Number"
                  fullWidth
                  value={editForm.licenseNumber}
                  onChange={e => setEditForm({ ...editForm, licenseNumber: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* RESET PW DIALOG */}
      <Dialog open={openResetPw} onClose={() => setOpenResetPw(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Force Reset Password</DialogTitle>
        <form onSubmit={handleResetPwSubmit}>
          <DialogContent dividers>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Reset the user's password. They will be forced to choose a new password upon their next sign-in.
            </Typography>
            <TextField
              label="Temporary Password"
              type="password"
              fullWidth
              required
              value={resetPwPassword}
              onChange={e => setResetPwPassword(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenResetPw(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="warning">Reset Password</Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};

export default UserManagement;
