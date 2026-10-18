/**
 * seed_local_isbt128.ts
 * 
 * Ingests all 5,086 ISBT 128 Blood Products, Cellular Therapy, Plasma & Tissue Allografts
 * EXCLUSIVELY into the LOCAL PostgreSQL database (localhost:5432).
 * 
 * STRICT GUARANTEE: Never connects to or modifies Neon Cloud or any remote database.
 * 
 * Usage:
 *   npx tsx prisma/seed_local_isbt128.ts
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

// STRICT SAFETY GUARD: Verify target database is strictly localhost / 127.0.0.1
const localDbUrl = process.env.DATABASE_URL || 'postgresql://mac@localhost:5432/ff_mission_hospital?schema=public';

if (
  localDbUrl.includes('neon.tech') ||
  localDbUrl.includes('aws') ||
  localDbUrl.includes('pooler') ||
  (!localDbUrl.includes('localhost') && !localDbUrl.includes('127.0.0.1'))
) {
  console.error('=============================================================================');
  console.error('FATAL SAFETY VIOLATION: Database connection points to remote/cloud host!');
  console.error(`Blocked URL: ${localDbUrl}`);
  console.error('Ingestion aborted immediately to protect cloud databases.');
  console.error('=============================================================================');
  process.exit(1);
}

const DATA_FILE = path.resolve(__dirname, '../../data/terminologies/isbt128_terminologies.json');

async function main() {
  console.log('─────────────────────────────────────────────────────────────────────────────');
  console.log('TerkHealth360 — Local ISBT 128 Blood Bank & Biologics Ingestion Engine');
  console.log(`Source File : ${DATA_FILE}`);
  console.log(`Target DB   : LOCAL ONLY -> ${localDbUrl}`);
  console.log('NEON CLOUD  : STRICTLY EXCLUDED (No Cloud Connection)');
  console.log('─────────────────────────────────────────────────────────────────────────────\n');

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`[✗] Data file not found: ${DATA_FILE}`);
    process.exit(1);
  }

  console.log('[+] Reading and parsing ISBT 128 JSON dataset...');
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const payload = JSON.parse(raw);
  const concepts = payload.concepts || [];

  console.log(`[+] Loaded ${concepts.length.toLocaleString()} ISBT 128 concepts from file.`);

  const client = new Client({ connectionString: localDbUrl });
  await client.connect();
  console.log('[+] Connected to local PostgreSQL successfully.');

  // Verify connected database host and name
  const dbCheck = await client.query('SELECT current_database(), inet_server_addr(), inet_server_port();');
  const serverAddr = dbCheck.rows[0].inet_server_addr;
  if (serverAddr && serverAddr !== '127.0.0.1' && serverAddr !== '::1' && serverAddr !== null) {
    console.error(`[FATAL] Connected IP is not localhost: ${serverAddr}`);
    await client.end();
    process.exit(1);
  }

  console.log(`[✓] Confirmed local database: ${dbCheck.rows[0].current_database} (Port: ${dbCheck.rows[0].inet_server_port || 5432})`);

  // Ensure table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS terminology_concepts (
      id TEXT PRIMARY KEY,
      system TEXT NOT NULL,
      code TEXT NOT NULL,
      display TEXT NOT NULL,
      description TEXT,
      category TEXT,
      "systemUri" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS terminology_concepts_system_code_key ON terminology_concepts(system, code);
  `);

  const BATCH_SIZE = 1500;
  let inserted = 0;
  const startTime = Date.now();

  console.log(`\n[+] Starting batch upsert (${BATCH_SIZE} items per chunk) into terminology_concepts...`);

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
        c.system || 'ISBT128',
        c.code,
        c.display,
        c.description || null,
        c.category || 'BLOOD_BANK',
        c.systemUri || 'http://isbt128.org'
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

    if (inserted % 1500 === 0 || inserted === concepts.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = Math.round(inserted / (Math.max(1, (Date.now() - startTime) / 1000)));
      console.log(`    -> Ingested ${inserted.toLocaleString()} / ${concepts.length.toLocaleString()} concepts (${elapsed}s, ~${rate.toLocaleString()} concepts/sec)...`);
    }
  }

  // Verify final count in local database
  const countRes = await client.query("SELECT COUNT(*) FROM terminology_concepts WHERE system = 'ISBT128';");
  const totalLocalIsbt = parseInt(countRes.rows[0].count, 10);

  const allCountRes = await client.query("SELECT system, COUNT(*) as count FROM terminology_concepts GROUP BY system ORDER BY system;");

  console.log('\n─────────────────────────────────────────────────────────────────────────────');
  console.log(`✓ Completed Ingestion: ${inserted.toLocaleString()} ISBT 128 concepts inserted/updated locally.`);
  console.log(`✓ Total ISBT 128 Concepts in Local DB: ${totalLocalIsbt.toLocaleString()}`);
  console.log('\nCurrent Local Database Terminology Summary:');
  allCountRes.rows.forEach(r => {
    console.log(`  • ${r.system.padEnd(10)}: ${parseInt(r.count, 10).toLocaleString()} concepts`);
  });
  console.log('─────────────────────────────────────────────────────────────────────────────');

  await client.end();
}

main().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
