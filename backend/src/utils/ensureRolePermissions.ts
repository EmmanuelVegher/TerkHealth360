import { prisma } from '../prisma.js';

export async function ensureRolePermissions() {
  console.log('[RolePermissions] Ensuring default role-permission mappings are seeded...');
  try {
    // 1. Ensure required lab & clinical roles exist in DB
    const requiredRoles = [
      { name: 'SUPER_ADMIN', description: 'Full system root access' },
      { name: 'ADMIN', description: 'Hospital administrative management' },
      { name: 'DOCTOR', description: 'Clinical consultant and encounters' },
      { name: 'NURSE', description: 'Ward management and vital checks' },
      { name: 'RECEPTIONIST', description: 'Front desk registration and booking' },
      { name: 'PHARMACIST', description: 'Pharmacy inventory and dispensing' },
      { name: 'AUDITOR', description: 'Head of Internal Audit and Compliance Verification' },
      { name: 'ACCOUNTANT', description: 'Financial Accounting and General Ledger Management' },
      { name: 'FINANCE_OFFICER', description: 'Revenue and Financial Management' },
      { name: 'CASHIER', description: 'Point of Sale and Cash Desk Operations' },
      { name: 'LAB_TECHNICIAN', description: 'Lab sample management and results' },
      { name: 'LAB_SCIENTIST', description: 'Medical Laboratory Scientist analysis and reporting' },
      { name: 'PATHOLOGIST', description: 'Pathology diagnostic consultation and histology reporting' },
      { name: 'LABORATORY', description: 'Laboratory services and diagnostic operations' },
      { name: 'MORTICIAN', description: 'Mortuary and cold vault management' },
      { name: 'RADIOLOGIST', description: 'Diagnostic imaging, scan vetting, and PACS reporting' },
      { name: 'RADIOGRAPHER', description: 'Medical imaging scan acquisition and radiation safety' },
      { name: 'PHYSIOTHERAPIST', description: 'Physiotherapy, exercise rehabilitation and kinematic biofeedback' },
      { name: 'PATIENT', description: 'Patient portal basic access' },
      { name: 'STAFF', description: 'General hospital support staff' },
    ];

    for (const r of requiredRoles) {
      await prisma.role.upsert({
        where: { name: r.name },
        update: { description: r.description },
        create: r,
      });
    }

    const roles = await prisma.role.findMany();
    const roleMap: Record<string, string> = {};
    for (const r of roles) {
      roleMap[r.name] = r.id;
    }

    // 2. Get all permissions
    const permissions = await prisma.permission.findMany();
    const permMap: Record<string, string> = {};
    for (const p of permissions) {
      permMap[p.code] = p.id;
    }

    // Double check: if roles or permissions are empty, skip auto-seed
    if (roles.length === 0 || permissions.length === 0) {
      console.log('[RolePermissions] Roles or permissions are empty in DB, skipping auto-seed.');
      return;
    }

    // 3. Define permission mappings
    const labPerms = ['clinical:read', 'clinical:write', 'patient:read', 'auth:read', 'department:read', 'settings:read'];

    const mappings: Record<string, string[]> = {
      SUPER_ADMIN: permissions.map(p => p.code),
      ADMIN: ['auth:read', 'user:read', 'user:write', 'staff:read', 'staff:write', 'reports:read', 'reports:write', 'audit:read', 'settings:read', 'department:read'],
      DOCTOR: ['patient:read', 'patient:write', 'appointment:read', 'appointment:write', 'clinical:read', 'clinical:write', 'department:read', 'settings:read', 'auth:read'],
      NURSE: ['patient:read', 'patient:write', 'appointment:read', 'appointment:write', 'clinical:read', 'clinical:write', 'department:read', 'auth:read'],
      RECEPTIONIST: ['patient:read', 'patient:write', 'appointment:read', 'appointment:write', 'auth:read'],
      PHARMACIST: ['clinical:read', 'clinical:write', 'finance:read', 'finance:write', 'auth:read', 'settings:read'],
      PHARMACY_TECHNICIAN: ['clinical:read', 'clinical:write', 'finance:read', 'finance:write', 'auth:read', 'settings:read'],
      LAB_TECHNICIAN: labPerms,
      LAB_SCIENTIST: labPerms,
      PATHOLOGIST: labPerms,
      LABORATORY: labPerms,
      MORTICIAN: ['clinical:read', 'clinical:write', 'patient:read', 'auth:read', 'settings:read'],
      RADIOLOGIST: ['clinical:read', 'clinical:write', 'patient:read', 'auth:read', 'settings:read'],
      RADIOGRAPHER: ['clinical:read', 'clinical:write', 'patient:read', 'auth:read', 'settings:read'],
      PHYSIOTHERAPIST: ['clinical:read', 'clinical:write', 'patient:read', 'auth:read', 'settings:read'],
      AUDITOR: ['finance:read', 'finance:write', 'billing:read', 'billing:write', 'inventory:read', 'reports:read', 'auth:read', 'audit:read', 'audit:write', 'settings:read', 'staff:read', 'clinical:read', 'patient:read'],
      ACCOUNTANT: ['finance:read', 'finance:write', 'billing:read', 'billing:write', 'reports:read', 'auth:read', 'staff:read', 'settings:read'],
      FINANCE_OFFICER: ['finance:read', 'finance:write', 'billing:read', 'billing:write', 'reports:read', 'auth:read'],
      CASHIER: ['billing:read', 'billing:write', 'patient:read', 'auth:read'],
      STAFF: ['auth:read', 'user:read', 'finance:read', 'clinical:read'],
    };

    for (const roleName of Object.keys(mappings)) {
      const roleId = roleMap[roleName];
      if (!roleId) continue;

      const codes = mappings[roleName];
      for (const code of codes) {
        const permId = permMap[code];
        if (!permId) continue;

        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId,
            permissionId: permId,
          },
        });
      }
    }

    // 4. Ensure all lab users have UserRoleMapping in database
    const labRoleId = roleMap['LAB_TECHNICIAN'];
    if (labRoleId) {
      const labUsers = await prisma.user.findMany({
        where: {
          OR: [
            { role: 'LAB_TECHNICIAN' },
            { username: { startsWith: 'LAB-' } },
            { staff: { department: { contains: 'Lab', mode: 'insensitive' } } },
          ],
        },
      });

      for (const u of labUsers) {
        await prisma.userRoleMapping.upsert({
          where: {
            userId_roleId: {
              userId: u.id,
              roleId: labRoleId,
            },
          },
          update: {},
          create: {
            userId: u.id,
            roleId: labRoleId,
          },
        });
      }
    }

    // 5. Ensure all pharmacy users have UserRoleMapping in database
    const pharmRoleId = roleMap['PHARMACIST'];
    if (pharmRoleId) {
      const pharmUsers = await prisma.user.findMany({
        where: {
          OR: [
            { role: 'PHARMACIST' },
            { username: { startsWith: 'PH-' } },
            { staff: { department: { contains: 'Pharm', mode: 'insensitive' } } },
            { staff: { designation: { contains: 'Pharm', mode: 'insensitive' } } },
          ],
        },
      });

      for (const u of pharmUsers) {
        await prisma.userRoleMapping.upsert({
          where: {
            userId_roleId: {
              userId: u.id,
              roleId: pharmRoleId,
            },
          },
          update: {},
          create: {
            userId: u.id,
            roleId: pharmRoleId,
          },
        });
      }
    }

    // 6. Ensure all mortician users have UserRoleMapping in database
    const mortRoleId = roleMap['MORTICIAN'];
    if (mortRoleId) {
      const mortUsers = await prisma.user.findMany({
        where: {
          OR: [
            { username: { startsWith: 'MOR-' } },
            { staff: { department: { contains: 'Mort', mode: 'insensitive' } } },
            { staff: { designation: { contains: 'Mort', mode: 'insensitive' } } },
          ],
        },
      });

      for (const u of mortUsers) {
        await prisma.userRoleMapping.upsert({
          where: {
            userId_roleId: {
              userId: u.id,
              roleId: mortRoleId,
            },
          },
          update: {},
          create: {
            userId: u.id,
            roleId: mortRoleId,
          },
        });
      }
    }

    // 7. Ensure all radiology users have UserRoleMapping in database
    const radRoleId = roleMap['RADIOLOGIST'];
    const radGraphRoleId = roleMap['RADIOGRAPHER'];
    if (radRoleId || radGraphRoleId) {
      const radUsers = await prisma.user.findMany({
        where: {
          OR: [
            { username: { startsWith: 'RAD-' } },
            { staff: { department: { contains: 'Radiol', mode: 'insensitive' } } },
            { staff: { designation: { contains: 'Radiol', mode: 'insensitive' } } },
            { staff: { designation: { contains: 'Radiograph', mode: 'insensitive' } } },
          ],
        },
        include: { staff: true },
      });

      for (const u of radUsers) {
        const isGraph = (u.staff?.designation || '').toLowerCase().includes('radiograph');
        const targetRoleId = isGraph ? (radGraphRoleId || radRoleId) : (radRoleId || radGraphRoleId);
        if (targetRoleId) {
          await prisma.userRoleMapping.upsert({
            where: {
              userId_roleId: {
                userId: u.id,
                roleId: targetRoleId,
              },
            },
            update: {},
            create: {
              userId: u.id,
              roleId: targetRoleId,
            },
          });
        }
      }
    }

    // 8. Ensure all physiotherapy users have UserRoleMapping in database
    const physioRoleId = roleMap['PHYSIOTHERAPIST'];
    if (physioRoleId) {
      const physioUsers = await prisma.user.findMany({
        where: {
          OR: [
            { username: { startsWith: 'PT-' } },
            { username: { startsWith: 'PHY-' } },
            { staff: { department: { contains: 'Physio', mode: 'insensitive' } } },
            { staff: { designation: { contains: 'Physio', mode: 'insensitive' } } },
            { staff: { department: { contains: 'Rehab', mode: 'insensitive' } } },
            { staff: { designation: { contains: 'Rehab', mode: 'insensitive' } } },
          ],
        },
      });

      for (const u of physioUsers) {
        await prisma.userRoleMapping.upsert({
          where: {
            userId_roleId: {
              userId: u.id,
              roleId: physioRoleId,
            },
          },
          update: {},
          create: {
            userId: u.id,
            roleId: physioRoleId,
          },
        });
      }
    }

    console.log('[RolePermissions] ✓ Role-permission mappings and user mappings verified.');
  } catch (err) {
    console.error('[RolePermissions] ✗ Failed to ensure role permissions:', err);
  }
}
