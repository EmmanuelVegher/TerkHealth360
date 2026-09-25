import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const usersWithNullRole = await prisma.$queryRawUnsafe(`
    SELECT id, username, email, role FROM "users" WHERE role IS NULL
  `);
  console.log('Users with NULL role:', usersWithNullRole);

  const orphanedRoleMappings = await prisma.$queryRawUnsafe(`
    SELECT urm."userId", urm."roleId"
    FROM "user_role_mappings" urm
    LEFT JOIN "roles" r ON r.id = urm."roleId"
    WHERE r.id IS NULL
  `);
  console.log('Orphaned role mappings:', orphanedRoleMappings);

  const orphanedUserMappings = await prisma.$queryRawUnsafe(`
    SELECT urm."userId", urm."roleId"
    FROM "user_role_mappings" urm
    LEFT JOIN "users" u ON u.id = urm."userId"
    WHERE u.id IS NULL
  `);
  console.log('Orphaned user mappings:', orphanedUserMappings);
}

main().finally(() => prisma.$disconnect());
