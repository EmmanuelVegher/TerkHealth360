import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
import { prisma } from '../prisma.js';

// Multer configuration for profile picture upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/avatars';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG/JPG/PNG/WEBP) are allowed'));
  },
});

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(3),
  role: z.string().optional(), // primary/fallback role enum string
  roles: z.array(z.string()).min(1), // dynamic role IDs
  departments: z.array(z.string()).min(1), // department IDs
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  employeeId: z.string().optional(), // required for staff
});

const updateUserSchema = z.object({
  email: z.string().email(),
  isActive: z.boolean().optional(),
  roles: z.array(z.string()).optional(),
  departments: z.array(z.string()).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  designation: z.string().optional(),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  employeeId: z.string().optional(),
});

// PATCH /me/password - Change current user's password
router.patch('/me/password', authMiddleware, async (req: any, res, next) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8),
    }).parse(req.body);

    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid current password' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await logAudit({
      userId,
      action: 'user.change_password',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { message: 'Password changed successfully' },
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

import { getHREmployees } from './hr.js';

let staffSynced = false;

export async function ensureAllStaffUsersSynced() {
  try {
    const hrEmployees = getHREmployees();
    const defaultHash = await bcrypt.hash('password123', 10);

    const dbRoles = await prisma.role.findMany();
    const roleByName = new Map(dbRoles.map((r: any) => [r.name.toUpperCase(), r.id]));

    const dbDepts = await prisma.department.findMany();
    const deptByCode = new Map(dbDepts.map((d: any) => [d.code.toUpperCase(), d.id]));

    for (const emp of hrEmployees) {
      // 1. Check if user exists by email, employeeId, or username
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: emp.email },
            { username: emp.id.toLowerCase() },
            { username: emp.id },
            { staff: { employeeId: emp.id } },
          ],
        },
        include: { staff: true },
      });

      // Determine UserRole enum
      let userEnumRole: any = 'STAFF';
      const roleStr = (emp.role || '').toLowerCase();
      if (roleStr.includes('admin') || roleStr.includes('ceo') || roleStr.includes('director') || roleStr.includes('bishop')) {
        userEnumRole = 'SUPER_ADMIN';
      } else if (roleStr.includes('doctor') || roleStr.includes('physician') || roleStr.includes('surgeon') || roleStr.includes('consultant')) {
        userEnumRole = 'DOCTOR';
      } else if (roleStr.includes('nurse') || roleStr.includes('matron')) {
        userEnumRole = 'NURSE';
      } else if (roleStr.includes('pharmacist')) {
        userEnumRole = 'PHARMACIST';
      } else if (roleStr.includes('cashier')) {
        userEnumRole = 'RECEPTIONIST';
      } else if (roleStr.includes('accountant') || roleStr.includes('audit') || roleStr.includes('finance')) {
        userEnumRole = 'STAFF';
      }

      // Determine dynamic role name
      let dynamicRoleName = 'STAFF';
      if (roleStr.includes('audit')) {
        dynamicRoleName = 'AUDITOR';
      } else if (roleStr.includes('accountant')) {
        dynamicRoleName = 'ACCOUNTANT';
      } else if (roleStr.includes('finance') || roleStr.includes('revenue')) {
        dynamicRoleName = 'FINANCE_OFFICER';
      } else if (roleStr.includes('cashier')) {
        dynamicRoleName = 'CASHIER';
      } else if (roleStr.includes('doctor') || roleStr.includes('physician')) {
        dynamicRoleName = 'DOCTOR';
      } else if (roleStr.includes('nurse') || roleStr.includes('matron')) {
        dynamicRoleName = 'NURSE';
      } else if (roleStr.includes('pharmacist')) {
        dynamicRoleName = 'PHARMACIST';
      } else if (roleStr.includes('lab') || roleStr.includes('scientist')) {
        dynamicRoleName = 'LAB_TECHNICIAN';
      } else if (roleStr.includes('admin') || roleStr.includes('director') || roleStr.includes('ceo') || roleStr.includes('coordinator')) {
        dynamicRoleName = 'ADMIN';
      }

      if (!user) {
        user = await prisma.user.create({
          data: {
            username: emp.id.toLowerCase(),
            email: emp.email,
            passwordHash: defaultHash,
            role: userEnumRole,
            isActive: emp.status !== 'INACTIVE',
          },
          include: { staff: true },
        });
      }

      // 2. Ensure Staff record is linked
      if (!user.staff) {
        const staffByEmpId = await prisma.staff.findUnique({ where: { employeeId: emp.id } });
        if (staffByEmpId) {
          await prisma.staff.update({
            where: { id: staffByEmpId.id },
            data: {
              userId: user.id,
              firstName: emp.firstName,
              lastName: emp.lastName,
              department: emp.department,
              designation: emp.role,
              licenseNumber: emp.licenseNo !== 'N/A' ? emp.licenseNo : null,
              isActive: emp.status !== 'INACTIVE',
            },
          });
        } else {
          await prisma.staff.create({
            data: {
              userId: user.id,
              employeeId: emp.id,
              firstName: emp.firstName,
              lastName: emp.lastName,
              department: emp.department,
              designation: emp.role,
              licenseNumber: emp.licenseNo !== 'N/A' ? emp.licenseNo : null,
              isActive: emp.status !== 'INACTIVE',
            },
          });
        }
      } else {
        await prisma.staff.update({
          where: { id: user.staff.id },
          data: {
            firstName: emp.firstName,
            lastName: emp.lastName,
            department: emp.department,
            designation: emp.role,
            licenseNumber: emp.licenseNo !== 'N/A' ? emp.licenseNo : user.staff.licenseNumber,
          },
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: emp.firstName,
          lastName: emp.lastName,
          designation: emp.role,
        } as any,
      }).catch(() => {});

      // 3. Map dynamic role
      const roleId = roleByName.get(dynamicRoleName) || roleByName.get('STAFF');
      if (roleId) {
        await prisma.userRoleMapping.upsert({
          where: {
            userId_roleId: {
              userId: user.id,
              roleId,
            },
          },
          update: {},
          create: {
            userId: user.id,
            roleId,
          },
        }).catch(() => {});
      }

      // 4. Map Department
      const deptCode = emp.department.includes('Finance') || emp.department.includes('Billing') ? 'FIN'
        : emp.department.includes('Admin') || emp.department.includes('Executive') || emp.department.includes('Resources') ? 'ADMIN'
        : emp.department.includes('Nursing') || emp.department.includes('ICU') ? 'NURSE'
        : emp.department.includes('Pharmacy') ? 'PHARM'
        : emp.department.includes('Diagnostics') || emp.department.includes('Lab') ? 'LAB'
        : 'MED';

      const deptId = deptByCode.get(deptCode) || deptByCode.get('ADMIN') || dbDepts[0]?.id;
      if (deptId) {
        await prisma.userDepartment.upsert({
          where: {
            userId_departmentId: {
              userId: user.id,
              departmentId: deptId,
            },
          },
          update: {},
          create: {
            userId: user.id,
            departmentId: deptId,
          },
        }).catch(() => {});
      }
    }
    staffSynced = true;
  } catch (err) {
    console.error('[Users] Error syncing staff accounts:', err);
  }
}

