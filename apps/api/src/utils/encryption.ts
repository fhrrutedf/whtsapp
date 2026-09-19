import crypto from 'crypto';

/**
 * AES-256-GCM Encryption Utility for Omnichannel Helpdesk
 * Derives a strict 32-byte key from ENCRYPTION_KEY or ENCRYPTION_SECRET.
 */
function getMasterKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.ENCRYPTION_SECRET ||
    'omni-32-char-encryption-secret!!';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts plaintext string using AES-256-GCM with 12-byte IV and 16-byte Auth Tag.
 * Output format: enc:gcm:{ivHex}:{authTagHex}:{cipherHex}
 */
export function encrypt(text: string | null | undefined): string | null {
  if (text === null || text === undefined || text === '') {
    return null;
  }
  if (typeof text === 'string' && text.startsWith('enc:gcm:')) {
    return text;
  }

  const iv = crypto.randomBytes(12);
  const key = getMasterKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `enc:gcm:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM payload.
 * If input is not encrypted (e.g. legacy plain string), returns it gracefully.
 */
export function decrypt(hash: string | null | undefined): string | null {
  if (hash === null || hash === undefined || hash === '') {
    return null;
  }
  if (typeof hash !== 'string' || !hash.startsWith('enc:gcm:')) {
    return hash;
  }

  try {
    const parts = hash.split(':');
    if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'gcm') {
      return hash;
    }

    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const encryptedHex = parts[4];

    const key = getMasterKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err: any) {
    console.warn('[Encryption] Failed to decrypt string, returning raw/null:', err.message);
    return hash;
  }
}
