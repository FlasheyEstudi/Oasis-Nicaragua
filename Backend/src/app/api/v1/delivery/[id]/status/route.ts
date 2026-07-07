// OASIS - Update Delivery Status API Route
// POST /api/v1/delivery/[id]/status - Update physical delivery state

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, updateDeliveryStatusSchema } from '@/lib/validators';
import * as deliveryService from '@/lib/services/delivery.service';

export const POST = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;
      const body = await req.json();
      const validation = validateBody(updateDeliveryStatusSchema, body);
      if (!validation.success) return validation.error;

      const { status, notes } = validation.data;
      const { userId, role } = req.user;

      // Verificar pertenencia y asignación del conductor
      if (role === 'delivery_driver') {
        const { db } = await import('@/lib/db');
        const order = await db.deliveryOrder.findUnique({ where: { id } });
        if (!order || order.deliveryDriverId !== userId) {
          return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes permiso para actualizar este pedido', 403);
        }
        if (status === 'cancelled') {
          return errorResponse(ErrorCodes.FORBIDDEN, 'Los repartidores no pueden cancelar pedidos directos', 403);
        }
      }

      const result = await deliveryService.updateDeliveryStatus(
        id,
        status as 'picked_up' | 'delivered' | 'cancelled',
        notes,
        req.headers.get('x-forwarded-for') || undefined,
        req.headers.get('user-agent') || undefined
      );

      return successResponse(result, `Estado de entrega actualizado a ${status} exitosamente`);
    } catch (error: any) {
      if (error.message.includes('NOT_FOUND')) {
        return errorResponse(ErrorCodes.NOT_FOUND, error.message, null, 404);
      }
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
    }
  },
  { roles: ['admin', 'pharmacy_admin', 'pharmacy_manager', 'delivery_driver'] }
);
