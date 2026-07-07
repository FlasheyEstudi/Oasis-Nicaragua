// OASIS - Verify Delivery QR API Route
// POST /api/v1/delivery/[id]/verify - Verify delivery with patient QR

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, verifyDeliveryQRSchema } from '@/lib/validators';
import * as deliveryService from '@/lib/services/delivery.service';

export const POST = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;
      const body = await req.json();
      const validation = validateBody(verifyDeliveryQRSchema, body);
      if (!validation.success) return validation.error;

      const { qr_content } = validation.data;
      const { userId, role } = req.user;

      // Verificar que el conductor asignado o admin está verificando
      const { db } = await import('@/lib/db');
      const order = await db.deliveryOrder.findUnique({ where: { id } });
      if (!order) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Pedido de entrega no encontrado', 404);
      }
      if (order.deliveryDriverId !== userId && role !== 'admin') {
        return errorResponse(ErrorCodes.FORBIDDEN, 'Solo el repartidor asignado puede validar la entrega', 403);
      }

      const result = await deliveryService.verifyDeliveryQR(
        id,
        qr_content,
        req.headers.get('x-forwarded-for') || undefined,
        req.headers.get('user-agent') || undefined
      );

      return successResponse(result, 'Entrega verificada y completada exitosamente');
    } catch (error: any) {
      if (error.message.includes('NOT_FOUND')) {
        return errorResponse(ErrorCodes.NOT_FOUND, error.message, null, 404);
      }
      if (error.message.includes('VALIDATION_ERROR')) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, error.message, null, 400);
      }
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
    }
  },
  { roles: ['admin', 'delivery_driver'] }
);
