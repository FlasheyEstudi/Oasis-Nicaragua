// OASIS - Prescriptions List & Create Route
// GET /api/v1/prescriptions - List (patient own, doctor own, pharmacy staff, admin)
// POST /api/v1/prescriptions - Create (doctor only)

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, createPrescriptionSchema } from '@/lib/validators';
import * as prescriptionService from '@/lib/services/prescription.service';
import { parsePagination } from '@/lib/utils/pagination';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patient_id') || undefined;
    const doctorId = searchParams.get('doctor_id') || undefined;
    const status = searchParams.get('status') || undefined;
    const { page, limit, skip } = parsePagination(searchParams);

    const result = await prescriptionService.getPrescriptions({
      patientId,
      doctorId,
      status,
      userRole: req.user.role,
      userId: req.user.userId,
      limit,
      skip,
    });

    return paginatedResponse(result.data, page, limit, result.total);
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', 500);
  }
});

export const POST = withAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const body = await req.json();
      const validation = validateBody(createPrescriptionSchema, body);
      if (!validation.success) return validation.error;

      const ipAddress = req.headers.get('x-forwarded-for') || undefined;
      const userAgent = req.headers.get('user-agent') || undefined;

      const result = await prescriptionService.createPrescription(
        validation.data,
        req.user.userId,
        ipAddress,
        userAgent
      );

      return successResponse(result, 'Receta creada exitosamente', 201);
    } catch (error: any) {
      if (error.message === 'DOCTOR_PROFILE_NOT_FOUND') {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Perfil de doctor no encontrado', 404);
      }
      if (error.message === 'DOCTOR_NOT_VERIFIED') {
        return errorResponse(ErrorCodes.FORBIDDEN, 'Tu acreditación profesional no está aprobada por el MINSA. No puedes emitir recetas.', 403);
      }
      if (error.message === 'PIN_NOT_CONFIGURED') {
        return errorResponse(ErrorCodes.FORBIDDEN, 'El PIN de firma digital no ha sido configurado en tu perfil.', 403);
      }
      if (error.message === 'INCORRECT_PIN') {
        return errorResponse(ErrorCodes.FORBIDDEN, 'PIN de firma incorrecto', 403);
      }
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', 500);
    }
  },
  { roles: ['doctor'] }
);
