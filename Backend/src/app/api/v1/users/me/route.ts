// OASIS - Current User Profile API Route
// GET /api/v1/users/me - Get currently authenticated user
// PATCH /api/v1/users/me - Update user name or basic info

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateMeSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional()
});

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
        createdAt: true
      }
    });
    if (!user) return errorResponse(ErrorCodes.USER_INACTIVE, 'Usuario no encontrado', null, 404);
    return successResponse(user, 'Perfil de usuario obtenido');
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno', null, 500);
  }
});

export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const parsed = updateMeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, null, 400);
    }

    const { userId } = req.user;
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: parsed.data,
      select: { id: true, name: true, email: true, role: true }
    });

    return successResponse(updatedUser, 'Perfil actualizado con éxito');
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno', null, 500);
  }
});
