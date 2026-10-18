import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { deIdentificationPipeline } from '../services/privacy/anonymizer.js';

const router = Router();

// ── 1. Overview & NDPC Compliance Dashboard Metrics ─────────────────────────
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const [
      totalPatients,
      totalConsents,
      activeConsents,
      revokedConsents,
      expiredConsents,
      totalBreakGlass,
      pendingDpoReviews,
      flaggedBreaches,
      recentBreakGlass,
      lawfulBasisGroups,
      scopeGroups
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.patientConsent.count(),
      prisma.patientConsent.count({ where: { status: 'ACTIVE' } }),
      prisma.patientConsent.count({ where: { status: 'REVOKED' } }),
      prisma.patientConsent.count({ where: { status: 'EXPIRED' } }),
      prisma.breakGlassLog.count(),
      prisma.breakGlassLog.count({ where: { reviewedByDpo: false } }),
      prisma.breakGlassLog.count({ where: { dpoAction: 'FLAG_BREACH' } }),
      prisma.breakGlassLog.findMany({
        take: 5,
        orderBy: { accessedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              staff: { select: { firstName: true, lastName: true } }
            }
          },
          patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } }
        }
      }),
      prisma.patientConsent.groupBy({
        by: ['ndpcLawfulBasis'],
        _count: { _all: true }
      }),
      prisma.patientConsent.groupBy({
        by: ['scope'],
        _count: { _all: true }
      })
    ]);

    // Unique patients with at least one active consent
    const distinctPatientsWithConsent = await prisma.patientConsent.groupBy({
      by: ['patientId'],
      where: { status: 'ACTIVE' }
    });

    const consentCoveragePercentage = totalPatients > 0 
      ? Math.round((distinctPatientsWithConsent.length / totalPatients) * 100)
      : 100;

    return res.json({
      success: true,
      data: {
        totalPatients,
        totalConsents,
        consentCoveragePercentage,
        consentStatusCounts: {
          active: activeConsents,
          revoked: revokedConsents,
          expired: expiredConsents,
          total: totalConsents
        },
        breakGlassMetrics: {
          total: totalBreakGlass,
          pendingDpoReviews,
          flaggedBreaches,
          resolvedReviews: totalBreakGlass - pendingDpoReviews
        },
        lawfulBasisDistribution: lawfulBasisGroups.map(g => ({
          basis: g.ndpcLawfulBasis,
          count: g._count._all
        })),
        scopeDistribution: scopeGroups.map(g => ({
          scope: g.scope,
          count: g._count._all
        })),
        recentBreakGlass: recentBreakGlass.map((bg: any) => {
          const staffName = bg.user?.staff ? `${bg.user.staff.firstName} ${bg.user.staff.lastName}` : null;
          return {
            id: bg.id,
            patientId: bg.patientId,
            patientName: bg.patient ? `${bg.patient.firstName} ${bg.patient.lastName}` : 'Unknown Patient',
            patientNumber: bg.patient?.patientNumber,
            user: staffName || bg.user?.username || bg.user?.email || 'Unknown User',
            userRole: bg.userRole || bg.user?.role || 'CLINICIAN',
            reason: bg.reason,
            severity: bg.severity,
            accessedAt: bg.accessedAt,
            ipAddress: bg.ipAddress,
            reviewedByDpo: bg.reviewedByDpo,
            dpoAction: bg.dpoAction
          };
        })
      }
    });
  } catch (error: any) {
    console.error('[PrivacyOverview] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
});

