import { prisma } from '../prisma.js';
import bcrypt from 'bcryptjs';

export const INITIAL_STAFF = [
  { employeeId: 'FF-0001', firstName: 'Emmanuel', lastName: 'Vegher', email: 'vegher.emmanuel@yahoo.com', role: 'DOCTOR', department: 'OPD', designation: 'Chief Consultant Physician', specialization: 'Internal Medicine', licenseNumber: 'MDCN-L-10291' },
  { employeeId: 'FF-0002', firstName: 'Tertsegha', lastName: 'Vegher', email: 'evegher@ccfng.org', role: 'DOCTOR', department: 'OPD', designation: 'Senior Medical Officer (SMO)', specialization: 'Family Medicine', licenseNumber: 'MDCN-L-10292' },
  { employeeId: 'FF-0003', firstName: 'Grace', lastName: 'Okafor', email: 'grace.okafor@hospital.org', role: 'DOCTOR', department: 'Maternity', designation: 'Consultant Obstetrician & Gynaecologist', specialization: 'Obstetrics & Gynaecology', licenseNumber: 'MDCN-L-20411' },
  { employeeId: 'FF-0004', firstName: 'Fatima', lastName: 'Bello', email: 'fatima.bello@hospital.org', role: 'DOCTOR', department: 'Pediatrics', designation: 'Senior Registrar', specialization: 'Paediatrics & Child Health', licenseNumber: 'MDCN-L-30512' },
  { employeeId: 'FF-0005', firstName: 'Chidi', lastName: 'Nwachukwu', email: 'chidi.nwachukwu@hospital.org', role: 'DOCTOR', department: 'Surgery', designation: 'Consultant Surgeon', specialization: 'General Surgery', licenseNumber: 'MDCN-L-40982' },
  { employeeId: 'FF-0006', firstName: 'Ahmed', lastName: 'Usman', email: 'ahmed.usman@hospital.org', role: 'DOCTOR', department: 'Emergency', designation: 'Medical Officer (MO)', specialization: 'Emergency Medicine', licenseNumber: 'MDCN-L-51203' },
  { employeeId: 'FF-0007', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@hospital.org', role: 'DOCTOR', department: 'OPD', designation: 'Senior Medical Officer (SMO)', specialization: 'General Practice', licenseNumber: 'MDCN-L-62110' },

  // Pharmacists
  { employeeId: 'PH-0001', firstName: 'Kemi', lastName: 'Adeleke', email: 'kemi.adeleke@hospital.org', role: 'PHARMACIST', department: 'Pharmacy', designation: 'Director of Pharmacy Services (DPS)', specialization: 'Clinical Pharmacy', licenseNumber: 'PCN-P-11029' },
  { employeeId: 'PH-0002', firstName: 'Ibrahim', lastName: 'Musa', email: 'ibrahim.musa@hospital.org', role: 'PHARMACIST', department: 'Pharmacy', designation: 'Chief Pharmacist (CP)', specialization: 'Hospital Pharmacy', licenseNumber: 'PCN-P-22041' },
  { employeeId: 'PH-0003', firstName: 'Blessing', lastName: 'Okeke', email: 'blessing.okeke@hospital.org', role: 'PHARMACIST', department: 'Pharmacy', designation: 'Senior Pharmacist (SP)', specialization: 'Dispensing & Compounding', licenseNumber: 'PCN-P-33051' },

  // Lab Scientists
  { employeeId: 'LAB-0001', firstName: 'Emeka', lastName: 'Eze', email: 'emeka.eze@hospital.org', role: 'LAB_TECHNICIAN', department: 'Laboratory', designation: 'Chief Medical Laboratory Scientist (CMLS)', specialization: 'Hematology & Transfusion', licenseNumber: 'MLSCN-L-88102' },
  { employeeId: 'LAB-0002', firstName: 'Zainab', lastName: 'Suleiman', email: 'zainab.suleiman@hospital.org', role: 'LAB_TECHNICIAN', department: 'Laboratory', designation: 'Senior Medical Laboratory Scientist (SMLS)', specialization: 'Chemical Pathology', licenseNumber: 'MLSCN-L-99201' },

  // Nurses
  { employeeId: 'NRS-0001', firstName: 'Ngozi', lastName: 'Adeyemi', email: 'ngozi@hospital.com', role: 'NURSE', department: 'Nursing', designation: 'Chief Nursing Officer (CNO)', specialization: 'Clinical Nursing', licenseNumber: 'NMCN-N-77102' },
  { employeeId: 'NRS-0002', firstName: 'Aisha', lastName: 'Bello', email: 'aisha@hospital.com', role: 'NURSE', department: 'Nursing', designation: 'Matron / Ward Sister', specialization: 'Pediatric Nursing', licenseNumber: 'NMCN-N-88210' },

  // Morticians
  { employeeId: 'MOR-0001', firstName: 'Caleb', lastName: 'Okoh', email: 'caleb.okoh@hospital.org', role: 'STAFF', department: 'Mortuary', designation: 'Mortician', specialization: 'Embalming & Cold Vault Management', licenseNumber: 'MORT-NG-4401' },

  // Radiology & Radiographers
  { employeeId: 'RAD-0001', firstName: 'Khadijah', lastName: 'Aliyu', email: 'khadijah.aliyu@hospital.org', role: 'STAFF', department: 'Radiology', designation: 'Consultant Radiologist', specialization: 'Diagnostic Radiology & PACS', licenseNumber: 'RRBN-R-5501' },
  { employeeId: 'RAD-0002', firstName: 'Tunde', lastName: 'Balogun', email: 'tunde.balogun@hospital.org', role: 'STAFF', department: 'Radiology', designation: 'Radiographer', specialization: 'MRI & CT Scan Acquisition', licenseNumber: 'RRBN-R-5502' },

  // Physiotherapists
  { employeeId: 'PT-0001', firstName: 'Nkechi', lastName: 'Okonkwo', email: 'nkechi.okonkwo@hospital.org', role: 'STAFF', department: 'Physiotherapy', designation: 'Consultant Physiotherapist', specialization: 'Musculoskeletal & Neuro-Rehabilitation', licenseNumber: 'MRTBN-PT-6601' },
];

export async function seedClinicians() {
  const hashedPassword = bcrypt.hashSync('password123', 10);

  for (const item of INITIAL_STAFF) {
    let user = await prisma.user.findFirst({
      where: { OR: [{ username: item.employeeId }, { email: item.email }] }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: item.employeeId,
          email: item.email,
          passwordHash: hashedPassword,
          role: item.role as any,
          isActive: true,
        }
      });
      console.log(`[SeedClinicians] Created User: ${user.username} (${user.email})`);
    }

    let staff = await prisma.staff.findFirst({
      where: { OR: [{ employeeId: item.employeeId }, { userId: user.id }] }
    });

    if (!staff) {
      staff = await prisma.staff.create({
        data: {
          employeeId: item.employeeId,
          userId: user.id,
          firstName: item.firstName,
          lastName: item.lastName,
          department: item.department,
          designation: item.designation,
          specialization: item.specialization,
          licenseNumber: item.licenseNumber,
          isActive: true,
        }
      });
      console.log(`[SeedClinicians] Created Staff: ${staff.employeeId} - ${staff.firstName} ${staff.lastName}`);
    } else {
      await prisma.staff.update({
        where: { id: staff.id },
        data: {
          designation: item.designation,
          specialization: item.specialization,
          department: item.department,
        }
      });
      console.log(`[SeedClinicians] Updated Staff: ${staff.employeeId} - ${staff.firstName} ${staff.lastName}`);
    }

    // Ensure UserRoleMapping is created
    const mappedRoleName = item.employeeId.startsWith('RAD-')
      ? (item.designation.toLowerCase().includes('radiograph') ? 'RADIOGRAPHER' : 'RADIOLOGIST')
      : item.employeeId.startsWith('MOR-')
        ? 'MORTICIAN'
        : item.employeeId.startsWith('PT-') || item.employeeId.startsWith('PHY-')
          ? 'PHYSIOTHERAPIST'
          : item.role;
    const roleRecord = await prisma.role.findFirst({ where: { name: mappedRoleName } });
    if (roleRecord) {
      await prisma.userRoleMapping.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: roleRecord.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: roleRecord.id,
        },
      });
    }
  }
}
