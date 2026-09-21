import { useState } from 'react';
import {
  Container, Typography, Paper, Grid, Avatar, Box, Stack, Button, Divider,
  TextField, Chip, Alert, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, InputAdornment, IconButton, List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  Person, Email, Badge, Lock, Visibility, VisibilityOff, Save, Shield,
  CheckCircle, Phone, Business, AdminPanelSettings, Key, Edit,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

const MyProfile = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Password change state
  const [openPwdDialog, setOpenPwdDialog] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');

  // 2FA TOTP QR Code state
  const [open2FAData, setOpen2FAData] = useState<any>(null);
  const [open2FADialog, setOpen2FADialog] = useState(false);
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);

  const handleFetch2FASetup = async () => {
    try {
      const res = await api.post('/auth/2fa/setup');
      setOpen2FAData(res.data);
      setOpen2FADialog(true);
    } catch (err: any) {
      enqueueSnackbar('Failed to load 2FA setup QR Code.', { variant: 'error' });
    }
  };

  const handleEnableTOTP = async () => {
    if (!totpVerifyCode || totpVerifyCode.length !== 6) {
      enqueueSnackbar('Enter valid 6-digit code', { variant: 'warning' });
      return;
    }
    setTotpLoading(true);
    try {
      await api.post('/auth/2fa/enable', { code: totpVerifyCode });
      enqueueSnackbar('TOTP Authenticator 2FA enabled successfully!', { variant: 'success' });
      setOpen2FADialog(false);
      setTotpVerifyCode('');
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Invalid code', { variant: 'error' });
    } finally {
      setTotpLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPwdError('');
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('All fields are required.');
      return;
    }
    if (newPwd.length < 8) {
      setPwdError('New password must be at least 8 characters.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('New password and confirm password do not match.');
      return;
    }
    setPwdLoading(true);
    try {
      await api.patch('/users/me/password', { currentPassword: currentPwd, newPassword: newPwd });
      enqueueSnackbar('Password changed successfully.', { variant: 'success' });
      setOpenPwdDialog(false);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err: any) {
      setPwdError(err.response?.data?.message || 'Failed to change password. Check your current password.');
    } finally {
      setPwdLoading(false);
    }
  };

  if (!user) return (
    <Container sx={{ py: 6, textAlign: 'center' }}>
      <CircularProgress />
    </Container>
  );

  const fullName = `${user.firstName} ${user.lastName}`;
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} mb={4}>My Profile</Typography>

      <Grid container spacing={3}>
        {/* Left — Identity Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <Avatar
              src={user.profilePicture || undefined}
              sx={{
                width: 100, height: 100,
                background: 'linear-gradient(135deg, #1e2a78 0%, #3b5bdb 100%)',
                fontSize: 36, fontWeight: 800,
                mx: 'auto', mb: 2,
              }}
            >
              {initials}
            </Avatar>
            <Typography variant="h5" fontWeight={800}>{fullName}</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>@{user.username}</Typography>
            <Chip
              icon={<AdminPanelSettings />}
              label={user.role}
              color="primary"
              sx={{ fontWeight: 700, mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1.5} textAlign="left">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Email fontSize="small" color="action" />
                <Typography variant="body2">{user.email}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Badge fontSize="small" color="action" />
                <Typography variant="body2" fontFamily="monospace">{user.id.slice(0, 8).toUpperCase()}</Typography>
              </Box>
              {user.departments?.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Business fontSize="small" color="action" sx={{ mt: 0.3 }} />
                  <Box>
                    {user.departments.map((d) => (
                      <Chip key={d.id} label={d.name} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5, fontSize: 11 }} />
                    ))}
                  </Box>
                </Box>
              )}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1.5}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<Shield />}
                onClick={handleFetch2FASetup}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Scan 2FA Authenticator QR Code
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Lock />}
                onClick={() => { setPwdError(''); setOpenPwdDialog(true); }}
                sx={{ borderRadius: 2 }}
              >
                Change Password
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Right — Details */}
        <Grid item xs={12} md={8}>
          {/* Account Details */}
          <Paper sx={{ p: 4, borderRadius: 3, mb: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={3}>
              <Person color="primary" />
              <Typography variant="h6" fontWeight={700}>Account Information</Typography>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  value={user.firstName}
                  fullWidth
                  size="small"
                  InputProps={{ readOnly: true }}
                  variant="filled"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  value={user.lastName}
                  fullWidth
                  size="small"
                  InputProps={{ readOnly: true }}
                  variant="filled"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Username"
                  value={user.username}
                  fullWidth
                  size="small"
                  InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start">@</InputAdornment> }}
                  variant="filled"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  value={user.email}
                  fullWidth
                  size="small"
                  InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment> }}
                  variant="filled"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Role"
                  value={user.role}
                  fullWidth
                  size="small"
                  InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start"><AdminPanelSettings fontSize="small" /></InputAdornment> }}
                  variant="filled"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="2FA Status"
                  value={user.twoFactorEnabled ? `Enabled (${user.twoFactorType})` : 'Disabled'}
                  fullWidth
                  size="small"
                  InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start"><Shield fontSize="small" /></InputAdornment> }}
                  variant="filled"
                />
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }} icon={<Edit fontSize="small" />}>
              To update your name, email, or profile picture, please contact your system administrator.
            </Alert>
          </Paper>

          {/* Permissions */}
          <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={3}>
              <Key color="primary" />
              <Typography variant="h6" fontWeight={700}>Assigned Permissions</Typography>
              <Chip label={user.permissions?.length ?? 0} size="small" color="primary" sx={{ ml: 'auto' }} />
            </Stack>

            {user.permissions?.length === 0 ? (
              <Alert severity="warning">No explicit permissions assigned. Role-based permissions apply.</Alert>
            ) : (
              <Box sx={{
                display: 'flex', flexWrap: 'wrap', gap: 0.8,
                maxHeight: 240, overflowY: 'auto',
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
              }}>
                {user.permissions?.map((perm) => (
                  <Chip
                    key={perm}
                    label={perm}
                    size="small"
                    icon={<CheckCircle />}
                    variant="outlined"
                    color="success"
                    sx={{ fontSize: 11, fontFamily: 'monospace' }}
                  />
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog open={openPwdDialog} onClose={() => setOpenPwdDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {pwdError && <Alert severity="error">{pwdError}</Alert>}

            <TextField
              label="Current Password *"
              type={showCurrent ? 'text' : 'password'}
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowCurrent(v => !v)}>
                      {showCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="New Password *"
              type={showNew ? 'text' : 'password'}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              fullWidth
              size="small"
              helperText="Minimum 8 characters"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowNew(v => !v)}>
                      {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Confirm New Password *"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              fullWidth
              size="small"
              error={confirmPwd.length > 0 && confirmPwd !== newPwd}
              helperText={confirmPwd.length > 0 && confirmPwd !== newPwd ? 'Passwords do not match' : ''}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowConfirm(v => !v)}>
                      {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPwdDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={pwdLoading ? <CircularProgress size={14} color="inherit" /> : <Save />}
            onClick={handleChangePassword}
            disabled={pwdLoading}
          >
            {pwdLoading ? 'Saving...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2FA Authenticator QR Code Setup Dialog */}
      <Dialog open={open2FADialog} onClose={() => setOpen2FADialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
          📱 Scan 2FA Authenticator QR Code
        </DialogTitle>
        <DialogContent dividers>
          {open2FAData ? (
            <Stack spacing={2} alignItems="center" textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Scan this QR code with <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, <strong>Authy</strong>, or <strong>Aegis</strong> on your phone. Works 100% offline without internet.
              </Typography>

              {open2FAData.qrCodeUrl ? (
                <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 3, border: '2px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                  <img src={open2FAData.qrCodeUrl} alt="2FA QR Code" style={{ width: 200, height: 200, display: 'block' }} />
                </Box>
              ) : (
                <CircularProgress size={30} />
              )}

              <Box sx={{ width: '100%', bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                <Typography variant="caption" color="text.secondary" display="block">Base32 Secret (Manual Key Entry):</Typography>
                <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e3a8a', wordBreak: 'break-all' }}>
                  {open2FAData.secret}
                </Typography>
              </Box>

              <TextField
                label="Enter 6-Digit Code from Phone App"
                size="small"
                fullWidth
                value={totpVerifyCode}
                onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                placeholder="000000"
                inputProps={{ maxLength: 6, style: { textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '0.15em' } }}
              />
            </Stack>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen2FADialog(false)}>Close</Button>
          <Button
            variant="contained"
            color="success"
            disabled={totpLoading || totpVerifyCode.length !== 6}
            onClick={handleEnableTOTP}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {totpLoading ? <CircularProgress size={16} color="inherit" /> : 'Verify & Enable TOTP'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyProfile;