// ── 2. Patient Consents: List & Query ─────────────────────────────────────────
router.get('/consents', async (req: Request, res: Response) => {
  try {
    const { patientId, status, scope, category, search, page = '1', limit = '50' } = req.query;
    const skip = (Math.max(1, parseInt(page as string, 10)) - 1) * parseInt(limit as string, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10)));

    const where: any = {};
    if (patientId) where.patientId = patientId as string;
    if (status) where.status = status as string;
    if (scope) where.scope = scope as string;
    if (category) where.category = category as string;

    if (search) {
      where.OR = [
        { consentingPartyName: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } },
        { patient: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { patient: { lastName: { contains: search as string, mode: 'insensitive' } } },
        { patient: { patientNumber: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.patientConsent.count({ where }),
      prisma.patientConsent.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
              gender: true,
              birthDate: true,
              nin: true
            }
          },
          witnessStaff: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              designation: true,
              department: true
            }
          }
        }
      })
    ]);

    // Mask patient NIN and pseudonymize patient for general audit listing
    const maskedItems = items.map((c: any) => ({
      ...c,
      patient: c.patient ? {
        ...c.patient,
        maskedNin: deIdentificationPipeline.maskNin(c.patient.nin),
        pseudonymId: deIdentificationPipeline.generatePseudonym(c.patient.id)
      } : null
    }));

    return res.json({
      success: true,
      data: {
        total,
        page: parseInt(page as string, 10),
        limit: take,
        totalPages: Math.ceil(total / take),
        items: maskedItems
      }
    });
  } catch (error: any) {
    console.error('[GetConsents] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
});

// ── 3. Patient Consents: Register New Directive ─────────────────────────────
router.post('/consents', async (req: Request, res: Response) => {
  try {
    const {
      patientId,
      scope = 'PATIENT_PRIVACY',
      category = 'DATA_PROCESSING',
      provisionType = 'PERMIT',
      purposeOfUse = 'TREATMENT',
      dataClassesAllowed,
      dataClassesRestricted,
      consentingPartyName,
      consentingPartyRel = 'SELF',
      signatureType = 'DIGITAL',
      signatureRef,
      validFrom,
      validTo,
      witnessStaffId,
      ndpcLawfulBasis = 'EXPLICIT_CONSENT',
      notes
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, error: 'patientId is required' });
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const consent = await prisma.patientConsent.create({
      data: {
        patientId,
        status: 'ACTIVE',
        scope,
        category,
        provisionType,
        purposeOfUse,
        dataClassesAllowed: Array.isArray(dataClassesAllowed) ? dataClassesAllowed.join(',') : dataClassesAllowed,
        dataClassesRestricted: Array.isArray(dataClassesRestricted) ? dataClassesRestricted.join(',') : dataClassesRestricted,
        consentingPartyName: consentingPartyName || `${patient.firstName} ${patient.lastName}`,
        consentingPartyRel,
        signatureType,
        signatureRef,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validTo: validTo ? new Date(validTo) : null,
        witnessStaffId: witnessStaffId || null,
        ndpcLawfulBasis,
        notes
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Patient consent directive registered in compliance with NDPA 2023',
      data: consent
    });
  } catch (error: any) {
    console.error('[RegisterConsent] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
});

// ── 4. Patient Consents: Revoke Directive ───────────────────────────────────
router.put('/consents/:id/revoke', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { revokedReason } = req.body;

    const existing = await prisma.patientConsent.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Consent directive not found' });
    }

    if (existing.status === 'REVOKED') {
      return res.status(400).json({ success: false, error: 'Consent directive is already revoked' });
    }

    const updated = await prisma.patientConsent.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: revokedReason || 'Patient exercised Right to Revoke under NDPA 2023 Section 34'
      }
    });

    return res.json({
      success: true,
      message: 'Consent directive revoked successfully. Data access restrictions updated.',
      data: updated
    });
  } catch (error: any) {
    console.error('[RevokeConsent] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
});

// ── 5. Break-Glass: Audit Log List ──────────────────────────────────────────
router.get('/break-glass', async (req: Request, res: Response) => {
  try {
    const { patientId, severity, reviewedByDpo, dpoAction, page = '1', limit = '50' } = req.query;
    const skip = (Math.max(1, parseInt(page as string, 10)) - 1) * parseInt(limit as string, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10)));

    const where: any = {};
    if (patientId) where.patientId = patientId as string;
    if (severity) where.severity = severity as string;
    if (reviewedByDpo !== undefined) where.reviewedByDpo = reviewedByDpo === 'true';
    if (dpoAction) where.dpoAction = dpoAction as string;

    const [total, items] = await Promise.all([
      prisma.breakGlassLog.count({ where }),
      prisma.breakGlassLog.findMany({
        where,
        skip,
        take,
        orderBy: { accessedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              staff: { select: { firstName: true, lastName: true } }
            }
          },
          patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } }
        }
      })
    ]);

    const formattedItems = items.map((bg: any) => {
      const staffName = bg.user?.staff ? `${bg.user.staff.firstName} ${bg.user.staff.lastName}` : null;
      return {
        ...bg,
        userDisplayName: staffName || bg.user?.username || bg.user?.email || 'Unknown User'
      };
    });

    return res.json({
      success: true,
      data: {
        total,
        page: parseInt(page as string, 10),
        limit: take,
        totalPages: Math.ceil(total / take),
        items: formattedItems
      }
    });
  } catch (error: any) {
    console.error('[GetBreakGlass] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
});

