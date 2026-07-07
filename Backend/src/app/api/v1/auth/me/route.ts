// OASIS - Auth Get Profile API Route
// GET /api/v1/auth/me - Get currently authenticated user details

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { db } from '@/lib/db';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { userId } = req.user;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        patientProfile: true,
        doctorProfile: true,
        pharmacyManagerProfile: true,
        deliveryDriverProfile: true,
        receptionistProfile: true
      }
    });

    if (!user) {
      return errorResponse(ErrorCodes.USER_INACTIVE, 'Usuario no encontrado', null, 404);
    }

    return successResponse(user, 'Perfil obtenido con éxito');
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
});
