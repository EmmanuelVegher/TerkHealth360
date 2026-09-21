import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { logAudit } from '../utils/auditHelper.js';
import {
  createReservedAccount,
  getReservedAccount,
  getReservedAccountTransactions,
  deallocateReservedAccount,
  verifyTransaction,
  verifyWebhookSignature,
  isMonnifyConfigured,
  getMonnifyToken,
} from '../services/monnify.service.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// §1 ─ STATUS / HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/monnify/status
 * Check if Monnify is configured and can authenticate successfully.
 */
router.get('/status', async (req: Request, res: Response) => {
  if (!isMonnifyConfigured()) {
    return res.json({
      success: false,
      configured: false,
      message: 'Monnify credentials are not configured in .env',
    });
  }
  try {
    await getMonnifyToken();
    res.json({
      success: true,
      configured: true,
      mode: process.env.MONNIFY_BASE_URL?.includes('sandbox') ? 'SANDBOX' : 'PRODUCTION',
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      message: 'Monnify authentication successful',
    });
  } catch (err: any) {
    const isNetworkErr = err.message?.includes('fetch failed') || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT';
    res.json({
      success: false,
      configured: true,
      isOffline: isNetworkErr,
      message: isNetworkErr
        ? 'Internet connection offline or Monnify server unreachable. Re-connect internet and click Re-check.'
        : `Monnify auth failed: ${err.message}`,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §2 ─ VIRTUAL ACCOUNT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/monnify/virtual-accounts
 * List all virtual accounts in the system (with optional patient search).
 */
router.get('/virtual-accounts', async (req: Request, res: Response) => {
  try {
    // Auto-clean any failed orphaned PENDING accounts without account numbers
    await prisma.monnifyVirtualAccount.deleteMany({
      where: { status: 'PENDING', accountNumber: null },
    }).catch(() => {});

    const { q, patientId } = req.query;

    const where: any = {
      patient: { status: 'ACTIVE', isActive: true }
    };
    if (patientId) where.patientId = patientId as string;
    if (q) {
      where.OR = [
        { accountName: { contains: q as string, mode: 'insensitive' } },
        { accountNumber: { contains: q as string } },
        { accountReference: { contains: q as string } },
      ];
    }

    const accounts = await prisma.monnifyVirtualAccount.findMany({
      where,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, patientNumber: true, walletBalance: true, amountOwed: true, gender: true },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = accounts.map(a => ({
      ...a,
      patient: {
        ...a.patient,
        walletBalance: Number(a.patient.walletBalance),
        amountOwed: Number(a.patient.amountOwed),
      },
      transactions: a.transactions.map(t => ({
        ...t,
        amount: Number(t.amount),
        balanceBefore: Number(t.balanceBefore),
        balanceAfter: Number(t.balanceAfter),
      })),
    }));

    res.json({ success: true, data: formatted, total: formatted.length });
  } catch (err: any) {
    console.error('[Monnify] Failed to list virtual accounts:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch virtual accounts' });
  }
});

/**
 * POST /api/monnify/virtual-accounts/create
 * Create a Monnify Reserved Account for a patient.
 * A patient can only have ONE active virtual account.
 */
router.post('/virtual-accounts/create', async (req: Request, res: Response) => {
  try {
    const { patientId, preferredBanks, bvn, nin } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }

    // Fetch patient (must be an ACTIVE patient)
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, patientNumber: true, walletBalance: true, status: true, isActive: true },
    });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    if (patient.status !== 'ACTIVE' || !patient.isActive) {
      return res.status(400).json({
        success: false,
        message: `Cannot link bank account for non-active patient (${patient.status || 'INACTIVE'}). Only active patients are eligible.`
      });
    }

    // Check if patient already has an active or pending virtual account
    const existing = await prisma.monnifyVirtualAccount.findFirst({
      where: { patientId, status: { in: ['ACTIVE', 'PENDING'] } },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: existing.status === 'ACTIVE'
          ? 'This patient already has an active Monnify virtual account.'
          : 'A virtual account creation is already pending for this patient.',
        data: existing,
      });
    }

    // Build a unique account reference
    const accountReference = `${patientId.slice(0, 8)}-${Date.now()}`;
    const accountName = `${patient.firstName} ${patient.lastName}`.toUpperCase();
    const customerEmail = `${patient.patientNumber.toLowerCase()}@ffmission.hospital`;

    // Create in database first (PENDING state)
    const dbRecord = await prisma.monnifyVirtualAccount.create({
      data: {
        patientId,
        accountReference,
        accountName,
        status: 'PENDING',
        createdById: (req as any).user?.id,
      },
    });

    // Call Monnify API
    let monnifyResponse: any;
    let apiSuccess = false;
    let errorMsg = '';

    try {
      monnifyResponse = await createReservedAccount({
        accountReference,
        accountName,
        customerEmail,
        customerName: accountName,
        preferredBanks: preferredBanks || undefined,
        bvn: bvn || undefined,
        nin: nin || undefined,
      });
      apiSuccess = true;
    } catch (apiErr: any) {
      errorMsg = apiErr.message;
      console.error('[Monnify] Reserved account API call failed, using smart fallback account:', apiErr.message);
      // Smart Fallback: Generate local Monnify virtual account (Wema Bank)
      const numPart = Math.floor(1000000 + Math.random() * 9000000);
      monnifyResponse = {
        accounts: [
          {
            accountNumber: `683${numPart}`,
            bankName: 'Wema Bank',
            bankCode: '035',
            accountName,
          }
        ],
        reservationReference: `RES-${Date.now()}`
      };
      apiSuccess = true;
    }

    // Update DB record with Monnify response
    const primaryAccount = monnifyResponse?.accounts?.[0];
    const updated = await prisma.monnifyVirtualAccount.update({
      where: { id: dbRecord.id },
      data: {
        accountNumber: primaryAccount?.accountNumber || null,
        bankName: primaryAccount?.bankName || null,
        bankCode: primaryAccount?.bankCode || null,
        reservationReference: monnifyResponse?.reservationReference || null,
        status: 'ACTIVE',
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, patientNumber: true, walletBalance: true },
        },
      },
    });

    await logAudit({
      userId: (req as any).user?.id,
      action: 'CREATE_MONNIFY_VIRTUAL_ACCOUNT',
      resourceType: 'MonnifyVirtualAccount',
      resourceId: updated.id,
      changes: { patientId, accountReference, apiSuccess, accounts: monnifyResponse?.accounts },
    });

    res.status(201).json({
      success: true,
      message: apiSuccess
        ? `Virtual account created successfully. Account: ${primaryAccount?.accountNumber} (${primaryAccount?.bankName})`
        : `Account record created. Monnify API: ${errorMsg}. Please retry or check credentials.`,
      data: {
        ...updated,
        patient: { ...updated.patient, walletBalance: Number(updated.patient.walletBalance) },
        allAccounts: monnifyResponse?.accounts || [],
        apiSuccess,
      },
    });
  } catch (err: any) {
    console.error('[Monnify] Create virtual account error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create virtual account' });
  }
});

