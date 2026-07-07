// OASIS - Record GPS Route API Route
// POST /api/v1/delivery/[id]/route-gps - Log current coordinates of delivery driver

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, recordCoordinateSchema } from '@/lib/validators';
import * as deliveryService from '@/lib/services/delivery.service';

export const POST = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;
      const body = await req.json();
      const validation = validateBody(recordCoordinateSchema, body);
      if (!validation.success) return validation.error;

      const { latitude, longitude } = validation.data;
      const { userId, role } = req.user;

      // Verificar que el conductor que sube el GPS es el asignado
      const { db } = await import('@/lib/db');
      const order = await db.deliveryOrder.findUnique({ where: { id } });
      if (!order) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Pedido de entrega no encontrado', 404);
      }
      if (order.deliveryDriverId !== userId && role !== 'admin') {
        return errorResponse(ErrorCodes.FORBIDDEN, 'Solo el repartidor asignado puede transmitir telemetría', 403);
      }

      const result = await deliveryService.recordRouteCoordinate(
        id,
        order.deliveryDriverId || userId,
        latitude,
        longitude
      );

      return successResponse(result, 'Coordenada GPS registrada exitosamente', 201);
    } catch (error: any) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
    }
  },
  { roles: ['admin', 'delivery_driver'] }
);
