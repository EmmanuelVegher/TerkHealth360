import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- USERS IN DATABASE ---');
  users.forEach(u => {
    console.log(`Username: ${u.username}, Email: ${u.email}, Role: ${u.role}, IsActive: ${u.isActive}`);
  });
}

main().finally(() => prisma.$disconnect());
