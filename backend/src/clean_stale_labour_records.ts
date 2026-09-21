import { prisma } from './prisma.js';

async function main() {
  const activeRecords = await prisma.labourRecord.findMany({
    where: { status: 'ACTIVE' },
    include: {
      pregnancy: {
        include: {
          patient: {
            include: {
              visits: { where: { status: { notIn: ['CLOSED', 'DISCHARGED'] } } },
              admissions: { where: { status: 'ADMITTED' }, include: { bed: { include: { ward: true } } } }
            }
          }
        }
      }
    }
  });

  console.log(`Found ${activeRecords.length} active LabourRecords:`);
  for (const lr of activeRecords) {
    const p = lr.pregnancy?.patient;
    const activeBed = p?.admissions[0]?.bed;
    const activeVisit = p?.visits[0];
    console.log(`- LabourRecord ID: ${lr.id} | Patient: ${p?.firstName} ${p?.lastName} (${p?.patientNumber}) | Visit Status: ${activeVisit?.status || 'NONE'} | Bed: ${activeBed ? activeBed.number + ' (' + activeBed.ward?.name + ')' : 'NONE'}`);

    // If patient has NO active bed in Labour Ward and visit status is NOT IN_LABOUR, close/complete this stale LabourRecord
    if (!activeBed && activeVisit?.status !== 'IN_LABOUR') {
      console.log(`  --> CLOSING stale LabourRecord ${lr.id} for ${p?.firstName} ${p?.lastName}`);
      await prisma.labourRecord.update({
        where: { id: lr.id },
        data: { status: 'COMPLETED' }
      });
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
