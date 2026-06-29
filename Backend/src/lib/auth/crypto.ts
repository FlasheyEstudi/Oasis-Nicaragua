import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'oasis-access-secret-dev-32-chars-long-minimum';
const getEncryptionKey = () => crypto.hkdfSync('sha256', ACCESS_SECRET, Buffer.alloc(0), Buffer.from('oasis-2fa-encryption-key-info'), 32);

export function encryptSecret(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted}`;
}

export function decryptSecret(encryptedData: string): string {
  const [ivHex, tagHex, encryptedHex] = encryptedData.split(':');
  if (!ivHex || !tagHex || !encryptedHex) throw new Error('Formato de datos cifrados inválido');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encryptedHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
}
