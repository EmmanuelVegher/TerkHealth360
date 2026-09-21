import { prisma } from '../prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('--- CREATING ACCOUNTS FOR FINANCE, CASHIER, AND ADMIN ---');

  // 1. Ensure Dynamic Roles Exist in Role table
  const rolesToEnsure = [
    { name: 'SUPER_ADMIN', description: 'Full system root administrative access' },
    { name: 'ADMIN', description: 'Hospital administrative management' },
    { name: 'FINANCE_OFFICER', description: 'Financial accounting, revenue, billing gatekeeper, and payroll management' },
    { name: 'ACCOUNTANT', description: 'Financial accounting, auditing, expense tracking, and ledger reconciliation' },
    { name: 'CASHIER', description: 'Cashier point of sale, payment collection, receipt issuing, and cash register' },
    { name: 'BILLING_OFFICER', description: 'Patient invoicing, tariff management, insurance co-pay, and cash collection' },
    { name: 'INSURANCE_OFFICER', description: 'Health insurance claims, HMO pre-authorization, benefit caps, and tariff audits' },
    { name: 'HMO_OFFICER', description: 'HMO desk, managed care contracts, claim dispute adjudication, and reconciliation' },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of rolesToEnsure) {
    const dbRole = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    roleMap[r.name] = dbRole.id;
    console.log(`✅ Role ensured: ${r.name} (${dbRole.id})`);
  }

  // 2. Ensure Permissions are mapped to Roles
  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(allPermissions.map((p: any) => [p.code, p.id]));
  console.log(`Found ${allPermissions.length} permissions in database.`);

  const rolePermData: { roleId: string; permissionId: string }[] = [];

  // Grant all permissions to SUPER_ADMIN & ADMIN
  for (const p of allPermissions) {
    for (const roleName of ['SUPER_ADMIN', 'ADMIN']) {
      if (roleMap[roleName]) {
        rolePermData.push({ roleId: roleMap[roleName], permissionId: p.id });
      }
    }
  }

  // Grant finance permissions to FINANCE_OFFICER & ACCOUNTANT
  const financePermCodes = [
    'finance:read', 'finance:write', 'reports:read', 'patient:read',
    'department:read', 'audit:read', 'settings:read', 'auth:read', 'appointment:read'
  ];
  for (const code of financePermCodes) {
    const permId = permMap.get(code);
    if (permId) {
      for (const rName of ['FINANCE_OFFICER', 'ACCOUNTANT']) {
        if (roleMap[rName]) {
          rolePermData.push({ roleId: roleMap[rName], permissionId: permId });
        }
      }
    }
  }

  // Grant cashier permissions to CASHIER & BILLING_OFFICER
  const cashierPermCodes = [
    'finance:read', 'finance:write', 'patient:read', 'appointment:read',
    'department:read', 'auth:read'
  ];
  for (const code of cashierPermCodes) {
    const permId = permMap.get(code);
    if (permId) {
      for (const rName of ['CASHIER', 'BILLING_OFFICER']) {
        if (roleMap[rName]) {
          rolePermData.push({ roleId: roleMap[rName], permissionId: permId });
        }
      }
    }
  }

  // Grant insurance permissions to INSURANCE_OFFICER & HMO_OFFICER
  const insurancePermCodes = [
    'finance:read', 'finance:write', 'patient:read', 'appointment:read',
    'department:read', 'auth:read', 'reports:read'
  ];
  for (const code of insurancePermCodes) {
    const permId = permMap.get(code);
    if (permId) {
      for (const rName of ['INSURANCE_OFFICER', 'HMO_OFFICER']) {
        if (roleMap[rName]) {
          rolePermData.push({ roleId: roleMap[rName], permissionId: permId });
        }
      }
    }
  }

  if (rolePermData.length > 0) {
    const res = await prisma.rolePermission.createMany({
      data: rolePermData,
      skipDuplicates: true,
    });
    console.log(`✅ Assigned permissions to roles in bulk: ${res.count} inserted.`);
  }

  // 3. Ensure Departments Exist
  const deptsToEnsure = [
    { name: 'Billing and Finance', code: 'FIN' },
    { name: 'Administration', code: 'ADMIN' },
    { name: 'Health Insurance & HMO', code: 'INS' },
    { name: 'General Medicine', code: 'MED' },
    { name: 'Nursing', code: 'NURSE' },
  ];
  const deptMap: Record<string, string> = {};
  for (const d of deptsToEnsure) {
    const dbDept = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: d,
    });
    deptMap[d.code] = dbDept.id;
    console.log(`✅ Department ensured: ${d.name} (${d.code})`);
  }

  // 4. Create User Accounts
  const usersToCreate = [
    // ── ADMIN ACCOUNT ──
    {
      username: 'admin',
      email: 'admin@hospital.com',
      password: 'admin123',
      userEnumRole: 'SUPER_ADMIN' as const,
      dynamicRoles: ['SUPER_ADMIN', 'ADMIN'],
      departmentCode: 'ADMIN',
      staff: {
        employeeId: 'ADM-0001',
        firstName: 'System',
        lastName: 'Administrator',
        department: 'Administration',
        designation: 'Hospital Administrator & Medical Director',
        qualification: 'MBBS, FWACS, MSc Health Admin',
        specialization: 'Hospital Governance & Operations',
        licenseNumber: 'MD-ADM-001',
      },
    },
    // ── FINANCE MODULE ACCOUNTS ──
    {
      username: 'finance',
      email: 'finance@hospital.com',
      password: 'finance123',
      userEnumRole: 'STAFF' as const,
      dynamicRoles: ['FINANCE_OFFICER', 'ACCOUNTANT'],
      departmentCode: 'FIN',
      staff: {
        employeeId: 'FIN-0001',
        firstName: 'Chinedu',
        lastName: 'Okafor',
        department: 'Billing and Finance',
        designation: 'Chief Financial Officer (CFO)',
        qualification: 'BSc Accounting, MBA Finance, FCA',
        specialization: 'Hospital Financial Management & Treasury',
        licenseNumber: 'ICAN-88392',
      },
    },
    {
      username: 'accountant',
      email: 'accountant@hospital.com',
      password: 'accountant123',
      userEnumRole: 'STAFF' as const,
      dynamicRoles: ['ACCOUNTANT', 'FINANCE_OFFICER'],
      departmentCode: 'FIN',
      staff: {
        employeeId: 'FIN-0002',
        firstName: 'David',
        lastName: 'Adeleke',
        department: 'Billing and Finance',
        designation: 'Senior Accountant & Auditor',
        qualification: 'BSc Accounting, ACA',
        specialization: 'Financial Auditing & Revenue Assurance',
        licenseNumber: 'ICAN-91044',
      },
    },
    // ── CASHIER ACCOUNTS ──
    {
      username: 'cashier',
      email: 'cashier@hospital.com',
      password: 'cashier123',
      userEnumRole: 'RECEPTIONIST' as const,
      dynamicRoles: ['CASHIER', 'BILLING_OFFICER'],
      departmentCode: 'FIN',
      staff: {
        employeeId: 'CSH-0001',
        firstName: 'Mary',
        lastName: 'Okon',
        department: 'Billing and Finance',
        designation: 'Senior Revenue Cashier',
        qualification: 'HND Banking & Finance',
        specialization: 'Point of Sale & Billing Collections',
        licenseNumber: 'CSH-11094',
      },
    },
    {
      username: 'cashier01',
      email: 'cashier01@hospital.com',
      password: 'cashier123',
      userEnumRole: 'RECEPTIONIST' as const,
      dynamicRoles: ['CASHIER'],
      departmentCode: 'FIN',
      staff: {
        employeeId: 'CSH-0002',
        firstName: 'Blessing',
        lastName: 'Ugwu',
        department: 'Billing and Finance',
        designation: 'Front Desk Cashier',
        qualification: 'OND Accounting',
        specialization: 'Cash Desk & POS Collections',
        licenseNumber: 'CSH-11095',
      },
    },
    // ── INSURANCE & HMO ACCOUNTS ──
    {
      username: 'insurance',
      email: 'insurance@hospital.com',
      password: 'insurance123',
      userEnumRole: 'STAFF' as const,
      dynamicRoles: ['INSURANCE_OFFICER', 'HMO_OFFICER'],
      departmentCode: 'INS',
      staff: {
        employeeId: 'INS-0001',
        firstName: 'Ngozi',
        lastName: 'Eze',
        department: 'Health Insurance & HMO',
        designation: 'Lead Insurance & HMO Officer',
        qualification: 'BSc Health Information Mgmt, ACII',
        specialization: 'NHIA Schemes & HMO Managed Care',
        licenseNumber: 'HIM-77201',
      },
    },
    {
      username: 'hmo',
      email: 'hmo@hospital.com',
      password: 'hmo123',
      userEnumRole: 'STAFF' as const,
      dynamicRoles: ['HMO_OFFICER', 'INSURANCE_OFFICER'],
      departmentCode: 'INS',
      staff: {
        employeeId: 'HMO-0001',
        firstName: 'Tunde',
        lastName: 'Bakare',
        department: 'Health Insurance & HMO',
        designation: 'HMO Desk Officer & Claims Adjudicator',
        qualification: 'BSc Actuarial Science',
        specialization: 'Pre-Authorization & Tariff Reconciliation',
        licenseNumber: 'HMO-33019',
      },
    },
  ];

  for (const u of usersToCreate) {
    const passwordHash = await bcrypt.hash(u.password, 12);

    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        email: u.email,
        passwordHash,
        role: u.userEnumRole,
        isActive: true,
        isTemporaryPassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      create: {
        username: u.username,
        email: u.email,
        passwordHash,
        role: u.userEnumRole,
        isActive: true,
        isTemporaryPassword: false,
        failedLoginAttempts: 0,
      },
    });

    console.log(`👤 User upserted: ${user.username} (${user.email}) with primary role ${user.role}`);

    // Map dynamic roles in UserRoleMapping
    for (const rName of u.dynamicRoles) {
      if (roleMap[rName]) {
        await prisma.userRoleMapping.upsert({
          where: { userId_roleId: { userId: user.id, roleId: roleMap[rName] } },
          update: {},
          create: { userId: user.id, roleId: roleMap[rName] },
        });
        console.log(`   🔗 Linked dynamic role: ${rName}`);
      }
    }

    // UserDepartment
    if (deptMap[u.departmentCode]) {
      await prisma.userDepartment.upsert({
        where: { userId_departmentId: { userId: user.id, departmentId: deptMap[u.departmentCode] } },
        update: {},
        create: { userId: user.id, departmentId: deptMap[u.departmentCode] },
      });
    }

    // Staff Profile
    if (u.staff) {
      await prisma.staff.upsert({
        where: { userId: user.id },
        update: {
          employeeId: u.staff.employeeId,
          firstName: u.staff.firstName,
          lastName: u.staff.lastName,
          department: u.staff.department,
          designation: u.staff.designation,
          qualification: u.staff.qualification,
          specialization: u.staff.specialization,
          licenseNumber: u.staff.licenseNumber,
          isActive: true,
        },
        create: {
          userId: user.id,
          employeeId: u.staff.employeeId,
          firstName: u.staff.firstName,
          lastName: u.staff.lastName,
          department: u.staff.department,
          designation: u.staff.designation,
          qualification: u.staff.qualification,
          specialization: u.staff.specialization,
          licenseNumber: u.staff.licenseNumber,
          isActive: true,
        },
      });
      console.log(`   🪪 Staff profile linked: ${u.staff.firstName} ${u.staff.lastName} (${u.staff.employeeId})`);
    }
  }

  console.log('\n========================================');
  console.log('🎉 ALL ACCOUNTS CREATED SUCCESSFULLY!');
  console.log('========================================');
  console.log('1. ADMIN ACCOUNT:');
  console.log('   Username: admin');
  console.log('   Email: admin@hospital.com');
  console.log('   Password: admin123');
  console.log('   Roles: SUPER_ADMIN, ADMIN');
  console.log('----------------------------------------');
  console.log('2. FINANCE MODULE ACCOUNT:');
  console.log('   Username: finance (or accountant)');
  console.log('   Email: finance@hospital.com (or accountant@hospital.com)');
  console.log('   Password: finance123 (or accountant123)');
  console.log('   Roles: FINANCE_OFFICER, ACCOUNTANT');
  console.log('----------------------------------------');
  console.log('3. CASHIER ACCOUNT:');
  console.log('   Username: cashier (or cashier01)');
  console.log('   Email: cashier@hospital.com');
  console.log('   Password: cashier123');
  console.log('   Roles: CASHIER, BILLING_OFFICER');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Error creating accounts:', e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
