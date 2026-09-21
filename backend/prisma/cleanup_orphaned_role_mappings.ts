/**
 * cleanup_orphaned_role_mappings.ts
 * 
 * One-time script to delete UserRoleMapping rows where the referenced Role
 * has been deleted (orphaned foreign keys). This permanently fixes the
 * Prisma "Inconsistent query result: Field role is required" error at login.
 * 
 * Run: npx ts-node prisma/cleanup_orphaned_role_mappings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Scanning for orphaned UserRoleMapping records...\n');

  // Find all UserRoleMapping rows
  const allMappings = await prisma.userRoleMapping.findMany({
    select: { userId: true, roleId: true },
  });

  // Find all existing Role IDs
  const allRoles = await prisma.role.findMany({ select: { id: true } });
  const validRoleIds = new Set(allRoles.map(r => r.id));

  // Find orphaned mappings
  const orphaned = allMappings.filter(m => !validRoleIds.has(m.roleId));

  if (orphaned.length === 0) {
    console.log('✅ No orphaned UserRoleMapping records found. Database is clean!');
    return;
  }

  console.log(`⚠️  Found ${orphaned.length} orphaned mapping(s):`);
  orphaned.forEach(m => {
    console.log(`   userId=${m.userId} → roleId=${m.roleId} (role no longer exists)`);
  });

  // Delete them
  let deletedCount = 0;
  for (const m of orphaned) {
    try {
      await prisma.userRoleMapping.delete({
        where: { userId_roleId: { userId: m.userId, roleId: m.roleId } },
      });
      deletedCount++;
      console.log(`   ✓ Deleted orphaned mapping: userId=${m.userId}, roleId=${m.roleId}`);
    } catch (err: any) {
      console.error(`   ✗ Failed to delete mapping userId=${m.userId}, roleId=${m.roleId}:`, err.message);
    }
  }

  console.log(`\n✅ Cleanup complete: ${deletedCount} orphaned mapping(s) removed.`);
  console.log('   Login should now work correctly for all users.\n');
}

main()
  .catch(e => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
