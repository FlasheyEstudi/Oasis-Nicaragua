// OASIS - Verify Family Relationship API Route
// POST /api/v1/family/verify - Confirm caregiver request with PIN code (Patient Consent)

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, verifyFamilyRelationshipSchema } from '@/lib/validators';
import * as familyService from '@/lib/services/family.service';
import { z } from 'zod';

// Extend schema for the route endpoint to require caregiver_id
const verifyRouteSchema = verifyFamilyRelationshipSchema.extend({
  caregiver_id: z.string().min(1, 'ID de cuidador requerido'),
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validation = validateBody(verifyRouteSchema, body);
    if (!validation.success) return validation.error;

    const { caregiver_id, verification_code } = validation.data;
    const patientId = req.user.userId; // El paciente que está confirmando

    const result = await familyService.verifyRelationship(
      caregiver_id,
      patientId,
      verification_code,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(result, 'Vínculo familiar verificado y activado exitosamente');
  } catch (error: any) {
    if (error.message.includes('NOT_FOUND')) {
      return errorResponse(ErrorCodes.NOT_FOUND, error.message, null, 404);
    }
    if (error.message.includes('VALIDATION_ERROR')) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.message, null, 400);
    }
    if (error.message.includes('CONFLICT')) {
      return errorResponse(ErrorCodes.CONFLICT, error.message, null, 409);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
}, { roles: ['patient', 'admin'] });
