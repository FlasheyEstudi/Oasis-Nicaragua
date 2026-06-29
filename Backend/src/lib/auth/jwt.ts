import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'oasis-access-secret-dev-32-chars-long-minimum';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'oasis-refresh-secret-dev-32-chars-long-minimum';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
  clinicId?: string;
  pharmacyId?: string;
  is2faVerified?: boolean;
}

export const signAccessToken = (payload: AccessTokenPayload) => jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
export const verifyAccessToken = (token: string) => {
  try { return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload; } catch { return null; }
};
export const signRefreshToken = (payload: AccessTokenPayload) => jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
export const verifyRefreshToken = (token: string) => {
  try { return jwt.verify(token, REFRESH_SECRET) as AccessTokenPayload; } catch { return null; }
};
export const generateResetToken = () => jwt.sign({ purpose: 'password_reset', timestamp: Date.now() }, ACCESS_SECRET, { expiresIn: '1h' });
export const verifyResetToken = (token: string) => {
  try { return { valid: (jwt.verify(token, ACCESS_SECRET) as any).purpose === 'password_reset' }; } catch { return { valid: false }; }
};
