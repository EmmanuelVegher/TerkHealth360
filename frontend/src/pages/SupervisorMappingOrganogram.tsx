import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  InputAdornment,
  CircularProgress,
  Divider,
  Stack,
  Drawer,
  Badge,
  Alert
} from '@mui/material';
import {
  AccountTree,
  People,
  Search,
  Refresh,
  Edit,
  GroupAdd,
  CorporateFare,
  Shield,
  Email,
  Phone,
  CheckCircle,
  AccountCircle,
  ExpandMore,
  ExpandLess,
  ZoomIn,
  ZoomOut,
  RestartAlt,
  FileDownload,
  Print,
  FilterList,
  SupervisorAccount,
  Hub,
  Lan,
  BadgeOutlined,
  VerifiedUser,
  ArrowForward,
  Close,
  Visibility,
  CallSplit,
  Person
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

// ─── THEME TOKENS ─────────────────────────────────────────────────────────────
const PRIMARY = '#1e3a8a';
const SECONDARY = '#2563eb';
const SUCCESS = '#16a34a';
const WARNING = '#ea580c';
const PURPLE = '#7c3aed';
const GOLD = '#b45309';

// ─── TIER COLORS & LABELS ─────────────────────────────────────────────────────
const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  TIER_5_BOARD: {
    label: 'Tier 5: Diocesan Board & Patron',
    color: '#7c2d12',
    bg: '#fef3c7',
    border: '#f59e0b'
  },
  TIER_4_EXECUTIVE: {
    label: 'Tier 4: Executive Leadership (CMD/CEO/Director)',
    color: '#1e3a8a',
    bg: '#eff6ff',
    border: '#3b82f6'
  },
  TIER_3_ADMIN: {
    label: 'Tier 3: Directorate & Administration',
    color: '#065f46',
    bg: '#ecfdf5',
    border: '#10b981'
  },
  TIER_2_FINANCE: {
    label: 'Tier 2: Finance & Revenue Control',
    color: '#854d0e',
    bg: '#fefce8',
    border: '#eab308'
  },
  TIER_1_CLINICAL: {
    label: 'Tier 1: Clinical & Nursing Care',
    color: '#581c87',
    bg: '#faf5ff',
    border: '#a855f7'
  }
};

const LEVEL_COLORS: Record<number, { bg: string; border: string; text: string; label: string }> = {
  1: { bg: '#fffbeb', border: '#f59e0b', text: '#b45309', label: 'L1 • Diocesan Patron / Board' },
  2: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8', label: 'L2 • Executive Management' },
  3: { bg: '#f0fdf4', border: '#22c55e', text: '#15803d', label: 'L3 • Directorate Heads' },
  4: { bg: '#faf5ff', border: '#a855f7', text: '#7e22ce', label: 'L4 • Unit Leads & In-Charges' },
  5: { bg: '#f8fafc', border: '#94a3b8', text: '#475569', label: 'L5 • Frontline Operations & Tills' }
};

