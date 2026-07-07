// OASIS - Reset Password API Route
// POST /api/v1/auth/reset-password - Reset password using valid expirable token

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, resetPasswordSchema } from '@/lib/validators';
import * as authService from '@/lib/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(resetPasswordSchema, body);
    if (!validation.success) return validation.error;

    const { token, new_password } = validation.data;
    await authService.resetPassword(token, new_password);

    return successResponse(null, 'Contraseña restablecida con éxito');
  } catch (error: any) {
    if (error.message.includes('TOKEN_INVALID')) {
      return errorResponse(ErrorCodes.TOKEN_INVALID, error.message, null, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
}
