import { db } from '../db';

/**
 * Obtener medicamentos con filtros de búsqueda
 */
export async function getMedicines(filters: {
  search?: string;
  requiresPrescription?: string;
  limit?: number;
}) {
  const where: any = { isActive: true };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { genericName: { contains: filters.search } },
    ];
  }

  if (filters.requiresPrescription !== undefined) {
    where.requiresPrescription = filters.requiresPrescription === 'true';
  }

  return db.medicine.findMany({
    where,
    orderBy: { name: 'asc' },
    take: filters.limit || 50,
  });
}

/**
 * Obtener detalle de un medicamento
 */
export async function getMedicine(id: string) {
  const medicine = await db.medicine.findUnique({ where: { id } });
  if (!medicine) throw new Error('NOT_FOUND');
  return medicine;
}
