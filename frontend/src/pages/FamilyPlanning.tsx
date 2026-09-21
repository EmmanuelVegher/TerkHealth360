import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip, Divider,
  IconButton, CardHeader, Autocomplete, Stack, Avatar, InputAdornment, Tooltip,
  Tab, Tabs, CircularProgress, Badge
} from '@mui/material';
import {
  Healing, Add, CheckCircle, Warning, Edit, Delete, EventNote,
  ChildCare, People, History, HelpOutline, Search, Refresh,
  Medication, SupervisedUserCircle, PersonAdd, Visibility, FilterList,
  VolunteerActivism, Male, Female, CheckCircleOutline, CancelOutlined
} from '@mui/icons-material';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';

const axios = {
  get: (url: string, config?: any) => api.get(url.startsWith('/api') ? url.substring(4) : url, config),
  post: (url: string, data?: any, config?: any) => api.post(url.startsWith('/api') ? url.substring(4) : url, data, config),
  put: (url: string, data?: any, config?: any) => api.put(url.startsWith('/api') ? url.substring(4) : url, data, config),
  delete: (url: string, config?: any) => api.delete(url.startsWith('/api') ? url.substring(4) : url, config),
};

// Design tokens & palette
const PRIMARY = '#1e40af';
const PRIMARY_LIGHT = '#eff6ff';
const SUCCESS = '#15803d';
const SUCCESS_LIGHT = '#f0fdf4';
const WARNING = '#b45309';
const WARNING_LIGHT = '#fffbeb';
const PURPLE = '#6d28d9';
const PURPLE_LIGHT = '#f5f3ff';
const DANGER = '#b91c1c';

// Method Badge Styling Helper
const getMethodMeta = (method: string) => {
  switch (method?.toUpperCase()) {
    case 'IUD':
      return { label: 'Intrauterine Device (IUD)', color: '#7c3aed', bg: '#f3e8ff', icon: '💉' };
    case 'OCP':
      return { label: 'Oral Contraceptive Pills', color: '#2563eb', bg: '#dbeafe', icon: '💊' };
    case 'INJECTABLES':
      return { label: 'Injectables (Depo)', color: '#0d9488', bg: '#ccfbf1', icon: '💉' };
    case 'IMPLANT':
      return { label: 'Subdermal Implant', color: '#0284c7', bg: '#e0f2fe', icon: '🩺' };
    case 'CONDOM':
      return { label: 'Barrier Condoms', color: '#059669', bg: '#d1fae5', icon: '🛡️' };
    case 'STERILIZATION':
      return { label: 'Surgical Sterilization', color: '#dc2626', bg: '#fee2e2', icon: '🏥' };
    case 'LAM':
    case 'NATURAL':
      return { label: 'Natural / LAM Spacing', color: '#d97706', bg: '#fef3c7', icon: '🌿' };
    default:
      return { label: method || 'Contraceptive', color: '#4b5563', bg: '#f3f4f6', icon: '⚕️' };
  }
};

