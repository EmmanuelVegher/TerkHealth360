import { prisma } from '../prisma.js';

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: {
        staff: true
      }
    });
    console.log(`Found ${users.length} users in DB:`);
    users.forEach((u: any) => {
      console.log(`- Username: ${u.username} | Email: ${u.email} | Role: ${u.role} | Name: ${u.staff?.firstName || ''} ${u.staff?.lastName || ''}`);
    });

    const roles = await prisma.role.findMany();
    console.log(`Found ${roles.length} roles in DB:`);
    roles.forEach((r: any) => {
      console.log(`- Role: ${r.name} (${r.description})`);
    });
  } catch (err) {
    console.error('Error fetching users:', err);
  }
}

main().finally(() => process.exit(0));
