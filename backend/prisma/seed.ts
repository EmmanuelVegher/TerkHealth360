import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const defaultPermissions = [
  { code: 'auth:read', name: 'Read Authentication', description: 'View auth status', module: 'Auth' },
  { code: 'auth:write', name: 'Write Authentication', description: 'Manage auth parameters', module: 'Auth' },
  { code: 'user:read', name: 'Read Users', description: 'View user accounts', module: 'Auth' },
  { code: 'user:write', name: 'Write Users', description: 'Manage user accounts', module: 'Auth' },
  { code: 'role:read', name: 'Read Roles', description: 'View system roles', module: 'Auth' },
  { code: 'role:write', name: 'Write Roles', description: 'Manage roles and permissions', module: 'Auth' },
  { code: 'department:read', name: 'Read Departments', description: 'View hospital departments', module: 'Auth' },
  { code: 'department:write', name: 'Write Departments', description: 'Manage departments', module: 'Auth' },
  { code: 'audit:read', name: 'Read Audit Logs', description: 'View security audit trail', module: 'Auth' },
  { code: 'patient:read', name: 'Read Patients', description: 'View patient records', module: 'EMR' },
  { code: 'patient:write', name: 'Write Patients', description: 'Create and edit patients', module: 'EMR' },
  { code: 'appointment:read', name: 'Read Appointments', description: 'View appointments', module: 'EMR' },
  { code: 'appointment:write', name: 'Write Appointments', description: 'Book and manage appointments', module: 'EMR' },
  { code: 'clinical:read', name: 'Read Clinical Data', description: 'View clinical observations, encounters', module: 'Clinical' },
  { code: 'clinical:write', name: 'Write Clinical Data', description: 'Add/edit observations, vital signs, prescriptions', module: 'Clinical' },
  { code: 'finance:read', name: 'Read Financial Records', description: 'View invoices and payroll', module: 'Finance' },
  { code: 'finance:write', name: 'Write Financial Records', description: 'Manage invoices and payroll', module: 'Finance' },
  { code: 'reports:read', name: 'Read Reports', description: 'View system reports and analytics', module: 'Admin' },
  { code: 'settings:read', name: 'Read Settings', description: 'View application settings', module: 'Admin' },
  { code: 'settings:write', name: 'Write Settings', description: 'Modify system configuration', module: 'Admin' },
];

const defaultRoles = [
  { name: 'SUPER_ADMIN', description: 'Full system root access' },
  { name: 'ADMIN', description: 'Hospital administrative management' },
  { name: 'DOCTOR', description: 'Clinical consultant and encounters' },
  { name: 'NURSE', description: 'Ward management and vital checks' },
  { name: 'RECEPTIONIST', description: 'Front desk registration and booking' },
  { name: 'PHARMACIST', description: 'Pharmacy inventory and dispensing' },
  { name: 'LAB_TECHNICIAN', description: 'Lab sample management and results' },
  { name: 'PATIENT', description: 'Patient portal basic access' },
  { name: 'STAFF', description: 'General hospital support staff' },
  { name: 'AUDITOR', description: 'Internal audit and security logs review' },
  { name: 'INSURANCE_OFFICER', description: 'Insurance portal and claims management' },
  { name: 'SECRETARY', description: 'Hospital front-office and scheduling assistance' },
  { name: 'LAB_SCIENTIST', description: 'Lab scientist test validation and results authorization' },
  { name: 'PHARMACY_TECHNICIAN', description: 'Assisting pharmacist with inventory and dispensing' },
  { name: 'PHARMACY_TECHNICIANS', description: 'Assisting pharmacist with inventory and dispensing' },
];

