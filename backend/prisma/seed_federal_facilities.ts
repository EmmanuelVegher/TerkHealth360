import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('🇳🇬 Seeding Federal Ministry of Health (HFR) Health Facilities Registry...');
  
  const sqlFile = path.join(__dirname, 'seed_federal_facilities.sql');
  if (fs.existsSync(sqlFile)) {
    console.log('Found precompiled SQL file, checking database count...');
    const currentCount = await prisma.federalHealthFacility.count();
    console.log(`Current facilities in database: ${currentCount}`);
    
    if (currentCount >= 30000) {
      console.log('✅ Registry already populated with over 30,000 facilities. Skipping re-seed.');
      return;
    }

    console.log('Executing SQL bulk insert...');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    // Execute in chunks of statements
    const statements = sql.split(/;\s*\n/).filter(s => s.trim().length > 0);
    for (let i = 0; i < statements.length; i++) {
      await prisma.$executeRawUnsafe(statements[i]);
      if ((i + 1) % 10 === 0 || i === statements.length - 1) {
        console.log(`Executed ${i + 1}/${statements.length} batches...`);
      }
    }
  } else {
    console.log('SQL file not found.');
  }

  const finalCount = await prisma.federalHealthFacility.count();
  console.log(`✅ Completed! Total health facilities in database: ${finalCount}`);
}

main()
  .catch((e) => {
    console.error('Error seeding federal health facilities:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
