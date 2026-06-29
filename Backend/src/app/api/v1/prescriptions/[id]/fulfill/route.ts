// OASIS - Prescription Fulfill Route
// POST /api/v1/prescriptions/:id/fulfill - Dispense medicines and decrement inventory (FEFO)

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, fulfillPrescriptionSchema } from '@/lib/validators';
import * as prescriptionService from '@/lib/services/prescription.service';

export const POST = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<any> }) => {
    try {
      const { id } = await context.params;
      const body = await req.json();
      const validation = validateBody(fulfillPrescriptionSchema, body);
      if (!validation.success) return validation.error;

      const ipAddress = req.headers.get('x-forwarded-for') || undefined;
      const userAgent = req.headers.get('user-agent') || undefined;

      const result = await prescriptionService.fulfillPrescription(
        id,
        validation.data,
        req.user.userId,
        req.user.pharmacyId,
        ipAddress,
        userAgent
      );

      return successResponse(result, 'Receta dispensada exitosamente');
    } catch (error: any) {
      if (error.message.includes('FORBIDDEN')) {
        return errorResponse(ErrorCodes.FORBIDDEN, error.message, 403);
      }
      if (error.message === 'PHARMACY_SUSPENDED') {
        return errorResponse(ErrorCodes.FORBIDDEN, 'La farmacia se encuentra suspendida temporalmente por cumplimiento legal (MINSA)', 403);
      }
      if (error.message === 'NOT_FOUND') {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Receta no encontrada', 404);
      }
      if (error.message.includes('INSUFFICIENT_STOCK')) {
        return errorResponse(ErrorCodes.INSUFFICIENT_STOCK, error.message, 400);
      }
      if (error.message === 'PRESCRIPTION_EXPIRED') {
        return errorResponse(ErrorCodes.PRESCRIPTION_EXPIRED, 'Receta expirada', 400);
      }
      if (error.message === 'PRESCRIPTION_CANCELLED') {
        return errorResponse(ErrorCodes.PRESCRIPTION_CANCELLED, 'Receta cancelada', 400);
      }
      if (error.message === 'INVALID_STATUS_TRANSITION') {
        return errorResponse(ErrorCodes.INVALID_STATUS_TRANSITION, 'Transición de estado no válida', 400);
      }
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', 500);
    }
  },
  { roles: ['pharmacy_manager', 'pharmacy_admin', 'cashier', 'admin'] }
);
