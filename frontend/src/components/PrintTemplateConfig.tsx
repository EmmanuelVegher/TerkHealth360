import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, Select, MenuItem, FormControl, InputLabel, Button, CircularProgress, Box, Divider, Dialog, DialogContent, IconButton, Tooltip, AppBar, Toolbar } from '@mui/material';
import { Print, Visibility, Fullscreen, Close, PhotoCamera } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { LabReportPrintTemplate } from './LabReportPrintTemplate';
import { PrescriptionPrintTemplate } from './PrescriptionPrintTemplate';
import { RegistrationPrintTemplate } from './RegistrationPrintTemplate';
import { AncCardPrintTemplate } from './AncCardPrintTemplate';
import { ANC_TEMPLATES } from '../services/ancTemplates';

const MOCK_LAB_ORDER = {
  id: "preview-mock-lab",
  orderNumber: "LAB-2026-PREV",
  createdAt: new Date().toISOString(),
  patient: {
    firstName: "JOHN",
    lastName: "DOE",
    birthDate: "1990-01-01",
    gender: "MALE",
    address: "Preview Address, Nsukka"
  },
  items: [
    {
      id: "mock1",
      test: { testName: "Fasting Blood Sugar", testCode: "fbs", category: "Biochemistry", referenceRange: "70 - 110 mg/dL" },
      result: { resultValue: "95", resultUnit: "mg/dL" }
    },
    {
      id: "mock2",
      test: { testName: "Malaria Parasite", testCode: "m.p", category: "Microbiology", referenceRange: "Negative" },
      result: { resultValue: "Positive (+)", resultUnit: "" }
    },
    {
      id: "mock3",
      test: { testName: "Lipid Profile", testCode: "lipid", category: "Biochemistry", referenceRange: "< 200 mg/dL" },
      result: { resultValue: "185", resultUnit: "mg/dL" }
    }
  ]
};

const MOCK_PRESCRIPTION = {
  id: "preview-mock-rx",
  patient: {
    firstName: "John",
    lastName: "Doe"
  },
  items: [
    {
      id: "rx1",
      drug: { genericName: "Amoxicillin 500mg Capsule" },
      dosage: "1 cap",
      frequency: "TDS (8 hrly)",
      duration: "5 days",
      quantity: 15
    },
    {
      id: "rx2",
      drug: { genericName: "Paracetamol 500mg Tablet" },
      dosage: "2 tabs",
      frequency: "PRN",
      duration: "3 days",
      quantity: 10
    }
  ]
};

const MOCK_REGISTRATION_PATIENT = {
  mrn: "EXT-2026-00035",
  firstName: "John",
  middleName: "Eze",
  lastName: "Doe",
  birthDate: "1985-06-15",
  gender: "MALE",
  maritalStatus: "MARRIED",
  nin: "12345678901",
  occupation: "Software Engineer",
  telecoms: [{ system: 'phone', value: '08012345678' }, { system: 'email', value: 'john.doe@example.com' }],
  addresses: [{ line: "123 Test Street", city: "Lagos", state: "Lagos" }],
  nokName: "Jane Doe",
  nokRelationship: "SPOUSE",
  nokPhone: "08087654321",
  nokAddress: "123 Test Street, Lagos",
  emergencyName: "James Doe",
  emergencyRelationship: "BROTHER",
  emergencyPhone: "08123456789",
  emergencyAddress: "456 Family Rd, Lagos",
  createdAt: new Date().toISOString()
};

const MOCK_ANC_PATIENT = {
  firstName: "Pregnant",
  lastName: "Women",
  mrn: "EXT-2026-00036",
  age: 28,
  address: "Faith Mission Hospital Compound, Nsukka",
  phone: "08012345678"
};

