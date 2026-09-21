import { Router } from 'express';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';

const router = Router();
import { prisma } from '../prisma.js';

const roleSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  permissions: z.array(z.string()), // permission IDs
});

// List all roles
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    res.json(roles);
  } catch (error) {
    next(error);
  }
});

// List all permissions
router.get('/permissions', authMiddleware, async (req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany();
    res.json(permissions);
  } catch (error) {
    next(error);
  }
});

// Get Role-Permission matrix
router.get('/matrix', authMiddleware, async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          select: { permissionId: true },
        },
      },
    });
    const permissions = await prisma.permission.findMany();

    const matrix = roles.map(role => {
      const rolePerms = new Set(role.permissions.map(p => p.permissionId));
      const permissionsMap: Record<string, boolean> = {};
      permissions.forEach(p => {
        permissionsMap[p.code] = rolePerms.has(p.id);
      });
      return {
        roleId: role.id,
        roleName: role.name,
        permissions: permissionsMap,
      };
    });

    res.json({ matrix, permissions });
  } catch (error) {
    next(error);
  }
});

// Create role
router.post('/', authMiddleware, async (req: any, res, next) => {
  try {
    const { name, description, permissions } = roleSchema.parse(req.body);

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ message: 'Role name already exists' });
    }

    const role = await prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: { name, description },
      });

      for (const permissionId of permissions) {
        await tx.rolePermission.create({
          data: {
            roleId: newRole.id,
            permissionId,
          },
        });
      }

      return newRole;
    });

    await logAudit({
      userId: req.user.userId,
      action: 'role.create',
      resourceType: 'Role',
      resourceId: role.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { name, description, permissions },
    });

    res.status(201).json({ success: true, role });
  } catch (error) {
    next(error);
  }
});

// Update role and mappings
router.put('/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { name, description, permissions } = roleSchema.parse(req.body);
    const roleId = req.params.id;

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id: roleId },
        data: { name, description },
      });

      await tx.rolePermission.deleteMany({ where: { roleId } });
      for (const permissionId of permissions) {
        await tx.rolePermission.create({
          data: { roleId, permissionId },
        });
      }
    });

    await logAudit({
      userId: req.user.userId,
      action: 'role.update',
      resourceType: 'Role',
      resourceId: roleId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { name, description, permissions },
    });

    res.json({ success: true, message: 'Role updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete role
router.delete('/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const roleId = req.params.id;

    // Check if role is in use
    const mappingsCount = await prisma.userRoleMapping.count({ where: { roleId } });
    if (mappingsCount > 0) {
      return res.status(400).json({ message: 'Cannot delete role because it is currently assigned to users.' });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    await prisma.role.delete({ where: { id: roleId } });

    await logAudit({
      userId: req.user.userId,
      action: 'role.delete',
      resourceType: 'Role',
      resourceId: roleId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { name: role.name },
    });

    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Break Glass emergency authorization override
router.post('/break-glass', authMiddleware, async (req: any, res, next) => {
  try {
    const { reason, actionPerformed } = z.object({
      reason: z.string().min(5),
      actionPerformed: z.string().min(5),
    }).parse(req.body);

    const log = await prisma.breakGlassLog.create({
      data: {
        userId: req.user.userId,
        reason,
        actionPerformed,
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'security.break_glass',
      resourceType: 'BreakGlassLog',
      resourceId: log.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { reason, actionPerformed },
    });

    res.json({ success: true, message: 'Break Glass override authorized and recorded in security audits.' });
  } catch (error) {
    next(error);
  }
});

export default router;
