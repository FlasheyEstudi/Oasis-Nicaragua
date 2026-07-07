// OASIS - Update Caregiver Permissions API Route
// PATCH /api/v1/family/permissions - Update permissions granted to caregiver (Patient only)

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody } from '@/lib/validators';
import * as familyService from '@/lib/services/family.service';
import { z } from 'zod';

const updatePermissionsSchema = z.object({
  caregiver_id: z.string().min(1, 'ID de cuidador requerido'),
  permissions: z.array(z.string()).min(1, 'Debe especificar al menos un permiso'),
});

export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validation = validateBody(updatePermissionsSchema, body);
    if (!validation.success) return validation.error;

    const { caregiver_id, permissions } = validation.data;
    const patientId = req.user.userId; // Solamente el paciente puede editar sus consentimientos

    const result = await familyService.updateRelationshipPermissions(
      caregiver_id,
      patientId,
      permissions,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(result, 'Permisos del cuidador actualizados exitosamente');
  } catch (error: any) {
    if (error.message.includes('NOT_FOUND')) {
      return errorResponse(ErrorCodes.NOT_FOUND, error.message, null, 404);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
}, { roles: ['patient', 'admin'] });
