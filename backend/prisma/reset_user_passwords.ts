import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting passwords for default and custom accounts...');

  const defaultUsers = [
    { username: 'admin', password: 'admin123' },
    { username: 'doctor', password: 'doctor123' },
    { username: 'FF-0001', password: 'password123' },
    { username: 'FF-0002', password: 'password123' },
  ];

  for (const user of defaultUsers) {
    const existing = await prisma.user.findUnique({
      where: { username: user.username }
    });

    if (existing) {
      console.log(`Resetting password for username: "${user.username}" to "${user.password}"...`);
      const passwordHash = await bcrypt.hash(user.password, 12);
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, isActive: true }
      });
    } else {
      console.log(`User "${user.username}" not found in database. Skipping...`);
    }
  }

  console.log('All passwords successfully reset!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
