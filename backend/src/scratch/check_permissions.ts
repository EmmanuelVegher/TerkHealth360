import { prisma } from '../prisma.js';

async function main() {
  const perms = await prisma.permission.findMany();
  console.log(`Found ${perms.length} permissions:`);
  perms.forEach((p: any) => console.log(`- ${p.code} (${p.module}): ${p.name}`));
}

main().finally(() => process.exit(0));