export const SupervisorMappingOrganogram: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const navigate = useNavigate();

  // ─── TAB STATE ──────────────────────────────────────────────────────────────
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes('/organogram') || p.includes('/hierarchy/organogram')) {
      setCurrentTab(1);
    } else if (p.includes('/rules')) {
      setCurrentTab(2);
    } else {
      setCurrentTab(0);
    }
  }, [location.pathname]);

  // ─── DATA STATES ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [organogramData, setOrganogramData] = useState<any>(null);

  // ─── FILTER STATES ──────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [mappingStatusFilter, setMappingStatusFilter] = useState('ALL');

  // ─── ORGANOGRAM VISUAL CONTROLS ─────────────────────────────────────────────
  const [zoomScale, setZoomScale] = useState(1);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ─── DIALOG STATES ──────────────────────────────────────────────────────────
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);

  // Subordinates Drill-Down Modal State
  const [subordinatesModalStaff, setSubordinatesModalStaff] = useState<any | null>(null);
  const [subordinatesTab, setSubordinatesTab] = useState<'ALL' | 'DIRECT' | 'SECONDARY'>('ALL');
  const [subordinatesSearch, setSubordinatesSearch] = useState('');

  // Edit form state
  const [editSupervisorId, setEditSupervisorId] = useState('');
  const [editSecondarySupervisorId, setEditSecondarySupervisorId] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editApprovalTier, setEditApprovalTier] = useState('TIER_1_CLINICAL');
  const [editHierarchyLevel, setEditHierarchyLevel] = useState<number>(4);

  // Bulk form state
  const [bulkDepartment, setBulkDepartment] = useState('');
  const [bulkSupervisorId, setBulkSupervisorId] = useState('');
  const [bulkApprovalTier, setBulkApprovalTier] = useState('TIER_2_FINANCE');

  // ─── ROBUST SUBORDINATE EXTRACTORS ──────────────────────────────────────────
  const getDirectReports = (staff: any) => {
    if (!staff) return [];
    if (staff.directReports && staff.directReports.length > 0) return staff.directReports;
    const staffFullName = `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
    return staffList.filter(s => {
      if (s.id === staff.id) return false;
      return s.supervisorId === staff.id || (staffFullName && s.supervisorName && s.supervisorName.toLowerCase() === staffFullName.toLowerCase());
    }).map(r => ({
      id: r.id,
      name: `${r.firstName} ${r.lastName}`.trim(),
      role: r.role,
      department: r.department,
      unit: r.unit,
      email: r.email,
      phone: r.phone,
      approvalTier: r.approvalTier,
      hierarchyLevel: r.hierarchyLevel,
      relationshipType: 'PRIMARY' as const
    }));
  };

  const getSecondaryReports = (staff: any) => {
    if (!staff) return [];
    if (staff.secondaryReports && staff.secondaryReports.length > 0) return staff.secondaryReports;
    const staffFullName = `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
    return staffList.filter(s => {
      if (s.id === staff.id) return false;
      return s.secondarySupervisorId === staff.id || (staffFullName && s.secondarySupervisorName && s.secondarySupervisorName.toLowerCase() === staffFullName.toLowerCase());
    }).map(r => ({
      id: r.id,
      name: `${r.firstName} ${r.lastName}`.trim(),
      role: r.role,
      department: r.department,
      unit: r.unit,
      email: r.email,
      phone: r.phone,
      approvalTier: r.approvalTier,
      hierarchyLevel: r.hierarchyLevel,
      primarySupervisorName: r.supervisorName,
      relationshipType: 'SECONDARY' as const
    }));
  };

  // ─── FETCH DATA ─────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [mappingRes, organogramRes] = await Promise.all([
        api.get('/hr/supervisors/mapping'),
        api.get('/hr/organogram')
      ]);

      if (mappingRes.data?.success) {
        setStaffList(mappingRes.data.data.staff || []);
        setSupervisors(mappingRes.data.data.supervisors || []);
      }

      if (organogramRes.data?.success) {
        setOrganogramData(organogramRes.data.data);
        // Default expand top 3 levels
        const expandMap: Record<string, boolean> = {};
        (organogramRes.data.data.allNodes || []).forEach((n: any) => {
          if (n.hierarchyLevel <= 3) {
            expandMap[n.id] = true;
          }
        });
        setExpandedNodes(expandMap);
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to load supervisor data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── DEPARTMENTS LIST ───────────────────────────────────────────────────────
  const departments = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach(s => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set);
  }, [staffList]);

  // ─── FILTERED STAFF ─────────────────────────────────────────────────────────
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const nameMatch = `${s.firstName} ${s.lastName} ${s.id} ${s.email} ${s.role}`.toLowerCase().includes(searchTerm.toLowerCase());
      const supMatch = !searchTerm || (s.supervisorName && s.supervisorName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSearch = nameMatch || supMatch;

      const matchesDept = departmentFilter === 'ALL' || s.department === departmentFilter;
      const matchesLevel = levelFilter === 'ALL' || String(s.hierarchyLevel) === String(levelFilter);
      const directCount = s.directReportsCount || getDirectReports(s).length;
      const secondaryCount = s.secondaryReportsCount || getSecondaryReports(s).length;
      const totalSubordinates = directCount + secondaryCount;

      const matchesMapping =
        mappingStatusFilter === 'ALL' ||
        (mappingStatusFilter === 'MAPPED' && !!s.supervisorId) ||
        (mappingStatusFilter === 'UNMAPPED' && !s.supervisorId && s.hierarchyLevel > 1) ||
        (mappingStatusFilter === 'HAS_SUBORDINATES' && totalSubordinates > 0);

      return matchesSearch && matchesDept && matchesLevel && matchesMapping;
    });
  }, [staffList, searchTerm, departmentFilter, levelFilter, mappingStatusFilter]);

  // ─── STATS SUMMARY ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = staffList.length;
    const mapped = staffList.filter(s => s.supervisorId).length;
    const leads = staffList.filter(s => (s.directReportsCount > 0 || (s.secondaryReportsCount && s.secondaryReportsCount > 0) || getDirectReports(s).length > 0 || getSecondaryReports(s).length > 0)).length;
    const unmapped = staffList.filter(s => !s.supervisorId && s.hierarchyLevel > 1).length;
    return { total, mapped, leads, unmapped };
  }, [staffList]);

  // ─── OPEN EDIT DIALOG ───────────────────────────────────────────────────────
  const handleOpenEdit = (staff: any) => {
    setSelectedStaff(staff);
    setEditSupervisorId(staff.supervisorId || '');
    setEditSecondarySupervisorId(staff.secondarySupervisorId || '');
    setEditUnit(staff.unit || '');
    setEditApprovalTier(staff.approvalTier || 'TIER_1_CLINICAL');
    setEditHierarchyLevel(staff.hierarchyLevel || 4);
    setEditDialogOpen(true);
  };

  // ─── SAVE EDIT ──────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!selectedStaff) return;
    try {
      const res = await api.put(`/hr/supervisors/mapping/${selectedStaff.id}`, {
        supervisorId: editSupervisorId || null,
        secondarySupervisorId: editSecondarySupervisorId || null,
        unit: editUnit,
        approvalTier: editApprovalTier,
        hierarchyLevel: editHierarchyLevel
      });

      if (res.data?.success) {
        enqueueSnackbar(res.data.message || 'Supervisor mapping updated successfully', { variant: 'success' });
        setEditDialogOpen(false);
        fetchData();
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update mapping', { variant: 'error' });
    }
  };

  // ─── EXECUTE BULK MAPPING ───────────────────────────────────────────────────
  const handleExecuteBulk = async () => {
    if (!bulkDepartment || !bulkSupervisorId) {
      enqueueSnackbar('Please choose both a department and a supervisor', { variant: 'warning' });
      return;
    }
    try {
      const res = await api.post('/hr/supervisors/bulk-map', {
        department: bulkDepartment,
        supervisorId: bulkSupervisorId,
        approvalTier: bulkApprovalTier
      });

      if (res.data?.success) {
        enqueueSnackbar(res.data.message || 'Bulk mapping completed', { variant: 'success' });
        setBulkDialogOpen(false);
        fetchData();
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed bulk mapping', { variant: 'error' });
    }
  };

  // ─── TOGGLE NODE EXPANSION ──────────────────────────────────────────────────
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const expandAll = () => {
    const map: Record<string, boolean> = {};
    (organogramData?.allNodes || []).forEach((n: any) => {
      map[n.id] = true;
    });
    setExpandedNodes(map);
  };

  const collapseAll = () => {
    const map: Record<string, boolean> = {};
    (organogramData?.allNodes || []).forEach((n: any) => {
      if (n.hierarchyLevel === 1) map[n.id] = true;
    });
    setExpandedNodes(map);
  };

  // ─── EXPORT CSV ─────────────────────────────────────────────────────────────
  const exportCsv = () => {
    const headers = ['Staff ID', 'Full Name', 'Role', 'Department', 'Unit', 'Supervisor ID', 'Supervisor Name', 'Secondary Supervisor', 'Hierarchy Level', 'Approval Tier', 'Direct Reports'];
    const rows = staffList.map(s => [
      s.id,
      `"${s.firstName} ${s.lastName}"`,
      `"${s.role || ''}"`,
      `"${s.department || ''}"`,
      `"${s.unit || ''}"`,
      s.supervisorId || 'N/A',
      `"${s.supervisorName || 'N/A'}"`,
      `"${s.secondarySupervisorName || 'N/A'}"`,
      s.hierarchyLevel,
      s.approvalTier || 'N/A',
      s.directReportsCount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Faith_Foundation_Staff_Hierarchy_Mapping_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Hierarchy mapping exported to CSV', { variant: 'info' });
  };

  // ─── RENDER ORGANOGRAM NODE RECURSIVELY ──────────────────────────────────────
  const renderOrganogramNode = (node: any) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const levelStyle = LEVEL_COLORS[node.hierarchyLevel] || LEVEL_COLORS[5];
    const isBishop = node.id === 'ADM-02' || node.hierarchyLevel === 1;

    return (
      <Box
        key={node.id}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          mx: 1.5,
          my: 1
        }}
      >
        {/* Node Card */}
        <Card
          sx={{
            width: isBishop ? 320 : 280,
            borderRadius: 3,
            boxShadow: isBishop ? '0 10px 25px rgba(245, 158, 11, 0.25)' : '0 4px 14px rgba(0,0,0,0.08)',
            border: `2px solid ${levelStyle.border}`,
            bgcolor: '#ffffff',
            transition: 'all 0.2s ease-in-out',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'visible',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 28px rgba(30, 58, 138, 0.2)',
              borderColor: PRIMARY
            }
          }}
          onClick={() => {
            setSelectedNode(node);
            setDrawerOpen(true);
          }}
        >
          {/* Header Strip */}
          <Box
            sx={{
              bgcolor: levelStyle.bg,
              px: 2,
              py: 0.8,
              borderTopLeftRadius: 10,
              borderTopRightRadius: 10,
              borderBottom: `1px solid ${levelStyle.border}33`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: levelStyle.text, fontSize: '0.65rem', textTransform: 'uppercase' }}>
              {levelStyle.label.split('•')[1]?.trim() || `Level ${node.hierarchyLevel}`}
            </Typography>
            <Chip
              label={node.id}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.62rem',
                fontWeight: 800,
                bgcolor: '#ffffff',
                color: levelStyle.text,
                border: `1px solid ${levelStyle.border}`
              }}
            />
          </Box>

          <CardContent sx={{ p: 1.75, pb: '12px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  bgcolor: isBishop ? '#b45309' : PRIMARY,
                  color: '#ffffff',
                  fontWeight: 800,
                  width: 44,
                  height: 44,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                {node.firstName ? node.firstName[0] : 'S'}
              </Avatar>
              <Box sx={{ overflow: 'hidden', flex: 1 }}>
                <Typography noWrap variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  {node.fullName}
                </Typography>
                <Typography noWrap variant="caption" sx={{ color: '#475569', fontWeight: 600, display: 'block', fontSize: '0.72rem', mt: 0.25 }}>
                  {node.role}
                </Typography>
                <Typography noWrap variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>
                  🏢 {node.department}
                </Typography>
              </Box>
            </Box>

            {/* Supervisor Info Tag */}
            {node.supervisorName && (
              <Box sx={{ mt: 1.25, pt: 1, borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>
                  Reports to:
                </Typography>
                <Typography noWrap variant="caption" sx={{ color: PRIMARY, fontWeight: 700, fontSize: '0.68rem' }}>
                  {node.supervisorName}
                </Typography>
              </Box>
            )}

            {/* Action Bottom Bar */}
            <Box sx={{ mt: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Chip
                label={TIER_CONFIG[node.approvalTier]?.label.split(':')[0] || node.approvalTier || 'Tier 1'}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  bgcolor: TIER_CONFIG[node.approvalTier]?.bg || '#f1f5f9',
                  color: TIER_CONFIG[node.approvalTier]?.color || '#334155'
                }}
              />

              {hasChildren && (
                <Chip
                  icon={<People sx={{ fontSize: '13px !important' }} />}
                  label={`${node.children.length} Direct Reports`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800 }}
                />
              )}
            </Box>
          </CardContent>

          {/* Expand/Collapse Button if has direct subordinates */}
          {hasChildren && (
            <IconButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              sx={{
                position: 'absolute',
                bottom: -13,
                left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: '#ffffff',
                border: `2px solid ${PRIMARY}`,
                color: PRIMARY,
                width: 26,
                height: 26,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                '&:hover': { bgcolor: PRIMARY, color: '#ffffff' }
              }}
            >
              {isExpanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
            </IconButton>
          )}
        </Card>

        {/* Child Subtree Branches */}
        {hasChildren && isExpanded && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3, position: 'relative' }}>
            {/* Top Connector Line */}
            <Box sx={{ width: '2px', height: '24px', bgcolor: '#cbd5e1' }} />

            {/* Horizontal Branch Bar */}
            {node.children.length > 1 && (
              <Box
                sx={{
                  width: `calc(100% - ${280 / 2}px)`,
                  height: '2px',
                  bgcolor: '#cbd5e1',
                  mb: 1
                }}
              />
            )}

            {/* Children Container */}
            <Box sx={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'flex-start' }}>
              {node.children.map((child: any) => renderOrganogramNode(child))}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* ─── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <Box sx={{ mb: 2.5, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: PRIMARY, width: 44, height: 44, boxShadow: '0 4px 12px rgba(30,58,138,0.25)' }}>
              <AccountTree sx={{ fontSize: 26 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                Staff Hierarchy & Hospital Organogram
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                Catholic Diocese of Enugu • Faith Foundation Specialist Hospital Staff Supervision & Reporting Lines
              </Typography>
            </Box>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchData}
            disabled={loading}
            sx={{ borderRadius: 2, fontWeight: 700, borderColor: '#cbd5e1', color: '#334155', textTransform: 'none', py: 0.6, px: 1.5 }}
          >
            Refresh
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<GroupAdd />}
            onClick={() => setBulkDialogOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 700, borderColor: SECONDARY, color: SECONDARY, textTransform: 'none', py: 0.6, px: 1.5 }}
          >
            Bulk Map Department
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<FileDownload />}
            onClick={exportCsv}
            sx={{ borderRadius: 2, fontWeight: 700, bgcolor: PRIMARY, '&:hover': { bgcolor: '#172554' }, textTransform: 'none', py: 0.6, px: 1.5 }}
          >
            Export CSV
          </Button>
        </Stack>
      </Box>

      {/* ─── KPI SUMMARY CARDS ────────────────────────────────────────────────── */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', height: '100%' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Total Workforce
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.25, fontSize: { xs: '1.4rem', sm: '1.85rem' } }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="caption" sx={{ color: SUCCESS, fontWeight: 700, fontSize: '0.68rem', display: 'block' }}>
                    100% Active in Directory
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#eff6ff', color: PRIMARY, width: { xs: 38, sm: 46 }, height: { xs: 38, sm: 46 } }}>
                  <People sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', height: '100%' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Mapped to Supervisors
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: SUCCESS, mt: 0.25, fontSize: { xs: '1.4rem', sm: '1.85rem' } }}>
                    {stats.mapped}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>
                    Staff with Supervisors
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ecfdf5', color: SUCCESS, width: { xs: 38, sm: 46 }, height: { xs: 38, sm: 46 } }}>
                  <VerifiedUser sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', height: '100%' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Unit Leads & Directors
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: PURPLE, mt: 0.25, fontSize: { xs: '1.4rem', sm: '1.85rem' } }}>
                    {stats.leads}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>
                    Supervisors with Reports
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#faf5ff', color: PURPLE, width: { xs: 38, sm: 46 }, height: { xs: 38, sm: 46 } }}>
                  <SupervisorAccount sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', height: '100%' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Hierarchy Tiers
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: GOLD, mt: 0.25, fontSize: { xs: '1.4rem', sm: '1.85rem' } }}>
                    5 Tiers
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>
                    Board → Exec → Units
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fffbeb', color: GOLD, width: { xs: 38, sm: 46 }, height: { xs: 38, sm: 46 } }}>
                  <Lan sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ─── NAVIGATION TABS ─────────────────────────────────────────────────── */}
      <Paper sx={{ mb: 2.5, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Tabs
          value={currentTab}
          onChange={(_, v) => {
            setCurrentTab(v);
            if (v === 0) navigate('/staff/hierarchy/mapping');
            if (v === 1) navigate('/staff/hierarchy/organogram');
            if (v === 2) navigate('/staff/hierarchy/rules');
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          indicatorColor="primary"
          textColor="primary"
          sx={{
            px: { xs: 1, sm: 2 },
            bgcolor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 46, fontSize: { xs: '0.8rem', sm: '0.88rem' } }
          }}
        >
          <Tab icon={<People sx={{ fontSize: 18 }} />} iconPosition="start" label="Staff-to-Supervisor Mapping" />
          <Tab icon={<AccountTree sx={{ fontSize: 18 }} />} iconPosition="start" label="Hospital Organogram Chart" />
          <Tab icon={<Shield sx={{ fontSize: 18 }} />} iconPosition="start" label="Approval Tiers & Escalation Matrix" />
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 0: STAFF-TO-SUPERVISOR MAPPING GRID                               */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {currentTab === 0 && (
          <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            {/* Filter Bar */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3.5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search staff, supervisor, role, or ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: '#94a3b8', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2, bgcolor: '#ffffff', height: 38, fontSize: '0.82rem' }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Department"
                  value={departmentFilter}
                  onChange={e => setDepartmentFilter(e.target.value)}
                  sx={{ bgcolor: '#ffffff', borderRadius: 2, '& .MuiInputBase-root': { height: 38, fontSize: '0.82rem' } }}
                >
                  <MenuItem value="ALL">All Departments ({departments.length})</MenuItem>
                  {departments.map(d => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={6} sm={6} md={2.75}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Hierarchy Level"
                  value={levelFilter}
                  onChange={e => setLevelFilter(e.target.value)}
                  sx={{ bgcolor: '#ffffff', borderRadius: 2, '& .MuiInputBase-root': { height: 38, fontSize: '0.82rem' } }}
                >
                  <MenuItem value="ALL">All Hierarchy Levels</MenuItem>
                  <MenuItem value="1">L1 • Diocesan Patron / Board</MenuItem>
                  <MenuItem value="2">L2 • Executive Management</MenuItem>
                  <MenuItem value="3">L3 • Directorate Heads</MenuItem>
                  <MenuItem value="4">L4 • Unit Leads / In-Charges</MenuItem>
                  <MenuItem value="5">L5 • Operational Staff / Tills</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={6} sm={6} md={2.75}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Mapping Status"
                  value={mappingStatusFilter}
                  onChange={e => setMappingStatusFilter(e.target.value)}
                  sx={{ bgcolor: '#ffffff', borderRadius: 2, '& .MuiInputBase-root': { height: 38, fontSize: '0.82rem' } }}
                >
                  <MenuItem value="ALL">All Staff</MenuItem>
                  <MenuItem value="MAPPED">Mapped to Supervisor</MenuItem>
                  <MenuItem value="HAS_SUBORDINATES">Supervisors / Unit Leads</MenuItem>
                  <MenuItem value="UNMAPPED">Unmapped Staff</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            {/* Staff Mapping Table View (Desktop & Tablet) */}
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 2.5,
                border: '1px solid #e2e8f0',
                boxShadow: 'none',
                overflowX: 'auto',
                display: { xs: 'none', md: 'block' }
              }}
            >
              <Table size="small" sx={{ minWidth: 850 }}>
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', py: 1.25, width: '22%' }}>Staff Member</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', width: '18%' }}>Department & Unit</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', width: '18%' }}>Designation & Level</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', width: '18%' }}>Direct Supervisor</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', textAlign: 'center', width: '9%' }}>Approval Tier</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', textAlign: 'center', width: '10%' }}>Subordinates</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', textAlign: 'right', width: '5%', whiteSpace: 'nowrap' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 5 }}>
                        <CircularProgress size={32} />
                        <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
                          Loading staff hierarchy mappings...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 5 }}>
                        <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 600 }}>
                          No staff found matching the selected criteria.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map(staff => {
                      const levelStyle = LEVEL_COLORS[staff.hierarchyLevel] || LEVEL_COLORS[5];
                      const tierStyle = TIER_CONFIG[staff.approvalTier] || TIER_CONFIG.TIER_1_CLINICAL;
                      const direct = getDirectReports(staff);
                      const secondary = getSecondaryReports(staff);
                      const totalSubordinates = direct.length + secondary.length;

                      return (
                        <TableRow
                          key={staff.id}
                          hover
                          sx={{
                            '&:last-child td, &:last-child th': { border: 0 },
                            bgcolor: staff.id === 'ADM-02' ? '#fffdf7' : 'inherit'
                          }}
                        >
                          {/* Staff Member */}
                          <TableCell sx={{ py: 1.1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                              <Avatar
                                sx={{
                                  bgcolor: staff.id === 'ADM-02' ? '#b45309' : PRIMARY,
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  width: 34,
                                  height: 34,
                                  fontSize: '0.8rem'
                                }}
                              >
                                {staff.firstName ? staff.firstName[0] : 'S'}
                              </Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2, fontSize: '0.82rem' }}>
                                  {staff.firstName} {staff.lastName}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                                  <Chip
                                    label={staff.id}
                                    size="small"
                                    sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, bgcolor: '#f1f5f9' }}
                                  />
                                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {staff.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          </TableCell>

                          {/* Department & Unit */}
                          <TableCell sx={{ py: 1.1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.8rem' }}>
                              {staff.department}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>
                              📍 {staff.unit || 'General Hospital Unit'}
                            </Typography>
                          </TableCell>

                          {/* Designation & Level */}
                          <TableCell sx={{ py: 1.1 }}>
                            <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600, fontSize: '0.78rem' }}>
                              {staff.role}
                            </Typography>
                            <Chip
                              label={levelStyle.label.split('•')[0]?.trim()}
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.58rem',
                                fontWeight: 800,
                                bgcolor: levelStyle.bg,
                                color: levelStyle.text,
                                border: `1px solid ${levelStyle.border}`,
                                mt: 0.25
                              }}
                            />
                          </TableCell>

                          {/* Direct Supervisor */}
                          <TableCell sx={{ py: 1.1 }}>
                            {staff.supervisorName ? (
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <Avatar sx={{ width: 20, height: 20, fontSize: '0.6rem', bgcolor: SECONDARY, color: '#fff' }}>
                                    {staff.supervisorName[0]}
                                  </Avatar>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: PRIMARY, fontSize: '0.78rem' }}>
                                    {staff.supervisorName}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.66rem', mt: 0.2 }}>
                                  {staff.supervisorRole || 'Unit Supervisor'}
                                </Typography>
                                {staff.secondarySupervisorName && (
                                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.64rem' }}>
                                    2nd: {staff.secondarySupervisorName}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Chip
                                label={staff.hierarchyLevel === 1 ? 'Diocesan Synod' : 'Unassigned'}
                                size="small"
                                color={staff.hierarchyLevel === 1 ? 'warning' : 'default'}
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                              />
                            )}
                          </TableCell>

                          {/* Approval Tier */}
                          <TableCell sx={{ textAlign: 'center', py: 1.1 }}>
                            <Chip
                              label={tierStyle.label.split(':')[0]}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                bgcolor: tierStyle.bg,
                                color: tierStyle.color,
                                border: `1px solid ${tierStyle.border}`
                              }}
                            />
                          </TableCell>

                          {/* Subordinates Count */}
                          <TableCell sx={{ textAlign: 'center', py: 1.1 }}>
                            {totalSubordinates > 0 ? (
                              <Tooltip
                                title={
                                  <Box sx={{ p: 0.75, maxWidth: 320 }}>
                                    {direct.length > 0 && (
                                      <Box sx={{ mb: secondary.length > 0 ? 1 : 0 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#93c5fd', display: 'block', mb: 0.25 }}>
                                          • Direct Primary Subordinates ({direct.length}):
                                        </Typography>
                                        {direct.map((r: any) => (
                                          <Typography key={r.id} variant="caption" sx={{ display: 'block', fontSize: '0.72rem', color: '#f8fafc' }}>
                                            • {r.name} ({r.role})
                                          </Typography>
                                        ))}
                                      </Box>
                                    )}
                                    {secondary.length > 0 && (
                                      <Box>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#fcd34d', display: 'block', mb: 0.25 }}>
                                          • Secondary / Line Oversight ({secondary.length}):
                                        </Typography>
                                        {secondary.map((r: any) => (
                                          <Typography key={r.id} variant="caption" sx={{ display: 'block', fontSize: '0.72rem', color: '#f8fafc' }}>
                                            • {r.name} ({r.role})
                                          </Typography>
                                        ))}
                                      </Box>
                                    )}
                                    <Typography variant="caption" sx={{ display: 'block', mt: 1, fontSize: '0.68rem', color: '#cbd5e1', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.15)', pt: 0.5 }}>
                                      Click badge to view full subordinate profiles
                                    </Typography>
                                  </Box>
                                }
                                arrow
                              >
                                <Chip
                                  icon={<People sx={{ fontSize: '13px !important' }} />}
                                  label={`${direct.length} Staff${secondary.length > 0 ? ` (+${secondary.length} Line)` : ''}`}
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    setSubordinatesModalStaff(staff);
                                    setSubordinatesTab('ALL');
                                    setSubordinatesSearch('');
                                  }}
                                  sx={{
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    height: 22,
                                    fontSize: '0.68rem',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                      transform: 'scale(1.04)',
                                      boxShadow: '0 2px 6px rgba(37,99,235,0.35)'
                                    }
                                  }}
                                />
                              </Tooltip>
                            ) : (
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                —
                              </Typography>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell sx={{ textAlign: 'right', py: 1.1, whiteSpace: 'nowrap' }}>
                            <Stack direction="row" spacing={0.75} justifyContent="flex-end" alignItems="center">
                              {totalSubordinates > 0 && (
                                <Tooltip title={`View Team (${totalSubordinates} Subordinates)`}>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSubordinatesModalStaff(staff);
                                      setSubordinatesTab('ALL');
                                      setSubordinatesSearch('');
                                    }}
                                    sx={{
                                      bgcolor: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      color: '#2563eb',
                                      width: 28,
                                      height: 28,
                                      borderRadius: 1.5,
                                      '&:hover': { bgcolor: '#dbeafe' }
                                    }}
                                  >
                                    <Visibility sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Assign or Change Supervisor">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Edit sx={{ fontSize: '12px !important' }} />}
                                  onClick={() => handleOpenEdit(staff)}
                                  sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                    py: 0.3,
                                    px: 1,
                                    minWidth: 'auto',
                                    borderRadius: 1.5,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  Edit
                                </Button>
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

            {/* Mobile Card List View (Visible on Mobile/Tablet screens < 900px) */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
              {loading ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
                    Loading staff hierarchy...
                  </Typography>
                </Box>
              ) : filteredStaff.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#ffffff', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                    No staff found matching criteria.
                  </Typography>
                </Box>
              ) : (
                filteredStaff.map(staff => {
                  const levelStyle = LEVEL_COLORS[staff.hierarchyLevel] || LEVEL_COLORS[5];
                  const tierStyle = TIER_CONFIG[staff.approvalTier] || TIER_CONFIG.TIER_1_CLINICAL;
                  const direct = getDirectReports(staff);
                  const secondary = getSecondaryReports(staff);
                  const total = direct.length + secondary.length;

                  return (
                    <Card
                      key={staff.id}
                      variant="outlined"
                      sx={{
                        borderRadius: 2.5,
                        p: 1.75,
                        bgcolor: staff.id === 'ADM-02' ? '#fffdf7' : '#ffffff',
                        borderColor: '#e2e8f0',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                      }}
                    >
                      {/* Top Header: Avatar, Name, ID, Tier */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Avatar
                            sx={{
                              bgcolor: staff.id === 'ADM-02' ? '#b45309' : PRIMARY,
                              color: '#fff',
                              width: 38,
                              height: 38,
                              fontWeight: 800,
                              fontSize: '0.85rem'
                            }}
                          >
                            {staff.firstName ? staff.firstName[0] : 'S'}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                              {staff.firstName} {staff.lastName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.72rem' }}>
                              {staff.role}
                            </Typography>
                            <Chip label={staff.id} size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, mt: 0.25 }} />
                          </Box>
                        </Box>

                        <Chip
                          label={tierStyle.label.split(':')[0]}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            bgcolor: tierStyle.bg,
                            color: tierStyle.color,
                            border: `1px solid ${tierStyle.border}`
                          }}
                        />
                      </Box>

                      <Divider sx={{ my: 1 }} />

                      {/* Details Grid: Department & Supervisor */}
                      <Grid container spacing={1} sx={{ mb: 1.25 }}>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                            Department & Unit
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.78rem' }}>
                            {staff.department}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.66rem' }}>
                            📍 {staff.unit || 'Main Unit'}
                          </Typography>
                        </Grid>

                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                            Direct Supervisor
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: PRIMARY, fontSize: '0.78rem' }}>
                            {staff.supervisorName || 'Diocesan Synod'}
                          </Typography>
                          {staff.secondarySupervisorName && (
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.66rem', display: 'block' }}>
                              2nd: {staff.secondarySupervisorName}
                            </Typography>
                          )}
                        </Grid>
                      </Grid>

                      {/* Bottom Actions & Subordinates */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #f1f5f9', gap: 1 }}>
                        {total > 0 ? (
                          <Chip
                            icon={<People sx={{ fontSize: '13px !important' }} />}
                            label={`${direct.length} Staff${secondary.length > 0 ? ` (+${secondary.length} Line)` : ''}`}
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSubordinatesModalStaff(staff);
                              setSubordinatesTab('ALL');
                              setSubordinatesSearch('');
                            }}
                            sx={{ fontWeight: 800, height: 24, fontSize: '0.68rem', cursor: 'pointer' }}
                          />
                        ) : (
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                            No subordinates
                          </Typography>
                        )}

                        <Stack direction="row" spacing={1}>
                          {total > 0 && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setSubordinatesModalStaff(staff);
                                setSubordinatesTab('ALL');
                                setSubordinatesSearch('');
                              }}
                              sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.72rem', py: 0.3, px: 1, borderRadius: 1.5 }}
                            >
                              Team ({total})
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Edit sx={{ fontSize: '12px !important' }} />}
                            onClick={() => handleOpenEdit(staff)}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              py: 0.3,
                              px: 1.25,
                              borderRadius: 1.5,
                              bgcolor: PRIMARY
                            }}
                          >
                            Edit
                          </Button>
                        </Stack>
                      </Box>
                    </Card>
                  );
                })
              )}
            </Box>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: VISUAL HOSPITAL ORGANOGRAM CHART                                */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {currentTab === 1 && (
          <Box sx={{ p: 2.5 }}>
            {/* Top Tree Controls */}
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2.5,
                bgcolor: '#f1f5f9',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }}>
                  Tree Controls:
                </Typography>
                <Button size="small" variant="contained" onClick={expandAll} sx={{ bgcolor: PRIMARY, fontWeight: 700, borderRadius: 1.5 }}>
                  Expand All
                </Button>
                <Button size="small" variant="outlined" onClick={collapseAll} sx={{ fontWeight: 700, borderRadius: 1.5 }}>
                  Collapse All
                </Button>
                <Divider orientation="vertical" flexItem />
                <Tooltip title="Zoom In">
                  <IconButton size="small" onClick={() => setZoomScale(s => Math.min(s + 0.1, 1.4))} sx={{ bgcolor: '#ffffff' }}>
                    <ZoomIn fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>
                  {Math.round(zoomScale * 100)}%
                </Typography>
                <Tooltip title="Zoom Out">
                  <IconButton size="small" onClick={() => setZoomScale(s => Math.max(s - 0.1, 0.6))} sx={{ bgcolor: '#ffffff' }}>
                    <ZoomOut fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reset Zoom">
                  <IconButton size="small" onClick={() => setZoomScale(1)} sx={{ bgcolor: '#ffffff' }}>
                    <RestartAlt fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* Legend */}
              <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
                {Object.entries(LEVEL_COLORS).map(([lvl, conf]) => (
                  <Chip
                    key={lvl}
                    label={conf.label}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      bgcolor: conf.bg,
                      color: conf.text,
                      border: `1px solid ${conf.border}`
                    }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Organogram Tree Canvas */}
            <Box
              sx={{
                width: '100%',
                overflowX: 'auto',
                overflowY: 'auto',
                py: 4,
                px: 2,
                bgcolor: '#fafafa',
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                minHeight: '650px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            >
              <Box
                sx={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                {loading || !organogramData ? (
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                    <CircularProgress size={40} />
                    <Typography variant="body2" sx={{ mt: 2, color: '#64748b' }}>
                      Constructing Organogram Hierarchy Tree...
                    </Typography>
                  </Box>
                ) : (
                  (organogramData.rootNodes || []).map((rootNode: any) => renderOrganogramNode(rootNode))
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: APPROVAL TIERS & ESCALATION MATRIX                             */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {currentTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
              Hospital Supervisory Tiers & Leave/Expense Escalation Matrix
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              Every staff member's requisitions, leave requests, shift swaps, and timesheets follow the designated reporting hierarchy.
            </Typography>

            <Grid container spacing={2.5}>
              {Object.entries(TIER_CONFIG).map(([tierKey, conf]) => (
                <Grid item xs={12} md={6} key={tierKey}>
                  <Card sx={{ borderRadius: 3, border: `2px solid ${conf.border}`, bgcolor: conf.bg, boxShadow: 'none' }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: conf.color }}>
                          {conf.label}
                        </Typography>
                        <Chip
                          label={tierKey}
                          size="small"
                          sx={{ bgcolor: '#ffffff', fontWeight: 800, color: conf.color, border: `1px solid ${conf.border}` }}
                        />
                      </Box>
                      <Divider sx={{ my: 1.5, borderColor: `${conf.border}44` }} />

                      <Typography variant="caption" sx={{ fontWeight: 700, color: conf.color, display: 'block', mb: 0.5 }}>
                        Primary Staff In Tier:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                        {staffList
                          .filter(s => s.approvalTier === tierKey)
                          .map(s => (
                            <Chip
                              key={s.id}
                              avatar={<Avatar sx={{ bgcolor: conf.color, color: '#fff' }}>{s.firstName[0]}</Avatar>}
                              label={`${s.firstName} ${s.lastName} (${s.role})`}
                              size="small"
                              sx={{ bgcolor: '#ffffff', color: '#1e293b', fontWeight: 600, fontSize: '0.72rem' }}
                            />
                          ))}
                      </Box>

                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block' }}>
                        Escalation Protocol:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.82rem', mt: 0.25 }}>
                        {tierKey === 'TIER_5_BOARD' && 'Direct oversight by the Diocesan Bishop and Board of Trustees. Approves strategic investments, senior appointments, and hospital statutes.'}
                        {tierKey === 'TIER_4_EXECUTIVE' && 'Reports to Diocesan Health Director / Bishop. Final administrative approval for leaves > 5 days, capital expenditures, and inter-directorate policies.'}
                        {tierKey === 'TIER_3_ADMIN' && 'Reports to Hospital Administrator / CEO. First-level review for facility requisitions, donor projects, and administrative operations.'}
                        {tierKey === 'TIER_2_FINANCE' && 'Reports to Revenue Unit Lead / CFO. Validates till cash transfers, daily end-of-shift reconciliations, and financial audits.'}
                        {tierKey === 'TIER_1_CLINICAL' && 'Reports to Clinical Services Director / Chief Nursing Officer. Approves clinical shift rosters, relief officer handovers, and medical leave.'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* ─── EDIT SUPERVISOR DIALOG ───────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', pb: 1 }}>
          Assign / Reassign Staff Supervisor
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {selectedStaff && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Configuring hierarchy reporting and supervisory approvals for{' '}
                <strong>
                  {selectedStaff.firstName} {selectedStaff.lastName}
                </strong>{' '}
                ({selectedStaff.role} • {selectedStaff.department}).
              </Alert>

              {/* Direct Supervisor Selection */}
              <TextField
                select
                fullWidth
                label="Direct Primary Supervisor"
                value={editSupervisorId}
                onChange={e => setEditSupervisorId(e.target.value)}
                helperText="Primary supervisor who reviews shift rosters, leaves, and appraisals"
              >
                <MenuItem value="">
                  <em>No Direct Supervisor (Root / Executive)</em>
                </MenuItem>
                {supervisors
                  .filter(s => s.id !== selectedStaff.id)
                  .map(s => (
                    <MenuItem key={s.id} value={s.id}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {s.name} ({s.id})
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {s.role} • {s.department}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
              </TextField>

              {/* Secondary Supervisor */}
              <TextField
                select
                fullWidth
                label="Secondary / Line Supervisor (Optional)"
                value={editSecondarySupervisorId}
                onChange={e => setEditSecondarySupervisorId(e.target.value)}
                helperText="Backup supervisor for relief authorizations and escalated approvals"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {supervisors
                  .filter(s => s.id !== selectedStaff.id && s.id !== editSupervisorId)
                  .map(s => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name} — {s.role}
                    </MenuItem>
                  ))}
              </TextField>

              {/* Unit / Section */}
              <TextField
                fullWidth
                label="Hospital Unit / Section / Station"
                value={editUnit}
                onChange={e => setEditUnit(e.target.value)}
                placeholder="e.g. Outpatient Till #01, ICU Ward, AYP Hub, Pharmacy Dispensary"
              />

              {/* Hierarchy Level */}
              <TextField
                select
                fullWidth
                label="Hierarchy Reporting Tier"
                value={editHierarchyLevel}
                onChange={e => setEditHierarchyLevel(Number(e.target.value))}
              >
                <MenuItem value={1}>Level 1 • Diocesan Patron & Bishop</MenuItem>
                <MenuItem value={2}>Level 2 • Executive Management (CMD / CEO / Health Director)</MenuItem>
                <MenuItem value={3}>Level 3 • Directorate Heads (Clinical, Nursing, Finance, Projects)</MenuItem>
                <MenuItem value={4}>Level 4 • Unit Leads / Supervisors & Specialists</MenuItem>
                <MenuItem value={5}>Level 5 • Operational Staff / Cashiers / Shift Workers</MenuItem>
              </TextField>

              {/* Approval Tier */}
              <TextField
                select
                fullWidth
                label="Approval & Escalation Tier"
                value={editApprovalTier}
                onChange={e => setEditApprovalTier(e.target.value)}
              >
                <MenuItem value="TIER_1_CLINICAL">Tier 1: Clinical & Nursing Care</MenuItem>
                <MenuItem value="TIER_2_FINANCE">Tier 2: Finance & Revenue Control</MenuItem>
                <MenuItem value="TIER_3_ADMIN">Tier 3: Directorate & Administration</MenuItem>
                <MenuItem value="TIER_4_EXECUTIVE">Tier 4: Executive Leadership (CMD/CEO)</MenuItem>
                <MenuItem value="TIER_5_BOARD">Tier 5: Diocesan Board & Patron</MenuItem>
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} sx={{ fontWeight: 700, color: '#64748b' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveEdit} sx={{ fontWeight: 800, bgcolor: PRIMARY }}>
            Save Hierarchy Mapping
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── BULK MAP DEPARTMENT DIALOG ───────────────────────────────────────── */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', pb: 1 }}>
          Bulk Map Department to Supervisor
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Map all employees within a specific hospital department to report directly to a chosen Unit Lead or Director.
            </Alert>

            {/* Department */}
            <TextField
              select
              fullWidth
              label="Select Target Department"
              value={bulkDepartment}
              onChange={e => setBulkDepartment(e.target.value)}
            >
              <MenuItem value="">
                <em>Choose a department</em>
              </MenuItem>
              {departments.map(d => (
                <MenuItem key={d} value={d}>
                  {d} ({staffList.filter(s => s.department === d).length} Staff)
                </MenuItem>
              ))}
            </TextField>

            {/* Supervisor */}
            <TextField
              select
              fullWidth
              label="Assign to Supervisor"
              value={bulkSupervisorId}
              onChange={e => setBulkSupervisorId(e.target.value)}
            >
              <MenuItem value="">
                <em>Choose supervisor</em>
              </MenuItem>
              {supervisors.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} — {s.role} ({s.department})
                </MenuItem>
              ))}
            </TextField>

            {/* Approval Tier */}
            <TextField
              select
              fullWidth
              label="Default Approval Tier"
              value={bulkApprovalTier}
              onChange={e => setBulkApprovalTier(e.target.value)}
            >
              <MenuItem value="TIER_1_CLINICAL">Tier 1: Clinical & Nursing Care</MenuItem>
              <MenuItem value="TIER_2_FINANCE">Tier 2: Finance & Revenue Control</MenuItem>
              <MenuItem value="TIER_3_ADMIN">Tier 3: Directorate & Administration</MenuItem>
              <MenuItem value="TIER_4_EXECUTIVE">Tier 4: Executive Leadership (CMD/CEO)</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setBulkDialogOpen(false)} sx={{ fontWeight: 700, color: '#64748b' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleExecuteBulk} sx={{ fontWeight: 800, bgcolor: SECONDARY }}>
            Execute Bulk Mapping
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── SUBORDINATES DRILL-DOWN MODAL ────────────────────────────────────── */}
      <Dialog
        open={Boolean(subordinatesModalStaff)}
        onClose={() => setSubordinatesModalStaff(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }
        }}
      >
        {subordinatesModalStaff && (() => {
          const direct = getDirectReports(subordinatesModalStaff);
          const secondary = getSecondaryReports(subordinatesModalStaff);
          const allReports = [
            ...direct.map((r: any) => ({ ...r, relationshipType: 'PRIMARY' as const })),
            ...secondary.map((r: any) => ({ ...r, relationshipType: 'SECONDARY' as const }))
          ];

          const filteredReports = allReports.filter((r: any) => {
            const matchesType =
              subordinatesTab === 'ALL' ||
              (subordinatesTab === 'DIRECT' && r.relationshipType === 'PRIMARY') ||
              (subordinatesTab === 'SECONDARY' && r.relationshipType === 'SECONDARY');
            
            const q = subordinatesSearch.toLowerCase().trim();
            const matchesQuery = !q ||
              r.name.toLowerCase().includes(q) ||
              r.role.toLowerCase().includes(q) ||
              r.id.toLowerCase().includes(q) ||
              (r.department && r.department.toLowerCase().includes(q));

            return matchesType && matchesQuery;
          });

          const levelStyle = LEVEL_COLORS[subordinatesModalStaff.hierarchyLevel || 4] || LEVEL_COLORS[4];
          const tierStyle = TIER_CONFIG[subordinatesModalStaff.approvalTier || 'TIER_1_CLINICAL'] || TIER_CONFIG['TIER_1_CLINICAL'];

          return (
            <Box>
              {/* Header Banner */}
              <Box
                sx={{
                  p: 3,
                  bgcolor: '#0f172a',
                  color: '#ffffff',
                  position: 'relative',
                  backgroundImage: 'radial-gradient(at 0% 0%, rgba(37,99,235,0.3) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(124,58,237,0.2) 0px, transparent 50%)'
                }}
              >
                <IconButton
                  onClick={() => setSubordinatesModalStaff(null)}
                  sx={{ position: 'absolute', top: 12, right: 12, color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#ffffff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  <Close />
                </IconButton>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }}>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      bgcolor: subordinatesModalStaff.id === 'ADM-02' ? '#b45309' : PRIMARY,
                      color: '#ffffff',
                      fontSize: '1.6rem',
                      fontWeight: 800,
                      border: '3px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                    }}
                  >
                    {subordinatesModalStaff.firstName ? subordinatesModalStaff.firstName[0] : 'S'}
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                        {subordinatesModalStaff.fullName || `${subordinatesModalStaff.firstName} ${subordinatesModalStaff.lastName}`}
                      </Typography>
                      <Chip
                        label={subordinatesModalStaff.id}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#ffffff', fontWeight: 800, fontSize: '0.72rem', height: 22 }}
                      />
                    </Stack>

                    <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                      {subordinatesModalStaff.role} • <span style={{ color: '#cbd5e1' }}>{subordinatesModalStaff.department} ({subordinatesModalStaff.unit || 'Hospital Station'})</span>
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap">
                      <Chip
                        label={levelStyle.label.split('•')[0]?.trim()}
                        size="small"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: levelStyle.bg, color: levelStyle.text, border: `1px solid ${levelStyle.border}` }}
                      />
                      <Chip
                        label={tierStyle.label.split(':')[0]}
                        size="small"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: tierStyle.bg, color: tierStyle.color, border: `1px solid ${tierStyle.border}` }}
                      />
                      {subordinatesModalStaff.email && (
                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          ✉️ {subordinatesModalStaff.email}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </Box>

              {/* KPI Summary Cards */}
              <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: subordinatesTab === 'DIRECT' ? '#eff6ff' : '#ffffff',
                        borderColor: subordinatesTab === 'DIRECT' ? '#3b82f6' : '#e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: '#3b82f6', transform: 'translateY(-2px)' }
                      }}
                      onClick={() => setSubordinatesTab('DIRECT')}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ bgcolor: '#dbeafe', color: '#1e40af', width: 40, height: 40 }}>
                          <People sx={{ fontSize: 22 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                            {direct.length}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                            Direct Primary Subordinates
                          </Typography>
                        </Box>
                      </Stack>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: subordinatesTab === 'SECONDARY' ? '#fffbeb' : '#ffffff',
                        borderColor: subordinatesTab === 'SECONDARY' ? '#f59e0b' : '#e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: '#f59e0b', transform: 'translateY(-2px)' }
                      }}
                      onClick={() => setSubordinatesTab('SECONDARY')}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ bgcolor: '#fef3c7', color: '#b45309', width: 40, height: 40 }}>
                          <CallSplit sx={{ fontSize: 22 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                            {secondary.length}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                            Secondary / Line Oversight
                          </Typography>
                        </Box>
                      </Stack>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: subordinatesTab === 'ALL' ? '#f5f3ff' : '#ffffff',
                        borderColor: subordinatesTab === 'ALL' ? '#8b5cf6' : '#e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: '#8b5cf6', transform: 'translateY(-2px)' }
                      }}
                      onClick={() => setSubordinatesTab('ALL')}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ bgcolor: '#ede9fe', color: '#6d28d9', width: 40, height: 40 }}>
                          <SupervisorAccount sx={{ fontSize: 22 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                            {allReports.length}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                            Total Supervised Team
                          </Typography>
                        </Box>
                      </Stack>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              {/* Controls: Search & Tabs */}
              <Box sx={{ px: 3, pt: 2, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                <Tabs
                  value={subordinatesTab}
                  onChange={(_, val) => setSubordinatesTab(val)}
                  sx={{
                    minHeight: 36,
                    '& .MuiTab-root': {
                      minHeight: 36,
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      py: 0.5,
                      px: 1.5
                    }
                  }}
                >
                  <Tab label={`All Staff (${allReports.length})`} value="ALL" />
                  <Tab label={`Direct Primary (${direct.length})`} value="DIRECT" />
                  <Tab label={`Secondary / Line (${secondary.length})`} value="SECONDARY" />
                </Tabs>

                <TextField
                  placeholder="Search subordinate staff..."
                  size="small"
                  value={subordinatesSearch}
                  onChange={e => setSubordinatesSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 18, color: '#94a3b8' }} />
                      </InputAdornment>
                    )
                  }}
                  sx={{ width: { xs: '100%', sm: 260 }, '& .MuiInputBase-root': { height: 36, fontSize: '0.8rem' } }}
                />
              </Box>

              {/* Subordinates List Content */}
              <DialogContent sx={{ p: 3, maxHeight: '50vh', overflowY: 'auto' }}>
                {filteredReports.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6, bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #cbd5e1' }}>
                    <People sx={{ fontSize: 44, color: '#94a3b8', mb: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#475569' }}>
                      No subordinates found
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 400, mx: 'auto', mt: 0.5 }}>
                      {subordinatesSearch ? `No staff matched "${subordinatesSearch}".` : 'There are no subordinates mapped under this supervisor for the selected category.'}
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.75}>
                    {filteredReports.map((sub: any) => {
                      const subLevelStyle = LEVEL_COLORS[sub.hierarchyLevel || 5] || LEVEL_COLORS[5];
                      const subTierStyle = TIER_CONFIG[sub.approvalTier || 'TIER_1_CLINICAL'] || TIER_CONFIG['TIER_1_CLINICAL'];
                      const isPrimary = sub.relationshipType === 'PRIMARY';

                      return (
                        <Card
                          key={`${sub.id}-${sub.relationshipType}`}
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 2.5,
                            borderLeft: `5px solid ${isPrimary ? '#2563eb' : '#f59e0b'}`,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              boxShadow: '0 4px 14px rgba(0,0,0,0.07)',
                              borderColor: isPrimary ? '#93c5fd' : '#fcd34d'
                            }
                          }}
                        >
                          <Grid container spacing={2} alignItems="center">
                            {/* Staff Identity */}
                            <Grid item xs={12} sm={5}>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar
                                  sx={{
                                    width: 44,
                                    height: 44,
                                    bgcolor: isPrimary ? '#eff6ff' : '#fffbeb',
                                    color: isPrimary ? '#1d4ed8' : '#b45309',
                                    fontWeight: 800,
                                    fontSize: '1rem',
                                    border: `1px solid ${isPrimary ? '#bfdbfe' : '#fde68a'}`
                                  }}
                                >
                                  {sub.name ? sub.name[0] : 'S'}
                                </Avatar>
                                <Box>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                      {sub.name}
                                    </Typography>
                                    <Chip label={sub.id} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }} />
                                  </Stack>
                                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                                    {sub.role}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>
                                    📍 {sub.department} {sub.unit ? `• ${sub.unit}` : ''}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Grid>

                            {/* Relationship & Hierarchy Tier */}
                            <Grid item xs={12} sm={4}>
                              <Stack spacing={0.75}>
                                <Chip
                                  icon={isPrimary ? <People sx={{ fontSize: '13px !important' }} /> : <CallSplit sx={{ fontSize: '13px !important' }} />}
                                  label={isPrimary ? 'Direct Primary Subordinate' : 'Secondary / Line Oversight'}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    bgcolor: isPrimary ? '#dbeafe' : '#fef3c7',
                                    color: isPrimary ? '#1e40af' : '#92400e',
                                    border: `1px solid ${isPrimary ? '#bfdbfe' : '#fde68a'}`,
                                    alignSelf: 'flex-start'
                                  }}
                                />
                                {!isPrimary && sub.primarySupervisorName && (
                                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem' }}>
                                    Primary Supervisor: <b>{sub.primarySupervisorName}</b>
                                  </Typography>
                                )}
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                  <Chip
                                    label={subLevelStyle.label.split('•')[0]?.trim()}
                                    size="small"
                                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: subLevelStyle.bg, color: subLevelStyle.text }}
                                  />
                                  <Chip
                                    label={subTierStyle.label.split(':')[0]}
                                    size="small"
                                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: subTierStyle.bg, color: subTierStyle.color }}
                                  />
                                </Stack>
                              </Stack>
                            </Grid>

                            {/* Contacts & Quick Actions */}
                            <Grid item xs={12} sm={3} sx={{ textAlign: { sm: 'right' } }}>
                              <Stack spacing={1} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
                                {sub.email && (
                                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Email sx={{ fontSize: 13, color: '#94a3b8' }} /> {sub.email}
                                  </Typography>
                                )}
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Edit sx={{ fontSize: '13px !important' }} />}
                                  onClick={() => {
                                    const fullStaffObj = staffList.find(s => s.id === sub.id) || sub;
                                    setSubordinatesModalStaff(null);
                                    handleOpenEdit(fullStaffObj);
                                  }}
                                  sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.72rem',
                                    py: 0.3,
                                    px: 1,
                                    borderRadius: 1.5
                                  }}
                                >
                                  Reassign / Edit
                                </Button>
                              </Stack>
                            </Grid>
                          </Grid>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </DialogContent>

              {/* Footer */}
              <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
                <Button
                  variant="outlined"
                  startIcon={<AccountTree />}
                  onClick={() => {
                    const nodeStaff = subordinatesModalStaff;
                    setSubordinatesModalStaff(null);
                    setCurrentTab(1);
                    setSelectedNode(nodeStaff);
                    setDrawerOpen(true);
                  }}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  View in Organogram Chart
                </Button>

                <Button
                  variant="contained"
                  onClick={() => setSubordinatesModalStaff(null)}
                  sx={{ textTransform: 'none', fontWeight: 800, bgcolor: PRIMARY, borderRadius: 2, px: 3 }}
                >
                  Close
                </Button>
              </DialogActions>
            </Box>
          );
        })()}
      </Dialog>

      {/* ─── NODE DETAIL DRAWER ──────────────────────────────────────────────── */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: { xs: 320, sm: 420 }, p: 3 }}>
          {selectedNode && (() => {
            const directReports = getDirectReports(selectedNode);
            const secondaryReports = getSecondaryReports(selectedNode);

            return (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Staff Node Profile
                  </Typography>
                  <IconButton size="small" onClick={() => setDrawerOpen(false)}>
                    <Close />
                  </IconButton>
                </Box>

                <Box sx={{ textAlign: 'center', py: 2, bgcolor: '#f8fafc', borderRadius: 3, mb: 2.5 }}>
                  <Avatar
                    sx={{
                      bgcolor: selectedNode.id === 'ADM-02' ? '#b45309' : PRIMARY,
                      color: '#ffffff',
                      width: 64,
                      height: 64,
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      mx: 'auto',
                      mb: 1.5,
                      boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                    }}
                  >
                    {selectedNode.firstName ? selectedNode.firstName[0] : 'S'}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                    {selectedNode.fullName || `${selectedNode.firstName} ${selectedNode.lastName}`}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, mt: 0.25 }}>
                    {selectedNode.role}
                  </Typography>
                  <Chip
                    label={selectedNode.id}
                    size="small"
                    sx={{ mt: 1, fontWeight: 800, bgcolor: '#e2e8f0', color: '#1e293b' }}
                  />
                </Box>

                <Stack spacing={2} sx={{ mb: 3 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      Department & Station
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {selectedNode.department}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      📍 {selectedNode.unit || 'Main Facility'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      Direct Supervisor
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: PRIMARY }}>
                      {selectedNode.supervisorName || 'None (Episcopal / Executive)'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {selectedNode.supervisorRole}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      Hierarchy & Approval Tier
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={`Level ${selectedNode.hierarchyLevel} • ${selectedNode.approvalTier}`}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                      />
                    </Box>
                  </Box>

                  {/* Direct Subordinates */}
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      Direct Primary Subordinates ({directReports.length})
                    </Typography>
                    {directReports.length > 0 ? (
                      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {directReports.map((child: any) => (
                          <Box
                            key={child.id}
                            sx={{
                              p: 1.25,
                              borderRadius: 2,
                              bgcolor: '#f1f5f9',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                {child.name || child.fullName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {child.role}
                              </Typography>
                            </Box>
                            <Chip label={child.id} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }} />
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                        No direct primary subordinates assigned.
                      </Typography>
                    )}
                  </Box>

                  {/* Secondary Subordinates */}
                  {secondaryReports.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>
                        Secondary / Line Oversight ({secondaryReports.length})
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {secondaryReports.map((child: any) => (
                          <Box
                            key={child.id}
                            sx={{
                              p: 1.25,
                              borderRadius: 2,
                              bgcolor: '#fefce8',
                              border: '1px solid #fef08a',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                {child.name || child.fullName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#854d0e' }}>
                                {child.role} {child.primarySupervisorName ? `(Primary: ${child.primarySupervisorName})` : ''}
                              </Typography>
                            </Box>
                            <Chip label={child.id} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#fef3c7' }} />
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Stack>

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Edit />}
                  onClick={() => {
                    setDrawerOpen(false);
                    handleOpenEdit(selectedNode);
                  }}
                  sx={{ borderRadius: 2, fontWeight: 800, bgcolor: PRIMARY }}
                >
                  Modify Reporting Line
                </Button>
              </Box>
            );
          })()}
        </Box>
      </Drawer>
    </Box>
  );
};

export default SupervisorMappingOrganogram;
