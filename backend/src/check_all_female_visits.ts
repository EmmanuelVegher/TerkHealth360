import { prisma } from './prisma.js';

async function main() {
  const visits = await prisma.visit.findMany({
    where: { status: 'IN_LABOUR' },
    include: {
      patient: {
        include: {
          admissions: { include: { bed: { include: { ward: true } } } }
        }
      }
    }
  });

  console.log(`Found ${visits.length} visits currently in status IN_LABOUR:`);
  for (const v of visits) {
    const activeBed = v.patient.admissions.find(a => a.status === 'ADMITTED')?.bed;
    console.log(`- Patient: ${v.patient.firstName} ${v.patient.lastName} (${v.patient.patientNumber}) | Visit ID: ${v.id} | VisitType: ${v.visitType} | Bed: ${activeBed ? activeBed.number + ' (' + activeBed.ward.name + ')' : 'NO BED ASSIGNED'}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
