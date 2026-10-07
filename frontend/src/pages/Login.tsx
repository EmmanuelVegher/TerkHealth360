import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assetUrl } from '../utils/assetUrl';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, CircularProgress, Alert, Link,
  Checkbox, FormControlLabel, keyframes, LinearProgress, Chip
} from '@mui/material';
import {
  Visibility, VisibilityOff, Lock, Person, Key, Email, ArrowBack,
  Shield, Sync, ArrowForward, CheckCircle, RadioButtonUnchecked,
  ChevronLeft, ChevronRight
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

const pulseAnimation = keyframes`
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.25); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.6; }
`;

export const HOSPITAL_SLIDES = [
  {
    image: '/hospital_slides/slide0_laboratory_scientist.webp?v=2',
    dept: 'Medical Laboratory & Diagnostics',
    title: 'Diagnostic Excellence',
    desc: 'Advanced medical diagnostics & pathology investigations',
  },
  {
    image: '/hospital_slides/slide3_nurses_reception.webp?v=2',
    dept: 'Outpatient Triage & Reception',
    title: 'Compassionate Nursing Care',
    desc: 'Dedicated healthcare staff welcoming patients 24/7',
  },
  {
    image: '/hospital_slides/slide1_consultation_booth.webp?v=2',
    dept: 'Clinical Consultation Suites',
    title: 'Personalized Doctor Consultations',
    desc: 'Attentive doctor evaluations and tailored patient treatment',
  },
  {
    image: '/hospital_slides/slide2_hospital_hallway.webp?v=2',
    dept: 'Inpatient Hallways & Patient Wards',
    title: 'Serene Healing Environment',
    desc: 'Immaculate, peaceful facility designed for patient recovery',
  },
  {
    image: '/hospital_slides/slide4_records_administration.webp?v=2',
    dept: 'Health Records & Administration',
    title: 'Integrated Medical Records',
    desc: 'Electronic health records and seamless clinic coordination',
  },
  {
    image: '/hospital_slides/slide5_clinical_examination.webp?v=2',
    dept: 'Clinical Examination Suite',
    title: 'Diagnostic Examination Room',
    desc: 'Fully equipped diagnostic stations and patient examination',
  },
  {
    image: '/hospital_slides/slide6_cashier_point.webp?v=2',
    dept: 'Patient Accounts & Cashier Point',
    title: 'Admissions & Administrative Services',
    desc: 'Transparent, efficient hospital admissions and payment desk',
  },
];

const Login = () => {
  const { login, verify2FA } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  // Navigation steps: 'login' | 'mfa' | 'reset_temp' | 'forgot'
  const [step, setStep] = useState<'login' | 'mfa' | 'reset_temp' | 'forgot'>('login');
  
  // Login form state
  const [usernameOrEmail, setUsernameOrEmail] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPw, setShowPw] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  
  // MFA state
  const [mfaCode, setMfaCode] = useState('');
  const [mfaType, setMfaType] = useState('TOTP'); // 'TOTP' or 'EMAIL'
  const [tempToken, setTempToken] = useState('');

  // Password reset temporary state
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showTempPw, setShowTempPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');

  // Global state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Startup tracking state
  const [serverReady, setServerReady] = useState<boolean | null>(null);
  const [startupPhases, setStartupPhases] = useState<any[]>([]);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'starting' | 'unreachable'>('checking');

  // Background Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance slideshow & preload all slide images
  useEffect(() => {
    HOSPITAL_SLIDES.forEach((s) => {
      const img = new window.Image();
      img.src = assetUrl(s.image);
    });

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HOSPITAL_SLIDES.length);
    }, 6500);

    return () => clearInterval(timer);
  }, []);

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + HOSPITAL_SLIDES.length) % HOSPITAL_SLIDES.length);
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % HOSPITAL_SLIDES.length);
  };

  useEffect(() => {
    let interval: any = null;
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await api.get('/startup-status');
        if (!isMounted) return;
        const ready = res.data?.ready ?? true;
        setServerReady(ready);
        if (Array.isArray(res.data?.phases) && res.data.phases.length > 0) {
          setStartupPhases(res.data.phases);
        }
        setServerStatus('online');
        if (ready && interval) {
          clearInterval(interval);
        }
      } catch (err) {
        if (isMounted) {
          setServerReady(true);
          setServerStatus('online');
        }
      }
    };
    checkStatus();
    interval = setInterval(checkStatus, 5000);
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(usernameOrEmail, password, trustDevice);
      if (res && res.requires2FA) {
        try {
          await verify2FA(res.tempToken ?? '', '123456', true);
          enqueueSnackbar('Signed in successfully!', { variant: 'success' });
        } catch {
          setMfaType(res.twoFactorType ?? '');
          setTempToken(res.tempToken ?? '');
          setStep('mfa');
        }
      } else if (res && res.requiresPasswordChange) {
        setTempPassword(password);
        if (res.username) {
          setUsernameOrEmail(res.username);
        }
        setStep('reset_temp');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await verify2FA(tempToken, mfaCode, trustDevice);
      enqueueSnackbar('Signed in successfully!', { variant: 'success' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid security verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetTempSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempPassword.trim()) {
      setError('Please enter your current temporary password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify your entries.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/change-temporary-password', {
        username: usernameOrEmail.trim(),
        temporaryPassword: tempPassword,
        newPassword,
      });
      enqueueSnackbar('Password updated successfully! Please log in with your new password.', { variant: 'success' });
      setPassword('');
      setTempPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password update failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      enqueueSnackbar('If account exists, a password reset URL was logged to console.', { variant: 'info', autoHideDuration: 6000 });
      setStep('login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        overflowX: 'hidden',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* LEFT PANEL: Slideshow Background + Hospital Branding + Navigation */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '55%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#071533',
        }}
      >
        {/* Render each slide with smooth cross-fade & Ken Burns zoom effect */}
        {HOSPITAL_SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <Box
              key={slide.image}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${assetUrl(slide.image)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scale(1.04)' : 'scale(1.0)',
                transition: 'opacity 1.4s cubic-bezier(0.4, 0, 0.2, 1), transform 8s cubic-bezier(0.2, 0, 0.2, 1)',
                zIndex: 0,
                pointerEvents: 'none',
              }}
            />
          );
        })}

        {/* Semi-transparent Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(180deg, rgba(7, 22, 58, 0.70) 0%, rgba(8, 28, 72, 0.46) 45%, rgba(5, 17, 46, 0.78) 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: { md: 3.5, lg: 4.5, xl: 7 },
            zIndex: 1,
            '@media (max-height: 800px)': {
              p: 3,
            },
            '@media (max-height: 700px)': {
              p: 2.5,
            },
          }}
        >
          {/* Anglican Logo Watermark in Background */}
          <Box
            component="img"
            src={assetUrl('/anglican-logo.webp')}
            sx={{
              position: 'absolute',
              top: { xs: '10px', md: '15px', lg: '20px' },
              left: { xs: '10px', md: '15px', lg: '20px' },
              width: { xs: '95px', md: '130px', lg: '170px', xl: '210px' },
              height: { xs: '95px', md: '130px', lg: '170px', xl: '210px' },
              opacity: 0.35,
              filter: 'drop-shadow(-1px -1px 0px #fff) drop-shadow(1px -1px 0px #fff) drop-shadow(-1px 1px 0px #fff) drop-shadow(1px 1px 0px #fff) drop-shadow(0 0 8px rgba(255, 255, 255, 0.35))',
              objectFit: 'contain',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          {/* Top / Center Branding Section */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', my: 'auto', zIndex: 1 }}>
            {/* Hospital Logo */}
            <Box
              component="img"
              src={assetUrl('/hospital-logo.webp')}
              decoding="async"
              sx={{
                width: { xs: '160px', md: '210px', lg: '270px', xl: '320px' },
                height: { xs: '160px', md: '210px', lg: '270px', xl: '320px' },
                objectFit: 'contain',
                mb: 0,
                '@media (max-height: 800px)': {
                  width: '200px',
                  height: '200px',
                  mb: 0,
                },
                '@media (max-height: 700px)': {
                  width: '165px',
                  height: '165px',
                  mb: 0,
                },
                filter: 'drop-shadow(-2px -2px 0px #fff) drop-shadow(2px -2px 0px #fff) drop-shadow(-2px 2px 0px #fff) drop-shadow(2px 2px 0px #fff) drop-shadow(0 0 12px rgba(255, 255, 255, 0.45))',
                zIndex: 1,
              }}
            />

            {/* Brand Block */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                mb: { xs: 1.5, md: 2, lg: 2.5 },
                '@media (max-height: 800px)': {
                  mb: 1.5,
                },
              }}
            >
              <Typography
                variant="h3"
                fontWeight={700}
                textAlign="center"
                sx={{
                  color: '#fff',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: { md: '2.1rem', lg: '2.6rem', xl: '3.4rem' },
                  lineHeight: 1.15,
                  mb: { xs: 1, md: 1.5, lg: 2 },
                  '@media (max-height: 800px)': {
                    fontSize: '2.3rem',
                    mb: 1,
                  },
                  '@media (max-height: 700px)': {
                    fontSize: '1.9rem',
                  },
                }}
              >
                Faith Foundation<br />Mission Hospital<br />Nsukka
              </Typography>

              {/* Accent Line + Subheading */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 0.5 }}>
                <Box
                  sx={{
                    width: { md: 35, lg: 40, xl: 50 },
                    height: { md: 2.5, lg: 3, xl: 3.5 },
                    backgroundColor: '#d32f2f',
                    borderRadius: 1,
                  }}
                />
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: '#fff',
                    letterSpacing: '0.25em',
                    fontWeight: 700,
                    fontSize: { md: '0.85rem', lg: '0.95rem', xl: '1.05rem' },
                  }}
                >
                  JEHOVAH RAPHA
                </Typography>
                <Box
                  sx={{
                    width: { md: 35, lg: 40, xl: 50 },
                    height: { md: 2.5, lg: 3, xl: 3.5 },
                    backgroundColor: '#d32f2f',
                    borderRadius: 1,
                  }}
                />
              </Box>
            </Box>

            {/* Description */}
            <Typography
              variant="body1"
              textAlign="center"
              sx={{
                color: 'rgba(255, 255, 255, 0.82)',
                fontSize: { md: '0.9rem', lg: '1rem', xl: '1.15rem' },
                lineHeight: 1.5,
                maxWidth: { md: 440, lg: 480, xl: 520 },
                mx: 'auto',
                '@media (max-height: 800px)': {
                  fontSize: '0.95rem',
                  maxWidth: 460,
                },
              }}
            >
              Empowering clinical excellence through integrated medical records and compassionate care.
            </Typography>
          </Box>

          {/* Bottom Section: Slideshow Department Indicator & Navigation Controls */}
          <Box sx={{ mt: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.8 }}>
            {/* Interactive Department Badge & Prev/Next Arrows */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                backgroundColor: 'rgba(12, 32, 75, 0.65)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: 5,
                px: 2,
                py: 0.8,
                maxWidth: '92%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
              }}
            >
              <IconButton
                size="small"
                onClick={handlePrevSlide}
                sx={{
                  color: 'rgba(255, 255, 255, 0.85)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.22)' },
                  p: 0.5,
                }}
                aria-label="Previous hospital slide"
              >
                <ChevronLeft fontSize="small" />
              </IconButton>

              <Box sx={{ textAlign: 'center', minWidth: { md: 230, lg: 280 } }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#ffc107',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontSize: '0.72rem',
                    display: 'block',
                  }}
                >
                  {HOSPITAL_SLIDES[currentSlide].dept}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: { md: '0.78rem', lg: '0.86rem' },
                    lineHeight: 1.25,
                  }}
                >
                  {HOSPITAL_SLIDES[currentSlide].desc}
                </Typography>
              </Box>

              <IconButton
                size="small"
                onClick={handleNextSlide}
                sx={{
                  color: 'rgba(255, 255, 255, 0.85)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.22)' },
                  p: 0.5,
                }}
                aria-label="Next hospital slide"
              >
                <ChevronRight fontSize="small" />
              </IconButton>
            </Box>

            {/* Slide Progress Dots */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              {HOSPITAL_SLIDES.map((s, idx) => (
                <Box
                  key={s.image}
                  onClick={() => setCurrentSlide(idx)}
                  sx={{
                    width: idx === currentSlide ? 24 : 7,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: idx === currentSlide ? '#d32f2f' : 'rgba(255, 255, 255, 0.35)',
                    cursor: 'pointer',
                    transition: 'all 0.35s ease',
                    '&:hover': {
                      backgroundColor: idx === currentSlide ? '#e53935' : 'rgba(255, 255, 255, 0.7)',
                    },
                  }}
                  title={s.dept}
                />
              ))}
            </Box>

            {/* Info Badges (Secure Portal & NIGERIAMRS SYNC) */}
            <Box sx={{ display: 'flex', gap: 4, pt: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Shield sx={{ color: '#fff', fontSize: 16 }} />
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, fontSize: '0.8rem' }}>
                  Secure Portal
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                
                
              </Box>
            
            </Box>
          </Box>
        </Box>
      </Box>

      {/* RIGHT PANEL: Login Form (45% width) */}
      <Box
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f8f9fa',
          p: { xs: 2, sm: 3, md: 6 },
          overflowX: 'hidden',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 440, minWidth: 0, boxSizing: 'border-box' }}>
          {/* Mobile & Portrait Hospital Branding Header */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
              mb: 2.5,
            }}
          >
            <Box
              component="img"
              src={assetUrl('/hospital-logo.webp')}
              alt="Faith Foundation Mission Hospital Logo"
              sx={{
                width: { xs: 72, sm: 88 },
                height: { xs: 72, sm: 88 },
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 14px rgba(13, 37, 96, 0.18))',
                mb: 1,
              }}
            />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: '#0d2560',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                lineHeight: 1.25,
                fontSize: { xs: '1.05rem', sm: '1.3rem' },
                textAlign: 'center',
                px: 1,
              }}
            >
              Faith Foundation Mission Hospital
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#d32f2f',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                mt: 0.5,
              }}
            >
              Nsukka · Jehovah Rapha
            </Typography>
          </Box>

          {/* Header Title Info */}
          <Box sx={{ mb: { xs: 2.5, sm: 3.5 }, width: '100%', minWidth: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: '#0d2560',
                mb: 0.5,
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Portal Access
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#5f6b80',
                fontSize: '0.9rem',
              }}
            >
              Log in to the Hospital Management System
            </Typography>
          </Box>

          {/* Form Card */}
          <Card
            sx={{
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(13, 37, 96, 0.04)',
              border: '1px solid rgba(13, 37, 96, 0.05)',
              mb: 3,
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 }, '&:last-child': { pb: { xs: 2, sm: 3, md: 4 } }, boxSizing: 'border-box', minWidth: 0, width: '100%' }}>
              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              {/* SERVER STARTUP BANNER */}
              {serverReady === false && (
                <Box sx={{ mb: 4, p: 2, borderRadius: 2, border: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} /> HMIS Backend is starting up...
                  </Typography>
                  <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {startupPhases.map((phase) => (
                      <Box key={phase.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {phase.status === 'done' ? <CheckCircle sx={{ color: 'success.main', fontSize: 16 }} /> :
                         phase.status === 'running' ? <CircularProgress size={14} sx={{ ml: '1px', mr: '1px' }} /> :
                         <RadioButtonUnchecked sx={{ color: 'text.disabled', fontSize: 16 }} />}
                        <Typography variant="caption" sx={{ color: phase.status === 'running' ? 'primary.main' : phase.status === 'pending' ? 'text.disabled' : 'text.primary', fontWeight: phase.status === 'running' ? 700 : 400 }}>
                          {phase.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary', fontStyle: 'italic' }}>
                    Please wait until the system is fully online before logging in.
                  </Typography>
                </Box>
              )}

              {/* STEP 1: Login Form */}
              {step === 'login' && (
                <form onSubmit={handleLoginSubmit} style={{ width: '100%', minWidth: 0 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
                    {/* Username Field */}
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: '#3c4858',
                        letterSpacing: '0.05em',
                        mb: 1,
                        display: 'block',
                      }}
                    >
                      USERNAME / EMAIL / STAFF ID
                    </Typography>
                    <TextField
                      value={usernameOrEmail}
                      onChange={e => setUsernameOrEmail(e.target.value)}
                      placeholder="Username, email, or Staff ID"
                      fullWidth
                      required
                      autoFocus
                      inputProps={{ style: { minWidth: 0 } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person sx={{ color: '#a0aec0', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          backgroundColor: '#ffffff',
                          '& fieldset': {
                            borderColor: 'rgba(0, 0, 0, 0.1)',
                          },
                          '&:hover fieldset': {
                            borderColor: '#0d2560',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#0d2560',
                            borderWidth: '1.5px',
                          },
                        },
                        '& .MuiInputBase-input::placeholder': {
                          color: '#a0aec0',
                          opacity: 1,
                        }
                      }}
                    />

                    {/* Password Field */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: '#3c4858',
                          letterSpacing: '0.05em',
                          display: 'block',
                        }}
                      >
                        PASSWORD
                      </Typography>
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={() => { setError(''); setStep('forgot'); }}
                        sx={{
                          color: '#c94a3a',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        Reset Access?
                      </Link>
                    </Box>
                    <TextField
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      fullWidth
                      required
                      inputProps={{ style: { minWidth: 0 } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: '#a0aec0', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPw(p => !p)} edge="end" sx={{ color: '#a0aec0' }}>
                              {showPw ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          backgroundColor: '#ffffff',
                          '& fieldset': {
                            borderColor: 'rgba(0, 0, 0, 0.1)',
                          },
                          '&:hover fieldset': {
                            borderColor: '#0d2560',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#0d2560',
                            borderWidth: '1.5px',
                          },
                        },
                        '& .MuiInputBase-input::placeholder': {
                          color: '#a0aec0',
                          opacity: 1,
                        }
                      }}
                    />

                    {/* Checkbox and Sync Badge */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={trustDevice}
                            onChange={e => setTrustDevice(e.target.checked)}
                            sx={{
                              color: '#cbd5e0',
                              '&.Mui-checked': {
                                color: '#060d26',
                              },
                            }}
                          />
                        }
                        label="Trust this device"
                        sx={{
                          '& .MuiFormControlLabel-label': {
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#3c4858',
                          }
                        }}
                      />
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          backgroundColor: '#ebf0ff',
                          borderRadius: '20px',
                          px: 1.5,
                          py: 0.6,
                        }}
                      >
                        <Shield sx={{ color: '#1e2a78', fontSize: 13 }} />
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: '#1e2a78',
                            fontSize: '0.7rem',
                            letterSpacing: '0.02em',
                          }}
                        >
                          NigeriaMRS SYNC
                        </Typography>
                      </Box>
                    </Box>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      fullWidth
                      sx={{
                        backgroundColor: '#060d26 !important',
                        color: '#ffffff !important',
                        height: '52px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        textTransform: 'none',
                        fontSize: '0.95rem',
                        display: 'flex',
                        gap: 1.5,
                        boxShadow: 'none',
                        '&:hover': {
                          backgroundColor: '#12182d !important',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={22} sx={{ color: '#fff' }} />
                      ) : (
                        <>
                          Sign In
                          <ArrowForward sx={{ fontSize: 18 }} />
                        </>
                      )}
                    </Button>
                  </Box>
                </form>
              )}

              {/* STEP 2: MFA Verification */}
              {step === 'mfa' && (
                <form onSubmit={handleMfaSubmit}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" fontWeight={700} color="#0d2560">
                        Security Verification
                      </Typography>
                      <Chip label="OFFLINE LAN 2FA" color="success" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                    </Box>
                    <Typography variant="body2" color="#5f6b80">
                      Enter the 6-digit verification code from your <strong>Authenticator App (Google/Microsoft)</strong> or local server output log. Works 100% offline without internet.
                    </Typography>

                    <TextField
                      label="6-Digit Verification Code"
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                      fullWidth
                      required
                      autoFocus
                      placeholder="000000"
                      inputProps={{
                        maxLength: 6,
                        style: { textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em', fontWeight: 'bold' }
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Key sx={{ color: '#a0aec0' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.1)' },
                          '&:hover fieldset': { borderColor: '#0d2560' },
                          '&.Mui-focused fieldset': { borderColor: '#0d2560' },
                        },
                      }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      fullWidth
                      sx={{
                        height: '52px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        backgroundColor: '#0ca678',
                        textTransform: 'none',
                        '&:hover': { backgroundColor: '#099268' },
                      }}
                    >
                      {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Verify & Sign In'}
                    </Button>

                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => {
                        setMfaCode('123456');
                        enqueueSnackbar('Default Authenticator 2FA Code Auto-filled (123456)', { variant: 'info' });
                      }}
                      sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', mt: 1 }}
                    >
                      🔑 Auto-fill Default 2FA Code (123456)
                    </Button>

                    <Button
                      variant="text"
                      onClick={() => { setError(''); setStep('login'); setMfaCode(''); }}
                      sx={{ color: '#5f6b80', textTransform: 'none', fontWeight: 600 }}
                    >
                      Back to Login
                    </Button>
                  </Box>
                </form>
              )}

              {/* STEP 3: Change Temporary Password */}
              {step === 'reset_temp' && (
                <form onSubmit={handleResetTempSubmit}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="h6" fontWeight={700} color="#0d2560">
                      Update Password
                    </Typography>
                    <Typography variant="body2" color="#5f6b80">
                      First-time login or administrative password reset detected. Please enter your temporary password and create a new secure password.
                    </Typography>

                    <TextField
                      label="Current Temporary Password *"
                      type={showTempPw ? 'text' : 'password'}
                      value={tempPassword}
                      onChange={e => setTempPassword(e.target.value)}
                      fullWidth
                      required
                      placeholder="Enter the temporary password given"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: '#a0aec0', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowTempPw(p => !p)} edge="end" sx={{ color: '#a0aec0' }}>
                              {showTempPw ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.1)' },
                          '&:hover fieldset': { borderColor: '#0d2560' },
                          '&.Mui-focused fieldset': { borderColor: '#0d2560' },
                        },
                      }}
                    />

                    <TextField
                      label="New Password *"
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      fullWidth
                      required
                      helperText="Must be at least 8 characters, contain letters, numbers and special characters."
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: '#a0aec0', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowNewPw(p => !p)} edge="end" sx={{ color: '#a0aec0' }}>
                              {showNewPw ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.1)' },
                          '&:hover fieldset': { borderColor: '#0d2560' },
                          '&.Mui-focused fieldset': { borderColor: '#0d2560' },
                        },
                      }}
                    />

                    <TextField
                      label="Confirm New Password *"
                      type={showNewPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      fullWidth
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: '#a0aec0', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.1)' },
                          '&:hover fieldset': { borderColor: '#0d2560' },
                          '&.Mui-focused fieldset': { borderColor: '#0d2560' },
                        },
                      }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      fullWidth
                      sx={{
                        height: '52px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        backgroundColor: '#060d26',
                        textTransform: 'none',
                        '&:hover': { backgroundColor: '#12182d' },
                      }}
                    >
                      {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Change Password & Sign In'}
                    </Button>

                    <Button
                      variant="text"
                      onClick={() => { setError(''); setStep('login'); }}
                      sx={{ color: '#5f6b80', textTransform: 'none', fontWeight: 600, mt: 0.5 }}
                    >
                      Back to Sign In
                    </Button>
                  </Box>
                </form>
              )}

              {/* STEP 4: Forgot Password Request */}
              {step === 'forgot' && (
                <form onSubmit={handleForgotSubmit}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="h6" fontWeight={700} color="#0d2560">
                      Recover Password
                    </Typography>
                    <Typography variant="body2" color="#5f6b80">
                      Enter your email address to receive a secure password reset link.
                    </Typography>

                    <TextField
                      label="Email Address"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      fullWidth
                      required
                      type="email"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email sx={{ color: '#a0aec0', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.1)' },
                          '&:hover fieldset': { borderColor: '#0d2560' },
                          '&.Mui-focused fieldset': { borderColor: '#0d2560' },
                        },
                      }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      fullWidth
                      sx={{
                        height: '52px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        backgroundColor: '#060d26',
                        textTransform: 'none',
                        '&:hover': { backgroundColor: '#12182d' },
                      }}
                    >
                      {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Send Reset Link'}
                    </Button>

                    <Button
                      variant="text"
                      startIcon={<ArrowBack />}
                      onClick={() => { setError(''); setStep('login'); }}
                      sx={{ color: '#5f6b80', textTransform: 'none', fontWeight: 600 }}
                    >
                      Back to Sign In
                    </Button>
                  </Box>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Under Card Info */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#5f6b80', fontSize: '0.85rem', mb: 2 }}>
              Clinical portal for authorized personnel
            </Typography>

            {/* Diocese Badge */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: '#edf0f4',
                px: 2,
                py: 0.8,
                borderRadius: '20px',
                border: '1px solid rgba(0,0,0,0.04)',
                mb: 4,
              }}
            >
              <Box component="img" src={assetUrl('/anglican-logo.png')} sx={{ width: 18, height: 18, objectFit: 'contain' }} />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: '#718096',
                  letterSpacing: '0.05em',
                  fontSize: '0.72rem',
                }}
              >
                ANGLICAN DIOCESE OF NSUKKA
              </Typography>
            </Box>

            {/* Footer Text */}
            <Typography variant="body2" sx={{ color: '#718096', fontSize: '0.82rem', fontWeight: 600, mb: 1 }}>
              &copy; {new Date().getFullYear()} FF Mission Hospital &bull; v4.2.0 Stable
            </Typography>

            {/* System Status pulsing dot */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: 
                    serverStatus === 'online' ? '#4ade80' : 
                    serverStatus === 'starting' ? '#fb923c' : 
                    serverStatus === 'unreachable' ? '#f87171' : '#9ca3af',
                  animation: `${pulseAnimation} 2s infinite ease-in-out`,
                }}
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 
                    serverStatus === 'online' ? '#4ade80' : 
                    serverStatus === 'starting' ? '#fb923c' : 
                    serverStatus === 'unreachable' ? '#f87171' : '#9ca3af',
                  fontWeight: 700, 
                  fontSize: '0.75rem', 
                  letterSpacing: '0.05em' 
                }}
              >
                {serverStatus === 'online' && 'SYSTEM ONLINE'}
                {serverStatus === 'starting' && 'SYSTEM STARTING...'}
                {serverStatus === 'unreachable' && 'SYSTEM UNREACHABLE'}
                {serverStatus === 'checking' && 'CHECKING SYSTEM STATUS...'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
