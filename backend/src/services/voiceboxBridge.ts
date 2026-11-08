/**
 * Voicebox Bridge Service for TerkHealth360
 * ─────────────────────────────────────────────────────────────────────────────
 * Connects TerkHealth360 to a local or LAN Voicebox sidecar server
 * (default: http://127.0.0.1:17493) for:
 *   1. Multi-Engine Neural TTS (Kokoro 82M, LuxTTS, Qwen3-TTS, Chatterbox, TADA, OmniVoice)
 *   2. Local Whisper Speech-to-Text (STT) + Medical Terminology Refinement
 *   3. Hardware-Aware CPU-Only Laptop Optimization (auto-detects Dell/Intel Core i5
 *      laptops without a dedicated GPU or Apple Silicon chip and restricts to
 *      CPU-realtime engines: `kokoro`, `luxtts`, and `whisper-base`/`whisper-small` + ONNX)
 *   4. Hospital PA Queue Announcements & Multilingual Patient Instructions
 *   5. MCP Client Binding (`X-Voicebox-Client-Id: terkhealth360-emr`)
 */
import '../utils/fetchPolyfill.js';
import os from 'os';
import { execSync } from 'child_process';
import { transcribeOffline, getOfflineSTTStatus } from '../utils/offlineSpeechToText.js';

export type HardwareTier = 'CPU_ONLY' | 'APPLE_SILICON_MLX' | 'DEDICATED_GPU';

export interface HardwareProfile {
  tier: HardwareTier;
  isCpuOnlyLaptop: boolean;
  hasAppleSilicon: boolean;
  hasDedicatedGpu: boolean;
  cpuModel: string;
  cpuCores: number;
  totalRamGb: number;
  gpuRenderer: string;
  recommendationSummary: string;
}

