import { db } from '../db';

/**
 * Verifica si un usuario tiene acceso a un establecimiento específico (Clínica o Farmacia).
 */
export async function verifyFacilityAccess(userId: string, role: string, facilityId: string, type: 'clinic' | 'pharmacy'): Promise<boolean> {
  if (role === 'admin') return true;

  if (type === 'clinic') {
    if (role === 'clinic_admin') return (await db.clinic.findUnique({ where: { id: facilityId } }))?.ownerId === userId;
    if (role === 'doctor') return (await db.doctorProfile.findUnique({ where: { userId } }))?.clinicId === facilityId;
    if (role === 'receptionist') return (await db.receptionistProfile.findUnique({ where: { userId } }))?.clinicId === facilityId;
  }

  if (type === 'pharmacy') {
    if (role === 'pharmacy_admin') {
      const [pharmacy, profile] = await Promise.all([
        db.pharmacy.findUnique({ where: { id: facilityId } }),
        db.pharmacyManagerProfile.findUnique({ where: { userId } })
      ]);
      return pharmacy?.ownerId === userId || profile?.pharmacyId === facilityId;
    }
    if (['pharmacy_manager', 'cashier'].includes(role)) return (await db.pharmacyManagerProfile.findUnique({ where: { userId } }))?.pharmacyId === facilityId;
    if (role === 'delivery_driver') return (await db.deliveryDriverProfile.findUnique({ where: { userId } }))?.pharmacyId === facilityId;
  }

  return false;
}
