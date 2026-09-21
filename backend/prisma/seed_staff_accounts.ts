import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const staffAccounts = [
  {
    username: 'amedu.admin',
    email: 'amedu.admin@hospital.com',
    firstName: 'Amedu',
    lastName: 'Alapa',
    role: UserRole.SUPER_ADMIN,
    employeeId: 'ADM-01',
    designation: 'Hospital Administrator',
    department: 'Administration'
  },
  {
    username: 'bishop.onaga',
    email: 'bishop.onaga@hospital.com',
    firstName: 'Most Rev. Dr. C.V.C.',
    lastName: 'Onaga',
    role: UserRole.SUPER_ADMIN,
    employeeId: 'ADM-02',
    designation: 'Catholic Diocesan Bishop & Patron',
    department: 'Executive / Diocese'
  },
  {
    username: 'fr.emmanuel',
    email: 'fr.emmanuel@hospital.com',
    firstName: 'Rev. Fr. Dr.',
    lastName: 'Emmanuel',
    role: UserRole.ADMIN,
    employeeId: 'ADM-03',
    designation: 'Diocesan Health Director / Bishop Representative',
    department: 'Executive / Health Commission'
  },
  {
    username: 'cmd.nwachukwu',
    email: 'cmd.nwachukwu@hospital.com',
    firstName: 'Dr.',
    lastName: 'Nwachukwu',
    role: UserRole.ADMIN,
    employeeId: 'ADM-04',
    designation: 'Chief Medical Director / Board Chair',
    department: 'Executive / Medical Board'
  },
  {
    username: 'chinedu.okafor',
    email: 'chinedu.okafor@hospital.com',
    firstName: 'Chinedu',
    lastName: 'Okafor',
    role: UserRole.STAFF,
    employeeId: 'EMP-009',
    designation: 'Revenue Unit Lead / Senior Supervisor',
    department: 'Finance & Revenue'
  },
  {
    username: 'ekwedike.dennis',
    email: 'ekwedike.dennis@hospital.com',
    firstName: 'Ekwedike',
    lastName: 'Dennis',
    role: UserRole.STAFF,
    employeeId: 'EMP-010',
    designation: 'Hospital Projects & Caritas Coordinator',
    department: 'Administration'
  },
  {
    username: 'ngozi.eze',
    email: 'ngozi.eze@hospital.com',
    firstName: 'Ngozi',
    lastName: 'Eze',
    role: UserRole.NURSE,
    employeeId: 'EMP-011',
    designation: 'Chief Nursing Officer / Ward Supervisor',
    department: 'Nursing & Inpatient'
  },
  {
    username: 'blessing.ugwu',
    email: 'blessing.ugwu@hospital.com',
    firstName: 'Blessing',
    lastName: 'Ugwu',
    role: UserRole.STAFF,
    employeeId: 'EMP-007',
    designation: 'Senior Cashier & Shift Lead',
    department: 'Finance & Revenue'
  },
  {
    username: 'ibrahim.danladi',
    email: 'ibrahim.danladi@hospital.com',
    firstName: 'Ibrahim',
    lastName: 'Danladi',
    role: UserRole.STAFF,
    employeeId: 'EMP-008',
    designation: 'Weekend Cashier Till Supervisor',
    department: 'Finance & Revenue'
  },
  {
    username: 'mary.okon',
    email: 'mary.okon@hospital.com',
    firstName: 'Mary',
    lastName: 'Okon',
    role: UserRole.STAFF,
    employeeId: 'EMP-006',
    designation: 'Senior Cashier & Revenue Officer',
    department: 'Finance & Revenue'
  },
  {
    username: 'tunde.fashola',
    email: 'tunde.fashola@hospital.com',
    firstName: 'Tunde',
    lastName: 'Fashola',
    role: UserRole.ADMIN,
    employeeId: 'EMP-005',
    designation: 'Hospital Administrator',
    department: 'Administration'
  },
  {
    username: 'aisha.bello',
    email: 'aisha.bello@hospital.com',
    firstName: 'Aisha',
    lastName: 'Bello',
    role: UserRole.DOCTOR,
    employeeId: 'EMP-004',
    designation: 'Clinical Services Director & Consultant',
    department: 'Clinical Services'
  }
];

async function main() {
  console.log('Seeding / Upserting staff and administrator accounts in PostgreSQL...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  for (const acc of staffAccounts) {
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: acc.username },
          { email: acc.email }
        ]
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: acc.username,
          email: acc.email,
          passwordHash,
          role: acc.role,
          isActive: true,
        }
      });
      console.log(`Created user: ${acc.username} (${acc.email})`);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          role: acc.role,
          isActive: true,
        }
      });
      console.log(`Updated user: ${acc.username} (${acc.email})`);
    }

    // Upsert staff profile
    const existingStaff = await prisma.staff.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { employeeId: acc.employeeId }
        ]
      }
    });

    if (!existingStaff) {
      await prisma.staff.create({
        data: {
          userId: user.id,
          employeeId: acc.employeeId,
          firstName: acc.firstName,
          lastName: acc.lastName,
          department: acc.department,
          designation: acc.designation,
          isActive: true
        }
      });
      console.log(`Created staff profile for: ${acc.firstName} ${acc.lastName} (${acc.employeeId})`);
    } else {
      await prisma.staff.update({
        where: { id: existingStaff.id },
        data: {
          userId: user.id,
          employeeId: acc.employeeId,
          firstName: acc.firstName,
          lastName: acc.lastName,
          department: acc.department,
          designation: acc.designation,
          isActive: true
        }
      });
      console.log(`Updated staff profile for: ${acc.firstName} ${acc.lastName} (${acc.employeeId})`);
    }
  }

  console.log('All staff & executive accounts successfully synchronized with database!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