export default function FamilyPlanning() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Primary Data State
  const [patients, setPatients] = useState<any[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [maternityProfile, setMaternityProfile] = useState<any>(null);
  const [patientEnrollments, setPatientEnrollments] = useState<any[]>([]);
  
  // UI & Search Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'POSTPARTUM' | 'DISCONTINUED'>('ALL');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Dialog Controls
  const [fpDialogOpen, setFpDialogOpen] = useState(false);
  const [discontinueDialogOpen, setDiscontinueDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [editingEnrollment, setEditingEnrollment] = useState<any>(null);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // Dashboard KPI Analytics
  const [dashboardStats, setDashboardStats] = useState({
    totalEnrollments: 0,
    activeEnrollments: 0,
    postpartumEnrollments: 0,
    topMethod: 'OCP'
  });

  useEffect(() => {
    loadRegistryData();
  }, []);

  const loadRegistryData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchPatients(),
      fetchAllEnrollments(),
      fetchDashboardStats()
    ]);
    setRefreshing(false);
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get('/api/patients/mpi?limit=1000');
      setPatients(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch MPI patients:', e);
    }
  };

  const fetchAllEnrollments = async () => {
    try {
      const res = await axios.get('/api/maternity/family-planning');
      setAllEnrollments(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to fetch enrollments list:', e);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await axios.get('/api/maternity/family-planning/analytics');
      setDashboardStats({
        totalEnrollments: res.data.totalEnrollments || 0,
        activeEnrollments: res.data.activeEnrollments || 0,
        postpartumEnrollments: res.data.postpartumEnrollments || 0,
        topMethod: res.data.topMethod || 'OCP'
      });
    } catch (e) {
      console.error('Failed to fetch analytics:', e);
    }
  };

  const fetchMaternityProfile = async (pId: string) => {
    try {
      const res = await axios.get(`/api/maternity/profile/${pId}`);
      setMaternityProfile(res.data);
      if (res.data?.familyPlanningEnrollments) {
        setPatientEnrollments(res.data.familyPlanningEnrollments);
      } else {
        setPatientEnrollments([]);
      }
    } catch (e) {
      setMaternityProfile(null);
      setPatientEnrollments([]);
    }
  };

  const handleSelectPatient = async (p: any) => {
    setSelectedPatient(p);
    await fetchMaternityProfile(p.id);
  };

  const handleCreateMaternityProfile = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      await axios.post('/api/maternity/profile', {
        patientId: selectedPatient.id,
        gravidity: 0,
        parity: 0,
        abortions: 0,
        livingChildren: 0,
        bloodGroup: 'O_POSITIVE',
        rhesusStatus: 'POSITIVE',
        hivStatus: 'NEGATIVE',
      });
      enqueueSnackbar('Maternity & Family Planning profile initialized', { variant: 'success' });
      await fetchMaternityProfile(selectedPatient.id);
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Failed to initialize profile', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditEnrollment = (enroll: any) => {
    setEditingEnrollment(enroll);
    setFpDialogOpen(true);
  };

  const handleDeleteEnrollment = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this family planning enrollment record?')) {
      try {
        setLoading(true);
        await axios.delete(`/api/maternity/family-planning/${id}`);
        enqueueSnackbar('Contraceptive enrollment deleted successfully', { variant: 'success' });
        if (selectedPatient) {
          await fetchMaternityProfile(selectedPatient.id);
        }
        await loadRegistryData();
      } catch (e: any) {
        enqueueSnackbar(e.response?.data?.message || 'Failed to delete enrollment', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveFP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatient) {
      enqueueSnackbar('Please select a patient first', { variant: 'warning' });
      return;
    }

    let activeProfile = maternityProfile;
    if (!activeProfile) {
      // Auto-initialize maternity profile if not created yet
      try {
        setLoading(true);
        const res = await axios.post('/api/maternity/profile', {
          patientId: selectedPatient.id,
          gravidity: 0,
          parity: 0,
          bloodGroup: 'O_POSITIVE',
        });
        activeProfile = res.data;
        setMaternityProfile(res.data);
      } catch (err: any) {
        enqueueSnackbar('Please click "Initialize Profile" to set up FP profile', { variant: 'warning' });
        setLoading(false);
        return;
      }
    }

    const data = new FormData(e.currentTarget);
    const body = {
      maternityProfileId: activeProfile.id,
      patientId: selectedPatient.id,
      counsellorId: user?.staffId || '',
      methodChosen: data.get('methodChosen'),
      methodStartDate: data.get('methodStartDate') || null,
      reasonForMethod: data.get('reasonForMethod'),
      isPostpartum: data.get('isPostpartum') === 'true',
      nextAppointment: data.get('nextAppointment') || null,
    };

    try {
      setLoading(true);
      if (editingEnrollment) {
        await axios.put(`/api/maternity/family-planning/${editingEnrollment.id}`, body);
        enqueueSnackbar('Contraceptive enrollment updated successfully', { variant: 'success' });
      } else {
        await axios.post('/api/maternity/family-planning', body);
        enqueueSnackbar('New contraceptive method enrolled successfully', { variant: 'success' });
      }
      setFpDialogOpen(false);
      setEditingEnrollment(null);
      await fetchMaternityProfile(selectedPatient.id);
      await loadRegistryData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save enrollment', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDiscontinueFP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEnrollment) return;

    const data = new FormData(e.currentTarget);
    const body = {
      status: 'DISCONTINUED',
      switchReason: data.get('switchReason'),
      sideEffectsReported: data.get('sideEffectsReported'),
      methodEndDate: new Date().toISOString()
    };

    try {
      setLoading(true);
      await axios.post(`/api/maternity/family-planning/${selectedEnrollment.id}/update`, body);
      enqueueSnackbar('Contraceptive method discontinued / updated', { variant: 'success' });
      setDiscontinueDialogOpen(false);
      if (selectedPatient) {
        await fetchMaternityProfile(selectedPatient.id);
      }
      await loadRegistryData();
    } catch (e: any) {
      try {
        await axios.put(`/api/maternity/family-planning/${selectedEnrollment.id}`, body);
        enqueueSnackbar('Contraceptive method status updated', { variant: 'success' });
        setDiscontinueDialogOpen(false);
        if (selectedPatient) {
          await fetchMaternityProfile(selectedPatient.id);
        }
        await loadRegistryData();
      } catch (err: any) {
        enqueueSnackbar(err.response?.data?.message || 'Failed to discontinue method', { variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter logic for master patient table
  const filteredEnrollments = allEnrollments.filter((enroll) => {
    const pName = `${enroll.patient?.firstName || ''} ${enroll.patient?.lastName || ''}`.toLowerCase();
    const mrn = (enroll.patient?.mrn || enroll.patient?.patientNumber || '').toLowerCase();
    const method = (enroll.methodChosen || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = pName.includes(query) || mrn.includes(query) || method.includes(query);

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return enroll.status === 'ACTIVE';
    if (statusFilter === 'POSTPARTUM') return enroll.isPostpartum;
    if (statusFilter === 'DISCONTINUED') return enroll.status === 'DISCONTINUED';

    return true;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3.5 }, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Top Bar / Header Section */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 3.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Avatar sx={{ bgcolor: PRIMARY, width: 44, height: 44, boxShadow: '0 4px 12px rgba(30,64,175,0.25)' }}>
              <VolunteerActivism sx={{ color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', fontSize: { xs: '1.5rem', md: '1.875rem' } }}>
                Family Planning & Contraceptive Registry
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                Contraceptive Counselling, Method Enrollments, Side-Effects Surveillance & Postpartum Spacing
              </Typography>
            </Box>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={16} /> : <Refresh />}
            onClick={loadRegistryData}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, borderColor: '#cbd5e1', color: '#475569', '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f1f5f9' } }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => {
              if (selectedPatient) {
                setEditingEnrollment(null);
                setFpDialogOpen(true);
              } else {
                enqueueSnackbar('Select or search a patient below to start enrollment', { variant: 'info' });
              }
            }}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
              px: 2.5,
              py: 1,
              backgroundColor: PRIMARY,
              boxShadow: '0 4px 14px rgba(30,64,175,0.3)',
              '&:hover': { backgroundColor: '#1d4ed8' }
            }}
          >
            Enroll Patient
          </Button>
        </Stack>
      </Box>

      {/* KPI Cards Grid */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* Total Enrolled */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'all 0.2s ease-in-out', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(0,0,0,0.06)' } }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>
                    TOTAL ENROLLED
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                    {dashboardStats.totalEnrollments}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, width: 48, height: 48, borderRadius: '12px' }}>
                  <People sx={{ fontSize: 26 }} />
                </Avatar>
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}>
                <CheckCircleOutline sx={{ fontSize: 14, color: SUCCESS }} /> All-time patient registrations
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Users */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'all 0.2s ease-in-out', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(0,0,0,0.06)' } }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>
                    ACTIVE USERS
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: SUCCESS, mt: 0.5 }}>
                    {dashboardStats.activeEnrollments}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: SUCCESS_LIGHT, color: SUCCESS, width: 48, height: 48, borderRadius: '12px' }}>
                  <CheckCircle sx={{ fontSize: 26 }} />
                </Avatar>
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                {dashboardStats.totalEnrollments > 0 ? `${Math.round((dashboardStats.activeEnrollments / dashboardStats.totalEnrollments) * 100)}% adherence rate` : 'Currently active methods'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Postpartum Spacing */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'all 0.2s ease-in-out', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(0,0,0,0.06)' } }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>
                    POSTPARTUM SPACING
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: PURPLE, mt: 0.5 }}>
                    {dashboardStats.postpartumEnrollments}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: PURPLE_LIGHT, color: PURPLE, width: 48, height: 48, borderRadius: '12px' }}>
                  <ChildCare sx={{ fontSize: 26 }} />
                </Avatar>
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                Post-delivery birth spacing patients
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Most Chosen Method */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'all 0.2s ease-in-out', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(0,0,0,0.06)' } }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>
                    MOST CHOSEN METHOD
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#0369a1', mt: 0.8, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                    {dashboardStats.topMethod}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#e0f2fe', color: '#0284c7', width: 48, height: 48, borderRadius: '12px' }}>
                  <Medication sx={{ fontSize: 26 }} />
                </Avatar>
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                Top preferred contraceptive option
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Layout */}
      <Grid container spacing={3}>
        
        {/* Left Column: Master Patients Registry Table */}
        <Grid item xs={12} lg={selectedPatient ? 7.5 : 12}>
          <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
            
            {/* Table Header & Controls */}
            <Box sx={{ p: 2.5, borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Enrolled Patients Directory ({filteredEnrollments.length})
                </Typography>

                {/* Patient Search Autocomplete for Quick Selection */}
                <Autocomplete
                  options={patients}
                  getOptionLabel={(p: any) => `${p.firstName} ${p.lastName} (${p.mrn || p.patientNumber})`}
                  value={selectedPatient || null}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      handleSelectPatient(newValue);
                    } else {
                      setSelectedPatient(null);
                      setMaternityProfile(null);
                      setPatientEnrollments([]);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Find Patient by Name or MRN..."
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ color: '#94a3b8', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                  sx={{ minWidth: { xs: '100%', sm: 320 } }}
                />
              </Box>

              {/* Filters & Search Row */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Filter table by patient name, MRN, or method..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FilterList sx={{ color: '#94a3b8', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ backgroundColor: '#f8fafc', borderRadius: '8px' }}
                />

                <Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: 'wrap' }}>
                  <Chip
                    label="All"
                    clickable
                    color={statusFilter === 'ALL' ? 'primary' : 'default'}
                    variant={statusFilter === 'ALL' ? 'filled' : 'outlined'}
                    onClick={() => setStatusFilter('ALL')}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    label="Active"
                    clickable
                    color={statusFilter === 'ACTIVE' ? 'success' : 'default'}
                    variant={statusFilter === 'ACTIVE' ? 'filled' : 'outlined'}
                    onClick={() => setStatusFilter('ACTIVE')}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    label="Postpartum"
                    clickable
                    color={statusFilter === 'POSTPARTUM' ? 'secondary' : 'default'}
                    variant={statusFilter === 'POSTPARTUM' ? 'filled' : 'outlined'}
                    onClick={() => setStatusFilter('POSTPARTUM')}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    label="Discontinued"
                    clickable
                    color={statusFilter === 'DISCONTINUED' ? 'warning' : 'default'}
                    variant={statusFilter === 'DISCONTINUED' ? 'filled' : 'outlined'}
                    onClick={() => setStatusFilter('DISCONTINUED')}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
              </Box>
            </Box>

            {/* Table View */}
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>Patient Details</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>Method Chosen</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>Enrollment Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>Next Follow-up</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEnrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Box sx={{ textAlign: 'center', color: '#94a3b8' }}>
                          <VolunteerActivism sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
                            No Family Planning Records Found
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                            {searchQuery || statusFilter !== 'ALL'
                              ? 'Try adjusting your search or filter parameters.'
                              : 'Select a patient above to enroll them in a contraceptive method.'}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEnrollments.map((enroll) => {
                      const methodMeta = getMethodMeta(enroll.methodChosen);
                      const isSelected = selectedPatient?.id === enroll.patientId;
                      const patientName = enroll.patient ? `${enroll.patient.firstName} ${enroll.patient.lastName}` : 'Unknown Patient';
                      const mrn = enroll.patient?.mrn || enroll.patient?.patientNumber || 'N/A';

                      return (
                        <TableRow
                          key={enroll.id}
                          hover
                          selected={isSelected}
                          sx={{
                            cursor: 'pointer',
                            '&.Mui-selected': { backgroundColor: '#eff6ff' },
                            '&.Mui-selected:hover': { backgroundColor: '#dbeafe' }
                          }}
                          onClick={() => enroll.patient && handleSelectPatient(enroll.patient)}
                        >
                          {/* Patient Name & MRN */}
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ bgcolor: isSelected ? PRIMARY : '#cbd5e1', width: 36, height: 36, fontWeight: 700, fontSize: '0.875rem' }}>
                                {enroll.patient?.firstName?.[0] || 'P'}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                  {patientName}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b' }}>
                                  MRN: {mrn} {enroll.patient?.gender ? `• ${enroll.patient.gender}` : ''}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          {/* Method Chosen */}
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={`${methodMeta.icon} ${enroll.methodChosen}`}
                                size="small"
                                sx={{
                                  backgroundColor: methodMeta.bg,
                                  color: methodMeta.color,
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  fontSize: '0.75rem'
                                }}
                              />
                              {enroll.isPostpartum && (
                                <Tooltip title="Postpartum Spacing Choice">
                                  <Chip label="Postpartum" size="small" sx={{ bgcolor: PURPLE_LIGHT, color: PURPLE, fontWeight: 600, fontSize: '0.7rem' }} />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>

                          {/* Enrollment Date */}
                          <TableCell sx={{ color: '#334155', fontWeight: 500, fontSize: '0.875rem' }}>
                            {enroll.enrollmentDate ? new Date(enroll.enrollmentDate).toLocaleDateString() : 'N/A'}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Chip
                              label={enroll.status}
                              size="small"
                              color={enroll.status === 'ACTIVE' ? 'success' : 'default'}
                              variant={enroll.status === 'ACTIVE' ? 'filled' : 'outlined'}
                              sx={{ fontWeight: 700, fontSize: '0.725rem' }}
                            />
                          </TableCell>

                          {/* Next Follow-up */}
                          <TableCell sx={{ color: '#334155', fontSize: '0.875rem' }}>
                            {enroll.nextAppointment ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <EventNote sx={{ fontSize: 16, color: PRIMARY }} />
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                  {new Date(enroll.nextAppointment).toLocaleDateString()}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>None Scheduled</Typography>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="View Patient Profile">
                                <IconButton size="small" color="primary" onClick={() => enroll.patient && handleSelectPatient(enroll.patient)}>
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {enroll.status === 'ACTIVE' && (
                                <Tooltip title="Discontinue or Switch Method">
                                  <IconButton
                                    size="small"
                                    sx={{ color: WARNING }}
                                    onClick={() => {
                                      setSelectedEnrollment(enroll);
                                      setDiscontinueDialogOpen(true);
                                    }}
                                  >
                                    <CancelOutlined fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Edit Enrollment">
                                <IconButton size="small" color="info" onClick={() => handleEditEnrollment(enroll)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Record">
                                <IconButton size="small" color="error" onClick={() => handleDeleteEnrollment(enroll.id)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Right Column: Selected Patient Detail Workspace */}
        {selectedPatient && (
          <Grid item xs={12} lg={4.5}>
            <Stack spacing={3}>
              
              {/* Patient Demographics Card */}
              <Card sx={{ borderRadius: '16px', border: `2px solid ${PRIMARY}`, boxShadow: '0 4px 20px rgba(30,64,175,0.08)' }}>
                <Box sx={{ p: 2.5, backgroundColor: PRIMARY_LIGHT, borderBottom: '1px solid #dbeafe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: PRIMARY, width: 44, height: 44, fontWeight: 700 }}>
                      {selectedPatient.firstName?.[0] || 'P'}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: PRIMARY, fontWeight: 700 }}>
                        MRN: {selectedPatient.mrn || selectedPatient.patientNumber}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => { setSelectedPatient(null); setMaternityProfile(null); setPatientEnrollments([]); }}>
                    ✕
                  </IconButton>
                </Box>

                <CardContent sx={{ p: 2.5 }}>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>GENDER / AGE</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {selectedPatient.gender || 'N/A'} • {selectedPatient.age ? `${selectedPatient.age} yrs` : 'Age N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>PHONE</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {selectedPatient.phoneNumber || 'Not provided'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>PROFILE STATUS</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {maternityProfile ? (
                          <Chip label="PROFILE INITIALIZED" color="success" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                        ) : (
                          <Chip label="NOT INITIALIZED" color="error" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>METHODS RECORDED</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {patientEnrollments.length} method(s)
                      </Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction="row" spacing={1.5}>
                    {!maternityProfile ? (
                      <Button
                        fullWidth
                        variant="contained"
                        color="secondary"
                        onClick={handleCreateMaternityProfile}
                        disabled={loading}
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                      >
                        Initialize FP Profile
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => { setEditingEnrollment(null); setFpDialogOpen(true); }}
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, backgroundColor: PRIMARY }}
                      >
                        Enroll New Method
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {/* Patient Contraceptive History Timeline */}
              <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    Contraceptive History & Active Plan
                  </Typography>
                </Box>
                <CardContent sx={{ p: 2.5 }}>
                  {patientEnrollments.length === 0 ? (
                    <Alert severity="info" sx={{ borderRadius: '10px' }}>
                      No active or past family planning methods recorded for this patient. Click "Enroll New Method" above to begin.
                    </Alert>
                  ) : (
                    <Stack spacing={2}>
                      {patientEnrollments.map((e: any) => {
                        const meta = getMethodMeta(e.methodChosen);
                        return (
                          <Paper
                            key={e.id}
                            variant="outlined"
                            sx={{
                              p: 2,
                              borderRadius: '12px',
                              borderColor: e.status === 'ACTIVE' ? '#bbf7d0' : '#e2e8f0',
                              backgroundColor: e.status === 'ACTIVE' ? '#f0fdf4' : '#fafafa'
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                  {meta.icon} {meta.label}
                                </Typography>
                              </Box>
                              <Chip
                                label={e.status}
                                size="small"
                                color={e.status === 'ACTIVE' ? 'success' : 'default'}
                                sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                              />
                            </Box>

                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                              Enrolled: {e.enrollmentDate ? new Date(e.enrollmentDate).toLocaleDateString() : 'N/A'}
                              {e.isPostpartum && ' • Postpartum Spacing'}
                            </Typography>

                            {e.reasonForMethod && (
                              <Typography variant="body2" sx={{ color: '#334155', mb: 1, fontStyle: 'italic' }}>
                                "{e.reasonForMethod}"
                              </Typography>
                            )}

                            {e.sideEffectsReported && (
                              <Alert severity="warning" sx={{ py: 0.5, px: 1.5, my: 1, borderRadius: '6px', fontSize: '0.75rem' }}>
                                <b>Side Effects:</b> {e.sideEffectsReported}
                              </Alert>
                            )}

                            {e.nextAppointment && (
                              <Typography variant="caption" sx={{ color: PRIMARY, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                                <EventNote sx={{ fontSize: 14 }} /> Follow-up: {new Date(e.nextAppointment).toLocaleDateString()}
                              </Typography>
                            )}

                            <Divider sx={{ my: 1.5 }} />

                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              {e.status === 'ACTIVE' && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="warning"
                                  onClick={() => {
                                    setSelectedEnrollment(e);
                                    setDiscontinueDialogOpen(true);
                                  }}
                                  sx={{ textTransform: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}
                                >
                                  Discontinue / Switch
                                </Button>
                              )}
                              <Button
                                size="small"
                                variant="outlined"
                                color="info"
                                onClick={() => handleEditEnrollment(e)}
                                sx={{ textTransform: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}
                              >
                                Edit Details
                              </Button>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        )}
      </Grid>

      {/* Dialog: Contraceptive Method Enrollment */}
      <Dialog
        open={fpDialogOpen}
        onClose={() => { setFpDialogOpen(false); setEditingEnrollment(null); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <form onSubmit={handleSaveFP} key={editingEnrollment?.id || 'new'}>
          <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
            {editingEnrollment ? 'Edit Contraceptive Enrollment' : 'Enroll Patient in Contraceptive Method'}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              
              {selectedPatient && (
                <Alert severity="info" sx={{ borderRadius: '8px' }}>
                  Enrolling Patient: <b>{selectedPatient.firstName} {selectedPatient.lastName}</b> (MRN: {selectedPatient.mrn || selectedPatient.patientNumber})
                </Alert>
              )}

              <TextField
                select
                fullWidth
                label="Selected Contraceptive Method"
                name="methodChosen"
                defaultValue={editingEnrollment ? editingEnrollment.methodChosen : "IUD"}
                required
              >
                <MenuItem value="IUD">Intrauterine Device (IUD)</MenuItem>
                <MenuItem value="OCP">Oral Contraceptive Pills (OCP)</MenuItem>
                <MenuItem value="INJECTABLES">Injectables (Depo-Provera)</MenuItem>
                <MenuItem value="IMPLANT">Subdermal Implant (Implanon/Jadelle)</MenuItem>
                <MenuItem value="CONDOM">Barrier Condoms</MenuItem>
                <MenuItem value="STERILIZATION">Surgical Sterilization (Tubal Ligation / Vasectomy)</MenuItem>
                <MenuItem value="LAM">Lactational Amenorrhea Method (LAM)</MenuItem>
                <MenuItem value="NATURAL">Natural Family Planning / Rhythm</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Method Start Date"
                name="methodStartDate"
                type="date"
                defaultValue={editingEnrollment ? new Date(editingEnrollment.enrollmentDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}
                InputLabelProps={{ shrink: true }}
                required
              />

              <TextField
                fullWidth
                label="Indication / Clinical Justification"
                name="reasonForMethod"
                defaultValue={editingEnrollment ? editingEnrollment.reasonForMethod || '' : ''}
                placeholder="e.g. Birth spacing, postpartum spacing, heavy menstrual bleeding"
                multiline
                rows={2}
              />

              <TextField
                select
                fullWidth
                label="Postpartum Birth Spacing?"
                name="isPostpartum"
                defaultValue={editingEnrollment ? (editingEnrollment.isPostpartum ? "true" : "false") : "false"}
              >
                <MenuItem value="true">Yes - Postpartum Spacing</MenuItem>
                <MenuItem value="false">No - Standard Family Planning</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Next Follow-up Appointment Date"
                name="nextAppointment"
                type="date"
                defaultValue={editingEnrollment?.nextAppointment ? new Date(editingEnrollment.nextAppointment).toISOString().slice(0, 10) : ''}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: tomorrowStr }}
                helperText="Automatically schedules a follow-up appointment in the clinic system."
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => { setFpDialogOpen(false); setEditingEnrollment(null); }} sx={{ color: '#64748b' }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading} sx={{ borderRadius: '8px', px: 3, fontWeight: 700, backgroundColor: PRIMARY }}>
              {editingEnrollment ? 'Save Changes' : 'Register Enrollment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog: Discontinue Method / Switch */}
      <Dialog
        open={discontinueDialogOpen}
        onClose={() => setDiscontinueDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <form onSubmit={handleDiscontinueFP}>
          <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
            Discontinue / Switch Method
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ color: '#475569' }}>
                You are updating status for active method: <b>{selectedEnrollment?.methodChosen}</b>
              </Typography>

              <TextField
                fullWidth
                label="Reported Side Effects"
                name="sideEffectsReported"
                placeholder="e.g. Irregular bleeding, headaches, nausea, none"
                multiline
                rows={2}
              />

              <TextField
                fullWidth
                label="Reason for Discontinuation / Switch"
                name="switchReason"
                placeholder="e.g. Planning pregnancy, side effects, switching to IUD"
                required
                multiline
                rows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDiscontinueDialogOpen(false)} sx={{ color: '#64748b' }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="warning" disabled={loading} sx={{ borderRadius: '8px', px: 3, fontWeight: 700 }}>
              Confirm Discontinuation
            </Button>
          </DialogActions>
        </form>
      </Dialog>

    </Box>
  );
}

