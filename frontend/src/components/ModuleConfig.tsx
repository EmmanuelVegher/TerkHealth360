import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, CardContent, Typography, Grid, CircularProgress, Divider,
  Box, Button, Chip, TextField, InputAdornment, Stack, Tabs, Tab,
  Tooltip, Alert, Collapse, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import {
  LocalHospital, Bed, TrendingUp, MonitorHeart, Medication, HealthAndSafety,
  Biotech, Science, CameraAlt, Bloodtype, ChildCare, PregnantWoman, Timeline,
  VolunteerActivism, MedicalServices, LocalPharmacy, AccessibilityNew,
  MedicalInformation, RemoveRedEye, SevereCold, Dashboard as DashboardIcon,
  DirectionsWalk, CalendarToday, Queue as QueueIcon, AccountBalance,
  AssignmentInd, Payments, ReceiptLong, FolderShared, SyncAlt, Security,
  Hub, Warehouse, LocalShipping, CheckCircle, Cancel, Search, Refresh,
  InfoOutlined, DoneAll, Block, Shield, KeyboardArrowDown, KeyboardArrowUp,
  Business, People, ViewModule, TableChart, Tune, Check
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

export interface HospitalModule {
  moduleKey: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  accessLevel?: 'FULL' | 'READ_ONLY' | 'NONE';
  icon?: string;
}

export interface HospitalDepartmentAssignment {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  memberCount: number;
  assignedModules: string[];
  accessLevels?: Record<string, 'FULL' | 'READ_ONLY'>;
  moduleCount: number;
}

export const ModuleConfig = () => {
  const { enqueueSnackbar } = useSnackbar();

  // ─── Collapsible State ────────────────────────────────────────────────────
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // ─── Tab State (0 = Permissions, 1 = Departmental Assignments) ───────────
  const [activeTab, setActiveTab] = useState<number>(0);

  // ─── Modules State ────────────────────────────────────────────────────────
  const [modules, setModules] = useState<HospitalModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // ─── Departmental Assignments State ───────────────────────────────────────
  const [departments, setDepartments] = useState<HospitalDepartmentAssignment[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>('MED');
  const [deptViewMode, setDeptViewMode] = useState<'CARDS' | 'MATRIX'>('CARDS');
  const [deptSearchTerm, setDeptSearchTerm] = useState('');
  const [savingDept, setSavingDept] = useState<string | null>(null);

  // ─── Fetch Modules from Backend ───────────────────────────────────────────
  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/config/modules');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setModules(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load modules:', err);
      enqueueSnackbar('Failed to load module configuration', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch Departments & Assignments from Backend ─────────────────────────
  const fetchDepartments = async () => {
    setDeptLoading(true);
    try {
      const res = await api.get('/config/departments');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setDepartments(res.data.data);
        if (res.data.data.length > 0 && !res.data.data.some((d: any) => d.code === selectedDeptCode)) {
          setSelectedDeptCode(res.data.data[0].code);
        }
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
      enqueueSnackbar('Failed to load departmental assignments', { variant: 'error' });
    } finally {
      setDeptLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
    fetchDepartments();
  }, []);

  // ─── Categories List ──────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set<string>();
    modules.forEach(m => { if (m.category) set.add(m.category); });
    return Array.from(set);
  }, [modules]);

  // ─── Filtered Modules (Permissions Tab) ───────────────────────────────────
  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      const matchesSearch =
        !searchTerm.trim() ||
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.moduleKey.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'ALL' || m.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [modules, searchTerm, selectedCategory]);

  // ─── Grouped by Category for Sectional Rendering ──────────────────────────
  const groupedModules = useMemo(() => {
    const groups: Record<string, HospitalModule[]> = {};
    filteredModules.forEach(m => {
      const cat = m.category || 'Other Modules';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    return groups;
  }, [filteredModules]);

  // ─── Statistics ───────────────────────────────────────────────────────────
  const totalCount = modules.length;
  const grantedCount = modules.filter(m => m.isActive).length;
  const revokedCount = totalCount - grantedCount;

  // ─── Set Module Status (No Access vs Read Only vs Read & Write) ───────────
  const handleSetStatus = async (moduleKey: string, newActive: boolean, accessLevel: 'FULL' | 'READ_ONLY' | 'NONE' = 'FULL') => {
    setSavingKey(moduleKey);

    // Optimistic UI update
    setModules(prev =>
      prev.map(m =>
        m.moduleKey === moduleKey
          ? { ...m, isActive: newActive, accessLevel: newActive ? accessLevel : 'NONE' }
          : m
      )
    );

    try {
      const res = await api.put(`/config/modules/${moduleKey}`, { isActive: newActive });
      if (res.data?.success) {
        const modName = modules.find(m => m.moduleKey === moduleKey)?.name || moduleKey;
        enqueueSnackbar(
          newActive
            ? `${modName} granted (visible in navigation)`
            : `${modName} revoked (hidden from navigation)`,
          { variant: newActive ? 'success' : 'default' }
        );

        // Notify sidebar in real-time so it updates without page reload
        window.dispatchEvent(
          new CustomEvent('hospital-config-updated', {
            detail: { moduleKey, isActive: newActive }
          })
        );
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to update module permission in database', { variant: 'error' });
      fetchModules(); // Rollback
    } finally {
      setSavingKey(null);
    }
  };

  // ─── Bulk Grant / Revoke ──────────────────────────────────────────────────
  const handleBulkAction = async (action: 'GRANT_ALL' | 'REVOKE_ALL') => {
    setLoading(true);
    try {
      const isGrant = action === 'GRANT_ALL';
      const res = await api.post('/config/modules/bulk', {
        action,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined
      });

      if (res.data?.success) {
        enqueueSnackbar(
          isGrant
            ? 'All matching modules granted and visible in navigation.'
            : 'All matching modules revoked and hidden from navigation.',
          { variant: isGrant ? 'success' : 'warning' }
        );
        fetchModules();

        // Broadcast to sidebar
        window.dispatchEvent(new CustomEvent('hospital-config-updated'));
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to perform bulk module update', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Departmental Assignment Handlers ─────────────────────────────────────
  const currentDept = useMemo(() => {
    return departments.find(d => d.code === selectedDeptCode) || departments[0] || null;
  }, [departments, selectedDeptCode]);

  const handleSetDeptModule = async (
    moduleKey: string,
    isAssigned: boolean,
    accessLevel: 'FULL' | 'READ_ONLY' = 'FULL'
  ) => {
    if (!currentDept) return;
    setSavingDept(moduleKey);

    const prevModules = currentDept.assignedModules || [];
    const prevLevels = currentDept.accessLevels || {};

    let newModules: string[];
    let newLevels: Record<string, 'FULL' | 'READ_ONLY'> = { ...prevLevels };

    if (isAssigned) {
      newModules = prevModules.includes(moduleKey) ? prevModules : [...prevModules, moduleKey];
      newLevels[moduleKey] = accessLevel;
    } else {
      newModules = prevModules.filter(k => k !== moduleKey);
      delete newLevels[moduleKey];
    }

    // Optimistic UI update
    setDepartments(prev =>
      prev.map(d =>
        d.code === currentDept.code
          ? { ...d, assignedModules: newModules, accessLevels: newLevels, moduleCount: newModules.length }
          : d
      )
    );

    try {
      const res = await api.put(`/config/departments/${currentDept.code}/modules`, {
        assignedModules: newModules,
        accessLevels: newLevels
      });
      if (res.data?.success) {
        enqueueSnackbar(
          isAssigned
            ? `Assigned ${moduleKey} to ${currentDept.name}`
            : `Unassigned ${moduleKey} from ${currentDept.name}`,
          { variant: isAssigned ? 'success' : 'default' }
        );
      }
    } catch (err) {
      console.error('Failed to update department module:', err);
      enqueueSnackbar('Failed to save departmental assignment', { variant: 'error' });
      fetchDepartments(); // Rollback
    } finally {
      setSavingDept(null);
    }
  };

  const handleDeptBulkAction = async (action: 'ASSIGN_ALL' | 'ASSIGN_CLINICAL' | 'CLEAR_ALL' | 'RESET_DEFAULT') => {
    if (!currentDept) return;
    setDeptLoading(true);
    try {
      const res = await api.post('/config/departments/bulk-assign', {
        action,
        deptCode: currentDept.code
      });
      if (res.data?.success) {
        enqueueSnackbar(`Updated module assignments for ${currentDept.name}`, { variant: 'success' });
        fetchDepartments();
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to update department assignments', { variant: 'error' });
    } finally {
      setDeptLoading(false);
    }
  };

  // ─── Filtered Modules for Department Tab ──────────────────────────────────
  const filteredDeptModules = useMemo(() => {
    return modules.filter(m => {
      if (!deptSearchTerm.trim()) return true;
      const term = deptSearchTerm.toLowerCase();
      return (
        m.name.toLowerCase().includes(term) ||
        m.description.toLowerCase().includes(term) ||
        m.moduleKey.toLowerCase().includes(term) ||
        m.category.toLowerCase().includes(term)
      );
    });
  }, [modules, deptSearchTerm]);

  const groupedDeptModules = useMemo(() => {
    const groups: Record<string, HospitalModule[]> = {};
    filteredDeptModules.forEach(m => {
      const cat = m.category || 'Other Modules';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    return groups;
  }, [filteredDeptModules]);

  // ─── Module Icon Helper ───────────────────────────────────────────────────
  const renderModuleIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Dashboard': return <DashboardIcon sx={{ color: '#2563eb' }} />;
      case 'DirectionsWalk': return <DirectionsWalk sx={{ color: '#059669' }} />;
      case 'CalendarToday': return <CalendarToday sx={{ color: '#0284c7' }} />;
      case 'Queue': return <QueueIcon sx={{ color: '#d97706' }} />;
      case 'LocalHospital': return <LocalHospital sx={{ color: '#dc2626' }} />;
      case 'Bed': return <Bed sx={{ color: '#4f46e5' }} />;
      case 'SevereCold': return <SevereCold sx={{ color: '#ea580c' }} />;
      case 'MonitorHeart': return <MonitorHeart sx={{ color: '#e11d48' }} />;
      case 'HealthAndSafety': return <HealthAndSafety sx={{ color: '#16a34a' }} />;
      case 'MedicalInformation': return <MedicalInformation sx={{ color: '#0891b2' }} />;
      case 'Biotech': return <Biotech sx={{ color: '#7c3aed' }} />;
      case 'Science': return <Science sx={{ color: '#9333ea' }} />;
      case 'CameraAlt': return <CameraAlt sx={{ color: '#2563eb' }} />;
      case 'Bloodtype': return <Bloodtype sx={{ color: '#b91c1c' }} />;
      case 'ChildCare': return <ChildCare sx={{ color: '#ec4899' }} />;
      case 'PregnantWoman': return <PregnantWoman sx={{ color: '#db2777' }} />;
      case 'Timeline': return <Timeline sx={{ color: '#be185d' }} />;
      case 'VolunteerActivism': return <VolunteerActivism sx={{ color: '#a21caf' }} />;
      case 'MedicalServices': return <MedicalServices sx={{ color: '#0d9488' }} />;
      case 'AccessibilityNew': return <AccessibilityNew sx={{ color: '#059669' }} />;
      case 'RemoveRedEye': return <RemoveRedEye sx={{ color: '#0284c7' }} />;
      case 'LocalPharmacy': return <LocalPharmacy sx={{ color: '#059669' }} />;
      case 'Warehouse': return <Warehouse sx={{ color: '#ca8a04' }} />;
      case 'LocalShipping': return <LocalShipping sx={{ color: '#65a30d' }} />;
      case 'AccountBalance': return <AccountBalance sx={{ color: '#4f46e5' }} />;
      case 'AssignmentInd': return <AssignmentInd sx={{ color: '#3b82f6' }} />;
      case 'Payments': return <Payments sx={{ color: '#10b981' }} />;
      case 'ReceiptLong': return <ReceiptLong sx={{ color: '#f59e0b' }} />;
      case 'FolderShared': return <FolderShared sx={{ color: '#6366f1' }} />;
      case 'SyncAlt': return <SyncAlt sx={{ color: '#8b5cf6' }} />;
      case 'Security': return <Security sx={{ color: '#ef4444' }} />;
      case 'Hub': return <Hub sx={{ color: '#06b6d4' }} />;
      default: return <LocalHospital sx={{ color: '#2563eb' }} />;
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        bgcolor: '#ffffff',
        overflow: 'hidden'
      }}
    >
      {/* ─── Collapsible Header Bar (Clickable) ─── */}
      <Box
        onClick={() => setIsCollapsed(!isCollapsed)}
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          bgcolor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 0.2s ease',
          '&:hover': { bgcolor: '#f8fafc' },
          borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2.5,
              bgcolor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
              border: '1px solid #bfdbfe'
            }}
          >
            <Shield sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a', fontSize: '1.05rem', lineHeight: 1.2 }}>
              Hospital Module & Department Permission Matrix
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
              Granular permission controls, module visibility toggles, and departmental operational assignments
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" onClick={e => e.stopPropagation()}>
          <Chip
            icon={<CheckCircle sx={{ fontSize: '14px !important', color: '#059669 !important' }} />}
            label={`${grantedCount} Granted (Show)`}
            size="small"
            sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, border: '1px solid #10b981' }}
          />
          {revokedCount > 0 && (
            <Chip
              icon={<Cancel sx={{ fontSize: '14px !important', color: '#dc2626 !important' }} />}
              label={`${revokedCount} Not Granted`}
              size="small"
              sx={{ bgcolor: '#fef2f2', color: '#b91c1c', fontWeight: 700, border: '1px solid #f87171' }}
            />
          )}

          <Button
            size="small"
            onClick={() => setIsCollapsed(!isCollapsed)}
            endIcon={isCollapsed ? <KeyboardArrowDown /> : <KeyboardArrowUp />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              color: '#1e293b',
              bgcolor: '#f1f5f9',
              '&:hover': { bgcolor: '#e2e8f0' },
              borderRadius: 2,
              px: 1.8,
              py: 0.6
            }}
          >
            {isCollapsed ? 'Expand Matrix' : 'Collapse'}
          </Button>
        </Stack>
      </Box>

      {/* ─── Collapsible Content ─── */}
      <Collapse in={!isCollapsed} timeout="auto" unmountOnExit={false}>
        {/* ─── Top Tabs Bar ─── */}
        <Box sx={{ borderBottom: '1px solid #e2e8f0', px: 3, pt: 1, bgcolor: '#f8fafc' }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: '#64748b',
                minHeight: 46
              },
              '& .Mui-selected': {
                color: '#2563eb !important'
              },
              '& .MuiTabs-indicator': {
                bgcolor: '#2563eb',
                height: 3,
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            <Tab icon={<Shield sx={{ fontSize: 18 }} />} iconPosition="start" label="Permissions" />
            <Tab
              icon={<AssignmentInd sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Departmental Assignments (${departments.length})`}
            />
          </Tabs>
        </Box>

        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {/* ═══════════════════════════════════════════════════════════════════
              TAB 0: PERMISSIONS (Module Visibility & Navigation Controls)
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 0 && (
            <Box>
              {/* Header & Action Bar */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#0f172a' }}>
                    System Permissions Matrix
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 0.2 }}>
                    Grant or revoke module visibility across the hospital. Revoked modules are immediately hidden from the clinical sidebar.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Tooltip title="Grant all modules to show in navigation">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DoneAll />}
                      onClick={() => handleBulkAction('GRANT_ALL')}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#047857',
                        borderColor: '#10b981',
                        bgcolor: '#ecfdf5',
                        '&:hover': { bgcolor: '#d1fae5', borderColor: '#059669' }
                      }}
                    >
                      Grant All
                    </Button>
                  </Tooltip>

                  <Tooltip title="Revoke modules (hide from sidebar navigation)">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Block />}
                      onClick={() => handleBulkAction('REVOKE_ALL')}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#b91c1c',
                        borderColor: '#f87171',
                        bgcolor: '#fef2f2',
                        '&:hover': { bgcolor: '#fee2e2', borderColor: '#dc2626' }
                      }}
                    >
                      Revoke All
                    </Button>
                  </Tooltip>

                  <Tooltip title="Refresh module status from PostgreSQL">
                    <IconButton size="small" onClick={fetchModules} sx={{ border: '1px solid #e2e8f0' }}>
                      <Refresh sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Search & Category Filter Toolbar */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
                <TextField
                  size="small"
                  placeholder="Search modules by name, code or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      fontSize: '0.85rem'
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: '#94a3b8', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchTerm('')}>
                          <Cancel sx={{ fontSize: 16 }} />
                        </IconButton>
                      </InputAdornment>
                    ) : null
                  }}
                />
              </Box>

              {/* Category Filter Chips */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                <Chip
                  label="All Modules"
                  size="small"
                  clickable
                  onClick={() => setSelectedCategory('ALL')}
                  sx={{
                    fontWeight: 700,
                    bgcolor: selectedCategory === 'ALL' ? '#2563eb' : '#f1f5f9',
                    color: selectedCategory === 'ALL' ? '#ffffff' : '#64748b',
                    '&:hover': { bgcolor: selectedCategory === 'ALL' ? '#1d4ed8' : '#e2e8f0' }
                  }}
                />
                {categories.map(cat => (
                  <Chip
                    key={cat}
                    label={cat}
                    size="small"
                    clickable
                    onClick={() => setSelectedCategory(cat)}
                    sx={{
                      fontWeight: selectedCategory === cat ? 700 : 500,
                      bgcolor: selectedCategory === cat ? '#2563eb' : '#f1f5f9',
                      color: selectedCategory === cat ? '#ffffff' : '#64748b',
                      '&:hover': { bgcolor: selectedCategory === cat ? '#1d4ed8' : '#e2e8f0' }
                    }}
                  />
                ))}
              </Box>

              {/* Module Cards Grid */}
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                  <CircularProgress size={36} />
                </Box>
              ) : Object.keys(groupedModules).length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No modules match your current search or category filter.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                  {Object.entries(groupedModules).map(([categoryName, catModules]) => (
                    <Box key={categoryName}>
                      {/* Section Category Header */}
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 800,
                          color: '#1e293b',
                          fontSize: '0.88rem',
                          letterSpacing: '0.02em',
                          mb: 1.5
                        }}
                      >
                        {categoryName} Modules
                      </Typography>

                      {/* 2-Column Grid */}
                      <Grid container spacing={2}>
                        {catModules.map(mod => {
                          const isGranted = mod.isActive;
                          const isSaving = savingKey === mod.moduleKey;

                          return (
                            <Grid item xs={12} md={6} key={mod.moduleKey}>
                              <Card
                                variant="outlined"
                                sx={{
                                  p: 2,
                                  borderRadius: 2.5,
                                  border: `1px solid ${isGranted ? '#e2e8f0' : '#f1f5f9'}`,
                                  bgcolor: isGranted ? '#ffffff' : '#fafafa',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                                    borderColor: isGranted ? '#cbd5e1' : '#e2e8f0'
                                  }
                                }}
                              >
                                {/* Card Header: Icon, Title & Code */}
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                                  <Box sx={{ mt: 0.3, display: 'flex', alignItems: 'center' }}>
                                    {renderModuleIcon(mod.icon)}
                                  </Box>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                      <Typography
                                        variant="subtitle2"
                                        fontWeight={800}
                                        sx={{
                                          color: isGranted ? '#0f172a' : '#64748b',
                                          fontSize: '0.9rem',
                                          lineHeight: 1.3
                                        }}
                                      >
                                        {mod.name}
                                      </Typography>
                                      <Chip
                                        label={mod.moduleKey}
                                        size="small"
                                        sx={{
                                          height: 20,
                                          fontSize: '0.65rem',
                                          fontWeight: 700,
                                          bgcolor: '#f1f5f9',
                                          color: '#475569'
                                        }}
                                      />
                                    </Box>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: '#64748b',
                                        fontSize: '0.75rem',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        mt: 0.2
                                      }}
                                    >
                                      {mod.description}
                                    </Typography>
                                  </Box>
                                </Box>

                                {/* Segmented Pill Controls */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1.5, flexWrap: 'wrap' }}>
                                  {/* Pill 1: No Access */}
                                  <Button
                                    size="small"
                                    onClick={() => handleSetStatus(mod.moduleKey, false, 'NONE')}
                                    disabled={isSaving}
                                    sx={{
                                      borderRadius: '16px',
                                      px: 1.6,
                                      py: 0.25,
                                      fontSize: '0.73rem',
                                      fontWeight: !isGranted ? 700 : 500,
                                      textTransform: 'none',
                                      bgcolor: !isGranted ? '#fef2f2' : '#ffffff',
                                      color: !isGranted ? '#dc2626' : '#64748b',
                                      border: `1px solid ${!isGranted ? '#f87171' : '#e2e8f0'}`,
                                      minWidth: 85,
                                      '&:hover': {
                                        bgcolor: !isGranted ? '#fee2e2' : '#f8fafc',
                                        borderColor: '#f87171'
                                      }
                                    }}
                                  >
                                    {!isGranted && <Cancel sx={{ fontSize: '13px !important', mr: 0.4 }} />}
                                    No Access
                                  </Button>

                                  {/* Pill 2: Read Only */}
                                  <Button
                                    size="small"
                                    onClick={() => handleSetStatus(mod.moduleKey, true, 'READ_ONLY')}
                                    disabled={isSaving}
                                    sx={{
                                      borderRadius: '16px',
                                      px: 1.6,
                                      py: 0.25,
                                      fontSize: '0.73rem',
                                      fontWeight: isGranted && mod.accessLevel === 'READ_ONLY' ? 700 : 500,
                                      textTransform: 'none',
                                      bgcolor: isGranted && mod.accessLevel === 'READ_ONLY' ? '#eff6ff' : '#ffffff',
                                      color: isGranted && mod.accessLevel === 'READ_ONLY' ? '#1d4ed8' : '#64748b',
                                      border: `1px solid ${isGranted && mod.accessLevel === 'READ_ONLY' ? '#60a5fa' : '#e2e8f0'}`,
                                      minWidth: 85,
                                      '&:hover': {
                                        bgcolor: '#eff6ff',
                                        borderColor: '#60a5fa'
                                      }
                                    }}
                                  >
                                    Read Only
                                  </Button>

                                  {/* Pill 3: Read & Write (Granted / Show) */}
                                  <Button
                                    size="small"
                                    onClick={() => handleSetStatus(mod.moduleKey, true, 'FULL')}
                                    disabled={isSaving}
                                    sx={{
                                      borderRadius: '16px',
                                      px: 1.6,
                                      py: 0.25,
                                      fontSize: '0.73rem',
                                      fontWeight: isGranted && mod.accessLevel !== 'READ_ONLY' ? 700 : 500,
                                      textTransform: 'none',
                                      bgcolor: isGranted && mod.accessLevel !== 'READ_ONLY' ? '#ecfdf5' : '#ffffff',
                                      color: isGranted && mod.accessLevel !== 'READ_ONLY' ? '#047857' : '#64748b',
                                      border: `1px solid ${isGranted && mod.accessLevel !== 'READ_ONLY' ? '#10b981' : '#e2e8f0'}`,
                                      minWidth: 95,
                                      '&:hover': {
                                        bgcolor: '#ecfdf5',
                                        borderColor: '#10b981'
                                      }
                                    }}
                                  >
                                    {isGranted && mod.accessLevel !== 'READ_ONLY' && (
                                      <CheckCircle sx={{ fontSize: '13px !important', mr: 0.4 }} />
                                    )}
                                    Read & Write
                                  </Button>
                                </Box>

                                {/* Informational Subtext */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.2 }}>
                                  <InfoOutlined sx={{ fontSize: 13, color: isGranted ? '#059669' : '#94a3b8' }} />
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontSize: '0.68rem',
                                      color: isGranted ? '#059669' : '#94a3b8',
                                      fontWeight: 500
                                    }}
                                  >
                                    {isGranted
                                      ? 'This permission is granted to show in navigation and clinical workflows'
                                      : 'This permission is revoked: module hidden from navigation sidebar'}
                                  </Typography>
                                </Box>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 1: DEPARTMENTAL ASSIGNMENTS (Module Assignment per Department)
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 1 && (
            <Box>
              {/* Header & View Mode Switch */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#0f172a' }}>
                    Departmental Module & Operational Assignments
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 0.2 }}>
                    Assign which clinical, diagnostic, and administrative modules each hospital department has access to.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    variant={deptViewMode === 'CARDS' ? 'contained' : 'outlined'}
                    startIcon={<ViewModule />}
                    onClick={() => setDeptViewMode('CARDS')}
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: 2
                    }}
                  >
                    Department Cards
                  </Button>
                  <Button
                    size="small"
                    variant={deptViewMode === 'MATRIX' ? 'contained' : 'outlined'}
                    startIcon={<TableChart />}
                    onClick={() => setDeptViewMode('MATRIX')}
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: 2
                    }}
                  >
                    Full Matrix Grid
                  </Button>
                  <Tooltip title="Refresh departmental assignments">
                    <IconButton size="small" onClick={fetchDepartments} sx={{ border: '1px solid #e2e8f0' }}>
                      <Refresh sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Department Selector Chips Bar */}
              <Box sx={{ mb: 3, pb: 1, overflowX: 'auto', display: 'flex', gap: 1 }}>
                {departments.map(dept => {
                  const isSelected = dept.code === selectedDeptCode;
                  return (
                    <Box
                      key={dept.code}
                      onClick={() => setSelectedDeptCode(dept.code)}
                      sx={{
                        cursor: 'pointer',
                        px: 2,
                        py: 1,
                        borderRadius: 2.5,
                        border: `1.5px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                        bgcolor: isSelected ? '#eff6ff' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.2,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                          bgcolor: isSelected ? '#eff6ff' : '#f8fafc'
                        }
                      }}
                    >
                      <Business sx={{ fontSize: 18, color: isSelected ? '#2563eb' : '#64748b' }} />
                      <Box>
                        <Typography
                          variant="caption"
                          fontWeight={isSelected ? 800 : 700}
                          sx={{ color: isSelected ? '#1e40af' : '#1e293b', display: 'block', lineHeight: 1.2 }}
                        >
                          {dept.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: isSelected ? '#3b82f6' : '#94a3b8', fontSize: '0.68rem' }}>
                          {dept.code} · {dept.assignedModules?.length || 0} modules · {dept.memberCount || 0} staff
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              {/* ─── Mode A: CARDS VIEW (Focused on Selected Department) ─── */}
              {deptViewMode === 'CARDS' && currentDept && (
                <Box>
                  {/* Selected Department Overview Banner */}
                  <Card
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      mb: 3,
                      borderRadius: 2.5,
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: { xs: 'column', md: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', md: 'center' },
                      gap: 2
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2.5,
                          bgcolor: '#dbeafe',
                          color: '#1d4ed8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.1rem'
                        }}
                      >
                        {currentDept.code}
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>
                            {currentDept.name}
                          </Typography>
                          <Chip
                            label="Active Unit"
                            size="small"
                            sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: '0.65rem' }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {currentDept.assignedModules?.length || 0} of {modules.length} modules assigned · {currentDept.memberCount || 0} enrolled staff practitioners
                        </Typography>
                      </Box>
                    </Box>

                    {/* Department Bulk Actions */}
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleDeptBulkAction('ASSIGN_ALL')}
                        disabled={deptLoading}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          color: '#047857',
                          borderColor: '#10b981',
                          bgcolor: '#ffffff'
                        }}
                      >
                        Assign All
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleDeptBulkAction('ASSIGN_CLINICAL')}
                        disabled={deptLoading}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          color: '#2563eb',
                          borderColor: '#60a5fa',
                          bgcolor: '#ffffff'
                        }}
                      >
                        Assign Clinical Core
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleDeptBulkAction('RESET_DEFAULT')}
                        disabled={deptLoading}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          color: '#475569',
                          borderColor: '#cbd5e1',
                          bgcolor: '#ffffff'
                        }}
                      >
                        Reset Defaults
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleDeptBulkAction('CLEAR_ALL')}
                        disabled={deptLoading}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          color: '#b91c1c',
                          borderColor: '#f87171',
                          bgcolor: '#ffffff'
                        }}
                      >
                        Clear All
                      </Button>
                    </Stack>
                  </Card>

                  {/* Search inside Department Modules */}
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      size="small"
                      placeholder={`Search modules to assign to ${currentDept.name}...`}
                      value={deptSearchTerm}
                      onChange={(e) => setDeptSearchTerm(e.target.value)}
                      sx={{
                        width: { xs: '100%', sm: 380 },
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          bgcolor: '#f8fafc',
                          fontSize: '0.85rem'
                        }
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ color: '#94a3b8', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: deptSearchTerm ? (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setDeptSearchTerm('')}>
                              <Cancel sx={{ fontSize: 16 }} />
                            </IconButton>
                          </InputAdornment>
                        ) : null
                      }}
                    />
                  </Box>

                  {/* 2-Column Grid of Modules for Selected Department */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                    {Object.entries(groupedDeptModules).map(([categoryName, catModules]) => (
                      <Box key={categoryName}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 800,
                            color: '#1e293b',
                            fontSize: '0.88rem',
                            letterSpacing: '0.02em',
                            mb: 1.5
                          }}
                        >
                          {categoryName} Modules
                        </Typography>

                        <Grid container spacing={2}>
                          {catModules.map(mod => {
                            const isAssigned = (currentDept.assignedModules || []).includes(mod.moduleKey);
                            const currentAccess = currentDept.accessLevels?.[mod.moduleKey] || (isAssigned ? 'FULL' : 'NONE');
                            const isSaving = savingDept === mod.moduleKey;

                            return (
                              <Grid item xs={12} md={6} key={mod.moduleKey}>
                                <Card
                                  variant="outlined"
                                  sx={{
                                    p: 2,
                                    borderRadius: 2.5,
                                    border: `1px solid ${isAssigned ? '#e2e8f0' : '#f1f5f9'}`,
                                    bgcolor: isAssigned ? '#ffffff' : '#fafafa',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                                      borderColor: isAssigned ? '#cbd5e1' : '#e2e8f0'
                                    }
                                  }}
                                >
                                  {/* Module Header */}
                                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                                    <Box sx={{ mt: 0.3, display: 'flex', alignItems: 'center' }}>
                                      {renderModuleIcon(mod.icon)}
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                        <Typography
                                          variant="subtitle2"
                                          fontWeight={800}
                                          sx={{
                                            color: isAssigned ? '#0f172a' : '#64748b',
                                            fontSize: '0.9rem',
                                            lineHeight: 1.3
                                          }}
                                        >
                                          {mod.name}
                                        </Typography>
                                        <Chip
                                          label={mod.moduleKey}
                                          size="small"
                                          sx={{
                                            height: 20,
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            bgcolor: '#f1f5f9',
                                            color: '#475569'
                                          }}
                                        />
                                      </Box>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: '#64748b',
                                          fontSize: '0.75rem',
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical',
                                          overflow: 'hidden',
                                          mt: 0.2
                                        }}
                                      >
                                        {mod.description}
                                      </Typography>
                                    </Box>
                                  </Box>

                                  {/* Segmented Pill Controls for Department */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1.5, flexWrap: 'wrap' }}>
                                    {/* Pill 1: No Access */}
                                    <Button
                                      size="small"
                                      onClick={() => handleSetDeptModule(mod.moduleKey, false)}
                                      disabled={isSaving}
                                      sx={{
                                        borderRadius: '16px',
                                        px: 1.6,
                                        py: 0.25,
                                        fontSize: '0.73rem',
                                        fontWeight: !isAssigned ? 700 : 500,
                                        textTransform: 'none',
                                        bgcolor: !isAssigned ? '#fef2f2' : '#ffffff',
                                        color: !isAssigned ? '#dc2626' : '#64748b',
                                        border: `1px solid ${!isAssigned ? '#f87171' : '#e2e8f0'}`,
                                        minWidth: 85,
                                        '&:hover': {
                                          bgcolor: !isAssigned ? '#fee2e2' : '#f8fafc',
                                          borderColor: '#f87171'
                                        }
                                      }}
                                    >
                                      {!isAssigned && <Cancel sx={{ fontSize: '13px !important', mr: 0.4 }} />}
                                      No Access
                                    </Button>

                                    {/* Pill 2: Read Only */}
                                    <Button
                                      size="small"
                                      onClick={() => handleSetDeptModule(mod.moduleKey, true, 'READ_ONLY')}
                                      disabled={isSaving}
                                      sx={{
                                        borderRadius: '16px',
                                        px: 1.6,
                                        py: 0.25,
                                        fontSize: '0.73rem',
                                        fontWeight: isAssigned && currentAccess === 'READ_ONLY' ? 700 : 500,
                                        textTransform: 'none',
                                        bgcolor: isAssigned && currentAccess === 'READ_ONLY' ? '#eff6ff' : '#ffffff',
                                        color: isAssigned && currentAccess === 'READ_ONLY' ? '#1d4ed8' : '#64748b',
                                        border: `1px solid ${isAssigned && currentAccess === 'READ_ONLY' ? '#60a5fa' : '#e2e8f0'}`,
                                        minWidth: 85,
                                        '&:hover': {
                                          bgcolor: '#eff6ff',
                                          borderColor: '#60a5fa'
                                        }
                                      }}
                                    >
                                      Read Only
                                    </Button>

                                    {/* Pill 3: Read & Write (Granted / Green Highlight from Reference) */}
                                    <Button
                                      size="small"
                                      onClick={() => handleSetDeptModule(mod.moduleKey, true, 'FULL')}
                                      disabled={isSaving}
                                      sx={{
                                        borderRadius: '16px',
                                        px: 1.6,
                                        py: 0.25,
                                        fontSize: '0.73rem',
                                        fontWeight: isAssigned && currentAccess !== 'READ_ONLY' ? 700 : 500,
                                        textTransform: 'none',
                                        bgcolor: isAssigned && currentAccess !== 'READ_ONLY' ? '#ecfdf5' : '#ffffff',
                                        color: isAssigned && currentAccess !== 'READ_ONLY' ? '#047857' : '#64748b',
                                        border: `1px solid ${isAssigned && currentAccess !== 'READ_ONLY' ? '#10b981' : '#e2e8f0'}`,
                                        minWidth: 95,
                                        '&:hover': {
                                          bgcolor: '#ecfdf5',
                                          borderColor: '#10b981'
                                        }
                                      }}
                                    >
                                      {isAssigned && currentAccess !== 'READ_ONLY' && (
                                        <CheckCircle sx={{ fontSize: '13px !important', mr: 0.4 }} />
                                      )}
                                      Read & Write
                                    </Button>
                                  </Box>

                                  {/* Informational Subtext */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.2 }}>
                                    <InfoOutlined sx={{ fontSize: 13, color: isAssigned ? '#059669' : '#94a3b8' }} />
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: '0.68rem',
                                        color: isAssigned ? '#059669' : '#94a3b8',
                                        fontWeight: 500
                                      }}
                                    >
                                      {isAssigned
                                        ? `Assigned to ${currentDept.name} clinical practitioners`
                                        : `Not assigned to ${currentDept.name}`}
                                    </Typography>
                                  </Box>
                                </Card>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* ─── Mode B: FULL MATRIX GRID (Table View) ─── */}
              {deptViewMode === 'MATRIX' && (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, maxHeight: 600 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', minWidth: 180 }}>
                          Department
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', minWidth: 80 }}>
                          Code
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', minWidth: 90 }}>
                          Staff Count
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', minWidth: 100 }}>
                          Total Modules
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc' }}>
                          Assigned Module Badges
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {departments.map(dept => (
                        <TableRow
                          key={dept.code}
                          hover
                          sx={{
                            cursor: 'pointer',
                            bgcolor: dept.code === selectedDeptCode ? 'rgba(37, 99, 235, 0.04)' : 'inherit'
                          }}
                          onClick={() => {
                            setSelectedDeptCode(dept.code);
                            setDeptViewMode('CARDS');
                          }}
                        >
                          <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {dept.name}
                          </TableCell>
                          <TableCell>
                            <Chip label={dept.code} size="small" sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" fontWeight={600} color="text.secondary">
                              {dept.memberCount || 0} members
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${dept.assignedModules?.length || 0} / ${modules.length}`}
                              size="small"
                              sx={{
                                bgcolor: (dept.assignedModules?.length || 0) > 0 ? '#ecfdf5' : '#f1f5f9',
                                color: (dept.assignedModules?.length || 0) > 0 ? '#047857' : '#64748b',
                                fontWeight: 700,
                                fontSize: '0.7rem'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', py: 0.5 }}>
                              {(dept.assignedModules || []).slice(0, 8).map(mKey => (
                                <Chip
                                  key={mKey}
                                  label={mKey}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.62rem',
                                    bgcolor: '#eff6ff',
                                    color: '#1e40af',
                                    fontWeight: 600
                                  }}
                                />
                              ))}
                              {(dept.assignedModules || []).length > 8 && (
                                <Chip
                                  label={`+${(dept.assignedModules || []).length - 8} more`}
                                  size="small"
                                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }}
                                />
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
};
