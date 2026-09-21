import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Typography, Box, Card, CardContent, Button, TextField, Select, MenuItem,
  InputLabel, FormControl, Grid, Divider, Stepper, Step, StepLabel,
  FormControlLabel, Switch, Stack, Alert, Link, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell, TableHead, TableRow,
  TableContainer, Chip, FormHelperText, CircularProgress,
} from '@mui/material';
import { CameraAlt, Person, HowToReg, LocalPharmacy, Payment, CheckCircle, Sync } from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { useLocation } from 'react-router-dom';
import { NIGERIA_STATES_AND_LGAS } from '../utils/nigeriaStatesData';
import { EmergencyPendingBanner } from '../components/EmergencyPendingBanner';

const steps = ['Demographics', 'Next of Kin & Emergency', 'Registration Fees & Review'];

const PatientRegistration = () => {
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [selectedEmergencyArrival, setSelectedEmergencyArrival] = useState<any | null>(null);

  // Quick check-in states
  const [registeredPatient, setRegisteredPatient] = useState<any>(null);
  const [consultServices, setConsultServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [visitType, setVisitType] = useState('OUTPATIENT');
  const [insuranceStatus, setInsuranceStatus] = useState<any>(null);
  const [checkingInsurance, setCheckingInsurance] = useState(false);
  const [checkedInVisit, setCheckedInVisit] = useState<any>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    api.get('/workflow/consultation-services?activeOnly=true')
      .then(r => setConsultServices(r.data?.data || []))
      .catch(console.error);
  }, []);

  const handleSelectEmergencyArrival = (arrival: any) => {
    setSelectedEmergencyArrival(arrival);
    const rawName = (arrival.tempPatientName || '').trim();
    const nameParts = rawName.split(/\s+/).filter(Boolean);
    let firstName = '';
    let lastName = '';
    if (nameParts.length >= 2) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    } else if (nameParts.length === 1) {
      firstName = nameParts[0];
      lastName = 'Emergency';
    } else {
      firstName = 'Unknown';
      lastName = 'Patient';
    }

    firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    lastName = lastName.charAt(0).toUpperCase() + lastName.slice(1);

    const nameLower = rawName.toLowerCase();
    const inferredGender = (nameLower.includes('female') || nameLower.includes('woman') || nameLower.includes('lady')) ? 'FEMALE' : 'MALE';
    
    setFormData(prev => ({
      ...prev,
      firstName: prev.firstName || firstName,
      lastName: prev.lastName || lastName,
      gender: inferredGender,
      registrationType: 'EMERGENCY',
      address: prev.address || 'A&E Emergency Ward',
      city: prev.city || 'Enugu',
      phone: prev.phone || '08000000000',
    }));
    if (arrival.presentingComplaint) {
      setChiefComplaint(arrival.presentingComplaint);
    }
    enqueueSnackbar(`🚨 Form auto-populated from Emergency Arrival: ${arrival.arrivalCode} (${arrival.tempPatientName})`, { variant: 'info' });
  };

  useEffect(() => {
    if (location.state?.emergencyArrival) {
      handleSelectEmergencyArrival(location.state.emergencyArrival);
    }
  }, [location.state]);

  const checkPatientInsurance = async (patientId: string) => {
    setCheckingInsurance(true);
    try {
      const res = await api.get('/insurance/coverage-check', { params: { patientId } });
      setInsuranceStatus(res.data?.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingInsurance(false);
    }
  };

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

  // Form fields state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    maidenName: '',
    gender: 'MALE',
    birthDate: '',
    estimatedAge: '',
    maritalStatus: 'SINGLE',
    bloodGroup: '',
    genotype: '',
    nationality: 'Nigeria',
    stateOfOrigin: '',
    lga: '',
    occupation: '',
    religion: '',
    spokenLanguage: 'English',
    nin: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    photoUrl: null as string | null,
    registrationType: (() => {
      const saved = localStorage.getItem('registration_categories');
      const cats = saved ? JSON.parse(saved) : defaultCategories;
      return cats[0]?.code || 'INDIVIDUAL';
    })(),
    familyAccountId: '',
    familyRelationship: 'OTHER',
    // NOK details
    nokName: '',
    nokRelationship: 'SPOUSE',
    nokPhone: '',
    nokAddress: '',
    // Emergency contact
    emergencyName: '',
    emergencyRelationship: 'FRIEND',
    emergencyPhone: '',
    emergencyAddress: '',
  });

  // Phone & email validation
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [nokPhoneError, setNokPhoneError] = useState('');
  const [emergencyPhoneError, setEmergencyPhoneError] = useState('');
  const [maleWarningOpen, setMaleWarningOpen] = useState(false);

  // LGA options derived from selected state
  const lgaOptions = NIGERIA_STATES_AND_LGAS.find(
    (s: any) => s.state === formData.stateOfOrigin
  )?.lgas ?? [];

  // Phone number handler — local Nigerian format: 0XXXXXXXXXX (11 digits)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and leading 0
    let val = e.target.value.replace(/[^0-9]/g, '');
    // Ensure it starts with 0
    if (val.length > 0 && !val.startsWith('0')) val = '0' + val;
    // Cap at 11 digits
    if (val.length > 11) val = val.slice(0, 11);
    setFormData(prev => ({ ...prev, phone: val }));
    if (val === '') {
      setPhoneError('');
    } else if (!/^0[0-9]{10}$/.test(val)) {
      setPhoneError('Enter a valid 11-digit Nigerian number e.g. 09012345678');
    } else {
      setPhoneError('');
    }
  };

  const handleNokPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length > 0 && !val.startsWith('0')) val = '0' + val;
    if (val.length > 11) val = val.slice(0, 11);
    setFormData(prev => ({ ...prev, nokPhone: val }));
    if (val === '') {
      setNokPhoneError('');
    } else if (!/^0[0-9]{10}$/.test(val)) {
      setNokPhoneError('Enter a valid 11-digit Nigerian number e.g. 09012345678');
    } else {
      setNokPhoneError('');
    }
  };

  const handleEmergencyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length > 0 && !val.startsWith('0')) val = '0' + val;
    if (val.length > 11) val = val.slice(0, 11);
    setFormData(prev => ({ ...prev, emergencyPhone: val }));
    if (val === '') {
      setEmergencyPhoneError('');
    } else if (!/^0[0-9]{10}$/.test(val)) {
      setEmergencyPhoneError('Enter a valid 11-digit Nigerian number e.g. 09012345678');
    } else {
      setEmergencyPhoneError('');
    }
  };

  // Email handler with format validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, email: val }));
    if (val && !/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(val)) {
      setEmailError('Enter a valid email address e.g. name@domain.com');
    } else {
      setEmailError('');
    }
  };

  // Handle state change — also clear LGA when state changes
  const handleStateChange = (e: any) => {
    setFormData(prev => ({ ...prev, stateOfOrigin: e.target.value, lga: '' }));
  };

  // Calculate age helper
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  useEffect(() => {
    if (formData.birthDate) {
      const dob = new Date(formData.birthDate);
      const diff = Date.now() - dob.getTime();
      const ageDate = new Date(diff);
      setCalculatedAge(Math.abs(ageDate.getUTCFullYear() - 1970));
    } else {
      setCalculatedAge(null);
    }
  }, [formData.birthDate]);

  // ── Real Webcam via getUserMedia ──────────────────────────────────────────
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [camError, setCamError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setCamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCamError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permission in your browser.'
          : err.name === 'NotFoundError'
          ? 'No camera detected. Please connect a webcam and try again.'
          : `Camera error: ${err.message}`
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const triggerCamera = () => {
    setWebcamOpen(true);
  };

  useEffect(() => {
    if (webcamOpen) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [webcamOpen, startCamera, stopCamera]);

  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
    stopCamera();
    setWebcamOpen(false);
    enqueueSnackbar('Snapshot captured!', { variant: 'success' });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = async () => {
    // Check duplicates on Step 1 completion
    if (activeStep === 0) {
      if (!formData.firstName || !formData.lastName || !formData.phone) {
        enqueueSnackbar('Please fill in all mandatory demographics fields', { variant: 'warning' });
        return;
      }
      if (phoneError) {
        enqueueSnackbar('Please correct the phone number before proceeding', { variant: 'warning' });
        return;
      }
      if (emailError) {
        enqueueSnackbar('Please correct the email address before proceeding', { variant: 'warning' });
        return;
      }
      setLoading(true);
      try {
        const res = await api.post('/patients/check-duplicates', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          birthDate: formData.birthDate || null,
          phone: formData.phone,
          nin: formData.nin || null,
        });
        if (res.data.length > 0) {
          setDuplicateCandidates(res.data);
          setShowDuplicateDialog(true);
        } else {
          setActiveStep(prev => prev + 1);
        }
      } catch (err) {
        enqueueSnackbar('Duplicate search failed', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    } else if (activeStep === 1) {
      if (nokPhoneError) {
        enqueueSnackbar('Please correct the Next of Kin phone number before proceeding', { variant: 'warning' });
        return;
      }
      if (emergencyPhoneError) {
        enqueueSnackbar('Please correct the Emergency Contact phone number before proceeding', { variant: 'warning' });
        return;
      }
      setActiveStep(prev => prev + 1);
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const getTariffFee = () => {
    const match = categories.find(c => c.code === formData.registrationType);
    return match ? match.fee : 1500;
  };

  const handleFinalSubmit = async () => {
    if (formData.registrationType === 'LABOUR_DELIVERY' && formData.gender !== 'FEMALE') {
      setMaleWarningOpen(true);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/patients', {
        ...formData,
        nin: formData.nin?.trim() || null,
        email: formData.email?.trim() || null,
        estimatedAge: formData.estimatedAge ? parseInt(formData.estimatedAge) : null,
        registrationFee: getTariffFee(),
        emergencyArrivalId: selectedEmergencyArrival?.id || null,
      });
      const pat = res.data.patient;
      setRegisteredPatient(pat);
      enqueueSnackbar(
        selectedEmergencyArrival
          ? `Patient registered successfully & linked to Emergency Code: ${selectedEmergencyArrival.arrivalCode}! MRN: ${pat.patientNumber}`
          : 'Patient registered successfully! MRN: ' + pat.patientNumber,
        { variant: 'success' }
      );
      await checkPatientInsurance(pat.id);
      setActiveStep(3);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Registration failed', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <EmergencyPendingBanner onSelectArrival={handleSelectEmergencyArrival} mode="select" />
      
      {selectedEmergencyArrival && (
        <Alert
          severity="info"
          onClose={() => setSelectedEmergencyArrival(null)}
          sx={{ mb: 3, borderRadius: 2, border: '1px solid #91caff', bgcolor: '#e6f4ff' }}
        >
          <strong>🚨 LINKED TO EMERGENCY ARRIVAL: {selectedEmergencyArrival.arrivalCode}</strong> ({selectedEmergencyArrival.tempPatientName || 'Temporary Tag'}).
          Presenting Complaint: <em>"{selectedEmergencyArrival.presentingComplaint}"</em>. Form auto-populated with category: <strong>EMERGENCY</strong>.
        </Alert>
      )}

      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>Patient Registration</Typography>
      
      <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Demographic Fields (* denotes required)</Typography>
              <Divider sx={{ my: 1.5 }} />
            </Grid>

            {/* Profile Photo camera mock */}
            <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Box
                sx={{
                  width: 140, height: 140,
                  borderRadius: 3,
                  border: '2px dashed rgba(0,0,0,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', bgcolor: 'action.hover', mb: 1.5,
                  position: 'relative'
                }}
              >
                {formData.photoUrl ? (
                  <img src={formData.photoUrl} alt="captured avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Person sx={{ fontSize: 48, color: 'text.secondary' }} />
                )}
              </Box>
              <Button size="small" variant="outlined" startIcon={<CameraAlt />} onClick={triggerCamera}>
                Snapshot WebCam
              </Button>
            </Grid>

            {/* Basic Info */}
            <Grid item xs={12} md={9} container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField label="Surname (Last Name) *" fullWidth required name="lastName" value={formData.lastName} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="First Name *" fullWidth required name="firstName" value={formData.firstName} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Middle Name" fullWidth name="middleName" value={formData.middleName} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Sex *</InputLabel>
                  <Select name="gender" value={formData.gender} onChange={handleSelectChange} label="Sex *">
                    <MenuItem value="MALE">Male</MenuItem>
                    <MenuItem value="FEMALE">Female</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Date of Birth" type="date" InputLabelProps={{ shrink: true }} fullWidth name="birthDate" value={formData.birthDate} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Estimated Age (years)"
                  fullWidth
                  name="estimatedAge"
                  value={formData.estimatedAge}
                  onChange={handleTextChange}
                  disabled={!!formData.birthDate}
                  helperText={calculatedAge !== null ? `Calculated age: ${calculatedAge} years` : 'Enter if DOB is unknown'}
                />
              </Grid>
            </Grid>

            {/* Extended Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2 }}>Medical & Government Attributes</Typography>
              <Divider sx={{ my: 1.5 }} />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField label="National ID (NIN) - Optional" fullWidth name="nin" value={formData.nin} onChange={handleTextChange} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Blood Group (optional)</InputLabel>
                <Select name="bloodGroup" value={formData.bloodGroup} onChange={handleSelectChange} label="Blood Group (optional)">
                  <MenuItem value=""><em>— Not specified —</em></MenuItem>
                  <MenuItem value="A_POSITIVE">A+</MenuItem>
                  <MenuItem value="A_NEGATIVE">A-</MenuItem>
                  <MenuItem value="B_POSITIVE">B+</MenuItem>
                  <MenuItem value="B_NEGATIVE">B-</MenuItem>
                  <MenuItem value="AB_POSITIVE">AB+</MenuItem>
                  <MenuItem value="AB_NEGATIVE">AB-</MenuItem>
                  <MenuItem value="O_POSITIVE">O+</MenuItem>
                  <MenuItem value="O_NEGATIVE">O-</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Genotype (optional)</InputLabel>
                <Select name="genotype" value={formData.genotype} onChange={handleSelectChange} label="Genotype (optional)">
                  <MenuItem value=""><em>— Not specified —</em></MenuItem>
                  <MenuItem value="AA">AA</MenuItem>
                  <MenuItem value="AS">AS</MenuItem>
                  <MenuItem value="AC">AC</MenuItem>
                  <MenuItem value="SS">SS</MenuItem>
                  <MenuItem value="SC">SC</MenuItem>
                  <MenuItem value="CC">CC</MenuItem>
                  <MenuItem value="UNKNOWN">Unknown</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Occupation" fullWidth name="occupation" value={formData.occupation} onChange={handleTextChange} />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2 }}>Contact & Address</Typography>
              <Divider sx={{ my: 1.5 }} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Phone Number *"
                fullWidth
                required
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                error={!!phoneError}
                helperText={phoneError || 'Format: 09012345678 (11 digits)'}
                placeholder="09012345678"
                inputProps={{ maxLength: 11 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Email Address"
                fullWidth
                name="email"
                type="email"
                value={formData.email}
                onChange={handleEmailChange}
                error={!!emailError}
                helperText={emailError || 'e.g. patient@example.com'}
                placeholder="patient@example.com"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Spoken Language" fullWidth name="spokenLanguage" value={formData.spokenLanguage} onChange={handleTextChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>State of Origin</InputLabel>
                <Select
                  name="stateOfOrigin"
                  value={formData.stateOfOrigin}
                  onChange={handleStateChange}
                  label="State of Origin"
                  MenuProps={{ PaperProps: { style: { maxHeight: 260 } } }}
                >
                  <MenuItem value=""><em>— Select State —</em></MenuItem>
                  {NIGERIA_STATES_AND_LGAS.map((s: any) => (
                    <MenuItem key={s.state} value={s.state}>{s.state}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={!formData.stateOfOrigin}>
                <InputLabel>LGA (Local Government Area)</InputLabel>
                <Select
                  name="lga"
                  value={formData.lga}
                  onChange={handleSelectChange}
                  label="LGA (Local Government Area)"
                  MenuProps={{ PaperProps: { style: { maxHeight: 260 } } }}
                >
                  <MenuItem value=""><em>— Select LGA —</em></MenuItem>
                  {lgaOptions.map((lga: string) => (
                    <MenuItem key={lga} value={lga}>{lga}</MenuItem>
                  ))}
                </Select>
                {!formData.stateOfOrigin && (
                  <FormHelperText>Select a state first</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Town / City *" fullWidth required name="city" value={formData.city} onChange={handleTextChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Residential Address *" fullWidth required multiline rows={2} name="address" value={formData.address} onChange={handleTextChange} />
            </Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Next of Kin Details</Typography>
              <Divider sx={{ my: 1.5 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Full Name *" fullWidth required name="nokName" value={formData.nokName} onChange={handleTextChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Relationship *</InputLabel>
                <Select name="nokRelationship" value={formData.nokRelationship} onChange={handleSelectChange} label="Relationship *">
                  <MenuItem value="SPOUSE">SPOUSE</MenuItem>
                  <MenuItem value="CHILD">CHILD</MenuItem>
                  <MenuItem value="PARENT">PARENT</MenuItem>
                  <MenuItem value="SIBLING">SIBLING</MenuItem>
                  <MenuItem value="GUARDIAN">GUARDIAN</MenuItem>
                  <MenuItem value="OTHER">OTHER</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Phone Number *"
                fullWidth
                required
                name="nokPhone"
                value={formData.nokPhone}
                onChange={handleNokPhoneChange}
                error={!!nokPhoneError}
                helperText={nokPhoneError || 'Format: 09012345678 (11 digits)'}
                placeholder="09012345678"
                inputProps={{ maxLength: 11 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Residential Address" fullWidth multiline rows={2} name="nokAddress" value={formData.nokAddress} onChange={handleTextChange} />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2 }}>Emergency Contact (If different from NOK)</Typography>
              <Divider sx={{ my: 1.5 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Contact Name" fullWidth name="emergencyName" value={formData.emergencyName} onChange={handleTextChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Relationship</InputLabel>
                <Select name="emergencyRelationship" value={formData.emergencyRelationship} onChange={handleSelectChange} label="Relationship">
                  <MenuItem value="SPOUSE">Spouse</MenuItem>
                  <MenuItem value="PARENT">Parent</MenuItem>
                  <MenuItem value="CHILD">Child</MenuItem>
                  <MenuItem value="SIBLING">Sibling</MenuItem>
                  <MenuItem value="GRANDPARENT">Grandparent</MenuItem>
                  <MenuItem value="UNCLE_AUNT">Uncle / Aunt</MenuItem>
                  <MenuItem value="NEPHEW_NIECE">Nephew / Niece</MenuItem>
                  <MenuItem value="COUSIN">Cousin</MenuItem>
                  <MenuItem value="FRIEND">Friend</MenuItem>
                  <MenuItem value="COLLEAGUE">Colleague</MenuItem>
                  <MenuItem value="NEIGHBOUR">Neighbour</MenuItem>
                  <MenuItem value="GUARDIAN">Guardian</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Phone Number"
                fullWidth
                name="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={handleEmergencyPhoneChange}
                error={!!emergencyPhoneError}
                helperText={emergencyPhoneError || 'Format: 09012345678 (11 digits)'}
                placeholder="09012345678"
                inputProps={{ maxLength: 11 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Contact Address" fullWidth multiline rows={2} name="emergencyAddress" value={formData.emergencyAddress} onChange={handleTextChange} />
            </Grid>
          </Grid>
        )}

        {activeStep === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Registration Tariff & Scheme Settings</Typography>
              <Divider sx={{ my: 1.5 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Registration Category *</InputLabel>
                <Select name="registrationType" value={formData.registrationType} onChange={handleSelectChange} label="Registration Category *">
                  {categories.map(c => (
                    <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Registration Fee Calculation</Typography>
                <Typography variant="h4" fontWeight={900}>₦{getTariffFee().toLocaleString()}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>An invoice will be generated upon completion.</Typography>
              </Box>
            </Grid>

            {/* Review Summary */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 3 }}>Demographic Summary</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={4} sm={2}><Typography variant="body2" color="text.secondary">Name:</Typography></Grid>
                  <Grid item xs={8} sm={10}><Typography variant="body2" fontWeight="bold">{formData.firstName} {formData.middleName} {formData.lastName}</Typography></Grid>
                  <Grid item xs={4} sm={2}><Typography variant="body2" color="text.secondary">DOB / Sex:</Typography></Grid>
                  <Grid item xs={8} sm={10}><Typography variant="body2">{formData.birthDate || 'N/A'} ({formData.gender})</Typography></Grid>
                  <Grid item xs={4} sm={2}><Typography variant="body2" color="text.secondary">Phone:</Typography></Grid>
                  <Grid item xs={8} sm={10}><Typography variant="body2">{formData.phone}</Typography></Grid>
                  <Grid item xs={4} sm={2}><Typography variant="body2" color="text.secondary">Address:</Typography></Grid>
                  <Grid item xs={8} sm={10}><Typography variant="body2">{formData.address}, {formData.city}</Typography></Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        )}

        {activeStep === 3 && (
          <Box sx={{ py: 2 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <CheckCircle color="success" sx={{ fontSize: 60, mb: 1.5 }} />
              <Typography variant="h5" fontWeight={800} mb={0.5}>Patient Registered Successfully!</Typography>
              <Typography variant="body2" color="text.secondary">
                Patient MRN: <strong>{registeredPatient?.patientNumber}</strong> · Demographics file active.
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Left: Insurance Coverage Check */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} mb={2}>Insurance Eligibility Check</Typography>
                    {checkingInsurance ? (
                      <CircularProgress size={24} />
                    ) : insuranceStatus?.hasCoverage ? (
                      <Stack spacing={1.5}>
                        <Alert severity="success" sx={{ borderRadius: 2 }}>
                          Active policy found with <strong>{insuranceStatus.providerName}</strong> ({insuranceStatus.planName})
                        </Alert>
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block">MEMBERSHIP NUMBER</Typography>
                          <Typography variant="body2" fontWeight={700} fontFamily="monospace">{insuranceStatus.membershipNumber}</Typography>
                          
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>PATIENT CO-PAY</Typography>
                          <Typography variant="body2" fontWeight={700} color="warning.main">{insuranceStatus.copayPercentage}%</Typography>
                        </Box>
                      </Stack>
                    ) : (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        No active insurance policy linked to this patient. Direct-pay/Private tariff will be applied.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Right: Quick Visit Check-In */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 3, borderColor: checkedInVisit ? 'success.main' : 'divider' }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} mb={2}>Quick Visit Check-In / Queue Assignment</Typography>
                    {checkedInVisit ? (
                      <Alert severity="success" sx={{ borderRadius: 2 }}>
                        Patient checked in successfully! Visit number: <strong>{checkedInVisit.visitNumber}</strong>
                      </Alert>
                    ) : (
                      <Stack spacing={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Visit Category</InputLabel>
                          <Select value={visitType} label="Visit Category" onChange={e => setVisitType(e.target.value)}>
                            <MenuItem value="OUTPATIENT">Outpatient (OPD)</MenuItem>
                            <MenuItem value="INPATIENT">Inpatient (IPD)</MenuItem>
                            <MenuItem value="PAEDIATRIC">Paediatric Ward</MenuItem>
                            <MenuItem value="EMERGENCY">Emergency (ER)</MenuItem>
                            <MenuItem value="ANC">Antenatal Care (ANC)</MenuItem>
                            <MenuItem value="MATERNITY">Maternity</MenuItem>
                            <MenuItem value="LAB_ONLY">Lab Only</MenuItem>
                            <MenuItem value="RADIOLOGY_ONLY">Radiology Only</MenuItem>
                            <MenuItem value="PHYSIO">Physiotherapy</MenuItem>
                          </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                          <InputLabel>Consultation Service Type</InputLabel>
                          <Select value={selectedServiceId} label="Consultation Service Type" onChange={e => setSelectedServiceId(e.target.value)}>
                            <MenuItem value=""><em>None / Not selected</em></MenuItem>
                            {consultServices.map((svc: any) => (
                              <MenuItem key={svc.id} value={svc.id}>
                                {svc.name} (₦{Number(svc.price).toLocaleString()})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <Button
                          variant="contained"
                          color="primary"
                          onClick={async () => {
                            if (!registeredPatient) return;

                            if (visitType === 'PAEDIATRIC') {
                              let age = 0;
                              if (typeof registeredPatient.age === 'number' && !isNaN(registeredPatient.age) && registeredPatient.age >= 0) {
                                age = registeredPatient.age;
                              } else if (registeredPatient.estimatedAge) {
                                age = parseInt(String(registeredPatient.estimatedAge)) || 0;
                              } else {
                                const rawDob = registeredPatient.dateOfBirth || registeredPatient.birthDate || registeredPatient.dob || formData.birthDate;
                                if (rawDob) {
                                  const dob = new Date(rawDob);
                                  if (!isNaN(dob.getTime())) {
                                    const today = new Date();
                                    age = today.getFullYear() - dob.getFullYear();
                                    const m = today.getMonth() - dob.getMonth();
                                    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                                    age = Math.max(0, age);
                                  }
                                }
                              }

                              if (age > 18) {
                                enqueueSnackbar(`Paediatric Ward check-in is restricted to children & adolescents (Age 0–18 years). Patient ${registeredPatient.firstName || ''} is ${age} years old. Please select Outpatient (OPD), Inpatient (IPD), or Emergency (ER).`, {
                                  variant: 'error',
                                  autoHideDuration: 8000,
                                });
                                return;
                              }
                            }

                            setCheckingIn(true);
                            try {
                              const res = await api.post('/visits', {
                                patientId: registeredPatient.id,
                                visitType,
                                consultationServiceId: selectedServiceId || null,
                                chiefComplaint: null,
                              });
                              setCheckedInVisit(res.data.visit);
                              enqueueSnackbar('Checked in successfully! Patient queue started.', { variant: 'success' });
                            } catch (err: any) {
                              enqueueSnackbar(err.response?.data?.message || 'Check-in failed', { variant: 'error' });
                            } finally {
                              setCheckingIn(false);
                            }
                          }}
                          disabled={checkingIn}
                        >
                          {checkingIn ? 'Checking In...' : 'Confirm Check-In'}
                        </Button>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Action Controls */}
        {activeStep < 3 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, gap: 1.5 }}>
            {activeStep > 0 && (
              <Button onClick={handleBack}>
                Back
              </Button>
            )}
            <Button
              variant="contained"
              onClick={activeStep === 2 ? handleFinalSubmit : handleNext}
              disabled={loading}
            >
              {loading ? <Sync className="spin" /> : activeStep === 2 ? 'Finish Registration' : 'Next Step'}
            </Button>
          </Box>
        )}
      </Card>

      {/* DUPLICATE DETECTION WARNING DIALOG */}
      <Dialog open={showDuplicateDialog} onClose={() => setShowDuplicateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: 'error.light', color: 'error.contrastText' }}>
          ⚠️ Duplicate Patient Records Found
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2.5 }}>
            The system detected patient matches already registered in the Master Patient Index (MPI). Review the details below.
          </Alert>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Patient MRN</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>DOB</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Match Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {duplicateCandidates.map((c, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{c.patientNumber}</TableCell>
                    <TableCell>{c.firstName} {c.lastName}</TableCell>
                    <TableCell>{c.birthDate ? new Date(c.birthDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>
                      <Chip label={`${c.score}% Match`} color={c.score > 70 ? 'error' : 'warning'} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDuplicateDialog(false)} color="inherit">
            Cancel & Correct
          </Button>
          <Button
            onClick={() => { setShowDuplicateDialog(false); setActiveStep(prev => prev + 1); }}
            variant="contained"
            color="error"
          >
            Acknowledge & Force Proceed
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── WEBCAM CAPTURE DIALOG ──────────────────────────────────────────── */}
      <Dialog
        open={webcamOpen}
        onClose={() => { stopCamera(); setWebcamOpen(false); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CameraAlt /> Patient Photo Snapshot
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          {camError ? (
            <Alert severity="error" sx={{ mt: 1 }}>{camError}</Alert>
          ) : (
            <Box
              sx={{
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: '#000',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }}
              />
            </Box>
          )}
          {/* Hidden canvas used to extract the still frame */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Position the patient's face in the frame, then click "Take Snapshot".
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => { stopCamera(); setWebcamOpen(false); }}
            color="inherit"
          >
            Cancel
          </Button>
          {camError ? (
            <Button variant="outlined" onClick={startCamera}>
              Retry Camera
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<CameraAlt />}
              onClick={captureSnapshot}
              sx={{ px: 3 }}
            >
              Take Snapshot
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Male warning dialog for Labour & Delivery */}
      <Dialog open={maleWarningOpen} onClose={() => setMaleWarningOpen(false)}>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>Invalid Registration Category</DialogTitle>
        <DialogContent dividers>
          <Typography>
            A male patient cannot be enrolled to the Labour and Delivery ward. Please choose a different registration category or change the patient's gender to Female.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMaleWarningOpen(false)} variant="contained" color="error">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PatientRegistration;
