// OASIS - Family Relationship Service
// Patient-caregiver links, consent, permissions, and delegation

import { db } from '../db';
import { createAuditLog } from './audit.service';
import crypto from 'crypto';

/**
 * Obtener relaciones familiares de un usuario (como cuidador o como paciente)
 */
export async function getFamilyRelationships(userId: string) {
  return db.familyRelationship.findMany({
    where: {
      OR: [
        { caregiverId: userId },
        { patientId: userId }
      ]
    },
    include: {
      caregiver: { select: { id: true, name: true, email: true, phone: true } },
      patient: { select: { id: true, name: true, email: true, phone: true, patientProfile: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Solicitar vinculación de cuidador con un paciente (genera código de consentimiento)
 */
export async function requestRelationship(data: {
  caregiverId: string;
  patientId: string;
  relationship: string;
  permissions?: string[];
}) {
  if (data.caregiverId === data.patientId) {
    throw new Error('VALIDATION_ERROR: No puedes vincularte contigo mismo.');
  }

  // Verificar si ya existe alguna relación activa o pendiente entre ellos
  const existing = await db.familyRelationship.findUnique({
    where: {
      caregiverId_patientId: {
        caregiverId: data.caregiverId,
        patientId: data.patientId
      }
    }
  });

  if (existing && existing.isActive) {
    throw new Error('CONFLICT: Ya existe una relación activa entre estos usuarios.');
  }

  // Generar código numérico de 6 dígitos para verificación
  const verificationCode = crypto.randomInt(100000, 999999).toString();
  const codeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas de validez

  const defaultPermissions = ['view_health_data', 'buy_medicines', 'schedule_appointments'];

  return await db.$transaction(async (tx) => {
    // Si ya existía una relación inactiva, la sobreescribimos/actualizamos con el nuevo código
    const rel = await tx.familyRelationship.upsert({
      where: {
        caregiverId_patientId: {
          caregiverId: data.caregiverId,
          patientId: data.patientId
        }
      },
      update: {
        relationship: data.relationship,
        status: 'pending',
        isActive: false,
        verificationCode,
        codeExpiresAt,
        permissions: data.permissions || defaultPermissions
      },
      create: {
        caregiverId: data.caregiverId,
        patientId: data.patientId,
        relationship: data.relationship,
        status: 'pending',
        isActive: false,
        verificationCode,
        codeExpiresAt,
        permissions: data.permissions || defaultPermissions
      },
      include: { caregiver: true, patient: true }
    });

    // Notificar al paciente que tiene una solicitud de cuidador
    await tx.notification.create({
      data: {
        userId: data.patientId,
        title: '👥 Solicitud de Cuidador Familiar',
        body: `${rel.caregiver.name} solicita vincularse como tu cuidador (${data.relationship}). Código: ${verificationCode}`,
        type: 'family_request'
      }
    });

    return {
      id: rel.id,
      status: rel.status,
      verification_code: verificationCode,
      expires_at: codeExpiresAt.toISOString()
    };
  });
}

/**
 * Confirmar vinculación mediante código de verificación (Consentimiento del Paciente)
 */
export async function verifyRelationship(
  caregiverId: string,
  patientId: string,
  verificationCode: string,
  ipAddress?: string,
  userAgent?: string
) {
  const rel = await db.familyRelationship.findUnique({
    where: { caregiverId_patientId: { caregiverId, patientId } },
    include: { caregiver: true, patient: true }
  });

  if (!rel) throw new Error('NOT_FOUND: Relación familiar no encontrada.');
  if (rel.status === 'active') throw new Error('CONFLICT: La relación ya está activa.');
  if (rel.verificationCode !== verificationCode) throw new Error('VALIDATION_ERROR: Código de verificación incorrecto.');
  if (rel.codeExpiresAt && rel.codeExpiresAt < new Date()) {
    throw new Error('VALIDATION_ERROR: El código ha expirado. Solicita una nueva vinculación.');
  }

  return await db.$transaction(async (tx) => {
    const updated = await tx.familyRelationship.update({
      where: { id: rel.id },
      data: {
        status: 'active',
        isActive: true,
        verificationCode: null,
        codeExpiresAt: null
      }
    });

    await createAuditLog({
      userId: patientId,
      action: 'verify_family',
      entityType: 'family',
      entityId: rel.id,
      details: `Vínculo de cuidador verificado entre paciente ${patientId} y cuidador ${caregiverId}`,
      ipAddress,
      userAgent
    }, tx);

    // Notificar al cuidador
    await tx.notification.create({
      data: {
        userId: caregiverId,
        title: '✅ Vínculo Familiar Aceptado',
        body: `${rel.patient.name} ha aprobado tu solicitud de vinculación familiar.`,
        type: 'family_verified'
      }
    });

    return updated;
  });
}

/**
 * Actualizar los permisos delegados al cuidador
 */
export async function updateRelationshipPermissions(
  caregiverId: string,
  patientId: string,
  permissions: string[],
  ipAddress?: string,
  userAgent?: string
) {
  const rel = await db.familyRelationship.findUnique({
    where: { caregiverId_patientId: { caregiverId, patientId } }
  });
  if (!rel) throw new Error('NOT_FOUND: Relación familiar no encontrada.');
  if (!rel.isActive) {
    throw new Error('CONFLICT: La relación familiar no está activa.');
  }

  return await db.$transaction(async (tx) => {
    const updated = await tx.familyRelationship.update({
      where: { id: rel.id },
      data: { permissions }
    });

    await createAuditLog({
      userId: patientId, // El paciente es el dueño del consentimiento y quien modifica permisos
      action: 'update_family_permissions',
      entityType: 'family',
      entityId: rel.id,
      details: `Permisos actualizados a: ${permissions.join(', ')}`,
      ipAddress,
      userAgent
    }, tx);

    return updated;
  });
}

/**
 * Revocar/Eliminar vínculo de forma permanente
 */
export async function revokeRelationship(
  caregiverId: string,
  patientId: string,
  revokerId: string,
  ipAddress?: string,
  userAgent?: string
) {
  const rel = await db.familyRelationship.findUnique({
    where: { caregiverId_patientId: { caregiverId, patientId } }
  });
  if (!rel) throw new Error('NOT_FOUND: Relación familiar no encontrada.');
  if (!rel.isActive) {
    throw new Error('CONFLICT: La relación familiar ya se encuentra inactiva o revocada.');
  }

  return await db.$transaction(async (tx) => {
    // Para conservar el registro histórico pero desactivarlo, cambiamos el estado
    const updated = await tx.familyRelationship.update({
      where: { id: rel.id },
      data: {
        status: 'revoked',
        isActive: false
      },
      include: { caregiver: true, patient: true }
    });

    await createAuditLog({
      userId: revokerId,
      action: 'revoke_family',
      entityType: 'family',
      entityId: rel.id,
      details: `Vínculo revocado por el usuario ${revokerId}`,
      ipAddress,
      userAgent
    }, tx);

    // Notificar al otro participante
    const notifyTarget = revokerId === patientId ? caregiverId : patientId;
    const revokerName = revokerId === patientId ? updated.patient.name : updated.caregiver.name;

    await tx.notification.create({
      data: {
        userId: notifyTarget,
        title: '👥 Vínculo Familiar Revocado',
        body: `${revokerName} ha cancelado la delegación familiar de la cuenta.`,
        type: 'family_revoked'
      }
    });

    return updated;
  });
}
