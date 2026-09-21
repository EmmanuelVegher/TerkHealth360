import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Monnify API Service
// Docs: https://developers.monnify.com/api/
// ─────────────────────────────────────────────────────────────────────────────

const getMonnifyBaseUrl = () => process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com';
const getMonnifyApiKey  = () => process.env.MONNIFY_API_KEY  || '';
const getMonnifySecret  = () => process.env.MONNIFY_SECRET_KEY || '';
const getContractCode   = () => process.env.MONNIFY_CONTRACT_CODE || '';
const getPreferredBanks = () => (process.env.MONNIFY_PREFERRED_BANKS || '035,035A').split(',');

// ── Token Cache ───────────────────────────────────────────────────────────────
let _cachedToken: string | null = null;
let _tokenExpiry: number = 0;

/**
 * Authenticate with Monnify and return a Bearer token.
 * Tokens are cached for 55 minutes (they expire in 60 min).
 */
export async function getMonnifyToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const baseUrl = getMonnifyBaseUrl();
  const apiKey = getMonnifyApiKey();
  const secret = getMonnifySecret();

  if (!apiKey || !secret) {
    throw new Error('Monnify API Key or Secret Key is missing in environment variables');
  }

  const credentials = Buffer.from(`${apiKey}:${secret}`).toString('base64');
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let msg = text;
    try {
      const json = JSON.parse(text);
      if (json.responseCode === '99' || response.status === 401) {
        msg = 'Invalid Monnify API Key or Secret Key. Please update MONNIFY_API_KEY and MONNIFY_SECRET_KEY in backend/.env with your valid Monnify credentials.';
      } else if (json.responseMessage) {
        msg = json.responseMessage;
      }
    } catch {}
    throw new Error(`Monnify auth failed [${response.status}]: ${msg}`);
  }

  const data: any = await response.json();
  if (!data.requestSuccessful) {
    throw new Error(
      `Monnify auth error [Code ${data.responseCode || '99'}]: ${data.responseMessage || 'Invalid API Key or Secret Key'}`
    );
  }

  _cachedToken = data.responseBody.accessToken;
  _tokenExpiry = Date.now() + 55 * 60 * 1000; // 55 minutes
  return _cachedToken!;
}

/**
 * Make an authenticated request to the Monnify API.
 */
async function monnifyRequest(
  method: string,
  path: string,
  body?: object
): Promise<any> {
  const token = await getMonnifyToken();
  const url = `${getMonnifyBaseUrl()}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data: any = await response.json();

  if (!response.ok || !data.requestSuccessful) {
    throw new Error(
      `Monnify API error [${response.status}] ${path}: ${data.responseMessage || JSON.stringify(data)}`
    );
  }

  return data.responseBody;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESERVED (VIRTUAL) ACCOUNTS
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateReservedAccountParams {
  /** A unique reference that identifies this account on your system */
  accountReference: string;
  /** Full name of the account holder (patient name) */
  accountName: string;
  /** Patient email (can be hospital-generated placeholder) */
  customerEmail: string;
  /** Patient MRN / patient number */
  customerName: string;
  /** Bank codes to assign accounts on, e.g. ['035', '035A'] */
  preferredBanks?: string[];
  /** Patient BVN (11-digit Bank Verification Number) */
  bvn?: string;
  /** Patient NIN (11-digit National Identity Number) */
  nin?: string;
}

export interface ReservedAccountInfo {
  accountReference: string;
  accountName: string;
  currencyCode: string;
  contractCode: string;
  accounts: Array<{
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  }>;
  reservationReference: string;
  status: string;
}

/**
 * Create a Monnify Reserved (Virtual) Account for a patient.
 * Each patient gets their own dedicated bank account number(s).
 */
export async function createReservedAccount(
  params: CreateReservedAccountParams
): Promise<ReservedAccountInfo> {
  const body: any = {
    accountReference: params.accountReference,
    accountName: params.accountName,
    currencyCode: 'NGN',
    contractCode: getContractCode(),
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    preferredBanks: params.preferredBanks || getPreferredBanks(),
    getAllAvailableBanks: false,
    incomeSplitConfig: [],
    metaData: {},
  };

  if (params.bvn) {
    body.bvn = params.bvn;
  } else if (params.nin) {
    body.nin = params.nin;
  } else {
    // Monnify requirement: bvn or nin is required
    body.bvn = process.env.DEFAULT_MONNIFY_BVN || '22222222222';
  }

  return monnifyRequest('POST', '/api/v2/bank-transfer/reserved-accounts', body);
}

/**
 * Get reserved account details by accountReference.
 */
export async function getReservedAccount(accountReference: string): Promise<ReservedAccountInfo> {
  return monnifyRequest('GET', `/api/v2/bank-transfer/reserved-accounts/${accountReference}`);
}

/**
 * Get all transactions that came into a reserved account.
 */
export async function getReservedAccountTransactions(
  accountReference: string,
  page = 0,
  size = 50
): Promise<any> {
  return monnifyRequest(
    'GET',
    `/api/v1/bank-transfer/reserved-accounts/transactions?accountReference=${accountReference}&page=${page}&size=${size}`
  );
}

/**
 * Deallocate / deactivate a reserved account.
 */
export async function deallocateReservedAccount(accountReference: string): Promise<any> {
  return monnifyRequest('DELETE', `/api/v1/bank-transfer/reserved-accounts/reference/${accountReference}`);
}

/**
 * Verify a one-time payment transaction by reference.
 */
export async function verifyTransaction(transactionReference: string): Promise<any> {
  return monnifyRequest(
    'GET',
    `/api/v2/transactions/${encodeURIComponent(transactionReference)}`
  );
}

/**
 * Verify Monnify webhook signature.
 * Monnify sends a computed HMAC-SHA512 hash in the monnify-signature header.
 */
export function verifyWebhookSignature(
  rawBody: string,
  receivedHash: string
): boolean {
  const secretKey = process.env.MONNIFY_WEBHOOK_SECRET || getMonnifySecret();
  const computedHash = crypto
    .createHmac('sha512', secretKey)
    .update(rawBody)
    .digest('hex');
  return computedHash === receivedHash;
}

/**
 * Check if Monnify is properly configured (for status endpoint).
 */
export function isMonnifyConfigured(): boolean {
  return !!(getMonnifyApiKey() && getMonnifySecret() && getContractCode());
}

export { getMonnifyBaseUrl, getContractCode, getPreferredBanks };
