import { db } from '../db';
import { hashPassword } from '../auth/password';
import { signAccessToken, signRefreshToken, AccessTokenPayload } from '../auth/jwt';
import { createAuditLog } from './audit.service';
import crypto from 'crypto';

export async function registerUser(
  data: {
    name: string;
    email: string;
    passwordHash: string;
    role: string;
    pharmacyId?: string;
    clinicId?: string;
    vehicleType?: string;
    licensePlate?: string;
    invitationToken?: string;
    entityName?: string;
    entityAddress?: string;
    entityPhone?: string;
    entityLatitude?: number;
    entityLongitude?: number;
  },
  ipAddress?: string,
  userAgent?: string
) {
  const normalizedEmail = data.email.trim().toLowerCase();

  // 1. Validaciones previas
  if (await db.user.findUnique({ where: { email: normalizedEmail } })) throw new Error('EMAIL_EXISTS');

  if (data.role === 'admin') {
    if (!data.invitationToken) throw new Error('ADMIN_NOT_ALLOWED');
    const invitation = await db.invitation.findUnique({ where: { token: data.invitationToken } });
    if (!invitation || invitation.role !== 'admin' || invitation.isAccepted || invitation.expiresAt < new Date()) {
      throw new Error('INVALID_INVITATION_TOKEN');
    }
  }

  if (data.role !== 'patient' && data.role !== 'admin' && (data.pharmacyId || data.clinicId) && !data.invitationToken) {
    throw new Error('CANNOT_CLAIM_EXISTING_ENTITY_WITHOUT_INVITATION');
  }

  // 2. Registro transaccional
  const result = await db.$transaction(async (tx) => {
    const isOwner = ['pharmacy_admin', 'clinic_admin'].includes(data.role);
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: normalizedEmail,
        passwordHash: data.passwordHash,
        role: data.role,
        emailVerified: false,
        verificationStatus: isOwner ? 'pending' : 'approved',
        verificationDeadline: isOwner ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
      }
    });

    if (data.role === 'patient') {
      await tx.patientProfile.create({ data: { userId: user.id } });
    } else if (data.role === 'delivery_driver') {
      await tx.deliveryDriverProfile.create({
        data: {
          userId: user.id,
          pharmacyId: data.pharmacyId || null,
          vehicleType: data.vehicleType || 'motocicleta',
          licensePlate: data.licensePlate || null,
          isAvailable: true,
          employmentType: 'contractor',
        }
      });
    } else if (['pharmacy_admin', 'pharmacy_manager'].includes(data.role)) {
      let finalPharmacyId = data.pharmacyId;
      if (!finalPharmacyId && data.role === 'pharmacy_admin' && data.entityName) {
        const newPharmacy = await tx.pharmacy.create({
          data: {
            name: data.entityName,
            address: {
              create: {
                address: data.entityAddress || '',
                latitude: data.entityLatitude || 12.1328,
                longitude: data.entityLongitude || -86.2504,
              }
            },
            phone: data.entityPhone || null,
            ownerId: user.id
          }
        });
        finalPharmacyId = newPharmacy.id;
      }
      await tx.pharmacyManagerProfile.create({ data: { userId: user.id, pharmacyId: finalPharmacyId! } });
      if (data.role === 'pharmacy_admin' && data.pharmacyId) {
        await tx.pharmacy.update({ where: { id: data.pharmacyId }, data: { ownerId: user.id } });
      }
    } else if (data.role === 'clinic_admin') {
      let finalClinicId = data.clinicId;
      if (!finalClinicId && data.entityName) {
        const newClinic = await tx.clinic.create({
          data: {
            name: data.entityName,
            address: {
              create: {
                address: data.entityAddress || '',
                latitude: data.entityLatitude || 12.1328,
                longitude: data.entityLongitude || -86.2504,
              }
            },
            phone: data.entityPhone || null,
            ownerId: user.id
          }
        });
        finalClinicId = newClinic.id;
      }
      if (data.clinicId) {
        await tx.clinic.update({ where: { id: data.clinicId }, data: { ownerId: user.id } });
      }
    } else if (data.role === 'admin' && data.invitationToken) {
      await tx.invitation.update({ where: { token: data.invitationToken }, data: { isAccepted: true } });
    }

    return tx.user.findUnique({
      where: { id: user.id },
      include: { patientProfile: true, deliveryDriverProfile: true, pharmacyManagerProfile: true }
    });
  });

  if (!result) throw new Error('INTERNAL_ERROR');

  // 3. Generación de Tokens
  const payload: AccessTokenPayload = {
    userId: result.id,
    email: result.email,
    role: result.role,
    clinicId: data.clinicId || undefined,
    pharmacyId: data.pharmacyId || undefined,
  };

  const access_token = signAccessToken(payload);
  const refresh_token = signRefreshToken(payload);
  const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.refreshToken.create({ data: { userId: result.id, tokenHash, expiresAt } });
  
  try {
    await createAuditLog({ userId: result.id, action: 'create', entityType: 'user', entityId: result.id, ipAddress, userAgent });
  } catch (auditError) {
    console.warn('[REGISTER] Error creando audit log:', auditError);
  }

  const { passwordHash: _, ...userWithoutPassword } = result;
  return { user: userWithoutPassword, access_token, refresh_token };
}
