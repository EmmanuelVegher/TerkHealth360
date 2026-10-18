/**
 * seed_local_icd10.ts
 * 
 * Ingests all 71,704 ICD-10-CM clinical diagnoses exclusively into the LOCAL PostgreSQL database.
 * GUARANTEE: Never touches Neon Cloud or any remote database.
 * 
 * Usage:
 *   npx tsx prisma/seed_local_icd10.ts
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// STRICT SAFETY GUARD: Ensure target is strictly local localhost/127.0.0.1
const localDbUrl = process.env.DATABASE_URL || 'postgresql://mac@localhost:5432/ff_mission_hospital?schema=public';

if (localDbUrl.includes('neon.tech') || localDbUrl.includes('aws') || !localDbUrl.includes('localhost') && !localDbUrl.includes('127.0.0.1')) {
  console.error('FATAL SAFETY VIOLATION: Target database URL points to a remote/cloud host instead of localhost!');
  console.error(`Blocked URL: ${localDbUrl}`);
  process.exit(1);
}

const DATA_FILE = path.resolve(__dirname, '../../data/terminologies/icd10_terminologies.json');

async function main() {
  console.log('─────────────────────────────────────────────────────────────────────────────');
  console.log('TerkHealth360 — Local ICD-10-CM Terminology Ingestion Engine');
  console.log(`Source File : ${DATA_FILE}`);
  console.log(`Target DB   : LOCAL ONLY -> ${localDbUrl}`);
  console.log('NEON CLOUD  : STRICTLY EXCLUDED (No Cloud Connection)');
  console.log('─────────────────────────────────────────────────────────────────────────────\n');

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`[✗] Data file not found: ${DATA_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const payload = JSON.parse(raw);
  const concepts = payload.concepts || [];

  console.log(`[+] Loaded ${concepts.length.toLocaleString()} ICD-10-CM concepts from file.`);

  const client = new Client({ connectionString: localDbUrl });
  await client.connect();
  console.log('[+] Connected to local PostgreSQL successfully.');

  // Verify connected database name
  const dbCheck = await client.query('SELECT current_database(), inet_server_addr(), inet_server_port();');
  console.log(`[+] Verified DB Connection: ${dbCheck.rows[0].current_database} (Port: ${dbCheck.rows[0].inet_server_port || 5432})`);

  const BATCH_SIZE = 1500;
  let inserted = 0;
  const startTime = Date.now();

  for (let i = 0; i < concepts.length; i += BATCH_SIZE) {
    const chunk = concepts.slice(i, i + BATCH_SIZE);

    const values: any[] = [];
    const valuePlaceholders: string[] = [];

    chunk.forEach((c: any, idx: number) => {
      const baseIdx = idx * 7;
      valuePlaceholders.push(
        `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6}, $${baseIdx + 7}, true, NOW(), NOW())`
      );
      values.push(
        crypto.randomUUID(),
        c.system || 'ICD10',
        c.code,
        c.display,
        c.description || null,
        c.category || 'DIAGNOSIS',
        c.systemUri || 'http://hl7.org/fhir/sid/icd-10'
      );
    });

    const sql = `
      INSERT INTO terminology_concepts ("id", "system", "code", "display", "description", "category", "systemUri", "isActive", "createdAt", "updatedAt")
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT ("system", "code") DO UPDATE SET
        "display" = EXCLUDED."display",
        "description" = EXCLUDED."description",
        "category" = EXCLUDED."category",
        "systemUri" = EXCLUDED."systemUri",
        "updatedAt" = NOW();
    `;

    await client.query(sql, values);
    inserted += chunk.length;

    if (inserted % 10000 === 0 || inserted === concepts.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`    -> Ingested ${inserted.toLocaleString()} / ${concepts.length.toLocaleString()} concepts (${elapsed}s)...`);
    }
  }

  // Verify final count in local database
  const countRes = await client.query("SELECT COUNT(*) FROM terminology_concepts WHERE system = 'ICD10';");
  const totalLocalICD10 = parseInt(countRes.rows[0].count, 10);

  const allCountRes = await client.query("SELECT system, COUNT(*) as count FROM terminology_concepts GROUP BY system ORDER BY system;");

  console.log('\n─────────────────────────────────────────────────────────────────────────────');
  console.log(`✓ Completed Ingestion: ${inserted.toLocaleString()} ICD-10-CM concepts inserted/updated locally.`);
  console.log(`✓ Total ICD-10-CM Concepts in Local DB: ${totalLocalICD10.toLocaleString()}`);
  console.log('Current Local Terminology Breakdown:');
  console.table(allCountRes.rows);
  console.log('─────────────────────────────────────────────────────────────────────────────');

  await client.end();
}

main().catch((err) => {
  console.error('[✗] Ingestion failed:', err);
  process.exit(1);
});
