import { useState, useEffect } from 'react';
import {
  Typography, Box, Card, CardContent, Button, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Checkbox, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, Divider, CircularProgress, Stack,
} from '@mui/material';
import { Add, Save, AdminPanelSettings, Security } from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

interface PermissionItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
}

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  permissions: { permissionId: string }[];
}

const RoleManagement = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);

  // Form state
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions'),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to fetch role-permission matrix', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/roles', newRole);
      enqueueSnackbar('New Role created successfully!', { variant: 'success' });
      setOpenCreate(false);
      setNewRole({ name: '', description: '', permissions: [] });
      fetchData();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to create role', { variant: 'error' });
    }
  };

  const handleTogglePermission = async (role: RoleItem, permissionId: string, isAssigned: boolean) => {
    // Determine updated permissions list for the role
    let updatedPermIds = role.permissions.map(p => p.permissionId);
    
    if (isAssigned) {
      // Remove
      updatedPermIds = updatedPermIds.filter(id => id !== permissionId);
    } else {
      // Add
      updatedPermIds.push(permissionId);
    }

    try {
      await api.put(`/roles/${role.id}`, {
        name: role.name,
        description: role.description || '',
        permissions: updatedPermIds,
      });
      enqueueSnackbar(`Permissions updated for role ${role.name}`, { variant: 'success' });
      fetchData();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to update role permissions', { variant: 'error' });
    }
  };

  // Group permissions by module for layout
  const permissionsByModule: Record<string, PermissionItem[]> = {};
  permissions.forEach(p => {
    if (!permissionsByModule[p.module]) {
      permissionsByModule[p.module] = [];
    }
    permissionsByModule[p.module].push(p);
  });

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Role & Permissions Matrix</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenCreate(true)}
          sx={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #4c6ef5 100%)', borderRadius: 2 }}
        >
          Create New Role
        </Button>
      </Box>

      {/* Role list cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {roles.map(r => (
          <Grid item xs={12} sm={6} md={4} key={r.id}>
            <Card sx={{ height: '100%', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <AdminPanelSettings color="primary" />
                  <Typography variant="h6" fontWeight={700}>{r.name}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40, mb: 2 }}>
                  {r.description || 'No description provided.'}
                </Typography>
                <Chip
                  label={`${r.permissions.length} Permissions Mapped`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Matrix view */}
      <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Security color="primary" />
            <Typography variant="h6" fontWeight={700}>Role-Permission Authorization Matrix</Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Permission / Feature Rule</TableCell>
                    {roles.map(role => (
                      <TableCell key={role.id} align="center" sx={{ fontWeight: 'bold' }}>
                        {role.name}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(permissionsByModule).map(([moduleName, modulePerms]) => (
                    <span key={moduleName} style={{ display: 'contents' }}>
                      {/* Module header row */}
                      <TableRow>
                        <TableCell colSpan={roles.length + 1} sx={{ bgcolor: 'grey.100', fontWeight: 'bold', py: 1 }}>
                          {moduleName.toUpperCase()} MODULE
                        </TableCell>
                      </TableRow>
                      {modulePerms.map(perm => (
                        <TableRow key={perm.id} hover>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{perm.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{perm.description || perm.code}</Typography>
                          </TableCell>
                          {roles.map(role => {
                            const isAssigned = role.permissions.some(p => p.permissionId === perm.id);
                            const isSuperAdmin = role.name === 'SUPER_ADMIN'; // SUPER_ADMIN is immutable full access
                            return (
                              <TableCell key={role.id} align="center">
                                <Checkbox
                                  checked={isSuperAdmin || isAssigned}
                                  disabled={isSuperAdmin}
                                  onChange={() => handleTogglePermission(role, perm.id, isAssigned)}
                                  size="small"
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </span>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* CREATE ROLE DIALOG */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create New System Role</DialogTitle>
        <form onSubmit={handleCreateSubmit}>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Role Name"
                fullWidth
                required
                placeholder="e.g. BILLING_MANAGER"
                value={newRole.name}
                onChange={e => setNewRole({ ...newRole, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                helperText="Use capital letters and underscores only."
              />
              <TextField
                label="Role Description"
                fullWidth
                multiline
                rows={3}
                placeholder="Describe role responsibilities..."
                value={newRole.description}
                onChange={e => setNewRole({ ...newRole, description: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create Role</Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};

export default RoleManagement;
