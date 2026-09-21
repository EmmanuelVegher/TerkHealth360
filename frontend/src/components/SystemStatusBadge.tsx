/**
 * SystemStatusBadge.tsx
 * Live system status badge showing current DB failover layer.
 * Polls /api/system/status every 15 seconds.
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../services/api';
import { Chip, Tooltip, CircularProgress, Box } from '@mui/material';
import {
  CheckCircle, Warning, Cloud, WifiOff, FiberManualRecord,
} from '@mui/icons-material';

type DbLayer = 'PRIMARY' | 'STANDBY' | 'CLOUD' | 'OFFLINE';

interface SystemStatus {
  activeLayer: DbLayer;
  modeLabel:   string;
  checkedAt:   string;
  layers: Array<{
    layer:     DbLayer;
    healthy:   boolean;
    lastError: string | null;
  }>;
}

const LAYER_CONFIG: Record<DbLayer, {
  color: 'success' | 'warning' | 'error' | 'default';
  bg:    string;
  icon:  React.ReactNode;
  tip:   string;
}> = {
  PRIMARY: {
    color: 'success',
    bg:    'linear-gradient(135deg, #12b886 0%, #0ca678 100%)',
    icon:  <CheckCircle sx={{ fontSize: 14 }} />,
    tip:   'Operating normally on the primary local PostgreSQL server',
  },
  STANDBY: {
    color: 'warning',
    bg:    'linear-gradient(135deg, #f59f00 0%, #e67700 100%)',
    icon:  <Warning sx={{ fontSize: 14 }} />,
    tip:   'Primary server is down. Running on the secondary local standby server',
  },
  CLOUD: {
    color: 'error',
    bg:    'linear-gradient(135deg, #fd7e14 0%, #e8590c 100%)',
    icon:  <Cloud sx={{ fontSize: 14 }} />,
    tip:   'Both local servers are unavailable. Operating in cloud fallback mode (Neon)',
  },
  OFFLINE: {
    color: 'default',
    bg:    'linear-gradient(135deg, #495057 0%, #343a40 100%)',
    icon:  <WifiOff sx={{ fontSize: 14 }} />,
    tip:   'No database available. Records captured offline on device — will sync when restored',
  },
};

const POLL_MS = 15_000;

const SystemStatusBadge = () => {
  const [status, setStatus]   = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_BASE_URL}/system/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStatus(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(id);
  }, [fetchStatus]);

  if (loading) {
    return (
      <CircularProgress size={14} sx={{ color: 'rgba(255,255,255,0.6)', mx: 1 }} />
    );
  }

  const layer  = status?.activeLayer ?? (error ? 'OFFLINE' : 'PRIMARY');
  const cfg    = LAYER_CONFIG[layer];
  const label  = status?.modeLabel ?? (error ? 'OFFLINE CAPTURE' : 'CHECKING…');

  // Pulse animation for non-normal states
  const pulseSx = layer !== 'PRIMARY' ? {
    animation: 'pulse 1.8s ease-in-out infinite',
    '@keyframes pulse': {
      '0%':   { boxShadow: '0 0 0 0 rgba(255,255,255,0.4)' },
      '70%':  { boxShadow: '0 0 0 6px rgba(255,255,255,0)' },
      '100%': { boxShadow: '0 0 0 0 rgba(255,255,255,0)' },
    },
  } : {};

  const healthy = status?.layers?.filter(l => l.healthy).length ?? 0;
  const total   = status?.layers?.length ?? 3;

  return (
    <Tooltip
      title={
        <Box sx={{ fontSize: 12, lineHeight: 1.6 }}>
          <strong>{cfg.tip}</strong>
          <br />
          Layers healthy: {healthy}/{total}
          {status?.checkedAt && (
            <>
              <br />
              Last check: {new Date(status.checkedAt).toLocaleTimeString()}
            </>
          )}
        </Box>
      }
      arrow
      placement="bottom-end"
    >
      <Chip
        size="small"
        icon={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
            <FiberManualRecord sx={{
              fontSize: 8,
              color: '#fff',
              animation: 'blink 1s step-end infinite',
              '@keyframes blink': { '50%': { opacity: 0 } },
            }} />
            {cfg.icon}
          </Box>
        }
        label={label}
        sx={{
          background:   cfg.bg,
          color:        '#fff',
          fontWeight:   700,
          fontSize:     '10px',
          letterSpacing: '0.5px',
          height:       24,
          cursor:       'pointer',
          border:       'none',
          ...pulseSx,
          '& .MuiChip-icon': { color: '#fff', ml: '6px' },
          '& .MuiChip-label': { px: 1 },
          transition:   'all 0.4s ease',
        }}
      />
    </Tooltip>
  );
};

export default SystemStatusBadge;
