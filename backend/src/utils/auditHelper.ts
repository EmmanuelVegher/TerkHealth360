

import { prisma } from '../prisma.js';

export interface AuditParams {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: any;
}

export const logAudit = async (params: AuditParams): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        changes: params.changes || null,
      },
    });
  } catch (error) {
    console.error('Failed to log audit trail:', error);
  }
};
