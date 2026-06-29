import { db } from '../db';
import { hashPassword } from '../auth/password';
import { createAuditLog } from './audit.service';
import crypto from 'crypto';

/**
 * Crear un empleado directamente (Médico, Recepcionista, Cajero, Repartidor)
 */
export async function createEmployeeDirectly(
  senderId: string,
  data: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
    role: 'doctor' | 'receptionist' | 'cashier' | 'delivery_driver';
    clinicId?: string;
    pharmacyId?: string;
    specialty?: string;
    licenseNumber?: string;
    vehicleType?: string;
    licensePlate?: string;
  },
  ipAddress?: string,
  userAgent?: string
) {
  const sender = await db.user.findUnique({ where: { id: senderId } });
  if (!sender) throw new Error('SENDER_NOT_FOUND');

  const { name, email, phone, password, role, clinicId, pharmacyId, specialty, licenseNumber, vehicleType, licensePlate } = data;

  // Validaciones de rol y sucursales
  if (sender.role === 'admin') {
    if (['doctor', 'receptionist'].includes(role) && !clinicId) throw new Error('CLINIC_ID_REQUIRED');
    if (['cashier', 'delivery_driver'].includes(role) && !pharmacyId) throw new Error('PHARMACY_ID_REQUIRED');
  } else if (sender.role === 'clinic_admin') {
    if (!['doctor', 'receptionist'].includes(role)) throw new Error('INVALID_ROLE_FOR_CLINIC');
    if (!clinicId) throw new Error('CLINIC_ID_REQUIRED');
    const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.ownerId !== senderId) throw new Error('FORBIDDEN_CLINIC');
  } else if (sender.role === 'pharmacy_admin') {
    if (!['cashier', 'delivery_driver'].includes(role)) throw new Error('INVALID_ROLE_FOR_PHARMACY');
    if (!pharmacyId) throw new Error('PHARMACY_ID_REQUIRED');
    const pharmacy = await db.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy || pharmacy.ownerId !== senderId) throw new Error('FORBIDDEN_PHARMACY');
  } else {
    throw new Error('UNAUTHORIZED_SENDER');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await db.user.findUnique({ where: { email: normalizedEmail } })) throw new Error('EMAIL_ALREADY_REGISTERED');

  const passwordHash = await hashPassword(password || 'OasisNicaragua2026.');
  const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 días límite MINSA

  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone,
        passwordHash,
        role,
        emailVerified: true,
        verificationStatus: 'pending',
        verificationDeadline: deadline,
      }
    });

    if (role === 'doctor') {
      await tx.doctorProfile.create({
        data: {
          userId: user.id,
          clinicId: clinicId!,
          specialty: specialty || 'Medicina General',
          licenseNumber: licenseNumber || `MINSA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        }
      });
    } else if (role === 'receptionist') {
      await tx.receptionistProfile.create({ data: { userId: user.id, clinicId: clinicId! } });
    } else if (role === 'cashier') {
      await tx.pharmacyManagerProfile.create({ data: { userId: user.id, pharmacyId: pharmacyId! } });
    } else if (role === 'delivery_driver') {
      await tx.deliveryDriverProfile.create({
        data: {
          userId: user.id,
          pharmacyId: pharmacyId!,
          vehicleType: vehicleType || 'motocicleta',
          licensePlate: licensePlate || null,
          isAvailable: true,
          employmentType: 'contractor',
        }
      });
    }

    await createAuditLog({
      userId: senderId,
      action: 'CREATE_EMPLOYEE',
      entityType: 'User',
      entityId: user.id,
      details: `Created employee ${name} with role ${role} directly`,
      ipAddress,
      userAgent
    }, tx);

    return user;
  });
}

/**
 * Enviar/Crear invitación a un trabajador
 */
export async function inviteWorker(
  senderId: string,
  email: string,
  role: 'doctor' | 'receptionist' | 'cashier' | 'delivery_driver',
  clinicId?: string,
  pharmacyId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const sender = await db.user.findUnique({ where: { id: senderId } });
  if (!sender) throw new Error('SENDER_NOT_FOUND');

  // Validaciones de rol y permisos
  if (sender.role === 'admin') {
    if (['doctor', 'receptionist'].includes(role) && !clinicId) throw new Error('CLINIC_ID_REQUIRED');
    if (['cashier', 'delivery_driver'].includes(role) && !pharmacyId) throw new Error('PHARMACY_ID_REQUIRED');
  } else if (sender.role === 'clinic_admin') {
    if (!['doctor', 'receptionist'].includes(role)) throw new Error('INVALID_ROLE_FOR_CLINIC');
    if (!clinicId) throw new Error('CLINIC_ID_REQUIRED');
    const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.ownerId !== senderId) throw new Error('FORBIDDEN_CLINIC');
  } else if (sender.role === 'pharmacy_admin') {
    if (!['cashier', 'delivery_driver'].includes(role)) throw new Error('INVALID_ROLE_FOR_PHARMACY');
    if (!pharmacyId) throw new Error('PHARMACY_ID_REQUIRED');
    const pharmacy = await db.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy || pharmacy.ownerId !== senderId) throw new Error('FORBIDDEN_PHARMACY');
  } else {
    throw new Error('UNAUTHORIZED_SENDER');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await db.user.findUnique({ where: { email: normalizedEmail } })) throw new Error('EMAIL_ALREADY_REGISTERED');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días límite

  const invitation = await db.invitation.create({
    data: {
      email: normalizedEmail,
      role,
      token,
      expiresAt,
      senderId,
      clinicId: clinicId || null,
      pharmacyId: pharmacyId || null,
    },
  });

  await createAuditLog({
    userId: senderId,
    action: 'create',
    entityType: 'invitation',
    entityId: invitation.id,
    details: JSON.stringify({ email: normalizedEmail, role, clinicId, pharmacyId }),
    ipAddress,
    userAgent,
  });

  return invitation;
}

/**
 * Obtener detalles de invitación por token
 */
export async function getInvitationByToken(token: string) {
  const invitation = await db.invitation.findUnique({
    where: { token },
    include: {
      clinic: { select: { name: true } },
      pharmacy: { select: { name: true } },
    },
  });

  if (!invitation) throw new Error('INVITATION_NOT_FOUND');
  if (invitation.isAccepted) throw new Error('INVITATION_ALREADY_ACCEPTED');
  if (invitation.expiresAt < new Date()) throw new Error('INVITATION_EXPIRED');

  return invitation;
}

/**
 * Aceptar invitación y activar cuenta de trabajador
 */
export async function acceptInvitation(
  token: string,
  name: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
) {
  const invitation = await getInvitationByToken(token);
  const passwordHash = await hashPassword(password);

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email: invitation.email,
        passwordHash,
        role: invitation.role,
        isActive: true,
        emailVerified: true,
      },
    });

    if (invitation.role === 'doctor') {
      await tx.doctorProfile.create({
        data: {
          userId: user.id,
          clinicId: invitation.clinicId!,
          licenseNumber: `MED-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          specialty: 'Medicina General',
        },
      });
    } else if (invitation.role === 'receptionist') {
      await tx.receptionistProfile.create({ data: { userId: user.id, clinicId: invitation.clinicId! } });
    } else if (invitation.role === 'cashier') {
      await tx.pharmacyManagerProfile.create({ data: { userId: user.id, pharmacyId: invitation.pharmacyId! } });
    } else if (invitation.role === 'delivery_driver') {
      await tx.deliveryDriverProfile.create({
        data: {
          userId: user.id,
          pharmacyId: invitation.pharmacyId!,
          vehicleType: 'motocicleta',
          employmentType: 'employee',
        },
      });
    } else if (invitation.role === 'clinic_admin' && invitation.clinicId) {
      await tx.clinic.update({ where: { id: invitation.clinicId }, data: { ownerId: user.id } });
    } else if (invitation.role === 'pharmacy_admin' && invitation.pharmacyId) {
      await tx.pharmacyManagerProfile.create({ data: { userId: user.id, pharmacyId: invitation.pharmacyId } });
      await tx.pharmacy.update({ where: { id: invitation.pharmacyId }, data: { ownerId: user.id } });
    }

    await tx.invitation.update({ where: { id: invitation.id }, data: { isAccepted: true } });

    // Notificaciones Push in-app directas en base de datos
    try {
      if (['doctor', 'receptionist'].includes(invitation.role) && invitation.clinicId) {
        const clinic = await tx.clinic.findUnique({ where: { id: invitation.clinicId }, select: { ownerId: true } });
        if (clinic?.ownerId) {
          await tx.notification.create({
            data: {
              userId: clinic.ownerId,
              title: '✅ Invitación Aceptada',
              body: `El ${invitation.role === 'doctor' ? 'médico' : 'recepcionista'} ${name} ha aceptado tu invitación.`,
              type: 'invitation_accepted',
            }
          });
        }
      } else if (['cashier', 'delivery_driver'].includes(invitation.role) && invitation.pharmacyId) {
        const pharmacy = await tx.pharmacy.findUnique({ where: { id: invitation.pharmacyId }, select: { ownerId: true } });
        if (pharmacy?.ownerId) {
          await tx.notification.create({
            data: {
              userId: pharmacy.ownerId,
              title: '✅ Invitación Aceptada',
              body: `El ${invitation.role === 'delivery_driver' ? 'repartidor' : 'cajero'} ${name} ha aceptado tu invitación.`,
              type: 'invitation_accepted',
            }
          });
        }
      }
    } catch (err) {
      console.warn('Error creating invitation accepted notification:', err);
    }

    return user;
  });

  await createAuditLog({
    userId: result.id,
    action: 'create',
    entityType: 'user',
    entityId: result.id,
    details: JSON.stringify({ action: 'accept_invitation', role: invitation.role }),
    ipAddress,
    userAgent,
  });

  return { id: result.id, email: result.email, name: result.name, role: result.role };
}

