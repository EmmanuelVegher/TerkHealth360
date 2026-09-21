const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ select: { role: true } });
  const roles = [...new Set(users.map(u => u.role))];
  console.log(roles);
}
run();
