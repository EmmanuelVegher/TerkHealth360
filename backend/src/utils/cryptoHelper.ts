import crypto from 'crypto';

// ─── AES-256-GCM Encryption Helper for Hospital Communications ──────────────
// Derives a secure 32-byte key from environment or fallback with SHA-256
const MASTER_SECRET = process.env.MESSAGE_ENCRYPTION_KEY || process.env.JWT_SECRET || 'terkhealth360-hospital-secure-key-2026';
const DERIVED_KEY = crypto.createHash('sha256').update(MASTER_SECRET).digest();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const PREFIX = 'enc:v1:';

export interface EncryptedPayload {
  iv: string;
  authTag: string;
  content: string;
}

/**
 * Encrypts arbitrary text or serialized JSON using AES-256-GCM
 */
export function encryptMessage(plainText: string): string {
  if (!plainText) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, DERIVED_KEY, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return plainText; // Fallback to avoid dropping critical clinical data
  }
}

/**
 * Decrypts AES-256-GCM ciphertext back to plaintext
 */
export function decryptMessage(encryptedString: string): string {
  if (!encryptedString) return '';
  if (!encryptedString.startsWith(PREFIX)) {
    // If not encrypted with our prefix (e.g. legacy plain text), return as-is
    return encryptedString;
  }

  try {
    const raw = encryptedString.slice(PREFIX.length);
    const [ivHex, authTagHex, cipherHex] = raw.split(':');
    
    if (!ivHex || !authTagHex || !cipherHex) {
      return encryptedString;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, DERIVED_KEY, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed for ciphertext:', error);
    return '[Decryption failed: Secure key mismatch or corrupted message]';
  }
}

/**
 * Encrypts an entire message record (text & attachments) before storing
 */
export function secureMessageRecord(record: any): any {
  if (!record) return record;
  const clone = { ...record };

  if (clone.text) {
    clone.text = encryptMessage(clone.text);
  }

  if (clone.attachment && clone.attachment.dataUrl) {
    clone.attachment = {
      ...clone.attachment,
      dataUrl: encryptMessage(clone.attachment.dataUrl)
    };
  }

  clone._isEncrypted = true;
  return clone;
}

/**
 * Decrypts an entire message record before delivering to the client
 */
export function unsecureMessageRecord(record: any): any {
  if (!record) return record;
  const clone = { ...record };

  if (clone.text) {
    clone.text = decryptMessage(clone.text);
  }

  if (clone.attachment && clone.attachment.dataUrl) {
    clone.attachment = {
      ...clone.attachment,
      dataUrl: decryptMessage(clone.attachment.dataUrl)
    };
  }

  delete clone._isEncrypted;
  return clone;
}
