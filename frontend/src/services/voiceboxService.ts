import { api } from './api';

export interface VoiceboxBridgeConfig {
  baseUrl: string;
  clientId: string;
  defaultEngine: string;
  defaultModelSize: string;
  defaultVoiceProfile: string;
  defaultSttModel: string;
  defaultLanguage: string;
  autoRefineClinicalText: boolean;
  useNativeSpeakPill: boolean;
  forceCpuOnlyMode: boolean;
}

export interface HardwareProfile {
  tier: 'APPLE_SILICON' | 'DEDICATED_GPU' | 'CPU_ONLY';
  isCpuOnlyLaptop: boolean;
  hasDedicatedGpu: boolean;
  hasAppleSilicon: boolean;
  cpuModel: string;
  cpuCores: number;
  totalRamGb: number;
  gpuRenderer?: string;
  recommendationSummary?: string;
  reason?: string;
}

export interface VoiceboxEngineSpec {
  id: string;
  name: string;
  languages: number;
  strengths: string;
  modelSizeLabel: string;
  ramUsedLabel: string;
  speedLabel: string;
  cpuFriendly: boolean;
}

export interface VoiceboxSttModelSpec {
  id: string;
  name: string;
  modelSizeLabel: string;
  ramUsedLabel: string;
  speedLabel: string;
  useCase: string;
  cpuFriendly: boolean;
}

export interface VoiceboxProfile {
  id: string;
  name: string;
  voice_type: 'cloned' | 'preset' | 'designed';
  language: string;
  default_engine?: string | null;
  has_personality?: boolean;
  description?: string | null;
}

export interface VoiceboxStatus {
  sidecarOnline: boolean;
  sidecarUrl: string;
  sidecarVersion?: string;
  gpuAvailable: boolean;
  gpuType?: string;
  modelLoaded: boolean;
  hardwareProfile: HardwareProfile;
  fallbackOfflineStt: {
    available: boolean;
    model: string | null;
    loaded: boolean;
  };
  config: VoiceboxBridgeConfig;
  supportedEngines: VoiceboxEngineSpec[];
  supportedSttModels: VoiceboxSttModelSpec[];
  profiles: VoiceboxProfile[];
}

/** True when the EMR is opened on the same machine that runs the backend/Voicebox. */
export function isBrowserOnServerHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

/**
 * Inspect browser WebGL renderer & platform to detect whether the client device
 * is a CPU-only laptop (e.g., Dell Core i5 with Intel UHD/Iris integrated graphics,
 * without an Apple Silicon M-series chip or a dedicated NVIDIA/AMD Radeon GPU).
 */
export function detectClientIsCpuOnlyLaptop(): {
  isCpuOnly: boolean;
  renderer: string;
} {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { isCpuOnly: false, renderer: 'unknown' };
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    let renderer = '';
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
      }
    }
    const ua = navigator.userAgent || '';
    const hasAppleChip = /Apple M\d|Apple GPU/i.test(renderer) || (/Macintosh/i.test(ua) && /Apple/i.test(renderer));
    const hasDedicatedGpu = /NVIDIA|GeForce|RTX|GTX|Quadro|Radeon RX|AMD Radeon Pro/i.test(renderer);
    const isIntelOrIntegratedCpu = /Intel|UHD|Iris|HD Graphics|SwiftShader|llvmpipe|Microsoft Basic Render/i.test(renderer);

    const isCpuOnly = isIntelOrIntegratedCpu || (!hasAppleChip && !hasDedicatedGpu);
    return { isCpuOnly, renderer: renderer || 'Standard CPU/Integrated Graphics' };
  } catch {
    return { isCpuOnly: false, renderer: 'unknown' };
  }
}

/**
 * Convert a recorded browser Audio Blob into a 16 kHz mono Float32 PCM Base64 string
 * ready for `/api/voicebox/transcribe` or `/api/openmed/transcribe-voice`.
 */
export async function audioBlobTo16kPcmBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const decodeCtx = new AudioCtx();
  try {
    const decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
    const targetRate = 16000;
    const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
    const offlineCtx = new OfflineAudioContext(1, length, targetRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);
    const rendered = await offlineCtx.startRendering();
    const float32 = rendered.getChannelData(0);

    const bytes = new Uint8Array(float32.buffer, float32.byteOffset, float32.byteLength);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
  } finally {
    try {
      await decodeCtx.close();
    } catch {}
  }
}

/**
 * Play base64-encoded WAV/MP3 audio in the browser, or fall back to
 * Web Speech Synthesis (`window.speechSynthesis`) when running without a GPU sidecar.
 */
