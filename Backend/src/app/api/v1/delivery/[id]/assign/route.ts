// OASIS - Assign Driver API Route
// POST /api/v1/delivery/[id]/assign - Assign a driver to a delivery order

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, assignDriverSchema } from '@/lib/validators';
import * as deliveryService from '@/lib/services/delivery.service';

export const POST = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;
      const body = await req.json();
      const validation = validateBody(assignDriverSchema, body);
      if (!validation.success) return validation.error;

      const { driver_id } = validation.data;
      const { userId, role } = req.user;

      // Si es personal de farmacia, verificar que el pedido pertenece a su farmacia
      if (role === 'pharmacy_manager' || role === 'cashier') {
        const { db } = await import('@/lib/db');
        const profile = await db.pharmacyManagerProfile.findUnique({
          where: { userId },
          select: { pharmacyId: true }
        });
        const order = await db.deliveryOrder.findUnique({ where: { id } });
        if (!order || order.pharmacyId !== profile?.pharmacyId) {
          return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes permiso para gestionar este pedido', 403);
        }
      }

      const result = await deliveryService.assignDriver(
        id,
        driver_id,
        req.headers.get('x-forwarded-for') || undefined,
        req.headers.get('user-agent') || undefined
      );

      return successResponse(result, 'Repartidor asignado exitosamente');
    } catch (error: any) {
      if (error.message.includes('NOT_FOUND')) {
        return errorResponse(ErrorCodes.NOT_FOUND, error.message, null, 404);
      }
      if (error.message.includes('CONFLICT')) {
        return errorResponse(ErrorCodes.CONFLICT, error.message, null, 409);
      }
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
    }
  },
  { roles: ['admin', 'pharmacy_admin', 'pharmacy_manager'] }
);
