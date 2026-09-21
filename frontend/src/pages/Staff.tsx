import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Avatar, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, InputAdornment, Stack, Alert,
  FormControlLabel, Checkbox, Tooltip, CircularProgress, Paper,
  Tabs, Tab, Autocomplete,
} from '@mui/material';
import {
  Search, Edit, Delete, Phone, Email, Badge as BadgeIcon,
  Lock, CheckCircle, PersonAdd, AdminPanelSettings, Refresh,
  Visibility, VisibilityOff, Group, Assignment,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ── Role → UserRole enum mapping ─────────────────────────────────────────
const ROLE_ENUM_MAP: Record<string, string> = {
  'Doctor':              'DOCTOR',
  'Nurse':               'NURSE',
  'Pharmacist':          'PHARMACIST',
  'Pharmacy Technician': 'PHARMACIST',
  'Pharmacy Technicians':'PHARMACIST',
  'Lab Technician':      'LAB_TECHNICIAN',
  'Lab Scientist':       'LAB_SCIENTIST',
  'Pathologist':         'PATHOLOGIST',
  'Admin':               'ADMIN',
  'Receptionist':        'RECEPTIONIST',
  'Accountant':          'STAFF',
  'Auditor':             'STAFF',
  'Insurance Officer':   'STAFF',
  'Secretary':           'STAFF',
  'Super Admin':         'SUPER_ADMIN',
};

// ── Role → default module access ─────────────────────────────────────────
const ROLE_MODULES: Record<string, string[]> = {
  'Doctor':              ['OPD', 'IPD', 'EMR', 'Appointments', 'Pharmacy', 'Lab', 'Radiology', 'Telemedicine'],
  'Nurse':               ['Nursing', 'IPD', 'EMR', 'Appointments', 'EMAR', 'ICU'],
  'Pharmacist':          ['Pharmacy', 'Inventory'],
  'Pharmacy Technician': ['Pharmacy', 'Inventory'],
  'Pharmacy Technicians':['Pharmacy', 'Inventory'],
  'Lab Technician':      ['LIMS', 'Lab', 'Pathology', 'Inventory'],
  'Lab Scientist':       ['LIMS', 'Lab', 'Pathology', 'Inventory'],
  'Pathologist':         ['Pathology', 'LIMS', 'Lab', 'Inventory'],
  'Admin':               ['Dashboard', 'Staff', 'Timesheets', 'Reports', 'Analytics'],
  'Receptionist':        ['OPD', 'Appointments', 'Queue', 'Patients'],
  'Accountant':          ['Finance', 'Billing', 'Reports'],
  'Auditor':             ['Audit', 'Reports'],
  'Insurance Officer':   ['Billing', 'Finance', 'Reports', 'Documents'],
  'Mortician':           ['Mortuary'],
  'Physiotherapist':     ['Rehabilitation'],
  'Radiologist':         ['Radiology'],
  'Radiographer':        ['Radiology'],
  'Radiology Technician':['Radiology'],
  'Secretary':           ['Appointments', 'Queue', 'Patients'],
  'Super Admin':         ['Dashboard', 'OPD', 'IPD', 'EMR', 'Appointments', 'Pharmacy', 'Lab', 'Radiology',
                          'Nursing', 'ICU', 'Theatre', 'LIMS', 'Billing', 'Finance', 'Inventory', 'HR',
                          'Reports', 'Settings', 'Users', 'Staff', 'Audit', 'Departments', 'Telemedicine',
                          'EMAR', 'Emergency', 'Queue', 'Patients', 'Documents', 'Analytics'],
};

const ALL_MODULES = Array.from(new Set(Object.values(ROLE_MODULES).flat())).sort();

export const normalizeStaffRole = (role?: string, designation?: string, department?: string): string => {
  const combined = `${role || ''} ${designation || ''} ${department || ''}`.toLowerCase();
  
  if (combined.includes('bishop') || combined.includes('patron')) return 'Bishop';
  if (
    combined.includes('cmd') ||
    combined.includes('chief medical director') ||
    combined.includes('medical director') ||
    combined.includes('clinical services director') ||
    combined.includes('doctor') ||
    combined.includes('physician') ||
    combined.includes('surgeon') ||
    combined.includes('paediatrician') ||
    combined.includes('anaesthetist') ||
    combined.includes('gynaecologist') ||
    combined.includes('medical officer') ||
    combined.includes('registrar') ||
    combined.includes('resident') ||
    combined.includes('house officer') ||
    combined.includes('mdcn')
  ) return 'Doctor';
  if (combined.includes('nurse') || combined.includes('nursing') || combined.includes('midwife') || combined.includes('matron') || combined.includes('cno') || combined.includes('dns') || combined.includes('nmcn')) return 'Nurse';
  if (combined.includes('pharmacy tech') || combined.includes('dispensary tech')) return 'Pharmacy Technician';
  if (combined.includes('pharmacist') || combined.includes('pharmacy') || combined.includes('pcn')) return 'Pharmacist';
  if (combined.includes('lab tech') || combined.includes('laboratory tech') || combined.includes('medical laboratory tech')) return 'Lab Technician';
  if (combined.includes('lab scientist') || combined.includes('laboratory') || combined.includes('lims') || combined.includes('mlscn') || combined.includes('medical lab')) return 'Lab Scientist';
  if (combined.includes('radiologist') || combined.includes('radiology') || combined.includes('radiograph') || combined.includes('sonograph') || combined.includes('rrbn') || combined.includes('x-ray') || combined.includes('ct/mri')) return 'Radiologist';
  if (combined.includes('pathologist') || combined.includes('pathology') || combined.includes('histopath')) return 'Pathologist';
  if (combined.includes('physiotherap') || combined.includes('mrtbn') || combined.includes('rehab')) return 'Physiotherapist';
  if (combined.includes('mortician') || combined.includes('mortuary') || combined.includes('funeral')) return 'Mortician';
  if (combined.includes('record') || combined.includes('him') || combined.includes('health info') || combined.includes('emr/records') || combined.includes('archivist')) return 'Record Officer';
  if (combined.includes('insurance') || combined.includes('hmo') || combined.includes('nhis') || combined.includes('claims')) return 'Insurance Officer';
  if (combined.includes('accountant') || combined.includes('accounting') || combined.includes('accounts') || combined.includes('finance') || combined.includes('bursar') || combined.includes('cashier') || combined.includes('ican') || combined.includes('anand')) return 'Accountant';
  if (combined.includes('auditor') || combined.includes('audit') || combined.includes('compliance officer')) return 'Auditor';
  if (combined.includes('secretary') || combined.includes('clerk') || combined.includes('assistant') || combined.includes('front desk') || combined.includes('receptionist')) return 'Secretary';
  if (combined.includes('admin') || combined.includes('ceo') || combined.includes('coordinator') || combined.includes('executive') || combined.includes('operations')) return 'Admin';
  
  return 'Doctor';
};

// ── Role → Portfolio / Rank / Sub-Specialty Level Hierarchical Mapping ────────
export const PORTFOLIO_MAP: Record<string, string[]> = {
  'Doctor': [
    'Chief Medical Director (CMD)',
    'Chief Medical Director / Board Chair',
    'Medical Director (MD)',
    'Clinical Services Director & Consultant',
    'Director of Medical Services',
    'Chief Consultant Physician',
    'Chief Consultant Surgeon',
    'Senior Consultant Specialist',
    'Consultant Physician',
    'Consultant Surgeon',
    'Consultant Obstetrician & Gynaecologist',
    'Consultant Paediatrician',
    'Consultant Anaesthetist',
    'Consultant Radiologist',
    'Consultant Pathologist',
    'Consultant Psychiatrist',
    'Senior Registrar',
    'Registrar',
    'Principal Medical Officer (PMO)',
    'Senior Medical Officer (SMO)',
    'Medical Officer (MO)',
    'House Officer (Junior Resident)',
  ],
  'Nurse': [
    'Director of Nursing Services (DNS)',
    'Chief Nursing Officer (CNO)',
    'Chief Nursing Officer / Directorate Head',
    'Assistant Chief Nursing Officer (ACNO)',
    'Principal Nursing Officer (PNO)',
    'Senior Nursing Officer (SNO)',
    'Nursing Officer I (NO I)',
    'Nursing Officer II (NO II)',
    'Matron / Ward Sister',
    'Registered Nurse (RN)',
    'Registered Midwife (RM)',
    'Perioperative Specialist Nurse',
    'Intensive Care (ICU) Specialist Nurse',
    'Emergency & Critical Care Specialist Nurse',
  ],
  'Pharmacist': [
    'Director of Pharmacy Services (DPS)',
    'Chief Pharmacist (CP)',
    'Assistant Chief Pharmacist (ACP)',
    'Principal Pharmacist (PP)',
    'Senior Pharmacist (SP)',
    'Clinical Pharmacist Specialist',
    'Pharmacist Grade I',
    'Pharmacist Grade II',
    'Intern Pharmacist',
  ],
  'Pharmacy Technician': [
    'Chief Pharmacy Technician',
    'Senior Pharmacy Technician',
    'Pharmacy Technician',
  ],
  'Pharmacy Technicians': [
    'Chief Pharmacy Technician',
    'Senior Pharmacy Technician',
    'Pharmacy Technician',
  ],
  'Lab Scientist': [
    'Director of Medical Laboratory Services',
    'Chief Medical Laboratory Scientist (CMLS)',
    'Assistant Chief Medical Laboratory Scientist',
    'Principal Medical Laboratory Scientist (PMLS)',
    'Senior Medical Laboratory Scientist (SMLS)',
    'Medical Laboratory Scientist I',
    'Medical Laboratory Scientist II',
    'Intern Medical Laboratory Scientist',
  ],
  'Lab Technician': [
    'Chief Medical Laboratory Technician',
    'Senior Medical Laboratory Technician',
    'Medical Laboratory Technician',
  ],
  'Admin': [
    'Hospital Administrator (HA)',
    'Director of Administration',
    'Head of Human Resources',
    'Principal Administrative Officer',
    'Senior Administrative Officer',
    'Administrative Officer I',
    'Administrative Officer II',
  ],
  'Accountant': [
    'Chief Financial Officer (CFO)',
    'Chief Accountant',
    'Head of Treasury & Billing',
    'Principal Accountant',
    'Senior Accountant',
    'Revenue & Reconciliation Officer',
    'Payroll & Tax Accountant',
    'Cashier / Billing Officer',
  ],
  'Auditor': [
    'Chief Internal Auditor',
    'Senior Internal Auditor',
    'Clinical / Financial Auditor',
    'Internal Auditor',
  ],
  'Radiologist': [
    'Consultant Radiologist',
    'Senior Radiologist',
    'Chief Radiographer',
    'Senior Radiographer',
    'Radiographer I',
    'Radiographer II',
    'Sonographer / Ultrasound Specialist',
    'MRI / CT Scan Technologist',
    'X-Ray Technician',
  ],
  'Pathologist': [
    'Consultant Pathologist',
    'Chief Consultant Histopathologist',
    'Clinical Pathologist',
    'Haematopathologist',
    'Forensic Pathologist',
  ],
  'Physiotherapist': [
    'Director of Physiotherapy & Rehabilitation',
    'Chief Physiotherapist',
    'Senior Physiotherapist',
    'Orthopaedic Physiotherapist',
    'Neuro-Physiotherapist',
    'Cardiopulmonary Physiotherapist',
    'Physiotherapist I',
    'Physiotherapist II',
  ],
  'Mortician': [
    'Chief Mortuary Superintendent',
    'Senior Mortician / Embalmer',
    'Mortuary Technician',
    'Funeral Services Coordinator',
  ],
  'Record Officer': [
    'Head of Health Information Management (HIM)',
    'Principal Health Records Officer',
    'Senior Health Records Officer',
    'Health Records Officer / EMR Specialist',
    'Front Desk / Patient Registration Officer',
  ],
  'Insurance Officer': [
    'Head of NHIA & Managed Care',
    'Senior HMO Claims Officer',
    'HMO Desk Officer / Pre-Authorization Specialist',
    'Insurance Reconciliation Officer',
  ],
  'Secretary': [
    'Principal Confidential Secretary',
    'Senior Confidential Secretary',
    'Executive Assistant to CMD/MD',
    'Departmental Secretary',
  ],
  'Bishop': [
    'Most Rev. Diocesan Bishop',
    'Vicar General / Health Commission Chairman',
    'Diocesan Health Coordinator',
    'Episcopal Hospital Chaplain',
  ],
  'Receptionist': [
    'Lead Front Desk Executive',
    'Senior Medical Receptionist',
    'Patient Records / Front Desk Officer',
  ],
  'Super Admin': [
    'System Administrator / Chief Technology Officer',
    'IT System Administrator',
  ],
};

// ── Role display colors ───────────────────────────────────────────────────
const roleColor: Record<string, string> = {
  Doctor: '#3b5bdb', Nurse: '#0ca678', Pharmacist: '#f59f00',
  'Pharmacy Technician': '#f59f00', 'Pharmacy Technicians': '#f59f00',
  'Lab Technician': '#1c7ed6', 'Lab Scientist': '#1c7ed6', Admin: '#6741d9', Receptionist: '#f03e3e',
  Accountant: '#2f9e44', 'Super Admin': '#c2410c', STAFF: '#64748b',
  Auditor: '#0891b2', 'Insurance Officer': '#e64980', Secretary: '#7048e8',
};

const STAFF_ROLES = Object.keys(ROLE_ENUM_MAP);
const STATUS_OPTIONS = ['Active', 'On Leave', 'Resigned', 'Suspended'];

const emptyForm = {
  employeeId: '',
  firstName: '', lastName: '', phone: '', email: '',
  role: '', roleId: '', departmentId: '',
  salary: '', joinDate: new Date().toISOString().split('T')[0],
  status: 'Active',
  licenseNumber: '', designation: '', specialization: '',
  modules: [] as string[],
};

interface StaffRecord {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  roles: { id: string; name: string }[];
  departments: { id: string; name: string; code: string }[];
  profilePicture?: string | null;
  createdAt: string;
}

const Staff = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user: authUser } = useAuth();

  // ── State ─────────────────────────────────────────────────────────────
  const [open, setOpen]           = useState(false);
  const [tabIdx, setTabIdx]       = useState(0);
  const [search, setSearch]       = useState('');
  const [form, setForm]           = useState({ ...emptyForm });
  const [editId, setEditId]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [roles, setRoles]         = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [nextId, setNextId]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Load staff, roles, departments ────────────────────────────────────
  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', { params: { limit: 100 } });
      // filter to non-patient accounts
      const all: StaffRecord[] = (res.data.data || []).filter((u: any) =>
        u.role !== 'PATIENT'
      );
      setStaffList(all);
    } catch (err: any) {
      enqueueSnackbar('Failed to load staff list', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const loadRoles = useCallback(async () => {
    try {
      const res = await api.get('/roles');
      setRoles(res.data || []);
    } catch { /* non-fatal */ }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data || []);
    } catch { /* non-fatal */ }
  }, []);

  const fetchNextId = useCallback(async () => {
    try {
      const res = await api.get('/system/staff/next-id');
      if (res.data?.ok) setNextId(res.data.nextId);
    } catch {
      // Fall back to localStorage format
      const saved = localStorage.getItem('staff_id_format');
      const fmt = saved ? JSON.parse(saved) : { prefix: 'FF', separator: '-', digits: 4, startFrom: 1 };
      setNextId(`${fmt.prefix}${fmt.separator}${String(fmt.startFrom).padStart(fmt.digits, '0')}`);
    }
  }, []);

  useEffect(() => {
    loadStaff();
    loadRoles();
    loadDepartments();
  }, [loadStaff, loadRoles, loadDepartments]);

  // ── Filter ────────────────────────────────────────────────────────────
  const filtered = staffList.filter(s => {
    const q = search.toLowerCase();
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    return name.includes(q) || s.email.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) || (s.employeeId || '').toLowerCase().includes(q);
  });

  // ── Summary stats ─────────────────────────────────────────────────────
  const summaryStats = [
    { label: 'Total Staff', value: staffList.length, color: '#3b5bdb' },
    { label: 'Doctors', value: staffList.filter(s => s.role === 'DOCTOR').length, color: '#0ca678' },
    { label: 'Nurses', value: staffList.filter(s => s.role === 'NURSE').length, color: '#f59f00' },
    { label: 'Active', value: staffList.filter(s => s.isActive).length, color: '#2f9e44' },
  ];

  // ── Role display label ────────────────────────────────────────────────
  const roleLabel = (r: string) => {
    const map: Record<string, string> = {
      DOCTOR: 'Doctor', NURSE: 'Nurse', PHARMACIST: 'Pharmacist',
      LAB_TECHNICIAN: 'Lab Technician', ADMIN: 'Admin', RECEPTIONIST: 'Receptionist',
      STAFF: 'Staff', SUPER_ADMIN: 'Super Admin',
      AUDITOR: 'Auditor', INSURANCE_OFFICER: 'Insurance Officer',
      SECRETARY: 'Secretary',
      LAB_SCIENTIST: 'Lab Scientist',
      PHARMACY_TECHNICIAN: 'Pharmacy Technician',
      PHARMACY_TECHNICIANS: 'Pharmacy Technicians',
    };
    return map[r] || r;
  };

  const roleColorFor = (r: string) => roleColor[roleLabel(r)] || '#64748b';

  // ── Open dialog ───────────────────────────────────────────────────────
  const handleOpen = async (item?: StaffRecord) => {
    setTabIdx(0);
    if (item) {
      setEditId(item.id);
      const displayRole = item.roles[0]?.name ? roleLabel(item.roles[0].name) : roleLabel(item.role);
      setForm({
        employeeId:  item.employeeId || '',
        firstName:   item.firstName,
        lastName:    item.lastName,
        phone:       '',
        email:       item.email,
        role:        displayRole,
        roleId:      item.roles[0]?.id || '',
        departmentId: item.departments[0]?.id || '',
        salary:      '',
        joinDate:    new Date().toISOString().split('T')[0],
        status:      item.isActive ? 'Active' : 'Resigned',
        licenseNumber: '',
        designation:  '',
        specialization: '',
        modules:     ROLE_MODULES[displayRole] || [],
      });
    } else {
      setEditId(null);
      await fetchNextId();
      setForm({ ...emptyForm, employeeId: nextId, modules: [] });
    }
    setOpen(true);
  };

  // When role changes, update modules to defaults
  const handleRoleChange = (roleName: string) => {
    const defaults = ROLE_MODULES[roleName] || [];
    const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s_-]+/g, '');
    const roleId = roles.find(r => normalize(r.name) === normalize(roleName))?.id || '';
    setForm(prev => ({ ...prev, role: roleName, roleId, modules: defaults }));
  };

  // ── Save staff ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.role || !form.email) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'warning' });
      return;
    }
    if (!form.employeeId) {
      enqueueSnackbar('Staff ID is required', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        // Update existing
        await api.put(`/users/${editId}`, {
          email:         form.email,
          firstName:     form.firstName,
          lastName:      form.lastName,
          designation:   form.designation,
          specialization: form.specialization,
          licenseNumber: form.licenseNumber,
          isActive:      form.status === 'Active',
          roles:         form.roleId ? [form.roleId] : undefined,
          departments:   form.departmentId ? [form.departmentId] : undefined,
          employeeId:    form.employeeId,
        });
        enqueueSnackbar('Staff record updated successfully', { variant: 'success' });
      } else {
        // Create new user + staff + account
        const userRole = ROLE_ENUM_MAP[form.role] || 'STAFF';
        const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s_-]+/g, '');

        // Resolve roleId from roles list
        let resolvedRoleId = form.roleId;
        if (!resolvedRoleId && roles.length > 0) {
          const matched = roles.find(r => normalize(r.name) === normalize(form.role));
          resolvedRoleId = matched?.id || roles[0].id;
        }

        // Resolve departmentId
        let resolvedDeptId = form.departmentId;
        if (!resolvedDeptId && departments.length > 0) {
          resolvedDeptId = departments[0].id;
        }

        await api.post('/users', {
          username:    form.employeeId,        // Staff ID = username
          email:       form.email,
          password:    form.employeeId,        // Staff ID = temporary password
          role:        userRole,
          roles:       [resolvedRoleId],
          departments: [resolvedDeptId],
          firstName:   form.firstName,
          lastName:    form.lastName,
          employeeId:  form.employeeId,
        });

        enqueueSnackbar(
          `✅ Staff registered! Username: ${form.employeeId} | Temp Password: ${form.employeeId}`,
          { variant: 'success', autoHideDuration: 7000 }
        );
      }

      setOpen(false);
      await loadStaff();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save staff';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete / deactivate ───────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await api.put(`/users/${id}`, { isActive: false, email: staffList.find(s => s.id === id)?.email || '' });
      enqueueSnackbar('Staff account deactivated', { variant: 'warning' });
      setDeleteConfirm(null);
      await loadStaff();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to deactivate', { variant: 'error' });
    }
  };

  // Super-admin check via auth context
  const isSuperAdmin = authUser?.role === 'SUPER_ADMIN' || authUser?.roles?.includes('SUPER_ADMIN');

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Staff Management</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Onboard staff, assign roles &amp; automatically create login accounts
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh staff list">
            <IconButton onClick={loadStaff} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<PersonAdd />} onClick={() => handleOpen()}
            sx={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #6741d9 100%)' }}>
            Onboard &amp; Register Staff
          </Button>
        </Stack>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} mb={3}>
        {summaryStats.map(s => (
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

      {/* Table */}
      <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>All Staff Accounts</Typography>
            <TextField
              placeholder="Search by name, role, ID…"
              size="small"
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
              sx={{ width: 280 }}
            />
          </Box>

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary" mt={2}>Loading staff…</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                    <TableCell>Staff</TableCell>
                    <TableCell>Staff ID</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No staff records found
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(s => (
                    <TableRow key={s.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 38, height: 38, fontSize: '0.8rem', fontWeight: 700,
                              bgcolor: alpha(roleColorFor(s.roles[0]?.name || s.role), 0.15),
                              color: roleColorFor(s.roles[0]?.name || s.role),
                            }}
                          >
                            {`${s.firstName[0] || ''}${s.lastName[0] || ''}`}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{s.firstName} {s.lastName}</Typography>
                            <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={s.employeeId || '—'}
                          size="small"
                          icon={<BadgeIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.72rem', bgcolor: 'action.hover' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={s.roles[0]?.name ? roleLabel(s.roles[0].name) : roleLabel(s.role)}
                          size="small"
                          sx={{ 
                            bgcolor: alpha(roleColorFor(s.roles[0]?.name || s.role), 0.12), 
                            color: roleColorFor(s.roles[0]?.name || s.role), 
                            fontWeight: 600 
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{s.departments[0]?.name || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.3}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Email sx={{ fontSize: 13, color: 'text.secondary' }} />
                            <Typography variant="caption">{s.email}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={s.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={s.isActive ? 'success' : 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit staff">
                          <IconButton size="small" onClick={() => handleOpen(s)} sx={{ color: 'primary.main' }}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate account">
                          <IconButton size="small" onClick={() => setDeleteConfirm(s.id)} sx={{ color: 'error.main' }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ─── Onboard / Edit Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        {/* Dialog Header */}
        <Box sx={{
          background: 'linear-gradient(135deg, #3b5bdb 0%, #6741d9 100%)',
          px: 3, py: 2.5,
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          {editId ? <Edit sx={{ color: '#fff' }} /> : <PersonAdd sx={{ color: '#fff' }} />}
          <Box>
            <Typography variant="h6" fontWeight={700} color="#fff">
              {editId ? 'Edit Staff Member' : 'Onboard & Register Staff'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              {editId ? 'Update staff record and account settings' : 'Create staff record + system login account automatically'}
            </Typography>
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tabIdx}
          onChange={(_, v) => setTabIdx(v)}
          sx={{ px: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Tab icon={<BadgeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Identity" />
          <Tab icon={<Assignment sx={{ fontSize: 18 }} />} iconPosition="start" label="Role & Access" />
          {!editId && <Tab icon={<Lock sx={{ fontSize: 18 }} />} iconPosition="start" label="Account" />}
        </Tabs>

        <DialogContent sx={{ pt: 3 }}>
          {/* ── TAB 0: Identity ─────────────────────────────────────────── */}
          {tabIdx === 0 && (
            <Grid container spacing={2.5}>
              {/* Staff ID */}
              <Grid item xs={12}>
                <Alert
                  severity="info"
                  icon={<BadgeIcon />}
                  sx={{ mb: 0.5, '& .MuiAlert-message': { width: '100%' } }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        Staff ID (auto-generated from Settings format)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {editId ? 'You can edit this ID if no clinical records are linked.' : 'This ID will also be the login username and temporary password.'}
                      </Typography>
                    </Box>
                    {!editId && (
                      <Button size="small" variant="outlined" startIcon={<Refresh />}
                        onClick={async () => { await fetchNextId(); setForm(p => ({ ...p, employeeId: nextId })); }}>
                        Refresh ID
                      </Button>
                    )}
                  </Box>
                </Alert>
                <TextField
                  label="Staff ID / Employee ID"
                  fullWidth
                  value={form.employeeId}
                  onChange={e => setForm(p => ({ ...p, employeeId: e.target.value.toUpperCase() }))}
                  InputProps={{
                    readOnly: !editId && !!nextId,
                    startAdornment: <InputAdornment position="start"><BadgeIcon color="primary" /></InputAdornment>,
                    sx: { fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem' },
                  }}
                  sx={{ mt: 1 }}
                  helperText={editId ? 'Editing the Staff ID updates only the identifier (ensure no active clinical data references it)' : `Auto-generated — configure format in Settings → Staff ID Format`}
                />
              </Grid>

              {/* Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name *"
                  fullWidth
                  value={form.firstName}
                  onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name *"
                  fullWidth
                  value={form.lastName}
                  onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                />
              </Grid>

              {/* Contact */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email Address *"
                  type="email"
                  fullWidth
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 18 }} /></InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone Number"
                  fullWidth
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Phone sx={{ fontSize: 18 }} /></InputAdornment> }}
                />
              </Grid>

              {/* Professional */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={PORTFOLIO_MAP[form.role] || [
                    'Senior Consultant',
                    'Consultant Specialist',
                    'Senior Medical Officer',
                    'Medical Officer',
                    'Chief Specialist',
                    'Senior Specialist',
                    'Specialist',
                  ]}
                  value={form.designation}
                  onInputChange={(_, val) => setForm(p => ({ ...p, designation: val }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={`Portfolio / Rank (${form.role || 'Staff'})`}
                      placeholder="Choose or type portfolio (e.g. Senior Consultant)..."
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Specialization"
                  fullWidth
                  placeholder="e.g. Cardiology"
                  value={form.specialization}
                  onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="License Number"
                  fullWidth
                  placeholder="e.g. MDCN-L-44910"
                  value={form.licenseNumber}
                  onChange={e => setForm(p => ({ ...p, licenseNumber: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Salary (₦)"
                  fullWidth
                  type="number"
                  value={form.salary}
                  onChange={e => setForm(p => ({ ...p, salary: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Join Date"
                  type="date"
                  fullWidth
                  value={form.joinDate}
                  onChange={e => setForm(p => ({ ...p, joinDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label="Status" fullWidth value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
          )}

          {/* ── TAB 1: Role & Module Access ──────────────────────────────── */}
          {tabIdx === 1 && (
            <Grid container spacing={2.5}>
              {/* Role selection */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Job Role *"
                  fullWidth
                  value={form.role}
                  onChange={e => handleRoleChange(e.target.value)}
                >
                  {STAFF_ROLES.map(r => (
                    <MenuItem key={r} value={r}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: roleColor[r] || '#64748b' }} />
                        {r}
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Department */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Department *"
                  fullWidth
                  value={form.departmentId}
                  onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}
                >
                  {departments.map(d => (
                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* System role */}
              <Grid item xs={12}>
                <TextField
                  select
                  label="System Role (from Roles DB)"
                  fullWidth
                  value={form.roleId}
                  onChange={e => setForm(p => ({ ...p, roleId: e.target.value }))}
                  helperText="The actual RBAC role assigned in the system. Defaults to job role match."
                >
                  {roles.map(r => (
                    <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Module access */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Group color="primary" sx={{ fontSize: 20 }} />
                      <Typography variant="subtitle2" fontWeight={700}>Module Access</Typography>
                      <Chip label={`${form.modules.length} / ${ALL_MODULES.length}`} size="small" color="primary" />
                    </Box>
                    {(isSuperAdmin || !editId) && (
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => setForm(p => ({ ...p, modules: ALL_MODULES }))}>
                          Select All
                        </Button>
                        <Button size="small" color="inherit" onClick={() => setForm(p => ({ ...p, modules: [] }))}>
                          Clear
                        </Button>
                        {form.role && (
                          <Button size="small" color="primary" variant="outlined"
                            onClick={() => setForm(p => ({ ...p, modules: ROLE_MODULES[p.role] || [] }))}>
                            Reset to Role Defaults
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    {form.role
                      ? `Default modules for ${form.role} are pre-selected. ${isSuperAdmin ? 'As Super Admin, you can modify any module access.' : 'Contact Super Admin to adjust module access.'}`
                      : 'Select a job role to auto-populate default module access.'}
                  </Typography>
                  <Grid container spacing={0.5}>
                    {ALL_MODULES.map(mod => {
                      const isDefault = form.role ? (ROLE_MODULES[form.role] || []).includes(mod) : false;
                      const checked = form.modules.includes(mod);
                      return (
                        <Grid item xs={6} sm={4} md={3} key={mod}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                size="small"
                                checked={checked}
                                disabled={!isSuperAdmin && !isDefault && editId != null}
                                onChange={e => {
                                  setForm(p => ({
                                    ...p,
                                    modules: e.target.checked
                                      ? [...p.modules, mod]
                                      : p.modules.filter(m => m !== mod),
                                  }));
                                }}
                                sx={{ p: 0.5 }}
                              />
                            }
                            label={
                              <Typography variant="caption" sx={{
                                fontWeight: isDefault ? 600 : 400,
                                color: isDefault ? 'text.primary' : 'text.secondary',
                              }}>
                                {mod}
                              </Typography>
                            }
                            sx={{ m: 0, p: 0.5, borderRadius: 1,
                              bgcolor: checked ? alpha('#3b5bdb', 0.06) : 'transparent',
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* ── TAB 2: Account (create only) ──────────────────────────── */}
          {tabIdx === 2 && !editId && (
            <Stack spacing={3}>
              <Alert severity="success" icon={<CheckCircle />}>
                <Typography variant="body2" fontWeight={700}>Account will be created automatically</Typography>
                <Typography variant="caption">
                  A system login account will be created simultaneously with the staff record.
                  The staff member will be prompted to change their password on first login.
                </Typography>
              </Alert>

              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Lock color="primary" sx={{ fontSize: 18 }} />
                  Auto-Generated Login Credentials
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Username"
                      fullWidth
                      value={form.employeeId}
                      InputProps={{
                        readOnly: true,
                        startAdornment: <InputAdornment position="start"><BadgeIcon color="primary" /></InputAdornment>,
                        sx: { fontFamily: 'monospace', fontWeight: 700 },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Temporary Password"
                      fullWidth
                      type={showPassword ? 'text' : 'password'}
                      value={form.employeeId}
                      InputProps={{
                        readOnly: true,
                        startAdornment: <InputAdornment position="start"><Lock color="warning" /></InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowPassword(p => !p)}>
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                        sx: { fontFamily: 'monospace', fontWeight: 700 },
                      }}
                    />
                  </Grid>
                </Grid>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    Both the <strong>username</strong> and <strong>temporary password</strong> are set to the Staff ID:{' '}
                    <strong style={{ fontFamily: 'monospace' }}>{form.employeeId}</strong>.
                    The staff member <strong>must</strong> change their password on first login.
                  </Typography>
                </Alert>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AdminPanelSettings color="primary" sx={{ fontSize: 18 }} />
                  Account Summary
                </Typography>
                <Stack spacing={1}>
                  {[
                    { label: 'Full Name', value: `${form.firstName} ${form.lastName}` },
                    { label: 'Role', value: form.role },
                    { label: 'Username', value: form.employeeId, mono: true },
                    { label: 'Temp Password', value: form.employeeId, mono: true },
                    { label: 'Modules', value: `${form.modules.length} modules assigned` },
                    { label: 'First Login', value: 'Password change required ✓' },
                  ].map(row => (
                    <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                      <Typography variant="caption" fontWeight={600}
                        sx={row.mono ? { fontFamily: 'monospace', bgcolor: 'action.selected', px: 1, borderRadius: 0.5 } : {}}>
                        {row.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>

        {/* Tab navigation footer */}
        <Box sx={{ px: 3, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              onClick={() => !saving && setOpen(false)}
              color="inherit"
              disabled={saving}
            >
              Cancel
            </Button>
            <Stack direction="row" spacing={1}>
              {tabIdx > 0 && (
                <Button variant="outlined" onClick={() => setTabIdx(t => t - 1)}>← Back</Button>
              )}
              {tabIdx < (editId ? 1 : 2) ? (
                <Button
                  variant="contained"
                  onClick={() => setTabIdx(t => t + 1)}
                  disabled={tabIdx === 0 && (!form.firstName || !form.lastName || !form.email || !form.employeeId)}
                  sx={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #6741d9 100%)' }}
                >
                  Next →
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving || !form.firstName || !form.lastName || !form.role || !form.email || !form.employeeId}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                  sx={{ background: 'linear-gradient(135deg, #2f9e44 0%, #0ca678 100%)' }}
                >
                  {saving ? 'Saving…' : editId ? 'Update Staff' : 'Register Staff & Create Account'}
                </Button>
              )}
            </Stack>
          </Box>
        </Box>
      </Dialog>

      {/* Deactivate confirm dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Deactivate Staff Account?</DialogTitle>
        <DialogContent>
          <Typography>
            This will deactivate the staff member's system account. They will no longer be able to log in.
            Their records and data will be preserved.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)} color="inherit">Cancel</Button>
          <Button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} color="error" variant="contained">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Staff;
