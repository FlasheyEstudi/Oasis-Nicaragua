// OASIS - Delivery Service
// Management of deliveries, route tracking, status updates and QR code validation

import { db } from '../db';
import { createAuditLog } from './audit.service';

/**
 * Normaliza y resuelve el ID de un estado de entrega de forma tolerante a fallos
 */
async function resolveStatusId(statusKey: string, tx: any = db): Promise<string> {
  const norm = statusKey.toLowerCase();
  
  // Mapeos comunes en español e inglés
  const statusMappings: Record<string, string[]> = {
    pending: ['pendiente', 'pending'],
    assigned: ['asignado', 'assigned'],
    picked_up: ['recolectado', 'en ruta', 'picked_up'],
    delivered: ['entregado', 'delivered'],
    cancelled: ['cancelado', 'cancelled']
  };
  
  const searchTerms = statusMappings[norm] || [norm];

  for (const term of searchTerms) {
    const status = await tx.deliveryStatus.findFirst({
      where: {
        OR: [
          { id: { equals: term, mode: 'insensitive' } },
          { name: { contains: term, mode: 'insensitive' } }
        ]
      }
    });
    if (status) return status.id;
  }

  // Auto-sanación: Crear el estado si no existe
  const displayName = statusKey.charAt(0).toUpperCase() + statusKey.slice(1).replace('_', ' ');
  const newStatus = await tx.deliveryStatus.create({
    data: {
      id: norm,
      name: displayName,
      description: `Estado de envío auto-creado: ${displayName}`
    }
  });
  return newStatus.id;
}

/**
 * Obtener listado de pedidos de entrega con filtros y paginación
 */
export async function getDeliveries(filters: {
  driverId?: string;
  pharmacyId?: string;
  patientId?: string;
  status?: string;
  limit: number;
  skip: number;
}) {
  const where: Record<string, any> = {};

  if (filters.driverId) where.deliveryDriverId = filters.driverId;
  if (filters.pharmacyId) where.pharmacyId = filters.pharmacyId;
  if (filters.patientId) where.patientId = filters.patientId;
  
  if (filters.status) {
    const statusId = await resolveStatusId(filters.status);
    where.statusId = statusId;
  }

  const [data, total] = await Promise.all([
    db.deliveryOrder.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        deliveryDriver: { select: { id: true, name: true, phone: true } },
        pharmacy: { select: { id: true, name: true } },
        status: true,
        sale: { select: { id: true, totalAmount: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: filters.skip,
      take: filters.limit
    }),
    db.deliveryOrder.count({ where })
  ]);

  return { data, total };
}

/**
 * Obtener detalles completos de un pedido de entrega (con ruta GPS grabada)
 */
export async function getDeliveryDetails(id: string) {
  return db.deliveryOrder.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      deliveryDriver: { select: { id: true, name: true, phone: true, deliveryDriverProfile: true } },
      pharmacy: { select: { id: true, name: true, address: true } },
      status: true,
      sale: { include: { saleItems: { include: { medicine: true } } } },
      deliveryRoutes: { orderBy: { recordedAt: 'asc' } }
    }
  });
}

/**
 * Asignar un repartidor a un pedido de entrega
 */
export async function assignDriver(
  deliveryOrderId: string,
  driverId: string,
  ipAddress?: string,
  userAgent?: string
) {
  // Verificar conductor activo
  const driver = await db.user.findFirst({
    where: { id: driverId, role: 'delivery_driver', isActive: true }
  });
  if (!driver) {
    throw new Error('NOT_FOUND: Repartidor no encontrado o inactivo.');
  }

  const assignedStatusId = await resolveStatusId('assigned');

  return await db.$transaction(async (tx) => {
    const order = await tx.deliveryOrder.findUnique({ where: { id: deliveryOrderId } });
    if (!order) throw new Error('NOT_FOUND: Pedido de entrega no encontrado.');
    if (order.deliveryDriverId) throw new Error('CONFLICT: El pedido ya tiene un repartidor asignado.');

    const updatedOrder = await tx.deliveryOrder.update({
      where: { id: deliveryOrderId },
      data: {
        deliveryDriverId: driverId,
        statusId: assignedStatusId,
        assignedAt: new Date()
      },
      include: { patient: true, status: true }
    });

    // Actualizar perfil del repartidor a no disponible
    await tx.deliveryDriverProfile.updateMany({
      where: { userId: driverId },
      data: { isAvailable: false }
    });

    // Registrar en auditoría
    await createAuditLog({
      userId: driverId,
      action: 'assign_driver',
      entityType: 'delivery',
      entityId: deliveryOrderId,
      details: `Repartidor ${driver.name} asignado al pedido ${deliveryOrderId}`,
      ipAddress,
      userAgent
    }, tx);

    // Crear notificación para el paciente
    await tx.notification.create({
      data: {
        userId: order.patientId,
        title: '🛵 Repartidor Asignado',
        body: `${driver.name} ha sido asignado para entregar tu pedido.`,
        type: 'delivery_assigned'
      }
    });

    return updatedOrder;
  });
}

