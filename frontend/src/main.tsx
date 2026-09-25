import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, BrowserRouter } from 'react-router-dom';

// Use HashRouter in Electron (file:// protocol) and BrowserRouter in web
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron;
const Router = isElectron ? HashRouter : BrowserRouter;
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
      primary: '#0f172a',
      secondary: '#475569',
    },
  },
  typography: {
    fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
    fontSize: 14,
    h1: { fontWeight: 800, fontSize: '1.85rem', fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h2: { fontWeight: 800, fontSize: '1.55rem', fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h3: { fontWeight: 750, fontSize: '1.30rem', fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h4: { fontWeight: 750, fontSize: '1.15rem', fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h5: { fontWeight: 700, fontSize: '1.00rem', fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h6: { fontWeight: 700, fontSize: '0.90rem', fontFamily: "'Plus Jakarta Sans', sans-serif" },
    subtitle1: { fontWeight: 600, fontSize: '0.86rem' },
    subtitle2: { fontWeight: 650, fontSize: '0.82rem' },
    body1: { fontWeight: 500, fontSize: '0.84rem', lineHeight: 1.45 },
    body2: { fontWeight: 500, fontSize: '0.78rem', lineHeight: 1.4 },
    caption: { fontWeight: 500, fontSize: '0.72rem', lineHeight: 1.3 },
    button: { fontWeight: 650, textTransform: 'none', letterSpacing: 0.2, fontSize: '0.80rem' },
  },
  shape: { borderRadius: 8 },
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
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '5px 14px',
          minHeight: 32,
          fontSize: '0.80rem',
          fontWeight: 650,
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 2px 8px rgba(59,91,219,0.2)' },
        },
        sizeSmall: {
          padding: '3.5px 11px',
          minHeight: 28,
          fontSize: '0.76rem',
          fontWeight: 600,
        },
        sizeMedium: {
          padding: '6px 16px',
          minHeight: 34,
          fontSize: '0.82rem',
          fontWeight: 650,
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #3b5bdb 0%, #4c6ef5 100%)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.06)',
          maxWidth: '100%',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '10px 14px',
          '@media (max-width: 600px)': {
            padding: '8px 10px !important',
          },
          '&:last-child': {
            paddingBottom: '10px',
            '@media (max-width: 600px)': {
              paddingBottom: '8px !important',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 10,
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
          minHeight: 34,
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
          minHeight: 36,
          minWidth: 'auto',
          padding: '5px 12px',
          textTransform: 'none',
          fontSize: '0.82rem',
          fontWeight: 650,
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
          padding: '7px 12px',
          fontSize: '0.80rem',
          fontWeight: 500,
          '@media (max-width: 600px)': {
            padding: '5px 8px',
            fontSize: '0.75rem',
          },
        },
        head: {
          padding: '8px 12px',
          fontSize: '0.78rem',
          fontWeight: 750,
        },
      },
    },
    MuiDialog: {
      defaultProps: {
        fullWidth: true,
      },
      styleOverrides: {
        paper: {
          margin: 10,
          borderRadius: 10,
          width: 'calc(100% - 20px)',
          maxWidth: 'calc(100% - 20px) !important',
          '@media (min-width: 600px)': {
            margin: 24,
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
            fontWeight: 750,
            backgroundColor: alpha('#3b5bdb', 0.07),
            color: '#0f172a',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 650,
          borderRadius: 6,
          height: 24,
          fontSize: '0.72rem',
          '& .MuiChip-label': {
            paddingLeft: 7,
            paddingRight: 7,
          },
        },
        sizeSmall: {
          height: 21,
          fontSize: '0.68rem',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: '6px !important',
          fontSize: '0.84rem',
          fontWeight: 500,
        },
        input: {
          padding: '7px 11px !important',
        },
      },
    },
  },
});


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
    </Router>
  </React.StrictMode>
);