const MOCK_ANC_PROFILE = {
  ageAtRegistration: 28,
  gravidity: 2,
  parity: 1,
  abortions: 0,
  livingChildren: 1,
  bloodGroup: 'O_POSITIVE',
  rhesusStatus: 'POSITIVE',
  hivStatus: 'NEGATIVE',
  bookingDate: new Date().toISOString(),
  customFields: JSON.stringify({
    husbandName: "Eze Okafor",
    husbandOccupation: "Civil Servant",
    husbandPhone: "08034567890",
    husbandOfficeAddress: "12 Ogurugu Road, Nsukka",
    occupation: "Trader",
    speakingEnglish: "Yes",
    tribe: "Igbo",
    religion: "Anglican",
    fsh: "Nil",
    heartDisease: false,
    chestDisease: false,
    kidneyDisease: false,
    operations: "None",
    yearOfMarriage: 2022,
    educationLevel: "Tertiary",
    lifestyleRiskFactors: ["Twinning"],
    bleeding: false,
    discharge: false,
    urinarySymptoms: false,
    swellingOfAnkles: false,
    otherSymptoms: "None",
    prevGravida1: 1,
    prevParity1: 1,
    prevLivingMale1: 1,
    prevLivingFemale1: 0,
    prevDob1: "2023-04-12",
    prevPob1: "Nsukka Health Center",
    prevDuration1: 39,
    prevComps1: "None",
    prevWeight1: 3.2,
    prevOutcome1: "A"
  })
};

const MOCK_ANC_PREGNANCY = {
  lmpDate: "2026-01-10",
  eddDate: "2026-10-17",
  isHighRisk: false,
  status: "ACTIVE",
  customFields: JSON.stringify({
    consultant: "Dr. Uche",
    indicationForBooking: "Routine Booking",
    specialPoints: "Twin pregnancy suspect"
  })
};

