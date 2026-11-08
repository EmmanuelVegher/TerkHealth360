import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getVoiceboxStatus,
  getVoiceboxConfig,
  updateVoiceboxConfig,
  transcribeWithVoiceboxOrFallback,
  synthesizeSpeechWithVoicebox,
  syncMcpBindingWithVoicebox,
  refineMedicalTranscriptLocally,
} from '../services/voiceboxBridge.js';

const router = Router();

/**
 * GET /api/voicebox/status
 * Returns live status of the Voicebox Sidecar (:17493), available TTS engines,
 * voice profiles, and the local OpenMed Whisper ONNX fallback status.
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const clientReportsCpuOnly =
      req.query.cpuOnly === 'true' || req.query.cpuOnly === '1';
    const status = await getVoiceboxStatus(clientReportsCpuOnly);
    res.json({
      success: true,
      data: status,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message || 'Failed to inspect Voicebox Bridge status',
    });
  }
});

/**
 * GET /api/voicebox/profiles
 * Returns available Voicebox voice profiles (or default hospital PA profiles).
 */
router.get('/profiles', async (_req: Request, res: Response) => {
  try {
    const status = await getVoiceboxStatus();
    res.json({
      success: true,
      data: {
        sidecarOnline: status.sidecarOnline,
        profiles: status.profiles,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message || 'Failed to fetch Voicebox profiles',
    });
  }
});

/**
 * PUT /api/voicebox/config
 * Updates the Voicebox Bridge runtime configuration and optionally syncs
 * the `terkhealth360-emr` MCP client binding with the Voicebox sidecar.
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      baseUrl: z.string().url().optional(),
      clientId: z.string().min(2).optional(),
      defaultEngine: z.string().optional(),
      defaultModelSize: z.string().optional(),
      defaultVoiceProfile: z.string().optional(),
      defaultSttModel: z.string().optional(),
      defaultLanguage: z.string().optional(),
      autoRefineClinicalText: z.boolean().optional(),
      useNativeSpeakPill: z.boolean().optional(),
      forceCpuOnlyMode: z.boolean().optional(),
    });

    const parsed = schema.parse(req.body || {});
    const updated = updateVoiceboxConfig(parsed);

    const mcpSync = await syncMcpBindingWithVoicebox({
      profileId: updated.defaultVoiceProfile,
      defaultEngine: updated.defaultEngine,
      defaultPersonality: false,
    });

    res.json({
      success: true,
      data: {
        config: updated,
        mcpSync,
      },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err?.message || 'Invalid Voicebox configuration payload',
    });
  }
});

/**
 * POST /api/voicebox/transcribe
 * Transcribes 16 kHz Float32 PCM audio (`pcmBase64` or `pcmArray`) via Voicebox's
 * Whisper Turbo (`POST /transcribe`) with automatic fallback to TerkHealth360's
 * local Whisper ONNX engine and medical terminology cleanup.
 */
router.post('/transcribe', async (req: Request, res: Response) => {
  try {
    const { pcmBase64, pcmArray, language, model, refine, existingTranscript } = req.body || {};

    // If caller already has a raw Web Speech transcript and just wants medical refinement:
    if (existingTranscript && typeof existingTranscript === 'string' && !pcmBase64 && !pcmArray) {
      const cleaned = refineMedicalTranscriptLocally(existingTranscript);
      return res.json({
        success: true,
        data: {
          text: cleaned,
          rawText: existingTranscript,
          model: 'voicebox-medical-refiner',
          provider: 'voicebox-sidecar',
          ms: 2,
        },
      });
    }

    let float32Samples: Float32Array;
    if (pcmBase64 && typeof pcmBase64 === 'string') {
      const buf = Buffer.from(pcmBase64, 'base64');
      float32Samples = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
    } else if (Array.isArray(pcmArray)) {
      float32Samples = new Float32Array(pcmArray);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Audio samples (pcmBase64 or pcmArray) or existingTranscript required',
      });
    }

    if (float32Samples.length < 1600) {
      return res.json({
        success: true,
        data: {
          text: '',
          rawText: '',
          model: 'none',
          provider: 'openmed-onnx-fallback',
          ms: 0,
        },
      });
    }

    const result = await transcribeWithVoiceboxOrFallback(float32Samples, {
      language,
      model,
      refine,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message || 'Clinical voice transcription failed',
    });
  }
});

