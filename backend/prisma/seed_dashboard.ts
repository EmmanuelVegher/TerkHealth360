import { PrismaClient, Gender, UserRole, ObservationStatus, AppointmentStatus, EncounterStatus, EncounterClass } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting dashboard database seeding...');

  // Clean up any previously half-seeded dashboard data to ensure a clean run
  console.log('Cleaning up previous dashboard seed data...');
  
  await prisma.appointment.deleteMany({
    where: {
      patient: {
        user: {
          username: { startsWith: 'patient_' }
        }
      }
    }
  });

  await prisma.admission.deleteMany({
    where: {
      patient: {
        user: {
          username: { startsWith: 'patient_' }
        }
      }
    }
  });

  await prisma.invoice.deleteMany({
    where: {
      patient: {
        user: {
          username: { startsWith: 'patient_' }
        }
      }
    }
  });

  await prisma.observation.deleteMany({
    where: {
      patient: {
        user: {
          username: { startsWith: 'patient_' }
        }
      }
    }
  });

  await prisma.medicationRequest.deleteMany({
    where: {
      patient: {
        user: {
          username: { startsWith: 'patient_' }
        }
      }
    }
  });

  await prisma.encounter.deleteMany({
    where: {
      patient: {
        user: {
          username: { startsWith: 'patient_' }
        }
      }
    }
  });

  await prisma.patientTelecom.deleteMany({
    where: {
      patient: {
        user: {
          username: { startsWith: 'patient_' }
        }
      }
    }
  });

  await prisma.patient.deleteMany({
    where: {
      user: {
        username: { startsWith: 'patient_' }
      }
    }
  });

  await prisma.user.deleteMany({
    where: {
      username: { startsWith: 'patient_' }
    }
  });

  await prisma.auditLog.deleteMany({
    where: {
      action: { in: ['patient.create', 'observation.create', 'medication.create', 'invoice.payment', 'encounter.create'] }
    }
  });

  // Reset bed statuses to AVAILABLE
  await prisma.bed.updateMany({
    data: { status: 'AVAILABLE' }
  });

  // Fetch dependencies
  const wards = await prisma.ward.findMany({ include: { beds: true } });
  if (wards.length === 0) {
    console.log('No wards/beds found. Please run the primary database seed script first.');
    return;
  }

  const doctorStaff = await prisma.staff.findFirst();
  if (!doctorStaff) {
    console.log('No staff found. Please run the primary database seed script first.');
    return;
  }

  const defaultPassword = await bcrypt.hash('patient123', 12);

  // 3. Create 30 Patients (some created months ago, some today)
  console.log('Creating sample patients, users, encounters, and invoices...');
  const firstNames = [
    'Adebayo', 'Chinedu', 'Fatima', 'Emeka', 'Olumide',
    'Amara', 'Babatunde', 'Ngozi', 'Yusuf', 'Zainab',
    'Tunde', 'Kemi', 'Oluwaseun', 'Ibrahim', 'Chioma',
    'Kabir', 'Funmilayo', 'Sadiq', 'Blessing', 'Damilola',
    'Mustapha', 'Folake', 'Chidi', 'Halima', 'Tobi',
    'Amina', 'Segun', 'Nneka', 'Mansur', 'Yetunde'
  ];
  const lastNames = [
    'Okonkwo', 'Balogun', 'Adeyemi', 'Nwachukwu', 'Eze',
    'Musa', 'Bello', 'Obi', 'Lawan', 'Oyinlola',
    'Alabi', 'Dada', 'Soyinka', 'Gbadamosi', 'Olu',
    'Garba', 'Oladipo', 'Shehu', 'Nwosu', 'Bakare',
    'Usman', 'Ajayi', 'Anyanwu', 'Sanusi', 'Adewale',
    'Danladi', 'Bankole', 'Okeke', 'Abubakar', 'Williams'
  ];

  const patients = [];
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const fn = firstNames[i];
    const ln = lastNames[i];
    const username = `patient_${i}`;
    const email = `${username}@example.com`;

    // Create User
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: defaultPassword,
        role: UserRole.PATIENT,
        isActive: true,
      }
    });

    // Create Patient
    // Spread creation dates over the last 6 months to make the registration trend look real
    const registrationDate = new Date(today.getFullYear(), today.getMonth() - Math.floor(i / 5), 1 + (i % 28));

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        patientNumber: `FFMH-${10000 + i}`,
        firstName: fn,
        lastName: ln,
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        birthDate: new Date(1980 + (i % 25), i % 12, 1 + (i % 28)),
        status: 'ACTIVE',
        walletBalance: 1000 + (i * 500),
        amountOwed: 0,
        createdAt: registrationDate,
        updatedAt: registrationDate,
        telecoms: {
          create: [
            { system: 'phone', value: `+23480${Math.floor(10000000 + Math.random() * 90000000)}` }
          ]
        }
      }
    });
    patients.push(patient);

    // Create 1 Encounter for every patient
    const encounterDate = new Date(registrationDate);
    encounterDate.setHours(9 + (i % 6), 0, 0, 0);

    const encounter = await prisma.encounter.create({
      data: {
        patientId: patient.id,
        staffId: doctorStaff.id,
        status: EncounterStatus.FINISHED,
        class: EncounterClass.AMBULATORY,
        createdAt: encounterDate,
        updatedAt: encounterDate,
      }
    });

    // Create Invoices (some paid, some partial)
    const invoiceStatus = i % 3 === 0 ? 'PARTIAL' : i % 5 === 0 ? 'ISSUED' : 'PAID';
    const total = 5000 + (i * 1200);
    const amountPaid = invoiceStatus === 'PAID' ? total : invoiceStatus === 'PARTIAL' ? total / 2 : 0;

    await prisma.invoice.create({
      data: {
        patientId: patient.id,
        status: invoiceStatus,
        total,
        amountPaid,
        reasonText: 'General consultation and labs',
        createdAt: encounterDate,
        updatedAt: encounterDate,
      }
    });

    // Create dynamic observations (laboratory) for some patients
    if (i % 2 === 0) {
      await prisma.observation.create({
        data: {
          patientId: patient.id,
          staffId: doctorStaff.id,
          encounterId: encounter.id,
          status: ObservationStatus.FINAL,
          category: 'laboratory',
          code: '573-7',
          display: 'Malaria Parasite Smear',
          valueString: i % 4 === 0 ? 'Positive (+)' : 'Negative',
          createdAt: encounterDate,
        }
      });
    }

    // Create prescriptions for some patients
    if (i % 3 === 0) {
      await prisma.medicationRequest.create({
        data: {
          patientId: patient.id,
          staffId: doctorStaff.id,
          encounterId: encounter.id,
          medicationDisplay: 'Artemether-Lumefantrine 80/480mg',
          dosageText: '1 tablet twice daily for 3 days',
          note: 'Dispense full course',
          createdAt: encounterDate,
        }
      });
    }
  }

  // 4. Create 10 active Ward Admissions to show Bed Occupancy
  console.log('Seeding Ward Admissions...');
  let admissionsCount = 0;
  for (const ward of wards) {
    // Select first 2 available beds in the ward and admit patients
    const availableBeds = ward.beds.slice(0, 2);
    for (const bed of availableBeds) {
      const patient = patients[admissionsCount % patients.length];
      
      await prisma.admission.create({
        data: {
          patientId: patient.id,
          bedId: bed.id,
          admittingStaffId: doctorStaff.id,
          status: 'ADMITTED',
          admittedAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - (admissionsCount % 5)),
        }
      });

      // Update bed status to OCCUPIED
      await prisma.bed.update({
        where: { id: bed.id },
        data: { status: 'OCCUPIED' }
      });

      admissionsCount++;
    }
  }

  // 5. Create 15 Appointments (some today, some upcoming)
  console.log('Seeding Appointments...');
  for (let i = 0; i < 15; i++) {
    const patient = patients[i % patients.length];
    const isToday = i % 3 === 0;
    const start = new Date(today);
    
    if (isToday) {
      start.setHours(8 + (i % 8), 0, 0, 0);
    } else {
      start.setDate(today.getDate() + (i % 5) - 2); // some past, some future
      start.setHours(9 + (i % 5), 30, 0, 0);
    }

    const end = new Date(start);
    end.setMinutes(start.getMinutes() + 30);

    const apptStatus = i % 4 === 0 ? AppointmentStatus.PENDING : i % 5 === 0 ? AppointmentStatus.CANCELLED : AppointmentStatus.BOOKED;

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        staffId: doctorStaff.id,
        status: apptStatus,
        start,
        end,
        appointmentType: 'NEW',
        visitType: 'SCHEDULED',
        comment: 'Regular checkup',
      }
    });
  }

  // 6. Create Audit Logs for Activity Feed
  console.log('Seeding Audit Logs...');
  const auditLogs = [
    { action: 'patient.create', resourceType: 'Patient', createdAt: new Date(today.getTime() - 1000 * 60 * 5) }, // 5 min ago
    { action: 'observation.create', resourceType: 'Observation', createdAt: new Date(today.getTime() - 1000 * 60 * 18) }, // 18 min ago
    { action: 'medication.create', resourceType: 'MedicationRequest', createdAt: new Date(today.getTime() - 1000 * 60 * 35) }, // 35 min ago
    { action: 'invoice.payment', resourceType: 'Invoice', createdAt: new Date(today.getTime() - 1000 * 60 * 60) }, // 1 hr ago
    { action: 'encounter.create', resourceType: 'Encounter', createdAt: new Date(today.getTime() - 1000 * 60 * 120) }, // 2 hr ago
    { action: 'patient.create', resourceType: 'Patient', createdAt: new Date(today.getTime() - 1000 * 60 * 240) }, // 4 hr ago
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({
      data: {
        userId: doctorStaff.userId,
        action: log.action,
        resourceType: log.resourceType,
        createdAt: log.createdAt,
      }
    });
  }

  console.log('Dashboard database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