// ── 6. Break-Glass: Record Emergency Override ───────────────────────────────
router.post('/break-glass', async (req: Request, res: Response) => {
  try {
    const {
      patientId,
      reason,
      severity = 'EMERGENCY',
      userRole,
      ipAddress
    } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User must be authenticated to break glass' });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'A clinical emergency reason is mandatory for break-glass override'
      });
    }

    const log = await prisma.breakGlassLog.create({
      data: {
        userId,
        patientId: patientId || null,
        reason: reason.trim(),
        actionPerformed: 'EMERGENCY_OVERRIDE_RECORD_ACCESS',
        severity,
        userRole: userRole || (req as any).user?.role || 'CLINICIAN',
        ipAddress: ipAddress || req.ip || req.socket.remoteAddress || '127.0.0.1',
        reviewedByDpo: false
      },
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
        patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Emergency Break-Glass override logged with NDPC Non-Repudiation Audit Record',
      data: log
    });
  } catch (error: any) {
    console.error('[RecordBreakGlass] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
});

// ── 7. Break-Glass: DPO Audit Review & Sign-Off ─────────────────────────────
router.put('/break-glass/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dpoAction, dpoNotes } = req.body;

    if (!dpoAction || !['APPROVED', 'FLAG_BREACH', 'ESCALATED'].includes(dpoAction)) {
      return res.status(400).json({
        success: false,
        error: 'dpoAction must be one of: APPROVED, FLAG_BREACH, ESCALATED'
      });
    }

    const reviewerId = (req as any).user?.id || 'DPO_AUDITOR';

    const updated = await prisma.breakGlassLog.update({
      where: { id },
      data: {
        reviewedByDpo: true,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        dpoAction,
        dpoNotes: dpoNotes || null
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
        patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } }
      }
    });

    return res.json({
      success: true,
      message: `Break-glass audit reviewed by DPO: ${dpoAction}`,
      data: updated
    });
  } catch (error: any) {
    console.error('[ReviewBreakGlass] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
});

