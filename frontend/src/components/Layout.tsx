import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button } from '@mui/material';
import { WifiOff, OfflinePin } from '@mui/icons-material';
import Sidebar from './Sidebar';
import Header from './Header';
import { SIDEBAR_W } from './Sidebar';
import { runBackgroundSync } from '../services/api';
import { OpenMedFloatingChatWidget } from './OpenMedFloatingChatWidget';
import { useAuth } from '../contexts/AuthContext';
import { isUserPharmacyStaff, isUserMorticianStaff, isUserRadiologyStaff, isUserPhysioStaff } from '../utils/roleUtils';

const Layout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN');
  const isAdmin = isSuperAdmin || user?.role === 'ADMIN' || user?.roles?.includes('ADMIN') || (user?.designation || '').toLowerCase().includes('admin');
  const isPharmacyStaff = !isAdmin && isUserPharmacyStaff(user);
  const isMorticianStaff = !isAdmin && isUserMorticianStaff(user);
  const isRadiologyStaff = !isAdmin && isUserRadiologyStaff(user);
  const isPhysioStaff = !isAdmin && isUserPhysioStaff(user);

  useEffect(() => {
    if (isPharmacyStaff) {
      const p = location.pathname.toLowerCase().replace(/\/$/, '');
      const isAllowed =
        p === '' ||
        p === '/' ||
        p.startsWith('/pharmacy') ||
        p.startsWith('/inventory');

      if (!isAllowed) {
        navigate('/pharmacy', { replace: true });
      }
    } else if (isMorticianStaff) {
      const p = location.pathname.toLowerCase().replace(/\/$/, '');
      const isAllowed =
        p === '' ||
        p === '/' ||
        p.startsWith('/mortuary');

      if (!isAllowed) {
        navigate('/mortuary', { replace: true });
      }
    } else if (isRadiologyStaff) {
      const p = location.pathname.toLowerCase().replace(/\/$/, '');
      const isAllowed =
        p === '' ||
        p === '/' ||
        p.startsWith('/radiology');

      if (!isAllowed) {
        navigate('/radiology/orders', { replace: true });
      }
    } else if (isPhysioStaff) {
      const p = location.pathname.toLowerCase().replace(/\/$/, '');
      const isAllowed =
        p === '' ||
        p === '/' ||
        p.startsWith('/rehabilitation') ||
        p.startsWith('/physiotherapy');

      if (!isAllowed) {
        navigate('/rehabilitation', { replace: true });
      }
    }
  }, [isPharmacyStaff, isMorticianStaff, isRadiologyStaff, isPhysioStaff, location.pathname, navigate]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [offlineCount, setOfflineCount] = useState(() => {
    try {
      const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
      return queue.length;
    } catch (_) {
      return 0;
    }
  });

  const handleDrawerToggle = () => {
    setMobileOpen(prev => !prev);
  };

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const count = (e as any).detail?.count ?? 0;
      setOfflineCount(count);
    };

    window.addEventListener('offline-sync-updated', handleUpdate);
    return () => {
      window.removeEventListener('offline-sync-updated', handleUpdate);
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', pb: offlineCount > 0 ? 8 : 0 }}>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <Box
        sx={{
          flex: 1,
          ml: { xs: 0, md: `${SIDEBAR_W}px` },
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: { xs: '100%', md: `calc(100% - ${SIDEBAR_W}px)` },
          maxWidth: { xs: '100%', md: `calc(100% - ${SIDEBAR_W}px)` },
        }}
      >
        <Header onMobileToggle={handleDrawerToggle} />
        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 1, sm: 2, md: 3 },
            mt: '64px',
            minHeight: 'calc(100vh - 64px)',
            minWidth: 0,
            width: '100%',
            overflowX: 'hidden',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Floating Offline Sync Queue Alert Banner */}
      {offlineCount > 0 && (
        <Paper
          elevation={12}
          sx={{
            position: 'fixed',
            bottom: 24,
            left: { xs: 16, md: `${SIDEBAR_W + 24}px` },
            right: { xs: 16, md: 24 },
            p: '14px 24px',
            background: 'linear-gradient(135deg, #fd7e14 0%, #e8590c 100%)',
            color: '#fff',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 10px 30px rgba(232, 89, 12, 0.3)',
            zIndex: 1400,
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            '@keyframes slideUp': {
              from: { transform: 'translateY(100px) scale(0.95)', opacity: 0 },
              to: { transform: 'translateY(0) scale(1)', opacity: 1 },
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WifiOff sx={{ fontSize: 24, animation: 'pulse 1.8s infinite' }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                🔌 Offline Record Capture Active
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                {offlineCount} clinical transaction{offlineCount > 1 ? 's' : ''} queued locally — will sync automatically when server connection is restored.
              </Typography>
            </Box>
          </Box>
          <Button
            size="small"
            variant="contained"
            onClick={() => runBackgroundSync()}
            startIcon={<OfflinePin sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.75rem',
              borderRadius: '8px',
              px: 2,
              textTransform: 'none',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.3)',
              },
            }}
          >
            Retry Sync
          </Button>
        </Paper>
      )}

      {/* Global OpenMed Agentic RAG Floating Chat Widget */}
      <OpenMedFloatingChatWidget />
    </Box>
  );
};

export default Layout;
export { SIDEBAR_W };
