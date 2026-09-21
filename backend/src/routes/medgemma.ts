/**
 * MedGemma AI Medical Intelligence — Backend Route
 *
 * Priority chain:
 *  1. GEMINI_API_KEY set → Gemini 2.0 Flash (free, multimodal medical reasoning)
 *  2. HF_TOKEN set       → HuggingFace Inference API (MedGemma 1.5 4B)
 *  3. Neither set        → Clinical simulation (offline, no cost)
 *
 * Endpoints:
 *  GET  /api/medgemma/status   → API connectivity / key status
 *  POST /api/medgemma/analyze  → Run AI image + text analysis
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY || '';
  return key.replace(/^["']|["']$/g, '').trim();
}

function getHFToken(): string {
  const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || '';
  return token.replace(/^["']|["']$/g, '').trim();
}

const MEDGEMMA_MODEL  = 'google/medgemma-1.5-4b-it';
const GEMINI_MODEL    = 'gemini-3.6-flash';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const HF_URL          = `https://api-inference.huggingface.co/models/${MEDGEMMA_MODEL}`;

// ── Detect active mode ────────────────────────────────────────────────────────
function getActiveMode(): 'GEMINI' | 'HF' | 'SIMULATION' {
  const geminiKey = getGeminiApiKey();
  if (geminiKey && geminiKey.length > 10) return 'GEMINI';
  const hfToken = getHFToken();
  if (hfToken && hfToken.length > 10) return 'HF';
  return 'SIMULATION';
}

// ── 1. GET /api/medgemma/status ───────────────────────────────────────────────
router.get('/status', (_req: Request, res: Response) => {
  const mode = getActiveMode();
  const geminiKey = getGeminiApiKey();
  const hfToken = getHFToken();
  res.json({
    success: true,
    model:   mode === 'GEMINI' ? GEMINI_MODEL : MEDGEMMA_MODEL,
    version: '2.0',
    mode,
    hasGeminiKey: Boolean(geminiKey),
    hasHFToken:   Boolean(hfToken),
    capabilities: [
      'Chest X-Ray Analysis',
      'CT / MRI Interpretation',
      'Ultrasound (Abdominal, Pelvic, Thyroid, Doppler)',
      'Digital Pathology (WSI)',
      'Ophthalmology (Fundus)',
      'Dermatology',
      'EHR Clinical Note Reasoning',
      'Lab Report Extraction',
      'Longitudinal Imaging Comparison',
      'FHIR-based health record understanding',
    ],
    message: mode === 'GEMINI'
      ? `🟢 Gemini 2.0 Flash active — real AI medical reasoning enabled (free tier)`
      : mode === 'HF'
      ? `🟡 HuggingFace token set — attempting MedGemma 1.5 4B`
      : `🟡 No API key configured — running in clinical simulation mode. Add GEMINI_API_KEY to .env for live AI.`,
  });
});

// ── 2. POST /api/medgemma/analyze ─────────────────────────────────────────────
const AnalyzeSchema = z.object({
  imageUrl:       z.string().optional(),
  imageBase64:    z.string().optional(),
  modality:       z.string().optional(),
  procedure:      z.string().optional(),
  patientContext: z.string().optional(),
  prompt:         z.string().optional(),
});

router.post('/analyze', async (req: any, res: Response) => {
  try {
    const body = AnalyzeSchema.parse(req.body);
    const {
      imageUrl, imageBase64,
      modality = '', procedure = '', patientContext = '', prompt,
    } = body;

    const mod       = modality.toUpperCase();
    const proc      = procedure;
    const startTime = Date.now();
    const mode      = getActiveMode();

    // ── GEMINI 2.0 FLASH ─────────────────────────────────────────────────────
    if (mode === 'GEMINI') {
      try {
        const geminiKey = getGeminiApiKey();
        const userPrompt = prompt || buildClinicalPrompt(mod, proc, patientContext);

        // Build Gemini parts — include image if available
        const parts: any[] = [];

        // 1. First priority: direct imageBase64 from frontend
        if (imageBase64 && imageBase64.length > 50) {
          let cleanBase64 = imageBase64;
          let mimeType = 'image/jpeg';
          if (cleanBase64.includes(';base64,')) {
            const split = cleanBase64.split(';base64,');
            mimeType = split[0].replace(/^data:/, '') || 'image/jpeg';
            cleanBase64 = split[1];
          } else if (cleanBase64.startsWith('iVBORw0KGgo')) {
            mimeType = 'image/png';
          }
          parts.push({ inline_data: { mime_type: mimeType, data: cleanBase64 } });
        } else if (imageUrl) {
          // 2. Second priority: imageUrl (resolve relative paths if needed)
          try {
            const fullUrl = imageUrl.startsWith('http')
              ? imageUrl
              : `http://localhost:5173${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
            const imgRes = await fetch(fullUrl, { signal: AbortSignal.timeout(10000) });
            if (imgRes.ok) {
              const imgBuf   = await imgRes.arrayBuffer();
              const b64      = Buffer.from(imgBuf).toString('base64');
              const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
              parts.push({ inline_data: { mime_type: mimeType, data: b64 } });
            }
          } catch {
            // Image fetch failed — text-only reasoning
          }
        }

        // Add the user prompt (system instruction is separate)
        parts.push({ text: userPrompt });

        const geminiBody = {
          system_instruction: {
            parts: [{ text: buildMedicalSystemPrompt() }]
          },
          contents: [{ parts }],
          generationConfig: {
            temperature:     0.1,
            maxOutputTokens: 1200,
            topP:            0.95,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          ],
        };

        const geminiRes = await fetch(`${GEMINI_BASE_URL}?key=${geminiKey}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(geminiBody),
          signal:  AbortSignal.timeout(60000),
        });

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          throw new Error(`Gemini API ${geminiRes.status}: ${errText.slice(0, 300)}`);
        }

        const geminiData = await geminiRes.json();
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!rawText) throw new Error('Gemini returned empty response');

        const parsed          = parseRadiologyReport(rawText, mod);
        const processingTime  = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
        const hasImage        = parts.length > 1; // had an image part

        return res.json({
          success:        true,
          mode:           'LIVE_GEMINI_2.0_FLASH',
          model:          GEMINI_MODEL,
          hasImageInput:  hasImage,
          modality:       parsed.modality || getModeLabel(mod),
          findings:       parsed.findings || rawText,
          impression:     parsed.impression,
          recommendations: parsed.recommendations,
          confidence:     parsed.confidence,
          flags:          parsed.flags,
          processingTime,
          rawResponse:    rawText,
        });

      } catch (geminiError: any) {
        console.error('[MedGemma/Gemini Error]', geminiError.message);
        // Fall through to simulation
        return res.json({
          ...buildSimulatedResult(mod, proc, patientContext, (Date.now() - startTime) / 1000, 'SIMULATION_GEMINI_ERROR'),
          apiError: geminiError.message,
        });
      }
    }

    // ── HUGGINGFACE (MedGemma 1.5) ───────────────────────────────────────────
    if (mode === 'HF' && (imageUrl || imageBase64)) {
      try {
        const userPrompt = prompt || buildClinicalPrompt(mod, proc, patientContext);
        const imgContent = imageUrl
          ? { type: 'image_url', image_url: { url: imageUrl } }
          : { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } };

        const hfBody = {
          inputs: {
            messages: [{
              role: 'user',
              content: [
                imgContent,
                { type: 'text', text: `${buildMedicalSystemPrompt()}\n\n${userPrompt}` },
              ],
            }],
          },
          parameters: { max_new_tokens: 1024, do_sample: false },
        };

        const hfRes = await fetch(HF_URL, {
          method:  'POST',
          headers: { Authorization: `Bearer ${getHFToken()}`, 'Content-Type': 'application/json', 'x-wait-for-model': 'true' },
          body:    JSON.stringify(hfBody),
          signal:  AbortSignal.timeout(90000),
        });

        if (hfRes.status === 503) return res.json(buildSimulatedResult(mod, proc, patientContext, (Date.now() - startTime) / 1000, 'SIMULATION_MODEL_LOADING'));
        if (!hfRes.ok) throw new Error(`HF API ${hfRes.status}`);

        const hfData = await hfRes.json();
        const rawText = hfData?.[0]?.generated_text || hfData?.generated_text || hfData?.choices?.[0]?.message?.content || '';
        const parsed  = parseRadiologyReport(rawText, mod);

        return res.json({
          success: true, mode: 'LIVE_MEDGEMMA_1.5', model: MEDGEMMA_MODEL,
          ...parsed, processingTime: parseFloat(((Date.now() - startTime) / 1000).toFixed(2)),
        });
      } catch (hfErr: any) {
        console.error('[MedGemma/HF Error]', hfErr.message);
        return res.json({ ...buildSimulatedResult(mod, proc, patientContext, (Date.now() - startTime) / 1000, 'SIMULATION_API_ERROR'), apiError: hfErr.message });
      }
    }

    // ── SIMULATION ────────────────────────────────────────────────────────────
    return res.json(buildSimulatedResult(mod, proc, patientContext, (Date.now() - startTime) / 1000, 'SIMULATION_NO_KEY'));

  } catch (err: any) {
    console.error('[MedGemma Route Error]', err);
    res.status(400).json({ success: false, error: err.message });
  }
});


// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function buildMedicalSystemPrompt(): string {
  return `You are an expert diagnostic radiologist AI assistant. Generate a structured radiology report with exactly three sections.

Use this exact format with no preamble, no self-commentary, and no meta-language:

FINDINGS:
[Write detailed, systematic anatomical observations here using standard radiology terminology]

IMPRESSION:
[Write a concise 1-3 sentence clinical summary of the key findings]

RECOMMENDATIONS:
[Write specific clinical follow-up, correlation, or additional imaging suggestions]

Begin your response directly with "FINDINGS:" — do not write anything before it.`;
}

function buildClinicalPrompt(mod: string, proc: string, context: string): string {
  const ctx = context ? `\nClinical Context: ${context}` : '';
  const m   = mod.toUpperCase();

  if (m.includes('X-RAY') || m === 'CR' || m === 'DR' || proc.toLowerCase().includes('x-ray') || proc.toLowerCase().includes('chest') || proc.toLowerCase().includes('radiograph')) {
    return `Perform a comprehensive radiological interpretation of this chest/skeletal X-ray.${ctx}

Systematically evaluate:
- Lung fields (bilateral): any consolidation, effusion, pneumothorax, nodules, infiltrates
- Cardiac silhouette: size (cardiothoracic ratio), borders, contour
- Mediastinum: width, contour, tracheal deviation
- Pleural spaces: effusion, thickening
- Bony thorax: rib fractures, lytic lesions, sclerosis
- Soft tissues and diaphragm

Provide FINDINGS, IMPRESSION, and RECOMMENDATIONS.`;
  }

  if (m.includes('US') || m.includes('ULTRASOUND') || proc.toLowerCase().includes('ultrasound') || proc.toLowerCase().includes('doppler') || proc.toLowerCase().includes('sonogram')) {
    return `Perform a comprehensive sonographic interpretation of this diagnostic ultrasound study for: ${proc}.${ctx}

Systematically evaluate all visualised structures:
- Organ size, morphology, and echogenicity
- Focal lesions: size, echogenicity, vascularity, posterior acoustic features
- Vascular structures (if Doppler): flow direction, waveforms, resistance index
- Free fluid, lymph nodes, surrounding structures

Provide FINDINGS, IMPRESSION, and RECOMMENDATIONS.`;
  }

  if (m.includes('CT') || proc.toLowerCase().includes('computed')) {
    return `Perform a structured radiological interpretation of this CT study: ${proc}.${ctx}

Systematically evaluate:
- Parenchymal structures with Hounsfield unit density values where relevant
- Vascular structures: calibre, patency, enhancement pattern
- Lymph nodes: size, morphology
- Bony structures: density, cortical integrity
- Any focal lesions: size, attenuation, margins, enhancement

Provide FINDINGS, IMPRESSION, and RECOMMENDATIONS.`;
  }

  if (m.includes('MRI') || m === 'MR' || proc.toLowerCase().includes('mri')) {
    return `Perform a structured MRI interpretation of this study: ${proc}.${ctx}

Systematically evaluate on available sequences (T1, T2, FLAIR, DWI, ADC, +/- contrast):
- Signal characteristics on each sequence
- Any restricted diffusion (DWI/ADC correlation)
- Enhancement pattern (if contrast given)
- Mass lesions: size, margins, signal characteristics, mass effect
- Surrounding structures: oedema, herniation, vascular territories

Provide FINDINGS, IMPRESSION, and RECOMMENDATIONS.`;
  }

  return `Perform a structured medical imaging interpretation of this study: ${proc || 'diagnostic imaging study'}.${ctx}

Provide a systematic review of all visualised anatomical structures.
Provide FINDINGS, IMPRESSION, and RECOMMENDATIONS.`;
}

function parseRadiologyReport(text: string, mod: string): {
  modality: string; findings: string; impression: string;
  recommendations: string; flags: string[]; confidence: number;
} {
  let findings       = text;
  let impression     = '';
  let recommendations = '';
  const flags: string[] = [];

  const findMatch = text.match(/FINDINGS?:?\s*([\s\S]*?)(?=IMPRESSION|RECOMMENDATION|$)/i);
  if (findMatch) findings = findMatch[1].trim();

  const impMatch = text.match(/IMPRESSION:?\s*([\s\S]*?)(?=RECOMMENDATION|FINDINGS|$)/i);
  if (impMatch) impression = impMatch[1].trim();

  const recMatch = text.match(/RECOMMENDATIONS?:?\s*([\s\S]*?)(?=FINDINGS|IMPRESSION|$)/i);
  if (recMatch) recommendations = recMatch[1].trim();

  // Critical finding flags
  const upper = text.toUpperCase();
  if (upper.includes('PNEUMOTHORAX') || upper.includes('TENSION'))
    flags.push('🚨 CRITICAL: Possible pneumothorax — urgent radiologist review');
  if (upper.includes('HAEMORRHAGE') || upper.includes('HEMORRHAGE') || upper.includes('BLEED'))
    flags.push('🚨 CRITICAL: Possible haemorrhage — immediate review required');
  if (upper.includes('PULMONARY EMBOLISM') || upper.includes('SADDLE EMBOLUS'))
    flags.push('🚨 CRITICAL: Possible PE — urgent clinical correlation');
  if (upper.includes('MASS') || upper.includes('MALIGNANT') || upper.includes('CARCINOMA'))
    flags.push('⚠️ Possible mass/malignancy — radiologist sign-off mandatory');
  if (upper.includes('FRACTURE') || upper.includes('DISLOCATION'))
    flags.push('⚠️ Possible fracture/dislocation — orthopaedic correlation advised');

  // Estimate confidence based on response quality
  const wordCount  = text.split(/\s+/).length;
  const confidence = Math.min(96, Math.max(78, 78 + Math.floor(wordCount / 8)));

  return {
    modality:       getModeLabel(mod),
    findings:       findings || text,
    impression:     impression || 'See findings above.',
    recommendations: recommendations || 'Clinical correlation and radiologist sign-off required before release.',
    flags,
    confidence,
  };
}

function getModeLabel(mod: string): string {
  const m = mod.toUpperCase();
  if (m.includes('X-RAY') || m === 'CR' || m === 'DR') return 'Digital Radiography (X-Ray)';
  if (m.includes('US') || m.includes('ULTRASOUND'))     return 'Diagnostic Ultrasound';
  if (m.includes('CT'))                                  return 'Computed Tomography (CT)';
  if (m.includes('MRI') || m === 'MR')                  return 'Magnetic Resonance Imaging (MRI)';
  if (m.includes('PATHOLOGY') || m.includes('WSI'))     return 'Whole-Slide Histopathology';
  return mod || 'Diagnostic Imaging';
}

function buildSimulatedResult(mod: string, proc: string, _ctx: string, processingTime: number, mode: string) {
  const p = proc.toLowerCase();
  const m = mod.toUpperCase();
  const isXray = m.includes('X-RAY') || m === 'CR' || m === 'DR' || p.includes('chest') || p.includes('x-ray');
  const isUS   = m.includes('US')    || m.includes('ULTRASOUND')  || p.includes('ultrasound') || p.includes('doppler');
  const isCT   = m.includes('CT')    || p.includes('computed');
  const isMRI  = m.includes('MRI')   || m === 'MR'                || p.includes('mri');

  const sim = isXray ? {
    modality: 'Digital Radiography (X-Ray)',
    findings: `Chest radiograph (PA projection). Lung fields are clear bilaterally with no evidence of consolidation, lobar collapse, or pleural effusion. Cardiothoracic ratio is within normal limits at 0.46. Mediastinal contours are normal. Trachea is central. Hila are of normal size and position. Costophrenic angles are acute bilaterally. No pneumothorax identified. Bony thorax is intact with no rib fractures or lytic lesions.`,
    impression: 'Chest radiograph — No acute cardiopulmonary pathology. Stable study.',
    recommendations: 'Correlate with clinical history and physical examination. Radiologist sign-off required before clinical release.',
    confidence: 88, flags: [] as string[],
  } : isUS ? {
    modality: 'Diagnostic Ultrasound',
    findings: `Abdominal ultrasound. Liver: normal in size (craniocaudal span 14.8 cm), homogeneous echogenicity. No focal hepatic lesion. Portal vein patent. Gallbladder: normal wall thickness (2 mm), no cholelithiasis. CBD measures 4 mm. Spleen: not enlarged (8.9 cm). Both kidneys normal in size and corticomedullary differentiation. No hydronephrosis or calculi. No free intraperitoneal fluid.`,
    impression: 'Ultrasound — No acute sonographic abnormality identified.',
    recommendations: 'Clinical correlation recommended. Follow-up ultrasound if symptoms persist.',
    confidence: 91, flags: [] as string[],
  } : isCT ? {
    modality: 'Computed Tomography (CT)',
    findings: `CT study reviewed. No haemorrhage, oedema, or mass effect. Parenchymal density normal for age. Vascular structures demonstrate normal calibre and patency. No lymphadenopathy. Osseous structures within normal limits.`,
    impression: 'CT — No acute pathology identified on primary analysis.',
    recommendations: 'Formal radiologist report mandatory before clinical release.',
    confidence: 84, flags: ['⚠️ Radiologist verification required'] as string[],
  } : isMRI ? {
    modality: 'Magnetic Resonance Imaging (MRI)',
    findings: `MRI multisequence acquisition reviewed. No restricted diffusion on DWI/ADC. No abnormal T2/FLAIR signal. No enhancing lesion on post-contrast series. Grey-white matter differentiation preserved. Corpus callosum intact. Posterior fossa structures normal.`,
    impression: 'MRI — No acute intracranial pathology. Stable neuroimaging.',
    recommendations: 'Clinical correlation required. Consider gadolinium-enhanced MRI if clinically indicated.',
    confidence: 90, flags: [] as string[],
  } : {
    modality: getModeLabel(mod),
    findings: `Diagnostic imaging study (${proc || 'unspecified'}) reviewed. No gross pathological features identified on primary AI pattern recognition analysis.`,
    impression: 'AI-assisted review complete. No significant abnormality detected. Radiologist interpretation required.',
    recommendations: 'Radiologist sign-off mandatory prior to clinical communication.',
    confidence: 82, flags: ['⚠️ Radiologist verification required'] as string[],
  };

  const notice = mode === 'SIMULATION_NO_KEY'
    ? 'Add GEMINI_API_KEY to backend .env for free real AI analysis.'
    : mode === 'SIMULATION_GEMINI_ERROR'
    ? 'Gemini API call failed — using clinical simulation fallback. Check GEMINI_API_KEY validity.'
    : 'AI API temporarily unavailable — using clinical simulation fallback.';

  return {
    success: true,
    mode,
    model: 'Clinical-Simulation-Engine',
    simulated: true,
    ...sim,
    processingTime: parseFloat(processingTime.toFixed(2)),
    notice,
  };
}

export default router;
