import { db } from '../db';
import { createAuditLog } from './audit.service';
import { getBoundingBox, haversineDistance } from '../utils/geolocation';

/**
 * Obtener farmacias con filtros opcionales y geolocalización
 */
export async function getPharmacies(filters: {
  search?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  medicineIds?: string[];
  isActive?: string;
  ownerId?: string;
}) {
  const where: any = {};

  if (!filters.ownerId) {
    if (filters.isActive && filters.isActive !== 'true') {
      // Admin ve inactivas si lo solicita
    } else {
      where.isActive = true;
    }
  } else if (filters.isActive !== undefined) {
    where.isActive = filters.isActive === 'true';
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { address: { address: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  if (filters.medicineIds && filters.medicineIds.length > 0) {
    where.inventory = {
      some: {
        medicineId: { in: filters.medicineIds },
        quantity: { gt: 0 },
      },
    };
  }

  if (filters.ownerId) where.ownerId = filters.ownerId;

  if (filters.lat !== undefined && filters.lng !== undefined) {
    const box = getBoundingBox(filters.lat, filters.lng, filters.radiusKm || 10);
    where.address = {
      latitude: { gte: box.latMin, lte: box.latMax },
      longitude: { gte: box.lngMin, lte: box.lngMax }
    };
  }

  let pharmacies = await db.pharmacy.findMany({
    where,
    include: {
      address: true,
      _count: { select: { inventory: true, sales: true } },
      ...(filters.medicineIds && filters.medicineIds.length > 0 ? {
        inventory: {
          where: { medicineId: { in: filters.medicineIds }, quantity: { gt: 0 } },
          select: { medicineId: true, quantity: true }
        }
      } : {})
    },
    orderBy: { name: 'asc' },
  });

  if (filters.medicineIds && filters.medicineIds.length > 0) {
    pharmacies = pharmacies.map(p => ({
      ...p,
      matchedMedicinesCount: (p as any).inventory?.length || 0,
      matchedMedicines: (p as any).inventory?.map((i: any) => i.medicineId) || [],
    }));
  }

  if (filters.lat !== undefined && filters.lng !== undefined) {
    const radius = filters.radiusKm || 10;
    return pharmacies
      .map((p) => ({
        ...p,
        distance: haversineDistance(filters.lat!, filters.lng!, p.address.latitude, p.address.longitude),
      }))
      .filter((p) => p.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  return pharmacies;
}

/**
 * Obtener farmacia individual con resumen de inventario
 */
export async function getPharmacy(id: string) {
  const pharmacy = await db.pharmacy.findUnique({
    where: { id },
    include: {
      address: true,
      inventory: {
        include: { medicine: true },
        where: { quantity: { gt: 0 } },
        take: 20,
        orderBy: { medicine: { name: 'asc' } },
      },
      _count: { select: { sales: true } },
    },
  });
  if (!pharmacy) throw new Error('NOT_FOUND');
  return pharmacy;
}

/**
 * Crear farmacia
 */
export async function createPharmacy(
  data: { name: string; address: string; latitude?: number; longitude?: number; phone?: string; delivery_fee?: number; ownerId?: string; owner_id?: string },
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const ownerId = data.ownerId || data.owner_id || null;
  const pharmacy = await db.pharmacy.create({
    data: {
      name: data.name,
      address: {
        create: {
          address: data.address,
          latitude: data.latitude ?? 12.1328,
          longitude: data.longitude ?? -86.2504
        }
      },
      phone: data.phone,
      deliveryFee: data.delivery_fee ?? 29.90,
      ownerId,
    },
    include: { address: true }
  });

  await createAuditLog({ userId, action: 'create', entityType: 'pharmacy', entityId: pharmacy.id, ipAddress, userAgent });
  return pharmacy;
}

/**
 * Actualizar farmacia
 */
export async function updatePharmacy(
  id: string,
  data: { name?: string; address?: string; latitude?: number; longitude?: number; phone?: string; isActive?: boolean; delivery_fee?: number; ownerId?: string; owner_id?: string },
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const pharmacy = await db.pharmacy.findUnique({ where: { id } });
  if (!pharmacy) throw new Error('NOT_FOUND');

  const ownerId = data.ownerId !== undefined ? data.ownerId : data.owner_id;
  const updated = await db.pharmacy.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone,
      isActive: data.isActive,
      ...(data.delivery_fee !== undefined && { deliveryFee: data.delivery_fee }),
      ...(ownerId !== undefined && { ownerId: ownerId || null }),
      ...(data.address !== undefined && {
        address: {
          update: {
            address: data.address,
            latitude: data.latitude ?? 12.1328,
            longitude: data.longitude ?? -86.2504
          }
        }
      })
    },
    include: { address: true }
  });

  await createAuditLog({ userId, action: 'update', entityType: 'pharmacy', entityId: id, details: JSON.stringify(data), ipAddress, userAgent });
  return updated;
}
