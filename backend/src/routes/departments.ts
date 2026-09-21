import { Router } from 'express';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';

const router = Router();
import { prisma } from '../prisma.js';

const departmentSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  headStaffId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const transferSchema = z.object({
  userId: z.string(),
  newDepartmentId: z.string(),
  justification: z.string().min(5),
});

// List all departments with member count
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    const result = departments.map(d => ({
      id: d.id,
      name: d.name,
      code: d.code,
      headStaffId: d.headStaffId,
      isActive: d.isActive,
      memberCount: d.members.length,
      createdAt: d.createdAt,
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Single department details
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const department = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            user: {
              include: { staff: true, patient: true },
            },
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json(department);
  } catch (error) {
    next(error);
  }
});

// Create department
router.post('/', authMiddleware, async (req: any, res, next) => {
  try {
    const { name, code, headStaffId, isActive } = departmentSchema.parse(req.body);

    const existing = await prisma.department.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ message: 'Department code already exists' });
    }

    const dept = await prisma.department.create({
      data: { name, code, headStaffId, isActive },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'department.create',
      resourceType: 'Department',
      resourceId: dept.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { name, code, headStaffId, isActive },
    });

    res.status(201).json({ success: true, department: dept });
  } catch (error) {
    next(error);
  }
});

// Update department
router.put('/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { name, code, headStaffId, isActive } = departmentSchema.parse(req.body);
    const id = req.params.id;

    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const updated = await prisma.department.update({
      where: { id },
      data: { name, code, headStaffId, isActive },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'department.update',
      resourceType: 'Department',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { name, code, headStaffId, isActive },
    });

    res.json({ success: true, department: updated });
  } catch (error) {
    next(error);
  }
});

// Delete department
router.delete('/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const id = req.params.id;

    // Check if department is in use
    const membersCount = await prisma.userDepartment.count({ where: { departmentId: id } });
    if (membersCount > 0) {
      return res.status(400).json({ message: 'Cannot delete department with active staff members. Transfer staff first.' });
    }

    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    await prisma.department.delete({ where: { id } });

    await logAudit({
      userId: req.user.userId,
      action: 'department.delete',
      resourceType: 'Department',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { code: dept.code },
    });

    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Transfer staff member and track history
router.post('/transfer', authMiddleware, async (req: any, res, next) => {
  try {
    const { userId, newDepartmentId, justification } = transferSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { departments: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newDept = await prisma.department.findUnique({ where: { id: newDepartmentId } });
    if (!newDept) {
      return res.status(404).json({ message: 'Target department not found' });
    }

    // Get previous department
    const oldDeptId = user.departments.length > 0 ? user.departments[0].departmentId : null;

    if (oldDeptId === newDepartmentId) {
      return res.status(400).json({ message: 'User is already in the target department' });
    }

    await prisma.$transaction(async (tx) => {
      // Remove old department associations
      await tx.userDepartment.deleteMany({ where: { userId } });

      // Associate with new department
      await tx.userDepartment.create({
        data: {
          userId,
          departmentId: newDepartmentId,
        },
      });

      // Write to department history log
      await tx.departmentHistory.create({
        data: {
          userId,
          oldDepartmentId: oldDeptId,
          newDepartmentId,
          justification,
        },
      });
      
      // Update Staff profile cache of department name
      if (user.role !== 'PATIENT') {
        await tx.staff.updateMany({
          where: { userId },
          data: { department: newDept.name },
        });
      }
    });

    await logAudit({
      userId: req.user.userId,
      action: 'department.transfer',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { oldDeptId, newDepartmentId, justification },
    });

    res.json({ success: true, message: 'Staff member transferred successfully' });
  } catch (error) {
    next(error);
  }
});

// Get user's department transfer history
router.get('/history/:userId', authMiddleware, async (req, res, next) => {
  try {
    const history = await prisma.departmentHistory.findMany({
      where: { userId: req.params.userId },
      include: {
        department: true,
      },
      orderBy: { transferredAt: 'desc' },
    });

    // Manually map old department names
    const result = await Promise.all(history.map(async h => {
      let oldDeptName = 'None / External';
      if (h.oldDepartmentId) {
        const oldDept = await prisma.department.findUnique({ where: { id: h.oldDepartmentId } });
        if (oldDept) oldDeptName = oldDept.name;
      }
      return {
        id: h.id,
        transferredAt: h.transferredAt,
        justification: h.justification,
        newDepartment: h.department.name,
        oldDepartment: oldDeptName,
      };
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
