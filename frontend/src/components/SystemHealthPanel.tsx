/**
 * SystemHealthPanel.tsx
 * Dashboard widget showing four-layer failover health, sync metrics,
 * and recent system events.
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../services/api';
import {
  Box, Card, CardContent, Typography, Grid, Chip,
  CircularProgress, Divider, LinearProgress, Tooltip,
  IconButton, Collapse, Alert,
} from '@mui/material';
import {
  Storage, Cloud, WifiOff, CheckCircle, Error, Warning,
  Refresh, ExpandMore, ExpandLess, FiberManualRecord,
} from '@mui/icons-material';

type DbLayer = 'PRIMARY' | 'STANDBY' | 'CLOUD' | 'OFFLINE';

interface LayerStatus {
  layer:     DbLayer;
  url:       string;
  healthy:   boolean;
  lastCheck: string | null;
  lastError: string | null;
  failures:  number;
  successes: number;
}

interface SystemStatus {
  activeLayer: DbLayer;
  modeLabel:   string;
  layers:      LayerStatus[];
  checkedAt:   string;
}

interface SyncStatus {
  pending:     number;
  synced:      number;
  failed:      number;
  lastSyncedAt: string | null;
  activeLayer:  string;
}

interface FailoverEvent {
  timestamp:   string;
  eventType:   string;
  fromLayer?:  string;
  toLayer?:    string;
  description: string;
}

const LAYER_ICONS: Record<DbLayer, React.ReactNode> = {
  PRIMARY: <Storage sx={{ fontSize: 18, color: '#12b886' }} />,
  STANDBY: <Storage sx={{ fontSize: 18, color: '#f59f00' }} />,
  CLOUD:   <Cloud   sx={{ fontSize: 18, color: '#fd7e14' }} />,
  OFFLINE: <WifiOff sx={{ fontSize: 18, color: '#adb5bd' }} />,
};

const LAYER_COLORS: Record<DbLayer, string> = {
  PRIMARY: '#12b886',
  STANDBY: '#f59f00',
  CLOUD:   '#fd7e14',
  OFFLINE: '#adb5bd',
};

const EVENT_COLOR: Record<string, string> = {
  FAILOVER:       '#fd7e14',
  RECOVERY:       '#12b886',
  LAYER_DOWN:     '#fa5252',
  CLOUD_FALLBACK: '#fd7e14',
  OFFLINE_MODE:   '#adb5bd',
  SYNC_COMPLETE:  '#228be6',
  REVERSE_SYNC:   '#7950f2',
  STARTUP:        '#51cf66',
  HEALTH_CHECK:   '#868e96',
};

function authHeader(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const SystemHealthPanel = () => {
  const [status,       setStatus]       = useState<SystemStatus | null>(null);
  const [sync,         setSync]         = useState<SyncStatus | null>(null);
  const [events,       setEvents]       = useState<FailoverEvent[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showEvents,   setShowEvents]   = useState(false);
  const [lastRefresh,  setLastRefresh]  = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sysRes, syncRes, evtRes] = await Promise.all([
        fetch(`${API_BASE_URL}/system/status`,      { headers: authHeader() }),
        fetch(`${API_BASE_URL}/system/sync-status`, { headers: authHeader() }),
        fetch(`${API_BASE_URL}/system/events?limit=10`, { headers: authHeader() }),
      ]);
      const [sys, syncData, evtData] = await Promise.all([
        sysRes.json(), syncRes.json(), evtRes.json(),
      ]);
      if (sys.ok)     setStatus(sys);
      if (syncData.ok) setSync(syncData.sync);
      if (evtData.ok)  setEvents(evtData.events || []);
      setLastRefresh(new Date());
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 15_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const active = status?.activeLayer ?? 'PRIMARY';
  const isNormal = active === 'PRIMARY';

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${isNormal ? 'rgba(18,184,134,0.2)' : 'rgba(253,126,20,0.3)'}`,
        background: isNormal
          ? 'linear-gradient(135deg, rgba(18,184,134,0.04) 0%, rgba(240,242,248,1) 100%)'
          : 'linear-gradient(135deg, rgba(253,126,20,0.06) 0%, rgba(240,242,248,1) 100%)',
        overflow: 'visible',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* ── Header ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36, height: 36,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${LAYER_COLORS[active]}22 0%, ${LAYER_COLORS[active]}44 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {LAYER_ICONS[active]}
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                System Health
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              size="small"
              label={status?.modeLabel ?? 'CHECKING…'}
              sx={{
                background:  `linear-gradient(135deg, ${LAYER_COLORS[active]} 0%, ${LAYER_COLORS[active]}cc 100%)`,
                color:       '#fff',
                fontWeight:  700,
                fontSize:    '10px',
                letterSpacing: '0.5px',
                height:      22,
              }}
            />
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchAll} disabled={loading}>
                {loading
                  ? <CircularProgress size={14} />
                  : <Refresh sx={{ fontSize: 16 }} />
                }
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Alert if not on primary */}
        {!isNormal && (
          <Alert
            severity={active === 'CLOUD' ? 'warning' : active === 'OFFLINE' ? 'error' : 'warning'}
            sx={{ mb: 2, borderRadius: 2, fontSize: 12 }}
          >
            {active === 'STANDBY' && 'Primary server is offline. Failover active on standby server.'}
            {active === 'CLOUD'   && 'Both local servers down. Running on Neon cloud fallback. Local records queued.'}
            {active === 'OFFLINE' && 'All servers unreachable. Device-level offline capture active.'}
          </Alert>
        )}

        {/* ── Layer Grid ── */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {(['PRIMARY', 'STANDBY', 'CLOUD'] as DbLayer[]).map(layer => {
            const ls      = status?.layers.find(l => l.layer === layer);
            const healthy = ls?.healthy ?? false;
            const isActive = layer === active;

            return (
              <Grid item xs={4} key={layer}>
                <Tooltip title={ls?.lastError ?? (healthy ? 'Healthy' : 'Unreachable')} arrow>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: `1.5px solid ${isActive
                        ? LAYER_COLORS[layer]
                        : healthy
                          ? 'rgba(18,184,134,0.2)'
                          : 'rgba(250,82,82,0.2)'}`,
                      background: isActive
                        ? `${LAYER_COLORS[layer]}11`
                        : 'rgba(255,255,255,0.6)',
                      textAlign: 'center',
                      position: 'relative',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {isActive && (
                      <FiberManualRecord
                        sx={{
                          position: 'absolute', top: 4, right: 4,
                          fontSize: 8,
                          color: LAYER_COLORS[layer],
                          animation: 'blink 1s step-end infinite',
                          '@keyframes blink': { '50%': { opacity: 0 } },
                        }}
                      />
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                      {healthy
                        ? <CheckCircle sx={{ fontSize: 16, color: '#12b886' }} />
                        : <Error       sx={{ fontSize: 16, color: '#fa5252' }} />
                      }
                    </Box>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#495057' }}>
                      {layer}
                    </Typography>
                    <Typography sx={{ fontSize: 9, color: healthy ? '#12b886' : '#fa5252', fontWeight: 600 }}>
                      {healthy ? 'ONLINE' : 'OFFLINE'}
                    </Typography>
                    {isActive && (
                      <Chip label="ACTIVE" size="small"
                        sx={{ fontSize: 8, height: 14, mt: 0.5,
                          background: LAYER_COLORS[layer], color: '#fff', fontWeight: 700 }}
                      />
                    )}
                  </Box>
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>

        <Divider sx={{ my: 1.5 }} />

        {/* ── Sync Metrics ── */}
        {sync && (
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            {[
              { label: 'Synced',  value: sync.synced,  color: '#12b886' },
              { label: 'Pending', value: sync.pending, color: '#f59f00' },
              { label: 'Failed',  value: sync.failed,  color: '#fa5252' },
            ].map(m => (
              <Grid item xs={4} key={m.label}>
                <Box sx={{ textAlign: 'center', p: 1, borderRadius: 2, background: `${m.color}11` }}>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: m.color, lineHeight: 1 }}>
                    {m.value.toLocaleString()}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.3 }}>
                    {m.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {sync && (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Sync Progress</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                {sync.lastSyncedAt ? `Last sync: ${new Date(sync.lastSyncedAt).toLocaleTimeString()}` : 'Never synced'}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={sync.synced + sync.pending + sync.failed > 0
                ? (sync.synced / (sync.synced + sync.pending + sync.failed)) * 100
                : 100}
              sx={{
                height: 5, borderRadius: 3,
                background: 'rgba(0,0,0,0.06)',
                '& .MuiLinearProgress-bar': { background: '#12b886', borderRadius: 3 },
              }}
            />
          </Box>
        )}

        {/* ── Recent Events ── */}
        {events.length > 0 && (
          <>
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', mt: 1 }}
              onClick={() => setShowEvents(v => !v)}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>
                RECENT EVENTS ({events.length})
              </Typography>
              {showEvents ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
            </Box>

            <Collapse in={showEvents}>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {events.map((ev, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex', alignItems: 'flex-start', gap: 1,
                      p: 1, borderRadius: 1.5,
                      background: 'rgba(0,0,0,0.02)',
                      borderLeft: `3px solid ${EVENT_COLOR[ev.eventType] ?? '#adb5bd'}`,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: EVENT_COLOR[ev.eventType] ?? '#495057' }}>
                        {ev.eventType}
                        {ev.fromLayer && ev.toLayer && ` · ${ev.fromLayer} → ${ev.toLayer}`}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                        {ev.description}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 9, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemHealthPanel;
