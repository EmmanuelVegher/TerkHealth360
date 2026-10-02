import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Avatar,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material';
import {
  WarningAmber,
  Close,
  Chat,
  VolumeUp,
  VolumeOff,
  AccessTime,
  Person,
  Group,
  AttachFile
} from '@mui/icons-material';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ─── Loud Clinical Alert Sound Synthesizer (Web Audio API) ────────────────────
class ClinicalUrgentAlarm {
  private audioCtx: AudioContext | null = null;
  private isRunning = false;
  private intervalId: any = null;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.playChime();
      this.intervalId = setInterval(() => {
        if (this.isRunning) {
          this.playChime();
        }
      }, 2400);
    } catch (e) {
      console.warn('Unable to play synthesized audio alarm:', e);
    }
  }

  private playChime() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') return;
    try {
      const now = this.audioCtx.currentTime;

      const playTone = (freq: number, start: number, duration: number, type: OscillatorType = 'sawtooth') => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);

        // Loud sharp attack and smooth release
        gain.gain.setValueAtTime(0.35, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx!.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      // 4-pulse high-urgency alternating hospital alert tone
      playTone(920, now, 0.22, 'triangle');
      playTone(680, now + 0.25, 0.22, 'sawtooth');
      playTone(920, now + 0.50, 0.22, 'triangle');
      playTone(1100, now + 0.75, 0.38, 'sawtooth');
    } catch (_) {}
  }

  public stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch (_) {}
      this.audioCtx = null;
    }
  }
}

const alarmInstance = new ClinicalUrgentAlarm();

interface UrgentMessagePayload {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  recipientId?: string;
  recipientName?: string;
  text: string;
  attachment?: { name: string; type: string } | null;
  priority?: 'ROUTINE' | 'URGENT';
  timestamp: string;
  isGroup?: boolean;
}