export const PrintTemplateConfig = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [limsTemplate, setLimsTemplate] = useState('standard_dynamic');
  const [pharmacyTemplate, setPharmacyTemplate] = useState('standard');
  const [registrationTemplate, setRegistrationTemplate] = useState('reg_standard');
  const [ancTemplate, setAncTemplate] = useState('anc_faith_foundation_replica');
  const [logoLeft, setLogoLeft] = useState('/anglican-logo.png');
  const [logoRight, setLogoRight] = useState('/hospital-logo.png');
  const [hospitalStamp, setHospitalStamp] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/config/modules');
      if (res.data?.success) {
        const configs = res.data.data;
        const limsConfig = configs.find((c: any) => c.moduleKey === 'LIMS_PRINT_TEMPLATE');
        const pharmConfig = configs.find((c: any) => c.moduleKey === 'PHARMACY_PRINT_TEMPLATE');
        const regConfig = configs.find((c: any) => c.moduleKey === 'REGISTRATION_PRINT_TEMPLATE');
        const ancConfig = configs.find((c: any) => c.moduleKey === 'ANC_PRINT_TEMPLATE');
        const logoLeftConfig = configs.find((c: any) => c.moduleKey === 'HOSPITAL_LOGO_LEFT');
        const logoRightConfig = configs.find((c: any) => c.moduleKey === 'HOSPITAL_LOGO_RIGHT');
        const stampConfig = configs.find((c: any) => c.moduleKey === 'HOSPITAL_STAMP');
        
        if (limsConfig?.description) setLimsTemplate(limsConfig.description);
        if (pharmConfig?.description) setPharmacyTemplate(pharmConfig.description);
        if (regConfig?.description) setRegistrationTemplate(regConfig.description);
        if (ancConfig?.description) setAncTemplate(ancConfig.description);
        if (logoLeftConfig?.description) {
          const url = logoLeftConfig.description.startsWith('http')
            ? logoLeftConfig.description
            : `${logoLeftConfig.description}?t=${Date.now()}`;
          setLogoLeft(url);
        }
        if (logoRightConfig?.description) {
          const url = logoRightConfig.description.startsWith('http')
            ? logoRightConfig.description
            : `${logoRightConfig.description}?t=${Date.now()}`;
          setLogoRight(url);
        }
        if (stampConfig?.description) {
          const url = stampConfig.description.startsWith('http')
            ? stampConfig.description
            : `${stampConfig.description}?t=${Date.now()}`;
          setHospitalStamp(url);
        }
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to load print template configuration', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, position: 'left' | 'right' | 'stamp') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      enqueueSnackbar('Image size should be less than 2MB', { variant: 'warning' });
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/config/logos/${position}`, {
        method: 'POST',
        headers: token ? { Authorization: 'Bearer ' + token } : {},
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        // Use a relative path so Vite proxy serves it
        const freshUrl = `${data.url}?t=${Date.now()}`;
        if (position === 'left') setLogoLeft(freshUrl);
        else if (position === 'right') setLogoRight(freshUrl);
        else setHospitalStamp(freshUrl);
        enqueueSnackbar(`${position.charAt(0).toUpperCase() + position.slice(1)} image uploaded successfully!`, { variant: 'success' });
      } else {
        enqueueSnackbar(`Upload failed: ${data.error || 'Unknown error'}`, { variant: 'error' });
      }
    } catch (err: any) {
      enqueueSnackbar(`Upload error: ${err.message}`, { variant: 'error' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/config/modules/LIMS_PRINT_TEMPLATE`, { isActive: true, description: limsTemplate });
      await api.put(`/config/modules/PHARMACY_PRINT_TEMPLATE`, { isActive: true, description: pharmacyTemplate });
      await api.put(`/config/modules/REGISTRATION_PRINT_TEMPLATE`, { isActive: true, description: registrationTemplate });
      await api.put(`/config/modules/ANC_PRINT_TEMPLATE`, { isActive: true, description: ancTemplate });
      enqueueSnackbar('Template configuration saved successfully', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to update configurations', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 3, mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Print color="primary" /> Print Templates Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Configure the default print layouts for Laboratory Results and Pharmacy Prescriptions. The Dynamic schemas adapt automatically to the tests/drugs present.
        </Typography>

        {loading ? (
          <CircularProgress size={24} />
        ) : (
          <Grid container spacing={3}>
            {/* Configuration Selectors */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Laboratory (LIMS) Template</InputLabel>
                <Select
                  value={limsTemplate}
                  label="Laboratory (LIMS) Template"
                  onChange={(e) => setLimsTemplate(e.target.value)}
                >
                  <MenuItem value="lims_classic_grid">Classic Grid (Full Borders)</MenuItem>
                  <MenuItem value="lims_corporate_blue">Corporate Blue</MenuItem>
                  <MenuItem value="lims_corporate_green">Corporate Green</MenuItem>
                  <MenuItem value="lims_modern_minimalist">Modern Minimalist</MenuItem>
                  <MenuItem value="lims_compact_2col">Compact 2-Column</MenuItem>
                  <MenuItem value="lims_spacious_elegant">Spacious & Elegant</MenuItem>
                  <MenuItem value="lims_category_cards">Category Cards</MenuItem>
                  <MenuItem value="lims_zebra_striped">Zebra Striped</MenuItem>
                  <MenuItem value="lims_letterhead_centered">Centered Letterhead</MenuItem>
                  <MenuItem value="lims_sidebar_info">Sidebar Info</MenuItem>
                  <MenuItem value="lims_landscape_a4">Landscape A4</MenuItem>
                  <MenuItem value="lims_high_contrast">High Contrast B&W</MenuItem>
                  <MenuItem value="lims_legacy_faith">Faith Foundation Replica (Legacy)</MenuItem>
                  <MenuItem value="lims_theme_ruby">Theme: Ruby Red</MenuItem>
                  <MenuItem value="lims_theme_ocean">Theme: Ocean Teal</MenuItem>
                  <MenuItem value="lims_theme_pediatric">Theme: Pediatric</MenuItem>
                  <MenuItem value="lims_tabular_strict">Strict Tabular</MenuItem>
                  <MenuItem value="lims_clinical_summary">Clinical Summary (Bold Abnormalities)</MenuItem>
                  <MenuItem value="lims_qr_focused">QR Verification Focused</MenuItem>
                  <MenuItem value="lims_a5_half_page">A5 Half Page Form</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Pharmacy Template</InputLabel>
                <Select
                  value={pharmacyTemplate}
                  label="Pharmacy Template"
                  onChange={(e) => setPharmacyTemplate(e.target.value)}
                >
                  <MenuItem value="rx_standard_a4">Standard A4 Table</MenuItem>
                  <MenuItem value="rx_pad_a5">Doctor's Notepad A5</MenuItem>
                  <MenuItem value="rx_modern_minimalist">Modern Minimalist (No Borders)</MenuItem>
                  <MenuItem value="rx_zebra_striped">Zebra Striped Table</MenuItem>
                  <MenuItem value="rx_two_column">Compact 2-Column</MenuItem>
                  <MenuItem value="rx_classic_blue">Classic Blue Headers</MenuItem>
                  <MenuItem value="rx_classic_green">Classic Green Headers</MenuItem>
                  <MenuItem value="rx_thermal_80mm_standard">Thermal Receipt (80mm Standard)</MenuItem>
                  <MenuItem value="rx_thermal_58mm_narrow">Thermal Receipt (58mm Narrow)</MenuItem>
                  <MenuItem value="rx_thermal_centered">Thermal Centered</MenuItem>
                  <MenuItem value="rx_thermal_compact">Thermal Compact (Save Paper)</MenuItem>
                  <MenuItem value="rx_thermal_detailed">Thermal Detailed (With T&C)</MenuItem>
                  <MenuItem value="rx_label_sticker">Pill Bottle Label Sticker (4x2)</MenuItem>
                  <MenuItem value="rx_multi_label_grid">Multi-Label Grid (A4)</MenuItem>
                  <MenuItem value="rx_dosage_calendar">Visual Dosage Calendar</MenuItem>
                  <MenuItem value="rx_instructions_bold">Bold Instructions</MenuItem>
                  <MenuItem value="rx_bilingual">Bilingual (Placeholder)</MenuItem>
                  <MenuItem value="rx_pediatric_theme">Pediatric Friendly Theme</MenuItem>
                  <MenuItem value="rx_discharge_summary">Discharge Summary Format</MenuItem>
                  <MenuItem value="rx_high_contrast">High Contrast (Accessibility)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Registration Template</InputLabel>
                <Select
                  value={registrationTemplate}
                  label="Registration Template"
                  onChange={(e) => setRegistrationTemplate(e.target.value)}
                >
                  <MenuItem value="reg_standard">Standard A4</MenuItem>
                  <MenuItem value="reg_thermal_80mm">Standard Thermal Receipt (80mm)</MenuItem>
                  <MenuItem value="reg_thermal_58mm">Narrow Thermal Receipt (58mm)</MenuItem>
                  <MenuItem value="reg_a5_half_page">Half Page Horizontal (A5)</MenuItem>
                  <MenuItem value="reg_classic_blue">Blue Themed Hospital Look</MenuItem>
                  <MenuItem value="reg_modern_minimalist">Clean, Whitespace</MenuItem>
                  <MenuItem value="reg_high_contrast">Black and White, Bold Fonts</MenuItem>
                  <MenuItem value="reg_pediatric_theme">Soft Colors, Rounded</MenuItem>
                  <MenuItem value="reg_zebra_striped">Alternating Row Colors</MenuItem>
                  <MenuItem value="reg_two_column">Side-by-side Demographics</MenuItem>
                  <MenuItem value="reg_bilingual">Bilingual Space</MenuItem>
                  <MenuItem value="reg_photo_id_card">Badge-sized Layout</MenuItem>
                  <MenuItem value="reg_wristband">Long Horizontal Wristband</MenuItem>
                  <MenuItem value="reg_compact_slip">Small Slip for Hand-offs</MenuItem>
                  <MenuItem value="reg_detailed_intake">Detailed Intake Breakdown</MenuItem>
                  <MenuItem value="reg_emergency_triage">Emergency Triage Highlighting</MenuItem>
                  <MenuItem value="reg_vip_premium">Elegant Serif Fonts</MenuItem>
                  <MenuItem value="reg_insurance_focused">Payer Details Emphasized</MenuItem>
                  <MenuItem value="reg_barcode_heavy">Multiple Barcodes (Scanning)</MenuItem>
                  <MenuItem value="reg_large_print">Accessibility (Large Print)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Antenatal Care (ANC) Template</InputLabel>
                <Select
                  value={ancTemplate}
                  label="Antenatal Care (ANC) Template"
                  onChange={(e) => setAncTemplate(e.target.value)}
                >
                  {ANC_TEMPLATES.map((tpl) => (
                    <MenuItem key={tpl.id} value={tpl.id}>{tpl.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} display="flex" justifyContent="flex-end">
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleSave} 
                disabled={saving}
                sx={{ height: '56px', width: '200px' }}
              >
                {saving ? 'Saving...' : 'Save Config'}
              </Button>
            </Grid>

            {/* Logo Uploaders */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={700} mb={2}>Custom Hospital Logos</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" gap={2} p={2} border="1px solid #eee" borderRadius={2}>
                    <img src={logoLeft} alt="Left Logo" style={{ height: 60, width: 60, objectFit: 'contain' }} />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">Left Logo</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>Appears on the top left of printed forms.</Typography>
                      <Button variant="outlined" size="small" component="label">
                        Upload Image
                        <input type="file" hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'left')} />
                      </Button>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" gap={2} p={2} border="1px solid #eee" borderRadius={2}>
                    <img src={logoRight} alt="Right Logo" style={{ height: 60, width: 60, objectFit: 'contain' }} />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">Right Logo</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>Appears on the top right of printed forms.</Typography>
                      <Button variant="outlined" size="small" component="label">
                        Upload Image
                        <input type="file" hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'right')} />
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={800} mb={1}>Hospital Stamp / Admin Signature</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  This stamp or signature will be appended at the bottom of the Patient Registration forms when approved by an Administrator.
                </Typography>
                <Box display="flex" alignItems="center" gap={3}>
                  <Box sx={{ 
                    width: 120, 
                    height: 80, 
                    border: '1px dashed #ccc', 
                    borderRadius: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    bgcolor: '#fafafa',
                    overflow: 'hidden'
                  }}>
                    {hospitalStamp ? <img src={hospitalStamp} alt="Stamp" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Typography variant="caption" color="text.secondary">No Stamp</Typography>}
                  </Box>
                  <Box>
                    <Button variant="outlined" component="label" size="small" startIcon={<PhotoCamera />}>
                      Upload Stamp
                      <input type="file" hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'stamp')} />
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Live Previews */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Visibility color="primary" /> Live Preview
                </Typography>
                <Button 
                  startIcon={<Fullscreen />} 
                  variant="outlined" 
                  size="small" 
                  onClick={() => setFullScreen(true)}
                >
                  Full Screen
                </Button>
              </Box>
              
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>LIMS PREVIEW</Typography>
                  <Box sx={{ 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 2, 
                    height: '500px', 
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    bgcolor: '#f5f5f5',
                    p: 2
                  }}>
                    <LabReportPrintTemplate order={MOCK_LAB_ORDER} preview={true} forceTemplate={limsTemplate} forceLogoLeft={logoLeft} forceLogoRight={logoRight} />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>PHARMACY PREVIEW</Typography>
                  <Box sx={{ 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 2, 
                    height: '500px', 
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    bgcolor: '#f5f5f5',
                    p: 2,
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <Box sx={{ width: '100%', maxWidth: pharmacyTemplate === 'receipt_style' ? '350px' : '100%' }}>
                      <PrescriptionPrintTemplate prescription={MOCK_PRESCRIPTION} preview={true} forceTemplate={pharmacyTemplate} forceLogoLeft={logoLeft} forceLogoRight={logoRight} />
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>REGISTRATION PREVIEW</Typography>
                  <Box sx={{ 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 2, 
                    height: '500px', 
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    bgcolor: '#f5f5f5',
                    p: 2,
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <Box sx={{ width: '100%', maxWidth: '100%' }}>
                      <RegistrationPrintTemplate patient={MOCK_REGISTRATION_PATIENT} preview={true} forceTemplate={registrationTemplate} forceLogoLeft={logoLeft} forceLogoRight={logoRight} />
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>ANC CARD PREVIEW</Typography>
                  <Box sx={{ 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 2, 
                    height: '500px', 
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    bgcolor: '#f5f5f5',
                    p: 2
                  }}>
                    <AncCardPrintTemplate 
                      patient={MOCK_ANC_PATIENT} 
                      maternityProfile={MOCK_ANC_PROFILE} 
                      activePregnancy={MOCK_ANC_PREGNANCY} 
                      preview={true} 
                      forceTemplate={ancTemplate} 
                      forceLogoLeft={logoLeft} 
                      forceLogoRight={logoRight} 
                    />
                  </Box>
                </Grid>
              </Grid>
            </Grid>

          </Grid>
        )}
      </CardContent>

      <Dialog fullScreen open={fullScreen} onClose={() => setFullScreen(false)}>
        <AppBar sx={{ position: 'relative', bgcolor: '#fff', color: '#000', boxShadow: 'none', borderBottom: '1px solid #e0e0e0' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => setFullScreen(false)} aria-label="close">
              <Close />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1, fontWeight: 'bold' }} variant="h6" component="div">
              Live Preview (Full Screen)
            </Typography>
            <Button autoFocus color="primary" variant="contained" onClick={() => setFullScreen(false)}>
              Close
            </Button>
          </Toolbar>
        </AppBar>
        <DialogContent sx={{ bgcolor: '#f5f5f5', p: 4 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" display="block" mb={2}>LIMS PREVIEW</Typography>
              <Box sx={{ bgcolor: '#fff', p: 4, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
                <LabReportPrintTemplate order={MOCK_LAB_ORDER} preview={true} forceTemplate={limsTemplate} forceLogoLeft={logoLeft} forceLogoRight={logoRight} />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" display="block" mb={2}>PHARMACY PREVIEW</Typography>
              <Box sx={{ bgcolor: '#fff', p: 4, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ width: '100%', maxWidth: pharmacyTemplate === 'receipt_style' ? '350px' : '100%' }}>
                  <PrescriptionPrintTemplate prescription={MOCK_PRESCRIPTION} preview={true} forceTemplate={pharmacyTemplate} forceLogoLeft={logoLeft} forceLogoRight={logoRight} />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" display="block" mb={2}>REGISTRATION PREVIEW</Typography>
              <Box sx={{ bgcolor: '#fff', p: 4, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ width: '100%', maxWidth: '100%' }}>
                  <RegistrationPrintTemplate patient={MOCK_REGISTRATION_PATIENT} preview={true} forceTemplate={registrationTemplate} forceLogoLeft={logoLeft} forceLogoRight={logoRight} />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" display="block" mb={2}>ANC CARD PREVIEW</Typography>
              <Box sx={{ bgcolor: '#fff', p: 4, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
                <AncCardPrintTemplate 
                  patient={MOCK_ANC_PATIENT} 
                  maternityProfile={MOCK_ANC_PROFILE} 
                  activePregnancy={MOCK_ANC_PREGNANCY} 
                  preview={true} 
                  forceTemplate={ancTemplate} 
                  forceLogoLeft={logoLeft} 
                  forceLogoRight={logoRight} 
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
