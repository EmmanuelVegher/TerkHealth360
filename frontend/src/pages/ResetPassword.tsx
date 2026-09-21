import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, CircularProgress, Alert,
} from '@mui/material';
import { Visibility, VisibilityOff, Lock, ArrowBack } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

const ResetPassword = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid reset link token.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      enqueueSnackbar('Password reset successfully! Log in with your new password.', { variant: 'success' });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0d1550 0%, #1e2a78 50%, #162068 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, px: 2 }}>
        <Card
          sx={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 4,
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight={700} mb={1} color="text.primary">
              Set New Password
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Please enter your new secure password below.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {!token ? (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Missing reset token. Please request a new link.
              </Alert>
            ) : (
              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="New Password"
                    type={showPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    fullWidth
                    required
                    autoFocus
                    helperText="Password must be at least 8 characters and include mixed cases, numbers, and special symbols."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPw(p => !p)} edge="end">
                            {showPw ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Confirm New Password"
                    type={showPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    fullWidth
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    fullWidth
                    sx={{
                      mt: 1, py: 1.4, borderRadius: 2, fontSize: '0.95rem', fontWeight: 700,
                      background: 'linear-gradient(135deg, #3b5bdb 0%, #4c6ef5 100%)',
                    }}
                  >
                    {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Reset Password'}
                  </Button>
                </Box>
              </form>
            )}

            <Button
              variant="text"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/login')}
              sx={{ mt: 2.5, color: 'text.secondary', display: 'flex', mx: 'auto' }}
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default ResetPassword;