export const GlobalUrgentMessageAlert: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeUrgentMsg, setActiveUrgentMsg] = useState<UrgentMessagePayload | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const seenMsgIdsRef = useRef<Set<string>>(new Set());
  const isPollingRef = useRef(false);

  // Stop alarm when muted or closed
  useEffect(() => {
    if (isMuted && activeUrgentMsg) {
      alarmInstance.stop();
    }
  }, [isMuted, activeUrgentMsg]);

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      alarmInstance.stop();
    };
  }, []);

  // ── Polling for Urgent Messages ────────────────────────────────────────────
  const checkUrgentMessages = useCallback(async () => {
    if (!user || isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      // 1. Check Direct Messages
      const dmRes = await api.get('/notifications/direct-messages/summary').catch(() => null);
      if (dmRes?.data?.success && Array.isArray(dmRes.data.data)) {
        const directMsgs: UrgentMessagePayload[] = dmRes.data.data;
        const incomingUrgent = directMsgs.filter(
          m =>
            m.priority === 'URGENT' &&
            m.recipientId === user.id &&
            m.senderId !== user.id &&
            !seenMsgIdsRef.current.has(m.id)
        );

        if (incomingUrgent.length > 0) {
          const latest = incomingUrgent[incomingUrgent.length - 1];
          seenMsgIdsRef.current.add(latest.id);
          setActiveUrgentMsg({ ...latest, isGroup: false });
          setIsMuted(false);
          alarmInstance.start();
          isPollingRef.current = false;
          return;
        }
      }

      // 2. Check General Group Messages
      const grpRes = await api.get('/notifications/general-group/messages').catch(() => null);
      if (grpRes?.data?.success && Array.isArray(grpRes.data.data)) {
        const groupMsgs: UrgentMessagePayload[] = grpRes.data.data;
        const groupUrgent = groupMsgs.filter(
          m =>
            m.priority === 'URGENT' &&
            m.senderId !== user.id &&
            m.senderName !== user.username &&
            !seenMsgIdsRef.current.has(m.id)
        );

        if (groupUrgent.length > 0) {
          const latest = groupUrgent[groupUrgent.length - 1];
          // Only pop up if created within the last 2 hours to avoid ancient backlog
          const msgTime = new Date(latest.timestamp).getTime();
          const isRecent = Date.now() - msgTime < 2 * 60 * 60 * 1000;

          if (isRecent) {
            seenMsgIdsRef.current.add(latest.id);
            setActiveUrgentMsg({ ...latest, isGroup: true });
            setIsMuted(false);
            alarmInstance.start();
          } else {
            seenMsgIdsRef.current.add(latest.id);
          }
        }
      }
    } catch (err) {
      // ignore background poll errors
    } finally {
      isPollingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    checkUrgentMessages();
    const timer = setInterval(checkUrgentMessages, 15000); // 15s interval: responsive yet light on client & network
    return () => clearInterval(timer);
  }, [checkUrgentMessages]);

  // ── Dismiss or Acknowledge Dialog ──────────────────────────────────────────
  const handleDismiss = () => {
    alarmInstance.stop();
    if (activeUrgentMsg) {
      seenMsgIdsRef.current.add(activeUrgentMsg.id);
    }
    setActiveUrgentMsg(null);
  };

  // ── Navigate to Messages & Open Target Chat ────────────────────────────────
  const handleOpenMessages = () => {
    alarmInstance.stop();
    if (activeUrgentMsg) {
      seenMsgIdsRef.current.add(activeUrgentMsg.id);
      const targetPayload = {
        targetUserId: activeUrgentMsg.isGroup ? null : activeUrgentMsg.senderId,
        isGroup: Boolean(activeUrgentMsg.isGroup)
      };
      sessionStorage.setItem('urgent_chat_target', JSON.stringify(targetPayload));
    }
    setActiveUrgentMsg(null);

    // If already on /messages, dispatch custom event so it refreshes active chat
    if (location.pathname.startsWith('/messages')) {
      window.dispatchEvent(new CustomEvent('urgent-chat-navigate'));
    } else {
      navigate('/messages');
    }
  };

  if (!activeUrgentMsg) return null;

  const formattedTime = (() => {
    try {
      return new Date(activeUrgentMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return 'Just now';
    }
  })();

  return (
    <Dialog
      open={Boolean(activeUrgentMsg)}
      onClose={handleDismiss}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          border: '2px solid #ef4444',
          boxShadow: '0 24px 60px rgba(220, 38, 38, 0.35)',
          animation: 'pulseBorder 2s infinite ease-in-out',
          '@keyframes pulseBorder': {
            '0%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.5)' },
            '70%': { boxShadow: '0 0 0 16px rgba(239, 68, 68, 0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' }
          }
        }
      }}
    >
      {/* ── Emergency Header Banner ── */}
      <Box
        sx={{
          bgcolor: '#dc2626',
          color: '#ffffff',
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: '#ffffff',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              animation: 'spinPulse 1.5s infinite linear',
              '@keyframes spinPulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.15)' },
                '100%': { transform: 'scale(1)' }
              }
            }}
          >
            <WarningAmber sx={{ fontSize: 26, fontWeight: 900 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.02em', lineHeight: 1.2 }}>
              URGENT CLINICAL MESSAGE AWAITING YOU
            </Typography>
            <Typography variant="caption" sx={{ color: '#fee2e2', fontWeight: 600 }}>
              Immediate hospital staff attention required
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title={isMuted ? 'Unmute alert tone' : 'Mute alarm'}>
            <IconButton
              size="small"
              onClick={() => setIsMuted(prev => !prev)}
              sx={{ color: '#ffffff', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
            >
              {isMuted ? <VolumeOff fontSize="small" /> : <VolumeUp fontSize="small" />}
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            onClick={handleDismiss}
            sx={{ color: '#ffffff', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* ── Dialog Content ── */}
      <DialogContent sx={{ p: 3, bgcolor: '#fef2f2' }}>
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            bgcolor: '#ffffff',
            borderRadius: 3,
            border: '1.5px solid #fca5a5'
          }}
        >
          {/* Sender & Channel metadata */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: '#dc2626', width: 44, height: 44, fontWeight: 800 }}>
                {activeUrgentMsg.senderName?.[0] || 'S'}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 850, color: '#0f172a', lineHeight: 1.2 }}>
                  {activeUrgentMsg.senderName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  {activeUrgentMsg.senderRole || 'Hospital Staff'}
                </Typography>
              </Box>
            </Stack>

            <Stack spacing={0.5} alignItems="flex-end">
              <Chip
                icon={activeUrgentMsg.isGroup ? <Group sx={{ fontSize: '0.85rem !important' }} /> : <Person sx={{ fontSize: '0.85rem !important' }} />}
                label={activeUrgentMsg.isGroup ? 'General Staff Group' : 'Direct Message'}
                size="small"
                sx={{
                  bgcolor: activeUrgentMsg.isGroup ? '#f0fdf4' : '#eff6ff',
                  color: activeUrgentMsg.isGroup ? '#166534' : '#1e40af',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  border: '1px solid #cbd5e1'
                }}
              />
              <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
                <AccessTime sx={{ fontSize: 13 }} /> {formattedTime}
              </Typography>
            </Stack>
          </Box>

          {/* Message Content Preview */}
          <Box
            sx={{
              p: 2,
              bgcolor: '#fff5f5',
              borderRadius: 2,
              borderLeft: '4px solid #dc2626',
              mb: activeUrgentMsg.attachment ? 1.5 : 0
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontWeight: 650,
                color: '#7f1d1d',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '0.95rem',
                lineHeight: 1.5
              }}
            >
              {activeUrgentMsg.text || 'Urgent media attachment sent.'}
            </Typography>
          </Box>

          {/* Attachment Preview Badge */}
          {activeUrgentMsg.attachment && (
            <Chip
              icon={<AttachFile sx={{ fontSize: '0.9rem !important' }} />}
              label={`Attachment: ${activeUrgentMsg.attachment.name}`}
              size="small"
              sx={{
                bgcolor: '#fee2e2',
                color: '#991b1b',
                fontWeight: 750,
                fontSize: '0.75rem',
                mt: 1.5
              }}
            />
          )}
        </Paper>
      </DialogContent>

      {/* ── Dialog Actions ── */}
      <DialogActions sx={{ p: 2.5, bgcolor: '#fef2f2', borderTop: '1px solid #fecaca', justifyContent: 'space-between' }}>
        <Button
          onClick={handleDismiss}
          variant="outlined"
          sx={{
            borderColor: '#94a3b8',
            color: '#475569',
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: 2,
            px: 2.5,
            '&:hover': { bgcolor: '#f1f5f9', borderColor: '#64748b' }
          }}
        >
          Acknowledge & Dismiss
        </Button>

        <Button
          onClick={handleOpenMessages}
          variant="contained"
          startIcon={<Chat />}
          sx={{
            bgcolor: '#dc2626',
            color: '#ffffff',
            fontWeight: 850,
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            py: 1,
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
            '&:hover': { bgcolor: '#b91c1c' }
          }}
        >
          Open & Reply in Messages
        </Button>
      </DialogActions>
    </Dialog>
  );
};
