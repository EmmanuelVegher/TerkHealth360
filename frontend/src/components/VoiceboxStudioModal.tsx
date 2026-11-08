import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Close,
  Mic,
  MicOff,
  VolumeUp,
  GraphicEq,
  Campaign,
  SettingsVoice,
  ContentCopy,
  AutoFixHigh,
  Refresh,
  CheckCircle,
  Memory,
  RecordVoiceOver,
  Download,
  LocalHospital,
} from '@mui/icons-material';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  voiceboxService,
  VoiceboxStatus,
  detectClientIsCpuOnlyLaptop,
  isBrowserOnServerHost,
} from '../services/voiceboxService';

interface VoiceboxStudioModalProps {
  open: boolean;
  onClose: () => void;
}

const CLINICAL_SPEECH_TEMPLATES = [
  {
    label: 'OPD Waiting Room Queue Call',
    specialty: 'GENERAL_OPD' as const,
    text: 'Attention please. Ticket number O P D 0 4 2, please proceed to Consulting Room 2 for your clinical assessment.',
  },
  {
    label: 'Eye Clinic — Post-Cataract & Glaucoma Drop Regimen',
    specialty: 'OPHTHALMOLOGY' as const,
    text: 'Please instil one drop of Moxifloxacin eye drops into the operated eye four times daily, and Prednisolone acetate eye drops every four hours. Avoid rubbing your eye or lifting heavy objects for two weeks.',
  },
  {
    label: 'Dental Clinic — Post-Extraction Home Care',
    specialty: 'DENTAL' as const,
    text: 'Keep firm biting pressure on the sterile gauze pad for 45 minutes. Do not rinse vigorously, spit, or drink through a straw for 24 hours. Starting tomorrow, rinse gently with warm salt water after meals.',
  },
  {
    label: 'Pharmacy — Antibiotic & Analgesic Dosage Guide',
    specialty: 'PHARMACY' as const,
    text: 'Take one tablet of Amoxicillin-Clavulanate 625 milligrams every 12 hours after meals for 7 full days, and Paracetamol 1 gram every 8 hours as needed for pain or fever.',
  },
  {
    label: 'Inpatient Ward — Discharge Summary & Follow-Up',
    specialty: 'DISCHARGE' as const,
    text: 'Your hospital discharge is complete. Continue your prescribed oral medications at home, monitor your blood pressure daily, and return to the Outpatient Clinic in 7 days for your scheduled review.',
  },
];

const LANGUAGES = [
  { code: 'en', label: 'English (en)' },
  { code: 'fr', label: 'French (fr)' },
  { code: 'ar', label: 'Arabic (ar)' },
  { code: 'sw', label: 'Swahili (sw)' },
  { code: 'es', label: 'Spanish (es)' },
  { code: 'pt', label: 'Portuguese (pt)' },
  { code: 'de', label: 'German (de)' },
  { code: 'zh', label: 'Chinese (zh)' },
  { code: 'hi', label: 'Hindi (hi)' },
];

