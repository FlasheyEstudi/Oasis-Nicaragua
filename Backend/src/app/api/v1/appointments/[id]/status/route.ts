// OASIS - Appointment Status Route
// PATCH /api/v1/appointments/:id/status - Update status

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, updateAppointmentStatusSchema } from '@/lib/validators';
import * as appointmentService from '@/lib/services/appointment.service';

export const PATCH = withAuth(async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validation = validateBody(updateAppointmentStatusSchema, body);
    if (!validation.success) return validation.error;

    const updated = await appointmentService.updateAppointmentStatus(
      id,
      body.status,
      req.user.role,
      req.user.userId,
      body.cancellation_reason,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(updated, 'Estado de cita actualizado');
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Cita no encontrada', 404);
    }
    if (error.message === 'UNAUTHORIZED') {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'No tienes permiso para actualizar esta cita', 403);
    }
    if (error.message === 'INVALID_STATUS_TRANSITION') {
      return errorResponse(ErrorCodes.INVALID_STATUS_TRANSITION, 'Transición de estado no válida', 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', 500);
  }
});
