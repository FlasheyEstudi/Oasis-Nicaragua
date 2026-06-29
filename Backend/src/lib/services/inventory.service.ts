import { db } from '../db';
import { createAuditLog } from './audit.service';
import crypto from 'crypto';

/**
 * Obtener inventario para una farmacia con filtros y paginación
 */
export async function getInventory(filters: {
  pharmacyId: string;
  search?: string;
  lowStock?: boolean;
  page: number;
  limit: number;
  skip: number;
}) {
  const where: any = { pharmacyId: filters.pharmacyId };

  if (filters.search) {
    where.medicine = {
      OR: [
        { name: { contains: filters.search } },
        { genericName: { contains: filters.search } },
      ],
    };
  }

  const [items, total] = await Promise.all([
    db.inventory.findMany({
      where,
      include: {
        medicine: true,
        batches: {
          orderBy: { expirationDate: 'asc' },
          where: { quantity: { gt: 0 } },
        },
      },
      orderBy: { medicine: { name: 'asc' } },
      skip: filters.skip,
      take: filters.limit,
    }),
    db.inventory.count({ where }),
  ]);

  let filteredItems = items;
  if (filters.lowStock) {
    filteredItems = items.filter((item) => item.quantity <= item.minStock);
  }

  return {
    data: filteredItems,
    total: filters.lowStock ? filteredItems.length : total,
  };
}

/**
 * Crear o registrar un nuevo artículo de inventario (con 0 stock inicial o valores personalizados)
 */
export async function createInventoryItem(data: {
  pharmacyId: string;
  medicineId: string;
  minStock?: number;
  unitPrice?: number;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  // Verificar si ya existe
  const existing = await db.inventory.findFirst({
    where: { pharmacyId: data.pharmacyId, medicineId: data.medicineId },
  });
  if (existing) return existing;

  const item = await db.inventory.create({
    data: {
      pharmacyId: data.pharmacyId,
      medicineId: data.medicineId,
      quantity: 0,
      unitPrice: data.unitPrice || 0,
      minStock: data.minStock || 10,
    },
    include: { medicine: true },
  });

  await createAuditLog({
    userId: data.userId,
    action: 'CREATE_INVENTORY',
    entityType: 'Inventory',
    entityId: item.id,
    details: `Registered new medicine ${data.medicineId} in pharmacy ${data.pharmacyId} catalog`,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });

  return item;
}

/**
 * Ajustar inventario (entradas, salidas y restocks manuales)
 */
export async function adjustInventory(
  pharmacyId: string,
  data: {
    medicine_id: string;
    quantity_change: number;
    new_price?: number;
    reason?: string;
  },
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  return await db.$transaction(async (tx) => {
    // Buscar artículo existente
    let item = await tx.inventory.findFirst({
      where: { pharmacyId, medicineId: data.medicine_id },
    });

    // Si no existe, lo creamos
    if (!item) {
      if (data.quantity_change >= 0) {
        item = await tx.inventory.create({
          data: {
            pharmacyId,
            medicineId: data.medicine_id,
            quantity: data.quantity_change,
            unitPrice: data.new_price || 0,
            minStock: 10,
          },
        });

        // Si se agregó stock, crear el lote correspondiente
        if (data.quantity_change > 0) {
          const batchCode = `AJUSTE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
          const batch = await tx.inventoryBatch.create({
            data: {
              inventoryId: item.id,
              batchNumber: batchCode,
              quantity: data.quantity_change,
              sellingPrice: data.new_price || 0,
              expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Vence en 1 año por defecto
            },
          });

          await tx.inventoryMovement.create({
            data: {
              inventoryId: item.id,
              userId: userId || null,
              batchId: batch.id,
              quantityChange: data.quantity_change,
              type: 'restock',
              reason: data.reason || 'Inicialización de stock',
            },
          });
        }
      } else {
        throw new Error('INSUFFICIENT_STOCK');
      }
    } else {
      // Si ya existe
      const newQuantity = item.quantity + data.quantity_change;
      if (newQuantity < 0) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      if (data.quantity_change > 0) {
        // Entrada de Stock: Crear un lote de ajuste
        const batchCode = `RESTOCK-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const batch = await tx.inventoryBatch.create({
          data: {
            inventoryId: item.id,
            batchNumber: batchCode,
            quantity: data.quantity_change,
            sellingPrice: data.new_price || item.unitPrice,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryId: item.id,
            userId: userId || null,
            batchId: batch.id,
            quantityChange: data.quantity_change,
            type: 'restock',
            reason: data.reason || 'Restock manual',
          },
        });
      } else if (data.quantity_change < 0) {
        // Salida de Stock (Ajuste negativo): Deducir por FEFO
        let remainingToDeduct = Math.abs(data.quantity_change);
        const activeBatches = await tx.inventoryBatch.findMany({
          where: { inventoryId: item.id, quantity: { gt: 0 } },
          orderBy: { expirationDate: 'asc' }, // FEFO
        });

        for (const batch of activeBatches) {
          if (remainingToDeduct <= 0) break;
          const deduct = Math.min(batch.quantity, remainingToDeduct);

          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: { quantity: { decrement: deduct } },
          });

          await tx.inventoryMovement.create({
            data: {
              inventoryId: item.id,
              userId: userId || null,
              batchId: batch.id,
              quantityChange: -deduct,
              type: 'adjustment',
              reason: data.reason || 'Ajuste manual negativo',
            },
          });

          remainingToDeduct -= deduct;
        }

        // Si queda remanente (stock heredado sin lote o lote vencido ya purgado), registrar movimiento global sin lote
        if (remainingToDeduct > 0) {
          await tx.inventoryMovement.create({
            data: {
              inventoryId: item.id,
              userId: userId || null,
              quantityChange: -remainingToDeduct,
              type: 'adjustment',
              reason: data.reason || 'Ajuste manual negativo (stock global)',
            },
          });
        }
      }

      // Actualizar cantidad total y precio unitario si aplica
      item = await tx.inventory.update({
        where: { id: item.id },
        data: {
          quantity: newQuantity,
          ...(data.new_price !== undefined && { unitPrice: data.new_price }),
        },
      });
    }

    const result = await tx.inventory.findUnique({
      where: { id: item.id },
      include: { medicine: true },
    });

    await createAuditLog({
      userId,
      action: 'update',
      entityType: 'inventory',
      entityId: item.id,
      details: JSON.stringify({
        medicine_id: data.medicine_id,
        quantity_change: data.quantity_change,
        new_quantity: item.quantity,
        reason: data.reason,
      }),
      ipAddress,
      userAgent,
    });

    return result;
  });
}