export async function playSynthesizedOrFallbackAudio(params: {
  audioBase64?: string;
  mimeType?: string;
  fallbackText: string;
  language?: string;
  rate?: number;
}): Promise<{ playedVia: 'voicebox-neural-audio' | 'browser-web-speech' | 'none' }> {
  if (params.audioBase64) {
    try {
      const mime = params.mimeType || 'audio/wav';
      const audio = new Audio(`data:${mime};base64,${params.audioBase64}`);
      await audio.play();
      return { playedVia: 'voicebox-neural-audio' };
    } catch (err) {
      console.warn('[VoiceboxBridge] Failed to play base64 audio, falling back to Web Speech:', err);
    }
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window && params.fallbackText) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(params.fallbackText);
      utterance.lang = params.language && params.language.length >= 2 ? params.language : 'en-US';
      utterance.rate = params.rate || 0.98;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /natural|neural|samantha|victoria|daniel|google uk|google us/i.test(v.name)) ||
        voices.find((v) => v.lang.toLowerCase().startsWith((params.language || 'en').toLowerCase()));
      if (preferred) {
        utterance.voice = preferred;
      }

      window.speechSynthesis.speak(utterance);
      return { playedVia: 'browser-web-speech' };
    } catch (err) {
      console.warn('[VoiceboxBridge] Web Speech synthesis failed:', err);
    }
  }

  return { playedVia: 'none' };
}

export const voiceboxService = {
  async getStatus(forceClientCpuCheck?: boolean): Promise<VoiceboxStatus> {
    // All Whisper / TTS inference runs on the SERVER (backend proxies to the Voicebox
    // sidecar), so a remote client laptop's GPU is irrelevant. Client-side hardware is
    // only considered when the browser is running on the server machine itself.
    const clientDetection = detectClientIsCpuOnlyLaptop();
    const cpuOnlyParam =
      typeof forceClientCpuCheck === 'boolean'
        ? forceClientCpuCheck
        : isBrowserOnServerHost() && clientDetection.isCpuOnly;
    const res = await api.get('/voicebox/status', {
      params: cpuOnlyParam ? { cpuOnly: 'true' } : undefined,
    });
    return res.data.data;
  },

  async updateConfig(config: Partial<VoiceboxBridgeConfig>) {
    const res = await api.put('/voicebox/config', config);
    return res.data.data;
  },

  async transcribeAudioBlob(
    blob: Blob,
    options?: { language?: string; model?: string; refine?: boolean; fallbackTranscript?: string }
  ): Promise<{
    text: string;
    rawText: string;
    model: string;
    provider: string;
    ms: number;
  }> {
    try {
      const pcmBase64 = await audioBlobTo16kPcmBase64(blob);
      const res = await api.post('/voicebox/transcribe', {
        pcmBase64,
        language: options?.language,
        model: options?.model,
        refine: options?.refine ?? true,
      });
      if (res.data?.success && res.data?.data?.text) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[VoiceboxBridge] Server transcription error, checking fallback transcript:', err);
    }

    if (options?.fallbackTranscript?.trim()) {
      const res = await api.post('/voicebox/transcribe', {
        existingTranscript: options.fallbackTranscript.trim(),
        refine: options?.refine ?? true,
      });
      return res.data.data;
    }

    throw new Error('No speech detected or transcription engine unavailable.');
  },

  async speakText(params: {
    text: string;
    profile?: string;
    engine?: string;
    language?: string;
    speed?: number;
    instructions?: string;
    playOnServerSpeaker?: boolean;
  }) {
    const res = await api.post('/voicebox/speak', params);
    const data = res.data.data;
    const playback = await playSynthesizedOrFallbackAudio({
      audioBase64: data.audioBase64,
      mimeType: data.mimeType,
      fallbackText: data.fallbackText || params.text,
      language: params.language,
      rate: params.speed,
    });
    return { ...data, ...playback };
  },

  async announceQueueCall(params: {
    tokenNumber: string;
    patientName: string;
    department: string;
    doctorName?: string;
    profile?: string;
    engine?: string;
    language?: string;
  }) {
    try {
      const res = await api.post('/voicebox/announce-queue', params);
      const data = res.data.data;
      const playback = await playSynthesizedOrFallbackAudio({
        audioBase64: data.audioBase64,
        mimeType: data.mimeType,
        fallbackText: data.announcementText,
        language: params.language || 'en-US',
      });
      return { ...data, ...playback };
    } catch {
      const fallbackScript = params.doctorName
        ? `Attention please. Ticket number ${params.tokenNumber}, ${params.patientName}, please proceed to ${params.department} to see ${params.doctorName}.`
        : `Attention please. Ticket number ${params.tokenNumber}, ${params.patientName}, please proceed to ${params.department}.`;
      const playback = await playSynthesizedOrFallbackAudio({
        fallbackText: fallbackScript,
        language: params.language || 'en-US',
      });
      return {
        announcementText: fallbackScript,
        handledBySidecar: false,
        ...playback,
      };
    }
  },

  async synthesizePatientInstructions(params: {
    patientName?: string;
    specialty: 'GENERAL_OPD' | 'OPHTHALMOLOGY' | 'DENTAL' | 'PHARMACY' | 'DISCHARGE';
    instructionsText: string;
    language?: string;
    profile?: string;
    engine?: string;
  }) {
    const res = await api.post('/voicebox/patient-instructions', params);
    const data = res.data.data;
    const playback = await playSynthesizedOrFallbackAudio({
      audioBase64: data.audioBase64,
      mimeType: data.mimeType,
      fallbackText: data.script,
      language: params.language || 'en-US',
    });
    return { ...data, ...playback };
  },
};

