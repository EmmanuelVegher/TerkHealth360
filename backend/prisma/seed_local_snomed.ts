/**
 * seed_local_snomed.ts
 * 
 * Ingests all 350,000 SNOMED CT Clinical Findings, Anatomy & Procedures
 * EXCLUSIVELY into the LOCAL PostgreSQL database (localhost:5432).
 * 
 * STRICT GUARANTEE: Never connects to or modifies Neon Cloud or any remote database.
 * 
 * Usage:
 *   npx tsx prisma/seed_local_snomed.ts
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
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

const CSV_FILE = path.resolve(__dirname, '../../data/terminologies/snomed_terminologies.csv');
const JSON_FILE = path.resolve(__dirname, '../../data/terminologies/snomed_terminologies.json');

async function main() {
  console.log('─────────────────────────────────────────────────────────────────────────────');
  console.log('TerkHealth360 — Local SNOMED CT Terminology Ingestion Engine');
  console.log(`Target Standard: SNOMED CT (350,000 Clinical Concepts)`);
  console.log(`Target DB      : LOCAL ONLY -> ${localDbUrl}`);
  console.log('NEON CLOUD     : STRICTLY EXCLUDED (No Cloud Connection)');
  console.log('─────────────────────────────────────────────────────────────────────────────\n');

  if (!fs.existsSync(CSV_FILE) && !fs.existsSync(JSON_FILE)) {
    console.error(`[✗] Neither CSV nor JSON data file found in data/terminologies!`);
    process.exit(1);
  }

  const client = new Client({ connectionString: localDbUrl });
  await client.connect();
  console.log('[+] Connected to local PostgreSQL successfully.');

  // Verify connected database host and name
  const dbCheck = await client.query('SELECT current_database(), inet_server_addr(), inet_server_port();');
  const serverAddr = dbCheck.rows[0].inet_server_addr;
  const serverPort = dbCheck.rows[0].inet_server_port || 5432;
  const currentDb = dbCheck.rows[0].current_database;
  console.log(`[+] Verified DB Connection: ${currentDb} on ${serverAddr || 'localhost'}:${serverPort}`);

  // Safety confirmation: Must be local
  if (serverAddr && serverAddr !== '127.0.0.1' && serverAddr !== '::1') {
    console.error(`FATAL: Server address ${serverAddr} is not local!`);
    await client.end();
    process.exit(1);
  }

  const BATCH_SIZE = 2000;
  let batch: any[] = [];
  let totalProcessed = 0;
  const startTime = Date.now();

  console.log(`[+] Streaming records from ${CSV_FILE}...`);
  console.log(`[+] Starting high-speed batch upsert (${BATCH_SIZE} items per chunk) into terminology_concepts...`);

  const fileStream = fs.createReadStream(CSV_FILE, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isHeader = true;

  async function flushBatch() {
    if (batch.length === 0) return;

    const values: any[] = [];
    const valuePlaceholders: string[] = [];

    batch.forEach((c: any, idx: number) => {
      const baseIdx = idx * 7;
      valuePlaceholders.push(
        `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6}, $${baseIdx + 7}, true, NOW(), NOW())`
      );
      values.push(
        crypto.randomUUID(),
        c.system || 'SNOMED',
        c.code,
        c.display,
        c.description || null,
        c.category || 'CLINICAL',
        c.systemUri || 'http://snomed.info/sct'
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
    totalProcessed += batch.length;
    batch = [];

    if (totalProcessed % 25000 === 0 || totalProcessed === 350000) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = Math.round(totalProcessed / Math.max(1, (Date.now() - startTime) / 1000));
      console.log(`    -> Ingested ${totalProcessed.toLocaleString()} / 350,000 concepts (${elapsed}s, ~${rate.toLocaleString()} concepts/sec)...`);
    }
  }

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line.trim()) continue;

    // CSV format: System,Code,Display,Category,System_URI,Description
    // Handle potential comma in description if any
    const firstComma = line.indexOf(',');
    const secondComma = line.indexOf(',', firstComma + 1);
    const thirdComma = line.indexOf(',', secondComma + 1);
    const fourthComma = line.indexOf(',', thirdComma + 1);
    const fifthComma = line.indexOf(',', fourthComma + 1);

    if (firstComma === -1 || secondComma === -1) continue;

    const system = line.slice(0, firstComma).trim();
    const code = line.slice(firstComma + 1, secondComma).trim();
    const display = line.slice(secondComma + 1, thirdComma).trim();
    const category = line.slice(thirdComma + 1, fourthComma).trim();
    const systemUri = line.slice(fourthComma + 1, fifthComma).trim();
    const description = line.slice(fifthComma + 1).trim();

    batch.push({ system, code, display, category, systemUri, description });

    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
    }
  }

  // Flush remaining records
  if (batch.length > 0) {
    await flushBatch();
  }

  // Verify final count in local database
  const countRes = await client.query("SELECT COUNT(*) FROM terminology_concepts WHERE system = 'SNOMED';");
  const totalLocalSnomed = parseInt(countRes.rows[0].count, 10);

  const allCountRes = await client.query("SELECT system, COUNT(*) as count FROM terminology_concepts GROUP BY system ORDER BY system;");

  console.log('\n─────────────────────────────────────────────────────────────────────────────');
  console.log(`✓ Completed Ingestion: ${totalProcessed.toLocaleString()} SNOMED CT concepts inserted/updated locally.`);
  console.log(`✓ Total SNOMED CT Concepts in Local DB: ${totalLocalSnomed.toLocaleString()}`);
  console.log('\nCurrent Local Database Terminology Summary:');
  console.table(allCountRes.rows);
  console.log('─────────────────────────────────────────────────────────────────────────────');

  await client.end();
}

main().catch((err) => {
  console.error('[✗] Ingestion failed:', err);
  process.exit(1);
});
