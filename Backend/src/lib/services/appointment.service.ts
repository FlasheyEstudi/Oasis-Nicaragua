// OASIS - Appointment Service
// CRUD and status management for appointments

import { db } from '../db';
import { createAuditLog } from './audit.service';

function formatDateTimeNI(date: Date): string {
  try {
    return date.toLocaleString('es-NI', { dateStyle: 'long', timeStyle: 'short' });
  } catch (e) {
    return date.toISOString();
  }
}

// Inline notification stubs for logging and future PWA integration
async function logNotification(userId: string, title: string, body: string, type: string) {
  try {
    await db.notification.create({
      data: { userId, title, body, type }
    });
  } catch (e) {
    console.error('Error creating notification:', e);
  }
}

/**
 * Get appointments with role-based isolation
 */
export async function getAppointments(filters: {
  patientId?: string;
  doctorId?: string;
  clinicId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  userRole?: string;
  userId?: string;
  limit: number;
  skip: number;
}) {
  const where: Record<string, any> = {};

  // Role-based data isolation
  if (filters.userRole === 'patient' && filters.userId) {
    where.patientId = filters.userId;
  } else if (filters.userRole === 'doctor' && filters.userId) {
    where.doctorId = filters.userId;
  } else if (filters.userRole === 'clinic_admin' && filters.userId) {
    const clinic = await db.clinic.findFirst({ where: { ownerId: filters.userId }, select: { id: true } });
    where.clinicId = clinic?.id || 'none';
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.doctorId) where.doctorId = filters.doctorId;
  } else if (filters.userRole === 'receptionist' && filters.userId) {
    const profile = await db.receptionistProfile.findUnique({ where: { userId: filters.userId }, select: { clinicId: true } });
    where.clinicId = profile?.clinicId || 'none';
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.doctorId) where.doctorId = filters.doctorId;
  } else {
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.doctorId) where.doctorId = filters.doctorId;
    if (filters.clinicId) where.clinicId = filters.clinicId;
  }

  if (filters.status) where.status = filters.status;
  if (filters.dateFrom || filters.dateTo) {
    where.dateTime = {
      ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
      ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
    };
  }

  const [data, total] = await Promise.all([
    db.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, email: true, phone: true } },
        doctor: { select: { id: true, name: true, email: true, doctorProfile: true } },
        clinic: true,
      },
      orderBy: { dateTime: 'desc' },
      skip: filters.skip,
      take: filters.limit,
    }),
    db.appointment.count({ where }),
  ]);

  return { data, total };
}

/**
 * Get appointment details by ID
 */
export async function getAppointment(id: string) {
  return db.appointment.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, name: true, email: true, phone: true, patientProfile: true } },
      doctor: { select: { id: true, name: true, email: true, doctorProfile: { include: { clinic: true } } } },
      clinic: true,
      prescriptions: { include: { prescriptionLines: { include: { medicine: true } } } },
    },
  });
}

/**
 * Create a new appointment checking doctor affiliation and overlapping
 */
export async function createAppointment(
  data: { doctor_id: string; clinic_id: string; date_time: string; duration_minutes?: number; notes?: string; patientId: string },
  ipAddress?: string,
  userAgent?: string
) {
  const startTime = new Date(data.date_time);
  const duration = data.duration_minutes || 30;
  const endTime = new Date(startTime.getTime() + duration * 60000);

  // Validate doctor belongs to clinic
  const doctorProfile = await db.doctorProfile.findFirst({
    where: { userId: data.doctor_id, clinicId: data.clinic_id },
  });
  if (!doctorProfile) {
    throw new Error('FORBIDDEN: El doctor no pertenece a la clínica especificada.');
  }

  // Check overlaps: (StartA < EndB) AND (EndA > StartB)
  // Retrieve candidate appointments in a 2-hour window to keep DB search fast
  const windowStart = new Date(startTime.getTime() - 120 * 60000);
  const windowEnd = new Date(startTime.getTime() + 120 * 60000);
  const overlapping = await db.appointment.findMany({
    where: {
      doctorId: data.doctor_id,
      status: { notIn: ['cancelled', 'no_show'] },
      dateTime: { gte: windowStart, lte: windowEnd },
    },
  });

  for (const appt of overlapping) {
    const exStart = new Date(appt.dateTime);
    const exEnd = new Date(exStart.getTime() + (appt.durationMinutes || 30) * 60000);
    if (startTime < exEnd && endTime > exStart) {
      throw new Error('CONFLICT: El doctor ya tiene una cita en este horario.');
    }
  }

  const appointment = await db.appointment.create({
    data: {
      patientId: data.patientId,
      doctorId: data.doctor_id,
      clinicId: data.clinic_id,
      dateTime: startTime,
      durationMinutes: duration,
      notes: data.notes,
    },
    include: {
      patient: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true } },
      clinic: true,
    },
  });

  await createAuditLog({
    userId: data.patientId,
    action: 'create',
    entityType: 'appointment',
    entityId: appointment.id,
    ipAddress,
    userAgent,
  });

  // Notify Doctor and Patient
  const dateStr = formatDateTimeNI(appointment.dateTime);
  await logNotification(
    appointment.doctorId,
    '📅 Nueva Cita Reservada',
    `El paciente ${appointment.patient?.name || 'Paciente'} reservó una cita para el ${dateStr}.`,
    'appointment_booked'
  );

  return appointment;
}

