import { AuthenticatedRequest } from '@/lib/auth/middleware';
import { withAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, updateClinicSchema } from '@/lib/validators';
import * as clinicService from '@/lib/services/clinic.service';
import { verifyFacilityAccess } from '@/lib/auth/access';

export const GET = withAuth(async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await context.params;
    const clinic = await clinicService.getClinic(id);
    return successResponse(clinic);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return errorResponse(ErrorCodes.NOT_FOUND, 'Clínica no encontrada', null, 404);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
  }
}, { roles: ['admin', 'clinic_admin', 'doctor', 'receptionist', 'patient'] });

export const PATCH = withAuth(async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validation = validateBody(updateClinicSchema, body);
    if (!validation.success) return validation.error;

    if (req.user.role !== 'admin') {
      const hasAccess = await verifyFacilityAccess(req.user.userId, req.user.role, id, 'clinic');
      if (!hasAccess) return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes permiso para actualizar esta clínica', null, 403);
    }

    const updated = await clinicService.updateClinic(
      id,
      validation.data,
      req.user.userId,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(updated, 'Clínica actualizada exitosamente');
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return errorResponse(ErrorCodes.NOT_FOUND, 'Clínica no encontrada', null, 404);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
  }
}, { roles: ['admin', 'clinic_admin'] });
