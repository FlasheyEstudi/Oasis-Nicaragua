// OASIS - Delivery Details API Route
// GET /api/v1/delivery/[id] - Get full delivery details

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import * as deliveryService from '@/lib/services/delivery.service';

export const GET = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;
      const { userId, role } = req.user;

      const delivery = await deliveryService.getDeliveryDetails(id);
      if (!delivery) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Pedido de entrega no encontrado', 404);
      }

      // Restricción de visibilidad
      if (role === 'patient' && delivery.patientId !== userId) {
        return errorResponse(ErrorCodes.FORBIDDEN, 'Acceso denegado a este pedido', 403);
      }
      if (role === 'delivery_driver' && delivery.deliveryDriverId !== userId) {
        return errorResponse(ErrorCodes.FORBIDDEN, 'No eres el repartidor asignado a esta entrega', 403);
      }
      
      // Personal de farmacia: verificar que pertenece a su farmacia
      if (role === 'pharmacy_manager' || role === 'cashier') {
        const { db } = await import('@/lib/db');
        const profile = await db.pharmacyManagerProfile.findUnique({
          where: { userId },
          select: { pharmacyId: true }
        });
        if (delivery.pharmacyId !== profile?.pharmacyId) {
          return errorResponse(ErrorCodes.FORBIDDEN, 'Esta entrega no pertenece a tu farmacia', 403);
        }
      }

      return successResponse(delivery, 'Detalles de entrega obtenidos');
    } catch (error: any) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
    }
  },
  { roles: ['admin', 'pharmacy_admin', 'pharmacy_manager', 'delivery_driver', 'patient'] }
);
