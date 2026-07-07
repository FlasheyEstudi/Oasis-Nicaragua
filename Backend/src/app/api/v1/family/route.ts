// OASIS - Family Relationships List & Request API Route
// GET /api/v1/family - List my relationships
// POST /api/v1/family - Request new relationship link (caregiver -> patient)

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, createFamilyRelationshipSchema } from '@/lib/validators';
import * as familyService from '@/lib/services/family.service';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { userId } = req.user;
    const relationships = await familyService.getFamilyRelationships(userId);
    return successResponse(relationships, 'Relaciones familiares obtenidas');
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
}, { roles: ['patient', 'admin'] }); // En el esquema, los pacientes y admins pueden vincularse

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validation = validateBody(createFamilyRelationshipSchema, body);
    if (!validation.success) return validation.error;

    const { patient_id, relationship, permissions } = validation.data;
    const caregiverId = req.user.userId;

    const result = await familyService.requestRelationship({
      caregiverId,
      patientId: patient_id,
      relationship,
      permissions
    });

    return successResponse(result, 'Solicitud de relación familiar registrada. Pendiente verificación del paciente', 201);
  } catch (error: any) {
    if (error.message.includes('VALIDATION_ERROR')) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.message, null, 400);
    }
    if (error.message.includes('CONFLICT')) {
      return errorResponse(ErrorCodes.CONFLICT, error.message, null, 409);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
}, { roles: ['patient', 'admin'] });
