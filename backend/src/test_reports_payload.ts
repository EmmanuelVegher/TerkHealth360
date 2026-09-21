import { prisma } from './prisma.js';

async function main() {
  // Execute exact logic of GET /analytics/reports
  const occupiedLabourBeds = await prisma.bed.findMany({
    where: {
      status: 'OCCUPIED',
      ward: {
        OR: [
          { wardCategory: 'LABOUR' },
          { type: 'LABOUR' },
          { name: { contains: 'Labour', mode: 'insensitive' } },
          { name: { contains: 'Delivery', mode: 'insensitive' } },
          { name: { contains: 'Maternity', mode: 'insensitive' } }
        ]
      }
    },
    include: {
      admissions: {
        where: { status: 'ADMITTED' },
        take: 1,
        include: { patient: true }
      }
    }
  });

  const activeLabourRecords = await prisma.labourRecord.findMany({
    where: { status: 'ACTIVE' },
    include: { pregnancy: { include: { patient: true } } }
  });

  const labourVisits = await prisma.visit.findMany({
    where: {
      status: { notIn: ['CLOSED', 'DISCHARGED'] },
      patient: { gender: 'FEMALE' },
      OR: [
        { visitType: 'LABOUR_DELIVERY' },
        { status: 'IN_LABOUR' }
      ]
    },
    include: { patient: true },
    orderBy: { createdAt: 'desc' }
  });

  const labourPatientIds = new Set<string>();
  const labourQueueList: any[] = [];

  for (const b of occupiedLabourBeds) {
    const p = b.admissions[0]?.patient;
    if (p && !labourPatientIds.has(p.id)) {
      labourPatientIds.add(p.id);
      labourQueueList.push({
        id: `bed-${b.id}`,
        patientId: p.id,
        patientName: `${p.firstName} ${p.lastName}`,
        mrn: p.patientNumber,
        status: 'IN_LABOUR',
        createdAt: b.admissions[0]?.admittedAt || new Date()
      });
    }
  }

  for (const lr of activeLabourRecords) {
    const p = lr.pregnancy?.patient;
    if (p && !labourPatientIds.has(p.id)) {
      labourPatientIds.add(p.id);
      labourQueueList.push({
        id: `lr-${lr.id}`,
        patientId: p.id,
        patientName: `${p.firstName} ${p.lastName}`,
        mrn: p.patientNumber,
        status: 'IN_LABOUR',
        createdAt: lr.admittedAt || new Date()
      });
    }
  }

  for (const v of labourVisits) {
    if (v.patient && !labourPatientIds.has(v.patientId)) {
      labourPatientIds.add(v.patientId);
      labourQueueList.push({
        id: v.id,
        patientId: v.patientId,
        patientName: `${v.patient.firstName} ${v.patient.lastName}`,
        mrn: v.patient.patientNumber,
        status: v.status,
        createdAt: v.createdAt
      });
    }
  }

  console.log('--- labourQueueList ---');
  console.log(JSON.stringify(labourQueueList, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