/**
 * POST /api/voicebox/speak
 * Synthesizes speech using Voicebox's multi-engine TTS (`/v1/audio/speech` or `/speak`).
 */
router.post('/speak', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      text: z.string().min(1).max(10000),
      profile: z.string().optional(),
      engine: z.string().optional(),
      language: z.string().optional(),
      speed: z.number().min(0.25).max(4.0).optional(),
      instructions: z.string().optional(),
      playOnServerSpeaker: z.boolean().optional(),
    });

    const parsed = schema.parse(req.body || {});
    const result = await synthesizeSpeechWithVoicebox(parsed);

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err?.message || 'Failed to synthesize speech via Voicebox Bridge',
    });
  }
});

/**
 * POST /api/voicebox/announce-queue
 * Formats and synthesizes a natural Hospital Waiting-Room Queue Call Announcement.
 */
router.post('/announce-queue', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      tokenNumber: z.string().min(1),
      patientName: z.string().min(1),
      department: z.string().min(1),
      doctorName: z.string().optional(),
      profile: z.string().optional(),
      engine: z.string().optional(),
      language: z.string().optional(),
    });

    const { tokenNumber, patientName, department, doctorName, profile, engine, language } =
      schema.parse(req.body || {});

    const spokenDept = department
      .replace(/_/g, ' ')
      .replace(/\bOPD\b/gi, 'Outpatient Department')
      .replace(/\bLIMS\b/gi, 'Laboratory');

    const announcementText = doctorName
      ? `Attention please. Ticket number ${tokenNumber}, ${patientName}, please proceed to ${spokenDept} to see ${doctorName}.`
      : `Attention please. Ticket number ${tokenNumber}, ${patientName}, please proceed to ${spokenDept}.`;

    const cfg = getVoiceboxConfig();
    const synthesis = await synthesizeSpeechWithVoicebox({
      text: announcementText,
      profile: profile || cfg.defaultVoiceProfile,
      engine: engine || cfg.defaultEngine,
      language: language || cfg.defaultLanguage,
      playOnServerSpeaker: cfg.useNativeSpeakPill,
    });

    res.json({
      success: true,
      data: {
        announcementText,
        ...synthesis,
      },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err?.message || 'Failed to generate queue voice announcement',
    });
  }
});

/**
 * POST /api/voicebox/patient-instructions
 * Generates spoken audio for post-consultation / pharmacy / eye / dental care instructions.
 */
router.post('/patient-instructions', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      patientName: z.string().optional(),
      specialty: z.enum(['GENERAL_OPD', 'OPHTHALMOLOGY', 'DENTAL', 'PHARMACY', 'DISCHARGE']).default('GENERAL_OPD'),
      instructionsText: z.string().min(3).max(10000),
      language: z.string().default('en'),
      profile: z.string().optional(),
      engine: z.string().optional(),
    });

    const { patientName, specialty, instructionsText, language, profile, engine } =
      schema.parse(req.body || {});

    const prefixMap: Record<string, string> = {
      GENERAL_OPD: 'Clinical care instructions',
      OPHTHALMOLOGY: 'Ophthalmology and eye care instructions',
      DENTAL: 'Post-procedure dental care instructions',
      PHARMACY: 'Medication dosage and administration guide',
      DISCHARGE: 'Hospital discharge summary and home-care instructions',
    };

    const greeting = patientName
      ? `${prefixMap[specialty]} for ${patientName}. `
      : `${prefixMap[specialty]}. `;

    const fullSpokenScript = `${greeting}${instructionsText.trim()}`;

    const synthesis = await synthesizeSpeechWithVoicebox({
      text: fullSpokenScript,
      profile,
      engine: engine || (language !== 'en' ? 'chatterbox' : undefined),
      language,
      playOnServerSpeaker: false,
    });

    res.json({
      success: true,
      data: {
        script: fullSpokenScript,
        specialty,
        language,
        ...synthesis,
      },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err?.message || 'Failed to synthesize patient instructions',
    });
  }
});

export default router;

