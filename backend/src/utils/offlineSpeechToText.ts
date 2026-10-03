/**
 * OpenMed Offline Speech-to-Text Engine
 * ─────────────────────────────────────
 * Runs OpenAI Whisper (ONNX, quantized) locally inside Node via transformers.js.
 * No internet required once the model has been downloaded with:
 *     npm run stt:download
 *
 * The browser records the microphone, decodes it to 16 kHz mono Float32 PCM and
 * posts it here, so no ffmpeg / Python is needed on the server.
 */
import './fetchPolyfill.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_ROOT = path.resolve(__dirname, '..', '..', 'models');

// Preference order — the first one found on disk is used
const MODEL_CANDIDATES = ['whisper-small.en', 'whisper-base.en', 'whisper-tiny.en'];

let transcriberPromise: Promise<any> | null = null;
let activeModel: string | null = null;

export function findLocalWhisperModel(): string | null {
  const preferred = process.env.WHISPER_MODEL?.replace(/^Xenova\//, '');
  const candidates = preferred
    ? [preferred, ...MODEL_CANDIDATES.filter(m => m !== preferred)]
    : MODEL_CANDIDATES;

  for (const name of candidates) {
    const dir = path.join(MODELS_ROOT, 'Xenova', name);
    if (
      fs.existsSync(path.join(dir, 'config.json')) &&
      fs.existsSync(path.join(dir, 'onnx', 'encoder_model_quantized.onnx')) &&
      fs.existsSync(path.join(dir, 'onnx', 'decoder_model_merged_quantized.onnx'))
    ) {
      return name;
    }
  }
  return null;
}

async function getTranscriber() {
  const modelName = findLocalWhisperModel();
  if (!modelName) {
    throw new Error('OFFLINE_STT_MODEL_MISSING');
  }
  if (transcriberPromise && activeModel === modelName) return transcriberPromise;

  activeModel = modelName;
  transcriberPromise = (async () => {
    const { pipeline, env } = await import('@xenova/transformers');
    env.allowRemoteModels = false;          // never touch the internet
    env.allowLocalModels = true;
    env.localModelPath = MODELS_ROOT + path.sep;
    env.cacheDir = path.join(MODELS_ROOT, '.cache');
    console.log(`[OpenMed STT] Loading offline Whisper model: ${modelName}`);
    const t0 = Date.now();
    const p = await pipeline('automatic-speech-recognition', `Xenova/${modelName}`, { quantized: true });
    console.log(`[OpenMed STT] ✅ ${modelName} ready in ${Date.now() - t0}ms`);
    return p;
  })().catch(err => {
    transcriberPromise = null;
    activeModel = null;
    throw err;
  });
  return transcriberPromise;
}

/** Warm the model in the background at server start so the first dictation is fast */
export function warmUpOfflineSTT() {
  if (!findLocalWhisperModel()) {
    console.log('[OpenMed STT] Offline Whisper model not found. Run `npm run stt:download` once while online to enable offline dictation.');
    return;
  }
  getTranscriber().catch(err => console.warn('[OpenMed STT] Warm-up failed:', err?.message || err));
}

export function getOfflineSTTStatus() {
  const model = findLocalWhisperModel();
  return { available: Boolean(model), model, loaded: Boolean(transcriberPromise && activeModel === model) };
}

/**
 * Transcribe 16 kHz mono Float32 PCM audio.
 * @param pcm Float32Array of samples in [-1, 1] at 16 kHz
 */
export async function transcribeOffline(pcm: Float32Array): Promise<{ text: string; model: string; ms: number }> {
  const t0 = Date.now();
  const transcriber = await getTranscriber();
  const output = await transcriber(pcm, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false,
    // English-only (.en) models: no language/task flags needed
  });
  const text = (Array.isArray(output) ? output.map((o: any) => o.text).join(' ') : output?.text || '')
    .replace(/\[(BLANK_AUDIO|MUSIC|NOISE|SILENCE)\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { text, model: activeModel || 'whisper', ms: Date.now() - t0 };
}
