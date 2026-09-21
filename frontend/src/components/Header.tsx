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
}

const Header = ({ onMobileToggle }: HeaderProps) => {
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
        left: { xs: 0, md: `${SIDEBAR_W}px` },
        width: { xs: '100%', md: `calc(100% - ${SIDEBAR_W}px)` },
        background: 'rgba(240,242,248,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        zIndex: 1100,
      }}
    >
      <Toolbar sx={{ gap: { xs: 1, sm: 2 }, minHeight: '64px !important', px: { xs: 1.5, sm: 3 } }}>
        {/* Mobile Sidebar Hamburger Toggle */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMobileToggle}
          sx={{ mr: 0.5, display: { xs: 'inline-flex', md: 'none' }, color: '#0d2560' }}
        >
          <MenuIcon />
        </IconButton>

        {/* System Status Badge — always visible */}
        <SystemStatusBadge />
        {/* Search */}
        <Box
          sx={{
            flex: 1,
            maxWidth: 420,
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            gap: 1,
            bgcolor: '#fff',
            border: '1.5px solid rgba(0,0,0,0.07)',
            borderRadius: '10px',
            px: 1.5,
            py: 0.5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            transition: 'all 0.2s',
            '&:focus-within': {
              borderColor: '#3b5bdb',
              boxShadow: '0 0 0 3px rgba(59,91,219,0.1)',
            },
          }}
        >
          <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
          <InputBase
            placeholder="Search patients, appointments…"
            sx={{ flex: 1, fontSize: '0.875rem', color: 'text.primary' }}
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
            bgcolor: alpha('#2f9e44', 0.1),
            color: '#2f9e44',
            fontWeight: 600,
            fontSize: '0.72rem',
            '& .MuiChip-icon': { color: '#2f9e44' },
          }}
        />
        {/* Notifications */}
        <Tooltip title="Notifications">
          <IconButton
            onClick={e => setNotifAnchor(e.currentTarget)}
            sx={{
              bgcolor: '#fff',
              border: '1.5px solid rgba(0,0,0,0.07)',
              width: 38, height: 38,
              '&:hover': { bgcolor: alpha('#3b5bdb', 0.06) },
            }}
          >
            <Badge badgeContent={unreadNotifications.length} color="error">
              <Notifications sx={{ fontSize: 19, color: 'text.secondary' }} />
            </Badge>
          </IconButton>
        </Tooltip>
        {/* Notifications Menu */}
        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          PaperProps={{
            sx: { width: 340, mt: 1.5, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              sx={{ py: 1.5, px: 2, display: 'block' }}
              onClick={() => markAsRead(n.id)}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 8, height: 8, borderRadius: '50%',
                    bgcolor: readIds.includes(n.id) ? 'transparent' : n.color, mt: 0.8, flexShrink: 0,
                  }}
                />
                <Box sx={{ opacity: readIds.includes(n.id) ? 0.6 : 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: readIds.includes(n.id) ? 400 : 600, lineHeight: 1.4 }}>
                    {n.text}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{n.time}</Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
          <Divider />
          <MenuItem sx={{ justifyContent: 'center', color: 'primary.main', fontWeight: 600, fontSize: '0.82rem' }}>
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
                width: 38, height: 38,
                background: 'linear-gradient(135deg, #3b5bdb, #4c6ef5)',
                fontSize: '0.85rem', fontWeight: 700,
                border: '2px solid #fff',
                boxShadow: '0 2px 8px rgba(59,91,219,0.3)',
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
          <MenuItem onClick={logout} sx={{ gap: 1.5, py: 1.2, color: 'error.main' }}>
            <Logout fontSize="small" />
            <Typography variant="body2" fontWeight={600}>Sign Out</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