/**
 * Listar personal de clínica
 */
export async function getClinicWorkers(clinicId: string, ownerId: string, callerRole: string = 'clinic_admin') {
  const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic || (callerRole !== 'admin' && clinic.ownerId !== ownerId)) throw new Error('FORBIDDEN');

  const [doctors, receptionists] = await Promise.all([
    db.user.findMany({
      where: { role: 'doctor', doctorProfile: { clinicId } },
      include: { doctorProfile: true },
      orderBy: { name: 'asc' },
    }),
    db.user.findMany({
      where: { role: 'receptionist', receptionistProfile: { clinicId } },
      include: { receptionistProfile: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    doctors: doctors.map(({ passwordHash, ...rest }) => rest),
    receptionists: receptionists.map(({ passwordHash, ...rest }) => rest),
  };
}

/**
 * Listar personal de farmacia
 */
export async function getPharmacyWorkers(pharmacyId: string, ownerId: string, callerRole: string = 'pharmacy_admin') {
  const pharmacy = await db.pharmacy.findUnique({ where: { id: pharmacyId } });
  if (!pharmacy || (callerRole !== 'admin' && pharmacy.ownerId !== ownerId)) throw new Error('FORBIDDEN');

  const [cashiers, drivers] = await Promise.all([
    db.user.findMany({
      where: { role: 'cashier', pharmacyManagerProfile: { pharmacyId } },
      include: { pharmacyManagerProfile: true },
      orderBy: { name: 'asc' },
    }),
    db.user.findMany({
      where: { role: 'delivery_driver', deliveryDriverProfile: { pharmacyId } },
      include: { deliveryDriverProfile: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    cashiers: cashiers.map(({ passwordHash, ...rest }) => rest),
    drivers: drivers.map(({ passwordHash, ...rest }) => rest),
  };
}

/**
 * Activar/Desactivar cuenta de personal
 */
export async function changeWorkerStatus(workerId: string, isActive: boolean, ownerId: string, ipAddress?: string, userAgent?: string) {
  const worker = await db.user.findUnique({
    where: { id: workerId },
    include: { doctorProfile: true, receptionistProfile: true, pharmacyManagerProfile: true, deliveryDriverProfile: true },
  });
  if (!worker) throw new Error('WORKER_NOT_FOUND');

  const caller = await db.user.findUnique({ where: { id: ownerId } });
  if (!caller) throw new Error('CALLER_NOT_FOUND');

  if (caller.role !== 'admin') {
    if (['doctor', 'receptionist'].includes(worker.role)) {
      const clinicId = worker.doctorProfile?.clinicId || worker.receptionistProfile?.clinicId;
      if (!clinicId) throw new Error('NO_CLINIC_ASSOCIATION');
      const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
      if (!clinic || clinic.ownerId !== ownerId) throw new Error('FORBIDDEN');
    } else if (worker.role === 'cashier') {
      const pharmacyId = worker.pharmacyManagerProfile?.pharmacyId;
      if (!pharmacyId) throw new Error('NO_PHARMACY_ASSOCIATION');
      const pharmacy = await db.pharmacy.findUnique({ where: { id: pharmacyId } });
      if (!pharmacy || pharmacy.ownerId !== ownerId) throw new Error('FORBIDDEN');
    } else if (worker.role === 'delivery_driver') {
      if (caller.role !== 'pharmacy_admin') throw new Error('FORBIDDEN');
      const pharmacyId = worker.deliveryDriverProfile?.pharmacyId;
      if (pharmacyId) {
        const pharmacy = await db.pharmacy.findUnique({ where: { id: pharmacyId } });
        if (!pharmacy || pharmacy.ownerId !== ownerId) throw new Error('FORBIDDEN');
      }
    } else {
      throw new Error('CANNOT_MODIFY_ROLE');
    }
  }

  const updated = await db.user.update({ where: { id: workerId }, data: { isActive } });

  await createAuditLog({
    userId: ownerId,
    action: 'update',
    entityType: 'user',
    entityId: workerId,
    details: JSON.stringify({ action: 'change_worker_status', isActive }),
    ipAddress,
    userAgent,
  });

  const { passwordHash, ...rest } = updated;
  return rest;
}

/**
 * Actualizar detalles de trabajador (Anti-Spoofing)
 */
export async function updateWorkerDetails(
  workerId: string,
  ownerId: string,
  data: {
    name?: string;
    phone?: string;
    specialty?: string;
    licenseNumber?: string;
    vehicleType?: string;
    licensePlate?: string;
  },
  ipAddress?: string,
  userAgent?: string
) {
  const worker = await db.user.findUnique({
    where: { id: workerId },
    include: { doctorProfile: true, receptionistProfile: true, pharmacyManagerProfile: true, deliveryDriverProfile: true },
  });
  if (!worker) throw new Error('WORKER_NOT_FOUND');

  const caller = await db.user.findUnique({ where: { id: ownerId } });
  if (!caller) throw new Error('CALLER_NOT_FOUND');

  if (caller.role !== 'admin') {
    if (['doctor', 'receptionist'].includes(worker.role)) {
      const clinicId = worker.doctorProfile?.clinicId || worker.receptionistProfile?.clinicId;
      if (!clinicId) throw new Error('NO_CLINIC_ASSOCIATION');
      const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
      if (!clinic || clinic.ownerId !== ownerId) throw new Error('FORBIDDEN');
    } else if (worker.role === 'cashier') {
      const pharmacyId = worker.pharmacyManagerProfile?.pharmacyId;
      if (!pharmacyId) throw new Error('NO_PHARMACY_ASSOCIATION');
      const pharmacy = await db.pharmacy.findUnique({ where: { id: pharmacyId } });
      if (!pharmacy || pharmacy.ownerId !== ownerId) throw new Error('FORBIDDEN');
    } else if (worker.role === 'delivery_driver') {
      if (caller.role !== 'pharmacy_admin') throw new Error('FORBIDDEN');
      const pharmacyId = worker.deliveryDriverProfile?.pharmacyId;
      if (pharmacyId) {
        const pharmacy = await db.pharmacy.findUnique({ where: { id: pharmacyId } });
        if (!pharmacy || pharmacy.ownerId !== ownerId) throw new Error('FORBIDDEN');
      }
    } else {
      throw new Error('CANNOT_MODIFY_ROLE');
    }
  }

  const result = await db.$transaction(async (tx) => {
    const userUpdates: any = {};
    if (data.name !== undefined) userUpdates.name = data.name;
    if (data.phone !== undefined) userUpdates.phone = data.phone;

    const updatedUser = await tx.user.update({ where: { id: workerId }, data: userUpdates });

    if (worker.role === 'doctor' && worker.doctorProfile) {
      const docUpdates: any = {};
      if (data.specialty !== undefined) docUpdates.specialty = data.specialty;
      if (data.licenseNumber !== undefined) docUpdates.licenseNumber = data.licenseNumber;
      if (Object.keys(docUpdates).length > 0) await tx.doctorProfile.update({ where: { userId: workerId }, data: docUpdates });
    } else if (worker.role === 'delivery_driver' && worker.deliveryDriverProfile) {
      const driverUpdates: any = {};
      if (data.vehicleType !== undefined) driverUpdates.vehicleType = data.vehicleType;
      if (data.licensePlate !== undefined) driverUpdates.licensePlate = data.licensePlate;
      if (Object.keys(driverUpdates).length > 0) await tx.deliveryDriverProfile.update({ where: { userId: workerId }, data: driverUpdates });
    }

    return updatedUser;
  });

  await createAuditLog({
    userId: ownerId,
    action: 'update',
    entityType: 'user',
    entityId: workerId,
    details: `Updated worker ${workerId} details: ${JSON.stringify(data)}`,
    ipAddress,
    userAgent,
  });

  const { passwordHash, ...rest } = result;
  return rest;
}