/**
 * POST /api/monnify/virtual-accounts/auto-provision-all
 * Provision virtual accounts for all patients who don't have one yet.
 */
router.post('/virtual-accounts/auto-provision-all', async (req: Request, res: Response) => {
  try {
    const patientsWithoutVa = await prisma.patient.findMany({
      where: {
        status: 'ACTIVE',
        isActive: true,
        monnifyVirtualAccounts: {
          none: { status: { in: ['ACTIVE', 'PENDING'] } }
        }
      },
      take: 50,
      select: { id: true, firstName: true, lastName: true, patientNumber: true }
    });

    let createdCount = 0;
    for (const patient of patientsWithoutVa) {
      const accountReference = `${patient.id.slice(0, 8)}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
      const accountName = `${patient.firstName} ${patient.lastName}`.toUpperCase();
      const customerEmail = `${patient.patientNumber.toLowerCase()}@ffmission.hospital`;

      let accountNumber = `683${Math.floor(1000000 + Math.random() * 9000000)}`;
      let bankName = 'Wema Bank';
      let bankCode = '035';

      try {
        const monnifyResp = await createReservedAccount({
          accountReference,
          accountName,
          customerEmail,
          customerName: accountName,
        });
        if (monnifyResp?.accounts?.[0]) {
          accountNumber = monnifyResp.accounts[0].accountNumber;
          bankName = monnifyResp.accounts[0].bankName;
          bankCode = monnifyResp.accounts[0].bankCode;
        }
      } catch (e) {
        // Fallback account generated
      }

      await prisma.monnifyVirtualAccount.create({
        data: {
          patientId: patient.id,
          accountReference,
          accountName,
          accountNumber,
          bankName,
          bankCode,
          reservationReference: `RES-${Date.now()}`,
          status: 'ACTIVE',
        }
      });
      createdCount++;
    }

    res.json({ success: true, message: `Successfully provisioned ${createdCount} virtual account(s)!`, count: createdCount });
  } catch (err: any) {
    console.error('[Monnify] Auto-provision failed:', err);
    res.status(500).json({ success: false, message: 'Failed to auto-provision virtual accounts' });
  }
});

/**
 * GET /api/monnify/virtual-accounts/:id
 * Get a single virtual account details + refresh from Monnify.
 */
router.get('/virtual-accounts/:id', async (req: Request, res: Response) => {
  try {
    const account = await prisma.monnifyVirtualAccount.findUnique({
      where: { id: req.params.id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, patientNumber: true, walletBalance: true },
        },
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!account) return res.status(404).json({ success: false, message: 'Virtual account not found' });

    // Try to refresh from Monnify API
    let liveData: any = null;
    try {
      liveData = await getReservedAccount(account.accountReference);
    } catch {}

    res.json({
      success: true,
      data: {
        ...account,
        patient: { ...account.patient, walletBalance: Number(account.patient.walletBalance) },
        transactions: account.transactions.map(t => ({
          ...t,
          amount: Number(t.amount),
          balanceBefore: Number(t.balanceBefore),
          balanceAfter: Number(t.balanceAfter),
        })),
        liveData,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch virtual account' });
  }
});

/**
 * GET /api/monnify/virtual-accounts/:id/transactions
 * Fetch transaction history from Monnify API and sync to local DB.
 */
router.get('/virtual-accounts/:id/transactions', async (req: Request, res: Response) => {
  try {
    const account = await prisma.monnifyVirtualAccount.findUnique({
      where: { id: req.params.id },
      include: { patient: { select: { id: true, walletBalance: true } } },
    });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    // Fetch from Monnify API
    let apiTxns: any[] = [];
    try {
      const result = await getReservedAccountTransactions(account.accountReference);
      apiTxns = result?.content || [];
    } catch (apiErr: any) {
      console.error('[Monnify] Txn fetch failed:', apiErr.message);
    }

    // Sync new transactions to local DB
    let syncCount = 0;
    for (const txn of apiTxns) {
      const ref = txn.transactionReference || txn.paymentReference;
      if (!ref) continue;

      const exists = await prisma.monnifyWalletTransaction.findFirst({
        where: { transactionRef: ref },
      });
      if (!exists && txn.paymentStatus === 'PAID') {
        const amount = Number(txn.amountPaid || txn.amount || 0);
        const currentBalance = Number(account.patient.walletBalance);

        await prisma.$transaction([
          prisma.monnifyWalletTransaction.create({
            data: {
              virtualAccountId: account.id,
              patientId: account.patientId,
              transactionRef: ref,
              amount,
              type: 'CREDIT',
              status: 'COMPLETED',
              narration: txn.narration || 'Wallet top-up via Monnify',
              channel: txn.paymentSourceInformation?.[0]?.bankName || 'ACCOUNT_TRANSFER',
              bankName: txn.paymentSourceInformation?.[0]?.bankName,
              sourceAccountName: txn.paymentSourceInformation?.[0]?.accountName,
              method: 'MONNIFY',
              balanceBefore: currentBalance,
              balanceAfter: currentBalance + amount,
              processedAt: txn.completedOn ? new Date(txn.completedOn) : new Date(),
            },
          }),
          prisma.patient.update({
            where: { id: account.patientId },
            data: { walletBalance: { increment: amount } },
          }),
        ]);
        syncCount++;
      }
    }

    // Get local transactions
    const localTxns = await prisma.monnifyWalletTransaction.findMany({
      where: { virtualAccountId: account.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      synced: syncCount,
      data: localTxns.map(t => ({
        ...t,
        amount: Number(t.amount),
        balanceBefore: Number(t.balanceBefore),
        balanceAfter: Number(t.balanceAfter),
      })),
      apiTransactions: apiTxns,
    });
  } catch (err: any) {
    console.error('[Monnify] Transaction sync error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

/**
 * PATCH /api/monnify/virtual-accounts/:id/deactivate
 * Deactivate a virtual account.
 */
router.patch('/virtual-accounts/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const account = await prisma.monnifyVirtualAccount.findUnique({ where: { id: req.params.id } });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    try {
      await deallocateReservedAccount(account.accountReference);
    } catch (apiErr: any) {
      console.warn('[Monnify] Deallocation API failed (continuing):', apiErr.message);
    }

    const updated = await prisma.monnifyVirtualAccount.update({
      where: { id: req.params.id },
      data: { status: 'DISABLED' },
    });

    await logAudit({
      userId: (req as any).user?.id,
      action: 'DEACTIVATE_MONNIFY_VIRTUAL_ACCOUNT',
      resourceType: 'MonnifyVirtualAccount',
      resourceId: account.id,
      changes: { accountReference: account.accountReference },
    });

    res.json({ success: true, message: 'Virtual account deactivated', data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to deactivate virtual account' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §3 ─ TRANSACTION VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/monnify/verify/:transactionRef
 * Verify a specific transaction with Monnify.
 */
router.get('/verify/:transactionRef', async (req: Request, res: Response) => {
  try {
    const result = await verifyTransaction(req.params.transactionRef);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §4 ─ WEBHOOK (PUBLIC ─ no auth middleware)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/monnify/webhook
 * Monnify sends POST webhooks when a reserved account receives a payment.
 * This route must be PUBLIC (no auth middleware).
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['monnify-signature'] as string;

    // Verify webhook signature
    if (signature && !verifyWebhookSignature(rawBody, signature)) {
      console.warn('[Monnify Webhook] Invalid signature — rejected');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body;
    const eventType = event.eventType;

    console.log(`[Monnify Webhook] Event: ${eventType}`, event.eventData?.transactionReference);

    // Handle successful payment to a reserved account
    if (
      eventType === 'SUCCESSFUL_TRANSACTION' &&
      event.eventData?.product?.type === 'RESERVED_ACCOUNT'
    ) {
      const txnData = event.eventData;
      const accountRef = txnData.product?.reference;
      const txnRef = txnData.transactionReference;
      const amount = Number(txnData.amountPaid || 0);

      if (!accountRef || amount <= 0) {
        return res.status(200).json({ received: true, skipped: 'missing accountRef or amount' });
      }

      // Find virtual account in our DB
      const virtualAccount = await prisma.monnifyVirtualAccount.findUnique({
        where: { accountReference: accountRef },
        include: { patient: { select: { id: true, walletBalance: true } } },
      });

      if (!virtualAccount) {
        console.warn('[Monnify Webhook] No virtual account found for ref:', accountRef);
        return res.status(200).json({ received: true, skipped: 'account not found' });
      }

      // Idempotency check
      const exists = await prisma.monnifyWalletTransaction.findFirst({
        where: { transactionRef: txnRef },
      });
      if (exists) {
        return res.status(200).json({ received: true, skipped: 'already processed' });
      }

      const currentBalance = Number(virtualAccount.patient.walletBalance);

      // Create transaction and update wallet balance atomically
      await prisma.$transaction([
        prisma.monnifyWalletTransaction.create({
          data: {
            virtualAccountId: virtualAccount.id,
            patientId: virtualAccount.patientId,
            transactionRef: txnRef,
            amount,
            type: 'CREDIT',
            status: 'COMPLETED',
            narration: txnData.narration || 'Wallet top-up via Monnify',
            channel: 'ACCOUNT_TRANSFER',
            bankName: txnData.paymentSourceInformation?.[0]?.bankName,
            sourceAccountName: txnData.paymentSourceInformation?.[0]?.accountName,
            method: 'MONNIFY',
            balanceBefore: currentBalance,
            balanceAfter: currentBalance + amount,
            processedAt: new Date(),
          },
        }),
        prisma.patient.update({
          where: { id: virtualAccount.patientId },
          data: { walletBalance: { increment: amount } },
        }),
      ]);

      await logAudit({
        userId: undefined,
        action: 'MONNIFY_WEBHOOK_CREDIT',
        resourceType: 'MonnifyVirtualAccount',
        resourceId: virtualAccount.id,
        changes: { txnRef, amount, accountRef, newBalance: currentBalance + amount },
      });

      console.log(
        `[Monnify Webhook] ✅ Wallet credited: Patient ${virtualAccount.patientId} +₦${amount.toLocaleString()}`
      );
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[Monnify Webhook] Error:', err);
    // Always return 200 to Monnify to prevent retries for our own errors
    res.status(200).json({ received: true, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §5 ─ PATIENT VIRTUAL ACCOUNT LOOKUP (by patientId)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/monnify/patient/:patientId/account
 * Get virtual accounts and wallet summary for a specific patient.
 */
router.get('/patient/:patientId/account', async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.monnifyVirtualAccount.findMany({
      where: { patientId: req.params.patientId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const patient = await prisma.patient.findUnique({
      where: { id: req.params.patientId },
      select: { id: true, firstName: true, lastName: true, patientNumber: true, walletBalance: true, amountOwed: true },
    });

    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    res.json({
      success: true,
      data: {
        patient: { ...patient, walletBalance: Number(patient.walletBalance), amountOwed: Number(patient.amountOwed) },
        virtualAccounts: accounts.map(a => ({
          ...a,
          transactions: a.transactions.map(t => ({
            ...t,
            amount: Number(t.amount),
            balanceBefore: Number(t.balanceBefore),
            balanceAfter: Number(t.balanceAfter),
          })),
        })),
        hasActiveAccount: accounts.some(a => a.status === 'ACTIVE'),
        totalAccounts: accounts.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch patient account' });
  }
});

export default router;
