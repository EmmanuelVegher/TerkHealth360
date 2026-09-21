import { prisma } from './prisma.js';

async function main() {
  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        { lastName: { in: ['DOMINC', 'ADANNA', 'ONWUEYI', 'ESTHER', 'IJEOMA'] } },
        { firstName: { in: ['RITA', 'IJEOMA', 'CHIMDIKE', 'QUEEN'] } }
      ]
    },
    include: {
      visits: true,
      admissions: { include: { bed: { include: { ward: true } } } }
    }
  });

  for (const p of patients) {
    console.log(`\nPatient: ${p.firstName} ${p.lastName} (MRN: ${p.patientNumber}, ID: ${p.id})`);
    for (const v of p.visits) {
      console.log(`  Visit ${v.id}: type=${v.visitType}, status=${v.status}, createdAt=${v.createdAt}`);
    }
    for (const a of p.admissions) {
      console.log(`  Admission ${a.id}: status=${a.status}, bed=${a.bed?.number} (Ward: ${a.bed?.ward?.name})`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