export interface VoiceboxEngineSpec {
  id: string;
  name: string;
  modelSizeLabel: string;
  ramUsedLabel: string;
  speedLabel: string;
  languages: number;
  strengths: string;
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

export interface VoiceboxProfileSummary {
  id: string;
  name: string;
  voice_type: 'cloned' | 'preset' | 'designed';
  language: string;
  default_engine?: string | null;
  has_personality?: boolean;
  description?: string | null;
}

export interface VoiceboxStatusSummary {
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
  profiles: VoiceboxProfileSummary[];
}

export const ALL_VOICEBOX_ENGINES: VoiceboxEngineSpec[] = [
  {
    id: 'kokoro',
    name: 'kokoro (Kokoro 82M) (Default in our Bridge)',
    modelSizeLabel: '~350 MB (82M params)',
    ramUsedLabel: '~600 MB RAM',
    speedLabel: '~1–2 seconds per announcement (Realtime CPU)',
    languages: 8,
    strengths:
      '#1 Choice for Preset Voices: Waiting-room PA queue calls, nurse station alerts, and patient instructions (50 built-in voices, 8 languages).',
    cpuFriendly: true,
  },
  {
    id: 'luxtts',
    name: 'luxtts (LuxTTS / ZipVoice)',
    modelSizeLabel: '~300 MB',
    ramUsedLabel: '~800 MB RAM',
    speedLabel: 'Ultra-fast (uses multi-core CPU threading up to 8 threads)',
    languages: 1,
    strengths:
      '#1 Choice for Voice Cloning on CPU: Zero-shot cloning of a local hospital staff voice at 48 kHz without needing a GPU.',
    cpuFriendly: true,
  },
  {
    id: 'qwen',
    name: 'Qwen3-TTS (1.7B / 0.6B)',
    modelSizeLabel: '~1.2 GB – 3.5 GB',
    ramUsedLabel: '~2.5 GB – 5 GB VRAM',
    speedLabel: 'Realtime on Apple Silicon MLX / NVIDIA CUDA',
    languages: 10,
    strengths: 'High-fidelity multilingual zero-shot voice cloning (requires Apple Silicon or Dedicated GPU).',
    cpuFriendly: false,
  },
  {
    id: 'qwen_custom_voice',
    name: 'Qwen CustomVoice',
    modelSizeLabel: '~1.2 GB – 3.5 GB',
    ramUsedLabel: '~2.5 GB – 5 GB VRAM',
    speedLabel: 'Realtime on Apple Silicon MLX / NVIDIA CUDA',
    languages: 10,
    strengths: 'Curated preset speakers with natural-language delivery control (requires GPU / MLX).',
    cpuFriendly: false,
  },
  {
    id: 'qwen_voice_design',
    name: 'Qwen VoiceDesign (1.7B)',
    modelSizeLabel: '~3.5 GB',
    ramUsedLabel: '~5 GB VRAM',
    speedLabel: 'Realtime on Apple Silicon MLX / NVIDIA CUDA',
    languages: 10,
    strengths: 'Synthesize custom voices from text descriptions (requires GPU / MLX).',
    cpuFriendly: false,
  },
  {
    id: 'chatterbox',
    name: 'Chatterbox Multilingual',
    modelSizeLabel: '~3.0 GB – 3.2 GB',
    ramUsedLabel: '~4.5 GB VRAM',
    speedLabel: 'Realtime on Apple Silicon MLX / NVIDIA CUDA',
    languages: 23,
    strengths: '23 languages for diverse patient instructions (requires GPU / MLX).',
    cpuFriendly: false,
  },
  {
    id: 'chatterbox_turbo',
    name: 'Chatterbox Turbo',
    modelSizeLabel: '~1.5 GB (350M params)',
    ramUsedLabel: '~2.5 GB VRAM',
    speedLabel: 'Fast on GPU',
    languages: 1,
    strengths: 'Low-latency English with expressive paralinguistic tags (requires GPU).',
    cpuFriendly: false,
  },
  {
    id: 'tada',
    name: 'HumeAI TADA (1B / 3B)',
    modelSizeLabel: '~4.0 GB – 8.0 GB',
    ramUsedLabel: '~6 GB – 10 GB VRAM',
    speedLabel: 'GPU Accelerated',
    languages: 10,
    strengths: 'Long-form coherent clinical narratives 700s+ (requires GPU).',
    cpuFriendly: false,
  },
  {
    id: 'omnivoice',
    name: 'OmniVoice Multilingual',
    modelSizeLabel: '~3.3 GB',
    ramUsedLabel: '~5 GB VRAM',
    speedLabel: 'GPU Accelerated',
    languages: 23,
    strengths: 'Broad multilingual synthesis with instruct support (requires GPU).',
    cpuFriendly: false,
  },
];

export const ALL_STT_MODELS: VoiceboxSttModelSpec[] = [
  {
    id: 'whisper-small',
    name: 'Whisper base / small (STT) + Built-in ONNX Fallback',
    modelSizeLabel: '~150–480 MB',
    ramUsedLabel: '~500 MB RAM',
    speedLabel: '~1–3 seconds per dictation clip',
    useCase: 'Clinical voice dictation for SOAP notes, Dental Radiology, and Eye Clinic.',
    cpuFriendly: true,
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base (CPU Ultra-Light) + Built-in ONNX Fallback',
    modelSizeLabel: '~150 MB',
    ramUsedLabel: '~400 MB RAM',
    speedLabel: '~1–2 seconds per dictation clip',
    useCase: 'Fastest CPU-only clinical dictation for standard Intel Core i3/i5 laptops.',
    cpuFriendly: true,
  },
  {
    id: 'whisper-turbo',
    name: 'Whisper Large v3 Turbo (GPU / Apple Silicon)',
    modelSizeLabel: '~1.6 GB',
    ramUsedLabel: '~2.5 GB VRAM',
    speedLabel: '~8x faster than Large v3 on GPU/MLX',
    useCase: 'High-speed GPU/MLX multilingual medical transcription.',
    cpuFriendly: false,
  },
  {
    id: 'whisper-large',
    name: 'Whisper Large v3 (Maximum GPU Accuracy)',
    modelSizeLabel: '~3.1 GB',
    ramUsedLabel: '~4.5 GB VRAM',
    speedLabel: 'GPU / Apple Silicon MLX required',
    useCase: 'Heavy complex medical dictation on dedicated GPU workstations.',
    cpuFriendly: false,
  },
];

export const CPU_LAPTOP_PROFILES: VoiceboxProfileSummary[] = [
  {
    id: 'hospital-pa-chidinma',
    name: 'Nurse Chidinma (Hospital PA — Kokoro 82M)',
    voice_type: 'preset',
    language: 'en',
    default_engine: 'kokoro',
    has_personality: true,
    description: 'Kokoro 82M preset voice (~350 MB, ~1–2s on CPU) for waiting-room PA queue calls & alerts',
  },
  {
    id: 'clinical-narrator-morgan',
    name: 'Dr. Morgan (Clinical Briefing — Kokoro 82M)',
    voice_type: 'preset',
    language: 'en',
    default_engine: 'kokoro',
    has_personality: true,
    description: 'Kokoro 82M physician preset voice for Eye Clinic, Dental & Discharge instructions on CPU',
  },
  {
    id: 'cloned-staff-luxtts',
    name: 'Hospital Custom Cloned Voice (LuxTTS 48kHz CPU)',
    voice_type: 'cloned',
    language: 'en',
    default_engine: 'luxtts',
    has_personality: false,
    description: 'Zero-shot cloned hospital voice powered by LuxTTS (~300 MB, multi-core CPU threading up to 8 threads)',
  },
];

let cachedHardwareDetection: HardwareProfile | null = null;

/**
 * Detect whether the host machine has an Apple Silicon chip, a dedicated GPU (NVIDIA/AMD),
 * or is a CPU-only laptop/PC (e.g., Dell Intel Core i5 without discrete GPU).
 */
export function detectLocalHardwareProfile(
  sidecarGpuAvailable = false,
  sidecarGpuType?: string,
  forceCpuOnly = false
): HardwareProfile {
  const cpus = os.cpus() || [];
  const cpuModel = cpus[0]?.model?.trim() || 'Intel Core i5 / Generic CPU';
  const cpuCores = cpus.length || 4;
  const totalRamGb = Math.round((os.totalmem() / (1024 ** 3)) * 10) / 10;

  if (forceCpuOnly) {
    return {
      tier: 'CPU_ONLY',
      isCpuOnlyLaptop: true,
      hasAppleSilicon: false,
      hasDedicatedGpu: false,
      cpuModel,
      cpuCores,
      totalRamGb,
      gpuRenderer: 'CPU-Only Mode (Intel / Integrated Graphics)',
      recommendationSummary:
        'CPU-Only Laptop Mode Active: Restricted to Kokoro 82M (~350 MB), LuxTTS (~300 MB), and Whisper Base/Small + ONNX Fallback (~150–480 MB).',
    };
  }

  const isDarwinArm64 = process.platform === 'darwin' && process.arch === 'arm64';
  const isAppleChipModel = /Apple M\d/i.test(cpuModel);
  const hasAppleSilicon = isDarwinArm64 || isAppleChipModel;

  let hasDedicatedGpu = Boolean(sidecarGpuAvailable && !hasAppleSilicon);
  let gpuRenderer = sidecarGpuType || '';

  if (!hasAppleSilicon && !hasDedicatedGpu && cachedHardwareDetection === null) {
    // Probe for NVIDIA CUDA GPU (`nvidia-smi`) on Windows/Linux
    try {
      const nvidiaOut = execSync('nvidia-smi --query-gpu=name --format=csv,noheader', {
        timeout: 1500,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim();
      if (nvidiaOut && nvidiaOut.length > 2) {
        hasDedicatedGpu = true;
        gpuRenderer = `NVIDIA CUDA (${nvidiaOut.split('\n')[0].trim()})`;
      }
    } catch {
      // No NVIDIA GPU
    }
  }

  if (hasAppleSilicon) {
    const profile: HardwareProfile = {
      tier: 'APPLE_SILICON_MLX',
      isCpuOnlyLaptop: false,
      hasAppleSilicon: true,
      hasDedicatedGpu: false,
      cpuModel,
      cpuCores,
      totalRamGb,
      gpuRenderer: sidecarGpuType || `Apple Silicon Metal / MLX (${cpuModel})`,
      recommendationSummary:
        'Apple Silicon (MLX / Neural Engine) detected. All 9 TTS engines and CPU-lightweight engines (Kokoro 82M & LuxTTS) are supported.',
    };
    cachedHardwareDetection = profile;
    return profile;
  }

  if (hasDedicatedGpu) {
    const profile: HardwareProfile = {
      tier: 'DEDICATED_GPU',
      isCpuOnlyLaptop: false,
      hasAppleSilicon: false,
      hasDedicatedGpu: true,
      cpuModel,
      cpuCores,
      totalRamGb,
      gpuRenderer: gpuRenderer || 'Dedicated GPU (CUDA / ROCm)',
      recommendationSummary:
        'Dedicated GPU detected. All 9 TTS engines and Whisper Turbo are supported.',
    };
    cachedHardwareDetection = profile;
    return profile;
  }

  const cpuOnlyProfile: HardwareProfile = {
    tier: 'CPU_ONLY',
    isCpuOnlyLaptop: true,
    hasAppleSilicon: false,
    hasDedicatedGpu: false,
    cpuModel,
    cpuCores,
    totalRamGb,
    gpuRenderer: 'Integrated Graphics / CPU-Only (No Dedicated GPU or Apple Silicon)',
    recommendationSummary:
      'CPU-Only Laptop Detected: Automatically configured to show and use only CPU-realtime engines — kokoro (Kokoro 82M), luxtts (LuxTTS / ZipVoice), and Whisper base / small + Built-in ONNX Fallback.',
  };
  cachedHardwareDetection = cpuOnlyProfile;
  return cpuOnlyProfile;
}

const initialHw = detectLocalHardwareProfile(false, undefined, false);

let runtimeConfig: VoiceboxBridgeConfig = {
  baseUrl: (process.env.VOICEBOX_URL || 'http://127.0.0.1:17493').replace(/\/+$/, ''),
  clientId: process.env.VOICEBOX_CLIENT_ID || 'terkhealth360-emr',
  defaultEngine: 'kokoro',
  defaultModelSize: 'default',
  defaultVoiceProfile: 'Nurse Chidinma (Hospital PA — Kokoro 82M)',
  defaultSttModel: initialHw.isCpuOnlyLaptop ? 'whisper-small' : (process.env.VOICEBOX_STT_MODEL || 'whisper-small'),
  defaultLanguage: 'en',
  autoRefineClinicalText: true,
  useNativeSpeakPill: true,
  forceCpuOnlyMode: initialHw.isCpuOnlyLaptop,
};

export function getVoiceboxConfig(): VoiceboxBridgeConfig {
  return { ...runtimeConfig };
}

export function updateVoiceboxConfig(partial: Partial<VoiceboxBridgeConfig>): VoiceboxBridgeConfig {
  if (partial.baseUrl) {
    partial.baseUrl = partial.baseUrl.trim().replace(/\/+$/, '');
  }
  runtimeConfig = {
    ...runtimeConfig,
    ...partial,
  };

  // If CPU-Only Mode is active, ensure engine and STT model remain on CPU-safe engines
  const hw = detectLocalHardwareProfile(false, undefined, runtimeConfig.forceCpuOnlyMode);
  if (hw.isCpuOnlyLaptop) {
    if (runtimeConfig.defaultEngine !== 'kokoro' && runtimeConfig.defaultEngine !== 'luxtts') {
      runtimeConfig.defaultEngine = 'kokoro';
    }
    if (runtimeConfig.defaultSttModel !== 'whisper-small' && runtimeConfig.defaultSttModel !== 'whisper-base') {
      runtimeConfig.defaultSttModel = 'whisper-small';
    }
  }

  return getVoiceboxConfig();
}

/**
 * Convert a 16 kHz mono Float32Array PCM buffer into a valid 16-bit PCM WAV Buffer
 * so it can be uploaded directly to Voicebox's `POST /transcribe` multipart endpoint.
 */
export function encodeFloat32PcmToWavBuffer(samples: Float32Array, sampleRate = 16000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    buffer.writeInt16LE(Math.round(int16), offset);
    offset += 2;
  }

  return buffer;
}

/**
 * Probe the Voicebox sidecar `/health` and `/profiles` endpoints,
 * and filter engines/models based on whether the machine has a GPU/Apple Chip or is CPU-only.
 */
export async function getVoiceboxStatus(clientReportsCpuOnly?: boolean): Promise<VoiceboxStatusSummary> {
  const fallbackOfflineStt = getOfflineSTTStatus();
  let sidecarOnline = false;
  let sidecarVersion: string | undefined;
  let gpuAvailable = false;
  let gpuType: string | undefined;
  let modelLoaded = false;
  let profiles: VoiceboxProfileSummary[] = [...CPU_LAPTOP_PROFILES];

  try {
    const healthRes = await fetch(`${runtimeConfig.baseUrl}/health`, {
      method: 'GET',
      headers: { 'X-Voicebox-Client-Id': runtimeConfig.clientId },
      signal: AbortSignal.timeout(2500),
    });

    if (healthRes.ok) {
      const body: any = await healthRes.json();
      if (body && body.status === 'healthy') {
        sidecarOnline = true;
        sidecarVersion = body.version || '0.6.0';
        gpuAvailable = Boolean(body.gpu_available);
        gpuType =
          body.gpu_type ||
          body.backend_type ||
          (gpuAvailable ? 'Hardware Accelerated (MLX / CUDA)' : 'CPU');
        modelLoaded = Boolean(body.model_loaded);
      }
    }
  } catch {
    sidecarOnline = false;
  }

  const effectiveForceCpu = Boolean(runtimeConfig.forceCpuOnlyMode || clientReportsCpuOnly);
  const hardwareProfile = detectLocalHardwareProfile(gpuAvailable, gpuType, effectiveForceCpu);

  // When a CPU-only laptop (no GPU and no Apple Silicon) is detected, ONLY expose
  // `kokoro`, `luxtts`, and `whisper-base`/`whisper-small` + Built-in ONNX Fallback.
  const supportedEngines = hardwareProfile.isCpuOnlyLaptop
    ? ALL_VOICEBOX_ENGINES.filter((e) => e.cpuFriendly)
    : ALL_VOICEBOX_ENGINES;

  const supportedSttModels = hardwareProfile.isCpuOnlyLaptop
    ? ALL_STT_MODELS.filter((m) => m.cpuFriendly)
    : ALL_STT_MODELS;

  if (sidecarOnline) {
    try {
      const profRes = await fetch(`${runtimeConfig.baseUrl}/profiles`, {
        method: 'GET',
        headers: { 'X-Voicebox-Client-Id': runtimeConfig.clientId },
        signal: AbortSignal.timeout(2500),
      });
      if (profRes.ok) {
        const rawProfiles: any[] = await profRes.json();
        if (Array.isArray(rawProfiles) && rawProfiles.length > 0) {
          const mapped = rawProfiles.map((p) => ({
            id: p.id,
            name: p.name,
            voice_type: (p.voice_type || 'cloned') as 'cloned' | 'preset' | 'designed',
            language: p.language || 'en',
            default_engine: p.default_engine || (p.voice_type === 'preset' ? 'kokoro' : 'luxtts'),
            has_personality: Boolean(p.personality),
            description: p.description || null,
          }));
          profiles = hardwareProfile.isCpuOnlyLaptop
            ? mapped.filter(
                (p) =>
                  !p.default_engine ||
                  p.default_engine === 'kokoro' ||
                  p.default_engine === 'luxtts'
              )
            : mapped;
          if (profiles.length === 0) {
            profiles = [...CPU_LAPTOP_PROFILES];
          }
        }
      }
    } catch {
      // Keep default hospital profiles
    }
  }

  // Enforce CPU-safe active config when on a CPU-only laptop
  if (hardwareProfile.isCpuOnlyLaptop) {
    if (runtimeConfig.defaultEngine !== 'kokoro' && runtimeConfig.defaultEngine !== 'luxtts') {
      runtimeConfig.defaultEngine = 'kokoro';
    }
    if (
      runtimeConfig.defaultSttModel !== 'whisper-small' &&
      runtimeConfig.defaultSttModel !== 'whisper-base'
    ) {
      runtimeConfig.defaultSttModel = 'whisper-small';
    }
  }

  return {
    sidecarOnline,
    sidecarUrl: runtimeConfig.baseUrl,
    sidecarVersion,
    gpuAvailable: hardwareProfile.isCpuOnlyLaptop ? false : gpuAvailable,
    gpuType: hardwareProfile.gpuRenderer,
    modelLoaded,
    hardwareProfile,
    fallbackOfflineStt,
    config: getVoiceboxConfig(),
    supportedEngines,
    supportedSttModels,
    profiles,
  };
}

/**
 * Clean up medical dictation artifacts (filler words, stutters, common phonetic slips)
 * when running in local fallback mode or after raw Whisper output.
 */
export function refineMedicalTranscriptLocally(rawText: string): string {
  if (!rawText) return '';
  let text = rawText
    .replace(/\[(BLANK_AUDIO|MUSIC|NOISE|SILENCE|INAUDIBLE)\]/gi, '')
    .replace(/\b(uh+|um+|er+|ah+)\b[\s,]*/gi, '')
    .replace(/\b(\w+)\s+\1\b/gi, '$1')
    .replace(/\bintra ocular\b/gi, 'intraocular')
    .replace(/\bphaco emulsification\b/gi, 'phacoemulsification')
    .replace(/\bperio dontal\b/gi, 'periodontal')
    .replace(/\bradio lucency\b/gi, 'radiolucency')
    .replace(/\bparacetamol\s+one\s+gram\b/gi, 'Paracetamol 1g')
    .replace(/\bamoxicillin\s+clavulanate\b/gi, 'Amoxicillin-Clavulanate')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (!/[.!?]$/.test(text)) {
      text += '.';
    }
  }
  return text;
}

/**
 * Transcribe 16 kHz Float32 PCM audio via Voicebox (`POST /transcribe`),
 * falling back to TerkHealth360's built-in offline Whisper ONNX (`transcribeOffline`).
 * Automatically coerces heavy Whisper models to `whisper-small` on CPU-only laptops.
 */
export async function transcribeWithVoiceboxOrFallback(
  float32Samples: Float32Array,
  options?: { language?: string; model?: string; refine?: boolean }
): Promise<{
  text: string;
  rawText: string;
  model: string;
  provider: 'voicebox-sidecar' | 'openmed-onnx-fallback';
  ms: number;
}> {
  const t0 = Date.now();
  const shouldRefine = options?.refine ?? runtimeConfig.autoRefineClinicalText;
  const hw = detectLocalHardwareProfile(false, undefined, runtimeConfig.forceCpuOnlyMode);

  let modelToUse = options?.model || runtimeConfig.defaultSttModel || 'whisper-small';
  if (hw.isCpuOnlyLaptop && modelToUse !== 'whisper-small' && modelToUse !== 'whisper-base') {
    modelToUse = 'whisper-small';
  }

  // 1. Attempt Voicebox Sidecar (`POST /transcribe`)
  try {
    const wavBuffer = encodeFloat32PcmToWavBuffer(float32Samples, 16000);
    const formData = new FormData();
    const blob = new Blob([wavBuffer as any], { type: 'audio/wav' });
    formData.append('file', blob, 'clinical_dictation.wav');
    formData.append('audio', blob, 'clinical_dictation.wav');
    if (options?.language && options.language !== 'auto') {
      formData.append('language', options.language);
    }
    formData.append('model', modelToUse);

    const res = await fetch(`${runtimeConfig.baseUrl}/transcribe`, {
      method: 'POST',
      headers: {
        'X-Voicebox-Client-Id': runtimeConfig.clientId,
      },
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const data: any = await res.json();
      const rawText = (data.text || data.transcript || '').trim();
      const refinedText = shouldRefine ? refineMedicalTranscriptLocally(rawText) : rawText;
      return {
        text: refinedText,
        rawText,
        model: data.model || modelToUse,
        provider: 'voicebox-sidecar',
        ms: Date.now() - t0,
      };
    }
  } catch {
    // Sidecar not reachable or timed out; fall through to built-in offline Whisper ONNX
  }

  // 2. Fallback to built-in OpenMed Offline Whisper ONNX
  const offlineResult = await transcribeOffline(float32Samples);
  const refinedText = shouldRefine
    ? refineMedicalTranscriptLocally(offlineResult.text)
    : offlineResult.text;

  return {
    text: refinedText,
    rawText: offlineResult.text,
    model: offlineResult.model,
    provider: 'openmed-onnx-fallback',
    ms: Date.now() - t0,
  };
}

/**
 * Synthesize speech using Voicebox's OpenAI-compatible `/v1/audio/speech` endpoint
 * or `/speak`. Automatically coerces GPU-only engines to `kokoro` (or `luxtts`)
 * when running on a CPU-only laptop without a GPU or Apple Silicon chip.
 */
export async function synthesizeSpeechWithVoicebox(params: {
  text: string;
  profile?: string;
  engine?: string;
  language?: string;
  speed?: number;
  instructions?: string;
  playOnServerSpeaker?: boolean;
}): Promise<{
  handledBySidecar: boolean;
  audioBase64?: string;
  mimeType?: string;
  generationId?: string;
  profileUsed: string;
  engineUsed: string;
  fallbackText: string;
}> {
  const hw = detectLocalHardwareProfile(false, undefined, runtimeConfig.forceCpuOnlyMode);
  const profileUsed = params.profile || runtimeConfig.defaultVoiceProfile;
  let engineUsed = params.engine || runtimeConfig.defaultEngine || 'kokoro';

  if (hw.isCpuOnlyLaptop && engineUsed !== 'kokoro' && engineUsed !== 'luxtts') {
    engineUsed = 'kokoro';
  }

  const cleanText = params.text.trim();

  // 1. Try OpenAI-compatible synchronous audio stream (`POST /v1/audio/speech`)
  try {
    const oaRes = await fetch(`${runtimeConfig.baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Voicebox-Client-Id': runtimeConfig.clientId,
      },
      body: JSON.stringify({
        model: engineUsed,
        voice: profileUsed,
        input: cleanText,
        response_format: 'wav',
        speed: params.speed || 1.0,
        instructions: params.instructions,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (oaRes.ok) {
      const arrayBuf = await oaRes.arrayBuffer();
      const audioBase64 = Buffer.from(arrayBuf).toString('base64');

      if (params.playOnServerSpeaker) {
        fetch(`${runtimeConfig.baseUrl}/speak`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Voicebox-Client-Id': runtimeConfig.clientId,
          },
          body: JSON.stringify({
            text: cleanText,
            profile: profileUsed,
            engine: engineUsed,
            language: params.language || runtimeConfig.defaultLanguage,
          }),
        }).catch(() => {});
      }

      return {
        handledBySidecar: true,
        audioBase64,
        mimeType: oaRes.headers.get('content-type') || 'audio/wav',
        profileUsed,
        engineUsed,
        fallbackText: cleanText,
      };
    }
  } catch {
    // Fall through to `/speak` or browser Web Speech fallback
  }

  // 2. Try Voicebox `/speak` endpoint
  try {
    const speakRes = await fetch(`${runtimeConfig.baseUrl}/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Voicebox-Client-Id': runtimeConfig.clientId,
      },
      body: JSON.stringify({
        text: cleanText,
        profile: profileUsed,
        engine: engineUsed,
        language: params.language || runtimeConfig.defaultLanguage,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (speakRes.ok) {
      const body: any = await speakRes.json();
      return {
        handledBySidecar: true,
        generationId: body.generation_id || body.id,
        profileUsed: body.profile || profileUsed,
        engineUsed,
        fallbackText: cleanText,
      };
    }
  } catch {
    // Sidecar offline — return graceful browser TTS fallback metadata
  }

  return {
    handledBySidecar: false,
    profileUsed,
    engineUsed: 'browser-neural-tts-fallback',
    fallbackText: cleanText,
  };
}

export async function syncMcpBindingWithVoicebox(binding: {
  profileId?: string;
  defaultEngine?: string;
  defaultPersonality?: boolean;
}): Promise<{ synced: boolean; detail: string }> {
  try {
    const res = await fetch(
      `${runtimeConfig.baseUrl}/mcp/bindings/${encodeURIComponent(runtimeConfig.clientId)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Voicebox-Client-Id': runtimeConfig.clientId,
        },
        body: JSON.stringify({
          label: 'TerkHealth360 Hospital EMR',
          profile_id: binding.profileId || null,
          default_engine: binding.defaultEngine || runtimeConfig.defaultEngine,
          default_personality: Boolean(binding.defaultPersonality),
        }),
        signal: AbortSignal.timeout(4000),
      }
    );
    if (res.ok) {
      return { synced: true, detail: 'Synced MCP client voice binding with local Voicebox server.' };
    }
    return { synced: false, detail: `Voicebox returned HTTP ${res.status}` };
  } catch (err: any) {
    return {
      synced: false,
      detail: err?.message || 'Voicebox sidecar is not reachable on port 17493.',
    };
  }
}
