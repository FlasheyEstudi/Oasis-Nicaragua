// OASIS - Revoke Family Relationship API Route
// POST /api/v1/family/revoke - Revoke a caregiver-patient relationship link (Caregiver or Patient)

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody } from '@/lib/validators';
import * as familyService from '@/lib/services/family.service';
import { z } from 'zod';

const revokeSchema = z.object({
  target_user_id: z.string().min(1, 'ID de usuario destino requerido'),
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validation = validateBody(revokeSchema, body);
    if (!validation.success) return validation.error;

    const { target_user_id } = validation.data;
    const userId = req.user.userId;

    // Resolver quién es el cuidador y quién es el paciente
    const { db } = await import('@/lib/db');
    const rel = await db.familyRelationship.findFirst({
      where: {
        OR: [
          { caregiverId: userId, patientId: target_user_id },
          { caregiverId: target_user_id, patientId: userId }
        ]
      }
    });

    if (!rel) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Relación familiar no encontrada entre estos usuarios', 404);
    }

    const result = await familyService.revokeRelationship(
      rel.caregiverId,
      rel.patientId,
      userId,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(result, 'Vínculo familiar revocado exitosamente');
  } catch (error: any) {
    if (error.message.includes('NOT_FOUND')) {
      return errorResponse(ErrorCodes.NOT_FOUND, error.message, null, 404);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
}, { roles: ['patient', 'admin'] });
