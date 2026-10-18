/**
 * seed_scraped_terminologies.ts
 * 
 * Ingests all scraped international terminology files from data/terminologies/
 * directly into the TerkHealth360 PostgreSQL database (terminology_concepts table).
 * 
 * Usage:
 *   npx ts-node prisma/seed_scraped_terminologies.ts
 *   or: npm run seed:terminologies
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const isLocalOnly = process.argv.includes('--local') || process.env.SEED_TARGET === 'local';
const standardFilter = process.argv.find(a => a.startsWith('--standard='));
const targetStandard = standardFilter ? standardFilter.split('=')[1].toLowerCase() : null;

const dbUrl = isLocalOnly
  ? (process.env.DATABASE_URL || 'postgresql://mac@localhost:5432/ff_mission_hospital?schema=public')
  : (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

const DATA_DIR = path.resolve(__dirname, '../../data/terminologies');

const ALL_STANDARD_FILES = [
  'icd11_terminologies.json',
  'who_atc_terminologies.json',
  'loinc_terminologies.json',
  'icd10_terminologies.json',
  'rxnorm_terminologies.json',
  'cpt_terminologies.json',
  'isbt128_terminologies.json',
  'snomed_terminologies.json'
];

const STANDARD_FILES = targetStandard
  ? ALL_STANDARD_FILES.filter(f => f.toLowerCase().includes(targetStandard))
  : ALL_STANDARD_FILES;

async function main() {
  console.log('─────────────────────────────────────────────────────────────────────────────');
  console.log('TerkHealth360 — Seeding Database from Scraped Terminology Standards');
  console.log(`Directory : ${DATA_DIR}`);
  console.log(`Target DB : ${isLocalOnly ? 'LOCAL POSTGRESQL (localhost:5432) — NEON EXCLUDED' : 'NEON CLOUD'}`);
  if (targetStandard) {
    console.log(`Standard  : ${targetStandard.toUpperCase()} (${STANDARD_FILES.join(', ')})`);
  }
  console.log('─────────────────────────────────────────────────────────────────────────────\n');

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Directory not found: ${DATA_DIR}. Please run python3 scripts/scrape_terminologies.py first.`);
    process.exit(1);
  }

  let totalUpserted = 0;

  for (const filename of STANDARD_FILES) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`[!] Skipping ${filename} (file not found)`);
      continue;
    }

    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const concepts = content.concepts || [];
      console.log(`[+] Processing ${content.standard || filename}: ${concepts.length} concepts...`);

      const BATCH_SIZE = 1000;
      let batchCount = 0;

      for (let i = 0; i < concepts.length; i += BATCH_SIZE) {
        const chunk = concepts.slice(i, i + BATCH_SIZE).map((c: any) => ({
          system: c.system,
          code: c.code,
          display: c.display,
          description: c.description || null,
          category: c.category || 'OTHER',
          systemUri: c.systemUri || null,
          isActive: true
        }));

        await prisma.terminologyConcept.createMany({
          data: chunk,
          skipDuplicates: true
        });

        batchCount += chunk.length;
        if (batchCount % 10000 === 0 || batchCount === concepts.length) {
          console.log(`    -> Loaded ${batchCount} / ${concepts.length} concepts...`);
        }
      }

      totalUpserted += concepts.length;
      console.log(`    ✓ Successfully loaded ${concepts.length} concepts for ${content.standard}`);
    } catch (err: any) {
      console.error(`    ✗ Error processing ${filename}:`, err.message);
    }
  }

  console.log('\n─────────────────────────────────────────────────────────────────────────────');
  console.log(`Done! Successfully upserted ${totalUpserted} standard concepts into database.`);
  console.log('─────────────────────────────────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
