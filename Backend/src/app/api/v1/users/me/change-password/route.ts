// OASIS - Change Password API Route
// PATCH /api/v1/users/me/change-password - Change current user password securely

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Contraseña actual requerida'),
  new_password: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, null, 400);
    }

    const { current_password, new_password } = parsed.data;
    const { userId } = req.user;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return errorResponse(ErrorCodes.USER_INACTIVE, 'Usuario no encontrado', null, 404);

    const isMatch = await bcrypt.compare(current_password, user.passwordHash);
    if (!isMatch) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'La contraseña actual es incorrecta', null, 401);
    }

    const newPasswordHash = await bcrypt.hash(new_password, 10);
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    return successResponse(null, 'Contraseña cambiada con éxito');
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno', null, 500);
  }
});
