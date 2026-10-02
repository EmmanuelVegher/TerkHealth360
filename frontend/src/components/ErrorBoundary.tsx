import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Paper, Typography, Button, Stack } from '@mui/material';
import { Refresh, Logout, WarningAmber } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoToLogin = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('cached_user');
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.hash = '#/login';
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0d1550 0%, #1e2a78 100%)',
            p: 3,
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
          }}
        >
          <Paper
            elevation={8}
            sx={{
              p: 4,
              maxWidth: 520,
              width: '100%',
              borderRadius: 3,
              textAlign: 'center',
              bgcolor: '#ffffff',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'rgba(239, 68, 68, 0.12)',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <WarningAmber sx={{ fontSize: 36 }} />
            </Box>

            <Typography variant="h5" fontWeight={750} color="#0f172a" gutterBottom>
              Something went wrong
            </Typography>

            <Typography variant="body2" color="#64748b" sx={{ mb: 3 }}>
              An unexpected interface error occurred. You can reload the page or return to the login screen safely.
            </Typography>

            {this.state.error && (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 3,
                  bgcolor: '#f8fafc',
                  borderColor: '#e2e8f0',
                  textAlign: 'left',
                  maxHeight: 120,
                  overflowY: 'auto',
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#dc2626', wordBreak: 'break-word' }}>
                  {this.state.error.message || String(this.state.error)}
                </Typography>
              </Paper>
            )}

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleReload}
                sx={{
                  bgcolor: '#3b5bdb',
                  '&:hover': { bgcolor: '#2f4ac0' },
                  px: 2.5,
                  py: 1,
                  fontWeight: 650,
                }}
              >
                Reload Page
              </Button>
              <Button
                variant="outlined"
                startIcon={<Logout />}
                onClick={this.handleGoToLogin}
                sx={{
                  color: '#475569',
                  borderColor: '#cbd5e1',
                  '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                  px: 2.5,
                  py: 1,
                  fontWeight: 650,
                }}
              >
                Sign In
              </Button>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