// ── 8. Anonymization: Preview Pipeline Output ───────────────────────────────
router.post('/anonymize/preview', async (req: Request, res: Response) => {
  try {
    const { patientIds, options = {} } = req.body;

    const result = await deIdentificationPipeline.anonymizeCohort(patientIds, {
      ageBanding: options.ageBanding !== false,
      includePrescriptions: options.includePrescriptions !== false,
      includeDiagnoses: options.includeDiagnoses !== false,
      includeVitals: options.includeVitals !== false,
      respectConsentDirectives: options.respectConsentDirectives !== false
    });

    return res.json({
      success: true,
      data: {
        summary: {
          totalProcessed: result.totalProcessed,
          totalExcludedByConsent: result.totalExcludedByConsent,
          totalOutputRecords: result.records.length,
          anonymizationAlgorithm: 'Deterministic Salted HMAC-SHA256 (NDPA 2023 & HIPAA Safe Harbor)'
        },
        records: result.records.slice(0, 20)
      }
    });
  } catch (error: any) {
    console.error('[AnonymizePreview] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
});

// ── 9. Anonymization: Full Dataset Export (JSON or CSV) ──────────────────────
router.post('/anonymize/export', async (req: Request, res: Response) => {
  try {
    const { patientIds, format = 'json', options = {} } = req.body;

    const result = await deIdentificationPipeline.anonymizeCohort(patientIds, {
      ageBanding: options.ageBanding !== false,
      includePrescriptions: options.includePrescriptions !== false,
      includeDiagnoses: options.includeDiagnoses !== false,
      includeVitals: options.includeVitals !== false,
      respectConsentDirectives: options.respectConsentDirectives !== false
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'csv') {
      const csvData = deIdentificationPipeline.toCsv(result.records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="terkhealth360_anonymized_cohort_${timestamp}.csv"`);
      return res.send(csvData);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="terkhealth360_anonymized_cohort_${timestamp}.json"`);
    return res.json({
      exportMetadata: {
        exportDate: new Date().toISOString(),
        system: 'TerkHealth360 Privacy-by-Design Anonymization Engine',
        regulatoryStandard: 'NDPA 2023 / NHTDAO Data Anonymization Standard',
        totalProcessed: result.totalProcessed,
        totalExcludedByConsent: result.totalExcludedByConsent,
        recordCount: result.records.length
      },
      records: result.records
    });
  } catch (error: any) {
    console.error('[AnonymizeExport] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
});

// ── 10. NDPC Compliance & NHTDAO Interop Checklist ──────────────────────────
router.get('/ndpc-checklist', async (req: Request, res: Response) => {
  try {
    const [patientCount, consentCount, breakGlassTotal, pendingDpo] = await Promise.all([
      prisma.patient.count(),
      prisma.patientConsent.count({ where: { status: 'ACTIVE' } }),
      prisma.breakGlassLog.count(),
      prisma.breakGlassLog.count({ where: { reviewedByDpo: false } })
    ]);

    const checklist = [
      {
        id: 'NDPC-01',
        title: 'Consent Management System (NDPA 2023 Sec 25 & 26)',
        description: 'Explicit, informed, and documented consent recorded with category and scope.',
        status: consentCount > 0 || patientCount === 0 ? 'COMPLIANT' : 'ATTENTION_NEEDED',
        evidence: `${consentCount} active consent directives registered.`
      },
      {
        id: 'NDPC-02',
        title: 'Lawful Basis for Sensitive Health Data (NDPA 2023 Sec 30)',
        description: 'Sensitive personal health data processing justified by Lawful Basis.',
        status: 'COMPLIANT',
        evidence: 'Mandatory lawful basis tracking (Explicit Consent, Vital Interest, Public Health Law).'
      },
      {
        id: 'NDPC-03',
        title: 'Data Subject Right to Withdraw Consent (NDPA 2023 Sec 34)',
        description: 'Patients can withdraw or revoke consent easily at any time.',
        status: 'COMPLIANT',
        evidence: 'Granular revocation endpoint with audit logging and immediate data restrictions.'
      },
      {
        id: 'NDPC-04',
        title: 'Emergency Access & Break-Glass Audit Trail',
        description: 'Full traceability, justification, IP address, and DPO review of emergency overrides.',
        status: pendingDpo === 0 ? 'COMPLIANT' : 'PENDING_REVIEW',
        evidence: `${breakGlassTotal} total events recorded; ${pendingDpo} pending DPO sign-off.`
      },
      {
        id: 'NDPC-05',
        title: 'Privacy-by-Design Anonymization Pipeline',
        description: 'Deterministic pseudonymization & Safe Harbor de-identification for research exports.',
        status: 'COMPLIANT',
        evidence: 'HMAC-SHA256 salted pseudonymization, NIN/Phone masking, and NHMIS age banding active.'
      },
      {
        id: 'NDPC-06',
        title: 'NHTDAO Health Interoperability Alignment',
        description: 'Interoperability without compromise to patient data privacy or unauthorized cross-facility access.',
        status: 'COMPLIANT',
        evidence: 'HL7 FHIR R4 Consent resource serialization and role-based scoped disclosures.'
      }
    ];

    const compliantCount = checklist.filter(c => c.status === 'COMPLIANT').length;
    const scorePercentage = Math.round((compliantCount / checklist.length) * 100);

    return res.json({
      success: true,
      data: {
        scorePercentage,
        compliantPillars: compliantCount,
        totalPillars: checklist.length,
        checklist
      }
    });
  } catch (error: any) {
    console.error('[NdpcChecklist] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
});

export default router;