// Automatically sync on initial load
ensureAllStaffUsersSynced().catch(() => {});

// List Users with pagination, filters and search (Staff Accounts Only)
router.get('/', authMiddleware, async (req: any, res, next) => {
  try {
    if (!staffSynced) {
      await ensureAllStaffUsersSynced();
    }

    const { search, role, department, page = '1', limit = '10' } = req.query;
    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 10;
    const skip = (p - 1) * l;

    // Strictly filter for staff only (exclude patient portal and OCR patient accounts)
    const where: any = {
      patient: null,
      role: { not: 'PATIENT' },
      NOT: [
        { username: { startsWith: 'ocr_user_' } },
        { email: { contains: '@hospital.local' } },
      ],
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { username: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } },
            { staff: { firstName: { contains: search as string, mode: 'insensitive' } } },
            { staff: { lastName: { contains: search as string, mode: 'insensitive' } } },
            { staff: { employeeId: { contains: search as string, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    if (role) {
      where.roles = {
        some: {
          roleId: role as string,
        },
      };
    }

    if (department) {
      where.departments = {
        some: {
          departmentId: department as string,
        },
      };
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        include: {
          staff: true,
          patient: true,
          roles: { include: { role: true } },
          departments: { include: { department: true } },
        },
        orderBy: [
          { staff: { employeeId: 'asc' } },
          { createdAt: 'asc' }
        ],
        skip,
        take: l,
      }),
      prisma.user.count({ where }),
    ]);

    const result = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      firstName: u.staff?.firstName || '',
      lastName: u.staff?.lastName || '',
      employeeId: u.staff?.employeeId || null,
      patientNumber: null,
      roles: u.roles.map(ur => ur.role),
      departments: u.departments.map(ud => ud.department),
      profilePicture: u.profilePicture,
      createdAt: u.createdAt,
    }));

    res.json({
      data: result,
      pagination: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Single user details
router.get('/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        staff: true,
        patient: true,
        roles: { include: { role: true } },
        departments: { include: { department: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      isActive: user.isActive,
      role: user.role,
      firstName: user.patient?.firstName || user.staff?.firstName || '',
      lastName: user.patient?.lastName || user.staff?.lastName || '',
      profilePicture: user.profilePicture,
      staffDetails: user.staff,
      patientDetails: user.patient,
      roles: user.roles.map(ur => ur.role),
      departments: user.departments.map(ud => ud.department),
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

// Admin create user account (Temporary password & first-login required flag)
router.post('/', authMiddleware, async (req: any, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existingUsername = await prisma.user.findUnique({ where: { username: data.username } });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    if (data.employeeId) {
      const existingEmp = await prisma.staff.findUnique({ where: { employeeId: data.employeeId } });
      if (existingEmp) {
        return res.status(400).json({ message: 'Staff ID / Employee ID is already registered' });
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const newUser = await tx.user.create({
        data: {
          username: data.username,
          email: data.email,
          passwordHash: hashedPassword,
          isTemporaryPassword: true, // Requires password change on first login
          isActive: true,
          role: (data.role as any) || 'STAFF',
        },
      });

      // 2. Create Staff details
      await tx.staff.create({
        data: {
          userId: newUser.id,
          employeeId: data.employeeId || `EMP-${Date.now().toString().substring(6)}`,
          firstName: data.firstName,
          lastName: data.lastName,
          isActive: true,
        },
      });

      // 3. Associate Roles
      for (const roleId of data.roles) {
        await tx.userRoleMapping.create({
          data: {
            userId: newUser.id,
            roleId,
          },
        });
      }

      // 4. Associate Departments
      for (const departmentId of data.departments) {
        await tx.userDepartment.create({
          data: {
            userId: newUser.id,
            departmentId,
          },
        });
      }

      return newUser;
    });

    await logAudit({
      userId: req.user.userId,
      action: 'user.create',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { username: user.username, email: user.email, roles: data.roles, departments: data.departments },
    });

    res.status(201).json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    next(error);
  }
});

// Admin update user
router.put('/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const userId = req.params.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { staff: true, patient: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check Staff ID uniqueness if it has changed
    if (data.employeeId && user.staff && data.employeeId !== user.staff.employeeId) {
      const existingEmp = await prisma.staff.findUnique({ where: { employeeId: data.employeeId } });
      if (existingEmp) {
        return res.status(400).json({ message: 'Staff ID / Employee ID is already registered' });
      }
      const existingUser = await prisma.user.findUnique({ where: { username: data.employeeId } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'Username matching this Staff ID is already taken' });
      }
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update User table
      const u = await tx.user.update({
        where: { id: userId },
        data: {
          email: data.email,
          isActive: data.isActive !== undefined ? data.isActive : undefined,
          username: (data.employeeId && user.staff) ? data.employeeId : undefined,
        },
      });

      // Update Staff details
      if (user.staff) {
        await tx.staff.update({
          where: { userId },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            designation: data.designation,
            specialization: data.specialization,
            licenseNumber: data.licenseNumber,
            employeeId: data.employeeId || undefined,
          },
        });
      }

      // Update Patient details
      if (user.patient) {
        await tx.patient.update({
          where: { userId },
          data: {
            firstName: data.firstName || user.patient.firstName,
            lastName: data.lastName || user.patient.lastName,
          },
        });
      }

      // Update Roles if provided
      if (data.roles) {
        await tx.userRoleMapping.deleteMany({ where: { userId } });
        for (const roleId of data.roles) {
          await tx.userRoleMapping.create({
            data: { userId, roleId },
          });
        }
      }

      // Update Departments if provided
      if (data.departments) {
        // Track transfer history
        const currentDepts = await tx.userDepartment.findMany({ where: { userId } });
        const oldDeptId = currentDepts.length > 0 ? currentDepts[0].departmentId : null;
        
        await tx.userDepartment.deleteMany({ where: { userId } });
        for (const departmentId of data.departments) {
          await tx.userDepartment.create({
            data: { userId, departmentId },
          });
          
          if (oldDeptId !== departmentId) {
            await tx.departmentHistory.create({
              data: {
                userId,
                oldDepartmentId: oldDeptId,
                newDepartmentId: departmentId,
                justification: 'Admin-initiated transfer',
              },
            });
          }
        }
      }

      return u;
    });

    await logAudit({
      userId: req.user.userId,
      action: 'user.update',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: data,
    });

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Admin Deactivate/Reactivate
router.post('/:id/status', authMiddleware, async (req: any, res, next) => {
  try {
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const userId = req.params.id;

    if (userId === req.user.userId) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    // Invalidate sessions on deactivation
    if (!isActive) {
      await prisma.refreshToken.deleteMany({ where: { userId } });
    }

    await logAudit({
      userId: req.user.userId,
      action: isActive ? 'user.reactivate' : 'user.deactivate',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: `Account has been ${isActive ? 'reactivated' : 'deactivated'}` });
  } catch (error) {
    next(error);
  }
});

// Admin Password Reset
router.post('/:id/reset-password', authMiddleware, async (req: any, res, next) => {
  try {
    const { newPassword } = z.object({ newPassword: z.string().min(8) }).parse(req.body);
    const userId = req.params.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: hashedPassword,
          isTemporaryPassword: true, // Forces change on login
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.refreshToken.deleteMany({ where: { userId } }),
      prisma.passwordHistory.create({
        data: { userId, passwordHash: user.passwordHash }
      })
    ]);

    await logAudit({
      userId: req.user.userId,
      action: 'user.admin_password_reset',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'Password reset successful. User must change password at next login.' });
  } catch (error) {
    next(error);
  }
});