/**
 * Update appointment status with strict role transition constraints
 */
export async function updateAppointmentStatus(
  id: string,
  newStatus: string,
  userRole: string,
  userId: string,
  cancellationReason?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const appointment = await db.appointment.findUnique({ where: { id } });
  if (!appointment) throw new Error('NOT_FOUND');

  // Verify ownership / tenant rights
  let isAuthorized = false;
  if (userRole === 'admin') {
    isAuthorized = true;
  } else if (userRole === 'patient' && appointment.patientId === userId) {
    isAuthorized = true;
  } else if (userRole === 'patient') {
    // Caregiver check
    const caregiverRelation = await db.familyRelationship.findFirst({
      where: { caregiverId: userId, patientId: appointment.patientId, isActive: true, status: 'active' },
    });
    if (caregiverRelation) isAuthorized = true;
  } else if (userRole === 'doctor' && appointment.doctorId === userId) {
    isAuthorized = true;
  } else if (userRole === 'receptionist') {
    const profile = await db.receptionistProfile.findUnique({ where: { userId }, select: { clinicId: true } });
    if (profile && profile.clinicId === appointment.clinicId) isAuthorized = true;
  } else if (userRole === 'clinic_admin') {
    const clinic = await db.clinic.findFirst({ where: { id: appointment.clinicId, ownerId: userId }, select: { id: true } });
    if (clinic) isAuthorized = true;
  }

  if (!isAuthorized) throw new Error('UNAUTHORIZED');

  const currentStatus = appointment.status;

  // Transition Matrix: Status -> Target -> Permitted Roles
  const transitions: Record<string, Record<string, string[]>> = {
    scheduled: { confirmed: ['receptionist', 'doctor'], cancelled: ['patient', 'receptionist', 'doctor'], no_show: ['receptionist', 'doctor'] },
    confirmed: { in_progress: ['doctor'], cancelled: ['patient', 'receptionist', 'doctor'], no_show: ['receptionist', 'doctor'] },
    in_progress: { completed: ['doctor'] },
  };

  const allowedRoles = transitions[currentStatus]?.[newStatus];
  if (!allowedRoles || !allowedRoles.includes(userRole)) {
    throw new Error('INVALID_STATUS_TRANSITION');
  }

  const updated = await db.appointment.update({
    where: { id },
    data: { status: newStatus, ...(cancellationReason && { cancellationReason }) },
    include: { patient: { select: { name: true } } },
  });

  await createAuditLog({
    userId,
    action: 'update',
    entityType: 'appointment',
    entityId: id,
    details: JSON.stringify({ field: 'status', from: currentStatus, to: newStatus }),
    ipAddress,
    userAgent,
  });

  if (newStatus === 'cancelled') {
    await logNotification(
      appointment.doctorId,
      '❌ Cita Cancelada',
      `La cita del ${formatDateTimeNI(appointment.dateTime)} ha sido cancelada.`,
      'appointment_canceled'
    );
  }

  return updated;
}

/**
 * Edit/Reschedule appointment
 */
export async function updateAppointment(
  id: string,
  data: { date_time?: string; duration_minutes?: number; notes?: string },
  userId: string,
  userRole: string,
  ipAddress?: string,
  userAgent?: string
) {
  const current = await db.appointment.findUnique({ where: { id } });
  if (!current) throw new Error('NOT_FOUND');

  let isAuthorized = false;
  if (userRole === 'admin' || current.patientId === userId || current.doctorId === userId) {
    isAuthorized = true;
  } else if (userRole === 'receptionist') {
    const profile = await db.receptionistProfile.findUnique({ where: { userId }, select: { clinicId: true } });
    if (profile && profile.clinicId === current.clinicId) isAuthorized = true;
  } else if (userRole === 'clinic_admin') {
    const clinic = await db.clinic.findFirst({ where: { id: current.clinicId, ownerId: userId }, select: { id: true } });
    if (clinic) isAuthorized = true;
  }

  if (!isAuthorized) throw new Error('UNAUTHORIZED');

  const updated = await db.appointment.update({
    where: { id },
    data: {
      dateTime: data.date_time ? new Date(data.date_time) : undefined,
      durationMinutes: data.duration_minutes !== undefined ? data.duration_minutes : undefined,
      notes: data.notes !== undefined ? data.notes : undefined,
    },
  });

  await createAuditLog({
    userId,
    action: 'update',
    entityType: 'appointment',
    entityId: id,
    details: JSON.stringify({ message: 'Appointment details updated', changes: data }),
    ipAddress,
    userAgent,
  });

  return updated;
}
