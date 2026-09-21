import { Router } from 'express';

import { authMiddleware } from '../middleware/auth.js';

const router = Router();
import { prisma } from '../prisma.js';

// List audit logs with pagination and advanced filtering
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { action, resourceType, userId, startDate, endDate, page = '1', limit = '50' } = req.query;
    
    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 50;
    const skip = (p - 1) * l;

    const where: any = {};

    if (action) {
      where.action = { contains: action as string };
    }
    if (resourceType) {
      where.resourceType = resourceType as string;
    }
    if (userId) {
      where.userId = userId as string;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { username: true, email: true, staff: { select: { firstName: true, lastName: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: logs,
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

// Export logs as CSV format
router.get('/export', authMiddleware, async (req, res, next) => {
  try {
    const { action, resourceType, userId, startDate, endDate } = req.query;

    const where: any = {};

    if (action) {
      where.action = { contains: action as string };
    }
    if (resourceType) {
      where.resourceType = resourceType as string;
    }
    if (userId) {
      where.userId = userId as string;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV content
    const headers = ['ID', 'Date', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent', 'Changes'];
    const rows = logs.map(log => [
      log.id,
      log.createdAt.toISOString(),
      log.user ? log.user.username : 'System/Guest',
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.ipAddress || '',
      `"${(log.userAgent || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(log.changes || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
});

export default router;