// Profile image upload
router.post('/:id/profile-picture', authMiddleware, upload.single('avatar'), async (req: any, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imageUrl = `/uploads/avatars/${req.file.filename}`;
    const userId = req.params.id;

    await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: imageUrl },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'user.profile_picture_updated',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, profilePicture: imageUrl });
  } catch (error) {
    next(error);
  }
});

// Delete user account (Prevention check if historical records exist)
router.delete('/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.params.id;

    if (userId === req.user.userId) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patient: {
          include: {
            appointments: true,
            encounters: true,
            invoices: true,
          },
        },
        staff: {
          include: {
            appointments: true,
            encounters: true,
          },
        },
        auditLogs: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for historical records
    const patientRecords = user.patient ? (user.patient.appointments.length + user.patient.encounters.length + user.patient.invoices.length) : 0;
    const staffRecords = user.staff ? (user.staff.appointments.length + user.staff.encounters.length) : 0;
    const auditRecords = user.auditLogs.length;

    if (patientRecords > 0 || staffRecords > 0 || auditRecords > 0) {
      return res.status(400).json({
        message: 'Account deletion is prohibited because historical clinical or audit logs exist. Deactivate the account instead to secure records.',
        code: 'HISTORICAL_RECORDS_EXIST',
      });
    }

    // Perform Delete
    await prisma.user.delete({ where: { id: userId } });

    await logAudit({
      userId: req.user.userId,
      action: 'user.delete',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { username: user.username },
    });

    res.json({ success: true, message: 'User account deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
