// OASIS - Forgot Password API Route
// POST /api/v1/auth/forgot-password - Request a password reset email/link

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, forgotPasswordSchema } from '@/lib/validators';
import * as authService from '@/lib/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(forgotPasswordSchema, body);
    if (!validation.success) return validation.error;

    const { email } = validation.data;
    const result = await authService.requestPasswordReset(email);

    return successResponse(result, 'Correo de recuperación enviado con éxito');
  } catch (error: any) {
    if (error.message.includes('NOT_FOUND')) {
      return errorResponse(ErrorCodes.NOT_FOUND, error.message, null, 404);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
}
