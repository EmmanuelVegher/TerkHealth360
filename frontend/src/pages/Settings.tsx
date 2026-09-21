import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import {
  Card, CardContent, Grid, Typography, TextField, Button, Box, Divider,
  Alert, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, MenuItem, Select, FormControl, InputLabel, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress, Tooltip, Paper, Avatar,
} from '@mui/material';
import { Settings as SettingsIcon, Shield, Storage, People, Add, Delete, AccountBalance, Badge as BadgeIcon, Visibility, MedicalServices, Edit, Bed, LocalHospital, SwapHoriz, PersonPin, Psychology, MemoryOutlined, SmartToy, Circle, Biotech, Download, CheckCircle, DeleteOutline, Refresh, CalendarMonth, ArrowForward } from '@mui/icons-material';
import { NairaCircleIcon } from '../components/NairaIcon';
import { useSnackbar } from 'notistack';
import SystemHealthPanel from '../components/SystemHealthPanel';
import { api } from '../services/api';
import { WorkflowBuilder } from '../components/WorkflowBuilder';
import { ModuleConfig } from '../components/ModuleConfig';
import { PrintTemplateConfig } from '../components/PrintTemplateConfig';

const Settings = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  // Registration Categories & Tariff Configuration
  const defaultCategories = [
    { code: 'INDIVIDUAL', name: 'Individual Account', fee: 1500 },
    { code: 'FAMILY', name: 'Family Package', fee: 3000 },
    { code: 'EMERGENCY', name: 'Emergency Triage', fee: 0 },
    { code: 'WALKIN', name: 'Walk-In Patient', fee: 1000 },
    { code: 'CORPORATE', name: 'Corporate Link', fee: 2500 },
    { code: 'INSURANCE', name: 'Insurance Managed', fee: 2000 },
    { code: 'LABOUR_DELIVERY', name: 'Labour & Delivery Fee', fee: 5000 }
  ];

  const [categories, setCategories] = useState<any[]>(() => {
    const saved = localStorage.getItem('registration_categories');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.some((c: any) => c.code === 'LABOUR_DELIVERY')) {
        const updated = [...parsed, { code: 'LABOUR_DELIVERY', name: 'Labour & Delivery Fee', fee: 5000 }];
        localStorage.setItem('registration_categories', JSON.stringify(updated));
        return updated;
      }
      return parsed;
    }
    localStorage.setItem('registration_categories', JSON.stringify(defaultCategories));
    return defaultCategories;
  });

  const [newCatCode, setNewCatCode] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatFee, setNewCatFee] = useState('');
  const [openAddCat, setOpenAddCat] = useState(false);



  // Bank Management State
  const [banks, setBanks] = useState<any[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [openAddBank, setOpenAddBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankCode, setNewBankCode] = useState('');
  const [newBankType, setNewBankType] = useState('COMMERCIAL');

  // ── Consultation Service Tariff ──────────────────────────────────────────
  const [consultServices, setConsultServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [openAddService, setOpenAddService] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [svcForm, setSvcForm] = useState({ code: '', name: '', category: 'GENERAL', price: '', description: '', duration: '20', requiresDoctor: true });

  const fetchConsultServices = async () => {
    setLoadingServices(true);
    try {
      const res = await api.get('/workflow/consultation-services');
      setConsultServices(res.data?.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingServices(false); }
  };

  const handleSaveService = async () => {
    if (!svcForm.code || !svcForm.name || !svcForm.price) {
      enqueueSnackbar('Code, Name and Price are required', { variant: 'warning' }); return;
    }
    try {
      const payload = { ...svcForm, price: parseFloat(svcForm.price), duration: parseInt(svcForm.duration) || 20 };
      if (editingService) {
        await api.put(`/workflow/consultation-services/${editingService.id}`, payload);
        enqueueSnackbar('Service updated', { variant: 'success' });
      } else {
        await api.post('/workflow/consultation-services', payload);
        enqueueSnackbar('Service added', { variant: 'success' });
      }
      setOpenAddService(false);
      setEditingService(null);
      setSvcForm({ code: '', name: '', category: 'GENERAL', price: '', description: '', duration: '20', requiresDoctor: true });
      fetchConsultServices();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save service', { variant: 'error' });
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Deactivate this service?')) return;
    try {
      await api.delete(`/workflow/consultation-services/${id}`);
      enqueueSnackbar('Service deactivated', { variant: 'info' });
      fetchConsultServices();
    } catch (err: any) {
      enqueueSnackbar('Failed to deactivate', { variant: 'error' });
    }
  };

  const fetchBanks = async () => {
    setBankLoading(true);
    try {
      const res = await api.get('/system/banks');
      if (res.data?.ok) { setBanks(res.data.data); }
    } catch (err) { console.error('Failed to load banks:', err); }
    finally { setBankLoading(false); }
  };

  // ── Nurse Shift Configuration State ─────────────────────────────────────
  const [nurseShifts, setNurseShifts] = useState<any[]>([]);
  const [openAddShift, setOpenAddShift] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    code: '',
    name: '',
    startTime: '08:00',
    endTime: '16:00',
    description: '',
    color: '#2563eb',
  });

  const fetchNurseShifts = async () => {
    try {
      const res = await api.get('/ward-roster/shifts');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setNurseShifts(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching nurse shifts:', err);
    }
  };

  const handleSaveNurseShifts = async (updatedShifts: any[]) => {
    try {
      await api.post('/ward-roster/shifts', { shifts: updatedShifts });
      setNurseShifts(updatedShifts);
      enqueueSnackbar('Nurse shift configurations saved successfully!', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save shift config', { variant: 'error' });
    }
  };

  const handleAddShift = () => {
    if (!shiftForm.code || !shiftForm.name || !shiftForm.startTime || !shiftForm.endTime) {
      enqueueSnackbar('Code, Name, Start and End times are required', { variant: 'warning' });
      return;
    }
    const code = shiftForm.code.toUpperCase().replace(/\s+/g, '_');
    const label = `${shiftForm.name} (${shiftForm.startTime}–${shiftForm.endTime})`;
    const newShift = { ...shiftForm, code, label };
    const updated = [...nurseShifts, newShift];
    handleSaveNurseShifts(updated);
    setOpenAddShift(false);
    setShiftForm({ code: '', name: '', startTime: '08:00', endTime: '16:00', description: '', color: '#2563eb' });
  };

  const handleDeleteShift = (code: string) => {
    const updated = nurseShifts.filter(s => s.code !== code);
    handleSaveNurseShifts(updated);
  };

  useEffect(() => {
    fetchBanks();
    fetchConsultServices();
    fetchNurseShifts();
    fetchWards();
  }, []);

  const handleAddBank = async () => {
    if (!newBankName || !newBankType) {
      enqueueSnackbar('Bank name and type are required', { variant: 'warning' });
      return;
    }
    try {
      const res = await api.post('/system/banks', {
        name: newBankName.trim(),
        code: newBankCode.trim() || null,
        type: newBankType,
      });
      if (res.data?.ok) {
        enqueueSnackbar('Bank added successfully', { variant: 'success' });
        setOpenAddBank(false);
        setNewBankName('');
        setNewBankCode('');
        fetchBanks();
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to add bank', { variant: 'error' });
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bank?')) return;
    try {
      const res = await api.delete(`/system/banks/${id}`);
      if (res.data?.ok) {
        enqueueSnackbar('Bank deleted successfully', { variant: 'info' });
        fetchBanks();
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete bank', { variant: 'error' });
    }
  };

  const handleAddCategory = () => {
    if (!newCatCode || !newCatName || newCatFee === '') {
      enqueueSnackbar('All fields are required', { variant: 'warning' });
      return;
    }
    const cleanCode = newCatCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
    if (cleanCode.length === 0) {
      enqueueSnackbar('Enter a valid category code (Alphanumeric)', { variant: 'warning' });
      return;
    }
    if (categories.some(c => c.code === cleanCode)) {
      enqueueSnackbar('A category with this code already exists', { variant: 'error' });
      return;
    }
    const updated = [
      ...categories,
      { code: cleanCode, name: newCatName.trim(), fee: parseFloat(newCatFee) || 0 }
    ];
    setCategories(updated);
    localStorage.setItem('registration_categories', JSON.stringify(updated));
    enqueueSnackbar('Registration category added', { variant: 'success' });
    setOpenAddCat(false);
    setNewCatCode('');
    setNewCatName('');
    setNewCatFee('');
  };

  const handleDeleteCategory = (code: string) => {
    if (categories.length <= 1) {
      enqueueSnackbar('At least one category is required', { variant: 'error' });
      return;
    }
    const updated = categories.filter(c => c.code !== code);
    setCategories(updated);
    localStorage.setItem('registration_categories', JSON.stringify(updated));
    enqueueSnackbar('Registration category deleted', { variant: 'info' });
  };

  const handleUpdateFee = (code: string, feeStr: string) => {
    const newFee = parseFloat(feeStr) || 0;
    const updated = categories.map(c => c.code === code ? { ...c, fee: newFee } : c);
    setCategories(updated);
    localStorage.setItem('registration_categories', JSON.stringify(updated));
  };

  // ── Staff ID Format ─────────────────────────────────────────────────────
  const defaultStaffIdFormat = { prefix: 'FF', separator: '-', digits: 4, startFrom: 1 };
  const [staffIdFormat, setStaffIdFormat] = useState(() => {
    const saved = localStorage.getItem('staff_id_format');
    return saved ? JSON.parse(saved) : defaultStaffIdFormat;
  });
  const [savingFormat, setSavingFormat] = useState(false);

  const staffIdPreview = `${staffIdFormat.prefix}${staffIdFormat.separator}${String(staffIdFormat.startFrom).padStart(staffIdFormat.digits, '0')}`;

  const handleSaveStaffIdFormat = async () => {
    setSavingFormat(true);
    try {
      localStorage.setItem('staff_id_format', JSON.stringify(staffIdFormat));
      // Also push to backend so next-id endpoint uses the same format
      await api.put('/system/settings', { key: 'staffIdFormat', value: staffIdFormat });
      enqueueSnackbar('Staff ID format saved successfully', { variant: 'success' });
    } catch {
      // Saved to localStorage at least
      enqueueSnackbar('Staff ID format saved locally', { variant: 'info' });
    } finally {
      setSavingFormat(false);
    }
  };

  // State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    localStorage.getItem('2fa_enabled') === 'true'
  );
  const [open2FA, setOpen2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [is2FARegistered, setIs2FARegistered] = useState(
    localStorage.getItem('2fa_registered') === 'true'
  );
  const [maskCredentials, setMaskCredentials] = useState(true);

  // Hospital General Info State
  const [hospitalInfo, setHospitalInfo] = useState({
    name: 'Faith Foundation Mission Hospital, Nsukka',
    email: 'admin@hospital.com',
    address: 'No. 20 Ogurugu Road Nsukka, Enugu State, Nigeria',
    phone: '',
    website: '',
    openmrsUrl: '',
    openmrsUsername: '',
    openmrsPassword: '',
  });
  const [savingHospital, setSavingHospital] = useState(false);

  // Load hospital info from backend on mount
  useEffect(() => {
    api.get('/config/modules').then(res => {
      if (res.data?.success) {
        const configs = res.data.data;
        const get = (key: string) => configs.find((c: any) => c.moduleKey === key)?.description;
        setHospitalInfo(prev => ({
          ...prev,
          name:            get('HOSPITAL_NAME')        || prev.name,
          email:           get('HOSPITAL_EMAIL')       || prev.email,
          address:         get('HOSPITAL_ADDRESS')     || prev.address,
          phone:           get('HOSPITAL_PHONE')       || prev.phone,
          website:         get('HOSPITAL_WEBSITE')     || prev.website,
          openmrsUrl:      get('OPENMRS_BASE_URL')     || prev.openmrsUrl,
          openmrsUsername: get('OPENMRS_USERNAME')     || prev.openmrsUsername,
          openmrsPassword: get('OPENMRS_PASSWORD')     || prev.openmrsPassword,
        }));
      }
    }).catch(console.error);
  }, []);

  const saveHospitalInfo = async () => {
    setSavingHospital(true);
    try {
      await Promise.all([
        api.put('/config/modules/HOSPITAL_NAME',    { description: hospitalInfo.name,    isActive: true }),
        api.put('/config/modules/HOSPITAL_EMAIL',   { description: hospitalInfo.email,   isActive: true }),
        api.put('/config/modules/HOSPITAL_ADDRESS', { description: hospitalInfo.address, isActive: true }),
        api.put('/config/modules/HOSPITAL_PHONE',   { description: hospitalInfo.phone,   isActive: true }),
        api.put('/config/modules/HOSPITAL_WEBSITE', { description: hospitalInfo.website, isActive: true }),
        api.put('/config/modules/OPENMRS_BASE_URL', { description: hospitalInfo.openmrsUrl, isActive: true }),
        api.put('/config/modules/OPENMRS_USERNAME', { description: hospitalInfo.openmrsUsername, isActive: true }),
        api.put('/config/modules/OPENMRS_PASSWORD', { description: hospitalInfo.openmrsPassword, isActive: true }),
      ]);
      enqueueSnackbar('Hospital settings saved successfully!', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to save hospital settings', { variant: 'error' });
    } finally {
      setSavingHospital(false);
    }
  };
  // Raw vs Masked configs
  const configs = {
    dbUrl: 'mysql://admin_db_user:Secr3tP@ssw0rd99!@localhost:3306/smart_hospital',
    jwtSecret: 'super_secret_jwt_sign_key_smart_hms_2026_production',
    agoraAppId: 'agora_app_id_9011_live_token_77a4a9c8d',
    smtpPass: 'smtp_auth_pass_word_xyz_smtp_server_123',
  };
  const handle2FAToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      setOpen2FA(true);
    } else {
      setTwoFactorEnabled(false);
      setIs2FARegistered(false);
      localStorage.setItem('2fa_enabled', 'false');
      localStorage.setItem('2fa_registered', 'false');
      enqueueSnackbar('Two-Factor Authentication disabled', { variant: 'info' });
    }
  };
  const handleVerify2FA = () => {
    if (verificationCode.trim().length === 6) {
      setTwoFactorEnabled(true);
      setIs2FARegistered(true);
      localStorage.setItem('2fa_enabled', 'true');
      localStorage.setItem('2fa_registered', 'true');
      enqueueSnackbar('Two-Factor Authentication configured successfully!', { variant: 'success' });
      setOpen2FA(false);
      setVerificationCode('');
    } else {
      enqueueSnackbar('Please enter a valid 6-digit verification code', { variant: 'error' });
    }
  };
  const maskValue = (val: string, show: boolean) => {
    if (show) return val;
    const urlParts = val.split('@');
    if (urlParts.length > 1) {
      return `${urlParts[0].substring(0, 15)}:******@${urlParts[1]}`;
    }
    return val.substring(0, 6) + '**********************';
  };

  // ── Ward Management State ───────────────────────────────────────────────
  const WARD_CATEGORIES = ['EMERGENCY', 'MEDICAL', 'SURGICAL', 'PRIVATE', 'ICU', 'MATERNITY', 'PAEDIATRIC', 'GENERAL'];
  const WARD_GENDERS = ['MALE', 'FEMALE', 'MIXED'];
  const WARD_COLORS_MAP: Record<string, string> = {
    EMERGENCY: '#f03e3e', MEDICAL: '#3b5bdb', SURGICAL: '#0ca678',
    PRIVATE: '#6741d9', ICU: '#e67700', MATERNITY: '#c2255c',
    PAEDIATRIC: '#f59f00', GENERAL: '#495057',
  };

  const [wards, setWards] = useState<any[]>([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [openAddWard, setOpenAddWard] = useState(false);
  const [wardSettingsOpen, setWardSettingsOpen] = useState(false);
  const [addWardModalOpen, setAddWardModalOpen] = useState(false);
  const [editWardModalOpen, setEditWardModalOpen] = useState(false);
  const [selectedWard, setSelectedWard] = useState<any>(null);
  const [editingWard, setEditingWard] = useState<any>(null);
  const [wardForm, setWardForm] = useState({
    name: '', wardCategory: 'GENERAL', gender: 'MIXED', capacity: '10', description: '', color: '',
  });

  const handleCreateWard = async () => {
    if (!wardForm.name) {
      enqueueSnackbar('Ward Name is required', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/wards', { ...wardForm, capacity: Number(wardForm.capacity) || 10 });
      enqueueSnackbar('New hospital ward created successfully', { variant: 'success' });
      setAddWardModalOpen(false);
      setWardForm({ name: '', wardCategory: 'GENERAL', gender: 'MIXED', capacity: '10', description: '', color: '#3f51b5' });
      fetchWards();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create ward', { variant: 'error' });
    }
  };

  const handleOpenEditWard = (ward: any) => {
    setSelectedWard(ward);
    setWardForm({
      name: ward.name || '',
      wardCategory: ward.wardCategory || ward.type || 'GENERAL',
      gender: ward.gender || 'MIXED',
      capacity: String(ward.capacity || 10),
      description: ward.description || '',
      color: ward.color || '#3f51b5'
    });
    setEditWardModalOpen(true);
  };

  const handleUpdateWard = async () => {
    if (!selectedWard || !wardForm.name) return;
    try {
      await api.put(`/wards/${selectedWard.id}`, { ...wardForm, capacity: Number(wardForm.capacity) || 10 });
      enqueueSnackbar('Ward updated successfully', { variant: 'success' });
      setEditWardModalOpen(false);
      setSelectedWard(null);
      fetchWards();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update ward', { variant: 'error' });
    }
  };

  const handleDeleteWard = async (wardId: string, wardName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${wardName}"?`)) return;
    try {
      await api.delete(`/wards/${wardId}`);
      enqueueSnackbar(`Ward "${wardName}" deleted`, { variant: 'info' });
      fetchWards();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete ward', { variant: 'error' });
    }
  };

  const fetchWards = async () => {
    setWardsLoading(true);
    try {
      const res = await api.get('/wards');
      setWards(res.data);
    } catch (err) { console.error(err); }
    finally { setWardsLoading(false); }
  };


  const handleSaveWard = async () => {
    if (!wardForm.name || !wardForm.wardCategory) {
      enqueueSnackbar('Name and Category are required', { variant: 'warning' }); return;
    }
    try {
      const payload = { ...wardForm, color: wardForm.color || WARD_COLORS_MAP[wardForm.wardCategory] };
      if (editingWard) {
        await api.put(`/wards/${editingWard.id}`, payload);
        enqueueSnackbar('Ward updated', { variant: 'success' });
      } else {
        await api.post('/wards', payload);
        enqueueSnackbar('Ward created — beds auto-generated', { variant: 'success' });
      }
      setOpenAddWard(false);
      setEditingWard(null);
      setWardForm({ name: '', wardCategory: 'MEDICAL', gender: 'MIXED', capacity: '10', description: '', color: '' });
      fetchWards();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save ward', { variant: 'error' });
    }
  };

  const handleDeactivateWard = async (id: string) => {
    if (!window.confirm('Deactivate this ward?')) return;
    try {
      await api.delete(`/wards/${id}`);
      enqueueSnackbar('Ward deactivated', { variant: 'info' });
      fetchWards();
    } catch { enqueueSnackbar('Failed to deactivate ward', { variant: 'error' }); }
  };




  // ── AI Engine Configuration State ───────────────────────────────────────────
  const [aiLlmEnabled, setAiLlmEnabled] = useState(false);
  const [aiOllamaModel, setAiOllamaModel] = useState('medllama2');
  const [ollamaStatus, setOllamaStatus] = useState<'running' | 'offline' | 'checking'>('checking');
  const [ollamaModels, setOllamaModels] = useState<{ name: string; sizeMB: number }[]>([]);
  const [hostPlatform, setHostPlatform] = useState<'win32' | 'darwin' | 'linux' | string>('darwin');
  const [selectedOsTab, setSelectedOsTab] = useState<'auto' | 'win32' | 'darwin' | 'linux'>('auto');
  const [startingService, setStartingService] = useState(false);
  const [savingAiConfig, setSavingAiConfig] = useState(false);
  // Per-model download state: { [modelValue]: { progress: 0-100, status: 'idle'|'pulling'|'done'|'error', statusText: string } }
  const [pullState, setPullState] = useState<Record<string, { progress: number; status: 'idle'|'pulling'|'done'|'error'; statusText: string }>>({});

  const AVAILABLE_MODELS = [
    { value: 'llama3.2-vision', label: 'Llama 3.2 Vision (11B)', desc: 'Medical Vision & OCR · Lab & Chart Parsing · ~7.9 GB', recommended: true },
    { value: 'llava', label: 'LLaVA 7B (Vision & OCR)', desc: 'Medical Image & Document OCR · ~4.5 GB', recommended: false },
    { value: 'qwen2.5:7b', label: 'Qwen 2.5 (7B)', desc: 'Advanced Clinical Reasoning & Parsing · ~4.7 GB', recommended: false },
    { value: 'medllama2', label: 'MedLlama2', desc: 'Medical-tuned · 4-bit · ~3.8 GB', recommended: false },
    { value: 'llama3:8b', label: 'Llama 3 8B', desc: 'General purpose · 4-bit · ~4.7 GB', recommended: false },
    { value: 'mistral:7b', label: 'Mistral 7B', desc: 'Fast inference · 4-bit · ~4.1 GB', recommended: false },
    { value: 'llama2:7b', label: 'Llama 2 7B', desc: 'Balanced · 4-bit · ~3.8 GB', recommended: false },
  ];

  // Load AI config from backend on mount
  useEffect(() => {
    api.get('/openmed/ai-config').then(res => {
      if (res.data?.success) {
        setAiLlmEnabled(res.data.data.llmEnabled ?? false);
        setAiOllamaModel(res.data.data.ollamaModel ?? 'medllama2');
      }
    }).catch(() => {});
  }, []);

  // Poll Ollama status every 10 seconds (silent background refresh, no UI flicker)
  useEffect(() => {
    let isInitial = true;
    const checkOllama = async () => {
      if (isInitial) {
        setOllamaStatus('checking');
        isInitial = false;
      }
      try {
        const res = await api.get('/openmed/ollama-status');
        setOllamaStatus(res.data?.status === 'running' ? 'running' : 'offline');
        setOllamaModels(res.data?.models || []);
        if (res.data?.platform) setHostPlatform(res.data.platform);
      } catch {
        setOllamaStatus('offline');
      }
    };
    checkOllama();
    const interval = setInterval(checkOllama, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStartOllamaService = async () => {
    setStartingService(true);
    try {
      const res = await api.post('/openmed/ollama-start');
      if (res.data?.success) {
        enqueueSnackbar('Ollama service launch command sent successfully! Checking status...', { variant: 'info' });
        setTimeout(async () => {
          try {
            const statusRes = await api.get('/openmed/ollama-status');
            setOllamaStatus(statusRes.data?.status === 'running' ? 'running' : 'offline');
            setOllamaModels(statusRes.data?.models || []);
          } catch {}
        }, 3000);
      } else {
        enqueueSnackbar(res.data.message || 'Could not auto-start Ollama server', { variant: 'warning' });
      }
    } catch {
      enqueueSnackbar('Failed to trigger Ollama service start', { variant: 'error' });
    } finally {
      setStartingService(false);
    }
  };

  const handleSaveAiConfig = async () => {
    setSavingAiConfig(true);
    try {
      await api.put('/openmed/ai-config', { llmEnabled: aiLlmEnabled, ollamaModel: aiOllamaModel, nerEnabled: true });
      enqueueSnackbar('AI Engine settings saved successfully', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to save AI Engine settings', { variant: 'error' });
    } finally {
      setSavingAiConfig(false);
    }
  };

  /** Stream ollama pull progress for a given model */
  const handlePullModel = async (modelValue: string) => {
    setPullState(s => ({ ...s, [modelValue]: { progress: 0, status: 'pulling', statusText: 'Connecting to Ollama...' } }));
    try {
      const token = localStorage.getItem('token') || '';
      const resp = await fetch('/api/openmed/ollama-pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ model: modelValue }),
      });
      if (!resp.ok || !resp.body) throw new Error('Pull failed — is Ollama running?');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: any;
          try {
            evt = JSON.parse(line);
          } catch {
            // Incomplete JSON chunk, skip to next line
            continue;
          }
          if (evt.error) {
            throw new Error(evt.error);
          }
          const total = evt.total || 0;
          const completed = evt.completed || 0;
          const pct = total > 0 ? Math.min(99, Math.round((completed / total) * 100)) : 0;
          setPullState(s => ({
            ...s,
            [modelValue]: { progress: pct, status: 'pulling', statusText: evt.status || 'Downloading...' },
          }));
        }
      }
      setPullState(s => ({ ...s, [modelValue]: { progress: 100, status: 'done', statusText: 'Installed ✓' } }));
      enqueueSnackbar(`Model "${modelValue}" downloaded successfully!`, { variant: 'success' });
      // Refresh installed models list
      const statusRes = await api.get('/openmed/ollama-status');
      setOllamaModels(statusRes.data?.models || []);
    } catch (err: any) {
      setPullState(s => ({ ...s, [modelValue]: { progress: 0, status: 'error', statusText: err.message || 'Download failed' } }));
      enqueueSnackbar(err.message || 'Failed to pull model', { variant: 'error' });
    }
  };

  /** Delete an installed Ollama model */
  const handleDeleteModel = async (modelName: string) => {
    if (!window.confirm(`Delete model "${modelName}"? This frees disk space but you will need to re-download it.`)) return;
    try {
      await api.delete('/openmed/ollama-model', { data: { model: modelName } });
      enqueueSnackbar(`Model "${modelName}" deleted.`, { variant: 'info' });
      const statusRes = await api.get('/openmed/ollama-status');
      setOllamaModels(statusRes.data?.models || []);
      setPullState(s => { const n = { ...s }; delete n[modelName]; return n; });
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to delete model', { variant: 'error' });
    }
  };

  return (
    <div>
      <Typography variant="h5" fontWeight={800} color="primary.main" mb={3}>
        System Settings & Configurations
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <ModuleConfig />
        </Grid>

        <Grid item xs={12}>
          <WorkflowBuilder />
        </Grid>

        <Grid item xs={12} md={6}>
        <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 2 }}>
                <SettingsIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>General Hospital Settings</Typography>
              </Box>
              <Divider sx={{ marginBottom: 2 }} />
              <TextField
                margin="dense" label="Hospital Name" fullWidth
                value={hospitalInfo.name}
                onChange={e => setHospitalInfo(p => ({ ...p, name: e.target.value }))}
              />
              <TextField
                margin="dense" label="Contact Email" fullWidth
                value={hospitalInfo.email}
                onChange={e => setHospitalInfo(p => ({ ...p, email: e.target.value }))}
              />
              <TextField
                margin="dense" label="Phone Number" fullWidth
                value={hospitalInfo.phone}
                onChange={e => setHospitalInfo(p => ({ ...p, phone: e.target.value }))}
              />
              <TextField
                margin="dense" label="Website" fullWidth
                value={hospitalInfo.website}
                onChange={e => setHospitalInfo(p => ({ ...p, website: e.target.value }))}
              />
              <TextField
                margin="dense" label="Address" fullWidth multiline rows={2}
                value={hospitalInfo.address}
                onChange={e => setHospitalInfo(p => ({ ...p, address: e.target.value }))}
              />
              <Divider sx={{ marginY: 2 }} />
              <Typography variant="subtitle2" fontWeight={800} color="primary" mb={1}>
                OpenMRS (NMRS) Server Settings
              </Typography>
              <TextField
                margin="dense" label="OpenMRS Base URL" fullWidth
                placeholder="e.g. http://192.168.1.15:8080/openmrs"
                value={hospitalInfo.openmrsUrl}
                onChange={e => setHospitalInfo(p => ({ ...p, openmrsUrl: e.target.value }))}
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    margin="dense" label="OpenMRS Username" fullWidth
                    value={hospitalInfo.openmrsUsername}
                    onChange={e => setHospitalInfo(p => ({ ...p, openmrsUsername: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    margin="dense" label="OpenMRS Password" type="password" fullWidth
                    value={hospitalInfo.openmrsPassword}
                    onChange={e => setHospitalInfo(p => ({ ...p, openmrsPassword: e.target.value }))}
                  />
                </Grid>
              </Grid>
              <Box sx={{ marginTop: 2 }}>
                <Button
                  variant="contained"
                  onClick={saveHospitalInfo}
                  disabled={savingHospital}
                >
                  {savingHospital ? 'Saving...' : 'Save Settings'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {/* Security & Access Settings */}
        <Grid item xs={12} md={6}>
        <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 2 }}>
                <Shield color="primary" />
                <Typography variant="h6" fontWeight={700}>Security & Authentication</Typography>
              </Box>
              <Divider sx={{ marginBottom: 2 }} />
              <FormControlLabel
                control={<Switch checked={twoFactorEnabled} onChange={handle2FAToggle} />}
                label="Enable Two-Factor Authentication (2FA)"
              />
              <Box sx={{ marginTop: 0.5, marginBottom: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Forces super-admins and doctor roles to configure Google Authenticator / TOTP keys.
                </Typography>
              </Box>
              <FormControlLabel control={<Switch defaultChecked />} label="Automatic Token Rotation" />
              <Box sx={{ marginTop: 1, marginBottom: 2 }}>
                <Typography variant="caption" color="text.secondary">
                Require 2FA registration for admin and doctor roles. Currently {is2FARegistered ? 'Active & Registered' : 'Not Configured'}.
                </Typography>
                {twoFactorEnabled && !is2FARegistered && (
                  <Button size="small" variant="outlined" sx={{ mt: 1, display: 'block' }} onClick={() => setOpen2FA(true)}>
                    Complete 2FA Registration
                  </Button>
                )}
              </Box>
              <FormControlLabel control={<Switch defaultChecked />} label="Automatic Token Rotation" />
              <Box sx={{ marginTop: 0.5, marginBottom: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Access and refresh tokens rotate on every request to prevent replay attacks.
                </Typography>
              </Box>
              <TextField margin="dense" label="JWT Access Expiration" fullWidth defaultValue="15m" disabled />
              <TextField margin="dense" label="JWT Refresh Expiration" fullWidth defaultValue="7d" disabled />
            </CardContent>
          </Card>
        </Grid>
        {/* Database & Credentials Configuration */}
        <Grid item xs={12} md={6}>
        <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
            <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Storage color="primary" />
                  <Typography variant="h6" fontWeight={700}>Exposed Credentials & DB</Typography>
                </Box>
                <FormControlLabel
                  control={<Switch checked={maskCredentials} onChange={(e) => setMaskCredentials(e.target.checked)} />}
                  label="Mask Credentials"
                />
              </Box>
              <Divider sx={{ marginBottom: 2 }} />
              <Alert severity="warning" sx={{ marginBottom: 2 }}>
                Interoperability API credentials and system keys are listed below. Ensure they are masked in public displays.
              </Alert>
              <TextField
                margin="dense"
                label="Database Connection URL"
                fullWidth
                value={maskValue(configs.dbUrl, !maskCredentials)}
                disabled
              />
              <TextField
                margin="dense"
                label="JWT Signature Secret"
                fullWidth
                value={maskValue(configs.jwtSecret, !maskCredentials)}
                disabled
              />
              <TextField
                margin="dense"
                label="Agora App ID"
                fullWidth
                value={maskValue(configs.agoraAppId, !maskCredentials)}
                disabled
              />
              <TextField
                margin="dense"
                label="SMTP Mailer Password"
                fullWidth
                value={maskValue(configs.smtpPass, !maskCredentials)}
                disabled
              />
            </CardContent>
          </Card>
        </Grid>
        {/* Roles Configuration */}
        <Grid item xs={12} md={6}>
        <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 2 }}>
                <People color="primary" />
                <Typography variant="h6" fontWeight={700}>Role Matrix Directory</Typography>
              </Box>
              <Divider sx={{ marginBottom: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {['SUPER_ADMIN', 'DOCTOR', 'PHARMACIST', 'RECEPTIONIST', 'ACCOUNTANT', 'PATIENT'].map((role) => (
                  <Box key={role} sx={{ display: 'flex', justifyContent: 'space-between', padding: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{role}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {role === 'SUPER_ADMIN' ? 'Full root access' : role === 'DOCTOR' ? 'Clinical encounters & diagnostics' : role === 'PHARMACIST' ? 'Stock logs & dispensing' : 'Scoped client interface'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Staff ID Format Configuration */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', background: 'linear-gradient(135deg, rgba(59,91,219,0.04) 0%, rgba(103,65,217,0.04) 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <BadgeIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>Staff ID Format</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Prefix"
                      size="small"
                      fullWidth
                      value={staffIdFormat.prefix}
                      onChange={e => setStaffIdFormat((p: any) => ({ ...p, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'') }))}
                      helperText="e.g. FF, EMP, STF"
                      inputProps={{ maxLength: 6 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      select
                      label="Separator"
                      size="small"
                      fullWidth
                      value={staffIdFormat.separator}
                      onChange={e => setStaffIdFormat((p: any) => ({ ...p, separator: e.target.value }))}
                    >
                      <MenuItem value="-">Hyphen  (FF-0001)</MenuItem>
                      <MenuItem value="/">Slash   (FF/0001)</MenuItem>
                      <MenuItem value="_">Underscore (FF_0001)</MenuItem>
                      <MenuItem value="">None    (FF0001)</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Number of Digits"
                      size="small"
                      type="number"
                      fullWidth
                      value={staffIdFormat.digits}
                      onChange={e => setStaffIdFormat((p: any) => ({ ...p, digits: Math.max(1, Math.min(8, parseInt(e.target.value)||4)) }))}
                      helperText="e.g. 4 → 0001"
                      inputProps={{ min: 1, max: 8 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Start From"
                      size="small"
                      type="number"
                      fullWidth
                      value={staffIdFormat.startFrom}
                      onChange={e => setStaffIdFormat((p: any) => ({ ...p, startFrom: Math.max(1, parseInt(e.target.value)||1) }))}
                      helperText="First staff number"
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                </Grid>
                {/* Live Preview */}
                <Box sx={{
                  p: 2, borderRadius: 2, textAlign: 'center',
                  background: 'linear-gradient(135deg, #3b5bdb 0%, #6741d9 100%)',
                  color: '#fff',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
                    <Visibility sx={{ fontSize: 16 }} />
                    <Typography variant="caption" sx={{ opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1 }}>Preview</Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                    {staffIdPreview}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.75 }}>→ next staff will get this ID</Typography>
                </Box>
                <Button
                  variant="contained"
                  onClick={handleSaveStaffIdFormat}
                  disabled={savingFormat || !staffIdFormat.prefix}
                  fullWidth
                >
                  {savingFormat ? 'Saving…' : 'Save Staff ID Format'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Service Charges & Tariffs Router Card */}
        <Grid item xs={12}>
          <Card sx={{
            border: 'none',
            borderRadius: 3,
            background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
            color: '#ffffff',
            boxShadow: '0 8px 32px rgba(26, 35, 126, 0.25)',
            p: 1
          }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 52, height: 52 }}>
                  <NairaCircleIcon sx={{ color: '#fff', fontSize: 30 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#fff' }}>
                    Service Charges, Registration Fees & Tariffs
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', maxWidth: 650 }}>
                    All hospital service charges, patient registration fees, consultation tariffs, and price schedules are consolidated under the <strong>Charge Master & Service Catalogue</strong> page.
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                onClick={() => navigate('/billing/charge-master')}
                endIcon={<ArrowForward />}
                sx={{
                  bgcolor: '#ffffff',
                  color: '#1a237e',
                  fontWeight: 800,
                  px: 3,
                  py: 1.2,
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                }}
              >
                Go to Charge Master & Catalogue
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Nigerian Banks Configuration */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountBalance color="primary" />
                  <Typography variant="h6" fontWeight={700}>Nigerian Banks Registry</Typography>
                </Box>
                <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setOpenAddBank(true)}>
                  Add Bank
                </Button>
              </Box>
              <Divider sx={{ marginBottom: 2 }} />
              
              <Box sx={{ 
                maxHeight: 280, 
                overflowY: 'auto',
                pr: 0.5,
                '&::-webkit-scrollbar': { width: 5 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 }
              }}>
                <List disablePadding>
                  {banks.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>No banks registered.</Typography>
                  ) : (
                    banks.map((b) => (
                      <ListItem 
                        key={b.id}
                        sx={{ 
                          py: 1, 
                          px: 1.5, 
                          mb: 1, 
                          bgcolor: 'action.hover', 
                          borderRadius: 2,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <ListItemText 
                          primary={<Typography variant="body2" fontWeight={700}>{b.name}</Typography>}
                          secondary={
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                              <Chip label={b.type} size="small" variant="outlined" sx={{ fontSize: 9, height: 16 }} />
                              {b.code && <Chip label={`Code: ${b.code}`} size="small" sx={{ fontSize: 9, height: 16 }} />}
                            </Stack>
                          }
                        />
                        <ListItemSecondaryAction sx={{ right: 8 }}>
                          <IconButton size="small" color="error" onClick={() => handleDeleteBank(b.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))
                  )}
                </List>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Consultation Service Tariff moved to /billing/charge-master */}
        
        {/* Module Configuration (Dynamic On/Off) */}
        {/* <Grid item xs={12}>
          <ModuleConfig />
        </Grid> */}

        {/* Print Templates Configuration */}
        <Grid item xs={12}>
          <PrintTemplateConfig />
        </Grid>

        {/* System Health Panel */}
        <Grid item xs={12}>
          <SystemHealthPanel />
        </Grid>
      </Grid>

       {/* Dialog: Setup 2FA */}
       <Dialog open={open2FA} onClose={() => setOpen2FA(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Setup Two-Factor Authentication (TOTP)</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1, alignItems: 'center', textAlign: 'center' }}>
            <Typography variant="body2">
              Scan the QR code below in your Authenticator app (Google Authenticator, Authy, etc.) to link your account.
            </Typography>
            {/* Mock QR Code representation */}
            <Box
              sx={{
                width: 180, height: 180,
                border: '2px solid rgba(0,0,0,0.1)',
                borderRadius: 2,
                p: 1.5,
                bgcolor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {/* Visual simulated QR Grid using Canvas/CSS */}
              <Box
                sx={{
                  width: 140, height: 140,
                  backgroundImage: 'radial-gradient(circle, #000 25%, transparent 26%), radial-gradient(circle, #000 25%, transparent 26%)',
                  backgroundSize: '10px 10px',
                  backgroundPosition: '0 0, 5px 5px',
                  position: 'relative',
                  border: '1px solid #ddd',
                }}
              >
                {/* QR Finder patterns in corners */}
                <Box sx={{ position: 'absolute', top: 4, left: 4, width: 30, height: 30, border: '6px solid #000', bgcolor: '#fff' }} />
                <Box sx={{ position: 'absolute', top: 4, right: 4, width: 30, height: 30, border: '6px solid #000', bgcolor: '#fff' }} />
                <Box sx={{ position: 'absolute', bottom: 4, left: 4, width: 30, height: 30, border: '6px solid #000', bgcolor: '#fff' }} />
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Or enter the manual secret key:</Typography>
              <Typography variant="body1" fontWeight={700} sx={{ letterSpacing: '0.1em', mt: 0.5, bgcolor: 'action.hover', px: 2, py: 0.5, borderRadius: 1 }}>
                JBSW Y3DP EHPK 3PXP
              </Typography>
            </Box>
            <TextField
              label="Enter 6-Digit Code"
              variant="outlined"
              fullWidth
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
              inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.25em', fontWeight: 'bold' } }}
              placeholder="000000"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen2FA(false)}>Cancel</Button>
          <Button onClick={handleVerify2FA} variant="contained">Verify & Activate</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Add Category */}
      <Dialog open={openAddCat} onClose={() => setOpenAddCat(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Registration Category</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Category Name"
              placeholder="e.g. Special VIP Account"
              fullWidth
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
            <TextField
              label="Unique Code (Alphanumeric)"
              placeholder="e.g. VIP_SPECIAL"
              fullWidth
              value={newCatCode}
              onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
              helperText="Only letters, numbers and underscores."
            />
            <TextField
              label="Registration Fee (₦)"
              type="number"
              placeholder="e.g. 5000"
              fullWidth
              value={newCatFee}
              onChange={(e) => setNewCatFee(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddCat(false)}>Cancel</Button>
          <Button onClick={handleAddCategory} variant="contained">Add Category</Button>
        </DialogActions>
      </Dialog>


      {/* Dialog: Add Bank */}
      <Dialog open={openAddBank} onClose={() => setOpenAddBank(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Nigerian Bank</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Bank Name"
              placeholder="e.g. United Bank for Africa (UBA)"
              fullWidth
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
            />
            <TextField
              label="CBN Bank Code (Optional)"
              placeholder="e.g. 033"
              fullWidth
              value={newBankCode}
              onChange={(e) => setNewBankCode(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel>Bank Type</InputLabel>
              <Select
                value={newBankType}
                onChange={(e) => setNewBankType(e.target.value)}
                label="Bank Type"
              >
                <MenuItem value="COMMERCIAL">Commercial Bank</MenuItem>
                <MenuItem value="MICROFINANCE">Microfinance Bank</MenuItem>
                <MenuItem value="MORTGAGE">Mortgage Bank</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddBank(false)}>Cancel</Button>
          <Button onClick={handleAddBank} variant="contained">Add Bank</Button>
        </DialogActions>
      </Dialog>
      {/* Dialog: Add/Edit Consultation Service */}
      <Dialog open={openAddService} onClose={() => setOpenAddService(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingService ? 'Edit Consultation Service' : 'Add Consultation Service Type'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label="Service Code" placeholder="e.g. OPD-CARDIOLOGIST" fullWidth value={svcForm.code} onChange={e => setSvcForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '-') }))} disabled={!!editingService} helperText="Unique identifier" />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select value={svcForm.category} label="Category" onChange={e => setSvcForm(f => ({ ...f, category: e.target.value }))}>
                    {['GENERAL', 'SPECIALIST', 'PROCEDURE', 'DIAGNOSTIC', 'ANC', 'EMERGENCY'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField label="Service Name" placeholder="e.g. Cardiologist Consultation" fullWidth value={svcForm.name} onChange={e => setSvcForm(f => ({ ...f, name: e.target.value }))} />
            <TextField label="Description" multiline rows={2} fullWidth value={svcForm.description} onChange={e => setSvcForm(f => ({ ...f, description: e.target.value }))} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label="Price (₦)" type="number" fullWidth value={svcForm.price} onChange={e => setSvcForm(f => ({ ...f, price: e.target.value }))} inputProps={{ min: 0 }} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Duration (minutes)" type="number" fullWidth value={svcForm.duration} onChange={e => setSvcForm(f => ({ ...f, duration: e.target.value }))} inputProps={{ min: 5 }} />
              </Grid>
            </Grid>
            <FormControlLabel
              control={<Switch checked={svcForm.requiresDoctor} onChange={e => setSvcForm(f => ({ ...f, requiresDoctor: e.target.checked }))} />}
              label="Requires Doctor Assignment"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddService(false)}>Cancel</Button>
          <Button onClick={handleSaveService} variant="contained">{editingService ? 'Update Service' : 'Add Service'}</Button>
        </DialogActions>
      </Dialog>

      {/* 
      // ════════════════════════════════════════════════════════════
      //     WARD MANAGEMENT SECTION
      // ════════════════════════════════════════════════════════════
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Bed sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={800}>Ward Management</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingWard(null); setWardForm({ name: '', wardCategory: 'MEDICAL', gender: 'MIXED', capacity: '10', description: '', color: '' }); setOpenAddWard(true); }}>
                  Add Ward
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Create and manage wards. Beds are auto-generated based on capacity. Changes are reflected immediately on the IPD dashboard.
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ward Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Gender</TableCell>
                      <TableCell>Capacity</TableCell>
                      <TableCell>Occupied</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {wardsLoading ? (
                      <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary">Loading…</Typography></TableCell></TableRow>
                    ) : wards.length === 0 ? (
                      <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" py={2}>No wards configured yet. Add your first ward above.</Typography></TableCell></TableRow>
                    ) : wards.map(w => {
                      const color = w.color || WARD_COLORS_MAP[w.wardCategory] || '#495057';
                      return (
                        <TableRow key={w.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                              <Typography variant="body2" fontWeight={700}>{w.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell><Chip label={w.wardCategory} size="small" sx={{ bgcolor: `${color}22`, color, fontWeight: 700, fontSize: '0.7rem' }} /></TableCell>
                          <TableCell><Chip label={w.gender || 'N/A'} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} /></TableCell>
                          <TableCell>{w.capacity} beds</TableCell>
                          <TableCell>
                            <Typography variant="body2" color={w.occupiedBeds >= w.capacity ? 'error.main' : 'success.main'} fontWeight={600}>
                              {w.occupiedBeds}/{w.totalBeds}
                            </Typography>
                          </TableCell>
                          <TableCell><Chip label={w.isActive ? 'Active' : 'Inactive'} color={w.isActive ? 'success' : 'default'} size="small" /></TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => { setEditingWard(w); setWardForm({ name: w.name, wardCategory: w.wardCategory, gender: w.gender || 'MIXED', capacity: String(w.capacity), description: w.description || '', color: w.color || '' }); setOpenAddWard(true); }}>
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeactivateWard(w.id)}>
                              <Delete fontSize="small" />
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
        </Grid>
      </Grid>

      <Dialog open={openAddWard} onClose={() => setOpenAddWard(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingWard ? 'Edit Ward' : 'Add New Ward'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Ward Name *" fullWidth placeholder="e.g. Medical Ward A" value={wardForm.name} onChange={e => setWardForm(f => ({ ...f, name: e.target.value }))} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Ward Category *</InputLabel>
                  <Select value={wardForm.wardCategory} label="Ward Category *" onChange={e => setWardForm(f => ({ ...f, wardCategory: e.target.value }))}>
                    {WARD_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select value={wardForm.gender} label="Gender" onChange={e => setWardForm(f => ({ ...f, gender: e.target.value }))}>
                    {WARD_GENDERS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField label="Bed Capacity" type="number" fullWidth value={wardForm.capacity} onChange={e => setWardForm(f => ({ ...f, capacity: e.target.value }))} helperText="Beds will be auto-generated with names like MED-01, MED-02…" inputProps={{ min: 1, max: 200 }} />
            <TextField label="Description (optional)" fullWidth value={wardForm.description} onChange={e => setWardForm(f => ({ ...f, description: e.target.value }))} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField label="Color (hex)" fullWidth value={wardForm.color} onChange={e => setWardForm(f => ({ ...f, color: e.target.value }))} placeholder={WARD_COLORS_MAP[wardForm.wardCategory]} helperText="Leave blank to use category default" />
              <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: wardForm.color || WARD_COLORS_MAP[wardForm.wardCategory] || '#495057', border: '2px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddWard(false)}>Cancel</Button>
          <Button onClick={handleSaveWard} variant="contained">{editingWard ? 'Update Ward' : 'Create Ward'}</Button>
        </DialogActions>
      </Dialog>
      */}

        {/* ── AI Engine Configuration ────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Card sx={{
            border: 'none',
            boxShadow: '0 4px 32px rgba(99,102,241,0.13)',
            background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
            color: '#fff',
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* Decorative glow */}
            <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                <Box sx={{ p: 1.5, borderRadius: 2, background: 'rgba(139,92,246,0.25)', display: 'flex' }}>
                  <SmartToy sx={{ color: '#a78bfa', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#fff', letterSpacing: '-0.3px' }}>
                    🤖 AI Engine Configuration
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                    Admin-only · System-wide · Offline & Private
                  </Typography>
                </Box>
              </Stack>

              <Grid container spacing={3}>

                {/* NER Status — always on */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', height: '100%' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Biotech sx={{ color: '#34d399', fontSize: 22 }} />
                        <Typography fontWeight={700} sx={{ color: '#fff' }}>Clinical NER (OpenMed SDK)</Typography>
                      </Stack>
                      <Chip label="ALWAYS ON" size="small" sx={{ bgcolor: 'rgba(52,211,153,0.2)', color: '#34d399', fontWeight: 700, fontSize: 11 }} />
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                      Medical dictionary enrichment runs on every chat query. Extracts
                      💊&nbsp;drugs, 🦠&nbsp;diseases, 🤒&nbsp;symptoms and 📏&nbsp;dosages
                      automatically from natural language — making every response smarter.
                    </Typography>
                  </Box>
                </Grid>

                {/* Ollama LLM Toggle */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2.5, borderRadius: 2, background: aiLlmEnabled ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${aiLlmEnabled ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)'}`, height: '100%', transition: 'all 0.3s' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Psychology sx={{ color: '#a78bfa', fontSize: 22 }} />
                        <Typography fontWeight={700} sx={{ color: '#fff' }}>Quantized LLM (Ollama)</Typography>
                      </Stack>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={aiLlmEnabled}
                            onChange={e => setAiLlmEnabled(e.target.checked)}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: '#a78bfa' },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#7c3aed' },
                            }}
                          />
                        }
                        label=""
                        sx={{ m: 0 }}
                      />
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                      {aiLlmEnabled
                        ? '✅ LLM active — Ollama will generate richer prose for clinical summaries, SOAP notes, and complex analyses.'
                        : 'Enable to use a local quantized AI model for generative responses. Requires Ollama installed + ≥8GB RAM.'}
                    </Typography>
                  </Box>
                </Grid>

                {/* Ollama Live Status & OS Installer */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Circle sx={{ fontSize: 12, color: ollamaStatus === 'running' ? '#34d399' : ollamaStatus === 'checking' ? '#fbbf24' : '#f87171', animation: ollamaStatus === 'checking' ? 'pulse 1s infinite' : 'none' }} />
                        <Typography fontWeight={700} sx={{ color: '#fff' }}>
                          Ollama Server — {ollamaStatus === 'running' ? '🟢 Running' : ollamaStatus === 'checking' ? '🟡 Checking...' : '🔴 Offline'}
                        </Typography>
                      </Stack>
                      <Chip
                        label={hostPlatform === 'win32' ? '🪟 Windows' : hostPlatform === 'darwin' ? '🍎 macOS' : '🐧 Linux'}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 11, fontWeight: 700 }}
                      />
                    </Stack>

                    {ollamaStatus === 'running' ? (
                      <Box>
                        {ollamaModels.length > 0 ? (
                          <Stack spacing={0.5}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.5 }}>Installed local models:</Typography>
                            {ollamaModels.map(m => (
                              <Chip key={m.name} label={`${m.name} (${m.sizeMB} MB)`} size="small" sx={{ bgcolor: 'rgba(139,92,246,0.2)', color: '#c4b5fd', width: 'fit-content', fontSize: 12, fontWeight: 600 }} />
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#fbbf24', display: 'block', mb: 1 }}>
                            ⚠️ Ollama server is running, but no models are downloaded yet. Use the Model Manager to download a model below!
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mb: 1.5, lineHeight: 1.5 }}>
                          Ollama server is currently not connected on <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>http://localhost:11434</code>. Install or launch it using your operating system:
                        </Typography>

                        {/* OS Selection Tabs */}
                        <Stack direction="row" spacing={1} mb={2}>
                          {[
                            { key: 'win32', label: '🪟 Windows' },
                            { key: 'darwin', label: '🍎 macOS' },
                            { key: 'linux', label: '🐧 Linux' },
                          ].map(osItem => {
                            const isDetected = hostPlatform === osItem.key;
                            const isSelected = (selectedOsTab === 'auto' && isDetected) || selectedOsTab === osItem.key;
                            return (
                              <Button
                                key={osItem.key}
                                size="small"
                                variant={isSelected ? 'contained' : 'outlined'}
                                onClick={() => setSelectedOsTab(osItem.key as any)}
                                sx={{
                                  py: 0.3,
                                  px: 1.5,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  bgcolor: isSelected ? 'rgba(139,92,246,0.4)' : 'transparent',
                                  borderColor: isSelected ? '#a78bfa' : 'rgba(255,255,255,0.2)',
                                  color: '#fff',
                                  '&:hover': { bgcolor: 'rgba(139,92,246,0.3)' },
                                }}
                              >
                                {osItem.label} {isDetected ? '(Detected)' : ''}
                              </Button>
                            );
                          })}
                        </Stack>

                        {/* OS Specific Actions & Downloads */}
                        {((selectedOsTab === 'auto' && hostPlatform === 'win32') || selectedOsTab === 'win32') && (
                          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: '#60a5fa', display: 'block', mb: 1 }}>
                              🪟 Windows Installation Guide
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<Download fontSize="small" />}
                                onClick={() => window.open('https://ollama.com/download/OllamaSetup.exe', '_blank')}
                                sx={{ bgcolor: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, '&:hover': { bgcolor: '#1d4ed8' } }}
                              >
                                Download Ollama for Windows (OllamaSetup.exe)
                              </Button>
                            </Stack>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 11 }}>
                              • Run <b>OllamaSetup.exe</b>. It automatically starts Ollama in your system tray.
                            </Typography>
                          </Box>
                        )}

                        {((selectedOsTab === 'auto' && hostPlatform === 'darwin') || selectedOsTab === 'darwin') && (
                          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: '#a78bfa', display: 'block', mb: 1 }}>
                              🍎 macOS Installation & Service Start
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={1}>
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<Download fontSize="small" />}
                                onClick={() => window.open('https://ollama.com/download/Ollama-darwin.zip', '_blank')}
                                sx={{ bgcolor: '#7c3aed', color: '#fff', fontSize: 11, fontWeight: 700, '&:hover': { bgcolor: '#6d28d9' } }}
                              >
                                Download Ollama (.zip)
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Refresh fontSize="small" />}
                                onClick={handleStartOllamaService}
                                disabled={startingService}
                                sx={{ borderColor: '#34d399', color: '#34d399', fontSize: 11, fontWeight: 700, '&:hover': { bgcolor: 'rgba(52,211,153,0.1)' } }}
                              >
                                {startingService ? 'Starting Service...' : 'Auto-Start Background Server'}
                              </Button>
                            </Stack>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 11 }}>
                              • Or install via Homebrew Terminal: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: 3 }}>brew install ollama</code>
                            </Typography>
                          </Box>
                        )}

                        {((selectedOsTab === 'auto' && hostPlatform === 'linux') || selectedOsTab === 'linux') && (
                          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: '#34d399', display: 'block', mb: 1 }}>
                              🐧 Linux One-Line Installer
                            </Typography>
                            <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.08)', fontFamily: 'monospace', fontSize: 11, color: '#34d399', mb: 1, wordBreak: 'break-all' }}>
                              curl -fsSL https://ollama.com/install.sh | sh
                            </Box>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Download fontSize="small" />}
                              onClick={() => window.open('https://ollama.com/download/linux', '_blank')}
                              sx={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff', fontSize: 11 }}
                            >
                              View Linux Documentation
                            </Button>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                </Grid>

                {/* Model Selection & Download Manager */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                      <MemoryOutlined sx={{ color: '#60a5fa', fontSize: 20 }} />
                      <Typography fontWeight={700} sx={{ color: '#fff' }}>Active Model Selection</Typography>
                    </Stack>
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <Select
                        value={aiOllamaModel}
                        onChange={e => setAiOllamaModel(e.target.value)}
                        disabled={!aiLlmEnabled}
                        sx={{
                          color: '#fff',
                          background: 'rgba(255,255,255,0.08)',
                          '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(139,92,246,0.6)' },
                          '.MuiSvgIcon-root': { color: '#fff' },
                        }}
                      >
                        {AVAILABLE_MODELS.map(m => {
                          const isInstalled = ollamaModels.some(om => om.name.includes(m.value) || m.value.includes(om.name));
                          return (
                            <MenuItem key={m.value} value={m.value}>
                              {m.label} ({m.desc}) {isInstalled ? ' — Installed ✓' : ' — (Not Installed)'}
                            </MenuItem>
                          );
                        })}
                        {ollamaModels.filter(m => !AVAILABLE_MODELS.find(am => am.value === m.name || m.name.includes(am.value))).map(m => (
                          <MenuItem key={m.name} value={m.name}>{m.name} ({m.sizeMB} MB — Installed ✓)</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'rgba(255,255,255,0.9)', mb: 1 }}>
                      Model Download Manager
                    </Typography>

                    <Stack spacing={1.5}>
                      {AVAILABLE_MODELS.map(m => {
                        const installedInfo = ollamaModels.find(om => om.name.includes(m.value) || m.value.includes(om.name));
                        const state = pullState[m.value] || { progress: 0, status: 'idle', statusText: '' };
                        const isDownloading = state.status === 'pulling';

                        return (
                          <Box key={m.value} sx={{ p: 1.5, borderRadius: 1.5, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                              <Box>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Typography variant="body2" fontWeight={700} sx={{ color: '#fff' }}>
                                    {m.label}
                                  </Typography>
                                  {m.recommended && (
                                    <Chip label="Recommended" size="small" sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(99,102,241,0.3)', color: '#818cf8', fontWeight: 700 }} />
                                  )}
                                </Stack>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>
                                  {m.desc}
                                </Typography>
                              </Box>

                              <Box>
                                {installedInfo ? (
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Chip icon={<CheckCircle sx={{ fontSize: '14px !important', color: '#34d399 !important' }} />} label="Installed" size="small" sx={{ bgcolor: 'rgba(52,211,153,0.15)', color: '#34d399', fontSize: 11, fontWeight: 700 }} />
                                    <Tooltip title="Delete Model">
                                      <IconButton size="small" onClick={() => handleDeleteModel(installedInfo.name)} sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#f87171' } }}>
                                        <DeleteOutline fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                ) : isDownloading ? (
                                  <Chip label={`${state.progress}%`} size="small" sx={{ bgcolor: 'rgba(251,191,36,0.2)', color: '#fbbf24', fontSize: 11, fontWeight: 700 }} />
                                ) : (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<Download fontSize="small" />}
                                    onClick={() => handlePullModel(m.value)}
                                    disabled={ollamaStatus !== 'running'}
                                    sx={{
                                      borderColor: 'rgba(139,92,246,0.5)',
                                      color: '#c4b5fd',
                                      fontSize: 11,
                                      py: 0.3,
                                      px: 1.5,
                                      '&:hover': { borderColor: '#a78bfa', bgcolor: 'rgba(139,92,246,0.1)' },
                                    }}
                                  >
                                    Download
                                  </Button>
                                )}
                              </Box>
                            </Stack>

                            {isDownloading && (
                              <Box sx={{ mt: 1 }}>
                                <LinearProgress variant="determinate" value={state.progress} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#a78bfa' } }} />
                                <Typography variant="caption" sx={{ color: '#fbbf24', fontSize: 10, mt: 0.5, display: 'block' }}>
                                  {state.statusText} ({state.progress}%)
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                </Grid>

                {/* Save Button */}
                <Grid item xs={12}>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 2 }} />
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Button
                      variant="contained"
                      onClick={handleSaveAiConfig}
                      disabled={savingAiConfig}
                      startIcon={<SmartToy />}
                      sx={{
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        color: '#fff',
                        fontWeight: 700,
                        px: 4,
                        py: 1.2,
                        borderRadius: 2,
                        '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #4338ca)' },
                        '&.Mui-disabled': { opacity: 0.5, color: '#fff' },
                      }}
                    >
                      {savingAiConfig ? 'Saving...' : 'Save AI Engine Settings'}
                    </Button>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                      Settings apply system-wide. OpenMed NER is always active regardless of LLM toggle.
                    </Typography>
                  </Stack>
                </Grid>

              </Grid>
            </CardContent>
          </Card>
        </Grid>

      {/* Dialog: Add New Nurse Shift */}
      <Dialog open={openAddShift} onClose={() => setOpenAddShift(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Configure New Nurse Shift</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Shift Name *"
              placeholder="e.g. Twilight Shift"
              value={shiftForm.name}
              onChange={e => setShiftForm(f => ({ ...f, name: e.target.value, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
              fullWidth
            />
            <TextField
              label="Shift Code *"
              value={shiftForm.code}
              onChange={e => setShiftForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
              fullWidth
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Start Time *"
                  type="time"
                  value={shiftForm.startTime}
                  onChange={e => setShiftForm(f => ({ ...f, startTime: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End Time *"
                  type="time"
                  value={shiftForm.endTime}
                  onChange={e => setShiftForm(f => ({ ...f, endTime: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Description (Optional)"
              placeholder="e.g. Mid-day emergency coverage"
              value={shiftForm.description}
              onChange={e => setShiftForm(f => ({ ...f, description: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Theme Color</InputLabel>
              <Select
                value={shiftForm.color}
                label="Theme Color"
                onChange={e => setShiftForm(f => ({ ...f, color: e.target.value }))}
              >
                <MenuItem value="#2563eb">Blue (Morning)</MenuItem>
                <MenuItem value="#d97706">Amber (Afternoon)</MenuItem>
                <MenuItem value="#7c3aed">Purple (Night)</MenuItem>
                <MenuItem value="#059669">Green (Day 12h)</MenuItem>
                <MenuItem value="#dc2626">Red (Night 12h)</MenuItem>
                <MenuItem value="#0891b2">Cyan (On-Call)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddShift(false)}>Cancel</Button>
          <Button onClick={handleAddShift} variant="contained">Save Shift</Button>
        </DialogActions>
      </Dialog>
      {/* Dialog: Ward Settings & Management */}
      <Dialog open={wardSettingsOpen} onClose={() => setWardSettingsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h6" fontWeight={800}>Hospital Ward & Unit Settings</Typography>
          </Box>
          <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setAddWardModalOpen(true)}>
            Add New Ward
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Configure hospital ward names, bed capacities, and clinical categories. Configured wards are automatically loaded into Nurse Rostering and Inpatient Allocation.
          </Alert>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: alpha('#1e293b', 0.04) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Ward Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Bed Capacity</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {wards.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center"><Typography py={3} color="text.secondary">No wards configured yet.</Typography></TableCell></TableRow>
                ) : (
                  wards.map((w: any) => (
                    <TableRow key={w.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: w.color || '#3f51b5' }} />
                          <Typography variant="body2" fontWeight={700}>{w.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={w.wardCategory || w.type || 'GENERAL'} size="small" variant="outlined" color="primary" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`${w.capacity || w.totalBeds || 0} Beds`} size="small" color="secondary" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{w.description || 'N/A'}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={w.isActive !== false ? 'ACTIVE' : 'INACTIVE'} size="small" color={w.isActive !== false ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Edit Ward Name & Configuration">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEditWard(w)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Ward">
                            <IconButton size="small" color="error" onClick={() => handleDeleteWard(w.id, w.name)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWardSettingsOpen(false)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Add New Ward */}
      <Dialog open={addWardModalOpen} onClose={() => setAddWardModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add New Hospital Ward</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Ward Name *" value={wardForm.name} onChange={e => setWardForm(f => ({ ...f, name: e.target.value }))} fullWidth placeholder="e.g. Surgical Ward B" />
            <FormControl fullWidth>
              <InputLabel>Ward Category *</InputLabel>
              <Select value={wardForm.wardCategory} label="Ward Category *" onChange={e => setWardForm(f => ({ ...f, wardCategory: e.target.value, type: e.target.value }))}>
                <MenuItem value="GENERAL">General Ward</MenuItem>
                <MenuItem value="ICU">ICU (Intensive Care)</MenuItem>
                <MenuItem value="MATERNITY">Maternity & Delivery</MenuItem>
                <MenuItem value="PAEDIATRIC">Paediatric Ward</MenuItem>
                <MenuItem value="EMERGENCY">Emergency Ward</MenuItem>
                <MenuItem value="SURGICAL">Surgical Recovery</MenuItem>
                <MenuItem value="PRIVATE">Private VIP Suite</MenuItem>
              </Select>
            </FormControl>
            <TextField type="number" label="Bed Capacity" value={wardForm.capacity} onChange={e => setWardForm(f => ({ ...f, capacity: e.target.value }))} fullWidth />
            <TextField label="Description / Location Notes" value={wardForm.description} onChange={e => setWardForm(f => ({ ...f, description: e.target.value }))} multiline rows={2} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddWardModalOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateWard} variant="contained">Create Ward</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Edit Ward */}
      <Dialog open={editWardModalOpen} onClose={() => setEditWardModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Ward Configuration</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Ward Name *" value={wardForm.name} onChange={e => setWardForm(f => ({ ...f, name: e.target.value }))} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Ward Category *</InputLabel>
              <Select value={wardForm.wardCategory} label="Ward Category *" onChange={e => setWardForm(f => ({ ...f, wardCategory: e.target.value, type: e.target.value }))}>
                <MenuItem value="GENERAL">General Ward</MenuItem>
                <MenuItem value="ICU">ICU (Intensive Care)</MenuItem>
                <MenuItem value="MATERNITY">Maternity & Delivery</MenuItem>
                <MenuItem value="PAEDIATRIC">Paediatric Ward</MenuItem>
                <MenuItem value="EMERGENCY">Emergency Ward</MenuItem>
                <MenuItem value="SURGICAL">Surgical Recovery</MenuItem>
                <MenuItem value="PRIVATE">Private VIP Suite</MenuItem>
              </Select>
            </FormControl>
            <TextField type="number" label="Bed Capacity" value={wardForm.capacity} onChange={e => setWardForm(f => ({ ...f, capacity: e.target.value }))} fullWidth />
            <TextField label="Description" value={wardForm.description} onChange={e => setWardForm(f => ({ ...f, description: e.target.value }))} multiline rows={2} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditWardModalOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateWard} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>
    </div>

  );
};
export default Settings;
