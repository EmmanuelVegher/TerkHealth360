import { Router } from 'express';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';

const router = Router();
import { prisma } from '../prisma.js';

const createFamilySchema = z.object({
  headPatientId: z.string(),
  upgradeFeeAmount: z.number().optional().nullable(),
});

const addMemberSchema = z.object({
  patientId: z.string(),
  relationship: z.string(),
});

// Get all family accounts
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const families = await prisma.familyAccount.findMany({
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            patientNumber: true,
            familyRelationship: true,
          }
        }
      }
    });

    const formatted = families.map(f => {
      const head = f.members.find(m => m.id === f.headPatientId) || f.members[0];
      return {
        id: f.id,
        familyNumber: f.familyNumber,
        headPatientId: f.headPatientId,
        headName: head ? `${head.firstName} ${head.lastName}` : 'Unknown Head',
        headMrn: head ? head.patientNumber : 'N/A',
        membersCount: f.members.length,
      };
    });

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// Create Family account
router.post('/', authMiddleware, async (req: any, res, next) => {
  try {
    const { headPatientId, upgradeFeeAmount } = createFamilySchema.parse(req.body);

    const head = await prisma.patient.findUnique({ where: { id: headPatientId } });
    if (!head) {
      return res.status(404).json({ message: 'Family Head patient not found' });
    }

    // Generate FAN
    const count = await prisma.familyAccount.count();
    const fan = `FAN-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

    const family = await prisma.$transaction(async (tx) => {
      const acc = await tx.familyAccount.create({
        data: {
          familyNumber: fan,
          headPatientId,
        },
      });

      // Update patient profile to link to this account
      await tx.patient.update({
        where: { id: headPatientId },
        data: {
          familyAccountId: acc.id,
          familyRelationship: 'HEAD',
        },
      });

      // Create upgrade fee invoice if specified
      if (upgradeFeeAmount && upgradeFeeAmount > 0) {
        await tx.invoice.create({
          data: {
            patientId: headPatientId,
            status: 'ISSUED',
            total: upgradeFeeAmount,
            amountPaid: 0,
            reasonText: 'Registration Category Upgrade to Family Account (HEAD)',
          },
        });
      }

      return acc;
    });

    await logAudit({
      userId: req.user.userId,
      action: 'family.create',
      resourceType: 'FamilyAccount',
      resourceId: family.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { fan, headPatientId },
    });

    res.status(201).json({ success: true, family });
  } catch (error) {
    next(error);
  }
});

// Add member to family account
router.post('/:id/members', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId, relationship } = addMemberSchema.parse(req.body);
    const familyAccountId = req.params.id;

    const [family, patient] = await Promise.all([
      prisma.familyAccount.findUnique({ where: { id: familyAccountId } }),
      prisma.patient.findUnique({ where: { id: patientId } }),
    ]);

    if (!family || !patient) {
      return res.status(404).json({ message: 'Family account or Patient not found' });
    }

    await prisma.patient.update({
      where: { id: patientId },
      data: {
        familyAccountId,
        familyRelationship: relationship,
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'family.add_member',
      resourceType: 'FamilyAccount',
      resourceId: familyAccountId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { patientId, relationship },
    });

    res.json({ success: true, message: 'Member added to family account.' });
  } catch (error) {
    next(error);
  }
});

// Remove member from family account
router.delete('/:id/members/:memberId', authMiddleware, async (req: any, res, next) => {
  try {
    const familyAccountId = req.params.id;
    const memberId = req.params.memberId;

    const patient = await prisma.patient.findUnique({ where: { id: memberId } });
    if (!patient || patient.familyAccountId !== familyAccountId) {
      return res.status(400).json({ message: 'Patient is not linked to this family account' });
    }

    const family = await prisma.familyAccount.findUnique({ where: { id: familyAccountId } });
    if (family?.headPatientId === memberId) {
      return res.status(400).json({ message: 'Cannot remove the Family Head. Dissolve or reassign head first.' });
    }

    await prisma.patient.update({
      where: { id: memberId },
      data: {
        familyAccountId: null,
        familyRelationship: null,
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'family.remove_member',
      resourceType: 'FamilyAccount',
      resourceId: familyAccountId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { memberId },
    });

    res.json({ success: true, message: 'Member removed from family account successfully.' });
  } catch (error) {
    next(error);
  }
});

// Consolidated Family Dashboard Details
router.get('/:id/dashboard', authMiddleware, async (req, res, next) => {
  try {
    const family = await prisma.familyAccount.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            telecoms: true,
            invoices: true,
          },
        },
      },
    });

    if (!family) {
      return res.status(404).json({ message: 'Family account not found' });
    }

    // Consolidated outstanding balance calculation
    let totalOutstanding = 0;
    const membersData = family.members.map(m => {
      const outstanding = m.invoices
        .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
        .reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0);
      
      totalOutstanding += outstanding;
      const phone = m.telecoms.find(t => t.system === 'phone')?.value || 'N/A';

      return {
        id: m.id,
        mrn: m.patientNumber,
        name: `${m.firstName} ${m.lastName}`,
        relationship: m.familyRelationship,
        status: m.status,
        phone,
        outstandingBalance: outstanding,
      };
    });

    res.json({
      id: family.id,
      familyNumber: family.familyNumber,
      headPatientId: family.headPatientId,
      totalOutstandingBalance: totalOutstanding,
      members: membersData,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
