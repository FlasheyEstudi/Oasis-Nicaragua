import { db } from '../db';
import { hashPassword, verifyPassword } from '../auth/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken, generateResetToken, verifyResetToken, AccessTokenPayload } from '../auth/jwt';
import { encryptSecret, decryptSecret } from '../auth/crypto';
import { createAuditLog } from './audit.service';
import { registerUser } from './user-registration.service';
import { authenticator } from 'otplib';
import crypto from 'crypto';

/**
 * Login principal
 */
export async function login(email: string, password: string, ipAddress?: string, userAgent?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      doctorProfile: true,
      receptionistProfile: true,
      pharmacyManagerProfile: true,
      deliveryDriverProfile: true,
      twoFactorSessions: { where: { isActive: true } }
    }
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) throw new Error('INVALID_CREDENTIALS');
  if (!user.isActive) throw new Error('USER_INACTIVE');

  // Si tiene 2FA activo, requerimos verificación
  if (user.twoFactorSessions.length > 0) {
    const session = user.twoFactorSessions[0];
    if (session.lockedUntil && session.lockedUntil > new Date()) throw new Error('2FA_LOCKED');
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, twoFactorRequired: true };
  }

  // Login directo si no tiene 2FA
  const payload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    clinicId: user.doctorProfile?.clinicId || user.receptionistProfile?.clinicId || undefined,
    pharmacyId: user.pharmacyManagerProfile?.pharmacyId || user.deliveryDriverProfile?.pharmacyId || undefined,
    is2faVerified: false
  };

  const access_token = signAccessToken(payload);
  const refresh_token = signRefreshToken(payload);
  const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
  
  try {
    await createAuditLog({ userId: user.id, action: 'login', entityType: 'user', entityId: user.id, ipAddress, userAgent });
  } catch (err) {
    console.error('Audit log failed during login:', err);
  }

  const { passwordHash: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, access_token, refresh_token };
}

/**
 * Inicializar Setup de 2FA
 */
export async function setup2FA(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');

  const secret = authenticator.generateSecret();
  const encryptedSecret = encryptSecret(secret);

  // Crear o actualizar sesión 2FA (inactiva hasta confirmación)
  await db.twoFactorSession.deleteMany({ where: { userId } });
  await db.twoFactorSession.create({
    data: {
      userId,
      secret: encryptedSecret,
      isActive: false
    }
  });

  const otpauthUrl = authenticator.keyuri(user.email, process.env['2FA_ISSUER'] || 'Oasis Nicaragua', secret);
  return { secret, qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}` };
}

/**
 * Confirmar/Activar 2FA
 */
export async function confirm2FA(userId: string, code: string) {
  const session = await db.twoFactorSession.findFirst({ where: { userId, isActive: false } });
  if (!session) throw new Error('NO_PENDING_2FA');

  const decryptedSecret = decryptSecret(session.secret);
  if (!authenticator.verify({ token: code, secret: decryptedSecret })) return { success: false };

  await db.twoFactorSession.update({ where: { id: session.id }, data: { isActive: true } });
  return { success: true };
}

/**
 * Verificar código 2FA en el Login
 */
export async function verify2FA(userId: string, code: string, ipAddress?: string, userAgent?: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      doctorProfile: true,
      receptionistProfile: true,
      pharmacyManagerProfile: true,
      deliveryDriverProfile: true,
      twoFactorSessions: { where: { isActive: true } }
    }
  });

  if (!user || user.twoFactorSessions.length === 0) throw new Error('2FA_NOT_ACTIVE');
  const session = user.twoFactorSessions[0];

  if (session.lockedUntil && session.lockedUntil > new Date()) throw new Error('2FA_LOCKED');

  const decryptedSecret = decryptSecret(session.secret);
  const isValid = authenticator.verify({ token: code, secret: decryptedSecret });

  if (!isValid) {
    const attempts = session.attempts + 1;
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await db.twoFactorSession.update({
      where: { id: session.id },
      data: { attempts, ...(lockedUntil && { lockedUntil }) }
    });
    throw new Error('INVALID_2FA_CODE');
  }

  // Restablecer intentos y generar tokens
  await db.twoFactorSession.update({ where: { id: session.id }, data: { attempts: 0, lockedUntil: null } });

  const payload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    clinicId: user.doctorProfile?.clinicId || user.receptionistProfile?.clinicId || undefined,
    pharmacyId: user.pharmacyManagerProfile?.pharmacyId || user.deliveryDriverProfile?.pharmacyId || undefined,
    is2faVerified: true // Bandera 2FA verificada
  };

  const access_token = signAccessToken(payload);
  const refresh_token = signRefreshToken(payload);
  const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  try {
    await createAuditLog({ userId: user.id, action: 'login_2fa', entityType: 'user', entityId: user.id, ipAddress, userAgent });
  } catch (err) {
    console.error('Audit log failed during 2FA login:', err);
  }

  const { passwordHash: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, access_token, refresh_token };
}

/**
 * Rotación de Refresh Tokens
 */
export async function refreshTokens(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) throw new Error('TOKEN_INVALID');

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const storedToken = await db.refreshToken.findUnique({ where: { tokenHash } });
  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) throw new Error('TOKEN_INVALID');

  await db.refreshToken.update({ where: { id: storedToken.id }, data: { revokedAt: new Date() } });

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { doctorProfile: true, receptionistProfile: true, pharmacyManagerProfile: true, deliveryDriverProfile: true }
  });
  if (!user || !user.isActive) throw new Error('USER_INACTIVE');

  const newPayload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    clinicId: user.doctorProfile?.clinicId || user.receptionistProfile?.clinicId || undefined,
    pharmacyId: user.pharmacyManagerProfile?.pharmacyId || user.deliveryDriverProfile?.pharmacyId || undefined,
    is2faVerified: payload.is2faVerified
  };

  const access_token = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);
  const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.refreshToken.create({ data: { userId: user.id, tokenHash: newTokenHash, expiresAt } });
  return { access_token, refresh_token: newRefreshToken };
}