/**
 * Carga inicial de inventario en lote (Bulk Upsert)
 */
export async function seedInventory(
  pharmacyId: string,
  items: Array<{
    medicine_id: string;
    quantity: number;
    unit_price: number;
    min_stock?: number;
  }>
) {
  const results: any[] = [];

  for (const item of items) {
    const existing = await db.inventory.findFirst({
      where: { pharmacyId, medicineId: item.medicine_id },
    });

    if (existing) {
      const updated = await db.inventory.update({
        where: { id: existing.id },
        data: {
          quantity: item.quantity,
          unitPrice: item.unit_price,
          minStock: item.min_stock ?? existing.minStock,
        },
        include: { medicine: true },
      });
      results.push(updated);
    } else {
      const created = await db.inventory.create({
        data: {
          pharmacyId,
          medicineId: item.medicine_id,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          minStock: item.min_stock ?? 10,
        },
        include: { medicine: true },
      });
      results.push(created);
    }
  }

  return results;
}

/**
 * Crear un lote de inventario nuevo (con autoinicialización opcional del inventario padre)
 */
export async function createBatch(data: {
  inventoryId?: string;
  pharmacyId?: string;
  medicineId?: string;
  batchNumber: string;
  quantity: number;
  costPrice?: number;
  sellingPrice?: number;
  expirationDate?: Date;
  supplier?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  if (data.quantity < 0) throw new Error('INVALID_QUANTITY');
  if (data.costPrice !== undefined && data.costPrice < 0) throw new Error('INVALID_PRICE');
  if (data.sellingPrice !== undefined && data.sellingPrice < 0) throw new Error('INVALID_PRICE');

  return await db.$transaction(async (tx) => {
    let inventoryId = data.inventoryId;

    // Si no se provee el ID pero sí la farmacia y medicamento, resolver o autoinicializar el inventario
    if (!inventoryId && data.pharmacyId && data.medicineId) {
      let inv = await tx.inventory.findFirst({
        where: { pharmacyId: data.pharmacyId, medicineId: data.medicineId },
      });

      if (!inv) {
        inv = await tx.inventory.create({
          data: {
            pharmacyId: data.pharmacyId,
            medicineId: data.medicineId,
            quantity: 0,
            unitPrice: data.sellingPrice || 0,
            minStock: 10,
          },
        });
      }
      inventoryId = inv.id;
    }

    if (!inventoryId) throw new Error('INVENTORY_ID_REQUIRED');

    const batch = await tx.inventoryBatch.create({
      data: {
        inventoryId,
        batchNumber: data.batchNumber,
        quantity: data.quantity,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        expirationDate: data.expirationDate,
        supplier: data.supplier,
      },
    });

    // Incrementar cantidad total de inventario
    await tx.inventory.update({
      where: { id: inventoryId },
      data: {
        quantity: { increment: data.quantity },
        ...(data.sellingPrice && { unitPrice: data.sellingPrice }),
      },
    });

    // Registrar el movimiento en el Kardex
    await tx.inventoryMovement.create({
      data: {
        inventoryId,
        userId: data.userId || null,
        batchId: batch.id,
        quantityChange: data.quantity,
        type: 'restock',
        reason: `Lote ${data.batchNumber} ingresado`,
      },
    });

    return batch;
  });
}

/**
 * Actualizar datos de un lote
 */
export async function updateBatch(
  id: string,
  data: {
    quantity?: number;
    batchNumber?: string;
    costPrice?: number;
    sellingPrice?: number;
    expirationDate?: Date;
  }
) {
  if (data.quantity !== undefined && data.quantity < 0) throw new Error('INVALID_QUANTITY');
  if (data.costPrice !== undefined && data.costPrice < 0) throw new Error('INVALID_PRICE');
  if (data.sellingPrice !== undefined && data.sellingPrice < 0) throw new Error('INVALID_PRICE');

  return await db.$transaction(async (tx) => {
    const oldBatch = await tx.inventoryBatch.findUnique({ where: { id } });
    if (!oldBatch) throw new Error('NOT_FOUND');

    if (data.quantity !== undefined) {
      const diff = data.quantity - oldBatch.quantity;
      const inventory = await tx.inventory.findUnique({ where: { id: oldBatch.inventoryId } });

      if (inventory && inventory.quantity + diff < 0) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      await tx.inventory.update({
        where: { id: oldBatch.inventoryId },
        data: { quantity: { increment: diff } },
      });

      // Registrar movimiento de ajuste de lote en el Kardex
      await tx.inventoryMovement.create({
        data: {
          inventoryId: oldBatch.inventoryId,
          batchId: id,
          quantityChange: diff,
          type: 'adjustment',
          reason: `Modificación de cantidad de lote ${oldBatch.batchNumber}`,
        },
      });
    }

    return tx.inventoryBatch.update({ where: { id }, data });
  });
}

/**
 * Obtener Kardex de movimientos de un medicamento en farmacias
 */
export async function getKardex(medicineId: string, pharmacyId?: string) {
  const where: any = { inventory: { medicineId } };
  if (pharmacyId) where.inventory.pharmacyId = pharmacyId;

  const movements = await db.inventoryMovement.findMany({
    where,
    include: {
      inventory: { include: { pharmacy: true, medicine: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return movements.map((m) => ({
    id: m.id,
    inventory_id: m.inventoryId,
    type: m.type,
    quantity_change: m.quantityChange,
    reason: m.reason,
    created_at: m.createdAt,
    pharmacy_name: m.inventory.pharmacy.name,
    medicine_name: m.inventory.medicine.name,
  }));
}

/**
 * Obtener lotes por expirar (FEFO) para alarmas
 */
export async function getExpiringBatches(pharmacyId: string, limit: number = 10) {
  return db.inventoryBatch.findMany({
    where: {
      inventory: { pharmacyId },
      quantity: { gt: 0 },
      expirationDate: { not: null },
    },
    include: {
      inventory: { include: { medicine: true } },
    },
    orderBy: { expirationDate: 'asc' },
    take: limit,
  });
}
