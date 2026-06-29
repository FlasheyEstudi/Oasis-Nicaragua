import { db } from '../db';
import { createAuditLog } from './audit.service';
import { getBoundingBox, haversineDistance } from '../utils/geolocation';

/**
 * Obtener clínicas con filtros opcionales
 */
export async function getClinics(filters: {
  search?: string;
  isActive?: string;
  userRole?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  ownerId?: string;
}) {
  const where: any = {};

  if (!filters.ownerId) {
    if (filters.userRole !== 'admin') where.isActive = true;
    else if (filters.isActive !== undefined) where.isActive = filters.isActive === 'true';
  } else if (filters.isActive !== undefined) {
    where.isActive = filters.isActive === 'true';
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { address: { contains: filters.search } },
    ];
  }

  if (filters.ownerId) where.ownerId = filters.ownerId;

  if (filters.lat !== undefined && filters.lng !== undefined) {
    const box = getBoundingBox(filters.lat, filters.lng, filters.radiusKm || 10);
    where.latitude = { gte: box.latMin, lte: box.latMax };
    where.longitude = { gte: box.lngMin, lte: box.lngMax };
  }

  const clinics = await db.clinic.findMany({
    where,
    include: { _count: { select: { doctorProfiles: true, appointments: true } } },
    orderBy: { name: 'asc' },
  });

  if (filters.lat !== undefined && filters.lng !== undefined) {
    const radius = filters.radiusKm || 10;
    return clinics
      .map(c => ({
        ...c,
        distance: haversineDistance(filters.lat!, filters.lng!, c.latitude ?? 12.1328, c.longitude ?? -86.2504)
      }))
      .filter(c => c.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  return clinics;
}

/**
 * Crear clínica
 */
export async function createClinic(data: { name: string; address: string; latitude?: number; longitude?: number; phone?: string; ownerId?: string; owner_id?: string }, userId?: string, ipAddress?: string, userAgent?: string) {
  const ownerId = data.ownerId || data.owner_id || null;
  const clinic = await db.clinic.create({
    data: {
      name: data.name,
      address: data.address,
      latitude: data.latitude ?? 12.1328,
      longitude: data.longitude ?? -86.2504,
      phone: data.phone,
      ownerId
    }
  });

  await createAuditLog({ userId, action: 'create', entityType: 'clinic', entityId: clinic.id, ipAddress, userAgent });
  return clinic;
}

/**
 * Actualizar clínica
 */
export async function updateClinic(id: string, data: { name?: string; address?: string; latitude?: number; longitude?: number; phone?: string; isActive?: boolean; ownerId?: string; owner_id?: string }, userId?: string, ipAddress?: string, userAgent?: string) {
  const clinic = await db.clinic.findUnique({ where: { id } });
  if (!clinic) throw new Error('NOT_FOUND');

  const ownerId = data.ownerId !== undefined ? data.ownerId : data.owner_id;
  const updated = await db.clinic.update({
    where: { id },
    data: {
      name: data.name,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      phone: data.phone,
      isActive: data.isActive,
      ...(ownerId !== undefined && { ownerId: ownerId || null })
    }
  });

  await createAuditLog({ userId, action: 'update', entityType: 'clinic', entityId: id, details: JSON.stringify(data), ipAddress, userAgent });
  return updated;
}

/**
 * Obtener doctores de una clínica (Público)
 */
export async function getClinicDoctors(clinicId: string, filters?: { search?: string; specialty?: string }) {
  if (!(await db.clinic.findUnique({ where: { id: clinicId } }))) throw new Error('NOT_FOUND');

  const where: any = {
    role: 'doctor',
    isActive: true,
    doctorProfile: { clinicId, ...(filters?.specialty && { specialty: { contains: filters.specialty } }) }
  };

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { doctorProfile: { specialty: { contains: filters.search } } }
    ];
  }

  const doctors = await db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      doctorProfile: { select: { specialty: true, licenseNumber: true, clinicId: true } }
    },
    orderBy: { name: 'asc' }
  });

  return doctors.map(doc => ({
    ...doc,
    doctor_profile: doc.doctorProfile ? {
      ...doc.doctorProfile,
      license_number: doc.doctorProfile.licenseNumber,
      clinic_id: doc.doctorProfile.clinicId
    } : null
  }));
}

/**
 * Obtener clínica por ID
 */
export async function getClinic(id: string) {
  const clinic = await db.clinic.findUnique({
    where: { id },
    include: { _count: { select: { doctorProfiles: true, appointments: true } } }
  });
  if (!clinic) throw new Error('NOT_FOUND');
  return clinic;
}