/**
 * Actualizar el estado físico de la entrega
 */
export async function updateDeliveryStatus(
  deliveryOrderId: string,
  statusKey: 'picked_up' | 'delivered' | 'cancelled',
  notes?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const statusId = await resolveStatusId(statusKey);

  return await db.$transaction(async (tx) => {
    const order = await tx.deliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      include: { deliveryDriver: true }
    });
    if (!order) throw new Error('NOT_FOUND: Pedido de entrega no encontrado.');

    const updateData: Record<string, any> = {
      statusId,
      notes: notes || order.notes
    };

    let notifTitle = '';
    let notifBody = '';

    if (statusKey === 'picked_up') {
      updateData.pickedUpAt = new Date();
      notifTitle = '📦 Pedido en Camino';
      notifBody = `El repartidor ha recolectado tus medicamentos y va en ruta hacia tu dirección.`;
    } else if (statusKey === 'delivered') {
      updateData.deliveredAt = new Date();
      notifTitle = '🎉 Pedido Entregado';
      notifBody = `Tus medicamentos han sido entregados exitosamente. ¡Gracias por confiar en Oasis!`;

      // Completar venta asociada
      await tx.sale.update({
        where: { id: order.saleId },
        data: { status: 'completed' }
      });

      // Liberar disponibilidad del repartidor
      if (order.deliveryDriverId) {
        await tx.deliveryDriverProfile.updateMany({
          where: { userId: order.deliveryDriverId },
          data: { isAvailable: true }
        });
      }
    } else if (statusKey === 'cancelled') {
      notifTitle = '❌ Pedido Cancelado';
      notifBody = `Tu entrega ha sido cancelada. Notas: ${notes || 'Sin especificar'}`;

      // Cancelar venta asociada
      await tx.sale.update({
        where: { id: order.saleId },
        data: { status: 'cancelled' }
      });

      // Liberar disponibilidad del repartidor
      if (order.deliveryDriverId) {
        await tx.deliveryDriverProfile.updateMany({
          where: { userId: order.deliveryDriverId },
          data: { isAvailable: true }
        });
      }
    }

    const updatedOrder = await tx.deliveryOrder.update({
      where: { id: deliveryOrderId },
      data: updateData,
      include: { status: true }
    });

    // Registrar en auditoría
    await createAuditLog({
      userId: order.deliveryDriverId || 'system',
      action: `delivery_${statusKey}`,
      entityType: 'delivery',
      entityId: deliveryOrderId,
      details: `Estado cambiado a ${statusKey}. Notas: ${notes || ''}`,
      ipAddress,
      userAgent
    }, tx);

    // Enviar notificación al paciente
    await tx.notification.create({
      data: {
        userId: order.patientId,
        title: notifTitle,
        body: notifBody,
        type: `delivery_${statusKey}`
      }
    });

    return updatedOrder;
  });
}

/**
 * Graba coordenadas GPS en tiempo real enviadas por el repartidor
 */
export async function recordRouteCoordinate(
  deliveryOrderId: string,
  driverId: string,
  lat: number,
  lng: number
) {
  // Guardar ubicación histórica en la ruta
  const route = await db.deliveryRoute.create({
    data: {
      deliveryOrderId,
      driverLat: lat,
      driverLng: lng
    }
  });

  // Actualizar la última posición conocida en el perfil del conductor
  await db.deliveryDriverProfile.updateMany({
    where: { userId: driverId },
    data: {
      currentLat: lat,
      currentLng: lng
    }
  });

  return route;
}

/**
 * Validar entrega por medio de código QR escaneado (Paciente QR o Cédula QR)
 */
export async function verifyDeliveryQR(
  deliveryOrderId: string,
  qrContent: string,
  ipAddress?: string,
  userAgent?: string
) {
  const order = await db.deliveryOrder.findUnique({
    where: { id: deliveryOrderId }
  });
  if (!order) throw new Error('NOT_FOUND: Pedido de entrega no encontrado.');

  // Contenido válido del QR: 'patient-id-' + patientId O el ID del pedido
  const expectedPatientQR = `patient-id-${order.patientId}`;
  const isValid = qrContent === expectedPatientQR || qrContent === order.id || qrContent === order.saleId;

  if (!isValid) {
    throw new Error('VALIDATION_ERROR: Código QR inválido para esta entrega.');
  }

  // Marcar como entregado usando nuestro método
  return await updateDeliveryStatus(deliveryOrderId, 'delivered', 'Entregado vía código QR validado', ipAddress, userAgent);
}
