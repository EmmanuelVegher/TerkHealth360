import { api } from '../services/api';

/**
 * Convert an Audio Blob (WebM, Ogg, WAV) into 16 kHz Mono Float32Array PCM Base64.
 * Runs 100% client-side via Web Audio API. Zero external dependencies.
 */
export async function audioBlobTo16kPcmBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const sourceData = audioBuffer.getChannelData(0);
    const targetSampleRate = 16000;
    const ratio = audioBuffer.sampleRate / targetSampleRate;
    const newLength = Math.round(sourceData.length / ratio);
    const pcm16k = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const idx = Math.min(Math.floor(i * ratio), sourceData.length - 1);
      pcm16k[i] = sourceData[idx];
    }
    const bytes = new Uint8Array(pcm16k.buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as any);
    }
    return btoa(binary);
  } finally {
    try { await audioCtx.close(); } catch {}
  }
}

/**
 * Send recorded audio to backend offline Whisper speech-to-text.
 * Requires zero internet. Returns transcribed text.
 */
export async function transcribeAudioOffline(blob: Blob): Promise<string> {
  if (blob.size < 500) return '';
  const pcmBase64 = await audioBlobTo16kPcmBase64(blob);
  const res = await api.post('/openmed/transcribe-voice', { pcmBase64 });
  if (res.data?.success && res.data.data?.text) {
    return res.data.data.text.trim().replace(/^(\.|\,|\s)+/, '');
  }
  return '';
}

export interface OfflineVoiceSession {
  stop: () => Promise<string>;
  cancel: () => void;
}

/**
 * Universal Offline-First Voice Dictation Session
 *
 * Records audio directly via MediaRecorder (100% offline).
 * Concurrently streams Web Speech API if online for live preview text.
 * When stopped, if Web Speech gave text, returns it; otherwise falls back
 * automatically to local Whisper neural transcription.
 */
export async function startOfflineVoiceSession(options?: {
  onInterimText?: (text: string) => void;
  onFinalText?: (text: string) => void;
  onError?: (err: any) => void;
  lang?: string;
}): Promise<OfflineVoiceSession> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioChunks: Blob[] = [];

  let mimeType = '';
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
    else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
    else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) mimeType = 'audio/ogg;codecs=opus';
  }
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) audioChunks.push(e.data);
  };
  recorder.start(250);

  let capturedSpeechText = '';
  let interimSpeechText = '';
  let recognition: any = null;

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (SpeechRecognition) {
    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      try { recognition.lang = options?.lang || 'en-US'; } catch {}

      recognition.onresult = (e: any) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            capturedSpeechText += t + ' ';
          } else {
            interim += t;
          }
        }
        interimSpeechText = interim;
        const live = (capturedSpeechText + interim).trim();
        options?.onInterimText?.(live);
      };

      recognition.onerror = (e: any) => {
        // If network error, don't crash! Offline Whisper handles it.
        if (e.error === 'network') {
          console.info('[OpenMed Dictation] Browser STT is offline. Recording audio for local Whisper transcription.');
          return;
        }
        if (e.error !== 'no-speech' && e.error !== 'audio-capture') {
          console.warn('[OpenMed Dictation] SpeechRecognition notice:', e.error);
        }
      };

      recognition.start();
    } catch (recErr) {
      console.warn('[OpenMed Dictation] Browser SpeechRecognition init skipped:', recErr);
    }
  }

  let isStopped = false;

  const cleanup = () => {
    if (isStopped) return;
    isStopped = true;
    if (recognition) {
      try { recognition.stop(); } catch {}
      recognition = null;
    }
    if (stream) {
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
    }
  };

  const cancel = () => {
    cleanup();
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch {}
    }
  };

  const stop = async (): Promise<string> => {
    cleanup();

    let recordedBlob: Blob | null = null;
    if (recorder && recorder.state !== 'inactive') {
      recordedBlob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(audioChunks, { type: audioChunks[0]?.type || 'audio/webm' }));
        };
        try {
          recorder.stop();
        } catch {
          resolve(new Blob(audioChunks, { type: 'audio/webm' }));
        }
      });
    } else if (audioChunks.length > 0) {
      recordedBlob = new Blob(audioChunks, { type: audioChunks[0]?.type || 'audio/webm' });
    }

    const onlineText = (capturedSpeechText + ' ' + interimSpeechText).trim();
    if (onlineText && onlineText.length >= 3) {
      options?.onFinalText?.(onlineText);
      return onlineText;
    }

    // Offline fallback to Whisper
    if (recordedBlob && recordedBlob.size > 800) {
      try {
        const whisperText = await transcribeAudioOffline(recordedBlob);
        if (whisperText) {
          options?.onFinalText?.(whisperText);
          return whisperText;
        }
      } catch (err) {
        console.warn('[OpenMed Dictation] Whisper offline transcription failed:', err);
      }
    }

    return onlineText;
  };

  return { stop, cancel };
}
