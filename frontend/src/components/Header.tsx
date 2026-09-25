import { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Avatar, Box,
  Badge, Menu, MenuItem, Divider, InputBase, Tooltip, Chip,
} from '@mui/material';
import {
  Notifications, Search, Logout, Person, Settings,
  HealthAndSafety, Menu as MenuIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { alpha } from '@mui/material/styles';
import { SIDEBAR_W } from './Sidebar';
import SystemStatusBadge from './SystemStatusBadge';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface HeaderProps {
  onMobileToggle?: () => void;
  onToggleCollapse?: () => void;
  sidebarCollapsed?: boolean;
}

const Header = ({ onMobileToggle, onToggleCollapse, sidebarCollapsed = false }: HeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'A';
  const [notifications, setNotifications] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('read_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markAsRead = (id: string) => {
    setReadIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem('read_notification_ids', JSON.stringify(next));
      return next;
    });
  };

  const unreadNotifications = notifications.filter(n => !readIds.includes(n.id));

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const fetchLiveNotifications = async () => {
    try {
      const res = await api.get('/notifications/live');
      if (res.data?.success) {
        const formatted = res.data.data.map((n: any) => ({
          ...n,
          time: formatTimeAgo(n.createdAt),
        }));
        setNotifications(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchLiveNotifications();
    const interval = setInterval(fetchLiveNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        left: { xs: 0, md: sidebarCollapsed ? 0 : `${SIDEBAR_W}px` },
        width: { xs: '100%', md: sidebarCollapsed ? '100%' : `calc(100% - ${SIDEBAR_W}px)` },
        transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'rgba(240,242,248,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        zIndex: 1100,
      }}
    >
      <Toolbar sx={{ gap: { xs: 1, sm: 1.5 }, minHeight: '48px !important', height: 48, px: { xs: 1.5, sm: 2 } }}>
        {/* Sidebar Hamburger Toggle (Mobile & Desktop Full Screen Toggle) */}
        <Tooltip title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
          <IconButton
            color="inherit"
            aria-label="toggle sidebar"
            edge="start"
            onClick={() => {
              if (onToggleCollapse) onToggleCollapse();
              if (onMobileToggle) onMobileToggle();
            }}
            sx={{
              mr: 0.5,
              display: 'inline-flex',
              color: '#0d2560',
              bgcolor: '#fff',
              border: '1.2px solid rgba(0,0,0,0.08)',
              width: 32,
              height: 32,
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              '&:hover': {
                bgcolor: 'rgba(59, 91, 219, 0.08)',
                color: '#3b5bdb',
              },
            }}
          >
            <MenuIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* System Status Badge — always visible */}
        <SystemStatusBadge />
        {/* Search */}
        <Box
          sx={{
            flex: 1,
            maxWidth: 380,
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            gap: 0.8,
            bgcolor: '#fff',
            border: '1.2px solid rgba(0,0,0,0.08)',
            borderRadius: '8px',
            px: 1.2,
            py: 0.25,
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            transition: 'all 0.2s',
            '&:focus-within': {
              borderColor: '#3b5bdb',
              boxShadow: '0 0 0 2px rgba(59,91,219,0.1)',
            },
          }}
        >
          <Search sx={{ color: 'text.secondary', fontSize: 18 }} />
          <InputBase
            placeholder="Search patients, appointments…"
            sx={{ flex: 1, fontSize: '0.84rem', fontWeight: 500, color: 'text.primary', py: 0 }}
          />
        </Box>
        <Box sx={{ flex: 1 }} />
        {/* Status pill */}
        <Chip
          icon={<HealthAndSafety sx={{ fontSize: '14px !important' }} />}
          label="System Online"
          size="small"
          sx={{
            display: { xs: 'none', md: 'inline-flex' },
            bgcolor: alpha('#2f9e44', 0.12),
            color: '#2b8a3e',
            fontWeight: 700,
            fontSize: '0.72rem',
            height: 24,
            '& .MuiChip-icon': { color: '#2b8a3e' },
          }}
        />
        {/* Notifications */}
        <Tooltip title="Notifications">
          <IconButton
            onClick={e => setNotifAnchor(e.currentTarget)}
            sx={{
              bgcolor: '#fff',
              border: '1px solid rgba(0,0,0,0.08)',
              width: 30, height: 30,
              '&:hover': { bgcolor: alpha('#3b5bdb', 0.06) },
            }}
          >
            <Badge badgeContent={unreadNotifications.length} color="error">
              <Notifications sx={{ fontSize: 16, color: 'text.secondary' }} />
            </Badge>
          </IconButton>
        </Tooltip>
        {/* Notifications Menu */}
        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          PaperProps={{
            sx: { width: 320, mt: 1.0, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
            {unreadNotifications.length > 0 && (
              <Typography 
                variant="caption" 
                color="primary" 
                sx={{ cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                onClick={() => {
                  const allIds = notifications.map(n => n.id);
                  setReadIds(allIds);
                  localStorage.setItem('read_notification_ids', JSON.stringify(allIds));
                }}
              >
                Mark all as read
              </Typography>
            )}
          </Box>
          <Divider />
          {notifications.map(n => (
            <MenuItem 
              key={n.id} 
              sx={{ py: 1.0, px: 2, display: 'block' }}
              onClick={() => markAsRead(n.id)}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
                <Box
                  sx={{
                    width: 7, height: 7, borderRadius: '50%',
                    bgcolor: readIds.includes(n.id) ? 'transparent' : n.color, mt: 0.7, flexShrink: 0,
                  }}
                />
                <Box sx={{ opacity: readIds.includes(n.id) ? 0.6 : 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: readIds.includes(n.id) ? 400 : 600, lineHeight: 1.3, fontSize: '0.78rem' }}>
                    {n.text}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.66rem' }}>{n.time}</Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
          <Divider />
          <MenuItem sx={{ justifyContent: 'center', color: 'primary.main', fontWeight: 600, fontSize: '0.76rem' }}>
            View all notifications
          </MenuItem>
        </Menu>
        {/* User Avatar */}
        <Tooltip title="Account">
          <IconButton
            onClick={e => setAnchorEl(e.currentTarget)}
            sx={{ p: 0 }}
          >
            <Avatar
              src={user?.profilePicture || undefined}
              sx={{
                width: 30, height: 30,
                background: 'linear-gradient(135deg, #3b5bdb, #4c6ef5)',
                fontSize: '0.75rem', fontWeight: 700,
                border: '1.5px solid #fff',
                boxShadow: '0 2px 6px rgba(59,91,219,0.25)',
              }}
            >
              {initials}
            </Avatar>
          </IconButton>
        </Tooltip>
        {/* User Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: { width: 220, mt: 1.5, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.05em' }}>
              {user?.designation || user?.role || 'Administrator'}
            </Typography>
          </Box>
          <Divider />
          <MenuItem sx={{ gap: 1.5, py: 1.2 }} onClick={() => { setAnchorEl(null); navigate('/my-profile'); }}>
            <Person fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="body2">My Profile</Typography>
          </MenuItem>
          {user && (
            user.role === 'SUPER_ADMIN' ||
            user.roles?.includes('SUPER_ADMIN') ||
            user.role === 'ADMIN' ||
            user.roles?.includes('ADMIN')
          ) && (
            <MenuItem sx={{ gap: 1.5, py: 1.2 }} onClick={() => { setAnchorEl(null); navigate('/settings'); }}>
              <Settings fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="body2">Settings</Typography>
            </MenuItem>
          )}
          <Divider />
          <MenuItem onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }} sx={{ gap: 1.5, py: 1.2, color: 'error.main' }}>
            <Logout fontSize="small" />
            <Typography variant="body2" fontWeight={600}>Sign Out</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
