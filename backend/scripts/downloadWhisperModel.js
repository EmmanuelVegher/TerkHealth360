/**
 * One-time downloader for the OFFLINE Whisper speech-to-text model used by
 * OpenMed Voice Dictation. Run once while internet is available:
 *
 *     npm run stt:download            (default: whisper-base.en, ~80 MB)
 *     npm run stt:download -- small.en (more accurate, ~250 MB, slower)
 *
 * Files are stored in backend/models/Xenova/whisper-<size>/ and loaded from
 * disk afterwards — no network needed for dictation.
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const size = (process.argv[2] || 'base.en').replace(/^whisper-/, '');
const repo = `Xenova/whisper-${size}`;
const outDir = path.join(__dirname, '..', 'models', 'Xenova', `whisper-${size}`);

const FILES = [
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
];

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 10) return reject(new Error('Too many redirects'));
    https.get(url, { headers: { 'User-Agent': 'TerkHealth360-OpenMed' } }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return resolve(download(next, dest, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const total = Number(res.headers['content-length'] || 0);
      let done = 0;
      const tmp = dest + '.part';
      const file = fs.createWriteStream(tmp);
      res.on('data', chunk => {
        done += chunk.length;
        if (total) process.stdout.write(`\r   ${path.basename(dest)}: ${Math.round((done / total) * 100)}%   `);
      });
      res.pipe(file);
      file.on('finish', () => file.close(() => { fs.renameSync(tmp, dest); process.stdout.write('\n'); resolve(); }));
      file.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  console.log(`[OpenMed STT] Downloading ${repo} → ${outDir}`);
  for (const f of FILES) {
    const dest = path.join(outDir, f);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      console.log(`   ✓ ${f} (already present)`);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await download(`https://huggingface.co/${repo}/resolve/main/${f}`, dest);
  }
  console.log('[OpenMed STT] ✅ Offline Whisper model ready. Voice dictation now works without internet.');
})().catch(err => {
  console.error('[OpenMed STT] ❌ Download failed:', err.message);
  process.exit(1);
});
