import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (adminUser) {
    const existingStaff = await prisma.staff.findUnique({
      where: { userId: adminUser.id }
    });

    if (!existingStaff) {
      await prisma.staff.create({
        data: {
          userId: adminUser.id,
          employeeId: 'SA-001',
          firstName: 'Super',
          lastName: 'Admin',
          department: 'Administration',
          designation: 'Administrator',
          specialization: 'System Admin',
          phone: '1234567890'
        }
      });
      console.log('Created Staff record for Admin user.');
    } else {
      console.log('Staff record for Admin user already exists.');
    }
  } else {
    console.log('Admin user not found.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