async function main() {
  console.log('Seeding database with advanced RBAC, Departments, Wards, Beds, and Insurance...');

  // 1. Seed Permissions
  console.log('Seeding permissions...');
  const seededPermissions: Record<string, string> = {};
  for (const perm of defaultPermissions) {
    const dbPerm = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, description: perm.description, module: perm.module },
      create: perm,
    });
    seededPermissions[perm.code] = dbPerm.id;
  }

  // 2. Seed Roles
  console.log('Seeding roles...');
  const seededRoles: Record<string, string> = {};
  for (const r of defaultRoles) {
    const dbRole = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    seededRoles[r.name] = dbRole.id;
  }

  // 3. Map Permissions to Roles
  console.log('Configuring role-permission mappings...');
  for (const permCode of Object.keys(seededPermissions)) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: seededRoles['SUPER_ADMIN'],
          permissionId: seededPermissions[permCode],
        },
      },
      update: {},
      create: {
        roleId: seededRoles['SUPER_ADMIN'],
        permissionId: seededPermissions[permCode],
      },
    });
  }

  const doctorPerms = ['patient:read', 'patient:write', 'appointment:read', 'appointment:write', 'clinical:read', 'clinical:write', 'department:read', 'settings:read', 'auth:read'];
  for (const code of doctorPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: seededRoles['DOCTOR'],
          permissionId: seededPermissions[code],
        },
      },
      update: {},
      create: {
        roleId: seededRoles['DOCTOR'],
        permissionId: seededPermissions[code],
      },
    });
  }

  const patientPerms = ['patient:read', 'appointment:read', 'appointment:write'];
  for (const code of patientPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: seededRoles['PATIENT'],
          permissionId: seededPermissions[code],
        },
      },
      update: {},
      create: {
        roleId: seededRoles['PATIENT'],
        permissionId: seededPermissions[code],
      },
    });
  }

  // 4. Seed Departments
  console.log('Seeding departments...');
  const departments = [
    { name: 'General Medicine', code: 'MED' },
    { name: 'Surgery Department', code: 'SURG' },
    { name: 'Pediatrics Department', code: 'PEDS' },
    { name: 'Administration', code: 'ADMIN' },
    { name: 'Billing and Finance', code: 'FIN' },
    { name: 'Human Resources', code: 'HR' },
  ];
  const seededDepts: Record<string, string> = {};
  for (const dept of departments) {
    const dbDept = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name },
      create: dept,
    });
    seededDepts[dept.code] = dbDept.id;
  }

  // 5. Seed Wards & Beds
  console.log('Seeding Wards and Beds...');
  const wards = [
    { name: 'Medical Ward A', type: 'Medical' },
    { name: 'Surgical Ward B', type: 'Surgical' },
    { name: 'ICU Intensive Care', type: 'ICU' },
  ];

  for (const w of wards) {
    const dbWard = await prisma.ward.upsert({
      where: { name: w.name },
      update: {},
      create: { name: w.name, type: w.type },
    });

    // Create 5 beds for each ward
    for (let i = 1; i <= 5; i++) {
      const bedNum = `${w.type.substring(0, 3).toUpperCase()}-${i.toString().padStart(2, '0')}`;
      await prisma.bed.upsert({
        where: {
          wardId_number: {
            wardId: dbWard.id,
            number: bedNum,
          },
        },
        update: {},
        create: {
          number: bedNum,
          wardId: dbWard.id,
          status: 'AVAILABLE',
        },
      });
    }
  }

  // 6. Seed Insurance Providers & Plans
  console.log('Seeding Insurance Providers and Plans...');
  const providers = [
    { name: 'NHIS (National Health Insurance Scheme)', code: 'NHIS' },
    { name: 'AXA Mansard Health', code: 'AXA' },
    { name: 'Hygeia HMO', code: 'HYGEIA' },
  ];

  for (const prov of providers) {
    const dbProv = await prisma.insuranceProvider.upsert({
      where: { code: prov.code },
      update: { name: prov.name },
      create: { name: prov.name, code: prov.code, contactDetails: 'enquiries@provider.com' },
    });

    // Create 2 Plans for each
    await prisma.insuranceBenefitPlan.createMany({
      data: [
        {
          name: 'Silver Shield Plan',
          providerId: dbProv.id,
          coverageDetails: JSON.stringify({
            consultation: 100, // percentage covered
            laboratory: 80,
            radiology: 70,
            medications: 75,
            ward: 50,
          }),
        },
        {
          name: 'Platinum Premium Plan',
          providerId: dbProv.id,
          coverageDetails: JSON.stringify({
            consultation: 100,
            laboratory: 100,
            radiology: 100,
            medications: 90,
            ward: 100,
          }),
        },
      ],
      skipDuplicates: true,
    });
  }

  // 7. Create Default Users
  console.log('Seeding default user accounts...');
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { role: 'ADMIN' },
    create: {
      username: 'admin',
      email: 'admin@hospital.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  await prisma.userRoleMapping.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: seededRoles['ADMIN'] } },
    update: {},
    create: { userId: adminUser.id, roleId: seededRoles['ADMIN'] },
  });

  await prisma.userDepartment.upsert({
    where: { userId_departmentId: { userId: adminUser.id, departmentId: seededDepts['ADMIN'] } },
    update: {},
    create: { userId: adminUser.id, departmentId: seededDepts['ADMIN'] },
  });

  const superAdminUser = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      username: 'superadmin',
      email: 'superadmin@hospital.com',
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  await prisma.userRoleMapping.upsert({
    where: { userId_roleId: { userId: superAdminUser.id, roleId: seededRoles['SUPER_ADMIN'] } },
    update: {},
    create: { userId: superAdminUser.id, roleId: seededRoles['SUPER_ADMIN'] },
  });

  await prisma.userDepartment.upsert({
    where: { userId_departmentId: { userId: superAdminUser.id, departmentId: seededDepts['ADMIN'] } },
    update: {},
    create: { userId: superAdminUser.id, departmentId: seededDepts['ADMIN'] },
  });

  const doctorPassword = await bcrypt.hash('doctor123', 12);
  const doctorUser = await prisma.user.upsert({
    where: { username: 'doctor' },
    update: {},
    create: {
      username: 'doctor',
      email: 'doctor@hospital.com',
      passwordHash: doctorPassword,
      role: 'DOCTOR',
      isActive: true,
    },
  });

  await prisma.userRoleMapping.upsert({
    where: { userId_roleId: { userId: doctorUser.id, roleId: seededRoles['DOCTOR'] } },
    update: {},
    create: { userId: doctorUser.id, roleId: seededRoles['DOCTOR'] },
  });

  await prisma.userDepartment.upsert({
    where: { userId_departmentId: { userId: doctorUser.id, departmentId: seededDepts['MED'] } },
    update: {},
    create: { userId: doctorUser.id, departmentId: seededDepts['MED'] },
  });

  await prisma.staff.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      userId: doctorUser.id,
      employeeId: 'DOC-001',
      firstName: 'John',
      lastName: 'Smith',
      department: 'General Medicine',
      designation: 'Senior Consultant',
      qualification: 'MBBS, MD',
      specialization: 'Internal Medicine',
      licenseNumber: 'MED-12345',
      isActive: true,
    },
  });

  const nursePassword = await bcrypt.hash('nurse123', 12);
  const nurseUser = await prisma.user.upsert({
    where: { username: 'nurse' },
    update: { passwordHash: nursePassword, role: 'NURSE' },
    create: {
      username: 'nurse',
      email: 'nurse@hospital.com',
      passwordHash: nursePassword,
      role: 'NURSE',
      isActive: true,
    },
  });

  await prisma.userRoleMapping.upsert({
    where: { userId_roleId: { userId: nurseUser.id, roleId: seededRoles['NURSE'] } },
    update: {},
    create: { userId: nurseUser.id, roleId: seededRoles['NURSE'] },
  });

  await prisma.staff.upsert({
    where: { userId: nurseUser.id },
    update: { designation: 'Staff Nurse' },
    create: {
      userId: nurseUser.id,
      employeeId: 'NRS-001',
      firstName: 'Sarah',
      lastName: 'Johnson',
      department: 'Nursing',
      designation: 'Staff Nurse',
      qualification: 'BSc Nursing, RN',
      specialization: 'General Nursing',
      licenseNumber: 'NRS-54321',
      isActive: true,
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
