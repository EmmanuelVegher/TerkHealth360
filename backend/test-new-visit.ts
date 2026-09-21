import { PrismaClient } from '@prisma/client';
import axios from 'axios';
const prisma = new PrismaClient();
async function run() {
  const p1 = await prisma.patient.findFirst();
  
  // Fake login to get token
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  
  // We can just call the route logic directly or use prisma directly, but let's test via DB logic to avoid auth
  
}
run();
