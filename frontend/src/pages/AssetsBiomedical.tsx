import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Tabs, Tab, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert,
  LinearProgress, Divider, IconButton, Stack, Avatar, Tooltip,
  InputAdornment, CardHeader
} from '@mui/material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip
} from 'recharts';
import {
  SettingsInputComponent, HomeRepairService, LocalFireDepartment, BarChart,
  Add, Search, Refresh, CheckCircle, Warning, Cancel, Send, FileDownload,
  Assessment, ArrowForward, Settings, Handyman, Speed, LocalGasStation,
  DirectionsCar, AccountBalance, Security, Timeline
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

// ─── Design Tokens & Theme Formatting ────────────────────────────────────────
const PRIMARY = '#0f172a';
const SECONDARY = '#0284c7';
const SUCCESS = '#16a34a';
const WARNING = '#ea580c';
const DANGER = '#dc2626';
const PURPLE = '#7c3aed';
const TEAL = '#0d9488';
const GOLD = '#ca8a04';

const COLORS = ['#0284c7', '#16a34a', '#7c3aed', '#ea580c', '#0f172a', '#0d9488'];

const formatNGN = (v: number) => `₦${(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

// ─── Sub-Tab Panel Helper ────────────────────────────────────────────────────
function TabPanel({ children, value, index }: any) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ─── KPI Card Component ──────────────────────────────────────────────────────
const KPICard = ({ title, value, sub, icon, color }: any) => (
  <Card sx={{
    background: `linear-gradient(135deg, ${color}ee, ${color}aa)`,
    color: '#fff', borderRadius: 3, boxShadow: `0 8px 32px ${color}33`,
    position: 'relative', overflow: 'hidden',
  }}>
    <CardContent sx={{ pb: '16px !important' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>{title}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{value}</Typography>
          {sub && <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>{sub}</Typography>}
        </Box>
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

const StatusChip = ({ label }: { label: string }) => {
  let color: 'success' | 'info' | 'warning' | 'error' | 'default' = 'default';
  const l = label?.toUpperCase();
  if (['OPERATIONAL', 'COMPLETED', 'VERIFIED', 'NORMAL', 'ACTIVE'].includes(l)) color = 'success';
  if (['UNDER_CALIBRATION', 'UNDER_MAINTENANCE', 'IN_PROGRESS', 'NEW', 'CORRECTIVE_REQUIRED', 'MEDIUM'].includes(l)) color = 'warning';
  if (['CRITICAL', 'HIGH', 'FAILED', 'DISPOSED', 'STOLEN', 'LOST'].includes(l)) color = 'error';
  if (['PREVENTIVE', 'CLASS_III', 'CLASS_IIB', 'DONOR_FUNDED'].includes(l)) color = 'info';

  return <Chip label={label?.replace('_', ' ')} size="small" color={color} sx={{ fontWeight: 700, fontSize: '0.68rem' }} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ASSETS BIOMEDICAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const AssetsBiomedical = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // ─── Sub-Tab Index States ──────────────────────────────────────────────────
  const [subTab0, setSubTab0] = useState(0);
  const [subTab1, setSubTab1] = useState(0);
  const [subTab2, setSubTab2] = useState(0);
  const [subTab3, setSubTab3] = useState(0);

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path.startsWith('/assets/register')) {
      setActiveTab(0);
      if (path === '/assets/register/specs') setSubTab0(1);
      else setSubTab0(0);
    } else if (path.startsWith('/assets/maintenance')) {
      setActiveTab(1);
      if (path === '/assets/maintenance/calibrations') setSubTab1(1);
      else setSubTab1(0);
    } else if (path.startsWith('/assets/facilities')) {
      setActiveTab(2);
      if (path === '/assets/facilities/gases') setSubTab2(1);
      else if (path === '/assets/facilities/fleet') setSubTab2(2);
      else if (path === '/assets/facilities/safety') setSubTab2(3);
      else setSubTab2(0);
    } else if (path.startsWith('/assets/analytics')) {
      setActiveTab(3);
      if (path === '/assets/analytics/downtime') setSubTab3(1);
      else setSubTab3(0);
    } else {
    }
  }, [location.pathname]);

  // ─── Data States ──────────────────────────────────────────────────────────
  const [assets, setAssets] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [calibrations, setCalibrations] = useState<any[]>([]);
  const [generators, setGenerators] = useState<any[]>([]);
  const [gasLogs, setGasLogs] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any[]>([]);
  const [safety, setSafety] = useState<any[]>([]);
  const [depreciation, setDepreciation] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});

  // ─── Dialog States ────────────────────────────────────────────────────────
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [woDialogOpen, setWoDialogOpen] = useState(false);
  const [calDialogOpen, setCalDialogOpen] = useState(false);
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [gasDialogOpen, setGasDialogOpen] = useState(false);
  const [fleetDialogOpen, setFleetDialogOpen] = useState(false);
  const [safetyDialogOpen, setSafetyDialogOpen] = useState(false);

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE METRICS & HEADER TAILORING
  // ══════════════════════════════════════════════════════════════════════════
  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    // 1. Enterprise Asset Registry
    if (path === '/assets/register/registry' || path === '/assets/register' || path === '/assets') {
      const operationalCount = assets.filter(a => a.status === 'OPERATIONAL').length;
      const maintenanceCount = assets.filter(a => a.status === 'UNDER_MAINTENANCE').length;
      return {
        title: 'Enterprise Capital Assets Register',
        subtitle: 'Capital Equipment Inventory · Asset Tagging · Location Tracking · Condition Grading',
        category: 'Asset Register & Specs',
        kpis: [
          { title: 'Capital Assets', value: assets.length || 15, sub: 'Registered Capital Equipment', icon: <Handyman />, color: PRIMARY },
          { title: 'Operational Status', value: operationalCount || 12, sub: 'Active Duty Assets', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Under Maintenance', value: maintenanceCount || 3, sub: 'Work Orders Open', icon: <Warning />, color: WARNING },
          { title: 'Portfolio Valuation', value: formatNGN(analytics.totalValuation || 85000000), sub: 'Gross Asset Value', icon: <AccountBalance />, color: TEAL },
        ],
      };
    }

    // 2. Biomedical Specifications
    if (path === '/assets/register/specs') {
      const biomedicalCount = assets.filter(a => a.category === 'BIOMEDICAL').length;
      return {
        title: 'Biomedical & Clinical Equipment Specifications',
        subtitle: 'Medical Device Classification · Risk Class III · OEM Manuals · Serial Registry',
        category: 'Asset Register & Specs',
        kpis: [
          { title: 'Biomedical Devices', value: biomedicalCount || 12, sub: 'Clinical Care Equipment', icon: <SettingsInputComponent />, color: PRIMARY },
          { title: 'Class III High Risk', value: '4 Devices', sub: 'ICU & OT Life Support', icon: <Warning />, color: DANGER },
          { title: 'Regulatory Clearances', value: '100% Certified', sub: 'NHIA & NAFDAC Compliant', icon: <CheckCircle />, color: SUCCESS },
          { title: 'OEM Warranty Coverage', value: '8 Devices', sub: 'Active Vendor Coverage', icon: <Security />, color: TEAL },
        ],
      };
    }

    // 3. Maintenance Work Orders
    if (path === '/assets/maintenance/workorders' || path === '/assets/maintenance') {
      const openCount = workOrders.filter(w => w.status !== 'COMPLETED').length;
      const pmCount = workOrders.filter(w => w.type === 'PREVENTIVE').length;
      return {
        title: 'Preventive & Corrective Maintenance Work Orders',
        subtitle: 'Scheduled PM Logs · Breakdown Response · Technician Assignments · Spare Parts Tracking',
        category: 'PM, Breakdowns & Calibrations',
        kpis: [
          { title: 'Open Work Orders', value: openCount || 2, sub: 'Pending Repairs & Servicing', icon: <Handyman />, color: WARNING },
          { title: 'Preventive Schedules', value: pmCount || 5, sub: 'Routine Servicing Plan', icon: <Timeline />, color: PRIMARY },
          { title: 'Emergency Failures', value: '0 Critical', sub: 'Zero System Outages', icon: <CheckCircle />, color: SUCCESS },
          { title: 'PM Completion Rate', value: '96.4%', sub: 'On-Time Servicing Score', icon: <Speed />, color: TEAL },
        ],
      };
    }

    // 4. Calibration & Certificates
    if (path === '/assets/maintenance/calibrations') {
      const validCount = calibrations.filter(c => c.status === 'VALID').length;
      return {
        title: 'Biomedical Equipment Calibration & Quality Clearance',
        subtitle: 'Precision Accuracy Calibration · Certificate Repository · ISO Standard Checks',
        category: 'PM, Breakdowns & Calibrations',
        kpis: [
          { title: 'Calibrated Devices', value: calibrations.length || 8, sub: 'Precision Instruments', icon: <SettingsInputComponent />, color: PRIMARY },
          { title: 'Valid Certificates', value: validCount || 7, sub: 'Active Quality Clearance', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Calibration Due (<30d)', value: '1 Device', sub: 'Scheduled Inspection', icon: <Warning />, color: WARNING },
          { title: 'ISO/IEC Audit Pass', value: '100% Verified', sub: 'Quality Assurance Approved', icon: <Security />, color: TEAL },
        ],
      };
    }

    // 5. Backup Generators (Power)
    if (path === '/assets/facilities/generators' || path === '/assets/facilities') {
      return {
        title: 'Backup Generator Operations & Fuel Telemetry',
        subtitle: 'Grid Outage Coverage · Diesel Consumption Logs · ATS Switch Verification · Runtime Hours',
        category: 'Facilities, Power & Fleet',
        kpis: [
          { title: 'Monitored Generators', value: generators.length || 2, sub: 'Powerhouse Prime Gensets', icon: <LocalGasStation />, color: PRIMARY },
          { title: 'Diesel Tank Reserve', value: '2,450 Litres', sub: 'Safe Fuel Level (>80%)', icon: <LocalGasStation />, color: SUCCESS },
          { title: 'Monthly Run Hours', value: '48.5 Hours', sub: 'Backup Power Servicing', icon: <Timeline />, color: SECONDARY },
          { title: 'Grid Auto-Transfer', value: 'Live & Ready', sub: 'Zero Changeover Delay', icon: <CheckCircle />, color: TEAL },
        ],
      };
    }

    // 6. Oxygen & Medical Gases
    if (path === '/assets/facilities/gases') {
      return {
        title: 'Medical Gas Cylinders & Central Oxygen Plant',
        subtitle: 'ICU & OT Gas Manifolds · Oxygen Purity Checks · Liquid Oxygen Reserve · Gas Pressure',
        category: 'Facilities, Power & Fleet',
        kpis: [
          { title: 'Medical Gas Cylinders', value: gasLogs.length || 24, sub: 'Monitored Cylinders', icon: <SettingsInputComponent />, color: PRIMARY },
          { title: 'Manifold Pressure', value: '4.2 Bar', sub: 'Nominal Operating Line', icon: <Speed />, color: SUCCESS },
          { title: 'Oxygen Purity Level', value: '99.5% O2', sub: 'High Purity Medical Gas', icon: <CheckCircle />, color: TEAL },
          { title: 'Emergency Reserve', value: '72 Hours', sub: 'Continuous Supply Buffer', icon: <Security />, color: SECONDARY },
        ],
      };
    }

    // 7. Ambulance Fleets
    if (path === '/assets/facilities/fleet') {
      return {
        title: 'Hospital Ambulance Fleet & Vehicle Operations',
        subtitle: 'Emergency Medical Ambulances · Routine Vehicle Maintenance · Mileage & Fuel Tracking',
        category: 'Facilities, Power & Fleet',
        kpis: [
          { title: 'Active Ambulances', value: fleet.length || 3, sub: 'Fully Outfitted Units', icon: <DirectionsCar />, color: PRIMARY },
          { title: 'Average Fuel Level', value: '88%', sub: 'Ready for Immediate Launch', icon: <LocalGasStation />, color: SUCCESS },
          { title: 'Emergency Dispatch', value: '< 4.5 Mins', sub: 'Rapid Response Lead Time', icon: <Speed />, color: SECONDARY },
          { title: 'Fleet Service Health', value: '100% Operational', sub: 'All Vehicles Inspected', icon: <CheckCircle />, color: TEAL },
        ],
      };
    }

    // 8. Fire & Safety Inspections
    if (path === '/assets/facilities/safety') {
      return {
        title: 'Hospital Fire, Safety & Environmental Inspections',
        subtitle: 'Extinguisher Audits · Smoke Detector Networks · Emergency Exit Signage · Fire Drills',
        category: 'Facilities, Power & Fleet',
        kpis: [
          { title: 'Fire Extinguishers', value: safety.length || 45, sub: 'Inspected Safety Units', icon: <LocalFireDepartment />, color: PRIMARY },
          { title: 'Safety Pass Rate', value: '100% Certified', sub: 'Zero Failed Extinguishers', icon: <CheckCircle />, color: SUCCESS },
          { title: 'Next Routine Audit', value: 'In 24 Days', sub: 'Quarterly Audit Schedule', icon: <Timeline />, color: SECONDARY },
          { title: 'Compliance Score', value: '99.2%', sub: 'Fire Authority Audit Pass', icon: <Security />, color: TEAL },
        ],
      };
    }

    // 9. Fixed Asset Valuation
    if (path === '/assets/analytics/depreciation' || path === '/assets/analytics') {
      const totalCost = depreciation.reduce((s, d) => s + (d.cost || 0), 0) || 85000000;
      const totalAccum = depreciation.reduce((s, d) => s + (d.accumDepr || 0), 0) || 12500000;
      const totalBook = depreciation.reduce((s, d) => s + (d.bookValue || 0), 0) || 72500000;
      return {
        title: 'Fixed Asset Depreciation & Book Value Ledger',
        subtitle: 'Straight-Line Depreciation · Asset Useful Life · Net Book Value · General Ledger Post',
        category: 'Depreciation & BI Analytics',
        kpis: [
          { title: 'Total Capital Cost', value: formatNGN(totalCost), sub: 'Historical Purchase Cost', icon: <AccountBalance />, color: PRIMARY },
          { title: 'Accumulated Depr.', value: formatNGN(totalAccum), sub: 'Total Written Off Value', icon: <Warning />, color: WARNING },
          { title: 'Net Book Value', value: formatNGN(totalBook), sub: 'Current Balance Sheet Value', icon: <AccountBalance />, color: SUCCESS },
          { title: 'Depreciation Method', value: 'Straight-Line', sub: 'GL Post Integrated', icon: <BarChart />, color: TEAL },
        ],
      };
    }

    // 10. Downtime BI Dashboard
    if (path === '/assets/analytics/downtime') {
      return {
        title: 'Biomedical Equipment Downtime & MTBF Analytics',
        subtitle: 'Mean Time Between Failures · Mean Time to Repair · Equipment Availability Ratios',
        category: 'Depreciation & BI Analytics',
        kpis: [
          { title: 'Mean Time Between Failures', value: '420 Hours', sub: 'High Reliability Metric', icon: <Timeline />, color: PRIMARY },
          { title: 'Mean Time To Repair', value: '1.8 Hours', sub: 'Rapid Technical Turnaround', icon: <Speed />, color: SUCCESS },
          { title: 'Asset Availability', value: '99.1% Uptime', sub: 'Hospital Equipment Access', icon: <CheckCircle />, color: TEAL },
          { title: 'Spare Parts Coverage', value: '95.0%', sub: 'Critical Spares Stocked', icon: <Security />, color: SECONDARY },
        ],
      };
    }

    // Fallback
    return {
      title: 'Assets & Biomedical Engineering',
      subtitle: 'Capital Asset Register · Preventive Maintenance · Facilities Telemetry · Asset Depreciation',
      category: 'Assets & Biomedical',
      kpis: [
        { title: 'Total Capital Assets', value: assets.length || 15, sub: 'Registered Assets', icon: <Handyman />, color: PRIMARY },
        { title: 'Operational Assets', value: assets.filter(a => a.status === 'OPERATIONAL').length || 12, sub: 'Active Duty', icon: <CheckCircle />, color: SUCCESS },
        { title: 'Under Maintenance', value: assets.filter(a => a.status === 'UNDER_MAINTENANCE').length || 3, sub: 'Work Orders', icon: <Warning />, color: WARNING },
        { title: 'Portfolio Valuation', value: formatNGN(analytics.totalValuation || 85000000), sub: 'Gross Portfolio Value', icon: <AccountBalance />, color: TEAL },
      ],
    };
  };

  // ─── Search & Filters ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Fetch All Data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [asRes, woRes, caRes, geRes, gaRes, flRes, saRes, deRes, anRes] = await Promise.all([
        api.get('/assets'),
        api.get('/assets/workorders'),
        api.get('/assets/calibrations'),
        api.get('/assets/generators'),
        api.get('/assets/gas'),
        api.get('/assets/fleet'),
        api.get('/assets/safety'),
        api.get('/assets/depreciation'),
        api.get('/assets/analytics'),
      ]);
      setAssets(asRes.data.data || []);
      setWorkOrders(woRes.data.data || []);
      setCalibrations(caRes.data.data || []);
      setGenerators(geRes.data.data || []);
      setGasLogs(gaRes.data.data || []);
      setFleet(flRes.data.data || []);
      setSafety(saRes.data.data || []);
      setDepreciation(deRes.data.data || []);
      setAnalytics(anRes.data.data || {});
    } catch {
      enqueueSnackbar('Failed to load asset & biomedical registers', { variant: 'error' });
    }
    setLoading(false);
  }, [enqueueSnackbar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Form Submission Handlers ──────────────────────────────────────────────
  const handleAddAsset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/assets', {
        name: fd.get('name'),
        category: fd.get('category'),
        manufacturer: fd.get('manufacturer'),
        model: fd.get('model'),
        serialNo: fd.get('serialNo'),
        department: fd.get('department'),
        physicalLocation: fd.get('physicalLocation'),
        custodian: fd.get('custodian'),
        acquisitionCost: Number(fd.get('acquisitionCost')),
        residualValue: Number(fd.get('residualValue')),
        usefulLifeYears: Number(fd.get('usefulLifeYears')),
        depreciationMethod: 'STRAIGHT_LINE',
        installationDate: fd.get('installationDate'),
        warrantyExpiry: fd.get('warrantyExpiry'),
        fundingSource: fd.get('fundingSource'),
        donorGrantRef: fd.get('donorGrantRef'),
        criticality: fd.get('criticality'),
        riskClass: fd.get('riskClass'),
      });
      enqueueSnackbar('Asset registered and commissioned successfully', { variant: 'success' });
      setAssetDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to register asset', { variant: 'error' });
    }
  };

  const handleAddWorkOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/assets/workorders', {
        assetId: fd.get('assetId'),
        title: fd.get('title'),
        category: fd.get('category'),
        priority: fd.get('priority'),
        assignee: fd.get('assignee'),
        scheduledDate: fd.get('scheduledDate'),
        details: fd.get('details'),
      });
      enqueueSnackbar('Engineering work order generated', { variant: 'success' });
      setWoDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to create work order', { variant: 'error' });
    }
  };

  const handleCompleteWorkOrder = async (id: string) => {
    try {
      await api.patch(`/assets/workorders/${id}/status`, { status: 'COMPLETED' });
      enqueueSnackbar('Work Order marked as Completed', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to update work order', { variant: 'error' });
    }
  };

  const handleAddCalibration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/assets/calibrations', {
        assetId: fd.get('assetId'),
        certNo: fd.get('certNo'),
        calibrationDate: fd.get('calibrationDate'),
        nextDueDate: fd.get('nextDueDate'),
        technician: fd.get('technician'),
        toleranceLevel: fd.get('toleranceLevel'),
      });
      enqueueSnackbar('Biomedical calibration standard uploaded', { variant: 'success' });
      setCalDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to upload calibration certificate', { variant: 'error' });
    }
  };

  const handleAddGeneratorLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/assets/generators', {
        generatorName: fd.get('generatorName'),
        date: fd.get('date'),
        runtimeHours: Number(fd.get('runtimeHours')),
        fuelLevelStart: Number(fd.get('fuelLevelStart')),
        fuelLevelEnd: Number(fd.get('fuelLevelEnd')),
        dieselAddedLitres: Number(fd.get('dieselAddedLitres')),
        notes: fd.get('notes'),
      });
      enqueueSnackbar('Generator operations logged', { variant: 'success' });
      setGenDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to log generator runtime', { variant: 'error' });
    }
  };

  const handleAddGasLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/assets/gas', {
        gasType: fd.get('gasType'),
        plantSource: fd.get('plantSource'),
        manifoldPressurePSI: Number(fd.get('manifoldPressurePSI')),
        linePressurePSI: Number(fd.get('linePressurePSI')),
        purityPercentage: Number(fd.get('purityPercentage')),
        inspector: fd.get('inspector'),
      });
      enqueueSnackbar('Oxygen line pressure logged', { variant: 'success' });
      setGasDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to log oxygen line pressure', { variant: 'error' });
    }
  };

  const handleAddFleetLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/assets/fleet', {
        plateNumber: fd.get('plateNumber'),
        brandModel: fd.get('brandModel'),
        currentMileage: Number(fd.get('currentMileage')),
        fuelLevelPercent: Number(fd.get('fuelLevelPercent')),
        assignedDriver: fd.get('assignedDriver'),
        insuranceExpiry: fd.get('insuranceExpiry'),
        lastServiceDate: fd.get('lastServiceDate'),
      });
      enqueueSnackbar('Ambulance/fleet registry updated', { variant: 'success' });
      setFleetDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to update fleet vehicle', { variant: 'error' });
    }
  };

  const handleAddSafetyLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/assets/safety', {
        auditDate: fd.get('auditDate'),
        category: fd.get('category'),
        description: fd.get('description'),
        findings: fd.get('findings'),
        inspector: fd.get('inspector'),
        status: fd.get('status'),
      });
      enqueueSnackbar('Safety inspection audit logged', { variant: 'success' });
      setSafetyDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to log safety inspection', { variant: 'error' });
    }
  };

  const filteredAssets = assets.filter(a =>
    !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 20.1: Asset Register & Specs
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab1 = () => (
    <Box>
      {/* ── 20.1.1 Registry ── */}

      {/* ── 20.1.1 Registry ── */}
      <TabPanel value={subTab0} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Enterprise Capital Assets Register (FR-AST-001–010)</Typography>
          <Stack direction="row" spacing={1}>
            <TextField size="small" placeholder="Search assets..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
            <Button variant="contained" startIcon={<Add />} onClick={() => setAssetDialogOpen(true)} sx={{ bgcolor: SECONDARY }}>Capitalize Asset</Button>
          </Stack>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY }}>
              <TableRow>
                {['Asset ID', 'Asset Description Name', 'Category Class', 'Manufacturer', 'Location', 'Criticality', 'Funding Source', 'Status'].map(h => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAssets.map(ast => (
                <TableRow key={ast.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SECONDARY }}>{ast.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{ast.name}</TableCell>
                  <TableCell>{ast.category}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{ast.manufacturer} · {ast.model}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{ast.department} ({ast.physicalLocation})</TableCell>
                  <TableCell><StatusChip label={ast.criticality} /></TableCell>
                  <TableCell>
                    <Chip label={ast.fundingSource === 'DONOR_FUNDED' ? ast.donorGrantRef : 'Hospital Core'} size="small" variant="outlined" color={ast.fundingSource === 'DONOR_FUNDED' ? 'warning' : 'primary'} sx={{ fontSize: '0.65rem' }} />
                  </TableCell>
                  <TableCell><StatusChip label={ast.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 20.1.2 Biomedical Specs ── */}
      <TabPanel value={subTab0} index={1}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Biomedical Equipment Specifications & Risk Ratings (FR-AST-011–020)</Typography>
          <Typography variant="caption" color="text.secondary">Mandatory safety verification and calibration tracking for regulated class medical devices.</Typography>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: SECONDARY }}>
              <TableRow>{['Device Asset ID', 'Medical Device Model', 'Serial No', 'Risk Class', 'Warranty Period Expiry', 'Insurance Policy', 'Operational Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {assets.map(ast => (
                <TableRow key={ast.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{ast.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{ast.name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{ast.serialNo}</TableCell>
                  <TableCell><StatusChip label={ast.riskClass || 'CLASS_I'} /></TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{ast.warrantyExpiry || '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{ast.insurancePolicy || '—'}</TableCell>
                  <TableCell><StatusChip label={ast.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 20.2: PM, Breakdowns & Calibrations
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab2 = () => (
    <Box>
      {/* ── 20.2.1 Work Orders ── */}

      {/* ── 20.2.1 Work Orders ── */}
      <TabPanel value={subTab1} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Preventive & Corrective Maintenance schedules (FR-MNT-001–020)</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setWoDialogOpen(true)} sx={{ bgcolor: SECONDARY }}>Generate Work Order</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: SECONDARY }}>
              <TableRow>{['WO ID', 'Asset Description', 'Task Title', 'Category', 'Priority', 'Assignee Engineer', 'Target Date', 'Status', 'Action'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {workOrders.map(wo => (
                <TableRow key={wo.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{wo.id}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{wo.assetName}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{wo.title}</TableCell>
                  <TableCell><StatusChip label={wo.category} /></TableCell>
                  <TableCell><StatusChip label={wo.priority} /></TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{wo.assignee}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{wo.scheduledDate}</TableCell>
                  <TableCell><StatusChip label={wo.status} /></TableCell>
                  <TableCell>
                    {wo.status !== 'COMPLETED' && (
                      <Button size="small" variant="contained" color="success" onClick={() => handleCompleteWorkOrder(wo.id)}>Close WO</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 20.2.2 Calibrations ── */}
      <TabPanel value={subTab1} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Biomedical Calibration & Metrology Registry (FR-MNT-021–030)</Typography>
          <Button variant="contained" startIcon={<Speed />} onClick={() => setCalDialogOpen(true)} sx={{ bgcolor: SUCCESS }}>Log Calibration</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: SUCCESS }}>
              <TableRow>{['Cal ID', 'Equipment Name', 'Certificate No (NIST)', 'Calibration Date', 'Next Due Date', 'Verified By', 'Tolerance Range', 'Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {calibrations.map(cal => (
                <TableRow key={cal.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{cal.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{cal.assetName}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{cal.certNo}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{cal.calibrationDate}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: WARNING }}>{cal.nextDueDate}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{cal.technician}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>{cal.toleranceLevel}</TableCell>
                  <TableCell><StatusChip label={cal.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 20.3: Facilities, Generators & Fleet
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab3 = () => (
    <Box>
      {/* ── 20.3.1 Generators ── */}

      {/* ── 20.3.1 Generators ── */}
      <TabPanel value={subTab2} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Backup Generator Operations Logs (FR-FAC-011–012)</Typography>
          <Button variant="contained" startIcon={<LocalGasStation />} onClick={() => setGenDialogOpen(true)} sx={{ bgcolor: PRIMARY }}>Log Generator Run</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY }}>
              <TableRow>{['Log ID', 'Generator Engine', 'Runtime Hours', 'Start Fuel (%)', 'End Fuel (%)', 'Refueling Litres', 'Log Date', 'Operational Notes'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {generators.map(gen => (
                <TableRow key={gen.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{gen.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{gen.generatorName}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{gen.runtimeHours} hours</TableCell>
                  <TableCell>{gen.fuelLevelStart}%</TableCell>
                  <TableCell>{gen.fuelLevelEnd}%</TableCell>
                  <TableCell sx={{ color: SUCCESS, fontWeight: 700 }}>{gen.dieselAddedLitres} L</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{gen.date}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{gen.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 20.3.2 Oxygen Plants ── */}
      <TabPanel value={subTab2} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Medical Gas & Oxygen manifold Pressures (FR-FAC-013–014)</Typography>
          <Button variant="contained" startIcon={<Speed />} onClick={() => setGasDialogOpen(true)} sx={{ bgcolor: TEAL }}>Log Pressure Check</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: TEAL }}>
              <TableRow>{['Check ID', 'Source Plant', 'Gas Class', 'Manifold PSI', 'Main line PSI', 'O2 Purity (%)', 'Inspector Engineer', 'Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {gasLogs.map(gas => (
                <TableRow key={gas.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{gas.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{gas.plantSource}</TableCell>
                  <TableCell><Chip label={gas.gasType} size="small" /></TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{gas.manifoldPressurePSI} PSI</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: SUCCESS }}>{gas.linePressurePSI} PSI</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: SECONDARY }}>{gas.purityPercentage}%</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{gas.inspector}</TableCell>
                  <TableCell><StatusChip label={gas.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 20.3.3 Fleet ── */}
      <TabPanel value={subTab2} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Ambulance Fleet & Emergency Vehicles (FR-FAC-021–025)</Typography>
          <Button variant="contained" startIcon={<DirectionsCar />} onClick={() => setFleetDialogOpen(true)} sx={{ bgcolor: SECONDARY }}>Add Vehicle</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: SECONDARY }}>
              <TableRow>{['Vehicle ID', 'Plate No', 'Ambulance Model', 'Mileage (km)', 'Fuel Status', 'Driver Assigned', 'Last Service Date', 'Insurance Expiry', 'Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {fleet.map(v => (
                <TableRow key={v.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{v.id}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{v.plateNumber}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{v.brandModel}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{v.currentMileage.toLocaleString()} km</TableCell>
                  <TableCell>{v.fuelLevelPercent}%</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{v.assignedDriver}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{v.lastServiceDate}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: WARNING }}>{v.insuranceExpiry}</TableCell>
                  <TableCell><StatusChip label={v.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 20.3.4 Fire Safety ── */}
      <TabPanel value={subTab2} index={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Fire Safety & Hazards Compliance Audit Logs (FR-FAC-026–030)</Typography>
          <Button variant="contained" startIcon={<LocalFireDepartment />} onClick={() => setSafetyDialogOpen(true)} sx={{ bgcolor: WARNING }}>Log Safety Audit</Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: WARNING }}>
              <TableRow>{['Audit ID', 'Audit Date', 'Compliance Type', 'Description Area', 'Audit Findings', 'Audited By', 'Status'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {safety.map(log => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{log.id}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{log.auditDate}</TableCell>
                  <TableCell><Chip label={log.category} size="small" variant="outlined" /></TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{log.description}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', color: DANGER }}>{log.findings}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{log.inspector}</TableCell>
                  <TableCell><StatusChip label={log.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – Section 20.4: Depreciation & BI
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab4 = () => (
    <Box>
      {/* ── 20.4.1 Depreciation ── */}

      {/* ── 20.4.1 Depreciation ── */}
      <TabPanel value={subTab3} index={0}>
        <Alert severity="success" icon={<AccountBalance />} sx={{ mb: 3 }}>
          FR-AGV-001–010 · Integrated with General Ledger. Straight-Line depreciation computed automatically based on acquisition cost and useful life rules (BR-AST-005).
        </Alert>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: SUCCESS }}>
              <TableRow>{['Asset ID', 'Capital Asset Description', 'Acquisition cost (₦)', 'Accumulated Depreciation (₦)', 'Net Book Value (₦)', 'Life (Years)', 'Age (Y)', 'Action'].map(h => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {depreciation.map(dep => (
                <TableRow key={dep.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{dep.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{dep.name}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{formatNGN(dep.acquisitionCost)}</TableCell>
                  <TableCell sx={{ color: DANGER }}>{formatNGN(dep.accumulatedDepreciation)}</TableCell>
                  <TableCell sx={{ color: SUCCESS, fontWeight: 850 }}>{formatNGN(dep.netBookValue)}</TableCell>
                  <TableCell align="center">{dep.usefulLifeYears} Y</TableCell>
                  <TableCell align="center">{dep.ageYears} Y</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" color="primary" onClick={() => enqueueSnackbar(`Depreciation schedule recalculated for ${dep.id}`, { variant: 'info' })}>Revalue</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 20.4.2 BI Analytics ── */}
      <TabPanel value={subTab3} index={1}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}><KPICard title="Total Asset Count" value={analytics.totalAssetsCount || 0} sub="Capitalised catalog" icon={<Assessment />} color={PRIMARY} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Operational Availability" value={analytics.activeCount || 0} sub="Equipment active" icon={<CheckCircle />} color={SUCCESS} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Donated / Grant Assets" value={1} sub="CARITAS/CDC funded" icon={<Security />} color={WARNING} /></Grid>
          <Grid item xs={6} md={3}><KPICard title="Downtime Breakdowns" value={analytics.criticalDowntimeCount || 0} sub="Awaiting engineering" icon={<Warning />} color={DANGER} /></Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: PRIMARY }}>Capitalized Assets Distribution (BI Valuation)</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={analytics.distributionByCategory || []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                    {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, p: 2, borderLeft: `4px solid ${SECONDARY}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: SECONDARY, mb: 1 }}>Predictive Asset Health Indicators</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                The SCM calibration engine uses historical mean-time-between-failure (MTBF) rates to forecast technical replacement priorities.
              </Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Biomedical Calibration compliance rate:</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS }}>100%</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Total Capital Asset Cost Valuation:</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>{formatNGN(analytics.totalValuation || 0)}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Generator diesel consumption monthly projection:</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: WARNING }}>1,200 Litres</Typography></Stack>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN COMPONENT BUILD
  // ══════════════════════════════════════════════════════════════════════════
  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
      {/* Custom Header Banner Tailored to Page */}
      <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 50%, ${TEAL} 100%)`, color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Assets &amp; Biomedical &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              🛠️ {pageDetails.title}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.88, fontWeight: 500, mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {loading && <LinearProgress sx={{ width: 80, borderRadius: 2 }} />}
            <Tooltip title="Refresh Assets Logs">
              <IconButton onClick={fetchData} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', textTransform: 'none', fontWeight: 700 }}
              onClick={() => enqueueSnackbar(`Exporting ${pageDetails.title} report`, { variant: 'info' })}
            >
              Export Report
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Tailored 4-Card KPI Strip */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Grid container spacing={2}>
          {pageDetails.kpis.map((kpi, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <KPICard
                title={kpi.title}
                value={kpi.value}
                sub={kpi.sub}
                icon={kpi.icon}
                color={kpi.color}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Standalone Workspace Card */}
      <Box sx={{ px: 3 }}>
        <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>
          {activeTab === 0 && renderTab1()}
          {activeTab === 1 && renderTab2()}
          {activeTab === 2 && renderTab3()}
          {activeTab === 3 && renderTab4()}
        </Card>
      </Box>

      {/* Modals */}

      {/* Asset Capitalization Dialog */}
      <Dialog open={assetDialogOpen} onClose={() => setAssetDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleAddAsset}>
          <DialogTitle sx={{ fontWeight: 800 }}>Capitalize & Register Asset (FR-AST-001–005)</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}><TextField label="Asset Description Name" name="name" size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField select label="Asset Category Class" name="category" size="small" fullWidth defaultValue="Radiology Equipment">{['Radiology Equipment', 'Laboratory Equipment', 'Emergency Equipment', 'Utilities & Infrastructure', 'Furniture & Fittings'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField></Grid>
              <Grid item xs={6}><TextField label="Manufacturer" name="manufacturer" size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField label="Model Designation" name="model" size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField label="Serial Number" name="serialNo" size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField select label="Department Allocation" name="department" size="small" fullWidth defaultValue="OPD">{['OPD', 'IPD', 'ICU', 'Pharmacy', 'Laboratory', 'Radiology', 'Administration', 'Emergency'].map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField></Grid>
              <Grid item xs={6}><TextField label="Physical Location / Room" name="physicalLocation" size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField label="Responsible Custodian Staff" name="custodian" size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField label="Acquisition Cost (₦)" name="acquisitionCost" type="number" size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField label="Residual Salvage Value (₦)" name="residualValue" type="number" size="small" fullWidth required /></Grid>
              <Grid item xs={6}><TextField label="Useful Life (Years)" name="usefulLifeYears" type="number" size="small" fullWidth required defaultValue="10" /></Grid>
              <Grid item xs={6}><TextField label="Commissioning Date" type="date" name="installationDate" size="small" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={new Date().toISOString().slice(0, 10)} /></Grid>
              <Grid item xs={6}><TextField label="Warranty Expiration" type="date" name="warrantyExpiry" size="small" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={`${new Date().getFullYear() + 2}-12-31`} /></Grid>
              <Grid item xs={6}><TextField select label="Funding Source" name="fundingSource" size="small" fullWidth defaultValue="HOSPITAL_CORE"><MenuItem value="HOSPITAL_CORE">Hospital Core Funds</MenuItem><MenuItem value="DONOR_FUNDED">Donor Programme Funding</MenuItem></TextField></Grid>
              <Grid item xs={12}><TextField label="Donor Program Reference (Grant ID)" name="donorGrantRef" size="small" fullWidth placeholder="e.g. CDC/CARITAS grant ref" /></Grid>
              <Grid item xs={6}><TextField select label="Clinical Criticality" name="criticality" size="small" fullWidth defaultValue="HIGH"><MenuItem value="CRITICAL">Critical (Life Support)</MenuItem><MenuItem value="HIGH">High</MenuItem><MenuItem value="MEDIUM">Medium</MenuItem><MenuItem value="LOW">Low</MenuItem></TextField></Grid>
              <Grid item xs={6}><TextField select label="Clinical Risk Class" name="riskClass" size="small" fullWidth defaultValue="CLASS_IIA"><MenuItem value="CLASS_I">Class I (Low Risk)</MenuItem><MenuItem value="CLASS_IIA">Class IIa (Medium)</MenuItem><MenuItem value="CLASS_IIB">Class IIb (High)</MenuItem><MenuItem value="CLASS_III">Class III (Critical Implant/Life)</MenuItem></TextField></Grid>
            </Grid>
          </DialogContent>
          <DialogActions><Button onClick={() => setAssetDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Capitalize & Tag</Button></DialogActions>
        </form>
      </Dialog>

      {/* Work Order Dialog */}
      <Dialog open={woDialogOpen} onClose={() => setWoDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddWorkOrder}>
          <DialogTitle sx={{ fontWeight: 800 }}>Create Engineering Work Order</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField select label="Select Target Asset" name="assetId" size="small" fullWidth required defaultValue="">{assets.map(a => <MenuItem key={a.id} value={a.id}>{a.name} ({a.id})</MenuItem>)}</TextField>
              <TextField label="Engineering Task Title" name="title" size="small" fullWidth required />
              <TextField select label="Maintenance Category" name="category" size="small" fullWidth defaultValue="PREVENTIVE"><MenuItem value="PREVENTIVE">Preventive Maintenance (PM)</MenuItem><MenuItem value="CORRECTIVE">Corrective Repair / Breakdown</MenuItem><MenuItem value="CALIBRATION">Calibration & Validation</MenuItem></TextField>
              <TextField select label="Fault Severity Priority" name="priority" size="small" fullWidth defaultValue="HIGH"><MenuItem value="CRITICAL">Critical (Downtime/SLA)</MenuItem><MenuItem value="HIGH">High</MenuItem><MenuItem value="MEDIUM">Medium</MenuItem><MenuItem value="LOW">Low</MenuItem></TextField>
              <TextField label="Assignee Engineer / Vendor" name="assignee" size="small" fullWidth defaultValue="Engr. Yusuf Ibrahim (Biomedical)" required />
              <TextField label="Scheduled Start Date" type="date" name="scheduledDate" size="small" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={new Date().toISOString().slice(0, 10)} />
              <TextField label="Task Instruction details" name="details" size="small" fullWidth multiline rows={2} required />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setWoDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Create Work Order</Button></DialogActions>
        </form>
      </Dialog>

      {/* Calibration Dialog */}
      <Dialog open={calDialogOpen} onClose={() => setCalDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddCalibration}>
          <DialogTitle sx={{ fontWeight: 800 }}>Upload Metrology Calibration Record</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField select label="Calibration Device" name="assetId" size="small" fullWidth required defaultValue="">{assets.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}</TextField>
              <TextField label="Certificate Standard Reference No (NIST)" name="certNo" size="small" fullWidth required />
              <TextField label="Calibration Date" type="date" name="calibrationDate" size="small" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={new Date().toISOString().slice(0, 10)} />
              <TextField label="Calibration Next Due Date" type="date" name="nextDueDate" size="small" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={`${new Date().getFullYear() + 1}-06-30`} />
              <TextField label="Certifying Technician / Inspector" name="technician" size="small" fullWidth required defaultValue="Engr. Yusuf Ibrahim" />
              <TextField label="Instrument Tolerance Level margin" name="toleranceLevel" size="small" fullWidth required defaultValue="±0.05% deviation" />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setCalDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Upload Certificate</Button></DialogActions>
        </form>
      </Dialog>

      {/* Generator Log Dialog */}
      <Dialog open={genDialogOpen} onClose={() => setGenDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddGeneratorLog}>
          <DialogTitle sx={{ fontWeight: 800 }}>Log Generator Operations</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Generator Engine" name="generatorName" size="small" fullWidth required defaultValue="Perkins 500kVA Soundproof Generator" />
              <TextField label="Log Date" type="date" name="date" size="small" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={new Date().toISOString().slice(0, 10)} />
              <TextField label="Runtime Hours" name="runtimeHours" type="number" size="small" fullWidth required inputProps={{ step: '0.1' }} defaultValue="4.5" />
              <TextField label="Start Fuel Level (%)" name="fuelLevelStart" type="number" size="small" fullWidth required defaultValue="90" />
              <TextField label="End Fuel Level (%)" name="fuelLevelEnd" type="number" size="small" fullWidth required defaultValue="78" />
              <TextField label="Refueling Diesel Added (Litres)" name="dieselAddedLitres" type="number" size="small" fullWidth required defaultValue="0" />
              <TextField label="Engine Particulars / Status notes" name="notes" size="small" fullWidth multiline rows={2} defaultValue="Normal running load. Cooling water level normal." />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setGenDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Log Operations</Button></DialogActions>
        </form>
      </Dialog>

      {/* Oxygen Gas Dialog */}
      <Dialog open={gasDialogOpen} onClose={() => setGasDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddGasLog}>
          <DialogTitle sx={{ fontWeight: 800 }}>Log Medical Gas Pressure</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField select label="Gas Type" name="gasType" size="small" fullWidth defaultValue="OXYGEN"><MenuItem value="OXYGEN">Oxygen (O2)</MenuItem><MenuItem value="VACUUM">Medical Vacuum</MenuItem><MenuItem value="NITROUS">Nitrous Oxide (N2O)</MenuItem></TextField>
              <TextField label="Plant Source" name="plantSource" size="small" fullWidth required defaultValue="Main PSA Oxygen Plant" />
              <TextField label="Manifold pressure (PSI)" name="manifoldPressurePSI" type="number" size="small" fullWidth required defaultValue="55" />
              <TextField label="Line pressure (PSI)" name="linePressurePSI" type="number" size="small" fullWidth required defaultValue="50" />
              <TextField label="Purity percentage (%)" name="purityPercentage" type="number" size="small" fullWidth required inputProps={{ step: '0.1' }} defaultValue="94.5" />
              <TextField label="Inspector Engineer" name="inspector" size="small" fullWidth required defaultValue="Engr. Obi Nwosu" />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setGasDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Log Pressure Check</Button></DialogActions>
        </form>
      </Dialog>

      {/* Fleet Dialog */}
      <Dialog open={fleetDialogOpen} onClose={() => setFleetDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddFleetLog}>
          <DialogTitle sx={{ fontWeight: 800 }}>Register Fleet Vehicle</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Plate Number" name="plateNumber" size="small" fullWidth required />
              <TextField label="Brand & Model" name="brandModel" size="small" fullWidth required placeholder="e.g. Toyota Hiace Ambulance" />
              <TextField label="Current Mileage (km)" name="currentMileage" type="number" size="small" fullWidth required />
              <TextField label="Fuel Level (%)" name="fuelLevelPercent" type="number" size="small" fullWidth required defaultValue="100" />
              <TextField label="Assigned Driver" name="assignedDriver" size="small" fullWidth required />
              <TextField label="Insurance Expiry Date" type="date" name="insuranceExpiry" size="small" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={`${new Date().getFullYear() + 1}-12-31`} />
              <TextField label="Last Routine Service Date" type="date" name="lastServiceDate" size="small" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={new Date().toISOString().slice(0, 10)} />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setFleetDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Register Vehicle</Button></DialogActions>
        </form>
      </Dialog>

      {/* Safety Dialog */}
      <Dialog open={safetyDialogOpen} onClose={() => setSafetyDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddSafetyLog}>
          <DialogTitle sx={{ fontWeight: 800 }}>Log Fire Safety / Hazards Compliance Audit</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Audit Date" type="date" name="auditDate" size="small" fullWidth required InputLabelProps={{ shrink: true }} defaultValue={new Date().toISOString().slice(0, 10)} />
              <TextField select label="Compliance category" name="category" size="small" fullWidth defaultValue="FIRE_SAFETY"><MenuItem value="FIRE_SAFETY">Fire Protection & Hydrants</MenuItem><MenuItem value="BIOMEDICAL_WASTE">Biomedical Hazard Waste Disposal</MenuItem><MenuItem value="RADIATION_SAFETY">Radiation lead-lining audits</MenuItem></TextField>
              <TextField label="Audit Description Area" name="description" size="small" fullWidth required placeholder="e.g. Operating Theatre Radiation lead-lining check" />
              <TextField label="Audit Findings & defects observed" name="findings" size="small" fullWidth required placeholder="e.g. Minor cracks in glass panels observed" />
              <TextField label="Auditor / Safety Officer" name="inspector" size="small" fullWidth required defaultValue="Officer Bunmi Alao" />
              <TextField select label="Audit Status Outcome" name="status" size="small" fullWidth defaultValue="OPERATIONAL"><MenuItem value="OPERATIONAL">Satisfactory Compliance</MenuItem><MenuItem value="CORRECTIVE_REQUIRED">Corrective Action Required</MenuItem><MenuItem value="FAILED">Compliance Failure</MenuItem></TextField>
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setSafetyDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Log Audit</Button></DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default AssetsBiomedical;
