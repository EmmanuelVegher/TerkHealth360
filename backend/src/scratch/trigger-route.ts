import { prisma } from '../prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const user = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  
  if (!user) {
    console.error('No admin user found.');
    return;
  }
  
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    { expiresIn: '1h' }
  );
  
  const ports = [3000, 4000, 4001];
  for (const port of ports) {
    const url = `http://127.0.0.1:${port}/api/openmrs/sync/patients`;
    console.log(`\nTesting port ${port}: POST ${url}...`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Response Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log(`Response Body Snippet: ${text.substring(0, 500)}`);
    } catch (err: any) {
      console.log(`Error on port ${port}:`, err.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
