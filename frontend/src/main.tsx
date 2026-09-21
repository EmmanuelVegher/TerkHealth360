import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme, alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3b5bdb',
      light: '#748ffc',
      dark: '#2f4ac0',
      contrastText: '#fff',
    },
    secondary: {
      main: '#0ca678',
      light: '#38d9a9',
      dark: '#099268',
      contrastText: '#fff',
    },
    error:   { main: '#f03e3e' },
    warning: { main: '#f59f00' },
    info:    { main: '#1c7ed6' },
    success: { main: '#2f9e44' },
    background: {
      default: '#f0f2f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1f36',
      secondary: '#6b7194',
    },
  },
  typography: {
    fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
    h1: { fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h2: { fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h3: { fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h4: { fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h5: { fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h6: { fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0.3 },
  },
  shape: { borderRadius: 12 },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04)',
    '0 10px 15px rgba(0,0,0,0.06), 0 4px 6px rgba(0,0,0,0.04)',
    '0 20px 25px rgba(0,0,0,0.07), 0 10px 10px rgba(0,0,0,0.04)',
    '0 25px 50px rgba(0,0,0,0.1)',
    ...Array(19).fill('none'),
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 12px rgba(59,91,219,0.25)' },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #3b5bdb 0%, #4c6ef5 100%)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid rgba(255,255,255,0.9)',
          maxWidth: '100%',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          '@media (max-width: 600px)': {
            padding: '12px !important',
          },
          '&:last-child': {
            paddingBottom: 16,
            '@media (max-width: 600px)': {
              paddingBottom: '12px !important',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 16,
        },
      },
    },
    MuiTabs: {
      defaultProps: {
        variant: 'scrollable',
        scrollButtons: 'auto',
        allowScrollButtonsMobile: true,
      },
      styleOverrides: {
        root: {
          minHeight: 44,
          maxWidth: '100%',
        },
        scroller: {
          WebkitOverflowScrolling: 'touch',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          minWidth: 'auto',
          padding: '6px 14px',
          textTransform: 'none',
          fontSize: '0.85rem',
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          maxWidth: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '10px 14px',
          '@media (max-width: 600px)': {
            padding: '6px 10px',
            fontSize: '0.78rem',
          },
        },
      },
    },
    MuiDialog: {
      defaultProps: {
        fullWidth: true,
      },
      styleOverrides: {
        paper: {
          margin: 12,
          width: 'calc(100% - 24px)',
          maxWidth: 'calc(100% - 24px) !important',
          '@media (min-width: 600px)': {
            margin: 32,
            width: 'auto',
            maxWidth: 'none !important',
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            backgroundColor: alpha('#3b5bdb', 0.06),
            color: '#1a1f36',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, borderRadius: 8 },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { borderRadius: '8px !important' },
      },
    },
  },
});


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SnackbarProvider
            maxSnack={3}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <AuthProvider>
              <App />
            </AuthProvider>
          </SnackbarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
