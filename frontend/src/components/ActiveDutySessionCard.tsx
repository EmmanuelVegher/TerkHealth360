import React, { useState, useMemo } from 'react';
import {
  Card,
  Box,
  Typography,
  Chip,
  Button,
  LinearProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Tooltip,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Timer,
  CheckCircle,
  Schedule,
  ExitToApp,
  Fingerprint,
  Launch,
  Refresh,
  Lock,
  BeachAccess,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useAttendanceStatus, ATTENDANCE_EVENT } from '../hooks/useAttendanceStatus';

const PRIMARY = '#1e3a8a';
const SUCCESS = '#16a34a';
const WARNING = '#ea580c';

interface ActiveDutySessionCardProps {
  compact?: boolean;
  variant?: 'default' | 'sidebar';
  onStatusChange?: () => void;
  className?: string;
  sx?: any;
}

export const ActiveDutySessionCard: React.FC<ActiveDutySessionCardProps> = ({
  compact = false,
  variant = 'default',
  onStatusChange,
  sx = {},
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const attendance = useAttendanceStatus();

  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'IN' | 'OUT';
  }>({ open: false, type: 'IN' });
  const [clockNote, setClockNote] = useState('');

  const safeStr = (val: any, fallback = ''): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
      return val.name || val.label || val.title || val.code || val.shiftName || fallback;
    }
    return String(val);
  };

  const loggedInEmpId = useMemo(() => {
    return safeStr(user?.id || user?.staffId || (user as any)?.empId, 'EMP-001');
  }, [user]);

  const loggedInName = useMemo(() => {
    if (!user) return 'Staff Officer';
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || safeStr((user as any).name, user.username || 'Staff Officer');
  }, [user]);

  const loggedInRole = useMemo(() => {
    return safeStr(user?.role || user?.designation, 'Hospital Staff');
  }, [user]);

  const loggedInDept = useMemo(() => {
    const rawDept = (user as any)?.department || (user as any)?.departments?.[0];
    return safeStr(rawDept, 'Clinical Operations');
  }, [user]);

  // Instant Clock In
  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/hr/attendance/clock-in', {
        empId: loggedInEmpId,
        staffName: loggedInName,
        role: loggedInRole,
        department: loggedInDept,
        shift: attendance.shiftName,
        notes: clockNote || 'Dashboard 1-Click Biometric Punch',
        autoStartShift: true,
      });

      const nowIso = new Date().toISOString();
      const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const userKey = user?.id || user?.staffId || (user as any)?.empId || user?.username || 'user';
      const storageKey = `hospital_clockin_${userKey}`;
      const clockData = {
        clockInIso: nowIso,
        clockInTime: nowTime,
        date: new Date().toISOString().slice(0, 10),
        isClockedIn: true,
      };
      localStorage.setItem(storageKey, JSON.stringify(clockData));
      localStorage.setItem('hospital_active_clockin_fallback', JSON.stringify(clockData));
      window.dispatchEvent(new CustomEvent(ATTENDANCE_EVENT, { detail: clockData }));

      enqueueSnackbar(res.data?.message || 'Clocked in successfully! Active shift session started.', {
        variant: 'success',
      });
      setConfirmModal({ open: false, type: 'IN' });
      setClockNote('');
      await attendance.refreshStatus();
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to clock in', { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Instant Clock Out
  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/hr/attendance/clock-out', {
        empId: loggedInEmpId,
        staffName: loggedInName,
        role: loggedInRole,
        notes: clockNote || 'Dashboard 1-Click Handover Punch Out',
        autoCloseShift: true,
      });

      const userKey = user?.id || user?.staffId || (user as any)?.empId || user?.username || 'user';
      const storageKey = `hospital_clockin_${userKey}`;
      localStorage.removeItem(storageKey);
      localStorage.removeItem('hospital_active_clockin_fallback');
      window.dispatchEvent(new CustomEvent(ATTENDANCE_EVENT, { detail: { isClockedIn: false } }));

      enqueueSnackbar(res.data?.message || 'Clocked out successfully. Total duty hours calculated.', {
        variant: 'success',
      });
      setConfirmModal({ open: false, type: 'OUT' });
      setClockNote('');
      await attendance.refreshStatus();
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to clock out', { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (variant === 'sidebar') {
    return (
      <>
        <Box
          sx={{
            borderRadius: 2.5,
            border: attendance.isClockedIn ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.09)',
            background: attendance.isClockedIn
              ? 'linear-gradient(145deg, rgba(34, 197, 94, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)'
              : 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(15, 23, 42, 0.7) 100%)',
            backdropFilter: 'blur(10px)',
            p: 1.5,
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.25s ease',
            boxShadow: attendance.isClockedIn ? '0 4px 18px rgba(34, 197, 94, 0.15)' : '0 2px 8px rgba(0,0,0,0.2)',
            ...sx,
          }}
        >
          {/* Header Row: Status Chip & Quick Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: attendance.isClockedIn ? '#22c55e' : attendance.isOnApprovedLeave ? '#f59e0b' : '#94a3b8',
                  boxShadow: attendance.isClockedIn ? '0 0 8px #22c55e' : 'none',
                  animation: attendance.isClockedIn ? 'pulse 2s infinite' : 'none',
                }}
              />
              <Typography sx={{ color: '#fff', fontSize: '0.68rem', fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {attendance.isClockedIn ? 'On Duty' : attendance.isOnApprovedLeave ? 'On Leave' : 'Off Duty'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <Tooltip title="Attendance Roster">
                <IconButton
                  size="small"
                  onClick={() => navigate('/staff/attendance-roster/clock-logs')}
                  sx={{ color: 'rgba(255,255,255,0.6)', p: 0.4, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  <Launch sx={{ fontSize: '0.85rem' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh Status">
                <IconButton
                  size="small"
                  onClick={() => attendance.refreshStatus()}
                  disabled={attendance.loading}
                  sx={{ color: 'rgba(255,255,255,0.6)', p: 0.4, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  <Refresh sx={{ fontSize: '0.85rem', animation: attendance.loading ? 'spin 1s linear infinite' : 'none' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Shift Details */}
          <Typography sx={{ color: '#f8fafc', fontSize: '0.74rem', fontWeight: 700, lineHeight: 1.25, mb: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {attendance.shiftName}
          </Typography>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.66rem', mb: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {attendance.dutyStation} · {attendance.clockInTime || '07:00 – 15:00'}
          </Typography>

          {/* Progress / Countdown if Clocked In */}
          {attendance.isClockedIn && (
            <Box sx={{ mb: 1.2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography sx={{ color: '#86efac', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace' }}>
                  {attendance.remainingStr}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.64rem' }}>
                  {attendance.percent}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={attendance.percent}
                sx={{
                  height: 5,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    background: attendance.isOvertime
                      ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                      : 'linear-gradient(90deg, #22c55e, #10b981)',
                  },
                }}
              />
            </Box>
          )}

          {/* Action Button */}
          {attendance.isClockedIn ? (
            <Button
              variant="contained"
              color="error"
              size="small"
              fullWidth
              startIcon={<ExitToApp sx={{ fontSize: '0.9rem !important' }} />}
              onClick={() => setConfirmModal({ open: true, type: 'OUT' })}
              sx={{
                borderRadius: 2,
                fontWeight: 800,
                fontSize: '0.72rem',
                textTransform: 'none',
                py: 0.6,
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
              }}
            >
              Clock Out
            </Button>
          ) : attendance.isOnApprovedLeave ? (
            <Button
              variant="contained"
              size="small"
              fullWidth
              disabled
              startIcon={<Lock sx={{ fontSize: '0.85rem !important', color: '#fde68a !important' }} />}
              sx={{
                borderRadius: 2,
                fontWeight: 800,
                fontSize: '0.7rem',
                textTransform: 'none',
                py: 0.6,
                bgcolor: 'rgba(217, 119, 6, 0.4) !important',
                color: '#fde68a !important',
              }}
            >
              Leave Active
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={<Fingerprint sx={{ fontSize: '0.95rem !important' }} />}
              onClick={() => setConfirmModal({ open: true, type: 'IN' })}
              sx={{
                borderRadius: 2,
                fontWeight: 800,
                fontSize: '0.72rem',
                textTransform: 'none',
                py: 0.6,
                bgcolor: '#16a34a',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)',
                '&:hover': { bgcolor: '#15803d' },
              }}
            >
              Biometric Clock In
            </Button>
          )}
        </Box>

        {/* Modal Dialog */}
        <Dialog
          open={confirmModal.open}
          onClose={() => setConfirmModal({ open: false, type: 'IN' })}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 900, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Fingerprint sx={{ color: confirmModal.type === 'IN' ? SUCCESS : '#dc2626' }} />
            {confirmModal.type === 'IN' ? 'Confirm Shift Clock-In' : 'Confirm Shift Clock-Out & Handover'}
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: confirmModal.type === 'IN' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${confirmModal.type === 'IN' ? '#bbf7d0' : '#fecaca'}` }}>
              <Typography variant="body2" fontWeight={800} color={confirmModal.type === 'IN' ? '#166534' : '#991b1b'}>
                {confirmModal.type === 'IN'
                  ? `Ready to begin duty session for ${attendance.shiftName}?`
                  : `Closing active duty session for ${loggedInName}?`}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Staff ID: <strong>{loggedInEmpId}</strong> · Role: <strong>{loggedInRole}</strong> · Dept: <strong>{loggedInDept}</strong>
              </Typography>
            </Box>

            <TextField
              label="Handover Notes / Duty Memo (Optional)"
              placeholder={confirmModal.type === 'IN' ? 'e.g., Resumed OPD desk, till float counted' : 'e.g., Handed over Ward 3 beds to incoming staff'}
              value={clockNote}
              onChange={(e) => setClockNote(e.target.value)}
              multiline
              rows={2}
              fullWidth
              size="small"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setConfirmModal({ open: false, type: 'IN' })} color="inherit" disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color={confirmModal.type === 'IN' ? 'success' : 'error'}
              onClick={confirmModal.type === 'IN' ? handleClockIn : handleClockOut}
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : confirmModal.type === 'IN' ? <CheckCircle /> : <ExitToApp />}
              sx={{ fontWeight: 800, px: 2.5 }}
            >
              {actionLoading ? 'Recording...' : confirmModal.type === 'IN' ? 'Clock In Now' : 'Confirm Clock Out'}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: attendance.isClockedIn ? '1.5px solid #86efac' : '1px solid #e2e8f0',
          background: attendance.isClockedIn
            ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 70%, #ecfdf5 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          boxShadow: attendance.isClockedIn
            ? '0 8px 24px rgba(22, 163, 74, 0.08)'
            : '0 4px 16px rgba(0, 0, 0, 0.03)',
          p: compact ? 1.5 : 2,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          ...sx,
        }}
      >
        {/* Glowing Top Ambient Line when active */}
        {attendance.isClockedIn && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, #22c55e, #10b981, #06b6d4, #22c55e)',
              backgroundSize: '200% auto',
            }}
          />
        )}

        {/* ── Approved Leave Lock Alert Banner ── */}
        {attendance.isOnApprovedLeave && !attendance.isClockedIn && (
          <Alert
            severity="warning"
            icon={<BeachAccess sx={{ fontSize: '1.4rem', color: '#b45309' }} />}
            sx={{
              mb: 1.8,
              borderRadius: 2.5,
              bgcolor: '#fef3c7',
              color: '#92400e',
              border: '1.5px solid #fde68a',
              py: 0.8,
              px: 1.5,
              '& .MuiAlert-message': { width: '100%' }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#92400e', fontSize: '0.85rem' }}>
                  🏖️ Biometric Clock-In Disabled: On Approved {attendance.approvedLeave?.type || 'Annual'} Leave
                </Typography>
                <Typography variant="caption" sx={{ color: '#78350f', display: 'block', fontSize: '0.78rem', mt: 0.25 }}>
                  Your approved leave is active from <strong>{attendance.approvedLeave?.startDate}</strong> to <strong>{attendance.approvedLeave?.endDate || attendance.approvedLeave?.startDate}</strong>. Duties have been reassigned to relief officer <strong>{attendance.approvedLeave?.reliefOfficer || 'Relief Officer'}</strong>. Clock-in buttons are disabled until leave ends.
                </Typography>
              </Box>
              <Chip
                size="small"
                icon={<Lock sx={{ fontSize: '0.85rem !important', color: '#fff !important' }} />}
                label="Duty Locked"
                sx={{ bgcolor: '#d97706', color: '#fff', fontWeight: 800, fontSize: '0.72rem' }}
              />
            </Box>
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          {/* Left Column: Presence State + Shift Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 260 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: attendance.isClockedIn ? '#dcfce7' : attendance.isOnApprovedLeave ? '#fef3c7' : '#f1f5f9',
                color: attendance.isClockedIn ? SUCCESS : attendance.isOnApprovedLeave ? '#d97706' : '#64748b',
                boxShadow: attendance.isClockedIn ? '0 0 14px rgba(34, 197, 94, 0.25)' : attendance.isOnApprovedLeave ? '0 0 14px rgba(217, 119, 6, 0.2)' : 'none',
              }}
            >
              {attendance.isClockedIn ? (
                <Fingerprint sx={{ fontSize: 26, color: '#16a34a' }} />
              ) : attendance.isOnApprovedLeave ? (
                <BeachAccess sx={{ fontSize: 24, color: '#d97706' }} />
              ) : (
                <Schedule sx={{ fontSize: 24 }} />
              )}
            </Box>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="overline" sx={{ fontWeight: 800, fontSize: '0.68rem', letterSpacing: 0.8, color: attendance.isClockedIn ? '#15803d' : attendance.isOnApprovedLeave ? '#b45309' : 'text.secondary' }}>
                  {attendance.isClockedIn ? '🟢 ACTIVE ON-DUTY SESSION' : attendance.isOnApprovedLeave ? '🏖️ ON APPROVED LEAVE' : '⚪ NOT CLOCKED IN'}
                </Typography>
                {attendance.isClockedIn && (
                  <Chip
                    label="PUNCHED IN"
                    size="small"
                    color="success"
                    sx={{ height: 18, fontSize: '0.58rem', fontWeight: 800, px: 0.5 }}
                  />
                )}
                {attendance.isOnApprovedLeave && !attendance.isClockedIn && (
                  <Chip
                    label="LOCKED"
                    size="small"
                    color="warning"
                    sx={{ height: 18, fontSize: '0.58rem', fontWeight: 800, px: 0.5, bgcolor: '#d97706', color: '#fff' }}
                  />
                )}
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, lineHeight: 1.2 }}>
                {attendance.shiftName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.72rem' }}>
                Station: <strong>{attendance.dutyStation}</strong> · Staff: <strong>{loggedInName}</strong>
              </Typography>
            </Box>
          </Box>

          {/* Middle Column: Countdown Timer & Elapsed Punch Stats */}
          {attendance.isClockedIn ? (
            <Box sx={{ flex: 1, px: { xs: 0, md: 2 }, width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Timer sx={{ fontSize: '1rem', color: attendance.isOvertime ? WARNING : '#15803d' }} />
                  <Typography variant="body2" sx={{ fontWeight: 900, color: attendance.isOvertime ? WARNING : '#166534', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                    {attendance.isOvertime ? `OVERTIME ${attendance.remainingStr}` : `${attendance.remainingStr} REMAINING`}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.72rem' }}>
                  Elapsed: <strong style={{ color: PRIMARY }}>{attendance.elapsedStr}</strong> ({attendance.percent}%)
                </Typography>
              </Box>

              <Tooltip title={`Shift Progress: ${attendance.percent}% completed`} arrow>
                <LinearProgress
                  variant="determinate"
                  value={attendance.percent}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#e2e8f0',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background: attendance.isOvertime
                        ? 'linear-gradient(90deg, #f59e0b, #dc2626)'
                        : 'linear-gradient(90deg, #10b981, #059669)',
                    },
                  }}
                />
              </Tooltip>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.6 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                  Clocked In: <strong>{attendance.clockInTime || '—'}</strong>
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                  Shift Date: <strong>{attendance.clockInDate}</strong>
                </Typography>
              </Box>
            </Box>
          ) : attendance.isOnApprovedLeave ? (
            <Box sx={{ flex: 1, px: { xs: 0, md: 2 } }}>
              <Typography variant="body2" sx={{ color: '#b45309', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BeachAccess sx={{ fontSize: '1.1rem', color: '#d97706' }} />
                Approved {attendance.approvedLeave?.type || 'Annual'} Leave ({attendance.approvedLeave?.startDate} to {attendance.approvedLeave?.endDate || attendance.approvedLeave?.startDate})
              </Typography>
              <Typography variant="caption" sx={{ color: '#78350f', fontSize: '0.74rem', display: 'block', mt: 0.2 }}>
                🔒 Biometric clock-in is disabled. Duties covered by {attendance.approvedLeave?.reliefOfficer || 'Relief Officer'}.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1, px: { xs: 0, md: 2 } }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', fontWeight: 600 }}>
                You are currently off-duty. Punch in to activate your shift hours, record biometric presence, and link your clinical activities.
              </Typography>
            </Box>
          )}

          {/* Right Column: Actions */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0, width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            {attendance.isClockedIn ? (
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<ExitToApp />}
                onClick={() => setConfirmModal({ open: true, type: 'OUT' })}
                sx={{
                  borderRadius: 2,
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  px: 1.8,
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                }}
              >
                Clock Out / Handover
              </Button>
            ) : attendance.isOnApprovedLeave ? (
              <Tooltip
                title={`🚫 Biometric Clock-In Disabled: You are on Approved ${attendance.approvedLeave?.type || 'Annual'} Leave (${attendance.approvedLeave?.startDate} to ${attendance.approvedLeave?.endDate || attendance.approvedLeave?.startDate}). Scheduled duties are reassigned to ${attendance.approvedLeave?.reliefOfficer || 'Relief Officer'}.`}
                arrow
              >
                <span>
                  <Button
                    variant="contained"
                    color="warning"
                    size="small"
                    disabled
                    startIcon={<Lock sx={{ color: '#fff !important' }} />}
                    onClick={() => {
                      enqueueSnackbar(`🚫 Clock-In Disabled: You are currently on Approved ${attendance.approvedLeave?.type || 'Annual'} Leave (${attendance.approvedLeave?.startDate} to ${attendance.approvedLeave?.endDate || attendance.approvedLeave?.startDate}).`, { variant: 'warning' });
                    }}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      px: 2,
                      bgcolor: '#d97706 !important',
                      color: '#ffffff !important',
                      boxShadow: '0 2px 10px rgba(217, 119, 6, 0.3)',
                      cursor: 'not-allowed',
                      pointerEvents: 'auto !important'
                    }}
                  >
                    🔒 Locked (On Approved Leave)
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<Fingerprint />}
                onClick={() => setConfirmModal({ open: true, type: 'IN' })}
                sx={{
                  borderRadius: 2,
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  px: 2,
                  bgcolor: '#16a34a',
                  boxShadow: '0 2px 10px rgba(220, 38, 38, 0.3)',
                  '&:hover': { bgcolor: '#15803d' },
                }}
              >
                ⚡ Biometric Clock In
              </Button>
            )}

            <Tooltip title="Open Full Workforce & Attendance Portal">
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/staff/attendance-roster/clock-logs')}
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  textTransform: 'none',
                  borderColor: '#cbd5e1',
                  color: '#475569',
                  minWidth: 'auto',
                  px: 1.2,
                }}
              >
                <Launch sx={{ fontSize: '0.9rem', mr: 0.5 }} /> Portal
              </Button>
            </Tooltip>

            <Tooltip title="Refresh Shift Status">
              <IconButton size="small" onClick={() => attendance.refreshStatus()} disabled={attendance.loading} sx={{ color: '#94a3b8' }}>
                <Refresh sx={{ fontSize: '1rem', animation: attendance.loading ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Card>

      {/* ── Quick Clock In / Out Confirmation Dialog ── */}
      <Dialog
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, type: 'IN' })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 900, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Fingerprint sx={{ color: confirmModal.type === 'IN' ? SUCCESS : '#dc2626' }} />
          {confirmModal.type === 'IN' ? 'Confirm Shift Clock-In' : 'Confirm Shift Clock-Out & Handover'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: confirmModal.type === 'IN' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${confirmModal.type === 'IN' ? '#bbf7d0' : '#fecaca'}` }}>
            <Typography variant="body2" fontWeight={800} color={confirmModal.type === 'IN' ? '#166534' : '#991b1b'}>
              {confirmModal.type === 'IN'
                ? `Ready to begin duty session for ${attendance.shiftName}?`
                : `Closing active duty session for ${loggedInName}?`}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Staff ID: <strong>{loggedInEmpId}</strong> · Role: <strong>{loggedInRole}</strong> · Dept: <strong>{loggedInDept}</strong>
            </Typography>
          </Box>

          <TextField
            label="Handover Notes / Duty Memo (Optional)"
            placeholder={confirmModal.type === 'IN' ? 'e.g., Resumed OPD desk, till float counted' : 'e.g., Handed over Ward 3 beds to incoming staff'}
            value={clockNote}
            onChange={(e) => setClockNote(e.target.value)}
            multiline
            rows={2}
            fullWidth
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmModal({ open: false, type: 'IN' })} color="inherit" disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={confirmModal.type === 'IN' ? 'success' : 'error'}
            onClick={confirmModal.type === 'IN' ? handleClockIn : handleClockOut}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : confirmModal.type === 'IN' ? <CheckCircle /> : <ExitToApp />}
            sx={{ fontWeight: 800, px: 2.5 }}
          >
            {actionLoading ? 'Recording...' : confirmModal.type === 'IN' ? 'Clock In Now' : 'Confirm Clock Out'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ActiveDutySessionCard;