export const VoiceboxStudioModal: React.FC<VoiceboxStudioModalProps> = ({ open, onClose }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [status, setStatus] = useState<VoiceboxStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Dictation state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [dictatedText, setDictatedText] = useState('');
  const [lastTranscriptionMeta, setLastTranscriptionMeta] = useState<{
    provider: string;
    model: string;
    ms: number;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const liveSpeechTextRef = useRef<string>('');

  // TTS Synthesizer state
  const [ttsText, setTtsText] = useState(CLINICAL_SPEECH_TEMPLATES[0].text);
  const [selectedSpecialty, setSelectedSpecialty] = useState<'GENERAL_OPD' | 'OPHTHALMOLOGY' | 'DENTAL' | 'PHARMACY' | 'DISCHARGE'>('GENERAL_OPD');
  const [selectedEngine, setSelectedEngine] = useState('kokoro');
  const [selectedProfile, setSelectedProfile] = useState('Nurse Chidinma (Hospital PA)');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [lastAudioBase64, setLastAudioBase64] = useState<string | null>(null);

  // Bridge Configuration state
  const [sidecarUrlInput, setSidecarUrlInput] = useState('http://127.0.0.1:17493');
  const [sttModelInput, setSttModelInput] = useState('whisper-small');
  const [autoRefineInput, setAutoRefineInput] = useState(true);
  const [useSpeakPillInput, setUseSpeakPillInput] = useState(true);
  const [forceCpuOnlyInput, setForceCpuOnlyInput] = useState(false);
  const [clientGpuInfo, setClientGpuInfo] = useState<{ isCpuOnly: boolean; renderer: string }>({
    isCpuOnly: false,
    renderer: '',
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const isCpuOnlyLaptopActive = Boolean(
    forceCpuOnlyInput ||
      status?.hardwareProfile?.isCpuOnlyLaptop ||
      status?.config?.forceCpuOnlyMode ||
      (isBrowserOnServerHost() && clientGpuInfo.isCpuOnly)
  );

  const fetchBridgeStatus = async (overrideCpuOnly?: boolean) => {
    setLoadingStatus(true);
    try {
      const clientCheck = detectClientIsCpuOnlyLaptop();
      setClientGpuInfo(clientCheck);
      const data = await voiceboxService.getStatus(
        typeof overrideCpuOnly === 'boolean' ? overrideCpuOnly : undefined
      );
      setStatus(data);
      if (data.config) {
        setSidecarUrlInput(data.config.baseUrl);
        const cpuMode =
          Boolean(data.config.forceCpuOnlyMode) ||
          Boolean(data.hardwareProfile?.isCpuOnlyLaptop) ||
          (isBrowserOnServerHost() && clientCheck.isCpuOnly);
        setForceCpuOnlyInput(Boolean(data.config.forceCpuOnlyMode));
        const allowedEngineIds = (data.supportedEngines || []).map((e) => e.id);
        const nextEngine = allowedEngineIds.includes(data.config.defaultEngine)
          ? data.config.defaultEngine
          : 'kokoro';
        setSelectedEngine(cpuMode && !['kokoro', 'luxtts'].includes(nextEngine) ? 'kokoro' : nextEngine);
        setSelectedProfile(data.config.defaultVoiceProfile || 'Nurse Chidinma (Hospital PA)');
        const nextStt = data.config.defaultSttModel || (cpuMode ? 'whisper-small' : 'whisper-turbo');
        setSttModelInput(
          cpuMode && !['whisper-small', 'whisper-base'].includes(nextStt) ? 'whisper-small' : nextStt
        );
        setAutoRefineInput(data.config.autoRefineClinicalText);
        setUseSpeakPillInput(data.config.useNativeSpeakPill);
      }
    } catch (err) {
      console.warn('[VoiceboxStudio] Could not fetch Voicebox status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleToggleCpuOnlyMode = async (checked: boolean) => {
    setForceCpuOnlyInput(checked);
    const nextEngine = checked && !['kokoro', 'luxtts'].includes(selectedEngine) ? 'kokoro' : selectedEngine;
    const nextStt =
      checked && !['whisper-small', 'whisper-base'].includes(sttModelInput)
        ? 'whisper-small'
        : sttModelInput;
    setSelectedEngine(nextEngine);
    setSttModelInput(nextStt);
    try {
      await voiceboxService.updateConfig({
        forceCpuOnlyMode: checked,
        defaultEngine: nextEngine,
        defaultSttModel: nextStt,
      });
      await fetchBridgeStatus(checked);
      enqueueSnackbar(
        checked
          ? 'CPU-Only Laptop Mode enabled: Showing only Kokoro 82M, LuxTTS, and Whisper Base/Small + ONNX Fallback.'
          : 'Hardware auto-detection restored.',
        { variant: 'info' }
      );
    } catch {}
  };

  useEffect(() => {
    if (open) {
      fetchBridgeStatus();
    } else {
      stopRecordingCleanup();
    }
  }, [open]);

  const stopRecordingCleanup = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
  };

  const handleToggleDictation = async () => {
    if (isRecording) {
      // Stop recording and transcribe
      setIsRecording(false);
      setIsTranscribing(true);

      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
        speechRecognitionRef.current = null;
      }

      let recordedBlob: Blob | null = null;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        recordedBlob = await new Promise<Blob>((resolve) => {
          if (!mediaRecorderRef.current) {
            return resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
          }
          mediaRecorderRef.current.onstop = () => {
            resolve(new Blob(audioChunksRef.current, { type: audioChunksRef.current[0]?.type || 'audio/webm' }));
          };
          try {
            mediaRecorderRef.current.stop();
          } catch {
            resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
          }
        });
      }

      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
        mediaStreamRef.current = null;
      }

      try {
        if (recordedBlob && recordedBlob.size > 400) {
          const result = await voiceboxService.transcribeAudioBlob(recordedBlob, {
            language: selectedLanguage,
            model: sttModelInput,
            refine: autoRefineInput,
            fallbackTranscript: liveSpeechTextRef.current,
          });
          if (result.text) {
            setDictatedText((prev) => (prev ? `${prev.trim()} ${result.text}` : result.text));
            setLastTranscriptionMeta({
              provider: result.provider,
              model: result.model,
              ms: result.ms,
            });
            enqueueSnackbar(`Transcribed via ${result.provider} (${result.model}) in ${result.ms}ms`, {
              variant: 'success',
            });
          }
        } else if (liveSpeechTextRef.current.trim()) {
          setDictatedText((prev) =>
            prev ? `${prev.trim()} ${liveSpeechTextRef.current.trim()}` : liveSpeechTextRef.current.trim()
          );
        }
      } catch (err: any) {
        if (liveSpeechTextRef.current.trim()) {
          setDictatedText((prev) =>
            prev ? `${prev.trim()} ${liveSpeechTextRef.current.trim()}` : liveSpeechTextRef.current.trim()
          );
        } else {
          enqueueSnackbar(err?.message || 'Could not transcribe audio clip.', { variant: 'warning' });
        }
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      liveSpeechTextRef.current = '';

      const mimeType =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : undefined;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);

      // Start Web Speech API live preview in parallel
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = selectedLanguage === 'en' ? 'en-US' : selectedLanguage;
          rec.onresult = (ev: any) => {
            let finalTranscript = '';
            for (let i = 0; i < ev.results.length; i++) {
              finalTranscript += ev.results[i][0].transcript + ' ';
            }
            liveSpeechTextRef.current = finalTranscript.trim();
          };
          speechRecognitionRef.current = rec;
          rec.start();
        } catch {}
      }
    } catch (err) {
      enqueueSnackbar('Microphone permission is required for clinical voice dictation.', { variant: 'error' });
    }
  };

  const handleSynthesizeAndPlay = async () => {
    if (!ttsText.trim()) return;
    setIsSynthesizing(true);
    try {
      const result = await voiceboxService.synthesizePatientInstructions({
        specialty: selectedSpecialty,
        instructionsText: ttsText,
        language: selectedLanguage,
        profile: selectedProfile,
        engine: selectedEngine,
      });
      if (result.audioBase64) {
        setLastAudioBase64(result.audioBase64);
      }
      enqueueSnackbar(
        result.handledBySidecar
          ? `Playing Voicebox neural synthesis (${selectedEngine} • ${selectedProfile})`
          : `Playing hospital voice synthesis (${selectedProfile})`,
        { variant: 'success' }
      );
    } catch (err: any) {
      enqueueSnackbar(err?.message || 'Speech synthesis failed', { variant: 'error' });
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await voiceboxService.updateConfig({
        baseUrl: sidecarUrlInput,
        defaultEngine: selectedEngine,
        defaultVoiceProfile: selectedProfile,
        defaultSttModel: sttModelInput,
        defaultLanguage: selectedLanguage,
        autoRefineClinicalText: autoRefineInput,
        useNativeSpeakPill: useSpeakPillInput,
        forceCpuOnlyMode: forceCpuOnlyInput,
      });
      await fetchBridgeStatus(forceCpuOnlyInput);
      enqueueSnackbar('Voicebox Bridge configuration saved and synced.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err?.message || 'Failed to update Voicebox configuration', { variant: 'error' });
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #0d1550 0%, #1e2a78 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2,
          px: 3,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <GraphicEq sx={{ fontSize: 28, color: '#38bdf8' }} />
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              Voicebox AI Clinical Voice Bridge
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              100% Local-First Neural TTS, Whisper Turbo Dictation & Waiting-Room PA Engine
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            icon={<Memory sx={{ color: '#fff !important', fontSize: 15 }} />}
            label={
              isCpuOnlyLaptopActive
                ? 'CPU-Only Laptop Mode (Kokoro 82M + LuxTTS + Whisper Small/Base)'
                : status?.sidecarOnline
                ? `Voicebox Sidecar Online (${status.gpuType || 'Local'})`
                : `Hardware: ${status?.hardwareProfile?.tier || 'Hybrid Local Mode'}`
            }
            sx={{
              bgcolor: isCpuOnlyLaptopActive
                ? 'rgba(245, 158, 11, 0.3)'
                : status?.sidecarOnline
                ? 'rgba(16, 185, 129, 0.25)'
                : 'rgba(56, 189, 248, 0.2)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)',
              fontWeight: 700,
              fontSize: '0.72rem',
            }}
          />
          <IconButton onClick={onClose} sx={{ color: '#fff' }} size="small">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: '#f8fafc' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab icon={<Campaign sx={{ fontSize: 18 }} />} iconPosition="start" label="Hospital PA & Patient Instructions (TTS)" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab icon={<SettingsVoice sx={{ fontSize: 18 }} />} iconPosition="start" label="Clinical Voice Dictation Pad (STT)" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab icon={<RecordVoiceOver sx={{ fontSize: 18 }} />} iconPosition="start" label="Voicebox Sidecar & MCP Settings" sx={{ fontWeight: 700, textTransform: 'none' }} />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Hardware Detection & CPU-Only Laptop Optimization Banner */}
        <Paper
          variant="outlined"
          sx={{
            p: 1.75,
            mb: 2.5,
            borderRadius: 2,
            bgcolor: isCpuOnlyLaptopActive ? 'rgba(245, 158, 11, 0.06)' : '#f8fafc',
            borderColor: isCpuOnlyLaptopActive ? 'rgba(245, 158, 11, 0.45)' : 'divider',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1.5}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Memory sx={{ fontSize: 18, color: isCpuOnlyLaptopActive ? '#d97706' : '#0284c7' }} />
                <Typography variant="subtitle2" fontWeight={800}>
                  {isCpuOnlyLaptopActive
                    ? 'Laptop Without GPU / Apple Chip Detected — CPU-Optimized Engine Filter Active'
                    : `Hardware Detected: ${status?.hardwareProfile?.cpuModel || 'Local Host'} (${status?.hardwareProfile?.cpuCores || 8} Cores • ${status?.hardwareProfile?.totalRamGb || 16} GB RAM)`}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                {isCpuOnlyLaptopActive
                  ? 'Heavy VRAM engines (Qwen3-TTS, Chatterbox, TADA, OmniVoice, Whisper Large) are hidden. Using only CPU-realtime engines below.'
                  : status?.hardwareProfile?.recommendationSummary ||
                    status?.hardwareProfile?.reason ||
                    'Toggle CPU-Only Laptop Mode to restrict engines for Dell Core i5 / non-GPU laptops.'}
              </Typography>
            </Box>
            <FormControlLabel
               sx={{ m: 0, whiteSpace: 'nowrap' }}
              control={
                <Switch
                  size="small"
                  color="warning"
                  checked={isCpuOnlyLaptopActive}
                  onChange={(e) => handleToggleCpuOnlyMode(e.target.checked)}
                />
              }
              label={
                <Typography variant="caption" fontWeight={800}>
                  CPU-Only Laptop Mode (No GPU / Apple Chip)
                </Typography>
              }
            />
          </Stack>

          {isCpuOnlyLaptopActive && (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ mt: 1.5, borderRadius: 1.5, bgcolor: '#fff' }}
            >
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.73rem' }}>Engine / Model</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.73rem' }}>Model Size</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.73rem' }}>RAM Used</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.73rem' }}>Speed on CPU</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.73rem' }}>Best Use Case in TerkHealth360</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow selected={selectedEngine === 'kokoro'}>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.74rem', color: '#1e2a78' }}>
                      kokoro (Kokoro 82M) (Default in our Bridge)
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }}>~350 MB (82M params)</TableCell>
                    <TableCell sx={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }}>~600 MB RAM</TableCell>
                    <TableCell sx={{ fontSize: '0.73rem' }}>~1–2 seconds per announcement (Realtime CPU)</TableCell>
                    <TableCell sx={{ fontSize: '0.73rem' }}>
                      <strong>#1 Choice for Preset Voices:</strong> Waiting-room PA queue calls, nurse station alerts, and patient instructions (50 built-in voices, 8 languages).
                    </TableCell>
                  </TableRow>
                  <TableRow selected={selectedEngine === 'luxtts'}>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.74rem', color: '#1e2a78' }}>
                      luxtts (LuxTTS / ZipVoice)
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }}>~300 MB</TableCell>
                    <TableCell sx={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }}>~800 MB RAM</TableCell>
                    <TableCell sx={{ fontSize: '0.73rem' }}>
                      Ultra-fast (uses multi-core CPU threading up to 8 threads)
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.73rem' }}>
                      <strong>#1 Choice for Voice Cloning on CPU:</strong> Zero-shot cloning of a local hospital staff voice at 48 kHz without needing a GPU.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.74rem', color: '#047857' }}>
                      Whisper base / small (STT) + Built-in ONNX Fallback
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }}>~150–480 MB</TableCell>
                    <TableCell sx={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }}>~500 MB RAM</TableCell>
                    <TableCell sx={{ fontSize: '0.73rem' }}>~1–3 seconds per dictation clip</TableCell>
                    <TableCell sx={{ fontSize: '0.73rem' }}>
                      Clinical voice dictation for SOAP notes, Dental Radiology, and Eye Clinic.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* TAB 0: Hospital PA & Patient Care Instructions (TTS) */}
        {activeTab === 0 && (
          <Stack spacing={2.5}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <strong>Zero-Trust Local Voice Synthesis:</strong> Generate natural spoken waiting-room calls, post-operative eye/dental care guides, and pharmacy dosage instructions without sending patient data to the cloud.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Voice Profile</InputLabel>
                  <Select
                    value={selectedProfile}
                    label="Voice Profile"
                    onChange={(e) => setSelectedProfile(e.target.value)}
                  >
                    {(status?.profiles || []).map((p) => (
                      <MenuItem key={p.id} value={p.name}>
                        {p.name} ({p.voice_type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>TTS Engine</InputLabel>
                  <Select
                    value={selectedEngine}
                    label="TTS Engine"
                    onChange={(e) => setSelectedEngine(e.target.value)}
                  >
                    {(status?.supportedEngines || [])
                      .filter((eng) => !isCpuOnlyLaptopActive || eng.cpuFriendly || ['kokoro', 'luxtts'].includes(eng.id))
                      .map((eng) => (
                        <MenuItem key={eng.id} value={eng.id}>
                          {eng.name} — {eng.modelSizeLabel} ({eng.ramUsedLabel})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={selectedLanguage}
                    label="Language"
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <MenuItem key={l.code} value={l.code}>
                        {l.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                QUICK CLINICAL ANNOUNCEMENT TEMPLATES:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {CLINICAL_SPEECH_TEMPLATES.map((tpl) => (
                  <Chip
                    key={tpl.label}
                    icon={<LocalHospital sx={{ fontSize: 15 }} />}
                    label={tpl.label}
                    clickable
                    onClick={() => {
                      setSelectedSpecialty(tpl.specialty);
                      setTtsText(tpl.text);
                    }}
                    color={selectedSpecialty === tpl.specialty && ttsText === tpl.text ? 'primary' : 'default'}
                    variant={selectedSpecialty === tpl.specialty && ttsText === tpl.text ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Stack>
            </Box>

            <TextField
              label="Spoken Clinical Script / Announcement Text"
              multiline
              rows={4}
              fullWidth
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="Type a patient queue call, medication instruction, or clinical announcement..."
            />

            <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {status?.sidecarOnline
                  ? `Connected to Voicebox Sidecar at ${status.sidecarUrl}`
                  : 'Using instant browser neural TTS (start Voicebox on :17493 for cloned voices & WAV export)'}
              </Typography>
              <Stack direction="row" spacing={1.5}>
                {lastAudioBase64 && (
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `data:audio/wav;base64,${lastAudioBase64}`;
                      link.download = `voicebox_${selectedSpecialty.toLowerCase()}_${Date.now()}.wav`;
                      link.click();
                    }}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    Download WAV
                  </Button>
                )}
                <Button
                  variant="contained"
                  startIcon={isSynthesizing ? <CircularProgress size={16} color="inherit" /> : <VolumeUp />}
                  disabled={isSynthesizing || !ttsText.trim()}
                  onClick={handleSynthesizeAndPlay}
                  sx={{
                    bgcolor: '#1e2a78',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 3,
                    '&:hover': { bgcolor: '#0d1550' },
                  }}
                >
                  {isSynthesizing ? 'Synthesizing...' : 'Synthesize & Speak Aloud'}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        )}

        {/* TAB 1: Clinical Voice Dictation Pad (STT + Refinement) */}
        {activeTab === 1 && (
          <Stack spacing={2.5}>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                bgcolor: isRecording ? 'rgba(239, 68, 68, 0.06)' : '#f8fafc',
                borderColor: isRecording ? '#ef4444' : 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  {isRecording
                    ? '🔴 Recording Clinical Dictation... Speak clearly into your microphone'
                    : isTranscribing
                    ? '🧠 Transcribing & refining medical terminology...'
                    : 'Hands-Free Clinical SOAP, Ophthalmology, Dental & Pathology Dictation'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Automatically removes spoken filler words (&quot;um&quot;, &quot;uh&quot;) and normalizes ophthalmic, dental, and pharmacological terms.
                </Typography>
              </Box>
              <Button
                variant="contained"
                color={isRecording ? 'error' : 'primary'}
                startIcon={
                  isTranscribing ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : isRecording ? (
                    <MicOff />
                  ) : (
                    <Mic />
                  )
                }
                disabled={isTranscribing}
                onClick={handleToggleDictation}
                sx={{ fontWeight: 800, textTransform: 'none', px: 3, py: 1.2, borderRadius: 2, whiteSpace: 'nowrap' }}
              >
                {isRecording ? 'Stop & Transcribe' : isTranscribing ? 'Transcribing...' : 'Start Dictation'}
              </Button>
            </Paper>

            <TextField
              label="Refined Clinical Transcript"
              multiline
              rows={5}
              fullWidth
              value={dictatedText}
              onChange={(e) => setDictatedText(e.target.value)}
              placeholder="Click 'Start Dictation' and speak your SOAP notes, slit-lamp findings, dental radiographic impression, or surgical report..."
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                {lastTranscriptionMeta && (
                  <Chip
                    size="small"
                    icon={<CheckCircle sx={{ fontSize: 14 }} />}
                    label={`Engine: ${lastTranscriptionMeta.provider} (${lastTranscriptionMeta.model}) • ${lastTranscriptionMeta.ms}ms`}
                    color="success"
                    variant="outlined"
                  />
                )}
              </Box>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<AutoFixHigh />}
                  disabled={!dictatedText.trim()}
                  onClick={async () => {
                    const res = await voiceboxService.transcribeAudioBlob(new Blob([]), {
                      fallbackTranscript: dictatedText,
                      refine: true,
                    });
                    if (res?.text) {
                      setDictatedText(res.text);
                      enqueueSnackbar('Applied clinical medical terminology refinement.', { variant: 'success' });
                    }
                  }}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Refine Medical Terms
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<VolumeUp />}
                  disabled={!dictatedText.trim()}
                  onClick={() =>
                    voiceboxService.speakText({
                      text: dictatedText,
                      profile: selectedProfile,
                      engine: selectedEngine,
                    })
                  }
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Read Back Aloud
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ContentCopy />}
                  disabled={!dictatedText.trim()}
                  onClick={() => {
                    navigator.clipboard.writeText(dictatedText);
                    enqueueSnackbar('Copied clinical transcript to clipboard!', { variant: 'success' });
                  }}
                  sx={{ bgcolor: '#1e2a78', textTransform: 'none', fontWeight: 700 }}
                >
                  Copy to Clipboard
                </Button>
              </Stack>
            </Stack>
          </Stack>
        )}

        {/* TAB 2: Voicebox Sidecar & MCP Settings */}
        {activeTab === 2 && (
          <Stack spacing={2.5}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" fontWeight={800}>
                    Voicebox Local Sidecar Status (`127.0.0.1:17493`)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {status?.sidecarOnline
                      ? `Connected • Version ${status.sidecarVersion} • GPU: ${status.gpuType}`
                      : `Sidecar not detected on ${sidecarUrlInput} — TerkHealth360 is running in Hybrid Fallback Mode (OpenMed Local Whisper ONNX + Browser TTS).`}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={loadingStatus ? <CircularProgress size={14} /> : <Refresh />}
                  onClick={() => fetchBridgeStatus()}
                  disabled={loadingStatus}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Probe Sidecar
                </Button>
              </Stack>
            </Paper>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Voicebox Sidecar Base URL"
                  size="small"
                  fullWidth
                  value={sidecarUrlInput}
                  onChange={(e) => setSidecarUrlInput(e.target.value)}
                  helperText="Default local Voicebox FastAPI / Tauri port is http://127.0.0.1:17493"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Whisper STT Model Size</InputLabel>
                  <Select
                    value={sttModelInput}
                    label="Whisper STT Model Size"
                    onChange={(e) => setSttModelInput(e.target.value)}
                  >
                    {(status?.supportedSttModels && status.supportedSttModels.length > 0
                      ? status.supportedSttModels.filter(
                          (m) => !isCpuOnlyLaptopActive || m.cpuFriendly
                        )
                      : [
                          {
                            id: 'whisper-small',
                            name: 'Whisper base / small (STT) + Built-in ONNX Fallback',
                            modelSizeLabel: '~150–480 MB',
                            ramUsedLabel: '~500 MB RAM',
                          },
                          {
                            id: 'whisper-base',
                            name: 'Whisper Base (CPU Ultra-Light) + Built-in ONNX Fallback',
                            modelSizeLabel: '~150 MB',
                            ramUsedLabel: '~400 MB RAM',
                          },
                        ]
                    ).map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.name} ({m.modelSizeLabel} • {m.ramUsedLabel})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider />

            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefineInput}
                    onChange={(e) => setAutoRefineInput(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={600}>
                    Auto-refine clinical transcripts (strip filler words & preserve medical/anatomical terminology)
                  </Typography>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={useSpeakPillInput}
                    onChange={(e) => setUseSpeakPillInput(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={600}>
                    Surface OS-level Voicebox Speaking Pill during hospital queue calls (`POST /speak`)
                  </Typography>
                }
              />
            </Stack>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleSaveConfig}
                disabled={savingConfig}
                sx={{ bgcolor: '#1e2a78', textTransform: 'none', fontWeight: 700, px: 3 }}
              >
                {savingConfig ? 'Saving & Syncing MCP Binding...' : 'Save & Sync with Voicebox MCP'}
              </Button>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

